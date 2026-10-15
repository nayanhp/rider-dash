// Writes BALANCE.md by loading the simulation through Vite. No extra dependencies.
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const mod = await server.ssrLoadModule('/src/sim/balance.ts');
  const rows = mod.assess();
  writeFileSync(new URL('../BALANCE.md', import.meta.url), mod.renderReport(rows));
  const outliers = mod.findOutliers(rows);
  console.log(`Wrote BALANCE.md (${rows.length} levels, ${outliers.length} outliers).`);
} finally {
  await server.close();
}
