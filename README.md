# SlideJ

A JSON-first CLI tool for generating PowerPoint (.pptx) presentations and parsing existing PPTX files back into JSON. Built for AI agents and developers who need to programmatically create animated presentations with full layout and styling control.

## Features

- **JSON → PPTX** — Generate PowerPoint files from a structured JSON definition
- **PPTX → JSON** — Parse existing presentations back to editable JSON (round-trip editing)
- **13 animation types** — Entrance, exit, and emphasis animations with full timing control
- **8 slide transitions** — fade, push, wipe, split, cover, cut, dissolve, random
- **Rich element types** — text, shapes, images, tables, groups
- **Gradients, shadows, hyperlinks**, and 20+ preset shape types
- **Template system** — Built-in templates (pitch-deck, report, minimal, dark-modern) + save your own
- **Library API** — Use as a Node.js module in your own projects

## Requirements

- Node.js 16+
- npm

## Installation

```bash
git clone https://github.com/your-username/slidej.git
cd slidej
npm install
npm link
```

After `npm link`, the `slidej` command is available globally in your terminal.

## Quick Start

```bash
# 1. Generate a sample JSON to see the format
slidej example -o demo.json

# 2. Build the PPTX
slidej generate demo.json -o demo.pptx

# 3. Parse it back to JSON
slidej parse demo.pptx -o parsed.json

# 4. Edit parsed.json, then regenerate
slidej generate parsed.json -o edited.pptx
```

## CLI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `slidej generate <input.json>` | `gen` | Create a PPTX from a JSON file |
| `slidej parse <input.pptx>` | — | Parse a PPTX into JSON |
| `slidej template list` | `tpl ls` | List available templates |
| `slidej template use <name>` | `tpl use` | Export a template as JSON for editing |
| `slidej template save <json> <name>` | `tpl save` | Save a JSON file as a reusable template |
| `slidej template info <name>` | `tpl info` | Show detailed template info |
| `slidej template remove <name>` | `tpl rm` | Remove a custom template |
| `slidej example` | — | Output a sample JSON file |
| `slidej schema` | — | Print the full JSON schema reference |

### Options

```bash
# Generate a PPTX
slidej generate input.json -o output.pptx

# Parse PPTX to a file
slidej parse input.pptx -o output.json

# Parse and print to stdout (useful for piping)
slidej parse input.pptx

# Parse without extracting embedded images (smaller output)
slidej parse input.pptx --no-images -o output.json

# Write sample JSON to a file
slidej example -o starter.json
```

## Templates

SlideJ includes built-in templates as **style guides** — each template defines a visual language (palette, layout patterns, component styles, animation approach) along with example slides. Use them as a starting point, then freely add, remove, or rearrange slides to fit your content.

### Built-in templates

| Template | Style | Tone |
|----------|-------|------|
| `title-slide` | Dark hero, centered focal point | Dramatic, confident |
| `pitch-deck` | Professional dark-to-light, narrative arc | Confident, data-driven |
| `report` | Clean corporate, tables and KPI cards | Authoritative, clear |
| `minimal` | Ultra-clean whitespace, typography only | Calm, focused |
| `dark-modern` | Sleek dark UI, gradient accents | Sharp, futuristic |
| `sunset-wave` | Warm gradients, organic shapes | Dreamy, expressive |
| `candy-pop` | Bold pop-art, bright geometry on white | Joyful, youthful |
| `ocean-aurora` | Deep cool-tone, ethereal glow | Immersive, elegant |
| `neon-garden` | Neon-on-black, high contrast | Electric, rebellious |

Each template includes a `guide` object with detailed instructions on palette, layout patterns, reusable components, animation style, and customization tips. Run `slidej template info <name>` to view the full style guide.

### Template workflow

```bash
# 1. Browse available templates
slidej template list

# 2. See what's inside a template
slidej template info pitch-deck

# 3. Export template to JSON
slidej template use pitch-deck -o my-deck.json

# 4. Edit my-deck.json (change text, add slides, adjust styling)

# 5. Generate the final PPTX
slidej generate my-deck.json -o my-deck.pptx
```

### Save your own templates

```bash
# Save any JSON as a reusable template
slidej template save my-deck.json my-company-template -d "Company branded deck" -t "company,branded"

# It's now available in template list
slidej template list

# Remove a custom template
slidej template remove my-company-template
```

Custom templates are stored in `~/.slidej/templates/` and override built-in templates with the same name.

## JSON Format

### Top-level structure

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": {
    "title": "My Presentation",
    "author": "Your Name"
  },
  "theme": {
    "majorFont": "Calibri Light",
    "minorFont": "Calibri"
  },
  "slides": [ ... ]
}
```

Dimensions are in **inches**. The default `13.333 × 7.5` is standard widescreen (16:9).

### Slide

```json
{
  "background": "#1a1a2e",
  "transition": {
    "type": "fade",
    "speed": "med"
  },
  "elements": [ ... ]
}
```

**Transition types:** `fade` `push` `wipe` `split` `cover` `cut` `dissolve` `random`  
**Transition speed:** `slow` `med` `fast`

### Element: text

```json
{
  "type": "text",
  "text": "Hello, World!",
  "position": { "x": 1, "y": 1, "w": 10, "h": 2 },
  "fontSize": 48,
  "bold": true,
  "color": "FFFFFF",
  "align": "center",
  "verticalAlign": "middle"
}
```

### Element: shape

```json
{
  "type": "shape",
  "shape": "roundRect",
  "position": { "x": 1, "y": 1, "w": 4, "h": 2 },
  "fill": "#3498db",
  "gradient": {
    "type": "linear",
    "angle": 135,
    "stops": [
      { "color": "#3498db", "position": 0 },
      { "color": "#9b59b6", "position": 100 }
    ]
  },
  "shadow": {
    "blur": 10,
    "distance": 5,
    "angle": 45,
    "opacity": 0.5
  }
}
```

**Shape types (20+):** `rect` `roundRect` `ellipse` `triangle` `rightTriangle` `pentagon` `hexagon` `arrow` `star4` `star5` `star6` `callout` `cloud` and more — run `slidej schema` for the full list.

### Element: image

```json
{
  "type": "image",
  "src": "./assets/logo.png",
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "hyperlink": "https://example.com"
}
```

`src` accepts relative paths, absolute paths, or base64 data URIs (`data:image/png;base64,...`).

### Element: table

```json
{
  "type": "table",
  "position": { "x": 1, "y": 2, "w": 11, "h": 4 },
  "rows": [
    [
      { "text": "Header A", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" },
      { "text": "Header B", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" }
    ],
    [
      { "text": "Cell 1" },
      { "text": "Cell 2" }
    ]
  ]
}
```

### Animations

Add an `animations` array to any element:

```json
{
  "animations": [
    {
      "type": "flyIn",
      "duration": 500,
      "delay": 200,
      "trigger": "afterPrevious",
      "direction": "bottom"
    }
  ]
}
```

| Property | Values |
|----------|--------|
| `type` | See table below |
| `duration` | Milliseconds (e.g. `500`) |
| `delay` | Milliseconds before start |
| `trigger` | `onClick` `withPrevious` `afterPrevious` |
| `direction` | `top` `right` `bottom` `left` (for fly/wipe) |
| `degrees` | Rotation amount for `spin` |
| `scale` | Percentage for `growShrink` / `pulse` |

**Animation types:**

| Entrance | Exit | Emphasis |
|----------|------|----------|
| `appear` | `fadeOut` | `pulse` |
| `fadeIn` | `flyOut` | `spin` |
| `flyIn` | `wipeOut` | `growShrink` |
| `wipeIn` | `zoomOut` | |
| `zoomIn` | | |
| `bounceIn` | | |

## Library API

```javascript
const { generate, parse, listTemplates, getTemplate } = require('./src/index');

// List and use templates
const templates = listTemplates();
const pitchDeck = getTemplate('pitch-deck');

// Generate a PPTX from a JSON model object
const model = {
  width: 13.333,
  height: 7.5,
  slides: [
    {
      elements: [
        {
          type: "text",
          text: "Hello from SlideJ",
          position: { x: 1, y: 1, w: 10, h: 2 },
          fontSize: 48,
          bold: true
        }
      ]
    }
  ]
};
await generate(model, 'output.pptx');

// Parse an existing PPTX to JSON
const parsed = await parse('input.pptx');
console.log(JSON.stringify(parsed, null, 2));
```

## For AI Agents

Two main workflows for agents:

**From template** (recommended for new presentations):

1. **Browse**: `slidej template list` to find a suitable starting point
2. **Export**: `slidej template use pitch-deck -o deck.json`
3. **Customize**: Edit the JSON — change text, colors, add/remove slides
4. **Generate**: `slidej generate deck.json -o final.pptx`

**From existing PPTX** (for modifying existing decks):

1. **Read**: `slidej parse client-deck.pptx -o deck.json`
2. **Understand** the structure, styles, and animations in JSON
3. **Modify** the JSON (add slides, change text, update animations)
4. **Regenerate**: `slidej generate deck.json -o updated-deck.pptx`

An OpenAI Agent tool definition is included at `agents/openai.yaml`.

Run `slidej schema` for the complete JSON schema reference.

## Project Structure

```
src/
  cli.js                # CLI entry point
  index.js              # Library export (generate, parse, listTemplates, getTemplate)
  generators/
    index.js            # Main generate() orchestrator
    presentation.js     # presentation.xml builder
    slide.js            # Per-slide XML builder
    animation.js        # Animation timing XML
    theme.js            # Theme XML
    slide-master.js     # Slide master templates
  parsers/
    index.js            # PPTX → JSON parser
  utils/
    constants.js        # EMU conversion, shape/animation maps
    xml-helpers.js      # XML generation helpers
templates/              # Built-in templates (title-slide, pitch-deck, report, minimal, dark-modern)
agents/
  openai.yaml           # OpenAI Agent tool definition
```

## License

MIT
