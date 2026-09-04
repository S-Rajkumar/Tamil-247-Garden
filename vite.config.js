import { defineConfig } from 'vite';

export default defineConfig({
  /**
   * Relative asset URLs, not root-absolute.
   *
   * A Playables game ships as a ZIP and is served from wherever the platform
   * unpacks it, which is not guaranteed to be a domain root. `/assets/...`
   * would 404 there; `./assets/...` resolves wherever the bundle lands.
   */
  base: './',
  build: {
    // The font is 49 KB. Inlining it as base64 would grow it by a third and
    // block the CSS on it; as a file it downloads in parallel and caches.
    assetsInlineLimit: 4096,
  },
});
