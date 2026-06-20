// ============================================================
// High-level "self-drawn" components.
//
// Each builder receives a component element and returns a single
// `group` element whose children are primitive elements (shape/text)
// in absolute slide-inch coordinates. The component's own
// `animations`, `name` and `position` are carried onto the group so
// the whole component animates as one unit.
// ============================================================

const COMPONENT_TYPES = ['progressBar', 'progressRing', 'barChart', 'kpiCard', 'ratingStars', 'timeline', 'processFlow'];

/**
 * Expand any high-level components in an element list into primitive
 * elements. Non-component elements are passed through unchanged (same
 * reference, so internal fields set elsewhere survive).
 */
function expandComponents(elements) {
  const out = [];
  for (const el of elements) {
    if (el && COMPONENT_TYPES.includes(el.type)) {
      out.push(buildComponent(el));
    } else {
      out.push(el);
    }
  }
  return out;
}

function buildComponent(el) {
  const pos = el.position || { x: 1, y: 1, w: 4, h: 1 };
  let children;
  switch (el.type) {
    case 'progressBar':  children = buildProgressBar(el, pos); break;
    case 'progressRing': children = buildProgressRing(el, pos); break;
    case 'barChart':     children = buildBarChart(el, pos); break;
    case 'kpiCard':      children = buildKpiCard(el, pos); break;
    case 'ratingStars':  children = buildRatingStars(el, pos); break;
    case 'timeline':     children = buildTimeline(el, pos); break;
    case 'processFlow':  children = buildProcessFlow(el, pos); break;
    default:             children = [];
  }
  const group = {
    type: 'group',
    name: el.name || el.type,
    position: pos,
    children,
  };
  if (el.animations && el.animations.length) group.animations = el.animations;
  return group;
}

// ============================================================
// Helpers
// ============================================================
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v, d) => (typeof v === 'number' && !isNaN(v) ? v : d);

function shape(shapeType, position, opts = {}) {
  return { type: 'shape', shapeType, position, ...opts };
}
function text(content, position, opts = {}) {
  return { type: 'text', text: content, position, ...opts };
}

// ============================================================
// progressBar
// { value, color, trackColor, rounded, showLabel, label, textColor, fontSize }
// ============================================================
function buildProgressBar(el, pos) {
  const value = clamp(num(el.value, 0), 0, 100);
  const track = el.trackColor || 'E6E6E6';
  const fillColor = el.color || 'accent1';
  const st = el.rounded === false ? 'rect' : 'roundRect';
  const children = [];

  children.push(shape(st, { x: pos.x, y: pos.y, w: pos.w, h: pos.h }, { fill: track }));
  if (value > 0) {
    children.push(shape(st, { x: pos.x, y: pos.y, w: Math.max(pos.w * value / 100, pos.h * 0.1), h: pos.h }, { fill: fillColor }));
  }
  if (el.showLabel !== false) {
    const label = el.label != null ? el.label : `${Math.round(value)}%`;
    children.push(text(label, { x: pos.x, y: pos.y, w: pos.w, h: pos.h }, {
      fontSize: el.fontSize || Math.max(8, Math.round(pos.h * 36)),
      color: el.textColor || 'FFFFFF',
      bold: true,
      align: 'center',
      vertAlign: 'middle',
    }));
  }
  return children;
}

// ============================================================
// progressRing
// { value, color, trackColor, thickness, showLabel, textColor, fontSize }
// ============================================================
function buildProgressRing(el, pos) {
  const value = clamp(num(el.value, 0), 0, 100);
  const track = el.trackColor || 'E6E6E6';
  const fillColor = el.color || 'accent1';
  const thickness = clamp(num(el.thickness, 0.16), 0.02, 0.45);
  // Keep the ring square, centered in the box
  const d = Math.min(pos.w, pos.h);
  const box = { x: pos.x + (pos.w - d) / 2, y: pos.y + (pos.h - d) / 2, w: d, h: d };
  const children = [];

  // Track: full donut ring
  children.push(shape('donut', box, {
    fill: track,
    adjust: { adj: Math.round(thickness * 100000) },
  }));

  // Progress arc: blockArc swept by value, rotated so 0% starts at the top
  if (value > 0) {
    const sweep = Math.round(clamp(value / 100, 0, 0.9999) * 360 * 60000);
    children.push(shape('blockArc', box, {
      fill: fillColor,
      rotation: -90,
      adjust: {
        adj1: 0,
        adj2: sweep,
        adj3: Math.round(thickness * 100000),
      },
    }));
  }

  if (el.showLabel !== false) {
    children.push(text(el.label != null ? el.label : `${Math.round(value)}%`, box, {
      fontSize: el.fontSize || Math.max(10, Math.round(d * 36)),
      color: el.textColor || fillColor,
      bold: true,
      align: 'center',
      vertAlign: 'middle',
    }));
  }
  return children;
}

// ============================================================
// barChart  (vertical columns)
// { data:[..], labels:[..], colors:[..]|color, max, showValues, axis, labelColor }
// ============================================================
function buildBarChart(el, pos) {
  const data = Array.isArray(el.data) ? el.data : [];
  if (data.length === 0) return [];
  const labels = el.labels || [];
  const colors = Array.isArray(el.colors) ? el.colors : null;
  const single = el.color || 'accent1';
  const max = num(el.max, Math.max(...data, 1)) || 1;
  const labelColor = el.labelColor || '595959';

  const hasLabels = labels.length > 0;
  const labelH = hasLabels ? Math.min(0.4, pos.h * 0.18) : 0;
  const valueH = el.showValues ? Math.min(0.3, pos.h * 0.14) : 0;
  const chartTop = pos.y + valueH;
  const chartH = pos.h - labelH - valueH;
  const baselineY = chartTop + chartH;

  const slot = pos.w / data.length;
  const barW = slot * 0.6;
  const children = [];

  if (el.axis) {
    children.push(shape('rect', { x: pos.x, y: baselineY, w: pos.w, h: 0.02 }, { fill: el.axisColor || 'BFBFBF' }));
  }

  data.forEach((val, i) => {
    const h = Math.max((clamp(val, 0, max) / max) * chartH, 0.02);
    const bx = pos.x + i * slot + (slot - barW) / 2;
    const by = baselineY - h;
    const c = colors ? colors[i % colors.length] : single;
    children.push(shape('roundRect', { x: bx, y: by, w: barW, h }, {
      fill: c,
      adjust: { adj: 8000 },
    }));
    if (el.showValues) {
      children.push(text(String(val), { x: pos.x + i * slot, y: by - valueH, w: slot, h: valueH }, {
        fontSize: el.fontSize || 11, color: labelColor, align: 'center', vertAlign: 'bottom',
      }));
    }
    if (hasLabels) {
      children.push(text(String(labels[i] != null ? labels[i] : ''), { x: pos.x + i * slot, y: baselineY, w: slot, h: labelH }, {
        fontSize: el.fontSize || 11, color: labelColor, align: 'center', vertAlign: 'middle',
      }));
    }
  });
  return children;
}

// ============================================================
// kpiCard
// { value, label, delta, bg, valueColor, labelColor, deltaColor, accent, rounded }
// ============================================================
function buildKpiCard(el, pos) {
  const bg = el.bg || 'FFFFFF';
  const st = el.rounded === false ? 'rect' : 'roundRect';
  const children = [];

  children.push(shape(st, { x: pos.x, y: pos.y, w: pos.w, h: pos.h }, {
    fill: bg,
    line: el.line || { color: 'E0E0E0', width: 1 },
    shadow: el.shadow,
    adjust: { adj: 6000 },
  }));

  // Accent stripe on the left
  if (el.accent) {
    children.push(shape('rect', { x: pos.x, y: pos.y, w: Math.min(0.12, pos.w * 0.04), h: pos.h }, { fill: el.accent }));
  }

  const padX = pos.w * 0.08;
  const innerX = pos.x + padX;
  const innerW = pos.w - padX * 2;

  children.push(text(String(el.value != null ? el.value : ''), { x: innerX, y: pos.y + pos.h * 0.16, w: innerW, h: pos.h * 0.48 }, {
    fontSize: el.valueFontSize || Math.round(pos.h * 56),
    color: el.valueColor || (el.accent || '1F1F1F'),
    bold: true,
    align: el.align || 'left',
    vertAlign: 'middle',
  }));
  if (el.label != null) {
    children.push(text(String(el.label), { x: innerX, y: pos.y + pos.h * 0.62, w: innerW, h: pos.h * 0.26 }, {
      fontSize: el.labelFontSize || Math.round(pos.h * 22),
      color: el.labelColor || '808080',
      align: el.align || 'left',
      vertAlign: 'middle',
    }));
  }
  if (el.delta != null) {
    const up = String(el.delta).trim().startsWith('-') ? false : true;
    children.push(text(String(el.delta), { x: innerX, y: pos.y + pos.h * 0.08, w: innerW, h: pos.h * 0.2 }, {
      fontSize: el.deltaFontSize || Math.round(pos.h * 18),
      color: el.deltaColor || (up ? '2E9E5B' : 'D64545'),
      bold: true,
      align: 'right',
      vertAlign: 'top',
    }));
  }
  return children;
}

// ============================================================
// ratingStars
// { rating, max, color, emptyColor, gap }
// ============================================================
function buildRatingStars(el, pos) {
  const max = Math.max(1, Math.round(num(el.max, 5)));
  const rating = clamp(num(el.rating, 0), 0, max);
  const filled = el.color || 'FFC000';
  const empty = el.emptyColor || 'D9D9D9';
  const gapRatio = num(el.gap, 0.25);

  const size = Math.min(pos.h, pos.w / (max + (max - 1) * gapRatio));
  const gap = size * gapRatio;
  const totalW = max * size + (max - 1) * gap;
  const startX = pos.x + (pos.w - totalW) / 2;
  const y = pos.y + (pos.h - size) / 2;

  const children = [];
  for (let i = 0; i < max; i++) {
    const x = startX + i * (size + gap);
    children.push(shape('star5', { x, y, w: size, h: size }, { fill: i < Math.round(rating) ? filled : empty }));
  }
  return children;
}

// ============================================================
// timeline  (horizontal)
// { items:[{label, sub}|string], lineColor, dotColor, color, labelColor }
// ============================================================
function buildTimeline(el, pos) {
  const items = Array.isArray(el.items) ? el.items : [];
  if (items.length === 0) return [];
  const lineColor = el.lineColor || 'BFBFBF';
  const dotColor = el.dotColor || el.color || 'accent1';
  const labelColor = el.labelColor || '404040';

  const centerY = pos.y + pos.h / 2;
  const dot = Math.min(0.28, pos.h * 0.16);
  const children = [];

  // Connector line
  children.push(shape('rect', { x: pos.x, y: centerY - 0.015, w: pos.w, h: 0.03 }, { fill: lineColor }));

  const slot = pos.w / items.length;
  items.forEach((raw, i) => {
    const item = typeof raw === 'string' ? { label: raw } : raw;
    const cx = pos.x + slot * (i + 0.5);
    children.push(shape('ellipse', { x: cx - dot / 2, y: centerY - dot / 2, w: dot, h: dot }, {
      fill: Array.isArray(el.colors) ? el.colors[i % el.colors.length] : dotColor,
    }));
    const above = i % 2 === 0;
    const ly = above ? pos.y : centerY + dot;
    const lh = (pos.h / 2) - dot / 2;
    const lines = [{ text: String(item.label != null ? item.label : ''), bold: true, fontSize: el.fontSize || 12, color: labelColor }];
    if (item.sub != null) lines.push({ text: String(item.sub), fontSize: (el.fontSize || 12) - 2, color: '909090' });
    children.push(text(lines, { x: cx - slot / 2, y: ly, w: slot, h: lh }, {
      align: 'center', vertAlign: above ? 'bottom' : 'top',
    }));
  });
  return children;
}

// ============================================================
// processFlow  (chevron steps)
// { steps:[{label}|string], colors:[..]|color, textColor, fontSize, shape }
// ============================================================
function buildProcessFlow(el, pos) {
  const steps = Array.isArray(el.steps) ? el.steps : [];
  if (steps.length === 0) return [];
  const colors = Array.isArray(el.colors) ? el.colors
    : ['4472C4', '5B9BD5', '70AD47', 'ED7D31', 'FFC000', 'A5A5A5'];
  const single = el.color;
  const textColor = el.textColor || 'FFFFFF';
  const st = el.shape || 'chevron';

  const overlap = st === 'chevron' ? 0.12 : 0;
  const slot = pos.w / steps.length;
  const stepW = slot * (1 + overlap);
  const children = [];

  steps.forEach((raw, i) => {
    const item = typeof raw === 'string' ? { label: raw } : raw;
    const x = pos.x + i * slot - (i > 0 ? slot * overlap : 0);
    const w = i === 0 ? slot : stepW;
    const c = single || colors[i % colors.length];
    children.push(shape(st, { x, y: pos.y, w, h: pos.h }, {
      fill: c,
      text: String(item.label != null ? item.label : ''),
      fontSize: el.fontSize || 14,
      color: item.textColor || textColor,
      bold: true,
      align: 'center',
      vertAlign: 'middle',
    }));
  });
  return children;
}

module.exports = { expandComponents, COMPONENT_TYPES };
