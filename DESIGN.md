# SlideJ — Design & Architecture

A guide for agents (and humans) working on this codebase. Read this first, then
`src/SCHEMA.md` for the exact JSON field reference.

---

## 1. What SlideJ is

SlideJ is a **zero-runtime-dependency PowerPoint engine**: it converts a plain
JSON description of a deck into a real `.pptx` file, and parses a `.pptx` back
into the same JSON shape. There is **no external rendering library** — SlideJ
writes the raw OOXML (Office Open XML) parts by hand and zips them into the
`.pptx` container with JSZip.

Two directions, designed to round-trip:

```
 JSON  ──(generate)──▶  PPTX        src/generators/*
 PPTX  ──(parse)─────▶  JSON        src/parsers/index.js
```

The whole value proposition is: **an agent can author/edit a deck as JSON**
(including animations) without touching XML.

---

## 2. CLI surface (`src/cli.js`)

`slidej` is a [commander](https://www.npmjs.com/package/commander) program. Commands:

| Command | What it does |
|---|---|
| `generate <input.json> -o out.pptx` (alias `gen`) | JSON → PPTX. Resolves relative image paths against the JSON file's dir. |
| `parse <input.pptx> -o out.json` | PPTX → JSON. `--no-images` strips base64 blobs; prints to stdout if `-o` omitted (pipe-friendly). |
| `schema` | Prints `src/SCHEMA.md`. |
| `example -o example.json` | Writes a built-in demo deck (see `generateExample()` in cli.js). |
| `template list / use / save / remove / info` (alias `tpl`) | Manage reusable deck templates. |

`src/index.js` is the **library entry** (`package.json` `main`): it re-exports
`generate`, `parse`, `listTemplates`, `getTemplate`.

---

## 3. Repository layout

```
src/
  cli.js                  CLI entry (commander). Argument parsing, template subcommands, the `example` deck.
  index.js                Library entry. Re-exports generate/parse + template helpers.
  SCHEMA.md               Authoritative JSON field reference. Keep in sync with generators/parsers.

  generators/             JSON → OOXML.  Each file emits one kind of package part as a string.
    index.js              Orchestrator: builds the JSZip package, assigns ids, wires every part together.
    slide.js              The big one. Renders one slide's <p:spTree>: text, shape, image, table, group + bg/transition.
    animation.js          Builds the <p:timing> block (the entire animation engine).
    components.js         Expands high-level components (progressBar, barChart, …) into primitive group elements.
    theme.js              theme1.xml (color scheme + fonts).
    slide-master.js       slideMaster1.xml + slideLayout1.xml.
    presentation.js       presentation.xml, presProps, viewProps, tableStyles, core/app docProps.
    rels.js               All the .rels relationship files (root, presentation, per-slide, master, layout).
    content-types.js      [Content_Types].xml.

  parsers/
    index.js              PPTX → JSON. Unzips, walks each part, rebuilds the model (incl. animation reverse-mapping).

  utils/
    constants.js          EMU conversions, namespaces, ANIMATION_PRESETS, FLY_DIRECTIONS, SHAPE_TYPES, TRANSITIONS.
    xml-helpers.js        Small XML string builders: escXml, fillXml, lineXml, xfrmXml, avLstXml, run/paraPropsXml.

templates/                Built-in deck templates (*.json). Loaded by cli.js + index.js.
skills/SKILL.md           Agent skill description for driving slidej.
```

Custom templates live in `~/.slidej/templates/` (see `getCustomTemplateDir()`),
and override built-ins of the same name.

---

## 4. The JSON model (input/output shape)

`src/SCHEMA.md` is the source of truth; this is the mental model:

```jsonc
{
  "width": 13.333, "height": 7.5,          // slide size in INCHES (16:9 default)
  "meta":  { "title": "...", "author": "..." },
  "theme": { "colors": { "accent1": "4472C4", ... }, "majorFont": "...", "minorFont": "..." },
  "slides": [
    {
      "background": "1a1a2e" | { "type": "gradient", "stops": [...], "angle": 90 },
      "transition": "fade" | { "type": "push", "speed": "med" },
      "elements": [
        { "type": "text",  "text": "...", "position": {x,y,w,h}, "fontSize":..., "color":..., "animations":[...] },
        { "type": "shape", "shapeType": "ellipse", "fill": ..., "line": ..., "adjust": {...}, "rotation": 30 },
        { "type": "image", "src": "logo.png", "crop": {...} },
        { "type": "table", "rows": [[...]], "headerRow": true },
        { "type": "group", "rotation": 0, "children": [ ...elements... ], "animations":[...] },
        { "type": "progressBar" | "barChart" | ... }   // high-level components, see §8
      ]
    }
  ]
}
```

Key conventions baked into the model:
- **All positions/sizes are in inches.** Conversion to EMU happens at the XML boundary only.
- **Colors are bare hex** (`"4472C4"`) or **theme refs** (`accent1`, `dk1`, `lt1`, …). A leading `#` is stripped.
- `text` may be a string, an array of strings, or an array of `{ runs: [...] }` / `{ text, ...style }` paragraphs.
- `"\n"` inside any text becomes a soft line break (`<a:br/>`) — see §7 `textRunsXml`.

---

## 5. Generate pipeline (`generators/index.js`)

`generate(model, outputPath)` is the orchestrator. Order matters:

1. **Collect media** — walk every element (and group child); for each `image`,
   assign `_mediaFileName` (`image1.png`, …) and queue the file for the zip.
2. **Assign `_internalId`** to every element (`el_<slide>_<index>`), used to key the rIdMap.
3. **Write the fixed package parts** into the JSZip: `[Content_Types].xml`,
   `_rels/.rels`, `docProps/*`, `presentation.xml` (+ rels), presProps/viewProps/tableStyles,
   `theme1.xml`, `slideMaster1.xml`, `slideLayout1.xml`.
4. **Per slide:** `generateSlideRels(slideData)` → `{ xml, rIdMap }`, then
   `generateSlide(slideData, rIdMap, slideSize)`. Write `slideN.xml` + its `.rels`.
5. **Load media bytes** (from file path or `data:` URI) into `ppt/media/`.
6. **Zip** (DEFLATE level 6) and write to disk. Returns `{ path, size, slides }`.

### PPTX package anatomy (what's inside the zip)

```
[Content_Types].xml
_rels/.rels
docProps/core.xml, app.xml
ppt/
  presentation.xml            (+ _rels/presentation.xml.rels)
  presProps.xml, viewProps.xml, tableStyles.xml
  theme/theme1.xml
  slideMasters/slideMaster1.xml      (+ _rels)
  slideLayouts/slideLayout1.xml      (+ _rels)
  slides/slideN.xml                  (+ _rels/slideN.xml.rels)
  media/imageN.*
```

There is exactly **one master and one layout** — SlideJ does not use placeholders;
every element is positioned absolutely on the slide.

### Two id systems — don't confuse them

| Id | Where | Purpose |
|---|---|---|
| **spId** (`el._spId`) | assigned in `generateSlide` via a per-slide counter starting at 1 | the `<p:cNvPr id>` shape id. Animations target shapes **by spId**. The root group tree uses id `1`, so real shapes start at 2. |
| **rId** (`rIdMap`) | assigned in `generateSlideRels` | relationship ids for images/hyperlinks, referenced as `r:embed`/`r:id`. |

`generateSlide` owns a `getNextSpId()` counter and threads it into `generateGroup`
so **group children get globally-unique spIds** (needed for animation targeting).

---

## 6. Slide rendering (`generators/slide.js`)

`generateSlide(slideData, rIdMap, slideSize)`:

1. `expandComponents(elements)` — turn any high-level component into a `group` (§8).
2. Assign `_spId` to each top-level element.
3. Emit the `<p:spTree>`: a fixed root `nvGrpSpPr`/`grpSpPr`, then one node per element via a `switch(el.type)`:
   - `text` → `generateTextShape` (a `<p:sp>` with `txBox="1"`).
   - `shape` → `generateAutoShape` (`<p:sp>` with `<a:prstGeom>`; supports `adjust` via `avLstXml`, `noFill`, gradient/solid fill, line, shadow, inner text).
   - `image` → `generatePicture` (`<p:pic>` with `r:embed`, optional `crop`).
   - `table` → `generateTable` (`<p:graphicFrame>` + `<a:tbl>`).
   - `group` → `generateGroup` (`<p:grpSp>`; supports base `rotation` on `<a:xfrm rot=...>`).
4. Background (`generateBackground`), animations (`generateTiming`, §9), transition (`generateTransition`).

Shared text helper: **`textRunsXml(text, rPr)`** splits on `"\n"` and inserts
`<a:br>{rPr}</a:br>` between lines (the break carries run props so line height
matches the font). This is the fix for multi-line text overlapping — every text
path (paragraphs *and* table cells) routes through it.

---

## 7. XML helpers & unit conventions (`utils/`)

`utils/constants.js` holds the conversion primitives and lookup tables.
`utils/xml-helpers.js` holds the string builders. **All unit math is centralized
here** — the rest of the code thinks in inches/points/degrees.

| Quantity | JSON unit | OOXML unit | Conversion |
|---|---|---|---|
| Position / size | inches | EMU | `inchToEmu` = `× 914400` |
| Font size | points | hundredths of a point | `ptToHundredths` = `× 100` |
| Rotation / gradient angle | degrees | 60000ths of a degree | `× 60000` (360° = 21600000) |
| Line width | points | EMU | `× 12700` |
| Gradient stop position | 0–100 | 1000ths | `× 1000` |
| Color | bare hex / theme ref | `<a:srgbClr>` / `<a:schemeClr>` | `colorXml()` |

`avLstXml(adjust)` emits shape adjust handles (`<a:gd name fmla="val N">`) — this
is how `donut`/`blockArc`/`roundRect` get their geometry tweaked (used heavily by components).

> ⚠️ Known bug in `paraPropsXml`: `lineSpacing` is multiplied by 100 then suffixed
> with `"00"`, producing `13000` (=13%) for `1.3` instead of `130000` (=130%). Avoid
> `lineSpacing` until this is fixed, or fix it to `Math.round(lineSpacing * 100000)`.

---

## 8. Components (`generators/components.js`)

High-level, "self-drawing" elements that expand into primitives **before** spId
assignment. `COMPONENT_TYPES = [progressBar, progressRing, barChart, kpiCard,
ratingStars, timeline, processFlow]`.

`expandComponents(elements)` maps each component to `buildComponent`, which
returns a single **`group`** element whose `children` are absolute-positioned
`shape`/`text` primitives. The component's `position`, `name`, and `animations`
are carried onto the group, so **the whole component animates as one unit**.

To add a component: add the name to `COMPONENT_TYPES`, write a `buildXxx(el, pos)`
that returns an array of primitive elements (use the `shape()`/`text()` helpers and
absolute inch coords), and wire it into the `switch` in `buildComponent`.

---

## 9. Animation engine (`generators/animation.js`)

The single most subtle part. `generateTiming(animatedElements, slideSize)` builds
one `<p:timing>` tree per slide.

### Trigger → click-group model

Each animation has a `trigger`: `onClick` | `withPrevious` | `afterPrevious`.
Animations are sorted by `order`, then grouped into **click groups**:
- `onClick` starts a **new** group (requires a click to advance).
- `withPrevious` / `afterPrevious` join the **current** group.

Mapped to `nodeType`: `clickEffect` / `withEffect` / `afterEffect`. The **first
`afterPrevious` effect auto-plays on slide entry** and (with `fill="hold"`) holds
its end state — this is how "spin once when the slide appears, then stop" works.

### Behavior-node catalog

`generateBehavior` dispatches by `anim.type` to a specific OOXML behavior node:

| Animation | Node(s) emitted | Notes |
|---|---|---|
| `appear` | `<p:set>` visibility | |
| `fadeIn/Out`, `wipeIn/Out`, `dissolveIn/Out`, `splitIn` | `<p:animEffect filter=...>` | filter-based; entrance also pre-sets visibility |
| `flyIn/Out` | `<p:anim>` on `ppt_x`/`ppt_y` | direction → from/to expressions |
| `floatIn/Out` | fade + `<p:anim>` `ppt_y` drift | |
| `swivel` | fade + scale keyframes (`ppt_w`/`ppt_h`) | fakes horizontal unfold |
| `zoomIn/Out` | `<p:animScale>` `from`/`to` | entrance 0→100%, exit 100→0% |
| `pulse`, `growShrink` | `<p:animScale>` `from`/`to` + `autoRev="1"` | 100% → scale% → 100% |
| `bounceIn` | scale keyframes with overshoot | |
| `spin` | `<p:animRot by=...>` | emphasis rotation |
| `teeter` | `<p:anim>` `r` keyframes | rocking |
| `colorChange` | `<p:animClr>` `fillColor` | |
| `transparency` | `<p:anim>` `style.opacity` | |
| `blink` | two `<p:set>` visibility toggles | |
| `motionPath` | `<p:animMotion path=...>` | relative path, coords as fraction of slide size |

### ★ THE CRITICAL INVARIANT ★

> **Any behavior node that animates a property MUST carry a
> `<p:attrNameLst><p:attrName>…</p:attrName></p:attrNameLst>` inside its
> `<p:cBhvr>`.** If it's missing, PowerPoint silently treats the effect as a
> **no-op** — the deck opens fine, no error, the element just doesn't move.

This is exactly the class of bug that made `spin` do nothing (the `<p:animRot>`
was missing `<p:attrName>r</p:attrName>`). The required attr name per node:

| Node | required attrName(s) | unit of the animated value |
|---|---|---|
| `<p:animRot>` | `r` | degrees × 60000 |
| `<p:anim>` ppt_x/ppt_y | `ppt_x` / `ppt_y` | fraction of slide (1.0 = full slide), or `#ppt_x` self-ref expressions |
| `<p:anim>` ppt_w/ppt_h | `ppt_w` / `ppt_h` | **scale factor where `1.0` = 100%** (NOT percent) |
| `<p:anim>` opacity | `style.opacity` | 100000 = 100% |
| `<p:animClr>` | `fillColor` | `<a:srgbClr>` |
| `<p:animMotion>` | `ppt_x` `ppt_y` | path coords as fraction of slide |
| `<p:set>` | `style.visibility` | `visible`/`hidden` |
| `<p:animScale>` | *(none — uses `<p:from>/<p:to>/<p:by>` with x,y where 100000 = 100%)* | |

> Note the two different scale conventions: **`animScale`** uses `100000 = 100%`,
> but the **`ppt_w`/`ppt_h` fltVal in `<p:anim>`** uses `1.0 = 100%`. Mixing
> these up produces shapes that balloon to 100× or do nothing.

### Regression-testing animations

`examples/anim-audit.json` (a one-slide deck exercising every animation type) is
the regression harness. After changing the engine: generate it, unzip
`ppt/slides/slide1.xml`, and confirm every property-animating node still carries
its `attrNameLst` and sane values. (This is how the `zoomOut` no-op and the 100×
scale bugs were caught.)

---

## 10. Parse pipeline (`parsers/index.js`)

`parse(inputPath)` reverses generation, best-effort:

1. Unzip; parse `presentation.xml` for size + slide order (via `sldIdLst` → rels).
2. Parse `theme1.xml`, `docProps/core.xml` for theme + meta.
3. Per slide: walk `<p:spTree>` → `parseShape` (text vs autoshape via `txBox`),
   `parsePicture`, `parseGraphicFrame` (tables), `parseGroup`. Sort by spId to
   recover original order.
4. **Animations:** `parseAnimations` walks the timing tree, finds effect nodes
   (those with a `presetID`), reverse-maps `presetID_presetClass` → friendly name
   via `PRESET_REVERSE`, and **re-attaches each animation to its element by spId**.
   `traverseForTarget` knows every behavior-node kind — keep it in sync with the
   generator when you add a node type.
5. **Line-break recovery:** runs separated by `<a:br/>` with identical styling are
   merged back into one run with `"\n"` (mirrors `textRunsXml`).

Parsing is intentionally forgiving (try/catch around optional parts) so a deck
that wasn't produced by SlideJ still yields a usable approximation.

---

## 11. Templates

A template is just a deck JSON with extra metadata (`name`, `description`, `tags`,
optional `guide`). `cli.js` loads built-ins from `templates/` and customs from
`~/.slidej/templates/` (customs win on name collision). `template use` exports a
copy for editing; `template save` stores the current JSON as a custom template.
The `guide` block (palette/layout/components/animations notes) is shown by
`template info` to help an agent style a deck consistently.

---

## 12. How to extend (cheat-sheet)

- **New shape type:** add to `SHAPE_TYPES` in `constants.js` (value = OOXML `prst` name). Done.
- **New animation:** add a preset to `ANIMATION_PRESETS`, add a `generateXxx` in
  `animation.js`, wire it into `generateBehavior`'s dispatch, **ensure the
  attrNameLst invariant**, and add a case to `examples/anim-audit.json`. If it
  should round-trip, make sure `PRESET_REVERSE` + `traverseForTarget` handle it.
- **New component:** see §8.
- **New per-element styling:** add to the relevant `generateXxx` in `slide.js`
  and the matching builder in `xml-helpers.js`; document in `SCHEMA.md` and add
  the inverse in `parsers/index.js` if it should round-trip.

---

## 13. Constraints & gotchas (learned the hard way)

- **PowerPoint rotates every object around its own bounding-box center.** You
  cannot pin an off-center pivot. A half-buried "globe" can only *swing*, not
  *spin* — only a fully-visible shape spins cleanly. True 3D surface rotation is
  impossible in 2D PPTX.
- **Group rotation composes with `animRot`:** a base `rot` on the group's
  `<a:xfrm>` plus a relative `animRot by=...` lets consecutive slides continue a
  rotation (e.g. 0° / 120° / 240° base across 3 slides, each spinning +120°).
- **`<a:br>` is mandatory for line breaks** — a raw `"\n"` inside `<a:t>` collapses
  and text overlaps. Always go through `textRunsXml`.
- **No placeholders / no layouts beyond one blank layout** — everything is absolutely positioned.
- **The Bash tool runs in a sandbox** separate from the real workspace; files it
  creates (e.g. under `examples/`, `output/`) may not appear in the actual repo.
  Source edits via the Edit/Write tools do land in the real workspace.
- **Generated artifacts are gitignored** (`*.pptx`, `output.*`, `example.json`).
