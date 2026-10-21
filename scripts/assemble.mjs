import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileCourse, verifyCompiledCourse } from '@course-core/sdk/compiler';

export const fragments = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice'];
export const fields = ['objectives', 'chapters', 'assessments', 'gates', 'sources', 'visuals', 'media', 'extensions'];
/** Every verified illustration overlay, oldest first. Assembly, recovery binding and
 * packaging all read this one list so a packaged course cannot silently drop one. */
export const VISUAL_OVERLAYS = ['visuals', 'systems-visuals', 'learning-visuals', 'concept-visuals', 'worked-adaptive-visuals'];
const contentRoot = new URL('../content/', import.meta.url);
const readContent = async name => JSON.parse(await readFile(new URL(`${name}.json`, contentRoot), 'utf8'));
/** All overlays of the complete course. Pass recovery: false to build the unadapted
 * baseline that scripts/bind-recovery-runtime.mjs binds against. */
export async function loadOverlays({ recovery = true } = {}) {
  const [first, ...rest] = await Promise.all(VISUAL_OVERLAYS.map(readContent));
  return {
    visualOverlay: first, visualOverlays: rest, practicalOverlay: await readContent('practicals-qualified'),
    ...(recovery ? { recoveryOverlay: await readContent('recovery-runtime') } : {}),
    writtenOverlay: await readContent('written-explanations'), placementOverlay: await readContent('placement'), retentionOverlay: await readContent('retention-checks'),
    authoringOverlays: (await Promise.all(AUTHORING_OVERLAYS.map(readOptional))).filter(Boolean),
  };
}
/** Additive authoring overlays on the SDK 0.5 contracts, applied in this order after the
 * learner-evidence overlays. Each file is optional so partial checkouts still assemble. */
export const AUTHORING_OVERLAYS = ['misconceptions', 'worked-adaptive-episode', 'labs-a', 'labs-b', 'portfolio', 'research', 'study-instruments'];
const readOptional = async name => { try { return await readContent(name); } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; } };
const allEpisodes = course => course.chapters.flatMap(chapter => chapter.episodes);
/** Fields of an authoring overlay. Anything else (notes, annotations, review metadata) is
 * authoring-only and never reaches the compiled course. */
const AUTHORING_FIELDS = new Set(['schemaVersion', 'id', 'purpose', 'source', 'sources', 'extensions', 'assessments', 'hypotheses', 'probes', 'distractorLinks',
  'episodeBlocks', 'gateBindings', 'research', 'researchTasks', 'annotations', 'chapterProbes', 'review']);
/**
 * Applies one additive authoring overlay. It may declare new server-only contracts
 * (hypotheses, probes, research), new items that never join a gate (probes, labs, study
 * instruments), links from existing distractors to declared misconceptions, and reviewed
 * rubric items that join a gate as an extra first family without changing its threshold.
 * It never edits teaching text, an existing answer key, a gate threshold or the policy.
 */
export function applyAuthoringOverlay(course, overlay) {
  assert(overlay?.schemaVersion === 1 && typeof overlay.id === 'string', 'Invalid authoring overlay');
  for (const key of Object.keys(overlay)) assert(AUTHORING_FIELDS.has(key), `Unknown authoring overlay field ${key} in ${overlay.id}`);
  const episodes = allEpisodes(course), byId = new Map(course.assessments.map(a => [a.id, a]));
  for (const source of overlay.sources ?? (overlay.source ? [overlay.source] : [])) {
    const existing = course.sources.find(s => s.id === source.id);
    if (existing) assert.deepEqual(existing, source, `Conflicting source ${source.id}`); else course.sources.push(structuredClone(source));
  }
  for (const extension of overlay.extensions ?? []) {
    const existing = course.extensions.find(e => e.id === extension.id);
    if (existing) assert.deepEqual(existing, extension, `Conflicting extension ${extension.id}`); else course.extensions.push(structuredClone(extension));
  }
  for (const item of overlay.assessments ?? []) {
    assert(!byId.has(item.id), `Authoring overlay ${overlay.id} redefines assessment ${item.id}`);
    const copy = structuredClone(item); course.assessments.push(copy); byId.set(copy.id, copy);
  }
  for (const field of ['hypotheses', 'probes', 'researchTasks']) if (overlay[field]?.length) {
    course[field] ??= [];
    for (const entry of overlay[field]) {
      assert(!course[field].some(e => e.id === entry.id), `Duplicate ${field} id ${entry.id}`);
      course[field].push(structuredClone(entry));
    }
  }
  if (overlay.research?.publicTopics?.length) {
    course.research ??= { publicTopics: [] };
    for (const topic of overlay.research.publicTopics) {
      assert(!course.research.publicTopics.some(t => t.id === topic.id), `Duplicate research topic ${topic.id}`);
      course.research.publicTopics.push(structuredClone(topic));
    }
  }
  const hypotheses = new Set((course.hypotheses ?? []).map(h => h.id));
  for (const link of overlay.distractorLinks ?? []) {
    const item = byId.get(link.assessmentId), option = item?.type === 'choice' ? item.options.find(o => o.id === link.optionId) : undefined;
    assert(option && option.id !== item.grading.correctOptionId, `Invalid distractor link ${link.assessmentId}/${link.optionId}`);
    assert(hypotheses.has(link.hypothesisId), `Distractor link to undeclared hypothesis ${link.hypothesisId}`);
    assert(option.misconceptionId === undefined || option.misconceptionId === link.hypothesisId, `Distractor ${link.assessmentId}/${link.optionId} already linked`);
    option.misconceptionId = link.hypothesisId;
  }
  const gated = () => new Set(course.gates.flatMap(g => g.assessmentIds));
  for (const binding of overlay.episodeBlocks ?? []) {
    // Ungated items: answerable from their episode, recorded as evidence, never a gate requirement.
    const episode = episodes.find(e => e.id === binding.episodeId), item = byId.get(binding.assessmentId);
    assert(episode && item && !gated().has(item.id), `Invalid ungated episode block ${binding.episodeId}/${binding.assessmentId}`);
    assert(item.objectiveIds.some(id => episode.objectiveIds.includes(id)) || binding.crossEpisode === true, `Episode block outside its episode objectives: ${item.id}`);
    assert(['start', 'end', 'beforeAssessments'].includes(binding.position), `Invalid block position for ${item.id}`);
    const block = { id: `${binding.prefix ?? 'item'}-${item.id}`, type: 'assessment', assessmentId: item.id };
    assert(!episode.blocks.some(b => b.id === block.id), `Duplicate block ${block.id}`);
    if (binding.position === 'start') episode.blocks.unshift(block);
    else if (binding.position === 'end') episode.blocks.push(block);
    else { const at = episode.blocks.findIndex(b => b.type === 'assessment'); episode.blocks.splice(at < 0 ? episode.blocks.length : at, 0, block); }
  }
  for (const binding of overlay.gateBindings ?? []) {
    // Same contract as written explanations: a reviewed rubric item joins as a new first
    // family; the family threshold is unchanged, so review never blocks completion.
    const episode = episodes.find(e => e.id === binding.episodeId), item = byId.get(binding.assessmentId);
    assert(episode && item?.type === 'rubric', `Invalid gate binding ${binding.episodeId}/${binding.assessmentId}`);
    const gate = course.gates.find(g => g.id === episode.gateId), before = structuredClone(gate);
    assert(item.objectiveIds.every(id => gate.objectiveIds.includes(id)), 'Rubric item outside its gate scope');
    assert(!course.assessments.filter(a => gate.assessmentIds.includes(a.id)).some(a => a.familyId === item.familyId), 'Rubric item must be a new family');
    gate.assessmentIds.unshift(item.id);
    assert.deepEqual({ ...gate, assessmentIds: before.assessmentIds }, before, 'Gate threshold changed');
    const at = episode.blocks.findIndex(block => block.type === 'assessment');
    episode.blocks.splice(at < 0 ? episode.blocks.length : at, 0, { id: `${binding.prefix ?? 'rubric'}-${item.id}`, type: 'assessment', assessmentId: item.id });
  }
  // Probes and other diagnostic items never become gate evidence.
  const probeItems = new Set((course.probes ?? []).map(p => p.assessmentId));
  for (const id of gated()) assert(!probeItems.has(id) && byId.get(id)?.role !== 'diagnostic_probe', `Diagnostic probe ${id} joined a gate`);
  return course;
}
/** Written explanations, optional placement and delayed retention checks. Each
 * overlay is additive: no teaching text, existing item, gate threshold or policy changes. */
export function applyLearnerEvidence(course, { writtenOverlay, placementOverlay, retentionOverlay } = {}) {
  if (writtenOverlay) {
    assert(writtenOverlay.schemaVersion === 1 && writtenOverlay.extension && Array.isArray(writtenOverlay.assessments) && Array.isArray(writtenOverlay.bindings), 'Invalid written-explanation overlay');
    const declared = course.extensions.find(e => e.id === writtenOverlay.extension.id);
    if (declared) assert.deepEqual(declared, writtenOverlay.extension, 'Conflicting rubric evaluator declaration');
    else course.extensions.push(structuredClone(writtenOverlay.extension));
    for (const binding of writtenOverlay.bindings) {
      const item = writtenOverlay.assessments.find(a => a.id === binding.assessmentId), episode = allEpisodes(course).find(e => e.id === binding.episodeId);
      assert(item?.type === 'rubric' && item.grading.evaluatorId === writtenOverlay.extension.id && episode, 'Invalid written-explanation binding');
      const gate = course.gates.find(g => g.id === episode.gateId), before = structuredClone(gate);
      assert(item.objectiveIds.every(id => gate.objectiveIds.includes(id)), 'Written explanation outside its gate scope');
      assert(!course.assessments.filter(a => gate.assessmentIds.includes(a.id)).some(a => a.type === 'code' || a.familyId === item.familyId), 'Written explanations only join non-practical gates as a new family');
      course.assessments.push(structuredClone(item));
      // First in the gate, so the learner app offers the written explanation before the
      // short checks; the family threshold is unchanged, so review never blocks completion.
      gate.assessmentIds.unshift(item.id);
      assert.deepEqual({ ...gate, assessmentIds: before.assessmentIds }, before, 'Gate threshold changed');
      const at = episode.blocks.findIndex(block => block.type === 'assessment');
      episode.blocks.splice(at < 0 ? episode.blocks.length : at, 0, { id: `written-${item.id}`, type: 'assessment', assessmentId: item.id });
    }
  }
  if (placementOverlay) {
    const placement = placementOverlay.placement;
    assert(placementOverlay.schemaVersion === 1 && placement?.enabled === true && placement.learnerMayDecline === true, 'Invalid placement overlay');
    const covered = allEpisodes(course).filter(e => e.objectiveIds.every(id => placement.objectiveIds.includes(id)));
    assert(placement.objectiveIds.every(id => course.objectives.find(o => o.id === id)?.placeable === true), 'Placement objective is not author-marked placeable');
    // Exactly the existing independent short checks of the covered episodes: never a
    // written explanation, practical, retention item or new question.
    const expected = covered.flatMap(e => course.gates.find(g => g.id === e.gateId).assessmentIds)
      .filter(id => ['choice', 'numeric'].includes(course.assessments.find(a => a.id === id).type));
    assert.deepEqual([...placement.assessmentIds].sort(), [...expected].sort(), 'Placement items must be the covered episodes\' existing short checks');
    assert(placement.maxItems === placement.assessmentIds.length && placement.protectedEpisodeIds.every(id => covered.some(e => e.id === id)), 'Invalid placement limits');
    course.placement = structuredClone(placement);
  }
  if (retentionOverlay) {
    assert(retentionOverlay.schemaVersion === 1 && Array.isArray(retentionOverlay.assessments) && Array.isArray(retentionOverlay.intervalsDays), 'Invalid retention overlay');
    const exposed = new Set([...course.gates.flatMap(g => g.assessmentIds), ...(course.placement?.assessmentIds ?? [])]);
    for (const item of retentionOverlay.assessments) {
      assert(['choice', 'numeric'].includes(item.type) && !exposed.has(item.id) && !course.assessments.some(a => a.id === item.id), 'Retention items must be new held-out short checks');
      course.assessments.push(structuredClone(item));
    }
    course.retention = { intervalsDays: [...retentionOverlay.intervalsDays], objectiveIds: retentionOverlay.objectives.map(o => o.objectiveId), assessmentIds: retentionOverlay.assessments.map(a => a.id) };
  }
  return course;
}

export function assemble(config, modules, { preview = false, visualOverlay, visualOverlays = [], practicalOverlay,practicalRuntimeOverlay,recoveryOverlay, writtenOverlay, placementOverlay, retentionOverlay, authoringOverlays = [] } = {}) {
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
  applyLearnerEvidence(course, { writtenOverlay, placementOverlay, retentionOverlay });
  for (const overlay of authoringOverlays) applyAuthoringOverlay(course, overlay);
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
  const compiled = assemble(config, modules, { preview, ...await loadOverlays() });
  const directory = new URL('dist/', root); await mkdir(directory, { recursive: true, mode: 0o700 });
  const stem = preview ? 'course-preview' : 'course';
  await writeFile(new URL(`${stem}.manifest.json`, directory), JSON.stringify(compiled.server, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.compiled.json`, directory), JSON.stringify(compiled, null, 2) + '\n', { mode: 0o600 });
  await writeFile(new URL(`${stem}.learner.json`, directory), JSON.stringify(compiled.learner, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ kind: preview ? 'development-preview' : 'full-curriculum-bundle', digest: compiled.digest, chapters: compiled.server.chapters.length, episodes: compiled.server.chapters.flatMap(chapter => chapter.episodes).length }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
