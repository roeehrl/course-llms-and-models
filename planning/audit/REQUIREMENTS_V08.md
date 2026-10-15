# v0.8 requirement list (extracted from design.html + platform-sdk-debug-spec.json + learning-flow-spec.json + policy-spec.json)
Section refs: §n = design.html section; U/F/P = spec acceptance case IDs.

## A. Repo boundaries & genericity (§1, §9, §10A)
A01 Three repos: public core, public SDK, private course; private course consumes RELEASED SDK/Core only; core consumes released SDK and declares supported range (§9).
A02 Learner records only in private DB; public CI never fetches private course; public examples use unrelated domain; private-data egress/canary tests (§1, §17).
A03 Core has no course-ID branches / subject grading / private imports; dependency/architecture test fails on private import (U11, §10A).
A04 Generality gate: three course packs (public algorithms/interactive lab, public language/role-play assessment, private LLM course) run through unchanged core (§10A).
A05 External/clean-room author adds custom activity, evaluator AND admin setting with public SDK docs only, no core edits (U12, §10, §18).
A06 Hosting: authenticated private web deployment + documented self-host; local dev supported; docs on keeping supervision alive and degraded/offline mode (§1, §19).

## B. Persistent supervisor (§4, §9B)
B01 Durable per-enrollment supervision workflow + learner coordinator for cross-course profile; cross-course transfer needs explicit concept mapping.
B02 Loop: observe -> teaching hypotheses -> discriminating probe -> plan -> create/retrieve -> verify -> deliver -> independent assessment -> revise learner model -> follow up.
B03 Trigger table: high-confidence wrong -> ambiguity check/contrast case; repeated questions -> change representation/prerequisite (question never lowers evidence); correct output+faulty explanation -> transfer probe; strong evidence -> compress/advanced; review due/session ended -> prepare next within budget; challenged grade/source -> re-evaluate & repair.
B04 Logical roles planner/companion/research/builder/evaluator/verifier; one writer commits plan; concurrent builders propose alternatives; cancelled tasks can't publish late.
B05 Job states (waiting, analyzing, building, verifying, ready, applied, follow-up due, evaluating, needs-input, budget-wait, failed, cancelled) and job record (input evidence, objective, model config, artifacts, checks, cost, revision, retry); uncertain external call reconciled before retry.
B06 Course-scoped autonomy opt-in; learner sees & can undo changes; goal/grading/paid ceilings need separate authority.
B07 Temporal: model/tool calls as activities, idempotent domain commands, continue-as-new, large artifacts in object storage, crash/retry proof.
B08 Generic agent dispatch (strategy ID, input schema, tool refs, capability reqs, budget, deadline, retry/cancel, output contract); authors supply strategies/tools via SDK (defineAgentStrategy); framework state never source of truth.
B09 Supervisor budgets per learner/day/artifact; stop at ceilings with explanation; coalesce noisy events (§19).

## C. Editable learner model (§5, §11)
C01 Four separate record classes: declared facts/prefs, observed evidence, teaching hypotheses, skill projection.
C02 Declared edits take effect immediately and override inferred preferences; self-report shown alongside observed.
C03 Evidence: inspect, dispute, exclude, delete; claim of knowledge does not fabricate an attempt.
C04 Teaching hypotheses visible with evidence/uncertainty; learner can correct/reject/pin/request diagnostic.
C05 Skill projection states unassessed/practicing/demonstrated/retained/needs-review/disputed with policy explanation.
C06 Claim provenance: evidence IDs, scope, author, timestamp, uncertainty, expiry, learner override.
C07 No intelligence scores / learning styles / diagnoses / personality labels.
C08 Export + deletion are domain ops; deletion cascades to retrieval/cache/summaries/derived claims; backup retention/deletion windows documented.
C09 Plan/profile patches carry expected revision; stale proposals rebase/fail visibly; learner override survives competing agents.

## D. Companion & context (§6)
D01 Typed ContextCapsule with design fields (enrollment, courseDigest, pathRevision, episode, block, activityInstance, attempt, uiRevision, selectedAnchor, simulationState, codeSnapshotHash, assessmentMode, profileRevision, evidenceRefs, recentEventCursor, historyRefs, sourceRefs, authorizationScopes, resolvedConstraintSnapshot, policyRevision, extensionAllowanceRefs, currentStepId, pendingGateDecisionRef, mediaRef, playbackSeconds, reviewedSegment).
D02 Bounded authorized retrieval of history (not all pasted); source-linked summary; "Context used" displayed and learner-correctable.
D03 Chat waits for event cursor/snapshot; responses echo context revision; switching episode during generation keeps answer attached to original (stale-context test).
D04 External agents via scoped MCP/HTTP tools: get_context, get_profile, get_evidence, get_history, propose_intervention; same authz; no token passthrough.
D05 Truthful companion states (available/responding/building/waiting/provider unavailable/offline); questions persist during outages; server supervision continues when browser closed.
D06 Real provider tutoring with Google model (live).
D07 Select a code line/formula/graph node/log entry; companion sees selection anchor.

## E. Dynamic content & executable teaching (§7, §16)
E01 Supervisor can author whole remedial episodes, simulations, code exercises, examples, tests, advanced branches.
E02 Pipeline: need+evidence -> spec -> generation -> schema/coverage -> reference & negative tests -> a11y -> review -> personal revision -> delivery -> transfer check -> outcome record.
E03 Immutable releases + content-addressed personal revisions (parent, concepts, rationale, assets, tests, sources, validation report, rollback target); apply at safe boundary; preserve learner code/place.
E04 Common computational model: one tested model drives visual/formula/trace/answers; divergence detected (contradictory representations test).
E05 New generated components built/tested in isolated workspace; published as immutable sandboxed plugin; never in parent origin.
E06 Unverified explanation marked, no mastery credit; new high-impact rubrics/removal of objectives/ambiguous keys need review; tests accept valid variants, reject wrong ones (bad generated math test).
E07 Old attempts keep item/rubric versions; fixing defective item invalidates evidence with reason + replacement check.
E08 Personal changes visible, undoable, source-linked.
E09 Remedial insertion reachable via an HTTP/staging route without a live model (known open item).

## F. Assessment (§8)
F01 Item kinds: prediction, numeric, trace annotation, code repair, counterexample, experiment design, teach-back.
F02 Demonstrated = independent success in two item families incl. transfer and no unresolved critical misconception; Retained = + delayed independent check.
F03 Reattempts not independent; hints/reveals recorded; "I don't know" not punished; confidence optional and alone never pass/fail.
F04 Evaluators: deterministic+tolerance; isolated code tests w/ hidden variants; explanation rubric with cited spans (AI proposes); design/incident rubric + review/appeal.
F05 Uncertain/disputed judgments -> clarification/pending; generated keys independently validated; observable rubric reasons only.
F06 Spaced review 1/3/7/21 day defaults adjusted; no uncalibrated mastery %.
F07 Duplicate evidence prevented under crash/retry/reorder (one accepted attempt).
F08 Retention clock control for tests (known open item).

## G. Caps, deadlines, extensions (§8A, policy-spec)
G01 Declared completion policy; bounded default; open-ended explicit opt-in; publish validator rejects bounded policy without terminating condition.
G02 Controls: target date, hard end, relative duration, required-work budget, assessment policy, access & closure permissions, open-ended mode at the specified scopes.
G03 Hierarchy org->course->enrollment->chapter->episode; child can only tighten; earliest deadline; all quotas; binding-constraint explanation.
G04 Time: UTC + IANA zone + calendar rule; DST resolved preview; anchors persisted, never reset by refresh/revision/handoff (P10, P11).
G05 Pause rules; accommodations/outage adjustments audited, separate from discretionary pools (P12).
G06 Feasibility check before enroll/publish; disclose infeasibility & alternatives (P18).
G07 Resolved constraint snapshot given to supervisor every turn; companion displays same values.
G08 Reserve core/final assessment room; stable core coverage denominator; personal extras separate counter.
G09 Extension pools (units, maxPerGrant, maxGrants, scopes, shared pools, approvals, ceiling); full offer contract fields; affirmative acceptance; decline no debit; cooldown & offer frequency (P04); clip/bundle vs parent (P01).
G10 Offer state machine; acceptance revalidated; atomic idempotent grant+debit+schedule+audit; no double spend across devices (P02, P03).
G11 Template change no refill/reset (P05); admin impact preview & explicit migration; never silently shorten grants (P16).
G12 Server-side policy gates planning, job admission, tool calls, publication; atomic reservations; renamed/recreated remedial material still counted (P06).
G13 Durable timers + commit-time fences; stale jobs fenced by policy revision (P07, P17).
G14 On-time submission graded after cutoff records evidence without reopening (P08).
G15 Closure: orthogonal outcomes, final evidence report with gaps, read-only access by default, continuation opt-in, closed-course Q&A budget (P09, P20).
G16 Refunds, revocations, exceptional grants as separate audited operations.
G17 Open-ended child under capped parent still bound; course-level open-ended keeps per-job finite (P13, P14).
G18 Core domain commands: resolveConstraints, previewPolicyChange, proposeExtension, acceptExtension, grantExtension, closeEnrollment.

## H. Optional placement (§8B, placement_contract)
H01 Admin-enabled (off by default); learner can decline; "Start from the beginning" default; decline no penalty (U08).
H02 Author declares placeable objectives, protected prerequisites, non-skippable units, blueprint, limits/stop rules, skip thresholds, cooldown/retest.
H03 Tutor help during placement marked assisted; not placement evidence.
H04 Result explains placeable objectives & supporting tasks, uncertain areas, next activity; no global beginner/expert label.
H05 No global score skips untested critical prerequisite (U09).
H06 PlacementEvidence + PathExemption; no fabricated visits/retention; learner may revisit / start earlier with evidence retained (U10).
H07 Interrupted/offline resume from receipt; partial -> unknown; provider failure = pending (U05).
H08 Admin/debug view of evidence per exemption, versions, overrides; false-skip/unnecessary-repetition tracking.

## I. Platform, mobile, native (§9A, platform_contract)
I01 Responsive web: compact <600 / medium 600-839 / expanded 840+ by effective window, not device.
I02 Phone: one central activity, next action above keyboard/safe area, companion sheet/full-screen; help never loses answer.
I03 Tablet: lesson + companion pane, collapsible; no stretched phone layout.
I04 Desktop: constrained reading width; companion & (debug only) inspector in remaining space.
I05 Accessibility: font scaling, screen readers, keyboard, reduced motion, no hover-only, 44px targets.
I06 Input/lifecycle: IME/keyboard, focus restoration, rotation/resize, background/resume, slow networks, interrupted uploads (U02, U03).
I07 Native iOS/iPadOS/Android binaries, CI simulator/emulator builds, Maestro, real-device smoke (U01) -- DEFERRED BY USER.
I08 Every activity declares required_activity_fields [supportedTargets, rendererRefs, executionAdapter, capabilityRequirements, equivalentFallbacks, offlineBehavior, resourceBudget, accessibleSemantics, stateMigration]; unsupported target blocks publication (U06).
I09 Offline drafts; reconnect dedupe; conflicting drafts preserved; authoritative receipts; offline progress pending (U04, F15).
I10 Secure credential storage on native (deferred with native).
I11 Dynamic native capability loading denied (U07).

## J. Framework choices (§9, §9B)
J01 Temporal durable backbone.
J02 Capability-based model/tool gateway (AI SDK or equivalent), provider adapters declare tools/structured output/limits/cost.
J03 Deterministic versioned typed policies (OPA optional).
J04 Promptfoo agent regression evals + held-out rubric fixtures; curated dialogues (novice/expert/terse/guessing/frustrated/adversarial…) scoring factuality, diagnosis restraint, hint leakage, grounding (§18 Agent evals).
J05 OpenTelemetry + domain debug records.
J06 Optional Langfuse MIT-core adapter.
J07 Full-text retrieval first (pgvector later).
J08 Private S3-compatible artifact store.
J09 Optional Pydantic AI/Evals Python adapter (optional).

## K. SDK (§10, §10A)
K01 define* API: defineCourse, defineConcept, defineEpisode, defineAssessment, defineActivity, defineRubric, defineTool, defineAdaptationPolicy, defineLearningPolicy, defineAdminSection, defineLearningStep, defineProgressionGate, defineMediaResource, defineStoryboard, defineResearchTask, definePlacementPolicy, defineExtension, defineRenderer, defineEvaluator, defineAgentStrategy, definePlatformAdapter, defineDebugInspector, defineVisualExperience, defineScene, defineTimeline, defineRendererAdapter.
K02 TS DSL compiles to language-neutral JSON schema bundle; direct schema authoring supported.
K03 CLI: course init/dev/validate/test/pack/diff/migrate/import.
K04 Bundle: manifest, integrity map, license/source inventory, required capabilities, conformance report.
K05 Stable contracts (CourseManifest … DebugTrace, DecisionRecord) exist as schemas/types.
K06 Renderers/agents emit observations only; only assessment service issues verified evidence; agent answers marked synthetic.
K07 SDK validates cap/allowance/admin schemas; policy-fixture tooling.
K08 Untrusted text = Markdown + allowlisted semantic blocks; no MDX/JS compiled in core.
K09 Four extensibility levels (declarative, sandboxed plugin, trusted adapter, native module).
K10 defineExtension portable contract (targets per platform, state/observation schema, migrateState, capabilities, a11y refs, budget, evaluatorRef, tests, license, integrity); runtime denies undeclared capabilities.
K11 Language-neutral JSON Schema + generated TS types; headless engine; HTTP/MCP protocol for server tools.
K12 DX: local preview, admin preview, scaffolding, contract fixtures, deterministic seed/replay, compatibility reporting, migration tools.
K13 Semver + explicit migrations; unsupported mandatory capabilities refused before enrollment.
K14 Interop: stable IDs + portable event export (QTI/xAPI later).

## L. Visual/animation SDK (§10B)
L01 VisualExperience/Scene/Timeline/Interaction contract + helpers defineScene/defineTimeline/bindData/responsiveVariant/defineRendererAdapter.
L02 Composition: layered scene graph, symbols, paths, images, text, equations, clipping, masks, gradients, annotations, responsive constraints.
L03 Motion: timelines, keyframes, easing/springs, sequencing, stagger, path morph, camera.
L04 Interaction: tap/drag/scrub/keyboard bound to state & computation, accessible alternatives.
L05 Deterministic simulation: seeded, reversible stepping, synchronized tables/code/formulas; reference checks/invariants in tests.
L06 Responsive layouts (compact/tabletPortrait/tabletLandscape/wide) with logical object IDs preserved.
L07 Renderer adapters: SVG/native SVG, Skia, Reanimated; Lottie/Rive optional; per-renderer feature declaration.
L08 Design tools: gallery, multi-device live preview, timeline scrubbing, parameter inspector, export.
L09 Resource limits, lazy load/dispose, pause when hidden, reduced-motion, accessible tree/trace table.
L10 Replay/scrub cannot duplicate submissions; animation completion = observation, never mastery.
L11 Debug inspector shows scene/timeline/bindings/renderer/asset hashes.
L12 Visual acceptance gates: keyframe/layout checks, invariant tests, malformed asset rejection, resource limits.

## M. Data model & consistency (§11)
M01 LearningEvent envelope fields; domain update + outbox atomic; idempotent consumers.
M02 First-class entities persisted: LearningPolicyRevision, ScopeClockAnchor, ConstraintSnapshot, WorkReservation, ExtensionPool/Offer/Grant, AccommodationOverride, ClosureReport, ProgressionGateRevision, GateDecision, LearningStepInstance, MediaCandidate/Review, MediaJob, PlaybackContext, PlacementRun/Evidence, PathExemption, ExtensionManifest, PlatformCapabilitySnapshot, DebugTrace, DecisionRecord.
M03 Grading binds item/key/rubric/evaluator/code hashes; regrade supersedes with provenance.
M04 Resumable event streams across disconnects.
M05 Stable semantic anchors; answer records exact content version.
M06 Summaries reference source events; compaction doesn't invent/erase.

## N. Tools & execution (§12)
N01 Tool families (research, authoring, visual/media, code/labs, assessment, planning/profile, delegation) with validation.
N02 Browser execution: lazy worker, isolated origin, CSP, budgets, terminate runaway (Pyodide).
N03 Server sandbox: nonprivileged ephemeral containers, CPU/mem/time/output limits, no host fs/secrets, no network by default (sandbox escape test).
N04 Native GPU lab runner (optional; v1 uses simulations).
N05 Capability scopes enforced server-side per tool call; retrieved content is data; credentials server-only.
N06 Payload ceilings 16KiB events / 64KiB context; tool grants revocable mid-job, blocking later publication.
N07 Provider/prompt changes are evaluated revisions.

## O. Research & media (§12A, learning-flow research_agent/media_jobs)
O01 Dedicated research agent callable while studying; own queue/tool budget/deadline/cancel.
O02 Research request fields; minimal public queries, no private learner data (F10).
O03 MediaCandidate result fields; inspected evidence; metadata-only = unreviewed (F09).
O04 Results go through validation/policy pipeline; supervisor chooses one; optional labeled; provenance inspectable; source content untrusted.
O05 YouTube Data API discovery; official IFrame player; reviewed segments; return to pending step.
O06 Caption authorization not assumed; click-to-load privacy-enhanced embed; error/unavailable fallback (F08).
O07 Companion receives media ID/segment/timestamp; playback never credit (F02).
O08 MediaJob service: provider contract (discoverCapabilities, estimateCost, start, getStatus, cancel, retrieve, idempotency, retention); states; budget before dispatch & publication; outcome_unknown reconciliation (F13).
O09 Video pipeline: script+storyboard, cost check, bounded job, factual/visual/caption review, content-addressed asset, captions/transcript/description provenance.
O10 Exact technical clips via verified scene renderer; generated video checked vs reference (F12); generated images.
O11 F11: topic switch keeps research/media result attached to original objective.
O12 Live Google video/image generation acceptance.
O13 Original illustration system; illustrations across all 56 episodes.

## P. Learner UX, gates, roadmap (§13, §13B, §13C, learning-flow)
P01 Guided path: one primary next action, Now->Next, step labels (required, optional_help, completed, current, locked, under_review, closed_with_gaps) with words+visuals.
P02 Progress/profile/settings under secondary "Your course"; admin separate.
P03 Companion beside lesson on desktop, labeled drawer on narrow.
P04 Optional help inline; closing restores exact step, draft answer, code snapshot, media state, anchor.
P05 WCAG 2.2 AA: reflow/200% zoom, focus, keyboard diagram alternatives, captions, MathML/text, no color-only.
P06 Gate contract (ProgressionGate fields) and GateDecision (ready/needs_evidence/needs_help/under_review/closed_with_gaps, criterionResults, learnerVisibleReason, evaluatorIdentity).
P07 Advance endpoint enforces gate; rejects stale versions, missing evidence, unauthorized decisions, synthetic answers; returns missing criteria & next actions (F03, F15).
P08 Rubric-backed conversational assessment can satisfy gate; model impression without evidence cannot (F04, F05).
P09 Reading/media/tab visits never satisfy a gate (F02); answer reveal requires fresh eligible check (F06).
P10 Blocked progression: smallest next action, keep place, appeals; LLM outage/missing video never claims non-understanding.
P11 Cap above gate: closure with gaps / extension, no infinite retry or false pass (F07).
P12 Concrete next-action language; shows return point after detour.
P13 Roadmap: stages/chapters/episodes; distinct completed/placed-out/current/locked/under-review/optional-detour; future metadata preview w/o credit; Continue targets current; vertical on phone; semantic controls; state preserved through resize.
P14 Roadmap generic SDK-driven (groups, titles, assets) – no course-specific layout in core.
P15 Usability targets (90% next action etc.) validated with real learners.

## Q. Course administration (§13A, P15, P16, P19)
Q01 Every course automatically gets core-provided admin workspace from SDK metadata (P19).
Q02 Overview: release, lifecycle, enrollments, deadline risks, content defects, supervisor health, approval queue.
Q03 Curriculum & releases: chapter/episode editing, drafts, preview, publish, archive, version history, rollback with affected-evidence analysis.
Q04 Pacing & caps admin.
Q05 Extensions & accommodations admin (pools, approvals, balances, overrides).
Q06 Placement admin (enable, blueprint, thresholds, protected units, retest, exemption review).
Q07 Learners & cohorts: enrollment, support, evidence, appeals, exclusions, overrides, export, deletion, effective-policy preview for one learner.
Q08 AI supervision admin: permitted tools, autonomy, gate modes, research providers/source policy, media budgets/review, notifications, queued interventions, pause/stop/resume, pending job reconciliation.
Q09 Assessments & content quality: rubrics/keys, wrong-answer fixtures, item defects, appeals, source freshness, validation reports, targeted regrading.
Q10 People & permissions: owner/admin, author, instructor, reviewer, support observer, service roles; scoped grants & revocation.
Q11 Debug & platform readiness area.
Q12 Audit & integrations: who changed what/why, policy diffs, receipts, compatibility, exports.
Q13 Role boundaries enforced server-side incl. via agent tool; admin doesn't imply chat access (P15).
Q14 Safe editing flow: draft->validate->preview representative learners->affected->publish; bulk diff + confirmation.
Q15 SDK extension admin sections (defineAdminSection) with permission requirements.
Q16 "View as learner" mode with persistent banner, no real writes.
Q17 Admin keyboard/screen-reader accessible and narrow-screen.

## R. CI & releases (§17)
R01 SDK PR: types/lint, schema/property tests incl cap/allowance, invalid fixtures, API compat, exported types, docs examples, npm pack install, license checks.
R02 Core PR: domain, real Postgres, workflow replay/recovery, migrations, authz/tenant + admin role matrix, deadline/allowance races, browser flows, a11y, resource & egress checks.
R03 Private course PR CI: coverage, executable keys, accepted/wrong solutions, visuals/a11y, released SDK/core integration.
R04 Nightly: matrix, fault/recovery, bounded provider evals, model/prompt regressions, security scans, backup restore, long-session resources.
R05 Release candidate: immutable digests, compatibility matrix, artifact install, rollback/migration rehearsal, provenance/SBOM, private acceptance.
R06 Actions pinned by SHA, read-only tokens, isolated publishing, OIDC trusted publishing, secret scanning + egress canaries.
R07 Requirement -> behavior -> test map; critical skips fail release.

## S. §18 failure tests (cross-check)
S01 Duplicate evidence. S02 Stale companion context. S03 False mastery. S04 Bad generated math. S05 Contradictory representations. S06 Competing agents/profile edit mid-generation. S07 Remediation loop. S08 Sandbox escape/resource abuse. S09 Privacy leak canaries (sources, logs, embeddings, public paths). S10 Provider failure (timeout, malformed, duplicate tool calls, budget). S11 Deletion/migration coherence. S12 Inaccessible lesson keyboard+screen reader.

## T. Operations (§19)
T01 Latency targets (<200ms nav, <300ms feedback, <500ms ack, 3s first token) measured.
T02 Memory: browser shell <250MB, one Python worker, lazy media; server sandbox quotas.
T03 Availability 99.5%, RPO 1h / RTO 4h; encrypted backups, restore drills, retention, export.
T04 Telemetry uses redacted identifiers; raw answers not in generic logs.
T05 Threat model (auth, tenant retrieval, generated code, prompt injection, supply chain).
T06 Metrics: event lag, context failures, retries, generation rejection, appeals, cost.

## U. GUI debug observability (§19A, debug_record)
U01 Authorized debug mode inspector reachable from current learner activity and course admin; desktop side panel / tablet pane / phone full-screen; never in required nav.
U02 Views: current context, agent/workflow graph, model/tool calls, decision/evidence, policies/budgets, artifacts/changes, client & sync, replay/evaluation.
U03 Correlation client->API->workflow->job->model/tool->sandbox->policy->transaction->UI (traceId, parentSpanId, enrollmentId, attemptId, eventCursor, workflowId, jobId, artifactHash); OTel from framework callbacks.
U04 No invented chain-of-thought; unavailable metrics labeled; estimated vs billed cost; suggestion vs committed.
U05 Debug is server capability (not query flag); redacted by default; payload access scoped + audit receipt; canary secrets test (U13).
U06 Collector unavailable: domain receipts durable; missing spans explicit; buffers bounded (U14).
U07 Safe controls: retry/cancel/regrade/replay as scoped actions; replay with frozen inputs in sandbox, no real mutation/external effects, new run IDs (U15).
U08 Decision without evidence/version link invalid; no progression grant (U16).

## V. Private curriculum (§14-16)
V01 14 chapters / 56 episodes each with concepts, prerequisites, outcome, examples, checks, misconceptions, sources.
V02 Labs + capstones A (autodiff), B (tiny transformer), C (kernel qualification), final portfolio.
V03 Per-chapter independent check and misconception probe.
V04 TAH case accurate; private sources hashed/redacted; never in public repos.
V05 Worked adaptive episode (§16 backward vs update with personal episode, scalar oracle, wrong-sign/accumulation fail, transfer question).
V06 Illustrations for all 56 episodes.
V07 Independent content review & capstone review; labs with references and negative tests.

## W. Evaluation
W01 Educational evaluation (pretest/post/transfer/delayed; fixed vs chat-only vs supervisor comparison) — pilot activity.
W02 Live Google provider acceptance of tutoring/supervision/research/media, capability/cost accounting.
