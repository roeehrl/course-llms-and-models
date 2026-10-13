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
test('qualified suites require both original tasks and keep families, thresholds, privacy and quotas',async()=>{
  const [qualified,codeRecovery,registryMetadata]=await Promise.all([read('content/practicals-qualified.json'),read('content/practical-recovery.json'),read('runtime/practical-registries.json')]);
  const suiteBase=assemble(config,modules,{practicalOverlay:qualified,visualOverlays:visuals});
  const bound=bindRecoveryRuntime({...input,baseCourse:suiteBase.server,codeRecovery}),compiled=assemble(config,modules,{practicalOverlay:qualified,visualOverlays:visuals,recoveryOverlay:bound.overlay});
  const code=bound.configuration.profiles.filter(p=>p.adapterId==='authored-code-bank-v1');assert.equal(bound.configuration.profiles.length,115);assert.equal(code.length,3);assert(code.every(p=>p.bank.length===2&&p.plannedMinutes===45));
  assert.deepEqual(compiled.server.policy,config.policy);assert.deepEqual(compiled.server.gates,suiteBase.server.gates);assert.equal(compiled.server.chapters.flatMap(c=>c.episodes).length,56);
  assert.equal(compiled.server.assessments.filter(a=>a.type==='code').length,3);
  for(const a of qualified.assessments){assert.match(a.prompt,/Neither task is optional/);const gate=compiled.server.gates.find(g=>g.assessmentIds.includes(a.id));assert.equal(gate.minimumIndependentFamilies,3);}
  for(const a of codeRecovery.assessments){assert.match(a.prompt,/Neither task is optional/);assert(!compiled.server.assessments.some(b=>b.id===a.id));assert(!JSON.stringify(compiled.learner).includes(a.prompt));assert(!JSON.stringify(compiled.learner).includes(a.grading.fixtureRef));}
  const first=structuredClone(codeRecovery);first.assessments[0].grading.evaluatorId='arbitrary-evaluator';assert.throws(()=>bindRecoveryRuntime({...input,baseCourse:suiteBase.server,codeRecovery:first}),/Practical evaluator changed/);
  const excessive=structuredClone(codeRecovery);excessive.bindings[0].plannedMinutes=46;assert.throws(()=>bindRecoveryRuntime({...input,baseCourse:suiteBase.server,codeRecovery:excessive}),/Invalid practical effort/);
  assert.equal(registryMetadata.registries.length,3);
  for(const r of registryMetadata.registries){const bytes=await readFile(new URL(r.file,root));assert(bytes.length<=1024*1024);assert.equal(bytes.length,r.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);assert(qualified.extensions.some(e=>e.id===r.id&&e.integrity==='sha256-'+r.sha256));}
  const legacy=await readFile(new URL('runtime/code-fixtures.json',root));assert.equal(createHash('sha256').update(legacy).digest('hex'),'e4254dd60781f612e3cdf1a3633833ab2c0d59cc17047331f71945ccdac6a51f');
});
