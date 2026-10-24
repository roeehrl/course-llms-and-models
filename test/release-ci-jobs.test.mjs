import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {verifyReleasedRuntime,releaseCiNames} from '../verification/released-runtime.mjs';
// The CI record of a Core release: Core 0.1.54+ names its jobs "Full CI / <job>" (a reusable
// workflow) and earlier releases used bare names. Either is accepted, but only as exactly the 13
// required jobs, each once and successful. A manifest that passes the CI check fails later on
// its (here empty) asset list, so the error names which check refused it.
const sha=b=>createHash('sha256').update(b).digest('hex');
async function ciCheck(jobs){
 const dir=await mkdtemp(path.join(tmpdir(),'private-release-ci-test-'));try{
  const identity={version:'test',tag:'vtest',commit:'a'.repeat(40),tagObject:'b'.repeat(40),runId:7};
  const bytes=Buffer.from(JSON.stringify({identity:{repository:'roeehrl/course-core',...identity},ci:{headSha:identity.commit,runId:7,jobs:jobs.map((j,i)=>({id:i+1,conclusion:'success',...j}))},verificationScope:'source_ci_and_installed_package_only_no_live_provider_or_deployment',assets:[]}));
  await writeFile(path.join(dir,'release-manifest.json'),bytes);
  const error=await verifyReleasedRuntime(dir,dir,{...identity,manifestSha256:sha(bytes)}).then(()=>null,e=>e.message);return error;
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('release CI record: 13 jobs, bare or "Full CI / "-prefixed, each once and successful',async()=>{
 assert.equal(releaseCiNames.length,13);
 assert.equal(await ciCheck(releaseCiNames.map(name=>({name:'Full CI / '+name}))),'release_asset_missing');
 assert.equal(await ciCheck(releaseCiNames.map(name=>({name}))),'release_asset_missing');
 assert.equal(await ciCheck(releaseCiNames.slice(1).map(name=>({name:'Full CI / '+name}))),'release_ci_mismatch');
 assert.equal(await ciCheck([...releaseCiNames,'Extra job'].map(name=>({name:'Full CI / '+name}))),'release_ci_mismatch');
 assert.equal(await ciCheck(releaseCiNames.map((name,i)=>({name:'Full CI / '+name,...(i===3?{conclusion:'failure'}:{})}))),'release_ci_mismatch');
 assert.equal(await ciCheck(releaseCiNames.map((name,i)=>({name:i===0?'Full CI / Public source':'Full CI / '+name}))),'release_ci_mismatch');
});
