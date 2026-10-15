// First-run copy for the opening level. Later levels, and a replay after it is cleared,
// stay quiet. The line follows what the rider has not done yet.
export function hintFor(state: {
  firstLevel: boolean;
  fresh: boolean;
  lane: number;
  carry: number;
  delivered: number;
}): string | null {
  if (!state.firstLevel || !state.fresh || state.delivered > 0) return null;
  if (state.carry > 0) return 'Ride through a green DROP zone to deliver.';
  if (state.lane !== 1) return 'Grab a parcel. The open lane is usually clear.';
  return 'Swipe left or right, or press the arrow keys. Swipe up or press Space to jump.';
}
