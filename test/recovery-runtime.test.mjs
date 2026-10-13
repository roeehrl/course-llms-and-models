import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assemble,fragments} from '../scripts/assemble.mjs';
import {bindRecoveryRuntime} from '../scripts/bind-recovery-runtime.mjs';
const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const [config,modules,practical,visuals,authored,fresh,installed]=await Promise.all([
  read('content/course-config.json'),Promise.all(fragments.map(name=>read(`content/${name}.json`))),read('content/practicals.json'),Promise.all(['visuals','systems-visuals'].map(name=>read(`content/${name}.json`))),read('content/adaptation-authoring.json'),read('content/fresh-assessments.json'),read('runtime/installed-adaptation-descriptors.json'),
]);
const base=assemble(config,modules,{practicalOverlay:practical,visualOverlays:visuals}),input={baseCourse:base.server,authored,fresh,descriptors:installed.adapters};
test('reviewed runtime binding keeps all canonical gates and baseline questions unchanged and hides authority data',()=>{
  const before=JSON.stringify(input),bound=bindRecoveryRuntime(input),result=assemble(config,modules,{practicalOverlay:practical,visualOverlays:visuals,recoveryOverlay:bound.overlay});
  assert.equal(JSON.stringify(input),before);assert.equal(bound.configuration.profiles.length,112);assert.equal(bound.configuration.profiles.filter(p=>p.templateId).length,39);assert.equal(bound.configuration.profiles.filter(p=>p.bank).length,73);
  assert.deepEqual(result.server.assessments,base.server.assessments);assert.deepEqual(result.server.gates,base.server.gates);
  assert(!('adaptation' in result.learner));assert(!JSON.stringify(result.learner).includes('ada-recipe-'));assert(!JSON.stringify(result.learner).includes('correctOptionId'));
  assert.equal(bound.overlay.qualification.registryAuthorization,'not_granted');assert.equal(bound.overlay.qualification.practicalRecovery,'not_covered');
});
test('missing, duplicate, unqualified or invalid installed creator metadata cannot be bound',()=>{
  for(const mutate of [x=>{x.descriptors=[];},x=>{x.descriptors.push(structuredClone(x.descriptors[0]));},x=>{x.descriptors[0].implementationDigest='not-a-digest';},x=>{x.descriptors[0].authorization='approved';},x=>{x.descriptors[0].kind='custom';}]){
    const bad=structuredClone(input);mutate(bad);assert.throws(()=>bindRecoveryRuntime(bad));
  }
});
test('a reviewed bank cannot switch canonical type, family or objectives during generic binding',()=>{
  const bound=bindRecoveryRuntime(input),bankId=bound.configuration.profiles.find(p=>p.bank).bank[0].assessment.id;
  for(const mutate of [a=>{a.familyId='new-credit-family';},a=>{a.objectiveIds=['different-concept'];},a=>{a.type='code';}]){
    const bad=structuredClone(input);mutate(bad.fresh.assessments.find(a=>a.id===bankId));assert.throws(()=>bindRecoveryRuntime(bad));
  }
  const bad=structuredClone(input);bad.baseCourse.adaptation=bound.overlay.adaptation;assert.throws(()=>bindRecoveryRuntime(bad),/unadapted baseline/);
});
test('real binding CLI is repeatable even when dist already contains a recovery release',async()=>{
  const before=await read('content/recovery-runtime.json');
  for(let i=0;i<2;i++){
    const result=spawnSync(process.execPath,['scripts/bind-recovery-runtime.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);
    assert.deepEqual(await read('content/recovery-runtime.json'),before);
  }
});
test('all practical families bind reviewed alternatives without replacing canonical gates or exposing fixture keys',async()=>{
  const [runtime,codeRecovery]=await Promise.all([read('content/practical-runtime.json'),read('content/practical-recovery.json')]);
  const rebased=assemble(config,modules,{practicalOverlay:practical,practicalRuntimeOverlay:runtime,visualOverlays:visuals});
  const bound=bindRecoveryRuntime({...input,baseCourse:rebased.server,codeRecovery}),compiled=assemble(config,modules,{practicalOverlay:practical,practicalRuntimeOverlay:runtime,visualOverlays:visuals,recoveryOverlay:bound.overlay});
  assert.equal(bound.configuration.profiles.length,115);const code=bound.configuration.profiles.filter(p=>p.adapterId==='authored-code-bank-v1');assert.equal(code.length,3);assert(code.every(p=>p.bank.length===2&&p.plannedMinutes===30));
  assert.deepEqual(compiled.server.gates,base.server.gates);assert.equal(compiled.server.assessments.length,base.server.assessments.length);
  const before=base.server.assessments.map(a=>({...a,grading:undefined})),after=compiled.server.assessments.map(a=>({...a,grading:undefined}));assert.deepEqual(after,before);
  for(const a of codeRecovery.assessments){assert(!compiled.server.assessments.some(b=>b.id===a.id));assert(!JSON.stringify(compiled.learner).includes(a.prompt));assert(!JSON.stringify(compiled.learner).includes(a.grading.fixtureRef));}
  const bytes=await readFile(new URL('runtime/code-fixtures-recovery.json',root));assert.equal(runtime.extension.integrity,'sha256-'+createHash('sha256').update(bytes).digest('hex'));
  const registry=JSON.parse(bytes),old=await read('runtime/code-fixtures.json');assert.deepEqual(registry.fixtures.slice(0,6),old.fixtures);assert.notEqual(registry.id,old.id);
  for(const mutate of [p=>{p.replaces.integrity='sha256-'+'f'.repeat(64);},p=>{p.extension.id=p.replaces.id;}]){
    const bad=structuredClone(runtime);mutate(bad);assert.throws(()=>assemble(config,modules,{practicalOverlay:practical,practicalRuntimeOverlay:bad}));
  }
  const bad=structuredClone(codeRecovery);bad.assessments[0].grading.evaluatorId='arbitrary-evaluator';assert.throws(()=>bindRecoveryRuntime({...input,baseCourse:rebased.server,codeRecovery:bad}),/Practical evaluator changed/);
});
