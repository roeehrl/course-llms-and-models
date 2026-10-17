import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {writtenAnswers} from './written-answers.mjs';
import {expectResponse} from './browser-responses.mjs';

/** Actual private learner UI. Author keys live only in this test driver. */
export async function browserAcceptance({origin,bootstrap,request,requireOk,course,candidate,check,state}){
  const browser=await chromium.launch({channel:process.env.CI==='true'?undefined:'chrome'}),reports=[];
  const episodes=course.chapters.flatMap(c=>c.episodes);
  try{
    for(const [name,width,height,full] of [['phone',390,844,true],['desktop',1440,960,false],['tablet',834,1112,false]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:name==='phone',hasTouch:name!=='desktop'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await context.tracing.start({screenshots:true,snapshots:true});
      try{
        // Core 0.1.36+: the learner signs in through the username and password form; one-time codes are off.
        const record=await bootstrap('private-browser-'+name,'learner',false),loggedIn=expectResponse(page,r=>new URL(r.url()).pathname==='/auth/login'&&r.request().method()==='POST');
        await page.goto(origin+'/');await page.getByLabel('Username',{exact:true}).waitFor();
        check(await page.getByLabel('One-time sign-in code',{exact:true}).count()===0,'browser_code_field_shown_while_disabled');
        await page.getByLabel('Username',{exact:true}).fill(record.loginName);await page.getByLabel('Password',{exact:true}).fill(record.password);
        await page.getByRole('button',{name:'Sign in',exact:true}).click();const loginResponse=await loggedIn;check(loginResponse.ok(),'browser_password_sign_in_failed');const login=await loginResponse.json();
        await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();check(!page.url().includes(record.password),'browser_password_in_url');
        const session={cookie:(await context.cookies()).map(c=>`${c.name}=${c.value}`).join('; '),csrf:login.csrfToken};
        await page.getByRole('button',{name:'Open course',exact:true}).click();
        const enrolled=expectResponse(page,r=>new URL(r.url()).pathname==='/api/enrollments'&&r.request().method()==='POST');
        await page.getByRole('button',{name:'Start course',exact:true}).click();const enrollmentId=(await (await enrolled).json()).id;
        const pathname=suffix=>r=>new URL(r.url()).pathname.endsWith(suffix)&&r.request().method()==='POST';
        // Optional placement is offered on the overview before any study. The phone
        // leaves it untouched, desktop declines it and tablet takes it and accepts.
        await page.getByRole('heading',{name:'Already know some of this?',exact:true}).waitFor();
        let placed=0,placement='ignored';
        if(name==='desktop'){
          const declined=expectResponse(page,pathname('/placement/decline'));
          await page.getByRole('button',{name:'Start from the beginning',exact:true}).click();check((await declined).ok(),'browser_placement_decline_failed');
          await page.getByRole('heading',{name:'Already know some of this?',exact:true}).waitFor({state:'detached'});placement='declined';
        }
        if(name==='tablet'){
          const items=course.placement.assessmentIds.length;let issued=expectResponse(page,pathname('/challenges'));
          await page.getByRole('button',{name:'Find my starting point',exact:true}).click();
          for(let n=0;n<items;n++){
            const response=await issued;check(response.ok(),'browser_placement_issue_failed');const c=await response.json();
            check(!('grading' in c.question)&&course.placement.assessmentIds.includes(c.question.id),'browser_placement_item_wrong');
            const a=course.assessments.find(x=>x.id===c.question.id);
            if(a.type==='choice')await page.getByRole('radio',{name:a.options.find(o=>o.id===a.grading.correctOptionId).text,exact:true}).click();
            else await page.getByRole('textbox',{name:'Your numeric answer',exact:true}).fill(String(a.grading.expected));
            const saved=expectResponse(page,pathname('/answers'));if(n<items-1)issued=expectResponse(page,pathname('/challenges'));
            await page.getByRole('button',{name:'Save answer',exact:true}).click();check((await saved).ok(),'browser_placement_answer_failed');
          }
          const finished=expectResponse(page,pathname('/placement/finish'));await page.getByRole('button',{name:'See my result',exact:true}).click();check((await finished).ok(),'browser_placement_finish_failed');
          await page.getByRole('heading',{name:'Your placement result',exact:true}).waitFor();
          const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();check(axe.violations.length===0,'browser_placement_accessibility');
          const start=episodes.find(e=>!course.placement.objectiveIds.includes(e.objectiveIds[0]));
          const accepted=expectResponse(page,pathname('/placement/accept'));
          await page.getByRole('button',{name:`Start at “${start.title}”`,exact:true}).click();const result=await (await accepted).json();
          placed=result.placedEpisodeIds.length;check(placed===items/2&&result.nextEpisodeId===start.id,'browser_placement_accept_wrong');placement='accepted';
          // The overview refreshes after acceptance; continue only from the refreshed path.
          await page.getByRole('heading',{name:'Your placement result',exact:true}).waitFor({state:'detached'});
        }
        await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
        const snapshot=async()=>requireOk(await request(session,'GET',`/api/enrollments/${enrollmentId}`),'browser_snapshot');
        let completed=0,recovery=false,written=0;
        for(const episode of episodes.slice(placed)){
          const episodeStarted=performance.now();
          await page.getByRole('heading',{name:episode.title,exact:true}).waitFor();
          check(await page.getByRole('button',{name:'Complete episode →',exact:true}).isDisabled(),'browser_completion_not_gated');
          // Each part is marked inside its own numbered card, after the previous read has been
          // saved: the card advances only when the refreshed progress arrives, so an unscoped
          // second click can land on the part just read and be ignored, leaving a part unread.
          const reading=episode.blocks.filter(b=>!['assessment','activity'].includes(b.type));
          for(let part=1;part<=reading.length;part++){
            const read=expectResponse(page,pathname('/read'));
            await page.getByRole('article',{name:`Reading part ${part}`,exact:true}).getByRole('button',{name:'Mark this part read',exact:true}).click();
            check((await read).ok(),'browser_read_failed');
          }
          const gate=course.gates.find(g=>g.id===episode.gateId),hasCode=gate.assessmentIds.some(id=>course.assessments.find(a=>a.id===id).type==='code');
          const wrongFirst=hasCode&&!recovery;let codeFailures=0;
          for(let step=0;step<10;step++){
            const s=await snapshot();if(s.lessons.find(l=>l.id===episode.id).gate.passed)break;
            const fresh=page.getByRole('button',{name:'Get a fresh check · 45 min →',exact:true}),isFresh=await fresh.count()>0;
            const endpointSuffix=isFresh?'/adaptation/fresh-question':'/challenges';
            const issued=expectResponse(page,r=>new URL(r.url()).pathname.endsWith(endpointSuffix)&&r.request().method()==='POST');
            await (isFresh?fresh:page.getByRole('button',{name:'Start the next check →',exact:true})).click();
            const response=await issued;check(response.ok(),'browser_issue_failed');const c=await response.json();
            check(!('grading' in c.question),'browser_grading_key_exposed');
            if(c.question.type==='rubric'){
              // The written explanation is offered first and goes to a person; the short checks still decide the gate.
              check(c.question.criteria?.length===course.assessments.find(a=>a.id===c.question.id).grading.rubric.length,'browser_rubric_criteria_missing');
              await page.getByRole('textbox',{name:'Your explanation',exact:true}).fill(writtenAnswers[c.question.id].text);
              const submitted=expectResponse(page,pathname('/answers'));await page.getByRole('button',{name:'Submit for review',exact:true}).click();
              const r=await (await submitted).json();check(r.result.pendingReview&&!r.result.passed,'browser_written_answer_not_pending');written++;
            }else if(c.question.type==='code'){
              const failed=wrongFirst&&!isFresh;await page.getByRole('textbox',{name:'Your code',exact:true}).fill(failed?'def solve(data): return None':candidate);
              if(isFresh){
                check(codeFailures===1,'browser_did_not_use_existing_code_variants');
                check(await page.getByRole('button',{name:'Complete episode →',exact:true}).isDisabled(),'browser_fresh_question_granted_credit');
                check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'browser_code_horizontal_overflow');
                const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();check(axe.violations.length===0,'browser_code_accessibility');
                await page.screenshot({path:path.join(state,`private-recovery-${name}.png`),fullPage:true});
                await page.reload();await page.getByRole('button',{name:'Continue learning →',exact:true}).click();await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
                check(await page.getByRole('textbox',{name:'Your code',exact:true}).inputValue()===candidate,'browser_code_draft_lost');recovery=true;
              }
              await page.getByRole('button',{name:'Run code & check',exact:true}).click();if(failed)codeFailures++;
            }else{
              const a=course.assessments.find(a=>a.id===c.question.id);check(a,'browser_unknown_baseline');
              if(c.question.type==='choice')await page.getByRole('radio',{name:a.options.find(o=>o.id===a.grading.correctOptionId).text,exact:true}).click();
              else await page.getByRole('textbox',{name:'Your numeric answer',exact:true}).fill(String(a.grading.expected));
              await page.getByRole('button',{name:'Check answer',exact:true}).click();
            }
            await page.getByRole('button',{name:'Start the next check →',exact:true}).or(page.getByRole('button',{name:'Get a fresh check · 45 min →',exact:true})).or(page.getByText('Your independent checks are complete.',{exact:true})).first().waitFor();
          }
          check((await snapshot()).lessons.find(l=>l.id===episode.id).gate.passed,'browser_gate_not_passed');
          const saved=expectResponse(page,r=>new URL(r.url()).pathname.endsWith('/complete')&&r.request().method()==='POST');
          await page.getByRole('button',{name:'Complete episode →',exact:true}).click();check((await saved).ok(),'browser_completion_save_failed');completed++;
          console.log(JSON.stringify({episodeTiming:'private_browser',viewport:name,episode:completed,episodeId:episode.id,ms:Math.round(performance.now()-episodeStarted)}));
          if(completed%14===0)console.log(JSON.stringify({checkpoint:'private_browser_progress',viewport:name,completedEpisodes:completed}));
          if(!full&&recovery)break;
          if(completed<episodes.length)await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
        }
        const end=await snapshot();check(recovery&&errors.length===0,'private_browser_recovery_failed');
        if(full)check(completed===56&&end.complete&&end.nextEpisodeId===null&&written===course.assessments.filter(a=>a.type==='rubric').length,'browser_full_course_incomplete');
        reports.push({viewport:name,placement,placedEpisodes:placed,writtenExplanationsSubmitted:written,completedEpisodes:completed,recovery:true,reloadPreservedCode:true,horizontalOverflow:false,codeAccessibility:true,pageErrors:errors.length});
      }finally{await context.tracing.stop({path:path.join(state,`private-${name}-trace.zip`)});await context.close();}
    }
  }finally{await browser.close();}
  return {flow:'private_browser_learner',reports};
}
