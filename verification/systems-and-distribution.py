# CPU verification against frozen private evidence; no source checkout or devices needed.
import ast, hashlib, json, math, re, subprocess
from pathlib import Path
from fractions import Fraction as F
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
fragment=json.loads((ROOT/'content/systems-and-distribution.json').read_text())
review=(ROOT/'content/systems-and-distribution-review.md').read_text()
pins=json.loads(re.search(r'^```json\n(.*?)^```$',review,re.S|re.M).group(1))
items={a['id']:a for a in fragment['assessments']}
checks=0;bugs=[]
def check(a,b,tol=1e-9):
    global checks
    assert math.isfinite(float(a)) and math.isfinite(float(b))
    assert abs(a-b)<=tol,(a,b)
    checks+=1

def rejects(fn):
    try:fn()
    except (ValueError,AssertionError):return
    raise AssertionError('Invalid variant was accepted')

# Source verification is byte comparison and AST parsing only; no worker imports.
source_text={}
for record in pins['records']:
    data=(ROOT/'evidence/snapshots'/(record['id']+'.txt')).read_bytes()
    assert hashlib.sha256(data).hexdigest()==record['sha256'],record['id']
    source_text[record['id']]=data.decode()
    if record.get('path',record.get('gitPath','')).endswith('.py'):ast.parse(data.decode())
manifest=json.loads(source_text['sys-src-package-manifest'])
assert manifest['artifact_id']==pins['patchedArtifactId']
assert manifest['upstream_commit']==pins['upstreamCommit']
row=json.loads(source_text['sys-src-head-record'].splitlines()[2])
assert row['kind']=='warmup' and row['split']=='head' and row['output_shape']==[4,800,32]
assert row['loss'] is None and row['output_dtype']=='torch.bfloat16'
assert row['timestamp_unix']==1788378301.884724
classes={n.name for n in ast.walk(ast.parse(source_text['sys-src-up-splits'])) if isinstance(n,ast.ClassDef)}
assert {'Llama3HeadModel','Llama3BodyModel','Llama3TailModel'}<=classes
# These static anchors locate inspected semantics; they are not runtime qualification.
assert 'RETURN_MIN_OBSERVATIONS = 3' in source_text['sys-src-patched-router']
assert 'RETURN_FACTOR_POWER = 1.5' in source_text['sys-src-patched-router']
assert 'self.optimizer.step()' in source_text['sys-src-patched-model']
assert 'pseudo_gradient_batch_count' in source_text['sys-src-patched-phase']

# Reduction: a pairwise tree compared with a separately implemented sequential sum.
def tree_sum(values,group=8):
    if not values:return 0
    partials=[]
    for start in range(0,len(values),group):
        row=values[start:start+group]+[0]*(group-len(values[start:start+group]))
        while len(row)>1:row=[row[i]+row[i+1] for i in range(0,len(row),2)]
        partials.append(row[0])
    return sum(partials)
reduction_cases=0
for n in range(0,41):
    values=[(i*7)%13-6 for i in range(n)]
    for group in [2,4,8,16]:
        check(tree_sum(values,group),sum(values),0);reduction_cases+=1
check(tree_sum(list(range(1,11))),55,0)
assert sum(range(1,9))!=sum(range(1,11));bugs.append('dropped partial reduction group')
def barrier(arrived,required):
    if set(arrived)!=set(required):raise ValueError('incomplete cooperative barrier')
barrier(range(8),range(8));rejects(lambda:barrier(range(3),range(8)))
bugs.append('edge threads skip required barrier')

# Tiled matmul counts each loaded tile element, not reuse inside its product loops.
def reference(A,B):
    return [[sum(a*b for a,b in zip(row,column)) for column in zip(*B)] for row in A]
def tiled(A,B,tile,drop_edge=False):
    m,k,n=len(A),len(B),len(B[0]);C=[[0]*n for _ in range(m)]
    reads=0;products=0
    stop_m=(m//tile)*tile if drop_edge else m
    stop_n=(n//tile)*tile if drop_edge else n
    for i0 in range(0,stop_m,tile):
        I=list(range(i0,min(i0+tile,m)))
        for j0 in range(0,stop_n,tile):
            J=list(range(j0,min(j0+tile,n)))
            for k0 in range(0,k,tile):
                K=list(range(k0,min(k0+tile,k)))
                a={(i,q):A[i][q] for i in I for q in K}
                b={(q,j):B[q][j] for q in K for j in J}
                reads+=len(a)+len(b)
                for i in I:
                    for j in J:
                        for q in K:C[i][j]+=a[i,q]*b[q,j];products+=1
    return C,reads,m*n,2*products
matrix_cases=0
for m,k,n in [(4,4,4),(5,7,3),(1,2,5),(6,6,6),(3,1,2)]:
    A=[[3*i-q+1 for q in range(k)] for i in range(m)]
    B=[[2*q-3*j for j in range(n)] for q in range(k)]
    for tile in [1,2,3,4]:
        out,reads,writes,ops=tiled(A,B,tile)
        assert out==reference(A,B);check(ops,2*m*k*n,0);matrix_cases+=1
A=[[i+j+1 for j in range(4)] for i in range(4)];B=[[2*i-j for j in range(4)] for i in range(4)]
_,r,w,o=tiled(A,B,2);check(r,64,0);check((r+w)*4,320,0);check(o/((r+w)*4),.4)
_,r,w,o=tiled(A,B,4);check((r+w)*4,192,0)
check((2*4**3+4*4)*4,576,0);check(128/576,F(2,9))
check(min(2e12,200e9*.4),80e9)
A=[[i+j+1 for j in range(7)] for i in range(5)];B=[[q-j for j in range(3)] for q in range(7)]
assert tiled(A,B,2,True)[0]!=reference(A,B);bugs.append('truncated edge tiles')
A=[[1,-2],[3,1]];B=[[2,0],[1,-1]]
product=reference(A,B);assert product==[[0,2],[7,-1]]
fused=[[max(0,x) for x in row] for row in product]
assert fused==[[0,2],[7,0]]
permuted=[list(row) for row in zip(*product)]
assert [[max(0,x) for x in row] for row in permuted]!=fused
bugs.append('cooperative-coordinate permutation')
check(4*4*2,32,0);check(24-6,18,0);check(5+5+10+3-18,5,0)
check(10/(4/2+6),1.25);check(10/6,F(5,3))

# Distributed arithmetic: independent finite differences of a central scalar loss.
def scalar_loss(w,v,x,y):return .5*(v*w*x-y)**2
def fd(fn,x,h=1e-5):return (fn(x+h)-fn(x-h))/(2*h)
for x,y,gw,gv in [(1,4,6,4),(2,8,24,16)]:
    check(fd(lambda w:scalar_loss(w,3,x,y),2),gw,1e-7)
    check(fd(lambda v:scalar_loss(2,v,x,y),3),gv,1e-7)
check((6+24)/2,15);check((4+16)/2,10)
check((1*2+3*6)/4,5)
assert (2+6)/2!=5;bugs.append('unweighted replica means')
assert reference([[1,2]],[[1,3],[2,4]])==[[5,11]]
assert [1,3]+[4,8]!=[5,11];bugs.append('concatenate partial sums')

# Pipeline: max-plus recurrence compared with an independent tick scheduler.
def schedule(durations,count,blocked=None):
    S=len(durations);done=[[0]*count for _ in durations]
    for s,d in enumerate(durations):
        for m in range(count):
            done[s][m]=max(done[s-1][m] if s else 0,done[s][m-1] if m else 0,(blocked or [0]*S)[s])+d
    return done

def ticks(stages,count,duration):
    completed=[[None]*count for _ in range(stages)]
    running=[None]*stages;t=0
    while completed[-1][-1] is None:
        for s,state in enumerate(running):
            if state is not None and state[1]==t:
                completed[s][state[0]]=t;running[s]=None
        for s in range(stages):
            if running[s] is not None:continue
            for m in range(count):
                if completed[s][m] is not None:continue
                if s and completed[s-1][m] is None:break
                running[s]=(m,t+duration);break
        if completed[-1][-1] is not None:break
        t+=1
    return completed
pipeline_cases=0
for stages in range(1,5):
 for count in range(1,6):
  for duration in [1,2,3]:
    actual=schedule([duration]*stages,count)
    assert actual==ticks(stages,count,duration)
    check(actual[-1][-1],(count+stages-1)*duration,0);pipeline_cases+=1
assert schedule([2,2,2],4)[-1]==[6,8,10,12]
assert schedule([2,2,2],4,[0,5,0])[-1]==[9,11,13,15]
check(4/6,F(2,3))
assert 3*4*2!=12;bugs.append('serial schedule mislabeled pipelined')
# A deterministic slot ledger tracks admission, returns and optimizer windows.
class Ledger:
    def __init__(self,capacity=2,threshold=3):
        self.capacity=capacity;self.threshold=threshold;self.cache={};self.seen=set();self.pending=0;self.steps=0;self.epoch=1
    def forward(self,key,time):
        if key in self.cache or len(self.cache)>=self.capacity:return False
        self.cache[key]=(self.epoch,time);return True
    def backward(self,key,time,epoch):
        if key in self.seen or key not in self.cache or epoch!=self.epoch:return False
        cached_epoch,started=self.cache[key]
        if epoch!=cached_epoch:return False
        del self.cache[key];self.seen.add(key);self.pending+=1
        if self.pending==self.threshold:self.steps+=1;self.pending=0
        return True
L=Ledger();assert L.forward('A',0) and L.forward('B',1)
assert not L.forward('C',2)
assert L.backward('A',4,1) and L.forward('C',4)
assert L.backward('B',7,1) and L.backward('C',10,1)
assert L.steps==1 and L.pending==0 and not L.cache
assert not L.backward('C',11,1);bugs.append('duplicate backward credited twice')
assert L.forward('D',12);L.epoch=2
assert not L.backward('D',13,1);bugs.append('old-epoch gradient accepted')
# Backward-first selection permits progress at full cache.
ready_forward=deque(['C']);ready_backward=deque(['A']);cache={'A','B'}
def pick():
    if ready_backward:return 'B',ready_backward.popleft()
    if len(cache)<2 and ready_forward:return 'F',ready_forward.popleft()
    return None
assert pick()==('B','A') and pick() is None
cache.remove('A');assert pick()==('F','C')
# Return-aware accounting resolves logical IDs only once; local failures are unscored.
pending={'sample':('peer',0)};costs=[]
for time in [7,8,9]:
    data=pending.pop('sample',None)
    if data:costs.append(time-data[1])
assert costs==[7]
pending={'lost':('peer',0)};pending.clear();assert pending.pop('lost',None) is None
check(.2*10+.8*40,34)
factor=lambda reference,cost:min(4,max(.2,(reference/cost)**1.5))
check(factor(50,20)/factor(50,80),8)
check(factor(50,1000),.2);check(factor(50,1),4)
assert len(costs)!=3;bugs.append('send attempts counted as unique returns')

# Pseudogradient chunking and merge with explicit finite and binding checks.
def pseudo(previous,current,chunks):
    if len(previous)!=len(current) or not previous or chunks<1:raise ValueError('shape or chunk count')
    width=(len(previous)+chunks-1)//chunks;result=[]
    for start in range(0,len(previous),width):
        result.extend(a-b for a,b in zip(previous[start:start+width],current[start:start+width]))
    return result
for n in [1,2,10,13]:
    old=[float(i) for i in range(n)];current=[i*.75-1 for i in range(n)]
    ref=[a-b for a,b in zip(old,current)]
    for chunks in [1,2,3,4,11]:assert pseudo(old,current,chunks)==ref
check((10+3-1)//3,4,0)
assert [len(list(range(10))[i:i+4]) for i in range(0,10,4)]==[4,4,2]
assert [x/3 for x in pseudo([10,20],[9,18],3)]!=[1,2]
bugs.append('chunk count used as divisor')
def merge(old,old_m,contributions,mu,eta,binding):
    if not contributions:raise ValueError('no valid contributors')
    total=[0.]*len(old);denominator=0.
    for record in contributions:
        if record['binding']!=binding:raise ValueError('stale artifact binding')
        g,weight=record['g'],record['weight']
        if len(g)!=len(old) or not math.isfinite(weight) or weight<=0 or not all(math.isfinite(x) for x in g):raise ValueError('invalid contribution')
        total=[a+weight*x for a,x in zip(total,g)];denominator+=weight
    g=[x/denominator for x in total]
    buffer=[mu*m+x for m,x in zip(old_m,g)]
    result=[w-eta*(x+mu*b) for w,x,b in zip(old,g,buffer)]
    return result,buffer,g
bind=('run-fixture',1,4,2)
records=[dict(binding=bind,g=[1.,2.],weight=1.),dict(binding=bind,g=[2.,-1.],weight=1.)]
new,m,g=merge([10,20],[0,0],records,.5,.2,bind)
for a,b in zip(new,[9.55,19.85]):check(a,b)
assert g==[1.5,.5]
weighted=[dict(r) for r in records];weighted[1]['weight']=3
assert merge([10,20],[0,0],weighted,.5,.2,bind)[2]==[1.75,-.25]
rejects(lambda:merge([10,20],[0,0],[],.5,.2,bind));bugs.append('empty merge treated as success')
bad=[dict(records[0],binding=('run-fixture',1,3,2))]
rejects(lambda:merge([10,20],[0,0],bad,.5,.2,bind));bugs.append('stale merge binding')
bad=[dict(records[0],g=[float('nan'),2])]
rejects(lambda:merge([10,20],[0,0],bad,.5,.2,bind));bugs.append('nonfinite merge contributor')
assert pseudo([10,20],[9,18],1)!=pseudo([9,18],[10,20],1)
bugs.append('pseudo-gradient sign reversal')

# Lifecycle traces: stale or other-session evidence never revives a reset state.
def project(events,session):
    state='unknown';last=-math.inf
    for event,time,event_session,body_ok in events:
        if event_session!=session or time<last:continue
        last=time
        if event=='registered':state='admitted'
        elif event=='reset':state='reset'
        elif event=='heartbeat_response' and not body_ok:state='needs_review'
        elif event=='training_progress' and state=='admitted':state='admitted'
    return state
trace=[('registered',4,'S',True),('training_progress',12,'S',True),('reset',16,'S',True),('training_progress',12,'S',True)]
assert project(trace,'S')=='reset'
assert project(trace+[('registered',20,'OLD',True)],'S')=='reset'
bugs.append('late progress revives reset session')
assert project([('registered',4,'S',True),('heartbeat_response',5,'S',False)],'S')=='needs_review'
bugs.append('HTTP 200 treated as semantic admission')
check(3.5-1.2,2.3);check(5-4,1);check(4*800*32*2,204800,0)
check(204800/1024,200);check(4*800*128*2/1024,800)
check(2*3*5,30,0);check(2*3,6,0)
check(12-8,4);check(8-4-1+1,4);check(4-0,4);check(15-4,11)

# Every learner-facing Python example executes independently on CPU.
snippets=0
for chapter in fragment['chapters']:
 for episode in chapter['episodes']:
  for block in episode['blocks']:
   if block['type']!='text':continue
   for snippet in re.findall(r'^```python\n(.*?)^```$',block['markdown'],re.S|re.M):
       tree=ast.parse(snippet)
       assert not any(isinstance(n,(ast.Import,ast.ImportFrom)) for n in ast.walk(tree))
       exec(compile(snippet,episode['id'],'exec'),{});snippets+=1

# Fresh assessment fixtures, independently calculated from the prompts.
a=[[i+j+1 for j in range(6)] for i in range(6)];b=[[i-j for j in range(6)] for i in range(6)]
_,reads,writes,_=tiled(a,b,3)
new=merge([8],[1],[dict(binding=bind,g=[1],weight=1),dict(binding=bind,g=[3],weight=1)],.5,.2,bind)[0][0]
successes=['A','B','D','E','E','F','G']
expected={
 '09-01':((19+7)//8)*8-19,
 '09-02':(reads+writes)*4,
 '09-03':3*5*4*2,
 '09-04':6+6+12+4-(32-8),
 '10-01':(2*4+3*(-1))/5,
 '10-02':ticks(4,5,3)[-1][-1],
 '10-03':factor(40,160),
 '10-04':new,
 '11-01':12-9,
 '11-02':len(range(11-5-1))+1,
 '11-03':len(set(successes))%4,
 '11-04':23-3,
}
for n,value in expected.items():
    key=items['sys-a'+n+'-trace']['grading'];check(value,key['expected'],1e-8)
assert len(expected)==len([a for a in fragment['assessments'] if a['type']=='numeric'])
assert len(bugs)==len(set(bugs))
print(json.dumps(dict(arithmetic_assertions=checks,reduction_cases=reduction_cases,matrix_tile_cases=matrix_cases,pipeline_schedule_cases=pipeline_cases,numeric_keys=len(expected),python_fences=snippets,source_hashes_verified=len(pins['records']),bug_variants_rejected=bugs),indent=2))
