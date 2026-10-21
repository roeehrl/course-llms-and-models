// Independent check of the course study definition against the rules Core applies when
// staff create or open a study. Core's own module is not a dependency of this repository,
// so the rules are restated here from Course Core v0.1.48 services/api/src/study.ts
// (definitionSchema and validateDefinition; unchanged on main at 3e248daa). Every
// instrument answer is recomputed with independent arithmetic.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { assemble, fragments, loadOverlays } from '../scripts/assemble.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const BEHAVIOURS = ['fixed', 'chat_only', 'supervisor'], SETS = ['pre', 'post', 'transfer', 'delayed'];

/** Core definitionSchema (zod strictObject) restated: returns a list of shape errors. */
export function schemaErrors(d) {
  const errors = [], strict = (value, keys, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return errors.push(`${path}: not an object`);
    for (const key of Object.keys(value)) if (!keys.includes(key)) errors.push(`${path}: unknown key ${key}`);
    for (const key of keys) if (!(key in value)) errors.push(`${path}: missing ${key}`);
  };
  strict(d, ['title', 'purpose', 'arms', 'instruments', 'minCellSize'], 'definition');
  const trimmed = s => typeof s === 'string' ? s.trim().length : -1;
  if (!(trimmed(d.title) >= 3 && trimmed(d.title) <= 120)) errors.push('title length');
  if (!(trimmed(d.purpose) >= 20 && trimmed(d.purpose) <= 2000)) errors.push('purpose length');
  if (!Array.isArray(d.arms) || d.arms.length < 2 || d.arms.length > 6) errors.push('arms count');
  for (const [i, arm] of (d.arms ?? []).entries()) {
    strict(arm, ['id', 'label', 'behaviour'], `arms/${i}`);
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(arm.id ?? '')) errors.push(`arms/${i}: id`);
    if (!(trimmed(arm.label) >= 1 && trimmed(arm.label) <= 60)) errors.push(`arms/${i}: label`);
    if (!BEHAVIOURS.includes(arm.behaviour)) errors.push(`arms/${i}: behaviour`);
  }
  strict(d.instruments, SETS, 'instruments');
  for (const set of SETS) {
    const list = d.instruments?.[set];
    if (!Array.isArray(list) || list.length > 50 || list.some(id => typeof id !== 'string' || id.length < 1 || id.length > 200)) errors.push(`instruments/${set}`);
  }
  if (!Number.isInteger(d.minCellSize) || d.minCellSize < 3 || d.minCellSize > 100) errors.push('minCellSize');
  return errors;
}

/** Core validateDefinition restated. RECOGNITION_TYPES is not consulted there: Core only
 * requires a declared role to be 'transfer' and warns when none is declared. */
export function validateDefinition(course, definition, opening = false) {
  const errors = [], warnings = [];
  const ids = definition.arms.map(a => a.id);
  if (new Set(ids).size !== ids.length) errors.push('STUDY_ARM_DUPLICATE');
  const items = new Map(course.assessments.map(a => [a.id, a])), seen = new Map();
  for (const set of SETS) {
    const list = definition.instruments[set];
    if (new Set(list).size !== list.length) errors.push('STUDY_ITEM_REPEATED');
    for (const id of list) {
      if (!items.has(id)) errors.push('STUDY_ITEM_UNKNOWN');
      if (seen.has(id) && seen.get(id) !== set) errors.push('STUDY_ITEM_IN_TWO_SETS');
      seen.set(id, set);
    }
  }
  for (const id of definition.instruments.transfer) {
    const role = items.get(id)?.role;
    if (role !== undefined && role !== 'transfer') errors.push('STUDY_TRANSFER_ROLE');
    if (role === undefined && items.has(id)) warnings.push(`Item ${id} has no declared SDK role; confirm it is a novel transfer task.`);
  }
  const retention = new Set(course.retention?.assessmentIds ?? []);
  for (const id of definition.instruments.delayed) if (!retention.has(id)) errors.push('STUDY_DELAYED_NOT_RETENTION');
  const gated = new Set(course.gates.flatMap(g => g.assessmentIds ?? []));
  for (const set of ['pre', 'post', 'transfer']) for (const id of definition.instruments[set]) if (gated.has(id)) warnings.push(`Item ${id} (${set}) also counts toward a gate, so learners may meet it during instruction.`);
  const objectives = set => new Set(definition.instruments[set].flatMap(id => items.get(id)?.objectiveIds ?? []));
  const pre = objectives('pre'), post = objectives('post');
  if (pre.size && post.size && (pre.size !== post.size || [...pre].some(o => !post.has(o)))) warnings.push('The pre-test and post-test cover different objectives, so they are not matched.');
  if (opening) {
    if (!definition.instruments.pre.length) errors.push('STUDY_PRE_REQUIRED');
    if (!definition.instruments.post.length) errors.push('STUDY_POST_REQUIRED');
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

/** Independent recomputation of every instrument answer (no authored expression is read). */
const d = (f, w, h = 1e-6) => (f(w + h) - f(w - h)) / (2 * h);
export const recomputed = {
  'study-pre-chain': d(w => ((2 * w + 1) - 4) ** 2 / 2, 0),
  'study-post-chain': d(w => ((4 * w - 1) - 2) ** 2 / 2, 1),
  'study-pre-descent': (() => { const w = 2, x = 2, y = 2; return w - 0.25 * d(v => (v * x - y) ** 2 / 2, w); })(),
  'study-post-descent': (() => { const w = 0, x = 2, y = 3; return w - 0.1 * d(v => (v * x - y) ** 2 / 2, w); })(),
  'study-pre-paths': d(x => (2 * x) * x, 3),
  'study-post-paths': d(x => (x + 1) * (x + 1) + x, 2),
  'study-pre-accum': [4, 4, 1, 1, 1, 1].reduce((s, g) => s + g, 0) / 6,
  'study-post-accum': [2, 2, 2, -1.5, -1.5].reduce((s, g) => s + g, 0) / 5,
  'study-transfer-stage': d(h => (3 * h - 4) ** 2 / 2, 2 * 1),
  'study-transfer-fd': (2.1 ** 3 - 1.9 ** 3) / (2 * 0.1),
  'study-transfer-scale': (() => { const g = 5, lr = 0.3; return lr * g / (3 * g); })(),
  'study-transfer-microbatch': [3, 3, -1, -1, -1, 6].reduce((s, g) => s + g, 0) / 6,
};

export async function checkStudy() {
  const [config, modules, overlays, study] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(), read('content/study.json')]);
  const course = assemble(config, modules, overlays).server;
  assert.deepEqual(schemaErrors(study.definition), [], 'Study definition does not match Core definitionSchema');
  const result = validateDefinition(course, study.definition, true);
  assert.deepEqual(result.errors, [], 'Core would refuse this study');
  const items = new Map(course.assessments.map(a => [a.id, a]));
  const instruments = SETS.flatMap(set => study.definition.instruments[set]);
  for (const set of ['pre', 'post', 'transfer']) for (const id of study.definition.instruments[set]) {
    const item = items.get(id), episode = course.chapters.flatMap(c => c.episodes).find(e => e.blocks.some(b => b.type === 'assessment' && b.assessmentId === id));
    assert(episode, `${id} is not answerable from any episode block`);
    assert.equal(item.type, 'numeric', `${id}: study items are numeric production items`);
    assert(Math.abs(recomputed[id] - item.grading.expected) <= Math.max(1e-6, item.grading.absoluteTolerance), `${id}: ${recomputed[id]} vs ${item.grading.expected}`);
    if (set === 'transfer') assert.equal(item.role, 'transfer');
  }
  // Pre and post are parallel forms on the same objectives, item for item.
  const objs = set => study.definition.instruments[set].map(id => items.get(id).objectiveIds.join()).sort();
  assert.deepEqual(objs('pre'), objs('post'));
  // The pre form precedes the instruction it measures in course order.
  const order = course.chapters.flatMap(c => c.episodes.map(e => e.id)), at = id => order.findIndex(e => course.chapters.flatMap(c => c.episodes).find(x => x.id === e).blocks.some(b => b.assessmentId === id));
  const objectiveEpisode = o => order.findIndex(e => course.chapters.flatMap(c => c.episodes).find(x => x.id === e).objectiveIds.includes(o));
  for (const id of study.definition.instruments.pre) assert(at(id) <= objectiveEpisode(items.get(id).objectiveIds[0]), `${id} comes after its instruction`);
  for (const id of study.definition.instruments.post) assert(at(id) >= objectiveEpisode(items.get(id).objectiveIds[0]), `${id} comes before its instruction`);
  // Negative controls: each would be refused by Core.
  const mutate = f => { const copy = structuredClone(study.definition); f(copy); return validateDefinition(course, copy, true).errors; };
  const negatives = {
    STUDY_ITEM_IN_TWO_SETS: mutate(x => x.instruments.post.push(x.instruments.pre[0])),
    STUDY_DELAYED_NOT_RETENTION: mutate(x => x.instruments.delayed.push(x.instruments.post[0])),
    STUDY_TRANSFER_ROLE: mutate(x => x.instruments.transfer.push(x.instruments.pre[0])),
    STUDY_ITEM_UNKNOWN: mutate(x => x.instruments.pre.push('no-such-item')),
    STUDY_ARM_DUPLICATE: mutate(x => x.arms.push({ ...x.arms[0] })),
    STUDY_PRE_REQUIRED: mutate(x => { x.instruments.pre = []; }),
  };
  for (const [code, errors] of Object.entries(negatives)) assert(errors.includes(code), `negative control ${code} not refused`);
  assert(schemaErrors({ ...study.definition, extra: 1 }).length > 0 && schemaErrors({ ...study.definition, minCellSize: 2 }).length > 0);
  return { valid: true, warnings: result.warnings, arms: study.definition.arms.map(a => a.behaviour), instruments: Object.fromEntries(SETS.map(s => [s, study.definition.instruments[s].length])),
    recomputed: Object.keys(recomputed).length, gated: instruments.filter(id => course.gates.some(g => g.assessmentIds.includes(id))).length, negativeControlsRefused: Object.keys(negatives).length, run: 'not_run_no_participants' };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await checkStudy()));
