import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assemble, fragments, loadOverlays } from '../scripts/assemble.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, labs] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(), read('content/labs-b.json')]);
const full = assemble(config, modules, overlays);
const LABS = { 'llm-lab-ch09-tiling': 'sys-e09-02', 'llm-lab-ch10-pipeline': 'sys-e10-02', 'llm-lab-ch11-journal': 'sys-e11-04', 'llm-lab-ch12-layout': 'eng-e12-02', 'llm-lab-ch14-evidence': 'eng-e14-02' };

test('chapter 9-12 and 14 labs are ungated code blocks at the end of their lab episodes', () => {
  assert.deepEqual(Object.keys(LABS).sort(), labs.assessments.map(a => a.id).sort());
  const gated = new Set(full.server.gates.flatMap(g => g.assessmentIds)), episodes = full.server.chapters.flatMap(c => c.episodes);
  for (const [id, episodeId] of Object.entries(LABS)) {
    const item = full.server.assessments.find(a => a.id === id), episode = episodes.find(e => e.id === episodeId);
    assert.equal(item.type, 'code'); assert.equal(item.grading.evaluatorId, 'llm-practical-labs-b'); assert(!gated.has(id), `${id} joined a gate`);
    assert.deepEqual(item.objectiveIds, episode.objectiveIds);
    assert.match(item.prompt, /^Chapter \d+ lab: /); assert.match(item.prompt, /does not block your progress/);
    const at = episode.blocks.findIndex(b => b.type === 'assessment' && b.assessmentId === id);
    assert(at >= 0 && episode.blocks.slice(at + 1).every(b => b.type === 'assessment' && !gated.has(b.assessmentId)), `${id} is not at the end of ${episodeId}`);
  }
});

test('the declared evaluator is pinned to the exact fixture bytes and its fixtures cover every lab', async () => {
  const bytes = await readFile(new URL('runtime/code-fixtures-labs-b.json', root)), registry = JSON.parse(bytes);
  const ext = full.server.extensions.find(e => e.id === 'llm-practical-labs-b');
  assert.equal(ext.integrity, `sha256-${createHash('sha256').update(bytes).digest('hex')}`);
  assert(bytes.length <= 1024 * 1024);
  assert.deepEqual(registry.fixtures.map(f => f.id).sort(), labs.assessments.map(a => a.grading.fixtureRef).sort());
  for (const f of registry.fixtures) assert(f.cases.length >= 20 && f.cases.length <= 100);
  const generator = spawnSync('python3', ['-B', 'runtime/lab-reference-b.py', '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(generator.status, 0, generator.stderr);
});

test('the learner bundle carries no lab prompt, fixture reference, starter or hidden expected output', async () => {
  const learner = JSON.stringify(full.learner), registry = await read('runtime/code-fixtures-labs-b.json');
  assert(!learner.includes('fixtureRef') && !learner.includes('llm-lab-ch09-tiling-v1'));
  for (const item of labs.assessments) { assert(!learner.includes(item.prompt.slice(0, 80))); assert(!learner.includes('Implement the lab protocol')); }
  for (const f of registry.fixtures) assert(!learner.includes(JSON.stringify(f.cases[0].expected).slice(0, 60)));
  assert(!full.learner.extensions.some(e => e.id === 'llm-practical-labs-b'));
});

test('independent qualification: oracles agree, reference passes, starter and wrong implementations fail', () => {
  const run = spawnSync('python3', ['-B', 'verification/labs-b.py'], { cwd: root, encoding: 'utf8', timeout: 300000 });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.qualified, true); assert.equal(Object.keys(report.fixtures).length, 5);
  for (const f of Object.values(report.fixtures)) {
    assert.equal(f.referencePassed, f.cases); assert.equal(f.starterFailsAll, true);
    assert(Object.keys(f.wrongImplementationsRejected).length >= 2 && Object.values(f.wrongImplementationsRejected).every(n => n >= 1));
  }
});
