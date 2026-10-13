# Bounded teaching repair qualified; generation merged — 2026-10-13 18:03 IDT

The full v0.8 goal remains ACTIVE/incomplete. PR19 has merged; isolated verifier
installation and bounded draft repair remain pending source/CI/release work.
Active native deployment still0.1.10, SDK0.2.0, private course0.1.3. No credentials,
positive paid allowance, release tag, native migration or original fleet changes.

- PR19 MERGED after all12 checks at0a0046b169ebbbddec809fb14c8850ebd784efb4;
  main merge66255b03299168100171635ec20cf87814e336ed, root0.1.12.
- Hosted failures38412876083/38413220760 were real browser test ambiguities from
  adding a second catalogue course. Distinct fixture ID/title plus course-card
  selectors fixed API-owned journeys. Subsequent38416217677/38416236006 exposed
  the SAME ambiguity in the separate learner-owned connected suite; fixed all
  three of its selectors as well. Full current API browser18 and learner browser9
  now PASS across three viewports; parent19 full hosted gates subsequently passed.
  This was a harness correction, not a miner/provider/runtime timeout diagnosis.
- PR20 ready, based on main atdbbde2b672ca95d9dcfd38c9464b4fb3ec175a14.
  Current CI38418681452 running. Merging main preserved exactly the previously
  qualified34c2dd936d41a0263dfc872e297c68f803a19801 tree; root0.1.13 target.
  Prior successful12checks38417548608 precede this ancestry integration.
- Draft PR21 https://github.com/roeehrl/course-core/pull/21 attached, based on
  codex/isolated-teaching-verifiers. Clean/pushed codex/verified-teaching-repair
  at600ccee04b38a204a89dcb1125ae58ddd0cbcf0f, root0.1.14. CI38418775988 running.
  Tree equals locally qualified51cb528 tree after ancestry-only merge. The
  temporary ordinary Git QA worktree was removed cleanly after cherry-picking
  isolated selector fixes to both parents. No test process remains active.
- check_teaching loads only the operation's actual candidate and runs installed
  reference checks. Feedback is metadata, not proof/credit. At most2 candidates
  per job; only the latest selected candidate or exact reviewed alternative is
  applied. Model round/deadline/reservation limits remain configured, never
  automatically increased. Every model call's usage is retained. Same-step check
  retries reuse one receipt; cancellation aborts verification, rolls back its
  incomplete receipt and prevents another model round. Final review/application
  still recheck scope, consent, registry, verification and work caps.
- Learner/admin activity distinguishes rejected feedback, superseded candidate and
  the one delivered option; raw pre-delivery prose is withheld. Wrong generated
  teaching is not learner deficiency evidence. Corrected text survives reload;
  completion remains disabled until actual independent evidence is earned.
- Final local API274 tests/25files and learner105 tests/typechecks PASS;
  API browser18 + learner connected9 PASS; real isolated-verifier/Postgres/practical
  recovery gate PASS. Actual Postgres/HTTP/Temporal13 scenarios PASS with18 scripted
  supervisor rounds,6 worker restarts,5 lost apply acknowledgements,25 history
  replays/406 payloads. External models remain synthetic; no live quality or
  learning-effectiveness claim. New negative tests cover foreign/fabricated
  check requests, candidate/round limits, cancelled reference calls, repaired
  delivery and reviewed fallback without mastery or double work.
- Ignored Core receipts: .local/teaching-repair-api-final.log,
  teaching-repair-temporal.log, teaching-repair-connected-browser.log,
  teaching-repair-learner-connected.log,teaching-repair-practical.log,
  teaching-repair-phone.png. Latest phone screenshot shows a remaining existing
  floating-companion overlap in the activity view; reserve layout space and add
  explicit occlusion checks in the responsive UI phase. Axe/overflow alone do
  not prove text is unobscured.

Next: finish20/21 protected CI, merge in order and perform immutable release,
released consumer, backup/restore and state-preserving native qualification;
install production private-course verifiers through released interfaces. Continue
creator SDK/admin controls, verified rich visuals/whole personal episodes/branches,
research/media agent dispatch/review/delivery, placement/caps/deadline/privacy/
operations completion and real Google acceptance. Keep the approved full scope,
mobile build deferral and explicit credential/allowance gate. No goal completion.

# Creator verifier installation qualified; parent merged — 2026-10-13 17:25 IDT

The full v0.8 goal remains ACTIVE/incomplete. This milestone supplies a stock
runtime installation path for creator-owned independent verifier programs, with
real isolated execution and actual database-backed teaching delivery. It does
not complete arbitrary teaching validity, the private course integration, rich
media/research, or live model/learning acceptance.

- PR18 MERGED after all12 hosted checks succeeded at exact head
  1f8096af570db520a641bf6c3f9f86bdb15d18bb. Main merge commit
  db8fe34407d59fc0e1c1f3e76faad39b8aaad66f. Source equals that qualified head.
  Root main target0.1.11; not released/deployed.
- PR19 retargeted to main and ready for review. Current head
  8a69b95f15e67917165d1fbefaf730d0a14b0d72. Merge conflicts from squash ancestry
  were resolved only after proving incoming main's tree exactly equals PR18;
  the integrated PR19 tree exactly equals its already-tested6b5c619 tree.
  CI38412876083 is the current active handle. Original38409220607 was cancelled
  by normal workflow concurrency after a real head push, not an observation retry.
- Draft PR20 https://github.com/roeehrl/course-core/pull/20 is attached, based on
  codex/generated-teaching. Clean/pushed branch codex/isolated-teaching-verifiers
  at e2b2141d66f7c30eb0682fb91423c1b3519f7275, target0.1.13. CI38413220760 queued.
  It includes a source-identical merge of PR19's updated ancestry. After PR19
  merges, integrate/retarget PR20 and retain protected CI before release.
- Stock API TEACHING_VERIFIER_FILES / native teachingVerifierFiles load only
  bounded, private, owned regular definition files; no JavaScript import loader.
  SHA256 binds program, reference data and positive/negative qualification to
  extension/registry approval. Creator Python executes in the existing pinned
  Docker broker with no network, read-only mounts,128MiB/0.5CPU/time/output/process
  limits and one execution at a time. Only the API receives definition paths.
- At least2 distinct valid and2 distinct invalid examples are executed. Renaming
  content cannot fake coverage. Wrong fingerprints, unsupported checks/identity,
  one-sided/malformed cases, unready broker and always-approve/always-reject
  programs fail closed. No capability or paid permission is inferred from a file.
- API268 tests/25 files and typechecks PASS; targeted new semantic coverage/version
  tests also PASS; native lifecycle13 PASS; public audit454 files PASS. Real Docker
  practical gate PASS: private file load, correct new example, rejected wrong
  math/unsupported prose and rejected constant-answer programs. The SAME isolated
  verifier passes actual owner registry approval plus Postgres/API staging and
  application: wrong content leaves no writes, correct text delivered once,
  duplicate receipt replay and unchanged gates/evidence. Existing code practical
  recovery/batching/hidden references pass alongside it. Initial gate failed an
  incorrect test snapshot field; fixed to use the authoritative adaptation summary.
- Ignored Core receipts: .local/isolated-teaching-api-final.log,
  isolated-teaching-practical-fixed.log, isolated-teaching-lifecycle-final.log.
  No live provider was invoked. Programs/reference data never enter browser bundles.

Active pinned native pilot remains Core0.1.10; SDK0.2.0 and private course0.1.3
unchanged. No new release/tag/native migration. No miner/remoteMac/GPU/wallet work.
Private provider credentials and positive paid allowance remain absent.

Next: finish PR19/PR20 protected CI and merge, then immutable release, released
private consumer/native backup+restore/state-preserving deployment qualification;
package production private-course verifiers through released contracts. Continue
bounded generate-check-repair autonomy, creator SDK/UI extensibility, full
research/media agent dispatch/inspection/review/delivery, rich visual/episode/
branch construction, remaining placement/caps/deadlines/privacy/operations gates,
then real Google acceptance with secure credentials and explicit allowance.
Native binaries remain deferred. The goal has not been narrowed or completed.

# Novel teaching delivery implemented and locally qualified — 2026-10-13 16:57 IDT

The full approved v0.8 goal remains ACTIVE and incomplete. This milestone adds
actual supervisor-generated explanation/practice delivery through the released
SDK artifact contracts and course-owned independent verification. It is source
implementation and local system acceptance, not production or live-provider proof.

- Public Core branch `codex/generated-teaching` is clean/pushed at
  `6b5c6198be6226176d63934ef22df10092311f30`; runtime target 0.1.12.
  Draft PR19 https://github.com/roeehrl/course-core/pull/19 is attached and based
  on PR18's `codex/supervisor-learner-model`. Public CI run38409220607 is queued.
  Retarget to main and ready it only after PR18 merges; retain protected checks.
- PR18 head remains `1f8096af570db520a641bf6c3f9f86bdb15d18bb`, OPEN. At this
  observation 10/12 checks passed; providers and example-courses were queued.
  Specific parent CI handle:38405139747. Do not replace an observation timeout
  with a new job or mutate a release tag.
- New tools list_generation_profiles/create_teaching bind candidates to observed
  installed profiles, current episode, consent, registry revision/digest and
  declared objectives/sources. Host chooses artifact/generator identity; the
  model cannot mint grading keys, proof, costs or assignment classifications.
- Verification matches scoped tool receipts and actually calls the independent
  installed course verifier. Atomic delivery repeats that verifier and quota,
  target, consent, active-assessment, source/registry and SDK checks. Lesson,
  proof and work writes roll back together. Duplicate delivery is idempotent;
  no mastery credit or supervisor feedback loop is created.
- Learner/admin activity shows exact candidate delivery metadata and withholds
  pre-delivery prose. The normal responsive linear lesson renders the new text.
  A discovered quota error normalization bug was fixed for generated and reviewed
  support: an actual quota failure returns a clear denial rather than storage500.
- Local final API265 tests /24 files PASS; learner104 tests/typecheck PASS;
  infra48/lifecycle12 PASS; public audit450 files PASS. Three actual connected
  browser cases PASS on phone, tablet and desktop: generated content, reload,
  disabled completion, accessibility, no overflow/page errors. Initial browser
  failures were incorrect test navigation; corrected journey enters the lesson
  and acknowledges the original reading before checking the newly added part.
- Final real Postgres/HTTP/Temporal acceptance PASS12 scenarios,13 synthetic
  supervisor model rounds,5 worker restarts,4 lost apply acknowledgements,
 24 replayed histories/384 decoded payloads. All cleanup completed. Only external
  model outputs are synthetic. Reference fixture checks the entire closed
  mathematical grammar and rejects wrong answers/unsupported appended claims;
  it does NOT claim to validate arbitrary prose, pedagogy or real model quality.
- Core ignored receipts: .local/generated-teaching-api-final.log,
  generated-teaching-temporal-final.log, generated-teaching-browser-final.log,
  generated-teaching-phone.png. Owned disposable qualification database:
  course_core_test_generated_20261013 on local Postgres17. Tests remove their own
  schemas; do not redirect them to the active pilot or inspect private secrets.

Active native pilot remains pinned Core0.1.10, SDK0.2.0, private course0.1.3;
provider credentials/paid limits remain unconfigured. Neither PR18 nor PR19 is
merged/released/deployed. No original miner, remote Mac, GPU or wallet changes.

Next: complete parent/stacked CI, merge and immutable release/consumer/native
qualification in order; package and qualify production course-owned verifier
extensions using released interfaces. The stock CLI still installs no arbitrary
module or universal factual verifier. Continue the broader moat: verified novel
teaching beyond this small reference fixture, dynamic activities/visuals/whole
personal episodes/branches, dedicated research/media dispatch/review/delivery,
creator strategy/tool extensibility, placement/caps/deadline/privacy/operations
completion and real Google acceptance. No new live call is authorized by a
configuration default; secure credentials plus explicit allowance remain needed.
Native app binaries stay deferred. This increment does not close the full goal.

# Supervisor learner-model integration — 2026-10-13

Fullv0.8goalACTIVE. This turnPROGRESS: real supervisor-to-source-linked model
suggestion delivery, source/permission/assessment guards, separate verification,
learner corrections/disputes, GUI observability and real recovery acceptance.

Corebranchcodex/supervisor-learner-model clean at
1f8096af570db520a641bf6c3f9f86bdb15d18bb,root0.1.11. PR18 OPEN:
https://github.com/roeehrl/course-core/pull/18 (attached). Hosted checks running;
not merged/released/deployed. Active pinnedpilot remains0.1.10; no real model,
new credentials, paid allowance or original fleet changes.

- Tools get_model_sources/suggest_model stage a bounded pace/explanation-style/
  objective-review suggestion with exact scoped learner-event digests. Separate
  verifier matches tool receipts and current sources/consent. Fenced application
  creates a pending learner-model proposal, increments model/profile revisions,
  suppresses supervisor feedback and records an explicit job-effect link.
- Manual preferences/earned evidence are preserved. Pending/disputed suggestions
  excluded from provider context; learner acceptance/correction remains editable.
  Fix discovered in real phone screenshot: latest corrected wording survives
  dispute/reacceptance instead of reverting to original suggestion.
- New013_supervisor_learner_model.sql application-effect mapping. Older supervisor
  plan representation/hash preserved by optional field without default insertion.
  Learner activity and admin inspector expose metadata rather than private text.
- Local258API tests PASS, including cross-learner/unobserved/changed sources,
  changed consent, independent checks, duplicate apply, manual-preference dominance
  and correction/dispute/reacceptance.104learner tests/typechecks PASS.
- CombinedactualPostgres/HTTP/Temporal11scenarios PASS:3synthetic externalHTTPcalls,
 10synthetic supervisor modelrounds,4workerrestarts, loststart1/settle1/apply3,
 23nativehistoryreplays/362payloads; no credit/privatecanary leakage. External models
 remain synthetic. LogCore/.local/supervisor-model-temporal.log.
- Existing9connectedbrowsercases passed. Newdesktop/phone/tablet real API model
 reviewflow PASS after correcting pre-enrolled navigation; correction persists
 through reload/dispute, no mastery, accessibility/overflow checks pass.
 Log .local/supervisor-model-browser-retry.log. Source peer pipelines remain scoped
 to disposable schema/database; test-only seeded model route is not production.
- Publicaudit446files,48infra/12lifecycle PASS. Coretargetalready0.1.11. Preserve
 PRhead/checks before merge; use release protocol, exact immutable artifacts and
 native schema/state/backup qualification before deployment.

Next:PR18hostedCI/merge/release/deployment; implement novel teaching generation
and independent review/application, research/media dispatch/inspection/delivery,
creator strategies/wholeepisodes/branches and full remainingv0.8governance/privacy/
operations/placement/multiplatform gates. Source-linked preferences are a real
increment of the moat, not full adaptive-supervisor completion. LiveGoogle still
needs secure user configuration and explicitly approved allowance. No blocked audit.

# Core0.1.10 native rollout verified — 2026-10-13

Fullv0.8goalACTIVE/incomplete. This turnPROGRESS: completed private browser
qualification, consistent backup/disposable restore, pinned runtime activation,
state equality, key custody and actual authenticated native HTTP/browser checks.

- Private0.1.10 browser95761 TERMINATEDsuccess:phone56episodes,desktop/tablet16each,
  practical recovery/reload code drafts/accessibility/overflow/zero pageerrors.
  HTTP41007 was already completed. No duplicate acceptance process remains.
- Core0.1.10 ACTIVE at
  /Users/tnt/Library/Application Support/Course Core/Pilot/releases/v0.1.10/course-core
  State /Users/tnt/git/course-core/.local/pilot. Explicit pinned root/state required.
  Latest observed installation47943c39-71be-40f6-bba6-e5958ca8dbbe, label
  com.coursecore.pilot.45b782c8c65c71d4.47943c3971be40f6bba6e5958ca8dbbe,
  instance5bf22738-5824-4921-b91b-005e57a55d85. Revalidate before control; PIDs stale.
- Before backupv8-20261013124409985 contains consistent stopped PG/SQLite/config/key;
  newly created disposable database restore passed and only that owned DB removed.
  Existing3enrollments/coursepins/plans/policy/budgets/accounts/config match exact
  protected snapshots. Saved completed counts16,1,0. Ownerunenrolled, credentials0,
  paidlimits0. Existing backed-up key decrypts synthetic probe from new live vault.
- Receipts Core/.local/pilot/native-v10-migration.json,native-v10-http.json,
  native-v10-browser.json,v10-before/after-snapshot.json are ignored0600. Do not
  print sessions/configs/keys. Native provider screen's fallback control defaults
  off and toggles in a draft without budget changes; no unsupported provider was
  saved or real model called. Pin provenance nowactivated:true. Future supported
  connectors still need their own implementation/qualification.
- Coremain clean e96763e5dbfbc2f036e84fe8a38bb514f21b1551. SDK0.2.0 unchanged;
  privatecourse0.1.3 unchanged. Public0.1.10 actuallypublished;0.1.9 remainsfailed
  andunpublished. Original SN9 checkout/fleet untouched.

Next primary phase: supervisor-controlled novel teaching/research/media and
learner-model maintenance, with separate trusted review/verification, scoped
source retrieval, durable dispatch/accounting and learner-visible effects. Current
scoped toolloop only selects exact reviewed support; source-linked learner-model
proposal/review APIs exist but are not wired to the supervisor. Existing native
launcher ALREADY allows authored-teaching-bank-v1 (do not "fix" an imagined missing
allowlist entry). Preserve full plan:creator strategies/whole episodes/branches,
placement/caps/deadlines/privacy/operations/native-readiness and liveGoogle gates.
No real credentials/positive allowance configured; no paid calls until authorized.
Native mobile binaries deferred. No blocked audit applies; meaningful work remains.

# Published0.1.10 and private consumer — 2026-10-13

Fullv0.8goalACTIVE. PR17merged after all12hosted checks at exact head
61f84dccfbc8feb702583e9ed55ae72a0a1540de. Coremain clean
 e96763e5dbfbc2f036e84fe8a38bb514f21b1551,root0.1.10.
Annotated tagobjectf86c3d4046e54396efe2a33973269404bb1426b1.
Release38394906665 SUCCESSattempt1. Immutableartifact11812235789,
ZIP3616446bytes/SHA2038c93a899a2f4318f00c272b1d41cbf269984ef0cf48cf88dc56381e5b4522.
All7members,5archiveassets,444Git sourcefiles,member/hash/lock/license/source-CI
identities verified; uploaded draft assets downloaded/reverified before actual
publication. Public prerelease:
https://github.com/roeehrl/course-core/releases/tag/v0.1.10.
ManifestSHA3d89d4b66b70275fd5246a7d9a6a041c21a206d3adb3709ccaf5a753cae60b19.
SourceSHA4c579472c986447eabb6241b3965eb69b3b7847d5a15fa91ad4c80357f8a62cc;
runtimeSHA47dd98700f3480b0a632cf8fb651f1c695c4cf0d05239c32b5f89e957c36c221.
Failedv0.1.9 remainsunchanged/unpublished.

Private downloadedall7publishedassets,installedthroughreleasedCLI and restored
exactpublishedwebexports afterinstaller rebuilt them. New consumer verifier pin
updated to actual0.1.10identity; forged-manifest negative test passes. Installed
archive1082declaredmembers/627uniquefiles verified. HTTPcourse56episode acceptance
PASSEDexec41007/exit0:all3practical recoveries,6assignments/exact270min/6episodes,
all56premature-completiondenials,failedbankwithoutnewcharge/gatechange.
Private .local/private-v10-http-acceptance.log. Browser acceptance RUNNINGexec95761;
private .local/private-v10-browser-acceptance.log. Pollsamehandle;no timeout restart.

Pinned native0.1.10runtime STAGED,NOTactive:
/Users/tnt/Library/Application Support/Course Core/Pilot/releases/v0.1.10/course-core
All1082members/627files verified;59dependencylinks resolveinside pinnedroot;
already-qualifiedTemporalbinary copied and hashed. Provenanceactivated:false.
Activepilot remains0.1.8, explicitoldroot/state detailedbelow. Existing course0.1.3
unchanged,3enrollments/owner0/providercredentials0/paidlimits0.

Next:samebrowserhandle toterminal,consistentstopped backup plus
isolatedrestore andkeycustody,state-preserving0.1.10activation/nativeUIvalidation.
Then resume mainmoat:novelteaching/visuals/research/media/verifier/creatorstrategies
andremainingplacement/policy/privacy/ops/native-readiness gates. LiveGooglerequires
secureconfigurationandexplicitallowance;no paid calls/no newsubscriptions allowed
by defaults. No miner/remoteMac/GPU/wallet actions. Native binariesdeferred.

# Release qualification repair — 2026-10-13

Core0.1.8 native pilot remains ACTIVE and verified. Subscription/fallback PR16 is
merged, but release38392806501 for immutable tagv0.1.9 TERMINALLY FAILED. Sandbox
job115280709432 failed the two-batch deadline fixture:actualcleanup_failed versus
expectedtimeout at2624ms. No0.1.9assets were published and the tag stays unchanged.
Protected public CI log:Core/.local/v9-release-sandbox-job.log. Do not retry this
unchanged release or move its tag.

Code review found that the short2.6s fixture could expire during an unacknowledged
second create, where quarantine is required. PR17 separates actual execution
expiry from that uncertainty:15s test envelope/two8s sleeps, both create IDs must
be acknowledged, first batch completes/second times out, second timeout allowance
must shrink by first-batch elapsed time, no credit and exact cleanup. Separate
real delayed-ack driver proves quarantine and denied new admission. Production
sandbox code/defaults/limits unchanged. Original failed run had no phase trace;
its exact internal branch was not directly observed, so do not overstate that.

PR17 is OPEN at61f84dccfbc8feb702583e9ed55ae72a0a1540de:
https://github.com/roeehrl/course-core/pull/17 (attached). Hosted checks are running.
Local native LinuxARM64 realDocker21cases,unit5,typechecks,publicaudit passed.
Corebranchcodex/sandbox-deadline-qualification is clean; root0.1.10. Preserve these
exact CI handles. After all12checks pass, merge exact head; create freshv0.1.10
release, verify immutable candidates/hosted bytes, then private consumer and native
upgrade. Generic subscription feature is not yet released or active in the pilot.

Fullv0.8goalACTIVE/incomplete. No blocked audit; meaningful work and qualification
remain. Do not touch miner/GPU/remoteMac/wallet data. No real provider credentials
or paid allowance configured. Native0.1.8root/state/receipts described below.

# Current subscription adapter and native upgrade — 2026-10-13

The complete v0.8 goal remains ACTIVE. This turn made verified implementation,
release-consumer, migration, backup and real UI progress. No live provider was
called and no paid allowance was enabled.

- Core PR16 MERGED after all12hosted checks passed at exact head
  a07efb7859ac2098436dcb94b92f5efdb386843c. Clean main is
  f06c22fbcadc52a912427a5a2e7363e171aa85dc, root0.1.9.
  https://github.com/roeehrl/course-core/pull/16 (attached).
- Generic subscriptionAdapter and typed fresh entitlement/atomic-admission hooks
  added to provider framework. Core accepts non-secret subscription references
  without an API-key-shaped primary binding. Optional API fallback defaults off,
  requires separate fresh host consent/budget authorization, shares the original
  timeout and cannot replay submitted uncertainty. Video jobs keep their route.
  Admin opt-in/out persists through the real API and does not increase budgets.
  No actual subscription connector is installed; Google consumer access remains
  unsupported. Future supported connectors still need their own qualification.
- Local checks:68provider,252API,53admin unit,18real Postgres/browser cases across
  desktop/phone/tablet,48infra and12lifecycle passed. All12hosted checks passed.
  The whole admin formatting command still reports seven pre-existing untouched
  files; touched admin files were formatted. Initial browser host import issue was
  fixed; the final18case real browser suite passed.
- Core0.1.8 is now ACTIVE at the pinned root below, after private56episode HTTP
  and56episode phone browser acceptance; desktop/tablet16each through recovery,
  saved code/accessibility/overflow/zero-errors verified. Existing3native course
  pins/enrollments/plans/policy/budgets/accounts match before migration; owner has
  no enrollment. Native authenticated HTTP and actual desktop-admin/phone-learner
  browser checks passed. Saved completed counts16,1,0; provider credentials0 and
  paid limits0. Pinned runtime archive bytes1074members/622files verified.
- Active native root:
  /Users/tnt/Library/Application Support/Course Core/Pilot/releases/v0.1.8/course-core
  State remains /Users/tnt/git/course-core/.local/pilot. Always pass explicit root
  and state to the pinned controller. Latest observed instance
  8d0563a6-ac8a-4661-889b-48399fd5268e; installation
  d7f3c99c-0071-41da-b3f8-6f0c4f1b494e. Revalidate handles/PIDs before any control.
- Consistent stopped backups and disposable restore verification PASSED before
  and after migration. Core/.local/pilot/backups/v8-20261013114042668 before;
  v8-20261013114305018 after, includes new32byte0600provider encryption key.
  Backed-up key decrypted a synthetic probe from the restarted live vault. No
  existing database was overwritten. Backup helper PGDATABASE URL expansion bug
  was corrected by separate libpq environment parameters, verified by real restore.
  Operational receipts/sessions/keys are ignored0600; never print their contents.
- Immutable tagv0.1.9 pushed and release workflow dispatched ONCE. Not published
  or deployed yet. Track its existing run; verify immutable artifact, manifest,
  archive/member/lock/dependency and hosted assets before publication and upgrade.

Next:finish0.1.9release/consumer/native delivery of the requested generic adapter,
then continue novel supervisor generation/research/media/creator-path tooling and
remaining governance/privacy/operations/placement/multiplatform acceptance. Native
app binaries are deferred. Live Google needs secure configuration plus explicit
allowance; no unattended default grants permission. Private GitHub CI billing
restriction persists. No miner, remote Mac, GPU, wallet or unrelated repo changes.

# Current released consumer qualification — 2026-10-13

The full v0.8 goal remains ACTIVE. Core0.1.8 is now publicly released at
https://github.com/roeehrl/course-core/releases/tag/v0.1.8, from
main db54ca0853db996ae21db62da740e6d5af06f0a7. Release38385397184 succeeded;
immutable artifact11805068314 and downloaded hosted assets were independently
verified. SDK0.2.0 is unchanged. Core0.1.7 was never published.

- Private released Core0.1.8 install and all1074declaredmembers/622files verified.
  Consumer verifier now pins the manifest SHA as well as release identity,
  CI and actual installed bytes. A coherently forged replacement manifest and
  payload are rejected. All12private unit tests passed.
- Actual released HTTP/Postgres/isolated-Python acceptance PASSED all56episodes,
  all3practical-family recoveries, both fresh variants, exact270min/6episode
  committed costs, premature-completion denial in every episode, and exhaustion
  without extra cost or changed gates. Process50733 terminated successfully.
  Private log .local/private-v8-http-acceptance.log and protected run receipts.
- Browser acceptance process99672 is RUNNING: phone56, desktop/tablet through
  recovery, reload/draft/accessibility/overflow gates. Poll the same process;
  do not restart solely because an observation times out. Private log
  .local/private-v8-browser-acceptance.log. Native pilot is still Core0.1.5.
- New pinned Core0.1.8 runtime is staged and byte-qualified but NOT activated.
  Next: browser acceptance, old authenticated graceful stop, consistent backup,
  disposable restore, migration preserving all3enrollments/queue/plan/policy,
  key custody and authenticated native/browser acceptance.
- User requested subscription-cost research. Dated official-source findings are
  planning/GOOGLE_SUBSCRIPTION_ACCESS_2026-10-13.md: Google AI Pro/Ultra monthly
  developer credits can offset metered API charges; consumer Antigravity CLI
  wrapping in third-party applications is explicitly unsupported. No account
  inspection, benefit redemption, paid calls or billing change occurred.

Full novel supervision, research/media delivery, creator strategy/path tools,
placement/lifecycle/operations/privacy gates and live provider acceptance remain
open. No real provider credentials or positive allowance are configured; unanswered
choices are not authorization. Native app binaries are deferred. Do not touch
SN9, remote Macs, workers, GPU experiments, wallets or unrelated checkout files.

# Current release repair and migration preparation — 2026-10-13 13:46 IDT

The complete v0.8 goal remains ACTIVE. This turn made verified release repair
progress and safe native migration preparation. No native restart/deployment or
paid call occurred. Core0.1.6 is still the latest actual published runtime.

- Release38382533084 for immutable tagv0.1.7 TERMINALLY FAILED at candidate
  assembly before publishing assets. Exact diagnostic: public source filename
  services/api/src/credential-vault.ts matched the operational-credential privacy
  deny pattern. All implementation CI had passed. Do not retry unchanged bytes or
  move this tag; failure log Core/.local/v7-release-assembly-failure.log is retained.
- PR15 merged after all twelve checks passed at head
  352c190c12439cd81a04a0440fc140eb8edd4c05, run38384744766. Public module/test
  renamed key-vault; imports updated. Privacy guard unchanged. New boundary test
  admits code entries while credential-labelled files/binary key material remain
  denied. Local infrastructure48/API250/typechecks and ten PG/HTTP/Temporal
  scenarios passed. Actual tracked-tree source inventory validates441paths.
  https://github.com/roeehrl/course-core/pull/15 (attached)
- Core clean main db54ca0853db996ae21db62da740e6d5af06f0a7, root0.1.8.
  Annotated tagv0.1.8 object7fa2746884185093d71aab2dc5238a03d2810f50 peels to
  that commit. Release dispatched ONCE as run38385397184, freshly IN_PROGRESS:
  https://github.com/roeehrl/course-core/actions/runs/38385397184.
  Preserve that handle; no duplicate dispatch, tag movement or unverified publish.
- Native pilot was freshly observed healthy on pinned Core0.1.5 with all four
  services and instance13ad219c-1baa-42d2-8a52-c0f2e653d412. Protected preparation
  snapshot Core/.local/pilot/v7-preparation-snapshot.json contains consistent read
  of all3existing enrollments (course0.1.0,0.1.2,0.1.3), plans/policies/budgets.
  Owner enrollments0; configured provider credentials0. Source DB was read only.
- Private operational helpers, NOT public release code:
  Core/.local/pilot/snapshot-v7.mjs (repeatable-read, redacted summary),
  Core/.local/pilot/backup-v8.mjs (stopped-pilot PG/SQLite/key backup and isolated
  newly created disposable-DB restore with snapshot equality). Helper syntax
  verified; backup/restore has NOT run yet. Do not claim it qualified. Local role
  can create a disposable test database. No existing DB is overwritten. Only
  after verified released artifacts/consumer/staging may the old authenticated
  controller be stopped, then a consistent backup made and restore-qualified.
- Keep old root explicit in manager calls while active:
  /Users/tnt/Library/Application Support/Course Core/Pilot/releases/v0.1.5/course-core
  and state /Users/tnt/git/course-core/.local/pilot. Never touch other agents or
  assume stale PIDs. Newruntime must be pinned outside checkout and all dependency
  links kept within it. Preserve queue, config, learner state and grader pins.

Next: same release handle to terminal; immutable artifact/draft/hosted verification;
private released-interface install and original56episode practical acceptance;
pinned native staged upgrade with stopped backup/disposable restore/state equality
and key custody. Then secure user key/allowance configuration and live Google
checks. Full supervisor generation/research/media/SDK/policy/privacy/operations
requirements remain in scope; this release repair is not completion.

# Current merged operator phase — 2026-10-13 13:20 IDT

The complete v0.8 goal remains ACTIVE. PR14 merged after all twelve hosted checks
passed at exact head9747ad9d5c80ad3a5f0f44b119fd1d254d303456, hosted run
38381832115. Core main is clean at
851419019a1713d42e097920e5ce01a11cb0a122, root version0.1.7.
https://github.com/roeehrl/course-core/pull/14

Annotated candidate tagv0.1.7 object28719edf57ffe843edcf2ace2ae77b4bd3ec6359
peels to that main commit. Verified release workflow was dispatched once as
run38382533084 and freshly observed IN_PROGRESS:
https://github.com/roeehrl/course-core/actions/runs/38382533084.
Preserve this handle, wait for terminal evidence, and verify exact immutable
candidate/draft/hosted bytes before publishing. Do not duplicate the run or move
this tag. Core0.1.6 remains the actual published release; Core0.1.7 is not yet a
published or deployed runtime. Native pilot remains pinned Core0.1.5; private
course0.1.3 is unchanged. No real keys, paid calls or owner progress were created.

This phase now has guided scoped connections/model metadata/role drafts, encrypted
credentials, explicit admission and separate budgets, durable replay/rotation
fences, and real operator tool/configuration observability. Local evidence in the
next checkpoint: API250, admin52,15real admin browser cases,10combined real
PG/HTTP/Temporal scenarios,22history replays and synthetic external services only.
The final root command's old-label browser failures were corrected by retaining
the same zero-count assertion under the precise host-tool wording; all14browser
cases passed on rerun, and all twelve hosted checks subsequently passed unchanged
at the final source head. No gate or timeout was weakened.

Next: complete release/consumer identity and native migration/key custody/saved
state acceptance, then secure user configuration and explicitly allowed live
Google tutoring/video checks. Also continue the full supervisor-generation,
research/media, SDK/personal-episode, policy/privacy/operations requirements; this
operator module, green CI or synthetic model results are not full completion.

# Current operator setup PR checkpoint — 2026-10-13 13:15 IDT

The full approved v0.8 goal remains ACTIVE. This turn made concrete source and
qualification progress. Core0.1.6 remains published; native pilot remains pinned
Core0.1.5/private course0.1.3. No real keys or paid model calls were configured.

Public Core branch codex/provider-setup is clean/pushed at
9747ad9d5c80ad3a5f0f44b119fd1d254d303456. PR14 is open/attached:
https://github.com/roeehrl/course-core/pull/14. Root version0.1.7 is a candidate,
not a released/deployed version. Wait for all twelve hosted checks at the exact
head before merging. Preserve immutable existing tags. Full v0.8 remains open.

- Guided connection/model setup replaces advanced JSON as the required starting
  path. Keys stay encrypted server-side. Google discovery uses fixed-origin GET
  model metadata with bounded bytes/pages/time/concurrency and no generation.
  Registered neutral metadata/build adapters can supply their own implementation.
  Metadata/method declarations do not establish teaching, research, image/video
  quality or live capability. Advanced JSON and explicit video declarations remain.
- Migration012 stores scoped operator/version-bound inspection receipts with
  finite deadlines. Replays use one request; expired interrupted inspections are
  failed without automatic resubmission. Rotation/membership loss drops results.
  Malformed bodies, redirects, key echoes, excess bytes and repeated page cursors
  fail closed. A catalogue truncated after four pages is explicitly marked.
- Role drafts check model/method/token metadata, leave protocol overhead in input
  limits, preserve roles unless explicitly changed, and expose conservative job
  token reservations. An operator chooses the draft and separately saves it.
  Cost allowance and paid budgets are not silently increased. Positive budget
  approval stays separate and defaults zero. Saving a budget no longer discards
  unrelated unsaved model/credential drafts; adding a connection requires resolving
  a conflicting draft. Account/workspace changes clear private UI state.
- Operator run inspector now shows true host-tool receipt count separately from
  reported provider attempts (unknown when unreported), actual scoped tool metadata,
  exact configuration binding and matching delivered-support plan revision.
  It selects no raw model reasoning, credentials, history or draft teaching. Actual
  PG/HTTP test proves two tools/three provider attempts and no teaching-text leakage.
- Configured-workspace PG/HTTP/Temporal gate now binds an encrypted key and a
  distinct615001-token admission budget through the real operator API. Committed
  application ack loss plus fresh worker produces one lesson effect/usage charge.
  Rotation during the first provider response blocks a second model round, cancels
  delivery, preserves observed usage and retains uncertain full reservations.
  Every new native history is replayed and scanned for key/history/content canaries.
- Final local API250tests, admin52tests, real admin15browser cases across phone/
  tablet/desktop, and ten combined supervision scenarios passed. Combined proof:
  three external tutoring calls, seven synthetic supervisor rounds, three worker
  replacements, one start/one settlement/two application ack losses,22history
  replays and340decoded payloads. Only external models/metadata are synthetic.
- Full root components passed. Its final command initially failed four old admin
  browser assertions expecting the former tool-count label. Expectations now assert
  the same zero count under the precise new host-tool label; all14admin browser
  cases reran and passed, with no timeout/gate weakening. Public audit441source
  files/11locks and typechecking pass. Hosted CI remains required and in progress.

NEXT: complete PR14 hosted checks, merge exact head, produce/verify immutable0.1.7
release and private consumer, then qualify native migration/key custody with saved
state. Secure user configuration and explicit spend allowance are still required
before actual Google tutoring/video acceptance. Continue full supervisor generation,
research/media review/attachment, SDK creator tools/personal episodes, policy timers,
privacy/operations GUI and every remaining v0.8 acceptance row. Do not treat this
operator phase or synthetic providers as full platform/learning completion.

# Current continuation checkpoint — 2026-10-13 12:01 IDT

The full approved v0.8 goal remains ACTIVE. This turn made implementation and
release progress; the complete platform is not yet delivered.

## Published release and unchanged pilot

Core0.1.6 is publicly published as an infrastructure prerelease:
https://github.com/roeehrl/course-core/releases/tag/v0.1.6.
Commit bcd98a29b517233f799a78c056263cc0f01a3d40; annotated tag object
4f9aadc187ff99331bb896859a76d04d79f83939. Release run38359445830 passed
attempt1. Immutable artifact11793928805 has ZIP SHA
6a39aa3dd388814089ab5f71f0b2c6bd543f415bb3b32e96c5430ce180627dc8.
All seven candidate/draft/downloaded assets, hashes, member inventories, locks,
identity and twelve same-commit CI receipts were verified before publication.
Runtime SHA2bdf74d1d62bd619d9f2957fa825a2db88456057e40cbb8b4e07b118807bc32c.
The private consumer downloaded all seven exact hosted assets into
.local/released-core-artifacts/v0.1.6; this is not an installed or deployed v6.

Native pilot was freshly verified still running from pinned Core0.1.5 with all
four services alive, instance13ad219c-1baa-42d2-8a52-c0f2e653d412. Private
course0.1.3 is unchanged. No real credentials, paid model calls, owner learning
progress, miners, wallets or other deployments were touched.

## Operator setup foundation — source only

Core branch codex/provider-setup is pushed at e37fac7c9ea2c92d53e12c1a2f26ff98683f624b.
No PR/merge/release/deployment for this module yet. Root version remains0.1.6;
its existing immutable tag must not be moved to these changes. No agents spawned.

Migration011 adds workspace provider settings/immutable versions, encrypted
credentials, job version bindings, operator-tagged HMAC receipts and budget
configuration revisions. credential-vault.ts supplies authenticated AES-256-GCM
with workspace/version/binding AAD and protected host key persistence. No raw
credential readback or logging. Public configuration rejects secret fields/values;
server-installed factories remain the only code/adapter authority.

WorkspaceProviders binds exact configuration and explicit job policy at actual
outbox preparation. Capability lookup carries the authorized workspace rather
than treating a different workspace's provider as available. Replacements mark
unfinished jobs for cancellation; old completed dispatch receipts still settle
without another call. Binding waits recheck wall clock before admission. Gateway
clips timeout to remaining job time and rechecks host authority before every
model round; earlier usage survives a later denial. Per-role token bounds reject
unusable admission envelopes before saving; no budget is automatically enlarged.

Owner/admin setup and budget routes use cookie/origin/CSRF, scoped permissions,
CAS, canonical HMAC idempotence, operator/operation receipts and reservation-aware
limits. Positive budgets require affirmative paid-work approval. Workspace and
enrollment budgets both remain necessary and default zero. Application allowances
are explicitly distinct from actual provider invoices or external spending caps.

New responsive admin panel permits public model/role JSON, encrypted key setup,
job admission and independent budget settings. Secret drafts/unconfirmed requests
remain only in mounted memory and clear on account/workspace change. Lost-ack
retry keeps the exact original payload/ID. Configured status never becomes live
verification. Admin metadata now resolves the selected workspace and reuses its
SQL client. Advanced JSON is still the primary model editor; guided setup,
actual model discovery and safe connection/live-test UX are NOT complete.

## Verification and next gates

Final API240tests passed, admin48tests, supervisor45tests, native lifecycle12tests,
real admin browser12cases across phone/tablet/desktop passed with accessibility,
no overflow and no synthetic key readback. Public audit and infrastructure47
passed. Full root check passed before the final model-round/deadline guard change;
that changed API then passed240tests and the required legacy combined real
PG/HTTP/Temporal eight-scenario gate (two worker restarts, three lost acks,
20native history replays). This combined test does NOT yet prove the newly
configured-workspace Temporal path; keep that explicit remaining gate.

NEXT: guided Google/neutral model setup and actual metadata inspection; new
workspace-bound Temporal recovery/rotation/in-flight cancellation and key
backup/restore/membership/deadline races; operator tool/context/version timeline;
whole CI/PR/release/private consumer/native acceptance. Only after secure user
configuration and explicit spend allowance may live Google acceptance run.
Continue the remaining v0.8 supervisor generation/research/media/SDK/policy/privacy
work as well; this foundation is not full completion or a smaller replacement goal.

# Current release checkpoint — 2026-10-13 09:55 IDT

The full v0.8 goal remains ACTIVE. PR13 merged after all twelve hosted checks
passed at exact head `58bffc4244b220a8c203c29261c026d0dd7a31e4`, run
`38358825263`. Core main is now
`bcd98a29b517233f799a78c056263cc0f01a3d40`, with a clean worktree.

Annotated candidate tag `v0.1.6` has object
`4f9aadc187ff99331bb896859a76d04d79f83939` and peels to that main commit.
The verified release workflow was dispatched once as run `38359445830`:
https://github.com/roeehrl/course-core/actions/runs/38359445830.
It is not terminal yet. Do not move the tag, duplicate the workflow, publish
unverified candidates, or claim 0.1.6 released/deployed. Preserve this handle for
the next continuation and complete immutable candidate/consumer checks first.

Native pilot remains pinned on Core0.1.5; private course0.1.3 is unchanged.
Enabling the new tool loop in deployment additionally requires explicit host job
policy configuration: the current native default is 10,000 reserved tokens,
which cannot admit a four-round 30,000-character loop. Do not silently enlarge a
paid budget or weaken reservation guards. Implement operator admission settings
alongside secure provider/model/budget UI before live activation. Source-level
API qualification supplied an explicit 600,000-token job allowance and separate
shared ledgers; this does not prove native configuration or live Google use.

All remaining v0.8 rows are still open or partial. Novel generation, full source
and history retrieval, research/media delivery, SDK creator tools and operator
GUI remain implementation work. Previous checkpoint below contains exact local
and hosted test evidence. No deployment or model spend occurred in this phase.

# Current continuation — supervisor tools PR 13, 2026-10-13 09:49 IDT

The full approved v0.8 goal is ACTIVE and incomplete. This continuation delivered
and verified the learner-facing part of the scoped supervisor module. PR 13 is
open at public Core commit `58bffc4244b220a8c203c29261c026d0dd7a31e4`:
https://github.com/roeehrl/course-core/pull/13. Hosted run `38358825263` is in
progress. Root version 0.1.6 is a candidate, not a released or deployed version.

- Scoped, bounded tools retrieve retained history, profile/evidence and source
  references, then select exact author-reviewed support. Learner opt-in, separate
  verifier and existing transactional policy/evidence/plan fences govern delivery.
  No completion credit or easier grading is created. Novel generated drafts,
  whole episodes, source retrieval, research and media dispatch remain open.
- Learner controls are in My profile; safe actual tool/delivery records are in
  Learning record. Both remain optional to the linear learning path. Permission
  retries keep the original request identity; acknowledged writes are not repeated
  because a subsequent refresh failed. Account changes clear private UI state.
- A real pagination regression was caught: JavaScript Date conversion rounded
  PostgreSQL microseconds and could omit retained messages. The cursor now uses
  exact DB timestamps; a same-millisecond eight-message case proves full paging.
- Local full repository check passed. Final API suite: 232 tests; learner suite:
  103 tests. Nine real connected browser cases pass across phone/tablet/desktop,
  including accessible opt-in/opt-out, reload persistence and unchanged gates.
  The hosted API job now requires this learner-owned connected suite explicitly.
- Combined real Postgres/HTTP/Temporal qualification passed eight scenarios,
  two worker restarts and three injected lost acknowledgements. The tool phase
  adds one reviewed lesson block with one aggregate usage charge, unchanged gate,
  zero mastery and safe native history replay/redaction. External models are
  synthetic; live Google and arbitrary generation are not proven.
- Qualification programs now participate in strict TypeScript checking. Public
  source audit and infrastructure checks pass. Wait for all twelve hosted checks,
  merge only the exact verified head, and release exact immutable candidates before
  private consumption or changing the pinned native runtime.
- Native service was freshly observed running on pinned Core 0.1.5 with all four
  services alive, instance `13ad219c-1baa-42d2-8a52-c0f2e653d412`. Private course
  0.1.3 is unchanged. No deployment, paid model call, secret read/output, fleet
  change or new subagent occurred. Private hosted CI billing restriction remains.

Next: complete PR/release/consumer gates, then provider/model/budget/secure setup
GUI and reviewable generation/research/media delivery. Preserve every remaining
v0.8 acceptance row; this module is not full supervisor or platform completion.

# Current supervisor tools implementation — local verified work, not deployed

GoalACTIVE. This turnPROGRESS: actual boundedtoolloop,learnerconsent,reviewedexplanationadapter,transactionalcourseeffect,separateverifier andrealDB/HTTPacceptance. Fullscopeunchanged/incomplete. No blocker audit.

- PublicCore branchcodex/supervisor-tools hasLOCALchanges overmain52208cf (v0.1.5). No PR/merge/release/deployment ofthesechangesyet. Native pinnedv5/private0.1.3 stillrunning; ownerunenrolled/no paidcalls. DoNOTequatethe following localpasses with liveAI/deployment acceptance.
- Newmigration010_supervisor_tools.sql: learnerownedpermission(CASrevision/adaptive_teaching defaultfalse), scopedpersistenttoolcallreceipts,job→realadaptationeffect link. supervision-routes.ts adds GET/POSTenrollment/supervision and GETsupervision/tools(auth/cookie/CSRF/ownlearnerconsent). Staffcannotmanufactureopt-in; changingconsentincrementsenrollmentrevision andfencespendingjobs.
- AuthoredTeachingBankAdapter knownid authored-teaching-bank-v1 addedexplicitcomposition/pilotwhitelist(max4). Registeredprofile.teachingBank holdsreviewedmarkdown/objectives/sources. Only append_teaching currentlyallowed; exactmembership verifierchecks reviewed-teaching-match; unknownmodelproseNOTfactualproof. Existingcomputed/gradedvalues/creditstandardsunchanged. Generateddraft review,visual/media/research ports remainfuturework,notfakecapabilities.
- supervisor-tool-loop.ts strictstructureddecisions: get_history/get_profile/get_evidence/list_sources/list_support/choose_support,explicitfinish,2-8operatorconfiguredmaxToolRounds. Boundedcontext/trace,stableperroundaccountingkeys,aggregatedknownusage/unknowncost, earlierpaidcallretainedwhenlatersendnotstarted; undecodable/extraauthority/reachedroundlimitcannotdeliver. Oldsummarymode retainedwhenmaxToolRoundsunset; neverclaimitmodifieslessons. provider-runtime/composition/gateway wired maxToolRounds andscopedToolPort; conservativeFULLroundinput/outputtokenreservation checkedbeforefirstcall. No provider credentialsconfigured.
- supervisor-tools.ts actualDBtools resolve samefencedjob/operationINSIDE enrollment/jobtransaction,strictscope/noactorSQLgradingcostproofURLarguments,pagedretainedhistory,learnerprofile/evidence/sourceprojections,reviewedavailableprofilecatalog,chooseonlyafteropt-in/outsideactiveindependentassessment. Receipt IDs/results scopedjob/enrollment/workspace; modelcannotchooseotheruser. Oversizedprojectionsdenyselection. Additionaltenant/foreignhistory/lostack/concurrencytestsneeded.
- New supervised_plan artifactkind strictparser/store; beforeVerify verifySupervisorPlan checksactualtoolreceipts/selection/consent separatelymintedverifierauthority. BridgeapplyPlan hook calls applyReviewedSupervisorSupport insideparentlocked/fencedtransaction:currentavailableepisode,activeindependentassessmentdenial,exactapprovedprofile/bank/generator/verifier,all existingSDKpolicy/evidence/plan/registry/commitfences,actualpersonaltextblock andcostledger update. Auditactoragent/supervisefalse avoidsfeedbackloop; no credit created. Replaymaps1job→1effect. Legacy reviewedsummaryrow remainsreviewedproposal, not teaching effect.
- NEWrealPostgres+HTTPtest supervisor-tools.integration.test.ts PASSES3cases: syntheticexternalstructuredmodel3calls→actualscopedtools→separateverify→realmarkdownblock/planrev1 with0evidence andsamegate→replayno duplicate; noopt-indeliversnothing; revokedlearnerconsentfencesreadyjob/staff403. Sourcefixturepublicgenericordering, no privatecourseimports. Threepureloop testsPASS(inventedtools/proofs/commands rejected andpriorusagepreserved). FullAPI now227testsPASS; typecheckPASS; publicauditPASS. Newtests are actualintegrationwithonlyexternalmodelsynthetic, notliveGoogle.
- IMPORTANTunfinishedfor this module: learnerresponsiveUIopt-in/timeline/contextused,authscopetests(stale/foreign/read/proof/lostack/limits/concurrency),actualcombinedTemporaltoolflow/workerrestart/histories,documentation/SDKcreator ports,review-onlynovelgenerateddrafts andrealresearch/media/visualtools,undovisiblechanges, fullCI/PR/release/consumer/privateauthoringconfiganddeployment. DoNOTdeploypartialmoduleorclaimfullsupervisorcompleted. MainGoal includesallv0.8 remainingrows.
- No newagents(earlier closedusagefailures), no modelspend/keys/nativeownerprogress/miners/wallets/otherrepos/publicprivatecases. PrivatehostedCIbillingrestriction persists. Pendingsecurecredentials/spend allowance isNOTapproval. Many safeimplementationstepsremain; goalACTIVE.

# Current continuation state — Core0.1.5 released and private0.1.3 deployed

GoalACTIVE; fullv0.8 incomplete. ThisturnPROGRESS: diagnosedreleasefailure/retriedunchangedpinnedsuite, verified/publishedexactartifacts, qualifiedcorrected56episodeuserpaths, pinned/migratednativepilot,publishedprivatecourse andactivatedregistry with actualnativeQA. No blockingaudit.

READtopplanning/PRACTICAL_COVERAGE_HOLD.md for exactphaseevidence/currentruntime; holdforcorrectedpracticalcoverageisRESOLVED. Olderpending/failed/prototypeparagraphsbelow areSUPERSEDED.

- Coremain52208cf...,v0.1.5actuallyPUBLICprerelease. Release38344151592 SUCCESSattempt2 afterisolatedTemporalsetup timeoutattempt1(0of9 ran); unchangedtests passedonfresh runner,exactinitialcauseunproven. Immutableartifact11788398106 verifiedZIP9758257.../3409092bytes;all7archives/manifest/member/lock/installed/hostedbytechecksPASS, tag3d38...unchanged. RuntimeSHA319918e8acc63da467963b35f4a95cc53fa4ff8fcd28c7d1dbde839b2432dfcf. SDK0.2andvisual0.1.0unchangedreleaseddependencies.
- PrivateCoreconsumer.local/released-core-v0.1.5/course-core installedthroughreleasedCLI;49deliverymembersunchanged. Correctedcandidate5d4169... passed actual56episodeHTTP+PG+isolatedPython with3practicalrecoveries,bothvariants,replay,wrongoriginal/correctedrepeat,all56prematurecompletiondenials,EXACT270min/6episodeassignmentdebits,exhaustionwithunchangedpolicy. ThreeactualbrowservportsPASS:phone56episodes,desktop/tablet16eachthroughprivatefull-suite recovery;reloadcode/accessibility/overflow/0errors. Nativebinaries/physicaldevices/effectivenessNOTclaimed. Exec80889/19152 areCOMPLETEDsuccess;donotrestartthesetestssolelybecausesummaryexists.
- PinnedruntimeSTAGED/ACTIVATEDoutofcheckout: /Users/tnt/Library/Application Support/Course Core/Pilot/releases/v0.1.5/course-core,577archive members verified. Copiedfsdependencylinksinitiallyescapedtotheprivateconsumer;113linksrewrittenrelativeinsidepinnedroot/realpathverifiedbeforeactivation. Officialalready-qualifiedTemporalbinarycopied,digestrecorded. Nativequeuecourse-core-pilot unchanged. Source/.local cachesnot productiondependencies. Allfuture serviceCLI calls MUSTusepinned--root andexplicit--state /Users/tnt/git/course-core/.local/pilot; defaultoldrepoROOT failsownershipcheck. Pinneddeploymentavoidsdevelopmentbuilds changingrestartcode.
- Oldownservice authenticatedstopped,not_runningconfirmed,thenuninstalledstoppedlabelONLY(config/data preserved);newserviceinstalledusingpinnedsource. Newlabelcom.coursecore.pilot.e18e7b228df17065.748223c975984240a14b2448cf42d5ed/installation748223c9-7598-4240-a14b-2448cf42d5ed. Currentinstance13ad219c-1baa-42d2-8a52-c0f2e653d412;controller23333/temporal23339/api23377/worker23463/dispatcher23464 atlastcheck(REVALIDATE). Existing2QAenrollments match before/afterrev/plan/course/status/lesson/gates. Owner0enrollments/clockunstarted. Legacyllm-practical-code retained;3newqualifiedgraders installedready withcapturedhashfilenames.
- Private0.1.3 PUBLISHED live afteractualowneradmin review/publish/registryroutes. Release706d45dd-dea5-49c7-9ae4-be0b3553c8a1/digest5d4169ff837abf5835daeb917ab1ab897b6d82dfe97b8158666f93c5ab47704b, catalogb219561f...;registryrev1/115profilesactive. ActualnativeQA(notowner)completed16lessons,wrongcanon→freshfull-suite→realPythonindependentpass. ReceiptCore/.local/pilot/native-course-0.1.3-acceptance.json0600; publicationreceiptcourse-0.1.3-publication.json0600. NativeQAaddsathirdenrollmenttotheexistingQAaccount; old2pins remain. DoNOTcreateownerprogress.
- ProtectedoperationalreceiptsCore/.local/pilot: v5-migration-before/after.json,config-before-v5-pinned.json(CONTAINSgeneratedcredential;DONOTPRINT),qualified-registry-staging.json,course-0.1.3-publication.json,native-course-0.1.3-acceptance.json. Pinnedreleaseparentinstallation-provenance.jsoncontainsartifact/binary/linkmetadataonly. Superseded469fprototypegraderremainsstaged/NOTconfigured; configincludesoldlegacy+3qualifiedhashfiles. No wallets/HF/payout/password/sudo/Discord/miner/GPU/remoteMac/newwatcher/externalmessage actions.
- PrivatehostedCIstillbillingblocked;localcoursequalification/sourceprivatepersisted.No liveGooglekeys/allowanceconfigured, no paidmodelcalls orfakeassistantanswers. MainAIsupervisorstillonlystores noncompanionproposalSUMMARIES: toolloop/verifiedlessonchanges open. Learnercourseis anexperimentalprivatepreview, notcompleteprofessionalplatformdelivery.
- NEXTmajorphase: implement the supervisor's source-linked scoped toolloop andactualverifiedadaptations;wholehistory/profile/tools/contextdebugGUI; secureprovider/model/budget/credentialsetup anduser-configuredGoogleliveacceptance;research/mediainspection/generation/review/attachment;personalepisodes/branches andrubric/conversation assessment;policydeadline/retention wakeups;export/delete/undo/backup/restoreGUI/leastprivilegeDB;nativeJSreadiness/otherengines/physicalresponsive checks andfullv0.8 audit. No newmobilebinaries(userdeferred). Livecredentials/spendingquestionsremainunanswered, notapproval; no modelcallsuntilsecureuserconfigurationandallowance. Plentymeaningfulwork,leavegoalACTIVE.

# Current continuation state — full practical coverage corrected

GoalACTIVE. This turn madePROGRESS: strengthened private practicals, independentlyqualified them, implemented/merged generic bounded batchgrading, diagnosed/fixed hostedtest race, and dispatched pinned releasevalidation. FullobjectiveNOTcomplete; no blocked audit.

Privateworking candidate0.1.3 digest5d4169ff837abf5835daeb917ab1ab897b6d82dfe97b8158666f93c5ab47704b. READplanning/PRACTICAL_COVERAGE_HOLD.md topsection forcurrentevidence andnextactions; older3561...prototype paragraphsbelow areSUPERSEDED.

- PublicCore main52208cf3c7ffd968e5a5f9c3e90e2ad7a9bb55a6, PR12merged/attached. Rootversion0.1.5; SDKstillreleased0.2.0. All12hostedcheckspassedat7a752e67bb9ed009107a264206684b7bbd485b41.20realDocker tests(including7newbatchcontrols),221APItests,5sandboxunits,fullrootcheck,realHTTP/Postgres/DockerlargefixturePASS. Nine standard connectedbrowsercases retained. The firsthostedSandboxtestfailedbecausecancellationwastriggeredbeforecreateack; thatcorrectlyquarantined. Testnowwaitsforrunning proof;guardunchanged, hostedretrySUCCESS.
- GenericAPI greedilybatches conservative fixture references withoutomittingcases. Brokerkeeps1sharedadmissionlock,1deadline,1wholeattempt combined stdout/stderrlimit acrossserialcontainers; source/references/plan capturedbeforeasync. Laterfailure/cancel yieldsnocredit. Uncertaincleanup/creation inanybatch quarantineswithoutsilentretry. MetadataoutputBytes/batchesCompleted added. Defaults remain128MiB,0.5CPU,5s,64KiB; no limitincrease. Finalcleanup cancellation nowdeniescomputedpass.
- Corev0.1.5 annotatedtag52208cf... pushed. Release run38344151592 VERIFIEDINPROGRESS with fullCI/candidateassembly, notterminal. Samehandle mustbepolled, no duplicateworkflow/restart. Corev0.1.4 remainslatestACTUALLYPUBLISHED. DoNOTpublishv5until immutablecandidateZIP/manifest/member/lock/hostedasset gatespass; doNOTretag failedcandidate.
- Newprivatecontent/practicals-qualified.json has3canonical code suites, eachrequiresbothoriginaltaskoutputs. Sixfreshvariantsrequirecanonical+transferresults;3per-familygraderfiles withuniqueIDs. Originalruntime/code-fixtures.json/e425...retainedunchanged; original92inputs coveredincanonicalpairs.45minute assignmentestimates withinunchanged300min/20episode/rem3 caps. Bank source actoridhashesstillfrominstalledgenericcreators; registryapprovalNOTgranted.
- ComputationqualificationPASS54canonical+78freshcases,655FD,132missingtaskcontrols,78wrongkeycontrols,22mutants. Actualreleasedv4broker9positive/negativefixture setsPASS(fakepass/mountchecks). Files431305/749493/768719bytes, each<1MiB;largestfulloutput55977bytes beforebatchingpreflight. New11assembly/bindingtests andallmath/visual/legacy/recoverychecksPASS. No declared source/answer bank leaked tolearnerprojection. Promptscorrectedtofullyraw evidence, no conflicting oldbooleanfields. Sourcefilesnot yetfinalpushedatthischeckpoint.
- Privateverification/learner-flow.mjs nowSTRICTLYrequirespublishedCore0.1.5;verifies3registrybytes/hashes beforestartup. UsesreleasedCLI+HTTP+disposablePG17only, noCoreinternal/siblingimports. Costassert270min/6episodes. Browser helper45minbutton,onecanonicalfailurebeforefresh,awaitscompleteHTTPresponse. TheseupdatedcorrectedfullHTTP/browser/nativegates NOTEXECUTEDuntilv5published. Oldprototype56HTTPpassisnotnewdigestacceptance.
- Nativeownpilot still58793e00... atlastcheck(originalprivate0.1.2/originalgrader/3creators, owner0). Publicworkingdir builds updateddist; considerpinning managedruntime toimmutableartifact during upcomingdeployment sofuturedevelopmentbuilds cannot alter restartbehavior. Revalidatenativecontroller beforeactions. No actualminer/wallet/secret/unrelatedrepochange,newwatcher,modelcredentials orpaidcalls. Old469f...stagedprototypegraderNOTactivated;3newqualifieddatafiles mustbestagedfornewpublication onlyAFTERalluser-pathgates.
- Remainingfullscope: persistent supervisoractualtoolloop/verifiedlessonchanges(notjustsummary),provider/credential/budgetGUIandliveGoogleacceptance,research/media inspection+delivery,wholepersonalepisodes/branches,profile/history/contextdebug,placementfullprivateflow,policy/deadline/retentiontimers,export/delete/undo/backup/restoreGUI,leastprivilegeDB,crossplatformacceptance. Nativeappbinaries deferred. PrivatehostedCI billingblockpersists; donotchangebilling ormoveprivatecontentpublic. Plentymeaningfulwork; leavegoalactive.

# Current verified state — Core0.1.4 released; private grading coverage hold

Goal ACTIVE. This turn was PROGRESS: a public runtime release, new private computed/isolated practicals, released-consumer qualification, actual full-course HTTP evidence, and a material assessment-coverage finding. Full v0.8 remains incomplete.

- Core main9811bc9f5394c315a166a0e13c4a945823d3be8f, PR11 merged/attached, Corev0.1.4 PUBLIC prerelease. All12 protected CI checks passed for PR11; candidate run38335467180 completedSUCCESS including fullCI and assembly/installed-consumer gates. Immutable artifact11784751735, ZIP3400251bytes, SHA4cb0bcdc77d9ea55261b40c190fd474e445ce1879b2867516a33c60e722abb0e. Tag object127df24a59512ef5f9e2ac1feeb50de9ba50406d unchanged. All7 draft-hosted assets checked then published and downloaded/checked again. RuntimeSHA2d4946dad1a4d9836af225ddae63249f5c1fc0763a0475a1ef37080b38bac922; visual0.1.0 bytesc287...UNCHANGED. URLhttps://github.com/roeehrl/course-core/releases/tag/v0.1.4. No npmpublication or complete-platform claim.
- Private consumer installed publishedv4 runtime under .local/released-core-v0.1.4/course-core using its public CLI;49 delivered API/sandbox/visual/learner files remained BYTEIDENTICAL. Private package added locked pg8.23.1 and axe-core/playwright4.13 for tests, not Core sibling imports. Core0.1.3 released broker remains .local/released-core-v0.1.3 and was used for actual new exercise isolation qualification.
- Unpublished private0.1.3 PROTOTYPE digest3561b2cfbc515ca2a0ff04510dab5579e9afda09377b56e3e3e69ae00119840a. Six new transfer tasks in3 existing practical families,74 cases,655FD checks,74wrong-key controls,18mutants allPASSED independent CPU references; all6actual released Docker positive/negative gradesPASSED. Original92fixtures exact. Registry652815bytes/hash469fd227086d41bd3cee3bc3eb51d94f5fb067fd200f34b31ff36de15e8f5f86. Staged protectedCore/.local/pilot/code-fixtures-recovery-469f...json isNOTactivated. Source content/practical-runtime.json rebases the legacy evaluator identity while keeping oldfile for oldpins.115profiles(39numeric/73banks/3code),2code variants perfamily,30minute prototype estimate. New11assembly/binding testsPASS, allexistingmath/recovery/visual gatesPASS. This evidence is superseded for learning coverage by the hold below.
- Actual releasedCore0.1.4 CLI+HTTP+Postgres acceptance PASSED all56episodes,3practical recoveries,6committed recoveryassignments, wrong originals, corrected-repeat ineligibility, both fresh variants perfamily, replay, unearned-completion denial atEVERYepisode, and separate exhausted-learner blockage. Operator0enrollments. Receiptprivate .local/learner-flow/run-*/acceptance.json. Initial test failedbecauseit incorrectlyexpected completed-countfield; fixed tocompleteflag plus56lessonstates, rerunPASSES. Later exact-cost/policy-snapshot assertions were added but areNOTyet reexecuted; reexecute on corrected content. Do NOTclaim they already passed.
- Privatephone browserprototype traversed56episodes andpassed firstcode recovery/reload/accessibility/overflow, but finaltest checked statebeforeawaiting completeHTTPack and FAILED browser_full_course_incomplete. The await-save race isFIXED butNOTrerun. Desktop/tablet privateflows areNOTexecuted. Earlier harness path shadow and missingaxe dependency werefixed. Test sessions41322/88880 etc areTERMINAL, not live; ownedAPIs shut down and owned schemas dropped. Do notrestart merelybecauseoldhandlesare summarized. NewUIacceptance needs corrected content, then an actual fresh run.
- CRITICALcontent finding: objectives demand reverseengine/full decoder/complete release evidence, but some new transfer exercises and the original baseline alternative pairs prove only portions. PublicationHOLD, explicitlynotified. READplanning/PRACTICAL_COVERAGE_HOLD.md before treatingmathpasses as objectivecoverage. Requirednext:3canonical practical suites requiringBOTHoriginal tasks, freshvariants returning canonical+transferoutputs, raw numerical evidence insteadclaimedpassflags,3bounded per-family graderdata registries ifneeded,45minute estimates within unchanged300min/20episode/perconceptcaps, independent verification and all actual releaseduser-path gates. Old snapshots/gates/enrollment pins remainprivatelegacy; newimmutablecourse maystrengthentaskcoverage. No private0.1.3 publication or graderactivation occurred.
- Nativepilot still58793e00-0b34-4cc0-b213-73ba3f50190a(all4services rechecked); private0.1.2 active, onlyllm-practical-code ready/installed plus3creatoradapters. Ownerunenrolled, no paidprovidercalls/configuredcredentials, no miner/wallet/secret/unrelatedchanges. Do nottreat oldprivategrading as professional readiness. OldpublicCore0.1.3 assetsretained;v4nowactuallyreleased.
- Broadergoal remains: realpersistent supervisor toolloop and verified lessonchanges(currentnoncompanion output onlysummaries), provider/budget/credentialsetup and liveGoogle tutoring/video, research/media inspection/delivery, personalepisodes/branches, history/context/debugGUI, policy/privacy/retention/export/delete/undo/backup/restore/leastprivilege/multiplatform acceptance. Nativebinaries deferred. PrivatehostedCI billingrestriction persists; no billing or public-contentworkaround. No blocking audit: meaningfulwork isavailable.

# Current verified state — completed recovery phase, 2026-10-13

This section supersedes all older checkpoints below. Goal remains ACTIVE; full v0.8 delivery is not complete.

- Core PR10 is MERGED, all12 hosted checks passed in run38333067045. Main5060d1e contains reviewed code recovery, exact installed grader/fixture preflight and exhaustion-aware recovery offers. Local full root check, API218 cases plus subsequent fence regression,12 lifecycle cases, real PostgreSQL/Docker and9 connected browser cases passed. The source/privacy audit passed.
- The owned native pilot is DEPLOYED to this merged runtime. Current instance58793e00-0b34-4cc0-b213-73ba3f50190a (revalidate rather than signal stale PIDs). All4 services run. Restart used authenticated pilot stop, confirmed not_running, then own launchd kickstart without force. Saved QA enrollment revision3/plan0/course/gates/lesson states match normalized before/after snapshots. Owner still has0enrollments. Installed Python evaluator isready. All3 known recovery adapters are selected, but private CODE profiles are not approved.
- Private descriptor metadata was refreshed through authenticated runtime API. Existing numeric/bank implementation hashes are unchanged; code-bank descriptor is available for upcoming authoring. No credentials are in that file. Private published0.1.2 still has112 numeric/choice profiles, no fresh practical profiles, unchanged digest5d1b85b20b536a0e177f8b0893fc4c0b22b0fec1f1373a7f9468ec34b3c5aba9.
- Private changes pushed through e679add; runtime descriptor/status updates follow.10 assembly/runtime binding tests,6 recovery CLI tests,895 domain checks and895 wrong-key controls, all CPU math, practical92 cases/197 finite differences/32 mutants,384+1110 visual frames and negative controls passed. Repeat binding preserves exact course digest. Private hostedCI stillcannotstart due accountbilling; no billing changes or public workaround.
- Public Core RELEASE0.1.3 is the EARLIER commitda5e8e98; merged/deployed PR9/10 runtime needs a new immutable release before claiming the private course consumes all released runtime interfaces. SDK0.2 and visual0.1.0 artifact consumption are already qualified.
- planning/ACCEPTANCE_MATRIX.md preserves every approved product gate. Immediate next phase: reviewed/independently qualified private code recovery in3 practical families, full56episode/repeated-failure/browser acceptance, fresh runtime artifact, then persistent supervisor structured tools and actual verified lesson changes. Current non-companion supervisor output is only a proposal summary, not teaching adaptation.
- Live Google tutoring/video awaits secure setup and explicit spend allowance. No provider credentials, budget or paidcalls have been configured. Broader scoped research/media, whole remedial episodes, history/context GUI, retention/policy timers, export/delete/undo/backup/restore GUI, least-privilege DB and cross-platform acceptance remain open. Native app binaries are deferred. No SN9/miner, wallet or unrelated repo changes.

# Current verified state — 2026-10-13 04:40 IDT

The goal remains ACTIVE. This continuation completed an assessment recovery phase, not the full platform.

- Private curriculum/evidence/released consumer source is pushed to the PRIVATE repository at b74c2ec51853f53e6922eb21a3dc21337211cca7. The 31 upstream snapshot hashes remain exact; formatting exemptions apply only to those snapshots. Hosted private CI run38331698558 could not start because of account payments/spending limit. This is freshly confirmed from its annotation; no billing changes or public-content workaround.
- Public Core PR10 https://github.com/roeehrl/course-core/pull/10 is OPEN at 9e92e03630764ef2f0e668dc700132e6f0b113f7, attached. It adds explicit authored-code-bank-v1 with exact installed fixture/evaluator preflight, preserves canonical families, rejects embedded fixtures, supports another profile after bank exhaustion and removes exhausted offers. Current native pilot is still the merged PR9 version; PR10 is not deployed yet.
- PR10 local verification: full root check passed; 218 API cases and one subsequent draft/fresh-delivery fence regression (25 adaptation integration cases now), typecheck, 12 lifecycle tests, real PostgreSQL/Docker code recovery with distinct learners and nine browser cases across phone/tablet/desktop. Browser code-draft reload, independent-evidence gates, accessibility and horizontal overflow passed. No live model calls or private course coding recovery claim.
- Private runtime binder now exports a pure reviewed-data binding function and rebuilds from authored source before writing overlays. The actual CLI runs twice with dist already containing recovery, without duplicate declarations. Four new tests plus six assembly tests passed; unchanged assembled digest 5d1b85b20b536a0e177f8b0893fc4c0b22b0fec1f1373a7f9468ec34b3c5aba9.
- Private qualification reran: all CPU math, practical92 cases/197 finite differences/32 mutants, recovery895 domain cases and895 wrong-key controls, six CLI tests, visual384+1110 frames and negative controls. Added private CI entrypoints for recovery, practical and released-renderer qualification. Changes after b74c2ec need a follow-up private push.
- Critical remaining priorities: reviewed fresh CODE variants/fixtures for all three private practical families; full private user-path acceptance through56episodes and repeated failures; release the merged fresh runtime interfaces and qualify actual private use; implement the persistent supervisor's structured tool loop and real verified adaptations (current non-companion outputs are summaries, not changed lessons); secure provider/budget controls and user-configured Google live acceptance; research/media inspection and delivery; lifecycle/privacy/export/restore/retention GUI and full v0.8 acceptance audit. Native app builds are deferred. Do not turn a mock or component pass into completion.
- Current native service remains owned/healthy, no owner course clock was started. No miner, secret, wallet or unrelated repository changes. Paid provider credentials/spend allowance remain unconfigured; no paid model calls.

# Current verified state — 2026-10-13 continuation

This section supersedes older checkpoints below. The goal remains active; the full approved platform is not complete.

- Core PR9 is merged at a3dff79446ef9309b6b0759270314b89031e9edd and deployed to the owned native pilot. Authenticated lifecycle checks confirm all four services running. Public Core v0.1.3 remains the earlier packaging release; the fresh-check API needs a later artifact release.
- Private course 0.1.2 is published in the private pilot: release ab9e2bfe-adb6-4a39-aaf2-705ac42bd6d8, digest 5d1b85b20b536a0e177f8b0893fc4c0b22b0fec1f1373a7f9468ec34b3c5aba9. Registry revision 1 approves 39 numeric templates and 73 reviewed banks using installed generic adapters. Baseline assessments and independence gates are unchanged.
- An actual separate QA learner failed the original numeric check, passed the other family, requested a generated numeric check, independently calculated its answer from the delivered prompt and completed the first episode. The owner remains unenrolled. The protected private receipt is stored in the pilot, not in public code.
- Released SDK/visual consumer, full CPU math/practicals, 895 discrete-domain recovery cases and their wrong-key controls passed. Six assembly tests and six real authoring CLI tests were rechecked on continuation. All 31 frozen source hashes match. Snapshot whitespace is deliberately preserved via a snapshot-only Git attribute.
- Remaining immediate assessment gates: private browser recovery acceptance across viewports, repeated-failure/exhaustion behavior, coding exercise recovery and full-course user-path qualification. One successful recovery is not full-course acceptance.
- Broader open phases remain: supervisor tool orchestration and verified adaptations, live research/media and provider controls, Google acceptance after secure credentials and explicit spend allowance, lifecycle/privacy/retention/export/restore UI, full v0.8 acceptance audit and refreshed released runtime consumption. Native app binaries remain deferred. No paid model calls or miner changes are authorized here.
- Private hosted CI was blocked by account billing on the previous run. Local tests are evidence; they do not replace the hosted gate. Verify the next push/run rather than assuming that restriction has cleared.

# Latest continuation state — 2026-10-13 03:08 IDT

GoalACTIVE. This turn wasPROGRESS: verified/publiclypublished core artifacts, privatecourse released-interfacequalification/deployment, independent recoveryauthoring, realUIwrong-answerflow, newruntime/admin controls. Fullscope NOTcomplete. No blocked audit.

## RELEASE ACTUALLY PUBLISHED

- Core0.1.3 https://github.com/roeehrl/course-core/releases/tag/v0.1.3 prerelease, exacttag/commitda5e8e98f50d6772e3ddf2326e5d2ffebac00bf1. Candidateworkflow38321224616 COMPLETEDSUCCESS, attempt1. ALLfullCI andassembly/source/runtime/web/standaloneinstalled-consumergates passed. ImmutableActionsartifact11779385086,ZIPSHA30c1669ff73a59dab45156c2ea3abb8d358e2bd16f815d178906c9edda63f365, ZIP3364307bytes. Originaltagobjectb7c28e02823733bf5eaa428c0e490dc5cf5002af rechecked unchangedafterpublication.
- Downloaded immutableZIP andverifieddigest, safeflat7-fileextraction, verifyCandidateBytes fullmember/lock/provenancechecks. PublishedEXACTsame5archives+manifest+SHA256SUMSwithoutrebuilding. DownloadedALLhostedassets andcheckedbyte/memberhashes/manifestequalityagain. Assets in core/.local/releases/v0.1.3/{assets,hosted};ZIPinparent. SourceSHA970bb412a8e4478bc61dfa4f7d833fd081304315ae25a4923134caebc89cb0a5;runtime2d23196e94ef5cc317f02bdff6ce4f3540260b8fe58e15ba13da8656cade87f;learnervweb84b166cb67d9cdddec1e2c93aefb2878a6c7416b93c66c755155870b00a32f24;admin863998edc6f4b0e820686da9c3ddea0f963117897a0acb5709d8531bc959bc25.
- Standalonecomponentvisuals0.1.0 URL https://github.com/roeehrl/course-core/releases/download/v0.1.3/course-core-visuals-0.1.0.tgz SHA c287a8065a1f464f267b1d3aa83d237ea2248630f625dcd6300acf2e6515b219. Consumerinstalled/SSR/headless/CSS/types/no-sibling checksactuallypassed. No npmpublication. Thisrelease isexperimentalinfra, NOTwholeapprovedplatform/liveprovider/deployment/mathcertification.

## PRIVATE COURSE ACTUAL RELEASED-CONSUMER AND PUBLICATION

- Privatepackage nowdepends on exactreleasedSDK0.2 andCorevisuals0.1.0GitHubURLs, lockintegrities. Addedownesbuild0.28.2 +Playwright1.64devdeps (no resolvingthese throughsiblingcore). Rendererfingerprinte16ff...unchanged. DevelopmentfileURLoverride no longerneededforprivateverification.
- ActualreleasedpackageverificationPASS:384foundationframes/3negativecontrols;1110systemsframes/9negativecontrols;all15privatebrowsercases at320/390/700/834/1440;fullcourseCPUmath suites +practical92cases/197FD/32mutants rerunPASS. SomeoptionalPyTorch/MLX snippets remainSYNTAXonly; notexecuted. Sixassemblytests pass. Largeprivatepracticaloutput redirected/filterednexttime.
- Privatecoursecontent.versionbumpedfrom0.1.0 to0.1.1 becauseimmutablepublishedbyteschanged (sixvisuals). Actualnewcourse digest4484eb500249a6a3488868ab60ae2589c1e7f8f90ff475e3abb48b0b3510bf63,56episodes/6visuals/6code.
- Imported,submit-review,approve,publish throughREALauthenticatedadminAPIwithfreshcatalogrevisionandkeys. Newrelease42880297-74c8-4b02-93a3-de04301d393c,catalogb219561f-48fb-4cd3-989e-5aa0d636cf9a, reviewAPPROVED/statusPUBLISHED. Receiptcore/.local/pilot/course-0.1.1-publication.jsonprotected600. OldQAenrollment48644ea7...stayspinnedold8563...; OWNER0enrollments/clockstillunstarted. Nolearnerprogressmanufactured. AdaptiveRegistry fornewreleaseNOTenabledyet.

## CRITICAL RECOVERY GAP DISCOVERED, FIX IN PROGRESS

- Baseprivatecourse115families:112choice/numericfamilieshaveONEitem,3codefamilieshavetwoalternatives. Aftera wrong firstanswerorhelp, correctedrepeatcannotearnindependentcredit. Withoutfreshcreatorregistration, aprivatelearnercouldgetstuck. Userwasexplicitlynotified; doNOTcallprivatecoursereadyfornormallearninguntilverifiedfreshpathactivated. Donotweakenindependence/gatesorjustcountnewIDsasnewfamilies. Generalcoursepublicexamplesalreadyhadmultiplevariants; thisprivategapneedsactualfix.
- Independent privateauthoringworkcompleted thisturn: verification/adaptation-reference.py has56separateproceduralreferences (FDderivatives,actualmatrixmultiply/FP32rounding/scatter/state/pipeline/event/timing/traffic/statistics); doesNOTreadproducerexpression/key. Repairedpartial adaptation-authoring.py toclosedAST/Fractioninterpreter,noeval,boundeddomains,defaultanchors,SDKvalidation,generate/verify/reference/write CLI. Exact895discrete-domaincases +895wrongkeycontrolsPASS,112freshitems/112existingfamilies/56episodebindings,39integerSDKrecipes. Decimal13-03hasEXPLICITdiscretevalues; notcontinuousgeneration.
- Newlycreated privatecontent/adaptation-authoring.json, fresh-assessments.json, ADAPTATION_REVIEW.md; verification/test-adaptation-authoring.py SIXactualtestsPASS includingrehashingwrongkeys/scope/prompt/source/family/choice,ordinalexhaustion,actualCLIprocesses,invalidreferencevariables. SDK0.2 validatescombinedauthoringcourseinmemory andhidesgenerator/answerdata. CLIpublicationAuthority not_granted/proofAuthenticitynot_checked. **ThisprivatecustomextensionisNOTruntimeinstalled/approved**; producerfilesmustnotbe treatedastrustedreceipts. Choicefacts authored/rationales, not automatictruthcertification;codepracticalrecoveryNOTcovered. Additionalfreshnatural-language/codecreationstillfullscopeopen.

## CURRENT CORE BRANCH/PR9 (NOT merged/deployed yet)

- Branchcodex/fresh-question-runtime, HEADd13f2c2c572b17c63304c29446b081ed0bd9f528. PR9 https://github.com/roeehrl/course-core/pull/9 OPEN,attached. CIwhencheckpointAPIinprogress,othergatescheckfresh. Worktreeclean. Mainstillda5. Allchangesgeneric/courseagnostic.
- New adaptation-composition.ts explicitlyselectsknownbounded-numeric-v1/authored-bank-v1operatorcode; defaultsEMPTY, noauthorization/proofgrant. API/mainenv ADAPTATION_ADAPTERS; nativeconfigoptional adaptationAdapters whitelist2/duplicatesdenied,passedONLYAPI. RuntimeGET /api/runtime/adaptation-adapters andadminaliasreturnsinstalledIDs/kind/exactdigest,authrequired, nobank.
- Protected admin GET/POST /api/admin/releases/:releaseId/adaptation-registry: owner/adminworkspacepermission,expectedRegistryRevision,strictboundedconfig,actualapproveAdaptationRegistry; installedhash/source/canonicalfamily/costchecks. Existing21adap testsnowapprove throughPRODUCTIONHTTProute; learner/foreign/stalerevision/metadataauth testsadded. NativepilotconfigurationdoesNOTselectadapters yet, soactual0.1.1privatefreshpathstilldisabled.
- AdminProvidersincludes RecoveryRegistry component forconnectedowner/admin: installedhashes, release selector,registryrevision,server-onlyJSONconfig input,refresh/approve controls,draftpreservation/error/nofakeDemoapproval. FetchAdminClientoptionaltypedmethods,CSRFcookiecalls.3component/fetch testsPASS. RawJSONform currentlylow-levelcreatorcontrol; richereditor/preview/idempotentunknownoutcome reviewcouldimprove later. ImportantbothuseractualGUIandsecuredserver.
- APIGETenrollmentnowadds recovery guidanceafterexistingUNEXPOSEDchecks exhausted: missingobjective/notyetearnedcanonicalfamily,approvedprofiletime/episodes,orhonestunavailable. answerbank/keys notinmetadata. Installedfamily3passeddoesnot offer samecreditagain. plans/limits/evidence stilltransactionallychecked inrequestFreshQuestion.
- ConnectedlearnerkeepsONEprimaryaction: normalStartnext whileunseenbaseitemsremain; onceexhaustedGetfreshcheck·2min. Hostusesadaptation/fresh-question withexpectedPlanRevision andcurrentfamily/objective; whenunconfiguredexplainsfreshneeded/course-teamactioninsteadloop. No creditonrequest. Clientactionvalidatorfixedtoadmithyphenatedsegmentswhileblockingtraversal/encodedslashes/query/emptysegments (browsertestfoundthisactualintegrationbug).
- Verificationcurrent: API213testsPASS;learner97testsPASS;adminexisting40+new3tests/typecheckPASS;11lifecyclePASS;publicaudit405filesPASS. SIXactualPG-connectedbrowsercasesPASS atphone/tablet/desktop,includingWRONGoriginalchoice→correctnumeric→freshapprovedchoice→twoindependentfamilies→unchangedcompletiongate. Public recoveryfixture bank issynthetic/approvedno privateimports;requestcosts2min+1extraepisode. Theseareactualuserpathchecks, notjust unitmetadata.
- PR9 mustpassallCI, thenmerge/build/deploythroughownedservice. Actualprivatebindingmustbeimplementednext: offlineauthoringcurrentlydeclaresPRIVATEcreator/verifierextension(notgenericinstalledIDs). Bind qualifiedprivatedata/39templates toexactgenericnumeric/bank runtime descriptors andsinglecheckids/referenceproofs,orinstall privateSDKportplugin throughgenerichost. Registryconfiguration112profiles <=128bound,verifiers2/sourceIDs/extensionhashesscope. **Do notsimplyapprovecustomuninstalledextensionorappendallfreshkeys tobaselinebank toavoidcost/evidencepolicy.** UsecreatorSDK/privateblueprint andappropriatebankreview; activate throughadmin thenactualwrong-firstprivateQAflow. Freshcodefamiliespathstillneeded.

## NATIVE PILOT / REMAINING WORK

- OwnlaunchdservicecontinuesRUNNING/controller84615/instancea461... (revalidatevia service.mjsstatus, notstalePID). Actualautomaticfailure-recovery andsaved-stateconfirmedlastturn. DBthrough009;protectedconfigqueuecourse-core-pilot;owner0;oldQAreading1/question1/assistant0;no paidproviderkeys/budget. Actualnativecode currentlybuilt93e fromPR7; latermainpackagingonly andPR9NOTdeployed. Avoidrestartingsolelybecauseobservationtimesout.
- Fullscope remainsopen: MainAIsupervisor tool/generation/application/learningdebugger,placement/deadline/retention scheduling/fullhistorytools/currentcontextGUI,rubric/conversation/activityevidence,research/videosactualinspection+review+attachment,secureprovider/model/budgetGUIandliveGoogleacceptance, optionalpersonalbranches/wholeepisodes,genericbackups/export/restore/retention/deletion/undo,leastprivilegeDBrole,otherengines/nativeJSbuild-readiness/physicalmobile, fullv0.8requirementaudit. PrivateGitHubbillingblocked; doNOTalterbilling/publishprivatecontentforCI. Modelcredentials/paidtestbudgetpendinguserresponse areNOTapprovalbydefault. Nativebinariesdeferred. No SN9/workers/wallets/passwords/financialtransfers/socialmessages.
- Privateworkingtreehasallcomplete14chapter/56episodecontent/6visuals/practical/evidence/authoring/releaseddepschangesUNCOMMITTED (onlyoldinitial9cffwaspushed). Needselectivelycommit/push verifiedprivatework afterprotocolbindingreview, preserveprivatevisibility. PublicSDK0.2 releasedunchanged. Do notwrite memoryfiles withoutrequest.

# Latest continuation state — 2026-10-13 02:18 IDT

This section supersedes earlier status. Goal ACTIVE. Previous turn was concrete PROGRESS: lifecycle/native deployment and recovery verified, context constraints implemented, release guards corrected. Fullv0.8 scope stillincomplete. Do notmarkcomplete/blocked.

## Authoritative source and CI

- Core main `da5e8e98f50d6772e3ddf2326e5d2ffebac00bf1`, version0.1.3, worktreeclean. PR6(native lifecycle/reviewedlicenses), PR7(resolvedteachingcontext), PR8(mapstaging) MERGED afterall12CIchecks. Allattached. Commits: PR6=9d4bc2380d8c978b2ee440636d3279924e075be2, PR7=93e0bb008ce7795766eed6613dc380fc33898750, PR8=da5e8e98. Core mainprotected12strictchecks/PR/enforceadmins/noforce/delete/linearhistory. Usefull40charSHAwithgh--match-head-commit (twoabbreviatedattemptsfailedcleanlybeforemerge;werecorrected).
- Public pipeline usespinnedPlaywrightChromium; reallearnerandadminPGbrowsers mandatory.47rootinfra tests +11lifecycle tests pass. Learner95tests pass. New207APItests passed locally andinPR7CI (including5actualpolicy-accounting tests,1prompt-boundarytest,1invalidlessontest). No liveGoogle claim.
- CIcaughtinode reuseonLinux inlifecyclefixture. Testnow provesauthenticatedcontrolrejectsreplacement withoutstopactionevenifinodeimmediatelyreused; applicationHMACguardwas alreadycorrect. CIalsocaughtmemorytestactions clickingduringload; ready() nowwaitsloadcompletion andguardedbuttons enabled (no weakertimeouts/passconditions).95fulllearner tests pass;latestallCIpassed.
- Supervisorcontext nowgetsallancestor deadlines/globalworkcaps, current-conceptconsumed/reserved/remainingquotas, extensionpoolbalances/cooldown/offercounts, policy/ledger/snapshot revisions. Otherconceptquotas explicitlyomitted, newscopeneedsfreshresolution. minimumExpansionProbe notwholeplanpermission; suggestionsarenotconsent/grants. Enrollmentlockedbeforecurrentcourse/profile/policyload; unknownlessonrejected (nofallback); stalecourse/mixedlearner-modelrevisionrejected. Thisisactualproductioncontext, notjusttypes. MainAIgeneration/application/toolorchestrationremainsopen.

## Release status — NO assets published yet

- v0.1.0c3 tagcandidate38313012221 failedmissingfirstpartylicenses; v0.1.1b411 candidate38316349959 failedunionfs4.6.0metadata; v0.1.2=9d4bc23 candidate38320058313 failedregular generateddist/contracts.js.map. ALLfailedtagsretainedunchanged; nogeneratedassetswereuploaded/published. FullCIpassdoesnotimplyassemblysuccess.
- unionfsLICENSE inexactlocked4.6.0tarballmatchesprimaryhttps://raw.githubusercontent.com/streamich/unionfs/v4.6.0/LICENSE byte-for-byte. Unlicense1211bytes SHA6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e. scripts/release-license-reviews.mjs explicitversion/filehashreview; missing/changed/unknownstillfails. Originalnotice retained. Fixture scripts/fixtures/unionfs-4.6.0-LICENSE.txt explicitlyallowlisted. RootfirstpartyApache licensechecks remainstrict.
- mapfix omitregular generated.mapfilesBEFORE reading/staging; rejectsymlinks/privatepathdisguises andcontinuerejectmapsinsideDELIVEREDarchives. runtime dist/test treesexcluded; publicsourcearchive retainspublicdevsource. Testsrealcanarymaps/locks/archivecorruption.
- New v0.1.3 tag atda5e8e98, releaseworkflowdispatched thisturn. Newrun38321224616 confirmedIN_PROGRESS atda5e8e98; pollsamehandle beforeanyretry. Preservealltags; nevermovetoafixcommit. Componentvisualsstays0.1.0 (ownversion); packagingversionsdonotchangemathrenderer identity e16ff... . Needactualcandidateassembled/installedconsumer/immutableartifactIDanddownloadverification, thenpublishSAMEbytes/hostedhashcheck. Privatecoursemustconsume actualreleasedcoreinterfaces; stillpending.

## ACTUAL native local pilot (deployed, still candidate-source)

- NativeOWNEDlaunchdserviceinstalled andRUNNING:http://127.0.0.1:4310,Temporal7239/UI8239. Label `com.coursecore.pilot.bedaf0f44ef3de13.7fc50009e7ea44d49e64c0e6be79f69c`, installationID7fc50009-e7ea-44d4-9e64-c0e6be79f69c. Protectedreceipt/ownedplist verified bymanager. CallingtaskFGhandle93515wasstoppedcleanly; doNOTpoll/restartthatstoppedhandle. Service nowrunsindependentlyofchat.
- CurrentpostrecoverycontrollerPID84615, instancea461e81b-7bda-4cbf-9ccf-cc4f325d0103, childrenTemporal84621/API84643/worker84678/dispatcher84679. Thesearehistoricalbycontinuation; revalidatevia`node deploy/local/service.mjs status` beforeusing. Itauthenticatesowncontroller; onlysignalsowntrackedchildren. NoSN9agents/processestouched. Neverbootoutliveunrelatedagents.
- Legacyparent6480 +children6486/6491/6535/6536 weredirectlyidentity/CWD/start/parentageverified, SIGTERMgracefullystopped, allconfirmedgone beforenewstart. NoPIDguessing. Newforegroundcontroller81290rannativeactualservices, thenauthenticatedstopandconfirmednot_running beforeownlaunchctlbootstrap. config.temporalTaskQueue nowexplicit`course-core-pilot`, verifiedoldworkflowmetadata; no strandedqueuechange. Ownedprivatecode-fixtures.jsonchmod0600requiredbyprotectedload (actual397059bytes, samecontent). Noarbitrarysecretfiletouches.
- MainAPI/supervisorbuildfrom93e0bb0currentlydeployed; laterda5mapfixonlyaffectspackaging. PrivatePGDBmigratedthrough009; oldrows/profile/sessions/questionsretained. Ownerenrollment0verifiedviaactualbootstrap.userId, clockneverstarted. ExistingQAcourse digest8563...56episodes/3visuals/6code, savedreading1, memoryrevision3, questioncount1, assistantmessages0. Jobsstill1supervisor/1companionwaiting; sharedbudget/providerconfigurationmissing. No paidcalls/fakeanswers.
- REAL nativeautomaticrecoverydrill PASSED: authenticatedmanagedinstance1eed..., killedONLYitsverifiedAPIchild83050; controller83033gracefullystoppedgroup withfailure; launchdbackoff restartedcontroller84615/all4services. Newinstancea461..., sameinstallationID. Verifiedsavedcourse/readcount/questionhash/messages throughREALauthenticatedQAHTTPafterrecovery. Receipts `.local/pilot/native-acceptance.json` and recovery-acceptance.json protected0600. Notjustfakefixture orworkflow-workerrestart.
- ActualRSSinitialnewFGsample allservices+controllerTOTAL851MiB (a commentarysplitmistakewascorrected). Lateridlesample services647+controller96=TOTAL743MiB; excludesPostgreSQL/browser/DockerVM. Heap/runtime targets API512MiB/worker384/dispatcher128/Go384,GOMAXPROCS2,concurrency2,dispatch2s,logs1MiB/3. NotaggregatehardRSSlimits; under-load/retentionmeasurementstillneededforfull24GBclaim.

## Actual backups / restoration

- Private `.local/pilot/backups/20261012230500445/` contains application.pgdump485494bytes, temporal.sqlite3712704bytes, receipt.json(withhashes), config-before-controller.json(SECRETserviceconfig;DONOTPRINT). Dir0700/files0600. OnlineSQLitebackupintegrity_check=ok. No wallet/otherDBbackup.
- ACTUALPGrestorerunintonew disposablecourse_core_test_restore_UUID withpg_restore--no-owner--no-privileges--exit-on-error. All41tables/49logicalrows matched source bysortedJSONhash. OwneddisposableDB droppedafterclosingconnections. Thisisactualrestoreproof, notintent. Reusablegenericbackup/export/restoreGUI/retentionstillnotimplemented; doNOTcallfulloperationscomplete.
- config/session/QA-cookie/CSRF/servicecredential files in`.local/pilot`remainprotected; nofulloutput. Useownservicecontroller, notlegacyPID file orstaleprocess handles. Googlecredentials/testbudgetquestions remainunanswered.

## Remaining full-scope gates

- Finishcandidateassembly/publication/privateconsumer; privateb239... candidate6visuals stillNOTdeployed, live8563...3visuals. Privateauthoring112taskdefinitions scriptSTILLpartial; no CLI/SDKregistryJSON/independentverificationcompleted. FinishandwirefreshrecoveryUI andtrustedapproval.
- PersistentmainAIsupervisor actualfullcoursegeneration/application/tools/subagents, learningdebugger hypotheses/transfer/retention, gradeconversational/rubric/activityevidence, optionalgeneratedcoverage/branches andwholepersonalepisodes (SDKschema mayneedextension), research/mediaactualinspection/review/attachment; currentlibraries/portsalone arenotfullproduct.
- Secureprovider/model/capability/budgetsettingsGUIandliveGoogletutoring/videoacceptance, contextualcompanion/toolretrievalandcontextusedGUI; deadline/retentiontimers, completed-courseQ&A behavior, learnerexports/deletion/retention/undo; genericbackupops; leastprivilegeappDBrole; source/license/bundlednoticefinalreview; otherbrowser/nativeJSbuildreadiness/physicalmobile; comprehensivev0.8requirement-by-requirementacceptance. Nativeappbinariesdeferred.
- PrivateGitHubCIbillingexternalblock stillunresolved; donotchangebilling orcopyprivatecoursetopublicCI. No impasse: meaningfullargeimplementationworkremains. GoalmustremainACTIVE untilactualfullscopepasses; donotredefinesuccessaroundcurrenttests/pilot.

# Latest continuation state — 2026-10-13 01:05 IDT

This section supersedes earlier ownership/status. Goal ACTIVE. Previous turn was PROGRESS: public release protocol and protections were implemented, real admin UI acceptance expanded, release failure diagnosed and corrected, lifecycle tests implemented. No blocked audit applies.

- All former subagents remain stopped; parent owns all files. Do not respawn them just to bypass their usage errors. Current core checkout main, HEAD `b411f687018b5aa306a2ab6978ff059e54796b9d`. Only `deploy/` is uncommitted/untracked.
- Core PR4 https://github.com/roeehrl/course-core/pull/4 MERGED after12/12 hostedCI gates. Merge/main commit `c3eb4282e676f0ccf19bef1a495ae5879fc25acf`. MainCI38312876096 passed. PR4 attached to this task. An accidental PR1 attachment was immediately removed; keep actual PR4/5.
- Core main is protected:12strict required checks, PRrequired (0external approvals), enforceadmins, linearhistory, conversationresolution, noforcepush/deletion. Future changes through PRs. Current12checknames are generated by scripts/release-artifacts.mjs requiredCiJobs().
- Old core9c CI38308853952 first failed solely on externalChrome HTTP2 download stall; failedjob rerun completedSUCCESS attempt2. New CI now installs matching Playwright Chromium; direct local browser runs use Chrome. Actual Chromium tests pass: learner3screen realPGflow,3directvisualcallbackcases,14adminmockbrowsers. Real admin/PGbrowser also passes9cases acrossphone/tablet/desktop and is now a mandatory API-job step. This gate found npmcachelogs in public inventory; .npm-cache nowignored, while release/audit stillreject logs/maps/privatepaths.
- Release protocol now COMMITTED onmain: .github/workflows/release.yml, scripts/release-artifacts.mjs andtests, RELEASES.md. Workflowread-only, tag/checkout/workflowSHA/remote-tag/CIattemptbound; source/runtime/web/standalonevisuals candidates; SHA/member/lock/provenance inventory; strict archives; isolated installedvisualstarballconsumer; actualrootSourcecompare againstGit tree; no publication/deployment byworkflow. Rootinfra tests44 passed atPR4 (15release tests).
- Standalone visual component actualimmutable-source consumerqualification PASS from9c: headless,ReactSSR,CSS,exports,types,no siblingreach; SHA c287a8065a1f464f267b1d3aa83d237ea2248630f625dcd6300acf2e6515b219. SDK0.2 URL/integritypinned. Reactpeer19.3, TypeScript5.9.3 pinnedfromlock. This result hasNOreleaseauthority and no tarballwaspublished.
- Existing immutable-intent coretag v0.1.0 points atc3eb428; releasecandidate workflow38313012221 FAILED during assembly becausefirst-party policy/providers lackedlicensefields. ALL12fullCI passedinside thatworkflow; Bindreleaseidentitypassed. Noassetsuploaded/published. DO NOTmove tagorclaim release. Failure was real guard, not a provider/billing blocker.
- FixinPR5 https://github.com/roeehrl/course-core/pull/5, attached: policy/providers declareApache2like root; modulepreflightrequireslicense; bounded diagnostic publicpackagename; coreversion0.1.1; standalonecomponents keepOWNversions (visuals stays0.1.0) so packagingfixdoesnotchange renderer identity. Source/runtime rootpackageversion anddependencylockbytes bound. Actual archives test verifiescore0.1.1 retainscomponent0.1.0 bytes.46rootinfratests (17release/graphregressions) andpublicaudit pass. PR5 MERGED afterall12passed atHEAD260b2333; mainmergecommit b411f687018b5aa306a2ab6978ff059e54796b9d. Currentcheckoutmain b411f68. Newv0.1.1tag/workflow dispatched: run38316349959 confirmedIN_PROGRESS at b411f687. Pollsamehandle; donotrestart ontimeout. Both PR4 and PR5 remain attached; no publication yet. Preserve failedv0.1.0tag.
- Keep11first-party modules: policy,providers,adaptation,research,example-courses,sandbox,visuals,api,supervisor,learner,admin. Dependency notices inventory preserves declaredlicenses/availabletexts; metadata-only packages explicit, not legalcertification. Packageartifactexactsource and installedconsumer qualification stillrequired. Do not skip missinglicenseguard.

## Lifecycle work (NEW, not deployed or committed yet)

- deploy/local haspilot.mjs,runtime.mjs,service.mjs,README.md,runtime.test.mjs. Parent fixedtaskqueuehandling: explicittemporalTaskQueue for existingdb required; freshqueue stable SHA256ofcanonicalstatepath; NOqueuechange perinstance/restart. VerifiedliveoldTemporalmetadata2workflows bothuse `course-core-pilot`. Preservethat inactualconfigmigration. Confighasnoqueuefieldyet; no configmigration thisturn.
- Defaults now Nodeheap targets API512MiB,worker384,dispatcher128;TemporalGo target384MiB,GOMAXPROCS2; workerconcurrency2,dispatch2s,logs1MiB/3backups. They areheap/runtime targets, NOThard aggregateRSSlimits. Actualmeasurement aftermigrationrequired. Newresource/configvalues strictlybounded; no arbitraryproviderENVinjection. Allsecrets stay APIserver protectedconfig; no credential output.
- 11lifecycle tests PASS (twice). Privatefiles/socket permissions/links, exclusivewrites/locks, realHMACUnixcontrol, legacyownerfailclosed, stablequeue/requiredexistingqueue, resource/envboundaries, metadata-onlyrotatinglogs, plistescaping/backoff, simulatedlaunchctl nooverwrite/modificationremoval, actual4CHILDPROCESSfixturestart/stop/restart/cleanup. Lastcase usesFAKEHTTP/worker services, NOTrealTemporal/PGoruserpilot; thisdistinctionmustremain. RootCIhasNOTregisteredthese yet. NativeLAUNCHDinstallation and actualsaved-course restartacceptance pending.
- Native foregroundLEGACY pilot stillLIVE:parent6480, children6486/6491/6535/6536, handle98425. Freshhealth200. Owner.json onlypid+startedAt; newcontroller intentionallyrejects legacy_or_unknown_owner, notdeadstate. VerifiedPS parentstart MonOct12 22:06:15, cmdnode deploy/local/pilot.mjs start. Needcoordinatedgracefulmigration usingknownowner/children checks; neverrestart onobservationtimeout. NoLaunchAgent installed.
- CurrentpilotDB onlythrough007; newAPI migrations008/009 notdeployed. Currentprivatepublishedrelease remains8563... (3visuals/6code). Nativeconfig/session/servicecredentials protected0600 in `.local/pilot`; doNOTprintthem. Lastverified viaactual bootstrap.userId: ownerenrollments0 (earlier subjectfilterwasnot authoritative; itwasrechecked correctly). QA2jobs waiting:supervisor1,companion1; nofakeanswers/paidcalls. Alllearnerstate unchangedbythisturn. ActualTemporalqueue metadata read only.

## Private course and next scope

- Previousprivatecandidateb239... all56episodes/6visuals/6code, developmentrenderer e16ff...,6assemblytests,384foundationframes+1110systemsframes/negativecontrols,15systems browsercases verified. StillNOTpublished/released-coreconsumption. Standalonecomponentversion0.1.0 intentionallyunchanged inPR5; avoidrebindinghash merelyforcorepackagingversion.
- Privateadaptation-authoring.py STILLpartial definitionsonly112taskdefinitions, noimplementedCLI/build/verify protocol; promisedJSON/reviewfiles missing. Finishrealmathematicalverification, properSDKauthorregistries, canonicalfamilycoverage andcoreapproval beforeclaimingadaptiveprivatecourse. No specificcoursecode/publicsourceleak.
- CoreAI pipeline stillneeds actualsupervisor-to-generatedcontent/application, fresh-recoveryUI, fullconstraintcontext (currentteachingconstraints onlydeadline/allowedbool/assessmentactive), semanticrubric/conversational/activityevaluation, research/mediareviewandattachment, securemodel/providerconfigGUI andliveproviderqualification. Optionalgeneratedblocks requirements-awarecoverage/UI remainsopen. Always-on deadline/retention timers, export/restore/retention, resource/RSS measurement, leastprivilegeappDBrole, fullobservability, otherbrowser/nativebuild-readiness acceptance remainopen. Preservefullv0.8scope; nofakecompletion.
- FinishPR5/fulltagcandidateproof andimmutablecomponentrelease; thenprivateconsumer installs exactGitHubreleaseURL andrerunsmath/visual/practicaltests withoutdevelopmentfileURL. FinishlifecycleCI/nativeprivatepilotrestart/backups/queuepreservation; thenpersistapp asownedservice. NoSN9/mining/wallet/secret/payout actions.
- Googlecredentials andexplicitpaidtestbudget questions remainunanswered; no paidcalls. PrivateGitHubCIbilling stillblocked externally; donot alterbilling or publishprivatecourse to publicCI. Meaningfulimplementationwork remains, so goalstaysACTIVE, notblocked.

# Latest continuation state — 2026-10-13 00:12 IDT

This section supersedes earlier status and ownership. Goal ACTIVE. This continuation made concrete progress; it is not a blocked goal turn.

- Core main is now `9c574235aeaa13695fce6f1a12b286ea6a12a42a`, committed and pushed. Hosted CI run `38308853952` is in progress with 12 jobs. Earlier exact a7c661a CI run38296568537 completed SUCCESS. Current public registry includes adaptation, research and example-courses (11 modules). Root audit and29 infrastructure tests pass. No immutable core release yet.
- All six subagents have stopped. Sagan completed transactional adaptation; the other five hit account usage limits while their final modules were partly written. Parent now owns ALL files. Do not assume partial agent code is qualified. No new agents required.
- Current API typecheck/build and ALL200 tests pass, including20 real PostgreSQL adaptation tests and2 actual companion/interactive-context transaction tests. Production createServer now registers adaptation routes; repository.loadEnrollment resolves applied delivery views while retaining immutable base digest. Pool-based reads use one transaction connection. Adaptation tests now use production server composition, not separately registered test routes. Generated variants grade through production answers, preserve canonical family, keep existing evidence, and cannot invent extra-family credit. Optional-only objectives remain metered but are excluded from required core objectives unless critical.
- Learner memory wired into actual connected profile view. Manually clearing preferences wins over old enrollment pace/goal; identity-only edits cannot restore stale preferences. New migration009 adds manually_edited.15 real learner-model tests pass. Connected memory edit/reload/accessibility checks pass at phone/tablet/desktop sizes.
- Interactive illustrations emit bounded state/fingerprint/time locally into a ref (no per-frame networking or lesson-wide state updates). Explicit companion sends attach current scoped frame; server authenticates/recomputes it, stores semantic context on message, and keeps rich data out of outbox/Temporal. teachingContext loads effective course and stored scoped illustration snapshot. No exploration grants evidence. Forged/stale/range/unknown context rolls back help-consent downgrades, message, revision and events. 200 API tests and95 learner tests pass. Real connected browser flow passes3 screen sizes including frame delivery. Direct component/browser callbacks pass after fixing test harness production JSX and properly waiting for async React state; expected values remain strict. Vite8.3.4 is now an explicit learner dev dependency.
- Research package now complete as bounded SOURCE INSPECTION library:23 tests pass, actual TLS loopback, DNS pinning/redirect/IP/size/timeout guards, readable worker extraction, separate author review, activation-only YouTube descriptor/fallback. Added README and fixed-source live diagnostic; actual MDN fetch succeeded (178518bytes/8684text chars), content stayed UNREVIEWED. Research source selection, durable dispatch and GUI review/attachment are NOT yet integrated into real course supervision.
- Combined actual Temporal+Postgres+HTTP supervised recovery gate rerun PASS:7scenarios,3synthetic modelcalls,1workerrestart,2lostacks,19replays,282decoded payloads,cleanupcomplete. No live Google/model quality claim.
- Three unrelated sample course packs are in public core and CI: number-line, Spanish greetings, plant journal. Pure6tests and validators pass. CI now runs actual HTTP/PostgreSQL example playthrough after API build. SDK0.1 examples remain backward-compatible while actual API consumes released0.2.
- Private assembly now includes all6 illustrations with one identical renderer declaration and rejects mismatched implementation hashes. Systems generator rebound to current built renderer e16ff7... only after using actual development artifact;1110CPU frames/9negative controls pass. Private6assemblytests and full56episode build pass. Parent reran384foundational visual checks/3negativecontrols and all15systems browser cases (320,390,700,834,1440px), with no measured overflow/overlap and two screenshots visually inspected. New candidate digest `b239348d2a585a305a5ec0faea3669e03e436c9f3c8e8ee35d486477fe834222`. This is a DEVELOPMENT candidate, not deployed/released-core consumption. Existing live release remains8563... with3visuals/6code assessments.

## Current pilot and unfinished files

- Legacy foreground pilot remains LIVE: parentPID6480, Temporal6486, API6491, worker6535, dispatcher6536; API health200 on4310. Live handle98425 from earlier turn. Do not stop merely because a tool observation ends. Existing app database is still only through007; no new migrations/deployment this continuation.
- Agent rewrote deploy/local/pilot.mjs and added runtime.mjs/service.mjs, but did not finish lifecycle tests/docs. These files are UNCOMMITTED and UNQUALIFIED. New controller deliberately rejects legacy owner.json containing onlypid/startedAt with legacy_or_unknown_owner. Therefore its status command is not proof pilot died. Old process/cwd/child ownership was verified read-only. Parent must coordinate graceful migration after qualification. Preserve existing Temporal task queue: new candidate derives a different queue from state path, potentially stranding old workflows. Resolve/migrate this BEFORE restart. Never print provider/service keys or entire config/owner/session contents.
- Uncommitted release.yml and scripts/release-artifacts.mjs are partial; release script ENDS after installedVisualsSmoke and lacks CLI orchestration. Workflow must not be dispatched/published as working. Finish exact-commit/tag/CI/asset verification, tests and RELEASES.md before committing/releasing.
- Private verification/adaptation-authoring.py is PARTIAL (definitions only; ends after choice14-04). Assigned content/adaptation-authoring.json, fresh-assessments.json and ADAPTATION_REVIEW.md were not created before agent limit. Finish independently checked generation/verification/author registries and full56episode/canonical family recovery coverage, then integrate assembler. Do not run its advertised --write/--verify as if implemented.
- All public private data boundaries preserved. Private repository visibility freshly verified PRIVATE. Public commit excludes deploy and release partial files. No secrets, wallets, worker changes or paid provider calls.

## Next required work

1. Inspect current hostedCI38308853952 and fix any failures; core protection/release still gated.
2. Finish private adaptive authoring and main supervisor application pipeline plus learner fresh-question recovery UI. Existing transactional store has trusted approval/staging hooks but no GUI registry approval/provider-to-content orchestration. Optional generated blocks still need requirements-aware coverage/UI; conversational/rubric/activity evaluators still missing.
3. Wire research/media candidate inspection, review and attachment, provider configuration/model capability/budget UI, secure credential setup, full scoped GUI observability and learner-model proposal ports into supervisor.
4. Qualify lifecycle/launchd manager, preserve Temporal queue and actual saved state during restart, app-specific DBrole/backups/restore/retention/export/security. Current old pilot stays up meanwhile.
5. Finish verified immutable core artifact release; consume it from private repo, rerun all numerical/visual/practical gates and deploy candidate through real admin routes. Private hostedCI remains externally blocked by GitHub billing; no billing changes authorized.
6. Real Google tutoring/video acceptance awaits secure user-configured credentials and explicit spending allowance. Pending deployment/budget questions remain unanswered; defaults are not approval. Full approvedv0.8 requirement-by-requirement acceptance remains open. Native mobile binaries remain deferred.

# Latest continuation state — 2026-10-12 22:18 IDT

This section supersedes older status/ownership below. Goal ACTIVE; substantial work remains. Previous goal turn made concrete progress.

- SDK0.2.0 RELEASED after181 tests and53-file packed checks on hostedNode24/26. PR https://github.com/roeehrl/course-sdk/pull/4 merged; commit040059e51a6cdc9371036ef3bdd9b506520cf413. Release run38291657006. Asset SHA2566ff7c6c2a48ffe268cabcd667ecb8a5dd7b95d1dbb260d6d7302716aaaa7c99f. API, visuals, learner and private course consume the released0.2URL. SDK worktree main is clean. PR attached to this task.
- Core source PUBLIC and pushed. Initial5502395d1fe257b50f155a23ecfb79f0fd407329, followup a7c661a7188f67e8817bcc550fb2f669b7317cd0. Initial hostedCI38293471770 passed API/Postgres+connectedbrowser, realDocker sandboxAMD64, policy/providers/supervisor/admin; visuals and learner failed. Diagnosed/fixed missing matching Playwright cache path and serialized libm1ulp differences. Motion demo now uses sin AST rather than baking Math.sin into JSON; equality staysstrict.26visual tests including altered-libm serialization regression pass; regeneratedlearner fixture,88learner tests and24browser tests pass. Followup CI38296568537 is in progress at exacta7c661a; anotherrunhead7c8035 appeared (inspectbranch ifneeded, do notassumeit ismain).
- Root full check passed all8 integratedmodules beforefollowup fixes. Publicaudit ofexactcommittedclone passed320files/8locks.29rootinfra tests pass. Fixed CLI entry detection throughfilesystemaliases with scripts/is-main.mjs. Subsequent fullCI is required beforecore release/protection.
- Parent integrated admin routes, ensureCatalog onimport and learner-model routes inrealserver. Removed admin harnessfallbackregistration so productioncompositionmustwork. WholeAPI111tests passed afterupdatingstale-course test to movean enrollment tonewimmutable release rather thanmutatingpublishedbytes.
- Combined supervised-flow nowPASSES: actualTemporal+Postgres+HTTP, syntheticexternalmodel,7scenarios,3fakecalls,1workerrestart,2lostacks,19historyreplays,282decodedpayloads,cleanedup. Fixedcompanion eventdecoder acceptingblockId:null anddowngradedChallengeIds; fixedtestequal tosemanticdeep equality(JSONBkeyorder). AddedAPI test:supervised andhostedCIgate. No liveGoogleclaim.
- Optional episode runtime now skipsoptionalunitswithoutcredit andkeepsrequiredpath/prerequisites. PolicyState optionalrequiredConceptIds distinguishesoptionalconceptmetering frommandatorymastery.48policytests and6learningtests passed. All-optional coursecurrentlyfailsCOURSE_REQUIRED_PATH_MISSING ratherthancreatingunusableenrollment. Furtheroptional-flow browser/anchorcasesremain.
- Private practicaloverlay isNOWassembled.6variants/3canonicalpracticalfamilies/92cases integrated intoexistingcapstoneepisodes. Affectedgates requireallauthoredcanonicalfamilies(3), onlyone codeblockperfamily; alternativesdon'tcounttwice.5privateassemblytests pass; sourcefragmentsarecloned(notmutated). Parentreran197FDchecks/32negativecontrols. All56episodespreserved.
- Private3visuals numericallyqualified384frames againstindependentPython; wrongreadout, wrongcurve andlinearchordregressionsrejected. Deliveryoverlayverifiedagainstauthoredscenes. Fixed visualSDKinterop(cueprose->cue-N andCamelCasecheckIDs->lowercase); currentrunningrenderer integrity sha256-e16ff7d93b320f12913f1c3bc5a7246c16d1ca09cc4cf8f1ba8a29d2cde2aa24. Reboundonlyafterassertingrunningimplementationmatchescandidateandrerunningqualification. Currentprivatecompiled digest8563cbe6b45d24e3b023596e8f31beb7dd1bf12e7df5d2fa4bc07dcc138424b9.

## Running private local pilot (NEW)

- http://127.0.0.1:4310, Temporal7239, nativeTemporalUI8239. OfficialTemporalCLI1.9.1 downloaded/checksummed in core/.local/bin. ArchiveSHA41e0425378fcb4fb5766340b97435e20fe47bbff2d7bf644ec2d51f7662b7c56.
- Parent-added deploy/local/pilot.mjs +README are localuncommitted. Commands start/status/stop; onlyownchildprocesses, loopback, exclusiveownerrecord/controlsocket, statepersists in core/.local/pilot. ServiceStatus isprocess/APIreadiness, notliveprovideracceptance.
- Currentlive exec session98425; doNOTrestart justbecauseobservationexpired. Statusconfirmedrunning22:18: TemporalPID6486, APIPID6491, workerPID6535, dispatcherPID6536. Stoponlythroughownpilotcontrolwhenneeded. NoLaunchAgentinstalledyet; durableOSservicemanagement/restartqualificationstillopen.
- Supervisor CLI nowhasdispatch-loop usingoneconnection and2secondpoll (uncommitted), workerconcurrency2. APIinstancehealthnoncepreventsacceptinganotherprocesshealth. API/supervisorcompiledbuildsused. Latestcode changesnotautomaticallydeployed; restartonlyafterbuild/verification.
- course_core_dev nowmigratedthrough007. Pilot configdatabaseURLhasexplicitlocalPGusername becauseenvironmentminimizationremovedUSER(defaultPGrolefailedfirststartup, nowfixed). App-specificleast-privilegeDBrole/hardeningstillopen. NootherDBs/servicesmodified.
- Protected files(core/.local/pilot):config.json(servicecredential;DONOTPRINT),bootstrap.json(ownerIDs/initialone-timelink),session.json(ownerAPIcookies/CSRF;DONOTPRINT),qa-session.json(QAcookies),qa-enrollment.json. All0600;state0700. NoGooglekey/providerconfig;sharedbudget0. Userdeployment/budgetquestionsstillunanswered. Localpilotwaschosenasreversibledefault;paidcallsremainunauthorized/unconfigured.
- Ownerworkspace adddd018-51ca-45b5-b694-cda32a7dc984. Privatecourse imported/reviewed/approved/published throughREALadminroutes:release8ffdfadd-a6fb-4654-a6df-902c60fcc11a,catalogb219561f-48fb-4cd3-989e-5aa0d636cf9a. All56episodes,3visuals,6codeassessments. Data remainsprivateDB;notwebbundle/publicrepo. RuntimecodeReady true.
- SeparateQAuser42a1c53d-8c2f-4083-bdca-d120d45e453e, enrollment48644ea7-6228-499f-a644-e9d2863ea34d. OnlyQAhasprogress. Ownerunenrolledverifiedbeforenewsigninlink. Do notmanufactureownerlearningprogress.
- ActualprivatefirstlessonandSVG rendereddesktop/phonewithnopageerrors. Screenshots core/.local/pilot/screenshots. Full-pagephonecapturetiledincorrectlyonresize; actualmobileviewportcapture private-visual-phone-viewport.png verifiedclearreadableSVG withbodywidth390. Do notuseearliertiledcaptureasproductproof. Diagramappearsaftermarkingfirsttextpartread (linearflow), notimmediately.
- ActualQAcompanionquestionprocessedbyPERSISTENTworker to waiting/configuration_missing. Noassistantanswerinvented. Noactualmodelcalls/costs. Queuedowneraccesspanelviaopen_in_codex;resultQUEUED,notconfirmedshown. Tokenexpires10min;regenwhenuserneedstoopen. Appwasnotautoenrolled.
- PrivateGitHubCIstillblockedbyaccountbilling. Do notchangebilling ormoveprivatematerialpublic. Sourceupdatesafter9cffstillneedcommit/push onceappropriate.

## Current exclusive ownership

1. Sagan01a130a4-7313-7e22-a5a9-420baeee9761: ONLYcore/packages/adaptation, usingRELEASEDSDK0.2. Pureverifiedadaptationplanning/applicationwithpolicyreservations,canonicalvariants,proofauthority,independentnumericalgeneration. SDKnowparent-owned.
2. Ramanujan01a130a4-7478-7d91-a609-001870eda747: ONLYcore/examples/courses,3unrelatedactualimportablecoursepacks+validation/scenariohelpers. Privatepracticalsnowparent-owned.
3. Galileo01a130c6-4304-7a63-bf97-b0e8675822fe: ONLYpackages/sandbox, APIauth.ts,test/auth-hardening.integration.test.ts forsecurityreview/fixes. Do NOTedittheseuntilhandoff. ParentownsSupervisor/bridge/qualification now.
4. Bernoulli01a130a4-73fa-7e80-9a70-6b39a288c526: ONLYnewlearnercomponents/LearnerMemoryPanel.tsx,client/memoryClient.ts,tests/memory.test.tsx. Parentmustwireafterreport. APIlearner-modelnowparent-ownedandregistered; providercontextincludesboundedmodelprojectionwithoutinternalIDs.
5. Herschel01a130c6-ba11-7f01-baf3-4307d6214e2f: ONLYprivate create-systems-visual-scenes.mjs,visuals/systems-scenes.json,content/systems-visuals.json,verification/systems-visuals.mjs,systems-visual-reference.py,visuals/SYSTEMS_VISUALS_REVIEW.md. Moreattention/pipeline/GPUillustrations. Existing3visuals/assembleruntouched. Learnerappnowparent-ownedexceptBernoulli's3newfiles.
6. Maxwell01a130a4-738d-77a2-b210-e27a15b453a8: CLOSED afteradminhandoff;mayresumeifneeded. Noactiveownership.

## Next actions

FinishhostedCIfixes/protectionandimmutablecoreartifactrelease; inspect/integratenewagentmodules; privateconsumerfinaldependenciesmustuseRELEASEDcoreinterfaces, notdevelopmentfileURLs. ImplementactualadaptiveDBapplication/newassessments andcourseauthoringcontracts, qualitative/rubrichandlers, researched/generatedmediareview, scopedsourceaccess, GUIlearner-memory wiring, context-awarevisualstate, providerconfig/credentialflow, retention/export/restore/security,OSpersistentruntimeandrestartproof,liveGoogleacceptancewhenuserconfigureskey/budget. CurrentlocalpilotisusefulbutNOTfullgoalcompletion.


---

# Implementation checkpoint

The approved Course Core v0.8 goal remains ACTIVE and incomplete. Native mobile binaries are deferred; responsive phone/tablet/widescreen web and future native-compatible contracts remain required. Do not interfere with the original mining research or workers.

## Repositories and release evidence

- Public SDK: /Users/tnt/git/course-sdk, https://github.com/roeehrl/course-sdk.
- Public core: /Users/tnt/git/course-core, https://github.com/roeehrl/course-core. Source is still local and uncommitted/unpushed.
- Private course: /Users/tnt/git/course-llms-and-models. Visibility reverified PRIVATE. First source commit 9cff06d2c474e2d463405c157e160dd811148557 is pushed. Later chapters, frozen evidence, practical and visual work remain uncommitted.
- SDK v0.1.0 is RELEASED from exact CI artifact run38271115306, commit c04d78b04216ccc5e7187f3ecb493cdc8c8f048b. Both Node24/26 CI jobs passed. Package SHA256 09915cce7f8ea64e17ba09f22869b187770966bb74c67f5796f4fe715ccf58bc. Distribution is GitHub release, not npm. Main protection requires both checks and PRs, forbids force-push/delete.
- SDK is now on branch codex/adaptive-teaching-contracts, owned by Sagan for upcoming0.2 work. Do not alter or release it until his report is reviewed.
- Private CI run38274708308 did not start any steps. GitHub annotation says recent account payments failed or spending limit needs increase. User was alerted; do not change billing or expose private course data through public CI. This is not a code-test failure.

## Pending user input

The user confirmed owner roeehrl, parallel agents, provider-neutral architecture and Google for their tutoring/video deployment. Two asynchronous questions remain unanswered: first deployment target (recommended private local Mac pilot), and live Google test spending limit ($10/$25/no paid calls). No key is configured. Do not treat the default selection as approval. No paid model calls have occurred.

## Current implementation and verified boundaries

SDK0.1: portable schema/types/semantic validation, compiler with protected server/learner split, CLI, CSP-safe build-time validator,42tests and installed-package checks passed locally and hosted on Node24/26.

Core policy:47 domain tests passed. Real API integration covers separate scope-assigned and scope-started clocks, immutable anchors, concurrent exact-consent extension grants, stale revisions, duplicates, rollback and explicit completed-course closure with coverage/mastery distinguished. Reading-before-cap bug fixed. Existing material remains readable according to policy; completion does not silently reopen new work.

API (services/api): Fastify/Postgres, scoped membership and cookie/CSRF, one-time sign-in code, release import/publish, enrollment, per-attempt question serving, deterministic answers, independent-family gates, assistance handling, placement, profile, events, policy/extension routes. No full answer bank in learner bootstrap. Replays return the persisted response. An injected storage error proves answer/evidence/revision/receipt rollback. Malformed JSON now returns400 without parser details. Code evaluation is wired through an installed, hash-matched trusted fixture registry. Rubric/conversational and generic activity handlers remain unavailable and fail publication; do not clear those gates without real implementations.

API parent tests last verified in subsets:19 DB/API tests,5 learning,2 publication,8 provider-runtime,2 gateway. Galileo reported45 additional real Postgres bridge tests. Whole-checkout verification remains required; other agents are changing separate modules.

Learner: original labeled demo is /demo. Default / is the real connected host. Previous verified state had26 learner tests,10 demo browser tests and3 connected real API/Postgres browser journeys on desktop/phone/tablet with axe and reflow checks. These are now being expanded/polished by Herschel. Parent added an actual SDK sorting visual to the maximum episode in services/api/browser/start.ts and an SVG assertion in browser/learner.spec.ts; re-run after learner export. Existing browser screenshots under services/api/test-results show the earlier functional UI, not the final polished one.

Admin: Maxwell initially delivered40 unit/component tests and12 production-build browser tests, then took ownership of actual API integration. Do not confuse the old demo pass with current connected acceptance.

Providers: neutral model registry/router/capability/job interfaces, separate Google adapter,53 mocked HTTP contract tests onNode24/26. Core provider-runtime.ts and provider-composition.ts dispatch a non-Google adapter without Google fields. Google structured-output responseFormat rechecked against current official docs. Runtime supports text/structured proposals/research/image/video submission/polling; live provider acceptance remains absent. Research now requires an explicit author-approved publicResearchTopic and sends no private learner profile/history; canary test passes. SDK0.2 authoring support is pending.

Supervisor: durable Temporal module initially passed36 unit/boundary and8 actual isolated Temporal tests with synthetic host/provider fixtures. API bridge004 implements real locking, leases, shared budgets, stored verification/application and membership revocation. Gateway005 enforces service/workspace scope, deduplication, fresh context and no hidden POST retries. Unknown price consumes reserved ceiling with explicit usageBasis; it is not labeled an invoice. Parent realPG/HTTP gateway test passes one-call/one-reply under duplicate requests, stale-profile denial, separate advisory boundary check and no grading credit. Full combined Temporal+PG+HTTP acceptance is Galileo's current task. No persistent worker or application deployment has started.

Companion requests are saved with current episode/block/profile/policy context and recent scoped evidence. In-app help during an independent attempt requires explicit switch-to-practice consent before dispatch. The advisory companion verifier checks format/scope, NOT factual truth/mastery. Structured teaching proposals are still reviewed proposals, not automatically applied course changes.

Sandbox: packages/sandbox,4 unit +5 REAL Docker tests passed on native LinuxARM64 in Colima. Correct/wrong/spoofed outputs, network/filesystem/environment separation,128MiB allocation limit, timeout/flood, cancellation and cross-instance admission checked. One execution per storage directory via broker.lock; separate create/start fences late starts; uncertain create/cleanup blocks new work. Runtime checks Linux isolation capabilities and native image architecture. Expected answers stay outside the container. API qualification/practical-flow.ts passes with real PostgreSQL+Docker: correct code earns one evidence record, wrong code fails, duplicate answer replays, hidden oracle never returned. Script: npm run test:practical with TEST_DATABASE_URL. API main supports trusted CODE_FIXTURE_FILES, SANDBOX_STORAGE_DIR and COURSE_SANDBOX_IMAGE. Private capstone integration still pending.

Image pins: ARM64 python@sha256:55432fc4ef6d07e33c10449312f0ec00071bbb310bb9bd7ba626a31fbbc2cb0d (downloaded/tested); AMD64 python@sha256:f040863673aea2570c3ff6a5c3fb4c673a016cbc5375005ad145915922b6b78a (hosted qualification pending). No GPU/device access.

Visuals: package has safe AST/scene/timeline/geometry, SVG UI and25 tests after a newly reproduced interop fix. Original9 browser tests passed before that fix; repeat relevant integration. toVisualExperience incorrectly used prose cue events and camelCase reference IDs incompatible with SDK. Fixed outer cues to cue-N, demos to sort-invariant/motion-finite, adapter rejects incompatible SDK IDs. Added actual whole-course validation/compile test. Parent's svgRenderer() fingerprints installed implementation and validates structural snapshots, not scientific truth. Learner copied dependency must be refreshed after package changes.

## Private course status

All14 base chapters/56episodes are authored. Parent reran independent CPU checks: foundations396 assertions/288 gradient comparisons/3 broken engines; training306 assertions/11 bad variants; systems295 assertions/17 bad variants; engineering19tests/111 finite-difference components/32 bad variants. Optional PyTorch/MLX examples are syntax-checked, not executed.31 immutable private source snapshots (667943bytes) under evidence/ with original SHA matches; verification no longer needs the live mine checkout.

Private assembly consumes released SDK0.1.0. Full authored bundle is explicitly distinct from full implementation. Source policy defaults are90days UTC, finite additional work,30 extension days with consent; not a claim the learner chose them. Start/enrollment UI must disclose the policy before starting a clock.

Parent authored3 interactive scenes: affine forward, gradient update, tensor strides. Files scripts/create-visual-scenes.mjs, visuals/scenes.json, content/visuals.json; assembly now inserts them at explicit lesson anchors.384 numerical reference frames checked against independent Python finite differences / explicit transpose matrix, including negative controls. A real animation bug (linear chord instead of actual loss curve) was fixed. verification/visuals.mjs compares the DELIVERED overlay to authored scenes to reject stale packaging, then checks outputs/intermediate frames. It currently needs explicit development artifact URL; do not claim released-core consumption yet.

Current visual renderer integrity: sha256-ad3af44b827ac606e8d8d74d91ff09c664870fa9ed145602e3c282d85e613e30. Regenerate overlay after renderer changes. Parent's latest assembly test4passed and bundle digest f0ac43d6a4d9204d68b1f43c67314c0f8edf11f41e5e49eadeb75c87ef679cc5 before practical overlay. Latest visual verification cell still needs its completion output if not already read. Visual browser QA remains open.

## Exclusive agent ownership (current)

- Sagan 01a130a4-7313-7e22-a5a9-420baeee9761: course-sdk entire repo on codex/adaptive-teaching-contracts. Additive verified-adaptation contracts/helpers/negative tests, approved public research topics, optional episode declaration, bundled license review. No agent commit/push/release. Parent reviews, PR/CI, publishes exact artifact and updates consumers.
- Ramanujan 01a130a4-7478-7d91-a609-001870eda747: private runtime/code-fixtures.json, runtime/code-reference.py, verification/practicals.py, content/practicals.json/review only. Three capstones, >=2 distinct variants per practical family, existing episode bindings. Parent assembles and integrates.
- Maxwell 01a130a4-738d-77a2-b210-e27a15b453a8: apps/admin plus API admin-routes.ts, migrations/006_admin_catalog.sql, test/admin.integration.test.ts. Real admin integration and tests. Parent registers routes/helper after report. Earlier synthetic credential audit issue is now resolved; last public audit passed309 files/8 locks.
- Herschel 01a130c6-ba11-7f01-baf3-4307d6214e2f: apps/learner only. Responsive linear polish, mobile companion drawer, real persisted companion, visual/media/source rendering, code editor, upfront policy disclosure and extension/closure views. Parent must not edit this directory until handoff. Notified about visual adapter interop fixes and Metro single React instance.
- Galileo 01a130c6-4304-7a63-bf97-b0e8675822fe: API qualification/supervised-flow.ts and qualification/SUPERVISED_ACCEPTANCE.md only. Combined actual Temporal+PG+HTTP+fake-model qualification; no persistent daemon. API dev deps for Temporal1.24 installed by parent. Earlier bridge ownership is now parent-owned.
- Bernoulli 01a130a4-73fa-7e80-9a70-6b39a288c526: API learner-model.ts, migrations/007_learner_model.sql, test/learner-model.integration.test.ts only. Evidence-derived learner state, editable/disputed inference memory, bounded scoped history. Parent registers routes/includes in provider context after report.

Parent owns core root (CI agent completed28 infra tests), API other files/migrations005, sandbox, visuals package, deployment, private assembly/evidence/visual files. Avoid overlapping active ownership.

## Local infrastructure and next gates

Node26.9, PostgreSQL17.11. course_core_dev was created; only initial migration was applied permanently so far. Tests now use dedicated postgresql://tnt@127.0.0.1:5432/course_core_test_parent with unique disposable schemas; unset DATABASE_URL for tests. Docker client29.8.1/server29.5.2 viaColima; buildx absent, manifest inspect works. No daemon/service deployment yet.

Next: integrate reports and run full clean dependency graph checks; complete actual UI/browser/private visual/practical acceptance; commit/push core and run hosted CI; review/release SDK0.2 and consume immutable releases; implement verified adaptive application and novel assessments, rubric/other activity handlers, research/media review and source resolution, full learner memory/GUI/debug, persistent local/hosted deployment, data security/retention/restore and real Google acceptance. Need three unrelated course consumers, not merely isolated schemas. Native binaries deferred. Never call the whole goal complete from component/mock passes. Original mining checkout is untouched.
