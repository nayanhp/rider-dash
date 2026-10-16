# Rider Dash — build brief for Claude Code

Studio: Meme Labs (Nayan Patel, personal account, no company yet).
Game #1 of the studio. Reference prototype: `prototype/core-game-test.html` (single file, playable — open the Rider Dash tab). Port its feel, not its code structure.
Background vision doc (wider studio ideas): https://claude.ai/code/artifact/bfccc4b0-814a-41eb-b3c5-971b2c22bd64

## The game
A Subway Surfers-style 3D-perspective runner. You are a quick-commerce delivery rider on a scooter, starting in Bengaluru and riding on through seven more Indian cities.
- **Controls:** swipe/tap left-right to change between 3 lanes; swipe up to jump. Keyboard arrows + space on web.
- **Loop:** collect 📦 parcels (carry max 3), ride through green DROP zones to deliver all carried parcels. Collect ₹ coins. Dodge autos, cars, cows (must change lane) and jump potholes/speed breakers. A hit costs a heart and a carried parcel; 3 hearts.
- **Levels:** 8 cities × 25 areas = 200 generated levels. Neighbourhoods live in `src/data/cities.json`. Speed, delivery goal, density, and the intro/weather copy come from the curve in `src/data/levels.json` (`cityStep` 0.057143, `areaSpan` 0.6), so the hardest tune is the last area of the last city. The first four Bengaluru areas teach obstacles one at a time (autos, then cars, then jumps, then cows). Rain areas steer slower; night is a visual shift; every city ends on a night finale. Stars = hearts left. The prototype's six hand-tuned roads are reference feel only.
- **Endless mode:** speed keeps increasing; high score = coins + deliveries + distance.
- **Rider avatar:** seen from behind, scooter + delivery box showing carried parcels; customisable jacket, helmet, skin. Later: scooter skins, box designs, helmets (cosmetic only).
- **Feel targets:** 60 fps on budget Android phones, big readable silhouettes, juicy feedback (coin sparkle, delivery burst, screen shake on hit, combo multiplier for back-to-back drops), short sessions (levels 30–90 s).
- Difficulty: level 1 must be beatable by anyone; the prototype's level 1 is probably too easy — tune with playtests.
- Look: bright, chunky cartoon style (original — no copying Subway Surfers or any other game's art). All art AI-generated, then cleaned up for consistency. English only. Fictional brands only.

## Stack
- TypeScript + Vite + Phaser 3 (or plain Canvas 2D if simpler for the pseudo-3D road). Game logic in plain TypeScript, separate from rendering, unit-tested with Vitest.
- Web first: builds for CrazyGames / Poki / GameDistribution. Android later via Capacitor + AdMob.
- Backend only when needed (milestone 4): Supabase free tier.

## Architecture rules
1. **Seeded, deterministic runs.** A run = seed + level config + input log → same result. Seeded PRNG (mulberry32); never `Math.random()` in game logic; fixed-tick simulation. Enables fair daily challenges, server replay checks and ghost races later.
2. **Content as data.** Levels, obstacle mixes, speeds, spawn rules, cosmetics in JSON config. No balance numbers hard-coded in logic.
3. **`AdService` interface** with a stub implementation first, then one adapter per portal SDK and AdMob. Game code never calls an ad SDK directly.
4. **Analytics from day one:** fixed events (session_start, level_start, level_end{result, stars, time}, hit, revive_offer, ad_watched, endless_end{score}). One stable anonymous player ID.
5. **Save** progress locally (stars, coins, cosmetics, best scores); cloud save later.
6. Money and scores as integers. Strings and region are settings.

## Monetisation (in order)
1. Rewarded ads: **revive after a crash** (once per run), **double coins** at the end of a run.
2. One interstitial between levels at most, never mid-run.
3. Coin packs for real money (decided 2026-10-16): bought coins spend like earned coins, on upgrades, boosts and looks. Premium looks (patterns, metallics) are the main draw. Payments go through a `PaymentService` interface (`src/platform/payments.ts`); providers: CrazyGames via Xsolla (invite-only, signed-in players), Google Play Billing on Android. Test mode on localhost or `?testpay`. Still: no loot boxes, nothing cashable.
4. Android: one-time "remove ads".
5. Later: sponsored levels or skins only with a signed brand deal.

## Milestones (gate before moving on)
1. **Core run** — pseudo-3D road, lanes, jump, obstacles, parcels, drop zones, coins, hearts, seeded spawner with tests. Playable on a phone browser.
2. **Levels + endless + avatar** — 200 generated city levels, level select with stars, endless with high score, avatar picker, local save.
3. **Polish** — final art, sounds and music, juice, performance pass on a budget Android phone, onboarding hints.
4. **Web launch** — portal SDK via `AdService` (revive + double coins), analytics, submit to portals. Gate: day-1 retention ≥ 35%, average session ≥ 5 min.
5. **Android** — Capacitor + AdMob, cosmetic shop, Play closed test.

Later games reuse this codebase's platform pieces: Merge Fleet (levels + "+5 moves" ads) is game #2; Bag Pack and Route Rush are candidates.

## Working style
Small playable steps. After each step: run tests, run the game, commit. Keep a `CHANGELOG.md`. Ask before adding dependencies or services that cost money.
