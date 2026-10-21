"""Independent checks of the misconception overlay (content/misconceptions.json).

Structure: two misconception hypotheses per episode objective, one diagnostic probe
item per episode whose distractors signal exactly one hypothesis each, probes that
distinguish both hypotheses, chapter probe sets, and distractor links that point at
wrong options of gated items covering the hypothesis objective.

Arithmetic: every number the probe items rely on is recomputed here with plain
standard-library code written separately from the overlay, and the stated value must
appear in that item's text. Prints a JSON report; exits nonzero on any failure.
"""
import json, math, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRAGMENTS = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice']
load = lambda name: json.loads((ROOT / 'content' / f'{name}.json').read_text())
overlay = load('misconceptions')
modules = [load(n) for n in FRAGMENTS]
episodes = [e for m in modules for c in m['chapters'] for e in c['episodes']]
chapters = [c for m in modules for c in m['chapters']]
gates = {g['id']: g for m in modules for g in m['gates']}
assessments = {a['id']: a for m in modules for a in m['assessments']}
failures = []
def check(condition, message):
    if not condition:
        failures.append(message)

# ------------------------------------------------------------------ structure
hyps = {h['id']: h for h in overlay['hypotheses']}
items = {a['id']: a for a in overlay['assessments']}
probes = {p['id']: p for p in overlay['probes']}
check(len(hyps) == len(overlay['hypotheses']) == 112, 'expected 112 unique hypotheses')
check(len(items) == 56 and len(probes) == 56, 'expected 56 probe items and probes')
for h in hyps.values():
    check(h['kind'] == 'misconception' and 'critical' not in h, f'{h["id"]}: kind/critical')
    check(10 <= len(h['statement']) <= 300, f'{h["id"]}: statement length')
    check(set(h) == {'id', 'kind', 'statement', 'objectiveIds'}, f'{h["id"]}: only SDK fields')
    ann = overlay['annotations'].get(h['id'])
    check(ann and ann['correction'] and ann['basis'] and ann['episodeId'], f'{h["id"]}: annotation')
for e in episodes:
    (objective,) = e['objectiveIds']
    key = e['id'].split('-e', 1)[1]
    own = [h for h in hyps.values() if h['objectiveIds'] == [objective]]
    check(len(own) == 2, f'{e["id"]}: two hypotheses')
    check(all(overlay['annotations'][h['id']]['episodeId'] == e['id'] for h in own), f'{e["id"]}: annotation episode')
    item, probe = items.get(f'mis-probe-{key}'), probes.get(f'probe-{key}')
    check(item and probe, f'{e["id"]}: probe item and probe')
    if not (item and probe):
        continue
    check(item['type'] == 'choice' and item['role'] == 'diagnostic_probe' and item['objectiveIds'] == [objective], f'{item["id"]}: type/role/objective')
    check(item['prompt'].startswith('Misconception probe.'), f'{item["id"]}: prompt prefix')
    correct = item['grading']['correctOptionId']
    by_option = {o['id']: o for o in item['options']}
    check(correct in by_option and 'misconceptionId' not in by_option[correct], f'{item["id"]}: correct option carries no misconception')
    check(probe['objectiveId'] == objective and probe['assessmentId'] == item['id'], f'{probe["id"]}: scope')
    check(sorted(probe['distinguishes']) == sorted(h['id'] for h in own), f'{probe["id"]}: distinguishes both')
    for h in own:
        signalled = [o['id'] for o in item['options'] if o.get('misconceptionId') == h['id']]
        check(len(signalled) == 1, f'{item["id"]}: exactly one option signals {h["id"]}')
        sig = [s for s in probe['signals'] if s['hypothesisId'] == h['id']]
        check(len(sig) == 1 and sig[0]['optionIds'] == signalled, f'{probe["id"]}: signal for {h["id"]}')
    texts = [o['text'] for o in item['options']]
    check(len(set(texts)) == len(texts) and 3 <= len(texts) <= 4, f'{item["id"]}: distinct options')
    gated = {i for g in gates.values() for i in g['assessmentIds']}
    check(item['id'] not in gated and item['id'] not in assessments, f'{item["id"]}: new and ungated')
chapter_sets = overlay['chapterProbes']
check(len(chapter_sets) == 14, '14 chapter probe sets')
for c, entry in zip(chapters, chapter_sets):
    keys = [e['id'].split('-e', 1)[1] for e in c['episodes']]
    check(entry['chapterId'] == c['id'] and entry['probeIds'] == [f'probe-{k}' for k in keys], f'{c["id"]}: chapter probe set')
gated = {i for g in gates.values() for i in g['assessmentIds']}
for link in overlay['distractorLinks']:
    a, h = assessments.get(link['assessmentId']), hyps.get(link['hypothesisId'])
    check(a and h and a['id'] in gated and a['type'] == 'choice', f'{link}: gated choice item')
    if a and h:
        check(link['optionId'] != a['grading']['correctOptionId'] and any(o['id'] == link['optionId'] for o in a['options']), f'{link}: wrong existing option')
        check(set(h['objectiveIds']) <= set(a['objectiveIds']), f'{link}: objective scope')
check(len({(l['assessmentId'], l['optionId']) for l in overlay['distractorLinks']}) == len(overlay['distractorLinks']), 'duplicate distractor link')

# ------------------------------------------------------------------ arithmetic
def f32(x):
    return struct.unpack('f', struct.pack('f', x))[0]
def bf16_round(x):
    # round-to-nearest-even on the top 16 bits of the binary32 pattern
    bits = struct.unpack('I', struct.pack('f', x))[0]
    bits = (bits + 0x7FFF + ((bits >> 16) & 1)) & 0xFFFF0000
    return struct.unpack('f', struct.pack('I', bits))[0]
def softmax(z):
    m = max(z); e = [math.exp(v - m) for v in z]; s = sum(e); return [v / s for v in e]
def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]
def numdiff(f, x, h=1e-6):
    return (f(x + h) - f(x - h)) / (2 * h)
def rms(x, eps=0.0):
    return math.sqrt(sum(v * v for v in x) / len(x) + eps)
def rms_y(x, i):
    return x[i] / rms(x)

# (item key, label, computed value, expected value, text that must appear in the item)
R = []
def r(key, label, computed, expected, text):
    R.append((key, label, computed, expected, text))
r('01-01', 'output at x=6', 1.5 * 6 - 0.5, 8.5, '8.5')
r('01-01', 'output at x=4', 1.5 * 4 - 0.5, 5.5, '5.5')
r('01-02', 'update would give', 2 - 0.1 * ((2 * 3 - 8) * 3), 2.6, '2.6')
r('01-03', 'greedy after b', max(range(3), key=lambda i: [0.2, 0.2, 0.6][i]), 2, '0.6')
# two-stage chain: h=w*x, p=v*h
h, p = 3 * 2, 4 * 3 * 2
r('01-04', 'dL/dh', (p - 20) * 4, 16, '16')
r('01-04', 'dL/dv', (p - 20) * h, 24, '24')
r('01-04', 'A gradient', (p - 20) * 4 * 2, 32, '32')
r('02-01', 'offset X[1,0] in (2,3)', 1 * 3 + 0, 3, 'offset 3')
r('02-01', 'offset Y[1,0] in (3,2)', 1 * 2 + 0, 2, 'offset 2')
storage = [10, 20, 30, 40, 50, 60]
r('02-02', 'T[0,1] offset', 0 * 1 + 1 * 3, 3, 'offset 3')
r('02-02', 'faulty read', storage[0 * 2 + 1 * 1], 20, '20')
r('02-03', 'dot', sum(x * y for x, y in zip([1, 2, 3], [4, -1, 2])), 8, '= 8')
r('02-03', 'mean of A', sum([1, 2, 3, 4, 5, 6]) / 6, 3.5, '3.5')
r('02-03', 'mean of row sums', (6 + 15) / 2, 10.5, '10.5')
r('02-04', 'left order', f32(f32(f32(2.0 ** 24) + 1.0) - 2.0 ** 24), 0.0, '0 and 1')
r('02-04', 'right order', f32(2.0 ** 24 + f32(1.0 - 2.0 ** 24)), 1.0, '0 and 1')
r('02-04', 'bf16 1+0.001', bf16_round(1.001), 1.0, '1.0')
r('02-04', 'bf16 spacing', 2.0 ** -7, 0.0078125, '0.0078125')
loss1 = lambda w, x, y: (w * x - y) ** 2 / 2
r('03-01', 'ex1 at 2.2', loss1(2.2, 2, 5), 0.18, '0.18')
r('03-01', 'ex2 at 2.2', loss1(2.2, 1, 1), 0.72, '0.72')
r('03-01', 'mean at 2.2', (loss1(2.2, 2, 5) + loss1(2.2, 1, 1)) / 2, 0.45, '0.45')
r('03-01', 'mean at 2', (loss1(2, 2, 5) + loss1(2, 1, 1)) / 2, 0.5, '0.5')
L3 = lambda w: (2 * w - 5) ** 2 / 2
r('03-02', 'gradient at 1', numdiff(L3, 1.0), -6, '-6')
r('03-02', 'linear change', -6 * 0.01, -0.06, '0.06')
r('03-03', 'w after eta 0.3', 1 - 0.3 * numdiff(L3, 1.0), 2.8, '2.8')
r('03-03', 'loss at 2.8', L3(2.8), 0.18, '0.18')
r('03-03', 'scaled eta', 0.3 / 10, 0.03, '0.03')
z = lambda x: x * x + x
r('04-01', 'dz/dx', numdiff(z, 3.0), 7, '7')
r('04-02', 'dz/dx', numdiff(z, 3.0), 7, '= 7')
r('04-02', 'w after step', 2 - 0.1 * (-3), 2.3, '2.3')
r('04-03', 'weighted mean', (2 * 3 + 1 * (-3)) / 3, 1, 'mean gradient is 1')
r('04-03', 'w after', 10 - 0.1 * 1, 9.9, '9.9')
r('04-04', 'x.grad', numdiff(lambda x: 2 * x * x, 2.0), 8, '8')
r('04-04', 'one-slot rule', 2 * 2, 4, '4')
pre = [2 * 1 + 1 * -2 + 1, -1 * 1 + 2 * -2 + 0]
hid = [max(0, v) for v in pre]
r('05-01', 'preactivation 2', pre[1], -5, '-5')
r('05-01', 'prediction', 3 * hid[0] - 1 * hid[1] + 0.5, 3.5, None)
mA = 0.9 * 2 - 1; mB = 0.9 * 0 - 1
r('05-03', 'run A', 0.8 - 0.1 * mA, 0.72, '0.72')
r('05-03', 'run B', 0.8 - 0.1 * mB, 0.9, '0.9')
w = 1.0; g1 = (w * 2 - 4) * 2; w1 = w - 0.1 * g1; g2 = (w1 * 2 - 4) * 2
r('05-04', 'correct w2', w1 - 0.1 * g2, 1.64, '1.64')
r('05-04', 'stale w2', w1 - 0.1 * (g1 + g2), 2.04, '2.04')
r('05-04', 'stale grad', g1 + g2, -6.4, '-6.4')
r('05-04', 'correct grad', g2, -2.4, '-2.4')
r('05-04', 'loss correct', loss1(1.64, 2, 4), 0.2592, '0.2592')
r('05-04', 'loss stale', loss1(2.04, 2, 4), 0.0032, '0.0032')
r('06-01', 'row grad', [1 - 0.5, 2 + 3], [0.5, 5], '[0.5,5]')
p0 = softmax([math.log(2), 0, 0]); p1 = softmax([math.log(2), math.log(1.5), 0])
r('06-02', 'loss before', -math.log(p0[1]), math.log(4), '1.386')
r('06-02', 'loss after', -math.log(p1[1]), math.log(3), '1.099')
r('06-02', 'argmax after', max(range(3), key=lambda i: p1[i]), 0, 'ID 0')
r('06-03', 'valid mean', (1 + 2 + 3 + 4) / 4, 2.5, '2.5')
r('06-03', 'padded mean', 10 / 6, 1.6667, '1.667')
pt = softmax([math.log(4) / 0.5, 0])
r('06-04', 'T=0.5', pt[0], 16 / 17, '16/17')
r('06-04', 'T=1', softmax([math.log(4), 0])[0], 0.8, '0.8')
r('07-02', 'excluded output', 2.0, 2, 'output 2')
r('07-02', 'zero-score output', sum(a * b for a, b in zip(softmax([0, 0]), [2, 6])), 4, 'output 4')
r('07-03', 'GQA weights', 8 * 8 + 8 * 4 + 8 * 4 + 8 * 8, 192, '192')
r('07-03', 'rms y0', 3 / rms([3, 4]), 0.8485, '0.849')
r('07-03', 'rms y1', 4 / rms([3, 4]), 1.1314, '1.131')
r('07-04', 'uniform loss', math.log(3), 1.0986, '1.0986')
r('08-01', 'accumulated grad', (2 * 2 - 1) * 2 + (2 * 1 - 3) * 1, 5, 'is 5')
r('08-02', 'product', mm([[1, 2], [3, 4]], [[2, 0], [1, 2]]), [[4, 4], [10, 8]], '[10,8]')
r('08-03', 'mlx grad', sum((1 * x - y) * x for x, y in zip([1, 2], [2, 4])) / 2, -2.5, None)
r('08-03', 'mlx w', 1 - 0.1 * -2.5, 1.25, '1.25')
r('09-01', 'partials', [sum(range(1, 9)), 9 + 10], [36, 19], '36 and 19')
r('09-01', 'total', sum(range(1, 11)), 55, '55')
r('09-02', 'naive intensity', 128 / 576, 0.2222, '0.22')
r('09-02', 'tiled intensity', 2 * 4 ** 3 / 320, 0.4, '0.4')
r('09-02', 'roofline', min(2e12, 0.4 * 200e9), 80e9, '80 GOPS')
r('09-02', 'naive bytes', (2 * 4 ** 3 + 16) * 4, 576, '576')
r('09-04', 'needed', 5 + 5 + 10 + 3, 23, '23 GiB')
r('09-04', 'available', 24 - 6, 18, '18 GiB')
r('09-04', 'Amdahl', 4 / 2 + 6, 8, '8 s')
r('10-01', 'sum of partials', [1 * 1 + 2 * 2, 1 * 3 + 2 * 4], [5, 11], '[5,11]')
r('10-02', 'finish', (4 + 3 - 1) * 2, 12, '12')
r('10-02', 'utilization', 4 / (4 + 3 - 1), 2 / 3, '2/3')
r('10-04', 'pseudo-gradient', [((10 - 9) + (10 - 8)) / 2, ((20 - 18) + (20 - 21)) / 2], [1.5, 0.5], '[1.5,0.5]')
cs = math.ceil(10 / 3)
r('10-04', 'chunks', [min(cs, 10 - i) for i in range(0, 10, cs)], [4, 4, 2], '4, 4 and 2')
r('11-01', 'margin', 5 - 4.0, 1.0, '1.0 s')
r('11-02', 'body blocks', 8 - 4, 4, 'four blocks')
r('11-02', 'logits', 2 * 3 * 5, 30, '30 logits')
r('11-02', 'targets', 2 * 3, 6, '6 target')
r('11-04', 'elapsed', 15 - 4, 11, '11 s')
r('12-01', 'max error', max(abs(a - b) for a, b in zip([1, 3, 2, 4], [1, 2, 3, 4])), 1, 'error is 1')
P, V = [[.25, .75], [.6, .4]], [[2., -1.], [4., 3.]]
r('12-02', 'correct O row 0', mm(P, V)[0], [3.5, 2.0], '[3.5,2]')
r('12-02', 'wrong O row 0', mm([list(c) for c in zip(*P)], V)[0], [2.9, 1.55], '[2.9,1.55]')
r('13-01', 'tiled loss', math.log(2 + 3 + 5) - math.log(5), math.log(2), '0.693')
x = [0.0, 2.0]
def rms_loss(v):
    return rms_y(v, 1)  # dy = [0,1]
r('13-02', 'dx0', numdiff(lambda t: rms_loss([t, 2.0]), 0.0), 0.0, 'dL/dx = [0,0]')
r('13-02', 'dx1', numdiff(lambda t: rms_loss([0.0, t]), 2.0), 0.0, 'dL/dx = [0,0]')
r('13-02', 'uncoupled dx1', 1 / rms(x), 0.7071, '0.707')
r('13-02', 'layernorm', [(v - 1) / 1 for v in x], [-1, 1], '[-1,1]')
r('13-03', 'band', 1.5 * 0.004 + 0.0001, 0.0061, '0.0061')
r('13-04', 'job time', 7 + 3 / 4, 7.75, '7.75')
r('13-04', 'speedup', 10 / 7.75, 1.2903, '1.29')
r('14-01', 'r', rms([0, 3, 4], 2 / 3), 3, 'r = 3')
r('14-01', 'last output', 4 / rms([0, 3, 4], 2 / 3), 4 / 3, '4/3')
r('14-01', 'sum-based r', math.sqrt(25 + 2 / 3), 5.066, '5.07')
r('14-02', 'median saving', sorted([100 - 90, 110 - 99, 120 - 108])[1], 11, '11 ms')
r('14-03', 'transfer', 100 * 2 ** 20 * 8 / 200e6, 4.194304, '4.194304')

def close(a, b):
    if isinstance(a, list):
        return isinstance(b, list) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))
    return abs(a - b) <= 1e-4 * max(1.0, abs(b))
for key, label, computed, expected, text in R:
    item = items.get(f'mis-probe-{key}')
    check(close(computed, expected), f'{key} {label}: computed {computed} != stated {expected}')
    if item and text:
        blob = ' '.join([item['prompt'], item['grading']['explanation']] + [o['text'] for o in item['options']])
        check(text in blob, f'{key} {label}: "{text}" not in item text')

report = {'hypotheses': len(hyps), 'probeItems': len(items), 'probes': len(probes), 'chapterProbeSets': len(chapter_sets),
          'distractorLinks': len(overlay['distractorLinks']), 'recomputedFacts': len(R),
          'itemsWithRecomputedFacts': len({k for k, *_ in R}), 'contentReview': 'author_draft_not_independent',
          'failures': failures}
print(json.dumps(report, indent=2))
sys.exit(1 if failures else 0)
