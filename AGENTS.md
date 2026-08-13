# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this project is

`mathml-to-latex` is a small, dependency-light TypeScript library that converts a
[MathML](https://en.wikipedia.org/wiki/MathML) string into a
[LaTeX](https://en.wikipedia.org/wiki/LaTeX) string. It is published to npm and
bundled with Rollup.

The entire public API is a single static method:

```ts
import { MathMLToLaTeX } from 'mathml-to-latex';

MathMLToLaTeX.convert('<math><mrow><mn>a</mn><mo>+</mo><mn>b</mn></mrow></math>');
// => 'a + b'
```

There are two entry points exposing that same API:

- `src/index.ts` — Node.js; parses with `@xmldom/xmldom`.
- `src/browser.ts` — browsers; parses with the platform `DOMParser` and pulls in
  no dependencies. Selected automatically via the `browser` condition of the
  `exports` map, or explicitly through `mathml-to-latex/browser`.

Both export **only** `MathMLToLaTeX`, and both must produce identical output.
Everything else is internal — do not widen the public surface without a
deliberate reason.

## Toolchain & commands

- **Node:** `24.16.0`, pinned in `.tool-versions` (managed via `mise`/`asdf`).
  Run commands through `mise exec node@24.16.0 -- <cmd>` if your shell default
  differs.
- **Install:** `npm ci`
- **Test:** `npm test` (Jest + ts-jest; runs against `src`, no build needed)
- **Test (watch / verbose):** `npm run test:watch`, `npm run test:verbose`
- **Build:** `npm run build` (Rollup → `dist/index.{mjs,cjs,d.ts}` for Node,
  `dist/browser.{mjs,cjs,d.ts}` for browsers, and the UMD `dist/bundle.min.js`,
  which is built from the browser entry point)
- **Lint:** `npm run lint` (eslint + prettier, autofix)
- **CI:** `.github/workflows/test.yml` runs the Dockerized test suite
  (`make test-build && make test`) on every PR. Publishing
  (`.github/workflows/publish.yml`) only happens on a GitHub **Release** — pushes
  and merges never publish.

## Architecture

The code follows a layered (clean-architecture-ish) layout. Dependencies point
inward: `main` → `data`/`infra` → `domain`.

```
src/
  index.ts                     Public barrel, Node.js (exports MathMLToLaTeX only)
  browser.ts                   Public barrel, browsers (same API, no dependencies)
  main/                        Composition root
    mathml-to-latex.ts         MathMLToLaTeX.convert — Node.js entry (xmldom parser)
    browser/mathml-to-latex.ts MathMLToLaTeX.convert — browser entry (native parser)
    mathml-to-latex-converter.ts  Shared pipeline, parameterized by the parser
    factories/                 Wiring (makeToMathElementsConverter)
  domain/
    usecases/to-latex-converter.ts   ToLaTeXConverter interface (the core contract)
  data/
    protocols/                 MathMLElement (internal tree node), XmlDocumentParser, UTF8
    usecases/mathml-to-latex-convertion/
      mathml-element-to-latex-converter-adapter.ts  Tag name → converter registry
      tree-to-latex.ts         Iterative post-order driver (tree → LaTeX)
      converters/              One converter per MathML tag (mfrac, msup, mrow, …)
    helpers/                   Wrappers, separators, whitespace, the memo helper
    errors/                    Domain errors (InvalidNumberOfChildrenError)
  infra/
    parsers/                   XmlDocumentParser implementations (the only
                               environment-specific code in the repo)
      xmldom-document-parser.ts   The one and only file importing @xmldom/xmldom
      native-document-parser.ts   Platform DOMParser, reads <parsererror>
    usecases/dom-to-mathml-elements/   DOM → MathMLElement, parser-agnostic
  syntax/                      Static lookup tables: unicode/glyph → LaTeX command
```

**Keeping the browser build dependency-free** rests on one rule: nothing reachable
from `src/browser.ts` may import `src/infra/parsers/xmldom-document-parser.ts`.
That is why `src/infra/parsers/` deliberately has **no barrel `index.ts`** — a
barrel would re-export the xmldom parser and drag the dependency into the browser
graph. Import the two parsers by their full paths.

## The conversion pipeline

`MathMLToLaTeX.convert(mathml)` runs two stages:

1. **Parse → element tree** (`infra`): `XmlToMathMLAdapter` cleans MS Word
   artefacts (line breaks, `mml:` prefixes), delegates parsing to an injected
   `XmlDocumentParser` and recovers from malformed markup via `ErrorHandler`.
   `ElementsToMathMLAdapter` then maps the DOM into the internal
   `MathMLElement` tree.
2. **Tree → LaTeX** (`data`): for each top-level `<math>` element,
   `convertTreeToLatex` walks the tree and produces LaTeX, dispatching each node
   to its converter via `MathMLElementToLatexConverterAdapter`. Results are joined
   and trimmed.

`MathMLElement` is parser-agnostic on purpose: the conversion logic never touches
DOM nodes, only this internal tree.

## Design decisions worth knowing

- **Everything is iterative, not recursive.** Both the DOM→tree build
  (`ElementsToMathMLAdapter`) and the tree→LaTeX evaluation (`tree-to-latex`) use
  explicit stacks so pathologically deep input cannot overflow the call stack
  (a DoS vector). `tree-to-latex` evaluates **post-order** and memoizes each
  node's LaTeX; the `mathMLElementToLaTeXConverter` helper returns a child's
  precomputed string while a memo is active, so the ~25 converters can stay
  written in their natural "combine my children's strings" style without ever
  recursing deeply. If you add a converter, this just works — keep combining
  children via the helper.
- **`mtable` inner-table flag is a pre-pass.** Nested `<mtable>`s must be wrapped
  in a `matrix` environment. Because evaluation is bottom-up but that flag is a
  top-down property, `tree-to-latex` sets the `innerTable` flag in a separate
  iterative top-down pass before evaluation. Don't move it back into a converter
  constructor.
- **The parser is a port.** `XmlDocumentParser` (`data/protocols`) is the seam
  between the two environments: `parse(xml)` returns `{ document?, errors }` and
  never throws. `XmldomDocumentParser` collects xmldom's `onError` messages and
  catches its `ParseError`; `NativeDocumentParser` looks for a `<parsererror>`
  element in the returned document and reports its text. Everything above that
  seam — the whole conversion pipeline — is shared, which is what keeps the two
  entry points in sync.
- **Malformed-markup recovery.** `ErrorHandler` repairs the value-less attributes
  MS Word emits (e.g. `close= >`). Parse error messages are engine-specific, so it
  matches xmldom's (`attribute "x" missed value`) *and* libxml2's, which Chrome
  and Safari use (`Specification mandates value for attribute x`, and `AttValue:`
  with the quotes in either order). Firefox and jsdom report messages that name
  nothing useful, so when no message is recognised **and** the parse produced no
  document, `XmlToMathMLAdapter` falls back to `repairMalformedMarkup` (strip
  value-less attributes, escape bare `&`) and re-parses once. If that still fails
  the result is `''`, exactly as before. Never let a repair path run when the
  parse succeeded — that is what keeps the Node behaviour bit-for-bit unchanged.

## Adding a new MathML element converter

1. Create `src/data/usecases/mathml-to-latex-convertion/converters/<tag>.ts` with
   a class implementing `ToLaTeXConverter` (`convert(): string`). Combine child
   LaTeX via `mathMLElementToLaTeXConverter(child).convert()`.
2. Export it from `converters/index.ts`.
3. Register the tag in the `fromMathMLElementToLatexConverter` map in
   `mathml-element-to-latex-converter-adapter.ts`.
4. Add cases to the co-located test files (see below).
5. Throw `InvalidNumberOfChildrenError` for arity violations, matching the
   existing converters (`mfrac`, `msup`, …).

## Tests

- Co-located with the code they cover (`src/**/*.test.ts`); run with `npm test`
  (Jest, ts-jest, `--runInBand`).
- `src/index.test.ts` is the main integration suite (MathML string → LaTeX).
- `src/robustness.test.ts` covers parser hardening (deep nesting, injection
  non-leakage).
- `src/browser.test.ts` covers the browser entry point and, most importantly,
  asserts **parity**: every string fixture in `src/__fixtures__/mathmlStrings.ts`
  must convert identically through both entry points. Add fixtures there and both
  suites pick them up automatically.
- The default `testEnvironment` is `node`. Specs that need a DOM opt in per file
  with a `/** @jest-environment jsdom */` docblock. jsdom is *not* the browser
  engines: it exercises the fallback repair path rather than the libxml2 messages
  Chrome/Safari produce, so treat green jsdom runs as necessary, not sufficient.
- Tests import from `src` directly — no build step required to run them.

## Conventions

- **All code and comments in English**, even in non-English conversations.
- **Object-oriented by default.** Any unit with real logic is a class, not a bag
  of exported functions. Converters implement `ToLaTeXConverter`; helpers and
  value objects are classes (`GenericWrapper`, `JoinWithManySeparators`,
  `LineThickness`); a converter that needs collaborators keeps them as classes in
  the same file (`MO` → `Operator`, `MFenced` → `Vector`/`Matrix`/`Separators`,
  `FenceNormalizer` → `FencePairing`). A file is named after the kebab-case of the
  class it exports (`line-thickness.ts` → `LineThickness`). The only free
  functions are the two tree pre-passes in `tree-to-latex.ts`
  (`convertTreeToLatex`, `annotateInnerTables`) — treat them as the exception, not
  the template; new tree passes should be classes invoked as
  `new Thing(root).run()`.
- **File layout:** exported/public code first, then private and non-exported
  code; private methods go below public ones, and type/interface definitions go
  at the bottom of the file.
- **Prefer early returns** over deep `if` nesting.
- **Commits:** semantic style — `type(scope): short message` in English
  (`feat`, `fix`, `refactor`, `test`, `chore`, `docs`). Keep messages short.
- **Never `git add -A`/`git add .`** — stage specific files.
- **Do not commit or push unless explicitly asked**; each commit/push needs its
  own explicit go-ahead.
- Don't add runtime dependencies lightly — the Node build ships with only
  `@xmldom/xmldom`, and the browser build ships with none. Keep it that way.
