# Core 0.1.48 published, accepted and deployed to the pilot; tailnet apps checked — 2026-10-20

- Published: Core 0.1.48 prerelease.
  - Tag object 95f3041 on 0e5c220. 32/32 check runs green on 0e5c220. Release run 39485233739, attempt 1.
  - Artifact 12293239847, digest 9e76f5f4…. Manifest cd8d2a66….
  - 1097 source members match Git. Hosted assets are byte-identical to the candidate (8 of 8; this release adds a CycloneDX SBOM, listed in SHA256SUMS). All 7 release files verify with `gh attestation verify`.
  - Merged PRs since 0.1.47: #163–#183. Main changes: Python practice runs in the browser via Pyodide 314.0.7 served from Core (#176); debug inspector, supervisor-run retry and attempt regrade (#170); evaluation gate for new companion and supervisor-plan configurations (#175); research studies (#179); cross-course concept mappings and suggestions (#181); visuals 0.4.0 (#177, #178, #180); login throttling per client and login name, `TRUSTED_PROXIES` off by default (#166, #169); reliability fixes (#164, #165, #168); backup encryption and ops notes (#163); Temporal CLI digest pin, SBOM and attestations (#167); CI scans and recovery runs (#171–#174, #182); version (#183).
  - Six new migrations: 079, 080, 081, 083, 085, 086 (tables and nullable columns only).
- Status by stage: implemented, tested in Core CI, merged and released as above; deployed to the local pilot; live-verified only by the pilot acceptance and the signed-out tailnet check below. None of the new 0.1.48 features was exercised on the pilot.
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.47 pilot applied exactly the six new migrations, then none on a second run. 587 rows in the 130 existing tables, the QA pin and the 68 existing migration digests unchanged; 15 new tables, all empty.
  - The rehearsal's pre-migration provider-bindings query failed: it read a column that only exists after 083 (an error in the script, not the candidate). The pilot has no provider bindings, so grandfathering of existing bindings was not exercised.
  - HTTP: 56/56 episodes. Feature flow: all 8 reports passed; course 0.1.6 (built for visuals 0.1.x) published with all 56 visuals on visuals 0.4.0. Browser: passed on phone (56 episodes), desktop and tablet.
  - Temporal pin: the pilot's Temporal CLI 1.9.1 is accepted; a copy with one byte added is refused.
  - Pyodide: the five served files match their pinned digests. No in-browser Python run (the example courses have no Python checks).
  - Evaluation gate: a new companion or supervisor-plan configuration without an evaluation is refused with `PROVIDER_EVAL_REQUIRED`; an owner override lets it activate.
  - Login throttle with `TRUSTED_PROXIES` unset: repeated failures from one client lock only the affected login names; the owner still signs in.
  - Web bundles: admin and learner sign-in pages load on phone and desktop with 0 page errors. The check script exited 1 because it counts any console line as an error; the only line was one per page, the browser's record of the expected 401 from the signed-out session check. Not rerun.
- Deployed to the pilot on this Mac, 0.1.47 → 0.1.48, at 20:24 UTC.
  - Backup backup-20261020202402186-de6b70 (not encrypted). Restore drill: 131 tables, 655 rows. Steps: stopped, backed up, restore verified, started new runtime.
  - Installed runtime: 2565 members verified, adapter digests match, Temporal CLI byte-identical to 0.1.47's.
  - Health ok. 74 migrations, last 086. The 15 new tables and the 4 course package and update tables are empty.
  - The QA enrollment, memberships, course releases and migration list are unchanged (read-only SQL before and after acceptance).
  - Pilot acceptance passed, one run: phone signed in (fnd-e01-01 was already complete), tablet and desktop resumed fnd-e01-02. The operator is unenrolled.
- Insecure-address checks on the pilot: still OFF, as the operator set it under 0.1.46. `config.json` has `allowInsecureOrigins: true`; the API runs with `ALLOW_INSECURE_ORIGINS=true`, only the Tailscale origin in `ADDITIONAL_ORIGINS`, and `TRUSTED_PROXIES` unset.
- Tailnet: checked signed out from the pilot host through its tailnet address (plain http), once.
  - Admin and learner pages load on phone, tablet and desktop sizes. There are no page errors. Every page shows the expected signed-out 401; the first page also logged one 404, most likely Chrome's favicon request. Same as 0.1.47.
  - The served bundles are byte-identical to the installed 0.1.48 exports. The learner bundle and the admin bundle are both new.
  - Sign-in from the tailnet origin is accepted (an unknown user gets 401 LOGIN_FAILED).
- Not verified: signed-in saves over the tailnet (needs the operator's password); the admin insecure-address notice on the pilot (needs a signed-in admin); LAN devices (no LAN origin is configured, and no second physical device was used); live providers (no real provider call); real model quality; an in-browser Python run on the pilot (or anywhere); grandfathering of existing provider bindings (the pilot has none); studies and cross-course flows on the pilot (Core CI only). The inspector, evaluation gate, login throttle and new visuals were checked in qualification or CI only, not on the pilot.
- User actions: model prices, allowances, placement on per course. New or changed companion and supervisor-plan configurations now need a passing evaluation or an owner override. To turn the insecure-address check back on, use `pilot.mjs security insecure-origin-check on` after removing any plain-http LAN origins.
- Evidence: evidence/core-0.1.48-release-and-pilot.json.

# Core 0.1.47 published, accepted and deployed to the pilot; tailnet apps checked — 2026-10-20

- Published: Core 0.1.47 prerelease.
  - Tag object e386588 on cc0961e. 26/26 check runs green on cc0961e. Release run 39369288302, attempt 1.
  - Artifact 12242320938, digest e3588c06…. Manifest bb4a7af8….
  - 937 source members match Git. Hosted assets are byte-identical to the candidate (7 of 7).
  - Merged PRs since 0.1.46: #158 (learner browser tests wait for profile panels), #159 and #160 (profile panels keep their space while loading), #161 (`security insecure-origin-check on|off|status`; the 0.1.46 form still works with a deprecation note), #162 (version). No migrations.
- Status by stage: implemented, tested in Core CI, merged and released as above; deployed to the local pilot; live-verified only by the pilot acceptance and the signed-out tailnet check below.
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.46 pilot applied no migrations, twice. 585 rows in 130 tables unchanged.
  - HTTP: 56/56 episodes. The first HTTP invocation was stopped by the harness precondition `course_build_missing_run_npm_run_build_first` (the `--worked-course` flag was missing) before the runtime started or any database was touched; it then ran once correctly.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
  - Profile layout on phone, tablet and desktop, with each panel's read delayed: the controls below "Personal lesson support", "Your personal changes", "Reviews of your written answers" and "Staff access to your record" did not move. Placeholders are hidden from screen readers and not focusable; no axe violations. Learning memory and teaching ideas still grow on the first load in a session (documented limit). The measurement script was rerun four times because of errors in the script itself, not the candidate (3 aborted before measuring, 1 complete run superseded); all logs are kept.
  - Security command on a temporary state folder: 21 invocations as expected; only the old form prints the deprecation note; invalid arguments are refused.
- Deployed to the pilot on this Mac, 0.1.46 → 0.1.47, at 05:17 UTC.
  - Backup backup-20261020051718596-93102b. Restore drill: 131 tables, 653 rows.
  - Health ok. Still 68 migrations, last 078. The 4 course package and update tables are still empty.
  - The QA enrollment, memberships, course releases and migration list are unchanged (read-only SQL before and after acceptance).
  - Pilot acceptance passed, one run: phone signed in (fnd-e01-01 was already complete), tablet and desktop resumed fnd-e01-02. The operator is unenrolled.
- Insecure-address checks on the pilot: still OFF, as the operator set it under 0.1.46. `config.json` has `allowInsecureOrigins: true`; the API runs with `ALLOW_INSECURE_ORIGINS=true` and only the Tailscale origin in `ADDITIONAL_ORIGINS`.
- Tailnet: checked signed out from the pilot host through its tailnet address (plain http), once.
  - Admin and learner pages load on phone, tablet and desktop sizes. There are no page errors. Every page shows the expected signed-out 401; the first page also logged one 404, most likely Chrome's favicon request.
  - The served bundles are byte-identical to the installed 0.1.47 exports. The learner bundle is new; the admin bundle is unchanged from 0.1.46.
  - Sign-in from the tailnet origin is accepted (an unknown user gets 401 LOGIN_FAILED).
  - The first launch of the check script failed before any request (no bundled headless browser installed); it then ran once with the installed Chrome.
- Not verified: signed-in saves over the tailnet (needs the operator's password); the admin insecure-address notice on the pilot (needs a signed-in admin); LAN devices (no LAN origin is configured, and no second physical device was used); live providers (no real provider call); real model quality. The profile-layout fix and the new security command were checked in qualification only, not on the pilot.
- User actions: model prices, allowances, placement on per course. To turn the insecure-address check back on, use `pilot.mjs security insecure-origin-check on` after removing any plain-http LAN origins.
- Evidence: evidence/core-0.1.47-release-and-pilot.json.

# Core 0.1.46 published, accepted and deployed to the pilot; tailnet apps checked — 2026-10-20

- Published: Core 0.1.46 prerelease.
  - Tag object 1e7c6ca on c30bab4. 26/26 check runs green on c30bab4. Release run 39347966119, attempt 1.
  - Artifact 12233427563, digest 2c2ca6dd…. Manifest 24399010….
  - 934 source members match Git. Hosted assets are byte-identical to the candidate.
  - Merged PRs since 0.1.45: #153 (install a course from a course package), #154 (course updates from a GitHub repository or a host folder), #156 (operator switch for the insecure-address check), #157 (version).
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.45 pilot applied exactly 077 and 078; a second run applied none. 581 existing rows unchanged; the 4 new tables are empty.
  - HTTP: 56/56 episodes.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
  - Feature checks on a disposable database with a synthetic public fixture course: an uploaded package installed and published through the admin dialog; tampered packages were refused (`PACKAGE_CORRUPT`, `PACKAGE_MEMBER_DIGEST_MISMATCH`) with no staged rows; a host-folder source found 1.1.0 and installed it as a draft with automatic updates still off; the insecure-address switch refused a LAN origin by default and, when switched off, accepted it with the log line and the admin notice (phone and desktop).
- Deployed to the pilot on this Mac, 0.1.45 → 0.1.46.
  - Backup backup-20261020012948726-4ef67b. Restore drill: 127 tables, 647 rows.
  - Health ok. 68 migrations; 077 and 078 are new. The 4 new tables are empty.
  - The QA enrollment is unchanged (checked with read-only SQL before and after acceptance).
  - Pilot acceptance passed: phone completed fnd-e01-01, tablet and desktop resumed. The operator is unenrolled.
- Insecure-address checks on the pilot: OFF, at the operator's explicit request (`pilot.mjs security insecure-origins on`, then a restart). The API runs with `ALLOW_INSECURE_ORIGINS=true`.
  - The only extra origin is still the Tailscale address. No plain-http LAN origins are configured, so the set of trusted origins has not changed.
  - The pilot launcher discards the API's output, so the `origins.insecure_allowed` start-up line is not kept. The admin notice was not checked on the pilot because it needs a signed-in admin. Both were checked in qualification.
- Tailnet: checked signed out from the pilot host through its tailnet address (plain http).
  - Admin and learner pages load on phone and desktop sizes. There are no page errors; the only console error is the expected signed-out 401.
  - The served admin and learner bundles are byte-identical to the installed 0.1.46 exports. The admin bundle is new; the learner bundle is unchanged from 0.1.45.
  - Sign-in from the tailnet origin is accepted (an unknown user gets 401 LOGIN_FAILED).
  - Not done: a signed-in save over the tailnet address on the pilot, which needs the operator's password. Not yet checked from a second physical device.
- Not verified: no real provider call has been made. Installing from a real GitHub release link, the automatic update levels and the background tick were not exercised. No real course package exists yet (course 0.1.6 is not published as a `.course.tgz`). The insecure-address switch was not tried from a real LAN device. Course 0.1.6 declares no activities, so the activity runtime is covered only by Core CI.
- User actions: model prices, allowances, placement on per course. Before adding a LAN origin, note that its traffic, sign-in included, is unencrypted. Remove such origins before turning the checks back on or rolling back to 0.1.45.
- Evidence: evidence/core-0.1.46-release-and-pilot.json.

# Core 0.1.45 published, accepted and deployed to the pilot; tailnet apps checked — 2026-10-19

- Published: Core 0.1.45 prerelease.
  - Tag object 323f121 on d09fcc7. 26/26 check runs green on d09fcc7. Release run 39290082456, attempt 1.
  - Artifact 12209714769, digest 66e304b3…. Manifest 8d76b82c….
  - 911 source members match Git. Hosted assets are byte-identical to the candidate.
  - Merged PRs since 0.1.44: #151 (tailnet `--tcp` setup docs), #152 (admin and learner work in a non-secure context), #155 (version).
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.44 pilot applied nothing. 577 rows unchanged.
  - HTTP: 56/56 episodes.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
  - Non-secure context: admin and learner saves succeeded with `crypto.randomUUID` and `crypto.subtle` removed, and from a plain-http Tailscale-range origin. All 7 idempotency keys were v4 UUIDs. Disposable database, placeholder keys only.
- Deployed to the pilot on this Mac, 0.1.44 → 0.1.45.
  - Backup backup-20261019183339615-168e79. Restore drill: 127 tables, 643 rows.
  - Health ok. Still 66 migrations; none new.
  - The QA enrollment is unchanged (checked with read-only SQL before and after acceptance).
  - Pilot acceptance passed: phone completed fnd-e01-01, tablet and desktop resumed. The operator is unenrolled.
- Tailnet: checked signed out from the pilot host through its tailnet address (plain http).
  - Admin and learner pages load on phone and desktop sizes. `isSecureContext` is false and `crypto.randomUUID` is undefined. There are no page errors; the only console error is the expected signed-out 401.
  - The served admin and learner bundles are byte-identical to the installed 0.1.45 exports and include the `getRandomValues` fallback.
  - Sign-in from the tailnet origin is accepted (an unknown user gets 401 LOGIN_FAILED).
  - Not done: a signed-in save over the tailnet address on the pilot, which needs the operator's password. The qualification check covered signed-in saves in a non-secure context on a disposable database. Not yet checked from a second physical device.
- Not live-verified: no real provider call has been made. Course 0.1.6 declares no activities, so the activity runtime is covered only by Core CI.
- User actions: model prices, allowances, placement on per course; optionally confirm one signed-in admin save from a second tailnet device.
- Evidence: evidence/core-0.1.45-release-and-pilot.json.

# Core 0.1.44 published, accepted and deployed to the pilot, with tailnet access — 2026-10-18

- Published: Core 0.1.44 prerelease.
  - Tag object bc1348f on ab90eda. Main CI 12/12. Release run 39118265920, attempt 1.
  - Artifact 12134122421, digest d2ead307…. Manifest 4cfc4324….
  - 907 source members match Git. Hosted assets are byte-identical to the candidate.
  - Merged PRs since 0.1.43: #122 (activity runtime, audit #14), #148 (tailnet origins), #149 (placement limit, draft bundle from file), #150 (version).
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.43 pilot applied 2 migrations (059, 076). A rerun applied none. 573 rows unchanged.
  - HTTP: 56/56 episodes.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
- Deployed to the pilot on this Mac, 0.1.43 → 0.1.44.
  - Backup backup-20261018110606780-333702. Restore drill: 124 tables, 637 rows.
  - Health ok. 66 migrations.
  - The QA enrollment is unchanged.
  - Pilot acceptance passed: phone completed fnd-e01-01, tablet and desktop resumed. The operator is unenrolled.
- Tailnet access: the pilot trusts its Tailscale IP origin (plain http) and is forwarded with `tailscale serve --tcp=4310` (tailnet only; the API still listens on loopback).
  - `--http` forwarding answers only the MagicDNS name, so the IP got 404. A Core README correction is in a follow-up PR.
  - Checked from the pilot host through its tailnet address: admin page loads on phone and desktop sizes, the tailnet origin is accepted, other origins are refused with 403, and no passkeys are offered.
  - Not checked from a second physical device yet.
- Not live-verified: no real provider call has been made. Course 0.1.6 declares no activities, so the activity runtime is covered only by Core CI.
- User actions: placement on per course, model prices, allowances, course 0.1.6.
- Evidence: evidence/core-0.1.44-release-and-pilot.json.

# Core 0.1.43 published, accepted and deployed to the pilot — 2026-10-17

- Published: Core 0.1.43 prerelease.
  - Tag object 38cd278 on 7d2318e. Main CI 12/12. Release run 39029388782, attempt 1.
  - Artifact 12100626995, digest 93fc4fd9…. Manifest c602acb2….
  - 889 source members match Git. Hosted assets are byte-identical to the candidate.
  - Merged PRs since 0.1.42: #121, #124, #129, #131–#134, #137, #141, #143, #145–#147.
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a fresh copy of the 0.1.42 pilot applied 7 migrations (058, 062, 065, 066, 068, 069, 070). The QA pin was unchanged.
  - HTTP: 56/56 episodes.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
- Deployed to the pilot on this Mac, 0.1.42 → 0.1.43.
  - Backup backup-20261017122348327-5a4508. Restore drill: 122 tables, 229 rows.
  - Health ok. 64 migrations.
  - The QA enrollment is unchanged.
  - Pilot acceptance passed: phone completed fnd-e01-01, tablet and desktop resumed. The operator is unenrolled.
- On main after 0.1.43, not yet released: the activity runtime (#122). It went through four security-review rounds and closes audit #14.
- Not live-verified: no real provider call has been made.
- User actions: unchanged from 0.1.42 (placement on per course, model prices, allowances, course 0.1.6).
- Evidence: evidence/core-0.1.43-release-and-pilot.json.

# Core 0.1.42 published, accepted and deployed to the pilot — 2026-10-17

- Not released: 0.1.40 and 0.1.41. Both are tagged, and neither tag was retried.
  - 0.1.40: release run 38960925130 failed on the adapter-digests 5 s test timeout (fixed by #138).
  - 0.1.41: its single acceptance attempt failed in the harness before Core ran (missing `.local` directory). The user chose to cut 0.1.42 strictly. The 0.1.41 bytes were then used only to rehearse the fixed harness (course PR #3).
- Published: Core 0.1.42 prerelease.
  - Tag object 0c6f2bf on 49eaa5c. Main CI 12/12. Release run 39001467044, attempt 1.
  - Artifact 12089118918, digest cfe1dc9c…. Manifest cf80c803….
  - 864 source members byte-compared to the Git tree. Hosted assets are byte-identical to the candidate.
- Qualification, each acceptance run once against the candidate bytes before publication (scripted models only, no timeout increases):
  - Migration rehearsal on a pilot copy applied 19 new migrations, through 071. The QA pin was unchanged.
  - HTTP: 56/56 episodes.
  - Feature flow: passed.
  - Browser: passed on phone (56 episodes), desktop and tablet.
- Deployed to the pilot on this Mac (http://localhost:4310), 0.1.39 → 0.1.42, with the release's upgrade.mjs.
  - Backup backup-20261017110018397-14b47f. Restore drill: 100 tables, 207 rows.
  - Health ok. Running from releases/v0.1.42. 57 migrations, through 071.
  - The QA enrollment 6d7439c7 is unchanged and remains the only enrollment.
  - Pilot acceptance passed: phone completed fnd-e01-01, tablet and desktop resumed fnd-e01-02. The operator is unenrolled.
- Not live-verified: no real provider call has been made.
- User actions:
  - Turn placement on per course (Admin → Placement). It is OFF by default since 0.1.40.
  - Enter model prices.
  - Set paid-work allowances.
  - Install course 0.1.6 for new learners.
- Evidence: evidence/core-0.1.42-release-and-pilot.json.

# Core 0.1.39 published, accepted and deployed to the pilot — 2026-10-15

- MERGED: PR #81 (version 0.1.39) on top of #47-#80; main CI 38788376533 12/12 on
  56b3cda.
- PUBLISHED Core 0.1.39 prerelease (tag object 68b3b33 on 56b3cda, run 38790654821
  attempt 1, artifact 12000747209 digest 021a9848…, manifest 4bc32171…; 701 source
  members byte-compared to the Git tree; every asset member matches the manifest;
  module locks match Git; built adapter digests unchanged (code-bank 05d8ba24…);
  visuals 0.1.1 dist files match the released record (the tgz differs from 0.1.38's
  only because package.json now pins SDK 0.5.0); hosted bytes identical, 7 assets).
  Notes state the operator-facing changes: model prices required (paid work refused
  without them) incl. per-web-search price; Anthropic text provider (no live call);
  gates/assessment + review/exception; view as learner; learner-model privacy for
  staff (companion, learner model, gate-review and appeal reasons withheld); erasure
  finishes paid-work reservations and redacts media text; visuals identity change
  (fingerprints unchanged); budget form fix; hypotheses (opt-in); placement fixes;
  optional OpenTelemetry (off). Migrations 030, 031, 035-039, 041, 042.
- ACCEPTED BEFORE PUBLICATION on the candidate bytes, course 0.1.6, scripted models,
  no timeout changes: HTTP 56 episodes (87 s; 3 recoveries, 6 assignments) passed
  first run; browser phone 56 / desktop 16 / tablet 4, 0 page errors, passed first
  run. Feature flow FAILED its first run with model_operation_not_started: 0.1.39's
  default pricing rule refused the harness's unpriced scripted model (documented
  behaviour, not a Core defect). verification/feature-flow.mjs now checks the
  default refusal and enters a synthetic operator price; it passed on the next run
  against the same bytes. released-runtime.mjs pins 0.1.39 (0.1.38 kept as
  expectedCoreRelease38).
- Migration rehearsal: a read-only dump of the pilot DB restored into a disposable
  DB took all 9 migrations with the candidate's migrate-cli; QA pin unchanged.
- DEPLOYED: pilot 0.1.38 -> 0.1.39 with the release's deploy/local/upgrade.mjs
  (backup-20261015193849878-91a3d3, drill 81 tables / 194 rows). config.json bytes
  unchanged (telemetry off; credentials, prices, allowances untouched). Health ok at
  http://localhost:4310; QA enrollment 6d7439c7 (0.1.4, active, rev 9, 2 evidence)
  unchanged; operator unenrolled; pilot acceptance phone/tablet/desktop passed.
- LIVE-VERIFIED: nothing provider-related. No prices are entered on the pilot
  (provider_model_prices empty), so paid work is refused until the operator enters
  prices (incl. per-search price for a research model) and allowances.
- Host incident: the data volume was full (ENOSPC) for a while; it ended before any
  local verification, install or acceptance step ran, so no result was affected.
  Evidence: evidence/core-0.1.39-release-and-pilot.json.

# v0.8 audit and parallel implementation wave; SDK 0.5.0 released — 2026-10-15

- AUDIT: ~220 requirements checked against code (planning/audit/): ~25 done, ~150
  partial, ~45 missing; prioritized gap list with parallel groups.
- RELEASED: SDK 0.5.0 (gates/decisions, assessment rules, activities, admin sections,
  research fields, hypotheses/probes, agent strategies, CLI pack/verify; 0.4.0 bundles
  verify and recompile identically).
- MERGED to Core main (not released): #47 hermetic CI, #48 OpenTelemetry, #50 speed,
  #51 audit P0 fixes, #52 media jobs, #53 placement replies.
- OPEN/WIP: #55 pricing, #49 view-as-learner, #54 teaching hypotheses; branches
  gates-and-assessment, anthropic-provider, learner-model-privacy, placement-followups;
  private visuals/final-batch (12 verified illustrations + WIP). See
  planning/HANDOFF_2026-10-15.md.
- PILOT: operator password set; Google text-role setup in progress by the user; no
  live provider call verified yet.

# Course 0.1.6 released privately; pilot prepared, install waits for the operator password — 2026-10-15

- PUBLISHED (private) course-v0.1.6: package from 628f8f8 (content unchanged since
  08c65ed), digest 9574ac29…, tgz sha256 2053e5d7…; hosted bytes identical. Accepted
  on Core 0.1.38 before release (see the 0.1.38 entry).
- scripts/install-pilot-course.mjs signs in with --login and a password typed without
  echo (codes are off on Core 0.1.36+). verification/install-flow.mjs passed against a
  disposable released 0.1.38: wrong password refused, install selected, duplicate
  refused, password never printed.
- PILOT: package staged at course/v0.1.6; config adaptationAdapters gained
  authored-teaching-bank-v1 (needed by the remedial-episode profiles), previous config
  kept as state/.config.json.pre-0.1.6; restarted, health ok, QA enrollment unchanged
  (0.1.4, active, rev 9). NOT installed for new learners yet: needs the operator's
  password. Evidence: evidence/course-0.1.6-release.json.

# Core 0.1.38 published, accepted and deployed; v0.1.36 and v0.1.37 dead tags — 2026-10-14

- PUBLISHED Core 0.1.38 prerelease (tag object 9d72b3c on ded66f2, run
  38599534149, artifact 11912454761 digest e27d5467…, manifest 9199311b…; 584
  source members compared; hosted bytes identical). Since 0.1.35: password sign-in
  (migration 028) with one-time codes OFF by default (AUTH_LOGIN_CODES / pilot
  loginCodes), sessionHours, optional passkeys (migration 029; need a domain origin,
  localhost locally), adapted course built once per adaptation state, each visual
  checked once off the event loop during review/publication (PR #45), placement
  race (PR #43) and out-of-order refresh (PR #44) fixes, release-input name check in
  Public CI (PR #42).
- DEAD TAGS, never published: v0.1.36 (2100d1d; release assembly refused
  services/api/src/secret-input.ts under the private-name rule) and v0.1.37
  (6fc6a2a; publish review transitions 15-34 s on the ~2 MB course under load vs the
  harness's 15 s timeout, HTTP 1/4 and browser 0/3; same 15-17 s measured on 0.1.35).
- ACCEPTED BEFORE PUBLICATION, one run each, no retries or timeout changes, course
  0.1.6: HTTP 56 episodes, feature flow, browser phone 56 / desktop 16 / tablet 4,
  0 page errors. Per episode after the first recovery: HTTP median 16.1 s -> 1.2 s
  (total 698 s -> 83 s); phone 36.0 s -> 2.2 s (1518 s -> 130 s). The recovery
  episode itself is ~8 s.
- HARNESS: all private acceptance drivers sign in with passwords
  (verification/password-login.mjs; password on stdin to Core's bootstrap and
  set-password CLIs, never printed). Codes stay at Core's default (off), and the
  HTTP flow checks /auth/options, a refused /auth/redeem and a 401 wrong password.
  Feature-flow invitations use temporary passwords and assert 409 before the
  change. Pilot acceptance sets the QA account's password per run; it never sets
  the operator's, so without --operator-login (password on stdin) it checks the
  QA role and operator-unenrolled read-only in the database and the admin sign-in
  page signed out. Request timeouts in learner-flow now name the route.
  released-runtime.mjs pins 0.1.38 (0.1.35, 0.1.37 kept).
- DEPLOYED: pilot 0.1.34 -> 0.1.38 (backup-20261014172920561-d739c7, drill 77
  tables / 186 rows; migrations 028 and 029 only). config.json: sessionHours=720,
  publicOrigin=http://localhost:4310 (0600, loginCodes absent); restarted. Health ok,
  passkeys on. 127.0.0.1:4310 still serves the apps but sign-in answers 403
  ORIGIN_REJECTED; use http://localhost:4310. QA enrollment 6d7439c7 (0.1.4,
  active, rev 9, 2 evidence) and the only pin unchanged. Pilot acceptance
  phone/tablet/desktop passed at localhost. The operator (operator:owner) has no
  password yet; it is left for the operator to set with set-password-cli.
  Evidence: evidence/core-0.1.38-release-and-pilot.json.
- Not verified: live providers, generated prose/reviewer-draft quality, learning
  efficacy, physical devices, hardware passkeys, native binaries, admin UI signed in
  on the pilot.

# Course 0.1.6 staged on SDK 0.4.0; Core performance defect found — 2026-10-14

- STAGED, NOT packaged/published/installed: course 0.1.6 on the released SDK 0.4.0
  (tarball sha256 f548f0f9… matches the release). Adds optional placement (24
  existing short checks, chapters 1–3), 4 human-reviewed written explanations,
  delayed retention checks (intervals 2/7/21 days, 6 objectives, 24 held-out items)
  and 4 optional reviewed remedial episodes (teaching-bank insert_episode); packaging
  now carries all 39 illustrations. Registry 158 profiles. Details, rationale and
  limits: planning/COURSE_0.1.6.md.
- PASS: npm test 22/22, verify:math (incl. 273 new checks), verify:visuals, build;
  released Core 0.1.34 HTTP 56-episode acceptance (41 min); new released-surface
  feature flow (placement decline/accept, retention check, second-staff rubric
  review with self-review refused, supervisor remedial insertion).
- FAIL: phone browser acceptance times out near episode 43 (25.9 s answer). Root
  cause is in Core: every enrollment request re-validates each applied adaptation
  against the whole course (adaptation-store.ts:583 materializeAdaptation); cost
  grows with recoveries × bundle size. Desktop and tablet (UI placement accept)
  pass alone. Not worked around; maintainer decision needed before pilot install.
- Gaps reported: no HTTP path for remedial insertion without a live Google model;
  no clock control for retention checks (both handled only by explicit test harness
  stand-ins). Pilot untouched.

# Core 0.1.34 published, accepted and deployed — 2026-10-14

- PUBLISHED Core 0.1.34 (tag object d232fe7 on 1c204b6, run 38512307504, artifact
  11870787536 digest dac36e45…, manifest 1a5baaee…; 556 source members compared;
  hosted bytes identical; consumer shasum ok). Restores the approved code-bank
  adapter digest (05d8ba24…) and guards built adapter digests in CI. Notes state
  that teaching-bank registries approved before 0.1.31 need re-approval.
- ACCEPTED BEFORE PUBLICATION on the candidate bytes: private 56-episode
  released-consumer acceptance (course 0.1.5) passed over HTTP (3 practical
  recoveries, 6 recovery assignments, unearned completion rejected everywhere)
  and in the browser (phone 56 episodes, desktop/tablet 16, 0 page errors, no
  overflow). Process change: this acceptance now gates publication.
- DEPLOYED: pilot 0.1.32 -> 0.1.34 after confirming its approved registry digests
  and renderer declaration resolve on the build; backup + drill 77/175; health ok;
  QA enrollment unchanged; pilot acceptance phone/tablet/desktop passed, no axe
  defects. verification/released-runtime.mjs pins 0.1.34.
  Evidence: evidence/core-0.1.34-release-and-pilot.json.
- Not verified: live providers, generated prose/reviewer-draft quality, learning
  efficacy, physical devices, native binaries.

# Core 0.1.33 published; pilot rolled back to 0.1.32; code-bank digest fix in progress — 2026-10-14

- PUBLISHED Core 0.1.33 (tag object bf187f2 on fa41b02, run 38506727322, artifact
  11869246342 digest 401b7a25…, manifest 70c9edac…; 553 source members compared;
  hosted bytes identical; consumer shasum ok). Fixes the 0.1.32 visuals versioning
  regression (visuals 0.1.1; earlier server-identical 0.1.0 build accepted; digest
  guard in CI). Pilot course 0.1.4 renderer declaration accepted again.
- NEW REGRESSION in 0.1.33 (stated in its notes): a behaviour-neutral edit to
  qualifiedCodeEvaluator moved the authored-code-bank-v1 adapter digest
  (05d8ba24… -> c51bc8a5…); approved code-recovery registries no longer resolve.
  Private 56-episode acceptance failed (installed_creator_digest_mismatch).
- DEPLOYED: pilot upgraded 0.1.32 -> 0.1.33 (backup + drill 77 tables/164 rows,
  pilot acceptance passed), then ROLLED BACK to 0.1.32 with the same tool (no
  migrations between; backup + drill 77/175; health ok; QA enrollment unchanged).
  Evidence: evidence/core-0.1.33-pilot-upgrade-and-rollback.json.
- IN PROGRESS: Core 0.1.34 restoring the earlier code-bank digest plus a CI guard
  over built adapter digests.
- Concept illustrations: 39/56 episodes, every chapter (b8d2ef8, layout fixes 290c5e4).

# Core 0.1.32 published and deployed; visuals versioning regression found — 2026-10-14

Full approved v0.8 objective ACTIVE and incomplete. States are distinguished below.

- PUBLISHED Core 0.1.32 (prerelease; tag object 1964d60 on 859b4db, release run
  38498335184, artifact 11865321561 digest 3908fd6e…, manifest ed2f247e…; 547
  source members byte-compared; hosted bytes identical; consumer shasum ok).
  Contains all features listed under 0.1.25 "in review" below plus SDK 0.4.0
  consumption. v0.1.31 was tagged but never released (main CI failed a WebKit
  placement reload race; fixed in the test, shipped as 0.1.32).
- DEPLOYED: native pilot upgraded 0.1.25 -> 0.1.32 with the release's own
  deploy/local/upgrade.mjs (stop, backup, restore drill 70 tables/146 rows,
  start, health). Migrations 021-027 applied. QA enrollment unchanged (0.1.4
  pin, 2 evidence, revision 9). Pilot browser acceptance phone/tablet/desktop
  passed, no axe defects. Installed runtime verified 1310 members / 752 files.
  verification/released-runtime.mjs now pins 0.1.32 (0.1.19 kept as
  expectedCoreRelease19). Evidence: evidence/core-0.1.32-pilot-upgrade.json.
- REGRESSION FOUND (released + deployed): 0.1.32 changed visuals dist/react.js
  without bumping visuals 0.1.0, so the renderer integrity no longer matches
  courses that declare the earlier 0.1.0. Private 56-episode released-consumer
  acceptance FAILED at publish (PUBLISH_CAPABILITY_MISSING); on the pilot,
  interactive visual context for course 0.1.4 is refused. Lessons, answers,
  evidence and progress unaffected. Stated in the 0.1.32 release notes. Fix in
  progress on Core branch core-0.1.33 (visuals 0.1.1, explicit acceptance of the
  server-identical earlier build, digest guard in CI).
- Concept illustrations: 31/56 episodes (b913141); LoRA verdict wording fix in progress.

# (earlier) Core 0.1.25 published and deployed; SDK 0.4.0 and Core features in review — 2026-10-14

Full approved v0.8 objective ACTIVE and incomplete. States are distinguished below.

- PUBLISHED Core 0.1.25 (prerelease; tag object 41e588d on dfe4f2b, release run
  38468281537, artifact 11856082469 digest 2fd67317…, manifest b47d3e92…; 503
  source members byte-compared; hosted draft bytes identical): People & roles,
  export/erasure, pilot backup/restore drill, placement runs, reviewed written
  answers, release API retry. Known issue in 0.1.25 (stated in its notes):
  erasure keeps reviewer quotes of written answers and the export omits newer
  records; fixed on a Core branch, not yet released.
- DEPLOYED: native pilot upgraded 0.1.19 -> 0.1.25 on this host. Stop, explicit
  Temporal queue pin (confirmed in the store), backup + real restore drill (59
  tables, 130 rows, Temporal integrity ok), start, migrations 016-020. QA
  enrollment preserved (0.1.4 pin, 1 completed, 2 evidence); browser acceptance
  phone/tablet/desktop passed, no axe defects (evidence/core-0.1.25-pilot-upgrade.json).
  Installed runtime verified 1213 members / 699 files. Private 56-episode
  released-consumer acceptance has NOT been rerun against 0.1.25.
- MERGED SDK PR6 (remedial episodes, insert_episode); tag v0.4.0 pushed, release
  run queued (GitHub runner backlog). Not yet published.
- IMPLEMENTED + TESTED locally on stacked Core branches (CI pending behind PR33
  retention checks): personal-change visibility, completed-course Q&A,
  least-privilege runtime DB role, pilot upgrade tool, deadline/retention
  wakeups, reviewed remedial episode insertion (staff and supervisor paths),
  WebKit (desktop/iPhone/iPad) + Firefox learner journeys in CI (found and fixed
  a visual ResizeObserver loop), release cache + batched policy reads (load
  review: 201 -> 784 req/s at 200 learners on a 62-episode course, 0 failures),
  erasure/export coverage fix, AI-drafted findings for human reviewers (separate
  learner opt-in; draft never evidence; quotes verified), reviewer-learner
  conversation for written answers (neutral probe keeps independence), provider
  calls + verification in the run inspector. API 321/321, learner 115/115,
  admin 59/59, browsers Chromium 45/45, WebKit+Firefox 60/60, admin real 30/30.
  Scripted models only: none of this shows real model quality or learning efficacy.
- Still open: live Google providers (user configuration + explicit allowance),
  learning efficacy, physical devices/native binaries, more illustrations,
  release of the above after CI.

# Research, people, data lifecycle, placement, rubric review; course 0.1.5 staged — 2026-10-14

Full approved v0.8 objective ACTIVE and incomplete. Distinguish states below.

- PUBLISHED Core 0.1.20 (tag a3d1648, run 38461227063, artifact digest f16f7091…,
  manifest b7786221…, 473 source files byte-compared, hosted bytes identical):
  stored research source catalogue, bounded inspection, evidence-quoted review
  with rights, expiring/revocable optional episode help (admin Research sources
  view, learner optional panel); keyboard-scrollable wide code on phones.
- MERGED to Core main, CI 12/12 each, NOT yet published: People & roles (PR28),
  learner export + irreversible erasure + pilot backup/restore drill (PR29),
  optional placement runs (PR30), reviewed written-answer rubric assessments
  (PR31). Release candidates v0.1.22 (run 38464791907) and v0.1.23 (run
  38466011224) passed all 12 CI jobs but failed candidate assembly on a
  transient GitHub API HTTP 502; both tags stay unpublished. PR32 adds bounded
  retry for read-only GitHub calls; next release uses a fresh version.
- Native pilot on this host still runs PUBLISHED Core 0.1.19 + course 0.1.4;
  QA enrollment preserved; operator unenrolled. Upgrade (stop, backup, restore
  drill, new pinned runtime, acceptance) waits for the next published release.
- Private: nine new verified illustrations committed (22b43da): 15/56 episodes
  now illustrated; 6,135 oracle cases, 22/22 negative controls, 45 browser
  cases. Course 0.1.5 = 0.1.4 + illustrations, packaged from clean commit
  9c47cf7 (digest dd72d513…) with compact members; acceptance through released
  Core in progress; NOT published or installed.
- Still open: retention/delayed checks (needs an SDK item contract), conversational
  assessment and model-proposed rubric findings, deadline/retention wakeups,
  remedial episodes/branches, completed-course Q&A, least-privilege DB role,
  load/resource review, live Google providers (user configuration + allowance).

# Core 0.1.19 released, consumed and deployed on the new host — 2026-10-13

Continuation on a new host (fresh clones; no prior-host state, secrets or learner
data transferred). Full approved v0.8 objective remains ACTIVE and incomplete.

- PR26 merged at its qualified head as main c4c6e66 after 12/12 hosted checks.
  Annotated tag v0.1.19 (object 4dcd4ae) dispatched release run 38456418473:
  identity + 12 CI + candidate assembly passed. Artifact 11844970096 digest
  matched GitHub's upload digest; candidate bytes and all 462 source members were
  re-verified against Git before a draft upload; hosted draft bytes compared equal;
  then published as prerelease https://github.com/roeehrl/course-core/releases/tag/v0.1.19.
- Released consumer: published assets installed through the released orchestrator;
  exact published web exports restored; independent verifier 1125 members/652 files.
  verification/released-runtime.mjs now pins 0.1.19 (0.1.17 kept as expectedCoreRelease17).
  Private 0.1.4 HTTP 56/56 and browser phone 56 + desktop/tablet 16 passed through it.
- Native pilot on this host: released runtime under the user's Application Support
  Course Core/Pilot/releases/v0.1.19, state in Pilot/state (0700, config 0600),
  checksum-verified Temporal CLI 1.9.1, dedicated PostgreSQL 17 database
  course_core_pilot. Four services running at http://127.0.0.1:4310 (admin /admin/).
  scripts/install-pilot-course.mjs imported the verified 0.1.4 package through the
  real review/publish/registry APIs: selected for new learners, 154 profiles. A
  separate QA account enrolled and passed episode 1 on phone; tablet/desktop resumed
  the same enrollment (verification/pilot-acceptance.mjs). Operator is UNENROLLED.
  The QA account's role was set to learner by SQL because Core has no membership
  API yet (gap: People and permissions administration).
- Real defect found by the live pilot: wide lesson code blocks were not keyboard
  scrollable on phones (axe scrollable-region-focusable). Fixed in Core PR27 with
  unit and 3-viewport browser coverage (negative control fails without the fix).
  Not yet released/deployed.
- Core PR27 (open): stored research source catalog, bounded inspection, evidence-
  backed review with rights, revocable/expiring optional episode attachments, admin
  Research sources view and learner optional-help panel. Local: API 288, learner 109,
  admin 54, connected learner 24, admin real 21, audit/infra pass. CI pending.
- No provider credentials or allowance are configured here; no paid calls; no live
  Google acceptance. Private hosted CI remains unverified (billing restriction noted
  earlier; not changed).

Next: PR27 CI → merge → 0.1.20 release → upgrade the native pilot preserving the QA
enrollment; People/permissions administration; remaining handoff items 5–8.

# Handoff prepared; catalogue CI complete — 2026-10-13

User requested transfer to another coding session, possibly on a different host
or fresh clone. Portable continuation is in planning/HANDOFF_TO_CLAUDE_CODE.md;
the approved v0.8 design and its five standalone HTML mockups are tracked privately.
No live config, credentials, learner database, vault key or ignored local state
is included. All implementation commits were already pushed; handoff additions
are committed separately. Prior goal reports paused, full objective incomplete.

Fresh authoritative check: PR26 remains OPEN at
4cae6ab52c82d3ebb56a412dbb177e68fd26aeab. Run38454055282 COMPLETED/SUCCESS,
all12required hosted checks PASS. It is NOT merged/released/deployed. This
supersedes the in-progress entry below. Current prior-host runtime remains
Core0.1.17/private0.1.4,all4services running,4QA enrollments and ownerunenrolled.
Do not assume any prior paths/services/dependencies exist on the destination.

# Catalogue release selection in hosted qualification — 2026-10-13

Private course0.1.4 is genuinely published/installed and native acceptance passed
(as below). New Core PR26 is attached and OPEN, at immutable source
4cae6ab52c82d3ebb56a412dbb177e68fd26aeab/root0.1.19:
https://github.com/roeehrl/course-core/pull/26
Actual CI38454055282 is LIVE/in_progress;11of12jobs PASS, only API/Postgres
and connected learner remains. Poll that SAME run; no failed job/restart/release
is established. Source is NOT released or installed.

PR26 shows one selected published release per course, with a reversible admin
Use for new learners action. Existing pins/evidence/progress/windows stay intact.
Migration015 backfills previous catalogues; scoped staff explicitly request
includeHistorical=true. Draft visibility retains its existing role restrictions;
explicit historic enrollment/staff assignment remains supported. New selection
uses catalog-first locks, runtime/digest validation, transactional audit, revision
fences and idempotency. Real PG7cases PASS include migration,rollback,permissions,
foreign-catalogue identity,stale/replay and racing legacy publication/selection.
Full API285/admin54/typechecks PASS; connected learner21scenarios and real admin
publication/selection/reload3viewports PASS. Publicsource audit clean.

Core checkout is clean codex/course-catalogue-default. Private main69f4a26
currently pushed; completed-course acceptance matrix updated. Native remains
Core0.1.17 with course0.1.4,4saved QA enrollments (old16/1/0 plus new1),operator
unenrolled,all4services running. No live model acceptance or paid calls.
NEXT:26CI terminal success before merge exactHEAD; immutable fresh Core release,
independent published consumer/native preservation/UI acceptance; source
inspection/review/rights/media and ALL remaining approvedv0.8 gates.
Do not treat the selected-release source increment as deployed or shrink the goal.

# Private course0.1.4 published and installed — 2026-10-13

Full v0.8 goal ACTIVE/incomplete. Private course0.1.4 is NOW actually published
through the native Core0.1.17 review workflow, with154 registered profiles
(115 recovery +39 optional independently verified worked examples). Exact source
4d370672251aa7367667e3122f8373e46a2ce61c; course digest
bf54e1289f1fda0c49c4a7d1ac4525376be5c666a0d08e8394021da38af669bb.
Private GitHub course-v0.1.4 artifacts published and hosted bytes independently
matched; archiveSHA8a40b0ae76a8f1dd9d49354d1cd69a273479019e90d88b1cafb72e07878c8a47.

Complete releasedCore HTTP56 and phone56 acceptance PASS; desktop/tablet16 each,
3practical families recovered,6assignments,unearned completion rejected every
episode and exhausted banks without extra charges. Private15tests PASS, including
package tampering,symlink/path-member rejection and exclusive no-overwrite.
Actual native phone enrollment passed original first-episode assessments, saved
completion and next-episode gate; tablet/desktop resumed that SAME saved QA
enrollment. Accessibility/nooverflow/0pageerrors and actual desktopAdmin PASS.
3old enrollment pins/progress/evidence/plans/policies preserved exactly; operator
remains unenrolled. Native now has4saved QA enrollments: old16/1/0 plus new1.

Owned native app stopped gracefully before consistent backup
v17-20261013185922670; actual disposable restore matched saved state. Added ONLY
the immutable isolated teaching verifier file to config; other provider/config
values unchanged. New owned installatione279b724-ecfb-4f7a-8d6c-8752add9ccf8,
instance d91ca8d0-e018-4725-8c13-9c220d2eb82d; all4services running. Fresh setup
credentials0/roles0/workspacebudgets0: no paid calls or live Google acceptance.
Preparation helper Date-vs-JSON-string comparison was corrected only after proving
serialized rows identical. Admin browser helper initially searched bare0.1.4;
correct actual Version0.1.4 control passed on retry, retaining QA progress.

The current catalogue lists historical published releases; this is availability,
NOT an implemented administrator-selected default release. Close this linear-UX
gap without repinning existing enrollments. Novel examples remain limited to
39math objectives; no arbitrary prose/learning-efficacy claim. Research25 is
merged but unreleased; complete inspection/review/rights/media, broaderSDK and
supervision, placement/caps/deadlines/privacy/ops and actual-provider acceptance
remain in the full goal. Native binaries deferred.

Receipts: evidence/course-0.1.4-acceptance.json and protected native/private.local
logs/receipts. Do not treat old status entries below as the current deployment.

# Private worked-example application and UI qualified — 2026-10-13

Full v0.8 goal ACTIVE/incomplete. New private verification/worked-example-flow.mjs
(sourcef7551b7) imports ONLY independently byte-verified published Core0.1.17;
no sibling/unpublished implementation. Actual prepared isolated Python constructor
accepted the private16positive/negative qualification examples and exact definition
SHA c5330df6e377eb7d6d69e6273a7391369f21f44ed57c83e3655b3bcaf6f6541d.

A new owned disposable PG schema and actualHTTP server imported/published the
proposed0.1.4 course bf54e1289f1fda0c49c4a7d1ac4525376be5c666a0d08e8394021da38af669bb
within the TEST environment, approved154profile registry, enabled learner-scoped
adaptive consent and used5SCRIPTED model rounds. Isolated reference rejected
wrong first draft, model repaired it, separate verification/application delivered
one correct example exactly once.3optional minutes/0additional episodes; no
mastery/evidence write and exact original gates unchanged. Duplicate application
replayed one receipt. Approved creator format brief reached the model prompt.

Actual delivered example UI PASS390/834/1440: reachable in linear reading and
review, completion remains disabled, Axe/nooverflow/0pageerrors. All viewport
contexts used the SAME test enrollment, preserving earlier reading. Test helper
initial failures were an application/json header on an empty publish POST and
later contexts trying to acknowledge already-read content instead of using
reading-review Part controls. Both corrected actual user paths passed; runtime
and native were not restarted for these helper failures.

Owned server/schema/sandbox storage cleaned after terminal success. Ignored
receipt .local/generated-teaching/application-receipt.json; logs
worked-example-application-retry.log and worked-example-browser-corrected.log;
screenshots worked-delivery-390/834/1440.png. Private14tests PASS. Declaration and
CPU1654/broker172 acceptances remain distinct from this integrated application
acceptance. External model remains SCRIPTED: no real Google/learning efficacy.

CRITICAL scope:0.1.4 is STILL STAGED; test 'published' means publication ONLY in
owned disposable test schema. It is NOT a saved production course release, not
installed as native default and did not change existing native0.1.3 pins. Before
actual0.1.4 installation, complete its full56episode/private published-artifact
release/creator registry/native configuration/authorized enrollment lifecycle
and actual learner acceptance. Preserve old progress; do not silently migrate pins.

Native Core0.1.17 remains running and qualified (ownership below); research25
MERGED after12hosted checks atdb3fe264f61a192c743a740c409278fcc66d5c17, main
 dea1d259d3d476e7ea70030371b30c0c2d6d2b96/root0.1.18. This research source is NOT
published/installed. No financial/password/GPU/miner/remote changes. Google setup
question pending; no actual provider/configuration/budget authority from silence.

Next: private0.1.4 complete delivery/56episode/native integration through released
Core; actual source inspection/content/rights review and approved YouTube/media
attachment/expiry/revocation/admin UI; broader creator SDK/episode/branch/visual
and placement/caps/deadline/privacy/operations/native-ready/livelearning objective.
Native binaries deferred. Do not treat arithmetic/application milestones as the
full requested breakthrough platform or reduce the remaining scope.

# Native0.1.17 upgrade genuinely verified — 2026-10-13

Fullv0.8goalACTIVE/incomplete. Published/consumer-qualified Core0.1.17 is NOW
ACTUALLY INSTALLED and running all4native services at http://127.0.0.1:4310.
Pin ~/Library/Application Support/Course Core/Pilot/releases/v0.1.17/course-core;
state ~/git/course-core/.local/pilot. Exact1105members/640files verified;
128dependency links all resolve inside pin; prior qualified Temporalbinary copied
and hashed. Provenanceactivated:true. Never use the development checkout as root.

Latest ownership: installationb774621a-327b-4577-9c79-8de2c853a610, label
com.coursecore.pilot.28b077471d07ed03.b774621a327b45779c798de2c853a610,
instance2906388b-a4d6-42c5-84ba-d0e33f2c2000. ObservedPIDs controller95572,
Temporal95582/API95636/worker95775/dispatcher95779; revalidate before control.

Old service was stopped by its authenticated owned control. Its response was
'stopping', so the first immediate backup correctly rejected remaining ownership.
Authoritative follow-up confirmed no owner/runlock/notrunning before backup.
No observer-timeout restart and no live unrelated agents/processes were touched.
New stronger consistent backupv17-20261013170654252 includes PGdump,SQLite,
config,key and snapshots of enrollments/plans/policies/budgets/provider-version
fingerprints/memberships. Actual new owned disposableDB restore passed; only
that owned DB removed.32byte backed-up key decrypts synthetic current vault probe.
Old validv8-20261013170556778 backup is retained too; no immutablebackup rewritten.

Before/after exact equality verified for configSHA,enrollments,plans,policy,
workspace/enrollmentbudgets,accounts,providerVersions/providerSettings. Only
expected013_supervisor_learner_model.sql added and matched published bytes.
New root installed with fresh owned manager after old owner was stopped; no
financial/wallet/password/GPU/miner or remote machine actions.

Actual nativeHTTP acceptance PASS. Old operator/QA identities renewed through
published bootstrap without printing tokens. Passwordless Unix-socket child URI
needed a local hostname plus explicit already-authenticated role; normalized
only in helper memory, not saved config.3saved enrollments,completed16/1/0,
ownerunenrolled. Observed credentials0,roles0,workspacebudget0/0; no live model.
Native desktopAdmin/phoneLearner real-browser acceptance PASS: course/provider
screens,3saved cards,compact pane ends abovecompanion,nooverflow,Axe,drawer/
returnfocus and0pageerrors. Initial helper failures were wrong 'Overview' heading
(actualCourse&releases) and not waiting for catalogue-to-roadmap transition;
corrected controls/actual UI passed. These were helper mistakes, not state loss.
Protected receipts Core/.local/pilot/native-v17-{migration,key-custody,http,
browser}.json; screenshotsnative-v17-admin.png/native-v17-learner.png. Existing
error diagnostics are stale prior attempts; latestbrowser-corrected.log is PASS.
Publicationreceipt nativeDeployed/privateConsumerVerified:true,liveProvider:false.

Private course0.1.3 remains pinned. New0.1.4 worked package still requires actual
published constructor/registry/model-tool/application qualification before new
course publication or opt-in enrollment. Research25 source/CI and remaining
inspection/review/media delivery are separate. All broader SDK/admin/visual/
episode/branch/placement/caps/deadline/privacy/operations/native-readiness/live
learning requirements remain. Google setup question pending; no paid authority
from silence. Native binaries deferred. Do not claim overall goal complete.

# Published0.1.17 private acceptance COMPLETE — 2026-10-13

Fullv0.8goalACTIVE/incomplete. Existing live handles56614/8385 are TERMINALsuccess0;
no duplicate/restarted acceptance process. Published Core0.1.17 and installed
member identity1105/640 independently verified against manifest
25a358dbf66c2532af7a98505949b833a8ffb0197e7ffc96a6827e5a947e2906.

HTTP all56episode path PASS,3practical families recovered,6committed assignments,
unearned completion rejected every episode. Finite bank2replacements/exhaustion
PASS, unchanged gate, no additional charge, unavailability explained. Actual
Postgres/releasedHTTP/isolatedPython, course0.1.3 baseline remains unchanged.
Browser PASSphone56,desktop16,tablet16: recovery, code draft preserved on reload,
no horizontaloverflow, code accessibility,0pageerrors. These are actual released
private consumer paths; they do NOT establish real provider or learning efficacy.
Owner remained unenrolled. Owned test schemas/processes cleaned at terminal.
Ignored private logs .local/private-v17-http-retry.log and browser-retry.log;
private verification pins now committed68a08f9. Earlier startup failure was missing
explicit passwordless test role in minimal childenv, now correctly normalized.

Active nativepilot remains0.1.10. NEXT actual installation gate: stage EXACT
published runtime/web bytes and self-contained dependencies under native
releases/v0.1.17; preserve fresh operator/account/coursepins/plans/budgets/config;
graceful owned service stop; consistent PG/Temporal/config/key backup; disposable
DB restore/key custody proof;0.1.17 activation with explicit root/state; actual
nativeHTTP plus owner/learner browser and state equality. Do not assume provider
credentials/budgets remain zero if user answered the pending Google setup question.
Never print secret sessions/config/key material; no other services/fleet controls.

Research development PR25/CI38434748255 and all broader objective work remain
incomplete as described below. Private worked0.1.4 staging/constructor/registry/
model-tool/application is still separate acceptance after baseline native upgrade.
No full goal completion, implicit paid calls or native mobile binaries.

# Published0.1.17 consumer active; public research queued — 2026-10-13

Fullv0.8goalACTIVE/incomplete.0.1.17 is genuinely PUBLISHED, independently byte
verified and installed in a private consumer; native upgrade still pending.
A separate research collection increment is locally qualified and awaiting CI.

- Public prerelease https://github.com/roeehrl/course-core/releases/tag/v0.1.17
  published2026-10-13T16:40:10Z,notdraft. Commit74e60f4c9b1f5116f6e5984185c23cb64cbf8dc8;
  tagObjectfd60139916c0ec72442796e7d9bfbecdbce5ee6d; fullrelease38428514171 success1.
  Immutableartifact11830606850 ZIP3705854B/SHA
  6d116fca4354a49d7160205fc5ff8a410d23f8fb759474e1d119b346ba6471be.
 7flatmembers/5archives/454source files compared to immutable Git and successful
 12CIjobs. Hosted draft assets downloaded/reverified BEFORE actual publication.
  ManifestSHA25a358dbf66c2532af7a98505949b833a8ffb0197e7ffc96a6827e5a947e2906.
  RuntimeSHA087bc7737990db41d42671a67679ac0ae20a9a66500a7754c8cce263057003bd.
- Private downloaded/hashed actual published assets. Fresh runtime
  .local/released-core-v0.1.17/course-core and assets
  .local/released-core-artifacts/v0.1.17. Released orchestrator installall PASS.
  Installer-regenerated exports moved to ignored backups, exact published web
  members restored. Independent verifier1105members/640unique files PASS. Pin
  verification/released-runtime.mjs now0.1.17; old published broker script explicitly
  retains expectedCoreRelease10 instead of silently borrowing latest identity.
- Private initial HTTP/browser attempts failed startup because a passwordless URL
  omitted its database role while the child intentionally strips inherited USER.
  Private harness now copies already-authenticated SELECTcurrent_user into URL;
  no password/secrets read. Old owned schemas/processes cleaned. Fresh live handles
 56614 HTTP /8385 browser; latest42/56completed and2practical recoveries/phone42.
  Poll SAME handles; an observation timeout does not authorize restart.
  Logs .local/private-v17-http-retry.log,private-v17-browser-retry.log. They are
  NOT completed acceptance yet. Course0.1.3 remains the tested/pinned baseline;
  proposed0.1.4 worked package still requires actual application integration.
- New Core PR25 https://github.com/roeehrl/course-core/pull/25 attached,OPEN,
  mainbase clean/pushed codex/public-topic-research at
  db3fe264f61a192c743a740c409278fcc66d5c17, root0.1.18. CI38434748255 queued.
  Integration preserves locally qualifiedf705881 source tree. This development
  branch is NOT part of published0.1.17 or any installed native runtime.
- Supervisor lists immutable creator public topics and stages up to2requests.
  Actual tool/consent/course/query receipts require separate plan verification;
  only application activates an outbox event. Distinct child research jobs share
  existing budget/deadline/fence checks. Public-query-only context excludes learner
  profile/history/attempts/keys. Fulltext/parts/sources/citations retainedunreviewed;
  providerHTML discarded. Dedicated can_collect_research authority cannot approve
  course adaptations. Child application publishes1unreviewed queue entry, no
  lesson/mastery or source-use/rights approval. Duplicate operations/event/job/
  application receipts do not resubmit search. Ordinary endpoints/debug/timeline
  are scoped metadata; owner/admin/instructor release endpoint reads untrusted
  output for review. Another learner gets404; learner staff route403.
- Core API278/typecheck and learner106/typecheck PASS. Actual PG/HTTP/Temporal14
  scenarios PASS:22scripted supervisor/research calls,8restarts,7lostapplyacks,
 27history replays/450payloads; no privatecanary/credit. External search is synthetic.
  Logs .local/public-research-api-final.log,public-research-learner-final.log,
  public-research-temporal.log. Publication to QUEUE is not source truth/lesson use.

Active native remains0.1.10; no stop/migration/deployment yet. User Google setup
question pending; preserve fresh settings/no paid authority from silence. No
miner/remoteMac/GPU/wallet changes. Failedimmutable0.1.15 remains untouched.
Next: existing private acceptance handles to terminal; native staged0.1.17
backup/disposable restore/key custody/state-preserving upgrade; newprivate
worked constructor/registry/model-tool/application. Continue25CI and actual
source fetching/inspection/relevance/content/rights review, approved media
attachment/expiry/revocation/administration, ALL remainingSDK/episode/visual/
branch/placement/caps/deadline/privacy/ops/native-readiness/livelearning gates.
Native binaries deferred. No full completion or smaller substitute objective.

# Published broker qualification passed;0.1.17 candidate live — 2026-10-13

Full v0.8 goal ACTIVE/incomplete. New actual isolation evidence and a fresh
immutable release candidate; no publication/course application/native upgrade.

PR24 MERGED after12hosted required checks atd30de2d4f37d9b5c56409a6ec2eda7aaaa0d3bc6.
Main74e60f4c9b1f5116f6e5984185c23cb64cbf8dc8 equals that qualified source tree;
root0.1.17. New annotated tagv0.1.17 objectfd60139916c0ec72442796e7d9bfbecdbce5ee6d
points to that exact commit. Workflow dispatched FROM tag with explicit commit:
run38428514171 confirmed QUEUED/live identity job. Preserve this handle:
https://github.com/roeehrl/course-core/actions/runs/38428514171
Core/.local/releases/v0.1.17/{expected-identity.json,verify.mjs} binds exact
repository/version/commit/tagObject/run. Verify immutable artifacts and live
successful12jobs before hosted publication; then independent released consumer
and state-preserving native qualification. Failedv0.1.15 remains unchanged and
unpublished; source0.1.16 readiness fix merged without separate release.

Private source6d79d6f adds verification/worked-example-broker.mjs. It imports ONLY
independently byte-verified PUBLISHED Core0.1.10 broker; no sibling/unpublished
installation API. Its delivery recheck1082members/627files matched pinned manifest
3d89d4b66b70275fd5246a7d9a6a041c21a206d3adb3709ccaf5a753cae60b19.
Actual prepared digest-pinned ARM64Python container execution PASS172positive/
negative cases covering all39topics at nominal and maximum-domain values plus
16constructor examples.8bounded batches,2548ms total reported execution,
14154outputbytes;128MiB/0.5CPU/5000ms/65536B limits; sourceDigest
f0cc7dd1ce9a90e62ae4f4109112696905442e1d37cff8bdd15ab9880f68a587.
Private verifier definition digest remains
c5330df6e377eb7d6d69e6273a7391369f21f44ed57c83e3655b3bcaf6f6541d.
Owned temporary broker storage removed after success. Receipt privateignored
.local/generated-teaching/broker-receipt.json; log.local/worked-example-broker.log.

This proves PROGRAM-ONLY execution in the published isolated broker. It grants no
registry approval, lesson/evidence/paid authority or new course release, and
proves no live model quality/arbitrary prose/pedagogical efficacy. Full private
constructor/registry/model-tool-check-repair/application integration needs the
PUBLISHED0.1.17 runtime and its actual consumer acceptance.

Active pilot0.1.10, SDK0.2.0 and course0.1.3 remain. Google setup question pending;
preserve any fresh user edits, no paid calls from silence/defaults. No original
miner/remoteMac/GPU/wallet work. Remaining full-scope work: current release and
private integration; creator SDK/admin extensibility; wider verified teaching,
visuals/whole episodes/branches; dedicated research/media dispatch/review/delivery;
placement/caps/deadline/privacy/operations/native-readiness and real provider/
learner acceptance. Native binaries deferred. Do not redefine completion around
these qualified mathematics/interface increments.

# Course-owned worked examples staged; creator guidance pending — 2026-10-13 19:03 IDT

Fullv0.8goalACTIVE/incomplete. New source and meaningful private arithmetic
acceptance progressed; no source-to-production or live teaching claim.

- Immutablev0.1.15 candidate38423148670 TERMINALLY FAILED in learner unit test
  'leaves a stale write refreshable': Refresh was clicked before the write lock
  released. No artifact/release published. Tag7bae6f7c095ab12738a813833ee42bbc2c29cd6c
  remains unchanged. LogCore/.local/releases/v0.1.15/learner-failure.log.
- PR23 MERGED after all12required checks atf4999a91cc514ff19402bcf5978f4ea2e66d402f;
  main65a24da67aee3a763360ad2579aafb561abaa544, root0.1.16. Regression actions now
  wait for their specific enabled control, not rendered notice/error. New held
  write proves Refresh cannot read/resubmit while busy and resumes explicitly
  after rejection. Learner106 tests/typecheck PASS; no application/budget change.
- PR24 https://github.com/roeehrl/course-core/pull/24 attached, main base, OPEN;
  cleancodex/creator-generation-guides atd30de2d4f37d9b5c56409a6ec2eda7aaaa0d3bc6,
  root0.1.17. Live CI38427176106; use that handle. source main integration preserves
  exact qualifiedf164ba4 tree. Creator generationBrief max3000 chars goes only to
  scoped current-episode model tools as content, not authority. Registry512 profiles
  under unchanged2MiB body,12000char projection,input/work/deadline/paid ceilings.
  Nongenerated adapters reject briefs; registry identity binds all edits.
- Local Core API276/typecheck PASS. Actual Postgres/HTTP/Temporal13 scenarios PASS,
 18scripted supervisor rounds,6restarts,5lost application acknowledgements,
 25history replays/406payloads. New tests: scoped brief to model/no credit;
  accepted142profiles;513/empty/oversize/wrong-adapter denied without registry
  revision changes. External models remain synthetic. Ignored logs
  .local/creator-guides-api.log,creator-guides-temporal.log.
- Private sourceff922d3 adds scripts/stage-worked-examples.mjs,
  runtime/worked-example-wrapper.py,verification/worked-examples.py and tests.
  Producer uses releasedSDK0.2.0 expression evaluator. Independent verifier uses
  separately authored procedural CPU references/finite differences; no generated
  key/expression is read as the oracle.39numeric topics, varied/max input examples,
  wrong math, changed scope and unsupported text:1654actual CPU checks PASS.
  Private14tests PASS; no GPU/model/wallet/worker experiment.
- Ignored private .local/generated-teaching/{verifier.json,registry.json,
  examples.json,proposed-course.compiled.json}. Definition60380bytes/digest
  c5330df6e377eb7d6d69e6273a7391369f21f44ed57c83e3655b3bcaf6f6541d;
  referenceData20490bytes.16constructor examples. Proposed0.1.4 preserves14/56
  curriculum and exact assessments/gates/policy.154profiles=115existing+39optional
  three-minute worked examples,0additionalepisodes. Repeated builds same bytes.
  Learner export contains no program/referenceData/expectedChecks/adaptation.
- This staging explicitly requires PUBLISHED Core0.1.17 before runtime/broker
  qualification and integration. It imports no unpublished Core interface. CPU
  checks are NOT actual broker/live model/learning acceptance. Arithmetic grammar
  clears39topics only; other17episodes and arbitrary novel prose remain open.
  Current course0.1.3 release/runtime and enrollments remain unchanged.

Active pinnedpilot0.1.10; SDK0.2.0. User Google configuration question still pending;
do not infer credentials/budgets from silence and preserve fresh user settings.
No new tag/publication/native migration, original fleet/GPU/wallet changes.
Next:24protectedCI/merge, fresh0.1.17 immutable release, exact delivered bytes,
released consumer+native backup/restore/key custody/state preservation; qualify
private worked package inside actual broker and real supervisor flow through
published interfaces. Continue ALL remaining SDK/admin authoring, broader novel
teaching/visual/episode/branch, research/media dispatch/review/delivery, placement/
caps/deadlines/privacy/operations/native-readiness and actual learner/provider
acceptance. Native binaries deferred. No goal completion or scope reduction.

# 0.1.15 immutable candidate dispatched — 2026-10-13

Full v0.8 goal ACTIVE/incomplete. PR22 merged only after all12 required checks.
Main commitf8dc30a9a9b885dac9c3e63e465d6034a0295c46 is byte-identical to qualified
headb129c7344442fd9699e02958e3e527585fe5d9e4. Rootversion0.1.15. No GitHub
release publication, private consumer update or native installation has occurred.

Fresh annotated tagv0.1.15 points to this exact commit; tag object
7bae6f7c095ab12738a813833ee42bbc2c29cd6c. Release workflow dispatched FROM that
tag with explicit commit input. Specific run38423148670 confirmed QUEUED:
https://github.com/roeehrl/course-core/actions/runs/38423148670
Poll that run; a transient observation timeout is not permission to restart it.
Immutable failed tags0.1.7/0.1.9 stay untouched.0.1.11–0.1.14 source milestones
merged without separate releases;0.1.15 combines them into a new candidate.

Ignored Core .local/releases/v0.1.15/expected-identity.json binds repository,
version,commit,tagObject,runId. verify.mjs is copied from the earlier operational
verifier and will recheck complete immutable source/asset bytes plus live CI/tag
identity. After success, download the exact immutable candidate artifact, verify
all members and hashes, stage a draft release, download/reverify its hosted bytes
before publication. Consumer must pin the new manifest SHA and independently
verify actual released archives/installed bytes. Then preserve fresh native
state with backup/disposable restore/key custody and actual upgrade acceptance.

Active native0.1.10, SDK0.2.0 and private course0.1.3 remain unchanged. Real Google
setup question remains pending; do not infer credentials/paid authority from
silence. Preserve any user configuration made through the existing admin UI.
Remaining objective includes real private-course generative verifier integration,
SDK/admin creator extensibility, rich visual/media/research/episode/branch delivery,
placement/caps/deadlines/privacy/operations and live learning acceptance. Native
binaries remain deferred; do not narrow success to the completed source milestones.

# Compact companion qualified; verifier and repair merged — 2026-10-13 18:22 IDT

Full v0.8 goal ACTIVE/incomplete. Source milestones20/21 merged; mobile layout
22 awaits its protected gate. No new release or native deployment yet.

- PR20 MERGED after all12checks at97b439669fcd9e4f322113b77d68602b9b9cd447;
  main mergebb0b9737a803c8e4b18ab843a2cf04c4bedaf2b3. Initial38418681452 failed
  a learner memory test that clicked while the previous write was still busy.
  The test now waits for Add-claim enabled, adds the empty claim, then waits for
  Save enabled. Application write-lock protection is unchanged. Specific targeted
  memory14 tests passed, and fresh hosted20/21 full gates passed subsequently.
- PR21 MERGED after all12 actual required checks at
  f507eb2206b97435ac3ce78a38e07d6dd9c1489a. Merge commit
  9625ae03380b5b7d0c95b7e200d3241195dec397; source main target0.1.14. Cancelled
  interpolated placeholder check names were old workflow artifacts; the actual
  required12 names and run38421055642 succeeded. No requirement was bypassed.
- PR22 attached https://github.com/roeehrl/course-core/pull/22, READY, main base,
  clean/pushed codex/mobile-companion-layout at
  b129c7344442fd9699e02958e3e527585fe5d9e4, root0.1.15. Current specific CI
 38422110495 live;11actual checks passed, API/connected gate in progress. Preserve
  this handle. Latest ancestry integration preserves exactly qualifiedea0eb706
  tree. The temporary ordinary Git release-integration worktree was removed.
- Compact layout follows runtime wide/font-scale/height decision instead of only
  CSS width. Header is separate; main has a keyboard-focusable bounded scroll
  pane; companion has its own footer row. Modal drawer/inert background/return
  focus and responsive drafts persist. Episode/view transitions reset both the
  appropriate main scroller and document position. Desktop keeps its side panel.
- Local learner105 tests/typecheck PASS. Full API connected21 and learner-owned
  connected9 PASS (30 total across desktop/phone/tablet). New geometry and actual
  element hit tests establish no companion overlap at reading/record text;1280x500
  short-wide landscape is compact; restored drawer focus, no overflow and Axe
  checks pass. Screenshot Core/.local/mobile-companion-phone.png was inspected:
  reference rejection text is unobscured and companion remains available below.
  Physical device and native-binary acceptance are still separate/deferred.
- Core ignored receipts: mobile-companion-export.log,
  mobile-companion-learner-tests.log,mobile-companion-geometry.log,
  mobile-companion-browser-full.log,mobile-companion-learner-connected.log.

Active pinned pilot remains0.1.10, SDK0.2.0, private course0.1.3. All course tests
used owned disposable test databases/schemas; no miner, remote Mac, GPU or wallet
changes. A pending asynchronous user question asks them to configure Google
credentials/models and an explicit budget directly in http://127.0.0.1:4310/admin/
for eventual live acceptance. Do not request secrets in chat, infer configuration
or paid authority from silence, or initiate dependent real model calls without
actual authorized configuration. The user may configure while engineering runs;
future native snapshots must read fresh metadata and preserve their changes,
not assume old credential/budget counts remain zero.

Next: complete22CI/merge, fresh immutable0.1.15 release candidate/hosted bytes and
released private consumer, backup/restore/key custody/state-preserving native
qualification; production course-owned verifiers using released interfaces.
Continue the full remaining SDK/admin creator controls, rich visual/episode/
branch authoring, research/media agent dispatch/review/delivery, placement/caps/
deadline/privacy/operations completion and real provider/learner acceptance.
The goal is not complete and has not been narrowed to these increments.

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
  ~/Library/Application Support/Course Core/Pilot/releases/v0.1.10/course-core
  State ~/git/course-core/.local/pilot. Explicit pinned root/state required.
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
~/Library/Application Support/Course Core/Pilot/releases/v0.1.10/course-core
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
  ~/Library/Application Support/Course Core/Pilot/releases/v0.1.8/course-core
  State remains ~/git/course-core/.local/pilot. Always pass explicit root
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
  ~/Library/Application Support/Course Core/Pilot/releases/v0.1.5/course-core
  and state ~/git/course-core/.local/pilot. Never touch other agents or
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
- PinnedruntimeSTAGED/ACTIVATEDoutofcheckout: ~/Library/Application Support/Course Core/Pilot/releases/v0.1.5/course-core,577archive members verified. Copiedfsdependencylinksinitiallyescapedtotheprivateconsumer;113linksrewrittenrelativeinsidepinnedroot/realpathverifiedbeforeactivation. Officialalready-qualifiedTemporalbinarycopied,digestrecorded. Nativequeuecourse-core-pilot unchanged. Source/.local cachesnot productiondependencies. Allfuture serviceCLI calls MUSTusepinned--root andexplicit--state ~/git/course-core/.local/pilot; defaultoldrepoROOT failsownershipcheck. Pinneddeploymentavoidsdevelopmentbuilds changingrestartcode.
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

- Public SDK: ~/git/course-sdk, https://github.com/roeehrl/course-sdk.
- Public core: ~/git/course-core, https://github.com/roeehrl/course-core. Source is still local and uncommitted/unpushed.
- Private course: ~/git/course-llms-and-models. Visibility reverified PRIVATE. First source commit 9cff06d2c474e2d463405c157e160dd811148557 is pushed. Later chapters, frozen evidence, practical and visual work remain uncommitted.
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
