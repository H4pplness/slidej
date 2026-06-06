---
name: slidej
description: "Use this skill whenever the user wants to create PowerPoint presentations with animations, transitions, and precise element control from JSON — or reverse-engineer an existing .pptx into structured JSON. SlideJ is a CLI that generates .pptx from JSON and parses .pptx back to JSON, enabling a full round-trip workflow. Trigger when: user wants animated slides, mentions 'slidej', needs to convert a .pptx to JSON for reading or editing, wants element-level animation control (fadeIn, flyIn, zoom, spin, wipe, etc.), or needs a programmatic slide generation pipeline. Also trigger when the user uploads a .pptx and wants to understand its structure, modify it, or recreate it with changes."
---

# SlideJ — CLI Usage Guide

## Commands

### Generate PPTX from JSON

```bash
slidej generate <input.json> -o <output.pptx>
slidej gen <input.json> -o <output.pptx>        # short alias
```

### Parse PPTX to JSON

```bash
slidej parse <input.pptx> -o <output.json>       # save to file
slidej parse <input.pptx>                         # print to stdout
slidej parse <input.pptx> --no-images -o out.json # skip base64 image data
```

### Template management

```bash
slidej template list                           # list all templates
slidej template info <name>                    # show template details
slidej template use <name> -o <output.json>    # export template as JSON
slidej template save <input.json> <name>       # save JSON as template
slidej template save <input.json> <name> -d "Description" -t "tag1,tag2"
slidej template remove <name>                  # remove a custom template
```

Short aliases: `slidej tpl ls`, `slidej tpl use`, `slidej tpl rm`.

### Generate example JSON

```bash
slidej example -o <output.json>
```

### Print schema reference

```bash
slidej schema
```

---

## Workflows

### Create from template (recommended)

```bash
# Step 1: Browse templates
slidej template list

# Step 2: See what's inside
slidej template info pitch-deck

# Step 3: Export to JSON
slidej template use pitch-deck -o deck.json

# Step 4: Edit deck.json (change text, colors, add/remove slides)

# Step 5: Generate PPTX
slidej generate deck.json -o presentation.pptx
```

### Available built-in templates

Each template is a **style guide** with example slides. The included slides are reference only — add, remove, or rearrange freely. Run `slidej template info <name>` to see the full style guide (palette, layout, components, animations, customization tips).

| Template | Style | Best for |
|----------|-------|----------|
| `title-slide` | Dark hero, centered | Title screens, section dividers, closing CTAs |
| `pitch-deck` | Professional dark-to-light | Pitches, proposals, product launches |
| `report` | Clean corporate, tables | Quarterly reports, reviews, dashboards |
| `minimal` | Whitespace, typography | Academic talks, briefings, text-heavy content |
| `dark-modern` | Dark UI, gradient accents | Tech products, SaaS demos, developer tools |
| `sunset-wave` | Warm gradients, organic shapes | Creative portfolios, storytelling, brand narratives |
| `candy-pop` | Bold pop-art on white | Events, campaigns, youth-oriented content |
| `ocean-aurora` | Deep cool-tone, glow | Tech showcases, science, premium branding |
| `neon-garden` | Neon-on-black, high contrast | Creative agencies, art portfolios, entertainment |

### Create from scratch

Write a JSON file following the schema below, then generate:

```bash
slidej generate slides.json -o presentation.pptx
```

### Modify an existing presentation

```bash
# Step 1: Parse to JSON
slidej parse original.pptx --no-images -o deck.json

# Step 2: Edit deck.json (add slides, change text, add animations)

# Step 3: Regenerate
slidej generate deck.json -o updated.pptx
```

When editing parsed JSON for re-generation, you can remove `id`, `name`, and `srcBase64` fields — the generator assigns new IDs automatically.

### Save and reuse templates

```bash
# Save a finished deck as a reusable template
slidej template save deck.json my-company -d "Company branded deck" -t "company,branded"

# Use it later
slidej template use my-company -o new-deck.json
```

Custom templates are stored in `~/.slidej/templates/` and override built-in templates with the same name.

### Inspect a presentation

```bash
slidej parse uploaded.pptx --no-images
```

Prints structured JSON to stdout for direct reading.

---

## JSON Schema

### Root

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": { "title": "Deck Title", "author": "Author" },
  "theme": {
    "colors": { "accent1": "4472C4", "accent2": "ED7D31" },
    "majorFont": "Calibri Light",
    "minorFont": "Calibri"
  },
  "slides": []
}
```

All positions and sizes are in **inches**. Default slide: 13.333 × 7.5 (widescreen 16:9).

### Slide

```json
{
  "background": "1a1a2e",
  "transition": "fade",
  "elements": []
}
```

**Background** — hex string or gradient:

```json
{ "type": "gradient", "stops": [{ "position": 0, "color": "000000" }, { "position": 100, "color": "333366" }], "angle": 90 }
```

**Transition** — string shorthand or object:

Shorthand values: `fade`, `push`, `wipe`, `split`, `cover`, `cut`, `dissolve`, `random`.

```json
{ "type": "fade", "speed": "med", "advanceAfter": 3000 }
```

---

## Element Types

### Text

Simple:

```json
{
  "type": "text",
  "text": "Hello World",
  "position": { "x": 1, "y": 1, "w": 10, "h": 1.5 },
  "fontSize": 36, "bold": true, "color": "FFFFFF",
  "fontFamily": "Arial", "align": "center", "vertAlign": "middle"
}
```

Multi-paragraph:

```json
{
  "type": "text",
  "text": [
    { "text": "Large heading", "fontSize": 28, "bold": true, "color": "FFFFFF" },
    { "text": "Smaller subtitle", "fontSize": 16, "color": "AAAAAA" }
  ],
  "position": { "x": 1, "y": 1, "w": 10, "h": 2 }
}
```

Mixed runs in one paragraph:

```json
{
  "type": "text",
  "text": [
    {
      "align": "center",
      "runs": [
        { "text": "Bold part ", "bold": true, "color": "FF0000" },
        { "text": "and normal part", "color": "333333" }
      ]
    }
  ],
  "position": { "x": 1, "y": 1, "w": 10, "h": 1 }
}
```

Bullet list:

```json
{
  "type": "text",
  "text": [
    { "text": "First point", "bullet": true },
    { "text": "Second point", "bullet": "→" }
  ],
  "position": { "x": 1, "y": 2, "w": 10, "h": 3 },
  "fontSize": 18, "color": "333333"
}
```

Optional properties: `fill`, `line`, `shadow`, `rotation`, `margin`, `lineSpacing`, `italic`, `underline`, `strike`.

### Shape

```json
{
  "type": "shape",
  "shapeType": "roundRect",
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "fill": "4472C4",
  "text": "Label inside",
  "fontSize": 18, "color": "FFFFFF",
  "align": "center", "vertAlign": "middle"
}
```

Available `shapeType` values: `rect`, `roundRect`, `ellipse`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `star5`, `star6`, `rightArrow`, `leftArrow`, `upArrow`, `downArrow`, `line`, `cloud`, `heart`, `lightningBolt`, `callout1`, `callout2`.

Gradient fill:

```json
{ "fill": { "type": "gradient", "stops": [{ "position": 0, "color": "4472C4" }, { "position": 100, "color": "2E5CA8" }], "angle": 135 } }
```

Optional properties: `line`, `shadow`, `rotation`. Shapes can contain `text` with all text styling properties.

### Image

```json
{
  "type": "image",
  "src": "./images/photo.png",
  "position": { "x": 2, "y": 2, "w": 5, "h": 3 }
}
```

`src` accepts: relative path (resolved from JSON file location), absolute path, or base64 data URI.

Optional properties: `hyperlink`, `crop`, `line`, `rotation`.

### Table

```json
{
  "type": "table",
  "position": { "x": 0.5, "y": 2, "w": 12, "h": 4 },
  "headerRow": true, "fontSize": 14,
  "rows": [
    ["Column A", "Column B", "Column C"],
    ["Row 1", "100", "OK"],
    ["Row 2", "200", "Warning"]
  ]
}
```

Styled cells:

```json
{ "text": "Header", "bold": true, "fill": "4472C4", "color": "FFFFFF", "align": "center" }
```

### Group

```json
{
  "type": "group",
  "position": { "x": 1, "y": 1, "w": 5, "h": 5 },
  "children": [
    { "type": "shape", "shapeType": "rect", "position": { "x": 1, "y": 1, "w": 2, "h": 2 }, "fill": "FF0000" },
    { "type": "text", "text": "Label", "position": { "x": 1, "y": 1, "w": 1, "h": 0.5 } }
  ]
}
```

---

## Animations

Attach to any text, shape, or image element via the `animations` array:

```json
{
  "type": "text",
  "text": "Animated element",
  "position": { "x": 1, "y": 1, "w": 5, "h": 1 },
  "animations": [
    { "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "delay": 0 }
  ]
}
```

### Animation types

| Type | Class | Notes |
|------|-------|-------|
| `appear` | Entrance | Instant visibility |
| `fadeIn` | Entrance | Opacity transition |
| `fadeOut` | Exit | |
| `flyIn` | Entrance | Requires `direction` |
| `flyOut` | Exit | Requires `direction` |
| `wipeIn` | Entrance | Requires `direction` |
| `wipeOut` | Exit | Requires `direction` |
| `zoomIn` | Entrance | Scale from 0% to 100% |
| `zoomOut` | Exit | |
| `bounceIn` | Entrance | |
| `pulse` | Emphasis | Accepts `scale` (default 110) |
| `spin` | Emphasis | Accepts `degrees` (default 360) |
| `growShrink` | Emphasis | Accepts `scale` |

### Triggers

| Value | Behavior |
|-------|----------|
| `onClick` | Plays on mouse click (default) |
| `withPrevious` | Plays simultaneously with previous animation |
| `afterPrevious` | Plays after previous animation finishes |

### Direction values (for fly / wipe)

`top`, `right`, `bottom`, `left`, `topLeft`, `topRight`, `bottomLeft`, `bottomRight`

### Staggered entrance pattern

Distribute animations across different elements using `afterPrevious` and `delay`:

```
Element 1: { "type": "fadeIn", "duration": 500, "trigger": "afterPrevious" }
Element 2: { "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "delay": 200 }
Element 3: { "type": "flyIn", "direction": "left", "duration": 600, "trigger": "afterPrevious", "delay": 200 }
```

Use `order` to control execution sequence when multiple animations share the same trigger.

---

## Coordinate Planning

Slide dimensions: 13.333" wide × 7.5" tall. Safe margin: 0.5" on each side.

```
Y=0.5   Title area       (h ≈ 1.0–1.5)
Y=1.8   Content start     (h ≈ 4.0)
Y=6.0   Footer / source   (h ≈ 0.5)
```

| Layout | Column 1 | Column 2 | Column 3 |
|--------|----------|----------|----------|
| 2-column | x=0.5, w=5.9 | x=6.8, w=5.9 | — |
| 3-column | x=0.5, w=3.8 | x=4.7, w=3.8 | x=8.9, w=3.8 |

Gap between columns: 0.4".

---

## Important Notes

1. Every element **must** have `position: { x, y, w, h }` in inches.
2. Hex colors **do not** need the `#` prefix. Use `"FF0000"` not `"#FF0000"`.
3. Tables do **not** support animations.
4. Image paths are resolved relative to the JSON file's directory.
5. Text is **not** auto-sized. Reduce `fontSize` or increase box dimensions if text overflows.
6. `transition` belongs on the slide object. `animations` belong on individual elements.
7. Parsed JSON can be fed directly back into `generate` for round-trip editing.

---

## Full Example

```json
{
  "width": 13.333, "height": 7.5,
  "meta": { "title": "Demo", "author": "Agent" },
  "slides": [
    {
      "background": "0B1D3A",
      "transition": "fade",
      "elements": [
        {
          "type": "text", "text": "Welcome",
          "position": { "x": 1, "y": 2.5, "w": 11, "h": 1.5 },
          "fontSize": 52, "bold": true, "color": "FFFFFF", "align": "center",
          "animations": [{ "type": "fadeIn", "duration": 800, "trigger": "afterPrevious" }]
        },
        {
          "type": "text", "text": "Subtitle goes here",
          "position": { "x": 3, "y": 4.2, "w": 7, "h": 0.8 },
          "fontSize": 22, "color": "7EB8DA", "align": "center",
          "animations": [{ "type": "fadeIn", "duration": 600, "trigger": "afterPrevious", "delay": 300 }]
        }
      ]
    },
    {
      "background": "FFFFFF",
      "transition": "push",
      "elements": [
        {
          "type": "text", "text": "Features",
          "position": { "x": 0.5, "y": 0.4, "w": 12, "h": 1 },
          "fontSize": 36, "bold": true, "color": "1a1a2e", "align": "center",
          "animations": [{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious" }]
        },
        {
          "type": "shape", "shapeType": "roundRect",
          "position": { "x": 0.5, "y": 1.8, "w": 3.8, "h": 2.5 },
          "fill": "4472C4",
          "text": [
            { "text": "Card 1", "fontSize": 20, "bold": true, "color": "FFFFFF" },
            { "text": "Description here", "fontSize": 14, "color": "CCDDFF" }
          ],
          "align": "center", "vertAlign": "middle",
          "animations": [{ "type": "flyIn", "direction": "left", "duration": 600, "trigger": "onClick" }]
        },
        {
          "type": "shape", "shapeType": "roundRect",
          "position": { "x": 4.7, "y": 1.8, "w": 3.8, "h": 2.5 },
          "fill": "ED7D31",
          "text": [
            { "text": "Card 2", "fontSize": 20, "bold": true, "color": "FFFFFF" },
            { "text": "More details", "fontSize": 14, "color": "FFE0C0" }
          ],
          "align": "center", "vertAlign": "middle",
          "animations": [{ "type": "flyIn", "direction": "bottom", "duration": 600, "trigger": "afterPrevious", "delay": 200 }]
        },
        {
          "type": "table",
          "position": { "x": 1, "y": 5, "w": 11, "h": 2 },
          "headerRow": true, "fontSize": 13,
          "rows": [
            ["Feature", "Status"],
            ["Animations", "13 types"],
            ["Tables", "Styled cells"],
            ["Round-trip", "Parse + Generate"]
          ]
        }
      ]
    }
  ]
}
```
