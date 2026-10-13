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
    summaries=[]
    for required in data['required']:
        matching=[row for row in data['reports'] if row['configuration']==required]
        computed=[numerical_audit(row['evidence']) for row in matching]
        reasons=[]
        if not matching:reasons.append('missing')
        if any(row['evidence']['required_artifact']!=data['artifact'] or row['evidence']['observed_artifact']!=data['artifact'] for row in matching):reasons.append('artifact_mismatch')
        if any(row['evidence']['required_configuration']!=required or row['evidence']['observed_configuration']!=required for row in matching):reasons.append('configuration_mismatch')
        if any(row['evidence']['observed_path']!='candidate' for row in matching):reasons.append('candidate_not_executed')
        if any(any(c['status']!='pass' for c in r['channels']) for r in computed):reasons.append('numerics_failed')
        if any(row['claimed_passed']!=r['passed'] for row,r in zip(matching,computed)):reasons.append('claim_mismatch')
        summaries.append({'configuration':required,'reasons':reasons,'passed':not reasons})
    return {'configurations':summaries,'passed':all(r['passed'] for r in summaries)}


def layer_ranking(data):
    usable=[];rejected=[]
    for row in data['workers']:
        reasons=[]
        if not row['seated']:reasons.append('not_seated')
        if row['run']!=data['run']:reasons.append('different_run')
        if row['layer']!=data['layer']:reasons.append('different_layer')
        age=data['now']-row['last_work']
        if age<0 or age>data['max_age']:reasons.append('stale_or_future')
        qualification=numerical_audit(row['qualification'])
        if not qualification['passed'] or row['qualification']['required_artifact']!=data['artifact']:reasons.append('unqualified')
        if row['claimed_qualified']!=qualification['passed']:reasons.append('claim_mismatch')
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
for _name in ['Dual','value','variables','graph_values','shared_loss','attention','attention_vjp','add_rows','numerical_audit']:
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
    raw=LEGACY.numerical_cases()[0]
    for data in result['qualification_coverage']:
        for row in data['reports']:
            e=copy.deepcopy(raw);e['required_artifact']=data['artifact'];e['observed_artifact']=row['artifact'];e['required_configuration']=row['configuration'];e['observed_configuration']=row['configuration'];e['observed_path']=row['path']
            claimed=row.pop('passed')
            if not claimed:e['channels'][0]['candidate'][0]+=2.
            row['evidence']=e;row['claimed_passed']=claimed;row.pop('artifact');row.pop('path')
    result['qualification_coverage'][2]['reports'][0]['claimed_passed']=True
    result['qualification_coverage'][11]['reports'][0]['claimed_passed']=False
    # Distinguish configuration scope, missing channels and false positive claims.
    good=copy.deepcopy(result['qualification_coverage'][0])
    for change in ['configuration','missing_channel','shape']:
        item=copy.deepcopy(good);e=item['reports'][0]['evidence']
        if change=='configuration':e['observed_configuration']='wrong-scope'
        elif change=='missing_channel':e['channels'].pop()
        else:e['channels'][0]['candidate_shape']=[1,4]
        item['reports'][0]['claimed_passed']=True;result['qualification_coverage'].append(item)
    for data in result['layer_ranking']:
        data['artifact']='candidate-v3'
        for row in data['workers']:
            e=copy.deepcopy(raw);e['required_artifact']=data['artifact'];e['observed_artifact']=data['artifact'];e['required_configuration']=f"{row['run']}/layer-{row['layer']}";e['observed_configuration']=e['required_configuration']
            claimed=row.pop('qualified')
            if not claimed:e['channels'][0]['candidate'][0]+=2.
            row['qualification']=e;row['claimed_qualified']=claimed
    result['layer_ranking'][6]['workers'][2]['claimed_qualified']=True
    ranking=copy.deepcopy(result['layer_ranking'][0]);ranking['workers'][0]['qualification']['observed_artifact']='old-artifact';result['layer_ranking'].append(ranking)
    for index,task in enumerate(TASKS):
        group=GROUPS[index//2]
        for ordinal,data in enumerate(result[task]):data['canonical_trials']=canonical_pair(group,ordinal,True)
    return result


GROUPS=['autodiff','decoder','qualification']
PAIR_TASKS={'autodiff':['graph_vjp','shared_training'],'decoder':['attention_vjp','decoder_step'],'qualification':['numerical_audit','evidence_audit']}
GENERATOR_BY_TASK=dict(zip([task for _,task in LEGACY.FIXTURES],LEGACY.GENERATORS))


def canonical_pair(group,ordinal,fresh=False):
    pair=[]
    for task in PAIR_TASKS[group]:
        inputs=GENERATOR_BY_TASK[task]();data=copy.deepcopy(inputs[ordinal%len(inputs)])
        if fresh:
            delta=0.003*(ordinal+1)
            if task=='graph_vjp':data['inputs'][0]+=delta
            elif task=='shared_training':data['initial'][0]+=delta
            elif task=='attention_vjp':data['q'][0][0]+=delta
            elif task=='decoder_step':data['weights']['embedding'][0][0]+=delta
            elif task=='numerical_audit':
                data['required_artifact']+='-transfer'
                if data['observed_artifact']=='a-v7':data['observed_artifact']=data['required_artifact']
            else:
                data['candidate_artifact']+='-transfer'
                if data['qualification']['artifact']=='kernel-v4':data['qualification']['artifact']=data['candidate_artifact']
        pair.append(data)
    return pair


def solve_qualified(data):
    answer={'canonical':[LEGACY.solve(item) for item in data['canonical_trials']]}
    if data['task'] in SOLVERS:answer['transfer']=SOLVERS[data['task']](data)
    return answer


def registry():
    fixtures=[]
    for group in GROUPS:
        inputs=[{'task':'canonical_suite_'+group,'canonical_trials':canonical_pair(group,i)} for i in range(max(len(GENERATOR_BY_TASK[t]()) for t in PAIR_TASKS[group]))]
        fixtures.append({'id':'llm-suite-'+group+'-v1','language':'python','cases':[make_case(data,i) for i,data in enumerate(inputs)]})
    for task,inputs in cases().items():fixtures.append({'id':'llm-recovery-'+task.replace('_','-')+'-v1','language':'python','cases':[make_case(data,i) for i,data in enumerate(inputs)]})
    return {'schemaVersion':1,'id':'offline-qualified-practical-collection','version':'0.1.0','fixtures':fixtures}


def make_case(data,index):
    qualification=data['task'].endswith('qualification') or data['task'] in TASKS[-2:]
    return {'id':f'qualified_{index:03d}','input':data,'expected':solve_qualified(data),'absoluteTolerance':1e-10 if qualification else 2e-8,'relativeTolerance':1e-10 if qualification else 2e-7}


def candidate_source():
    spec=importlib.util.spec_from_file_location('practical_verification',ROOT/'verification/practicals.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
    legacy=p.candidate_source().replace('def solve(data):','def legacy_solve(data):',1)
    tree=ast.parse(Path(__file__).read_text());selected=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in TASKS]
    added=ast.unparse(ast.Module(body=selected,type_ignores=[]))
    source=legacy+'\n'+added+'\nRECOVERY_SOLVERS={'+','.join(repr(name)+':'+name for name in TASKS)+'}\ndef solve(data):\n    if \"canonical_trials\" not in data: return legacy_solve(data)\n    result={\"canonical\":[legacy_solve(item) for item in data[\"canonical_trials\"]]}\n    if data[\"task\"] in RECOVERY_SOLVERS: result[\"transfer\"]=RECOVERY_SOLVERS[data[\"task\"]](data)\n    return result\n'
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
    old=json.loads((ROOT/'content/practicals.json').read_text());collection=registry();inputs=cases()
    extensions=[];registry_records=[];baseline=[];basebindings=[];assessments=[];bindings=[]
    common='Implement standard-library Python solve(data). Return the specified JSON value rather than printing it. Each call is independent; numeric outputs must be finite. Object-key order is irrelevant; array order, shape and discrete types matter. No network, third-party package or file access is available. A whole attempt has128MiB,0.5CPU,5seconds and64KiB combined output. The separate starter practice input has no supplied answer.'
    coverage='Input contains canonical_trials, exactly two problem records in the stated order. Return canonical, an array containing the COMPLETE result of each original task. Neither task is optional. A recovery input additionally contains the transfer fields; return its complete result under transfer. Correct transfer-only output cannot pass.'
    new_protocols={
      'qualification_coverage':'Each report has configuration, evidence and claimed_passed. evidence is the full numerical_audit record specified below. For every required configuration compute EVERY matching report from its raw channels. Reasons, in order: missing; artifact_mismatch if any required/observed artifact differs from artifact; configuration_mismatch if any required/observed configuration differs from the required scope; candidate_not_executed if any observed_path differs from candidate; numerics_failed if any computed channel status fails; claim_mismatch if any claimed_passed differs from its computed full passed result. Preserve every failure across retries, ignore outside scopes, keep required order. Return configurations with configuration,reasons,passed and overall passed. Do not trust a supplied pass flag.',
      'layer_ranking':'Each worker has qualification (a complete raw numerical_audit record) and claimed_qualified. Compute qualification from its channels and identity/path checks; reject unqualified when the computed result fails or its required_artifact differs from the top-level artifact. Reject claim_mismatch when claimed_qualified differs from the computed passed result. These two reasons follow stale_or_future, in that order. Qualification data follows the canonical numerical_audit protocol below.'}
    for group_index,group in enumerate(GROUPS):
        fixtures=[collection['fixtures'][group_index]]+[f for f in collection['fixtures'][3:] if f['cases'][0]['input']['task'] in TASKS[2*group_index:2*group_index+2]]
        payload={'schemaVersion':1,'id':'llm-practical-'+group+'-qualified','version':'0.1.0','fixtures':fixtures}
        raw=(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode();assert len(raw)<=1024*1024,(group,'registry envelope',len(raw))
        filename='runtime/code-fixtures-'+group+'-qualified.json';p=ROOT/filename;p.write_bytes(raw);p.chmod(0o600)
        extension=copy.deepcopy(old['extension']);extension.update(id=payload['id'],entrypoint=filename,integrity='sha256-'+hashlib.sha256(raw).hexdigest());extensions.append(extension)
        registry_records.append({'file':filename,'id':payload['id'],'version':payload['version'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
        pair=old['assessments'][2*group_index:2*group_index+2]
        specs=[]
        for original,task in zip(pair,PAIR_TASKS[group]):
            text=original['prompt'].split('\n\n\n',1)[-1];specs.append('Canonical task '+task+'\n'+text)
        base=pair[0];binding=next(b for b in old['bindings'] if b['assessmentId']==base['id']);canonical_id='llm-suite-'+group
        suite={'task':'canonical_suite_'+group,'canonical_trials':canonical_pair(group,91,True)}
        def starter(practice):
            return 'import json\n\ndef solve(data):\n    # Implement both canonical tasks and any requested transfer.\n    pass\n\nif __name__ == "__main__":\n    practice = json.loads('+repr(json.dumps(practice,separators=(',',':')))+')\n    print(solve(practice))\n'
        prompt=common+'\n\n'+coverage+'\n\n'+'\n\n'.join(specs)+'\n\nFloating tolerances:2e-8 absolute plus2e-7 relative for differentiation/training;1e-10 for numerical/evidence audit ratios. Discrete fields must match exactly.'
        baseline.append({'id':canonical_id,'type':'code','objectiveIds':base['objectiveIds'],'familyId':base['familyId'],'language':'python','starterCode':starter(suite),'prompt':'Full practical suite: '+group+'\n\n'+prompt,'grading':{'evaluatorId':extension['id'],'fixtureRef':'llm-suite-'+group+'-v1'}})
        basebindings.append({'episodeId':binding['episodeId'],'gateId':binding['gateId'],'assessmentId':canonical_id})
        for task in TASKS[2*group_index:2*group_index+2]:
            practice=copy.deepcopy(inputs[task][0]);practice['canonical_trials']=canonical_pair(group,91,True)
            assert practice not in inputs[task]
            transfer=PROTOCOLS[task]
            if task=='qualification_coverage':transfer='Input has task=qualification_coverage, artifact, required (ordered unique complete configuration names), reports (at most8 records), and canonical_trials. '+new_protocols[task]
            if task=='layer_ranking':transfer='Input has task=layer_ranking, artifact, run, layer, now, max_age, workers, and canonical_trials. Each worker has a unique id, seated flag, run, layer, last_work, qualification, claimed_qualified and1-5 trials. Trial start<completed; accepted contains work-ID strings. Reject every applicable reason in order: not_seated, different_run, different_layer, stale_or_future (age<0 or>max_age), unqualified, claim_mismatch. '+new_protocols[task]+' For eligible workers rate is the median of UNIQUE accepted-ID count divided by completed-start per trial. Sort descending rate, then ascending ID. Return ranked with id,rate,ratio_to_median; rejected with id,reasons in input order; and median_rate. An empty eligible set has null median; a zero median has null ratios. Medians of even lists average their central values. Equality at freshness boundaries is allowed.'
            assessment={'id':'llm-recovery-'+task.replace('_','-'),'type':'code','objectiveIds':base['objectiveIds'],'familyId':base['familyId'],'language':'python','starterCode':starter(practice),'prompt':'Full-coverage recovery: '+task.replace('_',' ')+'\n\n'+prompt+'\n\nTransfer component (return under transfer):\n'+transfer,'grading':{'evaluatorId':extension['id'],'fixtureRef':'llm-recovery-'+task.replace('_','-')+'-v1'}}
            assert len(json.dumps(assessment).encode())<45000,(task,'assessment envelope')
            assessments.append(assessment);bindings.append({'episodeId':binding['episodeId'],'canonicalAssessmentId':canonical_id,'assessmentId':assessment['id'],'plannedMinutes':45,'additionalEpisodes':1})
    source={'id':'practical-recovery-reviewed','title':'Full-coverage practical contracts; runtime qualification required','url':'urn:private:practical-recovery-v2','reviewedAt':'2026-10-13T03:00:00Z'}
    overlay={'schemaVersion':1,'source':source,'assessments':assessments,'bindings':bindings,'qualification':{'reference':'independent_canonical_and_transfer_computations','registryAuthorization':'not_granted','requiresAllCanonicalTasks':True}}
    records=[('content/practicals-qualified.json',{'schemaVersion':1,'extensions':extensions,'assessments':baseline,'bindings':basebindings}),('runtime/practical-registries.json',{'schemaVersion':1,'registries':registry_records}),('content/practical-recovery.json',overlay)]
    for filename,data in records:
        p=ROOT/filename;p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n');p.chmod(0o600)
    return {'registryBytes':{r['id']:r['bytes'] for r in registry_records},'canonicalSuites':3,'canonicalCases':sum(len(f['cases']) for f in collection['fixtures'][:3]),'freshCases':sum(map(len,inputs.values())),'newCanonicalFamilies':0,'plannedMinutesPerTransferCheck':45,'registryAuthorization':'not_granted'}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
    if args.write:print(json.dumps(write_authoring()))
    else:print(json.dumps({'freshCases':sum(map(len,cases().values())),'publicationAuthority':'not_granted'}))
