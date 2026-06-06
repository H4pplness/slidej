const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { emuToInch, ANIMATION_PRESETS, FLY_DIRECTIONS } = require('../utils/constants');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // Force these to always be arrays for consistent handling
    return [
      'p:sp', 'p:pic', 'p:graphicFrame', 'p:grpSp',
      'a:p', 'a:r', 'a:gs',
      'a:tr', 'a:tc', 'a:gridCol',
      'Relationship',
      'p:sldId', 'p:sldLayoutId',
      'p:par', 'p:seq',
    ].includes(name);
  },
});

// Reverse lookup: presetID+presetClass → friendly name
const PRESET_REVERSE = {};
for (const [name, preset] of Object.entries(ANIMATION_PRESETS)) {
  PRESET_REVERSE[`${preset.presetID}_${preset.presetClass}`] = name;
}

const FLY_DIR_REVERSE = {};
for (const [name, val] of Object.entries(FLY_DIRECTIONS)) {
  FLY_DIR_REVERSE[String(val)] = name;
}

/**
 * Parse a PPTX file into JSON
 */
async function parse(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const buffer = fs.readFileSync(resolvedPath);
  const zip = await JSZip.loadAsync(buffer);

  // ---- Parse presentation.xml ----
  const presXml = await readXml(zip, 'ppt/presentation.xml');
  const pres = presXml['p:presentation'];

  const model = {
    width: emuToInch(pres['p:sldSz']?.['@_cx'] || 12192000),
    height: emuToInch(pres['p:sldSz']?.['@_cy'] || 6858000),
    meta: {},
    theme: {},
    slides: [],
  };

  // ---- Parse metadata ----
  try {
    const coreXml = await readXml(zip, 'docProps/core.xml');
    const core = coreXml['cp:coreProperties'];
    if (core) {
      model.meta.title = core['dc:title'] || '';
      model.meta.author = core['dc:creator'] || '';
    }
  } catch (e) { /* optional */ }

  // ---- Parse theme ----
  try {
    const themeXml = await readXml(zip, 'ppt/theme/theme1.xml');
    model.theme = parseTheme(themeXml);
  } catch (e) { /* optional */ }

  // ---- Parse presentation rels to find slide order ----
  const presRelsXml = await readXml(zip, 'ppt/_rels/presentation.xml.rels');
  const presRels = buildRelMap(presRelsXml);

  // Get slide list in order
  const sldIdLst = toArray(pres['p:sldIdLst']?.['p:sldId']);
  const slideFiles = [];
  for (const sldId of sldIdLst) {
    const rId = sldId['@_r:id'];
    const target = presRels[rId];
    if (target) slideFiles.push(target);
  }

  // ---- Parse each slide ----
  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = `ppt/${slideFiles[i]}`;
    const slideRelsPath = `ppt/slides/_rels/${path.basename(slideFiles[i])}.rels`;

    const slideXml = await readXml(zip, slidePath);
    let slideRels = {};
    try {
      const slideRelsXml = await readXml(zip, slideRelsPath);
      slideRels = buildRelMap(slideRelsXml);
    } catch (e) { /* no rels */ }

    const slideData = parseSlide(slideXml, slideRels);
    slideData.index = i + 1;

    // Extract media files referenced by this slide
    for (const el of slideData.elements) {
      if (el.type === 'image' && el._rId) {
        const mediaTarget = slideRels[el._rId];
        if (mediaTarget) {
          el.src = mediaTarget.replace('../', '');
          // Try to extract base64
          const mediaPath = `ppt/${el.src}`;
          try {
            const mediaFile = zip.file(mediaPath);
            if (mediaFile) {
              const buf = await mediaFile.async('base64');
              const ext = path.extname(el.src).replace('.', '');
              const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
              el.srcBase64 = `data:${mime};base64,${buf}`;
            }
          } catch (e) { /* skip */ }
        }
        delete el._rId;
      }
    }

    model.slides.push(slideData);
  }

  return model;
}

// ============================================================
// SLIDE PARSER
// ============================================================
function parseSlide(slideXml, slideRels) {
  const sld = slideXml['p:sld'];
  const cSld = sld['p:cSld'];
  const spTree = cSld['p:spTree'];

  const result = {
    elements: [],
    background: null,
    transition: null,
    animations: [],
  };

  // Background
  result.background = parseBackground(cSld['p:bg']);

  // Shapes (text + autoshape)
  for (const sp of toArray(spTree['p:sp'])) {
    result.elements.push(parseShape(sp));
  }

  // Pictures
  for (const pic of toArray(spTree['p:pic'])) {
    result.elements.push(parsePicture(pic));
  }

  // Tables (graphicFrame)
  for (const gf of toArray(spTree['p:graphicFrame'])) {
    const tableEl = parseGraphicFrame(gf);
    if (tableEl) result.elements.push(tableEl);
  }

  // Groups
  for (const grp of toArray(spTree['p:grpSp'])) {
    result.elements.push(parseGroup(grp));
  }

  // Sort by original order (by spId)
  result.elements.sort((a, b) => (a.id || 0) - (b.id || 0));

  // Transition
  result.transition = parseTransition(sld['p:transition']);

  // Animations
  if (sld['p:timing']) {
    result.animations = parseAnimations(sld['p:timing']);
    // Attach animations to elements
    for (const anim of result.animations) {
      const el = result.elements.find(e => e.id === anim.targetSpId);
      if (el) {
        if (!el.animations) el.animations = [];
        el.animations.push({
          type: anim.type,
          duration: anim.duration,
          delay: anim.delay,
          trigger: anim.trigger,
          direction: anim.direction,
          order: anim.order,
        });
      }
    }
  }

  // Clean up internal fields
  for (const el of result.elements) {
    if (!el.animations || el.animations.length === 0) delete el.animations;
  }

  return result;
}

// ============================================================
// SHAPE PARSER
// ============================================================
function parseShape(sp) {
  const nvSpPr = sp['p:nvSpPr'];
  const spPr = sp['p:spPr'];
  const txBody = sp['p:txBody'];
  const cNvPr = nvSpPr['p:cNvPr'];
  const cNvSpPr = nvSpPr['p:cNvSpPr'];
  const isTextBox = cNvSpPr?.['@_txBox'] === '1';

  const result = {
    type: isTextBox ? 'text' : 'shape',
    id: parseInt(cNvPr['@_id']) || 0,
    name: cNvPr['@_name'] || '',
    position: parsePosition(spPr),
    rotation: parseRotation(spPr),
  };

  // Shape type
  if (!isTextBox) {
    const prst = spPr?.['a:prstGeom']?.['@_prst'];
    if (prst) result.shapeType = prst;
  }

  // Fill
  result.fill = parseFill(spPr);

  // Line
  result.line = parseLine(spPr?.['a:ln']);

  // Text content
  if (txBody) {
    result.text = parseParagraphs(txBody);
    // Extract text-level styles from first run for convenience
    const firstPara = result.text[0];
    if (firstPara && firstPara.runs && firstPara.runs[0]) {
      const r = firstPara.runs[0];
      if (r.fontSize) result.fontSize = r.fontSize;
      if (r.bold) result.bold = r.bold;
      if (r.italic) result.italic = r.italic;
      if (r.color) result.color = r.color;
      if (r.fontFamily) result.fontFamily = r.fontFamily;
    }
    if (firstPara?.align) result.align = firstPara.align;
  }

  // Vertical align from bodyPr
  const anchor = txBody?.['a:bodyPr']?.['@_anchor'];
  if (anchor) {
    result.vertAlign = anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top';
  }

  // Clean nulls
  cleanNulls(result);
  return result;
}

function parsePicture(pic) {
  const nvPicPr = pic['p:nvPicPr'];
  const spPr = pic['p:spPr'];
  const blipFill = pic['p:blipFill'];
  const cNvPr = nvPicPr['p:cNvPr'];

  const result = {
    type: 'image',
    id: parseInt(cNvPr['@_id']) || 0,
    name: cNvPr['@_name'] || '',
    position: parsePosition(spPr),
    rotation: parseRotation(spPr),
    _rId: blipFill?.['a:blip']?.['@_r:embed'] || '',
  };

  // Crop
  const srcRect = blipFill?.['a:srcRect'];
  if (srcRect) {
    result.crop = {
      left: parseInt(srcRect['@_l']) || 0,
      top: parseInt(srcRect['@_t']) || 0,
      right: parseInt(srcRect['@_r']) || 0,
      bottom: parseInt(srcRect['@_b']) || 0,
    };
  }

  cleanNulls(result);
  return result;
}

function parseGraphicFrame(gf) {
  const graphicData = gf?.['a:graphic']?.['a:graphicData'];
  if (!graphicData) return null;

  const tbl = graphicData['a:tbl'];
  if (!tbl) return null;

  const nvPr = gf['p:nvGraphicFramePr'];
  const cNvPr = nvPr?.['p:cNvPr'];

  // Parse position from xfrm
  const xfrm = gf['p:xfrm'];
  const position = {
    x: emuToInch(xfrm?.['a:off']?.['@_x'] || 0),
    y: emuToInch(xfrm?.['a:off']?.['@_y'] || 0),
    w: emuToInch(xfrm?.['a:ext']?.['@_cx'] || 0),
    h: emuToInch(xfrm?.['a:ext']?.['@_cy'] || 0),
  };

  const rows = [];
  for (const tr of toArray(tbl['a:tr'])) {
    const row = [];
    for (const tc of toArray(tr['a:tc'])) {
      const cell = { text: '' };
      const txBody = tc['a:txBody'];
      if (txBody) {
        const texts = [];
        for (const p of toArray(txBody['a:p'])) {
          for (const r of toArray(p['a:r'])) {
            texts.push(r['a:t'] || '');
          }
        }
        cell.text = texts.join('');

        // Cell text style
        const firstRun = toArray(txBody['a:p'])?.[0];
        const rPr = toArray(firstRun?.['a:r'])?.[0]?.['a:rPr'];
        if (rPr) {
          if (rPr['@_b'] === '1') cell.bold = true;
          if (rPr['@_sz']) cell.fontSize = parseInt(rPr['@_sz']) / 100;
          const clr = rPr['a:solidFill']?.['a:srgbClr']?.['@_val'];
          if (clr) cell.color = clr;
        }
      }

      // Cell fill
      const tcPr = tc['a:tcPr'];
      const cellFill = parseFill(tcPr);
      if (cellFill) cell.fill = cellFill;

      row.push(cell);
    }
    rows.push(row);
  }

  return {
    type: 'table',
    id: parseInt(cNvPr?.['@_id']) || 0,
    name: cNvPr?.['@_name'] || '',
    position,
    rows,
    headerRow: tbl['a:tblPr']?.['@_firstRow'] === '1',
  };
}

function parseGroup(grp) {
  const nvPr = grp['p:nvGrpSpPr'];
  const cNvPr = nvPr?.['p:cNvPr'];
  const grpSpPr = grp['p:grpSpPr'];

  const xfrm = grpSpPr?.['a:xfrm'];
  const position = {
    x: emuToInch(xfrm?.['a:off']?.['@_x'] || 0),
    y: emuToInch(xfrm?.['a:off']?.['@_y'] || 0),
    w: emuToInch(xfrm?.['a:ext']?.['@_cx'] || 0),
    h: emuToInch(xfrm?.['a:ext']?.['@_cy'] || 0),
  };

  const children = [];
  for (const sp of toArray(grp['p:sp'])) children.push(parseShape(sp));
  for (const pic of toArray(grp['p:pic'])) children.push(parsePicture(pic));

  return {
    type: 'group',
    id: parseInt(cNvPr?.['@_id']) || 0,
    name: cNvPr?.['@_name'] || '',
    position,
    children,
  };
}

// ============================================================
// ANIMATION PARSER
// ============================================================
function parseAnimations(timing) {
  const animations = [];
  let order = 0;

  try {
    const tnLst = timing['p:tnLst'];
    const rootPar = toArray(tnLst['p:par'])[0];
    const rootCTn = rootPar['p:cTn'];
    const rootChildren = rootCTn['p:childTnLst'];

    // Find mainSeq
    const seqs = toArray(rootChildren['p:seq']);
    if (seqs.length === 0) return animations;

    const mainSeq = seqs[0];
    const seqCTn = mainSeq['p:cTn'];
    const clickGroups = toArray(seqCTn['p:childTnLst']?.['p:par']);

    for (const clickGroup of clickGroups) {
      const effects = findEffectNodes(clickGroup);
      for (const effect of effects) {
        const anim = parseEffectNode(effect, order++);
        if (anim) animations.push(anim);
      }
    }
  } catch (e) {
    // Animation parsing is best-effort
    console.warn('Warning: Could not fully parse animations:', e.message);
  }

  return animations;
}

function findEffectNodes(node, results = []) {
  if (!node) return results;

  const cTn = node['p:cTn'];
  if (cTn && cTn['@_presetID']) {
    results.push(node);
    return results;
  }

  // Recurse into child p:par nodes
  const childTnLst = cTn?.['p:childTnLst'];
  if (childTnLst) {
    for (const child of toArray(childTnLst['p:par'])) {
      findEffectNodes(child, results);
    }
  }

  return results;
}

function parseEffectNode(node, order) {
  const cTn = node['p:cTn'];
  if (!cTn) return null;

  const presetID = parseInt(cTn['@_presetID']) || 0;
  const presetClass = cTn['@_presetClass'] || 'entr';
  const presetSubtype = cTn['@_presetSubtype'] || '0';
  const nodeType = cTn['@_nodeType'] || 'clickEffect';

  const key = `${presetID}_${presetClass}`;
  const typeName = PRESET_REVERSE[key] || `preset_${presetID}_${presetClass}`;

  // Find target spId and duration by traversing children
  let targetSpId = null;
  let duration = 500;
  let delay = 0;

  // Check stCondLst for delay
  const stCond = cTn['p:stCondLst']?.['p:cond'];
  if (stCond) {
    const d = toArray(stCond)[0]?.['@_delay'];
    if (d && d !== 'indefinite') delay = parseInt(d) || 0;
  }

  // Traverse children to find target and duration
  const childTnLst = cTn['p:childTnLst'];
  if (childTnLst) {
    traverseForTarget(childTnLst, (spid, dur) => {
      if (spid) targetSpId = parseInt(spid);
      if (dur && dur !== 'indefinite') duration = parseInt(dur);
    });
  }

  const trigger = nodeType === 'withEffect' ? 'withPrevious'
    : nodeType === 'afterEffect' ? 'afterPrevious' : 'onClick';

  const result = {
    type: typeName,
    targetSpId,
    duration,
    delay,
    trigger,
    order,
  };

  // Direction for fly animations
  if ((typeName === 'flyIn' || typeName === 'flyOut') && presetSubtype !== '0') {
    result.direction = FLY_DIR_REVERSE[presetSubtype] || 'bottom';
  }

  return result;
}

function traverseForTarget(node, callback) {
  // Check animEffect
  const animEffect = node['p:animEffect'];
  if (animEffect) {
    const cBhvr = animEffect['p:cBhvr'];
    const spid = cBhvr?.['p:tgtEl']?.['p:spTgt']?.['@_spid'];
    const dur = cBhvr?.['p:cTn']?.['@_dur'];
    callback(spid, dur);
  }

  // Check anim
  const anim = node['p:anim'];
  if (anim) {
    const cBhvr = anim['p:cBhvr'];
    const spid = cBhvr?.['p:tgtEl']?.['p:spTgt']?.['@_spid'];
    const dur = cBhvr?.['p:cTn']?.['@_dur'];
    callback(spid, dur);
  }

  // Check set
  const set = node['p:set'];
  if (set) {
    const cBhvr = set['p:cBhvr'];
    const spid = cBhvr?.['p:tgtEl']?.['p:spTgt']?.['@_spid'];
    const dur = cBhvr?.['p:cTn']?.['@_dur'];
    callback(spid, dur);
  }

  // Check animScale
  const animScale = node['p:animScale'];
  if (animScale) {
    const cBhvr = animScale['p:cBhvr'];
    const spid = cBhvr?.['p:tgtEl']?.['p:spTgt']?.['@_spid'];
    const dur = cBhvr?.['p:cTn']?.['@_dur'];
    callback(spid, dur);
  }

  // Check animRot
  const animRot = node['p:animRot'];
  if (animRot) {
    const cBhvr = animRot['p:cBhvr'];
    const spid = cBhvr?.['p:tgtEl']?.['p:spTgt']?.['@_spid'];
    const dur = cBhvr?.['p:cTn']?.['@_dur'];
    callback(spid, dur);
  }
}

// ============================================================
// PROPERTY PARSERS
// ============================================================
function parsePosition(spPr) {
  const xfrm = spPr?.['a:xfrm'];
  if (!xfrm) return { x: 0, y: 0, w: 1, h: 1 };
  return {
    x: emuToInch(xfrm['a:off']?.['@_x'] || 0),
    y: emuToInch(xfrm['a:off']?.['@_y'] || 0),
    w: emuToInch(xfrm['a:ext']?.['@_cx'] || 0),
    h: emuToInch(xfrm['a:ext']?.['@_cy'] || 0),
  };
}

function parseRotation(spPr) {
  const rot = spPr?.['a:xfrm']?.['@_rot'];
  if (!rot) return undefined;
  return parseInt(rot) / 60000;
}

function parseFill(node) {
  if (!node) return null;

  // Solid fill
  const solid = node['a:solidFill'];
  if (solid) {
    return extractColor(solid);
  }

  // Gradient fill
  const grad = node['a:gradFill'];
  if (grad) {
    const gsLst = grad['a:gsLst'];
    const stops = toArray(gsLst?.['a:gs']).map(gs => ({
      position: (parseInt(gs['@_pos']) || 0) / 1000,
      color: extractColor(gs),
    }));
    const angle = grad['a:lin']?.['@_ang'];
    return {
      type: 'gradient',
      stops,
      angle: angle ? parseInt(angle) / 60000 : 0,
    };
  }

  return null;
}

function parseLine(ln) {
  if (!ln) return null;
  const width = ln['@_w'] ? parseInt(ln['@_w']) / 12700 : null;
  const color = extractColor(ln['a:solidFill']);
  const dash = ln['a:prstDash']?.['@_val'] || null;
  if (!width && !color) return null;
  return { width, color, dash };
}

function parseParagraphs(txBody) {
  const paragraphs = [];
  for (const p of toArray(txBody['a:p'])) {
    const para = { runs: [] };

    // Paragraph properties
    const pPr = p['a:pPr'];
    if (pPr) {
      const algnMap = { l: 'left', ctr: 'center', r: 'right', just: 'justify' };
      if (pPr['@_algn']) para.align = algnMap[pPr['@_algn']] || pPr['@_algn'];

      // Bullet
      if (pPr['a:buChar']) para.bullet = pPr['a:buChar']['@_char'] || true;

      // Line spacing
      const lnSpc = pPr['a:lnSpc']?.['a:spcPct']?.['@_val'];
      if (lnSpc) para.lineSpacing = parseInt(lnSpc) / 100000;
    }

    // Runs
    for (const r of toArray(p['a:r'])) {
      const run = { text: r['a:t'] || '' };
      const rPr = r['a:rPr'];
      if (rPr) {
        if (rPr['@_sz']) run.fontSize = parseInt(rPr['@_sz']) / 100;
        if (rPr['@_b'] === '1') run.bold = true;
        if (rPr['@_i'] === '1') run.italic = true;
        if (rPr['@_u'] === 'sng') run.underline = true;
        if (rPr['@_strike'] === 'sngStrike') run.strike = true;
        if (rPr['@_spc'] != null) run.letterSpacing = parseInt(rPr['@_spc']) / 100;
        run.color = extractColor(rPr['a:solidFill']);
        const latin = rPr['a:latin'];
        if (latin) run.fontFamily = latin['@_typeface'];
      }
      cleanNulls(run);
      para.runs.push(run);
    }

    if (para.runs.length > 0) paragraphs.push(para);
  }
  return paragraphs;
}

function parseBackground(bg) {
  if (!bg) return null;
  const bgPr = bg['p:bgPr'];
  if (!bgPr) {
    // bgRef (theme reference)
    const bgRef = bg['p:bgRef'];
    if (bgRef) return extractColor(bgRef);
    return null;
  }

  const fill = parseFill(bgPr);
  return fill;
}

function parseTransition(tr) {
  if (!tr) return null;

  const speed = tr['@_spd'] || 'med';
  const advTm = tr['@_advTm'];
  const advClick = tr['@_advClick'];

  // Find transition type
  let type = 'fade';
  const typeKeys = ['p:fade', 'p:push', 'p:wipe', 'p:split', 'p:cover', 'p:cut', 'p:dissolve', 'p:random'];
  for (const key of typeKeys) {
    if (tr[key] != null) {
      type = key.replace('p:', '');
      break;
    }
  }

  const result = { type, speed };
  if (advTm) result.advanceAfter = parseInt(advTm);
  if (advClick === '0') result.advanceOnClick = false;

  return result;
}

function parseTheme(themeXml) {
  try {
    const theme = themeXml['a:theme'];
    const elements = theme['a:themeElements'];
    const clrScheme = elements['a:clrScheme'];
    const fontScheme = elements['a:fontScheme'];

    const colors = {};
    const colorKeys = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    for (const key of colorKeys) {
      const node = clrScheme[`a:${key}`];
      if (node) colors[key] = extractColor(node) || '';
    }

    return {
      name: theme['@_name'] || '',
      colors,
      majorFont: fontScheme?.['a:majorFont']?.['a:latin']?.['@_typeface'] || '',
      minorFont: fontScheme?.['a:minorFont']?.['a:latin']?.['@_typeface'] || '',
    };
  } catch (e) {
    return {};
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function extractColor(node) {
  if (!node) return null;
  const srgb = node['a:srgbClr'];
  if (srgb) return srgb['@_val'] || null;
  const scheme = node['a:schemeClr'];
  if (scheme) return scheme['@_val'] || null;
  return null;
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function readXml(zip, filePath) {
  const file = zip.file(filePath);
  if (!file) throw new Error(`File not found in ZIP: ${filePath}`);
  const content = await file.async('string');
  return parser.parse(content);
}

function buildRelMap(relsXml) {
  const map = {};
  const rels = relsXml['Relationships'];
  const relList = toArray(rels['Relationship']);
  for (const rel of relList) {
    map[rel['@_Id']] = rel['@_Target'];
  }
  return map;
}

function cleanNulls(obj) {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null || obj[key] === undefined) delete obj[key];
  }
}

module.exports = { parse };
