/*
 * The Penny Bank: leaderboards, format medal cabinets, Hall of Fame and
 * player medal cabinets. Every view has its own URL (?player=, ?view=formats&format=,
 * ?view=hof, ?mode=) so it can be linked to and the back button works.
 */
(function () {
  const { esc, formatNumber, rankLabels, data } = window.GN;

  const view = document.getElementById('view');
  const head = document.getElementById('page-head');
  const findForm = document.getElementById('find');
  const findInput = document.getElementById('find-input');
  const findHint = document.getElementById('find-hint');

  const MEDALS = [
    ['gold', 'Gold', '--medal-gold'],
    ['silver', 'Silver', '--medal-silver'],
    ['bronze', 'Bronze', '--medal-bronze'],
    ['lobby', 'Lobby', '--medal-lobby']
  ];
  const MODES = {
    current: 'This season',
    total: 'All-time',
    credits: 'Author credits'
  };

  let players = null;
  let formats = null;
  let renderToken = 0;

  // ---------- routing ----------

  function url(params) {
    const p = new URLSearchParams();
    Object.keys(params).forEach((k) => { if (params[k]) p.set(k, params[k]); });
    const qs = p.toString();
    return `/PennyBank/${qs ? `?${qs}` : ''}`;
  }
  const playerUrl = (name) => url({ player: name });
  const formatUrl = (id) => url({ view: 'formats', format: id });

  function readRoute() {
    const p = new URLSearchParams(location.search);
    if (p.get('player')) return { view: 'player', player: p.get('player') };
    const q = p.get('q') || '';
    if (p.get('view') === 'formats') return { view: 'formats', format: p.get('format') || '', q };
    if (p.get('view') === 'hof') return { view: 'hof', q };
    const mode = MODES[p.get('mode')] ? p.get('mode') : 'current';
    return { view: 'leaderboard', mode, q };
  }

  function routeUrl(route) {
    if (route.view === 'formats') return url({ view: 'formats', format: route.format, q: route.q });
    if (route.view === 'hof') return url({ view: 'hof', q: route.q });
    return url({ mode: route.mode === 'current' ? '' : route.mode, q: route.q });
  }

  function go(href, replace) {
    history[replace ? 'replaceState' : 'pushState'](null, '', href);
    render();
    if (!replace) window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
  window.addEventListener('popstate', render);

  // ---------- data ----------

  async function ensurePlayers() {
    if (!players) {
      players = await data.getPlayers();
      document.getElementById('player-names').innerHTML = players
        .map((p) => `<option value="${esc(p.name)}"></option>`).join('');
    }
    return players;
  }

  async function ensureFormats() {
    if (!formats) formats = await data.getFormats();
    return formats;
  }

  // ---------- shared bits ----------

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Every view uses the same heading size so switching tabs never shifts the page.
  function setHead(title, opts) {
    const o = opts || {};
    head.innerHTML = `
      <div style="min-width: 0;">
        <h1 class="display d-page" style="overflow-wrap: anywhere;">${esc(title)}</h1>
      </div>
      ${o.actions ? `<div class="head-actions">${o.actions}</div>` : ''}`;
    document.title = `${o.docTitle || title} – Game Night`;
  }

  function setTabs(active) {
    document.querySelectorAll('.tab').forEach((t) => {
      if (t.dataset.tab === active) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  }

  function skeleton(rows) {
    view.setAttribute('aria-busy', 'true');
    view.innerHTML = Array.from({ length: rows || 8 }, () => '<div class="skeleton skeleton-row"></div>').join('');
  }

  function notice(title, body, action) {
    return `<div class="notice"><strong>${esc(title)}</strong>${body}${action || ''}</div>`;
  }

  function searchBox(label, value) {
    return `
      <label class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <span class="visually-hidden">${esc(label)}</span>
        <input type="search" class="row-filter" placeholder="${esc(label)}" value="${esc(value)}" autocomplete="off">
      </label>`;
  }

  // Wires a filter box to repaint only the rows, keeping focus in the box.
  function wireFilter(route, paint) {
    const input = view.querySelector('.row-filter');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        route.q = input.value.trim();
        history.replaceState(null, '', routeUrl(route));
        paint();
      }, 120);
    });
  }

  function matchesQuery(name, q) {
    return !q || name.toLowerCase().includes(q.toLowerCase());
  }

  const topClass = (rank) => (rank.rank <= 3 ? ` top-${rank.rank}` : '');
  const num = (n) => `<span class="t-num${n ? '' : ' zero'}">${n}</span>`;

  function withTotals(r) {
    return Object.assign({}, r, { total: r.gold + r.silver + r.bronze + r.lobby });
  }

  function medalSort(a, b) {
    return b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze ||
      b.lobby - a.lobby || b.total - a.total || a.name.localeCompare(b.name);
  }

  function medalRanked(rows) {
    const list = rows.map(withTotals).sort(medalSort);
    const ranks = rankLabels(list, (a, b) =>
      a.gold === b.gold && a.silver === b.silver && a.bronze === b.bronze && a.lobby === b.lobby);
    return list.map((r, i) => Object.assign(r, { rank: ranks[i] }));
  }

  function scoreRanked(rows) {
    const list = rows.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const ranks = rankLabels(list, (a, b) => a.score === b.score);
    return list.map((r, i) => Object.assign({}, r, { rank: ranks[i] }));
  }

  const medalHeadCells = MEDALS.map(([, label, v]) =>
    `<span class="t-num"><span class="disc" style="--disc: var(${v})"></span><span class="label">${label}</span></span>`).join('');

  function medalTable(list) {
    return `
      <div class="table">
        <div class="t-row t-head medal-cols"><span>#</span><span>Player</span>${medalHeadCells}<span class="t-num">Total</span></div>
        ${list.map((r) => `
          <a class="t-row medal-cols${topClass(r.rank)}" href="${esc(playerUrl(r.name))}" data-nav>
            <span class="t-rank">${r.rank.label}</span>
            <span class="t-name">${esc(r.name)}</span>
            ${num(r.gold)}${num(r.silver)}${num(r.bronze)}${num(r.lobby)}
            <span class="t-num t-total">${r.total}</span>
          </a>`).join('')}
      </div>`;
  }

  function scoreTable(list, valueLabel) {
    return `
      <div class="table">
        <div class="t-row t-head lb-cols"><span>#</span><span>Player</span><span class="t-num">${esc(valueLabel)}</span></div>
        ${list.map((r) => `
          <a class="t-row lb-cols${topClass(r.rank)}" href="${esc(playerUrl(r.name))}" data-nav>
            <span class="t-rank">${r.rank.label}</span>
            <span class="t-name">${esc(r.name)}</span>
            <span class="t-num">${formatNumber(r.score)}</span>
          </a>`).join('')}
      </div>`;
  }

  // ---------- views ----------

  async function renderLeaderboard(route, token) {
    setHead('The Penny Bank', { docTitle: 'The Penny Bank' });
    if (!players) skeleton();
    await ensurePlayers();
    if (token !== renderToken) return;

    const key = route.mode;
    const ranked = scoreRanked(players.filter((p) => p[key] > 0).map((p) => ({ name: p.name, score: p[key] })));

    view.innerHTML = `
      <div class="controls">
        <div class="segmented" role="group" aria-label="Leaderboard">
          ${Object.keys(MODES).map((k) => `<button type="button" data-mode="${k}" aria-pressed="${k === key}">${MODES[k]}</button>`).join('')}
        </div>
        ${searchBox('Filter players', route.q)}
      </div>
      <div id="rows"></div>`;

    view.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      go(routeUrl(Object.assign({}, route, { mode: b.dataset.mode })), true);
    }));

    const rowsEl = document.getElementById('rows');
    const paint = () => {
      if (!ranked.length) {
        rowsEl.innerHTML = notice('Nothing here yet', key === 'current' ? 'No pennys have been banked this season yet.' : 'No players to show.');
        return;
      }
      const rows = ranked.filter((r) => matchesQuery(r.name, route.q));
      if (!rows.length) {
        rowsEl.innerHTML = notice('No players found', `Nobody matching “${esc(route.q)}”.`);
        return;
      }
      const podium = !route.q && rows.length >= 3 ? rows.slice(0, 3) : [];
      const medalVars = ['--medal-gold', '--medal-silver', '--medal-bronze'];
      rowsEl.innerHTML = (podium.length ? `
        <div class="podium">
          ${podium.map((r, i) => `
            <a href="${esc(playerUrl(r.name))}" data-nav style="--medal: var(${medalVars[i]})">
              <span class="p-rank">${r.rank.label.startsWith('=') ? r.rank.label : ordinal(r.rank.rank)}</span>
              <span class="p-name">${esc(r.name)}</span>
              <span class="p-value">${formatNumber(r.score)}</span>
            </a>`).join('')}
        </div>` : '') +
        (rows.length > podium.length ? scoreTable(rows.slice(podium.length), MODES[key]) : '');
    };
    paint();
    wireFilter(route, paint);
    view.removeAttribute('aria-busy');
  }

  async function renderFormats(route, token) {
    if (!formats) {
      setHead('Medal Cabinets');
      skeleton();
    }
    await ensureFormats();
    if (token !== renderToken) return;

    const current = formats.find((f) => f.id.toLowerCase() === route.format.toLowerCase()) || formats[0];
    route.format = current.id;
    const isMedals = current.type === 'medals';
    setHead(current.label);

    view.innerHTML = `
      <nav class="format-picker" aria-label="Formats">
        ${formats.map((f) => `<a href="${esc(formatUrl(f.id))}" data-nav${f.id === current.id ? ' aria-current="page"' : ''}>${esc(f.label)}</a>`).join('')}
      </nav>
      <select class="field format-select" aria-label="Format">
        ${formats.map((f) => `<option value="${esc(f.id)}"${f.id === current.id ? ' selected' : ''}>${esc(f.label)}</option>`).join('')}
      </select>
      <div class="controls">
        <span class="muted">${isMedals ? `${formatNumber(current.rows.length)} medallists` : `${formatNumber(current.rows.length)} players`}</span>
        ${searchBox('Filter players', route.q)}
      </div>
      <div id="rows"></div>`;

    view.querySelector('.format-select').addEventListener('change', (e) => go(formatUrl(e.target.value)));

    const ranked = isMedals ? medalRanked(current.rows) : scoreRanked(current.rows);
    const rowsEl = document.getElementById('rows');
    const paint = () => {
      if (current.error) {
        rowsEl.innerHTML = notice("This table couldn't be loaded", 'Please try again in a moment.');
        return;
      }
      const rows = ranked.filter((r) => matchesQuery(r.name, route.q));
      if (!rows.length) {
        rowsEl.innerHTML = notice('No players found', route.q ? `Nobody matching “${esc(route.q)}”.` : 'No results recorded yet.');
        return;
      }
      rowsEl.innerHTML = isMedals ? medalTable(rows) : scoreTable(rows, 'Score');
    };
    paint();
    wireFilter(route, paint);
    view.removeAttribute('aria-busy');
  }

  function hallOfFame() {
    const totals = new Map();
    formats.filter((f) => f.type === 'medals').forEach((f) => {
      f.rows.forEach((r) => {
        const t = totals.get(r.name) || { name: r.name, gold: 0, silver: 0, bronze: 0, lobby: 0 };
        MEDALS.forEach(([k]) => { t[k] += r[k]; });
        totals.set(r.name, t);
      });
    });
    return medalRanked(Array.from(totals.values()));
  }

  async function renderHof(route, token) {
    setHead('Hall of Fame');
    if (!formats) skeleton();
    await ensureFormats();
    if (token !== renderToken) return;

    const ranked = hallOfFame();
    const failed = formats.filter((f) => f.error).length;
    view.innerHTML = `
      <div class="controls">
        <span class="muted">${formatNumber(ranked.length)} medallists across ${formats.filter((f) => f.type === 'medals' && !f.error).length} formats${failed ? ` (${failed} couldn't load)` : ''}</span>
        ${searchBox('Filter players', route.q)}
      </div>
      <div id="rows"></div>`;
    const rowsEl = document.getElementById('rows');
    const paint = () => {
      const rows = ranked.filter((r) => matchesQuery(r.name, route.q));
      rowsEl.innerHTML = rows.length ? medalTable(rows) : notice('No players found', `Nobody matching “${esc(route.q)}”.`);
    };
    paint();
    wireFilter(route, paint);
    view.removeAttribute('aria-busy');
  }

  async function renderPlayer(route, token) {
    setHead(route.player);
    skeleton(10);
    await Promise.all([ensurePlayers(), ensureFormats()]);
    if (token !== renderToken) return;

    // Resolve the name, forgiving differences in letter case.
    const lower = route.player.toLowerCase();
    const allNames = new Set(players.map((p) => p.name));
    formats.forEach((f) => f.rows.forEach((r) => allNames.add(r.name)));
    const name = allNames.has(route.player)
      ? route.player
      : Array.from(allNames).find((n) => n.toLowerCase() === lower);

    if (!name) {
      setHead('Player not found', { docTitle: 'Player not found' });
      view.innerHTML = notice(`No player called “${esc(route.player)}”`,
        'Check the spelling, or use the search box above.',
        '<div><a class="btn btn-primary" href="/PennyBank/" data-nav>Back to the leaderboard</a></div>');
      view.removeAttribute('aria-busy');
      return;
    }
    if (name !== route.player) history.replaceState(null, '', playerUrl(name));

    const p = players.find((x) => x.name === name);
    const medalRows = formats
      .filter((f) => f.type === 'medals')
      .map((f) => {
        const r = f.rows.find((x) => x.name === name);
        return r && withTotals(Object.assign({}, r, { name: f.label, format: f }));
      })
      .filter(Boolean)
      .sort(medalSort);
    const sum = { gold: 0, silver: 0, bronze: 0, lobby: 0, total: 0 };
    medalRows.forEach((r) => { Object.keys(sum).forEach((k) => { sum[k] += r[k]; }); });

    const scoreRows = formats
      .filter((f) => f.type === 'leaderboard')
      .map((f) => {
        const ranked = scoreRanked(f.rows);
        const r = ranked.find((x) => x.name === name);
        return r && { format: f, score: r.score, rank: r.rank };
      })
      .filter(Boolean);

    let seasonSub = 'No pennys yet this season';
    if (p && p.current > 0) {
      const seasonRanked = scoreRanked(players.filter((x) => x.current > 0).map((x) => ({ name: x.name, score: x.current })));
      const mine = seasonRanked.find((x) => x.name === name);
      seasonSub = `${mine.rank.label.startsWith('=') ? '=' : ''}${ordinal(mine.rank.rank)} this season`;
    }

    setHead(name, {
      docTitle: `${name}'s medal cabinet`,
      actions: `
        <button type="button" class="btn btn-ghost" id="copy-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
          <span>Copy link</span></button>`
    });
    document.getElementById('copy-link').addEventListener('click', async (e) => {
      const label = e.currentTarget.querySelector('span');
      try {
        await navigator.clipboard.writeText(location.href);
        label.textContent = 'Link copied';
      } catch (err) {
        window.prompt('Copy this link:', location.href);
      }
      setTimeout(() => { label.textContent = 'Copy link'; }, 2000);
    });

    const stat = (label, value, sub) => `
      <div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}</span><span class="stat-sub">${sub}</span></div>`;
    const maxTotal = Math.max(1, ...medalRows.map((r) => r.total));
    const pct = (n, t) => `${t ? ((n / t) * 100).toFixed(1) : 0}%`;

    view.innerHTML = `
      <div class="stats">
        ${stat('All-time pennys', p ? formatNumber(p.total) : '—', p ? 'Across every season' : 'No Penny Bank record')}
        ${stat('This season', p ? formatNumber(p.current) : '—', esc(seasonSub))}
        ${stat('Author credits', p ? formatNumber(p.credits) : '—', 'Lifetime total')}
        ${stat('Medals', formatNumber(sum.total), medalRows.length ? `Across ${medalRows.length} format${medalRows.length === 1 ? '' : 's'}` : 'None yet')}
      </div>

      ${medalRows.length ? `
        <h2 class="section-title">Medals by format</h2>
        <div class="table">
          <div class="t-row t-head cabinet-cols"><span>Format</span>${medalHeadCells}<span class="t-num">Total</span><span class="t-mix-head">Medal mix</span></div>
          ${medalRows.map((r) => `
            <a class="t-row cabinet-cols" href="${esc(formatUrl(r.format.id))}" data-nav>
              <span class="t-name">${esc(r.name)}</span>
              ${num(r.gold)}${num(r.silver)}${num(r.bronze)}${num(r.lobby)}
              <span class="t-num t-total">${r.total}</span>
              <span class="t-mix" style="width: ${pct(r.total, maxTotal)}" aria-hidden="true">
                ${MEDALS.map(([k, , v]) => `<span style="width: ${pct(r[k], r.total)}; background: var(${v});"></span>`).join('')}
              </span>
            </a>`).join('')}
          <div class="t-row t-foot cabinet-cols">
            <span class="muted">All formats</span>
            <span class="t-num">${sum.gold}</span><span class="t-num">${sum.silver}</span><span class="t-num">${sum.bronze}</span><span class="t-num">${sum.lobby}</span>
            <span class="t-num t-total">${sum.total}</span><span class="t-mix-head"></span>
          </div>
        </div>` : notice('No medals yet', 'Medals from every format will appear here.')}

      ${scoreRows.length ? `
        <h2 class="section-title">Leaderboard formats</h2>
        <div class="table">
          <div class="t-row t-head score-cols"><span>Format</span><span class="t-num">Score</span><span class="t-num">Rank</span></div>
          ${scoreRows.map((r) => `
            <a class="t-row score-cols" href="${esc(formatUrl(r.format.id))}" data-nav>
              <span class="t-name">${esc(r.format.label)}</span>
              <span class="t-num">${formatNumber(r.score)}</span>
              <span class="t-num t-total">${r.rank.label}</span>
            </a>`).join('')}
        </div>` : ''}`;
    view.removeAttribute('aria-busy');
  }

  async function render() {
    const token = ++renderToken;
    const route = readRoute();
    setTabs(route.view);
    findHint.textContent = '';
    try {
      if (route.view === 'player') await renderPlayer(route, token);
      else if (route.view === 'formats') await renderFormats(route, token);
      else if (route.view === 'hof') await renderHof(route, token);
      else await renderLeaderboard(route, token);
    } catch (e) {
      if (token !== renderToken) return;
      console.error('Penny Bank failed to load', e);
      view.removeAttribute('aria-busy');
      view.innerHTML = notice("The Penny Bank couldn't be loaded", 'Please try again in a moment.',
        '<div><button type="button" class="btn btn-primary" id="retry">Try again</button></div>');
      document.getElementById('retry').addEventListener('click', render);
    }
  }

  // ---------- player finder ----------

  findInput.addEventListener('input', () => { findHint.textContent = ''; });
  findForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = findInput.value.trim().toLowerCase();
    if (!q) return;
    await ensurePlayers();
    const exact = players.find((p) => p.name.toLowerCase() === q);
    const partial = players.filter((p) => p.name.toLowerCase().includes(q));
    const target = exact || (partial.length === 1 ? partial[0] : null);
    if (target) {
      findInput.value = '';
      go(playerUrl(target.name));
    } else {
      findHint.textContent = partial.length ? `${partial.length} players match – keep typing` : 'No player by that name';
    }
  });

  // Start the (larger) format download straight away so other views are instant.
  render();
  ensureFormats().catch(() => {});
})();
