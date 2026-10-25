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
      const xml = '<mi>&amp; &é; &a:b; &名; &a·b; &𐀀; &#38; &#x26;</mi>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });

    it.each(['data-é', 'é', '名', 'a·b', 'a\u0300', 'a\u203f', '𐀀', '\u{EFFFF}'])(
      'preserves the complete XML name %s',
      (name) => {
        const xml = `<math><mfenced ${name}="a" close= ><mi>x</mi></mfenced></math>`;
        expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml.replace('close= ', ''));
        expect(new ErrorHandler().fixError(xml.replace('close= ', 'close '), 'attribute "close" missed value')).toBe(
          xml.replace(' close= ', ' '),
        );
      },
    );

    it.each(['a\u00d7', 'a\u037e', 'a\u{F0000}', 'a\uD800'])(
      'does not delete a name prefix before invalid XML character in %s',
      (name) => {
        const xml = `<mi ${name}="a" close= >x</mi>`;
        expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
      },
    );

    it('protects processing instructions and the entire DOCTYPE internal subset', () => {
      const protectedXml =
        '<!DOCTYPE math [<!-- ]> & <mi close > --><?pi ]> &?><!ENTITY é "<mi close > &amp;">]><?pi & <mi close >?>';
      const xml = `${protectedXml}<math><mi close= >&é; &</mi></math>`;
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(`${protectedXml}<math><mi >&é; &amp;</mi></math>`);
    });

    it.each(['<!--', '<![CDATA[', '<?pi ', '<!DOCTYPE math [', '<mi title="', "<mi title='"])(
      'leaves an unterminated %s suffix untouched',
      (open) => {
        const suffix = `${open}<mi close= > & x=2 >`;
        expect(new ErrorHandler().repairMalformedMarkup(`<mi close= >x</mi>${suffix}`)).toBe(`<mi >x</mi>${suffix}`);
      },
    );

    it('bounds character visits linearly for repeated incomplete start tags', () => {
      const visits: number[] = [];
      for (const size of [1024, 2048]) {
        const xml = '<math>' + '<a '.repeat(size);
        const charAt = jest.spyOn(String.prototype, 'charAt');
        try {
          expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
          visits.push(charAt.mock.calls.length);
          // Count scanner work, not elapsed time or machine-dependent thresholds.
          expect(charAt.mock.calls.length).toBeGreaterThanOrEqual(xml.length - 1);
          expect(charAt.mock.calls.length).toBeLessThan(2 * xml.length);
        } finally {
          charAt.mockRestore();
        }
      }
      expect(visits[1]).toBeLessThanOrEqual(2 * visits[0]);
    });

    it('bounds character visits when one tag contains many quoted attributes', () => {
      const xml = `<mi ${'a="x > &amp;" '.repeat(2048)}close= >x</mi>`;
      const charAt = jest.spyOn(String.prototype, 'charAt');
      try {
        expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml.replace('close= ', ''));
        expect(charAt.mock.calls.length).toBeGreaterThan(xml.length);
        expect(charAt.mock.calls.length).toBeLessThan(3 * xml.length);
      } finally {
        charAt.mockRestore();
      }
    });

    it.each(['<!--', '<![CDATA[', '<?pi ', '<!DOCTYPE math [', '<mi title="'])(
      'does not repeatedly search an unterminated %s suffix',
      (open) => {
        const xml = open + '<mi close= > & '.repeat(2048);
        const indexOf = jest.spyOn(String.prototype, 'indexOf');
        try {
          expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
          expect(indexOf.mock.calls.length).toBeLessThanOrEqual(3);
        } finally {
          indexOf.mockRestore();
        }
      },
    );

    it('returns well-formed markup unchanged', () => {
      const xml = '<mfenced open="{" close="}"><mi>x</mi></mfenced>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });
  });
});
