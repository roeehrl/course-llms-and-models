"""Private authoring oracle. Never publish or mount this file for learners.

All calculations use the standard library. The trusted registry contains results;
this file only generates/verifies them offline. Importing it has no side effects.
"""
import argparse
import copy
import json
import math
from pathlib import Path
import random
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
WEIGHT_KEYS = ('embedding', 'position', 'q', 'k', 'v', 'o', 'up', 'down', 'head')
FIXTURES = (
    ('llm-autodiff-vjp-v1', 'graph_vjp'),
    ('llm-autodiff-training-v1', 'shared_training'),
    ('llm-attention-pullback-v1', 'attention_vjp'),
    ('llm-decoder-step-v1', 'decoder_step'),
    ('llm-qualification-numerics-v1', 'numerical_audit'),
    ('llm-qualification-evidence-v1', 'evidence_audit'),
)


class Dual:
    """Forward sensitivities, independent of the requested reverse-mode engine."""
    def __init__(self, value, derivative):
        self.value = float(value)
        self.derivative = derivative

    def pair(self, other):
        return other if isinstance(other, Dual) else Dual(other, [0.0] * len(self.derivative))

    def __add__(self, other):
        other = self.pair(other)
        return Dual(self.value + other.value, [a + b for a, b in zip(self.derivative, other.derivative)])

    __radd__ = __add__

    def __mul__(self, other):
        other = self.pair(other)
        return Dual(self.value * other.value,
                    [a * other.value + self.value * b for a, b in zip(self.derivative, other.derivative)])

    __rmul__ = __mul__

    def __neg__(self):
        return self * -1.0

    def __sub__(self, other):
        return self + -self.pair(other)

    def __rsub__(self, other):
        return self.pair(other) + -self

    def __pow__(self, power):
        return Dual(self.value ** power,
                    [power * self.value ** (power - 1) * a for a in self.derivative])

    def __truediv__(self, other):
        return self * self.pair(other) ** -1

    def exp(self):
        value = math.exp(self.value)
        return Dual(value, [value * a for a in self.derivative])

    def log(self):
        return Dual(math.log(self.value), [a / self.value for a in self.derivative])

    def tanh(self):
        value = math.tanh(self.value)
        return Dual(value, [(1 - value * value) * a for a in self.derivative])


def value(x):
    return x.value if isinstance(x, Dual) else float(x)


def exp(x):
    return x.exp() if isinstance(x, Dual) else math.exp(x)


def log(x):
    return x.log() if isinstance(x, Dual) else math.log(x)


def tanh(x):
    return x.tanh() if isinstance(x, Dual) else math.tanh(x)


def variables(values):
    return [Dual(x, [float(i == j) for j in range(len(values))]) for i, x in enumerate(values)]


def graph_values(data, injections=None):
    outputs = []
    for i, node in enumerate(data['nodes']):
        op = node['op']
        if op == 'input':
            result = data['inputs'][node['index']]
        elif op == 'const':
            result = node['value']
        else:
            args = [outputs[j] for j in node['args']]
            if op == 'add': result = args[0] + args[1]
            elif op == 'mul': result = args[0] * args[1]
            elif op == 'neg': result = -args[0]
            elif op == 'tanh': result = tanh(args[0])
            else: raise ValueError('unknown graph operation')
        if injections is not None:
            result = result + injections[i]
        outputs.append(result)
    return outputs


def graph_vjp(data):
    # Independent additive perturbations after every node give adjoints of all nodes.
    outputs = graph_values(data, variables([0.0] * len(data['nodes'])))
    queries = []
    for query in data['queries']:
        scalar = sum(outputs[root] * seed for root, seed in zip(query['roots'], query['seeds']))
        node_grads = scalar.derivative
        input_grads = [0.0] * len(data['inputs'])
        for node, grad in zip(data['nodes'], node_grads):
            if node['op'] == 'input': input_grads[node['index']] += grad
        queries.append({'nodes': node_grads, 'inputs': input_grads})
    return {'values': [x.value for x in outputs], 'vjp': queries}


def shared_loss(parameters, data):
    w, b, c = parameters
    total, count = 0.0, 0
    for batch in data['microbatches']:
        for x, target in zip(batch['x'], batch['y']):
            hidden = w * x + b
            prediction = hidden * hidden + c * hidden
            total += 0.5 * (prediction - target) ** 2
            count += 1
    return total / count + 0.5 * data['l2'] * sum(p * p for p in parameters)


def shared_training(data):
    parameters = data['initial'][:]
    trace = []
    for _ in range(data['steps']):
        loss = shared_loss(variables(parameters), data)
        gradient = loss.derivative
        parameters = [p - data['eta'] * g for p, g in zip(parameters, gradient)]
        trace.append({'loss': loss.value, 'grads': gradient, 'parameters': parameters[:]})
    return {'trace': trace, 'final': parameters}


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def matrix_product(a, b):
    return [[dot(row, column) for column in zip(*b)] for row in a]


def add_rows(a, b):
    return [[x + y for x, y in zip(row, other)] for row, other in zip(a, b)]


def rms(rows, epsilon):
    return [[x * (dot(row, row) / len(row) + epsilon) ** -0.5 for x in row] for row in rows]


def softmax(scores):
    largest = max(value(x) for x in scores)
    weights = [exp(x - largest) for x in scores]
    denominator = sum(weights)
    return [x / denominator for x in weights]


def attention(q, k, v, allowed):
    scale = math.sqrt(len(q[0]))
    outputs = []
    for i, query in enumerate(q):
        positions = [j for j, yes in enumerate(allowed[i]) if yes]
        weights = softmax([dot(query, k[j]) / scale for j in positions])
        outputs.append([sum(p * v[j][d] for p, j in zip(weights, positions))
                        for d in range(len(v[0]))])
    return outputs


def flatten(rows):
    return [x for row in rows for x in row]


def reshape(values, rows, columns):
    return [values[i * columns:(i + 1) * columns] for i in range(rows)]


def attention_vjp(data):
    arrays = [data[key] for key in ('q', 'k', 'v')]
    coordinates = variables([x for a in arrays for x in flatten(a)])
    differentiable, cursor = [], 0
    for a in arrays:
        n, d = len(a), len(a[0]); size = n * d
        differentiable.append(reshape(coordinates[cursor:cursor + size], n, d)); cursor += size
    output = attention(*differentiable, data['allowed'])
    objective = sum(x * g for x, g in zip(flatten(output), flatten(data['upstream'])))
    result = {'output': [[x.value for x in row] for row in output]}
    cursor = 0
    for key, a in zip(('dQ', 'dK', 'dV'), arrays):
        n, d = len(a), len(a[0]); size = n * d
        result[key] = reshape(objective.derivative[cursor:cursor + size], n, d); cursor += size
    return result


def flatten_weights(weights):
    return [x for key in WEIGHT_KEYS for x in flatten(weights[key])]


def rebuild_weights(values, template):
    result, cursor = {}, 0
    for key in WEIGHT_KEYS:
        n, d = len(template[key]), len(template[key][0]); size = n * d
        result[key] = reshape(values[cursor:cursor + size], n, d); cursor += size
    return result


def decoder_forward(weights, data):
    t = len(data['tokens'])
    x = add_rows([weights['embedding'][token] for token in data['tokens']], weights['position'][:t])
    normalized = rms(x, data['epsilon'])
    q, k, v = [matrix_product(normalized, weights[name]) for name in ('q', 'k', 'v')]
    allowed = [[j <= i for j in range(t)] for i in range(t)]
    residual = add_rows(x, matrix_product(attention(q, k, v, allowed), weights['o']))
    hidden = [[tanh(x) for x in row] for row in matrix_product(rms(residual, data['epsilon']), weights['up'])]
    z = add_rows(residual, matrix_product(hidden, weights['down']))
    logits = matrix_product(z, weights['head'])
    loss = 0.0
    for row, target, valid in zip(logits, data['targets'], data['valid']):
        if valid:
            largest = max(value(x) for x in row)
            loss += largest + log(sum(exp(x - largest) for x in row)) - row[target]
    return logits, loss / sum(data['valid'])


def decoder_step(data):
    old = flatten_weights(data['weights'])
    weights = rebuild_weights(variables(old), data['weights'])
    logits, loss = decoder_forward(weights, data)
    gradient = loss.derivative
    updated = [x - data['eta'] * g for x, g in zip(old, gradient)]
    return {'logits': [[x.value for x in row] for row in logits], 'loss': loss.value,
            'grads': rebuild_weights(gradient, data['weights']),
            'updated': rebuild_weights(updated, data['weights'])}


def numerical_audit(data):
    reasons = []
    if data['observed_artifact'] != data['required_artifact']: reasons.append('artifact_mismatch')
    if data['observed_configuration'] != data['required_configuration']: reasons.append('configuration_mismatch')
    if data['observed_path'] != 'candidate': reasons.append('candidate_not_executed')
    by_name = {row['name']: row for row in data['channels']}
    reports = []
    for name in data['required_channels']:
        row = by_name.get(name)
        status, maximum, first = 'pass', None, None
        if row is None:
            status = 'missing'
        elif (row['reference_shape'] != row['candidate_shape']
              or math.prod(row['reference_shape']) != len(row['reference'])
              or math.prod(row['candidate_shape']) != len(row['candidate'])):
            status = 'shape'
        elif any(isinstance(x, str) for x in row['reference'] + row['candidate']):
            status = 'nonfinite'
        else:
            errors = [abs(a - b) for a, b in zip(row['candidate'], row['reference'])]
            maximum = max(errors)
            failures = [i for i, (error, ref) in enumerate(zip(errors, row['reference']))
                        if error > data['atol'] + data['rtol'] * abs(ref)]
            if failures: status, first = 'tolerance', failures[0]
        reports.append({'name': name, 'status': status, 'max_abs_error': maximum, 'first_failure': first})
        if status != 'pass': reasons.append(name + ':' + status)
    return {'passed': not reasons, 'reasons': reasons, 'channels': reports}


def evidence_audit(data):
    ratios = []
    for trial in data['trials']:
        ref, cand = trial['reference'], trial['candidate']
        r = len(set(ref['accepted'])) / (ref['completed'] - ref['start'])
        c = len(set(cand['accepted'])) / (cand['completed'] - cand['start'])
        ratios.append(c / r)
    changes = {}
    for allocation in data['allocations']:
        end = max([allocation['owner_end']] + allocation['view_ends'])
        start = allocation['born']
        if end > start:
            changes[start] = changes.get(start, 0) + allocation['bytes']
            changes[end] = changes.get(end, 0) - allocation['bytes']
    live, peak = 0, 0
    for time in sorted(changes):
        live += changes[time]; peak = max(peak, live)
    seen = {r['fault'] for r in data['fault_trials']}
    missing = [name for name in data['required_faults'] if name not in seen]
    escaped = [name for name in data['required_faults']
               if any(r['fault'] == name and not r['rejected'] for r in data['fault_trials'])]
    midpoint = median(ratios)
    reasons = []
    if not data['qualification']['passed']: reasons.append('numerics_unqualified')
    if data['qualification']['artifact'] != data['candidate_artifact']: reasons.append('artifact_mismatch')
    if missing: reasons.append('faults_missing')
    if escaped: reasons.append('faults_escaped')
    if peak > data['memory_limit']: reasons.append('memory_exceeded')
    if midpoint < data['minimum_speedup']: reasons.append('speedup_below_minimum')
    if data['publication']['cancelled']: reasons.append('cancelled')
    if data['publication']['cancelled'] and data['publication']['published']: reasons.append('published_after_cancellation')
    return {'paired_speedups': ratios, 'median_speedup': midpoint, 'peak_bytes': peak,
            'faults_missing': missing, 'faults_escaped': escaped, 'reasons': reasons, 'ready': not reasons}


SOLVERS = dict(graph_vjp=graph_vjp, shared_training=shared_training, attention_vjp=attention_vjp,
               decoder_step=decoder_step, numerical_audit=numerical_audit, evidence_audit=evidence_audit)


def solve(data):
    return SOLVERS[data['task']](data)


def graph_cases():
    rng = random.Random(4031701)
    cases = []
    # Diverse topologies: repeated operands, fan-out, disconnected nodes, repeated
    # input slots, constant roots, seed cancellation, unary derivatives and zeros.
    for i in range(18):
        inputs = [rng.choice([-1.25, -0.5, 0.0, 0.375, 1.125]) for _ in range(3)]
        nodes = [{'op': 'input', 'index': j} for j in range(3)]
        nodes += [{'op': 'const', 'value': -0.625}, {'op': 'input', 'index': 0}]
        nodes += [{'op': 'mul', 'args': [0, 0]}, {'op': 'add', 'args': [5, 4]},
                  {'op': 'mul', 'args': [6, 1]}, {'op': 'add', 'args': [7, 6]},
                  {'op': 'tanh', 'args': [8]}, {'op': 'neg', 'args': [9]}]
        for _ in range(i % 7):
            op = rng.choice(['add', 'mul', 'neg', 'tanh']); refs = [rng.randrange(len(nodes))]
            if op in ['add', 'mul']: refs.append(rng.randrange(len(nodes)))
            nodes.append({'op': op, 'args': refs})
        roots = [len(nodes) - 1, 6]
        queries = [{'roots': roots, 'seeds': [0.75, -1.25]},
                   {'roots': [9, 9, 3], 'seeds': [1.0, -0.5, 0.25]},
                   {'roots': [0, 3], 'seeds': [0.0, -2.0]}]
        if i % 3 == 0: queries[0] = {'roots': [5, 8], 'seeds': [1.25, -0.75]}
        cases.append(dict(task='graph_vjp', inputs=inputs, nodes=nodes, queries=queries))
    return cases


def training_cases():
    rng = random.Random(4031702); cases = []
    for i in range(12):
        batches = []
        for size in ([1, 3] if i % 2 == 0 else [2, 1, 2]):
            batches.append({'x': [rng.uniform(-1.3, 1.3) for _ in range(size)],
                            'y': [rng.uniform(-0.6, 0.9) for _ in range(size)]})
        cases.append(dict(task='shared_training', initial=[rng.uniform(-0.65, 0.65) for _ in range(3)],
                          microbatches=batches, eta=[0.01, 0.025, 0.04][i % 3], steps=1+i % 3,
                          l2=[0.0, 0.125, 0.25][i % 3]))
    return cases


def attention_cases():
    rng = random.Random(7071701); cases = []
    for i in range(18):
        nq, nk, d, dv = 1+i % 4, 2+i % 4, 1+i % 3, 1+(i+1) % 3
        make = lambda n, w: [[rng.uniform(-1.4, 1.4) for _ in range(w)] for _ in range(n)]
        mask = [[rng.random() > 0.35 for _ in range(nk)] for _ in range(nq)]
        for row in mask:
            if not any(row): row[0] = True
        cases.append(dict(task='attention_vjp', q=make(nq, d), k=make(nk, d), v=make(nk, dv),
                          allowed=mask, upstream=make(nq, dv)))
    cases[0] = dict(task='attention_vjp', q=[[1.0]], k=[[0.0], [1200.0]], v=[[-2.0], [7.0]],
                    allowed=[[True, False]], upstream=[[0.625]])
    cases[1] = dict(task='attention_vjp', q=[[0.0, 0.0], [0.75, -0.5]],
                    k=[[1.0, -0.25], [-0.5, 0.625], [0.0, 1.0]],
                    v=[[2.0, -1.0], [-0.5, 1.5], [0.25, 0.75]],
                    allowed=[[True, True, True], [False, True, True]], upstream=[[1.0, -0.5], [-0.25, 1.0]])
    return cases


def decoder_cases():
    rng = random.Random(7071702); cases = []
    for i in range(10):
        vocab, d, width, length = 3+i % 2, 2+(i % 4 == 3), 2+i % 2, 1+i % 3
        positions = length + (i % 2)
        make = lambda n, m: [[rng.uniform(-0.45, 0.45) for _ in range(m)] for _ in range(n)]
        weights = {'embedding': make(vocab, d), 'position': make(positions, d)}
        weights.update({key: make(d, d) for key in ('q', 'k', 'v', 'o')})
        weights.update(up=make(d, width), down=make(width, d), head=make(d, vocab))
        valid = [bool((j+i) % 3) for j in range(length)]; valid[-1] = True
        tokens = [rng.randrange(vocab) for _ in range(length)]
        if length > 1 and i % 2 == 0: tokens[-1] = tokens[0]
        cases.append(dict(task='decoder_step', weights=weights, tokens=tokens,
                          targets=[rng.randrange(vocab) for _ in range(length)], valid=valid,
                          epsilon=[1e-5, 0.01][i % 2], eta=[0.0, 0.025, 0.075][i % 3]))
    # Same prefix, changed future token: causal earlier logits must agree.
    cases[8]['tokens'] = [0, 1, 0]
    cases[9] = copy.deepcopy(cases[8]); cases[9]['tokens'][-1] = 2
    return cases


def numerical_cases():
    base = dict(task='numerical_audit', required_artifact='a-v7', observed_artifact='a-v7',
                required_configuration='shape-f32-r3', observed_configuration='shape-f32-r3',
                observed_path='candidate', required_channels=['output', 'dQ', 'dK', 'dV'],
                atol=0.125, rtol=0.0625, channels=[])
    for name in base['required_channels']:
        base['channels'].append(dict(name=name, reference_shape=[2, 2], candidate_shape=[2, 2],
                                     reference=[0.0, -2.0, 4.0, 0.5], candidate=[0.0, -2.0, 4.0, 0.5]))
    cases = [copy.deepcopy(base) for _ in range(16)]
    cases[1]['channels'][0]['candidate'][0] = 0.125  # inclusive boundary
    cases[2]['channels'][1]['candidate'][1] = -2.5
    cases[3]['channels'].pop(2)
    cases[4]['channels'][0]['candidate_shape'] = [1, 4]
    cases[5]['channels'][2]['candidate'][2] = 'nan'
    cases[6]['observed_artifact'] = 'a-v6'
    cases[7]['observed_configuration'] = 'shape-f16-r3'
    cases[8]['observed_path'] = 'fallback'
    cases[9]['channels'][3]['reference'][0] = 'inf'
    cases[10]['channels'][1]['candidate'].pop()
    cases[11]['channels'][0]['candidate'] = [0.0, -2.125, 4.375, 0.5625]
    cases[12]['observed_path'] = 'not_run'; cases[12]['channels'] = []
    cases[13]['observed_artifact'] = 'other'; cases[13]['channels'][0]['candidate'][0] = -1.0
    cases[14]['atol'] = 0.0; cases[14]['rtol'] = 0.0625
    cases[14]['channels'][0]['reference'] = [8.0, 8.0, 8.0, 8.0]
    cases[14]['channels'][0]['candidate'] = [8.53125, 8.0, 8.0, 8.0]
    cases[15]['channels'][0]['reference_shape'] = [2, 3]
    cases[15]['channels'][0]['candidate'][0] = '-inf'  # shape takes precedence
    extra = copy.deepcopy(base)
    extra['required_channels'] = ['loss', 'dInput']
    extra['channels'] = [dict(name='dInput', reference_shape=[2], candidate_shape=[2],
                              reference=[-1.0, 2.0], candidate=[-1.0, 2.25]),
                         dict(name='loss', reference_shape=[], candidate_shape=[],
                              reference=[1.0], candidate=[1.125])]
    cases.append(extra)
    extra = copy.deepcopy(base)
    extra['channels'].reverse()
    extra['channels'].append(dict(name='unused', reference_shape=[1], candidate_shape=[1],
                                  reference=[0.0], candidate=['nan']))
    cases.append(extra)
    return cases


def evidence_cases():
    required = ['finite_error', 'shape_error', 'stale_artifact', 'fallback', 'cancelled_publication']
    def trial(rd, cd, accepted):
        return {'reference': {'start': 2, 'submitted': 3, 'completed': 2+rd, 'accepted': ['a', 'b']},
                'candidate': {'start': 10, 'submitted': 10.25, 'completed': 10+cd, 'accepted': accepted}}
    base = dict(task='evidence_audit', candidate_artifact='kernel-v4',
                qualification={'artifact': 'kernel-v4', 'passed': True},
                trials=[trial(8, 4, ['a', 'b']), trial(10, 5, ['a', 'b']), trial(6, 3, ['a', 'b'])],
                allocations=[{'id': 'weights', 'bytes': 100, 'born': 0, 'owner_end': 12, 'view_ends': []},
                             {'id': 'activation', 'bytes': 60, 'born': 1, 'owner_end': 4, 'view_ends': [8, 6]},
                             {'id': 'workspace', 'bytes': 50, 'born': 4, 'owner_end': 7, 'view_ends': []}],
                memory_limit=210, minimum_speedup=1.25, required_faults=required,
                fault_trials=[{'fault': name, 'rejected': True} for name in required],
                publication={'cancelled': False, 'published': False})
    cases = [copy.deepcopy(base) for _ in range(16)]
    cases[1]['memory_limit'] = 200
    cases[2]['fault_trials'].pop(2)
    cases[3]['fault_trials'][0]['rejected'] = False
    cases[4]['qualification']['artifact'] = 'kernel-v3'
    cases[5]['publication'] = {'cancelled': True, 'published': True}
    cases[6]['qualification']['passed'] = False
    cases[7]['trials'] = [trial(8, 8, ['a', 'a', 'a', 'b'])]
    cases[8]['trials'] = [trial(8, 2, []), trial(8, 2, ['a'])]
    cases[9]['trials'] = [trial(8, 1, ['a', 'b']), trial(8, 8, ['a', 'b']), trial(8, 8, ['a', 'b'])]
    cases[10]['allocations'] = [{'id': 'one', 'bytes': 200, 'born': 0, 'owner_end': 4, 'view_ends': []},
                                {'id': 'two', 'bytes': 200, 'born': 4, 'owner_end': 8, 'view_ends': []}]
    cases[11]['fault_trials'].insert(0, {'fault': required[0], 'rejected': False})
    cases[12]['publication'] = {'cancelled': True, 'published': False}
    cases[13]['allocations'] = [{'id': 'zero', 'bytes': 9999, 'born': 3, 'owner_end': 3, 'view_ends': []}]
    cases[14]['trials'] = [trial(8, 4, ['a', 'b']), trial(8, 8, ['a', 'b'])]
    cases[14]['minimum_speedup'] = 1.5
    cases[15]['fault_trials'] = []; cases[15]['qualification']['passed'] = False
    cases[15]['memory_limit'] = 1; cases[15]['publication'] = {'cancelled': True, 'published': True}
    return cases


GENERATORS = (graph_cases, training_cases, attention_cases, decoder_cases, numerical_cases, evidence_cases)


def build_registry():
    fixtures = []
    for (fixture_id, task), generate in zip(FIXTURES, GENERATORS):
        cases = []
        for i, data in enumerate(generate(), 1):
            assert data['task'] == task
            cases.append({'id': f'case_{i:03d}', 'input': data, 'expected': solve(data),
                          'absoluteTolerance': 2e-8 if task not in ('numerical_audit', 'evidence_audit') else 1e-10,
                          'relativeTolerance': 2e-7 if task not in ('numerical_audit', 'evidence_audit') else 1e-10})
        fixtures.append({'id': fixture_id, 'language': 'python', 'cases': cases})
    return {'schemaVersion': 1, 'id': 'llm-practical-code', 'version': '0.1.0', 'fixtures': fixtures}


def registry_bytes():
    return (json.dumps(build_registry(), indent=2, allow_nan=False, ensure_ascii=False) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-fixtures', action='store_true', help='explicitly regenerate the private fixture file')
    args = parser.parse_args()
    generated = registry_bytes()
    target = ROOT / 'runtime/code-fixtures.json'
    if args.write_fixtures:
        target.write_bytes(generated)
        print(f'Wrote {len(generated)} bytes; update overlay integrity before use.')
    else:
        assert target.read_bytes() == generated, 'Registry differs from deterministic reference generation'
        print(f'Deterministic reference registry verified ({len(generated)} bytes).')


if __name__ == '__main__':
    main()
