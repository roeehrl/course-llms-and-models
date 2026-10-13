import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,readFile,writeFile,unlink,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {packageWorkedCourse,verifyWorkedPackage} from '../scripts/package-worked-course.mjs';

test('deployment rejects altered bytes, replaced private files and unrecognized members; packages are immutable',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-worked-package-')),directory=path.join(temporary,'release');
  try {
    const manifest=await packageWorkedCourse(directory,{sourceCommit:'1'.repeat(40)});assert.equal(manifest.courseVersion,'0.1.5');assert.equal(manifest.members.length,9);
    await assert.rejects(packageWorkedCourse(directory,{sourceCommit:'1'.repeat(40)}),{code:'EEXIST'});
    const target=path.join(directory,'course.learner.json'),original=await readFile(target);
    await writeFile(target,Buffer.concat([original,Buffer.from(' ')]));await assert.rejects(verifyWorkedPackage(directory),/integrity/);
    await writeFile(target,original);assert.equal((await verifyWorkedPackage(directory)).courseDigest,manifest.courseDigest);
    const external=path.join(temporary,'external.json');await writeFile(external,original,{mode:0o600});await unlink(target);await symlink(external,target);await assert.rejects(verifyWorkedPackage(directory));await unlink(target);await writeFile(target,original,{mode:0o600});
    manifest.members[0].name='../external.json';await writeFile(path.join(directory,'package.json'),JSON.stringify(manifest));await assert.rejects(verifyWorkedPackage(directory),/members/);
  }finally {await rm(temporary,{recursive:true,force:true});}
});
