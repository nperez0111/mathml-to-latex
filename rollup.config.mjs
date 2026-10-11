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

export default [
  // Keep separate polyfill filenames so the legacy browser field cannot
  // redirect the explicit xmldom import to the native parser.
  {
    input: nodeInput,
    external: ['@xmldom/xmldom'],
    plugins: [ts()],
    output: [
      { file: 'dist/index.mjs', format: 'es' },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named' },
      { file: 'dist/polyfill.mjs', format: 'es' },
      { file: 'dist/polyfill.cjs', format: 'cjs', exports: 'named' },
    ],
  },
  // Browser-targeted default and explicit browser subpath: no dependencies.
  {
    input: browserInput,
    plugins: [ts()],
    output: [
      { file: 'dist/browser.mjs', format: 'es' },
      { file: 'dist/browser.cjs', format: 'cjs', exports: 'named' },
    ],
  },
  // Self-contained browser/CDN bundle, built from the native parser entry.
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
  { input: nodeInput, plugins: [dts()], output: { file: 'dist/index.d.ts', format: 'es' } },
  { input: browserInput, plugins: [dts()], output: { file: 'dist/browser.d.ts', format: 'es' } },
];
