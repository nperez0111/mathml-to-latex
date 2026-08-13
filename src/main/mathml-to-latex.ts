import { MathMLToLaTeXConverter } from './mathml-to-latex-converter';
import { XmldomDocumentParser } from '../infra/parsers/xmldom-document-parser';

/**
 * Public entry point of the library: converts a MathML string into LaTeX.
 *
 * Parses with `@xmldom/xmldom`, so it runs anywhere, with or without a DOM. On
 * the browser prefer `mathml-to-latex/browser`, which parses with the native
 * `DOMParser` and drops the dependency from the bundle.
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
