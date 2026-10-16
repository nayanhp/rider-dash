// Cosmetic rider look. Ids are saved; colours come from data/avatars.json.
// Nothing here is read by the simulation.
import catalog from './data/avatars.json';
import { load, save } from './platform/storage';

export type AvatarPart = 'jacket' | 'helmet' | 'skin';

export interface AvatarOption {
  id: string;
  name: string;
  color: string;
  /** Coins to buy it. Absent with no reward means free. */
  price?: number;
  /** City id whose last area unlocks it for free. */
  reward?: string;
}

export interface AvatarChoice {
  jacket: string;
  helmet: string;
  skin: string;
}

export interface AvatarColors {
  jacket: string;
  helmet: string;
  skin: string;
}

const PARTS: AvatarPart[] = ['jacket', 'helmet', 'skin'];

export const AVATAR_OPTIONS: Record<AvatarPart, readonly AvatarOption[]> = {
  jacket: catalog.jacket,
  helmet: catalog.helmet,
  skin: catalog.skin,
};

export const DEFAULT_CHOICE: AvatarChoice = {
  jacket: catalog.default.jacket,
  helmet: catalog.default.helmet,
  skin: catalog.default.skin,
};

function option(part: AvatarPart, id: unknown): AvatarOption {
  const list = AVATAR_OPTIONS[part];
  const found = list.find((o) => o.id === id);
  return found ?? list.find((o) => o.id === DEFAULT_CHOICE[part]) ?? list[0];
}

export function normalizeChoice(raw: unknown): AvatarChoice {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    jacket: option('jacket', obj.jacket).id,
    helmet: option('helmet', obj.helmet).id,
    skin: option('skin', obj.skin).id,
  };
}

export function colorsFor(choice: AvatarChoice): AvatarColors {
  return {
    jacket: option('jacket', choice.jacket).color,
    helmet: option('helmet', choice.helmet).color,
    skin: option('skin', choice.skin).color,
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
