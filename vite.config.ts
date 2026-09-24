import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
// `defineConfig` from vitest, not vite: it is the same function widened to accept
// the `test` block below. Vite's own overloads reject it.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for our own code; libraries keep their own mode.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },

      adapter: adapter(),

      csp: {
        mode: 'auto',
        directives: {
          'default-src': ['self'],
          // Avatars from the OAuth providers.
          'img-src': [
            'self',
            'data:',
            'https://avatars.githubusercontent.com',
            'https://lh3.googleusercontent.com',
          ],
          'style-src': ['self', 'unsafe-inline'],
          'script-src': ['self'],
          'connect-src': ['self'],
          'frame-ancestors': ['none'],
          'base-uri': ['self'],
          'form-action': ['self'],
          'object-src': ['none'],
        },
      },
    }),
    SvelteKitPWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      manifest: {
        name: 'devopsdojo',
        short_name: 'devopsdojo',
        description: 'From zero to senior DevOps, one micro-lesson at a time.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the built shell only. No runtime caching: D19 forbids caching
        // /api responses, and a stale shell would serve outdated content.
        globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
        navigateFallback: null,
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/srs/**',
        'src/lib/cards/**',
        'src/lib/server/placement/**',
        'src/lib/server/interleaving/**',
        'src/lib/server/streak/**',
        'scripts/content/sync.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
