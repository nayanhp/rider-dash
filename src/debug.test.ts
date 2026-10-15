import { describe, expect, it } from 'vitest';
import { attachDebug } from './debug';

describe('debug handle', () => {
  it('is absent unless the build is a dev build', () => {
    const prod: { rd?: unknown } = {};
    attachDebug(false, prod, { run: 1 });
    expect(prod.rd).toBeUndefined();
    const dev: { rd?: unknown } = {};
    attachDebug(true, dev, { run: 1 });
    expect(dev.rd).toEqual({ run: 1 });
  });
});
