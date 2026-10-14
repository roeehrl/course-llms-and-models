// Acceptance-only written answers. Each criterion maps to a sentence the learner
// actually wrote, so a reviewer can cite it; these are test fixtures, not model
// answers shown to learners, and passing review here says nothing about real
// learners' writing or reviewers' judgement.
export const writtenAnswers = {
  'wri-06-03': {
    text: 'Teacher forcing turns [4,2,7,1] into inputs [4,2,7] and targets [2,7,1], so each position predicts the next token. Without the causal mask, position 0 can attend to input position 1, and that token 2 is exactly the target of position 0, so the model can read the answer it should predict. A correct label shift does not repair a missing mask; the shift and the mask are separate contracts. To detect it, change only a future token and check that the logits at earlier positions stay unchanged.',
    quotes: { shift: 'inputs [4,2,7] and targets [2,7,1]', leak: 'that token 2 is exactly the target of position 0', separate: 'A correct label shift does not repair a missing mask', detect: 'change only a future token and check that the logits at earlier positions stay unchanged' },
  },
  'wri-12-01': {
    text: 'Finiteness only shows there is no NaN or infinity; it says nothing about whether the coordinates are right. Repeating the candidate only shows it returns the same wrong answer every time. Comparing each coordinate with the reference rejects it: the maximum absolute coordinate error is 1. The sum is 10 for both vectors, so an aggregate check hides the swap.',
    quotes: { finite: 'Finiteness only shows there is no NaN or infinity', repeatable: 'Repeating the candidate only shows it returns the same wrong answer every time', oracle: 'the maximum absolute coordinate error is 1', aggregate: 'The sum is 10 for both vectors' },
  },
  'wri-12-04': {
    text: 'The saved coordinate probe directly shows a layout defect in the original kernel. Whether that defect caused the shared-run damage is still a hypothesis; the probe alone does not establish it. I propose isolating the affected path, and an authorized operator decides whether to do that. A next test is a read-only comparison that separates a representation error from accumulated backward precision.',
    quotes: { supported: 'The saved coordinate probe directly shows a layout defect in the original kernel', hypothesis: 'Whether that defect caused the shared-run damage is still a hypothesis', containment: 'an authorized operator decides whether to do that', 'next-test': 'a read-only comparison that separates a representation error from accumulated backward precision' },
  },
  'wri-14-04': {
    text: 'The gradient is (2w-4)*2, which is -4 at w=1, so the first update gives 1.4 and the second gives 1.64. The bad version keeps the first gradient and adds it to the second instead of resetting it, which is how it reaches 2.04. Its small final loss on one example does not show the update is right; compare the weights with an independent reference trace. A stale-accumulation negative control would catch it.',
    quotes: { updates: 'the first update gives 1.4 and the second gives 1.64', stale: 'keeps the first gradient and adds it to the second instead of resetting it', loss: 'Its small final loss on one example does not show the update is right', control: 'A stale-accumulation negative control would catch it' },
  },
};
