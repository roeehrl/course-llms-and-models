// Native pilot acceptance through the real browser UI of a RUNNING pilot.
// A dedicated QA account enrolls on a phone viewport, completes the first
// episode's independent checks, then resumes the same enrollment on tablet and
// desktop. The operator is never enrolled. Author keys stay in this driver.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import pg from 'pg';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {verifyWorkedPackage} from '../scripts/package-worked-course.mjs';

const exec=promisify(execFile);
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>index%2?pairs:[...pairs,[value,all[index+1]]],[]));
assert(args['--origin']&&args['--runtime']&&args['--state']&&args['--package'],'Usage: pilot-acceptance.mjs --origin <url> --runtime <released root> --state <pilot state> --package <verified course dir>');
const origin=new URL(args['--origin']).origin,state=path.resolve(args['--state']),runtime=path.resolve(args['--runtime']);
await verifyWorkedPackage(path.resolve(args['--package']));
const course=JSON.parse(await readFile(path.join(args['--package'],'course.manifest.json'),'utf8'));
const config=JSON.parse(await readFile(path.join(state,'config.json'),'utf8'));
const shots=path.join(state,'acceptance');await mkdir(shots,{recursive:true,mode:0o700});
const QA_SUBJECT='qa:pilot-learner';
// Explicitly named, already-fixed-upstream defects are reported, never hidden.
const knownAxe=new Set((args['--known-axe']??'').split(',').filter(Boolean));const observedKnown=new Set();

async function code(subject,name){
  const {stdout}=await exec(process.execPath,['dist/bootstrap-cli.js','llms-and-models',subject,name],{cwd:path.join(runtime,'services/api'),env:{PATH:process.env.PATH,DATABASE_URL:config.databaseUrl,PUBLIC_ORIGIN:origin}});
  return JSON.parse(stdout);
}
const operator=JSON.parse(await readFile(path.join(state,'bootstrap.json'),'utf8'));
const qa=await code(QA_SUBJECT,'QA learner');
assert(qa.userId!==operator.userId&&qa.workspaceId===operator.workspaceId,'QA identity must be distinct from the operator');
// There is no released membership-management API yet; the QA account is the
// only row changed, and only from owner to learner.
const db=new pg.Pool({connectionString:config.databaseUrl,max:1});
try{
  const changed=await db.query("UPDATE memberships m SET role='learner' FROM app_users u WHERE m.user_id=u.id AND u.subject=$1 AND m.workspace_id=$2 AND m.user_id<>$3",[QA_SUBJECT,qa.workspaceId,operator.userId]);
  assert(changed.rowCount===1,'Expected exactly one QA membership');
}finally{await db.end();}

const episodes=course.chapters.flatMap(c=>c.episodes),first=episodes[0],second=episodes[1];
const report={origin,course:{id:course.id,version:course.version},viewports:[],operatorEnrolled:null,liveProviderAcceptance:false};
const browser=await chromium.launch({channel:'chrome'});
async function context(name,width,height){
  const ctx=await browser.newContext({baseURL:origin,viewport:{width,height},isMobile:name==='phone',hasTouch:name!=='desktop'}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));return {ctx,page,errors};
}
async function signIn(page,subject,name){
  const record=await code(subject,name),redeemed=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/redeem'&&r.request().method()==='POST');
  await page.goto(record.oneTimeSignInUrl);const login=await (await redeemed).json();
  assert(!page.url().includes('signin='),'Sign-in token remained in the address bar');return login.csrfToken;
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
    const csrf=await signIn(page,QA_SUBJECT,'QA learner');
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
    await signIn(page,QA_SUBJECT,'QA learner');
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
    const record=await code(operator.userId?'operator:owner':'operator:owner','Course operator');
    await page.goto(origin+'/admin/');
    await page.getByLabel('One-time sign-in code').fill(new URL(record.oneTimeSignInUrl).hash.slice('#signin='.length));
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('heading',{name:'Course & releases',level:1}).waitFor();
    await page.getByText('Selected for new learners',{exact:true}).waitFor();
    await quality(page,'admin','course');
    const enrollments=await (await page.request.get('/api/enrollments')).json();
    report.operatorEnrolled=enrollments.length>0;assert.equal(report.operatorEnrolled,false,'Operator must remain unenrolled');
    assert.deepEqual(errors,[]);await ctx.close();
  }
}finally{await browser.close();}
report.knownAxeDefectsObserved=[...observedKnown];
await writeFile(path.join(state,'acceptance','receipt.json'),JSON.stringify({...report,at:new Date().toISOString()},null,2),{mode:0o600});
console.log(JSON.stringify(report));
