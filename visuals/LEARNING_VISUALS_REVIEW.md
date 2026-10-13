# Learning visual studies: authoring and qualification

Private course material, reviewed 2026-10-13. This batch adds nine original declarative illustrations to nine episodes that previously had none. Each one has bounded state and real arithmetic the learner changes, with timeline steps, live readouts and a complete text equivalent. Like the earlier batches, **the illustrations award no assessment credit**. Their reference checks are local diagnostics, not grading evidence. **Passing numeric and layout checks does not show that an illustration teaches well.** That still needs human review with learners. The scenes do not qualify a GPU, kernel, framework or device.

Final local result: **6,135 oracle cases checked in both layouts (12,270 CPU frames). All 22 negative controls were rejected for the intended reason, and 45 browser cases passed.** The browser was Chrome 155.0.8059.40 (headless, `--disable-gpu`) at 320, 390, 700, 834 and 1440 CSS pixels. Keyboard, touch taps, pointer drag, play/pause, resize preservation and reduced motion all passed. There were no renderer or console errors, text overlaps, text escaping a card or the canvas, or page overflow. The smallest rendered scene font was **15.62 px at 320** and **14.31 px in the 834 px expanded view** (the floor is 14). The full curriculum still compiles to **14 chapters / 56 episodes**, now with 15 bound visuals.

Renderer: the released `@course-core/visuals` package (`course-core-svg-v1`, version `0.1.0`), integrity `sha256-e16ff7d93b320f12913f1c3bc5a7246c16d1ca09cc4cf8f1ba8a29d2cde2aa24`. This is the same declaration the existing overlays use, and the authoring script refuses to write anything if the identity differs. Generated JSON uses deterministic two-space `JSON.stringify`; regenerating produces byte-identical files.

## Files

| File | Role |
| --- | --- |
| `scripts/create-learning-visual-scenes.mjs` | Trusted authoring script. It builds and `parseScene`-validates the scenes and checks every binding against existing content: the episode and text block exist, each episode gets one illustration, and the episode has no existing illustration. It also lints the layout headlessly over boundary states and writes only the next two files. |
| `visuals/learning-scenes.json` | The bounded scenes plus binding records. |
| `content/learning-visuals.json` | The overlay (`extension`, `visuals`, `bindings`) in the same shape as `content/systems-visuals.json`. Visuals are SDK `VisualExperience` objects that round-trip through `fromVisualExperience`. |
| `verification/learning-visual-reference.py` | Independent Python standard-library oracle, run with `python3 -I`. It never reads scene JSON or evaluates the AST, and emits cases to stdout. |
| `verification/learning-visuals.mjs` | Compares actual headless readouts and geometry with the oracle. It also runs the negative controls and runtime contract checks, compiles the full curriculum through the released SDK with all overlays, and runs browser QA with `--browser`. |

Minimal integration edits:

- `scripts/assemble.mjs` loads `content/learning-visuals.json` exactly the way it loads `systems-visuals.json` (two lines).
- The `verify:visuals` npm script now ends with `&& node verification/learning-visuals.mjs`.
- No test needed changing. The tests that count visuals load only the two older overlays explicitly.

## Scenes and bindings

| Scene (title) | Episode, inserted after | Learner manipulates | Invariant checked against the oracle | Nodes / bytes / timeline |
| --- | --- | --- | --- | --- |
| `learning-float-order`: "Same three numbers. Two answers." | `fnd-e02-04`, after `fnd-02-04-text-2` | Format FP32/FP16/BF16, exponent E of a = 2^E (4–24), b (1–4) | (a+b)+c and a+(b+c) under round-to-nearest, ties-to-even, using the correct binade spacing for each sum. Snap-marker positions at intermediate times. FP16 overflow gives NaN in both orders. | 48 / 57,876 / 5 s |
| `learning-fanout-backward`: "One weight. Two paths. Add both." | `fnd-e04-02`, after `fnd-04-02-text-1` | w (−3…3, also drag/arrow on canvas), gradient rule (accumulate / overwrite / one slot), η | bar(w) after each backward event (1, then +w, then +w, giving 2w+1). The stored w stays unchanged until the single update at 5.2 s. | 34 / 10,953 / 6 s |
| `learning-optimizer-state`: "Same gradient. Different memory." | `ttf-e05-03`, after `ttf-05-03-text-2` | Optimizer (also tap a convention line), second gradient, drop state between steps, parameter count, weight dtype | Two steps of SGD, momentum and AdamW: w1, m, v, t and w2 (0.72 with state, 0.9 when dropped). Byte ledger N·(2·weight bytes + 4·k): 96 B, or 72 B with BF16 weights, never 48. | 40 / 13,590 / 4.5 s |
| `learning-softmax-cross-entropy`: "Scores in. One target's surprise out." | `ttf-e06-02`, after `ttf-06-02-text-2` | First logit z0 (steps of ln2/4, default ln 2), target (also tap a logit row), common shift 0–1000 | Logits, z−m, p, loss (log-sum-exp minus z_target), greedy hit or miss, p−onehot and Σ∂ = 0. The +1000 shift changes nothing. Bar widths are checked mid-animation. | 45 / 27,953 / 4 s |
| `learning-kv-cache`: "The prefix grows. So does the cache." | `ttf-e06-04`, after `ttf-06-04-text-2` | Layers, batch, KV heads, head width, bytes per value, prompt length, query heads; scrub 8 decode steps | Bytes = 2·L·B·T·Hkv·D·b (960 B by default; query heads unused). Bytes per token, P(P+1)/2 prefill pairs, decode query reads T = P+n, and per-slot fill state. | 77 / 18,593 / 8.5 s |
| `learning-lazy-evaluation`: "Built is not computed." | `ttf-e08-03`, after `ttf-08-03-text-2` | Evaluation request (none / `eval(loss)` / `eval(loss, grad, w_new)`), w, η | Which nodes are not built, pending or materialized, and their values (L = 1.25, g = −2.5, w_new = 1.25, next L = 0.703125). Time covered by the invented-cost timer. Whether the next iteration is ready. | 31 / 9,987 / 5 s |
| `learning-finite-but-wrong`: "Finite. Repeatable. Wrong." | `eng-e12-02`, after `eng-12-02-lesson` | Kernel layout (also tap the matrix), P row weights a and b | Candidate and reference O = P·V, max error, relative L2 error, backward D0 (6 vs 7.5), the verdict and gate, and highlighted read cells. When P is symmetric (a+b = 1) every check passes: the probe is blind. | 56 / 27,630 / 4 s |
| `learning-recompute-replay`: "Recompute the same forward." | `eng-e13-02`, after `eng-13-02-lesson` | Activation policy (save / recompute with saved weights / recompute with live weights), early-written w2, x | h, y, live vs used w2, ∂y/∂w1 against the reference 3x (12 vs 20), retained bytes (4,096 vs 0) and replayed multiplications (0 vs 1,024). | 28 / 7,966 / 5 s |
| `learning-paired-benchmark`: "Same code. A different story." | `eng-e14-02`, after `eng-14-02-lesson` | Trial order ABBA vs blocked (also tap the schedule), drift per slot, whether the candidate warm-up trial is counted | Measured time for every trial and slot, the median of paired ratios, and the mean paired difference. ABBA cancels linear drift in the mean gap (1.5 ms); blocked order with 1 ms drift gives −2.5 ms; a counted warm-up shifts the mean by −7.5 ms. | 70 / 97,951 / 5.6 s |

Chapter spread: 2, 4, 5, 6 (×2), 8, 12, 13, 14. The six existing illustrations are untouched. All nine scenes are well inside the released limits: at most 77 of 400 nodes, under 100 KB of the 1 MB limit, timelines under 9 s of 120 s, and expression depth at most 16 levels.

### Teaching contract per scene (summary)

- **Float order.** a = 2^E, c = −a, b ∈ {1…4}. Near a the spacing is 2^(E−p). For b+c, the magnitude a−b sits in the next binade down, with half that spacing. Subtracting or adding a afterwards is exact (Sterbenz), so a lost part of b stays lost. FP32 with E=24, b=1 gives 0 and 1, as in the lesson. BF16 with E=24 loses b in both orders, which shows that agreement between orders is not correctness. The scene does not model fused or reordered device reductions.
- **Fan-out.** s = w·w, z = s + w, with z as the loss. The lesson's x example is presented with the leaf as a weight w so that the separate update step is visible. Overwriting gives 3 and updating one slot gives 4 (at w=3). The text alternative warns that a single w can coincide with 2w+1 by accident.
- **Optimizer state.** The conventions are those stated in the lesson: momentum without dampening, decoupled AdamW with β = 0.9/0.99, decay 0.1, η = 0.1, ε = 1e-8, FP32 moments, and gradients in the weight dtype. The ledger counts payload only; activations, counters, workspaces and master copies are excluded.
- **Softmax / cross-entropy.** z = [z0, 0, 0] + shift. Greedy ties go to the lowest ID. The loss is in nats.
- **KV cache.** Dense payload only. Decode work grows with the prefix; the cache removes recomputation, not attention comparisons.
- **Lazy evaluation.** The costs are invented (0.4 / 0.6 / 0.5 / 1.5 / 0.3 ms). This is not an MLX measurement; the point is the evaluation boundary.
- **Finite but wrong.** This is an anonymized 2×2 analogue of a layout defect. It names no device, host or historical probe and does not reproduce any lane mapping.
- **Recompute.** Forward weights are w1 = 2, w2 = 3, and an optimizer writes w2 early. Memory figures are for a 1,024-element FP32 buffer and are not framework measurements.
- **Paired benchmark.** Underlying times R = [10,20,10,20] and C = [9,18,9,18] ms; slot k adds drift·k; a counted warm-up adds 30 ms to C0. All numbers are synthetic.

## Verification evidence

The oracle produces **6,135 cases**:

| Scene | Cases | Frames |
| --- | ---: | ---: |
| Float order | 1,176 | 2,352 |
| Fan-out | 882 | 1,764 |
| Optimizer | 1,440 | 2,880 |
| Softmax | 720 | 1,440 |
| KV cache | 336 | 672 |
| Lazy evaluation | 495 | 990 |
| Finite but wrong | 350 | 700 |
| Recompute | 576 | 1,152 |
| Benchmark | 160 | 320 |

Every case is checked at 320 (compact) and 960 (expanded). The cases cover state extremes, every enum option, step boundaries just before and after each reveal, and intermediate animation times.

The oracle computes everything independently of the scene AST:

- exact `Fraction` rounding (round-half-even), cross-checked against `struct` FP32/FP16 and a bit-level BF16 conversion;
- a reverse-mode tape with fan-out and a central-difference check;
- optimizer objects that carry or drop their state;
- `math.log`/`math.exp` cross-entropy with finite-difference gradients;
- cache bytes by explicit element enumeration;
- a lazy graph that evaluates dependencies;
- an index-level transposed read compared with a reference matmul;
- a replay tape with a central-difference reference at forward-time weights;
- explicit ABBA and blocked schedules with `statistics.median`.

Readouts are compared within 0.000501, which allows for three-decimal display rounding. Geometry is compared within 1e-7.

Each frame also passes:

- finiteness of all geometry;
- the connector rules from the systems verifier;
- a conservative headless layout lint (0.62·fontSize glyph advance, as in the package): visible text stays inside its card with 6 units of bottom padding and inside the canvas, no two texts overlap, and no text is under 17 scene units.

**Negative controls.** There are 22 controls, at least two per scene. Each must be rejected because the mutated readout or geometry itself mismatches the oracle, or because the runtime refuses the arithmetic. Where noted, a control is also shown to pass an easy case, which demonstrates that it is a realistic, hidden bug.

| Scene | Rejected mutation |
| --- | --- |
| Float order | Ties rounded away from zero (passes at E=23, rejected at E=24) |
| Float order | b+c rounded on a's coarser grid (wrong binade) |
| Fan-out | Gradient overwritten instead of accumulated |
| Fan-out | Weight updated during backward |
| Optimizer | Momentum state silently reset |
| Optimizer | Ledger forgets gradient buffers |
| Softmax | Raw-logit exponentiation for p0, p1 and p2 (passes at shift 0, the runtime refuses it at shift 1000) |
| Softmax | Gradient sign flipped |
| Softmax | Frozen probability bar mid-reveal |
| KV cache | Query heads used instead of KV heads |
| KV cache | Missing K/V factor 2 |
| KV cache | Constant decode work |
| Lazy evaluation | `eval(loss)` claims w_new was materialized |
| Lazy evaluation | Next loss evaluated at the stale weight |
| Finite but wrong | Finiteness-only gate (passes on a symmetric P, rejected on the lesson's P) |
| Finite but wrong | D row computed from the reference output |
| Recompute | Replay reads live weights despite a snapshot |
| Recompute | Recompute still retains the activation |
| Benchmark | Summary reports the hoped-for gap instead of the data |
| Benchmark | Counted warm-up silently dropped |

**Runtime contract.** For each scene the verifier checks that:

- fixed-seed replay reconstructs the same frame;
- reduced motion starts at the authored final frame and cannot play;
- the registered reference hook passes and an unregistered one reports failure;
- out-of-range and infinite state is rejected;
- `eval`-like operators and overflow are rejected;
- `toVisualExperience` round-trips;
- the delivered overlay contains no private host, fleet, wallet or incident identifiers (pattern check).

**Curriculum.** The verifier compiles the full course in memory with the base, systems and learning overlays plus the practical and recovery overlays, through `assemble()` and the released SDK `compileCourse`. It also runs `validateCourse` separately on the combined course. The result is 14 chapters, 56 episodes and 15 visuals, with one illustration per episode and a single `course-core-svg-v1` extension. Each visual block directly follows its anchor.

**Browser QA (`--browser`).** It runs the delivered SDK experiences through `fromVisualExperience` and the built `VisualPlayer`. A loopback-only server serves them, and every non-local request is aborted. For every scene and viewport it checks:

- keyboard timeline seek changes the actual SVG;
- every native control works: arrow keys on number sliders, `selectOption` on enums, a touch tap (or click on desktop) on booleans;
- every in-canvas handle works through keyboard (Enter, or arrows for the fan-out drag) and through a touch tap, click or pointer drag;
- time and every control value survive resizing across the 800-pixel breakpoint and back;
- at three timeline positions there is no text overflow, no text-to-text overlap, no text escaping its card, no page horizontal overflow, and no font under 14 px;
- play/pause works;
- reduced motion disables play and opens the full text equivalent.

Screenshots and `report.json` go only to a mode-0700 temporary directory (`private-learning-visual-qa-*`), never to the repository. A representative subset of screenshots was reviewed by eye: eight scenes, each at one or two widths between 320 and 1440. Not all 90 images were inspected. That review, together with the oracle and the lint, led to these fixes:

- the cache bar scale, which the oracle caught being wrong;
- tight bottom padding, which the lint now enforces;
- shortened header kickers;
- the combining-macron gradient notation, replaced by the lesson's own `bar(w)` notation.

## Commands (all run from the worktree, real results)

```sh
node scripts/create-learning-visual-scenes.mjs   # writes the two JSON files; rerun is byte-identical
npm run build                                    # {"kind":"full-curriculum-bundle",...,"chapters":14,"episodes":56}
npm test                                         # tests 15, pass 15, fail 0
npm run verify:visuals                           # 384 + 1,110 + 12,270 frames; 3 + 9 + 22 negative controls rejected
node verification/learning-visuals.mjs --browser # browserCases 45, Chrome 155.0.8059.40, min font 15.62 / 14.31 px
npm run verify:math                              # exit 0
```

The oracle needs Python 3 and nothing else. Browser QA resolves the installed `esbuild` and `playwright` next to the released package and uses installed Chrome. It does not modify package manifests or lockfiles.

## Limits and gaps

- **No logarithm in the released expression language.** In the softmax scene, z0 moves on a grid of ln2/4 steps (29 values), and the log-sum-exp value ln(e^z0 + 2) is tabulated at those grid points using a midpoint comparison tree. Exponentials, probabilities, gradients and argmax are all evaluated live. The oracle recomputes the loss with `math.log` and catches any table error. The package was not modified.
- **Expression depth is 16.** The float scene places the format branch outside the power and displays exact results without a rounding wrapper so that it stays within that bound.
- **The compact layout scales with its container.** Below the 800-pixel container breakpoint the 320-unit layout fills the width, so at 700 px text renders large (about 36 px). This is readable, but it uses a lot of vertical space, matching the systems scenes. The final embedding should keep a reasonable container width.
- **Text measurement is approximate.** The headless lint is conservative, and the browser checks use real Chrome glyph boxes. Neither is a human screen-reader audit, Safari or physical-device testing, or native qualification. There is no RN/native renderer.
- **Two other scripts still use only the older overlays.** `scripts/bind-recovery-runtime.mjs` and `scripts/stage-worked-examples.mjs` assemble with only the `visuals` and `systems-visuals` overlays. The brief did not allow editing them. The `npm run build` bundle now includes the learning overlay, so its digest changes. The parent should decide whether those staging/recovery paths should also include `content/learning-visuals.json` before any release or package step.
- The headless verifier compiles in memory and writes nothing. `npm run build` writes the usual ignored `dist/` outputs.
- No commits, pushes, tags or publication were made, and no network service, GPU, worker or remote host was touched.

## References

Reviewed 2026-10-13. The examples, wording and layouts are original. The lessons' own cited sources establish the general operation contracts: IEEE-754 rounding, reverse-mode autodiff, the PyTorch optimizer and cross-entropy interfaces, MLX lazy evaluation, PyTorch checkpointing, and paired benchmarking practice. This batch introduces no new external claims, and every number shown comes from the episode text or is labelled synthetic.
