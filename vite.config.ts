import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages sirve el juego en /<repositorio>/ (BASE=/pokerift/ en .github/workflows/pages.yml).
  base: process.env.BASE ?? '/',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    // ui-gallery.html: galería del kit de interfaz (la revisa npm run ui-check).
    // fx-viewer.html: visor de efectos de movimientos (lo usa npm run fx-check).
    rollupOptions: { input: { main: 'index.html', gallery: 'ui-gallery.html', fxViewer: 'fx-viewer.html' } },
  },
  test: { include: ['tests/**/*.test.ts'] },
} as any);
