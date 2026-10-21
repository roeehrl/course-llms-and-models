"""Independent qualification of the chapter 9, 10, 11, 12 and 14 lab fixtures
(registry llm-practical-labs-b).

Expected outputs are recomputed with oracles written separately from
runtime/lab-reference-b.py, using different methods where the task allows (closed-form
traffic, unit-time stepping, finite differences, an algebraic identity for the faulty
pullback). Each oracle takes a `bug` argument that reproduces a plausible wrong
implementation; every such variant must fail at least one hidden case. The reference
source is executed as a submission in a separate isolated interpreter, the authored
starter must fail, and the registry must satisfy Core's fixture schema, size and
output-envelope limits and the declared evaluator integrity.
"""
import ast
import hashlib
import json
import math
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'runtime/code-fixtures-labs-b.json'
OVERLAY = ROOT / 'content/labs-b.json'


# ------------------------------------------------------------------ comparison (Core sandbox semantics)

def equivalent(actual, expected, atol=0.0, rtol=0.0):
    """Mirrors @course-core/sandbox equivalent(): numbers by tolerance, everything else exact."""
    num = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)
    if num(actual) and num(expected):
        return abs(actual - expected) <= atol + rtol * abs(expected)
    if isinstance(actual, list) or isinstance(expected, list):
        return isinstance(actual, list) and isinstance(expected, list) and len(actual) == len(expected) and all(equivalent(a, b, atol, rtol) for a, b in zip(actual, expected))
    if isinstance(actual, dict) or isinstance(expected, dict):
        return isinstance(actual, dict) and isinstance(expected, dict) and sorted(actual) == sorted(expected) and all(equivalent(actual[k], expected[k], atol, rtol) for k in actual)
    return type(actual) is type(expected) and actual == expected


def roundtrip(value):
    return json.loads(json.dumps(value, allow_nan=False))


# ------------------------------------------------------------------ chapter 9 oracle

def ceil_div(a, b):
    return -(-a // b)


def o_tiling(d, bug=None):
    a, b, t, bv = d['a'], d['b'], d['tile'], d['bytes_per_value']
    m, k, n = len(a), len(b), len(b[0])
    c = [[0] * n for _ in range(m)]
    for kk in range(k):  # k-outer accumulation, unlike the reference
        for i in range(m):
            for j in range(n):
                c[i][j] += a[i][kk] * b[kk][j]
    tiles = (lambda x: x // t or 1) if bug == 'floor_tiles' else (lambda x: ceil_div(x, t))
    # Each A element is loaded once per output-column tile, each B element once per output-row tile.
    reads = m * k * tiles(n) + k * n * tiles(m)
    writes = 0 if bug == 'no_output_writes' else m * n
    ops = (m * n * k) if bug == 'ops_single' else 2 * m * n * k
    tiled = (reads + writes) * bv
    intensity = ops / tiled
    bw = d['bandwidth_bytes_per_s'] * intensity
    roof = max(d['peak_ops_per_s'], bw) if bug == 'roof_max' else min(d['peak_ops_per_s'], bw)
    return {'c': c, 'ops': ops, 'naive_bytes': (2 * m * n * k + m * n) * bv, 'tiled_bytes': tiled, 'lower_bound_bytes': (m * k + k * n + m * n) * bv,
            'tiled_intensity': intensity, 'roofline_ops_per_s': roof, 'bound': 'compute' if bw >= d['peak_ops_per_s'] else 'bandwidth'}


# ------------------------------------------------------------------ chapter 10 oracles

def o_schedule(d, bug=None):
    times, m, pause = d['stage_times'], d['microbatches'], (None if bug == 'ignore_pause' else d['pause'])
    if bug == 'closed_form':
        total = (m + len(times) - 1) * max(times)
        return {'finish': [total - (m - 1 - j) * max(times) for j in range(m)], 'makespan': total,
                'busy_fraction': [m * x / total for x in times], 'queued_time': [0] * len(times)}
    s_count = len(times)
    queues = [[(j, 0) for j in range(m)]] + [[] for _ in range(s_count - 1)]
    running = [None] * s_count  # (microbatch, finish)
    queued, last = [0] * s_count, []
    t = 0
    while len(last) < m:
        for s in range(s_count):  # completions at t hand work downstream at t
            if running[s] and running[s][1] == t:
                if s + 1 < s_count:
                    queues[s + 1].append((running[s][0], t))
                else:
                    last.append(t)
                running[s] = None
        for s in range(s_count):
            blocked = pause and pause['stage'] == s and pause['start'] <= t < pause['end']
            if bug == 'preempt' and pause and pause['stage'] == s and running[s] and pause['start'] <= t < pause['end']:
                running[s] = (running[s][0], running[s][1] + 1)
            if running[s] is None and queues[s] and not blocked:
                j, arrival = queues[s].pop(0)
                queued[s] += t - arrival
                running[s] = (j, t + times[s])
        t += 1
    span = last[-1]
    return {'finish': last, 'makespan': span, 'busy_fraction': [m * x / span for x in times], 'queued_time': queued}


def o_cache(d, bug=None):
    capacity, deadline = d['capacity'], (None if bug == 'no_expiry' else d['deadline'])
    admitted_order, admitted_at, waiting = [], {}, []
    out = {'accepted': [], 'expired': [], 'rejected': [], 'max_queue': 0}
    live = lambda: [x for x in admitted_order if x in cached]
    cached = set()

    def admit(t):
        while waiting and len(cached) < capacity:
            name = waiting.pop() if bug == 'lifo' else waiting.pop(0)
            cached.add(name)
            admitted_order.append(name)
            admitted_at[name] = t

    for e in d['events']:
        t = e['t']
        if deadline is not None:
            for name in live():
                if admitted_at[name] + deadline <= t:
                    cached.discard(name)
                    out['expired'].append(name)
        admit(t)
        if e['type'] == 'forward':
            waiting.append(e['id'])
            admit(t)
        elif e['id'] in cached:
            cached.discard(e['id'])
            out['accepted'].append(e['id'])
            admit(t)
        else:
            out['rejected'].append(e['id'])
        out['max_queue'] = max(out['max_queue'], len(waiting))
    out.update(admitted_at=admitted_at, cached_end=live(), queued_end=list(waiting))
    return out


def o_ch10(d, bug=None):
    return o_schedule(d, bug) if d['task'] == 'pipeline_schedule' else o_cache(d, bug)


# ------------------------------------------------------------------ chapter 11 oracle

def o_journal(d, bug=None):
    # Pass 1: decide which events belong to the session current at ingestion time.
    current, live = None, []
    for e in d['events']:
        if e['event'] == 'registered':
            current = e['session']
            live.append(('register', e))
        elif e['event'] == 'registration_started':
            live.append(('start', e))
        elif e['session'] == current or bug == 'no_session_filter':
            live.append(('live', e))
            if e['event'] == 'reset' and e['session'] == current:
                current = None
        else:
            live.append(('stale', e))
    # Pass 2: reduce the live events.
    starts, waits, firsts, steps = {}, [], [], 0
    window, counted, reg_t, local, sub, acc, rejected = 0, set(), None, set(), set(), set(), 0
    for tag, e in live:
        if tag == 'start':
            starts[e['session']] = e['t']
        elif tag == 'register':
            reg_t, window, counted = e['t'], 0, set()
            if e['session'] in starts:
                waits.append(e['t'] - starts[e['session']])
        elif tag == 'live':
            if e['event'] == 'reset':
                window, counted = (window if bug == 'keep_window' else 0), set()
            elif e['event'] == 'backward_complete':
                if e['ok'] and (e['activation'] not in counted or bug == 'count_duplicates'):
                    if not counted:
                        firsts.append(e['t'] - reg_t)
                    counted.add(e['activation'])
                    local.add(e['activation'])
                    window += 1
                    if window == d['threshold']:
                        steps, window = steps + 1, 0
                else:
                    rejected += 1
            elif e['event'] == 'submitted':
                sub.add(e['activation'])
            elif e['event'] == 'accepted':
                acc.add(e['activation'])
    if bug == 'local_is_accepted':
        acc = acc | local
    final = None
    for tag, e in live:
        if tag == 'register':
            final = e['session']
        elif tag == 'live' and e['event'] == 'reset' and e['session'] == final:
            final = None
    return {'current_session': final, 'admission_wait': waits, 'time_to_first_backward': firsts, 'optimizer_steps': steps,
            'pending': window if final is not None or bug == 'keep_window' else 0, 'local_backward': sorted(local), 'submitted': sorted(sub),
            'accepted': sorted(acc), 'computed_not_accepted': sorted(local - acc), 'stale_ignored': sum(1 for tag, _ in live if tag == 'stale'), 'not_counted': rejected}


# ------------------------------------------------------------------ chapter 12 oracle

def attention_output(q, k, v, scale):
    n = len(q)
    out = []
    for i in range(n):
        scores = [scale * sum(a * b for a, b in zip(q[i], k[j])) for j in range(n)]
        z = sum(math.exp(s) for s in scores)
        p = [math.exp(s) / z for s in scores]
        out.append((p, [sum(p[j] * v[j][c] for j in range(n)) for c in range(len(v[0]))]))
    return [p for p, _ in out], [o for _, o in out]


def o_layout(d, bug=None):
    q, k, v, g, scale, perm = d['q'], d['k'], d['v'], d['d_out'], d['scale'], d['perm']
    n = len(q)
    P, O = attention_output(q, k, v, scale)
    loss = lambda qq, kk, vv: sum(go * o for gr, orow in zip(g, attention_output(qq, kk, vv, scale)[1]) for go, o in zip(gr, orow))

    def fd(mat_index):
        mats = [q, k, v]
        base = mats[mat_index]
        grad = []
        for i in range(len(base)):
            row = []
            for j in range(len(base[0])):
                h = 1e-6
                plus = [r[:] for r in base]; plus[i][j] += h
                minus = [r[:] for r in base]; minus[i][j] -= h
                args_p, args_m = list(mats), list(mats)
                args_p[mat_index], args_m[mat_index] = plus, minus
                row.append((loss(*args_p) - loss(*args_m)) / (2 * h))
            grad.append(row)
        return grad

    dq, dk, dv = fd(0), fd(1), fd(2)
    # Candidate: relabeled probabilities through explicit (row, column) coordinates.
    Pbad = [[None] * n for _ in range(n)]
    for idx, src in enumerate(perm):
        i, j = divmod(idx, n)
        si, sj = divmod(src, n)
        Pbad[i][j] = P[si][sj]
    Obad = [[sum(Pbad[i][j] * v[j][c] for j in range(n)) for c in range(len(v[0]))] for i in range(n)]
    D = [sum(a * b for a, b in zip(g[i], O[i])) for i in range(n)]
    Dbad = [sum(a * b for a, b in zip(g[i], (O if bug == 'd_from_reference' else Obad)[i])) for i in range(n)]
    # dS_bad = dS - P*(D_bad - D): the damage is a row-scaled copy of P.
    delta = [[P[i][j] * (Dbad[i] - D[i]) for j in range(n)] for i in range(n)]
    dq_bad = [[dq[i][c] - scale * sum(delta[i][j] * k[j][c] for j in range(n)) for c in range(len(q[0]))] for i in range(n)]
    dk_bad = [[dk[j][c] - scale * sum(delta[i][j] * q[i][c] for i in range(n)) for c in range(len(q[0]))] for j in range(n)]
    dv_bad = [[sum(Pbad[i][j] * g[i][c] for i in range(n)) for c in range(len(g[0]))] for j in range(n)] if bug == 'dv_from_bad' else [r[:] for r in dv]
    flat = lambda x: [y for r in x for y in r] if isinstance(x[0], list) else x
    count = lambda a, b: sum(1 for x, y in zip(flat(a), flat(b)) if abs(x - y) > 1e-9 * (1 + abs(y)))
    mismatch = {'o': count(Obad, O), 'd': count(Dbad, D), 'dq': count(dq_bad, dq), 'dk': count(dk_bad, dk), 'dv': count(dv_bad, dv)}
    order = ['o', 'd', 'dq', 'dk', 'dv']
    first = max(order, key=lambda s: mismatch[s]) if bug == 'worst_not_first' and any(mismatch.values()) else next((s for s in order if mismatch[s]), None)
    coords = sum(1 for a, b in zip(flat(Pbad), flat(P)) if a != b) if bug == 'value_coordinates' else sum(1 for i in range(n * n) if perm[i] != i)
    return {'reference': {'o': O, 'dq': dq, 'dk': dk, 'dv': dv}, 'candidate': {'o': Obad, 'dq': dq_bad, 'dk': dk_bad, 'dv': dv_bad},
            'mismatch': mismatch, 'first_mismatch': first, 'coordinate_mismatches': coords}


# ------------------------------------------------------------------ chapter 14 oracle

def median(values):
    s = sorted(values)
    h = len(s) // 2
    return s[h] if len(s) % 2 else (s[h - 1] + s[h]) / 2


def o_evidence(d, bug=None):
    r, c = d['reference_ms'], d['candidate_ms']
    idx = [i for i in range(len(r)) if r[i] is not None and c[i] is not None]
    if bug == 'unpaired':
        rr, cc = [x for x in r if x is not None], [x for x in c if x is not None]
        saving = median(rr) - median(cc) if rr and cc else None
        speed = median(rr) / median(cc) if rr and cc else None
    else:
        saving = median([r[i] - c[i] for i in idx]) if idx else None
        speed = median([r[i] / c[i] for i in idx]) if idx else None
    rank = {'fail': 3, 'pass': 2, 'timeout': 1, None: 1}
    ledger, indep = {}, False
    for name in d['required']:
        rows = [x for x in d['checks'] if x['name'] == name and (bug == 'ignore_digest' or x['digest'] == d['candidate_digest'])]
        if not rows:
            ledger[name] = 'pass' if bug == 'missing_is_pass' else 'not_run'
            continue
        worst = max(rank[x['status']] for x in rows)
        ledger[name] = {3: 'fail', 2: 'pass', 1: 'inconclusive'}[worst]
        if worst == 2:
            indep |= any(x['status'] == 'pass' and x['independent'] for x in rows)
    vals = set(ledger.values())
    numerical = 'fail' if 'fail' in vals else ('pass' if vals == {'pass'} and (indep or bug == 'missing_is_pass') else 'inconclusive')
    speed_state = 'unmeasured' if saving is None else ('faster' if saving > 0 else 'not_faster')
    if bug == 'speed_wins':
        claim = 'supported' if speed_state == 'faster' else 'refuted' if speed_state == 'not_faster' else 'inconclusive'
    elif numerical == 'pass' and speed_state == 'faster':
        claim = 'supported'
    elif numerical == 'fail' or speed_state == 'not_faster':
        claim = 'refuted'
    else:
        claim = 'inconclusive'
    return {'complete_pairs': len(idx), 'median_saving_ms': saving, 'median_speedup': speed, 'ledger': ledger,
            'numerical': numerical, 'speed': speed_state, 'claim': claim}


ORACLES = {
    'llm-lab-ch09-tiling-v1': (o_tiling, ['floor_tiles', 'no_output_writes', 'ops_single', 'roof_max']),
    'llm-lab-ch10-pipeline-v1': (o_ch10, ['ignore_pause', 'closed_form', 'preempt', 'no_expiry', 'lifo']),
    'llm-lab-ch11-journal-v1': (o_journal, ['no_session_filter', 'count_duplicates', 'local_is_accepted', 'keep_window']),
    'llm-lab-ch12-layout-v1': (o_layout, ['dv_from_bad', 'd_from_reference', 'value_coordinates', 'worst_not_first']),
    'llm-lab-ch14-evidence-v1': (o_evidence, ['unpaired', 'ignore_digest', 'missing_is_pass', 'speed_wins']),
}
FD_TOLERANCE = {'llm-lab-ch12-layout-v1': (1e-6, 1e-6)}


# ------------------------------------------------------------------ Core fixture schema and envelope

def batch_plan(cases, limit=65536):
    counts, count, estimated, minimum = [], 0, 0, 0
    for case in cases:
        text = json.dumps({'id': case['id'], 'output': case['expected']}, separators=(',', ':'), ensure_ascii=True)
        size = len(text.encode()) + 1
        conservative = size * 2 + 64
        assert conservative <= limit, 'CODE_FIXTURE_OUTPUT_ENVELOPE_EXCEEDED'
        minimum += size
        if count and estimated + conservative > limit:
            counts.append(count); count = 0; estimated = 0
        count += 1; estimated += conservative
    if count:
        counts.append(count)
    assert minimum <= limit and len(counts) <= 8, 'CODE_FIXTURE_OUTPUT_ENVELOPE_EXCEEDED'
    return counts


def check_schema(raw, registry):
    import re
    assert len(raw) <= 1024 * 1024
    assert set(registry) == {'schemaVersion', 'id', 'version', 'fixtures'} and registry['schemaVersion'] == 1
    assert re.fullmatch(r'[a-z][a-z0-9-]{0,100}', registry['id']) and re.fullmatch(r'\d+\.\d+\.\d+', registry['version'])
    assert 1 <= len(registry['fixtures']) <= 50 and len({f['id'] for f in registry['fixtures']}) == len(registry['fixtures'])
    batches = {}
    for f in registry['fixtures']:
        assert set(f) == {'id', 'language', 'cases'} and f['language'] == 'python' and 1 <= len(f['id']) <= 200 and 1 <= len(f['cases']) <= 100
        for case in f['cases']:
            assert set(case) <= {'id', 'input', 'expected', 'absoluteTolerance', 'relativeTolerance'} and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', case['id'])
            for key in ('absoluteTolerance', 'relativeTolerance'):
                assert 0 <= case.get(key, 0) <= 0.1
        assert len({c['id'] for c in f['cases']}) == len(f['cases'])
        batches[f['id']] = batch_plan(f['cases'])
    return batches


# ------------------------------------------------------------------ isolated runner emulation

RUNNER = r'''
import json, sys, importlib.util
spec = importlib.util.spec_from_file_location("submission", sys.argv[1])
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
for line in sys.stdin:
    case = json.loads(line)
    print(json.dumps({"id": case["id"], "output": module.solve(case["input"])}, allow_nan=False))
'''


def run_isolated(source_path, cases):
    payload = ''.join(json.dumps({'id': c['id'], 'input': c['input']}) + '\n' for c in cases)
    started = time.monotonic()
    run = subprocess.run([sys.executable, '-I', '-B', '-c', RUNNER, str(source_path)], input=payload, text=True, capture_output=True, timeout=60)
    elapsed = time.monotonic() - started
    assert run.returncode == 0, run.stderr[-2000:]
    rows = [json.loads(line) for line in run.stdout.splitlines()]
    return {row['id']: row['output'] for row in rows}, elapsed, len(run.stdout.encode())


def practice_of(starter):
    for node in ast.walk(ast.parse(starter)):
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'practice' for t in node.targets):
            return json.loads(node.value.args[0].value)
    raise AssertionError('Missing practice input')


def main():
    raw = FIXTURES.read_bytes()
    registry = json.loads(raw)
    overlay = json.loads(OVERLAY.read_text())
    report = {'registry': registry['id'], 'bytes': len(raw), 'fixtures': {}}
    batches = check_schema(raw, registry)
    ext = overlay['extensions'][0]
    assert ext['id'] == registry['id'] and ext['version'] == registry['version'] and ext['entrypoint'] == 'runtime/code-fixtures-labs-b.json'
    assert ext['integrity'] == 'sha256-' + hashlib.sha256(raw).hexdigest(), 'Declared integrity differs from fixture bytes'
    refs = {a['grading']['fixtureRef']: a for a in overlay['assessments']}
    assert set(refs) == {f['id'] for f in registry['fixtures']} == set(ORACLES)
    for fixture in registry['fixtures']:
        fid, cases = fixture['id'], fixture['cases']
        oracle, bugs = ORACLES[fid]
        # 1. Independent oracle agrees with every stored expected output.
        for case in cases:
            atol, rtol = FD_TOLERANCE.get(fid, (case.get('absoluteTolerance', 0), case.get('relativeTolerance', 0)))
            got = roundtrip(oracle(roundtrip(case['input'])))
            assert equivalent(got, case['expected'], atol, rtol), f'{fid} {case["id"]}: oracle disagrees'
            assert equivalent(roundtrip(case['expected']), case['expected'])
        # 2. The reference source passes every case when run as an isolated submission.
        outputs, elapsed, out_bytes = run_isolated(ROOT / 'runtime/lab-reference-b.py', cases)
        passed = sum(equivalent(outputs[c['id']], c['expected'], c.get('absoluteTolerance', 0), c.get('relativeTolerance', 0)) for c in cases)
        assert passed == len(cases), f'{fid}: reference passed {passed}/{len(cases)}'
        # 3. Plausible wrong implementations each fail at least one case.
        rejected = {}
        for bug in bugs:
            failures = sum(not equivalent(roundtrip(oracle(roundtrip(c['input']), bug)), c['expected'], *FD_TOLERANCE.get(fid, (c.get('absoluteTolerance', 0), c.get('relativeTolerance', 0)))) for c in cases)
            assert failures >= 1, f'{fid}: wrong implementation {bug} passes every case'
            rejected[bug] = failures
        # 4. The authored starter fails, and its practice input is valid and not a graded case.
        assessment = refs[fid]
        namespace = {'__name__': 'starter'}
        exec(compile(assessment['starterCode'], 'starter', 'exec'), namespace)
        assert all(not equivalent(namespace['solve'](roundtrip(c['input'])), c['expected']) for c in cases), f'{fid}: starter passes a case'
        practice = practice_of(assessment['starterCode'])
        assert practice not in [c['input'] for c in cases]
        assert roundtrip(oracle(practice)) is not None
        report['fixtures'][fid] = {'cases': len(cases), 'referencePassed': passed, 'referenceSeconds': round(elapsed, 3), 'outputBytes': out_bytes,
                                   'batches': batches[fid], 'wrongImplementationsRejected': rejected, 'starterFailsAll': True}
    report['qualified'] = True
    report['scope'] = 'synthetic teaching fixtures; agreement with the stated model only, not a device, fleet or deployment measurement'
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
