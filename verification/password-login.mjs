// Password sign-in for the released-consumer harnesses (Core 0.1.36+).
// One-time sign-in codes are off by default from Core 0.1.36, so harness
// accounts get a random password per run. Passwords go to Core's host CLIs on
// standard input only (never argv or the environment, which the CLIs refuse)
// and are never printed or written to receipts.
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';

export const harnessPassword=()=>randomBytes(24).toString('base64url');

/** Runs a Core host CLI that reads exactly one password line from standard input. */
export function runWithPassword(file,args,{cwd,env,password}){
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{cwd,env,stdio:['pipe','pipe','pipe']});let out='',err='';
    child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});child.on('error',reject);
    child.on('close',code=>code===0?resolve(out):reject(new Error(`password_cli_failed_${code}: ${err.trim().slice(0,300)}`)));
    child.stdin.end(password+'\n');
  });
}
