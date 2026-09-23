/* Homepage: latest episode card and Penny Bank top five. */
(function () {
  const { esc, formatNumber, rankLabels, data } = window.GN;

  async function renderLatest() {
    const card = document.getElementById('latest');
    try {
      const ep = await data.getLatestEpisode();
      if (!ep) throw new Error('No aired episodes found');

      const count = parseInt(ep.ordinal.replace(/\D/g, ''), 10);
      if (count) {
        document.getElementById('episode-count').textContent = ` ${formatNumber(count)} episodes and counting.`;
      }

      card.innerHTML = window.GN.episodeCard(ep, { variant: 'feature', badge: 'Latest episode' });
    } catch (e) {
      console.error('Latest episode failed to load', e);
      card.innerHTML = `
        <a class="ep-card feature" href="/OnDemand/">
          <div class="ep-card-body">
            <p class="ep-card-title">Every episode, on demand</p>
            <span class="ep-card-sub">Browse every season of Game Night →</span>
          </div>
        </a>`;
    } finally {
      card.removeAttribute('aria-busy');
    }
  }

  async function renderPenny() {
    const list = document.getElementById('mini-board');
    try {
      const players = await data.getPlayers();
      let key = 'current';
      if (!players.some((p) => p.current > 0)) {
        // Between seasons nobody has current-season pennys yet.
        key = 'total';
        document.getElementById('penny-label').textContent = 'All-time top five';
      }
      const top = players
        .filter((p) => p[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .slice(0, 5);
      const ranks = rankLabels(top, (a, b) => a[key] === b[key]);
      list.innerHTML = top.map((p, i) => `
        <li><a href="/PennyBank/?player=${encodeURIComponent(p.name)}">
          <span class="mini-rank">${ranks[i].label}</span>
          <span class="mini-name">${esc(p.name)}</span>
          <span class="mini-value">${formatNumber(p[key])}</span>
        </a></li>`).join('');
    } catch (e) {
      console.error('Penny Bank failed to load', e);
      list.innerHTML = '<li class="muted">The Penny Bank couldn\'t be loaded right now.</li>';
    } finally {
      list.removeAttribute('aria-busy');
    }
  }

  renderLatest();
  renderPenny();
})();
