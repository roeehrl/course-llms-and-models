# Practical capstones: private authoring and verification review

Reviewed 2026-10-12T17:23:23Z. This record covers the five assigned private artifacts only. It supplies fixture content and authored implementation qualification, not parent API/UI integration, publication, learner attainment or production sandbox certification.

## Deliverables and exact contracts

- `runtime/code-fixtures.json`: schemaVersion 1, id `llm-practical-code`, version `0.1.0`; six Python fixtures with 92 deterministic cases. Each case has only id, input, expected, absoluteTolerance and relativeTolerance. The complete pretty-printed file is **397,059 bytes**, below 1 MiB; no fixture exceeds 18 cases, below the 100-case limit.
- `runtime/code-reference.py`: private standard-library authoring oracle and deterministic case generator. Default invocation checks the existing registry. Only explicit `--write-fixtures` rewrites that assigned JSON file. It is not a learner dependency, runtime grader or public asset.
- `verification/practicals.py`: independent numerical/trace oracles, protocol/schema/resource checks, deliberate broken implementations, released-SDK overlay validation and optional actual Docker-broker qualification. It executes only authored verification programs locally, never an uploaded learner submission.
- `content/practicals.json`: one server evaluator extension, six SDK code assessments and six bindings to existing episodes/gates. There are no new episodes or objective definitions. The extension entrypoint is exactly `runtime/code-fixtures.json`; capability is `assessment.evaluate`; platforms is web, consistent with the current course.
- `content/practicals-review.md`: this instructor-only audit and reproduction guide.

The extension integrity is `sha256-e4254dd60781f612e3cdf1a3633833ab2c0d59cc17047331f71945ccdac6a51f`. It is the SHA-256 of the exact fixture-file bytes including the final newline, with the released SDK's required `sha256-` prefix. The registry id/version and each fixtureRef must be preserved by the parent registry adapter. A digest is an integrity check, not execution readiness or trust in educational validity.

The solver protocol is Python `solve(data) -> JSON`. Every assessment specifies all inputs, shapes, masks, reductions, derivative conventions, ordering, exact output keys and applicable tolerances. Starter main blocks contain complete practice inputs and can invoke the learner's implementation after it is written. They intentionally do not provide practice answer values, held-out cases, expected outputs or a full implementation. All six practice inputs are disjoint from the graded inputs and their calculations agree between the two authoring oracles. The starter's main block is not executed when the broker imports the submission.

## Existing bindings and alternative assignments

| Practical family | Variant / assessment | Fixture | Existing episode / gate | Existing objective | Cases |
| --- | --- | --- | --- | --- | ---: |
| `llm-practical-autodiff` | `llm-code-autodiff-vjp` | `llm-autodiff-vjp-v1` | `fnd-e04-04` / `fnd-g04-04` | `fnd-o04-04` | 18 |
| `llm-practical-autodiff` | `llm-code-autodiff-training` | `llm-autodiff-training-v1` | `fnd-e04-04` / `fnd-g04-04` | `fnd-o04-04` | 12 |
| `llm-practical-transformer` | `llm-code-attention-pullback` | `llm-attention-pullback-v1` | `ttf-e07-04` / `ttf-g07-04` | `ttf-o07-04` | 18 |
| `llm-practical-transformer` | `llm-code-decoder-step` | `llm-decoder-step-v1` | `ttf-e07-04` / `ttf-g07-04` | `ttf-o07-04` | 10 |
| `llm-practical-qualification` | `llm-code-qualification-numerics` | `llm-qualification-numerics-v1` | `eng-e13-04` / `eng-g13-04` | `eng-o13-04` | 18 |
| `llm-practical-qualification` | `llm-code-qualification-evidence` | `llm-qualification-evidence-v1` | `eng-e13-04` / `eng-g13-04` | `eng-o13-04` | 16 |

These are substantive transfer variants, not renamed versions of the same item:

- **Autodiff family:** a general DAG with shared nodes, repeated operand/input slots, arbitrary seeded roots and multiple fresh VJPs; versus repeated optimization of a shared-intermediate model across unequal microbatches with a once-per-batch regularizer. The latter adds state-transition, normalization and update-order obligations.
- **Transformer family:** an isolated masked-attention pullback with rectangular query/key counts, differing key/value widths and arbitrary masks; versus a complete tiny causal decoder with shared embeddings, positions, two RMSNorms, two residual paths, a tanh feed-forward stage, masked token loss, all parameter gradients and one update. The attention variant is component evidence; the decoder variant is composition/training evidence. Neither alone proves all artifacts and defense required by the broad capstone objective.
- **Qualification family:** a numerical report over supplied forward/gradient channels with identity/path/shape/tolerance checks; versus a timing, unique-accepted-work, retained-storage and fault-evidence audit with cancellation and artifact binding. The second requires event/interval reasoning rather than another floating-point comparison.

Both variants of a family use the **same stable familyId**. Passing both does not create two independent families. The intended parent gate combines existing knowledge families with required practical-family evidence. Merely increasing minimumIndependentFamilies is not a durable substitute for explicitly requiring the practical family if future remedial families are added. The verification program injects the overlay into an in-memory copy of the current bundle and sets the three affected gates to three families for schema testing; it does not persist that policy or implement authoritative eligibility.

## Retry, help and exposure limits

Choose one eligible variant for an attempt; do not concatenate both alternative fixtures or require learners to complete both simply because both bindings exist. Record assessment/fixture version, registry digest, prompts, assistance, answer reveal, attempts and any returned diagnostics. After failure or help on one variant, the other is a candidate transfer task only if its solution has not already been exposed. It has different obligations, not merely changed numbers.

Full solutions, shared implementation templates or assistance broad enough to solve both variants can contaminate both. The lesson chapters already contain worked engines and decoder examples; adapting those can produce correct behavior without demonstrating unaided authorship. The platform must distinguish assisted practice, transferred implementation and independent defense. Code outputs cannot establish which internal differentiation algorithm was used. Equivalent forward-mode or numerical techniques may match a behavioral contract; inspection/teach-back is needed for an explicit reverse-mode authorship claim.

There are exactly two authored variants per family. Once both are exposed, replaying them or regenerating their numbers is not new independent evidence. Schedule a separately reviewed new assignment or the allowed review/closure path; do not silently award fresh credit or loop indefinitely. No delayed-retention bank or psychometric calibration is claimed. The fixtures are bounded tests and may be memorized if leaked; they are not a tamper-resistant certification.

## Trusted/untrusted boundary

Expected **case outputs** remain only in the private fixture registry and the trusted host grader. The full authoring reference, generator, this review and verification helpers must never be learner assets or automatically served through the runtime directory. The SDK learner projection omits the server extension, grading/fixture references and assessment prompt/starter bank; the parent serves an authorized attempt's prompt/starter separately.

The numerical-audit task intentionally supplies named reference vectors as *problem inputs*. Those are data that the learner must compare against candidate vectors; they are not the grader's expected report. No grader report is included in that task's input. Diagnostic nonfinite values are explicit strings (`nan`, `inf`, `-inf`) so all transport JSON remains finite and compatible with the broker's validator.

For Docker qualification, the verifier extracts an **algorithm-only** authored solver from the private oracle with AST selection. The 11,969-byte submitted program has no fixture generators, seeds, case tables or expected values. It is used only as an instructor qualification submission. Only that submission, the generic runner and per-case inputs enter the container. A real mount probe confirmed `/work` contained only `runner.py` and `submission.py`. No expected registry or full authoring file was mounted. The expected outputs were compared by the host's actual `gradeOutput` path.

Runtime descriptors must advertise readiness only after the parent's real Docker readiness and qualification checks. This overlay has no codeReady field and cannot manufacture readiness from a valid manifest, compiled code or checksum.

## Independent expected-value verification

Expected derivative values are generated with forward sensitivities, independently of the intended reverse-mode implementations. Graph node adjoints are produced by independent additive perturbation coordinates after every node, including constants. Repeated input-node adjoints then contribute to their shared input slot. The independent verifier instead traverses the graph backward and accumulates local derivatives.

The shared-training oracle uses forward-mode sensitivities; verification uses a separately derived analytic chain rule with explicit global-example normalization and regularization. Attention generation uses forward-mode differentiation; verification uses explicit softmax, Q/K/V pullbacks and accumulations. Decoder generation uses forward mode; the independent verifier constructs a separate reverse-mode graph and a separately implemented forward architecture. Additional central differences check graph inputs, model parameters, attention coordinates and all weights of selected decoder cases.

The numerical audit is independently recomputed with Decimal arithmetic on deliberately exact binary-fraction boundary fixtures. The evidence audit is independently checked with rational timing ratios and interval-midpoint enumeration of live storage, versus the reference's event-sweep peak calculation. These independent mechanisms reduce common implementation mistakes but are not proof over every possible input or a second-person review.

Results:

- **92/92** complete case outputs matched the independent oracles.
- **197** additional finite-difference derivative checks passed.
- **32** named broken implementations were rejected by at least one discriminating case each. The verifier prints the failed-case count for every mutation.
- Six algorithm-only positive submissions matched all corresponding expected cases in local checks.
- Released `@course-core/sdk` validation and compilation passed with the overlay injected only in memory; the course remained at **56 episodes**. Every binding points to a real existing objective/episode/gate. Server evaluator and grading references remained absent from the learner projection.

| Family/variant | Deliberate faults rejected |
| --- | --- |
| Graph VJP | overwrite path accumulation, deduplicate operand slots, retain prior query gradients, ignore seeds, overwrite repeated input-slot contributions |
| Shared training | average microbatch means, omit regularization, retain previous-step gradients, update parameters sequentially, use ascent sign |
| Attention pullback | omit score scale, ignore mask, overwrite shared value gradients, omit key gradients |
| Decoder step | remove causal mask, substitute LayerNorm, remove a residual, fail embedding scatter-add, use full sequence length as loss divisor, reverse update sign |
| Numerical audit | ignore artifact identity, ignore selected path, use candidate-relative tolerance, reject inclusive boundaries, accept finite-but-wrong values |
| Evidence audit | time submission only, count retry IDs repeatedly, average speedups instead of median, release owner while views retain storage, sum nonoverlapping allocations, forget earlier escaped fault, ignore cancellation |

The public protocols intentionally define behavior for complete valid task inputs and for the declared malformed comparison channels. They do not require a generic JSON parser/security validator inside learner code. The trusted broker validates the transport envelope independently.

## Actual Docker qualification

The most recent complete run reported readiness `{ready:true, reason:"configured"}` and used pinned arm64 image `python@sha256:55432fc4ef6d07e33c10449312f0ec00071bbb310bb9bd7ba626a31fbbc2cb0d`. Explicit broker options were 128 MiB, 0.5 CPU, 5,000 ms and 65,536 combined output bytes, with no network and no GPU device. No image was pulled or package installed.

| Fixture | Cases | Largest observed/reference output envelope bytes* | Positive report duration (ms) | Actual Docker mutant failed cases |
| --- | ---: | ---: | ---: | ---: |
| llm-autodiff-vjp-v1 | 18 | 12,445 | 259 | 15 |
| llm-autodiff-training-v1 | 12 | 5,806 | 256 | 12 |
| llm-attention-pullback-v1 | 18 | 8,947 | 212 | 8 |
| llm-decoder-step-v1 | 10 | 25,970 | 269 | 7 |
| llm-qualification-numerics-v1 | 18 | 7,340 | 210 | 2 |
| llm-qualification-evidence-v1 | 16 | 3,379 | 212 | 14 |

*Byte counts include case IDs, runner envelopes and newline separators, measured from authored reference/independent-oracle serialization. All actual Docker submissions also passed the broker's output cap. Minor representation differences between correct floating implementations can change byte counts; the largest fixture retains substantial headroom. The limit applies to the selected fixture attempt, including stdout/stderr, not merely one case.

All six positive batches passed; a selected substantive mutant for each failed through the actual host grader. A submission printing a fake passed message was rejected as invalid output protocol. The separate mount probe passed. Durations are observed broker reports, not isolated model benchmarks or a promise about every host/implementation.

An initial test using the OS temporary directory returned execution_failed before grading. The same authored solver passed after test storage was moved under the Docker-visible checkout. This is recorded as an environment/path observation rather than a fixture failure or proof that every OS temp path is unsupported. The verifier now creates its own ephemeral `.practical-qualification-*` storage under runtime, and removes it only after all grades confirm cleanup and the directory is empty. On uncertain cleanup it preserves that specific directory/lock for inspection. Both the abandoned empty test directory and all successful qualification inputs were cleaned. No existing broker's containers or locks were removed.

These are direct broker tests. The parent API, learner code UI, authorized fixture selection, evidence receipt, practical-family gate enforcement, cancellation integration and exposure tracking were not exercised by this task. The parent's public-fixture workflow or ongoing integration is independent evidence; this record does not claim those gates complete.

## Reproduction and maintenance

From the private course root:

```sh
python3 -B runtime/code-reference.py
python3 -B verification/practicals.py
python3 -B verification/practicals.py --docker
```

The optional Docker command imports the existing broker build at `../course-core/packages/sandbox/dist/index.js`; `--broker /absolute/path/to/index.js` overrides that location. Docker and the already-present qualified image are prerequisites. An unavailable image/daemon or failed readiness is a failed qualification, not a skipped passing test. No backend source is edited or rebuilt by this command.

Generation uses fixed private seeds and explicitly targeted fixtures. The checked-in JSON is the authoritative immutable runtime artifact; do not regenerate on learner requests. Exact byte regeneration is verified in this recorded Python/math environment. Cross-platform libm rounding could change the final printed digits, so a new generation environment requires numeric review and a new digest instead of silently rebinding historical attempts.

If the author intentionally changes fixtures before a new release:

```sh
python3 -B runtime/code-reference.py --write-fixtures
```

That command changes only the assigned fixture JSON. Then deliberately update the overlay's integrity to `sha256-` plus the SHA-256 of those exact bytes, rerun verification, and version any already-published assessment/fixture/registry rather than rewriting historical evidence. This task did not change the registry's requested id/version or silently modify parent assembly scripts.

## Authored-file and consumed-contract fingerprints

The review is intentionally excluded from its own hash list. These identify final authored bytes and the inspected installed contracts; concurrent parent work may change the latter after qualification.

- `runtime/code-fixtures.json`: `e4254dd60781f612e3cdf1a3633833ab2c0d59cc17047331f71945ccdac6a51f`
- `runtime/code-reference.py`: `09049db6623c0d094e8d4ac4c6dbead33b14a3c3098506a1d98afbe06f5b2f95`
- `verification/practicals.py`: `0f4077faf40a32cb4d0e3d6c21c937fdec4bb713ed0ba8a4efcaf6c9aa6d10aa`
- `content/practicals.json`: `cd6a9e2604fb1c8d8f4d583fed874193b23f98753a927b7b4a1eab4313feb688`
- `node_modules/@course-core/sdk/package.json`: `de1691d627c7788816a509fded10e4f42c77c3c005b62ff0f38cad2eef1183ba`
- `node_modules/@course-core/sdk/dist/types.d.ts`: `0f7877cb1e6d8095ccd07289209be747982e04df8c9c6f4da60ce23db1c09433`
- `course-core/packages/sandbox/dist/index.js`: `0f7b9f561d4ee154de6f565ee25af7b5c141d581d71c29715dbe0d6b26c433f3`
- `course-core/packages/sandbox/dist/runner.py`: `6815539ee7c3ac9ae728e5b384d3869f35ca9cebaa9fea9ea8079159f4173a0f`

Verification authoring environment: Python `3.9.6`, Node `26.9.0`; actual submitted code executed in the pinned Docker image above. Python reference, solvers and numeric verifiers use the standard library only. No GPU, worker, wallet, secret, SSH or external message was involved. No commit/push was performed. The five named deliverables are the only authored files; temporary broker inputs were created solely for CPU qualification and removed after confirmed cleanup.
