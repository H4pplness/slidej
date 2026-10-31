# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

SlideJ is a Node.js (CommonJS, Node 16+) CLI + library that generates PowerPoint `.pptx` from JSON and parses `.pptx` back to JSON. It writes OOXML strings by hand and zips them with JSZip; there is no PPTX library and no build step. `DESIGN.md` is the detailed architecture doc. Read it before touching the animation engine or the package structure.

## Commands

```bash
npm install
npm test                                   # layout tests + transition tests + example→generate→parse round trip
node test/layout.test.js                   # one test file (plain assert scripts, no framework, no per-case filter)
node test/transition.test.js

node src/cli.js generate deck.json -o out.pptx   # prints ⚠ warnings from layout/transitions
node src/cli.js parse out.pptx --no-images -o out.json
node src/cli.js schema                           # prints src/SCHEMA.md
node src/cli.js example -o example.json
DEBUG=1 node src/cli.js generate ...             # stack traces on error

node skills/slidej-template/scripts/check-template.js deck.json [--deck]   # static checks for templates/decks
```

There is no linter. `npm test` writes to `/tmp`. Generated `*.pptx`, `output.*` and `example.json` are gitignored.

## Architecture

**Generate pipeline** (`src/generators/index.js` → `generate(model, outputPath, { baseDir })`):
1. `applyLayout` (`src/layout/`) turns every `box` / `slide.layout` into absolutely positioned primitives. It returns the input untouched when no boxes are used, so legacy decks stay byte-identical.
2. Media is collected, then each package part is built by its own generator file (content types, rels, theme, master/layout, presentation, slides).
3. `generateSlide` expands high-level components (`components.js`: `kpiCard`, `barChart`, …) into `group`s, assigns shape ids (`_spId`), renders shapes, then the transition (`transition.js`), then the `<p:timing>` tree (`animation.js`).
4. The result is `{ path, size, slides, warnings }`. Warnings are messages from the layout engine and transitions (unknown style keys, overflow, missing fonts, bad transition names), and the CLI prints them.

**Parse** (`src/parsers/index.js`, one file) is approximate and forgiving. It always returns absolute elements: boxes, classes and components are not reconstructed.

**Layout engine** (`src/layout/`):
- Built on Yoga (`yoga-layout` v3). That package is ESM/WASM, so it is loaded lazily with dynamic `import()`. Units are inches, with pixel rounding disabled.
- `style.js` resolves `class` (from root `styles`) plus inline `style`, with aliases (`direction`, `grow`, `justify`…) and CSS-like inheritance of text props.
- `fonts.js` finds font files with fontkit and line-breaks text to measure it. It inflates widths by 3% and uses a line height of at least 1.2× so PowerPoint never needs more room than reserved.
- Deliberate deviations from CSS:
  - Default direction is `column`.
  - Children of a column get `flexShrink: 0` (emulating `min-height: auto`, which Yoga lacks); children of a row get 1.
  - An animated box is flattened into one `group`, and its children's animations are dropped. With `by: "item"` the box's children are emitted as separate shapes instead (`asSequence`).
- Text boxes get per-side `insets` (padding + border), which `generateTextShape` writes as `lIns/tIns/rIns/bIns`.

**Units:** JSON uses inches, points and degrees. All conversion lives in `src/utils/constants.js` and `xml-helpers.js` (EMU = inch × 914400, font size × 100, angles × 60000, line width × 12700).

## Invariants and gotchas

- **Animations:** every behavior node that animates a property must carry `<p:attrNameLst>` inside `<p:cBhvr>`, or PowerPoint silently ignores it. `animScale` uses 100000 = 100%, while `ppt_w`/`ppt_h` are fractions of the slide (scale with `#ppt_w*f`). Timing is click group > step > effect; `afterPrevious` only waits because it opens a new step with the running end time as its delay. See DESIGN.md §9.
- **Slide element order** must follow CT_Slide: `cSld`, `clrMapOvr`, `transition`, `timing`.
- **Newer transitions** (p14/p15/Morph, or any custom `duration`) must stay wrapped in `mc:AlternateContent` with a classic fallback.
- **Theme color references** (`accent1`…) are fine for element colors and fills. Slide `background` and table text `color` are written as `srgbClr`, so they must be hex.
- **Groups:** the generator does not support nested groups or animated group children. Animate the group itself, or use `by: "item"`, which emits the children as separate shapes whose effects ride on the first one via `_target`.
- **Verifying animations:** PowerPoint (COM) is the reference. Read `Slide.TimeLine.MainSequence` to see how it understood a deck, and `Presentation.CreateVideo` + ffmpeg frames to see it play.
- **`spcPct` (line spacing) is in thousandths of a percent:** `lineSpacing: 1.1` → `val="110000"`. Before 2.0 it was written as `11000` (11%), so decks made with older versions show overlapping lines.

## Keep in sync when changing behavior

- `src/SCHEMA.md` is the user-facing reference (`slidej schema`). Update it for any new field, style property, component or transition.
- `skills/slidej/SKILL.md` and `skills/slidej-template/` are the agent-facing docs shipped to users.
- `skills/slidej-template/scripts/check-template.js` is dependency-free and **hardcodes** the animation, trigger, component and element lists. Update it when adding any of those.
- New style property:
  - add it to the key lists in `layout/style.js`
  - apply it in `applyLayoutStyle` or `emit` (`layout/index.js`)
  - document it in SCHEMA.md and add a test
- New component: add a default height in `COMPONENT_HEIGHT` (`layout/index.js`) so it works in a flex flow.
- New transition: add an entry to `CATALOG` in `generators/transition.js`. The parser derives its reverse mapping from the same catalog.
- `README.md` and `README-vi.md` (Vietnamese) mirror each other.

## Repo conventions

- Git uses `core.autocrlf=true`; existing files are CRLF in the working copy. When editing via scripts, preserve line endings.
- There are no built-in templates. A "template" is a deck JSON with extra ignored keys (`name`, `guide`, per-slide `archetype`), authored by following `skills/slidej-template`.
