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
`downArrow`, `line`, `cloud`, `heart`, `lightningBolt`, `callout1`, `callout2`

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

      // For spin:
      "degrees": 360,

      // For growShrink/pulse:
      "scale": 110                  // percentage
    }
  ]
}
```

**Animation Types:**

| Type | Class | Description |
|------|-------|-------------|
| `appear` | Entrance | Instantly appear |
| `fadeIn` | Entrance | Fade in |
| `fadeOut` | Exit | Fade out |
| `flyIn` | Entrance | Fly in from direction |
| `flyOut` | Exit | Fly out to direction |
| `wipeIn` | Entrance | Wipe reveal |
| `wipeOut` | Exit | Wipe hide |
| `zoomIn` | Entrance | Zoom in from small |
| `zoomOut` | Exit | Zoom out to small |
| `bounceIn` | Entrance | Bounce entrance |
| `pulse` | Emphasis | Pulse scale |
| `spin` | Emphasis | Rotate |
| `growShrink` | Emphasis | Scale up/down |

**Trigger Types:**

| Trigger | Meaning |
|---------|---------|
| `onClick` | Plays on next mouse click (default) |
| `withPrevious` | Plays simultaneously with previous animation |
| `afterPrevious` | Plays after previous animation finishes |
