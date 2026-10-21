import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { assemble, fragments, loadOverlays, applyAuthoringOverlay, VISUAL_OVERLAYS } from '../scripts/assemble.mjs';
import { bindRecoveryRuntime } from '../scripts/bind-recovery-runtime.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, worked, visual, remedial] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(),
  read('content/worked-adaptive-episode.json'), read('content/worked-adaptive-visuals.json'), read('content/remedial-episodes.json')]);
// The worked scene joins the shared overlay list; until then pass it explicitly.
const withVisual = VISUAL_OVERLAYS.includes('worked-adaptive-visuals') ? overlays : { ...overlays, visualOverlays: [...overlays.visualOverlays, visual] };
const full = assemble(config, modules, withVisual), server = full.server;
const episode = id => server.chapters.flatMap(c => c.episodes).find(e => e.id === id);

test('section 16 parts are wired: scene, check, probe, transfer, hypotheses and nothing gated', () => {
  const host = episode('fnd-e04-02'), blocks = host.blocks.map(b => b.id);
  assert(blocks.indexOf('visual-worked-forward-backward-update') === blocks.indexOf('fnd-04-02-text-2') + 1, 'scene follows the backward walkthrough');
  assert.equal(blocks.at(-1), 'worked-wae-check-after-backward');
  const later = episode('fnd-e04-03').blocks.map(b => b.id);
  assert(later.includes('worked-wae-transfer-split-grad') && later.includes('worked-wae-transfer-split-state'));
  const ids = ['wae-backward-mutates', 'wae-grad-overwrite', 'wae-update-sign'];
  assert.deepEqual(server.hypotheses.filter(h => h.id.startsWith('wae-')).map(h => h.id), ids);
  assert(server.hypotheses.filter(h => ids.includes(h.id)).every(h => h.kind === 'misconception' && !h.critical));
  const probe = server.probes.find(p => p.id === 'probe-wae-two-backward');
  assert.deepEqual(probe.distinguishes, ids);
  const gated = new Set(server.gates.flatMap(g => g.assessmentIds));
  for (const item of worked.assessments) assert(!gated.has(item.id), `${item.id} must not join a gate`);
  assert(!server.chapters.flatMap(c => c.episodes).some(e => e.blocks.some(b => b.assessmentId === 'wae-probe-two-backward')), 'the probe is scheduled by Core, not shown in a lesson');
  const check = server.assessments.find(a => a.id === 'wae-check-after-backward');
  assert.equal(check.options.find(o => o.id === 'b').misconceptionId, 'wae-backward-mutates');
  for (const id of ['wae-transfer-split-grad', 'wae-transfer-split-state']) { const a = server.assessments.find(x => x.id === id); assert(a.role === 'transfer' && a.type === 'numeric'); }
});

test('the learner bundle hides hypotheses, keys, probe text and the personal episode', () => {
  const learner = JSON.stringify(full.learner);
  for (const h of worked.hypotheses) assert(!learner.includes(h.statement));
  for (const a of worked.assessments) { assert(!learner.includes(a.prompt.slice(20, 120))); assert(!learner.includes(a.grading.explanation.slice(0, 60))); }
  assert(!learner.includes('misconceptionId') && !learner.includes('correctOptionId'));
  const entry = remedial.entries.find(e => e.id === 'remedial-two-backward');
  assert(!learner.includes(entry.blocks[1].markdown.slice(0, 80)));
  assert(full.learner.visuals.some(v => v.id === 'worked-forward-backward-update'), 'the scene is learner content');
});

test('the personal episode binds as one optional metered insertion after fnd-e04-02', async () => {
  const [descriptors, authored, fresh, codeRecovery] = await Promise.all(['runtime/installed-adaptation-descriptors.json', 'content/adaptation-authoring.json', 'content/fresh-assessments.json', 'content/practical-recovery.json'].map(read));
  const base = assemble(config, modules, { ...withVisual, recoveryOverlay: undefined }).server;
  const { configuration } = bindRecoveryRuntime({ descriptors: descriptors.adapters, authored, fresh, codeRecovery, remedial, baseCourse: base });
  const profile = configuration.profiles.find(p => p.id === 'profile-remedial-two-backward');
  assert(profile && profile.operation === 'insert_episode' && profile.episodeId === 'fnd-e04-02' && profile.classification === 'optional' && profile.additionalEpisodes === 1);
  assert.equal(profile.teachingBank[0].blocks.length, 4);
  assert.deepEqual((await read('runtime/recovery-registry.json')).profiles.find(p => p.id === profile.id), profile, 'committed registry matches a fresh binding');
});

test('the overlay refuses a probe that joins a gate and a link to the correct option', () => {
  const gatedProbe = structuredClone(server); gatedProbe.gates.find(g => g.id === 'fnd-g04-02').assessmentIds.push('wae-probe-two-backward');
  assert.throws(() => applyAuthoringOverlay(gatedProbe, { schemaVersion: 1, id: 'noop' }), /Diagnostic probe/);
  const course = assemble(config, modules, { ...withVisual, authoringOverlays: overlays.authoringOverlays.filter(o => o.id !== 'worked-adaptive-episode') }).server;
  const bad = structuredClone(worked); bad.assessments[0].options[0].misconceptionId = 'wae-backward-mutates';
  assert.throws(() => assemble(config, modules, { ...withVisual, authoringOverlays: overlays.authoringOverlays.map(o => o.id === 'worked-adaptive-episode' ? bad : o) }), /validation failed/);
  assert(!course.hypotheses?.some(h => h.id.startsWith('wae-')));
});

test('independent oracle, tape autograd and finite differences agree; wrong implementations fail', () => {
  const result = spawnSync('python3', ['-B', 'verification/worked-adaptive-episode.py'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.implementations, { correct: true, overwrite: false, wrong_sign: false, backward_mutates: false });
  assert.deepEqual(report.section16, { forward: [1, 2], backward: [-4, -2], update: [0.9, 0.2], freshForward: [2, 0.5] });
  assert.deepEqual(report.personalEpisode.afterUpdate, [1.3, 0.4]);
  const visual = spawnSync(process.execPath, ['verification/worked-adaptive-visual.mjs'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(visual.status, 0, visual.stderr);
  const scene = JSON.parse(visual.stdout);
  assert(scene.rejectedWrongSignUpdate && scene.rejectedBackwardWritesParameters && scene.verifiedFrames === 12);
});

test('the section 16 phase selector shows labels in the course locale, never internal phase ids', async () => {
  const { PHASES, PHASE_LABELS, buildScene } = await import('../scripts/create-worked-adaptive-scene.mjs');
  const shipped = full.learner.visuals.find(v => v.id === 'worked-forward-backward-update');
  const text = JSON.stringify(shipped);
  const labels = PHASE_LABELS[config.locale];
  assert(labels, `labels exist for the course locale ${config.locale}`);
  for (const id of PHASES) assert(text.includes(JSON.stringify(labels[id])), `${id} label shipped`);
  assert(!/"(?:ready|forward2|backward2)"/.test(text), 'a raw phase id is in the learner scene');
  for (const locale of Object.keys(PHASE_LABELS)) assert.deepEqual(buildScene({ locale }).state.phase.options, PHASES.map(p => PHASE_LABELS[locale][p]));
  assert.throws(() => buildScene({ locale: 'fr' }), /No phase labels/);
});
