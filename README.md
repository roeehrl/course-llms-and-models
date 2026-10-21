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
