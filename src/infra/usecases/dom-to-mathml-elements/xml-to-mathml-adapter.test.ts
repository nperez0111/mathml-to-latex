import { XmlToMathMLAdapter, ElementsToMathMLAdapter, ErrorHandler } from '.';
import { XmldomDocumentParser } from '../../parsers/xmldom-document-parser';

import {
  singleMi,
  singleMiNoRoot,
  mrow,
  mfencedWithSeparatorAttribute,
  mfencedWithBrokenAttributeCase1,
  mfencedWithBrokenAttributeCase2,
  mfencedWithBrokenAttributeCase4,
  mfencedWithBrokenAttributeCase3,
  mfencedWithBrokenAttributeCase5,
} from '../../../__fixtures__/mathmlStrings';

describe('#convert', () => {
  const makeSut = (): XmlToMathMLAdapter => {
    const elementsToMathMLAdapter = new ElementsToMathMLAdapter();
    const errorHandler = new ErrorHandler();

    return new XmlToMathMLAdapter(new XmldomDocumentParser(), elementsToMathMLAdapter, errorHandler);
  };

  it('does not carry repaired markup into the next conversion', () => {
    const adapter = makeSut();

    expect(adapter.convert('<math><mfenced close= ><mi>a</mi></mfenced></math>')[0].children[0].children[0].value).toBe(
      'a',
    );
    expect(adapter.convert('<math><mi>b</mi></math>')[0].children[0].value).toBe('b');
  });

  it('repairs attributes and ampersands together despite a recognized native diagnostic', () => {
    const xml = '<math><mfenced close ><mi>x</mi></mfenced><mtext>a x=2 & b</mtext></math>';
    const parser = new XmldomDocumentParser();
    const parse = jest
      .fn((xml: string) => parser.parse(xml))
      .mockReturnValueOnce({ errors: ['Specification mandates value for attribute close'] });
    const adapter = new XmlToMathMLAdapter({ parse }, new ElementsToMathMLAdapter(), new ErrorHandler());

    expect(adapter.convert(xml)[0].children[1].value).toBe('a x=2 & b');
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse).toHaveBeenLastCalledWith('<math><mfenced ><mi>x</mi></mfenced><mtext>a x=2 &amp; b</mtext></math>');
  });

  it('does not retry again when repaired markup still fails', () => {
    const parse = jest.fn().mockReturnValue({ errors: ['not well-formed'] });
    const adapter = new XmlToMathMLAdapter({ parse }, new ElementsToMathMLAdapter(), new ErrorHandler());

    expect(adapter.convert('<math><mi close >&</math>')).toEqual([]);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('does not reparse failed markup when no repair changes it', () => {
    const parse = jest.fn().mockReturnValue({ errors: ['not well-formed'] });
    const adapter = new XmlToMathMLAdapter({ parse }, new ElementsToMathMLAdapter(), new ErrorHandler());

    expect(adapter.convert('<math><mi>x</math>')).toEqual([]);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('keeps usable xmldom documents without applying generic repairs', () => {
    const xml = '<math><mtext>a x=2 & b</mtext></math>';
    const errorHandler = new ErrorHandler();
    const repair = jest.spyOn(errorHandler, 'repairMalformedMarkup');
    const adapter = new XmlToMathMLAdapter(new XmldomDocumentParser(), new ElementsToMathMLAdapter(), errorHandler);

    expect(adapter.convert(xml)[0].children[0].value).toBe('a x=2 & b');
    expect(repair).not.toHaveBeenCalled();
  });

  describe('given math string with mi tag', () => {
    it('return array with single mathml interface of name math and child mi', () => {
      const mathmlString = singleMi;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [{ attributes: {}, children: [], name: 'mi', value: 'a' }],
      });
    });
  });

  describe('given math tag outside any other tag', () => {
    test('return array with single mathml interface of name math and child mi', () => {
      const mathmlString = singleMiNoRoot;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [{ attributes: {}, children: [], name: 'mi', value: 'b' }],
      });
    });
  });

  describe('given math string with nested tags', () => {
    test('return content in a three and keep value on each child', () => {
      const mathmlString = mrow;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mrow',
            value: '',
            attributes: {},
            children: [
              { attributes: {}, children: [], name: 'mn', value: '2' },
              { attributes: {}, children: [], name: 'mo', value: '+' },
              { attributes: {}, children: [], name: 'mn', value: '2' },
            ],
          },
        ],
      });
    });
  });

  describe("given math string with mfenced with three contents with separator attribute ';;;'", () => {
    test('add attributes to children related with name mfenced', () => {
      const mathmlString = mfencedWithSeparatorAttribute;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: { separators: ';;;' },
            children: [
              { attributes: {}, children: [], name: 'mn', value: '3' },
              { attributes: {}, children: [], name: 'mn', value: '2' },
              { attributes: {}, children: [], name: 'mn', value: '1' },
            ],
          },
        ],
      });
    });
  });

  describe('given math string with mfenced with single content, open attr settled as { and void close tag', () => {
    test('add attributes to children related with name mfenced', () => {
      const mathmlString = mfencedWithBrokenAttributeCase1;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '3', attributes: {}, children: [] }],
          },
        ],
      });
    });
  });

  describe('given math with two broken mfenced', () => {
    test('add attributes to children related with name mfenced', () => {
      const mathmlString = mfencedWithBrokenAttributeCase3;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '3', attributes: {}, children: [] }],
          },
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '5', attributes: {}, children: [] }],
          },
        ],
      });
    });
  });

  describe('given math with two broken arguments', () => {
    test('ignore broken args', () => {
      const mathmlString = mfencedWithBrokenAttributeCase5;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: {},
            children: [{ name: 'mn', value: '3', attributes: {}, children: [] }],
          },
        ],
      });
    });
  });

  describe('given math string with mfenced with single content, open attr settled as { and close attribute with = only', () => {
    test('add attributes to children related with name mfenced', () => {
      const mathmlString = mfencedWithBrokenAttributeCase2;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '3', attributes: {}, children: [] }],
          },
        ],
      });
    });
  });

  describe('given math with two broken mfenced', () => {
    test('add attributes to children related with name mfenced', () => {
      const mathmlString = mfencedWithBrokenAttributeCase4;

      const result = makeSut().convert(mathmlString);

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'math',
        value: '',
        attributes: {},
        children: [
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '3', attributes: {}, children: [] }],
          },
          {
            name: 'mfenced',
            value: '',
            attributes: { open: '{' },
            children: [{ name: 'mn', value: '5', attributes: {}, children: [] }],
          },
        ],
      });
    });
  });
});
