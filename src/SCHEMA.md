# SlideJ JSON Schema Reference

## Root Object

```json
{
  "width": 13.333,          // Slide width in inches (default: 13.333 = widescreen 16:9)
  "height": 7.5,            // Slide height in inches (default: 7.5)
  "meta": {
    "title": "My Deck",
    "author": "Agent"
  },
  "theme": { ... },         // Optional theme configuration
  "slides": [ ... ]         // Array of slide objects
}
```

## Theme

```json
{
  "colors": {
    "dk1": "000000", "lt1": "FFFFFF",
    "dk2": "44546A", "lt2": "E7E6E6",
    "accent1": "4472C4", "accent2": "ED7D31",
    "accent3": "A5A5A5", "accent4": "FFC000",
    "accent5": "5B9BD5", "accent6": "70AD47",
    "hlink": "0563C1", "folHlink": "954F72"
  },
  "majorFont": "Calibri Light",
  "minorFont": "Calibri"
}
```

## Slide

```json
{
  "background": "#1a1a2e",          // Hex color string
  // OR gradient:
  "background": {
    "type": "gradient",
    "stops": [
      { "position": 0, "color": "000000" },
      { "position": 100, "color": "333366" }
    ],
    "angle": 90
  },
  "transition": "fade",            // String shorthand
  // OR detailed:
  "transition": {
    "type": "fade",                 // any type from "Transitions" below
    "direction": "left",            // per type, see below
    "speed": "med",                 // slow|med|fast
    "duration": 800,                // exact ms (PowerPoint 2010+)
    "advanceAfter": 3000,           // Auto-advance after ms
    "advanceOnClick": true
  },
  "elements": [ ... ]
}
```

### Transitions

`transition` is a type name or an object:

```json
"transition": {
  "type": "vortex",          // see the table below
  "direction": "right",      // left|right|up|down, up-left…, horizontal|vertical, in|out, center (per type)
  "speed": "slow",           // slow|med|fast (≈1000/750/500 ms)
  "duration": 1400,          // exact milliseconds; overrides speed in PowerPoint 2010+
  "advanceAfter": 3000,      // auto-advance after ms
  "advanceOnClick": true
}
```

| Generation | Types | Options |
|---|---|---|
| Classic (every viewer) | `fade` `cut` | `thruBlack` |
| | `push` `wipe` | direction: left, right, up, down |
| | `cover` `pull` | direction: the four sides + up-left, up-right, down-left, down-right |
| | `split` | direction: in, out; `orientation`: horizontal, vertical |
| | `blinds` `checker` `comb` `randomBar` | direction: horizontal, vertical |
| | `strips` | direction: up-left, up-right, down-left, down-right |
| | `zoom` | direction: in, out |
| | `wheel` | `spokes`: 1, 2, 3, 4, 8 |
| | `circle` `diamond` `plus` `wedge` `newsflash` `dissolve` `random` | none |
| PowerPoint 2010+ | `vortex` `pan` `glitter` (`pattern`: diamond, hexagon) `prism` (`content`, `inverted`) | direction: the four sides |
| | `switch` `flip` `ferris` `gallery` `conveyor` `reveal` (`thruBlack`) | direction: left, right |
| | `doors` `window` | direction: horizontal, vertical |
| | `flythrough` (`bounce`) `warp` `shred` (`pattern`: strip, rectangle) | direction: in, out |
| | `ripple` | direction: center or a corner |
| | `honeycomb` `flash` `wheelReverse` (`spokes`) | none |
| PowerPoint 2013+ | `airplane` `crush` `curtains` `drape` `fallOver` `fracture` `origami` `pageCurlDouble` `pageCurlSingle` `peelOff` `prestige` `wind` | `invert`: mirror the direction |
| PowerPoint 2019 / 365 | `morph` | `morphBy`: byObject (default), byWord, byChar |

Newer types and any `duration` are written with a classic fallback (`fade`, or the
classic effect itself), so older viewers still open the file. **Morph** animates
between objects that appear on both slides; give matching elements the same `name`
on consecutive slides (prefix the name with `!!` to force a match). Unknown types
or directions are reported as warnings by `generate`.

## Element Types

### Text

```json
{
  "type": "text",
  "name": "Title",                  // Optional name
  "position": { "x": 1, "y": 1, "w": 10, "h": 1.5 },  // inches
  "rotation": 0,                    // degrees, optional

  // Simple text:
  "text": "Hello World",

  // Multi-paragraph:
  "text": [
    "First paragraph",
    "Second paragraph",
    { "text": "Styled paragraph", "bold": true, "color": "FF0000" }
  ],

  // Rich text with multiple runs per paragraph:
  "text": [
    {
      "align": "center",
      "runs": [
        { "text": "Bold ", "bold": true },
        { "text": "and italic", "italic": true, "color": "0000FF" }
      ]
    }
  ],

  // Text style (applies to simple text mode):
  "fontSize": 24,
  "bold": true,
  "italic": false,
  "underline": false,
  "strike": false,
  "color": "FF0000",               // Hex or theme ref: "accent1"
  "fontFamily": "Arial",
  "align": "center",               // left|center|right|justify
  "vertAlign": "middle",           // top|middle|bottom
  "lineSpacing": 1.5,
  "bullet": true,                  // or "•", "→", etc. Gets a 1 em hanging indent
                                   // unless marginLeft / indent (inches) are set.

  // Box style:
  "fill": "CCCCCC",                // Background fill
  "line": { "color": "000000", "width": 1 },
  "shadow": { "blur": 4, "distance": 3, "angle": 45, "color": "000000", "opacity": 40 },
  "margin": 0.1,                   // Inner margin in inches

  // Animation:
  "animations": [ ... ]
}
```

### Shape

```json
{
  "type": "shape",
  "shapeType": "roundRect",        // See shape types below
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "fill": "4472C4",                // Solid color
  // OR gradient:
  "fill": {
    "type": "gradient",
    "stops": [
      { "position": 0, "color": "4472C4" },
      { "position": 100, "color": "2E5CA8" }
    ],
    "angle": 135
  },
  "line": { "color": "333333", "width": 2, "dash": "dash" },
  "shadow": { ... },
  "rotation": 45,
  "noFill": true,                  // render with no fill (outline only)
  "adjust": { "adj": 12000 },      // preset-geometry adjust values (e.g. roundRect corner, chevron notch)

  // Optional text inside shape:
  "text": "Click me",
  "fontSize": 18,
  "color": "FFFFFF",
  "align": "center",
  "vertAlign": "middle",

  "animations": [ ... ]
}
```

**Shape Types:** `rect`, `roundRect`, `ellipse`, `triangle`, `diamond`, `pentagon`,
`hexagon`, `octagon`, `star5`, `star6`, `rightArrow`, `leftArrow`, `upArrow`,
`downArrow`, `line`, `cloud`, `heart`, `lightningBolt`, `callout1`, `callout2`,
`chevron`, `donut`, `blockArc`, `arc`, `pie`, `plaque`, `can`, `parallelogram`, `trapezoid`

### Image

```json
{
  "type": "image",
  "src": "./images/photo.png",     // Local file path
  // OR: "src": "data:image/png;base64,...",
  "position": { "x": 2, "y": 2, "w": 5, "h": 3 },
  "rotation": 0,
  "crop": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
  "line": { "color": "CCCCCC", "width": 1 },
  "hyperlink": "https://example.com",
  "animations": [ ... ]
}
```

### Table

```json
{
  "type": "table",
  "position": { "x": 0.5, "y": 2, "w": 12, "h": 4 },
  "headerRow": true,
  "fontSize": 14,
  "color": "333333",

  // Simple rows (strings):
  "rows": [
    ["Name", "Value", "Status"],
    ["Item A", "100", "OK"],
    ["Item B", "200", "Warning"]
  ],

  // Styled cells:
  "rows": [
    [
      { "text": "Name", "bold": true, "fill": "4472C4", "color": "FFFFFF" },
      { "text": "Value", "bold": true, "fill": "4472C4", "color": "FFFFFF" }
    ],
    [
      { "text": "Item A", "align": "left" },
      { "text": "100", "align": "right" }
    ]
  ]
}
```

### Group

```json
{
  "type": "group",
  "name": "!!wheel",               // Optional; same name on the next slide = Morph moves/rotates it
  "position": { "x": 1, "y": 1, "w": 5, "h": 5 },
  "rotation": 0,                   // Rotates the whole group around its centre
  "children": [
    { "type": "shape", ... },
    { "type": "text", ... },
    { "type": "image", ... }
  ]
}
```

## Layout (flex boxes)

Instead of computing `position` for every element, put elements in **boxes** and
let SlideJ lay them out with flexbox (the Yoga engine, as in React Native).
Text is measured with the real font, so boxes grow to fit their text.
Elements that keep an explicit `position` still work exactly as before.

```json
{
  "styles": {                                   // reusable classes (like CSS classes)
    "page":  { "padding": [0.45, 0.6], "gap": 0.3, "color": "F5F3EE", "fontFamily": "Segoe UI" },
    "card":  { "background": "1C2240", "border": { "width": 1, "color": "2C3460" },
               "radius": 0.12, "padding": 0.3, "gap": 0.15 }
  },
  "fonts": { "Brand Sans": "./fonts/BrandSans-Regular.ttf" },   // optional, for fonts not installed
  "slides": [{
    "layout": { "class": "page" },              // the slide itself is the root flex container
    "elements": [
      { "type": "text", "text": "Title", "style": { "fontSize": 34, "bold": true } },
      { "type": "box", "style": { "direction": "row", "gap": 0.3, "grow": 1 }, "children": [
        { "type": "box", "class": "card", "style": { "grow": 1, "basis": 0 }, "children": [
          { "type": "text", "text": "Card title", "style": { "fontSize": 20, "bold": true } },
          { "type": "text", "text": "Body text wraps and the card grows to fit it." }
        ] }
      ] },
      { "type": "shape", "position": { "x": 11, "y": 6, "w": 1, "h": 1 } }   // absolute, ignores the flow
    ]
  }]
}
```

### Where layout applies
- **`slide.layout`** (style object, may contain `class`): the slide becomes a flex
  container of the slide's size. Elements **without** `position` flow inside it;
  elements **with** `position` stay absolute.
- **`box`** element: a flex container (like a `div`). Anywhere in a flow, or placed
  absolutely with `position: { x, y, w, h? }` (omit `h` to size it to its content).
- Children of a box flow inside it. A child with `style.position: "absolute"` is
  placed with `top/right/bottom/left` relative to the box; a child with the old
  `position` rect is treated the same way (coordinates relative to the box).

### Style properties
Set them in `style` (inline) or in a named class in root `styles`, applied with
`class: "a b"` (or `["a", "b"]`). Classes apply in order, then `style` wins.
Lengths are **inches** (or `"50%"`, `"auto"`); border width is **points**.

| Group | Properties |
|---|---|
| Size | `width` `height` `minWidth` `maxWidth` `minHeight` `maxHeight` `aspectRatio` |
| Flex container | `direction` (`column` default, `row`, `row-reverse`, `column-reverse`), `justify` / `justifyContent` (`start` `center` `end` `space-between` `space-around` `space-evenly`), `alignItems` (`stretch` default, `start` `center` `end` `baseline`), `alignContent`, `wrap` (`true`/`"wrap"`/`"wrap-reverse"`), `gap` `rowGap` `columnGap` |
| Flex item | `grow` / `flexGrow`, `shrink` / `flexShrink`, `basis` / `flexBasis`, `alignSelf` |
| Spacing | `padding`, `margin`: number, `[v, h]`, `[t, h, b]`, `[t, r, b, l]` or `{top, right, bottom, left}`; also `paddingTop` … `marginLeft`; `margin` may be `"auto"` |
| Positioning | `position` (`relative` default, `absolute`), `top` `right` `bottom` `left` |
| Visual | `background` (color or gradient fill), `border` `{ width, color, dash }`, `radius` (inches), `shadow` |
| Text (inherited) | `fontSize` `fontFamily` `color` `bold` `italic` `underline` `textAlign` `verticalAlign` `lineSpacing` `letterSpacing` |

Text properties **inherit** from ancestor boxes (and `slide.layout`), as in CSS.
An element's own fields (`fontSize`, `color`, `align`, …) override its style.

### Behaviour notes
- Default `direction` is **column** (like React Native), not row.
- Items shrink along a row (so text wraps) but **not** along a column, so text is
  never squeezed below its height. When content does not fit, it overflows and
  `generate` prints a warning naming the element (`slide 2 > box[1] > text[0]`).
- Text, shapes with text, tables, images (aspect ratio read from PNG/JPEG/GIF) and
  components size themselves; a plain `shape` needs `width`/`height` or `grow`.
  Components without a height get a default (`progressBar` 0.4", `kpiCard` 1.4", …);
  in a row, `grow` sizes the width and the default becomes a minimum height.
- A box with `animations` becomes one group and animates as a unit; animations
  on its descendants are then ignored. Animate children individually by leaving
  the box itself un-animated, or give the box an animation with `by: "item"` to
  play its direct children one after another.
- Fonts are looked up in the system font folders (plus `SLIDEJ_FONT_DIRS` and root
  `fonts`). If a font is missing, text is measured with an estimate and
  `generate` warns.
- `parse` returns absolute elements: boxes and classes are not reconstructed.

## Components (high-level, self-drawn)

Components are convenience element types that expand into a `group` of primitive
shapes/text. Put them directly in a slide's `elements`. They accept `position`
(inches) and optional `animations` (applied to the whole component as one unit,
or item by item with `by: "item"`, see Animations).

### progressBar
```json
{
  "type": "progressBar",
  "position": { "x": 1, "y": 1, "w": 5, "h": 0.5 },
  "value": 72,                 // 0–100
  "color": "accent1",          // filled portion
  "trackColor": "E6E6E6",
  "rounded": true,
  "showLabel": true,           // shows "72%" (or custom "label")
  "label": "72%", "textColor": "FFFFFF"
}
```

### progressRing
```json
{
  "type": "progressRing",
  "position": { "x": 1, "y": 1, "w": 2, "h": 2 },
  "value": 65,                 // 0–100
  "color": "70AD47",
  "trackColor": "E6E6E6",
  "thickness": 0.16,           // ring thickness as fraction of radius (0.02–0.45)
  "showLabel": true, "textColor": "70AD47"
}
```

### barChart  (vertical columns)
```json
{
  "type": "barChart",
  "position": { "x": 1, "y": 3, "w": 6, "h": 3 },
  "data": [40, 70, 55, 90],
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "colors": ["4472C4", "5B9BD5", "70AD47", "ED7D31"],  // or "color": "accent1"
  "max": 100,                  // optional, defaults to max(data)
  "showValues": true,
  "axis": true, "axisColor": "BFBFBF",
  "labelColor": "595959",
  "valueLabels": ["40%", "70%", "55%", "90%"]   // optional text shown instead of the raw values
}
```

### kpiCard
```json
{
  "type": "kpiCard",
  "position": { "x": 1, "y": 1, "w": 3, "h": 1.5 },
  "value": "$1.2M",
  "label": "Revenue",
  "delta": "+12%",             // optional; green if positive, red if "-"
  "accent": "5B9BD5",          // left stripe + value color
  "bg": "FFFFFF",
  "valueColor": "1F1F1F", "labelColor": "808080"
}
```

### ratingStars
```json
{
  "type": "ratingStars",
  "position": { "x": 1, "y": 1, "w": 4, "h": 0.9 },
  "rating": 4, "max": 5,
  "color": "FFC000", "emptyColor": "D9D9D9", "gap": 0.25
}
```

### timeline  (horizontal)
```json
{
  "type": "timeline",
  "position": { "x": 1, "y": 1.5, "w": 11, "h": 2 },
  "items": [
    { "label": "2021", "sub": "Founded" },
    { "label": "2022", "sub": "Seed" }
  ],
  "lineColor": "CCCCCC", "dotColor": "accent1",
  "colors": ["4472C4", "70AD47"],   // optional per-dot colors
  "labelColor": "404040"
}
```

### processFlow  (chevron steps)
```json
{
  "type": "processFlow",
  "position": { "x": 1, "y": 5, "w": 6, "h": 0.8 },
  "steps": ["Plan", "Build", "Test", "Ship"],
  "colors": ["4472C4", "5B9BD5", "70AD47", "ED7D31"],  // or "color"
  "shape": "chevron",          // or "rect", "roundRect"
  "textColor": "FFFFFF"
}
```

## Animations

```json
{
  "animations": [
    {
      "type": "fadeIn",             // See animation types below
      "duration": 500,              // milliseconds
      "delay": 0,                   // delay before start (ms)
      "trigger": "onClick",         // onClick | withPrevious | afterPrevious
      "order": 0,                   // execution order (lower = first)

      // Play the parts one after another (see below):
      "by": "item",                 // item | paragraph | word | letter
      "stagger": 150,               // ms between parts

      // For fly animations:
      "direction": "left",          // top|right|bottom|left|topLeft|topRight|bottomLeft|bottomRight

      // For spin / teeter:
      "degrees": 360,

      // For growShrink/pulse:
      "scale": 110,                 // percentage

      // For colorChange:
      "color": "ED7D31",            // target fill color (emphasis)

      // For transparency:
      "opacity": 30,                // target opacity %, emphasis

      // For motionPath:
      "points": [ { "x": 3, "y": 0 }, { "x": 6, "y": 1.2 } ],  // relative offsets in inches from start
      // OR a directional line:
      "path": "line", "direction": "right", "distance": 3
    }
  ]
}
```

**Animation Types:**

| Type | Class | Description |
|------|-------|-------------|
| `appear` | Entrance | Instantly appear |
| `fadeIn` | Entrance | Fade in |
| `flyIn` | Entrance | Fly in from direction |
| `wipeIn` | Entrance | Wipe reveal from the `direction` side: `bottom` (grows up), `top`, `left`, `right` (`up`/`down` = `top`/`bottom`) |
| `zoomIn` | Entrance | Zoom in from small |
| `splitIn` | Entrance | Split/barn-door reveal |
| `bounceIn` | Entrance | Bounce in with scale overshoot |
| `floatIn` | Entrance | Fade + short vertical drift |
| `swivel` | Entrance | Fade + horizontal unfold |
| `dissolveIn` | Entrance | Dissolve in |
| `fadeOut` | Exit | Fade out |
| `flyOut` | Exit | Fly out to direction |
| `wipeOut` | Exit | Wipe hide |
| `zoomOut` | Exit | Zoom out to small |
| `floatOut` | Exit | Fade + drift away |
| `dissolveOut` | Exit | Dissolve out |
| `pulse` | Emphasis | Pulse scale |
| `spin` | Emphasis | Rotate (`degrees`) |
| `growShrink` | Emphasis | Scale up/down (`scale`) |
| `colorChange` | Emphasis | Animate fill to `color` |
| `transparency` | Emphasis | Animate to `opacity` % |
| `teeter` | Emphasis | Rocking rotation (`degrees`) |
| `blink` | Emphasis | Quick hide/show toggle |
| `motionPath` | Motion | Move along `points` or a `line` |

**Trigger Types:**

| Trigger | Meaning |
|---------|---------|
| `onClick` | Plays on next mouse click (default) |
| `withPrevious` | Plays simultaneously with previous animation |
| `afterPrevious` | Plays after previous animation finishes |

**Playing parts one after another (`by`, `stagger`):**

| `by` | Works on | Effect |
|------|----------|--------|
| `item` | components, `group`, `box` | Each item in turn: bars, steps, stars, timeline points, KPI value/label/delta, a group's or box's children |
| `paragraph` | `text`, `shape` with text | Each paragraph (a string's `"\n"` lines count as paragraphs) |
| `word` | `text`, `shape` with text | Word by word |
| `letter` | `text`, `shape` with text | Letter by letter |

- `stagger` (ms) is the gap between the starts of consecutive parts. With `item` /
  `paragraph`, the first part keeps the animation's `trigger` and `delay` and the
  others play with it, `stagger` ms apart. Without `stagger`, each part repeats
  the trigger (`onClick`: one click per part; `afterPrevious`: one after another).
- With `word` / `letter` the default gap is 10% of `duration`; `stagger` can be
  at most `duration`.
- `by: "item"` places the parts as separate shapes instead of one group (that is
  how PowerPoint animates them). Base parts (track, axis, card background,
  timeline line, box background) appear with the first item. Other animations
  on the same element play on all parts together.
- A following `afterPrevious` animation waits for the last part to finish.

```json
{ "type": "barChart", "data": [12, 19, 27], "position": { "x": 1, "y": 1.5, "w": 6, "h": 4 },
  "animations": [{ "type": "wipeIn", "direction": "bottom", "by": "item", "stagger": 250, "trigger": "afterPrevious" }] }

{ "type": "text", "text": "Point one\nPoint two\nPoint three", "bullet": true, "position": { "x": 8, "y": 1.5, "w": 4.5, "h": 2 },
  "animations": [{ "type": "floatIn", "by": "paragraph", "stagger": 400, "trigger": "afterPrevious" }] }

{ "type": "text", "text": "Results beat the plan", "position": { "x": 1, "y": 6, "w": 8, "h": 0.8 },
  "animations": [{ "type": "fadeIn", "by": "letter", "stagger": 40, "duration": 300 }] }
```
