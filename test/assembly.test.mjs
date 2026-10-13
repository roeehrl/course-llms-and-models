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
test('visual overlays are bound to real teaching anchors and survive the learner projection', async () => {
  const visualOverlay = JSON.parse(await readFile(new URL('../content/visuals.json', import.meta.url), 'utf8'));
  const output = assemble(config, [foundations], { preview: true, visualOverlay });
  assert.equal(output.learner.visuals.length, 3);
  assert.equal(output.learner.chapters.flatMap(chapter => chapter.episodes).flatMap(episode => episode.blocks).filter(block => block.type === 'visual').length, 3);
  const wrong = structuredClone(visualOverlay); wrong.bindings[0].afterBlockId = 'nonexistent';
  assert.throws(() => assemble(config, [foundations], { preview: true, visualOverlay: wrong }), /anchor missing/);
});
test('full practical overlay keeps alternatives in one family and requires that family without mutating inputs', async () => {
  const names = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice'];
  const modules = await Promise.all(names.map(async name => JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), 'utf8'))));
  const practicalOverlay = JSON.parse(await readFile(new URL('../content/practicals.json', import.meta.url), 'utf8'));
  const before = JSON.stringify(modules);
  const output = assemble(config, modules, { practicalOverlay });
  assert.equal(output.server.chapters.flatMap(chapter => chapter.episodes).length, 56);
  for (const gateId of new Set(practicalOverlay.bindings.map(binding => binding.gateId))) {
    const gate = output.server.gates.find(gate => gate.id === gateId);
    const items = output.server.assessments.filter(item => gate.assessmentIds.includes(item.id));
    assert.equal(gate.minimumIndependentFamilies, 3);
    assert.equal(new Set(items.filter(item => item.type !== 'code').map(item => item.familyId)).size, 2);
    assert.equal(items.filter(item => item.type === 'code').length, 2);
  }
  assert.equal(JSON.stringify(modules), before);
  assert(!output.learner.extensions.some(extension => extension.id === practicalOverlay.extension.id));
  assert(!JSON.stringify(output.learner).includes('fixtureRef'));
});

test('all six qualified illustrations use one identical renderer and retain their lesson anchors', async () => {
  const names=['foundations','training-and-transformers','systems-and-distribution','engineering-practice'];
  const modules=await Promise.all(names.map(async name=>JSON.parse(await readFile(new URL(`../content/${name}.json`,import.meta.url),'utf8'))));
  const overlays=await Promise.all(['visuals','systems-visuals'].map(async name=>JSON.parse(await readFile(new URL(`../content/${name}.json`,import.meta.url),'utf8'))));
  const output=assemble(config,modules,{visualOverlays:overlays});
  assert.equal(output.learner.visuals.length,6); assert.equal(output.server.extensions.filter(e=>e.id==='course-core-svg-v1').length,1);
  for(const overlay of overlays)for(const binding of overlay.bindings){
    const episode=output.server.chapters.flatMap(c=>c.episodes).find(e=>e.id===binding.episodeId);
    assert(episode.blocks.some(b=>b.type==='visual'&&b.visualId===binding.visualId));
  }
  const changed=structuredClone(overlays); changed[1].extension.integrity='sha256-'+ 'a'.repeat(64);
  assert.throws(()=>assemble(config,modules,{visualOverlays:changed}),/Conflicting visual renderer/);
});
