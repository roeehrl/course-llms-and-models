import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assemble, fragments, loadOverlays, applyAuthoringOverlay } from '../scripts/assemble.mjs';
import { checkStudy } from '../verification/study.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, research, instruments] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(), read('content/research.json'), read('content/study-instruments.json')]);
const full = assemble(config, modules, overlays);

test('the study definition is one Core would accept and open, with matched, ungated, answerable instruments', async () => {
  const report = await checkStudy();
  assert.equal(report.valid, true); assert.deepEqual(report.warnings, []); assert.equal(report.gated, 0);
  assert.deepEqual(report.arms, ['fixed', 'chat_only', 'supervisor']);
  assert.deepEqual(report.instruments, { pre: 4, post: 4, transfer: 4, delayed: 4 });
  const learner = JSON.stringify(full.learner);
  for (const item of instruments.assessments) { assert(!learner.includes(item.prompt.slice(40, 120))); assert(!learner.includes(item.grading.explanation)); }
});

test('every chapter has an author-reviewed reading and video research topic, each with its own task', () => {
  const { publicTopics } = full.server.research, tasks = full.server.researchTasks;
  for (const chapter of full.server.chapters) {
    const objectives = chapter.episodes.flatMap(e => e.objectiveIds);
    for (const kind of ['reading', 'video']) {
      const topic = publicTopics.find(t => t.id === `topic-ch${chapter.id.slice(-2)}-${kind}`);
      assert(topic && objectives.every(o => topic.objectiveIds.includes(o)), `${chapter.id} ${kind}`);
      const task = tasks.find(t => t.publicTopicIds.includes(topic.id));
      assert(task && task.sourcePolicy.allowedDomains.every(d => topic.allowedDomains.includes(d)) && task.sourcePolicy.requireReviewedContent === true);
    }
  }
  // Public query text only: no private system names, hosts, addresses or learner data.
  for (const topic of publicTopics) assert.doesNotMatch(topic.queryText, /\b(TAH|IOTA|SN9|M5|tailnet|ssh|\d+\.\d+\.\d+\.\d+)\b|@/i, topic.id);
  assert(!('research' in full.learner) && !('researchTasks' in full.learner));
  assert(!JSON.stringify(full.learner).includes(publicTopics[0].queryText));
});

test('a task that widens its topic allowlist, a duplicate topic or a gated study item is refused', () => {
  const widened = structuredClone(research); widened.researchTasks[0].sourcePolicy.allowedDomains.push('example.com');
  assert.throws(() => assemble(config, modules, { ...overlays, authoringOverlays: overlays.authoringOverlays.map(o => o.id === 'research' ? widened : o) }), /validation failed/);
  const duplicate = structuredClone(research); duplicate.research.publicTopics.push(structuredClone(duplicate.research.publicTopics[0]));
  assert.throws(() => assemble(config, modules, { ...overlays, authoringOverlays: overlays.authoringOverlays.map(o => o.id === 'research' ? duplicate : o) }), /Duplicate research topic/);
  const course = structuredClone(full.server), gated = structuredClone(instruments);
  gated.assessments = gated.assessments.map(a => ({ ...a, id: `${a.id}-x` })); gated.episodeBlocks = gated.episodeBlocks.map(b => ({ ...b, assessmentId: `${b.assessmentId}-x` }));
  course.gates[0].assessmentIds.push(gated.assessments[0].id); course.assessments.push(gated.assessments[0]); gated.assessments.shift();
  assert.throws(() => applyAuthoringOverlay(course, gated), /ungated episode block/);
});
