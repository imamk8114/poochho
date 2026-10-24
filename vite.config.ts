import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    // Skipped under Vitest: the service worker generator is build-only machinery.
    ...(mode === 'test'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            // A small hand-written worker (src/sw.ts) rather than a generated one: it is easier to read and
            // review, and the generator cannot write workers for projects whose path contains an apostrophe.
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            // iife keeps the worker a classic script, which every browser that supports service workers can run.
            injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], rollupFormat: 'iife' },
            manifest: {
              name: 'Poochho: ask your data',
              short_name: 'Poochho',
              description: 'Ask questions about complaint data in English, Hindi or Kannada. Works offline.',
              theme_color: '#0f766e',
              background_color: '#f6f7f4',
              display: 'standalone',
              start_url: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
              ],
            },
          }),
        ]),
  ],
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
