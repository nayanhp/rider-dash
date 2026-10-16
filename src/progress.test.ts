import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './platform/storage';
import { LEVELS } from './sim/config';
import { configureUnlock, hasSavedStars, isUnlocked, recordStars, reloadProgress } from './progress';

beforeEach(() => {
  const mem = new Map<string, string>();
  useStore({
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
  });
  reloadProgress();
  configureUnlock(false);
});

describe('progress', () => {
  it('treats an empty save as a first run, and a star as a return', () => {
    expect(hasSavedStars()).toBe(false);
    expect(isUnlocked(LEVELS[0])).toBe(true);
    expect(isUnlocked(LEVELS[1])).toBe(false);
    recordStars(LEVELS[0].id, 2);
    expect(hasSavedStars()).toBe(true);
    expect(isUnlocked(LEVELS[1])).toBe(true);
  });

  it('opens every area only after unlock is configured', () => {
    expect(isUnlocked(LEVELS[40])).toBe(false);
    configureUnlock(true);
    expect(isUnlocked(LEVELS[40])).toBe(true);
    configureUnlock(false);
    expect(isUnlocked(LEVELS[40])).toBe(false);
  });
});
