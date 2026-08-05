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

| # | Step | Status | Gate — the thing that decides | Evidence |
| --- | --- | --- | --- | --- |
| 0 | Clear the ground | `done` (uncommitted) | `box server restart && box testbox run` green; `node --test tests/js/*.spec.mjs` green **and in `box.json:49`**; `/`, `/modernize`, `/aiflight/` load | **Gate green: 492·0·0·1**, `box run-script test` reaches its node stage (3/3), all four routes 200. Required fixing the §2.17 wiring race first |
| 1 | Coupling graph | `wip` | unit specs for cohesion, fan-in/out, cycles, co-access on Step 2a fixtures; identical input → byte-identical graph | `ModernizationCouplingGraphService` + 16 specs green (508·0·0·1). **Remaining:** corpus-fixture validation (needs 2a), plus persistence and architecture findings, both deferred to Step 2 — see the note in Step 1 |
| 2 | Promote synthesis | `done` (uncommitted) | deterministic corpus tier green on all four scenarios | **All seven items done** (550·0·0·1). Synthesis moved; clustering is weighted modularity; wave order derived; target-path has one owner; shards key to clusters; `execute()` wired and verified by a live run; checkpoints + ladder re-plotted (contract v9) |
| 2a | Corpus, deterministic tier | `done` (uncommitted) | four scenarios green; `baseline-llm-path.json` committed; modernize gate leaves `language_capabilities` untouched | Four fixtures + manifest at `resources/evaluation-corpus/modernization-v1/`, `modernizationCorpusPath` setting, 14 specs green (523·0·0·1). Two extractor defects found and fixed (§2.18). **`baseline-llm-path.json` captured — the one-way door is closed** (§2.19), and it rewrote Step 3b's stop conditions. The generic evaluator is deferred to Step 2, where the predicates it must score become computable |
| 12 | Domain types | `done` (uncommitted) | exactly one file computes each invariant; one type answers each | `CouplingGraph`, `WaveOrder`, `Cluster` added; README convention amended; `ArchitectureFitnessSpec` asserts one owner each for target path, cluster membership, wave order and the volatile-key list. `Placement` ownership closed by Step 2 item 2 |
| 3a | Re-point client + tests | `todo` | full TestBox + `node --test tests/js/` + corpus tier green **with the derived path serving all three routes** | |
| 3b | Delete the LLM path | `todo` | all four stop conditions incl. `seamPrecision` vs baseline; suite green with **zero** assertions rewritten in this step | |
| 11 | Break up the residual | `todo` | no `app/models` service over 900 lines except `SchemaService` | |
| 5 | Re-point the roles | `todo` | LLM corpus tier runs; token + wall-clock baseline recorded | |
| 6 | Corpus LLM + judge tiers | `todo` | thresholds set to measured baseline; citation resolver exists and is called | |
| 7 | The deliverable | `todo` | export/UI parity spec green; JSON + SARIF byte-identical | |
| 8 | Gates | `todo` | `unknownRate` falls materially **and is not zero** | |
| 9 | Critic | `todo` | `criticAccuracy` measured; critic catches the planted `false-seam` | |
| 10 | The brief | `todo` | `claimSupport` + `verdictSpecificity` recorded; citation validity 100% **via the resolver** | |
| — | Part 5 Track A | `todo` | separate track, lower priority | |

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

**Gate:** full TestBox suite green; `node --test tests/js/` green; deterministic
corpus tier green; app boots and all three routes load — **with the derived path
serving every one of them.** The LLM path is now dead weight rather than a
dependency, which is precisely the state 3b is safe to act on.

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
- **Surface `riskLevel`, `effortSize`, `effortDrivers`, `relatedFindingCount`**
  (§2.8) — computed today, exported never. In prose: *"four of six weeks are
  session state, not file moves"*.
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

Review and Modernize share a run engine but the sharing is implemented as
`runKind == "modernize"` branches inside review-named classes, across 14 files.
`ReviewRunService` has 35 injections and a 563-line `executeRun()`.

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
- Folder moves do not change any `inject=` string (§2.12), but check for
  duplicate class names first.
- **`SpecialistAgentGateway` is 2,214 lines and untouched by Part 4** — after
  Steps 1–11 it becomes the largest file in `app/models`. Split it:
  `ProviderResilienceService` (~250: circuit breaker, backoff, error
  classification — which also gives the Modernize gateway a breaker it currently
  lacks) and `AiTelemetryExtractor` (~450: `extractUsage`, `extractLlmInput`,
  `extractLlmOutput`, `extractToolInfo`, `summarizeMessages`,
  `observationTypeFor`). Target ≤ 900.

  **Investigate first — bx-ai may already provide this.** `aiAgent()` accepts a
  `middleware` array with built-in `RetryMiddleware` (exponential backoff),
  `LoggingMiddleware` and `FlightRecorderMiddleware` (records LLM/tool
  interactions to a JSON fixture for replay). If those cover the retry and
  telemetry paths, both extractions shrink to a thin adapter and several hundred
  hand-rolled lines delete instead of moving. `FlightRecorderMiddleware` may also
  be a cheaper corpus-replay mechanism than re-running providers in Step 6.
  Verify against the installed bx-ai version before designing either service —
  do not assume the API from documentation alone.
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

## 6.3 What this plan does *not* fix

Stated so it is a decision rather than an oversight:

- **The domain stays thin relative to the services** — 9 types against ~75
  services. Step 12 covers the concepts that carry invariants; the rest of the
  model layer remains service-centric, which is a reasonable fit for an analysis
  tool and not worth a broader rewrite.
- **`aiFlight` keeps its own trace normalisation**, duplicating token-usage
  parsing with `AiTelemetryExtractor`. Deliberate: the module is independently
  distributable. Mitigate with a shared fixture parity spec, not shared code.
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
