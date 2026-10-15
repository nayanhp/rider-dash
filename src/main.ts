import './style.css';
import { Input } from './input';
import { track } from './platform/analytics';
import { load, save } from './platform/storage';
import { Renderer } from './render/renderer';
import { ENDLESS, LEVELS, type LevelConfig } from './sim/config';
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
  const won = run.status === 'won';
  const stars = won ? Math.max(1, run.hearts) : 0;
  const time = Math.round(seconds(run));
  track({ name: 'level_end', level: run.cfg.id, result: won ? 'won' : 'lost', stars, time });
  if (isEndless(run)) {
    const s = score(run);
    const best = load('best', 0);
    if (s > best) save('best', s);
    track({ name: 'endless_end', score: s });
    showResult(s > best ? 'New record!' : 'Ride over!', `<div class="big">${s}</div>
      <p>${meters(run)} m · ${run.delivered} delivered · 🪙 ${run.coins}</p>`);
  } else {
    showResult(won ? 'Delivered!' : 'Out of hearts!', `<div class="stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
      <p>${run.delivered}/${run.cfg.goal} delivered · 🪙 ${run.coins}</p>`);
  }
}

function showResult(title: string, body: string) {
  // Let the last frame (the crash or the final drop) register before the panel covers it.
  setTimeout(() => {
    overlay.innerHTML = `<div class="panel"><h2>${title}</h2>${body}
      <div class="row"><button class="btn yellow" data-act="menu">☰ Menu</button>
      <button class="btn green" data-act="again">↻ Ride again</button></div></div>`;
    overlay.hidden = false;
    hud.root.hidden = true;
    const cfg = run.cfg;
    overlay.querySelector<HTMLButtonElement>('[data-act=again]')!.onclick = () => startRun(cfg);
    overlay.querySelector<HTMLButtonElement>('[data-act=menu]')!.onclick = showMenu;
    overlay.querySelector<HTMLButtonElement>('[data-act=again]')!.focus();
  }, 600);
}

function showMenu() {
  const L1 = LEVELS[0];
  overlay.innerHTML = `<div class="panel">
    <h1>Rider Dash</h1>
    <p class="tag">Deliver parcels across Bengaluru. Dodge autos, cows and potholes.</p>
    <ul class="how">
      <li><b>Swipe</b> or <b>tap</b> left/right to change lanes</li>
      <li><b>Swipe up</b> to jump potholes and speed breakers</li>
      <li>Grab 📦 parcels, ride through green <b>DROP</b> zones</li>
    </ul>
    <p class="keys">Keyboard: ← → to steer, ↑ or Space to jump</p>
    <div class="row">
      <button class="btn green" data-act="level">▶ ${L1.name}</button>
      <button class="btn red" data-act="endless">♾ Endless · best ${load('best', 0)}</button>
    </div></div>`;
  overlay.hidden = false;
  hud.root.hidden = true;
  overlay.querySelector<HTMLButtonElement>('[data-act=level]')!.onclick = () => startRun(L1);
  overlay.querySelector<HTMLButtonElement>('[data-act=endless]')!.onclick = () => startRun(ENDLESS);
  overlay.querySelector<HTMLButtonElement>('[data-act=level]')!.focus();
  // Show the road behind the menu.
  run = createRun(L1, 1);
  renderer.reset(run);
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
