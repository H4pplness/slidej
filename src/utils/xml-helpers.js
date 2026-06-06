const { inchToEmu, ptToHundredths } = require('./constants');

/**
 * Escape special XML characters
 */
function escXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * XML declaration
 */
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * Generate color XML from hex string or scheme ref
 */
function colorXml(color) {
  if (!color) return '';
  // Theme color reference: accent1, accent2, dk1, lt1, etc.
  if (/^(accent|dk|lt|hlink|folHlink)\d?$/.test(color)) {
    return `<a:schemeClr val="${color}"/>`;
  }
  // Hex color (strip leading # if present)
  const hex = color.replace(/^#/, '');
  return `<a:srgbClr val="${hex}"/>`;
}

/**
 * Generate solid fill XML
 */
function solidFillXml(color) {
  if (!color) return '';
  return `<a:solidFill>${colorXml(color)}</a:solidFill>`;
}

/**
 * Generate gradient fill XML
 */
function gradientFillXml(gradient) {
  if (!gradient || !gradient.stops) return '';
  let stops = '';
  for (const stop of gradient.stops) {
    const pos = Math.round((stop.position || 0) * 1000);
    stops += `<a:gs pos="${pos}">${colorXml(stop.color)}</a:gs>`;
  }
  const angle = gradient.angle != null ? Math.round(gradient.angle * 60000) : 0;
  return `<a:gradFill><a:gsLst>${stops}</a:gsLst><a:lin ang="${angle}" scaled="1"/></a:gradFill>`;
}

/**
 * Generate fill XML (solid or gradient)
 */
function fillXml(fill) {
  if (!fill) return '';
  if (typeof fill === 'string') return solidFillXml(fill);
  if (fill.type === 'gradient') return gradientFillXml(fill);
  if (fill.color) return solidFillXml(fill.color);
  return '';
}

/**
 * Generate line/border XML
 */
function lineXml(line) {
  if (!line) return '';
  const width = line.width ? Math.round(line.width * 12700) : 12700; // pt to EMU
  const dash = line.dash ? `<a:prstDash val="${line.dash}"/>` : '';
  return `<a:ln w="${width}">${solidFillXml(line.color || '000000')}${dash}</a:ln>`;
}

/**
 * Generate position/size transform XML
 */
function xfrmXml(pos, rotation) {
  const rot = rotation ? ` rot="${Math.round(rotation * 60000)}"` : '';
  const flipH = pos.flipH ? ' flipH="1"' : '';
  const flipV = pos.flipV ? ' flipV="1"' : '';
  return `<a:xfrm${rot}${flipH}${flipV}>` +
    `<a:off x="${inchToEmu(pos.x || 0)}" y="${inchToEmu(pos.y || 0)}"/>` +
    `<a:ext cx="${inchToEmu(pos.w || 1)}" cy="${inchToEmu(pos.h || 1)}"/>` +
    `</a:xfrm>`;
}

/**
 * Generate text run properties XML
 */
function runPropsXml(style = {}) {
  const attrs = [];
  attrs.push(`lang="${style.lang || 'en-US'}"`);
  if (style.fontSize) attrs.push(`sz="${ptToHundredths(style.fontSize)}"`);
  if (style.bold) attrs.push('b="1"');
  if (style.italic) attrs.push('i="1"');
  if (style.underline) attrs.push('u="sng"');
  if (style.strike) attrs.push('strike="sngStrike"');
  attrs.push('dirty="0"');

  let inner = '';
  if (style.color) inner += `<a:solidFill>${colorXml(style.color)}</a:solidFill>`;
  if (style.fontFamily) inner += `<a:latin typeface="${escXml(style.fontFamily)}"/><a:cs typeface="${escXml(style.fontFamily)}"/>`;
  if (style.highlight) inner += `<a:highlight>${colorXml(style.highlight)}</a:highlight>`;

  return `<a:rPr ${attrs.join(' ')}>${inner}</a:rPr>`;
}

/**
 * Generate paragraph properties XML
 */
function paraPropsXml(para = {}) {
  const attrs = [];
  if (para.align) {
    const map = { left: 'l', center: 'ctr', right: 'r', justify: 'just' };
    attrs.push(`algn="${map[para.align] || para.align}"`);
  }
  if (para.lineSpacing) {
    const sp = Math.round(para.lineSpacing * 100);
    return `<a:pPr ${attrs.join(' ')}><a:lnSpc><a:spcPct val="${sp}00"/></a:lnSpc></a:pPr>`;
  }
  if (para.indent != null) {
    attrs.push(`indent="${inchToEmu(para.indent)}"`);
  }
  if (para.marginLeft != null) {
    attrs.push(`marL="${inchToEmu(para.marginLeft)}"`);
  }
  if (para.bullet) {
    const bulletXml = para.bullet === true
      ? '<a:buChar char="•"/>'
      : `<a:buChar char="${escXml(para.bullet)}"/>`;
    return `<a:pPr ${attrs.join(' ')}>${bulletXml}</a:pPr>`;
  }
  if (attrs.length === 0) return '';
  return `<a:pPr ${attrs.join(' ')}/>`;
}

module.exports = {
  escXml, XML_DECL,
  colorXml, solidFillXml, gradientFillXml, fillXml,
  lineXml, xfrmXml, runPropsXml, paraPropsXml,
};
