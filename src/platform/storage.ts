// localStorage can be missing or throw (private mode, blocked storage, portal iframes).
// Every read and write goes through here and fails soft.
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`rd:${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`rd:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress lasts this session only */
  }
}
