# Course 0.1.8: plain-language terms in lesson 1.1

Status: staged only. **Not tagged, published or installed on the pilot**, and not yet
accepted against a released Core runtime.

Course 0.1.8 is course 0.1.7 with one teaching-text change. Contract unchanged from 0.1.7:
SDK 0.5.0, minimum Core 0.1.48, 159 adaptation profiles (5 remedial), 57 visuals, 11
package members. Course digest
`2f56f3ad1a62e8fb533763be24c55416db379dabcf080b4c99f5aa1e446163f7`.

## Why

Lesson 1.1 (`fnd-e01-01`, "A model is a parameterized program") used "error",
"objective", "dataset" and "target" without saying what they mean. "Loss" is first
defined in 1.2, so a learner starting from nothing met these words cold, and could be
asked about them by the tutor.

## What changed

Block `fnd-01-01-text-1` now defines each term in plain language where it first appears,
with a small example built from the lesson's own numbers (`predict(4) = 5.5` against a
target of `7`):

- **Example and error** (first paragraph): an example pairs an input with its correct
  answer; the error is how far the model's output lands from it (`5.5` where `7` was
  correct misses by `1.5`).
- **Objective** (second paragraph): the one score training tries to improve, such as the
  average error over all examples; a low average can hide large errors on rare inputs.
- **Dataset and target** (last paragraph): a dataset is the collection of examples; the
  target is the correct answer recorded for an input, supplied by the task rather than
  produced by `predict`.

"Loss" is still introduced in 1.2; 1.1 does not use it. `fnd-01-01-text-2` already uses
"target" only after this definition, so it is unchanged. No assessment, answer key,
gate, misconception annotation or adaptation binding refers to the changed sentences, and
none changed. Lesson 1.1 grows from 482 to 570 words (prose without code 453 to 541);
the word-count table in `content/foundations-review.md` is updated.

The course declares one locale (`en`) and carries no Hebrew lesson text, so there is no
translation to update.

## Checks

`npm test`, `verify:math`, `build`, `verify:practicals`, `verify:recovery`,
`verify:visuals` and `verify:content` pass locally (Node 22; CI uses Node 26). The
released-runtime acceptance (`verification/learner-flow.mjs --worked-course`, HTTP and
browser) runs in CI and was not run locally. No live model provider was called.

## Release

Build and install as described for 0.1.7 in `planning/COURSE_0.1.7.md`, replacing
`v0.1.7` with `v0.1.8`. The five code-fixture registries are unchanged from 0.1.7.
