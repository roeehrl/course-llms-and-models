// Install the verified private package into a running Core pilot through its
// authenticated review/publish/registry APIs. No database writes, no learner
// enrollment, no provider calls. The operator signs in with a password typed
// at the terminal (or piped on standard input); it is never echoed, printed or
// passed through argv or the environment. Without --login the one-time code in
// the private bootstrap receipt is used (only while Core has codes enabled).
//
// Publishing is confirmed the way administration confirms it: the installer fetches
// Core's publish impact (who stays on the current release, who is part-way through a
// changed lesson, what changes), prints it, and publishes only after the operator types
// the exact course version; it then sends that impact's digest, so Core refuses the
// publish if the impact changed in between. Nothing is confirmed automatically. On a
// non-terminal standard input the confirmation is the line after the password.
//
// The installer resumes: when this exact release (same digest) is already in the
// workspace it continues from that release's state (draft, in review, approved,
// published) instead of importing it again, and it approves the adaptation registry
// only when the release does not already have exactly this registry. A run on a fully
// installed release changes nothing and reports alreadyInstalled.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '@course-core/sdk/compiler';
import {verifyWorkedPackage} from './package-worked-course.mjs';

/** Core's digest of a JSON value (services/api/src/repository.ts digestJson). */
export const digestJson=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
/** The next review/publication action for a release state in the admin course view, or null when published. */
export function nextTransition(state){
  const next={draft:'submit-review',pending_review:'approve',approved:'publish',published:null}[state];
  assert(next!==undefined,`Release is ${state}; the installer continues only from draft, in review, approved or published`);
  return next;
}
/** Plain-text lines of Core's publish impact (release-editing.ts publishImpact), for the operator to read. */
export function impactLines({impact,confirmationRequired}){
  const list=(ids,n=8)=>ids.length?` (${ids.slice(0,n).join(', ')}${ids.length>n?`, +${ids.length-n} more`:''})`:'';
  const kinds=impact.kinds?Object.entries(impact.kinds).filter(([,k])=>k.added||k.removed||k.changed).map(([kind,k])=>`${kind} +${k.added}/-${k.removed}/~${k.changed}`).join(', '):'';
  return [
    `Publishing ${impact.to.version} (digest ${impact.to.digest.slice(0,12)}) ${impact.from?`after the live release ${impact.from.version??impact.from.id}`:'with no live release'}.`,
    `New learners get ${impact.newLearnersGet}. Enrolled learners are ${impact.existingLearnersMove?'moved':'not moved: they stay on their release'}.`,
    `Learners on the live release: ${impact.learnersPinnedToActive}; part-way through a changed lesson: ${impact.learnersMidwayInChangedLessons}; enrollments in the last 30 days: ${impact.enrollmentsLast30Days}.`,
    `Content changes: ${impact.contentChanges??'none (no live release)'}${kinds?` (${kinds})`:''}.`,
    `Changed or removed lessons: ${impact.changedOrRemovedEpisodes.length}${list(impact.changedOrRemovedEpisodes)}; items: ${impact.changedOrRemovedItems.length}${list(impact.changedOrRemovedItems)}.`,
    `Defective items fixed: ${impact.defectiveItemsFixed.length}${list(impact.defectiveItemsFixed)}; carried over: ${impact.defectiveItemsCarriedOver.length}${list(impact.defectiveItemsCarriedOver)}.`,
    `Core ${confirmationRequired?'requires':'does not require'} a confirmation for this publish; the installer always asks.`,
  ];
}

async function main(){
  const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>index%2?pairs:[...pairs,[value,all[index+1]]],[]));
  assert(args['--origin']&&args['--package']&&args['--bootstrap'],'Usage: install-pilot-course.mjs --origin <http://localhost:port> --package <verified dir> --bootstrap <bootstrap.json> [--login <operator username>] [--timeout-seconds <n>]');
  // A busy host can take well over 30 s to sign in or import; each request gets this limit (default 180 s).
  const timeoutMs=Number(args['--timeout-seconds']??180)*1000;assert(Number.isInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=1800000,'--timeout-seconds must be 1-1800');
  const origin=new URL(args['--origin']).origin;assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Loopback pilot origin required');
  const directory=path.resolve(args['--package']),manifest=await verifyWorkedPackage(directory);
  const read=async name=>JSON.parse(await readFile(path.join(directory,name),'utf8'));
  const course=await read('course.manifest.json'),registry=await read('adaptation-registry.json'),practicals=await read('practical-registries.json');
  const receipt=JSON.parse(await readFile(path.resolve(args['--bootstrap']),'utf8'));
  assert(/^[0-9a-f-]{36}$/.test(receipt.workspaceId??''),'Invalid bootstrap receipt');

  // Standard input: on a terminal, the password is read without echo and the confirmation with
  // echo; otherwise one line each, in that order.
  let piped;
  const pipedLine=async()=>{if(!piped){let text='';for await(const chunk of process.stdin)text+=chunk;piped=text.split(/\r?\n/);}return piped.shift()??'';};
  async function readPassword(){
    if(!process.stdin.isTTY)return pipedLine();
    process.stderr.write(`Password for ${args['--login']}: `);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
    return new Promise((resolve,reject)=>{let text='';process.stdin.on('data',function typed(chunk){
      for(const ch of chunk){
        if(ch==='\r'||ch==='\n'){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',typed);process.stderr.write('\n');return resolve(text);}
        if(ch==='\u0003'){process.stdin.setRawMode(false);process.stderr.write('\n');return reject(new Error('Cancelled'));}
        if(ch==='\u007f'||ch==='\b')text=text.slice(0,-1);else text+=ch;
      }
    });});
  }
  async function readConfirmation(prompt){
    process.stderr.write(prompt);
    if(!process.stdin.isTTY){const line=await pipedLine();process.stderr.write('\n');return line.trim();}
    const {createInterface}=await import('node:readline/promises'),rl=createInterface({input:process.stdin,output:process.stderr,terminal:true});
    try{return (await rl.question('')).trim();}finally{rl.close();}
  }

  let session;
  async function call(method,route,body,headers={}){
    const label=`${method} ${route.replace(/[0-9a-f-]{36}/g,':id')}`,started=Date.now();process.stderr.write(`${label} … `);
    const response=await fetch(origin+route,{method,redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{origin,'content-type':'application/json',...(session?{cookie:session.cookie,'x-csrf-token':session.csrf}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value=await response.json().catch(()=>null);
    process.stderr.write(`${response.status} (${((Date.now()-started)/1000).toFixed(1)} s)\n`);
    if(!response.ok)throw new Error(`${label} failed: ${response.status} ${value?.error??''}`);
    return {value,cookies:response.headers.getSetCookie()};
  }
  let signed;
  if(args['--login']){const password=await readPassword();assert(password,'Password required');signed=await call('POST','/auth/login',{login:args['--login'],password});}
  else{const token=new URL(receipt.oneTimeSignInUrl).hash.slice('#signin='.length);assert(/^[A-Za-z0-9_-]{43}$/.test(token),'Invalid bootstrap receipt');signed=await call('POST','/auth/redeem',{token});}
  session={cookie:signed.cookies.map(c=>c.split(';')[0]).join('; '),csrf:signed.value.csrfToken};
  try{
    const adapters=(await call('GET','/api/runtime/adaptation-adapters')).value.adapters;
    assert(registry.profiles.every(p=>adapters.some(a=>a.id===p.adapterId&&a.implementationDigest===p.adapterDigest)),'Installed creator implementation digests do not match the package');
    const extensions=(await call('GET','/api/runtime/extensions')).value.extensions;
    assert(practicals.registries.every(r=>extensions.some(e=>e.id===r.id&&e.codeReady&&e.integrity==='sha256-'+r.sha256)),'Qualified code graders are not ready');

    // Resume this exact release when the workspace already has it.
    const listed=(await call('GET',`/api/workspaces/${receipt.workspaceId}/courses?includeHistorical=true`)).value;
    const existing=listed.filter(r=>r.digest===manifest.courseDigest);assert(existing.length<=1,'Several releases have this digest; finish the install in administration');
    const releaseId=existing[0]?.id??(await call('POST',`/api/workspaces/${receipt.workspaceId}/releases`,course)).value.id;
    if(existing.length)process.stderr.write(`This release is already in the workspace; continuing from its current state.\n`);
    const catalog=(await call('GET','/api/admin/session')).value.courses.find(c=>c.workspaceId===receipt.workspaceId);assert(catalog,'Catalogue missing');
    const transitions=[];
    for(let step=0;;step++){
      assert(step<4,'Release state did not advance');
      const view=(await call('GET',`/api/admin/courses/${catalog.id}`)).value,release=view.releases.find(r=>r.id===releaseId);
      assert(release,'Release missing from the course view');
      const action=nextTransition(release.state);if(!action)break;
      const body={action};
      if(action==='publish'){
        const analysis=(await call('GET',`/api/admin/courses/${catalog.id}/releases/${releaseId}/publish-impact`)).value;
        assert(analysis?.impact?.to?.id===releaseId&&/^[a-f0-9]{64}$/.test(analysis.impactDigest??''),'Core returned no publish impact for this release');
        process.stderr.write(impactLines(analysis).map(line=>`  ${line}\n`).join(''));
        const typed=await readConfirmation(`Type the version ${manifest.courseVersion} to publish it (anything else stops without publishing): `);
        if(typed!==manifest.courseVersion)throw new Error(`Publication not confirmed; the release stays ${release.state}. Run the installer again to continue.`);
        body.impactDigest=analysis.impactDigest;
      }
      await call('POST',`/api/admin/courses/${catalog.id}/releases/${releaseId}/transitions`,body,{'if-match':String(view.revision),'idempotency-key':randomUUID()});
      transitions.push(action);
    }
    // The adaptation registry: approved once, for exactly these profiles.
    const current=(await call('GET',`/api/admin/releases/${releaseId}/adaptation-registry`)).value;
    const registryApproved=!(current.configured&&current.configurationDigest===digestJson(registry));
    if(registryApproved)await call('POST',`/api/admin/releases/${releaseId}/adaptation-registry`,{expectedRegistryRevision:current.registryRevision,configuration:registry});
    const selected=(await call('GET',`/api/workspaces/${receipt.workspaceId}/courses`)).value;
    assert(selected.some(r=>r.id===releaseId&&r.digest===manifest.courseDigest),'Published release is not the selected catalogue release');
    console.log(JSON.stringify({installed:true,alreadyInstalled:existing.length>0&&!transitions.length&&!registryApproved,resumed:existing.length>0,transitions,registryApproved,releaseId,catalogId:catalog.id,
      courseVersion:manifest.courseVersion,courseDigest:manifest.courseDigest,profiles:registry.profiles.length,operatorEnrolled:false,liveProviderAcceptance:false}));
  }finally{await call('POST','/auth/logout',{}).catch(()=>{});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
