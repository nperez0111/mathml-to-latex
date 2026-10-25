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

  it.each(['data-é', 'é', '名', 'a·b', '𐀀'])('recovers without corrupting the Unicode attribute %s', (name) => {
    const xml = `<math><mfenced ${name}="a" close= ><mi>x</mi></mfenced></math>`;
    expect(NodeMathMLToLaTeX.convert(xml)).toBe('\\left(x\\right)');
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('\\left(x\\right)');
  });

  it('does not mistake annotation content for a parser diagnostic', () => {
    const xml =
      '<math><semantics><mi>x</mi><annotation-xml><parsererror>hello</parsererror></annotation-xml></semantics></math>';
    expect(NodeMathMLToLaTeX.convert(xml)).toBe('x');
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('x');
  });

  it.each(['é', 'a:b', '名', 'a·b', '𐀀'])('preserves a declared entity %s when repairing another error', (name) => {
    const xml = `<!DOCTYPE math [<!ENTITY ${name} "hello">]><math><mtext>&${name};</mtext><mi close= >x</mi></math>`;
    expect(BrowserMathMLToLaTeX.convert(xml.replace(' close= ', ''))).toBe('\\text{hello} x');
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('\\text{hello} x');
  });

  it('rejects repeated incomplete tags without recursive conversion or regex rescanning', () => {
    const xml = '<math>' + '<a '.repeat(32000);
    expect(NodeMathMLToLaTeX.convert(xml)).toBe('');
    expect(BrowserMathMLToLaTeX.convert(xml)).toBe('');
  });

  it('throws a helpful error when no DOMParser is available', () => {
    const { DOMParser } = globalThis;
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

    try {
      expect(() => BrowserMathMLToLaTeX.convert('<math><mi>a</mi></math>')).toThrow(
        'mathml-to-latex/browser requires a global DOMParser. Use mathml-to-latex where DOMParser is unavailable.',
      );
      expect(NodeMathMLToLaTeX.convert('<math><mi>a</mi></math>')).toBe('a');
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
