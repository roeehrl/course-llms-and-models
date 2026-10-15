import assert from 'node:assert/strict';
import {constants} from 'node:fs';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {verifyCompiledCourse} from '@course-core/sdk/compiler';
import {stageWorkedExamples,ROOT} from './stage-worked-examples.mjs';
import {readFileSync} from 'node:fs';

/** The SDK the package was compiled with, read from the installed released package. */
export const SDK_VERSION=JSON.parse(readFileSync(new URL('node_modules/@course-core/sdk/package.json',ROOT),'utf8')).version;
/** Accepted package contracts: earlier packages stay verifiable after the upgrade. */
const CONTRACTS={'0.1.4':{sdkVersion:'0.2.0',minimumCoreVersion:'0.1.17'},'0.1.5':{sdkVersion:'0.2.0',minimumCoreVersion:'0.1.17'},'0.1.6':{sdkVersion:'0.4.0',minimumCoreVersion:'0.1.34',profiles:158,remedialEpisodes:4}};

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
// Course bundles hold deep expression trees; indentation would multiply their size.
const compact=value=>Buffer.from(JSON.stringify(value)+'\n');
export const packageNames=['course.compiled.json','course.manifest.json','course.learner.json','adaptation-registry.json','worked-example-verifier.json','practical-registries.json','code-fixtures-autodiff-qualified.json','code-fixtures-decoder-qualified.json','code-fixtures-qualification-qualified.json'];
/** The compiled course's two halves are already package members, and Core imports only
 * course.manifest.json and recompiles it. Embedding both halves again would store every
 * visual twice in one member, so course.compiled.json names them by digest instead. */
const REFERENCED={server:'course.manifest.json',learner:'course.learner.json'};
function compiledReference(compiled,members){
  return {formatVersion:compiled.formatVersion,digest:compiled.digest,...Object.fromEntries(Object.entries(REFERENCED).map(([part,member])=>[part,{member,sha256:hash(members.get(member))}]))};
}
/** Resolves a referenced compiled course to the SDK's CompiledCourse shape. Packages
 * made before the reference embed it whole; those are returned as is and verified alike. */
function resolveCompiled(value,members){
  if(!Object.values(REFERENCED).some(member=>value?.server?.member===member||value?.learner?.member===member))return value;
  assert.deepEqual(Object.keys(value).sort(),['digest','formatVersion','learner','server'],'Invalid compiled course reference');
  return {formatVersion:value.formatVersion,digest:value.digest,...Object.fromEntries(Object.entries(REFERENCED).map(([part,member])=>{
    const reference=value[part];
    assert(reference&&typeof reference==='object'&&Object.keys(reference).sort().join(',')==='member,sha256'&&reference.member===member&&members.has(member)&&hash(members.get(member))===reference.sha256,'Compiled course reference integrity failed');
    return [part,JSON.parse(members.get(member))];
  }))};
}
async function privateBytes(filename){
  const file=await open(filename,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {const stat=await file.stat();assert(stat.isFile()&&stat.nlink===1&&stat.uid===process.getuid()&&!(stat.mode&0o077)&&stat.size<=4*1024*1024,'Rejected private package member');return await file.readFile();}
  finally {await file.close();}
}
export async function packageWorkedCourse(directory,{sourceCommit}={}){
  assert(/^[a-f0-9]{40}$/.test(sourceCommit??''),'Immutable source commit required');
  const staged=await stageWorkedExamples(),registries=JSON.parse(await readFile(new URL('runtime/practical-registries.json',ROOT)));
  assert(verifyCompiledCourse(staged.compiled));
  const members=new Map([
    ['course.manifest.json',compact(staged.compiled.server)],['course.learner.json',compact(staged.compiled.learner)],
    ['adaptation-registry.json',json(staged.proposedRegistry)],['worked-example-verifier.json',staged.bytes],['practical-registries.json',json(registries)],
  ]);
  members.set('course.compiled.json',compact(compiledReference(staged.compiled,members)));
  for(const registry of registries.registries){const name=path.basename(registry.file);assert(packageNames.includes(name));const bytes=await readFile(new URL(registry.file,ROOT));assert(bytes.length===registry.bytes&&hash(bytes)===registry.sha256,'Practical implementation changed');members.set(name,bytes);}
  assert.deepEqual([...members.keys()].sort(),[...packageNames].sort());
  // Fresh directories only: a previously qualified package is never overwritten.
  await mkdir(directory,{mode:0o700});
  for(const [name,bytes] of members)await writeFile(path.join(directory,name),bytes,{mode:0o600,flag:'wx'});
  const manifest={schemaVersion:1,courseId:staged.compiled.server.id,courseVersion:staged.compiled.server.version,courseDigest:staged.compiled.digest,sourceCommit,minimumCoreVersion:staged.minimumCoreVersion,sdkVersion:SDK_VERSION,workedVerifierDigest:staged.digest,members:[...members].map(([name,bytes])=>({name,bytes:bytes.length,sha256:hash(bytes)})),liveProviderAcceptance:false};
  await writeFile(path.join(directory,'package.json'),json(manifest),{mode:0o600,flag:'wx'});
  return verifyWorkedPackage(directory);
}
export async function verifyWorkedPackage(directory){
  const manifest=JSON.parse(await privateBytes(path.join(directory,'package.json')));
  const contract=Object.hasOwn(CONTRACTS,manifest.courseVersion)?CONTRACTS[manifest.courseVersion]:undefined;
  assert(manifest.schemaVersion===1&&contract&&manifest.minimumCoreVersion===contract.minimumCoreVersion&&manifest.sdkVersion===contract.sdkVersion,'Unexpected package contract');
  assert(/^[a-f0-9]{40}$/.test(manifest.sourceCommit),'Invalid package source');
  assert.deepEqual(manifest.members.map(m=>m.name).sort(),[...packageNames].sort(),'Unexpected package members');
  const members=new Map();
  for(const member of manifest.members){const bytes=await privateBytes(path.join(directory,member.name));assert(bytes.length===member.bytes&&hash(bytes)===member.sha256,'Package member integrity failed');members.set(member.name,bytes);}
  const compiled=resolveCompiled(JSON.parse(members.get('course.compiled.json')),members);assert(verifyCompiledCourse(compiled)&&compiled.digest===manifest.courseDigest,'Compiled course integrity failed');
  assert.deepEqual(JSON.parse(members.get('course.manifest.json')),compiled.server);assert.deepEqual(JSON.parse(members.get('course.learner.json')),compiled.learner);
  assert(compiled.server.id===manifest.courseId&&compiled.server.version===manifest.courseVersion);
  assert(hash(members.get('worked-example-verifier.json'))===manifest.workedVerifierDigest,'Teaching implementation changed');
  const registry=JSON.parse(members.get('adaptation-registry.json'));assert(registry.profiles.length===(contract.profiles??154)&&registry.profiles.filter(p=>p.operation==='append_teaching').length===39&&registry.profiles.filter(p=>p.operation==='insert_episode').length===(contract.remedialEpisodes??0));
  assert(registry.profiles.filter(p=>p.operation==='append_teaching').every(p=>p.adapterDigest===manifest.workedVerifierDigest));
  for(const registry of JSON.parse(members.get('practical-registries.json')).registries){const bytes=members.get(path.basename(registry.file));assert(bytes&&bytes.length===registry.bytes&&hash(bytes)===registry.sha256,'Practical binding changed');}
  return manifest;
}
async function main(){
  assert(process.argv.length===4&&process.argv[2]==='--output','Usage: package-worked-course.mjs --output <new private directory>');
  const exec=promisify(execFile),cwd=fileURLToPath(ROOT),status=(await exec('git',['status','--porcelain'],{cwd})).stdout;assert(status==='','Commit source before packaging');
  const sourceCommit=(await exec('git',['rev-parse','HEAD'],{cwd})).stdout.trim();
  const receipt=await packageWorkedCourse(path.resolve(process.argv[3]),{sourceCommit});console.log(JSON.stringify({packaged:true,version:receipt.courseVersion,digest:receipt.courseDigest,sourceCommit,members:receipt.members.length,liveProviderAcceptance:false}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
