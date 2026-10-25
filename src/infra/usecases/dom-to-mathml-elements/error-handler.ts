/**
 * Recovers from the malformed-attribute errors commonly produced by MS Word
 * exports (e.g. `<mfenced open='{' close= >`). It inspects the parser error
 * message and rewrites the offending value-less attribute out of the XML so the
 * markup can be re-parsed successfully.
 */
export class ErrorHandler {
  /**
   * If a warning describes a missing attribute value, strips the offending
   * attribute; otherwise returns undefined.
   *
   * @param xml - the current (possibly malformed) XML.
   * @param errorMessage - the message reported by the parser.
   * @returns the (possibly corrected) XML, or undefined for an unrelated error.
   */
  fixError(xml: string, errorMessage: string): string | undefined {
    if (!errorMessage.includes('attribute') || !errorMessage.includes('missed')) return undefined;

    const attribute = errorMessage.match(/attribute "([^"]+)" missed value/)?.[1];
    return this._stripValuelessAttributes(xml, attribute);
  }

  /** Failed parses get one complete repair, independent of parser diagnostics. */
  repairMalformedMarkup(xml: string): string {
    return this._escapeBareAmpersands(this._stripValuelessAttributes(xml));
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

  // Native parsers reject bare ampersands that xmldom tolerates.
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
}

const XML_MARKUP =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[a-zA-Z_][\w:.-]*(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const PROTECTED_XML = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;

// Sticky matching stays inside the start tag, away from text nodes.
const ATTRIBUTE = /(\s+)([\w:.-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>/]+)?)?/y;

// An `&` that does not start a named, decimal or hexadecimal entity reference.
const BARE_AMPERSAND = /&(?![a-zA-Z][\w.-]*;|#\d+;|#x[0-9a-fA-F]+;)/g;
