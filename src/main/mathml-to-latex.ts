import { MathMLToLaTeXConverter } from './mathml-to-latex-converter';
import { XmldomDocumentParser } from '../infra/parsers/xmldom-document-parser';

/**
 * Public entry point of the library: converts a MathML string into LaTeX.
 *
 * Parses with `@xmldom/xmldom`, so it works anywhere, with or without a DOM.
 * Browser-targeted imports use the native parser by default; the explicit
 * `mathml-to-latex/polyfill` entry retains this xmldom-backed implementation.
 *
 * @example
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
    return new MathMLToLaTeXConverter(new XmldomDocumentParser()).convert(mathml);
  }
}
