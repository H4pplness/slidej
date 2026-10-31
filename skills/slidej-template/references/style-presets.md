# Style presets

Nine starting points, distilled from the templates that used to ship with SlideJ (recoverable from git history before their removal). Use one as the base of a new template's `guide` when the user has no brand of their own, then adapt colors, fonts and layout to the brief. Hex values may be written with or without `#` in SlideJ JSON.

| Preset | Best for | Tone |
|---|---|---|
| `title-slide` | any slide that needs a bold, centered focal point — title screens, section dividers, or closing CTAs | dramatic, confident |
| `pitch-deck` | persuasive storytelling — pitches, proposals, product launches | confident, data-driven |
| `report` | data-heavy content — quarterly reports, reviews, dashboards, research summaries | authoritative, clear |
| `minimal` | content should speak for itself — academic talks, text-heavy presentations, simple briefings | calm, focused |
| `dark-modern` | tech products, SaaS demos, developer tools, or any topic that benefits from a modern, premium feel | sharp, futuristic |
| `sunset-wave` | creative storytelling, portfolios, brand narratives, or any presentation that needs an emotional, artistic atmosphere | dreamy, expressive, warm |
| `candy-pop` | energetic, fun presentations — events, product launches, educational content, social campaigns | joyful, bold, youthful |
| `ocean-aurora` | tech showcases, scientific presentations, environmental topics, or premium branding | immersive, elegant, expansive |
| `neon-garden` | maximum visual impact — creative agencies, art portfolios, event decks, music/entertainment | electric, rebellious, artistic |

## title-slide

Dark hero style. Use for any slide that needs a bold, centered focal point — title screens, section dividers, or closing CTAs. Tone: dramatic, confident.

- **Palette:** Dark background (#0B1D3A), white heading, muted blue subtitle (#7EB8DA), accent button (#4472C4). Swap these colors freely to match your brand.
- **Layout:** Vertically centered stack: large heading → subtitle → optional CTA button. All elements centered on the slide.
- **Components:**
  - Large bold heading (48–60pt)
  - Subtitle or tagline (20–24pt, lighter color)
  - Optional CTA roundRect button at bottom
- **Animations:** fadeIn for text, flyIn from bottom for CTA. Use afterPrevious with short delays for staggered reveal.
- **Customization:** Add background gradient, decorative ellipses, or a logo image. Duplicate this slide as a section divider between content sections.
- **Theme fonts:** Calibri Light / Calibri

## pitch-deck

Professional dark-to-light style. Use for persuasive storytelling — pitches, proposals, product launches. Follows a narrative arc: hook → problem → solution → proof → CTA. Tone: confident, data-driven.

- **Palette:** Dark hero slides (#0B1D3A), white content slides, accent gradients (purple #6C5CE7, green #00B894, blue #0984E3). Cards use gradient fills with matching shadows.
- **Layout:** Hero slides: centered text stack. Content slides: section title at top + 2-column or 3-column card grid below. Metric slides: equal-width roundRect cards with large numbers.
- **Components:**
  - Centered hero heading (48–56pt)
  - Section title (36pt bold, top-aligned)
  - roundRect cards with gradient fill (icon-title-description pattern)
  - Metric cards: big number + label
  - Italic summary text below content
- **Animations:** fadeIn for titles, flyIn (left/right/bottom) for cards with staggered delays (200ms). zoomIn for metric numbers. afterPrevious trigger throughout.
- **Customization:** Add or remove slides freely. Insert table slides for comparisons, image slides for product shots, or extra card rows. Adjust the narrative arc to fit your story — the pattern (hook → evidence → ask) works at any length.
- **Theme fonts:** Calibri Light / Calibri

## report

Clean corporate style. Use for data-heavy content — quarterly reports, reviews, dashboards, research summaries. Emphasizes readability, tables, and structured KPI cards. Tone: authoritative, clear.

- **Palette:** White content backgrounds, dark header (#2C3E50), blue accent line (#3498DB), light gray card backgrounds (#F8F9FA) with subtle borders (#E0E0E0). KPI numbers use semantic colors (green for positive, blue for neutral, purple for highlights).
- **Layout:** Cover: split layout (dark left panel + right-aligned title). Content slides: section title + thin accent line + content area. Use 3-column KPI cards above, full-width tables below.
- **Components:**
  - Split-panel cover (shape + text)
  - Section heading with accent underline (rect 0.05h)
  - KPI cards: roundRect with label-number-delta pattern
  - Styled tables with headerRow, dark headers, alternating context
  - Bullet-point text blocks in 2-column layout for pros/cons or highlights/areas
- **Animations:** Subtle fadeIn only (400–500ms). No fly or zoom — keep it professional. Stagger cards with 150ms delays.
- **Customization:** Add as many data slides as needed. Mix KPI cards with tables. Use 2-column bullet layouts for qualitative analysis. The accent line + heading pattern works for any section title.
- **Theme fonts:** Calibri Light / Calibri

## minimal

Ultra-clean whitespace style. Use when content should speak for itself — academic talks, text-heavy presentations, simple briefings. No gradients, no decoration, just typography and space. Tone: calm, focused.

- **Palette:** White background, near-black text (#1A1A1A), gray subtitles (#999999), medium gray body (#444444). Single dark accent line (#333333) as the only decoration.
- **Layout:** Left-aligned everything. Title slides: heading + thin horizontal rule + subtitle. Content slides: heading + thin rule + bullet list with generous line spacing. Closing: same as title.
- **Components:**
  - Left-aligned heading (48pt bold)
  - Thin accent line (rect, 3" wide, 0.06" tall)
  - Subtitle or date text (20pt gray)
  - Bullet-point text blocks with 1.6x line spacing
  - Simple closing text with contact info
- **Animations:** fadeIn only, short durations (400–600ms). Minimal delay. Keep it quiet and understated.
- **Customization:** Add content slides by repeating the heading + rule + body pattern. For two-column layouts, place two text blocks side by side. Avoid shapes and gradients to maintain the minimal aesthetic — if you need emphasis, use bold or a slightly larger font size.
- **Theme fonts:** Calibri Light / Calibri

## dark-modern

Sleek dark UI style with gradient accents. Use for tech products, SaaS demos, developer tools, or any topic that benefits from a modern, premium feel. Tone: sharp, futuristic.

- **Palette:** Near-black backgrounds (#0A0A1A, #12122B), white text, gradient accents (purple-to-cyan #7C4DFF→#00D2FF, or green #00B894). Card backgrounds slightly lighter than slide bg (#12122B) with colored borders.
- **Layout:** Hero: left-aligned title + decorative ellipse overflow on right. Content: centered title + 3-column cards with colored borders. Closing: centered CTA with gradient button.
- **Components:**
  - Large left-aligned heading (54pt)
  - Decorative gradient ellipse (partially off-screen for visual weight)
  - Dark cards with colored borders (line property) and title-description text
  - Gradient CTA buttons (roundRect)
  - Centered closing heading with contact info
- **Animations:** fadeIn for headings, flyIn from bottom for cards (staggered 200ms), zoomIn for CTA buttons. Push transitions between content slides.
- **Customization:** Add feature slides by repeating the card grid pattern. Use 2-column or 4-column layouts. Add code snippet text blocks with monospace font. The border-color-per-card pattern creates visual hierarchy without heavy fills.
- **Theme fonts:** Calibri Light / Calibri

## sunset-wave

Warm gradient style with layered organic shapes. Use for creative storytelling, portfolios, brand narratives, or any presentation that needs an emotional, artistic atmosphere. Tone: dreamy, expressive, warm.

- **Palette:** Dark plum backgrounds (#2D1B33, #6B2D5B), warm gradient fills (gold #FFD93D → coral #FF6B6B, magenta #C850C0 → indigo #4158D0, blue #4158D0 → cyan #0ABDE3). Text: white headings, soft warm subtitles (#FFD4C4).
- **Layout:** Hero: left-aligned title with large decorative ellipses bleeding off edges. Content: centered title + 3-column tall cards with gradient fills, each card a 'chapter' or category. Closing: centered CTA with warm gradient button.
- **Components:**
  - Large decorative ellipses (partially off-screen, gradient fill) for visual depth
  - Tall gradient cards (roundRect) with chapter-number-title-description pattern
  - Rainbow accent line (multi-stop gradient rect) as section divider
  - Warm gradient CTA buttons with dark text
  - Left-aligned or centered headings (48–56pt)
- **Animations:** fadeIn for headings (800–1000ms, slower for dreamy feel), flyIn from sides for cards, zoomIn for CTA. Use longer durations and delays than other templates.
- **Customization:** Stack more chapter cards or use 2-column layouts. Add image elements for portfolio pieces. The layered ellipses can be repositioned to frame any content. Use the rainbow accent line between any sections.
- **Theme fonts:** Calibri Light / Calibri

## candy-pop

Bold pop-art style on white backgrounds. Use for energetic, fun presentations — events, product launches, educational content, social campaigns. High contrast, playful geometry. Tone: joyful, bold, youthful.

- **Palette:** White backgrounds, dark text (#1A1A2E). Five candy accent colors: hot pink #FF2D87, electric blue #00C9FF, lime #7CFF6B, sunny yellow #FFD93D, violet #A855F7. Use them in rotation for visual variety.
- **Layout:** Hero: centered large title with decorative ellipses bleeding off all 4 corners. Content: centered title + 3-column solid-color cards. Process: numbered circles (ellipse) connected by arrow shapes. Closing: dark bg with gradient blobs.
- **Components:**
  - Large decorative ellipses (solid candy colors, partially off-screen) as corner accents
  - Solid-color roundRect cards with matching color-tinted shadows
  - Numbered ellipse circles for process/step flows
  - Arrow shapes (rightArrow) as step connectors
  - Rainbow gradient bars (5-stop rect) as top/bottom borders
  - Gradient CTA buttons (multi-stop candy rainbow)
- **Animations:** zoomIn and bounceIn for emphasis. flyIn from bottom for cards (staggered). fadeIn for connectors. Keep durations snappy (500–600ms) to match the energetic vibe.
- **Customization:** Use any number of the 5 accent colors. Add more process steps by repeating circle + arrow pairs. The corner-ellipse pattern works on any slide for instant visual energy. For darker slides, flip to dark bg with gradient ellipses.
- **Theme fonts:** Calibri Light / Calibri

## ocean-aurora

Deep cool-tone style with ethereal glow accents. Use for tech showcases, scientific presentations, environmental topics, or premium branding. Layered gradients create depth and atmosphere. Tone: immersive, elegant, expansive.

- **Palette:** Deep navy backgrounds (#001233, #001845, #023E7D). Aurora accent spectrum: teal #00F5D4, cyan #00BBF9, violet #9B5DE5, rose #F15BB5. Cards use very dark fill (#011A3B) with colored borders for glow effect.
- **Layout:** Hero: centered title with large aurora ellipses (gradient, rotated, bleeding off edges). Content: centered title + accent underline + 2x2 or 3-column grid of dark cards with colored borders. Process: 3-column tall gradient cards.
- **Components:**
  - Large rotated gradient ellipses as aurora background effects
  - Thin gradient accent lines (multi-stop rect) as section dividers
  - Dark metric cards with colored borders and label-bigNumber-subtitle pattern
  - Tall gradient cards (teal→cyan→violet→rose progression) for process steps
  - Monochrome CTA buttons with gradient fill
- **Animations:** fadeIn for most content (500–600ms). wipeIn for accent lines. flyIn from bottom for process cards. Use the glow shadow (blur: 20, distance: 0) on gradient cards for ethereal effect.
- **Customization:** The aurora ellipses can be layered at different positions and rotations for unique backgrounds. Cycle through the 4 accent colors for card borders to create rainbow progression. Add data tables with dark-themed cell fills. The dark-card-with-glow pattern scales to any grid size.
- **Theme fonts:** Calibri Light / Calibri

## neon-garden

High-contrast neon-on-black style. Use for maximum visual impact — creative agencies, art portfolios, event decks, music/entertainment. Each element glows against the dark canvas. Tone: electric, rebellious, artistic.

- **Palette:** Pure black background (#0A0A0A), dark card fills (#141414). Four neon accents: lime #39FF14, hot pink #FF6EC7, tangerine #FF5F1F, violet #BF40BF. Each color has a matching glow shadow (same color, opacity 20–50%, blur 15–25).
- **Layout:** Hero: left-aligned title with massive gradient ellipses bleeding off edges. Content: centered title + 4-column narrow cards with neon borders (one color per card). Metrics: large gradient ellipses with centered numbers. Closing: full-bleed gradient ellipse with dark text.
- **Components:**
  - Gradient ellipses (multi-stop neon colors) as hero decorations
  - Narrow tall cards with neon borders and matching glow shadows
  - Large ellipses with gradient fill for metric/stat displays
  - Rainbow gradient bars (4-stop neon) as top/bottom accents
  - Dark CTA buttons with neon text color
  - Each component uses one neon color — rotate through the 4 for variety
- **Animations:** flyIn from bottom for cards (staggered 150ms). zoomIn for metric circles. bounceIn for CTA. fadeIn for connectors. Keep it punchy (500ms).
- **Customization:** The glow shadow technique (blur: 15-25, distance: 0, color: same as border) works on any shape. Add more card columns or switch to 2-column wide cards. For text-heavy slides, use neon headings with gray (#888) body text. The 4-color rotation creates natural visual rhythm at any scale.
- **Theme fonts:** Calibri Light / Calibri
