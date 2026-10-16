import { describe, expect, it } from 'vitest';
import { ENDLESS, LEVELS, TUNING } from './config';
import { Rng } from './rng';
import { addMover, addObj, addPower, airborne, hasPower, startDog, startThief, beatBest, carryCap, createRun, targetSpeed, replay, reviveStillOpen, score, speed, spawnRow, step, type Command, type InputLog } from './run';

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
  it('holds steady until a drop-off, then steps up toward v1', () => {
    const s = bare();
    expect(speed(s)).toBe(L1.v0);
    for (let i = 0; i < 600; i++) step(s); // ten seconds, no deliveries
    expect(speed(s)).toBe(L1.v0);
    s.delivered = 1; // L1 goal is 2: halfway
    expect(targetSpeed(s)).toBe(L1.v0 + (L1.v1 - L1.v0) / 2);
    step(s);
    expect(speed(s)).toBeGreaterThan(L1.v0);
    expect(speed(s)).toBeLessThan(targetSpeed(s)); // eases in, no sudden jump
    for (let i = 0; i < 120; i++) step(s);
    expect(speed(s)).toBe(targetSpeed(s));
  });

  it('in endless, ramps with time and adds a bump per drop-off, capped at v1', () => {
    const s = createRun(ENDLESS, 1, { autoSpawn: false });
    const base = targetSpeed(s);
    s.delivered = 2;
    expect(targetSpeed(s)).toBe(base + 2 * TUNING.endlessSpeedPerDrop);
    s.tick = Math.round(ENDLESS.ramp * TUNING.tickRate);
    expect(targetSpeed(s)).toBe(ENDLESS.v1);
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
    const s = bare(LEVELS.at(-1)); // goal 10, so the box limit of 3 applies
    for (let i = 0; i < 5; i++) addObj(s, 'parcel', 1, 200 + i * 100);
    rideTo(s, 700);
    expect(s.carry).toBe(TUNING.maxCarry);
  });

  it('never carries more parcels than the goal still needs', () => {
    const s = bare(); // L1 goal is 2
    expect(carryCap(s)).toBe(2);
    for (let i = 0; i < 3; i++) addObj(s, 'parcel', 1, 200 + i * 100);
    rideTo(s, 500);
    expect(s.carry).toBe(2);
    expect(s.objs.filter((o) => o.kind === 'parcel').length).toBe(1); // the third stays on the road
    s.delivered = 1;
    expect(carryCap(s)).toBe(1);
  });

  it('drops one parcel per home, with a combo bonus', () => {
    const s = bare();
    addObj(s, 'parcel', 1, 200);
    addObj(s, 'parcel', 1, 300);
    addObj(s, 'drop', 1, 500);
    rideTo(s, 600);
    expect(s.delivered).toBe(1);
    expect(s.carry).toBe(1);
    expect(s.status).toBe('running');
    addObj(s, 'drop', 1, 900);
    rideTo(s, 1000);
    expect(s.delivered).toBe(2);
    expect(s.status).toBe('won');
    expect(s.coins).toBe(10 * 1 + 10 * 2);
  });

  it('an empty box leaves the drop zone for later', () => {
    const s = bare();
    const drop = addObj(s, 'drop', 1, 200);
    rideTo(s, 300);
    expect(drop.done).toBe(false);
    expect(s.delivered).toBe(0);
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

describe('slowdowns', () => {
  it('riding over a pothole slows you down but costs no heart', () => {
    const s = bare();
    addObj(s, 'hole', 1, 200);
    while (!s.events.some((e) => e.type === 'bump')) step(s);
    expect(s.hearts).toBe(TUNING.hearts);
    expect(speed(s)).toBeLessThan(L1.v0 * 0.6);
    for (let i = 0; i < 40; i++) step(s);
    expect(speed(s)).toBeLessThan(L1.v0); // still recovering after two-thirds of a second
    for (let i = 0; i < 120; i++) step(s);
    expect(speed(s)).toBe(L1.v0); // back up to speed within about two seconds
  });

  it('jumping a speed breaker keeps your speed', () => {
    const s = bare(LEVELS[3]);
    addObj(s, 'bump', 1, 100);
    rideTo(s, 60, ['jump']);
    rideTo(s, 150);
    expect(speed(s)).toBe(LEVELS[3].v0);
  });
});

describe('brake', () => {
  const braky = () => createRun({ ...L1, brake: true }, 1, { autoSpawn: false });

  it('slows while held, never stops, and lets go to speed back up', () => {
    const s = braky();
    step(s, ['brakeOn']);
    for (let i = 0; i < 120; i++) step(s);
    expect(speed(s)).toBe(L1.v0 * TUNING.brakeFactor);
    expect(speed(s)).toBeGreaterThan(0);
    step(s, ['brakeOff']);
    for (let i = 0; i < 120; i++) step(s);
    expect(speed(s)).toBe(L1.v0);
  });

  it('does nothing before it unlocks', () => {
    const s = bare();
    step(s, ['brakeOn']);
    for (let i = 0; i < 60; i++) step(s);
    expect(s.braking).toBe(false);
    expect(speed(s)).toBe(L1.v0);
  });

  it('resets the combo', () => {
    const s = braky();
    s.combo = 2;
    step(s, ['brakeOn']);
    expect(s.combo).toBe(0);
  });
});

describe('moving threats', () => {
  const rng = () => new Rng(7);

  it('a person walks across every lane once you get close', () => {
    const s = bare();
    const w = addMover(s, rng(), 'walker', 0, 1000);
    const start = w.lane;
    rideTo(s, 500);
    expect(w.lane).not.toBe(start);
    expect(w.move?.to).toBe(2 - start);
  });

  it('a swerving auto flashes first, then changes lane', () => {
    const s = bare();
    const a = addMover(s, rng(), 'autoSwerve', 1, 900);
    expect(a.move).toBeDefined();
    while (a.move!.phase === 'wait') step(s);
    expect(a.move!.phase).toBe('warn');
    expect(a.lane).toBe(1);
    while (a.move!.phase !== 'done') step(s);
    expect(a.lane).toBe(a.move!.to);
    expect(Math.abs(a.lane - 1)).toBe(1);
  });

  it('a wrong-way scooter rides toward you', () => {
    const s = bare();
    const sc = addMover(s, rng(), 'scooter', 0, 1500);
    step(s);
    expect(sc.z).toBeLessThan(1500);
  });

  it('a slow cow ambles away, so you close on it slowly', () => {
    const s = bare();
    const cow = addMover(s, rng(), 'cowWalk', 2, 1000);
    step(s);
    expect(cow.z).toBeGreaterThan(1000);
  });
});

describe('dog chase', () => {
  it('gives up after a while if you hold your speed', () => {
    const s = bare();
    startDog(s);
    for (let i = 0; i < TUNING.dogTicks; i++) step(s);
    expect(s.dog).toBeNull();
    expect(s.hearts).toBe(TUNING.hearts);
  });

  it('catches you after a pothole, and that counts as a crash', () => {
    const s = bare();
    startDog(s);
    addObj(s, 'hole', 1, 60);
    addObj(s, 'hole', 1, 160);
    for (let i = 0; i < TUNING.dogTicks && s.dog; i++) step(s);
    expect(s.hearts).toBe(TUNING.hearts - 1);
  });

  it('gives up when you drop off a parcel', () => {
    const s = bare();
    s.carry = 1;
    startDog(s);
    addObj(s, 'drop', 1, 100);
    rideTo(s, 150);
    expect(s.dog).toBeNull();
  });
});

describe('power-ups', () => {
  const powered = () => createRun({ ...LEVELS.at(-1)!, goal: 50 }, 1, { autoSpawn: false });

  it('magnet pulls coins from every lane', () => {
    const s = powered();
    addPower(s, 'magnet', 1, 100);
    for (const lane of [0, 1, 2]) addObj(s, 'coin', lane, 400);
    rideTo(s, 420);
    expect(s.coins).toBe(3);
  });

  it('the net scoops parcels from the next lane', () => {
    const s = powered();
    addPower(s, 'net', 1, 100);
    addObj(s, 'parcel', 0, 400);
    addObj(s, 'parcel', 2, 500);
    rideTo(s, 520);
    expect(s.carry).toBe(2);
  });

  it('the helmet takes one hit, then the next one counts', () => {
    const s = powered();
    addPower(s, 'helmet', 1, 100);
    addObj(s, 'car', 1, 300);
    rideTo(s, 340);
    expect(s.hearts).toBe(TUNING.hearts);
    expect(s.shield).toBe(false);
    addObj(s, 'car', 1, 900);
    rideTo(s, 940);
    expect(s.hearts).toBe(TUNING.hearts - 1);
  });

  it('nitro speeds you up, rides through traffic and skims potholes, then runs out', () => {
    const s = powered();
    const cruise = targetSpeed(s);
    addPower(s, 'nitro', 1, 60);
    addObj(s, 'car', 1, 400);
    addObj(s, 'hole', 1, 700);
    rideTo(s, 720);
    expect(targetSpeed(s)).toBeCloseTo(cruise * TUNING.nitroBoost);
    expect(s.hearts).toBe(TUNING.hearts);
    expect(speed(s)).toBeGreaterThan(cruise);
    for (let i = 0; i < TUNING.powerTicks.nitro; i++) step(s);
    expect(hasPower(s, 'nitro')).toBe(false);
  });

  it('2× coins doubles coins and delivery pay', () => {
    const s = powered();
    s.carry = 1;
    addPower(s, 'double', 1, 60);
    addObj(s, 'coin', 1, 200);
    addObj(s, 'drop', 1, 400);
    rideTo(s, 450);
    expect(s.coins).toBe(2 + 20);
  });

  it('an extra heart only appears, and only helps, after you lose one', () => {
    const s = powered();
    addPower(s, 'heart', 1, 100);
    rideTo(s, 150);
    expect(s.hearts).toBe(TUNING.hearts); // capped
    const level = { ...LEVELS.at(-1)!, powers: ['heart' as const], powerChance: 1 };
    const full = createRun(level, 1, { autoSpawn: false });
    for (let r = 0; r < 20; r++) spawnRow(full, 1000);
    expect(full.objs.some((o) => o.kind === 'power')).toBe(false);
  });

  it('the area that introduces a power-up always shows it early', () => {
    const at = LEVELS.findIndex((l) => l.teachPower === 'magnet');
    const seen = createRun(LEVELS[at], 11);
    let found = false;
    for (let i = 0; i < 60 * 20 && !found; i++) {
      step(seen);
      found = seen.objs.some((o) => o.power === 'magnet');
    }
    expect(found).toBe(true);
  });
});

describe('shop mods', () => {
  it('an extra heart gives four hearts, and stars still cap at three', () => {
    const s = createRun(L1, 1, { autoSpawn: false, mods: { extraHeart: true } });
    expect(s.hearts).toBe(TUNING.hearts + 1);
    expect(s.maxHearts).toBe(TUNING.hearts + 1);
  });

  it('start boosts put a helmet on and light the nitro', () => {
    const s = createRun(L1, 1, { autoSpawn: false, mods: { startHelmet: true, startNitro: true } });
    expect(s.shield).toBe(true);
    expect(hasPower(s, 'nitro')).toBe(true);
  });

  it('upgrades make power-ups last longer, and replays with the same mods match', () => {
    const mods = { powerScale: { magnet: 1.6 } };
    const s = createRun(L1, 1, { autoSpawn: false, mods });
    addPower(s, 'magnet', 1, 60);
    rideTo(s, 80);
    expect(s.powers.magnet).toBeGreaterThan(TUNING.powerTicks.magnet);
    const log = scriptedLog(1800);
    const a = replay(ENDLESS, 5, log, 1800, { mods: { startNitro: true } });
    const b = replay(ENDLESS, 5, log, 1800, { mods: { startNitro: true } });
    expect(b.dist).toBe(a.dist);
    expect(b.coins).toBe(a.coins);
  });
});

describe('city features', () => {
  const late = () => createRun({ ...LEVELS.at(-1)!, goal: 50 }, 1, { autoSpawn: false });

  it('a puddle slows you a little and makes steering sluggish; jumping it keeps you dry', () => {
    const s = late();
    addObj(s, 'puddle', 1, 150);
    while (!s.events.some((e) => e.type === 'splash')) step(s);
    expect(s.wetT).toBeGreaterThan(0);
    expect(s.hearts).toBe(TUNING.hearts);
    const dry = late();
    addObj(dry, 'puddle', 1, 140);
    rideTo(dry, 60, ['jump']);
    rideTo(dry, 220);
    expect(dry.wetT).toBe(0);
  });

  it('a monkey grabs a parcel unless you jump, and never costs a heart', () => {
    const s = late();
    s.carry = 2;
    addObj(s, 'monkey', 1, 150);
    rideTo(s, 220);
    expect(s.carry).toBe(1);
    expect(s.hearts).toBe(TUNING.hearts);
    const j = late();
    j.carry = 2;
    addObj(j, 'monkey', 1, 140);
    rideTo(j, 60, ['jump']);
    rideTo(j, 220);
    expect(j.carry).toBe(2);
  });

  it('hot food tips when delivered in time, not once it has gone cold', () => {
    const s = late();
    addObj(s, 'parcel', 1, 100).hot = true;
    addObj(s, 'drop', 1, 600);
    rideTo(s, 650);
    expect(s.events.some((e) => e.type === 'tip') || s.coins > TUNING.coinsPerDelivery).toBe(true);
    const cold = late();
    addObj(cold, 'parcel', 1, 100).hot = true;
    rideTo(cold, 150);
    for (let i = 0; i < TUNING.hotTicks; i++) step(cold);
    expect(cold.hotCarry).toBe(0);
    addObj(cold, 'drop', 1, cold.dist + 200);
    const before = cold.coins;
    rideTo(cold, cold.dist + 260);
    expect(cold.coins - before).toBe(TUNING.coinsPerDelivery);
  });

  it('a construction zone barricades the same two lanes for a few rows', () => {
    const s = createRun({ ...LEVELS.at(-1)!, zoneChance: 1, threats: [], dogChance: 0 }, 3, { autoSpawn: false });
    for (let r = 0; r < TUNING.zoneRows; r++) spawnRow(s, 1000 + r * 400);
    const barriers = s.objs.filter((o) => o.kind === 'barrier');
    expect(barriers).toHaveLength(TUNING.zoneRows * 2);
    expect(new Set(barriers.map((o) => o.lane)).size).toBe(2);
  });

  it('a tram is long: its body still hits you after the front has passed', () => {
    const s = late();
    const tram = addMover(s, new Rng(1), 'tram', 1, 400);
    tram.len = TUNING.tramLen;
    s.invulnT = 0;
    s.lane = 0;
    s.lx = 0;
    while (tram.z > s.dist - 60) step(s);
    expect(s.hearts).toBe(TUNING.hearts); // passing in the next lane
    s.lane = 1;
    for (let i = 0; i < 12; i++) step(s);
    expect(s.hearts).toBe(TUNING.hearts - 1); // steered into its body
  });

  it('a festival crowd sends two people from opposite sides', () => {
    const s = createRun({ ...LEVELS.at(-1)!, threats: ['crowd'], threatChance: 1, dogChance: 0, zoneChance: 0, hazards: [] }, 2, { autoSpawn: false });
    spawnRow(s, 1500);
    const walkers = s.objs.filter((o) => o.kind === 'walker');
    expect(walkers).toHaveLength(2);
    expect(walkers[0].lane).toBe(2 - walkers[1].lane);
  });
});

describe('parcel thieves', () => {
  const carrying = () => {
    const s = createRun({ ...LEVELS.at(-1)!, goal: 50 }, 1, { autoSpawn: false });
    s.carry = 2;
    return s;
  };
  const toAlongside = (s: ReturnType<typeof carrying>) => {
    startThief(s, new Rng(4));
    while (s.thief?.phase === 'arrive') step(s);
  };
  const ending = (s: ReturnType<typeof carrying>) => {
    for (let i = 0; i < 200 && s.thief; i++) step(s);
  };

  it('swerving into the thief shoves it off and pays a bonus', () => {
    const s = carrying();
    toAlongside(s);
    const lane = s.thief!.lane;
    step(s, [lane < s.lane ? 'left' : 'right']);
    let shoved = false;
    for (let i = 0; i < 30 && s.thief; i++) {
      step(s);
      shoved ||= s.events.some((e) => e.type === 'thief' && e.phase === 'shove');
    }
    expect(shoved).toBe(true);
    expect(s.carry).toBe(2);
    expect(s.coins).toBe(TUNING.thiefShoveCoins);
  });

  it('staying beside it loses a parcel, which lands on the road ahead', () => {
    const s = carrying();
    toAlongside(s);
    const lane = s.thief!.lane;
    ending(s);
    expect(s.carry).toBe(1);
    const dropped = s.objs.find((o) => o.kind === 'parcel');
    expect(dropped?.lane).toBe(lane);
    expect(dropped!.z).toBeGreaterThan(s.dist);
    expect(s.hearts).toBe(TUNING.hearts);
  });

  it('moving a lane further away dodges it', () => {
    const s = carrying(); // rider in the middle lane, so the thief comes up on one side
    startThief(s, new Rng(4));
    const side = s.thief!.lane;
    while (s.thief?.phase === 'arrive') step(s);
    step(s, [side === 0 ? 'right' : 'left']);
    let dodged = false;
    for (let i = 0; i < 200 && s.thief; i++) {
      step(s);
      dodged ||= s.events.some((e) => e.type === 'thief' && e.phase === 'dodge');
    }
    expect(dodged).toBe(true);
    expect(s.carry).toBe(2);
  });

  it('nitro leaves the thief behind', () => {
    const s = carrying();
    startThief(s, new Rng(4));
    s.powers.nitro = 120;
    step(s);
    expect(s.thief).toBeNull();
    expect(s.carry).toBe(2);
  });

  it('only comes for you while you carry a parcel', () => {
    const level = { ...LEVELS.at(-1)!, thiefChance: 1, threats: [], dogChance: 0, zoneChance: 0, hazards: [] };
    const empty = createRun(level, 1, { autoSpawn: false });
    empty.tick = TUNING.thiefMinTick;
    spawnRow(empty, 1000);
    expect(empty.thief).toBeNull();
    const full = createRun(level, 1, { autoSpawn: false });
    full.tick = TUNING.thiefMinTick;
    full.carry = 1;
    spawnRow(full, 1000);
    expect(full.thief).not.toBeNull();
  });
});
