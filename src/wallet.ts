// Saved coin wallet. Coins from every run land here, so a rewarded "double coins" has
// something lasting to double. Scores never include wallet coins.
import { load, save } from './platform/storage';

let coins: number | null = null;

export function walletCoins(): number {
  if (coins === null) {
    const saved = load<unknown>('wallet', 0);
    coins = typeof saved === 'number' && Number.isFinite(saved) ? Math.max(0, Math.floor(saved)) : 0;
  }
  return coins;
}

/** Read the wallet again. Call after the storage backend changes. */
export function reloadWallet() {
  coins = null;
}

export function addCoins(n: number): number {
  const next = Math.max(0, walletCoins() + Math.trunc(n));
  coins = next;
  save('wallet', next);
  return next;
}

/** Spend coins if the wallet holds enough. Returns false, and spends nothing, otherwise. */
export function spendCoins(n: number): boolean {
  const cost = Math.max(0, Math.trunc(n));
  if (walletCoins() < cost) return false;
  addCoins(-cost);
  return true;
}

/**
 * What one run has paid into the wallet. A run can end, be revived (a coin revive spends
 * in-run coins), and end again; settling each time pays only the difference, so the
 * wallet always gains exactly the run's final coins. The ad bonus is paid once on top.
 */
export class RunPayout {
  private paid = 0;
  private bonusPaid = 0;

  settle(runCoins: number): number {
    const delta = runCoins - this.paid;
    this.paid = runCoins;
    if (delta !== 0) addCoins(delta);
    return delta;
  }

  /** Pay the "double coins" bonus: (multiplier - 1) × the run's coins. Once per run. */
  double(runCoins: number, multiplier: number): number {
    if (this.bonusPaid > 0 || runCoins <= 0) return 0;
    this.settle(runCoins);
    this.bonusPaid = Math.floor(runCoins * (multiplier - 1));
    addCoins(this.bonusPaid);
    return this.bonusPaid;
  }

  get doubled(): boolean {
    return this.bonusPaid > 0;
  }

  get bonus(): number {
    return this.bonusPaid;
  }
}
