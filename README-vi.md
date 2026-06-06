# SlideJ

Công cụ CLI tạo file PowerPoint (.pptx) từ JSON và phân tích ngược file PPTX thành JSON. Được thiết kế cho AI agent và lập trình viên cần tạo slide thuyết trình có animation một cách tự động, lập trình được.

## Tính năng

- **JSON → PPTX** — Tạo file PowerPoint từ cấu trúc JSON
- **PPTX → JSON** — Phân tích file PPTX thành JSON để chỉnh sửa và tái tạo
- **13 loại animation** — Entrance, exit và emphasis với điều khiển thời gian chi tiết
- **8 loại transition** — fade, push, wipe, split, cover, cut, dissolve, random
- **Đa dạng element** — text, shape, image, table, group
- **Gradient, shadow, hyperlink**, và 20+ loại hình dạng preset
- **Hệ thống template** — Template sẵn (pitch-deck, report, minimal, dark-modern) + lưu template riêng
- **Library API** — Tích hợp như module Node.js trong dự án của bạn

## Yêu cầu

- Node.js 16+
- npm

## Cài đặt

```bash
git clone https://github.com/your-username/slidej.git
cd slidej
npm install
npm link
```

Sau khi chạy `npm link`, lệnh `slidej` có thể dùng trực tiếp từ bất kỳ thư mục nào trong terminal.

## Bắt đầu nhanh

```bash
# 1. Tạo file JSON mẫu để xem cấu trúc
slidej example -o demo.json

# 2. Tạo file PPTX từ JSON
slidej generate demo.json -o demo.pptx

# 3. Phân tích PPTX ngược lại thành JSON
slidej parse demo.pptx -o parsed.json

# 4. Chỉnh sửa parsed.json rồi tạo lại
slidej generate parsed.json -o edited.pptx
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
# Tạo PPTX
slidej generate input.json -o output.pptx

# Parse PPTX ra file JSON
slidej parse input.pptx -o output.json

# Parse và in ra stdout (tiện để pipe)
slidej parse input.pptx

# Parse không trích xuất ảnh nhúng (file nhỏ hơn)
slidej parse input.pptx --no-images -o output.json

# Ghi file JSON mẫu ra file
slidej example -o starter.json
```

## Template

SlideJ có sẵn các template dưới dạng **hướng dẫn phong cách** — mỗi template định nghĩa một ngôn ngữ thiết kế (bảng màu, bố cục, component, animation) kèm các slide tham khảo. Dùng chúng làm điểm khởi đầu, rồi tự do thêm, bớt, sắp xếp lại slide tùy theo nội dung.

### Template có sẵn

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

Mỗi template có trường `guide` chứa hướng dẫn chi tiết về bảng màu, bố cục, component tái sử dụng, phong cách animation và gợi ý tùy chỉnh. Chạy `slidej template info <name>` để xem đầy đủ.

### Luồng làm việc với template

```bash
# 1. Xem danh sách template
slidej template list

# 2. Xem chi tiết một template
slidej template info pitch-deck

# 3. Xuất template ra JSON
slidej template use pitch-deck -o my-deck.json

# 4. Chỉnh sửa my-deck.json (thay text, thêm slide, chỉnh style)

# 5. Tạo file PPTX cuối cùng
slidej generate my-deck.json -o my-deck.pptx
```

### Lưu template riêng

```bash
# Lưu bất kỳ file JSON nào làm template
slidej template save my-deck.json my-company -d "Template thương hiệu công ty" -t "company,branded"

# Template mới xuất hiện trong danh sách
slidej template list

# Xóa template tùy chỉnh
slidej template remove my-company
```

Template tùy chỉnh được lưu tại `~/.slidej/templates/` và sẽ ghi đè template built-in cùng tên.

## Định dạng JSON

### Cấu trúc cấp cao nhất

```json
{
  "width": 13.333,
  "height": 7.5,
  "meta": {
    "title": "Bài thuyết trình của tôi",
    "author": "Tên tác giả"
  },
  "theme": {
    "majorFont": "Calibri Light",
    "minorFont": "Calibri"
  },
  "slides": [ ... ]
}
```

Kích thước tính bằng **inch**. Mặc định `13.333 × 7.5` là tỉ lệ widescreen chuẩn (16:9).

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

**Loại transition:** `fade` `push` `wipe` `split` `cover` `cut` `dissolve` `random`  
**Tốc độ transition:** `slow` `med` `fast`

### Element: text

```json
{
  "type": "text",
  "text": "Xin chào!",
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

**Các loại hình dạng (20+):** `rect` `roundRect` `ellipse` `triangle` `rightTriangle` `pentagon` `hexagon` `arrow` `star4` `star5` `star6` `callout` `cloud` và nhiều hơn — chạy `slidej schema` để xem danh sách đầy đủ.

### Element: image

```json
{
  "type": "image",
  "src": "./assets/logo.png",
  "position": { "x": 1, "y": 1, "w": 4, "h": 3 },
  "hyperlink": "https://example.com"
}
```

`src` nhận đường dẫn tương đối, đường dẫn tuyệt đối, hoặc data URI base64 (`data:image/png;base64,...`).

### Element: table

```json
{
  "type": "table",
  "position": { "x": 1, "y": 2, "w": 11, "h": 4 },
  "rows": [
    [
      { "text": "Tiêu đề A", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" },
      { "text": "Tiêu đề B", "bold": true, "fill": "#2c3e50", "color": "FFFFFF" }
    ],
    [
      { "text": "Ô 1" },
      { "text": "Ô 2" }
    ]
  ]
}
```

### Animation

Thêm mảng `animations` vào bất kỳ element nào:

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

| Thuộc tính | Giá trị |
|------------|---------|
| `type` | Xem bảng bên dưới |
| `duration` | Mili giây (ví dụ: `500`) |
| `delay` | Mili giây trước khi bắt đầu |
| `trigger` | `onClick` `withPrevious` `afterPrevious` |
| `direction` | `top` `right` `bottom` `left` (cho fly/wipe) |
| `degrees` | Góc xoay cho `spin` |
| `scale` | Phần trăm cho `growShrink` / `pulse` |

**Các loại animation:**

| Entrance (Vào) | Exit (Ra) | Emphasis (Nhấn mạnh) |
|----------------|-----------|----------------------|
| `appear` | `fadeOut` | `pulse` |
| `fadeIn` | `flyOut` | `spin` |
| `flyIn` | `wipeOut` | `growShrink` |
| `wipeIn` | `zoomOut` | |
| `zoomIn` | | |
| `bounceIn` | | |

## Library API

```javascript
const { generate, parse, listTemplates, getTemplate } = require('./src/index');

// Liệt kê và sử dụng template
const templates = listTemplates();
const pitchDeck = getTemplate('pitch-deck');

// Tạo PPTX từ model JSON
const model = {
  width: 13.333,
  height: 7.5,
  slides: [
    {
      elements: [
        {
          type: "text",
          text: "Xin chào từ SlideJ",
          position: { x: 1, y: 1, w: 10, h: 2 },
          fontSize: 48,
          bold: true
        }
      ]
    }
  ]
};
await generate(model, 'output.pptx');

// Parse file PPTX thành JSON
const parsed = await parse('input.pptx');
console.log(JSON.stringify(parsed, null, 2));
```

## Dùng cho AI Agent

Hai luồng làm việc chính cho agent:

**Từ template** (khuyến nghị cho bài thuyết trình mới):

1. **Duyệt**: `slidej template list` để tìm template phù hợp
2. **Xuất**: `slidej template use pitch-deck -o deck.json`
3. **Tùy chỉnh**: Chỉnh sửa JSON — thay text, màu sắc, thêm/bớt slide
4. **Tạo**: `slidej generate deck.json -o final.pptx`

**Từ file PPTX có sẵn** (chỉnh sửa bài thuyết trình sẵn có):

1. **Đọc**: `slidej parse client-deck.pptx -o deck.json`
2. **Phân tích** cấu trúc, style và animation dưới dạng JSON
3. **Chỉnh sửa** JSON (thêm slide, thay text, cập nhật animation)
4. **Tạo lại**: `slidej generate deck.json -o updated-deck.pptx`

File định nghĩa OpenAI Agent tool có sẵn tại `agents/openai.yaml`.

Chạy `slidej schema` để xem tài liệu JSON schema đầy đủ.

## Cấu trúc dự án

```
src/
  cli.js                # CLI entry point
  index.js              # Export thư viện (generate, parse, listTemplates, getTemplate)
  generators/
    index.js            # Orchestrator chính của generate()
    presentation.js     # Xây dựng presentation.xml
    slide.js            # Xây dựng XML từng slide
    animation.js        # XML timing animation
    theme.js            # XML theme
    slide-master.js     # Template slide master
  parsers/
    index.js            # Parser PPTX → JSON
  utils/
    constants.js        # Chuyển đổi EMU, map shape/animation
    xml-helpers.js      # Helper tạo XML
templates/              # Template có sẵn (title-slide, pitch-deck, report, minimal, dark-modern)
agents/
  openai.yaml           # Định nghĩa tool cho OpenAI Agent
```

## Giấy phép

MIT
