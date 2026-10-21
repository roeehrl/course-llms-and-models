// Submissions for the eleven chapter labs, for the released-runtime acceptance flows.
// The reference is the algorithm part of runtime/lab-reference-{a,b}.py (everything above
// its case generator, never the expected outputs); the wrong submissions are the authored
// starter and one plausible wrong implementation per lab. These are acceptance fixtures,
// not answers shown to learners.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const MARKERS={a:'# ------------------------------------------------------------------ GENERATION',b:'# ------------------------------------------------------------------ deterministic hidden cases'};
/** One wrong implementation per lab: [find, replace] on the reference source. */
export const LAB_MUTANTS={
  'llm-lab-ch01-state-ledger':["grads['w'] += residual * x","grads['w'] = residual * x"],
  'llm-lab-ch02-strided-views':["offset = src['offset'] + start * strides[d]","offset = src['offset'] + start"],
  'llm-lab-ch03-gradient-descent':["w, b = w - eta * gw, b - eta * gb","w, b = w + eta * gw, b + eta * gb"],
  'llm-lab-ch05-optimizer-resume':["mhat = state['m'][i] / (1 - hyper['beta1'] ** t)","mhat = state['m'][i]"],
  'llm-lab-ch06-next-token-loss':["targets = tokens[1:]","targets = tokens[:-1]"],
  'llm-lab-ch08-lora-adapter':["scale = data['alpha'] / r if","scale = 1.0 if"],
  'llm-lab-ch09-tiling':["reads += rows * depth + depth * cols","reads += rows * kk + kk * cols"],
  'llm-lab-ch10-pipeline':["begin = max(arrival, finish[s][j - 1] if j else 0)","begin = arrival"],
  'llm-lab-ch11-journal':["        if s != current:\n            stale += 1","        if False:\n            stale += 1"],
  'llm-lab-ch12-layout':["dv = matmul(transpose(p), d_out)","dv = matmul(p, d_out)"],
  'llm-lab-ch14-evidence':["rows = [x for x in data['checks'] if x['name'] == name and x['digest'] == data['candidate_digest']]","rows = [x for x in data['checks'] if x['name'] == name]"],
};
const once=(text,find)=>{const at=text.indexOf(find);assert(at>=0&&text.indexOf(find,at+1)<0,`Mutation anchor not unique: ${find.slice(0,60)}`);return at;};
export async function labSubmissions(){
  const out=new Map();
  for(const part of ['a','b']){
    const overlay=JSON.parse(await readFile(new URL(`content/labs-${part}.json`,root),'utf8'));
    const text=await readFile(new URL(`runtime/lab-reference-${part}.py`,root),'utf8');
    // Lab B's module header reads its own path to write fixtures; a submission starts at its
    // first algorithm section with only the imports the algorithms use.
    const start=part==='a'?0:once(text,'# ------------------------------------------------------------------ chapter 9');
    const reference=(part==='a'?'':'import math\nimport statistics\n\n\n')+text.slice(start,once(text,MARKERS[part]));
    assert(!reference.includes("'expected'")&&Buffer.byteLength(reference)<64000,'Lab reference must be algorithm only');
    for(const a of overlay.assessments){
      const [find,replace]=LAB_MUTANTS[a.id]??[];assert(find,`No wrong implementation for ${a.id}`);once(reference,find);
      out.set(a.id,{registry:a.grading.evaluatorId,fixtureRef:a.grading.fixtureRef,reference,mutant:reference.replace(find,replace),starter:a.starterCode});
    }
  }
  assert.equal(out.size,11,'Eleven chapter labs expected');
  return out;
}
