"""Independent scalar arithmetic reference for the declarative visual scenes."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
cases = []
for x in [-4, -0.5, 0, 2.5, 4]:
    for w in [-3, 0, 0.5, 3]:
        for b in [-3, 0, 3]:
            cases.append(dict(scene='ml-affine-forward', state=dict(x=x, w=w, b=b), time=1100,
                              numericText={'affine-output': w*x+b, 'multiply-value': w*x}))
for w in [-3, -1.5, 0, 2, 3]:
    for rate in [0, 0.1, 0.25, 0.6]:
        loss = lambda weight: (2*weight-4)**2 / 2
        h = 1e-5
        derivative = (loss(w+h)-loss(w-h))/(2*h)
        assert abs(derivative-(4*w-8)) < 1e-7
        next_w = w-rate*derivative
        for time in [0, 500, 1600, 2700, 3000]:
            p = min(1, max(0, (time-500)/2200))
            animated_w = w+(next_w-w)*p
            cases.append(dict(scene='ml-gradient-update', state=dict(w=w, rate=rate), time=time,
                              numericText={'loss-value': loss(w), 'gradient-value': derivative,
                                           'next-weight': next_w, 'next-loss': loss(next_w)},
                              coordinates={'next-dot': {'x': (animated_w+4)/14*690, 'y': 200-loss(animated_w)/140*200}}))
for transpose in [False, True]:
    # Build the view directly from a physical index matrix rather than reproducing
    # the renderer's stride expression as the reference calculation.
    original = [list(range(start, start+4)) for start in (0, 4, 8)]
    view = list(map(list, zip(*original))) if transpose else original
    for row in range(4):
        for column in range(4):
            if row < len(view) and column < len(view[0]):
                offset = view[row][column]
                cases.append(dict(scene='ml-tensor-strides', state=dict(row=row, column=column, transpose=transpose), time=1000,
                                  numericText={'tensor-offset': offset, 'tensor-bytes': offset*4}))
            else:
                cases.append(dict(scene='ml-tensor-strides', state=dict(row=row, column=column, transpose=transpose), time=1000,
                                  exactText={'tensor-offset': 'coordinate out of bounds', 'tensor-bytes': 'No memory access is valid.'}))
(root/'verification/visual-reference.json').write_text(json.dumps({'schemaVersion': 1, 'cases': cases}, indent=2)+'\n')
print(json.dumps({'independentVisualReferenceCases': len(cases), 'gradientReference': 'central finite differences', 'tensorReference': 'explicit transposed index matrix'}))
