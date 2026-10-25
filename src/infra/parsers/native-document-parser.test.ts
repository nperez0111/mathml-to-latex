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

  it.each(['', 'http://www.w3.org/1999/xhtml', 'http://www.mozilla.org/newlayout/xml/parsererror.xml'])(
    'accepts a legitimate parsererror annotation in namespace %s',
    (namespace) => {
      const xml = `<math><semantics><mi>x</mi><annotation-xml><parsererror xmlns="${namespace}">note</parsererror></annotation-xml></semantics></math>`;
      const { document, errors } = new NativeDocumentParser().parse(xml);
      expect(errors).toEqual([]);
      expect(document?.documentElement.localName).toBe('math');
    },
  );

  it.each([
    '<parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml">broken XML</parsererror>',
    '<p:parsererror xmlns:p="http://www.mozilla.org/newlayout/xml/parsererror.xml">broken XML</p:parsererror>',
    '<parsererror xmlns="http://www.w3.org/1999/xhtml">broken XML</parsererror>',
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><parsererror>broken XML</parsererror></body></html>',
    '<math><parsererror xmlns="http://www.w3.org/1999/xhtml">broken XML</parsererror><mi/></math>',
  ])('recognizes a simulated engine error-document layout: %s', (xml) => {
    // jsdom verifies Firefox-style diagnostics directly above; other layouts are simulated.
    const errorDocument = new DOMParser().parseFromString(xml, 'text/xml');
    const parse = jest.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValue(errorDocument);
    try {
      expect(new NativeDocumentParser().parse('<math><mi>')).toEqual({ errors: ['broken XML'] });
    } finally {
      parse.mockRestore();
    }
  });

  it('does not require DOMParser until parsing is attempted', () => {
    const { DOMParser } = globalThis;
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

    try {
      expect(() => new NativeDocumentParser()).not.toThrow();
    } finally {
      globalThis.DOMParser = DOMParser;
    }
  });
});
