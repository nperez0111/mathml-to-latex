import { XmlDocumentParser, XmlParseResult } from '../../data/protocols/xml-document-parser';

/**
 * {@link XmlDocumentParser} backed by the `DOMParser` built into the platform
 * (browser windows and jsdom). It keeps the browser build free of any
 * XML parsing dependency.
 *
 * Native parsers do not report errors through a callback: a failed parse
 * returns a document containing a `<parsererror>` element whose text is
 * engine-specific. That text is surfaced as an error so `ErrorHandler` can try
 * to repair the markup, and the unusable document is discarded.
 */
export class NativeDocumentParser implements XmlDocumentParser {
  parse(xml: string): XmlParseResult {
    const document = this._domParser().parseFromString(xml, 'text/xml');
    const error = this._parseErrorFrom(document);
    if (error) return { errors: [error] };

    return { document, errors: [] };
  }

  private _domParser(): DOMParser {
    const parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
    if (!parser) throw new Error(MISSING_DOM_PARSER_MESSAGE);

    return new parser();
  }

  private _parseErrorFrom(document: Document): string | undefined {
    // Chrome/Safari nest the element in an XHTML document, Firefox returns it
    // as the document element; matching by qualified name covers both.
    const parserError = document.getElementsByTagName('parsererror')[0];
    if (!parserError) return undefined;

    return parserError.textContent?.trim() || 'XML parsing error';
  }
}

const MISSING_DOM_PARSER_MESSAGE =
  'mathml-to-latex/browser requires a global DOMParser. ' +
  'Use mathml-to-latex/polyfill where DOMParser is unavailable.';
