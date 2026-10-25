import { ElementsToMathMLAdapter } from './elements-to-mathml-elements-adapter';
import { ErrorHandler } from './error-handler';
import { MathMLElement } from '../../../data/protocols/mathml-element';
import { XmlDocumentParser, XmlParseResult } from '../../../data/protocols/xml-document-parser';

/**
 * Parses a MathML/XML string into an array of internal {@link MathMLElement}
 * trees (one per `<math>` element).
 *
 * It cleans up MS Word artefacts (line breaks, `mml:` prefixes), tolerates
 * malformed attributes through {@link ErrorHandler}, and delegates the DOM →
 * {@link MathMLElement} mapping to {@link ElementsToMathMLAdapter}.
 * XML parsing is supplied by an injected {@link XmlDocumentParser}.
 */
export class XmlToMathMLAdapter {
  private readonly _documentParser: XmlDocumentParser;
  private readonly _errorHandler: ErrorHandler;
  private readonly _elementsConvertor: ElementsToMathMLAdapter;

  constructor(
    documentParser: XmlDocumentParser,
    elementsConvertor: ElementsToMathMLAdapter,
    errorHandler: ErrorHandler,
  ) {
    this._documentParser = documentParser;
    this._elementsConvertor = elementsConvertor;
    this._errorHandler = errorHandler;
  }

  /**
   * Parses the given markup and returns its `<math>` elements as trees.
   *
   * @param xml - the MathML/XML markup to parse.
   * @returns one {@link MathMLElement} tree per `<math>` element found.
   */
  convert(xml: string): MathMLElement[] {
    const cleanedXml = this._removeMsWordPrefixes(this._removeLineBreaks(xml));
    const { document } = this._parseFixingErrors(cleanedXml);
    const elements = document?.getElementsByTagName('math');
    return this._elementsConvertor.convert(elements ? Array.from(elements) : []);
  }

  private _removeLineBreaks(xml: string): string {
    const LINE_BREAK = /\n|\r\n|\r/g;
    return xml.replace(LINE_BREAK, '');
  }

  private _removeMsWordPrefixes(xml: string): string {
    const MS_WORD_PREFIX = /mml:/g;
    return xml.replace(MS_WORD_PREFIX, '');
  }

  private _parseFixingErrors(xml: string): XmlParseResult {
    const result = this._documentParser.parse(xml);
    if (result.errors.length === 0) return result;

    let repairedXml = xml;
    if (!result.document) {
      // Failed documents need all repairs, regardless of native error wording.
      repairedXml = this._errorHandler.repairMalformedMarkup(xml);
    } else {
      // Keep xmldom's usable documents unless a warning requires attribute repair.
      for (const error of result.errors) {
        repairedXml = this._errorHandler.fixError(repairedXml, error) ?? repairedXml;
      }
    }

    if (repairedXml === xml) return result;

    return this._documentParser.parse(repairedXml);
  }
}
