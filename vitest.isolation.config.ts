import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/isolation/setup.ts'],
    globals: true,
    include: ['src/test/isolation/**/*.{test,spec}.{js,ts}'],
    testTimeout: 30000, // Allow longer timeouts for database operations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Ensure tests run sequentially for database isolation
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});