// mulberry32: tiny seeded PRNG. The whole state is one uint32, so it can live in RunState
// and be snapshotted or replayed. Never use Math.random() in game logic.
export function nextU32(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [(t ^ (t >>> 14)) >>> 0, next];
}

export class Rng {
  constructor(public state: number) {
    this.state = state >>> 0;
  }
  /** Float in [0, 1). */
  next(): number {
    const [v, s] = nextU32(this.state);
    this.state = s;
    return v / 4294967296;
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
