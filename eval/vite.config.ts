import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// The playground imports the library straight from `../src`, so it always
// evaluates the current working tree (no intermediate `npm run build`). The
// aliases mirror the `paths` of the root tsconfig, which the library source
// relies on for its bare `data/...` and `domain/...` imports.
//
// It aliases the *browser* entry point, which is what a real browser consumer
// resolves: it uses the platform `DOMParser` and never pulls `@xmldom/xmldom`
// into the bundle.
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      'mathml-to-latex': path.resolve(__dirname, '../src/browser.ts'),
      data: path.resolve(__dirname, '../src/data'),
      domain: path.resolve(__dirname, '../src/domain'),
    },
  },
  server: {
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
});
