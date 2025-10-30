/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./', import.meta.url)) },
      { find: '@/', replacement: fileURLToPath(new URL('./', import.meta.url)) },
      { find: '@/lib', replacement: fileURLToPath(new URL('./lib', import.meta.url)) },
    ],
  },
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          include: [
            'app/api/**/__tests__/**/*.test.ts',
            'tests/**/?(*.)+(test).[tj]s',
          ],
          exclude: [
            'tests/routes/**',
            'tests/e2e/**',
            'tests/pages/**',
          ],
          setupFiles: ['tests/setup.node.ts', 'tests/setup.mocks.ts'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          globals: true,
          include: ['tests/components/**/?(*.)+(test).[tj]sx'],
          exclude: [
            'tests/routes/**',
            'tests/e2e/**',
            'tests/pages/**',
          ],
          setupFiles: ['tests/setup.jsdom.ts'],
          environmentOptions: { jsdom: { url: 'http://localhost' } },
        },
      },
    ],
    coverage: { provider: 'v8' },
  },
});