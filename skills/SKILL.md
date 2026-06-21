---
name: slidej
description: "Use this skill whenever the user wants to create PowerPoint presentations with animations, transitions, and precise element control from JSON — or reverse-engineer an existing .pptx into structured JSON. SlideJ is a CLI that generates .pptx from JSON and parses .pptx back to JSON, enabling a full round-trip workflow. Trigger when: user wants animated slides, mentions 'slidej', needs to convert a .pptx to JSON for reading or editing, wants element-level animation control (fadeIn, flyIn, zoom, spin, wipe, etc.), or needs a programmatic slide generation pipeline. Also trigger when the user uploads a .pptx and wants to understand its structure, modify it, or recreate it with changes."
---

# SlideJ — Agent Guide

## Quick Start

```bash
# JSON -> PPTX
slidej generate input.json -o output.pptx
slidej gen input.json -o output.pptx          # alias

# PPTX -> JSON
slidej parse input.pptx -o output.json
slidej parse input.pptx                       # stdout
slidej parse input.pptx --no-images -o out.json

# Templates
slidej template list                          # list all
slidej template info <name>                   # show style guide
slidej template use <name> -o deck.json       # export for editing
slidej template save input.json <name> -d "Description" -t "tag1,tag2"
slidej template remove <name>

# Helpers
slidej schema                                 # print JSON schema
slidej example -o example.json                # demo deck
```

### Templates

| Template | Style | Best for |
|----------|-------|----------|
| `title-slide` | Dark hero, centered | Title screens, section dividers |
| `pitch-deck` | Professional dark-to-light | Pitches, proposals |
| `report` | Clean corporate, tables | Reports, dashboards |
| `minimal` | Whitespace, typography | Academic, text-heavy |
| `dark-modern` | Dark UI, gradient accents | Tech, SaaS demos |
| `sunset-wave` | Warm gradients, organic | Creative, storytelling |
| `candy-pop` | Bold pop-art on white | Events, campaigns |
| `ocean-aurora` | Deep cool-tone, glow | Tech showcases, premium |
| `neon-garden` | Neon-on-black | Creative agencies, entertainment |

---

## JSON Structure

### Root

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": { "title": "Title", "author": "Author" },
  "theme": {
    "colors": { "accent1": "4472C4", "accent2": "ED7D31" },
    "majorFont": "Calibri Light",
    "minorFont": "Calibri"
  },
  "slides": [...]
}
```

### Slide

```json
{
  "background": "1A1A2E",
  "transition": "fade",
  "elements": [...]
}
```

Background: hex string `"1A1A2E"` or gradient object:

```json
{
  "type": "gradient",
  "stops": [
    { "position": 0, "color": "0B0B1F" },
    { "position": 100, "color": "162447" }
  ],
  "angle": 135
}
```

Transition: `"fade"` | `"push"` | `"wipe"` | `"split"` | `"cover"` | `"cut"` | `"dissolve"` | `"random"`, or object `{ "type": "fade", "speed": "med", "advanceAfter": 3000 }`.

---

## Elements

All elements **must** have `position: { x, y, w, h }` in **inches**.

Slide size: **13.333" wide x 7.5" tall**. Safe margin: 0.5" on each side.

### Rules

- Colors are **bare hex without `#`**: use `"FF0000"` not `"#FF0000"`.
- Font sizes are in **points**. Text is **not** auto-sized — reduce `fontSize` or enlarge box if text overflows.
- Image `src` paths are resolved **relative to the JSON file's directory**.
- Use `"\n"` inside any text string for line breaks.

### Text

```json
{
  "type": "text",
  "text": "Hello World",
  "position": { "x": 1, "y": 1, "w": 10, "h": 1.5 },
  "fontSize": 36,
  "bold": true,
  "color": "FFFFFF",
  "fontFamily": "Calibri Light",
  "align": "center",
  "vertAlign": "middle"
}
```

Multi-paragraph (each item is a separate paragraph):

```json
"text": [
  { "text": "Heading", "fontSize": 28, "bold": true, "color": "FFFFFF" },
  { "text": "Subtitle", "fontSize": 16, "color": "AAAAAA" }
]
```

Mixed runs in one paragraph:

```json
"text": [
  {
    "align": "center",
    "runs": [
      { "text": "Bold part ", "bold": true, "color": "FF0000" },
      { "text": "normal part", "color": "333333" }
    ]
  }
]
```

Bullet list:

```json
"text": [
  { "text": "First point", "bullet": true },
  { "text": "Second point", "bullet": true }
]
```

Optional: `fill`, `line`, `shadow`, `rotation`, `margin`, `lineSpacing`, `italic`, `underline`, `strike`.

### Shape

```json
{
  "type": "shape",
  "shapeType": "roundRect",
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "fill": "4472C4",
  "line": { "color": "333333", "width": 2 },
  "text": "Label",
  "fontSize": 18,
  "color": "FFFFFF",
  "align": "center",
  "vertAlign": "middle"
}
```

Shape types: `rect`, `roundRect`, `ellipse`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `star5`, `star6`, `rightArrow`, `leftArrow`, `upArrow`, `downArrow`, `line`, `cloud`, `heart`, `lightningBolt`, `callout1`, `callout2`, `chevron`, `donut`, `blockArc`, `arc`, `pie`, `plaque`, `can`, `parallelogram`, `trapezoid`.

Fill can be gradient:

```json
"fill": {
  "type": "gradient",
  "stops": [
    { "position": 0, "color": "4472C4" },
    { "position": 100, "color": "2E5CA8" }
  ],
  "angle": 135
}
```

Optional: `noFill` (outline only), `adjust` (geometry tweaks), `shadow`, `rotation`.

### Image

```json
{
  "type": "image",
  "src": "assets/photo.png",
  "position": { "x": 2, "y": 2, "w": 5, "h": 3 }
}
```

Optional: `hyperlink`, `crop: { left, top, right, bottom }`, `line`, `rotation`.

### Table

```json
{
  "type": "table",
  "position": { "x": 0.5, "y": 2, "w": 12, "h": 4 },
  "headerRow": true,
  "fontSize": 14,
  "rows": [
    ["Column A", "Column B", "Column C"],
    ["Data 1", "100", "OK"]
  ]
}
```

Styled cells: `{ "text": "Header", "bold": true, "fill": "4472C4", "color": "FFFFFF", "align": "center" }`.

Tables do **NOT** support animations.

### Group

Groups wrap multiple elements into a single unit. Children use **absolute coordinates** (not relative to the group).

```json
{
  "type": "group",
  "position": { "x": 0, "y": 0, "w": 8, "h": 8 },
  "rotation": 0,
  "children": [
    { "type": "shape", "shapeType": "ellipse", "position": { "x": 0, "y": 0, "w": 8, "h": 8 }, "fill": "FAFAFA" },
    { "type": "shape", "shapeType": "ellipse", "position": { "x": 3.8, "y": 0, "w": 0.4, "h": 0.4 }, "fill": "FF0000" }
  ],
  "animations": [
    { "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "order": 0 },
    { "type": "spin", "degrees": 90, "duration": 800, "trigger": "afterPrevious", "order": 1 }
  ]
}
```

Key points:
- **`rotation`** on the group sets the **initial rotation** (degrees). This is a static base angle.
- Animations on the group apply to the **entire unit** — all children move/fade/spin together.
- Group `rotation` + `spin` animation **compose**: you can set different base `rotation` across slides and add the same `spin` to create a continuous rotation effect (e.g. 0, 72, 144... base + spin 72 each time).
- Children inside a group cannot have their own animations — only the group itself animates.

---

## Animations

Add `"animations": [...]` to any text, shape, image, or group element.

```json
"animations": [
  { "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "delay": 0 }
]
```

### Triggers (how animations are sequenced)

| Trigger | Behavior |
|---------|----------|
| `onClick` | Plays on mouse click (default). Starts a new click group. |
| `withPrevious` | Plays at the same time as the previous animation. |
| `afterPrevious` | Plays after the previous animation finishes. |

The **first `afterPrevious`** animation on a slide **auto-plays on slide entry** — no click needed. This is the standard way to make things appear automatically.

### All animation types

**Entrance (element appears):**

| Type | Required fields | Description |
|------|----------------|-------------|
| `appear` | — | Instant appearance |
| `fadeIn` | — | Opacity 0 -> 100% |
| `flyIn` | `direction` | Fly in from a direction |
| `wipeIn` | `direction` | Wipe reveal from a direction |
| `zoomIn` | — | Scale from 0% to 100% |
| `splitIn` | — | Barn-door reveal |
| `bounceIn` | — | Scale with overshoot |
| `floatIn` | — | Fade + vertical drift up |
| `swivel` | — | Fade + horizontal unfold |
| `dissolveIn` | — | Dissolve effect |

**Exit (element disappears):**

| Type | Required fields | Description |
|------|----------------|-------------|
| `fadeOut` | — | Opacity 100% -> 0 |
| `flyOut` | `direction` | Fly out to a direction |
| `wipeOut` | `direction` | Wipe out to a direction |
| `zoomOut` | — | Scale from 100% to 0% |
| `floatOut` | — | Fade + drift away |
| `dissolveOut` | — | Dissolve out |

**Emphasis (element is already visible):**

| Type | Required fields | Description |
|------|----------------|-------------|
| `pulse` | `scale` (default 110) | Pulse size briefly |
| `spin` | `degrees` (default 360) | Rotate in place |
| `growShrink` | `scale` | Scale up/down |
| `colorChange` | `color` | Animate fill to new color |
| `transparency` | `opacity` | Animate to opacity % |
| `teeter` | `degrees` | Rock back and forth |
| `blink` | — | Quick hide/show |

**Motion:**

| Type | Required fields | Description |
|------|----------------|-------------|
| `motionPath` | `points` array or `path`+`direction`+`distance` | Move along a path |

### Direction values (for flyIn/Out, wipeIn/Out)

`top`, `bottom`, `left`, `right`, `topLeft`, `topRight`, `bottomLeft`, `bottomRight`

---

## Animation Patterns

### Pattern 1: Staggered entrance (elements appear one after another)

Use `afterPrevious` with increasing `delay` on each element:

```json
// Element 1 — auto-plays on slide entry (first afterPrevious = auto-play)
{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious" }

// Element 2 — starts after element 1 finishes, plus 200ms pause
{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "delay": 200 }

// Element 3 — starts after element 2 finishes, plus 200ms pause
{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious", "delay": 200 }
```

### Pattern 2: Simultaneous entrance (multiple elements at once)

Use `withPrevious` on elements that should appear together:

```json
// Element 1
{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious" }

// Element 2 — plays at the same time as Element 1
{ "type": "fadeIn", "duration": 500, "trigger": "withPrevious" }
```

### Pattern 3: Auto-play sequence on slide entry

All `afterPrevious` — the entire chain plays automatically when the slide appears:

```json
// Title fades in automatically
{ "type": "fadeIn", "duration": 800, "trigger": "afterPrevious" }

// Subtitle fades in after title, with a 300ms gap
{ "type": "fadeIn", "duration": 600, "trigger": "afterPrevious", "delay": 300 }

// Divider line wipes in after subtitle
{ "type": "wipeIn", "direction": "right", "duration": 400, "trigger": "afterPrevious", "delay": 200 }

// Content cards fly in one by one
{ "type": "flyIn", "direction": "bottom", "duration": 600, "trigger": "afterPrevious", "delay": 200 }
{ "type": "flyIn", "direction": "bottom", "duration": 600, "trigger": "afterPrevious", "delay": 200 }
```

### Pattern 4: Multiple animations on one element

An element can have multiple animations that play in sequence. Use `order` to control sequence:

```json
"animations": [
  { "type": "fadeIn", "duration": 300, "trigger": "afterPrevious", "order": 0 },
  { "type": "spin", "degrees": 72, "duration": 900, "trigger": "afterPrevious", "order": 1 }
]
```

### Pattern 5: Rotating wheel across slides

Use a group with a base `rotation` that changes per slide + a `spin` animation:

```json
// Slide 2: rotation 0, spin +72
{ "type": "group", "rotation": 0, "animations": [
    { "type": "fadeIn", "duration": 300, "trigger": "afterPrevious", "order": 0 },
    { "type": "spin", "degrees": 72, "duration": 900, "trigger": "afterPrevious", "order": 1 }
]}

// Slide 3: rotation 72, spin +72
{ "type": "group", "rotation": 72, "animations": [
    { "type": "fadeIn", "duration": 300, "trigger": "afterPrevious", "order": 0 },
    { "type": "spin", "degrees": 72, "duration": 900, "trigger": "afterPrevious", "order": 1 }
]}

// Slide 4: rotation 144, spin +72
{ "type": "group", "rotation": 144, "animations": [...same...] }
```

Each slide starts where the previous left off (base `rotation` = previous base + spin degrees).

### Pattern 6: Click-to-reveal (interactive)

Use `onClick` for elements that should appear only on click:

```json
// Visible immediately
{ "type": "fadeIn", "duration": 500, "trigger": "afterPrevious" }

// Appears on first click
{ "type": "fadeIn", "duration": 500, "trigger": "onClick" }

// Appears on second click
{ "type": "flyIn", "direction": "left", "duration": 600, "trigger": "onClick" }
```

---

## Layout Reference

Slide: **13.333" x 7.5"**. Safe area: x=0.5 to x=12.833, y=0.5 to y=7.0.

```
Y=0.4–0.5    Title area         (h ~ 1.0–1.5)
Y=1.8–2.0    Content start      (h ~ 4.0)
Y=6.0–6.5    Footer / source    (h ~ 0.5)
```

### Common column layouts

| Layout | Column 1 | Column 2 | Column 3 |
|--------|----------|----------|----------|
| 2-col | x=0.5, w=5.9 | x=6.8, w=5.9 | — |
| 3-col | x=0.5, w=3.8 | x=4.7, w=3.8 | x=8.9, w=3.8 |
| 4-col | x=0.5, w=2.83 | x=3.67, w=2.83 | x=6.83, w=2.83 |

Gap between columns: ~0.4".

### Centering N items horizontally

Formula: given `itemW`, `gap`, and `N` items:
- totalW = N * itemW + (N-1) * gap
- startX = (13.333 - totalW) / 2
- Each item: x = startX + i * (itemW + gap)

### Placing items in a circle

For N items on a circle of radius R centered at (cx, cy), item size s:
- angle_i = i * (360 / N) - 90 (start from top)
- x = cx + R * cos(angle_i) - s/2
- y = cy + R * sin(angle_i) - s/2

---

## Components (high-level)

These expand into primitive groups automatically. Use `position` and optional `animations`.

### progressBar

```json
{ "type": "progressBar", "position": { "x": 1, "y": 1, "w": 5, "h": 0.5 },
  "value": 72, "color": "4472C4", "trackColor": "E6E6E6", "showLabel": true }
```

### progressRing

```json
{ "type": "progressRing", "position": { "x": 1, "y": 1, "w": 2, "h": 2 },
  "value": 65, "color": "70AD47", "trackColor": "E6E6E6", "thickness": 0.16, "showLabel": true }
```

### barChart

```json
{ "type": "barChart", "position": { "x": 1, "y": 3, "w": 6, "h": 3 },
  "data": [40, 70, 55, 90], "labels": ["Q1", "Q2", "Q3", "Q4"],
  "colors": ["4472C4", "5B9BD5", "70AD47", "ED7D31"], "showValues": true, "axis": true }
```

### kpiCard

```json
{ "type": "kpiCard", "position": { "x": 1, "y": 1, "w": 3, "h": 1.5 },
  "value": "$1.2M", "label": "Revenue", "delta": "+12%", "accent": "5B9BD5" }
```

### ratingStars

```json
{ "type": "ratingStars", "position": { "x": 1, "y": 1, "w": 4, "h": 0.9 },
  "rating": 4, "max": 5, "color": "FFC000", "emptyColor": "D9D9D9" }
```

### timeline

```json
{ "type": "timeline", "position": { "x": 1, "y": 1.5, "w": 11, "h": 2 },
  "items": [{ "label": "2021", "sub": "Founded" }, { "label": "2022", "sub": "Seed" }],
  "dotColor": "4472C4", "lineColor": "CCCCCC" }
```

### processFlow

```json
{ "type": "processFlow", "position": { "x": 1, "y": 5, "w": 6, "h": 0.8 },
  "steps": ["Plan", "Build", "Test", "Ship"],
  "colors": ["4472C4", "5B9BD5", "70AD47", "ED7D31"], "shape": "chevron" }
```

---

## Complete Example: Title Slide + Content Slide

```json
{
  "width": 13.333, "height": 7.5,
  "meta": { "title": "Demo", "author": "Agent" },
  "theme": {
    "colors": { "accent1": "4472C4", "accent2": "ED7D31" },
    "majorFont": "Calibri Light", "minorFont": "Calibri"
  },
  "slides": [
    {
      "background": { "type": "gradient", "stops": [{ "position": 0, "color": "0B0B1F" }, { "position": 100, "color": "162447" }], "angle": 135 },
      "transition": "fade",
      "elements": [
        {
          "type": "text", "text": "Presentation Title",
          "position": { "x": 0.8, "y": 2.5, "w": 11.7, "h": 1.2 },
          "fontSize": 48, "bold": true, "color": "FFFFFF", "align": "center", "fontFamily": "Calibri Light",
          "animations": [{ "type": "fadeIn", "duration": 800, "trigger": "afterPrevious" }]
        },
        {
          "type": "text", "text": "Subtitle goes here",
          "position": { "x": 2, "y": 3.8, "w": 9.3, "h": 0.6 },
          "fontSize": 20, "color": "8899BB", "align": "center", "fontFamily": "Calibri Light",
          "animations": [{ "type": "fadeIn", "duration": 600, "trigger": "afterPrevious", "delay": 300 }]
        },
        {
          "type": "shape", "shapeType": "rect",
          "position": { "x": 4.3, "y": 4.6, "w": 4.7, "h": 0.022 },
          "fill": "4472C4",
          "animations": [{ "type": "wipeIn", "direction": "right", "duration": 500, "trigger": "afterPrevious", "delay": 200 }]
        }
      ]
    },
    {
      "background": "FFFFFF",
      "transition": "fade",
      "elements": [
        {
          "type": "text", "text": "Section Title",
          "position": { "x": 0.5, "y": 0.4, "w": 12.3, "h": 1 },
          "fontSize": 36, "bold": true, "color": "2D3436", "align": "center",
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
          "animations": [{ "type": "flyIn", "direction": "bottom", "duration": 600, "trigger": "afterPrevious", "delay": 200 }]
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
          "type": "shape", "shapeType": "roundRect",
          "position": { "x": 8.9, "y": 1.8, "w": 3.8, "h": 2.5 },
          "fill": "70AD47",
          "text": [
            { "text": "Card 3", "fontSize": 20, "bold": true, "color": "FFFFFF" },
            { "text": "Third point", "fontSize": 14, "color": "D4EFCC" }
          ],
          "align": "center", "vertAlign": "middle",
          "animations": [{ "type": "flyIn", "direction": "bottom", "duration": 600, "trigger": "afterPrevious", "delay": 200 }]
        }
      ]
    }
  ]
}
```

---

## Workflow: Modify Existing PPTX

```bash
slidej parse original.pptx --no-images -o deck.json   # Step 1: parse
# Edit deck.json (remove `id`, `name`, `srcBase64` fields if present)
slidej generate deck.json -o updated.pptx              # Step 2: regenerate
```

## Workflow: Create from Template

```bash
slidej template list                                   # browse
slidej template info pitch-deck                        # see style guide
slidej template use pitch-deck -o deck.json            # export
# Edit deck.json
slidej generate deck.json -o presentation.pptx         # generate
```
