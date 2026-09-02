(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.getElementById('site-header');
  const bar = document.getElementById('scrollProgress');
  const stage = document.querySelector('.scene-stage');
  const photo = document.querySelector('.layer-photo');
  const water = document.querySelector('.layer-water');
  const coin = document.querySelector('.logo-coin');
  const copy = document.querySelector('.hero-copy');
  const ring = document.querySelector('.orbit-ring');

  let px = 0, py = 0, tx = 0, ty = 0;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function onScroll() {
    const y = window.scrollY || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = `${max ? (y / max) * 100 : 0}%`;
    header?.classList.toggle('scrolled', y > 40);

    if (reduce) return;
    const hero = document.querySelector('.scene-hero');
    if (hero && stage) {
      const rect = hero.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(hero.offsetHeight - innerHeight, 1), 0, 1);
      if (photo) photo.style.transform = `translateZ(${-120 + p * 80}px) scale(${1.14 + p * 0.08}) translateY(${p * 40}px)`;
      if (water) water.style.transform = `translateZ(${-40 + p * 30}px) scale(1.06) translateY(${p * 70}px)`;
      if (coin) coin.style.filter = `drop-shadow(0 30px 50px rgba(0,0,0,.35)) blur(${p * 4}px)`;
      if (copy) copy.style.opacity = String(1 - p * 1.15);
      if (copy) copy.style.transform = `translateZ(40px) translateY(${p * -80}px)`;
    }

    const orbit = document.querySelector('.orbit-block');
    const cards = [...document.querySelectorAll('.orbit-card')];
    if (orbit && ring && cards.length) {
      const r = orbit.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(orbit.offsetHeight - innerHeight, 1), 0, 1);
      const spin = p * 220;
      ring.style.transform = `rotateX(12deg) rotateY(${spin}deg)`;
      const n = cards.length;
      const radius = Math.min(innerWidth * 0.42, 460);
      cards.forEach((card, i) => {
        const a = (i / n) * 360;
        card.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
      });
    }
  }

  function onPointer(e) {
    if (reduce || !stage) return;
    const x = (e.clientX ?? (e.touches && e.touches[0].clientX) ?? innerWidth / 2) / innerWidth;
    const y = (e.clientY ?? (e.touches && e.touches[0].clientY) ?? innerHeight / 2) / innerHeight;
    tx = (x - 0.5) * 16;
    ty = (y - 0.5) * -10;
  }

  function tick() {
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    if (stage && !reduce) {
      stage.style.transform = `rotateY(${px}deg) rotateX(${py}deg)`;
    }
    requestAnimationFrame(tick);
  }

  function bindTilt(root = document) {
    root.querySelectorAll('.tilt-card').forEach((el) => {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = '1';
      el.addEventListener('pointermove', (e) => {
        if (reduce) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 10}deg) translateZ(8px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  bindTilt();
  window.MSLanding = { bindTilt, refresh: onScroll };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add('in'); });
  }, { threshold: 0.16 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('pointermove', onPointer, { passive: true });
  onScroll();
  tick();
})();
