/**
 * Recovers from the malformed-attribute errors commonly produced by MS Word
 * exports (e.g. `<mfenced open='{' close= >`). It inspects the parser error
 * message and rewrites the offending value-less attribute out of the XML so the
 * markup can be re-parsed successfully.
 *
 * Messages are worded differently by every parser — `@xmldom/xmldom`, libxml2
 * (Chrome/Safari), Gecko (Firefox) — so recognition is intentionally loose and
 * falls back to a generic repair.
 */
export class ErrorHandler {
  private _errors: string[] = [];

  /**
   * If the parser error is a recoverable missing-attribute-value error, records
   * it and returns the XML with the offending attribute stripped; otherwise
   * returns the XML unchanged.
   *
   * @param xml - the current (possibly malformed) XML.
   * @param errorMessage - the message reported by the parser.
   * @returns the (possibly corrected) XML.
   */
  fixError(xml: string, errorMessage: string): string {
    if (!this._isMissingAttributeValueError(errorMessage)) return xml;

    this._errors.push(errorMessage);
    return this._fixMissingAttribute(errorMessage, xml);
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

  isThereAnyErrors(): boolean {
    return this._errors.length > 0;
  }

  cleanErrors(): void {
    this._errors = [];
  }

  private _fixMissingAttribute(errorMessage: string, xml: string): string {
    const missingAttribute = this._attributeNameFromError(errorMessage);
    if (missingAttribute) return xml.replace(this._matchMissingValueForAttribute(missingAttribute), '');

    return this._stripValuelessAttributes(xml);
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

  private _matchMissingValueForAttribute(attribute: string): RegExp {
    return new RegExp(`(${attribute}=(?!("|')))|(${attribute}(?!("|')))`, 'gm');
  }

  private _stripValuelessAttributes(xml: string): string {
    let repairedXml = xml;

    while (MISSING_VALUE_AFTER_EQUALS().exec(repairedXml)) {
      repairedXml = repairedXml.replace(MISSING_VALUE_AFTER_EQUALS(), '$1$3');
    }

    // One pass only strips the first bare attribute of each tag, so it repeats
    // until the markup stops changing.
    let previousXml = '';
    while (previousXml !== repairedXml) {
      previousXml = repairedXml;
      repairedXml = repairedXml.replace(BARE_ATTRIBUTE_NAME(), '$1');
    }

    return repairedXml;
  }

  // `&` is a legal character in MathML text content for lenient parsers, but a
  // malformed entity reference for strict ones, so it is escaped back into the
  // character it was meant to be.
  private _escapeBareAmpersands(xml: string): string {
    return xml.replace(BARE_AMPERSAND(), '&amp;');
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

// `attr=` immediately followed by something other than a quoted value.
const MISSING_VALUE_AFTER_EQUALS = (): RegExp => /(\<.* )(\w+=(?!"|'))(.*\>)/gm;

// A bare attribute name inside a start tag, i.e. one not followed by `=`, after
// the tag name and any number of well-formed attributes.
const BARE_ATTRIBUTE_NAME = (): RegExp =>
  /(<[a-zA-Z_][\w:.-]*(?:\s+[\w:.-]+\s*=\s*("[^"]*"|'[^']*'))*)\s+[\w:.-]+(?=\s|\/?>)/g;

// An `&` that does not start a named, decimal or hexadecimal entity reference.
const BARE_AMPERSAND = (): RegExp => /&(?![a-zA-Z][\w.-]*;|#\d+;|#x[0-9a-fA-F]+;)/g;
