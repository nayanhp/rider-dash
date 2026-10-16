import { describe, expect, it } from 'vitest';
import { COIN_PACKS, noPayments, packTotal, testPayments, wantsTestPayments } from './payments';

describe('payments', () => {
  it('uses test purchases only on a dev host or with ?testpay', () => {
    expect(wantsTestPayments({ hostname: 'localhost', search: '' })).toBe(true);
    expect(wantsTestPayments({ hostname: '127.0.0.1', search: '' })).toBe(true);
    expect(wantsTestPayments({ hostname: 'nayanhp.github.io', search: '' })).toBe(false);
    expect(wantsTestPayments({ hostname: 'nayanhp.github.io', search: '?testpay' })).toBe(true);
    expect(wantsTestPayments({ hostname: 'localhost', search: '?testpay', portal: 'crazygames', dev: false })).toBe(false);
    expect(wantsTestPayments({ hostname: 'games.crazygames.com', search: '?testpay', portal: 'crazygames' })).toBe(false);
    expect(wantsTestPayments({ hostname: 'localhost', search: '', portal: 'crazygames', dev: true })).toBe(true);
    expect(wantsTestPayments({ hostname: 'nayanhp.github.io', search: '?testpay', portal: 'crazygames', dev: true })).toBe(true);
  });

  it('with no provider, nothing can be bought', async () => {
    const p = noPayments();
    expect(p.available()).toBe(false);
    expect(await p.buy(COIN_PACKS[0])).toEqual({ ok: false, code: 'unavailable' });
  });

  it('test purchases go through only when confirmed', async () => {
    expect((await testPayments(async () => true).buy(COIN_PACKS[1])).ok).toBe(true);
    expect(await testPayments(async () => false).buy(COIN_PACKS[1])).toEqual({ ok: false, code: 'cancelled' });
  });

  it('bigger packs give more coins per pack, with growing bonuses', () => {
    for (let i = 1; i < COIN_PACKS.length; i++) {
      expect(packTotal(COIN_PACKS[i])).toBeGreaterThan(packTotal(COIN_PACKS[i - 1]));
      expect(COIN_PACKS[i].bonus).toBeGreaterThanOrEqual(COIN_PACKS[i - 1].bonus);
    }
  });
});
