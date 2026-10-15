// Whether a live run should be simulating. A blur or a hidden tab latches until the
// player resumes, so coming back does not tick the road before they can see it.
// An ad hold always wins, and ending the run clears the latch.
export type Hold = 'play' | 'hidden' | 'ad';

export function nextHold(
  prev: Hold,
  opts: { runLive: boolean; ad: boolean; pageAway: boolean; resume: boolean },
): Hold {
  if (!opts.runLive) return 'play';
  if (opts.ad) return 'ad';
  if (opts.pageAway) return 'hidden';
  if (prev === 'hidden' && !opts.resume) return 'hidden';
  return 'play';
}
