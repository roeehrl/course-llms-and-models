import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {digestJson,impactLines,nextTransition} from '../scripts/install-pilot-course.mjs';

test('the installer continues a release from its review state and stops at published', () => {
  assert.equal(nextTransition('draft'), 'submit-review');
  assert.equal(nextTransition('pending_review'), 'approve');
  assert.equal(nextTransition('approved'), 'publish');
  assert.equal(nextTransition('published'), null);
  assert.throws(() => nextTransition('archived'), /continues only from/);
});

test('the publish impact is printed with who stays, who is part-way and what changes', () => {
  const impact = {
    from: {id: 'r1', version: '0.1.7', digest: 'a'.repeat(64)}, to: {id: 'r2', version: '0.1.8', digest: 'b'.repeat(64)},
    contentChanges: 3, kinds: {episodes: {added: 0, removed: 0, changed: 1}, assessments: {added: 0, removed: 0, changed: 0}},
    changedOrRemovedEpisodes: ['fnd-e01-01'], changedOrRemovedItems: [], learnersPinnedToActive: 4, learnersMidwayInChangedLessons: 1,
    enrollmentsLast30Days: 6, defectiveItemsFixed: [], defectiveItemsCarriedOver: Array.from({length: 10}, (_, i) => `item-${i}`),
    newLearnersGet: '0.1.8', existingLearnersMove: false,
  };
  const text = impactLines({impact, impactDigest: 'c'.repeat(64), confirmationRequired: true}).join('\n');
  assert.match(text, /Publishing 0\.1\.8 \(digest bbbbbbbbbbbb\) after the live release 0\.1\.7/);
  assert.match(text, /not moved: they stay on their release/);
  assert.match(text, /Learners on the live release: 4; part-way through a changed lesson: 1/);
  assert.match(text, /episodes \+0\/-0\/~1/);
  assert.doesNotMatch(text, /assessments \+0/);
  assert.match(text, /Changed or removed lessons: 1 \(fnd-e01-01\)/);
  assert.match(text, /carried over: 10 \(item-0, .*item-7, \+2 more\)/);
  assert.match(text, /Core requires a confirmation/);
  const first = impactLines({impact: {...impact, from: null, contentChanges: null, kinds: null, learnersPinnedToActive: 0}, confirmationRequired: false}).join('\n');
  assert.match(first, /with no live release/);
  assert.match(first, /does not require a confirmation for this publish; the installer always asks/);
});

test('the registry digest is Core\'s: SHA-256 of the canonical JSON, independent of key order', () => {
  assert.equal(digestJson({b: 1, a: [2, {d: 3, c: 4}]}), digestJson({a: [2, {c: 4, d: 3}], b: 1}));
  assert.equal(digestJson({a: 1}), createHash('sha256').update('{"a":1}').digest('hex'));
});
