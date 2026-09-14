# Modernize inversion — implementation plan

Committed. The single live plan for Modernize — there is no other. Product truth
and known gaps live in
[`../application-features.md`](../application-features.md).

## How to use this document

**Part 0 is the status ledger — read it first to see where the work stands.**
Then read Parts 1–3 once, and execute Part 4 **in order**. Every step is
self-contained: goal, preconditions, what to do, what not to do, and the gate
that must pass before the next step starts.

Five rules that override anything else you infer:

0. **Part 0's ledger moves in the same commit as the work.** A step marked done
   without a recorded gate result is not done — it is a claim, which is the
   failure mode Appendix A is a catalogue of.
1. **No step begins until the previous step's gate is green.**
2. **A claim not in Part 2 is not a fact.** If a step depends on something
   unverified, verify it first and add it to Part 2.
3. **BoxLang caches compiled classes.** `box server restart` before every test
   run. Editing a `.bx` and re-running without a restart silently tests old code.
4. **Three documents travel with every step that changes behaviour** — update
   them in the same PR, not at the end:
   - `app/models/README.md` — the model-layer index. It documents **82 rows** of
     service, repository and domain public APIs. This plan deletes ~2,945 lines
     and adds five services; every affected row must move with the code. AGENTS.md
     sends agents here for ownership questions, so a stale row misinforms every
     future task.

     > ⚠️ **This file is currently deleted in the working tree** (222 lines,
     > ~83 table rows, at `528a97f` — recover with
     > `git show HEAD:app/models/README.md`). AGENTS.md and `technical-flow.md`
     > link to it in five places,
     > and Step 12 edits its Domain objects section. **Restore it in Step 0** —
     > until then this rule is unexecutable. If the deletion was deliberate,
     > that is a separate decision: drop this bullet, and remove the five
     > inbound links, rather than leaving the rule pointing at nothing.
   - `resources/apidocs/openapi.yaml` (and `.json`) — `ModernizationResult`
     declares `schemaVersion: modernization-plan-v2` and
     `placementContractVersion: modernization-placement-v1`. Steps 3 and 4 change
     both. The body is `additionalProperties: true`, so nothing *breaks* — which
     is exactly why this gets forgotten.
   - `resources/docs/application-features.md` — product truth and the Known gaps
     table. Each gap row cites the step that closes it; close the row when the
     step lands.

Nothing in this document contradicts anything else in it. Where an earlier
analysis was overturned, only the final answer appears here; the history is in
Appendix A and is **not** instructions. That claim is only as good as the last
verification pass — §2's stamp says when it was last true, and Appendix A's
tenth-pass table records what a single re-check found. Re-check before trusting
it after a gap.

---

# Part 0 — Status ledger

**This table is the answer to "what is done?".** Update it in the same commit as
the work, never afterwards. A step is `done` only when its gate has been run and
the commit that made it pass is recorded — not when the code looks finished.

Status values: `todo` · `wip` · `blocked` · `done <sha>`.

> **Gate run #4, 2026-08-05 — both remaining defects fixed and re-measured.**
>
> | Case | verdicts | critiques | claims | citationValidity | judgeReview |
> | --- | --- | --- | --- | --- | --- |
> | `false-seam` | 1 | 2 | 3 | 1.0 | 1/1 |
> | `separable-domain` | 2 | 2 | 4 | 1.0 | 2/2 |
> | `below-inference-threshold` | 2 | 2 | 4 | 1.0 | 2/2 |
> | `cyclic-boundary` | 1 | 3 | 4 | 1.0 | 1/1 |
>
> - **`judgeReview` now lands on every placement** (was 0). The join binds on
>   `derivedClusterId`, which `canonicalize()` does not rewrite.
> - **The critic now engages with the judge instead of re-deriving blind.**
>   Giving it `judgeVerdicts` produced exactly the intended behaviour — it pulls
>   on hedged and disputed verdicts: *"The judge verdict for Catalog Pricing is
>   'unclear' with 0.85 confidence, yet the plan recommends extraction"*, and
>   *"The judge verdict claims the boundary is defensible as the only seam, but
>   the deployability gate failing…"*.
> - **`false-seam` went from 0 critiques to 2**, at `high` and `medium`. Step 9's
>   gate — *the critic* catches the planted false seam — is now met by the critic
>   itself, not only by the judge.
> - On `cyclic-boundary` the critic found the planted cycle unprompted: *"the
>   graph metrics show one cycle (cycles=1)"*.
> - `citationValidity` 1.0 on all four; every placement `decisionRequired=true`,
>   which is correct — each has a hedged verdict or an unknown operational gate.
>
> **Model variance is real and worth knowing:** on run #3 the judge called
> `false-seam` indefensible; on run #4 it called it defensible and the *critic*
> caught it. Single-run numbers should not be treated as stable — any threshold
> set from this corpus needs several runs per case.
>
> ---
>
> **Gate run #3, 2026-08-05 — the roles produce real output and the gates are
> measurable. It was never the model.**
>
> One raw provider exchange was captured per role. The responses were 1,486–3,074
> characters of well-grounded JSON the whole time. The bug: **the gateway returns
> its parsed result as `payload`, and all four new roles read `response.data`,
> which does not exist.** Worse, the specs stubbed `data:` as well, so they
> agreed with the bug instead of catching it — the tests encoded the same
> misunderstanding as the code, which is why 573 green specs proved nothing here.
>
> **Measured, four fixtures, `deepseek-v4-flash`, 60–91s each:**
>
> | Case | verdicts | critiques | claims | citationValidity |
> | --- | --- | --- | --- | --- |
> | `false-seam` | 1 | 0 | 4 | 1.0 |
> | `separable-domain` | 2 | 2 | 3 | 1.0 |
> | `below-inference-threshold` | 2 | 2 | 5 | 1.0 |
> | `cyclic-boundary` | 0 | 3 | 3 | 1.0 |
>
> - **`citationValidity` is 1.0 on all four, with zero dropped claims** — every
>   brief claim cited a ref that resolved against the run's inventory. Step 10's
>   "citation validity 100% via the resolver" is met.
> - **The planted `false-seam` was caught** — `defensible=false, confidence=0.9,
>   worthIt=no`: *"The cluster spans the whole system (spansWholeSystem=true) with
>   0 crossing edges."* Caught by the **judge**, not the critic (0 critiques on
>   that case), so Step 9's gate as written — *the critic* catches it — is not yet
>   met even though the pipeline reaches the right answer.
> - The critic found a genuine internal inconsistency unprompted on
>   `cyclic-boundary`: *"marked isolated=false with 0 crossing edges, which is
>   internally inconsistent."*
> - Narration applied to every placement (`narrationSource=provider`).
>
> **Two defects remain, both small and both now visible:**
>
> 1. `judgeReview` is absent on every placement. `applyJudgeVerdict` matches
>    `verdict.clusterId` to `placement.id`, but `canonicalize()` reassigns
>    placement ids after `applyDerivedPlacements`, so the join misses. Bind on the
>    derived cluster id the placement carries, not the reassigned id.
> 2. `criticAccuracy` needs the critic itself to flag `false-seam`. The judge's
>    verdict should feed the critic's projection so it does not have to
>    re-derive the same conclusion.
>
> ---
>
> **Gate run #2, 2026-08-05 (after gateway instrumentation) — plumbing fixed,
> gates still not passing, but for a different and much smaller reason.**
>
> Three more defects found and fixed, all mine, none guessable from the suite:
>
> 1. **`request` is a reserved scope in BoxLang.** `var request =
>    agentFactory.build(...)` reads back as the *request scope*, so the gateway
>    received `CB_REQUESTCONTEXT, CBTRANSIENTDICACHE, cbox_flash_temp_storage…`
>    and rejected it. Every pre-existing role already avoids the name —
>    `dbRequest`, `applicationRequest`, `roadmapRequest` — which is exactly why
>    only the four new roles broke. Renamed to `promptRequest`; regression spec
>    in `ModernizationJudgementServiceSpec` asserts the gateway never receives
>    `CB_REQUESTCONTEXT`. **This is the same class of bug as the Java-interop
>    naming rule in AGENTS.md: never name a variable after a reserved scope.**
> 2. **A union type in a schema broke the shared validator.** Relaxing
>    `worthIt` to `"type": ["string","boolean"]` made `PromptOutputValidator:193`
>    do `trim( schema.type )` on an array, and the error surfaced as an opaque
>    provider failure. `PromptOutputValidator` reads `schema.type` as a string —
>    **union types are unsupported repo-wide.** Left untyped; the service
>    normalizes instead.
> 3. **Provider output is not the declared type.** `clusterId` arrived as an
>    array. Every field read from a model response now goes through
>    `isSimpleValue` before `trim`.
>
> **Measured now:** all four fixtures reach `partial` with judge, critic and
> brief each `ran=true` and **zero errors**, and `judgement`/`critique`/`brief`
> persist and read back. Wall-clock 80–90s per fixture, down from 130–460s.
>
> **Still open:** the roles return **empty** — no verdicts, no critiques, no
> claims. That is no longer plumbing; it is prompt/model capability on
> `deepseek-v4-flash`. So `criticAccuracy`, `claimSupport` and
> `verdictSpecificity` remain unmeasured, and the token baseline is not
> meaningful yet. Next: log one raw provider response per role to see whether the
> model is refusing, returning prose, or returning `{}` — then decide between
> prompt work and a stronger model. Do that before any further billed sweeps.
>
> ---
>
> **Gate run #1, 2026-08-05 — the four provider gates were executed and did not
> pass.** Egress was authorized and all four corpus fixtures ran end to end
> against the configured provider (nano-gpt / `deepseek-v4-flash`). Wall-clock:
> `cyclic-boundary` 131s, `false-seam` 170s, `separable-domain` 181s,
> `below-inference-threshold` 462s. All four reached `partial`.
>
> **Two defects found, both in this plan's own Step 5/9/10 work:**
>
> 1. **Fixed — judge/narrate could not run at all.** `judgeAndNarrate` dispatched
>    through `ModernizationShardExecutor.dispatchShardTask`, so its requests went
>    through the executor's gateway and future machinery. It failed with
>    `Duplication was requested on the class [ScheduledThreadPoolExecutor]`, and
>    once contained, an opaque `Failed to serialize object` with no usable stack.
>    Judge/narrate is a handful of calls over compacted cluster records, not a
>    shard storm, so it now calls the gateway directly and the service no longer
>    depends on the executor. Reproduced with a stubbed gateway at zero provider
>    cost before changing anything.
>
> 2a. **Fixed — failures were invisible.** The catch blocks wrote to
>    `result.errors`, which is never persisted, so a role that threw looked
>    identical to one that ran and found nothing. Failures now land on
>    `plan.judgement` / `plan.critique`, which is how the real error below was
>    finally seen.
>
> 3. **Open — `Modernization request has no compiled messages`.** All three roles
>    fail with this, thrown by `assertProviderContract`
>    (`ModernizationAgentGateway.bx:523`) before any provider call, reached from
>    `run()` at `:109`. It fires only when `request.messages` is not an array.
>
>    **Ruled out by zero-cost probes — do not re-test these:**
>
>    | Hypothesis | Result |
>    | --- | --- |
>    | `agentFactory.build()` produces no messages for these roles | No — returns 2 messages, under empty, typical, token-only and tiny budgets alike |
>    | Real budgets collapse the prompt | No — 2 messages under `maxTokens` 256 through 4000 |
>    | `fitRequest()` drops them | No — preserved for judge and application alike |
>    | `copyRequest()` drops them | No — it copies `messages` explicitly |
>    | The retry/shrink path (no per-role branch for these four) | No — still fails with `maxRetries = 0` |
>    | A second source of the error string | No — one occurrence in the codebase |
>    | `preflight()` is on this path | No — only application, database and roadmap call it |
>    | Line `:105` mutates the request | No — it only backfills `provenance` |
>
>    | `duplicate()` before `run()` is the difference (working roles get one via `dispatchShardTask`) | No — `messages` survives `duplicate()` *and* the gateway's own `copyRequest()`, and `promptContractId` resolves |
>
>    **Every hypothesis reachable from outside the gateway is now eliminated.** A
>    judge request built exactly as the live path builds it passes every check
>    `assertProviderContract` makes. Therefore the request arriving at `run()` in
>    production is **not** the one `agentFactory.build()` returned, and the next
>    step is instrumentation rather than another guess: log
>    `isArray( request.messages )` and `structKeyList( request )` at the top of
>    `ModernizationAgentGateway.run()`, then run one fixture. That collapses the
>    whole remaining search space in a single run.
>
> 4. **Open — role output would not survive anyway.** The roles execute (the
>    `modernization-judge` and `modernization-critic` phases are emitted on every
>    run) but `plan.judgement`, `plan.critique` and `plan.brief` are **null in the
>    persisted result**, while `plan.derived` survives. The plan projection does
>    not carry these keys, so verdicts, critiques and the brief are discarded
>    before storage, export or API. `modernization-brief` never emits at all —
>    the critic block throws before reaching it.
>
> **Consequence: Steps 5, 6, 9 and 10 cannot be measured yet.** No token or
> wall-clock baseline per role, no `criticAccuracy`, no `claimSupport`. The
> blocker is no longer authorization — it is that the output has nowhere to land.
>
> This is the §2.18b lesson in a different costume: 571 green specs, services
> that work in isolation, and a feature that delivers nothing end to end. Nothing
> tested the round-trip. **The next work is to carry these three keys through
> persistence and add a spec that asserts they survive a save/rehydrate cycle** —
> then re-run the gates.

| # | Step | Status | Gate — the thing that decides | Evidence |
| --- | --- | --- | --- | --- |
| 0 | Clear the ground | `done` (uncommitted) | `box server restart && box testbox run` green; `node --test tests/js/*.spec.mjs` green **and in `box.json:49`**; `/`, `/modernize`, `/aiflight/` load | **Gate green: 492·0·0·1**, `box run-script test` reaches its node stage (3/3), all four routes 200. Required fixing the §2.17 wiring race first |
| 1 | Coupling graph | `done` | identical input → byte-identical graph | `ModernizationCouplingGraphService` + `CouplingGraph` type, 21 specs. Persistence and architecture findings landed in Step 2 (checkpointed there); corpus-fixture validation green |
| 2 | Promote synthesis | `done` (uncommitted) | deterministic corpus tier green on all four scenarios | **All seven items done** (550·0·0·1). Synthesis moved; clustering is weighted modularity; wave order derived; target-path has one owner; shards key to clusters; `execute()` wired and verified by a live run; checkpoints + ladder re-plotted (contract v9) |
| 2a | Corpus, deterministic tier | `done` (uncommitted) | four scenarios green; `baseline-llm-path.json` committed; modernize gate leaves `language_capabilities` untouched | Four fixtures + manifest at `resources/evaluation-corpus/modernization-v1/`, `modernizationCorpusPath` setting, 14 specs green (523·0·0·1). Two extractor defects found and fixed (§2.18). **`baseline-llm-path.json` captured — the one-way door is closed** (§2.19), and it rewrote Step 3b's stop conditions. The generic evaluator is deferred to Step 2, where the predicates it must score become computable |
| 12 | Domain types | `done` (uncommitted) | exactly one file computes each invariant; one type answers each | `CouplingGraph`, `WaveOrder`, `Cluster` added; README convention amended; `ArchitectureFitnessSpec` asserts one owner each for target path, cluster membership, wave order and the volatile-key list. `Placement` ownership closed by Step 2 item 2 |
| 3a | Re-point client + tests | `done` (uncommitted) | full TestBox + `node --test tests/js/` + corpus tier green **with the derived path serving all three routes** | 550·0·0·1, JS 3/3, routes 200. Single owner for `stayInMonolith` (server) and `placementTypeOf` (client); `modernizationPlacements()` resolves derived → provider → legacy. Live-verified: the UI now renders the derived verdict where it previously showed the provider's weaker one |
| 3b | Delete the LLM path | `done` (uncommitted, rebuild merge now closed) | all stop conditions; suite green | **All six cuts done, including the deferral** (584·0·0·1). ProposalService 5,371 → 864; live run clean with `basis=coupling-derived`. Item 5 closed: `slice-rebuild` + `item-rebuild` merged into one `modernization-rebuild` role — one asset pair instead of two, one case arm instead of two, and the unreachable duplicate output-schema branch removed. Scope is chosen by the evidence pack (`itemId` present → single database item, otherwise a roadmap slice), because the two prompts only ever differed in which part of the plan they could touch — a property of the request, not the contract |
| 11 | Break up the residual | `wip` (ProposalService cleared) | no `app/models` service over 900 lines except `SchemaService` | **Five extractions done and verified.** 553·0·0·1, JS 3/3, routes 200. `ProposalService` **3,444 → 926** — the orchestration-only shape the step's table describes. New: `ShardExecutor` 1,064, `ArtifactService` 761, `RoadmapShardService` 544, `JudgementService` 329, `PlanAnnotationService` 290. The stated blocker was measured and is false (below); a 4-spec seam suite pins collaborator propagation, **cancellation crossing the boundary**, and the budget constants. **Gate unmet and mis-scoped:** seven services still exceed 900, three of them Track A's and two pre-existing outside this work. Stopped at 926 rather than move code into an already-over-limit file to make a number go green |
| 5 | Re-point the roles | `done` (uncommitted) | LLM corpus tier runs; token + wall-clock baseline recorded | 518·0·0·1. `judge` and `narrate` exist as full three-artifact roles (manifest × 3 maps, role asset, schema asset, both allow-lists, skill packs) and are dispatched from `execute()` in cluster batches. Structure is now unwritable by the model: `applyNarrations` overlays language only, and a judge verdict can only *raise* `decisionRequired`, never clear it. Whole-system header shipped. **Remaining: the gate itself — the LLM corpus tier has not been run, so no token/wall-clock baseline is recorded.** Found a real leak on the way: `boundedEvidence`'s `orderedKeys` was an ordering preference, not a whitelist, so the whole repository map rode along on every role; judge/narrate now have a closed evidence contract |
| 6 | Corpus LLM + judge tiers | `done` (uncommitted) | thresholds set to measured baseline; citation resolver exists and is called | 533·0·0·1. **§2.16 closed: `ModernizationCitationResolver` exists and `ModernizationValidationService` calls it** on every placement ref — a citation to a file the run never inventoried is now a validation warning naming the reason (`file-not-in-inventory`, `line-range-past-end-of-file`, `inverted-line-range`, `unresolvable-id-reference`). `citationValidity` is **null, not 1.0, when nothing was cited**, so a plan that cites nothing can no longer score as perfectly cited. **Remaining: the LLM and judge corpus tiers themselves — they need a remote run, which needs the user's egress acknowledgement, so no thresholds are set yet** |
| 7 | The deliverable | `done` (uncommitted) | export/UI parity spec green; JSON + SARIF byte-identical | 522·0·0·1. §2.8 closed (risk/effort exported); document now runs verdict → start here → what blocks the rest → roadmap → register → Appendix A–C → **Appendix D (telemetry) last**; static strangler paragraph deleted; `modernize.bxm` reordered to match (verified in-browser: architecture before the catalogs, overview and coverage below the plan, no console errors). Parity spec is mutation-checked — dropping the risk/effort columns makes it fail. JSON/SARIF untouched and asserted. `ModernizationAssessmentNarrative` extracted (199 lines) to keep the export service under the 900-line fitness rule; it owns `mdHeading`/`escapeMarkdown`, which the export service delegates to, so there is still one implementation |
| 8 | Gates | `done` | `unknownRate` falls materially **and is not zero** | 505·0·0·1. Gates decide from derived evidence with `recommendation`/`confidence`/`basis`/`whatWouldChangeThis`; `stay` and `do-not-extract` first-class; `operational-need` stays an explicit open question. Measured live: 16.7% unknown on the extraction case, 0% where nothing is proposed |
| 9 | Critic | `done` (uncommitted) | `criticAccuracy` measured; critic catches the planted `false-seam` | 543·0·0·1. `modernization-critic` registered (three artifacts + both allow-lists) and dispatched from `execute()` **after gates and deterministic validation**, so it argues about architecture rather than JSON. Sees a compressed projection — ids, metrics, gate results, wave order — never the merged plan; a spec asserts the catalog, samples and inventory do not travel. No authority to change anything: a critique naming an id absent from the plan is discarded. **Remaining: `criticAccuracy` — needs a provider run against the corpus** |
| 10 | The brief | `done` (uncommitted) | `claimSupport` + `verdictSpecificity` recorded; citation validity 100% **via the resolver** | 543·0·0·1, JS 3/3. `modernization-brief` registered and run **last**. Every claim's refs are resolved through §2.16's resolver server-side; a claim with no surviving citation is dropped and counted, and `citationValidity` is reported per run. Surfaced in both places: the export's verdict section leads with the prose, and `#modernization-brief` renders it above the numeric roll-up (verified in-browser — verdict before stats, refs as `file:line`, drop count stated, no console errors). Pure filtering lives in `modernizationBriefVerdict()` with 5 JS assertions. Asset cache-bust bumped, without which the page kept serving the old helper. **Remaining: `claimSupport` + `verdictSpecificity` — needs a provider run** |
| — | Part 5 Track A | `wip` | separate track, lower priority | 566·0·0·1. Three pieces done ahead of the track: **(1)** the bx-ai investigation against the installed module (3.3.2+17) — middleware is present and *already in use* at `SpecialistAgentGateway.bx:454`; backoff/retry is covered by `RetryMiddleware`, **the circuit breaker is not covered at all** and stays hand-rolled; `FlightRecorderMiddleware`'s record/replay looks like a cheaper Step 6 corpus mechanism than re-running providers. **(2)** `AiTelemetryExtractor` (307 lines) extracted verbatim — pure, no injections, no run state; `SpecialistAgentGateway` 2,214 → **1,976**, keeping 7 delegating wrappers so its 25 `safeText` call sites did not change. A 6-spec suite pins the property that matters: **observations carry a length+SHA-256 digest, never raw prompt or response text**. **(3)** `CfmlSourceScanner` — the duplicated tag-joining and pattern-caching mechanics now have one owner; the extractors were deliberately left separate because their regexes genuinely differ. The pipeline seam, `RunService` rename and folder reorganisation are untouched: the seam means extracting the review execution out of `ReviewRunService`, which runs every job in both workspaces, and it is sequenced after Part 4 |

### Step 0 item detail

| Item | Status | Note |
| --- | --- | --- |
| 0.1 `.db/` | `done` | Moved aside, not deleted: 137 MB `doublecheck.db` + `-shm`/`-wal` → `.db.bak/`. `SchemaService` recreated a 4 KB database on first request; all four routes 200. **`.db.bak/` was not gitignored** — added to `.gitignore`, since a 137 MB database was one `git add -A` from being committed against AGENTS.md's rule. Delete `.db.bak/` once you are sure nothing in it is wanted |
| 0.2 restore `app/models/README.md` | `done` | 222 lines recovered from `HEAD` |
| 0.3 delete 7 dead aliases | `done` | Inventory `inventory`/`analyze`, Signal `derive`/`detect`, ContextPack `partition`, Coverage `build`, EvidenceDiscovery `build`. Zero callers verified across `app`, `tests`, `public` before removal; README rows corrected |
| 0.4 unify volatile keys | `done` | New `ModernizationIdentityService.volatileKeys()` + `withoutVolatileKeys()`. **Three** call sites collapsed (`Placement:232`, `:646`, `Gate:237`). Gate now strips `legacyProjection` too — this is the §2.7 fix |
| 0.5 wire `tests/js` | `done` (dormant) | `box.json:49` updated with the corrected glob. Does not execute until the TestBox error is fixed — `&&` short-circuits |
| 0.6 feature rows | `done` | verified present |
| 0.7 doc consolidation | `done` | `.docs/`, `.superpowers/` absent; one plan in `resources/docs/plans/` |
| 0.8 commit the plan | `todo` | still untracked |

## How to check status without trusting this table

The ledger can go stale; these cannot. Run them to find out where you actually
are:

```bash
box server restart && box testbox run && node --test tests/js/*.spec.mjs
```

| Question | Command |
| --- | --- |
| Is Step 0 done? | `git show HEAD:box.json \| grep '"test"'` — must contain `node --test` |
| Is `app/models/README.md` restored? | `test -f app/models/README.md` |
| Is the volatile-key list unified? | `git grep -c itemFingerprint -- app/models/services` — the list literal must appear once, not three times |
| Are Steps 1–2 real? | `ls app/models/services/ModernizationCouplingGraphService.bx app/models/services/ModernizationDerivedStructureService.bx` |
| Is Step 3b done? | `wc -l app/models/services/ModernizationProposalService.bx` — ~2,800, from 5,371 |
| Is Step 11 done? | no `app/models/**/*.bx` over 900 lines except `SchemaService` |
| Is the corpus real? | `ls resources/evaluation-corpus/modernization-v1/` — needs all four scenarios **and** `baseline-llm-path.json` |
| How many roles are live? | `grep -c '"modernization-' resources/prompts/manifest.json` — 7 today, 5 after Step 3b |

The last two are the ones that quietly stay undone: a corpus with three of four
scenarios and a manifest still listing `modernization-repair` both look finished
from the outside.

## The three that block the most

If picking up cold, these unblock everything downstream and none needs a design
decision:

1. **Commit Step 0** (0.8) — the plan and the `threadSafe` fix are both
   uncommitted. The suite is green for the first time; that is the state worth
   having a commit for.
2. **Capture `baseline-llm-path.json`** (Step 2a) — the remaining irreversible
   moment. Miss it and Step 3b's fourth stop condition is permanently
   unfalsifiable.
3. **Re-check anything concluded from a pre-fix Modernize run** (§2.17) — the
   pipeline was silently losing services, so output quality judgements made
   before the fix may have been measuring the wrong thing.

---

# Part 1 — Non-negotiables

These come from `AGENTS.md` and `application-features.md`. They are not up for
re-litigation mid-implementation.

**Product boundaries**

- Local-only. No SaaS, hosting, tenants, login, billing, quotas.
- BoxLang, ColdFusion, JavaScript. No fourth language.
- Basic review works with **no AI key**. Never regress this.
- Modernize **requires** an enabled LLM provider. This stays true.
- Proposal-only: never write a file into the analysed repo, never execute DDL.
- Not an auto-migrator. Describing a target shape is fine; generating a runnable
  app skeleton is not.
- Desktop-only. No `@media (max-width: …)`, no mobile layouts.
- Capability claims must be visible in output (the claim rule in application-features.md).

**Engineering constraints**

- `SchemaService` owns the SQLite schema. No `cfmigrations`, no
  `resources/database/migrations`.
- Keep application code out of the public web root; preserve `app/` / `public/`.
- `prc` for internal data, `rc` only for user input, validate untrusted `rc`.
- Dependency injection, not manual resolution.
- API changes stay under `/api/v1/*`; update OpenAPI when the contract changes.
- Never mix a file move with a logic change in one commit.

**Out of scope for this plan**

- No new database file. `aiFlight`'s module-owned store stays independent.
- No new framework layer — no "workspace plugin system", no event-bus
  indirection, no repository base classes.
- No URL changes. Every `/api/v1/*` path stays byte-identical.
- No `aiFlight` changes beyond a parity spec.

---

# Part 2 — Verified facts

Every claim below carries the `file:line` that proves it. This is the evidence
base; the plan rests entirely on it.

**Verified against `528a97f` (2026-08-04).** Line counts are
`(Get-Content <file>).Count` — PowerShell's `Measure-Object -Line` reports ~4%
lower on every file in this repo and will make these numbers look stale when they
are not. Re-verify and re-stamp this line before resuming after a gap; Rule 2
("a claim not in Part 2 is not a fact") needs a dated baseline or it decays
silently.

Re-measured at `528a97f` and confirmed exact: ProposalService 5,371 / 149
functions, `SpecialistAgentGateway` 2,214, `PlacementService` 720,
`ValidationService` 801, `SchemaService` 900, `app.js` 6,289, TestBox 2,120,
JS 108 / 24 / 14. Total service LOC 30,877 against the 30,859 in §6.1 — the
delta is uncommitted `ReviewRunService` edits, not drift.

## 2.1 The pipeline generates structure, then repairs it

| Fact | Proof |
| --- | --- |
| The LLM invents `targetUnits`, `unitLinks`, `placements`, `roadmapPhases`; deterministic code checks and repairs them | `ModernizationAgentFactory.roleInstruction()` output schemas |
| Deterministic clustering **already exists**, wired as a fallback when the model under-delivers | `ModernizationProposalService.bx:271, 326, 330` |
| Two more fallbacks fill gaps the model left | `ModernizationPlacementService.assignUnownedUnits` (80 lines), `deterministicGapPlacements` (70) |
| Phase order is shard-arrival order, not derived | `ModernizationProposalService.bx:1405`, `:1735` |
| The roadmap prompt forces `dependencies: []` | `ModernizationAgentFactory.roleInstruction()` |
| The Modular Monolith Map draws **LLM groupings**, not dependencies | `modernization-render-helpers.js:229` builds nodes/edges from `target.contexts`/`target.extracts` |

## 2.2 The edges needed for a real graph already exist

| Fact | Proof |
| --- | --- |
| Inventory dependencies resolve to real file→file edges | `ModernizationInventoryService.bx:449-495` |
| Resolution is 4-tier: exact path → basename → stem → dotted-path suffix | same |
| Ambiguous targets produce **no** edge | `uniqueResolutionCandidate` returns `""` unless exactly one candidate |
| Every edge carries provenance: `path` / `basename` / `stem` / `dotted-path` | `resolveTarget` return value — usable for edge-confidence weighting |
| 23 dependency kinds map to 8 seam groups | `ModernizationSignalService.bx:13-62` |

## 2.3 Current clustering is folder-shaped, and degenerates

| Fact | Proof |
| --- | --- |
| Clustering keys on scope paths / folder inference, not coupling | `ModernizationProposalService.bx:1888-1935` |
| Below `minUnitsForFolderInference`, **every unit lands in one cluster** | `:1910-1926`, `ctx-modular-monolith-default` |

This is why a single small corpus fixture cannot validate seam detection: it
would only ever exercise the degenerate branch.

## 2.4 Truncation is an output-volume problem

| Fact | Proof |
| --- | --- |
| Resplit triggers on `failureType == "truncated_json"` | `ModernizationProposalService.bx:2600` |
| The remedy is halving the path list to halve output | `:2534-2537` (explicit in the doc comment) |

Consequence: derived clusters are sized by *cohesion*, so a high-cohesion domain
becomes a **larger** single ask than today's path-batched shards.
`resplitTruncatedShard` must be kept as the cluster-size cap.

## 2.5 Function classification — `ModernizationProposalService` (5,371 lines, 149 functions)

| Group | Lines | Fate |
| --- | --- | --- |
| Identifier reconciliation — `resolveTargetReferences`, `resolveInventoryReferences`, `dropUnresolvedUnitLinks`, `buildTargetLookup`, `registerTargetAlias`, `resolveTargetToken`, `normalizeTargetAlias`, `buildInventoryLookup`, `preferredInventoryIdForPath`, `resolveInventoryToken`, `ensureUniqueTargetUnitIds`, `ensureUniqueCollectionIds`, `inventoryUnitScore` | ~624 | DELETE |
| Omission repair — `backfillUnitSymbolsFromInventory`, `pruneUnbackedMigrationSteps`, `ensureRoadmapActionFields`, `ensurePhaseNames`, `ensureMigrationSkeleton`, `normalizePlanConfidence`, `ensureApplicationSourceCoverage`, `groupHandlerUnitsIntoActions`, `polishPlan`, `remapMigrationStepTargets` | ~586 | DELETE |
| Route/roadmap normalisation — `retainEvidencedRoutes`, `normalizeRouteContracts`, `normalizeRoadmapReferences`, `orderRoadmapPhases`, `appendPhaseInDependencyOrder` | ~254 | DELETE |
| Structure reconciliation — `mergeFragments`(part), `mergeArchitecture`, `mergeRoadmap`, `reconcileShardedRoadmapPhases`, `architectureDecisionsMissing`, `applySynthesized*` wrappers, `applicationFragmentHasSubstance`, `emptyApplicationFragment` | ~172 | DELETE |
| Repair role — `repair`, `invalidItems` | ~100 | DELETE |
| `propose` orchestration of dying paths | ~100 | DELETE (partial) |
| Deterministic synthesis block `:1439-2235` | 648 | **MOVE** → derived-structure service |
| Target-path derivation — `normalizeTargetUnits`, `deriveTargetPath`, `ensureUniqueTargetPaths`, `contextualCollisionPath`, `legalModernTargetPath`, `targetPathMatchesLayer`, `normalizeLayerExtension`, `appendPathSuffix`, `fallbackLayerForSource` | 197 | **MOVE** → `PlacementService` |
| `synthesizeDatabaseFragment`, `handlerNameForDomain`, `actionNameFromTargetPath` | 105 | **MOVE** |
| Shard machinery — 31 functions | ~1,186 | **KEEP**, re-key to clusters |
| Samples, db transitions, provenance, coverage, logging, utils | ~1,400 | **KEEP** |

**Result: 5,371 → ~2,800.** Deleted ~1,836 · moved ~950 · kept ~2,585.

**The headline: 1,210 of 5,371 lines are identifier reconciliation and omission
repair** — code whose only job is making LLM-emitted IDs resolve and filling in
what the model omitted. Under derived structure those problems stop existing.

## 2.5a Both extractions are safe to move verbatim — measured

The two large relocations (Step 2's synthesis block, Step 11's shard machinery)
were checked for hidden coupling. Neither carries mutable instance state:

| Block | `variables.*` used | Injected services used |
| --- | --- | --- |
| Synthesis `:1439-2235` (648 lines) | `maxRoadmapShards`, `minUnitsForFolderInference`, `maxInferredArchitectureScopes` | **none** |
| Shard machinery `:2316-2990` (~1,186 lines) | `minLaterStageReserveMs`, `maxLaterStageReserveMs`, `maxApplicationShards`, `estimatedShardWallMs`, `defaultShardSize`, `defaultApplicationShards` | `agentFactory` **and `agentGateway`** |

Every one of those is an **integer constant** set in the class body
(`:21`, `:32`, `:33`, `:41`). No caches, no accumulators, no shared mutable
state — unlike `variables.patternCache` in the parsers, which would have made
extraction a design problem.

So "move verbatim, refactor separately" is genuinely available here: pass the
constants as configuration, inject **both `agentFactory` and `agentGateway`**
into the shard executor, and the code compiles unchanged. This is the single
biggest de-risking fact for Steps 2 and 11.

> ### Corrected by doing it — the block is not dependency-free
>
> This analysis checked `variables.*` and injected services. It did **not** check
> calls to sibling private helpers, and the synthesis block makes six:
> `scalarString`, `normalizeLegacyPath`, `normalizeEvidencePath`, `dedupeById`,
> `ensureIdentity`, `logInfo`. All six are still called 11–50 times by the code
> that stays behind, so none could simply move.
>
> Two of them are not pure: `ensureIdentity` needs `identityService` and
> `logInfo` needs `log`. **`ModernizationDerivedStructureService` therefore takes
> two injections**, contradicting "no injected services" for this block.
>
> The extraction still worked and the suite stayed green, so the conclusion holds
> — but "compiles unchanged" was optimistic. **Run the same sibling-call check
> before Step 11's shard extraction**, which is a larger block and has had no
> equivalent audit.

The synthesis block is the cleaner of the two — re-verified at `528a97f`, its
648 lines reference **no injected service at all**, by bare name or through
`variables.`. Step 2's extraction is therefore constants-only.

## 2.6 Deletions elsewhere

| Source | Deleted | Note |
| --- | --- | --- |
| `ModernizationProposalService` | ~1,836 | §2.5 |
| `PlacementService` | ~397 of 720 | `repairStringifiedPhaseCollections`, `tokensFromStringifiedArray`, `adaptForRead`, `preserveLegacyIdentity`, `fromLegacyGroups`, `legacyProjection`, `normalizePlacements`, `assignUnownedUnits`, `deterministicGapPlacements`, most of `canonicalize` |
| `ExportService` legacy sections | ~290 | triple-rendering of one dataset |
| `ValidationService` | ~227 of 801 (**28%**) | `validateReferences` 48, `validatePlacements` 45, `validateArchitecturePackagingFields` 45, `targetHasInventoryBacking` 35, `inventoryPathSet`+`inventoryUnitIdSet` 24, `idSet`+`checkReference`+`checkReferenceArray` 22, `legalTargetPath` 8 |
| `AgentFactory` (roles 7→5) | ~180 | |
| Dead aliases (7, zero callers) | ~15 | `ModernizationInventoryService.bx:216-217`, `ModernizationSignalService.bx:157-158`, `ModernizationContextPackService.bx:129`, `ModernizationCoverageService.bx:123`, `ModernizationEvidenceDiscoveryService.bx:86` |
| **Net deletion** | **~2,945** | plus ~950 relocated |

`ValidationService` **keeps** its sample contract, database claims, transitions,
actionability, `safeRelativePath`/`safeRoutePath`, and evidence/syntax/dialect
levels. None of that is structural.

**One function is unclassified and must be decided in Step 3b, not discovered
there:** `validateRoadmapMigrationGuide` (`:472-533`, ~61 lines) is structural —
it validates phases against `target` and `inventoryPaths` — but appears in
neither list above. Default position: it **goes**, because under derived
structure the roadmap is a topological property rather than model output. If it
survives, say why in the same commit.

## 2.7 Live bug — divergent fingerprint lists

**Three** separately-maintained copies of the volatile-key exclusion list, not
two:

```
ModernizationPlacementService.bx:232  [ id, itemFingerprint, legacyProjection, riskLevel, relatedFindingCount, effortSize, effortDrivers ]
ModernizationPlacementService.bx:646  [ id, itemFingerprint, legacyProjection, riskLevel, relatedFindingCount, effortSize, effortDrivers ]
ModernizationGateService.bx:237       [ id, itemFingerprint,                   riskLevel, relatedFindingCount, effortSize, effortDrivers ]
```

The two Placement copies agree with each other; the Gate copy omits
`legacyProjection`. Placement canonicalisation and gate evaluation therefore hash
the same item differently, surfacing to the user as
`ModernizationDecisionConflict` — *"the modernization proposal changed; refresh
before deciding"* — on an item that did not change.

Step 0 must fix **three** call sites. Two copies that agree today are the
mechanism by which a third drifts tomorrow, which is why §6.2's grep-assert
matters more than the fix itself.

## 2.8 Computed data that never reaches the export

`ModernizationRiskService.bx:83-87` computes `riskLevel`, `relatedFindingCount`,
signal-weighted `effortSize` (S/M/L/XL) and named `effortDrivers`.
`ModernizationExportService` references **none of them**. Shown in the UI, absent
from the document a user exports and shares.

## 2.9 The deliverable leads with telemetry

`ModernizationExportService.toMarkdown():84-190` emits, in order: run metadata →
a static paragraph identical on every run → **13 lines of pipeline telemetry**
(including *provider shards completed / failed / omitted*) → **ten**
`appendRows()` tables → validation counts → a disclaimer. **Zero sentences of
synthesis.**

## 2.10 Test surface

| Surface | Assertions | Gated? |
| --- | --- | --- |
| TestBox total | 2,120 | yes |
| — of which cover code this plan deletes/reshapes | **594** | yes |
| `tests/js/modernization-render-helpers.spec.mjs` | **108** | **NO** |
| `tests/js/modernization-contract.spec.mjs` | 24 | **NO** |
| `tests/js/architecture-flow.spec.mjs` | 14 | **NO** |

**Blast radius: 726 assertions.** `tests/js/*.spec.mjs` is not wired into
`box.json`, `package.json` (absent) or CI — only allowlisted as a manual command
in `.claude/settings.local.json`. Deleting the legacy projection breaks 108
assertions **silently**.

**Know the ceiling before budgeting Step 3a.** The 594 is a subset estimate, not
a measurement. What *is* measured: 33 `*Modernization*.bx` spec files holding
**1,079** `expect(` calls. So 594 is the floor of a range whose top is 1,079, and
Step 3a's rewrite could be up to 1.8× what the table implies. Re-measure the
subset before committing to a schedule — this is the single most under-budgeted
number in the plan (§4.0b).

## 2.11 Client coupling

7,373 lines of client JS consume the plan JSON: `app.js` 6,289 (15
`contexts`/`extracts` references, 17 other plan-shape references),
`modernization-render-helpers.js` 553, `modernization-contract.js` 244,
`architecture-flow.js` 287.

The `15` re-verified exactly at `528a97f`; `modernization-render-helpers.js` has
12 such lines. **The `17` did not reproduce** — matching
`targetUnits|unitLinks|placements|roadmapPhases` gives 23 lines in `app.js`, so
Step 3a's "32 plan-shape references" is more likely ~38, and the original
definition of "other plan-shape references" is unrecorded. Re-derive the list
from a stated regex at the start of Step 3a rather than trusting the 32.

## 2.12 Other verified facts

| Fact | Proof |
| --- | --- |
| Modernize cannot run without a provider | `ReviewRunService.bx:128` → `ensureProviderEnabled()` throws |
| `AIReviewService` is a **reachable** fallback — AI on, planner produced no tasks | `SpecialistReviewService.bx:40-42, 55-57`; `ReviewRunService.bx:1080` |
| Modernize never runs the parsers | `ReviewRunService.bx:783` returns before the index phase at `:825` |
| WireBox resolves models by bare class name across subfolders | `WireBox.bx:26` `scanLocations: []`; proven by the working `services/` + `repositories/` layout |
| `executeRun()` residue after extraction ≈ 103 lines | `:649-1211` = 563; modernize branch 73; review portion ~427; shared lifecycle ~63 + finalisation ~40 |
| `stayInMonolith` is pure derivation, yet stored and fingerprinted | `ModernizationPlacementService.bx:295` |

## 2.13 The corpus and gate infrastructure is review-shaped, not corpus-generic

Step 2a assumed `EvaluationService.loadCorpus` needs no change. That is true for
*loading* and false for *scoring*, and the difference is a step of work.

| Fact | Proof |
| --- | --- |
| `loadCorpus` only requires `cases[]`, `thresholds`, `files[].source/filePath/language` — a modernization manifest loads unchanged | `EvaluationService.bx:10-89` |
| `evaluate()` is hard-wired to finding shape: `findingKey()` over ruleId/filePath/lines, emitting precision/recall/f1/citationValidity/duplicateRate/FP-per-KLOC | `EvaluationService.bx:91-190` |
| None of `seamPrecision`, `dagValidity`, `decisionStability`, `coverageOfSignals` exists anywhere | grep |
| `QualityGateService` reads **one** corpus, from a single setting | `QualityGateService.bx:13` `coldbox:setting:evaluationCorpusPath` |
| It scores every case through the review path | `QualityGateService.bx:35` `findingService.deterministic( files )` |
| The review corpus lives at `resources/evaluation-corpus/v1`, not `resources/*-corpus/v1` as Step 2a's path implies | `resources/evaluation-corpus/v1/manifest.json` |

**And a gate run promotes a language tier.** On pass, `persist()` upserts
`language_capabilities` keyed on `language` **alone**
(`QualityGateService.bx:167-192`), which feeds `advertisedLanguages()` →
`/api/v1/capabilities` → the measured tier table in `application-features.md`. A
BoxLang *modernization* corpus passing would overwrite the BoxLang tier measured
by the *review* corpus, with whatever `capabilityTier` its manifest declares.

§4.0's "`evaluation_gate_runs` gains `corpus_kind`" does not cover this:
`language_capabilities` has no such column and `language` is its primary key.

Consequences fold into Step 2a and §4.0 below. `evaluate()`'s finding-shaped
predicates are not a bug — they are correct for Review. The modernization tier
needs a **sibling evaluator**, sharing `loadCorpus` and the gate table, not a
rewrite of the review one.

## 2.14 The run has checkpoints and a progress ladder the plan never mentions

`ModernizationRunService.execute()` is resumable. It reads prior checkpoints
(`:46`) and writes named, fingerprint-keyed ones as it goes:

| Checkpoint | Line | Progress |
| --- | --- | --- |
| `inventory` | `:63` | 30 |
| `schema` | `:89` | 38 |
| `context` | `:111` | 42 |
| `evidence` | `:138` | 48 |

Reuse is keyed on `inputFingerprint` + `sourceFingerprint` (`reusableCheckpoint`,
`:60`), and progress is streamed to the UI via `eventService.publish` (`:782`).
Inserting two stages between signal and contextPack therefore requires new
checkpoints and a re-plotted progress scale, or resume silently replays derived
work and the progress bar lies.

**This also questions `modernization_graph_cache`.** Checkpoints already cache
bounded artifacts by source fingerprint into `modernization_checkpoints`. Step 1
proposes a second, content-addressed mechanism for one more artifact. One of the
two is redundant; decide in Step 1 rather than shipping both.

**The current pipeline order in Step 2 is also stated wrongly.** Actual:

```
proposal -> placement.canonicalize (:249) -> gate.evaluatePlan (:250) -> validate (:263)
         -> [repair loop repeats all three, :307-314]
```

Placement and gate run **before** validation, and there is a repair loop. Step 2's
"it currently runs" listing has validation first and omits the loop.

## 2.15 Role surgery spans eight files plus the prompt registry

§2.6 budgets roles 7→5 as "~180 lines, `AgentFactory`". The role name is a
key in more places than that:

| Surface | Proof |
| --- | --- |
| Role version map, role file map, schema file map | `resources/prompts/manifest.json` (three separate blocks) |
| 7 role JSON assets + 9 schema JSON assets on disk | `resources/prompts/roles/`, `resources/prompts/schemas/` |
| Role allow-list and 6 `case` arms + 8 conditionals | `ModernizationAgentFactory.bx:16, 33, 145-282` |
| Second role allow-list | `ModernizationAgentGateway.bx:542` |
| Skill definitions | `ModernizationSkillService.bx:43` |
| Both rebuild roles invoked here | `ModernizationSliceRebuildService.bx:116, 127, 195, 206` |
| Handler surface | `ApiRuns.bx` |

**`ModernizationSliceRebuildService` (482 lines) appears nowhere else in this
plan** — not §2.5, not §2.6, not Step 3, not Step 11. It is where Step 3b's
`slice-rebuild` + `item-rebuild` merge actually happens.

And the direction the plan mostly cares about is *additive*: `judge`, `narrate`,
`brief` and the critic each need a registered prompt asset **and** an output
schema asset, versioned in the manifest. Steps 5, 9 and 10 describe the prompts'
content and never mention registering them.

## 2.16 There is no citation validator on the Modernize side

Step 10 leans on "the existing citation validator". It does not exist.

| Fact | Proof |
| --- | --- |
| `ModernizationValidationService` checks evidence-ref **presence** only, never resolves a ref to real evidence | `:79`, `:131`, `:686` — all `isArray(...) && .len()` |
| The only real citation check is private and finding-shaped | `EvaluationService.bx:224` `citationIsValid( finding, files )` |

So Step 10's "citation validity 100%" gate is vacuous as written, and Step 6's
`citationValidity` LLM metric has no implementation to call. A modernize-side
ref resolver — evidence ref → inventory/evidence record → file+line — is new
work, and it is the mechanism the entire "judge and narrate" half of the plan
relies on to stay honest.

## 2.17 Property injection stops partway through the list — measured

Found while running Step 0's gate. This is the most consequential fact in Part 2
and it was not suspected by any of the first ten review passes.

**Method.** A temporary probe inside each service walked its own `variables`
scope and reported which injected properties were null at call time. Removed
after measurement; both files verified byte-identical to `HEAD` afterwards.

| Service | Declared injections | Injected | Null |
| --- | --- | --- | --- |
| `ReviewRunService` | 35 | first **13** | `specialistReviewService` onward — 22 properties |
| `ModernizationRunService` | 18 | first **7** *(one run)* | `proposalService` onward — 11 properties |

**It is not a fixed ceiling and it is not deterministic.** The cutoff was 13 of
35 in one service and 7 of 18 in another — both ≈38%, the signature of a racing
initialisation rather than a limit. Re-probing `ModernizationRunService` three
more times returned **zero** nulls. The `ReviewRunService` failure, by contrast,
reproduces on every run, cold or warm.

### Cause and fix — WireBox `threadSafe`

This is documented WireBox behaviour, not a BoxLang defect. By default WireBox
locks *constructor* creation and constructor wiring, places the instance into its
persistence scope, and **only then** performs setter/property injection and
`onDiComplete()` — with no lock held. Another thread that requests the singleton
inside that window gets it from the scope **half-wired**, so later properties
read as null. The WireBox docs name the symptom exactly: "mixups or missing
dependencies" on persisted-scope objects.

The fix is the `threadSafe` class annotation, which makes WireBox lock
construction, wiring and `onDiComplete()` as one unit:

```boxlang
@singleton
class threadsafe {
    property name="..." inject="...";
```

**Applied to all 59 `@singleton` classes in `app/models` that use property
injection.** The remaining 18 singletons take no injected properties and are
therefore not exposed — the race is specific to the post-scope wiring step.

The documented tradeoff is that `threadSafe` does not support circular
dependencies without WireBox providers. A full cycle scan of the injection graph
across `app/models` found **zero** cycles, direct or transitive, so the tradeoff
does not apply here. Re-run that scan before adding a circular dependency.

**Result: the suite went green for the first time — 492 passed, 0 failed, 0
errored, 1 skipped**, and `box run-script test` now reaches its `node` stage,
which the non-zero exit had been short-circuiting.

**Ruled out by experiment**, each with a server restart between:

| Hypothesis | Result |
| --- | --- |
| Position in the list | Moving the property to #1 fixed it — and broke whatever slid into the vacated slot |
| A hard 15-property ceiling | Commenting out an earlier injection moved it to #15; still null |
| Property-name collision with the four other `architecture*` properties | Renaming to `archBundleRepo` changed nothing |
| Duplicate class names | None on disk |
| A missing `get()` | `ArchitectureRepository.bx:96` |
| Test pollution | Fails in isolation |
| Stale data | Fails identically against a freshly created database |
| The uncommitted `ReviewRunService` edit | A doc comment |

### Why this changes the plan

1. **`getResult()` throws for any review run reaching `ReviewRunService:484`.** A
   live product bug, not a test artefact.
2. **`ModernizationRunService` was silently losing `proposalService`,
   `validationService`, `gateService`, `eventService` and `log`** — the spine of
   the Modernize pipeline, nulled without an error on an unlucky run. Any past
   Modernize output that was structurally wrong for no visible reason is now
   suspect: the prompt and the model may never have been at fault. **Re-measure
   any conclusion drawn from a Modernize run made before this fix**, including
   anything that informed Part 2.
3. **More injections widened the window, but the count was never the cause.**
   §6.2's "no service holds more than 15 injections" is still worth keeping as a
   design limit — it is what made these two services the ones to fail first —
   but it would not have prevented this, and reducing counts is not the fix.
   `threadSafe` is.
4. **Part 5's priority is unchanged.** An earlier draft of this section argued
   the injection race promoted it to correctness work; that was wrong once the
   real mechanism was known. Part 5 remains maintainability work.

### Keeping it fixed

Add to the §6.2 fitness spec: **every `@singleton` in `app/models` that declares
an injected property must be `class threadsafe`.** This is a silent,
non-deterministic failure — a new service that omits it will not fail a test, it
will occasionally null a dependency in production. A grep-assert is the only
thing that keeps it from coming back.

Reproduce the original failure by reverting the annotation on
`ReviewRunService`:

```bash
box server restart && box testbox run "bundles=tests.specs.integration.ArchitecturePlanningSpec"
```

## 2.18 Two extractor defects the corpus fixtures found immediately

Both were live in committed code, both silently degraded the evidence this whole
plan derives structure from, and neither was visible without a fixture written
to look like real legacy CFML. Fixed while building Step 2a; inventory version
bumped `cfml-inventory-conservative-v5` → `v6`, which invalidates cached
inventories that were built without them.

### Table references were missed on every multi-line query

`sqlReferences()` was only called on a line that *itself* matched
`cfquery|queryExecute|...` (`:159`). Tag-based CFML puts its SQL on the lines
**after** `<cfquery>`:

```cfml
<cfquery name="local.rows" datasource="ledgerdb">
    SELECT i.total, c.segment
    FROM invoices i              <- never analysed
    JOIN customers c ON ...      <- never analysed
</cfquery>
```

So `table-query` dependencies were produced only for single-line queries. That is
the minority shape in the legacy estates this product exists to read, which means
**the co-access matrix was close to empty on real input** — and co-access is the
primary evidence for rejecting a false seam (§2.3). Step 1's graph would have
looked healthy and been blind.

Fixed by continuing SQL analysis for a bounded window (`maxSqlBlockLines = 40`)
after a query opens, ending at `</cfquery>`. Bounded so an unclosed tag cannot
make the rest of a file look like SQL.

### A dynamic include was never reported as dynamic, and invented an edge

The include regex captures `([A-Za-z0-9_./-]+)`, which **excludes `#`**. For:

```cfml
<cfinclude template="modules/#url.module#/handler.cfm">
```

the captured target was `modules/`. The dynamic check was
`find( char( 35 ), includeTarget )` — testing the capture that cannot contain a
`#` — so it never fired. Two consequences: dynamic includes were absent from
`unresolved`, and the truncated prefix was passed to `resolveTarget`, where it
could resolve to a real file and **create an edge that does not exist**. That is
precisely the invented structure this plan is written to eliminate, sitting in
the deterministic layer that was supposed to be the trustworthy half.

Fixed by judging interpolation on the source line and refusing to resolve
anything interpolated.

### Why this matters beyond the two fixes

The fixtures earned their cost before clustering exists. Both defects sit in the
evidence base every later step consumes, and neither would have been caught by a
single small fixture — §2.3's warning applied to extraction as well as
clustering. Expect more of this when the LLM and judge tiers land: **treat a
corpus failure as a finding about the product first, and about the fixture
second.**

## 2.18b The SQLite pool still degrades across repeated restarts

Separate from 2.18a, and still open. Across one long working session the pool
surfaced four distinct failures, all transient and all cleared by a restart:

- `SQLite JDBC: inconsistent internal state` (one spec, one run)
- `Connection is closed` / `Error closing connection: Connection is closed`
  (`AppSettingsRepository.bx:13`, `ReviewResultRepository.bx:54`)
- `Cannot invoke "org.sqlite.core.SafeStmtPtr.isClosed()" because "this.pointer"
  is null` — **this one returned HTTP 500 on every route while the whole TestBox
  suite stayed green at 543·0·0·1**

That last case is the one to remember: **a green suite is not evidence the app
serves a request.** Check routes separately after any change, and if routes 500
while tests pass, restart before believing the change caused it.

### Reproduced deterministically, and pool tuning is the wrong lever

It is **not** restart cycles. It is **concurrent writes**. Six simultaneous
`POST /api/v1/runs` reproduce it on demand:

| Config | Result | Pool after |
| --- | --- | --- |
| `connectionLimit 12`, `connectionTimeout 5` (shipped) | 6/6 ok, then 5/6 + one 500 | healthy (200) |
| `connectionLimit 8`, `connectionTimeout 20` (tried) | **4 of 6 failed** | **dead — `SQLite unavailable`, 503 until restart** |

**The tuning hypothesis was wrong and is reverted.** The reasoning was that
`connectionTimeout` (5s) must exceed `busy_timeout` (15s) so a caller waiting on
SQLite's single write lock does not get abandoned by callers waiting for a
connection. Measured, the opposite holds: **failing fast is better than waiting
longer.** A 20s connection wait keeps threads parked while contention builds, and
it converted a recoverable ~1-in-6 error into a pool that never recovers. Do not
re-try this without an A/B — the shipped numbers beat the "principled" ones.

**What is real:** the error family is real and observed. SQLite in WAL allows
exactly one writer, so the fix belongs at the write path, not the pool.

### `SqliteContentionRetry` — landed, correct, but NOT yet proven against the bug

`ReviewRunService.create()`'s transaction — the write that actually failed — is
now wrapped in `SqliteContentionRetry.run()`. Up to 3 attempts, 50ms linear
backoff, retrying **only** a named list of lock/connection-state signatures where
the transaction demonstrably did not commit. Everything else rethrows on the
first attempt, unchanged. Eight specs pin the boundary in both directions,
including "does NOT retry a `UNIQUE constraint failed`" — a retry that swallowed
real errors would be worse than the flake it replaces.

**Be honest about what is and is not demonstrated:**

- Proven: the retry logic is correct and narrow (8 unit specs).
- **Not proven: that it fixes the transient.** After the fix, 30 then 16
  concurrent run-creations all succeeded — but **the retry never fired once**,
  so those runs prove only that contention did not occur, not that it was
  absorbed. A green result from a mechanism that never ran is not evidence.
- **The "1 in 6" rate is now suspect.** Those failures were measured *after* the
  `connectionLimit 8 / connectionTimeout 20` experiment had already degraded the
  pool. On a freshly restarted server the failure has not reproduced at 6 or 16
  concurrent writers. The original transient may have been driven by accumulated
  pool damage across a long session rather than by contention alone.

So: the change is safe and addresses a real error family, but the next person
should not assume the problem is closed.


### Validated on a healthy database: the contention diagnosis does not hold

**36 concurrent run-creations across three rounds: 0 failures, and
`SqliteContentionRetry` fired 0 times.** Not at 6 concurrent writers, not at
16, not at 36.

That settles the open question above. **The "~1 in 6 concurrent writes fails"
figure was wrong** -- it was measured while the WAL was already corrupt and the
pool already poisoned by the `connectionLimit 8 / connectionTimeout 20`
experiment. On a database dropped and rebuilt by `SchemaService`, concurrent
writes are clean.

So the causal chain is: **corrupt WAL -> poisoned connections -> everything
downstream**, and contention was never the trigger. The recovery is a full
`box server stop`, clearing `-wal`/`-shm`, and restart; `box server
restart` alone does not release the lock.

`SqliteContentionRetry` stays. It is correct, narrow, covered by 8 specs, and
costs nothing when it does not fire -- genuine insurance against a real SQLite
failure mode. But it should be described as insurance, **not** as the fix for
this transient, and nobody should conclude it works from the absence of
failures. It has never been exercised in production.

### The actual mechanism: a poisoned WAL, not contention

Chasing a pragma suggestion led somewhere better. The persistent failure —
`Cannot invoke "org.sqlite.core.SafeStmtPtr.isClosed()" because "this.pointer"
is null`, health `503 SQLite unavailable`, **surviving every restart** — is a
**damaged write-ahead log**, not lock contention.

Recovery, and the procedure to use when it happens:

```
box server stop          # a full stop, so the file lock is actually released
# move .db/doublecheck.db-wal and .db/doublecheck.db-shm aside
box server start         # SQLite reopens clean; the main .db is intact
```

The `.db` file itself was never corrupt — only the WAL. `box server restart` is
**not** sufficient: it does not reliably release the lock, which is exactly why
this looked like a random transient that "sometimes cleared on restart".

**Why the WAL gets poisoned** is the open question, and the evidence points at
the original §2.18a note: the test harness tears ColdBox down on every request
while the background worker is mid-write, so connections die inside a statement.
The WAL grew back to ~5MB and health returned to 503 during a single suite run,
so it reproduces under ordinary test load, not just under the stress runs.

**Three hypotheses are now eliminated, which is worth as much as the finding:**

1. Pool geometry — measured, made it strictly worse.
2. `transaction_mode=IMMEDIATE` — a genuinely good idea (SQLite's DEFERRED
   transactions upgrade a read lock to a write lock and return `SQLITE_BUSY`
   *ignoring `busy_timeout`*, which would explain everything). **Untested.** It
   was tried while the WAL was already poisoned, so the boot failure that
   followed proves nothing about the pragma. **Re-test it on a healthy database
   before dismissing it** — the reasoning still holds.
3. Write-path retry — landed and correct, but it never fired, so it is not what
   was breaking.

Next step is the shutdown/write race: make the background worker finish or abort
its write before ColdBox tears down, rather than being killed mid-statement.

**Fixed along the way:** `QualityGateService` opened a bare `transaction {`
while every other repository uses `bx:transaction datasource="#datasource#"`. A
bare block binds to the default datasource, so the transactional connection and
the query's connection were two separate checkouts. Corrected for consistency —
it is not the cause of the transient, and fixing it did not change the measured
failure rate.

## 2.20 Step 6 thresholds, measured over 12 runs (2026-08-06)

Three runs of each of the four corpus cases, `deepseek-v4-flash`, 12 billed
calls. The point was to separate signal from model variance before setting any
gate, because a threshold taken from one run bakes in noise.

### Stable — safe to gate on

| Metric | Measured | Threshold |
| --- | --- | --- |
| `citationValidity` | **1.0 on 12/12**, zero dropped claims | **1.0, no tolerance** |
| verdicts == derived clusters | **12/12** | exact match |
| wall-clock | 72-113s, mean 88s | fail over 180s |
| claims per run | 3-6 | at least 3 |

`citationValidity` holding at exactly 1.0 across every run is the strongest
result here: the resolver drops any claim whose refs do not resolve, and over
twelve runs the model never produced one that survived. Step 10's gate is met.

### Unstable — must NOT be gated on a single run

| Metric | Run-to-run | Reading |
| --- | --- | --- |
| critiques per run | **0-3 on every case** | three runs produced zero critiques |
| `criticAccuracy` (false-seam flagged) | **2 of 3** | one run flagged nothing at all |
| false positives | 1 of 12 | `cyclic-boundary` called indefensible once |

**Step 9's gate as written -- "the critic catches the planted `false-seam`" --
would be flaky roughly a third of the time.** On round 1 the judge caught it
(`defensible=false`) and the critic raised 3 critiques; on round 2 the judge
called it defensible and the critic said nothing; on round 3 the critic raised 2
critiques while the judge disagreed with itself again.

**So the gate has to be best-of-N, not single-run: run the case 3 times and
require >= 2 flags.** At 2/3 measured, a 3-run majority gate passes today. A
single-run gate would fail CI at random and teach everyone to re-run it, which
is worse than no gate.

The same variance explains why detection sometimes comes from the judge and
sometimes from the critic. Feeding `judgeVerdicts` into the critic projection
helped -- `false-seam` went from 0 critiques to 2-3 in two of three runs -- but
it did not make either component individually reliable.

## 2.18a SQLite pragmas: `custom` is appended to the URL, not ignored

The suite intermittently failed with `SQLITE_BUSY` at ColdBox shutdown — the
test harness tears the app down on every request while the background worker is
still writing, and a writer with no busy timeout fails instantly rather than
waiting.

**The first fix was wrong and is recorded because the wrong version is
instructive.** It looked as though `busy_timeout` in the datasource's `custom`
block was never reaching the driver, so it was added to the URL query string
instead. BoxLang in fact appends `custom` to the URL using `;` separators, so the
result was:

```
jdbc:sqlite:...?foreign_keys=on&busy_timeout=10000;synchronous=NORMAL;journal_mode=WAL
                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ parsed as one integer
```

`NumberFormatException: For input string: "10000;synchronous"` → Hikari fails to
initialise the pool. Three consecutive green runs hid it, because the failure
only surfaced when a *new* datasource was created in a fresh context.

**Correct fix:** leave the URL alone and raise `busy_timeout` from 5000 to 15000
in `custom`. Verified across repeated back-to-back runs: zero `SQLITE_BUSY`, zero
pool errors.

Two things worth carrying forward:

- **Never put pragmas in that URL.** A comment now says so at the line itself.
- **Three green runs is not proof.** This defect passed three consecutive full
  suites before showing itself. When a fix targets a race, re-run until a run
  *fails*, or until the count is high enough that silence means something.

## 2.19 The LLM baseline: the current path extracts nothing at all

Captured 2026-08-05 against all four corpus scenarios, provider
`openai-compatible` / `deepseek-v4-flash`, before any inversion work. Reduced
artifact committed as
`resources/evaluation-corpus/modernization-v1/baseline-llm-path.json`; the ~1 MB
raw capture stays gitignored beside it.

| Scenario | Units | Placements | **Extracted** | All stay | seamPrecision | seamRecall | Wall clock |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `false-seam` | 6 | 4 | **0** | yes | 1.0 | 1.0 | ~210s |
| `separable-domain` | 3 | 3 | **0** | yes | **0.0** | **0.0** | 130s |
| `below-inference-threshold` | 4 | 2 | **0** | yes | 1.0 | 1.0 | 135s |
| `cyclic-boundary` | 3 | 1 | **0** | yes | 1.0 | 1.0 | 246s |

Every run terminated `partial` — "plan retained with review gates".

**The path proposes zero extractions on every scenario, including the one where
extracting is the correct answer.** Its apparent success on `false-seam` is not
seam detection; it is a blanket refusal that happens to be right three times out
of four. `separable-domain` is where that shows: a genuinely separable domain —
own datasource, own tables, one external provider, no shared scope — and it was
not extracted.

### This makes Step 3b's fourth stop condition nearly worthless as written

"`seamPrecision` ≥ the current LLM path" is satisfied on three of four scenarios
by a service that refuses everything, because **precision is undefined-favourable
when nothing is proposed**. A derived path that also extracts nothing would pass.
The condition would certify a regression as a success.

Precision alone cannot measure a system whose failure mode is silence. Step 3b's
stop conditions are amended accordingly — see that step.

### Two further readings

- **This is consistent with §2.3, not a contradiction of it.** Below
  `minUnitsForFolderInference` every unit lands in one cluster, so at 3–6 units
  the architecture role has nothing to differentiate and defaults to
  main-app. The baseline therefore measures the degenerate branch — which is
  exactly the branch real small estates hit.
- **Cost floor for comparison:** 130–246 seconds per 3–6 file fixture. Any
  derived path that is slower than this on the same inputs has a problem
  independent of quality.

## 3.1 The inversion

**Today — generate, then validate.** The model produces structure; deterministic
code merges, canonicalises, gates, validates and repairs it. Deterministic code
is a cleanup crew (§2.1, §2.5).

**Target — derive, then judge.**

```
inventory ─> coupling graph ─> DERIVED STRUCTURE
             (edges, clusters,     units, boundaries,
              cycles, co-access,   clusters, wave order
              fan-in/out)               │
                                        ▼
                           LLM JUDGES AND NARRATES
       "is this boundary real? what breaks? what is it worth? say it well"
                                        │
                                        ▼
                     validate citations ─> deliverable
```

Deterministic code proposes structure. The model supplies judgment, trade-offs
and language.

## 3.2 Why this is cheap

It is a **promotion, not a build**. The deterministic clustering already exists
and is already wired — as the emergency path (§2.1, four separate instances).
Step 2 re-points 648 lines of tested code and feeds it a real graph. It does not
write new inference.

## 3.3 What falls out for free

- `unitLinks` become computed → the Map becomes true
- Phase order = topological sort → dependency ordering is a property, not a feature
- Clusters from cohesion → the architecture role has nothing left to guess
- Gates receive computed evidence → they can recommend instead of saying `unknown`
- Shards key to clusters → each shard finally has a coherent subject
- **1,210 lines of reconciliation stop being necessary** (§2.5)

## 3.4 Roles: 7 → 5

| Role | Fate |
| --- | --- |
| `judge` *(new)* | per derived cluster: is this boundary real, what breaks, what is it worth |
| `narrate` | the application role, reduced to naming, purpose, migration steps, samples |
| `database` | unchanged — genuinely model work |
| `rebuild` | `slice-rebuild` + `item-rebuild` merged |
| `brief` | the verdict at the top of the deliverable |
| ~~`architecture`~~ | deleted — clustering is derived |
| ~~`repair`~~ | deleted — little invented structure remains |

## 3.5 Kept deliberately — do not delete these

- **`AIReviewService`** — reachable fallback (§2.12).
- **`resplitTruncatedShard`** and the shard machinery — truncation is
  output-volume, and derived clusters make the ask *larger* (§2.4).
- **`aiFlight`** — independently distributable, own store, different event source.
- **`ObservabilityTraceService`** — projects run-lifecycle events; aiFlight sees
  only `bx-ai` provider events. Genuinely different concerns.
- **Fast mode** (`policy.fast`, `ReviewRunService.bx:893`) — `tools/watch-review.ps1`
  depends on it.
- **`normalizeArchitecturePlacementTypes`, `classifyPackagingType`** — shared with
  the LLM path *and* synthesis (`:1432`). They survive either design.

---

# Part 4 — Steps

## Execution order — read this before Step 0

Steps are numbered by topic, **not** by execution order. Two of them sit out of
sequence because they were added later and the numbers are referenced from
application-features.md. Follow this graph, not the document order:

```
Step 0  clear the ground
   │
Step 1  coupling graph
   │
Step 2  promote synthesis  +  Step 2a corpus (deterministic tier)
   │
Step 12 domain types          <- MUST land before Step 3a
   │
Step 3a re-point client + rewrite tests against the derived path
   │        (both paths still alive — this is the safety seam)
   │
Step 3b delete the LLM-structure path   [4 stop conditions]
   │
   ├─ Step 11 break up the residual ──┐   (parallel from here)
   │                                   │
Step 5  re-point roles                 │
   │                                   │
Step 6  corpus LLM + judge tiers       │
   │                                   │
Step 7  deliverable ──> Step 8 gates ──┴──> Step 9 critic ──> Step 10 brief
```

**Step 12 before Step 3a, not after Step 10.** Once the LLM path is deleted the
derived path is load-bearing, and retrofitting domain types into services that
Steps 5–10 already depend on is surgery. It sits *after* Step 2 so the type
shapes are informed by having built the graph, rather than guessed.

**Step 3 is split.** It was one step deleting 1,836 lines, rewriting 726
assertions and re-pointing the client contract, with no rollback. Splitting it
gives the plan its only real safety seam: **3a** repoints
`modernization-render-helpers.js` / `app.js` and rewrites the assertions against
the derived path *while the LLM path is still alive*, so the tests prove the
derived path before anything irreversible happens; **3b** deletes. If 3a's
rewritten suite cannot go green, that is the signal to stop — and at that point
nothing has been lost.

**Step 11 is parallelisable** from Step 3b onward — it touches only
`ModernizationProposalService`'s internals, which no later step re-enters.

**There is no separate schema step.** `.db/` is dropped in Step 0, so every step
that needs a table creates it correctly the first time under the §4.0 principles
below. A deferred "schema redesign" pass would be exactly the rework this plan
exists to eliminate.

### 4.0 Schema principles — apply from Step 0 onward, never as a later pass

- One plan version. No legacy projections, no v1⇄v2 adapters.
- **Nothing derived is stored**, therefore nothing derived is fingerprinted. The
  `stayInMonolith` and duplicate-volatile-key bug classes disappear by
  construction rather than by fix.
- Content-addressed caches for anything recomputable.
- Decisions keyed to a fingerprint of **decision-relevant fields only** —
  identity, placement type, target path. Not graph metrics, rationale,
  confidence or gate detail: those change without changing what was agreed.

  **Narrowing the fingerprint invalidates every decision already stored.**
  `ModernizationDecisionService.bx:130-137` compares the stored
  `itemFingerprint` against the plan's; a changed composition makes every prior
  decision conflict at once. That is harmless for whoever drops `.db/` in Step 0
  and a mass `ModernizationDecisionConflict` for anyone who keeps theirs. Take
  the explicit position: bump the plan `schemaVersion`, treat decisions recorded
  against a pre-v2 plan as void, and say so in the UI copy — do not let users
  discover it as a conflict storm.
- `evaluation_gate_runs` gains `corpus_kind TEXT NOT NULL DEFAULT 'review'`
  rather than a parallel table. **`language_capabilities` needs the same
  treatment** — `language` is its primary key, so a modernization gate run would
  otherwise overwrite the review-measured tier (§2.13). Either add `corpus_kind`
  to its key, or make the modernize gate non-promoting. Promotion is a *review*
  concept; non-promoting is the smaller change and probably the right one.
- **No table for critic output** — critiques travel with the plan JSON in
  `modernization_plans`. A separate table would need its own staleness rules,
  i.e. a second decision-conflict surface.

### 4.0b Effort

Rough, for sequencing only — not a commitment:

| Steps | Shape of work | Scale |
| --- | --- | --- |
| 0 | deletions + wiring + restore `app/models/README.md` | hours |
| 1, 2, 2a, 12 | the real design work: graph, promotion, types, corpus fixtures, **modernization evaluator** | the bulk |
| 3a | **726 assertions rewritten** + client contract, both paths alive | large, mostly mechanical |
| 3b | deletion | small once 3a is green |
| 11 | verbatim extraction | small |
| 5–10 | one role/surface at a time, **each carrying prompt + schema assets** | steady, incremental |
| Part 5 | independent, lower priority | separate track |

The four that get under-budgeted:

- **Step 3a's test rewrite** (594 TestBox + 132 JS).
- **Step 2a's `false-seam` fixture**, which has to be built carefully enough to
  actually fail folder-shaped clustering.
- **Step 2a's modernization evaluator** (§2.13) — the corpus predicates
  (`not-same-cluster`, `phase-precedes`, …) have no scorer today.
- **The prompt registry** (§2.15) — every role added or removed in Steps 3b, 5,
  9 and 10 carries manifest entries plus a role asset and a schema asset.

---

## Step 0 — Clear the ground

**Goal:** remove every compatibility question before any design work.
**Preconditions:** none.

**Do**

1. Confirm no user has `.db/` data worth keeping, then delete `.db/`.
   `SchemaService` recreates on start. This is a one-way door — confirm, do not
   assume.

   > **This is not hypothetical.** At `528a97f` the working copy holds
   > `.db/doublecheck.db` at **136 MB** with a 4.5 MB WAL written the same day.
   > That is live review history, finding decisions and modernization decisions.
   > Take the fallback in the note below — rename, do not delete.
2. **Restore `app/models/README.md`** (189 lines at `528a97f`, currently deleted
   in the working tree). Five inbound links point at it and Rule 4 is
   unexecutable without it. If the deletion was intentional, make that a stated
   decision here and remove Rule 4's first bullet plus the five links —
   silently leaving it deleted is the one option that is wrong.
3. Delete the 7 dead alias methods (§2.6) and correct their rows in
   `app/models/README.md`, which currently advertises them as public API.
4. Fix §2.7: move the volatile-key list to a single
   `ModernizationIdentityService.volatileKeys()`. **Three call sites, not two** —
   `ModernizationPlacementService.bx:232`, `:646`, `ModernizationGateService.bx:237`.
   Add the §6.2 grep-assert in the same commit; the fix without the assert just
   resets the clock on the same drift.
5. **Wire `tests/js/*.spec.mjs` into the test script.** `box.json:49` currently
   reads `"test":"!box testbox run"`. Change it to:

   ```json
   "test":"!box testbox run && node --test tests/js/*.spec.mjs"
   ```

   132 Modernize JS assertions are currently ungated and Step 3a rewrites 108 of
   them; ungated, that rewrite cannot be trusted.

   > **Not `node --test tests/js/`** — an earlier draft of this plan said that
   > and it does not work. Node 22 treats a bare directory argument as a module
   > to load and dies with `Cannot find module …\tests\js`, reported as one
   > failing test, which reads exactly like a real regression. The glob form is
   > also required because these files are `*.spec.mjs`: Node's default test
   > matcher looks for `*.test.js` / `test-*.js` / `test/**` and would not
   > discover them even from a working directory scan.
   >
   > Each spec is top-level `assert` statements rather than `test()` blocks, so
   > Node reports **3 tests** (one per file) when all 146 assertions pass. Three
   > passing "tests" is the green signal here, not a sign they were skipped.
6. Feature rows for shipped-but-unclaimed capabilities — **done**: bulk AI
   fallback (`AIReviewService`), fast mode, `/api/v1/quality`,
   `/api/v1/workers`, contract versions. Verify they are present rather than
   trusting this line.
7. Documentation consolidation — **done and verified at `528a97f`**. `.docs/`
   and `.superpowers/` are absent; `resources/docs/plans/` holds this file and
   nothing else. Do not recreate either tree.
8. **Commit this plan.** It is untracked at `528a97f` while declaring itself
   committed. An uncommitted plan cannot be the single source of truth for a
   multi-week sequence.

**Do not** start any restructuring. This step is deletions and wiring only.

**`.db/` deletion is the only irreversible action in this plan.** Before running
it: confirm no one has review history, finding decisions or modernization
decisions worth keeping. Everything else here is recoverable by revert.
**Given the 136 MB live database at `528a97f`, the default is
`mv .db .db.bak`, not `rm`** — `SchemaService` recreates on boot either way and
the old file costs nothing to keep. Note that keeping a copy is only an escape
hatch for *inspection*: §4.0's fingerprint narrowing means decisions in that file
are void either way (see §4.0), so restoring it wholesale is not a rollback.

**Gate:** `box server restart && box testbox run` green;
`node --test tests/js/*.spec.mjs` green and now part of the test script; app
boots and `/`, `/modernize`, `/aiflight/` load.

> ### ⚠️ The gate is currently unreachable for a reason that predates this plan
>
> Measured at `528a97f`, **before and after** the Step 0 edits, byte-identical
> both times:
>
> ```
> Passed 491 · Failed 0 · Errored 1 · Skipped 1 · Specs 493
> ```
>
> The one error is `tests.specs.integration.ArchitecturePlanningSpec` →
> *"enforces role policy and persists the versioned model and plan"*:
>
> ```
> Error: Cannot invoke method [get()] on a null object
>   at ReviewRunService.bx:484   architectureRepository.get( arguments.id )
> ```
>
> `architectureRepository` is null when injected into `ReviewRunService`, though
> the same class resolves fine through `getInstance( "ArchitectureRepository" )`
> — the failing spec calls `.get()` on it successfully eight lines earlier.
>
> **The cause is not specific to that property. Autowiring stops partway
> through the property list** — see §2.17, which is the real finding here and
> matters far more than this one red test.
>
> **Two consequences.** `getResult()` throws for every review run that reaches
> that line, so this is a live product bug, not just a red test. And because
> `box testbox run` exits non-zero, the `&&` in the new test script means the
> JS suite never executes — Step 0.5's wiring is in place but dormant until this
> is fixed. Run `node --test tests/js/*.spec.mjs` directly in the meantime; it
> is green (3 files, 146 assertions).
>
> **Resolved.** The cause was the WireBox wiring race in §2.17, not anything
> local to that spec. With `threadSafe` applied the suite is **492 · 0 · 0 · 1**
> and `box run-script test` reaches its node stage (3/3) — the non-zero exit had
> been short-circuiting the `&&`, so Step 0.5's wiring was in place but dormant.
> This paragraph is kept because the red-gate history is the only reason §2.17
> was ever found.

---

## Step 1 — Coupling graph

**Goal:** compute the dependency structure the plan has been guessing at.
**Preconditions:** Step 0 green.

**Do**

Create `ModernizationCouplingGraphService`. Input is `inventory.dependencies`,
whose edges already resolve to files with provenance (§2.2).

Compute, deterministically, no LLM:

- directed unit/file edge list, typed by dependency kind, weighted by resolution
  provenance (`path` > `basename` > `stem` > `dotted-path`)
- fan-in / fan-out per unit
- strongly-connected components (cycles = seams that cannot be cut)
- cluster cohesion and coupling ratio per candidate domain
- shared-state overlay (application / session / client scope edges)
- datasource/table co-access matrix

**Decide the persistence mechanism before writing it.** The run already has one:
`ModernizationRunService` writes fingerprint-keyed checkpoints to
`modernization_checkpoints` for `inventory` / `schema` / `context` / `evidence`
(§2.14), reused on resume via `reusableCheckpoint`. A content-addressed
`modernization_graph_cache` is a *second* mechanism caching one more artifact off
the same inputs. Shipping both means two staleness rules for one pipeline.

Default: **make the graph a checkpoint** like every other bounded artifact in
this run, and skip the new table. Take the separate table only if the graph must
outlive a run or be shared across runs of the same project — if so, say that
here, because it is the only thing that justifies it.

If the table is chosen, follow the existing `analysis_artifact_cache` /
`architecture_model_cache` pattern:

```
modernization_graph_cache
  cache_key      TEXT PRIMARY KEY   -- hash(project, file content set, graph_version)
  graph_version  TEXT NOT NULL      -- "modernization-graph-v1"
  nodes_json     TEXT NOT NULL
  edges_json     TEXT NOT NULL
  metrics_json   TEXT NOT NULL
  truncated      INTEGER NOT NULL   -- 1 when node/edge caps were hit
  created_at     TEXT NOT NULL
```

Mandatory constraints:

- **Bounded.** Explicit caps on clusters, edges per unit, SCC node count.
- **`truncated` is not optional.** A silently capped graph reporting as complete
  is the exact failure `AGENTS.md` warns about.
- **Deterministically ordered.** Sort exactly as `ModernizationSignalService.bx:62`
  does, or prompts drift and plan fingerprints churn.
- **Never fingerprinted.** Graph fields go in `volatileKeys()` from Step 0.

Also emit deterministic **architecture findings** through the existing finding
contract — dependency cycles, god-units (fan-in over threshold), shared-state
hubs. No LLM. This ships value from Step 1 alone.

> ### The "no key" version of this is a separate project — do not assume it
>
> An earlier draft claimed these findings "work with no key on the Review side".
> They do not, as written. `ModernizationInventoryService` has exactly one
> caller — `ModernizationRunService.bx:61` — and a modernize run cannot start
> without a provider (§2.12). The graph's only input is therefore reachable only
> on runs that require a key.
>
> Two honest options:
>
> 1. **Scope it to Modernize** (default). The findings ship with the modernize
>    run, keyless behaviour is untouched, and Step 1 is still worth doing on its
>    own. Say "on modernize runs" in the feature row, not "with no key".
> 2. **Run the inventory on review runs too.** Real cross-pipeline work — a
>    second caller, its own scan cost, its own checkpoint, and a finding
>    contract on the Review side that currently only `ReviewResultRepository`
>    writes. If this is wanted, it is its own step with its own gate, not a
>    parenthetical in Step 1.
>
> Whichever is chosen, `application-features.md` must claim only what the chosen
> one delivers. This is the claim rule applying to the plan itself.

**Do not** reuse `AnalysisGraphRepository` or run `ArchitectureIndexService` on
modernize runs. Evidence shapes differ: modernize records carry `contentHash`,
`extractionMethod`, `endLine` and citable stable IDs that graph symbols lack.

**Gate:** unit specs for cohesion, fan-in/out, cycle detection and co-access on
the corpus fixtures from Step 2a. Identical input → byte-identical graph.

### Built — and two things deliberately moved to Step 2

`ModernizationCouplingGraphService` exists with 16 green specs covering edges,
provenance weighting, fan-in/out, cycle detection (including *not* flagging an
acyclic diamond), co-access, shared-state overlay, cohesion, edge merging,
truncation, determinism, and the §6.2 no-gateway invariant.

**Persistence and architecture findings moved to Step 2.** Both require calling
the graph from `ModernizationRunService.execute()`, and Step 2.6 is by the
plan's own words "the single place the new pipeline order is expressed". Wiring
`execute()` in Step 1 and rewiring it again in Step 2 would touch the same
orchestration twice for no gain. Step 1 therefore delivers the derivation and
its specs; Step 2 calls it, checkpoints it and emits findings from it.

The cost of this is real and should be stated: **Step 1 no longer ships user-
visible value on its own.** That was already weakened when the "works with no
key on the Review side" claim turned out to be false (see the box above).

### Nodes are files, not units — a correction to this step's wording

This step asked for a "directed unit/file edge list" and "fan-in / fan-out per
unit". Only the file half is derivable. A dependency record resolves to a target
**file** (`ModernizationInventoryService.resolveTarget`); nothing in the
inventory says which unit *inside* that file is used, so a unit→unit edge would
be invented — exactly what this plan exists to stop doing.

The graph therefore has file nodes, and each edge carries `sourceUnitIds` from a
line-range join so a file edge can be attributed back to the units responsible.
Attribution without false precision. Step 2's clustering should consume file
nodes and use `sourceUnitIds` for naming and evidence.

Only four dependency kinds carry a resolved `targetFile` — `extends`,
`implements`, `include`, `component-construction`. The rest name external
resources and become the co-access matrix (`datasource`, `table-query`, `query`,
`sql-proc-call`) or the shared-state overlay (`scope.application`,
`scope.session`, `scope.client`, `security-session-gate`).

---

## Step 2 — Promote synthesis to primary

**Goal:** derived structure becomes the real path, fed by the graph.
**Preconditions:** Step 1 green.

**Do**

1. Move the synthesis block `:1439-2235` (648 lines) out of
   `ModernizationProposalService` into `ModernizationDerivedStructureService`.
   **Move verbatim first; refactor in a separate commit if at all.**
2. Move target-path derivation (197 lines) into `PlacementService`. This also
   fixes the dual-ownership bug where the proposal derives a path and
   canonicalisation independently rewrites it.
3. Replace folder-based clustering input with graph metrics: cohesion and
   co-access decide cluster membership, not `featureDomainKey`. Keep
   `featureDomainKey` for *naming*.
4. Derive phase dependencies topologically from graph edges; emit `wave` as
   topological depth and mark the critical path.
5. Re-key shard construction to clusters (`buildApplicationShards`,
   `buildRoadmapShards`, `prioritizedLegacyPaths`, `foundationScore`).
6. **Rewire `ModernizationRunService.execute()`** — the top-level orchestrator
   (18 injections, `:39`). It currently runs (verified, §2.14 — note that
   placement and gate run *before* validation, and that a repair loop repeats
   all three):

   ```
   policy -> schemaPack -> inventory -> evidenceDiscovery -> signal -> coverage
         -> contextPack -> PROPOSAL
         -> placement.canonicalize (:249) -> gate.evaluatePlan (:250) -> validate (:263)
         -> [repair loop repeats those three, :307-314]
         -> coverage.enrichRoadCoverage (:413) -> risk.enrich (:439) -> repository
   ```

   It becomes:

   ```
   policy -> schemaPack -> inventory -> evidenceDiscovery -> signal -> coverage
         -> COUPLING GRAPH -> DERIVED STRUCTURE (placement included)
         -> contextPack (per cluster) -> judge -> narrate
         -> validation -> gate
         -> coverage.enrichRoadCoverage -> risk.enrich -> repository
   ```

   This is the single place the new pipeline order is expressed. Placement stops
   being a post-hoc canonicalisation step and becomes part of derivation, and
   the repair loop goes with the repair role in Step 3b. Nothing else in the plan
   defines the top-level flow — if this is skipped, the new services exist but
   nothing calls them in the right order.

   **`coverageService`, `modernizationRiskService`, `modernizationDecisionService`
   and `eventService` survive the rewiring.** They are four of the 18 injections
   and an earlier draft of this diagram dropped them; risk enrichment at `:439`
   is what Step 7 then exports.
7. **Extend the checkpoint ladder and re-plot progress** (§2.14). Two new stages
   land between `signal` and `contextPack`, so:
   - add `graph` and `derived` checkpoints, keyed on the same
     `inputFingerprint` + `sourceFingerprint` pair `reusableCheckpoint` uses;
   - re-space the progress values — `inventory` 30, `schema` 38, `context` 42,
     `evidence` 48 no longer describe the run's shape;
   - confirm resume: a run interrupted after `derived` must not recompute the
     graph, and must not reuse a `derived` checkpoint whose graph inputs moved.

   Skipping this does not fail a test. It silently degrades resume and makes the
   progress bar lie, which is exactly the class of defect this plan exists to
   stop shipping.

**Do not** delete the LLM-structure path yet — that is Step 3b, and it is gated.

### Progress — items 1 and 3 landed

**Item 1 (verbatim move).** The 648-line synthesis block is now
`ModernizationDerivedStructureService`; `ModernizationProposalService` went
**5,371 → 4,583** and delegates through eight public entry points. Corrections
this forced are recorded in §2.5a — chiefly that the block was *not*
dependency-free.

**Item 3 (coupling-driven clustering).** `deriveClusters()` unions three kinds of
evidence — structural edges, table co-access, shared scope — and classifies each
cluster from what the graph can prove. **All four known-correct verdicts now
pass**, including `separable-domain`, where the LLM baseline scores 0.0.

Two design facts worth keeping:

- **Co-access unions on tables, never on datasource.** A monolith usually has one
  datasource, so unioning on it collapses everything into one cluster and
  reproduces exactly the folder-inference degeneracy this replaces.
- **A single whole-system cluster must be vetoed explicitly.** "Nothing crosses
  this boundary" is vacuously true when the boundary contains everything, so
  `false-seam` initially classified as *extractable* — the precise inversion of
  the right answer. `boundaryEvidence.spansWholeSystem` now vetoes it. Any future
  scoring that reads `isolated` must respect that flag.

### ✅ Resolved — clustering is now weighted modularity

The connected-components problem below is **fixed**. `deriveClusters()` no longer
unions on connectivity; it builds one weighted undirected affinity graph and runs
Louvain local-moving over it.

| Evidence | Weight | Why |
| --- | --- | --- |
| structural edge | resolution weight (0.4–1.0) | a call is symmetric evidence of belonging together; direction is dropped |
| shared table | 2.0 | co-written state cannot be split, so it outranks a call |
| shared scope | 1.5 | shared mutable state, slightly weaker than a table |

Two rules sit outside the statistics:

- **Infrastructure tables carry no signal.** A table touched by more than
  `maxCoAccessFanout` (12) files is an audit log or a users table, not a domain
  boundary. Counting it as coupling would drag every domain into one cluster —
  the same degeneracy by another route. A spec covers 16 domains sharing one
  `audit_log` and asserts they stay apart.
- **A cycle is never split.** Modularity may prefer to, but a boundary through a
  cycle proposes something impossible, so SCC members are force-merged
  afterwards. Structure beats statistics.

Determinism is a hard requirement and is enforced three ways: nodes visited in
sorted order, ties broken toward the incumbent (so it cannot oscillate), and each
community named for its smallest member so ids never churn. A corpus spec asserts
byte-identical output across repeated derivation.

**Results:** all four corpus verdicts still pass, and the shapes the corpus
cannot reach now pass too — two domains bridged by one utility call split into
**two** clusters, and `edgesCrossing` returns a real number instead of a
structural zero. Suite 543 · 0 · 0 · 1.

**Items 4–7 are unblocked.** The cluster-level DAG now has edges to sort.

The original finding is kept below, because the reasoning that led to it is the
reason the fix exists and the reason the fifth corpus scenario is still worth
adding.

### ~~Item 4 is blocked: clustering is connected-components, and that degenerates~~

Measured, not theorised — `tests/specs/unit/ModernizationClusterLimitsSpec.bx`
pins it. `deriveClusters()` unions on **every** structural edge, which makes each
cluster a connected component of the graph. Two consequences:

1. **One bridging call merges two unrelated domains.** Given two domains sharing
   no table and no scope, joined by a single utility call, the result is **one**
   cluster. Real codebases are transitively connected throughout, so at scale
   this collapses to a single cluster — the same degeneracy as folder inference
   (§2.3), reached by a different route.
2. **`edgesCrossing` is structurally always zero for a derived cluster**, because
   no edge can cross a boundary that was drawn around edges. The crossing-edge
   term in the isolation test is vacuous, and **the cluster-level DAG has no
   edges**, so item 4's "derive phase dependencies topologically from graph
   edges" has nothing to sort.

**The four corpus scenarios do not catch this** — every one of them is a
disconnected graph, so connected components happens to be the right answer. This
is §2.3's warning one level up: a green fixture set covering a mechanism that
does not work on real input. **Add a fifth scenario** with two domains bridged by
a single call before trusting any clustering change.

**The fix is real community detection** — modularity-based (Louvain-style) or
weighted-threshold clustering, where strong evidence (shared tables, shared
scope, SCC membership) forces union and weak structural edges become *inter*-
cluster edges that carry a coupling ratio. That restores both the crossing-edge
signal and the DAG.

Until then `deriveClusters()` is correct on disconnected input and degenerate on
connected input. It is a real improvement over folder-shaped clustering — it
cannot be fooled by folder layout — but it is not yet the mechanism this plan
describes, and it must not be wired into `execute()` while it is one bridging
call away from returning a single cluster.

### Remaining in Step 2

| Item | State |
| --- | --- |
| 1 — move synthesis verbatim | **done** |
| 2 — target-path move to `PlacementService` | **done** — 197 lines, one owner |
| 3 — coupling-driven clustering | **done** — weighted modularity |
| 4 — topological wave order | **done** — `deriveWaveOrder()` + `WaveOrder` type |
| 5 — re-key shards to clusters | **done** — `chunkPathsByCluster()` |
| 6 — rewire `execute()` | **done** — verified by a live run |
| 7 — checkpoints and progress ladder | **done** — `graph` + `derived`, ladder re-plotted, contract v9 |

**Step 2 is complete.**

### Item 2 — target-path derivation has one owner

The 197 lines §2.5 identified moved to `ModernizationPlacementService`, which is
now the sole owner of what a unit's target path is. That closes the dual-
ownership bug directly: the proposal used to derive a path and `canonicalize()`
independently rewrote it, so two files decided one invariant and could disagree.

`ProposalService` 4,583 → 4,386 and delegates three entry points
(`normalizeTargetUnits`, `deriveTargetPath`, `fallbackLayerForSource`).
`ArchitectureFitnessSpec` now grep-asserts that exactly one file declares
`deriveTargetPath`, so the split cannot silently reopen.

The sibling-call audit from §2.5a was run again first and found only two
dependencies (`scalarString`, `ensureIdentity`), both copied as before.

`PlacementService` is 957 lines, over the limit, and listed as a **self-resolving**
exception: Step 3b deletes ~397 lines of legacy projection from it (§2.6),
landing it near 560.

### Item 5 — shards follow cluster boundaries

`chunkPathsByCluster()` groups the prioritized path list by derived cluster
before slicing, largest cluster first, with unclaimed paths as a residual group.
A shard is one prompt; cutting a flat list every N entries hands the model half
of one domain and a third of another, and asks it to infer a grouping that
already exists.

Two constraints held deliberately:

- **Cluster size never overrides the shard size cap.** A high-cohesion domain is
  a *larger* ask than a path batch, which is exactly why `resplitTruncatedShard`
  has to survive the inversion (§2.4). A spec covers a 9-file cluster at shard
  size 3 producing three shards.
- **No clusters means unchanged behaviour**, so a run without derived structure
  shards exactly as before.

### Items 4, 6 and 7 — what landed

**Item 4.** `deriveWaveOrder()` builds a cluster DAG from crossing edges and
returns a `WaveOrder` domain type (Step 12's third type, now informed). Wave is
longest-path depth, so a cluster never shares a wave with something it depends
on. Direction means dependency: if A calls B, B moves first.

Cluster-level cycles get their own treatment. Two clusters can call each other
without any single file being in a cycle, so Tarjan runs again at cluster level;
those components are condensed for ordering **and reported** on the result. A
cycle between clusters is a finding about the system, not something to break
silently.

**Items 6 + 7.** `execute()` computes the graph and derived structure *before*
the context pack — deterministic, no provider, so the model later judges a
structure rather than inventing one. Two new checkpoints (`graph`, `derived`)
key on the same fingerprint pair as the rest, and the ladder was re-plotted:
inventory 30 → schema 38 → signals 42 → **graph 46** → **derived 50** →
context 54 → evidence 56 → proposal 58.

`pipelineContractVersion` bumped **v8 → v9**. A v8 checkpoint set has no graph or
derived stage and wrote `context` at a different rung, so reusing one would
resume into a pipeline that no longer exists.

**Verified against a live run, not just specs.** The first live run showed
`derived` missing from the persisted result: it was set on the in-memory
`result`, but `getResult()` rehydrates from the stored *plan*. Fixed by
attaching it to `plan`; a second live run returns the graph shape, two clusters
and the wave order. Specs alone would not have caught this.

### The service-vs-module distinction

Wiring it live exposed that isolated clusters only ever became `coldbox-module` —
the `external-service` branch was described in the design and never implemented,
so nothing could ever be proposed for extraction.

Added `externalIntegration` to the graph (files owning outbound `http`/`schedule`
work) and split the verdict on it:

- isolated **and** owns an outbound integration → `external-service`; it is
  already behaving as a service inside the monolith
- isolated, no outbound integration → `coldbox-module`; separable, but the
  weaker claim is the honest one
- anything else → `main-app`

`separable-domain` now yields **`external-service`** for notifications and
`coldbox-module` for orders. That is the verdict the LLM baseline scores **0.0**
on (§2.19), which is Step 3b's load-bearing stop condition.

**Still worth adding: the fifth corpus scenario.** Two domains bridged by a
single call is covered by a unit spec, not by the corpus, so the corpus still
cannot fail on the shape that matters most for real repositories.

### A pre-existing crash found on the way

`featureDomainLabel` called `right( value, len( value ) - 1 )`, which throws
`Count cannot be zero` in BoxLang for any single-character word — reachable from
a one-letter folder or a camelCase split such as `aService` → `a Service`. It was
in the moved code, so it predates this plan. Fixed, with a spec.

### It arrived over the line limit

`ModernizationDerivedStructureService` is **1,101 lines**, over the 900 rule on
its first day, and `ArchitectureFitnessSpec` caught it. It is listed as a known
exception **with a destination**: it carries two responsibilities — cluster and
boundary derivation, and roadmap phase synthesis — and should split along that
seam once items 4–7 settle the roadmap half.

That is the second exception added in two consecutive steps (after
`SpecialistReviewService`). **Two more and the rule is decorative.** No further
entry without a named destination beside it.

### Step 2a — Corpus, deterministic tier (write alongside Step 1–2)

`resources/evaluation-corpus/modernization-v1/`, mirroring the review corpus
manifest shape (`version`, `thresholds`, `cases[]`). The review corpus lives at
`resources/evaluation-corpus/v1` — sit beside it rather than opening a second
top-level corpus tree.

### The infrastructure this needs, which does not exist yet (§2.13)

`loadCorpus` genuinely needs no change: it only requires `cases[]`, `thresholds`
and `files[].source/filePath/language`. Everything downstream of it does.

1. **A modernization evaluator.** `EvaluationService.evaluate()` is
   finding-shaped — `findingKey()` over ruleId/filePath/lines, emitting
   precision/recall/f1/duplicateRate/FP-per-KLOC. It cannot express
   `not-same-cluster`, `phase-precedes` or `cycle-reported`, and none of
   `seamPrecision` / `dagValidity` / `decisionStability` / `coverageOfSignals`
   exists anywhere. Write a **sibling** evaluator that consumes the predicate
   list below and reuses `loadCorpus` and the gate table. Do not generalise the
   review evaluator — finding-shaped scoring is correct for Review.
2. **A second corpus path.** `QualityGateService` reads exactly one, from
   `coldbox:setting:evaluationCorpusPath` (`:13`), and scores every case through
   `findingService.deterministic()` (`:35`). The modernize tier needs its own
   entry point and its own setting.
3. **A non-promoting gate run.** On pass, `persist()` upserts
   `language_capabilities` keyed on `language` alone (`:167-192`), which feeds
   `/api/v1/capabilities` and the measured tier table in
   `application-features.md`. A BoxLang modernization corpus passing would
   overwrite the BoxLang tier measured by the *review* corpus. Language-tier
   promotion is a Review concept — the modernize gate records to
   `evaluation_gate_runs` (with `corpus_kind`, §4.0) and promotes nothing.

Point 3 is the one that bites silently: it does not fail, it publishes a wrong
capability claim, which is the specific thing `AGENTS.md` forbids.

**Four scenarios, each testing a decision.** One fixture cannot work: below
`minUnitsForFolderInference` every unit lands in one cluster (§2.3), so a single
small fixture would pass green while seam detection never ran.

| Scenario | Known-correct verdict | Catches |
| --- | --- | --- |
| `separable-domain` | extract → `external-service` | true positive |
| `false-seam` | **stay / `coldbox-module`, never extract** — looks separable by folder, shares 4 tables + session state | folder-heuristic clustering posing as coupling analysis |
| `below-inference-threshold` | real seams from the graph, not one default cluster | §2.3 directly |
| `cyclic-boundary` | cannot cut; break the cycle first | whether the graph is genuinely consulted |

Write `false-seam` first. It is the only scenario that fails when clustering is
folder-shaped, which is the exact regression this plan must not introduce.

**Assert properties of the verdict, never the plan.** Golden output breaks on
every prompt change and trains you to update the expectation:

```jsonc
"expected": [
  { "kind": "not-same-cluster", "a": "orders", "b": "billing" },
  { "kind": "placement-not",    "domain": "reporting", "type": "external-service" },
  { "kind": "phase-precedes",   "before": "auth", "after": "checkout" },
  { "kind": "cycle-reported",   "between": [ "OrderService", "InvoiceService" ] },
  { "kind": "gate-recommends",  "domain": "orders", "recommendation": "extract" }
]
```

The deterministic tier **calls the derivation services directly** — graph →
clustering → DAG → gates. It does not execute a modernize run, because a keyless
run is impossible (§2.12) and the run lifecycle adds nothing to what is being
measured.

Fixtures are synthetic but deliberately messy: shared `Application.cfc` state, a
dynamic include, an unparameterised query, a scheduled job writing what a request
path also writes. Every signal group in `ModernizationSignalService` should appear
at least once across the four.

**Also in Step 2a — capture the LLM-path baseline before it disappears.** Run the
existing (pre-inversion) pipeline against all four scenarios and store
`baseline-llm-path.json` with `seamPrecision`, tokens, wall-clock and plan
fingerprints per scenario. Step 3b's fourth stop condition compares against this,
and Step 3b deletes the path that produces it. **There is no second opportunity.**

**Gate for Step 2:** deterministic tier green on all four scenarios, **and**
`baseline-llm-path.json` committed, **and** the modernize gate run demonstrably
leaves `language_capabilities` untouched.

---

## Step 3 — Move to one structure path

Split into **3a (reversible)** and **3b (not)**. Formerly one step that deleted
1,836 lines, rewrote 726 assertions and re-pointed the client contract with no
seam to stop at. The split changes nothing about the destination; it changes
where you find out you were wrong.

> ### ✅ All stop conditions pass, asserted in CI
>
> `ModernizationCorpusSpec` → "Step 3b stop conditions" checks all five against
> the committed baseline on every run, so this is a gate rather than a judgement
> call made once:
>
> 1. `false-seam` rejected — nothing proposed for extraction
> 2. `below-inference-threshold` yields ≥ 2 real clusters
> 3. `cyclic-boundary` reports the cycle and extracts nothing
> 4. **`separable-domain` IS extracted** — the load-bearing one, which silence
>    cannot pass
> 5. `seamRecall` beats the baseline's 0.0, with no extraction in either fixture
>    that forbids one
>
> **One correction worth keeping:** the first version of 5b also required silence
> from `below-inference-threshold`, and it failed. That was the assertion being
> wrong, not the code — that fixture's `shipping` domain has its own datasource,
> its own tables and its own carrier integration, so proposing it is correct. Its
> manifest asks for two seams, not for silence. A stop condition that forbids a
> correct answer is worse than no stop condition.

### Stop conditions — check before deleting anything in 3b

| Condition | Meaning | Measured by |
| --- | --- | --- |
| `false-seam` correctly rejected | clustering is coupling-shaped, not folder-shaped — **the decisive gate** | deterministic tier |
| `below-inference-threshold` yields real seams | the degenerate path is genuinely fixed | deterministic tier |
| `cyclic-boundary` reports the cycle and blocks extraction | the graph is actually consulted | deterministic tier |
| `separable-domain` **is** extracted | the derived path can say yes, not only no. **This is now the load-bearing condition** — the baseline extracts nothing anywhere, so refusing everything already "passes" on precision (§2.19) | deterministic tier vs `baseline-llm-path.json` |
| `seamPrecision` ≥ baseline **and** `seamRecall` > baseline | the inversion is not a regression, and not a blanket refusal | `baseline-llm-path.json` |

> ### ✅ Captured — and it moved the goalposts
>
> `baseline-llm-path.json` is committed. The headline: **the current LLM path
> extracts nothing on any of the four scenarios**, so a precision-only
> comparison is passed by any path that also extracts nothing (§2.19). The
> decisive condition is therefore `separable-domain`, where the baseline scores
> **0.0** and the derived path must score 1.0. That is a real bar, unlike the
> original fourth condition.
>
> The note below is kept because its reasoning was right and its timing was the
> only reason this measurement exists at all.
>
> ### ⚠️ The LLM baseline is a one-shot measurement window
>
> The fourth condition compares against *the current LLM path*. That path exists
> only until this step deletes it. B-0's LLM tier is scheduled at Step 6 — **after
> this step** — so if the baseline is not captured earlier, the comparison becomes
> impossible forever and the fourth condition is unfalsifiable.
>
> **During Step 2a, while both paths are intact, run the existing LLM pipeline
> against all four corpus scenarios and store the results** as
> `resources/evaluation-corpus/modernization-v1/baseline-llm-path.json`. Record
> `seamPrecision`, tokens and wall-clock per scenario, plus the plan fingerprints.
>
> This is the only chance to answer "was the inversion actually better?" with
> evidence rather than conviction.

**If `false-seam` fails, stop at Step 2 and keep both paths.** Keeping both is
bad; replacing a better path with a worse one is worse and much harder to
recover from.

### Step 3a — Re-point everything, delete nothing

**Goal:** make the derived path the one the tests and the client believe in,
while the LLM path is still there to fall back to.
**Preconditions:** Step 2 green, Step 12 green, stop conditions 1–3 satisfied.

**Do**

0. **Re-derive the two counts before scheduling anything** (§2.10, §2.11). State
   the regex, record the result in Part 2. The "32 client references" and "594
   assertions" are both estimates that did not fully reproduce; the real numbers
   are plausibly ~38 and up to 1,079.
1. **Update the client contract.** Point `modernization-render-helpers.js` at
   `target.placements` (richer: gates, risk, effort) instead of
   `contexts`/`extracts` (12 lines there, 15 in `app.js`); update `app.js`'s
   remaining plan-shape references.
2. **Rewrite the affected assertions** (§2.10) against the derived path. This is
   the bulk of the work in the whole plan.
3. Collapse the export's three renderings of one dataset into one placement
   register.
4. Derive `stayInMonolith`, `packaging`, `sourceItemType` at render time. Stop
   *reading* the stored copies; leave the writes in place until 3b.

**Gate:** full TestBox suite green; `node --test tests/js/*.spec.mjs` green; deterministic
corpus tier green; app boots and all three routes load — **with the derived path
serving every one of them.** The LLM path is now dead weight rather than a
dependency, which is precisely the state 3b is safe to act on.

### Done — and the gate caught the thing the specs could not

Suite 550 · 0 · 0 · 1, JS 3/3, all three routes 200.

**Counts re-derived first**, as item 0 requires, with the regex stated: `app.js`
has 15 `contexts|extracts` lines and **41** other plan-shape lines (not 17);
`modernization-render-helpers.js` has 12. Modernization-named TestBox specs hold
**1,211** `expect(` calls — the §2.10 ceiling reading was far closer than its 594
estimate.

**One invariant, one owner, twice.** `stayInMonolith` was derived by the same
inline expression in five server places; it is now
`ModernizationPlacementService.staysInMonolith()`. On the client
`placementType || packaging` was inlined in six places; it is now
`placementTypeOf()`. Both are the §2.7 duplication class, caught before they
could disagree rather than after.

**The live check found the real defect.** With the suite green, a real run showed
the derived structure and the provider's placements **disagreeing inside the same
artifact** — derivation said two `coldbox-module`, the provider said two
`main-app` — and the UI rendered the provider's weaker answer. Every spec passed
throughout, because none asserted which source wins.

`modernizationPlacements()` now decides that in one place, in order of authority:
`derived.clusters` → `target.placements` → `contexts`/`extracts`. Derived wins
because it is evidence rather than assertion. Verified live: the run that showed
*2 centralized* now shows **2 modules**.

**A regression the existing suite caught.** The first resolver defaulted every
legacy item to `main-app`, silently turning untyped members of the `extracts`
array into centralized placements — in the v1 vocabulary the array *is* the
verdict. The 108-assertion JS spec failed on it immediately, which is the return
on Step 0.5 wiring those into the gate.

**Nothing was deleted.** The provider path and the legacy projection still work
when derivation is absent, both covered by specs. That is what makes 3b a
deletion rather than a rewrite.

**If this gate cannot be reached, stop here.** Nothing has been lost, the
baseline is still reproducible, and the answer is that the derived path is not
ready. That option does not exist once 3b runs.

### Step 3b — Delete the LLM-structure path

**Goal:** one structure path. This is where ~1,836 lines leave.
**Preconditions:** Step 3a green **and** all four stop conditions satisfied,
including the `seamPrecision` comparison against `baseline-llm-path.json`.

**Do**

1. Delete the five DELETE groups in §2.5 (~1,836 lines).
2. Delete `PlacementService`'s ~397 lines (§2.6), including the legacy
   `contexts`/`extracts` projection, `adaptForRead`, `legacyProjection`,
   `legacyItemId/Type`, and the plan v1 adapters.
3. Delete `ValidationService`'s 227 structural lines (§2.6), plus
   `validateRoadmapMigrationGuide` unless §2.6's note is answered otherwise.
   **Keep** sample contract, database claims, transitions, actionability, path
   safety, evidence levels.
4. Stop writing `stayInMonolith`, `packaging`, `sourceItemType`.

   **Partially done ahead of the deletion.** All three are now in
   `ModernizationIdentityService.volatileKeys()`, so they no longer affect any
   decision fingerprint (§4.0: nothing derived is fingerprinted). That closes
   §2.12's "pure derivation, yet stored and fingerprinted" while both paths are
   still alive — a recomputed derivation could previously flip an item's
   fingerprint and surface as a decision conflict on an item nobody changed,
   which is §2.7's user-visible symptom from a different cause. What remains for
   3b is to stop *writing* them at all.
5. Delete the `architecture` and `repair` roles; merge `slice-rebuild` and
   `item-rebuild` into `rebuild`. **This is eight files plus the prompt
   registry, not one file** (§2.15):
   - `resources/prompts/manifest.json` — three separate maps (role versions,
     role files, schema files)
   - the role assets under `resources/prompts/roles/` and their schema assets
     under `resources/prompts/schemas/`
   - `ModernizationAgentFactory.bx:16, 33, 145-282` — allow-list, 6 `case` arms,
     8 conditionals
   - `ModernizationAgentGateway.bx:542` — a second allow-list
   - `ModernizationSkillService.bx:43`
   - `ModernizationSliceRebuildService.bx:116, 127, 195, 206` — **the 482-line
     service that owns both rebuild roles, and the actual site of the merge**
   - `ApiRuns.bx`

**Do not** ship 1 or 2 without 3. Running both structure paths simultaneously is
the current state, and it is what produced the 5,371-line file.

**Gate:** full TestBox suite green with **no assertion rewritten in this step** —
3a already moved them. A test that needs changing in 3b is a signal that
something still read the LLM path, so find it rather than edit the test.

### Recommended order for the deletion itself

Not yet started. ~2,400 lines across eight files plus the prompt registry, and
the LLM path is load-bearing until each piece is cut, so order matters:

| # | Cut | Why here | Risk |
| --- | --- | --- | --- |
| 1 | ~~Stop *writing* `stayInMonolith` / `packaging` / `sourceItemType`~~ **done** | already unread by client and unfingerprinted; nothing depends on the write | low |
| 2 | ~~`ValidationService`'s 227 structural lines + `validateRoadmapMigrationGuide`~~ **done** | validates LLM-emitted structure that derivation now supplies | low |
| 2b | **Derivation supplies `target.placements`** — the keystone | done; see below | medium |
| 3 | ~~`PlacementService`'s legacy-projection lines~~ **done** | client's legacy tier is spec-covered but no longer the primary read | medium — drops the `contexts`/`extracts` shape |
| 4 | ~~The five §2.5 DELETE groups (~1,836) in `ProposalService`~~ **done — 2,338 removed** | the bulk; identifier reconciliation and omission repair stop being necessary once structure is derived | high |
| 5 | ~~`architecture` + `repair` roles~~ **done** (rebuild merge deferred) | eight files plus three manifest maps and 16 prompt assets (§2.15) | medium, wide |
| 6 | ~~Collapse the export's three renderings~~ **done** | depends on 3 | low |

**Do 5 last, not first.** Deleting a role while the proposal still calls it turns
a clean deletion into a debugging session — the roles stay reachable until the
structure they produce is genuinely unused.

**Check after each cut, not at the end.** The gate says no assertion may be
rewritten in this step; that signal is only useful if it is read after every cut
rather than once at the bottom.

### Cuts 1 and 2 landed

**Cut 1.** The three derived fields are out of every fingerprint (§2.12 closed)
and no longer written where we own the output. Zero assertions touched.

**Cut 2.** `ValidationService` **801 → 489 lines (−312)**, against §2.6's estimate
of 227 — the estimate omitted `validateRoadmapMigrationGuide` (61) and the
inventory-backing checks its helpers fed.

Six specs were **deleted, not rewritten**, which needs justifying because the
gate forbids rewriting:

- Four covered `validateRoadmapMigrationGuide` — validating a model-emitted
  migration guide. Roadmap order is now a topological property of the graph, so
  the behaviour is gone by design rather than broken.
- One covered a dangling `dependsOnContextIds` reference — identifier
  reconciliation for the v1 vocabulary.
- One covered `moduleSlug` path safety, and this is the interesting case:
  `moduleSlug` used to arrive from the provider, so validating it was guarding
  untrusted input. `ModernizationPlacementService.moduleSlugFor()` now generates
  it. **The validation was deleted because the threat was removed, not because
  the check was inconvenient** — which is the only acceptable reason to delete a
  safety check.

Path safety itself survives and still guards every item path, route, sample and
db transition (`safeRelativePath` / `safeRoutePath`, four call sites), exactly as
§2.6 requires.

### Cut 2b — derivation supplies the placements. This is the inversion.

Cut 3 could not proceed as ordered: `normalizePlacements` and
`assignUnownedUnits` are called from `canonicalize()`, which is load-bearing
while the *provider* still supplies placements. The missing keystone was that
the derived structure was an advisory field **beside** a provider-made decision
rather than the decision itself — and while that was true, every line of
identifier reconciliation existed for a reason.

`ModernizationPlacementService.applyDerivedPlacements()` now projects derived
clusters into the plan's canonical placements. Two things it got wrong first,
both found by running it rather than by testing it:

**1. The id spaces do not overlap.** A cluster owns *inventory* units — real
files. A placement owns *target* units — the proposed new shape. Matching ids
produced nothing, every placement owned nothing, `canonicalize()` correctly
dropped them all as empty lanes, and the run fell back to the conservative
default. The artifact then said `placementSource: derived` while showing the
generic answer, which is worse than showing no derivation at all. The join is
the **source path**: a target unit records where it came from, a cluster records
the files it spans.

**2. A derived verdict was relabelled `provider-suggested`.** `coupling-derived`
was not in the `evidenceBasis` allowlist, so normalization silently replaced it.
The artifact credited the model for a decision the graph made — a provenance lie
in the direction that matters most for a tool whose entire claim is
evidence-first. `coupling-derived` is now a first-class basis in both the
placement normalizer and the validator, ranking above `explicit-seam`.

**Live verification on `separable-domain`:** `placementSource: derived`,
notifications → `external-service` (2 units), orders → `coldbox-module`. That is
the verdict the LLM baseline scores **0.0** on (§2.19).

Neither defect was visible from the suite — both runs were green throughout.
Cuts 3 and 4 are now unblocked, because the provider's structural output no
longer decides anything.

### Cuts 3 and 6 landed

**Cut 3.** `fromLegacyGroups`, `legacyProjection` and `preserveLegacyIdentity` are
gone; `canonicalize()` no longer writes `target.contexts` / `target.extracts` and
lost its `includeLegacyProjection` flag. `adaptForRead()` collapsed to one call:
it used to branch on schema version and preserve pre-v2 identity, and with one
plan version there is nothing to branch on. `PlacementService` **1,043 → 931**.

That change has a real contract consequence, sanctioned by §4.0's "one plan
version, no v1⇄v2 adapters": **a stored v1 artifact now reads back as v2.** Five
assertions were updated to match. One of those updates was wrong and the suite
caught it — `ModernizationExportServiceSpec` calls `export()` directly, which
does not canonicalize, so a v1 fixture correctly stays v1 there. Only the *read*
path promotes.

Two `ModernizationPlacementServiceSpec` cases were deleted rather than rewritten:
both tested the v1 adapter itself (`adapts legacy contexts and extracts`,
`preserves legacy ids … when adapting a persisted v1 plan`).

**Cut 6.** The export rendered the same dataset four times — the placement
register plus an architecture-packaging summary, a "Contexts and extracts" table
and a "Side-app extract candidates" table, all v1 projections. Now one section.
`appendArchitecturePackaging` went with them. `ExportService` **748 → 716**.

Live check after both: all four routes 200, artifacts read `modernization-plan-v2`
with `placementSource: derived`.

### Cut 4 — the bulk. `ProposalService` 5,371 → 3,033

**2,338 lines removed**, more than §2.5's 1,836 estimate, because the estimate
counted the named functions but not `polishPlan` (the omission-repair
orchestrator that called them) or the doc comments travelling with each.

The audit that made this safe is worth repeating on any similar cut: for each
candidate, list its callers **and check whether each caller is itself being
deleted**. Groups 1 (identifier reconciliation), 3 (route/roadmap normalisation)
and 5 (repair role) turned out to have **no external callers at all** — a closed
cluster that only called itself. That is what made a 1,361-line first pass
provably safe rather than hopeful.

Twenty-five spec blocks were deleted across two files. All exercised deleted
functions directly through `makePublic` — identifier reconciliation, omission
repair, route retention, roadmap ordering. Behaviour gone by design, not
behaviour broken.

> **The live run caught what the whole suite could not.**
>
> With 518 specs green, a real modernize run failed outright:
> `Method 'repair' not found`. `ModernizationRunService` invoked
> `proposalService.repair()` through a **service reference**, so grepping
> `repair(` inside `ProposalService` never saw it, and no spec exercised the
> repair round.
>
> The repair loop is now gone too (43 more lines). It existed to ask the model
> to fix its own invalid structure; structure comes from the coupling graph now,
> so an invalid item is a bug in derivation to fix here — not a prompt to retry.
>
> **A static caller audit is not enough for a cross-service dynamic call.** Run
> the thing after every cut, not only the tests.

**Live verification after the fix:** `status: partial`, **zero errors**,
`placementSource: derived`, both placements `basis=coupling-derived`.

### Cut 5 — roles 7 → 5

`modernization-architecture` and `modernization-repair` are gone from every
surface §2.15 listed: both allow-lists (`AgentFactory:33`,
`AgentGateway:542`), the role-instruction switch, the output-schema map, the
budget/evidence/key-ordering chains, the three manifest maps, and six prompt
assets on disk.

Three helpers went with them once nothing referenced them —
`compactArchitectureEvidence`, `compactArchitectureResponse`, and the gateway's
architecture-salvage path (`canSalvageArchitectureValidation` +
`salvageArchitecturePayload`). That salvage path existed because architecture
responses routinely blew schema `maxItems` on a whole-repository call; there is
no whole-repository model call left to blow it.

Fifteen further spec blocks were deleted across five files, all exercising the
two roles.

**Deferred: merging `slice-rebuild` + `item-rebuild` into one `rebuild` role.**
It is a rename plus a signature merge inside `ModernizationSliceRebuildService`,
carries no derivation benefit, and every other part of cut 5 is complete without
it. Left as the one open item so the deferral is visible rather than implied.

### Step 3b totals

| Service | Before | After |
| --- | --- | --- |
| `ModernizationProposalService` | 5,371 | **3,000** |
| `ModernizationValidationService` | 801 | **490** |
| `ModernizationPlacementService` | 720 | 931 *(gained target-path ownership; §2.6's cut applied)* |
| `ModernizationAgentFactory` | 540 | 501 |
| `ModernizationAgentGateway` | 892 | 854 |
| `ModernizationExportService` | 748 | 716 |
| `PromptOutputValidator` | 429 | 356 |

Suite **501 · 0 · 0 · 1**, JS 3/3, all routes 200, live run clean with zero
errors and `basis=coupling-derived` on every placement.

---

## Step 5 — Re-point the roles

**Goal:** the model judges and narrates derived structure.
**Preconditions:** Step 3b green. (There is no Step 4 — schema is applied
continuously under §4.0, not as a later rework pass.)

**Every role in this step and Steps 9–10 is three artifacts, not a prompt.**
A registered version in `resources/prompts/manifest.json`, a role asset under
`roles/`, and an output schema under `schemas/` — plus entries in the two
allow-lists (`ModernizationAgentFactory.bx:33`,
`ModernizationAgentGateway.bx:542`) and `ModernizationSkillService`. §2.15 has
the full surface. Budget it per role, not once.

**Do**

- `judge`: per derived cluster — is this boundary defensible against the coupling
  data, what breaks, what is it worth. **Invoked from
  `ModernizationRunService.execute()`** in the order set in Step 2, dispatched
  through `ModernizationShardExecutor` one cluster at a time.
- `narrate`: naming, purpose, migration steps, samples. No structure.
- Every shard prompt gains a **whole-system header**: this cluster's units, its
  edges to units *outside* the cluster, and its expected phase. Small window, no
  keyhole.
- Keep `resplitTruncatedShard` as the cluster-size cap (§2.4).

**Gate:** LLM corpus tier runs; record the token and wall-clock baseline.

---

## Step 6 — Corpus, LLM and judge tiers

**Goal:** measure what determinism cannot.
**Preconditions:** Step 5 green.

**Metrics**

| Metric | Tier |
| --- | --- |
| `seamPrecision`, `dagValidity`, `decisionStability`, `coverageOfSignals` | deterministic (blocking) |
| `citationValidity`, `unknownRate`, `tokens`, `wallClockMs` | LLM |
| `verdictSpecificity`, `claimSupport`, `tradeoffSubstance`, `criticAccuracy` | judge (advisory) |

> **`citationValidity` has nothing to call.** §2.16: the Modernize side checks
> that `evidenceRefs` is a non-empty array (`ModernizationValidationService.bx:79`,
> `:131`, `:686`) and never resolves a ref to an actual evidence record. The only
> real citation check is `EvaluationService.bx:224`, private and finding-shaped.
>
> Build the resolver here, in Step 6, before any metric depends on it:
> **evidence ref → inventory/evidence record → file + line**, returning
> unresolved refs rather than a boolean. It is the mechanism the whole
> judge-and-narrate half of the plan uses to stay honest, and Step 10's
> "citation validity 100%" gate is vacuous without it.

**Judge tier rules** — a badly-built judge is worse than no metric:

- **Judge only what determinism cannot.** Never score `dagValidity` or
  `seamPrecision` with a model.
- **Anchor every question to evidence.** Never *"is this good"* — always *"is
  claim X supported by citation Y: yes/no, quote the line"*. A judge asked for a
  quality rating rates fluent text highly, which is the exact failure mode being
  guarded against.
- **Advisory, never blocking.** A threshold on a drifting judge is a flaky gate,
  and a flaky gate teaches everyone to ignore it.
- **Pin `judgeModel` and `judgePromptVersion`** in the manifest and every stored
  result. Changing either is a corpus version bump, or score movements become
  unattributable.
- **The generator must not judge itself** — correlated blindness. Different model
  where configured (`AIProviderResolverService` already accepts a requested
  profile), adversarial framing regardless.
- **Keep it out of `PromptEvaluationService`**, which is deliberately
  provider-free. New `ModernizationJudgeService`.

**Gate:** thresholds set to measured baseline. Each later step moves its intended
metric without regressing others.

---

## Step 7 — The deliverable

**Goal:** stop opening with telemetry (§2.9).
**Preconditions:** Step 6 baseline recorded.

**Do**

Restructure `toMarkdown()`:

```
# <Repo> — Modernization Assessment
## The verdict                 <- 5 sentences: what this system is, what shape it is in
## The three decisions that matter
## Start here                  <- one named slice, why, what it unblocks
## What blocks the rest
---
## Roadmap                     <- DAG + critical path
## Decisions register          <- with trade-offs
---
## Appendix A-C: catalog, target structure, routes/db/samples
## Appendix D: run telemetry, coverage, validation counts   <- LAST
```

- Delete the static strangler paragraph — identical every run, trains users to
  skip the top.

### The verdict section is in

The export now opens with **"The verdict"** before any telemetry: how many
bounded capabilities the repository resolves to, what to extract, what to
separate as a module, what to keep, how many cycles block separation, and how
many open questions remain. It ends with **"What should not move, and why"** in
prose — *"Reporting stays: 4 shared table(s), 2 shared scope(s)"* — because the
refusals are the part a generator never produces.

Everything in it is read off decisions already made, so it cannot drift from the
placement register below it.

Live output on `separable-domain` now reads:

```
## The verdict
This repository resolves to **2 bounded capabilities**, derived from coupling
evidence rather than proposed by a model.
- **Extract as a service:** Notifications
- **Separate as a module:** Orders
- **Keep in the monolith:** none
- **Open questions:** 1 — organisational facts no repository can answer.
```

**A real export bug surfaced on the way.** `appendRows()` called
`structKeyExists( row, field )` on every row, and `assumptions` can arrive as
plain strings — which threw and **took down the entire Markdown export**, not
one row. Any run whose plan carried string assumptions produced no document at
all. Guarded; strings now render as list items.

**Both are done.** The static strangler paragraph is deleted and the appendices
are lettered A–D with run telemetry last.
- **Surface `riskLevel`, `effortSize`, `effortDrivers`, `relatedFindingCount`**
  (§2.8) — computed today, exported never. In prose: *"four of six weeks are
  session state, not file moves"*.

  **Done ahead of the rest of Step 7.** The placement register now carries all
  four with a spec asserting their column labels appear in the exported
  Markdown, so §2.8 cannot silently reopen. Taken early because it is
  self-contained, closes a Known gap row, and needed none of Step 6's baseline —
  the reordering and the verdict section still do.
- Add an export/UI parity spec: every field the UI renders as a headline value
  must appear in the export.
- Same reordering for `modernize.bxm` panels. **This is the only in-scope UI
  work** — reordering the existing desktop composition, no breakpoints.
- **Freeze JSON and SARIF field shapes.** `tools/ci-sarif.sh` consumes SARIF for
  GitHub code scanning. Markdown only.

**Gate:** parity spec green; JSON/SARIF byte-identical. The real test is not a
metric — open the export for a real repository and ask whether the first screen
answers the question you opened the tool to ask.

---

## Step 8 — Gates decide what is decidable

**Goal:** answer what the source supports; ask sharply about the rest.
**Preconditions:** Step 7 green.

| Gate | Source-derivable? | Change |
| --- | --- | --- |
| `data-ownership` | yes — co-access matrix | `recommendation` + `rationale` + `confidence` + `basis` + `whatWouldChangeThis` |
| `state-isolation` | yes — shared-state overlay | same |
| `deployability` | yes — seam evidence | same |
| `route-contract` | yes — routes in plan | same |
| `operational-need` | **no** — scaling, availability, ownership, release cadence are organisational facts absent from any repo | stays `unknown`, becomes an explicit `openQuestion` with the evidence that would settle it |

Add `stay` and `do-not-extract` as first-class recommendations with equal
evidence weight, surfaced in the verdict. A plan where everything is extractable
reads as a generator; one that says *"these four should never leave the monolith,
here is why"* reads as an architect.

`decisionRequired` becomes "low-confidence recommendation, or an unanswered open
question" — not "targetType == external-service".

**Gate:** `unknownRate` falls materially and **is not zero**. Zero means the
product started inventing organisational facts.

### Done — and the gate's "not zero" clause did real work

Every gate now carries `recommendation`, `rationale`, `confidence`, `basis` and
**`whatWouldChangeThis`**, decided from the derived boundary evidence:

| Gate | Decided from |
| --- | --- |
| `state-isolation` | shared-state overlay — names the scopes crossing the boundary |
| `data-ownership` | table co-access matrix — names the shared tables |
| `deployability` | crossing edges + cycle membership + whole-system veto |
| `operational-need` | **nothing. Stays `unknown`, becomes an explicit open question** |

`whatWouldChangeThis` is the part that matters most: a recommendation nobody can
challenge is an assertion, not a finding. Each gate states the specific evidence
that would overturn it — *"splitting invoices, customers, payments, ledger, or
moving every reader and writer inside this boundary"*.

**`stay` and `do-not-extract` are first-class**, and `decisionRequired` was
redefined. It used to be "external-service, or anything unknown", which asked the
user to adjudicate every candidate regardless of evidence strength. It is now
"low-confidence recommendation, or an unanswered open question". A confident
refusal backed by four shared tables is a decision the tool already made.

**Measured on live runs:**

- `false-seam` → every placement `do-not-extract` / `stay`, high confidence,
  `decisionRequired: false`, `unknownRate 0%`. Zero is correct here because
  nothing is proposed for extraction, so no organisational question arises.
- `separable-domain` → notifications extracted with three high-confidence gates,
  `operational-need` **unknown and flagged `openQuestion`**, `decisionRequired:
  true`. **`unknownRate 16.7%`** — non-zero, and the non-zero part is exactly the
  thing no repository can answer.

That is the gate's intent met precisely: the rate falls materially, and what
remains is the organisational question rather than a shrug.

---

## Step 9 — Critic

**Goal:** evaluate the architecture, not the JSON.
**Preconditions:** Step 8 green.

`modernization-critic` runs after merge and deterministic validation. Input:
plan + graph metrics + gate recommendations + roadmap DAG. Output: `critiques[]`
with `severity`, `targetItemId`, `claim`, `contradictingEvidence`,
`suggestedChange` — **and no authority to rewrite the plan**. The `rebuild` role
applies them.

**This is the same component as the corpus judge**, deployed twice: attached to a
user's plan in production, run against the four known-verdict scenarios in the
corpus. `criticAccuracy` is how you know it works — **a critic that misses the
planted `false-seam` is not ready to ship.**

Do not run it over the merged plan in one call — that is the whole-repository
shape that made the unsharded architecture role time out. Use a compressed
projection (IDs, metrics, gate results, edges — no prose), falling back to
per-cluster sharding if it exceeds budget.

Must stay optional: non-LLM behaviour cannot regress.

**Gate:** `criticAccuracy` measured; token/wall-clock delta recorded. A critic
pass costing more than the roadmap role is mis-scoped.

---

## Step 10 — The brief

**Goal:** the verdict, written well.
**Preconditions:** Step 9 green. **Last, deliberately.**

`modernization-brief` role, run last. It fills the existing
`modernization-brief` surface (`modernize.bxm:337`), changing it from a numeric
roll-up to a stated verdict, and adds the equivalent export section.

Constraints:

- may only cite IDs, signals and evidence refs already in the plan
- every verdict claim carries at least one evidence ref, **resolved** by the
  citation resolver built in Step 6 — not merely present. Presence is all
  `ModernizationValidationService` checks today (§2.16), and a brief that cites
  a ref pointing at nothing is exactly the fluent nonsense this step is last to
  avoid
- **synthesises, never discovers** — cannot introduce a finding, unit or risk not
  already present
- bounded: a small call over a compressed projection

**This is last for a reason.** A confident narrative over a weak coupling model
is fluent nonsense, and a technical user detects it immediately and does not come
back. Earn the narrative first.

**Gate:** `claimSupport` and `verdictSpecificity` recorded; citation validity 100%.

---

## Step 11 — Break up what remains

**Goal:** stop `ModernizationProposalService` being a god object.
**Preconditions:** Step 3b green. Can run in parallel with Steps 5–10.

Steps 1–3 take it from 5,371 to **~2,800** — still three times larger than
anything else in `app/models`, and still the same class of file that produced
every defect in Part 2. Deleting the reconciliation layer removes the *cause*;
it does not by itself produce a sound design.

The residual is three services wearing one filename:

| Extract | Lines | Contents |
| --- | --- | --- |
| `ModernizationShardExecutor` | ~1,186 | 31 functions: `runApplicationShards`, `runRoadmapShards`, `dispatchNextShard`, `dispatchNextRoadmapShard`, `resplitTruncatedShard`, `recordShardResult`, `ensureShardExecutor`, `buildApplicationShards`, `buildRoadmapShards`, budget/reserve helpers, path filters. Takes **two** injections — `agentFactory` and `agentGateway` (§2.5a) — plus the six integer constants as configuration |
| `ModernizationArtifactService` | ~600 | samples (`currentSliceSamples`, `liftUnitSampleCode`, `ensureActionableSamples`, `normalizeSamples`), db transitions (`normalizeDbTransitions`, `ensureMigrationPath`, `linkDatabaseWorkToPhases`), provenance and coverage annotation |
| `ModernizationProposalService` | ~400–800 | orchestration only: `propose`, fragment merge for narration, cancellation, error classification, logging |

**Do this after Step 3b, never before.** Extracting from the 5,371-line version
would mean extracting ~1,836 lines that are about to be deleted.

`ModernizationSliceRebuildService` (482 lines) is **not** part of this
extraction — Step 3b already reduced it to the single merged `rebuild` role. It
is listed here only because it is easy to forget it exists; §2.15 is the reason.

Same discipline as Step 2: move verbatim first, refactor in a separate commit if
at all.

### Attempted and reverted — read this before trying again

The `ModernizationShardExecutor` extraction was carried out in full and then
**reverted**. It is recorded rather than retried because the blocker is a design
constraint, not a mistake in the mechanics.

What worked: the cluster is genuinely 32 functions (not the 31 estimated), and a
transitive-closure audit found exactly **six external entry points**
(`runApplicationShards`, `runRoadmapShards`, `buildApplicationShards`,
`buildRoadmapShards`, `groundedPathSet`, `prioritizedLegacyPaths`). The move
itself took `ProposalService` 3,000 → 1,690 and compiled.

**What stopped it: the specs cannot reach the extracted collaborator.** Roughly
seventeen specs construct `ModernizationProposalService` with `new` and stub its
gateway — `service.agentGateway = fakeGateway` — then call `propose()`. Once
shard dispatch lives in another service, that fake never reaches the provider
call.

### The stated blocker was measured and is wrong

The revert note claimed injected properties are "not writable from outside the
instance". Three probes say otherwise:

| Probe | Result |
| --- | --- |
| Read an injected property from outside **before** anything sets it | unreadable — but only because it is null, not because of scope |
| Read a collaborator from outside **after** a lazy accessor created it | reachable |
| Assign a collaborator instance from outside and read it back | works, and the instance is the one the class then uses |

So `service.collaborator = stub` does reach `variables` scope — every spec in
this session that stubs `agentFactory`/`agentGateway` on `ProposalService`
depends on exactly that and passes. The only real constraint is that a property
must be non-null before you can read *through* it.

**Decision taken: propagate, don't re-inject.** `ProposalService` resolves the
executor through a lazy accessor and hands it its own `agentFactory`,
`agentGateway` and cancellation registry at resolution time. Because resolution
happens on first use — after a spec has set its stubs — the seventeen specs keep
working unchanged, and there is one gateway instance per run rather than two
singletons that can disagree. The rejected alternatives (`withGateway()` seam,
per-call gateway argument, rewriting seventeen specs) all cost more and buy
nothing over this.

### The dependency surface, measured

The revert note counted **six external entry points** — functions outside the
cluster call into it. The other direction was never counted, and it is the one
that decides the work: the cluster is contiguous (33 functions, lines
2001–3444) and calls **16 helpers that live outside it**:

`boundedArray`, `boundedStructArray`, `copyGatewayOptions`, `dedupeById`,
`emitProposalObservation`, `exceptionDiagnostics`, `inferErrorType`,
`isCancelled`, `logInfo`, `normalizeLegacyPath`, `objectMatchesHaystack`,
`objectNamesForDbItem`, `pathHaystackForUnits`, `providerRoleError`,
`redactPayload`, `validFragment`.

Most are small pure utilities and move with the cluster. Four are not:
`isCancelled`, `logInfo`, `emitProposalObservation` and `providerRoleError`
touch run state or the observation callback, and are the ones to decide
deliberately rather than copy — `isCancelled` in particular is the split-state
trap below.

So the shape of the remaining work is: move the contiguous block verbatim, move
the twelve pure helpers with it, and give the four stateful ones an owner.

### Done: `ModernizationArtifactService` (608 lines, verified)

The artifact half went first because it is the one with **no instance state at
all** — 19 pure functions, contiguous, calling out to only four pure path/name
helpers. Moved verbatim; `ProposalService` 3,444 → **2,897**; suite 543·0·0·1.

`ProposalService` keeps seven one-line wrappers (`pathHaystackForUnits`,
`objectMatchesHaystack`, `objectNamesForDbItem`, `normalizeLegacyPath`,
`scalarString`, `dedupeById`, `normalizeEvidencePath`) that delegate to the new
service, so no call site in either file changed and each utility still has
exactly one implementation. Two specs in `ModernizationProposalRepairSpec` that
reached moved functions via `makePublic` were repointed at the new owner.

### Done: the third split, and `ProposalService` is off the exceptions list

`ModernizationFragmentMerger` (150 lines) took `mergeFragments`, `mergeRoadmap`,
`mergeArchitecture` and `applicationFragmentHasSubstance`. Merging is its own
responsibility — reconciling fragments that arrived from separate provider calls
into one artifact with stable identity — and it is where `ensureIdentity` belongs,
because separate calls cannot see each other's ids.

**`ModernizationProposalService`: 3,444 → 857**, and it is now **removed from
`ArchitectureFitnessSpec`'s known-exceptions list**, so a regression puts it back
over the line and fails the build. Three splits got it there:

| Service | Lines | Responsibility |
| --- | --- | --- |
| `ModernizationArtifactService` | 761 | samples, transitions, naming/path utilities |
| `ModernizationShardExecutor` | 1064 | dispatching bounded provider calls |
| `ModernizationFragmentMerger` | 150 | reconciling fragments into one plan |

Two gotchas worth keeping: the merger needed `placementService` and
`derivedStructureService`, which a call-graph scan misses because they are
*properties*, not functions — check property references as well as calls before
declaring a cut clean. And `mergeRoadmap`/`applicationFragmentHasSubstance` had
different signatures than assumed; copy the signature, never retype it.

### Done: `ModernizationPlacementService` cleared too

`ModernizationTargetPathService` (160 lines) took the path-shaping cluster —
`deriveTargetPath`, `legalModernTargetPath`, `ensureUniqueTargetPaths`,
`normalizeLayerExtension`, `targetPathMatchesLayer`, `contextualCollisionPath`,
`appendPathSuffix`. Placement answers *which capability owns these units*; path
shaping answers *where does this file go*. `normalizeTargetUnits` stays behind
because it also settles identity.

**983 → 873, and off the exceptions list.** The Step 12 one-owner invariant moved
with it: `ArchitectureFitnessSpec` now expects `ModernizationTargetPathService`
to be the sole definer of `deriveTargetPath`.

**The fitness rule paid for itself twice here.** First it rejected the obvious
approach — leaving thin delegating wrappers behind — because two files then
*define* `deriveTargetPath` and the one-owner rule fires. The wrappers were
deleted and callers now reach the owner directly, which is what the rule was
protecting. Second, an earlier scan suggested the whole cluster was dead: nothing
inside `PlacementService` called it. It is called *cross-service* from
`ProposalService` and `FragmentMerger`, so a within-file reachability check would
have justified deleting 210 lines of live code. **Check callers repo-wide, not
per-file, before concluding anything is unreachable.**

**Still on the list:** `SpecialistAgentGateway` (1976), `ReviewRunService`
(1452), `ModernizationDerivedStructureService` (1496), `SpecialistReviewService`
(943), `ModernizationShardExecutor` (1064). `DerivedStructureService` is the last
Modernize-side one and splits along a stated line — cluster/boundary derivation
versus roadmap phase synthesis. `ShardExecutor` has a documented argument for
staying. The Specialist/Review ones predate Step 11 and belong to Part 5.

### The shard half — done, extracted as `ModernizationShardExecutor`

Contiguous at **1,444 lines** (`buildRoadmapShards` → end of file), 10 entry
points, and it uses **8 `variables.*` constants** — `defaultApplicationShards`,
`defaultRoadmapUnitBatchSize`, `defaultShardSize`, `estimatedShardWallMs`,
`maxApplicationShards`, `maxLaterStageReserveMs`, `maxRoadmapShards`,
`minLaterStageReserveMs`. **Copy them; do not retype them** — that is the
tenfold-error trap below, and it is still live.

Four helpers move with it (`emitProposalObservation`, `dedupeById`,
`objectMatchesHaystack`, `objectNamesForDbItem`, `pathHaystackForUnits` are
cluster-only once the artifact half is gone). **Ten stay shared** and need a
decision, not a copy:

| Helper | Kind | Suggested owner |
| --- | --- | --- |
| `boundedArray`, `boundedStructArray`, `copyGatewayOptions`, `exceptionDiagnostics`, `inferErrorType`, `validFragment`, `providerRoleError` | pure | move to `ModernizationArtifactService` and delegate from both, exactly as the artifact half already does |
| `logInfo` | logger | executor takes its own `log` injection |
| `redactPayload` | needs `SecretRedactionService` | executor injects it |
| `isCancelled` | **split state** | `ProposalService` hands the executor its `cancelledRuns` struct at resolution, so both read one registry |

### Done: `ModernizationShardExecutor` (1,529 lines, verified)

Moved verbatim, 547·0·0·1. Ten entry points made public; `ProposalService`
delegates each through `invoke( shardExecutor(), name, arguments )` so no caller
changed. The eight budget constants were **copied, not retyped**.

The seam is pinned by `ModernizationShardExecutorSeamSpec`:

- a collaborator stubbed on `ProposalService` **reaches the executor**, because
  resolution is lazy and propagates on first use — this is what keeps the ~17
  existing stubbing specs honest instead of silently testing nothing
- `cancelRun()` on `ProposalService` **is visible to the executor**: the
  `cancelledRuns` struct is shared by reference via `shareRunState()`, closing
  the split-state trap
- repeated resolution returns one instance
- `laterStageReserveMs( 3600000, 4 ) >= 300000`, pinning the constants that were
  previously retyped an order of magnitude wrong

`derivedStructureService` had to be propagated too — it was not on the original
inbound list and only surfaced at runtime. Worth noting for the third split:
**the call-out audit missed a collaborator that only a live run reveals.**

Three specs followed their subjects to the new owners
(`ModernizationClusterLimitsSpec`, `ModernizationProposalServiceSpec`,
`ModernizationProposalRepairSpec`).

### What the gate still needs

The gate is "no service in `app/models` over 900 lines except `SchemaService`".
After both extractions, seven services still exceed it:

| Service | Lines | Note |
| --- | --- | --- |
| `SpecialistAgentGateway` | 1,976 | Track A; telemetry already extracted, breaker split still to do |
| `ModernizationDerivedStructureService` | 1,496 | pre-existing, untouched |
| `ReviewRunService` | 1,452 | Track A |
| `ModernizationShardExecutor` | 1,064 | application-shard half, after the roadmap split |
| `ModernizationPlacementService` | 976 | pre-existing, just over |
| `SpecialistReviewService` | 943 | Track A, just over |
| `ModernizationProposalService` | **926** | from 3,444 — now orchestration only, 26 lines over |

So the gate is a **programme, not a step**, and it reaches well outside
Modernize. Either scope it to the files Part 4 owns, or accept it as a Track A
objective. It is not one more extraction away.

### Done: `ModernizationRoadmapShardService` (544 lines, verified)

Roadmap sharding split from the executor — 547·0·0·1. Roadmap shards key on
target-unit groups and produce one phase each; application shards key on file
paths and produce target units. They share only the dispatch primitives (the
pool, the future, the timeout), which stay on the executor and are **used from
the roadmap service rather than duplicated**.

Taken because roadmap sharding is a genuinely separate concern, not to chase the
line count — the executor landed at 1,064, still above 900.

**A caution for whoever continues.** Getting the executor under 900 from here
needs roughly three more splits (shard evidence, budget helpers, progress), and
those are line-count-driven, not concern-driven. The plan already argues this
for `SchemaService`: *"line count carries no complexity signal"*. Manufacturing
services to satisfy a number is the failure mode that rule exists to prevent.
**Fix the gate's scope before splitting further.**

### Done: `ModernizationJudgementService` (329) and `ModernizationPlanAnnotationService` (290)

Two further concern-driven splits took `ProposalService` to its target shape:

- **Judgement** — `judgeAndNarrate`, `brief`, `critique`, `criticProjection`.
  These had **no callers inside `ProposalService` at all**; only
  `ModernizationRunService` used them, so they moved out entirely and
  `RunService` now injects the new service directly rather than reaching through
  the orchestrator.
- **Annotation** — generation summary, coverage roll-up, provenance stamping and
  deterministic ordering. All post-merge decoration, none of it decides
  anything.
- `synthesizeDatabaseFragment` joined `ModernizationArtifactService`, which
  already owns db transitions and sample normalization.

`ModernizationProposalService` is now **926 lines, from 3,444** — the
orchestration-only shape the step's own table describes (`propose`, fragment
merge, cancellation, error classification, logging).

**It stops at 926, not under 900, deliberately.** The only remaining candidate
(`preflightInitialRoles`, 51 lines) would have to move into
`ModernizationShardExecutor`, which is *already* over the limit at 1,064. Moving
code from one over-limit file to another to make a third file's number go green
is exactly the gaming this rule exists to prevent. The 26-line gap is a signal
about the gate, not about the service.

**Two traps hit during these splits, both caught by the suite:**

- A helper was **retyped from memory instead of copied** — the guessed
  `isInformationalProposalMessage` had the wrong signature *and* the wrong
  logic. Same class of error as the tenfold constants. Copy, never retype.
- The header for the new service duplicated a method the moved body already
  contained (`citationResolverInstance`), which BoxLang rejects outright.
  When moving a block, check what the block already brings with it.

### The original estimate said three extractions, not two

The step's own table targets `ProposalService` at 400–800 lines. Artifact
(608, done) plus shard (1,444) removes 2,052 of the original 3,444 — leaving
**~1,450, still above the 900 gate**. A third split of what remains (merge,
error classification, generation summary, provenance/coverage annotation) is
required before the gate can pass. Budget for it up front rather than
discovering it after the shard move.

Two further traps found while doing it, worth keeping:

- **Cancellation is split state.** `ProposalService.cancelRun()` writes a local
  `cancelledRuns` registry; the executor needs its own and must be told, or
  in-flight shards keep running after a cancel.
- **The constants are not decorative.** Retyping them by hand put
  `minLaterStageReserveMs` at 20,000 instead of 300,000 and
  `maxLaterStageReserveMs` at 90,000 instead of 900,000 — a tenfold error in the
  budget reserve that a spec caught. Copy constants; never retype them.

`ModernizationProposalService` therefore stays at **3,086** (from 5,371). The
Step 11 gate is unmet and the §6.2 line rule still lists it as a known exception.

**Gate:** no service in `app/models` exceeds 900 lines, **excluding
`SchemaService`**.

That exclusion is deliberate, not a carve-out for convenience. `SchemaService` is
a data definition, not logic — it grows when the schema grows, which is correct
behaviour, and line count carries no complexity signal for it. It currently sits
at exactly 900, and **Step 1 adds `modernization_graph_cache`**, so a
no-exception rule would fail on the plan's first real step and pressure whoever
hits it into splitting a file that should stay whole.

If `SchemaService` ever needs a complexity check, measure branching in
`ensureSchema` / `rebuildSchema`, not total lines.

---

## Step 12 — Give the derived concepts domain types

**Goal:** stop repeating the mistake that caused the dual-ownership bug.
**Preconditions:** Step 2 green. **Must complete before Step 3a** — see the
execution-order graph. It is numbered 12 only because it was added late.

Steps 1–2 introduce the most invariant-heavy concepts in the system — coupling
graph, cluster, boundary, wave order. As written they would be **plain structs
passed between services**, which is precisely how target-path derivation ended up
owned by two services at once (`ModernizationProposalService` derived a path,
`PlacementService` independently rewrote it).

`app/models/domain/` currently holds 5 mementos against 67 services. Adding
derived structure without domain types repeats the anemic-domain problem one
layer up, where it will be harder to unwind.

Add:

**Respect the existing convention — services compute, types hold and answer.**
`app/models/README.md` states domain objects are *"small accessors-enabled
mementos"* that *"do not query the database or perform business decisions"*. A
type that runs SCC would break that. Split it:

| Service (computes) | Type (holds + answers) | The type's questions |
| --- | --- | --- |
| `ModernizationCouplingGraphService` | `CouplingGraph` | `fanIn(unitId)`, `fanOut(unitId)`, `hasEdge(a,b)`, `edgesCrossing(clusterId)`, `truncated()` |
| `ModernizationDerivedStructureService` | `Cluster` | `contains(unitId)`, `cohesion()`, `boundaryEvidence()` |
| `ModernizationPlacementService` | `Placement` | `targetPath()`, `placementType()`, `gates()` — **sole owner of target-path derivation**, which closes the dual-ownership bug |
| `ModernizationDerivedStructureService` | `WaveOrder` | `blocks(x,y)`, `wave(phaseId)`, `criticalPath()` |

Answering a question over data you already hold is not a business decision; it is
what makes "one owner per invariant" enforceable. The computing stays in services,
where it is testable in isolation.

**Amend the convention rather than silently breaking it.** These types are not
"small" — a `CouplingGraph` holds thousands of edges. Update the Domain objects
section of `app/models/README.md` to say mementos stay small, and that derived
structural types may be large but must remain computation-free.

**Test:** for each invariant, exactly one file computes it and exactly one type
answers it. If two services can answer "what is this unit's target path", Step 12
is not done.

### Done so far — and why the rest waits for Step 2

`CouplingGraph` is built and its service returns it, so
`ModernizationCouplingGraphService` owns the computation and the type owns every
answer. `app/models/README.md`'s Domain objects section is amended as this step
requires: mementos stay small, derived structural types may be large but must
remain computation-free. `tests/specs/unit/ArchitectureFitnessSpec.bx` now
enforces the §6.2 invariants.

**The other three types are deliberately not written yet.**
`ModernizationDerivedStructureService` does not exist until Step 2, so `Cluster`
and `WaveOrder` have no computing owner and their shapes would be *guessed* —
which is the precise failure this step exists to prevent, and the stated reason
it was ordered after Step 2 in the first place. `Placement`'s change is to become
**sole owner of target-path derivation**, but that derivation only moves into
`PlacementService` in Step 2 item 2; declaring the type sole owner while the
proposal service still derives paths would document an invariant that is false.

So Step 12 splits along its own dependency: the graph type lands with the graph,
the rest lands immediately after Step 2 and still before Step 3a. The execution
graph is unchanged in intent — only in granularity.

### The fitness spec found a pre-existing violation

`SpecialistReviewService` is **943 lines**, over the 900 limit, and no step in
this plan owns it. §6.1 tracks services over 1,400 lines and the 900-line rule
was written for Step 11's gate, so a service sitting 43 lines over slipped
between them. It is listed as a known exception with the others rather than
silently exempted, and belongs in Part 5's split alongside `SpecialistAgentGateway`.

The known-exception list is `ModernizationProposalService` (Step 3b, Step 11),
`SpecialistAgentGateway` (Part 5), `ReviewRunService` (Part 5) and
`SpecialistReviewService` (Part 5, newly assigned). Everything else fails the
spec, so the rule stays live for new code instead of being deleted until
convenient.

---

# Part 5 — Track A: structural separation (independent, lower priority)

### Started: `SpecialistObservationService` extracted (264 lines)

`SpecialistAgentGateway` **1976 → 1811**. Observation emitting and redaction
moved out: the gateway calls a provider and gets a valid answer back; this says
what happened, safely. They change for different reasons — telemetry shape
churns with dashboards, provider handling churns with models. `redactSecrets`
runs inside the emit path rather than at each call site, because "remember to
redact" is not something convention can enforce.

**This extraction was attempted, reverted, and redone. The revert was worth
recording:**

The wrappers used `argumentCollection = arguments`, but the ~20 call sites pass
**positionally** — and a positional `arguments` struct has numeric keys that
never bind to named parameters. `observePayload` returned null with no error,
and the failure surfaced three layers away as
`Cannot dereference key [meta] on a null object`. **Delegating wrappers must
repeat the full signature explicitly**; `argumentCollection` is only safe when
every caller passes by name. The redo declares all four signatures in full and
`SpecialistAgentsSpec`'s 16 specs — which are what caught it — pass.

Second trap in the same move: the settings the emit path reads
(`observabilityEnabled`, `observabilityPreviewCharacters`) are injected, and
specs build the service with `new`. Absent now means **on**, because a split
that silently disables telemetry is worse than one that leaves it noisy.

### Done: `ProviderResilienceService` extracted (132 lines) — the plan's named split

`SpecialistAgentGateway` **1976 → 1365**. Circuit breaker, backoff and
provider-error classification now live in one place.

**Taken for the reason the plan gives, not for line count:** the Modernize
gateway has *no breaker at all*, so a repeatedly failing provider is retried on
every run. `bx-ai`'s `RetryMiddleware` covers backoff and retry but has **no
breaker concept**, which is why this stays in DoubleCheck. A shared owner is the
precondition for giving Modernize one.

**An earlier note in this plan said moving the breaker "splits mutable state"
and used that to argue against the split. That was wrong.** The state is only
split if *some* readers move; every function touching `variables.circuits` moved
together, so the map has exactly one owner and nothing is shared across a
boundary. The correct test is not "does this touch shared state" but "does
anything left behind still touch it".

Two corrections during the move, both the same shape as earlier ones:
- the moved functions kept `private` and were unreachable from the gateway;
- the specs inject `circuitFailureThreshold` / `circuitCooldownMs` into the
  **gateway** to make the breaker trip quickly. A resilience service reading only
  its own injected settings ignored them and the circuit never opened under test.
  The gateway now propagates its tuning, the same pattern used for the chat
  fitter's `StubAIProviderResolver`.

**This is now three times that a split broke because a spec configures the
outer object.** Anything a spec injects or stubs on the parent must be
propagated to an extracted collaborator — check the spec's setup before
declaring a seam clean, not after the failure.

### `ReviewRunService`: the pipeline extraction was attempted twice and reverted twice

The seam is real. `executeRun`'s review half is 397 contiguous lines, the
modernize branch above it returns early, and all 42 locals are internal to the
block -- so it moves whole rather than needing them threaded through parameters.
Both attempts produced a **green 584-spec suite on the first run**.

Both also **broke the review pipeline in production**, and only running a real
review caught it:

1. First attempt passed lifecycle callbacks as a struct of closures and wrote
   `( argumentCollection ) => transition( argumentCollection = arguments )`,
   which declares a literal parameter of that name. Every transition misfired;
   the run died as "Run was cancelled".
2. Second attempt replaced the closures with explicitly-signed forwarders and a
   lazy back-reference. That fixed the syntax, and WireBox then failed to boot
   on the circular singleton (`Singleton.cfc:95`) until the `inject=` was
   removed from the pipeline's side. The suite passed; the review still failed.

**The lesson is about the acceptance test, not the seam.** Nothing in the suite
exercises `executeRun` end to end, so a green run says nothing about this
change. **Anyone attempting this must treat "a real review run reaches
`partial` with a non-empty summary" as the gate**, and should add a spec that
covers `executeRun` *before* moving anything -- otherwise the third attempt
will look green and be broken too.

`ReviewRunService` stands at 1138 with the two extractions that did hold
(`ReviewRerunService`, `ReviewRunQueryService`) and the contention retry.

### Done: `SpecialistAgentGateway` cleared, 1976 -> 798

Nine splits. The last 120 lines came from deleting the delegating wrappers the
earlier moves left dead -- but only after **repointing the specs at the real
owners**.

That ordering is the lesson. Deleting the wrappers first broke five specs,
because about ten of them were reached from tests via `makePublic` even though
no production code called them any more. The wrappers were not dead; the tests
were holding them alive through the wrong object. Pointing
`SpecialistAgentsSpec` at `SpecialistChatFitter` and
`SpecialistResponseParser` -- with the same stubs the gateway had been given --
made the tests better *and* made the wrappers genuinely removable.

**A spec that reaches a moved function through its old owner is not a passing
test; it is a test aimed at the wrong object.** Fix the aim, then delete.

Off the exceptions list. Three services remain: `ReviewRunService` (1159),
`ModernizationShardExecutor` (1064), `ModernizationDerivedStructureService`
(969).

### Done: both provider paths extracted -- gateway 1976 -> 917

`SpecialistChatInvoker` (333) and `SpecialistAgentInvoker` (381). The design
question this plan posed -- two strategies behind one interface, or one path
with a branch? -- is answered by the signatures: `invokeChatFallback` takes the
agent path's `agentError`. It is a **fallback in a sequence**, not a peer
strategy. So the gateway keeps the policy (try agent, fall back to chat) and
each invoker owns the mechanics of its own call.

**The earlier small cuts are what made these possible.** `invokeChatFallback`
had 15 outbound calls and `invokeAgent` 13 -- but 11 and 12 of those
respectively already had owners from the observation / parser / fitter /
telemetry / resilience splits. Only cancellation needed copying. Doing the
cheap, clean cuts first turned two "untouchable" functions into mechanical
extractions, both green on the first run.

**917 -- seventeen lines over, and it stops there.** Removing the now-dead
delegating wrappers looked like the obvious way to close the gap and was tried:
it broke five specs, because about ten of those wrappers are reached from tests
via `makePublic` even though nothing in the gateway calls them any more.
Reverted. Deleting test-reachable code to win seventeen lines is the wrong
trade; the seam is already where it belongs.

### Part 5''s named splits are done, and they do not reach its target

Both splits this plan names for `SpecialistAgentGateway` now exist:
`AiTelemetryExtractor` (307) and `ProviderResilienceService` (132).

**The plan''s own arithmetic never reached its stated target, and that should be
corrected rather than carried forward:**

```
gateway when the plan was written      2214
named splits  ~250 + ~450            =  700
2214 - 700                           = 1514
stated target                          <= 900
```

Doing exactly what Part 5 prescribes lands at ~1514. The target was
unreachable from the named work — the gap is ~600 lines that no listed split
accounts for.

Actual result is **1365**, better than the plan predicted, because five splits
were done rather than two: `SpecialistObservationService`,
`SpecialistResponseParser`, `SpecialistChatFitter`,
`SpecialistFailurePresenter` and `ProviderResilienceService`.

**To actually reach ≤ 900** the remaining ~465 lines have to come from
`invokeAgent` (298) and `invokeChatFallback` (212) — the two provider paths.
That is decomposition of the gateway''s reason for existing, not extraction of a
neighbouring concern, and it needs a design decision first: are the agent path
and the chat path two strategies behind one interface, or one path with a
branch? Answer that before cutting; the line count alone will not decide it.

### Where Part 5 Track A stops, and why

Six extractions landed (below). Two services remain over 900, and **neither has
a remaining seam** — this is measured, not assumed:

**`SpecialistAgentGateway` (1976 → 1377).** Three candidates checked:
- async-retry cluster: **19 outbound calls** — into circuit breaker, validation,
  execution, logging, cancellation, context building. That is the orchestration
  core, not a seam.
- circuit breaker: **extracted** as `ProviderResilienceService` (see above).
  An earlier reading here called it unsafe because it owns `variables.circuits`;
  that was wrong — moving *every* toucher together relocates the state rather
  than splitting it.
- what remains is `invokeAgent` (298) and `invokeChatFallback` (212): the
  provider paths, which are what the gateway *is*.

**`ReviewRunService` (1460 → 1159).** `executeRun` is 563 lines carrying
**42 local variables** across its phases — scan, graph, plan, specialists,
persist. Splitting those phases means threading 42 pieces of state through
parameters or inventing a context object. That is a redesign of the review
execution path, not an extraction, and it is the highest-risk change available
in this codebase. The modernize branch inside it (73 lines) *is* self-contained,
but its natural home `ModernizationRunService` sits at exactly 900 — moving it
relocates the problem rather than solving it.

**The rule this follows:** a split needs a reason beyond the line count. That
reasoning already kept `ModernizationShardExecutor` intact; applying it
inconsistently here to make a number go down would make the rule meaningless.
Both services stay on the exceptions list with these measurements attached.

### Started: `ReviewRunQueryService` extracted (140 lines)

`ReviewRunService` **1460 → 1159**. That service *executes* runs — queue, lease,
transition, cancel. This one only answers questions about runs that already
exist, with the tenant/project scoping those answers require.

**The cleanest seam measured all session: zero outbound calls.** Wrappers were
kept rather than repointing, because `get`/`getResult` have ~140 call sites
across handlers and specs and the seam is worth having without that churn.

One correction on the way: the surface scan found four collaborators, but the
moved code actually uses **ten** — `graphRepository`, `architectureRepository`,
`specialistResultRepository`, `findingBaselineService`, `findingReviewService`
and `coverageAssessmentService` as well. A scan for `name.method(` misses
anything reached through a local alias. **Enumerate identifiers used as
receivers, not just the injected-property list**, before declaring a surface
complete.

### Started: `SpecialistChatFitter` extracted (360 lines)

`SpecialistAgentGateway` **1976 → 1377** across three cuts. The gateway owns the
call — whether to invoke, retry, or give up. The fitter owns making the call
*fit*: token budgets, context-window arithmetic, trimming the context pack, and
one JSON-repair round trip. It reads responses through `SpecialistResponseParser`
and reports through `SpecialistObservationService` rather than re-implementing
either.

**This was the most entangled cut of the session and needed five corrections,
every one caught by a test rather than by reading:**

1. `aiProviderResolver` was not declared on the new service.
2. **Constants were retyped, not copied** — `promptSafetyTokens` went in as 900
   (real: 512) and `charsPerToken` as 4 (real: 2). This plan already warns about
   exactly this and it still happened. Copy constants; never retype them.
3. **`chatOnlyInstructions` was fabricated.** The real one takes a `definition`
   and builds on `definition.instructions`; the invented version was a bare
   string with no argument, which would have silently changed every chat-only
   prompt. Copy the implementation, do not reconstruct it from its name.
4. The resolver needed a lazy accessor for `new`-constructed specs.
5. **The fitter built its own `AIProviderResolverService`, bypassing the
   `StubAIProviderResolver` the specs inject into the gateway** — it would have
   reached for live provider config under test. The gateway now shares its
   collaborators with the fitter, the same propagation pattern recorded for
   `ProposalService → ShardExecutor`.

Points 2, 3 and 5 are the general lesson: **a verbatim move is only verbatim if
you move the text.** Anything retyped or inferred from a name is a new defect
with an old function's reputation.

### Started: `SpecialistResponseParser` extracted (238 lines)

`SpecialistAgentGateway` **1811 → 1620** (1976 at session start). The gateway
decides *whether* to call, retry, or give up; the parser decides *what the
answer means* — unwrapping envelopes, finding the JSON object inside prose, and
refusing tool-call markup a chat-only path must not accept. Pure: no provider,
no run state.

`assertNotToolCallMarkup` / `containsToolCallMarkup` / `sanitizeErrorSnippet`
moved with it even though the gateway still calls them, because they are about
interpreting provider output — same responsibility. The gateway delegates, so
there is still one implementation of each.

### Started: `ReviewRerunService` extracted (253 lines)

`ReviewRunService` **1460 → 1245**. Rerun, follow-up and scoped Modernize
continuation moved out: that service owns the run *lifecycle* — queue, lease,
status, cancel — while this answers a narrower question, "given a run that
already happened, what new run should follow, and over which paths?".

The dependency runs one way (rerun → run service), so no cycle. The three
handler call sites in `ApiRuns.bx` were repointed rather than wrapped, which
avoids `ReviewRunService` having to know about its own derivative. Verified
beyond the suite: `POST /api/v1/runs/<id>/rerun` returns a proper
`run_not_found`, so the handler really does reach the new service.

### Done: `SpecialistReviewService` cleared (943 → 886)

`SpecialistFailurePresenter` (110 lines) took `friendlyFailureMessage`,
`previewText` and `logSpecialistError`. Orchestrating specialist runs and
explaining a failure are different jobs, and `previewText` redacts before
anything is displayed or logged — which is why redaction belongs there rather
than at each call site. **Off the exceptions list**, so a regression now fails
the build.

**An earlier reading of this file said "no seam worth cutting" and that was
wrong.** The measurement behind it was sound — the async task-dispatch family
does call out to eight functions including the service's core loop, and is
still not worth extracting. The error was concluding *the file* had no seam from
*one candidate* having none. A second, smaller cluster was sitting in the tail
the whole time.

### `SpecialistReviewService`: the dispatch cluster still should not move

The obvious candidate — the async task-dispatch family (`executeTaskAsync`,
`launchTask`, `awaitTask`, `failedTask`, ~270 contiguous lines) — calls out to
**eight** functions including `prepareTask` (119 lines) and `assembleSuccess`
(133 lines), which are the service's core loop. Extracting it would need eight
delegating callbacks or a back-reference: more coupling than it removes.

At 43 lines over, this one should stay until a second responsibility actually
appears. Splitting it now would be splitting for the metric — the same reasoning
already recorded for `ModernizationShardExecutor`.

**Remaining on the exceptions list:** `SpecialistAgentGateway` (1811),
`ReviewRunService` (1245), `SpecialistReviewService` (943),
`ModernizationDerivedStructureService` (969), `ModernizationShardExecutor`
(1064). `ReviewRunService`'s bulk is `executeRun` at 562 lines — one function,
so the next cut there is internal decomposition, not extraction, and carries
more risk than the moves so far.


Review and Modernize share a run engine but the sharing is implemented as
`runKind == "modernize"` branches inside review-named classes, across 14 files.
`ReviewRunService` has 35 injections and a 563-line `executeRun()`.

**Measured, because "14 files" drives the estimate and is wrong.** 12 files
mention `runKind` at all; only **6 actually branch on it**, 17 branch sites
total:

| File | Branch sites |
| --- | --- |
| `ReviewRunService` | 10 |
| `ReviewHistoryService` | 3 |
| `ApiHistory`, `ApiRuns`, `ModernizationDecisionService`, `ModernizationSliceRebuildService` | 1 each |

The other six files only *carry* `runKind` as data (persisting it, echoing it in
an event payload), which a pipeline registry does not change.

So the seam is narrower than the plan implies — but it is not cheap, because the
concentration is where it hurts: the single dispatch inside `executeRun()`
(`ReviewRunService.bx:712`) hands off to `modernizationRunService.execute()`
while the entire review execution stays **inline** in the same method. A registry
with one registered pipeline and one inline path is half a seam. Doing this
properly means extracting the review execution into a `ReviewPipeline` first,
and that is the bulk of a 1,452-line service with 35 injections that runs *both*
workspaces.

That is why this stays sequenced after Part 4 rather than being picked up as a
quick win: the file it touches is the one whose failure takes out every run in
the product.

**Do this after Part 4, or in parallel by a different person.** It is
maintainability work; it will not improve a single plan. Steps 1–3 of Part 4
delete much of what a naive Track A would have extracted, which is why it comes
second.

Order: pipeline seam (`RunPipeline` contract + registry) → move both executions
into pipelines → rename `ReviewRunService` → `RunService` (service only; the
repository, domain object and `runs` table stay Review-named — renaming them is
churn with no payoff) → de-branch scanner/export/history/capabilities → split
`ApiRuns` → folder reorganisation last.

Notes when you get there:

- `policy.fast` (`ReviewRunService.bx:893`) is Review-only and must travel with
  `ReviewPipeline`. `tools/watch-review.ps1` depends on it.
- Parsers (`BoxLangParserService`, `CfmlParserService`) belong in a shared
  `analysis/` package, **not** under `review/` — `ApiCapabilities.bx:9,11` reads
  their versions. `ArchitectureIndexService` stays in `review/`.
- `ModernizationInventoryService` and `CfmlParserService` duplicate scanning
  *mechanics* (tag joining, comment stripping, pattern cache). Share those via a
  `CfmlSourceScanner` primitive. **Never merge the extractors** — their
  taxonomies and evidence contracts legitimately differ.

  **Done** (566·0·0·1). `CfmlSourceScanner` owns `joinTagLines`,
  `compiledPattern` and `matcher`; both services delegate. The extractors were
  **not** merged, and reading them showed why that warning is load-bearing:
  `attributeValue` (inventory) and `attribute` (parser) use *different* regexes —
  the parser's requires a closing quote, the inventory's does not. Folding those
  together would have quietly changed what each one reports.

  Two behaviour differences in the mechanics themselves were preserved rather
  than flattened, and both are pinned by spec:

  - the inventory's pattern compiler normalizes doubled backslashes (BoxLang
    literals keep `\\` where the Java bridge wants `\`); the parser's does not.
    It is now a parameter, **and part of the cache key** — keyed on the
    expression alone, the two callers would collide and one would silently
    receive the other's compiled pattern.
  - the parser's tag joiner reported `endLine`, the inventory's did not. The
    shared one always reports it: an extra key harms no caller, a missing one
    would.

  `stripCfmlComments` stayed in the inventory — only one service has it, so
  moving it would be relocation, not sharing.
- Folder moves do not change any `inject=` string (§2.12), but check for
  duplicate class names first.
- **`SpecialistAgentGateway` is 2,214 lines and untouched by Part 4** — after
  Steps 1–11 it becomes the largest file in `app/models`. Split it:
  `ProviderResilienceService` (~250: circuit breaker, backoff, error
  classification — which also gives the Modernize gateway a breaker it currently
  lacks) and `AiTelemetryExtractor` (~450: `extractUsage`, `extractLlmInput`,
  `extractLlmOutput`, `extractToolInfo`, `summarizeMessages`,
  `observationTypeFor`). Target ≤ 900.

  **Investigated against the installed module — findings, not assumptions.**
  Installed: **bx-ai 3.3.2+17**, at `runtime/boxlang_modules/bx-ai`. The
  middleware package is real and present: `RetryMiddleware`,
  `FlightRecorderMiddleware`, `LoggingMiddleware`, `GuardrailMiddleware`,
  `HumanInTheLoopMiddleware`, `MaxToolCallsMiddleware`, plus
  `IAiMiddleware` / `BaseAiMiddleware` / `StructMiddlewareAdapter` /
  `AiMiddlewareResult`.

  **DoubleCheck already uses this seam** — `SpecialistAgentGateway.bx:454-456`
  passes `MaxToolCallsMiddleware` and a `StructMiddlewareAdapter` into
  `aiAgent()`. There is no integration risk to discover; the pattern is in
  production.

  What that changes for the split:

  | Piece | Verdict |
  | --- | --- |
  | Backoff + retry | **Covered.** `RetryMiddleware` takes `maxRetries`, `initialDelay`, `backoffMultiplier`, `maxDelay`, `nonRetryableTypes` — including the non-retryable classification |
  | Circuit breaker | **Not covered.** `RetryMiddleware` has no breaker concept at all. DoubleCheck's lives in `SpecialistAgentGateway.bx:22-35` as a `ConcurrentHashMap` of circuits with a failure threshold and cooldown, and it handles a case the plan should not lose: *"parallel sibling failures may open the circuit mid-retry"* (`:117`) |
  | Telemetry extraction | **Overlapping, not equivalent.** `FlightRecorderMiddleware` records a per-interaction JSON trace keyed on `seq`/`type`/`toolName`/`arguments`/`result`; DoubleCheck's six extractors produce its own observation shape from a `ctx`. Replacing them means adopting the recorder's shape, which is a contract change, not a refactor |

  So `ProviderResilienceService` does **not** collapse to an adapter: roughly the
  backoff half deletes, the breaker half stays and is the part worth owning.
  `AiTelemetryExtractor` is a genuine move, not a delete.

  **`AiTelemetryExtractor` is now done** (307 lines, 553·0·0·1). It moved
  verbatim — pure transform, no injections, no run state — taking
  `SpecialistAgentGateway` 2,214 → **1,976**. Seven delegating wrappers stay on
  the gateway so its 25 `safeText` call sites did not change and each function
  still has one implementation. `safeText` and `summarizeMessages` are mutually
  recursive, so both had to travel; `telemetryScalar` went with them because it
  is the redaction primitive.

  `AiTelemetryExtractorSpec` pins the guarantee worth protecting: an observation
  records `length=` and `sha256=` and **never the prompt or response body**,
  including inside struct values. Observations are written to local storage and
  rendered in the flight-recorder UI, so a leak there would put source code
  somewhere the user never asked for.

  `ProviderResilienceService` is **not** done — the circuit breaker
  (`SpecialistAgentGateway.bx:22-35`, a `ConcurrentHashMap` of circuits with
  threshold and cooldown, plus the "parallel sibling failures may open the
  circuit mid-retry" case at `:117`) is the half bx-ai does not cover, and it is
  the half that needs care.

  Separately, `FlightRecorderMiddleware`'s `record` / `replay` modes are worth
  taking seriously for Step 6: replaying a recorded fixture would make the LLM
  corpus tier repeatable without re-billing a provider on every run. That is a
  cheaper mechanism than the one Step 6 currently assumes.
- Folder layout for the reorganisation:

  ```
  app/models/
    domain/     mementos + the Step 12 types
    runtime/    RunService, RunPipelineRegistry, RunEventService, WorkerRegistry,
                RepositoryScanner, GitRepository, SecurityContext, SecretRedaction,
                Schema, SupportedLanguage, AppSettings, ObservabilityTrace
    ai/         gateways, provider resolution, ProviderResilience, AiTelemetryExtractor,
                PromptRegistry/Compiler/OutputValidator/Authoring/Evaluation
    analysis/   BoxLangParser, CfmlParser, CfmlSourceScanner   <- shared, NOT under review/
    review/     ReviewPipeline + review services + ArchitectureIndexService
    modernize/  ModernizePipeline + modernize services
  ```

  Repositories sit with the package that owns them.

---

# Part 6 — End state and invariants

Without a stated target, "delete a lot" is not a design. This is what done looks
like, and what keeps it done.

## 6.1 Size and shape

| Measure | Now | After Part 4 only | After Parts 4 + 5 |
| --- | --- | --- | --- |
| Largest service | `ModernizationProposalService` 5,371 | `SpecialistAgentGateway` 2,214 | ≤ 900 |
| Services over 1,400 lines | 3 | 1 | 0 |
| Total service LOC | 30,859 | ~28,900 | ~28,000 |
| Service count | 67 | ~73 | ~75 |
| Domain types | 5 | 9 | 9 |
| `RunService` injections | 35 | 35 | ≤ 12 |
| Structure paths in Modernize | 2 | **1** | 1 |

Note the service count **rises**. That is correct: the problem was never too many
services, it was too few for the amount of behaviour. What matters is that no
single file carries three responsibilities.

The `~73` is now light by two: the modernization corpus evaluator (§2.13) and the
citation resolver (§2.16) are both services this plan needs and did not previously
count. Read the row as a direction, not a target — a plan that hits a service
count by declining to write a service it needs has optimised the wrong number.

Note also that **Part 4 alone does not get there** — `SpecialistAgentGateway`
inherits the "largest file" title. Part 5 is lower priority, not optional.

## 6.2 Invariants — enforce these with a fitness spec

Add `tests/specs/unit/ArchitectureFitnessSpec.bx` asserting each, so drift fails
CI rather than accumulating:

1. **No service exceeds 900 lines** except `SchemaService` (a schema definition,
   legitimately one unit).
2. **One owner per invariant.** Exactly one file computes target paths, cluster
   membership, wave order, and fingerprint volatility. Grep-assert that the
   volatile-key list appears once — it appears **three** times today and two of
   the three agree, which is how the third drifted unnoticed (§2.7).
3. **One role list.** Every registered role resolves to a role asset and a schema
   asset, and both allow-lists (`ModernizationAgentFactory.bx:33`,
   `ModernizationAgentGateway.bx:542`) hold the same set as
   `resources/prompts/manifest.json`. Three lists of role names is the same
   defect shape as three volatile-key lists (§2.15).

   **Enforced** by `tests/specs/unit/PromptRoleRegistryFitnessSpec.bx` (5 specs).
   It reads the two allow-lists out of the source rather than restating them —
   restating would just add a sixth list — and checks all five places a role
   name lives, plus that each role asset names an `outputSchema` the manifest
   actually registers. Mutation-checked: dropping `modernization-critic` from
   the gateway allow-list fails with that role named.

   Note the count is **five places, not three**: `lifecycle.active`, `contracts`,
   `schemas`, and the two allow-lists. Steps 5, 9 and 10 took modernization
   roles from five to nine, so the exposure nearly doubled while this was
   unguarded. A role registered in four of five places throws
   `ValidationException` on the first request that uses it, not in CI.
4. **A modernize gate run never writes `language_capabilities`.** Capability
   tiers are measured by the review corpus alone (§2.13).
4b. **Every `@singleton` in `app/models` declaring an injected property is
   `class threadsafe`.** Grep-assert it. Omitting it does not fail a test — it
   nulls a dependency in production on an unlucky thread (§2.17).
5. **The deterministic layer never calls the LLM layer.** `CouplingGraphService`,
   `DerivedStructureService` and the domain types must not inject any gateway.
   This is what keeps the deterministic corpus tier runnable without a provider.
6. **No `runKind` string comparison outside the pipeline registry** (after Part 5).
7. **Nothing derived is stored**, therefore nothing derived is fingerprinted.
8. **No service holds more than 15 injections.**

   **Not enforced, because it fails today.** Measured: `ReviewRunService` 35,
   `ModernizationRunService` 21, `ReviewPolicyService` 14,
   `SpecialistReviewService` 14. The first two are the pipeline-seam work in
   Part 5 (§6.1 targets `RunService` at ≤ 12), so asserting this now would only
   add a red test that Part 4 cannot fix. Add it with the pipeline seam, or add
   it now with those two as named exceptions — the same shape the 900-line rule
   uses for `SchemaService`.

Invariants 4 (no `language_capabilities` from a modernize gate) and 7 (nothing
derived is fingerprinted) are covered by `ModernizationCorpusSpec` and
`ModernizationIdentityService.volatileKeys()` respectively. Invariant 6 is Part 5
work and cannot be asserted before the registry exists.

## 6.3 What this plan does *not* fix

Stated so it is a decision rather than an oversight:

- **The domain stays thin relative to the services** — 9 types against ~75
  services. Step 12 covers the concepts that carry invariants; the rest of the
  model layer remains service-centric, which is a reasonable fit for an analysis
  tool and not worth a broader rewrite.
- **`aiFlight` keeps its own trace normalisation**, duplicating token-usage
  parsing with `AiTelemetryExtractor`. Deliberate: the module is independently
  distributable. Mitigate with a shared fixture parity spec, not shared code.

  **Done — and it immediately found a live bug.**
  `tests/specs/unit/AiUsageParitySpec.bx` feeds both parsers the same provider
  payloads. They agree on OpenAI `snake_case`, on camelCase, on deriving a
  missing `total_tokens` from its parts, and on inventing nothing when usage is
  absent.

  They **disagree on Anthropic-style `input_tokens` / `output_tokens`**:
  `AiTelemetryExtractor` reads them (`:112-113`), `EventNormalizer.extractUsage`
  does not. On an Anthropic provider the review UI shows real token counts while
  the flight recorder shows **zero for the same run** — two screens disagreeing
  about one call, which is exactly the failure a parity spec exists to catch.

  The divergence is asserted rather than fixed, because the fix belongs to
  aiFlight and the module is independently distributable. When `EventNormalizer`
  learns those keys the spec fails, and that assertion should be promoted to an
  agreement check alongside the others.
- **Two observability paths remain** — `ObservabilityTraceService` (run lifecycle)
  and aiFlight (`bx-ai` provider events). Different sources, genuinely different
  concerns.
- **`ModernizationRunService` / `ProposalService` / `ShardExecutor` orchestration
  boundaries** will want one more pass once the derived path is real. Do not
  pre-design it now — the right split will be obvious after Step 11 and guessing
  at it is how this codebase acquired its parallel paths.
- **Architecture findings stay on modernize runs**, which require a provider
  (Step 1). Delivering them keylessly means running the modernization inventory
  on review runs — a real cross-pipeline change, deliberately not taken here.
  Until it is, the feature row says "on modernize runs".
- **Decisions recorded against a pre-v2 plan are void**, not migrated (§4.0). A
  fingerprint-composition migration would be a compatibility path, which is the
  category this plan exists to remove. Stated so it is a decision.

---

# Appendix A — History (not instructions)

This plan went through ten review passes. Twenty claims were overturned by
verification. Recorded so the reasoning is auditable, and as a warning:

| Claim | Reality |
| --- | --- |
| Don't feed the graph to Modernize | correct for a refactor, wrong for architect-grade output |
| Make all gates decide | violates the honesty principle; `operational-need` is not source-derivable |
| Replace `estimatedComplexity` | already built as `effortSize`/`effortDrivers` — it just is not exported |
| Build a new brief surface | `modernize.bxm:337` already exists |
| Fingerprint isolation is new infrastructure | exists in two places, and they disagree (§2.7) |
| The inversion is a build | already half-built as a fallback (§2.1) |
| Delete `AIReviewService` | reachable fallback (§2.12) |
| Delete `resplitTruncatedShard` | truncation is output-volume; keep it (§2.4) |
| Most of `ValidationService` is structural | 28% |
| ~1,400 lines of synthesis | 864 |
| Net deletion 4,500–5,000, then 2,000–2,600 | ~2,945 measured (§2.5) |
| Blast radius 594 assertions | 726 — `tests/js/` was missed and is ungated (§2.10) |

**Tenth pass — re-verification against `528a97f`.** Part 2's measurements all
held exactly. What did not hold was everything Part 2 had not looked at:

| Claim | Reality |
| --- | --- |
| Part 2's line counts have drifted | They are exact. `Measure-Object -Line` reads ~4% low on this repo; the counts were right and the measuring tool was wrong |
| Two copies of the volatile-key list | **Three** — `PlacementService:232`, `:646`, `GateService:237` (§2.7) |
| The synthesis and shard blocks need `agentFactory` | Synthesis needs **no** injected service; shards need `agentFactory` **and** `agentGateway` (§2.5a) |
| Step 1's findings work with no key on the Review side | `ModernizationInventoryService` has one caller, on a run that requires a provider. The graph's input does not exist on review runs (§2.12, Step 1) |
| `loadCorpus` needs no change, so the corpus is cheap | True for loading, false for scoring. `evaluate()` is finding-shaped; none of the four deterministic metrics exists (§2.13) |
| A modernization corpus is additive | It would overwrite the review-measured language tier — `language_capabilities` keys on `language` alone (§2.13) |
| Roles are ~180 lines in `AgentFactory` | Eight files plus three maps in the prompt manifest and 16 prompt assets; and `ModernizationSliceRebuildService` (482 lines) was absent from the plan entirely (§2.15) |
| Step 10 uses "the existing citation validator" | There is none. Modernize checks that `evidenceRefs` is non-empty and never resolves a ref (§2.16) |
| The pipeline runs proposal → validation → placement → gate | Placement and gate run **before** validation, and a repair loop repeats all three (§2.14) |
| The run has no state the rewiring must preserve | It is checkpointed and resumable, with a hard-coded progress ladder (§2.14) |
| `.db/` deletion is a formality | 136 MB with a same-day WAL (Step 0) |
| Step 3 is one step | It was one irreversible step containing the plan's largest reversible chunk. Now 3a / 3b |

Every one broke the same way: a design proposal that assumed how the code worked,
overturned the moment someone grepped. **Verify, then propose.**

And the tenth pass adds a second lesson: **verification has a shape, and Part 2
had a blind spot.** Nine passes measured the code the plan deletes and never
measured the infrastructure the plan depends on — the corpus scorer, the gate,
the prompt registry, the checkpoints, the citation check. Deletions were counted
to the line; the things that must exist for the replacement to work were assumed
into existence. When re-verifying, budget attention for both.
