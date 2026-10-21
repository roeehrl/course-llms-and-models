"""Independent qualification of the chapter 1, 2, 3, 5, 6 and 8 lab fixtures.

Never executes learner code. It (1) checks the registry against Course Core's fixture
schema and limits, (2) recomputes every expected output with oracles written
differently from runtime/lab-reference-a.py (exact Fraction/Decimal arithmetic,
index-function composition instead of stride bookkeeping), (3) emulates the sandbox
runner's JSON protocol and tolerance comparison to show the authored reference passes
every case, the starter fails, and at least two plausible wrong implementations per lab
fail, and (4) checks the declared evaluator integrity. Prints a JSON report.
"""
import ast
import copy
import hashlib
import json
import math
import re
import sys
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'runtime/code-fixtures-labs-a.json'
OVERLAY = ROOT / 'content/labs-a.json'
REFERENCE = ROOT / 'runtime/lab-reference-a.py'
getcontext().prec = 60


# ------------------------------------------------------------------ runner emulation
def equivalent(actual, expected, atol=0.0, rtol=0.0):
    """Course Core sandbox `equivalent`: numbers within atol+rtol*|expected|, the rest exact."""
    if isinstance(actual, bool) or isinstance(expected, bool):
        return type(actual) is type(expected) and actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isfinite(actual) and math.isfinite(expected) and abs(actual - expected) <= atol + rtol * abs(expected)
    if actual is None or expected is None:
        return actual is expected
    if type(actual) is not type(expected):
        return False
    if isinstance(actual, list):
        return len(actual) == len(expected) and all(equivalent(a, b, atol, rtol) for a, b in zip(actual, expected))
    if isinstance(actual, dict):
        return sorted(actual) == sorted(expected) and all(equivalent(actual[k], expected[k], atol, rtol) for k in actual)
    return actual == expected


def run_source(source, cases):
    """One attempt: fresh namespace, solve() per case, JSON round trip, tolerance compare."""
    namespace = {}
    try:
        exec(compile(source, 'candidate', 'exec'), namespace)
    except Exception:
        return [False] * len(cases)
    results = []
    for case in cases:
        try:
            output = json.loads(json.dumps(namespace['solve'](copy.deepcopy(case['input'])), allow_nan=False))
            results.append(equivalent(output, case['expected'], case.get('absoluteTolerance', 0), case.get('relativeTolerance', 0)))
        except Exception:
            results.append(False)
    return results


def candidate_source():
    """Algorithm-only authored candidate: everything above the generation marker."""
    text = REFERENCE.read_text()
    source = text.split('# ------------------------------------------------------------------ GENERATION')[0]
    assert 'build_registry' not in source and 'expected' not in source and len(source.encode()) < 64000
    ast.parse(source)
    return source


MUTANTS = {
    'state_ledger': {
        'overwrite_accumulation': ("grads['w'] += residual * x", "grads['w'] = residual * x"),
        'frozen_still_trained': ("            if 'w' not in frozen:\n                grads['w']", "            if True:\n                grads['w']"),
        'ascent_step': ("params[name] - event['lr'] * grads[name]", "params[name] + event['lr'] * grads[name]"),
    },
    'strided_views': {
        'transpose_assumes_contiguous': ("strides[i], strides[j] = strides[j], strides[i]", "strides = _row_major(shape)"),
        'slice_forgets_offset': ("offset = src['offset'] + start * strides[d]", "offset = src['offset'] + start"),
        'expand_keeps_stride': ("strides.append(src['strides'][k - extra] if own == size else 0)", "strides.append(src['strides'][k - extra])"),
    },
    'gradient_descent': {
        'wrong_sign': ("w, b = w - eta * gw, b - eta * gb", "w, b = w + eta * gw, b + eta * gb"),
        'ignore_reduction': ("    if reduction == 'mean':\n        gw, gb", "    if False:\n        gw, gb"),
        'sequential_update': ("w, b = w - eta * gw, b - eta * gb", "w = w - eta * gw; b = b - eta * _gradient(examples, w, b, reduction)[1]"),
    },
    'optimizer_resume': {
        'state_not_restored': ("if data['restore'] == 'params_only':", "if True:"),
        'no_bias_correction': ("mhat = state['m'][i] / (1 - hyper['beta1'] ** t)", "mhat = state['m'][i]"),
        'coupled_l2': ("state['m'][i] = hyper['beta1'] * state['m'][i] + (1 - hyper['beta1']) * g\n",
                       "g = g + hyper['weight_decay'] * p; state['m'][i] = hyper['beta1'] * state['m'][i] + (1 - hyper['beta1']) * g\n"),
    },
    'next_token_loss': {
        'all_positions_denominator': ("valid = sum(1 for flag in ignore if not flag)", "valid = len(ignore)"),
        'unshifted_targets': ("targets = tokens[1:]", "targets = tokens[:-1]"),
        'naive_softmax': ("        m = max(row)\n", "        m = 0.0\n"),
    },
    'lora_adapter': {
        'ignore_scale': ("scale = data['alpha'] / r if", "scale = 1.0 if"),
        'dense_budget': ("'trainable_parameters': r * (inn + out)", "'trainable_parameters': r * inn * out"),
    },
}


# ------------------------------------------------------------------ independent oracles
F = lambda v: Fraction(v)


def oracle_state_ledger(d):
    w, b = F(d['params']['w']), F(d['params']['b'])
    trainable = {'w', 'b'} - set(d.get('frozen', []))
    gw = gb = F(0)
    memory = None
    rows, changed = [], 0
    for e in d['events']:
        old = (w, b)
        pred = loss = None
        if e['op'] == 'forward':
            pred = w * F(e['x']) + b
            if 'y' in e:
                loss = (pred - F(e['y'])) ** 2 / 2
                memory = (pred - F(e['y']), F(e['x']))
            else:
                memory = None
        elif e['op'] == 'backward':
            gw += memory[0] * memory[1] if 'w' in trainable else 0
            gb += memory[0] if 'b' in trainable else 0
        elif e['op'] == 'step':
            lr = F(e['lr'])
            w = w - lr * gw if 'w' in trainable else w
            b = b - lr * gb if 'b' in trainable else b
        elif e['op'] == 'zero_grad':
            gw = gb = F(0)
        elif e['op'] == 'load':
            w, b = F(e['params']['w']), F(e['params']['b'])
        changed += (w, b) != old
        rows.append({'op': e['op'], 'w': float(w), 'b': float(b), 'grad_w': float(gw), 'grad_b': float(gb),
                     'prediction': None if pred is None else float(pred), 'loss': None if loss is None else float(loss)})
    return {'ledger': rows, 'parameter_changes': changed}


def oracle_strided_views(d):
    # Each view is a function from a logical index to a storage address; metadata is
    # derived by probing that function, not by stride bookkeeping.
    funcs, shapes, stride_meta = {}, {}, {}
    for v in d['views']:
        n = v['name']
        if 'transpose' in v:
            src, (i, j) = v['transpose'], v['dims']
            shape = list(shapes[src]); shape[i], shape[j] = shape[j], shape[i]
            def f(idx, src=src, i=i, j=j):
                idx = list(idx); idx[i], idx[j] = idx[j], idx[i]; return funcs[src](idx)
            meta = list(stride_meta[src]); meta[i], meta[j] = meta[j], meta[i]
        elif 'slice' in v:
            src, dim, a, z, k = v['slice'], v['dim'], v['start'], v['stop'], v['step']
            shape = list(shapes[src]); shape[dim] = len(range(a, z, k))
            def f(idx, src=src, dim=dim, a=a, k=k):
                idx = list(idx); idx[dim] = a + idx[dim] * k; return funcs[src](idx)
            meta = list(stride_meta[src]); meta[dim] *= k
        elif 'expand' in v:
            src = v['expand']; shape = list(v['shape']); lead = len(shape) - len(shapes[src])
            def f(idx, src=src, lead=lead):
                return funcs[src]([0 if shapes[src][p] == 1 else x for p, x in enumerate(idx[lead:])])
            meta = [0] * lead + [m if shapes[src][p] == shape[lead + p] else 0 for p, m in enumerate(stride_meta[src])]
        else:
            shape = list(v['shape']); o, s = v['offset'], v['strides']
            def f(idx, o=o, s=s):
                return o + sum(x * y for x, y in zip(idx, s))
            meta = list(s)
        funcs[n], shapes[n] = f, shape
        # Strides of dimensions longer than one are observable from the function.
        zero = [0] * len(shape)
        for p, size in enumerate(shape):
            if size > 1:
                probe = list(zero); probe[p] = 1
                meta[p] = f(probe) - f(zero)
        stride_meta[n] = meta
    storage = list(d['storage']); reads = []
    for op in d['ops']:
        address = funcs[op['view']](op['index'])
        if op['op'] == 'read':
            reads.append(storage[address])
        else:
            storage[address] = op['value']
    views = {}
    for n, shape in shapes.items():
        f = funcs[n]; zero = [0] * len(shape)
        # Row-major enumeration must visit consecutive addresses (dimensions of size one ignored).
        order, idx = [], [0] * len(shape)
        def walk(p):
            if p == len(shape):
                order.append(f(idx)); return
            for x in range(shape[p]):
                idx[p] = x; walk(p + 1)
            idx[p] = 0
        walk(0)
        views[n] = {'offset': f(zero), 'shape': shape, 'strides': stride_meta[n],
                    'contiguous': all(b - a == 1 for a, b in zip(order, order[1:]))}
    return {'reads': reads, 'storage': storage, 'views': views}


def oracle_gradient_descent(d):
    ex = [(F(e['x']), F(e['y'])) for e in d['examples']]
    scale = Fraction(1, len(ex)) if d['reduction'] == 'mean' else F(1)
    obj = lambda w, b: scale * sum((w * x + b - y) ** 2 for x, y in ex) / 2
    # Exact derivative by symbolic expansion of the quadratic: d/dw sum (wx+b-y)^2/2.
    grad = lambda w, b: (scale * sum((w * x + b - y) * x for x, y in ex), scale * sum((w * x + b - y) for x, y in ex))
    w, b, eta, h = F(d['w']), F(d['b']), F(d['eta']), F(d['h'])
    fd = [(obj(w + h, b) - obj(w - h, b)) / (2 * h), (obj(w, b + h) - obj(w, b - h)) / (2 * h)]
    traj = []
    for k in range(d['steps'] + 1):
        gw, gb = grad(w, b)
        traj.append({'w': float(w), 'b': float(b), 'loss': float(obj(w, b)), 'grad_w': float(gw), 'grad_b': float(gb)})
        w, b = w - eta * gw, b - eta * gb
    outcome = 'decreased' if traj[-1]['loss'] < traj[0]['loss'] else 'increased' if traj[-1]['loss'] > traj[0]['loss'] else 'unchanged'
    return {'trajectory': traj, 'finite_difference': [float(x) for x in fd], 'outcome': outcome}


def oracle_optimizer_resume(d):
    D = lambda v: Decimal(repr(float(v)))
    h = {k: D(v) for k, v in d['hyper'].items()}
    kind, n = d['optimizer'], len(d['params'])

    def run(params, state, grads):
        for g in grads:
            state = {'step': state['step'] + 1, 'm': list(state['m']), 'v': list(state['v'])}
            t = state['step']
            for i in range(n):
                gi = D(g[i])
                if kind == 'sgd_momentum':
                    state['m'][i] = h['mu'] * state['m'][i] + gi
                    params[i] = params[i] - h['eta'] * state['m'][i]
                else:
                    state['m'][i] = h['beta1'] * state['m'][i] + (1 - h['beta1']) * gi
                    state['v'][i] = h['beta2'] * state['v'][i] + (1 - h['beta2']) * gi * gi
                    mhat = state['m'][i] / (1 - h['beta1'] ** t)
                    vhat = state['v'][i] / (1 - h['beta2'] ** t)
                    params[i] = (1 - h['eta'] * h['weight_decay']) * params[i] - h['eta'] * mhat / (vhat.sqrt() + h['eps'])
        return params, state

    fresh = lambda: {'step': 0, 'm': [Decimal(0)] * n, 'v': [Decimal(0)] * n}
    k = d['checkpoint_after']
    p, s = run([D(x) for x in d['params']], fresh(), d['grads'][:k])
    pub = lambda s: {'step': s['step'], 'm': [float(x) for x in s['m']], **({} if kind == 'sgd_momentum' else {'v': [float(x) for x in s['v']]})}
    checkpoint = {'params': [float(x) for x in p], 'state': pub(s)}
    if d['restore'] == 'params_only':
        s = fresh()
    p, s = run(p, s, d['grads'][k:])
    straight, _ = run([D(x) for x in d['params']], fresh(), d['grads'])
    # In exact arithmetic a full restore reproduces the run; a reset state does not unless nothing was lost.
    lost = d['restore'] == 'params_only' and k > 0
    return {'checkpoint': checkpoint, 'params': [float(x) for x in p], 'state': pub(s), 'matches_uninterrupted': not lost and p == straight}


def oracle_next_token_loss(d):
    toks, rows, ign = d['tokens'], d['logits'], d['ignore']
    counted = [i for i, s in enumerate(ign) if not s]
    probs, losses, grads, hits = [], [], [], 0
    for i, row in enumerate(rows):
        z = [Decimal(repr(float(v))) for v in row]
        e = [v.exp() for v in z]  # high-precision Decimal: no overflow at 1000
        total = sum(e)
        p = [v / total for v in e]
        probs.append([float(v) for v in p])
        target = toks[i + 1]
        if ign[i]:
            losses.append(None); grads.append([0.0] * len(row)); continue
        losses.append(float(total.ln() - z[target]))
        top = min(j for j in range(len(z)) if z[j] == max(z))
        hits += top == target
        grads.append([float((p[j] - (1 if j == target else 0)) / len(counted)) for j in range(len(z))])
    mean = sum(Decimal(repr(l)) for l in losses if l is not None) / len(counted)
    return {'targets': toks[1:], 'probs': probs, 'losses': losses, 'mean_loss': float(mean),
            'greedy_accuracy': hits / len(counted), 'grad': grads}


def oracle_lora_adapter(d):
    W = [[F(v) for v in r] for r in d['W']]; A = [[F(v) for v in r] for r in d['A']]; B = [[F(v) for v in r] for r in d['B']]
    r = len(A)
    assert r == d['r']
    s = F(d['alpha']) / r if d['scale_convention'] == 'alpha_over_r' else F(d['alpha'])
    # Rank-one sum: DeltaW = s * sum_k outer(B[:,k], A[k,:]).
    delta = [[F(0)] * len(W[0]) for _ in W]
    for k in range(r):
        for i in range(len(W)):
            for j in range(len(W[0])):
                delta[i][j] += s * B[i][k] * A[k][j]
    merged = [[W[i][j] + delta[i][j] for j in range(len(W[0]))] for i in range(len(W))]
    mv = lambda M, x: [sum(a * F(b) for a, b in zip(row, x)) for row in M]
    outs = [[float(v) for v in mv(merged, x)] for x in d['inputs']]
    zero = all(v == 0 for row in A + B for v in row)
    return {'scale': float(s), 'delta': [[float(v) for v in row] for row in delta], 'merged': [[float(v) for v in row] for row in merged],
            'outputs_unmerged': outs, 'outputs_merged': outs, 'trainable_parameters': sum(len(row) for row in A) + sum(len(row) for row in B),
            'dense_parameters': sum(len(row) for row in W), 'adapter_can_learn': not zero}


ORACLES = {'state_ledger': oracle_state_ledger, 'strided_views': oracle_strided_views, 'gradient_descent': oracle_gradient_descent,
           'optimizer_resume': oracle_optimizer_resume, 'next_token_loss': oracle_next_token_loss, 'lora_adapter': oracle_lora_adapter}


# ------------------------------------------------------------------ registry checks
def compact_bytes(value):
    return len(json.dumps(value, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode())


def check_schema(registry, raw):
    assert len(raw) <= 1024 * 1024, 'CODE_FIXTURE_ENVELOPE_EXCEEDED'
    assert set(registry) == {'schemaVersion', 'id', 'version', 'fixtures'} and registry['schemaVersion'] == 1
    assert re.fullmatch(r'[a-z][a-z0-9-]{0,100}', registry['id']) and re.fullmatch(r'\d+\.\d+\.\d+', registry['version'])
    assert 1 <= len(registry['fixtures']) <= 50
    assert len({f['id'] for f in registry['fixtures']}) == len(registry['fixtures'])
    batches = {}
    for fixture in registry['fixtures']:
        assert set(fixture) == {'id', 'language', 'cases'} and fixture['language'] == 'python' and 1 <= len(fixture['id']) <= 200
        assert 1 <= len(fixture['cases']) <= 100
        ids = set()
        for case in fixture['cases']:
            assert set(case) <= {'id', 'input', 'expected', 'absoluteTolerance', 'relativeTolerance'} and {'id', 'input', 'expected'} <= set(case)
            assert re.fullmatch(r'[A-Za-z0-9_-]{1,100}', case['id']) and case['id'] not in ids
            ids.add(case['id'])
            for key in ('absoluteTolerance', 'relativeTolerance'):
                assert 0 <= case.get(key, 0) <= 0.1
        # Core codeFixtureBatchPlan with a conservative byte estimate.
        counts, count, estimated, minimum = [], 0, 0, 0
        for case in fixture['cases']:
            size = compact_bytes({'id': case['id'], 'output': case['expected']}) + 1
            conservative = size * 2 + 64
            assert conservative <= 65536
            minimum += size
            if count and estimated + conservative > 65536:
                counts.append(count); count = estimated = 0
            count += 1; estimated += conservative
        counts.append(count)
        assert minimum <= 65536 and len(counts) <= 8, fixture['id']
        assert compact_bytes(fixture['cases']) <= 1024 * 1024
        batches[fixture['id']] = counts
    return batches


def main():
    raw = FIXTURES.read_bytes()
    registry = json.loads(raw)
    overlay = json.loads(OVERLAY.read_text())
    batches = check_schema(registry, raw)
    assert registry['id'] == 'llm-practical-labs-a' and registry['version'] == '0.1.0'
    extension = overlay['extensions'][0]
    assert extension['id'] == registry['id'] and extension['version'] == registry['version']
    assert extension['integrity'] == 'sha256-' + hashlib.sha256(raw).hexdigest(), 'Extension integrity does not match fixture bytes'
    assert extension['entrypoint'] == 'runtime/code-fixtures-labs-a.json' and extension['execution'] == 'server'
    by_fixture = {a['grading']['fixtureRef']: a for a in overlay['assessments']}
    assert set(by_fixture) == {f['id'] for f in registry['fixtures']}
    assert all(a['grading']['evaluatorId'] == registry['id'] and a['type'] == 'code' and a['language'] == 'python' for a in overlay['assessments'])
    source = candidate_source()
    report = {'registry': registry['id'], 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'labs': []}
    for fixture in registry['fixtures']:
        task = fixture['cases'][0]['input']['task']
        assert all(c['input']['task'] == task for c in fixture['cases'])
        oracle = ORACLES[task]
        mismatches = [c['id'] for c in fixture['cases'] if not equivalent(oracle(copy.deepcopy(c['input'])), c['expected'], c['absoluteTolerance'], c['relativeTolerance'])]
        assert not mismatches, (fixture['id'], mismatches)
        assert all(run_source(source, fixture['cases'])), f'reference fails {fixture["id"]}'
        starter = by_fixture[fixture['id']]['starterCode']
        assert not any(run_source(starter, fixture['cases'])), 'starter passes a case'
        # The starter's practice input is not a graded case.
        practice = ast.literal_eval(re.search(r'json\.loads\((".*")\)', starter).group(1))
        assert all(json.loads(practice) != c['input'] for c in fixture['cases'])
        mutant_report = {}
        for name, (before, after) in MUTANTS[task].items():
            assert source.count(before) >= 1, (task, name)
            failed = run_source(source.replace(before, after, 1), fixture['cases']).count(False)
            assert failed >= 1, f'mutant {name} passes every case of {fixture["id"]}'
            mutant_report[name] = failed
        assert len(mutant_report) >= 2
        discrete = sorted({json.dumps(c['expected'].get(k)) for c in fixture['cases'] for k in ('outcome', 'matches_uninterrupted', 'adapter_can_learn') if k in c['expected']})
        report['labs'].append({'fixture': fixture['id'], 'task': task, 'cases': len(fixture['cases']), 'oracleAgrees': True, 'referencePasses': True,
                               'starterFails': True, 'mutantsFailedCases': mutant_report, 'batches': batches[fixture['id']], 'discreteValues': discrete})
    report['qualified'] = True
    report['learnerCodeExecuted'] = False
    print(json.dumps(report))


if __name__ == '__main__':
    main()
