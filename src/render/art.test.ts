import { describe, expect, it } from 'vitest';
import { SPRITES, anchorOffset } from './art';

describe('sprite layout', () => {
  it('sizes road objects from the lane width', () => {
    expect(SPRITES.parcel.draw).toBe(0.55);
    expect(SPRITES.coin.draw).toBe(0.32);
    expect(SPRITES.auto.draw).toBe(0.95);
    expect(SPRITES.car.draw).toBe(1);
    expect(SPRITES.cow.draw).toBe(1);
    expect(SPRITES.hole.draw).toBe(1.4);
    expect(SPRITES.bump.draw).toBe(1.6);
    expect(SPRITES.drop.draw).toBe(0.9);
    expect(SPRITES.tree.draw).toBe(0.9);
    expect(SPRITES.house.draw).toBe(0.7);
  });

  it('anchors the skyline on its bottom-left so a horizontal tile meets the horizon', () => {
    expect(anchorOffset(SPRITES.skyline)).toEqual({ x: 0, y: 80 });
    expect(SPRITES.skyline.vbW / SPRITES.skyline.vbH).toBe(5);
  });
});
