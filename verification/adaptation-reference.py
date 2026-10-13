"""Independent, bounded CPU references for authored recovery questions.

No author expression, expected key, eval, model call or learner code is read here.
Each procedure implements the stated operation/trace from its supplied variables.
Finite differences provide separate checks for derivatives.
"""
import datetime
import math
import statistics
import struct


def derivative(fn, x):
    step = 1e-5 * max(1, abs(x))
    return (fn(x + step) - fn(x - step)) / (2 * step)


def fp32(value):
    return struct.unpack('!f', struct.pack('!f', value))[0]


def reference(key, v):
    if key == '01-01':
        first = 2 * v['x'] - 1
        second = (2 + v['dw']) * v['x'] + (-1 + v['db'])
        return first - second
    if key == '01-02':
        weight, gradient = v['w'], v['g']
        weight -= gradient
        gradient = 99
        return weight
    if key == '01-03':
        ids, rows = [0, 1], [[.05, .90, .05], [.70, .20, .10]]
        ids.append(max(range(3), key=lambda i: rows[-1][i]))
        return sum(ids)
    if key == '01-04':
        def loss(weight):
            hidden = weight * v['x']
            prediction = v['v'] * hidden
            return .5 * (prediction - v['y']) ** 2
        return derivative(loss, v['w'])
    if key == '02-01':
        elements = sum(1 for _ in range(v['b']) for _ in range(v['t']) for _ in range(v['d']))
        return elements * 2 + elements * 2
    if key == '02-02':
        address = lambda i, j: 17 + 4 * (i * v['s0'] + j * v['s1'])
        return address(2, 0) - address(1, 2)
    if key == '02-03':
        a, b = [[2, v['a']], [0, 3]], [[1, 4], [v['b'], -1]]
        c = [[sum(a[i][k] * b[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
        return sum(c[i][i] for i in range(2))
    if key == '02-04':
        a = fp32(2 ** 24)
        return fp32(a + fp32(1 + 1)) - fp32(fp32(a + 1) + 1)
    if key == '03-01':
        before, after = [v['r'], -v['r']], [v['r'], -2 * v['r']]
        loss = lambda values: sum(.5 * r * r for r in values) / len(values)
        return loss(after) - loss(before)
    if key == '03-02':
        def loss(weight):
            reused = weight * weight
            prediction = reused + v['c'] * weight
            return .5 * (prediction - v['y']) ** 2
        return derivative(loss, v['w'])
    if key == '03-03':
        weight = v['w']
        for _ in range(2):
            weight -= v['g'] / v['d']
        return weight
    if key == '03-04':
        loss_total = sum([v['m']] * v['n'])
        retained = loss_total - v['a']
        return retained / len(list(range(1, v['n'])))
    if key == '04-01':
        edges = {'x': [], 'y': [], 'u': ['x', 'y'], 'v': ['x', 'y'], 'z': ['u', 'v'], 'r': ['z', 'u']}
        todo, seen = ['r'], set()
        while todo:
            node = todo.pop()
            if node not in seen:
                seen.add(node)
                todo.extend(edges[node])
        return len(seen)
    if key == '04-02':
        intermediate = v['x'] * v['x']
        return derivative(lambda u: u * u + v['c'] * u, intermediate)
    if key == '04-03':
        full = sum([v['g']] * v['n'])
        known = sum([v['a']] * v['k'])
        return full - known
    if key == '04-04':
        first = derivative(lambda x: 3 * (x * x + x), v['x'])
        first = 0  # The declared backward contract clears all old adjoints.
        return first + derivative(lambda x: 2 * x * x, v['x'])
    if key == '05-01':
        def loss(x):
            hidden = [max(0, 2 * x - 1), max(0, -x - 1)]
            prediction = sum(a * b for a, b in zip([3, 2], hidden))
            return .5 * (prediction - v['y']) ** 2
        return derivative(loss, v['x'])
    if key == '05-02':
        def stack(x):
            x = x + x / v['a']
            x = x - x / v['b']
            return x
        return derivative(stack, 1)
    if key == '05-03':
        weight, moment = 3, v['m']
        for gradient in [v['g'], 0]:
            moment = .5 * moment + gradient
            weight -= .25 * moment
        return weight
    if key == '05-04':
        weight = v['w']
        for target in [v['a'], v['b']]:
            gradient = weight - target
            weight -= .5 * gradient
        return weight
    if key == '06-01':
        accumulated, overwritten = {}, {}
        for row, contribution in zip([v['id'], 0, v['id']], [3, -2, 5]):
            accumulated[row] = accumulated.get(row, 0) + contribution
            overwritten[row] = contribution
        return accumulated[v['id']] - overwritten[v['id']]
    if key == '06-02':
        logits = [1000 + math.log(x) for x in [2, 3, 5]]
        shift = max(logits)
        logsum = shift + math.log(sum(math.exp(x - shift) for x in logits))
        return logsum - logits[2]
    if key == '06-03':
        losses, valid = [1, 2, v['x'], 100, 100], [True, True, True, False, False]
        total = sum(x for x, keep in zip(losses, valid) if keep)
        return total / sum(valid) - total / len(losses)
    if key == '06-04':
        footprint = lambda length: length * v['l'] * v['b'] * v['h'] * v['d'] * 2 * 2
        return footprint(8) - footprint(5)
    if key == '07-01':
        shapes = {'q': (v['d'], v['q']), 'k': (v['d'], v['q']), 'v': (v['d'], v['v']), 'out': (v['v'], v['d'])}
        count = lambda omitted: sum(a * b for name, (a, b) in shapes.items() if name not in omitted)
        return count(set()) - count({'k'})
    if key == '07-02':
        masses, values, keep = [2, 3, 5], [4, -2, 100], [True, True, False]
        denominator = sum(m for m, active in zip(masses, keep) if active)
        correct = sum(m / denominator * x for m, x, active in zip(masses, values, keep) if active)
        buggy = sum(m / sum(masses) * x for m, x, active in zip(masses, values, keep) if active)
        return correct - buggy
    if key == '07-03':
        ledger = lambda kv_heads: v['d'] * 8 + v['d'] * (kv_heads * 2) * 2 + 8 * v['d']
        return ledger(4) - ledger(1)
    if key == '07-04':
        vocabulary = [0] * (v['v'] * v['d'])
        positions = [0] * (v['t'] * v['d'])
        physical = len(vocabulary) + len(positions)
        mistaken = len(vocabulary) + len(vocabulary) + len(positions)
        return mistaken - physical
    if key == '08-01':
        gradient = derivative(lambda w: .5 * (2 * w - 1) ** 2, v['w'])
        gradient = 0
        for _ in range(2):
            gradient += derivative(lambda w: .5 * (3 * w - 2) ** 2, v['w'])
        return gradient
    if key == '08-02':
        return (v['end'] - 14) - (16 - 14)
    if key == '08-03':
        captured = v['w']
        unrelated_host = 99
        return captured - .25 * derivative(lambda w: .5 * (w * 2 - 1) ** 2, captured)
    if key == '08-04':
        count = lambda rank: len([0] * (v['o'] * rank)) + len([0] * (rank * v['i']))
        return count(3) - count(2)
    if key == '09-01':
        launched = ((v['n'] + 7) // 8) * 8
        return sum(i >= v['n'] for i in range(launched))
    if key == '09-02':
        def traffic(tile):
            reads, writes = 0, 0
            for _ in range(0, 8, tile):
                for _ in range(0, 8, tile):
                    for _ in range(0, 8, tile):
                        reads += tile * tile * 2
                    writes += tile * tile
            return (reads + writes) * 4
        return traffic(2) - traffic(4)
    if key == '09-03':
        intermediate = [[0 for _ in range(v['c'])] for _ in range(v['r'])]
        old_traffic = sum(len(row) for row in intermediate) * 4 * 2
        added_bias_read = len([0] * v['r']) * 4
        return old_traffic - added_bias_read
    if key == '09-04':
        usable = v['p'] - v['o']
        retained = [v['s'], 3]
        return usable - sum(retained)
    if key == '10-01':
        return sum([2] * v['a'] + [-1] * v['b'])
    if key == '10-02':
        finish = [[0] * v['s'] for _ in range(v['m'])]
        for micro in range(v['m']):
            for stage in range(v['s']):
                previous_micro = finish[micro - 1][stage] if micro else 0
                previous_stage = finish[micro][stage - 1] if stage else 0
                finish[micro][stage] = max(previous_micro, previous_stage) + v['t']
        serial = sum(v['s'] * v['t'] for _ in range(v['m']))
        return serial - finish[-1][-1]
    if key == '10-03':
        score = lambda ratio: max(.2, min(4, ratio ** 1.5))
        return score(4) - score(1)
    if key == '10-04':
        old, momentum = v['w'], 2
        locals_ = [old - 1, old - 3]
        pseudo_gradient = sum(old - weight for weight in locals_) / len(locals_)
        momentum = .5 * momentum + pseudo_gradient
        direction = pseudo_gradient + .5 * momentum
        return old - .25 * direction
    if key == '11-01':
        events = {'spawn': 0, 'start': 2, 'ready': v['ready'], 'admitted': v['admit']}
        return v['deadline'] - events['admitted']
    if key == '11-02':
        invocations = list(range(v['h'], v['t'])) + list(range(v['t'], 20))
        return len(invocations)
    if key == '11-03':
        accepted, pending, updates = set(), 0, 0
        for kind, identity in [('accept','A'),('accept','B'),('reject','C'),('duplicate','A'),('accept','D'),('accept','E'),('accept','F'),('duplicate','F'),('accept','G'),('accept','H')]:
            if kind != 'accept' or identity in accepted:
                continue
            accepted.add(identity)
            pending += 1
            if pending == 3:
                updates += 1
                pending = 0
        return updates
    if key == '11-04':
        events = [('spawn',2),('register',7),('forward',13),('backward',v['b']),('ack',v['u'])]
        times = dict(events)
        return times['ack'] - times['backward']
    if key == '12-01':
        return max(abs(a-b) for a,b in zip([10,-10,2,-2],[v['a'],-v['a'],2,-2]))
    if key == '12-02':
        matrix = [[0,1,2],[3,4,5]]
        transpose = [matrix[i][j] for j in range(3) for i in range(2)]
        return sum(a!=b for a,b in zip(transpose,[x for row in matrix for x in row]))
    if key == '12-03':
        batches = [[2]*v['n'],[8]]
        candidate = statistics.mean(statistics.mean(batch) for batch in batches)
        flat = [x for batch in batches for x in batch]
        return candidate - statistics.mean(flat)
    if key == '12-04':
        start = datetime.datetime.fromisoformat('2030-04-02T23:59:40+00:00')
        end = datetime.datetime.fromisoformat('2030-04-03T00:01:10+00:00')
        return (end-start).total_seconds()
    if key == '13-01':
        full, tile, target = [1,3,2,4],[1,3],3
        return -math.log(target/sum(full)) - (-math.log(target/sum(tile)))
    if key == '13-02':
        def objective(first):
            xs = [first,2]
            rms = math.sqrt(sum(x*x for x in xs)/len(xs)+.5)
            ys = [x/rms for x in xs]
            return sum(a*b for a,b in zip([1,2],ys))
        return derivative(objective,1)
    if key == '13-03':
        bound = v['a'] * v['u']
        bound += v['b']
        return v['c'] - bound
    if key == '13-04':
        old = sum([v['c'],v['o']])
        new = sum([v['c']/2,v['o'],v['h']])
        return old/new
    if key == '14-01':
        xs, gamma, bias = [0,4],[2,3],[1,-2]
        denominator = math.sqrt(statistics.mean(x*x for x in xs)+1)
        outputs = [g*x/denominator+b for g,x,b in zip(gamma,xs,bias)]
        return outputs[1]
    if key == '14-02':
        pairs = [(80,72),(100,95),(120,96)]
        return statistics.median((a-b)/a*100 for a,b in pairs)
    if key == '14-03':
        transmit = lambda mb: mb*8/100
        old = sum([v['c'],transmit(150),v['o']])
        new = sum([v['c'],1,transmit(75),v['o']])
        return old-new
    if key == '14-04':
        fn = lambda a,b: a*a*b+math.sin(b)
        grad_a = derivative(lambda a:fn(a,0),1)
        grad_b = derivative(lambda b:fn(1,b),0)
        return sum(a*b for a,b in zip([grad_a,grad_b],[v['da'],v['db']]))
    raise ValueError('No independently implemented reference for this key')
