import './style.css';
import { avatarChoice, colorsFor, optionFor, reloadAvatar, setAvatarPart, AVATAR_OPTIONS, PARTS, type AvatarChoice, type AvatarOption, type AvatarPart } from './avatar';
import { BOOSTS, MAX_UPGRADE, UPGRADES, boostCost, buyLook, buyUpgrade, claimCityRewards, modsForRun, nextUpgradePrice, ownsLook, reloadShop, shopOpen, shopOpensAt, upgradeLevel, type BoostId } from './shop';
import { attachDebug } from './debug';
import { hintFor } from './hint';
import { Input } from './input';
import { nextHold, type Hold } from './pause';
import { track } from './platform/analytics';
import { loadUserMute, muteControl, play, toggleUserMute, unlock, type Sfx } from './platform/audio';
import { bootPortal, type Portal } from './platform/crazygames';
import { COIN_PACKS, noPayments, packTotal, testPayments, wantsTestPayments, type CoinPack, type PaymentService } from './platform/payments';
import { load, save } from './platform/storage';
import { loadSprites } from './render/art';
import { Renderer } from './render/renderer';
import { POWER_ICONS } from './render/art';
import { poseUrl, prepareAvatar, prepareRival } from './render/riderArt';
import playUrl from './sprites/ui-play.svg';
import retryUrl from './sprites/ui-retry.svg';
import menuUrl from './sprites/ui-menu.svg';
import mapUrl from './sprites/ui-map.svg';
import endlessUrl from './sprites/ui-endless.svg';
import backUrl from './sprites/ui-back.svg';
import pauseUrl from './sprites/ui-pause.svg';
import rainUrl from './sprites/badge-rain.svg';
import nightUrl from './sprites/badge-night.svg';
import unlockUrl from './sprites/badge-city-unlock.svg';
import { CITIES, ENDLESS, LEVELS, type City, type LevelConfig, type PowerKind, type TimedPower } from './sim/config';
import { RunPayout, addCoins, reloadWallet, walletCoins } from './wallet';
import { cityCleared, cityOf, cityStars, cityUnlocked, currentLevel, isUnlocked, nextLevel, recordStars, reloadProgress, starsFor } from './progress';
import { beatBest, carryCap, createRun, powerTicks, isEndless, meters, reviveStillOpen, score, seconds, step, type InputLog, type RunState, type SimEvent } from './sim/run';
import logoUrl from './assets/logo.png';
import parcelUrl from './sprites/parcel.svg';
import hudCoinUrl from './sprites/hud-coin.svg';
import heartFullUrl from './sprites/hud-heart-full.svg';
import heartEmptyUrl from './sprites/hud-heart-empty.svg';
import slotFullUrl from './sprites/hud-slot-full.svg';
import slotEmptyUrl from './sprites/hud-slot-empty.svg';
import flagUrl from './sprites/hud-flag.svg';
import soundOnUrl from './sprites/hud-sound-on.svg';
import soundOffUrl from './sprites/hud-sound-off.svg';
import starFullUrl from './sprites/star-full.svg';
import starEmptyUrl from './sprites/star-empty.svg';
import lockUrl from './sprites/lock.svg';
import cityBengaluru from './sprites/city-bengaluru.svg';
import cityMumbai from './sprites/city-mumbai.svg';
import cityDelhi from './sprites/city-delhi.svg';
import cityHyderabad from './sprites/city-hyderabad.svg';
import cityChennai from './sprites/city-chennai.svg';
import cityPune from './sprites/city-pune.svg';
import cityKolkata from './sprites/city-kolkata.svg';
import cityAhmedabad from './sprites/city-ahmedabad.svg';

const CITY_ICON: Record<string, string> = {
  bengaluru: cityBengaluru,
  mumbai: cityMumbai,
  delhi: cityDelhi,
  hyderabad: cityHyderabad,
  chennai: cityChennai,
  pune: cityPune,
  kolkata: cityKolkata,
  ahmedabad: cityAhmedabad,
};

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
const pauseEl = document.querySelector<HTMLDivElement>('#pause')!;
const resumeBtn = document.querySelector<HTMLButtonElement>('#resume')!;
const restartBtn = document.querySelector<HTMLButtonElement>('#restart')!;
const leaveBtn = document.querySelector<HTMLButtonElement>('#pause-leave')!;
const pauseWhere = document.querySelector<HTMLElement>('#pause-where')!;
const pauseNote = document.querySelector<HTMLElement>('#pause-note')!;
const pauseActions = document.querySelector<HTMLElement>('#pause-actions')!;
const countEl = document.querySelector<HTMLElement>('#count')!;
const hintEl = document.querySelector<HTMLParagraphElement>('#hint')!;
const comboEl = document.querySelector<HTMLElement>('#combo')!;
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!;
const muteIcon = document.querySelector<HTMLImageElement>('#mute-icon')!;
muteIcon.src = soundOnUrl;
const hudPause = document.querySelector<HTMLButtonElement>('#hud-pause')!;
const hud = {
  root: document.querySelector<HTMLDivElement>('#hud')!,
  left: document.querySelector<HTMLSpanElement>('#hud-left')!,
  mid: document.querySelector<HTMLSpanElement>('#hud-mid')!,
  right: document.querySelector<HTMLSpanElement>('#hud-right')!,
  slots: document.querySelector<HTMLDivElement>('#hud-slots')!,
  powers: document.querySelector<HTMLDivElement>('#hud-powers')!,
};

const renderer = new Renderer(canvas);
const input = new Input(canvas, () => renderer.riderX(run));

let run: RunState = createRun(LEVELS[0], 1);
let log: InputLog = [];
let playing = false;
let runLive = false;
let hold: Hold = 'play';
let blurred = false;
let manualPause = false;
let portal: Portal;
let inGameplay = false;
let adBusy = false;
let rewardedThisBreak = false;
/** Coins this run has paid into the wallet, and whether its ad bonus was taken. */
let payout = new RunPayout();
let celebrated = false;
let resultTracked = false;
let adNote = '';
let countGen = 0;
let countTimer: ReturnType<typeof setTimeout> | null = null;
let prevCoins = -1;
let prevDelivered = -1;
let prevHearts = -1;

const ico = (src: string, cls = 'ico') => `<img class="${cls}" src="${src}" alt="">`;
resumeBtn.innerHTML = `${ico(playUrl)} Resume`;
restartBtn.innerHTML = `${ico(retryUrl)} Restart`;
hudPause.innerHTML = ico(pauseUrl);

function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function pageAway(): boolean {
  return document.hidden || blurred;
}

function cancelCount() {
  countGen++;
  if (countTimer) clearTimeout(countTimer);
  countTimer = null;
  countEl.hidden = true;
  countEl.textContent = '';
  pauseActions.hidden = false;
}

/** 3-2-1 before the road moves again, so a resume is never a surprise. */
function beginCountdown() {
  if (pageAway() || adBusy || !runLive || hold !== 'hidden' || countTimer) return;
  pauseActions.hidden = true;
  countEl.hidden = false;
  const gen = ++countGen;
  const digits = ['3', '2', '1'];
  let i = 0;
  const show = () => {
    if (gen !== countGen) return;
    if (pageAway()) {
      cancelCount();
      return;
    }
    if (i >= digits.length) {
      countTimer = null;
      countEl.hidden = true;
      pauseActions.hidden = false;
      applyHold(true);
      return;
    }
    countEl.textContent = digits[i];
    countEl.classList.remove('tick');
    void countEl.offsetWidth;
    countEl.classList.add('tick');
    i++;
    countTimer = setTimeout(show, 600);
  };
  show();
}

function fillPause() {
  if (isEndless(run)) {
    pauseWhere.textContent = 'Endless';
    leaveBtn.innerHTML = `${ico(menuUrl)} Menu`;
  } else {
    pauseWhere.textContent = `${run.cfg.city ?? ''} · ${run.cfg.name}`.replace(/^ · /, '');
    leaveBtn.innerHTML = `${ico(menuUrl)} Areas`;
  }
  pauseNote.textContent = pageAway() && !manualPause
    ? 'You switched away, so the road is frozen until you resume.'
    : 'The road is frozen until you resume.';
}

let applyingHold = false;
/** Pause the sim. A blur or the pause button latches until Resume. */
function applyHold(resume = false) {
  if (applyingHold) return;
  applyingHold = true;
  try {
    if (resume) manualPause = false;
    // The pause button uses the same latch as leaving the tab.
    hold = nextHold(hold, { runLive, ad: adBusy, pageAway: pageAway() || manualPause, resume });
    const simulate = runLive && hold === 'play';
    if (!simulate) {
      playing = false;
      input.enabled = false;
      input.drain();
    } else {
      const wasPaused = !playing;
      if (wasPaused) {
        last = performance.now();
        acc = 0;
      }
      playing = true;
      input.drain();
      // A brake held when the run paused is not still held now.
      if (wasPaused) input.releaseBrake();
      if (resume) {
        input.enabled = false;
        requestAnimationFrame(() => {
          if (playing && hold === 'play') input.enabled = true;
        });
      } else {
        input.enabled = true;
      }
    }
    const showPause = hold === 'hidden';
    if (showPause && pauseEl.hidden) fillPause();
    pauseEl.hidden = !showPause;
    if (!showPause) cancelCount();
    else resumeBtn.focus({ preventScroll: true });
    if (showPause) comboEl.hidden = true;
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

function resetHudMotion() {
  prevCoins = -1;
  prevDelivered = -1;
  prevHearts = -1;
  lastHud = '';
  hud.left.classList.remove('flash');
  hud.right.classList.remove('pop');
  hud.root.classList.remove('shake');
  comboEl.hidden = true;
}

/** Start a run. Upgrades always apply; boosts are paid for here and dropped if unaffordable. */
function startRun(cfg: LevelConfig, boosts: readonly BoostId[] = []) {
  cancelCount();
  manualPause = false;
  run = createRun(cfg, newSeed(), { mods: modsForRun(boosts) });
  log = [];
  renderer.reset(run);
  overlay.hidden = true;
  hud.root.hidden = false;
  input.drain();
  runLive = true;
  rewardedThisBreak = false;
  payout = new RunPayout();
  celebrated = false;
  resultTracked = false;
  adNote = '';
  resetHudMotion();
  // Fill the HUD now, so it is never blank if the run pauses before its first frame.
  updateHud();
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
  resetHudMotion();
  // Fill the HUD now, so it is never blank if the run pauses before its first frame.
  updateHud();
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
    recordStars(run.cfg.id, Math.min(3, Math.max(1, run.hearts)));
  }
}

/** Fired once, when the player leaves the result. A revive is the same run, not an end. */
function trackResult() {
  if (resultTracked) return;
  resultTracked = true;
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.min(3, Math.max(1, run.hearts)) : 0;
  track({ name: 'level_end', level: cfg.id, result: won ? 'won' : 'lost', stars, time: Math.round(seconds(run)) });
  if (isEndless(run)) track({ name: 'endless_end', score: score(run) });
}

/** Leave a paused run without stars. An endless best is kept. */
function abandonRun() {
  cancelCount();
  manualPause = false;
  const cfg = run.cfg;
  const endless = isEndless(run);
  const s = score(run);
  if (endless && beatBest(s, load('best', 0))) {
    save('best', s);
    celebrate();
  }
  payout.settle(run.coins);
  track({ name: 'level_end', level: cfg.id, result: 'quit', stars: 0, time: Math.round(seconds(run)) });
  if (endless) track({ name: 'endless_end', score: s });
  runLive = false;
  playing = false;
  input.enabled = false;
  resultTracked = true;
  markGameplay(false);
  applyHold();
  if (endless) showMenu();
  else showAreas(cityOf(cfg));
}

function endRun() {
  cancelCount();
  manualPause = false;
  runLive = false;
  applyHold();
  markGameplay(false);
  rewardedThisBreak = false;
  adNote = '';
  const cfg = run.cfg;
  const won = run.status === 'won';
  const stars = won ? Math.min(3, Math.max(1, run.hearts)) : 0;
  const endless = isEndless(run);
  const bestBefore = endless ? load('best', 0) : 0;
  persistProgress();
  payout.settle(run.coins);
  const next = !endless && won ? nextLevel(cfg) : undefined;
  const newCity = !!(next && next.cityId !== cfg.cityId);
  // Clearing a city's last area also gives that city's free look.
  const cityDone = won && !endless && cityOf(cfg).levels.at(-1)?.id === cfg.id;
  const rewards = cityDone && cfg.cityId ? claimCityRewards(cfg.cityId) : [];
  if (newCity || rewards.length) celebrate();
  if (run.status === 'lost' && !run.revived && portal.ads.rewardedAvailable()) {
    track({ name: 'revive_offer', level: cfg.id });
  }

  const showResult = () => {
    const offerAdRevive = run.status === 'lost' && !run.revived && !rewardedThisBreak && portal.ads.rewardedAvailable();
    const offerCoinRevive = reviveStillOpen(run, false);
    const offerDouble = !payout.doubled && !rewardedThisBreak && run.coins > 0 && portal.ads.rewardedAvailable() && (won || endless);
    // Revive and a midgame ad cannot share this break. Double-coins is optional;
    // taking it sets rewardedThisBreak so Next / Retry will not play a second ad.
    const withMidgame = !offerAdRevive;
    const note = adNote ? `<p class="ad-note">${adNote}</p>` : '';
    const video = offerAdRevive
      ? `<button class="btn blue" data-act="revive" aria-label="Watch a video to revive with one heart">${ico(playUrl)} Revive</button>`
      : '';
    const coins = offerCoinRevive
      ? `<button class="btn yellow" data-act="coins">Revive · ${run.tuning.reviveCost} ${ico(hudCoinUrl)}</button>`
      : '';
    const doubled = offerDouble
      ? `<button class="btn yellow" data-act="double" aria-label="Watch a video to double the coins from this run">${ico(playUrl)} Double coins</button>`
      : '';
    const leave = (go: () => void) => {
      trackResult();
      go();
    };
    const extras = [video, doubled].filter(Boolean).join('');
    const above = extras ? `<div class="stack">${extras}</div>` : '';

    if (endless) {
      const s = score(run);
      const record = beatBest(s, bestBefore);
      screen(
        `<h2 class="${record ? 'ribbon' : ''}">${record ? 'New record!' : 'Ride over!'}</h2>
        <div class="big">${s}</div>
        <div class="stats">
          <span class="chip">${ico(flagUrl)} ${meters(run)} m</span>
          <span class="chip">${ico(parcelUrl)} ${run.delivered}</span>
          <span class="chip">${ico(hudCoinUrl)} <b id="coin-count">0</b>${payout.doubled ? ' ×2' : ''}</span>
        </div>
        ${offerAdRevive ? '<p class="small-print">Revive is optional. Watch a short video, spend coins, or ride again.</p>' : ''}
        ${note}
        ${above}
        <div class="row"><button class="btn yellow" data-act="menu">${ico(menuUrl)} Menu</button>
        ${coins}
        <button class="btn green" data-act="again" autofocus>${ico(retryUrl)} Ride again</button></div>`,
        {
          menu: () => leave(showMenu),
          revive: () => void onRevive(showResult),
          coins: () => {
            if (!resumeRevived('coins')) showResult();
          },
          double: () => void onDouble(showResult),
          again: () => leave(() => void betweenRuns(() => startRun(cfg), withMidgame)),
        },
        false,
        true,
      );
      finishResult(run.coins + payout.bonus, record);
      return;
    }

    screen(
      `<p class="where">${cfg.city}</p><h2 class="${won ? 'win' : 'lose'}">${won ? `${cfg.name} delivered!` : 'Out of hearts!'}</h2>${starsHtml(stars, 'big-stars')}
      <div class="stats">
        <span class="chip">${ico(parcelUrl)} ${run.delivered}/${cfg.goal}</span>
        <span class="chip">${ico(hudCoinUrl)} <b id="coin-count">0</b>${payout.doubled ? ' ×2' : ''}</span>
        <span class="chip">${Math.round(seconds(run))}s</span>
      </div>
      ${newCity ? `<p class="unlock">${ico(unlockUrl, 'unlock-ico')}<span>${cfg.city} complete! <b>${next?.city}</b> unlocked.</span></p>` : ''}
      ${rewards.map(({ option }) => `<p class="unlock"><span class="swatch-dot" style="background:${option.color}"></span><span>New look: <b>${option.name}</b>. Wear it from Rider.</span></p>`).join('')}
      ${offerAdRevive ? '<p class="small-print">Revive is optional. Watch a short video, spend coins, or retry.</p>' : ''}
      ${note}
      ${above}
      <div class="row"><button class="btn yellow" data-act="areas">${ico(menuUrl)} Areas</button>
      ${coins}
      <button class="btn green" data-act="again" ${next ? '' : 'autofocus'}>${ico(retryUrl)} Retry</button>
      ${next ? `<button class="btn green" data-act="next" autofocus>${ico(playUrl)} ${newCity ? next.city : 'Next'}</button>` : ''}</div>`,
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
      false,
      true,
    );
    finishResult(run.coins + payout.bonus, false);
  };

  later(showResult);
}

function finishResult(coins: number, record: boolean) {
  const panel = overlay.querySelector<HTMLElement>('.panel');
  const coinEl = overlay.querySelector<HTMLElement>('#coin-count');
  if (coinEl) countUp(coinEl, coins);
  if (record && panel) confetti(panel);
}

function countUp(el: HTMLElement, to: number) {
  if (renderer.reduceMotion || to <= 0) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const tick = (now: number) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (now - t0) / 600);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = String(Math.round(to * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function confetti(panel: HTMLElement) {
  if (renderer.reduceMotion) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  const colors = ['#FFCC2E', '#FF5A4E', '#5DD039', '#2F8CFF', '#FFFAF0', '#D99A00', '#4FB3F6'];
  for (let i = 0; i < 20; i++) {
    const bit = document.createElement('i');
    bit.style.left = `${(i * 17) % 100}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDelay = `${(i % 5) * 40}ms`;
    box.appendChild(bit);
  }
  panel.prepend(box);
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
  // The bonus goes to the saved wallet. The run's coins and the endless score stay as earned.
  payout.double(run.coins, run.tuning.coinDoubleMultiplier);
  redraw();
}

/** Let the last frame (the crash or the final drop) register before a panel covers it. */
const later = (fn: () => void) => setTimeout(fn, 600);

const starsHtml = (n: number, cls = 'stars') => {
  const stars = [0, 1, 2].map((i) => ico(i < n ? starFullUrl : starEmptyUrl, 'star')).join('');
  return `<span class="${cls}" aria-label="${n} of 3 stars">${stars}</span>`;
};

/** Show a panel; buttons with data-act call the matching handler. */
function screen(html: string, acts: Record<string, () => void>, wide = false, rise = false) {
  overlay.innerHTML = `<div class="panel${wide ? ' wide' : ''}${rise ? ' rise' : ''}">${html}</div>`;
  overlay.hidden = false;
  hud.root.hidden = true;
  hintEl.hidden = true;
  comboEl.hidden = true;
  overlay.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    const fn = acts[b.dataset.act!];
    if (fn) b.onclick = fn;
  });
  // Focus without scrolling, so tall panels (shop, rider) open at the top.
  overlay.querySelector<HTMLElement>('[autofocus]')?.focus({ preventScroll: true });
  overlay.scrollTop = 0;
  const panel = overlay.querySelector<HTMLElement>('.panel');
  if (panel) panel.scrollTop = 0;
}

/** Show a level's road behind the menus. */
function backdrop(cfg: LevelConfig) {
  run = createRun(cfg, 1);
  renderer.reset(run);
}

function markSeen() {
  if (!load('seenHow', false)) save('seenHow', true);
}

function showMenu() {
  const cur = currentLevel();
  const first = !load('seenHow', false);
  backdrop(cur);
  screen(
    `<img class="logo" src="${logoUrl}" alt="Rider Dash" width="600" height="406">
    <p class="tag">Deliver parcels across India, one neighbourhood at a time.</p>
    <button class="chip wallet coin-chip" data-act="coins" aria-label="${walletCoins()} coins saved. Get more">${ico(hudCoinUrl)} ${walletCoins()} <b>+</b></button>
    ${first ? `<ul class="how">
      <li><b>Swipe</b> or <b>tap</b> left and right to change lanes</li>
      <li><b>Swipe up</b> to jump potholes and speed breakers</li>
      <li>Grab parcels, then ride through a green <b>DROP</b> zone</li>
    </ul>
    <p class="keys">Keyboard: ← → to steer, ↑ or Space to jump</p>` : ''}
    <p class="where">${cur.city} · ${cur.name}</p>
    <div class="tip">${cur.tip}</div>
    <div class="col">
      <button class="btn green" data-act="play" autofocus>${ico(playUrl)} Play · ${cur.name}</button>
      <button class="btn red" data-act="endless">${ico(endlessUrl)} Endless · best ${load('best', 0)}</button>
      <div class="pair">
        <button class="btn blue" data-act="cities">${ico(mapUrl)} Cities</button>
        <button class="btn yellow" data-act="rider">Rider</button>
        <button class="btn yellow" data-act="shop">${shopOpen(starsFor) ? '' : ico(lockUrl, 'lock')} Shop</button>
      </div>
    </div>`,
    {
      play: () => {
        markSeen();
        // Once boosts exist, go through the briefing so they can be picked.
        if (shopOpen(starsFor)) showBrief(cur);
        else startRun(cur);
      },
      cities: () => {
        markSeen();
        showCities();
      },
      endless: () => {
        markSeen();
        startRun(ENDLESS);
      },
      rider: () => {
        markSeen();
        showRider();
      },
      shop: () => {
        markSeen();
        showShop();
      },
      coins: () => showCoins(showMenu),
    },
  );
}

const pips = (n: number, max: number) =>
  `<span class="pips" aria-label="Level ${n} of ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

/** Upgrades to buy, what boosts cost, and a way to the rider looks. Coins only come from riding. */
function showShop() {
  backdrop(currentLevel());
  const open = shopOpen(starsFor);
  const wallet = `<span class="chip">${ico(hudCoinUrl)} ${walletCoins()}</span>`;
  if (!open) {
    screen(
      `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Menu">${ico(backUrl)}</button><h2>Shop</h2><span></span></div>
      <p class="tip">The shop opens once you clear <b>${shopOpensAt().name}</b> in ${shopOpensAt().city}. Coins you collect until then are saved.</p>
      <p>${wallet}</p>
      <div class="col"><button class="btn green" data-act="back" autofocus>OK</button></div>`,
      { back: showMenu },
    );
    return;
  }
  const rows = UPGRADES.map((u) => {
    const level = upgradeLevel(u.power);
    const price = nextUpgradePrice(u.power);
    const button = price === null
      ? '<span class="maxed">Max</span>'
      : `<button class="btn small green" data-act="up-${u.power}" ${price > walletCoins() ? 'disabled' : ''}>${price} ${ico(hudCoinUrl)}</button>`;
    return `<div class="shop-row"><img src="${POWER_ICONS[u.power]}" alt=""><span class="shop-text"><b>${u.name}</b><small>${u.desc}</small>${pips(level, MAX_UPGRADE)}</span>${button}</div>`;
  }).join('');
  const boosts = BOOSTS.map((b) => `<div class="shop-row"><img src="${POWER_ICONS[b.id]}" alt=""><span class="shop-text"><b>${b.name}</b><small>${b.desc}</small></span><span class="price">${b.price} ${ico(hudCoinUrl)}</span></div>`).join('');
  const acts: Record<string, () => void> = { back: showMenu, rider: () => showRider(showShop), coins: () => showCoins(showShop) };
  for (const u of UPGRADES) acts[`up-${u.power}`] = () => {
    if (buyUpgrade(u.power)) play('parcel');
    showShop();
  };
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Menu">${ico(backUrl)}</button><h2>Shop</h2><button class="chip coin-chip" data-act="coins" aria-label="${walletCoins()} coins. Get more">${ico(hudCoinUrl)} ${walletCoins()} <b>+</b></button></div>
    <h3 class="shop-head">Upgrades</h3>
    <p class="small-print">Each level makes the power-up last 20% longer.</p>
    <div class="shop-list">${rows}</div>
    <h3 class="shop-head">Boosts</h3>
    <p class="small-print">Pick them on a ride's briefing. Paid when you ride, used up that run.</p>
    <div class="shop-list">${boosts}</div>
    <div class="col"><button class="btn blue" data-act="rider">Rider looks</button><button class="btn green" data-act="back" autofocus>Done</button></div>`,
    acts,
    true,
  );
}

const PART_LABEL: Record<AvatarPart, string> = { jacket: 'Jacket', helmet: 'Helmet', box: 'Box', skin: 'Skin' };
let riderTab: AvatarPart = 'jacket';

/** The rider wearing `choice`, from the front (or the back, where the box shows). */
const lookUrl = (choice: AvatarChoice, pose: 'front' | 'back') => poseUrl(pose, colorsFor(choice));

function lookStatus(part: AvatarPart, o: AvatarOption, wearing: boolean): string {
  if (wearing) return '<span class="look-state on">Wearing</span>';
  if (ownsLook(part, o)) return '<span class="look-state">Owned</span>';
  if (o.reward) return `<span class="look-state">${ico(lockUrl, 'mini-lock')} ${CITIES.find((c) => c.id === o.reward)?.name ?? 'City'}</span>`;
  return `<span class="look-price">${ico(hudCoinUrl)} ${o.price}</span>`;
}

/**
 * Pick a look. Every card shows your rider wearing it. Tapping any look tries it on in the big
 * preview; owned looks are worn at once, others offer a purchase (or name the city that gives it).
 */
function showRider(back: () => void = showMenu) {
  backdrop(currentLevel());
  let trying: AvatarChoice = { ...avatarChoice() };
  const worn = avatarChoice();
  const cards = AVATAR_OPTIONS[riderTab].map((o) => {
    const preview = lookUrl({ ...worn, [riderTab]: o.id }, riderTab === 'box' ? 'back' : 'front');
    const wearing = worn[riderTab] === o.id;
    return `<button type="button" class="look-card${o.premium ? ' premium' : ''}${ownsLook(riderTab, o) ? '' : ' locked'}" data-look="${o.id}" aria-pressed="${wearing}" aria-label="${o.name}${o.premium ? ', premium' : ''}">
      ${o.premium ? '<span class="premium-tag">Premium</span>' : ''}
      <img src="${preview}" alt="" width="72" height="90">
      <span class="look-name">${o.name}</span>${lookStatus(riderTab, o, wearing)}
    </button>`;
  }).join('');
  const tabs = PARTS.map((p) => `<button type="button" class="tab" data-tab="${p}" aria-pressed="${p === riderTab}" ${p === riderTab ? 'autofocus' : ''}>${PART_LABEL[p]}</button>`).join('');
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Back">${ico(backUrl)}</button><h2>Your rider</h2><button class="chip coin-chip" data-act="coins" aria-label="${walletCoins()} coins. Get more">${ico(hudCoinUrl)} ${walletCoins()} <b>+</b></button></div>
    <div class="rider-stage"><img class="rp" data-pose="front" alt="Your rider, from the front"><img class="rp" data-pose="back" alt="Your rider, from behind"></div>
    <p class="try-name" aria-live="polite"></p>
    <div class="tabs" role="tablist">${tabs}</div>
    <div class="look-grid">${cards}</div>
    <div class="offer" hidden></div>
    <div class="col"><button class="btn green" data-act="back">Done</button></div>`,
    { back: () => { void prepareAvatar(colorsFor(avatarChoice())); back(); }, coins: () => showCoins(() => showRider(back)) },
    true,
  );
  const stage = (choice: AvatarChoice, label: string) => {
    overlay.querySelectorAll<HTMLImageElement>('.rp').forEach((img) => (img.src = lookUrl(choice, img.dataset.pose as 'front' | 'back')));
    const name = overlay.querySelector<HTMLElement>('.try-name');
    if (name) name.innerHTML = label;
  };
  const opt = (id: string) => AVATAR_OPTIONS[riderTab].find((o) => o.id === id)!;
  stage(trying, optionFor(riderTab, worn[riderTab]).name);
  overlay.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => (b.onclick = () => {
    riderTab = b.dataset.tab as AvatarPart;
    showRider(back);
  }));
  overlay.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((b) => (b.onclick = () => {
    const o = opt(b.dataset.look!);
    trying = { ...avatarChoice(), [riderTab]: o.id };
    stage(trying, `${o.name}${o.premium ? ' <span class="premium-tag inline">Premium</span>' : ''}`);
    const offer = overlay.querySelector<HTMLElement>('.offer')!;
    if (ownsLook(riderTab, o)) {
      offer.hidden = true;
      setAvatarPart(riderTab, o.id);
      void prepareAvatar(colorsFor(avatarChoice()));
      overlay.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((x) => {
        const on = x.dataset.look === o.id;
        x.setAttribute('aria-pressed', String(on));
        const state = x.querySelector('.look-state, .look-price');
        if (state && ownsLook(riderTab, opt(x.dataset.look!))) state.outerHTML = lookStatus(riderTab, opt(x.dataset.look!), on);
      });
      return;
    }
    offer.hidden = false;
    if (o.reward) {
      const city = CITIES.find((c) => c.id === o.reward)?.name ?? 'a city';
      offer.innerHTML = `<span>Trying on <b>${o.name}</b>. Clear ${city} to unlock it free.</span>`;
      return;
    }
    const short = (o.price ?? 0) > walletCoins();
    offer.innerHTML = `<span>Trying on <b>${o.name}</b></span>
      <button class="btn small ${o.premium ? 'gold' : 'green'}" data-buy ${short ? 'hidden' : ''}>Buy · ${o.price} ${ico(hudCoinUrl)}</button>
      ${short ? `<button class="btn small gold" data-get>Get coins</button><small>You have ${walletCoins()} of ${o.price}</small>` : ''}`;
    offer.querySelector<HTMLButtonElement>('[data-buy]')?.addEventListener('click', () => {
      if (!buyLook(riderTab, o)) return;
      play('parcel');
      setAvatarPart(riderTab, o.id);
      void prepareAvatar(colorsFor(avatarChoice()));
      showRider(back);
    });
    offer.querySelector<HTMLButtonElement>('[data-get]')?.addEventListener('click', () => showCoins(() => showRider(back)));
  }));
}

/** In test mode, the player confirms each fake purchase. Resolves true to go ahead. */
function confirmTestPurchase(pack: CoinPack): Promise<boolean> {
  return new Promise((resolve) => {
    screen(
      `<h2>Test purchase</h2>
      <p>Add <b>${packTotal(pack).toLocaleString('en-IN')}</b> coins (${pack.name}, ${pack.price})?</p>
      <p class="test-note">Test mode: no money is charged.</p>
      <div class="row"><button class="btn yellow" data-act="no">Cancel</button><button class="btn green" data-act="yes" autofocus>Confirm</button></div>`,
      { no: () => resolve(false), yes: () => resolve(true) },
    );
  });
}

let payments: PaymentService = noPayments();
const fmt = (n: number) => n.toLocaleString('en-IN');

/** Buy coins with real money. Coins bought here spend like earned coins. */
function showCoins(back: () => void = showMenu, note = '') {
  backdrop(currentLevel());
  const live = payments.available();
  const cards = COIN_PACKS.map((p, i) => `<div class="pack${p.tag ? ' tagged' : ''}">
      ${p.tag ? `<span class="pack-tag">${p.tag}</span>` : ''}
      <div class="pack-coins" aria-hidden="true">${Array.from({ length: i + 1 }, () => ico(hudCoinUrl, 'stack-coin')).join('')}</div>
      <b class="pack-amount">${fmt(p.coins)}</b>
      ${p.bonus ? `<span class="pack-bonus">+${fmt(p.bonus)} bonus</span>` : '<span class="pack-bonus none">&nbsp;</span>'}
      <button class="btn small gold" data-pack="${p.id}" ${live ? '' : 'disabled'}>${live ? payments.priceLabel(p) : 'Soon'}</button>
    </div>`).join('');
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Back">${ico(backUrl)}</button><h2>Get coins</h2><span class="chip">${ico(hudCoinUrl)} ${fmt(walletCoins())}</span></div>
    ${payments.mode === 'test' ? '<p class="test-note">Test mode: purchases are free and only for trying the store.</p>' : ''}
    ${live ? '' : '<p class="tip">Coin packs are coming soon. Until then, every coin comes from riding.</p>'}
    ${note ? `<p class="unlock"><span>${note}</span></p>` : ''}
    <div class="pack-grid">${cards}</div>
    <p class="small-print">Coins spend on upgrades, boosts and rider looks.</p>
    <div class="col"><button class="btn green" data-act="back" autofocus>Done</button></div>`,
    { back },
    true,
  );
  overlay.querySelectorAll<HTMLButtonElement>('[data-pack]').forEach((b) => (b.onclick = async () => {
    const pack = COIN_PACKS.find((p) => p.id === b.dataset.pack)!;
    const result = await payments.buy(pack);
    if (!result.ok) return showCoins(back, result.code === 'cancelled' ? '' : 'The purchase did not go through. No coins were charged.');
    addCoins(packTotal(pack));
    track({ name: 'coin_purchase', pack: pack.id, coins: packTotal(pack), mode: payments.mode });
    play('clear');
    showCoins(back, `+${fmt(packTotal(pack))} coins added.`);
  }));
}

function showCities() {
  const cards = CITIES.map((c, i) => {
    const open = cityUnlocked(c);
    const done = cityCleared(c);
    const icon = open ? ico(CITY_ICON[c.id] ?? lockUrl) : ico(lockUrl, 'lock');
    return `<button class="city" data-act="c${i}" ${open ? '' : 'disabled'}>
      <span class="city-emoji">${icon}</span>
      <span class="city-text"><b>${c.name}</b><small>${open ? c.tagline : `Clear every area in ${CITIES[i - 1]?.name} to unlock`}</small></span>
      <span class="city-prog">${done}/${c.levels.length}<small>${ico(starFullUrl, 'star')} ${cityStars(c)}</small></span>
    </button>`;
  }).join('');
  const acts: Record<string, () => void> = { back: showMenu };
  CITIES.forEach((c, i) => (acts[`c${i}`] = () => showAreas(c)));
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="Back">${ico(backUrl)}</button><h2>Cities</h2><span></span></div>
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
    const badge = [l.rain ? ico(rainUrl, 'badge-ico') : '', l.night ? ico(nightUrl, 'badge-ico') : ''].join('');
    return `<button class="area${l.id === cur.id ? ' current' : ''}${s ? ' done' : ''}" data-act="a${i}" ${open ? '' : 'disabled'}
      aria-label="${i + 1}. ${l.name}${open ? `, ${s} stars` : ', locked'}">
      <span class="area-num">${open ? i + 1 : ico(lockUrl)}</span>
      <span class="area-name">${l.name}</span>
      <span class="area-meta">${open ? starsHtml(s) : ''}${badge ? `<span class="badge">${badge}</span>` : ''}</span>
    </button>`;
  }).join('');
  const acts: Record<string, () => void> = { back: showCities };
  city.levels.forEach((l, i) => (acts[`a${i}`] = () => showBrief(l)));
  const mark = CITY_ICON[city.id];
  screen(
    `<div class="bar"><button class="btn small yellow" data-act="back" aria-label="All cities">${ico(backUrl)}</button>
      <h2>${mark ? `<img class="city-mark" src="${mark}" alt="">` : ''}${city.name}</h2><span class="bar-prog">${cityCleared(city)}/${city.levels.length}</span></div>
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
  const badges = [l.rain && `${ico(rainUrl, 'badge-ico')} Rain`, l.night && `${ico(nightUrl, 'badge-ico')} Night`].filter(Boolean)
    .map((b) => `<span class="badge">${b}</span>`).join('');
  screen(
    `<p class="where">${l.city} · Area ${n}</p><h2>${l.name}</h2>
    <p class="goal">Deliver <b>${l.goal}</b> parcels</p>
    ${badges ? `<p class="badges">${badges}</p>` : ''}
    <div class="tip">${l.tip}</div>
    ${boostPicker()}
    <p class="small-print">Lose all your hearts and the run ends. Finish with more hearts for more stars.</p>
    <div class="row"><button class="btn yellow" data-act="back">${ico(backUrl)} Areas</button>
    <button class="btn green" data-act="go" autofocus>${ico(playUrl)} Ride</button></div>`,
    { back: () => showAreas(cityOf(l)), go: () => startRun(l, [...picked]) },
  );
  wireBoosts();
}

/** Boosts chosen on the current briefing. Cleared each time a briefing opens. */
let picked = new Set<BoostId>();

function boostPicker(): string {
  picked = new Set();
  if (!shopOpen(starsFor)) return '';
  const chips = BOOSTS.map((b) =>
    `<button type="button" class="boost" data-boost="${b.id}" aria-pressed="false" ${b.price > walletCoins() ? 'disabled' : ''}>
      <img src="${POWER_ICONS[b.id]}" alt=""><span>${b.name}</span><small>${b.price} ${ico(hudCoinUrl)}</small></button>`).join('');
  return `<div class="boosts"><p class="small-print">Boosts for this ride · you have ${walletCoins()} ${ico(hudCoinUrl)}</p><div class="boost-row">${chips}</div></div>`;
}

function wireBoosts() {
  overlay.querySelectorAll<HTMLButtonElement>('[data-boost]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.boost as BoostId;
      if (picked.has(id)) picked.delete(id);
      else picked.add(id);
      // Only allow a pick the wallet can still cover.
      if (boostCost([...picked]) > walletCoins()) picked.delete(id);
      overlay.querySelectorAll<HTMLButtonElement>('[data-boost]').forEach((x) => {
        const on = picked.has(x.dataset.boost as BoostId);
        x.setAttribute('aria-pressed', String(on));
        const price = BOOSTS.find((bb) => bb.id === x.dataset.boost)!.price;
        x.disabled = !on && boostCost([...picked]) + price > walletCoins();
      });
    };
  });
}

let lastHud = '';
const POWER_LABEL: Record<PowerKind, string> = {
  magnet: 'Magnet', net: 'Parcel net', helmet: 'Helmet', nitro: 'Nitro', double: '2× coins', heart: 'Extra heart',
};
let lastPowerIds = '';
/** Active power-ups as chips with a draining bar. The helmet has no timer: it waits for a hit. */
function updatePowers() {
  const active: Array<[PowerKind, number]> = [];
  for (const [k, left] of Object.entries(run.powers) as Array<[TimedPower, number]>) {
    active.push([k, left / powerTicks(run, k)]);
  }
  if (run.shield) active.push(['helmet', 1]);
  const ids = active.map(([k]) => k).join(',');
  if (ids !== lastPowerIds) {
    lastPowerIds = ids;
    hud.powers.innerHTML = active
      .map(([k]) => `<span class="power" data-power="${k}" aria-label="${POWER_LABEL[k]}"><img src="${POWER_ICONS[k]}" alt=""><i><b></b></i></span>`)
      .join('');
  }
  for (const [k, frac] of active) {
    const bar = hud.powers.querySelector<HTMLElement>(`[data-power="${k}"] b`);
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
  }
}

function updateHud() {
  updatePowers();
  const endless = isEndless(run);
  const leftText = endless ? `${meters(run)} m` : `${run.delivered}/${run.cfg.goal}`;
  const hearts = Math.max(0, run.hearts);
  const total = run.maxHearts;
  const coins = run.coins;
  const carry = run.carry;
  const key = `${leftText}|${hearts}|${coins}|${carry}|${endless ? 1 : 0}`;
  if (key === lastHud) return;
  const coinPop = prevCoins >= 0 && coins > prevCoins;
  const deliveredPop = prevDelivered >= 0 && run.delivered > prevDelivered;
  const heartLost = prevHearts >= 0 && hearts < prevHearts;
  prevCoins = coins;
  prevDelivered = run.delivered;
  prevHearts = hearts;
  lastHud = key;

  hud.left.innerHTML = `${ico(endless ? flagUrl : parcelUrl)} ${leftText}`;
  if (deliveredPop) replayClass(hud.left, 'flash');
  let heartsHtml = '';
  for (let i = 0; i < total; i++) {
    const full = i < hearts;
    const lost = heartLost && i === hearts;
    heartsHtml += `<img class="heart${lost ? ' lost' : ''}" src="${full ? heartFullUrl : heartEmptyUrl}" alt="">`;
  }
  hud.mid.innerHTML = heartsHtml;
  hud.mid.setAttribute('aria-label', `${hearts} of ${total} hearts`);
  hud.right.innerHTML = `${ico(hudCoinUrl)} ${coins}`;
  if (coinPop) replayClass(hud.right, 'pop');
  if (heartLost && !renderer.reduceMotion) replayClass(hud.root, 'shake');
  // One slot per parcel the rider may hold now: never more than the goal still needs.
  const slots = Math.max(carry, carryCap(run));
  hud.slots.innerHTML = Array.from({ length: slots }, (_, i) => ico(i < carry ? slotFullUrl : slotEmptyUrl, 'slot')).join('');
}

function replayClass(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function showCombo(n: number) {
  comboEl.hidden = false;
  comboEl.textContent = `×${Math.min(3, n)}`;
  replayClass(comboEl, 'show');
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
  muteIcon.src = control.muted ? soundOffUrl : soundOnUrl;
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
  bump: 'hit',
  splash: 'hit',
  stolen: 'hit',
  tip: 'coin',
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
        for (const e of run.events) {
          if (e.type === 'hit') track({ name: 'hit', level: run.cfg.id, kind: e.kind });
          if (e.type === 'deliver' && e.combo > 1) showCombo(e.combo);
        }
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
document.addEventListener('visibilitychange', () => {
  if (pageAway()) cancelCount();
  applyHold();
});
window.addEventListener('blur', () => {
  blurred = true;
  cancelCount();
  applyHold();
});
window.addEventListener('focus', () => {
  blurred = false;
  applyHold();
});
resumeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  beginCountdown();
});
restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const cfg = run.cfg;
  cancelCount();
  manualPause = false;
  startRun(cfg);
});
leaveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  abandonRun();
});
hudPause.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!runLive || adBusy || hold !== 'play') return;
  manualPause = true;
  applyHold();
});
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (muteBtn.disabled) return;
  toggleUserMute();
  unlock();
  renderMute();
});
window.addEventListener('pointerdown', () => unlock(), { passive: true });
window.addEventListener('keydown', (e) => {
  unlock();
  if (e.repeat) return;
  if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
  if (!runLive || adBusy || hold === 'ad' || countTimer) return;
  e.preventDefault();
  if (hold === 'play') {
    manualPause = true;
    applyHold();
  } else if (hold === 'hidden' && !pageAway()) {
    beginCountdown();
  }
});
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
  reloadWallet();
  reloadShop();
  payments = wantsTestPayments(location) ? testPayments(confirmTestPurchase) : noPayments();
  reloadAvatar();
  const fonts = document.fonts;
  await Promise.race([
    Promise.all([
      loadSprites(),
      prepareAvatar(colorsFor(avatarChoice())),
      prepareRival(),
      fonts?.load('16px "Lilita One"'),
      fonts?.load('700 16px "Baloo 2"'),
    ]).catch((err) => console.error(err)),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  loadUserMute();
  renderMute();
  portal.loadingStop();
  resize();
  track({ name: 'session_start' });
  showMenu();
  requestAnimationFrame(frame);
}

boot();
