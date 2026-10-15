# Changelog

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
