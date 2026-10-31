// Transition tests. Run: node test/transition.test.js
const assert = require('assert');
const os = require('os');
const path = require('path');
const { generateTransition, TRANSITION_TYPES } = require('../src/generators/transition');
const { generate, parse } = require('../src');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const gen = (t) => { const w = []; return { xml: generateTransition(t, m => w.push(m), 'slide 1'), w }; };

test('no transition → empty string', () => {
  assert.strictEqual(gen(undefined).xml, '');
});

test('legacy string form is unchanged', () => {
  assert.strictEqual(gen('fade').xml, '<p:transition spd="med"><p:fade/></p:transition>');
  assert.strictEqual(gen({ type: 'push', speed: 'slow' }).xml, '<p:transition spd="slow"><p:push dir="r"/></p:transition>');
});

test('direction aliases and validation', () => {
  assert.match(gen({ type: 'push', direction: 'up' }).xml, /<p:push dir="u"\/>/);
  assert.match(gen({ type: 'cover', direction: 'down-left' }).xml, /<p:cover dir="ld"\/>/);
  const bad = gen({ type: 'push', direction: 'sideways' });
  assert.match(bad.xml, /<p:push dir="r"\/>/);
  assert.match(bad.w[0], /does not support direction "sideways"/);
});

test('unknown type warns and falls back to fade', () => {
  const r = gen({ type: 'teleport' });
  assert.match(r.xml, /<p:fade\/>/);
  assert.match(r.w[0], /unknown transition "teleport"/);
});

test('classic with custom duration uses p14:dur with a classic fallback', () => {
  const { xml } = gen({ type: 'wipe', direction: 'left', duration: 1200 });
  assert.match(xml, /<mc:Choice xmlns:p14="[^"]+" Requires="p14"><p:transition spd="slow" p14:dur="1200"><p:wipe dir="l"\/>/);
  assert.match(xml, /<mc:Fallback><p:transition spd="slow"><p:wipe dir="l"\/><\/p:transition><\/mc:Fallback>/);
});

test('p14, p15 and morph effects are wrapped with a fade fallback', () => {
  const v = gen({ type: 'vortex', direction: 'right' }).xml;
  assert.match(v, /Requires="p14"><p:transition spd="med" p14:dur="750"><p14:vortex dir="r"\/>/);
  assert.match(v, /<mc:Fallback><p:transition spd="med"><p:fade\/>/);
  const c = gen({ type: 'curtains', speed: 'slow' }).xml;
  assert.match(c, /xmlns:p15="[^"]+" Requires="p15"><p:transition spd="slow" p14:dur="1000"><p15:prstTrans prst="curtains"\/>/);
  const m = gen({ type: 'morph', morphBy: 'byWord' }).xml;
  assert.match(m, /Requires="p159"><p:transition[^>]*><p159:morph option="byWord"\/>/);
});

test('every catalog entry generates', () => {
  for (const type of TRANSITION_TYPES) {
    const { xml, w } = gen({ type });
    assert.ok(xml.includes('<p:transition'), type);
    assert.deepStrictEqual(w, [], type);
  }
});

test('round trip through generate + parse keeps type, direction and duration', async () => {
  const out = path.join(os.tmpdir(), `slidej-transition-${process.pid}.pptx`);
  const slides = [
    { type: 'fade', thruBlack: true },
    { type: 'push', direction: 'up', duration: 900 },
    { type: 'vortex', direction: 'right', speed: 'slow' },
    { type: 'curtains' },
    { type: 'morph' },
  ].map(t => ({ transition: t, elements: [{ type: 'text', text: 'x', position: { x: 1, y: 1, w: 2, h: 1 }, animations: [{ type: 'fadeIn' }] }] }));
  await generate({ slides }, out);
  const model = await parse(out, { includeImages: false });
  const got = model.slides.map(s => s.transition);
  assert.deepStrictEqual(got.map(t => t.type), ['fade', 'push', 'vortex', 'curtains', 'morph']);
  assert.strictEqual(got[0].thruBlack, true);
  assert.strictEqual(got[1].direction, 'up');
  assert.strictEqual(got[1].duration, 900);
  assert.strictEqual(got[2].direction, 'right');
});

test('transition is written before timing (CT_Slide order)', async () => {
  const JSZip = require('jszip');
  const fs = require('fs');
  const out = path.join(os.tmpdir(), `slidej-order-${process.pid}.pptx`);
  await generate({ slides: [{ transition: 'fade', elements: [{ type: 'text', text: 'x', position: { x: 1, y: 1, w: 2, h: 1 }, animations: [{ type: 'fadeIn' }] }] }] }, out);
  const xml = await (await JSZip.loadAsync(fs.readFileSync(out))).file('ppt/slides/slide1.xml').async('string');
  assert.ok(xml.indexOf('<p:transition') < xml.indexOf('<p:timing'), 'transition must precede timing');
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log(`ok   ${t.name}`); } catch (e) { failed++; console.log(`FAIL ${t.name}\n     ${e.message}`); }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
