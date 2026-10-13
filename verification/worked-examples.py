"""CPU acceptance of staged worked examples against independent procedures.

The producer uses the released SDK's bounded expression evaluator. The verifier
uses separately implemented traces and finite differences, never that expression.
No model calls, GPU execution, learner records or production registration occurs.
"""
import copy
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
subprocess.run(['node', str(ROOT / 'scripts/stage-worked-examples.mjs')], cwd=ROOT,
               stdout=subprocess.DEVNULL, check=True, timeout=30)
definition = json.loads((ROOT / '.local/generated-teaching/verifier.json').read_text())
examples = json.loads((ROOT / '.local/generated-teaching/examples.json').read_text())
namespace = {}
# Only checked-in creator source is executed here. Runtime deployment executes
# it in the isolated broker; this CPU check does not claim broker qualification.
exec(compile(definition['source'], 'private-worked-reference', 'exec'), namespace)
verify = namespace['solve']


def accepted(artifact):
    return verify({'artifact': artifact, 'referenceData': definition['referenceData'],
                   'requiredCheckIds': definition['checkIds']}) == {'worked-example-reference': True}


checks = 0
covered = set()
for example in examples:
    covered.add(example['key'])
    assert accepted(example['good']), 'Independent procedure disagrees with a produced worked example'
    assert not accepted(example['wrong']), 'A realistically wrong calculation was accepted'
    checks += 2
    for mutation in [
        lambda a: a.update(markdown=a['markdown']+'Mastery is now granted.'),
        lambda a: a.update(objectiveIds=['unrelated-objective']),
        lambda a: a.update(kind='assessment_variant'),
        lambda a: a.update(markdown=a['markdown'].replace('Computation: ', 'Unverified computation: ', 1)),
        lambda a: a.update(markdown=a['markdown'].replace('**Result:** ', '**Result:** NaN ', 1)),
    ]:
        changed = copy.deepcopy(example['good'])
        mutation(changed)
        assert not accepted(changed), 'Unsupported content/scope was accepted'
        checks += 1

assert len(covered) == 39
assert len(definition['qualification']) == 16
for case in definition['qualification']:
    actual = verify({'artifact': case['artifact'], 'referenceData': definition['referenceData'],
                     'requiredCheckIds': definition['checkIds']})
    assert actual == case['expectedChecks'], 'Constructor qualification example failed'
    checks += 1

print(json.dumps({'verified': True, 'execution': 'private-cpu-procedural-reference',
                  'templates': len(covered), 'checks': checks, 'sdkProducer': 'released-0.2.0',
                  'arbitraryProseVerified': False, 'runtimeBrokerQualified': False,
                  'publishedAuthority': False, 'earnedCredit': False}))
