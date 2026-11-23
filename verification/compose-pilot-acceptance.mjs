// Pilot acceptance for a RUNNING Docker Compose deployment of Course Core (deploy/docker in
// course-core), through its HTTP API and its real learner and administration apps.
//
//   npm run accept:pilot -- --origin http://localhost:4310 --package <course dir or course-v0.1.8.tgz> \
//     --operator-login <owner or admin login> --operator-password-file <owner-only file>
//
// The workspace is --workspace <slug> when given; otherwise, after the operator signs in, the
// one workspace where the operator is owner or admin (GET /api/workspaces). With none or
// several the run stops before anything else and lists the candidate slugs.
//
// What it checks:
//   1. /health answers; platform readiness shows the expected Core version (the pinned release,
//      expectedCoreRelease in released-runtime.mjs, unless --expect-core), current migrations, and
//      a working database, Temporal supervisor and code sandbox.
//   2. The course installed in the workspace is the released package: the selected (published)
//      release has the package's version and digest, and administration shows it published and
//      available to new learners. The package itself is verified first (verifyWorkedPackage).
//   3. A learner walk in Chrome at phone, tablet and desktop sizes through the redesigned 0.1.67
//      learner app, with axe (WCAG 2.1 AA) on every screen, no page errors and no horizontal
//      overflow. Full walk: the acceptance learner enrolls once, completes the first lesson's
//      independent checks, and resumes the same enrollment on the other sizes. Read-only walk:
//      it signs in and reads the library, the course and (once enrolled) the current lesson.
//   4. Administration (desktop): Courses, the course's Course & releases page, People & roles
//      and Platform load signed in, pass axe and show the installed version and the acceptance
//      learner. The operator's own enrollments are counted before and after: never changed.
//
// Credentials. The operator signs in with a password read at runtime from
// --operator-password-file (a file only its owner can read), else the COURSE_OPERATOR_PASSWORD
// environment variable, else a no-echo prompt on a terminal. The harness never needs
// deploy/docker/.env, bootstrap.json or the supervisor token. The acceptance learner is created
// by the harness through the deployment's own People API (Invite person) as a learner named
// "Acceptance learner (automated pilot check)" with the login acceptance-learner; on later runs
// administration resets its password instead. Each run the learner signs in with the temporary
// password once and replaces it with a random one that lives only in this process. No password,
// cookie or CSRF token is printed, written to the receipt, put in argv or kept in a trace (no
// Playwright traces are recorded; screenshots are taken only after sign-in).
//
// Provider calls. The harness never sends a companion, research, media or review-assist request:
// the browser's writes are limited to an allowlist and everything else is aborted and recorded
// in the receipt (blockedWrites; the read-only walk, for example, blocks the learner app's
// device report).
// Learning writes (enrolling, reading, answering, completing) raise supervised events that a live
// provider may answer at the owner's cost, so when the workspace has any provider connection or
// configured AI role the walk is read-only unless --allow-provider-calls is given (off by default).
// --read-only forces the read-only walk anywhere.
//
// What it leaves on the target, by design and idempotent on re-run: the one acceptance learner
// (reused, never duplicated; its sessions end when its password is reset), at most one
// enrollment of it (resumed, never a second), its progress on the first lesson (full walk), and
// the audit entries of the invite or password reset. Nothing else is written. The receipt and
// screenshots go to --out (default .local/pilot-acceptance/<time>), never to the target.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {verifyWorkedPackage} from '../scripts/package-worked-course.mjs';
import {harnessPassword} from './password-login.mjs';
import {expectResponse} from './browser-responses.mjs';
import {expectedCoreRelease} from './released-runtime.mjs';
import {ACCEPTANCE_LEARNER,USAGE,allowedWrite,checkInstalledRelease,checkReadiness,learnerAction,liveProvidersConfigured,parseArguments,redact,selectWorkspace,walkMode} from './compose-pilot-acceptance-rules.mjs';

const nextLesson=page=>page.getByRole('button',{name:/^(Start the course|Start lesson \d+|Continue lesson \d+) →$/});
const checkButton=page=>page.getByRole('button',{name:'Check',exact:true});
const SIZES=[['phone',390,844],['tablet',834,1112],['desktop',1440,960]];
/** Every credential this run holds, so a failure message can never echo one. */
const secrets=new Set();
const scrub=text=>[...secrets].reduce((s,secret)=>s.split(secret).join('[redacted]'),String(text));

/** The operator password: an owner-only file, the environment, or a no-echo terminal prompt. */
async function operatorPassword(options){
  if(options.operatorPasswordFile){
    const file=path.resolve(options.operatorPasswordFile),info=await stat(file);
    assert(info.isFile()&&(info.mode&0o077)===0,`${file} must be a regular file only its owner can read (chmod 600)`);
    const text=(await readFile(file,'utf8')).replace(/\r?\n$/,'');assert(text&&!text.includes('\n'),'The password file must hold exactly one line');return text;
  }
  if(process.env.COURSE_OPERATOR_PASSWORD)return process.env.COURSE_OPERATOR_PASSWORD;
  assert(process.stdin.isTTY,'No operator password: pass --operator-password-file, set COURSE_OPERATOR_PASSWORD, or run on a terminal');
  process.stderr.write(`Password for ${options.operatorLogin}: `);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  return new Promise((resolve,reject)=>{let text='';process.stdin.on('data',function typed(chunk){
    for(const ch of chunk){
      if(ch==='\r'||ch==='\n'){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',typed);process.stderr.write('\n');return resolve(text);}
      if(ch==='\u0003'){process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');return reject(new Error('Cancelled'));}
      if(ch==='\u007f'||ch==='\b')text=text.slice(0,-1);else text+=ch;
    }});});
}

/** A course package directory, or a course-v<version>.tgz extracted to a private temporary directory. */
async function packageDirectory(input){
  const resolved=path.resolve(input);
  if(!resolved.endsWith('.tgz'))return resolved;
  const target=await mkdtemp(path.join(os.tmpdir(),'course-package-'));
  await promisify(execFile)('tar',['-xzf',resolved,'-C',target]);
  const entries=(await readdir(target,{withFileTypes:true})).filter(e=>e.isDirectory());
  assert.equal(entries.length,1,'The archive must hold one course directory');return path.join(target,entries[0].name);
}

/** One HTTP session against the target. Errors name the route and Core's error code only. */
function client(origin,timeoutMs){
  const session={cookie:'',csrf:''};
  async function call(method,route,body,label=route){
    const response=await fetch(origin+route,{method,redirect:'error',signal:AbortSignal.timeout(timeoutMs),
      headers:{origin,...(body===undefined?{}:{'content-type':'application/json'}),...(session.cookie?{cookie:session.cookie,'x-csrf-token':session.csrf}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value=await response.json().catch(()=>null);
    if(!response.ok){const error=new Error(`${method} ${label} failed: ${response.status} ${typeof value?.error==='string'?value.error:typeof value?.code==='string'?value.code:''}`.trim());error.status=response.status;error.code=value?.error??value?.code;throw error;}
    return {value,response};
  }
  return {
    call,
    async signIn(login,password,newPassword){
      const {value,response}=await call('POST','/auth/login',{login,password,...(newPassword?{newPassword}:{})},'/auth/login');
      session.cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');session.csrf=value.csrfToken;
      assert(session.cookie&&session.csrf,'Sign-in returned no session');
    },
    async signOut(){if(session.cookie)await call('POST','/auth/logout',{}).catch(()=>{});session.cookie='';session.csrf='';},
  };
}

async function main(){
  const options=parseArguments(process.argv.slice(2));
  if(options.help){console.log(USAGE);return;}
  const started=new Date(),timeoutMs=options.timeoutSeconds*1000,origin=options.origin;
  const out=path.resolve(options.out??path.join('.local','pilot-acceptance',started.toISOString().replace(/[:.]/g,'-')));
  await mkdir(out,{recursive:true,mode:0o700});
  const directory=await packageDirectory(options.package),manifest=await verifyWorkedPackage(directory);
  const course=JSON.parse(await readFile(path.join(directory,'course.manifest.json'),'utf8'));
  const episodes=course.chapters.flatMap(c=>c.episodes),[first,second]=episodes;
  const expectCore=options.expectCore??expectedCoreRelease.version;
  const report={harness:'compose-pilot-acceptance',origin,startedAt:started.toISOString(),expectCore,package:{courseId:manifest.courseId,version:manifest.courseVersion,digest:manifest.courseDigest},
    liveProviderAcceptance:false,blockedWrites:[],viewports:[],admin:[]};
  const step=(name,detail)=>{process.stderr.write(`${name}${detail?`: ${detail}`:''}\n`);};

  // 1. Health and platform readiness.
  const health=await (await fetch(origin+'/health',{signal:AbortSignal.timeout(timeoutMs)})).json();
  assert(health.status==='ok'&&health.application==='course-core','Health check failed');report.health='ok';step('health','ok');
  const operator=client(origin,timeoutMs),learner=client(origin,timeoutMs);
  const password=await operatorPassword(options);secrets.add(password);
  try{
    await operator.signIn(options.operatorLogin,password).catch(error=>{throw new Error(error.code==='PASSWORD_CHANGE_REQUIRED'?'The operator must change the password in administration first':`Operator sign-in failed (${error.status??error.message})`);});
    const choice=selectWorkspace((await operator.call('GET','/api/workspaces')).value,options.workspace);
    assert(choice.ok,choice.problem);
    const workspace=choice.workspace;report.workspace={slug:workspace.slug,role:workspace.role,discovered:choice.discovered};
    step('workspace',`${workspace.slug} (${workspace.role}${choice.discovered?', the only workspace the operator manages':''})`);
    const ws=workspace.id,wsPath=`/api/admin/workspaces/${ws}`;
    const readiness=checkReadiness((await operator.call('GET',`${wsPath}/platform-readiness`,undefined,'/api/admin/workspaces/:id/platform-readiness')).value,expectCore);
    report.readiness=readiness;assert(readiness.ok,`Platform readiness: ${readiness.problems.join('; ')}`);step('readiness',`Core ${readiness.coreVersion}, ${readiness.migrations} migrations`);

    // 2. The installed course is the released package.
    const selected=(await operator.call('GET',`/api/workspaces/${ws}/courses`,undefined,'/api/workspaces/:id/courses')).value;
    const catalogs=(await operator.call('GET','/api/admin/session')).value.courses.filter(c=>c.workspaceId===ws);
    let view;for(const c of catalogs){const v=(await operator.call('GET',`/api/admin/courses/${c.id}`,undefined,'/api/admin/courses/:id')).value;if(v.releases.some(r=>selected.some(s=>s.id===r.id&&s.course_key===manifest.courseId))){view={...v,catalogId:c.id};break;}}
    const installed=checkInstalledRelease({selected,adminReleases:view?.releases,manifest});
    report.installed=installed;assert(installed.ok,`Installed course: ${installed.problems.join('; ')}`);step('installed',`${installed.version} ${installed.digest.slice(0,12)}`);

    // Live providers decide how far the learner walk may go.
    const connections=(await operator.call('GET',`${wsPath}/provider-setup/connections`,undefined,'/api/admin/workspaces/:id/provider-setup/connections')).value.connections;
    const live=liveProvidersConfigured({connections,providers:view.providers});
    const walk=walkMode({live,allowProviderCalls:options.allowProviderCalls,readOnly:options.readOnly});
    report.providers={liveConfigured:live,connections:connections.length,roles:(view.providers??[]).map(p=>({id:p.id,configuration:p.configuration,runtimeStatus:p.runtimeStatus}))};
    report.walk=walk;step('walk',`${walk.mode} (${walk.reason})`);
    const operatorEnrollmentsBefore=(await operator.call('GET','/api/enrollments')).value.length;

    // 3. The acceptance learner: invited once, its password reset by administration on later runs.
    const people=(await operator.call('GET',`${wsPath}/people`,undefined,'/api/admin/workspaces/:id/people')).value.people;
    const plan=learnerAction(people,options.learnerLogin);assert(plan.action!=='refuse',`Acceptance learner: ${plan.reason}`);
    const issued=plan.action==='invite'
      ?(await operator.call('POST',`${wsPath}/people`,{displayName:ACCEPTANCE_LEARNER.displayName,role:'learner',loginName:options.learnerLogin,idempotencyKey:`acceptance:${randomUUID()}`},'/api/admin/workspaces/:id/people')).value
      :(await operator.call('POST',`${wsPath}/people/${plan.userId}/password`,{idempotencyKey:`acceptance:${randomUUID()}`},'/api/admin/workspaces/:id/people/:id/password')).value;
    assert(issued.password?.temporaryPassword&&issued.password.mustChangeOnNextSignIn,'Administration issued no temporary password');
    const learnerPassword=harnessPassword();secrets.add(issued.password.temporaryPassword);secrets.add(learnerPassword);
    await learner.signIn(options.learnerLogin,issued.password.temporaryPassword,learnerPassword);await learner.signOut();
    report.learner={login:options.learnerLogin,displayName:ACCEPTANCE_LEARNER.displayName,userId:issued.userId??plan.userId,created:plan.action==="invite",resetByAdministration:plan.action==="reset"};
    step('learner',plan.action==='invite'?'invited':'password reset');

    // 4. Learner walk in the real learner app.
    const browser=await chromium.launch({channel:process.env.CI==='true'?undefined:'chrome'});
    try{
      async function open(name,width,height,mode){
        const ctx=await browser.newContext({baseURL:origin,viewport:{width,height},isMobile:name==='phone',hasTouch:name!=='desktop'}),page=await ctx.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message.slice(0,300)));
        await ctx.route('**/*',route=>{
          const request=route.request(),url=new URL(request.url());
          if(url.origin===origin&&!allowedWrite(request.method(),url.pathname,mode)){report.blockedWrites.push({viewport:name,method:request.method(),path:url.pathname.replace(/[0-9a-f-]{36}/g,':id')});return route.abort('blockedbyclient');}
          return route.continue();
        });
        return {ctx,page,errors};
      }
      async function signIn(page,login,secret,{admin=false}={}){
        const signed=expectResponse(page,r=>new URL(r.url()).pathname==='/auth/login'&&r.request().method()==='POST');
        await page.goto(origin+(admin?'/admin/':'/'));await page.getByLabel('Username',{exact:true}).waitFor();
        await page.getByLabel('Username',{exact:true}).fill(login);await page.getByLabel('Password',{exact:true}).fill(secret);
        await page.getByRole('button',{name:'Sign in',exact:true}).click();assert((await signed).ok(),`${admin?'Operator':'Learner'} browser sign-in failed`);
        assert(!page.url().includes(secret),'Password in the address bar');
      }
      const known=new Set();
      async function quality(page,name,label){
        const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        assert.deepEqual(axe.violations.map(v=>v.id),[],`${name} ${label}: accessibility violations`);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${name} ${label}: horizontal overflow`);
        await page.screenshot({path:path.join(out,`${name}-${label}.png`)});known.add(`${name}:${label}`);
      }
      const snapshot=async(page,id)=>(await page.request.get(`/api/enrollments/${id}`)).json();
      // The enrolled learner's course page, from the library card.
      async function courseFromLibrary(page){await page.getByRole('button',{name:'Continue learning →',exact:true}).first().click();await nextLesson(page).waitFor();}

      for(const [name,width,height] of SIZES){
        const {ctx,page,errors}=await open(name,width,height,walk.mode),entry={name};
        await signIn(page,options.learnerLogin,learnerPassword);
        await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();await quality(page,name,'library');
        let mine=await (await page.request.get('/api/enrollments')).json();
        assert(mine.length<=1,'The acceptance learner has more than one enrollment');
        if(walk.mode==='full'&&name==='phone'&&mine.length===0){
          await page.getByRole('button',{name:'Open course',exact:true}).click();
          const enrolled=expectResponse(page,r=>new URL(r.url()).pathname==='/api/enrollments'&&r.request().method()==='POST');
          await page.getByRole('button',{name:'Start course',exact:true}).click();assert((await enrolled).ok(),'Enrolling failed');
          mine=await (await page.request.get('/api/enrollments')).json();entry.enrolledInThisRun=true;
          await nextLesson(page).waitFor();
        }else if(mine.length)await courseFromLibrary(page);
        if(!mine.length){
          // Read-only and never enrolled: the course's start page, without starting it.
          await page.getByRole('button',{name:'Open course',exact:true}).click();await page.getByRole('button',{name:'Start course',exact:true}).waitFor();
          await quality(page,name,'course-start');entry.enrolled=false;
        }else{
          const enrollmentId=mine[0].id;entry.enrollmentId=enrollmentId;report.enrollmentId??=enrollmentId;
          assert.equal(enrollmentId,report.enrollmentId,'Another size selected a different enrollment');
          await quality(page,name,'course');
          const saved=(await snapshot(page,enrollmentId)).lessons.find(l=>l.id===first.id);
          await nextLesson(page).click();
          if(walk.mode==='full'&&saved.status!=='completed'){
            await page.getByRole('heading',{name:first.title,exact:true}).waitFor();await quality(page,name,'first-lesson');
            assert(await page.getByRole('button',{name:'Finish this lesson →',exact:true}).isDisabled(),'Finishing was offered before the checks');
            // Each part is marked inside its own numbered card, after the previous read is saved.
            const reading=first.blocks.filter(b=>!['assessment','activity'].includes(b.type));
            for(const [index,block] of reading.entries()){
              if(saved.completedBlockIds?.includes(block.id))continue;
              const read=expectResponse(page,r=>new URL(r.url()).pathname.endsWith('/read')&&r.request().method()==='POST');
              await page.getByRole('article',{name:`Reading part ${index+1}`,exact:true}).getByRole('button',{name:'Mark this part read',exact:true}).click();
              assert((await read).ok(),'A reading part was not saved');
            }
            for(let n=0;n<10;n++){
              if((await snapshot(page,enrollmentId)).lessons.find(l=>l.id===first.id).gate.passed)break;
              const challenge=expectResponse(page,r=>new URL(r.url()).pathname.endsWith('/challenges')&&r.request().method()==='POST');
              await page.getByRole('button',{name:'Start the next check →',exact:true}).click();
              const c=await (await challenge).json();assert(!('grading' in c.question),'Grading key exposed to the learner');
              const a=course.assessments.find(x=>x.id===c.question.id);assert(a&&['choice','numeric'].includes(a.type),'Unexpected first-lesson check');
              if(a.type==='choice')await page.getByRole('radio',{name:a.options.find(o=>o.id===a.grading.correctOptionId).text,exact:true}).click();
              else await page.getByRole('textbox',{name:'Your numeric answer',exact:true}).fill(String(a.grading.expected));
              await checkButton(page).click();
              await page.getByRole('button',{name:'Start the next check →',exact:true}).or(page.getByText('Your independent checks are complete.',{exact:true})).first().waitFor();
            }
            assert((await snapshot(page,enrollmentId)).lessons.find(l=>l.id===first.id).gate.passed,'The first lesson gate did not pass');
            const completed=expectResponse(page,r=>new URL(r.url()).pathname.endsWith('/complete')&&r.request().method()==='POST');
            await page.getByRole('button',{name:'Finish this lesson →',exact:true}).click();assert((await completed).ok(),'Completing the first lesson failed');
            entry.completedFirstLesson=true;await nextLesson(page).click();
          }
          const after=await snapshot(page,enrollmentId),current=after.lessons.find(l=>l.id===first.id);
          if(walk.mode==='full'){
            assert.equal(current.status,'completed','The first lesson is not completed');
            assert(!after.lessons.find(l=>l.id===second.id).gate?.passed,'The second lesson gate passed without evidence');
            await page.getByRole('heading',{name:second.title,exact:true}).waitFor();entry.resumedLesson=second.id;
          }else{await page.getByRole('heading',{level:1}).first().waitFor();entry.openedLesson=true;}
          await quality(page,name,'lesson');
        }
        assert.deepEqual(errors,[],`${name}: page errors`);entry.pageErrors=0;report.viewports.push(entry);await ctx.close();step('learner walk',name);
      }
      const finalEnrollments=(await learnerEnrollments(origin,timeoutMs,options.learnerLogin,learnerPassword));
      assert(finalEnrollments<=1,'The acceptance learner has more than one enrollment');report.learnerEnrollments=finalEnrollments;

      // 5. Administration, signed in as the operator (reads only: every write but sign-in is aborted).
      {
        const {ctx,page,errors}=await open('admin',1440,960,'read-only');
        await signIn(page,options.operatorLogin,password,{admin:true});
        await page.getByRole('heading',{name:'Courses',level:1}).waitFor();
        await page.getByRole('row').filter({hasText:course.title}).filter({hasText:manifest.courseVersion}).waitFor();
        await quality(page,'admin','courses');report.admin.push('courses');
        await page.goto(`${origin}/admin/courses/${view.catalogId}/releases`);
        await page.getByRole('heading',{name:'Course & releases',level:1}).waitFor();
        await page.getByRole('heading',{name:`Release ${manifest.courseVersion}`}).waitFor();
        await page.getByText('Available to new learners').first().waitFor();
        await quality(page,'admin','course-releases');report.admin.push('course-releases');
        await page.goto(`${origin}/admin/people`);await page.getByRole('heading',{name:'People & roles',level:1}).waitFor();
        await page.getByText(ACCEPTANCE_LEARNER.displayName,{exact:true}).first().waitFor();
        await quality(page,'admin','people');report.admin.push('people');
        await page.goto(`${origin}/admin/platform`);await page.getByRole('heading',{name:'Platform',level:1}).waitFor();
        await page.getByText(expectCore,{exact:false}).first().waitFor();
        await quality(page,'admin','platform');report.admin.push('platform');
        assert.deepEqual(errors,[],'admin: page errors');await ctx.close();step('admin','4 views');
      }
      report.screens=[...known];
    }finally{await browser.close();}
    const operatorEnrollmentsAfter=(await operator.call('GET','/api/enrollments')).value.length;
    assert.equal(operatorEnrollmentsAfter,operatorEnrollmentsBefore,'The operator’s enrollments changed');
    report.operatorEnrollments={before:operatorEnrollmentsBefore,after:operatorEnrollmentsAfter};
  }finally{await operator.signOut();}
  report.result='passed';report.finishedAt=new Date().toISOString();
  const safe=redact(report);
  await writeFile(path.join(out,'receipt.json'),JSON.stringify(safe,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({...safe,receipt:path.join(out,'receipt.json')}));
}

/** The learner's enrollment count, in a fresh API session. */
async function learnerEnrollments(origin,timeoutMs,login,secret){
  const session=client(origin,timeoutMs);await session.signIn(login,secret);
  try{return (await session.call('GET','/api/enrollments')).value.length;}finally{await session.signOut();}
}

if(process.argv[1]===fileURLToPath(import.meta.url))await main().catch(error=>{console.error(JSON.stringify({result:'failed',error:scrub(error?.message??error).slice(0,600)}));process.exitCode=1;});
