# Engineering practice: content and CPU verification review

Reviewed 2026-10-12. Private instructor material, including answer keys and negative controls. This is an authoring and executable CPU verification record, not an independent human review, implemented practical grader, hardware qualification, deployment or present fleet assessment.

## Scope and schema

Only `content/engineering-practice.json` and this review are authored. The fragment uses exactly eight arrays: objectives, chapters, assessments, gates, sources, visuals, media and extensions. It contains chapters `chapter12`, `chapter13`, `chapter14`, four episodes each, twelve objectives, twenty-four assessments, twelve gates and twenty-two dated sources. Owned non-chapter IDs use `eng-`; external prerequisites refer only to the existing `fnd-` and `ttf-` content. No `sys-` dependency is introduced. Visuals/media/extensions are empty. There is no policy field anywhere in the fragment.

Titles and episode order match the planning curriculum. Every objective is critical and `placeable: false`; each episode gate requires all its objectives and two independent item families. A calculation/execution trace and a separate diagnosis/transfer decision address every objective. These are different tasks, not duplicate questions with renamed families. Choice answers are balanced, three in each position. Family distinctions are an authoring judgment, not calibrated statistical independence.

## Teaching coverage

Counts include only teaching blocks; prose excludes fenced code. Assessments and explanations contribute nothing to the 400-word requirement.

| Episode | Lesson words | Prose words | Distinct assessment families |
| --- | ---: | ---: | --- |
| eng-e12-01 | 550 | 509 | eng-family-coordinate-error / eng-family-qualification-counterexample |
| eng-e12-02 | 563 | 521 | eng-family-layout-coordinate-audit / eng-family-gradient-identifiability |
| eng-e12-03 | 541 | 510 | eng-family-unequal-microbatch / eng-family-path-coverage |
| eng-e12-04 | 555 | 527 | eng-family-containment-timeline / eng-family-causal-disclosure |
| eng-e13-01 | 532 | 484 | eng-family-global-log-partition / eng-family-finite-check-boundary |
| eng-e13-02 | 515 | 466 | eng-family-rms-pullback / eng-family-recompute-lifetime |
| eng-e13-03 | 520 | 502 | eng-family-comparison-envelope / eng-family-artifact-and-probe-gate |
| eng-e13-04 | 543 | 508 | eng-family-end-to-end-speedup / eng-family-false-success-harness |
| eng-e14-01 | 514 | 490 | eng-family-spec-to-equation / eng-family-paper-claim-scope |
| eng-e14-02 | 515 | 486 | eng-family-paired-experiment / eng-family-evidence-manifest |
| eng-e14-03 | 552 | 512 | eng-family-network-critical-path / eng-family-operational-receipts |
| eng-e14-04 | 548 | 523 | eng-family-heldout-gradient-defense / eng-family-portfolio-evidence-boundary |

Chapter 12 reconstructs a numerical incident through coordinate and gradient evidence, path coverage, microbatch semantics and claim discipline. Chapter 13 derives tiled loss, head and normalization gradients, saved-state/lifetime requirements and measured optimization gates. Chapter 14 connects paper claims to implementations, paired experiments, resource/receipt accounting and a defended final portfolio.

## Pinned evidence

The SHA-256 URNs resolve conceptually to the exact local files below. Paths are relative to the recorded source root (`<mining-repo>`, a local checkout that is not published). The verification below reads the frozen copies in `evidence/snapshots/`; where a snapshot had local absolute paths replaced with placeholders, its entry records the redacted digest and the original digest separately. These files were read only: no research or worker module, Metal compiler or GPU experiment was executed. Historical dates come from document/directory labels, not invented embedded timestamps. `CLAUDE.md` is the rule snapshot observed on 2026-10-12. If mutable files later change, verification must fail instead of silently citing their new contents. The parent must provide authorized archival storage/URN resolution; hashes alone do not guarantee future availability.

<!-- BEGIN PINNED SOURCES -->
```json
{
  "sourceRoot": "<mining-repo>",
  "capturedDate": "2026-10-12",
  "historicalEvidenceDate": "2026-10-11",
  "files": [
    {
      "sourceId": "eng-src-rules",
      "path": "CLAUDE.md",
      "sha256": "60da4971318cd8c3e8c2735255d4e526e48e12427c20555488c7c5a9b35f1743",
      "bytes": 3733
    },
    {
      "sourceId": "eng-src-incident",
      "path": "macos/StrataMiner/Research/SN9_RUN24_CORRUPTION_INCIDENT_2026-10-11.md",
      "sha256": "ab1508a9b8767d6477f1c662251aff7e9add6285ed44e01fcaba89058eb6f174",
      "bytes": 9278
    },
    {
      "sourceId": "eng-src-pv-host",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/probe_pv.py",
      "sha256": "e88766e8af0d36606c31577c27be7463a2b495ca6e43303a5670ba26a525367a",
      "bytes": 4003
    },
    {
      "sourceId": "eng-src-pv-metal",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/kernels/probe_pv.metal",
      "sha256": "c1f4458eb0ce3c4cff3c77e958ef5389a3193e0795aff92edb03cf7e000f8aa9",
      "bytes": 8394
    },
    {
      "sourceId": "eng-src-pv-a",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/results/guru-mini-probe_pv.json",
      "sha256": "48035246087ace071cf8900500f86e7ea3b4649718ea447e81e5b7b7f3316c50",
      "bytes": 1155
    },
    {
      "sourceId": "eng-src-pv-b",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/results/lurus-mini-probe_pv.json",
      "sha256": "2f0c5b7f2a563bca586344755b68bf7b8b789f9a94a460f1a1c69138d15c7889",
      "bytes": 1159
    },
    {
      "sourceId": "eng-src-drow",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/probe_drow.py",
      "sha256": "9cd63f0ecef1480af194cba37c591cc82d0f026fc1ceb85de8f67c1e145a2def",
      "bytes": 1778
    },
    {
      "sourceId": "eng-src-oracle-source",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/qualify/oracle.py",
      "sha256": "7a9d95dedb7e8aaf5d7d736228f825a828c9b3d22422174ab6637c48f64f8152",
      "bytes": 1714
    },
    {
      "sourceId": "eng-src-drift-note",
      "path": "macos/StrataMiner/Research/sn9-equivalence-suite/results/m5-max-drift-2026-10-11/INVESTIGATION.md",
      "sha256": "146c862ad7ed63fe00d505f4f099d808e52df265f50e74524e35f9bd038a9698",
      "bytes": 14686
    },
    {
      "sourceId": "eng-src-drift-cases",
      "path": "macos/StrataMiner/Research/sn9-equivalence-suite/results/m5-max-drift-2026-10-11/case-summary.json",
      "sha256": "1567849ad8ccd1e601eb40dc5f819b9eefc397138f0f5e03b5db1ae26deecb5b",
      "bytes": 2135
    },
    {
      "sourceId": "eng-src-drift-exact",
      "path": "macos/StrataMiner/Research/sn9-equivalence-suite/results/m5-max-drift-2026-10-11/drift-exact-embedding-20261011.json",
      "sha256": "ff4fbc10cdb3c267b4f26ce0fb9add1edd752592bb3d1f14c4f89cccaebef215",
      "bytes": 725,
      "redaction": "local absolute paths replaced with ~/ placeholders; sha256/bytes describe the redacted snapshot",
      "originalSha256": "ebaa9a4d3c3b4bbe42465ee5c2c9a35e0e73fdf1f280ff14dcac787b39da30fc",
      "originalBytes": 755
    },
    {
      "sourceId": "eng-src-original-forward",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/proposed/orig/Research/sn9-gqa-kernel-lab/tensorops_attention_s800_forward.metal",
      "sha256": "0d261149786b2472a120ffe60b3a289a83410f437be951f11001900c2ee0e92e",
      "bytes": 5998
    },
    {
      "sourceId": "eng-src-original-backward",
      "path": "macos/StrataMiner/Research/sn9-gqa-kernel-lab/requalify-2026-10-11/proposed/orig/Research/sn9-gqa-kernel-lab/tensorops_attention_s800_backward.metal",
      "sha256": "cb95a20da60019a5e9409851a45f06996a323a1de67ffa3faf7c750236be6910",
      "bytes": 11212
    }
  ]
}
```
<!-- END PINNED SOURCES -->

### Claim boundaries

- **Original implementation:** the archived pre-change forward source directly converts the score accumulator at lines 81 and 97; the backward dQ source does so at lines 68 and 97. Its D-row kernel reads bf16 O at lines 8–18. These inspected paths support a local mechanism; they do not identify every historical installed binary.
- **Direct saved layout measurements:** the two M5 Pro probe records, builds 26A428 and 26A434 with torch 2.7.1, contain 896/1024 wrong left-input coordinates, a zero fp32 compatibility flag and zero destination-load mismatches. Cooperative-conversion relative error is about 1.304; threadgroup-fp32 error is about 9.94e-8. The course transpose is an analogy, not a claim about the exact M5 permutation: the saved comparison against P-transpose remained far from the observed output.
- **Historical shared-run harm:** the 2026-10-11 incident narrative attributes harm to the original deployment. This course attributes that account to the narrative; it does not independently reconstruct every historical contribution or assign a causal share of damage. Correct dV on one input is a localization clue, not proof of every P entry. Determinism alone also cannot logically exclude every race; the stronger local evidence is the coordinate audit.
- **Historical attention-off discrepancy:** the later investigation describes release `ea4acb77`, both alternative attention paths disabled, upstream commit `22d702acd07453dabb187abedfad185826091341`, and two failing checks among fifty total checks. It records fresh bitwise-passing controls and an unproven cause at that investigation's date. This is not a current-status claim.
- **Separate startup-hook defect:** that investigation describes self-test execution under discarded saved-tensor hooks and fallback to upstream. The successful process did not qualify the unexecuted candidate. Its proposed fix/regression results are statements in that dated record; this course did not execute those runtime tests.
- **Later full-v2 M5 Max finding:** the case summary records one failed final embedding second-moment check. Its exact-summary JSON lists 262,668,288 elements, relative L2 errors 0.5816488215901757 and 0.38332527896750956, ratio 1.5173766341652515, factor 1.5 plus floor 1e-7, and `passed:false`. Recomputing that ratio below is only a saved-summary consistency check. The remote raw tensors were not accessed or independently compared. The dated report's passing loss/startup/shadow checks do not override its failed state gate.
- **Ablation limits:** a tested Pro layer-one full-v2 case passed, while a Pro forward-only/native-backward case failed a probe. The files do not establish a universal M5 failure, a universal mitigation, or a chip-only cause separate from OS. None of these findings is described as currently resolved or unresolved.

`CLAUDE.md` distinguishes computed-work equivalence from deliberately different routing/retry/registration behavior. Containment and rollout appear as proposal exercises only. No live worker, SSH session, wallet, credential, GPU or operational control was accessed. Healthy loss and completed work never establish local numerical qualification, corruption causality, acceptance, credit or payment.

## Primary sources

The fragment links official Apple TensorOps compatibility guidance; PyTorch 2.14 numerical-accuracy, gradcheck, checkpoint and benchmark documentation; and the original FlashAttention, recomputation and RMSNorm papers. Teaching text, calculations and questions are original. An exact algorithm does not guarantee bitwise equality of a private port. A paper or API example does not qualify a new artifact. The incident files identify torch 2.7.1; current 2.14 docs are conceptual API references, not proof of behavior in that older environment.

## Execute the CPU verification

From the private course root, run this exact command. It creates no files, imports no private research/worker code and uses only the Python standard library. It executes the code below, including deliberately bad variants; it is not a checklist that merely asserts a test plan exists.

```sh
python3 -B - <<'PY'
from pathlib import Path
review = Path('content/engineering-practice-review.md').read_text()
section = review.split('<!-- BEGIN CPU VERIFICATION -->', 1)[1]
code = section.split('```python\n', 1)[1].split('\n```', 1)[0]
exec(compile(code, 'engineering-practice-review:cpu', 'exec'), {'__name__': '__main__'})
PY
```

Central differences evaluate a scalar forward reference without calling the analytic pullback. Head tiling uses a streaming partition compared with full normalization. Some elementary arithmetic helpers are shared; simple hand-solvable fixtures and mutants provide additional discrimination, not universal proof. The calculations are CPU double-precision teaching models. The bf16 helper rounds represented values on CPU; it does not emulate or qualify a GPU. Saved-file checks are explicitly supplemental provenance/consistency checks, not a rerun of historical accelerator experiments.

<!-- BEGIN CPU VERIFICATION -->
```python
import copy, gc, hashlib, json, math, re, statistics, struct, unittest, weakref
from datetime import datetime
from pathlib import Path

ROOT = Path.cwd()
DATA = json.loads((ROOT/'content/engineering-practice.json').read_text())
REVIEW = (ROOT/'content/engineering-practice-review.md').read_text()
section = REVIEW.split('<!-- BEGIN PINNED SOURCES -->',1)[1]
PINS = json.loads(section.split('```json\n',1)[1].split('\n```',1)[0])
NEGATIVES = set()
FD_COMPONENTS = 0

def flat(a): return [x for row in a for x in row]
def tr(a): return [list(row) for row in zip(*a)]
def mm(a,b):
    assert a and b and all(len(row)==len(b) for row in a)
    assert all(len(row)==len(b[0]) for row in b)
    return [[sum(a[i][k]*b[k][j] for k in range(len(b)))
             for j in range(len(b[0]))] for i in range(len(a))]
def close(a,b,tol=2e-7):
    return len(a)==len(b) and all(math.isfinite(x) and math.isfinite(y)
        and abs(x-y)<=tol for x,y in zip(a,b))
def fd(fn, values, h=1e-6):
    global FD_COMPONENTS
    result=[]
    for i in range(len(values)):
        plus=list(values);minus=list(values);plus[i]+=h;minus[i]-=h
        result.append((fn(plus)-fn(minus))/(2*h));FD_COMPONENTS+=1
    return result
def reshape(values,rows,cols):
    assert len(values)==rows*cols
    return [values[i*cols:(i+1)*cols] for i in range(rows)]
def reject(name,would_pass):
    assert not would_pass,'Negative control unexpectedly passed: '+name
    NEGATIVES.add(name)
def bf16(x):
    bits=struct.unpack('>I',struct.pack('>f',x))[0]
    rounded=(bits+0x7fff+((bits>>16)&1)) & 0xffff0000
    return struct.unpack('>f',struct.pack('>I',rounded))[0]

def attention_forward(q,k,v,causal):
    n,d=len(q),len(q[0]);prob=[];out=[]
    for i in range(n):
        scores=[sum(q[i][a]*k[j][a] for a in range(d))/math.sqrt(d)
                if not causal or j<=i else -math.inf for j in range(n)]
        peak=max(scores);masses=[math.exp(s-peak) for s in scores]
        p=[s/sum(masses) for s in masses];prob.append(p)
        out.append([sum(p[j]*v[j][a] for j in range(n)) for a in range(d)])
    return out,prob

def attention_pullback(q,k,v,do,causal,wrong_output=False,rounded_output=False):
    out,p=attention_forward(q,k,v,causal)
    used=mm(tr(p),v) if wrong_output else out
    if rounded_output:used=[[bf16(x) for x in row] for row in used]
    dp=mm(do,tr(v));n,d=len(q),len(q[0]);ds=[]
    for i in range(n):
        D=sum(do[i][a]*used[i][a] for a in range(d))
        ds.append([p[i][j]*(dp[i][j]-D) for j in range(n)])
    scale=1/math.sqrt(d)
    dq=[[scale*x for x in row] for row in mm(ds,k)]
    dk=[[scale*x for x in row] for row in mm(tr(ds),q)]
    dv=mm(tr(p),do)
    return used,dq,dk,dv,ds

Q=[[.2,-.7],[1.1,.3],[-.4,.9]]
K=[[.6,-.2],[-.8,.4],[.3,1.2]]
V=[[1.25,-2.5],[4.1,.75],[-1.9,2.1]]
DO=[[.7,-.2],[-.3,.8],[1.2,-.6]]

def attention_fd(causal):
    base=[Q,K,V];grads=[]
    for which in range(3):
        def scalar(values):
            args=copy.deepcopy(base);args[which]=reshape(values,3,2)
            output,_=attention_forward(*args,causal)
            return sum(x*y for x,y in zip(flat(output),flat(DO)))
        grads.append(fd(scalar,flat(base[which])))
    return grads

def full_lse(z):
    peak=max(z)
    return peak+math.log(sum(math.exp(x-peak) for x in z))
def tiled_lse(z,width):
    peak=-math.inf;total=0.
    for i in range(0,len(z),width):
        tile=z[i:i+width];m=max(tile);s=sum(math.exp(x-m) for x in tile)
        M=max(peak,m);total=total*math.exp(peak-M)+s*math.exp(m-M);peak=M
    return peak+math.log(total)
def head_loss(x,w,targets):
    return sum(full_lse(row)-row[t] for row,t in zip(mm(x,w),targets))/len(x)
def head_gradients(x,w,targets,tile_local=False):
    dz=[]
    for row,t in zip(mm(x,w),targets):
        if tile_local:p=[math.exp(a-full_lse(row[(j//2)*2:(j//2)*2+2])) for j,a in enumerate(row)]
        else:
            partition=tiled_lse(row,2);p=[math.exp(a-partition) for a in row]
        dz.append([(p[j]-(j==t))/len(x) for j in range(len(row))])
    return mm(dz,tr(w)),mm(tr(x),dz)
def rms_forward(x,g,eps):
    r=math.sqrt(sum(v*v for v in x)/len(x)+eps)
    return [a*b/r for a,b in zip(x,g)]
def rms_gradients(x,g,dy,eps,omit_coupling=False):
    r=math.sqrt(sum(v*v for v in x)/len(x)+eps)
    u=[a*b for a,b in zip(dy,g)];dot=sum(a*b for a,b in zip(u,x))
    dx=[a/r-(0 if omit_coupling else b*dot/(len(x)*r**3)) for a,b in zip(u,x)]
    return dx,[a*b/r for a,b in zip(dy,x)]

def eligible(record,expected_hash):
    return (record.get('artifact')==expected_hash and record.get('numerical')=='pass'
        and record.get('requested')=='candidate' and record.get('resolved')=='candidate'
        and record.get('forward_hits',0)>0 and record.get('backward_hits',0)>0
        and record.get('state_comparison')=='pass')
def accepted_ids(events):
    identities={};accepted=set()
    for task,payload,status in events:
        assert task not in identities or identities[task]==payload,'Conflicting payload identity'
        identities[task]=payload
        if status=='accepted':accepted.add(task)
    return accepted

def computed_answers():
    times=[datetime.fromisoformat(x) for x in ['2030-02-01T10:02:30+00:00','2030-02-01T10:07:45+00:00']]
    return {
      '12-01':max(abs(a-b) for a,b in zip([10,-5,1,3],[10,-5,1,7])),
      '12-02':sum(i!=v for i,v in enumerate([0,3,6,1,4,7,2,5,8])),
      '12-03':statistics.mean([statistics.mean([1,1,1,1]),9])-statistics.mean([1,1,1,1,9]),
      '12-04':(times[1]-times[0]).total_seconds(),
      '13-01':math.log(sum([2,3,5]))-math.log(5),
      '13-02':1/math.sqrt(statistics.mean([0**2,2**2])),
      '13-03':1.5*.003+.0001,
      '13-04':50/(20/2+30),
      '14-01':4/math.sqrt(statistics.mean([0**2,3**2,4**2])+2/3),
      '14-02':statistics.median([a-b for a,b in [(100,90),(110,99),(120,108)]]),
      '14-03':6+240*10**6*8/(80*10**6)+5,
      '14-04':.5*.5+math.cos(0),
    }
def verify_keys(data):
    for suffix,value in computed_answers().items():
        a=next(a for a in data['assessments'] if a['id']=='eng-a'+suffix+'-trace')
        assert abs(a['grading']['expected']-value)<=a['grading']['absoluteTolerance'],a['id']

class EngineeringCPU(unittest.TestCase):
    def test_01_finite_repeatable_wrong(self):
        a=[1.,2.,3.,4.];b=[1.,3.,2.,4.]
        self.assertTrue(all(map(math.isfinite,b)));self.assertEqual(sum(a),sum(b))
        reject('finite_permutation',close(a,b));reject('vacuous_shape_zip',close([],a))
    def test_02_layout_and_drow(self):
        p=[[.25,.75],[.6,.4]];v=[[2.,-1.],[4.,3.]];do=[[1.,2.],[-1.,.5]]
        out=mm(p,v);bad=mm(tr(p),v)
        self.assertTrue(close(flat(out),[3.5,2.,2.8,.6],1e-12))
        self.assertTrue(close(flat(bad),[2.9,1.55,3.1,.45],1e-12))
        self.assertAlmostEqual(sum(x*y for x,y in zip(do[0],out[0])),7.5)
        self.assertAlmostEqual(sum(x*y for x,y in zip(do[0],bad[0])),6.0)
        reject('transpose_operand',close(flat(out),flat(bad)))
    def test_03_attention_all_gradients(self):
        for causal in [False,True]:
            ref=attention_fd(causal);actual=attention_pullback(Q,K,V,DO,causal)
            for name,a,b in zip(['dQ','dK','dV'],ref,actual[1:4]):
                self.assertTrue(close(a,flat(b)),(causal,name,a,b))
            self.assertTrue(all(abs(sum(row))<1e-12 for row in actual[4]))
    def test_04_attention_bad_variants(self):
        good=attention_pullback(Q,K,V,DO,True)
        wrong=attention_pullback(Q,K,V,DO,True,wrong_output=True)
        rounded=attention_pullback(Q,K,V,DO,True,rounded_output=True)
        for name,index in [('wrong_O',0),('wrong_drow_dQ',1),('wrong_drow_dK',2)]:
            reject(name,close(flat(good[index]),flat(wrong[index])))
        self.assertEqual(good[3],wrong[3])
        reject('rounded_O_backward',close(flat(good[1]),flat(rounded[1]),1e-6))
        reject('missing_attention_scale',close(flat(good[1]),[x*math.sqrt(2) for x in flat(good[1])]))
        reject('missing_causal_mask',close(flat(good[0]),flat(attention_forward(Q,K,V,False)[0])))
    def test_05_shared_head_gradients_sum(self):
        q2=[[x+.15 for x in row] for row in Q]
        for slot,label,base in [(2,'key',K),(3,'value',V)]:
            g1=attention_pullback(Q,K,V,DO,True)[slot];g2=attention_pullback(q2,K,V,DO,True)[slot]
            combined=[a+b for a,b in zip(flat(g1),flat(g2))]
            def scalar(values):
                k,v=(reshape(values,3,2),V) if slot==2 else (K,reshape(values,3,2))
                return sum(sum(a*b for a,b in zip(flat(attention_forward(q,k,v,True)[0]),flat(DO))) for q in [Q,q2])
            self.assertTrue(close(combined,fd(scalar,flat(base))))
            reject('averaged_shared_'+label+'_gradient',close(combined,[x/2 for x in combined]))
    def test_06_microbatch_weighting(self):
        chunks=[[2.],[8.,8.]];right=sum(map(sum,chunks))/sum(map(len,chunks))
        wrong=statistics.mean([statistics.mean(c) for c in chunks])
        self.assertEqual(right,6);self.assertEqual(wrong,5)
        reject('unweighted_microbatch_means',right==wrong)
    def test_07_tiled_partition_and_memory(self):
        z=[1000.,999.,998.,997.]
        self.assertAlmostEqual(tiled_lse(z,2),full_lse(z),places=12)
        self.assertAlmostEqual(tiled_lse(z,2)-z[2],2.4401896985611953,places=10)
        local=math.log(1+math.exp(-1))
        reject('tile_local_partition',abs(local-(full_lse(z)-z[2]))<1e-9)
        self.assertEqual(1024*8192*4/2**20,32)
        self.assertEqual(256*8192*4/2**20,8)
        self.assertEqual(1024*256*4/2**20,1)
    def test_08_head_input_and_weight_gradients(self):
        x=[[.4,-.7],[1.2,.3]];w=[[.5,-.2,.8],[-.1,.9,.2]];targets=[2,0]
        dx,dw=head_gradients(x,w,targets)
        fx=fd(lambda a:head_loss(reshape(a,2,2),w,targets),flat(x))
        fw=fd(lambda a:head_loss(x,reshape(a,2,3),targets),flat(w))
        self.assertTrue(close(flat(dx),fx));self.assertTrue(close(flat(dw),fw))
        bdx,bdw=head_gradients(x,w,targets,True)
        reject('tile_local_head_dx',close(flat(bdx),fx));reject('tile_local_head_dw',close(flat(bdw),fw))
    def test_09_rms_input_and_gain_gradients(self):
        x=[3.,4.];g=[1.,2.];dy=[1.,-.5];eps=1e-5
        scalar=lambda x,g:sum(a*b for a,b in zip(rms_forward(x,g,eps),dy))
        dx,dg=rms_gradients(x,g,dy,eps)
        self.assertTrue(close(dx,fd(lambda a:scalar(a,g),x)))
        self.assertTrue(close(dg,fd(lambda a:scalar(x,a),g)))
        reject('missing_rms_coupling',close(dx,rms_gradients(x,g,dy,eps,True)[0]))
        centered=[a-statistics.mean(x) for a in x]
        reject('centered_norm_substitution',close(rms_forward(x,g,eps),rms_forward(centered,g,eps)))
    def test_10_recompute_and_lifetime(self):
        reject('replay_updated_weights',3*4==5*4)
        reject('replay_new_dropout_mask',close([2*x for x in [1,0]],[2*x for x in [0,1]]))
        class Owner:pass
        owner=Owner();owner.payload=bytearray(1024);reference=weakref.ref(owner)
        view={'owner':owner};del owner;gc.collect();self.assertIsNotNone(reference())
        del view;gc.collect();self.assertIsNone(reference())
        allocations={'base':8,'scratch':3};references=['base','base','scratch']
        self.assertEqual(sum(allocations[k] for k in set(references)),11)
        reject('view_payload_as_allocation',3+1/1024==11)
    def test_11_optimizer_state_and_deceptive_loss(self):
        w=1.;correct=[]
        for _ in range(2):w-=.1*(w*2-4)*2;correct.append(w)
        w=1.;acc=0.;wrong=[]
        for _ in range(2):acc+=(w*2-4)*2;w-=.1*acc;wrong.append(w)
        self.assertTrue(close(correct,[1.4,1.64],1e-12));self.assertTrue(close(wrong,[1.4,2.04],1e-12))
        self.assertLess((wrong[-1]*2-4)**2/2,(correct[-1]*2-4)**2/2)
        reject('loss_improvement_as_equivalence',close(correct,wrong))
    def test_12_multistep_head_and_momentum(self):
        x=[[.4,-.7],[1.2,.3]];start=[[.5,-.2,.8],[-.1,.9,.2]];targets=[2,0]
        def train(tiled):
            w=copy.deepcopy(start);momentum=[[0.]*3 for _ in range(2)];states=[]
            for _ in range(8):
                if tiled:grad=head_gradients(x,w,targets)[1]
                else:grad=reshape(fd(lambda a:head_loss(x,reshape(a,2,3),targets),flat(w)),2,3)
                for i in range(2):
                    for j in range(3):
                        momentum[i][j]=.8*momentum[i][j]+grad[i][j];w[i][j]-=.05*momentum[i][j]
                states.extend(flat(w)+flat(momentum))
            return states
        self.assertTrue(close(train(False),train(True),2e-7))
    def test_13_finite_flags(self):
        values=[0.,float('nan'),1.];current=all(map(math.isfinite,values))
        self.assertFalse(current)
        reject('any_finite_is_all_finite',any(map(math.isfinite,values))==current)
        reject('stale_finite_flag',True==current)
        self.assertAlmostEqual((64-4)*15/1000,.9)
    def test_14_comparison_metrics(self):
        upstream=[.1,0.,0.];candidate=[.09,.09,.09]
        self.assertLess(max(candidate),max(upstream))
        ratio=math.sqrt(sum(x*x for x in candidate))/math.sqrt(sum(x*x for x in upstream))
        self.assertGreater(ratio,1.5);reject('max_error_overrules_L2',ratio<=1.5)
        self.assertFalse(.0062<=1.5*.004+.0001);self.assertTrue(.0060<=1.5*.004+.0001)
    def test_15_identity_coverage_and_missing_results(self):
        valid={'artifact':'sha-A','numerical':'pass','requested':'candidate','resolved':'candidate',
               'forward_hits':7,'backward_hits':7,'state_comparison':'pass'}
        self.assertTrue(eligible(valid,'sha-A'))
        for name,change in [('old_artifact',{'artifact':'sha-B'}),('fallback_only',{'resolved':'upstream','forward_hits':0}),
            ('missing_backward',{'backward_hits':0}),('missing_comparison',{'state_comparison':'not_run'}),('state_failure',{'state_comparison':'fail'})]:
            reject(name,eligible({**valid,**change},'sha-A'))
    def test_16_network_and_unique_receipts(self):
        self.assertAlmostEqual(100*2**20*8/(200*10**6),4.194304)
        self.assertEqual(8+5+2,15);self.assertEqual(max(8,5)+2,10)
        events=[('a','p1','computed'),('a','p1','submitted'),('b','p2','accepted'),('b','p2','accepted')]
        self.assertEqual(accepted_ids(events),{'b'})
        reject('attempts_as_accepted_work',len(events)==len(accepted_ids(events)))
        with self.assertRaises(AssertionError):accepted_ids(events+[('b','different','accepted')])
        NEGATIVES.add('conflicting_payload_identity')
    def test_17_numeric_keys_and_heldout_derivative(self):
        verify_keys(DATA)
        self.assertAlmostEqual(fd(lambda a:.5*.5*a[0]+math.sin(a[0]),[0])[0],1.25,places=9)
        changed=copy.deepcopy(DATA);changed['assessments'][0]['grading']['expected']+=1
        with self.assertRaises(AssertionError):verify_keys(changed)
        NEGATIVES.add('changed_numeric_answer_key')
    def test_18_lesson_snippets_and_structure(self):
        executed=0
        for chapter in DATA['chapters']:
            self.assertEqual(len(chapter['episodes']),4)
            for episode in chapter['episodes']:
                lesson='\n'.join(b['markdown'] for b in episode['blocks'] if b['type']=='text')
                self.assertGreaterEqual(len(re.sub(r'```.*?```','',lesson,flags=re.S).split()),400)
                for snippet in re.findall(r'```python\n(.*?)\n```',lesson,re.S):
                    exec(compile(snippet,episode['id'],'exec'),{});executed+=1
                gate=next(g for g in DATA['gates'] if g['id']==episode['gateId'])
                items=[a for a in DATA['assessments'] if a['id'] in gate['assessmentIds']]
                self.assertEqual({a['type'] for a in items},{'numeric','choice'})
                self.assertEqual(len({a['familyId'] for a in items}),2)
        self.assertEqual(executed,11)
    def test_19_pins_and_saved_summary_consistency(self):
        sources={s['id']:s for s in DATA['sources']};loaded={}
        for entry in PINS['files']:
            blob=(ROOT/'evidence/snapshots'/(entry['sourceId']+'.txt')).read_bytes()
            self.assertEqual(hashlib.sha256(blob).hexdigest(),entry['sha256'],entry['path'])
            self.assertTrue(sources[entry['sourceId']]['url'].endswith(entry['sha256']))
            if entry['path'].endswith('.json'):loaded[entry['sourceId']]=json.loads(blob)
        for key in ['eng-src-pv-a','eng-src-pv-b']:
            probe=loaded[key]
            self.assertEqual(probe['layout']['left_elements_checked'],1024)
            self.assertEqual(probe['layout']['left_mismatch_if_coord=(col,row)'],896)
            self.assertEqual(probe['flags']['is_compatible_as_left_input_fp32'],[0])
            self.assertEqual(probe['layout']['dest_load_mismatch(col,row)'],0)
        exact=loaded['eng-src-drift-exact']
        self.assertAlmostEqual(exact['candidate_relative_l2']/exact['reference_relative_l2'],exact['ratio'],places=12)
        self.assertFalse(exact['passed'])
        self.assertFalse(exact['candidate_relative_l2']<=exact['band_factor']*exact['reference_relative_l2']+exact['relative_floor'])
        cases={row['case']:row for row in loaded['eng-src-drift-cases']}
        self.assertEqual(len(cases['drift-v2-selftest-isolated-20261011']['failed_keys']),1)
        self.assertEqual(cases['M5Pro-lowmem-v2L1']['failed_keys'],[])
        self.assertEqual(len(cases['M5Pro-lowmem-v2L1-nativeback']['failed_keys']),1)

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(EngineeringCPU)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'tests':result.testsRun,'failed':len(result.failures),'errors':len(result.errors),
      'finite_difference_components':FD_COMPONENTS,'negative_controls_rejected':sorted(NEGATIVES),
      'numeric_keys_recomputed':computed_answers()},indent=2))
    if not result.wasSuccessful():raise SystemExit(1)
```
<!-- END CPU VERIFICATION -->

## In-memory released-SDK validation

Run the following from the private course root. It imports the existing pure assembler and writes no bundle. Do not use the build CLI for this task: it writes `dist/`, which is outside these two owned files. The root configuration supplies the existing course policy; none is inserted into this fragment.

```sh
node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assemble} from './scripts/assemble.mjs';
import {verifyCompiledCourse} from '@course-core/sdk/compiler';
const names=['foundations','training-and-transformers','engineering-practice'];
const modules=await Promise.all(names.map(async n=>JSON.parse(await readFile(`content/${n}.json`,'utf8'))));
const config=JSON.parse(await readFile('content/course-config.json','utf8'));
const output=assemble(config,modules,{preview:true});
assert(verifyCompiledCourse(output));
const counts=output.server.chapters.map(c=>({id:c.id,episodes:c.episodes.length}));
assert.equal(counts.length,11);assert(counts.every(c=>c.episodes===4));
assert.equal(output.server.objectives.length,44);
assert.equal(output.server.assessments.length,88);
assert.equal(output.server.gates.length,44);
assert.deepEqual(counts.map(c=>c.id),['chapter01','chapter02','chapter03','chapter04','chapter05','chapter06','chapter07','chapter08','chapter12','chapter13','chapter14']);
for(const item of output.learner.assessments)
  assert.deepEqual(Object.keys(item).sort(),['id','objectiveIds','type']);
const own=modules.at(-1);
assert.deepEqual(Object.keys(own).sort(),['objectives','chapters','assessments','gates','sources','visuals','media','extensions'].sort());
const visit=x=>{if(x&&typeof x==='object'){assert(!Object.hasOwn(x,'policy'));for(const v of Object.values(x))visit(v);}};
visit(own);
assert.throws(()=>assemble(config,modules),/all 14 chapters/);
console.log(JSON.stringify({sdk:JSON.parse(await readFile('node_modules/@course-core/sdk/package.json','utf8')).version,
  digest:output.digest,counts,episodes:44,objectives:44,assessments:88,gates:44},null,2));
JS
```

This is deliberately a partial preview: eleven chapters and forty-four episodes, not the complete fourteen-chapter course. The parallel systems module is excluded from this acceptance boundary so its ongoing edits cannot silently change the evidence. Source references, prerequisite links and gates are checked by the released SDK and existing assembler. Learner assessment projection is checked to exclude prompts, options and grading keys. Whole-course integration and any changed parallel content remain parent work.

## Exact remaining practical-grader limitations

1. This fragment implements twenty-four static numeric/choice items, one item per family. It implements no code-submission execution, artifact ingestion, oral evaluation or rubric evaluator. No placeholder evaluator ID, fake extension entrypoint or automatic practical credit is declared.
2. The CPU suite exercises the authored reference and specified mutants. It is not a hidden-test service for arbitrary learner programs. Authentication, attempt/artifact binding, sandbox isolation, time/memory limits, attestation, grading receipts and durable evidence publication are not implemented in these files.
3. Episode gates sample conceptual application. They do not grade a learner's full incident reconstruction, head implementation, checkpoint, experiment or portfolio. A practical reviewer must examine source/execution, independent gradients and state checks, failure controls, provenance and a new held-out change before awarding stronger evidence.
4. The final portfolio requires an independent written/oral defense and a delayed fresh task. No scheduler, delayed-item bank, fresh reattempt generator or practical assessor is implemented. Revealed, repeated or assisted items must not become fresh independent evidence. Family labels do not establish psychometric calibration.
5. Real accelerator qualification still needs the exact candidate on each permitted chip/OS/framework/binary configuration, realistic input distributions, all relevant gradients, multi-step state, repeatability, memory limits and matched completed-work measurements. CPU doubles and saved-summary consistency checks do not establish those gates.
6. Private source URNs need authorization and durable resolution supplied by the parent. This instructor review and answer bank must not become learner-readable merely through a source link. The remote large tensors are absent from this course repository; their original comparison cannot be independently replayed here.
7. Operational acceptance, credit and payment need their own authorized receipts. No current fleet claim is made. No runnable deployment, SSH, wallet or worker-control procedure is included. Healthy loss and completed work never replace numerical or causal evidence.

## Required practical evidence for a later grader/reviewer

For chapter 12, require a minimal failing coordinate example, expected logical mapping, O/dQ/dK/dV results, a scalar finite-difference objective, a rejected negative control, and a dated timeline that separates the original defect from later findings. Reject an account that calls the teaching transpose the actual M5 permutation, treats one matching dV as proof of all P values, or extrapolates a recorded case into current fleet status.

For capstone C, require a complete candidate, an independently computed reference, raw coordinate/global errors, every relevant gradient, equal initial state over multiple updates, replay/lifetime accounting and faults that the gate demonstrably detects. Test plans without execution evidence are insufficient. A practical evaluator must bind a bounded sandbox run to the submitted artifact; that integration is missing here. The CPU owner/view check demonstrates reference lifetime, while its MiB ledger is an explicit allocation model, not a measurement of GPU peak memory.

For the final portfolio, require code/input digests, environment, declared comparisons, raw matched observations, useful-work denominators, resource assumptions, failed/not-run cases and a guarded proposal with a rollback identity. Give a new diagnosis and record assistance. Completion of these short-item gates must not issue a professional certificate or a production-safety claim.

## Assessment-family reasoning audit

The numeric keys are recomputed by executable formulas above; the choices below are semantic judgments reviewed against each question's explicit facts, not automatically certified by a source citation.

| Objective | Numeric/trace task | Different transfer task and intended reasoning |
| --- | --- | --- |
| 12-01 | Coordinate error | A required gradient failure defeats aggregate/repeatability shortcuts. |
| 12-02 | Coordinate-label audit | A matching projection is insufficient to identify the full intermediate. |
| 12-03 | Unequal microbatch reduction | Fallback success is distinct from candidate execution. |
| 12-04 | Synthetic containment interval | Separate findings/configurations and preserve causal uncertainty. |
| 13-01 | Global partition across tiles | Preserve flag coverage, freshness and pre-mutation ordering. |
| 13-02 | RMS input sensitivity | Replay state and allocation ownership are separate obligations. |
| 13-03 | Declared error envelope | Old artifacts and global metrics cannot override new local failures. |
| 13-04 | Whole-job speedup | Fault-sensitive execution coverage and completed-work timing are needed. |
| 14-01 | Equation-to-implementation calculation | A paper's algorithmic result does not qualify a private port. |
| 14-02 | Paired time saving | Match artifact/input identities rather than repair metrics after the fact. |
| 14-03 | Serial network bottleneck | Computed/uploaded work does not establish acceptance, credit or payment. |
| 14-04 | Novel scalar derivative | Conceptual gates, practical review and production qualification remain distinct. |

## Recorded verification result

Both fenced shell commands above were executed verbatim from the private course root on 2026-10-12. The Python suite passed **19/19 tests**, with **111 finite-difference components**, **32 named rejected negative controls**, **12 recomputed numeric keys**, **11 executed lesson snippets**, and **13 matching private source hashes**. The provenance test checks saved records; it does not execute their GPU programs or re-read unavailable raw tensors. The named mutants are bounded pedagogical checks, not an exhaustive production fault campaign.

The released SDK **0.1.0** compiled and verified foundations + training-and-transformers + engineering-practice in memory: **11 chapters, 44 episodes, 44 objectives, 88 assessments, 44 gates**. Chapters 01–08 and 12–14 each have exactly four episodes. The deliberately incomplete full-course call was rejected; no complete-course claim or artifact was emitted. The compiled preview digest was `a2d73c540474a4651fca13e7f8220af12bdcaa0d7d519af0e41a46299387c060`.

The authored fragment contains **6038 prose words**, ranging from **466 to 527 per episode**, excluding code fences and assessment material. Its 24 assessment families are unique, all 121 owned entity/block IDs are unique, and chapter/episode titles match the planning curriculum. No policy key is present. These content assertions were checked separately from the numerical suite.

The reference-file hashes below identify the exact authoring/assembly inputs observed for this review. They are not permission to modify those files or a guarantee that parallel work will preserve them. Systems chapters 09–11 were not included in the verified combined boundary.

```json
{
  "python": "3.9.6",
  "sourceReviewTimestamp": "2026-10-12T16:28:47Z",
  "sha256": {
    "planning/curriculum.json": "a09bebe39e0b329ea62c7e05bc831ba4b30d81b82851d363dbfb405926a706a5",
    "content/foundations.json": "0fc19404bfd36e74a431f5f0bb142080b4a45ac17c835504bda1c1b1e7db384a",
    "content/training-and-transformers.json": "cc66a6c83d3f7198fc547fea794e9b803dfa04669d44d16034c41e8b0af74603",
    "content/engineering-practice.json": "76e8cd3283ab03b259d106c74d4eeecd716fa74604d92befec67ccdd2f80eac4",
    "content/course-config.json": "7c0288064ad2f1e19c811894557eab567704e25161274dbf249545a12133e54e",
    "scripts/assemble.mjs": "a53669d5f501400e573b99fd7840c963e44207accd4591f4584328e042eec094",
    "node_modules/@course-core/sdk/package.json": "de1691d627c7788816a509fded10e4f42c77c3c005b62ff0f38cad2eef1183ba",
    "package-lock.json": "f764505751dd61dd279f14caf9dc16e9de5fb3212f19c1f08f6ee1ea9476cac8"
  }
}
```

No committed, pushed, deployed or live-qualified outcome is claimed. Only the two assigned content/review files were written.
