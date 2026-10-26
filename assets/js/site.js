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

  // Top bar: who is signed in, in the slot at its far right. Asks the accounts
  // service's `peek` once per page load (persephones-chair-uac-manager,
  // docs/ACCOUNTS-SERVICE.md). Signed in: picture (or first letter) and
  // username, linking to the account page. Signed out, failed or slower than
  // 3 seconds: "Sign in", coming back here. The nav's Account link never changes.
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
    document.querySelectorAll('.account-slot').forEach((a) => {
      a.textContent = '';
      if (who && who.signedIn) {
        a.href = LOGIN + '/account';
        a.dataset.state = 'in';
        const name = typeof who.username === 'string' && who.username ? who.username : '';
        const pic = document.createElement('span');
        pic.className = 'account-pic';
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
        label.className = 'account-name';
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
    showWho(who);
  }

  // Play page: the free trial panel's box. Signed out keeps the HTML's own
  // lines (Sign in and Create account come back to this page). Signed in: who,
  // one line, and the account page and Support. Same three rows either way.
  function showWho(who) {
    document.querySelectorAll('[data-who]').forEach((box) => {
      if (who && who.signedIn) {
        const name = typeof who.username === 'string' && who.username ? who.username : 'Your account';
        const line = box.querySelector('.who-name');
        // The top bar's picture (or letter), just made above.
        const pic = document.querySelector('.account-slot .account-pic').cloneNode(true);
        const text = document.createElement('span');
        text.className = 'who-text';
        text.textContent = name;
        line.replaceChildren(pic, text);
        box.querySelector('p').textContent = 'Choose a free trial, or see your formats and time left.';
        const [primary, ghost] = box.querySelectorAll('.btn');
        primary.href = LOGIN + '/account';
        primary.textContent = 'Your account';
        ghost.href = '/support/#pay';
        ghost.textContent = 'Pay for a format';
        box.dataset.state = 'in';
      } else {
        box.dataset.state = 'out';
      }
    });
  }

  GN.refreshAccount = function () {
    if (!document.querySelector('.account-slot')) return Promise.resolve();
    return peek().then(showAccount);
  };

  // Support and Play: the free trial's numbers in force, from the accounts
  // service's public lookup (no sign-in), so they never disagree with the
  // Admin Console. The HTML holds today's numbers, which stay if the lookup
  // fails, is slower than 3 seconds, or answers something unexpected. Play's
  // Free trial chips show for the formats the lookup lists in trialFormats;
  // they stay hidden (their space kept) if it doesn't answer.
  const RULES = 'https://admin.persephoneschair.com/api/hosting?rules';

  async function trialRules() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(RULES, { signal: ctrl.signal });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function showTrialRules(r) {
    const listed = r && Array.isArray(r.trialFormats) ? r.trialFormats : [];
    document.querySelectorAll('[data-trial-format]').forEach((chip) => {
      chip.toggleAttribute('data-on', listed.includes(chip.dataset.trialFormat));
    });
    const days = r && r.periodDays;
    if (!Number.isInteger(days) || days < 1) return;
    const hours = r.playHours;
    document.querySelectorAll('[data-trial-rules]').forEach((el) => {
      // No hours (the settings never saved): the account page's one line.
      if (hours === null) {
        el.textContent = 'Choose one format to host free for ' + days + ' days. When it ends you can choose again.';
        return;
      }
      if (typeof hours !== 'number' || !(hours > 0)) return;
      const set = (sel, text) => el.querySelectorAll(sel).forEach((n) => { n.textContent = text; });
      set('[data-rule="periodDays"]', String(days));
      set('[data-rule-unit="days"]', days === 1 ? 'day' : 'days');
      set('[data-rule="playHours"]', String(Math.round(hours * 100) / 100));
      set('[data-rule-unit="hours"]', hours === 1 ? 'hour' : 'hours');
    });
  }

  GN.refreshTrialRules = function () {
    if (!document.querySelector('[data-trial-rules], [data-trial-format]')) return Promise.resolve();
    return trialRules().then(showTrialRules);
  };

  function init() {
    initMenu();
    GN.refreshAccount();
    GN.refreshTrialRules();
    // Back from the login app (page kept in the back/forward cache): ask again.
    window.addEventListener('pageshow', (e) => { if (e.persisted) GN.refreshAccount(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
