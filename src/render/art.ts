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
import skyBengaluruUrl from '../sprites/skyline-bengaluru.svg';
import skyMumbaiUrl from '../sprites/skyline-mumbai.svg';
import skyDelhiUrl from '../sprites/skyline-delhi.svg';
import skyHyderabadUrl from '../sprites/skyline-hyderabad.svg';
import skyChennaiUrl from '../sprites/skyline-chennai.svg';
import skyPuneUrl from '../sprites/skyline-pune.svg';
import skyKolkataUrl from '../sprites/skyline-kolkata.svg';
import skyAhmedabadUrl from '../sprites/skyline-ahmedabad.svg';
import walkerUrl from '../sprites/walker.svg';
import copUrl from '../sprites/cop.svg';
import puddleUrl from '../sprites/puddle.svg';
import barrierUrl from '../sprites/barrier.svg';
import monkeyUrl from '../sprites/monkey.svg';
import tramUrl from '../sprites/tram.svg';
import dogUrl from '../sprites/dog.svg';
import scooterUrl from '../sprites/avatars/rider-front.svg';
import magnetUrl from '../sprites/power-magnet.svg';
import netUrl from '../sprites/power-net.svg';
import helmetUrl from '../sprites/power-helmet.svg';
import nitroUrl from '../sprites/power-nitro.svg';
import doubleUrl from '../sprites/power-double.svg';
import heartUrl from '../sprites/hud-heart-full.svg';

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
  // City landmark skylines, keyed by city id. The landmark sits in the middle of the strip.
  'skyline-bengaluru': spec('skyline-bengaluru', skyBengaluruUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-mumbai': spec('skyline-mumbai', skyMumbaiUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-delhi': spec('skyline-delhi', skyDelhiUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-hyderabad': spec('skyline-hyderabad', skyHyderabadUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-chennai': spec('skyline-chennai', skyChennaiUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-pune': spec('skyline-pune', skyPuneUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-kolkata': spec('skyline-kolkata', skyKolkataUrl, 0, 0, 400, 80, 0, 80, 0, 1200),
  'skyline-ahmedabad': spec('skyline-ahmedabad', skyAhmedabadUrl, 0, 0, 400, 80, 0, 80, 0, 1200),

  walker: spec('walker', walkerUrl, 0, 0, 64, 128, 32, 123, 0.42, 256),
  cop: spec('cop', copUrl, 0, 0, 80, 140, 40, 134, 0.52, 384),
  puddle: spec('puddle', puddleUrl, 0, 0, 160, 48, 80, 26, 1.3, 512),
  barrier: spec('barrier', barrierUrl, 0, 0, 140, 90, 70, 86, 1.05, 512),
  monkey: spec('monkey', monkeyUrl, 0, 0, 80, 80, 40, 76, 0.5, 256),
  tram: spec('tram', tramUrl, 0, 0, 120, 150, 60, 145, 1.05, 512),
  dog: spec('dog', dogUrl, 0, 0, 110, 72, 55, 67, 0.62, 384),
  /** Wrong-way scooter: the rider art seen from the front. */
  scooter: spec('scooter', scooterUrl, 0, 0, 128, 160, 64, 153, 0.62, 384),
  // Power-up icons, drawn inside a bubble on the road. Anchor is the centre.
  magnet: spec('magnet', magnetUrl, 0, 0, 64, 64, 32, 32, 0.46, 192),
  net: spec('net', netUrl, 0, 0, 64, 64, 32, 32, 0.46, 192),
  helmet: spec('helmet', helmetUrl, 0, 0, 64, 64, 32, 32, 0.46, 192),
  nitro: spec('nitro', nitroUrl, 0, 0, 64, 64, 32, 32, 0.46, 192),
  double: spec('double', doubleUrl, 0, 0, 64, 64, 32, 32, 0.46, 192),
  heart: spec('heart', heartUrl, 0, 0, 32, 32, 16, 16, 0.46, 192),
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

/** Icon URLs for the HUD's power-up chips. */
export const POWER_ICONS = { magnet: magnetUrl, net: netUrl, helmet: helmetUrl, nitro: nitroUrl, double: doubleUrl, heart: heartUrl } as const;
