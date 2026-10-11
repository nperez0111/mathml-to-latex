/**
 * Recovers from the malformed-attribute errors commonly produced by MS Word
 * exports (e.g. `<mfenced open='{' close= >`). It inspects the parser error
 * message and rewrites the offending value-less attribute out of the XML so the
 * markup can be re-parsed successfully.
 *
 * Messages are worded differently by every parser — `@xmldom/xmldom`, libxml2
 * (Chrome/Safari), Gecko (Firefox) — so recognition is intentionally loose.
 * Callers fall back to `repairMalformedMarkup` if parsing failed and no message
 * identified the problem.
 */
export class ErrorHandler {
  /**
   * If the parser error names a missing attribute value, strips the offending
   * attribute. Returns undefined when the error cannot be recognised.
   *
   * @param xml - the current (possibly malformed) XML.
   * @param errorMessage - the message reported by the parser.
   * @returns the (possibly corrected) XML, or undefined for an unrelated error.
   */
  fixError(xml: string, errorMessage: string): string | undefined {
    if (!this._isMissingAttributeValueError(errorMessage)) return undefined;

    return this._stripValuelessAttributes(xml, this._attributeNameFromError(errorMessage));
  }

  /**
   * Applies every known repair without relying on the parser message, for
   * engines whose errors do not describe the problem (Firefox only reports
   * "not well-formed") and for parsers that reject markup `@xmldom/xmldom`
   * tolerates. Returns the XML unchanged when there is nothing to repair, so
   * callers can tell whether re-parsing is worthwhile.
   *
   * @param xml - the current (possibly malformed) XML.
   * @returns the (possibly corrected) XML.
   */
  repairMalformedMarkup(xml: string): string {
    return this._escapeBareAmpersands(this._stripValuelessAttributes(xml));
  }

  // Only some messages carry the offending attribute name: xmldom's "missed
  // value" warning and libxml2's "Specification mandates value" error. The
  // "AttValue" fatalError does not, so it falls back to the generic strip.
  private _attributeNameFromError(errorMessage: string): string | undefined {
    return (
      errorMessage.match(/attribute "([^"]+)" missed value/)?.[1] ??
      errorMessage.match(/Specification mandates value for attribute ([^\s"'<>]+)/)?.[1]
    );
  }

  private _stripValuelessAttributes(xml: string, namedAttribute?: string): string {
    // Quoted values may contain `>`; comments and CDATA must not be repaired.
    return xml.replace(XML_MARKUP, (tag) => {
      if (tag.startsWith('<!') || tag.startsWith('<?')) return tag;

      const tagName = /^<[a-zA-Z_][\w:.-]*/.exec(tag);
      if (!tagName) return tag;

      let repaired = tagName[0];
      let offset = repaired.length;
      while (offset < tag.length) {
        ATTRIBUTE.lastIndex = offset;
        const attribute = ATTRIBUTE.exec(tag);
        if (!attribute) return repaired + tag.slice(offset);

        const [original, whitespace, name, value] = attribute;
        const hasEquals = original.includes('=');
        const quoted = value?.startsWith('"') || value?.startsWith("'");
        if ((namedAttribute && name !== namedAttribute) || (hasEquals && quoted)) {
          repaired += original;
        } else if (hasEquals) {
          repaired += whitespace;
        }
        offset = ATTRIBUTE.lastIndex;
      }

      return repaired;
    });
  }

  // `&` is a legal character in MathML text content for lenient parsers, but a
  // malformed entity reference for strict ones, so it is escaped back into the
  // character it was meant to be.
  private _escapeBareAmpersands(xml: string): string {
    let escaped = '';
    let offset = 0;
    PROTECTED_XML.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PROTECTED_XML.exec(xml))) {
      escaped += xml.slice(offset, match.index).replace(BARE_AMPERSAND, '&amp;');
      escaped += match[0];
      offset = match.index + match[0].length;
    }

    return escaped + xml.slice(offset).replace(BARE_AMPERSAND, '&amp;');
  }

  private _isMissingAttributeValueError(errorMessage: string): boolean {
    return (
      (errorMessage.includes('attribute') && errorMessage.includes('missed')) ||
      errorMessage.includes('attribute value missed') ||
      // libxml2 (Chrome, Safari) on an attribute written without `=`.
      errorMessage.includes('Specification mandates value for attribute') ||
      // A value-less attribute written as `attr=` is reported as this
      // fatalError by both xmldom and libxml2, which order the quotes
      // differently in the message.
      MISSING_ATT_VALUE_MESSAGE.test(errorMessage)
    );
  }
}

const MISSING_ATT_VALUE_MESSAGE = /AttValue: ("|') or ("|') expected/;

const XML_MARKUP =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[a-zA-Z_][\w:.-]*(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const PROTECTED_XML = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;

// Sticky matching stays inside the start tag, away from text nodes.
const ATTRIBUTE = /(\s+)([\w:.-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>/]+)?)?/y;

// An `&` that does not start a named, decimal or hexadecimal entity reference.
const BARE_AMPERSAND = /&(?![a-zA-Z][\w.-]*;|#\d+;|#x[0-9a-fA-F]+;)/g;
