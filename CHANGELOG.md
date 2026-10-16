# Changelog

## 0.13.0 — 2026-10-16 · Parcel thieves (Phase 4c)

- From Hyderabad area 6 (Madhapur, with a "New:" tip) onward, a rival rider sometimes comes for
  a parcel, only while you carry one. It pulls up beside you, flashes a red "!" for about a
  second, then lunges. Swerve into it to shove it off (+10 coins); be a lane further away to
  dodge; nitro leaves it behind. If it grabs a parcel, it drops it on the road ahead in its
  lane, so you can win it back. Never costs a heart.
- Rival art: the rider drawn in dark colours on a grey scooter.
- The practice bot shoves thieves when the lane is clear. Balance now uses 10 seeds per area
  (less noise): Bengaluru 99% → Ahmedabad 77%. 115 tests.

## 0.12.0 — 2026-10-16 · City signature threats (Phase 4b)

Each city after Bengaluru introduces its feature in area 3 with a "New:" tip; that area is kept
dry and in daylight. Data in `levels.json` → `cityThreats`, timings in `tuning.json`.

- Mumbai — waterlogged puddles: ride through and you slow a little and steer sluggishly for
  1.5 s; jump to stay dry. Puddles guard the open lane, on top of normal traffic.
- Delhi — winter fog (Delhi only): the far road fades into white. Visual only.
- Hyderabad — construction zones: barricades close the same two lanes for four rows.
- Chennai — hot food: steaming parcels pay a 15-coin tip if delivered within 8 s.
- Pune — monkeys guard the open lane and grab a parcel unless you jump (no heart lost).
- Kolkata — tram lines (Kolkata only): one lane has rails; long trams run toward you down it.
  While one is coming, the other two lanes carry at most one obstacle.
- Ahmedabad — festival crowds: two people cross from opposite sides at once.
- Puddles, zones, hot food, monkeys and crowds carry on into later cities.
- New sprites: puddle, barricade, monkey, tram.
- BALANCE.md: Bengaluru 98% → Mumbai 96% → … → Ahmedabad 74%. 109 tests.

## 0.11.0 — 2026-10-16 · City landmark skylines (Phase 4a)

- Each city has its own skyline behind the road, centred on a landmark: Vidhana Soudha
  (Bengaluru), Gateway of India (Mumbai), India Gate and Qutub Minar (Delhi), Charminar
  (Hyderabad), a temple gopuram and the lighthouse (Chennai), Shaniwar Wada (Pune), Howrah
  Bridge (Kolkata), and the minarets with kites (Ahmedabad). Endless uses Bengaluru.
  Files: `src/sprites/skyline-<city>.svg`, same flat palette as before.

## 0.10.0 — 2026-10-16 · Shop (Phase 3)

- Shop opens after BTM Layout (Bengaluru area 5); before that its button shows a lock and says
  when it opens. Coins are only earned by riding. Data in `src/data/shop.json`.
- Upgrades: magnet, parcel net, nitro and 2× coins each have 5 levels at 100 / 250 / 500 /
  1,000 / 2,000 coins; each level adds 20% duration (level 5 = twice as long).
- Boosts, picked on a ride's briefing and paid when you ride: helmet (75), nitro start (60),
  extra heart (120, a 4th heart; stars still cap at 3). Once the shop is open, Play goes
  through the briefing so boosts can be picked.
- Rider looks: the first three jackets and helmets and all skins are free; seven more cost
  150–600 coins. Each city after Bengaluru gives a themed look for clearing its last area
  (Mumbai raincoat, Delhi winter maroon, Hyderabad hard hat, Chennai marina blue, Pune
  monsoon green, Kolkata taxi yellow, Ahmedabad kite pink). Locked swatches show a lock;
  tapping one offers the purchase or names the city.
- Upgrades and boosts are part of a run's inputs (`RunMods`), so replays stay exact.
- Purchases (`owned`, `upgrades`) save with the rest of progress, CrazyGames data module included.
- 101 tests.

## 0.9.0 — 2026-10-16 · Power-ups (Phase 2)

- Six road power-ups, unlocked one per Bengaluru area with a "New:" tip and shown early in
  that area: magnet (BTM Layout), parcel net (Basavanagudi), safety helmet (Ulsoor), nitro
  (Vijayanagar), 2× coins (Whitefield), extra heart (Electronic City, only after losing one).
- Effects: magnet pulls coins from every lane; net scoops parcels from the next lane and
  further ahead; helmet absorbs one crash (including the dog); nitro ×1.45 speed, no crashes,
  skims potholes; 2× doubles coin and delivery pay. Timers in `tuning.json` → `powerTicks`.
- HUD chips with draining bars; glowing bubbles on the road; nitro flare.
- Rain and night now start from Bengaluru area 9, so new players get eight calm areas.
- Bot grabs power-ups only in clear lanes and no longer cuts through a blocked middle lane.
  BALANCE.md: Bengaluru 98%, declining to Ahmedabad 83%. 92 tests.

## 0.8.0 — 2026-10-16 · Threats and the brake (Phase 1)

- Moving threats, unlocked one per teaching area in Bengaluru, each with a "New:" tip card:
  people crossing (Malleshwaram), a slow cow ambling down your lane (JP Nagar), swerving autos
  that flash an indicator first (Frazer Town), a chasing street dog (Banashankari) and
  wrong-way scooters (Marathahalli). The area after each one is a breather with fewer threats.
  One moving threat at a time until Hyderabad, then two. Schedule and rates are in
  `levels.json` → `threats`; speeds and timings in `tuning.json` → `movers`.
- The dog runs just faster than your cruising speed for 6 s. Hold your speed and it gives up;
  a crash or a pothole lets it catch you (counts as a crash). A drop-off shakes it off.
- Potholes and speed breakers no longer cost a heart. Ride over one and you drop to about half
  speed and lose your combo; jump it to keep going.
- A crash also costs some speed.
- Brake: swipe down and hold, or hold ↓ / S. Slows to half speed while held, never stops; let
  go to speed back up. Resets your combo. Unlocks in Mumbai (Khar) so Bengaluru stays simple.
- New sprites: pedestrian and street dog. The wrong-way scooter uses the front rider art.
- Practice bot predicts lane changes by arrival time and uses the brake where it is unlocked.
  BALANCE.md: Bengaluru 98% clear, every city declining gently to Ahmedabad 54%.
- Tests guard the schedule, that the first five Bengaluru areas always clear, and that
  Bengaluru as a whole clears at least 90%. 85 tests.

## 0.7.0 — 2026-10-16 · One parcel per home, speed per drop-off

- A DROP zone takes one parcel. Carrying three means three drop-offs. Each drop-off pays
  10 coins × the combo (up to ×3). A DROP zone you reach with an empty box stays on the road.
- You can never carry more parcels than the goal still needs: a 2-parcel level gives a box of
  2, and after one drop-off, 1. Extra parcels stay on the road. The HUD shows that many slots.
- Speed in a level no longer climbs with time. It starts at `v0` and steps up after each
  drop-off toward `v1`, easing in at `speedAccel` (90 units/s²) rather than jumping.
  Endless still speeds up over time and adds `endlessSpeedPerDrop` (12) per drop-off, capped at `v1`.
- BALANCE.md regenerated: bot clear rate 63% (was 59%), average winning run 62 s.
- 68 tests.

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
