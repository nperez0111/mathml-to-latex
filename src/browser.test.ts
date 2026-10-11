/**
 * @jest-environment jsdom
 */
import { MathMLToLaTeX as BrowserMathMLToLaTeX } from './browser';
import { MathMLToLaTeX as NodeMathMLToLaTeX } from './index';
import * as mathmlStrings from './__fixtures__/mathmlStrings';

describe('MathMLToLaTeX (browser entry point)', () => {
  it('preserves text resembling attributes during fallback recovery', () => {
    const xml = '<math><mtext>a x=2 & b</mtext></math>';
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe(NodeMathMLToLaTeX.convert(xml));
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('\\text{a x}=\\text{2 }\\&\\text{ b}');
  });

  it('preserves text when repairing a broken attribute through both parsers', () => {
    const xml = '<math><mtext>a x=2 &amp; b</mtext><mfenced close ><mi>x</mi></mfenced></math>';
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe(NodeMathMLToLaTeX.convert(xml));
    expect(BrowserMathMLToLaTeX.convert(xml)).toContain('\\text{a x}=\\text{2 }');
  });

  it('keeps a repaired self-closing tag closed through both parsers', () => {
    const xml = '<math><mi close=/><mi>x</mi></math>';
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('x');
    expect(NodeMathMLToLaTeX.convert(xml)).toBe('x');
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
