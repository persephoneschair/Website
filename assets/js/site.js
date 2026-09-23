/* Game Night – shared helpers used by every page. Exposed as window.GN. */
(function () {
  const GN = (window.GN = window.GN || {});

  // Escape text before it goes into an HTML template string.
  GN.esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  GN.formatNumber = function (n) {
    return Number(n || 0).toLocaleString('en-GB');
  };

  // Standard competition ranking over an already-sorted list. `same(a, b)`
  // says whether two neighbours tie. Tied entries share a rank shown as "=2".
  GN.rankLabels = function (list, same) {
    const ranks = [];
    list.forEach((item, i) => {
      ranks.push(i > 0 && same(list[i - 1], item) ? ranks[i - 1] : i + 1);
    });
    return ranks.map((r, i) => {
      const tied = (i > 0 && ranks[i - 1] === r) || (i < ranks.length - 1 && ranks[i + 1] === r);
      return { rank: r, label: (tied ? '=' : '') + r };
    });
  };

  // Episode card shared by the homepage and On Demand.
  // opts.variant: 'feature' (homepage) or 'compact' (On Demand grid/list).
  // opts.badge overrides the badge text (e.g. "Latest episode").
  GN.episodeCard = function (e, opts) {
    const o = opts || {};
    const esc = GN.esc;
    const badge = o.badge || e.features;
    const badgeClass = 'badge';
    const thumb = o.variant === 'feature' ? `https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg` : e.thumb;
    return `
      <a class="ep-card ${o.variant || ''}" href="${esc(e.url)}" target="_blank" rel="noopener">
        <div class="ep-card-media">
          <img src="${esc(thumb)}" alt="" loading="${o.variant === 'feature' ? 'eager' : 'lazy'}" width="320" height="180">
          ${badge ? `<span class="${badgeClass}">${esc(badge)}</span>` : ''}
          <span class="play-circle" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l12 7-12 7z"/></svg></span>
        </div>
        <div class="ep-card-body">
          <div class="ep-card-meta"><span>${esc(e.code)}${e.ordinal ? ` · ${esc(e.ordinal)}` : ''}</span><span>${esc(e.date)}</span></div>
          <p class="ep-card-title">${esc(e.title || e.code)}</p>
          ${e.author ? `<span class="ep-card-sub">Title by ${esc(e.author)}</span>` : ''}
          ${e.guests ? `<span class="ep-card-guest">Guests: ${esc(e.guests)}</span>` : ''}
          <span class="ep-card-formats">${e.formats.map(esc).join(' · ')}</span>
          ${badge ? `<span class="${badgeClass} ep-card-badge-inline">${esc(badge)}</span>` : ''}
          <div class="chips">${e.formats.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>
        </div>
      </a>`;
  };

  // Mobile menu toggle.
  function initMenu() {
    const header = document.querySelector('.site-header');
    const btn = header && header.querySelector('.menu-btn');
    if (!btn) return;
    const setOpen = (open) => {
      header.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => setOpen(!header.classList.contains('open')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('open')) {
        setOpen(false);
        btn.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (header.classList.contains('open') && !header.contains(e.target)) setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }
})();
