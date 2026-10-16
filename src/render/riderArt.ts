// Layered rider from the design avatar kit. Jacket, helmet and skin are group
// fills; the scooter and delivery box stay put. Rasterise when the look changes,
// never per frame. The front pose is the picker preview only.
import backSvg from '../sprites/avatars/rider-back.svg?raw';
import leftSvg from '../sprites/avatars/rider-lean-left.svg?raw';
import rightSvg from '../sprites/avatars/rider-lean-right.svg?raw';
import frontSvg from '../sprites/avatars/rider-front.svg?raw';
import type { AvatarColors, Paint, PaintStyle } from '../avatar';

export const RIDER_DRAW = 0.95;
/** Picker only. Design range is 96–128px; the front viewBox is 128 wide. */
export const PICKER_DRAW_PX = 128;
/** Anchor from the viewBox origin: (48,124) inside viewBox -16 -30. */
export const RIDER_ANCHOR = { x: 64, y: 154 };
const VB_W = 128;
const VB_H = 160;
/** One canvas per pose, rebuilt only when the avatar changes. */
export const RIDER_RASTER = { w: 256, h: 320 };

export const RIDER_SOURCES = {
  back: backSvg,
  left: leftSvg,
  right: rightSvg,
  front: frontSvg,
} as const;

export type RiderPose = 'back' | 'left' | 'right';

const POSE_SVG: Record<RiderPose, string> = {
  back: backSvg,
  left: leftSvg,
  right: rightSvg,
};

const DEFAULT_BOX = '#FFCC2E';

/** SVG defs for a premium finish, filled under the id `rd-<part>`. */
function paintDefs(id: string, p: PaintStyle): string {
  const [a, b = a, c = a] = p.colors;
  switch (p.kind) {
    case 'gradient':
      return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    case 'metal':
      return `<linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.32" stop-color="${b}"/><stop offset="0.5" stop-color="${a}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
    case 'stripes':
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="14" height="14"><rect width="14" height="14" fill="${a}"/><rect x="5" width="4" height="14" fill="${b}"/></pattern>`;
    case 'checker':
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10"><rect width="10" height="10" fill="${a}"/><rect width="5" height="5" fill="${b}"/><rect x="5" y="5" width="5" height="5" fill="${b}"/></pattern>`;
    case 'galaxy':
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="24" height="24"><rect width="24" height="24" fill="${a}"/><circle cx="4" cy="5" r="1.2" fill="${b}"/><circle cx="17" cy="9" r="0.9" fill="${b}"/><circle cx="10" cy="18" r="1.4" fill="${c}"/><circle cx="21" cy="21" r="0.8" fill="${b}"/><circle cx="12" cy="3" r="0.7" fill="${c}"/></pattern>`;
  }
}

/** Recolour the jacket, helmet, skin and delivery box. A flat default leaves the SVG byte-for-byte. */
export function tintRiderSvg(svg: string, colors: AvatarColors): string {
  const defs: string[] = [];
  const fill = (part: string, p: Paint) => {
    if (typeof p === 'string') return p;
    defs.push(paintDefs(`rd-${part}`, p));
    return `url(#rd-${part})`;
  };
  const jacket = fill('jacket', colors.jacket);
  const helmet = fill('helmet', colors.helmet);
  const skin = fill('skin', colors.skin);
  const box = fill('box', colors.box);
  let out = svg
    .replace(/(id="jacket"[^>]*?)fill="#[0-9A-Fa-f]{6}" stroke="#[0-9A-Fa-f]{6}"/, `$1fill="${jacket}" stroke="${jacket}"`)
    .replace(/(id="skin"[^>]*?)fill="#[0-9A-Fa-f]{6}"/, `$1fill="${skin}"`)
    .replace(/(id="helmet"[^>]*?)fill="#[0-9A-Fa-f]{6}"/, `$1fill="${helmet}"`);
  if (box !== DEFAULT_BOX) {
    // The box body is the first rect in the box group; its band goes a darker shade of whatever it is.
    out = out.replace(/(id="box"><rect[^>]*?)fill="#FFCC2E"/, `$1fill="${box}"`)
      .replace(/(id="box"><rect[^>]*?\/><rect[^>]*?)fill="#D99A00"/, '$1fill="#2A2F5A" opacity=".22"');
  }
  if (defs.length) out = out.replace(/(<svg[^>]*>)/, `$1<defs>${defs.join('')}</defs>`);
  return out;
}

/** Any pose as an image URL, for previews. */
export function poseUrl(pose: RiderPose | 'front', colors: AvatarColors): string {
  return svgUrl(tintRiderSvg(RIDER_SOURCES[pose], colors));
}

export function frontPreviewUrl(colors: AvatarColors): string {
  return svgUrl(tintRiderSvg(frontSvg, colors));
}

interface Cache {
  key: string;
  back: HTMLCanvasElement;
  left: HTMLCanvasElement;
  right: HTMLCanvasElement;
}

let shown: Cache | null = null;
let job = 0;

function keyOf(colors: AvatarColors): string {
  return JSON.stringify(colors);
}

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not rasterise the rider'));
    img.src = url;
  });
}

async function raster(svg: string): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = RIDER_RASTER.w;
    canvas.height = RIDER_RASTER.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    ctx.drawImage(img, 0, 0, RIDER_RASTER.w, RIDER_RASTER.h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Build the three in-run poses. The previous look stays on screen until this resolves. */
export async function prepareAvatar(colors: AvatarColors): Promise<void> {
  const key = keyOf(colors);
  if (shown?.key === key) return;
  const ticket = ++job;
  const [back, left, right] = await Promise.all(
    (['back', 'left', 'right'] as const).map((pose) => raster(tintRiderSvg(POSE_SVG[pose], colors))),
  );
  if (ticket !== job) return;
  shown = { key, back, left, right };
}

export function drawAvatarPose(
  ctx: CanvasRenderingContext2D,
  pose: RiderPose,
  x: number,
  y: number,
  drawW: number,
) {
  const canvas = shown?.[pose];
  if (!canvas || drawW < 1) return;
  const sc = drawW / VB_W;
  ctx.drawImage(canvas, x - RIDER_ANCHOR.x * sc, y - RIDER_ANCHOR.y * sc, VB_W * sc, VB_H * sc);
}

/** The parcel thief: the same rider art in dark colours on a grey scooter. */
const RIVAL_COLORS: AvatarColors = { jacket: '#3B3F4F', helmet: '#1E1E26', skin: '#C68642', box: '#5B6075' };
let rival: HTMLCanvasElement | null = null;

export async function prepareRival(): Promise<void> {
  if (rival) return;
  rival = await raster(tintRiderSvg(backSvg, RIVAL_COLORS).replace(/#E04A3F/gi, '#5B6075'));
}

export function drawRival(ctx: CanvasRenderingContext2D, x: number, y: number, drawW: number) {
  if (!rival || drawW < 1) return;
  const sc = drawW / VB_W;
  ctx.drawImage(rival, x - RIDER_ANCHOR.x * sc, y - RIDER_ANCHOR.y * sc, VB_W * sc, VB_H * sc);
}
