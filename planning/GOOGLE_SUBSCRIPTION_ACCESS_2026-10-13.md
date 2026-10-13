# Google subscription access and course inference

Reviewed 2026-10-13 against current official documentation. This is a provider
decision record, not account inspection, benefit redemption or live acceptance.
No subscription was purchased, billing changed or model called.

## Supported route

Google AI Pro and Ultra include Google Developer Program benefits. The current
[plans table](https://developers.google.com/program/plans-and-pricing) lists
monthly GenAI/Cloud credits of USD10 for Pro, USD40 for Ultra20TB and USD100 for
Ultra30TB. A basic Google One storage plan is not equivalent to an AI plan.
Benefits need activation against the developer profile and billing account.
[Google's developer announcement](https://blog.google/innovation-and-ai/technology/developers-tools/gdp-premium-ai-pro-ultra/)
explicitly describes using subscription developer credits toward Gemini API.
These credits offset metered API charges; consumer app quotas do not become an
unlimited API entitlement. Credits also cover other eligible Cloud usage, so the
entire headline amount cannot be assumed available to this course.

[Gemini billing](https://ai.google.dev/gemini-api/docs/billing) says Prepay accounts
must first add funds before using promotional Cloud credits, and those credits
are then consumed before prepaid funds. Project caps have reporting latency and
long-running operations can overrun them. A billing alert is not our application's
authorization to start more work. No automatic reload should be assumed enabled
or authorized by selecting a model.

## Consumer CLI is not an application inference backend

The current [Antigravity FAQ](https://antigravity.google/docs/faq) distinguishes
direct headless scripts/CI from wrapping its CLI inside third-party applications;
the latter is unsupported on consumer plans. Its
[terms](https://www.antigravity.google/terms) also restrict third-party service
access with consumer OAuth. Although the official
[headless interface](https://antigravity.google/docs/cli/headless/) supplies JSON,
streaming and programmatic input, those mechanics do not grant an entitlement to
serve our course supervisor or companion through a consumer subscription. Do not
ship token extraction, browser-session proxies or a CLI-wrapping provider.

Historical Gemini CLI subscription guidance is stale: the official
[consumer deprecation notice](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals)
records withdrawal of consumer Gemini CLI/Code Assist access on June18,2026.
Enterprise/API access is a distinct product and billing contract, not a way to
reuse the consumer allowance.

## Video and free access

[Google One's Ultra benefits](https://support.google.com/googleone/answer/16286513?hl=en)
describe video creation inside Flow. That does not establish use of its consumer
allowance by our application's video provider. Automatic media generation needs
an approved developer interface and its own capability and cost qualification.
Current [Veo pricing](https://ai.google.dev/gemini-api/docs/pricing#veo-3.1) has no
free API tier. A manual creator-import workflow may use reviewed, appropriately
licensed videos created elsewhere; it is separate from automatic generation.

Some text models have an API free tier, but this has model-specific limits and
different data-use conditions. The same pricing page marks free-tier processing
as usable for product improvement. Do not silently move private learner history
to that tier or present it as equivalent to paid-service privacy.

## Implementation implications

- Retain supported Google API integration and provider-neutral contracts.
- Explain subscription credits during setup as an external billing benefit,
  with a dated documentation link, never as a new authenticated model provider.
- Continue reserving gross API costs before work. Credits must not reduce the
  application's cost reservation or create automatic spend permission. Unknown
  credit balances and prices remain unknown rather than zero.
- Keep separate allowances for tutoring, supervision, research and expensive
  media, plus conservative global ceilings and visible usage/rejection receipts.
- Qualify inexpensive models for routine work and stronger models for demanding
  teaching decisions. Cache reusable public material and bound retrieved history;
  do not compromise grading or truncate context silently to save cost.
- A subscription-credit-aware account walkthrough is still needed after the
  user configures the actual account securely. No assumption is made about this
  user's subscription, remaining credit, project eligibility or approved spend.

Buying a more expensive subscription solely for its developer credits is not
automatically cheaper. Compare its incremental fee with actual measured course
usage and the other subscription benefits the user values.
