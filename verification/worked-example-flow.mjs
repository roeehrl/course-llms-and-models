import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createServer as reserveServer} from 'node:net';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {stageWorkedExamples,ROOT} from '../scripts/stage-worked-examples.mjs';
import {verifyReleasedRuntime,expectedCoreRelease17,releasedDirectories} from './released-runtime.mjs';

const {runtime,release:releaseDir}=await releasedDirectories(process.argv.slice(2),{runtime:fileURLToPath(new URL('.local/released-core-v0.1.17/course-core/',ROOT)),release:fileURLToPath(new URL('.local/released-core-artifacts/v0.1.17/',ROOT))});
// This flow imports v0.1.17 internals directly, so it verifies against that release, not the current pin.
const delivery=await verifyReleasedRuntime(runtime,releaseDir,expectedCoreRelease17);
assert(process.env.TEST_DATABASE_URL&&!process.env.DATABASE_URL,'Explicit disposable test database required');
const url=new URL(process.env.TEST_DATABASE_URL);assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&/^\/course_core_(?:ci|test(?:_[a-z0-9_]+)?)$/.test(url.pathname)&&!url.search&&!url.hash);
const api=async name=>import(pathToFileURL(path.join(runtime,'services/api/dist/'+name+'.js')).href);
const [{createDatabase,transaction},{migrate},{createServer},{issueLoginCode},{codeEvaluator},{svgRenderer},{isolatedTeachingVerifier},{composeAdaptation,adaptationDescriptors},{composeProviders},{createPostgresSupervisorBridge,configureSupervisorBudget},{appendEvent},{DockerSandbox,QUALIFIED_IMAGES}]=await Promise.all([api('database'),api('migrations'),api('server'),api('auth'),api('code-evaluator'),api('svg-renderer'),api('isolated-teaching-verifier'),api('adaptation-composition'),api('provider-composition'),api('supervisor-bridge'),api('events'),import(pathToFileURL(path.join(runtime,'packages/sandbox/dist/index.js')).href)]);
const staged=await stageWorkedExamples(),entry=staged.entries[0],correct=await staged.make(entry,1),wrong=await staged.make(entry,1,true);
const folder=fileURLToPath(new URL('.local/generated-teaching/',ROOT));await mkdir(folder,{recursive:true,mode:0o700});const storage=await mkdtemp(path.join(folder,'application-'));
const schema='course_worked_'+randomUUID().replaceAll('-',''),admin=createDatabase(url.href);let db,app,schemaCreated=false;
const image=QUALIFIED_IMAGES[process.arch],sandbox=new DockerSandbox({image,storageDirectory:storage});
let calls=0;const prompts=[];
const modelAdapter={providerId:'private-acceptance',validateModel(){},ports:{structured_assessment:{async assess(request){
  calls++;const round=Number(request.accounting.accountingKey.split(':round-')[1]),prompt=JSON.parse(request.messages[0].text);prompts.push(prompt);
  const tool=(name,args={})=>({decision:'tool',tool:name,argumentsJson:JSON.stringify(args),summary:''});
  const candidate=artifact=>({profileId:'teaching-'+entry.episodeId,kind:'explanation',markdown:artifact.markdown,objectiveIds:entry.objectiveIds,sourceRefs:staged.definition.sourceRefs});
  let output;
  if(round===0)output=tool('list_generation_profiles');
  else if(round===1)output=tool('create_teaching',candidate(wrong));
  else if(round===2)output=tool('check_teaching',{artifactDigest:prompt.toolResults.at(-1).result.artifactDigest});
  else if(round===3){assert.equal(prompt.toolResults.at(-1).result.verification,'rejected');output=tool('create_teaching',candidate(correct));}
  else output={decision:'finish',tool:'none',argumentsJson:'{}',summary:'Deliver the corrected worked example after independent verification.'};
  return {output,usage:{accounting:request.accounting,providerId:'private-acceptance',modelId:'private-planner',operation:'assess',attempts:[{attempt:1,status:200,outcome:'response',tokens:{input:20,output:10,total:30,cachedInput:0,thoughts:0,toolInput:0}}],inputCharacters:1000,requestedMaxOutputTokens:1000,requestedVideoSeconds:null,observedImageCount:null,observedVideoCount:null,cost:null}};
}}}};
try {
  assert((await sandbox.readiness()).ready,'Prepared actual isolation required');
  const ext=await isolatedTeachingVerifier(staged.bytes,sandbox);assert.equal(ext.integrity,'sha256-'+staged.digest);
  const metadata=JSON.parse(await readFile(new URL('runtime/practical-registries.json',ROOT),'utf8')),extensions=[await svgRenderer(),ext];
  for(const r of metadata.registries)extensions.push(await codeEvaluator(await readFile(new URL(r.file,ROOT)),sandbox));
  const adaptation=composeAdaptation(['bounded-numeric-v1','authored-bank-v1','authored-code-bank-v1'],extensions);
  assert(adaptationDescriptors(adaptation).some(d=>d.id===staged.definition.adapterId&&d.implementationDigest===staged.digest));
  await admin.query('CREATE SCHEMA '+schema);schemaCreated=true;url.searchParams.set('options','-csearch_path='+schema);db=createDatabase(url.href);await migrate(db,path.join(runtime,'services/api/migrations'));
  const workspace=randomUUID(),ownerId=randomUUID(),learnerId=randomUUID(),serviceToken=randomUUID(),port=await new Promise(resolve=>{const s=reserveServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});}),origin='http://127.0.0.1:'+port;
  const providers=composeProviders({registry:{revision:'private-worked-acceptance',models:[{id:'private-planner',providerId:'private-acceptance',remoteModel:'scripted',providerConfig:{},enabled:true,capabilities:['structured_assessment'],limits:{maxInputCharacters:40000,maxOutputTokens:2000}}]},adapters:[{id:'private-acceptance',kind:'scripted',credentialEnv:'COURSE_PROVIDER_ACCEPTANCE_API_KEY'}],roles:{supervisor:{modelId:'private-planner',maxInputCharacters:30000,maxOutputTokens:1000,maxToolRounds:8}}},()=> 'synthetic-only',{scripted:()=>modelAdapter});
  const bridgeOptions={workspaceIds:[workspace],serviceToken,jobPolicy:{allowance:{microUsd:100000,tokens:1200000}}};
  app=await createServer(db,{origin,secureCookies:false,installedExtensions:extensions,adaptation,providers,supervisor:bridgeOptions,learnerDirectory:path.join(runtime,'apps/learner/dist')});
  const listening=await app.listen({port,host:'127.0.0.1'});const actualOrigin=new URL(listening).origin;
  await db.query('INSERT INTO workspaces(id,slug,title) VALUES($1,$2,$3)',[workspace,'worked-acceptance','Private worked-example acceptance']);
  const session=async(id,role)=>{await db.query('INSERT INTO app_users(id,subject,display_name) VALUES($1,$2,$3)',[id,'worked:'+id,'Acceptance learner']);await db.query('INSERT INTO memberships(workspace_id,user_id,role) VALUES($1,$2,$3)',[workspace,id,role]);const r=await fetch(actualOrigin+'/auth/redeem',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token:await issueLoginCode(db,id)})});assert(r.ok);const v=await r.json();return {origin,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),'x-csrf-token':v.csrfToken};};
  const owner=await session(ownerId,'owner'),learner=await session(learnerId,'learner');
  const http=async(headers,method,route,body)=>{const r=await fetch(actualOrigin+route,{method,headers:{...headers,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});const v=await r.json();assert.equal(r.status,200,'Acceptance route failed:'+route);return v;};
  const release=await http(owner,'POST',`/api/workspaces/${workspace}/releases`,staged.compiled.server);await http(owner,'POST',`/api/releases/${release.id}/publish`);
  await http(owner,'POST',`/api/admin/releases/${release.id}/adaptation-registry`,{expectedRegistryRevision:0,configuration:staged.proposedRegistry});
  const enrolled=await http(learner,'POST','/api/enrollments',{releaseId:release.id});const id=enrolled.id;const snapshot=()=>http(learner,'GET',`/api/enrollments/${id}`);const before=await snapshot();
  await http(learner,'POST',`/api/enrollments/${id}/supervision`,{expectedRevision:before.revision,idempotencyKey:randomUUID(),adaptiveTeaching:true});
  await configureSupervisorBudget(db,{workspaceId:workspace},{microUsd:1000000,tokens:2000000});await configureSupervisorBudget(db,{workspaceId:workspace,enrollmentId:id},{microUsd:1000000,tokens:2000000});
  const event=await transaction(db,client=>appendEvent(client,{workspaceId:workspace,enrollmentId:id,actorId:learnerId,actorKind:'learner',type:'learning.review_requested',payload:{episodeId:entry.episodeId},idempotencyKey:randomUUID(),supervise:true}));
  const bridge=createPostgresSupervisorBridge(db,bridgeOptions),envelope=(await bridge.claimOutbox(randomUUID(),100,30000)).find(e=>e.eventId===event.id);const [ref]=await bridge.prepareOutbox(envelope);await bridge.ackOutbox(envelope);
  const claimed=await bridge.transition({type:'claim',ref,checkpointId:'generate',ownerId:randomUUID(),availability:{status:'ready'}}),op=claimed.snapshot.operations[0];
  const request={schemaVersion:1,operationId:op.id,job:claimed.snapshot.specification.key,role:'supervisor',checkpoint:claimed.snapshot.specification.checkpoints[0],fence:claimed.snapshot.specification.fence};
  const service={'authorization':'Bearer '+serviceToken,'idempotency-key':op.id};const result=await http(service,'POST','/v1/operations',request);assert.equal(result.status,'succeeded');assert.equal(calls,5);
  await bridge.transition({type:'settle',ref,operationId:op.id,ownerId:op.ownerId,outcome:result});
  const transition=command=>http(service,'POST','/v1/supervisor/bridge',{method:'transition',command});assert.equal((await transition({type:'verify',ref})).snapshot.state,'ready');
  const applied=await transition({type:'apply',ref});assert.equal(applied.snapshot.state,'applied');assert.equal((await transition({type:'apply',ref})).snapshot.applicationReceiptId,applied.snapshot.applicationReceiptId);
  const after=await snapshot(),blocks=after.course.chapters.flatMap(c=>c.episodes).find(e=>e.id===entry.episodeId).blocks;
  assert.equal(blocks.filter(b=>b.markdown===correct.markdown).length,1);assert(!blocks.some(b=>b.markdown===wrong.markdown));assert.deepEqual(after.lessons.map(l=>l.gate),before.lessons.map(l=>l.gate));assert.equal((await db.query('SELECT count(*) FROM evidence WHERE enrollment_id=$1',[id])).rows[0].count,'0');
  const assignments=(await db.query('SELECT assignments FROM adaptation_proposals WHERE enrollment_id=$1',[id])).rows;assert.equal(assignments.length,1);assert.equal(assignments[0].assignments[0].plannedMinutes,3);assert.equal(assignments[0].assignments[0].classification,'optional');assert.equal(assignments[0].assignments[0].additionalEpisodes,0);
  assert(prompts[1].toolResults[0].result.profiles.some(p=>p.generationBrief&&p.id==='teaching-'+entry.episodeId));
  const browserReports=[];
  if(process.argv.includes('--browser')){
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{for(const viewport of [{width:390,height:844},{width:834,height:1112},{width:1440,height:960}]){
      const ctx=await browser.newContext({viewport});await ctx.addCookies(learner.cookie.split(';').map(cookie=>{const at=cookie.indexOf('=');return {name:cookie.slice(0,at).trim(),value:cookie.slice(at+1).trim(),url:actualOrigin,sameSite:'Strict'};}));const page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.name));
      await page.goto(actualOrigin);await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();await page.getByRole('button',{name:'Continue learning →',exact:true}).click();await page.getByRole('heading',{name:'Your learning path',exact:true}).waitFor();await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
      // All added reading parts precede independent checks in the linear player.
      // Verify the actual solved example becomes reachable without granting credit.
      for(let part=0;part<12;part++){
        await writeFile(path.join(folder,'browser-last.json'),JSON.stringify({part,width:viewport.width,text:(await page.locator('main').innerText()).slice(0,3000)},null,2)+'\n',{mode:0o600});
        await page.screenshot({path:path.join(folder,'browser-last.png')});
        if(await page.getByText('Worked example',{exact:true}).count())break;
        if(!(await page.getByRole('button',{name:'Mark this part read',exact:true}).count())){await page.getByText('Review your reading',{exact:true}).click();const reviews=page.getByRole('button',{name:/^Part \d+$/});await reviews.last().click();break;}
        await page.getByRole('button',{name:'Mark this part read',exact:true}).click();
        await page.getByRole('button',{name:'Mark this part read',exact:true}).waitFor();
      }
      await page.getByText('Worked example',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Complete episode →',exact:true}).isEnabled(),false);
      assert((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.length===0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));assert.equal(errors.length,0);
      await page.screenshot({path:path.join(folder,'worked-delivery-'+viewport.width+'.png'),fullPage:true});browserReports.push({width:viewport.width,actualDeliveredExample:true,completionStillGated:true,accessibility:true,noOverflow:true,pageErrors:0});await ctx.close();
    }}finally{await browser.close();}
  }
  const receipt={verified:true,delivery,courseVersion:'0.1.4',courseDigest:staged.compiled.digest,definitionDigest:staged.digest,storage:'actual_postgresql',transport:'actual_http',referenceExecution:'actual_isolated_python',constructorPositiveNegativeGate:true,registryProfiles:154,modelCalls:calls,browserReports,wrongDraftRejected:true,repairedDraftDeliveredOnce:true,plannedMinutes:3,additionalEpisodes:0,classification:'optional',masteryUnchanged:true,liveProviderVerified:false,nativeEnrollmentPinsChanged:false};
  await writeFile(path.join(folder,'application-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(receipt));
} finally {await app?.close();await db?.end();if(schemaCreated)await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();await rm(storage,{recursive:true,force:true});}
