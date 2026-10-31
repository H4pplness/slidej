<div align="center">

# SlideJ

**JSON → PPTX. PPTX → JSON. Animated.**

[![npm version](https://img.shields.io/npm/v/slidej?style=flat-square&color=4472C4)](https://www.npmjs.com/package/slidej)
[![Node.js 16+](https://img.shields.io/badge/node-%3E%3D16-70AD47?style=flat-square)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-ED7D31?style=flat-square)](LICENSE)

<br>

A **JSON-first** CLI tool for generating PowerPoint (.pptx) presentations
and parsing existing PPTX files back into JSON.

Built for **AI agents** and **developers** who need to programmatically create
animated presentations with full layout, styling, and timing control.

<br>

<img src="banner.png" alt="SlideJ Banner" width="80%">

</div>

<br>

## Installation

```bash
npm install -g slidej          # CLI tool
npx skills add H4pplness/slidej  # AI agent local skill
```

## Quick Start

```bash
slidej example -o demo.json          # 1. Generate sample JSON
slidej generate demo.json -o demo.pptx  # 2. Build the PPTX
slidej parse demo.pptx -o parsed.json   # 3. Parse it back
slidej generate parsed.json -o edit.pptx # 4. Edit & regenerate
```

## CLI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `slidej generate <input.json>` | `gen` | Create a PPTX from a JSON file |
| `slidej parse <input.pptx>` | — | Parse a PPTX into JSON |
| `slidej example` | — | Output a sample JSON file |
| `slidej schema` | — | Print the full JSON schema reference |

### Options

```bash
slidej generate input.json -o output.pptx           # Generate a PPTX
slidej parse input.pptx -o output.json               # Parse PPTX to file
slidej parse input.pptx                              # Parse to stdout (for piping)
slidej parse input.pptx --no-images -o output.json   # Skip embedded images
slidej example -o starter.json                       # Write sample JSON
```

## Templates

SlideJ does not ship templates. A template is a plain deck JSON with a style guide (`guide`) and one sample slide per layout (cover, section, content, cards, metrics, comparison, process, closing), so it generates like any other deck.

Templates are designed by an AI agent with the **`slidej-template`** skill (`skills/slidej-template/`). The skill covers:

- defining the design system: palette, typography scale, grid, components, motion
- building and validating the sample slides (`scripts/check-template.js`)
- extracting a template from an existing `.pptx`
- building a new deck from a template

It also includes nine style presets as starting points (`references/style-presets.md`).

```bash
# Ask your agent: "create a SlideJ template for my company, navy + orange"
node skills/slidej-template/scripts/check-template.js templates/acme.json  # validate
slidej generate templates/acme.json -o acme-preview.pptx                   # preview
```

## JSON Format

### Top-level structure

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": { "title": "My Presentation", "author": "Your Name" },
  "theme": { "majorFont": "Calibri Light", "minorFont": "Calibri" },
  "slides": [...]
}
```

Dimensions are in **inches**. Default `13.333 × 7.5` is standard widescreen (16:9).

### Slide

```json
{
  "background": "#1a1a2e",
  "transition": { "type": "fade", "speed": "med" },
  "elements": [...]
}
```

**Transitions:** `fade` `push` `wipe` `split` `cover` `cut` `dissolve` `random` — speed: `slow` `med` `fast`

### Elements

<details>
<summary><strong>Text</strong></summary>

```json
{
  "type": "text",
  "text": "Hello, World!",
  "position": { "x": 1, "y": 1, "w": 10, "h": 2 },
  "fontSize": 48,
  "bold": true,
  "color": "FFFFFF",
  "align": "center",
  "vertAlign": "middle",
  "letterSpacing": 5
}
```
</details>

<details>
<summary><strong>Shape</strong> — 20+ preset types</summary>

```json
{
  "type": "shape",
  "shapeType": "roundRect",
  "position": { "x": 1, "y": 1, "w": 4, "h": 2 },
  "fill": { "type": "gradient", "stops": [
    { "color": "#3498db", "position": 0 },
    { "color": "#9b59b6", "position": 100 }
  ], "angle": 135 },
  "shadow": { "blur": 10, "distance": 5, "angle": 45, "opacity": 0.5 }
}
```

Types: `rect` `roundRect` `ellipse` `triangle` `diamond` `pentagon` `hexagon` `octagon` `star5` `star6` `rightArrow` `leftArrow` `upArrow` `downArrow` `line` `cloud` `heart` `lightningBolt` `callout1` `callout2`
</details>

<details>
<summary><strong>Image</strong></summary>

```json
{
  "type": "image",
  "src": "./assets/logo.png",
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "hyperlink": "https://example.com"
}
```

`src` accepts relative paths, absolute paths, or base64 data URIs.
</details>

<details>
<summary><strong>Table</strong></summary>

```json
{
  "type": "table",
  "position": { "x": 1, "y": 2, "w": 11, "h": 4 },
  "headerRow": true,
  "rows": [
    [
      { "text": "Header A", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" },
      { "text": "Header B", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" }
    ],
    [ { "text": "Cell 1" }, { "text": "Cell 2" } ]
  ]
}
```
</details>

### Animations

Add an `animations` array to any element:

```json
{ "type": "flyIn", "duration": 500, "delay": 200, "trigger": "afterPrevious", "direction": "bottom" }
```

| Entrance | Exit | Emphasis |
|----------|------|----------|
| `appear` `fadeIn` `flyIn` `wipeIn` `zoomIn` `bounceIn` | `fadeOut` `flyOut` `wipeOut` `zoomOut` | `pulse` `spin` `growShrink` |

**Triggers:** `onClick` `withPrevious` `afterPrevious` — **Direction** (fly/wipe): `top` `right` `bottom` `left`

## Library API

```javascript
const { generate, parse } = require('slidej');

// Generate
await generate({ slides: [{ elements: [{ type: "text", text: "Hello", position: { x: 1, y: 1, w: 10, h: 2 } }] }] }, 'output.pptx');

// Parse
const model = await parse('input.pptx');
```

## For AI Agents

**From template** (new presentations, see the `slidej-template` skill):
```
copy template.json → replace sample content → generate deck.json -o final.pptx
```

**From existing PPTX** (modify decks):
```
parse input.pptx -o deck.json → edit JSON → generate deck.json -o updated.pptx
```

Agent skills live in `skills/` (`slidej` for the schema and CLI, `slidej-template` for templates). Run `slidej schema` for the full JSON schema reference.

## Project Structure

```
src/
  cli.js                # CLI entry point
  index.js              # Library exports
  generators/           # JSON → PPTX engine
  parsers/              # PPTX → JSON engine
  utils/                # XML helpers, constants
skills/
  slidej/               # Agent skill: JSON schema, CLI, animation patterns
  slidej-template/      # Agent skill: design, validate and reuse templates
```

## License

MIT
