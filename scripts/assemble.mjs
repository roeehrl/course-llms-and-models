import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileCourse, verifyCompiledCourse } from '@course-core/sdk/compiler';

export const fragments = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice'];
export const fields = ['objectives', 'chapters', 'assessments', 'gates', 'sources', 'visuals', 'media', 'extensions'];
export function assemble(config, modules, { preview = false, visualOverlay, visualOverlays = [], practicalOverlay,practicalRuntimeOverlay,recoveryOverlay } = {}) {
  const course = structuredClone(config);
  for (const field of fields) course[field] = modules.flatMap(module => {
    assert(Array.isArray(module[field]), `Fragment lacks ${field}`);
    return structuredClone(module[field]);
  });
  // Deduplicate identical shared source references; never silently merge disagreeing records.
  const sources = new Map();
  for (const source of course.sources) {
    if (sources.has(source.id)) assert.deepEqual(source, sources.get(source.id), `Conflicting source ${source.id}`);
    sources.set(source.id, source);
  }
  course.sources = [...sources.values()];
  if(recoveryOverlay){assert(recoveryOverlay.schemaVersion===1&&recoveryOverlay.adaptation&&Array.isArray(recoveryOverlay.extensions),'Invalid recovery declaration');course.adaptation=structuredClone(recoveryOverlay.adaptation);course.sources.push(structuredClone(recoveryOverlay.source),...structuredClone(recoveryOverlay.sources??[]));course.extensions.push(...structuredClone(recoveryOverlay.extensions));}
  for (const overlay of [...(visualOverlay ? [visualOverlay] : []), ...visualOverlays]) {
    assert(overlay.extension && Array.isArray(overlay.visuals) && Array.isArray(overlay.bindings), 'Invalid visual overlay');
    const existing = course.extensions.find(e => e.id === overlay.extension.id);
    if (existing) {
      assert.deepEqual({ ...existing, accessibility: { ...existing.accessibility, textAlternative: overlay.extension.accessibility.textAlternative } }, overlay.extension, 'Conflicting visual renderer implementations');
      existing.accessibility.textAlternative = [...new Set([existing.accessibility.textAlternative, overlay.extension.accessibility.textAlternative])].join(' ');
    } else course.extensions.push(structuredClone(overlay.extension));
    course.visuals.push(...structuredClone(overlay.visuals));
    for (const binding of overlay.bindings) {
      const episode = course.chapters.flatMap(chapter => chapter.episodes).find(episode => episode.id === binding.episodeId);
      assert(episode, `Visual episode missing: ${binding.episodeId}`);
      const index = episode.blocks.findIndex(block => block.id === binding.afterBlockId);
      assert(index >= 0, `Visual insertion anchor missing: ${binding.afterBlockId}`);
      assert(course.visuals.some(visual => visual.id === binding.visualId), `Visual missing: ${binding.visualId}`);
      episode.blocks.splice(index + 1, 0, { id: `visual-${binding.visualId}`, type: 'visual', visualId: binding.visualId });
    }
  }
  if (practicalOverlay) {
    const evaluators=practicalOverlay.extensions??[practicalOverlay.extension];
    assert(evaluators.length&&evaluators.every(e=>e?.execution==='server'&&e.capabilities.includes('assessment.evaluate'))&&Array.isArray(practicalOverlay.assessments)&&Array.isArray(practicalOverlay.bindings),'Invalid practical overlay');
    course.extensions.push(...structuredClone(evaluators));
    course.assessments.push(...structuredClone(practicalOverlay.assessments));
    const boundFamilies = new Set(), affectedGates = new Set();
    for (const binding of practicalOverlay.bindings) {
      const episode = course.chapters.flatMap(chapter => chapter.episodes).find(episode => episode.id === binding.episodeId);
      const gate = course.gates.find(gate => gate.id === binding.gateId), assessment = course.assessments.find(item => item.id === binding.assessmentId);
      assert(episode && gate && episode.gateId === gate.id && assessment?.type === 'code', 'Invalid practical binding');
      assert(assessment.objectiveIds.every(id => gate.objectiveIds.includes(id)), 'Practical objective out of scope');
      gate.assessmentIds.push(assessment.id); affectedGates.add(gate.id);
      const familyKey = `${episode.id}:${assessment.familyId}`;
      if (!boundFamilies.has(familyKey)) {
        episode.blocks.push({ id: `practical-${assessment.familyId}`, type: 'assessment', assessmentId: assessment.id });
        boundFamilies.add(familyKey);
      }
    }
    for (const id of affectedGates) {
      const gate = course.gates.find(gate => gate.id === id);
      // Require every authored canonical family. Fresh variants must retain their
      // canonical family, so extra retries can never replace practical evidence.
      gate.minimumIndependentFamilies = new Set(course.assessments.filter(item => gate.assessmentIds.includes(item.id)).map(item => item.familyId)).size;
      gate.requireAllObjectives = true;
    }
  }
  if(practicalRuntimeOverlay){
    assert(practicalRuntimeOverlay.schemaVersion===1&&practicalOverlay,'Invalid practical runtime declaration');
    assert.deepEqual(practicalRuntimeOverlay.replaces,practicalOverlay.extension,'Practical baseline implementation changed');
    const replacement=practicalRuntimeOverlay.extension;
    assert(replacement?.id!==practicalOverlay.extension.id&&replacement.execution==='server'&&replacement.capabilities.includes('assessment.evaluate'),'A new pinned evaluator identity is required');
    const index=course.extensions.findIndex(e=>e.id===practicalOverlay.extension.id);assert(index>=0,'Missing original evaluator');
    course.extensions[index]=structuredClone(replacement);
    for(const assessment of course.assessments)if(assessment.type==='code'&&assessment.grading.evaluatorId===practicalOverlay.extension.id)assessment.grading.evaluatorId=replacement.id;
  }
  if (preview) {
    course.id += '-preview'; course.title += ' · development preview';
    course.summary = `Partial course preview. ${course.chapters.length} chapters are available; this is not the complete 14-chapter course. ${course.summary}`;
  } else {
    assert.equal(course.chapters.length, 14, 'A complete course must have all 14 chapters. Use --preview explicitly for partial authoring.');
    assert.equal(course.chapters.flatMap(chapter => chapter.episodes).length, 56, 'A complete course must have all 56 episodes.');
  }
  for (const chapter of course.chapters) for (const episode of chapter.episodes) {
    assert(episode.gateId, `Missing evidence gate: ${episode.id}`);
    assert(episode.blocks.some(block => block.type === 'text' && block.markdown.length > 200), `Missing substantive teaching: ${episode.id}`);
    const gate = course.gates.find(candidate => candidate.id === episode.gateId);
    assert(gate && gate.requireAllObjectives && gate.minimumIndependentFamilies >= 2, `Weak gate: ${episode.id}`);
    for (const objectiveId of gate.objectiveIds) {
      const families = new Set(course.assessments.filter(item => gate.assessmentIds.includes(item.id) && item.objectiveIds.includes(objectiveId)).map(item => item.familyId));
      assert(families.size >= gate.minimumIndependentFamilies, `Insufficient independent families for ${objectiveId}`);
    }
  }
  const compiled = compileCourse(course);
  assert(verifyCompiledCourse(compiled));
  for (const assessment of compiled.learner.assessments) assert.deepEqual(Object.keys(assessment).sort(), ['id', 'objectiveIds', 'type']);
  return compiled;
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 1 && args[0] === '--preview'), 'Usage: assemble.mjs [--preview]');
  const preview = args.includes('--preview'), root = new URL('../', import.meta.url);
  const config = JSON.parse(await readFile(new URL('content/course-config.json', root), 'utf8'));
  const modules = [];
  for (const name of fragments) {
    try { modules.push(JSON.parse(await readFile(new URL(`content/${name}.json`, root), 'utf8'))); }
    catch (error) { if (!preview || error.code !== 'ENOENT') throw error; }
  }
  let visualOverlay;
  try { visualOverlay = JSON.parse(await readFile(new URL('content/visuals.json', root), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const practicalOverlay=JSON.parse(await readFile(new URL('content/practicals-qualified.json',root),'utf8'));
  const visualOverlays = [];
  try { visualOverlays.push(JSON.parse(await readFile(new URL('content/systems-visuals.json', root), 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let recoveryOverlay;
  try{recoveryOverlay=JSON.parse(await readFile(new URL('content/recovery-runtime.json',root),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const compiled = assemble(config, modules, { preview, visualOverlay, visualOverlays, practicalOverlay,recoveryOverlay });
  const directory = new URL('dist/', root); await mkdir(directory, { recursive: true, mode: 0o700 });
  const stem = preview ? 'course-preview' : 'course';
  await writeFile(new URL(`${stem}.manifest.json`, directory), JSON.stringify(compiled.server, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.compiled.json`, directory), JSON.stringify(compiled, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.learner.json`, directory), JSON.stringify(compiled.learner, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ kind: preview ? 'development-preview' : 'full-curriculum-bundle', digest: compiled.digest, chapters: compiled.server.chapters.length, episodes: compiled.server.chapters.flatMap(chapter => chapter.episodes).length }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
