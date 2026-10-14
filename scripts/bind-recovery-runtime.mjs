import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {compileCourse} from '@course-core/sdk/compiler';
import {assemble,fragments,loadOverlays} from './assemble.mjs';

// Declarations pin executable host code. They cannot authenticate proofs, approve
// a registry, install plugins or place answer banks in the free baseline course.
export function bindRecoveryRuntime({descriptors,authored,fresh,baseCourse,codeRecovery,remedial}) {
  assert(Array.isArray(descriptors)&&descriptors.length<=16,'Invalid installed adapter descriptors');
  const select=kind=>{
    const candidates=descriptors.filter(a=>a.id===({numeric:'bounded-numeric-v1',bank:'authored-bank-v1','code-bank':'authored-code-bank-v1','teaching-bank':'authored-teaching-bank-v1'}[kind])&&a.kind===kind);
    assert.equal(candidates.length,1,'Required installed creator is absent or ambiguous');
    const a=candidates[0];assert(/^[a-f0-9]{64}$/.test(a.implementationDigest)&&a.authorization==='release_registry_approval_required','Invalid installed creator descriptor');return a;
  };
  const numeric=select('numeric'),bank=select('bank'),adaptation=structuredClone(authored.adaptation),source=structuredClone(authored.source),sources=[];
  assert(adaptation?.families&&Array.isArray(authored.bindings)&&Array.isArray(fresh.assessments),'Invalid reviewed authoring payload');
  const extensions=[numeric,bank].map(a=>({id:`course-${a.kind}-creator`,version:'1.0.0',integrity:`sha256-${a.implementationDigest}`,entrypoint:`extensions/${a.id}.js`,execution:'server',platforms:['web'],capabilities:['teaching.generate','teaching.verify'],accessibility:{keyboard:true,reducedMotion:true,textAlternative:'Verified text, numeric and choice recovery controls.'}}));
  const ids=kind=>({generator:`course-${kind}-generator`,verifier:`course-${kind}-verifier`,extension:`course-${kind}-creator`});
  adaptation.generators=[numeric,bank].map(a=>({id:ids(a.kind).generator,version:'1.0.0',extensionId:ids(a.kind).extension,sourceRefs:[source.id],artifactKinds:['assessment_variant']}));
  adaptation.verifiers=[numeric,bank].map(a=>({id:ids(a.kind).verifier,version:'1.0.0',extensionId:ids(a.kind).extension,sourceRefs:[source.id],artifactKinds:['assessment_variant'],requiredCheckIds:[a.kind==='numeric'?'independent-answer':'authored-bank-match']}));
  const profiles=[];
  for(const family of adaptation.families){
    const binding=authored.bindings.find(b=>b.canonicalAssessmentId===family.canonicalAssessmentId);assert(binding,'Missing reviewed family binding');
    const canonical=baseCourse.assessments.find(a=>a.id===family.canonicalAssessmentId);assert(canonical&&canonical.familyId===family.familyId,'Canonical family changed');
    const recipe=adaptation.numericalRecipes.find(r=>family.numericalRecipeIds.includes(r.id));
    const a=recipe?numeric:bank,name=ids(a.kind);family.generatorIds=[name.generator];family.verifierIds=[name.verifier];
    const profile={id:`profile-${binding.assessmentId}`,episodeId:binding.episodeId,operation:'add_assessment_variant',generatorId:name.generator,verifierId:name.verifier,adapterId:a.id,adapterDigest:a.implementationDigest,canonicalAssessmentId:family.canonicalAssessmentId,classification:'required',plannedMinutes:2,additionalEpisodes:1};
    if(recipe){assert.equal(canonical.type,'numeric','A numerical recipe requires a numeric canonical');recipe.referenceCheck={verifierId:name.verifier,verifierVersion:'1.0.0',checkId:'independent-answer',absoluteTolerance:1e-9};profile.templateId=recipe.id;}
    else{
      const assessment=fresh.assessments.find(item=>item.id===binding.assessmentId);assert(assessment,'Missing reviewed bank item');
      assert.equal(assessment.type,canonical.type,'Reviewed variant type changed');assert.equal(assessment.familyId,canonical.familyId,'Reviewed variant family changed');
      assert.deepEqual([...assessment.objectiveIds].sort(),[...canonical.objectiveIds].sort(),'Reviewed variant objectives changed');
      profile.bank=[{id:`bank-${assessment.id}`,sourceRefs:[source.id],assessment:structuredClone(assessment)}];
    }
    profiles.push(profile);
  }
  const configuration={authorizationMinutes:30,verifiers:[numeric,bank].map(a=>({id:ids(a.kind).verifier,version:'1.0.0',implementationDigest:a.implementationDigest,sourceRefs:[source.id],artifactKinds:['assessment_variant'],checkIds:[a.kind==='numeric'?'independent-answer':'authored-bank-match']})),profiles};
  if(codeRecovery){
    assert(codeRecovery.schemaVersion===1&&Array.isArray(codeRecovery.bindings)&&Array.isArray(codeRecovery.assessments),'Invalid practical recovery declaration');
    const adapter=select('code-bank'),name=ids('code');sources.push(structuredClone(codeRecovery.source));adaptation.sourceRefs.push(codeRecovery.source.id);
    extensions.push({...structuredClone(extensions[1]),id:name.extension,integrity:`sha256-${adapter.implementationDigest}`,entrypoint:'extensions/authored-code-bank-v1.js'});
    adaptation.generators.push({id:name.generator,version:'1.0.0',extensionId:name.extension,sourceRefs:[codeRecovery.source.id],artifactKinds:['assessment_variant']});
    adaptation.verifiers.push({id:name.verifier,version:'1.0.0',extensionId:name.extension,sourceRefs:[codeRecovery.source.id],artifactKinds:['assessment_variant'],requiredCheckIds:['authored-bank-match']});
    configuration.verifiers.push({id:name.verifier,version:'1.0.0',implementationDigest:adapter.implementationDigest,sourceRefs:[codeRecovery.source.id],artifactKinds:['assessment_variant'],checkIds:['authored-bank-match']});
    const groups=new Map();
    for(const binding of codeRecovery.bindings){
      const canonical=baseCourse.assessments.find(a=>a.id===binding.canonicalAssessmentId),assessment=codeRecovery.assessments.find(a=>a.id===binding.assessmentId);
      assert(canonical?.type==='code'&&assessment?.type==='code','Practical variant must retain the code type');
      assert.equal(assessment.familyId,canonical.familyId,'Practical family changed');assert.deepEqual([...assessment.objectiveIds].sort(),[...canonical.objectiveIds].sort(),'Practical objectives changed');
      assert.equal(assessment.grading.evaluatorId,canonical.grading.evaluatorId,'Practical evaluator changed');
      assert(Number.isSafeInteger(binding.plannedMinutes)&&binding.plannedMinutes>0&&binding.plannedMinutes<=45&&binding.additionalEpisodes===1,'Invalid practical effort estimate');
      const group=groups.get(canonical.id)??{canonical,episodeId:binding.episodeId,plannedMinutes:binding.plannedMinutes,bank:[]};
      assert(group.episodeId===binding.episodeId&&group.plannedMinutes===binding.plannedMinutes,'Conflicting practical family binding');
      group.bank.push({id:`bank-${assessment.id}`,sourceRefs:[codeRecovery.source.id],assessment:structuredClone(assessment)});groups.set(canonical.id,group);
    }
    for(const {canonical,episodeId,plannedMinutes,bank:items} of groups.values()){
      assert(items.length>=2,'A practical recovery family needs distinct alternatives');
      adaptation.families.push({familyId:canonical.familyId,canonicalAssessmentId:canonical.id,generatorIds:[name.generator],verifierIds:[name.verifier],numericalRecipeIds:[],maxVariantsPerPlan:items.length});
      profiles.push({id:`profile-${canonical.id}`,episodeId,operation:'add_assessment_variant',generatorId:name.generator,verifierId:name.verifier,adapterId:adapter.id,adapterDigest:adapter.implementationDigest,canonicalAssessmentId:canonical.id,classification:'required',plannedMinutes,additionalEpisodes:1,bank:items});
    }
    adaptation.limits.maxPlannedMinutesPerAssignment=Math.max(adaptation.limits.maxPlannedMinutesPerAssignment,...[...groups.values()].map(g=>g.plannedMinutes));
  }
  if(remedial){
    // Whole remedial episodes: exact reviewed text, inserted after the anchor episode,
    // never graded and always metered as one additional episode.
    assert(remedial.schemaVersion===1&&remedial.source&&Array.isArray(remedial.entries)&&remedial.entries.length,'Invalid remedial episode declaration');
    const adapter=select('teaching-bank'),extensionId='course-teaching-bank-creator',generatorId='course-remedial-generator',verifierId='course-remedial-verifier';
    sources.push(structuredClone(remedial.source));adaptation.sourceRefs.push(remedial.source.id);
    extensions.push({...structuredClone(extensions[1]),id:extensionId,integrity:`sha256-${adapter.implementationDigest}`,entrypoint:'extensions/authored-teaching-bank-v1.js',accessibility:{keyboard:true,reducedMotion:true,textAlternative:'Reviewed remedial episodes as readable text.'}});
    adaptation.generators.push({id:generatorId,version:'1.0.0',extensionId,sourceRefs:[remedial.source.id],artifactKinds:['episode']});
    adaptation.verifiers.push({id:verifierId,version:'1.0.0',extensionId,sourceRefs:[remedial.source.id],artifactKinds:['episode'],requiredCheckIds:['reviewed-teaching-match']});
    configuration.verifiers.push({id:verifierId,version:'1.0.0',implementationDigest:adapter.implementationDigest,sourceRefs:[remedial.source.id],artifactKinds:['episode'],checkIds:['reviewed-teaching-match']});
    for(const entry of remedial.entries){
      const target=adaptation.targets.find(t=>t.episodeId===entry.anchorEpisodeId),episode=baseCourse.chapters.flatMap(c=>c.episodes).find(e=>e.id===entry.anchorEpisodeId);
      assert(target&&episode&&entry.objectiveIds.every(id=>target.objectiveIds.includes(id)&&episode.objectiveIds.includes(id)),'Remedial episode outside its anchor objectives');
      assert(entry.classification==='optional'&&entry.additionalEpisodes===1&&Number.isSafeInteger(entry.plannedMinutes)&&entry.plannedMinutes>0&&entry.plannedMinutes<=adaptation.limits.maxPlannedMinutesPerAssignment,'Invalid remedial effort estimate');
      assert(entry.blocks.length>=1&&entry.blocks.length<=12&&new Set(entry.blocks.map(b=>b.id)).size===entry.blocks.length,'Invalid remedial blocks');
      if(!target.allowedOperations.includes('insert_episode'))target.allowedOperations.push('insert_episode');
      profiles.push({id:`profile-${entry.id}`,episodeId:entry.anchorEpisodeId,operation:'insert_episode',generatorId,verifierId,adapterId:adapter.id,adapterDigest:adapter.implementationDigest,classification:entry.classification,plannedMinutes:entry.plannedMinutes,additionalEpisodes:entry.additionalEpisodes,
        teachingBank:[{id:entry.id,kind:'episode',title:entry.title,blocks:entry.blocks.map(b=>({id:b.id,markdown:b.markdown})),objectiveIds:[...entry.objectiveIds],sourceRefs:[remedial.source.id]}]});
    }
  }
  const overlay={schemaVersion:1,source,...(sources.length?{sources}:{}),extensions,adaptation,qualification:{basis:'private_independent_cpu_domain_checks_and_reviewed_bank',creatorCode:'exact_installed_generic_implementation',registryAuthorization:'not_granted',practicalRecovery:codeRecovery?'reviewed_host_fixture_bank':'not_covered',remedialEpisodes:remedial?'reviewed_teaching_bank_insert_episode':'not_covered'}};
  const course=structuredClone(baseCourse);assert(!course.adaptation,'Bind against an unadapted baseline, not a previously generated release');
  course.adaptation=adaptation;course.sources.push(source,...sources);course.extensions.push(...extensions);
  const checked=compileCourse(course);assert(!('adaptation' in checked.learner));
  assert.deepEqual(course.assessments,baseCourse.assessments);assert.deepEqual(course.gates,baseCourse.gates);
  return {overlay,configuration};
}

async function main(){
  const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
  const config=await read('content/course-config.json'),modules=await Promise.all(fragments.map(name=>read(`content/${name}.json`)));
  // Build from source without the prior recovery overlay, so a second invocation
  // cannot duplicate declarations or depend on a stale compiled artifact.
  const base=assemble(config,modules,await loadOverlays({recovery:false}));
  const {overlay,configuration}=bindRecoveryRuntime({descriptors:(await read('runtime/installed-adaptation-descriptors.json')).adapters,authored:await read('content/adaptation-authoring.json'),fresh:await read('content/fresh-assessments.json'),codeRecovery:await read('content/practical-recovery.json'),remedial:await read('content/remedial-episodes.json'),baseCourse:base.server});
  for(const [file,value] of [['content/recovery-runtime.json',overlay],['runtime/recovery-registry.json',configuration]])await writeFile(new URL(file,root),JSON.stringify(value,null,2)+'\n',{mode:0o600});
  console.log({profiles:configuration.profiles.length,remedialEpisodes:configuration.profiles.filter(p=>p.operation==='insert_episode').length,numericalTemplates:overlay.adaptation.numericalRecipes.length,reviewedBanks:configuration.profiles.filter(p=>p.bank).length,registryAuthorization:'not_granted',baselineAssessmentsUnchanged:true});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
