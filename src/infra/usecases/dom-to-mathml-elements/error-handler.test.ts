import { ErrorHandler } from './error-handler';

describe('ErrorHandler', () => {
  it('leaves the XML untouched and records nothing for an unrelated error', () => {
    const handler = new ErrorHandler();
    expect(handler.fixError('<math></math>', 'some unrelated parse error')).toBe('<math></math>');
    expect(handler.isThereAnyErrors()).toBe(false);
  });

  it('strips a value-less attribute reported as a missed-value warning', () => {
    const handler = new ErrorHandler();
    const fixed = handler.fixError(
      "<mfenced open='{' close ></mfenced>",
      'attribute "close" missed value!! "close" instead!!',
    );
    expect(handler.isThereAnyErrors()).toBe(true);
    expect(fixed).not.toContain('close');
  });

  it('recovers from the AttValue fatalError of an `attr=` with no value', () => {
    const handler = new ErrorHandler();
    const fixed = handler.fixError("<mfenced open='{' close= ></mfenced>", 'AttValue: \' or " expected');
    expect(handler.isThereAnyErrors()).toBe(true);
    expect(fixed).not.toContain('close=');
  });

  it('strips the attribute named by the libxml2 error of an attribute with no `=`', () => {
    const handler = new ErrorHandler();
    const fixed = handler.fixError(
      "<mfenced open='{' close ></mfenced>",
      'Specification mandates value for attribute close',
    );
    expect(handler.isThereAnyErrors()).toBe(true);
    expect(fixed).not.toContain('close');
  });

  it('recovers from the AttValue fatalError however the parser orders the quotes', () => {
    const handler = new ErrorHandler();
    const fixed = handler.fixError("<mfenced open='{' close= ></mfenced>", 'AttValue: " or \' expected');
    expect(handler.isThereAnyErrors()).toBe(true);
    expect(fixed).not.toContain('close=');
  });

  describe('repairMalformedMarkup', () => {
    it('strips value-less attributes without a parser message', () => {
      const repaired = new ErrorHandler().repairMalformedMarkup("<mfenced open='{' close ></mfenced>");
      expect(repaired).toBe("<mfenced open='{' ></mfenced>");
    });

    it('escapes a bare ampersand', () => {
      expect(new ErrorHandler().repairMalformedMarkup('<mi>&</mi>')).toBe('<mi>&amp;</mi>');
    });

    it('keeps well-formed entity references', () => {
      const xml = '<mi>&amp;</mi><mi>&#38;</mi><mi>&#x26;</mi>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });

    it('returns well-formed markup unchanged', () => {
      const xml = '<mfenced open="{" close="}"><mi>x</mi></mfenced>';
      expect(new ErrorHandler().repairMalformedMarkup(xml)).toBe(xml);
    });

    it('records no errors', () => {
      const handler = new ErrorHandler();
      handler.repairMalformedMarkup('<mfenced close ></mfenced>');
      expect(handler.isThereAnyErrors()).toBe(false);
    });
  });

  it('clears recorded errors', () => {
    const handler = new ErrorHandler();
    handler.fixError('<x close ></x>', 'attribute "close" missed value');
    handler.cleanErrors();
    expect(handler.isThereAnyErrors()).toBe(false);
  });
});
