# Course 0.1.6: learner-evidence features on SDK 0.4.0

Status: staged and verified against the released Core 0.1.34 runtime. **Not packaged,
published or released, and not installed on the pilot.** The running pilot under
`~/Library/Application Support/Course Core/Pilot` was not touched.

Course 0.1.6 is course 0.1.5 plus the newer Core/SDK capabilities that an audit found
unused: optional placement, human-reviewed written explanations, delayed retention
checks and reviewed remedial episodes. Packaging now also carries every verified
illustration overlay. No existing teaching text, question, gate threshold or policy
was shrunk or rewritten.

## SDK upgrade

- Dependency: `https://github.com/roeehrl/course-sdk/releases/download/v0.4.0/course-core-sdk-0.4.0.tgz`
  (release v0.4.0, tag commit de12af5, release run 38480355527).
- Downloaded tarball SHA-256 `f548f0f92494f1beaa18f3710c964d74684b40c95c7399351d9074244c512839`
  equals the `sha256` in the release's `verification.json`; its SHA-512
  (`tRkGILEB…R4tg==`) equals the release's `integrity` and the lockfile entry.
- `@course-core/visuals` 0.1.0 keeps its own nested SDK 0.2.0, as before.
- Rebuild under 0.4.0 left the worked-example verifier identical
  (`c5330df6…`, 60,380 bytes); course content compiles and validates unchanged.

## What was added and why

### Placement (optional, declinable)

- Objectives: the 12 chapter 1–3 objectives `fnd-o01-01` … `fnd-o03-04`, which the
  authors had already marked `placeable: true`.
- Items: exactly the 24 existing independent short checks (one numeric, one choice
  each) of episodes `fnd-e01-01` … `fnd-e03-04`. No new question was written;
  written explanations, practicals and retention items are excluded by assembly.
- `maxItems` 24, no protected episodes. Chapter 4 objectives stay non-placeable, so a
  run always stops at `fnd-e04-01` at the latest.
- Why: chapters 1–3 are foundations a learner may already know. Core places out of an
  episode only when the run's own independent answers satisfy its whole gate and
  every prerequisite, and a single wrong answer stops the walk there.

### Written explanations (rubric, human review)

| Item | Episode | Objective | What the learner explains |
| --- | --- | --- | --- |
| `wri-06-03` | `ttf-e06-03` Teacher forcing, causal masking | `ttf-o06-03` | shifted targets for `[4,2,7,1]`, what leaks without the mask, a detecting test |
| `wri-12-01` | `eng-e12-01` Finite, deterministic and correct | `eng-o12-01` | why `[1,3,2,4]` passes finiteness/repeatability/sum checks yet is wrong |
| `wri-12-04` | `eng-e12-04` Diagnosis, containment, disclosure | `eng-o12-04` | a disclosure note separating supported findings from hypotheses |
| `wri-14-04` | `eng-e14-04` Final review: teach back | `eng-o14-04` | teach-back of the 1.4 / 1.64 updates and the stale 2.04 version |

- 16 criteria (12 required, 4 optional). Each begins with what the learner *states,
  explains, names, gives, describes, proposes or notes*, so a reviewer can quote it;
  Core refuses a "met" finding whose quote is not in the learner's own words.
- Each item is first in its gate as an **extra** independent family; the gate keeps
  requiring two families. The learner app therefore offers the written explanation
  first, but the two short checks still decide completion, so review latency never
  blocks progress. A "met" review adds a third family of evidence.
- Why these four: claim discipline, disclosure and teach-back are shown in words far
  better than by a choice item, and the episodes themselves ask for written defence.
  Practical (code) gates were deliberately left alone.

### Delayed retention checks

- `intervalsDays: [2, 7, 21]` (SDK: strictly increasing whole days 1–365, at most 8).
  The last check lands within the 90-day window even for chapter 13 objectives.
  These are author defaults to tune with real learners, not a scientific constant.
- Six core objectives, four held-out numeric items each (one per interval plus one
  retry), 24 items:

| Objective | Episode | Procedure |
| --- | --- | --- |
| `fnd-o03-03` | `fnd-e03-03` Gradient descent and learning rate | repeated descent step with a reused gradient |
| `fnd-o04-03` | `fnd-e04-03` Saved activations, recomputation, accumulation | remaining microbatch gradient sum |
| `ttf-o06-04` | `ttf-e06-04` Sampling, context, KV caches | additional KV-cache bytes |
| `ttf-o07-01` | `ttf-e07-01` Queries, keys and values | omitted K-projection parameters |
| `sys-o10-02` | `sys-e10-02` Microbatches, bubbles | pipeline fill/drain time |
| `eng-o13-04` | `eng-e13-04` Benchmarking, guarded rollout | end-to-end speedup with setup cost |

- Items are instances of the course's own reviewed numerical recipes
  (`scripts/create-retention-checks.mjs`), never used by a gate, placement or episode
  block, and chosen to avoid every numeric recovery variant (ordinals below the
  family cap of 20), every staged worked example and the authored bank binding.
  Answers have at most three decimals. The learner bundle holds only the schedule.
- The chain-rule objective was considered but its recipe space leaves only two unused
  combinations, so it was not used.

### Reviewed remedial episodes (`insert_episode`, `authored-teaching-bank-v1`)

| Profile | Anchor episode | Objective | Episode |
| --- | --- | --- | --- |
| `profile-remedial-strides` | `fnd-e02-02` | `fnd-o02-02` | Strides, one address at a time (3 blocks) |
| `profile-remedial-chain-rule` | `fnd-e03-02` | `fnd-o03-02` | The chain rule, one link at a time (3 blocks) |
| `profile-remedial-backward-fanout` | `fnd-e04-02` | `fnd-o04-02` | Backward: accumulate every path (2 blocks) |
| `profile-remedial-attention-mask` | `ttf-e07-02` | `ttf-o07-02` | Masked attention, one query by hand (3 blocks) |

- Each restates its anchor episode's own worked example step by step (same storage,
  same `x=2,y=5,w=1`, same `x=3` fan-out graph, same `q=1`, keys `[0,log 3]`). Every
  number is either in the anchor episode or recomputed by the verifier.
- Optional, 8 planned minutes, metered as one additional episode; no grading. Core
  inserts it immediately after the anchor (available once the anchor is completed)
  only after learner opt-in to personal support and a supervisor selection.
- Why these four: they are prerequisites that many later episodes build on and the
  usual errors are structural (units/base offset, a missing chain link, overwritten
  fan-out gradients, masking by zero). A second question re-tests; a slow worked pass
  before the dependent episode re-teaches.
- Registry: 158 profiles = 115 recovery + 4 remedial + 39 worked examples.

### Illustrations in packaging

`scripts/assemble.mjs` now owns one `VISUAL_OVERLAYS` list (`visuals`,
`systems-visuals`, `learning-visuals`, `concept-visuals`) used by assembly, recovery
binding and worked-example staging. Previously binding and staging used only the
first three overlays, so the 24 concept illustrations were missing from packages.
The staged 0.1.6 course carries all 39 visuals (39 illustrated episodes) and the
released Core 0.1.34 accepted it at publish in both acceptance flows.

### Not added

Research/experiment declarations (`research.publicTopics`) were not added: they need
author-approved public query text and domain review, and they were outside this
release's goals. Left for a separate decision.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 22/22 (adds 7 tests in `test/evidence-features.test.mjs`) |
| `npm run verify:math` | passes; now includes `verification/evidence-features.py` (273 checks with negative controls) |
| `npm run verify:visuals` | passes (39 compiled visuals) |
| `npm run build` | 14 chapters, 56 episodes |
| `verification/learner-flow.mjs --worked-course` (HTTP) | passes: 56 episodes, 3 practical recoveries, 6 committed recovery assignments, 4 written answers pending without blocking, finite-bank exhaustion; 41 min (0.1.5: 14 min) |
| `verification/learner-flow.mjs --worked-course --browser` | **fails on the phone viewport at about episode 43**: `POST /answers` took 25.9 s and the 30 s UI wait expired (Core finding 4). Diagnostic runs of the other viewports alone pass: desktop declines placement and completes 16 episodes; tablet takes placement in the UI (24 items, 12 placed, accessible result page) and completes 4 episodes with recovery. The phone run had passed episodes 1–42, including the first written explanation. |
| `verification/feature-flow.mjs --worked-course` (new, HTTP) | passes |

`evidence-features.py` recomputes every retention answer with the separately
implemented procedures in `adaptation-reference.py`, checks hold-out and
non-overlap, checks placement items, recomputes every number in the remedial
episodes and written-explanation prompts, and rejects any number not taught by the
anchor episode.

The new released-surface flow (`verification/feature-flow.mjs`) uses only the
bootstrap CLI and HTTP routes, a disposable PostgreSQL 17 schema and the verified
Core 0.1.34 runtime. It covers: placement decline (and refusal to start after
study), placement after a miss (21 items, 10 placed, refusal to start past the
proposal), full placement (12 placed), a retention schedule opened by both normal
and placement evidence, `RETENTION_NOT_DUE` before the interval, a held-out check
answered and recorded as retained with the next interval at 7 days, a written answer
by an instructor-who-studies refused for self-review (`SELF_REVIEW_FORBIDDEN`) and
for a learner (`FORBIDDEN`), refused for an unquoted finding and an inconsistent
decision, then reviewed "met" by a separate reviewer account with idempotent
replay, and a remedial episode chosen by the supervisor, verified and applied by the
released bridge after the anchor, optional, never blocking the path, readable and
completable without creating evidence. Accounts are created through the People API.

Two harness stand-ins are explicit:

1. **Clock.** Core 0.1.34 has no operator control over "now", and the first interval
   is two days. The flow loads `verification/harness-clock.mjs` into the API process
   and advances only that process's wall clock for the single retention-check
   request, then restores it before the answer. PostgreSQL keeps real time.
2. **Model.** Core 0.1.34 can load only the Google provider at a fixed origin, and
   supervisor tool calls are only recorded while it answers. The flow answers that
   origin itself (`verification/synthetic-model.mjs`): a per-run private CA trusted
   only by the child process and a CONNECT proxy admitting that one host, with no
   upstream connection. The scripted model lists support, chooses the remedial
   episode and finishes; Core's own verifier and application do the rest.

## Verified versus not verified

Verified: data contracts, assembly invariants, arithmetic of every new number, that
the released Core accepts, serves, grades, schedules, reviews and applies these
features through its HTTP surface, and that none of them changes existing gates or
blocks completion.

Not verified:

- **Automated checks cannot show learning effectiveness.** Nothing here measures
  whether placement, retention spacing, written explanations or remedial episodes
  improve learning; that needs real learners and outcome data.
- **Written-answer review quality depends on human reviewers.** Core enforces quotes
  and decision consistency, not judgement. The fixture answers in
  `verification/written-answers.mjs` only exercise the mechanics.
- Real elapsed-day retention behaviour (only a process clock offset was used).
- A real model's choice of when to insert a remedial episode (the model was scripted).
- Remedial and written prose has not been reviewed by a second human teacher.
- A complete phone-width browser run of all 56 episodes (blocked by Core finding 4).
- Live providers, physical devices, native binaries, the pilot upgrade and a packaged
  0.1.6 artifact.

## Core / SDK findings

1. **No released path to insert a reviewed remedial episode without a live Google
   model.** Core 0.1.34 has no HTTP route that stages an `insert_episode` proposal
   (`stageVerifiedAdaptation` is an in-process hook; `POST
   /api/enrollments/:id/adaptation/:proposalId/apply` needs an already staged
   proposal), and `POST /api/admin/workspaces/:ws/provider-setup` refuses any adapter
   kind other than `google` (recorded by the feature flow as
   `nonGoogleProviderKindRefused`). The Google origin is fixed in
   `packages/providers/src/http.ts`. Earlier status notes describe "staff and
   supervisor paths"; only the supervisor path is reachable from outside the process.
   Repro: publish any course with a teaching-bank `insert_episode` profile, approve
   it, and try to apply it for an enrollment using only HTTP and no Google key.
2. **No time control for delayed checks.** `POST /api/enrollments/:id/retention/check`
   returns `409 RETENTION_NOT_DUE` until `demonstratedAt + intervalsDays[0]` (≥ 1 day);
   there is no operator or test clock, so released-surface acceptance must wait or
   shift the process clock.
3. `GET /api/runtime/extensions` lists only the current svg renderer build (0.1.1);
   a course declaring the accepted prior build 0.1.0 cannot confirm it from that
   listing even though publish accepts it.

4. **Every enrollment request re-validates every applied adaptation against the
   whole course, so cost grows with (applied adaptations × course size).**
   `loadEnrollment` (`services/api/src/repository.ts:54`) calls
   `resolveEnrollmentCourse` (`adaptation-store.ts:573`), whose
   `materializeAdaptation` (line 583) reruns the SDK's `validateCourseAdaptation`
   and `validateAssignmentDecisions` (full `validateCourse` plus canonical JSON of the
   course) for each applied proposal on every `GET /api/enrollments/:id` and every
   enrollment command. No error code; the symptom is latency. Minimal repro on the
   released runtime (`--max-old-space-size=512`): publish a course with an approved
   recovery registry, then for each episode answer one choice item wrongly, request
   `POST /api/enrollments/:id/adaptation/fresh-question`, answer the variant and
   complete the episode. Measured per-episode times for episodes 1–12:
   4.7 → 59 s for the 0.97 MB course, 11 → 185 s for the 1.93 MB 0.1.6 course,
   against a flat 0.16 s / 0.36 s with no recoveries. A CPU profile attributes
   76 % of time to `validateCourseAdaptation` (45 % `validateCourse`, 60 % JSON
   visiting). The second contributor is size: the concept illustrations double the
   server bundle (975 KB → 1.93 MB; learner snapshot 0.78 → 1.73 MB).
   On a fresh enrollment, snapshot-plus-command latency doubles from size alone
   (median 16 → 37 ms, p90 21 → 43 ms, same at 512 MiB and 2 GiB heaps). Over the
   full 56-episode HTTP acceptance, 0.1.5 took 14 minutes and 0.1.6 took 41, with
   the API process above 100 % CPU throughout. The pilot's API also runs with a
   512 MiB heap (`deploy/local/pilot.mjs` `apiHeapMiB`).

Items 1–3 did not block the work; all are worked around only in the test harness, as
described above, and none in course content. Item 4 is not a correctness
failure, but it makes the phone browser acceptance time out and would make late
episodes slow for any learner who used several recoveries. It also affects course
0.1.5, at half the size. Resolve it in Core (for example, materialize once per plan
revision) or ship 0.1.6 without the concept overlay before installing it; that
choice is left to the maintainer. The browser test's timeouts were not raised.

## Reproducing

```sh
npm ci
node scripts/create-retention-checks.mjs      # regenerates content/retention-checks.json
node scripts/bind-recovery-runtime.mjs        # regenerates recovery overlay + registry
npm run build && npm test && npm run verify:math && npm run verify:visuals
TEST_DATABASE_URL=postgres://…/course_core_test node verification/feature-flow.mjs \
  --runtime-dir <core 0.1.34 runtime> --release-dir <release assets> --worked-course
```

`npm run package:worked -- --output <new dir>` produces the 0.1.6 package from a clean
commit (contract: SDK 0.4.0, minimum Core 0.1.34, 158 profiles, 4 remedial). It was
exercised only by the package test in a temporary directory.
