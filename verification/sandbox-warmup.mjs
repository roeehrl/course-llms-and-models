// Docker readiness for a released Core that qualifies teaching verifiers at startup.
//
// Core 0.1.58 gives each sandbox grade 5 s in all, and that budget includes `docker info`,
// `docker image inspect`, `docker create` and `docker start`. A `create` that is still running
// when the budget ends is "uncertain", and the broker quarantines itself for the life of the
// process: every later qualification retry is refused as TEACHING_VERIFIER_SANDBOX_UNAVAILABLE
// without calling Docker, silently, until SANDBOX_STARTUP_TIMEOUT_MS (default 120 s). On a fresh
// CI runner the first container create can take longer than 5 s, so Core never answered /health
// and printed nothing. (Core 0.1.60 separates the setup clock from the execution clock.)
//
// warmSandbox() runs disposable containers from the pinned image, with Core's isolation flags,
// until one create-start-remove cycle is fast, so Core's first qualification grade is not the
// cold one. sandboxState() describes Core's broker for a start that did not become ready.
import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import path from 'node:path';
const exec=promisify(execFile);
const docker=(args,timeout)=>exec('docker',args,{timeout,killSignal:'SIGKILL',maxBuffer:262144});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
// Well inside Core's 5 s, which also covers two Docker checks and the runner's own work.
const FAST_MS=2500,ATTEMPTS=8,BUDGET_MS=150000;

export async function sandboxImage(runtime){
  const {QUALIFIED_IMAGES}=await import(pathToFileURL(path.join(runtime,'packages/sandbox/dist/index.js')).href);
  return process.env.COURSE_SANDBOX_IMAGE??QUALIFIED_IMAGES?.[process.arch];
}

/** Returns {image, cyclesMs, warm}; never throws for a slow or missing Docker (Core reports that itself). */
export async function warmSandbox(runtime){
  const image=await sandboxImage(runtime),cyclesMs=[],startedAt=performance.now();
  if(!image)return {image:null,cyclesMs,warm:false,reason:'no_pinned_image'};
  try{await docker(['version','--format','{{.Server.Version}}'],30000);}
  catch(error){return {image,cyclesMs,warm:false,reason:error?.code==='ENOENT'?'docker_not_installed':'docker_unavailable'};}
  for(let i=0;i<ATTEMPTS&&performance.now()-startedAt<BUDGET_MS;i++){
    const t=performance.now();let id;
    try{
      id=(await docker(['create','--pull=never','--label','course-harness.warmup=true','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user=65532:65532',
        '--memory=128m','--memory-swap=128m','--cpus=0.5','--pids-limit=32','--init','--tmpfs=/tmp:rw,noexec,nosuid,size=16m',image,'python','-I','-B','-c','pass'],60000)).stdout.trim();
      await docker(['start','--attach',id],60000);
    }catch(error){cyclesMs.push({failed:error?.killed?'timeout':'error',ms:Math.round(performance.now()-t)});await pause(1000);continue;}
    finally{if(id)await docker(['rm','--force',id],30000).catch(()=>{});}
    const ms=Math.round(performance.now()-t);cyclesMs.push(ms);
    if(ms<FAST_MS)return {image,cyclesMs,warm:true};
  }
  return {image,cyclesMs,warm:false,reason:'still_slow'};
}

/** Core's broker lock (present while a grade runs) and any sandbox containers left on the host. */
export async function sandboxState(storageDirectory){
  const lock=await readFile(path.join(storageDirectory,'broker.lock'),'utf8').then(text=>{try{const v=JSON.parse(text);return {containerName:v.containerName,createdAt:v.createdAt};}catch{return 'unreadable';}},e=>e?.code==='ENOENT'?null:'unreadable');
  const containers=await docker(['ps','--all','--filter','label=course-core.sandbox=true','--format','{{.Names}} {{.Status}}'],10000).then(r=>r.stdout.trim().split('\n').filter(Boolean).slice(0,10),()=>'docker_ps_failed');
  return {brokerLock:lock,containers};
}
