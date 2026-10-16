// Real-money purchases. Game code asks this interface; it never talks to a payment SDK itself,
// the same way ads go through AdService.
//
// Providers:
// - 'none': no store wired up here. Packs show "Coming soon" where the store is visible.
// - 'test': localhost, or ?testpay off CrazyGames. Asks the player to confirm a fake purchase;
//   no money moves. A CrazyGames production build ignores ?testpay.
// - 'live': a real provider (CrazyGames Xsolla, Google Play Billing). Not wired yet.
//   CrazyGames purchases are invite-only and need a signed-in player; see CRAZYGAMES.md.
//   Until then the coin store is hidden on the portal (see coinStoreVisible).
import shop from '../data/shop.json';
import { honourDevQuery, type PaymentMode, type PortalMode } from './launch';

export type { PaymentMode };

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  bonus: number;
  /** Display price when the provider has none of its own. */
  price: string;
  tag?: string;
}

export const COIN_PACKS = shop.coinPacks.packs as CoinPack[];

export interface PaymentResult {
  ok: boolean;
  /** 'paid', 'cancelled', 'unavailable', or a provider error code. */
  code: string;
}

export interface PaymentService {
  mode: PaymentMode;
  available(): boolean;
  priceLabel(pack: CoinPack): string;
  buy(pack: CoinPack): Promise<PaymentResult>;
}

export function noPayments(): PaymentService {
  return {
    mode: 'none',
    available: () => false,
    priceLabel: (p) => p.price,
    buy: async () => ({ ok: false, code: 'unavailable' }),
  };
}

/** For development: every purchase is confirmed by the player in-game and costs nothing. */
export function testPayments(confirm: (pack: CoinPack) => Promise<boolean>): PaymentService {
  return {
    mode: 'test',
    available: () => true,
    priceLabel: (p) => p.price,
    buy: async (p) => ((await confirm(p)) ? { ok: true, code: 'paid' } : { ok: false, code: 'cancelled' }),
  };
}

/**
 * Test purchases on a local dev host, or off-portal with ?testpay.
 * CrazyGames production ignores the query (and a dev-looking host) so a shared link cannot grant coins.
 * Dev builds still honour it, including when the local SDK reports the portal.
 */
export function wantsTestPayments(where: {
  hostname: string;
  search: string;
  portal?: PortalMode;
  dev?: boolean;
}): boolean {
  const portal = where.portal ?? 'offline';
  const dev = where.dev ?? false;
  if (!honourDevQuery(portal, dev)) return false;
  const local = where.hostname === 'localhost' || where.hostname === '127.0.0.1';
  return local || new URLSearchParams(where.search).has('testpay');
}

export const packTotal = (p: CoinPack) => p.coins + p.bonus;
