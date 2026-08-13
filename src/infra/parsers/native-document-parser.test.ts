/**
 * @jest-environment jsdom
 */
import { NativeDocumentParser } from './native-document-parser';

describe('NativeDocumentParser', () => {
  it('parses well-formed XML', () => {
    const { document, errors } = new NativeDocumentParser().parse('<math><mi>a</mi></math>');

    expect(errors).toHaveLength(0);
    expect(document?.getElementsByTagName('mi')[0]?.textContent).toBe('a');
  });

  it('reports the parser error of malformed XML', () => {
    const { document, errors } = new NativeDocumentParser().parse('<math><mi>a</mi>');

    expect(document).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]).not.toHaveLength(0);
  });

  it('does not report the parsererror element as a parsed document', () => {
    const { document } = new NativeDocumentParser().parse("<math><mfenced open='{' close= ></mfenced></math>");

    expect(document).toBeUndefined();
  });

  it('throws a helpful error when no DOMParser is available', () => {
    const { DOMParser } = globalThis;
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

    try {
      expect(() => new NativeDocumentParser().parse('<math><mi>a</mi></math>')).toThrow(/requires a global DOMParser/);
    } finally {
      globalThis.DOMParser = DOMParser;
    }
  });

  it('resolves the DOMParser lazily, so importing it outside a browser is safe', () => {
    const { DOMParser } = globalThis;
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

    try {
      expect(() => new NativeDocumentParser()).not.toThrow();
    } finally {
      globalThis.DOMParser = DOMParser;
    }
  });
});
