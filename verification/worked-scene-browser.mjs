// Browser check of the design section 16 scene inside the released learner app, which
// renders it with the released @course-core/visuals player. Run from learner-browser.mjs
// when the walk reaches fnd-e04-02, at every viewport.
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import {PHASES,PHASE_LABELS,SELECTOR_LABEL,SCENE_ID} from '../scripts/create-worked-adaptive-scene.mjs';

/** What the drawing must show at each phase (independent of the scene's own expressions;
 * the values are design section 16's). */
const EXPECT={ready:['w = 0.5','b = 0','w.grad = none','prediction = none'],forward:['prediction = 1','loss = 2','w.grad = none'],
  backward:['w.grad = -4','b.grad = -2','w = 0.5'],update:['w = 0.9','b = 0.2','w.grad = none'],forward2:['prediction = 2','loss = 0.5','w = 0.9'],backward2:['w.grad = -2','b.grad = -1','w = 0.9']};

export async function checkWorkedScene({page,scope=page,course,check,state,viewport,locale='en'}){
  const labels=PHASE_LABELS[locale],visual=course.visuals.find(v=>v.id===SCENE_ID);check(labels&&visual,'scene_missing');
  const player=scope.getByRole('region',{name:visual.title??'Forward, backward, update: who writes which buffer',exact:true});
  await player.scrollIntoViewIfNeeded();await player.waitFor();
  const select=player.getByRole('combobox',{name:SELECTOR_LABEL[locale],exact:true});
  const options=(await select.locator('option').allTextContents()).map(t=>t.trim());
  check(JSON.stringify(options)===JSON.stringify(PHASES.map(p=>labels[p])),'scene_selector_labels_wrong');
  check(options.every(o=>!PHASES.includes(o)),'scene_selector_shows_raw_id');
  const drawn=async()=>(await player.locator('svg text').allTextContents()).map(t=>t.trim());
  const shows=async phase=>{const texts=await drawn();for(const want of EXPECT[phase])check(texts.includes(want),`scene_${phase}_missing_${want}`);};
  // 1. Every phase through the selector.
  for(const phase of PHASES){await select.selectOption({label:labels[phase]});await shows(phase);}
  // 2. The step buttons, one at a time, keep the selector in step.
  await select.selectOption({label:labels.ready});
  const press=async name=>{const button=player.getByRole('button',{name:new RegExp(`^${name} step`)}).filter({visible:true});check(await button.count()===1,`scene_${name}_button_count`);await button.click();};
  for(const [name,phase] of [['Forward','forward'],['Backward','backward'],['Update','update'],['Forward','forward2'],['Backward','backward2'],['Reset','ready']]){
    await press(name);check(await select.inputValue()===labels[phase],`scene_button_${phase}_selector`);await shows(phase);
  }
  // 3. Keyboard: Enter on the focused Forward step.
  await player.getByRole('button',{name:/^Forward step/}).filter({visible:true}).focus();await page.keyboard.press('Enter');
  check(await select.inputValue()===labels.forward,'scene_keyboard_step');
  const box=await player.boundingBox(),width=await page.evaluate(()=>document.documentElement.clientWidth);
  check(box&&box.x>=-1&&box.x+box.width<=width+1,'scene_wider_than_viewport');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'scene_horizontal_overflow');
  const selectBox=await select.boundingBox();check(selectBox&&selectBox.x+selectBox.width<=width+1,'scene_selector_clipped');
  const axe=await new AxeBuilder({page}).include('.ccv-player').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  check(axe.violations.length===0,'scene_accessibility_'+axe.violations.map(v=>v.id).join(','));
  await select.selectOption({label:labels.update});
  await select.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(state,`worked-scene-${viewport}.png`)});
  await select.selectOption({label:labels.ready});
  return {viewport,selectorOptions:options,phasesChecked:PHASES.length,buttonSteps:6,keyboard:true,horizontalOverflow:false,accessibilityViolations:0};
}
