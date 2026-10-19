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

  // Top bar: who is signed in. Asks the accounts service's `peek` once per page
  // load (persephones-chair-uac-manager, docs/ACCOUNTS-SERVICE.md). Signed in:
  // picture (or first letter) and username, linking to the account page.
  // Signed out, failed or slower than 3 seconds: "Sign in", coming back here.
  // The Admin link shows only when peek says `admin: true`; a missing field
  // means hidden. It is a shortcut only: the Admin Console checks for itself.
  const LOGIN = 'https://login.persephoneschair.com';
  const PEEK = 'https://admin.persephoneschair.com/api/session';
  const PERSON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.5"/><path d="M3.5 21a8.5 8.5 0 0 1 17 0z"/></svg>';

  async function peek() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(PEEK, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'peek' }),
        signal: ctrl.signal,
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function showAccount(who) {
    const admin = !!(who && who.signedIn && who.admin === true);
    document.querySelectorAll('.nav-admin').forEach((a) => { a.hidden = !admin; });
    document.querySelectorAll('.nav-account').forEach((a) => {
      a.textContent = '';
      if (who && who.signedIn) {
        a.href = LOGIN + '/account';
        a.dataset.state = 'in';
        const name = typeof who.username === 'string' && who.username ? who.username : '';
        const pic = document.createElement('span');
        pic.className = 'nav-account-pic';
        pic.setAttribute('aria-hidden', 'true');
        if (typeof who.picture === 'string' && /^https:\/\//.test(who.picture)) {
          const img = document.createElement('img');
          img.src = who.picture;
          img.alt = '';
          img.width = 26;
          img.height = 26;
          img.referrerPolicy = 'no-referrer';
          // A broken picture falls back to the letter.
          img.addEventListener('error', () => {
            if (name) pic.textContent = name.charAt(0).toUpperCase();
            else pic.innerHTML = PERSON_ICON;
          });
          pic.appendChild(img);
        } else if (name) {
          pic.textContent = name.charAt(0).toUpperCase();
        } else {
          pic.innerHTML = PERSON_ICON;
        }
        const label = document.createElement('span');
        label.className = 'nav-account-name';
        // No username yet: the account page asks them to choose one.
        label.textContent = name || 'Account';
        a.append(pic, label);
        a.setAttribute('aria-label', name ? 'Your account: ' + name : 'Your account');
        a.title = name ? 'Signed in as ' + name : 'Your account';
      } else {
        a.href = LOGIN + '/?return=' + encodeURIComponent(location.href);
        a.dataset.state = 'out';
        a.removeAttribute('aria-label');
        a.removeAttribute('title');
        a.textContent = 'Sign in';
      }
    });
  }

  GN.refreshAccount = function () {
    if (!document.querySelector('.nav-account')) return Promise.resolve();
    return peek().then(showAccount);
  };

  function init() {
    initMenu();
    GN.refreshAccount();
    // Back from the login app (page kept in the back/forward cache): ask again.
    window.addEventListener('pageshow', (e) => { if (e.persisted) GN.refreshAccount(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
