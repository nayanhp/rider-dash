# Changelog

## 0.6.1 — 2026-10-16 · Fast live link, coin wallet

- The CrazyGames SDK now starts only inside the CrazyGames iframe or on a local dev host
  (localhost, 127.0.0.1, or `?useLocalSdk=true`). Opened directly elsewhere, such as GitHub
  Pages, `SDK.init()` spent about 7 seconds deciding it was disabled; the menu now shows in
  about 0.1 s there.
- Coins from every run go into a saved wallet (`wallet`, synced through the CrazyGames data
  module like other progress). A run that ends, is revived with coins, and ends again pays in
  only its final coins.
- Double coins pays its bonus into the wallet. It no longer changes the run's coins, so the
  Endless score and saved best stay as earned and a run still replays from seed + inputs.
- Menu: saved coins in the panel corner; Cities and Rider share a row; smaller logo on
  shorter phones; keyboard help hidden on touch-only devices; the panel no longer spills
  past its bottom edge or sits under the sound button.
- 7 new tests (65 total).

## 0.6.0 — 2026-10-15 · Avatar picker

- Rider look is cosmetic: jacket, helmet and skin, chosen from the design avatar kit
  (`src/sprites/avatars/`). The default is the kit's baked rider — kerb-red jacket, parcel-yellow
  helmet, medium skin — on the same red scooter. `rider-front.svg` (`files.front`, viewBox
  `0 0 128 160`) is the picker preview at 128px. A run still draws the back and lean poses.
  Recolouring swaps the three group fills and rasters those poses when the look changes, not every frame.
- The choice is saved with the rest of progress (`avatar`), including the CrazyGames data
  module when that module is enabled. Unknown ids fall back to the default part.
- Menu has a Rider button. Play, retry, menu, map, endless, back, and pause use the design
  UI sprites. Rain, night, and city unlock use the design badges.
- Each in-run pose is tinted, loaded through a blob URL, and cached as a 256×320 canvas. The cache
  rebuilds only when the look changes. The picker shows the front pose at 128px.
- The simulation is unchanged. `npm test` is 57 tests. `npm run zip` is still 7 files, 181,798 bytes (0.173 MB) uncompressed.

## 0.5.0 — 2026-10-15 · Art pass

- Gameplay objects use the Design & Brand SVGs (rider, lean left/right, parcel, coin, auto, car, cow, pothole, speed breaker, drop pad, tree, house, skyline). Each sprite is rasterised once onto a canvas and drawn with `drawImage`, sized from the lane width. The upright rider swaps to the lean sprites while changing lanes. The word DROP stays canvas text. Night and rain still use the full-screen tint.
- HUD, menu, pause, and result screens use the same set: parcel slots, coin, hearts, flag, speaker, stars, locks, and city marks. Lilita One and Baloo 2 are self-hosted (woff2, `font-display: swap`) with the SIL licence in the zip. No font request leaves the game. Palette: Ink, Night, Parcel Yellow, Kerb Red, Drop Green, Cream, Road, Sky, Action Blue. The sky is the only gradient.
- Menu: logo, first-run how-to (hidden once `seenHow` is saved), Play / Endless / Cities. Pause button, Esc, and P open a Resume / Restart / Areas panel; Resume counts 3-2-1 before the road moves. Result chips, star pop, coin count-up, and a small confetti burst on a new endless record. Coin pop, delivery flash, heart loss, and hit shake respect reduced motion.
- Button labels keep their emoji (Play, Endless, Cities, Retry, and the rest). Rain and night badges on the area grid stay as emoji. Hit and coin particles stay small squares.
- The simulation is unchanged. `npm run zip` is 7 files, 170,374 bytes (0.162 MB) uncompressed, with relative asset paths.

## 0.4.0 — 2026-10-15 · Pause, sound, and a 200-level balance pass

- Leaving the tab or the window freezes a live run and shows a Resume overlay, so the road cannot tick while you are not looking. An ad hold does the same. Blur does not send CrazyGames gameplay events; their site already tracks focus.
- Procedural music and effects (jump, coin, parcel, drop, hit, level clear) from WebAudio, with no audio files. The speaker button is saved. `muteAudio` from the SDK wins, ads mute only while they play, and the first tap or key starts the audio context.
- The opening neighbourhood shows steer, parcel, and DROP hints until that area has been cleared. Later areas stay quiet.
- `window.rd` is attached only in dev builds.
- Difficulty `cityStep` is 0.057143 so the curve reaches its ceiling on the last area of Ahmedabad, instead of copying that maximum across the end of Kolkata and Ahmedabad. `npm run balance` rewrites `BALANCE.md`. The bot clears Koramangala on every seed; city clear rates step down from 86% to 34% with no tuning plateau and no within-city cliff.
- A tied endless score is no longer called a new record. `level_end` is sent when you leave the result, so a revive is one run. An ad that never calls back releases the game after two minutes, and the result buttons ignore keys while an ad is up. A still-loading SDK script is not treated as missing.

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
