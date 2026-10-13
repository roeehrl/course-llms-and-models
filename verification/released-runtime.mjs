import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const expectedCoreRelease={version:'0.1.8',tag:'v0.1.8',commit:'db54ca0853db996ae21db62da740e6d5af06f0a7',tagObject:'7fa2746884185093d71aab2dc5238a03d2810f50',runId:38385397184,manifestSha256:'8a13690e2d1f2d7836e104b31fc7859b34eb224cb686a5ab9467445616a0a232'};
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
