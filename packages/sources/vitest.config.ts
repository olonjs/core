import { defineConfig } from 'vitest/config';

/**
 * Pure-logic test suite. No jsdom, no React: @olonjs/sources is
 * server-side/Node and must stay hermetic (fake clock, zero network).
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
