# Rider Dash on CrazyGames

Submission notes for the [CrazyGames developer portal](https://developer.crazygames.com/). Requirements below follow the HTML5 SDK v3 docs at [docs.crazygames.com](https://docs.crazygames.com/sdk/intro/) (checked October 2026).

## Build the upload

```bash
npm install
npm test
npm run zip
```

`npm run zip` type-checks, builds `dist/`, and writes `rider-dash-crazygames.zip` at the repo root. The zip’s root is `index.html` (not a `dist/` folder). Asset URLs are relative (`./assets/...`), so the build loads from whatever subfolder or iframe CrazyGames uses. The script refuses to pack a build that contains root-absolute paths, and it prints the uncompressed size against CrazyGames’ limits:

- Initial download ≤ 50 MB, and ≤ 20 MB to be eligible for the mobile homepage
- Total upload ≤ 250 MB
- ≤ 1500 files

Current production build (`npm run zip`, 15 Oct 2026): **7 files, 170,374 bytes (0.162 MB)** uncompressed. That is the whole initial download apart from the SDK script CrazyGames hosts. Fonts are self-hosted woff2 files inside the zip (no Google Fonts request). It is under both the 50 MB cap and the 20 MB mobile-homepage cap, and under the 1500-file cap. The SDK itself is not in the zip; `index.html` loads it from `https://sdk.crazygames.com/crazygames-sdk-v3.js`.

## What the game calls

The game never talks to `window.CrazyGames` directly. `src/platform/crazygames.ts` is the adapter; `src/platform/ads.ts` is the `AdService` the rest of the game uses. If the script fails to load, `init` throws, or `environment` is anything other than `local` or `crazygames`, every call is skipped and progress stays in `localStorage`.

| Moment | SDK call |
| --- | --- |
| After `SDK.init()`, before saves are read | `game.loadingStart()` |
| Menu is ready | `game.loadingStop()` |
| A run actually starts or resumes (revive included) | `game.gameplayStart()` |
| The run ends and a result or menu is showing | `game.gameplayStop()` |
| New endless record, or the last area of a city is cleared | `game.happytime()` |
| Retry / Next / Ride again, when this break is not already a revive offer | `ad.requestAd("midgame")` |
| Optional “▶ Revive” on the lose screen, once per run | `ad.requestAd("rewarded")` |
| Optional “▶ Double coins” on a win or an endless result | `ad.requestAd("rewarded")` |
| Stars, endless best, anonymous id, mute, avatar | `data.getItem` / `data.setItem` |

`gameplayStart` is the first time the player is actually riding, not on the menu. CrazyGames measures initial download up to that first event. The SDK refuses a second `gameplayStart`, `gameplayStop`, or `happytime` inside one second and prints a console error if you try. The adapter keeps the latest of those and sends it once the second has passed, so a crash-and-retry does not spam that error.

While an ad is requested, the UI is blocked (`One moment…`) and the result buttons are inert, so a key cannot start the next run under the ad. If neither callback arrives within two minutes, the request ends as `timeout` and the game continues. Audio mutes only in `adStarted`, and restores on `adFinished`, `adError`, or that timeout. `muteAudio` from `game.settings` (and `addSettingsChangeListener`) forces mute and wins over the in-game speaker button. Music and effects are generated in WebAudio (`src/platform/audio.ts`); every clip checks `canPlayAudio()`. The first tap or key resumes the audio context. `document.documentElement.dataset.audio` is `on` or `muted`.

Switching tabs or leaving the window pauses a live run behind a Resume overlay. That pause does not call `gameplayStop` or `gameplayStart`; CrazyGames already handles focus on its side.

Ads that error (`unfilled`, `adCooldown`, `adblock`, `adsDisabledBasicLaunch`, …) do not grant a reward and do not freeze the game. Rewarded buttons are hidden when an ad blocker is detected or after the SDK reports that ads are disabled, so a Basic Launch build has no dead “watch a video” button. A lose screen that offers revive does not also play a midgame ad. Watching double-coins suppresses the midgame on that same break, so two videos never play back to back.

Menu, Cities, and Areas never request an ad. The main Play button starts the current neighbourhood in one click. Opening another city is still there for anyone who wants it.

## Progress save (portal toggle)

In the submission flow, set progress save to **Yes, using the Data Module from the CrazyGames SDK**. If that toggle is off, the module throws `dataModuleDisabled` and the game keeps the local save instead — cloud sync will not work until the toggle is on.

The adapter copies any existing progress keys (`rd:stars`, `rd:best`, `rd:pid`, `rd:muted`, `rd:seenHow`, `rd:avatar`, `rd:wallet`) into the data module once, and does not overwrite keys the module already has. After that, reads and writes go to the data module only. Guest data stays in the SDK’s own storage and moves to the account when the player signs in; the game does nothing extra for that.

## Local testing

- `npm run dev`, then open `http://localhost:5173` or `http://127.0.0.1:5173`. The SDK treats those hosts as `local`: demo ad overlays, console logs for gameplay and happy time, and the data module backed by local storage. Add `?useLocalSdk=true` if you open the game from a LAN IP.
- `npm test` includes a mock SDK that checks init, loading, gameplay start/stop, happy time, mute during `adStarted`, rewarded-button hiding, and the save migration.
- After upload, use the portal’s QA / preview tool (`crazygames.com` preview). That is the real check; localhost only simulates it.

`?unlock` still opens every neighbourhood.

## Paste-ready listing

**Name:** Rider Dash

**Category:** Arcade (runner). Not a licensed title; all brands in the game are fictional.

**Description:**

Ride a delivery scooter through India’s cities. Switch lanes, jump potholes and speed breakers, grab parcels, and drop them in the green zones before you run out of hearts. Clear a neighbourhood to unlock the next one — Bengaluru through Ahmedabad — or ride Endless and chase a high score. Short runs, three hearts, stars for how many you have left.

**Controls:**

Swipe or tap the left or right side to change lanes. Swipe up to jump. On a keyboard: left and right arrows (or A and D) to steer, up arrow, W, or Space to jump. Collect up to 3 parcels and ride through a green DROP zone to deliver them. Coins add to your endless score. Lose all 3 hearts and the run ends. Revive is optional: watch a video or spend coins, once per run.

**Orientations:** landscape and portrait both play. Landscape is the comfortable desktop layout; the game is a centred column with a plain background on either side. No in-game fullscreen button (CrazyGames provides fullscreen).

## Cover images and video (you make these)

CrazyGames rejects the upload without them. Do not put borders, “Play now”, “New”, store logos, or copyrighted art on any of them. The title “Rider Dash” is the only text that should appear. Use the rider and scooter as the main figure.

| Asset | Size | Required |
| --- | --- | --- |
| Landscape cover | 1920×1080 (16:9) | Yes |
| Portrait cover | 800×1200 (2:3) | Yes |
| Square cover | 800×800 (1:1) | Yes |
| Landscape preview video | 1920×1080, 15–20 seconds, no audio, ≤ 50 MB | Yes |
| Portrait preview video | 720×1080 (1080p, 2:3), 15–20 seconds, no audio, ≤ 50 MB | Yes |

Video notes from their cover guide: no black bars, no logo sting, no mouse cursor, no fast-forward in the edit (they speed it up slightly), and the first frame should be the matching static cover so the hover preview doesn’t jump.

Suggested shot list for the video: the menu for a beat, a lane change, a jump over a pothole, a parcel pickup, a green drop, then the result screen with stars. Capture it from the production build, not the prototype HTML file.

## What Nayan has to do by hand

1. Create a CrazyGames developer account at [developer.crazygames.com](https://developer.crazygames.com/) and start a new HTML5 game submission.
2. Upload `rider-dash-crazygames.zip` (from `npm run zip` on a clean tree).
3. Set progress save to **Yes, using the Data Module from the CrazyGames SDK**.
4. Paste the description and controls above. Set orientations to landscape and portrait.
5. Export the three covers and two videos and upload them. The game has no art team assets for these; they are not in the repo.
6. Open the portal QA / preview tool and confirm: loading events, `gameplayStart` only once the scooter is moving, `gameplayStop` on the result screen, a demo or real midgame between runs, rewarded revive and double-coins, mute while the ad plays, and progress still there after a refresh (and after a guest login, once the toggle is on).
7. Submit. Basic Launch can go up with ads disabled; the game already continues when the SDK returns `adsDisabledBasicLaunch`. Full Launch is when they ask for the SDK integration this build already has.

No privacy-policy link is required for this build: nothing is sent to our own analytics. Events stay in the tab, and only in dev builds are they printed to the console. Do not add Google Analytics, pixels, or any other ad network.

## Checks already handled in the build

- Relative asset paths, iframe-sized layout (including the sizes they list: 907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450, 1080×607), touch and keyboard, `user-select: none`, safe-area padding on the HUD and menus.
- No external links, no cross-promo, no in-game fullscreen button, no banner ads.
- English only. PEGI-12 tone: a scooter, traffic, and a cow. No account login of our own.
- Chrome, Firefox, and Safari share one code path (pointer events, canvas 2D, no engine-specific audio). Safari on this machine was not available to launch; the build does not use APIs those browsers disagree on.

## In-game purchases (coin packs)

CrazyGames supports in-game purchases through Xsolla, but only by invitation, and only for signed-in players. The game already routes purchases through `PaymentService` (`src/platform/payments.ts`); off CrazyGames and until the invite, it uses `noPayments()` and the store shows "Soon". To go live:

1. Ask CrazyGames for in-game purchases. They set up the Xsolla token method and give you an Xsolla project ID.
2. In Xsolla Publisher Account, create the four coin packs from `src/data/shop.json` → `coinPacks` as virtual items.
3. Add a `PaymentService` adapter: get a token with `SDK.user.getXsollaUserToken()`, create the order through Xsolla's Shop Builder API, open Pay Station, then grant coins only after the order is confirmed through Xsolla Inventory or an `order_paid` webhook. Call `SDK.analytics.trackOrder("xsolla", order)` on success.
4. Hide the store for guests and inside the CrazyGames mobile app (Google Play / Apple builds must not show external payments).
5. Test with sandbox orders from the Developer Portal preview, then turn sandbox off before submitting.
