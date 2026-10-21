#!/usr/bin/env python3
"""Independent CPU checks for the 0.1.6 learner-evidence additions.

Retention answers are recomputed with the separately implemented procedures in
verification/adaptation-reference.py; no SDK expression or stored key is reused.
Every number in a remedial episode or written-explanation prompt must either be
recomputed here or already appear in its anchor episode, so the additions cannot
introduce numbers the course does not teach. No model call or learner data.
"""
import importlib.util
import json
import math
from fractions import Fraction
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference', ROOT / 'verification/adaptation-reference.py')
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


def load(name):
    return json.loads((ROOT / 'content' / f'{name}.json').read_text())


fragments = [load(n) for n in ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice']]
episodes = {e['id']: e for f in fragments for c in f['chapters'] for e in c['episodes']}
objectives = {o['id']: o for f in fragments for o in f['objectives']}
gates = {g['id']: g for f in fragments for g in f['gates']}
assessments = {a['id']: a for f in fragments for a in f['assessments']}
authored, fresh = load('adaptation-authoring'), load('fresh-assessments')
retention, placement, written, remedial = load('retention-checks'), load('placement'), load('written-explanations'), load('remedial-episodes')
checks = 0


def check(condition, message):
    global checks
    assert condition, message
    checks += 1


def episode_text(episode_id):
    return '\n'.join(b['markdown'] for b in episodes[episode_id]['blocks'] if b['type'] == 'text')


NUMBER = re.compile(r'(?<![A-Za-z0-9_.])-?\d+(?:\.\d+)?(?:e-?\d+)?')


def numbers(text):
    return {float(n) for n in NUMBER.findall(text)}


def only_known_numbers(text, anchor_ids, computed, label):
    known = set().union(*(numbers(episode_text(a)) for a in anchor_ids)) | set(computed) | {0.0, 1.0, 2.0, 3.0, 4.0}
    unknown = sorted(n for n in numbers(text) if not any(math.isclose(n, k, rel_tol=1e-9, abs_tol=1e-9) for k in known))
    check(not unknown, f'{label} introduces numbers its anchor does not teach: {unknown}')


# Retention: held out, independently recomputed, distinct from recovery and worked examples.
exposed = {i for g in gates.values() for i in g['assessmentIds']} | set(placement['placement']['assessmentIds'])
exposed |= {b['assessmentId'] for e in episodes.values() for b in e['blocks'] if b['type'] == 'assessment'}
recovery_prompts = {a['prompt'] for a in fresh['assessments']} | {a['prompt'] for a in assessments.values()}
check(retention['intervalsDays'] == sorted(set(retention['intervalsDays'])) and all(1 <= d <= 365 for d in retention['intervalsDays']), 'Retention intervals must increase within SDK bounds')
transfer_items = {a['id'] for a in load('worked-adaptive-episode')['assessments'] if a.get('role') == 'transfer'}


def split_oracle(v):
    """Independent middle-split arithmetic in exact fractions: h2 = w*h1 + b, upstream sends dL/dh2."""
    g, h1, w = Fraction(str(v['g'])), Fraction(str(v['h1'])), Fraction(str(v['w']))
    grad_w, grad_h1 = g * h1, g * w  # chain rule through the multiply node
    return {'weight_gradient': grad_w, 'weight_before_step': w, 'upstream_sensitivity': grad_h1,
            'weight_after_step': w - Fraction(str(v.get('lr', 0))) * grad_w}[v['ask']]


for entry in retention['objectives']:
    if entry.get('procedure') == 'pipeline-middle-split':
        # The section 16 transfer revisit: authored, not from a recipe.
        items = [a for a in retention['assessments'] if a['familyId'] == 'ret-family-' + entry['key']]
        check(len(items) == len(entry['variables']) >= len(retention['intervalsDays']) + 1, 'Each retention objective needs one item per interval plus a retry')
        check(objectives[entry['objectiveId']]['critical'] and episodes[entry['episodeId']]['objectiveIds'] == [entry['objectiveId']], 'Retention targets a core objective of its episode')
        check(entry['objectiveId'] == 'fnd-o04-02' and transfer_items, 'The revisit follows the worked episode transfer items')
        check({v['ask'] for v in entry['variables']} == {'weight_gradient', 'weight_before_step', 'upstream_sensitivity', 'weight_after_step'}, 'The revisit asks each part of the transfer')
        for item, values in zip(items, entry['variables']):
            check(item['id'] not in exposed and item['id'] not in transfer_items and item['type'] == 'numeric' and item['objectiveIds'] == [entry['objectiveId']], 'Retention item is held out')
            expected = split_oracle(values)
            check(item['grading']['expected'] == float(expected), f'{item["id"]} answer disagrees with the independent split arithmetic')
            check((expected * 1000).denominator == 1, f'{item["id"]} needs too many decimals to type')
            check(item['prompt'] not in recovery_prompts, 'Retention prompt duplicates an existing question')
            shown = {'h1': 'h1 = ', 'w': 'w = ', 'b': 'b = ', 'g': 'dL/dh2 = ', 'lr': 'learning rate '}
            for name in [n for n in shown if n in values]:
                check(f'{shown[name]}{values[name]}' in item['prompt'], f'{item["id"]} prompt omits {name}')
            # The transfer's own numbers (h1 = 4, w = 3, b = 1, dL/dh2 = 0.5) are not reused.
            check((values['h1'], values['w'], values['b'], values['g']) != (4, 3, 1, 0.5), f'{item["id"]} repeats the transfer example')
            # A learner who answers with another part of the procedure must be wrong.
            others = {split_oracle({**values, 'ask': ask, 'lr': values.get('lr', 0)}) for ask in ('weight_gradient', 'weight_before_step', 'upstream_sensitivity')} - {expected}
            check(all(o != expected for o in others) and split_oracle({**values, 'ask': 'weight_gradient'}) != values['w'], f'{item["id"]} does not discriminate gradient from weight')
        check(len({a['grading']['expected'] for a in items}) == len(items), 'Retention items for one objective need distinct answers')
        continue
    recipe = next(r for r in authored['adaptation']['numericalRecipes'] if r['id'] == entry['recipeId'])
    family = next(f for f in authored['adaptation']['families'] if recipe['id'] in f['numericalRecipeIds'])
    items = [a for a in retention['assessments'] if a['familyId'] == 'ret-family-' + entry['key']]
    check(len(items) == len(entry['variables']) >= len(retention['intervalsDays']) + 1, 'Each retention objective needs one item per interval plus a retry')
    check(objectives[entry['objectiveId']]['critical'] and entry['objectiveId'] in episodes[entry['episodeId']]['objectiveIds'], 'Retention targets a core objective of its episode')
    widths = [v['maximum'] - v['minimum'] + 1 for v in recipe['variables']]
    def ordinal_of(values):
        ordinal, scale = 0, 1
        for v, width in zip(recipe['variables'], widths):
            ordinal += (values[v['name']] - v['minimum']) * scale
            scale *= width
        return ordinal
    worked = [{v['name']: (v['maximum'] if seed < 0 else v['minimum'] + seed % (v['maximum'] - v['minimum'] + 1)) for v in recipe['variables']} for seed in [0, 1, 2, 3, 4, -1]]
    binding = next(b for b in authored['bindings'] if b.get('templateId') == recipe['id'])
    for item, values in zip(items, entry['variables']):
        check(item['id'] not in exposed and item['type'] == 'numeric' and item['objectiveIds'] == [entry['objectiveId']], 'Retention item is held out')
        check(ordinal_of(values) >= family['maxVariantsPerPlan'] and values not in worked and values != binding['variables'], 'Retention numbers repeat a recovery variant or worked example')
        expected = reference.reference(entry['key'], values)
        check(math.isclose(item['grading']['expected'], expected, rel_tol=0, abs_tol=1e-9), f'{item["id"]} answer disagrees with the independent procedure')
        check(abs(expected * 1000 - round(expected * 1000)) < 1e-6, f'{item["id"]} needs too many decimals to type')
        check(item['prompt'] not in recovery_prompts, 'Retention prompt duplicates an existing question')
        for name, value in values.items():
            check(f'{value}' in item['prompt'], f'{item["id"]} prompt omits {name}')
    check(len({a['grading']['expected'] for a in items}) == len(items), 'Retention items for one objective need distinct answers')

# Placement: exactly the existing short checks of the placeable chapters.
p = placement['placement']
covered = [e for e in episodes.values() if all(o in p['objectiveIds'] for o in e['objectiveIds'])]
check(len(covered) == 12 and all(objectives[o]['placeable'] for o in p['objectiveIds']), 'Placement covers the twelve placeable episodes of chapters 1-3')
short = [i for e in covered for i in gates[e['gateId']]['assessmentIds'] if assessments[i]['type'] in ('choice', 'numeric')]
check(sorted(short) == sorted(p['assessmentIds']) and p['maxItems'] == len(short) and p['learnerMayDecline'], 'Placement uses only existing independent short checks')

# Written explanations: criteria quotable and grounded in the episode's own example.
written_numbers = {
    'wri-06-03': [4, 2, 7, 1, 0],
    'wri-12-01': [1, 2, 3, 4, sum([1, 3, 2, 4]), max(abs(a - b) for a, b in zip([1, 3, 2, 4], [1, 2, 3, 4]))],
    'wri-12-04': [],
}
w = 1.0
trace = []
for _ in range(2):
    w -= 0.1 * (w * 2 - 4) * 2
    trace.append(round(w, 10))
stale, g = 1.0, 0.0
for _ in range(2):
    g += (stale * 2 - 4) * 2
    stale -= 0.1 * g
written_numbers['wri-14-04'] = [2, 4, 1, 0.1, trace[0], trace[1], round(stale, 10), (1 * 2 - 4) * 2]
check(trace == [1.4, 1.64] and round(stale, 10) == 2.04, 'Teach-back trace disagrees with the episode')
check(written['extension']['id'] == 'course-core-reviewed-rubric' and written['extension']['execution'] == 'server', 'Rubric evaluator declaration')
for item in written['assessments']:
    binding = next(b for b in written['bindings'] if b['assessmentId'] == item['id'])
    rubric = item['grading']['rubric']
    check(item['type'] == 'rubric' and 1 <= len(rubric) <= 12 and any(c['required'] for c in rubric), 'Rubric shape')
    check(len({c['id'] for c in rubric}) == len(rubric) and all(0 < len(c['description']) <= 500 for c in rubric), 'Rubric criteria are unique and bounded')
    check(all(re.match(r'^(States|Explains|Names|Notes|Proposes|Gives|Describes)\b', c['description']) for c in rubric), 'Each criterion names something the learner writes, so a reviewer can quote it')
    check('quotes your own words' in item['prompt'] and 'does not hold up your progress' in item['prompt'], 'Prompt tells the learner how review works')
    check(item['objectiveIds'] == episodes[binding['episodeId']]['objectiveIds'], 'Written explanation matches its episode objective')
    text = item['prompt'] + '\n' + '\n'.join(c['description'] for c in rubric)
    only_known_numbers(text, [binding['episodeId']], written_numbers[item['id']], item['id'])

# Remedial episodes: recompute every worked number from the anchor episode's own example.
storage = [10, 20, 30, 40, 50, 60]
read = lambda i, j, s: storage[i * s[0] + j * s[1]]
strides = [read(1, 0, (3, 1)), read(0, 1, (1, 3)), read(2, 1, (1, 3)), read(0, 1, (2, 1)), read(0, 2, (3, 1)), read(2, 0, (1, 3)), read(2, 0, (2, 1)), 2 * 2 + 1 * 1, 5, 99, 6, 2, 1]
check(strides[:7] == [40, 40, 60, 20, 30, 30, 50], 'Stride walkthrough values')
loss = lambda w_, x=2, y=5, b=0: 0.5 * (w_ * x + b - y) ** 2
h = 1e-5
fd = (loss(1 + h) - loss(1 - h)) / (2 * h)
check(abs(fd + 6) < 1e-6 and math.isclose(loss(1.01), 4.4402) and math.isclose(loss(1), 4.5), 'Chain-rule walkthrough values')
chain = [2, -3, 4.5, 1, -6, 0.01, -0.06, 4.44, 2.02, -2.98, 4.4402, 0.0002, 1e-5, 5, -5, 0, loss(1)]
xv = 3
fan = [1, 3, 4, 7, 2 * xv + 1, xv * xv, xv * xv + xv]
p_, r_ = 2 * 3 + 1, 2 * 3 + 1 - 8
step = [p_, r_, 0.5 * r_ * r_, r_ * 3, r_ * 2, 2 - 0.1 * (r_ * 3), 1 - 0.1 * r_, 2.3 * 3 + 1.1, 8, 0.1]
check(fan[3] == 7 and step[:3] == [7, -1, 0.5] and math.isclose(step[5], 2.3) and math.isclose(step[6], 1.1) and math.isclose(step[7], 8), 'Backward walkthrough values')
scores = [0.0, math.log(3)]
probs = [math.exp(s) / sum(math.exp(t) for t in scores) for s in scores]
out = sum(pi * v for pi, v in zip(probs, [2, 6]))
G = out - 1
dP = [G * v for v in [2, 6]]
mean = sum(pi * d for pi, d in zip(probs, dP))
dS = [pi * (d - mean) for pi, d in zip(probs, dP)]
check([round(x, 12) for x in probs] == [0.25, 0.75] and math.isclose(out, 5) and [round(x, 12) for x in dS] == [-3, 3] and math.isclose(mean, 20), 'Attention walkthrough values')
attention = [0.25, 0.75, out, G, 1, 2, 6, 8, 24, mean, -3, 3, 0.5, 4, 1 * 1, 3, 2 * 0.25 + 6 * 0.75]
# Design section 16 personal episode: x=2, y=3, w=0.5, b=0, lr=0.1, two backward calls then one update.
wx, wy, w0, b0, lr = 2, 3, 0.5, 0, 0.1
r0 = w0 * wx + b0 - wy
g2w, g2b = 2 * r0 * wx, 2 * r0
two = [wx, wy, w0, b0, lr, w0 * wx + b0, r0 * r0 / 2, r0 * wx, r0, g2w, g2b, w0 - lr * g2w, b0 - lr * g2b, w0 - lr * r0 * wx, b0 - lr * r0, w0 + lr * g2w, b0 + lr * g2b, 1e-12]
check(math.isclose(two[11], 1.3) and math.isclose(two[12], 0.4) and math.isclose(two[15], -0.3), 'Two-backward walkthrough values')
computed = {'remedial-strides': strides, 'remedial-chain-rule': chain, 'remedial-backward-fanout': fan + step, 'remedial-attention-mask': attention, 'remedial-two-backward': two}
for entry in remedial['entries']:
    anchor = episodes[entry['anchorEpisodeId']]
    check(entry['objectiveIds'] == anchor['objectiveIds'] and entry['classification'] == 'optional' and entry['additionalEpisodes'] == 1, 'Remedial scope and cost')
    text = '\n'.join(b['markdown'] for b in entry['blocks'])
    check(anchor['title'] in text and 'not graded' in text, 'Remedial episode names its anchor and makes no grading claim')
    check(not re.search(r'\b(mastery|credit|certif|passed)\b', text, re.I), 'Remedial episode makes no authority claim')
    only_known_numbers(text, [anchor['id']], computed[entry['id']], entry['id'])
    # A reveal needs the gate item's own operands together with its answer, not a
    # coincidental small integer from the anchor's worked example.
    for item_id in gates[anchor['gateId']]['assessmentIds']:
        item = assessments[item_id]
        if item['type'] == 'numeric':
            operands = numbers(item['prompt']) - {0.0, 1.0}
            check(not (operands <= numbers(text) and item['grading']['expected'] in numbers(text)), f'{entry["id"]} restates gate item {item_id} with its answer')

# Negative controls: the checks above must reject an invented number and a wrong key.
def rejects(run):
    try:
        run()
    except AssertionError:
        return True
    return False


first = remedial['entries'][0]
check(rejects(lambda: only_known_numbers('\n'.join(b['markdown'] for b in first['blocks']) + ' The offset is `17`.', [first['anchorEpisodeId']], computed[first['id']], 'control')), 'Invented number accepted')
item, entry = retention['assessments'][0], retention['objectives'][0]
check(not math.isclose(item['grading']['expected'] + 0.5, reference.reference(entry['key'], entry['variables'][0]), abs_tol=1e-9), 'Wrong retention key accepted')
print(json.dumps({'verified': True, 'checks': checks, 'retentionItems': len(retention['assessments']), 'retentionObjectives': len(retention['objectives']),
                  'placementItems': len(p['assessmentIds']), 'writtenItems': len(written['assessments']), 'remedialEpisodes': len(remedial['entries']),
                  'learningEffectiveness': 'not_measured', 'reviewQuality': 'depends_on_human_reviewers'}))
