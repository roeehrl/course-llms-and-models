import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const expectedCoreRelease10={version:'0.1.10',tag:'v0.1.10',commit:'e96763e5dbfbc2f036e84fe8a38bb514f21b1551',tagObject:'f86c3d4046e54396efe2a33973269404bb1426b1',runId:38394906665,manifestSha256:'3d89d4b66b70275fd5246a7d9a6a041c21a206d3adb3709ccaf5a753cae60b19'};
export const expectedCoreRelease17={version:'0.1.17',tag:'v0.1.17',commit:'74e60f4c9b1f5116f6e5984185c23cb64cbf8dc8',tagObject:'fd60139916c0ec72442796e7d9bfbecdbce5ee6d',runId:38428514171,manifestSha256:'25a358dbf66c2532af7a98505949b833a8ffb0197e7ffc96a6827e5a947e2906'};
export const expectedCoreRelease19={version:'0.1.19',tag:'v0.1.19',commit:'c4c6e662966579850d147f20a4c41a8f8f4eb806',tagObject:'4dcd4ae086d49a05a43f66d54803d2e68db0021e',runId:38456418473,manifestSha256:'f67f5e1fed04bbb49c3c6c92db555733549165c02ad63f8147a2b8feb58bc6eb'};
export const expectedCoreRelease32={version:'0.1.32',tag:'v0.1.32',commit:'859b4db2aa5b6ff601bf8f6ef5366d97d1f75e34',tagObject:'1964d6068da4096333438b0063be75e94b29a632',runId:38498335184,manifestSha256:'ed2f247eb89baa63fce8c0fda68d63b9f7463f394f271eb7656410f05b1887cc'};
export const expectedCoreRelease33={version:'0.1.33',tag:'v0.1.33',commit:'fa41b02e2e3fbca46dc15f707b84e87a0005b5b2',tagObject:'bf187f2ba60679798753ae6d2a3aa5458821a511',runId:38506727322,manifestSha256:'70c9edacc4a4aba3434309fa6510d21c3cb0a92dc351ca4e3901eece5fcd3015'};
export const expectedCoreRelease34={version:'0.1.34',tag:'v0.1.34',commit:'1c204b669c5738cee6891ce624092cc52944bf36',tagObject:'d232fe7145f9426d5ecddfe03a4d83935de7bd52',runId:38512307504,manifestSha256:'1a5baaeedd5359417d39e634002bd8dd03b2bf371824b831129b448208587208'};
export const expectedCoreRelease35={version:'0.1.35',tag:'v0.1.35',commit:'846fd467f7388655b4036ed9129b26d81c472f64',tagObject:'5645317772eae07befdfdd5f53811af020e8ca9e',runId:38539008415,manifestSha256:'0234d931aedd897b5a29c37764d08dc7a62bc571b18fe7ed464dd85feeecff62'};
export const expectedCoreRelease37={version:'0.1.37',tag:'v0.1.37',commit:'6fc6a2a4df221b91804c535a6221ce3ea77ae11e',tagObject:'04a9712eea019c190ad65aa7117f12cef1f16ed5',runId:38560622115,manifestSha256:'c44b0d7ec4fd1889bb638cc6f586e86af088c6ad2781c7a65ef79b04171d9a12'};
export const expectedCoreRelease38={version:'0.1.38',tag:'v0.1.38',commit:'ded66f27124dd4c128f47d92fa05fa85f7790745',tagObject:'9d72b3c1dc23c3d9a8667078aef2e7b33603d088',runId:38599534149,manifestSha256:'9199311b94abe3ce832902c431917200863849db359f2a2fd35d5a4f49894654'};
export const expectedCoreRelease39={version:'0.1.39',tag:'v0.1.39',commit:'56b3cda473c7ffe26b4c88547df07853cbe25760',tagObject:'68b3b331965015a9745b46f6846eb967ead64dda',runId:38790654821,manifestSha256:'4bc32171d915aae85d794aaea0d3b3926efb8a8e87fddee3fd583d1cad4150ff'};
export const expectedCoreRelease={version:'0.1.47',tag:'v0.1.47',commit:'cc0961e2bdf6cda4c7e3bfb55628c000a1c19855',tagObject:'e3865887d38b2f52d3497cb83369bf18b2aefa31',runId:39369288302,manifestSha256:'bb4a7af8a099ae35d6c6eec595d62e1cb75a13606e1257f1d7000d4cc1e1ec46'};
/** A fresh checkout has no gitignored .local/ tree, so a harness that reads a released
 * runtime or its assets from a default location says where they come from instead of
 * failing on a bare ENOENT. --runtime-dir and --release-dir override the defaults. */
export async function releasedDirectories(argv,defaults){
 const value=flag=>{const i=argv.indexOf(flag);return i<0?undefined:argv[i+1];};
 const dirs={runtime:path.resolve(value('--runtime-dir')??defaults.runtime),release:path.resolve(value('--release-dir')??defaults.release)};
 for(const [name,dir] of Object.entries(dirs)){let ok=false;try{ok=(await lstat(dir)).isDirectory();}catch{}
  if(!ok)throw Error(`released_${name}_directory_missing: ${dir} does not exist. Download and verify the release assets and install the runtime there (see RELEASES.md), or pass --runtime-dir and --release-dir.`);}
 return dirs;
}
export const releaseCiNames=['Public source and orchestration','Module / policy','Module / providers','Module / adaptation','Module / research','Module / example-courses','Module / supervisor','Sandbox / real Docker Linux','API and connected learner / Postgres 17','Browser / visuals','Browser / learner','Browser / admin'];
const check=(v,code)=>{if(!v)throw Error(code);},sha=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Verify published delivery data and installed files independently of Core
 * implementation imports. No sibling checkout, model call or native mutation. */
export async function verifyReleasedRuntime(runtime,directory,identity=expectedCoreRelease){
 const manifestBytes=await readFile(path.join(directory,'release-manifest.json'));
 check(/^[a-f0-9]{64}$/.test(identity.manifestSha256??'')&&sha(manifestBytes)===identity.manifestSha256,'release_manifest_bytes_mismatch');
 const manifest=JSON.parse(manifestBytes.toString('utf8'));
 check(manifest.identity.repository==='roeehrl/course-core'&&manifest.identity.version===identity.version&&manifest.identity.tag===identity.tag&&manifest.identity.commit===identity.commit&&manifest.identity.tagObject===identity.tagObject,'release_identity_mismatch');
 check(manifest.ci.headSha===identity.commit&&manifest.ci.runId===identity.runId&&manifest.ci.jobs.length===12&&manifest.ci.jobs.every(j=>j.conclusion==='success')&&new Set(manifest.ci.jobs.map(j=>j.id)).size===12&&releaseCiNames.every(name=>manifest.ci.jobs.filter(j=>j.name===name||j.name.endsWith(' / '+name)).length===1),'release_ci_mismatch');
 check(manifest.verificationScope==='source_ci_and_installed_package_only_no_live_provider_or_deployment','release_scope_mismatch');
 const kinds=new Set(),seen=new Map();let files=0;
 for(const asset of manifest.assets){check(/^[A-Za-z0-9.-]+$/.test(asset.filename)&&!kinds.has(asset.kind),'release_asset_invalid');kinds.add(asset.kind);const bytes=await readFile(path.join(directory,asset.filename));check(bytes.length===asset.size&&sha(bytes)===asset.sha256,'release_asset_bytes_mismatch');
  if(asset.kind==='visuals')continue;check(['source','runtime','learner','admin'].includes(asset.kind),'release_asset_kind_unknown');
  for(const entry of asset.entries){check(/^course-core\/[A-Za-z0-9_./@-]+$/.test(entry.path)&&entry.path.split('/').every(p=>p&&p!=='.'&&p!=='..'),'release_member_path_invalid');const relative=entry.path.slice('course-core/'.length),prefix=asset.kind==='learner'?'apps/learner/dist':asset.kind==='admin'?'apps/admin/dist':'';const filename=path.join(runtime,prefix,relative),info=await lstat(filename);check(info.isFile()&&!info.isSymbolicLink(),'release_member_type_changed');const actual=await readFile(filename);check(actual.length===entry.size&&sha(actual)===entry.sha256&&(info.mode&0o111)===(entry.mode&0o111),'installed_delivery_changed');const old=seen.get(filename);check(!old||old===entry.sha256,'release_overlay_conflict');seen.set(filename,entry.sha256);files++;}
 }
 check(kinds.size===5,'release_asset_missing');const packageJson=JSON.parse(await readFile(path.join(runtime,'package.json'),'utf8'));check(packageJson.name==='@course-core/repository'&&packageJson.version===identity.version,'runtime_package_mismatch');return {version:identity.version,commit:identity.commit,manifestSha256:identity.manifestSha256,checkedMembers:files,uniqueFiles:seen.size};
}
