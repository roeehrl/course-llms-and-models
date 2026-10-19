# Systems and distribution: content review

Review date: 2026-10-12. This is private original teaching content with source inspection and CPU reference checks. It is not a current fleet report, chip qualification, second-person educational review, deployment claim or completed practical grader.

## Deliverable and boundaries

Only `content/systems-and-distribution.json` and this review were written. The fragment has the eight requested arrays, chapters `chapter09`, `chapter10`, `chapter11`, 12 complete episodes, 12 objectives, 24 deterministic assessments, 12 gates and 31 sources. Titles, order and chapter purposes match `planning/curriculum.json`. Other identifiers use the `sys-` namespace. Visuals, media and extensions are empty; the written diagrams, code and traces are sufficient to study the taught mechanisms without a renderer or GPU.

Each episode has calculation/trace and transfer/diagnosis families, with both covering its objective. Gates require all declared objectives and two independent families. Answer positions are balanced; all 12 choice keys were read against their distractors and assumptions. Numeric keys have explicit tolerances. Assisted, revealed or repeated items cannot become new independent evidence merely by retrying. This initial bank has one item per family, so later fresh and delayed checks require additional authoring and verification. All new objectives are non-placeable; no placement policy is authored.

No course, chapter or episode policy appears in the fragment. The existing parent course configuration, including its administrator-controlled duration, was consumed only by the validation path. No enrollment setting was changed.

The public release `@course-core/sdk` version 0.1.0 was imported from the private root's installed dependency. No sibling SDK path, source edit, package installation or rebuild was used. The parent's exported `assemble()` function was called in memory with `{preview:true}` for foundations, training-and-transformers and this fragment. It validated 11 chapters, 44 episodes, 44 objectives, 88 assessments and 44 gates. No `dist/` output was written and this does not claim a complete 14-chapter course.

Standalone validation passed the structural stage and reported only 15 expected cross-fragment prerequisite-reference issues. Combined validation, compilation, integrity verification and learner-projection checks passed. Every learner assessment contains only id, type and objectiveIds; grading fields and explanations are absent. This review and its original-verification URN are instructor-only and contain answers; private source resolution must not grant learners access to this report or sensitive source contents.

## Coverage and word counts

Counts exclude assessment prompts, options and grading. Code is included in lesson totals and excluded in the prose column. Total: 5,857 lesson words, 461–517 per episode, with at least 433 prose words per episode.

| Episode | Lesson words | Prose words | Trace family | Transfer family |
| --- | ---: | ---: | --- | --- |
| 09-01 | 487 | 457 | dispatch-coverage | barrier-scope |
| 09-02 | 476 | 450 | tile-traffic | tile-resource-tradeoff |
| 09-03 | 479 | 443 | fusion-bytes | hardware-attribution |
| 09-04 | 475 | 449 | memory-budget | end-to-end-bound |
| 10-01 | 471 | 433 | weighted-replica-gradient | partition-message-contract |
| 10-02 | 474 | 433 | pipeline-fill-drain | stale-work-lifetime |
| 10-03 | 500 | 483 | return-score | retry-evidence |
| 10-04 | 503 | 465 | outer-optimizer | chunking-semantics |
| 11-01 | 461 | 447 | readiness-margin | process-evidence |
| 11-02 | 505 | 489 | split-block-count | split-state-contract |
| 11-03 | 509 | 456 | optimizer-window-trace | cache-versus-queue |
| 11-04 | 517 | 503 | event-interval | semantic-heartbeat |

The examples exercise padded cooperative reductions, tile reuse and edge tiles, fusion traffic, complete memory budgets, three parallelism modes, fill/drain schedules, peer-return costs, chunked pseudo-gradients, an outer optimizer, process readiness, actual split classes, cached recomputation and event interpretation. Every example states its boundary: exact arithmetic, logical traffic, idealized schedule, source-supported behavior or historical record.

## Evidence classes and source limitations

- **Public framework documentation:** Apple API pages were inspected through official documentation JSON endpoints where the HTML required JavaScript. The public URLs in the fragment remain the canonical documentation pages. Official Tech Talk transcript text supports the TensorOps and GPU neural-accelerator distinction. The current MPSGraph overview explicitly lists GPU, CPU and Neural Engine compute devices; it is not described as inherently GPU-only. These are dated API facts, not observation of a selected PyTorch or worker kernel.
- **General primary research:** GPipe's full-text algorithm sections support microbatch pipeline concepts. The DiLoCo primary abstract supports the inner/outer-optimization distinction, without importing its benchmark claims as predictions for IOTA. NERSC's official Roofline guide supports bound-based reasoning. All numeric schedules, byte counts, gradients and serial-fraction calculations are original fixtures, not measurements from those publications.
- **Public IOTA documentation:** Macrocosmos's architecture overview supports data/pipeline parallelism and its TAH guide establishes the application role. The linked technical-primer PDF could not be fetched; a direct public request returned 404. It is not listed as reviewed or used to establish implementation details. The indexed ACM Roofline/Amdahl pages also failed direct retrieval; those failed pages are not manifest sources. No product reward schedule, financial number or current capacity claim was imported.
- **Immutable upstream blobs:** The v4.12.10 tag resolves locally to commit `22d702acd07453dabb187abedfad185826091341`, dated `2026-08-30T08:30:33Z`. `splits.py` and `activation_queue.py` were read with `git show` at that commit. The mutable `.build/source` working tree was not substituted for those upstream blobs. Each blob's SHA-256 is recorded below.
- **Historical patched artifact:** Selected runtime files come from the named test-install release whose manifest identifies artifact `e667fcdcccb0523afbdd7d1867ed2c05bfb61b7b670f6f0822a4e736f74d5fc7`, generated `2026-10-11T11:15:22.829137+00:00`, with the upstream base above. A source hash proves which file was read, not that an installed/current worker uses it or that all its paths were exercised. The record does not treat this ignored/generated package as an unmodified upstream checkout.
- **Control-source and documentation snapshots:** The mounted entrypoint, local-worker README, fixset README, journal patch and repository rules have separate hashes and checkout-context fields. Where bytes differ from the checkout commit, the file hash is the authoritative content pin. README observations remain dated history. Worker behavior changes such as routing and retries are distinguished from numerical work; source differences alone are not grounds to revert deliberate behavior.
- **Recorded example:** `head-b4-s800-10.jsonl` line 3 is a local benchmark warmup at `2026-09-02T19:45:01.884724Z`. Only kind, split, output shape, dtype, null loss and timestamp are used. The selected record reports `[4,800,32]` and `torch.bfloat16`; host identifiers, addresses and performance counters are not reproduced. This is not an admitted network sample or an end-to-end worker journal.
- **Synthetic event traces:** Readiness times, sample IDs A/B/C, cache capacities, accumulation thresholds, peer costs and lifecycle traces are expressly invented. They make causal and arithmetic reasoning executable but do not fill gaps in historical evidence. A full anonymized admission-to-merge trace remains a separate source-acquisition task for the parent; the material explicitly teaches the distinction rather than presenting synthetic events as recorded.

The parent owns later immutable source snapshots and private URN resolution. The source manifest below provides exact locator/hash/revision/date data for that work. No raw source bundle was copied into another file or public repository. Public explanations and code are original; no external figures or substantial quoted text were reproduced, and source references are not blanket redistribution licenses.

## Source-to-claim map

| Private source suffix | Principal supported content |
| --- | --- |
| up-splits | Head/body/tail constructors, block-count ranges, quantized-state branch and logits boundary in 11-02 |
| up-queue | Backward-first dequeue and cache-aware forward selection in 10-02 and 11-03 |
| patched-training | Cached-input recomputation, routing metadata, completion order and conditional local update in 11-03 |
| patched-router | Return/expiry bookkeeping, neutral new peers, bounded factor and local-outage forgetting in 10-03 |
| patched-mesh | Run-scoped registry and keyed fallback distinction in 10-03 |
| patched-phase | Previous-minus-current subtraction, chunk-count meaning, BF16 conversion and phase binding in 10-04 |
| patched-merge | Contributor validation, configured weighting, moment buffer and Nesterov-style update in 10-04 |
| patched-model | Detached outbound path, scalar-loss backward and optimizer boundaries in 11-02/11-03 |
| patched-queue, patched-cache | Ready-work versus retained context, cache lifetime and cleanup in 11-03 |
| entrypoint, local-readme | Official host/control/worker boundary and dated readiness-test counterexample in 11-01 |
| fixset, journal-patch, journal-source | Behavioral changes, emission sites and best-effort typed journal semantics in 11-04 |
| head-record | Narrow archived local observation in 11-02; expressly not current network training |
| rules | Computed-work equivalence versus intentional behavior distinction in 11-04 |
| package-manifest | Artifact/base/source identity provenance, not evidence of current deployment |

## Verification results

All checks below passed on the local CPU on 2026-10-12:

- 295 arithmetic assertions, all 12 numeric keys recomputed, and all 12 learner Python snippets executed independently.
- 164 padded-tree reduction cases, 20 matrix/tile cases including rectangular and nondivisible dimensions, and 60 pipeline schedules compared between a max-plus recurrence and an independent tick scheduler.
- Scalar pipeline gradients checked by central differences of a central loss; weighted aggregation, return-scoring factors, chunking and outer-state arithmetic checked against separate calculations.
- Seventeen rejected bug variants: dropped partial reduction group, incomplete barrier participation, truncated edge tiles, coordinate permutation, unweighted replica means, concatenated partial sums, serial/pipeline confusion, duplicate backward credit, stale-epoch gradient, retry attempts counted as samples, chunk-count divisor, empty merge success, stale merge binding, nonfinite contribution, pseudo-gradient sign reversal, stale progress reviving a reset session, and transport success mistaken for admission.
- All 18 private source hashes verified. Python source files were parsed as text/AST only; neither worker code nor its tests were imported or run. Static anchors identify the inspected code path and do not qualify its runtime behavior.
- The released SDK rejected one-family gates, undeclared objectives, mismatched gate scopes and placement on a non-placeable objective. Parent assembly checks verified substantive text and two-family coverage per objective.

The traces implement deliberately specified teaching policies. They are not protocol simulators guaranteed equivalent to IOTA in every flag combination. Merge checks use exact/double-precision toy arithmetic and do not qualify BF16 rounding, clipping, serialization, optimizer implementations or chip behavior. Barrier checks model participation, not a real GPU scheduler or memory model. Byte counters count logical traffic under explicit cache assumptions, not measured device-memory traffic. No performance, paid-work or production-safety claim follows from these tests.

## Source pins

`readAt` records source inspection time. `checkoutContextCommit` names the surrounding repository context; `matchesCheckoutCommitBytes` states whether that tracked blob actually matches. For generated package files, the artifact manifest and per-file SHA-256 are the relevant content identity. Null upstream-base fields for non-package documents are intentional, not missing inferred provenance.

```json
{
  "reviewedAt": "2026-10-12T16:10:35Z",
  "mineCheckoutHead": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
  "upstreamCommit": "22d702acd07453dabb187abedfad185826091341",
  "upstreamCommitDate": "2026-08-30T08:30:33Z",
  "upstreamTag": "v4.12.10",
  "patchedArtifactId": "e667fcdcccb0523afbdd7d1867ed2c05bfb61b7b670f6f0822a4e736f74d5fc7",
  "patchedManifestGeneratedAt": "2026-10-11T11:15:22.829137+00:00",
  "records": [
    {
      "id": "sys-src-up-splits",
      "gitRepository": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/source",
      "gitCommit": "22d702acd07453dabb187abedfad185826091341",
      "gitPath": "shared/subnet/src/subnet/model/llama3/splits.py",
      "sha256": "8fc9aa978300f2df81d9ecb81c877bfe76e9e0f27968ab28dbd6724505a014fe",
      "bytes": 7622,
      "scope": "immutable upstream Git blob; working-tree contents deliberately not substituted",
      "lineRanges": "21-223",
      "readAt": "2026-10-12T16:10:35Z"
    },
    {
      "id": "sys-src-up-queue",
      "gitRepository": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/source",
      "gitCommit": "22d702acd07453dabb187abedfad185826091341",
      "gitPath": "src/miner/src/miner/training/activation_queue.py",
      "sha256": "cf61083bbe7eb6f00f0e18605d2fd597bb660afdd399ed97320b9327313b6b0f",
      "bytes": 47715,
      "scope": "immutable upstream Git blob; working-tree contents deliberately not substituted",
      "lineRanges": "122-173,609-669",
      "readAt": "2026-10-12T16:10:35Z"
    },
    {
      "id": "sys-src-patched-training",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/training/training.py",
      "sha256": "7ddce6af76a6815ccafee56ce0b44fadfded9ec9fd0b0e31372cd71e70009e7d",
      "bytes": 60259,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "139-177,307-384,445-680,690-840,1183-1191",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-router",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/training/transport_health.py",
      "sha256": "4020b92fac9a79d7ae71b4b56a427d6d39ab45fa2e4277e98140824647e6f398",
      "bytes": 16382,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "74-88,134-199",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-mesh",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/sync_v2/elastic_device_mesh.py",
      "sha256": "2a55a5a9788c9da573333f74219005bb5475a551af6c5586a8de1f4cbb83ecb4",
      "bytes": 26522,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "1-50",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-phase",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/phase_worker.py",
      "sha256": "f1c3e4ac1a90fbd611eb39b98e497c563d9ba41028025bb7cc64f16e53bc601d",
      "bytes": 33251,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "52-98,287-328",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-merge",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/utils/partition_merging.py",
      "sha256": "0fc817650c60ce606490bf21f16f519a6767e94ad863b1e3d959961896b47ec6",
      "bytes": 29547,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "27-73,95-315",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-model",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/shared/subnet/src/subnet/model/model_mixin.py",
      "sha256": "888e1fb7787e00e4a776a52a3a1cb4f550c4c84fff7e4b75dafe8ce2fd38d177",
      "bytes": 41274,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "274-317,319-354,714-797",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-queue",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/training/activation_queue.py",
      "sha256": "b25a5d30065898b4b430a83e9aa1a5e2b8da1ac576b484d2b2899a2510d0e517",
      "bytes": 60771,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "184-234",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-patched-cache",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/src/miner/src/miner/training/activation_cache.py",
      "sha256": "f0c8186794a94f32fc6ef9aef4184b5c7b11e9b2ec48ea284576f8aa8eeff2a6",
      "bytes": 9517,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "74-127,188-219",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-journal-source",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/runtime/shared/common/src/common/utils/strata_event_journal.py",
      "sha256": "872e4cf10ecac7560e7f9ef147bd03d0da074eff7f2ba3d54e1512f9130f7a4d",
      "bytes": 3196,
      "scope": "historical patched package file; not a live installation observation",
      "lineRanges": "1-86",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": "22d702acd07453dabb187abedfad185826091341",
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    },
    {
      "id": "sys-src-entrypoint",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/mounted_worker_entrypoint.py",
      "sha256": "fa5a82aa4948865b36053c4f22a13a844e6456ec540db8b4a2b4eaf69acdf41e",
      "bytes": 13354,
      "scope": "local control source snapshot; hash is authoritative, not deployment status",
      "lineRanges": "1-61,282-345",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-local-readme",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/README.md",
      "sha256": "1be8e8c9e970ac5ad2522421b6ae4e73fce6b731c3358a4cd6b9036b66e700de",
      "bytes": 44635,
      "scope": "dated explanatory history; source statements are not fresh fleet observations",
      "lineRanges": "1-115,291-315",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-fixset",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-fixset/README.md",
      "sha256": "a6765866993c3edc13d1406f714d3d764dd673f582a7868a638332d71550ef50",
      "bytes": 103940,
      "scope": "patch history read as versioned documentation",
      "lineRanges": "350-401,793-837,929-943",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-journal-patch",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-fixset/iota-v4.12.10-structured-event-journal.patch",
      "sha256": "fc67837c33d4f8b6154aac1d81825d39a05c562ff496e02e17e5cf0e0a4fff13",
      "bytes": 12863,
      "scope": "historical patch, not evidence of live execution",
      "lineRanges": "7-114,204-278",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-head-record",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/evidence/sn9-mps-studio-2026-09-02/head-b4-s800-10.jsonl",
      "sha256": "ef23f38a86ab4156a5a2d98571adf97f5af5460ef98c2d12fa75e70951ea9a2f",
      "bytes": 55797,
      "scope": "archived local benchmark, not network training/journal acceptance",
      "lineRanges": "JSONL line 3: warmup; selected shape, dtype, loss and timestamp only",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-rules",
      "path": "/Users/tnt/git/mine/CLAUDE.md",
      "sha256": "60da4971318cd8c3e8c2735255d4e526e48e12427c20555488c7c5a9b35f1743",
      "bytes": 3733,
      "scope": "repository computed-work equivalence and operational constraints",
      "lineRanges": "SN9 computed-work versus behavior rules",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": true,
      "matchesCheckoutCommitBytes": true
    },
    {
      "id": "sys-src-package-manifest",
      "path": "/Users/tnt/git/mine/macos/StrataMiner/Research/iota-v4.12.10-local-worker/.build/test-install/releases/v4.12.10-e667fcdcccb0523afbdd7d18/manifest.json",
      "sha256": "cf502aafa3304cb4bf291ade7360b62f7a737ba7dd87b90d13efcf07352f14cd",
      "bytes": 31565,
      "scope": "historical artifact metadata; no deployment assertion",
      "lineRanges": "artifact_id, upstream_commit, upstream_tag, generated_at",
      "readAt": "2026-10-12T16:10:35Z",
      "checkoutContextCommit": "3d73164655a5b06231cfeeb5499faaaad7b95b67",
      "upstreamBaseCommit": null,
      "trackedAtCheckoutCommit": false,
      "matchesCheckoutCommitBytes": null
    }
  ]
}
```

## Executable CPU verification

This program reads the authored fragment and exact pinned source bytes, parses source text, and executes only the lesson's standalone CPU examples and the reference simulations below. It uses no network, SSH, wallet, device query or worker import. If a pinned source has changed, it intentionally fails rather than silently reinterpreting historical evidence.

```python
import ast, hashlib, json, math, re, subprocess
from pathlib import Path
from fractions import Fraction as F
from collections import deque

ROOT=Path('~/git/course-llms-and-models')
fragment=json.loads((ROOT/'content/systems-and-distribution.json').read_text())
review=(ROOT/'content/systems-and-distribution-review.md').read_text()
pins=json.loads(re.search(r'^```json\n(.*?)^```$',review,re.S|re.M).group(1))
items={a['id']:a for a in fragment['assessments']}
checks=0;bugs=[]
def check(a,b,tol=1e-9):
    global checks
    assert math.isfinite(float(a)) and math.isfinite(float(b))
    assert abs(a-b)<=tol,(a,b)
    checks+=1

def rejects(fn):
    try:fn()
    except (ValueError,AssertionError):return
    raise AssertionError('Invalid variant was accepted')

# Source verification is byte comparison and AST parsing only; no worker imports.
source_text={}
for record in pins['records']:
    if 'gitPath' in record:
        data=subprocess.check_output(['git','-C',record['gitRepository'],'show',record['gitCommit']+':'+record['gitPath']])
    else:data=Path(record['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==record['sha256'],record['id']
    source_text[record['id']]=data.decode()
    if record.get('path',record.get('gitPath','')).endswith('.py'):ast.parse(data.decode())
manifest=json.loads(source_text['sys-src-package-manifest'])
assert manifest['artifact_id']==pins['patchedArtifactId']
assert manifest['upstream_commit']==pins['upstreamCommit']
row=json.loads(source_text['sys-src-head-record'].splitlines()[2])
assert row['kind']=='warmup' and row['split']=='head' and row['output_shape']==[4,800,32]
assert row['loss'] is None and row['output_dtype']=='torch.bfloat16'
assert row['timestamp_unix']==1788378301.884724
classes={n.name for n in ast.walk(ast.parse(source_text['sys-src-up-splits'])) if isinstance(n,ast.ClassDef)}
assert {'Llama3HeadModel','Llama3BodyModel','Llama3TailModel'}<=classes
# These static anchors locate inspected semantics; they are not runtime qualification.
assert 'RETURN_MIN_OBSERVATIONS = 3' in source_text['sys-src-patched-router']
assert 'RETURN_FACTOR_POWER = 1.5' in source_text['sys-src-patched-router']
assert 'self.optimizer.step()' in source_text['sys-src-patched-model']
assert 'pseudo_gradient_batch_count' in source_text['sys-src-patched-phase']

# Reduction: a pairwise tree compared with a separately implemented sequential sum.
def tree_sum(values,group=8):
    if not values:return 0
    partials=[]
    for start in range(0,len(values),group):
        row=values[start:start+group]+[0]*(group-len(values[start:start+group]))
        while len(row)>1:row=[row[i]+row[i+1] for i in range(0,len(row),2)]
        partials.append(row[0])
    return sum(partials)
reduction_cases=0
for n in range(0,41):
    values=[(i*7)%13-6 for i in range(n)]
    for group in [2,4,8,16]:
        check(tree_sum(values,group),sum(values),0);reduction_cases+=1
check(tree_sum(list(range(1,11))),55,0)
assert sum(range(1,9))!=sum(range(1,11));bugs.append('dropped partial reduction group')
def barrier(arrived,required):
    if set(arrived)!=set(required):raise ValueError('incomplete cooperative barrier')
barrier(range(8),range(8));rejects(lambda:barrier(range(3),range(8)))
bugs.append('edge threads skip required barrier')

# Tiled matmul counts each loaded tile element, not reuse inside its product loops.
def reference(A,B):
    return [[sum(a*b for a,b in zip(row,column)) for column in zip(*B)] for row in A]
def tiled(A,B,tile,drop_edge=False):
    m,k,n=len(A),len(B),len(B[0]);C=[[0]*n for _ in range(m)]
    reads=0;products=0
    stop_m=(m//tile)*tile if drop_edge else m
    stop_n=(n//tile)*tile if drop_edge else n
    for i0 in range(0,stop_m,tile):
        I=list(range(i0,min(i0+tile,m)))
        for j0 in range(0,stop_n,tile):
            J=list(range(j0,min(j0+tile,n)))
            for k0 in range(0,k,tile):
                K=list(range(k0,min(k0+tile,k)))
                a={(i,q):A[i][q] for i in I for q in K}
                b={(q,j):B[q][j] for q in K for j in J}
                reads+=len(a)+len(b)
                for i in I:
                    for j in J:
                        for q in K:C[i][j]+=a[i,q]*b[q,j];products+=1
    return C,reads,m*n,2*products
matrix_cases=0
for m,k,n in [(4,4,4),(5,7,3),(1,2,5),(6,6,6),(3,1,2)]:
    A=[[3*i-q+1 for q in range(k)] for i in range(m)]
    B=[[2*q-3*j for j in range(n)] for q in range(k)]
    for tile in [1,2,3,4]:
        out,reads,writes,ops=tiled(A,B,tile)
        assert out==reference(A,B);check(ops,2*m*k*n,0);matrix_cases+=1
A=[[i+j+1 for j in range(4)] for i in range(4)];B=[[2*i-j for j in range(4)] for i in range(4)]
_,r,w,o=tiled(A,B,2);check(r,64,0);check((r+w)*4,320,0);check(o/((r+w)*4),.4)
_,r,w,o=tiled(A,B,4);check((r+w)*4,192,0)
check((2*4**3+4*4)*4,576,0);check(128/576,F(2,9))
check(min(2e12,200e9*.4),80e9)
A=[[i+j+1 for j in range(7)] for i in range(5)];B=[[q-j for j in range(3)] for q in range(7)]
assert tiled(A,B,2,True)[0]!=reference(A,B);bugs.append('truncated edge tiles')
A=[[1,-2],[3,1]];B=[[2,0],[1,-1]]
product=reference(A,B);assert product==[[0,2],[7,-1]]
fused=[[max(0,x) for x in row] for row in product]
assert fused==[[0,2],[7,0]]
permuted=[list(row) for row in zip(*product)]
assert [[max(0,x) for x in row] for row in permuted]!=fused
bugs.append('cooperative-coordinate permutation')
check(4*4*2,32,0);check(24-6,18,0);check(5+5+10+3-18,5,0)
check(10/(4/2+6),1.25);check(10/6,F(5,3))

# Distributed arithmetic: independent finite differences of a central scalar loss.
def scalar_loss(w,v,x,y):return .5*(v*w*x-y)**2
def fd(fn,x,h=1e-5):return (fn(x+h)-fn(x-h))/(2*h)
for x,y,gw,gv in [(1,4,6,4),(2,8,24,16)]:
    check(fd(lambda w:scalar_loss(w,3,x,y),2),gw,1e-7)
    check(fd(lambda v:scalar_loss(2,v,x,y),3),gv,1e-7)
check((6+24)/2,15);check((4+16)/2,10)
check((1*2+3*6)/4,5)
assert (2+6)/2!=5;bugs.append('unweighted replica means')
assert reference([[1,2]],[[1,3],[2,4]])==[[5,11]]
assert [1,3]+[4,8]!=[5,11];bugs.append('concatenate partial sums')

# Pipeline: max-plus recurrence compared with an independent tick scheduler.
def schedule(durations,count,blocked=None):
    S=len(durations);done=[[0]*count for _ in durations]
    for s,d in enumerate(durations):
        for m in range(count):
            done[s][m]=max(done[s-1][m] if s else 0,done[s][m-1] if m else 0,(blocked or [0]*S)[s])+d
    return done

def ticks(stages,count,duration):
    completed=[[None]*count for _ in range(stages)]
    running=[None]*stages;t=0
    while completed[-1][-1] is None:
        for s,state in enumerate(running):
            if state is not None and state[1]==t:
                completed[s][state[0]]=t;running[s]=None
        for s in range(stages):
            if running[s] is not None:continue
            for m in range(count):
                if completed[s][m] is not None:continue
                if s and completed[s-1][m] is None:break
                running[s]=(m,t+duration);break
        if completed[-1][-1] is not None:break
        t+=1
    return completed
pipeline_cases=0
for stages in range(1,5):
 for count in range(1,6):
  for duration in [1,2,3]:
    actual=schedule([duration]*stages,count)
    assert actual==ticks(stages,count,duration)
    check(actual[-1][-1],(count+stages-1)*duration,0);pipeline_cases+=1
assert schedule([2,2,2],4)[-1]==[6,8,10,12]
assert schedule([2,2,2],4,[0,5,0])[-1]==[9,11,13,15]
check(4/6,F(2,3))
assert 3*4*2!=12;bugs.append('serial schedule mislabeled pipelined')
# A deterministic slot ledger tracks admission, returns and optimizer windows.
class Ledger:
    def __init__(self,capacity=2,threshold=3):
        self.capacity=capacity;self.threshold=threshold;self.cache={};self.seen=set();self.pending=0;self.steps=0;self.epoch=1
    def forward(self,key,time):
        if key in self.cache or len(self.cache)>=self.capacity:return False
        self.cache[key]=(self.epoch,time);return True
    def backward(self,key,time,epoch):
        if key in self.seen or key not in self.cache or epoch!=self.epoch:return False
        cached_epoch,started=self.cache[key]
        if epoch!=cached_epoch:return False
        del self.cache[key];self.seen.add(key);self.pending+=1
        if self.pending==self.threshold:self.steps+=1;self.pending=0
        return True
L=Ledger();assert L.forward('A',0) and L.forward('B',1)
assert not L.forward('C',2)
assert L.backward('A',4,1) and L.forward('C',4)
assert L.backward('B',7,1) and L.backward('C',10,1)
assert L.steps==1 and L.pending==0 and not L.cache
assert not L.backward('C',11,1);bugs.append('duplicate backward credited twice')
assert L.forward('D',12);L.epoch=2
assert not L.backward('D',13,1);bugs.append('old-epoch gradient accepted')
# Backward-first selection permits progress at full cache.
ready_forward=deque(['C']);ready_backward=deque(['A']);cache={'A','B'}
def pick():
    if ready_backward:return 'B',ready_backward.popleft()
    if len(cache)<2 and ready_forward:return 'F',ready_forward.popleft()
    return None
assert pick()==('B','A') and pick() is None
cache.remove('A');assert pick()==('F','C')
# Return-aware accounting resolves logical IDs only once; local failures are unscored.
pending={'sample':('peer',0)};costs=[]
for time in [7,8,9]:
    data=pending.pop('sample',None)
    if data:costs.append(time-data[1])
assert costs==[7]
pending={'lost':('peer',0)};pending.clear();assert pending.pop('lost',None) is None
check(.2*10+.8*40,34)
factor=lambda reference,cost:min(4,max(.2,(reference/cost)**1.5))
check(factor(50,20)/factor(50,80),8)
check(factor(50,1000),.2);check(factor(50,1),4)
assert len(costs)!=3;bugs.append('send attempts counted as unique returns')

# Pseudogradient chunking and merge with explicit finite and binding checks.
def pseudo(previous,current,chunks):
    if len(previous)!=len(current) or not previous or chunks<1:raise ValueError('shape or chunk count')
    width=(len(previous)+chunks-1)//chunks;result=[]
    for start in range(0,len(previous),width):
        result.extend(a-b for a,b in zip(previous[start:start+width],current[start:start+width]))
    return result
for n in [1,2,10,13]:
    old=[float(i) for i in range(n)];current=[i*.75-1 for i in range(n)]
    ref=[a-b for a,b in zip(old,current)]
    for chunks in [1,2,3,4,11]:assert pseudo(old,current,chunks)==ref
check((10+3-1)//3,4,0)
assert [len(list(range(10))[i:i+4]) for i in range(0,10,4)]==[4,4,2]
assert [x/3 for x in pseudo([10,20],[9,18],3)]!=[1,2]
bugs.append('chunk count used as divisor')
def merge(old,old_m,contributions,mu,eta,binding):
    if not contributions:raise ValueError('no valid contributors')
    total=[0.]*len(old);denominator=0.
    for record in contributions:
        if record['binding']!=binding:raise ValueError('stale artifact binding')
        g,weight=record['g'],record['weight']
        if len(g)!=len(old) or not math.isfinite(weight) or weight<=0 or not all(math.isfinite(x) for x in g):raise ValueError('invalid contribution')
        total=[a+weight*x for a,x in zip(total,g)];denominator+=weight
    g=[x/denominator for x in total]
    buffer=[mu*m+x for m,x in zip(old_m,g)]
    result=[w-eta*(x+mu*b) for w,x,b in zip(old,g,buffer)]
    return result,buffer,g
bind=('run-fixture',1,4,2)
records=[dict(binding=bind,g=[1.,2.],weight=1.),dict(binding=bind,g=[2.,-1.],weight=1.)]
new,m,g=merge([10,20],[0,0],records,.5,.2,bind)
for a,b in zip(new,[9.55,19.85]):check(a,b)
assert g==[1.5,.5]
weighted=[dict(r) for r in records];weighted[1]['weight']=3
assert merge([10,20],[0,0],weighted,.5,.2,bind)[2]==[1.75,-.25]
rejects(lambda:merge([10,20],[0,0],[],.5,.2,bind));bugs.append('empty merge treated as success')
bad=[dict(records[0],binding=('run-fixture',1,3,2))]
rejects(lambda:merge([10,20],[0,0],bad,.5,.2,bind));bugs.append('stale merge binding')
bad=[dict(records[0],g=[float('nan'),2])]
rejects(lambda:merge([10,20],[0,0],bad,.5,.2,bind));bugs.append('nonfinite merge contributor')
assert pseudo([10,20],[9,18],1)!=pseudo([9,18],[10,20],1)
bugs.append('pseudo-gradient sign reversal')

# Lifecycle traces: stale or other-session evidence never revives a reset state.
def project(events,session):
    state='unknown';last=-math.inf
    for event,time,event_session,body_ok in events:
        if event_session!=session or time<last:continue
        last=time
        if event=='registered':state='admitted'
        elif event=='reset':state='reset'
        elif event=='heartbeat_response' and not body_ok:state='needs_review'
        elif event=='training_progress' and state=='admitted':state='admitted'
    return state
trace=[('registered',4,'S',True),('training_progress',12,'S',True),('reset',16,'S',True),('training_progress',12,'S',True)]
assert project(trace,'S')=='reset'
assert project(trace+[('registered',20,'OLD',True)],'S')=='reset'
bugs.append('late progress revives reset session')
assert project([('registered',4,'S',True),('heartbeat_response',5,'S',False)],'S')=='needs_review'
bugs.append('HTTP 200 treated as semantic admission')
check(3.5-1.2,2.3);check(5-4,1);check(4*800*32*2,204800,0)
check(204800/1024,200);check(4*800*128*2/1024,800)
check(2*3*5,30,0);check(2*3,6,0)
check(12-8,4);check(8-4-1+1,4);check(4-0,4);check(15-4,11)

# Every learner-facing Python example executes independently on CPU.
snippets=0
for chapter in fragment['chapters']:
 for episode in chapter['episodes']:
  for block in episode['blocks']:
   if block['type']!='text':continue
   for snippet in re.findall(r'^```python\n(.*?)^```$',block['markdown'],re.S|re.M):
       tree=ast.parse(snippet)
       assert not any(isinstance(n,(ast.Import,ast.ImportFrom)) for n in ast.walk(tree))
       exec(compile(snippet,episode['id'],'exec'),{});snippets+=1

# Fresh assessment fixtures, independently calculated from the prompts.
a=[[i+j+1 for j in range(6)] for i in range(6)];b=[[i-j for j in range(6)] for i in range(6)]
_,reads,writes,_=tiled(a,b,3)
new=merge([8],[1],[dict(binding=bind,g=[1],weight=1),dict(binding=bind,g=[3],weight=1)],.5,.2,bind)[0][0]
successes=['A','B','D','E','E','F','G']
expected={
 '09-01':((19+7)//8)*8-19,
 '09-02':(reads+writes)*4,
 '09-03':3*5*4*2,
 '09-04':6+6+12+4-(32-8),
 '10-01':(2*4+3*(-1))/5,
 '10-02':ticks(4,5,3)[-1][-1],
 '10-03':factor(40,160),
 '10-04':new,
 '11-01':12-9,
 '11-02':len(range(11-5-1))+1,
 '11-03':len(set(successes))%4,
 '11-04':23-3,
}
for n,value in expected.items():
    key=items['sys-a'+n+'-trace']['grading'];check(value,key['expected'],1e-8)
assert len(expected)==len([a for a in fragment['assessments'] if a['type']=='numeric'])
assert len(bugs)==len(set(bugs))
print(json.dumps(dict(arithmetic_assertions=checks,reduction_cases=reduction_cases,matrix_tile_cases=matrix_cases,pipeline_schedule_cases=pipeline_cases,numeric_keys=len(expected),python_fences=snippets,source_hashes_verified=len(pins['records']),bug_variants_rejected=bugs),indent=2))
```

Run the embedded check without creating another file:

```sh
python3 - <<'PYVERIFY'
from pathlib import Path
import re
p=Path('~/git/course-llms-and-models/content/systems-and-distribution-review.md')
code=re.search(r'^```python\n(.*?)^```$',p.read_text(),re.S|re.M).group(1)
exec(compile(code,str(p),'exec'))
PYVERIFY
```

Run released-SDK and parent assembly validation in memory, from the private course root:

```sh
cd ~/git/course-llms-and-models
node --input-type=module - <<'JSVERIFY'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCourse} from '@course-core/sdk';
import {verifyCompiledCourse} from '@course-core/sdk/compiler';
import {assemble} from './scripts/assemble.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const modules=['foundations','training-and-transformers','systems-and-distribution'].map(n=>read('content/'+n+'.json'));
const config=read('content/course-config.json');
const compiled=assemble(config,modules,{preview:true});
assert(validateCourse(compiled.server).valid && verifyCompiledCourse(compiled));
const standalone=validateCourse({...config,...modules.at(-1)});
assert(!standalone.valid);
assert(standalone.issues.every(i=>i.code==='MISSING_REFERENCE'&&/^\/objectives\/\d+\/prerequisites\//.test(i.path)));
for(const a of compiled.learner.assessments)assert.deepEqual(Object.keys(a).sort(),['id','objectiveIds','type']);
for(const a of compiled.server.assessments)assert(!JSON.stringify(compiled.learner).includes(a.grading.explanation));
console.log('Released SDK, in-memory preview assembly and learner projection passed');
JSVERIFY
```

## Remaining integration boundary

No GPU or worker job, live fleet check, SSH connection, secret/wallet operation, package installation, commit, push or external message was performed. Only the two assigned content files were written. The parent owns source snapshot publication inside the private application, complete-course assembly, rendering/accessibility, attempt authorization, assistance-aware gates, fresh/retention variants and practical grading. No policy, runtime or deployed implementation is claimed complete by this fragment.

## Content and dependency fingerprints

These hashes identify the final content and consumed release/assembly inputs. They do not freeze unrelated concurrent parent work.

- `content/systems-and-distribution.json`: `236306acf56dd30fadc12b53fefda3389da43fc41f76ef1da440730fc98f13bc`
- `planning/curriculum.json`: `a09bebe39e0b329ea62c7e05bc831ba4b30d81b82851d363dbfb405926a706a5`
- `scripts/assemble.mjs`: `a53669d5f501400e573b99fd7840c963e44207accd4591f4584328e042eec094`
- `node_modules/@course-core/sdk/package.json`: `de1691d627c7788816a509fded10e4f42c77c3c005b62ff0f38cad2eef1183ba`
- `node_modules/@course-core/sdk/dist/validate.js`: `4a0b481662de9f8936a0124d673579c2588726cbfc302dc8436b6c84b1fe8028`
- `node_modules/@course-core/sdk/dist/compiler.js`: `ce225c486bc857a27d06db9841c9becf2bcfa1146909281404fb8e7cd6ae7228`

Verification environment: Python `3.9.6`, Node `26.9.0`.
