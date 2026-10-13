import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Normal consumption uses the released package. An explicit local artifact URL is
// allowed only during development and is labeled as such in the result.
const moduleName = process.env.COURSE_VISUALS_ARTIFACT ?? '@course-core/visuals/headless';
const { VisualRuntime, flattenNodes, fromVisualExperience } = await import(moduleName);
const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('visuals/scenes.json', root), 'utf8'));
const delivered = JSON.parse(await readFile(new URL('content/visuals.json', root), 'utf8'));
const scenes = delivered.visuals.map(fromVisualExperience);
assert.deepEqual(scenes, data.scenes, 'The delivery artifact differs from the authored/qualified scenes.');
const reference = JSON.parse(await readFile(new URL('verification/visual-reference.json', root), 'utf8'));
let checked = 0;
function verify(scene, item, width) {
  const runtime = new VisualRuntime(scene, { viewportWidth: width }); runtime.setState(item.state); runtime.seek(item.time);
  const nodes = new Map(flattenNodes(runtime.getSnapshot().frame.nodes).map(node => [node.id, node]));
  for (const [id, expected] of Object.entries(item.numericText ?? {})) {
    const text = nodes.get(id)?.text; assert.equal(typeof text, 'string');
    const actual = Number(text.split('=').at(-1).trim());
    assert(Number.isFinite(actual) && Math.abs(actual-expected) <= 0.000501, `${id}: displayed value differs from scalar reference`);
  }
  for (const [id, expected] of Object.entries(item.exactText ?? {})) assert.equal(nodes.get(id)?.text, expected);
  for (const [id, coordinates] of Object.entries(item.coordinates ?? {})) for (const [axis, expected] of Object.entries(coordinates)) {
    assert(Math.abs(nodes.get(id)[axis]-expected) < 1e-5, `${id}.${axis}: animated position differs from the actual loss curve`);
  }
}
for (const item of reference.cases) for (const width of [350, 960]) {
  verify(scenes.find(scene => scene.id === item.scene), item, width); checked++;
}
const affine = structuredClone(scenes.find(scene => scene.id === 'ml-affine-forward'));
const output = affine.nodes.find(node => node.id === 'output-card').children.find(node => node.id === 'affine-output');
output.text = 'prediction = 999';
assert.throws(() => verify(affine, reference.cases[0], 960), /displayed value differs/);
const curve = structuredClone(scenes.find(scene => scene.id === 'ml-gradient-update'));
const marker = curve.nodes.find(node => node.id === 'loss-plot').children.find(node => node.id === 'next-dot');
marker.y = 200;
assert.throws(() => verify(curve, reference.cases.find(item => item.scene === curve.id && item.state.w === -3 && item.time === 1600), 960), /actual loss curve/);
const chord = structuredClone(scenes.find(scene => scene.id === 'ml-gradient-update'));
const plot = chord.nodes.find(node => node.id === 'loss-plot');
const moving = plot.children.find(node => node.id === 'next-dot');
const freezeTime = value => Array.isArray(value) ? value.map(freezeTime) : value && typeof value === 'object'
  ? value.time === true ? 3000 : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, freezeTime(child)])) : value;
moving.y = { op: 'lerp', args: [plot.children.find(node => node.id === 'current-dot').y, freezeTime(moving.y),
  { op: 'clamp', args: [{ op: 'div', args: [{ op: 'sub', args: [{ time: true }, 500] }, 2200] }, 0, 1] }] };
assert.throws(() => verify(chord, reference.cases.find(item => item.scene === chord.id && item.state.w === 0 && item.state.rate === 0.1 && item.time === 1600), 960), /actual loss curve/);
console.log(JSON.stringify({ verifiedVisualFrames: checked, rejectedWrongReadout: true, rejectedWrongCurve: true,
  rejectedLinearChordRegression: true,
  runtime: process.env.COURSE_VISUALS_ARTIFACT ? 'explicit-development-artifact' : 'released-package' }));
