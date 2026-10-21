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
  // The final portfolio (content/portfolio.json). A mechanics fixture only: it exercises
  // submission and pending review, and says nothing about what a reviewer would accept.
  'portfolio-final': {
    text: [
      '1. Tiny model and gradient tests. In the Capstone A suite I implemented scalar reverse-mode autodiff. At w = 1 the analytic gradient was -4 and the central finite difference gave -4.000000 with tolerance 1e-6, so they agree. Negative control: a version that kept stale gradient accumulation between steps was rejected by the Chapter 1 lab case that runs two backward calls before one step.',
      '2. Execution trace. Forward reads w and b and saves activations; backward reads the saved activations and writes the gradient buffers; the optimizer update reads the gradient buffers and writes the parameters and the optimizer state. Parameters change only at the optimizer update. Parameters, gradients and optimizer state are separate buffers.',
      '3. Incident reconstruction. Measured: the failed gate and the digests quoted in the chapter 12 material, each with its date. Inferred: the cause of the corruption. It remains uncertain whether the layout defect caused the shared-run damage. A healthy loss plot or a completed job does not show shared-run corruption, accepted work or payment.',
      '4. Bounded improvement proposal. Tile the attention backward. The invariant compares forward values, gradients and two optimizer transitions from identical initial state against the reference. The matched benchmark uses the same shapes, data, precision and warm-up for baseline and change, and tests the predicted memory-bandwidth bottleneck. I would abandon it if any gradient differs beyond tolerance or the matched benchmark shows no saving; the Chapter 12 lab and the Capstone B suite would need new evidence.',
      '5. Limits. This portfolio is not professional certification, not proof of production safety and not a rollout approval.',
      'Assistance: none was used.',
    ].join('\n\n'),
    quotes: {
      'model-gradient-check': 'the central finite difference gave -4.000000 with tolerance 1e-6',
      'negative-control': 'a version that kept stale gradient accumulation between steps was rejected',
      'state-trace': 'Parameters change only at the optimizer update',
      'evidence-separation': 'It remains uncertain whether the layout defect caused the shared-run damage',
      'no-overclaim': 'A healthy loss plot or a completed job does not show shared-run corruption, accepted work or payment',
      'proposal-invariant': 'compares forward values, gradients and two optimizer transitions from identical initial state',
      'proposal-benchmark': 'the same shapes, data, precision and warm-up for baseline and change',
      'proposal-abandon': 'I would abandon it if any gradient differs beyond tolerance',
      limits: 'not professional certification, not proof of production safety and not a rollout approval',
    },
  },
};
