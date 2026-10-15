// Fixed analytics events from day one. Events are buffered here; a real sink (portal SDK
// or our own endpoint) plugs in at milestone 4 without changing call sites.
import { load, save } from './storage';

export type AnalyticsEvent =
  | { name: 'session_start' }
  | { name: 'level_start'; level: string }
  | { name: 'level_end'; level: string; result: 'won' | 'lost' | 'quit'; stars: number; time: number }
  | { name: 'hit'; level: string; kind: string }
  | { name: 'revive_offer'; level: string }
  | { name: 'ad_watched'; placement: string }
  | { name: 'endless_end'; score: number };

export interface AnalyticsSink {
  send(event: AnalyticsEvent & { playerId: string; at: number }): void;
}

/** Stable anonymous player id, kept across sessions where storage allows. */
function playerId(): string {
  let id = load<string | null>('pid', null);
  if (!id) {
    id = crypto.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
    save('pid', id);
  }
  return id;
}

const consoleSink: AnalyticsSink = {
  send: (e) => {
    if (import.meta.env.DEV) console.debug('[analytics]', e.name, e);
  },
};

let sink: AnalyticsSink = consoleSink;
const id = playerId();

export const setAnalyticsSink = (s: AnalyticsSink) => (sink = s);
export const track = (e: AnalyticsEvent) => sink.send({ ...e, playerId: id, at: Date.now() });
