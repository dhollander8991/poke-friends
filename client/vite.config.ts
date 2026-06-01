import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173 },
  resolve: {
    alias: {
      '@texas-holdem/shared': new URL('../shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
