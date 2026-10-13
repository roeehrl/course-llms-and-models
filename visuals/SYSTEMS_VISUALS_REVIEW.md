# Systems visual studies — authoring and qualification

Private course material. Reviewed 2026-10-12. These are three original declarative illustrations with bounded state, actual arithmetic, intermediate-frame checks, and responsive browser qualification. They award no assessment credit and are not GPU/kernel/protocol qualification.

Final local result: **1,110 CPU frame checks, nine rejected negative controls, and 15 browser cases pass**. Chrome **154.0.8037.98** was tested at 320, 390, 700, 834 and 1440 pixels. Keyboard, mouse drag, actual touch taps, play/pause, resize preservation and reduced motion passed. No renderer/console errors, visible scene-text overlaps, canvas text overflow or page overflow occurred. Minimum rendered scene font sizes were 15.62px at 320 and 14.31px in the tested 834px expanded view. Generic runtime controls retain the package's existing styles; this font measurement concerns authored SVG text.

| Scene               | Nodes | Compact serialized bytes | Timeline |
| ------------------- | ----: | -----------------------: | -------: |
| Stable attention    |    53 |                   57,860 |      5 s |
| Microbatch boundary |   141 |                   32,324 |     11 s |
| Tiled memory        |   158 |                   47,601 |    5.5 s |

Qualified development renderer: `course-core-svg-v1` version `0.1.0`, fingerprint `sha256-4e74932c0c034f68d58397f367fab73840ec456a71c7bf08fe4b6bce419c2413`. The latest private temporary evidence directory is `private-systems-visual-qa-wdmsit` under the system temporary directory, containing 30 PNGs and `report.json`. The verifier prints its full path; rerunning creates a new directory. Generated JSON deliberately uses deterministic two-space `JSON.stringify` output, as does the existing private scene authoring workflow.

## Delivered files and bindings

| Scene                                                                | Existing episode                                                            | Insert after       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------ |
| `systems-stable-attention` — **One query. A careful mixture.**       | `ttf-e07-02` — Attention scores, masking, softmax and weighted values       | `ttf-07-02-text-1` |
| `systems-microbatch-boundary` — **Many small journeys. One update.** | `sys-e10-02` — Microbatches, bubbles, stale work and backpressure           | `sys-10-02-text-1` |
| `systems-tiled-memory` — **Move the tile. Keep the sum.**            | `sys-e09-02` — Memory hierarchy, tiling, occupancy and arithmetic intensity | `sys-09-02-text-1` |

- `scripts/create-systems-visual-scenes.mjs` is the trusted authoring script. It validates bindings against existing content and writes only the two assigned JSON files.
- `visuals/systems-scenes.json` contains the bounded scenes and binding records.
- `content/systems-visuals.json` contains SDK `VisualExperience` objects produced by `toVisualExperience`, their renderer declaration, and the same bindings. Every delivered object round-trips through `fromVisualExperience`.
- `verification/systems-visual-reference.py` is an independent Python standard-library CPU oracle. It neither reads scene JSON nor evaluates the scene AST. It emits cases to stdout; no seventh tracked fixture is required.
- `verification/systems-visuals.mjs` compares the actual headless geometry and readouts against that oracle, runs negative controls, compiles the full curriculum in memory through the released SDK, and optionally hosts a private browser QA page.
- This review records the contract, evidence, commands, and integration boundary.

The original affine/gradient/stride scenes and their authoring/verification files were read only. The assembler, learner, API, public visuals package and public SDK were not edited. Other concurrent repository changes belong to the parent.

## What each animation means

### Attention: stabilize a row, then mix values

The query is `[a,1]`, with adjustable `a ∈ [−2,2]`. Keys are `[1,0]`, `[0,1]`, `[−1,1]`; scalar values are `[2,−1,4]`. Each score is the dot product divided by `sqrt(2)`, plus a shared offset from 0 through 1000. The offset cancels algebraically before exponentiation in the bounded AST. This is equivalent to subtracting the allowed-row maximum; it also keeps the expression within the runtime's existing depth bound.

Controls select all keys, exclude key 3, or exclude every key. Masked keys have exactly zero weight and do not affect the maximum or denominator. An all-masked row shows **Undefined** and zero placeholder bars; it is explicitly not a valid normalized distribution. That is this teaching contract, not a claim about how every framework handles all-masked rows.

The probability bars reveal the **fixed final probabilities** between 1.7 and 3.4 seconds. Their intermediate lengths are `p × reveal`, not changing model confidence or a new probability distribution. Score-to-key and key-to-mixture connectors show the calculation order. Readouts show the complete calculation throughout. At `a=1`, no mask, the rounded output is `1.192`; adding 1000 changes neither the probabilities nor the output. Values are rounded to three decimal places only for display.

The query card can be dragged or adjusted with arrow keys; the equivalent labeled slider is always available. Changing the mask is a native select control. The illustration is one scalar-output attention row, without dropout, output projection, learned training, cross-entropy or an attention backward pass.

### Microbatches: returned work is not an optimizer update

Three logical stages use an idealized fill/drain schedule. For zero-based microbatch `j` and stage `s`, forward occupies slot `j+s`; backward occupies slot `9−j−s`. Each illustrated slot lasts one second. These durations are explanatory, not measured latency or a proposed production scheduler.

The separate scalar numerical example is `prediction=w*x`, loss `(prediction−y)^2/2`, with:

- μ1: `[(x,y)=(1,2)]` — one example;
- μ2: `[(2,0),(1,1)]` — two examples;
- μ3: `[(-1,3)]` — one example.

All work uses the same old `w`. Gradient sums are `w−2`, `5w−1`, `w+3`. The logical-batch gradient is their sum divided by **four examples**, not three microbatches. At `w=1`, the gradient sums are `−1,4,4`, the mean is `1.75`, and one update with rate `0.1` gives `0.825`.

Stage-1 returns occur at 8, 9 and 10 seconds for μ3, μ2 and μ1. The ledger reveals only returned sums. The full-mean readout is an analytic preview for the specified four examples; it is distinct from the returned-work ledger. The parameter remains unchanged until all four examples return at 10 seconds, when exactly one update is shown. A rewind reconstructs the state; playback does not run repeated training. The scalar model is not being presented as a three-layer network.

Expanded layout shows the complete F/B schedule and moving time cursor. Compact layout shows the current operation on each stage, the returned-example count, gradient ledger and optimizer boundary. Labels and μ indices carry meaning independently of color. This scene does not claim to reproduce a live worker's queue, cache, stale-work policy, or optimizer.

### Tiling: the buffer changes, the partial sum survives

A selected 2×2 output tile is computed from:

```text
A = [[ 1, 2, 0],     B = [[2,  1, -1],
     [-1, 3, 1],          [0,  3,  2],
     [ 2, 1, 4]]         [1, -2,  1]]

C = [[ 2,  7, 3],
     [-1,  6, 8],
     [ 8, -3, 4]]
```

The first scratch load covers `k=0,1`; the second covers `k=2` plus padding. Pending loads show an ellipsis. Products accumulate discretely at 1.5, 2.4 and 4.4 seconds; valid output cells are written once at 5 seconds. Changing the input tile never resets the accumulator. The edge row/column controls expose padded input zeros and invalid output cells. Padded cells are labeled **PAD**, invalid output cells are **outside**, and neither performs an out-of-bounds access.

For a tile with `R` valid output rows and `C` valid columns, the complete scalar input-read count is `3R+3C`, output stores `RC`, and FP32 traffic `4(3R+3C+RC)` bytes. The naive, no-cache input count is `6RC`. Those are idealized global scalar operations for **one selected output tile**, not transaction counts, whole-matrix traffic, bandwidth, or a measured speedup. The scene uses exact small-integer arithmetic, not a floating-point precision or rounding simulator. Physical registers, occupancy, bank conflicts, barriers and GPU execution are outside its scope.

Tap a cell in A to select its output row tile, or a cell in B to select its output column tile. These actions also work via keyboard focus and Enter/Space; labeled range controls provide an equivalent path. Transparent interaction surfaces sit above glyphs so text does not swallow taps.

## Verification

The Python oracle supplies **555 cases**, checked in both layouts for **1,110 actual runtime frames**. Cases cover state extremes, a +1000 logit shift, partial bar interpolation, empty/masked attention, schedule boundaries immediately before/after returns, zero learning rate, two tile loads, partial k-sums, all four output-tile positions, padded scratch cells and final stores. Python uses `math.exp`, explicit per-example gradient loops, independent task-slot enumeration and explicit memory-address lists. Central finite differences separately check the batch gradient.

Readout tolerance is `0.000501` for three-decimal display rounding; geometry tolerance is `1e-7`. Scene values must remain finite. Runtime replay with a fixed seed reconstructs the same frame. Reduced motion starts at the authored final time and cannot play. Reference-check hooks pass only when explicitly registered by trusted verification code; an unregistered hook fails rather than asserting success. These callbacks are local validation hooks, never server grading authority.

Nine deliberately wrong scenes must be rejected by the checker:

1. a probability leak into a masked key;
2. a numeric result for an empty attention row;
3. a frozen probability bar at an intermediate time;
4. an optimizer update before all gradients return;
5. an unweighted mean of unequal microbatch means;
6. a reset accumulator when the next tile loads;
7. padded cells counted as global reads;
8. a filled connector obscuring the diagram;
9. a connector bend that escapes the scene.

Malformed expression operators, overflow, infinity and out-of-range state updates are rejected. The existing public limits are not enlarged. All three scenes are well below the 400-node and 120-second limits. SDK cue events remain `cue-<index>` identifiers; prose remains in `scene.timeline.cues[].text`.

Browser verification mounts the **delivered SDK experiences through `fromVisualExperience` and the built `VisualPlayer`**, not an alternate drawing implementation. Chrome runs headlessly with `--disable-gpu`; the loopback harness blocks requests to every nonlocal origin. Screenshots and a JSON report are written only into a mode-0700 private temporary directory, never the public repository. No provider, worker, wallet, GPU experiment or mining operation is involved.

The browser checks keyboard range controls, keyboard/tap scene manipulation, timeline changes, play/pause, state and time preservation across compact/expanded resizing, reduced-motion playback disabling and the automatically visible textual equivalent. It rejects page/renderer errors, horizontal overflow, visible SVG text escaping the canvas, text-to-text overlaps, and scene text below 14 CSS pixels in the tested viewport/container combinations. The compact breakpoint is **800 container pixels**, chosen to keep the expanded 960-unit diagram's labels readable. The parent's final embedding may add padding; it should retain a readable container width and recheck the connected lesson.

Manual screenshot review caught and corrected filled/over-bent connectors, glyphs intercepting matrix taps, and crowded padding labels. Compact and expanded screenshots were reviewed after those corrections. These checks do not substitute for a human screen-reader audit, live connected-course acceptance, or native qualification.

## Reproduce and integrate

From the private repository root, the development build used:

```sh
export COURSE_VISUALS_ARTIFACT="$(node --input-type=module -e 'import {pathToFileURL} from "node:url"; import path from "node:path"; console.log(pathToFileURL(path.resolve("../course-core/packages/visuals/dist/headless.js")).href)')"
node scripts/create-systems-visual-scenes.mjs
node verification/systems-visuals.mjs
node verification/systems-visuals.mjs --browser
```

This explicitly consumes the built `../course-core/packages/visuals/dist/headless.js` artifact. The scripts do not build it, import sibling source, or silently fall back to a development checkout. The oracle requires Python 3; browser QA resolves the installed open-source `esbuild` and `playwright` tooling beside the selected artifact and uses installed Chrome. It bundles the trusted harness in memory and leaves package manifests and lockfiles untouched.

For final released consumption, the parent must install the approved released `@course-core/visuals` artifact in the private toolchain, provide its QA tooling, unset `COURSE_VISUALS_ARTIFACT`, regenerate these two JSON artifacts, and rerun verification. The default import is the package's public `@course-core/visuals/headless` export. The SDK itself is the released v0.1.0 package throughout. Current development output is explicitly **not** a claim of a published visuals release.

The authoring script fingerprints the selected built runtime's JS/CSS/JSON files plus manifest version/dependencies/peer dependencies, matching the current renderer registration fingerprint convention. Any runtime rebuild requires regeneration, even at the same package version. The fingerprint identifies the renderer implementation; it does not certify the lesson math.

The parent owns merging this overlay with `content/visuals.json`, deduplicating the single `course-core-svg-v1` extension declaration, regenerating all scenes against the same released artifact, and final assembly/publication. Do not append two conflicting renderer declarations. The read-only in-memory verification compiles all **56 episodes** with this three-scene overlay; it does not write a combined overlay or distribution bundle. No changes were made to the parent's assembler or original three scenes.

Native can consume the declarative data and headless arithmetic through an appropriate future adapter, or show the supplied textual equivalents. **No RN/native renderer, device build or native test is claimed.** No commits or pushes were made.

## Primary references

Reviewed 2026-10-12. The numerical examples and layouts above are original; these sources establish the general operation contracts, not this implementation's correctness.

- [PyTorch scaled dot-product attention](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html): score scaling, allowed-position masks, row normalization and value mixing. This illustration has no dropout and makes its own empty-row behavior explicit.
- [GPipe paper](https://arxiv.org/abs/1811.06965): microbatch pipelining and synchronous batch updates. The displayed slot schedule is an intentionally idealized teaching construction.
- [NVIDIA CUDA Best Practices Guide, shared memory in matrix multiplication](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab): reuse of loaded tiles. The scene's read/write counts follow its explicitly narrower, cache-free scalar model, not performance figures from that guide.
