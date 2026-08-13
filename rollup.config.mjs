import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';

// Two entry points with the same public API. The Node one parses with
// `@xmldom/xmldom`; the browser one uses the platform `DOMParser`, so its module
// graph never reaches the dependency.
const nodeInput = 'src/index.ts';
const browserInput = 'src/browser.ts';

// Emit ES modules for Rollup to consume without touching the shared tsconfig
// (ts-jest relies on `module: commonjs`). Declarations come from the dts pass.
const ts = () =>
  typescript({
    tsconfig: './tsconfig.json',
    module: 'esnext',
    moduleResolution: 'bundler',
    declaration: false,
    declarationMap: false,
  });

const dualFormats = (name) => [
  { file: `dist/${name}.mjs`, format: 'es' },
  { file: `dist/${name}.cjs`, format: 'cjs', exports: 'named' },
];

const types = (input, file) => ({ input, plugins: [dts()], output: { file, format: 'es' } });

export default [
  // ESM + CJS for Node and bundlers — keep the dependency external.
  {
    input: nodeInput,
    external: ['@xmldom/xmldom'],
    plugins: [ts()],
    output: dualFormats('index'),
  },
  // ESM + CJS for browsers and browser-targeted bundlers — no dependencies.
  {
    input: browserInput,
    plugins: [ts()],
    output: dualFormats('browser'),
  },
  // Self-contained, minified UMD for the browser/CDN. Built from the browser
  // entry point, so it no longer bundles `@xmldom/xmldom`. Exposes the same
  // `MathMLToLaTeX` global as before.
  {
    input: browserInput,
    plugins: [resolve(), commonjs(), ts(), terser()],
    output: {
      file: 'dist/bundle.min.js',
      format: 'umd',
      name: 'MathMLToLaTeX',
      exports: 'named',
    },
  },
  // Bundled type declarations.
  types(nodeInput, 'dist/index.d.ts'),
  types(browserInput, 'dist/browser.d.ts'),
];
