import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {digestTeachingArtifact,instantiateNumericalRecipe} from '@course-core/sdk';
import {compileCourse} from '@course-core/sdk/compiler';
import {assemble,fragments} from './assemble.mjs';

export const ROOT=new URL('../',import.meta.url);
/** 0.1.5 adds the learning-visuals illustrations to the 0.1.4 worked-example course. */
export const COURSE_VERSION='0.1.5';
export const VISUAL_OVERLAYS=['visuals','systems-visuals','learning-visuals'];
const read=async file=>JSON.parse(await readFile(new URL(file,ROOT),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function formula(node){
  if(node.type==='constant')return String(node.value);
  if(node.type==='variable')return '{{'+node.name+'}}';
  if(node.type==='unary')return node.operator==='negate'?'−('+formula(node.value)+')':'abs('+formula(node.value)+')';
  if(['min','max'].includes(node.operator))return node.operator+'('+formula(node.left)+', '+formula(node.right)+')';
  return '('+formula(node.left)+' '+{add:'+',subtract:'−',multiply:'×',divide:'÷'}[node.operator]+' '+formula(node.right)+')';
}
const render=(text,variables)=>text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g,(_,name)=>String(variables[name]));
export async function stageWorkedExamples(){
  const authored=await read('content/adaptation-authoring.json'),baseRegistry=await read('runtime/recovery-registry.json');
  const reference=await readFile(new URL('verification/adaptation-reference.py',ROOT),'utf8'),wrapper=await readFile(new URL('runtime/worked-example-wrapper.py',ROOT),'utf8');
  const id='llm-worked-example-verifier',generatorId='llm-worked-example-generator',version='0.1.0',sourceRef='llm-worked-example-reference';
  const recipes=authored.adaptation.numericalRecipes,entries=[];
  for(const recipe of recipes){
    const binding=authored.bindings.find(b=>b.templateId===recipe.id);assert(binding,'Missing authored recipe binding');
    const family=authored.adaptation.families.find(f=>f.canonicalAssessmentId===binding.canonicalAssessmentId);assert(family,'Missing canonical objective anchor');
    const target=authored.adaptation.targets.find(t=>t.episodeId===binding.episodeId);assert(target,'Missing episode target');
    entries.push({recipe,key:binding.key,episodeId:binding.episodeId,objectiveIds:[...target.objectiveIds],formulaTemplate:formula(recipe.expression)});
  }
  const referenceData={templates:entries.map(e=>({key:e.key,id:e.recipe.id,objectiveIds:e.objectiveIds,promptTemplate:e.recipe.promptTemplate,formulaTemplate:e.formulaTemplate,variables:e.recipe.variables}))};
  assert(Buffer.byteLength(JSON.stringify(referenceData))<=32768,'Reference data must fit the installed verifier envelope');
  const make=async(entry,seed=0,wrong=false)=>{
    const variables=Object.fromEntries(entry.recipe.variables.map(v=>[v.name,seed<0?v.maximum:v.minimum+seed%(v.maximum-v.minimum+1)]));
    const computed=await instantiateNumericalRecipe(entry.recipe,variables),result=wrong?computed.value+Math.max(1,Math.abs(computed.value)*0.05):computed.value;
    const draft={id:'worked-'+entry.key+'-'+seed+(wrong?'-wrong':''),kind:'explanation',markdown:'### Worked example\n\n'+computed.prompt+'\n\nComputation: '+render(entry.formulaTemplate,variables)+'\n\n**Result:** '+result+'\n',objectiveIds:entry.objectiveIds,sourceRefs:[sourceRef],generator:{id:generatorId,version}};
    return {...draft,digest:await digestTeachingArtifact(draft)};
  };
  const qualification=[];
  for(const [index,entry] of entries.slice(0,8).entries())for(const wrong of [false,true])qualification.push({id:'case-'+index+'-'+(wrong?'wrong':'correct'),artifact:await make(entry,index,wrong),expectedChecks:{'worked-example-reference':!wrong}});
  const definition={schemaVersion:1,id,adapterId:'llm-worked-examples-v1',generatorId,verifierId:id,version,artifactKinds:['explanation'],sourceRefs:[sourceRef],checkIds:['worked-example-reference'],source:reference+'\n'+wrapper,referenceData,qualification};
  const bytes=Buffer.from(JSON.stringify(definition,null,2)+'\n');assert(bytes.length<=262144);assert(Buffer.byteLength(definition.source)<=64000);
  const digest=sha(bytes),profiles=entries.map(entry=>({id:'teaching-'+entry.episodeId,episodeId:entry.episodeId,operation:'append_teaching',generatorId,verifierId:id,adapterId:definition.adapterId,adapterDigest:digest,classification:'optional',plannedMinutes:3,additionalEpisodes:0,generationBrief:'Create a different bounded worked example for this objective. Use exactly the Markdown format shown. Replace every variable consistently with an integer in its stated bounds. Compute the result accurately; no extra prose or claims.\nFormat: ### Worked example\\n\\n'+entry.recipe.promptTemplate+'\\n\\nComputation: '+entry.formulaTemplate+'\\n\\n**Result:** <numeric result>\\n\nVariable bounds: '+entry.recipe.variables.map(v=>v.name+'='+v.minimum+'..'+v.maximum).join('; ')}));
  assert(new Set(profiles.map(p=>p.id)).size===profiles.length,'Teaching profile IDs must be unique');assert(profiles.every(p=>p.generationBrief.length<=3000));
  const proposedRegistry={...structuredClone(baseRegistry),verifiers:[...baseRegistry.verifiers,{id,version,implementationDigest:digest,sourceRefs:[sourceRef],artifactKinds:['explanation'],checkIds:['worked-example-reference']}],profiles:[...baseRegistry.profiles,...profiles]};
  assert(proposedRegistry.profiles.length<=512);
  const source={id:sourceRef,title:'Independent procedural CPU checks for worked examples',url:'urn:private-course:worked-example-reference',reviewedAt:'2026-10-13T00:00:00Z'};
  const base=assemble(await read('content/course-config.json'),await Promise.all(fragments.map(name=>read('content/'+name+'.json'))),{practicalOverlay:await read('content/practicals-qualified.json'),visualOverlays:await Promise.all(VISUAL_OVERLAYS.map(name=>read('content/'+name+'.json'))),recoveryOverlay:await read('content/recovery-runtime.json')});
  const candidate=structuredClone(base.server);candidate.version=COURSE_VERSION;candidate.sources.push(source);
  candidate.extensions.push({id,version,integrity:'sha256-'+digest,execution:'server',entrypoint:'runtime/worked-example-verifier.json',platforms:['web'],capabilities:['teaching.generate','teaching.verify'],accessibility:{keyboard:true,reducedMotion:true,textAlternative:'Bounded worked examples with independently checked arithmetic.'}});
  candidate.adaptation.sourceRefs.push(sourceRef);
  candidate.adaptation.generators.push({id:generatorId,version,extensionId:id,sourceRefs:[sourceRef],artifactKinds:['explanation']});
  candidate.adaptation.verifiers.push({id,version,extensionId:id,sourceRefs:[sourceRef],artifactKinds:['explanation'],requiredCheckIds:['worked-example-reference']});
  for(const entry of entries){const target=candidate.adaptation.targets.find(t=>t.episodeId===entry.episodeId);assert(target);if(!target.allowedOperations.includes('append_teaching'))target.allowedOperations.push('append_teaching');}
  assert.deepEqual(candidate.gates,base.server.gates);assert.deepEqual(candidate.assessments,base.server.assessments);assert.deepEqual(candidate.policy,base.server.policy);
  const compiled=compileCourse(candidate);assert(!('adaptation' in compiled.learner));assert(!JSON.stringify(compiled.learner).includes('def solve(payload)'));
  return {definition,bytes,digest,entries,make,profiles,proposedRegistry,source,compiled,baseDigest:base.digest,qualificationScope:'arithmetic_and_declared_trace_only_not_arbitrary_prose',minimumCoreVersion:'0.1.17',publishedAuthority:false};
}
async function main(){
  const staged=await stageWorkedExamples(),folder=new URL('.local/generated-teaching/',ROOT);await mkdir(folder,{recursive:true,mode:0o700});
  await writeFile(new URL('verifier.json',folder),staged.bytes,{mode:0o600});
  await writeFile(new URL('registry.json',folder),JSON.stringify(staged.proposedRegistry,null,2)+'\n',{mode:0o600});
  const examples=[];for(const entry of staged.entries)for(const seed of [0,1,2,3,4,-1])examples.push({key:entry.key,good:await staged.make(entry,seed),wrong:await staged.make(entry,seed,true)});
  await writeFile(new URL('examples.json',folder),JSON.stringify(examples)+'\n',{mode:0o600});
  await writeFile(new URL('proposed-course.compiled.json',folder),JSON.stringify(staged.compiled,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({staged:true,templates:staged.entries.length,profiles:staged.proposedRegistry.profiles.length,referenceBytes:Buffer.byteLength(JSON.stringify(staged.definition.referenceData)),definitionBytes:staged.bytes.length,definitionDigest:staged.digest,minimumCoreVersion:staged.minimumCoreVersion,publishedAuthority:false,courseReleaseUnchanged:true}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
