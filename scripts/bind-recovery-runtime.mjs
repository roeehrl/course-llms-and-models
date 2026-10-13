import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {compileCourse} from '@course-core/sdk/compiler';
const root=new URL('../',import.meta.url);
const descriptors=JSON.parse(await readFile(new URL('runtime/installed-adaptation-descriptors.json',root),'utf8')).adapters;
const numeric=descriptors.find(a=>a.id==='bounded-numeric-v1'&&a.kind==='numeric'),bank=descriptors.find(a=>a.id==='authored-bank-v1'&&a.kind==='bank');
for(const a of [numeric,bank])assert(a&&/^[a-f0-9]{64}$/.test(a.implementationDigest)&&a.authorization==='release_registry_approval_required','Required installed creator is absent');
const authored=JSON.parse(await readFile(new URL('content/adaptation-authoring.json',root),'utf8')),fresh=JSON.parse(await readFile(new URL('content/fresh-assessments.json',root),'utf8'));
const adaptation=structuredClone(authored.adaptation),source=authored.source,extensions=[numeric,bank].map(a=>({id:`course-${a.kind}-creator`,version:'1.0.0',integrity:`sha256-${a.implementationDigest}`,entrypoint:`extensions/${a.id}.js`,execution:'server',platforms:['web'],capabilities:['teaching.generate','teaching.verify'],accessibility:{keyboard:true,reducedMotion:true,textAlternative:'Verified text, numeric and choice recovery controls.'}}));
const ids=kind=>({generator:`course-${kind}-generator`,verifier:`course-${kind}-verifier`,extension:`course-${kind}-creator`});
adaptation.generators=[numeric,bank].map(a=>({id:ids(a.kind).generator,version:'1.0.0',extensionId:ids(a.kind).extension,sourceRefs:[source.id],artifactKinds:['assessment_variant']}));
adaptation.verifiers=[numeric,bank].map(a=>({id:ids(a.kind).verifier,version:'1.0.0',extensionId:ids(a.kind).extension,sourceRefs:[source.id],artifactKinds:['assessment_variant'],requiredCheckIds:[a.kind==='numeric'?'independent-answer':'authored-bank-match']}));
const profiles=[];
for(const family of adaptation.families){
  const binding=authored.bindings.find(b=>b.canonicalAssessmentId===family.canonicalAssessmentId);assert(binding);
  const recipe=adaptation.numericalRecipes.find(r=>family.numericalRecipeIds.includes(r.id));
  const a=recipe?numeric:bank,name=ids(a.kind);family.generatorIds=[name.generator];family.verifierIds=[name.verifier];
  const profile={id:`profile-${binding.assessmentId}`,episodeId:binding.episodeId,operation:'add_assessment_variant',generatorId:name.generator,verifierId:name.verifier,adapterId:a.id,adapterDigest:a.implementationDigest,canonicalAssessmentId:family.canonicalAssessmentId,classification:'required',plannedMinutes:2,additionalEpisodes:1};
  if(recipe){recipe.referenceCheck={verifierId:name.verifier,verifierVersion:'1.0.0',checkId:'independent-answer',absoluteTolerance:1e-9};profile.templateId=recipe.id;}
  else{const assessment=fresh.assessments.find(a=>a.id===binding.assessmentId);assert(assessment);profile.bank=[{id:`bank-${assessment.id}`,sourceRefs:[source.id],assessment}];}
  profiles.push(profile);
}
const configuration={authorizationMinutes:30,verifiers:[numeric,bank].map(a=>({id:ids(a.kind).verifier,version:'1.0.0',implementationDigest:a.implementationDigest,sourceRefs:[source.id],artifactKinds:['assessment_variant'],checkIds:[a.kind==='numeric'?'independent-answer':'authored-bank-match']})),profiles};
const overlay={schemaVersion:1,source,extensions,adaptation,qualification:{basis:'private_independent_cpu_domain_checks_and_reviewed_bank',creatorCode:'exact_installed_generic_implementation',registryAuthorization:'not_granted',practicalRecovery:'not_covered'}};
// Validate the declaration against the released SDK, without inserting recovery
// questions in the free baseline bank or giving them learner-visible answer keys.
const compiled=JSON.parse(await readFile(new URL('dist/course.compiled.json',root),'utf8')),course=structuredClone(compiled.server);course.adaptation=adaptation;course.sources.push(source);course.extensions.push(...extensions);
const checked=compileCourse(course);assert(!('adaptation' in checked.learner));
for(const [file,value] of [['content/recovery-runtime.json',overlay],['runtime/recovery-registry.json',configuration]])await writeFile(new URL(file,root),JSON.stringify(value,null,2)+'\n',{mode:0o600});
console.log({profiles:profiles.length,numericalTemplates:adaptation.numericalRecipes.length,reviewedBanks:profiles.filter(p=>p.bank).length,registryAuthorization:'not_granted',baselineAssessmentsUnchanged:course.assessments.length===compiled.server.assessments.length});
