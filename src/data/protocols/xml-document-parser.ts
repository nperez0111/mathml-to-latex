/**
 * Contract for the XML parsing step, kept environment-agnostic so the rest of
 * the library never depends on a concrete parser.
 *
 * Implementations must not throw on malformed markup: parse failures are
 * reported through {@link XmlParseResult.errors} so that `ErrorHandler` can try
 * to repair the markup and the caller can re-parse.
 */
export interface XmlDocumentParser {
  /**
   * Parses XML markup into a DOM document.
   *
   * @param xml - the markup to parse.
   * @returns the parsed document and/or the errors reported by the parser.
   */
  parse(xml: string): XmlParseResult;
}

export interface XmlParseResult {
  /** The parsed document, or `undefined` when parsing failed. */
  document?: Document;
  /** Parser messages, in the order they were reported. Empty when parsing succeeded. */
  errors: string[];
}
