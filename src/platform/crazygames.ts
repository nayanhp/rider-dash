// CrazyGames HTML5 SDK v3 adapter. Game code uses bootPortal() and the AdService
// it returns; it never touches window.CrazyGames. When the SDK is missing, disabled,
// or fails to init, every call is a no-op and saves stay on local storage.
import { stubAds, type AdKind, type AdResult, type AdService } from './ads';
import { setAdMuted, setSdkMuted } from './audio';
import { PROGRESS_KEYS, storageKey, useStore, type KeyValueStore } from './storage';

export interface Portal {
  /** 'local' and 'crazygames' have a live SDK. 'offline' is the dev/fallback path. */
  mode: 'local' | 'crazygames' | 'offline';
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
  ads: AdService;
}

interface GameSettings {
  muteAudio?: boolean;
  disableChat?: boolean;
}

interface AdError {
  code?: string;
  message?: string;
}

interface DataModule {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CrazySDK {
  init: () => Promise<void>;
  environment: string;
  game: {
    settings?: GameSettings;
    loadingStart: () => void;
    loadingStop: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
    addSettingsChangeListener?: (fn: (settings: GameSettings) => void) => void;
  };
  ad: {
    requestAd: (
      type: AdKind,
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: AdError) => void;
      },
    ) => void;
    hasAdblock?: () => Promise<boolean>;
  };
  data?: DataModule;
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazySDK };
  }
}

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

function offlinePortal(): Portal {
  return {
    mode: 'offline',
    loadingStop() {},
    gameplayStart() {},
    gameplayStop() {},
    happytime() {},
    ads: stubAds(),
  };
}

function call(fn: () => void) {
  try {
    fn();
  } catch {
    /* A disabled SDK throws. The game keeps going. */
  }
}

/**
 * Copy pre-SDK localStorage progress into the data module once. Never overwrites a
 * value the module already has. Returns 'disabled' when the module refuses calls
 * (the submission's Progress Save toggle is off) so we keep using local storage.
 */
export function migrateProgress(
  data: DataModule,
  readLocal: (key: string) => string | null,
): 'ok' | 'disabled' {
  for (const key of PROGRESS_KEYS) {
    const full = storageKey(key);
    let current: string | null;
    try {
      current = data.getItem(full);
    } catch {
      return 'disabled';
    }
    if (current != null) continue;
    const local = readLocal(full);
    if (local == null) continue;
    try {
      data.setItem(full, local);
    } catch {
      return 'disabled';
    }
  }
  return 'ok';
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function dataStore(data: DataModule): KeyValueStore {
  return {
    getItem: (key) => {
      try {
        return data.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        data.setItem(key, value);
      } catch {
        /* 1MB limit or module disabled: this session still has the in-memory copy */
      }
    },
  };
}

export async function connectPortal(sdk: CrazySDK | null): Promise<Portal> {
  if (!sdk) return offlinePortal();
  try {
    await sdk.init();
  } catch {
    return offlinePortal();
  }
  if (sdk.environment !== 'local' && sdk.environment !== 'crazygames') return offlinePortal();

  const applyMute = (settings?: GameSettings) => setSdkMuted(!!settings?.muteAudio);
  applyMute(sdk.game.settings);
  call(() => sdk.game.addSettingsChangeListener?.(applyMute));
  call(() => sdk.game.loadingStart());

  if (sdk.data && migrateProgress(sdk.data, readLocal) === 'ok') useStore(dataStore(sdk.data));

  let rewarded = true;
  try {
    if (await sdk.ad.hasAdblock?.()) rewarded = false;
  } catch {
    /* detection failed: still offer the button, and handle adError if it comes */
  }

  const ads: AdService = {
    rewardedAvailable: () => rewarded,
    request: (kind) =>
      new Promise<AdResult>((resolve) => {
        let settled = false;
        const finish = (result: AdResult) => {
          if (settled) return;
          settled = true;
          setAdMuted(false);
          resolve(result);
        };
        try {
          sdk.ad.requestAd(kind, {
            adStarted: () => setAdMuted(true),
            adFinished: () => finish({ ok: true, code: 'finished' }),
            adError: (error) => {
              const code = error?.code || 'other';
              if (code === 'adsDisabledBasicLaunch' || code === 'adblock') rewarded = false;
              finish({ ok: false, code });
            },
          });
        } catch {
          finish({ ok: false, code: 'other' });
        }
      }),
  };

  return {
    mode: sdk.environment,
    loadingStop: () => call(() => sdk.game.loadingStop()),
    gameplayStart: () => call(() => sdk.game.gameplayStart()),
    gameplayStop: () => call(() => sdk.game.gameplayStop()),
    happytime: () => call(() => sdk.game.happytime()),
    ads,
  };
}

function loadSdkScript(): Promise<CrazySDK | null> {
  const ready = window.CrazyGames?.SDK;
  if (ready) return Promise.resolve(ready);
  // The tag in index.html is the supported install. If it ran and left no SDK, stop.
  if (document.querySelector('script[data-cg-sdk]')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.dataset.cgSdk = '1';
    script.onload = () => resolve(window.CrazyGames?.SDK ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/** Init the SDK if this page is on CrazyGames or localhost; otherwise play offline. */
export async function bootPortal(): Promise<Portal> {
  if (typeof window === 'undefined') return offlinePortal();
  try {
    return await connectPortal(await loadSdkScript());
  } catch {
    return offlinePortal();
  }
}
