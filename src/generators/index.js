const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const { generateContentTypes } = require('./content-types');
const { generateRootRels, generatePresentationRels, generateSlideRels, generateSlideMasterRels, generateSlideLayoutRels } = require('./rels');
const { generateTheme } = require('./theme');
const { generateSlideMaster, generateSlideLayout } = require('./slide-master');
const { generatePresentation, generatePresProps, generateViewProps, generateTableStyles, generateCoreProps, generateAppProps } = require('./presentation');
const { generateSlide } = require('./slide');

/**
 * Generate a PPTX file from a JSON model
 * @param {object} model - The presentation model
 * @param {string} outputPath - Where to save the file
 */
async function generate(model, outputPath) {
  const zip = new JSZip();
  const slides = model.slides || [];
  const slideCount = slides.length;

  if (slideCount === 0) {
    throw new Error('Presentation must have at least 1 slide');
  }

  // Collect media files and assign internal IDs
  const mediaFiles = [];
  let mediaCounter = 1;

  for (let i = 0; i < slides.length; i++) {
    for (const el of slides[i].elements || []) {
      el._internalId = `el_${i}_${slides[i].elements.indexOf(el)}`;

      if (el.type === 'image' && el.src) {
        const ext = getImageExtension(el.src);
        const mediaName = `image${mediaCounter}.${ext}`;
        el._mediaFileName = mediaName;
        mediaFiles.push({
          name: mediaName,
          src: el.src,
          slideIndex: i,
          elementId: el._internalId,
        });
        mediaCounter++;
      }

      // Process group children
      if (el.type === 'group' && el.children) {
        for (const child of el.children) {
          child._internalId = `el_${i}_grp_${el.children.indexOf(child)}`;
          if (child.type === 'image' && child.src) {
            const ext = getImageExtension(child.src);
            const mediaName = `image${mediaCounter}.${ext}`;
            child._mediaFileName = mediaName;
            mediaFiles.push({ name: mediaName, src: child.src, slideIndex: i, elementId: child._internalId });
            mediaCounter++;
          }
        }
      }
    }
  }

  // ---- Package structure ----

  // [Content_Types].xml
  zip.file('[Content_Types].xml', generateContentTypes(slideCount));

  // _rels/.rels
  zip.file('_rels/.rels', generateRootRels());

  // docProps/
  zip.file('docProps/core.xml', generateCoreProps(model.meta));
  zip.file('docProps/app.xml', generateAppProps(slideCount));

  // ppt/presentation.xml
  zip.file('ppt/presentation.xml', generatePresentation(model));
  zip.file('ppt/_rels/presentation.xml.rels', generatePresentationRels(slideCount));

  // ppt/presProps.xml, viewProps.xml, tableStyles.xml
  zip.file('ppt/presProps.xml', generatePresProps());
  zip.file('ppt/viewProps.xml', generateViewProps());
  zip.file('ppt/tableStyles.xml', generateTableStyles());

  // ppt/theme/
  zip.file('ppt/theme/theme1.xml', generateTheme(model.theme));

  // ppt/slideMasters/
  zip.file('ppt/slideMasters/slideMaster1.xml', generateSlideMaster());
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', generateSlideMasterRels());

  // ppt/slideLayouts/
  zip.file('ppt/slideLayouts/slideLayout1.xml', generateSlideLayout());
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', generateSlideLayoutRels());

  // ppt/slides/
  const slideSize = {
    width: model.width || 13.333,
    height: model.height || 7.5,
  };

  for (let i = 0; i < slideCount; i++) {
    const slideData = slides[i];
    const { xml: slideRelsXml, rIdMap } = generateSlideRels(slideData);
    const slideXml = generateSlide(slideData, rIdMap, slideSize);

    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml);
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, slideRelsXml);
  }

  // ppt/media/ — load image files
  for (const media of mediaFiles) {
    const buffer = await loadMedia(media.src);
    if (buffer) {
      zip.file(`ppt/media/${media.name}`, buffer);
    }
  }

  // Generate ZIP
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Write to disk
  const resolvedPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, buffer);

  return { path: resolvedPath, size: buffer.length, slides: slideCount };
}

/**
 * Load media from file path or base64 data URI
 */
async function loadMedia(src) {
  if (!src) return null;

  // Base64 data URI
  if (src.startsWith('data:')) {
    const match = src.match(/^data:[^;]+;base64,(.+)$/);
    if (match) return Buffer.from(match[1], 'base64');
  }

  // Local file
  if (fs.existsSync(src)) {
    return fs.readFileSync(src);
  }

  // Relative path
  const resolved = path.resolve(src);
  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved);
  }

  console.warn(`Media file not found: ${src}`);
  return null;
}

function getImageExtension(src) {
  if (src.startsWith('data:image/')) {
    const match = src.match(/^data:image\/(\w+)/);
    return match ? match[1].replace('jpeg', 'jpg') : 'png';
  }
  const ext = path.extname(src).replace('.', '').toLowerCase();
  return ext || 'png';
}

module.exports = { generate };
