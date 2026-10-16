// Procedural WebAudio. No audio files. CrazyGames muteAudio wins over the in-game
// toggle, and an ad mutes only while it is actually playing (adStarted). The context
// is created on the first gesture so iOS will start it.
import { load, save } from './storage';

export type Sfx = 'jump' | 'coin' | 'parcel' | 'drop' | 'hit' | 'clear';

let sdkMuted = false;
let adMuted = false;
let userMuted = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicTimer = 0;
let nextNoteAt = 0;
let stepIndex = 0;

const MELODY = [72, 76, 79, 76, 74, 79, 76, 72, 67, 72, 76, 74, 72, 67, 64, 67];
const BASS = [48, 55, 53, 48];

function publish() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.audio = canPlayAudio() ? 'on' : 'muted';
}

function syncGain() {
  if (!master || !ctx) return;
  const level = canPlayAudio() ? 1 : 0;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(level, ctx.currentTime, 0.02);
  if (level === 0) stopMusic();
  else startMusic();
}

export function setSdkMuted(muted: boolean) {
  sdkMuted = muted;
  publish();
  syncGain();
}

export function setAdMuted(muted: boolean) {
  adMuted = muted;
  publish();
  syncGain();
}

export function loadUserMute() {
  userMuted = load<boolean>('muted', false);
  publish();
  syncGain();
}

export function setUserMuted(muted: boolean) {
  userMuted = muted;
  save('muted', userMuted);
  publish();
  syncGain();
}

export function toggleUserMute() {
  setUserMuted(!userMuted);
}

/** Site mute locks the control. Ad mute is temporary and does not flip the button. */
export function muteControl(): { muted: boolean; locked: boolean } {
  return { muted: userMuted || sdkMuted, locked: sdkMuted };
}

/** True when a sound effect is allowed to play. */
export function canPlayAudio(): boolean {
  return !sdkMuted && !adMuted && !userMuted;
}

function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

type Tone = 'sine' | 'square' | 'triangle' | 'sawtooth';

function tone(freq: number, when: number, dur: number, type: Tone, peak: number, slide = 0) {
  if (!ctx || !sfxGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), when + dur);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function playAt(name: Sfx, when: number) {
  if (name === 'jump') tone(420, when, 0.09, 'square', 0.18, 280);
  else if (name === 'coin') {
    tone(880, when, 0.06, 'square', 0.12);
    tone(1320, when + 0.05, 0.08, 'square', 0.1);
  } else if (name === 'parcel') tone(392, when, 0.11, 'triangle', 0.2);
  else if (name === 'drop') {
    tone(523, when, 0.18, 'triangle', 0.14);
    tone(659, when, 0.18, 'triangle', 0.12);
    tone(784, when + 0.04, 0.2, 'triangle', 0.12);
  } else if (name === 'hit') tone(196, when, 0.14, 'sawtooth', 0.16, -120);
  else if (name === 'clear') {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, when + i * 0.09, 0.16, 'triangle', 0.14));
  }
}

export function play(name: Sfx) {
  if (!ctx || !canPlayAudio()) return;
  playAt(name, ctx.currentTime);
}

function scheduleMusic() {
  if (!ctx || !musicGain || !canPlayAudio()) return;
  const beat = 60 / 128 / 2;
  if (nextNoteAt < ctx.currentTime) nextNoteAt = ctx.currentTime + 0.05;
  while (nextNoteAt < ctx.currentTime + 0.25) {
    const note = MELODY[stepIndex % MELODY.length];
    toneInto(musicGain, midi(note), nextNoteAt, beat * 0.9, 'triangle', 0.35);
    if (stepIndex % 4 === 0) {
      toneInto(musicGain, midi(BASS[(stepIndex / 4) % BASS.length]), nextNoteAt, beat * 3.2, 'sine', 0.5);
    }
    nextNoteAt += beat;
    stepIndex++;
  }
}

function toneInto(dest: GainNode, freq: number, when: number, dur: number, type: Tone, peak: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function startMusic() {
  if (!ctx || musicTimer || !canPlayAudio()) return;
  nextNoteAt = ctx.currentTime + 0.05;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 100);
}

function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = 0;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    ctx = new Ctx();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = canPlayAudio() ? 1 : 0;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.08;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.8;
  sfxGain.connect(master);
  return ctx;
}

/**
 * Call from a click, tap, or key. Browsers ignore audio started any other way.
 * iOS Safari only resumes a context inside the gesture, so this stays synchronous.
 * resume() rejects when the device has no audio output; that must not become an
 * unhandled rejection. The next gesture tries again.
 */
export function unlock() {
  const audio = ensure();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
  if (canPlayAudio()) startMusic();
}
