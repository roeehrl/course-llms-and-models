import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {stageWorkedExamples,ROOT} from '../scripts/stage-worked-examples.mjs';

test('staged worked examples use released SDK contracts and preserve the complete course and evidence requirements',async()=>{
  const staged=await stageWorkedExamples();
  assert.equal(staged.entries.length,39);assert.equal(staged.profiles.length,39);
  assert.equal(staged.proposedRegistry.profiles.length,154);
  assert.equal(staged.compiled.server.chapters.length,14);
  assert.equal(staged.compiled.server.chapters.flatMap(c=>c.episodes).length,56);
  assert.equal(staged.compiled.server.version,'0.1.5');
  assert.equal(staged.minimumCoreVersion,'0.1.17');assert.equal(staged.publishedAuthority,false);
  assert(staged.profiles.every(p=>p.classification==='optional'&&p.plannedMinutes===3&&p.additionalEpisodes===0&&p.generationBrief.length<=3000));
  assert(!('adaptation' in staged.compiled.learner));
  const learner=JSON.stringify(staged.compiled.learner);assert(!learner.includes('def solve(payload)'));assert(!learner.includes('referenceData'));assert(!learner.includes('expectedChecks'));
  const repeated=await stageWorkedExamples();assert.deepEqual(repeated.bytes,staged.bytes);assert.equal(repeated.compiled.digest,staged.compiled.digest);
});
test('independent procedural CPU checks accept legitimate variants and reject wrong arithmetic, scope and unsupported claims',()=>{
  const result=spawnSync('python3',['-B','verification/worked-examples.py'],{cwd:ROOT,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);assert.equal(report.templates,39);assert.equal(report.checks,1654);
  assert.equal(report.sdkProducer,'released-0.4.0');assert.equal(report.runtimeBrokerQualified,false);
  assert.equal(report.arbitraryProseVerified,false);assert.equal(report.publishedAuthority,false);assert.equal(report.earnedCredit,false);
});
