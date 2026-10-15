// Headless clearability check. A fixed bot rides every generated level on a handful of
// seeds. The report is deterministic: same curve, same bot, same numbers.
import { CITIES, LEVELS, type LevelConfig } from './config';
import { playLevel } from './bot';

export const BALANCE_SEEDS = [1, 2, 3, 4, 5] as const;

export interface LevelBalance {
  index: number;
  id: string;
  city: string;
  name: string;
  v0: number;
  goal: number;
  density: number;
  rain: boolean;
  night: boolean;
  clearRate: number;
  avgHits: number;
  avgHearts: number | null;
  avgSeconds: number | null;
}

export function assess(seeds: readonly number[] = BALANCE_SEEDS): LevelBalance[] {
  return LEVELS.map((cfg, index) => summarise(index, cfg, seeds));
}

function summarise(index: number, cfg: LevelConfig, seeds: readonly number[]): LevelBalance {
  let wins = 0;
  let hits = 0;
  let hearts = 0;
  let seconds = 0;
  for (const seed of seeds) {
    const attempt = playLevel(cfg, seed);
    hits += attempt.hits;
    if (attempt.status === 'won') {
      wins++;
      hearts += attempt.hearts;
      seconds += attempt.ticks / 60;
    }
  }
  const n = seeds.length;
  return {
    index,
    id: cfg.id,
    city: cfg.city ?? '',
    name: cfg.name,
    v0: cfg.v0,
    goal: cfg.goal ?? 0,
    density: cfg.density,
    rain: !!cfg.rain,
    night: !!cfg.night,
    clearRate: wins / n,
    avgHits: hits / n,
    avgHearts: wins ? hearts / wins : null,
    avgSeconds: wins ? seconds / wins : null,
  };
}

export interface Outlier {
  kind: 'plateau' | 'spike';
  text: string;
}

/** Identical tuning copied across areas, or a clear rate that falls off a cliff inside one city. */
export function findOutliers(rows: readonly LevelBalance[]): Outlier[] {
  const notes: Outlier[] = [];
  let runStart = 0;
  for (let i = 1; i <= rows.length; i++) {
    const prev = rows[i - 1];
    const same = i < rows.length && sameTune(prev, rows[i]);
    if (same) continue;
    const len = i - runStart;
    if (len >= 3) {
      const last = rows[i - 1];
      notes.push({
        kind: 'plateau',
        text: `${rows[runStart].name} (${rows[runStart].city}) through ${last.name} is ${len} areas with the same speed ${prev.v0}, goal ${prev.goal}, and density ${prev.density}.`,
      });
    }
    runStart = i;
  }
  for (let i = 1; i < rows.length - 1; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    const c = rows[i + 1];
    if (a.city !== b.city || b.city !== c.city) continue;
    if (b.clearRate <= a.clearRate - 0.6 && b.clearRate <= c.clearRate - 0.6) {
      notes.push({
        kind: 'spike',
        text: `${b.city} · ${b.name} clears ${pct(b.clearRate)} against ${pct(a.clearRate)} and ${pct(c.clearRate)} on either side.`,
      });
    }
  }
  return notes;
}

function sameTune(a: LevelBalance, b: LevelBalance): boolean {
  return a.v0 === b.v0 && a.goal === b.goal && a.density === b.density;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number | null, digits = 1) => (n === null ? '—' : n.toFixed(digits));

export function renderReport(rows: readonly LevelBalance[]): string {
  const outliers = findOutliers(rows);
  const plateaus = outliers.filter((o) => o.kind === 'plateau');
  const spikes = outliers.filter((o) => o.kind === 'spike');
  const clears = rows.reduce((n, r) => n + r.clearRate, 0) / rows.length;
  const cityRows = CITIES.map((city) => {
    const levels = rows.filter((r) => r.city === city.name);
    const rate = levels.reduce((n, r) => n + r.clearRate, 0) / levels.length;
    const hits = levels.reduce((n, r) => n + r.avgHits, 0) / levels.length;
    const first = levels[0];
    const last = levels[levels.length - 1];
    return `| ${city.name} | ${levels.length} | ${pct(rate)} | ${hits.toFixed(2)} | ${first.v0} → ${last.v0} | ${first.goal} → ${last.goal} | ${first.density.toFixed(2)} → ${last.density.toFixed(2)} |`;
  });
  const levelRows = rows.map((r) => {
    const weather = [r.rain ? 'rain' : '', r.night ? 'night' : ''].filter(Boolean).join(', ') || '—';
    return `| ${r.index + 1} | ${r.city} | ${r.name} | ${r.v0} | ${r.goal} | ${r.density.toFixed(2)} | ${weather} | ${pct(r.clearRate)} | ${r.avgHits.toFixed(2)} | ${num(r.avgHearts)} | ${num(r.avgSeconds, 0)} |`;
  });
  return `# Rider Dash balance

Headless check of all ${rows.length} generated levels. A deterministic bot (\`src/sim/bot.ts\`) rides each one on seeds ${BALANCE_SEEDS.join(', ')}. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **${pct(clears)}**. Level 1 is ${pct(rows[0].clearRate)}. The last area is ${pct(rows[rows.length - 1].clearRate)}.

The difficulty number is \`cityIndex * cityStep + areaFraction * areaSpan\`, capped at 1. \`cityStep\` is 0.057143 and \`areaSpan\` is 0.6, so the cap lands on the last area of Ahmedabad. It used to be 0.08, which pinned Lake Town through New Town in Kolkata, and Shahibaug through Manek Chowk in Ahmedabad, to the same maximum speed, goal, and density.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
${cityRows.join('\n')}

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

${plateaus.length ? plateaus.map((o) => `- Plateau: ${o.text}`).join('\n') : '- No tuning plateau. No three areas in a row share speed, goal, and density.'}
${spikes.length ? spikes.map((o) => `- Hard spike: ${o.text}`).join('\n') : '- No hard spike. No area inside a city clears at least 60 points below both neighbours.'}

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
${levelRows.join('\n')}
`;
}
