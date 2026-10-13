# CPU verification against frozen private evidence; no source checkout or devices needed.
import copy, gc, hashlib, json, math, re, statistics, struct, unittest, weakref
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
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
