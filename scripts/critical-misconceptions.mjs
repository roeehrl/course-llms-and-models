import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** PREPARED FOR SDK 0.6.0; NOT WIRED INTO THE BUILD. Marks the listed misconception
 * hypotheses critical. Under SDK 0.5.0 a versioned gate's no_critical_misconception
 * criterion is reported met without evidence (fixed in SDK 0.6.0), so this refuses to
 * run on an older SDK. See content/sdk-0.6/critical-misconceptions.json. */
export const installedSdkVersion = () => JSON.parse(readFileSync(new URL('../node_modules/@course-core/sdk/package.json', import.meta.url), 'utf8')).version;
const atLeast = (version, minimum) => {
  const a = version.split('.').map(Number), b = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};
export function applyCriticalMisconceptions(course, overlay, sdkVersion = installedSdkVersion()) {
  assert(overlay?.schemaVersion === 1 && overlay.id === 'critical-misconceptions' && Array.isArray(overlay.critical), 'Invalid critical-misconception overlay');
  assert(atLeast(sdkVersion, overlay.requiresSdk), `Critical misconceptions need SDK ${overlay.requiresSdk} or later (installed ${sdkVersion})`);
  const gated = new Set(course.gates.flatMap(g => g.assessmentIds));
  for (const id of overlay.critical) {
    const hypothesis = (course.hypotheses ?? []).find(h => h.id === id);
    assert(hypothesis?.kind === 'misconception', `Unknown misconception ${id}`);
    // A versioned gate over a critical misconception must contain an item that can expose it.
    assert(course.assessments.some(a => gated.has(a.id) && (a.misconceptionIds?.includes(id) || (a.type === 'choice' && a.options.some(o => o.misconceptionId === id)))), `No gate item exposes ${id}`);
    hypothesis.critical = true;
  }
  return course;
}
