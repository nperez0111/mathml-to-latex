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
    return new MarkupRepair(xml, attribute).run();
  }

  /** Failed parses get one complete repair, independent of parser diagnostics. */
  repairMalformedMarkup(xml: string): string {
    return new MarkupRepair(xml, undefined, true).run();
  }
}

/** A forward-only lexical scan, not an XML parser. Never rescan an unterminated suffix. */
class MarkupRepair {
  constructor(
    private readonly _xml: string,
    private readonly _namedAttribute?: string,
    private readonly _escapeAmpersands = false,
  ) {}

  run(): string {
    const parts: string[] = [];
    let offset = 0;
    while (offset < this._xml.length) {
      const start = this._xml.indexOf('<', offset);
      if (start === -1) {
        parts.push(this._escape(this._xml.slice(offset)));
        break;
      }
      parts.push(this._escape(this._xml.slice(offset, start)));
      const protectedEnd = this._protectedEnd(start);
      if (protectedEnd !== undefined) {
        parts.push(this._xml.slice(start, protectedEnd));
        offset = protectedEnd;
        continue;
      }

      const [end, complete] = this._tagEnd(start);
      const tag = this._xml.slice(start, end);
      // Leave incomplete tags/quotes alone. A new unquoted `<` begins another token.
      parts.push(complete ? this._escape(this._repairTag(tag)) : tag);
      offset = end;
    }
    return parts.join('');
  }

  private _protectedEnd(start: number): number | undefined {
    for (const [open, close] of [
      ['<!--', '-->'],
      ['<![CDATA[', ']]>'],
      ['<?', '?>'],
    ]) {
      if (!this._xml.startsWith(open, start)) continue;
      return this._delimitedEnd(start, open, close);
    }
    if (!this._xml.startsWith('<!', start)) return undefined;

    // A DOCTYPE can contain quoted `>`, internal declarations, comments and PIs.
    let brackets = 0;
    let quote = '';
    for (let i = start + 2; i < this._xml.length; i++) {
      const char = this._xml.charAt(i);
      if (quote) {
        if (char === quote) quote = '';
        continue;
      }
      if (this._xml.startsWith('<!--', i) || this._xml.startsWith('<?', i)) {
        i = this._xml.startsWith('<!--', i)
          ? this._delimitedEnd(i, '<!--', '-->') - 1
          : this._delimitedEnd(i, '<?', '?>') - 1;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '[') brackets++;
      else if (char === ']') brackets--;
      else if (char === '>' && brackets === 0) return i + 1;
    }
    return this._xml.length;
  }

  private _delimitedEnd(start: number, open: string, close: string): number {
    const end = this._xml.indexOf(close, start + open.length);
    return end === -1 ? this._xml.length : end + close.length;
  }

  private _tagEnd(start: number): [number, boolean] {
    let quote = '';
    for (let i = start + 1; i < this._xml.length; i++) {
      const char = this._xml.charAt(i);
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '<') return [i, false];
      else if (char === '>') return [i + 1, true];
    }
    return [this._xml.length, false];
  }

  private _repairTag(tag: string): string {
    XML_NAME.lastIndex = 1;
    if (!XML_NAME.exec(tag)) return tag;
    let offset = XML_NAME.lastIndex;
    let kept = 0;
    const parts: string[] = [];
    while (offset < tag.length) {
      const whitespace = offset;
      while (XML_SPACE.test(tag.charAt(offset))) offset++;
      if (tag[offset] === '>' || tag.startsWith('/>', offset)) break;
      if (offset === whitespace) return tag;

      const start = offset;
      XML_NAME.lastIndex = start;
      const name = XML_NAME.exec(tag)?.[0];
      if (!name) return tag;
      const nameEnd = XML_NAME.lastIndex;
      offset = nameEnd;
      while (XML_SPACE.test(tag.charAt(offset))) offset++;
      const hasEquals = tag[offset] === '=';
      let quoted = false;
      if (hasEquals) {
        offset++;
        while (XML_SPACE.test(tag.charAt(offset))) offset++;
        const quote = tag[offset];
        quoted = quote === '"' || quote === "'";
        if (quoted) {
          offset = tag.indexOf(quote, offset + 1);
          if (offset === -1) return tag;
          offset++;
        } else {
          while (
            offset < tag.length &&
            !XML_SPACE.test(tag.charAt(offset)) &&
            !['>', '<', '"', "'", '='].includes(tag[offset]) &&
            !tag.startsWith('/>', offset)
          )
            offset++;
        }
      } else {
        // Do not delete an ASCII prefix of an invalid or Unicode name.
        if (offset === nameEnd && tag[offset] !== '>' && !tag.startsWith('/>', offset)) return tag;
        offset = nameEnd;
      }

      if ((!this._namedAttribute || name === this._namedAttribute) && !quoted) {
        parts.push(tag.slice(kept, hasEquals ? start : whitespace));
        kept = offset;
      }
    }
    parts.push(tag.slice(kept));
    return parts.join('');
  }

  // Native parsers reject bare ampersands that xmldom tolerates.
  private _escape(xml: string): string {
    return this._escapeAmpersands ? xml.replace(BARE_AMPERSAND, '&amp;') : xml;
  }
}

// XML 1.0 (fifth edition) NameStartChar and NameChar, including supplementary planes.
const NAME_START =
  ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}';
const NAME = `[${NAME_START}][${NAME_START}.0-9\\-\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*`;
const XML_NAME = new RegExp(NAME, 'uy');
const XML_SPACE = /^[\x20\t\r\n]$/;
const BARE_AMPERSAND = new RegExp(`&(?!${NAME};|#\\d+;|#x[0-9a-fA-F]+;)`, 'gu');
