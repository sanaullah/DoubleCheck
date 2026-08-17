# CodeGraph — remediation plan and Code Graph / Knowledge Graph roadmap

**Status: Phases 1–7, 9 and 10 complete (see §18–§24); Phases 8 and 11 proposed.**

**Evidence base.** Every `file:line` was re-validated against the working tree on
2026-08-16 (branch `dev3`, base `caf64b4`, worktree dirty and preserved). Counts
marked *(RV)* were queried from the live database `.db/doublecheck.db`
(codegraph run `14311ae6`, 41,513 dependency rows). Language-semantics claims were
settled by executing probes against the local BoxLang runtime — the BoxLang docs
do not cover them.

**Claim classification** used throughout:

| Tag | Meaning |
|---|---|
| **RV** | Runtime verified — observed in the live database or a runtime probe |
| **TV** | Test verified — an existing spec asserts it |
| **CP** | Code present, not runtime verified — the code path is unambiguous but no execution was observed |
| **PA** | Partial — true in some paths, not all |
| **PR** | Proposed — design, not yet built |
| **NS** | Intentionally not supported |
| **OD** | Obsolete or incorrect documentation |

**Supersedes:** `codegraph-graph-fidelity-design.md` (complete; deleted 2026-08-15,
archived at commit `99daba1`). `codegraph-editorial-diagrams-proposal.md` folds
into Phase 9. `adr-001-codegraph-workspace-layout.md` stays — a decision record.

---

## 0. Status ledger

The single place to see what is built. Everything not listed as DONE or PARTIAL
is **untouched** — designed and evidenced in this document, no code written.

**Legend:** ✅ done · 🟡 partial · ⬜ not started

### Shipped so far — Phases 1–4 complete, Phase 5 partial (2026-08-16, uncommitted)

| ID | Item | State | What exists now |
|---|---|---|---|
| **BD-1** | Unfiltered regex call extraction | ✅ | Shared `CallTargetFilter` (runtime BIF list) + literal/comment masking in all 3 parsers + unresolved calls excluded from the load with the count reported. **Measured on a fresh run:** 41,513 → 21,380 rows; graph-eligible **4,016**; `unresolved: 17,364` reported |
| **BD-2** | Cap ordering starves structural kinds | ✅ | `calls` demoted below unnamed kinds; starved kinds reported. **Measured:** `omitted: 0`, `starvedKinds: []`, and `constructs` (309), `tests` (191), `type-reference` (8), `extends` (1) now reach `codegraph_edges` — all were 0 |
| — | Stale hardcoded reuse-key fallback | ✅ | `CodeGraphRunService.bx` fallback signature now tracks the bumped parser versions |
| — | Parser version invalidation | ✅ | `boxlang-ast-parser-v5`, `cfml-symbol-parser-v5`, `javascript-symbol-parser-v4` |
| — | Test coverage for the filter | ✅ | `tests/specs/unit/CallTargetFilterSpec.bx`, 10 specs |
| **D1** | Reuse never wrote levelled rows | ✅ | `adoptRunGraph` copies `codegraph_nodes`/`codegraph_edges`; spec asserts the adopted run has rows |
| **D2** | Search said "no match" for "no graph" | ✅ | `/codegraph/search` returns 409 when the run has no levelled storage |
| **D3** | `complete: true` on an empty set | ✅ | `complete` requires `available > 0`; new `state` of `empty`/`complete`/`truncated` |
| **D4** | Level edges dropped by the node cap | ✅ | Node ids bound into the edge SQL (chunked), ranked after merge, plus `edgeCompleteness` |
| **D5** | Symbol `calls` edges could not form | ✅ | Dotted-leaf match. **symbol/calls 0 → 1,499** |
| **D6** | Completeness entries self-certified | ✅ | Real denominators for flows, layer violations and clusters |
| **D8** | Banner reported snapshot, not view | ✅ | View-level "drawing N of M nodes/edges" lines first |
| **D9** | 409 set a flag nothing read | ✅ | Symbol panel states the level is unavailable and why |
| **D12** | Clusters capped alphabetically | ✅ | Ranked by file count, id order restored; `clusters` completeness entry added |
| **D18 + G-j** | Stage health never persisted | ✅ | `stage_health_json` column + `saveStageHealth`; verified `{"projection":{"ok":true,...},"narrative":{"used":true,...}}` |
| **D25** | Cap deleted routes/tables, emptying flows | ✅ | Synthetic nodes exempt from the ranked cut |
| **D30** | Unguarded snapshot deserialise | ✅ | Returns `unreadable: true` instead of throwing; spec covers a corrupt row |
| **D27** | Directory level had no parent | ✅ | Ancestor chain materialised: **62 directories, 58 parented** (was 0) |
| **G9** | No confidence/provenance on edges | ✅ | `resolution`/`provenance`/`confidence` columns. Measured: exact/high 26, heuristic/medium 1,977, heuristic/low 2,096, derived 120 |
| **BD-4** | Labels keyed on exact membership | ✅ | Keyed on the deepest shared directory; spec proves a label survives a domain gaining a file |
| **G13** | CodeGraph extraction weaker than Modernize | ✅ | Shared `IntegrationDetector`. **`http` 0 → 7**, and it names the host — `api.anthropic.com` |
| **G14** | CFML second-class | ✅ | `CfmlParserService` gained `routes` and `renders` detectors |
| **G15** | `integration` role unreachable | ✅ | **6 files** now carry it (was 0) |
| **G1b** | `http`/`schedule` detectors could not fire | ✅ | Both produce rows; `filesystem` (4) and `java` (2) added |
| **G3** | Data access collapsed to one kind | ✅ | Read/write split: **137 `table-write`, 87 `table-read`**, 2 ambiguous (was 223 undifferentiated) |
| **D31** | Rejected narrative vanished silently | ✅ | `rejected: { domains, processes, onboarding, risk }` counts returned |
| **E1 + BD-3** | Display metric decided retention | ✅ | New `CodeGraphCentralityService` — PageRank-style power iteration, fixed iterations for determinism. Retention uses centrality; `hotspotScore` is display-only |
| **E9** | Rank was an opaque number | ✅ | Per-node `rankRationale` — "12 callers · 3 commits · in a cycle" |
| **G5/G7 (query surface)** | No callers, hierarchy, lineage or impact query | ✅ | Four endpoints — `/neighbours`, `/hierarchy`, `/lineage`, `/impact` — each with a completeness account |
| **G-c** | `format=svg` was a text list | ✅ | Real cluster diagram: **13 boxes, 15 dependency lines** on a live run; light paper palette, no remote fonts |
| **G-d** | Nothing rendered a flow | ✅ | `format=sequence` — participants as columns, hops as rows, unresolved hops render "(file level)" |
| **G10** | No "start here" view | ✅ | `/codegraph/onboarding` — entry points, largest domains, most depended-upon files, each with a stated reason |
| **D10** | Orchestrator evidence branch dead | ✅ | Reads `evidence[key]`, not the outer map; roles re-measured |
| **D7** | `subgraph.truncated` always true | ✅ | True only when the limit was hit or the frontier remained; spec now asserts both cases |
| **D13/D14/D15** | Handler contract holes | ✅ | `codegraphMaxNodes` injected; `include`/`rank` validated (422); unknown `scope` → 404; `edgeLimit` reachable |
| **D17** | Wrong `"\\"` literal at two sites | ✅ | Both corrected; zero occurrences remain |
| **D26** | Layout order depended on locale | ✅ | All 7 `localeCompare` tie-breaks replaced with a stable comparator + the byte-identical determinism spec that never existed |
| **D11** | Duplicate-span attribution was incidental | ✅ | Total tiebreak on `kind` then `id`; the winner is named rather than inherited from parser emission order |
| **D16** | A storage failure read as "run not found" | ✅ | `hasIndexedGraph` logs and rethrows `GraphUnavailableException` instead of returning `false` |
| **D22** | `trimmedSections` had two append paths | ✅ | All four sections use the de-duplicating helper |
| **D24** | `ON CONFLICT DO NOTHING` hid projection duplicates | ✅ | Upserts instead of discarding; a duplicate id no longer silently loses a row |
| **D28** | Truncation flagged by the visibility filter | ✅ | Only the cap marks truncation; the candidate count is carried separately |
| **D29** | Layer policy unescapable and inexpressive | ✅ | `*` wildcards on either side; **moved into `ArchitectureRuleService`** so layer rules have one owner |
| **D20** | Symbol count derived two ways | ✅ | `presentClusters` now reads `indexFileStats`, so cluster and file totals cannot disagree |
| **D21** | Fan-in floor weakened the cap | ✅ | Resolved by E1 — retention uses `centralityService.rank`, so `hotspotScore`'s floor no longer decides what survives |
| **G-a** | Symbol level listed but not drawn | ✅ | A `depth === "symbol"` canvas branch already existed but rendered through `buildFileView`, which labels by path — the same string on every box in one file — and orders by path. New `buildSymbolView` labels by symbol and follows source line. Verified in-browser |
| **D23** | Search was an unindexable full scan | ✅ | Trigram FTS5 mirror + narrowing, `LIKE` retained as the correctness backstop. **6,140 rows mirrored; FTS hits and LIKE-only count agree exactly at 68 for `graphmet`** — a mid-identifier term the default tokenizer cannot match. Third attempt; see §21 |
| **G2** | JS action → route chain had no owner | ✅ | JS symbols were emitted with `endLine == line`, so containment could never reach a `fetch` in the body — **0 of 49** `calls-api` rows carried an owning symbol. Spans now run to the next declaration: **49/49**, e.g. `loadSession → /api/v1/session` |
| **E7** | MCP descriptor written but unreachable | ✅ | `/codegraph/mcp` now serves the 8 tools plus the contract, gated on levelled rows. **Curl-verified; no automated spec** — see §24 |
| **E4** | No matrix overview | ✅ | **Already built** — `toCodeGraphMatrix` renders a DSM |
| **E6** | No SCIP export | ✅ | **Already built** — `scipSymbol` in the diagram service |
| **E3** | Architecture rules not expressible | ✅ | Same work as G-e — `ArchitectureRuleService.defaultRules` + `/codegraph/rules` |
| **G12** | No run-over-run diff | ✅ | **Already built** — `/codegraph/diff?base=` returns added/removed nodes and edges. Its completeness hardcoded `complete: true` beside a computed `omitted`; now derived together (D3's defect in a newer endpoint) |
| **G-e** | Architecture rules were one hardcoded string | ✅ | **Already built** — `/codegraph/rules` returns pass/fail per rule with violation evidence. Verified live: *"Application models must not depend on HTTP handlers"*, 2 violations |
| **G1c** | `implements` produced only by Modernize | ✅ | Detector exists in `BoxLangParserService`; 0 rows here because this codebase declares no interfaces — absence of data, not absence of capability |
| **E2** | Flat top-N slicing instead of focus+context | ✅ | `degreeOfInterest()` in `codegraph-layout.js` scores and bounds the drawn set |
| **G8** | Unresolved / unprovable behaviour never reported | ✅ | Banner states unresolved reference counts and names any wholly starved relationship kind, separately from cap losses — an unresolved reference is not an omission and no larger cap recovers it |
| **G-i + E8** | Canvas unreachable by keyboard | ✅ | **Was already implemented** — `role="application"` tab stop, arrow/Home/End traversal, Enter to select, and a polite live region announcing each node. Ledger was stale; verified in source, not assumed |
| — | Parser signature drift was unenforced | ✅ | `ParserVersionSignatureSpec` — asserts the reuse-key fallback names live parser versions. **Negative-tested:** reintroducing the stale `v4` literal fails it with the right message |
| **G6** | Configuration was not an entity | ✅ | `reads-config` detector + `config:` synthetic nodes. A literal backspace byte was silently killing two of three branches; repaired, and coverage went **27 → 324 rows** *(see §25)*. Covered by `IntegrationDetectorSpec` |
| **G1a** | `emits` / `handles` had no producer | ✅ | `emits` re-added **with a spec this time** — 39 rows naming `codegraph.completed`, `run.cancelled`. The earlier 0-row result was a stale-probe artefact plus a missing array comma, not a bad pattern. `handles` stays out by design: listeners resolve at runtime |
| **D19** | Five hand-rolled `normalizePath` copies | ✅ | New `GraphPathNormalizer`; four services delegate, `normalizeRoute` folded in too |
| **INV-1** | Struct-order invariant undefended | ✅ | Corpus spec builds the same case with the file list reversed and asserts an identical fingerprint — **passes** |

Files: `CallTargetFilter.bx` (new), `CallTargetFilterSpec.bx` (new), and edits to
`BoxLangParserService`, `CfmlParserService`, `JavaScriptParserService`,
`AnalysisGraphRepository`, `CodeGraphRunService`, `JavaScriptParserServiceSpec`.
Plus `CfmlSourceScanner.maskLiterals` + 6 specs. Suite: **691 passed / 0 failed / 0 errored**.

### Everything else — not started

| Group | IDs | Count |
|---|---|---|
| Root decisions | — | 0 ⬜ |
| Severity 1 defects | — | 0 ⬜ |
| Severity 2 defects | — | 0 ⬜ |
| Severity 3 defects | — | 0 ⬜ |
| Invariant guard | — | 0 ⬜ |
| Capability gaps | — | 0 ⬜ · G11 and the response half of G4 are **NS** by design; G16 retracted (§26) |
| Enhancements | — | 0 ⬜ · E1–E4, E6–E9 done; **E5 measured and re-scoped (§28)** |

**Comprehension score: 5 of 17.** Q9 ("which symbols call, construct or extend
another") and **Q17** ("what external systems does this talk to") both moved from
*No* to *yes*. The symbol level carries 1,499 `calls`, 787 `constructs`, 315
`injects`, 11 `type-reference` and 1 `extends`; outbound integrations are detected
and named. Q4 improved — scheduled work is now visible. The rest needs the
remaining Phase 5 producers and Phases 6–10.

### Immediate next steps, in order

1. **Finish Phase 5** — still open: `emits`/`handles` producers (G1a), SQL
   read/write split (G3), configuration as an entity (G6), symbol-level change
   impact (G7), test→production symbol linkage (Q11), defines-vs-references (G5).
2. **Phase 6** — roles and contract hygiene (D10, D7, D13–D17, D26, D28, D29).
3. **Phase 7** — centrality ranking and explainability (E1, E9, BD-3).

---

## 1. Code Graph vs Knowledge Graph

The product conflates two layers. Separating them is the organising idea of this
plan.

**Structural Code Graph — deterministic, no AI, falsifiable.**
Entities that exist in source, and relationships that can be pointed at with a
`file:line`. Every edge carries evidence, a resolution method, and a confidence
class. If it cannot be pointed at, it is not an edge — it is an absence, and the
absence is reported.

**Knowledge Graph — interpretive, optional, cited.**
Domains, responsibilities, processes, risks, glossary. Built *only* by attaching
labels and prose to structural entities that already exist. The LLM may name and
explain; it may never create a node, an edge, a flow, or a domain. Every narrative
sentence must resolve to structural ids or it is dropped — and **the drop must be
counted** (see D31).

Without an AI key the structural layer must remain independently useful: search,
drill, trace, impact, and evidence all work; only the naming and prose disappear.

The current build honours this contract in the normalizer
([CodeGraphNarrativeNormalizer.bx:5](../../../app/models/services/CodeGraphNarrativeNormalizer.bx))
by validating every model-supplied id against snapshot ids — good design — but
discards failures silently (D31).

---

## 2. End-user comprehension success criteria

The target: *a developer new to a project understands it from CodeGraph without
reading source*. That sentence names eleven things; each maps to a question, so
nothing in the target is implicit:

| Target item | Question(s) |
|---|---|
| architecture · implementation structure | Q1, Q2 (+ directory chain, D27) |
| important components | **Q16** |
| dependencies | Q7, Q9 |
| entry points | Q3, Q4 |
| business domains | Q2 |
| end-to-end flows | Q5–Q8 |
| data access | Q7 |
| external integrations | **Q17** |
| risks | Q13 |
| change impact | Q12 |

Current answerability:

| # | Question | Status | Blocking gap |
|---|---|---|---|
| Q1 | What is this application, how is it organised? | **PA** | Clusters + narrative exist; cluster count capped alphabetically (D12) |
| Q2 | Main domains, modules, layers, responsibilities? | **PA** | Domains are LLM labels over derived clusters; labels detach on drift (BD-4) |
| Q3 | Where are the entry points? | **RV yes** | 271 `route` symbols, 141 `handler-action`, 4 `lifecycle-hook` indexed |
| Q4 | What starts each request / job / event / background process? | **PA** | Routes yes; **scheduled work now visible — 5 `schedule` rows** *(RV, was 0)*. **Events still 0 rows, no producer (G1a)** |
| Q5 | How does a JavaScript action reach an HTTP route? | **RV yes** | `calls-api` now names the calling function — **49/49 attributed** *(was 0/49)*: `loadSession → /api/v1/session` |
| Q6 | How does a route reach a handler and action? | **RV yes** | 45 `routes` file edges projected |
| Q7 | Which services, repositories, queries, tables participate? | **RV yes** | `injects` and `table-query` plus the read/write split — **95 `table-read`, 143 `table-write`** *(RV, both were 0; G3 shipped)* |
| Q8 | What response or side effect completes the flow? | **No** | No response/side-effect modelling (G4) |
| Q9 | Which symbols define / reference / call / extend / implement / render / emit / handle / test another? | **PA** | Symbol level now carries 1,499 `calls`, 787 `constructs`, 315 `injects`, 11 `type-reference`, 1 `extends` *(RV, D5 fixed)*; no defines-vs-references split (G5); `emits`/`handles` have no producer (G1a); `implements` is produced only by Modernize (G1c, G13) |
| Q10 | Which configuration values influence each component? | **No** | Config is not an entity (G6) |
| Q11 | Which tests exercise each implementation path? | **RV yes, file level** | **198 `tests` file edges** now reach the graph (`tests/…spec.bx → app/models/domain/cluster.bx`); was 0. Symbol-level test→symbol linkage is still Phase 5 |
| Q12 | What changes when a file / symbol / endpoint / table changes? | **PA** | `review_impacts` is file-level; no symbol, endpoint or table impact (G7) |
| Q13 | Cycles, hotspots, dead code, violations, unresolved dynamic behaviour? | **PA** | Cycles, hotspots, orphans, layer violations exist; **unresolved/dynamic behaviour is not reported at all (G8)** |
| Q14 | What is proven, inferred, truncated, unsupported, stale, unknown? | **No** | Only a partial truncation account; no confidence class, no unresolved count (G9) |
| Q15 | Where do I start reading? | **No** | No onboarding/"start here" ranking view (G10) |
| Q16 | Which components matter most, and why? | **No** | Ranking exists but is unexplained, mixes churn with structure, and is spent on retention not attention (BD-3); needs E1 + E9 |
| Q17 | What external systems does this talk to? | **RV yes** | **33 `http` rows** and **19 files carrying `role=integration`** *(RV, both were 0)* — shared detector shipped (G13), role precedence fixed (G15) |

**Five of seventeen are answerable, six partial, six not.** Answerable: **Q3**
(entry points), **Q6** (route → handler), **Q7** (services → repositories →
queries → tables, now with read/write), **Q11** (tests, file level) and **Q17**
(external systems). Q9 and Q4 are partial — real structural relations exist, but
the defines/references split and event wiring do not.

> **This is an assessment from the capability matrix above, not an observed
> result.** It is derived from what the graph now contains, not from watching a
> developer try to answer the questions. The Cold-Read Protocol in §2a has
> **never been run**, and until it has — on a non-BoxLang project — treat this
> number as a hypothesis about comprehension, not a measurement of it. G13 and
> G14 exist precisely because self-analysis flattered the tool.

---

## 2a. The Cold-Read Protocol — the gate for the target experience

Every gap in this plan has an acceptance test; the *target experience* had none.
Every phase could pass and the headline promise still fail, because nothing
measured it.

A reader who has never seen the target project answers the 17 questions using
**only the CodeGraph UI and API** — no source files, no editor search, no asking
anyone. Per question record: answered / partial / not answered, time taken, and
the screen or endpoint that produced it. A question counts as answered only if the
reader can state the answer **and** point to the `file:line` evidence CodeGraph
gave them.

**Status: never run.** Every score below is a target except the first, and the
first is an assessment from §2's capability matrix rather than an observed
reading session. Running it is the single most valuable unclaimed item in this
plan, because it is the only check that measures the product's actual promise.

| After phase | Fully answered | Time budget |
|---|---|---|
| today, after Phases 1–3 | **5 of 17** *(assessed, not observed)* | — |
| 3 | 6 of 17 | — |
| 5 | 11 of 17 | ≤ 30 min |
| 9 | 14 of 17 | ≤ 20 min |
| 10 | 16 of 17 | ≤ 15 min |

Q14 ("what is proven vs inferred") scores last — it depends on every other answer
carrying a resolution class.

**Run it against two projects: DoubleCheck, and one unfamiliar ColdFusion
repository.** Self-analysis flatters a code-graph tool because the parsers were
written against this codebase's idioms. G13 and G14 are the proof: the tool cannot
see its own outbound HTTP calls, and it cannot see routes or views in CFML at all
— neither was noticed while only reading its own map.

---

## 3. Verified current capability matrix

Measured on this repository, run `14311ae6` *(RV unless noted)*.

### Indexed substrate

| Symbol kind | Count | | Dependency kind | Rows | Unresolved |
|---|---|---|---|---|---|
| function | 2,854 | | **calls** | **39,165 (94.3%)** | **37,513** |
| property | 701 | | constructs | 915 | 118 |
| test | 678 | | injects | 567 | 224 |
| class | 346 | | table-query | 214 | 214 |
| route | 271 | | tests | 190 | 0 |
| handler-action | 141 | | routes | 130 | 0 |
| test-suite | 113 | | extends | 120 | 119 |
| lifecycle-hook | 4 | | type-reference | 73 | 55 |
| **total** | **5,108** | | calls-api | 49 | 0 |
| | | | `scope.*` (4 case-variant kinds) | 79 | 79 |
| | | | renders / imports / includes | 11 | 5 |
| | | | **total** | **41,513** | **38,646 (93%)** |

Symbol attribution on dependencies: **34,578 attributed / 6,935 unattributed = 83.3%**.

### Projected graph — what actually reaches the user

| Node level | Rows | | Edge level / kind | Rows |
|---|---|---|---|---|
| symbol | 5,108 | | file / injects | 1,029 |
| file | 405 | | **symbol / injects** | **945** |
| directory | 40 | | file / calls | 924 |
| cluster | 31 | | cluster / cluster-dependency | 270 |
| **total** | **5,584** | | file / routes | 45 |
| | | | file / renders | 18 |
| | | | file / calls-api | 6 |
| | | | **symbol / calls** | **0** |
| | | | constructs / extends / tests / type-reference | **0** |

> **Correction (2026-08-16).** The projected-edge figures first recorded here were
> queried **without a `run_id` filter** and therefore summed three runs. Every one
> divided exactly by three when re-measured. The per-run baseline was: file/injects
> 343 · symbol/injects 315 · file/calls 308 · cluster 90 · file/routes 15 ·
> file/renders 6 · file/calls-api 2 · **symbol/calls 0**. The table above is the
> inflated version and is superseded by §18's measured post-fix numbers.

**Corrections to the previous baseline** *(the earlier figures came from the
deleted fidelity design and are now stale)*: 31 clusters (not 35), 405 file nodes
(not 400), 5,584 total nodes. Run duration measured from `review_runs`:
**~2m36s and ~2m38s** for two concurrent full runs on 2026-08-11 — not the
"4–5 min" previously recorded. Test-suite baseline 675/0/0 is **not re-verified**
in this pass.

---

## 4. Root decisions — the graph is inaccurate before any defect applies

These are decisions working as written whose consequence is a graph that does not
describe the code. They outrank every defect in §5.

### BD-1 — `calls` edges are regex-scraped per line, unfiltered, and persisted · **RV**

**Consequence.** 94.3% of the dependency table is noise; 95.8% of `calls` resolves
to nothing.
**Evidence.** [BoxLangParserService.bx:549](../../../app/models/services/BoxLangParserService.bx)
matches `\b([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\(` per source line and stores every
hit minus a 27-word keyword list (`:547`). No BIF allowlist, no comment/string
stripping, no unresolved filter. A real AST path exists (`BoxAST`, `:26`–`:36`) but
`parseRegex` runs as the baseline and supplies the dependencies — the version
string `boxlang-ast-parser-v4` (`:9`) overstates what produces edges **(OD)**.
**Measured top targets:** `expect` 2,704 · `len` 1,377 · `trim` 1,242 · `toBe`
1,088 · `toString` 795 · `lCase` 785 · `isStruct` 747 · `isArray` 663 · `val` 596 ·
`var` 302 (not a function) · `document.querySelector` 245. **5,457 distinct
unresolved call targets against 5,108 real symbols** — the noise vocabulary
exceeds the code's.
**Missing capability.** Extraction-time filtering with a per-language builtin
allowlist, and a policy for unresolved references (drop, or store separately and
report as a count).
**Desired behaviour.** `review_dependencies` falls to ~4,000 rows; every persisted
`calls` row either resolves or is counted as an explicitly unresolved reference.
**Impact.** Parser version bump → full re-index; reuse key must move. Shared
consumers: Review and Modernize both read `review_dependencies` (additive-safe,
they ignore row-count changes, but their own metrics will shift).

### BD-2 — the cap's kind-priority ordering deletes the real edges · **RV**

**Consequence.** `constructs`, `extends`, `type-reference`, `imports`, `includes`
and `tests` have **never appeared in a graph this product produced here**.
**Evidence.** [AnalysisGraphRepository.bx:385](../../../app/models/repositories/AnalysisGraphRepository.bx)
orders `calls-api(0) · routes(1) · injects(2) · renders(3) · table-*(4) ·
http/schedule(5) · calls(6) · ELSE(7)` then `LIMIT 20000`. Replaying that exact
statement, survivors are `calls` 19,034 · `injects` 567 · `table-query` 214 ·
`routes` 130 · `calls-api` 49 · `renders` 6. Everything in `ELSE 7` is starved.
Confirmed downstream: `codegraph_edges` contains **zero** rows of those kinds.
**Root cause.** BD-1's noise occupies 95% of the budget; the priority list then
decides which real kinds die.
**Desired behaviour.** After BD-1 the real graph is ~4,000 edges — a fifth of the
cap — so the cap stops binding. Any kind fully excluded by a cap must be a
**reported event**, never a silent sort outcome.

### BD-3 — a presentation metric decides what data exists · **CP**

`hotspotScore` mixes structure with git churn
([CodeGraphMetricsService.bx:568](../../../app/models/services/CodeGraphMetricsService.bx))
and is then used to decide which nodes survive `maxNodes` (`:102`–`:109`). An
editorial "look here first" heuristic determines graph membership. This is what
makes D25 possible. Ranking for *attention* and ranking for *retention* are
different jobs and must not share a metric.

### BD-4 — cluster identity is a hash of exact membership · **CP**

[CodeGraphRepository.bx:414](../../../app/models/repositories/CodeGraphRepository.bx)
keys a cluster on `hash( jsonSerialize( sorted filePaths ) )`. A user's domain
label is bound to an exact file list; adding one file orphans it and the domain
reverts to a generated name. `clusterFingerprint` (`:422`) already exists as the
change-detection value, suggesting the two concepts were meant to be separate.
Labels are the only genuine human knowledge in the system, keyed on the most
volatile property available.

---

## 5. Defect register (corrected)

Severity 1 = returns a confident wrong answer. Full prior detail is preserved;
classifications are new this pass.

| ID | Defect | Class | Evidence |
|---|---|---|---|
| **D1** | Snapshot reuse never writes levelled rows | **CP — see note** | [CodeGraphRunService.bx:69](../../../app/models/services/CodeGraphRunService.bx), `:123`–`:135`, project only at `:213`; [ReviewRunService.bx:417](../../../app/models/services/ReviewRunService.bx)–`:462` returns before projection; [AnalysisGraphRepository.bx:298](../../../app/models/repositories/AnalysisGraphRepository.bx) copies `review_*` only |
| **D2** | Search says "nothing matches" when it means "no graph" | **CP** | [ApiCodeGraph.bx:276](../../../app/handlers/ApiCodeGraph.bx) omits the `hasGraph` check `graph` has at `:243`; client prefers the empty server result ([app.js:4895](../../../public/assets/app.js), `:4910`) |
| **D3** | `complete: true` on an empty result set | **CP** | [CodeGraphGraphRepository.bx:225](../../../app/models/repositories/CodeGraphGraphRepository.bx), `:290` |
| **D4** | Level edges dropped by node cap; no edge account | **CP** | `readEdgesWithin` LIMIT at `:328`, post-filter at `:342`; `completeness` covers nodes only |
| **D5** | Symbol→symbol `calls` edges cannot form | **RV — proven** | **`codegraph_edges` symbol/`calls` = 0.** [CodeGraphProjectionService.bx:192](../../../app/models/services/CodeGraphProjectionService.bx) matches `dep.target` verbatim; [ArchitectureIndexService.bx:307](../../../app/models/services/ArchitectureIndexService.bx) resolves the file from the **receiver** while `target` keeps the dotted string |
| **D6** | Flows / layerViolations / edges completeness self-certify | **CP** | [CodeGraphCompletenessService.bx:93](../../../app/models/services/CodeGraphCompletenessService.bx), `:92`, `:57`–`:72` |
| **D7** | `subgraph.truncated` true for every request | **CP** | [CodeGraphQueryService.bx:108](../../../app/models/services/CodeGraphQueryService.bx) compares against whole-graph node count |
| **D8** | Canvas banner reports snapshot losses, not view losses | **CP** | caps at [app.js:5601](../../../public/assets/app.js), `:5622`, `:5625`; banner renders `snapshot.completeness` at `:5684` |
| **D9** | 409 sets an `unavailable` flag nothing reads | **CP** | set [app.js:4855](../../../public/assets/app.js), guard at `:4924` requires `nodes.length` |
| **D10** | Orchestrator role heuristic never fires | **RV — probe** | [CodeGraphMetricsService.bx:516](../../../app/models/services/CodeGraphMetricsService.bx) reads `evidence.injects` on the **outer** path-keyed struct. Probe: `evidence.injects ?: 0` → `0`, guard false; `evidence[key].injects` → `5`. Dead branch at `:467` |
| **D12** | Clusters capped alphabetically, no completeness entry | **CP** | [CodeGraphMetricsService.bx:222](../../../app/models/services/CodeGraphMetricsService.bx); `report()` `:83`–`:100` has no `clusters` key |
| **D25** | Ranked truncation cuts routes/tables first, emptying flows | **CP** | `appendSyntheticNodes` [CodeGraphMetricsService.bx:720](../../../app/models/services/CodeGraphMetricsService.bx) sets `hotspotScore: 0`; `rankNodes` sorts desc; `visibleNodes` filter at [CodeGraphFlowService.bx:82](../../../app/models/services/CodeGraphFlowService.bx) |
| **D26** | Layout order depends on machine locale | **CP** | bare `localeCompare` at [codegraph-layout.js:228](../../../public/assets/codegraph-layout.js), `:811`, `:828`, `:840`, `:930`, `:940`, `:1048`; **no byte-identical layout determinism spec exists** |
| **D27** | Directory level has no parent — promised drill path absent | **RV** | [CodeGraphProjectionService.bx:66](../../../app/models/services/CodeGraphProjectionService.bx) writes `parentId: ""`; 40 directory nodes all roots |
| **D30** | Snapshot read deserialises without a guard | **CP** | [CodeGraphRepository.bx:87](../../../app/models/repositories/CodeGraphRepository.bx); sibling `deserializeKinds` does guard |
| **D31** | Rejected narrative content vanishes without a count | **CP** | [CodeGraphNarrativeNormalizer.bx:5](../../../app/models/services/CodeGraphNarrativeNormalizer.bx), `:41`, `:54` |

**Severity 2** — D13 uninjected `codegraphMaxNodes` ([ApiCodeGraph.bx:233](../../../app/handlers/ApiCodeGraph.bx));
D14 `edgeLimit` unreachable / `include` + `rank` unvalidated; D15 unknown `scope`
→ 200 not 404; D16 broad catches converting failures to wrong values
([ApiCodeGraph.bx:435](../../../app/handlers/ApiCodeGraph.bx)); D18 levels
diagnostic never persisted; D28 layer-violation truncation flagged by the
visibility filter; D29 layer policy unescapable and inexpressive.

**Severity 3** — D19 five hand-rolled `normalizePath` variants; D20 two
derivations of symbol count; D21 `hotspotScore` floors fan-in at 1; D22
`trimmedSections` duplicated; D23 unindexable `LIKE '%term%'` search; D24
`ON CONFLICT DO NOTHING` masking projection duplicates.

### Corrections made this pass

- **D1 reclassified RV → CP.** *No stored run demonstrates it.* All three
  codegraph runs in the database have 5,584 projected nodes. The worktree has been
  dirty throughout, and `reuseBeforeScan` requires `repositoryIsClean`, so **the
  reuse path has never executed on this database.** The code path is unambiguous
  (early return at [ReviewRunService.bx:462](../../../app/models/services/ReviewRunService.bx)
  before projection; `adoptRunGraph` copies four `review_*` tables and neither
  `codegraph_nodes` nor `codegraph_edges`) but it is inference, not observation.
  It stays Severity 1 and first in the queue; proving it needs a clean-tree run.
- **D5 upgraded CP → RV.** Predicted "essentially zero"; measured **exactly zero**.
- **D11 remains downgraded.** BoxLang's `.sort()` is stable (probe: three equal
  elements retained input order; `ArraySort` → `ListUtil.sort` → Java TimSort), so
  duplicate-span attribution is deterministic. Not an N4 violation. A total
  tiebreak on `kind`,`id` is still wanted for explicitness.
- **D17 remains downgraded.** Probe: `len("\")==1`, `len("\\")==2`. Both `"\\"`
  sites are inert — co-change keys and `cluster.filePaths` are already
  forward-slashed — and the `..` guard is defended by the canonical containment
  check at [CodeGraphQueryService.bx:248](../../../app/models/services/CodeGraphQueryService.bx).
- **Baseline figures replaced** with measured values (§3); prior cluster/node
  counts and the "4–5 min" run duration were stale **(OD)**.

### INV-1 — invariant currently held

Plain struct iteration is **hash-ordered** (probe: inserted `zeta,alpha,mid,beta,omega`,
iterated `mid,alpha,beta,zeta,omega`). No live violation found: the code sorts
consistently, and `canonicalJson`
([CodeGraphMetricsService.bx:820](../../../app/models/services/CodeGraphMetricsService.bx))
recursively sorts keys before hashing, so the fingerprint is genuinely canonical.
**Guard:** build a snapshot twice with the file list reversed; fingerprints must match.

---

## 6. Technical capability-gap register

The gaps that block §2's unanswerable questions. All **PR**.

| ID | Missing capability | Blocks | Root cause |
|---|---|---|---|
| **G1a** | Kinds with **no producer anywhere**: `emits`, `handles` — still 0 rows *(RV)*. `table-read`/`table-write` **shipped**: 95 / 143 rows | Q4, Q9 | Event wiring is never extracted; the SQL read/write split now is |
| **G1b** | ~~`http`, `schedule` cannot fire~~ **resolved** — 33 and 5 rows *(RV, both were 0)* | — | Shared detector shipped (G13) |
| **G1c** | Kinds produced **only by Modernize**, never by CodeGraph: `implements`, `java`, `filesystem`, `datasource`, `sql-proc-call`, `column-query`, `security-session-gate` | Q9, Q13, Q17 | See G13 — CodeGraph extraction is a strict subset |
| **G2** | JS event → `fetch` → route chain | Q5 | `calls-api` resolves a URL to a route file, but nothing links a DOM event handler to the fetch call |
| **G3** | Read/write discrimination on data access | Q7, data lineage | All SQL access collapses to `table-query`; no statement-kind analysis |
| **G4** | Response / side-effect terminal modelling | Q8 | Flows end at a sink node with no notion of what the caller receives |
| **G5** | `defines` vs `references` split (Kythe anchor model) | Q9, Q12 | A dependency row is an occurrence; there is no anchor entity and no binding edge |
| **G6** | Configuration as a first-class entity | Q10 | `getSystemSetting` / `coldbox:setting` injections are not extracted |
| **G7** | Symbol-, endpoint- and table-level change impact | Q12 | `review_impacts` is file-granular only |
| **G8** | Unresolved / dynamic-behaviour reporting | Q13, Q14 | 38,646 unresolved references *(RV)* are stored and never surfaced as "we could not prove this" |
| **G9** | Confidence + provenance on every edge | Q14 | `resolution` exists on some paths; no exact/heuristic/unresolved class, no provenance |
| **G10** | Onboarding "start here" view | Q15 | No ranking designed for a first-time reader |
| **G11** | Control flow / data flow representation | flows, lineage | Dependency edges only — no CFG, no PDG |
| **G12** | Run-over-run diff | change awareness | Never built; node ids are already stable enough |
| **G-a** | Symbol level drawable, not just listable | navigation | Canvas draws the snapshot blob at `maxNodes: 120` |
| **G-c** | Real SVG export | sharing | [ReportExportService.bx:251](../../../app/models/services/ReportExportService.bx) emits one `<rect>` + N `<text>` |
| **G-d** | Flow sequence diagram | Q4–Q8 | `flows[]` carries everything needed; nothing renders it |
| **G-e** | User-editable architecture rules | Q13 | One hardcoded policy string ([Coldbox.bx:140](../../../app/config/Coldbox.bx)) |
| **G-i** | Keyboard / screen-reader access to the canvas | accessibility | SVG shapes with click handlers only |
| **G-j** | Persisted run-level stage health | Q14 | No stage records whether it degraded |

### G13 — CodeGraph's extraction is a strict subset of Modernize's · **Severity 1 · RV**

Not an HTTP-specific bug. The two subsystems parse the same files in the same
languages, and CodeGraph sees materially less.

Dependency kinds emitted, counted from source:

| Producer | Kinds emitted |
|---|---|
| `BoxLangParserService` | `table-query`, `schedule`, `routes`, `renders`, `http` (+ `calls`, `extends`, `imports`, `constructs` elsewhere) |
| `CfmlParserService` | `table-query`, `schedule`, `http` — **no `routes`, no `renders`** |
| `JavaScriptParserService` | `imports`, `calls-api`, `calls` |
| **`ModernizationInventoryService`** | **≥19 kinds**: `extends`, **`implements`**, `include`, `component-construction`, `http`, `schedule`, `filesystem`, `java`, `datasource`, `query`, `sql-type-hint`, `sql-proc-call`, `table-query`, `column-query`, `sql-parameter-mismatch`, `scope.*`, `security-session-gate` |

Two proofs that this is systemic, not incidental:

1. **`implements`** — §6 G1 previously claimed this kind has no producer. It has
   one, at
   [ModernizationInventoryService.bx:88](../../../app/models/services/ModernizationInventoryService.bx),
   in the wrong subsystem.
2. **Outbound HTTP** — CodeGraph's detector
   ([BoxLangParserService.bx:668](../../../app/models/services/BoxLangParserService.bx),
   [CfmlParserService.bx:643](../../../app/models/services/CfmlParserService.bx))
   fires only for a function literally named `http`/`httpService` **with a quoted
   literal URL as its first argument**. Modernize's
   ([ModernizationInventoryService.bx:171](../../../app/models/services/ModernizationInventoryService.bx))
   catches `cfhttp`, `httpRequest`, `httpClient`, `new Http(` **and `fetch(`**.
   Grep confirms **no file under `app/` uses `bx:http` or `cfhttp`**, so
   CodeGraph's pattern cannot fire on this codebase — hence 0 rows *(RV)* in an
   application whose purpose includes calling LLM providers.

Modernize's `fetch(` detection is precisely the JavaScript→backend link **G2**
says CodeGraph lacks. The capability is already in the repository and the graph
product does not use it.

**Fix:** extract one shared detector library, seeded from Modernize's patterns,
consumed by both. Record the *target system* (host / provider / `unknown`) so
`external-system` becomes a real entity per §7. This is the
parallel-implementation-path problem AGENTS.md warns about, and it needs no
external research — the stronger implementation is in the tree.

### G14 — ColdFusion is structurally second-class in CodeGraph · **Severity 1 · RV**

`CfmlParserService` emits **three** dependency kinds and has **no `routes` and no
`renders` detector at all** — grep for both in that file returns nothing, while
`BoxLangParserService` has them at `:227`, `:232`, `:402`, `:409`.

Consequence for a ColdFusion project — a headline supported language: **Q6
(route → handler) is unanswerable, and view rendering is invisible.** The
comprehension promise degrades by language in a way no document states **(OD)**.
This is also why the Cold-Read Protocol (§2a) must run against a non-BoxLang
project; self-analysis on this repo cannot surface it.

### G15 — the `integration` role is unreachable · **RV**

Measured role distribution across 405 file nodes, run `14311ae6`:

```
101 test · 98 orchestrator · 76 persistence · 65 entry · 25 domain
 20 unknown · 8 view · 7 client · 5 shared · 0 integration
```

**Zero files carry `integration`.** Two independent causes: `http` and `schedule`
produce no rows (G1b), and `assignRole`
([CodeGraphMetricsService.bx:463](../../../app/models/services/CodeGraphMetricsService.bx))
tests `clientAsset` **before** `integration`, so the JavaScript files that carry
`calls-api` evidence are classified `client` first and can never reach the
`integration` branch. The role exists in the taxonomy and the legend and can never
be assigned.

*(This corrects an earlier inference in this document that `calls-api`'s 49 rows
would yield some integration roles. It yields none.)*

Note that `orchestrator` at 98 files is **not** evidence against D10: D10 says the
*evidence* branch is dead, and these 98 were assigned by the `isOrchestratorPath`
filename/fan-out fallback — exactly the degradation D10 describes.

---

## 7. Canonical entity and relationship model

**PR.** The ontology the graph needs. Additive to `codegraph_nodes` / `codegraph_edges`.

### Entity kinds

```
project → revision → run
  cluster (domain)          derived, labelable, stable key ≠ membership hash
  directory                 hierarchical, parent chain           [D27]
  file
    class | interface | component
      function | method | property
      handler-action | lifecycle-hook
  route / endpoint          exists as symbol kind today
  scheduled-job | event                                          [G1]
  view / template
  js-event | js-fetch-call                                       [G2]
  query | table | column                                         [G3]
  config-key                                                     [G6]
  external-system
  test | test-suite | fixture
  architecture-rule                                              [G-e]
  domain | process | risk | glossary-term    ← Knowledge layer only
```

### Relationship kinds

Split by what can be proven:

| Class | Relations |
|---|---|
| **Exact** (parser-proven, `file:line`) | `defines`, `declares`, `extends`, `implements`, `routes-to`, `renders`, `includes`, `imports` |
| **Heuristic** (name/type resolution) | `calls`, `injects`, `constructs`, `type-reference`, `calls-api`, `reads-table`, `writes-table`, `reads-config`, `tests` |
| **Unresolved** (occurrence recorded, target unknown) | any of the above whose target did not resolve — **38,646 today** *(RV)* |
| **Impossible to prove statically** | dynamic component construction, reflection, runtime wiring, dynamic SQL — **NS**, and must be reported as such |

### Required attributes on every entity and edge

`id` (stable, position-independent) · `kind` · `parentId` · `path` · `line` /
`endLine` · `evidence` (source excerpt) · `resolution` (exact | heuristic |
unresolved) · `confidence` · `provenance` (parser | ast | derived | llm) ·
`runId`.

**Identity rule.** Ids must be derived from semantic coordinates (path + kind +
name + disambiguator), never from array position or membership hashes — the BD-4
failure generalised.

---

## 8. Cross-language and cross-layer flow contract

**PR.** The chain the product promises, and where it currently breaks:

```
 js-event ──?──► js-fetch ──calls-api──► route ──routes-to──► handler.action
    [G2 missing]        [6 edges RV]      [45 edges RV]
      │
      ├──injects──► service ──injects──► repository ──table-query──► table
      │             [1,029 file / 945 symbol edges RV]   [214, no read/write split G3]
      │
      ├──renders──► view                     [18 edges RV]
      ├──emits───► event ──handles──► subscriber      [G1: kind never produced]
      └──returns──► response / side effect            [G4 missing]
```

**Deterministic substrate** (must be structural, no AI): call hierarchy, request
flow, cross-language frontend→backend linkage, table read/write lineage,
scheduler and event wiring, test→production linkage, config→consumer.

**Optional narrative** (LLM, cited): why a flow exists, what a domain means, what
a risk implies, glossary. Control-flow-sensitive claims, error-path reasoning and
authorization semantics are **NS** for the deterministic layer — a regex/AST
symbol index cannot prove them, and the product must say so rather than imply it.

---

## 9. Evidence, confidence and completeness contract

**PR.** Every graph response and every visible level reports:

```json
{ "available": 0, "returned": 0, "omitted": 0,
  "unresolved": 0, "unsupported": 0, "truncated": false,
  "rankedBy": "", "state": "complete|empty|missing|partial|stale|failed" }
```

Distinct states, each with its own UI treatment:

| State | Meaning | Today |
|---|---|---|
| complete | everything available was returned | conflated with `empty` (D3) |
| empty | complete graph, no match for this query | conflated with `missing` (D2, D3) |
| missing | no graph rows for this run | 409 on `/graph`, silent `[]` on `/search` (D1, D2) |
| partial | indexing incomplete | not represented |
| parser-fallback | regex fallback used for a file | recorded in `parseStrategy`, never surfaced |
| truncated | cap applied — storage, query, or view | partial (D4, D6, D8, D12) |
| heuristic | edge resolved by name, not proof | not represented (G9) |
| unsupported | dynamic behaviour, not statically provable | not represented (G8) |
| stale / failed | snapshot older than parser, or write failed | not represented (D18, G-j) |

**Rule:** never claim complete understanding of behaviour static analysis cannot
prove. An unresolved reference is a first-class result, not an omission.

---

## 10. Required query and API contracts

**PR.** On the existing `/api/v1/runs/:id/codegraph/*` surface; every response
carries §9's completeness block.

| Query | Endpoint | Status |
|---|---|---|
| Definition of a symbol | `/graph?level=symbol&scope=` | exists, thin |
| References to a symbol | `/references?symbol=` | **missing (G5)** |
| Callers / callees | `/callers`, `/callees` | **missing** — `calls` symbol edges are zero (D5) |
| Incoming / outgoing deps | `/subgraph?focus=` | exists (D7 truncation flag broken) |
| Type hierarchy | `/hierarchy?symbol=` | **missing** — `extends`/`implements` absent (BD-2, G1) |
| Neighbourhood expansion | `/subgraph?depth=` | exists |
| Shortest / alternate paths | `/paths` | exists |
| End-to-end process trace | `/flows/:flowId` | partial — flows exist, no response terminal (G4) |
| Data lineage | `/lineage?table=` | **missing (G3)** |
| Change impact | `/impact?symbol=` | file-level only (G7) |
| Run-over-run diff | `/diff?base=` | **missing (G12)** |
| Faceted search | `/search?kind=&relation=&domain=&role=&resolution=` | substring only (D23) |

---

## 11. Required UI views and comprehension journeys

**PR.** Three journeys, mapped to §2's questions.

1. **Orient** (Q1–Q3) — "start here": ranked entry points, domain cards with
   file/symbol counts, a stated confidence line. *Needs G10, D12.*
2. **Trace** (Q4–Q8) — pick an entry point, follow it to its sink as a **sequence
   diagram** (G-d), each hop showing symbol, kind, evidence `file:line`, and
   resolution class. Unresolved hops render as explicit gaps.
3. **Assess** (Q9–Q15) — impact of a change, cycles and violations, what is
   unproven. *Needs G7, G8, G-e.*

Navigation principle: **never draw the whole repository.** Degree-of-interest
elision (E2) with expand-on-demand, ranked by structural centrality (E1), with the
focus neighbourhood always retained. Evidence inspector with `file:line` on every
selection. Dependency Structure Matrix (E4) as the second overview where node-link
density fails.

---

## 12. External research comparison

Concepts adopted; nothing copied wholesale. Local-only, desktop-only,
BoxLang/CFML/JS, no new runtime dependency.

| Source | Concept taken | Applied as |
|---|---|---|
| [Code Property Graph / Joern](https://coderpad.io/blog/development/code-property-graph-oriented-databases-source-code-analysis/) — AST+CFG+PDG unified, queryable | Edge kinds must distinguish structural / control-flow / data-flow, and the product must be explicit that only structural exists | §7 relation classes; G11 declared **NS** for now rather than implied |
| [Kythe schema](https://kythe.io/docs/schema/) — anchors, VNames, `defines/binding` vs `ref` | Separate the semantic node from the occurrence; stable semantic identity | **G5**, §7 identity rule |
| [SCIP](https://sourcegraph.com/blog/announcing-scip) | Stable cross-tool symbol identity; export format | §7 ids; E6 export-only |
| LSP / LSIF | Definition, references, hierarchy as the minimum navigation set | §10 query contract |
| [CodeQL data flow](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/) — local vs global; virtual dispatch | Local (within-file) resolution is affordable; global is not. Be explicit about dispatch we cannot resolve | §8 substrate split; G8 unsupported reporting |
| [Tree-sitter](https://github.com/tree-sitter/tree-sitter) | Reuse unchanged subtrees | E5 incremental projection |
| [Aider repo map](https://deepwiki.com/Aider-AI/aider/4.1-repository-mapping-system) | Personalised PageRank over the def/ref graph, budget filled in rank order | E1 ranking |
| [van Ham & Perer, TVCG 2009](https://dl.acm.org/doi/10.1109/TVCG.2009.108) | Degree-of-interest: search, show context, expand on demand | E2 canvas |
| [Fitness functions](https://platformtoolsmith.com/blog/operationalizing-adrs-fitness-functions/) | 3–5 rules on critical boundaries | E3, replacing D29 |
| [DSM](https://www.jetbrains.com/help/idea/dsm-analysis.html) | Matrix scales where node-link does not | E4 |
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) · [codescope-mcp](https://github.com/abdulmunimjemal/codescope-mcp) | Expose the graph to agents; query instead of re-scan | E7, gated on Phases 1–3 |
| [Data Navigator](https://arxiv.org/pdf/2308.08475) | Keyboard traversal of node-link data | E8 |

---

## 13. Implementation phases

Dependency-ordered. Only Phases 2 and 4 touch the schema.

| Ph | Work | Gaps / defects | Schema | Size |
|---|---|---|---|---|
| **1** | **Graph contains the code** — BIF/matcher allowlist, unresolved policy, neuter cap ordering, report starved kinds | BD-1, BD-2, G8 (counts) | — | 2 d · **partly shipped, see §18** |
| **2** | **Warm path tells the truth** — copy rows on adopt, `hasGraph` on search, state enum, stage health | D1, D2, D3, D9, D18, D30, G-j | `stage_health_json` | 1.5 d |
| **3** | **Counts are real** — edge completeness, dotted-leaf symbol match, real denominators, view-level counts | D4, D5, D6, D8, D12, D25 | — | 2 d |
| **4** | **Ontology + evidence** — resolution/confidence/provenance columns, defines vs references, directory chain | G5, G9, D27, BD-4 | node/edge columns, `codegraph_labels` key | 3 d |
| **5** | **Missing producers** — shared detector library (G13), CFML `routes`/`renders` parity (G14), `implements`, read/write split, config keys, scheduler/event wiring, test→symbol, symbol-level impact | G1a–c, G3, G6, G7, G13, G14, G15, Q11, Q17 | — | 6 d |
| **6** | **Roles, consistency, contract hygiene** | D10, D19, D20, D7, D11, D13–D17, D21–D24, D26, D28, D29 | — | 2.5 d |
| **7** | **Ranking + explainability** — centrality for retention, `hotspotScore` for display, per-node rationale | E1, E9, BD-3, G-f | node columns | 2.5 d |
| **8** | **Navigation** — DOI canvas, symbol level drawn, keyboard/ARIA | E2, E8, G-a, G-i | — | 4 d |
| **9** | **Comprehension views** — sequence diagram, real SVG, HTML export, onboarding view | G-d, G-c, G10 | — | 3 d |
| **10** | **Query surface** — references, callers/callees, hierarchy, lineage, run-over-run diff, faceted search | G12, §10 | — | 3 d |
| **11** | Optional — MCP (E7), DSM (E4), fitness rules (E3), incremental (E5), SCIP (E6), diff (G12) | — | — | — |

**Phase 1 is the recommended first phase** and is non-negotiable as a
prerequisite: every later fix operates on the edge set it produces. Fixing D5's
symbol matching against 37,513 rows of `len()` is work spent on data that should
not exist, and `constructs` / `extends` stay missing however correct the rest
becomes.

**Fingerprint movers:** BD-1 (Ph 1), D10 (Ph 6), E1 (Ph 7). Each needs a
`snapshotVersion` + reuse-key bump and a corpus determinism re-run. **D11 does not
move the fingerprint** — sort is stable.

**Gating:** Phase 8 not before Phase 3 (DOI over a missing edge set looks broken).
Phase 11 MCP not before Phase 3 (an agent cannot distinguish an empty graph from
an empty result, and BD-2 would have it assert that classes have no superclasses).

---

## 14. Performance and determinism benchmarks

| Metric | Current | Target |
|---|---|---|
| Dependency rows, this repo | 41,513 *(RV)* | ~4,000 after Phase 1 |
| Full run duration | ~2m36s *(RV)* | ≤ 2 min after Phase 1; ≤ 30 s incremental after E5 |
| Warm reuse time-to-map | ≤ 2 s target, **unverified** | ≤ 2 s, with rows present (D1) |
| Level query p95, 300k edges | **never measured** | < 150 ms |
| Search p95, 80k nodes | unmeasured; `LIKE '%…%'` full scan (D23) | < 150 ms, FTS5 if needed |
| Fingerprint stability | corpus asserts 2 runs, same process *(TV)* | + reversed file order (INV-1) + second machine |
| Layout determinism | **no spec exists** (D26) | byte-identical, locale-independent |

---

## 15. Traceability

Every gap maps to a phase and an acceptance test.

| Gap/defect | Phase | Acceptance test |
|---|---|---|
| BD-1 | 1 | `review_dependencies` ≈ 4,000; no loaded `calls` target in the BIF allowlist |
| BD-2 | 1 | `constructs` and `extends` present in `codegraph_edges` (today 0); any fully-starved kind is named in the response |
| D1 | 2 | Clean-tree run, then re-run: second run id has `codegraph_nodes` > 0 |
| D2, D3 | 2 | `/search` on a rowless run → 409, not `matches: []`; `complete:false` when `available==0` |
| D5 | 3 | `codegraph_edges` symbol/`calls` > 0 (today exactly 0) |
| D25 | 3 | `maxNodes` below node count → flow list still contains a `route:` entry |
| D27 | 4 | `/graph?level=directory&scope=dir:app` returns child directories |
| G5, G9 | 4 | Every edge carries `resolution` ∈ {exact, heuristic, unresolved} |
| G1a–c, G3, G6 | 5 | Non-zero `implements`, `reads-table`/`writes-table`, `reads-config` |
| G13 | 5 | One shared detector library; `http` rows > 0 on this repo (today 0); CodeGraph kind coverage ≥ Modernize's for the same file |
| G14 | 5 | A CFML fixture project yields non-zero `routes` and `renders` (today 0 by construction) |
| G15 | 5 | `integration` role assigned to > 0 files (today 0); `assignRole` precedence lets a JS API client be both client and integration, or the role is removed from the taxonomy |
| Q16 | 7 | Inspector shows per-node rank rationale; a reader names the top components unaided |
| Q17 | 5 | Cold-read reader lists the external systems with evidence |
| Target experience | 3, 5, 9, 10 | **Cold-Read Protocol (§2a) meets the score bar for that phase, on two projects** |
| G8 | 1, 4 | Unresolved count surfaced per level and per flow hop |
| D10 | 6 | `orchestrator` appears in `roleCounts`; `unknown` rate re-measured |
| D26 | 6 | Byte-identical layout under a non-English locale |
| E1, E9 | 7 | Determinism gate green; per-node rationale rendered |
| G-a, G-i | 8 | Symbol level drawn; every node keyboard-reachable and announced |
| G-d, G10 | 9 | Sequence diagram matches `flows[]`; onboarding view ranks entry points |
| G7, G12 | 10 | Symbol-level impact; run-over-run diff |

---

## 16. Limitations and non-goals

**Cannot be proven statically — must be reported as unsupported, never omitted:**
dynamic component construction, reflection, runtime wiring, dynamic SQL,
runtime dispatch to alternate implementations, values from the environment.

**Explicitly not built:** control-flow and program-dependence graphs (CPG-grade
analysis) — **NS** at this scope; whole-program global data flow; authorization
semantics; anything requiring execution.

**Product boundaries restated:** no SaaS, no accounts, no hosted PR bot, no mobile
layouts, no additional languages, no Google Fonts in exports, no new runtime
dependency.

**The honesty rule that governs all of it:** the graph may be incomplete, but it
must never be *silently* incomplete. Today 38,646 unresolved references and six
entirely-absent relation kinds are invisible to the user. That, not the absence
itself, is the defect.

---

## 17. Verification performed in this pass

**Done.** Re-validated 15 load-bearing `file:line` claims against the working tree
(one drifted: `appendSyntheticNodes` :718 → :720). Queried the live database for
symbol kinds, dependency composition, resolution rates, projected node/edge
counts, run durations, and the cap-ordering replay. Ran BoxLang runtime probes for
string escaping, sort stability, struct iteration order, and the D10 scope
mechanism. Confirmed the reuse early-return path by reading
`ReviewRunService.bx:416`–`:462`. `git diff --check` run.

**Added in the closing pass.** Queried the role distribution across all 405 file
nodes — **`integration` = 0**, correcting an earlier inference in this document
that `calls-api` would yield some. Enumerated the dependency kinds emitted by all
three CodeGraph parsers and by `ModernizationInventoryService`, which produced
G13, G14 and the G1a/G1b/G1c split. Confirmed by grep that no file under `app/`
uses `bx:http` or `cfhttp`, so CodeGraph's HTTP detector cannot fire here.
Confirmed `CfmlParserService` contains no `routes` or `renders` detector.

**Not done, and not claimed.** No test suite run this pass — the 675/0/0 baseline
is carried forward unverified. No server restart or compiled-class clean; no HTTP
endpoint was exercised. **D1 was not reproduced** — it needs a clean worktree,
which was preserved as instructed. N1 latency was not measured. BD-1's 96% noise
ratio is measured for BoxLang and **not** separately measured per language;
G13's kind-coverage comparison is by detector enumeration, not by row counts per
parser. No CFML or JavaScript fixture project was analysed, so G14's user-visible
consequence is derived from the absent detector rather than observed on a
ColdFusion codebase — the Cold-Read Protocol's second project is what would
confirm it.

**`git diff --check`** reports one trailing-whitespace line in
`codegraph-domain-lens-design.md:4` — a deliberate Markdown hard break preserved
from the original text, not new damage.

---

## 18. Phase 1 — what shipped (2026-08-16)

**Status: partly complete. Merged and green; the row-count target is not met yet.**

### Delivered

| Change | File | Effect |
|---|---|---|
| Shared call-target filter, built-ins read from the runtime's own `getFunctionList()` (636 names) rather than a copied list | **new** `app/models/services/CallTargetFilter.bx` | One implementation of a concept the three parsers each had a weaker copy of (D19's lesson) |
| Filter wired into all three parsers; local `ignored` lists removed | `BoxLangParserService.bx`, `CfmlParserService.bx`, `JavaScriptParserService.bx` | **51.4% of `calls` rows eliminated** — 39,165 → 19,025 *(RV, measured against the stored target distribution)* |
| Parser versions bumped `v4→v5`, `v4→v5`, `v3→v4` | same three | Forces re-index; old snapshots cannot be reused silently |
| Stale hardcoded fallback reuse key corrected | `CodeGraphRunService.bx:701` | Was pinned to the old parser versions — would have reused pre-filter snapshots whenever the signature lookup fell through. **Found by the test suite, not by inspection** |
| `calls` demoted below the unnamed structural kinds in the cap ordering | `AnalysisGraphRepository.bx` | `constructs`, `extends`, `type-reference`, `imports`, `includes`, `tests` can reach the graph |
| Starved-kind detection + `dependencyKindStarved` truncation reason + `completeness.dependencies.starvedKinds` | `AnalysisGraphRepository.bx` | A kind removed *in full* by the cap is now named in the response instead of vanishing into a sort order |
| 10 specs covering built-ins, matchers, keywords, dotted targets, JS globals, and per-language behaviour | **new** `tests/specs/unit/CallTargetFilterSpec.bx` | — |

**Verification:** `box run-script compile` 173/173; server restarted twice with a
changed PID; `box testbox run` → **685 passed, 0 failed, 0 errored, 1 skipped**
(baseline 675, +10 new specs). Filter effect measured by replaying the stored
`calls` distribution through the shipped filter.

### Verified end to end on a fresh run

Run `bb8bbe46`, indexed 2026-08-16 after all Phase 1 changes:

| Acceptance criterion | Before | After |
|---|---|---|
| `review_dependencies` rows | 41,513 | **21,380** |
| Graph-eligible dependencies (`completeness.available`) | — | **4,016** — matches the ~4,000 target |
| `completeness.omitted` / `starvedKinds` | cap bound, kinds starved | **0** / **`[]`** |
| `completeness.unresolved` | not reported | **17,364**, reported not deleted |
| `constructs` edges | **0** | **309** file + 8 symbol |
| `tests` edges | **0** | **191** |
| `type-reference` edges | **0** | **8** file + 3 symbol |
| `extends` edges | **0** | **1** |
| `symbol / calls` edges | **0** | **35** |
| file / calls edges | 308 | 584 |
| Total projected edges | ~1,061 | **~1,940** |
| Full run duration | ~2m36s | **~75s** |

The last three parser-level fixes that got it there, beyond the filter already
described: **literal and comment masking** (`CfmlSourceScanner.maskLiterals`, with
interpolation preserved because `"##count( x )##"` holds a real call), and
**excluding unresolved `calls` from the load** rather than from storage — the rows
stay queryable, so `unresolved` is an exact count rather than an estimate.

`extends` at 1 is not a bug in this change: `CfmlParserService` has no `extends`
detector and most BoxLang classes here declare no superclass. G13/G14 cover it.

### Still open from Phase 1

Nothing. BD-1 and BD-2 are complete and measured. The remaining low-yield item —
`scope.Application` and `scope.application` being two kinds — is folded into
Phase 4's ontology work.

### Node counts after the fix

symbol 5,135 · file 407 · cluster 42 · directory 40 (was 5,108 / 405 / 31 / 40).
More clusters because the added structural edges change the clustering input.

---

## 19. Phases 2–3 — measured outcome (2026-08-16)

Run `eaccb7ec`, indexed after all Phase 1–3 changes.

| Metric | Original | After Ph 1 | After Ph 3 |
|---|---|---|---|
| **symbol / calls** edges | **0** | 35 | **1,499** |
| symbol / constructs | 0 | 8 | **787** |
| symbol / type-reference | 0 | 3 | 11 |
| symbol / extends | 0 | 0 | 1 |
| file / constructs | 0 | 309 | 309 |
| file / tests | 0 | 191 | 191 |
| **Total projected edges** | **~1,061** | ~1,940 | **4,189** |
| Dependency rows | 41,513 | 21,380 | 21,380 |
| Graph-eligible | — | 4,016 | 4,016 |
| Run duration | ~2m36s | ~75s | ~95s |

D5 was the single highest-yield change in the plan, as predicted — but only
because Phase 1 cleared the noise first. Against the original 39,165-row `calls`
set the dotted-leaf match would have been resolving mostly `len` and `expect`.

Stage health is persisted and verified:
`{"projection":{"ok":true,"nodes":5628,"edges":4189},"narrative":{"used":true,"ok":true}}`.

**Comprehension impact.** Q9 moves to answerable. Q1/Q2 improve (clusters ranked
by size rather than id). Q11 becomes possible — `tests` edges reach the graph for
the first time — though the test→symbol link itself is Phase 5.

---

## 20. Phases 4–5 — measured outcome (2026-08-16)

Run `1276c96b`.

| Capability | Before | After |
|---|---|---|
| `http` dependency rows | **0** | **7**, host-identified (`api.anthropic.com`, `api.example.com`) |
| `filesystem` / `java` / `schedule` rows | 0 / 0 / 0 | 4 / 2 / 2 |
| Files with role `integration` | **0** | **6** |
| Directories with a parent | **0 of 40** | **58 of 62** |
| Edge resolution classes | none | exact/high 26 · heuristic/medium 1,977 · heuristic/low 2,096 · derived 120 |
| Total projected edges | 1,061 (orig) | **4,219** |

`IntegrationDetector` is now the single owner of "what does this reach outside
itself", used by both parsers. Its patterns are seeded from
`ModernizationInventoryService`, which had the stronger implementation all along —
the fix was consolidation, not invention.

### Phase 5 remainder

`emits`/`handles` producers (G1a), SQL read/write split (G3), configuration as an
entity (G6), symbol-level change impact (G7), test→production symbol linkage
(Q11), and defines-vs-references anchors (G5) are still open.

---

## 21. Phase 6 — measured outcome (2026-08-16)

| Fix | Evidence |
|---|---|
| D10 orchestrator branch | Roles on a fresh run: entry 144 · orchestrator 98 · persistence 73 · test 27 · domain 26 · unknown 20 · view 8 · client 7 · **integration 6** · shared 5 |
| D7 truncation | A neighbourhood that fits now reports `truncated: false`; the spec that asserted the old always-true behaviour was rewritten to cover both cases |
| D13/D14/D15 | `codegraphMaxNodes` injected; `include`/`rank` rejected with 422; unknown `scope` returns 404; `edgeLimit` reachable |
| D17 | Both `"\\"` sites corrected — zero occurrences remain in the tree |
| D26 | 7 bare `localeCompare` calls → 0; new byte-identical layout determinism spec (JS suite 26/26) |

Graph totals on run with all phases applied: **5,684 nodes, 4,217 edges**.

### A spec that encoded a defect

`CodeGraphApiSpec` asserted `subgraph.truncated == true` for a neighbourhood that
comfortably fits inside its limit. That assertion only held because the flag was
unconditionally true. Fixing D7 turned the spec red, which is the correct outcome:
it was testing the bug. It now asserts `false` for a fitting neighbourhood and
`true` for a genuinely capped one.

---

## 22. Phases 5–7 — measured outcome (2026-08-16)

| Capability | Before | After |
|---|---|---|
| Data access kinds | 223 undifferentiated `table-query` | **137 `table-write` · 87 `table-read`** · 2 ambiguous |
| Node retention metric | `hotspotScore` (structure × churn) | structural centrality; `hotspotScore` display-only |
| Rank explainability | one formula per snapshot | per-node rationale, e.g. "12 callers · 3 commits · in a cycle" |
| Narrative rejections | discarded silently | counted per section |
| Total graph | 1,061 edges | **4,226 edges · 5,694 nodes** |

### The cache lesson, a third time

The read/write split shipped, compiled, passed its unit spec — and produced almost
no reclassified rows on a real run. Cause: extraction behaviour changed without a
`parserVersion` bump, so the parse cache served the old results. The only files
that reclassified were the ones whose content happened to change.

This is the same failure the fidelity design recorded at its §8.3 and that D1
repeated. **The rule, restated once more: any change to what a parser extracts
must move `parserVersion`, or the cache will hide it.** Parsers are now at
`boxlang-ast-parser-v6` / `cfml-symbol-parser-v6` / `javascript-symbol-parser-v4`.

### An architecture rule caught a real problem

`CodeGraphMetricsService` crossed the project's own 900-line ceiling when
centrality landed. Rather than raise the limit, the ranking concerns —
`centrality`, `hotspotScore`, `hotspotFormula`, `rankRationale` — moved into
`CodeGraphCentralityService`. That is the BD-3 split expressed structurally: one
service now owns "how important is this", and the metrics service owns assembly.

---

## 23. Phase 10 — the query surface (2026-08-16)

Four endpoints, each answering a question that previously required downloading a
level and filtering it in the browser. All carry the §9 completeness account.

| Endpoint | Question | Notes |
|---|---|---|
| `/codegraph/neighbours?node=&direction=` | "what calls this, and what does it call" | Both directions from the indexed edge table; far endpoint's path joined in |
| `/codegraph/hierarchy?node=` | "what does this extend or implement" | Kept separate so inheritance is not buried under call edges |
| `/codegraph/lineage?table=` | "who reads this table, who writes it" | **Only expressible because G3 split reads from writes** |
| `/codegraph/impact?node=&depth=` | "what breaks if I change this" | Transitive callers, depth-bounded; `state` says whether the cone closed or was cut |

A shared `requireGraphRun` guard returns 404 for an unknown run and 409 for a run
without levelled storage, so all four refuse the same way rather than repeating
two checks four times.

Verified live against run `690cd62c`: `/neighbours` on `file:app/config/router.bx`
returns `routes` edges to each handler with `resolution: "exact"`,
`confidence: "high"` and the source line as evidence.

### A spec bug worth recording

The first version of `CodeGraphQuerySurfaceSpec` seeded a graph inside a helper
that assigned to an outer `var`. In BoxLang that creates a local, so every test
queried run id `""` and five specs failed against correct code. Worth knowing
because the failure looks exactly like a broken query.

---

## 24. Phase 9 — comprehension views (2026-08-16)

| Export | Before | After |
|---|---|---|
| `format=svg` | one `<rect>` and N `<text>` lines — a bulleted list wearing SVG clothing | **13 `<rect>` boxes, 15 `<line>` dependencies, 27 labels** on a live run |
| `format=sequence` | did not exist | Participants as columns, hops as rows, kind and owning symbol per hop |
| `/codegraph/onboarding` | did not exist | Entry points · largest domains · most depended-upon files, each with a reason |

Both renderers are deterministic grids — three columns for the module map, one
column per participant for the flow — so neither needs a layout engine and
neither has to be kept in step with the canvas.

**Local-only is enforced by a spec**, not by intent: the export must reference no
webfont, no `@import`, no `xlink:href` and no external `href`. The first version
of that check also rejected `http://`, which fails on the mandatory SVG namespace
URI — a namespace identifier is not a fetch, and the spec now says so.

The sequence renderer prints `(file level)` for a hop whose owning symbol could
not be resolved, rather than guessing — the same rule the inspector follows.

### Onboarding, live

`/codegraph/onboarding?limit=3` on run `690cd62c` returns nine entries: handler
actions with `file:line` ("a request starts here (handler-action)"), the largest
modules by file count, and the most depended-upon files ("N files depend on this").

---

## 20. Standing caveats

Kept here rather than in a chat message, because an unverified claim that lives
outside the document is exactly the failure this plan is about.

**The Cold-Read Protocol has never been run.** The comprehension score of
**5 of 17** is an assessment derived from §2's capability matrix — from what the
graph now demonstrably contains — not from observing anyone try to answer the
questions. It is a hypothesis about comprehension, not a measurement of it.

An honest score additionally requires **a non-BoxLang project**. G13 (CodeGraph's
extraction being a strict subset of Modernize's) and G14 (CFML having no `routes`
or `renders` detector) were both invisible for as long as the tool was only ever
pointed at itself. Self-analysis flatters a code-graph tool, and this one has the
receipts to prove it.

**`ReviewExecuteRunSpec` is intermittently flaky under load.** Observed failing in
roughly one run in three of the full suite while every bundle-level result stayed
clean. Pre-existing and unrelated to this work — it was flaky before the Phase 1
changes — but it means a single red full-suite run is not automatically a
regression. Re-run before concluding one. Not investigated; not in scope here.

**Nothing is committed.** All work sits in the working tree. The user's staged
changes to `app/config/Coldbox.bx`, `app/models/services/GitRepositoryService.bx`
and `tests/specs/unit/GitRepositoryServiceSpec.bx` are untouched throughout.

---

## 21. D23 — attempted, backed out

**Not done. Reverted deliberately, not abandoned by accident.**

Search is `lower(path) LIKE '%term%'`, which no index can serve. The fix was to
mirror node rows into an FTS5 virtual table and narrow the scan to its hits.
Two things were established and are worth keeping:

- **FTS5 is available** in this SQLite build, and the **`trigram` tokenizer**
  works — verified by probe. Trigram is the only FTS5 mode that matches *inside*
  a token, which is the requirement for code search: `graphmet` must find
  `CodeGraphMetricsService`. The default tokenizer cannot do this and would have
  been the wrong choice.
- The narrowing has to keep the `LIKE` predicate as a correctness backstop so the
  index changes only how many rows are examined, never which rows match.

The implementation returned **500** on `/codegraph/search` and the cause was not
identified within a reasonable diagnostic budget. It was reverted rather than
left half-wired, because a dormant FTS table nothing reads is worse than no FTS
table: it silently drifts from the rows it claims to mirror.

**Why this is the right call for now.** D23 is a *scaling* defect. At this
repository's 5,600 nodes the scan is instant; the plan itself files it as "the
first thing N1 will fail on" at 80,000 nodes, on an estate nobody has pointed
this at yet. Shipping a correct scan beats shipping a fast one that 500s.

**Attempted twice, reverted twice.** The second attempt addressed both hypotheses
from the first — the FTS table was declared in `SchemaService` beside the other
DDL, and the `IN` list used a BoxLang list parameter so every binding stayed
named. It failed for a third reason: **the scripted edits could not reliably match
the SQL string containing `ESCAPE ''`**, so the predicate landed in neither
query while a conditional parameter landed in one. That combination compiles and
passes the suite only because the tests never exercise a term the index would
serve — which is its own warning about the coverage here.

**The real lesson is about the edit, not the design.** Both attempts were
defeated by tooling: a backslash in the target string. Anyone retrying should edit
this method by hand, or restructure it first so the SQL is built in a helper
without the `ESCAPE` clause inline. The design itself is sound and unchanged:
trigram FTS5 (verified available), narrow by index hits, keep `LIKE` as the
correctness backstop.

The plain B-tree index added alongside it — `idx_codegraph_nodes_search` on
`( run_id, level, symbol_name )` — **was kept**. It is harmless and helps the
symbol-name lookups that are not substring searches.

---

## 22. G6 shipped; G1a's `emits` half did not fire

**G6 — configuration as an entity. Done and measured.**
`IntegrationDetector` gained a `reads-config` pattern covering `getSystemSetting(`,
`getSetting(` and `coldbox:setting:` injections, and the name is captured from the
line's first quoted literal so the target is the setting itself. `config:` nodes
join `route:` and `table:` as first-class endpoints. Measured on a live run:
**27 rows**, naming `datasource`, `codegraphmaxedges`, `codegraphsubgraphmaxnodes`
and others. Q10 ("which configuration values influence each component") has a
substrate for the first time.

**G1a — `emits` is in the detector but produced 0 rows.**
The pattern `(?:\.publish\s*\(|announce\s*\(|emit\s*\()` should match this
codebase's own idiom (`eventService.publish(` at `CodeGraphRunService.bx:861`),
and it does when tested in isolation. It produced nothing on a live index, and the
cause was **not diagnosed**. Do not assume the pattern is wrong — the more likely
explanation is where `extractResourceDependencies` is called from, i.e. which
lines the parser routes through the detector at all. That is the first thing to
check.

`handles` — the subscriber half — is deliberately untouched. This codebase
resolves listeners at runtime, so the link is not statically provable and belongs
in the "impossible to prove" class of §7, reported as unsupported rather than
guessed at.

**Structural note.** Both this change and D29 tripped the repository's own
`holds no service above 900 lines` fitness rule. Rather than raise the threshold,
`CodeGraphMetricsService` gave up two cohesive units — layer-policy matching to
`ArchitectureRuleService`, and non-file entity construction to a new
`SyntheticNodeBuilder`. It is now 858 lines and each concept has one owner. The
fitness rule did its job twice in one session.

---

## 23. G1a: `emits` removed — and a wrong explanation corrected

**An earlier revision of this section blamed the parse cache. That was wrong, and
the correction is the point of this entry.**

The sequence: G6's `reads-config` produced 27 rows and G1a's `emits` produced
zero, from detectors added in the same edit. The `emits` pattern was verified
correct in isolation — 3 of 3 against this codebase's own `eventService.publish(`
idiom, in BoxLang's regex engine rather than by eye. The hypothesis was a stale
parse cache, since parses are keyed on `( contentHash, parserVersion )` and the
version had not been bumped.

**A full re-parse disproved it.** All three parser versions were bumped
(`boxlang-ast-parser-v6`, `cfml-symbol-parser-v6`,
`javascript-symbol-parser-v5`), every file was re-parsed, and the result was
unchanged: `reads-config` **still exactly 27**, `emits` **still absent**. So 27 is
the true count, not an undercount, and the cache was never the explanation.

The pattern includes `emit\s*\(`, which should match the many `emit(` calls in
`CodeGraphRunService` alone. No downstream kind filter was found in
`appendUniqueDependency`, `ArchitectureIndexService` or the inventory adapter.
**The real cause is still unknown.**

**`emits` has therefore been removed**, along with its `event:` synthetic-node
branch. A detector that never fires is precisely the defect this plan catalogues
twice already — D10's dead orchestrator branch and G15's unreachable
`integration` role. Shipping a third one, knowing it does not work, would be
worse than not shipping it.

`handles` remains unaddressed by design: this codebase resolves listeners at
runtime, so publisher → subscriber is not statically provable and belongs in the
"impossible to prove" class of §7.

**What the detour was worth.** The parser bump was correct on its own merits and
is kept. It also surfaced a **second stale hardcoded parser signature** — in
`CodeGraphReuseKeyService`, alongside the one already corrected in
`CodeGraphRunService`. Two literals that must track the live parser versions,
neither enforced by anything. A spec asserting they match now exists —
`tests/specs/unit/ParserVersionSignatureSpec.bx` — and was negative-tested by
reintroducing the stale literal and confirming it fails.

**Standing lesson.** The isolation test proved the regex, and the regex was never
the question. Proving a component in isolation says nothing about whether it is
reached — and "it must be the cache" was a plausible story that survived exactly
until it was measured.

---

## 24. E7 exposed — and a spec that could not be made to work

`CodeGraphMcpDescriptor` had been written and **nothing referenced it**: no route,
no handler, no caller. A contract that cannot be fetched is a design note, not a
capability. `/api/v1/runs/:id/codegraph/mcp` now serves it — the eight tools
(`codegraph_search`, `neighbours`, `hierarchy`, `lineage`, `impact`, `paths`,
`onboarding`, `source`) together with the contract those tools promise. Serving
the contract alone would have described guarantees for tools the caller could not
see.

The endpoint is gated on the run having levelled rows, which is the descriptor's
own stated precondition: an agent cannot distinguish an empty graph from an empty
result and would report that a symbol has no callers.

**Verified by curl against a real run; there is no automated spec.** Three
attempts to build one failed at the fixture: a synthetic run created directly
through `ReviewRunRepository` does not survive `runService.getScoped` in this
endpoint's path, returning 404 where the sibling `/codegraph/graph` spec with an
apparently identical fixture returns its expected status. The cause was not
identified, and the spec was removed rather than left erroring.

**This is the weakest link in the session's work.** Everything else that landed
has a passing test; this has a manual check and a note. Anyone extending the MCP
surface should fix the fixture first — most likely by reusing the seeding that the
"predates levelled storage" spec performs, rather than creating the run row
directly.

### Also found already built while verifying

`toCodeGraphMatrix` (E4, DSM), `scipSymbol` (E6, SCIP export), `degreeOfInterest`
(E2), `/codegraph/diff` (G12), `/codegraph/rules` (E3 / G-e), the `implements`
detector (G1c), and the canvas keyboard/ARIA layer (G-i / E8). The register listed
all of these as outstanding.

**The ledger has now been stale in both directions.** It understated progress here
and overstated it earlier in the session. Verify a claim against the code before
planning work against it — that habit found four already-built capabilities and
one live defect (the diff endpoint's hardcoded `complete: true`) in a single pass.

---

## 25. A backspace byte, and two lessons about evidence

**The defect.** G6's detector was matching only one of its three alternatives.
The stored pattern was:

```
"(?:<0x08>getSystemSetting\s*\(|<0x08>getSetting\s*\(|coldbox:setting:)"
```

A literal **backspace character (0x08)** sat where `` was intended. A scripted
edit had written `` as the escape sequence rather than the two characters a
regex word boundary needs, so both function-call branches could never match and
only `coldbox:setting:` survived. Nothing failed; the detector simply saw less.

Repairing it took `reads-config` from **27 rows to 324** — the earlier number was
injected settings only. Q10 is now answered for both forms.

**Lesson one: a plausible number is not a passing test.** 27 rows looked like
success and was reported as such. The count could not distinguish "the detector
works" from "one third of the detector works", and no assertion existed at the
method level. `IntegrationDetectorSpec` now asserts each form independently, and
it is what found this.

**Lesson two: the standalone CLI probe cannot test application classes.** BoxLang
serves compiled classes from its runtime home, and clearing the obvious cache
directory did not stop it returning stale results — a probe reported `fileRead`
matching and `getSystemSetting` not, from a build that predated the edit. Several
probes in this session instantiated `app/` classes that way. **Those results are
unsound**, including the investigation behind G1a in §23; treat that entry as
"cause unknown" with one fewer supporting observation.

Probes that tested *language semantics only* — backslash literals, sort
stability, struct iteration order, regex-engine behaviour — instantiated nothing
from `app/` and are unaffected.

**The rule:** to test an application class, write a TestBox spec. It runs against
the same compiled state as the server. A CLI probe is for language questions.

---

## 26. G1a closed, and a new gap it exposed

**G1a is done.** `emits` produces **39 rows** naming real events —
`codegraph.completed`, `run.cancelled`, `onruncomplete`. The earlier zero was
never a bad pattern: it was a stale CLI probe (§25) compounded by a missing comma
that briefly broke the pattern array. Re-added only alongside
`IntegrationDetectorSpec` assertions, which is the difference between this attempt
and the one that shipped dead.

`handles` remains deliberately absent. Listeners resolve at runtime here, so
publisher → subscriber is not statically provable and belongs in §7's
"impossible to prove" class — reported as unsupported, never guessed.

### G16 — retracted. The claim was wrong.

**An earlier revision of this section reported that synthetic entities never reach
the levelled tables. That is false, and the error was mine.**

I queried `codegraph_nodes` for ids matching `route:%`, found zero, and published a
gap with a confident consequence — that an agent could find the file calling a
route but never the route itself. The projection prefixes every node id with
`file:`, so the correct predicate is `file:route:%`. Measured on the same run:

```
file:route:%   52      file:config:%  246
file:table:%   37      file:event:%    20
```

They are projected, queryable through `/codegraph/graph` and `/search`, and carry
their roles — a route node arrives as `kind=http-handlers, role=entry`. **Q4, Q7,
Q10 and Q17 are answerable from the query surface, not only from the snapshot.**

What survives is a modelling wart, not a gap: a route, table, setting and event
are all stored at `level: "file"` with a `file:` id prefix, because the projection
has one loop for everything in `snapshot.nodes`. A route is not a file. Giving
them their own level would be tidier and would let a caller ask for "every entry
point" without pattern-matching an id. Nothing is unreachable today.

**Fourth wrong claim caught by measurement in this session** — after the 3×
aggregation error in the baseline, the parse-cache theory, and the G6 row count
that looked plausible at 27. Every one was published confidently and every one was
found by checking rather than by review. The pattern is not carelessness about
evidence; it is that a query returning zero feels like a finding, when it is just
as often a wrong question.

---

## 27. Final state

Measured on the last full index of this session.

| | Session start | Now |
|---|---|---|
| `review_dependencies` rows | 41,513 | **22,186** |
| Projected edges | ~1,061 | **4,357** |
| `symbol / calls` edges | **0** | **1,543** |
| JS route attribution | **0 / 49** | **49 / 49** |
| `constructs` | 0 | 946 |
| `reads-config` | 0 | 324 |
| `tests` | 0 | 201 |
| `table-write` / `table-read` | 0 / 0 | 143 / 95 |
| `extends` | 0 | 127 |
| `emits` | 0 | 39 |
| `http` / `schedule` | 0 / 0 | 28 / 4 |
| Suite | 675 | **729 passing, 0 failing** |

Nine relationship kinds went from producing nothing to producing evidence. The
graph is smaller and says more.

### Still open

- **G-a** — the symbol level is fetched, listed and searchable, but not *drawn*.
  Real, unstarted canvas work.
- **D23** — search remains an unindexed scan. Reverted deliberately; §21 holds the
  reproduction path and the trigram finding.
- **E5** — **measured (§28) and re-scoped.** Parsing is the cost and is already
  cached; the projection writes the same 10,500 rows whether a run takes 60 s or
  160 s. Not worth building as specified.

### What to distrust in this document

Six items listed as outstanding turned out to be already built. One gap (G16) was
published and retracted. Four confident claims were overturned by measurement —
the 3× aggregation error in the baseline, the parse-cache theory, G6's plausible
27, and G16's wrong query prefix.

The register is a starting point, not a specification. **Check the code before
planning against any entry**, and prefer a TestBox spec over a CLI probe for
anything touching an application class (§25).

---

## 28. E5 — measured, and re-scoped

E5 proposed incremental projection: key projected rows by content hash and
re-project only changed files. **It was never measured, so it was never justified.**
Three consecutive full runs, same repository:

| run | wall time | projected rows |
|---|---|---|
| after a parser-version bump | **153 s** | 10,473 |
| after a parser-version bump | **160 s** | 10,494 |
| with the parse cache warm | **60 s** | 10,494 |

The projection writes the same ~10,500 rows in every one of them, while the wall
time varies by 100 seconds. **The cost is parsing, and parsing is already
incremental** — the `( contentHash, parserVersion )` cache is what separates the
60-second run from the 155-second ones. Re-projecting is a small share of a run
that is already fast when the cache is warm.

**Disposition: re-scoped, not scheduled.** Incremental *projection* addresses the
wrong half. If run duration becomes a problem, the measurement to take first is
the projection's actual share of the 60-second warm run — instrument it before
building anything, because the numbers above say the answer is probably "a few
seconds".

This is filed as done in the sense that matters: the question E5 asked has been
answered with evidence, and the answer is that the work it proposed is not worth
doing yet. That is a decision, not a deferral.

---

## 29. D23 landed on the third attempt

Two earlier attempts were reverted (§21). Both died the same way: scripted edits
could not match the SQL string containing `ESCAPE '\'`, leaving the predicate in
one query and the parameter in another. The third attempt changed **nothing about
the design** — it used an exact-match editor instead of pattern substitution.

Shipped: a `codegraph_node_search` FTS5 virtual table declared in `SchemaService`
beside the other DDL, mirrored during `replaceGraph`, with `search` narrowing to
its hits through a **list parameter** so every binding stays named.

Verified on a live run:

| | |
|---|---|
| rows mirrored | **6,140** |
| FTS hits for `graphmet` | **68** |
| `LIKE`-only count for the same term | **68** |
| API `available` | **68** |

The three agree, which is the property that matters: the index changes how many
rows the database examines, never which rows match. `graphmet` is deliberately a
mid-identifier term — it finds `CodeGraphMetricsService`, which the default FTS5
tokenizer cannot do and which is why trigram was the only viable choice.

`LIKE` is retained as the predicate. If the index is missing, stale, or FTS5 is
unavailable in a user's SQLite build, `searchIndexHits` returns null and the query
degrades to the original scan — slower, never wrong.

**The lesson is about tooling, not design.** Two reverts cost more than the
feature, and both were caused by the same unexamined assumption: that a scripted
replacement had applied because it reported success. It had not. Verify the file
after a scripted edit, or use an editor that fails loudly on a missed match.

---

## 30. G-a — the last item, and it was half-built too

The register said the symbol level was fetched and listed but never drawn. **A
`depth === "symbol"` canvas branch already existed.** What it did was render the
payload through `buildFileView`, which labels nodes by path and orders them by
path — inside a single file that means every box carries the same label and the
ordering is arbitrary. The level was drawn and unreadable.

`buildSymbolView` labels by symbol name, orders by source line so the drawing
follows the file, and carries `kind` as the layer label. Verified three ways: a
`node --test` spec, the full BoxLang suite, and executing it in the running
browser — `mode: "symbol"`, labels `["alpha","zeta"]` in line order, edges intact,
no console errors.

**Seven of the items this session were already built in some form.** G-a is the
seventh and the most instructive, because "already built" and "working" were
different things: the code path existed, ran, and produced an unusable picture.
A register entry can be wrong by being too pessimistic *and* the code can be wrong
while appearing complete. Neither is visible without looking at the output.
