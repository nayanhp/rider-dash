import { afterEach, describe, expect, it, vi } from 'vitest';
import { canPlayAudio, setAdMuted, setSdkMuted } from './audio';
import { AD_REQUEST_TIMEOUT_MS, connectPortal, migrateProgress, resetSdkEmitState, shouldBootSdk, type CrazySDK } from './crazygames';
import { load, save, useStore } from './storage';

function memoryStore() {
  const mem = new Map<string, string>();
  useStore({
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
  });
  return mem;
}

afterEach(() => {
  resetSdkEmitState();
  vi.useRealTimers();
  setSdkMuted(false);
  setAdMuted(false);
  memoryStore();
  vi.unstubAllGlobals();
});

interface Fake {
  sdk: CrazySDK;
  calls: string[];
  data: Map<string, string>;
}

function fake(partial: {
  environment?: string;
  init?: () => Promise<void>;
  muteAudio?: boolean;
  hasAdblock?: () => Promise<boolean>;
  requestAd?: CrazySDK['ad']['requestAd'];
  dataThrows?: boolean;
} = {}): Fake {
  const calls: string[] = [];
  const data = new Map<string, string>();
  const sdk: CrazySDK = {
    environment: partial.environment ?? 'local',
    init: partial.init ?? (async () => {
      calls.push('init');
    }),
    game: {
      settings: { muteAudio: partial.muteAudio ?? false },
      loadingStart: () => calls.push('loadingStart'),
      loadingStop: () => calls.push('loadingStop'),
      gameplayStart: () => calls.push('gameplayStart'),
      gameplayStop: () => calls.push('gameplayStop'),
      happytime: () => calls.push('happytime'),
      addSettingsChangeListener: () => calls.push('listen'),
    },
    ad: {
      hasAdblock: partial.hasAdblock ?? (async () => {
        calls.push('hasAdblock');
        return false;
      }),
      requestAd: partial.requestAd ?? ((type, cb) => {
        calls.push(`ad:${type}`);
        cb.adStarted?.();
        cb.adFinished?.();
      }),
    },
    data: {
      getItem: (key) => {
        if (partial.dataThrows) throw { code: 'dataModuleDisabled' };
        return data.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (partial.dataThrows) throw { code: 'dataModuleDisabled' };
        data.set(key, value);
      },
    },
  };
  return { sdk, calls, data };
}

describe('CrazyGames portal', () => {
  it('falls back when the SDK is missing or init fails', async () => {
    expect((await connectPortal(null)).mode).toBe('offline');
    const broken = fake({
      init: async () => {
        throw new Error('blocked');
      },
    });
    const portal = await connectPortal(broken.sdk);
    expect(portal.mode).toBe('offline');
    expect(portal.ads.rewardedAvailable()).toBe(false);
    await expect(portal.ads.request('midgame')).resolves.toEqual({ ok: false, code: 'unavailable' });
    expect(() => {
      portal.loadingStop();
      portal.gameplayStart();
      portal.gameplayStop();
      portal.happytime();
    }).not.toThrow();
  });

  it('ignores a disabled SDK instead of calling it', async () => {
    const { sdk, calls } = fake({ environment: 'disabled' });
    const portal = await connectPortal(sdk);
    expect(portal.mode).toBe('offline');
    expect(calls).toEqual(['init']);
    portal.gameplayStart();
    expect(calls).toEqual(['init']);
  });

  it('inits, reports loading, and brackets gameplay', async () => {
    const { sdk, calls } = fake();
    const portal = await connectPortal(sdk);
    expect(portal.mode).toBe('local');
    expect(calls).toContain('init');
    expect(calls).toContain('loadingStart');
    expect(calls.indexOf('init')).toBeLessThan(calls.indexOf('loadingStart'));
    portal.loadingStop();
    portal.gameplayStart();
    portal.happytime();
    portal.gameplayStop();
    expect(calls).toEqual(['init', 'listen', 'loadingStart', 'hasAdblock', 'loadingStop', 'gameplayStart', 'happytime', 'gameplayStop']);
  });

  it('mutes for muteAudio and only while an ad is playing', async () => {
    const held = fake({ muteAudio: true });
    await connectPortal(held.sdk);
    expect(canPlayAudio()).toBe(false);

    const { sdk } = fake({
      requestAd: (_type, cb) => {
        expect(canPlayAudio()).toBe(true);
        cb.adStarted?.();
        expect(canPlayAudio()).toBe(false);
        cb.adFinished?.();
      },
    });
    const portal = await connectPortal(sdk);
    await expect(portal.ads.request('midgame')).resolves.toEqual({ ok: true, code: 'finished' });
    expect(canPlayAudio()).toBe(true);

    const err = fake({
      requestAd: (_type, cb) => cb.adError?.({ code: 'unfilled', message: 'No ad available' }),
    });
    const failed = await connectPortal(err.sdk);
    await expect(failed.ads.request('rewarded')).resolves.toEqual({ ok: false, code: 'unfilled' });
    expect(canPlayAudio()).toBe(true);
  });

  it('hides rewarded ads when they are blocked or disabled', async () => {
    const blocked = await connectPortal(fake({ hasAdblock: async () => true }).sdk);
    expect(blocked.ads.rewardedAvailable()).toBe(false);

    const { sdk } = fake({
      requestAd: (_type, cb) => cb.adError?.({ code: 'adsDisabledBasicLaunch', message: 'off' }),
    });
    const portal = await connectPortal(sdk);
    expect(portal.ads.rewardedAvailable()).toBe(true);
    await portal.ads.request('rewarded');
    expect(portal.ads.rewardedAvailable()).toBe(false);
  });

  it('waits out the SDK throttle instead of double-firing gameplay', async () => {
    const { sdk, calls } = fake();
    const portal = await connectPortal(sdk);
    vi.useFakeTimers();
    resetSdkEmitState();
    portal.gameplayStart();
    portal.gameplayStop();
    portal.gameplayStart();
    expect(calls.filter((c) => c === 'gameplayStart')).toEqual(['gameplayStart']);
    expect(calls.filter((c) => c === 'gameplayStop')).toEqual(['gameplayStop']);
    await vi.advanceTimersByTimeAsync(1100);
    expect(calls.filter((c) => c === 'gameplayStart')).toEqual(['gameplayStart', 'gameplayStart']);
    vi.useRealTimers();
  });

  it('releases the game if an ad never calls back', async () => {
    const { sdk } = fake({ requestAd: () => {} });
    const portal = await connectPortal(sdk);
    vi.useFakeTimers();
    const pending = portal.ads.request('midgame');
    await vi.advanceTimersByTimeAsync(AD_REQUEST_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ ok: false, code: 'timeout' });
    expect(canPlayAudio()).toBe(true);
  });

  it('survives a throwing ad request', async () => {
    const { sdk } = fake({
      requestAd: () => {
        throw new Error('no fill');
      },
    });
    const portal = await connectPortal(sdk);
    await expect(portal.ads.request('midgame')).resolves.toEqual({ ok: false, code: 'other' });
    expect(canPlayAudio()).toBe(true);
  });

  it('keeps an SDK mute on after the ad ends', async () => {
    const { sdk } = fake({
      muteAudio: true,
      requestAd: (_type, cb) => {
        cb.adStarted?.();
        cb.adFinished?.();
      },
    });
    const portal = await connectPortal(sdk);
    await portal.ads.request('midgame');
    expect(canPlayAudio()).toBe(false);
  });
});

describe('progress storage', () => {
  it('round-trips JSON through the active store', () => {
    const mem = memoryStore();
    save('best', 42);
    save('stars', { 'bengaluru-koramangala': 3 });
    expect(load('best', 0)).toBe(42);
    expect(load('stars', {})).toEqual({ 'bengaluru-koramangala': 3 });
    expect(mem.get('rd:best')).toBe('42');
    expect(load('missing', 7)).toBe(7);
  });

  it('copies local progress into the data module without overwriting it', () => {
    const data = new Map<string, string>([['rd:stars', '{"keep":1}']]);
    const local = new Map<string, string>([
      ['rd:stars', '{"local":2}'],
      ['rd:best', '9'],
    ]);
    const module = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    expect(migrateProgress(module, (key) => local.get(key) ?? null)).toBe('ok');
    expect(data.get('rd:stars')).toBe('{"keep":1}');
    expect(data.get('rd:best')).toBe('9');
    expect(migrateProgress({
      getItem: () => {
        throw { code: 'dataModuleDisabled' };
      },
      setItem: () => {
        throw { code: 'dataModuleDisabled' };
      },
    }, () => null)).toBe('disabled');
  });

  it('uses the data module for later saves when it is enabled', async () => {
    const local = new Map<string, string>([['rd:pid', '"player-1"']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => {
        local.set(key, value);
      },
      removeItem: (key: string) => {
        local.delete(key);
      },
    });
    const { sdk, data } = fake();
    const portal = await connectPortal(sdk);
    expect(portal.mode).toBe('local');
    expect(data.get('rd:pid')).toBe('"player-1"');
    save('best', 5);
    expect(data.get('rd:best')).toBe('5');
    expect(load('best', 0)).toBe(5);
  });
});

describe('where the SDK starts', () => {
  const at = (hostname: string, framed = false, search = '') => shouldBootSdk({ hostname, search, framed });

  it('starts inside the CrazyGames iframe and on local dev hosts', () => {
    expect(at('games.crazygames.com', true)).toBe(true);
    expect(at('localhost')).toBe(true);
    expect(at('127.0.0.1')).toBe(true);
    expect(at('192.168.0.44', false, '?useLocalSdk=true')).toBe(true);
  });

  it('skips a top-level page elsewhere, such as GitHub Pages', () => {
    expect(at('nayanhp.github.io')).toBe(false);
    expect(at('192.168.0.44')).toBe(false);
    expect(at('nayanhp.github.io', false, '?useLocalSdk=false')).toBe(false);
  });
});
