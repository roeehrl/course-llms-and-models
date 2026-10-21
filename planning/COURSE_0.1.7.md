# Course 0.1.7: release preparation

Status: staged and accepted against the released Core 0.1.50 runtime. **Not tagged,
published or installed on the pilot.** Results are in
`evidence/course-0.1.7-acceptance.json`.

Course 0.1.7 is course 0.1.6 plus the work merged in #5 (misconceptions and probes,
eleven chapter labs, the graded portfolio, the worked adaptive episode of design
section 16, research topics and the study definition) and the follow-ups below.
Contract: SDK 0.5.0, minimum Core 0.1.48, 159 adaptation profiles (5 remedial), 57
visuals, 11 package members. Course digest
`e404e0d02d7d713ee5e6384c0f8b37b0bc369ac9dc631db18c1c1aa9c5c0afc3`.

## Follow-ups in this change

### Section 16 phase selector labels

The scene's phase selector showed the internal ids (`ready`, `forward2`, `backward2`).
The released renderer (`@course-core/visuals` 0.1.0 here, 0.4.0 inside Core 0.1.50)
shows each enum option's value as its text and has no separate option labels, so the
scene's state now uses the labels themselves: "Start (nothing run)", "1. Forward",
"2. Backward", "3. Update", "4. Forward again", "5. Backward again". Internal ids stay
in the generator and the oracle. The labels are kept per locale
(`PHASE_LABELS` in `scripts/create-worked-adaptive-scene.mjs`). SDK 0.5.0 courses declare
one locale and this course declares `en`; Hebrew labels are prepared, and building the
scene for a locale without labels fails. The rest of the scene's text is English like
every other illustration, so a Hebrew course still needs the whole scene translated.

### Why the scene's numbers are fixed

Design section 16 fixes the example (x = 2, target 3, w = 0.5, b = 0, learning rate 0.1)
and asks for separate controls that keep the numbers, the code highlight and the graph in
step. It does not ask for learner-editable inputs, and its "validate against a scalar
oracle" requirement is about the personal episode. With fixed inputs a live model inside
the scene would draw the same values, while the phase notes and the text alternative,
which state those values in prose, could not follow a change. The generator computes each
value once and the scene only selects and rounds it per phase;
`verification/worked-adaptive-episode.py` checks every frame against a closed-form oracle,
tape autograd and finite differences and rejects a wrong-sign update and a backward that
writes parameters. The renderer's expression depth limit (16) also leaves no room for the
whole model inside the per-phase selections. Fixed values are therefore the right choice
for this scene; the reasoning is also in the generator's header.

### The transfer is revisited later

Design section 16 asks to store the transfer answer and revisit it later. Retention is
scheduled per objective, and fnd-o04-02 had no retention items: its numerical recipe has
nine combinations and all nine are recovery variants. Four authored held-out items now
revisit the same middle pipeline split with new numbers (weight gradient 1.5, weight
before any step 1.75, upstream sensitivity -1.5, weight after one step 1.25).
`verification/evidence-features.py` recomputes each with exact fractions, checks that an
answer from another part of the procedure is wrong, and that the transfer's own numbers
are not reused. Retention is now 7 objectives and 28 items at 2, 7 and 21 days.

## Acceptance on released Core 0.1.50

Released assets downloaded from the v0.1.50 release are byte-identical to the candidate
that Core's own acceptance used; the runtime's installed files were checked against the
release manifest. Disposable PostgreSQL 17 schema, scripted models only.

| Run | Result |
| --- | --- |
| `verification/learner-flow.mjs --worked-course` (HTTP) | pass, 206 s: 56 episodes with recovery, all 11 labs, revisit scheduled |
| `verification/learner-flow.mjs --worked-course --browser` | pass, 357 s: phone 56 episodes, desktop 16, tablet 4 after placement; 0 page errors |
| `verification/feature-flow.mjs --worked-course` | pass, 77 s: all 8 flows |
| `verification/install-flow.mjs` on the extracted release archive | pass |

Labs: each of the eleven labs was answered through `POST /answers` and graded by Core's
code grader in its Docker sandbox (the qualified Python image). For every lab the authored
starter and one plausible wrong implementation (`verification/lab-submissions.mjs`) were
rejected and the reference passed every hidden case; no lab changed its episode's gate.
The three capstone practical families (autodiff, decoder, qualification) were failed,
recovered with fresh variants and passed as before. The portfolio and the four written
explanations went to review without blocking completion.

Section 16 scene, inside the released learner app at 390, 834 and 1440 px: the selector
lists the six labels, each phase drawn shows the design's numbers, the Forward, Backward,
Update and Reset buttons and Enter on a focused button move one step and keep the
selector in step, no horizontal overflow, no axe violations in the player.

What failed first, and the fixes:

- The released-runtime harness refused the package: it required exactly the three
  qualified registries and so could not load the lab registries. It now accepts the five
  registries 0.1.7 ships.
- The harness had no answer for the portfolio, the final episode's new reviewed item; a
  mechanics fixture was added to `verification/written-answers.mjs`.
- The first browser scene check ran after the scene's reading part had been marked read,
  when the app had already moved on and removed the card. The check now runs while that
  part is the current card. This was a test-order problem, not a product defect.

Not verified: live providers; learning effectiveness; a due fnd-o04-02 check answered
(the schedule and the not-yet-due refusal were checked; answering a due check is covered
for fnd-o03-03); the Hebrew labels in a running course; the pilot install.

## Building the release

From a clean checkout of the merge commit (Node 26, `npm ci`):

```sh
npm run package:worked -- --output <new dir>/course-v0.1.7
npm run package:release -- --package <new dir>/course-v0.1.7 --output <new dir>/course-v0.1.7.tgz
```

The second command writes `course-v0.1.7.tgz` and `course-v0.1.7.sha256`. The archive is
reproducible: members sorted, owner 0:0, modes 0700/0600, every time set to the source
commit's committer time, gzip without name or time. Two builds from one commit give the
same bytes (`test/release-archive.test.mjs`); the digest changes with the commit because
`package.json` records it.

## Installing on the pilot

The package carries the five code-fixture registries. Three are byte-identical to 0.1.6's;
the two lab registries are new and must be in the pilot's `codeFixtureFiles` before
install, or the installer stops at "Qualified code graders are not ready". The teaching
verifier and the adaptation adapters are unchanged from 0.1.6.

1. Stage the archive under the pilot's `course/` directory as `course/v0.1.7` (owner-only,
   0700 directory, 0600 files; the archive already carries these modes) and check its
   SHA-256 against the release's `.sha256`.
2. Keep a copy of `state/config.json`, then append to `codeFixtureFiles`:
   `<Pilot>/course/v0.1.7/code-fixtures-labs-a.json` and
   `<Pilot>/course/v0.1.7/code-fixtures-labs-b.json`. Leave the three existing entries
   (earlier enrollments are pinned to releases that use them).
3. Restart the pilot from its active Core release (`node deploy/local/pilot.mjs stop`,
   then `start`, then `status`) and check health.
4. Install: `node scripts/install-pilot-course.mjs --origin http://localhost:4310
   --package <Pilot>/course/v0.1.7 --bootstrap <Pilot>/state/bootstrap.json --login
   <operator>`. It verifies the package, checks that all five registries are code-ready
   with matching digests, imports, reviews, publishes and approves the registry, and
   refuses a second install of the same digest.
5. Existing enrollments stay on their release; new learners get 0.1.7.
