import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

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
        const record=await bootstrap('private-browser-'+name,'learner',false),redeemed=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/redeem'&&r.request().method()==='POST');
        await page.goto(record.oneTimeSignInUrl);const login=await (await redeemed).json();
        await page.getByRole('heading',{name:'Your courses',exact:true}).waitFor();check(!page.url().includes('signin='),'browser_token_not_removed');
        const session={cookie:(await context.cookies()).map(c=>`${c.name}=${c.value}`).join('; '),csrf:login.csrfToken};
        await page.getByRole('button',{name:'Open course',exact:true}).click();
        const enrolled=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/enrollments'&&r.request().method()==='POST');
        await page.getByRole('button',{name:'Start course',exact:true}).click();const enrollmentId=(await (await enrolled).json()).id;
        await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
        const snapshot=async()=>requireOk(await request(session,'GET',`/api/enrollments/${enrollmentId}`),'browser_snapshot');
        let completed=0,recovery=false;
        for(const episode of episodes){
          await page.getByRole('heading',{name:episode.title,exact:true}).waitFor();
          check(await page.getByRole('button',{name:'Complete episode →',exact:true}).isDisabled(),'browser_completion_not_gated');
          for(const block of episode.blocks)if(!['assessment','activity'].includes(block.type))await page.getByRole('button',{name:'Mark this part read',exact:true}).click();
          const gate=course.gates.find(g=>g.id===episode.gateId),hasCode=gate.assessmentIds.some(id=>course.assessments.find(a=>a.id===id).type==='code');
          const wrongFirst=hasCode&&!recovery;let codeFailures=0;
          for(let step=0;step<10;step++){
            const s=await snapshot();if(s.lessons.find(l=>l.id===episode.id).gate.passed)break;
            const fresh=page.getByRole('button',{name:'Get a fresh check · 30 min →',exact:true}),isFresh=await fresh.count()>0;
            const endpointSuffix=isFresh?'/adaptation/fresh-question':'/challenges';
            const issued=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(endpointSuffix)&&r.request().method()==='POST');
            await (isFresh?fresh:page.getByRole('button',{name:'Start the next check →',exact:true})).click();
            const response=await issued;check(response.ok(),'browser_issue_failed');const c=await response.json();
            check(!('grading' in c.question),'browser_grading_key_exposed');
            if(c.question.type==='code'){
              const failed=wrongFirst&&!isFresh;await page.getByRole('textbox',{name:'Your code',exact:true}).fill(failed?'def solve(data): return None':candidate);
              if(isFresh){
                check(codeFailures===2,'browser_did_not_use_existing_code_variants');
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
            await page.getByRole('button',{name:'Start the next check →',exact:true}).or(page.getByRole('button',{name:'Get a fresh check · 30 min →',exact:true})).or(page.getByText('Your independent checks are complete.',{exact:true})).first().waitFor();
          }
          check((await snapshot()).lessons.find(l=>l.id===episode.id).gate.passed,'browser_gate_not_passed');
          const saved=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/complete')&&r.request().method()==='POST');
          await page.getByRole('button',{name:'Complete episode →',exact:true}).click();check((await saved).ok(),'browser_completion_save_failed');completed++;
          if(completed%14===0)console.log(JSON.stringify({checkpoint:'private_browser_progress',viewport:name,completedEpisodes:completed}));
          if(!full&&recovery)break;
          if(completed<episodes.length)await page.getByRole('button',{name:'Continue learning →',exact:true}).click();
        }
        const end=await snapshot();check(recovery&&errors.length===0,'private_browser_recovery_failed');
        if(full)check(completed===56&&end.complete&&end.nextEpisodeId===null,'browser_full_course_incomplete');
        reports.push({viewport:name,completedEpisodes:completed,recovery:true,reloadPreservedCode:true,horizontalOverflow:false,codeAccessibility:true,pageErrors:errors.length});
      }finally{await context.tracing.stop({path:path.join(state,`private-${name}-trace.zip`)});await context.close();}
    }
  }finally{await browser.close();}
  return {flow:'private_browser_learner',reports};
}
