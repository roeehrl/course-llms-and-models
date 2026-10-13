#!/usr/bin/env python3
"""Private, CPU-only authoring/verification adapter. No learner code is executed.

--write writes ONLY the two assigned JSON files. Default runs independent checks
and released-SDK validation in memory. --generate ID emits a server-only artifact;
--verify reads one artifact on stdin and returns a check report, NOT a receipt.
--reference reads {templateId, variables} and returns a number for a trusted port.
Python standard library; Node is used solely for installed SDK 0.2 public APIs.
"""
import argparse
import ast
import copy
import datetime
import hashlib
import itertools
import json
import math
import pathlib
import random
import statistics
import struct
import subprocess
import sys
from fractions import Fraction as F

ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION = '0.1.0'
REVIEWED = '2026-10-12T21:00:00Z'
GENERATOR = 'ada-approved-bank'
VERIFIER = 'ada-independent-checks'
EXTENSION = 'ada-authoring-cpu'
SOURCE = 'ada-src-reviewed-bank'
CHECKS = ['canonical-scope', 'approved-content', 'independent-answer', 'negative-controls', 'privacy-shape']
FRAGMENTS = ['foundations', 'training-and-transformers', 'systems-and-distribution', 'engineering-practice']
NUMERIC = {}
CHOICE = {}


def numeric(key, prompt, values, expression, anchor, explanation, transfer, bounds=None):
    """Expression is author input, translated to a closed SDK AST; never eval'ed."""
    NUMERIC[key] = dict(prompt=prompt, values=values, expression=expression, anchor=anchor,
                        explanation=explanation, transfer=transfer, bounds=bounds or {})


def choice(key, prompt, correct, distractors, reason, transfer):
    assert len(distractors) == 3
    CHOICE[key] = dict(prompt=prompt, correct=correct, distractors=distractors,
                       reason=reason, transfer=transfer)


# Every new numerical task changes the reasoning operation, not only the constants.
numeric('01-01', 'Two deployments run p(x)=w*x+b. A uses w=2,b=-1. B uses w=2+{{dw}},b=-1+{{db}}. At x={{x}}, how much must you ADD to B\'s bias so both deployments agree on this input? Keep both slopes fixed. Enter one signed number.',
        dict(dw=2, db=3, x=4), '-(dw*x+db)', -11,
        'Match the outputs by cancelling the slope-induced change and the existing bias change; this repairs one input, not the whole function.', 'Invert a parameter/output comparison to find a compensating parameter change.', dict(dw=(1,3),db=(2,5),x=(2,6)))
numeric('01-02', 'A scalar state starts at w={{w}}. A completed backward pass stores g={{g}} but does not update w. The optimizer then executes w <- w-eta*g once, with eta=1. A second backward pass stores g=99, and execution stops before another optimizer call. What value of w belongs in a checkpoint at this boundary?',
        dict(w=8,g=3), 'w-g', 5, 'Only the completed optimizer call changes the parameter. The second gradient is pending state, not a second update.', 'Trace an interleaved backward/update/checkpoint sequence.', dict(w=(7,11),g=(2,4)))
numeric('01-03', 'Token IDs are cedar=0, birch=1, stop=2. A model returns probability rows [[0.05,0.90,0.05],[0.70,0.20,0.10]] for input IDs [0,1]. Greedy generation must read the LAST row, append its winning ID, then stop without another model call. Return the sum of IDs in the resulting three-token sequence.',
        {}, None, 1, 'The last row selects ID 0; the sequence is [0,1,0]. Reading the first row would append 1.', 'Trace row selection through the appended sequence rather than identify one maximum.')
numeric('01-04', 'A split toy network has h=w*x, p=v*h and L=(p-y)^2/2. For x={{x}},w={{w}},v={{v}},y={{y}}, the second stage sends the correct scalar dL/dh. The first stage must still finish its chain rule. What dL/dw must it produce? No optimizer step occurs.',
        dict(x=2,w=3,v=-2,y=1), '(v*w*x-y)*v*x', 52, 'The returned activation adjoint is (v*w*x-y)*v; the upstream parameter derivative additionally multiplies by x.', 'Consume a boundary gradient at the preceding stage, distinguishing activation and parameter payloads.', dict(x=(2,3),w=(2,4),v=(-3,-2),y=(1,2)))
numeric('02-01', 'A dense tensor has shape ({{b}},{{t}},{{d}}), with 2 bytes per element. A transpose VIEW shares its allocation. Making one contiguous copy of that view allocates another equally sized payload. Ignoring metadata and allocator padding, how many payload bytes are live while the original and copy both remain reachable?',
        dict(b=2,t=3,d=5), 'b*t*d*2*2', 120, 'The view adds no payload allocation; the original and materialized copy each own b*t*d elements.', 'Count live allocations, separating views from materialization.', dict(b=(2,3),t=(3,4),d=(4,6)))
numeric('02-02', 'A rank-two view uses element offset = base+i*{{s0}}+j*{{s1}}, with 4 bytes per element. Both (i,j)=(1,2) and (2,0) are valid. What is address(2,0) MINUS address(1,2), in bytes? The shared base offset is unspecified because it cancels.',
        dict(s0=1,s1=4), '(s0-2*s1)*4', -28, 'Subtract element offsets first, then scale by bytes per element. A stride is not a byte offset in this contract.', 'Compare two addresses in a noncontiguous view without relying on an absolute base.', dict(s0=(1,2),s1=(4,6)))
numeric('02-03', 'A=[[2,{{a}}],[0,3]] and B=[[1,4],[{{b}},-1]]. For C=A*B, enter C[0,0]+C[1,1], the trace of the product. Indices are zero based. Do not multiply corresponding entries elementwise.',
        dict(a=3,b=2), 'a*b-1', 5, 'The diagonal entries are 2+a*b and -3. Off-diagonal inputs can contribute to a product diagonal.', 'Compute a contraction followed by a diagonal reduction.', dict(a=(2,4),b=(2,5)))
numeric('02-04', 'All additions below round immediately to IEEE binary32, round-to-nearest ties-to-even. Let A=2^24. Compare left=(A+1)+1 with right=A+(1+1). Enter right-left as an exact integer; no compiler reassociation is allowed.',
        {}, None, 2, 'Each left-hand increment ties and rounds back to the even representable A. The right-hand inner sum is 2, so the final value is A+2.', 'Use rounding to diagnose associativity rather than repeat a subtraction example.')
numeric('03-01', 'Two scalar examples have residuals prediction-target equal to {{r}} and -{{r}}. The loss is their MEAN half-squared error. A debugging change doubles only the second residual. What is new loss minus old loss?',
        dict(r=2), '3*r*r/4', 3, 'Original loss is r^2/2. The changed two-example mean is 5*r^2/4; the increase is 3*r^2/4.', 'Reason about an uneven error change inside a mean objective.', dict(r=(2,4)))
numeric('03-02', 'The parameter w is reused: u=w*w, p=u+{{c}}*w, L=(p-{{y}})^2/2. Evaluate dL/dw at w={{w}}. Count both operand paths through w*w.',
        dict(w=2,c=3,y=4), '(w*w+c*w-y)*(2*w+c)', 42, 'The residual multiplies the complete local derivative 2*w+c; one shared leaf can receive several contributions.', 'Apply the chain rule through a reused parameter and a second direct path.', dict(w=(2,3),c=(2,4),y=(1,4)))
numeric('03-03', 'A scalar optimizer starts at w={{w}} with recorded gradient g={{g}}. It applies ordinary descent with learning rate 1/{{d}}. A second optimizer call intentionally uses the SAME recorded gradient without a new backward pass. Return w after the second call.',
        dict(w=2,g=3,d=4), 'w-2*g/d', .5, 'Each call subtracts g/d. Reusing a recorded gradient is a state transition, not recomputation at the new weight.', 'Distinguish the number of updates from the number of backward passes.', dict(w=(2,4),g=(2,5),d=(4,8)))
numeric('03-04', 'A held-out report covers {{n}} examples with mean loss {{m}}. Its first example has loss {{a}} and is removed because it was duplicated. What is the mean over the remaining {{n}} minus one examples? Use the weighted loss total, not a mean of means.',
        dict(n=4,m=5,a=2), '(n*m-a)/(n-1)', 6, 'Recover the original loss sum n*m, remove one loss, and divide by the remaining count.', 'Undo one contribution to a weighted evaluation aggregate.', dict(n=(3,5),m=(4,6),a=(1,3)))
numeric('04-01', 'A tape creates separate leaves x and y, then u=x*y, v=x*y as a SECOND multiplication node, z=u+v, and r=z+u. Even if x and y have equal values, identities remain separate. How many distinct nodes are reachable from r, including leaves and r?',
        {}, None, 6, 'The reachable identities are x,y,u,v,z,r. Repeated edges to u do not create nodes; the separately executed multiplication v does.', 'Separate structural sharing from two equal-valued computations.')
numeric('04-02', 'Let u=x*x and z=u*u+{{c}}*u, with x={{x}}. In a reverse pass, what TOTAL adjoint must accumulate at the intermediate u before its multiplication is differentiated? Report dz/du, not dz/dx.',
        dict(x=3,c=2), '2*x*x+c', 20, 'The two operand slots of u*u contribute u each, and the other consumer contributes c.', 'Inspect an internal fan-out accumulator rather than only the final leaf gradient.', dict(x=(2,4),c=(1,3)))
numeric('04-03', 'A logical batch has {{n}} examples with mean gradient {{g}}. One microbatch contains {{k}} of those examples and has mean gradient {{a}}. What SUM of per-example gradients must the remaining examples contribute? No update occurs between microbatches.',
        dict(n=6,g=3,k=2,a=-1), 'n*g-k*a', 20, 'The complete gradient sum is n*g and the known microbatch sum is k*a. Subtract sums, not means.', 'Infer a missing microbatch contribution from a logical-batch contract.', dict(n=(6,8),g=(2,4),k=(2,3),a=(-2,-1)))
numeric('04-04', 'At x={{x}}, u=x*x and z=u+x. backward(root,seed) clears ALL adjoints before propagation. Call backward(z,3), then backward(u,2), without changing x. Return x.grad after the second call only.',
        dict(x=-3), '4*x', -12, 'The second call differentiates 2*u and discards the first call\'s adjoints. Its derivative is 2*(2*x).', 'Change both root and seed on a reused graph to expose stale adjoints.', dict(x=(-4,-2)))
numeric('05-01', 'A scalar two-unit MLP at x={{x}} has h0=ReLU(2*x-1), h1=ReLU(-x-1), p=3*h0+2*h1, L=(p-{{y}})^2/2. What is dL/dx? All approved inputs keep both preactivations away from zero.',
        dict(x=2,y=1), '(3*(2*x-1)-y)*6', 48, 'For positive x here h0 is active and h1 inactive. The output sensitivity is 3*2; multiply by the residual.', 'Differentiate the input through active and inactive hidden branches.', dict(x=(2,4),y=(1,3)))
numeric('05-02', 'A scalar stack applies x1=x0+F1(x0), x2=x1+F2(x1), where F1(x)=x/{{a}} and F2(x)=-x/{{b}}. At x0=1, enter dx2/dx0. The skip paths remain present in BOTH blocks.',
        dict(a=2,b=4), '(1+1/a)*(1-1/b)', 1.125, 'Compose complete block sensitivities, including each identity path; the two residual branches have different signs.', 'Transfer residual sensitivity to unequal blocks instead of a repeated identical branch.', dict(a=(2,4),b=(3,5)))
numeric('05-03', 'Momentum uses m_new=(1/2)*m_old+g and w_new=w_old-(1/4)*m_new. Start w=3,m={{m}}. Use gradient {{g}} on step one and gradient zero on step two. Return w after BOTH updates; momentum is retained.',
        dict(m=2,g=3), '3-(m/2+g)/4-(m/2+g)/8', 1.5, 'The first moment is m/2+g; the second is half that despite zero new gradient, so both steps move w.', 'Trace optimizer memory through a zero-gradient step.', dict(m=(2,4),g=(2,4)))
numeric('05-04', 'A bias-only regressor predicts w, with loss (w-y)^2/2 and learning rate 1/2. Start w={{w}}. Recompute and clear gradients each step. First train on y={{a}}, then on a DIFFERENT example y={{b}}. Return w after step two.',
        dict(w=0,a=4,b=-2), '((w+a)/2+b)/2', 0, 'Each update averages the old weight and that step\'s target. The second residual must use the new weight and new example.', 'Trace changing data across iterations to discriminate stale gradients and stale batches.', dict(w=(0,2),a=(3,5),b=(-3,-1)))
numeric('06-01', 'Embedding lookup IDs are [{{id}},0,{{id}}]. The scalar coordinate under inspection receives upstream derivatives [3,-2,5]. The embedding gradient buffer starts at zero. How much larger is the correct derivative for row {{id}} than a buggy last-write-wins scatter\'s derivative? IDs {{id}} and 0 are distinct.',
        dict(id=2), None, 3, 'The repeated row receives 3+5; last-write-wins keeps only 5. Their difference identifies the lost occurrence.', 'Compare accumulation and overwrite semantics in a repeated-token scatter.')
numeric('06-02', 'Vocabulary logits are [1000+ln(2),1000+ln(3),1000+ln(5)]. The target is ID 2, zero based. Return the natural-log cross-entropy WITHOUT exponentiating the large common offset. Enter a decimal accurate to 1e-6.',
        {}, None, math.log(2), 'Subtracting the common offset leaves masses 2,3,5. Target probability is 5/10; loss is ln(2).', 'Use shift invariance to evaluate an overflow-prone logit vector.')
numeric('06-03', 'A packed loss report has three valid token losses 1,2,{{x}} and two padded entries with loss 100 each. The desired mean is over valid tokens. A bug divides the valid loss sum by all five positions. Enter correct mean minus buggy mean.',
        dict(x=3), '(3+x)/3-(3+x)/5', .8, 'Both sums exclude padding, but only the correct denominator counts three valid tokens.', 'Isolate a denominator bug independently of masking the numerator.', dict(x=(2,5)))
numeric('06-04', 'An append-only KV cache has {{l}} layers, batch {{b}}, {{h}} KV heads, head width {{d}}, and 2 bytes per cached scalar. Both keys and values are cached. Its length grows from 5 to 8 tokens. How many ADDITIONAL payload bytes are needed, excluding allocation slack?',
        dict(l=3,b=2,h=1,d=4), '2*l*b*h*d*2*3', 288, 'Count two tensors times layers, batch, KV heads, width, bytes and the three new tokens; the old prefix is already allocated.', 'Compute incremental cache growth rather than total cache size.', dict(l=(2,4),b=(1,2),h=(1,2),d=(3,5)))
numeric('07-01', 'A bias-free attention module has D={{d}}, Q width {{q}}, K width {{q}}, and V width {{v}}. Its output projection maps width {{v}} back to D. If you omit ONLY the K projection from a parameter ledger, how many parameters are missing? Count scalar weights, not activations.',
        dict(d=6,q=4,v=3), 'd*q', 24, 'The missing matrix maps D inputs to q outputs, so it has D*q entries regardless of sequence length or the other widths.', 'Audit a partially complete projection ledger.', dict(d=(5,7),q=(3,5),v=(2,4)))
numeric('07-02', 'An attention row has unnormalized masses [2,3,5] and scalar values [4,-2,100]. The third key is masked BEFORE softmax. Enter the output minus the output from a bug that normalizes all three masses but then zeros the third contribution without renormalizing.',
        {}, None, .2, 'Correct weights are [2/5,3/5,0] and output 2/5. The bug uses [2/10,3/10,0] and output 1/5.', 'Separate masked normalization from zeroing a weighted value after normalization.')
numeric('07-03', 'Hold model width D={{d}}, query heads Hq=4 and head width 2 fixed. Change KV heads from 4 to 1, retaining Q and output projections unchanged. There are no biases. How many projection parameters are SAVED by this grouped-query change?',
        dict(d=8), 'd*2*2*(4-1)', 96, 'Only K and V shrink: each saves D*head_width*(4-1) entries.', 'Compare two head-sharing configurations rather than recount one complete module.', dict(d=(6,10)))
numeric('07-04', 'A decoder ties its token embedding and output vocabulary matrix: one V by D parameter allocation serves both roles. V={{v}},D={{d}},T={{t}}. Learned position embeddings have T by D entries. Other weights are unaffected. A ledger mistakenly counts a separate vocabulary output matrix. How many parameters does it overcount?',
        dict(v=7,d=3,t=5), 'v*d', 21, 'Tied use does not create a second allocation. The positional table remains independently counted.', 'Audit parameter identity and tying within a decoder ledger.', dict(v=(6,9),d=(2,4),t=(4,6)))
numeric('08-01', 'For p=w*x and half-squared loss, w={{w}}. Backward on (x=2,y=1) runs first. Then the gradient is explicitly cleared. Backward on (x=3,y=2) runs TWICE with fresh forward graphs but no intervening clear or optimizer call. Return the final w.grad.',
        dict(w=2), '2*(3*w-2)*3', 24, 'The first gradient is erased. The two later gradients are both computed at the unchanged w and accumulate.', 'Track a clear boundary in a multi-backward sequence.', dict(w=(2,4)))
numeric('08-02', 'A synthetic asynchronous trace is: previous work completes at t=11ms; measured launch starts t=14ms; CPU submission ends t=16ms; measured device work completes t={{end}}ms. Synchronization before t=14 has already finished. How many milliseconds does submission-only timing UNDERREPORT the measured interval?',
        dict(end=29), 'end-16', 13, 'Correct elapsed time is end-14; submission time is 2. Their difference is end-16.', 'Compute the bias in a timing method instead of quoting one elapsed interval.', dict(end=(25,32)))
numeric('08-03', 'A lazy scalar training graph represents L=(w*x-y)^2/2 at w={{w}},x=2,y=1. The planned descent step has eta=1/4. Before materialization, host code changes an unrelated scalar variable named w to 99; the graph captured the ORIGINAL numeric value. Once evaluated, what updated parameter value does this graph produce?',
        dict(w=3), 'w-(2*w-1)*2/4', .5, 'Differentiate and update the captured graph value. Rebinding an unrelated host variable does not rewrite the captured mathematical graph.', 'Distinguish captured computation state from a later host-language binding.', dict(w=(2,5)))
numeric('08-04', 'A frozen bias-free matrix has shape ({{o}},{{i}}). An adapter uses B of shape (out,r) and A of shape (r,in). Compare rank 2 with rank 3, both with no other trainable weights. How many ADDITIONAL trainable scalars does rank 3 introduce?',
        dict(o=5,i=7), 'o+i', 12, 'Increasing rank by one adds one column of B and one row of A.', 'Reason about a marginal adapter-budget change.', dict(o=(4,7),i=(6,9)))
numeric('09-01', 'A one-dimensional dispatch rounds a length-{{n}} array up to full threadgroups of width 8 and guards accesses with i<n. If a bug removes the guard, how many launched threads would index outside the array? N is positive and is not a multiple of eight.',
        dict(n=25), None, 7, 'Four groups launch 32 threads; indices 25 through 31 are invalid.', 'Connect padded launch coverage to concrete out-of-bounds accesses.')
numeric('09-02', 'Synthetic square matrix multiply uses N=8, float32 elements, no cross-tile reuse, and exact divisibility. Every output tile loads an A and B tile for every K tile and writes C once. Compare output tile widths 2 and 4. How many payload bytes does width 4 SAVE? Ignore caches, transaction overhead and partial tiles.',
        {}, None, 1024, 'Width 2 reads 512 scalars and width 4 reads 256; both write 64. The saved 256 reads occupy 1024 bytes.', 'Compare traffic models across tile sizes while cancelling common writes.')
numeric('09-03', 'Two unfused stages materialize an intermediate with shape ({{r}},{{c}}), 4 bytes per element. A fused path removes the intermediate write and later read, but additionally reads a separate r-element bias vector once. Count that entire new bias read. What is NET payload bytes saved under this explicit traffic model?',
        dict(r=4,c=5), '2*r*c*4-r*4', 144, 'Remove two full intermediate traversals and subtract the stated extra bias-vector traffic. This is a traffic estimate, not a speedup claim.', 'Account for an extra fusion cost instead of assuming all removed traffic is net saving.', dict(r=(3,5),c=(4,6)))
numeric('09-04', 'A hypothetical memory budget is {{p}} GiB physical with {{o}} GiB reserved for the OS/other processes. Parameters, gradients and optimizer state together occupy {{s}} GiB. Activations need 7 GiB but checkpointing reduces them to 3 GiB. After that change, how much usable headroom remains? Use GiB consistently and ignore allocator overhead.',
        dict(p=32,o=8,s=18), 'p-o-s-3', 3, 'Subtract the reserve and all live state including the new activation amount from physical capacity.', 'Evaluate a mitigation against the complete live-memory budget.', dict(p=(32,36),o=(7,9),s=(16,19)))
numeric('10-01', 'Two replicas each report a mean gradient: replica A has {{a}} examples with mean 2; replica B has {{b}} examples with mean -1. The correct logical-batch gradient is their sample-weighted mean. What TOTAL gradient sum, before division by the total example count, should the merge use?',
        dict(a=3,b=2), '2*a-b', 4, 'Recover each local gradient sum by multiplying its mean by its example count, then add.', 'Recover merge numerators from local means before any normalization.', dict(a=(3,5),b=(1,3)))
numeric('10-02', 'A forward-only pipeline has {{s}} equal stages, each taking {{t}} ms per microbatch, no communication overhead and no overlap inside one stage. Sending {{m}} microbatches together takes fill plus drain time. How many milliseconds are SAVED compared with sending those microbatches strictly one at a time through all stages?',
        dict(s=3,t=2,m=4), '(m*s-(m+s-1))*t', 12, 'Serial time is m*s*t; pipelined time is (m+s-1)*t. This toy schedule excludes backward and communication.', 'Compare schedules with the same work rather than report one pipeline latency.', dict(s=(3,5),t=(2,4),m=(3,6)))
numeric('10-03', 'Historical-rule exercise only: score(r)=clamp(r^1.5,0.2,4). Compare ratios r=4 and r=1. Return the larger-ratio score minus the smaller-ratio score after clamping. This is not a current fleet reward claim.',
        {}, None, 3, 'The raw scores are 8 and 1; the upper bound changes 8 to 4. Their clamped difference is 3.', 'Exercise the opposite clamp boundary and a comparison rather than the historical lower-bound example.')
numeric('10-04', 'Synthetic outer update: old weight w={{w}}, two local weights w-1 and w-3. Form g as the mean of old-minus-local pseudo-gradients. Start momentum m=2, update m_new=(1/2)*m+g, then use Nesterov direction g+(1/2)*m_new with learning rate 1/4. Return new weight. No local dataset weighting is implied.',
        dict(w=10), 'w-(2+(2/2+2)/2)/4', 9.125, 'The pseudo-gradients are 1 and 3, mean 2; new momentum is 3 and direction 3.5. The outer update uses those states once.', 'Separate local deltas, persistent momentum and outer learning rate.', dict(w=(8,12)))
numeric('11-01', 'A synthetic supervisor deadline is t={{deadline}}s after spawn. The executable starts at t=2, readiness succeeds at t={{ready}}, and admission succeeds at t={{admit}}. How many seconds of deadline margin exist at ADMISSION? Neither process creation nor readiness is admission.',
        dict(deadline=20,ready=9,admit=16), 'deadline-admit', 4, 'Measure the requested milestone against the same deadline; earlier milestones do not establish admission.', 'Compare a later lifecycle milestone against a timeout budget.', dict(deadline=(20,24),ready=(8,10),admit=(15,18)))
numeric('11-02', 'A synthetic 20-block model is split at half-open boundaries [0,{{h}}), [{{h}},{{t}}), [{{t}},20). Blocks execute once in increasing order. If the middle process and tail process are combined, how many block invocations does their combined forward perform? Embeddings and output heads are not counted as blocks.',
        dict(h=6,t=15), '20-h', 14, 'The adjacent half-open intervals concatenate to [h,20); their internal split point contributes no extra block.', 'Compose adjacent partitions without double-counting the shared boundary.', dict(h=(4,7),t=(13,16)))
numeric('11-03', 'Synthetic trace contract: accept unique successful backward IDs, update after every THREE, and clear the pending count after each update. Rejected IDs and duplicates never count. Events: accept A, accept B, reject C, duplicate A, accept D, accept E, accept F, duplicate F, accept G, accept H. How many optimizer updates occur?',
        {}, None, 2, 'Unique accepted IDs are A,B,D,E,F,G,H: seven successes form two complete windows and leave one pending.', 'Count completed windows rather than the residual, including duplicates across the update boundary.')
numeric('11-04', 'Synthetic monotonic timestamps in seconds: spawn=2, registration=7, forward completed=13, backward completed={{b}}, upload acknowledged={{u}}. What is upload-acknowledgment time minus backward-completion time? Treat this as an event interval; it does not measure GPU execution or credit.',
        dict(b=25,u=31), 'u-b', 6, 'Subtract the two named event timestamps. Upload acknowledgment still does not establish downstream acceptance or payment.', 'Choose the relevant subinterval inside an event timeline.', dict(b=(23,26),u=(30,34)))
numeric('12-01', 'Reference tensor is [10,-10,2,-2]; candidate is [{{a}},-{{a}},2,-2]. Signed sums agree. What is their maximum coordinatewise absolute error?',
        dict(a=13), 'abs(a-10)', 3, 'The first two errors cancel in a signed sum but each has magnitude abs(a-10). Coordinate comparison preserves this failure.', 'Construct and quantify a cancellation counterexample to aggregate validation.', dict(a=(12,15)))
numeric('12-02', 'A row-major 2 by 3 tensor contains [0,1,2,3,4,5]. Its correct transpose, flattened row-major as shape 3 by 2, is [0,3,1,4,2,5]. A bug changes only the shape metadata and returns the original flat order. How many output coordinates disagree?',
        {}, None, 4, 'Only the first and last coordinates match; comparing explicit coordinates exposes the missing permutation.', 'Use a nonsquare transpose where shape and order errors cannot hide behind equal dimensions.')
numeric('12-03', 'One microbatch contains {{n}} examples, each with gradient 2. Another contains ONE example with gradient 8. A candidate averages the two microbatch means equally. Enter candidate gradient minus the correct example-weighted mean.',
        dict(n=3), '5-(2*n+8)/(n+1)', 1.5, 'The candidate reports 5; the reference weights all n+1 examples equally.', 'Vary a partition while holding per-example gradients fixed to expose normalization dependence.', dict(n=(2,5)))
numeric('12-04', 'A wholly synthetic incident log uses UTC: failed check at 2030-04-02T23:59:40Z; submission was disabled at 2030-04-03T00:01:10Z. How many seconds elapsed between those events? The date rollover is part of the question.',
        {}, None, 90, 'Twenty seconds remain before midnight, followed by seventy seconds after midnight.', 'Compute a containment interval across a date boundary without assuming a live incident.')
numeric('13-01', 'Two logit tiles represent masses [1,3] and [2,4]. A target has mass 3 in the first tile. Enter the true full-vocabulary negative log-likelihood MINUS the incorrect loss obtained by normalizing only the target\'s tile. Use natural logarithms.',
        {}, None, math.log(2.5), 'The full target probability is 3/10; the tile-local probability is 3/4. The loss difference is ln(10/4).', 'Quantify the optimism caused by tile-local normalization.')
numeric('13-02', 'RMS normalization y=x/r uses r=sqrt(mean(x_i^2)+epsilon), gamma=[1,1], x=[1,2], epsilon=0.5. For scalar objective L=y0+2*y1, return dL/dx0. Include the derivative through r; enter a decimal accurate to 1e-9.',
        {}, None, 1/(6*math.sqrt(3)), 'r=sqrt(3), sum(dy*x)=5, so dx0=1/r-5/(2*r^3)=1/(6*sqrt(3)). Nonzero epsilon prevents complete radial cancellation.', 'Differentiate the denominator with nonzero epsilon and two active coordinates.')
numeric('13-03', 'A preregistered comparison permits candidate error <= {{a}}*upstream_error+{{b}}. Observed candidate error is {{c}}, upstream error {{u}}. Enter candidate error minus its allowed bound. A positive number is a failure margin; a nonpositive number satisfies this one rule only.',
        dict(a=2,b=.001,c=.012,u=.004), 'c-(a*u+b)', .003, 'Compute the permitted bound before subtracting; do not retune it after seeing the candidate.', 'Report a signed violation margin instead of only computing a threshold.', dict(a=(2,3),b=(.001,.002),c=(.012,.018),u=(.003,.004)))
numeric('13-04', 'A serial reference run spends {{c}} seconds in the optimized computation and {{o}} seconds elsewhere. The new computation is twice as fast BUT adds {{h}} seconds of setup on the measured path. Return full-run speedup old_time/new_time.',
        dict(c=24,o=16,h=2), '(c+o)/(c/2+o+h)', 4/3, 'The new denominator includes both unchanged work and the extra setup; kernel-only speedup is not full-run speedup.', 'Include a newly introduced cost in an end-to-end performance model.', dict(c=(20,28),o=(14,18),h=(2,4)))
numeric('14-01', 'Read this specification literally: y_i=gamma_i*x_i/sqrt(mean(x_j*x_j)+epsilon)+beta_i. For x=[0,4],gamma=[2,3],beta=[1,-2],epsilon=1, return y1 (the second coordinate). Epsilon is INSIDE the square root.',
        {}, None, 2, 'The mean square is 8, denominator 3, and second affine output is 3*4/3-2=2.', 'Translate normalization, per-coordinate gain and offset from a specification.')
numeric('14-02', 'Matched benchmark pairs (reference,candidate), in milliseconds, are (80,72),(100,95),(120,96). Compute each pair\'s PERCENT reduction relative to its own reference, then report the median of those three percentages, as a number such as 12 for 12%.',
        {}, None, 10, 'The paired reductions are 10%,5%,20%; their median is 10%. Do not ratio medians or mix reference runs.', 'Change the statistic to a paired relative reduction while preserving pairing.')
numeric('14-03', 'A strictly serial toy job computes for {{c}} seconds, sends 150 decimal MB over a sustained 100 Mbit/s link, and performs {{o}} seconds of other work. A compression pass costs 1 second and halves ONLY the payload size. What is the net reduction in total wall time, in seconds? No overlap or protocol overhead is assumed.',
        dict(c=5,o=3), '150*8/100-(1+75*8/100)', 5, 'Original transfer time is 12 seconds; compression plus transfer costs 1+6. Unchanged compute and other work cancel.', 'Compare a communication optimization including its computation cost.', dict(c=(4,7),o=(2,4)))
numeric('14-04', 'For F(a,b)=a*a*b+sin(b), evaluate the directional derivative at (a,b)=(1,0) along direction (da,db)=({{da}},{{db}}). The direction is NOT normalized. Return grad(F) dot direction.',
        dict(da=3,db=-2), '2*db', -4, 'At this point dF/da=0 and dF/db=2. Dot with the supplied direction, retaining its sign and magnitude.', 'Defend a derivative with a directional probe rather than repeat a single partial derivative.', dict(da=(2,4),db=(-3,-1)))

# Correct alternatives are deliberately permuted when materialized. Explanations
# belong to server grading data, not the attempt prompt or starter code.
choice('01-01', 'A translation service gives different answers after a deploy. The checkpoint hash and tokenizer are unchanged, but the prompt now contains a glossary fetched from a database. What experiment best isolates the cause?',
       'Run both application versions with the same checkpoint, tokenized input and decoding settings; vary the glossary input separately.',
       ['Treat the new answer as proof that the checkpoint learned the glossary.', 'Compare only the size of the checkpoint files; identical sizes imply identical computations.', 'Delete the glossary and infer that any remaining difference must be a weight update.'],
       'Control input and decoding as well as parameter state. File size and an output difference do not identify a training event.', 'Design a controlled experiment across the model/application boundary.')
choice('01-02', 'An encoder is frozen but a small classifier on top is trained. Its optimizer checkpoint contains classifier momentum. After training, the team discards only momentum and runs predictions with the saved classifier weights. Which description is accurate?',
       'The classifier was trained; ordinary inference can use its learned weights without the training momentum, although exact training resume would need that state.',
       ['Discarding momentum restores the untrained classifier.', 'The frozen encoder must have changed because the classifier learned.', 'Inference has to perform a backward pass to reconstruct momentum.'],
       'Training state and learned parameter state serve different purposes. A frozen submodule does not prevent another submodule from learning.', 'Distinguish inference state from resumable optimizer state in partial training.')
choice('01-03', 'A tokenizer upgrade maps two token strings to swapped IDs. A model reuses the old embedding AND output vocabulary ordering. Which proposed test is most informative before declaring compatibility?',
       'Round-trip representative strings through the tokenizer and verify that each resulting ID still indexes the intended embedding and output-token row.',
       ['Check only that every ID remains below the vocabulary size.', 'Check only that the embedding matrix has the old shape.', 'Accept the upgrade if generated text is valid UTF-8.'],
       'Valid ranges, shapes and byte encoding do not establish semantic ID-to-row compatibility on either side of the model.', 'Test both input and output vocabulary interpretation after a remapping.')
choice('01-04', 'A hypothetical run log shows forward completion, backward completion, and a later signed receipt that names the same work ID as accepted. No accounting or payment record is available. What is the strongest supported statement?',
       'This work was computed and accepted according to the receipt; credit and payment remain unestablished.',
       ['Payment is established because acceptance follows backward.', 'The receipt proves every future job on the machine will be accepted.', 'Nothing beyond process creation is supported, even with the matching receipt.'],
       'Each evidence stage has its own scope. A matching acceptance receipt adds acceptance evidence but cannot establish absent accounting stages.', 'Use a stronger receipt without collapsing later evidence stages into it.')
choice('02-01', 'An operation expects [batch,time,feature]. A fixture uses batch=2,time=3,feature=1, with value 10*b+t. A port treats the first two axes as [time,batch]. Which check most directly detects the semantic error?',
       'Compare the value associated with each named (batch,time) coordinate and verify the output axis contract, using the unequal dimensions.',
       ['Compare only the number of elements, which is six in either interpretation.', 'Flatten both arrays and compare their sums.', 'Use a fixture filled with one constant so shape differences cannot distract.'],
       'Coordinate identity and unequal dimensions expose axis swaps; element counts, sums and constant values discard that information.', 'Construct a labeled nonsquare fixture instead of repairing an equal-length ambiguity.')
choice('02-02', 'A transposed tensor view shares storage with its base. A consumer promises to accept arbitrary strides but produces correct output only after callers materialize a contiguous copy. Which conclusion is justified?',
       'The copy is a useful discriminator: the consumer may be ignoring view strides, so test its promised contract on noncontiguous inputs.',
       ['The transpose operation must have changed every stored scalar incorrectly.', 'The copy proves the original view owned a separate corrupted allocation.', 'Correct contiguous results establish correctness for all strides.'],
       'A view changes indexing metadata without necessarily copying. Success after materialization narrows the likely defect but does not certify the general stride path.', 'Infer a likely indexing contract violation from a controlled materialization experiment.')
choice('02-03', 'For X shaped [batch,feature], a layer subtracts each example\'s feature mean. Batch and feature lengths happen to be equal in a smoke test. Which fixture better distinguishes the intended reduction?',
       'Use unequal axis lengths and rows with different means; check that each output row sums to zero.',
       ['Use a square all-zero matrix and compare output shape only.', 'Subtract one global mean and accept any result whose global sum is zero.', 'Reduce over batch and broadcast the result as long as broadcasting succeeds.'],
       'Row-wise centering constrains each example separately. Global sums and shape compatibility do not identify the reduced semantic axis.', 'Test a reduction using invariants at the correct semantic granularity.')
choice('02-04', 'A computation accumulates thousands of small terms. Converting only the final low-precision sum to float32 makes its displayed value look more precise. Which next test addresses the likely error source?',
       'Compare against a reference that accumulates in higher precision from the start; a final cast cannot recover increments already rounded away.',
       ['Count printed decimal digits and accept if enough are present.', 'Convert the final value twice to recover one lost bit per cast.', 'Assume accumulation error is impossible because each input is exactly representable.'],
       'Representable inputs can still lose contributions during repeated additions. Casting after the loss changes representation, not the lost arithmetic history.', 'Separate accumulator precision from output storage precision.')
choice('03-01', 'Model A has validation squared errors [0,0,0,16]; model B has [5,5,5,5]. The objective is mean squared error, while an operator also cares about the worst example. Which report respects both criteria?',
       'A has lower mean error (4 versus 5), while B has lower maximum error (5 versus 16); the preferred deployment needs the stated criterion.',
       ['A is better under every possible error criterion because its mean is lower.', 'B has lower mean error because its results are more consistent.', 'The mean objective guarantees an upper bound of 4 on every A error.'],
       'Averages and tails describe different properties. Optimizing the stated objective does not settle an unstated operational tradeoff.', 'Compare a concrete objective ranking with a conflicting tail ranking.')
choice('03-02', 'A derivative routine for L=(w*x-y)^2/2 accidentally uses abs(x) instead of x. Positive-x tests all pass. Which single new test most directly distinguishes the bug?',
       'Use x=-2,w=1,y=1 and compare the analytic derivative with a centered finite difference in w.',
       ['Use x=2,w=1,y=1 again with more printed digits.', 'Use x=0, so the wrong factor and the right factor agree.', 'Use any example with residual zero, so both routines return zero.'],
       'A negative input and nonzero residual isolate the missing sign: the correct gradient is 6 and the bug returns -6.', 'Choose a sign-sensitive counterexample rather than another magnitude-only test.')
choice('03-03', 'A training implementation changes from summed loss to mean loss over a fixed batch of eight, while retaining the same learning rate and no other optimizer state. What happens to a plain descent update computed at the same parameters?',
       'Its magnitude becomes one eighth; multiplying the learning rate by eight restores that one-step update.',
       ['Its magnitude grows eightfold; divide the rate by eight.', 'Its direction always reverses because averaging changes signs.', 'It is unchanged because sums and means rank examples identically.'],
       'Mean gradients divide summed gradients by the count. Matching a one-step scale does not imply equivalence for every stateful optimizer.', 'Reverse the sum/mean conversion and state the limited equivalence.')
choice('03-04', 'A team fits a standardizer using training plus validation examples, chooses a model on validation, and evaluates once on untouched test examples. Which repair best preserves validation as a model-selection estimate?',
       'Refit preprocessing using training data alone and redo selection using the untouched validation transforms from that fit.',
       ['Keep the leaked standardizer because it did not use labels.', 'Move the best validation examples into training after inspecting their losses.', 'Report the validation score as test performance because the test was untouched.'],
       'Data-dependent preprocessing can leak validation distribution information even without labels. Refit the entire selection pipeline at the proper boundary.', 'Identify leakage in an unsupervised preprocessing step.')
choice('04-01', 'An autodiff engine stores visited nodes in a set keyed by their numeric value. Two distinct leaves both equal 2 and feed different branches. What is the correct repair?',
       'Key traversal by node identity, preserving separate leaves and operand edges even when values are equal.',
       ['Add random noise to one leaf so the values differ.', 'Merge equal-valued leaves and split their gradient equally afterward.', 'Sort the leaves numerically before backward.'],
       'Equal values do not make two independent variables identical. Identity governs graph structure; randomness and sorting do not repair the dependency graph.', 'Transfer DAG identity to a concrete traversal-data-structure failure.')
choice('04-02', 'A trainer calls backward, logs the gradient, calls zero_grad, then calls step using that now-cleared buffer. The loss had been nonzero. Which diagnosis follows from these boundaries?',
       'The step no longer has the logged gradient; preserve it until the optimizer consumes it, then clear for the next accumulation window.',
       ['A nonzero loss guarantees the optimizer will reconstruct the gradient automatically.', 'Clearing gradients must reset the parameter to its initialization.', 'The correct repair is to call backward after every individual multiply during forward.'],
       'Backward creates gradient state and step consumes it. Clearing at the wrong boundary can erase valid work without changing the preceding loss.', 'Reason about a lost-gradient lifecycle rather than numeric update arithmetic.')
choice('04-03', 'A checkpointed block recomputes exactly the saved activation but its replay increments a running-statistics buffer a second time. Outputs and local gradients match the reference for this batch. Is the replay contract satisfied?',
       'No: replay also changed persistent side effects twice; preserve or suppress those effects so the later training state matches the original execution.',
       ['Yes: identical local gradients prove every later optimizer and model state will match.', 'Yes: persistent buffers are never part of training state.', 'No: checkpointing is invalid whenever it saves any memory.'],
       'Recomputation equivalence includes observable state transitions, not just one activation tensor. This is a side-effect failure even with matching local math.', 'Extend replay reasoning from randomness to persistent mutable buffers.')
choice('04-04', 'A repaired scalar engine passes a single-root test but fails when the same node appears twice in a seeded roots list with seeds 2 and -1. Which test/repair pair is appropriate?',
       'Accumulate both seed contributions at that node, and compare a fresh reverse pass with finite differences of the explicitly weighted root sum.',
       ['Deduplicate roots by keeping only the first seed and test an unweighted root sum.', 'Take the absolute value of seeds so cancellation cannot occur.', 'Cache the first backward result forever because the forward values did not change.'],
       'Root multiplicity contributes algebraically just like operand multiplicity. A weighted scalar objective supplies an independent numerical oracle.', 'Transfer accumulation to multiple seeded roots and cancellation.')
choice('05-01', 'A two-layer bias-free network has an elementwise square between its linear maps. A port replaces both maps and the square with their matrix product. Why can matching output shapes not justify this?',
       'The square is nonlinear; composing the matrices alone loses input-dependent nonlinear behavior even when dimensions agree.',
       ['All elementwise operations commute with arbitrary matrix multiplication.', 'Any two same-shaped functions must agree on every input.', 'Bias-free layers cannot represent any nonlinear function.'],
       'Only consecutive affine maps without an intervening nonlinearity collapse this way. Shape checking is necessary but does not establish functional equivalence.', 'Apply composition reasoning to a different nonlinearity.')
choice('05-02', 'A per-token feature normalization is evaluated on one sequence, then on a longer sequence with extra tokens appended. Earlier token vectors are unchanged. Which observation contradicts the claimed normalization axes?',
       'Earlier normalized token values change solely because the appended tokens alter the statistics.',
       ['Earlier normalized values remain the same within the declared numerical tolerance.', 'The output has one normalized vector per input token.', 'Two features of the same token interact through its normalization denominator.'],
       'Statistics for per-token normalization may depend on that token\'s features, not on added tokens. Causal attention is not part of this isolated normalization test.', 'Use sequence extension to probe normalization isolation.')
choice('05-03', 'Two adaptive-optimizer runs load identical weights and first/second moment arrays. One resumes the saved step counter; the other resets it to zero while keeping moments. Their next gradients match. Can next-step equality be assumed?',
       'No; step-dependent bias correction or schedules can differ, so restore the counter and all update-relevant state.',
       ['Yes; only the weight array affects every optimizer update.', 'Yes; equal moments make the step counter mathematically irrelevant to all adaptive optimizers.', 'No; identical weights prove the checkpoint was corrupt.'],
       'Counters can enter bias correction and schedules. Equal arrays alone are insufficient for a full optimizer-state transition contract.', 'Isolate a scalar state field omitted by a checkpoint.')
choice('05-04', 'A resumed training run restores weights, optimizer state and random-generator state but starts its data iterator at the beginning. The uninterrupted run continues mid-epoch. What should an exact-resume test do?',
       'Restore the data position/order too, then compare the next inputs and state transitions against the uninterrupted branch.',
       ['Compare only the first saved weight tensor and declare exact resume.', 'Shuffle until a similar final loss appears, without matching inputs.', 'Discard optimizer state because new data makes it unnecessary.'],
       'Exact continuation requires the same next work, as well as computation state. Similar loss is weaker evidence than a matched trajectory.', 'Find a checkpoint omission outside the model and optimizer arrays.')
choice('06-01', 'A vocabulary row appears at positions 0 and 3. A gather-based embedding forward is correct, but backward writes one gradient per row using assignment. Which held-out test best exposes the error?',
       'Give the repeated positions unequal, nonzero upstream vectors and compare their row sum with an independent scatter-add reference.',
       ['Use each token ID exactly once, so no row needs accumulation.', 'Set all upstream vectors to zero and compare the zero gradients.', 'Check only that the vocabulary gradient array has the right shape.'],
       'Repeated indices require summation. Unequal contributions reveal overwriting more reliably than unique or zero-gradient fixtures.', 'Design a gradient probe for sparse repeated-row updates.')
choice('06-02', 'A cross-entropy implementation returns different loss after adding the same large constant to EVERY logit. The target ID is unchanged. What is the most relevant diagnosis?',
       'It violates the required shift invariance; inspect stable log-sum-exp and target-logit subtraction together.',
       ['The target probability should intentionally depend on an arbitrary common offset.', 'The tokenizer must have changed its vocabulary solely because logits were shifted.', 'The correct repair is to normalize each logit independently into a probability.'],
       'A common logit shift cancels in softmax probabilities and cross-entropy. Stable evaluation preserves that mathematical invariance.', 'Use an invariance to localize a loss implementation defect.')
choice('06-03', 'Packed training concatenates two unrelated documents with a separator. Targets are shifted correctly, but attention from the second document can see tokens in the first. The data contract treats each document as an independent sample. What additional condition is needed?',
       'An attention mask must respect document boundaries as well as causal position, unless cross-document context is explicitly part of the objective.',
       ['A shifted target alone guarantees every attention edge is permitted.', 'Removing padding automatically blocks every cross-document attention edge.', 'The separator token physically prevents the attention matrix from containing cross-document scores.'],
       'Target shifting and attention visibility are distinct contracts. A token can signal a boundary semantically without enforcing a mask.', 'Transfer leakage reasoning to packed independent documents.')
choice('06-04', 'A service reuses a cached prefix after changing only the position indices assigned to that prefix, with model weights and token IDs unchanged. Can matching shapes justify reuse?',
       'No; position-dependent transformations can change the cached keys/values, so cache identity must include the relevant positional convention.',
       ['Yes; token IDs alone determine every possible cache tensor.', 'Yes; cache reuse is safe whenever head width matches.', 'No; caches are invalid even for an identical prefix under identical state.'],
       'Cache validity is a semantic identity question. Relevant positions, weights, tokens and conventions must match, not only tensor dimensions.', 'Change positional state instead of model weights in a cache invalidation test.')
choice('07-01', 'A shared input X feeds Q=XWq, K=XWk and V=XWv. A backward port returns only the Q branch contribution to dX but all three weight gradients look plausible. Which repair is required?',
       'Sum the three input-adjoint contributions at X; verify the combined result with a scalar-loss input perturbation.',
       ['Average the three branch derivatives because there are three projections.', 'Use whichever branch has the largest gradient norm.', 'Leave dX unchanged because the separate weight gradients determine it automatically.'],
       'The shared input has three downstream consumers; the chain rule adds their contributions. Independent weight gradients do not repair missing input paths.', 'Use a shared-input perturbation to validate projection-gradient composition.')
choice('07-02', 'An attention backward test sets every value vector equal. Q/K gradients are zero and both candidate and reference agree. What should a stronger next fixture change?',
       'Use unequal values and a loss sensitive to their mixture, with nonuniform scores and at least two unmasked keys.',
       ['Keep equal values and compare more zero Q/K gradients.', 'Mask all but one key, which forces the mixture to one value.', 'Remove the loss dependency on the attention output.'],
       'Equal values make the output insensitive to probability redistribution. A discriminating fixture must create that dependency before judging score gradients.', 'Recognize a degenerate gradient test from the computation itself.')
choice('07-03', 'A rotary-position port rotates Q at position p but rotates every K using position zero. A same-position smoke test at p=0 passes. Which test targets the missing convention?',
       'Use nonzero, differing query/key positions and compare dot products with an explicit paired-rotation reference.',
       ['Test only position zero on longer vectors.', 'Check that rotation preserves the length of each vector and stop there.', 'Replace every Q and K with zeros to avoid floating-point error.'],
       'Norm preservation alone does not establish the relative-position dot products. Nonzero, distinct positions expose an omitted K rotation.', 'Test relative-position semantics beyond a position-zero identity case.')
choice('07-04', 'A tiny decoder passes a test that changing a future token leaves earlier logits unchanged. It also produces identical logits for every possible prefix. What additional check prevents a vacuous causality pass?',
       'Require a chosen earlier-token perturbation to affect a later logit in a reference-matched fixture, while future-to-past changes remain blocked.',
       ['Declare the constant-output decoder correct because causality passed.', 'Require future tokens to change earlier logits, reversing the causal contract.', 'Check only that the logits array has the requested length.'],
       'Causality forbids a dependency; a complementary sensitivity test establishes intended allowed dependencies and rejects a disconnected model.', 'Pair an invariance test with a positive sensitivity control.')
choice('08-01', 'A module replaces a registered parameter with a new parameter object AFTER constructing an optimizer. Forward uses the new object, but step still updates the old one. What should the diagnostic inspect?',
       'Compare parameter object identities in the module and optimizer groups, then rebuild or update groups to match the intended trainable objects.',
       ['Compare only parameter names, since names guarantee object identity.', 'Increase the learning rate until the new parameter moves indirectly.', 'Call forward twice so the optimizer discovers replacement objects automatically.'],
       'Registration and optimizer membership are separate stateful contracts. Replacing an object can leave a stale optimizer reference despite matching names.', 'Transfer parameter-registration reasoning to optimizer ownership after replacement.')
choice('08-02', 'Benchmark A warms up outside the timer and synchronizes the measured call. Benchmark B includes compilation and allocation in its first measured call. Both numbers are correct for their timers. What comparison is defensible?',
       'Label the different measured scopes; run a matched warm or cold protocol before attributing their difference to execution speed.',
       ['Choose the smaller number and call it a universal hardware speedup.', 'Subtract an arbitrary constant for compilation until the rankings agree.', 'Treat synchronization as unnecessary because both programs eventually finish.'],
       'Timing correctness and scope comparability are separate. A cold-start cost may matter, but it must be compared under a stated common protocol.', 'Compare warm versus cold measurement scopes without dismissing either.')
choice('08-03', 'A lazy training loop constructs several update expressions but only evaluates a loss node that depends on the OLD parameters. Its timer ends there. What evidence is missing?',
       'Materialization of the updated parameters and any required optimizer state on the measured dependency path.',
       ['Proof that constructing an expression consumed exactly as much time as executing it.', 'A second variable name for the old loss, which would force every unrelated node.', 'Nothing: evaluating any node necessarily evaluates every graph ever constructed.'],
       'Demand-driven execution follows dependencies, not all created expressions. The measured output must require the work whose completion is claimed.', 'Identify an evaluated output that does not depend on the claimed update.')
choice('08-04', 'An adapter uses deltaW=B*A. A is initialized nonzero and B to zero. On the first data-gradient step, which statement follows for ordinary matrix differentiation, assuming a nonzero relevant upstream gradient?',
       'B can receive a nonzero gradient immediately, while A\'s data gradient is zero until B moves.',
       ['Both factors must always receive zero gradients because the initial deltaW is zero.', 'A alone can move because it started nonzero.', 'The frozen base matrix must be unfrozen before B can receive any derivative.'],
       'The pullback to A contains B, whereas the pullback to B contains A. A zero product need not imply zero gradients for both factors.', 'Analyze a valid asymmetric initialization instead of only rejecting two zero factors.')
choice('09-01', 'A threadgroup reduction has a barrier after loading shared memory. An out-of-range lane returns before the barrier; other lanes in the SAME group continue. What is the appropriate repair under a group-wide barrier contract?',
       'Let every lane reach the barrier, and have inactive lanes contribute the operation\'s neutral value without accessing invalid input.',
       ['Replace the bounds predicate with a device-wide barrier inside only the active lanes.', 'Assume invalid lanes cannot affect valid lanes because they produce no output.', 'Have active lanes skip the barrier too while still reading shared memory written by peers.'],
       'Control flow around a collective barrier must preserve participating-lane agreement. Neutral values separate data validity from synchronization participation.', 'Diagnose a tail-lane synchronization failure from a concrete control-flow pattern.')
choice('09-02', 'A tile change reduces modeled global loads, but a measured matched kernel becomes slower. A register report rises and occupancy drops. What conclusion respects both observations?',
       'The traffic saving is real within its model, but another resource cost may dominate; inspect the resource/performance tradeoff under the same workload.',
       ['The runtime must be wrong because fewer modeled loads mathematically guarantee lower time.', 'Discard the traffic model as false solely because speed did not improve.', 'Claim a full-training speedup from the reduced load count alone.'],
       'A byte count is not a complete timing model. Resource pressure can counteract a traffic benefit without invalidating the original count.', 'Reconcile a traffic estimate with a conflicting controlled measurement.')
choice('09-03', 'A report says an operation used a high-level tensor API and therefore executed on a specific accelerator unit. No trace or selected-kernel record is included. What would substantiate that narrower hardware claim?',
       'Evidence of the actual dispatched implementation and execution path for the measured device/configuration, using an appropriate supported trace or diagnostic.',
       ['The tensor API\'s name alone, because every backend must choose the same unit.', 'The machine\'s total memory capacity, which identifies the dispatched unit.', 'A timing result from a different workload on a different device.'],
       'An API describes an interface, not necessarily the selected lowering or physical unit. Attribute the observed path at the measured configuration.', 'Specify missing evidence for a hardware attribution instead of inferring from branding.')
choice('09-04', 'A unified-memory machine has enough nominal capacity for model weights. Training still fails when gradients, optimizer state and temporary activations become live. Which capacity estimate was missing?',
       'The peak simultaneous live set, including other system use, optimizer/gradient state, temporaries and allocation overhead.',
       ['Only the checkpoint file\'s compressed byte size.', 'Only the largest single parameter tensor.', 'A guarantee that shared physical memory automatically eliminates all allocation limits.'],
       'Unified memory does not make the peak live set equal to saved weights or remove finite capacity. Estimate coexisting allocations at the peak.', 'Translate storage size into a realistic training-memory accounting question.')
choice('10-01', 'Two data-parallel replicas have equal parameter shapes but process unequal numbers of valid tokens because of padding. The objective is mean loss per VALID token. Which merge preserves that objective?',
       'Weight each replica\'s mean gradient by its valid-token count, then divide their sum by the total valid-token count.',
       ['Average the two means equally solely because there are two replicas.', 'Weight by padded tensor element count even when padding is excluded from loss.', 'Concatenate parameter gradients as if replicas held different model stages.'],
       'The reduction weight must match the loss denominator. Replica count, padding capacity and pipeline partitioning describe different contracts.', 'Transfer weighted reduction from examples to a masked-token objective.')
choice('10-02', 'A delayed backward message names an activation-cache key from model version V1. The process has moved to V2, whose tensors have identical shapes. What should route/cache handling establish before using it?',
       'The exact work/version identity and saved-forward-state contract; reject or route stale work according to the explicit protocol rather than shape matching.',
       ['Reuse any same-shaped activation in V2 because dimensions identify the sample.', 'Apply the gradient to the newest parameters and label it as V1 work.', 'Erase the work ID so downstream processes cannot detect the mismatch.'],
       'Shapes do not bind gradients to their forward sample or parameter version. Staleness handling is a protocol decision with explicit identity.', 'Handle delayed work across a version transition.')
choice('10-03', 'A receiver deduplicates retries by logical backward ID. One sender retries the same ID with identical payload three times and receives one acceptance receipt. Which counter is appropriate for unique accepted work?',
       'One; transmission attempts may be three, but deduplication and the receipt identify one accepted logical result.',
       ['Three, since every transmission is a new accepted computation.', 'Zero, since any retry invalidates the original computation.', 'One paid result, since acceptance necessarily includes payment.'],
       'Logical identity, attempt count and downstream accounting are separate. The receipt supports one acceptance only.', 'Reason from a receiver-side deduplication contract rather than sender logs alone.')
choice('10-04', 'A vector merge streams parameters in chunks to limit memory. One port divides each chunk\'s gradient by the number of chunks in addition to the intended replica normalization. What invariant should expose the defect?',
       'The merged mathematical update should be independent of chunk size for the same inputs and stated reduction order/tolerance.',
       ['Smaller chunks should intentionally shrink the full-vector update.', 'Only the first chunk matters because all chunks share a dtype.', 'Matching the total number of bytes read proves the optimizer update matches.'],
       'Chunking partitions implementation work; it is not an additional sample-count normalization unless explicitly defined as such.', 'Turn a chunking semantic error into a metamorphic test.')
choice('11-01', 'A synthetic launch log contains a child PID and an open listening socket, but its readiness response says dependencies are still loading. Which status is warranted?',
       'The process exists and listens, but application readiness has not yet been established.',
       ['The worker is admitted and accepted by the remote coordinator.', 'An open socket proves every dependency and model partition is usable.', 'No process exists because readiness is pending.'],
       'Process existence, transport availability, application readiness and remote admission are distinct lifecycle observations.', 'Interpret a partially ready process without over- or under-stating evidence.')
choice('11-02', 'A partition boundary serializes a compressed activation for transport while keeping a local saved tensor for backward. An optimization deletes the saved tensor and later substitutes the decompressed transport approximation. What needs qualification?',
       'Whether backward now uses exactly the required forward state and numerical convention; transport suitability alone does not establish backward equivalence.',
       ['Nothing, because any tensor with the same shape has identical derivatives.', 'Only network throughput, since the change cannot affect local math.', 'The number of log lines, which proves the saved values are equivalent.'],
       'The locally saved state and transport representation can serve different contracts. Replacing one with the other changes a numerical dependency.', 'Audit an attempted memory optimization at a transport/autodiff boundary.')
choice('11-03', 'A backward queue entry is popped for processing, but a retry can still request the forward state associated with its work ID. The cache entry is deleted immediately on pop. What failure can this cause?',
       'The work item\'s scheduling lifetime may end before the saved activation\'s required lifetime, leaving a valid retry without its forward state.',
       ['No failure: every queue pop proves all consumers have finished forever.', 'The deleted activation must automatically reappear from the gradient shape.', 'Keeping the ID string alone reproduces the original activation values.'],
       'Queue ownership and cache lifetime are related but not identical. Release must follow the complete consumer/retry contract.', 'Reason about resource lifetimes after dequeue rather than while queued.')
choice('11-04', 'A synthetic health endpoint returns HTTP 200 with body {"registered":false,"last_completed_work":null}. The client records only status=200 and displays active contribution. What is the defect?',
       'Transport success is being mistaken for semantic readiness/progress; inspect the body and stage-specific evidence before assigning that status.',
       ['HTTP 200 itself proves a backward result was accepted.', 'The empty progress field proves a payment already arrived.', 'The correct repair is to label every response a computation failure regardless of its body.'],
       'A successful HTTP exchange can report an unhealthy or idle application. Parse the declared semantics without inventing later-stage evidence.', 'Locate an observability bug in response handling.')
choice('12-01', 'A candidate attention gradient agrees with reference on the sum of every tensor, but one coordinate differs outside the fixed envelope. A downstream loss happens to match on this seed. What disposition follows?',
       'Keep the coordinate failure as a failed qualification result for this configuration; investigate the defect without replacing the fixed criterion with a sum test.',
       ['Pass because tensor sums are a stronger test than coordinates.', 'Pass because one downstream scalar erases all gradient differences.', 'Increase the envelope until this candidate passes, then describe it as preregistered.'],
       'Aggregate agreement can hide cancellation or nullspace differences. A failed required check is not overruled by a weaker coincidentally matching observable.', 'Evaluate conflicting weak and strong numerical evidence.')
choice('12-02', 'For a fixed value matrix V, two probability matrices P and P+Delta produce the same attention output because Delta*V=0. What follows about testing a probability implementation only through that output?',
       'The output test cannot identify all errors in P; inspect P directly or use additional discriminating V probes and backward checks.',
       ['The two probability matrices must be identical because their products agree.', 'The equality proves all Q/K gradients agree for every loss.', 'Increasing output print precision necessarily eliminates the nullspace.'],
       'A linear observation can lose information. Identical products for one V do not uniquely determine the factor or its derivative path.', 'Transfer gradient identifiability to an explicit forward nullspace.')
choice('12-03', 'A candidate requests the optimized path, but a startup check falls back before any optimized invocation. All subsequent comparisons pass. What should the evidence record?',
       'A successful reference/fallback run with zero candidate coverage; the candidate path remains unqualified.',
       ['A passed candidate qualification because the request flag was true.', 'A failed reference implementation despite its matching results.', 'A candidate speedup using the fallback timings under the candidate label.'],
       'Requested selection is not observed execution. Coverage evidence must establish the path actually tested.', 'Separate configuration intent from executed-path evidence.')
choice('12-04', 'Two historical snapshots differ in both kernel code and optimizer-state layout. Snapshot A fails a gradient check; snapshot B fails a resume check. What is the best incident account?',
       'Report each failure with its exact snapshot and check, preserve uncertainty about their causal relation, and design a controlled follow-up to separate the changes.',
       ['Describe both as one proven hardware defect without isolating either change.', 'Hide A because a later snapshot exists.', 'Treat a healthy average loss in B as retroactive proof that A\'s gradients were correct.'],
       'Multiple changed variables prevent a unique causal attribution. Preserve versioned observations rather than merge distinct failures into one story.', 'Write a causal account across differing historical configurations.')
choice('13-01', 'A tiled vocabulary loss computes a valid maximum for each tile but normalizes each tile separately before combining target loss. Which reference test addresses the missing global dependency?',
       'Move a large non-target logit into another tile and require the target loss to change according to one full-vocabulary log-sum-exp.',
       ['Test only examples where every other tile is empty.', 'Verify only that each tile\'s probabilities sum to one.', 'Keep all non-target logits at negative infinity so no other tile contributes.'],
       'Other tiles contribute to the global denominator even when the target lies elsewhere. Tile-local normalization can pass local invariants while failing the objective.', 'Design a cross-tile perturbation that must affect the target loss.')
choice('13-02', 'A memory-saving implementation retains a small view of a large activation allocation and reports only the view\'s element count as retained memory. What should the memory audit check?',
       'Whether the view keeps the whole backing allocation alive, plus the peak lifetime of recomputation temporaries.',
       ['Only the view\'s logical shape; backing storage is never retained by views.', 'Only the checkpoint file size on disk.', 'Assume recomputation always frees all activations immediately.'],
       'Logical tensor size is not necessarily owned or retained storage. Peak allocation lifetimes determine the actual memory effect.', 'Audit aliasing and liveness in a recomputation memory claim.')
choice('13-03', 'A qualification report is signed for artifact hash H1. A rebuild yields H2 after a compiler-flag change, with unchanged source and a passing quick smoke test. Can H1\'s full qualification be assigned to H2?',
       'No; retain the H1 result and run the required H2 qualification or a explicitly authorized equivalence process tied to the new artifact.',
       ['Yes, because source equality guarantees identical executable behavior under every compiler flag.', 'Yes, because any smoke test is interchangeable with the full required suite.', 'Yes, if the report filename is changed to H2 without rerunning anything.'],
       'Qualification attaches to the tested artifact and configuration. Compiler changes can change behavior despite unchanged source.', 'Handle a rebuilt artifact without laundering earlier evidence.')
choice('13-04', 'A benchmark harness is suspected of silently accepting fallback. Which negative control most directly checks that the harness can detect this false success?',
       'Deliberately force fallback in a local synthetic test and require the candidate-coverage assertion to fail while the fallback result remains correctly labeled.',
       ['Run only successful candidate cases and assume the failure path works.', 'Remove candidate-hit counters so fallback cannot be seen.', 'Increase the measured speedup threshold without checking execution identity.'],
       'A useful harness must fail when its required execution condition is deliberately violated. This tests the test rather than optimizing the kernel.', 'Design an executable negative control for the qualification harness.')
choice('14-01', 'A paper defines variance normalization by subtracting a mean; a port implements RMS normalization without centering. Both divide by a square root and produce the same shape. What should a source-to-code review do?',
       'Write both equations, identify the missing centering operation, and test a nonzero-mean vector before claiming the paper\'s operator was reproduced.',
       ['Treat both as identical because they contain a square root.', 'Use only a zero-mean vector and declare equivalence for all inputs.', 'Cite the paper\'s speedup as proof that the port implements its equation.'],
       'Similar names and shapes do not establish mathematical equivalence. A discriminating input follows directly from the equation difference.', 'Translate a source claim into a targeted distinguishing test.')
choice('14-02', 'Two benchmark conditions ran on different input sets and in opposite thermal states. A spreadsheet reports a favorable ratio of their average times. Which next experiment supports a causal comparison?',
       'Use matched inputs and controlled conditions with paired/interleaved runs, retain raw pairs, and report the predefined statistic and variability.',
       ['Drop slow candidate runs until the average stabilizes near the desired ratio.', 'Pair arbitrary runs only after sorting by speed.', 'Treat any ratio of means as proof that the implementation caused the difference.'],
       'Pairing and controlled conditions reduce confounding; retain the observations and prespecified analysis rather than selecting favorable samples.', 'Repair experimental design before trusting a summary statistic.')
choice('14-03', 'A controlled synthetic run has matching numerical checks and an upload acknowledgment, but no coordinator acceptance or accounting receipt. Which portfolio label is justified?',
       'Locally qualified for the tested configuration and uploaded; acceptance, credit and payment are not established by these records.',
       ['Paid production contribution, because numerical equality implies payment.', 'Accepted by the coordinator, because the network upload finished.', 'No numerical evidence at all, because the accounting receipt is absent.'],
       'Preserve the useful local qualification evidence while leaving unsupported operational stages open.', 'Combine strong local math evidence with incomplete external lifecycle evidence.')
choice('14-04', 'A portfolio contains a passed concept exam, a correct toy autodiff implementation, and a larger optimization with an unresolved optimizer-state mismatch. What should a defensible completion statement say?',
       'Credit the demonstrated concepts and toy implementation, and identify the larger optimization\'s unresolved qualification gate explicitly.',
       ['Certify all production training paths because two unrelated checks passed.', 'Erase the passed work because any later failure means nothing was learned.', 'Rename the unresolved probe optional after seeing it fail.'],
       'Evidence supports scoped claims. Independent achievements remain valid, but they do not satisfy an unpassed required gate elsewhere.', 'Write a calibrated final claim from mixed evidence rather than a binary success label.')


def reference_module():
    import importlib.util
    spec = importlib.util.spec_from_file_location('independent_recovery_reference', ROOT / 'verification/adaptation-reference.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# Decimal audit thresholds have an explicit finite domain. They are NOT exposed
# as a continuous/integer recipe through the generic creator.
NUMERIC['13-03']['discrete']={'b':[.001,.002],'c':[.012,.018],'u':[.003,.004]}


def bounded_expression(expression, names):
    """Translate only a small arithmetic AST. Never execute Python source."""
    tree = ast.parse(expression, mode='eval')
    nodes = 0
    def walk(node, depth=1):
        nonlocal nodes
        nodes += 1
        if nodes > 128 or depth > 16:
            raise ValueError('Expression bound exceeded')
        if isinstance(node, ast.Constant) and type(node.value) in (int, float) and math.isfinite(node.value):
            return {'type': 'constant', 'value': node.value}
        if isinstance(node, ast.Name) and node.id in names:
            return {'type': 'variable', 'name': node.id}
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return {'type': 'unary', 'operator': 'negate', 'value': walk(node.operand, depth + 1)}
        if isinstance(node, ast.BinOp) and type(node.op) in (ast.Add, ast.Sub, ast.Mult, ast.Div):
            operation = {ast.Add:'add', ast.Sub:'subtract', ast.Mult:'multiply', ast.Div:'divide'}[type(node.op)]
            return {'type':'binary','operator':operation,'left':walk(node.left,depth+1),'right':walk(node.right,depth+1)}
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
            if node.func.id == 'abs' and len(node.args) == 1:
                return {'type':'unary','operator':'abs','value':walk(node.args[0],depth+1)}
            if node.func.id in ('min','max') and len(node.args) == 2:
                return {'type':'binary','operator':node.func.id,'left':walk(node.args[0],depth+1),'right':walk(node.args[1],depth+1)}
        raise ValueError('Unsupported arithmetic syntax')
    return walk(tree.body)


def interpret(expression, values, depth=1):
    if depth > 16:
        raise ValueError('Expression nesting exceeded')
    kind = expression['type']
    if kind == 'constant':
        result = F(str(expression['value']))
    elif kind == 'variable':
        result = F(str(values[expression['name']]))
    elif kind == 'unary':
        value = interpret(expression['value'], values, depth + 1)
        result = -value if expression['operator'] == 'negate' else abs(value)
    elif kind == 'binary':
        a, b = interpret(expression['left'], values, depth+1), interpret(expression['right'], values, depth+1)
        op = expression['operator']
        result = {'add':lambda:a+b,'subtract':lambda:a-b,'multiply':lambda:a*b,'divide':lambda:a/b,'min':lambda:min(a,b),'max':lambda:max(a,b)}[op]()
    else:
        raise ValueError('Unknown expression node')
    if len(str(abs(result.numerator))) > 256 or len(str(result.denominator)) > 256:
        raise ValueError('Exact arithmetic bound exceeded')
    return result


def variable_space(task):
    variables = []
    for name, initial in sorted(task['values'].items()):
        lower, upper = task['bounds'].get(name, (initial, initial))
        if type(initial) not in (int,float) or not all(math.isfinite(x) for x in (initial,lower,upper)) or lower > upper or not lower <= initial <= upper:
            raise ValueError('Invalid authored variable bounds')
        integer = all(type(x) is int for x in (initial,lower,upper))
        if not integer and lower != upper and name not in task.get('discrete',{}):
            raise ValueError('Noninteger generation requires an explicit discrete domain')
        values = list(range(lower,upper+1)) if integer else task.get('discrete',{}).get(name,[initial])
        if len(set(values))!=len(values) or initial not in values or not all(type(x) in (int,float) and math.isfinite(x) and lower<=x<=upper for x in values):
            raise ValueError('Invalid discrete variable domain')
        if len(values) > 100:
            raise ValueError('Variable domain exceeds qualified limit')
        variables.append((name,values,{'name':name,'minimum':lower,'maximum':upper,'integer':integer}))
    total = math.prod(len(values) for _,values,_ in variables)
    if total > 10000:
        raise ValueError('Recipe space exceeds exhaustive qualification limit')
    return variables,total


def instantiate_values(task, ordinal):
    variables,total = variable_space(task)
    if type(ordinal) is not int or ordinal < 0 or ordinal >= total:
        raise ValueError('Recipe space exhausted')
    result = {}
    for name,values,_ in reversed(variables):
        result[name] = values[ordinal % len(values)]
        ordinal //= len(values)
    return result


def render_prompt(template, values):
    import re
    tokens = re.findall(r'\{\{([a-z][a-z0-9_]*)\}\}', template)
    if set(tokens) - set(values):
        raise ValueError('Unbound prompt variable')
    text = re.sub(r'\{\{([a-z][a-z0-9_]*)\}\}',lambda m:str(values[m.group(1)]),template)
    if len(text) > 6000 or '{{' in text:
        raise ValueError('Invalid generated prompt')
    return text


def course_base():
    course = json.loads((ROOT / 'content/course-config.json').read_text())
    for field in ('objectives','chapters','assessments','gates','sources','visuals','media','extensions'):
        course[field] = [entry for name in FRAGMENTS for entry in json.loads((ROOT / f'content/{name}.json').read_text())[field]]
    sources = {}
    for source in course['sources']:
        if source['id'] in sources and source != sources[source['id']]:
            raise ValueError('Conflicting source')
        sources[source['id']] = source
    course['sources'] = list(sources.values())
    return course


def bindings_for(course):
    import re
    result = {}
    for episode in [e for c in course['chapters'] for e in c['episodes']]:
        match = re.search(r'e(\d\d-\d\d)$',episode['id'])
        if not match:
            raise ValueError('Unexpected private episode identity')
        key = match.group(1)
        gate = next(g for g in course['gates'] if g['id'] == episode['gateId'])
        items = [a for a in course['assessments'] if a['id'] in gate['assessmentIds']]
        result[key] = {'episode':episode,'items':{kind:next(a for a in items if a['type']==kind) for kind in ('numeric','choice')}}
    if set(result) != set(NUMERIC) or set(result) != set(CHOICE):
        raise ValueError('Recovery tasks must cover all 56 episode bindings')
    return result


def generated_assessment(key, kind, canonical, ordinal=0):
    identity = f'ada-{key}-{kind}-{ordinal}'
    common = {'id':identity,'type':kind,'objectiveIds':copy.deepcopy(canonical['objectiveIds']),'familyId':canonical['familyId']}
    if kind == 'numeric':
        task = NUMERIC[key]
        values = instantiate_values(task,ordinal)
        expression = bounded_expression(task['expression'],set(values)) if task['expression'] else {'type':'constant','value':task['anchor']}
        exact = interpret(expression,values)
        answer = exact.numerator if exact.denominator == 1 else float(exact)
        common.update(prompt=render_prompt(task['prompt'],values),grading={'expected':answer,'absoluteTolerance':0 if type(answer) is int else 1e-9,'explanation':task['explanation']})
        return common,{'key':key,'kind':kind,'ordinal':ordinal,'variables':values,'templateId':f'ada-recipe-{key}'}
    if ordinal != 0:
        raise ValueError('Authored choice bank has no unseen ordinal; a new reviewed task is required')
    task = CHOICE[key]
    # Rotation is deterministic, not a new independent family or extra variant.
    texts = [task['correct'],*task['distractors']]
    if len(set(texts)) != 4:
        raise ValueError('Duplicate or ambiguous authored options')
    shift = (int(key[:2]) + int(key[3:])) % 4
    texts = texts[shift:] + texts[:shift]
    options = [{'id':f'option-{i}','text':text} for i,text in enumerate(texts)]
    correct = next(o['id'] for o in options if o['text'] == task['correct'])
    common.update(prompt=task['prompt'],options=options,grading={'correctOptionId':correct,'explanation':task['reason']})
    return common,{'key':key,'kind':kind,'ordinal':0}


def node_sdk(operation, data):
    script = """import{readFileSync}from'node:fs';import{validateCourse,digestTeachingArtifact}from'@course-core/sdk';import{compileCourse}from'@course-core/sdk/compiler';const input=JSON.parse(readFileSync(0,'utf8'));if(input.operation==='validate'){const result=validateCourse(input.data);if(!result.valid)throw new Error(JSON.stringify(result.issues));const compiled=compileCourse(input.data);process.stdout.write(JSON.stringify({digest:compiled.digest,learner:compiled.learner}));}else if(input.operation==='digest'){process.stdout.write(JSON.stringify(await digestTeachingArtifact(input.data)));}else throw new Error('Unknown SDK operation');"""
    if len(json.dumps(data)) > 5_000_000:
        raise ValueError('SDK input exceeds bound')
    process = subprocess.run(['node','--input-type=module','-e',script],input=json.dumps({'operation':operation,'data':data}),text=True,capture_output=True,cwd=ROOT,timeout=30)
    if process.returncode:
        raise ValueError('Released SDK rejected authored recovery data: '+process.stderr[-2000:])
    return json.loads(process.stdout)


def build_payload():
    course = course_base()
    bound = bindings_for(course)
    implementation = hashlib.sha256((ROOT/'verification/adaptation-authoring.py').read_bytes()+b'\0'+(ROOT/'verification/adaptation-reference.py').read_bytes()).hexdigest()
    extension = {'id':EXTENSION,'version':VERSION,'integrity':'sha256-'+implementation,'entrypoint':'extensions/private-recovery-cpu.mjs','platforms':['web'],'execution':'server','capabilities':['teaching.generate','teaching.verify'],'accessibility':{'keyboard':True,'reducedMotion':True,'textAlternative':'Recovery checks use ordinary text/numeric/choice controls; no animation is required.'}}
    source = {'id':SOURCE,'title':'Private authored recovery tasks and independent CPU reference procedures','url':'urn:private-course:recovery-cpu-v1','reviewedAt':REVIEWED}
    authoring = {'schemaVersion':1,'sourceRefs':[SOURCE],'profileFieldIds':[],'targets':[],'families':[],'generators':[{'id':GENERATOR,'version':VERSION,'extensionId':EXTENSION,'sourceRefs':[SOURCE],'artifactKinds':['assessment_variant']}],'verifiers':[{'id':VERIFIER,'version':VERSION,'extensionId':EXTENSION,'sourceRefs':[SOURCE],'artifactKinds':['assessment_variant'],'requiredCheckIds':CHECKS}],'numericalRecipes':[],'limits':{'maxOperations':4,'maxArtifacts':4,'maxArtifactBytes':20000,'maxPlannedMinutesPerAssignment':10,'maxAdditionalEpisodesPerAssignment':1,'allowedClassifications':['required','optional']}}
    bank, bindings = [],[]
    for key,context in bound.items():
        episode = context['episode']
        authoring['targets'].append({'episodeId':episode['id'],'objectiveIds':episode['objectiveIds'],'allowedOperations':['add_assessment_variant'],'replaceableBlockIds':[]})
        for kind,canonical in context['items'].items():
            assessment,meta = generated_assessment(key,kind,canonical)
            bank.append(assessment)
            bindings.append({'episodeId':episode['id'],'canonicalAssessmentId':canonical['id'],'assessmentId':assessment['id'],'familyId':canonical['familyId'],**meta})
            family = {'familyId':canonical['familyId'],'canonicalAssessmentId':canonical['id'],'generatorIds':[GENERATOR],'verifierIds':[VERIFIER],'numericalRecipeIds':[],'maxVariantsPerPlan':20}
            if kind == 'numeric':
                task = NUMERIC[key]
                variables,_ = variable_space(task)
                expression = bounded_expression(task['expression'],set(task['values'])) if task['expression'] else {'type':'constant','value':task['anchor']}
                # Empty/fractional fixed domains remain authored-bank tasks. They
                # are not advertised as supported by the generic integer creator.
                if variables and all(v[2]['integer'] for v in variables) and task['expression']:
                    recipe_id = f'ada-recipe-{key}'
                    family['numericalRecipeIds']=[recipe_id]
                    authoring['numericalRecipes'].append({'id':recipe_id,'version':VERSION,'promptTemplate':task['prompt'],'sourceRefs':[SOURCE],'variables':[v[2] for v in variables],'expression':expression,'maxNodes':128,'maxDepth':16,'maxAbsoluteValue':1e9,'referenceCheck':{'verifierId':VERIFIER,'verifierVersion':VERSION,'checkId':'independent-answer','absoluteTolerance':1e-7}})
            authoring['families'].append(family)
    overlay = {'schemaVersion':1,'extension':extension,'source':source,'adaptation':authoring,'bindings':bindings,'qualification':{'implementationDigest':implementation,'publicationAuthority':'not_granted','runtimeRegistration':'required_before_use','choiceReview':'authored_rationales_not_automatic_truth_certification','practicalRecovery':'not_covered_by_this_overlay'}}
    return course,overlay,{'schemaVersion':1,'assessments':bank,'bindings':bindings}


def verify_math():
    reference = reference_module()
    checked = 0
    for key,task in NUMERIC.items():
        actual = reference.reference(key,task['values'])
        if not math.isclose(actual,task['anchor'],rel_tol=1e-7,abs_tol=1e-7):
            raise ValueError(f'Independent default reference mismatch: {key}')
        variables,total = variable_space(task)
        expression = bounded_expression(task['expression'],set(task['values'])) if task['expression'] else {'type':'constant','value':task['anchor']}
        for ordinal in range(total):
            values = instantiate_values(task,ordinal)
            expected = float(interpret(expression,values))
            observed = reference.reference(key,values)
            if not math.isfinite(observed) or not math.isclose(expected,observed,rel_tol=1e-7,abs_tol=1e-7):
                raise ValueError(f'Independent qualified-domain mismatch: {key}, ordinal {ordinal}')
            if math.isclose(expected+max(1,abs(expected)*.05),observed,rel_tol=1e-7,abs_tol=1e-7):
                raise ValueError('Wrong-key negative control accepted')
            checked += 1
    for expression in ["__import__('os').system('x')",'x.__class__','x[0]','x**2','float(x)','[x]', 'True']:
        try:
            bounded_expression(expression,{'x'})
        except (ValueError,SyntaxError):
            continue
        raise ValueError('Executable/unsupported expression was accepted')
    return checked


def make_artifact(course, overlay, identity, ordinal):
    binding = next((b for b in overlay['bindings'] if b['assessmentId']==identity),None)
    if not binding:
        raise ValueError('Unknown approved task identity')
    canonical = next(a for a in course['assessments'] if a['id']==binding['canonicalAssessmentId'])
    assessment,meta = generated_assessment(binding['key'],binding['kind'],canonical,ordinal)
    draft = {'id':f'artifact-{assessment["id"]}','kind':'assessment_variant','objectiveIds':assessment['objectiveIds'],'sourceRefs':[SOURCE],'generator':{'id':GENERATOR,'version':VERSION},'canonicalAssessmentId':canonical['id'],'assessment':assessment}
    draft['digest']=node_sdk('digest',draft)
    return draft,meta


def verify_artifact(course, overlay, artifact, ordinal):
    if not isinstance(artifact,dict) or artifact.get('kind')!='assessment_variant':
        raise ValueError('Unsupported artifact')
    canonical_id = artifact.get('canonicalAssessmentId')
    candidates = [b for b in overlay['bindings'] if b['canonicalAssessmentId']==canonical_id]
    if len(candidates)!=1:
        raise ValueError('Unapproved canonical binding')
    expected,meta = make_artifact(course,overlay,candidates[0]['assessmentId'],ordinal)
    if artifact != expected:
        raise ValueError('Artifact differs from the approved independently checked task')
    return {'artifactDigest':artifact['digest'],'checks':[{'id':name,'result':'passed'} for name in CHECKS],'evidenceRefs':[f'private-cpu-reference:{meta["key"]}:{ordinal}'],'proofAuthenticity':'not_checked','publicationAuthority':'not_granted'}


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--write',action='store_true')
    group.add_argument('--generate')
    group.add_argument('--verify',action='store_true')
    group.add_argument('--reference',action='store_true')
    parser.add_argument('--ordinal',type=int,default=0)
    args = parser.parse_args()
    if args.reference:
        payload = json.load(sys.stdin)
        if set(payload)!={'templateId','variables'} or not payload['templateId'].startswith('ada-recipe-'):
            raise ValueError('Invalid reference request')
        key = payload['templateId'][len('ada-recipe-'):]
        task = NUMERIC[key]
        values = payload['variables']
        if set(values)!=set(task['values']):
            raise ValueError('Reference variable scope mismatch')
        for name,value in values.items():
            lower,upper=task['bounds'].get(name,(task['values'][name],task['values'][name]))
            if type(value) not in (int,float) or not math.isfinite(value) or not lower<=value<=upper:
                raise ValueError('Reference variable out of bounds')
        print(json.dumps(reference_module().reference(key,values)))
        return
    course,overlay,bank = build_payload()
    if args.generate:
        artifact,_=make_artifact(course,overlay,args.generate,args.ordinal)
        print(json.dumps(artifact,separators=(',',':')))
        return
    if args.verify:
        print(json.dumps(verify_artifact(course,overlay,json.load(sys.stdin),args.ordinal),separators=(',',':')))
        return
    checked = verify_math()
    candidate = copy.deepcopy(course)
    candidate['sources'].append(overlay['source']);candidate['extensions'].append(overlay['extension']);candidate['adaptation']=overlay['adaptation']
    candidate['assessments'].extend(bank['assessments'])
    result = node_sdk('validate',candidate)
    if any('grading' in a or 'prompt' in a for a in result['learner']['assessments']) or 'adaptation' in result['learner']:
        raise ValueError('Grading/generator data leaked into the learner projection')
    if args.write:
        for filename,data in [('adaptation-authoring.json',overlay),('fresh-assessments.json',bank)]:
            path=ROOT/'content'/filename;path.write_text(json.dumps(data,indent=2)+'\n');path.chmod(0o600)
    print(json.dumps({'episodes':56,'declaredChoiceNumericFamilies':len(overlay['adaptation']['families']),'authoredFreshItems':len(bank['assessments']),'numericalDomainCases':checked,'wrongKeyControls':checked,'numericalRecipes':len(overlay['adaptation']['numericalRecipes']),'releasedSdkValidated':True,'runtimeRegistration':'required_before_use','practicalRecovery':'not_covered','publicationAuthority':'not_granted'}))


if __name__=='__main__':
    main()
