import { MathMLToLaTeXConverter } from '../mathml-to-latex-converter';
import { NativeDocumentParser } from '../../infra/parsers/native-document-parser';

/**
 * Browser entry point of the library: converts a MathML string into LaTeX.
 *
 * Behaves exactly like the default `MathMLToLaTeX`, but parses with the
 * platform's built-in `DOMParser` instead of `@xmldom/xmldom`, which keeps the
 * dependency out of the bundle. It requires a global `DOMParser` (available in
 * browser windows and jsdom, but not Web Workers).
 *
 * @example
 * import { MathMLToLaTeX } from 'mathml-to-latex/browser';
 *
 * MathMLToLaTeX.convert('<math><mrow><mn>a</mn><mo>+</mo><mn>b</mn></mrow></math>');
 * // => 'a + b'
 */
export class MathMLToLaTeX {
  /**
   * Converts a MathML string to its LaTeX representation.
   *
   * @param mathml - the MathML markup to convert.
   * @returns the equivalent LaTeX string (trimmed).
   */
  static convert(mathml: string): string {
    return new MathMLToLaTeXConverter(new NativeDocumentParser()).convert(mathml);
  }
}
