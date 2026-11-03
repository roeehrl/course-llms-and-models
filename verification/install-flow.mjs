// Released-surface check of scripts/install-pilot-course.mjs against a disposable
// Core runtime: password sign-in (piped on standard input), wrong password refused;
// a first run that is not given the exact version at the publish prompt stops before
// publishing (the release is left approved, the impact was shown); a second run resumes
// that release and publishes it with the impact digest; a third run changes nothing.
// Disposable schema only; never touches the pilot.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import pg from 'pg';
import {harnessPassword,runWithPassword} from './password-login.mjs';
import {verifyWorkedPackage} from '../scripts/package-worked-course.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2);assert(args.length===4&&args[0]==='--runtime-dir'&&args[2]==='--package','Usage: install-flow.mjs --runtime-dir <released course-core> --package <verified course dir>');
const runtime=path.resolve(args[1]),pkg=path.resolve(args[3]),manifest=await verifyWorkedPackage(pkg);
assert(process.env.TEST_DATABASE_URL&&!process.env.DATABASE_URL,'disposable_database_required');
const url=new URL(process.env.TEST_DATABASE_URL);assert(['127.0.0.1','localhost'].includes(url.hostname)&&/^\/course_core_(?:ci|test(?:_[a-z0-9_]+)?)$/.test(url.pathname),'disposable_database_required');
await mkdir(path.join(root,'.local/install-flow'),{recursive:true,mode:0o700});const state=await mkdtemp(path.join(root,'.local/install-flow/run-'));
const schema='course_install_flow_'+randomUUID().replaceAll('-',''),admin=new pg.Pool({connectionString:url.href,max:1});
await admin.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options',`-csearch_path=${schema}`);
const port=20000+Math.floor(Math.random()*20000),origin=`http://localhost:${port}`,instanceId=randomUUID();
const baseEnv={PATH:process.env.PATH,DATABASE_URL:url.href,PUBLIC_ORIGIN:origin};
const password=harnessPassword(),login='install-flow-owner';
const owner=JSON.parse(await runWithPassword(process.execPath,['services/api/dist/bootstrap-cli.js','install-flow',login,'Install owner','--password','--login',login],{cwd:runtime,env:baseEnv,password}));
const receipt=path.join(state,'bootstrap.json');await writeFile(receipt,JSON.stringify({workspaceId:owner.workspaceId})+'\n',{mode:0o600});
const verifier=JSON.parse(await readFile(path.join(pkg,'package.json'),'utf8'));
const registries=JSON.parse(await readFile(path.join(pkg,'practical-registries.json'),'utf8'));
const server=spawn(process.execPath,['--max-old-space-size=512','services/api/dist/main.js'],{cwd:runtime,stdio:['ignore','pipe','pipe'],env:{...baseEnv,API_HOST:'127.0.0.1',PORT:String(port),CORE_INSTANCE_ID:instanceId,
  CODE_FIXTURE_FILES:JSON.stringify(registries.registries.map(r=>path.join(pkg,path.basename(r.file)))),TEACHING_VERIFIER_FILES:JSON.stringify([path.join(pkg,'worked-example-verifier.json')]),
  ADAPTATION_ADAPTERS:JSON.stringify(['bounded-numeric-v1','authored-bank-v1','authored-code-bank-v1','authored-teaching-bank-v1']),SANDBOX_STORAGE_DIR:path.join(state,'sandbox'),PROVIDER_VAULT_DIRECTORY:path.join(state,'vault')}});
let log='';for(const p of [server.stdout,server.stderr])p.on('data',b=>{log=(log+b).slice(-20000);});
const install=input=>new Promise(resolve=>{const child=spawn(process.execPath,[path.join(root,'scripts/install-pilot-course.mjs'),'--origin',origin,'--package',pkg,'--bootstrap',receipt,'--login',login],{stdio:['pipe','pipe','pipe']});
  let out='',err='';child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});child.on('close',code=>resolve({code,out,err}));child.stdin.end(input+'\n');});
const reports=[];
try{
  await mkdir(path.join(state,'vault'),{mode:0o700});
  for(let n=0;;n++){assert(n<300&&server.exitCode===null,'api_startup_failed '+log.slice(-2000));try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok&&(await r.json()).instanceId===instanceId)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const wrong=await install('not-the-password-'+randomUUID());assert(wrong.code!==0&&/\/auth\/login failed: 401 LOGIN_FAILED/.test(wrong.err)&&!wrong.err.includes(password),'wrong password must be refused');reports.push('wrong_password_refused');
  const declined=await install(`${password}\nyes`);
  assert(declined.code!==0&&/Publication not confirmed; the release stays approved/.test(declined.err),declined.err.slice(-2000));
  assert(/publish-impact … 200/.test(declined.err)&&/New learners get /.test(declined.err)&&!/\/transitions … 200[\s\S]*\/transitions … 200[\s\S]*\/transitions … 200/.test(declined.err),'impact shown, publication not sent');reports.push('publish_needs_typed_version');
  const first=await install(`${password}\n${manifest.courseVersion}`);assert.equal(first.code,0,first.err.slice(-2000));const result=JSON.parse(first.out);
  assert(result.installed&&result.resumed&&result.transitions.join()==='publish'&&result.registryApproved&&result.courseVersion===manifest.courseVersion&&result.courseDigest===manifest.courseDigest&&result.operatorEnrolled===false,first.out);
  reports.push('resumed_published_and_selected');
  const again=await install(password);assert.equal(again.code,0,again.err.slice(-2000));const repeat=JSON.parse(again.out);
  assert(repeat.alreadyInstalled&&!repeat.transitions.length&&!repeat.registryApproved&&repeat.releaseId===result.releaseId,again.out);reports.push('repeat_run_changes_nothing');
  assert(!(first.out+first.err+wrong.err+declined.err+again.err+again.out).includes(password),'password must never be printed');reports.push('password_never_printed');
  console.log(JSON.stringify({installFlow:'pass',courseVersion:manifest.courseVersion,courseDigest:manifest.courseDigest,profiles:result.profiles,reports,liveProviderAcceptance:false}));
}finally{server.kill('SIGTERM');await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
