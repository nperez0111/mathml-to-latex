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
 * {@link MathMLElement} mapping to {@link ElementsToMathMLAdapter}. The actual
 * XML parsing is delegated to an {@link XmlDocumentParser}, so the same logic
 * runs on top of `@xmldom/xmldom` or of the platform's native `DOMParser`.
 */
export class XmlToMathMLAdapter {
  private _xml = '';
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
    this._xml = this._removeLineBreaks(xml);
    this._xml = this._removeMsWordPrefixes(this._xml);

    return this._elementsConvertor.convert(this._mathMLElements);
  }

  private _removeLineBreaks(xml: string): string {
    const LINE_BREAK = /\n|\r\n|\r/g;
    return xml.replace(LINE_BREAK, '');
  }

  private _removeMsWordPrefixes(xml: string): string {
    const MS_WORD_PREFIX = /mml:/g;
    return xml.replace(MS_WORD_PREFIX, '');
  }

  private get _mathMLElements(): Element[] {
    const { document } = this._parseFixingErrors();

    const elements = document?.getElementsByTagName('math');
    // xmldom exposes its own Element type, which is structurally compatible
    // with the DOM Element used downstream but does not overlap for TS, so the
    // cast must go through `unknown`.
    return elements ? (Array.from(elements) as unknown as Element[]) : [];
  }

  private _parseFixingErrors(): XmlParseResult {
    const result = this._documentParser.parse(this._xml);
    if (result.errors.length === 0) return result;

    for (const error of result.errors) {
      this._xml = this._errorHandler.fixError(this._xml, error);
    }

    if (!this._errorHandler.isThereAnyErrors()) return this._parseRepairingBlindly(result);

    this._errorHandler.cleanErrors();
    return this._documentParser.parse(this._xml);
  }

  // Native parsers word their messages differently on every engine (Firefox
  // only reports "not well-formed"), so when nothing was recognised and no
  // document came out of the parse, the value-less attribute repair is
  // attempted anyway. It is a no-op unless the markup actually contains one.
  private _parseRepairingBlindly(result: XmlParseResult): XmlParseResult {
    if (result.document) return result;

    const repairedXml = this._errorHandler.repairMalformedMarkup(this._xml);
    if (repairedXml === this._xml) return result;

    this._xml = repairedXml;
    return this._documentParser.parse(this._xml);
  }
}
