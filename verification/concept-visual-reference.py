"""Independent CPU oracle for the eight concept scenes.

Python standard library only. It never reads scene JSON and never evaluates the
scene expression AST: every expected readout is recomputed here from the
lesson's own definitions (explicit matrix loops and axis reductions, exact
rational losses and derivatives, a microbatch buffer object, a hand-written
two-layer network with backprop checked by finite differences, a mask truth
table with a perturbation test, complex-number rotations, an explicit padded
tree reduction and an event-time schedule). Cases go to stdout;
concept-visuals.mjs consumes them. No GPU, no network.
"""
import cmath
import json
import math
import statistics
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

print(json.dumps({'cases': CASES, 'independentChecks': CHECKS}, allow_nan=False, separators=(',', ':')))
