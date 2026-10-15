# Changelog

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
