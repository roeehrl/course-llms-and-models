// Install the verified private package into a running Core pilot through its
// authenticated review/publish/registry APIs. No database writes, no learner
// enrollment, no provider calls. The operator signs in with a password typed
// at the terminal (or piped on standard input); it is never echoed, printed or
// passed through argv or the environment. Without --login the one-time code in
// the private bootstrap receipt is used (only while Core has codes enabled).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyWorkedPackage} from './package-worked-course.mjs';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>index%2?pairs:[...pairs,[value,all[index+1]]],[]));
assert(args['--origin']&&args['--package']&&args['--bootstrap'],'Usage: install-pilot-course.mjs --origin <http://localhost:port> --package <verified dir> --bootstrap <bootstrap.json> [--login <operator username>]');
const origin=new URL(args['--origin']).origin;assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Loopback pilot origin required');
const directory=path.resolve(args['--package']),manifest=await verifyWorkedPackage(directory);
const read=async name=>JSON.parse(await readFile(path.join(directory,name),'utf8'));
const course=await read('course.manifest.json'),registry=await read('adaptation-registry.json'),practicals=await read('practical-registries.json');
const receipt=JSON.parse(await readFile(path.resolve(args['--bootstrap']),'utf8'));
assert(/^[0-9a-f-]{36}$/.test(receipt.workspaceId??''),'Invalid bootstrap receipt');
async function readPassword(){
  if(!process.stdin.isTTY){let text='';for await(const chunk of process.stdin)text+=chunk;return text.replace(/\r?\n$/,'');}
  process.stderr.write(`Password for ${args['--login']}: `);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  return new Promise((resolve,reject)=>{let text='';process.stdin.on('data',function typed(chunk){
    for(const ch of chunk){
      if(ch==='\r'||ch==='\n'){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',typed);process.stderr.write('\n');return resolve(text);}
      if(ch==='\u0003'){process.stdin.setRawMode(false);process.stderr.write('\n');return reject(new Error('Cancelled'));}
      if(ch==='\u007f'||ch==='\b')text=text.slice(0,-1);else text+=ch;
    }
  });});
}

let session;
async function call(method,route,body,headers={}){
  const response=await fetch(origin+route,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{origin,'content-type':'application/json',...(session?{cookie:session.cookie,'x-csrf-token':session.csrf}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`${method} ${route.replace(/[0-9a-f-]{36}/g,':id')} failed: ${response.status} ${value?.error??''}`);
  return {value,cookies:response.headers.getSetCookie()};
}
let signed;
if(args['--login']){const password=await readPassword();assert(password,'Password required');signed=await call('POST','/auth/login',{login:args['--login'],password});}
else{const token=new URL(receipt.oneTimeSignInUrl).hash.slice('#signin='.length);assert(/^[A-Za-z0-9_-]{43}$/.test(token),'Invalid bootstrap receipt');signed=await call('POST','/auth/redeem',{token});}
session={cookie:signed.cookies.map(c=>c.split(';')[0]).join('; '),csrf:signed.value.csrfToken};
const adapters=(await call('GET','/api/runtime/adaptation-adapters')).value.adapters;
assert(registry.profiles.every(p=>adapters.some(a=>a.id===p.adapterId&&a.implementationDigest===p.adapterDigest)),'Installed creator implementation digests do not match the package');
const extensions=(await call('GET','/api/runtime/extensions')).value.extensions;
assert(practicals.registries.every(r=>extensions.some(e=>e.id===r.id&&e.codeReady&&e.integrity==='sha256-'+r.sha256)),'Qualified code graders are not ready');
const listed=(await call('GET',`/api/workspaces/${receipt.workspaceId}/courses?includeHistorical=true`)).value;
assert(!listed.some(r=>r.digest===manifest.courseDigest),'This exact course release is already installed; refusing to import a duplicate');
const releaseId=(await call('POST',`/api/workspaces/${receipt.workspaceId}/releases`,course)).value.id;
const catalog=(await call('GET','/api/admin/session')).value.courses.find(c=>c.workspaceId===receipt.workspaceId);assert(catalog,'Catalogue missing');
for(const action of ['submit-review','approve','publish']){
  const view=(await call('GET',`/api/admin/courses/${catalog.id}`)).value;
  await call('POST',`/api/admin/courses/${catalog.id}/releases/${releaseId}/transitions`,{action},{'if-match':String(view.revision),'idempotency-key':randomUUID()});
}
await call('POST',`/api/admin/releases/${releaseId}/adaptation-registry`,{expectedRegistryRevision:0,configuration:registry});
const selected=(await call('GET',`/api/workspaces/${receipt.workspaceId}/courses`)).value;
assert(selected.length===1&&selected[0].id===releaseId&&selected[0].digest===manifest.courseDigest,'Published release is not the selected catalogue release');
await call('POST','/auth/logout',{});
console.log(JSON.stringify({installed:true,releaseId,catalogId:catalog.id,courseVersion:manifest.courseVersion,courseDigest:manifest.courseDigest,profiles:registry.profiles.length,operatorEnrolled:false,liveProviderAcceptance:false}));
