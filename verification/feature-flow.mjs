// Released-surface acceptance of the course 0.1.6 learner-evidence features:
// placement decline and accept, a written answer reviewed by a second staff account,
// a delayed retention check and a reviewed remedial episode insertion. Uses only the
// released bootstrap CLI and HTTP routes; no Core module import, no database write.
// Two harness-level stand-ins are explicit and documented: a process clock offset for
// the one retention request (harness-clock.mjs) and a scripted model reached through
// the API process's HTTPS proxy settings (synthetic-model.mjs).
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createServer} from 'node:net';
import pg from 'pg';
import {verifyReleasedRuntime,expectedCoreRelease} from './released-runtime.mjs';
import {stageWorkedExamples} from '../scripts/stage-worked-examples.mjs';
import {writtenAnswers} from './written-answers.mjs';
import {enablePlacement} from './placement-settings.mjs';
import {instantiateNumericalRecipe} from '@course-core/sdk';
import {startSyntheticModel} from './synthetic-model.mjs';
import {harnessPassword,runWithPassword} from './password-login.mjs';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
class Failure extends Error {constructor(code){super(code);this.code=code;}}
const check=(condition,code)=>{if(!condition)throw new Failure(code);};
const args=process.argv.slice(2);check(args.length===5&&args[0]==='--runtime-dir'&&args[2]==='--release-dir'&&args[4]==='--worked-course','usage_runtime_release_dirs_and_worked_course');
const runtime=path.resolve(args[1]),manifest=JSON.parse(await readFile(path.join(runtime,'package.json'),'utf8'));check(manifest.name==='@course-core/repository'&&manifest.version===expectedCoreRelease.version,'released_runtime_version_required');
const releaseReceipt=await verifyReleasedRuntime(runtime,path.resolve(args[3]));
check(process.env.TEST_DATABASE_URL&&!process.env.DATABASE_URL,'disposable_database_required');
const url=new URL(process.env.TEST_DATABASE_URL);check(['postgres:','postgresql:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&/^\/course_core_(?:ci|test(?:_[a-z0-9_]+)?)$/.test(url.pathname)&&!url.search&&!url.hash,'disposable_database_required');
const worked=await stageWorkedExamples(),compiled=worked.compiled,course=compiled.server,configuration=worked.proposedRegistry;
const verifierFile=path.join(root,'.local/generated-teaching/verifier.json');await mkdir(path.dirname(verifierFile),{recursive:true,mode:0o700});await writeFile(verifierFile,worked.bytes,{mode:0o600});
const candidate=(await exec('python3',['-B','-c',"import importlib.util;s=importlib.util.spec_from_file_location('r','runtime/recovery-code-reference.py');r=importlib.util.module_from_spec(s);s.loader.exec_module(r);print(r.candidate_source())"],{cwd:root,maxBuffer:64000})).stdout;
const registryMetadata=JSON.parse(await readFile(path.join(root,'runtime/practical-registries.json'),'utf8'));
for(const r of registryMetadata.registries){const bytes=await readFile(path.join(root,r.file));check(bytes.length===r.bytes&&createHash('sha256').update(bytes).digest('hex')===r.sha256,'qualified_registry_bytes_changed');}
const schema='course_feature_flow_'+randomUUID().replaceAll('-',''),admin=new pg.Pool({connectionString:url.href,max:1});
const pgVersion=Number((await admin.query("SELECT current_setting('server_version_num') AS version")).rows[0].version);check(pgVersion>=170000&&pgVersion<180000,'postgres_17_required');
if(!url.username)url.username=(await admin.query('SELECT current_user AS role')).rows[0].role;
const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const origin=`http://127.0.0.1:${port}`,instanceId=randomUUID(),serviceToken=randomUUID()+randomUUID();
await mkdir(path.join(root,'.local/feature-flow'),{recursive:true,mode:0o700});const state=await mkdtemp(path.join(root,'.local/feature-flow/run-'));
await mkdir(path.join(state,'vault'),{mode:0o700});await mkdir(path.join(state,'model'),{mode:0o700});
const clockFile=path.join(state,'clock-offset');await writeFile(clockFile,'0',{mode:0o600});
await admin.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options',`-csearch_path=${schema}`);

// The scripted supervisor model: list reviewed support, choose the remedial episode it
// lists for the current episode, then finish. It never sees or returns grading data.
const remedialChoice={profileId:null,entryId:null};
const model=await startSyntheticModel(path.join(state,'model'),prompt=>{
  const last=prompt.toolResults.at(-1);
  if(!last)return {decision:'tool',tool:'list_support',argumentsJson:'{}',summary:''};
  if(last.tool==='list_support'){
    const profile=last.result.profiles?.find(p=>p.operation==='insert_episode'),item=profile?.items.find(i=>i.kind==='episode');
    if(!item)return {decision:'finish',tool:'none',argumentsJson:'{}',summary:'No reviewed remedial episode is available for this episode.'};
    Object.assign(remedialChoice,{profileId:profile.id,entryId:item.id});
    return {decision:'tool',tool:'choose_support',argumentsJson:JSON.stringify(remedialChoice),summary:''};
  }
  return {decision:'finish',tool:'none',argumentsJson:'{}',summary:'Insert the reviewed remedial episode after the current episode; it is optional and grants no credit.'};
});

const baseEnv={PATH:process.env.PATH,DATABASE_URL:url.href,PUBLIC_ORIGIN:origin};
// Core 0.1.36+: password sign-in; one-time codes stay at Core's default (off).
const ownerPassword=harnessPassword();
const bootstrapOwner=JSON.parse(await runWithPassword(process.execPath,['services/api/dist/bootstrap-cli.js','feature-flow','feature-flow-owner','Acceptance owner','--password','--login','feature-flow-owner'],{cwd:runtime,env:baseEnv,password:ownerPassword}));
check(bootstrapOwner.loginName==='feature-flow-owner'&&!('oneTimeSignInUrl' in bootstrapOwner),'bootstrap_password_account');
const workspaceId=bootstrapOwner.workspaceId;
const childEnv={...baseEnv,API_HOST:'127.0.0.1',PORT:String(port),CORE_INSTANCE_ID:instanceId,LEARNER_WEB_DIR:path.join(runtime,'apps/learner/dist'),
  CODE_FIXTURE_FILES:JSON.stringify(registryMetadata.registries.map(r=>path.join(root,r.file))),TEACHING_VERIFIER_FILES:JSON.stringify([verifierFile]),
  ADAPTATION_ADAPTERS:JSON.stringify(['bounded-numeric-v1','authored-bank-v1','authored-code-bank-v1','authored-teaching-bank-v1']),SANDBOX_STORAGE_DIR:path.join(state,'sandbox'),
  SUPERVISOR_HOST_TOKEN:serviceToken,SUPERVISOR_WORKSPACE_IDS:workspaceId,PROVIDER_VAULT_DIRECTORY:path.join(state,'vault'),
  NODE_USE_ENV_PROXY:'1',HTTPS_PROXY:model.proxyUrl,NO_PROXY:'127.0.0.1,localhost',NODE_EXTRA_CA_CERTS:model.ca,HARNESS_CLOCK_FILE:clockFile};
const server=spawn(process.execPath,['--import',pathToFileURL(path.join(root,'verification/harness-clock.mjs')).href,'--max-old-space-size=512','services/api/dist/main.js'],{cwd:runtime,env:childEnv,stdio:['ignore','pipe','pipe']});
let childExit=false,output='';server.once('exit',()=>{childExit=true;});server.once('error',()=>{childExit=true;});for(const pipe of [server.stdout,server.stderr])pipe.on('data',b=>{output=(output+b.toString()).slice(-65536);});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let n=0;n<150;n++){check(!childExit,'released_api_startup_failed');try{const r=await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).instanceId===instanceId)return;}catch{}await pause(100);}throw new Failure('released_api_readiness_timeout');}
async function request(session,method,route,body,extra={}){
  const response=await fetch(origin+route,{method,headers:{origin,cookie:session?.cookie??'','x-csrf-token':session?.csrf??'','content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});let value;try{value=await response.json();}catch{throw new Failure('invalid_api_response_'+route);}
  return {status:response.status,value,cookies:response.headers.getSetCookie()};
}
const requireOk=(r,code)=>{check(r.status===200,`${code}_${r.status}_${r.value?.error??'failed'}`);return r.value;};
const refused=(r,status,error,code)=>check(r.status===status&&r.value?.error===error,`${code}_${r.status}_${r.value?.error??'accepted'}`);
async function signIn(login,password,extra={},newPassword){const r=await request(null,'POST','/auth/login',{login,password,...(newPassword?{newPassword}:{})});requireOk(r,'sign_in');return {...extra,cookie:r.cookies.map(c=>c.split(';')[0]).join('; '),csrf:r.value.csrfToken,exposed:new Set()};}
const bridge=async body=>{const r=await request(null,'POST','/v1/supervisor/bridge',body,{authorization:'Bearer '+serviceToken});return requireOk(r,'bridge_'+(body.command?.type??body.method));};
async function setClock(ms){await writeFile(clockFile,String(ms),{mode:0o600});server.kill('SIGUSR2');await pause(300);}

const reports={};let owner;
try{
  await ready();
  owner=await signIn(bootstrapOwner.loginName,ownerPassword,{userId:bootstrapOwner.userId});
  const adapters=requireOk(await request(owner,'GET','/api/runtime/adaptation-adapters'),'runtime_descriptors').adapters;
  check(configuration.profiles.every(p=>adapters.some(a=>a.id===p.adapterId&&a.implementationDigest===p.adapterDigest)),'installed_creator_digest_mismatch');
  const extensions=requireOk(await request(owner,'GET','/api/runtime/extensions'),'runtime_extensions').extensions;
  for(const declared of course.extensions.filter(e=>e.id==='course-core-reviewed-rubric'))check(extensions.some(e=>e.id===declared.id&&e.integrity===declared.integrity),'declared_extension_not_installed_'+declared.id);
  // Evidence for the reported gap: the released setup route accepts only the Google kind.
  const nonGoogle=await request(owner,'POST',`/api/admin/workspaces/${workspaceId}/provider-setup`,{expectedRevision:0,idempotencyKey:randomUUID(),
    configuration:{registry:{revision:'probe',models:[]},adapters:[{id:'local-scripted',kind:'scripted',credentialEnv:'COURSE_PROVIDER_LOCAL_API_KEY'}],roles:{}},
    jobPolicy:{allowance:{microUsd:1,tokens:1},durationMs:1000,timeoutMs:100,maxAttempts:1},credentials:{}});
  check(nonGoogle.status!==200,'non_google_provider_accepted');
  // Provider setup first: saving it cancels pending supervisor jobs.
  requireOk(await request(owner,'POST',`/api/admin/workspaces/${workspaceId}/provider-setup`,{expectedRevision:0,idempotencyKey:randomUUID(),
    configuration:{registry:{revision:'synthetic-acceptance',models:[{id:'synthetic-planner',providerId:'synthetic-google',remoteModel:'synthetic-planner',providerConfig:{apiVersion:'v1beta',transport:'generate_content',maxResponseBytes:1000000},enabled:true,capabilities:['structured_assessment'],limits:{maxInputCharacters:40000,maxOutputTokens:2000}}]},
      adapters:[{id:'synthetic-google',kind:'google',credentialEnv:'GOOGLE_API_KEY'}],roles:{supervisor:{modelId:'synthetic-planner',maxInputCharacters:30000,maxOutputTokens:1000,maxToolRounds:4}}},
    jobPolicy:{allowance:{microUsd:100000,tokens:1200000},durationMs:300000,timeoutMs:60000,maxAttempts:3},credentials:{GOOGLE_API_KEY:'synthetic-acceptance-only'}}),'provider_setup');
  // Core 0.1.39+: paid work is refused until the operator prices each bound model (no
  // built-in price list). Check the default refusal rule, then enter a synthetic price.
  const pricingRoute=`/api/admin/workspaces/${workspaceId}/provider-pricing`,unpriced=requireOk(await request(owner,'GET',pricingRoute),'pricing_view');
  check(unpriced.requirePricing===true&&unpriced.builtInPrices===false&&!unpriced.models.find(m=>m.modelId==='synthetic-planner')?.coverage?.some(c=>c.priced),'pricing_not_required_by_default');
  requireOk(await request(owner,'POST',pricingRoute,{idempotencyKey:randomUUID(),modelId:'synthetic-planner',expectedVersion:0,status:'active',currency:'USD',inputMicroUsdPerMillionTokens:1000000,outputMicroUsdPerMillionTokens:2000000,cachedInputMicroUsdPerMillionTokens:null,microUsdPerRequest:null,microUsdPerOutputSecond:null,effectiveFrom:new Date(Date.now()-60000).toISOString(),sourceNote:'synthetic acceptance price'}),'pricing_entry');
  check(requireOk(await request(owner,'GET',pricingRoute),'pricing_view').models.find(m=>m.modelId==='synthetic-planner')?.coverage?.some(c=>c.role==='supervisor'&&c.priced),'pricing_not_in_force');
  reports.operatorModelPrice={refusedWithoutPriceByDefault:true,pricedModel:'synthetic-planner'};
  // Publish the staged course through the ordinary review lifecycle and approve its registry.
  const releaseId=requireOk(await request(owner,'POST',`/api/workspaces/${workspaceId}/releases`,course),'course_import').id;
  const catalog=requireOk(await request(owner,'GET','/api/admin/session'),'admin_session').courses[0];check(catalog,'catalog_missing');
  for(const action of ['submit-review','approve','publish']){
    const view=requireOk(await request(owner,'GET',`/api/admin/courses/${catalog.id}`),'course_review');
    requireOk(await request(owner,'POST',`/api/admin/courses/${catalog.id}/releases/${releaseId}/transitions`,{action},{'if-match':view.revision,'idempotency-key':randomUUID()}),'review_transition');
  }
  requireOk(await request(owner,'POST',`/api/admin/releases/${releaseId}/adaptation-registry`,{expectedRegistryRevision:0,configuration}),'approve_registry');
  reports.placementSettings=await enablePlacement({request,requireOk,check,staff:owner,catalogId:catalog.id});
  // Accounts are created over the People API: a reviewer, an instructor and learners.
  // Invitations carry a login name and a server-generated temporary password that must be changed at first sign-in.
  const invite=async(role,displayName)=>{
    const loginName=`ff-${role}-${randomUUID().slice(0,8)}`,v=requireOk(await request(owner,'POST',`/api/admin/workspaces/${workspaceId}/people`,{displayName,role,loginName,idempotencyKey:randomUUID()}),'invite_'+role);
    check(!('signIn' in v)&&v.password?.loginName===loginName&&v.password.mustChangeOnNextSignIn===true,'invite_temporary_password');
    const temporary=v.password.temporaryPassword;refused(await request(null,'POST','/auth/login',{login:loginName,password:temporary}),409,'PASSWORD_CHANGE_REQUIRED','temporary_password_must_change');
    return signIn(loginName,temporary,{userId:v.userId,role},harnessPassword());
  };
  const snapshot=async l=>requireOk(await request(l,'GET',`/api/enrollments/${l.enrollmentId}`),'snapshot');
  const command=async(l,action,body)=>{const s=await snapshot(l);return requireOk(await request(l,'POST',`/api/enrollments/${l.enrollmentId}/${action}`,{expectedRevision:s.revision,idempotencyKey:randomUUID(),...body}),action.replaceAll('/','_'));};
  const attempt=async(l,action,body)=>{const s=await snapshot(l);return request(l,'POST',`/api/enrollments/${l.enrollmentId}/${action}`,{expectedRevision:s.revision,idempotencyKey:randomUUID(),...body});};
  const enroll=async l=>{l.enrollmentId=requireOk(await request(l,'POST','/api/enrollments',{releaseId}),'enrollment').id;return l;};
  const episodes=course.chapters.flatMap(c=>c.episodes),byId=id=>episodes.find(e=>e.id===id),item=id=>course.assessments.find(a=>a.id===id);
  const correct=a=>a.type==='code'?candidate:a.type==='rubric'?writtenAnswers[a.id].text:a.type==='choice'?a.grading.correctOptionId:a.grading.expected;
  const wrong=a=>a.type==='choice'?a.options.find(o=>o.id!==a.grading.correctOptionId).id:a.grading.expected+7;
  const issue=async(l,body)=>{const c=await command(l,'challenges',body);check(!('grading' in c.question)&&!('familyId' in c.question),'question_key_leak');l.exposed.add(c.question.id);return c;};
  const answer=async(l,episodeId,assessmentId,value,mode='independent')=>{const c=await issue(l,{episodeId,assessmentId,mode});return command(l,'answers',{challengeId:c.challengeId,answer:value});};
  const fresh=async(l,episode,family)=>{const s=await snapshot(l);const r=await request(l,'POST',`/api/enrollments/${l.enrollmentId}/adaptation/fresh-question`,{expectedRevision:s.revision,expectedPlanRevision:s.planRevision,idempotencyKey:randomUUID(),episodeId:episode.id,objectiveId:family.objectiveIds[0],familyId:family.familyId,mode:'independent'});return requireOk(r,'fresh_question');};
  const readAll=async(l,episode)=>{for(const block of episode.blocks)if(!['assessment','activity'].includes(block.type))await command(l,'read',{episodeId:episode.id,blockId:block.id});};
  // The harness knows the approved registry, so it can answer a served fresh variant:
  // a reviewed bank item by its exact prompt, a recipe variant by re-instantiating it.
  async function freshAnswer(question){
    for(const profile of configuration.profiles)for(const entry of profile.bank??[])if(entry.assessment.prompt===question.prompt&&entry.assessment.type!=='code')return correct(entry.assessment);
    for(const recipe of course.adaptation.numericalRecipes){
      const space=recipe.variables.reduce((n,v)=>n*(v.maximum-v.minimum+1),1);
      for(let ordinal=0;ordinal<space;ordinal++){let rest=ordinal;const variables={};for(const v of recipe.variables){const w=v.maximum-v.minimum+1;variables[v.name]=v.minimum+rest%w;rest=Math.floor(rest/w);}
        const made=await instantiateNumericalRecipe(recipe,variables);if(made.prompt===question.prompt)return made.value;}
    }
    if(question.type==='code')return candidate;
    throw new Failure('fresh_variant_unknown');
  }
  // Earn a gate from its deterministic families: unseen items first, a fresh verified variant otherwise.
  async function passEpisode(l,episode){
    await readAll(l,episode);
    const gate=course.gates.find(g=>g.id===episode.gateId);
    for(const family of [...new Set(gate.assessmentIds.map(id=>item(id).familyId))]){
      const items=gate.assessmentIds.map(item).filter(a=>a.familyId===family);if(items[0].type==='rubric')continue;
      const s=await snapshot(l);if(s.lessons.find(x=>x.id===episode.id).gate.objectives.every(o=>o.families.includes(family)))continue;
      const unseen=items.find(a=>!l.exposed.has(a.id));
      if(unseen){const r=await answer(l,episode.id,unseen.id,correct(unseen));check(r.result.passed&&r.result.independent,'gate_evidence_failed_'+unseen.id);continue;}
      const issued=await fresh(l,episode,items[0]);l.exposed.add(issued.question.id);
      const r=await command(l,'answers',{challengeId:issued.challengeId,answer:await freshAnswer(issued.question)});check(r.result.passed&&r.result.independent,'fresh_evidence_failed_'+family);
    }
    check((await snapshot(l)).lessons.find(x=>x.id===episode.id).gate.passed,'gate_not_passed_'+episode.id);
    await command(l,'complete',{episodeId:episode.id});
  }
  const DAY=86_400_000,remedial=JSON.parse(await readFile(path.join(root,'content/remedial-episodes.json'),'utf8'));
  const placementView=async l=>requireOk(await request(l,'GET',`/api/enrollments/${l.enrollmentId}/placement`),'placement_view');
  const retentionView=async l=>requireOk(await request(l,'GET',`/api/enrollments/${l.enrollmentId}/retention`),'retention_view');
  async function takePlacement(l,wrongAt){
    await command(l,'placement/start',{});let items=0;
    for(;;){
      const next=(await placementView(l)).run.nextItem;if(!next)break;
      const a=item(next.assessmentId);check(course.placement.assessmentIds.includes(a.id),'placement_item_outside_declaration');
      const c=await issue(l,{episodeId:next.episodeId,assessmentId:next.assessmentId,mode:'placement'});check(c.independentEligible,'placement_item_not_independent');
      const r=await command(l,'answers',{challengeId:c.challengeId,answer:next.episodeId===wrongAt?wrong(a):correct(a)});items++;
      check(r.result.passed===(next.episodeId!==wrongAt),'placement_grading_wrong');
    }
    return items;
  }
  reports.setup={releaseId,nonGoogleProviderKindRefused:`${nonGoogle.status} ${nonGoogle.value?.error}`,courseVersion:course.version,profiles:configuration.profiles.length,visuals:course.visuals.length,publishedWithAllIllustrations:true};

  // 1. Remedial episode: a learner at the strides episode misses a check; after opt-in the
  // supervisor (scripted model) chooses the reviewed remedial episode and the released
  // bridge verifies and applies it after the anchor episode.
  const remedialLearner=await enroll(await invite('learner','Remedial learner'));
  await command(remedialLearner,'placement/decline',{});
  const anchor=byId('fnd-e02-02'),anchorIndex=episodes.indexOf(anchor),entry=remedial.entries.find(e=>e.anchorEpisodeId===anchor.id);
  for(const episode of episodes.slice(0,anchorIndex))await passEpisode(remedialLearner,episode);
  await readAll(remedialLearner,anchor);
  await command(remedialLearner,'supervision',{adaptiveTeaching:true});
  for(const enrollmentId of [undefined,remedialLearner.enrollmentId])requireOk(await request(owner,'POST',`/api/admin/workspaces/${workspaceId}/provider-setup/budgets`,{expectedRevision:0,idempotencyKey:randomUUID(),...(enrollmentId?{enrollmentId}:{}),limits:{microUsd:1000000,tokens:2000000},paidWorkApproved:true}),'budget');
  const numericItem=course.gates.find(g=>g.id===anchor.gateId).assessmentIds.map(item).find(a=>a.type==='numeric');
  check(!(await answer(remedialLearner,anchor.id,numericItem.id,wrong(numericItem))).result.passed,'wrong_answer_accepted');
  const leaseOwner=randomUUID(),jobs=[];
  for(let round=0;round<20;round++){
    const leases=await bridge({method:'outbox.claim',ownerId:leaseOwner,limit:100,leaseMs:60000});if(!leases.length)break;
    for(const lease of leases){jobs.push(...(await bridge({method:'outbox.prepare',eventId:lease.eventId,leaseToken:lease.leaseToken})).jobs);await bridge({method:'outbox.ack',eventId:lease.eventId,leaseToken:lease.leaseToken});}
  }
  const ref=jobs.filter(j=>j.enrollmentId===remedialLearner.enrollmentId).at(-1);check(ref,'supervisor_job_missing');
  const worker=randomUUID(),claimed=await bridge({method:'transition',command:{type:'claim',ref,checkpointId:'generate',ownerId:worker,availability:{status:'ready'}}});
  check(claimed.effect==='invoke',`supervisor_claim_${claimed.effect}_${claimed.snapshot.reason}`);
  const op=claimed.snapshot.operations.at(-1),spec=claimed.snapshot.specification;
  const outcome=requireOk(await request(null,'POST','/v1/operations',{schemaVersion:1,operationId:op.id,job:spec.key,role:'supervisor',checkpoint:spec.checkpoints[0],fence:spec.fence},{authorization:'Bearer '+serviceToken,'idempotency-key':op.id}),'gateway');
  check(outcome.status==='succeeded','model_operation_'+outcome.status);
  await bridge({method:'transition',command:{type:'settle',ref,operationId:op.id,ownerId:worker,outcome}});
  const verified=await bridge({method:'transition',command:{type:'verify',ref}}),applied=await bridge({method:'transition',command:{type:'apply',ref}});
  check(applied.snapshot.state==='applied','supervisor_plan_not_applied_'+applied.snapshot.state+'_'+applied.snapshot.reason);
  let view=await snapshot(remedialLearner);
  const chapter=view.course.chapters.find(c=>c.episodes.some(e=>e.id===anchor.id)),order=chapter.episodes.map(e=>e.id),insertedId=order[order.indexOf(anchor.id)+1],inserted=chapter.episodes.find(e=>e.id===insertedId);
  check(!course.chapters.flatMap(c=>c.episodes).some(e=>e.id===insertedId)&&inserted.title===entry.title&&!inserted.gateId&&JSON.stringify(inserted.blocks.map(b=>b.markdown))===JSON.stringify(entry.blocks.map(b=>b.markdown)),'remedial_episode_not_inserted');
  check(order.indexOf(anchor.id)+2===order.indexOf(episodes[anchorIndex+1].id),'remedial_episode_misplaced');
  const insertedLesson=view.lessons.find(x=>x.id===insertedId);check(insertedLesson.requirement==='optional'&&insertedLesson.status==='locked'&&insertedLesson.gate===null,'remedial_lesson_state_wrong');
  const changes=requireOk(await request(remedialLearner,'GET',`/api/enrollments/${remedialLearner.enrollmentId}/personal-changes`),'personal_changes').changes;
  check(changes.some(c=>c.kind==='insert_episode'&&c.episodeId===insertedId&&c.classification==='optional'&&c.hideable===true),'remedial_change_not_listed');
  const toolCalls=requireOk(await request(remedialLearner,'GET',`/api/enrollments/${remedialLearner.enrollmentId}/supervision/tools`),'supervisor_tools').calls;
  check(toolCalls.some(c=>c.tool==='choose_support'&&c.outcome.delivery==='applied'&&c.outcome.profileId===`profile-${entry.id}`),'remedial_choice_not_applied');
  await passEpisode(remedialLearner,anchor);
  view=await snapshot(remedialLearner);
  check(view.lessons.find(x=>x.id===insertedId).status==='available'&&view.nextEpisodeId===episodes[anchorIndex+1].id,'optional_remedial_episode_blocks_path');
  const gatesBefore=JSON.stringify(view.lessons.map(x=>x.gate));
  for(const block of inserted.blocks)await command(remedialLearner,'read',{episodeId:insertedId,blockId:block.id});
  await command(remedialLearner,'complete',{episodeId:insertedId});view=await snapshot(remedialLearner);
  check(view.lessons.find(x=>x.id===insertedId).status==='completed'&&JSON.stringify(view.lessons.map(x=>x.gate))===gatesBefore,'remedial_reading_changed_evidence');
  check(model.calls.length===3&&model.calls.every(c=>c.keyed&&!c.error)&&model.refused.length===0&&remedialChoice.entryId===entry.id,'synthetic_model_exchange_wrong');
  reports.remedialEpisode={anchorEpisodeId:anchor.id,insertedEpisodeId:insertedId,title:inserted.title,blocks:inserted.blocks.length,classification:'optional',
    supervisorTools:model.calls.map(c=>c.decision.tool),verification:verified.snapshot.verification?.outcome??verified.snapshot.state,applied:true,placedAfterAnchor:true,optionalNeverBlockedPath:true,readingCreatedNoEvidence:true,modelConnectionsOtherThanStandIn:model.refused.length};

  // 2. Placement declined: the path starts at the beginning and the offer ends once study starts.
  const decliner=await enroll(await invite('learner','Declining learner'));
  const offered=await placementView(decliner);check(offered.available&&offered.state==='offered'&&offered.declinable&&offered.maxItems===24&&offered.grantsCompletion===false,'placement_not_offered');
  check((await command(decliner,'placement/decline',{})).state==='declined'&&(await placementView(decliner)).state==='declined','placement_decline_failed');
  view=await snapshot(decliner);check(view.nextEpisodeId===episodes[0].id&&!view.lessons.some(x=>x.status==='placed'),'decline_changed_path');
  await command(decliner,'read',{episodeId:episodes[0].id,blockId:episodes[0].blocks.find(b=>b.type==='text').id});
  refused(await attempt(decliner,'placement/start',{}),409,'PLACEMENT_AFTER_STUDY','placement_after_study_allowed');
  reports.placementDeclined={state:'declined',startsAt:episodes[0].id,laterStartRefused:'PLACEMENT_AFTER_STUDY'};

  // 3. Placement accepted after a miss, then a delayed retention check on the episode studied.
  const placer=await enroll(await invite('learner','Placement learner')),stopAt='fnd-e03-03';
  const used=await takePlacement(placer,stopAt),run=(await placementView(placer)).run;
  check(run.stopReason==='not_demonstrated'&&run.proposal.exempt.length===10&&run.proposal.startEpisodeId===stopAt,'placement_proposal_wrong');
  const finished=await command(placer,'placement/finish',{});check(finished.exemptEpisodeIds.length===10&&finished.startEpisodeId===stopAt,'placement_finish_wrong');
  refused(await attempt(placer,'placement/accept',{startEpisodeId:'fnd-e03-04'}),409,'PLACEMENT_START_NOT_ALLOWED','placement_skip_past_start');
  const accepted=await command(placer,'placement/accept',{startEpisodeId:stopAt});check(accepted.placedEpisodeIds.length===10&&accepted.nextEpisodeId===stopAt,'placement_accept_wrong');
  view=await snapshot(placer);check(view.lessons.filter(x=>x.status==='placed').length===10&&view.nextEpisodeId===stopAt,'placed_lessons_wrong');
  reports.placementAccepted={itemsUsed:used,stopReason:run.stopReason,placedEpisodes:accepted.placedEpisodeIds.length,startEpisodeId:stopAt,skipPastProposalRefused:'PLACEMENT_START_NOT_ALLOWED'};
  let retention=await retentionView(placer);
  check(retention.available&&JSON.stringify(retention.intervalsDays)===JSON.stringify(course.retention.intervalsDays)&&!retention.items.some(i=>i.objectiveId==='fnd-o03-03'),'retention_opened_without_evidence');
  await passEpisode(placer,byId(stopAt));
  let schedule=(await retentionView(placer)).items.find(i=>i.objectiveId==='fnd-o03-03');
  check(schedule&&schedule.state==='demonstrated'&&!schedule.due&&Date.parse(schedule.dueAt)-Date.parse(schedule.demonstratedAt)===course.retention.intervalsDays[0]*DAY&&schedule.freshItemsLeft===4,'retention_schedule_wrong');
  refused(await attempt(placer,'retention/check',{objectiveId:'fnd-o03-03'}),409,'RETENTION_NOT_DUE','retention_check_before_due');
  refused(await attempt(placer,'retention/check',{objectiveId:'fnd-o03-02'}),409,'RETENTION_UNAVAILABLE','retention_undeclared_objective');
  const lessonsBefore=JSON.stringify((await snapshot(placer)).lessons);
  let retentionCheck;await setClock(course.retention.intervalsDays[0]*DAY+3_600_000);
  try{retentionCheck=await command(placer,'retention/check',{objectiveId:'fnd-o03-03'});}finally{await setClock(0);}
  const held=item(retentionCheck.question.id);
  check(course.retention.assessmentIds.includes(held.id)&&!course.gates.some(g=>g.assessmentIds.includes(held.id))&&!('grading' in retentionCheck.question)&&retentionCheck.independentEligible,'retention_item_not_held_out');
  const recalled=await command(placer,'answers',{challengeId:retentionCheck.challengeId,answer:held.grading.expected});check(recalled.result.passed&&recalled.result.independent,'retention_answer_failed');
  schedule=(await retentionView(placer)).items.find(i=>i.objectiveId==='fnd-o03-03');
  check(schedule.state==='retained'&&schedule.retainedAt&&Date.parse(schedule.dueAt)-Date.parse(schedule.demonstratedAt)===course.retention.intervalsDays[1]*DAY&&schedule.freshItemsLeft===3,'retention_not_recorded');
  await setClock(course.retention.intervalsDays[0]*DAY+3_600_000);
  try{refused(await attempt(placer,'retention/check',{objectiveId:'fnd-o03-03'}),409,'RETENTION_NOT_DUE','second_interval_due_early');}finally{await setClock(0);}
  check(JSON.stringify((await snapshot(placer)).lessons)===lessonsBefore,'retention_changed_completion');
  reports.retention={objectiveId:'fnd-o03-03',intervalsDays:course.retention.intervalsDays,checkedItem:held.id,refusedBeforeDue:'RETENTION_NOT_DUE',state:schedule.state,nextDueAfterDays:course.retention.intervalsDays[1],completionUnchanged:true,clock:'api_process_offset_for_the_check_request_only'};

  // 4. Written explanation: a staff member who is also studying submits; self-review and
  // learner review are refused; a second staff account reviews by quoting the answer.
  const reviewer=await invite('reviewer','Second reviewer'),instructor=await enroll(await invite('instructor','Instructor who also studies'));
  await takePlacement(instructor,null);
  const allPlaced=await command(instructor,'placement/finish',{});check(allPlaced.exemptEpisodeIds.length===12&&allPlaced.startEpisodeId==='fnd-e04-01','full_placement_wrong');
  check((await command(instructor,'placement/accept',{startEpisodeId:'fnd-e04-01'})).placedEpisodeIds.length===12,'full_placement_accept_wrong');
  check((await retentionView(instructor)).items.some(i=>i.objectiveId==='fnd-o03-03'&&i.state==='demonstrated'),'placement_evidence_did_not_open_retention');
  const target=byId('ttf-e06-03');
  for(const episode of episodes.slice(12,episodes.indexOf(target)))await passEpisode(instructor,episode);
  await readAll(instructor,target);
  const writtenItem=await issue(instructor,{episodeId:target.id,mode:'independent'});
  check(writtenItem.question.type==='rubric'&&writtenItem.question.id==='wri-06-03'&&writtenItem.question.criteria.length===4&&!('evaluatorId' in writtenItem.question),'written_item_not_offered_first');
  const sent=await command(instructor,'answers',{challengeId:writtenItem.challengeId,answer:writtenAnswers['wri-06-03'].text});
  check(sent.result.pendingReview&&!sent.result.passed&&sent.result.independent,'written_answer_not_pending');
  await passEpisode(instructor,target);
  const queue=async as=>requireOk(await request(as,'GET',`/api/admin/courses/${catalog.id}/rubric-reviews`),'review_queue').pending.find(x=>x.assessmentId==='wri-06-03'&&x.enrollmentId===instructor.enrollmentId);
  const pending=await queue(reviewer);check(pending&&!pending.ownSubmission&&pending.response===writtenAnswers['wri-06-03'].text&&pending.rubric.length===4,'review_queue_wrong');
  check((await queue(instructor)).ownSubmission===true,'own_submission_not_marked');
  const quotes=writtenAnswers['wri-06-03'].quotes,findings=Object.entries(quotes).map(([criterionId,quote])=>({criterionId,met:true,quote}));
  const review=(as,body,key=randomUUID())=>request(as,'POST',`/api/admin/rubric-reviews/${pending.attemptId}`,{idempotencyKey:key,...body});
  refused(await review(instructor,{decision:'met',criteria:findings}),403,'SELF_REVIEW_FORBIDDEN','self_review_allowed');
  refused(await review(placer,{decision:'met',criteria:findings}),403,'FORBIDDEN','learner_review_allowed');
  refused(await review(reviewer,{decision:'met',criteria:findings.map((f,i)=>i===1?{...f,quote:'the model simply memorises the next token'}:f)}),409,'RUBRIC_QUOTE_REQUIRED','unquoted_finding_accepted');
  refused(await review(reviewer,{decision:'met',criteria:findings.map((f,i)=>i===0?{criterionId:f.criterionId,met:false}:f)}),409,'RUBRIC_DECISION_INCONSISTENT','inconsistent_decision_accepted');
  const verdict={decision:'met',criteria:findings,learnerNote:'Each required point is stated in your own words.'};
  const reviewed=requireOk(await review(reviewer,verdict),'rubric_review');check(reviewed.decision==='met'&&!reviewed.replayed,'rubric_review_wrong');
  check(requireOk(await review(reviewer,verdict),'rubric_review_replay').replayed===true,'rubric_review_not_idempotent');
  const mine=requireOk(await request(instructor,'GET',`/api/enrollments/${instructor.enrollmentId}/reviews`),'learner_reviews').reviews.find(r=>r.attemptId===pending.attemptId);
  check(mine.status==='met'&&mine.criteria.every(c=>c.met&&c.quote===quotes[c.id]),'learner_review_view_wrong');
  const families=(await snapshot(instructor)).lessons.find(x=>x.id===target.id).gate.objectives[0].families;
  check(families.includes('wri-family-06-03')&&families.length===3,'reviewed_evidence_not_recorded');
  reports.writtenExplanation={assessmentId:'wri-06-03',submittedBy:'instructor_enrolled_as_learner',reviewedBy:'second_staff_account_reviewer_role',selfReviewRefused:'SELF_REVIEW_FORBIDDEN',learnerReviewRefused:'FORBIDDEN',unquotedFindingRefused:'RUBRIC_QUOTE_REQUIRED',inconsistentDecisionRefused:'RUBRIC_DECISION_INCONSISTENT',decision:'met',completedWhilePending:true,reviewedFamilyRecorded:true,fullPlacementPlaced:12};

  check(requireOk(await request(owner,'GET','/api/enrollments'),'owner_enrollments').length===0,'operator_course_clock_started');
  await writeFile(path.join(state,'acceptance.json'),JSON.stringify({observedAt:new Date().toISOString(),coreVersion:manifest.version,releaseReceipt,courseVersion:course.version,courseDigest:compiled.digest,storage:'actual_postgresql',execution:'released_cli_and_http_only',harness:{clock:'api_process_offset_for_one_retention_request',model:'scripted_responses_at_the_google_origin_via_process_proxy_settings'},reports,ownerUnenrolled:true,liveProviderAcceptance:false,learningEffectiveness:'not_measured'},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({verified:true,coreVersion:manifest.version,releaseReceipt,courseVersion:course.version,reports,ownerUnenrolled:true,liveProviderAcceptance:false}));
}catch(error){await writeFile(path.join(state,'failure.json'),JSON.stringify({code:error instanceof Failure?error.code:'feature_flow_failed',type:error?.name,detailCode:error?.code,message:String(error?.message??'').slice(0,2000),stack:String(error?.stack??'').slice(0,4000),modelCalls:model.calls,refusedConnects:model.refused})+'\n',{mode:0o600});console.error(error instanceof Failure?error.code:String(error?.stack??error));process.exitCode=1;
}finally{
  if(!childExit){server.kill('SIGTERM');for(let i=0;i<50&&!childExit;i++)await pause(100);if(!childExit){server.kill('SIGKILL');for(let i=0;i<20&&!childExit;i++)await pause(100);}}
  await model.close();
  if(!childExit)throw new Failure('owned_api_shutdown_unconfirmed');
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
  await writeFile(path.join(state,'service.log'),output,{mode:0o600});
}
