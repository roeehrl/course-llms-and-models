import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile} from 'node:fs/promises';
// .local/ is gitignored, so a fresh checkout (CI, or an old release tree checked out for a
// qualification) has none of its folders. A harness that writes under .local/<folder>/ must
// create that folder itself (mkdir recursive) instead of failing with a bare ENOENT, as the
// course 0.1.4 learner flow did on .local/generated-teaching/verifier.json. This is a source
// scan: per folder, a write (or mkdtemp) that names the folder, or a variable assigned from a
// path in it, needs a recursive mkdir that names the folder or such a variable.
const root=new URL('../',import.meta.url);
const WRITE=/\b(writeFile|writeFileSync|mkdtemp|mkdtempSync|createWriteStream|write_text|write_bytes|copyFile|rename)\s*\(|screenshot\(/;
const MKDIR=/\bmkdir(Sync)?\([^;]*recursive\s*:\s*true|\.mkdir\([^)]*parents\s*=\s*True/;
export function unpreparedLocalWrites(source){
 const statements=source.split(/;|\n/),offenders=[];
 for(const folder of new Set([...source.matchAll(/\.local\/([A-Za-z0-9_-]+)/g)].map(m=>m[1]))){
  const literal='.local/'+folder,names=new Set();
  for(const s of statements)if(s.includes(literal))for(const m of s.matchAll(/(?:^|[\s,({])([A-Za-z_$][\w$]*)\s*=(?![=>])/g))names.add(m[1]);
  const mentions=s=>s.includes(literal)||[...names].some(n=>new RegExp(`(^|[^\\w$.'"])${n.replace('$','\\$')}(?![\\w$])`).test(s.replace(/^[^=]*=(?![=>])/,'')));
  if(!statements.some(s=>WRITE.test(s)&&mentions(s)))continue;
  if(!statements.some(s=>MKDIR.test(s)&&mentions(s)))offenders.push(folder);
 }
 return offenders;
}
test('every harness that writes under .local/ creates its folders first',async()=>{
 const offenders=[],checked=[];
 for(const dir of ['verification','scripts'])for(const name of await readdir(new URL(dir+'/',root))){
  if(!/\.(mjs|js|py)$/.test(name))continue;
  const source=await readFile(new URL(`${dir}/${name}`,root),'utf8');if(!source.includes('.local/'))continue;
  checked.push(`${dir}/${name}`);for(const folder of unpreparedLocalWrites(source))offenders.push(`${dir}/${name}: .local/${folder}`);
 }
 assert.ok(['verification/learner-flow.mjs','verification/feature-flow.mjs','scripts/install-released-core.mjs'].every(f=>checked.includes(f)),'the scan must see the released-runtime harnesses');
 assert.deepEqual(offenders,[]);
});
test('the scan catches the course 0.1.4 learner-flow write and accepts its fix',()=>{
 const old="if(worked){verifierFile=path.join(root,'.local/generated-teaching/verifier.json');await writeFile(verifierFile,worked.bytes,{mode:0o600});}\nawait mkdir(path.join(root,'.local/learner-flow'),{recursive:true,mode:0o700});const state=await mkdtemp(path.join(root,'.local/learner-flow/run-'));";
 assert.deepEqual(unpreparedLocalWrites(old),['generated-teaching']);
 assert.deepEqual(unpreparedLocalWrites(old.replace('await writeFile',"await mkdir(path.dirname(verifierFile),{recursive:true,mode:0o700});await writeFile")),[]);
 assert.deepEqual(unpreparedLocalWrites("const state=await mkdtemp(path.join(root,'.local/feature-flow/run-'));"),['feature-flow']);
 // A released runtime read from a default .local/ location is not a write.
 assert.deepEqual(unpreparedLocalWrites("const {runtime}=await releasedDirectories(argv,{runtime:'.local/released-core-v0.1.10/'});const x=await readFile(runtime);"),[]);
});
