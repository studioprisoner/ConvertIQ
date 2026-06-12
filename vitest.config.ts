import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'src/test/isolation/**'
    ],
    server: {
      deps: {
        inline: ['@testing-library/react'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});