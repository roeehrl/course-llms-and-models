// Installs the course the way administration's "Install a new version" does: the
// Core-format <courseId>-<version>.course.tgz (scripts/pack-core-package.mjs) is uploaded to
// the released Core's package inspection, then installed, approved, published and its
// adaptation registry approved through the same admin API the screen calls. No install
// script, no draft pasted by hand. Two hosts, each a fresh disposable schema:
//
// - configured: the operator configured the five code-fixture registries
//   (CODE_FIXTURE_FILES), the teaching verifier (TEACHING_VERIFIER_FILES) and the adaptation
//   adapters, as the pilot is. Every host requirement must be reported identical and nothing
//   needs an approval beyond review, publication and the registry.
// - course-supplied: only the teaching verifier and the adapters are configured; the
//   fixture registries come from the package (COURSE_SUPPLIED_CODE_FIXTURES=on). Installing
//   needs, and gets, the owner's approval of exactly those files.
//
// Both must end with the release published, selected for new learners and its registry
// approved; inspecting again reports it installed and a repeated install returns the same
// release. Needs Docker (Core's sandbox) and a disposable Postgres; never touches the pilot.
//   node verification/admin-install-flow.mjs --runtime-dir <released course-core> [--package-file <x.course.tgz>]
// Without --package-file the package is built from HEAD (which must be committed).
import assert from 'node:assert/strict';
import {chmod,mkdir,mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {execFile,execFileSync,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import pg from 'pg';
import {harnessPassword,runWithPassword} from './password-login.mjs';
import {packageWorkedCourse} from '../scripts/package-worked-course.mjs';
import {writeCorePackage} from '../scripts/pack-core-package.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2);
assert((args.length===2||args.length===4)&&args[0]==='--runtime-dir'&&(args.length===2||args[2]==='--package-file'),'Usage: admin-install-flow.mjs --runtime-dir <released course-core> [--package-file <x.course.tgz>]');
const runtime=path.resolve(args[1]);
assert(process.env.TEST_DATABASE_URL&&!process.env.DATABASE_URL,'disposable_database_required');
const url=new URL(process.env.TEST_DATABASE_URL);assert(['127.0.0.1','localhost'].includes(url.hostname)&&/^\/course_core_(?:ci|test(?:_[a-z0-9_]+)?)$/.test(url.pathname),'disposable_database_required');
await mkdir(path.join(root,'.local/admin-install-flow'),{recursive:true,mode:0o700});
const state=await mkdtemp(path.join(root,'.local/admin-install-flow/run-'));

let packageFile;
if(args[3])packageFile=path.resolve(args[3]);
else{
  const exec=promisify(execFile);assert.equal((await exec('git',['status','--porcelain'],{cwd:root})).stdout,'','Commit source before packaging');
  const sourceCommit=(await exec('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim(),dir=path.join(state,'package');
  await packageWorkedCourse(dir,{sourceCommit});await mkdir(path.join(state,'dist'),{mode:0o700});
  packageFile=(await writeCorePackage(dir,path.join(state,'dist'))).file;
}
const bytes=await readFile(packageFile),packageSha=createHash('sha256').update(bytes).digest('hex');
// The operator's own copies of the files the host is configured with, taken from the package.
// Core loads host files only when they are owner-only (0600), as the pilot keeps them.
const host=path.join(state,'host');await mkdir(host,{mode:0o700});execFileSync('tar',['-xzf',packageFile,'-C',host]);
for(const name of await readdir(host))await chmod(path.join(host,name),0o600);
const listing=JSON.parse(await readFile(path.join(host,'course-package.json'),'utf8'));
assert.deepEqual((await readdir(host)).sort(),['course-package.json',...listing.members.map(m=>m.name)].sort(),'the package must hold only its listed top-level files');
const fixtures=listing.members.filter(m=>/^code-fixtures-/.test(m.name)).map(m=>path.join(host,m.name)),verifier=path.join(host,'worked-example-verifier.json');
const registry=JSON.parse(await readFile(path.join(host,'adaptation-registry.json'),'utf8'));
const ADAPTERS=JSON.stringify(['bounded-numeric-v1','authored-bank-v1','authored-code-bank-v1','authored-teaching-bank-v1']);

async function runHost(name,hostEnv){
  const admin=new pg.Pool({connectionString:url.href,max:1}),schema=`course_admin_install_${name.replaceAll('-','_')}_${randomUUID().replaceAll('-','')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const db=new URL(url.href);db.searchParams.set('options',`-csearch_path=${schema}`);
  const port=20000+Math.floor(Math.random()*20000),origin=`http://localhost:${port}`,instanceId=randomUUID(),dir=await mkdtemp(path.join(state,`${name}-`));
  const baseEnv={PATH:process.env.PATH,DATABASE_URL:db.href,PUBLIC_ORIGIN:origin},password=harnessPassword(),login=`admin-install-${name}`;
  let server,log='';
  try{
    const owner=JSON.parse(await runWithPassword(process.execPath,['services/api/dist/bootstrap-cli.js',`admin-install-${name}`,login,'Install owner','--password','--login',login],{cwd:runtime,env:baseEnv,password}));
    await mkdir(path.join(dir,'vault'),{mode:0o700});
    server=spawn(process.execPath,['--max-old-space-size=512','services/api/dist/main.js'],{cwd:runtime,stdio:['ignore','pipe','pipe'],env:{...baseEnv,API_HOST:'127.0.0.1',PORT:String(port),CORE_INSTANCE_ID:instanceId,
      ADAPTATION_ADAPTERS:ADAPTERS,TEACHING_VERIFIER_FILES:JSON.stringify([verifier]),SANDBOX_STORAGE_DIR:path.join(dir,'sandbox'),PROVIDER_VAULT_DIRECTORY:path.join(dir,'vault'),COURSE_PACKAGE_REMOTE_FETCH:'off',...hostEnv}});
    for(const p of [server.stdout,server.stderr])p.on('data',b=>{log=(log+b).slice(-20000);});
    for(let n=0;;n++){assert(n<1200&&server.exitCode===null,'api_startup_failed '+log.slice(-2000));try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok&&(await r.json()).instanceId===instanceId)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    let session;
    const call=async(method,route,body,headers={})=>{
      const raw=Buffer.isBuffer(body),response=await fetch(origin+route,{method,redirect:'error',signal:AbortSignal.timeout(180000),
        headers:{origin,'content-type':raw?'application/gzip':'application/json',...(session?{cookie:session.cookie,'x-csrf-token':session.csrf}:{}),...headers},...(body===undefined?{}:{body:raw?body:JSON.stringify(body)})});
      return {status:response.status,value:await response.json().catch(()=>null),cookies:response.headers.getSetCookie()};
    };
    const ok=async(...a)=>{const r=await call(...a);assert(r.status>=200&&r.status<300,`${a[0]} ${a[1].replace(/[0-9a-f-]{36}/g,':id')}: ${r.status} ${JSON.stringify(r.value).slice(0,600)}`);return r.value;};
    const signed=await call('POST','/auth/login',{login,password});assert.equal(signed.status,200,'sign_in');
    session={cookie:signed.cookies.map(c=>c.split(';')[0]).join('; '),csrf:signed.value.csrfToken};
    const workspaceId=owner.workspaceId,inspect=()=>ok('POST',`/api/admin/course-packages/inspect?workspaceId=${workspaceId}`,bytes);

    const preview=await inspect();
    assert.equal(preview.sha256,packageSha);
    assert.deepEqual(preview.course,{id:listing.courseId,title:preview.course.title,version:listing.courseVersion,digest:listing.courseDigest});
    assert.equal(preview.existing.status,'new-course');
    assert(preview.installable&&!preview.problems.some(p=>p.severity==='blocking'),`blocking problems: ${JSON.stringify(preview.problems)}`);
    assert.equal(preview.runtime.runnable,true);
    // Code-bank recovery profiles need their code graders installed. Course-supplied graders are
    // installed only by the install's approval, so before it the registry cannot be approved yet.
    assert(preview.registry.present&&preview.registry.profileCount===registry.profiles.length,`registry: ${JSON.stringify(preview.registry)}`);
    if(name==='configured')assert(preview.registry.approvable,`registry: ${JSON.stringify(preview.registry)}`);
    else assert(preview.registry.approvable||preview.registry.code==='EVALUATOR_NOT_CONFIGURED',`registry: ${JSON.stringify(preview.registry)}`);
    const status=Object.fromEntries(preview.hostRequirements.map(r=>[r.name,r.status]));
    assert.equal(status['worked-example-verifier.json'],'identical');
    for(const file of fixtures)assert.equal(status[path.basename(file)],name==='configured'?'identical':'course_supplied',`${path.basename(file)}: ${status[path.basename(file)]}`);
    const required=preview.courseSupplied.approvalRequired;
    assert.equal(required.length,name==='configured'?0:fixtures.length,`course-supplied approvals: ${JSON.stringify(preview.courseSupplied)}`);

    // As the screen does: the registry is approved with the install only when the preview offers
    // it; otherwise the installation's own registry step approves it right after.
    const input={workspaceId,idempotencyKey:`admin-install-${randomUUID()}`,approveAndPublish:{confirmVersion:listing.courseVersion},
      ...(preview.registry.approvable?{approveRegistry:{configurationDigest:preview.registry.digest}}:{}),...(required.length?{approveCourseSupplied:{integrities:required}}:{})};
    if(required.length){const {approveCourseSupplied,...unapproved}=input,refused=await call('POST',`/api/admin/course-packages/${packageSha}/install`,unapproved);
      assert.equal(refused.status,409);assert.equal(refused.value?.code??refused.value?.error,'COURSE_SUPPLIED_APPROVAL_REQUIRED',JSON.stringify(refused.value));}
    const installed=await ok('POST',`/api/admin/course-packages/${packageSha}/install`,input);
    assert(!installed.alreadyInstalled&&installed.installation.state==='published',`install: ${JSON.stringify({...installed,installation:installed.installation?.state})}`);
    if(preview.registry.approvable)assert.equal(installed.registryApproval?.approved,true,JSON.stringify(installed.registryApproval));
    else{
      const {registry:staged}=installed.installation;assert(staged.present&&!staged.approved&&staged.digest===preview.registry.digest);
      await ok('POST',`/api/admin/course-packages/installs/${installed.releaseId}/registry`,{configurationDigest:staged.digest,expectedRegistryRevision:staged.registryRevision});
    }
    const view=await ok('GET',`/api/admin/course-packages/installs/${installed.releaseId}`);
    assert(view.state==='published'&&view.registry.approved,`installation: ${JSON.stringify({state:view.state,registry:view.registry})}`);
    const selected=await ok('GET',`/api/workspaces/${workspaceId}/courses`);
    assert(selected.length===1&&selected[0].id===installed.releaseId&&selected[0].digest===listing.courseDigest&&selected[0].status==='published','published release is the selected catalogue release');
    const again=await inspect();assert.equal(again.existing.status,'already-installed');
    const repeated=await ok('POST',`/api/admin/course-packages/${packageSha}/install`,{workspaceId,idempotencyKey:`admin-install-${randomUUID()}`});
    assert(repeated.alreadyInstalled&&repeated.releaseId===installed.releaseId,'a repeated install returns the same release');
    await call('POST','/auth/logout',{});
    return {host:name,hostRequirements:status,courseSuppliedApproved:required.length,registryProfiles:preview.registry.profileCount,registryApprovableBeforeInstall:preview.registry.approvable,
      warnings:preview.problems.filter(p=>p.severity==='warning').map(p=>p.code),published:true,selected:true,repeatInstallSameRelease:true};
  }finally{server?.kill('SIGTERM');await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
}

try{
  const reports=[await runHost('configured',{CODE_FIXTURE_FILES:JSON.stringify(fixtures)}),await runHost('course-supplied',{COURSE_SUPPLIED_CODE_FIXTURES:'on'})];
  console.log(JSON.stringify({adminInstallFlow:'pass',package:path.basename(packageFile),sha256:packageSha,courseVersion:listing.courseVersion,courseDigest:listing.courseDigest,reports,liveProviderAcceptance:false}));
}finally{await rm(state,{recursive:true,force:true});}
