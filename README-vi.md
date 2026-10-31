<div align="center">

# SlideJ

**JSON → PPTX. PPTX → JSON. Có Animation.**

[![npm version](https://img.shields.io/npm/v/slidej?style=flat-square&color=4472C4)](https://www.npmjs.com/package/slidej)
[![Node.js 16+](https://img.shields.io/badge/node-%3E%3D16-70AD47?style=flat-square)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-ED7D31?style=flat-square)](LICENSE)

<br>

Công cụ CLI **JSON-first** để tạo file PowerPoint (.pptx)
và phân tích ngược file PPTX trở lại thành JSON.

Thiết kế cho **AI agent** và **lập trình viên** cần tạo slide thuyết trình
có animation một cách tự động và lập trình được.

<br>

<img src="banner.png" alt="SlideJ Banner" width="80%">

</div>

<br>

## Cài đặt

```bash
npm install -g slidej               # Công cụ CLI
npx skills add H4pplness/slidej     # Skill cho AI agent local
```

## Bắt đầu nhanh

```bash
slidej example -o demo.json             # 1. Tạo file JSON mẫu
slidej generate demo.json -o demo.pptx  # 2. Tạo PPTX
slidej parse demo.pptx -o parsed.json   # 3. Phân tích ngược
slidej generate parsed.json -o edit.pptx # 4. Chỉnh sửa & tạo lại
```

## Các lệnh CLI

| Lệnh | Alias | Mô tả |
|------|-------|-------|
| `slidej generate <input.json>` | `gen` | Tạo PPTX từ file JSON |
| `slidej parse <input.pptx>` | — | Phân tích PPTX thành JSON |
| `slidej example` | — | Xuất file JSON mẫu |
| `slidej schema` | — | In tài liệu tham chiếu JSON schema đầy đủ |

### Các tùy chọn

```bash
slidej generate input.json -o output.pptx           # Tạo PPTX
slidej parse input.pptx -o output.json               # Parse ra file
slidej parse input.pptx                              # Parse ra stdout (pipe)
slidej parse input.pptx --no-images -o output.json   # Bỏ qua ảnh nhúng
slidej example -o starter.json                       # Ghi file JSON mẫu
```

## Template

SlideJ không kèm template có sẵn. Template là một file JSON deck bình thường, chứa hướng dẫn phong cách (`guide`) và mỗi kiểu bố cục một slide mẫu (cover, section, content, cards, metrics, comparison, process, closing), nên generate được như mọi deck khác.

Template do AI agent thiết kế bằng skill **`slidej-template`** (`skills/slidej-template/`). Skill này hướng dẫn:

- xác định hệ thiết kế: bảng màu, cỡ chữ, lưới, component, chuyển động
- dựng và kiểm tra slide mẫu (`scripts/check-template.js`)
- trích template từ file `.pptx` có sẵn
- tạo deck mới từ template

Skill cũng có sẵn 9 phong cách mẫu để bắt đầu (`references/style-presets.md`).

```bash
# Nhờ agent: "tạo template SlideJ cho công ty tôi, tông navy + cam"
node skills/slidej-template/scripts/check-template.js templates/acme.json  # kiểm tra
slidej generate templates/acme.json -o acme-preview.pptx                   # xem thử
```

## Định dạng JSON

### Cấu trúc cấp cao nhất

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": { "title": "Bài thuyết trình", "author": "Tác giả" },
  "theme": { "majorFont": "Calibri Light", "minorFont": "Calibri" },
  "slides": [...]
}
```

Kích thước tính bằng **inch**. Mặc định `13.333 × 7.5` là widescreen chuẩn (16:9).

### Slide

```json
{
  "background": "#1a1a2e",
  "transition": { "type": "fade", "speed": "med" },
  "elements": [...]
}
```

**Transition:** hơn 50 kiểu: các kiểu cổ điển (`fade` `push` `wipe` `split` `cover` `zoom` …), PowerPoint 2010 (`vortex` `ripple` `gallery` `flip` …), PowerPoint 2013 (`curtains` `airplane` `origami` `pageCurlSingle` …) và `morph`. Tùy chọn: `direction`, `speed` (`slow` `med` `fast`) hoặc `duration` tính bằng ms, `advanceAfter`. Kiểu mới tự lùi về fade trên PowerPoint đời cũ. Danh sách đầy đủ: `slidej schema`.

### Các loại Element

<details>
<summary><strong>Text</strong></summary>

```json
{
  "type": "text",
  "text": "Xin chào!",
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
<summary><strong>Shape</strong> — 20+ loại hình dạng</summary>

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

Loại: `rect` `roundRect` `ellipse` `triangle` `diamond` `pentagon` `hexagon` `octagon` `star5` `star6` `rightArrow` `leftArrow` `upArrow` `downArrow` `line` `cloud` `heart` `lightningBolt` `callout1` `callout2`
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

`src` nhận đường dẫn tương đối, tuyệt đối, hoặc base64 data URI.
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
      { "text": "Tiêu đề A", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" },
      { "text": "Tiêu đề B", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" }
    ],
    [ { "text": "Ô 1" }, { "text": "Ô 2" } ]
  ]
}
```
</details>

### Layout flex (box)

Thay vì tự tính `position` cho từng phần tử, lồng các phần tử vào **box** và để SlideJ
dàn trang bằng flexbox như HTML/CSS. Chữ được đo bằng font thật nên box tự giãn theo
nội dung, và `generate` sẽ cảnh báo khi có phần tử bị tràn.

```json
{
  "styles": {
    "page": { "padding": 0.6, "gap": 0.3, "color": "1A1A2E" },
    "card": { "background": "F4F6FA", "border": { "width": 1, "color": "E0E0E0" },
              "radius": 0.12, "padding": 0.3, "gap": 0.1 }
  },
  "slides": [{
    "layout": { "class": "page" },
    "elements": [
      { "type": "text", "text": "Ba lý do", "style": { "fontSize": 36, "bold": true } },
      { "type": "box", "style": { "direction": "row", "gap": 0.3 }, "children": [
        { "type": "box", "class": "card", "style": { "grow": 1, "basis": 0 }, "children": [
          { "type": "text", "text": "Nhanh", "style": { "fontSize": 22, "bold": true } },
          { "type": "text", "text": "Thẻ tự cao theo nội dung." }
        ] }
      ] }
    ]
  }]
}
```

- `box` tương đương `div`: `direction`, `gap`, `justify`, `alignItems`, `grow`, `wrap`,
  `padding`, `margin`, `width`/`height` (inch hoặc `%`), `background`, `border`, `radius`, `shadow`.
- Khai báo class dùng lại trong `styles` ở root, gắn bằng `class`; thuộc tính chữ kế thừa như CSS.
- Phần tử có `position` cố định vẫn chạy như cũ và đặt cạnh luồng flex được.
- Dùng [Yoga](https://yogalayout.dev) và [fontkit](https://github.com/foliojs/fontkit).
  Chạy `slidej schema` để xem đầy đủ thuộc tính.

### Animation

Thêm mảng `animations` vào bất kỳ element nào:

```json
{ "type": "flyIn", "duration": 500, "delay": 200, "trigger": "afterPrevious", "direction": "bottom" }
```

| Entrance (Vào) | Exit (Ra) | Emphasis (Nhấn mạnh) |
|----------------|-----------|----------------------|
| `appear` `fadeIn` `flyIn` `wipeIn` `zoomIn` `bounceIn` | `fadeOut` `flyOut` `wipeOut` `zoomOut` | `pulse` `spin` `growShrink` |

**Trigger:** `onClick` `withPrevious` `afterPrevious` — **Direction** (fly/wipe): `top` `right` `bottom` `left`

## Library API

```javascript
const { generate, parse } = require('slidej');

// Tạo PPTX
await generate({ slides: [{ elements: [{ type: "text", text: "Xin chào", position: { x: 1, y: 1, w: 10, h: 2 } }] }] }, 'output.pptx');

// Parse PPTX
const model = await parse('input.pptx');
```

## Dùng cho AI Agent

**Từ template** (bài thuyết trình mới, xem skill `slidej-template`):
```
sao chép template.json → thay nội dung mẫu → generate deck.json -o final.pptx
```

**Từ PPTX có sẵn** (chỉnh sửa):
```
parse input.pptx -o deck.json → chỉnh JSON → generate deck.json -o updated.pptx
```

Các skill cho agent nằm trong `skills/` (`slidej` cho schema và CLI, `slidej-template` cho template). Chạy `slidej schema` để xem JSON schema đầy đủ.

## Cấu trúc dự án

```
src/
  cli.js                # CLI entry point
  index.js              # Export thư viện
  layout/               # Engine layout flex (box, style, đo chữ)
  generators/           # JSON → PPTX engine
  parsers/              # PPTX → JSON engine
  utils/                # XML helpers, constants
skills/
  slidej/               # Skill cho agent: JSON schema, CLI, mẫu animation
  slidej-template/      # Skill cho agent: thiết kế, kiểm tra, tái sử dụng template
```

## Giấy phép

MIT
