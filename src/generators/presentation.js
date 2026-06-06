const { XML_DECL } = require('../utils/xml-helpers');
const { inchToEmu, DEFAULT_SLIDE_WIDTH, DEFAULT_SLIDE_HEIGHT } = require('../utils/constants');

function generatePresentation(model) {
  const w = inchToEmu(model.width || DEFAULT_SLIDE_WIDTH);
  const h = inchToEmu(model.height || DEFAULT_SLIDE_HEIGHT);
  const slideCount = model.slides.length;

  let slideIdList = '';
  for (let i = 0; i < slideCount; i++) {
    slideIdList += `    <p:sldId id="${256 + i}" r:id="rId${i + 2}"/>\n`;
  }

  return XML_DECL +
`<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  saveSubsetFonts="1">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
${slideIdList}  </p:sldIdLst>
  <p:sldSz cx="${w}" cy="${h}"/>
  <p:notesSz cx="${inchToEmu(7.5)}" cy="${inchToEmu(10)}"/>
</p:presentation>`;
}

function generatePresProps() {
  return XML_DECL +
`<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;
}

function generateViewProps() {
  return XML_DECL +
`<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr>
</p:viewPr>`;
}

function generateTableStyles() {
  return XML_DECL +
`<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;
}

function generateCoreProps(meta = {}) {
  const now = new Date().toISOString();
  return XML_DECL +
`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${meta.title || 'SlideJ Presentation'}</dc:title>
  <dc:creator>${meta.author || 'SlideJ CLI'}</dc:creator>
  <cp:lastModifiedBy>${meta.author || 'SlideJ CLI'}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
  <cp:revision>1</cp:revision>
</cp:coreProperties>`;
}

function generateAppProps(slideCount) {
  return XML_DECL +
`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>SlideJ</Application>
  <Slides>${slideCount}</Slides>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
</Properties>`;
}

module.exports = {
  generatePresentation, generatePresProps, generateViewProps,
  generateTableStyles, generateCoreProps, generateAppProps,
};
