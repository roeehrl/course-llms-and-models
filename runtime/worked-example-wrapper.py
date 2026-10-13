
# Appended to the independently authored procedural reference implementation.
# This wrapper validates every displayed part of a bounded worked example.
import re


def _pattern(template, variables):
    names = {item['name'] for item in variables}
    parts, position, seen = [], 0, set()
    for match in re.finditer(r'\{\{([a-z][a-z0-9_]*)\}\}', template):
        parts.append(re.escape(template[position:match.start()]))
        name = match.group(1)
        if name not in names:
            raise ValueError('Undeclared example variable')
        if name in seen:
            parts.append('(?P=' + name + ')')
        else:
            parts.append('(?P<' + name + '>[-+]?[0-9]{1,12})')
            seen.add(name)
        position = match.end()
    parts.append(re.escape(template[position:]))
    return ''.join(parts)


def solve(payload):
    artifact = payload['artifact']
    if artifact.get('kind') != 'explanation' or not isinstance(artifact.get('markdown'), str):
        return {'worked-example-reference': False}
    markdown = artifact['markdown']
    if len(markdown) > 8000:
        return {'worked-example-reference': False}
    number = r'(?P<answer>[-+]?[0-9]{1,24}(?:\.[0-9]{1,24})?(?:[eE][-+]?[0-9]{1,3})?)'
    for template in payload['referenceData']['templates']:
        if artifact.get('objectiveIds') != template['objectiveIds']:
            continue
        formatted = '### Worked example\n\n' + template['promptTemplate'] + '\n\nComputation: ' + template['formulaTemplate'] + '\n\n**Result:** '
        match = re.fullmatch(_pattern(formatted, template['variables']) + number + '\n', markdown)
        if not match:
            continue
        values = {item['name']: int(match.group(item['name'])) for item in template['variables']}
        if any(values[item['name']] < item['minimum'] or values[item['name']] > item['maximum'] for item in template['variables']):
            continue
        answer = float(match.group('answer'))
        # reference() implements the operation/trace independently; it reads no
        # authored expression, model-generated answer key or grading state.
        expected = reference(template['key'], values)
        if math.isfinite(answer) and math.isfinite(expected) and math.isclose(answer, expected, rel_tol=1e-7, abs_tol=1e-7):
            return {'worked-example-reference': True}
    return {'worked-example-reference': False}
