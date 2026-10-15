import { describe, expect, it } from 'vitest';
import { LEVELS } from './config';
import { playLevel } from './bot';
import { assess, findOutliers } from './balance';

describe('balance', () => {
  it('clears the first delivery and does not repeat a tuning step', () => {
    const rows = assess();
    expect(rows).toHaveLength(200);
    expect(rows[0].id).toBe(LEVELS[0].id);
    expect(rows[0].clearRate).toBe(1);
    expect(findOutliers(rows).filter((o) => o.kind === 'plateau')).toEqual([]);
    expect(findOutliers(rows).filter((o) => o.kind === 'spike')).toEqual([]);
    const first = playLevel(LEVELS[0], 1);
    expect(first.status).toBe('won');
    expect(playLevel(LEVELS[0], 1)).toEqual(first);
  }, 30_000);
});
