import { mkdir, writeFile } from 'node:fs/promises';
const op = (op, ...args) => ({ op, args }), s = state => ({ state }), time = { time: true };
const ink = '#19383E', teal = '#087B69', mint = '#E8F6ED', purple = '#7050A4', lilac = '#F2EDFB', gold = '#80601E', sand = '#FCF3DF';
const text = (id, value, x, y, fontSize = 18, fill = ink) => ({ kind: 'text', id, text: value, x, y, fontSize, fill });
const rect = (id, x, y, width, height, fill, cornerRadius = 16) => ({ kind: 'rect', id, x, y, width, height, fill, cornerRadius });
const numeric = (label, initial, min, max, step) => ({ kind: 'number', label, initial, min, max, step });
const round = value => op('div', op('round', op('mul', value, 1000)), 1000);
const progress = (start, duration) => op('clamp', op('div', op('sub', time, start), duration), 0, 1);
const link = (id, from, to, start) => ({ kind: 'link', id, from: { node: from, anchor: 'auto' }, to: { node: to, anchor: 'auto' }, arrow: true, stroke: teal, strokeWidth: 3, progress: progress(start, 700) });
function base(id, title, description, state, nodes, compact, expanded, durationMs, cues, accessible) {
  return { version: 1, id, title, description, state, controls: Object.keys(state), nodes,
    layouts: { compact, expanded, breakpoint: 640 }, timeline: { durationMs, tracks: [], cues },
    accessibility: { text: accessible, reducedMotion: { atMs: durationMs, description: accessible } }, referenceChecks: [] };
}

const product = op('mul', s('w'), s('x')), prediction = op('add', product, s('b'));
const affine = base('ml-affine-forward', 'A parameterized program, made visible',
  'Change the input or parameters. Play the forward trace. Playing moves values through the operations; it does not update the parameters.',
  { x: numeric('Input x', 3, -4, 4, 0.5), w: numeric('Weight w', 2, -3, 3, 0.5), b: numeric('Bias b', 1, -3, 3, 0.5) }, [
    rect('affine-stage', 0, 0, 880, 350, '#F8FAF7', 24),
    { ...text('affine-eyebrow', 'FORWARD · VALUES FLOW, PARAMETERS STAY PUT', 28, 38, 13, teal), weight: 'bold' },
    { kind: 'group', id: 'input-card', x: 34, y: 110, children: [rect('input-bg', 0, 0, 180, 110, mint), text('input-label', 'INPUT', 18, 27, 13, teal), { ...text('input-value', op('concat', 'x = ', s('x')), 18, 72, 28), weight: 'bold' }] },
    { kind: 'group', id: 'multiply-card', x: 286, y: 110, children: [rect('multiply-bg', 0, 0, 215, 110, lilac), text('multiply-label', op('concat', 'MULTIPLY BY w = ', s('w')), 18, 27, 13, purple), { ...text('multiply-value', op('concat', 'w × x = ', round(product)), 18, 72, 24), weight: 'bold' }] },
    { kind: 'group', id: 'output-card', x: 574, y: 110, children: [rect('output-bg', 0, 0, 264, 110, sand), text('output-label', op('concat', 'ADD b = ', s('b')), 18, 27, 13, gold), { ...text('affine-output', op('concat', 'prediction = ', round(prediction)), 18, 72, 24), weight: 'bold' }] },
    link('input-to-product', 'input-bg', 'multiply-bg', 0), link('product-to-output', 'multiply-bg', 'output-bg', 850),
    text('affine-equation', 'prediction = w × x + b', 34, 283, 24),
    text('affine-note', 'The result changes. The parameter buffer changes only if another operation writes it.', 34, 319, 15, '#526A70'),
    { ...text('affine-mobile-heading', 'FORWARD', 18, 28, 15, teal), opacity: 0, weight: 'bold' },
    { ...text('affine-mobile-subtitle', 'Values flow. Parameters stay put.', 18, 49, 14), opacity: 0 },
    { ...text('affine-mobile-note-a', 'Forward produces values.', 20, 590, 16), opacity: 0 },
    { ...text('affine-mobile-note-b', 'Only an update writes parameters.', 20, 615, 15), opacity: 0 },
  ], { width: 350, height: 635, overrides: {
    'affine-stage': { width: 350, height: 635 }, 'affine-eyebrow': { opacity: 0 }, 'affine-mobile-heading': { opacity: 1 }, 'affine-mobile-subtitle': { opacity: 1 },
    'input-card': { x: 40, y: 65 }, 'input-bg': { width: 268 }, 'multiply-card': { x: 40, y: 230 }, 'multiply-bg': { width: 268 },
    'output-card': { x: 40, y: 395 }, 'output-bg': { width: 268 }, 'affine-equation': { x: 20, y: 557, fontSize: 22 },
    'affine-note': { opacity: 0 }, 'affine-mobile-note-a': { opacity: 1 }, 'affine-mobile-note-b': { opacity: 1 },
  } }, { width: 880, height: 350 }, 2200, [{ atMs: 0, text: 'Read the input and the current parameter values.' }, { atMs: 800, text: 'Multiplication creates the intermediate value w × x.' }, { atMs: 1600, text: 'Add the bias to obtain the prediction. No optimizer ran.' }],
  'Compute prediction = w times x plus b. The initial example gives 2 times 3 plus 1 = 7. Forward evaluation computes values; it does not change w or b.');

const residual = op('sub', op('mul', s('w'), 2), 4), loss = op('div', op('mul', residual, residual), 2), gradient = op('mul', residual, 2), nextWeight = op('sub', s('w'), op('mul', s('rate'), gradient));
const plotX = value => op('mul', op('div', op('add', value, 4), 14), 690), plotY = value => op('sub', 200, op('mul', op('div', value, 140), 200));
const nextResidual = op('sub', op('mul', nextWeight, 2), 4), nextLoss = op('div', op('mul', nextResidual, nextResidual), 2);
const animatedWeight = op('lerp', s('w'), nextWeight, progress(500, 2200));
const animatedResidual = op('sub', op('mul', animatedWeight, 2), 4);
const animatedLoss = op('div', op('mul', animatedResidual, animatedResidual), 2);
const gradientScene = base('ml-gradient-update', 'Forward, backward, then update',
  'One training example has x = 2 and target = 4. The loss is half the squared error. Adjust w and the learning rate, then play exactly one proposed update.',
  { w: numeric('Starting weight w', 0, -3, 3, 0.25), rate: numeric('Learning rate', 0.1, 0, 0.6, 0.05) }, [
    rect('gradient-stage', 0, 0, 880, 590, '#F8FAF7', 24),
    { ...text('gradient-title', 'ONE EXAMPLE · x = 2 · target = 4', 32, 40, 15, teal), weight: 'bold' },
    { kind: 'group', id: 'loss-plot', x: 100, y: 82, children: [
      { kind: 'plot', id: 'loss-curve', x: 0, y: 0, width: 690, height: 200, domainX: [-4, 10], domainY: [0, 140], points: Array.from({ length: 57 }, (_, i) => { const x = -4 + i / 4; return { x, y: 0.5 * (2 * x - 4) ** 2 }; }), stroke: '#88AEB0', strokeWidth: 3, fill: 'none' },
      { kind: 'line', id: 'loss-axis', x: 0, y: 200, x2: 690, y2: 0, stroke: '#C3D4D0', strokeWidth: 2 },
      { kind: 'circle', id: 'current-dot', x: plotX(s('w')), y: plotY(loss), radius: 8, fill: purple },
      { kind: 'circle', id: 'next-dot', x: plotX(animatedWeight), y: plotY(animatedLoss), radius: 8, fill: teal },
      text('weight-min', '−4', 0, 231, 14, '#526A70'), text('weight-optimal', 'best w = 2', plotX(2), 231, 14, teal), text('weight-max', '10', 673, 231, 14, '#526A70'),
    ] },
    text('loss-label', 'LOSS', 28, 110, 13, '#526A70'),
    { kind: 'group', id: 'forward-tile', x: 32, y: 367, children: [rect('forward-tile-bg', 0, 0, 245, 124, mint), text('forward-step', '01 · FORWARD', 18, 28, 13, teal), text('loss-value', op('concat', 'loss = ', round(loss)), 18, 67, 23), text('residual-value', op('concat', 'error = ', round(residual)), 18, 98, 16, '#526A70')] },
    { kind: 'group', id: 'backward-tile', x: 317, y: 367, children: [rect('backward-tile-bg', 0, 0, 245, 124, lilac), text('backward-step', '02 · BACKWARD', 18, 28, 13, purple), text('gradient-value', op('concat', 'gradient = ', round(gradient)), 18, 67, 23), text('backward-note', 'w has not changed yet.', 18, 98, 16, '#526A70')] },
    { kind: 'group', id: 'update-tile', x: 602, y: 367, children: [rect('update-tile-bg', 0, 0, 245, 124, sand), text('update-step', '03 · UPDATE', 18, 28, 13, gold), text('next-weight', op('concat', 'new w = ', round(nextWeight)), 18, 67, 23), text('next-loss', op('concat', 'new loss = ', round(nextLoss)), 18, 98, 16, '#526A70')] },
    text('update-equation', 'new w = old w − learning rate × gradient', 32, 543, 21),
    text('update-caption', 'The moving point shows the proposed update; playing does not commit repeated training steps.', 32, 576, 14, '#526A70'),
    { ...text('mobile-weight-min', 'w = −4', 38, 191, 14), opacity: 0 },
    { ...text('mobile-weight-opt', 'best w = 2', 138, 191, 14, teal), opacity: 0 },
    { ...text('mobile-weight-max', '10', 294, 191, 14), opacity: 0 },
    { ...text('mobile-update-note-a', 'Playing shows one proposed step.', 20, 730, 15), opacity: 0 },
    { ...text('mobile-update-note-b', 'It does not keep training the model.', 20, 753, 14.5), opacity: 0 },
  ], { width: 350, height: 770, overrides: {
    'gradient-stage': { width: 350, height: 770 }, 'gradient-title': { x: 16, fontSize: 13 }, 'loss-plot': { x: 38, y: 85, scale: 0.4 }, 'loss-label': { x: 12, y: 73, fontSize: 10 },
    'weight-min': { opacity: 0 }, 'weight-optimal': { opacity: 0 }, 'weight-max': { opacity: 0 }, 'mobile-weight-min': { opacity: 1 }, 'mobile-weight-opt': { opacity: 1 }, 'mobile-weight-max': { opacity: 1 }, 'current-dot': { radius: 18 }, 'next-dot': { radius: 18 },
    'forward-tile': { x: 30, y: 222 }, 'forward-tile-bg': { width: 290 }, 'backward-tile': { x: 30, y: 370 }, 'backward-tile-bg': { width: 290 }, 'update-tile': { x: 30, y: 518 }, 'update-tile-bg': { width: 290 },
    'update-equation': { x: 20, y: 697, fontSize: 13 }, 'update-caption': { opacity: 0 }, 'mobile-update-note-a': { opacity: 1 }, 'mobile-update-note-b': { opacity: 1 },
  } }, { width: 880, height: 590 }, 3000, [{ atMs: 0, text: 'Forward computes the prediction and loss using the starting weight.' }, { atMs: 500, text: 'Backward computes the gradient. It has not changed w.' }, { atMs: 2700, text: 'The proposed optimizer update subtracts learning rate times gradient.' }],
  'For x=2 and target=4, loss=(2w−4)²/2 and gradient=(2w−4)×2. The optimizer proposes new w=w−rate×gradient. At w=0, rate=0.1, loss=8, gradient=−8 and new w=0.8. A large learning rate can overshoot and increase loss.');

const transposed = s('transpose'), rows = op('if', transposed, 4, 3), columns = op('if', transposed, 3, 4);
const valid = op('and', op('lt', s('row'), rows), op('lt', s('column'), columns));
const offset = op('add', op('mul', s('row'), op('if', transposed, 1, 4)), op('mul', s('column'), op('if', transposed, 4, 1)));
const tensorNodes = Array.from({ length: 12 }, (_, i) => {
  const row = op('if', transposed, i % 4, Math.floor(i / 4)), column = op('if', transposed, Math.floor(i / 4), i % 4), selected = op('and', valid, op('eq', offset, i));
  return { kind: 'group', id: `cell-${i}`, x: op('mul', column, 69), y: op('mul', row, 69), children: [rect(`cell-bg-${i}`, 0, 0, 58, 58, '#E6EFEC', 12),
    { ...rect(`cell-selected-${i}`, 0, 0, 58, 58, '#B3DDCA', 12), opacity: op('if', selected, 1, 0) },
    { ...text(`cell-value-${i}`, String(i), 29, 38, 24), align: 'middle', weight: 'bold' }] };
});
const tensor = base('ml-tensor-strides', 'A view changes the map, not the buffer',
  'Select a logical row and column. Toggle a transpose view and watch the same twelve values move. An invalid logical coordinate is reported instead of indexing memory.',
  { row: numeric('Logical row', 1, 0, 3, 1), column: numeric('Logical column', 2, 0, 3, 1), transpose: { kind: 'boolean', label: 'Transpose view', initial: false } }, [
    rect('tensor-stage', 0, 0, 880, 500, '#F8FAF7', 24),
    { ...text('tensor-title', 'LOGICAL COORDINATES → PHYSICAL OFFSET', 28, 39, 14, teal), weight: 'bold' },
    { kind: 'group', id: 'tensor-grid', x: 52, y: 95, children: tensorNodes },
    { kind: 'group', id: 'tensor-readout', x: 407, y: 95, children: [rect('tensor-readout-bg', 0, 0, 427, 295, lilac), text('tensor-shape', op('concat', 'shape = (', rows, ', ', columns, ')'), 22, 45, 26),
      text('tensor-strides', op('if', transposed, 'strides = (1, 4)', 'strides = (4, 1)'), 22, 94, 23),
      text('tensor-offset', op('if', valid, op('concat', 'element offset = ', offset), 'coordinate out of bounds'), 22, 148, 22),
      text('tensor-bytes', op('if', valid, op('concat', 'FP32 byte offset = ', op('mul', offset, 4)), 'No memory access is valid.'), 22, 192, 20),
      text('tensor-storage', 'Same backing allocation', 22, 247, 17, purple),
      text('tensor-storage-value', '12 × 4 = 48 bytes', 22, 273, 17, purple),
    ] },
    text('tensor-note', 'A transpose view changes shape and strides. It does not allocate twelve new values.', 28, 459, 18),
    { ...text('tensor-mobile-note-a', 'The view changes shape and strides.', 18, 749, 15), opacity: 0 },
    { ...text('tensor-mobile-note-b', 'The buffer is not copied.', 18, 775, 16), opacity: 0 },
  ], { width: 350, height: 800, overrides: { 'tensor-stage': { width: 350, height: 800 }, 'tensor-title': { x: 16, fontSize: 10 }, 'tensor-grid': { x: 41, y: 83 },
    'tensor-readout': { x: 20, y: 411 }, 'tensor-readout-bg': { width: 310, height: 300 }, 'tensor-shape': { fontSize: 24 }, 'tensor-strides': { fontSize: 22 }, 'tensor-offset': { fontSize: 17 }, 'tensor-bytes': { fontSize: 17 }, 'tensor-note': { opacity: 0 }, 'tensor-mobile-note-a': { opacity: 1 }, 'tensor-mobile-note-b': { opacity: 1 } } },
  { width: 880, height: 500 }, 1000, [{ atMs: 0, text: 'The values are one flat allocation. Shape and strides define a view.' }, { atMs: 1000, text: 'Changing the view does not copy the underlying values.' }],
  'A 3×4 row-major FP32 tensor has strides (4,1). Logical (row,column) maps to element offset row×4+column and byte offset four times that. The transposed 4×3 view uses strides (1,4), with the same 48-byte allocation. Out-of-range coordinates are invalid.');

const output = new URL('../visuals/', import.meta.url); await mkdir(output, { recursive: true });
await writeFile(new URL('scenes.json', output), JSON.stringify({ schemaVersion: 1, scenes: [affine, gradientScene, tensor], bindings: [
  { visualId: affine.id, episodeId: 'fnd-e01-01', afterBlockId: 'fnd-01-01-text-1' },
  { visualId: gradientScene.id, episodeId: 'fnd-e03-03', afterBlockId: 'fnd-03-03-text-1' },
  { visualId: tensor.id, episodeId: 'fnd-e02-02', afterBlockId: 'fnd-02-02-text-1' },
] }, null, 2) + '\n');
console.log('Authored three declarative visual scenes; runtime/numerical qualification is separate.');
