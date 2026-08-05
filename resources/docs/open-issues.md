# Open issues

Reported but not yet planned. Distinct from
[`application-features.md#known-gaps`](application-features.md#known-gaps),
which lists verified gaps already sequenced in the implementation plan.

## Behaviour

1. **Budget rejects too aggressively** — too many reject calls; consider
   disabling the budget guard temporarily while it is retuned.
2. **Error trapping bypasses LogBox** — `ApplicationErrorLogService` traps errors
   that should flow through LogBox. Decide which owns error logging and remove
   the other path.
3. **Run inputs are not persisted** — Review and Modernize form values are not
   stored, so opening a run from history cannot show what was actually
   submitted. Persist the normalized input with the run.

## Performance

4. **Front end over-polls** — `public/assets/app.js` makes excessive backend
   calls. Audit polling intervals and collapse redundant requests.
5. **`/aiflight` over-polls** — same problem in the module viewer
   (`pollSeconds` default is 2).

## UI

6. **"Slice definition of done" button alignment** is inconsistent.
7. **"Live evidence" section text overlaps** — layout defect.
8. **No file picker tree** — `/review` should show a directory tree on the right
   after a directory is added, allowing files to be selected or excluded before
   scanning.

## Worth investigating

**bx-ai middleware may replace hand-rolled resilience and telemetry.**
`aiAgent()` accepts a `middleware` array with built-in `RetryMiddleware`
(exponential backoff), `LoggingMiddleware`, and `FlightRecorderMiddleware`
(records LLM and tool interactions to a JSON fixture for replay).

If these cover the retry and telemetry paths, the `ProviderResilienceService`
and `AiTelemetryExtractor` extractions in the plan shrink to thin adapters, and
several hundred hand-rolled lines delete instead of moving.
`FlightRecorderMiddleware` may also be a cheaper corpus-replay mechanism than
re-running providers. **Verify against the installed bx-ai version before
designing either service** — do not assume the API from documentation alone.

Reference: <https://ai.ortusbooks.com/main-components/agents/middleware>

**Asynchronous programming** —
<https://boxlang.ortusbooks.com/boxlang-framework/asynchronous-programming>
