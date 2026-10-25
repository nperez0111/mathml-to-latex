import { convertTreeToLatex } from '../data/usecases/mathml-to-latex-convertion/tree-to-latex';
import { makeToMathElementsConverter } from './factories';
import { XmlDocumentParser } from '../data/protocols/xml-document-parser';

/**
 * The conversion runs in two stages — the MathML is parsed into an internal
 * element tree (see {@link makeToMathElementsConverter}), then each top-level
 * element tree is converted to LaTeX iteratively (see {@link convertTreeToLatex}).
 */
export class MathMLToLaTeXConverter {
  private readonly _documentParser: XmlDocumentParser;

  constructor(documentParser: XmlDocumentParser) {
    this._documentParser = documentParser;
  }

  convert(mathml: string): string {
    const mathmlElements = makeToMathElementsConverter(this._documentParser).convert(mathml);
    return mathmlElements
      .map((mathMLElement) => convertTreeToLatex(mathMLElement))
      .join('')
      .trim();
  }
}
