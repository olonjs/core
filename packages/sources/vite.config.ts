/**
 * Build config for @olonjs/sources.
 *
 * Single library build, zero React/DOM, one runtime dependency edge:
 * `@olonjs/core` (externalized so consumers share the single workspace copy).
 */
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTERNAL = ['@olonjs/core'];

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/vitest-setup.ts'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'OlonJsSources',
      formats: ['es', 'umd'],
      fileName: (format) => `olonjs-sources.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: EXTERNAL,
      output: {
        globals: {
          '@olonjs/core': 'OlonJsCore',
        },
      },
    },
  },
});
