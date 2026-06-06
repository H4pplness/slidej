const { XML_DECL } = require('../utils/xml-helpers');
const { CONTENT_TYPES } = require('../utils/constants');

function generateContentTypes(slideCount) {
  let xml = XML_DECL;
  xml += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n';

  // Default extensions
  xml += '  <Default Extension="xml" ContentType="application/xml"/>\n';
  xml += '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n';
  xml += '  <Default Extension="png" ContentType="image/png"/>\n';
  xml += '  <Default Extension="jpeg" ContentType="image/jpeg"/>\n';
  xml += '  <Default Extension="jpg" ContentType="image/jpeg"/>\n';
  xml += '  <Default Extension="gif" ContentType="image/gif"/>\n';
  xml += '  <Default Extension="svg" ContentType="image/svg+xml"/>\n';
  xml += '  <Default Extension="webp" ContentType="image/webp"/>\n';

  // Override parts
  xml += `  <Override PartName="/ppt/presentation.xml" ContentType="${CONTENT_TYPES.presentation}"/>\n`;
  xml += `  <Override PartName="/ppt/presProps.xml" ContentType="${CONTENT_TYPES.presProps}"/>\n`;
  xml += `  <Override PartName="/ppt/viewProps.xml" ContentType="${CONTENT_TYPES.viewProps}"/>\n`;
  xml += `  <Override PartName="/ppt/tableStyles.xml" ContentType="${CONTENT_TYPES.tableStyles}"/>\n`;
  xml += `  <Override PartName="/ppt/theme/theme1.xml" ContentType="${CONTENT_TYPES.theme}"/>\n`;
  xml += `  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CONTENT_TYPES.slideMaster}"/>\n`;
  xml += `  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CONTENT_TYPES.slideLayout}"/>\n`;
  xml += `  <Override PartName="/docProps/core.xml" ContentType="${CONTENT_TYPES.coreProps}"/>\n`;
  xml += `  <Override PartName="/docProps/app.xml" ContentType="${CONTENT_TYPES.extProps}"/>\n`;

  for (let i = 1; i <= slideCount; i++) {
    xml += `  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="${CONTENT_TYPES.slide}"/>\n`;
  }

  xml += '</Types>';
  return xml;
}

module.exports = { generateContentTypes };
