/**
 * @jest-environment jsdom
 */
import { MathMLToLaTeX as BrowserMathMLToLaTeX } from './browser';
import { MathMLToLaTeX as NodeMathMLToLaTeX } from './index';
import * as mathmlStrings from './__fixtures__/mathmlStrings';

describe('MathMLToLaTeX (browser entry point)', () => {
  it('converts MathML using the native DOMParser', () => {
    expect(BrowserMathMLToLaTeX.convert('<math><mi>a</mi></math>')).toBe('a');
  });

  it('converts an empty string to an empty string', () => {
    expect(BrowserMathMLToLaTeX.convert('')).toBe('');
  });

  it('converts a non MathML string to an empty string', () => {
    expect(BrowserMathMLToLaTeX.convert('<p>not mathml</p>')).toBe('');
  });

  it('recovers from the value-less attributes emitted by MS Word', () => {
    expect(BrowserMathMLToLaTeX.convert(mathmlStrings.mfencedWithBrokenAttributeCase1)).toBe('\\left\\{3\\right)');
  });

  it('throws a helpful error when no DOMParser is available', () => {
    const { DOMParser } = globalThis;
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

    try {
      expect(() => BrowserMathMLToLaTeX.convert('<math><mi>a</mi></math>')).toThrow(/requires a global DOMParser/);
    } finally {
      globalThis.DOMParser = DOMParser;
    }
  });
});

describe('browser and Node.js entry points parity', () => {
  const fixtures: [string, string][] = Object.entries(mathmlStrings)
    .filter(([, mathml]) => typeof mathml === 'string')
    .map(([name, mathml]) => [name, mathml as string]);

  it.each(fixtures)('converts %s identically', (_name, mathml) => {
    expect(BrowserMathMLToLaTeX.convert(mathml)).toBe(NodeMathMLToLaTeX.convert(mathml));
  });

  const singleOperandFixtures: [string, string][] = mathmlStrings.inputExpectedPairs.map(({ input, op }) => [
    `<${op}>${input}</${op}>`,
    `<math><${op}>${input}</${op}></math>`,
  ]);

  it.each(singleOperandFixtures)('converts %s identically', (_name, mathml) => {
    expect(BrowserMathMLToLaTeX.convert(mathml)).toBe(NodeMathMLToLaTeX.convert(mathml));
  });
});
