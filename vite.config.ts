import { defineConfig } from 'vitest/config';

// Relative base so the build runs from any folder (game portals host it in a subpath).
export default defineConfig({
  base: './',
  test: { include: ['src/**/*.test.ts'] },
});
