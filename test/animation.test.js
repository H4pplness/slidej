// Animation tests. Run: node test/animation.test.js
const assert = require('assert');
const os = require('os');
const path = require('path');
const { generateTiming } = require('../src/generators/animation');
const { expandComponents } = require('../src/generators/components');
const { generate, parse } = require('../src');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

let nextSpId = 1;
const el = (animations, extra = {}) => ({ type: 'text', text: 'Hello', _spId: ++nextSpId, animations, ...extra });
const timing = (els) => { const w = []; return { xml: generateTiming(els, undefined, m => w.push(m)), w }; };
// Start delays of the step <p:par>s (fill="hold", no presetID) in document order.
const stepDelays = xml => [...xml.matchAll(/<p:cTn id="\d+" fill="hold">\s*<p:stCondLst><p:cond delay="(\d+)"\/>/g)].map(m => +m[1]);

test('afterPrevious starts a step when the previous one ends', () => {
  const { xml } = timing([
    el([{ type: 'fadeIn', trigger: 'afterPrevious', duration: 500 }]),
    el([{ type: 'fadeIn', trigger: 'afterPrevious', duration: 500 }]),
    el([{ type: 'fadeIn', trigger: 'withPrevious', duration: 500, delay: 200 }]),
    el([{ type: 'fadeIn', trigger: 'afterPrevious', duration: 300 }]),
  ]);
  // Second step waits 500; third waits for the withPrevious effect (200 + 500).
  assert.deepStrictEqual(stepDelays(xml), [0, 500, 1200]);
});

test('click groups wait for a click; a leading auto group starts on slide begin', () => {
  const auto = timing([el([{ type: 'fadeIn', trigger: 'afterPrevious' }])]).xml;
  assert.match(auto, /<p:cond delay="indefinite"\/><p:cond evt="onBegin" delay="0"><p:tn val="2"\/><\/p:cond>/);
  const click = timing([el([{ type: 'fadeIn' }])]).xml;
  assert.match(click, /<p:cond delay="indefinite"\/><\/p:stCondLst>/);
  assert.doesNotMatch(click, /onBegin/);
  assert.match(click, /<p:cTn id="2" dur="indefinite" nodeType="mainSeq">/);
});

test('pulse counts twice its duration (autoRev) before the next step', () => {
  const { xml } = timing([
    el([{ type: 'pulse', trigger: 'afterPrevious', duration: 400 }]),
    el([{ type: 'fadeIn', trigger: 'afterPrevious' }]),
  ]);
  assert.deepStrictEqual(stepDelays(xml), [0, 800]);
});

test('by paragraph: one effect per paragraph, staggered, with a build entry', () => {
  const t = el([{ type: 'fadeIn', by: 'paragraph', stagger: 300, delay: 100 }], { text: 'One\nTwo\nThree' });
  const { xml } = timing([t]);
  for (const p of [0, 1, 2]) assert.match(xml, new RegExp(`<p:spTgt spid="${t._spId}"><p:txEl><p:pRg st="${p}" end="${p}"/>`));
  assert.deepStrictEqual([...xml.matchAll(/nodeType="(\w+)">\s*<p:stCondLst><p:cond delay="(\d+)"/g)].map(m => `${m[1]}@${m[2]}`),
    ['clickEffect@100', 'withEffect@400', 'withEffect@700']);
  assert.match(xml, new RegExp(`<p:bldLst><p:bldP spid="${t._spId}" grpId="0" build="p"/></p:bldLst>`));
});

test('by paragraph without stagger repeats the trigger per paragraph', () => {
  const { xml } = timing([el([{ type: 'fadeIn', by: 'paragraph' }], { text: ['A', 'B'] })]);
  assert.strictEqual((xml.match(/nodeType="clickEffect"/g) || []).length, 2);
});

test('by word / letter iterate with stagger as a percentage of the duration', () => {
  const word = timing([el([{ type: 'flyIn', by: 'word', stagger: 100, duration: 500 }], { text: 'a b c' })]).xml;
  assert.match(word, /<\/p:stCondLst><p:iterate type="wd"><p:tmPct val="20000"\/><\/p:iterate>\s*<p:childTnLst>/);
  const letter = timing([el([{ type: 'fadeIn', by: 'letter' }])]).xml;
  assert.match(letter, /<p:iterate type="lt"><p:tmPct val="10000"\/><\/p:iterate>/);
  const capped = timing([el([{ type: 'fadeIn', by: 'letter', stagger: 9000, duration: 500 }])]).xml;
  assert.match(capped, /<p:tmPct val="100000"\/>/);
});

test('a word build lasts until its last word before the next step', () => {
  // 4 words, 500ms each, 20% apart → 500 + 3 × 100 = 800
  const { xml } = timing([
    el([{ type: 'fadeIn', trigger: 'afterPrevious', by: 'word', stagger: 100, duration: 500 }], { text: 'one two three four' }),
    el([{ type: 'fadeIn', trigger: 'afterPrevious' }]),
  ]);
  assert.deepStrictEqual(stepDelays(xml), [0, 800]);
});

test('text builds on elements without text warn and animate as a whole', () => {
  const { xml, w } = timing([el([{ type: 'fadeIn', by: 'word' }], { type: 'image', text: undefined, name: 'pic' })]);
  assert.match(w[0], /"pic" fadeIn: by "word" needs a text/);
  assert.doesNotMatch(xml, /iterate|txEl/);
  assert.match(timing([el([{ type: 'fadeIn', by: 'line' }])]).w[0], /unknown by "line"/);
});

test('bounceIn scales the shape\'s own size, not the slide', () => {
  const { xml } = timing([el([{ type: 'bounceIn' }])]);
  assert.match(xml, /<p:strVal val="#ppt_w\*1.1"\/>/);
  assert.match(xml, /<p:strVal val="#ppt_h"\/>/);
  assert.doesNotMatch(xml, /fltVal/);
});

test('component by item: parts become elements, items staggered, base with item 0', () => {
  const [first, ...rest] = expandComponents([{
    type: 'barChart', name: 'Sales', position: { x: 1, y: 1, w: 4, h: 3 }, data: [1, 2, 3], labels: ['a', 'b', 'c'], axis: true,
    animations: [{ type: 'wipeIn', direction: 'up', by: 'item', stagger: 200, trigger: 'afterPrevious' }],
  }]);
  const all = [first, ...rest];
  assert.ok(all.every(e => e.type !== 'group'));
  assert.strictEqual(all.length, 7); // axis + 3 × (bar, label)
  assert.deepStrictEqual(all.map(e => e.name), ['Sales 1', 'Sales 1', 'Sales 1', 'Sales 2', 'Sales 2', 'Sales 3', 'Sales 3']);
  const fx = first.animations;
  assert.strictEqual(fx.length, 7);
  assert.ok(fx.every(a => a.by === undefined && a.stagger === undefined));
  assert.deepStrictEqual(fx.map(a => `${a.trigger}@${a.delay}`),
    ['afterPrevious@0', 'withPrevious@0', 'withPrevious@0', 'withPrevious@200', 'withPrevious@200', 'withPrevious@400', 'withPrevious@400']);
  assert.deepStrictEqual(fx.map(a => a._target), all);
});

test('component without by item stays one animated group', () => {
  const out = expandComponents([{ type: 'ratingStars', rating: 3, position: { x: 0, y: 0, w: 3, h: 1 }, animations: [{ type: 'fadeIn' }] }]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].type, 'group');
});

test('second animation on a by-item component plays on all parts after the first', () => {
  const [first] = expandComponents([{
    type: 'ratingStars', rating: 2, max: 2, position: { x: 0, y: 0, w: 2, h: 1 },
    animations: [{ type: 'zoomIn', by: 'item', stagger: 100 }, { type: 'pulse', trigger: 'afterPrevious' }],
  }]);
  assert.deepStrictEqual(first.animations.map(a => `${a.type}:${a.trigger}@${a.delay}`),
    ['zoomIn:undefined@0', 'zoomIn:withPrevious@100', 'pulse:afterPrevious@0', 'pulse:withPrevious@0']);
});

test('group by item animates each child in turn', () => {
  const out = expandComponents([{ type: 'group', name: 'g', position: { x: 0, y: 0, w: 2, h: 1 },
    children: [{ type: 'shape', position: { x: 0, y: 0, w: 1, h: 1 } }, { type: 'shape', position: { x: 1, y: 0, w: 1, h: 1 } }],
    animations: [{ type: 'fadeIn', by: 'item', stagger: 150 }] }]);
  assert.strictEqual(out.length, 2);
  assert.deepStrictEqual(out[0].animations.map(a => a.delay), [0, 150]);
});

test('generate: box by item, then PowerPoint-style parse round trip of text builds', async () => {
  const out = path.join(os.tmpdir(), 'slidej-anim-test.pptx');
  const res = await generate({ slides: [{ elements: [
    { type: 'box', name: 'row', position: { x: 0.5, y: 0.5, w: 9, h: 2 }, style: { direction: 'row', gap: 0.2, background: 'EEEEEE' },
      animations: [{ type: 'fadeIn', by: 'item', stagger: 250, trigger: 'afterPrevious' }],
      children: [{ type: 'text', text: 'A', style: { grow: 1 } }, { type: 'kpiCard', value: '9', label: 'x', style: { grow: 1 } }] },
    { type: 'text', name: 'list', text: 'One\nTwo', position: { x: 0.5, y: 3, w: 6, h: 1 },
      animations: [{ type: 'floatIn', by: 'paragraph', stagger: 300 }] },
    { type: 'text', name: 'words', text: 'Hello big world', position: { x: 0.5, y: 4.5, w: 6, h: 1 },
      animations: [{ type: 'flyIn', direction: 'bottom', by: 'word', stagger: 100, duration: 500 }] },
  ] }] }, out);
  assert.deepStrictEqual(res.warnings, []);
  const slide = (await parse(out, { includeImages: false })).slides[0];
  const byName = n => slide.elements.filter(e => e.name === n);
  // box background + text = item 1; card parts = item 2
  assert.deepStrictEqual([...byName('row bg'), ...byName('row 1')].map(e => e.animations[0].delay), [0, 0]);
  assert.ok(byName('row 2').length >= 3 && byName('row 2').every(e => e.animations[0].delay === 250));
  const list = byName('list')[0].animations;
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual([list[0].type, list[0].duration, list[0].trigger, list[0].by, list[0].stagger], ['floatIn', 500, 'onClick', 'paragraph', 300]);
  const words = byName('words')[0].animations[0];
  assert.strictEqual(words.by, 'word');
  assert.strictEqual(words.stagger, 100);
  assert.strictEqual(words.direction, 'bottom');
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log(`ok   ${t.name}`); } catch (e) { failed++; console.log(`FAIL ${t.name}\n     ${e.message}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed) process.exit(1);
})();
