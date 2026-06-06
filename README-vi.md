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
| `slidej template list` | `tpl ls` | Xem danh sách template |
| `slidej template use <name>` | `tpl use` | Xuất template thành JSON để chỉnh sửa |
| `slidej template save <json> <name>` | `tpl save` | Lưu file JSON thành template |
| `slidej template info <name>` | `tpl info` | Xem chi tiết template |
| `slidej template remove <name>` | `tpl rm` | Xóa template tùy chỉnh |
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

SlideJ có sẵn các template dưới dạng **hướng dẫn phong cách** — mỗi template định nghĩa ngôn ngữ thiết kế (bảng màu, bố cục, component, animation) kèm slide tham khảo. Dùng làm điểm khởi đầu, rồi tự do thêm, bớt, sắp xếp lại slide.

| Template | Phong cách | Tone |
|----------|-----------|------|
| `title-slide` | Hero tối, trọng tâm giữa slide | Mạnh mẽ, tự tin |
| `pitch-deck` | Chuyên nghiệp tối-sang, mạch tường thuật | Thuyết phục, dữ liệu |
| `report` | Corporate sạch, bảng biểu và KPI | Uy tín, rõ ràng |
| `minimal` | Khoảng trắng tối giản, chỉ typography | Bình tĩnh, tập trung |
| `dark-modern` | UI tối, gradient accent | Sắc nét, tương lai |
| `sunset-wave` | Gradient ấm, hình dạng organic | Mơ màng, biểu cảm |
| `candy-pop` | Pop-art, hình học sáng trên nền trắng | Vui nhộn, trẻ trung |
| `ocean-aurora` | Tông lạnh sâu, hiệu ứng glow | Chìm đắm, sang trọng |
| `neon-garden` | Neon trên nền đen, tương phản cao | Mạnh mẽ, nghệ thuật |

Mỗi template có `guide` chứa bảng màu, bố cục, component, animation và gợi ý tùy chỉnh.
Chạy `slidej template info <name>` để xem đầy đủ.

### Luồng làm việc với template

```bash
slidej template list                        # 1. Duyệt template
slidej template info pitch-deck             # 2. Xem style guide
slidej template use pitch-deck -o deck.json # 3. Xuất ra JSON
# 4. Chỉnh sửa deck.json — thay text, màu, thêm/bớt slide
slidej generate deck.json -o deck.pptx      # 5. Tạo PPTX
```

### Lưu template riêng

```bash
slidej template save deck.json my-brand -d "Template công ty" -t "company,branded"
slidej template list                        # giờ có my-brand
slidej template remove my-brand             # xóa khi không cần
```

Template tùy chỉnh lưu tại `~/.slidej/templates/`, ghi đè template built-in cùng tên.

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

**Transition:** `fade` `push` `wipe` `split` `cover` `cut` `dissolve` `random` — tốc độ: `slow` `med` `fast`

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
const { generate, parse, listTemplates, getTemplate } = require('slidej');

// Template
const templates = listTemplates();
const tpl = getTemplate('pitch-deck');

// Tạo PPTX
await generate({ slides: [{ elements: [{ type: "text", text: "Xin chào", position: { x: 1, y: 1, w: 10, h: 2 } }] }] }, 'output.pptx');

// Parse PPTX
const model = await parse('input.pptx');
```

## Dùng cho AI Agent

**Từ template** (bài thuyết trình mới):
```
template list → template use <name> -o deck.json → chỉnh JSON → generate deck.json -o final.pptx
```

**Từ PPTX có sẵn** (chỉnh sửa):
```
parse input.pptx -o deck.json → chỉnh JSON → generate deck.json -o updated.pptx
```

OpenAI Agent tool definition có sẵn tại `agents/openai.yaml`. Chạy `slidej schema` để xem JSON schema đầy đủ.

## Cấu trúc dự án

```
src/
  cli.js                # CLI entry point
  index.js              # Export thư viện
  generators/           # JSON → PPTX engine
  parsers/              # PPTX → JSON engine
  utils/                # XML helpers, constants
templates/              # Template hướng dẫn phong cách
agents/                 # AI agent tool definitions
```

## Giấy phép

MIT
