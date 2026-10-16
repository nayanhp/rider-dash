// Gameplay sprites, rasterised once. Draw sizes are fractions of the lane width
// at the object's depth (geo().LW * p.s), except the skyline, which tiles by height.
import parcelUrl from '../sprites/parcel.svg';
import coinUrl from '../sprites/coin.svg';
import autoUrl from '../sprites/auto-rickshaw.svg';
import carUrl from '../sprites/car.svg';
import cowUrl from '../sprites/cow.svg';
import holeUrl from '../sprites/pothole.svg';
import bumpUrl from '../sprites/speed-breaker.svg';
import dropUrl from '../sprites/drop-pad.svg';
import treeUrl from '../sprites/tree.svg';
import houseUrl from '../sprites/house.svg';
import skylineUrl from '../sprites/skyline-strip.svg';
import walkerUrl from '../sprites/walker.svg';
import dogUrl from '../sprites/dog.svg';
import scooterUrl from '../sprites/avatars/rider-front.svg';

export interface SpriteSpec {
  id: string;
  url: string;
  /** viewBox min-x, min-y, width, height. */
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
  /** Anchor in viewBox units. */
  ax: number;
  ay: number;
  /** Draw width as a multiple of lane width. 0 when the sprite is not sized that way. */
  draw: number;
  /** Raster width in pixels. About 2× the largest on-screen size. */
  raster: number;
}

export const SPRITES = {
  parcel: spec('parcel', parcelUrl, 0, 0, 64, 64, 32, 58, 0.55, 256),
  coin: spec('coin', coinUrl, 0, 0, 48, 48, 24, 24, 0.32, 256),
  auto: spec('auto', autoUrl, 0, 0, 120, 110, 60, 104, 0.95, 512),
  car: spec('car', carUrl, 0, 0, 120, 90, 60, 84, 1, 512),
  cow: spec('cow', cowUrl, 0, 0, 120, 100, 60, 94, 1, 512),
  hole: spec('hole', holeUrl, 0, 0, 160, 48, 80, 24, 1.4, 512),
  bump: spec('bump', bumpUrl, 0, 0, 180, 30, 90, 28, 1.6, 512),
  drop: spec('drop', dropUrl, 0, 0, 200, 120, 100, 60, 0.9, 512),
  tree: spec('tree', treeUrl, 0, 0, 80, 110, 40, 106, 0.9, 512),
  house: spec('house', houseUrl, 0, 0, 80, 80, 40, 76, 0.7, 512),
  skyline: spec('skyline', skylineUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  walker: spec('walker', walkerUrl, 0, 0, 64, 128, 32, 123, 0.42, 256),
  dog: spec('dog', dogUrl, 0, 0, 110, 72, 55, 67, 0.62, 384),
  /** Wrong-way scooter: the rider art seen from the front. */
  scooter: spec('scooter', scooterUrl, 0, 0, 128, 160, 64, 153, 0.62, 384),
} as const satisfies Record<string, SpriteSpec>;

export type SpriteId = keyof typeof SPRITES;

/** Anchor measured from the viewBox origin, which is where the raster's top-left sits. */
export function anchorOffset(s: Pick<SpriteSpec, 'vbX' | 'vbY' | 'ax' | 'ay'>): { x: number; y: number } {
  return { x: s.ax - s.vbX, y: s.ay - s.vbY };
}

interface Raster {
  canvas: HTMLCanvasElement;
  vbW: number;
  vbH: number;
  ox: number;
  oy: number;
}

const cache = new Map<string, Raster>();

function spec(
  id: string,
  url: string,
  vbX: number,
  vbY: number,
  vbW: number,
  vbH: number,
  ax: number,
  ay: number,
  draw: number,
  raster: number,
): SpriteSpec {
  return { id, url, vbX, vbY, vbW, vbH, ax, ay, draw, raster };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load sprite ${url}`));
    img.src = url;
  });
}

/** Decode every gameplay sprite into a canvas. Call once before the first frame. */
export async function loadSprites(): Promise<void> {
  await Promise.all(
    Object.values(SPRITES).map(async (s) => {
      const img = await loadImage(s.url);
      const canvas = document.createElement('canvas');
      canvas.width = s.raster;
      canvas.height = Math.max(1, Math.round((s.raster * s.vbH) / s.vbW));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not supported');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const o = anchorOffset(s);
      cache.set(s.id, { canvas, vbW: s.vbW, vbH: s.vbH, ox: o.x, oy: o.y });
    }),
  );
}

/** Place the sprite's anchor at (x, y). drawW is the on-screen width of the viewBox. */
export function drawSprite(ctx: CanvasRenderingContext2D, id: SpriteId, x: number, y: number, drawW: number) {
  const s = cache.get(id);
  if (!s || drawW < 1) return;
  const sc = drawW / s.vbW;
  ctx.drawImage(s.canvas, x - s.ox * sc, y - s.oy * sc, s.vbW * sc, s.vbH * sc);
}
