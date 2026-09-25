const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  tab: 'synthesizer',
  names: [],
  windows: [],
  presets: [],
  input: '',
  time: 'tahajjud',
  preset: null,
  dua: null,
  modal: null,
  saved: [],
  streak: 1,
  dailyTarget: 5,
  dailyCount: 0,
  tasbeeh: 0,
  tasbeehTarget: 33,
  visited: [],
};

const RULES = [
  { keys: ['job','rent','money','sustenance','financial','debt','work','business','provision','rizq','salary'], names: ['Ar-Razzaq','Al-Fattah'] },
  { keys: ['anxious','anxiety','panic','fear','peace','stress','calm','worry','overwhelm'], names: ['As-Salam',"Al-Mu'min"] },
  { keys: ['heal','illness','sick','health','pain','cure','recovery','hospital'], names: ['Ar-Rahman','Al-Jabbar'] },
  { keys: ['guide','decision','path','confused','clarity','choice','study','exam'], names: ['Al-Hadi','Al-Hakeem'] },
  { keys: ['forgive','sin','mistake','pardon','repent','guilt'], names: ['Al-Ghaffar','Al-Afuww'] },
  { keys: ['protect','harm','envy','enemy','danger','safety','hasad'], names: ['Al-Hafidh','Al-Wakeel'] },
  { keys: ['marriage','spouse','wife','husband','nikah','love'], names: ['Al-Wadud','Al-Jami'] },
  { keys: ['child','children','pregnancy','baby','family','offspring'], names: ['Al-Wahhab','Al-Barr'] },
  { keys: ['travel','journey','flight'], names: ['Al-Hafidh','Al-Wakeel'] },
];

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function findName(trans) {
  return state.names.find(n => n.transliteration === trans) || state.names[0];
}

function stripAr(ar) { return ar.replace(/^الْ/, '').replace(/^ال/, '').replace(/^ٱل/, ''); }
function stripTr(tr) { return tr.replace(/^(Ar-|Al-|As-|Ash-|Ad-|An-|Az-|At-)/, ''); }

function generateDua(text, timeId) {
  const lower = text.toLowerCase();
  let a = state.names[0], b = findName('Al-Wahhab');
  for (const rule of RULES) {
    if (rule.keys.some(k => lower.includes(k))) {
      a = findName(rule.names[0]);
      b = findName(rule.names[1]);
      break;
    }
  }
  const win = state.windows.find(w => w.id === timeId) || state.windows[0];
  const need = text.trim().replace(/\s+/g, ' ').slice(0, 180);
  return {
    selectedNames: [
      { arabic: a.arabic, transliteration: a.transliteration, meaning: a.english },
      { arabic: b.arabic, transliteration: b.transliteration, meaning: b.english },
    ],
    timeRecommendation: `Recommended: ${win.name}`,
    arabicDua: `الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ. يَا ${stripAr(a.arabic)}، يَا ${stripAr(b.arabic)}، افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ وَيَسِّرْ لِي أَمْرِي وَاكْفِنِي مَا أَهَمَّنِي، وَقَضِّ حَاجَتِي فِيمَا أَسْأَلُكَ. وَصَلَّى اللَّهُ عَلَى نَبِيِّنَا مُحَمَّدٍ وَآلِهِ وَصَحْبِهِ وَسَلَّمَ. آمِين.`,
    transliteration: `Alhamdu lillahi Rabbil 'Alameen, was-salatu was-salamu 'ala Rasulillah. Ya ${stripTr(a.transliteration)}, Ya ${stripTr(b.transliteration)}, iftah li abwaba rahmatika wa yassir li amri wa-kfini ma ahammani, waqdi hajati feema as'aluka. Wa sallallahu 'ala Nabiyyina Muhammadin wa 'alihi wa sahbihi wa sallam. Ameen.`,
    englishTranslation: `[1. Praise] All praise belongs to Allah, Lord of all the worlds. [2. Salawat] Peace and blessings be upon the Messenger of Allah. [3. Tawassul] O ${a.english}! O ${b.english}! [4. Request] Open the gates of Your mercy, ease my affair, suffice me in what concerns my heart, and fulfill the need I bring: “${need}”. [5. Closing] May Allah send blessings and peace upon our Prophet Muhammad, his family, and companions. Amin.`,
    etiquetteTip: `Begin with Tahmid and Salawat. Call upon Allah with ${a.transliteration} and ${b.transliteration} during ${win.name}. Face the qiblah if you can, raise your hands, and keep the request specific.`,
    savedAt: todayStr(),
  };
}

function loadStorage() {
  try { state.saved = JSON.parse(localStorage.getItem('asma_saved_duas') || '[]'); } catch { state.saved = []; }
  try { state.visited = JSON.parse(localStorage.getItem('asma_journey_visited') || '[]'); } catch { state.visited = []; }
  try { state.tasbeeh = parseInt(localStorage.getItem('asma_tasbeeh') || '0', 10) || 0; } catch { state.tasbeeh = 0; }
  try {
    const raw = JSON.parse(localStorage.getItem('dua_engine_streak_data') || 'null');
    const today = todayStr();
    if (!raw) {
      state.streak = 1;
      localStorage.setItem('dua_engine_streak_data', JSON.stringify({ streak: 1, lastActiveDate: today }));
    } else if (raw.lastActiveDate === today) {
      state.streak = raw.streak || 1;
    } else {
      const diff = Math.round((new Date(today) - new Date(raw.lastActiveDate)) / 86400000);
      state.streak = diff === 1 ? (raw.streak || 1) + 1 : 1;
      localStorage.setItem('dua_engine_streak_data', JSON.stringify({ streak: state.streak, lastActiveDate: today }));
    }
  } catch { state.streak = 1; }
  state.dailyTarget = parseInt(localStorage.getItem('dua_daily_target') || '5', 10) || 5;
  try {
    const prog = JSON.parse(localStorage.getItem('dua_daily_progress') || 'null');
    state.dailyCount = prog && prog.date === todayStr() ? (prog.count || 0) : 0;
  } catch { state.dailyCount = 0; }
}

function bumpDaily() {
  state.dailyCount += 1;
  localStorage.setItem('dua_daily_progress', JSON.stringify({ date: todayStr(), count: state.dailyCount }));
  renderChrome();
  if (state.dailyCount === state.dailyTarget) toast('Mashallah — daily dua target reached');
}

function setTab(tab) {
  const allowed = ['synthesizer','matrix','temporal','journey','journal'];
  if (!allowed.includes(tab)) tab = 'synthesizer';
  state.tab = tab;
  $$('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('[data-view]').forEach(v => v.classList.toggle('hidden', v.dataset.view !== tab));
  const hashMap = { synthesizer: '', matrix: 'names', temporal: 'windows', journey: 'journey', journal: 'journal' };
  const hash = hashMap[tab];
  if (hash) {
    if (location.hash !== '#' + hash) history.replaceState(null, '', '#' + hash);
  } else if (location.hash && location.hash !== '#') {
    history.replaceState(null, '', location.pathname);
  }
  if (tab === 'matrix') renderMatrix();
  if (tab === 'temporal') renderWindows();
  if (tab === 'journey') renderJourney();
  if (tab === 'journal') renderJournal();
}

function tabFromHash() {
  const h = (location.hash || '').replace('#','').toLowerCase();
  if (h === 'names' || h === 'matrix' || h === '99') return 'matrix';
  if (h === 'windows' || h === 'temporal') return 'temporal';
  if (h === 'journey') return 'journey';
  if (h === 'journal') return 'journal';
  return 'synthesizer';
}

function renderChrome() {
  $('#streak').textContent = `Streak ${state.streak}d`;
  $('#daily').textContent = `${state.dailyCount}/${state.dailyTarget} today`;
  $('#savedCount').textContent = `${state.saved.length} saved`;
}

function renderSynthesizer() {
  const presetBox = $('#presets');
  presetBox.innerHTML = state.presets.map(p =>
    `<button data-preset="${p.id}" class="${state.preset === p.id ? 'on' : ''}">${p.icon} ${p.label}</button>`
  ).join('');
  presetBox.onclick = (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    const p = state.presets.find(x => x.id === btn.dataset.preset);
    state.preset = p.id;
    state.input = p.text;
    state.time = p.time;
    $('#niyyah').value = p.text;
    renderTimes();
    renderSynthesizer();
  };
  renderTimes();
}

function renderTimes() {
  const box = $('#times');
  box.innerHTML = state.windows.map(w =>
    `<button data-time="${w.id}" class="${state.time === w.id ? 'on' : ''}"><strong>${w.icon} ${w.name}</strong><br><span class="meta">${w.desc}</span></button>`
  ).join('');
  box.onclick = (e) => {
    const btn = e.target.closest('[data-time]');
    if (!btn) return;
    state.time = btn.dataset.time;
    renderTimes();
  };
}

function showDua(dua) {
  state.dua = dua;
  const el = $('#duaOut');
  el.className = 'dua';
  el.innerHTML = `
    <div class="names-row">${dua.selectedNames.map(n => `<b>${n.transliteration} — ${n.meaning}</b>`).join('')}</div>
    <div class="tag">${dua.timeRecommendation}</div>
    <div class="arabic dua-ar">${dua.arabicDua}</div>
    <div class="meta"><em>${dua.transliteration}</em></div>
    <div class="meta">${dua.englishTranslation}</div>
    <div class="meta">${dua.etiquetteTip}</div>
    <div class="actions">
      <button class="ghost" id="copyBtn">Copy</button>
      <button class="ghost" id="saveBtn">Save to journal</button>
      <button class="ghost" id="speakBtn">Recite</button>
    </div>`;
  $('#copyBtn').onclick = async () => {
    const text = `${dua.arabicDua}\n\n${dua.transliteration}\n\n${dua.englishTranslation}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    toast('Copied');
  };
  $('#saveBtn').onclick = () => {
    state.saved = [dua, ...state.saved];
    localStorage.setItem('asma_saved_duas', JSON.stringify(state.saved));
    renderChrome();
    toast('Saved to journal');
  };
  $('#speakBtn').onclick = () => {
    if (!('speechSynthesis' in window)) return toast('Speech not supported');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(dua.arabicDua);
    u.lang = 'ar-SA'; u.rate = 0.8;
    speechSynthesis.speak(u);
  };
}

function renderMatrix() {
  const q = ($('#nameSearch')?.value || '').toLowerCase();
  const cat = $('#nameCat')?.value || 'All';
  const list = state.names.filter(n => {
    const okCat = cat === 'All' || n.category === cat;
    const okQ = !q || [n.transliteration, n.english, n.meaning, n.root, n.arabic].join(' ').toLowerCase().includes(q);
    return okCat && okQ;
  });
  $('#nameGrid').innerHTML = list.map(n => `
    <article class="card" data-id="${n.id}">
      <div class="row"><span>#${n.id}</span><span>${n.category}</span></div>
      <div class="arabic ar">${n.arabic}</div>
      <h3>${n.transliteration}</h3>
      <div class="en">${n.english}</div>
      <p>${n.meaning}</p>
    </article>`).join('') || '<p class="meta">No names match that filter.</p>';
}

function markVisited(id) {
  const n = Number(id);
  if (!state.visited.includes(n)) {
    state.visited.push(n);
    localStorage.setItem('asma_journey_visited', JSON.stringify(state.visited));
  }
}

function openModal(name) {
  markVisited(name.id);
  state.modal = name;
  const box = $('#modal');
  box.classList.add('show');
  box.innerHTML = `
    <div class="box">
      <button class="close" id="closeModal">×</button>
      <div class="tag">#${name.id} • ${name.category}</div>
      <div class="arabic dua-ar" style="text-align:center">${name.arabic}</div>
      <h3>${name.transliteration}</h3>
      <p class="en">${name.english}</p>
      <p class="meta">${name.meaning}</p>
      <p class="meta">Root: ${name.root}</p>
      <div class="saved">
        <div class="tag">Sample dua</div>
        <div class="arabic">${name.sampleDuaArabic || ''}</div>
        <p class="meta"><em>${name.sampleDuaTrans || ''}</em></p>
        <p class="meta">${name.sampleDuaEng || ''}</p>
      </div>
      <button class="primary" id="useName">Use in synthesizer</button>
    </div>`;
  $('#closeModal').onclick = () => box.classList.remove('show');
  box.onclick = (e) => { if (e.target === box) box.classList.remove('show'); };
  $('#useName').onclick = () => {
    box.classList.remove('show');
    state.input = `Seeking the blessings and alignment of ${name.transliteration} (${name.english}) for my situation...`;
    $('#niyyah').value = state.input;
    setTab('synthesizer');
  };
}

const JOURNEY_STAGES = [
  { id: 'mercy', title: 'Stage 1 — Mercy', blurb: 'Begin with Names of compassion and nearness.' },
  { id: 'sustenance', title: 'Stage 2 — Sustenance', blurb: 'Ask through Names of provision and opening.' },
  { id: 'forgiveness', title: 'Stage 3 — Forgiveness', blurb: 'Return through pardon, forbearance, and patience.' },
  { id: 'protection', title: 'Stage 4 — Protection', blurb: 'Seek sanctuary, peace, and guardianship.' },
  { id: 'knowledge', title: 'Stage 5 — Knowledge', blurb: 'Ask for light, guidance, and clear seeing.' },
  { id: 'power', title: 'Stage 6 — Power', blurb: 'Close with majesty, strength, and trust.' },
];

function renderJourney() {
  const list = $('#journeyList');
  if (!list) return;
  const total = state.names.length || 99;
  const done = state.visited.filter(id => state.names.some(n => n.id === id)).length;
  const bar = $('#journeyBar');
  if (bar) bar.style.width = Math.round((done / total) * 100) + '%';
  const meta = $('#journeyMeta');
  if (meta) meta.textContent = `${done} / ${total} names visited`;
  const catMap = {
    Mercy: 'mercy', Sustenance: 'sustenance', Forgiveness: 'forgiveness',
    Protection: 'protection', Knowledge: 'knowledge', Power: 'power',
  };
  list.innerHTML = JOURNEY_STAGES.map(stage => {
    const names = state.names.filter(n => catMap[n.category] === stage.id);
    const stageDone = names.filter(n => state.visited.includes(n.id)).length;
    return `<article class="journey-stage">
      <div class="tag">${stageDone}/${names.length} recited</div>
      <h3>${stage.title}</h3>
      <p class="meta">${stage.blurb}</p>
      <div class="journey-pills">
        ${names.map(n => `<button data-jid="${n.id}" class="${state.visited.includes(n.id) ? 'done' : ''}">${n.id}. ${n.transliteration}</button>`).join('')}
      </div>
    </article>`;
  }).join('');
}

function renderWindows() {
  $('#windowList').innerHTML = state.windows.map(w => `
    <article class="window">
      <div class="tag">${w.icon} ${w.tag}</div>
      <h3>${w.name}</h3>
      <p class="meta">${w.desc}</p>
      <p class="meta"><em>${w.hadith}</em></p>
      <div class="names-row">${w.recommendedNames.map(n => `<b>${n}</b>`).join('')}</div>
      <button class="ghost" data-use-time="${w.id}">Use this window</button>
    </article>`).join('');
}

function renderJournal() {
  $('#journalList').innerHTML = state.saved.length
    ? state.saved.map((d, i) => `
      <article class="saved">
        <div class="tag">${d.savedAt || ''} • ${d.timeRecommendation || ''}</div>
        <div class="arabic">${d.arabicDua}</div>
        <p class="meta">${d.englishTranslation}</p>
        <button class="ghost" data-del="${i}">Remove</button>
      </article>`).join('')
    : '<p class="meta">No saved duas yet. Synthesize one and tap Save.</p>';
  const tap = $('#tapTasbeeh');
  if (tap) tap.textContent = String(state.tasbeeh);
  const tgt = $('#tasbeehTarget');
  if (tgt) tgt.textContent = String(state.tasbeehTarget);
}

async function safeJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}

async function loadEngineData() {
  if (window.ENGINE_DATA?.names?.length >= 99) {
    return window.ENGINE_DATA;
  }
  try {
    const [names, windows, presets] = await Promise.all([
      safeJson('./data/names.json'),
      safeJson('./data/windows.json'),
      safeJson('./data/presets.json'),
    ]);
    if (names?.length) return { names, windows, presets };
  } catch (err) {
    console.warn('JSON pack missing, trying ENGINE_DATA', err);
  }
  if (window.ENGINE_DATA?.names?.length) return window.ENGINE_DATA;
  throw new Error('Names data missing');
}

async function boot() {
  const data = await loadEngineData();
  state.names = data.names || [];
  state.windows = data.windows || [];
  state.presets = data.presets || [];
  if (!state.names.length) throw new Error('Names data missing');

  loadStorage();
  renderChrome();
  renderSynthesizer();

  $$('nav.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  window.addEventListener('hashchange', () => setTab(tabFromHash()));
  const journeyList = $('#journeyList');
  if (journeyList) journeyList.onclick = (e) => {
    const btn = e.target.closest('[data-jid]');
    if (!btn) return;
    const name = state.names.find(n => String(n.id) === btn.dataset.jid);
    if (name) openModal(name);
    renderJourney();
  };
  const niyyah = $('#niyyah');
  if (niyyah) niyyah.oninput = (e) => { state.input = e.target.value; };
  const synthBtn = $('#synthBtn');
  if (synthBtn) synthBtn.onclick = () => {
    const text = ($('#niyyah')?.value || '').trim();
    if (!text) return toast('Enter your niyyah first');
    showDua(generateDua(text, state.time));
    bumpDaily();
  };
  const nameSearch = $('#nameSearch');
  if (nameSearch) nameSearch.oninput = renderMatrix;
  const nameCat = $('#nameCat');
  if (nameCat) nameCat.onchange = renderMatrix;
  const nameGrid = $('#nameGrid');
  if (nameGrid) nameGrid.onclick = (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const name = state.names.find(n => String(n.id) === card.dataset.id);
    if (name) openModal(name);
  };
  const windowList = $('#windowList');
  if (windowList) windowList.onclick = (e) => {
    const btn = e.target.closest('[data-use-time]');
    if (!btn) return;
    state.time = btn.dataset.useTime;
    setTab('synthesizer');
    renderTimes();
    toast('Temporal window applied');
  };
  const journalList = $('#journalList');
  if (journalList) journalList.onclick = (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    state.saved.splice(Number(btn.dataset.del), 1);
    localStorage.setItem('asma_saved_duas', JSON.stringify(state.saved));
    renderJournal();
    renderChrome();
  };
  const tap = $('#tapTasbeeh');
  if (tap) tap.onclick = () => {
    state.tasbeeh += 1;
    localStorage.setItem('asma_tasbeeh', String(state.tasbeeh));
    if (state.tasbeeh === state.tasbeehTarget) toast('Tasbeeh target reached');
    renderJournal();
  };
  const reset = $('#resetTasbeeh');
  if (reset) reset.onclick = () => {
    state.tasbeeh = 0;
    localStorage.setItem('asma_tasbeeh', '0');
    renderJournal();
  };
  setTab(tabFromHash());
}

function start() {
  boot().catch((err) => {
    console.error(err);
    const out = $('#duaOut');
    if (out) {
      out.className = 'empty';
      out.innerHTML = '<h3>Could not start the engine</h3><p class="meta">Engine data failed to load.</p>';
    }
    toast('Failed to load engine data');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
