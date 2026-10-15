import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CHOICE,
  avatarChoice,
  colorsFor,
  normalizeChoice,
  reloadAvatar,
  setAvatarPart,
} from './avatar';
import { useStore } from './platform/storage';
import { RIDER_ANCHOR, RIDER_RASTER, RIDER_SOURCES, tintRiderSvg } from './render/riderArt';

beforeEach(() => {
  const mem = new Map<string, string>();
  useStore({
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
  });
  reloadAvatar();
});

describe('avatar choice', () => {
  it('defaults to the red jacket, yellow helmet and medium skin baked into the kit', () => {
    expect(DEFAULT_CHOICE).toEqual({ jacket: 'red', helmet: 'yellow', skin: 'medium' });
    expect(colorsFor(DEFAULT_CHOICE)).toEqual({
      jacket: '#FF5A4E',
      helmet: '#FFCC2E',
      skin: '#D4A574',
    });
    expect(avatarChoice()).toEqual(DEFAULT_CHOICE);
  });

  it('drops unknown ids and keeps the rest', () => {
    expect(normalizeChoice(null)).toEqual(DEFAULT_CHOICE);
    expect(normalizeChoice({ jacket: 'nope', helmet: 'white', skin: 'deep' })).toEqual({
      jacket: 'red',
      helmet: 'white',
      skin: 'deep',
    });
    expect(normalizeChoice('red')).toEqual(DEFAULT_CHOICE);
  });

  it('saves ids, and a later read survives a storage swap', () => {
    setAvatarPart('jacket', 'teal');
    setAvatarPart('helmet', 'magenta');
    expect(avatarChoice()).toEqual({ jacket: 'teal', helmet: 'magenta', skin: 'medium' });
    reloadAvatar();
    expect(avatarChoice()).toEqual({ jacket: 'teal', helmet: 'magenta', skin: 'medium' });
    expect(colorsFor(avatarChoice()).jacket).toBe('#2BB8A8');
  });
});

describe('rider tint', () => {
  const colors = colorsFor(DEFAULT_CHOICE);

  it('leaves the default pose byte-for-byte, including the scooter and the box', () => {
    for (const svg of Object.values(RIDER_SOURCES)) {
      expect(tintRiderSvg(svg, colors)).toBe(svg);
    }
    expect(RIDER_ANCHOR).toEqual({ x: 64, y: 154 });
    expect(RIDER_RASTER).toEqual({ w: 256, h: 320 });
  });

  it('recolours only the jacket, helmet and skin groups', () => {
    const next = { jacket: '#2BB8A8', helmet: '#E85A9B', skin: '#A66B3D' };
    for (const svg of [RIDER_SOURCES.back, RIDER_SOURCES.left, RIDER_SOURCES.right, RIDER_SOURCES.front]) {
      const tinted = tintRiderSvg(svg, next);
      expect(tinted).toContain('id="jacket" data-role="jacket" fill="#2BB8A8" stroke="#2BB8A8"');
      expect(tinted).toContain('id="skin" data-role="skin" fill="#A66B3D"');
      expect(tinted).toContain('id="helmet" data-role="helmet" fill="#E85A9B"');
      expect(tinted).toContain('fill="#E04A3F"');
      expect(tinted).toContain('fill="#FFCC2E"');
      expect(tinted).toContain('fill="#D99A00"');
      expect(tinted).not.toContain('fill="#FF5A4E" stroke="#FF5A4E"');
    }
  });

  it('keeps the front-pose eyes and the helmet visor ink', () => {
    const tinted = tintRiderSvg(RIDER_SOURCES.front, { ...colors, skin: '#F0C8A0', helmet: '#F5F5F5' });
    expect(tinted).toContain('fill="#2A2F5A"');
    expect(tinted).toContain('opacity=".22"');
  });
});
