// Single gate for game audio. There is no soundtrack yet; every future clip must
// check canPlayAudio() first. CrazyGames muteAudio wins over any in-game toggle.
// An ad mutes only while it is actually playing (adStarted), not while it is requested.
let sdkMuted = false;
let adMuted = false;

function publish() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.audio = canPlayAudio() ? 'on' : 'muted';
}

export function setSdkMuted(muted: boolean) {
  sdkMuted = muted;
  publish();
}

export function setAdMuted(muted: boolean) {
  adMuted = muted;
  publish();
}

/** True when a sound effect is allowed to play. */
export function canPlayAudio(): boolean {
  return !sdkMuted && !adMuted;
}
