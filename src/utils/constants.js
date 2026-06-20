// ============================================================
// EMU (English Metric Units) conversion
// 1 inch = 914400 EMU
// ============================================================
const EMU_PER_INCH = 914400;
const inchToEmu = (inches) => Math.round(inches * EMU_PER_INCH);
const emuToInch = (emu) => Math.round((parseInt(emu) / EMU_PER_INCH) * 1000) / 1000;
const ptToHundredths = (pt) => Math.round(pt * 100); // fontSize in OOXML = hundredths of a point

// ============================================================
// XML Namespaces
// ============================================================
const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
};

const REL_TYPES = {
  officeDocument: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  slide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  slideMaster: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  slideLayout: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  theme: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
  noteSlide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
  coreProps: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
  extProps: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
};

const CONTENT_TYPES = {
  presentation: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
  slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  slideMaster: 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
  slideLayout: 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
  theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
  presProps: 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml',
  viewProps: 'application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml',
  tableStyles: 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml',
  coreProps: 'application/vnd.openxmlformats-package.core-properties+xml',
  extProps: 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
};

// ============================================================
// Animation presets
// ============================================================
const ANIMATION_PRESETS = {
  // --- Entrance ---
  appear:    { presetID: 1,  presetClass: 'entr', filter: null },
  fadeIn:    { presetID: 10, presetClass: 'entr', filter: 'fade' },
  flyIn:     { presetID: 2,  presetClass: 'entr', filter: null },
  wipeIn:    { presetID: 22, presetClass: 'entr', filter: 'wipe(down)' },
  zoomIn:    { presetID: 53, presetClass: 'entr', filter: null },
  splitIn:   { presetID: 16, presetClass: 'entr', filter: 'barn(inVertical)' },
  bounceIn:  { presetID: 26, presetClass: 'entr', filter: null },
  floatIn:   { presetID: 31, presetClass: 'entr', filter: 'fade' },
  swivel:    { presetID: 18, presetClass: 'entr', filter: 'fade' },
  dissolveIn:{ presetID: 9,  presetClass: 'entr', filter: 'dissolve' },

  // --- Exit ---
  fadeOut:   { presetID: 10, presetClass: 'exit', filter: 'fade' },
  flyOut:    { presetID: 2,  presetClass: 'exit', filter: null },
  wipeOut:   { presetID: 22, presetClass: 'exit', filter: 'wipe(down)' },
  zoomOut:   { presetID: 53, presetClass: 'exit', filter: null },
  floatOut:  { presetID: 31, presetClass: 'exit', filter: 'fade' },
  dissolveOut:{ presetID: 9, presetClass: 'exit', filter: 'dissolve' },

  // --- Emphasis ---
  pulse:        { presetID: 26, presetClass: 'emph', filter: null },
  spin:         { presetID: 8,  presetClass: 'emph', filter: null },
  growShrink:   { presetID: 6,  presetClass: 'emph', filter: null },
  colorChange:  { presetID: 2,  presetClass: 'emph', filter: null },
  transparency: { presetID: 19, presetClass: 'emph', filter: null },
  teeter:       { presetID: 21, presetClass: 'emph', filter: null },
  blink:        { presetID: 38, presetClass: 'emph', filter: null },

  // --- Motion path ---
  motionPath:   { presetID: 0,  presetClass: 'path', filter: null },
};

// Direction subtypes for flyIn/flyOut
const FLY_DIRECTIONS = {
  top: 1,      // from top
  right: 2,    // from right  
  bottom: 4,   // from bottom
  left: 8,     // from left
  topLeft: 9,
  topRight: 3,
  bottomLeft: 12,
  bottomRight: 6,
};

// Trigger types
const TRIGGER_TYPES = {
  onClick: 'onClick',
  withPrevious: 'withPrevious',
  afterPrevious: 'afterPrevious',
};

// ============================================================
// Shape presets
// ============================================================
const SHAPE_TYPES = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  octagon: 'octagon',
  star5: 'star5',
  star6: 'star6',
  rightArrow: 'rightArrow',
  leftArrow: 'leftArrow',
  upArrow: 'upArrow',
  downArrow: 'downArrow',
  line: 'line',
  cloud: 'cloud',
  heart: 'heart',
  lightningBolt: 'lightningBolt',
  callout1: 'wedgeRoundRectCallout',
  callout2: 'wedgeEllipseCallout',
  chevron: 'chevron',
  donut: 'donut',
  blockArc: 'blockArc',
  arc: 'arc',
  pie: 'pie',
  plaque: 'plaque',
  can: 'can',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
};

// ============================================================
// Slide transitions
// ============================================================
const TRANSITIONS = {
  fade: '<p:fade/>',
  push: '<p:push dir="r"/>',
  wipe: '<p:wipe dir="d"/>',
  split: '<p:split orient="horz" dir="out"/>',
  cover: '<p:cover dir="r"/>',
  cut: '<p:cut/>',
  dissolve: '<p:dissolve/>',
  random: '<p:random/>',
};

// Default slide dimensions (widescreen 16:9)
const DEFAULT_SLIDE_WIDTH = 13.333;
const DEFAULT_SLIDE_HEIGHT = 7.5;

module.exports = {
  EMU_PER_INCH, inchToEmu, emuToInch, ptToHundredths,
  NS, REL_TYPES, CONTENT_TYPES,
  ANIMATION_PRESETS, FLY_DIRECTIONS, TRIGGER_TYPES,
  SHAPE_TYPES, TRANSITIONS,
  DEFAULT_SLIDE_WIDTH, DEFAULT_SLIDE_HEIGHT,
};
