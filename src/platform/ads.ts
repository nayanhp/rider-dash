// Game code asks this interface for ads. It never talks to a portal SDK itself.
export type AdKind = 'midgame' | 'rewarded';

export interface AdResult {
  ok: boolean;
  /** 'finished' when the ad completed, otherwise an SDK or fallback error code. */
  code: string;
}

export interface AdService {
  /** Rewarded buttons are shown only when this is true, so a click always does something. */
  rewardedAvailable(): boolean;
  request(kind: AdKind): Promise<AdResult>;
}

/** Used off CrazyGames and whenever the SDK cannot show ads. Resolves immediately. */
export function stubAds(): AdService {
  return {
    rewardedAvailable: () => false,
    request: async () => ({ ok: false, code: 'unavailable' }),
  };
}
