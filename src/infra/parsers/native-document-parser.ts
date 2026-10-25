import { XmlDocumentParser, XmlParseResult } from '../../data/protocols/xml-document-parser';

/** Uses the platform parser and discards unusable parsererror documents. */
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
    const root = document.documentElement;
    // Firefox (and jsdom) use a dedicated error namespace at the root.
    // Chromium/WebKit use XHTML, at the root or inserted into the partial tree.
    // An annotation's ordinary `parsererror` element is user content, not a diagnostic.
    const parserError = Array.from(document.getElementsByTagNameNS('*', 'parsererror')).find((element) => {
      if (element.namespaceURI === PARSER_ERROR_NAMESPACE) return element === root;
      if (element.namespaceURI !== XHTML_NAMESPACE) return false;
      if (element === root || element.parentNode === root) return true;
      return (
        root?.localName === 'html' &&
        root.namespaceURI === XHTML_NAMESPACE &&
        element.parentElement?.localName === 'body' &&
        element.parentElement.parentNode === root
      );
    });
    if (!parserError) return undefined;

    return parserError.textContent?.trim() || 'XML parsing error';
  }
}

const MISSING_DOM_PARSER_MESSAGE =
  'mathml-to-latex/browser requires a global DOMParser. Use mathml-to-latex where DOMParser is unavailable.';
const PARSER_ERROR_NAMESPACE = 'http://www.mozilla.org/newlayout/xml/parsererror.xml';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
