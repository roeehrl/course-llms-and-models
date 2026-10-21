"""Reference solutions and deterministic hidden cases for chapter labs 1, 2, 3, 5, 6 and 8.

`python3 -B runtime/lab-reference-a.py --write` writes runtime/code-fixtures-labs-a.json;
`--check` regenerates it in memory and requires byte-identical output. The solver
functions above the GENERATION marker are the authored candidate that
verification/labs-a.py runs through an emulated runner; the generator below never
reaches a learner. Independent oracles live in verification/labs-a.py.
"""
import hashlib
import json
import math
import random
import sys
from pathlib import Path


# ------------------------------------------------------------------ chapter 1
def state_ledger(data):
    params = dict(data['params'])
    frozen = set(data.get('frozen', []))
    grads = {'w': 0.0, 'b': 0.0}
    saved = None
    ledger, changes = [], 0
    for event in data['events']:
        before = (params['w'], params['b'])
        prediction = loss = None
        op = event['op']
        if op == 'forward':
            prediction = params['w'] * event['x'] + params['b']
            if event.get('y') is not None:
                residual = prediction - event['y']
                loss = residual * residual / 2
                saved = (residual, event['x'])
            else:
                saved = None
        elif op == 'backward':
            residual, x = saved
            if 'w' not in frozen:
                grads['w'] += residual * x
            if 'b' not in frozen:
                grads['b'] += residual
        elif op == 'step':
            for name in ('w', 'b'):
                if name not in frozen:
                    params[name] = params[name] - event['lr'] * grads[name]
        elif op == 'zero_grad':
            grads = {'w': 0.0, 'b': 0.0}
        elif op == 'load':
            params = dict(event['params'])
        if (params['w'], params['b']) != before:
            changes += 1
        ledger.append({'op': op, 'w': params['w'], 'b': params['b'], 'grad_w': grads['w'], 'grad_b': grads['b'],
                       'prediction': prediction, 'loss': loss})
    return {'ledger': ledger, 'parameter_changes': changes}


# ------------------------------------------------------------------ chapter 2
def _row_major(shape):
    strides, running = [], 1
    for size in reversed(shape):
        strides.append(running)
        running *= size
    return list(reversed(strides))


def strided_views(data):
    storage = list(data['storage'])
    views = {}
    for spec in data['views']:
        if 'transpose' in spec:
            src = views[spec['transpose']]
            i, j = spec['dims']
            shape, strides = list(src['shape']), list(src['strides'])
            shape[i], shape[j] = shape[j], shape[i]
            strides[i], strides[j] = strides[j], strides[i]
            view = {'offset': src['offset'], 'shape': shape, 'strides': strides}
        elif 'slice' in spec:
            src = views[spec['slice']]
            d, start, stop, step = spec['dim'], spec['start'], spec['stop'], spec['step']
            shape, strides = list(src['shape']), list(src['strides'])
            offset = src['offset'] + start * strides[d]
            shape[d] = (stop - start + step - 1) // step
            strides[d] = strides[d] * step
            view = {'offset': offset, 'shape': shape, 'strides': strides}
        elif 'expand' in spec:
            src = views[spec['expand']]
            target = list(spec['shape'])
            extra = len(target) - len(src['shape'])
            strides = []
            for k, size in enumerate(target):
                if k < extra:
                    strides.append(0)
                else:
                    own = src['shape'][k - extra]
                    strides.append(src['strides'][k - extra] if own == size else 0)
            view = {'offset': src['offset'], 'shape': target, 'strides': strides}
        else:
            view = {'offset': spec['offset'], 'shape': list(spec['shape']), 'strides': list(spec['strides'])}
        row_major = _row_major(view['shape'])
        view['contiguous'] = all(size == 1 or stride == want for size, stride, want in zip(view['shape'], view['strides'], row_major))
        views[spec['name']] = view
    reads = []
    for op in data['ops']:
        view = views[op['view']]
        address = view['offset'] + sum(i * s for i, s in zip(op['index'], view['strides']))
        if op['op'] == 'read':
            reads.append(storage[address])
        else:
            storage[address] = op['value']
    return {'reads': reads, 'storage': storage, 'views': views}


# ------------------------------------------------------------------ chapter 3
def _objective(examples, w, b, reduction):
    total = 0.0
    for e in examples:
        r = w * e['x'] + b - e['y']
        total += r * r / 2
    return total / len(examples) if reduction == 'mean' else total


def _gradient(examples, w, b, reduction):
    gw = gb = 0.0
    for e in examples:
        r = w * e['x'] + b - e['y']
        gw += r * e['x']
        gb += r
    if reduction == 'mean':
        gw, gb = gw / len(examples), gb / len(examples)
    return gw, gb


def gradient_descent(data):
    examples, reduction, eta = data['examples'], data['reduction'], data['eta']
    w, b = data['w'], data['b']
    h = data['h']
    fd = [(_objective(examples, w + h, b, reduction) - _objective(examples, w - h, b, reduction)) / (2 * h),
          (_objective(examples, w, b + h, reduction) - _objective(examples, w, b - h, reduction)) / (2 * h)]
    trajectory = []
    for k in range(data['steps'] + 1):
        gw, gb = _gradient(examples, w, b, reduction)
        trajectory.append({'w': w, 'b': b, 'loss': _objective(examples, w, b, reduction), 'grad_w': gw, 'grad_b': gb})
        if k < data['steps']:
            w, b = w - eta * gw, b - eta * gb
    first, last = trajectory[0]['loss'], trajectory[-1]['loss']
    outcome = 'decreased' if last < first else 'increased' if last > first else 'unchanged'
    return {'trajectory': trajectory, 'finite_difference': fd, 'outcome': outcome}


# ------------------------------------------------------------------ chapter 5
def _fresh_state(n):
    return {'step': 0, 'm': [0.0] * n, 'v': [0.0] * n}


def _optimizer_step(kind, hyper, params, state, grads):
    state = {'step': state['step'] + 1, 'm': list(state['m']), 'v': list(state['v'])}
    out = []
    t = state['step']
    for i, (p, g) in enumerate(zip(params, grads)):
        if kind == 'sgd_momentum':
            state['m'][i] = hyper['mu'] * state['m'][i] + g
            out.append(p - hyper['eta'] * state['m'][i])
        else:
            state['m'][i] = hyper['beta1'] * state['m'][i] + (1 - hyper['beta1']) * g
            state['v'][i] = hyper['beta2'] * state['v'][i] + (1 - hyper['beta2']) * g * g
            mhat = state['m'][i] / (1 - hyper['beta1'] ** t)
            vhat = state['v'][i] / (1 - hyper['beta2'] ** t)
            out.append((1 - hyper['eta'] * hyper['weight_decay']) * p - hyper['eta'] * mhat / (math.sqrt(vhat) + hyper['eps']))
    return out, state


def _public_state(kind, state):
    return {'step': state['step'], 'm': state['m']} if kind == 'sgd_momentum' else dict(state)


def optimizer_resume(data):
    kind, hyper, grads = data['optimizer'], data['hyper'], data['grads']
    params, state = list(data['params']), _fresh_state(len(data['params']))
    straight_p, straight_s = list(params), _fresh_state(len(params))
    for g in grads:
        straight_p, straight_s = _optimizer_step(kind, hyper, straight_p, straight_s, g)
    k = data['checkpoint_after']
    for g in grads[:k]:
        params, state = _optimizer_step(kind, hyper, params, state, g)
    checkpoint = {'params': list(params), 'state': _public_state(kind, state)}
    if data['restore'] == 'params_only':
        state = _fresh_state(len(params))
    for g in grads[k:]:
        params, state = _optimizer_step(kind, hyper, params, state, g)
    return {'checkpoint': checkpoint, 'params': params, 'state': _public_state(kind, state),
            'matches_uninterrupted': params == straight_p}


# ------------------------------------------------------------------ chapter 6
def next_token_loss(data):
    tokens, logits, ignore = data['tokens'], data['logits'], data['ignore']
    targets = tokens[1:]
    probs, losses, rows = [], [], []
    valid = sum(1 for flag in ignore if not flag)
    correct = 0
    for row, target, skip in zip(logits, targets, ignore):
        m = max(row)
        exps = [math.exp(z - m) for z in row]
        total = sum(exps)
        p = [e / total for e in exps]
        probs.append(p)
        if skip:
            losses.append(None)
            rows.append([0.0] * len(row))
            continue
        losses.append(m + math.log(total) - row[target])
        best = max(range(len(row)), key=lambda i: (row[i], -i))
        correct += best == target
        rows.append([(pi - (1.0 if i == target else 0.0)) / valid for i, pi in enumerate(p)])
    mean = sum(l for l in losses if l is not None) / valid
    return {'targets': targets, 'probs': probs, 'losses': losses, 'mean_loss': mean,
            'greedy_accuracy': correct / valid, 'grad': rows}


# ------------------------------------------------------------------ chapter 8
def lora_adapter(data):
    W, A, B = data['W'], data['A'], data['B']
    out, inn, r = len(W), len(W[0]), len(A)
    scale = data['alpha'] / r if data['scale_convention'] == 'alpha_over_r' else data['alpha']
    delta = [[scale * sum(B[i][k] * A[k][j] for k in range(r)) for j in range(inn)] for i in range(out)]
    merged = [[W[i][j] + delta[i][j] for j in range(inn)] for i in range(out)]
    unmerged_out, merged_out = [], []
    for x in data['inputs']:
        base = [sum(W[i][j] * x[j] for j in range(inn)) for i in range(out)]
        inner = [sum(A[k][j] * x[j] for j in range(inn)) for k in range(r)]
        unmerged_out.append([base[i] + scale * sum(B[i][k] * inner[k] for k in range(r)) for i in range(out)])
        merged_out.append([sum(merged[i][j] * x[j] for j in range(inn)) for i in range(out)])
    zero = lambda M: all(v == 0 for row in M for v in row)
    return {'scale': scale, 'delta': delta, 'merged': merged, 'outputs_unmerged': unmerged_out, 'outputs_merged': merged_out,
            'trainable_parameters': r * (inn + out), 'dense_parameters': out * inn,
            'adapter_can_learn': not (zero(A) and zero(B))}


SOLVERS = {'state_ledger': state_ledger, 'strided_views': strided_views, 'gradient_descent': gradient_descent,
           'optimizer_resume': optimizer_resume, 'next_token_loss': next_token_loss, 'lora_adapter': lora_adapter}


def solve(data):
    return SOLVERS[data['task']](data)


# ------------------------------------------------------------------ GENERATION (never shipped to a learner)
ROOT = Path(__file__).resolve().parents[1]
FIXTURE_FILE = ROOT / 'runtime/code-fixtures-labs-a.json'
OVERLAY_FILE = ROOT / 'content/labs-a.json'
TOLERANCE = {'absoluteTolerance': 1e-7, 'relativeTolerance': 1e-7}


def q(rng, lo, hi, denominator=8):
    """A random dyadic-friendly value: k/denominator in [lo, hi]."""
    return rng.randint(int(lo * denominator), int(hi * denominator)) / denominator


def gen_state_ledger(rng, index):
    params = {'w': q(rng, -2, 2), 'b': q(rng, -2, 2)}
    frozen = [] if index % 3 else rng.choice([['b'], ['w']])
    events, has_target = [], False
    for _ in range(rng.randint(4, 12)):
        options = ['forward', 'forward_infer', 'step', 'zero_grad', 'load'] + (['backward', 'backward'] if has_target else [])
        op = rng.choice(options)
        if op == 'forward':
            events.append({'op': 'forward', 'x': q(rng, -3, 3), 'y': q(rng, -4, 4)}); has_target = True
        elif op == 'forward_infer':
            events.append({'op': 'forward', 'x': q(rng, -3, 3)}); has_target = False
        elif op == 'step':
            events.append({'op': 'step', 'lr': rng.choice([0.05, 0.1, 0.25, 0.5])})
        elif op == 'load':
            events.append({'op': 'load', 'params': {'w': q(rng, -2, 2), 'b': q(rng, -2, 2)}})
        else:
            events.append({'op': op})
    # Every case exercises accumulation: two backward calls on one forward, then a step.
    events += [{'op': 'forward', 'x': q(rng, 0.5, 3), 'y': q(rng, -4, 4)}, {'op': 'backward'}, {'op': 'backward'}, {'op': 'step', 'lr': 0.125}]
    data = {'task': 'state_ledger', 'params': params, 'events': events}
    if frozen:
        data['frozen'] = frozen
    return data


def gen_strided_views(rng, index):
    rows, cols = rng.randint(2, 4), rng.randint(2, 4)
    offset = rng.randint(0, 3)
    size = offset + rows * cols + rng.randint(0, 3)
    storage = [10 * (i + 1) for i in range(size)]
    views = [{'name': 'a', 'offset': offset, 'shape': [rows, cols], 'strides': [cols, 1]},
             {'name': 't', 'transpose': 'a', 'dims': [0, 1]}]
    start = rng.randint(0, cols - 2)
    views.append({'name': 's', 'slice': 't', 'dim': 0, 'start': start, 'stop': cols, 'step': rng.choice([1, 2])})
    views.append({'name': 'r', 'slice': 'a', 'dim': 0, 'start': rng.randint(0, rows - 1), 'stop': rows, 'step': 1})
    views.append({'name': 'col', 'slice': 'a', 'dim': 1, 'start': rng.randint(0, cols - 1), 'stop': cols, 'step': cols})
    views.append({'name': 'e', 'expand': 'col', 'shape': [rng.randint(2, 3), rows, rng.randint(2, 4)]})
    if index % 4 == 0:
        views.append({'name': 'tt', 'transpose': 't', 'dims': [1, 0]})
    shapes = {}
    for spec in views:
        shapes[spec['name']] = strided_views({'storage': storage, 'views': views, 'ops': []})['views'][spec['name']]['shape']
    ops = []
    for _ in range(rng.randint(6, 12)):
        name = rng.choice([v['name'] for v in views])
        idx = [rng.randint(0, n - 1) for n in shapes[name]]
        if name != 'e' and rng.random() < 0.4:
            ops.append({'op': 'write', 'view': name, 'index': idx, 'value': rng.randint(-99, -1)})
        else:
            ops.append({'op': 'read', 'view': name, 'index': idx})
    # An asymmetric transposed read after a write through the original exposes aliasing.
    i, j = rng.randint(0, rows - 1), rng.randint(0, cols - 1)
    while rows > 1 and cols > 1 and i == j:
        i, j = rng.randint(0, rows - 1), rng.randint(0, cols - 1)
    ops += [{'op': 'write', 'view': 'a', 'index': [i, j], 'value': 777}, {'op': 'read', 'view': 't', 'index': [j, i]},
            {'op': 'read', 'view': 't', 'index': [0, 1]}]
    return {'task': 'strided_views', 'storage': storage, 'views': views, 'ops': ops}


def gen_gradient_descent(rng, index):
    while True:
        n = rng.randint(1, 4)
        examples = [{'x': q(rng, -3, 3), 'y': q(rng, -5, 5)} for _ in range(n)]
        if all(e['x'] == 0 for e in examples):
            continue
        reduction = 'sum' if index % 2 else 'mean'
        eta = rng.choice([0.01, 0.05, 0.1, 0.2, 0.3, 0.6, 1.0])
        data = {'task': 'gradient_descent', 'examples': examples, 'w': q(rng, -2, 2), 'b': q(rng, -2, 2), 'eta': eta,
                'steps': rng.randint(1, 8), 'reduction': reduction, 'h': rng.choice([1e-3, 1e-4])}
        result = gradient_descent(data)
        first, last = result['trajectory'][0]['loss'], result['trajectory'][-1]['loss']
        if abs(last - first) > 1e-6 * max(1.0, first) and max(abs(t['loss']) for t in result['trajectory']) < 1e9:
            return data


def gen_optimizer_resume(rng, index):
    kind = 'adamw' if index % 2 else 'sgd_momentum'
    n = rng.randint(1, 4)
    steps = rng.randint(2, 5)
    if kind == 'sgd_momentum':
        hyper = {'eta': rng.choice([0.05, 0.1, 0.2]), 'mu': rng.choice([0.5, 0.9])}
    else:
        hyper = {'eta': rng.choice([0.01, 0.05, 0.1]), 'beta1': 0.9, 'beta2': rng.choice([0.99, 0.999]), 'eps': 1e-8,
                 'weight_decay': rng.choice([0.0, 0.01, 0.1])}
    grads = [[q(rng, -3, 3) for _ in range(n)] for _ in range(steps)]
    restore = 'params_only' if index % 4 in (1, 2) else 'full'
    data = {'task': 'optimizer_resume', 'optimizer': kind, 'hyper': hyper, 'params': [q(rng, -2, 2) for _ in range(n)],
            'grads': grads, 'checkpoint_after': rng.randint(1, steps - 1) if index % 7 else 0, 'restore': restore}
    return data


def gen_next_token_loss(rng, index):
    vocab = rng.randint(3, 6)
    length = rng.randint(2, 6)
    tokens = [rng.randrange(vocab) for _ in range(length + 1)]
    shift = 1000.0 if index % 5 == 0 else 0.0
    logits = [[q(rng, -4, 4, 4) + shift for _ in range(vocab)] for _ in range(length)]
    if index % 6 == 1:
        logits[0][tokens[1]] = -60.0  # sharply unfavourable target
    ignore = [rng.random() < 0.25 for _ in range(length)]
    if all(ignore):
        ignore[rng.randrange(length)] = False
    if index % 3 == 2:
        ignore[-1] = True
    return {'task': 'next_token_loss', 'tokens': tokens, 'logits': logits, 'ignore': ignore}


def gen_lora_adapter(rng, index):
    out, inn, r = rng.randint(2, 4), rng.randint(2, 5), rng.randint(1, 2)
    W = [[q(rng, -2, 2, 4) for _ in range(inn)] for _ in range(out)]
    A = [[q(rng, -2, 2, 4) for _ in range(inn)] for _ in range(r)]
    B = [[q(rng, -2, 2, 4) for _ in range(r)] for _ in range(out)]
    if index % 5 == 0:
        B = [[0.0] * r for _ in range(out)]
    if index % 10 == 0:
        A = [[0.0] * inn for _ in range(r)]
    return {'task': 'lora_adapter', 'W': W, 'A': A, 'B': B, 'alpha': rng.choice([1.0, 2.0, 8.0, 16.0]), 'r': r,
            'scale_convention': 'alpha' if index % 3 == 0 else 'alpha_over_r',
            'inputs': [[q(rng, -3, 3, 2) for _ in range(inn)] for _ in range(rng.randint(1, 3))]}


LABS = [
    # (fixture id, generator, case count, seed)
    ('llm-lab-ch01-state-ledger-v1', gen_state_ledger, 24, 101),
    ('llm-lab-ch02-strided-views-v1', gen_strided_views, 24, 202),
    ('llm-lab-ch03-gradient-descent-v1', gen_gradient_descent, 24, 303),
    ('llm-lab-ch05-optimizer-resume-v1', gen_optimizer_resume, 28, 505),
    ('llm-lab-ch06-next-token-loss-v1', gen_next_token_loss, 24, 606),
    ('llm-lab-ch08-lora-adapter-v1', gen_lora_adapter, 24, 808),
]


def build_registry():
    fixtures = []
    for fixture_id, generator, count, seed in LABS:
        rng = random.Random(seed)
        cases = []
        for index in range(count):
            data = generator(rng, index)
            expected = json.loads(json.dumps(solve(data), allow_nan=False))
            cases.append({'id': f'case_{index:03d}', 'input': data, 'expected': expected, **TOLERANCE})
        fixtures.append({'id': fixture_id, 'language': 'python', 'cases': cases})
    return {'schemaVersion': 1, 'id': 'llm-practical-labs-a', 'version': '0.1.0', 'fixtures': fixtures}


COMMON = ('Implement a standard-library Python function `solve(data)` and return the specified JSON value instead of printing it. '
          'The runner calls it once per hidden case; each call must be independent of earlier calls. Object-key order is irrelevant; '
          'array order, shape and discrete types (booleans, integers used as IDs, null) matter. Numeric outputs must be finite. '
          'No network, file access or third-party package is available. A whole attempt has 128 MiB memory, half a CPU, five seconds '
          'and 64 KiB combined output. Test with the separate practice input in the starter; it is not a graded case and its output is not supplied.\n\n'
          'Grading: hidden reference cases are compared with absolute tolerance 1e-7 plus relative tolerance 1e-7 on every number; '
          'everything else must match exactly. This lab is graded and recorded as practical evidence, but it does not block your '
          "progress: the episode's independent checks still decide completion.\n\n")

LAB_ITEMS = [
 dict(chapter=1, id='llm-lab-ch01-state-ledger', episode='fnd-e01-02', objective='fnd-o01-02', fixture='llm-lab-ch01-state-ledger-v1',
  title='a state ledger for forward, backward, step and load',
  body='''Input: `{"task":"state_ledger","params":{"w":w,"b":b},"frozen":[names]?,"events":[...]}`. The model is `prediction = w*x + b`; with a target y the loss is `(prediction - y)^2 / 2`. `frozen` (optional, default empty) lists parameters excluded from training: backward adds nothing to their gradient buffers and `step` never changes them, yet they still affect predictions.

Gradient buffers `grad_w` and `grad_b` start at 0. Process the events in order:
- `{"op":"forward","x":x,"y":y}` computes the prediction and loss with the current parameters and SAVES the residual `prediction - y` and `x` for a later backward. Without `"y"` (pure inference) it computes only the prediction, its loss is null, and it clears the saved values.
- `{"op":"backward"}` ADDS `residual*x` to `grad_w` and `residual` to `grad_b` (only for non-frozen parameters), using the values saved by the most recent forward, even if parameters changed since. It never changes a parameter. Inputs never contain a backward without saved values.
- `{"op":"step","lr":lr}` sets `p = p - lr*grad_p` for each non-frozen parameter. It does not clear the gradients.
- `{"op":"zero_grad"}` sets both gradient buffers to 0.
- `{"op":"load","params":{"w":..,"b":..}}` replaces both parameters (for example, starting fine-tuning from a checkpoint). Gradients and saved values are untouched.

Return `{"ledger":[row,...],"parameter_changes":n}` with one row per event: `{"op":op,"w":w,"b":b,"grad_w":gw,"grad_b":gb,"prediction":p|null,"loss":l|null}` giving the state AFTER the event and the prediction/loss that event produced (null for every event that is not a forward; loss null for an inference forward). `parameter_changes` counts events after which `w` or `b` differs from its value before that event.

The ledger separates what each boundary changes: a forward produces values, a backward produces gradients, only a step or load changes parameters, and two backward calls before one step accumulate.'''),
 dict(chapter=2, id='llm-lab-ch02-strided-views', episode='fnd-e02-02', objective='fnd-o02-02', fixture='llm-lab-ch02-strided-views-v1',
  title='strided views, aliasing and a transpose that must not be assumed contiguous',
  body='''Input: `{"task":"strided_views","storage":[numbers],"views":[...],"ops":[...]}`. Strides are in elements. A view has an offset, a shape and strides; logical index `(i0,i1,...)` addresses storage element `offset + i0*s0 + i1*s1 + ...`. Views are defined in order and may build on earlier views. They never copy storage.
- `{"name":n,"offset":o,"shape":[...],"strides":[...]}` is a view of storage.
- `{"name":n,"transpose":src,"dims":[i,j]}` swaps dimensions i and j of src: both its shape entries and its stride entries swap; the offset is unchanged.
- `{"name":n,"slice":src,"dim":d,"start":a,"stop":z,"step":k}` keeps indices a, a+k, ... below z along d (0 <= a < z <= size, k >= 1): the offset grows by `a*stride_d`, the new size is `ceil((z-a)/k)` and the stride becomes `stride_d*k`. Other dimensions are unchanged.
- `{"name":n,"expand":src,"shape":[...]}` broadcasts src to the target shape, aligning dimensions from the right: new leading dimensions and dimensions of size 1 that grow get stride 0; dimensions whose size is unchanged keep their stride.

Ops run in order on the shared storage: `{"op":"read","view":n,"index":[...]}` reads one element; `{"op":"write","view":n,"index":[...],"value":v}` writes through the view (writes never target an expanded view). Indices are always in bounds.

Return `{"reads":[values in read order],"storage":[final storage],"views":{name:{"offset":o,"shape":[...],"strides":[...],"contiguous":bool}}}` for every defined view. `contiguous` is true exactly when, for every dimension of size greater than 1, the stride equals the row-major stride for the shape (the product of the sizes after that dimension).

Hidden cases write through one view and read through its transpose, use asymmetric positions such as (0,1), slice transposed views and read broadcast views, so a transpose that assumes contiguous strides, a slice that forgets the offset or a copy instead of a view all fail.'''),
 dict(chapter=3, id='llm-lab-ch03-gradient-descent', episode='fnd-e03-03', objective='fnd-o03-03', fixture='llm-lab-ch03-gradient-descent-v1',
  title='gradient descent with a finite-difference check, understepping and overshooting',
  body='''Input: `{"task":"gradient_descent","examples":[{"x":x,"y":y},...],"w":w,"b":b,"eta":eta,"steps":K,"reduction":"mean"|"sum","h":h}`. The model is `prediction = w*x + b`, each example's loss is `(prediction - y)^2 / 2`, and the objective is the mean or the sum of the example losses as `reduction` says.

Run K plain gradient-descent steps `w = w - eta*dObjective/dw`, `b = b - eta*dObjective/db`. Compute both gradients from the same parameter state before changing either parameter.

Return `{"trajectory":[entry,...],"finite_difference":[dw,db],"outcome":o}`. `trajectory` has K+1 entries: entry k is `{"w":..,"b":..,"loss":..,"grad_w":..,"grad_b":..}` for the state after k steps (entry 0 is the initial state), with loss and gradients recomputed at that state. `finite_difference` is the central difference of the objective at the INITIAL parameters, `(f(w+h,b)-f(w-h,b))/(2h)` and `(f(w,b+h)-f(w,b-h))/(2h)`; it should agree with entry 0's analytic gradients, which is the check. `outcome` is "decreased" if the final loss is below the initial loss, "increased" if it is above, otherwise "unchanged".

Learning rates range from tiny (slow progress) to large enough to overshoot and diverge; summed objectives scale gradients with the number of examples. Judge each new state with a freshly recomputed loss, never the old prediction.'''),
 dict(chapter=5, id='llm-lab-ch05-optimizer-resume', episode='ttf-e05-03', objective='ttf-o05-03', fixture='llm-lab-ch05-optimizer-resume-v1',
  title='optimizer state, checkpoints and resume equivalence',
  body='''Input: `{"task":"optimizer_resume","optimizer":"sgd_momentum"|"adamw","hyper":{...},"params":[p...],"grads":[[g...] per step],"checkpoint_after":k,"restore":"full"|"params_only"}`. Gradients are supplied for every step (no model): step s uses `grads[s]`.

Optimizer state is `{"step":t,"m":[...],"v":[...]}`, initially t=0 and zero vectors. Each step first increments t, then per parameter:
- `sgd_momentum` (hyper `eta`, `mu`): `m = mu*m + g`; `p = p - eta*m` (no dampening, no Nesterov; v is unused).
- `adamw` (hyper `eta`, `beta1`, `beta2`, `eps`, `weight_decay`): `m = beta1*m + (1-beta1)*g`; `v = beta2*v + (1-beta2)*g^2`; `mhat = m/(1-beta1^t)`; `vhat = v/(1-beta2^t)`; `p = (1 - eta*weight_decay)*p - eta*mhat/(sqrt(vhat)+eps)` (decoupled decay, not added to g).

Run the first k steps (k may be 0), then take a checkpoint of the parameters and state. Restore it: with `"full"` continue from the checkpointed parameters and state; with `"params_only"` keep the parameters but restart the state from t=0 and zero vectors. Run the remaining steps.

Return `{"checkpoint":{"params":[...],"state":S},"params":[final],"state":S,"matches_uninterrupted":bool}`. S is `{"step":t,"m":[...]}` for sgd_momentum and `{"step":t,"m":[...],"v":[...]}` for adamw. `matches_uninterrupted` is true exactly when the final parameters equal those of one uninterrupted run over all steps, computed the same way (compare your own two runs exactly).

This tests state ownership: the current parameters and gradient alone do not determine a stateful optimizer's next step, and the step counter is state.'''),
 dict(chapter=6, id='llm-lab-ch06-next-token-loss', episode='ttf-e06-02', objective='ttf-o06-02', fixture='llm-lab-ch06-next-token-loss-v1',
  title='next-token probabilities, cross-entropy and logit gradients',
  body='''Input: `{"task":"next_token_loss","tokens":[t0,...,tT],"logits":[[...V scores] x T],"ignore":[bool x T]}`. Position i's logits predict the NEXT token, so its target is `tokens[i+1]` (teacher forcing). Token IDs index the vocabulary of size V. Positions with `ignore[i]` true do not count. At least one position counts.

Return `{"targets":[...T ids],"probs":[[...] x T],"losses":[l or null x T],"mean_loss":x,"greedy_accuracy":a,"grad":[[...] x T]}`:
- `probs[i]` is softmax of `logits[i]` (for every position, including ignored ones).
- `losses[i]` is the natural-log cross-entropy `-log(probs[i][target])` for counted positions and null for ignored ones.
- `mean_loss` averages the counted losses over the counted positions only.
- `greedy_accuracy` is the fraction of counted positions whose highest logit is the target (ties go to the lowest ID).
- `grad[i]` is the derivative of `mean_loss` with respect to `logits[i]`: `(probs[i][j] - [j == target]) / counted` for counted positions and a row of zeros for ignored ones.

Some hidden logits are near 1000 and some targets are sharply unfavourable, so compute softmax and the loss stably (subtract the row maximum; log-sum-exp). An ignored target leaves both the numerator and the denominator of the mean.'''),
 dict(chapter=8, id='llm-lab-ch08-lora-adapter', episode='ttf-e08-04', objective='ttf-o08-04', fixture='llm-lab-ch08-lora-adapter-v1',
  title='a low-rank adapter: dense update, merge and parameter budget',
  body='''Input: `{"task":"lora_adapter","W":[[out x in]],"A":[[r x in]],"B":[[out x r]],"alpha":a,"r":r,"scale_convention":"alpha_over_r"|"alpha","inputs":[[in numbers],...]}`. Vectors are columns: a layer maps x of length `in` to `W x` of length `out`. The adapter update is `DeltaW = s * B @ A` with scale `s = alpha/r` or `s = alpha` as `scale_convention` declares. W stays frozen; A and B are the trainable factors.

Return `{"scale":s,"delta":[[out x in]],"merged":[[out x in]],"outputs_unmerged":[[out] per input],"outputs_merged":[[out] per input],"trainable_parameters":n,"dense_parameters":m,"adapter_can_learn":bool}`:
- `delta` is DeltaW and `merged` is `W + DeltaW`.
- `outputs_unmerged[k]` is `W x + s * B (A x)` computed without forming DeltaW; `outputs_merged[k]` is `merged x`. They agree up to rounding.
- `trainable_parameters` counts the entries of A and B; `dense_parameters` counts the entries of W.
- `adapter_can_learn` is false exactly when A and B are both entirely zero (then the gradient reaching each factor is zero, because it is multiplied by the other factor), otherwise true.'''),
]


def practice(item):
    rng = random.Random(9000 + item['chapter'])
    generator = {f: g for f, g, _, _ in LABS}[item['fixture']]
    return generator(rng, 1)


def overlay(integrity):
    assessments, blocks = [], []
    for item in LAB_ITEMS:
        starter = ('import json\n\ndef solve(data):\n    # Return the JSON value described in the task.\n    pass\n\nif __name__ == "__main__":\n'
                   f'    practice = json.loads({json.dumps(json.dumps(practice(item), separators=(",", ":")))})\n    print(json.dumps(solve(practice)))\n')
        assessments.append({'id': item['id'], 'type': 'code', 'objectiveIds': [item['objective']], 'familyId': item['id'], 'language': 'python',
                            'starterCode': starter,
                            'prompt': f"Chapter {item['chapter']} lab: {item['title']}\n\n" + COMMON + item['body'],
                            'grading': {'evaluatorId': 'llm-practical-labs-a', 'fixtureRef': item['fixture']}})
        blocks.append({'episodeId': item['episode'], 'assessmentId': item['id'], 'position': 'end', 'prefix': 'lab'})
    return {'schemaVersion': 1, 'id': 'labs-a',
            'purpose': 'Chapter labs for chapters 1, 2, 3, 5, 6 and 8 as Python code tasks graded by hidden reference cases on the host sandbox. Each lab is an ungated assessment block at the end of its episode: graded and recorded as practical evidence, never a gate requirement. Fixtures: runtime/code-fixtures-labs-a.json; reference and generator: runtime/lab-reference-a.py; independent qualification: verification/labs-a.py.',
            'extensions': [{'id': 'llm-practical-labs-a', 'version': '0.1.0', 'platforms': ['web'], 'execution': 'server', 'capabilities': ['assessment.evaluate'],
                            'entrypoint': 'runtime/code-fixtures-labs-a.json', 'integrity': integrity,
                            'accessibility': {'keyboard': True, 'reducedMotion': True, 'textAlternative': 'Plain-text protocols, editable Python and textual diagnostic results; no motion, audio or canvas required.'}}],
            'assessments': assessments, 'episodeBlocks': blocks}


def overlay_bytes(fixture_bytes):
    return (json.dumps(overlay('sha256-' + hashlib.sha256(fixture_bytes).hexdigest()), indent=2, ensure_ascii=False) + '\n').encode()


def registry_bytes():
    return (json.dumps(build_registry(), indent=2, allow_nan=False) + '\n').encode()


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    data = registry_bytes()
    lab_overlay = overlay_bytes(data)
    if mode == '--write':
        FIXTURE_FILE.write_bytes(data)
        OVERLAY_FILE.write_bytes(lab_overlay)
        print(json.dumps({'written': ['runtime/code-fixtures-labs-a.json', 'content/labs-a.json'], 'bytes': len(data)}))
    elif mode == '--check':
        assert FIXTURE_FILE.read_bytes() == data, 'Fixture file differs from the deterministic generator'
        assert OVERLAY_FILE.read_bytes() == lab_overlay, 'Lab overlay differs from the generator'
        print(json.dumps({'identical': True, 'bytes': len(data)}))
    else:
        raise SystemExit('usage: lab-reference-a.py --write|--check')
