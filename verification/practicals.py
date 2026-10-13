"""Offline verification of private practical fixtures; never execute learner code here.

Optional --docker qualifies authored solutions/mutants against the existing CPU
broker. It does not install anything or integrate the course API/UI.
"""
import argparse
import ast
import copy
from decimal import Decimal
from fractions import Fraction
import hashlib
import importlib.util
import json
import math
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('private_practical_reference', ROOT/'runtime/code-reference.py')
REF = importlib.util.module_from_spec(spec)
spec.loader.exec_module(REF)
KEYS = ('embedding', 'position', 'q', 'k', 'v', 'o', 'up', 'down', 'head')


def equivalent(actual, expected, atol=0.0, rtol=0.0):
    if isinstance(actual, bool) or isinstance(expected, bool):
        return type(actual) is type(expected) and actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isfinite(actual) and math.isfinite(expected) and abs(actual-expected) <= atol+rtol*abs(expected)
    if type(actual) is not type(expected): return False
    if isinstance(actual, list):
        return len(actual) == len(expected) and all(equivalent(a,b,atol,rtol) for a,b in zip(actual,expected))
    if isinstance(actual, dict):
        return actual.keys() == expected.keys() and all(equivalent(actual[k],expected[k],atol,rtol) for k in actual)
    return actual == expected


def graph_primal(data, offsets=None):
    values=[]
    for i,n in enumerate(data['nodes']):
        op=n['op'];args=n.get('args',[])
        if op=='input': x=data['inputs'][n['index']]
        elif op=='const': x=n['value']
        elif op=='add': x=values[args[0]]+values[args[1]]
        elif op=='mul': x=values[args[0]]*values[args[1]]
        elif op=='neg': x=-values[args[0]]
        else: x=math.tanh(values[args[0]])
        values.append(x+(offsets or {}).get(i,0))
    return values


def graph_reverse(data, bug=None):
    values=graph_primal(data);results=[];grad=[0.0]*len(values)
    for query in data['queries']:
        if bug!='carry_queries': grad=[0.0]*len(values)
        for root,seed in zip(query['roots'],query['seeds']):
            grad[root]+=1 if bug=='ignore_seeds' else seed
        def put(parent,contribution):
            if bug=='overwrite_paths': grad[parent]=contribution
            else: grad[parent]+=contribution
        for i in reversed(range(len(values))):
            n=data['nodes'][i];op=n['op'];args=n.get('args',[]);g=grad[i]
            if op=='add':
                put(args[0],g)
                if not (bug=='deduplicate_operands' and args[0]==args[1]):put(args[1],g)
            elif op=='mul':
                put(args[0],g*values[args[1]])
                if not (bug=='deduplicate_operands' and args[0]==args[1]):put(args[1],g*values[args[0]])
            elif op=='neg':put(args[0],-g)
            elif op=='tanh':put(args[0],g*(1-values[i]**2))
        inputs=[0.0]*len(data['inputs'])
        for n,g in zip(data['nodes'],grad):
            if n['op']=='input':
                if bug=='overwrite_input_slots': inputs[n['index']]=g
                else: inputs[n['index']]+=g
        results.append({'nodes':grad[:],'inputs':inputs})
    return {'values':values,'vjp':results}


def training_derivatives(parameters,data,bug=None):
    w,b,c=parameters;total=0.;gradient=[0.,0.,0.];count=sum(len(m['x']) for m in data['microbatches'])
    for batch in data['microbatches']:
        divisor=count if bug!='mean_of_means' else len(data['microbatches'])*len(batch['x'])
        for x,y in zip(batch['x'],batch['y']):
            h=w*x+b;p=h*h+c*h;error=p-y;dh=error*(2*h+c)
            total+=.5*error*error/divisor
            for j,g in enumerate([dh*x,dh,error*h]):gradient[j]+=g/divisor
    regularizer=0 if bug=='omit_regularizer' else data['l2']
    total+=.5*regularizer*sum(p*p for p in parameters)
    gradient=[g+regularizer*p for g,p in zip(gradient,parameters)]
    return total,gradient


def training_analytic(data,bug=None):
    parameters=data['initial'][:];trace=[];previous=[0.,0.,0.]
    for _ in range(data['steps']):
        loss,g=training_derivatives(parameters,data,bug)
        if bug=='stale_gradients':g=[a+b for a,b in zip(g,previous)]
        previous=g[:]
        if bug=='sequential_update':
            for j in range(3):parameters[j]-=data['eta']*training_derivatives(parameters,data)[1][j]
        else:
            direction=-1 if bug=='wrong_sign' else 1
            parameters=[p-direction*data['eta']*v for p,v in zip(parameters,g)]
        trace.append({'loss':loss,'grads':g,'parameters':parameters[:]})
    return {'trace':trace,'final':parameters}


def attention_analytic(data,bug=None):
    q,k,v=data['q'],data['k'],data['v'];nq,nk,d,dv=len(q),len(k),len(q[0]),len(v[0])
    scale=1.0 if bug=='missing_scale' else math.sqrt(d)
    probabilities=[];out=[]
    for i in range(nq):
        positions=[j for j in range(nk) if data['allowed'][i][j] or bug=='ignore_mask']
        scores=[sum(q[i][a]*k[j][a] for a in range(d))/scale for j in positions]
        largest=max(scores);terms=[math.exp(s-largest) for s in scores];den=sum(terms)
        row=[0.]*nk
        for j,x in zip(positions,terms):row[j]=x/den
        probabilities.append(row)
        out.append([sum(row[j]*v[j][a] for j in range(nk)) for a in range(dv)])
    dq=[[0.]*d for _ in q];dk=[[0.]*d for _ in k];dvalue=[[0.]*dv for _ in v]
    for i,row in enumerate(probabilities):
        dp=[sum(data['upstream'][i][a]*v[j][a] for a in range(dv)) for j in range(nk)]
        correction=sum(a*b for a,b in zip(row,dp))
        for j in range(nk):
            ds=row[j]*(dp[j]-correction)
            for a in range(d):
                dq[i][a]+=ds*k[j][a]/scale
                dk[j][a]+=ds*q[i][a]/scale
            for a in range(dv):
                contribution=row[j]*data['upstream'][i][a]
                if bug=='overwrite_dV':dvalue[j][a]=contribution
                else:dvalue[j][a]+=contribution
    if bug=='omit_dK':dk=[[0.]*d for _ in k]
    return {'output':out,'dQ':dq,'dK':dk,'dV':dvalue}


class Reverse:
    """A second, reverse-mode implementation, not the forward-tangent oracle."""
    def __init__(self,value,parents=()):self.value=float(value);self.parents=parents;self.grad=0.
    @staticmethod
    def wrap(x):return x if isinstance(x,Reverse) else Reverse(x)
    def __add__(self,other):
        other=self.wrap(other);return Reverse(self.value+other.value,((self,1.),(other,1.)))
    __radd__=__add__
    def __mul__(self,other):
        other=self.wrap(other);return Reverse(self.value*other.value,((self,other.value),(other,self.value)))
    __rmul__=__mul__
    def __neg__(self):return self*(-1)
    def __sub__(self,other):return self+-self.wrap(other)
    def __rsub__(self,other):return self.wrap(other)+-self
    def __pow__(self,p):return Reverse(self.value**p,((self,p*self.value**(p-1)),))
    def __truediv__(self,other):return self*self.wrap(other)**-1
    def exp(self):
        e=math.exp(self.value);return Reverse(e,((self,e),))
    def log(self):return Reverse(math.log(self.value),((self,1/self.value),))
    def tanh(self):
        t=math.tanh(self.value);return Reverse(t,((self,1-t*t),))
    def backward(self):
        order=[];seen=set()
        def visit(node):
            if node in seen:return
            seen.add(node)
            for parent,_ in node.parents:visit(parent)
            order.append(node)
        visit(self);self.grad=1.
        for node in reversed(order):
            for parent,local in node.parents:parent.grad+=node.grad*local


def decoder_reverse(data,bug=None):
    weights={key:[[Reverse(x) for x in row] for row in data['weights'][key]] for key in KEYS}
    T,D=len(data['tokens']),len(weights['q'])
    def linear(row,matrix):
        return [sum(row[k]*matrix[k][j] for k in range(len(row))) for j in range(len(matrix[0]))]
    def norm(row):
        if bug=='layernorm':
            mean=sum(row)/len(row);row=[x-mean for x in row]
        denominator=(sum(x*x for x in row)/len(row)+data['epsilon'])**.5
        return [x/denominator for x in row]
    inputs=[]
    for i,token in enumerate(data['tokens']):
        row=weights['embedding'][token]
        if bug=='unshared_embedding':row=[Reverse(x.value) for x in row]
        inputs.append([row[j]+weights['position'][i][j] for j in range(D)])
    normal=[norm(row) for row in inputs]
    Q,K,V=[[linear(row,weights[key]) for row in normal] for key in ['q','k','v']]
    logits=[]
    for i in range(T):
        keys=list(range(T if bug=='noncausal' else i+1))
        scores=[sum(Q[i][a]*K[j][a] for a in range(D))/math.sqrt(D) for j in keys]
        m=max(s.value for s in scores);exp_scores=[(s-m).exp() for s in scores];den=sum(exp_scores)
        attention=[sum(p/den*V[j][a] for p,j in zip(exp_scores,keys)) for a in range(D)]
        projected=linear(attention,weights['o'])
        residual=projected if bug=='missing_residual' else [x+y for x,y in zip(inputs[i],projected)]
        hidden=[x.tanh() for x in linear(norm(residual),weights['up'])]
        branch=linear(hidden,weights['down'])
        logits.append(linear([a+b for a,b in zip(residual,branch)],weights['head']))
    loss=Reverse(0.)
    for row,target,valid in zip(logits,data['targets'],data['valid']):
        if valid:
            m=max(x.value for x in row)
            loss+=m+sum((x-m).exp() for x in row).log()-row[target]
    loss=loss/(T if bug=='wrong_loss_denominator' else sum(data['valid']))
    loss.backward()
    gradients={key:[[x.grad for x in row] for row in matrix] for key,matrix in weights.items()}
    direction=-1 if bug=='wrong_update_sign' else 1
    updated={key:[[x.value-direction*data['eta']*x.grad for x in row] for row in matrix] for key,matrix in weights.items()}
    return {'logits':[[x.value for x in row] for row in logits],'loss':loss.value,'grads':gradients,'updated':updated}


def numerical_decimal(data,bug=None):
    D=lambda x:Decimal(str(x))
    reports=[];reasons=[]
    if data['observed_artifact']!=data['required_artifact'] and bug!='ignore_identity':reasons.append('artifact_mismatch')
    if data['observed_configuration']!=data['required_configuration']:reasons.append('configuration_mismatch')
    if data['observed_path']!='candidate' and bug!='ignore_path':reasons.append('candidate_not_executed')
    for name in data['required_channels']:
        found=[r for r in data['channels'] if r['name']==name]
        status='pass';maximum=None;first=None
        if not found:status='missing'
        else:
            r=found[0]
            if r['reference_shape']!=r['candidate_shape'] or len(r['reference'])!=math.prod(r['reference_shape']) or len(r['candidate'])!=math.prod(r['candidate_shape']):status='shape'
            elif any(type(x) is str for x in r['reference']+r['candidate']):status='nonfinite'
            else:
                errors=[]
                for i,(a,b) in enumerate(zip(r['candidate'],r['reference'])):
                    error=abs(D(a)-D(b));errors.append(error)
                    limit=D(data['atol'])+D(data['rtol'])*abs(D(a if bug=='candidate_denominator' else b))
                    fail=(error>=limit if bug=='strict_boundary' else error>limit)
                    if bug=='finite_only':fail=False
                    if fail and first is None:first=i
                maximum=float(max(errors))
                if first is not None:status='tolerance'
        reports.append({'name':name,'status':status,'max_abs_error':maximum,'first_failure':first})
        if status!='pass':reasons.append(name+':'+status)
    return {'passed':not reasons,'reasons':reasons,'channels':reports}


def evidence_intervals(data,bug=None):
    ratios=[]
    for pair in data['trials']:
        rate=[]
        for label in ['reference','candidate']:
            row=pair[label];end=row['submitted'] if bug=='submission_time' else row['completed']
            count=len(row['accepted']) if bug=='count_retries' else len(set(row['accepted']))
            rate.append(Fraction(count)/Fraction(str(end-row['start'])))
        ratios.append(rate[1]/rate[0])
    ordered=sorted(ratios);n=len(ordered)
    middle=(ordered[(n-1)//2]+ordered[n//2])/2
    if bug=='mean_speedups':middle=sum(ratios)/len(ratios)
    lifetimes=[]
    for a in data['allocations']:
        end=a['owner_end'] if bug=='free_owner_early' else max([a['owner_end']]+a['view_ends'])
        lifetimes.append((a['born'],end,a['bytes']))
    points=sorted({t for start,end,_ in lifetimes for t in [start,end]})
    samples=[(a+b)/2 for a,b in zip(points,points[1:])]
    peak=max([sum(size for start,end,size in lifetimes if start<=time<end) for time in samples]+[0])
    if bug=='sum_allocations':peak=sum(a['bytes'] for a in data['allocations'])
    missing=[];escaped=[]
    for name in data['required_faults']:
        results=[row['rejected'] for row in data['fault_trials'] if row['fault']==name]
        if not results:missing.append(name)
        elif (not results[-1] if bug=='last_fault_only' else not all(results)):escaped.append(name)
    reasons=[]
    if not data['qualification']['passed']:reasons.append('numerics_unqualified')
    if data['qualification']['artifact']!=data['candidate_artifact']:reasons.append('artifact_mismatch')
    if missing:reasons.append('faults_missing')
    if escaped:reasons.append('faults_escaped')
    if peak>data['memory_limit']:reasons.append('memory_exceeded')
    if middle<Fraction(str(data['minimum_speedup'])):reasons.append('speedup_below_minimum')
    if data['publication']['cancelled'] and bug!='ignore_cancellation':reasons.append('cancelled')
    if data['publication']['cancelled'] and data['publication']['published']:reasons.append('published_after_cancellation')
    return {'paired_speedups':[float(x) for x in ratios],'median_speedup':float(middle),'peak_bytes':peak,
            'faults_missing':missing,'faults_escaped':escaped,'reasons':reasons,'ready':not reasons}


ORACLES={'graph_vjp':graph_reverse,'shared_training':training_analytic,'attention_vjp':attention_analytic,
         'decoder_step':decoder_reverse,'numerical_audit':numerical_decimal,'evidence_audit':evidence_intervals}
MUTATIONS={
 'graph_vjp':['overwrite_paths','deduplicate_operands','carry_queries','ignore_seeds','overwrite_input_slots'],
 'shared_training':['mean_of_means','omit_regularizer','stale_gradients','sequential_update','wrong_sign'],
 'attention_vjp':['missing_scale','ignore_mask','overwrite_dV','omit_dK'],
 'decoder_step':['noncausal','layernorm','missing_residual','unshared_embedding','wrong_loss_denominator','wrong_update_sign'],
 'numerical_audit':['ignore_identity','ignore_path','candidate_denominator','strict_boundary','finite_only'],
 'evidence_audit':['submission_time','count_retries','mean_speedups','free_owner_early','sum_allocations','last_fault_only','ignore_cancellation'],
}


def finite_difference(fn,x,h=1e-5):return (fn(x+h)-fn(x-h))/(2*h)


def validate_json(value,depth=0,count=None):
    count=[0] if count is None else count;count[0]+=1
    assert depth<=32 and count[0]<=20000
    if value is None or type(value) in [bool,str]:return
    if type(value) in [int,float]:assert math.isfinite(value);return
    assert type(value) in [list,dict]
    if type(value) is dict:
        assert all(type(k) is str and k not in ['__proto__','constructor','prototype'] for k in value)
        children=value.values()
    else:children=value
    for child in children:validate_json(child,depth+1,count)


def practice_input(starter):
    tree=ast.parse(starter)
    for node in ast.walk(tree):
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='practice' for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError('Missing runnable practice input')


def candidate_source():
    """Algorithm-only authored candidate: never fixture generation or expected data."""
    tree=ast.parse((ROOT/'runtime/code-reference.py').read_text())
    functions={'value','exp','log','tanh','variables','graph_values','graph_vjp','shared_loss','shared_training',
               'dot','matrix_product','add_rows','rms','softmax','attention','flatten','reshape','attention_vjp',
               'flatten_weights','rebuild_weights','decoder_forward','decoder_step','numerical_audit','evidence_audit','solve'}
    selected=[]
    for node in tree.body:
        if isinstance(node,ast.ClassDef) and node.name=='Dual':selected.append(node)
        elif isinstance(node,ast.FunctionDef) and node.name in functions:selected.append(node)
        elif isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ['WEIGHT_KEYS','SOLVERS'] for t in node.targets):selected.append(node)
    source='import math\nfrom statistics import median\n'+ast.unparse(ast.Module(body=selected,type_ignores=[]))+'\n'
    assert 'build_registry' not in source and 'GENERATORS' not in source and 'expected' not in source
    assert len(source.encode())<64000
    return source


def broken_candidate(source,task):
    replacements={
      'graph_vjp':("input_grads[node['index']] += grad", "input_grads[node['index']] = grad"),
      'shared_training':('total / count +', "total / len(data['microbatches']) +"),
      'attention_vjp':('scale = math.sqrt(len(q[0]))','scale = 1.0'),
      'decoder_step':('j <= i for j in range(t)','True for j in range(t)'),
      'numerical_audit':("data['observed_artifact'] != data['required_artifact']",'False'),
      'evidence_audit':("max([allocation['owner_end']] + allocation['view_ends'])", "allocation['owner_end']"),
    }
    before,after=replacements[task];assert before in source,(task,before)
    return source.replace(before,after,1)


def sdk_checks(overlay):
    script=r'''
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCourse} from '@course-core/sdk';
import {compileCourse,verifyCompiledCourse} from '@course-core/sdk/compiler';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const overlay=read('content/practicals.json'),config=read('content/course-config.json');
const fragments=['foundations','training-and-transformers','systems-and-distribution','engineering-practice'].map(n=>read('content/'+n+'.json'));
const course={...config};
for(const key of ['objectives','chapters','assessments','gates','sources','visuals','media','extensions'])course[key]=fragments.flatMap(f=>f[key]);
const originalEpisodes=course.chapters.flatMap(c=>c.episodes).length;
course.extensions.push(overlay.extension);course.assessments.push(...overlay.assessments);
for(const b of overlay.bindings){
 const e=course.chapters.flatMap(c=>c.episodes).find(e=>e.id===b.episodeId);assert(e&&e.gateId===b.gateId);
 const gate=course.gates.find(g=>g.id===b.gateId);const a=overlay.assessments.find(a=>a.id===b.assessmentId);
 assert(a.objectiveIds.every(id=>e.objectiveIds.includes(id)));
 e.blocks.push({id:'code-'+a.id,type:'assessment',assessmentId:a.id});gate.assessmentIds.push(a.id);gate.minimumIndependentFamilies=3;
}
assert.equal(originalEpisodes,56);assert.equal(course.chapters.flatMap(c=>c.episodes).length,56);
const v=validateCourse(course);assert(v.valid,JSON.stringify(v.issues));
const compiled=compileCourse(course);assert(verifyCompiledCourse(compiled));
assert(!compiled.learner.extensions.some(e=>e.id===overlay.extension.id));
for(const a of compiled.learner.assessments)assert.deepEqual(Object.keys(a).sort(),['id','objectiveIds','type']);
for(const a of overlay.assessments){
 assert(!JSON.stringify(compiled.learner).includes(a.starterCode));
 assert(!JSON.stringify(compiled.learner).includes(a.grading.fixtureRef));
}
console.log(JSON.stringify({sdk:'@course-core/sdk',valid:true,episodeCount:originalEpisodes,overlayOnlyInMemory:true,serverEvaluatorHidden:true}));
'''
    run=subprocess.run(['node','--input-type=module','-'],input=script,text=True,cwd=ROOT,capture_output=True,check=True)
    return json.loads(run.stdout)


def docker_checks(registry,source,broker):
    # Docker on this host exposes the checkout, not necessarily the OS temp tree.
    storage=tempfile.mkdtemp(prefix='.practical-qualification-', dir=ROOT/'runtime')
    payload={'broker':str(broker),'storage':storage,'entries':[]}
    for fixture in registry['fixtures']:
        task=fixture['cases'][0]['input']['task']
        payload['entries'].append({'id':fixture['id'],'source':source,'broken':broken_candidate(source,task),'cases':fixture['cases']})
    script=r'''
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const p=JSON.parse(fs.readFileSync(0,'utf8'));
const {DockerSandbox,QUALIFIED_IMAGES,validateSubmission,gradeOutput}=await import(pathToFileURL(p.broker).href);
const image=QUALIFIED_IMAGES[os.arch()];assert(image,'Unsupported local architecture');
const runner=new DockerSandbox({image,storageDirectory:p.storage,timeoutMs:5000,memoryMiB:128,maxOutputBytes:65536});const reports=[];
const readiness=await runner.readiness();assert(readiness.ready,JSON.stringify(readiness));
for(const entry of p.entries){
 validateSubmission({source:entry.source,cases:entry.cases});
 const good=await runner.grade({source:entry.source,cases:entry.cases});
 assert.equal(good.status,'graded',JSON.stringify(good));assert(good.passed,JSON.stringify(good));
 const bad=await runner.grade({source:entry.broken,cases:entry.cases});
 assert.equal(bad.status,'graded',JSON.stringify(bad));assert(!bad.passed,'Broken implementation passed');
 reports.push({fixture:entry.id,positive:good.passed,positiveMs:good.durationMs,negativeRejected:!bad.passed,negativeFailedCases:bad.cases.filter(c=>!c.passed).length});
}
const fake=await runner.grade({source:'print(\'{"passed":true}\')\ndef solve(data):\n    return {"passed": True}\n',cases:p.entries[0].cases});
assert.equal(fake.status,'graded');assert(!fake.passed);assert(fake.cases.every(c=>c.reason==='invalid_output_protocol'));
const mountProbe=await runner.grade({source:'import os\ndef solve(data): return sorted(os.listdir("/work"))\n',cases:[{id:'mount_probe',input:null,expected:['runner.py','submission.py']}]});
assert.equal(mountProbe.status,'graded');assert(mountProbe.passed);
console.log(JSON.stringify({image,readiness,reports,fakePassRejected:true,onlyRunnerAndSubmissionMounted:true,limits:{memoryMiB:128,cpu:0.5,timeoutMs:5000,maxOutputBytes:65536,network:'none'}}));
'''
    try:
        run=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(payload,allow_nan=False),text=True,cwd=ROOT,capture_output=True,timeout=240)
        if run.returncode:
            raise RuntimeError('Broker qualification failed; preserve owned storage '+storage+'\n'+run.stderr[-6000:])
        result=json.loads(run.stdout)
        if list(Path(storage).iterdir()):raise RuntimeError('Broker storage not empty after confirmed grades: '+storage)
        shutil.rmtree(storage)
        return result
    except BaseException:
        print('Preserved broker storage for inspection: '+storage,file=sys.stderr)
        raise


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--docker',action='store_true')
    parser.add_argument('--broker',type=Path,default=ROOT.parent/'course-core/packages/sandbox/dist/index.js')
    args=parser.parse_args()
    start=time.monotonic()
    raw=(ROOT/'runtime/code-fixtures.json').read_bytes();registry=json.loads(raw)
    overlay=json.loads((ROOT/'content/practicals.json').read_text())
    assert len(raw)<=1024*1024
    assert set(registry)=={'schemaVersion','id','version','fixtures'}
    assert (registry['schemaVersion'],registry['id'],registry['version'])==(1,'llm-practical-code','0.1.0')
    assert set(overlay)=={'extension','assessments','bindings'}
    assert overlay['extension']['integrity']=='sha256-'+hashlib.sha256(raw).hexdigest()
    assert overlay['extension']['entrypoint']=='runtime/code-fixtures.json'
    assert registry==REF.build_registry(),'Fixture generation changed'
    fixtures={f['id']:f for f in registry['fixtures']};assert len(fixtures)==6
    outcomes=[];mutants=[];oracle_cases=0;fd_checks=0
    for fixture in registry['fixtures']:
        assert set(fixture)=={'id','language','cases'} and fixture['language']=='python'
        cases=fixture['cases'];assert 1<=len(cases)<=100
        assert len({c['id'] for c in cases})==len(cases)
        output=''
        task=cases[0]['input']['task']
        for case in cases:
            assert set(case)=={'id','input','expected','absoluteTolerance','relativeTolerance'}
            assert re.fullmatch('[A-Za-z0-9_-]{1,100}',case['id'])
            validate_json(case['input']);validate_json(case['expected'])
            for name in ['absoluteTolerance','relativeTolerance']:assert 0<=case[name]<=.1
            actual=ORACLES[task](copy.deepcopy(case['input']))
            assert equivalent(actual,case['expected'],case['absoluteTolerance'],case['relativeTolerance']),(fixture['id'],case['id'])
            oracle_cases+=1
            output+=json.dumps({'id':case['id'],'output':actual},allow_nan=False)+'\n'
        assert len(output.encode())<=65536
        for bug in MUTATIONS[task]:
            failed=[]
            for case in cases:
                try:actual=ORACLES[task](copy.deepcopy(case['input']),bug)
                except (ArithmeticError,ValueError):failed.append(case['id']);continue
                if not equivalent(actual,case['expected'],case['absoluteTolerance'],case['relativeTolerance']):failed.append(case['id'])
            assert failed,(task,bug,'survived')
            mutants.append({'task':task,'mutation':bug,'failedCases':len(failed)})
        outcomes.append({'fixture':fixture['id'],'cases':len(cases),'outputBytes':len(output.encode())})
    # Numerical perturbations are an additional oracle, not fixture production.
    for case in registry['fixtures'][0]['cases'][:4]:
        data=case['input'];base=case['expected']
        for qi,query in enumerate(data['queries']):
            for coordinate in range(len(data['inputs'])):
                def scalar(x):
                    changed=copy.deepcopy(data);changed['inputs'][coordinate]=x
                    vals=graph_primal(changed)
                    return sum(vals[r]*s for r,s in zip(query['roots'],query['seeds']))
                derivative=finite_difference(scalar,data['inputs'][coordinate])
                assert equivalent(derivative,base['vjp'][qi]['inputs'][coordinate],1e-6,1e-5);fd_checks+=1
    for case in registry['fixtures'][1]['cases'][:3]:
        data=case['input'];p=data['initial']
        for j in range(3):
            def loss(x):
                q=p[:];q[j]=x;return training_derivatives(q,data)[0]
            assert equivalent(finite_difference(loss,p[j]),case['expected']['trace'][0]['grads'][j],1e-6,1e-5);fd_checks+=1
    for case in registry['fixtures'][2]['cases'][1:4]:
        data=case['input']
        for key,outkey in [('q','dQ'),('k','dK'),('v','dV')]:
            for i,row in enumerate(data[key]):
                for j,x in enumerate(row):
                    def loss(y):
                        changed=copy.deepcopy(data);changed[key][i][j]=y
                        out=attention_analytic(changed)['output']
                        return sum(a*b for r,s in zip(out,data['upstream']) for a,b in zip(r,s))
                    assert equivalent(finite_difference(loss,x),case['expected'][outkey][i][j],1e-6,1e-5);fd_checks+=1
    for case in registry['fixtures'][3]['cases'][1:3]:
        data=case['input']
        for key in KEYS:
            for i,row in enumerate(data['weights'][key]):
                for j,x in enumerate(row):
                    def loss(y):
                        changed=copy.deepcopy(data);changed['weights'][key][i][j]=y
                        return decoder_reverse(changed)['loss']
                    assert equivalent(finite_difference(loss,x),case['expected']['grads'][key][i][j],2e-6,2e-5);fd_checks+=1
    # Verify practice separation, bindings, identifiers and alternatives-per-family.
    families={};assessments={a['id']:a for a in overlay['assessments']}
    assert len(assessments)==6 and len(overlay['bindings'])==6
    for assessment in overlay['assessments']:
        assert assessment['type']=='code' and assessment['language']=='python'
        assert assessment['grading']['evaluatorId']==overlay['extension']['id']
        fixture=fixtures[assessment['grading']['fixtureRef']]
        practice=practice_input(assessment['starterCode'])
        assert practice not in [c['input'] for c in fixture['cases']]
        validate_json(REF.solve(practice))
        assert equivalent(ORACLES[practice['task']](practice),REF.solve(practice),2e-8,2e-7)
        assert 'expected' not in assessment['starterCode'] and 'build_registry' not in assessment['starterCode']
        families.setdefault(assessment['familyId'],[]).append(practice['task'])
    assert len(families)==3 and all(len(set(tasks))==2 for tasks in families.values())
    # Algorithm-only positive/negative programs exercise the same solve protocol.
    source=candidate_source();ns={};exec(compile(source,'authored-candidate','exec'),ns)
    for fixture in registry['fixtures']:
        task=fixture['cases'][0]['input']['task'];bad={}
        exec(compile(broken_candidate(source,task),'authored-mutant','exec'),bad)
        rejected=False
        for case in fixture['cases']:
            assert equivalent(ns['solve'](copy.deepcopy(case['input'])),case['expected'],case['absoluteTolerance'],case['relativeTolerance'])
            rejected |= not equivalent(bad['solve'](copy.deepcopy(case['input'])),case['expected'],case['absoluteTolerance'],case['relativeTolerance'])
        assert rejected,task
    report={'registryBytes':len(raw),'fixtures':outcomes,'independentOracleCases':oracle_cases,
            'finiteDifferenceChecks':fd_checks,'rejectedMutations':mutants,'practicalFamilies':families,
            'practiceInputsDisjoint':True,'algorithmOnlyCandidateBytes':len(source.encode()),'sdk':sdk_checks(overlay)}
    if args.docker:report['docker']=docker_checks(registry,source,args.broker)
    report['elapsedSeconds']=time.monotonic()-start
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
