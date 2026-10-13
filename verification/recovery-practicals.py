"""Separate oracles and regression controls for private practical recovery."""
import argparse
import copy
from fractions import Fraction
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]

def load(name,file):
    s=importlib.util.spec_from_file_location(name,ROOT/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
R=load('recovery_author','runtime/recovery-code-reference.py')
P=load('practical_independent_oracles','verification/practicals.py')


def graph_reverse_direction(data,bug=None):
    queries=[{'roots':[i],'seeds':[1.]} for i in range(len(data['nodes']))]
    if bug=='repeated_path':reverse=P.graph_reverse({**data,'queries':queries},'overwrite_input_slots')
    else:reverse=P.graph_reverse({**data,'queries':queries})
    out=[]
    for d in data['directions']:
        out.append([sum(a*b for a,b in zip(q['inputs'],d)) for q in reverse['vjp']])
    if bug=='forget_direction':out=[[0.]*len(data['nodes']) for _ in out]
    return {'values':reverse['values'],'tangents':out}


def momentum_analytic(data,bug=None):
    parameters=data['initial'][:];velocity=data['velocity'][:];trace=[]
    for _ in range(data['steps']):
        loss,grads=P.training_derivatives(parameters,data,'mean_of_means' if bug=='batch_means' else None)
        if bug=='reset_velocity':velocity=[0.,0.,0.]
        velocity=[data['beta']*v+g for v,g in zip(velocity,grads)]
        if bug=='fold_eta_into_buffer':velocity=[data['eta']*v for v in velocity]
        use=grads if bug=='plain_sgd' else velocity
        parameters=[p-data['eta']*v for p,v in zip(parameters,use)]
        trace.append({'loss':loss,'grads':grads,'velocity':velocity[:],'parameters':parameters[:]})
    return {'trace':trace,'final':parameters,'velocity':velocity}


def attention_reverse_direction(data,bug=None):
    zero=[[0.]*len(data['v'][0]) for _ in data['q']];tangent=copy.deepcopy(zero);output=None
    for i,row in enumerate(zero):
        for j in range(len(row)):
            seed=copy.deepcopy(zero);seed[i][j]=1.
            result=P.attention_analytic({**data,'upstream':seed},bug if bug in ['missing_scale','ignore_mask'] else None);output=result['output']
            tangent[i][j]=sum(x*d for key,grad in [('q','dQ'),('k','dK'),('v','dV')] if not (bug=='omit_value_direction' and key=='v') for ar,dr in zip(result[grad],data['direction'][key]) for x,d in zip(ar,dr))
    return {'output':output,'tangent':tangent}


def shared_attention_analytic(data,bug=None):
    parts=[P.attention_analytic({**q,'k':data['k'],'v':data['v']}) for q in data['queries']]
    def collect(key):
        chosen=parts[-1:] if bug=='last_group' else parts
        result=[[sum(r[key][i][j] for r in chosen) for j in range(len(parts[0][key][0]))] for i in range(len(parts[0][key]))]
        if bug=='mean_groups':result=[[x/len(parts) for x in row] for row in result]
        if bug=='omit_key' and key=='dK':result=[[0.]*len(row) for row in result]
        return result
    return {'queries':[{'output':r['output'],'dQ':r['dQ']} for r in parts],'dK':collect('dK'),'dV':collect('dV')}


def coverage_stream(data,bug=None):
    state={name:{'count':0,'artifact':False,'configuration':False,'path':False,'numerics':False,'claim':False} for name in data['required']}
    for row in data['reports']:
        target=state.get(row['configuration'])
        if target is None:continue
        target['count']+=1;e=row['evidence'];result=P.numerical_decimal(e)
        flags=[('artifact',e['required_artifact']!=data['artifact'] or e['observed_artifact']!=data['artifact']),('configuration',e['required_configuration']!=row['configuration'] or e['observed_configuration']!=row['configuration']),('path',e['observed_path']!='candidate'),('numerics',any(c['status']!='pass' for c in result['channels'])),('claim',row['claimed_passed']!=result['passed'])]
        if bug=='trust_claims':flags=[(name,not row['claimed_passed'] if name=='numerics' else False if name=='claim' else failed) for name,failed in flags]
        for name,failed in flags:target[name]=failed if bug=='last_report' else target[name] or failed
    results=[]
    for name,t in state.items():
        checks=[(t['count']==0,'missing'),(t['artifact'] and bug!='ignore_artifact','artifact_mismatch'),(t['configuration'] and bug!='ignore_configuration','configuration_mismatch'),(t['path'] and bug!='ignore_path','candidate_not_executed'),(t['numerics'] and bug!='ignore_channels','numerics_failed'),(t['claim'],'claim_mismatch')]
        reasons=[label for failed,label in checks if failed];results.append({'configuration':name,'reasons':reasons,'passed':not reasons})
    return {'configurations':results,'passed':all(r['passed'] for r in results)}


def ranking_fraction(data,bug=None):
    rejected=[];eligible=[]
    for row in data['workers']:
        computed=P.numerical_decimal(row['qualification'])
        flags=[(not row['seated'],'not_seated'),(row['run']!=data['run'],'different_run'),(row['layer']!=data['layer'] and bug!='cross_layer','different_layer'),(row['last_work']>data['now'] or data['now']-row['last_work']>data['max_age'],'stale_or_future'),(not (row['claimed_qualified'] if bug=='trust_claims' else computed['passed']) or row['qualification']['required_artifact']!=data['artifact'],'unqualified'),(row['claimed_qualified']!=computed['passed'] and bug!='trust_claims','claim_mismatch')]
        reasons=[label for failed,label in flags if failed]
        if reasons:rejected.append({'id':row['id'],'reasons':reasons});continue
        rates=[]
        for trial in row['trials']:
            count=len(trial['accepted']) if bug=='retry_ids' else len(set(trial['accepted']))
            rates.append(Fraction(count)/(Fraction(str(trial['completed']))-Fraction(str(trial['start']))))
        rates.sort();n=len(rates);speed=(rates[(n-1)//2]+rates[n//2])/2
        if bug=='mean_trials':speed=sum(rates)/n
        eligible.append((speed,row['id']))
    eligible.sort(key=lambda pair:(-pair[0],pair[1]));rates=sorted(r[0] for r in eligible);n=len(rates)
    middle=(rates[(n-1)//2]+rates[n//2])/2 if rates else None
    return {'ranked':[{'id':name,'rate':float(rate),'ratio_to_median':float(rate/middle) if middle else None} for rate,name in eligible],'rejected':rejected,'median_rate':float(middle) if middle is not None else None}


ORACLES={'graph_jvp':graph_reverse_direction,'momentum_training':momentum_analytic,'attention_jvp':attention_reverse_direction,'shared_attention':shared_attention_analytic,'qualification_coverage':coverage_stream,'layer_ranking':ranking_fraction}
MUTANTS={'graph_jvp':['repeated_path','forget_direction'],'momentum_training':['batch_means','reset_velocity','fold_eta_into_buffer','plain_sgd'],'attention_jvp':['missing_scale','ignore_mask','omit_value_direction'],'shared_attention':['last_group','mean_groups','omit_key'],'qualification_coverage':['last_report','ignore_artifact','ignore_path','trust_claims','ignore_configuration','ignore_channels'],'layer_ranking':['cross_layer','retry_ids','mean_trials','trust_claims']}


def canonical_reference(data):
    return [P.ORACLES[item['task']](item) for item in data['canonical_trials']]


def verify():
    generated=R.registry();receipts=json.loads((ROOT/'runtime/practical-registries.json').read_text());assert len(receipts['registries'])==3
    delivered=[];registry_bytes={}
    for receipt in receipts['registries']:
        raw=(ROOT/receipt['file']).read_bytes();assert len(raw)==receipt['bytes'] and len(raw)<=1024*1024
        assert hashlib.sha256(raw).hexdigest()==receipt['sha256']
        payload=json.loads(raw);assert payload['id']==receipt['id'];delivered.extend(payload['fixtures']);registry_bytes[payload['id']]=len(raw)
    assert {f['id'] for f in delivered}=={f['id'] for f in generated['fixtures']}
    assert all(next(f for f in delivered if f['id']==g['id'])==g for g in generated['fixtures'])
    original=json.loads((ROOT/'runtime/code-fixtures.json').read_text());assert R.LEGACY.build_registry()==original
    for group,fixture in zip(R.GROUPS,generated['fixtures'][:3]):
        for index,task in enumerate(R.PAIR_TASKS[group]):
            covered=[c['input']['canonical_trials'][index] for c in fixture['cases']]
            assert all(c['input'] in covered for f in original['fixtures'] for c in f['cases'] if c['input']['task']==task),(group,'canonical input coverage')
    source=R.candidate_source();namespace={};exec(compile(source,'offline-qualified-reference','exec'),namespace)
    fd=0;wrong_key=0;missing_task=0;mutants=[];case_count=0;canonical_count=0;maximum_outputs={}
    for fixture in generated['fixtures']:
        task=fixture['cases'][0]['input']['task'];oracle=ORACLES.get(task)
        output_bytes=0
        for case in fixture['cases']:
            data=case['input'];whole=case['expected'];actual={'canonical':canonical_reference(data)}
            if oracle:actual['transfer']=oracle(data)
            P.validate_json(actual)
            assert P.equivalent(actual,whole,case['absoluteTolerance'],case['relativeTolerance']),(task,case['id'],'independent oracle')
            assert P.equivalent(namespace['solve'](data),actual,case['absoluteTolerance'],case['relativeTolerance']),(task,'authored candidate')
            output_bytes+=len(json.dumps({'id':case['id'],'output':actual},ensure_ascii=True).encode())+1
            absent=copy.deepcopy(whole);absent['canonical']=absent['canonical'][:1]
            assert not P.equivalent(absent,actual,case['absoluteTolerance'],case['relativeTolerance']);missing_task+=1
            if not oracle:canonical_count+=1;continue
            expected=whole['transfer'];bad=copy.deepcopy(expected)
            if task=='graph_jvp':bad['tangents'][0][-1]+=1.
            elif task=='momentum_training':bad['trace'][0]['grads'][0]+=1.
            elif task=='attention_jvp':bad['tangent'][0][0]+=1.
            elif task=='shared_attention':bad['dV'][0][0]+=1.
            elif task=='qualification_coverage':bad['passed']=not bad['passed']
            else:bad['median_rate']=12345.
            assert not P.equivalent(bad,actual['transfer'],case['absoluteTolerance'],case['relativeTolerance']);wrong_key+=1;case_count+=1
            if task=='graph_jvp':
                for direction,calculated in zip(data['directions'],expected['tangents']):
                    plus=copy.deepcopy(data);minus=copy.deepcopy(data);h=1e-5
                    plus['inputs']=[x+h*d for x,d in zip(data['inputs'],direction)];minus['inputs']=[x-h*d for x,d in zip(data['inputs'],direction)]
                    diff=[(a-b)/(2*h) for a,b in zip(P.graph_primal(plus),P.graph_primal(minus))]
                    assert P.equivalent(diff,calculated,2e-6,2e-5);fd+=len(diff)
            if task=='attention_jvp':
                plus=copy.deepcopy(data);minus=copy.deepcopy(data);h=1e-5
                for key in ['q','k','v']:
                    for i,row in enumerate(data[key]):
                        for j,x in enumerate(row):plus[key][i][j]=x+h*data['direction'][key][i][j];minus[key][i][j]=x-h*data['direction'][key][i][j]
                seed=[[0.]*len(data['v'][0]) for _ in data['q']]
                a=P.attention_analytic({**plus,'upstream':seed})['output'];b=P.attention_analytic({**minus,'upstream':seed})['output']
                diff=[[(x-y)/(2*h) for x,y in zip(ar,br)] for ar,br in zip(a,b)]
                assert P.equivalent(diff,expected['tangent'],2e-6,2e-5);fd+=sum(map(len,diff))
            if task=='momentum_training':
                p=data['initial'][:]
                for step in expected['trace']:
                    for j,x in enumerate(p):
                        def loss(y):q=p[:];q[j]=y;return P.training_derivatives(q,data)[0]
                        assert P.equivalent(P.finite_difference(loss,x),step['grads'][j],2e-6,2e-5);fd+=1
                    p=step['parameters'][:]
        maximum_outputs[fixture['id']]=output_bytes;assert output_bytes<=65536,(task,'complete output envelope',output_bytes)
        if not oracle:continue
        for mutation in MUTANTS[task]:
            failed=sum(not P.equivalent(oracle(case['input'],mutation),case['expected']['transfer'],case['absoluteTolerance'],case['relativeTolerance']) for case in fixture['cases'])
            assert failed>0,(task,mutation,'undetected');mutants.append({'task':task,'mutation':mutation,'failedCases':failed})
    return {'canonicalSuites':3,'canonicalCases':canonical_count,'freshFixtures':6,'cases':case_count,'finiteDifferenceChecks':fd,'wrongKeyControls':wrong_key,'missingCanonicalTaskControls':missing_task,'mutantsRejected':len(mutants),'negativeControls':mutants,'registryBytes':registry_bytes,'maximumOutputBytes':maximum_outputs,'originalFixturesUnchanged':True,'publicationAuthority':'not_granted'}


def broken_candidate(source,task):
    if task.startswith('canonical_suite_'):
        before='[legacy_solve(item) for item in data[\"canonical_trials\"]]'
        assert source.count(before)==1;return source.replace(before,'[legacy_solve(data[\"canonical_trials\"][0])]',1)
    changes={'graph_jvp':('Dual(v, [t])','Dual(v, [0.0])'),
      'momentum_training':("data['beta'] * v + g",'g'),
      'attention_jvp':('Dual(x, [d])',"Dual(x, [0.0 if key == 'v' else d])"),
      'shared_attention':("dk = add_rows(dk, row['dK'])","dk = row['dK']"),
      'qualification_coverage':("row['claimed_passed'] != r['passed']","False"),
      'layer_ranking':("len(set(t['accepted']))","len(t['accepted'])")}
    before,after=changes[task];assert source.count(before)==1,(task,'ambiguous mutation');return source.replace(before,after,1)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--docker',action='store_true');parser.add_argument('--broker',type=Path);args=parser.parse_args();report=verify()
    if args.docker:
        if not args.broker or not args.broker.is_file():parser.error('A released installed sandbox broker is required for --docker')
        report['docker']=P.docker_checks({'fixtures':R.registry()['fixtures']},R.candidate_source(),args.broker,mutator=broken_candidate)
    print(json.dumps(report,indent=2))
