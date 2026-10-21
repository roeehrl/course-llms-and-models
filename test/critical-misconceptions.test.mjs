// Prepared content for SDK 0.6.0: checks it stays applicable without switching it on.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assemble, fragments, loadOverlays } from '../scripts/assemble.mjs';
import { applyCriticalMisconceptions, installedSdkVersion } from '../scripts/critical-misconceptions.mjs';

const root = new URL('../', import.meta.url), read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [config, modules, overlays, prepared] = await Promise.all([read('content/course-config.json'), Promise.all(fragments.map(n => read(`content/${n}.json`))), loadOverlays(), read('content/sdk-0.6/critical-misconceptions.json')]);
const course = assemble(config, modules, overlays).server;

test('the prepared critical misconceptions are not applied to the built course', () => {
  assert.equal(prepared.status, 'prepared_not_applied');
  assert(!overlays.authoringOverlays.some(o => o.id === prepared.id));
  assert(course.hypotheses.every(h => !h.critical));
});
test('the released SDK refuses them; on SDK 0.6.0 each one is declared and exposed by a gate item', () => {
  if (installedSdkVersion().startsWith('0.5.') || installedSdkVersion().startsWith('0.4.')) assert.throws(() => applyCriticalMisconceptions(structuredClone(course), prepared), /need SDK 0.6.0/);
  const applied = applyCriticalMisconceptions(structuredClone(course), prepared, '0.6.0');
  assert.equal(applied.hypotheses.filter(h => h.critical).length, prepared.critical.length);
  const unknown = structuredClone(prepared); unknown.critical.push('mis-unknown');
  assert.throws(() => applyCriticalMisconceptions(structuredClone(course), unknown, '0.6.0'), /Unknown misconception/);
  const unexposed = structuredClone(course); for (const a of unexposed.assessments) if (a.type === 'choice') for (const o of a.options) if (o.misconceptionId === prepared.critical[0]) delete o.misconceptionId;
  assert.throws(() => applyCriticalMisconceptions(unexposed, prepared, '0.6.0'), /No gate item exposes/);
});
