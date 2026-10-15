import './style.css';
import { attachDebug } from './debug';
import { hintFor } from './hint';
import { Input } from './input';
import { nextHold, type Hold } from './pause';
import { track } from './platform/analytics';
import { loadUserMute, muteControl, play, toggleUserMute, unlock, type Sfx } from './platform/audio';
import { bootPortal, type Portal } from './platform/crazygames';
import { load, save } from './platform/storage';
import { Renderer } from './render/renderer';
import { CITIES, ENDLESS, LEVELS, type City, type LevelConfig } from './sim/config';
import { cityCleared, cityOf, cityStars, cityUnlocked, currentLevel, isUnlocked, nextLevel, recordStars, reloadProgress, starsFor } from './progress';
import { beatBest, createRun, isEndless, meters, reviveStillOpen, score, seconds, step, type InputLog, type RunState, type SimEvent } from './sim/run';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
const pauseEl = document.querySelector<HTMLDivElement>('#pause')!;
const resumeBtn = document.querySelector<HTMLButtonElement>('#resume')!;
const hintEl = document.querySelector<HTMLParagraphElement>('#hint')!;
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!;
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
let runLive = false;
let hold: Hold = 'play';
let blurred = false;
let portal: Portal;
let inGameplay = false;
let adBusy = false;
let rewardedThisBreak = false;
let coinsDoubled = false;
let celebrated = false;
let resultTracked = false;
let adNote = '';

function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function pageAway(): boolean {
  return document.hidden || blurred;
}

let applyingHold = false;
/** Pause the sim. A blur latches until Resume, so the road cannot tick before they look. */
function applyHold(resume = false) {
  if (applyingHold) return;
  applyingHold = true;
  try {
    hold = nextHold(hold, { runLive, ad: adBusy, pageAway: pageAway(), resume });
    const simulate = runLive && hold === 'play';
    if (!simulate) {
      playing = false;
      input.enabled = false;
      input.drain();
    } else {
      if (!playing) {
        last = performance.now();
        acc = 0;
      }
      playing = true;
      input.drain();
      if (resume) {
        input.enabled = false;
        requestAnimationFrame(() => {
          if (playing && hold === 'play') input.enabled = true;
        });
      } else {
        input.enabled = true;
      }
    }
    pauseEl.hidden = hold !== 'hidden';
    if (hold === 'hidden') resumeBtn.focus({ preventScroll: true });
    updateHint();
    renderMute();
  } finally {
    applyingHold = false;
  }
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
  runLive = true;
  rewardedThisBreak = false;
  coinsDoubled = false;
  celebrated = false;
  resultTracked = false;
  adNote = '';
  lastHud = '';
  last = performance.now();
  acc = 0;
  applyHold();
  markGameplay(true);
  track({ name: 'level_start', level: cfg.id });
  updateHint();
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
  input.enabled = false;
  stage.classList.add('ad-hold');
  overlay.inert = true;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  applyHold();
  let ok = false;
  try {
    ok = (await portal.ads.request(kind)).ok;
  } finally {
    stage.classList.remove('ad-hold');
    overlay.inert = false;
    adBusy = false;
    applyHold();
  }
  if (ok && kind === 'rewarded') rewardedThisBreak = true;
  return ok;
}

function resumeRevived(how: 'ad' | 'coins'): boolean {
  const cmd = how === 'coins' ? 'reviveCoins' : 'revive';
  log.push([run.tick, cmd]);
  step(run, [cmd]);
  if (run.status !== 'running') return false;
  if (run.events.length) {
    renderer.onEvents(run, run.events);
    voice(run.events);
  }
  overlay.hidden = true;
  hud.root.hidden = false;
  input.drain();
  runLive = true;
  rewardedThisBreak = false;
  adNote = '';
  lastHud = '';
  last = performance.now();
  acc = 0;
  applyHold();
  markGameplay(true);
  return true;
}

function persistProgress() {
  if (isEndless(run)) {
    const s = score(run);
    if (beatBest(s, load('best', 0))) {
      save('best', s);
      celebrate();
    }
  } else if (run.status === 'won') {
    recordStars(run.cfg.id, Math.max(1, run.hearts));
  }
}

/** Fired once, when the player leaves the result. A revive is the same run, not an end. */
function trackResult() {
  if (resultTracked) return;
  resultTracked = true;
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.max(1, run.hearts) : 0;
  track({ name: 'level_end', level: cfg.id, result: won ? 'won' : 'lost', stars, time: Math.round(seconds(run)) });
  if (isEndless(run)) track({ name: 'endless_end', score: score(run) });
}

function endRun() {
  runLive = false;
  applyHold();
  markGameplay(false);
  rewardedThisBreak = false;
  adNote = '';
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.max(1, run.hearts) : 0;
  const endless = isEndless(run);
  const bestBefore = endless ? load('best', 0) : 0;
  persistProgress();
  const next = !endless && won ? nextLevel(cfg) : undefined;
  const newCity = !!(next && next.cityId !== cfg.cityId);
  if (newCity) celebrate();
  if (run.status === 'lost' && !run.revived && portal.ads.rewardedAvailable()) {
    track({ name: 'revive_offer', level: cfg.id });
  }

  const showResult = () => {
    const offerAdRevive = run.status === 'lost' && !run.revived && !rewardedThisBreak && portal.ads.rewardedAvailable();
    const offerCoinRevive = reviveStillOpen(run, false);
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
    const leave = (go: () => void) => {
      trackResult();
      go();
    };

    if (endless) {
      const s = score(run);
      const record = beatBest(s, bestBefore);
      screen(
        `<h2>${record ? 'New record!' : 'Ride over!'}</h2><div class="big">${s}</div>
        <p>${meters(run)} m · ${run.delivered} delivered · 🪙 ${run.coins}${coinsDoubled ? ' · doubled' : ''}</p>
        ${offerAdRevive ? '<p class="small-print">Revive is optional. Watch a short video, spend coins, or ride again.</p>' : ''}
        ${note}
        <div class="row"><button class="btn yellow" data-act="menu">☰ Menu</button>
        ${video}${coins}${doubled}
        <button class="btn green" data-act="again" autofocus>↻ Ride again</button></div>`,
        {
          menu: () => leave(showMenu),
          revive: () => void onRevive(showResult),
          coins: () => {
            if (!resumeRevived('coins')) showResult();
          },
          double: () => void onDouble(showResult),
          again: () => leave(() => void betweenRuns(() => startRun(cfg), withMidgame)),
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
        areas: () => leave(() => showAreas(cityOf(cfg))),
        revive: () => void onRevive(showResult),
        coins: () => {
          if (!resumeRevived('coins')) showResult();
        },
        double: () => void onDouble(showResult),
        again: () => leave(() => void betweenRuns(() => startRun(cfg), withMidgame)),
        next: () => leave(() => void betweenRuns(() => next && showBrief(next), withMidgame)),
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
  run.coins = Math.floor(run.coins * run.tuning.coinDoubleMultiplier);
  coinsDoubled = true;
  persistProgress();
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
  hintEl.hidden = true;
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

function updateHint() {
  const text = playing
    ? hintFor({
        firstLevel: run.cfg.id === LEVELS[0].id,
        fresh: starsFor(LEVELS[0].id) === 0,
        lane: run.lane,
        carry: run.carry,
        delivered: run.delivered,
      })
    : null;
  if (!text || hold !== 'play') {
    hintEl.hidden = true;
    return;
  }
  hintEl.hidden = false;
  if (hintEl.textContent !== text) hintEl.textContent = text;
}

function renderMute() {
  const control = muteControl();
  muteBtn.textContent = control.muted ? '🔇' : '🔊';
  muteBtn.disabled = control.locked || adBusy;
  muteBtn.setAttribute('aria-pressed', control.muted ? 'true' : 'false');
  muteBtn.setAttribute('aria-label', control.locked ? 'Sound is muted by the site' : control.muted ? 'Unmute sound' : 'Mute sound');
}

const SFX: Partial<Record<SimEvent['type'], Sfx>> = {
  jump: 'jump',
  coin: 'coin',
  parcel: 'parcel',
  deliver: 'drop',
  hit: 'hit',
  won: 'clear',
};

function voice(events: readonly SimEvent[]) {
  const won = events.some((e) => e.type === 'won');
  for (const e of events) {
    if (e.type === 'deliver' && won) continue;
    const name = SFX[e.type];
    if (name) play(name);
  }
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
        voice(run.events);
        for (const e of run.events) if (e.type === 'hit') track({ name: 'hit', level: run.cfg.id, kind: e.kind });
      }
      if (run.status !== 'running') endRun();
    }
    if (ticks === 6) acc = 0;
    updateHud();
    updateHint();
  }
  const frozen = hold === 'hidden' || (hold === 'ad' && runLive);
  renderer.render(run, frozen ? 0 : dt);
  requestAnimationFrame(frame);
}

function resize() {
  renderer.resize();
}
window.addEventListener('resize', resize);
new ResizeObserver(() => resize()).observe(stage);
// Tab away freezes a live run. CrazyGames already pauses its own metrics on blur,
// so this does not send gameplayStop.
document.addEventListener('visibilitychange', () => applyHold());
window.addEventListener('blur', () => {
  blurred = true;
  applyHold();
});
window.addEventListener('focus', () => {
  blurred = false;
  applyHold();
});
pauseEl.addEventListener('click', () => applyHold(true));
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (muteBtn.disabled) return;
  toggleUserMute();
  unlock();
  renderMute();
});
window.addEventListener('pointerdown', () => unlock(), { passive: true });
window.addEventListener('keydown', () => unlock());
// No outbound navigation. CrazyGames hosts the game; links would leave the iframe.
document.addEventListener('click', (e) => {
  const el = e.target;
  if (el instanceof Element && el.closest('a')) e.preventDefault();
});

if (import.meta.env.DEV) {
  attachDebug(true, window, {
    get run() {
      return run;
    },
    get log() {
      return log;
    },
  });
}

async function boot() {
  portal = await bootPortal();
  reloadProgress();
  loadUserMute();
  renderMute();
  portal.loadingStop();
  resize();
  track({ name: 'session_start' });
  showMenu();
  requestAnimationFrame(frame);
}

boot();
