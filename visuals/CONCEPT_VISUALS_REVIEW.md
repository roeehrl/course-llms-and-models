# Concept visual studies: authoring and qualification

Private course material, reviewed 2026-10-14. This file covers two batches of eight original declarative illustrations, sixteen in all, each bound to an episode that previously had none. The first batch (scenes 01–08) was committed as `e184075`; the second batch (scenes 09–16) extends the same script, oracle, verifier and overlay without changing any first-batch scene (their JSON is byte-identical to `e184075`). It follows the learning batch (`visuals/LEARNING_VISUALS_REVIEW.md`) exactly: bounded state the learner changes, real arithmetic, timeline steps, live readouts and a complete text equivalent. **The illustrations award no assessment credit.** Their reference checks are local diagnostics, not grading evidence. **Passing numeric and layout checks does not show that an illustration teaches well.** That still needs human review with learners. The scenes do not qualify a GPU, kernel, framework, network or device.

Final local result after the second batch: **32,344 oracle cases checked in both layouts (64,688 CPU frames). All 47 negative controls (23 first batch + 24 second batch) were rejected for the intended reason, and 80 browser cases passed** (16 scenes × 5 widths). The first batch alone, as committed in `e184075`, had 18,786 cases, 23 controls and 40 browser cases. The browser was Chrome 155.0.8059.41 (headless, `--disable-gpu`) at 320, 390, 700, 834 and 1440 CSS pixels. Keyboard, touch taps, pointer drag, play/pause, resize preservation and reduced motion all passed. There were no renderer or console errors, text overlaps, text escaping a card or the canvas, or page overflow. The smallest rendered scene font was **15.62 px in the compact layout (320)** and **14.31 px in the expanded layout (834)**, the same minima as the first batch (the floor is 14). The full curriculum still compiles to **14 chapters / 56 episodes**, now with 31 bound visuals (one per episode); 25 episodes remain without an illustration.

Renderer: the released `@course-core/visuals` package (`course-core-svg-v1`, version `0.1.0`), integrity `sha256-e16ff7d93b320f12913f1c3bc5a7246c16d1ca09cc4cf8f1ba8a29d2cde2aa24`. This is the same declaration the systems and learning overlays use; the authoring script checks it against both and refuses to write anything if it differs. Generated JSON uses deterministic two-space `JSON.stringify`; regenerating produces byte-identical files (checked with SHA-256 before and after a rerun).

## Files

| File | Role |
| --- | --- |
| `scripts/create-concept-visual-scenes.mjs` | Trusted authoring script for both batches. It builds and `parseScene`-validates the scenes, refuses any expression deeper than 16, and checks every binding against existing content: the episode and text block exist, each episode gets one illustration, and the episode has no illustration from the base, systems or learning overlays. It lints the layout headlessly over single-field and pairwise boundary states and writes only the next two files. |
| `visuals/concept-scenes.json` | The bounded scenes plus binding records. |
| `content/concept-visuals.json` | The overlay (`extension`, `visuals`, `bindings`) in the same shape as `content/learning-visuals.json`. Visuals are SDK `VisualExperience` objects that round-trip through `fromVisualExperience`. |
| `verification/concept-visual-reference.py` | Independent Python standard-library oracle, run with `python3 -I`. It never reads scene JSON or evaluates the AST, and emits cases to stdout. |
| `verification/concept-visuals.mjs` | Compares actual headless readouts and geometry with the oracle. It also runs the negative controls and runtime contract checks, compiles the full curriculum through the released SDK with all four visual overlays, and runs browser QA with `--browser`. Its structure, layout lint, runtime contract and browser QA are those of `verification/learning-visuals.mjs`. |

Minimal integration edits:

- `scripts/assemble.mjs` loads `content/concept-visuals.json` exactly the way it loads `learning-visuals.json` (two lines).
- The `verify:visuals` npm script now ends with `&& node verification/concept-visuals.mjs`.
- The second batch needed no further integration edits: `assemble.mjs`, `package.json`, tests, packaging and the recovery/staging scripts are unchanged. Only the four concept files above and this review changed.
- No test and no existing verifier needed changing. The tests that count visuals load only the two oldest overlays explicitly, and `verification/learning-visuals.mjs` compiles its own explicit overlay list in memory, so its counts are unaffected.

## Scenes and bindings

| Scene (title) | Episode, inserted after | Learner manipulates | Invariant checked against the oracle | Nodes / bytes / timeline / max depth |
| --- | --- | --- | --- | --- |
| `concept-matmul-reduce`: "Rows meet columns. Axes disappear." | `fnd-e02-03`, after `fnd-02-03-text-2` | Output cell (also tap a C cell), A[1,2] (−3…9), accumulator start, reduction axis, keepdims | Each product and running accumulator for the chosen C[i,j], all four C values, additions executed per cell and in total (8 vs 12; 12 multiplications), reduced sums, shapes ((2,), (2,1), (3,), (1,3), (), (1,1)), divisors and means; mean of row sums 10.5 vs all-element mean 3.5; row/column highlight geometry. | 82 / 25,909 / 5.2 s / 12 |
| `concept-chain-rule`: "Multiply the links. Then test the line." | `fnd-e03-02`, after `fnd-03-02-text-1` | w (0…3, also drag/arrow on the plot), x (0…3), step δ (0…1 by 0.01) | p, r, L, the three local links, dL/dw = r·x, the central difference, the tangent guess L + g·δ, the exact L(w+δ), and their gap x²δ²/2 to six decimals (4.44 vs 4.4402 at the lesson's defaults); marker, tangent and gap-line geometry. | 42 / 19,470 / 5.0 s / 12 |
| `concept-grad-accumulation`: "Weight by count. Clear each window." | `fnd-e04-03`, after `fnd-04-03-text-2` | Examples and mean gradient of each microbatch, combine rule, whether the buffer is cleared per window | Buffer after each microbatch, divisor, gradient (1 vs 0), the full-batch mean, w1 (9.9), the next window's buffer (2 vs stale 3), w2 (9.7 vs 9.6) and the intended w2; example-slot geometry. | 46 / 15,419 / 5.4 s / 13 |
| `concept-relu-gate`: "A bend gates the gradient." | `ttf-e05-01`, after `ttf-05-01-text-2` | x1, x2 (−3…3), target, activation ReLU or none | z, h, ŷ, L, r, ∂h, gate state, ∂z, both weight-row gradients, ∂b and ∂v (the lesson's [1,−5], [1,0], 3.5, 3.125, [7.5,−2.5], [7.5,0], [7.5,−15], [2.5,0]); the collapsed affine map 7·x1 + x2 + 3.5 and whether the network differs from it; gate geometry. | 38 / 27,414 / 5.2 s / 16 |
| `concept-causal-mask`: "Read the past. Never the answer." | `ttf-e06-03`, after `ttf-06-03-text-2` | Mask (causal / none / transposed), query row (also tap a mask row), target shift, loss denominator, the padded sequence's loss | Inputs and targets, every mask cell, what the query reads, its target, whether the target is visible, rows leaking, which rows move when only token 7 changes, and the three loss reductions (2.5, 1.667, 3). | 65 / 21,626 / 4.6 s / 9 |
| `concept-rope-gqa`: "Rotate both. Only the gap remains." | `ttf-e07-03`, after `ttf-07-03-text-2` | Query position m, key position n (0…6), angle per position θ (0…90° by 15°), unrotated-key cache bug, KV heads (4/2/1) | Rotated q and k, Rq·Rk, q·R((n−m)θ)k, the product after shifting both positions, norm preservation, the verdict; GQA projection sizes (192 vs 256 vs 160), head grouping and K/V values per token; animated vector geometry. | 37 / 25,912 / 4.4 s / 14 |
| `concept-tree-reduction`: "Pad the tail with the identity." | `sys-e09-01`, after `sys-09-01-text-1` | n (1…16), group size (8/4/2), pad or drop the final partial group, alternating signs | Padding count or dropped values, every group partial, the last group's tree levels (values, slot positions and widths, padding shading), rounds, the second-pass total and the sequential sum (55 vs 36 at the lesson's n = 10, size 8). | 77 / 211,527 / 5.4 s / 15 |
| `concept-transfer-budget`: "Bytes, bits and a cycle budget." | `eng-e14-03`, after `eng-14-03-lesson` | Payload (10…100 MiB), link rate (50…1000 Mb/s), compute and merge time, serial or ideal-overlap model, attempts per contribution | Bits, ideal transfer time (4.194304 s at the lesson's 100 MiB / 200 Mb/s) and the decimal-MB figure (4 s), the cycle under the chosen and the other model, cycles per hour, the attempt counter vs unique work (180 vs 60); bar positions and growth. | 32 / 11,941 / 5.2 s / 11 |
| `concept-tensor-offsets`: "One flat buffer, many readings." | `fnd-e02-01`, after `fnd-02-01-text-2` | b, t, d indices, an offset to decode (0…23), element type (FP32 / 2-byte) | Offset b·12 + t·4 + d (23 for the lesson's (1,2,3)), the strides, payload bytes (96 / 48), the byte range (92…95), decoding offset 17 to (1,1,1), and the same offset read as shape (2,4,3) giving (1,1,2); highlight geometry on all 24 boxes. | 130 / 28,883 / 4.8 s / 7 |
| `concept-batch-mean`: "Average the batch. Watch each example." | `fnd-e03-04`, after `fnd-03-04-text-1` | w (0…2), η (0…0.3), mean or sum reduction | Per-example losses, residuals and gradients, the batch loss and gradient (1 and −1 at w = 1), w′ (1.1), the losses after the step (1.805, 0.02, mean 0.9125) to six decimals, the verdicts "batch loss fell" / "yet ex2 got worse"; before/after bar widths. | 34 / 22,824 / 4.8 s / 16 |
| `concept-autodiff-fanout`: "Every slot and every use adds." | `fnd-e04-04`, after `fnd-04-04-text-2` | x (−3…3), multiply rule (both slots / one slot), += or =, backward() calls (1…3), reset on/off | u, z, u.grad, the per-slot contributions on every edge, x.grad (8 at x = 2; 4 one-slot; 2 overwrite; 24 and 48 after repeated calls without reset), 4x and a central difference, the verdict; the ignored slot's edge fades. | 39 / 12,379 / 4.8 s / 10 |
| `concept-residual-norm`: "A skip path and the right axis." | `ttf-e05-02`, after `ttf-05-02-text-2` | Branch slope F′ (−1…1), layers (1…10), token A's second feature, per-token or whole-batch statistics, batch companion | F′^L (0.1^10 ≈ 0) and (1+F′)^L (1.1^10 ≈ 2.593742) to six decimals, the verdict including exact cancellation at F′ = −1, per-layer bar heights; normalization mean and variance, A's output ([−0.999995, 0.999995] per token; about [−1.183, −0.507] over the batch with [5, 9]), and whether batching changed A. | 48 / 38,358 / 4.8 s / 16 |
| `concept-embedding-scatter`: "Look up a row. Add back into it." | `ttf-e06-01`, after `ttf-06-01-text-2` | ID at each of three positions (0…3), position vectors on/off, accumulate or overwrite | Rows used by which positions, gathered inputs ([1,1], [1.1,−0.1], [1.2,0.8] for the lesson's IDs), whether x0 and x2 differ, every row's table gradient ([0.5, 5] for row 2), rows touched; row highlight geometry. | 35 / 19,926 / 4.8 s / 10 |
| `concept-lora-update`: "A thin update, added beside W." | `ttf-e08-04`, after `ttf-08-04-text-2` | Scale s (0…2), x[3] (−2…4), rank for counts (1…3), factor initialization (lesson / B zero / both zero) | The 12 cells of ΔW = s·B·A, A·x (6), Δy ([12, −6, 3]) through the factors and through the dense ΔW, trainable counts (7r vs 12), ∂B and ∂A for an invented upstream gradient, and which factor can learn; cell highlight geometry. | 77 / 45,800 / 4.8 s / 13 |
| `concept-parallel-split`: "Same math, different messages." | `sys-e10-01`, after `sys-10-01-text-2` | x (two entries), split by output columns or input features, concatenate or sum, examples on replica 2, stage weights w and v, which message stage B sends | Each worker's partial, the combined result against [5, 11], the verdict; the count-weighted replica mean (5) vs the mean of means (4); h, prediction, loss, dL/dpred, B's dv (4), the message sent (6), A's dw and its verdict; the return arrow. | 44 / 15,859 / 6.0 s / 9 |
| `concept-streaming-lse`: "Tile the logits. Keep one denominator." | `eng-e13-01`, after `eng-13-01-lesson` | N (256…2048), V (1024…16384), tile axis, logit z3 (995…1003), target logit (also tap a logit), finite-flag reads (1…64) | Full and tiled fp32 logits MiB (32, 8, 1 at the lesson's sizes), each tile's max and scaled sum, the rescale factors, M and s, the cross-entropy (2.440 for the lesson's logits) against a no-rescale sum and a target-tile-only softmax, the target probability and its gradient; the synthetic 0.96 ms vs 0.06 ms ledger; target highlight geometry. | 57 / 64,521 / 5.2 s / 16 |

Chapter spread: first batch 2, 3, 4, 5, 6, 7, 9 and 14; second batch 2, 3, 4, 5, 6, 8, 10 and 13, one scene each per batch. The second batch was chosen from the 33 then-unillustrated episodes by where a manipulable diagram teaches the most and the lesson supplies concrete numbers to bind to: offsets in a flat buffer, a batch mean that hides one example getting worse, fan-out in the lesson's engine, residual and normalization contracts, embedding scatter-add, LoRA factor shapes, partition messages and streaming log-sum-exp. Episodes that are mainly narrative (the TAH/IOTA map, incident disclosure, the host and control plane) were skipped. The fifteen illustrations from the older overlays and their files are untouched. All sixteen scenes are within the released limits: at most 130 of 400 nodes (the offsets scene draws 24 boxes with two highlight layers), at most 212 KB of the 1 MB scene budget, timelines at most 6.0 s of 120 s, and expression depth at most 16 (the ReLU, batch-mean, residual and streaming-LSE scenes reach the limit exactly; the authoring script refuses anything deeper).

### Teaching contract per scene (summary)

- **Matmul and reductions.** The lesson's A and B. Only A[1,2] is editable, so the learner sees which outputs and reductions depend on one entry. Setting it to 1 makes C symmetric, which is the lesson's warning about fixtures that hide index bugs (one negative control depends on exactly that case). Addition counts follow the lesson's two conventions.
- **Chain rule.** The target is fixed at the lesson's y = 5. The gap readout shows six decimals because the lesson's point (4.44 vs 4.4402) is invisible at three. The plot covers w from 0 to 4 and is scaled so that every reachable tangent end point stays inside the card.
- **Gradient accumulation.** Both microbatches are computed at the same weight, as the lesson requires. The scene does not model updating between microbatches; the text alternative says so.
- **ReLU gate.** The lesson's weights. The gradient at exactly z = 0 is taken as 0 and labelled as a convention; the oracle's finite-difference cross-check is skipped only at that kink.
- **Causal mask.** The lesson's sequence, mask convention (true = may read) and padded losses. The future-token test is the lesson's suggested negative test; the oracle performs it on a toy mixing layer, independently of the scene's formula.
- **RoPE and GQA.** One coordinate pair with invented q = [2, 1] and k = [1, 3]. The GQA numbers are the lesson's (D = 8, four query heads of width 2). The "key cached unrotated" option stands for the lesson's "incorrect cache positions"; it is not a claim about any library.
- **Tree reduction.** The group sizes are invented, as in the lesson, and the subtitle says so. Values are 1…n as in the lesson, with an alternating-sign option for the lesson's "negative values" follow-up.
- **Transfer budget.** The lesson's units and formulas. The lesson's serial example uses a round 5 s transfer; here the transfer is computed from the payload and link rate (4.194 s by default), and the text alternative says so. All figures are synthetic; nothing refers to a fleet, worker or payment.

- **Tensor offsets (second batch).** The lesson's shape (2,3,4), index (1,2,3), offset 9 for (0,2,1) and reverse lookup of 17. The "2-byte format" is the lesson's unnamed two-byte representation; the scene does not claim which values it can represent. One negative control is the classic column-major bug, which the lesson's own example (1,2,3) cannot detect because both orders give 23.
- **Batch mean.** The lesson's two examples, w = 1 and η = 0.1. The after-step losses are shown to six decimals because the lesson's 0.9125 needs four. The η range stops at 0.3 so that every bar stays inside its card.
- **Autodiff fan-out.** The lesson's engine and its x = 2 example. The one-slot and overwrite options are the lesson's own negative tests; "no reset" is the contrast the lesson draws with framework autograd, not a property of the reference engine.
- **Residual and normalization.** Scalar layers F(x) = F′·x, so the derivative products are exact and the lesson's 0.1^10 and 1.1^10 appear directly. Values below 5e-7 are shown as "≈ 0" rather than in scientific notation. Normalization always uses the lesson's ε = 1e-5, which also keeps a constant token finite. The companion tokens [5, 9] and [0, 0] are invented.
- **Embedding scatter.** The lesson's table, IDs, position vectors and the two gradients for ID 2. The gradient at position 1 ([2, −1]) is invented and labelled so in the scene.
- **LoRA.** The lesson's A, B, x, s = 1 and the 7-vs-12 count. The upstream gradient [1, 0, −1] is invented and labelled. s moves in whole steps so every ΔW cell fits its box. The rank control changes only the counts; the drawn factors stay rank one, and the scene says so.
- **Parallel split.** The lesson's [1, 2]·W, replica gradients 2 and 6, and the w = 2, v = 3, target 4 pipeline. When w equals v, sending B's weight gradient happens to give the right number; the scene reports the number honestly and labels the message as the bug.
- **Streaming LSE.** The lesson's N, V, tile sizes, logits [1000, 999, 998, 997] (z3 editable), the 2.4401897 loss and the synthetic 64 × 15 µs ledger. The released expression language has no logarithm, so the scene computes ln s with the 16-term series 2·atanh((s − 1)/(s + 1)); with 1 ≤ s ≤ 4 here its error is below 1e-8, far inside the display rounding, and the oracle uses `math.log`. The scene evaluates the rescaled sum in its flat form (sum of e^(z − M)); the oracle runs the lesson's streaming loop.

## Verification evidence

The oracle produces **32,344 cases** (18,786 first batch, 13,558 second batch):

| Scene | Cases | Frames |
| --- | ---: | ---: |
| Matmul and reductions | 2,400 | 4,800 |
| Chain rule | 2,250 | 4,500 |
| Gradient accumulation | 2,880 | 5,760 |
| ReLU gate | 1,500 | 3,000 |
| Causal mask | 1,296 | 2,592 |
| RoPE and GQA | 3,168 | 6,336 |
| Tree reduction | 1,728 | 3,456 |
| Transfer budget | 3,564 | 7,128 |
| Tensor offsets | 1,920 | 3,840 |
| Batch mean | 336 | 672 |
| Autodiff fan-out | 1,152 | 2,304 |
| Residual and normalization | 4,032 | 8,064 |
| Embedding scatter | 1,536 | 3,072 |
| LoRA | 864 | 1,728 |
| Parallel split | 2,800 | 5,600 |
| Streaming LSE | 918 | 1,836 |

Every case is checked at 320 (compact) and 960 (expanded). The cases cover state extremes, every enum option, step boundaries just before and after each reveal, and intermediate animation times.

The oracle computes everything independently of the scene AST:

- literal accumulator loops that count the additions they execute, and hand-written axis reductions with keepdims shapes;
- exact `Fraction` losses, a chain-rule product cross-checked against a central difference (exact for a quadratic), and the identity gap = x²δ²/2;
- a microbatch buffer object whose count-weighted mean is compared with `statistics.fmean` over per-example gradients;
- a hand-written two-layer network with explicit backprop, cross-checked by central differences for every weight away from the ReLU kink, and the collapse v·W1, v·b1 + c computed from the weights;
- mask truth tables, target visibility from input positions, and a perturb-only-the-future-token test on a toy mixing layer;
- rotations as multiplication by `cmath.exp(iα)` (not the scene's sine/cosine formula), and GQA parameters from projection shapes;
- explicit padded groups and pairwise tree levels, a second-pass loop and a sequential sum;
- exact rational transfer times and an event-time schedule model, plus an explicit attempt log deduplicated by contribution;
- (second batch) row-major positions from an `itertools.product` enumeration rather than the stride formula, element sizes from `struct`, and byte ranges found by packing a marker element into a zeroed buffer;
- exact `Fraction` per-example losses, gradients, reductions and a single update;
- the lesson's `Value` engine with switchable one-slot, overwrite and no-reset defects, run for repeated `backward()` calls;
- layer-by-layer products of local derivatives, and two-pass `statistics.fmean`/`pvariance` normalization;
- copied table rows, per-position vectors and an explicit scatter loop into a gradient table;
- LoRA through the factors and through a materialized ΔW, with gradients obtained by exact one-at-a-time perturbation and counts from factor shapes;
- explicit column-owned and feature-owned worker partials, `fmean` over per-example gradients, and pipeline gradients checked by an exact central difference;
- the lesson's streaming max/sum loop with `math.exp`/`math.log`, compared with a direct `math.fsum` log-sum-exp.

Readouts are compared within 0.000501, which allows for three-decimal display rounding; six-decimal readouts (the chain rule's step card) within 0.00000051; vector readouts number by number within 0.000501; many readouts are compared as exact text. Geometry is compared within 1e-7.

Each frame also passes the learning verifier's checks, with one tightening: finiteness of all geometry, the connector rules, and a conservative headless layout lint (0.62·fontSize glyph advance, as in the package) in which visible text stays inside its card with 6 units of bottom padding and inside the canvas, no two texts overlap, no text is under 17 scene units, and visible rects, circles and lines stay inside their card (the learning lint checks rects only).

**Negative controls.** There are 47 controls, at least two per scene and three per second-batch scene. Each must be rejected because the mutated readout or geometry itself mismatches the oracle, or because the runtime refuses the arithmetic. Thirty-nine are also shown to pass an easy case (seventeen first batch, twenty-two second batch), which demonstrates that they are realistic, hidden bugs. Second-batch controls are checked at their final frame or from their reveal onward, as listed in `verification/concept-visuals.mjs`.

| Scene | Rejected mutation | Rejected cases | Passes an easy case |
| --- | --- | ---: | --- |
| Matmul | Row means divided by the all-element count 6 | 80 | — |
| Matmul | Addition count ignores a zero-initialized accumulator | 480 | First-product start |
| Matmul | Output written to the transposed cell C[1,0] | 192 | Symmetric C (A[1,2] = 1) |
| Chain rule | Missing factor x in dL/dw | 35 | x = 1 |
| Chain rule | Exact loss replaced by the tangent guess | 18 | δ = 0 |
| Chain rule | Tangent drawn with the slope's sign flipped | 15 | δ = 0 |
| Accumulation | Equal average of microbatch means | 10 | Equal sizes |
| Accumulation | Buffer never cleared between windows | 2 | Clear option off |
| ReLU gate | Gate ignored in backward | 12 | Both units open |
| ReLU gate | Collapsed map built from the transposed weight product | 12 | — |
| Causal mask | Grid lets query 0 read the future key 1 | 270 | No-mask option |
| Causal mask | Valid-token mean divided by all six slots | 324 | — |
| Causal mask | Leak check assumes targets are always shifted | 36 | Shifted targets |
| RoPE / GQA | Key rotated by the query position m·θ | 9 | m = n |
| RoPE / GQA | Key rotated in the opposite direction | 48 | n = 0 |
| RoPE / GQA | K/V projections sized by query heads | 1,056 | Four KV heads |
| Tree | Incomplete final group dropped despite padding | 2 | n a multiple of the group size |
| Tree | Padding filled with 1 instead of the additive identity | 2 | n a multiple of the group size |
| Tree | Tree slots not rescaled to the group size | 384 | Group size 8 |
| Budget | MiB treated as decimal MB | 432 | — |
| Budget | Overlap model silently ignored | 162 | Serial model |
| Budget | Attempt counter reported as unique work | 216 | One attempt |
| Budget | Transfer bar drawn before its step | 54 | — |
| Tensor offsets | Column-major offset (first index fastest) | 50 | The lesson's (1,2,3) |
| Tensor offsets | Byte range ends one byte past the element | 240 | — |
| Tensor offsets | Time index decoded without removing the batch stride | 144 | Offset below 12 |
| Batch mean | Summed loss reported as the mean | 105 | Sum reduction |
| Batch mean | Update steps up the gradient | 96 | η = 0 |
| Batch mean | Per-example gradient missing the factor x | 180 | w = 1 (second residual 0) |
| Autodiff | Fan-out lost: u + u counted once | 60 | x = 0 |
| Autodiff | Repeated backward without reset reported as fresh | 120 | Reset on |
| Autodiff | Ignored operand slot drawn as active | 72 | Both slots |
| Residual / norm | Identity added once, not once per layer | 360 | One layer |
| Residual / norm | Statistics taken over the whole batch | 288 | Token alone |
| Residual / norm | Bars drawn past the chosen depth | 432 | Ten layers |
| Embedding | Repeated row overwritten instead of accumulated | 18 | Distinct IDs |
| Embedding | Row chosen by position instead of token ID | 144 | ID 0 at position 0 |
| Embedding | Position vectors dropped from the input | 96 | Positions off |
| LoRA | A counted once regardless of rank | 72 | Rank 1 |
| LoRA | ∂A computed with the lesson's B after B started at zero | 48 | Lesson factors |
| LoRA | Scale s ignored | 72 | s = 1 |
| Parallel | Stage B returns its weight gradient instead of dL/dh | 272 | w = v |
| Parallel | Equal average of replica means | 208 | One example on each replica |
| Parallel | Combine contract never checked | 172 | Matching combine |
| Streaming LSE | Row tile sized by N instead of V | 40 | N = V |
| Streaming LSE | Target logit read at its tile-local index | 234 | Target in tile 1 |
| Streaming LSE | Probability normalized within the target's tile only | 204 | — |

**Runtime contract.** For each scene the verifier checks, exactly as the learning verifier does, that:

- fixed-seed replay reconstructs the same frame;
- reduced motion starts at the authored final frame and cannot play;
- the registered reference hook passes and an unregistered one reports failure;
- out-of-range and infinite state is rejected;
- `eval`-like operators and overflow are rejected;
- `toVisualExperience` round-trips;
- the delivered overlay contains no private host, fleet, wallet or incident identifiers (pattern check).

**Curriculum.** The verifier compiles the full course in memory with the base, systems, learning and concept overlays plus the practical and recovery overlays, through `assemble()` and the released SDK `compileCourse`. It also runs `validateCourse` separately on the combined course. The result is 14 chapters, 56 episodes and 31 visuals, with one illustration per episode and a single `course-core-svg-v1` extension. Each new visual block directly follows its anchor. `npm run build` also reports 14 chapters / 56 episodes, and its learner bundle contains 31 visuals.

**Browser QA (`--browser`).** Identical to the learning batch's. It runs the delivered SDK experiences through `fromVisualExperience` and the built `VisualPlayer`. A loopback-only server serves them, and every non-local request is aborted. For every scene and viewport it checks:

- keyboard timeline seek changes the actual SVG;
- every native control works: arrow keys on number sliders, `selectOption` on enums, a touch tap (or click on desktop) on booleans;
- every in-canvas handle works through keyboard (Enter, or arrows for the chain-rule drag) and through a touch tap, click or pointer drag;
- time and every control value survive resizing across the 800-pixel breakpoint and back;
- at three timeline positions there is no text overflow, no text-to-text overlap, no text escaping its card, no page horizontal overflow, and no font under 14 px;
- play/pause works;
- reduced motion disables play and opens the full text equivalent.

Screenshots and `report.json` go only to a mode-0700 temporary directory (`private-concept-visual-qa-*`), never to the repository. A small subset of the 80 screenshots was reviewed by eye: five scenes at one width each (chain rule at 1440, tree at 390, RoPE at 1440, causal mask at 834, matmul at 320), in the non-default states the QA leaves behind. Their readouts agree with hand arithmetic (for example C[1,1] = 0 + 5 + 5 = 10 at A[1,2] = 5, and the dropped-tail tree total −4 against the sequential 5). The other screenshots were not inspected individually.

For the second batch, three of the 80 new screenshots were reviewed by eye, again in the non-default states the QA leaves behind. In the streaming-LSE scene at 1440 (z3 = 996, target z3) s = 1 + e^−1 + e^−2 + e^−4 ≈ 1.522 and the loss is 4 + ln 1.522 ≈ 4.420, which matches. In the offsets scene at 390, (0,1,2) gives offset 6 and bytes 12–13 for a 2-byte type, and offset 16 decodes to (1,1,0), or (1,1,1) under (2,4,3). The LoRA scene was checked at 834. That review found one wording weakness that no automated check flags. With s = 0 and "B starts at zero", the verdict reads "no factor can learn". That is true, because a zero scale removes both gradients, but a learner may blame the initialization instead of s. It is left as is and noted here for human review.

The checks caught and led to these fixes during authoring: a tree level counted as present for a group size that has no such level (geometry escaped its card), card and kicker text that ran past the card edge at 320, a "cycles per hour" readout that overflowed only at a non-extreme state (caught by the oracle sweep, not by the boundary lint), and a misleading value-pattern line for n ≤ 2. In the second batch they caught an overflow past the runtime's ±1e9 bound in a six-decimal readout of 2^10 (now shown to three decimals above 1000), three expressions deeper than 16 (restructured), and several titles, kickers and notes that were too wide for a 288-unit card or the 320-unit canvas. The first full oracle comparison of the second batch passed without changes, so the oracle sweep found no readout errors that the authoring lint had missed.

## Commands (all run from the repository, real results)

```sh
node scripts/create-concept-visual-scenes.mjs    # writes the two JSON files (16 scenes); rerun is byte-identical (SHA-256 checked)
npm run build                                    # {"kind":"full-curriculum-bundle",...,"chapters":14,"episodes":56}; 31 visuals
npm test                                         # tests 15, pass 15, fail 0
npm run verify:visuals                           # 384 + 1,110 + 12,270 + 64,688 frames; 3 + 9 + 22 + 47 negative controls rejected; exit 0 (8.5 min)
node verification/concept-visuals.mjs --browser  # browserCases 80, Chrome 155.0.8059.41, min font 15.62 / 14.31 px
node verification/systems-visuals.mjs --browser  # existing batch re-run: browserCases 15, exit 0
node verification/learning-visuals.mjs --browser # existing batch re-run: browserCases 45, min font 15.62 / 14.31 px, exit 0
npm run verify:math                              # exit 0
```

The oracle needs Python 3 and nothing else. Browser QA resolves the installed `esbuild` and `playwright` next to the released package and uses installed Chrome. It does not modify package manifests or lockfiles.

## Limits and gaps

- **Passing checks is not teaching evidence.** For both batches, the oracle shows only that the readouts match independent arithmetic. It does not show that a learner understands the idea afterwards. No learner has used any of the sixteen scenes; that needs human review with learners.
- **Not tested in Safari, with screen readers or on physical devices.** All browser QA ran in headless Chrome with emulated touch. No scene has been checked in Safari or WebKit, with VoiceOver or another screen reader, or on a physical phone or tablet.
- **The headless run is slow.** With both batches, `npm run verify:visuals` took about 8.5 minutes on this machine, most of it in `verification/concept-visuals.mjs`. Nothing was weakened to speed it up. Second-batch negative controls are evaluated at one representative frame per state where the full timeline adds no discrimination.
- **Second-batch specifics.** The streaming-LSE scene computes ln with a truncated series, because the released expression language has none. The bound and the oracle are described above. A future scene with a wider sum range would need more terms or a different method. Three second-batch values are invented and labelled in the scene: the gradient at embedding position 1, the LoRA upstream gradient, and the normalization companions. Derivatives below 5e-7 are displayed as "≈ 0", so the scene does not show the exponent of 1e-10.
- **Expression depth.** The ReLU scene uses the full released depth of 16. Any edit that nests further must restructure the expression; the authoring script refuses deeper trees rather than letting `parseScene` or the runtime fail later.
- **Scene size.** The tree scene is about 212 KB because its prefix-sum expression is repeated for each slot. It is well within the 1 MB budget but is the largest scene in the batch.
- **The compact layout scales with its container.** As in the earlier batches, below the 800-pixel container breakpoint the 320-unit layout fills the width, so text at 700 px renders large. The final embedding should keep a reasonable container width.
- **Text measurement is approximate.** The headless lint is conservative, and the browser checks use real Chrome glyph boxes. Neither is a human screen-reader audit, Safari or physical-device testing, or native qualification. There is no RN/native renderer.
- **Staging and recovery paths still use only the oldest overlays.** As the learning review already noted, `scripts/bind-recovery-runtime.mjs` and `scripts/stage-worked-examples.mjs` assemble with only the `visuals` and `systems-visuals` overlays; they were not changed here. `npm run build` now includes the learning and concept overlays, so its digest changes. Whether those paths should include both newer overlays must be decided before any release or package step.
- **The base overlay has no browser mode.** `verification/visuals.mjs` (the three oldest scenes) is headless only; it passed headlessly, and there was nothing to run in a browser for it.
- The first batch made no push, publication, release or change to Course Core. The second batch is pushed only to this private repository's `main`. Neither batch made a release, a package change or a Course Core change, or touched a network service, GPU, worker or remote host.

## References

Reviewed 2026-10-14. The examples, wording and layouts are original. Every number shown comes from the bound episode's own text or is labelled synthetic or invented (the RoPE vectors, the tree group sizes and the budget figures). The lessons' own cited sources establish the general operation contracts; this batch introduces no new external claims.
