# CPU content verification; no optional frameworks or device execution.
import json, math, re, struct
from fractions import Fraction as F
from pathlib import Path

root = Path(__file__).resolve().parents[1]
f = json.loads((root/'content/foundations.json').read_text())
items = {a['id']: a for a in f['assessments']}
episodes = [e for c in f['chapters'] for e in c['episodes']]
checks = 0
def close(actual, expected, tolerance=1e-9):
    global checks
    assert math.isfinite(float(actual))
    assert abs(actual-expected) <= tolerance, (actual, expected)
    checks += 1

def half_loss(w, x, y, b=0):
    return (w*x+b-y)**2/2

def difference(fn, value, h=1e-5):
    return (fn(value+h)-fn(value-h))/(2*h)

def f32(value):
    return struct.unpack('f', struct.pack('f', value))[0]

def round_near_one(value, fraction_bits):
    step = F(1, 2**fraction_bits)
    return round(value/step)*step

# Independently compute every numeric key from its stated inputs.
graph = {'x': (), 'y': (), 'u': ('x','y'), 'v': ('u','u'), 'z': ('v','x')}
seen = set()
def visit(name):
    if name not in seen:
        seen.add(name)
        for parent in graph[name]: visit(parent)
visit('z')
expected = {
 '01-01': (-1*5+4)-(2*5-3),
 '01-02': 3,  # no parameter-writing operation has executed
 '01-03': max(range(3), key=[0.2,0.3,0.5].__getitem__),
 '01-04': difference(lambda h: half_loss(-1,h,0), 2*3),
 '02-01': math.prod((3,5,2))*2,
 '02-02': (2+2*1+1*4)*4,
 '02-03': sum(a*b for a,b in zip([2,-1],[1,5])),
 '02-04': f32(f32(2**25+3)-2**25),
 '03-01': half_loss(2,3,1,-1),
 '03-02': difference(lambda w: half_loss(w,3,1,2), 0),
 '03-03': 1-F(1,10)*(1*3-6)*3,
 '03-04': (3*2+10)/4,
 '04-01': len(seen),
 '04-02': difference(lambda x: x**3+x*x, 2),
 '04-03': (3*2-6)/4,
 '04-04': difference(lambda x: x*x+x, -2),
}
for n, result in expected.items():
    close(float(result), items['fnd-a'+n+'-trace']['grading']['expected'], 1e-7)
assert set(expected) == {a['id'][5:-6] for a in f['assessments'] if a['type']=='numeric'}

# Worked examples: independent arithmetic rather than repeating the prose assertion.
for x, result in [(4,5.5),(6,8.5),(5,7)]: close(F(3,2)*x-F(1,2), result)
close(2*4-F(1,2),7.5)
close(half_loss(2,3,8),2)
close((2*3-8)*3,-6)
close(2-F(1,10)*(-6),F(13,5))
close(half_loss(F(13,5),3,8),F(1,50))
vocab=['a','b',' ']; rows=[[.1,.7,.2],[.2,.2,.6],[.8,.1,.1]]
ids=[vocab.index(c) for c in 'ab a']
assert ids==[0,1,2,0] and ids[:-1]==[0,1,2] and ids[1:]==[1,2,0]
for row in rows: close(sum(row),1)
first=max(range(3), key=rows[ids[-1]].__getitem__)
second=max(range(3), key=rows[first].__getitem__)
assert (first,second)==(1,2)
# Partition example: finite differences independently validate both parameter gradients.
close(3*2,6); close(4*6,24); close(half_loss(4,6,20),8)
close(difference(lambda h: half_loss(4,h,20),6),16,1e-7)
close(difference(lambda w: half_loss(4,w*2,20),3),32,1e-7)
close(difference(lambda v: half_loss(v,6,20),4),24,1e-7)
close(F(3)-F(1,100)*32,F(268,100)); close(F(4)-F(1,100)*24,F(376,100))
close(math.prod((2,3,4)),24); close(24*4,96); close(24*2,48)
close(1*12+2*4+3,23); close(23*4,92); close(2*4+1,9)
assert divmod(17,12)==(1,5) and divmod(5,4)==(1,1)
close(math.prod(()),1); close(math.prod((0,4)),0)
store=[10,20,30,40,50,60]
assert store[2*1+1*3]==60 and store[0*1+1*3]==40 and store[0*2+1]==20
store[0*1+1*3]=99; assert store[1*3+0]==99
# Independently enumerate a broadcast output; no NumPy required.
A=[[[10*b+d for d in range(3)]] for b in range(2)]
B=[[[100*t] for t in range(4)]]
bcast=[[[A[b][0][d]+B[0][t][0] for d in range(3)] for t in range(4)] for b in range(2)]
assert (len(bcast),len(bcast[0]),len(bcast[0][0]))==(2,4,3)
close(sum(x*y for x,y in zip([1,2,3],[4,-1,2])),8)
A=[[1,2,3],[4,5,6]]; B=[[1,0],[0,1],[1,1]]
C=[[sum(a*b for a,b in zip(row,col)) for col in zip(*B)] for row in A]
assert C==[[4,5],[10,11]] and [sum(row) for row in A]==[6,15]
assert [sum(col) for col in zip(*A)]==[5,7,9]
close(sum(map(sum,A))/6,3.5); close(sum(map(sum,A))/2,10.5)
close(2*2*3,12); close(2*2*(3-1),8)
close(2**-10,.0009765625); close(2**-7,.0078125)
close(round_near_one(F(1001,1000),10),F(1025,1024))
close(round_near_one(F(1001,1000),7),1)
close(struct.unpack('e',struct.pack('e',1.001))[0],1.0009765625)
close(f32(f32(2**24+1)-2**24),0)
close(f32(2**24+f32(1-2**24)),1)
for w,result in [(1,4.5),(2,.5),(2.5,0),(3,.5),(4,4.5)]: close(half_loss(w,2,5),result)
close((half_loss(2,2,5)+half_loss(2,1,1))/2,.5)
close(difference(lambda w:half_loss(w,2,5),1),-6,1e-8)
close(half_loss(F(101,100),2,5),F(44402,10000))
close(half_loss(F(101,100),2,5)-(F(9,2)-F(6,100)),F(2,10000))
for eta,new_w,new_loss in [(F(1,10),F(8,5),F(162,100)),(F(1,100),F(106,100),F(41472,10000)),(F(6,10),F(46,10),F(882,100)),(F(3,10),F(28,10),F(18,100))]:
    close(1-eta*(-6),new_w);close(half_loss(new_w,2,5),new_loss)
for eta in [F(1,100),F(1,10),F(1,4),F(3,10),F(1,2),F(6,10)]:
    assert (abs(1-4*eta)<1)==(0<eta<F(1,2))
close((half_loss(1,1,3)+half_loss(1,2,2))/2,1)
close(((1*1-3)*1+(1*2-2)*2)/2,-1)
close(half_loss(F(11,10),1,3),F(1805,1000))
close(half_loss(F(11,10),2,2),F(2,100))
close((F(1805,1000)+F(2,100))/2,F(9125,10000))
close(3*3+3,12);close(difference(lambda x:x*x+x,3),7,1e-8)
close(half_loss(2,3,8,1),.5)
close(difference(lambda w:half_loss(w,3,8,1),2),-3,1e-8)
close(difference(lambda b:half_loss(2,3,8,b),1),-1,1e-8)
close(difference(lambda x:half_loss(2,x,8,1),3),-2,1e-8)
close(F(23,10)*3+F(11,10),8)
close(6*1024*4,24576);close(2*1024*4,8192);close((6-2)*1024*4,16384)
close((2*3-3)/3,1);close(10-F(1,10)*1,F(99,10));close(1+2,3)

# Execute every authored Python fence in an isolated namespace.
snippets=0
for episode in episodes:
    for block in episode['blocks']:
        if block['type']=='text':
            for snippet in re.findall(r'```python\n(.*?)```',block['markdown'],re.S):
                exec(compile(snippet,episode['id'],'exec'),{})
                snippets+=1
engine_text=next(b['markdown'] for b in episodes[-1]['blocks'] if b['type']=='text')
engine=re.search(r'```python\n(.*?)```',engine_text,re.S).group(1)
namespace={};exec(engine,namespace);Value=namespace['Value']
# Compare AD to a separately written real-valued loss with two step sizes.
gradient_comparisons=0;max_gradient_error=0.0
for w in [-1.5,0,2]:
 for b in [-.4,1]:
  for x in [-2,0,.5,3]:
   for y in [-1.2,2]:
    W,B,X=Value(w),Value(b),Value(x)
    pred=W*X+B;residual=pred+Value(-y);loss=Value(.5)*residual*residual
    before=(W.value,B.value,X.value);loss.backward()
    assert (W.value,B.value,X.value)==before
    for h in [1e-4,1e-5]:
     references=[difference(lambda t:half_loss(t,x,y,b),w,h),difference(lambda t:half_loss(w,x,y,t),b,h),difference(lambda t:half_loss(w,t,y,b),x,h)]
     for node,ref in zip([W,B,X],references):
      error=abs(node.grad-ref);max_gradient_error=max(max_gradient_error,error)
      close(node.grad,ref,1e-7);gradient_comparisons+=1
for x in [-3,-2,0,.5,2,4]:
 X=Value(x);U=X*X;Z=U*X+U
 Z.backward();close(X.grad,3*x*x+2*x)
 Z.backward();close(X.grad,3*x*x+2*x)
# Captured multiplication inputs preserve the old-forward derivative.
a,b=Value(2),Value(5);out=a*b;b.value=9;out.backward();close(a.grad,5)
# Explicit update changes weights; rebuilding forward recomputes the new loss.
w,b,x=Value(2),Value(1),Value(3)
r=w*x+b+Value(-8);loss=Value(.5)*r*r;loss.backward()
w.value-=.1*w.grad;b.value-=.1*b.grad
close(w.value,2.3);close(b.value,1.1);close(half_loss(w.value,3,8,b.value),0)
# Numerical evidence for choice distractors and selected negative controls.
close(difference(lambda w:half_loss(w,4,1),1),12,1e-7)
assert (1*4-1)==3 and 3!=12
assert [2,7,11,13,17,19][1] != [2,7,11,13,17,19][2]
close(4-F(1,4)*(-2),4.5)
assert (3-3)/2 != (2*3-3)/3
negative_controls=0
for broken in [engine.replace('self.grad += b * out.grad','self.grad = b * out.grad').replace('other.grad += a * out.grad','other.grad = a * out.grad'),engine.replace('self.grad += out.grad','self.grad = out.grad').replace('other.grad += out.grad','other.grad = out.grad'),engine.replace('            other.grad += a * out.grad','            pass  # omitted second operand')]:
    try: exec(broken,{})
    except AssertionError: negative_controls+=1
    else: raise AssertionError('Broken engine passed shared-node checks')
assert negative_controls==3
# Declared tolerance rejects wrong signs and non-finite submitted numbers.
def accepted(value,key):
    return isinstance(value,(int,float)) and math.isfinite(value) and abs(value-key['expected'])<=key['absoluteTolerance']
for item in items.values():
    if item['type']=='numeric':
        key=item['grading'];assert accepted(key['expected'],key)
        assert not accepted(float('nan'),key) and not accepted(float('inf'),key)
        assert not accepted(key['expected']+max(1,10*key['absoluteTolerance']),key)
print(json.dumps({'arithmetic_and_gradient_assertions':checks,'numeric_keys':len(expected),'python_fences':snippets,'gradient_comparisons':gradient_comparisons,'max_gradient_error':max_gradient_error,'broken_engines_rejected':negative_controls},indent=2))
