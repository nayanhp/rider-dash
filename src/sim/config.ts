import citiesData from '../data/cities.json';
import levelsData from '../data/levels.json';
import tuningData from '../data/tuning.json';

export const OBSTACLES = ['auto', 'car', 'cow', 'hole', 'bump'] as const;
export type ObstacleKind = (typeof OBSTACLES)[number];
export type ObjKind = ObstacleKind | 'parcel' | 'coin' | 'drop';

/** Low obstacles can be jumped; tall ones need a lane change. */
export const JUMPABLE: ReadonlySet<ObjKind> = new Set(['hole', 'bump']);

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
  const { curve, intro, weather, tips } = data;
  const allKinds = intro[intro.length - 1].kinds as ObstacleKind[];
  let global = 0;
  return cities.map((c, ci) => {
    const n = c.areas.length;
    const levels = c.areas.map((area, ai): LevelConfig => {
      const g = global++;
      const d = Math.min(1, ci * curve.cityStep + (n > 1 ? ai / (n - 1) : 0) * curve.areaSpan);
      const finale = ai === n - 1;
      const inIntro = g < intro.length;
      const rain = !inIntro && (ai + 1) % (c.rainEvery ?? weather.rainEvery) === 0;
      const night = !inIntro && (finale || (ai + 1) % weather.nightEvery === 0);
      const v0 = Math.round(lerp(curve.v0, d));
      const tip = inIntro ? intro[g].tip
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
        ...(rain && { rain }),
        ...(night && { night }),
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
