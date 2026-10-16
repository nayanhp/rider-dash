import { beforeEach, describe, expect, it } from 'vitest';
import {
  AVATAR_OPTIONS,
  DEFAULT_CHOICE,
  avatarChoice,
  colorsFor,
  normalizeChoice,
  reloadAvatar,
  setAvatarPart,
} from './avatar';
import { useStore } from './platform/storage';
import roles from './sprites/avatars/avatar-roles.json';
import { PICKER_DRAW_PX, RIDER_ANCHOR, RIDER_RASTER, RIDER_SOURCES, svgImageUrl, tintRiderSvg } from './render/riderArt';

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
    expect(DEFAULT_CHOICE).toEqual({ jacket: 'red', helmet: 'yellow', box: 'yellow', skin: 'medium' });
    expect(colorsFor(DEFAULT_CHOICE)).toEqual({
      jacket: '#FF5A4E',
      helmet: '#FFCC2E',
      box: '#FFCC2E',
      skin: '#D4A574',
    });
    expect(avatarChoice()).toEqual(DEFAULT_CHOICE);
  });

  it('drops unknown ids and keeps the rest', () => {
    expect(normalizeChoice(null)).toEqual(DEFAULT_CHOICE);
    expect(normalizeChoice({ jacket: 'nope', helmet: 'white', skin: 'deep' })).toEqual({
      jacket: 'red',
      helmet: 'white',
      box: 'yellow',
      skin: 'deep',
    });
    expect(normalizeChoice('red')).toEqual(DEFAULT_CHOICE);
  });

  it('saves ids, and a later read survives a storage swap', () => {
    setAvatarPart('jacket', 'teal');
    setAvatarPart('helmet', 'magenta');
    expect(avatarChoice()).toEqual({ jacket: 'teal', helmet: 'magenta', box: 'yellow', skin: 'medium' });
    reloadAvatar();
    expect(avatarChoice()).toEqual({ jacket: 'teal', helmet: 'magenta', box: 'yellow', skin: 'medium' });
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
    const next = { jacket: '#2BB8A8', helmet: '#E85A9B', skin: '#A66B3D', box: '#FFCC2E' };
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

  it('reserves the front pose for the picker', () => {
    expect(roles.files.front).toBe('rider-front.svg');
    expect(roles.front.viewBox).toBe('0 0 128 160');
    expect(roles.front.usage).toContain('picker preview only');
    expect(RIDER_SOURCES.front).toContain('viewBox="0 0 128 160"');
    expect(RIDER_SOURCES.back).toContain('viewBox="-16 -30 128 160"');
    expect(RIDER_SOURCES.front).not.toBe(RIDER_SOURCES.back);
    expect(PICKER_DRAW_PX).toBeGreaterThanOrEqual(96);
    expect(PICKER_DRAW_PX).toBeLessThanOrEqual(128);
  });
});

describe('premium finishes', () => {
  it('fills styled parts from SVG defs and recolours the box from every angle', () => {
    const colors = colorsFor({ jacket: 'gold', helmet: 'checker', box: 'galaxy', skin: 'medium' });
    for (const svg of Object.values(RIDER_SOURCES)) {
      const tinted = tintRiderSvg(svg, colors);
      expect(tinted).toContain('<defs>');
      expect(tinted).toContain('fill="url(#rd-jacket)" stroke="url(#rd-jacket)"');
      expect(tinted).toContain('id="helmet" data-role="helmet" fill="url(#rd-helmet)"');
      expect(tinted).toMatch(/id="box"><rect[^>]*fill="url\(#rd-box\)"/);
      expect(tinted).toContain('<pattern id="rd-helmet"');
      expect(tinted).toContain('<linearGradient id="rd-jacket"');
      const url = svgImageUrl(tinted);
      expect(url.startsWith('blob:') || url.startsWith('data:image/svg+xml')).toBe(true);
      expect(svgImageUrl(tinted)).toBe(url);
    }
  });

  it('marks every premium option with a style and a price', () => {
    for (const part of ['jacket', 'helmet', 'box', 'skin'] as const) {
      for (const o of AVATAR_OPTIONS[part]) {
        if (o.premium) {
          expect(o.style).toBeDefined();
          expect(o.price).toBeGreaterThanOrEqual(600);
        }
      }
    }
  });
});
