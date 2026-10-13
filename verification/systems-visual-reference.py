"""Independent CPU oracle. No scene JSON, runtime expressions, GPU or network.

Emit fixtures to stdout; systems-visuals.mjs consumes them without storing an
extra generated file. Python loops/math.exp are independent of the scene AST.
"""
import json
import math

CASES = []
def case(scene, state, time, numeric=None, exact=None, geometry=None):
    CASES.append(dict(scene=scene, state=state, time=time, numeric=numeric or {}, exact=exact or {}, geometry=geometry or {}))


def attention(q, shift, mask):
    keys = [[1, 0], [0, 1], [-1, 1]]
    allowed = [mask != "No keys", mask != "No keys", mask == "All keys"]
    scores = [sum(a * b for a, b in zip([q, 1], k)) / math.sqrt(2) + shift for k in keys]
    if not any(allowed):
        return scores, [0., 0., 0.], None
    maximum = max(z for z, ok in zip(scores, allowed) if ok)
    masses = [math.exp(z - maximum) if ok else 0. for z, ok in zip(scores, allowed)]
    probs = [m / math.fsum(masses) for m in masses]
    return scores, probs, math.fsum(p * v for p, v in zip(probs, [2, -1, 4]))

for q in [-2, -.75, 0, 1, 1.75, 2]:
    for shift in [0, 1000]:
        for mask in ["All keys", "Mask key 3", "No keys"]:
            scores, probs, output = attention(q, shift, mask)
            for time in [0, 1700, 2125, 2550, 2975, 3400, 4175, 5000]:
                numeric = {f"logit-{i}": value for i, value in enumerate(scores)}
                numeric.update({f"prob-{i}": p for i, p in enumerate(probs)})
                numeric.update({f"contribution-{i}": p * v for i, (p, v) in enumerate(zip(probs, [2, -1, 4]))})
                numeric['attention-mass'] = sum(probs)
                exact = {}
                if output is None:
                    exact['attention-output'] = 'Undefined'
                else:
                    numeric['attention-output'] = output
                reveal = max(0., min(1., (time - 1700) / 1700))
                geometry = {f"prob-bar-{i}": {"widthRatio": p * reveal} for i, p in enumerate(probs)}
                case('systems-stable-attention', dict(query=q, shift=shift, mask=mask), time, numeric, exact, geometry)

# Same probabilities for a common shift; the unshifted naive implementation is
# a discriminating overflow control, not code run by the interactive scene.
for mask in ['All keys', 'Mask key 3']:
    a = attention(1.75, 0, mask)[1]
    b = attention(1.75, 1000, mask)[1]
    assert all(abs(x-y) < 1e-13 for x,y in zip(a,b))
try:
    math.exp(1000)
    raise AssertionError('overflow control did not fail')
except OverflowError:
    pass
assert attention(2, 0, 'Mask key 3')[1][2] == 0
assert attention(1, 0, 'No keys')[2] is None

DATA = [[(1., 2.)], [(2., 0.), (1., 1.)], [(-1., 3.)]]
def gradient_sums(w):
    return [sum((w*x-y)*x for x,y in batch) for batch in DATA]
def loss(w):
    return sum(.5*(w*x-y)**2 for batch in DATA for x,y in batch)/4

def stage_event(stage, time):
    if time >= 10000:
        return 'Batch complete'
    slot = int(time // 1000)
    # Enumerate task start slots from scheduling dependencies independently of
    # the display's lookup expression: each F moves right, each B moves left.
    forward = [(j + stage, f'Forward · μ{j+1}') for j in range(3)]
    backward = [(5 + (2-j) + (2-stage), f'Backward · μ{j+1}') for j in range(3)]
    return dict(forward + backward).get(slot, 'Bubble · idle')

for w in [-1., -.25, 1., 1.75, 2.]:
    grads = gradient_sums(w)
    mean = math.fsum(grads)/4
    numerical = (loss(w+1e-5)-loss(w-1e-5))/(2e-5)
    assert abs(mean-numerical) < 1e-9
    for rate in [0., .1, .25]:
        for time in [0, 500, 3500, 5000, 7999, 8000, 8500, 8999, 9000, 9500, 9999, 10000, 11000]:
            returned = [time >= finish for finish in [10000, 9000, 8000]]
            numeric = {'accum-sum': sum(g for g, ok in zip(grads, returned) if ok), 'batch-mean': mean,
                       'committed-weight': w-rate*mean if all(returned) else w,
                       'update-count': int(all(returned))}
            exact = {'accum-count': f'Examples returned: {sum(len(batch) for batch, ok in zip(DATA, returned) if ok)} / 4'}
            for i, ok in enumerate(returned):
                if ok:
                    numeric[f'batch-gradient-{i}'] = grads[i]
                else:
                    exact[f'batch-gradient-{i}'] = 'await return'
            exact.update({f'stage-active-{i}': stage_event(i,time) for i in range(3)})
            geometry = {f'batch-returned-{i}': {'opacity': float(ok)} for i,ok in enumerate(returned)}
            geometry['playhead'] = {'x': 110 + 69 * min(10, time/1000)}
            case('systems-microbatch-boundary', dict(weight=w, rate=rate), time, numeric, exact, geometry)
assert math.fsum(gradient_sums(1))/4 == 1.75
wrong_mean = sum(g/len(b) for g,b in zip(gradient_sums(1),DATA))/3
assert abs(wrong_mean-1.75) > .08

A = [[1,2,0],[-1,3,1],[2,1,4]]
B = [[2,1,-1],[0,3,2],[1,-2,1]]
C = [[sum(A[r][k]*B[k][c] for k in range(3)) for c in range(3)] for r in range(3)]
assert C == [[2,7,3],[-1,6,8],[8,-3,4]]
for tr in [0,1]:
    for tc in [0,1]:
        rows = [r for r in range(2*tr,2*tr+2) if r < 3]
        cols = [c for c in range(2*tc,2*tc+2) if c < 3]
        for time in [0, 650, 1099, 1100, 1499, 1500, 2000, 2399, 2400, 3000, 3550, 3999, 4000, 4399, 4400, 4999, 5000, 5500]:
            read_addresses = []
            for ks,finish in [([0,1],1100),([2],4000)]:
                if time >= finish:
                    read_addresses.extend(('A',r,k) for r in rows for k in ks)
                    read_addresses.extend(('B',k,c) for k in ks for c in cols)
            writes = [(r,c) for r in rows for c in cols] if time >= 5000 else []
            numeric = {'global-reads': len(read_addresses), 'global-writes': len(writes),
                       'global-bytes': 4*(len(read_addresses)+len(writes)), 'naive-reads': 6*len(rows)*len(cols)}
            exact = {}
            for i in range(4):
                r,c = 2*tr+i//2, 2*tc+i%2
                if r >= 3 or c >= 3:
                    exact[f'output-value-{i}'] = '—'
                    exact[f'output-status-{i}'] = 'outside'
                else:
                    numeric[f'output-value-{i}'] = sum(A[r][k]*B[k][c] for k,at in enumerate([1500,2400,4400]) if time >= at)
                    exact[f'output-status-{i}'] = 'written' if writes else 'partial'
            loaded = time >= (4000 if time >= 3000 else 1100)
            for i in range(4):
                ar,ak=2*tr+i//2,(2 if time>=3000 else 0)+i%2
                bk,bc=(2 if time>=3000 else 0)+i//2,2*tc+i%2
                for letter,row,col,matrix in [('a',ar,ak,A),('b',bk,bc,B)]:
                    node=f'scratch-{letter}-value-{i}'
                    if not loaded:
                        exact[node]='…'
                    else:
                        numeric[node]=matrix[row][col] if row<3 and col<3 else 0
            geometry={'load-a':{'progress':max(0.,min(1.,(time-(3100 if time>=3000 else 200))/900))}}
            case('systems-tiled-memory',dict(tileRow=tr,tileColumn=tc),time,numeric,exact,geometry)
# A reset-on-new-tile bug loses existing partial sums even if a selected output
# happens to have a zero earlier term. Choose a discriminating interior cell.
assert A[0][2]*B[2][1] != C[0][1]
assert len([('A',r,k) for r in [2] for k in range(3)]) == 3

print(json.dumps({'cases':CASES,'independentChecks':['softmax shift invariance','masked and empty rows','raw exponential overflow negative control','finite-difference batch gradient','unequal microbatch denominator negative control','enumerated memory addresses and edge bounds','reset-on-tile-change negative control']},allow_nan=False,separators=(',',':')))
