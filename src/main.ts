import './style.css';
import { Input } from './input';
import { track } from './platform/analytics';
import { load, save } from './platform/storage';
import { Renderer } from './render/renderer';
import { CITIES, ENDLESS, LEVELS, type City, type LevelConfig } from './sim/config';
import { cityCleared, cityOf, cityStars, cityUnlocked, currentLevel, isUnlocked, nextLevel, recordStars, starsFor } from './progress';
import { createRun, isEndless, meters, score, seconds, step, type InputLog, type RunState } from './sim/run';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const hud = {
  root: document.querySelector<HTMLDivElement>('#hud')!,
  left: document.querySelector<HTMLSpanElement>('#hud-left')!,
  mid: document.querySelector<HTMLSpanElement>('#hud-mid')!,
  right: document.querySelector<HTMLSpanElement>('#hud-right')!,
};

const renderer = new Renderer(canvas);
const input = new Input(canvas, () => renderer.riderX(run));

let run: RunState = createRun(LEVELS[0], 1);
let log: InputLog = [];
let playing = false;

function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function startRun(cfg: LevelConfig) {
  run = createRun(cfg, newSeed());
  log = [];
  renderer.reset(run);
  overlay.hidden = true;
  hud.root.hidden = false;
  input.drain();
  input.enabled = true;
  playing = true;
  track({ name: 'level_start', level: cfg.id });
}

function endRun() {
  playing = false;
  input.enabled = false;
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.max(1, run.hearts) : 0;
  track({ name: 'level_end', level: cfg.id, result: won ? 'won' : 'lost', stars, time: Math.round(seconds(run)) });
  if (isEndless(run)) {
    const s = score(run);
    const best = load('best', 0);
    if (s > best) save('best', s);
    track({ name: 'endless_end', score: s });
    later(() =>
      screen(
        `<h2>${s > best ? 'New record!' : 'Ride over!'}</h2><div class="big">${s}</div>
        <p>${meters(run)} m · ${run.delivered} delivered · 🪙 ${run.coins}</p>
        <div class="row"><button class="btn yellow" data-act="menu">☰ Menu</button>
        <button class="btn green" data-act="again" autofocus>↻ Ride again</button></div>`,
        { menu: showMenu, again: () => startRun(cfg) },
      ),
    );
    return;
  }
  if (won) recordStars(cfg.id, stars);
  const next = won ? nextLevel(cfg) : undefined;
  const newCity = next && next.cityId !== cfg.cityId;
  later(() =>
    screen(
      `<p class="where">${cfg.city}</p><h2>${won ? `${cfg.name} delivered!` : 'Out of hearts!'}</h2>${starsHtml(stars, 'big-stars')}
      <p>${run.delivered}/${cfg.goal} delivered · 🪙 ${run.coins}</p>
      ${newCity ? `<p class="unlock">🎉 ${cfg.city} complete! <b>${next.city}</b> unlocked.</p>` : ''}
      <div class="row"><button class="btn yellow" data-act="areas">☰ Areas</button>
      <button class="btn blue" data-act="again" ${next ? '' : 'autofocus'}>↻ Retry</button>
      ${next ? `<button class="btn green" data-act="next" autofocus>${newCity ? `${next.city} ▶` : 'Next ▶'}</button>` : ''}</div>`,
      { areas: () => showAreas(cityOf(cfg)), again: () => startRun(cfg), next: () => next && showBrief(next) },
    ),
  );
}

/** Let the last frame (the crash or the final drop) register before a panel covers it. */
const later = (fn: () => void) => setTimeout(fn, 600);

const starsHtml = (n: number, cls = 'stars') =>
  `<span class="${cls}" aria-label="${n} of 3 stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;

/** Show a panel; buttons with data-act call the matching handler. */
function screen(html: string, acts: Record<string, () => void>, wide = false) {
  overlay.innerHTML = `<div class="panel${wide ? ' wide' : ''}">${html}</div>`;
  overlay.hidden = false;
  hud.root.hidden = true;
  overlay.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    const fn = acts[b.dataset.act!];
    if (fn) b.onclick = fn;
  });
  overlay.querySelector<HTMLElement>('[autofocus]')?.focus();
  overlay.scrollTop = 0;
}

/** Show a level's road behind the menus. */
function backdrop(cfg: LevelConfig) {
  run = createRun(cfg, 1);
  renderer.reset(run);
}

function showMenu() {
  const cur = currentLevel();
  backdrop(cur);
  screen(
    `<h1>Rider Dash</h1>
    <p class="tag">Deliver parcels across India, one neighbourhood at a time.</p>
    <ul class="how">
      <li><b>Swipe</b> or <b>tap</b> left/right to change lanes</li>
      <li><b>Swipe up</b> to jump potholes and speed breakers</li>
      <li>Grab 📦 parcels, ride through green <b>DROP</b> zones</li>
    </ul>
    <p class="keys">Keyboard: ← → to steer, ↑ or Space to jump</p>
    <div class="col">
      <button class="btn green" data-act="play" autofocus>▶ Play · ${cur.name}</button>
      <button class="btn blue" data-act="cities">🗺 Cities</button>
      <button class="btn red" data-act="endless">♾ Endless · best ${load('best', 0)}</button>
    </div>`,
    { play: () => showAreas(cityOf(cur)), cities: showCities, endless: () => startRun(ENDLESS) },
  );
}

function showCities() {
  const cards = CITIES.map((c, i) => {
    const open = cityUnlocked(c);
    const done = cityCleared(c);
    return `<button class="city" data-act="c${i}" ${open ? '' : 'disabled'}>
      <span class="city-emoji">${open ? c.emoji : '🔒'}</span>
      <span class="city-text"><b>${c.name}</b><small>${open ? c.tagline : `Clear every area in ${CITIES[i - 1]?.name} to unlock`}</small></span>
      <span class="city-prog">${done}/${c.levels.length}<small>★ ${cityStars(c)}</small></span>
    </button>`;
  }).join('');
  const acts: Record<string, () => void> = { back: showMenu };
  CITIES.forEach((c, i) => (acts[`c${i}`] = () => showAreas(c)));
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Back">◀</button><h2>Cities</h2><span></span></div>
    <div class="cities">${cards}</div>`,
    acts,
    true,
  );
}

function showAreas(city: City) {
  backdrop(city.levels[0]);
  const cur = currentLevel();
  const tiles = city.levels.map((l, i) => {
    const open = isUnlocked(l);
    const s = starsFor(l.id);
    const badge = l.rain ? '🌧️' : l.night ? '🌙' : '';
    return `<button class="area${l.id === cur.id ? ' current' : ''}${s ? ' done' : ''}" data-act="a${i}" ${open ? '' : 'disabled'}
      aria-label="${i + 1}. ${l.name}${open ? `, ${s} stars` : ', locked'}">
      <span class="area-num">${open ? i + 1 : '🔒'}</span>
      <span class="area-name">${l.name}</span>
      <span class="area-meta">${open ? starsHtml(s) : ''}${badge ? `<span class="badge">${badge}</span>` : ''}</span>
    </button>`;
  }).join('');
  const acts: Record<string, () => void> = { back: showCities };
  city.levels.forEach((l, i) => (acts[`a${i}`] = () => showBrief(l)));
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="All cities">◀</button>
      <h2>${city.emoji} ${city.name}</h2><span class="bar-prog">${cityCleared(city)}/${city.levels.length}</span></div>
    <p class="tag">${city.tagline}</p>
    <div class="areas">${tiles}</div>`,
    acts,
    true,
  );
  overlay.querySelector('.area.current')?.scrollIntoView({ block: 'center' });
}

function showBrief(l: LevelConfig) {
  backdrop(l);
  const n = cityOf(l).levels.indexOf(l) + 1;
  const badges = [l.rain && '🌧️ Rain', l.night && '🌙 Night'].filter(Boolean).join(' · ');
  screen(
    `<p class="where">${l.city} · Area ${n}</p><h2>${l.name}</h2>
    <p class="goal">Deliver <b>${l.goal}</b> parcels</p>
    ${badges ? `<p class="badges">${badges}</p>` : ''}
    <div class="tip">${l.tip}</div>
    <p class="small-print">Lose all 3 hearts and the run ends. Finish with more hearts for more stars.</p>
    <div class="row"><button class="btn yellow" data-act="back">◀ Areas</button>
    <button class="btn green" data-act="go" autofocus>▶ Ride</button></div>`,
    { back: () => showAreas(cityOf(l)), go: () => startRun(l) },
  );
}

let lastHud = '';
function updateHud() {
  const left = isEndless(run) ? `🏁 ${meters(run)} m` : `📦 ${run.delivered}/${run.cfg.goal}`;
  const mid = '❤️'.repeat(Math.max(0, run.hearts)) + '🤍'.repeat(Math.max(0, run.tuning.hearts - run.hearts));
  const right = `🪙 ${run.coins}`;
  const key = left + mid + right;
  if (key === lastHud) return;
  lastHud = key;
  hud.left.textContent = left;
  hud.mid.textContent = mid;
  hud.right.textContent = right;
}

// Fixed-tick simulation, rendered every animation frame.
let last = performance.now();
let acc = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    const tickDt = 1 / run.tuning.tickRate;
    acc += dt;
    let ticks = 0;
    while (acc >= tickDt && ticks < 6 && playing) {
      acc -= tickDt;
      ticks++;
      const cmds = input.drain();
      for (const c of cmds) log.push([run.tick, c]);
      step(run, cmds);
      if (run.events.length) {
        renderer.onEvents(run, run.events);
        for (const e of run.events) if (e.type === 'hit') track({ name: 'hit', level: run.cfg.id, kind: e.kind });
      }
      if (run.status !== 'running') endRun();
    }
    if (ticks === 6) acc = 0;
    updateHud();
  }
  renderer.render(run, dt);
  requestAnimationFrame(frame);
}

function resize() {
  renderer.resize();
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  acc = 0;
});

resize();
track({ name: 'session_start' });
showMenu();
requestAnimationFrame(frame);

// Exposed for debugging and future replay checks.
Object.assign(window, { rd: { get run() { return run; }, get log() { return log; } } });
