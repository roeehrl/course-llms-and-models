import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assemble } from '../scripts/assemble.mjs';
const config = JSON.parse(await readFile(new URL('../content/course-config.json', import.meta.url), 'utf8'));
const foundations = JSON.parse(await readFile(new URL('../content/foundations.json', import.meta.url), 'utf8'));

test('partial course cannot be emitted under a complete-course label', () => {
  assert.throws(() => assemble(config, [foundations]), /all 14 chapters/);
  const output = assemble(config, [foundations], { preview: true });
  assert.match(output.server.id, /-preview$/);
  assert.match(output.learner.summary, /not the complete/);
});
test('an item identifier does not substitute for a second independent family', () => {
  const broken = structuredClone(foundations), gate = broken.gates[0];
  const first = broken.assessments.find(item => item.id === gate.assessmentIds[0]);
  for (const id of gate.assessmentIds) broken.assessments.find(item => item.id === id).familyId = first.familyId;
  assert.throws(() => assemble(config, [broken], { preview: true }), /Insufficient independent families/);
});
test('every initial foundation episode has original teaching and server-only answer keys', () => {
  const output = assemble(config, [foundations], { preview: true });
  assert.equal(output.server.chapters.flatMap(chapter => chapter.episodes).length, 16);
  for (const item of output.learner.assessments) {
    assert(!('grading' in item)); assert(!('prompt' in item)); assert(!('options' in item));
  }
  for (const chapter of output.server.chapters) for (const episode of chapter.episodes) {
    const prose = episode.blocks.filter(block => block.type === 'text').map(block => block.markdown).join('\n');
    assert(prose.split(/\s+/).length >= 400, episode.id);
  }
});
