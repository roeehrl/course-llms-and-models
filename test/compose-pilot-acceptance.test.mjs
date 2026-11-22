import assert from 'node:assert/strict';
import test from 'node:test';
import {ACCEPTANCE_LEARNER,allowedWrite,checkInstalledRelease,checkReadiness,learnerAction,liveProvidersConfigured,parseArguments,redact,selectWorkspace,walkMode} from '../verification/compose-pilot-acceptance-rules.mjs';

const required = ['--origin', 'http://localhost:4310', '--package', 'course-v0.1.8.tgz', '--operator-login', 'owner'];

test('arguments: required flags, bare origins, no unknown or valueless flags', () => {
  const options = parseArguments(required);
  assert.equal(options.origin, 'http://localhost:4310');
  assert.equal(options.workspace, null);
  assert.equal(parseArguments([...required, '--workspace', 'team-a']).workspace, 'team-a');
  assert.throws(() => parseArguments([...required, '--workspace', 'Team A']), /workspace slug/);
  assert.equal(options.learnerLogin, ACCEPTANCE_LEARNER.loginName);
  assert.equal(options.allowProviderCalls, false);
  assert.equal(options.readOnly, false);
  assert.throws(() => parseArguments(required.slice(2)), /--origin is required/);
  assert.throws(() => parseArguments([...required, '--operator-password']), /Unknown argument/);
  assert.throws(() => parseArguments([...required, '--out']), /needs a value/);
  assert.throws(() => parseArguments([...required, '--out', '--read-only']), /needs a value/);
  assert.throws(() => parseArguments(['--origin', 'http://localhost:4310/admin/', ...required.slice(2)]), /bare http\(s\) origin/);
  assert.throws(() => parseArguments(['--origin', 'http://user:pw@localhost:4310', ...required.slice(2)]), /bare http\(s\) origin/);
  assert.throws(() => parseArguments([...required, '--read-only', '--allow-provider-calls']), /contradict/);
  assert.throws(() => parseArguments([...required, '--learner-login', 'A B']), /login name/);
  assert.equal(parseArguments(['--help']).help, true);
});

test('workspace: explicit slug must be managed; otherwise exactly one owner/admin workspace', () => {
  const a = {id: 'w1', slug: 'team-a', title: 'A', role: 'owner'};
  const b = {id: 'w2', slug: 'team-b', title: 'B', role: 'admin'};
  const c = {id: 'w3', slug: 'team-c', title: 'C', role: 'learner'};
  assert.deepEqual(selectWorkspace([a, c], null), {ok: true, workspace: a, discovered: true});
  assert.deepEqual(selectWorkspace([c, b], undefined), {ok: true, workspace: b, discovered: true});
  const several = selectWorkspace([b, c, a], null);
  assert.equal(several.ok, false);
  assert.match(several.problem, /2 workspaces \(team-a, team-b\); pass --workspace <slug>/);
  assert.doesNotMatch(several.problem, /team-c/);
  assert.match(selectWorkspace([c], null).problem, /not an owner or admin of any workspace/);
  assert.equal(selectWorkspace(null, null).ok, false);
  assert.deepEqual(selectWorkspace([a, b, c], 'team-b'), {ok: true, workspace: b, discovered: false});
  assert.equal(selectWorkspace([a, b, c], 'team-c').problem, 'The operator is not an owner or admin of workspace team-c');
  assert.equal(selectWorkspace([a], 'llms-and-models').ok, false);
});

test('provider calls: any connection or configured role counts as live; unknown shapes count as live', () => {
  const absent = id => ({id, configuration: 'absent', runtimeStatus: 'configuration_missing'});
  const roles = ['supervisor', 'companion', 'research', 'media', 'reviewer'].map(absent);
  assert.equal(liveProvidersConfigured({connections: [], providers: roles}), false);
  assert.equal(liveProvidersConfigured({connections: [{id: 'x'}], providers: roles}), true);
  assert.equal(liveProvidersConfigured({connections: [], providers: [...roles.slice(1), {id: 'supervisor', configuration: 'configured', runtimeStatus: 'ready'}]}), true);
  assert.equal(liveProvidersConfigured({connections: [], providers: [{id: 'supervisor', configuration: 'absent', runtimeStatus: 'ready'}]}), true);
  assert.equal(liveProvidersConfigured({connections: undefined, providers: roles}), true);
  assert.equal(liveProvidersConfigured({connections: [], providers: null}), true);
});

test('walk mode: read-only with live providers unless explicitly allowed; --read-only always wins', () => {
  assert.deepEqual(walkMode({live: false, allowProviderCalls: false, readOnly: false}), {mode: 'full', reason: 'no_live_provider_configured'});
  assert.deepEqual(walkMode({live: true, allowProviderCalls: false, readOnly: false}), {mode: 'read-only', reason: 'live_provider_configured'});
  assert.deepEqual(walkMode({live: true, allowProviderCalls: true, readOnly: false}), {mode: 'full', reason: 'provider_calls_allowed_by_flag'});
  assert.deepEqual(walkMode({live: false, allowProviderCalls: false, readOnly: true}), {mode: 'read-only', reason: 'requested'});
});

test('browser writes: reads always; read-only sends only sign-in and sign-out; no provider routes ever', () => {
  const id = '90124f18-3b35-41f3-8e90-8473526cc4c0';
  for (const mode of ['full', 'read-only']) {
    assert.equal(allowedWrite('GET', `/api/enrollments/${id}`, mode), true);
    assert.equal(allowedWrite('POST', '/auth/login', mode), true);
    assert.equal(allowedWrite('POST', '/auth/logout', mode), true);
    for (const route of ['companion/messages', 'review-assist', 'research/r1/cancel', 'adaptation/fresh-question', 'reviews/a1/appeal'])
      assert.equal(allowedWrite('POST', `/api/enrollments/${id}/${route}`, mode), false, route);
    assert.equal(allowedWrite('POST', `/api/admin/enrollments/${id}/media-jobs`, mode), false);
    assert.equal(allowedWrite('DELETE', `/api/enrollments/${id}`, mode), false);
    assert.equal(allowedWrite('PUT', '/auth/login', mode), false);
  }
  for (const route of ['read', 'challenges', 'answers', 'complete', 'presence', 'platform-capabilities']) {
    assert.equal(allowedWrite('POST', `/api/enrollments/${id}/${route}`, 'full'), true, route);
    assert.equal(allowedWrite('POST', `/api/enrollments/${id}/${route}`, 'read-only'), false, route);
  }
  assert.equal(allowedWrite('POST', '/api/enrollments', 'full'), true);
  assert.equal(allowedWrite('POST', '/api/enrollments', 'read-only'), false);
  assert.equal(allowedWrite('POST', '/api/enrollments/not-a-uuid/read', 'full'), false);
});

const manifest = {courseId: 'llms-and-models', courseVersion: '0.1.8', courseDigest: 'a'.repeat(64)};
const selected = [{id: 'r1', course_key: 'llms-and-models', version: '0.1.8', digest: 'a'.repeat(64), status: 'published'}];
const adminReleases = [{id: 'r1', version: '0.1.8', state: 'published', availableForNewLearners: true}];

test('installed course: the selected release must be the package, published and offered to new learners', () => {
  assert.deepEqual(checkInstalledRelease({selected, adminReleases, manifest}), {ok: true, problems: [], releaseId: 'r1', version: '0.1.8', digest: 'a'.repeat(64)});
  assert.match(checkInstalledRelease({selected: [{...selected[0], digest: 'b'.repeat(64)}], adminReleases, manifest}).problems.join(), /digest differs/);
  assert.match(checkInstalledRelease({selected: [{...selected[0], version: '0.1.7'}], adminReleases, manifest}).problems.join(), /0\.1\.7 is not the package's 0\.1\.8/);
  assert.match(checkInstalledRelease({selected: [], adminReleases, manifest}).problems.join(), /found 0/);
  assert.match(checkInstalledRelease({selected: [{...selected[0], course_key: 'other'}], adminReleases, manifest}).problems.join(), /found 0/);
  assert.match(checkInstalledRelease({selected, adminReleases: [{...adminReleases[0], availableForNewLearners: false}], manifest}).problems.join(), /selected for new learners/);
  assert.match(checkInstalledRelease({selected, adminReleases: [], manifest}).problems.join(), /missing from the administration/);
});

test('readiness: expected Core, current migrations, working database, Temporal and sandbox', () => {
  const readiness = {overall: 'no_data', checks: [
    {id: 'database', status: 'ok', facts: {migrationsApplied: 112, migrationsCurrent: true, latestMigration: '131_x.sql'}},
    {id: 'temporal', status: 'ok', facts: {}}, {id: 'sandbox', status: 'ok', facts: {}},
    {id: 'version', status: 'ok', facts: {coreVersion: '0.1.67'}}, {id: 'backups', status: 'no_data', facts: {}}]};
  const ok = checkReadiness(readiness, '0.1.67');
  assert.equal(ok.ok, true);assert.equal(ok.migrations, 112);assert.equal(ok.backups, 'no_data');
  assert.match(checkReadiness(readiness, '0.1.68').problems.join(), /0\.1\.67 is not 0\.1\.68/);
  const stale = structuredClone(readiness);stale.checks[0].facts.migrationsCurrent = false;
  assert.match(checkReadiness(stale, '0.1.67').problems.join(), /migrations are not current/);
  const down = structuredClone(readiness);down.checks[2].status = 'failing';
  assert.match(checkReadiness(down, '0.1.67').problems.join(), /sandbox check is failing/);
  assert.equal(checkReadiness({checks: []}, '0.1.67').ok, false);
});

test('acceptance learner: invited once, then reset; never another person or the operator', () => {
  const login = ACCEPTANCE_LEARNER.loginName;
  assert.deepEqual(learnerAction([{loginName: 'owner', role: 'owner'}], login), {action: 'invite'});
  assert.deepEqual(learnerAction([{loginName: login, role: 'learner', canSetPassword: true, userId: 'u1'}], login), {action: 'reset', userId: 'u1'});
  assert.equal(learnerAction([{loginName: login, role: 'admin', canSetPassword: true}], login).action, 'refuse');
  assert.equal(learnerAction([{loginName: login, role: 'learner', canSetPassword: false}], login).action, 'refuse');
  assert.equal(learnerAction([{loginName: login, role: 'learner', canSetPassword: true, self: true}], login).action, 'refuse');
});

test('receipts never carry credentials', () => {
  const value = redact({learner: {login: 'acceptance-learner', password: {temporaryPassword: 'x'}}, csrfToken: 'y', cookie: 'z', list: [{sessionToken: 't', ok: 1}], code: 'c', walk: {mode: 'full'}});
  assert.deepEqual(value, {learner: {login: 'acceptance-learner', password: '[redacted]'}, csrfToken: '[redacted]', cookie: '[redacted]', list: [{sessionToken: '[redacted]', ok: 1}], code: '[redacted]', walk: {mode: 'full'}});
  assert.doesNotMatch(JSON.stringify(value), /"x"|"y"|"z"|"t"|"c"/);
});
