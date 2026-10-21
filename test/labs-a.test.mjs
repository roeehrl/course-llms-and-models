import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assemble, fragments, loadOverlays, applyAuthoringOverlay } from '../scripts/assemble.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, labs, fixtureBytes] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(), read('content/labs-a.json'), readFile(new URL('runtime/code-fixtures-labs-a.json', root))]);
const full = assemble(config, modules, overlays);
const LABS = { 'llm-lab-ch01-state-ledger': 'fnd-e01-02', 'llm-lab-ch02-strided-views': 'fnd-e02-02', 'llm-lab-ch03-gradient-descent': 'fnd-e03-03',
  'llm-lab-ch05-optimizer-resume': 'ttf-e05-03', 'llm-lab-ch06-next-token-loss': 'ttf-e06-02', 'llm-lab-ch08-lora-adapter': 'ttf-e08-04' };

/** Course Core codeFixtureBatchPlan (services/api/src/code-evaluator.ts), restated. */
function batchPlan(cases, limit = 65536) {
  const counts = []; let count = 0, estimated = 0, minimum = 0;
  for (const item of cases) {
    const bytes = Buffer.byteLength(JSON.stringify({ id: item.id, output: item.expected }).replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)) + 1;
    const conservative = bytes * 2 + 64; assert(conservative <= limit); minimum += bytes;
    if (count && estimated + conservative > limit) { counts.push(count); count = 0; estimated = 0; }
    count++; estimated += conservative;
  }
  if (count) counts.push(count); assert(minimum <= limit && counts.length <= 8); return counts;
}

test('six chapter labs are ungated code blocks at the end of their episodes with a pinned fixture registry', () => {
  const episodes = full.server.chapters.flatMap(c => c.episodes), gated = new Set(full.server.gates.flatMap(g => g.assessmentIds));
  for (const [id, episodeId] of Object.entries(LABS)) {
    const item = full.server.assessments.find(a => a.id === id), episode = episodes.find(e => e.id === episodeId);
    assert.equal(item.type, 'code'); assert.equal(item.grading.evaluatorId, 'llm-practical-labs-a');
    assert(!gated.has(id), `${id} joined a gate`);
    assert(episode.blocks.some(b => b.id === `lab-${id}` && b.type === 'assessment' && b.assessmentId === id), `${id} block missing`);
    assert(item.objectiveIds.every(o => episode.objectiveIds.includes(o)));
    assert.match(item.prompt, /^Chapter \d lab: /); assert.match(item.prompt, /does not block your progress/);
  }
  const extension = full.server.extensions.find(e => e.id === 'llm-practical-labs-a');
  assert.equal(extension.integrity, `sha256-${createHash('sha256').update(fixtureBytes).digest('hex')}`);
  assert(fixtureBytes.length <= 1024 * 1024);
  const registry = JSON.parse(fixtureBytes);
  assert.deepEqual(registry.fixtures.map(f => f.id).sort(), labs.assessments.map(a => a.grading.fixtureRef).sort());
  for (const fixture of registry.fixtures) { assert(fixture.cases.length >= 20 && fixture.cases.length <= 100); batchPlan(fixture.cases); }
});

test('the learner bundle carries no lab prompt, starter, fixture reference or expected output', () => {
  const learner = JSON.stringify(full.learner), registry = JSON.parse(fixtureBytes);
  assert(!full.learner.extensions.some(e => e.id === 'llm-practical-labs-a'));
  for (const item of labs.assessments) {
    assert(!learner.includes(item.grading.fixtureRef)); assert(!learner.includes(item.prompt.slice(0, 60))); assert(!learner.includes(item.starterCode.slice(40, 120)));
  }
  assert(!learner.includes(JSON.stringify(registry.fixtures[0].cases[0].expected).slice(0, 80)));
});

test('a lab cannot be bound into a gate or outside its episode objectives', () => {
  const inGate = structuredClone(full.server), item = structuredClone(labs.assessments[0]);
  inGate.assessments = inGate.assessments.filter(a => !a.id.startsWith('llm-lab-'));
  inGate.gates.find(g => g.id === 'fnd-g01-02').assessmentIds.push(item.id); inGate.assessments.push(item);
  assert.throws(() => applyAuthoringOverlay(inGate, { schemaVersion: 1, id: 'x', episodeBlocks: [{ episodeId: 'fnd-e01-02', assessmentId: item.id, position: 'end', prefix: 'lab' }] }), /ungated episode block/);
  const wrong = structuredClone(labs); wrong.episodeBlocks[0].episodeId = 'eng-e14-01';
  assert.throws(() => assemble(config, modules, { ...overlays, authoringOverlays: overlays.authoringOverlays.map(o => o.id === 'labs-a' ? wrong : o) }), /outside its episode objectives/);
});

test('fixtures are reproducible and independently qualified with negative controls', () => {
  const check = spawnSync('python3', ['-B', 'runtime/lab-reference-a.py', '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(check.status, 0, check.stderr);
  const run = spawnSync('python3', ['-B', 'verification/labs-a.py'], { cwd: root, encoding: 'utf8', timeout: 240000 });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.qualified, true); assert.equal(report.labs.length, 6);
  for (const lab of report.labs) { assert(lab.oracleAgrees && lab.referencePasses && lab.starterFails); assert(Object.keys(lab.mutantsFailedCases).length >= 2); }
});
