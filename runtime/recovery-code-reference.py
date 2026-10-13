"""Private offline authoring only. This file is not installed as executable course code."""
import argparse
import ast
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import sys
from statistics import median

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
_spec=importlib.util.spec_from_file_location('legacy_practical_reference',ROOT/'runtime/code-reference.py')
LEGACY=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(LEGACY)


def graph_jvp(data):
    values=[]
    for direction in data['directions']:
        differentiable={**data,'inputs':[Dual(v,[t]) for v,t in zip(data['inputs'],direction)]}
        row=graph_values(differentiable)
        values.append([v.derivative[0] if isinstance(v,Dual) else 0. for v in row])
    return {'values':[value(v) for v in graph_values(data)],'tangents':values}


def momentum_training(data):
    parameters=data['initial'][:];velocity=data['velocity'][:];trace=[]
    for _ in range(data['steps']):
        loss=shared_loss(variables(parameters),data);gradient=loss.derivative
        velocity=[data['beta']*v+g for v,g in zip(velocity,gradient)]
        parameters=[p-data['eta']*v for p,v in zip(parameters,velocity)]
        trace.append({'loss':loss.value,'grads':gradient[:],'velocity':velocity[:],'parameters':parameters[:]})
    return {'trace':trace,'final':parameters,'velocity':velocity}


def attention_jvp(data):
    arrays=[]
    for key in ['q','k','v']:
        arrays.append([[Dual(x,[d]) for x,d in zip(row,drow)] for row,drow in zip(data[key],data['direction'][key])])
    result=attention(*arrays,data['allowed'])
    return {'output':[[x.value for x in row] for row in result],'tangent':[[x.derivative[0] for x in row] for row in result]}


def shared_attention(data):
    result=[];dk=[[0.]*len(data['k'][0]) for _ in data['k']];dv=[[0.]*len(data['v'][0]) for _ in data['v']]
    for query in data['queries']:
        row=attention_vjp({**query,'k':data['k'],'v':data['v']})
        result.append({'output':row['output'],'dQ':row['dQ']})
        dk=add_rows(dk,row['dK']);dv=add_rows(dv,row['dV'])
    return {'queries':result,'dK':dk,'dV':dv}


def qualification_coverage(data):
    reports=[];all_passed=True
    for required in data['required']:
        matching=[row for row in data['reports'] if row['configuration']==required]
        # Every observed failure survives; a later successful retry cannot erase it.
        flags=[]
        if not matching:flags.append('missing')
        if any(row['artifact']!=data['artifact'] for row in matching):flags.append('artifact_mismatch')
        if any(row['path']!='candidate' for row in matching):flags.append('candidate_not_executed')
        if any(not row['passed'] for row in matching):flags.append('numerics_failed')
        reports.append({'configuration':required,'reasons':flags,'passed':not flags});all_passed=all_passed and not flags
    return {'configurations':reports,'passed':bool(all_passed)}


def layer_ranking(data):
    usable=[];rejected=[]
    for row in data['workers']:
        reasons=[]
        if not row['seated']:reasons.append('not_seated')
        if row['run']!=data['run']:reasons.append('different_run')
        if row['layer']!=data['layer']:reasons.append('different_layer')
        age=data['now']-row['last_work']
        if age<0 or age>data['max_age']:reasons.append('stale_or_future')
        if not row['qualified']:reasons.append('unqualified')
        if reasons:rejected.append({'id':row['id'],'reasons':reasons});continue
        speed=median([len(set(t['accepted']))/(t['completed']-t['start']) for t in row['trials']])
        usable.append({'id':row['id'],'rate':speed})
    usable.sort(key=lambda row:(-row['rate'],row['id']))
    peer_median=median([r['rate'] for r in usable]) if usable else None
    return {'ranked':[{**r,'ratio_to_median':r['rate']/peer_median if peer_median else None} for r in usable],'rejected':rejected,'median_rate':peer_median}


TASKS=['graph_jvp','momentum_training','attention_jvp','shared_attention','qualification_coverage','layer_ranking']
SOLVERS={name:globals()[name] for name in TASKS}
# Functions above deliberately share only the qualified legacy primitives. Tests
# use reverse/analytic references and additional numerical perturbations.
for _name in ['Dual','value','variables','graph_values','shared_loss','attention','attention_vjp','add_rows']:
    globals()[_name]=getattr(LEGACY,_name)


def cases():
    rng=random.Random(1300717);result={name:[] for name in TASKS}
    for data in LEGACY.graph_cases()[:12]:
        data=copy.deepcopy(data);data.pop('queries');data['task']='graph_jvp';data['inputs']=[x+0.013 for x in data['inputs']]
        data['directions']=[[rng.uniform(-1,1) for _ in data['inputs']],[0.]*len(data['inputs']),[1.,-0.5,0.25]]
        result['graph_jvp'].append(data)
    for i,data in enumerate(LEGACY.training_cases()):
        data=copy.deepcopy(data);data['task']='momentum_training';data['velocity']=[rng.uniform(-0.2,0.2) for _ in range(3)];data['beta']=[0.,0.5,0.9][i%3];data['steps']=3;data['eta']=0. if i==0 else data['eta']
        result['momentum_training'].append(data)
    base_attention=LEGACY.attention_cases()[1:13]
    for data in base_attention:
        data=copy.deepcopy(data);data.pop('upstream');data['task']='attention_jvp'
        data['direction']={k:[[rng.uniform(-0.8,0.8) for _ in row] for row in data[k]] for k in ['q','k','v']}
        result['attention_jvp'].append(data)
    for data in base_attention:
        first={k:copy.deepcopy(data[k]) for k in ['q','allowed','upstream']}
        second=copy.deepcopy(first);second['q']=second['q'][:1];second['allowed']=second['allowed'][:1];second['upstream']=[[-v*0.3 for v in first['upstream'][0]]]
        result['shared_attention'].append({'task':'shared_attention','k':copy.deepcopy(data['k']),'v':copy.deepcopy(data['v']),'queries':[first,second]})
    required=['chip-a/layer-1/f32/b4','chip-a/layer-2/f32/b4','chip-b/layer-1/f32/b2']
    baseline={'task':'qualification_coverage','artifact':'candidate-v3','required':required,'reports':[{'configuration':c,'artifact':'candidate-v3','path':'candidate','passed':True} for c in required]}
    result['qualification_coverage']=[copy.deepcopy(baseline) for _ in range(12)]
    q=result['qualification_coverage'];q[1]['reports'].pop();q[2]['reports'][0]['passed']=False;q[3]['reports'][1]['artifact']='old';q[4]['reports'][1]['path']='fallback';q[5]['reports'].append({**q[5]['reports'][0],'passed':False});q[6]['reports'][0]['passed']=False;q[6]['reports'].append(copy.deepcopy(baseline['reports'][0]));q[7]['reports'].reverse();q[8]['reports'].append({'configuration':'outside-scope','artifact':'old','path':'fallback','passed':False});q[9]['reports']=[];q[10]['reports'][0]['artifact']='old';q[10]['reports'][0]['path']='fallback';q[10]['reports'][0]['passed']=False;q[11]['reports'].append(copy.deepcopy(baseline['reports'][0]))
    def worker(name,rate):return {'id':name,'seated':True,'run':'run-a','layer':2,'last_work':90,'qualified':True,'trials':[{'start':0,'completed':2/rate,'accepted':['a','b','b']},{'start':4,'completed':4+2/rate,'accepted':['c','d','c']},{'start':10,'completed':10+2/rate,'accepted':['e','f','e']}]}
    base={'task':'layer_ranking','run':'run-a','layer':2,'now':100,'max_age':10,'workers':[worker('a',2.),worker('b',4.),worker('c',8.)]}
    result['layer_ranking']=[copy.deepcopy(base) for _ in range(12)]
    x=result['layer_ranking'];x[1]['workers'][0]['seated']=False;x[2]['workers'][1]['run']='run-b';x[3]['workers'][2]['layer']=1;x[4]['workers'][0]['last_work']=89;x[5]['workers'][1]['last_work']=101;x[6]['workers'][2]['qualified']=False;x[7]['workers']=[];x[8]['workers']=[worker('z',4.),worker('a',4.)];x[9]['workers'][0]['trials'][0]['accepted']=[];x[9]['workers'][0]['trials'][1]['completed']=6;x[9]['workers'][0]['trials'][2]['completed']=10.25;x[10]['workers'][1]['seated']=False;x[10]['workers'][1]['run']='run-b';x[10]['workers'][1]['layer']=1;x[10]['workers'][1]['last_work']=0;x[10]['workers'][1]['qualified']=False;x[11]['workers'][0]['last_work']=100
    zero=copy.deepcopy(base)
    for w in zero['workers']:
        for trial in w['trials']:trial['accepted']=[]
    even=copy.deepcopy(base);even['workers'][0]['trials']=even['workers'][0]['trials'][:2];even['workers'][0]['trials'][1]['completed']=6
    result['layer_ranking'].extend([zero,even])
    return result


def registry():
    original=LEGACY.build_registry();original['id']='llm-practical-code-recovery';original['version']='0.1.0'
    for task,inputs in cases().items():
        original['fixtures'].append({'id':'llm-recovery-'+task.replace('_','-')+'-v1','language':'python','cases':[{'id':f'recovery_{i:03d}','input':data,'expected':SOLVERS[task](data),'absoluteTolerance':2e-8 if task not in TASKS[-2:] else 1e-10,'relativeTolerance':2e-7 if task not in TASKS[-2:] else 1e-10} for i,data in enumerate(inputs)]})
    return original


def candidate_source():
    spec=importlib.util.spec_from_file_location('practical_verification',ROOT/'verification/practicals.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
    legacy=p.candidate_source().replace('def solve(data):','def legacy_solve(data):',1)
    tree=ast.parse(Path(__file__).read_text());selected=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in TASKS]
    added=ast.unparse(ast.Module(body=selected,type_ignores=[]))
    source=legacy+'\n'+added+'\nRECOVERY_SOLVERS={'+','.join(repr(name)+':'+name for name in TASKS)+'}\ndef solve(data):\n    return RECOVERY_SOLVERS[data["task"]](data) if data["task"] in RECOVERY_SOLVERS else legacy_solve(data)\n'
    assert len(source.encode())<64000 and 'build_registry' not in source and 'expected' not in source
    return source


PROTOCOLS={
 'graph_jvp':'''Input is {task:"graph_jvp", inputs:[I numbers], nodes:[N scalar records], directions:[D input-direction vectors]}. I=3, N<=24, D<=3. Node position is its identity; references are strictly earlier positions. Supported nodes: input/index, const/value, add/args[a,b], mul/args[a,b], neg/args[a], tanh/args[a]. Repeated operand slots and input indices, disconnected nodes and constant outputs are allowed. Return {values:[N primal values], tangents:[[N directional derivatives] per direction]}. Differentiate with respect to the underlying inputs, not independent node perturbations. For each direction v, tangents is J(inputs)*v for all node outputs. Constants have zero tangents; every read of the same input slot receives that slot's direction. Directions may be zero or negative. Start each request and each direction independently.''',
 'momentum_training':'''Input is {task:"momentum_training",initial:[w,b,c],velocity:[vw,vb,vc],beta:number,microbatches:[{x:[...],y:[...]}],eta:number,steps:integer,l2:number}. There are <=8 scalar examples across <=3 nonempty microbatches, with unequal sizes allowed. Steps<=3, 0<=beta<1, eta and l2 are nonnegative. For every example h=w*x+b and prediction=h*h+c*h. At each old parameter vector compute loss=sum(0.5*(prediction-y)^2)/TOTAL examples +0.5*l2*(w*w+b*b+c*c). Compute all gradients there. Then set velocity=beta*old_velocity+gradient, and parameters=old_parameters-eta*NEW_velocity, simultaneously. Recompute from fresh forward values at the next step. Do not divide gradients by the microbatch count, reset velocity, fold eta into velocity, use Nesterov, or update between microbatches. Return {trace:[{loss,grads:[dw,db,dc],velocity:[...],parameters:[...]}],final:[...],velocity:[...]}. Supplied initial velocity is real optimizer state. This is the stated recurrence; it does not imply framework-default buffer initialization.''',
 'attention_jvp':'''Input is {task:"attention_jvp",q:[Nq x d],k:[Nk x d],v:[Nk x dv],allowed:[Nq x Nk booleans],direction:{q:matching matrix,k:matching matrix,v:matching matrix}}. All matrices are nonempty, rectangular, dimensions<=5, and each mask row permits at least one key. For each query compute scores=q dot k / sqrt(d), a stable softmax over permitted keys ONLY, then the weighted sum of v. Return {output:[Nq x dv],tangent:[Nq x dv]}. Tangent is d/dt attention(q+t*direction.q,k+t*direction.k,v+t*direction.v) at t=0 with the mask fixed. The score normalization, softmax derivative and value-direction term all contribute. Forbidden keys have exactly zero contribution. No parameter update occurs. Use the original array shapes, not flattened output.''',
 'shared_attention':'''Input is {task:"shared_attention",k:[Nk x d],v:[Nk x dv],queries:[{q:[Nq x d],allowed:[Nq x Nk booleans],upstream:[Nq x dv]}]}. There are 1-3 query groups, with different query counts allowed. Every nonempty rectangular dimension<=5; each mask row permits at least one key. Each group applies stable masked scaled-dot-product attention using the same physical K and V matrices. Its scalar objective is sum(output*upstream). The complete objective is the SUM of the group objectives, with no averaging. Return {queries:[{output,dQ} in input order],dK:shared key gradient,dV:shared value gradient}. Each dQ belongs only to its group, while dK and dV sum ALL group contributions. Reset all accumulators for each solve call. Negative and zero upstream values are valid; never overwrite shared gradients with the last group.''',
 'qualification_coverage':'''Input is {task:"qualification_coverage",artifact:string,required:[ordered unique configuration strings],reports:[{configuration:string,artifact:string,path:string,passed:boolean}]}. Each configuration names the complete chip/layer/dtype/batch contract. Return {configurations:[{configuration,reasons:[...],passed:boolean} for each REQUIRED configuration in order],passed:boolean}. For each required configuration consider ALL exact-matching reports. Append reasons in this order: missing when there are none; artifact_mismatch when ANY artifact differs from the requested one; candidate_not_executed when ANY path is not "candidate"; numerics_failed when ANY passed flag is false. A later passing duplicate cannot erase a prior failure. Ignore reports for configurations outside the required list. Per-configuration passed means no reasons; overall passed requires every required configuration. This audits synthetic supplied evidence; it does not authorize a rollout or prove untested configurations.''',
 'layer_ranking':'''Input is {task:"layer_ranking",run:string,layer:integer,now:number,max_age:nonnegative number,workers:[...]}. Worker IDs are unique strings. Each worker has id,seated:boolean,run,layer,last_work:number,qualified:boolean,trials:[{start,completed,accepted:[work-ID strings]}]. Trial durations are positive, there are 1-5 trials per worker. Evaluate each worker independently. Reject it with every applicable reason in this fixed order: not_seated, different_run, different_layer, stale_or_future (now-last_work<0 or >max_age), unqualified. Boundaries 0 and max_age are fresh. Rejected workers retain input order. For eligible workers, rate is the median of per-trial UNIQUE accepted-ID count divided by completed-start. Retry IDs count once per trial; medians use the mean of two central values at even length. Rank by descending rate, then ascending ID on ties. Return {ranked:[{id,rate,ratio_to_median}],rejected:[{id,reasons}],median_rate}. Median_rate uses eligible worker rates only; it is null when none are eligible. Ratio is rate/median_rate when that median is positive, otherwise null. Do not compare workers from other layers or runs, count submission-only rates, pool durations, or use stale presence as evidence of work.''',
}


def write_authoring():
    payload=registry();raw=(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode();assert len(raw)<1024*1024
    (ROOT/'runtime/code-fixtures-recovery.json').write_bytes(raw);(ROOT/'runtime/code-fixtures-recovery.json').chmod(0o600)
    old=json.loads((ROOT/'content/practicals.json').read_text());extension=copy.deepcopy(old['extension']);extension['id']=payload['id'];extension['entrypoint']='runtime/code-fixtures-recovery.json';extension['integrity']='sha256-'+hashlib.sha256(raw).hexdigest()
    runtime={'schemaVersion':1,'replaces':old['extension'],'extension':extension}
    assessments=[];bindings=[];inputs=cases()
    canonical=[old['assessments'][0],old['assessments'][2],old['assessments'][4]]
    for i,task in enumerate(TASKS):
        base=canonical[i//2];binding=next(b for b in old['bindings'] if b['assessmentId']==base['id']);practice=copy.deepcopy(inputs[task][0])
        # This practice input is distinct from every graded case and has no key.
        if task=='graph_jvp':practice['inputs'][0]+=0.071
        elif task=='momentum_training':practice['initial'][0]+=0.071
        elif task=='attention_jvp':practice['q'][0][0]+=0.071
        elif task=='shared_attention':practice['k'][0][0]+=0.071
        elif task=='qualification_coverage':practice['artifact']='practice-v1'
        else:practice['run']='practice-run'
        assert practice not in inputs[task]
        starter='import json\n\ndef solve(data):\n    # Implement the specified contract.\n    pass\n\nif __name__ == "__main__":\n    practice = json.loads('+repr(json.dumps(practice,separators=(',',':')))+')\n    print(solve(practice))\n'
        assessment={'id':'llm-recovery-'+task.replace('_','-'),'type':'code','objectiveIds':base['objectiveIds'],'familyId':base['familyId'],'language':'python','starterCode':starter,'prompt':'Recovery transfer check: '+task.replace('_',' ')+'\n\nImplement standard-library Python solve(data), returning the stated JSON value rather than printing it. Each call is independent; all returned numeric values must be finite. Object-key order is irrelevant, array order and shape are significant. There is no network, third-party package or file access. A whole attempt has 128 MiB, 0.5 CPU, 5 seconds and 64 KiB of combined output. The starter practice input is separate from graded cases and intentionally has no supplied answer.\n\n'+PROTOCOLS[task]+'\n\nFloating values are checked with 2e-8 absolute plus 2e-7 relative tolerance; discrete statuses/indices/reasons/booleans must match exactly. Qualification and ranking ratios use 1e-10 absolute and relative tolerance.','grading':{'evaluatorId':extension['id'],'fixtureRef':'llm-recovery-'+task.replace('_','-')+'-v1'}}
        assessments.append(assessment);bindings.append({'episodeId':binding['episodeId'],'canonicalAssessmentId':base['id'],'assessmentId':assessment['id'],'plannedMinutes':30,'additionalEpisodes':1})
    source={'id':'practical-recovery-reviewed','title':'Independently checked practical transfer contracts','url':'urn:private:practical-recovery-v1','reviewedAt':'2026-10-13T01:56:52Z'}
    overlay={'schemaVersion':1,'source':source,'assessments':assessments,'bindings':bindings,'qualification':{'reference':'private_cpu_reference_with_separate_oracles_and_finite_differences','registryAuthorization':'not_granted'}}
    for file,data in [('content/practical-runtime.json',runtime),('content/practical-recovery.json',overlay)]:
        p=ROOT/file;p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n');p.chmod(0o600)
    return {'fixtureBytes':len(raw),'freshFixtures':6,'freshCases':sum(map(len,inputs.values())),'newCanonicalFamilies':0,'plannedMinutesPerTransferCheck':30,'registryAuthorization':'not_granted'}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
    if args.write:print(json.dumps(write_authoring()))
    else:print(json.dumps({'freshCases':sum(map(len,cases().values())),'publicationAuthority':'not_granted'}))
