// Actual private course acceptance through the released CLI and HTTP surface.
// No sibling Core imports, native pilot, production DB or real owner progress.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from 'node:net';
import pg from 'pg';
import {verifyReleasedRuntime,expectedCoreRelease} from './released-runtime.mjs';
import {stageWorkedExamples} from '../scripts/stage-worked-examples.mjs';
import {writtenAnswers} from './written-answers.mjs';
import {enablePlacement} from './placement-settings.mjs';
import {harnessPassword,runWithPassword} from './password-login.mjs';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
class Failure extends Error {constructor(code){super(code);this.code=code;}}
const check=(condition,code)=>{if(!condition)throw new Failure(code);};
const args=process.argv.slice(2),flags=args.slice(4);check(args.length>=4&&args.length<=6&&args[0]==='--runtime-dir'&&args[2]==='--release-dir'&&flags.every(f=>['--browser','--worked-course'].includes(f))&&new Set(flags).size===flags.length,'usage_runtime_and_release_dirs');const browserMode=flags.includes('--browser'),workedCourse=flags.includes('--worked-course');
const runtime=path.resolve(args[1]),manifest=JSON.parse(await readFile(path.join(runtime,'package.json'),'utf8'));check(manifest.name==='@course-core/repository'&&manifest.version===expectedCoreRelease.version,'released_runtime_version_required');
const releaseReceipt=await verifyReleasedRuntime(runtime,path.resolve(args[3]));
check(process.env.TEST_DATABASE_URL&&!process.env.DATABASE_URL,'disposable_database_required');
const url=new URL(process.env.TEST_DATABASE_URL);check(['postgres:','postgresql:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&/^\/course_core_(?:ci|test(?:_[a-z0-9_]+)?)$/.test(url.pathname)&&!url.search&&!url.hash,'disposable_database_required');
const worked=workedCourse?await stageWorkedExamples():null,compiled=worked?.compiled??JSON.parse(await readFile(path.join(root,'dist/course.compiled.json'),'utf8').catch(e=>{throw new Failure(e?.code==='ENOENT'?'course_build_missing_run_npm_run_build_first':'course_build_unreadable');})),course=compiled.server,configuration=worked?.proposedRegistry??JSON.parse(await readFile(path.join(root,'runtime/recovery-registry.json'),'utf8'));
let verifierFile;if(worked){verifierFile=path.join(root,'.local/generated-teaching/verifier.json');await mkdir(path.dirname(verifierFile),{recursive:true,mode:0o700});await writeFile(verifierFile,worked.bytes,{mode:0o600});}
const candidate=(await exec('python3',['-B','-c',"import importlib.util;s=importlib.util.spec_from_file_location('r','runtime/recovery-code-reference.py');r=importlib.util.module_from_spec(s);s.loader.exec_module(r);print(r.candidate_source())"],{cwd:root,maxBuffer:64000})).stdout;
const registryMetadata=JSON.parse(await readFile(path.join(root,'runtime/practical-registries.json'),'utf8'));
check(registryMetadata.schemaVersion===1&&registryMetadata.registries.length===3,'qualified_registries_required');
for(const r of registryMetadata.registries){check(/^runtime\/code-fixtures-(autodiff|decoder|qualification)-qualified\.json$/.test(r.file),'qualified_registry_path');const bytes=await readFile(path.join(root,r.file));check(bytes.length===r.bytes&&bytes.length<=1024*1024&&createHash('sha256').update(bytes).digest('hex')===r.sha256,'qualified_registry_bytes_changed');}
const schema='course_private_flow_'+randomUUID().replaceAll('-',''),admin=new pg.Pool({connectionString:url.href,max:1});
const pgVersion=Number((await admin.query("SELECT current_setting('server_version_num') AS version")).rows[0].version);check(pgVersion>=170000&&pgVersion<180000,'postgres_17_required');
// The child intentionally receives a minimal environment. Preserve the already
// authenticated local test role explicitly rather than relying on inherited USER.
if(!url.username)url.username=(await admin.query('SELECT current_user AS role')).rows[0].role;
const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const origin=`http://127.0.0.1:${port}`,instanceId=randomUUID();
await mkdir(path.join(root,'.local/learner-flow'),{recursive:true,mode:0o700});const state=await mkdtemp(path.join(root,'.local/learner-flow/run-'));
await admin.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options',`-csearch_path=${schema}`);const db=new pg.Pool({connectionString:url.href,max:2});
const childEnv={PATH:process.env.PATH,DATABASE_URL:url.href,PUBLIC_ORIGIN:origin,API_HOST:'127.0.0.1',PORT:String(port),CORE_INSTANCE_ID:instanceId,LEARNER_WEB_DIR:path.join(runtime,'apps/learner/dist'),CODE_FIXTURE_FILES:JSON.stringify(registryMetadata.registries.map(r=>path.join(root,r.file))),ADAPTATION_ADAPTERS:JSON.stringify(['bounded-numeric-v1','authored-bank-v1','authored-code-bank-v1','authored-teaching-bank-v1']),SANDBOX_STORAGE_DIR:path.join(state,'sandbox'),...(verifierFile?{TEACHING_VERIFIER_FILES:JSON.stringify([verifierFile])}:{})};
const server=spawn(process.execPath,['--max-old-space-size=512','services/api/dist/main.js'],{cwd:runtime,env:childEnv,stdio:['ignore','pipe','pipe']});let childExit=false,output='';server.once('exit',()=>{childExit=true;});server.once('error',()=>{childExit=true;});for(const pipe of [server.stdout,server.stderr])pipe.on('data',b=>{output=(output+b.toString()).slice(-65536);});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let n=0;n<120;n++){check(!childExit,'released_api_startup_failed');try{const r=await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).instanceId===instanceId)return;}catch{}await pause(100);}throw new Failure('released_api_readiness_timeout');}
async function request(session,method,route,body,extra={}){
  const response=await fetch(origin+route,{method,headers:{origin,cookie:session?.cookie??'','x-csrf-token':session?.csrf??'','content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)}).catch(error=>{throw new Error(`${method} ${route.replace(/[0-9a-f-]{36}/g,':id')}: ${error?.name}: ${error?.message}`,{cause:error});});let value;try{value=await response.json();}catch{throw new Failure('invalid_api_response');}
  return {status:response.status,value,cookies:response.headers.getSetCookie()};
}
const requireOk=(r,code)=>{check(r.status===200,`${code}_${r.status}_${r.value?.error??'failed'}`);return r.value;};
// Core 0.1.36+: password sign-in. One-time codes stay at Core's default (off).
async function bootstrap(subject,role,signIn=true){
  const password=harnessPassword();
  const record=JSON.parse(await runWithPassword(process.execPath,['services/api/dist/bootstrap-cli.js','private-flow',subject,'Acceptance learner','--password','--login',subject],{cwd:runtime,env:childEnv,password}));
  check(record.loginName===subject&&!('oneTimeSignInUrl' in record),'bootstrap_password_account');
  if(role==='learner')await db.query("UPDATE memberships SET role='learner' WHERE workspace_id=$1 AND user_id=$2",[record.workspaceId,record.userId]);
  if(!signIn)return {...record,password};
  const r=await request(null,'POST','/auth/login',{login:record.loginName,password});requireOk(r,'sign_in');
  return {...record,cookie:r.cookies.map(c=>c.split(';')[0]).join('; '),csrf:r.value.csrfToken};
}
async function signInChecks(){
  const options=requireOk(await request(null,'GET','/auth/options'),'auth_options');check(options.loginCodes===false,'login_codes_not_off_by_default');
  const code=await request(null,'POST','/auth/redeem',{token:'A'.repeat(43)});check(code.status===403&&code.value?.error==='LOGIN_CODES_DISABLED','login_codes_not_refused');
  const owner=await bootstrap('private-signin-probe','learner',false),wrong=await request(null,'POST','/auth/login',{login:owner.loginName,password:harnessPassword()});
  check(wrong.status===401&&wrong.value?.error==='LOGIN_FAILED'&&!wrong.cookies.length,'wrong_password_not_refused');
}

let releaseId,teacher,browser;
const reports=[];
try{
  await ready();await signInChecks();teacher=await bootstrap('private-acceptance-owner','owner');
  const adapters=requireOk(await request(teacher,'GET','/api/runtime/adaptation-adapters'),'runtime_descriptors').adapters;
  check(configuration.profiles.every(p=>adapters.some(a=>a.id===p.adapterId&&a.implementationDigest===p.adapterDigest)),'installed_creator_digest_mismatch');
  const extensions=requireOk(await request(teacher,'GET','/api/runtime/extensions'),'runtime_extensions').extensions;check(registryMetadata.registries.every(r=>extensions.some(e=>e.id===r.id&&e.codeReady&&e.integrity==='sha256-'+r.sha256)),'code_grader_not_ready');
  for(const declared of course.extensions.filter(e=>course.assessments.some(a=>a.type==='rubric'&&a.grading.evaluatorId===e.id)))check(extensions.some(e=>e.id===declared.id&&e.integrity===declared.integrity),'rubric_evaluator_not_installed');
  releaseId=requireOk(await request(teacher,'POST',`/api/workspaces/${teacher.workspaceId}/releases`,course),'course_import').id;
  const catalog=requireOk(await request(teacher,'GET','/api/admin/session'),'admin_session').courses[0];check(catalog,'catalog_missing');
  for(const action of ['submit-review','approve','publish']){
    const view=requireOk(await request(teacher,'GET',`/api/admin/courses/${catalog.id}`),'course_review');
    requireOk(await request(teacher,'POST',`/api/admin/courses/${catalog.id}/releases/${releaseId}/transitions`,{action},{'if-match':view.revision,'idempotency-key':randomUUID()}),'review_transition');
  }
  requireOk(await request(teacher,'POST',`/api/admin/releases/${releaseId}/adaptation-registry`,{expectedRegistryRevision:0,configuration}),'approve_recovery');
  reports.push({flow:'placement_settings',...await enablePlacement({request,requireOk,check,staff:teacher,catalogId:catalog.id})});
  const snapshot=async l=>requireOk(await request(l,'GET',`/api/enrollments/${l.enrollmentId}`),'snapshot');
  const command=async(l,action,body)=>{const s=await snapshot(l);return requireOk(await request(l,'POST',`/api/enrollments/${l.enrollmentId}/${action}`,{expectedRevision:s.revision,idempotencyKey:randomUUID(),...body}),action);};
  const enroll=async subject=>{const l=await bootstrap(subject,'learner');l.enrollmentId=requireOk(await request(l,'POST','/api/enrollments',{releaseId}),'enrollment').id;return l;};
  const answer=async(l,episode,assessment,value)=>{
    const c=await command(l,'challenges',{episodeId:episode.id,assessmentId:assessment.id,mode:'independent'});check(!('grading' in c.question)&&!('familyId' in c.question),'question_key_leak');return command(l,'answers',{challengeId:c.challengeId,answer:value});
  };
  const authoredAnswer=a=>a.type==='code'?candidate:a.type==='rubric'?writtenAnswers[a.id].text:a.type==='choice'?a.grading.correctOptionId:a.grading.expected;
  const fresh=async(l,episode,family)=>{
    const s=await snapshot(l),body={expectedRevision:s.revision,expectedPlanRevision:s.planRevision,idempotencyKey:randomUUID(),episodeId:episode.id,objectiveId:family.objectiveIds[0],familyId:family.familyId,mode:'independent'};
    const r=await request(l,'POST',`/api/enrollments/${l.enrollmentId}/adaptation/fresh-question`,body);
    return {response:r,body};
  };
  if(browserMode){
    const {browserAcceptance}=await import('./learner-browser.mjs');reports.push(await browserAcceptance({origin,bootstrap,request,requireOk,course,candidate,check,state}));
  }else{
  const first=await enroll('private-full-path');let recovered=0,written=0;
  for(const episode of course.chapters.flatMap(c=>c.episodes)){
    const episodeStarted=performance.now();
    const before=await snapshot(first);check(before.nextEpisodeId===episode.id,'linear_path_wrong');
    const bypass=await request(first,'POST',`/api/enrollments/${first.enrollmentId}/complete`,{expectedRevision:before.revision,idempotencyKey:randomUUID(),episodeId:episode.id});check(bypass.status===409,'unearned_completion_accepted');
    for(const block of episode.blocks)if(!['assessment','activity'].includes(block.type))await command(first,'read',{episodeId:episode.id,blockId:block.id});
    const gate=course.gates.find(g=>g.id===episode.gateId),families=new Map();for(const a of course.assessments.filter(a=>gate.assessmentIds.includes(a.id))){const values=families.get(a.familyId)??[];values.push(a);families.set(a.familyId,values);}
    for(const values of families.values()){
      const a=values[0];
      // A written explanation waits for a person; it must never decide or block the gate.
      if(a.type==='rubric'){const result=await answer(first,episode,a,authoredAnswer(a));check(result.result.pendingReview&&!result.result.passed&&result.result.independent,'written_answer_not_pending');written++;continue;}
      if(a.type!=='code'){const result=await answer(first,episode,a,authoredAnswer(a));check(result.result.passed&&result.result.independent,'baseline_evidence_failed');continue;}
      for(const original of values){const wrong=await answer(first,episode,original,'def solve(data): return None');check(!wrong.result.passed,'bad_code_accepted');}
      const corrected=await answer(first,episode,a,candidate);check(corrected.result.passed&&!corrected.result.independent,'corrected_repeat_credited');
      const replacement=await fresh(first,episode,a),issued=requireOk(replacement.response,'fresh_code');check(issued.independentEligible&&issued.question.type==='code'&&!('grading' in issued.question),'fresh_code_projection');
      const replay=requireOk(await request(first,'POST',`/api/enrollments/${first.enrollmentId}/adaptation/fresh-question`,replacement.body),'fresh_replay');check(isDeepStrictEqual(replay,issued),'fresh_replay_changed');
      const failed=await command(first,'answers',{challengeId:issued.challengeId,answer:'def solve(data): return None'});check(!failed.result.passed,'bad_recovery_accepted');
      const next=requireOk((await fresh(first,episode,a)).response,'second_fresh_code');check(next.question.id!==issued.question.id,'fresh_variant_reused');
      const passed=await command(first,'answers',{challengeId:next.challengeId,answer:candidate});check(passed.result.passed&&passed.result.independent,'fresh_code_evidence_failed');recovered++;
      const state=await snapshot(first),objective=state.lessons.find(l=>l.id===episode.id).gate.objectives[0];check(objective.required===3&&objective.families.includes(a.familyId),'practical_gate_weakened');
    }
    const completed=await command(first,'complete',{episodeId:episode.id}),count=completed.lessons.filter(l=>l.status==='completed').length;
    console.log(JSON.stringify({episodeTiming:'full_course',episode:count,episodeId:episode.id,ms:Math.round(performance.now()-episodeStarted)}));
    if(count%14===0)console.log(JSON.stringify({checkpoint:'full_course_progress',completedEpisodes:count,recoveredPracticalFamilies:recovered}));
  }
  const end=await snapshot(first);check(end.nextEpisodeId===null&&end.complete===true&&end.lessons.filter(l=>l.status==='completed').length===56&&recovered===3&&written===course.assessments.filter(a=>a.type==='rubric').length,'full_course_path_incomplete');
  const reservationRows=(await db.query('SELECT snapshot FROM policy_states WHERE enrollment_id=$1',[first.enrollmentId])).rows[0].snapshot.reservations,committed=reservationRows.filter(r=>r.state==='committed');check(committed.length===6,'recovery_cost_receipts_missing');
  check(committed.reduce((n,r)=>n+r.work.additionalMinutes,0)===270&&committed.reduce((n,r)=>n+r.work.additionalEpisodes,0)===6,'recovery_cost_terms_changed');
  reports.push({flow:'all_56_episodes_with_recovery',episodes:56,practicalFamiliesRecovered:recovered,committedRecoveryAssignments:6,unearnedCompletionRejectedEveryEpisode:true,writtenExplanationsPendingWithoutBlocking:written});
  // Separate learner proves a finite bank can end without silently granting credit.
  const exhausted=await enroll('private-exhaustion');
  for(const episode of course.chapters.flatMap(c=>c.episodes)){
    for(const block of episode.blocks)if(!['assessment','activity'].includes(block.type))await command(exhausted,'read',{episodeId:episode.id,blockId:block.id});
    const gate=course.gates.find(g=>g.id===episode.gateId),items=course.assessments.filter(a=>gate.assessmentIds.includes(a.id));
    if(items.some(a=>a.type==='code')){
      const family=items.find(a=>a.type==='code');
      for(const a of items)await answer(exhausted,episode,a,a.type==='code'?'def solve(data): return None':authoredAnswer(a));
      for(let n=0;n<2;n++){const issued=requireOk((await fresh(exhausted,episode,family)).response,'exhaustion_fresh');await command(exhausted,'answers',{challengeId:issued.challengeId,answer:'def solve(data): return None'});}
      const before=await snapshot(exhausted),beforePolicy=(await db.query('SELECT snapshot FROM policy_states WHERE enrollment_id=$1',[exhausted.enrollmentId])).rows[0].snapshot,denied=(await fresh(exhausted,episode,family)).response,after=await snapshot(exhausted),afterPolicy=(await db.query('SELECT snapshot FROM policy_states WHERE enrollment_id=$1',[exhausted.enrollmentId])).rows[0].snapshot;
      check(denied.status===409&&denied.value.error==='APPROVED_FRESH_VARIANT_EXHAUSTED','exhausted_bank_reused');check(before.recovery[0].freshCheck===null&&!before.lessons.find(l=>l.id===episode.id).gate.passed,'exhausted_recovery_guidance_wrong');check(before.planRevision===after.planRevision&&before.revision===after.revision,'exhausted_request_mutated_state');
      check(isDeepStrictEqual(beforePolicy,afterPolicy),'exhausted_request_charged_policy');
      reports.push({flow:'failed_finite_bank',replacements:2,gateUnchanged:true,noFurtherCharge:true,unavailableExplained:true});break;
    }
    const seen=new Set();for(const a of items)if(!seen.has(a.familyId)){seen.add(a.familyId);await answer(exhausted,episode,a,authoredAnswer(a));}
    await command(exhausted,'complete',{episodeId:episode.id});
  }
  }
  check(requireOk(await request(teacher,'GET','/api/enrollments'),'owner_enrollments').length===0,'operator_course_clock_started');
  await writeFile(path.join(state,'acceptance.json'),JSON.stringify({observedAt:new Date().toISOString(),coreVersion:manifest.version,releaseReceipt,courseVersion:course.version,courseDigest:compiled.digest,workedExampleCapability:workedCourse,storage:'actual_postgresql',execution:'actual_released_http_and_isolated_python',reports,ownerUnenrolled:true,liveProviderAcceptance:false},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({verified:true,coreVersion:manifest.version,releaseReceipt,courseVersion:course.version,reports,ownerUnenrolled:true,liveProviderAcceptance:false}));
}catch(error){await writeFile(path.join(state,'failure.json'),JSON.stringify({code:error instanceof Failure?error.code:'private_acceptance_failed',type:error?.name,detailCode:error?.code,message:String(error?.message??'').slice(0,2000)})+'\n',{mode:0o600});console.error(error instanceof Failure?error.code:'private_acceptance_failed');process.exitCode=1;
}finally{
  if(!childExit){server.kill('SIGTERM');for(let i=0;i<50&&!childExit;i++)await pause(100);if(!childExit){server.kill('SIGKILL');for(let i=0;i<20&&!childExit;i++)await pause(100);}}
  if(!childExit)throw new Failure('owned_api_shutdown_unconfirmed');
  await db.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
  await writeFile(path.join(state,'service.log'),output,{mode:0o600});
}
