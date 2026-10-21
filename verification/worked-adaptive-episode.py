"""Independent checks for the design section 16 worked adaptive episode.

Three independent methods must agree on every number the learner sees:
a closed-form scalar oracle, a separately written tape-based reverse-mode
autograd, and central finite differences. Four training-step implementations
then run the same scripts. The correct one reproduces every number in the
scene, the in-episode check, the probe, the personal episode and the transfer
items; an overwrite-accumulation, a wrong-sign and a backward-mutates
implementation must each fail. Standard library only; no model call.

Prints a JSON report whose "scene" section is the per-phase reference that
verification/worked-adaptive-visual.mjs checks the rendered scene against.
"""
import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
load = lambda name: json.loads((ROOT / 'content' / f'{name}.json').read_text())
overlay = load('worked-adaptive-episode')
remedial = next(e for e in load('remedial-episodes')['entries'] if e['id'] == 'remedial-two-backward')
items = {a['id']: a for a in overlay['assessments']}
X, Y, W0, B0, LR = 2.0, 3.0, 0.5, 0.0, 0.1
checks = 0


def check(condition, message):
    global checks
    assert condition, message
    checks += 1


def close(a, b, tol=1e-9):
    return a is not None and b is not None and math.isclose(a, b, rel_tol=0, abs_tol=tol)


# ------------------------------------------------------------ 1. scalar oracle (closed form)
def oracle(w, b, x=X, y=Y):
    p = w * x + b
    r = p - y
    return {'p': p, 'L': r * r / 2, 'dw': r * x, 'db': r, 'dp': r, 'dmul': r, 'dx': r * w}


# ------------------------------------------------------------ 2. tape-based reverse mode
class Tape:
    def __init__(self):
        self.nodes = []  # (value, [(parent_index, local_derivative)])

    def leaf(self, value):
        self.nodes.append((value, []))
        return len(self.nodes) - 1

    def op(self, value, parents):
        self.nodes.append((value, parents))
        return len(self.nodes) - 1

    def value(self, i):
        return self.nodes[i][0]

    def add(self, a, b):
        return self.op(self.value(a) + self.value(b), [(a, 1.0), (b, 1.0)])

    def sub(self, a, b):
        return self.op(self.value(a) - self.value(b), [(a, 1.0), (b, -1.0)])

    def mul(self, a, b):
        return self.op(self.value(a) * self.value(b), [(a, self.value(b)), (b, self.value(a))])

    def scale(self, a, c):
        return self.op(self.value(a) * c, [(a, c)])

    def grads(self, root):
        adjoint = [0.0] * len(self.nodes)
        adjoint[root] = 1.0
        for i in range(root, -1, -1):
            for parent, local in self.nodes[i][1]:
                adjoint[parent] += adjoint[i] * local
        return adjoint


def tape_step(w, b, x=X, y=Y):
    t = Tape()
    iw, ib, ix, iy = t.leaf(w), t.leaf(b), t.leaf(x), t.leaf(y)
    imul = t.mul(iw, ix)
    ip = t.add(imul, ib)
    ir = t.sub(ip, iy)
    iL = t.scale(t.mul(ir, ir), 0.5)
    g = t.grads(iL)
    return {'p': t.value(ip), 'L': t.value(iL), 'dw': g[iw], 'db': g[ib], 'dp': g[ip], 'dmul': g[imul], 'dx': g[ix]}


# ------------------------------------------------------------ 3. finite differences
def fd(w, b, h=1e-6):
    L = lambda w_, b_: oracle(w_, b_)['L']
    return {'dw': (L(w + h, b) - L(w - h, b)) / (2 * h), 'db': (L(w, b + h) - L(w, b - h)) / (2 * h)}


for w, b in [(W0, B0), (0.9, 0.2), (-1.25, 0.75), (3.0, -2.0)]:
    o, t, f = oracle(w, b), tape_step(w, b), fd(w, b)
    for k in o:
        check(close(o[k], t[k], 1e-12), f'tape disagrees with oracle on {k} at {(w, b)}')
    check(close(o['dw'], f['dw'], 1e-6) and close(o['db'], f['db'], 1e-6), f'finite differences disagree at {(w, b)}')


# ------------------------------------------------------------ 4. step implementations
class Trainer:
    """Parameter and gradient buffers kept apart; backward uses the tape."""
    def __init__(self, w=W0, b=B0, lr=LR):
        self.params = {'w': w, 'b': b}
        self.grads = {'w': None, 'b': None}
        self.saved = None
        self.lr = lr

    def forward(self):
        self.saved = tape_step(self.params['w'], self.params['b'])
        return self.saved['p'], self.saved['L']

    def store(self, key, g):
        self.grads[key] = g if self.grads[key] is None else self.grads[key] + g

    def backward(self):
        for key in ('w', 'b'):
            self.store(key, self.saved['d' + key])

    def update(self):
        for key in self.params:
            self.params[key] -= self.lr * self.grads[key]

    def clear(self):
        self.grads = {'w': None, 'b': None}

    def state(self):
        return dict(self.params), dict(self.grads)


class Overwrite(Trainer):
    def store(self, key, g):
        self.grads[key] = g


class WrongSign(Trainer):
    def update(self):
        for key in self.params:
            self.params[key] += self.lr * self.grads[key]


class BackwardMutates(Trainer):
    def backward(self):
        super().backward()
        for key in self.params:
            self.params[key] -= self.lr * self.saved['d' + key]


def section16(cls):
    """Forward, Backward, Update, fresh Forward (gradients cleared by the update code)."""
    t, out = cls(), {}
    out['forward'] = (t.forward(), t.state())
    t.backward()
    out['backward'] = (None, t.state())
    t.update()
    t.clear()
    out['update'] = (None, t.state())
    out['forward2'] = (t.forward(), t.state())
    t.backward()
    out['backward2'] = (None, t.state())
    return out


def two_backward(cls):
    t = cls()
    for _ in range(2):
        t.forward()
        t.backward()
    before = t.state()
    t.update()
    return before, t.state()


def correct_section16(out):
    return (close(out['forward'][0][0], 1) and close(out['forward'][0][1], 2)
            and out['backward'][1] == ({'w': 0.5, 'b': 0.0}, {'w': -4.0, 'b': -2.0})
            and close(out['update'][1][0]['w'], 0.9) and close(out['update'][1][0]['b'], 0.2)
            and close(out['forward2'][0][0], 2) and close(out['forward2'][0][1], 0.5)
            and close(out['backward2'][1][1]['w'], -2) and close(out['backward2'][1][1]['b'], -1))


def correct_two_backward(result):
    (params_before, grads_before), (params_after, _) = result
    return (params_before == {'w': 0.5, 'b': 0.0} and close(grads_before['w'], -8) and close(grads_before['b'], -4)
            and close(params_after['w'], 1.3) and close(params_after['b'], 0.4))


implementations = {'correct': Trainer, 'overwrite': Overwrite, 'wrong_sign': WrongSign, 'backward_mutates': BackwardMutates}
verdicts = {name: correct_section16(section16(cls)) and correct_two_backward(two_backward(cls)) for name, cls in implementations.items()}
check(verdicts == {'correct': True, 'overwrite': False, 'wrong_sign': False, 'backward_mutates': False}, f'implementation verdicts {verdicts}')

# ------------------------------------------------------------ 5. items
check_item = items['wae-check-after-backward']
s16 = section16(Trainer)
nums = lambda text: [float(n) for n in re.findall(r'(?<![A-Za-z0-9_.])-?\d+(?:\.\d+)?', text)]
opts = {o['id']: o for o in check_item['options']}
check(check_item['grading']['correctOptionId'] == 'a' and nums(opts['a']['text']) == [-4, -2, 0.5, 0], 'check item correct option numbers')
mutated = section16(BackwardMutates)['backward'][1][0]
check(close(nums(opts['b']['text'])[0], mutated['w']) and close(nums(opts['b']['text'])[1], mutated['b']) and opts['b'].get('misconceptionId') == 'wae-backward-mutates', 'check distractor b is the backward-mutates state')
check('misconceptionId' not in opts['a'], 'correct option carries no misconception')

probe = items['wae-probe-two-backward']
popts = {o['id']: o for o in probe['options']}
# Each option is the (w.grad before step, w after step) pair one implementation produces.
def pair(cls):
    (_, grads), (params, _) = two_backward(cls)
    return [grads['w'], params['w']]
# Backward-mutates also moved w during the two backward calls: model the stated belief exactly
# (backward applies the accumulated change, then the step applies it again).
believed = W0 - LR * -8.0
expected_pairs = {'a': pair(Trainer), 'b': pair(Overwrite), 'c': pair(WrongSign), 'd': [-8.0, believed - LR * -8.0]}
for oid, values in expected_pairs.items():
    shown = nums(popts[oid]['text'])
    check(close(shown[0], values[0]) and close(shown[1], values[1]), f'probe option {oid} {shown} vs {values}')
check(close(nums(popts['d']['text'])[2], believed), 'probe option d intermediate value')
signals = {s['hypothesisId']: s['optionIds'] for s in overlay['probes'][0]['signals']}
check(signals == {'wae-grad-overwrite': ['b'], 'wae-update-sign': ['c'], 'wae-backward-mutates': ['d']}, 'probe signals')
check(all(popts[o].get('misconceptionId') == h for h, (o,) in signals.items()), 'probe option links match signals')

# Transfer: middle split h2 = w*h1 + b, saved h1 = 4, w = 3, b = 1, receives dL/dh2 = 0.5.
t = Tape()
iw, ib, ih1 = t.leaf(3.0), t.leaf(1.0), t.leaf(4.0)
ih2 = t.add(t.mul(iw, ih1), ib)
# Inject the downstream sensitivity as the seed of a surrogate objective g*h2.
iobj = t.scale(ih2, 0.5)
g = t.grads(iobj)
check(close(items['wae-transfer-split-grad']['grading']['expected'], g[iw]) and close(g[ih1], 1.5) and close(g[ib], 0.5), 'transfer gradient')
fd_w = ((0.5 * ((3 + 1e-6) * 4 + 1)) - (0.5 * ((3 - 1e-6) * 4 + 1))) / 2e-6
check(close(fd_w, 2, 1e-6), 'transfer finite difference')
check(items['wae-transfer-split-state']['grading']['expected'] == 3.0 and close(3.0 - 0.1 * g[iw], 2.8), 'transfer state: receipt does not update w')
for a in overlay['assessments']:
    check(a['objectiveIds'] == ['fnd-o04-02'], 'all items on the host objective')
check(all(items[i]['role'] == 'transfer' and items[i]['type'] == 'numeric' for i in ('wae-transfer-split-grad', 'wae-transfer-split-state')), 'transfer items are production items')
check(probe['role'] == 'diagnostic_probe', 'probe role')

# ------------------------------------------------------------ 6. personal episode
text = '\n'.join(b['markdown'] for b in remedial['blocks'])
code = re.search(r'```python\n(.*?)```', text, re.S).group(1)
scope = {}
exec(compile(code, 'remedial-two-backward', 'exec'), scope)  # the episode's own executable trace
check(close(scope['params']['w'], 1.3) and close(scope['params']['b'], 0.4), 'executable trace result')
for wrong in ('grads["w"] += r * x', 'params[k] -= lr * grads[k]'):
    broken = code.replace(wrong, wrong.replace('+=', '=') if '+=' in wrong else wrong.replace('-=', '+='))
    try:
        exec(compile(broken, 'broken', 'exec'), {})
        rejected = False
    except AssertionError:
        rejected = True
    check(rejected, f'broken trace accepted: {wrong}')
# Memory table rows reproduce the correct implementation step by step.
rows = {m.group(1): [c.strip() for c in m.group(2).split('|')] for m in re.finditer(r'^\| (start|forward 1|backward 1|forward 2|backward 2|update|clear) \| (.*) \|$', text, re.M)}
tr, sim = Trainer(), {}
fmt = lambda v: 'none' if v is None else str(int(v)) if float(v).is_integer() else str(round(v, 10))
snap = lambda name: sim.__setitem__(name, [fmt(tr.params['w']), fmt(tr.params['b']), fmt(tr.grads['w']), fmt(tr.grads['b'])])
snap('start'); tr.forward(); snap('forward 1'); tr.backward(); snap('backward 1'); tr.forward(); snap('forward 2'); tr.backward(); snap('backward 2')
tr.update(); snap('update'); tr.clear(); snap('clear')
for name, values in sim.items():
    check(rows[name][:4] == values, f'memory table row {name}: {rows[name][:4]} vs {values}')
contrast = remedial['blocks'][3]['markdown']
check('w = 0.9' in contrast and 'b = 0.2' in contrast and '-0.3' in contrast and '-0.4' in contrast, 'contrast block names the wrong-model results')
check(close(pair(WrongSign)[1], -0.3) and close(two_backward(WrongSign)[1][0]['b'], -0.4), 'contrast numbers')
check(remedial['classification'] == 'optional' and remedial['additionalEpisodes'] == 1 and remedial['plannedMinutes'] <= 10, 'remedial cost')
check('not graded' in text and 'Backward propagates sensitivities' in text and not re.search(r'\b(mastery|credit|certif|passed)\b', text, re.I), 'remedial claims')
# Every number in the personal episode, for verification/evidence-features.py.
REMEDIAL_NUMBERS = [2, 3, 0.5, 0, 0.1, 1, -4, -2, -8, -4, 1.3, 0.4, 0.9, 0.2, -0.3, -0.4, 2.0, 3.0, 0.0, 1.0, -8.0, -4.0, 1e-12]
unknown = sorted({n for n in nums(text) + [float(m) for m in re.findall(r'\d+e-\d+', text)]} - {float(n) for n in REMEDIAL_NUMBERS} - {1e12, 12.0})
check(not unknown, f'remedial numbers not recomputed: {unknown}')

# ------------------------------------------------------------ 7. scene reference
PHASES = ['ready', 'forward', 'backward', 'update', 'forward2', 'backward2']
CODE = {'ready': [], 'forward': [0, 1], 'backward': [2], 'update': [3, 4, 5], 'forward2': [0, 1], 'backward2': [2]}
scene = {}
tr = Trainer()
last = None
for phase in PHASES:
    if phase in ('forward', 'forward2'):
        tr.forward()
        last, last_wx = tr.saved, tr.params['w'] * X
    elif phase in ('backward', 'backward2'):
        tr.backward()
    elif phase == 'update':
        tr.update()
        tr.clear()
    o = oracle(tr.params['w'], tr.params['b'])
    numeric = {'buf-w': tr.params['w'], 'buf-b': tr.params['b'], 'g-w-val': tr.params['w'], 'g-b-val': tr.params['b'], 'g-x-val': X}
    exact = {}
    for node, key in (('buf-gw', 'w'), ('buf-gb', 'b')):
        if tr.grads[key] is None:
            exact[node] = node.replace('buf-g', '') + '.grad = none'
        else:
            numeric[node] = tr.grads[key]
    if last is None:
        exact.update({'buf-pred': 'prediction = none', 'buf-loss': 'loss = none'})
    else:
        numeric.update({'buf-pred': last['p'], 'buf-loss': last['L'], 'g-add-val': last['p'], 'g-loss-val': last['L'], 'g-mul-val': last_wx})
    grads_visible = phase in ('backward', 'backward2')
    if grads_visible:
        g = oracle(tr.params['w'], tr.params['b'])
        numeric.update({'g-loss-grad': 1.0, 'g-add-grad': g['dp'], 'g-mul-grad': g['dmul'], 'g-w-grad': g['dw'], 'g-b-grad': g['db']})
    note = {X, Y, LR, tr.params['w'], tr.params['b'], W0, B0, 0.9, 0.2, 1.0, 2.0, 0.5, -4.0, -2.0, -1.0}
    if last:
        note |= {last['p'], last['L']}
    scene[phase] = {'numeric': numeric, 'exact': exact, 'highlighted': CODE[phase], 'gradientsVisible': grads_visible, 'noteNumbers': sorted(note)}
check(close(scene['update']['numeric']['buf-w'], 0.9) and close(scene['forward2']['numeric']['buf-loss'], 0.5) and close(scene['backward2']['numeric']['buf-gw'], -2), 'scene reference')
check(close(scene['forward2']['numeric']['g-mul-val'], 1.8) and close(scene['forward']['numeric']['g-mul-val'], 1.0), 'graph product values')

print(json.dumps({'checks': checks, 'implementations': verdicts, 'methods': ['closed_form_oracle', 'tape_reverse_mode', 'central_finite_difference'],
                  'section16': {'forward': [1, 2], 'backward': [-4, -2], 'update': [0.9, 0.2], 'freshForward': [2, 0.5]},
                  'personalEpisode': {'gradsAfterTwoBackward': [-8, -4], 'afterUpdate': [1.3, 0.4], 'executableTrace': 'ran', 'brokenTracesRejected': 2},
                  'remedialNumbers': REMEDIAL_NUMBERS, 'scene': scene, 'learningEffectiveness': 'not_measured'}))
