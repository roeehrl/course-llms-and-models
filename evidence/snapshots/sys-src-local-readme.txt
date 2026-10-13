# STRATA local patched IOTA v4.12.10 worker

This is a reproducible, independently runnable CLI build of the public
`macrocosm-os/iota` v4.12.10 worker with STRATA's tested client fixset. It does
not modify the installed IOTA Train at Home application and it never starts a
worker during build, installation, or doctor checks.

## Trust and compatibility boundary

### October 11 integrity check outside the host's welcome budget (control surface, not a patch)

The supervisor used to run the full installation-integrity hash
(`verify_installation_integrity`) at the patched-worker spawn boundary, inside
the official host's welcome budget (see the September 22 section below). On
2026-10-11 that hash took 7.4 s on the Studio (load 50-170, swap 16.9 of
18.4 GB), and the worker bound its control port 12-16 s after the host instead
of 6-8 s. Every start failed with `startup readiness was not proven within 45s`
for 40 minutes.

`MountedSupervisor.run` now runs the full verification just before it launches
the official host and keeps an lstat snapshot of the package (inode, size,
mtime, mode, owner of every entry; 22,641 entries in about 0.5 s). The spawn
boundary compares a fresh snapshot with it and refuses to start the worker if
anything was added, removed or changed (`installed package changed after its
pre-launch verification: <path>`). With no snapshot it falls back to the full
check. The first start with this change was ready 7.2 s after the host, under
load 34.

### October 11 run avoid and emergency leave files (control surface)

The supervisor reads the app's `run-avoid.json` from the proxy state directory:
`{"schema_version": 1, "runs": [{"run_id": ..., "until": ISO-8601 or null}]}`,
owner-only, at most 32 entries, with expired entries dropped. It passes the
list as `STRATA_SN9_RUN_AVOID` and records it in the session as
`patched_worker_run_avoid` (runs and rejected entries). It always passes the
path of `emergency-leave.json` as `STRATA_SN9_EMERGENCY_LEAVE_FILE`, which the
worker itself reads at every upload window (patch 45).

### October 11 attention path per chip (control surface, not a patch)

The TensorOps GQA kernel (`iota-v4.12.10-tensorops-gqa.patch`) was qualified on
an Apple M4 Max only. On Apple M5 GPUs (M5 Max and M5 Pro, macOS 27.0 and
27.0.1) it returns wrong results: measured on 2026-10-11 against an fp32 CPU
reference at the production shape (4, 32, 800, 64), the forward output is
102–141 % off and dQ/dK are 43–1,460 % off, while dV and PyTorch's own SDPA are
within 0.2 % on both chips. The grouped-math fallback is not upstream either:
its bf16 softmax puts gradients 8–10 % off on outlier-heavy inputs.

On the M4 Max the kernel stays within 1 % but its Q/K gradients are 2–5x
further from exact than upstream's, and its metallib was compiled with Metal's
default fast math although the kernel relies on `-inf` arithmetic.

`mounted_proxyctl.worker_attention()` therefore reads the chip
(`machdep.cpu.brand_string`, in process) at each worker start. Build 148 gave
every chip `STRATA_SN9_TENSOROPS_GQA=0`, the exact upstream attention.

Build 150 ships kernel v2 (worker patch 46 and the lab sources, qualified in
`Research/sn9-gqa-kernel-lab/requalify-2026-10-11/`). It comes with a sealed
`tensorops-allowlist.json` next to the assets, one entry per qualified chip,
macOS build, torch and asset hashes.

- **Supervisor:** it sets `STRATA_SN9_TENSOROPS_GQA=1` only for a chip the
  allowlist names, and passes the allowlist as
  `STRATA_SN9_TENSOROPS_ALLOWLIST` with profile `tensorops-gqa-v2`.
- **Worker:** it uses the kernel only on an exact entry match and a passing
  self-test. It latches the kernel off on any failure or shadow mismatch (1 call
  in 500 is re-checked against fp32 SDPA) and falls back to upstream SDPA.
- **Build:** its smoke gate loads the kernel through the same allowlist, so a
  build whose assets differ from the qualified ones fails.
- **Doctor:** the probe records the kernel as unused where the allowlist does
  not apply, and fails only if a self-test fails on an allowlisted machine.

`STRATA_SN9_GROUPED_GQA` is `0` everywhere. The worker switch
`STRATA_SN9_TENSOROPS_GQA` can turn the kernel off but never on elsewhere. The session receipt records the
choice as `patched_worker_attention` (`path`, `chip`, `reason`), and the app's
worker-patches panel shows it. The doctor's TensorOps probe now also measures
the kernel against upstream SDPA (`relative_error_vs_upstream`); the
`tensorops-accuracy` check fails only where the kernel would be used.

### September 22 official-host welcome budget (control surface, not a patch)

This one lives in `mounted_proxyctl.py`, so it changes the control surface and
the artifact identity without adding an ordered source patch. The official host
opens its node-control client shortly after it starts and abandons it if the
patched worker has not answered with a welcome inside roughly ten seconds;
without that handshake the host never emits `host.ready`, and
`mounted-canaryctl` tears the session down with `startup readiness was not
proven within 45s`. Everything between the host launching and the patched
worker binding its control port is therefore a hard budget. Stopping the
captured official child sat inside it and allowed a five second SIGTERM grace,
which on a slow machine spent half the budget: on 2026-09-22 the MacBook
launched its worker 8.8 s and then 11.1 s after the host and lost the race by
about one second, twice, while the Studio won it and made the same artifact
look healthy. `OFFICIAL_CHILD_SIGTERM_GRACE_SECONDS` (0.75) now bounds that
wait — the child is discarded and never resumed, and the slow path already
ended in SIGKILL, so this only reaches it sooner — and each phase of the
capture (`await_official_child`, `await_host_hello`, `stop_official_child`,
`capture_total`) is recorded in the session file as
`official_child_capture_phase_seconds` and as an `official_child_stopped`
relay audit event, so a future overrun can be attributed instead of guessed at.

The first artifact with this change, `bc0c5bd1…` (app build 70), wrote that audit
event through `self.audit` on `MountedSupervisor`, which has no journal; the
journal belongs to `MountedRelay`. Every mounted start on the MacBook then died
with `AttributeError` right after the official child was stopped, on
2026-09-26. Its tests only inspected the capture function's source text, so
they never ran the failing line. Artifact `cee85591…` (app build 71) records the
event through `self.relay.audit` and skips it when no relay exists; one test
now executes that path on a real supervisor and reads the journal back, and
another fails if `MountedSupervisor` references `self.audit`. Build 71 has run
on the MacBook since 2026-09-26 14:20 UTC: cutover was ready on the first start,
and the capture took 956 ms, well inside the host's budget. The session file
does not keep `official_child_capture_phase_seconds` once later stages rewrite
it; the latency survives in the relay journal (`relay-events-*.jsonl`).

### September 21 registration run hint (experiment)

The twentieth ordered source patch adds an operator-controlled registration
run hint. When `~/Library/Application Support/STRATA/IOTA Worker/registration-run-hint.json`
contains `{"run_id": "<run>"}` (or `STRATA_IOTA_REGISTRATION_RUN_HINT` is set),
the open-source API client names that run in the registration attestation
challenge and in the `/miner/register` body, then logs whether the orchestrator
honoured or ignored it. Queue confirmations still use the orchestrator's
`selected_run_id`, a client error on the hinted body falls back to the stock
body for the session, and with no hint the requests are byte-for-byte the
pre-patch ones. The closed-source pool miner bytecode is not modified. The
manifest, doctor, runtime-integrity verifier, package verifier and control
tests bind the new patch digest automatically, still on layout 15.

### September 21 registry entry tolerance

The nineteenth ordered source patch stops a malformed peer record in the
run-scoped node registry from killing the miner. On 2026-09-21 a peer in run
4.12.16.8 published `node_id` as a list and `joined_at` as an ISO-8601 string;
`ComputeNode(**entry)` raised out of `training_loop_tick`, the miner shut down
cleanly, and the Studio sat offline for three hours. Registry reads now skip
records the model rejects and log one warning per node per five minutes. The
manifest, doctor, runtime-integrity verifier, package verifier and control
tests bind the new patch digest automatically, still on layout 15.

### September 18 upload critical path

The eighteenth ordered source patch overlaps everything that does not need the
finished pseudo-gradient blob with the CPU build: the coordinator state
notification and weights attestation challenge, the presigned-URL request
(sized from the previous epoch's blob and re-requested if the real byte count
needs a different part count) and the upload worker's process start. Two
redundant SHA-256 passes over the 1 GB artifact were removed from the same
path. The coordinator closes the upload window when the last other miner in
the layer has submitted, and on 2026-09-17 the Studio missed it twice by 5 s,
losing its Bronze registration each time. `PHASE_WORKER_OVERLAP_CRITICAL_PATH=false`
restores the serial order. The manifest, doctor, runtime-integrity verifier,
package verifier and control tests bind the new patch digest automatically,
still on layout 15.

### September 15 stop provenance

`mounted-proxy stop` and `mounted-canaryctl.sh stop` accept
`--reason manual|memory-guard|maintenance|application-exit` and an optional
`--detail`. The requester is recorded in an owner-only `stop-request.json`
before the SIGTERM; the supervisor consumes it during its terminal write and
stores `shutdown.reason`, `shutdown.requested_by`, and `shutdown.relaunch_expected`
next to a `classification` of `requested` (manual), `memory-guard`,
`maintenance`, `application-exit`, or `unexpected`. A signal with no matching
request file, or one naming another session or older than 15 minutes, still
classifies as `requested`, which preserves the previous contract. The canary
controller tags its cutover stop as `maintenance`; STRATA tags its quit-time
stop as `application-exit` and the memory guard's stop as `memory-guard`.
`manual_stop_authoritative=true` and `automatic_restart=false` are unchanged:
they describe policy, not who pressed Stop.

### September 15 single-connection peer fanout

The seventeenth ordered source patch makes the miner's per-peer P2P request
semaphore an operator knob (`STRATA_P2P_MAX_CONCURRENT_PER_PEER`, clamped to
1..4, logged at miner init). The default is upstream's 2; the build now pins
mc-iota-sdk 0.1.3 (iroh 0.98.1), so the single-connection mitigation is only
needed when a build embeds the iroh 1.0.0 SDK. The SDK's
embedded iroh 1.0.0 grows one contiguous native buffer without bound once a
peer holds two or more concurrent paths (n0-computer/iroh #4390, fixed upstream
after the SDK build); the bloat was captured live on the Studio on 2026-09-10
and 2026-09-14 at the epoch upload/merge boundary. This removes the trigger's
precondition; it does not rebuild iroh. The manifest, doctor, runtime-integrity
verifier, package verifier and control tests bind the new patch digest
automatically, still on layout 15.

### September 6 adaptive upload concurrency and relay attribution

The sixteenth ordered source patch replaces the fixed sixteen-way multipart
upload semaphore with a process-local limiter. It measures the aggregate
uplink throughput implied by each completed part, keeps only as many parts in
flight as can each finish inside half of the fixed `S3_UPLOAD_TIMEOUT`, halves
the limit immediately when a part actually times out, and never leaves the
`S3_UPLOAD_MIN_CONCURRENCY` (default 2) to `S3_UPLOAD_MAX_CONCURRENCY` band.
Every adjustment is logged with the observed aggregate rate. It does not
coordinate across hosts and does not change the coordinator deadline; it
stops a saturated uplink from being wasted on timed-out retries.

The mounted proxy now records which verified hop closed the relay, the last
frame type, and the WebSocket close code, in both the session receipt failure
(`verified relay connection closed by host hop (reason=closed, frame=CLOSE,
close_code=1001)`) and the audit journal (`relay_closed_by_host` or
`relay_closed_by_worker`). Relay cleanup timeouts name the stage that did not
finish.

After verification, a hop whose socket resets (`ConnectionResetError`, which
includes aiohttp's `ClientConnectionResetError`, `BrokenPipeError`,
`ConnectionAbortedError`) is treated like a hop that closed: the audit records
`relay_reset_by_host` or `relay_reset_by_worker`, and the relay waits
`RELAY_REATTACH_GRACE_SECONDS` for the verified host to re-attach, which is
re-verified in full. A forward into the hop that just closed is recorded as
`forward_dropped_after_close` instead of failing the session, and a reset
raised while tearing down an already closed relay as `reset_after_close`. On
2026-10-10 19:11Z the Studio lost a working seat to exactly that: the worker
hop closed while a host reply was being forwarded into it. Any other
exception, and any reset before the relay has attributed a close, still fails
the session. The transactional controller gained a non-starting `select` command
so STRATA can promote the worker embedded in a newly installed app without
launching it.

### September 5 coordinator-contract liveness correction

The fifteenth ordered source patch restores upstream's limited cosine-only
weight fallback (at least 90% accepted shards), but only after a prior valid
global sync and outside fresh numerical recovery. Invalid/nonfinite tensors,
wrong sizes, failed transport, descriptor changes and epoch fences remain
fail-closed. A degraded commit records retained shard identities; it is not
validator credit. Persistent genuinely invalid generations back off from 60
seconds to 15 minutes and request operator attention, without repeatedly
resetting registration.

Coordinator training-gate reads use a single in-flight background request,
keep the configured cache TTL, and fail closed after expiry. Epoch cleanup
cancels and awaits gate/fetch/materialization tasks. Activation materialization
uses the existing protocol activation lifetime, including semaphore wait.
Every 30 seconds, `TRAINING_PROGRESS` distinguishes local activation calls,
held status, closed gates, empty ingress and stalled local work. The loopback
health response exposes the same state plus global-sync evidence. These are
local observations, not proof of GPU utilization, accepted work or payment.

The clean build, install manifest, doctor and runtime-integrity verifier bind
the new patch digest automatically (layout 15). No frozen historical patch was
rewritten. Read the [contract audit](../IOTA_COORDINATOR_CONTRACT_AUDIT_2026-09-05.md)
for official sources, limits, and required live gates.

The public repository omits the `miner.pool` package and the native macOS
attestation helper required by its `main_pool.py` entrypoint. The builder
therefore extracts exactly twelve CPython 3.10 pool modules plus the signed
attestation/OpenSSL trio from the locally installed, audited IOTA Train at Home
v3.7.0 `main_pool`. It verifies the official executable SHA-256 and every
Macrocosmos Team ID signature before using those pieces. None of those private
or signed artifacts is checked into this repository.

PyInstaller is deliberately not used for the runnable artifact. It rewrites
and ad-hoc signs nested Mach-O inputs, which destroys the Macrocosmos Team ID
and changes the attestation helper digest. The supported runtime is an isolated
CPython 3.10 virtual environment over a packaged source tree; this preserves
the three extracted native files byte-for-byte.

The result is a local hybrid experimental worker, not an official Macrocosmos
release. STRATA must label it that way. Coordinator acceptance, validator
credit, entitlement, and payment still require separate live evidence.

## Build and offline test

```bash
cd /Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker
make build
# Or: clean build + all regressions + isolated install/CLI smoke checks.
make test
```

During development, do not rerun the clean-room builder for control/UI/doctor
edits. Refresh the already verified package in roughly one second:

```bash
./refresh-package-fast.sh
```

That command copies only the locally owned control surface, syntax-checks it,
and regenerates the manifest and artifact identity from the current files. It
does not clone upstream, resolve dependencies, rebuild native assets, run the
full suite, install, register, or start a worker. Use `make build` once when
promoting a release candidate; that remains the clean-clone/full-regression
gate.

This is its own build target. Editing the fixset, rebuilding, running the
focused tests, inspecting the manifest, and streaming worker logs do not build
or sign the STRATA Swift application.

The build is locked to:

- upstream tag `v4.12.10`;
- commit `22d702acd07453dabb187abedfad185826091341`;
- fixset SHA-256 `0ba6120c7639089ef54e775596fdab033c80961dce66c2eb4373705dfd9be55c`;
- consolidated Apple-MPS, numerical-containment, and epoch-recovery fixset
  SHA-256 `b405ad4e69d73e89500a9f30ad2d54ef19977d59695e94add392f8eb383dcdf8`;
- activation-queue lock-release fixset SHA-256
  `e167a6f115e64c7a21e52af8160c3d18c7982dc2d2ad7cbb5d22da604ace338f`;
- detached-forward saved-tensor-drop fixset SHA-256
  `c72aed5b7085cb06563b1b9a0130c6a8db7b478534a285ac6f924947f97dbd69`;
- global-weight liveness hardening fixset SHA-256
  `f5f8c0ca78701045d5e4fc234adbfafcac38582b1fbe60c1410e39b7fac0540a`;
- phase-worker split fixset SHA-256
  `7d43a22826e34e80c39909fff2bb17d940f19129e55ece2825fe5210db370635`;
- registration-reservation recovery fixset SHA-256
  `57aace37967df2136366eb470df7b4a5d85d72d448c29f2874e4da17273c7677`;
- Apple-MPS component SHA-256 `110faa40e9059fd8eaeb984b439a126e29967022d769f91e3039dd35c85b255c`;
- numerical-safety component SHA-256 `b628566ea9e06f7c9820a48a4209a7c69678ad16021d8cfdcc1bfc1c62e0b229`;
- non-finite recovery component SHA-256 `316ae3f9535f1698ef77afdba46c0bebaa16c1ff55cb58ccadd19f1df387504e`;
- fixset regression-test tree SHA-256, computed at build time;
- standalone control-test tree SHA-256, computed at build time;
- reconstructed packaged source-tree SHA-256, computed at build time;
- source control-surface SHA-256, computed at build time;
- offline MPS qualification bundle SHA-256 `d81686a77126fb42a542aa1f2934036414ba04862c7e9e329b94e5eddcdd8dfc`;
- CPython 3.10;
- the checked-in resolved `uv.lock`.

The literal hashes above pin deliberately frozen external/audited inputs. All
generated source, test, control-surface, native-file, and artifact hashes are
computed automatically and written to `manifest.json`; they must never be
copied back into the build script after an ordinary edit.

The locally owned TensorOps patch is also intentionally auto-identified. Its
SHA-256 is computed from the patch by the manifest generator on every build or
fast refresh, bound into the ordered patch chain and artifact ID, and verified
against the sealed installed tree. It is not duplicated as a literal in the
builder or doctor, so an authorized kernel iteration never requires a manual
checksum edit. Frozen upstream, dependency, official-component, and audited
legacy-fixset pins remain explicit release inputs.

These inputs describe the frozen eight-patch successor. Its clean static
apply/equivalence gate is green, the new reservation-recovery surface passed
27 focused tests and a 138-test subnet run, and the complete local control
surface passed 355 tests. The source-tree digest was reproduced by applying
only the seventh source patch to the previously sealed six-patch runtime and
checking the unchanged preimage digest first.

The fresh clean build on 2026-09-04 passed 191 focused miner tests, 8 phase-
worker/TensorOps tests, 129 subnet tests, 24 common tests, and all 360 local control
tests. One phase-worker test was intentionally skipped because it is gated by
`STRATA_RUN_MPS_PHASE_SPLIT_TEST=1` for an explicit maintenance window. The
successor therefore has not yet claimed that real-GPU park/unpark gate. The
resulting artifact identity is always read from the generated manifest rather
than duplicated here as a stale literal.
Its layout-9 release was staged and passed the sealed real-layout doctor and
isolated CLI smoke checks. It remains unselected and unauthorized; a real MPS
gate, live canary, coordinator acceptance, accreditation, and payout evidence
remain separate.

The currently selected production artifact
`cb1c22b1e0daad047e40bf253f22c8b5e2ca37b87375ce3ab561a4cd87582fa9`
belongs to the prior six-patch/layout-8 build. It remains live during its active
lease and is not evidence for this successor. The successor can be built and
staged in parallel; selection and launch still wait for a freshly observed safe
maintenance boundary and artifact-specific operator authorization.

It runs the focused fixset and headless-attestation tests, compiles the runtime, verifies the private
pool import, and emits `.build/package`. No registration API or training loop
is called.

The supplemental fixset now treats NaN/Inf as an epoch-local fault instead of
letting one bad gradient poison later optimizer steps. It validates activation,
gradient, model, optimizer, partition-download, merge, and upload boundaries;
requires an atomic model/optimizer snapshot before training; stages every
listed partition before one coordinator submission; and quarantines a failed
epoch without resetting registration or manufacturing a success marker.
It also rejects finite-but-misrouted layer/chunk artifacts at every merge and
upload boundary and bounds generic global-weight retries without retrying
terminal registration, phase, capacity, or numerical failures.

The third, separately checksummed latency component keeps the worker's existing
100 ms empty-queue poll but releases the activation queue lock before sleeping.
This lets activation producers and lifecycle paths make progress without
introducing Event state. An Event/condition conversion is intentionally deferred
until detached materializers have generation fencing or cancel-and-await
ownership across epoch reset and shutdown.

The fourth, separately checksummed detached-forward component keeps grad mode
enabled but replaces autograd's saved tensor payloads with a tensor-free
sentinel only around `_forward_no_intermittent_activations` model calls. This
preserves the worker's grad-dependent MPS SDPA and RMSNorm dispatch and produced
bitwise-identical head/body outputs in the isolated qualification, while
reducing median live MPS allocation by approximately 3.26 GB and 6.53 GB. Any
attempted backward through that outbound-only graph raises explicitly. The
optimization is allowlisted only for a model that explicitly declares the
current `quantize_activations=False` empty-state contract. Quantized, unknown,
or stateful models stay on the original path and preserve their outbound state;
an unexpected state from an allowlisted call is discarded with its hooked
result, recomputed once on the original path, and disables the optimization for
the rest of that helper invocation. Focused tests cover all of those branches.
The frozen report and raw head/body/tail result and preflight files are embedded
under `evidence/sn9-mps-studio-2026-09-02`; their paths, roles, and file hashes
are bound into the qualification-evidence digest and package manifest. The
human-readable source report remains at
`../sn9-mps-benchmark/DETACHED-FORWARD-RESULTS-2026-09-03.md`.

The fifth, separately checksummed global-weight liveness component repairs the
observed long global-weight download and memory-pressure failure modes. It
validates every HTTP byte range (`206`, `Content-Range`, `Content-Length`, and
exact byte count), retries only the failed range for transient transport or
server failures, rejects unauthorized and malformed responses immediately,
and enforces protocol-derived decoded-size ceilings with a 512 MiB absolute
cap. A progress watchdog distinguishes a slow transfer that is still moving
from a transfer, decompressor, or task that has stopped making progress. A
failed refresh remains fail-closed without erasing valid registration, and a
late result is usable only after the current run/layer/epoch/generation fences
still match. Compression flags are deep-copied once per operation so a live
configuration refresh cannot change decoding midway through an object.

On macOS, memory telemetry now reports Darwin physical footprint separately
from RSS and marks probe availability explicitly. Allocator pressure relief is
serialized, pressure-gated, and confined to quiescent epoch-reset or failed-
refresh cleanup. Full cyclic garbage collection was removed from the merge/
upload critical path because it blocked the event loop immediately after an
upload task was scheduled. These controls improve client liveness and deadline
headroom; they do not add a coordinator-side snapshot/version contract or
prove validator credit, entitlement, or payout.

The sixth, separately checksummed phase-worker component keeps the registered
controller as the only holder of wallet, attestation, coordinator, and P2P
authority. It builds the deterministic pseudogradient/blob in a spawned CPU
process, parks model and optimizer tensors off MPS before upload, and transfers
the immutable artifact through a separate process using only presigned URLs.
The parent validates run/layer/epoch/generation, byte count, and SHA-256 before
performing signed completion and weight submission. The standalone and mounted
STRATA launchers enable the split explicitly. The upload watchdog allows 900
seconds for a real multipart transfer; an isolated-worker failure is caught by
the registered training loop with bounded backoff instead of terminating the
worker, and current weights are checked in the parent so non-finite values still
enter the existing epoch quarantine. CPU, wire-parity, local-network,
failure, integrity, and real-MPS park/unpark gates are green; a safe-boundary
installation and live accepted epoch remain required before production
qualification.

The seventh, separately checksummed registration-reservation component binds
confirmation to the exact queue/run/deadline tuple and permits only one POST
for that reservation. An ambiguous result is reconciled by polling the same
queue with a bounded cadence; it never replays the single-use attestation and
never treats a local timeout as either success or rejection.

Before the mounted proxy touches official-host preferences or starts any
registration network lifecycle, it now proves that the currently assigned TAH
tokenizer (`meta-llama/Llama-3.2-1B`) can load from a complete local cache. If
the cache is absent or partial, it uses the operator's normal Hugging Face login
to complete that tokenizer cache. Missing authentication, pending gated-model
approval, denied access, and timeouts fail at this preflight boundary with a
concise diagnostic. Tokens are never accepted on argv, written to STRATA state,
or included in the diagnostic. This prevents a late tokenizer 401/403 from
terminating a worker after coordinator admission.

## Install without starting

```bash
make install
```

This atomically installs the runtime at:

```text
~/Library/Application Support/STRATA/IOTA Worker/current
```

It creates the isolated venv in the final staging location, runs the offline
doctor, swaps `current`, and leaves the worker stopped. Before sealing, the
installer adds an owner-only, first-sorted virtualenv startup guard that sets
`sys.dont_write_bytecode` before virtualenv or setuptools `.pth` imports. This
keeps an accidentally non-`-B` local diagnostic from rewriting sealed startup
bytecode; the install smoke deliberately exercises that exact invocation and
then re-verifies the complete runtime tree.

Installation layout 9 and tree algorithm v2 bind the uv-managed
CPython base selected by the virtual environment, but exclude one deliberately
narrow mutable surface from that external measurement: safe, regular PEP 3147
files named `*.cpython-310.pyc`, `*.cpython-310.opt-1.pyc`, or
`*.cpython-310.opt-2.pyc` directly inside a directory named
`__pycache__`. Cache-directory records are omitted so another ordinary Python
process may create the directory after sealing, while the verifier still
traverses it, enforces ownership and safe modes, rejects nested cache
directories, and measures every source file, native library, symlink,
non-tagged `.pyc`, and other entry. The receipt binds the exact exclusion
policy as well as the external interpreter path and executable digest. The
packaged virtual environment remains fully measured and its startup guard
still prevents package-local bytecode writes.

Layout 9 additionally binds the transactional canary controller and installer
themselves into the control-surface digest. Both use one shared deployment lock
for selection and rollback; staging remains non-selecting, and release
promotion uses Darwin's atomic no-replace rename rather than directory `mv -n`
semantics.

The external base can still be shared by unrelated virtual environments. Any
change outside that cache policy fails closed; do not repair or reseal around
such a failure. A future layout may instead copy a dedicated CPython base into
the release, preserve executable modes, symlinks, relative Mach-O loading, and
xattrs, repoint `pyvenv.cfg` and the venv launch links, make the private base
read-only, and bind it internally. That larger change still requires relocation,
multiprocessing, native-extension, MPS, rollback, and concurrent-install tests.

Every standalone and mounted-proxy start verifies the sealed package before
preflight and again at the final process-launch boundary. Verification uses
bounded, no-follow descriptor reads and covers the package payload, venv,
external CPython tree under the declared cache policy,
source/control/evidence/lock identities, manifest inventory, and startup guard.
The scan fails closed above 100,000 inspected entries, 16 GiB of inspected
regular files, or 4 GiB for one file, including excluded cache entries in all
resource bounds.

This protects against accidental or unsynchronized post-install mutation. It
is not an OS trust anchor: a malicious process running as the same macOS user
could replace both the Python verifier and launcher, or delete and regenerate
an ordinary standalone seal. The mounted authorization receipt additionally
binds the exact installation-integrity receipt, while protection against a
hostile same-UID process ultimately requires a signed external verifier or
other OS-enforced root of trust.

## Offline doctor and CLI smoke

```bash
~/Library/Application\ Support/STRATA/IOTA\ Worker/current/main_pool doctor --json
~/Library/Application\ Support/STRATA/IOTA\ Worker/current/main_pool --help
```

`doctor` hashes every receipt file, verifies the exact signed native helper and
OpenSSL libraries, imports the private pool module, checks Torch MPS and the
IOTA SDK, and performs no network requests. It also runs network-denied help
probes for the standalone entrypoint, direct-route doctor, and mounted proxy,
then verifies that the mounted worker entrypoint exits 78 before authorization.

## Read-only direct-route qualification

> **Status, 26 September: the direct route cannot be admitted.** A queued miner
> must confirm its reservation with a fresh attestation, and only the official
> host's KeySigner produces one. With no attestation factory, or a factory that
> returns nothing, `miner_api_client.py` raises
> `RegistrationConfirmationAttestationError` at the confirmation step, so an
> unmounted worker never leaves the queue. The only live attempt matches: on
> 4 September the MacBook ran `direct-worker` on hotkey `5EqWoTq…3fXje3y`
> (SN9 UID 39) from 20:23 to 21:43 UTC, reached queue position 4, was never
> admitted, and the timed checkpoint fell back to the mounted route. The
> commands below are kept for reference only; mounted mode is the one working
> route. UID 39 remains registered on chain and idle.

The package includes a separate direct SN9 qualification doctor. Its default
mode performs no chain, coordinator, wallet-key, signing, registration,
attestation, or worker action:

```bash
current/direct-doctor --json \
  --wallet-name <wallet-name> \
  --hotkey-name <hotkey-name> \
  --hotkey-ss58 <public-hotkey-ss58>
```

The public SS58 is the only key value accepted on the command line. The doctor
reads wallet file metadata, not hotkey contents. Live chain reads are disabled
unless `--live-chain` is supplied together with an explicit, separately
installed audited btcli or Bittensor SDK interpreter. It never installs one.
The packaged Apple-MPS fixset has passed network-denied head/body/tail shard
parity and ten-iteration batch-4, sequence-800 qualification. Observed median
compute throughput was approximately 6039/3262/3026 tokens/s for head/body/tail.
That proves the local tensor path and optimizer loop used by the benchmark; it
does not prove coordinator admission, validator credit, or payout.

The direct controller turns qualification into a short-lived receipt only when
all immutable-package, local-public-hotkey, MPS, live finney, and existing SN9
UID gates pass:

```bash
current="$HOME/Library/Application Support/STRATA/IOTA Worker/current"
evidence="$current/evidence/sn9-mps-studio-2026-09-02"
receipt="$HOME/Library/Application Support/STRATA/IOTA Worker/direct/qualification.json"

"$current/direct-worker" preflight \
  --wallet-name <wallet-name> \
  --hotkey-name <hotkey-name> \
  --hotkey-ss58 <public-hotkey-ss58> \
  --qualification-result "$evidence/parity.jsonl" \
  --qualification-result "$evidence/head-b4-s800-10.jsonl" \
  --qualification-result "$evidence/body-b4-s800-10.jsonl" \
  --qualification-result "$evidence/tail-b4-s800-10.jsonl" \
  --btcli <audited-btcli-9.23.2-executable> \
  --receipt "$receipt" --json
```

It reads only public hotkey metadata and public chain state. It never creates,
unlocks, signs with, funds, or registers a wallet. If the named hotkey has no
SN9 UID, a human must fund and register it before this preflight can pass.

## Explicitly authorized mounted-host experiment

`mounted_proxyctl.py` and `mounted_worker_entrypoint.py` are packaged as a
separate experimental control surface. They preserve the exact signed v3.7.0
official host as the attestation mount while supervising the patched source
worker on a separate loopback control port. The controller will not run without
an owner-only provenance receipt and explicit acknowledgements at authorization
and launch. Tokens stay in the child environment and never appear in command
arguments.

The official host runs against a new, owner-only `--user-data-dir` for every
session. Only that disposable profile is briefly armed to spawn the signed
child; the normal IOTA profile is forced to manual-stop settings and hash-bound
for the whole session. The official child is forced to closed loopback
coordinator/subtensor endpoints, captured by exact executable identity, stopped,
and continuously checked for respawn before the patched worker may operate.

Safe offline inspection and authorization commands are:

```bash
current="$HOME/Library/Application Support/STRATA/IOTA Worker/current"
release_root="$(cd "$current" && pwd -P)"

"$current/mounted-proxy"
"$current/mounted-proxy" authorize \
  --app "$HOME/Applications/IOTA Train at Home.app" \
  --package-root "$release_root" \
  --authorization-reference <authorization-reference> \
  --acknowledge-host-claims-official-worker --json
"$current/mounted-proxy" verify --json
```

What the attestation mount vouches for: the official app's `KeySigner` helper
(`Contents/Frameworks/KeySigner.app`) signs each attestation with a
keychain-held P-256 key (`com.macrocosmos.iota.ks.p256`, Secure Enclave when
available) and attaches host claims. Its `HardwareClaims` fields, read from the
binary, are `hwModel`, `unameMachine`, `cpuBrand`, `logicalCpuCount`,
`physicalMemoryBytes`, `secureEnclaveAvailable`, `secureEnclaveBackedKey`,
`serialNumber` (IOPlatformSerialNumber), `primaryMacAddress`, `hostname`,
`rootVolumeUuid`, `osVersion`, `processArch`, `translatedByRosetta` and
`ipAddresses`; separate caller and parent-process claims bind the signing
identity of the app that asked. Every worker behind the official app on one
Mac therefore reports the same machine, whatever hotkey it registers.

Creating and verifying the receipt are offline. They bind the exact signed
v3.7.0 app, immutable installed artifact, authorization reference, and the
explicit fact that host attestation names the official worker while coordinator
traffic comes from the bound patched worker. No build, install, doctor, help,
authorize, verify, or status command starts either process.

By default, `verify` also requires the receipt's package and controller to be
the exact release from which the command was invoked. It therefore fails clearly
if `current` has moved to a newer release while the default receipt still names
the old one. For deliberate, read-only inspection of that historical receipt,
use `"$current/mounted-proxy" verify --receipt-target --json`; its output reports
the bound package/controller, invoking controller, and mismatch rather than
silently presenting the old receipt as verification of the new current release.
`--receipt-target` is inspection only and does not weaken the live `run` gate.

Queue-state reporting is an optional host-observability channel, not the
registration authority. The patched worker keeps coordinator queue polling on
its critical path and dispatches host observation with a one-second bound. The
verified v3.7 host does not advertise `register.queue_state`, so the proxy
returns an explicit capability-unavailable result and records the event
without forwarding, retrying, or inventing a host acknowledgement.

A deliberately foreground-only canary is:

```bash
"$current/mounted-proxy" run \
  --payout-coldkey <public-payout-coldkey-ss58> \
  --acknowledge-host-claims-official-worker
```

From a second Terminal:

```bash
"$current/mounted-proxy" status --json
"$current/mounted-proxy" stop --json
"$current/mounted-proxy" cleanup-stale --json
```

The supervisor binds the host and worker by executable, process-start identity,
process group, loopback socket owner, one-use coordinator challenge, exact
payload, and an unpredictable per-launch worker session ID. Any duplicate
official child, host/worker exit, identity drift, replay, or cleanup failure is
a hard stop. Coordinator acceptance, continuous training, accreditation, and
earnings remain unproven until the live canary produces separate evidence.

### Transactional operator script (no launchd)

`mounted-canaryctl.sh` prevents the manual install/receipt/start sequence from
being performed out of order. In layout 9 and later, both this controller and
`install.sh` are packaged, manifested, and covered by the artifact's control-
surface digest. After building, invoke the copy inside the candidate package so
the cutover cannot silently use a newer mutable source-tree controller. Its
phases are intentionally separate:

```bash
cd /Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker

candidate="$PWD/.build/package"

"$candidate/mounted-canaryctl.sh" stage
"$candidate/mounted-canaryctl.sh" authorize \
  --authorization-reference '<explicit authorization reference>' \
  --acknowledge-host-claims-official-worker
"$candidate/mounted-canaryctl.sh" activate \
  --payout-coldkey <public-payout-coldkey-ss58> \
  --acknowledge-host-claims-official-worker
```

`stage` performs all expensive installation, dependency, integrity, doctor,
and offline-smoke work without stopping the selected worker or changing the
`current` link. (`prepare` remains an alias.) `authorize` writes a separate
artifact-specific receipt and operator marker; it does not replace the live
worker's receipt, select the candidate, or start anything.

`activate` re-verifies those exact bindings, requires a coordinator-fresh
maintenance gate when a live worker must be stopped, atomically changes the
selected link, and starts the candidate as a child attached to the invoking
Terminal. It declares readiness only after proving the supervisor, official
host, patched worker, listener, and `host.ready` handshake. A failed readiness
deadline restores the prior selection and restarts the prior verified worker
when one was live. A historical low-level receipt alone is insufficient.
The exclusive lifecycle lock is released immediately after readiness proof,
so a later candidate may be staged while the current foreground worker trains.

The wrapper never creates a launchd job, login item, `nohup` process, detached
supervisor, KeepAlive policy, or automatic login restart. A normal manual stop
remains authoritative.

`cleanup-stale` never stops a live receipt-bound supervisor. It first acquires
the same exclusive supervisor lease, validates the stale receipt and isolated
profile, and then signals only exact owner/session-bound host or worker process
groups. PID reuse, group/session drift, an unsafe profile path, or an ambiguous
receipt fails closed before any signal. The prior per-session receipt and its
evidence paths remain in the owner-only session history. A later `run` performs
the same reconciliation before creating a journal, arming preferences, spawning
a process, or replacing the default session pointer.

## Direct metagraph canary (after human funding and SN9 registration)

Not admissible: see the status note under "Read-only direct-route
qualification". Kept for reference.

Once `preflight` has produced a still-valid qualification receipt:

```bash
"$current/direct-worker" run --start \
  --wallet-name <wallet-name> \
  --hotkey-name <hotkey-name> \
  --qualification-receipt "$receipt" \
  --acknowledge-sn9-uid \
  --experimental-attestation-canary
```

This direct route runs the public `runtime/src/miner/main.py` with
`register_as_metagraph_miner=True` and MPS enabled. It remains foreground-only,
has no auto-start/restart, and cannot cross its live boundary without an
existing on-chain SN9 UID. Unmounted coordinator attestation acceptance is the
remaining canary question, not an MPS benchmark blocker.

## Deliberate live start

STRATA should supervise `current/main_pool` directly, capture stdout and stderr
into its existing owner-only `*-strata-*-cli.log`, and preserve manual-stop
authority. A manual shell start has an explicit guard:

```bash
current/run.sh --start --payout-coldkey <public-ss58>
```

The resulting argv is `--no-btcli --no-dashboard --auto-start` plus the public
payout coldkey. The manual launcher writes an owner-only log under
`~/Library/Logs/STRATA IOTA Worker`; `current/main_pool logs` follows the newest
standalone or STRATA-owned worker log. Calling `current/main_pool run` directly
leaves stdout and stderr attached so STRATA can supervise and capture them.

Every standalone run also creates an owner-only `registration-*.jsonl` journal
in that log directory. It records complete, untruncated coordinator responses
for registration, queue status, confirmation, and attestation challenges, plus
wall/monotonic timestamps, latency, generation, reservation, and local
attestation outcomes. Request bodies and authentication headers are never
written to this journal.

Each run atomically writes an owner-only `standalone-session.json` receipt
under `~/Library/Application Support/STRATA/IOTA Worker`. It binds the PID and
process-start identity to exact argv, Python, entrypoint, launcher, and artifact
hashes, plus the session log and journal paths. The local control commands are:

```bash
current/main_pool status --json
current/main_pool attestation-status --json
current/main_pool stop
current/main_pool stop --force  # only permits SIGKILL after bounded SIGTERM
```

`stop` never signals a PID unless the owner-only receipt, process start time,
executable, complete argv, and artifact hashes all still match. Offline
`attestation-status` compares the exact signed helper digest with the newest
locally journaled coordinator `self_checks`; it does not hard-code coordinator
allowlist hashes. A deterministic native identity mismatch exits 78 after one
attempt instead of re-entering registration.
