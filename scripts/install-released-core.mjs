// Install the released Core runtime that the course harnesses are pinned to
// (expectedCoreRelease in verification/released-runtime.mjs), for local runs and CI.
//
//   node scripts/install-released-core.mjs [--assets-dir <dir>] [--runtime-dir <dir>] [--pull-sandbox-image]
//
// Without --assets-dir the public release assets are downloaded to
// .local/released-core-assets-v<version>/. The pinned manifest sha is the trust anchor:
// release-manifest.json must match it, SHA256SUMS and every asset must match the manifest.
// The runtime archive is extracted to .local/released-core-v<version>/ (replaced if present),
// the learner and admin web archives overlay apps/*/dist, and each server module installs its
// own locked dependencies with lifecycle scripts disabled. verifyReleasedRuntime then checks
// every installed delivery file against the manifest. --pull-sandbox-image pulls the
// digest-pinned Python image the released sandbox qualifies for this architecture and runs
// one throwaway container from it.
import {readFile,writeFile,mkdir,rm,rename,mkdtemp,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {expectedCoreRelease,verifyReleasedRuntime} from '../verification/released-runtime.mjs';

const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
const fail=message=>{throw new Error(message);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=process.argv.slice(2),known=['--assets-dir','--runtime-dir','--pull-sandbox-image'];
for(let i=0;i<args.length;i++){if(!known.includes(args[i]))fail(`usage: unknown argument ${args[i]}`);if(args[i]!=='--pull-sandbox-image'&&!args[++i])fail(`usage: ${args[i-1]} needs a directory`);}
const value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
const release=expectedCoreRelease,repository='roeehrl/course-core';
const assets=path.resolve(value('--assets-dir')??path.join(root,`.local/released-core-assets-v${release.version}`));
const runtime=path.resolve(value('--runtime-dir')??path.join(root,`.local/released-core-v${release.version}`));
// Server-side modules in Core's dependency order (scripts/release-artifacts.mjs buildSnapshot).
// The learner and admin apps are served as prebuilt static exports and need no dependencies.
const MODULES=['packages/policy','packages/providers','packages/adaptation','packages/research','packages/i18n','packages/sandbox','packages/visuals','services/supervisor','services/api'];

async function download(filename){
  const url=`https://github.com/${repository}/releases/download/${release.tag}/${filename}`;
  for(let attempt=1;;attempt++){
    try{const response=await fetch(url,{redirect:'follow'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return Buffer.from(await response.arrayBuffer());}
    catch(error){if(attempt>=3)fail(`release_download_failed: ${filename}: ${error.message}`);await new Promise(r=>setTimeout(r,2000*attempt));}
  }
}
async function asset(filename,expected,fetchMissing){
  const file=path.join(assets,filename);let bytes=await readFile(file).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
  if(bytes===null){if(!fetchMissing)fail(`release_asset_missing: ${file}`);bytes=await download(filename);if(sha(bytes)!==expected)fail(`release_asset_sha_mismatch: ${filename}`);await writeFile(file,bytes,{mode:0o644});}
  if(sha(bytes)!==expected)fail(`release_asset_sha_mismatch: ${filename}`);
  return bytes;
}
async function checkedArchive(file){
  // Members must stay under course-core/ (the bytes are already pinned; this guards extraction).
  const {stdout}=await exec('tar',['-tzf',file],{maxBuffer:64*1024*1024});
  for(const member of stdout.split('\n').filter(Boolean))if(!/^course-core(\/|$)/.test(member)||member.split('/').includes('..'))fail(`release_member_path_invalid: ${member}`);
}
const run=(command,argv,cwd,env)=>exec(command,argv,{cwd,env:{...process.env,...env},maxBuffer:64*1024*1024});

const fetchMissing=!value('--assets-dir');
await mkdir(assets,{recursive:true,mode:0o700});
const manifestBytes=await asset('release-manifest.json',release.manifestSha256,fetchMissing);
const manifest=JSON.parse(manifestBytes.toString('utf8'));
manifest.identity?.tag===release.tag&&manifest.identity?.version===release.version||fail('release_identity_mismatch');
const sums=new Map((await readFile(path.join(assets,'SHA256SUMS'),'utf8').catch(async e=>{if(e.code!=='ENOENT'||!fetchMissing)throw e;const b=await download('SHA256SUMS');await writeFile(path.join(assets,'SHA256SUMS'),b,{mode:0o644});return b.toString('utf8');}))
  .trim().split('\n').map(line=>{const m=/^([a-f0-9]{64}) {2}([A-Za-z0-9.-]+)$/.exec(line)??fail(`sha256sums_line_invalid: ${line}`);return [m[2],m[1]];}));
for(const a of manifest.assets){sums.get(a.filename)===a.sha256||fail(`sha256sums_disagrees_with_manifest: ${a.filename}`);await asset(a.filename,a.sha256,fetchMissing);}
for(const [filename,digest] of sums)await asset(filename,digest,fetchMissing);
const byKind=Object.fromEntries(manifest.assets.map(a=>[a.kind,a.filename]));
console.log(`Release assets verified: Core ${release.tag} (${sums.size} files, manifest ${release.manifestSha256.slice(0,12)})`);

await mkdir(path.dirname(runtime),{recursive:true});
const staging=await mkdtemp(path.join(path.dirname(runtime),'.released-core-staging-'));
try{
  for(const kind of ['runtime','learner','admin'])await checkedArchive(path.join(assets,byKind[kind]));
  await run('tar',['-xzf',path.join(assets,byKind.runtime),'-C',staging]);
  for(const [kind,dir] of [['learner','apps/learner/dist'],['admin','apps/admin/dist']]){const target=path.join(staging,'course-core',dir);await mkdir(target,{recursive:true});await run('tar',['-xzf',path.join(assets,byKind[kind]),'-C',target,'--strip-components=1']);}
  await rm(runtime,{recursive:true,force:true});await rename(path.join(staging,'course-core'),runtime);
}finally{await rm(staging,{recursive:true,force:true});}
console.log(`Extracted runtime and web exports to ${path.relative(root,runtime)||runtime}`);

for(const module of MODULES){
  const directory=path.join(runtime,module);await lstat(path.join(directory,'package-lock.json')).catch(()=>fail(`module_lock_missing: ${module}`));
  const started=Date.now();await run('npm',['ci','--ignore-scripts','--workspaces=false','--omit=dev','--no-audit','--no-fund'],directory,{npm_config_update_notifier:'false'});
  console.log(`Installed locked dependencies: ${module} (${((Date.now()-started)/1000).toFixed(1)} s)`);
}
const receipt=await verifyReleasedRuntime(runtime,assets);
console.log(`Installed runtime matches the release manifest: Core ${receipt.version} ${receipt.commit.slice(0,12)}, ${receipt.checkedMembers} members, ${receipt.uniqueFiles} files`);

if(args.includes('--pull-sandbox-image')){
  const {QUALIFIED_IMAGES}=await import(pathToFileURL(path.join(runtime,'packages/sandbox/dist/index.js')).href);
  const image=QUALIFIED_IMAGES?.[process.arch],platform={x64:'linux/amd64',arm64:'linux/arm64'}[process.arch];
  /^python@sha256:[a-f0-9]{64}$/.test(image??'')&&platform||fail(`sandbox_image_unavailable_for_${process.arch}`);
  await run('docker',['pull','--platform',platform,image]);
  const {stdout}=await run('docker',['image','inspect',image,'--format','{{json .RepoDigests}}']);
  JSON.parse(stdout).some(d=>d.endsWith(image.slice('python'.length)))||fail('sandbox_image_digest_mismatch');
  console.log(`Sandbox image pulled and inspected: ${platform} ${image}`);
  // Start one throwaway container from the image so the first graded container (the released
  // API qualifies its teaching verifier at startup, within the sandbox's 5 s budget) is not also
  // the first container this host has ever created from a freshly pulled image.
  const warmStarted=Date.now();
  await run('docker',['run','--rm','--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user=65532:65532','--platform',platform,image,'python','-I','-B','-c','pass']);
  console.log(`Sandbox image warmed: first container ran in ${Date.now()-warmStarted} ms`);
}
