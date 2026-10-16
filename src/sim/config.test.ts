import { describe, expect, it } from 'vitest';
import levelsData from '../data/levels.json';
import { CITIES, LEVELS, OBSTACLES, difficultySample } from './config';

describe('city levels', () => {
  it('has 20 to 30 areas in every city, Bengaluru first', () => {
    expect(CITIES[0].id).toBe('bengaluru');
    expect(CITIES.length).toBeGreaterThanOrEqual(8);
    for (const c of CITIES) {
      expect(c.levels.length).toBeGreaterThanOrEqual(20);
      expect(c.levels.length).toBeLessThanOrEqual(30);
    }
  });

  it('gives every level a unique, stable id', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('bengaluru-koramangala');
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it('introduces obstacles one at a time at the start', () => {
    expect(LEVELS[0].kinds).toEqual(['auto']);
    expect(LEVELS[1].kinds).toEqual(['auto', 'car']);
    expect(LEVELS[2].kinds).toContain('hole');
    expect(LEVELS[3].kinds).toContain('cow');
    expect(LEVELS[0].rain || LEVELS[0].night).toBeFalsy();
  });

  it('gets harder through each city and never goes out of range', () => {
    for (const c of CITIES) {
      for (let i = 1; i < c.levels.length; i++) {
        const a = c.levels[i - 1], b = c.levels[i];
        expect(b.goal!).toBeGreaterThanOrEqual(a.goal!);
        expect(b.v0).toBeGreaterThanOrEqual(a.v0);
        expect(b.density).toBeGreaterThanOrEqual(a.density);
        expect(b.gap!).toBeLessThanOrEqual(a.gap!);
      }
    }
    for (const l of LEVELS) {
      expect(l.goal).toBeGreaterThanOrEqual(2);
      expect(l.goal).toBeLessThanOrEqual(20);
      expect(l.v1).toBeGreaterThan(l.v0);
      expect(l.density).toBeLessThanOrEqual(0.78);
      expect(l.gap).toBeGreaterThanOrEqual(0.68);
      expect(l.gap).toBeLessThanOrEqual(1);
      expect(l.kinds.every((k) => (OBSTACLES as readonly string[]).includes(k))).toBe(true);
    }
  });

  it('starts each new city easier than the previous city ended', () => {
    for (let i = 1; i < CITIES.length; i++) {
      const prevEnd = CITIES[i - 1].levels.at(-1)!, start = CITIES[i].levels[0];
      expect(start.v0).toBeLessThan(prevEnd.v0);
      expect(start.v0).toBeGreaterThan(CITIES[i - 1].levels[0].v0);
    }
  });

  it('ends every city on a night finale', () => {
    for (const c of CITIES) expect(c.levels.at(-1)!.night).toBe(true);
  });

  it('puts the top of the curve on the last area only', () => {
    expect(LEVELS).toHaveLength(200);
    expect(CITIES).toHaveLength(8);
    expect(LEVELS[0].v0).toBe(260);
    expect(LEVELS[0].goal).toBe(2);
    expect(LEVELS[1].goal).toBe(2);
    expect(LEVELS[1].v0).toBe(LEVELS[0].v0);
    const last = LEVELS.at(-1)!;
    const before = LEVELS.at(-2)!;
    expect(last.v0).toBeGreaterThan(before.v0);
    expect(last.density).toBeGreaterThan(before.density);
    expect(last.goal).toBe(20);
    expect(last.v0).toBe(500);
    expect(last.density).toBe(0.78);
  });

  it('ramps parcels by level 5, then eases the danger in', () => {
    expect(LEVELS[4].goal!).toBeGreaterThanOrEqual(LEVELS[1].goal! + 3);
    expect(LEVELS[4].v0).toBeGreaterThan(LEVELS[1].v0);
    expect(LEVELS[4].density).toBeGreaterThan(LEVELS[1].density);
    const knots = levelsData.curve.knots;
    const slopes = (key: 'goal' | 'danger') =>
      knots.slice(1).map((hi, i) => (hi[key] - knots[i][key]) / (hi.d - knots[i].d));
    const danger = slopes('danger');
    // Shelf, then the area-5 step, then an ease-in (each later segment is steeper).
    expect(danger[0]).toBe(0);
    for (let i = 3; i < danger.length; i++) expect(danger[i]).toBeGreaterThan(danger[i - 1]);
    const goal = slopes('goal');
    const step = goal[1];
    expect(step).toBeGreaterThan(Math.max(...goal.filter((_, i) => i !== 1)));
    expect(difficultySample()).toEqual([
      { level: 1, city: 'Bengaluru', area: 'Koramangala', goal: 2, v0: 260, v1: 360, density: 0.15, gap: 1, copChance: 0 },
      { level: 5, city: 'Bengaluru', area: 'BTM Layout', goal: 6, v0: 294, v1: 414, density: 0.24, gap: 0.96, copChance: 0 },
      { level: 10, city: 'Bengaluru', area: 'Ulsoor', goal: 8, v0: 314, v1: 445, density: 0.29, gap: 0.93, copChance: 0.06 },
      { level: 20, city: 'Bengaluru', area: 'Electronic City', goal: 12, v0: 362, v1: 522, density: 0.42, gap: 0.86, copChance: 0.06 },
      { level: 50, city: 'Mumbai', area: 'Colaba', goal: 14, v0: 401, v1: 583, density: 0.52, gap: 0.81, copChance: 0.08 },
      { level: 100, city: 'Hyderabad', area: 'Charminar', goal: 16, v0: 434, v1: 636, density: 0.61, gap: 0.77, copChance: 0.12 },
      { level: 200, city: 'Ahmedabad', area: 'Manek Chowk', goal: 20, v0: 500, v1: 740, density: 0.78, gap: 0.68, copChance: 0.22 },
    ]);
  });
});

describe('traffic cop schedule', () => {
  it('starts at Bengaluru area 8, with one scripted appearance, then grows', () => {
    expect(LEVELS.slice(0, 7).every((l) => l.copChance === undefined && !l.teachCop)).toBe(true);
    const first = LEVELS[7];
    expect(first.city).toBe('Bengaluru');
    expect(first.name).toBe('JP Nagar');
    expect(first.teachCop).toBe(true);
    expect(first.copChance).toBeUndefined();
    expect(first.copPatrol).toBeUndefined();
    const later = LEVELS.slice(8);
    expect(later.every((l) => (l.copChance ?? 0) > 0)).toBe(true);
    for (let i = 1; i < later.length; i++) {
      expect(later[i].copChance!).toBeGreaterThanOrEqual(later[i - 1].copChance!);
    }
    expect(LEVELS[48].copPatrol).toBeUndefined();
    expect(LEVELS[49].copPatrol).toBe(true);
    expect(LEVELS.at(-1)!.copPatrol).toBe(true);
    expect(LEVELS.at(-1)!.copChance).toBeGreaterThan(LEVELS[8].copChance!);
  });
});

describe('threat schedule', () => {
  const bengaluru = CITIES[0].levels;
  const intro = (kind: string) => LEVELS.findIndex((l) => l.threats?.includes(kind as never));

  it('keeps the first five areas free of moving threats', () => {
    for (const l of bengaluru.slice(0, 5)) expect(l.threats).toBeUndefined();
  });

  it('introduces each threat in its planned Bengaluru area, alone', () => {
    const plan: Array<[string, string]> = [
      ['walker', 'Malleshwaram'],
      ['cowWalk', 'JP Nagar'],
      ['autoSwerve', 'Frazer Town'],
      ['dog', 'Banashankari'],
      ['scooter', 'Marathahalli'],
    ];
    for (const [kind, area] of plan) {
      const l = LEVELS[intro(kind)];
      expect(l.name).toBe(area);
      expect(l.threats).toEqual([kind]);
      expect(l.tip.startsWith('New:')).toBe(true);
      expect(l.rain || l.night).toBeFalsy();
    }
  });

  it('follows each new threat with a calmer area', () => {
    const at = intro('autoSwerve');
    const later = LEVELS[at + 1];
    const peer = LEVELS[at + 4]; // at + 3 is itself the breather after the dog
    expect(later.threatChance!).toBeLessThan(peer.threatChance!);
  });

  it('keeps the brake out of Bengaluru and unlocks it in Mumbai', () => {
    for (const l of bengaluru) expect(l.brake).toBeUndefined();
    const first = LEVELS.findIndex((l) => l.brake);
    expect(LEVELS[first].city).toBe('Mumbai');
    expect(LEVELS[first].tip).toMatch(/brake/i);
    expect(LEVELS.slice(first).every((l) => l.brake)).toBe(true);
  });

  it('allows one moving threat at a time until Hyderabad', () => {
    const hyd = LEVELS.findIndex((l) => l.city === 'Hyderabad');
    expect(LEVELS.slice(0, hyd).every((l) => (l.maxMovers ?? 1) === 1)).toBe(true);
    expect(LEVELS[hyd].maxMovers).toBe(2);
  });
});

describe('city signature features', () => {
  it('each city after Bengaluru introduces its feature in area 3, with a tip', () => {
    for (const c of CITIES.slice(1)) {
      const l = c.levels[2];
      expect(l.tip.startsWith('New:')).toBe(true);
      expect(l.rain || l.night).toBeFalsy();
    }
    expect(CITIES[1].levels[2].hazards).toEqual(['puddle']);
    expect(CITIES[2].levels[2].fog).toBe(true);
    expect(CITIES[3].levels[2].zoneChance).toBeGreaterThan(0);
    expect(CITIES[4].levels[2].hotChance).toBeGreaterThan(0);
    expect(CITIES[5].levels[2].hazards).toEqual(['monkey']);
    expect(CITIES[6].levels[2].tramLane).toBeDefined();
    expect(CITIES[7].levels[2].threats).toEqual(['crowd']);
  });

  it('keeps fog in Delhi and trams in Kolkata; carries the rest forward', () => {
    for (const l of LEVELS) {
      if (l.fog) expect(l.city).toBe('Delhi');
      if (l.tramLane !== undefined) expect(l.city).toBe('Kolkata');
    }
    const last = LEVELS.at(-1)!;
    expect(last.hazards).toEqual(['puddle', 'monkey']);
    expect(last.zoneChance).toBeGreaterThan(0);
    expect(last.hotChance).toBeGreaterThan(0);
    expect(last.threats).toContain('crowd');
    for (const l of CITIES[0].levels) {
      expect(l.hazards ?? l.fog ?? l.zoneChance ?? l.hotChance ?? l.tramLane).toBeUndefined();
    }
  });
});

describe('parcel thieves schedule', () => {
  it('first come in Hyderabad, area 6, and carry on after', () => {
    const first = LEVELS.findIndex((l) => (l.thiefChance ?? 0) > 0);
    expect(LEVELS[first].city).toBe('Hyderabad');
    expect(CITIES[3].levels.indexOf(LEVELS[first]) + 1).toBe(6);
    expect(LEVELS[first].tip).toMatch(/thie/i);
    expect(LEVELS.slice(first).every((l) => (l.thiefChance ?? 0) > 0)).toBe(true);
  });
});
