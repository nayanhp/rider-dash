// Stars per level, saved locally. Areas unlock in order; finishing a city's last area
// opens the next city. Add ?unlock to the URL to open everything (for testing).
import { load, save } from './platform/storage';
import { CITIES, LEVELS, type City, type LevelConfig } from './sim/config';

const stars: Record<string, number> = load('stars', {});
const unlockAll = new URLSearchParams(location.search).has('unlock');
const indexOf = new Map(LEVELS.map((l, i) => [l.id, i]));

export const starsFor = (id: string) => stars[id] ?? 0;

export function recordStars(id: string, n: number) {
  if (n <= starsFor(id)) return;
  stars[id] = n;
  save('stars', stars);
}

export function isUnlocked(level: LevelConfig): boolean {
  const i = indexOf.get(level.id) ?? 0;
  return unlockAll || i === 0 || starsFor(LEVELS[i - 1].id) > 0;
}

export const cityUnlocked = (c: City) => isUnlocked(c.levels[0]);
export const cityStars = (c: City) => c.levels.reduce((n, l) => n + starsFor(l.id), 0);
export const cityCleared = (c: City) => c.levels.filter((l) => starsFor(l.id) > 0).length;

export function nextLevel(level: LevelConfig): LevelConfig | undefined {
  return LEVELS[(indexOf.get(level.id) ?? -2) + 1];
}

export const cityOf = (level: LevelConfig) => CITIES.find((c) => c.id === level.cityId) ?? CITIES[0];

/** The first level not yet cleared: where "Play" takes you. */
export function currentLevel(): LevelConfig {
  return LEVELS.find((l) => starsFor(l.id) === 0) ?? LEVELS[LEVELS.length - 1];
}
