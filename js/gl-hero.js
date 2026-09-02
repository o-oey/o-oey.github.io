/**
 * Maldives Sales — WebGL hero
 * Three.js scene mounted behind the landing copy.
 * Falls back silently if WebGL is missing or the user prefers reduced motion.
 */
import * as THREE from 'three';

const BRAND = {
  deep: 0x041820,
  ink: 0x03141b,
  ocean: 0x0c4452,
  tide: 0x1289a3,
  lagoon: 0x2ec4c9,
  foam: 0x7edceb,
  sand: 0xe7dcc8,
  gold: 0xd4b483,
  palm: 0x2f7a52,
};

const waterVert = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w1 = sin(p.x * 0.18 + uTime * 0.9) * 0.28;
    float w2 = sin(p.y * 0.22 - uTime * 1.15) * 0.22;
    float w3 = sin((p.x + p.y) * 0.12 + uTime * 0.55) * 0.16;
    vWave = w1 + w2 + w3;
    p.z += vWave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const waterFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float rim = smoothstep(0.62, 0.98, length(vUv - 0.5) * 1.6);
    float sparkle = pow(max(0.0, sin((vUv.x * 80.0 + uTime * 4.0)) * sin(vUv.y * 70.0 - uTime * 3.0)), 12.0);
    vec3 col = mix(uDeep, uShallow, vUv.y * 0.65 + vWave * 0.18);
    col = mix(col, uFoam, sparkle * 0.55);
    col = mix(col, uDeep * 0.45, rim);
    gl_FragColor = vec4(col, 0.96);
  }
`;

function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadTexture(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function logoTexture() {
  const img =
    (await loadTexture('/assets/maldives-sales-logo.png')) ||
    (await loadTexture('/assets/logo-official.svg'));
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(512, 512, 508, 0, Math.PI * 2);
  ctx.fillStyle = '#0a3d4a';
  ctx.fill();
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(512, 512, 500, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, 1024, 1024);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, 80, 0, 980);
    g.addColorStop(0, '#d8f4fb');
    g.addColorStop(0.45, '#7edceb');
    g.addColorStop(1, '#0b4c5c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(512, 512, 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7fdff';
    ctx.font = '700 280px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MS', 512, 530);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeAtoll(radius = 1.4) {
  const g = new THREE.Group();
  const reef = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.16, 10, 48),
    new THREE.MeshStandardMaterial({ color: BRAND.sand, roughness: 0.86, metalness: 0.04 })
  );
  reef.rotation.x = Math.PI / 2;
  const lagoon = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.86, 40),
    new THREE.MeshStandardMaterial({
      color: BRAND.lagoon,
      roughness: 0.2,
      metalness: 0.15,
      emissive: BRAND.tide,
      emissiveIntensity: 0.12,
    })
  );
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.position.y = 0.02;
  const isle = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.28, 18, 12),
    new THREE.MeshStandardMaterial({ color: BRAND.palm, roughness: 0.8 })
  );
  isle.scale.y = 0.28;
  isle.position.y = 0.12;
  g.add(reef, lagoon, isle);
  return g;
}

export async function mountHeroGL(root) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !canWebGL() || !root) return false;

  const canvas = document.createElement('canvas');
  canvas.className = 'gl-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06232c, 0.028);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 6.4, 16);

  scene.add(new THREE.HemisphereLight(0xbdeef5, 0x0c4452, 1.15));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTop: { value: new THREE.Color(0x9ad8ea) },
        uMid: { value: new THREE.Color(0x1289a3) },
        uBot: { value: new THREE.Color(0x03141b) },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vPos; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot;
        void main(){ float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 c = mix(uBot, uMid, smoothstep(0.15, 0.5, h));
          c = mix(c, uTop, smoothstep(0.55, 1.0, h));
          gl_FragColor = vec4(c, 1.0); }`,
    })
  );
  scene.add(sky);

  const waterUniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(BRAND.ocean) },
    uShallow: { value: new THREE.Color(BRAND.lagoon) },
    uFoam: { value: new THREE.Color(BRAND.foam) },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90, 90, 90),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      transparent: true,
    })
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const ring = new THREE.Group();
  const count = window.innerWidth < 720 ? 6 : 8;
  for (let i = 0; i < count; i += 1) {
    const a = makeAtoll(0.9 + (i % 3) * 0.18);
    const ang = (i / count) * Math.PI * 2;
    const rad = 6.4 + (i % 2) * 1.4;
    a.position.set(Math.cos(ang) * rad, 0.08, Math.sin(ang) * rad - 1.2);
    a.userData.baseY = a.position.y;
    a.userData.phase = i * 0.7;
    ring.add(a);
  }
  scene.add(ring);

  const coin = new THREE.Group();
  const tex = await logoTexture();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 64),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.18 })
  );
  const back = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 64),
    new THREE.MeshStandardMaterial({ color: BRAND.ocean, roughness: 0.4 })
  );
  back.rotation.y = Math.PI;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.045, 10, 64),
    new THREE.MeshStandardMaterial({ color: BRAND.gold, metalness: 0.7, roughness: 0.25 })
  );
  coin.add(disc, back, rim);
  coin.position.set(3.2, 3.1, 4.2);
  scene.add(coin);

  const sprayGeo = new THREE.BufferGeometry();
  const n = 240;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
  }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xeef8fb, size: 0.05, transparent: true, opacity: 0.45 }));
  scene.add(spray);

  let pointer = { x: 0, y: 0 };
  const onPointer = (e) => {
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? innerWidth / 2;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? innerHeight / 2;
    pointer.x = (x / innerWidth) * 2 - 1;
    pointer.y = (y / innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const hero = document.querySelector('.scene-hero');
  const copy = document.querySelector('.hero-copy');
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
  }, { threshold: 0.02 });
  io.observe(root);

  function heroProgress() {
    if (!hero) return 0;
    const r = hero.getBoundingClientRect();
    const p = -r.top / Math.max(hero.offsetHeight - innerHeight, 1);
    return Math.max(0, Math.min(1, p));
  }

  function resize() {
    const w = root.clientWidth || innerWidth;
    const h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const p = heroProgress();
    waterUniforms.uTime.value = t;
    ring.rotation.y = t * 0.05 + p * 0.9;
    ring.children.forEach((child) => {
      child.position.y = child.userData.baseY + Math.sin(t * 0.8 + child.userData.phase) * 0.08;
    });
    coin.rotation.y = t * 0.35 + pointer.x * 0.4;
    coin.rotation.x = 0.18 + Math.sin(t * 0.7) * 0.08 + pointer.y * 0.15;
    coin.position.y = 3.1 + Math.sin(t * 0.9) * 0.18 - p * 1.6;
    coin.position.x = 3.2 + pointer.x * 0.6;
    coin.position.z = 4.2 - p * 2.4;
    const camY = 6.4 - p * 3.8 + pointer.y * -0.4;
    const camZ = 16 - p * 7.5;
    const camX = pointer.x * 1.4;
    camera.position.x += (camX - camera.position.x) * 0.06;
    camera.position.y += (camY - camera.position.y) * 0.06;
    camera.position.z += (camZ - camera.position.z) * 0.06;
    camera.lookAt(0.6, 1.2 - p * 0.6, 0);
    spray.rotation.y = t * 0.02;
    if (copy) {
      copy.style.opacity = String(Math.max(0, 1 - p * 1.15));
      copy.style.transform = `translateY(${p * -70}px)`;
    }
    renderer.render(scene, camera);
  }
  frame();

  document.body.classList.add('has-webgl');
  window.MSGL = {
    renderer, scene, camera,
    dispose() {
      running = false;
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      canvas.remove();
      document.body.classList.remove('has-webgl');
    },
  };
  return true;
}

mountHeroGL(document.querySelector('.scene-sticky')).catch(() => {});
