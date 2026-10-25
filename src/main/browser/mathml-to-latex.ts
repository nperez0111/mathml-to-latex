import { MathMLToLaTeXConverter } from '../mathml-to-latex-converter';
import { NativeDocumentParser } from '../../infra/parsers/native-document-parser';

/**
 * Dependency-free entry requiring a global DOMParser, unavailable in Web Workers.
 *
 * @example
 * import { MathMLToLaTeX } from 'mathml-to-latex/browser';
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
