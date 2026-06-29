import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@asset-manager/api-client': fileURLToPath(
        new URL('../../packages/api-client/src/index.ts', import.meta.url),
      ),
      '@asset-manager/domain': fileURLToPath(
        new URL('../../packages/domain/src/index.ts', import.meta.url),
      ),
      '@asset-manager/depreciation': fileURLToPath(
        new URL('../../packages/depreciation/src/index.ts', import.meta.url),
      ),
      '@asset-manager/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
