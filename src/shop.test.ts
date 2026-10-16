import { beforeEach, describe, expect, it } from 'vitest';
import { AVATAR_OPTIONS } from './avatar';
import { useStore, type KeyValueStore } from './platform/storage';
import { LEVELS } from './sim/config';
import {
  BOOSTS, MAX_UPGRADE, buyLook, buyUpgrade, claimCityRewards, modsForRun, nextUpgradePrice, ownsLook,
  reloadShop, rewardsFor, scaleAt, shopOpen, upgradeLevel,
} from './shop';
import { addCoins, reloadWallet, walletCoins } from './wallet';

function memory(): KeyValueStore {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

beforeEach(() => {
  useStore(memory());
  reloadWallet();
  reloadShop();
});

const jacket = (id: string) => AVATAR_OPTIONS.jacket.find((o) => o.id === id)!;

describe('shop', () => {
  it('opens once BTM Layout is cleared', () => {
    const stars: Record<string, number> = {};
    expect(shopOpen((id) => stars[id] ?? 0)).toBe(false);
    stars[LEVELS[4].id] = 1;
    expect(LEVELS[4].name).toBe('BTM Layout');
    expect(shopOpen((id) => stars[id] ?? 0)).toBe(true);
  });

  it('free looks are owned; priced looks cost coins and stay bought', () => {
    expect(ownsLook('jacket', jacket('red'))).toBe(true);
    const orange = jacket('orange');
    expect(ownsLook('jacket', orange)).toBe(false);
    expect(buyLook('jacket', orange)).toBe(false); // no coins yet
    addCoins(200);
    expect(buyLook('jacket', orange)).toBe(true);
    expect(walletCoins()).toBe(200 - orange.price!);
    reloadShop();
    expect(ownsLook('jacket', orange)).toBe(true);
    expect(buyLook('jacket', orange)).toBe(false); // can't buy twice
  });

  it('city rewards cannot be bought, only earned by clearing the city', () => {
    const raincoat = jacket('raincoat');
    addCoins(5000);
    expect(buyLook('jacket', raincoat)).toBe(false);
    expect(rewardsFor('mumbai').map((r) => r.option.id)).toEqual(['raincoat']);
    expect(claimCityRewards('mumbai')).toHaveLength(1);
    expect(claimCityRewards('mumbai')).toHaveLength(0); // only new once
    expect(ownsLook('jacket', raincoat)).toBe(true);
  });

  it('every city after Bengaluru has a reward look', () => {
    for (const id of ['mumbai', 'delhi', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad']) {
      expect(rewardsFor(id).length).toBeGreaterThan(0);
    }
  });

  it('upgrades climb a price ladder to level 5, each +20% duration', () => {
    addCoins(10_000);
    const prices: number[] = [];
    while (nextUpgradePrice('magnet') !== null) {
      prices.push(nextUpgradePrice('magnet')!);
      expect(buyUpgrade('magnet')).toBe(true);
    }
    expect(prices).toEqual([100, 250, 500, 1000, 2000]);
    expect(upgradeLevel('magnet')).toBe(MAX_UPGRADE);
    expect(buyUpgrade('magnet')).toBe(false);
    expect(scaleAt(MAX_UPGRADE)).toBe(2);
    expect(modsForRun([]).powerScale?.magnet).toBe(2);
    expect(modsForRun([]).powerScale?.nitro).toBe(1);
  });

  it('charges for boosts when the ride starts, and drops them if the wallet is short', () => {
    const helmet = BOOSTS.find((b) => b.id === 'helmet')!;
    expect(modsForRun(['helmet']).startHelmet).toBeUndefined();
    addCoins(helmet.price);
    const mods = modsForRun(['helmet']);
    expect(mods.startHelmet).toBe(true);
    expect(walletCoins()).toBe(0);
  });
});
