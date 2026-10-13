# Course platform implementation handoff

Verified 13 October 2026, approximately 22:31 Asia/Jerusalem (19:31 UTC).
This is a continuation of the user's approved end-to-end implementation, not a
new design proposal. The full objective is incomplete. The previous Codex goal
reports paused; leave it paused during transfer and avoid competing implementers.

## Portable orientation

Do not assume any prior absolute path, operating system, installed dependency,
browser, native service, secret, test database or ignored `.local` file exists.
Choose a workspace on the destination host. Reuse suitable existing checkouts
after inspecting their changes, or clone these exact repositories:

| Repository | Visibility | Checkout to continue |
| --- | --- | --- |
| https://github.com/roeehrl/course-core.git | Public | `codex/course-catalogue-default`, PR26 |
| https://github.com/roeehrl/course-sdk.git | Public | `main`, released SDK0.2.0 |
| https://github.com/roeehrl/course-llms-and-models.git | PRIVATE | Latest `main`, including this handoff |

Example fresh setup (choose the value, do not copy an old machine path):

```sh
COURSE_WORKSPACE="$PWD/course-platform"
mkdir -p "$COURSE_WORKSPACE"
gh repo clone roeehrl/course-core "$COURSE_WORKSPACE/course-core"
gh repo clone roeehrl/course-sdk "$COURSE_WORKSPACE/course-sdk"
gh repo clone roeehrl/course-llms-and-models "$COURSE_WORKSPACE/course-llms-and-models"
```

Only clone missing repositories. Verify remotes and PRIVATE visibility of the
course repository. In each checkout first run `git status`, `git log -3 --oneline`
and `git diff --stat`. Preserve other people's edits; do not reset or blanket-stage.
The user has withdrawn the earlier chat-provided AGENTS instructions; do not
carry the old Mine/SN9 instruction block into this project. Resolve applicable
repository guidance against the current human instructions.

Read, in this order, relative to the PRIVATE course repository:

1. `planning/HANDOFF_TO_CLAUDE_CODE.md` (this file).
2. `planning/design.html` — approved v0.8, the full acceptance contract. Its SHA256
   matches the approved original: `e21793413d0b6bf6ea924272ead866410a2d68f0d60465853fcf6398a8e69f3d`.
3. `planning/ACCEPTANCE_MATRIX.md` and the newest entry of
   `planning/IMPLEMENTATION_STATUS.md`. Older entries are historical snapshots;
   do not restart completed work because an older paragraph says it is pending.
4. `planning/WORKED_EXAMPLES.md`, `planning/GOOGLE_SUBSCRIPTION_ACCESS_2026-10-13.md`,
   `evidence/course-0.1.4-acceptance.json`, and the public repositories' READMEs.

The approved design's linked standalone HTML mockups now live beside it in
`planning/`: roadmap, universal/mobile/placement/debug, guided lesson, policy
administration and original workbench. They are design prototypes, not proof of
implemented features. No absolute-path preview checker is required.

## Full objective and standing decisions

Implement and VERIFY the whole approved platform phase by phase: public generic
Core and SDK; private original 14-chapter/56-episode LLM course consumed through
released public interfaces; persistent AI supervisor with tools to reshape the
teaching experience; always-contextual companion; learner-editable profile;
independently verified activities/assessments/visuals; research/media generation;
clear linear learning with understanding gates and a beautiful roadmap; admin
and debug observability; robust privacy, security, recovery, CI and real usable
deployment. Robust responsive phone/tablet/widescreen web and future native
compatibility are mandatory. Actual iOS/Android binaries are explicitly deferred.

The user is technically experienced in low-level software but new to AI. Do not
reduce the course to terminology, generic Q&A or a lesson player. Teaching must
build and assess deep understanding and adapt from mistakes and questions.

Course/chapter/episode caps, deadlines and optional finite extension allowances
must constrain the supervisor. Optional infinite remediation is an explicit
admin/course choice; it must not happen accidentally. Optional admin-enabled
placement may justify skipping knowledge already demonstrated. The SDK should
give creators extensive strategy/tool/activity/visual/agent-role control while
Core stays course-agnostic. Dynamic animations/illustrations and mobile UX matter.

User authorized implementation, commits/pushes, public PRs/merges/releases and
local course-platform deployment. Do not seek repetitive approval for that work.
Do not publish private course/fleet/learner data to public repos. Do not interfere
with unrelated mining/SN9 research, GPUs, remote Macs, wallets, payouts, passwords,
sudo, tokens or Discord. Do not add model/agent attribution to commits/files.
Do not send external messages. Financial/billing changes and secret transfers
are not authorized by silence. Prior permission for parallel work does not
justify resuming agents closed because of usage exhaustion.

Providers are agnostic. The user personally intends Google tutoring and video.
Generic subscription adapters and user-opt-in automatic paid fallback are
required and implemented at the framework level. There is no working Google
consumer-subscription connector. Do not wrap consumer CLIs or conflate developer
API credits with a supported consumer subscription backend.

A question asking the user to configure credentials/models and an explicit
allowance securely in the admin UI was already sent. Do not ask for secrets in
chat, resend the same question automatically, or treat silence as a paid budget.
Fresh prior-host setup observed credentials0, roles0, workspace allowances0.
Recheck on the destination; that old observation is not its configuration.

## Exact Git and release state

All three checkouts were clean and pushed at handoff preparation.

- Core feature HEAD: `4cae6ab52c82d3ebb56a412dbb177e68fd26aeab`, root version0.1.19.
  PR26 https://github.com/roeehrl/course-core/pull/26 is OPEN, not merged/released/
  deployed. Hosted run https://github.com/roeehrl/course-core/actions/runs/38454055282
  is COMPLETED/SUCCESS and ALL12required jobs passed for this exact HEAD. This
  supersedes the last implementation-status entry saying11/12 and in progress.
- Core main as last verified: `dea1d259d3d476e7ea70030371b30c0c2d6d2b96`, root0.1.18,
  merged research PR25. It is source-only, not a published/installed release.
- Last published AND installed Core is0.1.17, commit
  `74e60f4c9b1f5116f6e5984185c23cb64cbf8dc8`:
  https://github.com/roeehrl/course-core/releases/tag/v0.1.17
- SDK main/release0.2.0: `040059e51a6cdc9371036ef3bdd9b506520cf413`:
  https://github.com/roeehrl/course-sdk/releases/tag/v0.2.0
- Private source main before this handoff commit:
  `6a899ff6db0380edb0d215d4325488acb0609e47`. Use latest remote main to obtain
  this document/mockups. The published private0.1.4 package is intentionally bound
  to source `4d370672251aa7367667e3122f8373e46a2ce61c`, not subsequent documentation.

Private course0.1.4 is genuinely published and installed on the previous host:
https://github.com/roeehrl/course-llms-and-models/releases/tag/course-v0.1.4
Asset `course-v0.1.4.tgz`:840705bytes, SHA256
`8a40b0ae76a8f1dd9d49354d1cd69a273479019e90d88b1cafb72e07878c8a47`.
Course digest `bf54e1289f1fda0c49c4a7d1ac4525376be5c666a0d08e8394021da38af669bb`.
The package includes server/learner/compiled bundles, adaptation registry, the
isolated verifier and three qualified practical fixture registries. All content
and graders are PRIVATE. Hosted downloads were compared byte for byte.

`scripts/package-worked-course.mjs` builds exclusively into a fresh private
directory from clean committed source. `verifyWorkedPackage()` rejects changed
bytes, wrong member identities and private-file/symlink replacements. Do not
overwrite an already qualified package to give it a new provenance identity.

## What is implemented and proved

Installed Core0.1.17 includes responsive linear lessons/roadmap, server grading
and gates, saved drafts and recovery, durable Postgres/outbox/Temporal jobs,
bounded supervisor tools and independent teaching verification/check-repair,
contextual companion/history, learner-model proposals/edit/correct/dispute,
conservative budgets, encrypted provider setup and subscription/fallback controls.

Private0.1.4 retains14chapters/56episodes, original assessments/gates/policy,
115recovery profiles and adds39optional three-minute worked-example profiles:
154profiles total. Numerical examples have a deliberately bounded Markdown
grammar. Producer uses released SDK expressions; verifier uses independent
procedural references/finite differences.1654CPUchecks across39topics and172
real isolated broker cases passed. Entire arithmetic grammar is checked, not
arbitrary generated prose or pedagogical effectiveness. The other17episodes
are not cleared for novel teaching by this math package.

Released Core0.1.17 actual Postgres/HTTP/Python integration rejected a wrong
generated draft, repaired it, delivered the correct example once and replayed
the same receipt without granting mastery or relaxing gates. Model responses
were SCRIPTED.39profiles were installed on the prior native runtime; no real
Google generation has been qualified.

Full private0.1.4 HTTP56/phone-browser56 acceptance passed; desktop/tablet16 each;
all3practical families recovered,6recovery assignments, unearned completion
rejected every episode, exhausted banks without extra charges. Actual native
phone enrollment and first-episode grading passed; tablet/desktop resumed that
same saved QA enrollment. Accessibility/nooverflow/0pageerrors passed. Original
three enrollments/pins/progress/evidence/plans/policies were preserved. The
operator stayed UNENROLLED (do not start the real learner clock as a test).

PR26 closes repeated historical course cards: one selected published release
per course; publish selects it; admin may reversibly select an older published
version. No enrollment pins/evidence/windows are rewritten. Migration015
backfills previous catalogues. Catalog-first locks, scoped FK, fresh runtime/
digest validation, revision/idempotency/audit gates and rollback are exercised.
`GET .../courses` now returns selected releases; staff may explicitly request
`?includeHistorical=true`. Draft visibility remains role-restricted. Explicit
historical enrollment and staff assignment remain supported.

PR26 local evidence:285API tests,54admin tests,typechecks,7realPG catalogue cases,
21connected learner browser scenarios and real admin publication/older-release
selection/reload on3viewports. All12hosted checks subsequently passed.

Merged PR25 collects approved immutable public-topic research through distinct
durable jobs, with consent/budget/deadline fences. Output is UNREVIEWED and grants
no lesson use, source rights or mastery. Its public-query projection excludes
private learner context. Package `packages/research` already implements bounded
public-IP/pinned-TLS inspection and content/rights review primitives. A real
fixed-source MDN inspection passed at handoff time; it is unreviewed package-level
evidence, NOT completion of the integrated research/media pipeline.

## Runtime and files that do NOT travel with Git

Prior host was macOS tnt-studio. Only on that host, last verified pilot origin was
http://127.0.0.1:4310/ (admin `/admin/`), Core0.1.17, all4services running. Owned
installation `e279b724-ecfb-4f7a-8d6c-8752add9ccf8`, instance
`d91ca8d0-e018-4725-8c13-9c220d2eb82d`. Treat these as historical IDs, not authority
to stop a destination process. Discover actual roots/state/manager ownership.

The prior pinned runtime lived under the host user's Library/Application Support
Course Core/Pilot/releases/v0.1.17/course-core; state was in that Core checkout's
ignored `.local/pilot`. Those are descriptors, not mandatory paths. The pilot has
4QA enrollments (old completed16/1/0 plus new0.1.4 completed1); real operator0.
Native launchd management is macOS-only; Linux should use the supported foreground
launcher or implement/qualify the appropriate owner-bound service adapter.

Ignored dependencies, databases, sessions/cookies, configs, vault key/credentials,
backups, exported bundles, sandbox state, screenshots and transient verification
scripts ARE NOT in a fresh clone. Their absence on a new host is normal. This
handoff intentionally does not transfer secrets or live learner data.

Prior consistent stopped-pilot backup `v17-20261013185922670` was restored into
a NEW owned disposable database successfully. Provider key was included privately.
Never commit/copy/print that key or config to recover state. Migrating actual
saved state to another host requires a separately authorized secure transfer;
do not fake preservation by creating a fresh empty database.

Portable committed acceptance drivers/reference data and the published private
package suffice to reconstruct development/test environments. Native historical
receipts are summarized in `evidence/course-0.1.4-acceptance.json`; detailed raw
logs/private screenshots were ignored on the previous host. Do not claim those
logs are available after clone or claim to have rerun their tests.

## Destination bootstrap and meaningful verification

Require Node26, locked dependencies, PostgreSQL17 in an explicitly disposable
test database, prepared architecture-correct digest-pinned Python Docker image
and Playwright browsers. Install only the modules needed; no GPU/local model is
required. A missing dependency is a setup task, not permission to mock the gate.
Use the public orchestrator (`scripts/orchestrate.mjs`) and current module READMEs.

Private authoring starts with `npm ci --ignore-scripts`, `npm test`, `npm run build`
and the `verify:math`, `verify:practicals`, `verify:recovery`, `verify:visuals` and
`verify:worked` commands. Baseline `build` emits0.1.3;0.1.4 is composed by
`scripts/stage-worked-examples.mjs`/`package-worked-course.mjs`. Do not mistake
baseline authoring output for the installed0.1.4 package.

For released-interface tests, download all Core0.1.17 GitHub release assets and
verify `SHA256SUMS` plus pinned release identity before safe extraction. Combine
source/runtime under a chosen private runtime root; learner/admin tar members
overlay `apps/learner/dist` and `apps/admin/dist` respectively (their archive
prefix is `course-core/`, not the full app path). Install via that extracted
runtime's orchestrator. Preserve exact published web exports if installation
regenerates them. `verification/released-runtime.mjs` independently checks
1105declaredmembers/640unique files, immutable source/tag/CI/manifest identity.

Core0.1.17 manifest SHA256:
`25a358dbf66c2532af7a98505949b833a8ffb0197e7ffc96a6827e5a947e2906`.
Runtime tar SHA256:
`087bc7737990db41d42671a67679ac0ae20a9a66500a7754c8cce263057003bd`.
SDK0.2.0 tar SHA256:
`6ff7c6c2a48ffe268cabcd667ecb8a5dd7b95d1dbb260d6d7302716aaaa7c99f`.

From the private checkout, substituting YOUR verified runtime/assets directories:

```sh
TEST_DATABASE_URL=postgresql://127.0.0.1/course_core_test_handoff \
node verification/learner-flow.mjs \
  --runtime-dir "$VERIFIED_CORE_RUNTIME" --release-dir "$CORE_RELEASE_ASSETS" \
  --worked-course
```

Repeat with `--browser --worked-course` for the responsive full path if a new
release/environment change warrants requalification. Do not set DATABASE_URL to
production for these tests; drivers reject that. Avoid duplicate running tests.
`worked-example-flow.mjs` currently locates Core0.1.17 under private ignored
directories relative to the checkout. Populate those verified directories or
make its path interface portable, without silently importing sibling development
Core code. The broker driver deliberately pins older Core0.1.10; its receipt is
distinct from0.1.17 integrated acceptance. Never weaken identity checks to reuse
an arbitrary build. Private hosted CI had a billing restriction; recheck current
account state without changing billing or making the course public.

## Next actions and remaining complete scope

1. Re-fetch/recheck PR26 exact HEAD and all12live checks. It is already green;
   don't rerun/restart it just because old notes say pending. Review any remaining
   source issues, then merge the exact qualified40SHA using `--match-head-commit`.
   Preserve protected main (strict12checks, PR/admin enforcement, linear history;
   no force push or deletion). Attach created PRs when the destination has that
   capability; otherwise retain their links. Do not invent a plugin-only step.
2. Release the updated Core (root0.1.19 candidate) through the existing immutable
   tag/full-CI/artifact pipeline. `release.yml` is dispatched FROM the exact tag
   with its40SHA. Successful PR CI is not the release workflow gate. Verify archive
   members/licenses/source/lock identity and hosted downloaded bytes before
   publication; independently verify released consumption afterward.
3. Qualify installed catalogue/research increments on the actual intended host,
   preserving existing state if there is any. Use owned graceful stop, confirm
   stopped, consistent backup, new disposable restore/key-custody checks, exact
   release pin and native/HTTP/browser acceptance. Don't deploy source checkout
   binaries or treat process health as provider/learning acceptance.
4. Connect actual source inspection/relevance/rights/provenance review to the
   research queue, approved accessible YouTube/media attachment, expiry/revocation
   and scoped admin/debug GUI. Follow current official provider docs and the
   existing bounded SSRF/DNS/redirect/size/deadline primitives. Search remains
   public-topic-only; arbitrary private learner context must not become queries.
5. Expand creator SDK/supervisor role/tool strategies, rich verified activities,
   responsive animations/illustrations, whole remedial episodes and advanced
   branches, with learner-visible changes/undo.39math examples are not the whole
   requested adaptive-teaching moat. More than6illustrations across56episodes is
   still needed. Keep RAM, concurrency, payload/history and sandbox use bounded,
   especially on24GB machines; heap targets are not aggregate RSS guarantees.
6. Complete optional placement enabled/disabled/declined/interrupted journeys,
   rubric/conversation/transfer/retention assessment, deadline/retention wakeups,
   scope impact/caps/extensions/accommodations/revocation/refund behavior and
   completed-course Q&A. Add meaningful negative/system/user-path tests.
7. Finish admin backup/restore/export/delete/retention/undo, least-privilege DB
   operation, isolation/load/resource review, other-browser/physical-device/native
   compatibility checks, and requirement-by-requirement approvedv0.8 audit.
8. After user-secured provider configuration and explicit allowance, prove REAL
   Google tutoring/supervision/research/media generation, capability/cost accounting
   and learning acceptance. Scripted model/browser/math success does not prove
   educational efficacy or actual provider support. Do not mark the goal complete
   until the entire approved objective is actually delivered and verified.

Failed immutable Core tags0.1.7,0.1.9 and0.1.15 were retained unpublished. Do not
retag them, rewrite failed snapshots or retry unchanged failures. Use fresh
versions after fixes. Preserve live process/workflow IDs through observation
timeouts; missing logs or a timeout does not establish terminal failure. The
previous agents were closed after usage failures; do not resume them to evade
that boundary. Keep progress updates concise and current, with implementation,
local testing, hosted CI, merge, release, deployment and live learning distinct.

Proceed autonomously within the approved scope. No new design approval is needed.
Do not redefine completion around the working pilot or a smaller safe milestone.
