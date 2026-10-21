"""Reference solutions and deterministic hidden-case generator for the chapter labs of
chapters 9, 10, 11, 12 and 14 (registry llm-practical-labs-b).

    python3 -B runtime/lab-reference-b.py --write   # regenerate runtime/code-fixtures-labs-b.json
    python3 -B runtime/lab-reference-b.py --check   # verify the file is byte-identical

All data are synthetic teaching fixtures. Nothing here describes a real fleet, worker,
chip qualification or measured benchmark. verification/labs-b.py qualifies these cases
with independently written oracles and rejects plausible wrong implementations.
"""
import hashlib
import json
import math
import random
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_FILE = ROOT / 'runtime/code-fixtures-labs-b.json'
REGISTRY_ID, VERSION = 'llm-practical-labs-b', '0.1.0'


# ------------------------------------------------------------------ chapter 9: tiling

def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def tiled_matmul(data):
    a, b, t, c, bv = data['a'], data['b'], data['tile'], data['chunk'], data['bytes_per_value']
    m, kk, n = len(a), len(b), len(b[0])
    ops = 2 * m * n * kk
    reads = 0
    for i0 in range(0, m, t):
        rows = min(t, m - i0)
        for j0 in range(0, n, t):
            cols = min(t, n - j0)
            for k0 in range(0, kk, c):
                depth = min(c, kk - k0)
                reads += rows * depth + depth * cols
    tiled = (reads + m * n) * bv
    intensity = ops / tiled
    roof = min(data['peak_ops_per_s'], data['bandwidth_bytes_per_s'] * intensity)
    return {'c': matmul(a, b), 'ops': ops, 'naive_bytes': (2 * m * n * kk + m * n) * bv, 'tiled_bytes': tiled,
            'lower_bound_bytes': (m * kk + kk * n + m * n) * bv, 'tiled_intensity': intensity, 'roofline_ops_per_s': roof,
            'bound': 'bandwidth' if data['bandwidth_bytes_per_s'] * intensity < data['peak_ops_per_s'] else 'compute'}


# ------------------------------------------------------------------ chapter 10: pipeline and cache

def pipeline_schedule(data):
    d, m, pause = data['stage_times'], data['microbatches'], data['pause']
    s_count = len(d)
    start = [[0] * m for _ in range(s_count)]
    finish = [[0] * m for _ in range(s_count)]
    queued = []
    for s in range(s_count):
        waited = 0
        for j in range(m):
            arrival = finish[s - 1][j] if s else 0
            begin = max(arrival, finish[s][j - 1] if j else 0)
            if pause and pause['stage'] == s and pause['start'] <= begin < pause['end']:
                begin = pause['end']
            start[s][j], finish[s][j] = begin, begin + d[s]
            waited += begin - arrival
        queued.append(waited)
    makespan = finish[-1][-1]
    return {'finish': finish[-1], 'makespan': makespan, 'busy_fraction': [m * d[s] / makespan for s in range(s_count)], 'queued_time': queued}


def cache_admission(data):
    capacity, deadline = data['capacity'], data['deadline']
    cache, queue = [], []  # cache: list of [id, admitted_at] in admission order
    admitted, accepted, expired, rejected, max_queue = {}, [], [], [], 0

    def expire(t):
        if deadline is None:
            return
        for entry in [e for e in cache if e[1] + deadline <= t]:
            cache.remove(entry)
            expired.append(entry[0])

    def fill(t):
        while queue and len(cache) < capacity:
            name = queue.pop(0)
            cache.append([name, t])
            admitted[name] = t

    for event in data['events']:
        t = event['t']
        expire(t)
        fill(t)
        if event['type'] == 'forward':
            queue.append(event['id'])
            fill(t)
        else:
            entry = next((e for e in cache if e[0] == event['id']), None)
            if entry is None:
                rejected.append(event['id'])
            else:
                cache.remove(entry)
                accepted.append(event['id'])
                fill(t)
        max_queue = max(max_queue, len(queue))
    return {'accepted': accepted, 'expired': expired, 'rejected': rejected, 'admitted_at': admitted, 'max_queue': max_queue,
            'cached_end': [e[0] for e in cache], 'queued_end': list(queue)}


# ------------------------------------------------------------------ chapter 11: journal ledger

def journal_ledger(data):
    threshold = data['threshold']
    current, started, registered_at = None, {}, None
    seen, pending, steps, first_done = set(), 0, 0, False
    admission, first_backward, local, submitted, accepted = [], [], set(), set(), set()
    stale = not_counted = 0
    for e in data['events']:
        kind, s, t = e['event'], e['session'], e['t']
        if kind == 'registration_started':
            started[s] = t
            continue
        if kind == 'registered':
            current, registered_at, seen, pending, first_done = s, t, set(), 0, False
            if s in started:
                admission.append(t - started[s])
            continue
        if s != current:
            stale += 1
            continue
        if kind == 'reset':
            current, pending, seen = None, 0, set()
        elif kind == 'backward_complete':
            a = e['activation']
            if not e['ok'] or a in seen:
                not_counted += 1
                continue
            seen.add(a)
            local.add(a)
            if not first_done:
                first_backward.append(t - registered_at)
                first_done = True
            pending += 1
            if pending == threshold:
                steps, pending = steps + 1, 0
        elif kind == 'submitted':
            submitted.add(e['activation'])
        elif kind == 'accepted':
            accepted.add(e['activation'])
    return {'current_session': current, 'admission_wait': admission, 'time_to_first_backward': first_backward,
            'optimizer_steps': steps, 'pending': pending, 'local_backward': sorted(local), 'submitted': sorted(submitted),
            'accepted': sorted(accepted), 'computed_not_accepted': sorted(local - accepted), 'stale_ignored': stale, 'not_counted': not_counted}


# ------------------------------------------------------------------ chapter 12: layout replay

def transpose(x):
    return [list(r) for r in zip(*x)]


def softmax_rows(s):
    out = []
    for row in s:
        top = max(row)
        e = [math.exp(v - top) for v in row]
        z = sum(e)
        out.append([v / z for v in e])
    return out


def attention_parts(q, k, v, d_out, scale, p_forward):
    """Forward through p_forward and the standard pullback that uses the computed output."""
    p = softmax_rows([[scale * x for x in row] for row in matmul(q, transpose(k))])
    o = matmul(p_forward(p), v)
    dp = matmul(d_out, transpose(v))
    d = [sum(a * b for a, b in zip(r1, r2)) for r1, r2 in zip(d_out, o)]
    ds = [[p[i][j] * (dp[i][j] - d[i]) for j in range(len(p))] for i in range(len(p))]
    dq = [[scale * x for x in row] for row in matmul(ds, k)]
    dk = [[scale * x for x in row] for row in matmul(transpose(ds), q)]
    dv = matmul(transpose(p), d_out)
    return {'o': o, 'd': d, 'dq': dq, 'dk': dk, 'dv': dv}


def relabel(p, perm):
    n = len(p)
    flat = [x for row in p for x in row]
    return [[flat[perm[i * n + j]] for j in range(n)] for i in range(n)]


def count_mismatch(a, b):
    fa = a if not isinstance(a[0], list) else [x for r in a for x in r]
    fb = b if not isinstance(b[0], list) else [x for r in b for x in r]
    return sum(1 for x, y in zip(fa, fb) if abs(x - y) > 1e-9 * (1 + abs(y)))


STAGES = ['o', 'd', 'dq', 'dk', 'dv']


def layout_replay(data):
    q, k, v, d_out, scale, perm = data['q'], data['k'], data['v'], data['d_out'], data['scale'], data['perm']
    ref = attention_parts(q, k, v, d_out, scale, lambda p: p)
    cand = attention_parts(q, k, v, d_out, scale, lambda p: relabel(p, perm))
    mismatch = {name: count_mismatch(cand[name], ref[name]) for name in STAGES}
    first = next((name for name in STAGES if mismatch[name]), None)
    pick = lambda parts: {name: parts[name] for name in ['o', 'dq', 'dk', 'dv']}
    return {'reference': pick(ref), 'candidate': pick(cand), 'mismatch': mismatch, 'first_mismatch': first,
            'coordinate_mismatches': sum(1 for i, j in enumerate(perm) if i != j)}


# ------------------------------------------------------------------ chapter 14: evidence ledger

def evidence_ledger(data):
    pairs = [(r, c) for r, c in zip(data['reference_ms'], data['candidate_ms']) if r is not None and c is not None]
    saving = statistics.median([r - c for r, c in pairs]) if pairs else None
    speedup = statistics.median([r / c for r, c in pairs]) if pairs else None
    ledger, independent_pass = {}, False
    for name in data['required']:
        rows = [x for x in data['checks'] if x['name'] == name and x['digest'] == data['candidate_digest']]
        statuses = [x['status'] for x in rows]
        if not rows:
            ledger[name] = 'not_run'
        elif 'fail' in statuses:
            ledger[name] = 'fail'
        elif 'pass' in statuses:
            ledger[name] = 'pass'
            independent_pass = independent_pass or any(x['status'] == 'pass' and x['independent'] for x in rows)
        else:
            ledger[name] = 'inconclusive'
    states = list(ledger.values())
    numerical = 'fail' if 'fail' in states else 'pass' if states and all(s == 'pass' for s in states) and independent_pass else 'inconclusive'
    speed = 'unmeasured' if not pairs else 'faster' if saving > 0 else 'not_faster'
    claim = 'supported' if numerical == 'pass' and speed == 'faster' else 'refuted' if numerical == 'fail' or speed == 'not_faster' else 'inconclusive'
    return {'complete_pairs': len(pairs), 'median_saving_ms': saving, 'median_speedup': speedup, 'ledger': ledger,
            'numerical': numerical, 'speed': speed, 'claim': claim}


TASKS = {'tiled_matmul': tiled_matmul, 'pipeline_schedule': pipeline_schedule, 'cache_admission': cache_admission,
         'journal_ledger': journal_ledger, 'layout_replay': layout_replay, 'evidence_ledger': evidence_ledger}


def solve(data):
    return TASKS[data['task']](data)


# ------------------------------------------------------------------ deterministic hidden cases

def gen_ch09(rng):
    cases = []
    shapes = [(4, 4, 4, 2, 2), (6, 6, 6, 3, 3), (5, 3, 4, 2, 2), (3, 5, 2, 2, 3), (7, 4, 5, 3, 2), (1, 6, 1, 4, 4), (6, 1, 6, 4, 1),
              (5, 5, 5, 5, 5), (4, 6, 3, 1, 1), (8, 3, 2, 3, 2), (2, 7, 3, 4, 3), (5, 2, 7, 2, 4)]
    while len(shapes) < 30:
        shapes.append((rng.randint(1, 8), rng.randint(1, 8), rng.randint(1, 8), rng.randint(1, 5), rng.randint(1, 5)))
    for idx, (m, kk, n, t, c) in enumerate(shapes):
        a = [[rng.randint(-4, 4) for _ in range(kk)] for _ in range(m)]
        b = [[rng.randint(-4, 4) for _ in range(n)] for _ in range(kk)]
        bv = [4, 2, 4, 1, 8][idx % 5]
        peak = rng.choice([1, 2, 4, 8]) * 10 ** 12
        bw = rng.choice([100, 200, 400, 800]) * 10 ** 9 if idx % 3 else rng.choice([4, 8, 16]) * 10 ** 12
        data = {'task': 'tiled_matmul', 'a': a, 'b': b, 'tile': t, 'chunk': c, 'bytes_per_value': bv, 'peak_ops_per_s': peak, 'bandwidth_bytes_per_s': bw}
        out = tiled_matmul(data)
        if abs(bw * out['tiled_intensity'] - peak) < 1e-6 * peak:
            data['bandwidth_bytes_per_s'] = bw + 10 ** 9
        cases.append(data)
    return cases


def gen_ch10(rng):
    cases = [
        {'task': 'pipeline_schedule', 'stage_times': [2, 2, 2], 'microbatches': 4, 'pause': None},
        {'task': 'pipeline_schedule', 'stage_times': [3, 3, 3, 3], 'microbatches': 5, 'pause': None},
        {'task': 'pipeline_schedule', 'stage_times': [1, 4, 2], 'microbatches': 4, 'pause': None},
        {'task': 'pipeline_schedule', 'stage_times': [2, 2, 2], 'microbatches': 4, 'pause': {'stage': 1, 'start': 5, 'end': 11}},
        {'task': 'pipeline_schedule', 'stage_times': [2, 3], 'microbatches': 3, 'pause': {'stage': 1, 'start': 3, 'end': 4}},
        {'task': 'cache_admission', 'capacity': 2, 'deadline': None, 'events': [
            {'t': 0, 'type': 'forward', 'id': 'A'}, {'t': 1, 'type': 'forward', 'id': 'B'}, {'t': 2, 'type': 'forward', 'id': 'C'},
            {'t': 4, 'type': 'gradient', 'id': 'A'}, {'t': 6, 'type': 'gradient', 'id': 'C'}, {'t': 7, 'type': 'gradient', 'id': 'B'}]},
        {'task': 'cache_admission', 'capacity': 2, 'deadline': 5, 'events': [
            {'t': 0, 'type': 'forward', 'id': 'A'}, {'t': 1, 'type': 'forward', 'id': 'B'}, {'t': 2, 'type': 'forward', 'id': 'C'},
            {'t': 5, 'type': 'gradient', 'id': 'A'}, {'t': 6, 'type': 'gradient', 'id': 'B'}, {'t': 9, 'type': 'gradient', 'id': 'C'}]},
        {'task': 'cache_admission', 'capacity': 1, 'deadline': 3, 'events': [
            {'t': 0, 'type': 'forward', 'id': 'A'}, {'t': 1, 'type': 'forward', 'id': 'B'}, {'t': 2, 'type': 'forward', 'id': 'C'},
            {'t': 2, 'type': 'gradient', 'id': 'B'}, {'t': 3, 'type': 'gradient', 'id': 'A'}, {'t': 4, 'type': 'gradient', 'id': 'B'}]},
    ]
    while len(cases) < 34:
        if len(cases) % 2:
            stages = [rng.randint(1, 4) for _ in range(rng.randint(2, 5))]
            m = rng.randint(1, 6)
            pause = None
            if rng.random() < 0.7:
                start = rng.randint(0, 12)
                pause = {'stage': rng.randrange(len(stages)), 'start': start, 'end': start + rng.randint(1, 8)}
            cases.append({'task': 'pipeline_schedule', 'stage_times': stages, 'microbatches': m, 'pause': pause})
        else:
            names = [chr(65 + i) for i in range(rng.randint(3, 7))]
            events, t = [], 0
            pending = list(names)
            issued = []
            while pending or issued:
                t += rng.randint(0, 2)
                if pending and (not issued or rng.random() < 0.55):
                    name = pending.pop(0)
                    events.append({'t': t, 'type': 'forward', 'id': name})
                    issued.append(name)
                else:
                    name = issued.pop(rng.randrange(len(issued)))
                    events.append({'t': t, 'type': 'gradient', 'id': name})
                    if rng.random() < 0.15:
                        events.append({'t': t + 1, 'type': 'gradient', 'id': name})
                        t += 1
            cases.append({'task': 'cache_admission', 'capacity': rng.randint(1, 3), 'deadline': rng.choice([None, 2, 3, 4, 6]), 'events': events})
    return cases


def gen_ch11(rng):
    ev = lambda t, s, kind, a=None, ok=None: {k: v for k, v in {'t': t, 'session': s, 'event': kind, 'activation': a, 'ok': ok}.items() if v is not None}
    cases = [
        {'task': 'journal_ledger', 'threshold': 3, 'events': [
            ev(0, 's1', 'registration_started'), ev(4, 's1', 'registered'), ev(7, 's1', 'forward_complete', 'A'),
            ev(15, 's1', 'backward_complete', 'A', True), ev(16, 's1', 'reset'), ev(12, 's1', 'backward_complete', 'B', True)]},
        {'task': 'journal_ledger', 'threshold': 4, 'events': [
            ev(0, 's1', 'registration_started'), ev(3, 's1', 'registered'), ev(4, 's1', 'backward_complete', 'A', True),
            ev(5, 's1', 'backward_complete', 'B', True), ev(6, 's1', 'backward_complete', 'C', False), ev(7, 's1', 'backward_complete', 'D', True),
            ev(8, 's1', 'backward_complete', 'E', True), ev(9, 's1', 'backward_complete', 'E', True), ev(10, 's1', 'backward_complete', 'F', True),
            ev(11, 's1', 'backward_complete', 'G', True), ev(12, 's1', 'submitted', 'A'), ev(13, 's1', 'accepted', 'A')]},
    ]
    while len(cases) < 30:
        sessions, events, t = rng.randint(1, 3), [], 0
        old = []
        for si in range(sessions):
            s = f's{si + 1}'
            if rng.random() < 0.85:
                events.append(ev(t, s, 'registration_started'))
            t += rng.randint(1, 6)
            events.append(ev(t, s, 'registered'))
            acts = [f'{s}-a{j}' for j in range(rng.randint(1, 7))]
            for a in acts:
                t += rng.randint(1, 3)
                events.append(ev(t, s, 'forward_complete', a))
                if rng.random() < 0.85:
                    t += rng.randint(1, 4)
                    events.append(ev(t, s, 'backward_complete', a, rng.random() < 0.85))
                    if rng.random() < 0.2:
                        events.append(ev(t, s, 'backward_complete', a, True))
                    if rng.random() < 0.5:
                        events.append(ev(t + 1, s, 'upload_attempted', a))
                        if rng.random() < 0.7:
                            events.append(ev(t + 1, s, 'submitted', a))
                            if rng.random() < 0.6:
                                events.append(ev(t + 2, s, 'accepted', a))
                    t += 2
            for e in old:
                if rng.random() < 0.5:
                    events.append(e)
            if rng.random() < 0.7 or si < sessions - 1:
                t += 1
                events.append(ev(t, s, 'reset'))
                old = [ev(t - rng.randint(1, 3), s, 'backward_complete', f'{s}-late{j}', True) for j in range(rng.randint(1, 2))]
        events.extend(old)
        cases.append({'task': 'journal_ledger', 'threshold': rng.randint(2, 4), 'events': events})
    return cases


def gen_ch12(rng):
    q = lambda: rng.choice([-6, -4, -3, -2, -1, 1, 2, 3, 4, 6]) / 4
    cases = []
    specs = ['transpose', 'identity', 'random', 'tied', 'transpose', 'random', 'tied', 'swap']
    while len(cases) < 28:
        kind = specs[len(cases) % len(specs)]
        n, d, dv = rng.choice([2, 3]), rng.choice([1, 2, 3]), rng.choice([1, 2])
        Q = [[q() for _ in range(d)] for _ in range(n)]
        K = [[q() for _ in range(d)] for _ in range(n)]
        V = [[q() for _ in range(dv)] for _ in range(n)]
        dO = [[q() for _ in range(dv)] for _ in range(n)]
        if kind == 'identity':
            perm = list(range(n * n))
        elif kind == 'transpose':
            perm = [j * n + i for i in range(n) for j in range(n)]
        elif kind == 'random':
            perm = list(range(n * n))
            rng.shuffle(perm)
        elif kind == 'swap':
            perm = list(range(n * n))
            a, b = rng.sample(range(n * n), 2)
            perm[a], perm[b] = perm[b], perm[a]
        else:  # tied keys: swapping their columns relabels coordinates without changing values
            K[1] = list(K[0])
            perm = []
            for i in range(n):
                perm += [i * n + 1, i * n] + [i * n + j for j in range(2, n)]
        data = {'task': 'layout_replay', 'q': Q, 'k': K, 'v': V, 'd_out': dO, 'scale': rng.choice([1.0, 0.5, 1 / math.sqrt(d)]), 'perm': perm}
        out = layout_replay(data)
        # Keep counts robust: every compared element differs either negligibly or clearly.
        ref = attention_parts(Q, K, V, dO, data['scale'], lambda p: p)
        cand = attention_parts(Q, K, V, dO, data['scale'], lambda p: relabel(p, perm))
        flat = lambda x: x if not isinstance(x[0], list) else [y for r in x for y in r]
        clear = all(abs(a - b) < 1e-12 * (1 + abs(b)) or abs(a - b) > 1e-5 * (1 + abs(b)) for s in STAGES for a, b in zip(flat(cand[s]), flat(ref[s])))
        if clear and out is not None:
            cases.append(data)
    return cases


def gen_ch14(rng):
    def check(name, digest, status, independent=True):
        return {'name': name, 'digest': digest, 'status': status, 'independent': independent}
    cases = [
        {'task': 'evidence_ledger', 'candidate_digest': 'c1', 'reference_ms': [10, 20, 10, 20], 'candidate_ms': [9, 18, 9, 18], 'required': ['forward', 'gradients'],
         'checks': [check('forward', 'c1', 'pass'), check('gradients', 'c1', 'pass', False), check('gradients', 'c1', 'pass')]},
        {'task': 'evidence_ledger', 'candidate_digest': 'c2', 'reference_ms': [100, 110, 120], 'candidate_ms': [90, 99, 108], 'required': ['forward', 'gradients', 'optimizer'],
         'checks': [check('forward', 'c2', 'pass'), check('gradients', 'c1', 'pass'), check('optimizer', 'c2', 'timeout')]},
        {'task': 'evidence_ledger', 'candidate_digest': 'c3', 'reference_ms': [12, None, 30, 8], 'candidate_ms': [13, 5, 29, 9], 'required': ['forward'],
         'checks': [check('forward', 'c3', 'fail'), check('forward', 'c3', 'pass')]},
        {'task': 'evidence_ledger', 'candidate_digest': 'c4', 'reference_ms': [None, None], 'candidate_ms': [3, 4], 'required': ['forward'],
         'checks': [check('forward', 'c4', 'pass')]},
    ]
    names = ['forward', 'gradients', 'optimizer', 'memory', 'negative_control']
    while len(cases) < 30:
        n = rng.randint(0, 7)
        ref = [rng.randint(20, 200) for _ in range(n)]
        # Order trends so that unpaired and paired comparisons disagree in some cases.
        if rng.random() < 0.5:
            ref.sort()
        cand = [max(1, r + rng.randint(-25, 15)) for r in ref]
        if rng.random() < 0.4 and n:
            cand = list(reversed(sorted(cand)))
        for lst in (ref, cand):
            for i in range(n):
                if rng.random() < 0.12:
                    lst[i] = None
        digest = f'cand{len(cases)}'
        required = rng.sample(names, rng.randint(1, 4))
        checks = []
        for name in required:
            for _ in range(rng.choice([0, 1, 1, 1, 2])):
                checks.append(check(name, digest if rng.random() < 0.8 else 'old', rng.choice(['pass', 'pass', 'pass', 'fail', 'timeout', None]), rng.random() < 0.6))
        rng.shuffle(checks)
        cases.append({'task': 'evidence_ledger', 'candidate_digest': digest, 'reference_ms': ref, 'candidate_ms': cand, 'required': required, 'checks': checks})
    return cases


LABS = [('llm-lab-ch09-tiling-v1', gen_ch09, 1009, 1e-9, 1e-9), ('llm-lab-ch10-pipeline-v1', gen_ch10, 1010, 1e-12, 1e-12),
        ('llm-lab-ch11-journal-v1', gen_ch11, 1011, 0, 0), ('llm-lab-ch12-layout-v1', gen_ch12, 1012, 1e-9, 1e-7),
        ('llm-lab-ch14-evidence-v1', gen_ch14, 1014, 1e-9, 1e-9)]


def build_registry():
    fixtures = []
    for fixture_id, generator, seed, atol, rtol in LABS:
        cases = []
        for i, data in enumerate(generator(random.Random(seed)), 1):
            case = {'id': f'case_{i:03d}', 'input': data, 'expected': solve(json.loads(json.dumps(data)))}
            if atol:
                case['absoluteTolerance'] = atol
            if rtol:
                case['relativeTolerance'] = rtol
            cases.append(case)
        fixtures.append({'id': fixture_id, 'language': 'python', 'cases': cases})
    return {'schemaVersion': 1, 'id': REGISTRY_ID, 'version': VERSION, 'fixtures': fixtures}


def registry_bytes():
    return (json.dumps(build_registry(), separators=(',', ':'), allow_nan=False) + '\n').encode()



def same_values(a, b, rel=1e-12, abs_=1e-15):
    """Structural equality with float tolerance: libm results (exp, log, tanh) may differ in
    the last bit between platforms, so the committed fixture bytes stay authoritative and a
    regeneration elsewhere only has to agree to far below the grading tolerance."""
    if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        if isinstance(a, dict) and isinstance(b, dict):
            return a.keys() == b.keys() and all(same_values(a[k], b[k], rel, abs_) for k in a)
        if isinstance(a, list) and isinstance(b, list):
            return len(a) == len(b) and all(same_values(x, y, rel, abs_) for x, y in zip(a, b))
        return a == b and type(a) is type(b)
    return abs(a - b) <= max(abs_, rel * max(abs(a), abs(b)))

if __name__ == '__main__':
    overlay_file = ROOT / 'content/labs-b.json'
    if sys.argv[1:] == ['--write']:
        FIXTURE_FILE.write_bytes(registry_bytes())
        # Keep the declared evaluator integrity pinned to the exact fixture bytes.
        overlay = json.loads(overlay_file.read_text())
        overlay['extensions'][0]['integrity'] = 'sha256-' + hashlib.sha256(FIXTURE_FILE.read_bytes()).hexdigest()
        overlay_file.write_text(json.dumps(overlay, indent=2, ensure_ascii=False) + '\n')
    elif sys.argv[1:] == ['--check']:
        committed, data = FIXTURE_FILE.read_bytes(), registry_bytes()
        assert committed == data or same_values(json.loads(committed), json.loads(data)), 'Fixture file differs from the deterministic generator'
        integrity = json.loads(overlay_file.read_text())['extensions'][0]['integrity']
        assert integrity == 'sha256-' + hashlib.sha256(FIXTURE_FILE.read_bytes()).hexdigest(), 'Declared integrity differs from the fixture bytes'
    else:
        raise SystemExit('Usage: lab-reference-b.py --write | --check')
    print(json.dumps({'registry': REGISTRY_ID, 'fixtures': len(LABS), 'bytes': FIXTURE_FILE.stat().st_size}))
