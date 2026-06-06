const { XML_DECL, escXml, fillXml, lineXml, xfrmXml, runPropsXml, paraPropsXml } = require('../utils/xml-helpers');
const { inchToEmu, SHAPE_TYPES, TRANSITIONS } = require('../utils/constants');
const { generateTiming } = require('./animation');

/**
 * Generate a complete slide XML
 */
function generateSlide(slideData, rIdMap) {
  let spIdCounter = 1;
  const getNextSpId = () => ++spIdCounter;

  // Assign spId to each element
  for (const el of slideData.elements || []) {
    el._spId = getNextSpId();
  }

  // Build shape tree
  let shapeTreeXml = '';
  shapeTreeXml += `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>`;
  shapeTreeXml += `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;

  for (const el of slideData.elements || []) {
    switch (el.type) {
      case 'text':
        shapeTreeXml += generateTextShape(el);
        break;
      case 'shape':
        shapeTreeXml += generateAutoShape(el);
        break;
      case 'image':
        shapeTreeXml += generatePicture(el, rIdMap);
        break;
      case 'table':
        shapeTreeXml += generateTable(el);
        break;
      case 'group':
        shapeTreeXml += generateGroup(el, rIdMap);
        break;
      default:
        console.warn(`Unknown element type: ${el.type}`);
    }
  }

  // Background
  let bgXml = '';
  if (slideData.background) {
    bgXml = generateBackground(slideData.background);
  }

  // Animation
  const animatedEls = (slideData.elements || []).filter(el => el.animations && el.animations.length > 0);
  const timingXml = generateTiming(animatedEls);

  // Transition
  let transitionXml = '';
  if (slideData.transition) {
    transitionXml = generateTransition(slideData.transition);
  }

  return XML_DECL +
`<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>${bgXml}<p:spTree>${shapeTreeXml}</p:spTree></p:cSld>
  ${timingXml}
  ${transitionXml}
</p:sld>`;
}

// ============================================================
// TEXT SHAPE
// ============================================================
function generateTextShape(el) {
  const pos = el.position || { x: 0, y: 0, w: 5, h: 1 };
  const spId = el._spId;
  const name = escXml(el.name || `TextBox ${spId}`);

  // Body properties
  const bodyAttrs = [];
  if (el.wrap !== false) bodyAttrs.push('wrap="square"');
  if (el.vertAlign) bodyAttrs.push(`anchor="${el.vertAlign === 'middle' ? 'ctr' : el.vertAlign === 'bottom' ? 'b' : 't'}"`);
  if (el.autoFit) bodyAttrs.push('autoFit="1"');
  if (el.margin != null) {
    const m = inchToEmu(el.margin);
    bodyAttrs.push(`lIns="${m}" tIns="${m}" rIns="${m}" bIns="${m}"`);
  }

  // Build paragraphs
  const paragraphsXml = generateParagraphs(el);

  // Shape properties
  let spPrContent = xfrmXml(pos, el.rotation);
  spPrContent += `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`;
  if (el.fill) spPrContent += fillXml(el.fill);
  if (el.line) spPrContent += lineXml(el.line);
  if (el.shadow) spPrContent += generateShadow(el.shadow);

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${spId}" name="${name}"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>${spPrContent}</p:spPr>
  <p:txBody>
    <a:bodyPr ${bodyAttrs.join(' ')}/>
    <a:lstStyle/>
    ${paragraphsXml}
  </p:txBody>
</p:sp>`;
}

// ============================================================
// AUTO SHAPE (rectangle, circle, etc.)
// ============================================================
function generateAutoShape(el) {
  const pos = el.position || { x: 0, y: 0, w: 2, h: 2 };
  const spId = el._spId;
  const name = escXml(el.name || `Shape ${spId}`);
  const shapeType = SHAPE_TYPES[el.shapeType] || el.shapeType || 'rect';

  let spPrContent = xfrmXml(pos, el.rotation);
  spPrContent += `<a:prstGeom prst="${shapeType}"><a:avLst/></a:prstGeom>`;
  if (el.fill) spPrContent += fillXml(el.fill);
  else spPrContent += '<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>';
  if (el.line) spPrContent += lineXml(el.line);
  if (el.shadow) spPrContent += generateShadow(el.shadow);

  // Optional text inside shape
  let txBody = '';
  if (el.text) {
    const paragraphsXml = generateParagraphs(el);
    txBody = `<p:txBody><a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/>${paragraphsXml}</p:txBody>`;
  }

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${spId}" name="${name}"/>
    <p:cNvSpPr/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>${spPrContent}</p:spPr>
  ${txBody}
</p:sp>`;
}

// ============================================================
// PICTURE
// ============================================================
function generatePicture(el, rIdMap) {
  const pos = el.position || { x: 0, y: 0, w: 3, h: 3 };
  const spId = el._spId;
  const name = escXml(el.name || `Picture ${spId}`);
  const rId = rIdMap[el._internalId || el.src] || 'rId2';

  let spPrContent = xfrmXml(pos, el.rotation);
  spPrContent += `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`;
  if (el.line) spPrContent += lineXml(el.line);

  // Crop
  let cropXml = '';
  if (el.crop) {
    cropXml = ` <a:srcRect l="${el.crop.left || 0}" t="${el.crop.top || 0}" r="${el.crop.right || 0}" b="${el.crop.bottom || 0}"/>`;
  }

  return `<p:pic>
  <p:nvPicPr>
    <p:cNvPr id="${spId}" name="${name}"/>
    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
    <p:nvPr/>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="${rId}"/>${cropXml}
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>${spPrContent}</p:spPr>
</p:pic>`;
}

// ============================================================
// TABLE
// ============================================================
function generateTable(el) {
  const pos = el.position || { x: 0.5, y: 0.5, w: 8, h: 3 };
  const spId = el._spId;
  const name = escXml(el.name || `Table ${spId}`);
  const rows = el.rows || [];
  if (rows.length === 0) return '';

  const numCols = rows[0].length;
  const colWidth = Math.floor(inchToEmu(pos.w) / numCols);
  const rowHeight = Math.floor(inchToEmu(pos.h) / rows.length);

  let gridCols = '';
  for (let c = 0; c < numCols; c++) {
    gridCols += `<a:gridCol w="${colWidth}"/>`;
  }

  let rowsXml = '';
  for (let r = 0; r < rows.length; r++) {
    let cellsXml = '';
    for (let c = 0; c < rows[r].length; c++) {
      const cell = typeof rows[r][c] === 'string' ? { text: rows[r][c] } : rows[r][c];
      const cellFill = cell.fill ? fillXml(cell.fill) : '';
      const fontSize = cell.fontSize || el.fontSize || 14;
      const bold = (cell.bold || (r === 0 && el.headerRow)) ? 'b="1"' : '';
      const color = cell.color || el.color || '000000';
      const align = cell.align || 'l';

      cellsXml += `<a:tc>
  <a:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="${align === 'center' ? 'ctr' : align === 'right' ? 'r' : 'l'}"/>
      <a:r>
        <a:rPr lang="en-US" sz="${fontSize * 100}" ${bold} dirty="0">
          <a:solidFill><a:srgbClr val="${color.replace('#', '')}"/></a:solidFill>
        </a:rPr>
        <a:t>${escXml(cell.text || '')}</a:t>
      </a:r>
    </a:p>
  </a:txBody>
  <a:tcPr>${cellFill}</a:tcPr>
</a:tc>`;
    }
    rowsXml += `<a:tr h="${rowHeight}">${cellsXml}</a:tr>`;
  }

  return `<p:graphicFrame>
  <p:nvGraphicFramePr>
    <p:cNvPr id="${spId}" name="${name}"/>
    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
    <p:nvPr/>
  </p:nvGraphicFramePr>
  <p:xfrm>
    <a:off x="${inchToEmu(pos.x)}" y="${inchToEmu(pos.y)}"/>
    <a:ext cx="${inchToEmu(pos.w)}" cy="${inchToEmu(pos.h)}"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
      <a:tbl>
        <a:tblPr firstRow="${el.headerRow ? '1' : '0'}" bandRow="1">
          <a:tblStyle val="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>
        </a:tblPr>
        <a:tblGrid>${gridCols}</a:tblGrid>
        ${rowsXml}
      </a:tbl>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;
}

// ============================================================
// GROUP
// ============================================================
function generateGroup(el, rIdMap) {
  const pos = el.position || { x: 0, y: 0, w: 5, h: 5 };
  const spId = el._spId;
  let childrenXml = '';

  for (const child of el.children || []) {
    child._spId = spId + 100 + (el.children.indexOf(child));
    switch (child.type) {
      case 'text': childrenXml += generateTextShape(child); break;
      case 'shape': childrenXml += generateAutoShape(child); break;
      case 'image': childrenXml += generatePicture(child, rIdMap); break;
    }
  }

  return `<p:grpSp>
  <p:nvGrpSpPr>
    <p:cNvPr id="${spId}" name="Group ${spId}"/>
    <p:cNvGrpSpPr/>
    <p:nvPr/>
  </p:nvGrpSpPr>
  <p:grpSpPr>
    <a:xfrm>
      <a:off x="${inchToEmu(pos.x)}" y="${inchToEmu(pos.y)}"/>
      <a:ext cx="${inchToEmu(pos.w)}" cy="${inchToEmu(pos.h)}"/>
      <a:chOff x="${inchToEmu(pos.x)}" y="${inchToEmu(pos.y)}"/>
      <a:chExt cx="${inchToEmu(pos.w)}" cy="${inchToEmu(pos.h)}"/>
    </a:xfrm>
  </p:grpSpPr>
  ${childrenXml}
</p:grpSp>`;
}

// ============================================================
// HELPERS
// ============================================================

function generateParagraphs(el) {
  // Simple text: string or array of strings
  if (typeof el.text === 'string') {
    const pPr = paraPropsXml(el);
    const rPr = runPropsXml(el);
    return `<a:p>${pPr}<a:r>${rPr}<a:t>${escXml(el.text)}</a:t></a:r></a:p>`;
  }

  // Array of paragraphs with runs
  if (Array.isArray(el.text)) {
    let xml = '';
    for (const para of el.text) {
      if (typeof para === 'string') {
        const pPr = paraPropsXml(el);
        const rPr = runPropsXml(el);
        xml += `<a:p>${pPr}<a:r>${rPr}<a:t>${escXml(para)}</a:t></a:r></a:p>`;
      } else if (para.runs) {
        const pPr = paraPropsXml(para);
        let runsXml = '';
        for (const run of para.runs) {
          const rPr = runPropsXml({ ...el, ...run });
          runsXml += `<a:r>${rPr}<a:t>${escXml(run.text)}</a:t></a:r>`;
        }
        xml += `<a:p>${pPr}${runsXml}</a:p>`;
      } else {
        const pPr = paraPropsXml(para);
        const rPr = runPropsXml({ ...el, ...para });
        xml += `<a:p>${pPr}<a:r>${rPr}<a:t>${escXml(para.text)}</a:t></a:r></a:p>`;
      }
    }
    return xml;
  }

  return '<a:p><a:endParaRPr lang="en-US"/></a:p>';
}

function generateBackground(bg) {
  if (typeof bg === 'string') {
    return `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg.replace('#', '')}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
  }
  if (bg.type === 'gradient' && bg.stops) {
    let stops = '';
    for (const stop of bg.stops) {
      const pos = Math.round((stop.position || 0) * 1000);
      stops += `<a:gs pos="${pos}"><a:srgbClr val="${(stop.color || '000000').replace('#', '')}"/></a:gs>`;
    }
    const angle = bg.angle != null ? Math.round(bg.angle * 60000) : 0;
    return `<p:bg><p:bgPr><a:gradFill><a:gsLst>${stops}</a:gsLst><a:lin ang="${angle}" scaled="1"/></a:gradFill><a:effectLst/></p:bgPr></p:bg>`;
  }
  if (bg.image) {
    // Background image handled through rels
    return `<p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
  }
  return '';
}

function generateTransition(transition) {
  if (typeof transition === 'string') {
    const xml = TRANSITIONS[transition] || TRANSITIONS.fade;
    return `<p:transition spd="med">${xml}</p:transition>`;
  }
  const speed = transition.speed || 'med';
  const type = TRANSITIONS[transition.type] || TRANSITIONS.fade;
  const advClick = transition.advanceOnClick !== false ? '' : ' advClick="0"';
  const advTm = transition.advanceAfter ? ` advTm="${transition.advanceAfter}"` : '';
  return `<p:transition spd="${speed}"${advClick}${advTm}>${type}</p:transition>`;
}

function generateShadow(shadow) {
  const blur = Math.round((shadow.blur || 4) * 12700);
  const dist = Math.round((shadow.distance || 3) * 12700);
  const dir = Math.round((shadow.angle || 45) * 60000);
  const color = (shadow.color || '000000').replace('#', '');
  const alpha = shadow.opacity != null ? Math.round(shadow.opacity * 1000) : 40000;
  return `<a:effectLst><a:outerShdw blurRad="${blur}" dist="${dist}" dir="${dir}" rotWithShape="0"><a:srgbClr val="${color}"><a:alpha val="${alpha}"/></a:srgbClr></a:outerShdw></a:effectLst>`;
}

module.exports = { generateSlide };
