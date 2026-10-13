import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {stageWorkedExamples,ROOT} from '../scripts/stage-worked-examples.mjs';
import {verifyReleasedRuntime} from './released-runtime.mjs';

// Deliberately use an independently verified published runtime, not a sibling
// development checkout or the pending creator-guidance/installation interfaces.
const runtime=fileURLToPath(new URL('.local/released-core-v0.1.10/course-core/',ROOT));
const artifacts=fileURLToPath(new URL('.local/released-core-artifacts/v0.1.10/',ROOT));
const delivery=await verifyReleasedRuntime(runtime,artifacts);
const {DockerSandbox,QUALIFIED_IMAGES}=await import(pathToFileURL(path.join(runtime,'packages/sandbox/dist/index.js')).href);
const image=QUALIFIED_IMAGES[process.arch];assert(image,'Prepared architecture-pinned sandbox required');
const staged=await stageWorkedExamples();
const folder=fileURLToPath(new URL('.local/generated-teaching/',ROOT));await mkdir(folder,{recursive:true,mode:0o700});
const storage=await mkdtemp(path.join(folder,'broker-'));
const sandbox=new DockerSandbox({image,storageDirectory:storage});
let checked=0,batches=0,durationMs=0,outputBytes=0;
try {
  assert((await sandbox.readiness()).ready,'Existing prepared isolated runtime required; do not pull or alter it');
  const inputs=[...staged.definition.qualification.map(q=>({id:q.id,artifact:q.artifact,expected:q.expectedChecks}))];
  for(const entry of staged.entries)for(const seed of [0,-1])for(const wrong of [false,true])inputs.push({id:'topic-'+entry.key+'-'+(seed<0?'maximum':'initial')+'-'+(wrong?'wrong':'correct'),artifact:await staged.make(entry,seed,wrong),expected:{'worked-example-reference':!wrong}});
  for(let start=0;start<inputs.length;start+=24){
    const cases=inputs.slice(start,start+24).map(q=>({id:q.id,input:{artifact:q.artifact,referenceData:staged.definition.referenceData,requiredCheckIds:staged.definition.checkIds,baseCourseDigest:'a'.repeat(64),proposalDigest:'b'.repeat(64)},expected:q.expected}));
    const report=await sandbox.grade({source:staged.definition.source,cases});
    assert.equal(report.status,'graded','Real isolated verification must complete and clean up');assert(report.passed,'Real isolated program disagrees with positive/negative reference cases');
    assert.equal(report.sourceDigest,createHash('sha256').update(staged.definition.source).digest('hex'));assert.equal(report.runtime.image,image);
    checked+=cases.length;batches++;durationMs+=report.durationMs;outputBytes+=report.outputBytes;
  }
  assert.equal(checked,172);
  const receipt={verified:true,verificationScope:'actual_published_isolated_broker_program_only_no_course_application',delivery,definitionDigest:staged.digest,programSourceDigest:createHash('sha256').update(staged.definition.source).digest('hex'),runtime:{image,memoryMiB:128,cpuLimit:0.5,timeoutMs:5000,maxOutputBytes:65536},topics:39,cases:checked,batches,durationMs,outputBytes,earnedCredit:false,registryApproved:false,liveProviderVerified:false,courseReleaseUnchanged:true};
  await writeFile(path.join(folder,'broker-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(receipt));
} finally {await rm(storage,{recursive:true,force:true});}
