import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,readFile,readdir,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {canonicalJson,compileCourse} from '@course-core/sdk/compiler';
import {packageWorkedCourse} from '../scripts/package-worked-course.mjs';
import {packCorePackage,packCoreArchive,memberRole,DESCRIPTOR} from '../scripts/pack-core-package.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Reads a course package with Course Core's course-package v1 rules (services/api/src/ustar.ts
 * and course-package.ts): only ustar regular-file headers with a valid checksum, no prefix,
 * top-level names from [A-Za-z0-9._-] of at most 100 bytes, no duplicates, and a clean end. */
function readCorePackage(compressed){
  assert(compressed[0]===0x1f&&compressed[1]===0x8b,'PACKAGE_NOT_GZIP');
  const tar=gunzipSync(compressed),members=new Map();
  assert.equal(tar.length%512,0);
  for(let offset=0;;){
    const h=tar.subarray(offset,offset+512);
    if(h.every(b=>b===0)){assert(tar.subarray(offset).every(b=>b===0)&&tar.length-offset>=1024,'end of archive');break;}
    let sum=0;for(let i=0;i<512;i++)sum+=i>=148&&i<156?32:h[i];
    const field=(o,l)=>{const f=h.subarray(o,o+l),end=f.indexOf(0);return f.subarray(0,end===-1?l:end).toString('latin1');};
    assert.equal(Number.parseInt(field(148,8).trim(),8),sum,'header checksum');
    assert.equal(h.subarray(257,265).toString('latin1'),'ustar\u000000','POSIX ustar header');
    assert(['0','\0'].includes(String.fromCharCode(h[156])),`PACKAGE_UNSUPPORTED_ENTRY: type ${String.fromCharCode(h[156])}`);
    assert.equal(field(345,155),'','PACKAGE_UNSAFE_PATH: name prefix');
    const name=field(0,100),size=Number.parseInt(field(124,12),8);
    assert(/^[A-Za-z0-9._-]{1,100}$/.test(name)&&name!=='.'&&name!=='..',`PACKAGE_INVALID_MEMBER_NAME ${name}`);
    assert(!members.has(name),`PACKAGE_DUPLICATE_MEMBER ${name}`);
    members.set(name,Buffer.from(tar.subarray(offset+512,offset+512+size)));
    offset+=512+Math.ceil(size/512)*512;
  }
  return members;
}

test('two builds give the same bytes, and Core\'s verifier rules accept them',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-core-package-'));
  try{
    const [a,b]=[path.join(temporary,'a'),path.join(temporary,'b')];
    const receipt=await packageWorkedCourse(a,{sourceCommit:head});await packageWorkedCourse(b,{sourceCommit:head});
    const [x,y]=[await packCorePackage(a),await packCorePackage(b)];
    assert(x.archive.equals(y.archive)&&x.sha256===y.sha256,'Core packages differ between builds');
    assert.equal(x.name,`${receipt.courseId}-${receipt.courseVersion}.course.tgz`);
    // gzip header: deflate, no flags, no time, maximum compression, OS unknown.
    assert.deepEqual([...x.archive.subarray(0,10)],[0x1f,0x8b,0x08,0x00,0,0,0,0,0x02,0xff]);

    const members=readCorePackage(x.archive),listing=JSON.parse(members.get(DESCRIPTOR));
    assert.deepEqual(Object.keys(listing),['format','formatVersion','courseId','courseVersion','courseDigest','sdkVersion','minimumCoreVersion','source','members']);
    assert.deepEqual({format:listing.format,formatVersion:listing.formatVersion,courseId:listing.courseId,courseVersion:listing.courseVersion,courseDigest:listing.courseDigest,sdkVersion:listing.sdkVersion,minimumCoreVersion:listing.minimumCoreVersion},
      {format:'course-package',formatVersion:1,courseId:receipt.courseId,courseVersion:receipt.courseVersion,courseDigest:receipt.courseDigest,sdkVersion:receipt.sdkVersion,minimumCoreVersion:receipt.minimumCoreVersion});
    assert.deepEqual(listing.source,{repository:'https://github.com/roeehrl/course-llms-and-models',commit:head});
    // Every other member listed exactly once with its bytes, digest and a known role; the
    // whole verified package directory travels, so nothing the pilot installer reads is lost.
    assert.deepEqual([...members.keys()].filter(n=>n!==DESCRIPTOR).sort(),['package.json',...receipt.members.map(m=>m.name)].sort());
    assert.deepEqual(listing.members.map(m=>m.name),[...listing.members.map(m=>m.name)].sort());
    for(const member of listing.members){
      assert.deepEqual(Object.keys(member),['name','bytes','sha256','role']);
      const bytes=members.get(member.name);
      assert(bytes&&bytes.length===member.bytes&&hash(bytes)===member.sha256,`${member.name} listing`);
      assert(['course-manifest','learner-projection','adaptation-registry','host-requirement','licence','other'].includes(member.role));
      assert((await readFile(path.join(a,member.name))).equals(bytes),`${member.name} is the verified package member`);
    }
    const byRole=role=>listing.members.filter(m=>m.role===role).map(m=>m.name);
    assert.deepEqual(byRole('course-manifest'),['course.manifest.json']);
    assert.deepEqual(byRole('learner-projection'),['course.learner.json']);
    assert.deepEqual(byRole('adaptation-registry'),['adaptation-registry.json']);
    // Core recompiles the manifest with its own SDK and requires the listed identity and digest.
    const manifest=JSON.parse(members.get('course.manifest.json'));
    assert(!['formatVersion','server','learner','digest'].some(key=>key in manifest),'a compiled wrapper is refused');
    const compiled=compileCourse(manifest);
    assert(compiled.server.id===listing.courseId&&compiled.server.version===listing.courseVersion&&compiled.digest===listing.courseDigest);
    assert.equal(canonicalJson(JSON.parse(members.get('course.learner.json'))),canonicalJson(compiled.learner));
    // Host requirements are the files the operator configures: the five code-fixture registries and
    // the teaching verifier. Each registry is pinned by the course's own extension declaration,
    // so Core can offer it as a course-supplied file (at most 1 MiB) instead.
    const practicals=JSON.parse(members.get('practical-registries.json')).registries;
    assert.deepEqual(byRole('host-requirement').sort(),[...practicals.map(r=>path.basename(r.file)),'worked-example-verifier.json'].sort());
    for(const registry of practicals){
      const declaration=manifest.extensions.find(e=>e.id===registry.id),bytes=members.get(path.basename(registry.file));
      assert(declaration&&declaration.execution==='server'&&declaration.integrity===`sha256-${hash(bytes)}`&&bytes.length<=1024*1024,`${registry.id} is course-supplied`);
    }
    assert.equal(manifest.extensions.find(e=>e.id==='llm-worked-example-verifier').integrity,`sha256-${hash(members.get('worked-example-verifier.json'))}`);
  }finally{await rm(temporary,{recursive:true,force:true});}
});

test('the release command writes both formats and the one asset Core picks from a GitHub release',async()=>{
  const temporary=await mkdtemp(path.join(tmpdir(),'course-core-package-'));
  try{
    const pkg=path.join(temporary,'pkg'),out=path.join(temporary,'out');await mkdir(out);
    const receipt=await packageWorkedCourse(pkg,{sourceCommit:head}),version=receipt.courseVersion;
    const printed=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/pack-course-release.mjs'),'--package',pkg,'--output',path.join(out,`course-v${version}.tgz`)],{encoding:'utf8'}));
    const name=`${receipt.courseId}-${version}.course.tgz`;
    assert.deepEqual((await readdir(out)).sort(),[`course-v${version}.sha256`,`course-v${version}.tgz`,name,`${name}.sha256`].sort());
    // Core picks the release asset whose name ends in .course.tgz (exactly one: no choice needed)
    // and verifies <asset>.sha256: one sha256sum line naming the package.
    assert.deepEqual((await readdir(out)).filter(n=>n.endsWith('.course.tgz')),[name]);
    const archive=await readFile(path.join(out,name));
    assert.equal(await readFile(path.join(out,`${name}.sha256`),'utf8'),`${hash(archive)}  ${name}\n`);
    assert.deepEqual(printed.corePackage,{file:name,bytes:archive.length,sha256:hash(archive)});
    // The extracting archive is unchanged: one top-level course-v<version>/ directory.
    const listing=execFileSync('tar',['-tzf',path.join(out,`course-v${version}.tgz`)],{encoding:'utf8'}).trim().split('\n');
    assert.equal(listing[0],`course-v${version}/`);
    // ...which is why Core refuses it as an install package (a directory record).
    const extracting=await readFile(path.join(out,`course-v${version}.tgz`));
    assert.throws(()=>readCorePackage(extracting),/PACKAGE_UNSUPPORTED_ENTRY/);
    // System tar extracts the Core package to flat files only.
    const flat=execFileSync('tar',['-tzf',path.join(out,name)],{encoding:'utf8'}).trim().split('\n');
    assert(flat.every(n=>!n.includes('/')),'no folder in the Core package');
  }finally{await rm(temporary,{recursive:true,force:true});}
});

test('the Core-format writer refuses names Core refuses and orders members by name',()=>{
  const identity={courseId:'llms-and-models',courseVersion:'0.0.1',courseDigest:'a'.repeat(64),sdkVersion:'0.5.0',minimumCoreVersion:'0.1.48',commit:'b'.repeat(40)};
  for(const bad of ['dir/x.json','../x.json','x y.json','a'.repeat(101)])
    assert.throws(()=>packCoreArchive(identity,new Map([[bad,Buffer.from('{}')]])),/Unsupported member name/);
  assert.throws(()=>packCoreArchive(identity,new Map([[DESCRIPTOR,Buffer.from('{}')]])),/Unexpected package members/);
  assert.throws(()=>packCoreArchive({...identity,commit:'HEAD'},new Map([['a.json',Buffer.from('{}')]])),/Invalid package identity/);
  const {archive,listing}=packCoreArchive(identity,new Map([['b.json',Buffer.from('2')],['a.json',Buffer.from('1')]]));
  assert.deepEqual([...readCorePackage(archive).keys()],['a.json','b.json',DESCRIPTOR].sort());
  assert.deepEqual(listing.members.map(m=>[m.name,m.role]),[['a.json','other'],['b.json','other']]);
  assert.equal(memberRole('code-fixtures-labs-a.json'),'host-requirement');
  assert.equal(memberRole('worked-example-verifier.json'),'host-requirement');
  assert.equal(memberRole('course.compiled.json'),'other');
});
