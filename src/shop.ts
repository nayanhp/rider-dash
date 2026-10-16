// What the player owns and has upgraded, bought with wallet coins. Coins are only earned by
// playing. Purchases are saved with the rest of progress (CrazyGames data module included).
import shop from './data/shop.json';
import { AVATAR_OPTIONS, isFree, type AvatarOption, type AvatarPart } from './avatar';
import { load, save } from './platform/storage';
import { LEVELS, type TimedPower } from './sim/config';
import type { RunMods } from './sim/run';
import { spendCoins, walletCoins } from './wallet';

export type BoostId = 'helmet' | 'nitro' | 'heart';
export interface Boost { id: BoostId; name: string; desc: string; price: number }
export interface UpgradeItem { power: TimedPower; name: string; desc: string }

export const BOOSTS = shop.boosts as Boost[];
export const UPGRADES = shop.upgrades.items as UpgradeItem[];
export const MAX_UPGRADE = shop.upgrades.prices.length;

let owned: Set<string> | null = null;
let levels: Partial<Record<TimedPower, number>> | null = null;

const key = (part: AvatarPart, id: string) => `${part}:${id}`;

function ownedSet(): Set<string> {
  if (!owned) {
    const raw = load<unknown>('owned', []);
    owned = new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  }
  return owned;
}

function upgradeLevels(): Partial<Record<TimedPower, number>> {
  if (!levels) {
    const raw = load<unknown>('upgrades', {});
    levels = {};
    if (raw && typeof raw === 'object') {
      for (const u of UPGRADES) {
        const n = (raw as Record<string, unknown>)[u.power];
        if (typeof n === 'number' && Number.isFinite(n)) levels[u.power] = Math.max(0, Math.min(MAX_UPGRADE, Math.floor(n)));
      }
    }
  }
  return levels;
}

/** Read purchases again. Call after the storage backend changes. */
export function reloadShop() {
  owned = null;
  levels = null;
}

/** The shop opens once BTM Layout (Bengaluru area 5) is cleared. */
export function shopOpen(starsFor: (id: string) => number): boolean {
  return starsFor(LEVELS[shop.unlockAfter].id) > 0;
}
export const shopOpensAt = () => LEVELS[shop.unlockAfter];

export function ownsLook(part: AvatarPart, o: AvatarOption): boolean {
  return isFree(o) || ownedSet().has(key(part, o.id));
}

function grant(part: AvatarPart, id: string) {
  ownedSet().add(key(part, id));
  save('owned', [...ownedSet()]);
}

/** Buy a priced look. Returns false when it isn't for sale or the wallet is short. */
export function buyLook(part: AvatarPart, o: AvatarOption): boolean {
  if (ownsLook(part, o) || o.price === undefined) return false;
  if (!spendCoins(o.price)) return false;
  grant(part, o.id);
  return true;
}

/** Looks a city gives for clearing its last area. */
export function rewardsFor(cityId: string): Array<{ part: AvatarPart; option: AvatarOption }> {
  const out: Array<{ part: AvatarPart; option: AvatarOption }> = [];
  for (const part of Object.keys(AVATAR_OPTIONS) as AvatarPart[]) {
    for (const option of AVATAR_OPTIONS[part]) if (option.reward === cityId) out.push({ part, option });
  }
  return out;
}

/** Grant a city's reward looks. Returns the ones that are new. */
export function claimCityRewards(cityId: string) {
  const fresh = rewardsFor(cityId).filter(({ part, option }) => !ownsLook(part, option));
  for (const { part, option } of fresh) grant(part, option.id);
  return fresh;
}

export const upgradeLevel = (p: TimedPower) => upgradeLevels()[p] ?? 0;
/** Price of the next level, or null when maxed. */
export const nextUpgradePrice = (p: TimedPower): number | null =>
  upgradeLevel(p) >= MAX_UPGRADE ? null : shop.upgrades.prices[upgradeLevel(p)];

export function buyUpgrade(p: TimedPower): boolean {
  const price = nextUpgradePrice(p);
  if (price === null || !spendCoins(price)) return false;
  upgradeLevels()[p] = upgradeLevel(p) + 1;
  save('upgrades', upgradeLevels());
  return true;
}

/** Duration multiplier at an upgrade level: +20% per level, so level 5 lasts twice as long. */
export const scaleAt = (level: number) => 1 + level * shop.upgrades.stepPerLevel;

export const boostCost = (picked: readonly BoostId[]) =>
  BOOSTS.filter((b) => picked.includes(b.id)).reduce((n, b) => n + b.price, 0);

/**
 * Pay for the chosen boosts and build this run's mods. If the wallet can't cover them,
 * the boosts are dropped and the run starts without them.
 */
export function modsForRun(picked: readonly BoostId[]): RunMods {
  const powerScale: Partial<Record<TimedPower, number>> = {};
  for (const u of UPGRADES) powerScale[u.power] = scaleAt(upgradeLevel(u.power));
  const cost = boostCost(picked);
  const paid = picked.length > 0 && cost <= walletCoins() && spendCoins(cost);
  return {
    powerScale,
    ...(paid && {
      startHelmet: picked.includes('helmet'),
      startNitro: picked.includes('nitro'),
      extraHeart: picked.includes('heart'),
    }),
  };
}
