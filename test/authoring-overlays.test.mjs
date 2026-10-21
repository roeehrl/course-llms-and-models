import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assemble, fragments, loadOverlays, applyAuthoringOverlay, AUTHORING_OVERLAYS } from '../scripts/assemble.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays()]);
const full = assemble(config, modules, overlays), without = assemble(config, modules, { ...overlays, authoringOverlays: [] });
const episodes = course => course.chapters.flatMap(c => c.episodes);

test('every authoring overlay is present and applied in the declared order', () => {
  assert.deepEqual(overlays.authoringOverlays.map(o => o.id), AUTHORING_OVERLAYS);
});

test('authoring overlays add items and contracts only: teaching text, existing keys, thresholds and policy are unchanged', () => {
  assert.deepEqual(full.server.policy, without.server.policy);
  for (const gate of without.server.gates) {
    const now = full.server.gates.find(g => g.id === gate.id);
    assert.equal(now.minimumIndependentFamilies, gate.minimumIndependentFamilies); assert.equal(now.requireAllObjectives, gate.requireAllObjectives);
    assert.deepEqual(now.assessmentIds.filter(id => gate.assessmentIds.includes(id)), gate.assessmentIds);
    // Only reviewed rubric items may join a gate.
    for (const id of now.assessmentIds.filter(id => !gate.assessmentIds.includes(id))) assert.equal(full.server.assessments.find(a => a.id === id).type, 'rubric');
  }
  for (const item of without.server.assessments) {
    const now = full.server.assessments.find(a => a.id === item.id);
    // Existing items gain at most misconception links on wrong options.
    const strip = a => a.type === 'choice' ? { ...a, options: a.options.map(({ misconceptionId: _m, ...o }) => o) } : a;
    assert.deepEqual(strip(now), item);
    if (now.type === 'choice') assert(!now.options.find(o => o.id === now.grading.correctOptionId).misconceptionId);
  }
  for (const episode of episodes(without.server)) {
    const now = episodes(full.server).find(e => e.id === episode.id);
    assert.deepEqual(now.blocks.filter(b => b.type === 'text'), episode.blocks.filter(b => b.type === 'text'));
  }
  const learner = JSON.stringify(full.learner);
  for (const field of ['hypotheses', 'probes', 'researchTasks', 'research']) assert(!(field in full.learner), field);
  assert(!learner.includes('misconceptionId') && !learner.includes('correctOptionId') && !learner.includes('fixtureRef'));
});

test('the final portfolio is a reviewed graded practical that joins the final gate without changing its threshold', async () => {
  const portfolio = await read('content/portfolio.json'), item = full.server.assessments.find(a => a.id === 'portfolio-final');
  assert.equal(item.type, 'rubric'); assert.equal(item.grading.evaluatorId, 'course-core-reviewed-rubric');
  assert(item.grading.rubric.filter(c => c.required).length >= 8);
  const gate = full.server.gates.find(g => g.id === 'eng-g14-04'), old = without.server.gates.find(g => g.id === 'eng-g14-04');
  assert.equal(gate.assessmentIds[0], 'portfolio-final'); assert.equal(gate.minimumIndependentFamilies, old.minimumIndependentFamilies);
  const final = episodes(full.server).find(e => e.id === 'eng-e14-04');
  assert(final.blocks.some(b => b.type === 'assessment' && b.assessmentId === 'portfolio-final'));
  assert.deepEqual(full.server.extensions.find(e => e.id === 'course-core-reviewed-rubric'), portfolio.extensions[0]);
  assert(!JSON.stringify(full.learner).includes(item.grading.rubric[0].description));
});

test('malformed authoring overlays are refused', () => {
  const base = () => structuredClone(without.server);
  const choice = without.server.assessments.find(a => a.type === 'choice'), wrong = choice.options.find(o => o.id !== choice.grading.correctOptionId);
  const hypotheses = [{ id: 'h-x', kind: 'misconception', statement: 'A statement long enough.', objectiveIds: choice.objectiveIds }];
  const cases = [
    [{ schemaVersion: 1, id: 'x', unexpected: [] }, /Unknown authoring overlay field/],
    [{ schemaVersion: 2, id: 'x' }, /Invalid authoring overlay/],
    [{ schemaVersion: 1, id: 'x', assessments: [structuredClone(choice)] }, /redefines assessment/],
    [{ schemaVersion: 1, id: 'x', hypotheses, distractorLinks: [{ assessmentId: choice.id, optionId: choice.grading.correctOptionId, hypothesisId: 'h-x' }] }, /Invalid distractor link/],
    [{ schemaVersion: 1, id: 'x', distractorLinks: [{ assessmentId: choice.id, optionId: wrong.id, hypothesisId: 'undeclared' }] }, /undeclared hypothesis/],
    [{ schemaVersion: 1, id: 'x', episodeBlocks: [{ episodeId: episodes(without.server)[0].id, assessmentId: choice.id, position: 'end' }] }, /ungated episode block/],
    [{ schemaVersion: 1, id: 'x', gateBindings: [{ episodeId: episodes(without.server)[0].id, assessmentId: choice.id }] }, /Invalid gate binding/],
  ];
  for (const [overlay, error] of cases) assert.throws(() => applyAuthoringOverlay(base(), overlay), error);
  // A diagnostic probe can never become gate evidence.
  const course = base(), probe = { ...structuredClone(choice), id: 'probe-x', familyId: 'probe-x', role: 'diagnostic_probe' };
  course.gates[0].assessmentIds.push('probe-x');
  assert.throws(() => applyAuthoringOverlay(course, { schemaVersion: 1, id: 'x', assessments: [probe] }), /joined a gate/);
});
