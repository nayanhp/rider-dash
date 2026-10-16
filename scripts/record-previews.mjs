#!/usr/bin/env node
// Record the two CrazyGames preview videos from a production build.
//
//   npm run build   # the script does this itself
//   npm run record:previews
//
// Playwright drives headless Chromium. Frames are grabbed with the page clock
// stepped one sim tick at a time, then ffmpeg packs them at 30fps. Nothing is
// sped up: a cut is a cut, and each clip plays at the game's own speed.
// The first frames are the in-game title art (the repo has no cover files).
// Videos land in preview-out/ and, when it exists, /opt/cursor/artifacts/.
// This does not upload to CrazyGames.
//
// Needs ffmpeg on PATH, and Chromium for Playwright:
//   npx playwright install chromium

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'preview-out');
const FPS = 30;
const TICKS_PER_FRAME = 2; // 60Hz sim, 30fps picture, so one frame is two ticks of real time
const ARTIFACTS = '/opt/cursor/artifacts';

// Shot lengths in frames. Sum is 17.5s, inside the 15–20s window.
const FRAMES = {
  cover: 12, // 0.40s — the poster frame, not an animated logo
  menu: 45, // 1.50s
  lane: 66, // 2.20s
  jump: 66, // 2.20s
  parcel: 60, // 2.00s
  drop: 66, // 2.20s
  city: 60, // 2.00s
  cop: 90, // 3.00s
  result: 60, // 2.00s
};

const ORIENTATIONS = [
  { name: 'landscape', width: 1920, height: 1080, file: 'preview-landscape.mp4' },
  { name: 'portrait', width: 720, height: 1080, file: 'preview-portrait.mp4' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webp': 'image/webp',
};

function die(message) {
  console.error(message);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) die(`${cmd} ${args.join(' ')} failed (${result.status})`);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

/** Load the sim and the balance bot without editing source. `decide` stays private in the game. */
async function loadSim() {
  const server = await createVite({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
    plugins: [
      {
        name: 'expose-bot-decide',
        transform(code, id) {
          if (id.replaceAll('\\', '/').endsWith('/src/sim/bot.ts')) {
            return code.replace('function decide(', 'export function decide(');
          }
          return undefined;
        },
      },
    ],
  });
  try {
    const bot = await server.ssrLoadModule('/src/sim/bot.ts');
    const sim = await server.ssrLoadModule('/src/sim/run.ts');
    const config = await server.ssrLoadModule('/src/sim/config.ts');
    if (typeof bot.decide !== 'function') die('Could not read the rider bot from src/sim/bot.ts');
    return { bot, sim, config };
  } finally {
    await server.close();
  }
}

function levelNamed(levels, city, name) {
  const level = levels.find((l) => l.city === city && l.name === name);
  if (!level) die(`Missing level ${city} / ${name}`);
  return level;
}

/**
 * Ride with the balance bot. Commands are stored on the tick they are applied,
 * which is the same tick the game records.
 */
function trace(api, cfg, seed, maxTicks, steer) {
  const { createRun, step } = api.sim;
  const { decide, REACTION_TICKS } = api.bot;
  const s = createRun(cfg, seed);
  const queue = [];
  const commands = [];
  const events = [];
  const jumps = [];
  const laneChanges = [];
  let botOn = true;
  while (s.status === 'running' && s.tick < maxTicks) {
    let cmd = null;
    const useBot = !steer || s.tick < steer.from || steer.useBot?.(s);
    if (useBot) {
      if (!botOn) {
        queue.length = 0;
        botOn = true;
      }
      queue.push(decide(s, queue));
      cmd = queue.length > REACTION_TICKS ? queue.shift() : null;
    } else {
      botOn = false;
      cmd = steer.pick(s);
    }
    if (cmd === 'jump') {
      const lane = Math.round(s.lx);
      const ahead = s.objs
        .filter((o) => !o.done && (o.kind === 'hole' || o.kind === 'bump') && o.lane === lane && o.z + (o.len ?? 0) >= s.dist - 30)
        .sort((a, b) => a.z - b.z);
      jumps.push({ tick: s.tick, kind: ahead[0]?.kind ?? 'none' });
    }
    if (cmd === 'left' || cmd === 'right') {
      const next = cmd === 'left' ? Math.max(0, s.lane - 1) : Math.min(2, s.lane + 1);
      if (next !== s.lane) laneChanges.push({ tick: s.tick, cmd, from: s.lane, to: next });
    }
    if (cmd) commands.push({ tick: s.tick, cmd });
    step(s, cmd ? [cmd] : []);
    for (const e of s.events) {
      const mark = { tick: s.tick, type: e.type, phase: e.phase, kind: e.kind };
      if (e.type === 'cop' && e.phase === 'warn') {
        const cop = s.objs.find((o) => o.kind === 'cop' && o.move && (o.move.phase === 'warn' || o.move.phase === 'move'));
        mark.copTo = cop?.move?.to;
      }
      events.push(mark);
    }
  }
  return {
    status: s.status,
    hearts: s.hearts,
    ticks: s.tick,
    delivered: s.delivered,
    coins: s.coins,
    carry: s.carry,
    lane: s.lane,
    commands,
    events,
    jumps,
    laneChanges,
  };
}

/** Replay commands and return the HUD fields the page should be showing. */
function stateAt(api, cfg, seed, commands, ticks) {
  const { createRun, step } = api.sim;
  const s = createRun(cfg, seed);
  const byTick = new Map();
  for (const c of commands) byTick.set(c.tick, c.cmd);
  while (s.status === 'running' && s.tick < ticks) {
    const cmd = byTick.get(s.tick) ?? null;
    step(s, cmd ? [cmd] : []);
  }
  return {
    tick: s.tick,
    status: s.status,
    delivered: s.delivered,
    goal: s.cfg.goal,
    coins: s.coins,
    carry: s.carry,
    hearts: s.hearts,
    lane: s.lane,
  };
}

function awayFrom(copTo) {
  if (copTo === 0) return 1;
  if (copTo === 2) return 1;
  return 0;
}

/**
 * The balance bot leaves the cop's lane before the whistle is on screen.
 * This ride stays in that lane until he whistles, then switches, so the
 * preview shows the whistle and the dodge together. Seeds that crash or
 * take the fine are rejected.
 */
function scriptCop(api, cfg) {
  for (let seed = 1; seed <= 240; seed++) {
    const scout = trace(api, cfg, seed, 60 * 30);
    const warn = scout.events.find((e) => e.type === 'cop' && e.phase === 'warn' && e.copTo !== undefined);
    if (!warn) continue;
    const warnTick = warn.tick;
    const copTo = warn.copTo;
    const away = awayFrom(copTo);
    const steered = trace(api, cfg, seed, warnTick + 180, {
      from: Math.max(0, warnTick - 28),
      pick(s) {
        const goal = s.tick < warnTick + 4 ? copTo : away;
        if (s.lane !== goal) return s.lane < goal ? 'right' : 'left';
        return null;
      },
    });
    const windowEnd = warnTick + 160;
    const stopped = steered.events.some((e) => e.type === 'cop' && e.phase === 'stop' && e.tick <= windowEnd);
    const hit = steered.events.some((e) => e.type === 'hit' && e.tick >= warnTick - 40 && e.tick <= windowEnd);
    const dodged = steered.laneChanges.some((c) => c.tick >= warnTick && c.tick <= warnTick + 20 && c.from === copTo);
    if (stopped || hit || !dodged) continue;
    if (steered.status === 'lost' && steered.ticks < windowEnd) continue;
    const start = alignEven(Math.max(0, warnTick - 40));
    return {
      seed,
      commands: steered.commands,
      warnTick,
      copTo,
      away,
      start,
      ticks: start + FRAMES.cop * TICKS_PER_FRAME,
    };
  }
  return null;
}

function alignEven(tick) {
  return tick - (tick % TICKS_PER_FRAME);
}

function windowAround(center, frames, leadFrames) {
  const lead = leadFrames * TICKS_PER_FRAME;
  const start = alignEven(Math.max(0, center - lead));
  return { start, ticks: start + frames * TICKS_PER_FRAME };
}

function planShots(api) {
  const levels = api.config.LEVELS;
  const kora = levelNamed(levels, 'Bengaluru', 'Koramangala');
  const hsr = levelNamed(levels, 'Bengaluru', 'HSR Layout');
  const jp = levelNamed(levels, 'Bengaluru', 'JP Nagar');
  const bandra = levelNamed(levels, 'Mumbai', 'Bandra');

  // One early swipe, then the bot takes over. The swipe has to be clear of the
  // pickup and the drop so the edit can show each one once, at full speed.
  const swipeAt = 36;
  let opening = null;
  for (let seed = 1; seed <= 80 && !opening; seed++) {
    const ride = trace(api, kora, seed, 60 * 90, {
      from: swipeAt,
      useBot: (s) => s.tick !== swipeAt,
      pick: (s) => (s.lane > 0 ? 'left' : 'right'),
    });
    if (ride.status !== 'won' || ride.hearts < 1) continue;
    const lane = ride.laneChanges.find((c) => c.tick === swipeAt);
    const parcel = ride.events.find((e) => e.type === 'parcel');
    const drop = ride.events.find((e) => e.type === 'deliver');
    if (!lane || !parcel || !drop) continue;
    if (ride.events.some((e) => e.type === 'hit' && e.tick <= swipeAt + 90)) continue;
    const laneWin = windowAround(lane.tick, FRAMES.lane, 12);
    const parcelWin = windowAround(parcel.tick, FRAMES.parcel, 20);
    const dropWin = windowAround(drop.tick, FRAMES.drop, 28);
    const separated = parcelWin.start >= laneWin.ticks && dropWin.start >= parcelWin.ticks;
    const contains = (win, tick) => tick >= win.start && tick < win.ticks;
    if (!separated || !contains(laneWin, lane.tick) || !contains(parcelWin, parcel.tick) || !contains(dropWin, drop.tick)) continue;
    if (dropWin.ticks > ride.ticks) continue;
    opening = { seed, ride, lane, parcel, drop, laneWin, parcelWin, dropWin };
  }
  if (!opening) die('No Koramangala seed showed a lane change, a parcel, a drop, and a win.');

  let jump = null;
  for (let seed = 1; seed <= 160 && !jump; seed++) {
    const ride = trace(api, hsr, seed, 60 * 40);
    const hop = ride.jumps.find((j) => j.kind === 'hole' && j.tick > 30);
    if (!hop) continue;
    const bumped = ride.events.some((e) => e.type === 'bump' && e.tick >= hop.tick && e.tick <= hop.tick + 40);
    const hit = ride.events.some((e) => e.type === 'hit' && e.tick >= hop.tick - 20 && e.tick <= hop.tick + 50);
    if (bumped || hit) continue;
    if (ride.status === 'lost' && ride.ticks < hop.tick + 40) continue;
    jump = { seed, commands: ride.commands, ...windowAround(hop.tick, FRAMES.jump, 22), hopTick: hop.tick };
  }
  if (!jump) die('No HSR Layout seed jumped a pothole cleanly.');

  const cop = scriptCop(api, jp);
  if (!cop) die('No JP Nagar seed whistled and dodged without a fine or a crash.');

  const cityTicks = 24 * TICKS_PER_FRAME;
  let cityRide = null;
  for (let seed = 1; seed <= 40 && !cityRide; seed++) {
    const ride = trace(api, bandra, seed, cityTicks + 30);
    const hit = ride.events.some((e) => e.type === 'hit' && e.tick < cityTicks);
    if (ride.status === 'lost' && ride.ticks < cityTicks) continue;
    if (hit) continue;
    cityRide = { seed, commands: ride.commands.filter((c) => c.tick < cityTicks) };
  }
  if (!cityRide) die('No Bandra opening stayed upright long enough to show Mumbai.');

  // One star on the area before each place the video visits, so Play still
  // opens Koramangala and the later neighbourhoods are selectable.
  const stars = {};
  for (const level of [hsr, jp, bandra]) {
    const i = levels.indexOf(level);
    if (i > 0) stars[levels[i - 1].id] = 1;
  }

  const plan = {
    stars,
    kora: { id: kora.id, cfg: kora, ...opening },
    jump: { id: hsr.id, cfg: hsr, ...jump },
    cop: { id: jp.id, cfg: jp, ...cop },
    city: {
      bengaluru: levels.filter((l) => l.cityId === 'bengaluru').findIndex((l) => l.name === 'HSR Layout'),
      mumbai: 1,
      bandra: 0,
      ...cityRide,
      roadTicks: cityTicks,
    },
  };
  console.log(
    `Plan: Koramangala seed ${opening.seed} wins in ${(opening.ride.ticks / 60).toFixed(1)}s ` +
      `(lane ${opening.lane.tick}, parcel ${opening.parcel.tick}, drop ${opening.drop.tick}, ${opening.ride.hearts} hearts); ` +
      `HSR seed ${jump.seed} jumps a pothole at ${jump.hopTick}; ` +
      `JP Nagar seed ${cop.seed} whistles at ${cop.warnTick} (lane ${cop.copTo} → ${cop.away}).`,
  );
  return plan;
}

function staticServer(dir) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = normalize(join(dir, pathname));
    if (!file.startsWith(dir)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const { readFile } = await import('node:fs/promises');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePromise({ server, port: typeof address === 'object' && address ? address.port : 0 });
    });
  });
}

const INIT = `
(() => {
  const installStyle = () => {
    if (!document.documentElement || document.getElementById('rd-rec')) return;
    const style = document.createElement('style');
    style.id = 'rd-rec';
    style.textContent = 'html,body{cursor:none!important}#stage{width:100%!important;max-width:none!important}*{cursor:none!important}';
    document.documentElement.appendChild(style);
  };
  installStyle();
  document.addEventListener('DOMContentLoaded', installStyle);
  // The real SDK tag is aborted. This stub is the Basic Launch portal: muted,
  // no rewarded buttons, and the coin store stays hidden.
  window.CrazyGames = {
    SDK: {
      init: async () => {},
      environment: 'crazygames',
      game: {
        settings: { muteAudio: true },
        loadingStart() {},
        loadingStop() {},
        gameplayStart() {},
        gameplayStop() {},
        happytime() {},
      },
      ad: {
        hasAdblock: async () => true,
        requestAd(_kind, cb) { cb.adError?.({ code: 'adsDisabledBasicLaunch' }); },
      },
    },
  };
  window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true);
  document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
  const stars = window.__rdStars || {};
  try {
    localStorage.clear();
    localStorage.setItem('rd:stars', JSON.stringify(stars));
  } catch { /* private mode: the run still starts */ }
  // Every run asks crypto for its seed. Pin it so the picture matches the plan.
  crypto.getRandomValues = (arr) => {
    const view = new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    if (view.length) view[0] = (window.__rdSeed ?? 1) >>> 0;
    return arr;
  };
  let now = 1000;
  let mirrorLast = now;
  let mirrorAcc = 0;
  let armed = false;
  let queue = [];
  let nextId = 1;
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  };
  window.cancelAnimationFrame = (id) => { queue = queue.filter((item) => item.id !== id); };
  const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', jump: ' ', brakeOn: 'ArrowDown', brakeOff: 'ArrowDown' };
  window.__rdPress = (cmds) => {
    for (const cmd of cmds) {
      const key = KEYS[cmd];
      if (!key) continue;
      const type = cmd === 'brakeOff' ? 'keyup' : 'keydown';
      window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
    }
  };
  window.__rdArm = () => { armed = true; mirrorAcc = 0; mirrorLast = now; };
  window.__rdPump = () => {
    const tickDt = 1 / 60;
    let next = mirrorLast + (armed ? 17 : 1000 / 60);
    let acc = mirrorAcc;
    let ticks = 0;
    if (armed) {
      let found = false;
      for (let ms = 16; ms <= 40 && !found; ms += 0.05) {
        next = mirrorLast + ms;
        const dt = Math.min(0.1, (next - mirrorLast) / 1000);
        acc = mirrorAcc + dt;
        ticks = 0;
        while (acc >= tickDt && ticks < 6) { acc -= tickDt; ticks++; }
        // Leave some slack so the next step cannot fall short of a tick.
        if (ticks === 1 && acc > tickDt * 0.02 && acc < tickDt * 0.35) found = true;
      }
      if (!found) throw new Error('pump could not land on one tick');
      mirrorAcc = acc;
    }
    mirrorLast = next;
    now = next;
    const batch = queue;
    queue = [];
    // The game loop is one callback. A coin count-up on the result screen can
    // hold a second one until that element leaves the page.
    if (batch.length === 0) throw new Error('expected an animation frame');
    for (const item of batch) item.cb(now);
  };
})();
`;

async function pump(page, n = 1) {
  for (let i = 0; i < n; i++) await page.evaluate(() => window.__rdPump());
}

async function press(page, cmds) {
  if (!cmds.length) return;
  await page.evaluate((list) => window.__rdPress(list), cmds);
}

async function clickAct(page, act) {
  await page.evaluate((name) => {
    const el = document.querySelector(`[data-act="${name}"]`);
    if (!(el instanceof HTMLElement) || el.disabled) throw new Error(`no button ${name}`);
    el.click();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, act);
}

async function waitFor(page, selector) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const ok = await page.evaluate((sel) => !!document.querySelector(sel), selector);
    if (ok) return;
    await sleep(40);
  }
  throw new Error(`timed out waiting for ${selector}`);
}

async function readHud(page) {
  return page.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return {
      left: text('#hud-left'),
      coins: (text('#hud-right').match(/\d+/) ?? ['-1'])[0],
      hearts: document.querySelector('#hud-mid')?.getAttribute('aria-label') ?? '',
      overlay: document.querySelector('#overlay')?.hasAttribute('hidden') === false,
      pause: document.querySelector('#pause')?.hasAttribute('hidden') === false,
      hint: text('#hint'),
    };
  });
}

function shotPath(dir, index) {
  return join(dir, String(index).padStart(5, '0') + '.jpg');
}

async function grab(page, dir, index) {
  await page.screenshot({ path: shotPath(dir, index), type: 'jpeg', quality: 86, animations: 'allow' });
  return index + 1;
}

/** Play `ticks` sim ticks. Every two ticks inside a window becomes one jpeg in clips/<name>/. */
async function playTicks(page, commands, from, ticks, windows, clipsDir) {
  const byTick = new Map();
  for (const c of commands) {
    if (c.tick >= from && c.tick < from + ticks) {
      const list = byTick.get(c.tick) ?? [];
      list.push(c.cmd);
      byTick.set(c.tick, list);
    }
  }
  const next = new Map(windows.map((w) => [w.name, 1]));
  for (let i = 0; i < ticks; i++) {
    const tick = from + i;
    if (i > 0 && i % 400 === 0) console.log(`    tick ${tick}`);
    await press(page, byTick.get(tick) ?? []);
    await pump(page, 1);
    const shot = windows.find((w) => tick + 1 > w.start && (tick + 1 - w.start) % TICKS_PER_FRAME === 0 && tick + 1 <= w.ticks);
    if (!shot) continue;
    const dir = join(clipsDir, shot.name);
    mkdirSync(dir, { recursive: true });
    const n = next.get(shot.name);
    await grab(page, dir, n);
    next.set(shot.name, n + 1);
  }
  for (const w of windows) {
    const got = (next.get(w.name) ?? 1) - 1;
    const want = (w.ticks - w.start) / TICKS_PER_FRAME;
    if (got !== want) throw new Error(`${w.name} captured ${got} frames, wanted ${want}`);
  }
}

async function grabClip(page, dir, count) {
  mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= count; i++) await grab(page, dir, i);
}

function assemble(clipsDir, seqDir, names) {
  mkdirSync(seqDir, { recursive: true });
  let n = 1;
  for (const name of names) {
    const dir = join(clipsDir, name);
    const files = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
    if (!files.length) throw new Error(`clip ${name} is empty`);
    for (const file of files) {
      copyFileSync(join(dir, file), shotPath(seqDir, n));
      n++;
    }
  }
  return n - 1;
}

async function checkSync(page, api, cfg, seed, commands, ticks) {
  const expected = stateAt(api, cfg, seed, commands, ticks);
  const hud = await readHud(page);
  const left = `${expected.delivered}/${expected.goal}`;
  const problems = [];
  if (hud.pause) problems.push('paused');
  if (hud.overlay) problems.push('menu covering the run');
  if (hud.left !== left) problems.push(`progress ${hud.left} != ${left}`);
  if (Number(hud.coins) !== expected.coins) problems.push(`coins ${hud.coins} != ${expected.coins}`);
  const heartLabel = `${expected.hearts} of 3 hearts`;
  if (hud.hearts !== heartLabel) problems.push(`hearts "${hud.hearts}" != "${heartLabel}"`);
  if (problems.length) {
    throw new Error(`Run drifted off the planned seed at tick ${ticks}: ${problems.join('; ')}`);
  }
}

async function boot(browser, origin, size, stars) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    screen: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    hasTouch: false,
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await context.addInitScript({ content: `window.__rdStars = ${JSON.stringify(stars)};\n${INIT}` });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.error('page error:', err.message));
  await page.route('**/*crazygames.com/**', (route) => route.abort());
  await page.goto(`${origin}/?unlock`, { waitUntil: 'domcontentloaded' });
  await waitFor(page, '[data-act="play"]');
  await page.waitForFunction(() => {
    const box = document.querySelector('#game')?.getBoundingClientRect();
    return !!box && box.width >= window.innerWidth - 2 && box.height >= window.innerHeight - 2;
  });
  await pump(page, 4);
  return { context, page };
}

const CLIP_ORDER = ['cover', 'menu', 'lane', 'jump', 'cop', 'city-list', 'city-brief', 'city-road', 'parcel', 'drop', 'result'];

async function leaveRun(page) {
  await page.keyboard.press('Escape');
  await waitFor(page, '#pause:not([hidden])');
  await page.evaluate(() => document.querySelector('#pause-leave')?.click());
  await waitFor(page, '#overlay:not([hidden]) [data-act="back"]');
}

async function capture(browser, origin, size, plan, api, workDir) {
  const clips = join(workDir, 'clips');
  const seq = join(workDir, 'seq');
  mkdirSync(clips, { recursive: true });
  const cover = join(workDir, 'cover.jpg');
  const coverDir = join(clips, 'cover');
  mkdirSync(coverDir, { recursive: true });
  for (let i = 1; i <= FRAMES.cover; i++) copyFileSync(cover, shotPath(coverDir, i));

  const { context, page } = await boot(browser, origin, size, plan.stars);
  try {
    await sleep(450);
    await grabClip(page, join(clips, 'menu'), FRAMES.menu);

    console.log('  menu held, starting Koramangala');
    await page.evaluate((seed) => {
      window.__rdSeed = seed;
    }, plan.kora.seed);
    await clickAct(page, 'play');
    await page.evaluate(() => window.__rdArm());
    const syncAt = plan.kora.laneWin.start;
    await playTicks(page, plan.kora.ride.commands, 0, syncAt, [], clips);
    await checkSync(page, api, plan.kora.cfg, plan.kora.seed, plan.kora.ride.commands, syncAt);

    const windows = [
      { name: 'lane', ...plan.kora.laneWin },
      { name: 'parcel', ...plan.kora.parcelWin },
      { name: 'drop', ...plan.kora.dropWin },
    ].sort((a, b) => a.start - b.start);
    let cursor = syncAt;
    for (const w of windows) {
      if (w.start < cursor) throw new Error(`${w.name} starts before the playhead`);
      await playTicks(page, plan.kora.ride.commands, cursor, w.start - cursor, [], clips);
      await playTicks(page, plan.kora.ride.commands, w.start, w.ticks - w.start, [w], clips);
      cursor = w.ticks;
    }
    const end = plan.kora.ride.ticks;
    if (end > cursor) await playTicks(page, plan.kora.ride.commands, cursor, end - cursor, [], clips);
    await waitFor(page, 'h2.win');
    await sleep(400);
    // The coin total counts up on the animation clock. The run has already stopped.
    await pump(page, 50);
    const starsLabel = await page.evaluate(() => document.querySelector('.big-stars')?.getAttribute('aria-label') ?? '');
    if (!/^[1-3] of 3 stars$/.test(starsLabel)) throw new Error(`result screen has no stars (${starsLabel})`);
    await grabClip(page, join(clips, 'result'), FRAMES.result);

    console.log('  result held, riding HSR for the pothole');
    await clickAct(page, 'areas');
    await waitFor(page, '[data-act="a0"]');
    await rideArea(page, `a${plan.city.bengaluru}`, plan.jump.seed);
    await playTicks(page, plan.jump.commands, 0, plan.jump.ticks, [{ name: 'jump', start: plan.jump.start, ticks: plan.jump.ticks }], clips);
    await leaveRun(page);

    console.log('  jump held, opening Mumbai');
    await clickAct(page, 'back');
    await waitFor(page, '[data-act="c1"]');
    await grabClip(page, join(clips, 'city-list'), 20);
    await clickAct(page, 'c1');
    await waitFor(page, 'h2');
    await clickAct(page, 'a0');
    await waitFor(page, 'h2');
    const where = await page.evaluate(() => document.querySelector('.where')?.textContent ?? '');
    if (!where.includes('Mumbai')) throw new Error(`city change did not open Mumbai (${where})`);
    await grabClip(page, join(clips, 'city-brief'), 16);
    await page.evaluate((seed) => {
      window.__rdSeed = seed;
    }, plan.city.seed);
    await clickAct(page, 'go');
    await page.evaluate(() => window.__rdArm());
    await playTicks(
      page,
      plan.city.commands,
      0,
      plan.city.roadTicks,
      [{ name: 'city-road', start: 0, ticks: plan.city.roadTicks }],
      clips,
    );
    await leaveRun(page);

    await clickAct(page, 'back');
    await waitFor(page, '[data-act="c0"]');
    await clickAct(page, 'c0');
    await waitFor(page, '[data-act="a7"]');
    console.log('  city held, riding JP Nagar for the cop');
    await rideArea(page, 'a7', plan.cop.seed);
    await playTicks(page, plan.cop.commands, 0, plan.cop.ticks, [{ name: 'cop', start: plan.cop.start, ticks: plan.cop.ticks }], clips);
  } finally {
    await context.close();
  }
  return assemble(clips, seq, CLIP_ORDER);
}

async function rideArea(page, areaAct, seed) {
  await clickAct(page, areaAct);
  await waitFor(page, '[data-act="go"]');
  await page.evaluate((value) => {
    window.__rdSeed = value;
  }, seed);
  await clickAct(page, 'go');
  await page.evaluate(() => window.__rdArm());
}

function writeCover(size) {
  const logo = join(root, 'src/assets/logo.png');
  const file = join(outRoot, `cover-${size.name}.jpg`);
  const height = size.name === 'landscape' ? 860 : -1;
  const width = size.name === 'portrait' ? 660 : -1;
  const y = size.name === 'landscape' ? '(H-h)/2' : '(H-h)/2-30';
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x4FB3F6:s=${size.width}x${size.height}:d=1`,
    '-i', logo,
    '-filter_complex',
    `[0:v]format=rgb24,geq=r='79+110*Y/H':g='179+52*Y/H':b='246+9*Y/H'[sky];` +
      `[1:v]scale=${width}:${height}[logo];[sky][logo]overlay=(W-w)/2:${y}`,
    '-frames:v', '1',
    '-update', '1',
    '-q:v', '2',
    file,
  ]);
  return file;
}

function encode(seqDir, frames, size, dest) {
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-y',
    '-framerate', String(FPS),
    '-start_number', '1',
    '-i', join(seqDir, '%05d.jpg'),
    '-frames:v', String(frames),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-crf', '18',
    '-preset', 'medium',
    '-an',
    '-movflags', '+faststart',
    '-r', String(FPS),
    dest,
  ]);
}

function assertVideo(file, size) {
  const probe = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=codec_name,codec_type,width,height',
    '-of', 'json',
    file,
  ], { encoding: 'utf8' });
  if (probe.status !== 0) die(`ffprobe failed for ${file}`);
  const json = JSON.parse(probe.stdout);
  const video = (json.streams ?? []).find((s) => s.codec_type === 'video');
  const audio = (json.streams ?? []).find((s) => s.codec_type === 'audio');
  const duration = Number(json.format?.duration);
  const bytes = Number(json.format?.size);
  const problems = [];
  if (!video || video.codec_name !== 'h264') problems.push(`codec ${video?.codec_name}`);
  if (audio) problems.push('has audio');
  if (video?.width !== size.width || video?.height !== size.height) problems.push(`size ${video?.width}x${video?.height}`);
  if (!(duration >= 15 && duration <= 20)) problems.push(`duration ${duration}`);
  if (!(bytes > 0 && bytes <= 50 * 1024 * 1024)) problems.push(`bytes ${bytes}`);
  if (problems.length) die(`${file} is not a valid preview: ${problems.join('; ')}`);
  console.log(`${file}: ${video.width}x${video.height} h264 ${duration.toFixed(2)}s ${(bytes / 1024 / 1024).toFixed(1)} MB, no audio`);
}

async function main() {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) die('ffmpeg is not on PATH');
  const planOnly = process.argv.includes('--plan');
  console.log('Planning shots from the simulation…');
  const api = await loadSim();
  const plan = planShots(api);
  if (planOnly) return;

  console.log('Building the production bundle…');
  run('npm', ['run', 'build'], { cwd: root });
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) die('dist/index.html is missing after the build');

  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });
  for (const size of ORIENTATIONS) writeCover(size);

  const { server, port } = await staticServer(dist);
  const origin = `http://127.0.0.1:${port}`;
  console.log(`Serving ${dist} at ${origin}`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--mute-audio', '--hide-scrollbars', '--disable-dev-shm-usage'],
  });
  try {
    for (const size of ORIENTATIONS) {
      console.log(`Capturing ${size.name} ${size.width}x${size.height}…`);
      const work = join(outRoot, size.name);
      mkdirSync(work, { recursive: true });
      copyFileSync(join(outRoot, `cover-${size.name}.jpg`), join(work, 'cover.jpg'));
      const frames = await capture(browser, origin, size, plan, api, work);
      const expected = Object.values(FRAMES).reduce((n, v) => n + v, 0);
      if (frames !== expected) die(`${size.name} has ${frames} frames, expected ${expected}`);
      const dest = join(outRoot, size.file);
      encode(join(work, 'seq'), frames, size, dest);
      assertVideo(dest, size);
      if (existsSync(ARTIFACTS)) {
        mkdirSync(ARTIFACTS, { recursive: true });
        copyFileSync(dest, join(ARTIFACTS, size.file));
        console.log(`Copied ${size.file} to ${ARTIFACTS}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  // The plan object is large (level configs). Drop it from the written note.
  writeFileSync(join(outRoot, 'README.txt'), [
    'CrazyGames preview videos recorded from the production build.',
    'First frame: in-game title art (src/assets/logo.png). No cover files are in the repo.',
    'Real-time cuts: menu, lane change, pothole jump, parcel, green drop, Mumbai, traffic-cop whistle and dodge, result stars.',
    'Not uploaded.',
    '',
  ].join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
