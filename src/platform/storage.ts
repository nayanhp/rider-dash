// Progress keys. On CrazyGames these go through the SDK data module (see crazygames.ts);
// everywhere else they go through localStorage, which can throw or be missing.
export const PROGRESS_KEYS = ['stars', 'best', 'pid', 'muted'] as const;
export const storageKey = (key: string) => `rd:${key}`;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memory = new Map<string, string>();
const memoryStore: KeyValueStore = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
};

function browserStore(): KeyValueStore {
  try {
    const probe = storageKey('probe');
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    };
  } catch {
    return memoryStore;
  }
}

let store: KeyValueStore = browserStore();

/** Swap the backend. Called once CrazyGames data is ready, before progress is read. */
export function useStore(next: KeyValueStore) {
  store = next;
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = store.getItem(storageKey(key));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    store.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* storage unavailable: progress lasts this session only */
  }
}
