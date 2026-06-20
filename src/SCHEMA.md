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
    "type": "fade",                 // fade|push|wipe|split|cover|cut|dissolve|random
    "speed": "med",                 // slow|med|fast
    "advanceAfter": 3000,           // Auto-advance after ms
    "advanceOnClick": true
  },
  "elements": [ ... ]
}
```

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
  "bullet": true,                  // or "•", "→", etc.

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
  "position": { "x": 1, "y": 1, "w": 5, "h": 5 },
  "children": [
    { "type": "shape", ... },
    { "type": "text", ... },
    { "type": "image", ... }
  ]
}
```

## Components (high-level, self-drawn)

Components are convenience element types that expand into a `group` of primitive
shapes/text. Put them directly in a slide's `elements`. They accept `position`
(inches) and optional `animations` (applied to the whole component as one unit).

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
  "labelColor": "595959"
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
| `wipeIn` | Entrance | Wipe reveal (use `direction`) |
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
