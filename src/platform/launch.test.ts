import { describe, expect, it } from 'vitest';
import {
  coinStoreVisible,
  honourDevQuery,
  midgameOnLeave,
  rulesPortal,
  shouldStartInGameplay,
  unlockQueryEnabled,
  type AdBreak,
  type LeaveTarget,
} from './launch';

const quiet: AdBreak = { reviveOffered: false, doubleCoinsOffered: false, rewardedPlayed: false };

describe('dev query params', () => {
  it('ignores ?unlock and ?testpay on CrazyGames production', () => {
    expect(honourDevQuery('crazygames', false)).toBe(false);
    expect(unlockQueryEnabled('?unlock', 'crazygames', false)).toBe(false);
    expect(unlockQueryEnabled('?unlock=1', 'crazygames', false)).toBe(false);
  });

  it('honours them off the portal and in dev builds', () => {
    expect(unlockQueryEnabled('?unlock', 'offline', false)).toBe(true);
    expect(unlockQueryEnabled('?unlock', 'local', false)).toBe(true);
    expect(unlockQueryEnabled('', 'offline', false)).toBe(false);
    expect(unlockQueryEnabled('?unlock', 'crazygames', true)).toBe(true);
    expect(honourDevQuery('crazygames', true)).toBe(true);
  });
});

describe('portal rules when the SDK is blocked', () => {
  it('treats a framed page on a host that is not ours as CrazyGames', () => {
    expect(rulesPortal('offline', { framed: true, hostname: 'games.crazygames.com' })).toBe('crazygames');
    expect(coinStoreVisible(rulesPortal('offline', { framed: true, hostname: 'games.crazygames.com' }), 'none')).toBe(false);
    expect(unlockQueryEnabled('?unlock', rulesPortal('offline', { framed: true, hostname: 'x.crazygames.com' }), false)).toBe(false);
  });

  it('leaves our own hosts and a working SDK alone', () => {
    expect(rulesPortal('offline', { framed: false, hostname: 'nayanhp.github.io' })).toBe('offline');
    expect(rulesPortal('offline', { framed: true, hostname: 'nayanhp.github.io' })).toBe('offline');
    expect(rulesPortal('offline', { framed: true, hostname: 'localhost' })).toBe('offline');
    expect(rulesPortal('local', { framed: true, hostname: 'localhost' })).toBe('local');
    expect(rulesPortal('crazygames', { framed: true, hostname: 'games.crazygames.com' })).toBe('crazygames');
  });
});

describe('first launch', () => {
  it('starts in gameplay only when there are no stars and unlock is off', () => {
    expect(shouldStartInGameplay(false, false)).toBe(true);
    expect(shouldStartInGameplay(true, false)).toBe(false);
    expect(shouldStartInGameplay(false, true)).toBe(false);
  });
});

describe('coin store', () => {
  it('hides packs on CrazyGames until a live provider exists', () => {
    expect(coinStoreVisible('crazygames', 'none')).toBe(false);
    expect(coinStoreVisible('crazygames', 'test')).toBe(false);
    expect(coinStoreVisible('crazygames', 'live')).toBe(true);
  });

  it('keeps the store on GitHub Pages and local dev, including the Soon state', () => {
    expect(coinStoreVisible('offline', 'none')).toBe(true);
    expect(coinStoreVisible('offline', 'test')).toBe(true);
    expect(coinStoreVisible('local', 'test')).toBe(true);
  });
});

describe('ad pacing', () => {
  const browse: LeaveTarget[] = ['menu', 'shop', 'rider', 'coins', 'cities', 'areas', 'brief'];

  it('never plays a midgame while entering or leaving Shop, Rider, or Get coins', () => {
    for (const target of browse) {
      expect(midgameOnLeave(target, quiet)).toBe(false);
      expect(midgameOnLeave(target, { ...quiet, doubleCoinsOffered: true })).toBe(false);
    }
  });

  it('plays a midgame only on Retry, Next, and Ride again when the break has no rewarded offer', () => {
    expect(midgameOnLeave('retry', quiet)).toBe(true);
    expect(midgameOnLeave('next', quiet)).toBe(true);
    expect(midgameOnLeave('again', quiet)).toBe(true);
  });

  it('skips the midgame while revive or double coins is on screen, and after a rewarded ad played', () => {
    expect(midgameOnLeave('retry', { ...quiet, reviveOffered: true })).toBe(false);
    expect(midgameOnLeave('next', { ...quiet, doubleCoinsOffered: true })).toBe(false);
    expect(midgameOnLeave('again', { ...quiet, rewardedPlayed: true })).toBe(false);
  });
});
