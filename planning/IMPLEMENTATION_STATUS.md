# Implementation checkpoint

Goal: implement the approved v0.8 platform and private course end to end. Active; not complete.

## Scope update from approval

The user approved implementation on 2026-10-12 and explicitly deferred mobile apps. Build the responsive mobile/tablet/widescreen web product now, preserving headless contracts, platform capability declarations and future native compatibility. Native binaries and store submission are not completion gates for this run. All other approved requirements remain in scope.

## Repositories

- Local public-intended SDK: `/Users/tnt/git/course-sdk`
- Local public-intended core: `/Users/tnt/git/course-core`
- Local private course: `/Users/tnt/git/course-llms-and-models`
- GitHub owner confirmed: roeehrl. Repositories created and visibility verified: course-sdk PUBLIC, course-core PUBLIC, course-llms-and-models PRIVATE. SDK source pushed at c04d78b04216ccc5e7187f3ecb493cdc8c8f048b; core/private not yet pushed.

## Current phase

M1 SDK released; M2 database-backed learning slice in progress. This is not a deployed complete product.

### Latest integration checkpoint (2026-10-12 19:00 IDT)

- SDK v0.1.0 public release is verified; main branch protection is enabled with both Node24/26 checks, PRs and no force-push/delete. SDK remains the only pushed source repository.
- API now has 23 passing tests, including real PostgreSQL races/rollback. Mandatory uninstalled evaluators/renderers block publication. API can serve the built learner under the same authenticated origin with CSP.
- Connected learner is the default `/` entrypoint; the original explicitly labeled public demo is `/demo`. 26 learner unit/component/client tests pass. Existing10 demo browser tests pass. Real connected lesson browser tests pass on desktop, phone and tablet (3 tests), including WCAG AA automated checks, viewport reflow, reload during an issued question, two independent checks, next-gate opening and sign-out. Screenshots are under core/services/api/test-results.
- Connected UI is an early functional integration, not final UX: mobile companion is currently below the lesson instead of an always-available drawer; duplicate navigation and excessive top whitespace need polishing; learner wording must replace internal 'evidence families' language. Companion is explicitly pending; it does not fake live responses. Private course visuals are not integrated yet.
- Private course now assembles 8 chapters/32 episodes with the released SDK using explicit `build:preview`. Full build intentionally requires14/56. Parent reran foundation396 arithmetic/gradient assertions with3 rejected broken engines; training/transformer306 assertions with11 rejected bugvariants. Optional PyTorch/MLX snippets were syntax-checked, not run. Portable verification scripts now in private verification/; root private package/build/tests exist. Pilot policy defaults are visible90days/UTC, finite additional work,30extensiondays with consent; not a claim of learner-selected deadline.
- Temporal module services/supervisor completed36 unit/boundary +8 actual isolated Temporal integration tests (agent report; host/provider fixtures synthetic). Parent integration pending. Its agent now owns API supervisor bridge/migration004/tests.
- New visual agent Herschel 01a130c6-ba11-7f01-baf3-4307d6214e2f owns core/packages/visuals only.
- Galileo 01a130c6-4304-7a63-bf97-b0e8675822fe owns core/services/api/src/supervisor-bridge.ts, migrations/004_supervisor_runtime.sql and test/supervisor-bridge.integration.test.ts only (plus bridge-contract clarifications). Parent owns server registration, real provider gateway and UI connections. API dependency on local @course-core/supervisor added.
- Ramanujan now owns private systems-and-distribution fragment/review (chapters09–11). Prior chapters05–08 are complete.
- Maxwell was corrected to distinguish actual course/chapter/episode calendar/work caps from tool budgets; still owns admin only. Sagan was corrected to keep registry/job contracts neutral and put Google-specific config in its adapter; still owns providers only.
- User has pending asynchronous choices for first deployment (recommended private local Mac pilot) and live Google test spending ceiling ($10/$25/no paid calls). No reply yet; no paid calls or credential discovery attempted. Continue independent implementation. Live acceptance still needs securely configured credentials and a spending limit.

### Important remaining engineering gates

Transactional host bridge, real provider gateway/credential config, shared usage budgets, always-on service deployment, live contextual companion, verified adaptive activities and novel questions, admin backend integration, correct scope-assigned versus scope-started window activation, learner policy/extension displays, full56episodes and practical graders, rich visual integration, researched/YouTube/generated-media verification, private source resolution, three unrelated generic course packs, real retention/privacy/backup/restore/security and hosted core/private CI. Existing baseline evidence is tied to immutable course digest; adaptation must preserve unaffected objective evidence rather than blindly changing the digest and invalidating everything. No model output may directly grant mastery. No live worker changes.

The original mining checkout has many unrelated active changes and is not an implementation target.

## Outstanding setup choices

- Provider-neutral architecture confirmed. User will use Google for tutoring and video; capability adapters must support other users/providers. Secure API credentials still need configuration before live integration acceptance.
- Parallel coding agents explicitly authorized.

## Available local infrastructure

Node 26.9.0 and pnpm 11.22.0. PostgreSQL 17.11 and Docker are running. A new isolated course_core_dev database was created. Initial migration applied; subsequent migrations run in isolated test schemas and still need applying to the development database. No existing services/databases were modified.

## Remaining phases

M1 foundations; M2 real web vertical slice; M3 persistent generative supervision/research/media; M4 complete private course; M5 security/privacy/recovery/observability/CI and deployment hardening; M6 actual usable end-to-end acceptance and pilot evidence.

Completion requires actual artifact/deployment and integration evidence, not only unit tests or mockups.


## Verified local work

SDK schema/types, structural and semantic validator, compiler with server/learner split, and CLI implemented. 42 tests, typecheck, build and 16-file installed-package smoke pass on Node24/26 locally and in GitHub Actions. A CSP code-generation incompatibility was reproduced and fixed using build-time static validators.

SDK v0.1.0 released at https://github.com/roeehrl/course-sdk/releases/tag/v0.1.0 using the exact GitHub release-verification artifact from run38271115306 (both matrix jobs passed). Package SHA256 09915cce7f8ea64e17ba09f22869b187770966bb74c67f5796f4fe715ccf58bc. No npm publication. Core API consumes this public release URL with locked integrity; no sibling SDK source import.

Core policy: 47 domain tests pass after fixing closed-after-cap reading being incorrectly denied before the cap. Calendar/DST/caps/extensions/reservations are domain-tested. API: 21 tests pass with real PostgreSQL, including duplicate answer/enrollment races, exact-consent extension grant races, stale revisions, cross-user/workspace access, practice/assistance separation, held-out item selection, placement distinction, and an injected event-storage failure rolling back answer/evidence/revision/receipt. API typecheck passes. No live learner/API integration proven yet.

Learner Expo/RNW shell: completed locally by assigned agent with 21 component/state tests, 10 browser tests, responsive/a11y checks and web export. Still uses explicitly labeled public sorting demo; server integration pending. Private foundation content chapters01–04 (16 episodes) exists, with mathematical verification record; interactive visuals/practical graders and full assembly remain pending.

## Parallel ownership

- Sagan: 01a130a4-7313-7e22-a5a9-420baeee9761, policy done; now owns core/packages/providers only (neutral contracts and real Google adapters with mocked HTTP contract tests).
- Maxwell: 01a130a4-738d-77a2-b210-e27a15b453a8, learner shell done; now owns core/apps/admin only.
- Bernoulli: 01a130a4-73fa-7e80-9a70-6b39a288c526, SDK CI done; now owns core root .github/scripts/package.json/README/LICENSE/SECURITY/CONTRIBUTING only.
- Ramanujan: 01a130a4-7478-7d91-a609-001870eda747, foundations done; now owns private content/training-and-transformers.json and review only (chapters05–08).

Do not duplicate their work; parent owns integration/backend/deployment, may edit completed modules. Current API endpoints implemented in services/api/src/server.ts and policy-routes.ts. Full approval design remains authoritative; mocks, isolated tests and early SDK release do not establish completed platform delivery.
