// Native pilot acceptance through the real browser UI of a RUNNING pilot.
// A dedicated QA account enrolls on a phone viewport, completes the first
// episode's independent checks, then resumes the same enrollment on tablet and
// desktop. The operator is never enrolled. Author keys stay in this driver.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import pg from 'pg';
import {verifyWorkedPackage} from '../scripts/package-worked-course.mjs';
import {harnessPassword,runWithPassword} from './password-login.mjs';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>index%2?pairs:[...pairs,[value,all[index+1]]],[]));
assert(args['--origin']&&args['--runtime']&&args['--state']&&args['--package'],'Usage: pilot-acceptance.mjs --origin <url> --runtime <released root> --state <pilot state> --package <verified course dir> [--operator-login <login name> (password on standard input)]');
const origin=new URL(args['--origin']).origin,state=path.resolve(args['--state']),runtime=path.resolve(args['--runtime']);
await verifyWorkedPackage(path.resolve(args['--package']));
const course=JSON.parse(await readFile(path.join(args['--package'],'course.manifest.json'),'utf8'));
const config=JSON.parse(await readFile(path.join(state,'config.json'),'utf8'));
const shots=path.join(state,'acceptance');await mkdir(shots,{recursive:true,mode:0o700});
const QA_SUBJECT='qa:pilot-learner';
// Explicitly named, already-fixed-upstream defects are reported, never hidden.
const knownAxe=new Set((args['--known-axe']??'').split(',').filter(Boolean));const observedKnown=new Set();

// Core 0.1.36+ pilots keep one-time sign-in codes off (the default). The dedicated QA
// account signs in through the password form with a random password this driver sets
// for it on every run (standard input only; never printed or stored). The operator's
// password belongs to the operator: it is used only when --operator-login is given and
// the password arrives on standard input. Without it, the QA-role and operator-unenrolled
// checks run in a READ ONLY transaction against the pilot database and the administration
// sign-in page is checked signed out. This driver never edits memberships.
const operator=JSON.parse(await readFile(path.join(state,'bootstrap.json'),'utf8'));
const qaPassword=harnessPassword();
const qa=JSON.parse(await runWithPassword(process.execPath,['dist/set-password-cli.js','llms-and-models',QA_SUBJECT],{cwd:path.join(runtime,'services/api'),env:{PATH:process.env.PATH,DATABASE_URL:config.databaseUrl},password:qaPassword}));
assert(qa.mustChangeOnNextSignIn===false&&qa.loginName,'QA password was not set');
let operatorPassword;
if(args['--operator-login']){let text='';for await(const chunk of process.stdin)text+=chunk;operatorPassword=text.replace(/\r?\n$/,'');assert(operatorPassword,'Operator password expected on standard input');}
async function readOnly(query){
  const db=new pg.Client({connectionString:config.databaseUrl});await db.connect();
  try{await db.query('BEGIN READ ONLY');return await query(db);}finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}
}
const qaWorkspace=await readOnly(async db=>(await db.query('SELECT m.workspace_id FROM memberships m JOIN workspaces w ON w.id=m.workspace_id WHERE w.slug=$1 AND m.user_id=$2',['llms-and-models',qa.userId])).rows[0]?.workspace_id);
assert(qa.userId!==operator.userId&&qaWorkspace===operator.workspaceId,'QA identity must be distinct from the operator');
async function operatorSignIn(){
  const signed=await fetch(origin+'/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({login:args['--operator-login'],password:operatorPassword})});
  assert(signed.ok,'Operator sign-in failed');return signed;
}
// The QA account must already be a learner. Core 0.1.23+ manages roles through
// the authenticated People API; this driver never edits memberships itself.
async function assertQaRole(){
  if(!operatorPassword){
    const role=await readOnly(async db=>(await db.query('SELECT role FROM memberships WHERE workspace_id=$1 AND user_id=$2',[operator.workspaceId,qa.userId])).rows[0]?.role);
    assert.equal(role,'learner','QA account must have the learner role; change it under People & roles');
    return 'verified_read_only_in_database';
  }
  const signed=await operatorSignIn();
  const cookie=signed.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const people=await fetch(`${origin}/api/admin/workspaces/${operator.workspaceId}/people`,{headers:{cookie}});
  if(people.status===404)return 'people_api_unavailable';
  const qaRow=(await people.json()).people.find(p=>p.userId===qa.userId);
  assert.equal(qaRow?.role,'learner','QA account must have the learner role; change it under People & roles');
  await fetch(origin+'/auth/logout',{method:'POST',headers:{origin,cookie,'x-csrf-token':(await signed.json()).csrfToken}});
  return 'verified_via_people_api';
}


const episodes=course.chapters.flatMap(c=>c.episodes),first=episodes[0],second=episodes[1];
const report={origin,course:{id:course.id,version:course.version},viewports:[],operatorEnrolled:null,liveProviderAcceptance:false};
report.qaRoleCheck=await assertQaRole();
const browser=await chromium.launch({channel:'chrome'});
async function context(name,width,height){
  const ctx=await browser.newContext({baseURL:origin,viewport:{width,height},isMobile:name==='phone',hasTouch:name!=='desktop'}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));return {ctx,page,errors};
}
async function signIn(page){
  const loggedIn=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/login'&&r.request().method()==='POST');
  await page.goto(origin+'/');await page.getByLabel('Username',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('One-time sign-in code',{exact:true}).count(),0,'One-time code field shown while codes are off');
  await page.getByLabel('Username',{exact:true}).fill(qa.loginName);await page.getByLabel('Password',{exact:true}).fill(qaPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await loggedIn;assert(response.ok(),'QA password sign-in failed');
  assert(!page.url().includes(qaPassword),'Password in the address bar');return (await response.json()).csrfToken;
}
async function quality(page,name,label){
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const ids=axe.violations.map(v=>v.id);ids.filter(id=>knownAxe.has(id)).forEach(id=>observedKnown.add(`${name}:${label}:${id}`));
  assert.deepEqual(ids.filter(id=>!knownAxe.has(id)),[],`${name} ${label} accessibility`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${name} ${label} horizontal overflow`);
  await page.screenshot({path:path.join(shots,`${name}-${label}.png`),fullPage:false});
}
try{
  // Phone: enroll and complete the first episode with independent checks.
  {
    const {ctx,page,errors}=await context('phone',390,844);
    const csrf=await signIn(page);
    await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();
    // Preserve an existing QA enrollment rather than creating another one.
    const existing=await (await page.request.get('/api/enrollments')).json();
    let enrollmentId;
    if(existing.length){
      assert.equal(existing.length,1,'QA account has unexpected enrollments');enrollmentId=existing[0].id;report.resumedExistingEnrollment=true;
      for(let step=0;step<2;step++)await page.getByRole('button',{name:'Continue learning →',exact:true}).first().click();
    }else{
      await page.getByRole('button',{name:'Open course',exact:true}).click();
      const enrolled=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/enrollments'&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Start course',exact:true}).click();
      enrollmentId=(await (await enrolled).json()).id;report.resumedExistingEnrollment=false;
      await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
    }
    report.enrollmentId=enrollmentId;
    const snapshot=async()=>(await page.request.get(`/api/enrollments/${enrollmentId}`)).json();
    const saved=(await snapshot()).lessons.find(l=>l.id===first.id);
    if(saved.status!=='completed'){
      await page.getByRole('heading',{name:first.title,exact:true}).waitFor();
      await quality(page,'phone','first-episode');
      assert(await page.getByRole('button',{name:'Complete episode →',exact:true}).isDisabled(),'Completion was available before evidence');
      for(const block of first.blocks){
        if(['assessment','activity'].includes(block.type)||saved.completedBlockIds.includes(block.id))continue;
        await page.getByRole('button',{name:'Mark this part read',exact:true}).click();
      }
      for(let step=0;step<10;step++){
        if((await snapshot()).lessons.find(l=>l.id===first.id).gate.passed)break;
        const issued=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/challenges')&&r.request().method()==='POST');
        await page.getByRole('button',{name:'Start the next check →',exact:true}).click();
        const c=await (await issued).json();assert(!('grading' in c.question),'Grading key exposed to learner');
        const a=course.assessments.find(x=>x.id===c.question.id);assert(a&&a.type!=='code','Unexpected first-episode assessment');
        if(a.type==='choice')await page.getByRole('radio',{name:a.options.find(o=>o.id===a.grading.correctOptionId).text,exact:true}).click();
        else await page.getByRole('textbox',{name:'Your numeric answer',exact:true}).fill(String(a.grading.expected));
        await page.getByRole('button',{name:'Check answer',exact:true}).click();
        await page.getByRole('button',{name:'Start the next check →',exact:true}).or(page.getByText('Your independent checks are complete.',{exact:true})).first().waitFor();
      }
      assert((await snapshot()).lessons.find(l=>l.id===first.id).gate.passed,'First gate did not pass');
      await page.getByRole('button',{name:'Complete episode →',exact:true}).click();
      report.completedInThisRun=true;
    }else report.completedInThisRun=false;
    await page.getByRole('heading',{name:second.title,exact:true}).waitFor({timeout:15000}).catch(async()=>{
      await page.getByRole('button',{name:'Continue learning →',exact:true}).first().click();await page.getByRole('heading',{name:second.title,exact:true}).waitFor();
    });
    const after=await snapshot();assert.equal(after.lessons.find(l=>l.id===first.id).status,'completed');
    assert(!after.lessons.find(l=>l.id===second.id).gate?.passed,'Second gate passed without evidence');
    await quality(page,'phone','second-episode');
    assert.deepEqual(errors,[]);report.viewports.push({name:'phone',completedEpisode:first.id,csrfIssued:Boolean(csrf)});await ctx.close();
  }
  // Tablet and desktop resume the SAME saved enrollment.
  for(const [name,width,height] of [['tablet',834,1112],['desktop',1440,960]]){
    const {ctx,page,errors}=await context(name,width,height);
    await signIn(page);
    await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();
    for(let step=0;step<2;step++)await page.getByRole('button',{name:'Continue learning →',exact:true}).first().click();
    await page.getByRole('heading',{name:second.title,exact:true}).waitFor();
    const mine=await (await page.request.get('/api/enrollments')).json();
    assert(mine.length===1&&mine[0].id===report.enrollmentId,'Resume created or selected another enrollment');
    await quality(page,name,'resumed');assert.deepEqual(errors,[]);report.viewports.push({name,resumedEpisode:second.id});await ctx.close();
  }
  // Operator administration loads, and the operator remains unenrolled.
  {
    const {ctx,page,errors}=await context('desktop',1440,960);
    await page.goto(origin+'/admin/');await page.getByLabel('Username',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('One-time sign-in code',{exact:true}).count(),0,'Admin one-time code field shown while codes are off');
    if(operatorPassword){
      await page.getByLabel('Username',{exact:true}).fill(args['--operator-login']);await page.getByLabel('Password',{exact:true}).fill(operatorPassword);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.getByRole('heading',{name:'Course & releases',level:1}).waitFor();
      await page.getByText('Selected for new learners',{exact:true}).waitFor();
      await quality(page,'admin','course');
      const enrollments=await (await page.request.get('/api/enrollments')).json();
      report.operatorEnrolled=enrollments.length>0;report.adminSignedIn=true;
    }else{
      await quality(page,'admin','sign-in');report.adminSignedIn=false;
      report.operatorEnrolled=await readOnly(async db=>Number((await db.query('SELECT count(*) FROM enrollments WHERE user_id=$1',[operator.userId])).rows[0].count)>0);
    }
    assert.equal(report.operatorEnrolled,false,'Operator must remain unenrolled');
    assert.deepEqual(errors,[]);await ctx.close();
  }
}finally{await browser.close();}
report.knownAxeDefectsObserved=[...observedKnown];
await writeFile(path.join(state,'acceptance','receipt.json'),JSON.stringify({...report,at:new Date().toISOString()},null,2),{mode:0o600});
console.log(JSON.stringify(report));
