const { XML_DECL } = require('../utils/xml-helpers');
const { REL_TYPES, NS } = require('../utils/constants');

/**
 * Root .rels file
 */
function generateRootRels() {
  return XML_DECL +
    `<Relationships xmlns="${NS.rel}">` +
    `<Relationship Id="rId1" Type="${REL_TYPES.officeDocument}" Target="ppt/presentation.xml"/>` +
    `<Relationship Id="rId2" Type="${REL_TYPES.coreProps}" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="${REL_TYPES.extProps}" Target="docProps/app.xml"/>` +
    `</Relationships>`;
}

/**
 * presentation.xml.rels
 */
function generatePresentationRels(slideCount) {
  let xml = XML_DECL + `<Relationships xmlns="${NS.rel}">`;
  xml += `<Relationship Id="rId1" Type="${REL_TYPES.slideMaster}" Target="slideMasters/slideMaster1.xml"/>`;
  xml += `<Relationship Id="rId${slideCount + 2}" Type="${REL_TYPES.theme}" Target="theme/theme1.xml"/>`;
  xml += `<Relationship Id="rId${slideCount + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>`;
  xml += `<Relationship Id="rId${slideCount + 4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>`;
  xml += `<Relationship Id="rId${slideCount + 5}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>`;

  for (let i = 0; i < slideCount; i++) {
    xml += `<Relationship Id="rId${i + 2}" Type="${REL_TYPES.slide}" Target="slides/slide${i + 1}.xml"/>`;
  }

  xml += '</Relationships>';
  return xml;
}

/**
 * slide{N}.xml.rels
 */
function generateSlideRels(slideData) {
  let xml = XML_DECL + `<Relationships xmlns="${NS.rel}">`;
  xml += `<Relationship Id="rId1" Type="${REL_TYPES.slideLayout}" Target="../slideLayouts/slideLayout1.xml"/>`;

  let rIdCounter = 2;
  const rIdMap = {};

  if (slideData.elements) {
    for (const el of slideData.elements) {
      if (el.type === 'image' && el.src) {
        const ext = (el.src.match(/\.(\w+)$/) || [, 'png'])[1];
        const mediaName = el._mediaFileName || `image_${rIdCounter}.${ext}`;
        rIdMap[el._internalId || el.src] = `rId${rIdCounter}`;
        xml += `<Relationship Id="rId${rIdCounter}" Type="${REL_TYPES.image}" Target="../media/${mediaName}"/>`;
        rIdCounter++;
      }
      if (el.hyperlink) {
        rIdMap[`hyperlink_${el._internalId}`] = `rId${rIdCounter}`;
        xml += `<Relationship Id="rId${rIdCounter}" Type="${REL_TYPES.hyperlink}" Target="${el.hyperlink}" TargetMode="External"/>`;
        rIdCounter++;
      }
    }
  }

  xml += '</Relationships>';
  return { xml, rIdMap };
}

/**
 * slideMaster1.xml.rels
 */
function generateSlideMasterRels() {
  return XML_DECL +
    `<Relationships xmlns="${NS.rel}">` +
    `<Relationship Id="rId1" Type="${REL_TYPES.slideLayout}" Target="../slideLayouts/slideLayout1.xml"/>` +
    `<Relationship Id="rId2" Type="${REL_TYPES.theme}" Target="../theme/theme1.xml"/>` +
    `</Relationships>`;
}

/**
 * slideLayout1.xml.rels
 */
function generateSlideLayoutRels() {
  return XML_DECL +
    `<Relationships xmlns="${NS.rel}">` +
    `<Relationship Id="rId1" Type="${REL_TYPES.slideMaster}" Target="../slideMasters/slideMaster1.xml"/>` +
    `</Relationships>`;
}

module.exports = {
  generateRootRels,
  generatePresentationRels,
  generateSlideRels,
  generateSlideMasterRels,
  generateSlideLayoutRels,
};
