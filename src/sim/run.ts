// Deterministic run simulation. A run is seed + level config + input log: replaying the
// same three always gives the same result. Fixed tick, no rendering, no DOM, no Math.random.
import { JUMPABLE, TUNING, type LevelConfig, type ObjKind, type ObstacleKind, type Tuning } from './config';
import { Rng } from './rng';

export const LANES = 3;
export type Command = 'left' | 'right' | 'jump';
export type RunStatus = 'running' | 'won' | 'lost';

export interface Obj {
  id: number;
  kind: ObjKind;
  lane: number;
  /** Absolute distance along the road. */
  z: number;
  done: boolean;
}

export type SimEvent =
  | { type: 'coin' }
  | { type: 'parcel' }
  | { type: 'deliver'; parcels: number; coins: number; combo: number }
  | { type: 'hit'; kind: ObstacleKind; lostParcel: boolean }
  | { type: 'jump' }
  | { type: 'won' }
  | { type: 'lost' };

export interface RunState {
  cfg: LevelConfig;
  tuning: Tuning;
  seed: number;
  rngState: number;
  tick: number;
  /** Distance travelled. */
  dist: number;
  /** Target lane (0..2) and the rider's smoothed position between lanes. */
  lane: number;
  lx: number;
  /** Ticks left in the current jump, 0 when on the ground. */
  jumpT: number;
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
  /** Events produced by the most recent step. */
  events: SimEvent[];
}

export interface RunOptions {
  tuning?: Tuning;
  /** Turn off the spawner so tests can place objects by hand. */
  autoSpawn?: boolean;
}

export function createRun(cfg: LevelConfig, seed: number, opts: RunOptions = {}): RunState {
  const tuning = opts.tuning ?? TUNING;
  return {
    cfg,
    tuning,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    tick: 0,
    dist: 0,
    lane: 1,
    lx: 1,
    jumpT: 0,
    invulnT: 0,
    hearts: tuning.hearts,
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
    events: [],
  };
}

export const isEndless = (s: RunState) => s.cfg.goal === undefined;
export const seconds = (s: RunState) => s.tick / s.tuning.tickRate;

export function speed(s: RunState): number {
  const { v0, v1, ramp } = s.cfg;
  return v0 + (v1 - v0) * Math.min(1, seconds(s) / ramp);
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
  const o: Obj = { id: s.nextId++, kind, lane, z, done: false };
  s.objs.push(o);
  return o;
}

function applyCommand(s: RunState, cmd: Command) {
  if (cmd === 'left') s.lane = Math.max(0, s.lane - 1);
  else if (cmd === 'right') s.lane = Math.min(LANES - 1, s.lane + 1);
  else if (cmd === 'jump' && s.jumpT <= 0) {
    s.jumpT = s.tuning.jumpTicks;
    s.events.push({ type: 'jump' });
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
  if (s.carry > 0 && s.rows % t.dropEveryRows === 0) {
    addObj(s, 'drop', lanes[0], z);
  } else {
    const count = rng.next() < s.cfg.density ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const jitter = i ? rng.range(-t.pairJitter, t.pairJitter) : 0;
      addObj(s, rng.pick(s.cfg.kinds), lanes[i], z + jitter);
    }
    const open = lanes[2];
    if (rng.next() < t.parcelChance && s.carry < t.maxCarry) addObj(s, 'parcel', open, z + t.parcelOffset);
    else for (let c = 0; c < t.coinsPerRow; c++) addObj(s, 'coin', open, z + t.coinOffset + c * t.coinSpacing);
  }
  s.rngState = rng.state;
}

function collide(s: RunState, o: Obj) {
  const t = s.tuning;
  if (o.kind === 'coin') {
    o.done = true;
    s.coins++;
    s.events.push({ type: 'coin' });
  } else if (o.kind === 'parcel') {
    o.done = true;
    if (s.carry < t.maxCarry) {
      s.carry++;
      s.events.push({ type: 'parcel' });
    }
  } else if (o.kind === 'drop') {
    o.done = true;
    if (s.carry === 0) return;
    s.combo++;
    const coins = s.carry * t.coinsPerDelivery * Math.min(t.comboCap, s.combo);
    s.delivered += s.carry;
    s.coins += coins;
    s.events.push({ type: 'deliver', parcels: s.carry, coins, combo: s.combo });
    s.carry = 0;
    if (s.cfg.goal !== undefined && s.delivered >= s.cfg.goal) s.status = 'won';
  } else {
    if (s.invulnT > 0) return;
    if (JUMPABLE.has(o.kind) && airborne(s)) return;
    o.done = true;
    s.hearts--;
    s.invulnT = t.invulnTicks;
    s.combo = 0;
    const lostParcel = s.carry > 0;
    if (lostParcel) s.carry--;
    s.events.push({ type: 'hit', kind: o.kind, lostParcel });
    if (s.hearts <= 0) s.status = 'lost';
  }
}

/** Advance one fixed tick. Commands are applied before movement. */
export function step(s: RunState, cmds: readonly Command[] = []) {
  s.events = [];
  if (s.status !== 'running') return;
  const t = s.tuning;
  const dt = 1 / t.tickRate;
  for (const c of cmds) applyCommand(s, c);

  s.dist += speed(s) * dt;
  s.tick++;
  const follow = s.cfg.rain ? t.rainLaneFollow : t.laneFollow;
  s.lx += (s.lane - s.lx) * Math.min(1, dt * follow);
  if (Math.abs(s.lane - s.lx) < 1e-3) s.lx = s.lane;
  if (s.jumpT > 0) s.jumpT--;
  if (s.invulnT > 0) s.invulnT--;

  if (s.autoSpawn && s.dist >= s.nextRowAt) {
    spawnRow(s, s.dist + t.spawnAhead);
    s.nextRowAt = s.dist + Math.max(t.rowGapMin, t.rowGapStart - seconds(s) * t.rowGapShrinkPerSec);
  }

  const myLane = Math.round(s.lx);
  for (const o of s.objs) {
    if (o.done || o.lane !== myLane || Math.abs(o.z - s.dist) > t.hitWindow) continue;
    collide(s, o);
    if (s.status !== 'running') break;
  }
  s.objs = s.objs.filter(
    (o) => o.z - s.dist > -t.despawnBehind && !(o.done && (o.kind === 'coin' || o.kind === 'parcel')),
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
  while (s.status === 'running' && s.tick < maxTicks) {
    const cmds: Command[] = [];
    while (i < log.length && log[i][0] === s.tick) cmds.push(log[i++][1]);
    step(s, cmds);
  }
  return s;
}
