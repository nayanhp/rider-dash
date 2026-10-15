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
}

export type Tuning = typeof tuningData;

export const TUNING: Tuning = tuningData;
export const LEVELS: LevelConfig[] = levelsData.levels as LevelConfig[];
export const ENDLESS: LevelConfig = levelsData.endless as LevelConfig;
