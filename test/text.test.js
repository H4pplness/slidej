// Paragraph property tests. Run: node test/text.test.js
const assert = require('assert');
const os = require('os');
const path = require('path');
const { paraPropsXml } = require('../src/utils/xml-helpers');
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
