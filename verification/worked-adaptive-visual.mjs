// Read-only verification of the design section 16 Forward/Backward/Update scene through
// the released @course-core/visuals headless runtime. The per-phase reference comes from
// verification/worked-adaptive-episode.py (scalar oracle, tape autograd and finite
// differences), not from the scene's own expressions.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VisualRuntime, flattenNodes, fromVisualExperience } from '@course-core/visuals/headless';
import { buildScene, PHASES, BINDING } from '../scripts/create-worked-adaptive-scene.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const oracle = spawnSync('python3', ['-B', fileURLToPath(new URL('verification/worked-adaptive-episode.py', root))], { encoding: 'utf8' });
assert.equal(oracle.status, 0, oracle.stderr);
const reference = JSON.parse(oracle.stdout).scene;

const authored = await read('visuals/worked-adaptive-scene.json'), overlay = await read('content/worked-adaptive-visuals.json');
const scene = fromVisualExperience(overlay.visuals[0]);
assert.deepEqual([scene], authored.scenes, 'Delivered overlay differs from the authored scene');
assert.deepEqual(scene, buildScene(), 'Authored scene differs from its generator');
assert.deepEqual(overlay.bindings, [BINDING]); assert.deepEqual(authored.bindings, [BINDING]);
const registered = (await read('content/visuals.json')).extension, strip = e => ({ ...e, accessibility: { ...e.accessibility, textAlternative: '' } });
assert.deepEqual(strip(overlay.extension), strip(registered), 'Renderer identity differs from the registered renderer');

const lastNumber = t => t?.match(/(-?\d+(?:\.\d+)?)\D*$/)?.[1];
const numbersIn = t => (t.match(/(?<![\w.])-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** Same conservative layout lint as verification/concept-visuals.mjs (0.62·fontSize advance). */
function lint(frame) {
  const problems = [], texts = [];
  const inside = (a, b, pad = 0) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height - pad + 0.5;
  const walk = (nodes, container) => {
    for (const n of nodes) {
      if (!n.visible) continue;
      if (n.kind === 'group') { const bg = n.children?.find(c => c.id === `${n.id}-bg`); walk(n.children ?? [], bg ? bg.bounds : container); }
      else if (n.kind === 'text' && n.opacity > 0) { texts.push(n); if (!inside(n.bounds, container, 6)) problems.push(`${n.id} escapes its card`); }
      else if (['rect', 'circle', 'line'].includes(n.kind) && n.opacity > 0 && !inside(n.bounds, container)) problems.push(`${n.id} escapes its card`);
      else if (n.kind === 'link' && !inside(n.bounds, { x: 0, y: 0, width: frame.width, height: frame.height })) problems.push(`${n.id} leaves the scene`);
    }
  };
  walk(frame.nodes, { x: 0, y: 0, width: frame.width, height: frame.height });
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i].bounds, b = texts[j].bounds;
    if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2) problems.push(`${texts[i].id} overlaps ${texts[j].id}`);
  }
  for (const n of texts) if (n.fontSize < 17) problems.push(`${n.id} font ${n.fontSize}`);
  return problems;
}

function check(candidate, width) {
  const runtime = new VisualRuntime(candidate, { viewportWidth: width });
  for (const phase of PHASES) {
    runtime.setState({ phase }); const frame = runtime.seek(1000), ref = reference[phase];
    const nodes = new Map(flattenNodes(frame.nodes).map(n => [n.id, n]));
    for (const [id, expected] of Object.entries(ref.numeric)) {
      const value = lastNumber(nodes.get(id)?.text);
      assert(value !== undefined && Math.abs(Number(value) - expected) <= 0.000501, `${phase} ${id}: ${nodes.get(id)?.text} vs ${expected}`);
    }
    for (const [id, expected] of Object.entries(ref.exact)) assert.equal(nodes.get(id)?.text, expected, `${phase} ${id}`);
    for (let i = 0; i < 6; i++) assert.equal(nodes.get(`code-hl-${i}`).opacity, ref.highlighted.includes(i) ? 1 : 0, `${phase}: code line ${i} highlight`);
    for (const id of ['g-w-grad', 'g-b-grad', 'g-mul-grad', 'g-add-grad', 'g-loss-grad']) assert.equal(nodes.get(id).opacity, ref.gradientsVisible ? 1 : 0, `${phase}: ${id} visibility`);
    for (const i of [0, 1, 2]) for (const n of numbersIn(nodes.get(`note-${i}`).text))
      assert(ref.noteNumbers.some(k => Math.abs(k - n) < 1e-9), `${phase} note states ${n}, which the oracle does not produce`);
    const problems = lint(frame); assert.deepEqual(problems, [], `${phase} at ${width}: ${problems.join('; ')}`);
    for (const n of nodes.values()) for (const key of ['x', 'y', 'width', 'height', 'opacity']) assert(Number.isFinite(n[key]), `${n.id}.${key}`);
  }
  return true;
}

let frames = 0;
for (const width of [350, 960]) { check(scene, width); frames += PHASES.length; }

// Keyboard path: only the allowed step is operable; Enter on it advances the phase.
const runtime = new VisualRuntime(scene, { viewportWidth: 960 });
const press = id => runtime.manipulateKey(id, 'Enter');
const sequence = [['btn-forward', 'forward'], ['btn-backward', 'backward'], ['btn-update', 'update'], ['btn-forward2', 'forward2'], ['btn-backward2', 'backward2'], ['btn-reset', 'ready']];
assert.equal(press('btn-update'), false, 'Update is not operable before backward');
assert.equal(press('btn-backward'), false, 'Backward is not operable before forward');
for (const [id, expected] of sequence) {
  assert.equal(press(id), true, `${id} operable`);
  const nodes = new Map(flattenNodes(runtime.getSnapshot().frame.nodes).map(n => [n.id, n]));
  const shown = reference[expected];
  for (const [nid, value] of Object.entries(shown.numeric)) assert(Math.abs(Number(lastNumber(nodes.get(nid).text)) - value) <= 0.000501, `keyboard ${expected} ${nid}`);
}
assert.equal(press('btn-forward2'), false, 'the post-update forward is not operable after Reset');

// Altered scenes the reference must reject.
const rejects = candidate => { try { check(candidate, 960); return false; } catch (error) { return error instanceof assert.AssertionError; } };
const wrongSign = rejects(buildScene({ sign: 1 })), mutating = rejects(buildScene({ mutateAtBackward: true }));
assert(wrongSign && mutating, 'An altered scene was accepted');
console.log(JSON.stringify({ scene: scene.id, verifiedFrames: frames, widths: [350, 960], keyboardSteps: sequence.length, rejectedWrongSignUpdate: wrongSign, rejectedBackwardWritesParameters: mutating, runtime: 'released-package' }));
