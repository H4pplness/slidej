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
| `slidej template list` | `tpl ls` | List available templates |
| `slidej template use <name>` | `tpl use` | Export a template as JSON for editing |
| `slidej template save <json> <name>` | `tpl save` | Save a JSON file as a reusable template |
| `slidej template info <name>` | `tpl info` | Show detailed template info |
| `slidej template remove <name>` | `tpl rm` | Remove a custom template |
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

SlideJ includes built-in templates as **style guides** — each defines a visual language (palette, layout patterns, component styles, animation approach) along with example slides. Use them as a starting point, then freely add, remove, or rearrange slides.

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

Each template includes a `guide` with palette, layout, components, animations, and customization tips.
Run `slidej template info <name>` to view the full style guide.

### Template workflow

```bash
slidej template list                        # 1. Browse templates
slidej template info pitch-deck             # 2. View style guide
slidej template use pitch-deck -o deck.json # 3. Export to JSON
# 4. Edit deck.json — change text, colors, add/remove slides
slidej generate deck.json -o deck.pptx      # 5. Generate PPTX
```

### Save your own

```bash
slidej template save deck.json my-brand -d "Company deck" -t "company,branded"
slidej template list                        # now includes my-brand
slidej template remove my-brand             # remove when done
```

Custom templates are stored in `~/.slidej/templates/` and override built-in templates with the same name.

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
const { generate, parse, listTemplates, getTemplate } = require('slidej');

// Templates
const templates = listTemplates();
const tpl = getTemplate('pitch-deck');

// Generate
await generate({ slides: [{ elements: [{ type: "text", text: "Hello", position: { x: 1, y: 1, w: 10, h: 2 } }] }] }, 'output.pptx');

// Parse
const model = await parse('input.pptx');
```

## For AI Agents

**From template** (new presentations):
```
template list → template use <name> -o deck.json → edit JSON → generate deck.json -o final.pptx
```

**From existing PPTX** (modify decks):
```
parse input.pptx -o deck.json → edit JSON → generate deck.json -o updated.pptx
```

OpenAI Agent tool definition included at `agents/openai.yaml`. Run `slidej schema` for the full JSON schema reference.

## Project Structure

```
src/
  cli.js                # CLI entry point
  index.js              # Library exports
  generators/           # JSON → PPTX engine
  parsers/              # PPTX → JSON engine
  utils/                # XML helpers, constants
templates/              # Built-in style guide templates
agents/                 # AI agent tool definitions
```

## License

MIT
