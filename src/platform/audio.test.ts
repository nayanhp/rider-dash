import { afterEach, describe, expect, it } from 'vitest';
import { canPlayAudio, loadUserMute, muteControl, setAdMuted, setSdkMuted, setUserMuted } from './audio';
import { useStore } from './storage';

function memory() {
  const mem = new Map<string, string>();
  useStore({
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
  });
  return mem;
}

afterEach(() => {
  setSdkMuted(false);
  setAdMuted(false);
  setUserMuted(false);
});

describe('audio mute', () => {
  it('lets the site mute win over the player toggle', () => {
    setUserMuted(false);
    setSdkMuted(true);
    expect(canPlayAudio()).toBe(false);
    expect(muteControl()).toEqual({ muted: true, locked: true });
    setUserMuted(false);
    expect(canPlayAudio()).toBe(false);
  });

  it('mutes for an ad without changing the saved toggle', () => {
    setUserMuted(false);
    setAdMuted(true);
    expect(canPlayAudio()).toBe(false);
    expect(muteControl().muted).toBe(false);
    setAdMuted(false);
    expect(canPlayAudio()).toBe(true);
  });

  it('remembers the player mute', () => {
    const mem = memory();
    setUserMuted(true);
    expect(mem.get('rd:muted')).toBe('true');
    setUserMuted(false);
    loadUserMute();
    expect(canPlayAudio()).toBe(true);
    mem.set('rd:muted', 'true');
    loadUserMute();
    expect(canPlayAudio()).toBe(false);
    expect(muteControl()).toEqual({ muted: true, locked: false });
  });
});
