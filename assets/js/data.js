/*
 * Game Night – data layer.
 *
 * Every read of external data goes through this file, so when the storage
 * moves (e.g. Penny Bank off GitHub) only this file needs to change.
 *
 * Sources (legacy pipeline, unchanged):
 *   - Episodes: the published Google Sheet, one tab per season (S1, S2, ...),
 *     read as CSV. PapaParse must be loaded on pages that use episodes.
 *   - Penny Bank: JSON text files in github.com/persephoneschair/PennyStorage.
 */
(function () {
  const GN = (window.GN = window.GN || {});

  const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSj7yentjlJS9OgA-nYRn8tRm7CTUaSUSaUGWIoUB--XInwzGXD5HsNuDjwfclPOyCkw8rW4MuuN5fM';

  // Known season tabs. New seasons are discovered automatically from the
  // published sheet's tab list (tabs named "S<number>"); this list is only
  // the fallback if that lookup fails.
  const FALLBACK_SEASON_GIDS = {
    1: '757152741', 2: '2023760030', 3: '301515880', 4: '1288561065',
    5: '1845908747', 6: '449618691', 7: '662667958', 8: '378990445',
    9: '1144281968', 10: '859905086', 11: '1617015858', 12: '552496685',
    13: '2132100717', 14: '1201410527', 15: '1389368663', 16: '1645022033',
    17: '1776757633', 18: '160676996', 19: '1913635729', 20: '233501622',
    21: '1780699317', 22: '923906966', 23: '577973124'
  };

  const PENNY_BASE = 'https://raw.githubusercontent.com/persephoneschair/PennyStorage/main/';
  const PENNY_PLAYERS_FILE = 'NewPennys.txt';

  // Format files shown on the site. Files ending "Leaderboard.txt" hold
  // [{playerName, playerScore}]; the rest hold {goldMedallists, ...}.
  const PENNY_FORMATS = [
    ['Abyss.txt', 'The Abyss'],
    ['Apex.txt', 'APEX'],
    ['Battlefront.txt', 'Battlefront'],
    ['BiddingWar.txt', 'Bidding War'],
    ['Crossfire.txt', 'Crossfire'],
    ['Cryptex.txt', 'Cryptex'],
    ['DangerZone.txt', 'DangerZone'],
    ['DataLeak.txt', 'Data Leak'],
    ['DEFCON.txt', 'DEFCON'],
    ['Distinction.txt', 'Distinction!'],
    ['EscapeArtist.txt', 'The Escape Artist'],
    ['FrontPage.txt', 'Front Page'],
    ['GoogleThat.txt', 'Google That!'],
    ['Hive.txt', 'The Hive'],
    ['HiveLeaderboard.txt', 'The Hive Leaderboard'],
    ['Mole.txt', 'The Mole'],
    ['MoleLeaderboard.txt', 'The Mole Leaderboard'],
    ['Moneybox.txt', 'Moneybox'],
    ['MoneyboxLeaderboard.txt', 'Moneybox Leaderboard'],
    ['MusicQuizLive.txt', 'The Music Quiz Live'],
    ['PictureThis.txt', 'Picture This!'],
    ['PowerPlay.txt', 'PowerPlay'],
    ['Purge.txt', 'The Purge'],
    ['Pyramid.txt', 'The Pyramid'],
    ['RedHerrings.txt', 'Red Herrings!'],
    ['RiskyBusiness.txt', 'Risky Business'],
    ['Spotlight.txt', 'Spotlight'],
    ['SpotlightLeaderboard.txt', 'Spotlight Leaderboard']
  ].map(([file, label]) => ({
    file,
    id: file.replace(/\.txt$/, ''),
    label,
    type: /Leaderboard\.txt$/.test(file) ? 'leaderboard' : 'medals'
  }));

  const MEDAL_TYPES = ['gold', 'silver', 'bronze', 'lobby'];

  // ---------- small utilities ----------

  function fetchWithTimeout(url, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 15000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res;
      })
      .finally(() => timer && clearTimeout(timer));
  }

  // Short-lived cache in sessionStorage; silently does nothing if storage
  // is unavailable (private mode, blocked site data).
  const store = {
    get(key, maxAgeMs) {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const item = JSON.parse(raw);
        if (Date.now() - item.t > maxAgeMs) return null;
        return item.v;
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
      } catch (e) { /* ignore */ }
    }
  };

  const memo = new Map();
  function once(key, fn) {
    if (!memo.has(key)) {
      const p = fn();
      memo.set(key, p);
      p.catch(() => memo.delete(key)); // allow a retry after failure
    }
    return memo.get(key);
  }

  // ---------- episodes ----------

  function seasonList(gidByNumber) {
    return Object.keys(gidByNumber)
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => ({ number: n, name: `Season ${n}`, gid: gidByNumber[n] }));
  }

  function getSeasons() {
    return once('seasons', async () => {
      const cached = store.get('gn:seasons', 30 * 60 * 1000);
      if (cached) return cached;
      const gids = Object.assign({}, FALLBACK_SEASON_GIDS);
      try {
        const html = await (await fetchWithTimeout(`${SHEET_BASE}/pubhtml`, 6000)).text();
        const re = /name:\s*"S(\d+)"[^}]*?gid:\s*"(\d+)"/g;
        let m;
        while ((m = re.exec(html))) gids[Number(m[1])] = m[2];
      } catch (e) {
        console.warn('Season list lookup failed; using the built-in list.', e);
      }
      const list = seasonList(gids);
      store.set('gn:seasons', list);
      return list;
    });
  }

  function parseCsv(text) {
    if (!window.Papa) throw new Error('PapaParse is not loaded');
    return window.Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  }

  function youTubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : null;
  }

  function splitFormats(s) {
    return String(s || '').split(/[,;&]+/).map((f) => f.trim()).filter(Boolean);
  }

  function toEpisode(row, seasonNumber) {
    const videoId = youTubeId(row['YouTube Link']);
    if (!videoId) return null;
    return {
      season: seasonNumber,
      code: (row.Episode || '').trim(),
      ordinal: (row.Ordinal || '').replace(/[[\]]/g, '').trim(),
      date: (row.Date || '').trim(),
      formats: splitFormats(row.Formats),
      guests: (row.Guests || '').trim(),
      features: (row.Features || '').trim(),
      title: (row['Episode Title'] || '').trim(),
      author: (row['Title Author'] || '').trim(),
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumb: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    };
  }

  // The "coming soon" video used as the link for scheduled-but-unaired rows.
  const PLACEHOLDER_VIDEO_IDS = new Set(['f1srUafNMAk']);

  // Flag rows that aren't real episodes yet: they link to the placeholder
  // video, or (if a different placeholder is ever used) share a video with
  // other rows and have no title. Many real early episodes have no title, so
  // a missing title alone is not enough.
  function markUpcoming(episodes) {
    const counts = new Map();
    episodes.forEach((e) => counts.set(e.videoId, (counts.get(e.videoId) || 0) + 1));
    episodes.forEach((e) => {
      e.upcoming = PLACEHOLDER_VIDEO_IDS.has(e.videoId) || (!e.title && counts.get(e.videoId) > 1);
    });
    return episodes;
  }

  function getSeasonEpisodes(season) {
    return once(`season:${season.gid}`, async () => {
      const key = `gn:season:${season.gid}`;
      let text = store.get(key, 10 * 60 * 1000);
      if (!text) {
        text = await (await fetchWithTimeout(`${SHEET_BASE}/pub?gid=${season.gid}&single=true&output=csv`)).text();
        store.set(key, text);
      }
      return markUpcoming(parseCsv(text).map((r) => toEpisode(r, season.number)).filter(Boolean));
    });
  }

  // The most recent aired episode, looking back a season if the newest one
  // only has placeholders so far.
  async function getLatestEpisode() {
    const seasons = await getSeasons();
    for (let i = seasons.length - 1; i >= Math.max(0, seasons.length - 2); i--) {
      const eps = await getSeasonEpisodes(seasons[i]);
      const aired = eps.filter((e) => !e.upcoming);
      if (aired.length) return aired[aired.length - 1];
    }
    return null;
  }

  // ---------- Penny Bank ----------

  async function getJson(file) {
    const res = await fetchWithTimeout(PENNY_BASE + encodeURIComponent(file));
    return res.json();
  }

  function getPlayers() {
    return once('penny:players', async () => {
      const data = await getJson(PENNY_PLAYERS_FILE);
      return (data.playerList || []).map((p) => ({
        name: p.PlayerName,
        credits: Number(p.AuthorCredits) || 0,
        current: Number(p.CurrentSeasonPennys) || 0,
        total: Number(p.AllTimePennys) || 0
      }));
    });
  }

  function normaliseFormat(format, data) {
    if (format.type === 'leaderboard') {
      const rows = (Array.isArray(data) ? data : []).map((r) => ({
        name: r.playerName,
        score: Number(r.playerScore) || 0
      }));
      return Object.assign({}, format, { rows });
    }
    const counts = new Map();
    MEDAL_TYPES.forEach((type) => {
      (data[`${type}Medallists`] || []).forEach((name) => {
        if (!counts.has(name)) counts.set(name, { name, gold: 0, silver: 0, bronze: 0, lobby: 0 });
        counts.get(name)[type]++;
      });
    });
    return Object.assign({}, format, { rows: Array.from(counts.values()) });
  }

  // Loads every format file in parallel. Formats that fail to load are
  // returned with an `error` so the page can carry on without them.
  function getFormats() {
    return once('penny:formats', () =>
      Promise.all(
        PENNY_FORMATS.map((f) =>
          getJson(f.file)
            .then((data) => normaliseFormat(f, data))
            .catch((error) => {
              console.warn(`Could not load ${f.file}`, error);
              return Object.assign({}, f, { rows: [], error });
            })
        )
      )
    );
  }

  GN.data = {
    MEDAL_TYPES,
    PENNY_FORMATS,
    getSeasons,
    getSeasonEpisodes,
    getLatestEpisode,
    getPlayers,
    getFormats
  };
})();
