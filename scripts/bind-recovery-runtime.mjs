import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {compileCourse} from '@course-core/sdk/compiler';
import {assemble,fragments} from './assemble.mjs';

// Declarations pin executable host code. They cannot authenticate proofs, approve
// a registry, install plugins or place answer banks in the free baseline course.
export function bindRecoveryRuntime({descriptors,authored,fresh,baseCourse}) {
  assert(Array.isArray(descriptors)&&descriptors.length<=16,'Invalid installed adapter descriptors');
  const select=kind=>{
    const candidates=descriptors.filter(a=>a.id===(kind==='numeric'?'bounded-numeric-v1':'authored-bank-v1')&&a.kind===kind);
    assert.equal(candidates.length,1,'Required installed creator is absent or ambiguous');
    const a=candidates[0];assert(/^[a-f0-9]{64}$/.test(a.implementationDigest)&&a.authorization==='release_registry_approval_required','Invalid installed creator descriptor');return a;
  };
  const numeric=select('numeric'),bank=select('bank'),adaptation=structuredClone(authored.adaptation),source=structuredClone(authored.source);
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
  const overlay={schemaVersion:1,source,extensions,adaptation,qualification:{basis:'private_independent_cpu_domain_checks_and_reviewed_bank',creatorCode:'exact_installed_generic_implementation',registryAuthorization:'not_granted',practicalRecovery:'not_covered'}};
  const course=structuredClone(baseCourse);assert(!course.adaptation,'Bind against an unadapted baseline, not a previously generated release');
  course.adaptation=adaptation;course.sources.push(source);course.extensions.push(...extensions);
  const checked=compileCourse(course);assert(!('adaptation' in checked.learner));
  assert.deepEqual(course.assessments,baseCourse.assessments);assert.deepEqual(course.gates,baseCourse.gates);
  return {overlay,configuration};
}

async function main(){
  const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
  const config=await read('content/course-config.json'),modules=await Promise.all(fragments.map(name=>read(`content/${name}.json`)));
  // Build from source without the prior recovery overlay, so a second invocation
  // cannot duplicate declarations or depend on a stale compiled artifact.
  const base=assemble(config,modules,{practicalOverlay:await read('content/practicals.json'),visualOverlays:await Promise.all(['visuals','systems-visuals'].map(name=>read(`content/${name}.json`)))});
  const {overlay,configuration}=bindRecoveryRuntime({descriptors:(await read('runtime/installed-adaptation-descriptors.json')).adapters,authored:await read('content/adaptation-authoring.json'),fresh:await read('content/fresh-assessments.json'),baseCourse:base.server});
  for(const [file,value] of [['content/recovery-runtime.json',overlay],['runtime/recovery-registry.json',configuration]])await writeFile(new URL(file,root),JSON.stringify(value,null,2)+'\n',{mode:0o600});
  console.log({profiles:configuration.profiles.length,numericalTemplates:overlay.adaptation.numericalRecipes.length,reviewedBanks:configuration.profiles.filter(p=>p.bank).length,registryAuthorization:'not_granted',baselineAssessmentsUnchanged:true});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
