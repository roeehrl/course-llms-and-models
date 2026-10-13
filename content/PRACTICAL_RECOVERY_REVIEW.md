# Corrected full-coverage practical suites

The private0.1.3 candidate replaces each pair of optional alternative code tasks
with one canonical suite requiring BOTH original computations. It retains the
three practical families and minimum independent-family thresholds; gate item IDs
change in the new immutable version. Existing0.1.2 enrollments and the original
92-case grader remain pinned to their original bytes.

Autodiff requires graph VJP and shared-parameter training. Decoder requires
attention VJP and a complete decoder step. Qualification requires numerical audit
and release-evidence audit, including useful completed-work timing, storage lifetime
and fault/cancellation gates. Every replacement question requires the same complete
canonical results as well as its transfer component. A partial or forward-only
result cannot grant credit for the full practical.

The transfer tasks cover directional sensitivities, momentum state, shared key/value
gradients, raw qualification coverage and fresh same-layer ranking. Qualification
flags are recalculated from raw channels and identity/path evidence; a supplied
pass claim cannot hide wrong numerics. Differences between framework conventions
are explicit in the protocol. Background sources: official [JAX differentiation](https://docs.jax.dev/en/latest/jacobian-vector-products.html)
and [PyTorch SGD](https://docs.pytorch.org/docs/main/generated/torch.optim.sgd.SGD_class.html).
Tests use standard-library CPU algorithms and do not execute a mining worker.

Independent reference verification passed54 canonical suite cases and78 fresh cases.
The canonical suite fixtures cover all92 original inputs. All132 missing-canonical-task
controls and78 wrong-transfer-key controls were rejected. Twenty-two substantive mutants,
including false qualification claims, were rejected; another655 finite differences
checked graph/attention tangents and gradients through optimizer trajectories. The
original197 derivative checks and32 baseline mutations remain separate regressions.

Actual released Core0.1.4 sandbox qualification passed all9 positive fixture batches
and rejected a selected substantive fault for each. Fake self-awarded pass output
was rejected. Only runner/submission files were mounted; expected outputs stayed in
the host. Each attempt retained128MiB,0.5CPU,5seconds,64KiB output and no network/GPU.
Largest complete observed/reference output envelope was55,977bytes. These tests prove
the tested computations and isolation; they do not establish learner understanding
or all possible inputs.

Registry data is split into three files:431,305bytes autodiff,749,493bytes decoder,
768,719bytes qualification. Each is below1MiB and has its own digest-pinned evaluator
identity. No discriminating case was removed to fit an envelope. The API's conservative
preflight needs the generic bounded-batch implementation in Core PR12; the hard
whole-attempt time/output/admission limits must remain unchanged. The corrected
content cannot be activated under an API that lacks that implementation.

Each fresh suite transfer estimates45minutes and consumes one additional episode
and remediation cycle. The existing300-minute,20-episode and per-concept caps are
unchanged; six deliberate recovery assignments cost270 planned minutes. These are
planning estimates, not a reading timer or a guarantee of required study time.

Eleven assembly/binding tests, the112-family numerical/choice authoring checks and
all existing math/visual/baseline-practical regressions passed. Corrected-content
released HTTP/browser/native publication remains pending Core0.1.5 release and
actual reexecution. The prior3561... prototype was superseded. Do not treat its
full-path pass as acceptance of this corrected digest. No paid provider call,
actual owner enrollment, new grader activation or course publication occurred.
