// Paragraph property tests. Run: node test/text.test.js
const assert = require('assert');
const os = require('os');
const path = require('path');
const { paraPropsXml, xfrmXml } = require('../src/utils/xml-helpers');
const { generateSlide } = require('../src/generators/slide');
const { expandComponents } = require('../src/generators/components');
const { generate, parse } = require('../src');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('lineSpacing is written in thousandths of a percent', () => {
  assert.strictEqual(paraPropsXml({ lineSpacing: 1 }), '<a:pPr><a:lnSpc><a:spcPct val="100000"/></a:lnSpc></a:pPr>');
  assert.match(paraPropsXml({ lineSpacing: 1.1 }), /val="110000"/);
  assert.match(paraPropsXml({ lineSpacing: 1.15 }), /val="115000"/);
});

test('lineSpacing keeps alignment, indent and bullet', () => {
  const xml = paraPropsXml({ align: 'center', lineSpacing: 1.5, marginLeft: 0.25, bullet: '→' });
  assert.match(xml, /^<a:pPr algn="ctr" marL="228600">/);
  assert.match(xml, /<a:lnSpc><a:spcPct val="150000"\/><\/a:lnSpc><a:buChar char="→"\/><\/a:pPr>$/);
});

test('no paragraph properties → empty string', () => {
  assert.strictEqual(paraPropsXml({}), '');
  assert.strictEqual(paraPropsXml({ align: 'left' }), '<a:pPr algn="l"/>');
});

test('a bullet without margins gets a 1 em hanging indent', () => {
  // 18pt → 0.25" = 228600 EMU
  assert.match(paraPropsXml({ bullet: true, fontSize: 18 }), /^<a:pPr indent="-228600" marL="228600">/);
  // An explicit margin or indent is kept as given
  assert.match(paraPropsXml({ bullet: true, fontSize: 18, marginLeft: 0.5 }), /^<a:pPr marL="457200">/);
  assert.match(paraPropsXml({ bullet: true, indent: 0 }), /^<a:pPr indent="0">/);
});

test('paragraph objects inherit align and lineSpacing from the element', () => {
  const xml = generateSlide({ elements: [{
    type: 'text', align: 'center', lineSpacing: 1.3, position: { x: 1, y: 1, w: 4, h: 1 },
    text: [{ text: 'inherits' }, { text: 'own', align: 'right' }, { runs: [{ text: 'runs' }] }],
  }] }, {});
  const pPrs = [...xml.matchAll(/<a:pPr[^>]*>/g)].map(m => m[0]);
  assert.deepStrictEqual(pPrs, ['<a:pPr algn="ctr">', '<a:pPr algn="r">', '<a:pPr algn="ctr">']);
  assert.strictEqual((xml.match(/<a:spcPct val="130000"\/>/g) || []).length, 3);
});

test('a zero width or height is kept (straight lines)', () => {
  assert.match(xfrmXml({ x: 1, y: 1, w: 2, h: 0 }), /<a:ext cx="1828800" cy="0"\/>/);
  assert.match(xfrmXml({ x: 1, y: 1 }), /<a:ext cx="914400" cy="914400"\/>/);
});

test('groups use their name, so Morph can match them across slides', () => {
  const group = name => generateSlide({ elements: [{ type: 'group', name, position: { x: 0, y: 0, w: 4, h: 4 },
    children: [{ type: 'shape', shapeType: 'ellipse', position: { x: 0, y: 0, w: 4, h: 4 } }] }] }, {});
  assert.match(group('!!wheel'), /<p:cNvPr id="\d+" name="!!wheel"\/>\s*<p:cNvGrpSpPr\/>/);
  assert.match(group(undefined), /<p:cNvPr id="(\d+)" name="Group \1"\/>\s*<p:cNvGrpSpPr\/>/);
});

test('components only name their group when the element has a name', () => {
  const [plain] = expandComponents([{ type: 'kpiCard', value: '1', position: { x: 0, y: 0, w: 3, h: 1.5 } }]);
  const [named] = expandComponents([{ type: 'kpiCard', name: 'revenue', value: '1', position: { x: 0, y: 0, w: 3, h: 1.5 } }]);
  assert.strictEqual(plain.name, undefined);
  assert.strictEqual(named.name, 'revenue');
});

test('lineSpacing survives generate + parse', async () => {
  const out = path.join(os.tmpdir(), `slidej-text-${process.pid}.pptx`);
  await generate({ slides: [{ elements: [
    { type: 'text', text: 'one\ntwo', lineSpacing: 1.25, position: { x: 1, y: 1, w: 4, h: 1 } },
  ] }] }, out);
  const model = await parse(out);
  const el = model.slides[0].elements[0];
  const spacing = el.lineSpacing ?? (Array.isArray(el.text) ? el.text[0].lineSpacing : undefined);
  assert.strictEqual(spacing, 1.25);
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log(`ok   ${t.name}`); } catch (e) { failed++; console.log(`FAIL ${t.name}\n     ${e.message}`); }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
