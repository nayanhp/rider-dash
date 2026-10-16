import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type KeyValueStore } from './platform/storage';
import { RunPayout, addCoins, reloadWallet, walletCoins } from './wallet';

function memory(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

let store: ReturnType<typeof memory>;
beforeEach(() => {
  store = memory();
  useStore(store);
  reloadWallet();
});

describe('wallet', () => {
  it('starts empty, saves, and survives a reload', () => {
    expect(walletCoins()).toBe(0);
    addCoins(25);
    reloadWallet();
    expect(walletCoins()).toBe(25);
    expect(store.map.get('rd:wallet')).toBe('25');
  });

  it('never goes negative and ignores a corrupt save', () => {
    addCoins(-10);
    expect(walletCoins()).toBe(0);
    store.map.set('rd:wallet', '"lots"');
    reloadWallet();
    expect(walletCoins()).toBe(0);
  });
});

describe('run payout', () => {
  it('pays the final run coins once, across a coin revive', () => {
    const p = new RunPayout();
    p.settle(40); // first crash
    p.settle(10); // coin revive spent 30 in-run, then crashed again
    p.settle(10); // leaving the result settles again: no change
    expect(walletCoins()).toBe(10);
  });

  it('doubles into the wallet once, not twice', () => {
    const p = new RunPayout();
    expect(p.double(12, 2)).toBe(12);
    expect(p.double(12, 2)).toBe(0);
    expect(walletCoins()).toBe(24);
    expect(p.doubled).toBe(true);
  });

  it('does not double an empty run', () => {
    const p = new RunPayout();
    expect(p.double(0, 2)).toBe(0);
    expect(p.doubled).toBe(false);
  });
});
