// ============================================================
// Slide transitions.
//
// Three generations of PowerPoint transitions:
//   p    — ECMA-376 classics (fade, push, wipe, …), understood everywhere
//   p14  — PowerPoint 2010 (vortex, ripple, gallery, …)
//   p15  — PowerPoint 2013 presets (curtains, airplane, origami, …)
//   p159 — Morph (PowerPoint 2019 / 365)
// Anything beyond the classics, and any custom `duration`, is written inside
// <mc:AlternateContent> with a classic fallback, so older viewers still open
// the file and show a fade instead.
// ============================================================

const NS = {
  mc: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
  p14: 'http://schemas.microsoft.com/office/powerpoint/2010/main',
  p15: 'http://schemas.microsoft.com/office/powerpoint/2012/main',
  p159: 'http://schemas.microsoft.com/office/powerpoint/2015/09/main',
};

// Friendly direction names → OOXML codes.
const DIR_ALIASES = {
  left: 'l', right: 'r', up: 'u', down: 'd',
  'up-left': 'lu', 'up-right': 'ru', 'down-left': 'ld', 'down-right': 'rd',
  horizontal: 'horz', vertical: 'vert',
};
const SIDE = ['l', 'r', 'u', 'd'];
const SIDE_CORNER = ['l', 'r', 'u', 'd', 'lu', 'ru', 'ld', 'rd'];
const CORNER = ['lu', 'ru', 'ld', 'rd'];
const LR = ['l', 'r'];
const ORIENT = ['horz', 'vert'];
const INOUT = ['in', 'out'];

// type → { ns, el, dirs?, dir (default), attrs?(t) }
const CATALOG = {
  // --- Classic (p) ---
  fade:      { ns: 'p', el: 'fade', attrs: t => (t.thruBlack ? { thruBlk: 1 } : {}) },
  cut:       { ns: 'p', el: 'cut', attrs: t => (t.thruBlack ? { thruBlk: 1 } : {}) },
  push:      { ns: 'p', el: 'push', dirs: SIDE, dir: 'r' },
  wipe:      { ns: 'p', el: 'wipe', dirs: SIDE, dir: 'd' },
  split:     { ns: 'p', el: 'split', dirs: INOUT, dir: 'out', attrs: t => ({ orient: orient(t.orientation, 'horz') }) },
  cover:     { ns: 'p', el: 'cover', dirs: SIDE_CORNER, dir: 'r' },
  pull:      { ns: 'p', el: 'pull', dirs: SIDE_CORNER, dir: 'r' },
  randomBar: { ns: 'p', el: 'randomBar', dirs: ORIENT, dir: 'horz' },
  blinds:    { ns: 'p', el: 'blinds', dirs: ORIENT, dir: 'horz' },
  checker:   { ns: 'p', el: 'checker', dirs: ORIENT, dir: 'horz' },
  comb:      { ns: 'p', el: 'comb', dirs: ORIENT, dir: 'horz' },
  strips:    { ns: 'p', el: 'strips', dirs: CORNER, dir: 'lu' },
  zoom:      { ns: 'p', el: 'zoom', dirs: INOUT, dir: 'in' },
  wheel:     { ns: 'p', el: 'wheel', attrs: t => ({ spokes: spokes(t.spokes) }) },
  circle:    { ns: 'p', el: 'circle' },
  diamond:   { ns: 'p', el: 'diamond' },
  plus:      { ns: 'p', el: 'plus' },
  wedge:     { ns: 'p', el: 'wedge' },
  newsflash: { ns: 'p', el: 'newsflash' },
  dissolve:  { ns: 'p', el: 'dissolve' },
  random:    { ns: 'p', el: 'random' },

  // --- PowerPoint 2010 (p14) ---
  vortex:       { ns: 'p14', el: 'vortex', dirs: SIDE, dir: 'l' },
  switch:       { ns: 'p14', el: 'switch', dirs: LR, dir: 'r' },
  flip:         { ns: 'p14', el: 'flip', dirs: LR, dir: 'r' },
  ripple:       { ns: 'p14', el: 'ripple', dirs: ['center', ...CORNER], dir: 'center' },
  honeycomb:    { ns: 'p14', el: 'honeycomb' },
  prism:        { ns: 'p14', el: 'prism', dirs: SIDE, dir: 'l', attrs: t => flags({ isContent: t.content, isInverted: t.inverted }) },
  doors:        { ns: 'p14', el: 'doors', dirs: ORIENT, dir: 'vert' },
  window:       { ns: 'p14', el: 'window', dirs: ORIENT, dir: 'vert' },
  shred:        { ns: 'p14', el: 'shred', dirs: INOUT, dir: 'in', attrs: t => ({ pattern: t.pattern === 'rectangle' ? 'rectangle' : 'strip' }) },
  ferris:       { ns: 'p14', el: 'ferris', dirs: LR, dir: 'l' },
  flythrough:   { ns: 'p14', el: 'flythrough', dirs: INOUT, dir: 'in', attrs: t => flags({ hasBounce: t.bounce }) },
  warp:         { ns: 'p14', el: 'warp', dirs: INOUT, dir: 'in' },
  gallery:      { ns: 'p14', el: 'gallery', dirs: LR, dir: 'l' },
  conveyor:     { ns: 'p14', el: 'conveyor', dirs: LR, dir: 'l' },
  pan:          { ns: 'p14', el: 'pan', dirs: SIDE, dir: 'd' },
  glitter:      { ns: 'p14', el: 'glitter', dirs: SIDE, dir: 'l', attrs: t => ({ pattern: t.pattern === 'hexagon' ? 'hexagon' : 'diamond' }) },
  reveal:       { ns: 'p14', el: 'reveal', dirs: LR, dir: 'l', attrs: t => flags({ thruBlk: t.thruBlack }) },
  wheelReverse: { ns: 'p14', el: 'wheelReverse', attrs: t => ({ spokes: spokes(t.spokes) }) },
  flash:        { ns: 'p14', el: 'flash' },

  // --- PowerPoint 2013 presets (p15:prstTrans) ---
  ...Object.fromEntries(['airplane', 'crush', 'curtains', 'drape', 'fallOver', 'fracture', 'origami',
    'pageCurlDouble', 'pageCurlSingle', 'peelOff', 'prestige', 'wind'].map(prst => [prst, {
    ns: 'p15', el: 'prstTrans', prst, attrs: t => ({ prst, ...flags({ invX: t.invert }) }),
  }])),

  // --- Morph (p159) ---
  morph: { ns: 'p159', el: 'morph', attrs: t => ({ option: ['byObject', 'byWord', 'byChar'].includes(t.morphBy) ? t.morphBy : 'byObject' }) },
};

const SPEED_MS = { fast: 500, med: 750, slow: 1000 };

function orient(v, def) {
  const o = DIR_ALIASES[v] || v;
  return ORIENT.includes(o) ? o : def;
}
function spokes(v) {
  return [1, 2, 3, 4, 8].includes(v) ? v : 4;
}
function flags(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v) out[k] = 1;
  return out;
}
const attrStr = attrs => Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');

function speedFor(t) {
  if (['slow', 'med', 'fast'].includes(t.speed)) return t.speed;
  if (typeof t.duration === 'number') {
    // Closest classic speed, for the fallback / for viewers without p14.
    return t.duration <= 600 ? 'fast' : t.duration <= 900 ? 'med' : 'slow';
  }
  return 'med';
}

/**
 * Normalize a slide's `transition` (string or object) and report problems.
 * @returns {object|null} normalized { type, def, dir, speed, duration, ... }
 */
function normalize(transition, warn = () => {}, where = 'slide') {
  if (!transition) return null;
  const t = typeof transition === 'string' ? { type: transition } : { ...transition };
  if (!t.type) t.type = 'fade';
  let def = CATALOG[t.type];
  if (!def) {
    warn(`${where}: unknown transition "${t.type}", using "fade" (known: ${Object.keys(CATALOG).join(', ')})`);
    t.type = 'fade';
    def = CATALOG.fade;
  }
  if (t.speed !== undefined && !SPEED_MS[t.speed]) warn(`${where}: transition speed "${t.speed}" is not slow|med|fast`);
  if (t.duration !== undefined && !(typeof t.duration === 'number' && t.duration > 0)) {
    warn(`${where}: transition duration must be a positive number of milliseconds`);
    delete t.duration;
  }
  let dir;
  if (def.dirs) {
    const raw = t.direction;
    dir = raw === undefined ? def.dir : DIR_ALIASES[raw] || raw;
    if (!def.dirs.includes(dir)) {
      warn(`${where}: transition "${t.type}" does not support direction "${raw}" (use ${def.dirs.join(', ')})`);
      dir = def.dir;
    }
  } else if (t.direction !== undefined) {
    warn(`${where}: transition "${t.type}" has no direction option`);
  }
  return { ...t, def, dir, speed: speedFor(t) };
}

/**
 * Build the transition XML for one slide. Goes between <p:clrMapOvr>/<p:cSld>
 * and <p:timing> (CT_Slide element order).
 */
function generateTransition(transition, warn, where) {
  const t = normalize(transition, warn, where);
  if (!t) return '';
  const { def } = t;
  const adv = (t.advanceOnClick === false ? ' advClick="0"' : '') +
    (t.advanceAfter ? ` advTm="${Math.round(t.advanceAfter)}"` : '');
  const attrs = { ...(def.attrs ? def.attrs(t) : {}) };
  if (def.dirs) attrs.dir = t.dir;
  const effect = `<${def.ns}:${def.el}${attrStr(attrs)}/>`;

  if (def.ns === 'p' && t.duration === undefined) {
    return `<p:transition spd="${t.speed}"${adv}>${effect}</p:transition>`;
  }

  // Newer effect and/or custom duration: AlternateContent with a classic fallback.
  const dur = t.duration !== undefined ? Math.round(t.duration) : SPEED_MS[t.speed];
  const requires = def.ns === 'p' ? 'p14' : def.ns;
  const nsDecl = [`xmlns:p14="${NS.p14}"`];
  if (def.ns === 'p15' || def.ns === 'p159') nsDecl.push(`xmlns:${def.ns}="${NS[def.ns]}"`);
  const fallback = def.ns === 'p' ? effect : '<p:fade/>';
  return `<mc:AlternateContent xmlns:mc="${NS.mc}">` +
    `<mc:Choice ${nsDecl.join(' ')} Requires="${requires}">` +
    `<p:transition spd="${t.speed}" p14:dur="${dur}"${adv}>${effect}</p:transition>` +
    `</mc:Choice>` +
    `<mc:Fallback><p:transition spd="${t.speed}"${adv}>${fallback}</p:transition></mc:Fallback>` +
    `</mc:AlternateContent>`;
}

// ------------------------------------------------------------
// Parsing (fast-xml-parser object, prefixes kept, attributes as @_name)
// ------------------------------------------------------------
const CODE_TO_DIR = Object.fromEntries(Object.entries(DIR_ALIASES).map(([k, v]) => [v, k]));

function parseTransitionNode(tr) {
  if (!tr) return null;
  const result = { type: 'fade', speed: tr['@_spd'] || 'med' };
  for (const [type, def] of Object.entries(CATALOG)) {
    const node = tr[`${def.ns}:${def.el}`];
    if (node === undefined) continue;
    if (def.prst && (node || {})['@_prst'] !== def.prst) continue;
    result.type = type;
    const n = node || {};
    if (n['@_dir'] !== undefined && def.dirs) result.direction = CODE_TO_DIR[n['@_dir']] || n['@_dir'];
    if (type === 'split' && n['@_orient']) result.orientation = CODE_TO_DIR[n['@_orient']] || n['@_orient'];
    if (n['@_thruBlk'] === '1' || n['@_thruBlk'] === 'true') result.thruBlack = true;
    if (n['@_spokes'] !== undefined) result.spokes = parseInt(n['@_spokes'], 10);
    if (n['@_pattern']) result.pattern = n['@_pattern'];
    if (n['@_invX'] === '1' || n['@_invX'] === 'true') result.invert = true;
    if (n['@_option'] && type === 'morph') result.morphBy = n['@_option'];
    break;
  }
  if (tr['@_p14:dur'] !== undefined) result.duration = parseInt(tr['@_p14:dur'], 10);
  if (tr['@_advTm'] !== undefined) result.advanceAfter = parseInt(tr['@_advTm'], 10);
  if (tr['@_advClick'] === '0') result.advanceOnClick = false;
  return result;
}

/** Find the transition on a parsed <p:sld>: plain, or inside mc:AlternateContent. */
function parseSlideTransition(sld) {
  if (sld['p:transition']) return parseTransitionNode(sld['p:transition']);
  const alts = [].concat(sld['mc:AlternateContent'] || []);
  for (const alt of alts) {
    const choices = [].concat(alt['mc:Choice'] || []);
    for (const ch of choices) if (ch['p:transition']) return parseTransitionNode(ch['p:transition']);
    const fb = alt['mc:Fallback'];
    if (fb && fb['p:transition']) return parseTransitionNode(fb['p:transition']);
  }
  return null;
}

module.exports = { generateTransition, parseSlideTransition, normalize, TRANSITION_TYPES: Object.keys(CATALOG) };
