import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {assemble,fragments,loadOverlays,VISUAL_OVERLAYS,applyLearnerEvidence} from '../scripts/assemble.mjs';
import {bindRecoveryRuntime} from '../scripts/bind-recovery-runtime.mjs';
import {stageWorkedExamples} from '../scripts/stage-worked-examples.mjs';
import {createRetentionChecks} from '../scripts/create-retention-checks.mjs';
const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const [config,modules,overlays]=await Promise.all([read('content/course-config.json'),Promise.all(fragments.map(name=>read(`content/${name}.json`))),loadOverlays()]);
const without=assemble(config,modules,{...overlays,writtenOverlay:undefined,placementOverlay:undefined,retentionOverlay:undefined}).server;
const full=assemble(config,modules,overlays);

test('written explanations join gates as an extra first family without changing any threshold or existing item',()=>{
  const items=full.server.assessments.filter(a=>a.type==='rubric'&&a.id.startsWith('wri-'));assert.equal(items.length,4);
  for(const gate of full.server.gates){
    const old=without.gates.find(g=>g.id===gate.id),added=gate.assessmentIds.filter(id=>!old.assessmentIds.includes(id));
    assert.equal(gate.minimumIndependentFamilies,old.minimumIndependentFamilies);assert.equal(gate.requireAllObjectives,old.requireAllObjectives);
    assert.deepEqual(gate.assessmentIds.filter(id=>old.assessmentIds.includes(id)),old.assessmentIds);
    if(added.length){assert.deepEqual(added,[gate.assessmentIds.filter(id=>id!=='portfolio-final')[0]]);assert.equal(items.find(a=>a.id===added[0]).objectiveIds.every(o=>gate.objectiveIds.includes(o)),true);}
  }
  for(const a of without.assessments)assert.deepEqual(full.server.assessments.find(b=>b.id===a.id),a);
  const evaluator=full.server.extensions.find(e=>e.id==='course-core-reviewed-rubric');assert.equal(evaluator.integrity,'sha256-d162a0182dad8fa60245e1eeee433a6efe7f52c9fa17d514de4822f0bf2adea3');
  // Teaching prose is untouched: only an assessment block is added.
  for(const episode of without.chapters.flatMap(c=>c.episodes)){
    const now=full.server.chapters.flatMap(c=>c.episodes).find(e=>e.id===episode.id);
    assert.deepEqual(now.blocks.filter(b=>b.type!=='assessment'),episode.blocks.filter(b=>b.type!=='assessment'));
  }
  const practical=structuredClone(overlays.writtenOverlay);practical.bindings[0]={episodeId:'fnd-e04-04',assessmentId:practical.bindings[0].assessmentId};practical.assessments[0].objectiveIds=['fnd-o04-04'];
  assert.throws(()=>assemble(config,modules,{...overlays,writtenOverlay:practical}),/non-practical gates/);
});

test('placement offers only the existing short checks of placeable chapters and retention items stay held out of the learner bundle',()=>{
  const {placement,retention}=full.server;
  assert.equal(placement.objectiveIds.length,12);assert.equal(placement.assessmentIds.length,24);assert.equal(placement.maxItems,24);
  assert(placement.assessmentIds.every(id=>['choice','numeric'].includes(full.server.assessments.find(a=>a.id===id).type)));
  assert.deepEqual(retention.intervalsDays,[2,7,21]);assert.equal(retention.objectiveIds.length,7);assert.equal(retention.assessmentIds.length,28);assert(retention.objectiveIds.includes("fnd-o04-02"),"the section 16 transfer revisit is scheduled");
  const shown=new Set([...full.server.gates.flatMap(g=>g.assessmentIds),...placement.assessmentIds]);
  assert(retention.assessmentIds.every(id=>!shown.has(id)));
  const learner=JSON.stringify(full.learner);assert(!retention.assessmentIds.some(id=>learner.includes(id)));assert(!learner.includes('Delayed retention check'));
  assert.deepEqual(full.learner.retention.intervalsDays,[2,7,21]);
  const wrong=structuredClone(overlays.placementOverlay);wrong.placement.assessmentIds.push('wri-06-03');wrong.placement.maxItems++;
  assert.throws(()=>applyLearnerEvidence(structuredClone(without),{placementOverlay:wrong}),/existing short checks/);
  const reused=structuredClone(overlays.retentionOverlay);reused.assessments[0].id='fnd-a03-03-trace';
  assert.throws(()=>applyLearnerEvidence(structuredClone(without),{retentionOverlay:reused}),/held-out/);
});

test('retention generation is reproducible from the reviewed recipes',async()=>{
  assert.deepEqual(await createRetentionChecks(),overlays.retentionOverlay);
});

test('remedial episodes bind as optional metered teaching-bank insertions only inside their anchors',async()=>{
  const [descriptors,authored,fresh,codeRecovery,remedial]=await Promise.all([read('runtime/installed-adaptation-descriptors.json'),read('content/adaptation-authoring.json'),read('content/fresh-assessments.json'),read('content/practical-recovery.json'),read('content/remedial-episodes.json')]);
  const base=assemble(config,modules,await loadOverlays({recovery:false})).server,input={descriptors:descriptors.adapters,authored,fresh,codeRecovery,remedial,baseCourse:base};
  const {configuration,overlay}=bindRecoveryRuntime(input),inserted=configuration.profiles.filter(p=>p.operation==='insert_episode');
  assert.equal(inserted.length,5);assert(inserted.every(p=>p.classification==='optional'&&p.additionalEpisodes===1&&p.adapterId==='authored-teaching-bank-v1'&&p.teachingBank.length===1&&p.teachingBank[0].kind==='episode'));
  assert.deepEqual(configuration.profiles.filter(p=>p.operation!=='insert_episode'),(await read('runtime/recovery-registry.json')).profiles.filter(p=>p.operation!=='insert_episode'));
  assert.equal(overlay.qualification.remedialEpisodes,'reviewed_teaching_bank_insert_episode');
  const compiled=assemble(config,modules,{...overlays,recoveryOverlay:overlay});assert(!JSON.stringify(compiled.learner).includes(remedial.entries[0].blocks[0].markdown.slice(0,60)));
  const missing=structuredClone(input);missing.descriptors=missing.descriptors.filter(d=>d.kind!=='teaching-bank');assert.throws(()=>bindRecoveryRuntime(missing),/absent or ambiguous/);
  const outside=structuredClone(input);outside.remedial.entries[0].objectiveIds=['ttf-o07-02'];assert.throws(()=>bindRecoveryRuntime(outside),/anchor objectives/);
  const required=structuredClone(input);required.remedial.entries[0].classification='required';assert.throws(()=>bindRecoveryRuntime(required),/effort/);
});

test('packaging includes every verified illustration overlay and the same learner evidence as the assembled course',async()=>{
  assert.deepEqual(VISUAL_OVERLAYS,['visuals','systems-visuals','learning-visuals','concept-visuals','worked-adaptive-visuals']);
  const staged=await stageWorkedExamples(),visuals=(await Promise.all(VISUAL_OVERLAYS.map(n=>read(`content/${n}.json`)))).flatMap(o=>o.visuals);
  assert.equal(staged.compiled.server.visuals.length,visuals.length);assert.equal(visuals.length,57);
  const illustrated=new Set(staged.compiled.server.chapters.flatMap(c=>c.episodes).filter(e=>e.blocks.some(b=>b.type==='visual')).map(e=>e.id));
  assert.equal(illustrated.size,new Set((await Promise.all(VISUAL_OVERLAYS.map(n=>read(`content/${n}.json`)))).flatMap(o=>o.bindings.map(b=>b.episodeId))).size);
  for(const field of ['gates','assessments','placement','retention','chapters','visuals'])assert.deepEqual(staged.compiled.server[field],full.server[field],field);
});

test('independent CPU checks recompute every retention answer and every remedial and written-explanation number',()=>{
  const result=spawnSync('python3',['-B','verification/evidence-features.py'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
  assert.equal(report.retentionItems,28);assert.equal(report.remedialEpisodes,5);assert.equal(report.writtenItems,4);assert.equal(report.learningEffectiveness,'not_measured');
});

test('acceptance written answers cite every criterion with an exact quote of the learner text',async()=>{
  const {writtenAnswers}=await import('../verification/written-answers.mjs');
  for(const item of overlays.writtenOverlay.assessments){
    const fixture=writtenAnswers[item.id];assert(fixture,item.id);
    assert.deepEqual(Object.keys(fixture.quotes).sort(),item.grading.rubric.map(c=>c.id).sort());
    for(const quote of Object.values(fixture.quotes)){assert(fixture.text.includes(quote),quote);assert(quote.length>=10&&quote.length<=800);}
    assert(fixture.text.length>=20&&fixture.text.length<=8000);
  }
});
