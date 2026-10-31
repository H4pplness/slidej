const { ANIMATION_PRESETS, FLY_DIRECTIONS, TRIGGER_TYPES } = require('../utils/constants');

const MAIN_SEQ_ID = 2;
// Emphasis effects written with autoRev="1" play forward then back: 2 × duration.
const AUTO_REVERSE = new Set(['pulse', 'growShrink']);
const TEXT_UNITS = ['paragraph', 'word', 'letter'];

/**
 * Generate the entire <p:timing> block for a slide
 * @param {Array} animatedElements - elements that have animations
 * @param {object} slideSize - { width, height } of the slide in inches (for motion paths)
 * @param {function} warn - receives a message for each animation that cannot be built as asked
 * @returns {string} XML string
 */
function generateTiming(animatedElements, slideSize = { width: 13.333, height: 7.5 }, warn = () => {}) {
  if (!animatedElements || animatedElements.length === 0) return '';

  // Flatten all animations with their element references. An animation may
  // target another element (`_target`, set when a component is played item by
  // item) and may split into one effect per paragraph.
  const allAnims = [];
  const paragraphBuilds = new Set();
  for (const el of animatedElements) {
    for (const anim of el.animations) {
      const target = anim._target || el;
      allAnims.push(...expandTextBuild({ ...anim, spId: target._spId }, target, warn, paragraphBuilds));
    }
  }
  if (allAnims.length === 0) return '';

  // Sort by order if specified (stable, so units of one animation stay together)
  allAnims.sort((a, b) => (a.order || 0) - (b.order || 0));

  let nodeId = MAIN_SEQ_ID;
  const getNextId = () => ++nodeId;

  // PowerPoint's structure: click group > steps > effects.
  // onClick opens a click group, afterPrevious opens a step inside it, and
  // withPrevious joins the current step. Each step starts when the previous
  // one has finished, so the step's delay is the running end time.
  const clickGroups = [];
  for (const anim of allAnims) {
    const trigger = anim.trigger || 'onClick';
    const group = clickGroups[clickGroups.length - 1];
    if (trigger === 'onClick' || !group) {
      clickGroups.push({ auto: trigger !== 'onClick', steps: [[anim]] });
    } else if (trigger === 'afterPrevious') {
      group.steps.push([anim]);
    } else {
      group.steps[group.steps.length - 1].push(anim);
    }
  }

  let clickGroupsXml = '';
  for (const group of clickGroups) {
    const groupId = getNextId();
    let stepsXml = '';
    let start = 0;
    for (const step of group.steps) {
      const stepId = getNextId();
      const effectsXml = step.map(anim => generateEffectNode(anim, getNextId, slideSize)).join('');
      stepsXml += `<p:par>
  <p:cTn id="${stepId}" fill="hold">
    <p:stCondLst><p:cond delay="${start}"/></p:stCondLst>
    <p:childTnLst>${effectsXml}</p:childTnLst>
  </p:cTn>
</p:par>`;
      start += Math.max(...step.map(effectEnd));
    }

    // A group that does not start with a click plays as soon as the slide begins.
    const autoStart = group.auto ? `<p:cond evt="onBegin" delay="0"><p:tn val="${MAIN_SEQ_ID}"/></p:cond>` : '';
    clickGroupsXml += `<p:par>
  <p:cTn id="${groupId}" fill="hold">
    <p:stCondLst><p:cond delay="indefinite"/>${autoStart}</p:stCondLst>
    <p:childTnLst>${stepsXml}</p:childTnLst>
  </p:cTn>
</p:par>`;
  }

  // Shapes whose text is revealed paragraph by paragraph need a build entry.
  const bldLst = paragraphBuilds.size
    ? `<p:bldLst>${[...paragraphBuilds].map(id => `<p:bldP spid="${id}" grpId="0" build="p"/>`).join('')}</p:bldLst>`
    : '';

  return `<p:timing>
  <p:tnLst>
    <p:par>
      <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
        <p:childTnLst>
          <p:seq concurrent="1" nextAc="seek">
            <p:cTn id="${MAIN_SEQ_ID}" dur="indefinite" nodeType="mainSeq">
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
  </p:tnLst>${bldLst}
</p:timing>`;
}

/**
 * Timing of unit `i` when one animation is spread over consecutive units
 * (component items, paragraphs). Unit 0 keeps the animation's own trigger and
 * delay. With `stagger`, later units play with it, `stagger` ms apart;
 * without it, each unit repeats the trigger (one click per unit, or a chain).
 */
function unitTiming(anim, i) {
  const delay = anim.delay || 0;
  if (i === 0) return { trigger: anim.trigger, delay };
  if (anim.stagger != null) return { trigger: 'withPrevious', delay: delay + i * anim.stagger };
  return { trigger: anim.trigger, delay };
}

/**
 * Resolve `by` on a text-bearing element into effects with their targets:
 * one effect per paragraph, or one effect iterating over words / letters.
 */
function expandTextBuild(anim, el, warn, paragraphBuilds) {
  const whole = [{ ...anim, tgt: spTgt(anim.spId) }];
  const by = anim.by;
  if (!by) return whole;
  const label = `${el.name ? `"${el.name}"` : el.type} ${anim.type}`;
  if (!TEXT_UNITS.includes(by)) {
    warn(by === 'item'
      ? `${label}: by "item" only works on components, groups and boxes; animating it as a whole`
      : `${label}: unknown by "${by}" (use item, paragraph, word or letter); animating it as a whole`);
    return whole;
  }
  const paragraphs = textParagraphs(el, by);
  if (!paragraphs) {
    warn(`${label}: by "${by}" needs a text or a shape with text; animating it as a whole`);
    return whole;
  }

  if (by === 'paragraph') {
    paragraphBuilds.add(anim.spId);
    return paragraphs.map((_, i) => ({ ...anim, ...unitTiming(anim, i), tgt: spTgt(anim.spId, i) }));
  }

  // Words / letters: one effect that PowerPoint repeats per unit. `stagger` is
  // the gap between units, written as a percentage of the duration (max 100%).
  const joined = paragraphs.join(' ');
  const units = by === 'word' ? joined.split(/\s+/).filter(Boolean).length : joined.length;
  const dur = anim.duration || 500;
  const pct = anim.stagger != null ? Math.max(0, Math.min(100000, Math.round(anim.stagger / dur * 100000))) : 10000;
  return [{ ...anim, tgt: spTgt(anim.spId), iterate: { type: by === 'word' ? 'wd' : 'lt', pct, units: Math.max(units, 1) } }];
}

/**
 * Plain text of each paragraph as the slide generator writes it, or null when
 * the element has no text body. With by "paragraph" a string's "\n" lines are
 * written as separate paragraphs (see generateParagraphs in slide.js).
 */
function textParagraphs(el, by) {
  if (!['text', 'shape'].includes(el.type) || el.text == null || el.text === '') return null;
  if (typeof el.text === 'string') return by === 'paragraph' ? el.text.split('\n') : [el.text.replace(/\n/g, ' ')];
  if (!Array.isArray(el.text)) return null;
  return el.text.map(p => typeof p === 'string' ? p
    : p.runs ? p.runs.map(r => r.text || '').join('') : String(p.text || ''));
}

function spTgt(spId, paragraph) {
  if (paragraph == null) return `<p:spTgt spid="${spId}"/>`;
  return `<p:spTgt spid="${spId}"><p:txEl><p:pRg st="${paragraph}" end="${paragraph}"/></p:txEl></p:spTgt>`;
}

/** When an effect ends, in ms after its step starts. */
function effectEnd(anim) {
  const dur = anim.duration || 500;
  let span = AUTO_REVERSE.has(anim.type) ? dur * 2 : dur;
  if (anim.iterate) span += (anim.iterate.units - 1) * dur * anim.iterate.pct / 100000;
  return (anim.delay || 0) + Math.round(span);
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

  // Word / letter builds: CT_TLCommonTimeNodeData puts <p:iterate> after stCondLst.
  const iterateXml = anim.iterate
    ? `<p:iterate type="${anim.iterate.type}"><p:tmPct val="${anim.iterate.pct}"/></p:iterate>`
    : '';

  return `<p:par>
  <p:cTn id="${effectId}" presetID="${preset.presetID}" presetClass="${preset.presetClass}"${presetSubtype !== '0' ? ` presetSubtype="${presetSubtype}"` : ''} fill="hold" grpId="0" nodeType="${nodeType}">
    <p:stCondLst><p:cond delay="${delay}"/></p:stCondLst>${iterateXml}
    <p:childTnLst>${behaviorXml}</p:childTnLst>
  </p:cTn>
</p:par>`;
}


/**
 * Generate the behavior/action XML for an animation
 */
function generateBehavior(anim, preset, dur, getNextId, slideSize) {
  const tgt = anim.tgt;

  // APPEAR: just a <p:set> to make visible
  if (anim.type === 'appear') {
    return generateSetVisibility(tgt, dur, getNextId);
  }

  // FADE IN/OUT: <p:animEffect> with fade filter
  if (anim.type === 'fadeIn' || anim.type === 'fadeOut') {
    const transition = preset.presetClass === 'entr' ? 'in' : 'out';
    return generateAnimEffect(tgt, dur, 'fade', transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(tgt, 0, getNextId) : '');
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
    return generateSetVisibility(tgt, 0, getNextId) +
      generateAnimEffect(tgt, dur, 'fade', 'in', getNextId) +
      generateScaleKeyframes(tgt, dur, getNextId, [
        { tm: 0, x: 0, y: 100000 },
        { tm: 100000, x: 100000, y: 100000 },
      ]);
  }

  // WIPE IN/OUT
  if (anim.type === 'wipeIn' || anim.type === 'wipeOut') {
    const dir = anim.direction || 'down';
    const filter = `wipe(${dir})`;
    const transition = preset.presetClass === 'entr' ? 'in' : 'out';
    return generateAnimEffect(tgt, dur, filter, transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(tgt, 0, getNextId) : '');
  }

  // ZOOM IN/OUT
  if (anim.type === 'zoomIn' || anim.type === 'zoomOut') {
    return generateScaleAnimation(anim, preset, dur, getNextId);
  }

  // BOUNCE IN: appear + scale overshoot keyframes
  if (anim.type === 'bounceIn') {
    return generateSetVisibility(tgt, 0, getNextId) +
      generateScaleKeyframes(tgt, dur, getNextId, [
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
    return generateAnimEffect(tgt, dur, preset.filter, transition, getNextId) +
      (preset.presetClass === 'entr' ? generateSetVisibility(tgt, 0, getNextId) : '');
  }

  // Fallback to set visibility
  return generateSetVisibility(tgt, dur, getNextId);
}

/**
 * <p:set> — instantly set visibility
 */
function generateSetVisibility(tgt, dur, getNextId) {
  return `<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur || 1}" fill="hold">
      <p:stCondLst><p:cond delay="0"/></p:stCondLst>
    </p:cTn>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><p:strVal val="visible"/></p:to>
</p:set>`;
}

/**
 * <p:animEffect> — filter-based animation (fade, wipe, dissolve, etc.)
 */
function generateAnimEffect(tgt, dur, filter, transition, getNextId) {
  return `<p:animEffect transition="${transition}" filter="${filter}">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}"/>
    <p:tgtEl>${tgt}</p:tgtEl>
  </p:cBhvr>
</p:animEffect>`;
}

/**
 * Fly in/out animation with position interpolation
 */
function generateFlyAnimation(anim, preset, dur, getNextId) {
  const tgt = anim.tgt;
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
    xml += generateSetVisibility(tgt, 0, getNextId);
  }

  xml += `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
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
  const tgt = anim.tgt;
  const isEntrance = preset.presetClass === 'entr';
  const isExit = preset.presetClass === 'exit';
  const scale = anim.scale || 110;

  let xml = '';
  if (isEntrance) xml += generateSetVisibility(tgt, 0, getNextId);

  // animScale x/y units: 100000 = 100%
  if (isEntrance || isExit) {
    // Entrance: grow 0% -> 100%.  Exit: shrink 100% -> 0%.
    const from = isEntrance ? 0 : 100000;
    const to = isEntrance ? 100000 : 0;
    xml += `<p:animScale>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
  </p:cBhvr>
  <p:from x="${from}" y="${from}"/>
  <p:to x="${to}" y="${to}"/>
</p:animScale>`;
  } else {
    // Emphasis (pulse / grow-shrink): 100% -> scale% -> 100% via autoReverse
    const to = Math.round(scale * 1000);
    xml += `<p:animScale>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" autoRev="1" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
  </p:cBhvr>
  <p:from x="100000" y="100000"/>
  <p:to x="${to}" y="${to}"/>
</p:animScale>`;
  }

  return xml;
}

/**
 * Rotation animation (spin)
 */
function generateRotateAnimation(anim, dur, getNextId) {
  const tgt = anim.tgt;
  const degrees = anim.degrees || 360;

  return `<p:animRot by="${degrees * 60000}">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst>
  </p:cBhvr>
</p:animRot>`;
}

/**
 * Float in/out — fade combined with a short vertical drift
 */
function generateFloatAnimation(anim, preset, dur, getNextId) {
  const tgt = anim.tgt;
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
  if (isEntrance) xml += generateSetVisibility(tgt, 0, getNextId);
  xml += generateAnimEffect(tgt, dur, 'fade', isEntrance ? 'in' : 'out', getNextId);
  xml += `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
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
function generateScaleKeyframes(tgt, dur, getNextId, frames) {
  // ppt_w/ppt_h are fractions of the slide size, so scale the shape's own size
  // (#ppt_w) by the frame's factor, as PowerPoint's zoom presets do.
  const val = (prop, v) => `<p:val><p:strVal val="${v === 0 ? '0' : v === 100000 ? `#${prop}` : `#${prop}*${v / 100000}`}"/></p:val>`;
  const tavX = frames.map(f => `<p:tav tm="${f.tm}">${val('ppt_w', f.x)}</p:tav>`).join('');
  const tavY = frames.map(f => `<p:tav tm="${f.tm}">${val('ppt_h', f.y)}</p:tav>`).join('');
  return `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_w</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tavX}</p:tavLst>
</p:anim>
<p:anim calcmode="lin" valueType="num">
  <p:cBhvr additive="base">
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>ppt_h</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tavY}</p:tavLst>
</p:anim>`;
}

/**
 * Teeter — rocking rotation back and forth
 */
function generateTeeterAnimation(anim, dur, getNextId) {
  const tgt = anim.tgt;
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
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:tavLst>${tav}</p:tavLst>
</p:anim>`;
}

/**
 * Color change (emphasis) — animate fill color to a target
 */
function generateColorAnimation(anim, dur, getNextId) {
  const tgt = anim.tgt;
  const hex = (anim.color || 'FF0000').replace('#', '');
  return `<p:animClr clrSpc="rgb">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>fillColor</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><a:srgbClr val="${hex}"/></p:to>
</p:animClr>`;
}

/**
 * Transparency (emphasis) — animate the shape's opacity
 */
function generateTransparencyAnimation(anim, dur, getNextId) {
  const tgt = anim.tgt;
  const opacity = anim.opacity != null ? anim.opacity : 50; // percent
  const to = Math.round(opacity * 1000);
  return `<p:anim calcmode="lin" valueType="num">
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${dur}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
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
  const tgt = anim.tgt;
  return `<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="${Math.round(dur / 2)}" fill="hold"/>
    <p:tgtEl>${tgt}</p:tgtEl>
    <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
  </p:cBhvr>
  <p:to><p:strVal val="hidden"/></p:to>
</p:set>
<p:set>
  <p:cBhvr>
    <p:cTn id="${getNextId()}" dur="1" fill="hold">
      <p:stCondLst><p:cond delay="${Math.round(dur / 2)}"/></p:stCondLst>
    </p:cTn>
    <p:tgtEl>${tgt}</p:tgtEl>
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
  const tgt = anim.tgt;
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
    <p:tgtEl>${tgt}</p:tgtEl>
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

module.exports = { generateTiming, unitTiming, effectEnd };
