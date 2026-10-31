// Layout engine tests. Run: node test/layout.test.js
const assert = require('assert');
const { applyLayout } = require('../src/layout');

const near = (a, b, msg, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ${b}, got ${a}`);
const deck = (slide, extra = {}) => ({ width: 10, height: 5, ...extra, slides: [slide] });
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('model without boxes is returned untouched', async () => {
  const model = deck({ elements: [{ type: 'text', text: 'hi', position: { x: 1, y: 1, w: 2, h: 1 } }] });
  const { model: out, warnings } = await applyLayout(model);
  assert.strictEqual(out, model);
  assert.deepStrictEqual(warnings, []);
});

test('row with gap, padding and grow', async () => {
  const { model } = await applyLayout(deck({
    layout: { direction: 'row', padding: 0.5, gap: 0.2 },
    elements: [
      { type: 'shape', style: { width: 2 } },
      { type: 'shape', style: { grow: 1 } },
    ],
  }));
  const [a, b] = model.slides[0].elements;
  near(a.position.x, 0.5, 'a.x'); near(a.position.w, 2, 'a.w'); near(a.position.h, 4, 'a.h stretches');
  near(b.position.x, 2.7, 'b.x'); near(b.position.w, 6.8, 'b.w grows to fill');
});

test('justify center / alignItems center', async () => {
  const { model } = await applyLayout(deck({
    layout: { justify: 'center', alignItems: 'center' },
    elements: [{ type: 'shape', style: { width: 2, height: 1 } }],
  }));
  const p = model.slides[0].elements[0].position;
  near(p.x, 4, 'x'); near(p.y, 2, 'y');
});

test('box emits background shape, border inset, radius and child insets', async () => {
  const { model } = await applyLayout(deck({ elements: [{
    type: 'box', position: { x: 1, y: 1, w: 4 },
    style: { padding: 0.25, background: '112233', border: { width: 7.2, color: 'FFFFFF' }, radius: 0.2 },
    children: [{ type: 'text', text: 'Hello', style: { fontSize: 18 } }],
  }] }));
  const [bg, txt] = model.slides[0].elements;
  assert.strictEqual(bg.shapeType, 'roundRect');
  near(bg.position.x, 1.05, 'border inset by half its width (7.2pt = 0.1")');
  near(txt.position.x, 1.35, 'text inside padding + border');
  near(txt.position.w, 3.3, 'text stretches across the content box');
  assert.ok(txt.position.h > 0.25 && txt.position.h < 0.45, `one line of 18pt, got ${txt.position.h}`);
  near(bg.position.h + 0.1, txt.position.h + 0.7, 'box height = content + padding + border');
});

test('long text wraps and grows taller in a narrow column', async () => {
  const words = 'lorem ipsum dolor sit amet '.repeat(8);
  const { model } = await applyLayout(deck({ elements: [{
    type: 'box', position: { x: 0, y: 0, w: 2 },
    children: [{ type: 'text', text: words, fontSize: 14 }],
  }] }));
  const t = model.slides[0].elements[0];
  assert.ok(t.position.h > 1, `wrapped text should be tall, got ${t.position.h}`);
});

test('text is not shrunk in a column; overflow is reported', async () => {
  const { model, warnings } = await applyLayout(deck({
    layout: { padding: 0.2 },
    elements: [
      { type: 'text', text: 'Title', fontSize: 40 },
      { type: 'shape', style: { height: 5 } },
    ],
  }));
  const title = model.slides[0].elements[0];
  assert.ok(title.position.h > 0.6, `title keeps its height, got ${title.position.h}`);
  assert.ok(warnings.some(w => /overflows its container's bottom/.test(w)), warnings.join('\n'));
});

test('classes merge in order, inline style wins, text props inherit', async () => {
  const { model, warnings } = await applyLayout(deck({
    layout: { class: 'page' },
    elements: [{ type: 'box', class: 'card big', style: { color: '00FF00' }, children: [{ type: 'text', text: 'x' }] }],
  }, { styles: { page: { padding: 0.5, fontFamily: 'Arial' }, card: { color: 'FF0000', fontSize: 20 }, big: { fontSize: 30 } } }));
  const t = model.slides[0].elements[0];
  assert.strictEqual(t.color, '00FF00');
  assert.strictEqual(t.fontSize, 30);
  assert.strictEqual(t.fontFamily, 'Arial');
  near(t.position.x, 0.5, 'padding from page class');
  assert.deepStrictEqual(warnings.filter(w => !/font .* not found/.test(w)), []);
  assert.strictEqual(model.styles, undefined);
});

test('unknown style keys, classes and enum values warn', async () => {
  const { warnings } = await applyLayout(deck({
    layout: { direction: 'sideways', paddng: 1 },
    elements: [{ type: 'box', class: 'nope', children: [] }],
  }));
  assert.ok(warnings.some(w => /unknown style property "paddng"/.test(w)));
  assert.ok(warnings.some(w => /invalid direction "sideways"/.test(w)));
  assert.ok(warnings.some(w => /unknown class "nope"/.test(w)));
});

test('absolute children and legacy position inside a box', async () => {
  const { model } = await applyLayout(deck({ elements: [{
    type: 'box', position: { x: 1, y: 1, w: 4, h: 2 }, style: { padding: 0.5 },
    children: [
      { type: 'shape', style: { position: 'absolute', right: 0, top: 0, width: 1, height: 1 } },
      { type: 'shape', position: { x: 0, y: 0, w: 0.5, h: 0.5 } },
    ],
  }] }));
  const [a, b] = model.slides[0].elements;
  near(a.position.x, 4, 'right: 0 against the box edge');
  near(b.position.x, 1, 'legacy position is relative to the box');
});

test('elements with position stay absolute next to the flow', async () => {
  const fixed = { type: 'shape', position: { x: 9, y: 4, w: 1, h: 1 } };
  const { model } = await applyLayout(deck({
    layout: {},
    elements: [{ type: 'shape', style: { height: 1 } }, fixed],
  }));
  assert.deepStrictEqual(model.slides[0].elements[1].position, fixed.position);
  near(model.slides[0].elements[0].position.y, 0, 'flow ignores the absolute element');
});

test('animated box becomes one group with flattened children', async () => {
  const { model } = await applyLayout(deck({ elements: [{
    type: 'box', position: { x: 0, y: 0, w: 4 }, style: { background: '000000', padding: 0.1 },
    animations: [{ type: 'fadeIn' }],
    children: [{ type: 'box', children: [{ type: 'text', text: 'a', animations: [{ type: 'fadeIn' }] }] }],
  }] }));
  const g = model.slides[0].elements[0];
  assert.strictEqual(g.type, 'group');
  assert.deepStrictEqual(g.children.map(c => c.type), ['shape', 'text']);
  assert.strictEqual(g.children[1].animations, undefined);
});

test('components get a position from the flow', async () => {
  const { model } = await applyLayout(deck({
    layout: { padding: 0.5 },
    elements: [{ type: 'progressBar', value: 50 }],
  }));
  const p = model.slides[0].elements[0].position;
  near(p.w, 9, 'stretches'); near(p.h, 0.4, 'default component height');
});

test('components that grow along a row keep a default height', async () => {
  const { model } = await applyLayout(deck({
    layout: { padding: 0.5 },
    elements: [
      { type: 'box', style: { direction: 'row', gap: 0.2 }, children: [
        { type: 'kpiCard', value: '1', style: { grow: 1 } },
        { type: 'kpiCard', value: '2', style: { grow: 1 } },
      ] },
      { type: 'text', text: 'below' },
    ],
  }));
  const [a, b, below] = model.slides[0].elements;
  near(a.position.h, 1.4, 'kpiCard default height'); near(b.position.w, 4.4, 'grow still sizes the width');
  near(below.position.y, 0.5 + 1.4, 'next item starts below the row');
});

test('a taller row still stretches a growing component', async () => {
  const { model } = await applyLayout(deck({
    elements: [{ type: 'box', position: { x: 0, y: 0, w: 10, h: 3 }, style: { direction: 'row', height: 3 }, children: [
      { type: 'kpiCard', value: '1', style: { grow: 1 } },
    ] }],
  }));
  near(model.slides[0].elements[0].position.h, 3, 'stretches past the default');
});

test('a bullet hanging indent is measured as part of the text width', async () => {
  const width = async bullet => {
    const { model } = await applyLayout(deck({
      layout: { padding: 0, alignItems: 'start' },
      elements: [{ type: 'text', text: [{ text: 'short line', bullet }], style: { fontSize: 18 } }],
    }));
    return model.slides[0].elements[0].position.w;
  };
  near(await width(true) - await width(false), 0.25, '1 em at 18pt', 0.02);
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log(`ok   ${t.name}`); } catch (e) { failed++; console.log(`FAIL ${t.name}\n     ${e.message}`); }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
