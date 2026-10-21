import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {instantiateNumericalRecipe} from '@course-core/sdk';
import {formula,render} from './stage-worked-examples.mjs';

// Delayed retention checks are held-out numeric items built from the course's own
// reviewed numerical recipes. Variables are chosen so a retention item never
// repeats a numeric recovery variant (ordinals below the family's variant cap),
// a staged worked example (seeds 0-4 and the maximum corner) or the authored
// bank binding. Expected values come from the released SDK evaluator here and
// are recomputed independently by verification/evidence-features.py.
export const INTERVALS_DAYS=[2,7,21];
export const ITEMS_PER_OBJECTIVE=4;
export const RETENTION_KEYS=['03-03','04-03','06-04','07-01','10-02','13-04'];
const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const variablesAt=(recipe,ordinal)=>{let rest=ordinal;const out={};for(const v of recipe.variables){const width=v.maximum-v.minimum+1;out[v.name]=v.minimum+rest%width;rest=Math.floor(rest/width);}return rest===0?out:null;};
const space=recipe=>recipe.variables.reduce((n,v)=>n*(v.maximum-v.minimum+1),1);
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);

// Design section 16 asks to revisit the worked episode's transfer question later. Its
// objective, fnd-o04-02, has a recipe whose nine combinations are all recovery variants,
// so the revisit is authored: the same middle pipeline split as the transfer items
// (wae-transfer-split-grad/-state), with new numbers, asking in turn for the weight
// gradient, the weight before any optimizer step, the sensitivity sent upstream and the
// weight after one plain descent step. Every value is an exact binary fraction.
export const TRANSFER_REVISIT={objectiveId:'fnd-o04-02',episodeId:'fnd-e04-02',key:'04-02',procedure:'pipeline-middle-split',items:[
  {ask:'weight_gradient',h1:6,w:2,b:1,g:0.25},
  {ask:'weight_before_step',h1:5,w:1.75,b:-1,g:0.5},
  {ask:'upstream_sensitivity',h1:3,w:-2,b:0.5,g:0.75},
  {ask:'weight_after_step',h1:2,w:0.5,b:2,g:-1.5,lr:0.25},
]};
const SPLIT='Delayed retention check. Three pipeline splits train one model. The middle split computes h2 = w*h1 + b; it saved h1 = {h1} during its forward pass and holds w = {w} and b = {b}. During backward the downstream split sends it dL/dh2 = {g}.';
const ASK={
  weight_gradient:{question:'What is dL/dw at the middle split?',value:v=>v.g*v.h1,work:v=>`dL/dw = dL/dh2 * h1 = ${v.g} * ${v.h1} = ${v.g*v.h1}`},
  weight_before_step:{question:'The middle split receives the message and finishes its own backward. No optimizer step has run yet. What is the value of w now?',value:v=>v.w,work:v=>`receiving dL/dh2 and running backward write only gradient buffers (dL/dw = ${v.g*v.h1}), so w is still ${v.w}`},
  upstream_sensitivity:{question:'What sensitivity dL/dh1 does the middle split send to the upstream split?',value:v=>v.g*v.w,work:v=>`dL/dh1 = dL/dh2 * w = ${v.g} * ${v.w} = ${v.g*v.w}`},
  weight_after_step:{question:'After its backward, one plain gradient-descent step with learning rate {lr} runs on the middle split. What is w after that step?',value:v=>v.w-v.lr*v.g*v.h1,work:v=>`dL/dw = ${v.g} * ${v.h1} = ${v.g*v.h1}, then w = ${v.w} - ${v.lr} * (${v.g*v.h1}) = ${v.w-v.lr*v.g*v.h1}`},
};
const fill=(text,v)=>text.replace(/\{(\w+)\}/g,(_,k)=>String(v[k]));
function transferRevisit(){
  const {objectiveId,episodeId,key,procedure,items}=TRANSFER_REVISIT;
  const assessments=items.map((v,index)=>{const ask=ASK[v.ask],value=ask.value(v);
    assert(Number.isFinite(value)&&Math.abs(value*1000-Math.round(value*1000))<1e-6,'Transfer revisit answers need at most three decimals');
    return {id:`ret-${key}-${index+1}`,type:'numeric',objectiveIds:[objectiveId],familyId:`ret-family-${key}`,prompt:fill(SPLIT+' '+ask.question,v),
      grading:{expected:value,absoluteTolerance:1e-9,explanation:`Computation: ${ask.work(v)}. Receiving a gradient message and running backward never change a weight; only the optimizer step does. This revisits the transfer question of Backward propagates sensitivities.`}};});
  assert.equal(new Set(assessments.map(a=>a.grading.expected)).size,items.length,'Transfer revisit answers must differ');
  return {objective:{objectiveId,episodeId,procedure,key,variables:items},assessments};
}

export async function createRetentionChecks(){
  const authored=await read('content/adaptation-authoring.json'),fragments=await Promise.all(['foundations','training-and-transformers','systems-and-distribution','engineering-practice'].map(n=>read(`content/${n}.json`)));
  const assessments=fragments.flatMap(f=>f.assessments),episodes=fragments.flatMap(f=>f.chapters.flatMap(c=>c.episodes));
  const items=[],objectives=[];
  for(const key of RETENTION_KEYS){
    const recipe=authored.adaptation.numericalRecipes.find(r=>r.id==='ada-recipe-'+key);assert(recipe,`Missing recipe ${key}`);
    const binding=authored.bindings.find(b=>b.templateId===recipe.id),family=authored.adaptation.families.find(f=>f.numericalRecipeIds.includes(recipe.id));
    const canonical=assessments.find(a=>a.id===family.canonicalAssessmentId),episode=episodes.find(e=>e.id===binding.episodeId);
    assert(canonical?.type==='numeric'&&episode.objectiveIds.length===1,'Retention needs a numeric canonical item on a single-objective episode');
    const objectiveId=episode.objectiveIds[0];
    const excluded=[binding.variables];
    for(let ordinal=0;ordinal<Math.min(family.maxVariantsPerPlan,space(recipe));ordinal++)excluded.push(variablesAt(recipe,ordinal));
    for(const seed of [0,1,2,3,4,-1])excluded.push(Object.fromEntries(recipe.variables.map(v=>[v.name,seed<0?v.maximum:v.minimum+seed%(v.maximum-v.minimum+1)])));
    const chosen=[],answers=new Set();
    // Highest ordinals first: farthest from the recovery enumerator's start.
    for(let ordinal=space(recipe)-1;ordinal>=0&&chosen.length<ITEMS_PER_OBJECTIVE;ordinal--){
      const variables=variablesAt(recipe,ordinal);
      if(excluded.some(x=>same(x,variables)))continue;
      const instance=await instantiateNumericalRecipe(recipe,variables);
      // A learner types the answer: keep values with at most three decimals.
      if(answers.has(instance.value)||Math.abs(instance.value*1000-Math.round(instance.value*1000))>1e-6)continue;
      answers.add(instance.value);chosen.push({ordinal,variables,instance});
    }
    assert.equal(chosen.length,ITEMS_PER_OBJECTIVE,`Recipe ${key} lacks enough held-out combinations`);
    for(const [index,{variables,instance}] of chosen.entries())items.push({
      id:`ret-${key}-${index+1}`,type:'numeric',objectiveIds:[objectiveId],familyId:`ret-family-${key}`,
      prompt:'Delayed retention check. '+instance.prompt,
      grading:{expected:instance.value,absoluteTolerance:canonical.grading.absoluteTolerance,explanation:`Computation: ${render(formula(recipe.expression),variables)} = ${instance.value}. This applies the same procedure as ${episode.title}.`},
    });
    objectives.push({objectiveId,episodeId:episode.id,recipeId:recipe.id,key,variables:chosen.map(c=>c.variables)});
  }
  const revisit=transferRevisit();assert.equal(revisit.assessments.length,ITEMS_PER_OBJECTIVE);
  objectives.push(revisit.objective);items.push(...revisit.assessments);
  return {schemaVersion:1,intervalsDays:INTERVALS_DAYS,source:'content/adaptation-authoring.json numerical recipes',objectives,assessments:items};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const value=await createRetentionChecks();
  await writeFile(new URL('content/retention-checks.json',root),JSON.stringify(value,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({objectives:value.objectives.length,items:value.assessments.length,intervalsDays:value.intervalsDays}));
}
