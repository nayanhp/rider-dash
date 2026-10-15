import { describe, expect, it } from 'vitest';
import { hintFor } from './hint';

const fresh = { firstLevel: true, fresh: true, lane: 1, carry: 0, delivered: 0 };

describe('first-run hints', () => {
  it('teaches steer, then a parcel, then the drop', () => {
    expect(hintFor(fresh)).toMatch(/Swipe/);
    expect(hintFor({ ...fresh, lane: 0 })).toMatch(/parcel/);
    expect(hintFor({ ...fresh, carry: 1 })).toMatch(/DROP/);
    expect(hintFor({ ...fresh, delivered: 1 })).toBeNull();
  });

  it('stays off after the first level and after it has been cleared', () => {
    expect(hintFor({ ...fresh, firstLevel: false })).toBeNull();
    expect(hintFor({ ...fresh, fresh: false })).toBeNull();
  });
});
