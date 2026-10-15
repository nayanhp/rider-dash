import './style.css';
import { Input } from './input';
import { track } from './platform/analytics';
import { bootPortal, type Portal } from './platform/crazygames';
import { load, save } from './platform/storage';
import { Renderer } from './render/renderer';
import { CITIES, ENDLESS, LEVELS, type City, type LevelConfig } from './sim/config';
import { cityCleared, cityOf, cityStars, cityUnlocked, currentLevel, isUnlocked, nextLevel, recordStars, reloadProgress, starsFor } from './progress';
import { createRun, isEndless, meters, score, seconds, step, type InputLog, type RunState } from './sim/run';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
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
let portal: Portal;
let inGameplay = false;
let adBusy = false;
let rewardedThisBreak = false;
let coinsDoubled = false;
let celebrated = false;
let adNote = '';

function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function markGameplay(on: boolean) {
  if (on === inGameplay) return;
  inGameplay = on;
  if (on) portal.gameplayStart();
  else portal.gameplayStop();
}

function celebrate() {
  if (celebrated) return;
  celebrated = true;
  portal.happytime();
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
  rewardedThisBreak = false;
  coinsDoubled = false;
  celebrated = false;
  adNote = '';
  lastHud = '';
  last = performance.now();
  acc = 0;
  markGameplay(true);
  track({ name: 'level_start', level: cfg.id });
}

/**
 * Ads sit on breaks, never inside a run. A lose screen that offers a revive does not
 * also play a midgame ad (CrazyGames forbids combining the two). A rewarded ad that
 * already played this break suppresses the midgame too, so ads are never chained.
 */
async function betweenRuns(go: () => void, withMidgame: boolean) {
  if (withMidgame && !rewardedThisBreak) {
    if (await requestAd('midgame')) track({ name: 'ad_watched', placement: 'midgame' });
  }
  go();
}

async function requestAd(kind: 'midgame' | 'rewarded'): Promise<boolean> {
  if (adBusy) return false;
  adBusy = true;
  const wasPlaying = playing;
  playing = false;
  input.enabled = false;
  stage.classList.add('ad-hold');
  let ok = false;
  try {
    ok = (await portal.ads.request(kind)).ok;
  } finally {
    stage.classList.remove('ad-hold');
    adBusy = false;
    if (wasPlaying) {
      playing = true;
      input.enabled = true;
      last = performance.now();
      acc = 0;
    }
  }
  if (ok && kind === 'rewarded') rewardedThisBreak = true;
  return ok;
}

function resumeRevived(how: 'ad' | 'coins'): boolean {
  const cmd = how === 'coins' ? 'reviveCoins' : 'revive';
  log.push([run.tick, cmd]);
  step(run, [cmd]);
  if (run.status !== 'running') return false;
  if (run.events.length) renderer.onEvents(run, run.events);
  overlay.hidden = true;
  hud.root.hidden = false;
  input.drain();
  input.enabled = true;
  playing = true;
  rewardedThisBreak = false;
  adNote = '';
  lastHud = '';
  last = performance.now();
  acc = 0;
  markGameplay(true);
  return true;
}

function endRun() {
  playing = false;
  input.enabled = false;
  markGameplay(false);
  rewardedThisBreak = false;
  adNote = '';
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.max(1, run.hearts) : 0;
  track({ name: 'level_end', level: cfg.id, result: won ? 'won' : 'lost', stars, time: Math.round(seconds(run)) });
  const endless = isEndless(run);
  const bestBefore = endless ? load('best', 0) : 0;
  if (endless) {
    const s = score(run);
    if (s > bestBefore) {
      save('best', s);
      celebrate();
    }
    track({ name: 'endless_end', score: s });
  } else if (won) {
    recordStars(cfg.id, stars);
  }
  const next = !endless && won ? nextLevel(cfg) : undefined;
  const newCity = !!(next && next.cityId !== cfg.cityId);
  if (newCity) celebrate();
  if (run.status === 'lost' && !run.revived && portal.ads.rewardedAvailable()) {
    track({ name: 'revive_offer', level: cfg.id });
  }

  const showResult = () => {
    const offerAdRevive = run.status === 'lost' && !run.revived && !rewardedThisBreak && portal.ads.rewardedAvailable();
    const offerCoinRevive = run.status === 'lost' && !run.revived && run.coins >= run.tuning.reviveCost;
    const offerDouble = !coinsDoubled && !rewardedThisBreak && run.coins > 0 && portal.ads.rewardedAvailable() && (won || endless);
    // Revive and a midgame ad cannot share this break. Double-coins is optional;
    // taking it sets rewardedThisBreak so Next / Retry will not play a second ad.
    const withMidgame = !offerAdRevive;
    const note = adNote ? `<p class="ad-note">${adNote}</p>` : '';
    const video = offerAdRevive
      ? `<button class="btn green" data-act="revive" aria-label="Watch a video to revive with one heart">▶ Revive</button>`
      : '';
    const coins = offerCoinRevive
      ? `<button class="btn green" data-act="coins">Revive · ${run.tuning.reviveCost} 🪙</button>`
      : '';
    const doubled = offerDouble
      ? `<button class="btn green" data-act="double" aria-label="Watch a video to double the coins from this run">▶ Double coins</button>`
      : '';

    if (endless) {
      const s = score(run);
      const record = s > bestBefore || (coinsDoubled && s >= load('best', 0) && s > 0);
      screen(
        `<h2>${record ? 'New record!' : 'Ride over!'}</h2><div class="big">${s}</div>
        <p>${meters(run)} m · ${run.delivered} delivered · 🪙 ${run.coins}${coinsDoubled ? ' · doubled' : ''}</p>
        ${offerAdRevive ? '<p class="small-print">Revive is optional. Watch a short video, spend coins, or ride again.</p>' : ''}
        ${note}
        <div class="row"><button class="btn yellow" data-act="menu">☰ Menu</button>
        ${video}${coins}${doubled}
        <button class="btn green" data-act="again" autofocus>↻ Ride again</button></div>`,
        {
          menu: showMenu,
          revive: () => void onRevive(showResult),
          coins: () => {
            if (!resumeRevived('coins')) showResult();
          },
          double: () => void onDouble(showResult),
          again: () => void betweenRuns(() => startRun(cfg), withMidgame),
        },
      );
      return;
    }

    screen(
      `<p class="where">${cfg.city}</p><h2>${won ? `${cfg.name} delivered!` : 'Out of hearts!'}</h2>${starsHtml(stars, 'big-stars')}
      <p>${run.delivered}/${cfg.goal} delivered · 🪙 ${run.coins}${coinsDoubled ? ' · doubled' : ''}</p>
      ${newCity ? `<p class="unlock">🎉 ${cfg.city} complete! <b>${next?.city}</b> unlocked.</p>` : ''}
      ${offerAdRevive ? '<p class="small-print">Revive is optional. Watch a short video, spend coins, or retry.</p>' : ''}
      ${note}
      <div class="row"><button class="btn yellow" data-act="areas">☰ Areas</button>
      ${video}${coins}${doubled}
      <button class="btn green" data-act="again" ${next ? '' : 'autofocus'}>↻ Retry</button>
      ${next ? `<button class="btn green" data-act="next" autofocus>${newCity ? `${next.city} ▶` : 'Next ▶'}</button>` : ''}</div>`,
      {
        areas: () => showAreas(cityOf(cfg)),
        revive: () => void onRevive(showResult),
        coins: () => {
          if (!resumeRevived('coins')) showResult();
        },
        double: () => void onDouble(showResult),
        again: () => void betweenRuns(() => startRun(cfg), withMidgame),
        next: () => void betweenRuns(() => next && showBrief(next), withMidgame),
      },
    );
  };

  later(showResult);
}

async function onRevive(redraw: () => void) {
  const ok = await requestAd('rewarded');
  if (ok) track({ name: 'ad_watched', placement: 'revive' });
  if (ok && resumeRevived('ad')) return;
  adNote = ok
    ? 'Revive didn’t start. Retry the level.'
    : portal.ads.rewardedAvailable()
      ? 'No video right now. Retry, or try again later.'
      : 'Videos aren’t available right now. Retry to keep playing.';
  redraw();
}

async function onDouble(redraw: () => void) {
  const ok = await requestAd('rewarded');
  if (!ok) {
    adNote = portal.ads.rewardedAvailable()
      ? 'No video right now. Continue without doubling.'
      : 'Videos aren’t available right now.';
    redraw();
    return;
  }
  track({ name: 'ad_watched', placement: 'double_coins' });
  run.coins *= run.tuning.coinDoubleMultiplier;
  coinsDoubled = true;
  if (isEndless(run)) {
    const s = score(run);
    if (s > load('best', 0)) {
      save('best', s);
      celebrate();
    }
  }
  redraw();
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
    <p class="where">${cur.city} · ${cur.name}</p>
    <div class="tip">${cur.tip}</div>
    <p class="keys">Keyboard: ← → to steer, ↑ or Space to jump</p>
    <div class="col">
      <button class="btn green" data-act="play" autofocus>▶ Play · ${cur.name}</button>
      <button class="btn blue" data-act="cities">🗺 Cities</button>
      <button class="btn red" data-act="endless">♾ Endless · best ${load('best', 0)}</button>
    </div>`,
    { play: () => startRun(cur), cities: showCities, endless: () => startRun(ENDLESS) },
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
new ResizeObserver(() => resize()).observe(stage);
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  acc = 0;
});
// No outbound navigation. CrazyGames hosts the game; links would leave the iframe.
document.addEventListener('click', (e) => {
  const el = e.target;
  if (el instanceof Element && el.closest('a')) e.preventDefault();
});

// Exposed for debugging and future replay checks.
Object.assign(window, { rd: { get run() { return run; }, get log() { return log; } } });

async function boot() {
  portal = await bootPortal();
  reloadProgress();
  portal.loadingStop();
  resize();
  track({ name: 'session_start' });
  showMenu();
  requestAnimationFrame(frame);
}

boot();
