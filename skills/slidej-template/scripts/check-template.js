#!/usr/bin/env node
// Static checks for a SlideJ template (or any SlideJ deck JSON).
// Usage: node check-template.js <template.json> [--deck]
//   --deck  skip template-only checks (name, guide, archetypes)
// Exit code 1 when errors are found. No dependencies.

const fs = require('fs');
const path = require('path');

const ANIMATIONS = ['appear', 'fadeIn', 'flyIn', 'wipeIn', 'zoomIn', 'splitIn', 'bounceIn', 'floatIn', 'swivel', 'dissolveIn',
  'fadeOut', 'flyOut', 'wipeOut', 'zoomOut', 'floatOut', 'dissolveOut',
  'pulse', 'spin', 'growShrink', 'colorChange', 'transparency', 'teeter', 'blink', 'motionPath'];
const TRIGGERS = ['onClick', 'withPrevious', 'afterPrevious'];
const BY_ITEM = ['group', 'box'];
const BY_TEXT = ['paragraph', 'word', 'letter'];
const COMPONENTS = ['progressBar', 'progressRing', 'barChart', 'kpiCard', 'ratingStars', 'timeline', 'processFlow'];
const ELEMENTS = ['text', 'shape', 'image', 'table', 'group', 'box', ...COMPONENTS];
const CORE_ARCHETYPES = ['cover', 'section', 'content', 'cards', 'metrics', 'comparison', 'process', 'closing'];
const GUIDE_KEYS = ['palette', 'typography', 'layout', 'components', 'animations'];
const THEME_REF = /^(accent|dk|lt|hlink|folHlink)\d?$/;
const HEX = /^#?[0-9a-fA-F]{6}$/;
const DEFAULT_FONT_SIZE = 18;
const MIN_FONT_SIZE = 12;

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const deckMode = args.includes('--deck');
if (!file) {
  console.error('Usage: node check-template.js <template.json> [--deck]');
  process.exit(2);
}

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

let model;
try {
  model = JSON.parse(fs.readFileSync(file, 'utf-8'));
} catch (e) {
  console.error(`Cannot read ${file}: ${e.message}`);
  process.exit(1);
}
const baseDir = path.dirname(path.resolve(file));
const W = model.width || 13.333;
const H = model.height || 7.5;

// ---- Template metadata ----
if (!deckMode) {
  if (!model.name) err('root', 'missing "name"');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(model.name)) err('root', `name "${model.name}" must be lowercase with hyphens`);
  if (!model.description) warn('root', 'missing "description" (say what it is for and its tone)');
  if (!model.guide) err('root', 'missing "guide"');
  if (!model.styles) warn('root', 'no "styles": define the design system as reusable classes (see the skill)');
  else for (const k of GUIDE_KEYS) if (!model.guide[k]) warn('guide', `missing "${k}"`);
}

const slides = model.slides || [];
if (slides.length === 0) err('root', '"slides" is empty');

if (!deckMode) {
  const have = new Set(slides.map(s => s.archetype).filter(Boolean));
  const missing = CORE_ARCHETYPES.filter(a => !have.has(a));
  if (missing.length) warn('slides', `no sample for core archetype(s): ${missing.join(', ')}`);
  slides.forEach((s, i) => { if (!s.archetype) warn(`slide ${i + 1}`, 'missing "archetype"'); });
}

// ---- Helpers ----
function checkColor(where, value, { hexOnly = false } = {}) {
  if (value == null || typeof value !== 'string') return;
  if (HEX.test(value)) return;
  if (THEME_REF.test(value)) {
    if (hexOnly) err(where, `"${value}" is a theme reference; only hex works here`);
    return;
  }
  err(where, `invalid color "${value}" (use 6-digit hex)`);
}

function checkFill(where, fill, opts) {
  if (!fill) return;
  if (typeof fill === 'string') return checkColor(where, fill, opts);
  if (fill.type === 'gradient') (fill.stops || []).forEach((s, j) => checkColor(`${where} stop ${j}`, s.color, opts));
  else if (fill.color) checkColor(where, fill.color, opts);
}

function paragraphs(text) {
  if (text == null) return [];
  if (typeof text === 'string') return [{ text, size: null }];
  if (!Array.isArray(text)) return [];
  return text.map(p => {
    if (typeof p === 'string') return { text: p, size: null };
    if (p.runs) return { text: p.runs.map(r => r.text || '').join(''), size: Math.max(0, ...p.runs.map(r => r.fontSize || 0)) || p.fontSize || null };
    return { text: p.text || '', size: p.fontSize || null };
  });
}

// Rough Latin-text estimate: average glyph ≈ 0.6 × fontSize wide.
function checkTextFit(where, el) {
  const paras = paragraphs(el.text);
  if (!paras.length || !el.position) return;
  // PowerPoint's default insets are 0.1" left/right and 0.05" top/bottom.
  const marginX = el.margin != null ? el.margin : 0.1;
  const marginY = el.margin != null ? el.margin : 0.05;
  const boxW = el.position.w - 2 * marginX;
  const boxH = el.position.h - 2 * marginY;
  const spacing = el.lineSpacing || 1;
  let height = 0;
  for (const p of paras) {
    const size = p.size || el.fontSize || DEFAULT_FONT_SIZE;
    if (size < MIN_FONT_SIZE) warn(where, `font size ${size}pt is below ${MIN_FONT_SIZE}pt`);
    const perLine = Math.max(1, Math.floor((boxW * 120) / size));
    const lines = p.text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
    height += (lines * size * 1.2 * spacing) / 72;
  }
  if (height > boxH * 1.05) {
    warn(where, `text probably overflows (needs ~${height.toFixed(2)}" of ${boxH.toFixed(2)}" box height); enlarge the box, shorten the text or reduce fontSize`);
  }
}

function checkAnimations(where, el) {
  for (const [j, a] of (el.animations || []).entries()) {
    const w = `${where} anim ${j}`;
    if (!ANIMATIONS.includes(a.type)) err(w, `unknown animation "${a.type}"`);
    if (a.trigger && !TRIGGERS.includes(a.trigger)) err(w, `unknown trigger "${a.trigger}"`);
    if (['flyIn', 'flyOut', 'wipeIn', 'wipeOut'].includes(a.type) && !a.direction) warn(w, `${a.type} without "direction"`);
    if (a.duration != null && (a.duration < 100 || a.duration > 5000)) warn(w, `duration ${a.duration}ms looks off`);
    if (a.by != null) {
      const hasText = el.type === 'text' || (el.type === 'shape' && el.text);
      if (a.by === 'item') {
        if (!COMPONENTS.includes(el.type) && !BY_ITEM.includes(el.type)) err(w, `by "item" only works on components, groups and boxes, not ${el.type}`);
      } else if (BY_TEXT.includes(a.by)) {
        if (!hasText) err(w, `by "${a.by}" needs a text or a shape with text, not ${el.type}`);
      } else {
        err(w, `unknown by "${a.by}" (use item, paragraph, word or letter)`);
      }
    }
    if (a.stagger != null && (typeof a.stagger !== 'number' || a.stagger < 0)) err(w, 'stagger must be a number of ms >= 0');
    else if (a.stagger != null && !a.by) warn(w, 'stagger has no effect without "by"');
    else if (a.stagger != null && ['word', 'letter'].includes(a.by) && a.stagger > (a.duration || 500)) {
      warn(w, `stagger ${a.stagger}ms is capped at the duration for by "${a.by}"`);
    }
  }
}

// Style objects (inline or classes): only colors are checked here; property
// names and values are validated by `slidej generate`, which prints warnings.
function checkStyle(where, st) {
  if (!st) return;
  checkColor(`${where} style color`, st.color);
  checkFill(`${where} style background`, st.background);
  if (st.border) checkColor(`${where} style border`, st.border.color);
}
const STYLES = model.styles || {};
for (const [name, st] of Object.entries(STYLES)) checkStyle(`styles.${name}`, st);

// inFlow: the element sits in a flex layout (slide.layout or a box), so it
// needs no `position`; the layout engine sizes it and reports overflow.
function checkElement(where, el, inGroup, inFlow) {
  if (!ELEMENTS.includes(el.type)) return err(where, `unknown element type "${el.type}"`);
  for (const c of (Array.isArray(el.class) ? el.class : String(el.class || '').split(/\s+/)).filter(Boolean)) {
    if (!STYLES[c]) err(where, `unknown class "${c}" (not in root "styles")`);
  }
  checkStyle(where, el.style);
  const pos = el.position;
  if (el.type === 'box') {
    if (!pos && !inFlow) err(where, 'box outside a flex layout needs position {x,y,w[,h]}');
    (el.children || []).forEach((c, k) => checkElement(`${where} > ${c.name || c.type}[${k}]`, c, false, true));
    checkAnimations(where, el);
    return;
  }
  if (!pos && inFlow) {
    // Sized by the layout engine.
  } else if (!pos || [pos.x, pos.y, pos.w, pos.h].some(v => typeof v !== 'number')) {
    if (!inGroup || el.type !== 'group') err(where, 'missing numeric position {x,y,w,h}');
  } else {
    const off = pos.x < -0.001 || pos.y < -0.001 || pos.x + pos.w > W + 0.001 || pos.y + pos.h > H + 0.001;
    const hasText = el.type === 'text' || el.type === 'table' || (el.type === 'shape' && el.text) || COMPONENTS.includes(el.type);
    if (off && hasText) err(where, 'text-bearing element extends outside the slide');
    else if (!off && hasText && (pos.x < 0.3 || pos.y < 0.2 || pos.x + pos.w > W - 0.3 || pos.y + pos.h > H - 0.2)) {
      warn(where, 'text-bearing element is within 0.3" of the slide edge');
    }
  }

  checkColor(`${where} color`, el.color, { hexOnly: el.type === 'table' });
  checkFill(`${where} fill`, el.fill);
  if (el.line) checkColor(`${where} line`, el.line.color);
  if (pos && (el.type === 'text' || (el.type === 'shape' && el.text))) checkTextFit(where, el);

  if (el.type === 'image') {
    if (!el.src) err(where, 'image without "src"');
    else if (!el.src.startsWith('data:') && !fs.existsSync(path.resolve(baseDir, el.src))) warn(where, `image not found: ${el.src}`);
  }
  if (el.type === 'table') {
    (el.rows || []).forEach((row, r) => row.forEach((cell, c) => {
      if (cell && typeof cell === 'object') {
        checkColor(`${where} cell ${r},${c} color`, cell.color, { hexOnly: true });
        checkFill(`${where} cell ${r},${c} fill`, cell.fill);
      }
    }));
  }
  if (el.type === 'group') {
    (el.children || []).forEach((c, k) => {
      if (c.animations && c.animations.length) warn(`${where} child ${k}`, 'animations on group children are ignored; animate the group');
      checkElement(`${where} child ${k}`, c, true, false);
    });
  }
  checkAnimations(where, el);
}

// ---- Slides ----
slides.forEach((slide, i) => {
  const where = `slide ${i + 1}${slide.archetype ? ` (${slide.archetype})` : ''}`;
  if (slide.background != null) {
    if (typeof slide.background === 'string') checkColor(`${where} background`, slide.background, { hexOnly: true });
    else if (slide.background.type === 'gradient') checkFill(`${where} background`, slide.background, { hexOnly: true });
  }
  const els = slide.elements || [];
  if (els.length === 0) warn(where, 'no elements');
  if (slide.layout) checkStyle(`${where} layout`, slide.layout);
  els.forEach((el, j) => checkElement(`${where} el ${j}${el.name ? ` "${el.name}"` : ''}`, el, false, !!slide.layout));
});

// ---- Report ----
for (const e of errors) console.log(`ERROR  ${e}`);
for (const w of warnings) console.log(`WARN   ${w}`);
console.log(`\n${slides.length} slide(s), ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
