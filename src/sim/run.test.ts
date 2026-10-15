import { describe, expect, it } from 'vitest';
import { ENDLESS, LEVELS, TUNING } from './config';
import { Rng } from './rng';
import { addObj, airborne, beatBest, createRun, replay, reviveStillOpen, score, speed, spawnRow, step, type Command, type InputLog } from './run';

const L1 = LEVELS[0];
const ALL_KINDS = LEVELS[3];

/** A run with no spawner, so each test places exactly what it needs. */
const bare = (cfg = L1) => createRun(cfg, 1, { autoSpawn: false });

/** Step until the rider has passed z, applying cmds on the first tick. */
function rideTo(s: ReturnType<typeof bare>, z: number, cmds: Command[] = []) {
  step(s, cmds);
  while (s.dist < z && s.status === 'running') step(s);
}

/** A busy, mechanical input pattern to exercise every command. */
function scriptedLog(ticks: number): InputLog {
  const log: InputLog = [];
  const cmds: Command[] = ['left', 'jump', 'right', 'right', 'jump', 'left'];
  for (let t = 10, i = 0; t < ticks; t += 23, i++) log.push([t, cmds[i % cmds.length]]);
  return log;
}

describe('Rng', () => {
  it('is deterministic per seed and stays in range', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43);
    const xs = Array.from({ length: 1000 }, () => a.next());
    expect(Array.from({ length: 1000 }, () => b.next())).toEqual(xs);
    expect(c.next()).not.toBe(xs[0]);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('determinism', () => {
  it('same seed, level and inputs give the same run', () => {
    const log = scriptedLog(3600);
    const a = replay(ENDLESS, 7, log, 3600);
    const b = replay(ENDLESS, 7, log, 3600);
    const pick = (s: typeof a) => ({ tick: s.tick, dist: s.dist, coins: s.coins, hearts: s.hearts, delivered: s.delivered, rng: s.rngState, objs: s.objs });
    expect(pick(b)).toEqual(pick(a));
  });

  it('different seeds lay out different roads', () => {
    const a = replay(ENDLESS, 1, [], 600);
    const b = replay(ENDLESS, 2, [], 600);
    expect(a.objs.map((o) => `${o.kind}${o.lane}`)).not.toEqual(b.objs.map((o) => `${o.kind}${o.lane}`));
  });
});

describe('spawner', () => {
  it('never blocks all three lanes in a row', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = createRun(ALL_KINDS, seed, { autoSpawn: false });
      for (let r = 0; r < 50; r++) {
        s.objs = [];
        spawnRow(s, 1000);
        const blocked = new Set(s.objs.filter((o) => !['coin', 'parcel', 'drop'].includes(o.kind)).map((o) => o.lane));
        expect(blocked.size).toBeLessThanOrEqual(2);
      }
    }
  });

  it('only uses obstacle kinds the level allows', () => {
    const run = createRun(L1, 3, { autoSpawn: false });
    for (let r = 0; r < 300; r++) spawnRow(run, 1000);
    const seen = new Set(run.objs.map((o) => o.kind));
    expect(seen.has('auto')).toBe(true);
    for (const k of ['car', 'cow', 'hole', 'bump'] as const) expect(seen.has(k)).toBe(false);
  });

  it('places a drop zone while the rider carries parcels', () => {
    const s = createRun(L1, 5, { autoSpawn: false });
    s.carry = 1;
    for (let r = 0; r < TUNING.dropEveryRows; r++) spawnRow(s, 1000);
    expect(s.objs.some((o) => o.kind === 'drop')).toBe(true);
  });
});

describe('speed', () => {
  it('ramps from v0 to v1 and then holds', () => {
    const s = bare();
    expect(speed(s)).toBe(L1.v0);
    s.tick = Math.round(L1.ramp * TUNING.tickRate);
    expect(speed(s)).toBe(L1.v1);
    s.tick *= 3;
    expect(speed(s)).toBe(L1.v1);
  });
});

describe('lanes', () => {
  it('moves between the three lanes and stops at the edges', () => {
    const s = bare();
    step(s, ['left', 'left', 'left']);
    expect(s.lane).toBe(0);
    for (let i = 0; i < 60; i++) step(s);
    expect(s.lx).toBe(0);
    step(s, ['right', 'right', 'right']);
    expect(s.lane).toBe(2);
  });
});

describe('pickups and deliveries', () => {
  it('collects parcels up to the carry limit', () => {
    const s = bare();
    for (let i = 0; i < 5; i++) addObj(s, 'parcel', 1, 200 + i * 100);
    rideTo(s, 700);
    expect(s.carry).toBe(TUNING.maxCarry);
  });

  it('delivers everything carried at a drop zone, with a combo bonus', () => {
    const s = bare();
    addObj(s, 'parcel', 1, 200);
    addObj(s, 'drop', 1, 400);
    addObj(s, 'parcel', 1, 600);
    addObj(s, 'parcel', 1, 700);
    addObj(s, 'drop', 1, 900);
    rideTo(s, 1000);
    expect(s.delivered).toBe(3); // passes L1's goal of 2, so the run is won
    expect(s.status).toBe('won');
    expect(s.coins).toBe(1 * 10 * 1 + 2 * 10 * 2);
  });

  it('collects coins in your lane only', () => {
    const s = bare();
    addObj(s, 'coin', 1, 200);
    addObj(s, 'coin', 0, 300);
    rideTo(s, 400);
    expect(s.coins).toBe(1);
  });
});

describe('hits', () => {
  it('costs a heart and a carried parcel, then grants brief invulnerability', () => {
    const s = bare();
    addObj(s, 'parcel', 1, 200);
    addObj(s, 'auto', 1, 400);
    addObj(s, 'car', 1, 450); // inside the invulnerability window
    rideTo(s, 500);
    expect(s.hearts).toBe(TUNING.hearts - 1);
    expect(s.carry).toBe(0);
    expect(s.combo).toBe(0);
  });

  it('a jump clears potholes and speed breakers but not cows', () => {
    const s = bare(ALL_KINDS);
    addObj(s, 'hole', 1, 100);
    rideTo(s, 60, ['jump']);
    expect(airborne(s)).toBe(true);
    rideTo(s, 150);
    expect(s.hearts).toBe(3);

    const c = bare(ALL_KINDS);
    addObj(c, 'cow', 1, 100);
    rideTo(c, 60, ['jump']);
    rideTo(c, 150);
    expect(c.hearts).toBe(2);
  });

  it('ends the run when the last heart is lost', () => {
    const s = bare();
    for (let i = 0; i < 3; i++) addObj(s, 'auto', 1, 200 + i * 600);
    rideTo(s, 2000);
    expect(s.status).toBe('lost');
    expect(s.hearts).toBe(0);
  });

  it('revives once, and a coin revive spends the configured cost', () => {
    const crash = () => {
      const s = bare();
      s.coins = TUNING.reviveCost;
      for (let i = 0; i < 3; i++) addObj(s, 'auto', 1, 200 + i * 600);
      while (s.status === 'running') step(s);
      return s;
    };
    const ad = crash();
    expect(ad.tick).toBeGreaterThan(0);
    step(ad, ['revive']);
    expect(ad.status).toBe('running');
    expect(ad.hearts).toBe(TUNING.reviveHearts);
    expect(ad.revived).toBe(true);
    expect(ad.coins).toBe(TUNING.reviveCost);
    step(ad, ['revive']);
    expect(ad.hearts).toBe(TUNING.reviveHearts);

    const paid = crash();
    step(paid, ['reviveCoins']);
    expect(paid.status).toBe('running');
    expect(paid.coins).toBe(0);
    const poor = crash();
    poor.coins = TUNING.reviveCost - 1;
    step(poor, ['reviveCoins']);
    expect(poor.status).toBe('lost');

    const running = bare();
    step(running, ['revive']);
    expect(running.revived).toBe(false);
  });

  it('a tied endless score is not a new record, and a revive stays open while it can continue', () => {
    expect(beatBest(80, 80)).toBe(false);
    expect(beatBest(81, 80)).toBe(true);
    const lost = bare();
    lost.status = 'lost';
    lost.coins = TUNING.reviveCost;
    expect(reviveStillOpen(lost, false)).toBe(true);
    lost.coins = TUNING.reviveCost - 1;
    expect(reviveStillOpen(lost, true)).toBe(true);
    expect(reviveStillOpen(lost, false)).toBe(false);
    lost.revived = true;
    expect(reviveStillOpen(lost, true)).toBe(false);
    const won = bare();
    won.status = 'won';
    expect(reviveStillOpen(won, true)).toBe(false);
  });

  it('replay reproduces a revive on the tick the run was lost', () => {
    const death = replay(ENDLESS, 3, [], 60 * 60 * 10);
    expect(death.status).toBe('lost');
    const log: InputLog = [[death.tick, 'revive']];
    const a = replay(ENDLESS, 3, log, death.tick + 20);
    const b = replay(ENDLESS, 3, log, death.tick + 20);
    expect(a.status).toBe('running');
    expect(a.revived).toBe(true);
    expect(a.hearts).toBe(TUNING.reviveHearts);
    expect(b.tick).toBe(a.tick);
    expect(b.hearts).toBe(a.hearts);
    expect(b.dist).toBe(a.dist);
  });
});

describe('endless', () => {
  it('scores coins + deliveries + distance as an integer', () => {
    const s = createRun(ENDLESS, 1, { autoSpawn: false });
    s.coins = 12;
    s.delivered = 3;
    s.dist = 1234.5;
    expect(score(s)).toBe(12 + 15 + 12);
  });

  it('a run with no input eventually ends', () => {
    const s = replay(ENDLESS, 9, [], 60 * 60 * 10);
    expect(s.status).toBe('lost');
  });
});
