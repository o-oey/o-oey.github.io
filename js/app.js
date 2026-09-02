const MS = {
  fallback: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1400&q=70',
  money(n) {
    if (n == null || n === 0) return 'On request';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  },
  img(url) { return url || MS.fallback; },
  async api(path) {
    try {
      const res = await fetch(path);
      if (res.ok) return res.json();
    } catch (_) {}
    if (path === '/api/admin/inquiries') return window.MSCatalog.listInquiries();
    return window.MSCatalog.handle(path);
  },
  async post(path, body) {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok || res.status === 201 || res.status === 400) return res.json();
    } catch (_) {}
    if (path === '/api/inquiries') return window.MSCatalog.saveInquiry(body);
    return { ok: false };
  },
  header(active) {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = `
      <a class="ms-brand" href="/">
        <img src="/assets/logo-mark.svg" alt="Maldives Sales logo">
        <span class="word"><strong>Maldives Sales</strong><span>Your journey, our passion</span></span>
      </a>
      <nav class="ms-nav" id="nav">
        <a href="/" data-nav="home">Home</a>
        <a href="/atolls.html" data-nav="atolls">Atolls</a>
        <a href="/explorer.html" data-nav="explorer">Stays</a>
        <a href="/collections.html" data-nav="collections">Collections</a>
        <a href="/concierge.html" data-nav="concierge">Concierge</a>
      </nav>
      <div class="ms-actions">
        <button class="icon-btn" id="searchBtn" aria-label="Search">⌕</button>
        <a class="btn btn-primary" href="/concierge.html">Plan a stay</a>
        <button class="icon-btn hamburger" id="menuBtn" aria-label="Menu">☰</button>
      </div>`;
    el.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === active) a.classList.add('active'); });
    document.getElementById('menuBtn')?.addEventListener('click', () => document.getElementById('nav').classList.toggle('open'));
    document.getElementById('searchBtn')?.addEventListener('click', MS.openSearch);
    MS.mountSearch();
  },
  footer() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = `
      <div class="wrap">
        <div>
          <img src="/assets/logo-mark.svg" alt="Maldives Sales">
          <p style="margin:12px 0 0;max-width:36ch">Maldives Sales is a discovery and concierge desk for the archipelago.</p>
        </div>
        <div><h4>Explore</h4><p><a href="/atolls.html">Atolls</a></p><p><a href="/explorer.html">All stays</a></p><p><a href="/collections.html">Collections</a></p></div>
        <div><h4>Desk</h4><p><a href="/concierge.html">Concierge</a></p><p><a href="/admin.html">Partner desk</a></p></div>
        <div><h4>Live</h4><p>o-oey.github.io</p><p>Your journey, our passion</p></div>
        <p class="legal">© ${new Date().getFullYear()} Maldives Sales.</p>
      </div>`;
  },
  mountSearch() {
    if (document.getElementById('searchOverlay')) return;
    const wrap = document.createElement('div');
    wrap.id = 'searchOverlay';
    wrap.className = 'search-overlay';
    wrap.innerHTML = `<div class="search-box"><input id="searchInput" placeholder="Search a resort, island or atoll"><div class="search-hits" id="searchHits"></div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.classList.remove('open'); });
    document.getElementById('searchInput').addEventListener('input', MS.onSearch);
  },
  openSearch() {
    document.getElementById('searchOverlay').classList.add('open');
    setTimeout(() => document.getElementById('searchInput').focus(), 30);
  },
  async onSearch(e) {
    const q = e.target.value.trim();
    const box = document.getElementById('searchHits');
    if (q.length < 2) { box.innerHTML = ''; return; }
    const data = await MS.api('/api/search?q=' + encodeURIComponent(q));
    box.innerHTML = [
      ...data.atolls.map((a) => `<a class="search-hit" href="/atoll.html?code=${a.code}"><div><strong>${a.name}</strong><small>Atoll · ${a.aka}</small></div></a>`),
      ...data.properties.map((p) => `<a class="search-hit" href="/property.html?id=${encodeURIComponent(p.id)}"><img src="${MS.img(p.image)}" alt=""><div><strong>${p.name}</strong><small>${p.island || p.atoll} · ${p.tier}</small></div></a>`),
    ].join('') || '<p class="muted">No matches.</p>';
  },
  card(p) {
    return `<a class="card" href="/property.html?id=${encodeURIComponent(p.id)}">
      <div class="card-media"><img src="${MS.img(p.image)}" alt="${p.name}" loading="lazy" onerror="this.src='${MS.fallback}'"><span class="badge">${p.tier}</span></div>
      <div class="card-body"><h3>${p.name}</h3><p class="meta">${p.island || 'Private island'} · ${p.atoll}</p><p class="price">${MS.money(p.priceFrom)} <em>/ night</em></p></div>
    </a>`;
  },
};
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); MS.openSearch(); }
  if (e.key === 'Escape') document.getElementById('searchOverlay')?.classList.remove('open');
});
