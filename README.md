# Rider Dash

A 3-lane runner: deliver parcels through eight Indian cities on a scooter, dodging autos, cows and potholes.
Build brief and roadmap: [CLAUDE.md](CLAUDE.md). Reference prototype: [prototype/core-game-test.html](prototype/core-game-test.html).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173, also on your Wi-Fi so you can open it on a phone
npm test         # simulation unit tests (Vitest), including the 200-level balance check
npm run balance  # rewrite BALANCE.md from that same check
npm run build    # type-check + production build into dist/
npm run zip      # production build + rider-dash-crazygames.zip (see CRAZYGAMES.md)
```

Open `http://localhost:5173/?unlock` to play any level without clearing the ones before it. That query is ignored when the game is running on CrazyGames.

Controls: swipe or tap left/right to change lanes, swipe up to jump. Keyboard: ← → and ↑ / Space.
Switching tabs or leaving the window pauses a run until you tap Resume. The speaker button mutes the music and effects; that choice is saved. The first neighbourhood shows steer, parcel, and DROP hints until you clear it.

## Layout

- `src/sim/` — game rules. Pure TypeScript, fixed 60 Hz tick, seeded PRNG; no DOM, no `Math.random`.
  A run is `seed + level config + input log`, so `replay()` reproduces it exactly.
- `src/data/` — cities and areas, the difficulty curve, and tuning numbers as JSON. Balance changes go here, not in code.
  Add a city or area by editing `cities.json`; its level settings are generated from the curve.
- `src/sim/bot.ts`, `src/sim/balance.ts` — headless rider and the clearability report in [BALANCE.md](BALANCE.md).
- `src/render/` — Canvas 2D pseudo-3D renderer and effects. Reads sim state, never writes it.
- `src/input.ts` — swipes, taps and keys turned into queued commands.
- `src/platform/` — analytics, fail-soft saves, procedural audio, and the CrazyGames adapter (ads, data, and the optional account chip).
