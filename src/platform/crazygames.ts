// CrazyGames HTML5 SDK v3 adapter. Game code uses bootPortal() and the services
// it returns; it never touches window.CrazyGames. When the SDK is missing, disabled,
// or fails to init, every call is a no-op and saves stay on local storage.
import { stubAds, type AdKind, type AdResult, type AdService } from './ads';
import { setAdMuted, setSdkMuted } from './audio';
import { PROGRESS_KEYS, storageKey, useStore, type KeyValueStore } from './storage';
import { createUserService, unavailableUser, type UserModule, type UserService } from './user';

export interface Portal {
  /** 'local' and 'crazygames' have a live SDK. 'offline' is the dev/fallback path. */
  mode: 'local' | 'crazygames' | 'offline';
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
  ads: AdService;
  /** Account chip and sign-in. Unavailable off CrazyGames and on embeds. */
  user: UserService;
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
  user?: UserModule;
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazySDK };
  }
}

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
/** A lost portal message must not leave the game on "One moment…" forever. */
export const AD_REQUEST_TIMEOUT_MS = 120_000;

function offlinePortal(): Portal {
  return {
    mode: 'offline',
    loadingStop() {},
    gameplayStart() {},
    gameplayStop() {},
    happytime() {},
    ads: stubAds(),
    user: unavailableUser(),
  };
}

function call(fn: () => void) {
  try {
    fn();
  } catch {
    /* A disabled SDK throws. The game keeps going. */
  }
}

// gameplayStart, gameplayStop and happytime are throttled inside the SDK at 1s.
// A second call inside that window is not ignored quietly: the SDK console.errors.
// Keep the latest request and send it once the window has passed.
const SDK_EVENT_GAP_MS = 1100;
const nextEventAt = new Map<string, number>();
const eventTimer = new Map<string, ReturnType<typeof setTimeout>>();

/** Test hook. The gap is process-wide so one spec cannot throttle the next. */
export function resetSdkEmitState() {
  for (const timer of eventTimer.values()) clearTimeout(timer);
  eventTimer.clear();
  nextEventAt.clear();
}

function emit(name: string, fn: () => void) {
  const now = Date.now();
  const at = nextEventAt.get(name) ?? 0;
  if (now >= at) {
    nextEventAt.set(name, now + SDK_EVENT_GAP_MS);
    call(fn);
    return;
  }
  const pending = eventTimer.get(name);
  if (pending) clearTimeout(pending);
  eventTimer.set(name, setTimeout(() => {
    eventTimer.delete(name);
    nextEventAt.set(name, Date.now() + SDK_EVENT_GAP_MS);
    call(fn);
  }, at - now));
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

  // Accounts are optional. A failure here must not take ads or saves down with it.
  // The data module already ties those saves to the CrazyGames account; we do not merge.
  let user = unavailableUser();
  try {
    user = await createUserService(sdk.user);
  } catch {
    user = unavailableUser();
  }

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
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = (result: AdResult) => {
          if (settled) return;
          settled = true;
          if (timer !== undefined) clearTimeout(timer);
          setAdMuted(false);
          resolve(result);
        };
        timer = setTimeout(() => finish({ ok: false, code: 'timeout' }), AD_REQUEST_TIMEOUT_MS);
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
    gameplayStart: () => emit('gameplayStart', () => sdk.game.gameplayStart()),
    gameplayStop: () => emit('gameplayStop', () => sdk.game.gameplayStop()),
    happytime: () => emit('happytime', () => sdk.game.happytime()),
    ads,
    user,
  };
}

function loadSdkScript(): Promise<CrazySDK | null> {
  const ready = window.CrazyGames?.SDK;
  if (ready) return Promise.resolve(ready);
  const existing = document.querySelector<HTMLScriptElement>('script[data-cg-sdk]');
  if (existing) {
    // The tag is blocking, so by the time this module runs it has usually finished.
    // If the document is still parsing, wait instead of treating a live download as a failure.
    if (document.readyState !== 'loading') return Promise.resolve(null);
    return new Promise((resolve) => {
      const finish = () => resolve(window.CrazyGames?.SDK ?? null);
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', finish, { once: true });
      document.addEventListener('DOMContentLoaded', finish, { once: true });
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.dataset.cgSdk = '1';
    script.onload = () => resolve(window.CrazyGames?.SDK ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Whether to start the SDK here. CrazyGames always runs games inside an iframe, and the
 * SDK's own local mode wants localhost (or ?useLocalSdk=true on a LAN IP). Anywhere else,
 * such as the game opened directly on GitHub Pages, init only works out it is disabled,
 * and that takes about 7 seconds. Skip it there so the menu shows at once.
 */
export function shouldBootSdk(where: { hostname: string; search: string; framed: boolean }): boolean {
  if (where.framed) return true;
  if (where.hostname === 'localhost' || where.hostname === '127.0.0.1' || where.hostname === '[::1]') return true;
  return new URLSearchParams(where.search).get('useLocalSdk') === 'true';
}

export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent: we are framed
  }
}

/** Init the SDK on CrazyGames or a local dev host; otherwise play offline. */
export async function bootPortal(): Promise<Portal> {
  if (typeof window === 'undefined') return offlinePortal();
  if (!shouldBootSdk({ hostname: location.hostname, search: location.search, framed: isFramed() })) return offlinePortal();
  try {
    return await connectPortal(await loadSdkScript());
  } catch {
    return offlinePortal();
  }
}
