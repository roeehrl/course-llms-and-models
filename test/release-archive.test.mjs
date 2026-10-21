import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,readFile,readdir,stat,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {packageWorkedCourse,verifyWorkedPackage} from '../scripts/package-worked-course.mjs';
import {packCourseRelease,packArchive} from '../scripts/pack-course-release.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();

test('two independent package builds from one commit give identical members and an identical release archive',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-release-archive-'));
  try{
    const [a,b]=[path.join(temporary,'a'),path.join(temporary,'b')];
    const first=await packageWorkedCourse(a,{sourceCommit:head}),second=await packageWorkedCourse(b,{sourceCommit:head});
    assert.deepEqual(second,first,'package manifests differ between builds');
    for(const name of ['package.json',...first.members.map(m=>m.name)])assert((await readFile(path.join(a,name))).equals(await readFile(path.join(b,name))),`${name} differs between builds`);
    const [x,y]=[await packCourseRelease(a),await packCourseRelease(b)];
    assert(x.archive.equals(y.archive)&&x.sha256===y.sha256,'release archives differ');
    assert.equal(x.archive.readUInt32LE(4),0,'gzip header carries a time');
    // The archive extracts with the system tar to one directory that verifies as the package.
    const out=path.join(temporary,'out');await mkdir(out);
    execFileSync('tar',['-xzf','-','-C',out],{input:x.archive});
    const top=path.join(out,`course-v${first.courseVersion}`);
    assert.deepEqual((await readdir(out)),[`course-v${first.courseVersion}`]);
    assert.equal((await stat(top)).mode&0o777,0o700);
    assert.equal((await verifyWorkedPackage(top)).courseDigest,first.courseDigest);
    const listing=execFileSync('tar',['-tvzf','-'],{input:x.archive,encoding:'utf8'}).trim().split('\n');
    assert.equal(listing.length,first.members.length+2);
    assert(listing.slice(1).every(line=>line.startsWith('-rw-------')),'members must be owner-only');
  }finally{await rm(temporary,{recursive:true,force:true});}
});

test('the archive writer refuses unsafe names and an unset time, and orders members by name',()=>{
  const files=new Map([['b.json',Buffer.from('2')],['a.json',Buffer.from('1')]]);
  assert.throws(()=>packArchive('course-v0.1.7',new Map([['../x',Buffer.from('')]]),1));
  assert.throws(()=>packArchive('course-v0.1.7',files,0));
  assert.throws(()=>packArchive('other',files,1));
  const listing=execFileSync('tar',['-tzf','-'],{input:packArchive('course-v0.1.7',files,1700000000),encoding:'utf8'}).trim().split('\n');
  assert.deepEqual(listing,['course-v0.1.7/','course-v0.1.7/a.json','course-v0.1.7/b.json']);
});
