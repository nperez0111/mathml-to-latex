describe('package entry points', () => {
  const manifest = jest.requireActual('../package.json');

  it('keeps the xmldom entry as the default without browser remapping', () => {
    expect(manifest).not.toHaveProperty('browser');
    expect(manifest.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.mjs',
      require: './dist/index.cjs',
      default: './dist/index.cjs',
    });
  });

  it('exposes the native parser only through the explicit browser entry', () => {
    expect(manifest.exports['./browser']).toEqual({
      types: './dist/browser.d.ts',
      import: './dist/browser.mjs',
      require: './dist/browser.cjs',
      default: './dist/browser.mjs',
    });
    expect(manifest.exports).not.toHaveProperty('./polyfill');
  });
});
