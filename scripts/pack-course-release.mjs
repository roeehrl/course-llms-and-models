// Packs a verified course package directory into the release archive course-v<version>.tgz,
// byte for byte reproducibly: members sorted by name, fixed owner (0:0, no names), fixed
// modes (0700 directory, 0600 files), every timestamp set to the source commit's committer
// time, and a gzip header without a name or time. The same package bytes and the same Node
// major therefore give the same archive digest on any machine.
//   node scripts/pack-course-release.mjs --package <verified dir> --output <new .tgz>
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {gzipSync,constants} from 'node:zlib';
import path from 'node:path';
import {verifyWorkedPackage} from './package-worked-course.mjs';

const BLOCK=512;
function header(name,{size,mode,mtime,type}){
  const h=Buffer.alloc(BLOCK),put=(value,offset,length)=>h.write(value,offset,length,'ascii'),octal=(n,length)=>n.toString(8).padStart(length-1,'0')+'\0';
  assert(Buffer.byteLength(name)<=100&&/^[A-Za-z0-9._/-]+$/.test(name)&&name.split('/').every((p,i,all)=>(p||i===all.length-1)&&p!=='.'&&p!=='..'),`Unsupported member name ${name}`);
  put(name,0,100);put(octal(mode,8),100,8);put(octal(0,8),108,8);put(octal(0,8),116,8);put(octal(size,12),124,12);put(octal(mtime,12),136,12);
  put('        ',148,8);put(type,156,1);put('ustar\0',257,6);put('00',263,2);
  let sum=0;for(const byte of h)sum+=byte;put(sum.toString(8).padStart(6,'0')+'\0 ',148,8);
  return h;
}
/** Deterministic ustar + gzip bytes for one top-level directory of regular files. */
export function packArchive(top,files,mtime){
  assert(/^course-v\d+\.\d+\.\d+$/.test(top)&&Number.isInteger(mtime)&&mtime>0);
  const parts=[header(top+'/',{size:0,mode:0o700,mtime,type:'5'})];
  for(const [name,bytes] of [...files].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    parts.push(header(`${top}/${name}`,{size:bytes.length,mode:0o600,mtime,type:'0'}),bytes,Buffer.alloc((BLOCK-bytes.length%BLOCK)%BLOCK));
  }
  parts.push(Buffer.alloc(BLOCK*2));
  return gzipSync(Buffer.concat(parts),{level:constants.Z_BEST_COMPRESSION});
}
export async function packCourseRelease(directory){
  const manifest=await verifyWorkedPackage(directory),names=['package.json',...manifest.members.map(m=>m.name)];
  const files=new Map(await Promise.all(names.map(async name=>[name,await readFile(path.join(directory,name))])));
  const {stdout}=await promisify(execFile)('git',['show','-s','--format=%ct',manifest.sourceCommit],{cwd:fileURLToPath(new URL('../',import.meta.url))});
  const archive=packArchive(`course-v${manifest.courseVersion}`,files,Number(stdout.trim()));
  return {manifest,archive,sha256:createHash('sha256').update(archive).digest('hex')};
}
async function main(){
  const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--package'&&args[2]==='--output','Usage: pack-course-release.mjs --package <verified dir> --output <new .tgz>');
  const {manifest,archive,sha256}=await packCourseRelease(path.resolve(args[1])),output=path.resolve(args[3]);
  assert.equal(path.basename(output),`course-v${manifest.courseVersion}.tgz`,'Archive name must be course-v<version>.tgz');
  await writeFile(output,archive,{mode:0o600,flag:'wx'});
  await writeFile(output.replace(/\.tgz$/,'.sha256'),`${sha256}  ${path.basename(output)}\n`,{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({packed:true,version:manifest.courseVersion,courseDigest:manifest.courseDigest,sourceCommit:manifest.sourceCommit,bytes:archive.length,sha256,node:process.versions.node}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
