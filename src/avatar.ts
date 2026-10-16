// Cosmetic rider look. Ids are saved; paints come from data/avatars.json.
// Nothing here is read by the simulation.
import catalog from './data/avatars.json';
import { load, save } from './platform/storage';

export type AvatarPart = 'jacket' | 'helmet' | 'box' | 'skin';
export const PARTS: AvatarPart[] = ['jacket', 'helmet', 'box', 'skin'];

/** A premium finish. Flat options are just a colour. */
export interface PaintStyle {
  kind: 'gradient' | 'metal' | 'stripes' | 'checker' | 'galaxy';
  colors: string[];
}
export type Paint = string | PaintStyle;

export interface AvatarOption {
  id: string;
  name: string;
  /** Flat colour, and the swatch fallback for a styled option. */
  color: string;
  style?: PaintStyle;
  premium?: boolean;
  /** Coins to buy it. Absent with no reward means free. */
  price?: number;
  /** City id whose last area unlocks it for free. */
  reward?: string;
}

export type AvatarChoice = Record<AvatarPart, string>;
export type AvatarColors = Record<AvatarPart, Paint>;

export const AVATAR_OPTIONS: Record<AvatarPart, readonly AvatarOption[]> = {
  jacket: catalog.jacket as AvatarOption[],
  helmet: catalog.helmet as AvatarOption[],
  box: catalog.box as AvatarOption[],
  skin: catalog.skin as AvatarOption[],
};

export const DEFAULT_CHOICE: AvatarChoice = {
  jacket: catalog.default.jacket,
  helmet: catalog.default.helmet,
  box: catalog.default.box,
  skin: catalog.default.skin,
};

export function optionFor(part: AvatarPart, id: unknown): AvatarOption {
  const list = AVATAR_OPTIONS[part];
  const found = list.find((o) => o.id === id);
  return found ?? list.find((o) => o.id === DEFAULT_CHOICE[part]) ?? list[0];
}

export function normalizeChoice(raw: unknown): AvatarChoice {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    jacket: optionFor('jacket', obj.jacket).id,
    helmet: optionFor('helmet', obj.helmet).id,
    box: optionFor('box', obj.box).id,
    skin: optionFor('skin', obj.skin).id,
  };
}

export const paintOf = (o: AvatarOption): Paint => o.style ?? o.color;

export function colorsFor(choice: AvatarChoice): AvatarColors {
  return {
    jacket: paintOf(optionFor('jacket', choice.jacket)),
    helmet: paintOf(optionFor('helmet', choice.helmet)),
    box: paintOf(optionFor('box', choice.box)),
    skin: paintOf(optionFor('skin', choice.skin)),
  };
}

let choice = normalizeChoice(DEFAULT_CHOICE);

export function avatarChoice(): AvatarChoice {
  return choice;
}

/** Read the saved look again. Call after the storage backend changes. */
export function reloadAvatar(): AvatarChoice {
  choice = normalizeChoice(load('avatar', DEFAULT_CHOICE));
  return choice;
}

/** Free options are always owned; priced and reward options need a purchase or a city clear. */
export const isFree = (o: AvatarOption) => o.price === undefined && o.reward === undefined;

/** Wear a part. Callers check ownership first (see shop.ts); unknown ids fall back to the default. */
export function setAvatarPart(part: AvatarPart, id: string): AvatarChoice {
  if (!PARTS.includes(part)) return choice;
  choice = normalizeChoice({ ...choice, [part]: id });
  save('avatar', choice);
  return choice;
}
