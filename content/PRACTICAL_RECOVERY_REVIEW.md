# Practical recovery qualification

**Publication hold:** this prototype's numerical/runtime checks passed, but its
canonical learning coverage is insufficient. Read
`planning/PRACTICAL_COVERAGE_HOLD.md` before interpreting the results below.
The replacement tasks and baseline practical alternatives must be strengthened
and requalified; private0.1.3 is not published or activated.

The candidate adds two reviewed transfer tasks to each existing practical family:
graph directional sensitivities and momentum state; attention directional changes
and shared key/value gradients; configuration coverage and current same-layer work
ranking. They retain the original three objectives/families. New task IDs cannot
substitute for an additional independent family.

These contracts teach explicit mathematical behavior. Forward sensitivities follow
the Jacobian-vector mapping described in the official [JAX documentation](https://docs.jax.dev/en/latest/jacobian-vector-products.html).
The momentum task declares its initial buffer and exact recurrence, avoiding an
implicit assumption about framework initialization; the official [PyTorch SGD
documentation](https://docs.pytorch.org/docs/main/generated/torch.optim.sgd.SGD_class.html)
describes why optimizer conventions need to be stated. The tests use standard-library
CPU implementations; they do not execute JAX, PyTorch, MLX or a mining worker.

All 74 generated case outputs matched separate references: reverse-mode graph
derivatives versus forward tangents, analytic attention pullbacks versus directional
dual-number propagation, analytic training derivatives, streaming configuration
coverage, and rational arithmetic for timing/medians. Another 655 central finite
differences checked graph/attention tangents and gradients throughout optimizer
trajectories. All 74 wrong-key controls and 18 substantive algorithm mutants were
rejected. Initial median fixtures hid a retry-counting mutation; discriminating
retry, uneven-rate, zero-work and even-count cases were added before acceptance.

The actual released Core0.1.3 sandbox broker graded all six authored positive
programs and rejected a selected substantive mutation for each in real pinned
arm64 containers. Fake self-awarded pass output was rejected; only runner/source
files were mounted. Observed positive durations were227–315ms. Each attempt used
128MiB,0.5CPU,5seconds,64KiB combined output and no network/GPU. These observations
qualify the tested fixture protocols, not all possible inputs or physical hosts.

The new registry is652,815bytes. Its first six fixtures are exactly the original
92-case registry; the original registry/file/identity is retained for existing
enrollments. A separate evaluator identity serves a new immutable course version.
The six bank questions are not inserted in the free baseline or the learner bundle;
host approval still pins the installed creator, evaluator and fixture bytes.

Each assigned coding transfer check estimates30minutes and consumes one additional
episode/remediation cycle. Estimates are planning constraints, not a stopwatch or
guarantee of learner effort. Existing course quotas/deadlines still apply. Neither
qualification nor an approved bank authorizes unlimited retries, raises a cap,
starts the actual owner's course clock, or grants mastery without an independent
submitted result.

The independent CPU/Docker qualification and SDK assembly passed. Actual released
Core0.1.4 HTTP/PostgreSQL acceptance completed all56episodes, recovered all three
practical families after failures, rejected premature completion in every episode,
and kept a separate exhausted learner blocked with unchanged gates and no new plan.
The test used a disposable database and left its operator unenrolled. Browser and
native publication acceptance remain separate gates until recorded after execution. Hosted private CI remains unavailable while the account's
billing restriction prevents jobs starting. This is not a claim of live tutoring,
learner understanding, runtime generation of arbitrary code exercises or complete
platform delivery.
