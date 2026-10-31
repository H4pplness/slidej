// ============================================================
// Flex layout engine (JSON → absolutely positioned elements).
//
// Runs before the generator. Every `box` (and every slide with a `layout`)
// becomes a Yoga flex container; its children are laid out with flexbox,
// text is measured with real font metrics, and the result is flattened into
// the plain `shape` / `text` / `image` / … elements the generator already
// understands. Elements with an explicit `position` keep working as before.
// ============================================================

const fs = require('fs');
const path = require('path');
const { FontBook, measureParagraphs } = require('./fonts');
const { resolveStyle, inheritText, edges } = require('./style');
const { expandComponents, COMPONENT_TYPES } = require('../generators/components');

let yogaPromise = null;
function loadYoga() {
  if (!yogaPromise) yogaPromise = import('yoga-layout/load').then(m => m.loadYoga());
  return yogaPromise;
}

// Default heights (inches) for components placed in a flex flow without one.
const COMPONENT_HEIGHT = { progressBar: 0.4, ratingStars: 0.6, processFlow: 0.9, timeline: 2, barChart: 3, kpiCard: 1.4 };
const TABLE_INSET_X = 0.1;
const TABLE_INSET_Y = 0.05;
const SHAPE_INSET_X = 0.1;
const SHAPE_INSET_Y = 0.05;
const round = v => Math.round(v * 10000) / 10000;

function usesLayout(model) {
  const hasBox = els => (els || []).some(el => el && (el.type === 'box' || hasBox(el.children)));
  return (model.slides || []).some(s => s.layout || hasBox(s.elements));
}

/**
 * Resolve every flex layout in the model. Returns a new model; the input is not modified.
 * @returns {Promise<{model: object, warnings: string[]}>}
 */
async function applyLayout(input, { baseDir = process.cwd() } = {}) {
  const warnings = [];
  if (!usesLayout(input)) return { model: input, warnings };

  const Y = await loadYoga();
  const model = JSON.parse(JSON.stringify(input));
  const ctx = {
    Y,
    config: Y.Config.create(),
    styles: model.styles || {},
    book: new FontBook(model.fonts || {}, baseDir),
    defaultFont: (model.theme && model.theme.minorFont) || 'Calibri',
    baseDir,
    warn: msg => warnings.push(msg),
  };
  ctx.config.setPointScaleFactor(0); // no pixel rounding: we work in inches

  const W = model.width || 13.333;
  const H = model.height || 7.5;

  model.slides.forEach((slide, si) => {
    const where = `slide ${si + 1}`;
    const elements = slide.elements || [];
    const out = [];

    if (slide.layout) {
      // The slide itself is the root flex container; elements without
      // `position` flow inside it, the others stay absolutely positioned.
      const { class: cls, ...layoutStyle } = slide.layout;
      const rootEl = { type: 'box', class: cls, style: layoutStyle };
      const flow = elements.filter(el => !el.position);
      const root = build(ctx, rootEl, {}, where, flow);
      root.node.setWidth(W);
      root.node.setHeight(H);
      root.node.calculateLayout(W, H, Y.DIRECTION_LTR);
      checkOverflow(ctx, root);
      const emitted = new Map();
      root.children.forEach(c => emitted.set(c.el, emit(ctx, c, 0, 0)));
      for (const el of elements) {
        if (el.position) out.push(...(el.type === 'box' ? layoutStandalone(ctx, el, where) : [el]));
        else out.push(...emitted.get(el));
      }
      root.node.freeRecursive();
      delete slide.layout;
    } else {
      elements.forEach((el, ei) => {
        if (el.type === 'box') {
          if (!el.position) ctx.warn(`${where} el ${ei}: a box needs "position" unless the slide has a "layout"`);
          out.push(...layoutStandalone(ctx, el, `${where} el ${ei}`));
        } else out.push(el);
      });
    }
    slide.elements = out;
  });

  for (const fam of ctx.book.missing) {
    ctx.warn(`font "${fam}" not found on this machine; its text was measured with an estimate. ` +
      'Add it under "fonts": { "<family>": "path/to/font.ttf" } or set SLIDEJ_FONT_DIRS.');
  }
  delete model.styles;
  delete model.fonts;
  return { model, warnings };
}

// A box placed with `position` {x, y, w, h?}: lay out its subtree inside that rect.
function layoutStandalone(ctx, el, where) {
  const pos = el.position || { x: 0, y: 0, w: 4 };
  const lnode = build(ctx, { ...el, position: undefined }, {}, where);
  lnode.node.setWidth(pos.w);
  if (pos.h != null) lnode.node.setHeight(pos.h);
  lnode.node.calculateLayout(pos.w, pos.h != null ? pos.h : undefined, ctx.Y.DIRECTION_LTR);
  const result = emit(ctx, lnode, pos.x, pos.y);
  lnode.node.freeRecursive();
  return result;
}

// ------------------------------------------------------------
// Tree building
// ------------------------------------------------------------

function build(ctx, el, inherited, where, childOverride, parentIsRow = false) {
  const { Y } = ctx;
  const style = resolveStyle(el, ctx.styles, ctx.warn, where);
  const node = Y.Node.create(ctx.config);
  const lnode = { el, style, inherited, node, children: [], where };

  // CSS never shrinks an item below its content height (min-height: auto),
  // but Yoga would. Emulate it: items shrink along a row (so text wraps),
  // not along a column (so text keeps its full height).
  node.setFlexShrink(parentIsRow ? 1 : 0);
  applyLayoutStyle(ctx, node, style, where);

  if (el.type === 'box') {
    const childInherited = inheritText(inherited, style);
    const isRow = /^row/.test(style.flexDirection || 'column');
    const kids = childOverride || el.children || [];
    kids.forEach((child, i) => {
      const w = `${where} > ${child.name || child.type}[${i}]`;
      let c = child;
      if (child.position) {
        // Legacy absolute rect inside a box: treat as position:absolute in the box.
        const p = child.position;
        c = { ...child, position: undefined, style: { ...child.style, position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h } };
      }
      const cl = build(ctx, c, childInherited, w, undefined, isRow);
      node.insertChild(cl.node, i);
      lnode.children.push(cl);
    });
    return lnode;
  }

  if (el.type === 'text') {
    const paras = paragraphs(ctx, el, style, inherited);
    node.setMeasureFunc((width, wMode) => measureText(ctx, paras, width, wMode));
  } else if (el.type === 'shape') {
    if (el.text && style.height === undefined && style.flexGrow === undefined && style.aspectRatio === undefined) {
      const paras = paragraphs(ctx, el, style, inherited);
      node.setMeasureFunc((width, wMode) => {
        const free = wMode === Y.MEASURE_MODE_UNDEFINED || !isFinite(width);
        const m = measureParagraphs(ctx.book, paras, free ? Infinity : width - 2 * SHAPE_INSET_X);
        const natural = m.width + 2 * SHAPE_INSET_X;
        const w = wMode === Y.MEASURE_MODE_EXACTLY ? width : free ? natural : Math.min(width, natural);
        return { width: w, height: m.height + 2 * SHAPE_INSET_Y };
      });
    } else if (style.width === undefined && style.height === undefined && style.flexGrow === undefined) {
      ctx.warn(`${where}: shape in a flex layout has no size; set style width/height or grow`);
    }
  } else if (el.type === 'image') {
    if (style.aspectRatio === undefined && (style.width === undefined || style.height === undefined)) {
      const size = imageSize(el.src, ctx.baseDir);
      if (size) node.setAspectRatio(size.w / size.h);
      else ctx.warn(`${where}: cannot read image size; set style width and height (or aspectRatio)`);
    }
  } else if (el.type === 'table') {
    if (style.height === undefined) node.setMeasureFunc((width, wMode) => measureTable(ctx, el, style, inherited, width, wMode));
  } else if (COMPONENT_TYPES.includes(el.type)) {
    if (style.height === undefined && style.flexGrow === undefined && style.aspectRatio === undefined) {
      if (el.type === 'progressRing') node.setAspectRatio(1);
      else node.setHeight(COMPONENT_HEIGHT[el.type] || 1);
    }
  } else if (el.type === 'group') {
    ctx.warn(`${where}: "group" is not supported inside a flex layout; use a box with animations instead`);
  } else {
    ctx.warn(`${where}: unknown element type "${el.type}"`);
  }
  return lnode;
}

const DIRECTION = { row: 'FLEX_DIRECTION_ROW', column: 'FLEX_DIRECTION_COLUMN', 'row-reverse': 'FLEX_DIRECTION_ROW_REVERSE', 'column-reverse': 'FLEX_DIRECTION_COLUMN_REVERSE' };
const JUSTIFY = { start: 'JUSTIFY_FLEX_START', 'flex-start': 'JUSTIFY_FLEX_START', center: 'JUSTIFY_CENTER', end: 'JUSTIFY_FLEX_END', 'flex-end': 'JUSTIFY_FLEX_END', 'space-between': 'JUSTIFY_SPACE_BETWEEN', 'space-around': 'JUSTIFY_SPACE_AROUND', 'space-evenly': 'JUSTIFY_SPACE_EVENLY' };
const ALIGN = { auto: 'ALIGN_AUTO', start: 'ALIGN_FLEX_START', 'flex-start': 'ALIGN_FLEX_START', center: 'ALIGN_CENTER', end: 'ALIGN_FLEX_END', 'flex-end': 'ALIGN_FLEX_END', stretch: 'ALIGN_STRETCH', baseline: 'ALIGN_BASELINE', 'space-between': 'ALIGN_SPACE_BETWEEN', 'space-around': 'ALIGN_SPACE_AROUND', 'space-evenly': 'ALIGN_SPACE_EVENLY' };
const WRAP = { true: 'WRAP_WRAP', wrap: 'WRAP_WRAP', false: 'WRAP_NO_WRAP', nowrap: 'WRAP_NO_WRAP', 'wrap-reverse': 'WRAP_WRAP_REVERSE' };
const EDGE = { top: 'EDGE_TOP', right: 'EDGE_RIGHT', bottom: 'EDGE_BOTTOM', left: 'EDGE_LEFT' };

function applyLayoutStyle(ctx, node, s, where) {
  const { Y } = ctx;
  const enumOf = (table, value, prop) => {
    const k = table[String(value)];
    if (!k) { ctx.warn(`${where}: invalid ${prop} "${value}" (expected ${Object.keys(table).join(', ')})`); return undefined; }
    return Y[k];
  };
  const len = (setter, value, prop) => {
    if (value === undefined) return;
    if (typeof value === 'number' || value === 'auto' || /^-?\d+(\.\d+)?%$/.test(value)) setter(value);
    else ctx.warn(`${where}: invalid ${prop} "${value}" (use inches, "50%" or "auto")`);
  };

  len(v => node.setWidth(v), s.width, 'width');
  len(v => node.setHeight(v), s.height, 'height');
  len(v => node.setMinWidth(v), s.minWidth, 'minWidth');
  len(v => node.setMaxWidth(v), s.maxWidth, 'maxWidth');
  len(v => node.setMinHeight(v), s.minHeight, 'minHeight');
  len(v => node.setMaxHeight(v), s.maxHeight, 'maxHeight');
  if (s.aspectRatio !== undefined) node.setAspectRatio(s.aspectRatio);

  if (s.flexDirection !== undefined) { const v = enumOf(DIRECTION, s.flexDirection, 'direction'); if (v !== undefined) node.setFlexDirection(v); }
  if (s.justifyContent !== undefined) { const v = enumOf(JUSTIFY, s.justifyContent, 'justifyContent'); if (v !== undefined) node.setJustifyContent(v); }
  if (s.alignItems !== undefined) { const v = enumOf(ALIGN, s.alignItems, 'alignItems'); if (v !== undefined) node.setAlignItems(v); }
  if (s.alignSelf !== undefined) { const v = enumOf(ALIGN, s.alignSelf, 'alignSelf'); if (v !== undefined) node.setAlignSelf(v); }
  if (s.alignContent !== undefined) { const v = enumOf(ALIGN, s.alignContent, 'alignContent'); if (v !== undefined) node.setAlignContent(v); }
  if (s.flexWrap !== undefined) { const v = enumOf(WRAP, s.flexWrap, 'wrap'); if (v !== undefined) node.setFlexWrap(v); }
  if (s.flexGrow !== undefined) node.setFlexGrow(s.flexGrow);
  if (s.flexShrink !== undefined) node.setFlexShrink(s.flexShrink);
  len(v => node.setFlexBasis(v), s.flexBasis, 'basis');

  if (s.gap !== undefined) node.setGap(Y.GUTTER_ALL, s.gap);
  if (s.rowGap !== undefined) node.setGap(Y.GUTTER_ROW, s.rowGap);
  if (s.columnGap !== undefined) node.setGap(Y.GUTTER_COLUMN, s.columnGap);

  const pad = edges(s, 'padding');
  const mar = edges(s, 'margin');
  for (const side of Object.keys(EDGE)) {
    len(v => node.setPadding(Y[EDGE[side]], v), pad[side], `padding ${side}`);
    len(v => node.setMargin(Y[EDGE[side]], v), mar[side], `margin ${side}`);
    if (s[side] !== undefined) len(v => node.setPosition(Y[EDGE[side]], v), s[side], side);
  }
  const bw = borderInches(s);
  if (bw) node.setBorder(Y.EDGE_ALL, bw);

  if (s.position === 'absolute') node.setPositionType(Y.POSITION_TYPE_ABSOLUTE);
  else if (s.position !== undefined && s.position !== 'relative') ctx.warn(`${where}: invalid position "${s.position}" (use "relative" or "absolute")`);
}

const borderInches = s => (s.border && s.border.width ? s.border.width / 72 : 0);

// ------------------------------------------------------------
// Text
// ------------------------------------------------------------

// Effective text props: element props > own style > inherited from boxes.
function textProps(ctx, el, style, inherited) {
  const pick = k => (el[k] !== undefined ? el[k] : style[k] !== undefined ? style[k] : inherited[k]);
  return {
    fontSize: pick('fontSize') || 18,
    fontFamily: pick('fontFamily') || ctx.defaultFont,
    color: pick('color'),
    bold: pick('bold'),
    italic: pick('italic'),
    underline: pick('underline'),
    letterSpacing: pick('letterSpacing'),
    lineSpacing: pick('lineSpacing'),
    align: el.align !== undefined ? el.align : style.textAlign !== undefined ? style.textAlign : inherited.textAlign,
    vertAlign: el.vertAlign !== undefined ? el.vertAlign : style.verticalAlign !== undefined ? style.verticalAlign : inherited.verticalAlign,
  };
}

function paragraphs(ctx, el, style, inherited) {
  const base = textProps(ctx, el, style, inherited);
  const run = (r = {}) => ({
    text: r.text,
    fontSize: r.fontSize || base.fontSize,
    fontFamily: r.fontFamily || base.fontFamily,
    bold: r.bold !== undefined ? r.bold : base.bold,
    italic: r.italic !== undefined ? r.italic : base.italic,
    letterSpacing: r.letterSpacing !== undefined ? r.letterSpacing : base.letterSpacing,
  });
  const list = typeof el.text === 'string' ? [el.text] : Array.isArray(el.text) ? el.text : [String(el.text == null ? '' : el.text)];
  return list.map(p => {
    if (typeof p === 'string') return { runs: [run({ text: p })], lineSpacing: base.lineSpacing };
    if (p.runs) return { runs: p.runs.map(r => run({ ...p, ...r })), lineSpacing: p.lineSpacing || base.lineSpacing };
    return { runs: [run(p)], lineSpacing: p.lineSpacing || base.lineSpacing };
  });
}

function measureText(ctx, paras, width, wMode) {
  const { Y } = ctx;
  const maxW = wMode === Y.MEASURE_MODE_UNDEFINED || !isFinite(width) ? Infinity : width;
  const m = measureParagraphs(ctx.book, paras, maxW);
  let w = m.width;
  if (wMode === Y.MEASURE_MODE_EXACTLY) w = width;
  else if (wMode === Y.MEASURE_MODE_AT_MOST) w = Math.min(width, m.width);
  return { width: w, height: m.height };
}

function measureTable(ctx, el, style, inherited, width, wMode) {
  const { Y } = ctx;
  const rows = el.rows || [];
  const w = wMode === Y.MEASURE_MODE_UNDEFINED ? 6 : width;
  if (!rows.length) return { width: w, height: 0 };
  const colW = w / rows[0].length - 2 * TABLE_INSET_X;
  const props = textProps(ctx, el, style, inherited);
  let rowH = 0;
  rows.forEach((row, r) => row.forEach(raw => {
    const cell = typeof raw === 'string' ? { text: raw } : raw || {};
    const run = {
      text: cell.text || '',
      fontSize: cell.fontSize || el.fontSize || 14,
      fontFamily: props.fontFamily,
      bold: cell.bold || (r === 0 && el.headerRow),
    };
    const m = measureParagraphs(ctx.book, [{ runs: [run] }], colW);
    rowH = Math.max(rowH, m.height + 2 * TABLE_INSET_Y);
  }));
  // The generator gives every row the same height.
  return { width: w, height: rowH * rows.length };
}

// ------------------------------------------------------------
// Emission: layout tree → absolute elements
// ------------------------------------------------------------

function emit(ctx, lnode, offX, offY) {
  const { el, style, inherited, node } = lnode;
  const l = computed(ctx.Y, node);
  const rect = { x: round(offX + l.left), y: round(offY + l.top), w: round(l.width), h: round(l.height) };
  const out = [];

  if (el.type === 'box') {
    const deco = decoration(style, rect, el.name);
    if (deco) out.push(deco);
    checkOverflow(ctx, lnode);
    for (const c of lnode.children) out.push(...emit(ctx, c, rect.x, rect.y));
    if (el.animations && el.animations.length) return [asGroup(ctx, el, rect, out)];
    return out;
  }

  const base = { ...el };
  delete base.style;
  delete base.class;
  base.position = rect;

  if (el.type === 'text') {
    const t = textProps(ctx, el, style, inherited);
    const innerW = l.width - l.paddingLeft - l.paddingRight - l.borderLeft - l.borderRight;
    const innerH = l.height - l.paddingTop - l.paddingBottom - l.borderTop - l.borderBottom;
    const need = measureParagraphs(ctx.book, paragraphs(ctx, el, style, inherited), innerW).height;
    if (need > innerH + 0.01) ctx.warn(`${lnode.where}: text needs ${need.toFixed(2)}" of height but has ${innerH.toFixed(2)}"; it will overflow`);
    for (const [k, v] of Object.entries(t)) if (v !== undefined) base[k] = v;
    const pad = edges(style, 'padding');
    const bw = borderInches(style);
    base.insets = { top: num(pad.top) + bw, right: num(pad.right) + bw, bottom: num(pad.bottom) + bw, left: num(pad.left) + bw };
    if (base.fill === undefined && style.background !== undefined) base.fill = style.background;
    if (base.line === undefined && style.border) base.line = { ...style.border };
    if (base.shadow === undefined && style.shadow) base.shadow = style.shadow;
    out.push(base);
  } else if (el.type === 'shape') {
    if (el.text) Object.assign(base, pickDefined(textProps(ctx, el, style, inherited)));
    if (base.fill === undefined && style.background !== undefined) base.fill = style.background;
    if (base.line === undefined && style.border) base.line = { ...style.border };
    if (base.shadow === undefined && style.shadow) base.shadow = style.shadow;
    if (style.radius !== undefined && (!el.shapeType || el.shapeType === 'rect' || el.shapeType === 'roundRect')) {
      base.shapeType = 'roundRect';
      base.adjust = { adj: radiusAdj(style.radius, rect) };
    }
    out.push(base);
  } else {
    if (el.type === 'table') Object.assign(base, pickDefined({ fontFamily: textProps(ctx, el, style, inherited).fontFamily }));
    out.push(base);
  }
  return out;
}

const num = v => (typeof v === 'number' ? v : 0);

// Children that do not fit spill out of their box (text is never shrunk); say so.
function checkOverflow(ctx, lnode) {
  const l = computed(ctx.Y, lnode.node);
  const innerBottom = l.height - l.paddingBottom - l.borderBottom;
  const innerRight = l.width - l.paddingRight - l.borderRight;
  for (const c of lnode.children) {
    if (c.style.position === 'absolute') continue;
    const cl = c.node.getComputedLayout();
    const overB = cl.top + cl.height - innerBottom;
    const overR = cl.left + cl.width - innerRight;
    if (overB > 0.01) ctx.warn(`${c.where}: overflows its container's bottom by ${overB.toFixed(2)}"`);
    else if (overR > 0.01) ctx.warn(`${c.where}: overflows its container's right edge by ${overR.toFixed(2)}"`);
  }
}

function computed(Y, node) {
  const l = node.getComputedLayout();
  return {
    ...l,
    paddingLeft: node.getComputedPadding(Y.EDGE_LEFT), paddingRight: node.getComputedPadding(Y.EDGE_RIGHT),
    paddingTop: node.getComputedPadding(Y.EDGE_TOP), paddingBottom: node.getComputedPadding(Y.EDGE_BOTTOM),
    borderLeft: node.getComputedBorder(Y.EDGE_LEFT), borderRight: node.getComputedBorder(Y.EDGE_RIGHT),
    borderTop: node.getComputedBorder(Y.EDGE_TOP), borderBottom: node.getComputedBorder(Y.EDGE_BOTTOM),
  };
}
const pickDefined = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const radiusAdj = (r, rect) => Math.max(0, Math.min(50000, Math.round((r / Math.max(0.0001, Math.min(rect.w, rect.h))) * 100000)));

// Background / border / shadow of a box, drawn as one shape behind its children.
function decoration(style, rect, name) {
  if (style.background === undefined && !style.border && !style.shadow) return null;
  const bw = borderInches(style);
  // CSS draws borders inside the box; PowerPoint strokes on the outline, so inset by half.
  const r = { x: round(rect.x + bw / 2), y: round(rect.y + bw / 2), w: round(rect.w - bw), h: round(rect.h - bw) };
  const shape = { type: 'shape', shapeType: style.radius ? 'roundRect' : 'rect', position: r, name: name ? `${name} bg` : undefined };
  if (style.radius) shape.adjust = { adj: radiusAdj(style.radius, r) };
  if (style.background !== undefined) shape.fill = style.background;
  else shape.noFill = true;
  if (style.border) shape.line = { ...style.border };
  if (style.shadow) shape.shadow = style.shadow;
  return shape;
}

// An animated box becomes one group so it animates as a unit.
function asGroup(ctx, el, rect, items) {
  const children = [];
  const flatten = list => {
    for (const item of expandComponents(list)) {
      if (item.type === 'group') { flatten(item.children || []); continue; }
      if (!['text', 'shape', 'image'].includes(item.type)) {
        ctx.warn(`box "${el.name || ''}": ${item.type} cannot be inside an animated box and was dropped`);
        continue;
      }
      if (item.animations && item.animations.length) {
        ctx.warn(`box "${el.name || ''}": animations on its children are ignored because the box itself is animated`);
      }
      children.push({ ...item, animations: undefined });
    }
  };
  flatten(items);
  return { type: 'group', name: el.name, position: rect, animations: el.animations, children };
}

// ------------------------------------------------------------
// Image intrinsic size (PNG, JPEG, GIF) for aspect ratio.
// ------------------------------------------------------------
function imageSize(src, baseDir) {
  if (!src) return null;
  let buf;
  try {
    if (src.startsWith('data:')) {
      const m = src.match(/^data:[^;]+;base64,(.+)$/);
      if (!m) return null;
      buf = Buffer.from(m[1], 'base64');
    } else {
      buf = fs.readFileSync(path.resolve(baseDir, src));
    }
  } catch { return null; }
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const segLen = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      }
      i += 2 + segLen;
    }
  }
  return null;
}

module.exports = { applyLayout, usesLayout };
