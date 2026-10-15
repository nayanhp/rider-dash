// Layered rider from the design avatar kit. Jacket, helmet and skin are group
// fills; the scooter and delivery box stay put. Rasterise when the look changes,
// never per frame. The front pose is the picker preview only.
import backSvg from '../sprites/avatars/rider-back.svg?raw';
import leftSvg from '../sprites/avatars/rider-lean-left.svg?raw';
import rightSvg from '../sprites/avatars/rider-lean-right.svg?raw';
import frontSvg from '../sprites/avatars/rider-front.svg?raw';
import type { AvatarColors } from '../avatar';

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

/** Recolour the jacket, skin and helmet groups. Other paints stay as drawn. */
export function tintRiderSvg(svg: string, colors: AvatarColors): string {
  return svg
    .replace(
      /(id="jacket"[^>]*?)fill="#[0-9A-Fa-f]{6}" stroke="#[0-9A-Fa-f]{6}"/,
      `$1fill="${colors.jacket}" stroke="${colors.jacket}"`,
    )
    .replace(/(id="skin"[^>]*?)fill="#[0-9A-Fa-f]{6}"/, `$1fill="${colors.skin}"`)
    .replace(/(id="helmet"[^>]*?)fill="#[0-9A-Fa-f]{6}"/, `$1fill="${colors.helmet}"`);
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
  return `${colors.jacket}|${colors.helmet}|${colors.skin}`;
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
