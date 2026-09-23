/* On Demand: browse, search and filter episodes from the published sheet. */
(function () {
  const GN = window.GN;
  const { esc, formatNumber, data } = GN;

  const els = {
    q: document.getElementById('q'),
    season: document.getElementById('season'),
    format: document.getElementById('format'),
    sort: document.getElementById('sort'),
    guests: document.getElementById('guests'),
    features: document.getElementById('features'),
    clear: document.getElementById('clear'),
    grid: document.getElementById('episodes'),
    count: document.getElementById('result-count')
  };

  const params = new URLSearchParams(location.search);
  const state = {
    season: params.get('season') || '', // season number, 'all', or '' for the latest
    format: params.get('format') || '',
    q: params.get('q') || '',
    guests: params.get('guests') === '1',
    features: params.get('features') === '1',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  };

  let seasons = [];
  let episodes = [];
  let loadToken = 0;
  let seasonChosen = !!params.get('season'); // picked by the visitor (or a shared link)

  function syncUrl() {
    const p = new URLSearchParams();
    const latest = seasons.length ? String(seasons[seasons.length - 1].number) : '';
    if (state.season && state.season !== latest) p.set('season', state.season);
    if (state.format) p.set('format', state.format);
    if (state.q) p.set('q', state.q);
    if (state.guests) p.set('guests', '1');
    if (state.features) p.set('features', '1');
    if (state.sort !== 'newest') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function seasonLabel() {
    if (state.season === 'all') return 'All seasons';
    const s = seasons.find((x) => String(x.number) === state.season);
    return s ? s.name : '';
  }

  function showSkeleton() {
    els.grid.setAttribute('aria-busy', 'true');
    els.grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton ep-skeleton"></div>').join('');
    els.count.textContent = '';
  }

  function showNotice(title, body, action) {
    els.grid.removeAttribute('aria-busy');
    els.grid.innerHTML = `
      <div class="notice" style="grid-column: 1 / -1;">
        <strong>${esc(title)}</strong>${esc(body)}
        ${action ? `<div><button type="button" class="btn btn-primary" id="notice-action">${esc(action.label)}</button></div>` : ''}
      </div>`;
    if (action) document.getElementById('notice-action').addEventListener('click', action.run);
  }

  function populateFormats() {
    const formats = Array.from(new Set(episodes.flatMap((e) => e.formats)))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (state.format && !formats.includes(state.format)) state.format = '';
    els.format.innerHTML = '<option value="">All formats</option>' +
      formats.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
    els.format.value = state.format;
  }

  function matches(e) {
    if (state.format && !e.formats.includes(state.format)) return false;
    if (state.guests && !e.guests) return false;
    if (state.features && !e.features) return false;
    if (state.q) {
      const hay = [e.title, e.author, e.guests, e.features, e.code, e.ordinal, e.date, e.formats.join(' ')]
        .join(' ').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  }

  function card(e) {
    return GN.episodeCard(e, { variant: 'compact' });
  }

  function render() {
    els.q.value = state.q;
    els.sort.value = state.sort;
    els.guests.setAttribute('aria-pressed', String(state.guests));
    els.features.setAttribute('aria-pressed', String(state.features));
    const filtering = !!(state.format || state.q || state.guests || state.features);
    els.clear.hidden = !filtering;
    syncUrl();
    document.title = `On Demand · ${seasonLabel()} – Game Night`;

    let list = episodes.filter(matches);
    if (state.sort === 'newest') list = list.slice().reverse();

    const total = episodes.length;
    els.count.textContent = filtering
      ? `${seasonLabel()} · ${formatNumber(list.length)} of ${formatNumber(total)} episodes`
      : `${seasonLabel()} · ${formatNumber(total)} episode${total === 1 ? '' : 's'}`;

    if (!total) {
      showNotice('No episodes yet', `Episodes from ${seasonLabel()} will appear here once they've aired.`);
      return;
    }
    if (!list.length) {
      showNotice('No episodes found', 'Nothing matches those filters.', { label: 'Clear filters', run: clearFilters });
      return;
    }
    els.grid.removeAttribute('aria-busy');
    els.grid.innerHTML = list.map(card).join('');
  }

  async function load() {
    const token = ++loadToken;
    showSkeleton();
    try {
      let failed = 0;
      if (state.season === 'all') {
        const results = await Promise.allSettled(seasons.map((s) => data.getSeasonEpisodes(s)));
        episodes = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : (failed++, [])));
      } else {
        const season = seasons.find((s) => String(s.number) === state.season);
        episodes = await data.getSeasonEpisodes(season);
      }
      if (token !== loadToken) return;
      if (failed === seasons.length && failed > 0) throw new Error('Every season failed to load');
      // Scheduled-but-unaired rows (placeholder video) aren't shown.
      episodes = episodes.filter((e) => !e.upcoming);
      // A brand-new season may have nothing aired yet; unless the visitor
      // picked it, show the previous season instead of an empty page.
      if (!episodes.length && !seasonChosen && state.season !== 'all') {
        const i = seasons.findIndex((s) => String(s.number) === state.season);
        if (i > 0) {
          seasonChosen = true;
          state.season = String(seasons[i - 1].number);
          els.season.value = state.season;
          load();
          return;
        }
      }
      populateFormats();
      render();
      if (failed) els.count.textContent += ` (${failed} season${failed === 1 ? '' : 's'} couldn't load)`;
    } catch (e) {
      if (token !== loadToken) return;
      console.error('Episodes failed to load', e);
      showNotice("Episodes couldn't be loaded", 'The episode list is temporarily unavailable.', { label: 'Try again', run: load });
    }
  }

  function clearFilters() {
    Object.assign(state, { format: '', q: '', guests: false, features: false });
    els.format.value = '';
    render();
  }

  // ---------- events ----------

  let searchTimer;
  els.q.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = els.q.value.trim(); render(); }, 150);
  });
  els.season.addEventListener('change', () => { seasonChosen = true; state.season = els.season.value; load(); });
  els.format.addEventListener('change', () => { state.format = els.format.value; render(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
  els.guests.addEventListener('click', () => { state.guests = !state.guests; render(); });
  els.features.addEventListener('click', () => { state.features = !state.features; render(); });
  els.clear.addEventListener('click', clearFilters);

  // ---------- start ----------

  (async function init() {
    showSkeleton();
    seasons = await data.getSeasons();
    const latest = seasons[seasons.length - 1];
    if (state.season !== 'all' && !seasons.some((s) => String(s.number) === state.season)) {
      state.season = String(latest.number);
    }
    els.season.innerHTML = seasons.slice().reverse()
      .map((s) => `<option value="${s.number}">${esc(s.name)}</option>`).join('') +
      '<option value="all">All seasons</option>';
    els.season.value = state.season;
    load();
  })();
})();
