# Changelog

## 0.3.0 — 2026-10-15 · CrazyGames submission build

- HTML5 SDK v3 adapter (`src/platform/crazygames.ts`): init, loading start/stop, gameplay start/stop around a real run, happy time on a new endless record or a cleared city. Falls back to a no-op when the SDK is missing or disabled.
- Midgame ads between runs (Retry / Next / Ride again). Rewarded revive once per run, and optional double coins. The UI blocks and audio stays muted while an ad plays. No ad on menu or city navigation, and no midgame on a break that already offers revive.
- Progress (stars, endless best, player id) goes through the SDK data module, with a one-time copy from local storage. Local storage remains the fallback off CrazyGames.
- `npm run zip` writes `rider-dash-crazygames.zip` for the developer portal. This build is 3 files, 39,556 bytes (0.038 MB), under the 20 MB / 50 MB / 250 MB and 1500-file caps. See `CRAZYGAMES.md`.
- Play on the main menu starts the current neighbourhood in one click. Revive is a logged sim command, so a replay stays deterministic.

## 0.2.0 — 2026-10-15 · Cities and areas

- Levels are now city → area: 8 cities (Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune,
  Kolkata, Ahmedabad) × 25 real neighbourhoods = 200 levels, listed in `src/data/cities.json`.
- Level settings come from one difficulty curve in `src/data/levels.json`: each city starts a
  bit harder than the last and ramps up through its areas. Rain and night areas on a fixed
  rhythm (Mumbai rains more); every city ends on a night finale.
- First four Bengaluru areas introduce obstacles one at a time (autos, cars, jumps, cows).
- City list, area grid with stars, level briefing, Next / next-city on the result screen.
- Areas unlock in order; clearing a city's last area opens the next city. Stars saved locally.
  Add `?unlock` to the URL to open every level for testing.
- 6 new level-generator tests (22 total).

## 0.1.0 — 2026-10-15 · Milestone 1: core run

- Vite + TypeScript + Vitest project; plain Canvas 2D renderer.
- Deterministic simulation: mulberry32 seeded PRNG, fixed 60 Hz tick, input log + `replay()`.
- Three lanes, jump, autos/cars/cows/potholes/speed breakers, parcels (carry 3), drop zones
  with combo bonus, ₹ coins, 3 hearts with post-hit invulnerability.
- Spawner never blocks all three lanes; the open lane carries the reward.
- Level 1 ("First delivery") and Endless playable; all six levels and tuning live in JSON.
- Swipe, tap and keyboard controls; HUD; win/lose screens; endless best score saved locally.
- Analytics events wired (session_start, level_start, level_end, hit, endless_end) to a console sink.
- 16 simulation tests.
