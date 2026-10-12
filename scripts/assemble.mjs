import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileCourse, verifyCompiledCourse } from '@course-core/sdk/compiler';

export const fragments = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice'];
export const fields = ['objectives', 'chapters', 'assessments', 'gates', 'sources', 'visuals', 'media', 'extensions'];
export function assemble(config, modules, { preview = false } = {}) {
  const course = structuredClone(config);
  for (const field of fields) course[field] = modules.flatMap(module => {
    assert(Array.isArray(module[field]), `Fragment lacks ${field}`);
    return module[field];
  });
  // Deduplicate identical shared source references; never silently merge disagreeing records.
  const sources = new Map();
  for (const source of course.sources) {
    if (sources.has(source.id)) assert.deepEqual(source, sources.get(source.id), `Conflicting source ${source.id}`);
    sources.set(source.id, source);
  }
  course.sources = [...sources.values()];
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
  const compiled = assemble(config, modules, { preview });
  const directory = new URL('dist/', root); await mkdir(directory, { recursive: true, mode: 0o700 });
  const stem = preview ? 'course-preview' : 'course';
  await writeFile(new URL(`${stem}.manifest.json`, directory), JSON.stringify(compiled.server, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.compiled.json`, directory), JSON.stringify(compiled, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.learner.json`, directory), JSON.stringify(compiled.learner, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ kind: preview ? 'partial-preview' : 'complete-course', digest: compiled.digest, chapters: compiled.server.chapters.length, episodes: compiled.server.chapters.flatMap(chapter => chapter.episodes).length }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
