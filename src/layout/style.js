// ============================================================
// Style resolution for the layout engine.
//
// An element's effective style = its classes (from model.styles, in order)
// then its inline `style`. Text properties inherit from ancestor boxes the
// way CSS inheritance works; layout and visual properties do not.
// Lengths are inches; border width is points (like `line.width`).
// ============================================================

// Short aliases accepted for the common flex properties.
const ALIASES = {
  direction: 'flexDirection',
  grow: 'flexGrow',
  shrink: 'flexShrink',
  basis: 'flexBasis',
  justify: 'justifyContent',
  wrap: 'flexWrap',
};

const LAYOUT_KEYS = [
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'aspectRatio',
  'flexDirection', 'flexGrow', 'flexShrink', 'flexBasis', 'flexWrap',
  'justifyContent', 'alignItems', 'alignSelf', 'alignContent',
  'gap', 'rowGap', 'columnGap',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'position', 'top', 'right', 'bottom', 'left',
];
const VISUAL_KEYS = ['background', 'border', 'radius', 'shadow'];
// Inherited by descendants, like CSS `color` / `font-*` / `text-align`.
const TEXT_KEYS = ['fontSize', 'fontFamily', 'color', 'bold', 'italic', 'underline', 'textAlign', 'verticalAlign', 'lineSpacing', 'letterSpacing'];
const KNOWN = new Set([...LAYOUT_KEYS, ...VISUAL_KEYS, ...TEXT_KEYS]);

function classList(cls) {
  if (!cls) return [];
  return Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
}

/**
 * Merge classes + inline style into one flat style object with canonical keys.
 */
function resolveStyle(el, styles, warn, where) {
  const out = {};
  const apply = (src, label) => {
    for (const [rawKey, value] of Object.entries(src || {})) {
      const key = ALIASES[rawKey] || rawKey;
      if (!KNOWN.has(key)) {
        warn(`${where}: unknown style property "${rawKey}"${label ? ` (in ${label})` : ''}`);
        continue;
      }
      out[key] = value;
    }
  };
  for (const name of classList(el.class)) {
    if (!styles[name]) warn(`${where}: unknown class "${name}"`);
    else apply(styles[name], `class "${name}"`);
  }
  apply(el.style);
  return out;
}

/** Text properties a child inherits from this box (parent's inherited + own). */
function inheritText(parentInherited, style) {
  const out = { ...parentInherited };
  for (const k of TEXT_KEYS) if (style[k] !== undefined) out[k] = style[k];
  return out;
}

/**
 * Expand a CSS-like box shorthand into {top,right,bottom,left}.
 * Accepts a number, [all], [vertical, horizontal], [top, horizontal, bottom],
 * [top, right, bottom, left] or {top,right,bottom,left}; side-specific keys
 * (`paddingTop`, …) override the shorthand.
 */
function edges(style, prefix) {
  const v = style[prefix];
  let e = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof v === 'number' || v === 'auto') e = { top: v, right: v, bottom: v, left: v };
  else if (Array.isArray(v)) {
    const [a, b = a, c = a, d = b] = v;
    e = { top: a, right: b, bottom: c, left: d };
  } else if (v && typeof v === 'object') e = { ...e, ...v };
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    if (style[prefix + side] !== undefined) e[side.toLowerCase()] = style[prefix + side];
  }
  return e;
}

module.exports = { resolveStyle, inheritText, edges, TEXT_KEYS };
