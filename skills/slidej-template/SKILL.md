---
name: slidej-template
description: "Use this skill whenever the user wants to create, design, extract, update or reuse a presentation template / style guide / brand deck for SlideJ. A SlideJ template is a plain deck JSON (the same format `slidej generate` takes) plus a written style guide and one sample slide per layout archetype. Trigger when the user asks for 'a template', 'a theme', 'a style', 'a brand deck', 'a master deck', wants several decks to look consistent, wants to turn an existing .pptx into a reusable style, or wants to build a new deck 'in the style of' a template they already have. Works together with the `slidej` skill, which documents the JSON schema and the CLI."
---

# SlideJ Template — Agent Guide

SlideJ has **no template command and no built-in templates**. A template is
something you author: a JSON file that

1. is a **valid SlideJ deck** (it generates as-is with `slidej generate`),
2. defines its design system as **reusable style classes** (`styles`): page frame,
   type scale, cards, accents, footer…,
3. carries a **style guide** (`guide`) that tells the next agent how to stay on-style, and
4. contains **one sample slide per layout archetype** (cover, section, content, cards, …),
   built with **flex layout** (`slide.layout` + `box`), that can be copied and filled in.

The generator reads `width`, `height`, `meta`, `theme`, `styles`, `fonts` and
`slides`; every other key (`name`, `description`, `tags`, `guide`, per-slide
`archetype`) is ignored, so the template file itself stays generatable.

Why flex: boxes grow to fit their text and `slidej generate` warns when content
overflows, so a deck built from the template stays correct when the text changes.
Hand-placed coordinates break as soon as a title gets longer.

For element fields, animation types and CLI usage, see the **slidej** skill or
run `slidej schema`.

---

## 1. Template file format

```json
{
  "name": "acme-brand",
  "description": "Acme corporate style. Clean white content slides, navy hero slides, orange accent. For sales decks and quarterly reviews. Tone: confident, clear.",
  "tags": ["corporate", "light", "data"],
  "version": 1,

  "guide": {
    "palette": "Navy 0B1D3A (hero bg), white FFFFFF (content bg), surface F4F6FA (cards), text 1A1A2E / muted 6B7280, accent orange FF6B35, accent teal 00A6A6, positive 16A34A, negative DC2626.",
    "typography": "Headings: Montserrat bold (major). Body: Calibri (minor). Scale: display 54, h1 40, h2 28, body 18, caption 13. Never below 13pt.",
    "layout": "Content slides: layout class 'page' (padding 0.45/0.6/0.3, gap 0.3) = header box (kicker, h1, rule) → body box (grow 1) → footer. Columns: row box with gap 0.3, children grow 1 + basis 0.",
    "components": [
      "Header: class 'kicker' + class 'h1' + class 'rule' (1.2\" × 0.06\" orange)",
      "Card: class 'card' (F4F6FA, radius 0.12, padding 0.3, gap 0.12) → title class 'h3' + body class 'muted'",
      "KPI: class 'card' row → accent bar (width 0.08, alignSelf stretch) + value 30 bold + label 14 muted"
    ],
    "animations": "Titles fadeIn 500ms afterPrevious. Cards flyIn bottom 500ms afterPrevious, delay 150 stagger. KPIs zoomIn 400ms. Transition fade med on every slide. No emphasis effects.",
    "dos": ["One accent color per slide", "Max 6 bullets per slide"],
    "donts": ["No gradients on content slides", "No text on top of decorative shapes"],
    "customization": "Swap accent orange for the client color; keep navy. Repeat the card slide for 2- or 4-column variants using the grid above."
  },

  "width": 13.333,
  "height": 7.5,
  "meta": { "title": "Acme Template", "author": "Acme" },
  "theme": {
    "colors": { "dk1": "1A1A2E", "lt1": "FFFFFF", "dk2": "0B1D3A", "lt2": "F4F6FA",
                "accent1": "FF6B35", "accent2": "00A6A6", "accent3": "6B7280",
                "accent4": "16A34A", "accent5": "DC2626", "accent6": "3B82F6" },
    "majorFont": "Montserrat",
    "minorFont": "Calibri"
  },

  "styles": {
    "page":   { "padding": [0.45, 0.6, 0.3, 0.6], "gap": 0.3, "color": "1A1A2E", "fontFamily": "Calibri" },
    "kicker": { "fontSize": 13, "bold": true, "color": "FF6B35", "letterSpacing": 3 },
    "h1":     { "fontSize": 40, "bold": true, "fontFamily": "Montserrat" },
    "h3":     { "fontSize": 20, "bold": true },
    "muted":  { "fontSize": 16, "color": "6B7280", "lineSpacing": 1.1 },
    "rule":   { "width": 1.2, "height": 0.06, "background": "FF6B35" },
    "card":   { "background": "F4F6FA", "radius": 0.12, "padding": 0.3, "gap": 0.12 },
    "footer": { "direction": "row", "justify": "space-between", "fontSize": 12, "color": "6B7280" }
  },

  "slides": [
    { "archetype": "cards", "background": "FFFFFF", "transition": { "type": "fade", "speed": "med" },
      "layout": { "class": "page" },
      "elements": [
        { "type": "box", "name": "header", "style": { "gap": 0.1 }, "children": [
          { "type": "text", "class": "kicker", "text": "SECTION LABEL (1–3 WORDS)" },
          { "type": "text", "class": "h1", "name": "title", "text": "Slide title (max 8 words)" },
          { "type": "box", "class": "rule" } ] },
        { "type": "box", "name": "body", "style": { "direction": "row", "gap": 0.3, "grow": 1, "alignItems": "start" }, "children": [
          { "type": "box", "class": "card", "style": { "grow": 1, "basis": 0 },
            "animations": [{ "type": "flyIn", "direction": "bottom", "trigger": "afterPrevious", "duration": 500 }],
            "children": [
              { "type": "text", "class": "h3", "text": "Card title" },
              { "type": "text", "class": "muted", "text": "Card body: one or two sentences, ≤ 120 characters." } ] }
        ] },
        { "type": "box", "class": "footer", "children": [
          { "type": "text", "text": "Source / footnote" }, { "type": "text", "text": "00" } ] }
      ] },
    { "archetype": "cover", "...": "..." }
  ]
}
```

Rules for the file:
- `name`: lowercase, hyphens, no spaces. File name = `<name>.json`.
- `guide` is free text, but write it as **instructions with exact numbers** (hex, pt,
  inches, ms), not adjectives. The next agent only has this text and the samples.
- Every slide has an `archetype` key so a user of the template can find "the KPI slide".
- Sample text describes its role and limit, e.g. `"Slide title (max 6 words)"`,
  `"Card body — one sentence, ≤ 90 characters"`. This doubles as documentation.
- Give elements a `name` (`"title"`, `"card-2-body"`) so they are easy to find and replace.
- Visual decisions live in `styles`, not inline. A sample slide should mostly be
  structure (`class` + flex props); inline `style` only for one-off tweaks.
  Rebranding a template should mean editing `styles` and `theme`, nothing else.

**Where to save:** wherever the user wants. Default to `templates/<name>.json` in the
user's current project and keep assets (logo, background images) in
`templates/<name>/assets/`, referenced with paths relative to the JSON file.
Older SlideJ versions read `~/.slidej/templates/`; nothing reads it now.

---

## 2. Workflow: create a template

### Step 1 — Brief
Find out (ask only what you cannot infer):
- Purpose and audience (pitch, report, lecture, internal update…) and tone.
- Brand inputs: colors, fonts, logo, an existing deck or website to match.
- Aspect ratio (default 16:9 = 13.333 × 7.5; 4:3 = 10 × 7.5) and content language.
- Which slide types they will actually need.

No brand given → pick a starting point from `references/style-presets.md` and adapt it.

### Step 2 — Design system (write `styles` and the `guide` first)
Decide with numbers, then encode it as classes in `styles` (one class per reusable
role: `page`, `kicker`, `h1`, `h2`, `body`, `muted`, `card`, `accent-*`, `footer`…)
and describe the classes in `guide`:

| Token | What to fix | Defaults that work |
|---|---|---|
| Palette | bg, surface, text, muted text, 1–3 accents, positive/negative | Body text contrast ≥ 4.5:1 against its background |
| Typography | heading font, body font, size scale | display 54–60, h1 36–44, h2 26–32, body 16–20, caption 12–14 |
| Grid | margins, title band, content area, columns, gap | margin 0.5–0.6", gap 0.3–0.4", see column table below |
| Shape language | corner radius, borders vs fills, shadows | pick one: flat fills, outlined cards, or soft shadow — not all three |
| Motion | 1–2 entrance types, durations, stagger, transition | fadeIn/flyIn, 400–600 ms, 150–200 ms stagger, one transition type |

Columns need no math: a row box with `gap` whose children have `"grow": 1, "basis": 0`
gives N equal columns; `"grow": 2` makes one twice as wide. Absolute coordinates are
only for decoration that bleeds off-slide (big circles, corner shapes): give those a
`position` and they stay out of the flow.

Fonts are **not embedded** in the .pptx. Prefer fonts installed on the presenter's
machine (Calibri, Arial, Segoe UI, Georgia, Verdana…). For Vietnamese or other
accented text, use a font with full diacritics support. Put the fonts in
`theme.majorFont`/`minorFont` and only set `fontFamily` on an element when it differs.

### Step 3 — Sample slides (one per archetype)
Build at least the core set; add optional ones the brief calls for.

| Archetype | Core? | Contents |
|---|---|---|
| `cover` | ✔ | title, subtitle, presenter/date, logo |
| `section` | ✔ | section number + title, big visual accent |
| `content` | ✔ | title + bullet list (or title + paragraph) |
| `cards` | ✔ | title + 3 cards (icon/number, heading, body) |
| `metrics` | ✔ | title + 3–4 KPIs (`kpiCard` component or shapes) |
| `comparison` | ✔ | title + 2 columns or a styled `table` |
| `process` | ✔ | title + `processFlow` / `timeline` or numbered steps |
| `closing` | ✔ | thank-you / CTA / contact |
| `agenda`, `quote`, `image-text`, `chart`, `team` | optional | as needed |

Guidelines for the samples:
- Every content slide uses the same `layout` class and the same header structure, so
  titles land in the same place. Consistency is the template.
- Margins come from the page class padding; decorative shapes may bleed off-slide
  (absolute `position`), text never.
- Write sample text at the **maximum** length the slot should hold. If that fits without
  warnings, real content up to that length will too.
- Apply the motion rules from the guide literally, so the samples show the motion style.
- Use the built-in components (`progressBar`, `progressRing`, `barChart`, `kpiCard`,
  `ratingStars`, `timeline`, `processFlow`) instead of hand-building them.

### Step 4 — Validate
```bash
node <this-skill>/scripts/check-template.js templates/acme-brand.json   # static checks
slidej generate templates/acme-brand.json -o acme-preview.pptx          # must succeed, read its ⚠ lines
slidej parse acme-preview.pptx --no-images -o acme-roundtrip.json      # optional sanity check
```
`check-template.js` reports invalid colors, unknown classes, theme-color references
in backgrounds, boxes without a place, missing `styles`/`guide` sections and missing
core archetypes; for absolutely positioned text it also estimates overflow.
`slidej generate` lays out the flex slides and prints a ⚠ line for every unknown style
property, bad value, missing font and overflow (`slide 3 > box[1] > text[0]: overflows
its container's bottom by 0.40"`). A template is done when both are clean.

If LibreOffice is available, render and look at the slides:
`soffice --headless --convert-to pdf acme-preview.pptx`. Otherwise ask the user
to open the preview in PowerPoint.

### Step 5 — Hand over
Tell the user where the file is, list the archetypes it contains, and show the
two commands to use it (copy, generate). Delete preview files unless they want them.

---

## 3. Workflow: extract a template from an existing .pptx

```bash
slidej parse brand-deck.pptx -o raw.json            # keep images: logos come out as base64
```
1. Read `theme` (colors, fonts) and the recurring backgrounds, title positions, font sizes.
2. Pick the best example slide of each archetype; drop near-duplicates.
3. Replace real content with role descriptions; strip parser-only fields
   (`id`, `srcBase64` if present) and normalize positions to the grid you derived.
4. Write the `guide` from what you observed (exact hex/pt/inch values).
5. Validate as in step 4.

Parsing is approximate. Effects that SlideJ cannot express (masters, placeholders,
SmartArt, charts, video) are lost; rebuild them with shapes and components, or note them in `guide.donts`.

---

## 4. Workflow: build a deck from a template

1. Read the template's `guide` completely before touching slides.
2. Plan the deck: map each planned slide to an archetype.
3. Build `deck.json`: copy `width`, `height`, `theme`, `meta`, `styles` (and `fonts`);
   for each planned slide deep-copy the archetype slide and replace text/images. Add or
   remove cards, bullets or columns freely: the flex layout re-flows them. Keep classes
   and animations unless the guide's `customization` says otherwise.
4. Need a layout the template does not have? Compose it from the template's classes
   and boxes; do not invent new colors or fonts.
5. Optionally drop `name`, `description`, `tags`, `guide`, `archetype` (harmless if left).
6. `slidej generate deck.json -o deck.pptx`.

When `generate` reports an overflow, split the content across slides rather than
shrinking the font below the guide's minimum.

---

## 5. Gotchas

- **Flex boxes fit their text; absolute boxes do not.** In a flex layout text is measured
  with the real font (install it, or map it under root `fonts`, otherwise it is estimated
  and `generate` warns). For text with an absolute `position`, estimate: characters per
  line ≈ `w_inches × 120 / fontSize`, lines ≈ `h_inches × 72 / (fontSize × 1.2 × lineSpacing)`.
- **Components have fixed internal proportions.** In a flex layout give `kpiCard`,
  `barChart`, `timeline`… a height (or `grow`); for KPI-style cards with long labels a
  `box` of texts is more robust than `kpiCard`.
- **Slide `background` and table text `color` must be hex** (`"0B1D3A"` or `"#0B1D3A"`,
  also in background gradient stops). Theme references like `"accent1"` are accepted for
  element `color`, `fill`, `line`, shape gradient stops and table cell `fill`, but in a
  background or table text color they produce an invalid file.
- Prefer hex in elements too unless the user explicitly wants theme-driven recoloring.
  Hex values are easier to read in the template and parse back unchanged.
- **There are no masters or placeholders.** The PPTX contains absolutely positioned shapes, so
  "New slide" in PowerPoint will not use the template style. The sample slides are the
  template; say this to users who expect a .potx-style master.
- **Animate a box or its children, not both.** An animated box becomes one group and
  its children's animations are dropped (`generate` warns). Same for `group`.
- **The first `afterPrevious` animation on a slide auto-plays on entry.** Use it for
  titles; use `onClick` only where the presenter should control the reveal.
- **Image paths are relative to the JSON file.** Moving the template means moving
  its `assets/` folder too, or use base64 data URIs for small logos.
