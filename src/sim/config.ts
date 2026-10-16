import citiesData from '../data/cities.json';
import levelsData from '../data/levels.json';
import tuningData from '../data/tuning.json';

export const OBSTACLES = ['auto', 'car', 'cow', 'hole', 'bump', 'puddle', 'monkey', 'barrier'] as const;
export type ObstacleKind = (typeof OBSTACLES)[number];
/** Obstacles that move: along the road, across lanes, or both. */
export const MOVERS = ['walker', 'cowWalk', 'autoSwerve', 'scooter', 'tram'] as const;
export type MoverKind = (typeof MOVERS)[number];
/** Everything that can be scheduled as a threat: the movers plus the chasing dog. */
/** 'crowd' places two people crossing from both sides; 'dog' is a chase. Trams come from tramChance. */
export type ThreatKind = Exclude<MoverKind, 'tram'> | 'dog' | 'crowd';
/** Pickups on the road. Timed ones run down; the helmet waits for a hit; a heart is instant. */
export const POWERS = ['magnet', 'net', 'helmet', 'nitro', 'double', 'heart'] as const;
export type PowerKind = (typeof POWERS)[number];
export type TimedPower = 'magnet' | 'net' | 'nitro' | 'double';
export type ObjKind = ObstacleKind | MoverKind | 'parcel' | 'coin' | 'drop' | 'power';
/** What hit the rider: any obstacle, a mover, or the dog catching up. */
export type HitKind = ObstacleKind | MoverKind | 'dog';

/**
 * Low obstacles can be jumped. Potholes, speed breakers and puddles slow you down instead of
 * costing a heart; a monkey grabs a parcel instead.
 */
export const JUMPABLE: ReadonlySet<ObjKind> = new Set(['hole', 'bump', 'puddle', 'monkey']);
export type CityFeature = 'puddle' | 'fog' | 'zone' | 'hot' | 'monkey' | 'tram' | 'crowd' | 'thief';
export const isMover = (k: ObjKind): k is MoverKind => (MOVERS as readonly string[]).includes(k);

export interface LevelConfig {
  id: string;
  name: string;
  tip: string;
  /** Parcels to deliver. Absent means endless. */
  goal?: number;
  /** Speed (world units/s) at start and after `ramp` seconds. */
  v0: number;
  v1: number;
  ramp: number;
  /** Chance a row has two obstacles instead of one. */
  density: number;
  kinds: ObstacleKind[];
  rain?: boolean;
  night?: boolean;
  /** Moving threats that can appear. 'dog' is a chase, not a road object. */
  threats?: ThreatKind[];
  /** Share of rows that carry a moving threat. */
  threatChance?: number;
  /** Most moving threats ahead of the rider at once. */
  maxMovers?: number;
  /** Chance per row that a dog starts chasing, when none is. */
  dogChance?: number;
  /** The brake works in this level. It unlocks after the first city. */
  brake?: boolean;
  /** Jumpable hazards (puddles, monkeys) placed in the open lane, and how often. */
  hazards?: Array<'puddle' | 'monkey'>;
  hazardChance?: number;
  /** Delhi's fog: the far road fades out. Visual only. */
  fog?: boolean;
  /** Chance per row that a construction zone starts (two lanes barricaded for a few rows). */
  zoneChance?: number;
  /** Share of parcels that are hot food and pay a tip if delivered quickly. */
  hotChance?: number;
  /** Kolkata: the lane with tram rails, and the chance per row that a tram comes down it. */
  tramLane?: number;
  tramChance?: number;
  /** Chance per row that a rival rider comes for a parcel (only while carrying). */
  thiefChance?: number;
  /** Power-ups that can appear, the share of reward slots that hold one, and the one this area introduces. */
  powers?: PowerKind[];
  powerChance?: number;
  teachPower?: PowerKind;
  /** City id and display name, for city levels. */
  cityId?: string;
  city?: string;
}

export interface City {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  levels: LevelConfig[];
}

export type Tuning = typeof tuningData;
export const TUNING: Tuning = tuningData;
export const ENDLESS: LevelConfig = levelsData.endless as LevelConfig;

type CityData = (typeof citiesData.cities)[number] & { rainEvery?: number };
type LevelsData = typeof levelsData;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lerp = ([lo, hi]: number[], t: number) => lo + (hi - lo) * t;

/**
 * Build every city's levels from the area lists and one difficulty curve. Level ids are
 * `city-area` slugs, so saved stars survive reordering or adding areas.
 */
export function buildCities(cities: CityData[], data: LevelsData = levelsData): City[] {
  const { curve, intro, weather, tips, threats } = data;
  const schedule = threats.schedule as { at: number; kind: ThreatKind; tip: string }[];
  const powerSchedule = data.powers.schedule as { at: number; kind: PowerKind; tip: string }[];
  const ct = data.cityThreats;
  const citySchedule = ct.schedule as { at: number; feature: CityFeature; tip: string }[];
  const allKinds = intro[intro.length - 1].kinds as ObstacleKind[];
  let global = 0;
  return cities.map((c, ci) => {
    const n = c.areas.length;
    const levels = c.areas.map((area, ai): LevelConfig => {
      const g = global++;
      const d = Math.min(1, ci * curve.cityStep + (n > 1 ? ai / (n - 1) : 0) * curve.areaSpan);
      const finale = ai === n - 1;
      const inIntro = g < intro.length;
      const cityTeach = citySchedule.find((u) => u.at === g);
      const has = (f: CityFeature) => citySchedule.some((u) => u.feature === f && u.at <= g);
      const teaching = (f: CityFeature) => cityTeach?.feature === f;
      // Puddles and monkeys sit in the open lane on top of normal traffic.
      const hazards = (['puddle', 'monkey'] as const).filter((f) => has(f));
      const hazardTeach = hazards.some((f) => teaching(f));
      const fog = c.id === ct.fogCity && has('fog') && (teaching('fog') || (ai + 1) % ct.fogEvery === 0);
      const tram = c.id === ct.tramCity && has('tram');
      const crowd = has('crowd');
      // Weather waits until new players have settled in (the first eight Bengaluru areas).
      // ...and an area that introduces a city's feature stays dry and in daylight.
      const calm = inIntro || g < weather.from || !!cityTeach;
      const rain = !calm && (ai + 1) % (c.rainEvery ?? weather.rainEvery) === 0;
      const night = !calm && (finale || (ai + 1) % weather.nightEvery === 0);
      const v0 = Math.round(lerp(curve.v0, d));
      // Threats unlocked so far. The unlock area teaches its threat alone; the next is a breather.
      const teach = schedule.find((u) => u.at === g);
      const breather = schedule.some((u) => u.at === g - 1);
      const unlocked = schedule.filter((u) => u.at <= g).map((u) => u.kind);
      const levelThreats: ThreatKind[] = teach ? [teach.kind] : teaching('crowd') ? ['crowd'] : crowd ? [...unlocked, 'crowd'] : unlocked;
      const movers = levelThreats.filter((k) => k !== 'dog');
      const hasDog = levelThreats.includes('dog');
      const baseChance = lerp(threats.chance, d) * (breather ? threats.breatherScale : 1);
      const threatChance = teach ? (movers.length ? threats.teachChance : 0) : movers.length ? baseChance : 0;
      const dogChance = !hasDog ? 0 : teach ? threats.teachDogChance : threats.dogChance * (breather ? threats.breatherScale : 1);
      const brakeIntro = g === data.brake.at;
      const powerTeach = powerSchedule.find((u) => u.at === g);
      const powers = powerSchedule.filter((u) => u.at <= g).map((u) => u.kind);
      const tip = inIntro ? intro[g].tip
        : cityTeach ? cityTeach.tip
        : teach ? teach.tip
        : powerTeach ? powerTeach.tip
        : brakeIntro ? data.brake.tip
        : finale ? weather.finaleTip
        : ai === 0 ? c.tagline
        : rain ? weather.rainTip
        : night ? weather.nightTip
        : tips[g % tips.length];
      return {
        id: `${c.id}-${slug(area)}`,
        name: area,
        tip,
        goal: Math.round(lerp(curve.goal, d)),
        v0,
        v1: v0 + Math.round(lerp(curve.v1Gap, d)),
        ramp: curve.ramp,
        density: Math.round(lerp(curve.density, d) * 100) / 100,
        kinds: inIntro ? (intro[g].kinds as ObstacleKind[]) : allKinds,
        ...(hazards.length && {
          hazards: hazardTeach ? hazards.filter((f) => teaching(f)) : [...hazards],
          hazardChance: hazardTeach ? ct.teachHazardChance : ct.hazardChance,
        }),
        ...(rain && { rain }),
        ...(night && { night }),
        ...(levelThreats.length && {
          threats: levelThreats,
          threatChance: Math.round(threatChance * 100) / 100,
          maxMovers: g >= threats.twoMoversFrom ? 2 : 1,
          dogChance,
        }),
        ...(g >= data.brake.at && { brake: true }),
        ...(fog && { fog }),
        ...(has('zone') && { zoneChance: teaching('zone') ? ct.teachZoneChance : ct.zoneChance }),
        ...(has('thief') && { thiefChance: teaching('thief') ? ct.teachThiefChance : ct.thiefChance }),
        ...(has('hot') && { hotChance: teaching('hot') ? ct.teachHotChance : ct.hotChance }),
        ...(tram && { tramLane: ai % 2 === 0 ? 0 : 2, tramChance: teaching('tram') ? ct.teachTramChance : ct.tramChance }),
        ...(powers.length && {
          powers,
          powerChance: powerTeach ? data.powers.teachChance : data.powers.chance,
          ...(powerTeach && { teachPower: powerTeach.kind }),
        }),
        cityId: c.id,
        city: c.name,
      };
    });
    return { id: c.id, name: c.name, emoji: c.emoji, tagline: c.tagline, levels };
  });
}

export const CITIES: City[] = buildCities(citiesData.cities);
/** Every city level in play order. */
export const LEVELS: LevelConfig[] = CITIES.flatMap((c) => c.levels);
