# Training and transformers: content review

Reviewed 2026-10-12. This private instructor record documents original content, primary-source checks and local CPU verification. It is not a second-person educational review, production qualification, deployed implementation or completed practical grader.

## Delivered scope

Only `content/training-and-transformers.json` and this review were authored. The fragment contains exactly the requested arrays: objectives, chapters, assessments, gates, sources, visuals, media and extensions. Chapters `chapter05` through `chapter08` preserve the titles, episode order and purposes of curriculum IDs `05`–`08`. The fragment has 16 objectives, 16 complete episodes, 32 assessments, 16 episode gates and 28 dated sources. All non-chapter identifiers use `ttf-`; chapter IDs retain the established assembly convention. Visuals/media/extensions are empty; no renderer, server evaluator or media dependency is invented.

There are two substantive item families per episode: a calculation or execution trace and a transfer/diagnosis/repair task. Both cover the episode's declared objective. Every episode gate sets `minimumIndependentFamilies: 2`, covers every episode objective and requires all objectives. Options were reordered without changing semantics, with balanced answer positions. Numeric tolerances are explicit: exact integer keys use zero; ordinary noninteger arithmetic uses 1e-9; the requested logarithmic loss uses 1e-6. The CPU oracle uses its own tolerances to accommodate differentiation error, never to widen learner grading.

This bank has one item per family. A revealed, assisted or previously attempted item is not fresh independent evidence. Novel reattempts and delayed retention items need additional checked authoring. The gates sample conceptual application; they do not establish full practical mastery of MLP/transformer implementation, checkpoint recovery or framework migration. All new objectives have `placeable: false`; no placement policy or exemption is created. Practical capstone submission and defense remain separate evidence and parent integration work.

The standalone fragment passes the SDK's structural validator in an in-memory envelope. Standalone semantic validation reports only 11 external prerequisite references, all resolved in the unchanged foundations fragment. Combined foundations plus this fragment passes full schema/reference/prerequisite/gate validation, compilation and compiled-digest verification: 8 chapters, 32 episodes, 32 objectives, 64 assessments and 32 gates. No external prerequisites were deleted or replaced with fake objectives to make standalone validation pass.

Cross-fragment prerequisite IDs: `fnd-o01-03`, `fnd-o02-02`, `fnd-o02-03`, `fnd-o02-04`, `fnd-o03-02`, `fnd-o03-03`, `fnd-o03-04`, `fnd-o04-03`, `fnd-o04-04`.

The validation envelope supplies temporary metadata and a bounded zero-additional-episodes allowance solely to exercise CourseManifest validation; it assigns no actual enrollment policy and is never written into planning. Learner projection checks confirm that grading fields, grading explanations and the full independent item bank are absent. Private source authorization and per-attempt answer delivery remain runtime responsibilities. The `ttf-src-original` URN identifies this instructor-only review; it must not expose this report or its answers to learners.

## Content coverage

Word counts are whitespace-separated lesson words, excluding assessments. The prose column excludes code fences. Every episode has at least 400 prose words; total lesson length is 7,774 words. Episode 07-04 includes a complete standard-library CPU decoder and finite-difference training reference rather than a placeholder lab.

| Episode | Lesson words | Prose words | Calculation/trace family | Transfer family |
| --- | ---: | ---: | --- | --- |
| 05-01 | 480 | 413 | mlp-chain | composition-transfer |
| 05-02 | 489 | 447 | residual-sensitivity | normalization-isolation |
| 05-03 | 441 | 405 | momentum-transition | optimizer-state-transfer |
| 05-04 | 488 | 450 | clean-loop-trace | resume-counterexample |
| 06-01 | 466 | 420 | embedding-scatter | embedding-identity |
| 06-02 | 467 | 430 | stable-token-loss | loss-interface |
| 06-03 | 500 | 463 | valid-token-mean | future-leakage |
| 06-04 | 475 | 441 | cache-budget | cache-reuse-contract |
| 07-01 | 450 | 408 | projection-budget | projection-gradient-path |
| 07-02 | 436 | 400 | attention-mixture | attention-gradient-oracle |
| 07-03 | 460 | 433 | gqa-projection-budget | norm-position-conventions |
| 07-04 | 700 | 514 | decoder-ledger | decoder-causality |
| 08-01 | 441 | 412 | framework-accumulation | registration-boundary |
| 08-02 | 496 | 469 | async-timing | benchmark-contract |
| 08-03 | 483 | 447 | lazy-update-arithmetic | lazy-evaluation-contract |
| 08-04 | 502 | 463 | adapter-budget | adapter-initialization |

Chapter 05 connects affine/ReLU composition to hand gradients, initialization, normalization, residual paths, optimizer recurrences and continuation tests. Chapter 06 traces embedding scatter-add, stable token loss, target shifts, mask semantics, reduction and cache identity. Chapter 07 derives Q/K/V paths, attention pullbacks, GQA counts, RoPE identities and RMSNorm before assembling a 44-parameter decoder. Chapter 08 maps those mechanisms to module registration, autograd, dispatch, asynchronous timing, MLX evaluation and LoRA. All operational timelines and numerical workloads are invented teaching fixtures; no fleet observations or private live-system claims are made.

## Source review and boundaries

Every source record has ISO review timestamp `2026-10-12T15:38:44Z`; complete URLs are in the fragment. Only primary publications and official framework documentation were used for public research. Explanations, examples, figures-as-text and code are original; no external media or substantial quoted passages were reproduced. The records do not assert a redistribution license for external material.

Official `stable` PyTorch API links resolved to the 2.14 documentation, so API sources are pinned there where possible. PyTorch tutorial URLs remain mutable. The inspected MLX documentation reported 0.32.3; its `build/html` URLs are not immutable version pins and need re-review on content updates. Neither package is installed in the available Python environment. Optional examples are syntactically compiled and their arithmetic is independently checked, but no framework runtime or device behavior is claimed as locally executed.

| Source suffixes | Specifically supports | Limitations |
| --- | --- | --- |
| linear, embedding | PyTorch weight orientation, embedding-table and lookup contracts | Does not qualify every dtype, sparse mode, padding option or backend |
| initialization, layernorm, residual | Initialization conventions, feature-axis normalization and residual mechanism | Variance and sensitivity examples have explicit simplifying assumptions; residual paper abstract inspected, no current performance claim imported |
| adamw, adamw-paper | AdamW recurrence and distinction between decay and gradient regularization | Numeric example fixes beta, epsilon and decay conventions; not a best-optimizer recommendation |
| checkpoint, reproducibility | Training continuation needs more than weights; seeds do not guarantee cross-platform identity | The CPU resume test covers its explicit deterministic state, not distributed or mixed-precision recovery |
| subword | Tokens can be subword units rather than whole words | Primary abstract already reviewed during foundations; no assertion that every tokenizer uses the paper's algorithm |
| crossentropy | Unnormalized-logit input and reduction behavior | Exercises explicitly use hard targets, no label smoothing or class weighting |
| transformer | Q/K/V, scaled attention, head combination, masks and feed-forward composition | Full architecture sections inspected; the toy decoder deliberately differs in size, normalization and activation from the original paper |
| sdpa | Boolean True means allowed participation, unlike MultiheadAttention key_padding_mask | API-specific rule; no claim about current fused-kernel availability or execution selection |
| cache | Prefix K/V reuse and attention/caching boundaries | Dense payload formula excludes allocation/temporary storage; no universal performance estimate |
| gqa | Query heads sharing fewer K/V heads | Head-count and parameter arithmetic use stated bias-free shapes; no quality/latency guarantee |
| rope, rmsnorm | Rotary relative-position identity; RMS scaling without centering | Full-text mechanisms inspected; pairing, frequencies, epsilon and gain remain model-specific |
| modules, autograd | Registration, evaluation-mode distinction and gradient accumulation | Optional PyTorch example not executed; the foundations engine's reset contract is explicitly different |
| dispatcher, mps, mps-sync | Dispatch boundaries, MPS route and synchronization purpose | No native implementation path or timing was observed locally; no GPU operations performed |
| mlx-lazy, mlx-transforms, mlx-memory | Lazy graph evaluation, value_and_grad and unified-memory model | Optional CPU-selected example not executed; documentation is not backend equivalence evidence |
| lora | Frozen base plus low-rank factors, scaling and initialization mechanism | Dense equivalence is exact arithmetic for compatible base/scaling; quantized merging can differ |
| alignment | One documented instruction-following and human-feedback training procedure | Full-text overview inspected; historical evidence, not universal alignment definition or current model guarantee |
| original | This record's original calculations and verification programs | Private instructor-only URN; not an independent human evaluator or public source |

Framework data and operational facts were not taken from old fleet notes. No credentials, wallets, private hosts, worker state, throughput, incident claims or payment details entered research queries or lessons.

## Verification results

The executable CPU program below passed with:

- 306 arithmetic assertions and all 16 numeric answer keys independently recomputed.
- 14 standard-library lesson snippets executed; 2 optional framework snippets compiled but not executed (`ttf-e08-01` for PyTorch and `ttf-e08-03` for MLX).
- 54 MLP gradient comparisons, 9 cross-entropy comparisons and 36 Q/K/V attention-gradient comparisons. Maximum attention-gradient absolute error: `8.514191573993912e-10` against a 1e-7 threshold.
- 88 full-decoder gradient comparisons: all 44 parameters, two central-difference step sizes. Maximum absolute error: `3.4714161527976684e-09` against a 2e-6 threshold.
- Tiny MLP training mean loss fell from `0.026750000000000003` to `0.00010403763123870902` in 100 analytic-gradient steps on the specified XOR fixtures.
- The toy decoder's six-target mean loss fell from `1.113540707403174` to `1.0874231440438307` in 12 finite-difference steps. This is a small training smoke test, not language competence or generalization evidence. A separate reverse-mode run matched its parameters within 2e-7, and deterministic serialized continuation matched uninterrupted reverse-mode training exactly.
- Eleven negative controls detected: wrong MLP update sign, normalization across batch, missing momentum on resume, stale gradients, double softmax, padding in the loss denominator, missing attention backward scale, unmasked attention leakage, permuted values, missing decoder causal mask and both LoRA factors initialized to zero.
- Four SDK negative controls rejected: one-family gate, missing objective, mismatched episode/gate scope, and placement on a non-placeable objective.
- Manual choice audit: all 16 selected answers and distractors checked against their stated assumptions. This is an author audit, not psychometric validation or an independent person's review.

The full-decoder reverse-mode and finite-difference checks share a forward program but use different differentiation mechanisms. They check derivatives of that program and cannot alone prove the intended architecture. Separate hand arithmetic, explicit attention pullbacks, shape/parameter counts, causality invariants and corrupted variants provide additional checks. Nothing here claims exhaustive coverage, a secure practical-code grader or chip-specific numerical qualification.

## Executable CPU verification

Run this from any directory with Python 3; it reads only the two content fragments as needed and uses standard-library CPU arithmetic. It neither imports the optional frameworks nor invokes devices.

```python
import ast, copy, importlib.util, json, math, re
from pathlib import Path
from types import SimpleNamespace

ROOT=Path.cwd()  # run from the course repo root
fragment=json.loads((ROOT/'content/training-and-transformers.json').read_text())
items={a['id']:a for a in fragment['assessments']}
episodes=[e for c in fragment['chapters'] for e in c['episodes']]
checks=0
negatives=[]
def check(actual,expected,tol=1e-9):
    global checks
    assert math.isfinite(float(actual)) and math.isfinite(float(expected))
    assert abs(actual-expected)<=tol,(actual,expected,tol)
    checks+=1

def fd(fn,values,h=1e-5):
    result=[]
    for i in range(len(values)):
        plus,minus=values[:],values[:]
        plus[i]+=h;minus[i]-=h
        result.append((fn(plus)-fn(minus))/(2*h))
    return result

def sm(row):
    m=max(row);w=[math.exp(x-m) for x in row]
    return [x/sum(w) for x in w]

def ce(row,target):
    m=max(row)
    return m+math.log(sum(math.exp(x-m) for x in row))-row[target]

# MLP: independent analytic chain and numerical perturbation of all nine parameters.
# Layout: W00,W01,W10,W11,b0,b1,v0,v1,c.
def mlp(p,x,y):
    z=[p[0]*x[0]+p[1]*x[1]+p[4],p[2]*x[0]+p[3]*x[1]+p[5]]
    h=[max(0,t) for t in z]
    prediction=p[6]*h[0]+p[7]*h[1]+p[8]
    r=prediction-y
    d=[r*p[6]*(z[0]>0),r*p[7]*(z[1]>0)]
    grad=[d[0]*x[0],d[0]*x[1],d[1]*x[0],d[1]*x[1],d[0],d[1],r*h[0],r*h[1],r]
    return .5*r*r,grad,prediction,z,h
p=[2,1,-1,2,1,0,3,-1,.5]
L,g,pred,z,h=mlp(p,[1,-2],1)
check(pred,3.5);check(L,3.125)
assert z==[1,-5] and h==[1,0]
assert g==[7.5,-15,0,0,7.5,0,2.5,0,2.5]
mlp_comparisons=0
for params,x,y in [(p,[1,-2],1),([1,2,-1,1,1,4,2,-3,.5],[2,-1],.5),([.2,-.3,.7,.6,.4,.5,-.2,.8,.1],[.5,1.2],-.4)]:
    analytic=mlp(params,x,y)[1]
    for step in [1e-4,1e-5]:
        for a,b in zip(analytic,fd(lambda v:mlp(v,x,y)[0],params,step)):
            check(a,b,1e-7);mlp_comparisons+=1
# Train a real tiny two-hidden-unit MLP on XOR, with explicit mean reduction.
data=[([0,0],0),([0,1],1),([1,0],1),([1,1],0)]
def batch_mlp(params):
    rows=[mlp(params,x,y) for x,y in data]
    return sum(r[0] for r in rows)/4,[sum(r[1][j] for r in rows)/4 for j in range(9)]
params=[1,-1,-1,1,.1,.2,.8,.9,.05]
mlp_initial=batch_mlp(params)[0]
for _ in range(100):
    _,g=batch_mlp(params);params=[w-.1*d for w,d in zip(params,g)]
mlp_final=batch_mlp(params)[0]
assert mlp_final < mlp_initial/10
start=[1,-1,-1,1,.1,.2,.8,.9,.05];L,g=batch_mlp(start)
assert batch_mlp([w+.01*d for w,d in zip(start,g)])[0]>L
negatives.append('wrong MLP update sign')
check(4*.25,1);check(1/math.sqrt(1+1e-5),.9999950000374997)
check(1.1**10,2.5937424601);check(.1**10,1e-10)
check((1-.2)**2,.64)
# Feature-only normalization must be unaffected by unrelated batch rows.
def ln(row):
    mean=sum(row)/len(row);variance=sum((x-mean)**2 for x in row)/len(row)
    return [(x-mean)/math.sqrt(variance+1e-5) for x in row]
assert ln([1,3])==[ln(r) for r in [[1,3],[100,200]]][0]
wrong=ln([1,3,100,200])[:2]
assert max(abs(a-b) for a,b in zip(wrong,ln([1,3])))>.1
negatives.append('normalization across batch')
# Momentum, AdamW and continuation.
def momentum(state,grad,mu=.9,eta=.1):
    w,m,t=state;m=mu*m+grad
    return w-eta*m,m,t+1
state=momentum((1.,0.,0),2.)
check(state[0],.8)
snapshot=copy.deepcopy(state)
continued=momentum(state,-1.)
check(continued[0],.72);check(continued[1],.8)
assert momentum(snapshot,-1.)==continued
assert momentum((snapshot[0],0.,snapshot[2]),-1.)!=continued
negatives.append('checkpoint loses momentum')
m,v=.1*2,.01*4;mhat=m/(1-.9);vhat=v/(1-.99)
check(mhat,2);check(vhat,4)
check((1-.1*.1)*1-.1*mhat/math.sqrt(vhat),.89)
check(6*4*4,96)
w=1.;buffer=0.;clean=[]
for _ in range(2):
    grad=(w*2-4)*2;w-=.1*grad;clean.append(w)
check(clean[0],1.4);check(clean[1],1.64)
check(.5*(1.64*2-4)**2,.2592)
check(.5*(.6*2-4)**2,3.92)
w=1.
for _ in range(2):buffer+=(w*2-4)*2;w-=.1*buffer
check(w,2.04);assert abs(w-clean[-1])>.1
negatives.append('stale gradient buffer')
# Embedding scatter/add and token-loss references.
E=[[1,0],[0,1],[1,1],[-1,0]];ids=[2,0,2]
assert [E[t] for t in ids]==[[1,1],[1,0],[1,1]]
check(1+.2,1.2);check(1-.2,.8)
row=[sum(v) for v in zip([1,2],[-.5,3])];assert row==[.5,5]
z=[math.log(2),0,0]
assert sm(z)==[.5,.25,.25]
check(ce(z,1),math.log(4));check(ce([x+1000 for x in z],1),math.log(4),1e-10)
check(ce([1000,-1000],1),2000)
ce_comparisons=0
for logits,target in [(z,1),([-.4,.8,1.3],0),([4,-2,.7],2)]:
    analytic=[p-(i==target) for i,p in enumerate(sm(logits))]
    check(sum(analytic),0)
    for a,b in zip(analytic,fd(lambda r:ce(r,target),logits)):
        check(a,b,1e-7);ce_comparisons+=1
assert abs(ce(sm(z),1)-ce(z,1))>.1
negatives.append('double softmax loss')
check((1+2+3+4)/4,2.5);check(((1+2+3)/3+4)/2,3)
check(sum(v*m for v,m in zip([.2,1.4,99,.8],[1,1,0,1]))/3,.8)
assert [[j<=i for j in range(3)] for i in range(3)]==[[True,False,False],[True,True,False],[True,True,True]]
assert abs((1+2+3+4)/6-2.5)>.5
negatives.append('padding denominator')
check(sm([math.log(4),0])[0],.8)
check(sm([math.log(4)/2,0])[0],2/3)
check(sm([math.log(4)/.5,0])[0],16/17)
check(.6/(.6+.3),2/3);check(2*3*2*5*2*4*2,960)
# Independent masked-attention forward and explicit analytic pullback.
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def mm(a,b):return [[dot(row,col) for col in zip(*b)] for row in a]
X=[[1,0],[0,2]]
Q=mm(X,[[1,1],[0,1]]);K=mm(X,[[1,0],[1,1]]);V=mm(X,[[2,0],[0,3]])
assert Q==[[1,1],[0,2]] and K==[[1,0],[2,2]] and V==[[2,0],[0,6]]
assert mm(Q,list(map(list,zip(*K))))==[[1,4],[0,4]]
def attention(q,k,v,causal=True):
    size=len(q);P=[];out=[];scale=math.sqrt(len(q[0]))
    for i in range(size):
        allowed=[j for j in range(size) if not causal or j<=i]
        weights=sm([dot(q[i],k[j])/scale for j in allowed])
        row=[0.]*size
        for j,p in zip(allowed,weights):row[j]=p
        P.append(row)
        out.append([sum(row[j]*v[j][d] for j in range(size)) for d in range(len(v[0]))])
    return out,P

def pullback(q,k,v,target,omit_scale=False):
    out,P=attention(q,k,v);n=len(q);d=len(q[0]);dv=len(v[0]);scale=1 if omit_scale else math.sqrt(d)
    G=[[o-t for o,t in zip(row,tr)] for row,tr in zip(out,target)]
    dq=[[0.]*d for _ in q];dk=[[0.]*d for _ in k];dvalue=[[0.]*dv for _ in v]
    for i in range(n):
        dp=[dot(G[i],v[j]) for j in range(n)]
        mean=sum(P[i][j]*dp[j] for j in range(n))
        for j in range(n):
            ds=P[i][j]*(dp[j]-mean)
            for a in range(d):dq[i][a]+=ds*k[j][a]/scale;dk[j][a]+=ds*q[i][a]/scale
            for a in range(dv):dvalue[j][a]+=P[i][j]*G[i][a]
    return dq,dk,dvalue
q=[[.2,-.3],[.7,.1],[-.4,.5]];k=[[1,.2],[-.3,.8],[.4,-.6]];v=[[1,-2],[.5,.4],[-1,3]]
target=[[.1,.3],[-.2,.5],[.7,-.1]]
flat=lambda a:[x for row in a for x in row]
def unpack(xs):return [xs[i:i+2] for i in range(0,6,2)]
def attn_loss(q,k,v):
    out,_=attention(q,k,v)
    return .5*sum((a-b)**2 for a,b in zip(flat(out),flat(target)))
analytic=pullback(q,k,v,target);attention_comparisons=0;max_attention_error=0.
for which,arr in enumerate([q,k,v]):
 for step in [1e-4,1e-5]:
    def loss(xs):
        args=[q,k,v];args[which]=unpack(xs);return attn_loss(*args)
    ref=fd(loss,flat(arr),step)
    for a,b in zip(flat(analytic[which]),ref):
        check(a,b,1e-7);max_attention_error=max(max_attention_error,abs(a-b));attention_comparisons+=1
broken=pullback(q,k,v,target,True)
assert max(abs(a-b) for a,b in zip(flat(broken[0]),flat(analytic[0])))>1e-4
negatives.append('attention backward missing scale')
out,_=attention(q,k,v);future=copy.deepcopy(v);future[-1]=[30,-20]
assert attention(q,k,future)[0][0]==out[0]
assert max(abs(a-b) for a,b in zip(attention(q,k,future,False)[0][0],attention(q,k,v,False)[0][0]))>1
negatives.append('unmasked attention future leak')
assert max(abs(a-b) for a,b in zip(flat(attention(q,k,list(reversed(v)))[0]),flat(out)))>.1
negatives.append('permuted attention values')
weights=sm([0,math.log(3)]);check(dot(weights,[2,6]),5)
check(.5*(5-1)**2,8)
for a,b in zip([4*p for p in weights],[1,3]):check(a,b)
dp=[8,24];ds=[p*(g-dot(weights,dp)) for p,g in zip(weights,dp)]
for a,b in zip(ds,[-3,3]):check(a,b)
check(dot(ds,[0,math.log(3)]),3*math.log(3))
# Head counts, rotary identity and RMS normalization.
check(8*8+2*8*4+8*8,192);check(4*8*8,256)
def rotate(row,theta):
    a,b=row;c,s=math.cos(theta),math.sin(theta)
    return [a*c-b*s,a*s+b*c]
check(dot(rotate([2,3],.4),rotate([-1,4],1.1)),dot([2,3],rotate([-1,4],.7)))
check(dot(rotate([2,3],.4),rotate([-1,4],.4)),dot([2,3],[-1,4]))
check(3/math.sqrt(12.5),.848528137423857);check(4/math.sqrt(12.5),1.131370849898476)
assert sum([3/math.sqrt(12.5),4/math.sqrt(12.5)])!=0
# Execute authored Python; dependency examples compile but remain explicitly unexecuted.
executed=[];optional=[];decoder_ns=None
for episode in episodes:
 for block in episode['blocks']:
  if block['type']!='text':continue
  for snippet in re.findall(r'^```python\n(.*?)^```$',block['markdown'],re.S|re.M):
    compiled=compile(snippet,episode['id'],'exec')
    tree=ast.parse(snippet)
    imports=[alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node,ast.Import) for alias in node.names]
    if any(name in ['torch','mlx'] for name in imports):
        optional.append(episode['id']);continue
    ns={};exec(compiled,ns);executed.append(episode['id'])
    if 'decoder' in ns:decoder_ns=ns
assert decoder_ns is not None
# Reverse-mode implementation independent of the finite-difference oracle.
class AD:
    def __init__(self,value,parents=()):self.value=float(value);self.parents=parents;self.grad=0.
    @staticmethod
    def wrap(x):return x if isinstance(x,AD) else AD(x)
    def __add__(self,other):
        other=AD.wrap(other);return AD(self.value+other.value,((self,1.),(other,1.)))
    __radd__=__add__
    def __mul__(self,other):
        other=AD.wrap(other);return AD(self.value*other.value,((self,other.value),(other,self.value)))
    __rmul__=__mul__
    def __neg__(self):return self*(-1)
    def __sub__(self,other):return self+-AD.wrap(other)
    def __rsub__(self,other):return AD.wrap(other)+-self
    def __pow__(self,p):return AD(self.value**p,((self,p*self.value**(p-1)),))
    def __truediv__(self,other):return self*AD.wrap(other)**(-1)
    def __rtruediv__(self,other):return AD.wrap(other)*self**(-1)
    def __lt__(self,other):return self.value<AD.wrap(other).value
    def exp(self):
        e=math.exp(self.value);return AD(e,((self,e),))
    def log(self):return AD(math.log(self.value),((self,1/self.value),))
    def tanh(self):
        t=math.tanh(self.value);return AD(t,((self,1-t*t),))
    def backward(self):
        order=[];seen=set()
        def visit(node):
            if node in seen:return
            seen.add(node)
            for parent,_ in node.parents:visit(parent)
            order.append(node)
        visit(self)
        for node in order:node.grad=0.
        self.grad=1.
        for node in reversed(order):
            for parent,local in node.parents:parent.grad+=node.grad*local

# Use the lesson's forward program with differentiable elementary operations.
initial_theta=[.2*math.sin(i+1) for i in range(44)]
values=[AD(v) for v in initial_theta]
original_math=decoder_ns['math']
decoder_ns['math']=SimpleNamespace(sqrt=lambda x:AD.wrap(x)**.5,exp=lambda x:AD.wrap(x).exp(),log=lambda x:AD.wrap(x).log(),tanh=lambda x:AD.wrap(x).tanh())
loss=decoder_ns['objective'](values);loss.backward()
decoder_ns['math']=original_math
check(loss.value,decoder_ns['objective'](initial_theta))
decoder_comparisons=0;max_decoder_error=0.
for step in [1e-4,1e-5]:
    ref=fd(decoder_ns['objective'],initial_theta,step)
    for node,r in zip(values,ref):
        check(node.grad,r,2e-6);max_decoder_error=max(max_decoder_error,abs(node.grad-r));decoder_comparisons+=1
prefix_a=decoder_ns['decoder'](initial_theta,[0,1]);prefix_b=decoder_ns['decoder'](initial_theta,[0,2])
assert prefix_a[0]==prefix_b[0]
leaky_a=decoder_ns['decoder'](initial_theta,[0,1],False);leaky_b=decoder_ns['decoder'](initial_theta,[0,2],False)
assert max(abs(a-b) for a,b in zip(leaky_a[0],leaky_b[0]))>1e-8
negatives.append('decoder missing causal mask')
# Reverse-mode optimizer smoke test and exact continuation under plain deterministic SGD.
def ad_step(theta):
    values=[AD(v) for v in theta]
    decoder_ns['math']=SimpleNamespace(sqrt=lambda x:AD.wrap(x)**.5,exp=lambda x:AD.wrap(x).exp(),log=lambda x:AD.wrap(x).log(),tanh=lambda x:AD.wrap(x).tanh())
    loss=decoder_ns['objective'](values);loss.backward()
    decoder_ns['math']=original_math
    return [n.value-.1*n.grad for n in values]
trained=initial_theta[:]
for _ in range(12):trained=ad_step(trained)
for a,b in zip(trained,decoder_ns['theta']):check(a,b,2e-7)
short=initial_theta[:]
for _ in range(5):short=ad_step(short)
restored=json.loads(json.dumps(short))
for _ in range(7):restored=ad_step(restored)
assert restored==trained
assert decoder_ns['objective'](trained)<decoder_ns['objective'](initial_theta)
# Framework examples' arithmetic is checked without importing optional packages.
check(2*3-4+.5,2.5);check((2.5-1.5)*3,3);check((2.5-1.5)*4,4)
check((2-.01*3)*3+(-1-.01*4)*4+(.5-.01),2.24)
check(.5*(2.24-1.5)**2,.2738)
check(.5*(1+4)/2,1.25);check((-1*1-2*2)/2,-2.5);check(.5*((1.25-2)**2+(2.5-4)**2)/2,.703125)
# LoRA dense equivalence and nonzero-factor gradient condition.
a=[1,0,-1,2];b=[2,-1,.5];x=[1,2,3,4]
inner=dot(a,x);check(inner,6)
delta=[v*inner for v in b];assert delta==[12,-6,3]
dense=[[bi*ai for ai in a] for bi in b]
assert [dot(row,x) for row in dense]==delta
check(3+4,7)
def lora_loss(p):
    aa,bb=p[:4],p[4:];out=[bi*dot(aa,x) for bi in bb]
    return .5*sum((z-1)**2 for z in out)
assert max(abs(g) for g in fd(lora_loss,[0.]*7))<1e-10
assert max(abs(g) for g in fd(lora_loss,a+[0.,0.,0.]))>1
negatives.append('both LoRA factors zero')
# Every graded numeric key recomputed from its distinct stated fixture.
expected={
 '05-01':mlp([1,2,-1,1,1,4,2,-3,.5],[2,-1],.5)[1][1],
 '05-02':(.8)**2,
 '05-03':momentum((2,.5,0),-1,mu=.8,eta=.1)[0],
 '05-04':.5-.25*(.5-2),
 '06-01':1+4,
 '06-02':ce([math.log(2),math.log(3),math.log(5)],1),
 '06-03':(.2+1.4+.8)/3,
 '06-04':2*4*1*7*2*3*2,
 '07-01':4*6+4*6+4*2,
 '07-02':dot(sm([math.log(2),0]),[-1,5]),
 '07-03':12*12+12*4+12*4+12*12,
 '07-04':4*2+3*2+3*2*2+2*2+2*4+4*2+2*4,
 '08-01':(2*2-1)*2+(2*1-3)*1,
 '08-02':27-10,
 '08-03':2-.05*((2*1-0)*1+(2*3-4)*3)/2,
 '08-04':6*2+2*8,
}
for n,value in expected.items():
    key=items['ttf-a'+n+'-trace']['grading'];check(value,key['expected'],1e-8)
    assert math.isfinite(key['expected']) and key['absoluteTolerance']>=0
assert len(expected)==len([a for a in items.values() if a['type']=='numeric'])
results=dict(arithmetic_assertions=checks,numeric_keys=len(expected),python_fences_executed=len(executed),optional_framework_fences_compiled_not_executed=optional,mlp_gradient_comparisons=mlp_comparisons,ce_gradient_comparisons=ce_comparisons,attention_gradient_comparisons=attention_comparisons,max_attention_error=max_attention_error,decoder_gradient_comparisons=decoder_comparisons,max_decoder_error=max_decoder_error,mlp_initial_loss=mlp_initial,mlp_final_loss=mlp_final,decoder_initial_loss=decoder_ns['initial'],decoder_final_loss=decoder_ns['final'],bug_variants_rejected=negatives)
print(json.dumps(results,indent=2))
```

Extract and run the verification block without creating another file:

```sh
python3 - <<'PYVERIFY'
from pathlib import Path
import re
p=Path('content/training-and-transformers-review.md')
code=re.search(r'^```python\n(.*?)^```$',p.read_text(),re.S|re.M).group(1)
exec(compile(code,str(p),'exec'))
PYVERIFY
```

Reproduce standalone structural validation, combined semantic validation and projection checks with the existing built SDK:

```sh
node --input-type=module - <<'JSVERIFY'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import validateShape from '<course-sdk>/dist/generated/course-validator.js';
import {validateCourse} from '<course-sdk>/dist/validate.js';
import {compileCourse,verifyCompiledCourse} from '<course-sdk>/dist/compiler.js';
const root='content/';
const read=n=>JSON.parse(fs.readFileSync(root+n+'.json','utf8'));
const f=read('foundations'),t=read('training-and-transformers');
const envelope={schemaVersion:1,id:'ttf-validation',version:'0.1.0',title:'Validation only',summary:'No enrollment policy assigned',locale:'en',platforms:['web'],policy:{mode:'bounded',work:{additionalEpisodes:0},existingMaterialAccess:'read_only'}};
assert(validateShape({...envelope,...t}),JSON.stringify(validateShape.errors));
const standalone=validateCourse({...envelope,...t});
assert(!standalone.valid);
assert(standalone.issues.every(i=>i.code==='MISSING_REFERENCE'&&/^\/objectives\/\d+\/prerequisites\//.test(i.path)));
const merged=Object.fromEntries(Object.keys(t).map(k=>[k,[...f[k],...t[k]]]));
const full={...envelope,...merged};
const result=validateCourse(full);assert(result.valid,JSON.stringify(result.issues));
const c=compileCourse(full);assert(verifyCompiledCourse(c));
for(const a of c.learner.assessments)assert.deepEqual(Object.keys(a).sort(),['id','objectiveIds','type']);
for(const a of full.assessments)assert(!JSON.stringify(c.learner).includes(a.grading.explanation));
console.log('Standalone structure, combined semantics, compiler and learner projection passed');
JSVERIFY
```

## Remaining integration and practical boundaries

The parent owns full-course assembly, the enrollment policy, renderer/accessibility checks, source authorization, attempt scheduling, assistance-aware independent evidence, delayed items and practical capstone review. Optional framework execution remains unverified in this environment. No GPU workload, live worker operation, package installation, commit, push or external message occurred. Only the assigned JSON fragment and this review were written; foundations, planning and SDK were not edited or rebuilt.

## Fingerprints

SHA-256 values identify the final fragment and reviewed inputs. Foundations and planning values were compared with their before-work fingerprints and match. SDK fingerprints record the consumed files, not a claim that concurrent parent work elsewhere was frozen.

- `content/training-and-transformers.json`: `cc66a6c83d3f7198fc547fea794e9b803dfa04669d44d16034c41e8b0af74603`
- `content/foundations.json`: `0fc19404bfd36e74a431f5f0bb142080b4a45ac17c835504bda1c1b1e7db384a`
- `content/foundations-review.md`: `9f557934c60b260a7ab7f3439ef1a7a256fb78ecb841428584c643b431cf1b03`
- `AGENTS.md`: `cafc794023d3dbbcb370a9b7c9a11ef87f151c34e8229851b5b8c52c96706c8e`
- `planning/curriculum.json`: `a09bebe39e0b329ea62c7e05bc831ba4b30d81b82851d363dbfb405926a706a5`
- `planning/design.html`: `e21793413d0b6bf6ea924272ead866410a2d68f0d60465853fcf6398a8e69f3d`
- `planning/learning-flow-spec.json`: `3828f67c3d4b4a3dc206353192e0fcdb6f69e16fb22c7ac595294445883139b0`
- `course-sdk/src/types.ts`: `e72710d78ec27c79a2f0616de533cfe00d9843d61f39f8dd0b6b9e861d098295`
- `course-sdk/dist/course.schema.json`: `f147bde85c9665ab6211c2e94b9ffc4b27f65afeea2584e225274f42a30fd487`
- `course-sdk/dist/validate.js`: `4a0b481662de9f8936a0124d673579c2588726cbfc302dc8436b6c84b1fe8028`
- `course-sdk/dist/compiler.js`: `ce225c486bc857a27d06db9841c9becf2bcfa1146909281404fb8e7cd6ae7228`
- `course-sdk/dist/generated/course-validator.js`: `96fb43d0b2121862cd6ab399fb0c0b6e94656061a0db57a75de4c4d2e38bf6f6`

Verification environment: Python `3.9.6`, Node `26.9.0`.
