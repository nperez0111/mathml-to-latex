import { ErrorHandler } from './error-handler';

describe('ErrorHandler', () => {
  it('ignores an unrelated error', () => {
    const handler = new ErrorHandler();
    expect(handler.fixError('<math></math>', 'some unrelated parse error')).toBeUndefined();
  });

  it('strips a value-less attribute reported as a missed-value warning', () => {
    const handler = new ErrorHandler();
    const fixed = handler.fixError(
      "<mfenced open='{' close ></mfenced>",
      'attribute "close" missed value!! "close" instead!!',
    );
    expect(fixed).not.toContain('close');
  });

  it('does not remove text resembling an attribute while fixing a named attribute', () => {
    const xml = '<math><mtext>close=2 &amp; x=3</mtext><mfenced close ></mfenced></math>';
    expect(new ErrorHandler().fixError(xml, 'attribute "close" missed value')).toBe(
      '<math><mtext>close=2 &amp; x=3</mtext><mfenced ></mfenced></math>',
    );
  });

  describe('repairMalformedMarkup', () => {
    it('strips an attribute with an equals sign but no value', () => {
      expect(new ErrorHandler().repairMalformedMarkup("<mfenced open='{' close= ></mfenced>")).toBe(
        "<mfenced open='{' ></mfenced>",
      );
    });

    it('strips value-less attributes without a parser message', () => {
      const repaired = new ErrorHandler().repairMalformedMarkup("<mfenced open='{' close ></mfenced>");
      expect(repaired).toBe("<mfenced open='{' ></mfenced>");
    });

    it('keeps a self-closing tag self-closing when its attribute has no value', () => {
      const xml = '<math><mi close=/><mi>x</mi></math>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe('<math><mi /><mi>x</mi></math>');
    });

    it('escapes a bare ampersand', () => {
      expect(new ErrorHandler().repairMalformedMarkup('<mi>&</mi>')).toBe('<mi>&amp;</mi>');
    });

    it('preserves attribute-like text while escaping a bare ampersand', () => {
      expect(new ErrorHandler().repairMalformedMarkup('<math><mtext>a x=2 & b</mtext></math>')).toBe(
        '<math><mtext>a x=2 &amp; b</mtext></math>',
      );
    });

    it('repairs tags without altering CDATA, comments or quoted attribute values', () => {
      const xml =
        '<math><!-- <mi close > --><mtext><![CDATA[a x=2 & b]]></mtext><mi title="a > x=2" close >x</mi></math>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(
        '<math><!-- <mi close > --><mtext><![CDATA[a x=2 & b]]></mtext><mi title="a > x=2" >x</mi></math>',
      );
    });

    it('keeps well-formed entity references', () => {
      const xml = '<mi>&amp;</mi><mi>&#38;</mi><mi>&#x26;</mi>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });

    it('returns well-formed markup unchanged', () => {
      const xml = '<mfenced open="{" close="}"><mi>x</mi></mfenced>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });
  });
});
