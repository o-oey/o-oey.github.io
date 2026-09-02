(function () {
  const COLLECTIONS = [
    { slug: 'unesco-baa', title: 'UNESCO Baa', kicker: 'Biosphere reserve', blurb: 'Hanifaru Bay mantas and the protected atoll.', filter: (p) => p.atollCode === 'B' && p.tierIndex <= 2 },
    { slug: 'ultra', title: 'Ultra collection', kicker: 'The highest rooms', blurb: 'Soneva Jani, Cheval Blanc, One&Only.', filter: (p) => p.tierIndex === 0 },
    { slug: 'honeymoon', title: 'Honeymoon edit', kicker: 'Two people, one island', blurb: 'Overwater villas and quiet atolls.', filter: (p) => p.tierIndex <= 1 && (p.guestScore >= 9 || p.rating >= 4.6) },
    { slug: 'local-islands', title: 'Local islands', kicker: 'The inhabited Maldives', blurb: 'Guesthouses without a resort gate.', filter: (p) => p.tierIndex >= 3 },
    { slug: 'near-male', title: 'Close to Male', kicker: 'Speedboat evenings', blurb: 'Kaafu stays before sunset.', filter: (p) => p.atollCode === 'K' && p.transfer === 'speedboat' },
    { slug: 'whale-sharks', title: 'Ari and the giants', kicker: 'Year-round encounters', blurb: 'North and South Ari.', filter: (p) => ['AA', 'ADh'].includes(p.atollCode) }
  ];
  let atolls = [];
  let properties = [];
  let ready = null;
  function dataUrl(name) {
    const base = document.querySelector('script[src*="catalog.js"]');
    const root = base ? new URL('../data/', base.src).href : 'data/';
    return root + name;
  }
  async function load() {
    if (ready) return ready;
    ready = Promise.all([
      fetch(dataUrl('atolls.json')).then((r) => r.json()),
      fetch(dataUrl('featured.json')).then((r) => r.ok ? r.json() : [])
    ]).then(([a, p]) => { atolls = a; properties = p; });
    return ready;
  }
  function stats() {
    return {
      properties: properties.length,
      atolls: atolls.length,
      islands: new Set(properties.map((p) => p.island).filter(Boolean)).size,
      ultra: properties.filter((p) => p.tierIndex === 0).length,
      resorts: properties.filter((p) => p.tierIndex <= 2).length,
      guesthouses: properties.filter((p) => p.tierIndex >= 3).length
    };
  }
  function search(q, list) {
    list = list || properties;
    const needle = String(q || '').trim().toLowerCase();
    if (!needle) return list.slice(0, 40);
    return list.filter((p) => p.name.toLowerCase().includes(needle) || (p.island && p.island.toLowerCase().includes(needle)) || p.atoll.toLowerCase().includes(needle) || p.tier.toLowerCase().includes(needle));
  }
  function filterProperties(query) {
    let list = properties;
    if (query.atoll) list = list.filter((p) => String(query.atoll).split(',').includes(p.atollCode));
    if (query.tier) list = list.filter((p) => String(query.tier).toLowerCase().split(',').includes(p.tier.toLowerCase()));
    if (query.transfer) list = list.filter((p) => p.transfer === query.transfer);
    if (query.q) list = search(query.q, list);
    if (query.sort === 'price-asc') list = list.slice().sort((a,b)=>(a.priceFrom||9e9)-(b.priceFrom||9e9));
    else if (query.sort === 'price-desc') list = list.slice().sort((a,b)=>(b.priceFrom||0)-(a.priceFrom||0));
    else if (query.sort === 'rating') list = list.slice().sort((a,b)=>(b.rating||0)-(a.rating||0));
    else list = list.slice().sort((a,b)=>a.tierIndex-b.tierIndex||(b.rating||0)-(a.rating||0));
    const page = Math.max(1, Number(query.page)||1);
    const limit = Math.min(60, Math.max(1, Number(query.limit)||24));
    return { total: list.length, page, limit, pages: Math.ceil(list.length/limit), items: list.slice((page-1)*limit, (page-1)*limit+limit) };
  }
  window.MSCatalog = {
    load,
    handle: async function (path) {
      await load();
      const url = new URL(path, location.origin);
      const p = url.pathname.replace(/\/+$/, '') || url.pathname;
      const q = Object.fromEntries(url.searchParams.entries());
      if (p.endsWith('/api/health') || p.endsWith('/api/stats')) return p.endsWith('/api/health') ? { ok:true, brand:'Maldives Sales', catalog: stats(), mode:'static' } : stats();
      if (p.endsWith('/api/atolls')) return atolls;
      const am = p.match(/\/api\/atolls\/([^/]+)$/);
      if (am) {
        const atoll = atolls.find((a) => a.code === decodeURIComponent(am[1]));
        if (!atoll) throw new Error('Atoll not found');
        const stays = properties.filter((x) => x.atollCode === atoll.code);
        return Object.assign({}, atoll, { stays: stays.slice(0,80), stayCount: stays.length });
      }
      if (p.endsWith('/api/properties')) return filterProperties(q);
      const pm = p.match(/\/api\/properties\/([^/]+)$/);
      if (pm) {
        const item = properties.find((x) => x.id === decodeURIComponent(pm[1]));
        if (!item) throw new Error('Property not found');
        return Object.assign({}, item, { similar: properties.filter((x)=>x.atollCode===item.atollCode && x.id!==item.id).slice(0,8) });
      }
      if (p.endsWith('/api/search')) {
        const needle = String(q.q||'').toLowerCase();
        return { properties: search(q.q).slice(0,20), atolls: atolls.filter((a)=> (a.name+' '+a.aka+' '+a.code).toLowerCase().includes(needle)).slice(0,6) };
      }
      if (p.endsWith('/api/collections')) return COLLECTIONS.map((c)=>({ slug:c.slug, title:c.title, kicker:c.kicker, blurb:c.blurb, count: properties.filter(c.filter).length }));
      const cm = p.match(/\/api\/collections\/([^/]+)$/);
      if (cm) {
        const col = COLLECTIONS.find((c)=>c.slug===decodeURIComponent(cm[1]));
        if (!col) throw new Error('Collection not found');
        const items = properties.filter(col.filter).slice(0,48);
        return { slug:col.slug, title:col.title, kicker:col.kicker, blurb:col.blurb, count:items.length, items };
      }
      throw new Error('Not found');
    },
    saveInquiry(body) {
      const list = JSON.parse(localStorage.getItem('ms-inquiries')||'[]');
      const item = Object.assign({ id: Date.now(), created_at: new Date().toISOString(), status:'new' }, body);
      list.unshift(item);
      localStorage.setItem('ms-inquiries', JSON.stringify(list));
      return { ok:true, id:item.id, message:'Request saved. The live desk API will collect these when the Node server is running.' };
    },
    listInquiries() { return JSON.parse(localStorage.getItem('ms-inquiries')||'[]'); }
  };
})();
