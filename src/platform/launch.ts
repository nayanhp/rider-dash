// CrazyGames launch rules that the UI asks about. Game code never touches window.CrazyGames;
// it asks these functions, the same way ads go through AdService.
export type PortalMode = 'local' | 'crazygames' | 'offline';

/**
 * `?unlock` and `?testpay` are local-dev and off-portal tools. A production CrazyGames
 * link must not open every neighbourhood or grant test coins. Dev builds still honour
 * them, so a local check of the portal path can use the same URLs.
 */
export function honourDevQuery(portal: PortalMode, dev: boolean): boolean {
  return portal !== 'crazygames' || dev;
}

export function unlockQueryEnabled(search: string, portal: PortalMode, dev: boolean): boolean {
  return honourDevQuery(portal, dev) && new URLSearchParams(search).has('unlock');
}

/** A save with no stars is a first launch: skip the menu and ride Koramangala. */
export function shouldStartInGameplay(hasStars: boolean, unlockAll: boolean): boolean {
  // ?unlock is for picking any area, so it keeps the menu even with an empty save.
  return !hasStars && !unlockAll;
}

export type PaymentMode = 'none' | 'test' | 'live';

/**
 * Real-money packs stay off CrazyGames until a live provider is connected (Xsolla is
 * invite-only and not part of Basic Launch). A "Soon" or test store would be a dead
 * button on the portal. GitHub Pages and local dev keep the store.
 */
export function coinStoreVisible(portal: PortalMode, mode: PaymentMode): boolean {
  if (portal !== 'crazygames') return true;
  return mode === 'live';
}

export interface AdBreak {
  /** Lose screen is offering a rewarded revive. */
  reviveOffered: boolean;
  /** Win or endless screen is offering rewarded double coins. */
  doubleCoinsOffered: boolean;
  /** A rewarded ad already finished on this break. */
  rewardedPlayed: boolean;
}

/**
 * Where the player is going. Shop, Rider, and the coin store are browsing.
 * Retry / Next / Ride again are the run breaks where a midgame ad can sit.
 */
export type LeaveTarget =
  | 'menu'
  | 'shop'
  | 'rider'
  | 'coins'
  | 'cities'
  | 'areas'
  | 'brief'
  | 'retry'
  | 'next'
  | 'again';

const BROWSE: ReadonlySet<LeaveTarget> = new Set([
  'menu',
  'shop',
  'rider',
  'coins',
  'cities',
  'areas',
  'brief',
]);

/**
 * Midgame ads only at a natural break (Retry, Next, Ride again), and never on a break
 * that is showing or has already played a rewarded ad. CrazyGames forbids combining
 * the two, including when the player skips the rewarded offer and continues.
 * Shop, Rider, Get coins, and the other menus never request one, in either direction.
 */
export function midgameOnLeave(target: LeaveTarget, brk: AdBreak): boolean {
  if (BROWSE.has(target)) return false;
  if (brk.reviveOffered || brk.doubleCoinsOffered || brk.rewardedPlayed) return false;
  return target === 'retry' || target === 'next' || target === 'again';
}
