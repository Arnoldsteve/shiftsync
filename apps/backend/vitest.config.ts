import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
    globalTeardown: ['./test/global-teardown.ts'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/', '**/*.spec.ts', '**/*.test.ts'],
    },
    // Separate unit and integration tests
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/', 'dist/', '.turbo/'],
  },
  resolve: {
    alias: {
      '@shiftsync/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
