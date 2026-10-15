# Rider Dash

A 3-lane runner: deliver parcels across Bengaluru on a scooter, dodging autos, cows and potholes.
Build brief and roadmap: [CLAUDE.md](CLAUDE.md). Reference prototype: [prototype/core-game-test.html](prototype/core-game-test.html).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173, also on your Wi-Fi so you can open it on a phone
npm test         # simulation unit tests (Vitest)
npm run build    # type-check + production build into dist/
```

Controls: swipe or tap left/right to change lanes, swipe up to jump. Keyboard: ← → and ↑ / Space.

## Layout

- `src/sim/` — game rules. Pure TypeScript, fixed 60 Hz tick, seeded PRNG; no DOM, no `Math.random`.
  A run is `seed + level config + input log`, so `replay()` reproduces it exactly.
- `src/data/` — levels and tuning numbers as JSON. Balance changes go here, not in code.
- `src/render/` — Canvas 2D pseudo-3D renderer and effects. Reads sim state, never writes it.
- `src/input.ts` — swipes, taps and keys turned into queued commands.
- `src/platform/` — analytics events (console sink for now) and fail-soft local storage.
