// Packs a verified course package directory as a Course Core course package
// (course-package v1): the <courseId>-<version>.course.tgz file that administration's
// "Install a new version" accepts by upload or from a GitHub release.
//
// The format is the one Core's verifier enforces (course-core README, "Installing a
// course"; services/api/src/course-package.ts and ustar.ts): a gzip-compressed POSIX ustar
// archive holding only top-level regular files, at most 100-byte names from [A-Za-z0-9._-],
// no directory, link, PAX or GNU records and no name prefix, and one course-package.json
// that lists every other member exactly once with its size, SHA-256 and role. The layout
// follows the SDK's packer byte for byte: members sorted by name, mode 0644, owner 0:0,
// mtime 0, and a gzip header without name or time (OS 255). The same package directory
// and the same Node zlib therefore give the same bytes on any machine.
//   node scripts/pack-core-package.mjs --package <verified dir> --output <new dir>
// writes <courseId>-<version>.course.tgz and <courseId>-<version>.course.tgz.sha256 there.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {crc32,deflateRawSync} from 'node:zlib';
import path from 'node:path';
import {verifyWorkedPackage} from './package-worked-course.mjs';

export const DESCRIPTOR='course-package.json';
export const REPOSITORY='https://github.com/roeehrl/course-llms-and-models';
/** Core's limits for course-package v1. */
export const LIMITS=Object.freeze({members:200,memberBytes:32*1024*1024,totalBytes:128*1024*1024,compressedBytes:64*1024*1024});
const MEMBER_NAME=/^[A-Za-z0-9._-]{1,100}$/,BLOCK=512;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

/**
 * The role of each member in Core's terms. Core recompiles the course manifest and requires
 * its digest; it compares host-requirement files by SHA-256 with the files the host operator
 * configured (CODE_FIXTURE_FILES, TEACHING_VERIFIER_FILES) and never runs them. A code-fixture
 * registry is also pinned by the course's extension declaration, so Core can offer it as a
 * course-supplied file instead. Everything else is carried as 'other'.
 */
export function memberRole(name){
  if(name==='course.manifest.json')return 'course-manifest';
  if(name==='course.learner.json')return 'learner-projection';
  if(name==='adaptation-registry.json')return 'adaptation-registry';
  if(name==='worked-example-verifier.json'||/^code-fixtures-[a-z0-9-]+\.json$/.test(name))return 'host-requirement';
  return 'other';
}
export const corePackageName=(courseId,courseVersion)=>`${courseId}-${courseVersion}.course.tgz`;

function header(name,size){
  const h=Buffer.alloc(BLOCK),put=(value,offset)=>h.write(value,offset,'ascii');
  assert(MEMBER_NAME.test(name)&&name!=='.'&&name!=='..',`Unsupported member name ${name}`);
  put(name,0);put('0000644\0',100);put('0000000\0',108);put('0000000\0',116);put(size.toString(8).padStart(11,'0')+'\0',124);put('00000000000\0',136);
  h.fill(0x20,148,156);put('0',156);put('ustar\0',257);put('00',263);put('0000000\0',329);put('0000000\0',337);
  let sum=0;for(const byte of h)sum+=byte;put(sum.toString(8).padStart(6,'0')+'\0 ',148);
  return h;
}
/** Deterministic flat ustar of regular files, in the order given. */
export function writeFlatTar(members){
  const parts=[];
  for(const {name,bytes} of members)parts.push(header(name,bytes.length),bytes,Buffer.alloc((BLOCK-bytes.length%BLOCK)%BLOCK));
  parts.push(Buffer.alloc(BLOCK*2));
  return Buffer.concat(parts);
}
/** gzip with a fixed header: no name, mtime 0, OS 255. */
export function gzipFixed(data){
  const body=deflateRawSync(data,{level:9,memLevel:9,strategy:0,windowBits:15}),trailer=Buffer.alloc(8);
  trailer.writeUInt32LE(crc32(data)>>>0,0);trailer.writeUInt32LE(data.length>>>0,4);
  return Buffer.concat([Buffer.from([0x1f,0x8b,0x08,0x00,0,0,0,0,0x02,0xff]),body,trailer]);
}
/** course-package.json and the archive for one set of named member bytes. */
export function packCoreArchive({courseId,courseVersion,courseDigest,sdkVersion,minimumCoreVersion,commit},files){
  assert(/^[a-z][a-z0-9._:-]{0,127}$/.test(courseId)&&/^[a-f0-9]{64}$/.test(courseDigest)&&/^[a-f0-9]{40}$/.test(commit),'Invalid package identity');
  const sorted=[...files].sort(([a],[b])=>a<b?-1:a>b?1:0);
  assert(sorted.length+1<=LIMITS.members&&!files.has(DESCRIPTOR),'Unexpected package members');
  let total=0;for(const [,bytes] of sorted){assert(bytes.length<=LIMITS.memberBytes,'Package member too large');total+=bytes.length;}
  const listing={format:'course-package',formatVersion:1,courseId,courseVersion,courseDigest,sdkVersion,minimumCoreVersion,source:{repository:REPOSITORY,commit},
    members:sorted.map(([name,bytes])=>({name,bytes:bytes.length,sha256:hash(bytes),role:memberRole(name)}))};
  const descriptor=Buffer.from(JSON.stringify(listing,null,2)+'\n');
  assert(total+descriptor.length<=LIMITS.totalBytes,'Package too large');
  const members=[[DESCRIPTOR,descriptor],...sorted].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,bytes])=>({name,bytes}));
  const archive=gzipFixed(writeFlatTar(members));
  assert(archive.length<=LIMITS.compressedBytes,'Package too large');
  return {listing,archive};
}
/** Verifies the course package directory, then packs it in Core's format. */
export async function packCorePackage(directory){
  const manifest=await verifyWorkedPackage(directory),names=['package.json',...manifest.members.map(m=>m.name)];
  const files=new Map(await Promise.all(names.map(async name=>[name,await readFile(path.join(directory,name))])));
  const {listing,archive}=packCoreArchive({...manifest,commit:manifest.sourceCommit},files);
  return {manifest,listing,archive,name:corePackageName(manifest.courseId,manifest.courseVersion),sha256:hash(archive)};
}
/** Writes the package and its sha256sum line (the `<asset>.sha256` Core verifies) into a directory. */
export async function writeCorePackage(directory,output){
  const packed=await packCorePackage(directory),file=path.join(output,packed.name);
  await writeFile(file,packed.archive,{mode:0o600,flag:'wx'});
  await writeFile(`${file}.sha256`,`${packed.sha256}  ${packed.name}\n`,{mode:0o600,flag:'wx'});
  return {...packed,file};
}
async function main(){
  const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--package'&&args[2]==='--output','Usage: pack-core-package.mjs --package <verified dir> --output <existing dir>');
  const packed=await writeCorePackage(path.resolve(args[1]),path.resolve(args[3]));
  console.log(JSON.stringify({packed:true,file:packed.name,version:packed.manifest.courseVersion,courseDigest:packed.manifest.courseDigest,sourceCommit:packed.manifest.sourceCommit,members:packed.listing.members.length,bytes:packed.archive.length,sha256:packed.sha256,node:process.versions.node}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
