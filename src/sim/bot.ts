// A simple, deterministic rider used by the balance check. It is not part of the game.
// It looks a short way down the road, changes lanes to stay alive, jumps holes, and
// prefers parcels and DROP zones when the lane is safe. Commands wait a fixed number of
// ticks, and a lane change is queued only once, so the delay cannot stack into a swerve.
import { JUMPABLE, type LevelConfig } from './config';
import { carryCap, createRun, speed, step, type Command, type Obj, type RunState } from './run';

/** Ticks between a decision and the command reaching the sim. */
export const REACTION_TICKS = 8;

const REWARD = new Set(['coin', 'parcel', 'drop', 'power']);

export interface Attempt {
  status: 'won' | 'lost' | 'timeout';
  hearts: number;
  hits: number;
  ticks: number;
  delivered: number;
  goal: number;
}

function clampLane(lane: number): number {
  return Math.max(0, Math.min(2, lane));
}

/** Lane the rider is already committed to, including commands that have not fired yet. */
function pendingLane(s: RunState, queue: readonly (Command | null)[]): number {
  let lane = s.lane;
  for (const cmd of queue) {
    if (cmd === 'left') lane--;
    else if (cmd === 'right') lane++;
  }
  return clampLane(lane);
}

/** Lanes a threat holds now and will hold when the rider reaches it. */
function lanesOf(s: RunState, o: Obj, spd: number): number[] {
  const m = o.move;
  if (!m || m.phase === 'done') return [o.lane];
  const rel = o.z - s.dist;
  const closing = Math.max(1, spd - o.vz);
  const arrive = Math.max(0, rel) / closing;
  const delay =
    m.phase === 'wait' ? Math.max(0, rel - m.trigger) / closing + m.warnTicks / s.tuning.tickRate
    : m.phase === 'warn' ? m.warnLeft / s.tuning.tickRate
    : 0;
  const travel = Math.max(0, arrive - delay) * m.laneSpeed;
  const dir = Math.sign(m.to - o.lx);
  const later = Math.round(dir > 0 ? Math.min(m.to, o.lx + travel) : Math.max(m.to, o.lx - travel));
  return later === o.lane ? [o.lane] : [o.lane, later];
}

function decide(s: RunState, queue: readonly (Command | null)[]): Command | null {
  const t = s.tuning;
  const spd = Math.max(1, speed(s));
  // Look about a second ahead in time, so oncoming scooters are seen earlier than parked cars.
  const reach = (o: Obj) => (o.z - s.dist) / Math.max(1, spd - o.vz);
  const ahead = s.objs.filter((o) => !o.done && o.z - s.dist > -t.hitWindow && reach(o) < 1.15 + t.hitWindow / spd);
  const threats = (lane: number) =>
    ahead.filter((o) => !REWARD.has(o.kind) && lanesOf(s, o, spd).includes(lane)).sort((a, b) => a.z - b.z);
  const nearest = (lane: number) => threats(lane)[0];
  const blocked = (lane: number) => {
    const n = nearest(lane);
    return !!n && !JUMPABLE.has(n.kind);
  };
  const closest = (lanes: number[], from: number) =>
    [...lanes].sort((a, b) => Math.abs(a - from) - Math.abs(b - from) || a - b)[0];

  const committed = pendingLane(s, queue);
  let desired = committed;
  const drops = ahead.filter((o) => o.kind === 'drop').sort((a, b) => a.z - b.z);
  const parcels = ahead.filter((o) => o.kind === 'parcel').sort((a, b) => a.z - b.z);
  const pickOpen = (objs: Obj[]) => objs.find((o) => !blocked(o.lane)) ?? objs[0];
  if (s.carry > 0 && drops.length) desired = pickOpen(drops).lane;
  else if (s.carry < carryCap(s) && parcels.length) desired = pickOpen(parcels).lane;
  else {
    const powers = ahead.filter((o) => o.kind === 'power' && !blocked(o.lane)).sort((a, b) => a.z - b.z);
    if (powers.length) desired = powers[0].lane;
  }
  if (blocked(desired)) {
    const open = [0, 1, 2].filter((lane) => !blocked(lane));
    desired = open.length
      ? closest(open, committed)
      : [0, 1, 2].sort((a, b) => (nearest(b)?.z ?? 1e9) - (nearest(a)?.z ?? 1e9))[0];
  }

  const here = nearest(committed);
  if (here && !JUMPABLE.has(here.kind)) {
    const open = [0, 1, 2].filter((lane) => lane !== committed && !blocked(lane));
    if (open.length) desired = closest(open, committed);
  }

  const jumpQueued = queue.includes('jump') || s.jumpT > 0;
  const threat = nearest(Math.round(s.lx));
  if (!jumpQueued && threat && JUMPABLE.has(threat.kind) && Math.round(s.lx) === committed) {
    const dz = threat.z - s.dist;
    const react = spd * (REACTION_TICKS / t.tickRate);
    const arm = spd * (t.airFromTick / t.tickRate);
    const ideal = react + arm;
    const slack = spd * (10 / t.tickRate);
    if (dz > ideal - slack && dz < ideal + slack) return 'jump';
  }

  // Crossing two lanes passes through the middle one. Wait if something blocks it.
  if (Math.abs(desired - committed) === 2 && blocked(1) && !blocked(committed)) desired = committed;

  // Where the brake is unlocked, hold it when every lane ahead is blocked; let go once clear.
  if (s.cfg.brake) {
    const allBlocked = [0, 1, 2].every((lane) => blocked(lane));
    const queuedBrake = queue.includes('brakeOn');
    if (allBlocked && !s.braking && !queuedBrake) return 'brakeOn';
    if (!allBlocked && (s.braking || queuedBrake) && !queue.includes('brakeOff')) return 'brakeOff';
  }

  if (desired < committed) return 'left';
  if (desired > committed) return 'right';
  return null;
}

/** Ride one level until it ends, the rider is out of hearts, or the tick cap is hit. */
export function playLevel(cfg: LevelConfig, seed: number, maxTicks = 60 * 150): Attempt {
  const s = createRun(cfg, seed);
  const queue: Array<Command | null> = [];
  let hits = 0;
  while (s.status === 'running' && s.tick < maxTicks) {
    queue.push(decide(s, queue));
    const cmd = queue.length > REACTION_TICKS ? queue.shift()! : null;
    step(s, cmd ? [cmd] : []);
    for (const e of s.events) if (e.type === 'hit') hits++;
  }
  return {
    status: s.status === 'running' ? 'timeout' : s.status,
    hearts: s.hearts,
    hits,
    ticks: s.tick,
    delivered: s.delivered,
    goal: cfg.goal ?? 0,
  };
}
