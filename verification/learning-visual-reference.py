"""Independent CPU oracle for the nine learning scenes.

Python standard library only. It never reads scene JSON and never evaluates the
scene expression AST: every expected readout is recomputed here from the
lesson's own definitions (exact binary rounding, a tiny reverse-mode tape,
optimizer objects, math.log/exp softmax, explicit cache enumeration, a lazy
graph, an index-level layout bug, a replay tape and an explicit trial schedule).
Cases go to stdout; learning-visuals.mjs consumes them. No GPU, no network.
"""
import json
import math
import statistics
import struct
from fractions import Fraction
from itertools import product

CASES = []
CHECKS = []


def case(scene, state, time, numeric=None, exact=None, geometry=None):
    CASES.append(dict(scene=scene, state=state, time=time, numeric=numeric or {},
                      exact=exact or {}, geometry=geometry or {}))


def clamp01(v):
    return max(0.0, min(1.0, v))


# ----------------------------------------------------------- 01 float order
FORMATS = {'FP32': (23, 2**127 * (2 - Fraction(1, 2**23))),
           'FP16': (10, Fraction(65504)),
           'BF16': (7, 2**127 * (2 - Fraction(1, 2**7)))}


def round_format(x, fmt):
    """Round an exact rational to the nearest value with p fraction bits (ties to even)."""
    p, largest = FORMATS[fmt]
    if x == 0:
        return Fraction(0)
    sign, m = (1, x) if x > 0 else (-1, -x)
    e = 0
    while Fraction(2) ** e > m:
        e -= 1
    while Fraction(2) ** (e + 1) <= m:
        e += 1
    ulp = Fraction(2) ** (e - p)
    n = round(m / ulp)  # Fraction.__round__ is round-half-even
    value = n * ulp
    if value > largest:
        return math.inf * sign
    return sign * value


def f32(v):
    return struct.unpack('f', struct.pack('f', v))[0]


def f16(v):
    try:
        return struct.unpack('e', struct.pack('e', v))[0]
    except OverflowError:
        return math.inf


def bf16(v):
    bits = struct.unpack('I', struct.pack('f', v))[0]
    bits = (bits + 0x7FFF + ((bits >> 16) & 1)) >> 16
    return struct.unpack('f', struct.pack('I', bits << 16))[0]


HARDWARE = {'FP32': f32, 'FP16': f16, 'BF16': bf16}


def float_orders(fmt, E, b):
    a = Fraction(2) ** E
    if round_format(a, fmt) == math.inf:
        return None
    ab = round_format(a + b, fmt)
    left = round_format(ab - a, fmt)
    bc = round_format(b - a, fmt)
    right = round_format(a + bc, fmt)
    # Cross-check the rational model against struct-level conversions.
    cast = HARDWARE[fmt]
    assert cast(float(a + b)) == float(ab) and cast(float(b - a)) == float(bc)
    assert cast(float(cast(float(a + b)) - float(a))) == float(left)
    assert cast(float(float(a) + cast(float(b - a)))) == float(right)
    return dict(a=a, ab=ab, bc=bc, left=left, right=right)


assert float_orders('FP32', 24, 1)['left'] == 0 and float_orders('FP32', 24, 1)['right'] == 1
assert round_format(Fraction(1) + Fraction(1, 1000), 'FP16') == 1 + Fraction(1, 1024)
assert round_format(Fraction(1) + Fraction(1, 1000), 'BF16') == 1
assert f16(65536.0) == math.inf
CHECKS.append('exact rational round-half-even cross-checked with struct FP32/FP16 and bit-level BF16')

for fmt in ['FP32', 'FP16', 'BF16']:
    p = FORMATS[fmt][0]
    for E in [4, 8, 11, 15, 16, 23, 24]:
        for b in [1, 2, 3, 4]:
            r = float_orders(fmt, E, b)
            for time in [0, 799, 800, 1400, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4400, 4600, 5000]:
                numeric = {'fo-a': E, 'fo-b': b, 'fo-c': E, 'fo-spacing': E - p}
                exact = {'fo-format': f'{fmt} · {p} fraction bits',
                         'fo-range': 'a overflows FP16: inf' if r is None else 'a is representable'}
                geometry = {}
                for key, first, rnd, res, anim, label, sign in [
                        ('left', 800, 2200, 2600, 1400, '(a+b)+c = ', 'a+'),
                        ('right', 3000, 4200, 4400, 3400, 'a+(b+c) = ', '−a+')]:
                    shown = time >= first and r is not None
                    geometry[f'fo-{key}-marker'] = {'opacity': float(shown)}
                    geometry[f'fo-{key}-exactdot'] = {'opacity': float(shown)}
                    if time < first:
                        exact[f'fo-{key}-exact'] = 'exact: …'
                        exact[f'fo-{key}-grid'] = 'grid: …'
                    elif r is None:
                        exact[f'fo-{key}-exact'] = 'exact: inf'
                        exact[f'fo-{key}-grid'] = 'grid: none'
                    else:
                        exact[f'fo-{key}-exact'] = f'exact: {sign}{b}'
                    if r is not None:
                        # neighbours of the exact sum, measured from a (left) or −a (right)
                        spacing = Fraction(2) ** (E - p) if key == 'left' else Fraction(2) ** (E - 1 - p)
                        lower = (Fraction(b) // spacing) * spacing
                        stored = r['ab'] - r['a'] if key == 'left' else r['bc'] + r['a']
                        if time >= first:
                            numeric[f'fo-{key}-grid'] = float(lower + spacing)
                        exact_x = 24 + 240 * float((b - lower) / spacing)
                        round_x = 24 + 240 * float((stored - lower) / spacing)
                        geometry[f'fo-{key}-marker']['x'] = exact_x + (round_x - exact_x) * clamp01((time - anim) / 800)
                        geometry[f'fo-{key}-exactdot']['x'] = exact_x
                    if time < rnd:
                        exact[f'fo-{key}-round'] = 'stored: …'
                    elif r is None:
                        exact[f'fo-{key}-round'] = 'stored: inf'
                    else:
                        numeric[f'fo-{key}-round'] = float(stored)
                    if time < res:
                        exact[f'fo-{key}-result'] = label + '…'
                    elif r is None:
                        exact[f'fo-{key}-result'] = label + 'NaN'
                    else:
                        numeric[f'fo-{key}-result'] = float(r[key])
                numeric['fo-truth'] = b
                if time < 4600:
                    exact['fo-verdict-text'] = '…'
                elif r is None:
                    exact['fo-verdict-text'] = 'NaN: finiteness fails'
                elif r['left'] == r['right'] == b:
                    exact['fo-verdict-text'] = 'Both orders exact'
                elif r['left'] == r['right']:
                    exact['fo-verdict-text'] = 'Agree, both lost b'
                else:
                    exact['fo-verdict-text'] = 'Order changed answer'
                case('learning-float-order', dict(fmt=fmt, E=E, b=b), time, numeric, exact, geometry)

# ----------------------------------------------------------- 02 fan-out backward
def tape_backward(w, rule):
    """Reverse traversal of [s = w*w, z = s + w]; returns (time, bar(w)) after each event."""
    program = [('mul', ('w', 'w'), 's'), ('add', ('s', 'w'), 'z')]
    value = {'w': w}
    for kind, (x, y), out in program:
        value[out] = value[x] * value[y] if kind == 'mul' else value[x] + value[y]
    grad = {'z': 1.0, 's': 0.0, 'w': 0.0}
    events = []
    clock = iter([2300, 3300, 4300])
    for kind, (x, y), out in reversed(program):
        local = [1.0, 1.0] if kind == 'add' else [value[y], value[x]]
        slots = list(zip((x, y), local))
        if kind == 'add':
            at = next(clock)
            for name, d in slots:
                c = grad[out] * d
                grad[name] = c if (rule == 'Overwrite (=)' and name == 'w') else grad[name] + c
            events.append((at, grad['w']))
        else:
            for index, (name, d) in enumerate(slots):
                at = next(clock)
                if rule == 'One slot only' and index == 1:
                    events.append((at, grad['w']))
                    continue
                c = grad[out] * d
                grad[name] = c if rule == 'Overwrite (=)' else grad[name] + c
                events.append((at, grad['w']))
    return value, events


for w in [-3.0, -1.0, -0.5, 0.0, 1.0, 2.5, 3.0]:
    h = 1e-6
    central = ((w + h) ** 2 + (w + h) - (w - h) ** 2 - (w - h)) / (2 * h)
    assert abs(central - (2 * w + 1)) < 1e-6
    for rule in ['Accumulate (+=)', 'Overwrite (=)', 'One slot only']:
        value, events = tape_backward(w, rule)
        final = events[-1][1]
        for rate in [0.0, 0.1, 0.2]:
            for time in [0, 499, 500, 1000, 1500, 2299, 2300, 3299, 3300, 4299, 4300, 5199, 5200, 6000]:
                buffer = 0.0
                for at, g in events:
                    if time >= at:
                        buffer = g
                numeric = {'fa-w': w, 'fa-grad': buffer, 'fa-symbolic': 2 * w + 1, 'fa-rate': rate,
                           'fa-stored': w - rate * final if time >= 5200 else w,
                           'fa-updates': 1 if time >= 5200 else 0}
                exact = {'fa-rule': f'rule: {rule}'}
                if time >= 500:
                    numeric['fa-s'] = value['s']
                else:
                    exact['fa-s'] = 's = …'
                if time >= 1000:
                    numeric['fa-z'] = value['z']
                else:
                    exact['fa-z'] = 'z = …'
                exact['fa-seed'] = 'seed bar(z) = 1' if time >= 1500 else 'seed bar(z) = …'
                if time >= 3300:
                    numeric['fa-slot-a'] = w
                else:
                    exact['fa-slot-a'] = 'slot A: …'
                if time < 4300:
                    exact['fa-slot-b'] = 'slot B: …'
                elif rule == 'One slot only':
                    exact['fa-slot-b'] = 'slot B: skipped'
                else:
                    numeric['fa-slot-b'] = w
                if time >= 4300:
                    exact['fa-verdict'] = 'bar(w) equals 2w+1' if final == 2 * w + 1 else 'bar(w) differs: bug'
                else:
                    exact['fa-verdict'] = '…'
                geometry = {'fa-grad-bar': {'width': 12 * abs(buffer)}}
                case('learning-fanout-backward', dict(w=w, rule=rule, rate=rate), time, numeric, exact, geometry)
assert tape_backward(3.0, 'Accumulate (+=)')[1][-1][1] == 7
assert tape_backward(3.0, 'One slot only')[1][-1][1] == 4
assert tape_backward(3.0, 'Overwrite (=)')[1][-1][1] == 3
CHECKS.append('reverse-mode tape with fan-out; central difference 2w+1; overwrite/one-slot negative rules')


# ----------------------------------------------------------- 03 optimizer state
class SGD:
    def __init__(self):
        self.state = {}

    def step(self, w, g):
        return w - 0.1 * g


class Momentum:
    def __init__(self):
        self.state = {'m': 0.0}

    def step(self, w, g):
        self.state['m'] = 0.9 * self.state['m'] + g
        return w - 0.1 * self.state['m']


class AdamW:
    def __init__(self):
        self.state = {'m': 0.0, 'v': 0.0, 't': 0}

    def step(self, w, g):
        st = self.state
        st['t'] += 1
        st['m'] = 0.9 * st['m'] + (1 - 0.9) * g
        st['v'] = 0.99 * st['v'] + (1 - 0.99) * g * g
        mhat = st['m'] / (1 - 0.9 ** st['t'])
        vhat = st['v'] / (1 - 0.99 ** st['t'])
        return (1 - 0.1 * 0.1) * w - 0.1 * mhat / (math.sqrt(vhat) + 1e-8)


OPTIMIZERS = {'SGD': SGD, 'Momentum': Momentum, 'AdamW': AdamW}


def two_steps(name, g2, drop):
    opt = OPTIMIZERS[name]()
    w1 = opt.step(1.0, 2.0)
    state1 = dict(opt.state)
    if drop:
        opt = OPTIMIZERS[name]()
    w2 = opt.step(w1, g2)
    return w1, state1, w2, dict(opt.state)


assert abs(two_steps('Momentum', -1, False)[2] - 0.72) < 1e-12
assert abs(two_steps('Momentum', -1, True)[2] - 0.9) < 1e-12
assert abs(two_steps('AdamW', -1, False)[0] - 0.89) < 1e-8
for name in OPTIMIZERS:
    for g2 in [-2.0, -1.0, 0.0, 0.5, 2.0]:
        for drop in [False, True]:
            w1, s1, w2, s2 = two_steps(name, g2, drop)
            for params in [1, 6, 12]:
                for weights in ['FP32 weights', 'BF16 weights']:
                    wb = 4 if weights.startswith('FP32') else 2
                    buffers = len([k for k in s1 if k in ('m', 'v')])
                    ledger = {'weights': params * wb, 'gradients': params * wb, 'state': params * buffers * 4}
                    total = sum(ledger.values())
                    for time in [0, 1199, 1200, 2599, 2600, 3199, 3200, 4500]:
                        numeric = {'op-n': params, 'op-weights': ledger['weights'], 'op-grads': ledger['gradients'],
                                   'op-state': ledger['state'], 'op-total': total, 'op-per': total / params,
                                   'op-g2': g2}
                        exact = {}
                        if time < 1200:
                            exact.update({'op-w1': 'w1 = …', 'op-state1': 'state: …'})
                        else:
                            numeric['op-w1'] = w1
                            if name == 'SGD':
                                exact['op-state1'] = 'state: none'
                            else:
                                numeric['op-state1'] = s1['v'] if name == 'AdamW' else s1['m']
                        if time < 2600:
                            exact['op-carry'] = 'carry: …'
                        else:
                            exact['op-carry'] = ('nothing to carry' if name == 'SGD' else
                                                 'state dropped (bug)' if drop else 'state carried')
                        if time < 3200:
                            exact.update({'op-w2': 'w2 = …', 'op-m2': 'm = …', 'op-v2': 'v = …', 'op-t': 't = …'})
                        else:
                            numeric['op-w2'] = w2
                            if name == 'SGD':
                                exact.update({'op-m2': 'state: none', 'op-v2': 'no moments', 'op-t': 'no step count'})
                            elif name == 'Momentum':
                                numeric['op-m2'] = s2['m']
                                exact.update({'op-v2': 'no v buffer', 'op-t': 'no step count'})
                            else:
                                numeric.update({'op-m2': s2['m'], 'op-v2': s2['v'], 'op-t': s2['t']})
                        geometry = {'op-bar-w': {'x': 16, 'width': 1.25 * ledger['weights']},
                                    'op-bar-g': {'x': 16 + 1.25 * ledger['weights'], 'width': 1.25 * ledger['gradients']},
                                    'op-bar-s': {'x': 16 + 1.25 * (ledger['weights'] + ledger['gradients']),
                                                 'width': 1.25 * ledger['state']}}
                        case('learning-optimizer-state',
                             dict(optimizer=name, g2=g2, dropState=drop, params=params, weights=weights),
                             time, numeric, exact, geometry)
assert 6 * (4 + 4 + 4 + 4) == 96 and 6 * (2 + 2 + 4 + 4) == 72
CHECKS.append('optimizer objects with carried/dropped state; AdamW bias correction; byte ledger 96 vs 72')

# ----------------------------------------------------------- 04 softmax cross-entropy
STEP = math.log(2) / 4


def softmax_ce(logits, target):
    m = max(logits)
    weights = [math.exp(v - m) for v in logits]
    total = math.fsum(weights)
    probs = [v / total for v in weights]
    loss = m + math.log(total) - logits[target]
    grad = [p - (1.0 if i == target else 0.0) for i, p in enumerate(probs)]
    return m, probs, loss, grad


_, p0, l0, g0 = softmax_ce([math.log(2), 0, 0], 1)
assert abs(l0 - math.log(4)) < 1e-12 and [round(v, 12) for v in g0] == [0.5, -0.75, 0.25]
assert abs(softmax_ce([math.log(2) + 1000, 1000, 1000], 1)[2] - math.log(4)) < 1e-10
try:
    math.exp(1000)
    raise AssertionError('naive exponential did not overflow')
except OverflowError:
    pass
for k in [-12, -5, -1, 0, 1, 4, 9, 16]:
    z0 = k * STEP
    for shift in [0, 100, 1000]:
        logits = [z0 + shift, shift, shift]
        for target in [0, 1, 2]:
            m, probs, loss, grad = softmax_ce(logits, target)
            for i in range(3):  # finite differences of the loss w.r.t. each logit
                h = 1e-6
                up = list(logits); up[i] += h
                down = list(logits); down[i] -= h
                fd = (softmax_ce(up, target)[2] - softmax_ce(down, target)[2]) / (2 * h)
                assert abs(fd - grad[i]) < 1e-5
            greedy = max(range(3), key=lambda i: (logits[i], -i))
            for time in [0, 799, 800, 1600, 2100, 2600, 2800, 3400, 3600, 4000]:
                numeric = {f'ce-z-{i}': v for i, v in enumerate(logits)}
                exact = {'ce-target': f'target = ID {target}'}
                for i in range(3):
                    if time >= 800:
                        numeric[f'ce-c-{i}'] = logits[i] - m
                    else:
                        exact[f'ce-c-{i}'] = '…'
                    if time >= 1600:
                        numeric[f'ce-p-{i}'] = probs[i]
                    else:
                        exact[f'ce-p-{i}'] = f'p{i} = …'
                    if time >= 3400:
                        numeric[f'ce-g-{i}'] = grad[i]
                    else:
                        exact[f'ce-g-{i}'] = f'∂/∂z{i} = …'
                if time >= 1600:
                    numeric['ce-sum'] = math.fsum(probs)
                if time >= 2800:
                    numeric['ce-value'] = loss
                    exact['ce-acc'] = f"greedy ID {greedy}: {'hit' if greedy == target else 'miss'}"
                else:
                    exact['ce-value'] = 'loss = …'
                if time >= 3400:
                    numeric['ce-gsum'] = math.fsum(grad)
                reveal = clamp01((time - 1600) / 1000)
                grow = clamp01((time - 3400) / 400)
                geometry = {f'ce-p-bar-{i}': {'width': 256 * probs[i] * reveal} for i in range(3)}
                geometry.update({f'ce-g-bar-{i}': {'x': 144 + 100 * min(0.0, grad[i]), 'width': 100 * abs(grad[i]) * grow}
                                 for i in range(3)})
                case('learning-softmax-cross-entropy', dict(z0=z0, target=f'ID {target}', shift=shift), time,
                     numeric, exact, geometry)
CHECKS.append('math.log/exp cross-entropy; finite-difference logit gradients; +1000 shift invariance; naive exp overflow')

# ----------------------------------------------------------- 05 KV cache
def cache_bytes(L, B, T, H, D, nbytes):
    per_token = sum(nbytes for _ in product(range(L), range(B), range(H), range(D), ('K', 'V')))
    return per_token, per_token * T


assert cache_bytes(3, 2, 5, 2, 4, 2)[1] == 960
KV_STATES = [dict(layers=3, batch=2, kvHeads=2, headDim=4, bytes=2, prompt=5, queryHeads=4),
             dict(layers=4, batch=4, kvHeads=4, headDim=16, bytes=4, prompt=8, queryHeads=8),
             dict(layers=1, batch=1, kvHeads=1, headDim=4, bytes=2, prompt=1, queryHeads=1)]
for L, B, H, D, nb, P, Q in product([1, 3, 4], [1, 2, 4], [1, 2], [4, 12], [2, 4], [1, 5, 8], [4]):
    if (L * 7 + B * 5 + H * 3 + D + nb + P) % 6 == 0:  # deterministic thinning of the grid
        KV_STATES.append(dict(layers=L, batch=B, kvHeads=H, headDim=D, bytes=nb, prompt=P, queryHeads=Q))
for st in KV_STATES:
    L, B, H, D, nb, P, Q = (st[k] for k in ['layers', 'batch', 'kvHeads', 'headDim', 'bytes', 'prompt', 'queryHeads'])
    prefill_pairs = sum(1 for i in range(P) for j in range(P) if j <= i)
    for time in [0, 999, 1000, 2500, 4500, 7999, 8000, 8500]:
        n = min(8, int(time // 1000))
        T = P + n
        per_token, total = cache_bytes(L, B, T, H, D, nb)
        numeric = {'kv-l': L, 'kv-b': B, 'kv-h': H, 'kv-d': D, 'kv-e': nb, 'kv-q': Q, 'kv-t': T,
                   'kv-bytes': total, 'kv-pertoken': per_token}
        exact = {}
        if n == 0:
            exact['kv-phase'] = 'prefill: prompt only'
            numeric['kv-reads'] = prefill_pairs
        else:
            numeric['kv-phase'] = n
            numeric['kv-reads'] = len([j for j in range(T)])
        geometry = {'kv-bar': {'width': 256 * total / cache_bytes(L, B, P + 8, H, D, nb)[1]}}
        for j in range(16):
            geometry[f'kv-prompt-{j}'] = {'opacity': float(j < P)}
            geometry[f'kv-new-{j}'] = {'opacity': float(P <= j < T)}
        case('learning-kv-cache', st, time, numeric, exact, geometry)
CHECKS.append('cache bytes by explicit element enumeration (960 B lesson case); causal pair counting')


# ----------------------------------------------------------- 06 lazy evaluation
class Lazy:
    def __init__(self, graph):
        self.graph, self.values = graph, {}

    def eval(self, *names):
        for name in names:
            deps, fn = self.graph[name]
            self.eval(*deps)
            if name not in self.values:
                self.values[name] = fn(*[self.values[d] for d in deps])


X, Y = [1.0, 2.0], [2.0, 4.0]
COST = {'r': 0.6, 'L': 0.5, 'g': 1.5, 'w_new': 0.3}


def lazy_graph(w, lr):
    return {'r': ((), lambda: [w * x - y for x, y in zip(X, Y)]),
            'L': (('r',), lambda r: 0.5 * statistics.fmean(v * v for v in r)),
            'g': (('r',), lambda r: statistics.fmean(v * x for v, x in zip(r, X))),
            'w_new': (('g',), lambda g: w - lr * g)}


chk = Lazy(lazy_graph(1.0, 0.1)); chk.eval('L', 'g', 'w_new')
assert chk.values['L'] == 1.25 and chk.values['g'] == -2.5 and chk.values['w_new'] == 1.25
assert 0.5 * statistics.fmean((1.25 * x - y) ** 2 for x, y in zip(X, Y)) == 0.703125
REQUEST = {'Stop after build': (), 'eval(loss)': ('L',), 'eval(loss, grad, w_new)': ('L', 'g', 'w_new')}
for mode, request in REQUEST.items():
    for w in [0.0, 0.75, 1.0, 2.0, 3.0]:
        for lr in [0.0, 0.1, 0.4]:
            graph = Lazy(lazy_graph(w, lr))
            graph.eval(*request)
            done = graph.values
            timed = 0.4 + sum(COST[k] for k in done)
            nxt = None
            if 'w_new' in done:
                nxt = 0.5 * statistics.fmean((done['w_new'] * x - y) ** 2 for x, y in zip(X, Y))
            for time in [0, 399, 400, 800, 1200, 1600, 2799, 2800, 3200, 4200, 5000]:
                numeric = {'lz-w': w, 'lz-rate': lr}
                exact = {'lz-mode': mode}
                for node, label, built, key in [('lz-r', 'r', 400, 'r'), ('lz-loss', 'L', 800, 'L'),
                                                ('lz-grad', 'g', 1200, 'g'), ('lz-wnew', 'w_new', 1600, 'w_new')]:
                    if time < built:
                        exact[node] = f'{label}: not built'
                    elif key in done and time >= 2800:
                        numeric[node] = done[key][-1] if key == 'r' else done[key]
                    else:
                        exact[node] = f'{label}: pending'
                if time >= 3200:
                    numeric['lz-timed'] = timed
                    numeric['lz-work'] = timed
                else:
                    exact['lz-timed'] = 'timed = …'
                if time >= 4200:
                    exact['lz-ready'] = 'ready' if nxt is not None else 'not ready'
                    if nxt is None:
                        exact['lz-next-loss'] = 'next L: unknown'
                    else:
                        numeric['lz-next-loss'] = nxt
                else:
                    exact['lz-ready'] = '…'
                case('learning-lazy-evaluation', {'eval': mode, 'w': w, 'lr': lr}, time, numeric, exact)
CHECKS.append('lazy graph materializes requested outputs and dependencies only; invented cost ledger')


# ----------------------------------------------------------- 07 finite but wrong
def kernel(P, V, transposed):
    """Row-major flat buffer; the bug indexes it with column-major strides."""
    flat = [P[0][0], P[0][1], P[1][0], P[1][1]]
    def at(i, k):
        return flat[k * 2 + i] if transposed else flat[i * 2 + k]
    return [[sum(at(i, k) * V[k][j] for k in range(2)) for j in range(2)] for i in range(2)]


def reference_mm(A, Bm):
    return [[math.fsum(A[i][k] * Bm[k][j] for k in range(2)) for j in range(2)] for i in range(2)]


V = [[2.0, -1.0], [4.0, 3.0]]
assert [[round(v, 12) for v in r] for r in kernel([[.25, .75], [.6, .4]], V, True)] == [[2.9, 1.55], [3.1, 0.45]]
for layout in ['Transposed read (bug)', 'Correct row read']:
    bug = layout.startswith('Transposed')
    for a in [0.0, 0.25, 0.5, 0.75, 1.0]:
        for b in [0.0, 0.25, 0.6, 0.75, 1.0]:
            P = [[a, 1 - a], [b, 1 - b]]
            cand = kernel(P, V, bug)
            again = kernel(P, V, bug)
            assert cand == again and all(math.isfinite(v) for r in cand for v in r)
            ref = reference_mm(P, V)
            diff = [cand[i][j] - ref[i][j] for i in range(2) for j in range(2)]
            max_err = max(abs(d) for d in diff)
            rel = math.sqrt(math.fsum(d * d for d in diff)) / math.sqrt(math.fsum(v * v for r in ref for v in r))
            d_cand = cand[0][0] * 1 + cand[0][1] * 2
            d_ref = ref[0][0] * 1 + ref[0][1] * 2
            read_cells = {(k, 0) if bug else (0, k) for k in range(2)}
            for time in [0, 999, 1000, 1800, 2600, 3200, 4000]:
                numeric = {f'fw-p-v-{i}-{j}': P[i][j] for i in range(2) for j in range(2)}
                exact = {'fw-sym': 'P symmetric: blind probe' if abs(a + b - 1) < 1e-9 else 'P is not symmetric'}
                geometry = {f'fw-p-hl-{i}-{j}': {'opacity': (0.25 if (i, j) in read_cells else 0.0) if time >= 1000 else 0.0}
                            for i in range(2) for j in range(2)}
                for i, j in product(range(2), range(2)):
                    if time >= 1800:
                        numeric[f'fw-o-{i}-{j}'] = cand[i][j]
                    else:
                        exact[f'fw-o-{i}-{j}'] = '…'
                    if time >= 2600:
                        numeric[f'fw-r-{i}-{j}'] = ref[i][j]
                    else:
                        exact[f'fw-r-{i}-{j}'] = '…'
                if time >= 3200:
                    exact.update({'fw-finite': '1 finite: PASS', 'fw-repeat': '2 repeat run: PASS',
                                  'fw-verdict': 'Matches reference' if max_err < 1e-9 else 'Finite, yet wrong',
                                  'fw-gate': 'gate: PASS' if max_err < 1e-9 else 'gate: FAIL'})
                    numeric.update({'fw-maxerr': max_err, 'fw-rel': rel, 'fw-dcand': d_cand, 'fw-dref': d_ref})
                else:
                    exact.update({'fw-verdict': '…', 'fw-maxerr': '3 max |O−ref| = …'})
                case('learning-finite-but-wrong', dict(layout=layout, a=a, b=b), time, numeric, exact, geometry)
CHECKS.append('index-level transposed read vs reference matmul; symmetric probe blind spot; damaged D row')


# ----------------------------------------------------------- 08 recompute replay
def run_replay(policy, early, x):
    params = {'w1': 2.0, 'w2': 3.0}
    forward_params = dict(params)
    h = params['w1'] * x
    y = params['w2'] * h
    saved = {'h': h, 'w2': params['w2']} if policy == 'Save h' else None
    snapshot = dict(params) if policy == 'Recompute, saved weights' else None
    params['w2'] = early  # an optimizer writes before backward
    if saved is not None:
        w2, h_used, replayed = saved['w2'], saved['h'], 0
    else:
        source = snapshot if snapshot is not None else params
        w2, h_used, replayed = source['w2'], source['w1'] * x, 1024
    grad_w1 = w2 * x
    grad_w2 = h_used
    eps = 1e-6
    ref = (forward_params['w2'] * (forward_params['w1'] + eps) * x
           - forward_params['w2'] * (forward_params['w1'] - eps) * x) / (2 * eps)
    return dict(h=h, y=y, w2=w2, g1=grad_w1, g2=grad_w2, ref=ref, retained=4096 if saved else 0, replayed=replayed)


assert run_replay('Recompute, current weights', 5.0, 4.0)['g1'] == 20
assert run_replay('Save h', 5.0, 4.0)['g1'] == 12
for policy in ['Save h', 'Recompute, saved weights', 'Recompute, current weights']:
    for early in [3.0, 4.5, 5.0, 6.0]:
        for x in [-4.0, 0.0, 1.0, 4.0]:
            r = run_replay(policy, early, x)
            for time in [0, 400, 800, 1199, 1200, 1999, 2000, 2999, 3000, 3999, 4000, 5000]:
                numeric = {'rc-x': x, 'rc-live': early if time >= 2000 else 3.0, 'rc-ref': round(r['ref'], 6)}
                exact = {'rc-snapshot': 'replay: live weights' if policy.endswith('current weights') else 'replay: saved weights'}
                if time >= 400:
                    numeric['rc-h'] = r['h']
                if time >= 800:
                    numeric['rc-y'] = r['y']
                if time >= 1200:
                    numeric['rc-retained'] = r['retained']
                    exact['rc-keep'] = 'h kept for backward' if policy == 'Save h' else 'h freed after use'
                else:
                    exact['rc-keep'] = 'h: …'
                exact['rc-hazard'] = 'early write to w2' if time >= 2000 else 'no write yet'
                if time >= 3000:
                    numeric.update({'rc-muls': r['replayed'], 'rc-used': r['w2'], 'rc-g1': r['g1'], 'rc-g2': r['g2']})
                else:
                    exact.update({'rc-used': 'w2 used = …', 'rc-g1': '∂y/∂w1 = …'})
                if time >= 4000:
                    exact['rc-verdict'] = 'Exact match' if abs(r['g1'] - r['ref']) < 1e-6 else 'Wrong forward state'
                case('learning-recompute-replay', dict(policy=policy, earlyW2=early, x=x), time, numeric, exact)
CHECKS.append('replay tape with early optimizer write; central-difference reference at forward-time weights')

# ----------------------------------------------------------- 09 paired benchmark
REF, CAND = [10.0, 20.0, 10.0, 20.0], [9.0, 18.0, 9.0, 18.0]


def schedule(order):
    if order == 'Alternating (ABBA)':
        seq = []
        for i in range(4):
            seq += [('R', i), ('C', i)] if i % 2 == 0 else [('C', i), ('R', i)]
        return seq
    return [('R', i) for i in range(4)] + [('C', i) for i in range(4)]


for order in ['Alternating (ABBA)', 'All reference first']:
    for drift in [0.0, 0.25, 1.0, 2.0]:
        for warm in [False, True]:
            seq = schedule(order)
            measured, slot_of = {}, {}
            for slot, (kind, i) in enumerate(seq):
                base = (REF if kind == 'R' else CAND)[i]
                measured[(kind, i)] = base + drift * slot + (30.0 if warm and (kind, i) == ('C', 0) else 0.0)
                slot_of[(kind, i)] = slot
            ratios = [measured[('R', i)] / measured[('C', i)] for i in range(4)]
            diffs = [measured[('R', i)] - measured[('C', i)] for i in range(4)]
            median, mean = statistics.median(ratios), statistics.fmean(diffs)
            if not warm and order == 'Alternating (ABBA)':
                assert abs(mean - 1.5) < 1e-12  # ABBA cancels linear drift in the mean gap
            for time in [0, 599, 600, 1200, 2400, 3000, 4800, 5199, 5200, 5600]:
                numeric = {'pb-drift': drift}
                exact = {'pb-warm': 'warm-up counted: C0+30' if warm else 'warm-up run discarded'}
                geometry = {}
                for i in range(4):
                    for kind, node in [('R', f'pb-ref-{i}'), ('C', f'pb-cand-{i}')]:
                        if time >= (slot_of[(kind, i)] + 1) * 600:
                            numeric[node] = measured[(kind, i)]
                        else:
                            exact[node] = f'{kind} …'
                for slot, (kind, i) in enumerate(seq):
                    exact[f'pb-lab-{slot}'] = f'{kind}{i}'
                    shown = time >= (slot + 1) * 600
                    height = 2 * measured[(kind, i)]
                    geometry[f'pb-bar-{slot}'] = {'opacity': float(shown and kind == 'R'), 'height': height, 'y': 188 - height}
                    geometry[f'pb-cbar-{slot}'] = {'opacity': float(shown and kind == 'C'), 'height': height, 'y': 188 - height}
                if time >= 5200:
                    numeric.update({'pb-median': median, 'pb-mean': mean})
                    exact['pb-verdict'] = ('Mean gap is unbiased' if abs(mean - 1.5) < 1e-9 else
                                           'C looks slower: wrong' if mean < 0 else 'Mean gap is biased')
                else:
                    exact.update({'pb-median': 'median R/C = …', 'pb-verdict': '…'})
                case('learning-paired-benchmark', dict(order=order, drift=drift, warmup=warm), time, numeric, exact, geometry)
CHECKS.append('explicit ABBA/blocked schedules; statistics.median of paired ratios; drift cancellation in the mean gap')

print(json.dumps({'cases': CASES, 'independentChecks': CHECKS}, allow_nan=False, separators=(',', ':')))
