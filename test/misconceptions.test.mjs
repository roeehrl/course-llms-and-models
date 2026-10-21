import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { assemble, fragments, loadOverlays } from '../scripts/assemble.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, misconceptions] = await Promise.all([
  read('content/course-config.json'), Promise.all(fragments.map(name => read(`content/${name}.json`))), loadOverlays(), read('content/misconceptions.json'),
]);
const full = assemble(config, modules, overlays);
const issue = code => error => (error.issues ?? []).some(i => i.code === code);
const withOverlay = mutate => {
  const changed = structuredClone(misconceptions); mutate(changed);
  return () => assemble(config, modules, { ...overlays, authoringOverlays: overlays.authoringOverlays.map(o => (o.id === 'misconceptions' ? changed : o)) });
};

test('every episode objective carries two declared misconceptions with a distinguishing probe, grouped per chapter', () => {
  const declared = full.server.hypotheses.filter(h => h.id.startsWith('mis-'));
  assert.equal(declared.length, 112);
  const ownProbeIds = new Set(misconceptions.probes.map(p => p.id)), probes = full.server.probes.filter(p => ownProbeIds.has(p.id));
  assert.equal(probes.length, 56);
  for (const episode of full.server.chapters.flatMap(c => c.episodes)) {
    const [objective] = episode.objectiveIds;
    const own = declared.filter(h => h.objectiveIds.includes(objective));
    assert.equal(own.length, 2, episode.id);
    assert(own.every(h => h.kind === 'misconception' && h.critical === undefined), episode.id);
    const probe = probes.find(p => p.objectiveId === objective);
    assert.deepEqual([...probe.distinguishes].sort(), own.map(h => h.id).sort());
  }
  assert.equal(misconceptions.chapterProbes.length, 14);
  assert(misconceptions.chapterProbes.every(c => c.probeIds.length === 4 && c.probeIds.every(id => probes.some(p => p.id === id))));
  // Authoring-only fields never reach the compiled course.
  for (const field of ['annotations', 'chapterProbes', 'distractorLinks', 'review']) assert(!(field in full.server), field);
});

test('probe items never join a gate, and gate distractors carry their misconception links server-side only', () => {
  const gated = new Set(full.server.gates.flatMap(g => g.assessmentIds));
  for (const probe of full.server.probes) assert(!gated.has(probe.assessmentId), probe.assessmentId);
  for (const link of misconceptions.distractorLinks) {
    const item = full.server.assessments.find(a => a.id === link.assessmentId);
    assert(gated.has(item.id));
    assert.equal(item.options.find(o => o.id === link.optionId).misconceptionId, link.hypothesisId);
    assert.notEqual(item.grading.correctOptionId, link.optionId);
  }
  const learner = JSON.stringify(full.learner);
  for (const h of misconceptions.hypotheses) assert(!learner.includes(h.statement), h.id);
  for (const item of misconceptions.assessments) assert(!learner.includes(item.prompt), item.id);
  // The learner projection lists item ids, objectives and types only: no options, links or prompts.
  assert(!learner.includes('misconceptionId') && !learner.includes('diagnostic_probe'));
});

test('invalid misconception overlays are rejected', () => {
  // A link on the correct option would mark right answers as misconceptions.
  assert.throws(withOverlay(m => {
    const item = modules.flatMap(x => x.assessments).find(a => a.id === m.distractorLinks[0].assessmentId);
    m.distractorLinks[0].optionId = item.grading.correctOptionId;
  }), /Invalid distractor link/);
  // A probe must distinguish at least two competing hypotheses.
  assert.throws(withOverlay(m => { m.probes[0].distinguishes = m.probes[0].distinguishes.slice(0, 1); m.probes[0].signals = m.probes[0].signals.slice(0, 1); }), issue('SCHEMA'));
  // A declared hypothesis without any probe is unprobed.
  assert.throws(withOverlay(m => { m.hypotheses.push({ id: 'mis-extra', kind: 'misconception', statement: 'An unprobed belief about tensors.', objectiveIds: ['fnd-o02-01'] }); }), issue('UNPROBED_HYPOTHESIS'));
  // A link must name a declared hypothesis.
  assert.throws(withOverlay(m => { m.distractorLinks.push({ assessmentId: 'fnd-a01-01-transfer', optionId: 'd', hypothesisId: 'mis-unknown' }); }), /undeclared hypothesis/);
  // The correct option of a probe item cannot signal a misconception.
  assert.throws(withOverlay(m => { const item = m.assessments[0]; item.options.find(o => o.id === item.grading.correctOptionId).misconceptionId = m.hypotheses[0].id; }), issue('INVALID_ANSWER_KEY'));
});

test('the independent CPU verifier recomputes the probe arithmetic and structure', () => {
  const result = spawnSync('python3', ['-B', 'verification/misconceptions.py'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.hypotheses, 112); assert.equal(report.probeItems, 56); assert.deepEqual(report.failures, []);
  assert(report.recomputedFacts >= 90);
});
