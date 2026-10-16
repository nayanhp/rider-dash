// Deterministic run simulation. A run is seed + level config + input log: replaying the
// same three always gives the same result. Fixed tick, no rendering, no DOM, no Math.random.
import { TUNING, isMover, type HitKind, type ThreatKind, type LevelConfig, type MoverKind, type ObjKind, type PowerKind, type TimedPower, type Tuning } from './config';
import { Rng } from './rng';

export const LANES = 3;
/** brakeOn / brakeOff bracket a held brake: the rider slows while it is held, never stops. */
export type Command = 'left' | 'right' | 'jump' | 'brakeOn' | 'brakeOff' | 'revive' | 'reviveCoins';
export type RunStatus = 'running' | 'won' | 'lost';

export interface Obj {
  id: number;
  kind: ObjKind;
  /** Lane used for collisions: the nearest lane to lx. */
  lane: number;
  /** Position across the road, in lanes. Equals lane unless the object is changing lanes. */
  lx: number;
  /** Absolute distance along the road. */
  z: number;
  /** Own speed along the road (world units/s). Positive moves with the rider, negative toward. */
  vz: number;
  /** Planned lane change, for movers that swerve, drift or cross. */
  move?: LaneMove;
  /** Which power-up, for kind 'power'. */
  power?: PowerKind;
  /** Hot food: pays a tip if delivered quickly. Parcels only. */
  hot?: boolean;
  /** Length along the road, for long vehicles (trams). The body runs from z to z + len. */
  len?: number;
  done: boolean;
}

export interface LaneMove {
  /** Starts when the object is this close ahead of the rider. */
  trigger: number;
  /** 'warn' flashes an indicator before the move. */
  phase: 'wait' | 'warn' | 'move' | 'done';
  warnLeft: number;
  warnTicks: number;
  to: number;
  /** Lanes per second. */
  laneSpeed: number;
}

/** A street dog chasing the rider. It runs a little faster than the rider's cruising speed. */
export interface DogChase {
  ticksLeft: number;
  /** Distance behind the rider. At 0 it catches up. */
  gap: number;
}

export type SimEvent =
  | { type: 'coin' }
  | { type: 'parcel' }
  | { type: 'deliver'; parcels: number; coins: number; combo: number }
  | { type: 'hit'; kind: HitKind; lostParcel: boolean }
  | { type: 'bump'; kind: 'hole' | 'bump' }
  | { type: 'brake' }
  | { type: 'dog'; phase: 'start' | 'gone' }
  | { type: 'power'; kind: PowerKind }
  | { type: 'powerEnd'; kind: TimedPower }
  | { type: 'shield' }
  | { type: 'splash' }
  | { type: 'stolen' }
  | { type: 'tip'; coins: number }
  | { type: 'cold' }
  | { type: 'jump' }
  | { type: 'won' }
  | { type: 'lost' }
  | { type: 'revive' };

export interface RunState {
  cfg: LevelConfig;
  tuning: Tuning;
  seed: number;
  rngState: number;
  tick: number;
  /** Distance travelled. */
  dist: number;
  /** Current speed (world units/s). Eases toward targetSpeed(), which steps up per drop-off. */
  v: number;
  /** Target lane (0..2) and the rider's smoothed position between lanes. */
  lane: number;
  lx: number;
  /** Ticks left in the current jump, 0 when on the ground. */
  jumpT: number;
  /** True while the player holds the brake. */
  braking: boolean;
  dog: DogChase | null;
  /** Ticks left on each timed power-up. */
  powers: Partial<Record<TimedPower, number>>;
  /** A safety helmet is on: the next crash is absorbed. */
  shield: boolean;
  /** The area's new power-up has been placed once. */
  powerTaught: boolean;
  /** Most hearts this run can hold: 3, or 4 with the extra-heart boost. */
  maxHearts: number;
  /** A construction zone in progress: rows still to place and the one open lane. */
  zone: { rowsLeft: number; open: number } | null;
  /** Ticks of sluggish steering left after riding through a puddle. */
  wetT: number;
  /** Hot parcels on board, and ticks before they go cold. */
  hotCarry: number;
  hotT: number;
  mods: RunMods;
  invulnT: number;
  hearts: number;
  carry: number;
  delivered: number;
  coins: number;
  combo: number;
  rows: number;
  nextRowAt: number;
  autoSpawn: boolean;
  objs: Obj[];
  nextId: number;
  status: RunStatus;
  /** A run can be revived once. Further revive commands do nothing. */
  revived: boolean;
  /** Events produced by the most recent step. */
  events: SimEvent[];
}

/**
 * What the player brought into this run from the shop. Part of the run's inputs, so a
 * replay with the same mods gives the same result.
 */
export interface RunMods {
  /** Duration multiplier per timed power-up, from upgrades. 1 = base. */
  powerScale?: Partial<Record<TimedPower, number>>;
  /** Pre-run boosts. */
  startHelmet?: boolean;
  startNitro?: boolean;
  extraHeart?: boolean;
}

export interface RunOptions {
  tuning?: Tuning;
  mods?: RunMods;
  /** Turn off the spawner so tests can place objects by hand. */
  autoSpawn?: boolean;
}

export function createRun(cfg: LevelConfig, seed: number, opts: RunOptions = {}): RunState {
  const tuning = opts.tuning ?? TUNING;
  const mods = opts.mods ?? {};
  const maxHearts = tuning.hearts + (mods.extraHeart ? tuning.extraHeartBoost : 0);
  const s: RunState = {
    cfg,
    tuning,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    tick: 0,
    dist: 0,
    v: cfg.v0,
    lane: 1,
    lx: 1,
    jumpT: 0,
    braking: false,
    dog: null,
    powers: {},
    shield: false,
    powerTaught: false,
    invulnT: 0,
    hearts: maxHearts,
    maxHearts,
    mods,
    zone: null,
    wetT: 0,
    hotCarry: 0,
    hotT: 0,
    carry: 0,
    delivered: 0,
    coins: 0,
    combo: 0,
    rows: 0,
    nextRowAt: tuning.firstRowAt,
    autoSpawn: opts.autoSpawn ?? true,
    objs: [],
    nextId: 1,
    status: 'running',
    revived: false,
    events: [],
  };
  if (mods.startHelmet) s.shield = true;
  if (mods.startNitro) s.powers.nitro = powerTicks(s, 'nitro');
  return s;
}

/** A timed power-up's length in ticks, after shop upgrades. */
export function powerTicks(s: RunState, p: TimedPower): number {
  return Math.round(s.tuning.powerTicks[p] * (s.mods.powerScale?.[p] ?? 1));
}

export const isEndless = (s: RunState) => s.cfg.goal === undefined;
export const seconds = (s: RunState) => s.tick / s.tuning.tickRate;

export function speed(s: RunState): number {
  return s.v;
}

/**
 * The speed the rider is heading for. In a level it steps up after each drop-off, from v0
 * at the start toward v1 at the goal. Endless still speeds up over time, and each drop-off
 * adds a bump on top, capped at v1.
 */
export function targetSpeed(s: RunState): number {
  const { v0, v1, ramp, goal } = s.cfg;
  const boost = s.powers.nitro ? s.tuning.nitroBoost : 1;
  if (goal !== undefined) return (v0 + (v1 - v0) * Math.min(1, s.delivered / goal)) * boost;
  const timed = v0 + (v1 - v0) * Math.min(1, seconds(s) / ramp);
  return Math.min(v1, timed + s.delivered * s.tuning.endlessSpeedPerDrop) * boost;
}

export const hasPower = (s: RunState, p: TimedPower) => (s.powers[p] ?? 0) > 0;
/** Coins pay double while the 2× power-up runs. */
const coinMult = (s: RunState) => (hasPower(s, 'double') ? 2 : 1);

/** Parcels the rider can hold right now: never more than are still needed for the goal. */
export function carryCap(s: RunState): number {
  const left = s.cfg.goal === undefined ? Infinity : s.cfg.goal - s.delivered;
  return Math.max(0, Math.min(s.tuning.maxCarry, left));
}

/** A tie does not beat the saved best. */
export function beatBest(value: number, bestBefore: number): boolean {
  return value > bestBefore;
}

/**
 * The lose screen can still continue this run: a rewarded revive is on offer, or the
 * rider can pay the coin cost. A win, a second crash, or an empty pocket cannot.
 */
export function reviveStillOpen(s: RunState, adOffered: boolean): boolean {
  return s.status === 'lost' && !s.revived && (adOffered || s.coins >= s.tuning.reviveCost);
}

/** Endless score: integers only. */
export function score(s: RunState): number {
  const t = s.tuning;
  return s.coins + s.delivered * t.scorePerDelivery + Math.floor(s.dist / t.scoreDistanceDiv);
}

export const meters = (s: RunState) => Math.floor(s.dist / s.tuning.metersDiv);

/** True while the rider is high enough to clear holes and speed breakers. */
export function airborne(s: RunState): boolean {
  if (s.jumpT <= 0) return false;
  const elapsed = s.tuning.jumpTicks - s.jumpT;
  return elapsed >= s.tuning.airFromTick && elapsed < s.tuning.airToTick;
}

export function addObj(s: RunState, kind: ObjKind, lane: number, z: number): Obj {
  const o: Obj = { id: s.nextId++, kind, lane, lx: lane, z, vz: 0, done: false };
  s.objs.push(o);
  return o;
}

/** Moving threats still ahead of the rider. */
export const moversAhead = (s: RunState) => s.objs.filter((o) => isMover(o.kind) && !o.done && o.z > s.dist).length;

/** Place a moving threat. Its lane change, if any, is decided now, so replays match. */
export function addMover(s: RunState, rng: Rng, kind: MoverKind, lane: number, z: number): Obj {
  const spec = s.tuning.movers[kind] as { vz: number; trigger: number; warnTicks: number; laneSpeed: number; driftChance?: number };
  let from = lane;
  let to = lane;
  if (kind === 'walker') {
    from = rng.next() < 0.5 ? 0 : 2;
    to = 2 - from;
  } else if (spec.driftChance !== undefined && rng.next() < spec.driftChance) {
    to = lane === 1 ? (rng.next() < 0.5 ? 0 : 2) : 1;
  }
  const o = addObj(s, kind, from, z);
  o.vz = spec.vz;
  if (to !== from) {
    o.move = { trigger: spec.trigger, phase: 'wait', warnLeft: 0, warnTicks: spec.warnTicks, to, laneSpeed: spec.laneSpeed };
  }
  return o;
}

export function startDog(s: RunState) {
  s.dog = { ticksLeft: s.tuning.dogTicks, gap: s.tuning.dogStartGap };
  s.events.push({ type: 'dog', phase: 'start' });
}

function moveObjects(s: RunState, dt: number) {
  for (const o of s.objs) {
    if (o.done) continue;
    if (o.vz) o.z += o.vz * dt;
    const m = o.move;
    if (!m || m.phase === 'done') continue;
    if (m.phase === 'wait') {
      if (o.z - s.dist > m.trigger) continue;
      m.phase = m.warnTicks > 0 ? 'warn' : 'move';
      m.warnLeft = m.warnTicks;
    }
    if (m.phase === 'warn') {
      if (--m.warnLeft > 0) continue;
      m.phase = 'move';
    }
    const stepLanes = m.laneSpeed * dt;
    o.lx = o.lx < m.to ? Math.min(m.to, o.lx + stepLanes) : Math.max(m.to, o.lx - stepLanes);
    if (o.lx === m.to) m.phase = 'done';
    o.lane = Math.round(o.lx);
  }
}

function applyCommand(s: RunState, cmd: Command) {
  if (cmd === 'left') s.lane = Math.max(0, s.lane - 1);
  else if (cmd === 'right') s.lane = Math.min(LANES - 1, s.lane + 1);
  else if (cmd === 'jump' && s.jumpT <= 0) {
    s.jumpT = s.tuning.jumpTicks;
    s.events.push({ type: 'jump' });
  } else if (cmd === 'brakeOn' && !s.braking && s.cfg.brake) {
    s.braking = true;
    s.combo = 0;
    s.events.push({ type: 'brake' });
  } else if (cmd === 'brakeOff') {
    s.braking = false;
  }
}

/**
 * One row of the road. At most two obstacles, so one lane is always open, and that lane
 * gets the reward (a parcel or a coin trail). While carrying, every few rows is a drop zone.
 */
export function spawnRow(s: RunState, z: number) {
  const t = s.tuning;
  const rng = new Rng(s.rngState);
  s.rows++;
  const lanes = rng.shuffle([0, 1, 2]);
  const picks = (s.cfg.threats ?? []).filter((k): k is Exclude<ThreatKind, 'dog'> => k !== 'dog');
  const tramAhead = s.objs.some((o) => o.kind === 'tram' && !o.done && o.z + (o.len ?? 0) > s.dist);
  if (s.zone) {
    zoneRow(s, rng, z);
  } else if (s.carry > 0 && s.rows % t.dropEveryRows === 0) {
    addObj(s, 'drop', lanes[0], z);
  } else if ((s.cfg.zoneChance ?? 0) > 0 && moversAhead(s) === 0 && rng.next() < (s.cfg.zoneChance ?? 0)) {
    // A construction zone: the same two lanes barricaded for a few rows.
    s.zone = { rowsLeft: t.zoneRows, open: lanes[2] };
    zoneRow(s, rng, z);
  } else if (s.cfg.tramLane !== undefined && !tramAhead && rng.next() < (s.cfg.tramChance ?? 0)) {
    // A tram comes down the rail lane; the other two lanes stay clear this row.
    const tram = addMover(s, rng, 'tram', s.cfg.tramLane, z);
    tram.len = t.tramLen;
    addReward(s, rng, s.cfg.tramLane === 0 ? 2 : 0, z);
  } else if (picks.length && rng.next() < (s.cfg.threatChance ?? 0) && moversAhead(s) < (s.cfg.maxMovers ?? 1)) {
    // A threat row: one moving threat on its own (or a crowd), the reward in the open lane.
    const pick = rng.pick(picks);
    if (pick === 'crowd') addCrowd(s, rng, z);
    else addMover(s, rng, pick, lanes[0], z);
    addReward(s, rng, lanes[2], z);
  } else {
    // While a tram is on its way, keep obstacles out of the two other lanes' shared gap:
    // one obstacle only, and never leave the rail lane as the only way through.
    if (tramAhead && s.cfg.tramLane !== undefined) {
      lanes.splice(lanes.indexOf(s.cfg.tramLane), 1);
      lanes.unshift(s.cfg.tramLane);
    }
    const count = !tramAhead && rng.next() < s.cfg.density ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const jitter = i ? rng.range(-t.pairJitter, t.pairJitter) : 0;
      addObj(s, rng.pick(s.cfg.kinds), lanes[i], z + jitter);
    }
    // A puddle or monkey guards the open lane: jump it, or pay (slowdown or a lost parcel).
    const hazards = s.cfg.hazards ?? [];
    if (hazards.length && rng.next() < (s.cfg.hazardChance ?? 0)) addObj(s, rng.pick(hazards), lanes[2], z - t.hazardGap);
    addReward(s, rng, lanes[2], z);
  }
  const dogChance = s.cfg.dogChance ?? 0;
  if (dogChance > 0 && !s.dog && !s.zone && s.tick >= t.dogMinTick && rng.next() < dogChance) startDog(s);
  s.rngState = rng.state;
}

function zoneRow(s: RunState, rng: Rng, z: number) {
  const zone = s.zone!;
  for (const lane of [0, 1, 2]) if (lane !== zone.open) addObj(s, 'barrier', lane, z);
  addReward(s, rng, zone.open, z);
  if (--zone.rowsLeft <= 0) s.zone = null;
}

/** Festival crowd: two people crossing from opposite sides, a little apart. */
function addCrowd(s: RunState, rng: Rng, z: number) {
  const a = addMover(s, rng, 'walker', 0, z);
  const b = addMover(s, rng, 'walker', 0, z + s.tuning.coinSpacing * 3);
  // Send them from opposite sides, whatever side each started on.
  if (a.lane === b.lane) {
    b.lane = b.lx = 2 - a.lane;
    if (b.move) b.move.to = a.lane;
  }
}

/** Power-ups that may be placed right now. A heart only shows up after you've lost one. */
function placeablePowers(s: RunState): PowerKind[] {
  return (s.cfg.powers ?? []).filter((p) => p !== 'heart' || s.hearts < s.maxHearts);
}

function addReward(s: RunState, rng: Rng, lane: number, z: number) {
  const t = s.tuning;
  const teach = s.cfg.teachPower;
  if (teach && !s.powerTaught && s.rows >= t.powerTeachRow && (teach !== 'heart' || s.hearts < s.maxHearts)) {
    s.powerTaught = true;
    addPower(s, teach, lane, z + t.parcelOffset);
    return;
  }
  const powers = placeablePowers(s);
  if (powers.length && rng.next() < (s.cfg.powerChance ?? 0)) {
    addPower(s, rng.pick(powers), lane, z + t.parcelOffset);
    return;
  }
  if (rng.next() < t.parcelChance && s.carry < carryCap(s)) {
    const p = addObj(s, 'parcel', lane, z + t.parcelOffset);
    if ((s.cfg.hotChance ?? 0) > 0 && rng.next() < (s.cfg.hotChance ?? 0)) p.hot = true;
  }
  else for (let c = 0; c < t.coinsPerRow; c++) addObj(s, 'coin', lane, z + t.coinOffset + c * t.coinSpacing);
}

export function addPower(s: RunState, power: PowerKind, lane: number, z: number): Obj {
  const o = addObj(s, 'power', lane, z);
  o.power = power;
  return o;
}

function grantPower(s: RunState, p: PowerKind) {
  if (p === 'helmet') s.shield = true;
  else if (p === 'heart') s.hearts = Math.min(s.maxHearts, s.hearts + 1);
  else s.powers[p] = powerTicks(s, p);
  s.events.push({ type: 'power', kind: p });
}

function tickPowers(s: RunState) {
  for (const p of Object.keys(s.powers) as TimedPower[]) {
    const left = (s.powers[p] ?? 0) - 1;
    if (left > 0) s.powers[p] = left;
    else {
      delete s.powers[p];
      s.events.push({ type: 'powerEnd', kind: p });
    }
  }
}

/** A crash: lose a heart and a carried parcel, slow down, and blink for a moment. */
function crash(s: RunState, kind: HitKind) {
  const t = s.tuning;
  if (s.shield) {
    // The helmet takes it: no heart, no parcel, no slowdown.
    s.shield = false;
    s.invulnT = t.invulnTicks;
    s.events.push({ type: 'shield' });
    return;
  }
  s.hearts--;
  s.invulnT = t.invulnTicks;
  s.combo = 0;
  s.v *= t.hitSlow;
  const lostParcel = s.carry > 0;
  if (lostParcel) s.carry--;
  s.hotCarry = Math.min(s.hotCarry, s.carry);
  s.events.push({ type: 'hit', kind, lostParcel });
  if (s.hearts <= 0) s.status = 'lost';
}

function collide(s: RunState, o: Obj) {
  const t = s.tuning;
  if (o.kind === 'coin') {
    o.done = true;
    s.coins += coinMult(s);
    s.events.push({ type: 'coin' });
  } else if (o.kind === 'parcel') {
    // A full box rides past the parcel and leaves it on the road.
    if (s.carry >= carryCap(s)) return;
    o.done = true;
    s.carry++;
    if (o.hot) {
      s.hotCarry++;
      s.hotT = t.hotTicks;
    }
    s.events.push({ type: 'parcel' });
  } else if (o.kind === 'drop') {
    // Each home takes one parcel. Carry more and you need more drop-offs.
    if (s.carry === 0) return;
    o.done = true;
    s.combo++;
    const coins = t.coinsPerDelivery * Math.min(t.comboCap, s.combo) * coinMult(s);
    s.carry--;
    s.delivered++;
    s.coins += coins;
    s.events.push({ type: 'deliver', parcels: 1, coins, combo: s.combo });
    if (s.hotCarry > 0 && s.hotT > 0) {
      // Hot food still hot: the customer tips.
      s.hotCarry--;
      const tip = t.hotTip * coinMult(s);
      s.coins += tip;
      s.events.push({ type: 'tip', coins: tip });
    }
    s.hotCarry = Math.min(s.hotCarry, s.carry);
    if (s.dog) {
      // The dog gives up at the doorstep.
      s.dog = null;
      s.events.push({ type: 'dog', phase: 'gone' });
    }
    if (s.cfg.goal !== undefined && s.delivered >= s.cfg.goal) s.status = 'won';
  } else if (o.kind === 'power') {
    o.done = true;
    if (o.power) grantPower(s, o.power);
  } else if (o.kind === 'puddle') {
    // Jump it, or splash through: a little slower and sluggish steering for a moment.
    if (airborne(s) || hasPower(s, 'nitro')) return;
    o.done = true;
    s.v = Math.min(s.v, targetSpeed(s) * t.puddleSlow);
    s.wetT = t.wetTicks;
    s.events.push({ type: 'splash' });
  } else if (o.kind === 'monkey') {
    // Jump it, or it grabs a parcel off your box. No heart lost.
    if (airborne(s) || hasPower(s, 'nitro')) return;
    o.done = true;
    if (s.carry > 0) {
      s.carry--;
      s.hotCarry = Math.min(s.hotCarry, s.carry);
      s.combo = 0;
      s.events.push({ type: 'stolen' });
    }
  } else if (o.kind === 'hole' || o.kind === 'bump') {
    // Jump it, or ride over it and lose most of your speed. No heart lost. Nitro skims over.
    if (airborne(s) || hasPower(s, 'nitro')) return;
    o.done = true;
    s.v = Math.min(s.v, targetSpeed(s) * t.bumpSlow);
    s.combo = 0;
    s.events.push({ type: 'bump', kind: o.kind });
  } else {
    if (s.invulnT > 0 || hasPower(s, 'nitro')) return;
    o.done = true;
    crash(s, o.kind);
  }
}

/** Whether the rider touches this object now. Magnet and net reach further than your own lane. */
function inReach(s: RunState, o: Obj, myLane: number): boolean {
  const t = s.tuning;
  const rel = o.z - s.dist;
  if (rel < -t.hitWindow - (o.len ?? 0)) return false;
  if (o.kind === 'coin' && hasPower(s, 'magnet')) return rel <= t.magnetReach;
  if (o.kind === 'parcel' && hasPower(s, 'net')) return Math.abs(o.lane - myLane) <= 1 && rel <= t.netReach;
  // The first check allowed for a long vehicle's body (z to z + len); without one, the window is symmetric.
  return o.lane === myLane && rel <= t.hitWindow;
}

function chaseDog(s: RunState, dt: number) {
  const d = s.dog;
  if (!d) return;
  const t = s.tuning;
  d.gap = Math.min(t.dogStartGap, d.gap + (s.v - targetSpeed(s) * t.dogPace) * dt);
  d.ticksLeft--;
  if (d.gap <= 0) {
    s.dog = null;
    if (s.invulnT > 0 || hasPower(s, 'nitro')) s.events.push({ type: 'dog', phase: 'gone' });
    else crash(s, 'dog');
  } else if (d.ticksLeft <= 0) {
    s.dog = null;
    s.events.push({ type: 'dog', phase: 'gone' });
  }
}

/** Continue a lost run once, with invulnerability and the killing obstacle cleared. */
function tryRevive(s: RunState, payCoins: boolean) {
  if (s.status !== 'lost' || s.revived) return;
  if (payCoins && s.coins < s.tuning.reviveCost) return;
  if (payCoins) s.coins -= s.tuning.reviveCost;
  s.revived = true;
  s.status = 'running';
  s.dog = null;
  s.powers = {};
  s.hearts = s.tuning.reviveHearts;
  s.invulnT = s.tuning.invulnTicks;
  for (const o of s.objs) {
    if (!o.done && Math.abs(o.z - s.dist) <= s.tuning.hitWindow) o.done = true;
  }
  s.events.push({ type: 'revive' });
}

/** Advance one fixed tick. Commands are applied before movement. */
export function step(s: RunState, cmds: readonly Command[] = []) {
  s.events = [];
  for (const c of cmds) {
    if (c === 'revive') tryRevive(s, false);
    else if (c === 'reviveCoins') tryRevive(s, true);
  }
  if (s.status !== 'running') return;
  const t = s.tuning;
  const dt = 1 / t.tickRate;
  for (const c of cmds) if (c !== 'revive' && c !== 'reviveCoins') applyCommand(s, c);

  // Ease toward the target: gently for a speed step-up, quickly back after a brake or bump.
  const braking = s.braking;
  const target = targetSpeed(s) * (braking ? t.brakeFactor : 1);
  if (s.v < target) s.v = Math.min(target, s.v + (s.v < target * 0.92 ? t.recoverAccel : t.speedAccel) * dt);
  else s.v = Math.max(target, s.v - (braking ? t.brakeDecel : t.speedAccel) * dt);
  s.dist += s.v * dt;
  s.tick++;
  const follow = s.cfg.rain || s.wetT > 0 ? t.rainLaneFollow : t.laneFollow;
  if (s.wetT > 0) s.wetT--;
  if (s.hotT > 0 && --s.hotT === 0 && s.hotCarry > 0) {
    s.hotCarry = 0;
    s.events.push({ type: 'cold' });
  }
  s.lx += (s.lane - s.lx) * Math.min(1, dt * follow);
  if (Math.abs(s.lane - s.lx) < 1e-3) s.lx = s.lane;
  if (s.jumpT > 0) s.jumpT--;
  if (s.invulnT > 0) s.invulnT--;

  if (s.autoSpawn && s.dist >= s.nextRowAt) {
    spawnRow(s, s.dist + t.spawnAhead);
    s.nextRowAt = s.dist + Math.max(t.rowGapMin, t.rowGapStart - seconds(s) * t.rowGapShrinkPerSec);
  }

  moveObjects(s, dt);
  chaseDog(s, dt);
  tickPowers(s);

  const myLane = Math.round(s.lx);
  for (const o of s.objs) {
    if (s.status !== 'running') break;
    if (o.done || !inReach(s, o, myLane)) continue;
    collide(s, o);
    if (s.status !== 'running') break;
  }
  s.objs = s.objs.filter(
    (o) => o.z + (o.len ?? 0) - s.dist > -t.despawnBehind && !(o.done && (o.kind === 'coin' || o.kind === 'parcel' || o.kind === 'power')),
  );
  // collide() may have ended the run; TS narrowed status to 'running' above.
  const end = s.status as RunStatus;
  if (end !== 'running') s.events.push({ type: end });
}

/** Commands recorded against the tick they were applied on. */
export type InputLog = Array<[tick: number, cmd: Command]>;

/** Replay a run from its seed and input log. Stops at the end of the run or at maxTicks. */
export function replay(cfg: LevelConfig, seed: number, log: InputLog, maxTicks: number, opts?: RunOptions): RunState {
  const s = createRun(cfg, seed, opts);
  let i = 0;
  while (s.tick < maxTicks) {
    const cmds: Command[] = [];
    while (i < log.length && log[i][0] === s.tick) cmds.push(log[i++][1]);
    const before = s.tick;
    const revive = cmds.some((c) => c === 'revive' || c === 'reviveCoins');
    if (s.status !== 'running' && !revive) break;
    step(s, cmds);
    // A failed revive does not advance the tick; don't spin on it.
    if (s.tick === before) break;
  }
  return s;
}
