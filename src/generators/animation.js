const { ANIMATION_PRESETS, FLY_DIRECTIONS, TRIGGER_TYPES } = require('../utils/constants');

/**
 * Generate the entire <p:timing> block for a slide
 * @param {Array} animatedElements - elements that have animations
 * @param {object} slideSize - { width, height } of the slide in inches (for motion paths)
 * @returns {string} XML string
 */
function generateTiming(animatedElements, slideSize = { width: 13.333, height: 7.5 }) {
  if (!animatedElements || animatedElements.length === 0) return '';

  // Flatten all animations with their element references
  const allAnims = [];
  for (const el of animatedElements) {
    for (const anim of el.animations) {
      allAnims.push({ ...anim, spId: el._spId });
    }
  }
  if (allAnims.length === 0) return '';

  // Sort by order if specified
  allAnims.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Build animation nodes
  let nodeId = 1;
  const getNextId = () => ++nodeId;

  // Group animations by trigger
  // onClick => new click group, withPrevious/afterPrevious => same click group
  const clickGroups = [];
  let currentGroup = [];

  for (const anim of allAnims) {
    const trigger = anim.trigger || 'onClick';
    if (trigger === 'onClick' || currentGroup.length === 0) {
      if (currentGroup.length > 0) clickGroups.push(currentGroup);
      currentGroup = [anim];
    } else {
      currentGroup.push(anim);
    }
  }
  if (currentGroup.length > 0) clickGroups.push(currentGroup);

  // Generate click group XML
  let clickGroupsXml = '';
  for (const group of clickGroups) {
    let effectsXml = '';
    for (const anim of group) {
      effectsXml += generateEffectNode(anim, getNextId, slideSize);
    }

    const groupId = getNextId();
    const innerId = getNextId();
    clickGroupsXml +=
`<p:par>
  <p:cTn id="${groupId}" fill="hold">
    <p:stCondLst><p:cond delay="0"/></p:stCondLst>
    <p:childTnLst>
      <p:par>
        <p:cTn id="${innerId}" fill="hold">
          <p:stCondLst><p:cond delay="0"/></p:stCondLst>
          <p:childTnLst>${effectsXml}</p:childTnLst>
        </p:cTn>
      </p:par>
    </p:childTnLst>
  </p:cTn>
</p:par>`;
  }

  const seqId = getNextId();
  const rootId = 1; // always 1

  return `<p:timing>
  <p:tnLst>
    <p:par>
      <p:cTn id="${rootId}" dur="indefinite" restart="never" nodeType="tmRoot">
        <p:childTnLst>
          <p:seq concurrent="1" nextAc="seek">
            <p:cTn id="${seqId}" dur="indefinite" nodeType="mainSeq">
              <p:childTnLst>${clickGroupsXml}</p:childTnLst>
            </p:cTn>
            <p:prevCondLst>
              <p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond>
            </p:prevCondLst>
            <p:nextCondLst>
              <p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond>
            </p:nextCondLst>
          </p:seq>
        </p:childTnLst>
      </p:cTn>
    </p:par>
  </p:tnLst>
</p:timing>`;
}

/**
 * Generate a single effect node (one animation on one shape)
 */
function generateEffectNode(anim, getNextId, slideSize) {
  const preset = ANIMATION_PRESETS[anim.type];
  if (!preset) {
    console.warn(`Unknown animation type: ${anim.type}, skipping`);
    return '';
  }

  const dur = anim.duration || 500;
  const delay = anim.delay || 0;
  const presetSubtype = getSubtype(anim);
  const nodeType = getNodeType(anim.trigger);

  const effectId = getNextId();

  // Build behavior XML based on animation type
  const behaviorXml = generateBehavior(anim, preset, dur, getNextId, slideSize);

  return `<p:par>
  <p:cTn id="${effectId}" presetID="${preset.presetID}" presetClass="${preset.presetClass}"${presetSubtype !== '0' ? ` presetSubtype="${presetSubtype}"` : ''} fill="hold" grpId="0" nodeType="${nodeType}">
    <p:stCondLst><p:cond delay="${delay}"/></p:stCondLst>
    <p:childTnLst>${behaviorXml}</p:childTnLst>
  </p:cTn>
</p:par>`;
}

/**
 * Generate the behavior/action XML for an animation
 */
function generateBehavior(anim, preset, dur, getNextId, slideSize) {
  const spId = anim.spId;

  // APPEAR: just a <p:set> to make visible
  if (anim.type === 'appear') {
    return generateSetVisibility(spId, dur, getNextId);
  }

  // FADE IN/OUT: <p:animEffect> with fade filter
  if (anim.type === 'fadeIn' || anim.type === 'fadeOut') {
    const transition = preset.presetClass === 'entr' ? 'in' : 'out';
    return generateAnimEffect(spId, dur, 'fade', transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(spId, 0, getNextId) : '');
  }

  // FLY IN/OUT: <p:anim> for position + <p:animEffect>
  if (anim.type === 'flyIn' || anim.type === 'flyOut') {
    return generateFlyAnimation(anim, preset, dur, getNextId);
  }

  // FLOAT IN/OUT: fade + short vertical drift
  if (anim.type === 'floatIn' || anim.type === 'floatOut') {
    return generateFloatAnimation(anim, preset, dur, getNextId);
  }

  // SWIVEL: fade + horizontal scale (fakes a swivel-in around the vertical axis)
  if (anim.type === 'swivel') {
    return generateSetVisibility(spId, 0, getNextId) +
      generateAnimEffect(spId, dur, 'fade', 'in', getNextId) +
      generateScaleKeyframes(spId, dur, getNextId, [
        { tm: 0, x: 0, y: 100000 },
        { tm: 100000, x: 100000, y: 100000 },
      ]);
  }

  // WIPE IN/OUT
  if (anim.type === 'wipeIn' || anim.type === 'wipeOut') {
    const dir = anim.direction || 'down';
    const filter = `wipe(${dir})`;
    const transition = preset.presetClass === 'entr' ? 'in' : 'out';
    return generateAnimEffect(spId, dur, filter, transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(spId, 0, getNextId) : '');
  }

  // ZOOM IN/OUT
  if (anim.type === 'zoomIn' || anim.type === 'zoomOut') {
    return generateScaleAnimation(anim, preset, dur, getNextId);
  }

  // BOUNCE IN: appear + scale overshoot keyframes
  if (anim.type === 'bounceIn') {
    return generateSetVisibility(spId, 0, getNextId) +
      generateScaleKeyframes(spId, dur, getNextId, [
        { tm: 0, x: 0, y: 0 },
        { tm: 60000, x: 110000, y: 110000 },
        { tm: 80000, x: 95000, y: 95000 },
        { tm: 100000, x: 100000, y: 100000 },
      ]);
  }

  // PULSE / GROW-SHRINK (emphasis scale)
  if (anim.type === 'pulse' || anim.type === 'growShrink') {
    return generateScaleAnimation(anim, preset, dur, getNextId);
  }

  // SPIN (emphasis)
  if (anim.type === 'spin') {
    return generateRotateAnimation(anim, dur, getNextId);
  }

  // TEETER (emphasis rocking rotation)
  if (anim.type === 'teeter') {
    return generateTeeterAnimation(anim, dur, getNextId);
  }

  // COLOR CHANGE (emphasis)
  if (anim.type === 'colorChange') {
    return generateColorAnimation(anim, dur, getNextId);
  }

  // TRANSPARENCY (emphasis)
  if (anim.type === 'transparency') {
    return generateTransparencyAnimation(anim, dur, getNextId);
  }

  // BLINK (emphasis)
  if (anim.type === 'blink') {
    return generateBlinkAnimation(anim, dur, getNextId);
  }

  // MOTION PATH
  if (anim.type === 'motionPath') {
    return generateMotionPath(anim, dur, getNextId, slideSize);
  }

  // Default: animEffect with filter (dissolveIn/Out, splitIn, etc.)
  if (preset.filter) {
    const transition = preset.presetClass === 'entr' ? 'in' : 'out';
    return generateAnimEffect(spId, dur, preset.filter, transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(spId, 0, getNextId) : '');
  }

  // Fallback to set visibility
  return generateSetVisibility(spId, dur, getNextId);
}

/**
 * <p:set> — instantly set visibility
 */
function generateSetVisibility(spId, dur, getNextId) {
  return `<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur || 1}" fill="hold">
      <p:stCondLst><p:cond delay="0"/></p:stCondLst>
    </p:cTn>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><p:strVal val="visible"/></p:to>
</p:set>`;
}

/**
 * <p:animEffect> — filter-based animation (fade, wipe, dissolve, etc.)
 */
function generateAnimEffect(spId, dur, filter, transition, getNextId) {
  return `<p:animEffect transition="${transition}" filter="${filter}">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
  </p:cBhvr>
</p:animEffect>`;
}

/**
 * Fly in/out animation with position interpolation
 */
function generateFlyAnimation(anim, preset, dur, getNextId) {
  const spId = anim.spId;
  const dir = anim.direction || 'bottom';
  const isEntrance = preset.presetClass === 'entr';

  // Determine which property to animate and values
  let attrName, from, to;
  if (dir === 'left' || dir === 'right') {
    attrName = 'ppt_x';
    if (isEntrance) {
      from = dir === 'left' ? '0-#ppt_w/2' : '1+#ppt_w/2';
      to = '#ppt_x';
    } else {
      from = '#ppt_x';
      to = dir === 'left' ? '0-#ppt_w/2' : '1+#ppt_w/2';
    }
  } else {
    attrName = 'ppt_y';
    if (isEntrance) {
      from = dir === 'top' ? '0-#ppt_h/2' : '1+#ppt_h/2';
      to = '#ppt_y';
    } else {
      from = '#ppt_y';
      to = dir === 'top' ? '0-#ppt_h/2' : '1+#ppt_h/2';
    }
  }

  let xml = '';
  if (isEntrance) {
    xml += generateSetVisibility(spId, 0, getNextId);
  }

  xml += `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>${attrName}</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>
    <p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav>
    <p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav>
  </p:tavLst>
</p:anim>`;

  return xml;
}

/**
 * Scale animation (zoom, grow/shrink, pulse)
 */
function generateScaleAnimation(anim, preset, dur, getNextId) {
  const spId = anim.spId;
  const isEntrance = preset.presetClass === 'entr';
  const isExit = preset.presetClass === 'exit';
  const scale = anim.scale || 110;

  let fromX, fromY, toX, toY;
  if (isEntrance) {
    fromX = fromY = '0%'; toX = toY = '100%';
  } else if (isExit) {
    fromX = fromY = '100%'; toX = toY = '0%';
  } else {
    // emphasis: pulse effect
    fromX = fromY = '100%'; toX = toY = `${scale}%`;
  }

  let xml = '';
  if (isEntrance) xml += generateSetVisibility(spId, 0, getNextId);

  xml += `<p:animScale>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
  </p:cBhvr>
  <p:by x="${parseInt(toX) * 1000}" y="${parseInt(toY) * 1000}"/>
</p:animScale>`;

  return xml;
}

/**
 * Rotation animation (spin)
 */
function generateRotateAnimation(anim, dur, getNextId) {
  const spId = anim.spId;
  const degrees = anim.degrees || 360;

  return `<p:animRot by="${degrees * 60000}">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
  </p:cBhvr>
</p:animRot>`;
}

/**
 * Float in/out — fade combined with a short vertical drift
 */
function generateFloatAnimation(anim, preset, dur, getNextId) {
  const spId = anim.spId;
  const isEntrance = preset.presetClass === 'entr';
  // Drift distance as a fraction of the shape's own travel (~0.08 of slide height)
  const offset = anim.distance != null ? anim.distance : 0.083;

  let from, to;
  if (isEntrance) {
    from = `#ppt_y+${offset}`;
    to = '#ppt_y';
  } else {
    from = '#ppt_y';
    to = `#ppt_y-${offset}`;
  }

  let xml = '';
  if (isEntrance) xml += generateSetVisibility(spId, 0, getNextId);
  xml += generateAnimEffect(spId, dur, 'fade', isEntrance ? 'in' : 'out', getNextId);
  xml += `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>
    <p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav>
    <p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav>
  </p:tavLst>
</p:anim>`;
  return xml;
}

/**
 * Generic scale keyframe animation (bounce, swivel)
 * @param {Array} frames - [{ tm, x, y }] where x/y are scale in 1/1000 percent
 */
function generateScaleKeyframes(spId, dur, getNextId, frames) {
  const tavX = frames.map(f => `<p:tav tm="${f.tm}"><p:val><p:fltVal val="${f.x / 1000}"/></p:val></p:tav>`).join('');
  const tavY = frames.map(f => `<p:tav tm="${f.tm}"><p:val><p:fltVal val="${f.y / 1000}"/></p:val></p:tav>`).join('');
  return `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_w</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tavX}</p:tavLst>
</p:anim>
<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_h</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tavY}</p:tavLst>
</p:anim>`;
}

/**
 * Teeter — rocking rotation back and forth
 */
function generateTeeterAnimation(anim, dur, getNextId) {
  const spId = anim.spId;
  const a = (anim.degrees || 6) * 60000;
  const frames = [
    { tm: 0, v: 0 },
    { tm: 25000, v: a },
    { tm: 50000, v: 0 },
    { tm: 75000, v: -a },
    { tm: 100000, v: 0 },
  ];
  const tav = frames.map(f => `<p:tav tm="${f.tm}"><p:val><p:strVal val="${f.v}"/></p:val></p:tav>`).join('');
  return `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tav}</p:tavLst>
</p:anim>`;
}

/**
 * Color change (emphasis) — animate fill color to a target
 */
function generateColorAnimation(anim, dur, getNextId) {
  const spId = anim.spId;
  const hex = (anim.color || 'FF0000').replace('#', '');
  return `<p:animClr clrSpc="rgb">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>fillColor</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><a:srgbClr val="${hex}"/></p:to>
</p:animClr>`;
}

/**
 * Transparency (emphasis) — animate the shape's opacity
 */
function generateTransparencyAnimation(anim, dur, getNextId) {
  const spId = anim.spId;
  const opacity = anim.opacity != null ? anim.opacity : 50; // percent
  const to = Math.round(opacity * 1000);
  return `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>style.opacity</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>
    <p:tav tm="0"><p:val><p:strVal val="100000"/></p:val></p:tav>
    <p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav>
  </p:tavLst>
</p:anim>`;
}

/**
 * Blink (emphasis) — quickly toggle visibility off then on
 */
function generateBlinkAnimation(anim, dur, getNextId) {
  const spId = anim.spId;
  return `<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${Math.round(dur / 2)}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><p:strVal val="hidden"/></p:to>
</p:set>
<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="1" fill="hold">
      <p:stCondLst><p:cond delay="${Math.round(dur / 2)}"/></p:stCondLst>
    </p:cTn>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><p:strVal val="visible"/></p:to>
</p:set>`;
}

/**
 * Motion path — move the shape along a path.
 * JSON: { points: [{x,y}, ...] }  (relative offsets, inches, from start)
 *    or { path: "line", direction, distance }
 */
function generateMotionPath(anim, dur, getNextId, slideSize) {
  const spId = anim.spId;
  const w = (slideSize && slideSize.width) || 13.333;
  const h = (slideSize && slideSize.height) || 7.5;

  let points = anim.points;
  if (!points) {
    // Build from a directional line preset
    const dist = anim.distance != null ? anim.distance : 2;
    const dirMap = {
      right: { x: dist, y: 0 }, left: { x: -dist, y: 0 },
      down: { x: 0, y: dist }, up: { x: 0, y: -dist },
      bottom: { x: 0, y: dist }, top: { x: 0, y: -dist },
    };
    points = [dirMap[anim.direction] || { x: dist, y: 0 }];
  }

  // Path string: coordinates are fractions of slide size, relative to start (0,0)
  const fmt = (v) => Math.round(v * 100000) / 100000;
  let path = 'M 0 0';
  for (const p of points) {
    path += ` L ${fmt((p.x || 0) / w)} ${fmt((p.y || 0) / h)}`;
  }
  path += ' E';

  return `<p:animMotion origin="layout" path="${path}" pathEditMode="relative" rAng="0" ptsTypes="">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst>
  </p:cBhvr>
</p:animMotion>`;
}

/**
 * Get preset subtype (direction for fly, wipe, etc.)
 */
function getSubtype(anim) {
  if (anim.type === 'flyIn' || anim.type === 'flyOut') {
    return String(FLY_DIRECTIONS[anim.direction || 'bottom'] || 4);
  }
  return '0';
}

/**
 * Map trigger type to nodeType attribute
 */
function getNodeType(trigger) {
  switch (trigger) {
    case 'withPrevious': return 'withEffect';
    case 'afterPrevious': return 'afterEffect';
    case 'onClick':
    default: return 'clickEffect';
  }
}

module.exports = { generateTiming };
