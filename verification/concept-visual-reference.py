"""Independent CPU oracle for the thirty concept scenes (three batches of eight, then six).

Python standard library only. It never reads scene JSON and never evaluates the
scene expression AST: every expected readout is recomputed here from the
lesson's own definitions (explicit matrix loops and axis reductions, exact
rational losses and derivatives, a microbatch buffer object, a hand-written
two-layer network with backprop checked by finite differences, a mask truth
table with a perturbation test, complex-number rotations, an explicit padded
tree reduction and an event-time schedule; the later batches add their own
models, listed in CHECKS). Third-batch verdicts are derived by asserting their
cause on the computed state. Cases go to stdout;
concept-visuals.mjs consumes them. No GPU, no network.
"""
import cmath
import json
import math
import statistics
import struct
from collections import deque
from decimal import Decimal
from fractions import Fraction
from itertools import product

CASES = []
CHECKS = []


def case(scene, state, time, numeric=None, exact=None, geometry=None, precise=None, lists=None):
    """numeric: last number in the text within 0.000501 (three-decimal display).
    precise: last number within 0.00000051 (six-decimal display).
    lists: every number after the final '=' (or ':'), in order, within 0.000501.
    exact: full text equality. geometry: node property within 1e-7."""
    CASES.append(dict(scene=scene, state=state, time=time, numeric=numeric or {},
                      exact=exact or {}, geometry=geometry or {}, precise=precise or {},
                      lists=lists or {}))


def clamp01(v):
    return max(0.0, min(1.0, v))


def js_round(v):
    """ECMAScript Math.round: nearest integer, exact halves toward +infinity."""
    f = math.floor(v)
    return f + 1 if v - f >= 0.5 else f


def r3(x):
    return js_round(float(x) * 1000) / 1000


def js(x):
    """Number-to-text as an ECMAScript string concatenation prints it."""
    if isinstance(x, bool):
        raise TypeError('bool')
    if isinstance(x, int):
        return str(x)
    x = float(x)
    if x == 0:
        return '0'
    if x == int(x) and abs(x) < 1e21:
        return str(int(x))
    text = repr(x)
    if 'e' in text:
        text = format(Decimal(text), 'f')
    return text


# ----------------------------------------------------------- 01 matmul and reductions
B_MAT = [[1, 0], [0, 1], [1, 1]]


def matmul_trace(A, Bm, i, j, zero_init):
    """Literal accumulator loop for one output; counts the additions it executes."""
    adds = 0
    trace = []
    acc = 0 if zero_init else None
    for r in range(len(Bm)):
        term = A[i][r] * Bm[r][j]
        if acc is None:
            acc = term
        else:
            acc = acc + term
            adds += 1
        trace.append((A[i][r], Bm[r][j], acc))
    return acc, adds, trace


def reduce_sum(M, axis):
    rows, cols = len(M), len(M[0])
    if axis == 1:
        return [sum(M[i][c] for c in range(cols)) for i in range(rows)], (rows,), cols
    if axis == 0:
        return [sum(M[i][c] for i in range(rows)) for c in range(cols)], (cols,), rows
    return sum(sum(row) for row in M), (), rows * cols


def fmt_shape(shape, axis, keep, rows=2, cols=3):
    if keep:
        full = {1: (rows, 1), 0: (1, cols), None: (1, 1)}[axis]
        return '(' + ','.join(str(d) for d in full) + ')'
    return '(' + ''.join(f'{d},' for d in shape) + ')' if len(shape) == 1 else '()'


def fmt_reduced(values, axis, keep, fn):
    if axis is None:
        return f'[[{fn(values)}]]' if keep else fn(values)
    if axis == 1 and keep:
        return '[' + ', '.join(f'[{fn(v)}]' for v in values) + ']'
    inner = ', '.join(fn(v) for v in values)
    return f'[[{inner}]]' if keep else f'[{inner}]'


A0 = [[1, 2, 3], [4, 5, 6]]
assert [[matmul_trace(A0, B_MAT, i, j, False)[0] for j in range(2)] for i in range(2)] == [[4, 5], [10, 11]]
assert sum(matmul_trace(A0, B_MAT, i, j, False)[1] for i in range(2) for j in range(2)) == 8
assert sum(matmul_trace(A0, B_MAT, i, j, True)[1] for i in range(2) for j in range(2)) == 12
assert reduce_sum(A0, 1)[0] == [6, 15] and reduce_sum(A0, 0)[0] == [5, 7, 9] and Fraction(21, 6) == 3.5
AXES = {'axis 1': 1, 'axis 0': 0, 'all axes': None}
for cell in ['C[0,0]', 'C[0,1]', 'C[1,0]', 'C[1,1]']:
    i, j = int(cell[2]), int(cell[4])
    for a12 in [-3, 0, 1, 6, 9]:
        A = [[1, 2, 3], [4, 5, a12]]
        C = [[matmul_trace(A, B_MAT, ii, jj, False)[0] for jj in range(2)] for ii in range(2)]
        for init in ['First product', 'Zero literal']:
            zero = init == 'Zero literal'
            value, adds, trace = matmul_trace(A, B_MAT, i, j, zero)
            total_adds = sum(matmul_trace(A, B_MAT, ii, jj, zero)[1] for ii in range(2) for jj in range(2))
            total_muls = 2 * 2 * 3
            for axis_name, axis in AXES.items():
                sums, shape, divisor = reduce_sum(A, axis)
                means = ([Fraction(v, divisor) for v in sums] if axis is not None else Fraction(sums, divisor))
                row_sums = reduce_sum(A, 1)[0]
                for keep in [False, True]:
                    for time in [0, 799, 800, 1600, 2200, 2800, 3400, 4000, 4600, 5200]:
                        exact = {'mm-axis': f'over {axis_name}' + (', keepdims' if keep else ''),
                                 'mm-total': f'all 4: {total_muls} mul, {total_adds} add',
                                 'mm-start': ('start: …' if time < 1600 else
                                              'start: acc = 0' if zero else 'start: acc = term 0')}
                        numeric = {'mm-rowsums': float(Fraction(sum(row_sums), len(row_sums)))}
                        for ii, jj in product(range(2), range(2)):
                            numeric[f'mm-c-{ii}-{jj}-v'] = C[ii][jj]
                        numeric['mm-a-1-2-v'] = a12
                        for r, (x, y, acc) in enumerate(trace):
                            exact[f'mm-term-{r}'] = (f'r={r}: {x}·{y} → acc {acc}' if time >= 1600 + 600 * r
                                                     else f'r={r}: …')
                        if time >= 3400:
                            exact['mm-result'] = f'{cell} = {value}'
                            exact['mm-adds'] = f'adds here: {adds}'
                        else:
                            exact['mm-result'] = f'{cell} = …'
                            exact['mm-adds'] = 'adds here: …'
                        if time >= 4000:
                            exact['mm-sum'] = 'sum: ' + fmt_reduced(sums, axis, keep, js)
                            exact['mm-rshape'] = 'shape: ' + fmt_shape(shape, axis, keep)
                        else:
                            exact['mm-sum'] = 'sum: …'
                            exact['mm-rshape'] = 'shape: …'
                        if time >= 4600:
                            exact['mm-div'] = f'divisor: {divisor}'
                            exact['mm-mean'] = 'mean: ' + fmt_reduced(means, axis, keep, lambda v: js(r3(v)))
                        else:
                            exact['mm-div'] = 'divisor: …'
                            exact['mm-mean'] = 'mean: …'
                        geometry = {}
                        for ii, r in product(range(2), range(3)):
                            geometry[f'mm-a-{ii}-{r}-hl'] = {'opacity': 0.3 if (time >= 800 and ii == i) else 0.0}
                        for r, jj in product(range(3), range(2)):
                            geometry[f'mm-b-{r}-{jj}-hl'] = {'opacity': 0.3 if (time >= 800 and jj == j) else 0.0}
                        for ii, jj in product(range(2), range(2)):
                            geometry[f'mm-c-{ii}-{jj}-hl'] = {'opacity': 0.3 if (ii, jj) == (i, j) else 0.0}
                        case('concept-matmul-reduce', dict(cell=cell, a12=a12, init=init, axis=axis_name, keep=keep),
                             time, numeric, exact, geometry)
CHECKS.append('literal accumulator loops counting executed additions (8 vs 12); hand axis reductions with keepdims shapes and divisors')

# ----------------------------------------------------------- 02 chain rule and a step
Y = Fraction(5)


def loss_q(w, x):
    r = w * x - Y
    return r * r / 2


def exact_derivative(w, x):
    # The central difference of a quadratic is its exact derivative, for any h.
    h = Fraction(1, 7)
    return (loss_q(w + h, x) - loss_q(w - h, x)) / (2 * h)


assert loss_q(Fraction(1), Fraction(2)) == Fraction(9, 2) and exact_derivative(Fraction(1), Fraction(2)) == -6
assert loss_q(Fraction(101, 100), Fraction(2)) == Fraction(44402, 10000)
for w in [0, 0.25, 1, 2, 2.5, 3]:
    for x in [0, 0.5, 1, 2, 3]:
        for delta in [0, 0.01, 0.1, 0.55, 1]:
            W, X, D = Fraction(w), Fraction(x), Fraction(delta)
            L = loss_q(W, X)
            links = [W * X - Y, Fraction(1), X]  # dL/dr, dr/dp, dp/dw
            g = links[0] * links[1] * links[2]
            assert g == exact_derivative(W, X)
            guess = L + g * D
            exact_next = loss_q(W + D, X)
            gap = exact_next - guess
            assert gap == X * X * D * D / 2
            for time in [0, 399, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 3900, 4200, 4600, 5000]:
                numeric = {'cr-w': float(W), 'cr-x': float(X), 'cr-delta': float(D)}
                exact = {}
                precise = {}
                for node, at, val, label in [('cr-p', 400, W * X, 'p = …'), ('cr-r', 800, W * X - Y, 'r = …'),
                                             ('cr-loss', 1200, L, 'L = …'), ('cr-dr', 1600, links[0], 'dL/dr = …'),
                                             ('cr-dw', 2400, X, 'dp/dw = …'), ('cr-grad', 2800, g, 'dL/dw = …'),
                                             ('cr-central', 3200, g, 'central diff: …')]:
                    if time >= at:
                        numeric[node] = float(val)
                    else:
                        exact[node] = label
                exact['cr-dp'] = 'dr/dp = 1' if time >= 2000 else 'dr/dp = …'
                for node, at, val, label in [('cr-guess', 3600, guess, 'guess L+g·δ: …'),
                                             ('cr-exact', 4200, exact_next, 'exact: …'),
                                             ('cr-gap', 4600, gap, 'gap: …'),
                                             ('cr-gapform', 4600, X * X * D * D / 2, 'x²δ²/2 = …')]:
                    if time >= at:
                        precise[node] = float(val)
                    else:
                        exact[node] = label
                X0 = lambda wv: 16 + 64 * float(wv)
                Yp = lambda lv: 190 - 5 * float(lv)
                geometry = {
                    'cr-now': {'x': X0(W), 'y': Yp(L)},
                    'cr-tangent': {'x': X0(W), 'y': Yp(L), 'x2': 64 * float(D), 'y2': -5 * float(g * D),
                                   'opacity': float(time >= 3600)},
                    'cr-guessdot': {'x': X0(W + D), 'y': Yp(guess), 'opacity': float(time >= 3600)},
                    'cr-exactdot': {'x': X0(W + D), 'y': Yp(exact_next), 'opacity': float(time >= 4200)},
                    'cr-gapline': {'x': X0(W + D), 'y': Yp(guess), 'y2': -5 * float(gap), 'opacity': float(time >= 4200)},
                }
                case('concept-chain-rule', dict(w=w, x=x, delta=delta), time, numeric, exact, geometry, precise)
CHECKS.append('exact rational loss and chain-rule product; quadratic central difference; tangent gap equals x²δ²/2')


# ----------------------------------------------------------- 03 gradient accumulation
class Buffer:
    def __init__(self):
        self.value, self.parts = 0.0, 0

    def add(self, contribution):
        self.value += contribution
        self.parts += 1

    def clear(self):
        self.value, self.parts = 0.0, 0


def window(microbatches, rule):
    buf = Buffer()
    history = []
    for count, mean in microbatches:
        buf.add(count * mean if rule == 'Weight by count' else mean)
        history.append(buf.value)
    denom = sum(c for c, _ in microbatches) if rule == 'Weight by count' else len(microbatches)
    return buf, history, denom, buf.value / denom


assert window([(2, 3.0), (1, -3.0)], 'Weight by count')[3] == 1 and window([(2, 3.0), (1, -3.0)], 'Equal mean of means')[3] == 0
for n1 in [1, 2, 4]:
    for g1 in [-4, 0, 3, 4]:
        for n2 in [1, 4]:
            for g2 in [-4, -3, 2]:
                examples = [g1] * n1 + [g2] * n2  # per-example gradients sharing each microbatch's mean
                full = statistics.fmean(examples)
                for rule in ['Weight by count', 'Equal mean of means']:
                    for clear in [False, True]:
                        buf, history, denom, grad = window([(n1, g1), (n2, g2)], rule)
                        w = 10.0
                        w1 = w - 0.1 * grad
                        buf.value = grad  # the buffer now holds the applied gradient
                        if clear:
                            buf.clear()
                        buf.add(2.0)
                        w2 = w1 - 0.1 * buf.value
                        intended = (10.0 - 0.1 * full) - 0.1 * 2.0
                        for time in [0, 999, 1000, 1999, 2000, 2800, 3400, 4200, 5000, 5400]:
                            numeric = {'ga-count': n1 + n2}
                            exact = {'ga-mb1': f'mb1: {n1} × mean {g1}', 'ga-mb2': f'mb2: {n2} × mean {g2}',
                                     'ga-rule': f'rule: {rule}',
                                     'ga-clear': 'reset at window start' if clear else 'reset forgotten (bug)'}
                            for node, at, val, label in [('ga-buf1', 1000, history[0], 'after mb1: …'),
                                                         ('ga-buf2', 2000, history[1], 'after mb2: …'),
                                                         ('ga-denom', 2800, denom, 'divide by …'),
                                                         ('ga-grad', 2800, grad, 'grad = …'),
                                                         ('ga-full', 2800, full, 'full batch: …'),
                                                         ('ga-w1', 3400, w1, 'w1 = …'),
                                                         ('ga-w2', 5000, w2, 'w2 = …'),
                                                         ('ga-intended', 5000, intended, 'intended w2 = …')]:
                                if time >= at:
                                    numeric[node] = val
                                else:
                                    exact[node] = label
                            if time >= 2800:
                                exact['ga-verdict'] = 'matches full batch' if abs(grad - full) < 1e-9 else 'wrong weighting'
                            else:
                                exact['ga-verdict'] = '…'
                            if time >= 4200:
                                exact['ga-nextbuf'] = f'buffer = {js(r3(buf.value))} ' + ('(cleared)' if clear else '(stale)')
                            else:
                                exact['ga-nextbuf'] = 'buffer = …'
                            geometry = {}
                            for k in range(4):
                                geometry[f'ga-mb1-{k}'] = {'opacity': float(k < n1)}
                                geometry[f'ga-mb2-{k + 4}'] = {'opacity': float(k < n2)}
                            case('concept-grad-accumulation',
                                 dict(n1=n1, g1=g1, n2=n2, g2=g2, rule=rule, clear=clear), time, numeric, exact, geometry)
CHECKS.append('microbatch buffer object; count-weighted mean equals statistics.fmean of per-example gradients; stale buffer across windows')

# ----------------------------------------------------------- 04 ReLU gates the gradient
W1 = [[2.0, 1.0], [-1.0, 2.0]]
B1 = [1.0, 0.0]
V = [3.0, -1.0]
C_OUT = 0.5


def network(x, use_relu, params=None):
    W, b, v, c = params or (W1, B1, V, C_OUT)
    z = [sum(W[k][i] * x[i] for i in range(2)) + b[k] for k in range(2)]
    h = [max(0.0, zk) if use_relu else zk for zk in z]
    pred = sum(v[k] * h[k] for k in range(2)) + c
    return z, h, pred


def backprop(x, y, use_relu):
    z, h, pred = network(x, use_relu)
    r = pred - y
    dh = [V[k] * r for k in range(2)]
    gate = [(1.0 if z[k] > 0 else 0.0) if use_relu else 1.0 for k in range(2)]  # gradient 0 at z = 0
    dz = [dh[k] * gate[k] for k in range(2)]
    dW = [[dz[k] * x[i] for i in range(2)] for k in range(2)]
    dv = [r * h[k] for k in range(2)]
    return dict(z=z, h=h, pred=pred, r=r, L=r * r / 2, dh=dh, gate=gate, dz=dz, dW=dW, db=dz, dv=dv)


def finite_difference_check(x, y, use_relu, out):
    eps = 1e-6

    def loss_with(W, b, v):
        return (network(x, use_relu, (W, b, v, C_OUT))[2] - y) ** 2 / 2
    for k, i in product(range(2), range(2)):
        up = [row[:] for row in W1]; up[k][i] += eps
        dn = [row[:] for row in W1]; dn[k][i] -= eps
        assert abs((loss_with(up, B1, V) - loss_with(dn, B1, V)) / (2 * eps) - out['dW'][k][i]) < 1e-4
    for k in range(2):
        vu, vd = V[:], V[:]
        vu[k] += eps; vd[k] -= eps
        assert abs((loss_with(W1, B1, vu) - loss_with(W1, B1, vd)) / (2 * eps) - out['dv'][k]) < 1e-4


ref = backprop([1.0, -2.0], 1.0, True)
assert ref['z'] == [1, -5] and ref['h'] == [1, 0] and ref['pred'] == 3.5 and ref['L'] == 3.125
assert ref['dh'] == [7.5, -2.5] and ref['dz'] == [7.5, 0] and ref['dW'][0] == [7.5, -15] and ref['dv'] == [2.5, 0]
assert sum(len(r) for r in W1) + len(B1) + len(V) + 1 == 9
# Without the nonlinearity the composition is one affine map: v·W1 and v·b1 + c.
AFF_W = [sum(V[k] * W1[k][i] for k in range(2)) for i in range(2)]
AFF_B = sum(V[k] * B1[k] for k in range(2)) + C_OUT
assert AFF_W == [7.0, 1.0] and AFF_B == 3.5
vec = lambda a, b: f'[{js(r3(a))}, {js(r3(b))}]'
for x1 in [-3.0, -1.0, 0.0, 1.0, 3.0]:
    for x2 in [-3.0, -2.0, 0.0, 0.5, 3.0]:
        for y in [-2.0, 1.0, 4.0]:
            for act in ['ReLU', 'None (identity)']:
                relu = act == 'ReLU'
                out = backprop([x1, x2], y, relu)
                if all(zk != 0 for zk in out['z']):
                    finite_difference_check([x1, x2], y, relu, out)
                affine = AFF_W[0] * x1 + AFF_W[1] * x2 + AFF_B
                if not relu:
                    assert abs(affine - out['pred']) < 1e-12
                for time in [0, 699, 700, 1400, 2100, 2800, 3500, 4200, 4800, 5200]:
                    exact = {'rg-x': f'x = [{js(x1)}, {js(x2)}]', 'rg-act': f'act: {act}'}
                    numeric = {}
                    staged = [('rg-z', 700, 'z = ' + vec(*out['z']), 'z = …'),
                              ('rg-h', 1400, 'h = ' + vec(*out['h']), 'h = …'),
                              ('rg-sh', 2800, '∂h = ' + vec(*out['dh']), '∂h = …'),
                              ('rg-sz', 3500, '∂z = ' + vec(*out['dz']), '∂z = …'),
                              ('rg-dw0', 4200, '∂W row0 = ' + vec(*out['dW'][0]), '∂W row0 = …'),
                              ('rg-dw1', 4200, '∂W row1 = ' + vec(*out['dW'][1]), '∂W row1 = …'),
                              ('rg-db', 4200, '∂b = ' + vec(*out['db']), '∂b = …'),
                              ('rg-dv', 4200, '∂v = ' + vec(*out['dv']), '∂v = …')]
                    for node, at, value, waiting in staged:
                        exact[node] = value if time >= at else waiting
                    for node, at, val, label in [('rg-pred', 2100, out['pred'], 'ŷ = …'),
                                                 ('rg-loss', 2100, out['L'], 'L = …'),
                                                 ('rg-r', 2800, out['r'], 'r = …'),
                                                 ('rg-affine', 4800, affine, 'affine = …'),
                                                 ('rg-net', 4800, out['pred'], 'network ŷ = …')]:
                        if time >= at:
                            numeric[node] = val
                        else:
                            exact[node] = label
                    for k in range(2):
                        exact[f'rg-gate-label-{k}'] = (f'u{k} ' + ('open' if out['gate'][k] else 'shut')) if time >= 3500 else f'u{k} …'
                    exact['rg-verdict'] = (('same as affine' if abs(out['pred'] - affine) < 1e-9 else 'differs: it bends')
                                           if time >= 4800 else '…')
                    geometry = {f'rg-open-{k}': {'opacity': out['gate'][k] if time >= 3500 else 0.0} for k in range(2)}
                    case('concept-relu-gate', dict(x1=x1, x2=x2, target=y, act=act), time, numeric, exact, geometry)
CHECKS.append('hand-written two-layer network and backprop, checked by central differences away from z = 0; affine collapse v·W1, v·b1 + c')

# ----------------------------------------------------------- 05 causal mask and loss denominator
SEQ = [4, 2, 7, 1]
MASK_RULES = {'Causal j ≤ i': lambda i, j: j <= i, 'No mask': lambda i, j: True,
              'Transposed j ≥ i': lambda i, j: j >= i}


def toy_layer(tokens, allowed):
    """Any deterministic mixing of visible tokens: position-weighted sum per row."""
    return [sum((j + 1) * 10 * tokens[j] for j in range(len(tokens)) if allowed[i][j]) for i in range(len(tokens))]


inputs, shifted_targets = SEQ[:-1], SEQ[1:]
assert inputs == [4, 2, 7] and shifted_targets == [2, 7, 1]
assert [[MASK_RULES['Causal j ≤ i'](i, j) for j in range(3)] for i in range(3)] == [
    [True, False, False], [True, True, False], [True, True, True]]
for mask_name, rule in MASK_RULES.items():
    allowed = [[rule(i, j) for j in range(3)] for i in range(3)]
    base = toy_layer(inputs, allowed)
    perturbed = toy_layer(inputs[:2] + [9], allowed)  # change only token 7
    moved = [i for i in range(3) if base[i] != perturbed[i]]
    for shifted in [False, True]:
        targets = shifted_targets if shifted else inputs
        # The input position holding each row's target token, if any.
        target_pos = [i + 1 if shifted else i for i in range(3)]
        visible = [target_pos[i] < 3 and allowed[i][target_pos[i]] for i in range(3)]
        for qi in range(3):
            for denominator in ['Valid tokens', 'All slots', 'Mean of seq means']:
                for lossB in [0, 4, 8]:
                    seq_a, seq_b = [1, 2, 3], [lossB, None, None]
                    flat = seq_a + seq_b
                    valid = [v for v in flat if v is not None]
                    means = {'Valid tokens': statistics.fmean(valid),
                             'All slots': math.fsum(valid) / len(flat),
                             'Mean of seq means': statistics.fmean(
                                 [statistics.fmean(seq_a), statistics.fmean([v for v in seq_b if v is not None])])}
                    for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4600]:
                        exact = {'cm-shift': 'shifted by one: ' + ('yes' if shifted else 'no'),
                                 'cm-rule': f'rule: {mask_name}',
                                 'cm-qline': f'query {qi}, token {inputs[qi]}',
                                 'cm-lb': f'seq B: {lossB} + 2 pad slots'}
                        exact['cm-inputs'] = 'inputs [4, 2, 7]' if time >= 800 else 'inputs …'
                        exact['cm-targets'] = ('targets [' + ', '.join(map(str, targets)) + ']') if time >= 800 else 'targets …'
                        if time >= 2400:
                            exact['cm-sees'] = 'sees: ' + ', '.join(str(inputs[j]) for j in range(3) if allowed[qi][j])
                            exact['cm-target'] = f'target: {targets[qi]}'
                            exact['cm-visible'] = 'target visible: ' + ('yes' if visible[qi] else 'no')
                            exact['cm-verdict'] = 'leak: reads target' if visible[qi] else 'no leak'
                        else:
                            exact.update({'cm-sees': 'sees: …', 'cm-target': 'target: …',
                                          'cm-visible': 'target visible: …', 'cm-verdict': '…'})
                        if time >= 3200:
                            exact['cm-leaks'] = f'rows leaking: {sum(visible)} of 3'
                            exact['cm-moved'] = 'edit k2 → rows ' + ', '.join(map(str, moved))
                            exact['cm-test'] = 'rows 0–1 moved: leak' if any(i < 2 for i in moved) else 'rows 0–1 fixed: ok'
                        else:
                            exact.update({'cm-leaks': 'rows leaking: …', 'cm-moved': 'edit k2 → rows …',
                                          'cm-test': 'future-token test: …'})
                        numeric = {}
                        for node, key, waiting in [('cm-valid', 'Valid tokens', 'valid tokens: …'),
                                                   ('cm-slots', 'All slots', 'all 6 slots: …'),
                                                   ('cm-seqmean', 'Mean of seq means', 'seq means: …')]:
                            if time >= 4000:
                                numeric[node] = means[key]
                            else:
                                exact[node] = waiting
                        if time >= 4000:
                            numeric['cm-chosen'] = means[denominator]
                            exact['cm-intent'] = 'per valid token' if denominator == 'Valid tokens' else 'other weighting'
                        else:
                            exact['cm-chosen'] = 'chosen = …'
                            exact['cm-intent'] = '…'
                        geometry = {}
                        for i, j in product(range(3), range(3)):
                            geometry[f'cm-on-{i}-{j}'] = {'opacity': 0.75 if (time >= 1600 and allowed[i][j]) else 0.0}
                        for i in range(3):
                            geometry[f'cm-row-{i}'] = {'opacity': 0.18 if i == qi else 0.0}
                        case('concept-causal-mask',
                             dict(mask=mask_name, query=f'Query {qi}', shifted=shifted, denominator=denominator, lossB=lossB),
                             time, numeric, exact, geometry)
CHECKS.append('mask truth tables; target visibility; perturb-only-the-future-token test on a toy mixing layer; padded loss reductions')

# ----------------------------------------------------------- 06 RoPE and GQA
Q_VEC, K_VEC = complex(2, 1), complex(1, 3)


def rotate(z, degrees):
    return z * cmath.exp(1j * math.radians(degrees))


def real_dot(a, b):
    return (a.conjugate() * b).real


assert abs(rotate(complex(1, 0), 90) - 1j) < 1e-12


def gqa_params(D, hq, hkv):
    d = D // hq
    shapes = {'Q': (D, hq * d), 'K': (D, hkv * d), 'V': (D, hkv * d), 'O': (hq * d, D)}
    return {k: a * b for k, (a, b) in shapes.items()}, d


assert sum(gqa_params(8, 4, 2)[0].values()) == 192 and sum(gqa_params(8, 4, 4)[0].values()) == 256
KV_NAMES = {'4 KV heads': 4, '2 KV heads': 2, '1 KV head': 1}
S_SCALE, CX, CY = 26, 144, 150
for m in [0, 1, 3, 6]:
    for n in [0, 3, 6]:
        for theta in [0, 15, 30, 90]:
            for bug in [False, True]:
                qr = rotate(Q_VEC, m * theta)
                kr = K_VEC if bug else rotate(K_VEC, n * theta)
                dot_rot = real_dot(qr, kr)
                dot_rel = real_dot(Q_VEC, rotate(K_VEC, (n - m) * theta))
                shifted = real_dot(rotate(Q_VEC, (m + 1) * theta), K_VEC if bug else rotate(K_VEC, (n + 1) * theta))
                if not bug:
                    assert abs(dot_rot - dot_rel) < 1e-9 and abs(shifted - dot_rel) < 1e-9
                assert abs(abs(qr) - abs(Q_VEC)) < 1e-12
                for kv_name, hkv in KV_NAMES.items():
                    params, d = gqa_params(8, 4, hkv)
                    groups = {g: [h for h in range(4) if h // (4 // hkv) == g] for g in range(hkv)}
                    for time in [0, 999, 1000, 1400, 1800, 2000, 2400, 2800, 3000, 3800, 4400]:
                        exact = {'rp-angles': f'm·θ = {m * theta}°, n·θ = {n * theta}°',
                                 'rp-kv': f'KV heads: {hkv}, d = {d}',
                                 'rp-params': f"Q {params['Q']} + K {params['K']} + V {params['V']} + O {params['O']}"}
                        numeric = {'rp-total': sum(params.values()), 'rp-cache': 2 * hkv * d}
                        lists = {}
                        if time >= 1800:
                            lists['rp-qr'] = [qr.real, qr.imag]
                        else:
                            exact['rp-qr'] = 'R q = …'
                        if time >= 2800:
                            lists['rp-kr'] = [kr.real, kr.imag]
                        else:
                            exact['rp-kr'] = 'R k = …'
                        if time >= 3000:
                            numeric.update({'rp-dot': dot_rot, 'rp-rel': dot_rel, 'rp-shift': shifted})
                            exact['rp-verdict'] = 'depends on n − m' if abs(dot_rot - dot_rel) < 1e-9 else 'position bug'
                        else:
                            exact.update({'rp-dot': 'Rq·Rk = …', 'rp-rel': 'q·R((n−m)θ)k = …',
                                          'rp-shift': 'both +1: …', 'rp-verdict': '…'})
                        exact['rp-norm'] = f'|Rq| = {js(r3(abs(qr)))} = |q|'
                        for g in range(4):
                            if g < hkv:
                                exact[f'rp-map-{g}'] = (f'kv{g}: ' + ' '.join(f'q{h}' for h in groups[g])) if time >= 3800 else f'kv{g}: …'
                        aq = m * theta * clamp01((time - 1000) / 800)
                        ak = (0 if bug else n * theta) * clamp01((time - 2000) / 800)
                        shown_q, shown_k = rotate(Q_VEC, aq), rotate(K_VEC, ak)
                        geometry = {
                            'rp-q': {'x': CX, 'y': CY, 'x2': S_SCALE * shown_q.real, 'y2': -S_SCALE * shown_q.imag},
                            'rp-k': {'x': CX, 'y': CY, 'x2': S_SCALE * shown_k.real, 'y2': -S_SCALE * shown_k.imag},
                            'rp-qtip': {'x': CX + S_SCALE * shown_q.real, 'y': CY - S_SCALE * shown_q.imag},
                            'rp-ktip': {'x': CX + S_SCALE * shown_k.real, 'y': CY - S_SCALE * shown_k.imag},
                        }
                        for g in range(4):
                            geometry[f'rp-map-{g}'] = {'opacity': float(g < hkv)}
                        case('concept-rope-gqa', dict(m=m, n=n, theta=theta, bug=bug, kvHeads=kv_name),
                             time, numeric, exact, geometry, lists=lists)
CHECKS.append('complex-number rotations: relative-position identity and norm; GQA projection shapes and head grouping')

# ----------------------------------------------------------- 07 tree reduction
def values_for(n, alternate):
    return [(-1) ** (i + 1) * i if alternate else i for i in range(1, n + 1)]


def pairwise_tree(slots):
    levels = [list(slots)]
    while len(levels[-1]) > 1:
        prev = levels[-1]
        levels.append([prev[2 * k] + prev[2 * k + 1] for k in range(len(prev) // 2)])
    return levels


def two_pass(values, size, drop):
    groups = [values[i:i + size] for i in range(0, len(values), size)]
    if drop and groups and len(groups[-1]) < size:
        kept = groups[:-1]
    else:
        kept = groups
    padded = [g + [0] * (size - len(g)) for g in kept]
    partials = [pairwise_tree(g)[-1][0] for g in padded]
    total = 0
    for p in partials:  # second dispatch
        total += p
    last = groups[-1] + [0] * (size - len(groups[-1]))
    return dict(groups=groups, kept=len(kept), partials=partials, total=total, last_levels=pairwise_tree(last),
                pad=size - len(groups[-1]), dropped=len(values) - sum(len(g) for g in kept),
                last_dropped=drop and len(groups[-1]) < size)


chk = two_pass(values_for(10, False), 8, False)
assert chk['partials'] == [36, 19] and chk['total'] == 55 and len(chk['last_levels']) == 4
assert two_pass(values_for(10, False), 8, True)['total'] == 36
for n in range(1, 17):
    for size_name in ['8', '4', '2']:
        size = int(size_name)
        for tail in ['Pad with 0', 'Drop partial group']:
            drop = tail == 'Drop partial group'
            for alternate in [False, True]:
                vals = values_for(n, alternate)
                out = two_pass(vals, size, drop)
                sequential = 0
                for v in vals:
                    sequential += v
                for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800, 5400]:
                    exact = {'tr-n': f'n = {n}, group size {size}',
                             'tr-values': (f'v_i = ±i, last {vals[-1]}' if alternate else f'v_i = i, last {n}'),
                             'tr-rounds': f'rounds: {len(out["last_levels"]) - 1} = log2 {size}',
                             'tr-fate': 'dropped: never summed' if out['last_dropped'] else 'summed in pass 1'}
                    if time >= 800:
                        exact['tr-tail'] = (f'dropped values: {out["dropped"]}' if drop else
                                            f'pad {out["pad"]} zeros → {len(out["groups"])} groups')
                    else:
                        exact['tr-tail'] = 'tail: …'
                    geometry = {}
                    for k in range(8):
                        used = k < out['kept']
                        geometry[f'tr-part-{k}'] = {'opacity': float(used)}
                        if used:
                            exact[f'tr-part-{k}'] = f'g{k} = {out["partials"][k]}' if time >= 4000 else f'g{k} = …'
                    numeric = {}
                    if time >= 4000:
                        numeric['tr-used'] = out['kept']
                    else:
                        exact['tr-used'] = 'partials used: …'
                    if time >= 4800:
                        numeric.update({'tr-total': out['total'], 'tr-reference': sequential})
                        exact['tr-verdict'] = 'matches' if out['total'] == sequential else 'finite, yet wrong'
                    else:
                        exact.update({'tr-total': 'total = …', 'tr-reference': 'sequential = …', 'tr-verdict': '…'})
                    for level in range(4):
                        width_slots = 8 >> level
                        for s_idx in range(width_slots):
                            present = level < len(out['last_levels']) and s_idx < len(out['last_levels'][level]) and \
                                (level == 0 or time >= 800 + 800 * level)
                            slot_w = 256 / (size / 2 ** level)
                            x = 16 + s_idx * slot_w
                            node = f'tr-l{level}-s{s_idx}'
                            geometry[f'{node}-box'] = {'opacity': float(present)}
                            if present:
                                geometry[f'{node}-box'].update({'x': x + 2, 'width': slot_w - 4})
                                is_pad = level == 0 and s_idx >= len(out['groups'][-1])
                                geometry[f'{node}-pad'] = {'opacity': float(is_pad)}
                                numeric[node] = out['last_levels'][level][s_idx]
                                geometry[node] = {'x': x + slot_w / 2, 'opacity': 1.0}
                            else:
                                geometry[node] = {'opacity': 0.0}
                    case('concept-tree-reduction', dict(n=n, size=size_name, tail=tail, signs=alternate),
                         time, numeric, exact, geometry)
CHECKS.append('explicit padded groups and pairwise tree levels; second-pass combine; dropped tail vs sequential sum')

# ----------------------------------------------------------- 08 transfer and cycle budget
def schedule_events(compute, transfer, merge, overlap):
    """Event times under the stated dependency model; returns (start, duration) per stage."""
    if overlap:
        stages = {'compute': (0, compute), 'transfer': (0, transfer)}
        stages['merge'] = (max(compute, transfer), merge)
    else:
        stages = {'compute': (0, compute)}
        stages['transfer'] = (compute, transfer)
        stages['merge'] = (compute + transfer, merge)
    end = max(s + d for s, d in stages.values())
    return stages, end


assert Fraction(100 * 2 ** 20 * 8, 200 * 10 ** 6) == Fraction(4194304, 1000000)
assert schedule_events(8, 5, 2, False)[1] == 15 and schedule_events(8, 5, 2, True)[1] == 10
for mib in [10, 100]:
    for mbps in [50, 200, 1000]:
        bits = mib * 2 ** 20 * 8
        tx = Fraction(bits, mbps * 10 ** 6)
        decimal_tx = Fraction(mib * 10 ** 6 * 8, mbps * 10 ** 6)
        for compute in [0, 8, 12]:
            for merge in [0, 2, 4]:
                for sched in ['Serial', 'Ideal overlap']:
                    stages, cycle = schedule_events(Fraction(compute), tx, Fraction(merge), sched == 'Ideal overlap')
                    _, other = schedule_events(Fraction(compute), tx, Fraction(merge), sched != 'Ideal overlap')
                    for attempts in [1, 3, 4]:
                        attempt_log = [(c, a) for c in range(60) for a in range(attempts)]
                        unique = len({c for c, _ in attempt_log})
                        for time in [0, 799, 800, 1600, 2400, 2650, 3000, 3600, 4200, 4800, 5200]:
                            exact = {'tb-link': f'{mib} MiB at {mbps} Mb/s', 'tb-c': f'compute {compute} s',
                                     'tb-m': f'merge {merge} s'}
                            numeric = {'tb-attempts': attempts, 'tb-t': float(tx)}
                            for node, at, val, label in [('tb-bits', 800, bits, 'bits = …'),
                                                         ('tb-ideal', 1600, tx, 'ideal = …'),
                                                         ('tb-decimal', 1600, decimal_tx, 'if MB (10^6): …'),
                                                         ('tb-cycle', 4200, cycle, 'cycle = …'),
                                                         ('tb-both', 4200, other, 'other model: …'),
                                                         ('tb-counter', 4800, len(attempt_log), 'attempt counter: …'),
                                                         ('tb-unique', 4800, unique, 'unique work: …'),
                                                         ('tb-perhour', 4800, Fraction(3600) / cycle, 'cycles/hour: …')]:
                                if time >= at:
                                    numeric[node] = float(val)
                                else:
                                    exact[node] = label
                            geometry = {}
                            for node, key, at in [('tb-cbar', 'compute', 2400), ('tb-tbar', 'transfer', 3000),
                                                  ('tb-mbar', 'merge', 3600)]:
                                start, duration = stages[key]
                                geometry[node] = {'x': 16 + 7 * float(start),
                                                  'width': 7 * float(duration) * clamp01((time - at) / 500)}
                            case('concept-transfer-budget',
                                 dict(mib=mib, mbps=mbps, compute=compute, merge=merge, schedule=sched, attempts=attempts),
                                 time, numeric, exact, geometry)
CHECKS.append('exact rational MiB-to-bits transfer time vs decimal MB; event-time schedules; attempt log vs unique contributions')

# =========================================================== second batch (09-16)
def r6(x):
    return js_round(float(x) * 1000000) / 1000000


# ----------------------------------------------------------- 09 shapes, offsets and bytes
ROW_MAJOR = list(product(range(2), range(3), range(4)))  # enumeration order of a contiguous (2,3,4)
MISREAD = list(product(range(2), range(4), range(3)))
ELEMENT = {'FP32 (4 bytes)': struct.calcsize('<f'), '2-byte format': struct.calcsize('<e')}
assert ELEMENT == {'FP32 (4 bytes)': 4, '2-byte format': 2}
assert ROW_MAJOR.index((1, 2, 3)) == 23 and ROW_MAJOR.index((0, 2, 1)) == 9
assert ROW_MAJOR[17] == (1, 1, 1) and MISREAD[17] == (1, 1, 2)


def byte_range(offset, size):
    """Write a marker element into a zeroed buffer and report which bytes changed."""
    buf = bytearray(24 * size)
    fmt = '<f' if size == 4 else '<e'
    struct.pack_into(fmt, buf, offset * size, -1.2345678)  # no zero byte in either encoding
    touched = [i for i, v in enumerate(buf) if v]
    return touched[0], touched[-1], len(buf)


assert byte_range(23, 4) == (92, 95, 96) and byte_range(23, 2) == (46, 47, 48)
for b, tt, d in ROW_MAJOR:
    off = ROW_MAJOR.index((b, tt, d))
    for o in [0, 9, 12, 17, 23]:
        rb, rt, rd = ROW_MAJOR[o]
        mb, mt, md = MISREAD[o]
        for dtype, size in ELEMENT.items():
            first, last, payload = byte_range(off, size)
            for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                exact = {'to-index': f'(b,t,d) = ({b},{tt},{d})', 'to-size': f'element size {size} B',
                         'to-bytes': f'payload {payload} bytes', 'to-o': f'offset o = {o}',
                         'to-sum': f'{b}·12 + {tt}·4 + {d}' if time >= 1600 else 'b·12 + t·4 + d',
                         'to-offset': f'offset = {off}' if time >= 1600 else 'offset = …',
                         'to-range': f'bytes {first} … {last}' if time >= 2400 else 'bytes …'}
                if time >= 3200:
                    exact.update({'to-rb': f'b = o div 12 = {rb}', 'to-rt': f't = (o mod 12) div 4 = {rt}',
                                  'to-rd': f'd = o mod 4 = {rd}', 'to-rev': f'({rb},{rt},{rd})'})
                else:
                    exact.update({'to-rb': 'b = …', 'to-rt': 't = …', 'to-rd': 'd = …', 'to-rev': '(…)'})
                exact['to-misread'] = f'as (2,4,3): ({mb},{mt},{md})' if time >= 4000 else 'as (2,4,3): …'
                geometry = {}
                for k in range(24):
                    geometry[f'to-idx-{k}'] = {'opacity': 0.45 if (time >= 800 and k == off) else 0.0}
                    geometry[f'to-rev-{k}'] = {'opacity': 0.35 if (time >= 3200 and k == o) else 0.0}
                case('concept-tensor-offsets', dict(b=b, t=tt, d=d, offset=o, dtype=dtype), time, {}, exact, geometry)
CHECKS.append('row-major enumeration by itertools.product (index lookup, not the stride formula); struct element sizes and a byte buffer written with pack_into')

# ----------------------------------------------------------- 10 batch mean and one update
BATCH = [(1, 3), (2, 2)]


def batch_step(w, eta, reduction):
    losses = [Fraction(1, 2) * (w * x - y) ** 2 for x, y in BATCH]
    grads = [(w * x - y) * x for x, y in BATCH]
    scale = 1 if reduction == 'Sum' else Fraction(1, len(BATCH))
    loss, grad = scale * sum(losses), scale * sum(grads)
    w1 = w - eta * grad
    after_losses = [Fraction(1, 2) * (w1 * x - y) ** 2 for x, y in BATCH]
    return losses, grads, loss, grad, w1, after_losses, scale * sum(after_losses)


ref10 = batch_step(Fraction(1), Fraction(1, 10), 'Mean')
assert ref10[2] == 1 and ref10[3] == -1 and ref10[4] == Fraction(11, 10)
assert ref10[5] == [Fraction(1805, 1000), Fraction(2, 100)] and ref10[6] == Fraction(9125, 10000)
for w in [0, 0.2, 0.5, 1, 1.4, 1.7, 2]:
    for eta in [0, 0.1, 0.3]:
        for reduction in ['Mean', 'Sum']:
            W, ETA = Fraction(str(w)), Fraction(str(eta))
            losses, grads, loss, grad, w1, after_l, after_loss = batch_step(W, ETA, reduction)
            residuals = [W * x - y for x, y in BATCH]
            for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                exact = {'bm-w': f'w = {js(r3(W))}', 'bm-rule': f'reduction: {reduction}', 'bm-eta': f'η = {js(r3(ETA))}'}
                numeric, precise = {}, {}
                if time >= 800:
                    exact['bm-l1'] = f'L1 = {js(r3(losses[0]))}, g1 = {js(r3(grads[0]))}'
                    exact['bm-l2'] = f'L2 = {js(r3(losses[1]))}, g2 = {js(r3(grads[1]))}'
                    exact['bm-res'] = f'r = [{js(r3(residuals[0]))}, {js(r3(residuals[1]))}]'
                else:
                    exact.update({'bm-l1': 'L1 = …', 'bm-l2': 'L2 = …', 'bm-res': 'r = …'})
                for node, at, val, label in [('bm-loss', 1600, loss, 'batch loss = …'), ('bm-grad', 1600, grad, 'batch grad = …'),
                                             ('bm-w1', 2400, w1, 'w′ = …')]:
                    if time >= at:
                        numeric[node] = float(val)
                    else:
                        exact[node] = label
                for node, val, label in [('bm-l1b', after_l[0], 'L1′ = …'), ('bm-l2b', after_l[1], 'L2′ = …'),
                                         ('bm-agg1', after_loss, 'batch loss′ = …')]:
                    if time >= 3200:
                        precise[node] = float(val)
                    else:
                        exact[node] = label
                if time >= 4000:
                    exact['bm-verdict'] = ('batch loss fell' if after_loss < loss else
                                           'batch loss rose' if after_loss > loss else 'batch loss unchanged')
                    exact['bm-worse'] = ('yet ex2 got worse' if after_l[1] > losses[1] else
                                         'yet ex1 got worse' if after_l[0] > losses[0] else 'no example got worse')
                else:
                    exact['bm-verdict'] = exact['bm-worse'] = '…'
                geometry = {'bm-bar1-before': {'width': 48 * float(losses[0]), 'opacity': 1.0},
                            'bm-bar2-before': {'width': 48 * float(losses[1]), 'opacity': 1.0},
                            'bm-bar1-after': {'width': 48 * float(after_l[0]), 'opacity': float(time >= 3200)},
                            'bm-bar2-after': {'width': 48 * float(after_l[1]), 'opacity': float(time >= 3200)}}
                case('concept-batch-mean', dict(w=w, eta=eta, reduction=reduction), time, numeric, exact, geometry, precise)
CHECKS.append('exact Fraction per-example losses and gradients, explicit mean/sum reduction, one update and per-example losses afterwards')


# ----------------------------------------------------------- 11 tiny autodiff: slots and fan-out
class Node:
    """The lesson's scalar engine, with switchable defects for the scene's options."""

    def __init__(self, value, parents=(), engine=None):
        self.value, self.grad, self.parents, self.engine = value, Fraction(0), parents, engine
        self.pullback = lambda: None

    def _put(self, target, contribution, log, slot):
        if self.engine['overwrite']:
            target.grad = contribution
        else:
            target.grad += contribution
        log.append((slot, contribution))

    def add(self, other, log):
        out = Node(self.value + other.value, (self, other), self.engine)

        def pullback():
            out._put(self, out.grad, log, 'add-a')
            out._put(other, out.grad, log, 'add-b')
        out.pullback = pullback
        return out

    def mul(self, other, log):
        a, b = self.value, other.value
        out = Node(a * b, (self, other), self.engine)

        def pullback():
            out._put(self, b * out.grad, log, 'mul-a')
            if not self.engine['one_slot']:
                out._put(other, a * out.grad, log, 'mul-b')
        out.pullback = pullback
        return out

    def backward(self):
        order, seen = [], set()

        def visit(node):
            if id(node) in seen:
                return
            seen.add(id(node))
            for parent in node.parents:
                visit(parent)
            order.append(node)
        visit(self)
        if self.engine['reset']:
            for node in order:
                node.grad = Fraction(0)
        self.grad = Fraction(1)
        for node in reversed(order):
            node.pullback()


def run_engine(x, one_slot, overwrite, calls, reset):
    engine = dict(one_slot=one_slot, overwrite=overwrite, reset=reset)
    log = []
    X = Node(x, engine=engine)
    U = X.mul(X, log)
    Z = U.add(U, log)
    for _ in range(calls):
        log.clear()
        Z.backward()
    return X, U, Z, dict(log)


_X, _U, _Z, _ = run_engine(Fraction(2), False, False, 1, True)
assert (_Z.value, _U.grad, _X.grad) == (8, 2, 8)
assert run_engine(Fraction(2), False, False, 2, True)[0].grad == 8
assert run_engine(Fraction(2), True, False, 1, True)[0].grad == 4
for x in [-3, -1.5, 0, 0.5, 2, 3]:
    X0 = Fraction(str(x))
    true = (2 * (X0 + Fraction(1, 7)) ** 2 - 2 * (X0 - Fraction(1, 7)) ** 2) / Fraction(2, 7)  # exact for a quadratic
    assert true == 4 * X0
    for slots in ['Both operand slots', 'One slot only']:
        for combine in ['+= accumulate', '= overwrite']:
            for calls in [1, 2, 3]:
                for reset in [True, False]:
                    Xn, Un, Zn, last = run_engine(X0, slots == 'One slot only', combine == '= overwrite', calls, reset)
                    op_text = '+= ' if combine == '+= accumulate' else '= '
                    for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                        exact = {'af-x': f'x = {js(x)}',
                                 'af-calls': f'calls {calls}' + (', reset on' if reset else ', no reset')}
                        numeric = {}
                        if time >= 800:
                            numeric.update({'af-u': Un.value, 'af-z': Zn.value})
                        else:
                            exact.update({'af-u': 'u = …', 'af-z': 'z = …'})
                        if time >= 1600:
                            exact['af-ugrad'] = f'u.grad = {js(Un.grad)}'
                            exact['af-uz-a-label'] = f'{op_text}{js(last["add-a"])}'
                            exact['af-uz-b-label'] = f'{op_text}{js(last["add-b"])}'
                        else:
                            exact.update({'af-ugrad': 'u.grad = …', 'af-uz-a-label': '…', 'af-uz-b-label': '…'})
                        if time >= 2400:
                            # per-unit derivative the multiply rule hands to x
                            rule = (2 if slots == 'Both operand slots' else 1) * X0
                            numeric.update({'af-rule': rule, 'af-xgrad': Xn.grad})
                            exact['af-xu-a-label'] = f'{op_text}{js(r3(last["mul-a"]))}'
                            exact['af-xu-b-label'] = (f'{op_text}{js(r3(last["mul-b"]))}' if 'mul-b' in last else 'unused')
                        else:
                            exact.update({'af-rule': 'x·x rule gives …', 'af-xgrad': 'x.grad = …',
                                          'af-xu-a-label': '…', 'af-xu-b-label': '…'})
                        if time >= 3200:
                            numeric.update({'af-true': true, 'af-central': true})
                        else:
                            exact.update({'af-true': 'dz/dx = …', 'af-central': 'central diff: …'})
                        exact['af-verdict'] = (('matches reference' if Xn.grad == true else 'wrong gradient')
                                               if time >= 4000 else '…')
                        numeric = {k: float(v) for k, v in numeric.items()}
                        geometry = {'af-xu-b': {'opacity': 1.0 if slots == 'Both operand slots' else 0.25}}
                        case('concept-autodiff-fanout', dict(x=x, slots=slots, combine=combine, calls=calls, reset=reset),
                             time, numeric, exact, geometry)
CHECKS.append("the lesson's Value engine with switchable one-slot, overwrite and no-reset defects, run for repeated backward calls; exact quadratic central difference")

# ----------------------------------------------------------- 12 residual paths and normalization axes
def chain_derivative(local, layers):
    d = Fraction(1)
    for _ in range(layers):
        d *= local
    return d


assert chain_derivative(Fraction(1, 10), 10) == Fraction(1, 10 ** 10)
assert abs(float(chain_derivative(Fraction(11, 10), 10)) - 2.59374246) < 1e-8
assert chain_derivative(Fraction(0), 3) == 0


def normalize(vec, stats_over, eps=1e-5):
    mean = statistics.fmean(stats_over)
    var = statistics.pvariance(stats_over)
    return [(v - mean) / math.sqrt(var + eps) for v in vec], mean, var


assert normalize([1.0, 3.0], [1.0, 3.0])[0][1] == 0.9999950000374997
COMPANIONS = {'alone': [], 'with [5, 9]': [5.0, 9.0], 'with [0, 0]': [0.0, 0.0]}
assert abs(normalize([1.0, 3.0], [1.0, 3.0, 5.0, 9.0])[2] - 8.75) < 1e-12
SMALL = Fraction(5, 10 ** 7)


def fmt_derivative(label, value):
    if abs(value) < SMALL:
        return 'exact', f'{label}≈ 0'
    return ('precise' if abs(value) < 1000 else 'numeric'), float(value)


for slope in [-1, -0.5, 0, 0.1, 0.5, 1]:
    for layers in [1, 2, 5, 10]:
        a = Fraction(str(slope))
        plain, skip = chain_derivative(a, layers), chain_derivative(1 + a, layers)
        verdict = ('skip path cancels' if abs(skip) < SMALL else 'skip keeps signal' if abs(skip) > abs(plain)
                   else 'plain is larger' if abs(skip) < abs(plain) else 'equal size')
        for a2 in [-3, 1, 3, 5]:
            for axis in ['Per token', 'Whole batch (bug)']:
                for comp, others in COMPANIONS.items():
                    token = [1.0, float(a2)]
                    stats_over = token if axis == 'Per token' else token + others
                    out, mean, var = normalize(token, stats_over)
                    alone = normalize(token, token)[0]
                    for time in [0, 800, 1600, 2400, 3200, 4000, 4800]:
                        exact = {'rn-setup': f'F′ = {js(r3(a))}, layers {layers}', 'rn-token': f'token A = [1, {a2}]',
                                 'rn-batch': f'batch: A {comp}'}
                        numeric, precise, lists = {}, {}, {}
                        for node, at, label, value in [('rn-plain', 800, 'plain F′^L: ', plain),
                                                       ('rn-skip', 1600, 'skip (1+F′)^L: ', skip)]:
                            if time < at:
                                exact[node] = label + '…'
                                continue
                            kind, shown = fmt_derivative(label, value)
                            {'exact': exact, 'precise': precise, 'numeric': numeric}[kind][node] = shown
                        exact['rn-verdict'] = verdict if time >= 2400 else '…'
                        if time >= 3200:
                            lists['rn-stats'] = [mean, var]
                            lists['rn-out'] = out
                            precise['rn-exact'] = out[1]
                        else:
                            exact.update({'rn-stats': 'mean …', 'rn-out': 'A → …', 'rn-exact': 'A[1] = …'})
                        if time >= 4000:
                            lists['rn-alone'] = alone
                            exact['rn-same'] = 'same as alone' if abs(out[0] - alone[0]) < 1e-9 else 'batch changed A'
                        else:
                            exact.update({'rn-alone': 'A alone: …', 'rn-same': '…'})
                        geometry = {}
                        for row, base, base_y, at in [('plain', float(a), 112, 800), ('skip', float(1 + a), 190, 1600)]:
                            top = max(abs(base), abs(base) ** layers, 1e-9)
                            for l in range(1, 11):
                                h = 40 * abs(base) ** l / top
                                geometry[f'rn-bar-{row}-{l}'] = {'height': h, 'y': base_y - h,
                                                                 'opacity': float(l <= layers and time >= at)}
                        case('concept-residual-norm', dict(slope=slope, layers=layers, a2=a2, axis=axis, batch=comp),
                             time, numeric, exact, geometry, precise, lists)
CHECKS.append('layer-by-layer Fraction products of local derivatives (plain vs residual); statistics.fmean/pvariance two-pass normalization per token and over the batch')

# ----------------------------------------------------------- 13 embedding gather and scatter-add
EMB = [[1, 0], [0, 1], [1, 1], [-1, 0]]
POS = [[0, 0], [0.1, -0.1], [0.2, -0.2]]
UPSTREAM = [[1, 2], [2, -1], [-0.5, 3]]  # positions 0 and 2 from the lesson; position 1 invented


def lookup_and_scatter(ids, add_positions, accumulate):
    gathered = [list(EMB[i]) for i in ids]  # copies of selected rows
    xs = [[g + (p if add_positions else 0) for g, p in zip(row, POS[k])] for k, row in enumerate(gathered)]
    table_grad = [[0, 0] for _ in EMB]
    for k, token in enumerate(ids):
        for c in range(2):
            if accumulate:
                table_grad[token][c] = table_grad[token][c] + UPSTREAM[k][c]
            else:
                table_grad[token][c] = UPSTREAM[k][c]
    return xs, table_grad


_xs, _tg = lookup_and_scatter([2, 0, 2], True, True)
assert [[r3(v) for v in row] for row in _xs] == [[1, 1], [1.1, -0.1], [1.2, 0.8]] and _tg[2] == [0.5, 5]
for id0 in range(4):
    for id1 in [0, 2, 3]:
        for id2 in range(4):
            ids = [id0, id1, id2]
            for positions in [True, False]:
                for scatter in ['Accumulate (+=)', 'Overwrite (bug)']:
                    xs, table_grad = lookup_and_scatter(ids, positions, scatter == 'Accumulate (+=)')
                    used = sorted(set(ids))
                    for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                        exact = {'es-ids': f'ids = [{id0}, {id1}, {id2}]',
                                 'es-formula': 'x = E[id] + p' if positions else 'x = E[id], no position',
                                 'es-rule': 'repeats add up' if scatter == 'Accumulate (+=)' else 'last write wins (bug)'}
                        for r in range(4):
                            label = f'{r}: [{EMB[r][0]}, {EMB[r][1]}]'
                            if time >= 800 and r in used:
                                label += ' ← pos' + ''.join(f' {k}' for k in range(3) if ids[k] == r)
                            exact[f'es-row-{r}'] = label
                            exact[f'es-grad-{r}'] = (f'∂E{r} = [{js(r3(table_grad[r][0]))}, {js(r3(table_grad[r][1]))}]'
                                                     if time >= 3200 else f'∂E{r} = …')
                        for k in range(3):
                            exact[f'es-x-{k}'] = (f'x{k} = [{js(r3(xs[k][0]))}, {js(r3(xs[k][1]))}]' if time >= 1600
                                                  else f'x{k} = …')
                        exact['es-compare'] = (('x0 vs x2: ' + ('equal' if xs[0] == xs[2] else 'differ')) if time >= 2400
                                               else 'x0 vs x2: …')
                        exact['es-touched'] = f'rows touched: {len(used)}' if time >= 4000 else 'rows touched: …'
                        geometry = {f'es-hl-{r}': {'opacity': 0.18 if (time >= 800 and r in used) else 0.0} for r in range(4)}
                        case('concept-embedding-scatter',
                             dict(id0=id0, id1=id1, id2=id2, positions=positions, scatter=scatter), time, {}, exact, geometry)
CHECKS.append('row copies gathered by ID, position vectors added per position, explicit scatter loop into a gradient table (accumulate vs overwrite)')

# ----------------------------------------------------------- 14 LoRA: a low-rank update
LORA_A, LORA_B, GY = [1, 0, -1, 2], [2, -1, Fraction(1, 2)], [1, 0, -1]
INITS = {'Lesson A and B': (True, True), 'B starts at zero': (True, False), 'Both start at zero': (False, False)}


def lora_forward(Bcol, Arow, x, scale):
    inner = sum(a * v for a, v in zip(Arow, x))          # A·x first (rank one)
    delta = [scale * b * inner for b in Bcol]
    dense = [[scale * b * a for a in Arow] for b in Bcol]  # materialized ΔW
    via_dense = [sum(w * v for w, v in zip(row, x)) for row in dense]
    return inner, delta, dense, via_dense


def lora_grads(Bcol, Arow, x, scale):
    """Gradients of gy·Δy by exact one-at-a-time perturbation (Δy is linear in each factor)."""
    def objective(B_, A_):
        return sum(g * d for g, d in zip(GY, lora_forward(B_, A_, x, scale)[1]))
    base = objective(Bcol, Arow)
    dB = [objective([b + (1 if j == i else 0) for j, b in enumerate(Bcol)], Arow) - base for i in range(3)]
    dA = [objective(Bcol, [a + (1 if j == i else 0) for j, a in enumerate(Arow)]) - base for i in range(4)]
    return dB, dA


def trainable(out, inp, rank):
    shapes = {'B': (out, rank), 'A': (rank, inp)}
    return sum(r * c for r, c in shapes.values())


assert lora_forward(LORA_B, LORA_A, [1, 2, 3, 4], 1)[:2] == (6, [12, -6, 3]) and trainable(3, 4, 1) == 7
assert lora_grads(LORA_B, LORA_A, [1, 2, 3, 4], 1) == ([6, 0, -6], [Fraction(3, 2), 3, Fraction(9, 2), 6])
vecs = lambda vals: '[' + ', '.join(js(r3(v)) for v in vals) + ']'
for scale in [0, 1, 2]:
    for x3 in [-2, 0, 1, 4]:
        x = [1, 2, 3, x3]
        for rank in [1, 2, 3]:
            for init, (a_on, b_on) in INITS.items():
                Arow = LORA_A if a_on else [0, 0, 0, 0]
                Bcol = LORA_B if b_on else [0, 0, 0]
                inner, delta, dense, via_dense = lora_forward(Bcol, Arow, x, scale)
                dB, dA = lora_grads(Bcol, Arow, x, scale)
                count = trainable(3, 4, rank)
                zero = lambda vals: all(v == 0 for v in vals)
                # Cause first: a zero scale removes the update and every factor gradient, whatever the init.
                if scale == 0:
                    assert zero(delta) and zero(dA) and zero(dB)
                    verdict = 's = 0 scales it all out'
                elif not a_on and not b_on:
                    assert zero(dA) and zero(dB)  # the lesson's trap: each gradient needs the other factor
                    verdict = 'no factor can learn'
                elif zero(dA) and zero(dB):
                    assert inner == 0  # only this example's A·x vanishes
                    verdict = 'A·x = 0: no signal here'
                elif zero(dA):
                    assert not b_on and zero(delta)  # standard init: update starts at exactly zero, B still learns
                    verdict = 'Δy is 0, B still learns'
                elif zero(dB):
                    verdict = 'only A gets a signal'
                else:
                    verdict = 'both factors learn'
                for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                    exact = {'lo-x': f'x = [1, 2, 3, {x3}]', 'lo-count': f'rank {rank}: {count} trainable',
                             'lo-dense-count': f'dense W has 12: {"saves" if count < 12 else "costs"} {abs(12 - count)}',
                             'lo-init': f'init: {init}', 'lo-scale': f's = {scale}; B is a column'}
                    for j in range(4):
                        exact[f'lo-a-{j}-v'] = js(Arow[j])
                    for i in range(3):
                        exact[f'lo-b-{i}-v'] = js(r3(Bcol[i]))
                    geometry = {}
                    for i, j in product(range(3), range(4)):
                        exact[f'lo-w-{i}-{j}-v'] = js(r3(dense[i][j]))
                        geometry[f'lo-w-{i}-{j}-v'] = {'opacity': float(time >= 800)}
                        geometry[f'lo-w-{i}-{j}-hl'] = {'opacity': 0.3 if (time >= 800 and dense[i][j] != 0) else 0.0}
                    exact['lo-inner'] = f'A·x = {js(r3(inner))}' if time >= 1600 else 'A·x = …'
                    exact['lo-dy'] = f'Δy = {vecs(delta)}' if time >= 2400 else 'Δy = …'
                    exact['lo-dense'] = f'ΔW·x = {vecs(via_dense)}' if time >= 3200 else 'ΔW·x = …'
                    exact['lo-check'] = (('factored = dense' if delta == via_dense else 'mismatch') if time >= 3200 else '…')
                    exact['lo-db'] = f'∂B = {vecs(dB)}' if time >= 4000 else '∂B = …'
                    exact['lo-da'] = f'∂A = {vecs(dA)}' if time >= 4000 else '∂A = …'
                    exact['lo-verdict'] = verdict if time >= 4000 else '…'
                    case('concept-lora-update', dict(scale=scale, x3=x3, rank=rank, init=init), time, {}, exact, geometry)
CHECKS.append('LoRA: factor-order forward vs materialized dense ΔW, gradients by exact one-at-a-time perturbation, trainable counts from factor shapes')

# ----------------------------------------------------------- 15 data, tensor and pipeline messages
WP = [[1, 3], [2, 4]]


def row_times(x, W):
    return [sum(x[i] * W[i][j] for i in range(len(x))) for j in range(len(W[0]))]


def tensor_parallel(x, split, combine):
    if split == 'Output columns':
        parts = [[sum(x[i] * WP[i][j] for i in range(2))] for j in range(2)]  # worker j owns column j
    else:
        parts = [[x[i] * w for w in WP[i]] for i in range(2)]                  # worker i owns input feature i
    if combine == 'Concatenate':
        return parts, parts[0] + parts[1]
    return parts, [a + b for a, b in zip(parts[0], parts[1])]


def pipeline(w, v, x=1, target=4, message='dL/dh (correct)'):
    h = w * x                      # stage A forward
    pred = v * h                   # stage B forward
    loss = (pred - target) ** 2 / 2
    dpred = pred - target
    dv = dpred * h                 # stays on stage B
    dh = dpred * v                 # the activation sensitivity A needs
    sent = dh if message == 'dL/dh (correct)' else dv
    dw = sent * x
    central = (((v * (w + Fraction(1, 3)) * x - target) ** 2 - (v * (w - Fraction(1, 3)) * x - target) ** 2) / 2) / Fraction(2, 3)
    return dict(h=h, pred=pred, loss=loss, dpred=dpred, dv=dv, dh=dh, sent=sent, dw=dw, central=central)


assert row_times([1, 2], WP) == [5, 11]
assert tensor_parallel([1, 2], 'Input features', 'Sum') == ([[1, 3], [4, 8]], [5, 11])
_pp = pipeline(Fraction(2), Fraction(3))
assert (_pp['pred'], _pp['loss'], _pp['dpred'], _pp['dv'], _pp['dh'], _pp['dw']) == (6, 2, 2, 4, 6, 6) and _pp['central'] == 6
assert statistics.fmean([2] + [6] * 3) == 5
states15 = []
for x1 in [-2, 1, 3]:
    for x2 in [-2, 0, 2]:
        for split in ['Output columns', 'Input features']:
            for combine in ['Concatenate', 'Sum']:
                for n2 in [1, 3, 4]:
                    for message in ['dL/dh (correct)', "B's weight gradient"]:
                        states15.append(dict(x1=x1, x2=x2, split=split, combine=combine, n2=n2, w=2, v=3, message=message))
for w in [0, 1.5, 2, 3]:
    for v in [0, 2.5, 3, 4]:
        for message in ['dL/dh (correct)', "B's weight gradient"]:
            for split, combine in [('Output columns', 'Sum'), ('Input features', 'Concatenate')]:
                states15.append(dict(x1=1, x2=2, split=split, combine=combine, n2=3, w=w, v=v, message=message))
for state in states15:
    x = [state['x1'], state['x2']]
    want = row_times(x, WP)
    parts, got = tensor_parallel(x, state['split'], state['combine'])
    per_example = [2] + [6] * state['n2']
    weighted = statistics.fmean(per_example)
    equal = statistics.fmean([statistics.fmean([2]), statistics.fmean([6] * state['n2'])])
    assert equal == 4
    pp = pipeline(Fraction(str(state['w'])), Fraction(str(state['v'])), message=state['message'])
    assert pp['dh'] * 1 == pp['central']
    cols = state['split'] == 'Output columns'
    for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800, 5600, 6000]:
        exact = {'ps-x': f'x = [{x[0]}, {x[1]}]', 'ps-split': f'split: {state["split"]}',
                 'ps-combine-rule': f'combine: {state["combine"]}', 'ps-want': f'want [{want[0]}, {want[1]}]',
                 'ps-r2': f'r2: {state["n2"]} examples, mean 6',
                 'ps-params': f'x = 1, w = {js(r3(state["w"]))}, v = {js(r3(state["v"]))}',
                 'ps-message': 'message: ' + ('dL/dh' if state['message'] == 'dL/dh (correct)' else 'dv (bug)')}
        if time >= 800:
            if cols:
                exact['ps-w0'], exact['ps-w1'] = f'w0: x·col0 = {parts[0][0]}', f'w1: x·col1 = {parts[1][0]}'
            else:
                exact['ps-w0'] = f'w0: {x[0]}·[1, 3] = [{parts[0][0]}, {parts[0][1]}]'
                exact['ps-w1'] = f'w1: {x[1]}·[2, 4] = [{parts[1][0]}, {parts[1][1]}]'
        else:
            exact['ps-w0'], exact['ps-w1'] = 'w0: …', 'w1: …'
        exact['ps-got'] = ('got [' + ', '.join(str(g) for g in got) + ']') if time >= 1600 else 'got …'
        exact['ps-verdict'] = ('contract matches' if got == want else 'wrong combine') if time >= 2400 else '…'
        numeric = {}
        if time >= 3200:
            numeric['ps-weighted'] = weighted
            exact['ps-equal'] = f'mean of means = {js(equal)}'
        else:
            exact.update({'ps-weighted': 'weighted = …', 'ps-equal': 'mean of means = …'})
        if time >= 4000:
            exact['ps-forward'] = f'h = {js(r3(pp["h"]))}, pred = {js(r3(pp["pred"]))}'
            exact['ps-loss'] = f'loss = {js(r3(pp["loss"]))} (target 4)'
        else:
            exact.update({'ps-forward': 'h = …', 'ps-loss': 'loss = …'})
        for node, at, key, label in [('ps-dpred', 4800, 'dpred', 'dL/dpred = …'), ('ps-dv', 4800, 'dv', 'B: dv = …'),
                                     ('ps-msg', 5600, 'sent', 'sent: …'), ('ps-dw', 5600, 'dw', 'A: dw = …')]:
            if time >= at:
                numeric[node] = float(pp[key])
            else:
                exact[node] = label
        exact['ps-dw-verdict'] = (('dw is right' if pp['dw'] == pp['central'] else 'dw is wrong') if time >= 5600 else '…')
        geometry = {'ps-back-arrow': {'opacity': float(time >= 5600)}}
        case('concept-parallel-split', state, time, numeric, exact, geometry)
CHECKS.append('explicit column-owned and feature-owned worker partials with concat/sum; fmean over per-example gradients; two-stage pipeline messages checked by an exact central difference')

# ----------------------------------------------------------- 16 streaming log-sum-exp over vocabulary tiles
def streaming_loss(z, target, rule):
    """The lesson's running max/sum loop over two vocabulary tiles, plus the two broken combines."""
    tiles = [z[:2], z[2:]]
    if rule == 'tile only':
        k = 0 if target < 2 else 1
        mt = max(tiles[k])
        st = sum(math.exp(v - mt) for v in tiles[k])
        return mt + math.log(st) - z[target], mt, st
    m, s = -math.inf, 0.0
    for tile in tiles:
        mt = max(tile)
        st = sum(math.exp(v - mt) for v in tile)
        M = max(m, mt)
        if rule == 'rescale':
            s = s * math.exp(m - M) + st * math.exp(mt - M)
        else:
            s = s + st
        m = M
    return m + math.log(s) - z[target], m, s


assert abs(streaming_loss([1000., 999., 998., 997.], 2, 'rescale')[0] - 2.4401896985611953) < 1e-10


def reference_loss(z, target):
    m = max(z)
    return m + math.log(math.fsum(math.exp(v - m) for v in z)) - z[target]


TILES = {'No tiling': None, '256 token rows': 'rows', '256 vocab columns': 'cols'}
NEEDS = {'No tiling': 'one big array', '256 token rows': 'rows are independent', '256 vocab columns': 'needs global softmax'}
assert Fraction(4 * 1024 * 8192, 2 ** 20) == 32 and Fraction(4 * 256 * 8192, 2 ** 20) == 8 and Fraction(4 * 1024 * 256, 2 ** 20) == 1
assert abs(64 * 0.015 - 0.96) < 1e-12 and abs(4 * 0.015 - 0.06) < 1e-12
states16 = [dict(N=N, V=V, tile=tile, z3=997, target='z2', checks=checks)
            for N in [256, 1024, 2048] for V in [1024, 8192, 16384] for tile in TILES for checks in [1, 64]]
states16 += [dict(N=1024, V=8192, tile=tile, z3=z3, target=target, checks=4)
             for z3 in [995, 997, 998, 1000, 1001, 1003] for target in ['z0', 'z1', 'z2', 'z3']
             for tile in ['256 token rows', '256 vocab columns']]
for state in states16:
    N, V, z3 = state['N'], state['V'], state['z3']
    full = Fraction(4 * N * V, 2 ** 20)
    tile_bytes = {'No tiling': 4 * N * V, '256 token rows': 4 * 256 * V, '256 vocab columns': 4 * N * 256}[state['tile']]
    z = [1000.0, 999.0, 998.0, float(z3)]
    tgt = int(state['target'][1])
    ok, M, s_ok = streaming_loss(z, tgt, 'rescale')
    bad, _, s_bad = streaming_loss(z, tgt, 'no rescale')
    only = streaming_loss(z, tgt, 'tile only')[0]
    ref = reference_loss(z, tgt)
    assert abs(ok - ref) < 1e-12
    m1, m2 = max(z[:2]), max(z[2:])
    s1, s2 = sum(math.exp(v - m1) for v in z[:2]), sum(math.exp(v - m2) for v in z[2:])
    probs = [math.exp(v - M) / s_ok for v in z]
    for time in [0, 799, 800, 1200, 2000, 2800, 3600, 4400, 5200]:
        exact = {'sl-nv': f'N = {N}, V = {V}', 'sl-checks': f'{state["checks"]} flag reads × 15 µs'}
        numeric, lists = {'sl-ms': state['checks'] * 0.015}, {}
        if time >= 800:
            numeric.update({'sl-full': float(full), 'sl-tile': tile_bytes / 2 ** 20})
            exact['sl-needs'] = NEEDS[state['tile']]
        else:
            exact.update({'sl-full': 'full: …', 'sl-tile': 'tile: …', 'sl-needs': '…'})
        if time >= 1200:
            exact['sl-t1'] = f't1: m {js(m1)}'
            numeric['sl-t1-s'] = s1
        else:
            exact.update({'sl-t1': 't1: …', 'sl-t1-s': 's …'})
        if time >= 2000:
            exact['sl-t2'] = f't2: m {js(m2)}'
            numeric['sl-t2-s'] = s2
        else:
            exact.update({'sl-t2': 't2: …', 'sl-t2-s': 's …'})
        if time >= 2800:
            lists['sl-rescale'] = [math.exp(m1 - M), math.exp(m2 - M)]
            exact['sl-run-m'] = f'M = {js(M)},'
            numeric['sl-run-s'] = s_ok
        else:
            exact.update({'sl-rescale': '×e^(m−M): …', 'sl-run-m': 'M = …', 'sl-run-s': 's = …'})
        if time >= 3600:
            numeric.update({'sl-ok': ok, 'sl-bad': bad, 'sl-tileonly': only})
            exact['sl-verdict'] = 'no rescale needed here' if abs(s_bad - s_ok) < 1e-12 else 'only rescaling is right'
        else:
            exact.update({'sl-ok': 'rescaled: …', 'sl-bad': 'no rescale: …', 'sl-tileonly': 'tile only: …', 'sl-verdict': '…'})
        if time >= 4400:
            numeric.update({'sl-p': probs[tgt], 'sl-dz': probs[tgt] - 1})
        else:
            exact.update({'sl-p': 'p(target) = …', 'sl-dz': '∂z_t = …'})
        exact['sl-z-3'] = str(z3)
        geometry = {f'sl-target-{i}': {'opacity': 0.45 if i == tgt else 0.0} for i in range(4)}
        case('concept-streaming-lse', state, time, numeric, exact, geometry, lists=lists)
CHECKS.append("the lesson's streaming running-max/scaled-sum loop over two vocab tiles (math.exp/log), versus a direct fsum log-sum-exp, a no-rescale sum and a target-tile-only softmax; logits memory from 4·N·V bytes")

# =========================================================== third batch (17-24)
# Each verdict below is chosen by asserting its cause on the independently computed state, so a
# wording that blames the wrong factor cannot be generated by this oracle.

# ----------------------------------------------------------- 17 text to IDs and a greedy next token
VOCAB = ['a', 'b', ' ']
NEXT_PROB = [[0.1, 0.7, 0.2], [0.2, 0.2, 0.6], [0.8, 0.1, 0.1]]  # the lesson's invented table
assert all(abs(math.fsum(row) - 1) < 1e-12 for row in NEXT_PROB)
TOKENIZERS = {'Matches the model': {ch: i for i, ch in enumerate(VOCAB)},
              'a, b IDs swapped': {'a': 1, 'b': 0, ' ': 2}}
MODEL_IDS = TOKENIZERS['Matches the model']


def glyph(ch):
    return '␣' if ch == ' ' else ch


def greedy_generate(ids, count):
    """Look up the row of the last ID, take the most probable ID, append it, repeat."""
    table_before = [list(row) for row in NEXT_PROB]
    context, picks = list(ids), []
    for _ in range(count):
        row = NEXT_PROB[context[-1]]
        best = max(range(len(row)), key=lambda i: row[i])
        picks.append((context[-1], best, row[best]))
        context.append(best)
    assert NEXT_PROB == table_before  # generation changes the context, never the table
    return picks


_ids = [MODEL_IDS[c] for c in 'ab a']
assert _ids == [0, 1, 2, 0] and greedy_generate(_ids, 2) == [(0, 1, 0.7), (1, 2, 0.6)]
for label in ['ab␣a', 'b␣a', 'ab␣', 'ba␣b']:
    chars = label.replace('␣', ' ')
    for tokenizer, enc in TOKENIZERS.items():
        dec = {v: k for k, v in enc.items()}
        swapped = tokenizer != 'Matches the model'
        ids = [enc[c] for c in chars]
        picks = greedy_generate(ids, 3)
        last_row, best, prob = picks[0]
        right_row = last_row == MODEL_IDS[chars[-1]]
        right_decode = dec[best] == VOCAB[best]
        if not swapped:
            assert right_row and right_decode
            verdict = 'row and decode match'
        elif right_row:
            assert not right_decode  # the space keeps ID 2; only the chosen ID decodes wrongly
            verdict = 'right row, wrong decode'
        else:
            verdict = 'wrong row: a, b swapped'
        for steps in range(4):
            shown_text = label + ''.join(glyph(dec[p[1]]) for p in picks[:steps])
            for targets in ['Next token (shift)', 'Current token (bug)']:
                inputs, labels = [], []
                for pos in range(len(ids) - 1):
                    inputs.append(ids[pos])
                    labels.append(ids[pos + 1] if targets == 'Next token (shift)' else ids[pos])
                if targets == 'Current token (bug)':
                    assert labels == inputs  # every target is visible as its own input
                    leak = 'leak: target = input'
                else:
                    assert all(labels[p] == ids[p + 1] for p in range(len(labels)))
                    leak = 'target = next token'
                for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                    exact = {'tk-map': ', '.join(f'{glyph(c)}→{enc[c]}' for c in VOCAB) + (' (swapped)' if swapped else ''),
                             'tk-ids': 'IDs [' + ', '.join(str(i) for i in ids) + ']',
                             'tk-last': f"last '{glyph(chars[-1])}' → ID {ids[-1]}",
                             'tk-fixed': 'the table never changes',
                             'tk-rule': 'targets: ' + ('current (bug)' if targets == 'Current token (bug)' else 'shift by one'),
                             'tk-count': f'{len(ids) - 1} pairs from {len(ids)} IDs'}
                    exact['tk-row'] = (f'row {last_row}: [' + ', '.join(js(p) for p in NEXT_PROB[last_row]) + ']'
                                       if time >= 800 else 'row …')
                    exact['tk-greedy'] = f'greedy ID {best}, p = {js(prob)}' if time >= 1600 else 'greedy …'
                    exact['tk-decode'] = f"decodes to '{glyph(dec[best])}'" if time >= 2400 else 'decodes to …'
                    exact['tk-text'] = f'text: {shown_text}' if time >= 3200 else 'text: …'
                    exact['tk-verdict'] = verdict if time >= 4000 else '…'
                    exact['tk-inputs'] = ('inputs [' + ', '.join(map(str, inputs)) + ']') if time >= 4000 else 'inputs …'
                    exact['tk-targets'] = ('targets [' + ', '.join(map(str, labels)) + ']') if time >= 4000 else 'targets …'
                    exact['tk-leak'] = leak if time >= 4000 else '…'
                    geometry = {}
                    for i in range(7):
                        if i < len(chars):
                            k, ch, tid = 0, glyph(chars[i]), str(ids[i])
                        else:
                            k = i - len(chars) + 1
                            ch, tid = (glyph(dec[picks[k - 1][1]]), str(picks[k - 1][1])) if k <= 3 else ('', '')
                        visible = 1.0 if k == 0 else float(time >= 2400 and k <= steps)
                        exact[f'tk-ch-{i}'], exact[f'tk-id-{i}'] = ch, tid
                        for node in ['box', 'ch', 'id']:
                            geometry[f'tk-{node}-{i}'] = {'opacity': visible}
                        geometry[f'tk-gen-{i}'] = {'opacity': 0.0 if k == 0 else 0.3 * visible}
                    case('concept-token-ids', dict(prompt=label, steps=steps, tokenizer=tokenizer, targets=targets),
                         time, {}, exact, geometry)
CHECKS.append('character tokenizer dictionaries, a literal last-ID row lookup with max() and append loop, decoding through the inverse map, and next-token pairs built by an explicit shift loop; verdict causes asserted (row versus decode)')


# ----------------------------------------------------------- 18 a training loop is a state machine
def train_loop(w0, eta, steps, variant, x=2, y=4):
    """The lesson's explicit loop, with the two broken variants it names."""
    w, buffer, history = w0, Fraction(0), []
    for _ in range(steps):
        gradient = (w * x - y) * x
        if variant == 'Correct loop':
            used, w = gradient, w - eta * gradient
        elif variant == 'Sign flipped':
            used, w = gradient, w + eta * gradient
        else:
            buffer += gradient  # never cleared between steps
            used, w = buffer, w - eta * buffer
        history.append((gradient, used, w, (w * x - y) ** 2 / 2))
    return history


_h = train_loop(Fraction(1), Fraction(1, 10), 2, 'Correct loop')
assert [h[2] for h in _h] == [Fraction(14, 10), Fraction(164, 100)] and [h[3] for h in _h] == [Fraction(72, 100), Fraction(2592, 10000)]
assert train_loop(Fraction(1), Fraction(1, 10), 1, 'Sign flipped')[0][2:] == (Fraction(6, 10), Fraction(392, 100))
assert [h[1:3] for h in train_loop(Fraction(1), Fraction(1, 10), 2, 'Gradient not cleared')] == [(-4, Fraction(14, 10)), (Fraction(-64, 10), Fraction(204, 100))]
LOOP_RULES = {'Correct loop': 'w −= η·g', 'Sign flipped': 'w += η·g (bug)', 'Gradient not cleared': 'w −= η·Σg (bug)'}
for w0 in [0, 0.5, 1, 2, 3]:
    for eta in [0.05, 0.1, 0.25, 0.3]:
        W0, ETA = Fraction(str(w0)), Fraction(str(eta))
        L0 = (W0 * 2 - 4) ** 2 / 2
        ref = train_loop(W0, ETA, 3, 'Correct loop')
        for variant in LOOP_RULES:
            var = train_loop(W0, ETA, 3, variant)
            for steps in [1, 2, 3]:
                same = all(var[k][2] == ref[k][2] for k in range(steps))
                if variant == 'Correct loop':
                    verdict = 'matches the reference'
                elif same:
                    if all(h[0] == 0 for h in var[:steps]):
                        verdict = 'hidden: gradient is 0'
                    else:
                        assert variant == 'Gradient not cleared' and steps == 1 and var[0][1] == var[0][0]
                        verdict = 'same: 1 step, no stale g'  # the buffer holds only the fresh gradient
                else:
                    first = next(k for k in range(steps) if var[k][2] != ref[k][2])
                    if variant == 'Sign flipped':
                        assert var[first][0] != 0
                        verdict = 'wrong: sign flipped'
                    else:
                        assert first >= 1 and var[first][1] != var[first][0]  # a stale gradient was applied
                        verdict = 'wrong: buffer not cleared'
                Lv, Lr = var[steps - 1][3], ref[steps - 1][3]
                if Lv < L0:
                    note = 'loss fell' if (variant == 'Correct loop' or same) else 'loss fell, still wrong'
                else:
                    note = 'loss rose' if Lv > L0 else 'loss unchanged'
                for time in [0, 799, 800, 1600, 2400, 3200, 4000]:
                    exact = {'lp-setup': f'x 2, y 4, η {js(r3(ETA))}', 'lp-start': f'w0 = {js(w0)}, L = {js(r3(L0))}',
                             'lp-rule': LOOP_RULES[variant]}
                    numeric, geometry = {}, {}
                    xs = lambda w: 24 + 40 * (min(4, max(-2, float(w))) + 2)
                    # Both loop cards are sized to the chosen number of steps: one 28-unit row each.
                    rows_drawn = sum(1 for k in range(1, 4) if k <= steps)
                    geometry['lp-ref-bg'] = {'height': 162 + 28 * (rows_drawn - 1)}
                    geometry['lp-var-bg'] = {'height': 140 + 28 * (rows_drawn - 1)}
                    geometry['lp-ref-loss'] = {'y': 90 + 28 * rows_drawn + 32}
                    geometry['lp-var-loss'] = {'y': 62 + 28 * rows_drawn + 34}
                    geometry['lp-ref-dot-0'] = {'x': xs(W0), 'opacity': 1.0}
                    geometry['lp-var-dot-0'] = {'x': xs(W0), 'opacity': 1.0}
                    for k in range(1, 4):
                        g, _, wr, _ = ref[k - 1]
                        _, used, wv, _ = var[k - 1]
                        shown = time >= 800 * k
                        word = 'buf ' if variant == 'Gradient not cleared' else 'g '
                        exact[f'lp-ref-{k}'] = f'{k}: g {js(r3(g))} → w {js(r3(wr))}' if shown else f'{k}: …'
                        exact[f'lp-var-{k}'] = f'{k}: {word}{js(r3(used))} → w {js(r3(wv))}' if shown else f'{k}: …'
                        geometry[f'lp-ref-{k}'] = geometry[f'lp-var-{k}'] = {'opacity': float(k <= steps)}
                        geometry[f'lp-ref-dot-{k}'] = {'x': xs(wr), 'opacity': float(shown and k <= steps)}
                        geometry[f'lp-var-dot-{k}'] = {'x': xs(wv), 'opacity': float(shown and k <= steps)}
                    if time >= 2400:
                        numeric['lp-ref-loss'] = float(Lr)
                        numeric['lp-var-loss'] = float(Lv)
                    else:
                        exact.update({'lp-ref-loss': 'loss → …', 'lp-var-loss': 'loss …'})
                    exact['lp-verdict'] = verdict if time >= 3200 else '…'
                    exact['lp-loss-note'] = note if time >= 3200 else '…'
                    case('concept-loop-states', dict(w0=w0, eta=eta, steps=steps, variant=variant), time, numeric, exact, geometry)
CHECKS.append("the lesson's explicit two-variable training loop in exact Fractions with a sign-flip and an uncleared buffer; verdict causes asserted (zero gradient, single step, flipped sign, stale buffer)")


# ----------------------------------------------------------- 19 queries, keys and values
def mat(a, b):
    return [[sum(a[i][r] * b[r][j] for r in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def tr(m):
    return [list(col) for col in zip(*m)]


def m2(m):
    return f'[[{m[0][0]},{m[0][1]}], [{m[1][0]},{m[1][1]}]]'


WQ, WK, WV = [[1, 1], [0, 1]], [[1, 0], [1, 1]], [[2, 0], [0, 3]]
FIXTURES = {'Lesson X': [[1, 0], [0, 2]], 'Identity X': [[1, 0], [0, 1]], 'All-ones X': [[1, 1], [1, 1]]}
EYE = [[1, 0], [0, 1]]  # invented upstream gradient for each of Q, K and V


def input_gradient(X, routes):
    """∂X of Σ (I ⊙ P) over the kept projections, by exact one-at-a-time perturbation (linear in X)."""
    def objective(Xp):
        return sum(sum(EYE[i][j] * mat(Xp, W)[i][j] for i in range(2) for j in range(2)) for W in routes)
    base = objective(X)
    return [[objective([[X[a][b] + (1 if (a, b) == (i, j) else 0) for b in range(2)] for a in range(2)]) - base
             for j in range(2)] for i in range(2)]


_X = FIXTURES['Lesson X']
assert mat(_X, WQ) == [[1, 1], [0, 2]] and mat(_X, WK) == [[1, 0], [2, 2]] and mat(_X, WV) == [[2, 0], [0, 6]]
assert mat(mat(_X, WQ), tr(mat(_X, WK))) == [[1, 4], [0, 4]] and sum(len(W) * len(W[0]) for W in [WQ, WK, WV]) == 12
assert input_gradient(_X, [WQ, WK, WV]) == [[4, 1], [1, 5]] and input_gradient(_X, [WQ, WK]) == [[2, 1], [1, 2]]
for fixture, X in FIXTURES.items():
    Q, K, V = mat(X, WQ), mat(X, WK), mat(X, WV)
    S = mat(Q, tr(K))
    symmetric = S == tr(S)
    for order in ['Q·Kᵀ', 'K·Qᵀ (swapped)']:
        swapped = order != 'Q·Kᵀ'
        shown = mat(K, tr(Q)) if swapped else S
        if swapped:
            assert shown == tr(S)
            verdict = 'swap hidden: S symmetric' if symmetric else 'swapped: this is Sᵀ'
            assert (shown == S) == symmetric  # hidden exactly when the fixture makes S symmetric
        else:
            verdict = 'rows are queries'
        for branches in ['Q, K and V', 'V branch dropped']:
            dropped = branches == 'V branch dropped'
            dX = input_gradient(X, [WQ, WK] if dropped else [WQ, WK, WV])
            assert mat(tr(X), EYE) == tr(X)
            for query in [0, 1]:
                for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                    exact = {'qk-x': f'X = {m2(X)}', 'qk-order': f'order: {order}',
                             'qk-routes': 'routes: ' + ('Q, K (V dropped)' if dropped else 'Q, K and V')}
                    for node, label, M in [('qk-q', 'Q = X·Wq = ', Q), ('qk-k', 'K = X·Wk = ', K), ('qk-v', 'V = X·Wv = ', V)]:
                        exact[node] = label + m2(M) if time >= 800 else label.split(' ')[0] + ' = …'
                    geometry = {}
                    for i in range(2):
                        for j in range(2):
                            exact[f'qk-s-{i}-{j}-v'] = str(shown[i][j]) if time >= 1600 else '…'
                            geometry[f'qk-s-{i}-{j}-hl'] = {'opacity': 0.3 if (time >= 1600 and i == query) else 0.0}
                    exact['qk-row'] = f'row {query}: [{shown[query][0]}, {shown[query][1]}]' if time >= 2400 else 'row …'
                    exact['qk-verdict'] = verdict if time >= 3200 else '…'
                    exact['qk-sym'] = ('S is ' + ('symmetric' if symmetric else 'not symmetric')) if time >= 3200 else 'S is …'
                    exact['qk-dwq'] = f'∂Wq = Xᵀ = {m2(tr(X))}' if time >= 4000 else '∂Wq = …'
                    exact['qk-dx'] = f'∂X = {m2(dX)}' if time >= 4000 else '∂X = …'
                    exact['qk-dx-verdict'] = (('V route missing in ∂X' if dropped else 'all three routes added')
                                              if time >= 4000 else '…')
                    case('concept-qkv-scores', dict(fixture=fixture, query=query, order=order, branches=branches),
                         time, {}, exact, geometry)
CHECKS.append('Q/K/V by explicit matrix loops, scores and their transpose, symmetry decided from the matrix itself, and ∂X by exact perturbation of a linear objective with and without the V route')


# ----------------------------------------------------------- 20 asynchronous devices and timer boundaries
def timed_run(submit, run, queued, start_after_sync, stop_after_sync):
    """Event times on one host clock: earlier device work, enqueue, device execution, timer stamps."""
    device_busy_until = queued
    host = device_busy_until if start_after_sync else Fraction(0)  # optional wait before stamping start
    t_start = host
    host += submit  # the call returns here
    kernel_start = max(host, device_busy_until)
    kernel_end = kernel_start + run
    t_stop = kernel_end if stop_after_sync else host
    return t_start, kernel_start, kernel_end, t_stop


assert timed_run(Fraction(2, 10), 5, 0, True, False)[3] == Fraction(2, 10)
assert timed_run(Fraction(2, 10), 5, 0, True, True)[2:] == (Fraction(52, 10), Fraction(52, 10))
C_REF = mat([[1, 2], [3, 4]], [[2, 0], [1, 2]])
assert C_REF == [[4, 4], [10, 8]]
for submit in [0.1, 0.2, 0.5, 1]:
    for run in [1, 5, 10]:
        for queued in [0, 1, 3, 6]:
            for start in ['After earlier work', 'Immediately']:
                for stop in ['When the call returns', 'After device sync']:
                    SB = Fraction(str(submit))
                    t0, k0, k1, t1 = timed_run(SB, run, queued, start == 'After earlier work', stop == 'After device sync')
                    measured, latency = t1 - t0, SB + run
                    if stop == 'When the call returns':
                        assert measured == SB
                        verdict = 'submit only: no end sync'
                    elif measured == latency:
                        if start == 'After earlier work' or queued == 0:
                            verdict = 'completion latency'
                        else:
                            assert 0 < queued <= SB  # the earlier work drained before the call returned
                            verdict = 'matches: queue drained'
                    else:
                        assert start == 'Immediately' and measured - latency == queued - SB > 0
                        verdict = 'includes earlier work'
                    for layout in ['Index mapping kept', 'Row 1 permuted (bug)']:
                        row1 = C_REF[1][::-1] if layout == 'Row 1 permuted (bug)' else C_REF[1]
                        err = max(abs(a - b) for a, b in zip(row1, C_REF[1]))
                        for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                            exact = {'as-start': 'start: ' + ('after earlier work' if start == 'After earlier work' else 'immediately'),
                                     'as-stop': 'stop: ' + ('after device sync' if stop == 'After device sync' else 'call returns'),
                                     'as-c': f'A·B = {m2(C_REF)}', 'as-row1': f'kernel row 1: [{row1[0]}, {row1[1]}]',
                                     'as-err': f'max |error| = {err}',
                                     'as-map-verdict': 'permutation, not rounding' if err else 'same index mapping'}
                            exact['as-measured'] = f'timer: {js(r3(measured))} ms' if time >= 2400 else 'timer: …'
                            exact['as-latency'] = f'latency s + d: {js(r3(latency))} ms' if time >= 3200 else 'latency s + d: …'
                            exact['as-verdict'] = verdict if time >= 4000 else '…'
                            geometry = {'as-host': {'x': 84 + 11 * float(t0), 'width': 11 * float(SB), 'opacity': float(time >= 800)},
                                        'as-earlier': {'width': 11 * queued, 'opacity': float(time >= 1600)},
                                        'as-kernel': {'x': 84 + 11 * float(k0), 'width': 11 * run, 'opacity': float(time >= 1600)},
                                        'as-timer': {'x': 84 + 11 * float(t0), 'x2': 11 * float(measured), 'opacity': float(time >= 2400)}}
                            case('concept-async-timer', dict(submit=submit, run=run, queued=queued, start=start, stop=stop,
                                                             layout=layout), time, {}, exact, geometry)
CHECKS.append('an event-time model of host submission, earlier device work and timer stamps in exact Fractions; timer verdict causes asserted (no end sync, earlier queued work, drained queue); permuted row error from the reference product')


# ----------------------------------------------------------- 21 memory budget and Amdahl's limit
PHYSICAL, RESERVED = 24, 6
assert sum({'parameters': 5, 'gradients': 5, 'optimizer': 10, 'activations': 3}.values()) == 23 and PHYSICAL - RESERVED == 18
assert Fraction(10) / (Fraction(4, 2) + 6) == Fraction(5, 4)
for act in range(7):
    for half in [False, True]:
        parts = {'parameters': Fraction(5, 2) if half else 5, 'gradients': 5, 'optimizer': 10, 'activations': act}
        need = sum(parts.values())
        available = PHYSICAL - RESERVED
        for count in ['All training state', 'Parameters only (bug)']:
            partial = count == 'Parameters only (bug)'
            counted = parts['parameters'] if partial else need
            if partial:
                assert counted < need and counted <= available  # the partial count always claims headroom
                cause = 'params-only count hid it' if need > available else 'fits, but count partial'
            elif need > available:
                assert 2 * parts['parameters'] < need  # most of the need is gradients, moments and activations
                cause = f'weights: {js(parts["parameters"])} of {js(need)} GiB'
            else:
                cause = 'every state type counted'
            verdict = f'short by {js(need - available)} GiB' if need > available else f'fits: {js(available - need)} GiB spare'
            for speedup in [1, 2, 4, 8]:
                compute = Fraction(4, speedup)
                step = compute + 6
                if speedup == 1:
                    amdahl = 'no change at 1×'
                else:
                    assert step > 6 and Fraction(10) / step < Fraction(10, 6)
                    amdahl = 'wait-bound: 6 s floor'
                P = float(parts['parameters'])
                for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                    exact = {'mb-count': 'count: ' + ('parameters only' if partial else 'all training state'),
                             'mb-half': 'half-size weights: −2.5' if half else 'weights at full size',
                             'mb-speed': f'GPU {speedup}× faster'}
                    exact['mb-sum'] = f'{js(parts["parameters"])} + 5 + 10 + {act} = {js(need)}' if time >= 1600 else 'sum …'
                    exact['mb-counted'] = f'counted need {js(counted)} GiB' if time >= 2400 else 'counted need …'
                    exact['mb-real'] = f'real need {js(need)} of 18' if time >= 2400 else 'real need …'
                    exact['mb-verdict'] = verdict if time >= 3200 else '…'
                    exact['mb-cause'] = cause if time >= 3200 else '…'
                    exact['mb-amdahl-verdict'] = amdahl if time >= 4000 else '…'
                    numeric = {}
                    if time >= 3200:
                        numeric = {'mb-step': float(step), 'mb-speedup': float(Fraction(10) / step)}
                    else:
                        exact.update({'mb-step': 'step …', 'mb-speedup': 'speedup …'})
                    geometry = {'mb-params': {'width': 10 * P}, 'mb-grads': {'x': 16 + 10 * P},
                                'mb-opt': {'x': 66 + 10 * P}, 'mb-act': {'x': 166 + 10 * P, 'width': 10 * act},
                                'mb-budget': {'opacity': float(time >= 800)},
                                'mb-after-c': {'width': 24 * float(compute), 'opacity': float(time >= 3200)},
                                'mb-after-w': {'x': 16 + 24 * float(compute), 'opacity': float(time >= 3200)}}
                    case('concept-memory-budget', dict(act=act, half=half, count=count, speedup=speedup),
                         time, numeric, exact, geometry)
CHECKS.append('a named-part memory ledger against physical minus reserved memory, and Amdahl step times in exact Fractions; budget and speedup causes asserted')


# ----------------------------------------------------------- 22 pseudo-gradients and the outer merge
OLD_W, LOCAL_W = [10, 20], {'A': [9, 18], 'B': [8, 21]}
VALID_SETS = {'A and B': ['A', 'B'], 'A only': ['A'], 'None': []}


def outer_merge(valid, flipped, beta, lr, count, divides):
    pseudo = {n: [(l - o) if flipped else (o - l) for o, l in zip(OLD_W, w)] for n, w in LOCAL_W.items()}
    eligible = [pseudo[n] for n in valid]
    if not eligible:
        return pseudo, None  # the merge rejects an empty valid set
    mean = [Fraction(sum(col), len(eligible)) for col in zip(*eligible)]
    g = [v / count for v in mean] if divides else list(mean)
    momentum = [beta * 0 + v for v in g]  # old buffer is zero
    direction = [gv + beta * mv for gv, mv in zip(g, momentum)]
    return pseudo, dict(mean=mean, g=g, direction=direction, new=[o - lr * d for o, d in zip(OLD_W, direction)])


def chunk_lengths(n, count):
    length = -(-n // count)
    return length, [len(range(n)[i:i + length]) for i in range(0, n, length)]


_p, _m = outer_merge(['A', 'B'], False, Fraction(1, 2), Fraction(1, 5), 3, False)
assert _p == {'A': [1, 2], 'B': [2, -1]} and _m['g'] == [Fraction(3, 2), Fraction(1, 2)]
assert _m['direction'] == [Fraction(9, 4), Fraction(3, 4)] and _m['new'] == [Fraction(955, 100), Fraction(1985, 100)]
assert chunk_lengths(10, 3) == (4, [4, 4, 2])
vec3 = lambda lead, a, b: f'{lead}[{js(r3(a))}, {js(r3(b))}]'
for valid, names in VALID_SETS.items():
    for sign in ['old − local (source)', 'local − old (flipped)']:
        flipped = sign != 'old − local (source)'
        for beta in [0, 0.5, 0.9]:
            for lr in [0.1, 0.2, 1]:
                for count in [1, 3, 5]:
                    length, slices = chunk_lengths(10, count)
                    for use in ['Chunks only (source)', 'Also divides g (bug)']:
                        divides = use != 'Chunks only (source)'
                        pseudo, m = outer_merge(names, flipped, Fraction(str(beta)), Fraction(str(lr)), count, divides)
                        if m is None:
                            verdict, count_note, new = 'rejected: no valid input', 'count unused: rejected', OLD_W
                        else:
                            new = m['new']
                            target = [Fraction(sum(LOCAL_W[n][i] for n in names), len(names)) for i in range(2)]
                            toward = sum((nw - o) * (t - o) for nw, o, t in zip(new, OLD_W, target))
                            if flipped:
                                assert toward < 0
                                verdict = 'moves away: sign flipped'
                            else:
                                assert toward > 0
                                verdict = 'moves toward A' if names == ['A'] else 'moves toward A and B'
                            if divides and count == 1:
                                assert m['g'] == outer_merge(names, flipped, 0, 0, 1, False)[1]['g']
                                count_note = '÷ 1 hides the misread'
                            elif divides:
                                count_note = f'g ÷ {count}: count misread'
                            else:
                                count_note = 'count only sets chunks'
                        for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                            exact = {'om-sign': 'Δ = ' + ('local − old (bug)' if flipped else 'old − local'),
                                     'om-params': f'β {js(r3(beta))}, rate {js(r3(lr))}',
                                     'om-length': f'count {count}: length {length}',
                                     'om-slices': 'slices ' + ', '.join(map(str, slices))}
                            if time >= 800:
                                exact['om-a'] = 'A [9, 18]: invalid' if not names else vec3('A [9, 18]: Δ ', *pseudo['A'])
                                exact['om-b'] = vec3('B [8, 21]: Δ ', *pseudo['B']) if 'B' in names else 'B [8, 21]: invalid'
                            else:
                                exact['om-a'], exact['om-b'] = 'A …', 'B …'
                            # The mean line always shows the true mean; the bug's divided value has its own label.
                            if m is not None:
                                assert m['mean'] == [Fraction(sum(pseudo[n][i] for n in names), len(names)) for i in range(2)]
                                assert (m['g'] != m['mean']) == (divides and count > 1)
                            exact['om-g'] = (('mean g: no valid input' if m is None else vec3('mean g ', *m['mean']))
                                             if time >= 1600 else 'mean g …')
                            if time < 1600:
                                exact['om-used'] = 'used …'
                            elif m is None:
                                exact['om-used'] = 'used: nothing'
                            elif divides:
                                exact['om-used'] = f'bug ÷{count}: [{js(r3(m["g"][0]))}, {js(r3(m["g"][1]))}]'
                            else:
                                exact['om-used'] = 'used: mean g as is'
                            exact['om-dir'] = (('dir: none' if m is None else vec3('dir ', *m['direction']))
                                               if time >= 2400 else 'dir …')
                            exact['om-new'] = vec3('new ', *new) if time >= 3200 else 'new …'
                            exact['om-verdict'] = verdict if time >= 4000 else '…'
                            exact['om-count'] = count_note if time >= 4000 else '…'
                            geometry = {'om-p-new': {'x': 16 + 32 * (float(new[0]) - 6), 'y': 44 + 18 * (24 - float(new[1])),
                                                     'opacity': float(time >= 3200)},
                                        'om-move': {'x2': 32 * (float(new[0]) - 10), 'y2': -18 * (float(new[1]) - 20),
                                                    'opacity': float(time >= 3200)},
                                        'om-p-a': {'opacity': 1.0 if names else 0.3},
                                        'om-p-b': {'opacity': 1.0 if 'B' in names else 0.3}}
                            for j in range(10):
                                geometry[f'om-cell-{j}-hl'] = {'opacity': (0.5 if (j // length) % 2 == 0 else 0.15) if time >= 4000 else 0.0}
                            case('concept-outer-merge', dict(valid=valid, sign=sign, beta=beta, lr=lr, chunks=count, countUse=use),
                                 time, {}, exact, geometry)
CHECKS.append('pseudo-gradients from named local weights, an eligible-set mean that rejects an empty set, a momentum buffer from zero and an outer step in exact Fractions, and chunks by list slicing; direction checked by a dot product with the local results')


# ----------------------------------------------------------- 23 ready queue, activation cache and optimizer boundary
RETURN_DELAY = {'A': 2, 'B': 3, 'C': 2}  # invented scheduler steps from a forward to its backward


def scheduler(capacity, prefer_backward, keep_until_backward, steps=10):
    pending = deque('ABC')
    arrivals = []  # (due step, name) of returning backwards
    ready = deque()
    cache = {}
    finished, log = [], []
    ok = failed = idle = 0
    for step in range(1, steps + 1):
        for due, name in sorted(arrivals):
            if due == step:
                ready.append(name)
        can_forward = bool(pending) and len(cache) < capacity
        choice = None
        if prefer_backward:
            choice = 'B' if ready else 'F' if can_forward else None
        else:
            choice = 'F' if can_forward else 'B' if ready else None
        if choice == 'F':
            name = pending.popleft()
            arrivals.append((step + RETURN_DELAY[name], name))
            cache[name] = f'input-{name}'
            if not keep_until_backward:
                del cache[name]  # bug: the forward context is dropped as soon as the forward ends
            action = f'F({name})'
        elif choice == 'B':
            name = ready.popleft()
            finished.append(name)
            if name in cache:
                del cache[name]
                ok += 1
                action = f'B({name})'
            else:
                assert not keep_until_backward  # only the early release can lose a needed input
                failed += 1
                action = f'B({name}) ✗'
        elif len(finished) == 3:
            action = 'done'
        else:
            assert pending or ready or len(finished) < 3
            assert not ready and (not pending or len(cache) >= capacity)  # nothing runnable: waiting on returns
            idle += 1
            action = 'idle'
        log.append(f'{step}: {action} {{{",".join(sorted(cache))}}} ok {ok}')
    return log, ok, failed, idle


def optimizer_steps(completed_backwards, threshold, unit):
    counter = steps = 0
    for _ in range(completed_backwards):
        counter += unit
        if counter >= threshold:
            steps += 1
            counter = 0
    return steps, counter


_log, _ok, _failed, _idle = scheduler(2, True, True)
assert _log[:6] == ['1: F(A) {A} ok 0', '2: F(B) {A,B} ok 0', '3: B(A) {B} ok 1', '4: F(C) {B,C} ok 1',
                    '5: B(B) {C} ok 2', '6: B(C) {} ok 3'] and optimizer_steps(_ok, 3, 1) == (1, 0)
for capacity in [1, 2, 3]:
    for policy in ['Ready backward first', 'Forward first']:
        for release in ['After its backward', 'When forward ends (bug)']:
            log, ok, failed, idle = scheduler(capacity, policy == 'Ready backward first', release == 'After its backward')
            for threshold in [1, 2, 3, 4]:
                for counting in ['Activations', 'Slices, 3 each (bug)']:
                    unit = 3 if counting != 'Activations' else 1
                    steps, left = optimizer_steps(ok, threshold, unit)
                    true_steps = optimizer_steps(ok, threshold, 1)[0]
                    if failed:
                        assert release == 'When forward ends (bug)'
                        verdict = 'failed: input freed early'
                    elif unit == 3:
                        verdict = 'same count; slices wrong' if steps == true_steps else 'slices counted as work'
                    else:
                        verdict = f'{steps} step{"" if steps == 1 else "s"} from {ok} backwards'
                    for time in [0, 399, 400, 1200, 2400, 4000, 4400, 4800, 5200]:
                        exact = {'cq-cap': f'cache capacity {capacity}',
                                 'cq-threshold': f'threshold {threshold} ' + ('slices' if unit == 3 else 'activations'),
                                 'cq-policy': 'prefer ready backward' if policy == 'Ready backward first' else 'prefer forward',
                                 'cq-release': ('free cache after backward' if release == 'After its backward'
                                                else 'free at forward end (bug)')}
                        for k in range(1, 11):
                            exact[f'cq-row-{k}'] = log[k - 1] if time >= 400 * k else f'{k}: …'
                        if time >= 4400:
                            exact.update({'cq-okfail': f'backward ok {ok}, failed {failed}',
                                          'cq-unit': f'counter +{unit} each, need {threshold}',
                                          'cq-steps': f'optimizer steps: {steps}', 'cq-left': f'counter left: {left}',
                                          'cq-idle': f'idle {idle}' + (': awaiting returns' if idle else '')})
                        else:
                            exact.update({'cq-okfail': 'backward …', 'cq-unit': 'counter …', 'cq-steps': 'optimizer steps: …',
                                          'cq-left': 'counter left: …', 'cq-idle': 'idle …'})
                        exact['cq-verdict'] = verdict if time >= 4800 else '…'
                        case('concept-cache-queue', dict(capacity=capacity, threshold=threshold, policy=policy, release=release,
                                                         counting=counting), time, {}, exact)
CHECKS.append("a deque scheduler with a capacity-limited cache dictionary and timed returns, and the lesson's threshold counter; causes asserted (only an early release loses an input, idle means nothing runnable)")


# ----------------------------------------------------------- 24 path coverage and the logical batch
def run_with_dispatch(calibrated_batch, hook_drops_values, forced_reference, steps):
    """Startup self-test, then one dispatch per step; returns the event log and per-path hit counts."""
    events, hits = [], {'candidate': 0, 'grouped fallback': 0, 'upstream (latched)': 0, 'reference (forced)': 0}
    latched = False
    if not forced_reference and hook_drops_values:
        events.append('self-test failed')  # recorded at startup, before any calibrated dispatch
        latched = True
    for _ in range(steps):
        if forced_reference:
            path, reason = 'reference (forced)', 'forced control'
        elif latched:
            path, reason = 'upstream (latched)', 'self-test failed'
        elif calibrated_batch != 4:
            path, reason = 'grouped fallback', f'batch {calibrated_batch} ≠ 4'
        else:
            path, reason = 'candidate', None
        hits[path] += 1  # forward and backward both dispatch on this path
        if reason and reason not in events:
            events.append(reason)
    return events, hits, 0  # exit code


micro = [[2.0], [8.0, 8.0]]
WEIGHTED = math.fsum(math.fsum(m) for m in micro) / sum(map(len, micro))
MEAN_OF_MEANS = statistics.fmean([statistics.fmean(m) for m in micro])
assert (WEIGHTED, MEAN_OF_MEANS) == (6.0, 5.0)
for calib in ['4', '2', '1']:
    for selftest in ['Reference backward intact', 'Hook drops saved values']:
        for forced in [False, True]:
            for steps in [1, 2, 3, 4]:
                events, hits, exit_code = run_with_dispatch(int(calib), selftest == 'Hook drops saved values', forced, steps)
                assert exit_code == 0
                ran = max(hits, key=hits.get)
                assert hits[ran] == steps
                candidate_hits = hits['candidate']
                reason = events[0] if events else 'none'
                if candidate_hits:
                    coverage = 'candidate ran: hits > 0'
                elif reason == 'forced control':
                    coverage = 'reject: forced control'
                elif reason == 'self-test failed':
                    assert selftest == 'Hook drops saved values'  # the latch preceded calibration
                    coverage = 'reject: latched at start'
                else:
                    assert reason == f'batch {calib} ≠ 4'
                    coverage = f'reject: batch {calib} fallback'
                for combine in ['Weight by size', 'Mean of means (bug)']:
                    combined = WEIGHTED if combine == 'Weight by size' else MEAN_OF_MEANS
                    objective = ('matches full batch' if combined == WEIGHTED
                                 else f'mean of means: {js(r3(combined))} ≠ {js(r3(WEIGHTED))}')
                    claim = ('claim fails: path' if not candidate_hits else
                             'claim fails: objective' if combined != WEIGHTED else 'both gates pass')
                    for time in [0, 799, 800, 1600, 2400, 3200, 4000, 4800]:
                        exact = {'pc-calib': f'calibration: batch {calib}',
                                 'pc-selftest': 'self-test: ' + ('hook dropped' if selftest == 'Hook drops saved values' else 'intact'),
                                 'pc-steps': f'{steps} steps, exit code {exit_code}', 'pc-full': f'full batch mean: {js(WEIGHTED)}'}
                        exact['pc-ran'] = f'ran: {ran}' if time >= 800 else 'ran: …'
                        exact['pc-reason'] = f'disable: {reason}' if time >= 800 else 'disable: …'
                        exact['pc-fwd'] = f'forward hits {candidate_hits}' if time >= 1600 else 'forward hits …'
                        exact['pc-bwd'] = f'backward hits {candidate_hits}' if time >= 1600 else 'backward hits …'
                        exact['pc-coverage'] = coverage if time >= 2400 else '…'
                        exact['pc-means'] = 'means 2 and 8' if time >= 3200 else 'means …'
                        exact['pc-combined'] = f'combined: {js(r3(combined))}' if time >= 3200 else 'combined: …'
                        exact['pc-objective'] = objective if time >= 4000 else '…'
                        exact['pc-claim'] = claim if time >= 4000 else '…'
                        case('concept-path-coverage', dict(calib=calib, selftest=selftest, forced=forced, steps=steps,
                                                           combine=combine), time, {}, exact)
CHECKS.append('a startup-then-dispatch event log with per-path hit counters, the first recorded disable reason as the cause, and fsum/fmean microbatch combines against the full logical batch')


# =========================================================== fourth batch (25-30)
# Every verdict's cause is asserted on the computed state before its text is emitted.
TIMES48 = [0, 799, 800, 1600, 2400, 3200, 4000, 4800]


# ----------------------------------------------------------- 25 forward, backward and update as separate states
class OneWeightRun:
    """The lesson's explicit loop with a ledger snapshot at every boundary."""

    def __init__(self, w, x=3, y=8):
        self.w, self.x, self.y = Fraction(w), x, y
        self.ledger = [('before forward', self.w, {})]

    def forward(self):
        p = self.w * self.x
        r = p - self.y
        self.produced = dict(p=p, r=r, L=r * r / 2)
        self.ledger.append(('after forward', self.w, dict(self.produced)))
        return self.produced

    def backward(self):
        g = (self.produced['p'] - self.y) * self.x
        self.ledger.append(('after backward', self.w, dict(g=g)))
        return g

    def update(self, g, eta):
        self.w = self.w - eta * g
        self.ledger.append(('after update', self.w, {}))


JOURNALS25 = {'forward_done, response_saved': ['request_received', 'forward_done', 'response_saved'],
              '+ gradient_ready': ['request_received', 'forward_done', 'response_saved', 'gradient_ready'],
              '+ optimizer_step, w v2': ['request_received', 'forward_done', 'response_saved', 'gradient_ready',
                                         'optimizer_step', 'weights_version_2']}
for w in [0, 0.5, 1, 2, 2.5, 3, 4]:
    for eta in [0, 0.05, 0.1, 0.3]:
        for stop in ['Update', 'Backward', 'Forward']:
            run = OneWeightRun(w)
            out = run.forward()
            g = run.backward() if stop in ('Update', 'Backward') else None
            if stop == 'Update':
                run.update(g, Fraction(str(eta)))
            assert all(entry[1] == Fraction(w) for entry in run.ledger if entry[0] != 'after update')  # only the update writes w
            w2 = run.w
            fresh = None
            if stop == 'Update':
                p2 = w2 * 3
                fresh = (p2, (p2 - 8) ** 2 / 2)
                if eta == 0:
                    assert w2 == Fraction(w)
                    wverdict = 'η = 0: update kept w'
                else:
                    assert g != 0 and w2 != Fraction(w)
                    wverdict = 'only the update moved w'
            else:
                assert w2 == Fraction(w)
                wverdict = 'w unchanged: no step'
            for trace, events in JOURNALS25.items():
                grad_seen = 'gradient_ready' in events
                step_seen = 'optimizer_step' in events and any(e.startswith('weights_version_') for e in events)
                if step_seen:
                    jverdict = 'a training step ran'
                elif grad_seen:
                    assert 'optimizer_step' not in events
                    jverdict = 'gradient, but no step'
                else:
                    assert not grad_seen and 'forward_done' in events
                    jverdict = 'inference only'
                for time in TIMES48:
                    exact = {'sl-w-before': f'before forward: w {js(w)}',
                             'sl-j-grad': 'gradient: ' + ('yes' if grad_seen else 'not shown'),
                             'sl-j-step': 'weight update: ' + ('yes' if step_seen else 'not shown')}
                    exact['sl-w-fwd'] = f'after forward: w {js(run.ledger[1][1])}' if time >= 800 else 'after forward: …'
                    exact['sl-p'] = f'ŷ = w·x = {js(r3(out["p"]))}' if time >= 800 else 'ŷ = …'
                    exact['sl-r'] = f'r = ŷ − y = {js(r3(out["r"]))}' if time >= 1600 else 'r = …'
                    exact['sl-L'] = f'L = r²/2 = {js(r3(out["L"]))}' if time >= 1600 else 'L = …'
                    if time < 2400:
                        exact.update({'sl-w-bwd': 'after backward: …', 'sl-g': 'g = …'})
                    elif g is None:
                        exact.update({'sl-w-bwd': 'backward: not run', 'sl-g': 'g: backward not run'})
                    else:
                        exact.update({'sl-w-bwd': f'after backward: w {js(run.ledger[2][1])}', 'sl-g': f'g = r·x = {js(r3(g))}'})
                    if time < 3200:
                        exact.update({'sl-w-upd': 'after update: …', 'sl-w-verdict': '…'})
                    else:
                        exact['sl-w-upd'] = f'after update: w {js(r3(w2))}' if stop == 'Update' else 'update: not run'
                        exact['sl-w-verdict'] = wverdict
                    numeric = {}
                    if time < 4000:
                        exact.update({'sl-p2': 'fresh ŷ …', 'sl-L2': 'fresh L …', 'sl-j-verdict': '…'})
                    else:
                        exact['sl-j-verdict'] = jverdict
                        if fresh is None:
                            exact.update({'sl-p2': 'fresh ŷ: no new w', 'sl-L2': 'fresh L: no new w'})
                        else:
                            numeric = {'sl-p2': float(fresh[0]), 'sl-L2': float(fresh[1])}
                    case('concept-state-ledger', dict(w=w, eta=eta, stop=stop, trace=trace), time, numeric, exact)
CHECKS.append("(fourth batch) the lesson's one-weight loop as a ledger with a snapshot at every boundary, asserting that only the update writes w; journal verdicts from the recorded event set")


# ----------------------------------------------------------- 26 values forward, sensitivities back
class StageA:
    def __init__(self, w):
        self.w = Fraction(w)

    def forward(self, x):
        self.x = x
        return self.w * x

    def backward(self, upstream):
        return upstream * self.x  # A's parameter gradient from whatever arrived


class StageB:
    def __init__(self, v):
        self.v = Fraction(v)

    def forward(self, h):
        self.h = h
        self.out = self.v * h
        return self.out

    def backward(self, r):
        return dict(dv=r * self.h, dh=r * self.v)


def total_loss(w, v, x=2, target=20):
    return (v * (w * x) - target) ** 2 / 2


MESSAGES26 = {'dL/dh (correct)': 'dh', "dL/dv, B's own gradient": 'dv', "B's prediction ŷ": 'prediction'}
JOURNALS26 = {'backward_done': ['backward_done'], '+ upload_sent': ['backward_done', 'upload_sent'],
              '+ upload_sent, timeout': ['backward_done', 'upload_sent', 'timeout'],
              '+ receiver ack': ['backward_done', 'upload_sent', 'receiver_ack']}
for w in [1, 2, 2.5, 3, 4]:
    for v in [-2, 0, 1.5, 4, 5]:
        A, B = StageA(w), StageB(v)
        h = A.forward(2)
        yhat = B.forward(h)
        r = yhat - 20
        grads = B.backward(r)
        eps = Fraction(1, 1000)  # exact central differences of a quadratic
        true_dw = (total_loss(Fraction(w) + eps, Fraction(v)) - total_loss(Fraction(w) - eps, Fraction(v))) / (2 * eps)
        true_dv = (total_loss(Fraction(w), Fraction(v) + eps) - total_loss(Fraction(w), Fraction(v) - eps)) / (2 * eps)
        assert grads['dv'] == true_dv and grads['dh'] * 2 == true_dw
        for message, kind in MESSAGES26.items():
            sent = {'dh': grads['dh'], 'dv': grads['dv'], 'prediction': yhat}[kind]
            dw_used = A.backward(sent)
            if kind == 'dh':
                assert dw_used == true_dw
                verdict = 'A got dL/dh'
            elif sent == grads['dh']:
                assert dw_used == true_dw  # right number, but the message's meaning is wrong
                verdict = 'right number, wrong type'
            else:
                assert dw_used != true_dw
                verdict = 'A got the wrong quantity'
            new_w, new_v = A.w - Fraction(1, 100) * dw_used, B.v - Fraction(1, 100) * grads['dv']
            for journal, events in JOURNALS26.items():
                submitted = 'upload_sent' in events
                if 'receiver_ack' in events:
                    accepted = 'yes'
                elif 'timeout' in events:
                    assert submitted
                    accepted = 'unknown'
                else:
                    accepted = 'no evidence'
                proven = ('proven: accepted' if accepted == 'yes' else 'timeout: outcome unknown' if accepted == 'unknown'
                          else 'proven: submitted' if submitted else 'proven: computed')
                for time in TIMES48:
                    exact = {'sm-l-sub': 'submitted: ' + ('yes' if submitted else 'no evidence'),
                             'sm-l-acc': f'accepted: {accepted}', 'sm-l-cred': 'credited: no evidence',
                             'sm-l-paid': 'paid: no evidence'}
                    exact['sm-h'] = f'A: h = w·x = {js(r3(h))}' if time >= 800 else 'A: h = …'
                    exact['sm-send-h'] = f'sends h = {js(r3(h))}' if time >= 800 else 'sends …'
                    exact['sm-yhat'] = f'B: ŷ = v·h = {js(r3(yhat))}' if time >= 1600 else 'B: ŷ = …'
                    exact['sm-loss'] = f'L = (ŷ − 20)²/2 = {js(r3(r * r / 2))}' if time >= 1600 else 'L = …'
                    exact['sm-r'] = f'r = ŷ − 20 = {js(r3(r))}' if time >= 2400 else 'r = …'
                    exact['sm-dv'] = f'B: dL/dv = r·h = {js(r3(grads["dv"]))}' if time >= 2400 else 'B: dL/dv = …'
                    exact['sm-dh'] = f'dL/dh = r·v = {js(r3(grads["dh"]))}' if time >= 2400 else 'dL/dh = …'
                    exact['sm-sent'] = f'sent: {js(r3(sent))}' if time >= 3200 else 'sent: …'
                    exact['sm-dw'] = f'A: dL/dw = sent·x = {js(r3(dw_used))}' if time >= 3200 else 'A: dL/dw = …'
                    exact['sm-verdict'] = verdict if time >= 4000 else '…'
                    exact['sm-new'] = f'w → {js(r3(new_w))}, v → {js(r3(new_v))}' if time >= 4000 else 'w, v after step …'
                    exact['sm-true'] = f'true dL/dw = {js(r3(true_dw))}' if time >= 4000 else 'true dL/dw …'
                    exact['sm-l-verdict'] = proven if time >= 4000 else '…'
                    case('concept-stage-messages', dict(w=w, v=v, message=message, journal=journal), time, {}, exact)
CHECKS.append('two stage objects whose backward returns both gradients, a message chosen by meaning, parameter gradients cross-checked by exact central differences of the joint loss, and an evidence ledger derived from journal events')


# ----------------------------------------------------------- 27 a loss turns a prediction into a penalty
def penalty(w, x, y, halved):
    r = w * x - y
    return (r * r / 2) if halved else r * r


def least_squares_w(examples):
    """Normal equation for ŷ = w·x: Σ x(wx − y) = 0 for either penalty."""
    return Fraction(sum(x * y for x, y in examples), sum(x * x for x, y in examples))


SCALE27 = 168 / 49
for w in [0, 0.25, 1, 2, 2.5, 3, 4, 5]:
    for y in [3, 5, 7]:
        for pen in ['Half squared r²/2', 'Squared r²']:
            halved = pen == 'Half squared r²/2'
            W = Fraction(w)
            L1 = penalty(W, 2, y, halved)
            eps = Fraction(1, 1000)
            slope = (penalty(W + eps, 2, y, halved) - penalty(W - eps, 2, y, halved)) / (2 * eps)
            w_min = least_squares_w([(2, y)])
            assert penalty(w_min, 2, y, halved) == 0
            mirror = 2 * w_min - W
            assert penalty(mirror, 2, y, halved) == L1
            pair_mean = (L1 + penalty(W, 1, 1, halved)) / 2
            for second in [False, True]:
                examples = [(2, y), (1, 1)] if second else [(2, y)]
                losses = [penalty(W, x, yy, halved) for x, yy in examples]
                mean = sum(losses) / len(losses)
                w_star = least_squares_w(examples)
                residuals = [w_star * x - yy for x, yy in examples]
                if second:
                    assert all(rr != 0 for rr in residuals)  # the mean's minimum fits neither example
                for time in TIMES48:
                    exact = {'ls-y': f'target y = {y}'}
                    exact['ls-p'] = f'ŷ = w·x = {js(r3(W * 2))}' if time >= 800 else 'ŷ = …'
                    exact['ls-r'] = f'signed r = ŷ − y = {js(r3(W * 2 - y))}' if time >= 800 else 'signed r = …'
                    exact['ls-L'] = ('L = r²/2 = ' if halved else 'L = r² = ') + js(r3(L1)) if time >= 1600 else 'L = …'
                    exact['ls-slope'] = f'dL/dw = {js(r3(slope))}' if time >= 2400 else 'dL/dw = …'
                    exact['ls-min'] = f'minimum at w = {js(r3(w_min))}' if time >= 3200 else 'minimum at …'
                    exact['ls-mirror'] = f'w = {js(r3(mirror))} gives the same L' if time >= 3200 else 'mirror …'
                    exact['ls-e1'] = f'ex1 L = {js(r3(losses[0]))}' if second else 'ex1 only: switch on ex2'
                    exact['ls-e2'] = f'ex2 L = {js(r3(losses[1]))}' if second else 'ex2: not in the set'
                    exact['ls-legend-2'] = 'gold: mean of two' if second else 'teal: minimum'
                    exact['ls-scale'] = '½ only scales the slope' if halved else 'no ½: slope doubles'
                    if time >= 4000:
                        exact['ls-mean'] = f'mean L = {js(r3(mean))}'
                        exact['ls-wstar'] = (f'mean min at w = {js(r3(w_star))}' if second else f'min at w = {js(r3(w_star))}')
                        exact['ls-res'] = (f'there r1 {js(r3(residuals[0]))}, r2 {js(r3(residuals[1]))}' if second else 'there r = 0')
                        exact['ls-verdict'] = 'a mean can hide misfits' if second else 'one point matched'
                    else:
                        exact.update({'ls-mean': 'mean L = …', 'ls-wstar': 'min …', 'ls-res': 'there …', 'ls-verdict': '…'})
                    geometry = {'ls-now': {'x': 16 + 48 * w, 'y': 216 - SCALE27 * min(float(L1), 49)},
                                # drawn at the two-example mean, hidden while the second example is off
                                'ls-now-mean': {'x': 16 + 48 * w, 'y': 216 - SCALE27 * min(float(pair_mean), 49),
                                                'opacity': float(second)},
                                'ls-minline': {'x': 16 + 48 * float(w_min), 'opacity': float(time >= 3200)}}
                    case('concept-loss-shape', dict(w=w, y=y, penalty=pen, second=second), time, {}, exact, geometry)
CHECKS.append('per-example penalties in exact Fractions, slopes by exact central differences, minimizers from the normal equation Σx(wx − y) = 0, a mirror-weight check, and residuals at the mean minimizer asserted nonzero')


# ----------------------------------------------------------- 28 a graph with shared identity
class GNode:
    def __init__(self, name, value, parents=(), op=None):
        self.name, self.value, self.parents, self.op = name, value, parents, op


def build_graph(x, copies):
    xa = GNode('x', x)
    xb = GNode('x′', x) if copies else xa  # a copy-per-use record makes a second leaf for the same input
    s_node = GNode('s', xa.value * xa.value, (xa, xa), 'mul')
    z_node = GNode('z', s_node.value + xb.value, (s_node, xb), 'add')
    return z_node


def topo(root):
    order, seen = [], set()

    def visit(n):
        if id(n) in seen:
            return
        seen.add(id(n))
        for p in n.parents:
            visit(p)
        order.append(n)
    visit(root)
    return order


def backprop(root):
    grads = {id(root): 1}
    for n in reversed(topo(root)):
        g = grads.get(id(n), 0)
        if n.op == 'mul':
            a, b = n.parents
            grads[id(a)] = grads.get(id(a), 0) + g * b.value  # slot 0
            grads[id(b)] = grads.get(id(b), 0) + g * a.value  # slot 1 (same node here: both add)
        elif n.op == 'add':
            for p in n.parents:
                grads[id(p)] = grads.get(id(p), 0) + g
    return grads


class SavedMul:
    def __init__(self, a, b, keep_operands):
        self.out = a * b
        self.saved = (a, b) if keep_operands else None

    def backward(self):
        if self.saved is None:
            return None
        a, b = self.saved
        return b, a


for x in [-3, 0, 1, 3]:
    for build in ['One shared x node', 'x copied per use (bug)']:
        copies = build != 'One shared x node'
        z = build_graph(Fraction(x), copies)
        order = topo(z)
        assert all(order.index(p) < order.index(n) for n in order for p in n.parents)
        names = [n.name for n in order]
        grads = backprop(z)
        leaves = [n for n in order if not n.parents]
        true = (Fraction(x) + Fraction(1, 1000)) ** 2 + Fraction(x) + Fraction(1, 1000)
        true = (true - ((Fraction(x) - Fraction(1, 1000)) ** 2 + Fraction(x) - Fraction(1, 1000))) / Fraction(2, 1000)
        if copies:
            assert len(order) == 4 and len(leaves) == 2
            parts = [grads[id(n)] for n in leaves]
            assert sum(parts) == true
            if x != 0:
                assert all(p != true for p in parts)  # either copy alone loses a contribution
            split = f'copies hold {js(parts[0])} and {js(parts[1])}'
        else:
            assert len(order) == 3 and grads[id(leaves[0])] == true
            split = 'one x node sums both'
        for a in [1, 2, 3, 6]:
            for b in [1, 4, 6]:
                for save in ['Operands a and b', 'Output p only (bug)']:
                    for mutate in [False, True]:
                        node = SavedMul(a, b, save == 'Operands a and b')
                        live_b = b + 1 if mutate else b  # caller overwrites b after forward
                        back = node.backward()
                        if back is None:
                            # Another factor pair with the same output has different local derivatives.
                            assert Fraction(2 * a) * Fraction(b, 2) == node.out and Fraction(b, 2) != b
                            da, db, verdict = 'dp/da: b not kept', 'dp/db: a not kept', 'p alone is ambiguous'
                        else:
                            assert back == (b, a)  # the saved operands, whatever the live b is now
                            da, db = f'dp/da = saved b = {back[0]}', f'dp/db = saved a = {back[1]}'
                            verdict = 'old forward, saved b' if live_b != b else 'operands describe p'
                        for time in TIMES48:
                            exact = {'gi-xv': f'x = {x}', 'gi-count': 'nodes drawn: 4 (x twice)' if copies else 'value nodes: 3',
                                     'gi-id': 'identity lost' if copies else 'visited once',
                                     'gi-p': f'p = a·b = {a}·{b} = {node.out}',
                                     'gi-saved': f'saved: p = {node.out} only' if back is None else f'saved: a = {a}, b = {b}',
                                     'gi-live': f'live b now {live_b}' if mutate else 'live b unchanged'}
                            exact['gi-sv'] = f's = x·x = {js(next(n for n in order if n.name == "s").value)}' if time >= 800 else 's = …'
                            exact['gi-zv'] = f'z = s + x = {js(z.value)}' if time >= 1600 else 'z = …'
                            if time >= 2400:
                                exact['gi-topo'] = ('topo: ' if copies else 'topological: ') + ', '.join(names)
                                exact['gi-rev'] = 'reverse: ' + ', '.join(reversed(names))
                            else:
                                exact.update({'gi-topo': 'topological: …', 'gi-rev': 'reverse: …'})
                            exact['gi-dzdx'] = f'dz/dx = 2x + 1 = {js(true)}' if time >= 3200 else 'dz/dx = …'
                            exact['gi-split'] = split if time >= 3200 else '…'
                            exact['gi-da'] = da if time >= 4000 else 'dp/da = …'
                            exact['gi-db'] = db if time >= 4000 else 'dp/db = …'
                            exact['gi-verdict'] = verdict if time >= 4000 else '…'
                            geometry = {'gi-e-xz': {'opacity': float(time >= 1600 and not copies)},
                                        'gi-e-x2z': {'opacity': float(time >= 1600 and copies)},
                                        'gi-n-x2-dot': {'opacity': float(copies)}}
                            case('concept-graph-identity', dict(x=x, build=build, a=a, b=b, save=save, mutate=mutate),
                                 time, {}, exact, geometry)
CHECKS.append('graph nodes compared by object identity, a depth-first topological order validated edge by edge, reverse-mode accumulation per node checked against an exact central difference, and a multiply node that keeps its operands or only its output')


# ----------------------------------------------------------- 29 a tiny decoder's ledger and shapes
def decoder_shapes(V, C, d, f, T):
    """Run the lesson's reference decoder structure with deterministic weights; return shapes and counts."""
    params = {'embedding': (V, d), 'positions': (C, d), 'Wq': (d, d), 'Wk': (d, d), 'Wv': (d, d), 'Wo': (d, d),
              'W_up': (d, f), 'W_down': (f, d), 'W_vocab': (d, V)}
    counter = iter(range(1, 10 ** 6))
    mats = {k: [[0.1 * math.sin(next(counter)) for _ in range(m)] for _ in range(n)] for k, (n, m) in params.items()}
    mats['W_vocab'] = [[0.0] * V for _ in range(d)]  # zero vocabulary projection

    def mm(a, b):
        return [[sum(x * y for x, y in zip(row, col)) for col in zip(*b)] for row in a]
    ids = [k % V for k in range(T)]
    pos_rows = mats['positions'][:T]
    missing = T - len(pos_rows)
    x = [[e + p for e, p in zip(mats['embedding'][ids[t]], pos_rows[t])] if t < len(pos_rows)
         else list(mats['embedding'][ids[t]]) for t in range(T)]  # a token past C has no position row
    q, k, v = (mm(x, mats[n]) for n in ('Wq', 'Wk', 'Wv'))
    allowed = [(i, j) for i in range(T) for j in range(T) if j <= i]
    scores = [[sum(a * b for a, b in zip(q[i], k[j])) for j in range(T)] for i in range(T)]
    hidden = [[math.tanh(z) for z in row] for row in mm(x, mats['W_up'])]
    logits = mm(mm(hidden, mats['W_down']), mats['W_vocab'])
    losses = [max(row) + math.log(sum(math.exp(z - max(row)) for z in row)) - row[0] for row in logits]
    shape = lambda m: (len(m), len(m[0]))
    return dict(counts={k: n * m for k, (n, m) in params.items()}, ids=(len(ids),), x=shape(x), q=shape(q), v=shape(v),
                scores=shape(scores), allowed=len(allowed), hidden=shape(hidden), logits=shape(logits),
                uniform=statistics.fmean(losses), missing=missing)


def tup(t):
    return '(' + ', '.join(str(v) for v in t) + ')'


for V in range(2, 7):
    for C in range(1, 5):
        for d in [2, 4]:
            for f in [1, 2, 3]:
                for T in range(1, 5):
                    r = decoder_shapes(V, C, d, f, T)
                    c = r['counts']
                    total = sum(c.values())
                    if (V, C, d, f) == (3, 2, 2, 3):
                        assert total == 44
                    assert abs(r['uniform'] - math.log(V)) < 1e-12
                    assert r['x'] == r['q'] == r['v'] == (T, d)
                    fit = f'residuals {tup((T, d))} ✓' if r['missing'] <= 0 else f'positions missing: {r["missing"]}'
                    if r['missing'] > 0:
                        assert T > C
                    for time in TIMES48:
                        exact = {'dc-emb': f'embed V·d = {c["embedding"]}', 'dc-pos': f'positions C·d = {c["positions"]}',
                                 'dc-qkv': f'Q, K, V 3·d² = {c["Wq"] + c["Wk"] + c["Wv"]}', 'dc-wo': f'output W_O d² = {c["Wo"]}',
                                 'dc-ff': f'feed-fwd 2·d·f = {c["W_up"] + c["W_down"]}', 'dc-vocab': f'vocab d·V = {c["W_vocab"]}',
                                 'dc-targets': f'targets per window: {T}', 'dc-rows': f'C = {C} position rows'}
                        exact['dc-total'] = f'total = {total}' if time >= 800 else 'total = …'
                        exact['dc-ids'] = f'ids ({T},)' if time >= 1600 else 'ids …'
                        exact['dc-x'] = f'X, Q, K, V {tup(r["x"])}' if time >= 1600 else 'X, Q, K, V …'
                        exact['dc-scores'] = f'scores {tup(r["scores"])}' if time >= 2400 else 'scores …'
                        exact['dc-mask'] = f'causal keeps {r["allowed"]} of {T * T}' if time >= 2400 else 'causal keeps …'
                        exact['dc-hidden'] = f'FF hidden {tup(r["hidden"])}' if time >= 3200 else 'FF hidden …'
                        exact['dc-logits'] = f'logits {tup(r["logits"])}' if time >= 3200 else 'logits …'
                        exact['dc-fit'] = fit if time >= 3200 else '…'
                        exact['dc-fd'] = f'central diff: {2 * total} runs' if time >= 4000 else 'central diff: …'
                        numeric = {'dc-lnv': r['uniform']} if time >= 4000 else {}
                        if time < 4000:
                            exact['dc-lnv'] = 'loss ln V = …'
                        case('concept-decoder-ledger', dict(V=V, C=C, d=d, f=f, T=T), time, numeric, exact)
CHECKS.append("parameter counts from a table of matrix shapes, a forward pass of the lesson's decoder structure with deterministic weights read for every intermediate shape, the causal pair count by enumeration, and the zero-projection cross-entropy against math.log(V)")


# ----------------------------------------------------------- 30 registration, autograd and the optimizer
class Param:
    def __init__(self, value):
        self.value, self.grad = [Fraction(v) for v in value], None


class Module:
    def __init__(self):
        object.__setattr__(self, '_params', {})
        object.__setattr__(self, '_children', {})

    def __setattr__(self, name, value):
        if isinstance(value, Param):
            self._params[name] = value
        elif isinstance(value, Module):
            self._children[name] = value
        object.__setattr__(self, name, value)  # a plain list is stored but never registered

    def named_parameters(self, prefix=''):
        for n, p in self._params.items():
            yield prefix + n, p
        for n, m in self._children.items():
            yield from m.named_parameters(prefix + n + '.')

    def zero_grad(self):
        for _, p in self.named_parameters():
            p.grad = None


class Linear(Module):
    def __init__(self):
        super().__init__()
        self.weight = Param([2, -1])
        self.bias = Param([Fraction(1, 2)])


class SGD:
    def __init__(self, params, lr):
        self.params = list(params)
        if not self.params:
            raise ValueError('optimizer got an empty parameter list')
        self.lr = lr

    def step(self):
        for p in self.params:
            if p.grad is not None:
                p.value = [v - self.lr * g for v, g in zip(p.value, p.grad)]


def linear_step(container, detach, calls, zero, lr, x=(3, 4), target=Fraction(3, 2)):
    model = Module()
    layer = Linear()
    if container == 'Registered attribute':
        model.layer = layer
    else:
        model.layers = [layer]
    names = [n for n, _ in model.named_parameters()]
    try:
        opt, error = SGD([p for _, p in model.named_parameters()], lr), None
    except ValueError as e:
        opt, error = None, e
    for _ in range(calls):
        if zero:
            model.zero_grad()
        pred = sum(wv * xv for wv, xv in zip(layer.weight.value, x)) + layer.bias.value[0]
        upstream = pred - target  # d(½(ŷ − t)²)/dŷ
        if not detach:
            g = [upstream * xv for xv in x]
            layer.weight.grad = g if layer.weight.grad is None else [a + b for a, b in zip(layer.weight.grad, g)]
        layer.bias.grad = [upstream] if layer.bias.grad is None else [layer.bias.grad[0] + upstream]
    grads = (layer.weight.grad, layer.bias.grad[0])
    if opt:
        opt.step()
    new_pred = sum(wv * xv for wv, xv in zip(layer.weight.value, x)) + layer.bias.value[0]
    return names, error, grads, layer.weight.value, layer.bias.value[0], new_pred


for container in ['Registered attribute', 'Plain Python list (bug)']:
    for detach in [False, True]:
        for calls in [1, 2, 3]:
            for zero in [True, False]:
                for lr in [0.01, 0.03, 0.05]:
                    names, error, (gw, gb), W2, b2, y2 = linear_step(container, detach, calls, zero, Fraction(str(lr)))
                    contributions = gb  # each call adds dL/dŷ = 1 to b.grad
                    if error is not None:
                        assert names == [] and container != 'Registered attribute'
                        verdict = 'not registered: no step'
                    elif detach:
                        assert gw is None and W2 == [2, -1] and b2 != Fraction(1, 2)
                        verdict = 'W detached: b moved only'
                    elif contributions > 1:
                        assert not zero
                        verdict = f'grad ×{js(contributions)}: not cleared'
                    else:
                        verdict = 'one clean step'
                    if contributions > 1:
                        acc = 'model.zero_grad missed it' if zero else f'summed over {js(contributions)} calls'
                        if zero:
                            assert names == []  # zero_grad walks parameters(), which never saw the layer
                    else:
                        acc = 'one contribution'
                    for time in TIMES48:
                        exact = {'mr-params': 'parameters(): ' + (', '.join({'layer.weight': 'W', 'layer.bias': 'b'}[n] for n in names) or 'none'),
                                 'mr-calls': f'{calls} backward()' if calls == 1 else f'{calls} backward() calls',
                                 'mr-zero': 'model.zero_grad() each' if zero else 'no zero_grad between',
                                 'mr-detach': 'W.detach(): no route' if detach else 'W tracked by autograd',
                                 'mr-sgd': 'SGD([]): ValueError' if error else f'SGD(lr {js(lr)}) owns W, b'}
                        if time >= 1600:
                            exact['mr-gw'] = 'W.grad: None' if gw is None else f'W.grad = [{js(r3(gw[0]))}, {js(r3(gw[1]))}]'
                            exact['mr-gb'] = f'b.grad = {js(gb)}'
                        else:
                            exact.update({'mr-gw': 'W.grad …', 'mr-gb': 'b.grad …'})
                        exact['mr-acc'] = acc if time >= 2400 else '…'
                        if time >= 3200:
                            exact['mr-W2'] = 'W: no step' if error else f'W → [{js(r3(W2[0]))}, {js(r3(W2[1]))}]'
                            exact['mr-b2'] = 'b: no step' if error else f'b → {js(r3(b2))}'
                            exact['mr-y2'] = 'ŷ stays 2.5' if error else f'new ŷ = {js(r3(y2))}'
                        else:
                            exact.update({'mr-W2': 'W → …', 'mr-b2': 'b → …', 'mr-y2': 'new ŷ …'})
                        exact['mr-verdict'] = verdict if time >= 4000 else '…'
                        case('concept-module-registry', dict(container=container, detach=detach, calls=calls, zero=zero, lr=lr),
                             time, {}, exact)
CHECKS.append('a miniature module system that registers only Param and Module attributes, an optimizer that refuses an empty parameter list, gradient buffers that add on every backward unless model.zero_grad() clears them, and an SGD step that skips None gradients')


print(json.dumps({'cases': CASES, 'independentChecks': CHECKS}, allow_nan=False, separators=(',', ':')))
