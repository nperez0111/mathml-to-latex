import { DOMParser } from '@xmldom/xmldom';
import { XmlDocumentParser, XmlParseResult } from '../../data/protocols/xml-document-parser';

/**
 * {@link XmlDocumentParser} backed by `@xmldom/xmldom`, used by the Node build.
 *
 * This is the only module in the library that imports `@xmldom/xmldom`; the
 * browser build wires {@link NativeDocumentParser} instead and therefore never
 * pulls the dependency into the bundle.
 */
export class XmldomDocumentParser implements XmlDocumentParser {
  parse(xml: string): XmlParseResult {
    const errors: string[] = [];
    // Since @xmldom/xmldom 0.9 the deprecated `errorHandler`/`locator` object
    // options were replaced by a single `onError(level, message)` callback.
    const domParser = new DOMParser({
      onError: (_level, message) => {
        errors.push(message);
      },
    });

    try {
      // xmldom exposes its own Document type, structurally compatible with the
      // DOM one used downstream but not overlapping for TS, so the cast must go
      // through `unknown`.
      const document = domParser.parseFromString(xml, 'text/xml') as unknown as Document;
      return { document, errors };
    } catch {
      // Since xmldom 0.9 a fatalError (e.g. a value-less attribute) aborts
      // parsing and is thrown as a ParseError. `onError` has already collected
      // the message, so the caller can repair the markup and re-parse.
      return { errors };
    }
  }
}
