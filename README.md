# From dummy to professional: LLMs and models

Private course module built through the public Course SDK. The runtime remains
course-agnostic. Do not copy this content, assessment bank or planning directory
into either public repository.

```sh
npm ci --ignore-scripts
npm test
npm run build:preview
```

The explicit preview command labels incomplete content as a development preview.
`npm run build` refuses to build the complete course until all fourteen chapters
and fifty-six episodes are present and pass authoring checks. Bundles in `dist/`
are private; even the learner projection is only for authenticated course access.
Import the manifest through Course Core’s authorized release endpoint. Answer
keys stay in the server bundle and are never included in the web application.

`content/course-config.json` contains the administrator-editable pilot defaults:
ninety calendar days in UTC, capped additional work and thirty extension days
with explicit learner consent. These are visible author defaults, not a claim
that the learner has selected a deadline. Enrollment must display the resolved
policy; existing enrollments require an explicit policy migration.

Practical graders, verified novel questions, interactive visuals, live supervision,
deployment and learner acceptance remain tracked in `planning/IMPLEMENTATION_STATUS.md`.
The authored review files contain answer material and must not be served as lessons.

CI (`.github/workflows/ci.yml`) runs three jobs on every pull request and push to
`main`: the authoring, arithmetic, practical, recovery, visual and content checks;
the worked course on the released Core runtime it is pinned to (installed from the
public release assets by `node scripts/install-released-core.mjs`, Postgres 17,
Docker code sandbox, scripted models); and an accessibility walk of that released
learner app at phone, tablet and desktop sizes with axe (WCAG 2.1 A/AA rules). None of
these call a live model provider or prove deployment.

## Release assets

`npm run package:worked -- --output <dir>/course-v<version>` builds the verified package
directory; `npm run package:release -- --package <dir>/course-v<version> --output
<dir>/course-v<version>.tgz` then writes, reproducibly, two archives of the same files:

- `llms-and-models-<version>.course.tgz` and its `.sha256`: Course Core's install format
  (course-package v1: flat regular files plus `course-package.json`;
  `scripts/pack-core-package.mjs`). Administration's **Install a new version** accepts it
  by upload or from the GitHub release link; it is the only `*.course.tgz` asset, so Core
  picks it without asking and checks the `.sha256`.
- `course-v<version>.tgz` and its `.sha256`: one `course-v<version>/` directory, the form
  `scripts/install-pilot-course.mjs` and the release checks extract. Core does not accept
  this file as a package.

Before installing through administration, the host needs the teaching verifier
(`worked-example-verifier.json`) in its teaching verifier files and the four adaptation
adapters enabled, as for the script install; host files must be owner-only (0600). The five
code-fixture registries can either be configured on the host as before (the preview then
lists them as identical) or, with Core's `COURSE_SUPPLIED_CODE_FIXTURES=on`, approved from
the package during the install. In that second case the preview reports the recovery
registry as not yet approvable (`EVALUATOR_NOT_CONFIGURED`) because the graders are installed
only by that approval; the installation's registry step then approves it right after.
`verification/admin-install-flow.mjs` (CI, released Core job) checks both hosts.

`scripts/install-pilot-course.mjs` installs the extracted `course-v<version>/` directory
through Core's review and publish APIs instead. Before publishing it prints Core's publish
impact (learners on the live release, learners part-way through changed lessons, what
changes) and publishes only after the operator types the exact version, sending that
impact's digest as administration does. It resumes a release that is already in the
workspace from its state (in review, approved, published), so a run stopped at the prompt
is finished by running it again; on a complete install it changes nothing.
