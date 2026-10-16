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

## Current state (2026-10-16)
Live demo: https://nayanhp.github.io/rider-dash/ (GitHub Pages; every push to `main` deploys after tests pass). Off CrazyGames, `?unlock` opens every level and `?testpay` enables free test coin purchases. Both are ignored on a CrazyGames production build. Localhost still uses test purchases.
Built so far: 200 city levels; threats and a held brake (unlocks in Mumbai); power-ups; shop (upgrades, boosts, priced and premium looks incl. delivery box); city skylines; city threats (puddles, fog, construction zones, hot food, monkeys, trams, crowds); parcel thieves; coin store (real-money packs via `PaymentService`, test mode only). Per-phase details in `CHANGELOG.md`. Balance report: `npm run balance` → `BALANCE.md` (10 bot seeds per area; Bengaluru must stay ≥90% clear, first five areas 100%; tests enforce this).
Key files: rules `src/sim/run.ts` (deterministic, no DOM); level generation `src/sim/config.ts` + `src/data/*.json`; screens `src/main.ts`; drawing `src/render/`; portal SDK `src/platform/crazygames.ts`; ads `src/platform/ads.ts`; payments `src/platform/payments.ts`; CrazyGames notes `CRAZYGAMES.md`.

## Next: CrazyGames launch checklist
Checked against docs.crazygames.com/requirements (intro, technical, ads, game-covers) on 2026-10-16. Target **Basic Launch** first (no ads or purchases; SDK optional but integrated), then Full Launch when CrazyGames selects the game. Work through in order; test, run the game, commit after each item.

**Already passing (keep it that way)**
- Size: build is 7 files, ~270 KB (limits: 50 MB initial / 20 MB for mobile homepage, 250 MB total, 1,500 files). Relative paths only (`base: './'`; `npm run zip` refuses absolute paths).
- SDK: init, `loadingStart/Stop`, `gameplayStart/Stop` (throttled), `happytime`; Data module saves (stars, coins, looks, upgrades); mute on `muteAudio`; works if the SDK is missing or blocked.
- Ads: only through the SDK; midgame only at Retry / Next / Ride again, and not while a revive or double-coins offer is on that screen; never when entering or leaving Shop, Rider, Get coins, or the other menus; game blocked and audio muted only while an ad actually plays; `adError` never rewards; rewarded buttons hidden with an adblocker or `adsDisabledBasicLaunch`; revive is once per run; coin-revive is the non-ad alternative.
- `user-select: none` with prefixes; safe-area padding; touch + mouse + keyboard; landscape and portrait both play; iOS audio resumes on a user gesture; no external links, logins or other ad networks; PEGI 12-safe content.

**Done in code**
- [x] 1. **Hide the coin store on CrazyGames.** When `portal.mode` is `crazygames`, the `+` on coin chips and every "Get coins" button stay hidden until `PaymentService.mode` is `live`. The saved balance still shows. GitHub Pages and local dev keep the store (Soon, or test purchases).
- [x] 2. **Remove the debug hook in production.** `attachDebug` is called with `import.meta.env.DEV`, and only from inside that same dev check, so production builds do not put `window.rd` on the page.
- [x] 3. **Ignore `?unlock` and `?testpay` on CrazyGames.** Honoured off-portal and in dev builds. A production portal link cannot open every neighbourhood or grant test coins. Localhost still uses test purchases.
- [x] 4. **Load closer to gameplay.** A first-time player (no stars saved, and `?unlock` not in effect) starts Koramangala right after loading, with the in-run hints. A saved star, or `?unlock` where that query is honoured, keeps the menu.
- [x] 5. **Ad pacing.** Shop, Rider, Get coins, Cities, Areas, and the menu never request a midgame, going in or out. Retry / Next / Ride again request one only when that break is not offering revive or double coins and has not already played a rewarded ad. Skipping double coins does not fall through into a midgame. See `CRAZYGAMES.md`.
- [x] 6. **Safari pass.** Exercised with Playwright WebKit and iPhone device emulation (not a physical iPhone or iOS Simulator). Safe-area insets pad the HUD, hints, menus, and mute button; premium look previews use blob URLs so pattern and gradient fills resolve; audio resumes on pointerdown and touchend. What the emulator cannot stand in for is noted in the changelog and the pull request.

**Nayan does these by hand (needs accounts or creative work)**
- [ ] 7. **Covers, no borders, title as the only text, no icons:** landscape 1920×1080 (16:9), portrait 800×1200 (2:3), square 800×800 (1:1); consistent art across all three; rider and scooter as the hero.
- [ ] 8. **Preview video:** 15–20 s, silent, no fast-forward, no black screens/bars or mouse cursor, first frame = the cover; two files, landscape 1080p 16:9 and portrait 1080p 2:3; ≤ 50 MB each.
- [ ] 9. **Developer Portal:** create the game, upload `rider-dash-crazygames.zip` (`npm run zip`), set orientations (both), Progress Save = "Yes, using the Data Module", paste title/description/controls from `CRAZYGAMES.md` → "Paste-ready listing", then preview in the portal (QA tool) before submitting. Do not upload from an agent.
- [ ] 10. **Later, if invited to in-game purchases:** follow `CRAZYGAMES.md` → "In-game purchases"; purchases need signed-in players and must stay hidden in the CrazyGames mobile app.

**Gate after launch:** Basic Launch metrics decide promotion to Full Launch (see docs.crazygames.com/resources/basic-launch-metrics). Our own targets: day-1 retention ≥ 35%, average session ≥ 5 min.

## Working style
Small playable steps. After each step: run tests, run the game, commit. Keep a `CHANGELOG.md`. Ask before adding dependencies or services that cost money.
