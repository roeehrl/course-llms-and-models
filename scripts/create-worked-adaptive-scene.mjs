// Authors the design section 16 scene: separate Forward, Backward, Update and Reset
// controls that change the numbers, the highlighted code line and the computation graph
// together. Writes visuals/worked-adaptive-scene.json and content/worked-adaptive-visuals.json.
// Numbers are computed by scene expressions from the example's inputs; the independent
// reference is verification/worked-adaptive-episode.py.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { toVisualExperience, fromVisualExperience, VisualRuntime } from '@course-core/visuals/headless';

const root = new URL('../', import.meta.url);
export const PHASES = ['ready', 'forward', 'backward', 'update', 'forward2', 'backward2'];
export const SCENE_ID = 'worked-forward-backward-update';
export const BINDING = { visualId: SCENE_ID, episodeId: 'fnd-e04-02', afterBlockId: 'fnd-04-02-text-2' };
const op = (name, ...args) => ({ op: name, args }), s = state => ({ state });
const r3 = v => op('div', op('round', op('mul', v, 1000)), 1000);
const ink = '#19383E', teal = '#087B69', mint = '#E8F6ED', purple = '#7050A4', lilac = '#F2EDFB', gold = '#80601E', sand = '#FCF3DF', grey = '#E3E7E6', muted = '#5C6F73', glow = '#FFE3A3';
const is = phase => op('eq', s('phase'), phase), any = (...phases) => phases.map(is).reduce((a, b) => op('or', a, b));
const pick = (pairs, otherwise) => pairs.reduceRight((rest, [phase, value]) => op('if', is(phase), value, rest), otherwise);
const text = (id, value, x, y, fontSize = 17, fill = ink, extra = {}) => ({ kind: 'text', id, text: value, x, y, fontSize, fill, ...extra });
const rect = (id, x, y, width, height, fill, cornerRadius = 14) => ({ kind: 'rect', id, x, y, width, height, fill, cornerRadius });
const card = (id, x, y, width, height, fill, children) => ({ kind: 'group', id, x, y, children: [rect(`${id}-bg`, 0, 0, width, height, fill), ...children] });

/** Builds the scene. Options exist only so the verifier can prove it rejects a wrong-sign
 * update or a backward that writes parameters; the delivered scene uses the defaults. */
export function buildScene({ sign = -1, mutateAtBackward = false } = {}) {
  const x = 2, y = 3, w0 = 0.5, b0 = 0, lr = 0.1;
  // Plain arithmetic in the generator keeps scene expressions shallow (the renderer caps
  // expression depth); the verifier compares against an independent Python oracle.
  const p0 = w0 * x + b0, res0 = p0 - y, gw0 = res0 * x, gb0 = res0;
  const w1 = w0 + sign * lr * gw0, b1 = b0 + sign * lr * gb0;
  const p1 = w1 * x + b1, res1 = p1 - y, gw1 = res1 * x, gb1 = res1;
  const L = res => res * res / 2;
  const changed = mutateAtBackward ? any('backward', 'update', 'forward2', 'backward2') : any('update', 'forward2', 'backward2');
  const w = op('if', changed, w1, w0), b = op('if', changed, b1, b0);
  const firstForward = any('forward', 'backward', 'update');
  const lastP = op('if', firstForward, p0, p1), lastL = op('if', firstForward, L(res0), L(res1)), lastWx = op('if', firstForward, op('mul', w0, x), op('mul', w1, x));
  const shown = (label, value) => op('if', is('ready'), `${label} = none`, op('concat', `${label} = `, r3(value)));
  const graphShown = (label, value) => op('if', is('ready'), `${label} = ?`, op('concat', `${label} = `, r3(value)));
  const grad = (label, first, second) => pick([['backward', op('concat', `${label} = `, r3(first))], ['backward2', op('concat', `${label} = `, r3(second))]], `${label} = none`);
  const gradVisible = op('if', any('backward', 'backward2'), 1, 0);
  const gradText = (id, first, second) => text(id, pick([['backward', op('concat', 'grad = ', r3(first))]], op('concat', 'grad = ', r3(second))), 12, 58, 17, purple, { opacity: gradVisible });

  // Buttons: an enabled variant per target phase (shown only when that step is allowed)
  // and a greyed placeholder otherwise. Enter/Space activates, like a click.
  const button = (id, label, target, when, fill, color) => ({ kind: 'group', id, label: `${label} step`, x: 0, y: 0, visible: when, manipulate: { activate: { state: 'phase', value: target } },
    children: [{ ...rect(`${id}-bg`, 0, 0, 194, 52, fill, 12), visible: when }, text(`${id}-label`, label, 97, 34, 19, color, { align: 'middle', weight: 'bold', visible: when })] });
  const off = (id, label, when) => ({ kind: 'group', id, x: 0, y: 0, visible: when,
    children: [{ ...rect(`${id}-bg`, 0, 0, 194, 52, grey, 12), visible: when }, text(`${id}-label`, label, 97, 34, 19, muted, { align: 'middle', visible: when })] });
  const not = e => op('not', e);
  const slots = {
    forward: [button('btn-forward', 'Forward', 'forward', is('ready'), mint, teal), button('btn-forward2', 'Forward', 'forward2', is('update'), mint, teal), off('btn-forward-off', 'Forward', not(any('ready', 'update')))],
    backward: [button('btn-backward', 'Backward', 'backward', is('forward'), lilac, purple), button('btn-backward2', 'Backward', 'backward2', is('forward2'), lilac, purple), off('btn-backward-off', 'Backward', not(any('forward', 'forward2')))],
    update: [button('btn-update', 'Update', 'update', is('backward'), sand, gold), off('btn-update-off', 'Update', not(is('backward')))],
    reset: [button('btn-reset', 'Reset', 'ready', true, grey, ink)],
  };
  const controls = Object.entries(slots).map(([slot, nodes]) => ({ kind: 'group', id: `slot-${slot}`, x: 0, y: 0, children: nodes }));

  const CODE = ['p = w*x + b', 'L = (p - y)**2 / 2', 'L.backward()', 'w -= lr * w.grad', 'b -= lr * b.grad', 'w.grad = b.grad = None'];
  const LINES = { forward: [0, 1], forward2: [0, 1], backward: [2], backward2: [2], update: [3, 4, 5] };
  const lit = i => op('if', Object.entries(LINES).filter(([, lines]) => lines.includes(i)).map(([phase]) => is(phase)).reduce((a, c) => op('or', a, c)), 1, 0);
  const code = card('code-card', 28, 132, 400, 232, sand, [
    text('code-title', 'CODE · x=2, y=3, lr=0.1', 18, 30, 17, gold, { weight: 'bold' }),
    ...CODE.flatMap((line, i) => [{ ...rect(`code-hl-${i}`, 8, 44 + i * 30, 384, 28, glow, 6), opacity: lit(i) }, text(`code-line-${i}`, line, 18, 64 + i * 30, 17, ink)]),
  ]);
  const memory = card('buf-card', 452, 132, 400, 232, lilac, [
    text('buf-params-label', 'PARAMETER BUFFERS', 18, 30, 17, purple, { weight: 'bold' }),
    text('buf-w', op('concat', 'w = ', r3(w)), 18, 60, 20), text('buf-b', op('concat', 'b = ', r3(b)), 200, 60, 20),
    text('buf-grads-label', 'GRADIENT BUFFERS', 18, 100, 17, purple, { weight: 'bold' }),
    text('buf-gw', grad('w.grad', gw0, gw1), 18, 130, 18), text('buf-gb', grad('b.grad', gb0, gb1), 200, 130, 18),
    text('buf-saved-label', 'LAST FORWARD', 18, 170, 17, purple, { weight: 'bold' }),
    text('buf-pred', shown('prediction', lastP), 18, 200, 18), text('buf-loss', shown('loss', lastL), 230, 200, 18),
  ]);
  const node = (id, x0, y0, value, gradNode) => ({ kind: 'group', id, x: x0, y: y0, children: [rect(`${id}-bg`, 0, 0, 170, 70, '#FFFFFF', 12), text(`${id}-val`, value, 12, 30, 17, ink, { weight: 'bold' }), ...(gradNode ? [gradNode] : [])] });
  const link = (id, from, to) => ({ kind: 'link', id, from: { node: `${from}-bg`, anchor: 'auto' }, to: { node: `${to}-bg`, anchor: 'auto' }, arrow: true, stroke: teal, strokeWidth: 3, fill: 'none' });
  const graph = { kind: 'group', id: 'graph-card', x: 28, y: 384, children: [rect('graph-card-bg', 0, 0, 824, 230, mint),
    text('graph-title', 'COMPUTATION GRAPH', 18, 30, 17, teal, { weight: 'bold' }),
    node('g-w', 20, 46, op('concat', 'w = ', r3(w)), gradText('g-w-grad', gw0, gw1)),
    node('g-x', 20, 146, 'x = 2'),
    node('g-mul', 220, 96, graphShown('w*x', lastWx), gradText('g-mul-grad', res0, res1)),
    node('g-add', 420, 46, graphShown('p', lastP), gradText('g-add-grad', res0, res1)),
    node('g-b', 420, 146, op('concat', 'b = ', r3(b)), gradText('g-b-grad', gb0, gb1)),
    node('g-loss', 620, 96, graphShown('L', lastL), text('g-loss-grad', 'grad = 1', 12, 58, 17, purple, { opacity: gradVisible })),
    link('e-w-mul', 'g-w', 'g-mul'), link('e-x-mul', 'g-x', 'g-mul'), link('e-mul-add', 'g-mul', 'g-add'), link('e-b-add', 'g-b', 'g-add'), link('e-add-loss', 'g-add', 'g-loss'),
  ] };
  const NOTES = {
    ready: ['Press Forward to evaluate', 'p = w*x + b at w = 0.5.', 'No gradient exists yet.'],
    forward: ['Forward: p = 1, loss = 2.', 'It read w and b and saved', 'values; it changed neither.'],
    backward: ['Backward wrote w.grad = -4', 'and b.grad = -2. w is still', '0.5 and b is still 0.'],
    update: ['Update: w = 0.5 - 0.1*(-4)', '= 0.9, b = 0.2. The update', 'then cleared both grads.'],
    forward2: ['Fresh forward at w = 0.9:', 'p = 2 and loss = 0.5.', 'The loss fell from 2.'],
    backward2: ['New gradients at w = 0.9:', 'w.grad = -2, b.grad = -1.', 'Press Reset to replay.'],
  };
  const note = card('note-card', 28, 630, 824, 96, '#FFFFFF', [0, 1, 2].map(i => text(`note-${i}`, pick(PHASES.slice(1).map(p => [p, NOTES[p][i]]), NOTES.ready[i]), 18, 30 + i * 26, 17, ink)));

  const nodes = [rect('wae-stage', 0, 0, 880, 740, '#F8FAF7', 24),
    text('wae-title', 'FORWARD · BACKWARD · UPDATE · one example', 28, 40, 18, teal, { weight: 'bold' }),
    text('wae-title-compact', 'FORWARD · BACKWARD · UPDATE', 16, 34, 17, teal, { weight: 'bold', opacity: 0 }),
    ...controls, code, memory, graph, note];

  const SLOT = { forward: [28, 60], backward: [238, 60], update: [448, 60], reset: [658, 60] }, COMPACT_SLOT = { forward: [16, 52], backward: [182, 52], update: [16, 112], reset: [182, 112] };
  const expandedOverrides = {}, compact = { 'wae-stage': { width: 350, height: 1160 }, 'wae-title': { opacity: 0 }, 'wae-title-compact': { opacity: 1 } };
  for (const [slot, members] of Object.entries(slots)) {
    expandedOverrides[`slot-${slot}`] = { x: SLOT[slot][0], y: SLOT[slot][1] };
    compact[`slot-${slot}`] = { x: COMPACT_SLOT[slot][0], y: COMPACT_SLOT[slot][1] };
    for (const m of members) { compact[`${m.id}-bg`] = { width: 152, height: 48 }; compact[`${m.id}-label`] = { x: 76, y: 32 }; }
  }
  Object.assign(compact, {
    'code-card': { x: 16, y: 176 }, 'code-card-bg': { width: 318 }, ...Object.fromEntries(CODE.map((_, i) => [`code-hl-${i}`, { width: 302 }])),
    'buf-card': { x: 16, y: 424 }, 'buf-card-bg': { width: 318, height: 300 }, 'buf-b': { x: 180 }, 'buf-gb': { x: 18, y: 160 }, 'buf-saved-label': { y: 200 }, 'buf-pred': { y: 230 }, 'buf-loss': { x: 18, y: 260 },
    'graph-card': { x: 16, y: 740 }, 'graph-card-bg': { width: 318, height: 310 },
    'g-w': { x: 12, y: 46 }, 'g-x': { x: 166, y: 46 }, 'g-mul': { x: 12, y: 136 }, 'g-b': { x: 166, y: 136 }, 'g-add': { x: 12, y: 226 }, 'g-loss': { x: 166, y: 226 },
    ...Object.fromEntries(['g-w', 'g-x', 'g-mul', 'g-b', 'g-add', 'g-loss'].map(id => [`${id}-bg`, { width: 140 }])),
    'note-card': { x: 16, y: 1056 }, 'note-card-bg': { width: 318 },
  });
  const accessible = 'One training example with x = 2, target y = 3, starting parameters w = 0.5 and b = 0, learning rate 0.1. Program: p = w*x + b, L = (p - y)^2/2, then L.backward(), then the update w -= lr*w.grad and b -= lr*b.grad, then the gradients are cleared. '
    + 'Forward computes p = 1 and loss 2 and changes no parameter. Backward writes the gradient buffers w.grad = -4 and b.grad = -2; w is still 0.5 and b is still 0. '
    + 'Update subtracts learning rate times gradient: w = 0.5 - 0.1*(-4) = 0.9 and b = 0 - 0.1*(-2) = 0.2, then clears the gradients. A fresh forward gives p = 2 and loss 0.5. A second backward at the new parameters gives w.grad = -2 and b.grad = -1. '
    + 'The Forward, Backward, Update and Reset buttons, or the phase selector, move one step at a time; the highlighted code line, the memory readouts and the graph show the same step.';
  const scene = { version: 1, id: SCENE_ID, title: 'Forward, backward, update: who writes which buffer',
    description: 'Press Forward, Backward and Update one at a time. Watch which buffer each step writes: backward fills the gradient buffers, and only the update changes w and b.',
    state: { phase: { kind: 'enum', label: 'Training step', initial: 'ready', options: PHASES } }, controls: ['phase'], nodes,
    layouts: { compact: { width: 350, height: 1160, overrides: compact }, expanded: { width: 880, height: 740, overrides: expandedOverrides }, breakpoint: 640 },
    timeline: { durationMs: 1000, tracks: [], cues: [{ atMs: 0, text: 'Each button runs exactly one step of the training loop.' }, { atMs: 500, text: 'Backward writes gradients; only Update writes parameters.' }] },
    accessibility: { text: accessible, reducedMotion: { atMs: 1000, description: accessible } }, referenceChecks: [] };
  return scene;
}

async function main() {
  const scene = buildScene();
  new VisualRuntime(scene); // schema and limits
  const registered = JSON.parse(await readFile(new URL('content/visuals.json', root), 'utf8')).extension;
  const extension = { ...registered, accessibility: { ...registered.accessibility, textAlternative: 'The worked Forward/Backward/Update scene states every number in text and offers a keyboard phase selector.' } };
  const visuals = [toVisualExperience(scene)];
  assert.deepEqual(visuals.map(fromVisualExperience), [scene]);
  await writeFile(new URL('visuals/worked-adaptive-scene.json', root), JSON.stringify({ schemaVersion: 1, scenes: [scene], bindings: [BINDING] }, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL('content/worked-adaptive-visuals.json', root), JSON.stringify({ extension, visuals, bindings: [BINDING] }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ scene: SCENE_ID, bytes: JSON.stringify(scene).length, binding: BINDING }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
