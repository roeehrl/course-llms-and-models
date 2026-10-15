import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,readFile,writeFile,unlink,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyCompiledCourse} from '@course-core/sdk/compiler';
import {packageWorkedCourse,verifyWorkedPackage} from '../scripts/package-worked-course.mjs';
import {stageWorkedExamples} from '../scripts/stage-worked-examples.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('deployment rejects altered bytes, replaced private files and unrecognized members; packages are immutable',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-worked-package-')),directory=path.join(temporary,'release');
  try {
    const manifest=await packageWorkedCourse(directory,{sourceCommit:'1'.repeat(40)});assert.equal(manifest.courseVersion,'0.1.6');assert.equal(manifest.sdkVersion,'0.4.0');assert.equal(manifest.minimumCoreVersion,'0.1.34');assert.equal(manifest.members.length,9);
    await assert.rejects(packageWorkedCourse(directory,{sourceCommit:'1'.repeat(40)}),{code:'EEXIST'});
    const target=path.join(directory,'course.learner.json'),original=await readFile(target);
    await writeFile(target,Buffer.concat([original,Buffer.from(' ')]));await assert.rejects(verifyWorkedPackage(directory),/integrity/);
    await writeFile(target,original);assert.equal((await verifyWorkedPackage(directory)).courseDigest,manifest.courseDigest);
    const external=path.join(temporary,'external.json');await writeFile(external,original,{mode:0o600});await unlink(target);await symlink(external,target);await assert.rejects(verifyWorkedPackage(directory));await unlink(target);await writeFile(target,original,{mode:0o600});
    manifest.members[0].name='../external.json';await writeFile(path.join(directory,'package.json'),JSON.stringify(manifest));await assert.rejects(verifyWorkedPackage(directory),/members/);
  }finally {await rm(temporary,{recursive:true,force:true});}
});

/** Rewrites one member and its package.json entry, so only the semantic checks can object. */
async function replaceMember(directory,name,bytes){
  const file=path.join(directory,'package.json'),manifest=JSON.parse(await readFile(file,'utf8')),member=manifest.members.find(m=>m.name===name);
  member.bytes=bytes.length;member.sha256=sha(bytes);
  await writeFile(path.join(directory,name),bytes,{mode:0o600});await writeFile(file,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
}
test('the compiled course references its manifest and learner halves once, within the per-file limit, and resolves to the same course',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-worked-reference-')),directory=path.join(temporary,'release');
  try {
    const staged=await stageWorkedExamples(),manifest=await packageWorkedCourse(directory,{sourceCommit:'1'.repeat(40)});
    assert.equal(manifest.courseDigest,staged.compiled.digest);
    for(const member of manifest.members)assert(member.bytes<=4*1024*1024,`${member.name} exceeds the per-file limit`);
    const bytes=name=>readFile(path.join(directory,name)),reference=JSON.parse(await bytes('course.compiled.json'));
    const [server,learner]=await Promise.all(['course.manifest.json','course.learner.json'].map(bytes));
    assert.deepEqual(reference,{formatVersion:1,digest:staged.compiled.digest,server:{member:'course.manifest.json',sha256:sha(server)},learner:{member:'course.learner.json',sha256:sha(learner)}});
    // Each illustration is stored once per member: the manifest and learner halves only.
    for(const visual of staged.compiled.server.visuals){
      const scene=JSON.stringify(visual.scene);
      for(const member of manifest.members){const text=(await bytes(member.name)).toString('utf8');assert(text.indexOf(scene)===text.lastIndexOf(scene),`${visual.id} is embedded twice in ${member.name}`);}
    }
    const resolved={formatVersion:1,digest:reference.digest,server:JSON.parse(server),learner:JSON.parse(learner)};
    assert(verifyCompiledCourse(resolved));assert.deepEqual(resolved,staged.compiled);

    const original=await bytes('course.compiled.json'),write=value=>replaceMember(directory,'course.compiled.json',Buffer.from(JSON.stringify(value)+'\n'));
    await write({...reference,server:{...reference.server,sha256:'0'.repeat(64)}});await assert.rejects(verifyWorkedPackage(directory),/reference integrity/);
    await write({...reference,learner:{...reference.learner,member:'course.manifest.json',sha256:sha(server)}});await assert.rejects(verifyWorkedPackage(directory),/reference integrity/);
    await write({...reference,learner:{...reference.learner,member:'worked-example-verifier.json'}});await assert.rejects(verifyWorkedPackage(directory),/reference integrity/);
    await write({...reference,server:{...reference.server,extra:true}});await assert.rejects(verifyWorkedPackage(directory),/reference integrity/);
    await write({...reference,server:resolved.server,note:'x'});await assert.rejects(verifyWorkedPackage(directory),/Invalid compiled course reference/);
    await write({...reference,digest:'0'.repeat(64)});await assert.rejects(verifyWorkedPackage(directory),/Compiled course integrity/);
    // Packages that embed the compiled course whole remain verifiable, and are still checked.
    await write(resolved);assert.equal((await verifyWorkedPackage(directory)).courseDigest,manifest.courseDigest);
    await write({...resolved,learner:{...resolved.learner,title:'changed'}});await assert.rejects(verifyWorkedPackage(directory),/Compiled course integrity/);
    await replaceMember(directory,'course.compiled.json',original);assert.equal((await verifyWorkedPackage(directory)).courseDigest,manifest.courseDigest);
  }finally {await rm(temporary,{recursive:true,force:true});}
});
