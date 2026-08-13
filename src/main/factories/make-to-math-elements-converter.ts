import { XmlToMathMLAdapter, ElementsToMathMLAdapter, ErrorHandler } from '../../infra/usecases/dom-to-mathml-elements';
import { XmlDocumentParser } from '../../data/protocols/xml-document-parser';

/**
 * Wires up and returns the parser that turns a MathML string into element
 * trees, with its element mapper and error handler.
 *
 * @param documentParser - the XML parser to run on, which is what differs
 * between the Node and the browser entry points.
 * @returns a ready-to-use {@link XmlToMathMLAdapter}.
 */
export const makeToMathElementsConverter = (documentParser: XmlDocumentParser): XmlToMathMLAdapter => {
  const elementsToMathMLAdapter = new ElementsToMathMLAdapter();
  const errorHandler = new ErrorHandler();

  return new XmlToMathMLAdapter(documentParser, elementsToMathMLAdapter, errorHandler);
};
