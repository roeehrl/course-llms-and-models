# Foundations content review

Review date: 2026-10-12. Scope is the two assigned private content files. This is an authoring and CPU verification record, not an independent human review, production deployment report, or learner mastery claim.

## Deliverable and integration boundary

`foundations.json` is the requested eight-key fragment: objectives, chapters, assessments, gates, sources, visuals, media, extensions. It contains the first four curriculum chapters in exact title/order/purpose, sixteen complete episodes, sixteen objectives, thirty-two deterministic assessments and sixteen episode gates. Chapter IDs are `chapter01` through `chapter04` because the SDK identifier grammar requires an initial lowercase letter; these map to curriculum IDs `01` through `04`. All other IDs use the `fnd-` namespace. Visuals, media and extensions are intentionally empty. Written buffer diagrams, tables and CPU exercises provide the initial learning path; no interactive renderer or practical-code grader is claimed.

Each gate requires all its episode objectives and two distinct families. Each episode has one calculation/trace family and one transfer, diagnosis or repair family. Each objective is covered in both families. Answer keys and explanations live only in `Assessment.grading`; the review is also instructor material and must not be served as a learner lesson. The SDK compiler was exercised with an in-memory validation envelope: its learner projection excludes grading, full prompts and options. Attempt authorization, anti-leakage across application endpoints, assistance flags, appeals, retention checks and real gate enforcement remain parent runtime responsibilities.

No enrollment policy is chosen in the fragment. The validation-only envelope uses a bounded zero-additional-episodes work allowance and is not written into either curriculum or course policy. No placement policy is authored. Objectives in chapters 01–03 are marked placeable; chapter 04 objectives are not. Any later placement blueprint must restrict exemptions to explicitly placeable objectives and must use independent evidence rather than fabricate lesson completion.

## Coverage and word counts

Counts below use whitespace-separated words in lesson text only; assessment prompts/options/keys are excluded. Code counts are reported separately to avoid padding the prose target.

| Episode | Lesson words | Prose excluding code | Trace family | Transfer family |
| --- | ---: | ---: | --- | --- |
| 01-01 | 482 | 453 | coefficient-trace | artifact-boundary |
| 01-02 | 466 | 466 | training-state-ledger | frozen-stage-transfer |
| 01-03 | 491 | 436 | token-pipeline | tokenizer-abi |
| 01-04 | 490 | 490 | partition-payload | distributed-evidence |
| 02-01 | 489 | 447 | tensor-payload | semantic-axis-transfer |
| 02-02 | 448 | 412 | strided-address | transpose-counterexample |
| 02-03 | 462 | 420 | matrix-product | reduction-contract |
| 02-04 | 468 | 431 | fp32-rounding | precision-transfer |
| 03-01 | 486 | 453 | loss-computation | objective-proxy |
| 03-02 | 452 | 418 | chain-rule | gradient-discriminator |
| 03-03 | 450 | 406 | optimizer-step | loss-scale-transfer |
| 03-04 | 493 | 452 | weighted-evaluation | evaluation-leakage |
| 04-01 | 479 | 448 | dag-identity | saved-forward-state |
| 04-02 | 446 | 446 | fanout-gradient | optimizer-boundary |
| 04-03 | 504 | 470 | microbatch-weighting | recompute-contract |
| 04-04 | 582 | 442 | engine-novel-graph | engine-repair-suite |

The family distinction is substantive: state/number/shape tracing versus a changed system boundary, an error-discriminating test, an evaluation design or an engine repair. A different item ID alone is not independent evidence. There is only one authored item in each family in this initial bank. After hints, answer reveal or prior exposure, the same item must not be reused as fresh independent evidence. Further novel and delayed items require authoring and verification; retained mastery is not established here.

The chapter 04 reference engine and capstone instructions are complete within their scalar scope. Deterministic gates sample tracing and repair selection; they cannot certify independent implementation or a code artifact. The learner must later submit and defend their own implementation under a separate practical review. No undeclared rubric/code evaluator is referenced.

## Source register and limitations

All source records have review timestamp `2026-10-12T15:15:27Z`. Public research used only official documentation or primary author publications. Explanations, numbers, exercises and code are original; references support specific definitions or mechanics, not wholesale copied lessons. No figure, media asset or substantial verbatim passage is reproduced. External URLs are reference links, not a license claim for redistribution.

| Source ID suffix | Supports | Boundary |
| --- | --- | --- |
| original | Original worked calculations, assessment derivations and this reproducible check | Private URN resolves to this file; independent algorithms/CPU checks, not an independent reviewer |
| design | Chapter 01's conceptual private-name map, from approved v0.8 section 15 | Private URN resolves to `planning/design.html#tah`; approval scope is recorded in `planning/IMPLEMENTATION_STATUS.md`; no current fleet observation |
| autograd-quick | Forward/backward distinction and gradient mechanics | Framework tutorial, not the toy engine's reset contract |
| transfer | Pretrained initialization and frozen/trainable component distinction | Computer-vision tutorial; terminology is applied at the mechanism level, not evidence about a deployed language model |
| subword | Why token pieces can differ from words | Primary paper abstract reviewed; no claim that all tokenizers or current models use this exact algorithm |
| strides | NumPy strides measured in bytes | Lessons explicitly convert their element-stride convention; no claim every library uses the same units |
| broadcast | Right-aligned shape compatibility and virtual repetition | New numeric examples independently checked; writable alias restrictions are library-specific |
| float | Representation error and limits of floating-point comparisons | FP32/FP16 examples explicitly round with CPU `struct`; not a simulation of every device |
| bfloat | BF16 representation/range versus precision and conversion context | TPU documentation does not qualify any Apple hardware; BF16 rounding example uses exact rational arithmetic |
| numerical | Derivative, gradient direction and descent concepts | Original quadratic derivation, not a universal stable learning-rate bound |
| generalization | Training-only preprocessing and leakage prevention | Split recommendations are tied to stated deployment goals, not a statistical guarantee or complete evaluation protocol |
| autograd | Saved forward state and reverse computation graph | PyTorch 2.14 reference; our engine deliberately has simpler semantics and no higher-order support |
| checkpoint | Recomputation and matching relevant random state | Memory example is an idealized buffer count, not a framework benchmark |
| gradcheck | Comparing analytic/backward results with central differences | Smooth scalar cases, finite tolerances; no proof for all inputs or nondifferentiable points |

Public source URLs are in the JSON manifest. The numerical-computation chapter was read from the authors' site. The machine-learning chapter URL failed because the fetch exceeded its size limit; it is not included or treated as reviewed. Official scikit-learn leakage guidance was reviewed instead. Several `stable` documentation URLs are mutable and should be re-reviewed when the course revision changes. PyTorch mechanics/checkpoint/gradcheck references are pinned to the observed 2.14 documentation path; no PyTorch package was installed or exercised.

The only private operational grounding is the design's conceptual map, dated above. No live host, throughput, tier, registration, chip assignment, incident extent or payment facts appear. The names refer to the approved private teaching case. All worker labels, values and journal traces used in exercises are invented. The two private URNs require private resolution by the parent; they are not public clickable URLs. In particular, the original-verification URN resolves to instructor-only material containing reference answers and must not expose this review to learners. Source provenance may be displayed without granting access to that report.

## Verification

SDK `validateCourse` accepted the fragment in a temporary in-memory envelope; `compileCourse` and `verifyCompiledCourse` succeeded. All learner assessment entries contained only id, type and objectiveIds, and no `correctOptionId` or `absoluteTolerance` field appeared in the learner projection. No SDK files were edited or rebuilt.

CPU verification results are recorded after the following reproducible script. Run this code with Python 3 from any directory; it reads only the assigned JSON file and executes the authored standard-library snippets. The full loss reference is separately written rather than calling backward rules. Exact rational calculations check update arithmetic and rounding-near-one; explicit `struct` conversions check binary32/binary16; finite differences check gradients. Numerical-key comparisons allow up to 1e-7 only for the verification oracle's finite-difference error, not for learner submissions. Actual learner grading uses the manifest's declared tolerance (zero for exact keys, 1e-9 for the noninteger update).

```python
import json, math, re, struct
from fractions import Fraction as F
from pathlib import Path

root = Path.cwd()  # run from the course repo root
f = json.loads((root/'content/foundations.json').read_text())
items = {a['id']: a for a in f['assessments']}
episodes = [e for c in f['chapters'] for e in c['episodes']]
checks = 0
def close(actual, expected, tolerance=1e-9):
    global checks
    assert math.isfinite(float(actual))
    assert abs(actual-expected) <= tolerance, (actual, expected)
    checks += 1

def half_loss(w, x, y, b=0):
    return (w*x+b-y)**2/2

def difference(fn, value, h=1e-5):
    return (fn(value+h)-fn(value-h))/(2*h)

def f32(value):
    return struct.unpack('f', struct.pack('f', value))[0]

def round_near_one(value, fraction_bits):
    step = F(1, 2**fraction_bits)
    return round(value/step)*step

# Independently compute every numeric key from its stated inputs.
graph = {'x': (), 'y': (), 'u': ('x','y'), 'v': ('u','u'), 'z': ('v','x')}
seen = set()
def visit(name):
    if name not in seen:
        seen.add(name)
        for parent in graph[name]: visit(parent)
visit('z')
expected = {
 '01-01': (-1*5+4)-(2*5-3),
 '01-02': 3,  # no parameter-writing operation has executed
 '01-03': max(range(3), key=[0.2,0.3,0.5].__getitem__),
 '01-04': difference(lambda h: half_loss(-1,h,0), 2*3),
 '02-01': math.prod((3,5,2))*2,
 '02-02': (2+2*1+1*4)*4,
 '02-03': sum(a*b for a,b in zip([2,-1],[1,5])),
 '02-04': f32(f32(2**25+3)-2**25),
 '03-01': half_loss(2,3,1,-1),
 '03-02': difference(lambda w: half_loss(w,3,1,2), 0),
 '03-03': 1-F(1,10)*(1*3-6)*3,
 '03-04': (3*2+10)/4,
 '04-01': len(seen),
 '04-02': difference(lambda x: x**3+x*x, 2),
 '04-03': (3*2-6)/4,
 '04-04': difference(lambda x: x*x+x, -2),
}
for n, result in expected.items():
    close(float(result), items['fnd-a'+n+'-trace']['grading']['expected'], 1e-7)
assert set(expected) == {a['id'][5:-6] for a in f['assessments'] if a['type']=='numeric'}

# Worked examples: independent arithmetic rather than repeating the prose assertion.
for x, result in [(4,5.5),(6,8.5),(5,7)]: close(F(3,2)*x-F(1,2), result)
close(2*4-F(1,2),7.5)
close(half_loss(2,3,8),2)
close((2*3-8)*3,-6)
close(2-F(1,10)*(-6),F(13,5))
close(half_loss(F(13,5),3,8),F(1,50))
vocab=['a','b',' ']; rows=[[.1,.7,.2],[.2,.2,.6],[.8,.1,.1]]
ids=[vocab.index(c) for c in 'ab a']
assert ids==[0,1,2,0] and ids[:-1]==[0,1,2] and ids[1:]==[1,2,0]
for row in rows: close(sum(row),1)
first=max(range(3), key=rows[ids[-1]].__getitem__)
second=max(range(3), key=rows[first].__getitem__)
assert (first,second)==(1,2)
# Partition example: finite differences independently validate both parameter gradients.
close(3*2,6); close(4*6,24); close(half_loss(4,6,20),8)
close(difference(lambda h: half_loss(4,h,20),6),16,1e-7)
close(difference(lambda w: half_loss(4,w*2,20),3),32,1e-7)
close(difference(lambda v: half_loss(v,6,20),4),24,1e-7)
close(F(3)-F(1,100)*32,F(268,100)); close(F(4)-F(1,100)*24,F(376,100))
close(math.prod((2,3,4)),24); close(24*4,96); close(24*2,48)
close(1*12+2*4+3,23); close(23*4,92); close(2*4+1,9)
assert divmod(17,12)==(1,5) and divmod(5,4)==(1,1)
close(math.prod(()),1); close(math.prod((0,4)),0)
store=[10,20,30,40,50,60]
assert store[2*1+1*3]==60 and store[0*1+1*3]==40 and store[0*2+1]==20
store[0*1+1*3]=99; assert store[1*3+0]==99
# Independently enumerate a broadcast output; no NumPy required.
A=[[[10*b+d for d in range(3)]] for b in range(2)]
B=[[[100*t] for t in range(4)]]
bcast=[[[A[b][0][d]+B[0][t][0] for d in range(3)] for t in range(4)] for b in range(2)]
assert (len(bcast),len(bcast[0]),len(bcast[0][0]))==(2,4,3)
close(sum(x*y for x,y in zip([1,2,3],[4,-1,2])),8)
A=[[1,2,3],[4,5,6]]; B=[[1,0],[0,1],[1,1]]
C=[[sum(a*b for a,b in zip(row,col)) for col in zip(*B)] for row in A]
assert C==[[4,5],[10,11]] and [sum(row) for row in A]==[6,15]
assert [sum(col) for col in zip(*A)]==[5,7,9]
close(sum(map(sum,A))/6,3.5); close(sum(map(sum,A))/2,10.5)
close(2*2*3,12); close(2*2*(3-1),8)
close(2**-10,.0009765625); close(2**-7,.0078125)
close(round_near_one(F(1001,1000),10),F(1025,1024))
close(round_near_one(F(1001,1000),7),1)
close(struct.unpack('e',struct.pack('e',1.001))[0],1.0009765625)
close(f32(f32(2**24+1)-2**24),0)
close(f32(2**24+f32(1-2**24)),1)
for w,result in [(1,4.5),(2,.5),(2.5,0),(3,.5),(4,4.5)]: close(half_loss(w,2,5),result)
close((half_loss(2,2,5)+half_loss(2,1,1))/2,.5)
close(difference(lambda w:half_loss(w,2,5),1),-6,1e-8)
close(half_loss(F(101,100),2,5),F(44402,10000))
close(half_loss(F(101,100),2,5)-(F(9,2)-F(6,100)),F(2,10000))
for eta,new_w,new_loss in [(F(1,10),F(8,5),F(162,100)),(F(1,100),F(106,100),F(41472,10000)),(F(6,10),F(46,10),F(882,100)),(F(3,10),F(28,10),F(18,100))]:
    close(1-eta*(-6),new_w);close(half_loss(new_w,2,5),new_loss)
for eta in [F(1,100),F(1,10),F(1,4),F(3,10),F(1,2),F(6,10)]:
    assert (abs(1-4*eta)<1)==(0<eta<F(1,2))
close((half_loss(1,1,3)+half_loss(1,2,2))/2,1)
close(((1*1-3)*1+(1*2-2)*2)/2,-1)
close(half_loss(F(11,10),1,3),F(1805,1000))
close(half_loss(F(11,10),2,2),F(2,100))
close((F(1805,1000)+F(2,100))/2,F(9125,10000))
close(3*3+3,12);close(difference(lambda x:x*x+x,3),7,1e-8)
close(half_loss(2,3,8,1),.5)
close(difference(lambda w:half_loss(w,3,8,1),2),-3,1e-8)
close(difference(lambda b:half_loss(2,3,8,b),1),-1,1e-8)
close(difference(lambda x:half_loss(2,x,8,1),3),-2,1e-8)
close(F(23,10)*3+F(11,10),8)
close(6*1024*4,24576);close(2*1024*4,8192);close((6-2)*1024*4,16384)
close((2*3-3)/3,1);close(10-F(1,10)*1,F(99,10));close(1+2,3)

# Execute every authored Python fence in an isolated namespace.
snippets=0
for episode in episodes:
    for block in episode['blocks']:
        if block['type']=='text':
            for snippet in re.findall(r'```python\n(.*?)```',block['markdown'],re.S):
                exec(compile(snippet,episode['id'],'exec'),{})
                snippets+=1
engine_text=next(b['markdown'] for b in episodes[-1]['blocks'] if b['type']=='text')
engine=re.search(r'```python\n(.*?)```',engine_text,re.S).group(1)
namespace={};exec(engine,namespace);Value=namespace['Value']
# Compare AD to a separately written real-valued loss with two step sizes.
gradient_comparisons=0;max_gradient_error=0.0
for w in [-1.5,0,2]:
 for b in [-.4,1]:
  for x in [-2,0,.5,3]:
   for y in [-1.2,2]:
    W,B,X=Value(w),Value(b),Value(x)
    pred=W*X+B;residual=pred+Value(-y);loss=Value(.5)*residual*residual
    before=(W.value,B.value,X.value);loss.backward()
    assert (W.value,B.value,X.value)==before
    for h in [1e-4,1e-5]:
     references=[difference(lambda t:half_loss(t,x,y,b),w,h),difference(lambda t:half_loss(w,x,y,t),b,h),difference(lambda t:half_loss(w,t,y,b),x,h)]
     for node,ref in zip([W,B,X],references):
      error=abs(node.grad-ref);max_gradient_error=max(max_gradient_error,error)
      close(node.grad,ref,1e-7);gradient_comparisons+=1
for x in [-3,-2,0,.5,2,4]:
 X=Value(x);U=X*X;Z=U*X+U
 Z.backward();close(X.grad,3*x*x+2*x)
 Z.backward();close(X.grad,3*x*x+2*x)
# Captured multiplication inputs preserve the old-forward derivative.
a,b=Value(2),Value(5);out=a*b;b.value=9;out.backward();close(a.grad,5)
# Explicit update changes weights; rebuilding forward recomputes the new loss.
w,b,x=Value(2),Value(1),Value(3)
r=w*x+b+Value(-8);loss=Value(.5)*r*r;loss.backward()
w.value-=.1*w.grad;b.value-=.1*b.grad
close(w.value,2.3);close(b.value,1.1);close(half_loss(w.value,3,8,b.value),0)
# Numerical evidence for choice distractors and selected negative controls.
close(difference(lambda w:half_loss(w,4,1),1),12,1e-7)
assert (1*4-1)==3 and 3!=12
assert [2,7,11,13,17,19][1] != [2,7,11,13,17,19][2]
close(4-F(1,4)*(-2),4.5)
assert (3-3)/2 != (2*3-3)/3
negative_controls=0
for broken in [engine.replace('self.grad += b * out.grad','self.grad = b * out.grad').replace('other.grad += a * out.grad','other.grad = a * out.grad'),engine.replace('self.grad += out.grad','self.grad = out.grad').replace('other.grad += out.grad','other.grad = out.grad'),engine.replace('            other.grad += a * out.grad','            pass  # omitted second operand')]:
    try: exec(broken,{})
    except AssertionError: negative_controls+=1
    else: raise AssertionError('Broken engine passed shared-node checks')
assert negative_controls==3
# Declared tolerance rejects wrong signs and non-finite submitted numbers.
def accepted(value,key):
    return isinstance(value,(int,float)) and math.isfinite(value) and abs(value-key['expected'])<=key['absoluteTolerance']
for item in items.values():
    if item['type']=='numeric':
        key=item['grading'];assert accepted(key['expected'],key)
        assert not accepted(float('nan'),key) and not accepted(float('inf'),key)
        assert not accepted(key['expected']+max(1,10*key['absoluteTolerance']),key)
print(json.dumps({'arithmetic_and_gradient_assertions':checks,'numeric_keys':len(expected),'python_fences':snippets,'gradient_comparisons':gradient_comparisons,'max_gradient_error':max_gradient_error,'broken_engines_rejected':negative_controls},indent=2))
```

## Input fingerprints

These SHA-256 values identify the reviewed local inputs; none was modified by this content work.

- `AGENTS.md`: `cafc794023d3dbbcb370a9b7c9a11ef87f151c34e8229851b5b8c52c96706c8e`
- `planning/curriculum.json`: `a09bebe39e0b329ea62c7e05bc831ba4b30d81b82851d363dbfb405926a706a5`
- `planning/design.html`: `e21793413d0b6bf6ea924272ead866410a2d68f0d60465853fcf6398a8e69f3d`
- `planning/learning-flow-spec.json`: `3828f67c3d4b4a3dc206353192e0fcdb6f69e16fb22c7ac595294445883139b0`
- `planning/IMPLEMENTATION_STATUS.md`: `8d59a636c6b6375adba3bade5931bb04b03a59069ce78b9f35a92b3f871c6d81`
- `course-sdk/src/types.ts`: `e72710d78ec27c79a2f0616de533cfe00d9843d61f39f8dd0b6b9e861d098295`
- `course-sdk/src/course.schema.json`: `f147bde85c9665ab6211c2e94b9ffc4b27f65afeea2584e225274f42a30fd487`
- `course-sdk/src/validate.ts`: `86bf4dc9d326550dddd478beed6a39ed2679f2e3a81c499e93cacecc6270b9d7`
- `course-sdk/src/compiler.ts`: `e592a5dd336222f77cc2a9a11f71a1f39ce6932b3f05be52424a0c06c347594f`

## Observed verification results

All following checks passed on 2026-10-12 using the local CPU only:

- SDK shape/semantic validation: zero issues in the in-memory envelope; compile and compiled-digest verification succeeded.
- Structural/content checks: exactly eight fragment keys; 4 chapters in approved order, 16 episodes, 16 declared objectives, 32 assessments, 16 gates, 14 sources. Every episode gate covers all its objective IDs, with two distinct families per objective. Titles and chapter purposes match `planning/curriculum.json` exactly. Source schemes and timestamps are valid. No placeholder episode text.
- Lesson length: 7,688 words total, 446–582 per episode including code; every episode also has at least 406 prose words excluding code. Assessments are excluded from these counts.
- Arithmetic/script checks: 396 arithmetic and gradient assertions; all 16 numeric keys recomputed independently; 13 Python fences executed in isolated namespaces without failure.
- Autodiff: 288 comparisons across 48 parameter/input/target combinations, three differentiated inputs and two finite-difference step sizes. Maximum absolute discrepancy was `7.740013074908347e-10`, below the `1e-7` check tolerance. Additional shared-polynomial, repeated-backward, saved-operand and optimizer-boundary checks passed.
- Negative controls: three engine mutations were rejected (overwriting multiplication contributions, overwriting addition contributions, omitting a repeated multiplication operand). The wrong-stride, missing-chain-factor and wrong microbatch-weighting examples were numerically distinguished from their references.
- SDK validator negative controls: rejected a duplicate item family, an unknown assessment objective, a gate missing the episode objective, an unsafe source URL, and placement on a non-placeable chapter 04 objective.
- Learner projection: assessment entries contain only `id`, `type` and `objectiveIds`; no grading fields or grading explanations appear. No full independent item bank is emitted there. Authoritative per-attempt grading and private-source authorization remain integration checks for the parent.
- Choice audit: all 16 keyed choices were read against their prompts and distractors for a single defensible answer under the stated assumptions; numerical distractors additionally use the CPU checks above. This audit is not a second-person educational review or psychometric calibration.

Run the embedded CPU script without creating another file:

```sh
python3 - <<'PYVERIFY'
from pathlib import Path
import re
p = Path('content/foundations-review.md')
code = re.search(r'^```python\n(.*?)^```$', p.read_text(), re.S | re.M).group(1)
exec(compile(code, str(p), 'exec'))
PYVERIFY
```

Reproduce SDK validation and learner projection checks without writing a manifest or changing SDK files:

```sh
node --input-type=module - <<'JSVERIFY'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCourse} from '<course-sdk>/dist/validate.js';
import {compileCourse,verifyCompiledCourse} from '<course-sdk>/dist/compiler.js';
const fragment = JSON.parse(fs.readFileSync('content/foundations.json','utf8'));
const envelope = {
  schemaVersion:1, id:'foundations-validation', version:'0.1.0',
  title:'Validation only', summary:'Not an enrollment policy', locale:'en', platforms:['web'],
  policy:{mode:'bounded',work:{additionalEpisodes:0},existingMaterialAccess:'read_only'},
  ...fragment
};
const result = validateCourse(envelope);
assert(result.valid, JSON.stringify(result.issues));
const compiled = compileCourse(envelope);
assert(verifyCompiledCourse(compiled));
for (const item of compiled.learner.assessments)
  assert.deepEqual(Object.keys(item).sort(), ['id','objectiveIds','type']);
for (const item of fragment.assessments)
  assert(!JSON.stringify(compiled.learner).includes(item.grading.explanation));
console.log('SDK validation, compilation and learner projection passed');
JSVERIFY
```

## Remaining boundaries

No credentials, wallets, GPUs, workers, remote controls, external messages, commits or pushes were used. Only `content/foundations.json` and `content/foundations-review.md` were written. The SDK and planning files were read only. No claim is made that any course implementation, evaluator, platform, integration or deployment is finished.

The parent still owns full-course assembly, runtime rendering, accessibility and responsive layout checks, attempt authorization, protected answer handling, private URN resolution, assistance-aware gates, delayed checks and practical capstone evaluation. No platform compatibility or educational efficacy has been inferred from these content/CPU checks. The current item bank cannot furnish unlimited fresh reattempts; new variants must be independently checked before use. Text code blocks are executable examples, not a sandbox service.

Verification environment: Python `3.9.6`, Node `26.9.0`. Final fragment SHA-256: `0fc19404bfd36e74a431f5f0bb142080b4a45ac17c835504bda1c1b1e7db384a`.
