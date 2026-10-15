import { describe, expect, it } from 'vitest';
import { nextHold } from './pause';

const live = { runLive: true, ad: false, pageAway: false, resume: false };

describe('pause hold', () => {
  it('latches on blur until the player resumes', () => {
    expect(nextHold('play', { ...live, pageAway: true })).toBe('hidden');
    expect(nextHold('hidden', live)).toBe('hidden');
    expect(nextHold('hidden', { ...live, resume: true })).toBe('play');
  });

  it('keeps the latch if the tab is still hidden when they tap resume', () => {
    expect(nextHold('hidden', { ...live, pageAway: true, resume: true })).toBe('hidden');
  });

  it('lets an ad cover a live run, then the blur latch if they left', () => {
    expect(nextHold('play', { ...live, ad: true, pageAway: true })).toBe('ad');
    expect(nextHold('ad', { ...live, pageAway: true })).toBe('hidden');
    expect(nextHold('ad', live)).toBe('play');
  });

  it('drops the latch when the run is over', () => {
    expect(nextHold('hidden', { ...live, runLive: false, pageAway: true })).toBe('play');
    expect(nextHold('ad', { ...live, runLive: false, ad: true })).toBe('play');
  });
});
