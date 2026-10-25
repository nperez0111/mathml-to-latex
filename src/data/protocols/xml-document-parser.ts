/** Reports malformed XML without throwing; environment setup errors may throw. */
export interface XmlDocumentParser {
  parse(xml: string): XmlParseResult;
}

export interface XmlParseResult {
  /** The parsed document, or `undefined` when parsing failed. */
  document?: Document;
  /** Parser diagnostics, including warnings on usable documents. */
  errors: string[];
}
