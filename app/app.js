// Leonida Trophy Guide — checklist, filters, spoiler setting, per-trophy guides with cited
// sources, a seven-stage roadmap, and progress that persists in localStorage (export/import).
// Data: data/trophies.json and data/roadmap.json. The app loads nothing from the network;
// the only outbound links are the source citations a reader chooses to follow.

const STORAGE_KEY = 'leonida-trophy-guide:v1';
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const DEMO_EARNED = [2, 3, 8, 16, 20, 21]; // screenshot seed: a story start, plus early activities
const KINDS = ['all', 'story', 'missable', 'collectibles', 'activities', 'platinum', 'online'];

const $ = (id) => document.getElementById(id);
const els = {
  fill: $('progressFill'), label: $('progressLabel'), list: $('trophyList'),
  detail: $('detailPanel'), count: $('resultCount'), search: $('searchInput'),
  grade: $('gradeSelect'), spoiler: $('spoilerToggle'), earnedOnly: $('earnedToggle'),
  kinds: $('kindFilters'), checklist: $('checklistView'), roadmap: $('roadmapView'),
  tabChecklist: $('tabChecklist'), tabRoadmap: $('tabRoadmap'),
};

const trophyDoc = await (await fetch('data/trophies.json')).json();
const roadmapDoc = await (await fetch('data/roadmap.json')).json();
const trophies = trophyDoc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

let earned;
if (DEMO) {
  earned = new Set(DEMO_EARNED);
} else {
  try { earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { earned = new Set(); }
}

let kindFilter = KINDS.includes(params.get('filter')) ? params.get('filter') : 'all';
let gradeFilter = 'all';
let query = '';
let spoilerOn = params.get('spoiler') === '1';
let earnedOnly = false;
let selectedId = Number(params.get('trophy')) || null;
if (selectedId !== null && !byId.has(selectedId)) selectedId = null;
let view = params.get('view') === 'roadmap' ? 'roadmap' : 'checklist';

function saveProgress() {
  if (DEMO) return; // the screenshot seed is never persisted
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function isMasked(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.id);
}
function shownName(t) {
  return isMasked(t) ? 'Hidden story trophy' : t.name;
}
function shownDesc(t) {
  return isMasked(t) ? 'Name and description hidden until earned.' : t.description;
}

function chip(text, cls) {
  const s = document.createElement('span');
  s.className = `chip ${cls}`;
  s.textContent = text;
  return s;
}

function matches(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (earnedOnly && !earned.has(t.id)) return false;
  if (query) {
    const hay = `${shownName(t)} ${shownDesc(t)}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderProgress() {
  const n = earned.size;
  els.fill.style.width = `${(n / trophies.length) * 100}%`;
  const left = trophies.length - n;
  els.label.textContent = `${n} of ${trophies.length} earned · ${left} to go`;
}

function renderList() {
  const shown = trophies.filter(matches);
  els.list.replaceChildren();
  if (shown.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = kindFilter === 'online'
      ? 'No online trophies: all 55 trophies are single-player at launch, so this filter is empty by design.'
      : 'No trophies match the current filters.';
    els.list.append(li);
  }
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.id) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('click', (ev) => ev.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    body.className = 'body';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = shownName(t);
    body.append(name, chip(t.grade, `grade-${t.grade}`));
    if (t.hidden) body.append(chip('Hidden', 'hidden-flag'));
    if (t.missable) body.append(chip('Missable', 'missable-flag'));
    body.append(chip(`Stage ${t.stage}`, 'stage-flag'));
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = shownDesc(t);
    body.append(desc);
    if (t.target && !isMasked(t)) {
      const target = document.createElement('div');
      target.className = 'target';
      target.textContent = `Target: ${t.target}`;
      body.append(target);
    }
    li.append(box, body);
    li.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    els.list.append(li);
  }
  els.count.textContent = `Showing ${shown.length} of ${trophies.length} trophies — click a trophy to read its guide.`;
}

function renderDetail() {
  const t = selectedId !== null ? byId.get(selectedId) : null;
  els.detail.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'Pick a trophy from the list to read its guide: what to do, where it can be missed, and the sources each fact comes from.';
    els.detail.append(p);
    return;
  }
  const h = document.createElement('h2');
  h.textContent = shownName(t);
  els.detail.append(h);
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `${t.grade} · ${t.kind}${t.hidden ? ' · hidden on PlayStation until earned' : ''} · roadmap stage ${t.stage}${t.target ? ` · target: ${t.target}` : ''}`;
  els.detail.append(meta);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = isMasked(t)
    ? 'Official name and description hidden by the spoiler setting until this story trophy is earned.'
    : `“${t.description}”`;
  els.detail.append(official);
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = 'MISSABLE — the only one on the list. Its Chapter 1 balcony meditation spot at Jason’s house disappears when Chapter 1 ends: do it in Chapter 1, and keep a Chapter 1 save until this pops.';
    els.detail.append(warn);
  }
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = isMasked(t)
    ? 'Guide hidden by the spoiler setting. Earn the trophy, or untick “Hide story spoilers”, to read it.'
    : t.guide;
  els.detail.append(guide);
  if (!isMasked(t) && t.sources?.length) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Sources';
    const ul = document.createElement('ul');
    ul.className = 'sources';
    for (const s of t.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.append(a);
      ul.append(li);
    }
    els.detail.append(h3, ul);
  }
}

function renderRoadmap() {
  $('roadmapTitle').textContent = roadmapDoc.title;
  $('roadmapIntro').textContent = roadmapDoc.intro;
  const host = $('roadmapStages');
  host.replaceChildren();
  for (const stage of roadmapDoc.stages) {
    const card = document.createElement('article');
    card.className = 'stage';
    const h = document.createElement('h3');
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = `Stage ${stage.n} — `;
    h.append(n, document.createTextNode(stage.title));
    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = stage.time;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const name of stage.trophies) {
      const t = byName.get(name);
      if (!t) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tchip' + (earned.has(t.id) ? ' done' : '');
      b.textContent = name + (t.missable ? ' · MISSABLE' : '');
      b.addEventListener('click', () => { selectedId = t.id; setView('checklist'); renderAll(); });
      chips.append(b);
    }
    card.append(h, when, p, chips);
    host.append(card);
  }
}

function setView(v) {
  view = v;
  els.checklist.hidden = v !== 'checklist';
  els.roadmap.hidden = v !== 'roadmap';
  els.tabChecklist.classList.toggle('active', v === 'checklist');
  els.tabRoadmap.classList.toggle('active', v === 'roadmap');
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
}

/* controls */
els.search.addEventListener('input', () => { query = els.search.value.trim().toLowerCase(); renderList(); });
els.grade.addEventListener('change', () => { gradeFilter = els.grade.value; renderList(); });
els.spoiler.addEventListener('change', () => { spoilerOn = els.spoiler.checked; renderList(); renderDetail(); });
els.earnedOnly.addEventListener('change', () => { earnedOnly = els.earnedOnly.checked; renderList(); });
for (const btn of els.kinds.querySelectorAll('button')) {
  btn.classList.toggle('active', btn.dataset.kind === kindFilter);
  btn.addEventListener('click', () => {
    kindFilter = btn.dataset.kind;
    for (const b of els.kinds.querySelectorAll('button')) b.classList.toggle('active', b === btn);
    renderList();
  });
}
els.tabChecklist.addEventListener('click', () => setView('checklist'));
els.tabRoadmap.addEventListener('click', () => setView('roadmap'));

$('exportBtn').addEventListener('click', () => {
  const payload = JSON.stringify({ app: 'leonida-trophy-guide', version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    earned = new Set(ids.filter((id) => byId.has(id)));
    saveProgress();
    renderAll();
  } catch {
    els.count.textContent = 'That file is not a Leonida Trophy Guide progress export.';
  }
  ev.target.value = '';
});

/* init */
if (params.get('view') === 'guide') document.body.classList.add('compact'); // focused reading view: slimmer header
els.spoiler.checked = spoilerOn;
setView(view);
renderAll();
