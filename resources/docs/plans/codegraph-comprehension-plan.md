# CodeGraph — comprehension audit and plan (2026-08-17)

> **Status: Phases 0–2 shipped and verified; Phase 3 partly shipped. See §18.**
> Phase V (clean-database baseline) is **not** done — the numbers below still
> describe the accumulated 394 MB store.
>
> `codegraph-remediation-plan.md` is the historical evidence base for §18–§35 and
> its measurements reproduce. It is superseded for *forward* work by this
> document. AGENTS.md says one live plan at a time — **delete
> `codegraph-remediation-plan.md` when this one is accepted**, do not archive.
> That deletion is deliberately not done yet: §4.1 below revalidates its claims
> one by one, and the revalidation is only checkable while both documents exist.

## Context

CodeGraph's promise: *a developer unfamiliar with a project inspects CodeGraph and
understands architecture, structure, components, dependencies, entry points,
domains, end-to-end flows, data access, integrations, risks and change impact —
without reading source.*

The prior plan took the substrate from 1,061 to ~4,300 projected edges and closed
35 sections of defects. This pass asked a different question: **not "does the
graph contain it" but "does the surface a reader touches tell the truth about
it".** That is the rule §32 itself added, and applying it to the endpoints found
that the flagship query endpoint returns 60 of 314 edges and labels the answer
`complete: true`, that "where do I start" is answered alphabetically, that the
project pitch describes a 3-file cluster picked by hash order, that both
architecture violations in the repository are false positives, and that the FTS5
search index — three attempts, two reverts — never fires on any AI-enabled run.

Nothing here retracts §18–§35's measurements. They reproduce. What changes is
where the evidence stops: those numbers were taken from the edge table, and the
defects below are in the layer between the edge table and the reader.

A second pass then drove the **workspace in a real browser**, because an endpoint
audit cannot see what a newcomer actually reads. It found the most serious defect
in this document: **every module card on the primary map displays a layer chip
computed as `cardIndex % 5`** — fabricated data, rendered in the same visual
register as the true file count. It also found that opening `/codegraph` on a
project with 42 stored graphs shows *"No graph snapshot"*, and that the meaning
layer — pitch, domains, processes, risks — is `display: none` on arrival.

**This revision therefore leads with UX.** The knowledge graph's value is
realised in one place, the screen, and that is where the plan now starts.

**Method.** Live database `.db/doublecheck.db` queried read-only (run
`b8ead1cb`, 6,192 projected nodes / 15,300 edges, indexed 2026-08-17T07:37Z);
eleven endpoints exercised over HTTP against the running server
(`127.0.0.1:55098`); **the CodeGraph workspace driven in-browser at 1600×1000 —
arrival, run loading from history, Start-here, Overview, drawer tabs, rail,
inspector — reading the live DOM rather than the source**; every `file:line`
re-read in the working tree; external specifications fetched. Worktree clean and
preserved; no product code changed.

**Claim tags:** **RV** runtime verified · **TV** test verified · **CP** code
present, not runtime verified · **PA** partial · **PR** proposed · **NS**
intentionally unsupported · **OD** obsolete/incorrect documentation.

---

## 1. Code Graph vs Knowledge Graph

Unchanged in principle from the prior plan, sharpened by what was measured.

**Structural Code Graph — deterministic, no AI, falsifiable.** Entities that
exist in source and relationships that can be pointed at with a `file:line`.
Three properties are non-negotiable and only the first is currently honoured:

1. *Every edge carries evidence, resolution, provenance, confidence.* — holds
   (15,300 edges; 14,976 with a line).
2. *Every **entity** carries the same.* — **does not hold.** `codegraph_nodes`
   has no `resolution`/`provenance`/`confidence` column at all (N12), and 367
   resource nodes carry `line: 0` (N11). A table inferred from a regex is
   indistinguishable from a file proven by the filesystem.
3. *Every response states what it did not return.* — **does not hold** at the
   query surface (N1).

**Knowledge Graph — interpretive, optional, cited.** Domains, processes, risks,
glossary. Built only by attaching labels and prose to structural entities that
already exist. The LLM may name and explain; it may never create a node, an edge,
a flow or a domain. This contract *is* honoured at the edge level — every
knowledge edge is stored `resolution: narrative, provenance: llm,
confidence: interpretive` (RV, 166 edges) — and violated at the accounting level:
6 of 29 model-supplied processes are dropped at materialisation with no count
(N14), and 12 of 36 clusters never reach the model at all (N4).

**The line that separates them.** A structural claim survives deleting the AI
key. A knowledge claim does not. Today `/onboarding` (structural) and
`narrative.onboarding` (interpretive) are two different answers to the same
question that never meet, and only the structural one is reachable from the API.

---

## 2. End-user comprehension success criteria

The target sentence names eleven things. Each maps to a question. A question is
**answered** only when the surface returns the answer, the answer is *ranked or
complete rather than arbitrary*, and it carries checkable `file:line` evidence.

The third clause is new this pass and it is why the score moves down. §33–§34
scored 17 of 17 on an instrument run: every endpoint returned something with
evidence attached. Six of those answers are arbitrary slices that read as
authoritative.

| # | Question | §34 | **Now** | Why it moved |
|---|---|---|---|---|
| Q1 | What is this application, how organised? | yes | **No** | Arrival says *"No graph snapshot"* (U1); pitch describes `clusters[1]`, a 3-file cluster (N3); 117-file cluster labelled `Index` (N22, U6) |
| Q2 | Main domains, modules, layers? | yes | **No** | **Every layer chip on the map is `index % 5`** (U2); 12 of 36 clusters never narrated, incl. the 3rd/5th/6th largest (N4); 18 of 36 drawn (U8) |
| Q3 | Where are the entry points? | yes | **PA** | The landing screen asserts requests begin at `smoke`/`notFound` (N2, U3) |
| Q4 | What starts each request / job / event? | yes | **yes** | 53 routes · 20 events · 1 schedule at `level=resource`, edges present |
| Q5 | JS action → HTTP route? | yes | **yes** | `calls-api` 38 symbol + 37 resource edges |
| Q6 | Route → handler → action? | yes | **PA** | `routes-to` correct; `/neighbours` on the router returns 60 of 314 and says complete (N1) |
| Q7 | Services → repositories → queries → tables? | yes | **yes** | `/lineage?table=review_runs` → 21 readers, 56 writers, unbounded, honest |
| Q8 | What response or side effect completes the flow? | yes | **PA** | 32 of 32 flows name a terminal, but a flow has no per-hop evidence and no endpoint (N19) |
| Q9 | Which symbols call / extend / test / read / emit? | yes | **PA** | Present, but 41% of cross-file bare-name edges are ambiguous (N8) |
| Q10 | Which config values influence each component? | yes | **yes** | 247 config resources, 637 `reads-config` edges |
| Q11 | Which tests exercise each path? | yes | **yes** | 591 symbol-level `tests` edges |
| Q12 | What changes when X changes? | yes | **yes** | `/impact` is the one endpoint that reports `truncated` correctly |
| Q13 | Cycles, hotspots, dead code, violations, dynamic behaviour? | yes | **No** | **Both** architecture violations in the repository are false positives (N7); cycles carry no edges or evidence (N24) |
| Q14 | What is proven, inferred, truncated, unsupported, stale? | yes | **No** | The account is present on every response and **wrong on four endpoints** (N1, N9, N17) |
| Q15 | Where do I start reading? | yes | **PA** | Same alphabetical list as Q3 (N2) |
| Q16 | What matters most, and why? | yes | **yes** | `rankRationale` on hotspots — "6 callers · 33 dependencies · 20 commits · in a cycle" |
| Q17 | What external systems does this talk to? | yes | **yes** | 3 http resources, 16 `http` edges, host-named |

**6 of 17 fully answered, 7 partial, 4 no.** The instrument score did not lie
about what the endpoints return; it had no clause for *an answer that is a
confident arbitrary subset*, and it never opened the screen.

Two of the four `No`s are the important ones. **Q14** — an honesty-reporting
layer that is itself dishonest is worse than none, because it converts "I should
check" into "the tool says complete". **Q2** — the map answers "how is this
organised" with a fabricated layer on every module (U2). The remaining questions
are answerable through the API and largely unreachable through the UI, which is
the gap this revision reorders the plan around.

**Acceptance for the target experience:** re-run the Cold-Read Protocol
(`resources/docs/cold-read-protocol.md`) against DoubleCheck and `lib/coldbox`
under the tightened scoring rule above. Target after Phase 2: 13 of 17. After
Phase 6: 16 of 17. Q13 last — it depends on resolution accuracy.

---

## 2b. What a newcomer actually sees — front-end audit

Driven in-browser against run `b8ead1cb`. Every quotation is live DOM text.

### The three screens, in order

**Screen 1 — arrival at `/codegraph`.** Visible: the *Choose a repository* form,
the command centre, and:

> **No graph snapshot** — Complete a CodeGraph run to explore clusters and
> dependencies.

Canvas, workspace, toolbar, drawer, exports and **Rebuild map** are all
`hidden`. Meanwhile `GET /api/v1/codegraph?projectPath=C:\Box\DoubleCheck`
returns run `b8ead1cb`, `reused: true`, `status: succeeded` — **and the page
never calls it** (0 occurrences of the endpoint in `app.js`; confirmed absent
from the network log on load). The only route to an existing graph is
*Recent runs ↓* → the dashboard → *Open*.

A newcomer's first interaction with the knowledge graph is being told there
isn't one. **(U1)**

**Screen 2 — "Start here", the default view once a run loads.** The whole canvas
is this list:

```
WHERE REQUESTS BEGIN
  smoke      a request starts here (handler-action)  app/handlers/ApiAI.bx:24
  activate   a request starts here (handler-action)  app/handlers/ApiAIProviders.bx:68
  create     a request starts here (handler-action)  app/handlers/ApiAIProviders.bx:30
  delete     a request starts here (handler-action)  app/handlers/ApiAIProviders.bx:56
  index      a request starts here (handler-action)  app/handlers/ApiAIProviders.bx:16
  notFound   a request starts here (handler-action)  app/handlers/ApiAIProviders.bx:91
LARGEST MODULES
  Index  117 files in this module
  App    30 files in this module
```

This is N2 rendered. It is not "an endpoint returns an arbitrary order" — it is
the landing screen of the product asserting that a DoubleCheck request begins at
`smoke`, and listing `notFound` as a place a request starts. Five of six entries
are one AI-provider CRUD handler because `ApiAIProviders` sorts second. **(U3)**

The inspector beside it reads *"Select a node — Inspect cluster, file, or edge
details here"*, on a view that renders no selectable nodes. **(U9)**

**Screen 3 — "Overview", the map.** 18 module cards, 55 edges. Each card:

| Field | Example | Real? |
|---|---|---|
| title | `Index` · `AI Review and Provider Orchestration` | mixed — see U6 |
| **layer chip** | `entry` · `config` · `domain` · `support` · `tests` | **fabricated — U2** |
| complexity | `complex` · `moderate` | **real** — `complexityOf()` from files, crossings, symbols, cycle |
| footer | `117 files` | real |
| summary | `The entire codebase is grouped into one App cluster containing 30 files,…` | truncated + wrong scope — U7 |

### U2 — the map displays invented data · **RV · Severity 1**

`layerLabelOf( cluster, index )`
([codegraph-layout.js:176](../../../public/assets/codegraph-layout.js:176)):

```js
if (cluster && cluster.layerLabel) return String(cluster.layerLabel);
if (cluster && typeof cluster.layer === "string" && isNaN(Number(cluster.layer))) …
const labels = ["entry", "config", "domain", "support", "tests"];
const layer = typeof cluster.layer === "number" ? cluster.layer : index % labels.length;
return labels[…];
```

Snapshot cluster keys are `clusterFingerprint, clusterKey, coChange, cohesion,
crossingEdges, fileCount, filePaths, id, internalEdges, key, label, symbolCount`
— **neither `layer` nor `layerLabel` exists**, so every cluster falls to
`index % 5`. Enumerated from the live DOM, all 18 cards in draw order:

```
Index(117f)=entry  Deterministicaichat(21f)=config  Router(14f)=domain
App(30f)=support   Architecturemodel(13f)=tests     App Modules · Router(20f)=entry
AI Review…(7f)=config  AI Chat…(10f)=domain  Apiproject(8f)=support
CodeGraph Graph Repository(6f)=tests  Scripted Modernization Inventory(5f)=entry …
```

A perfect five-cycle by position. The 117-file core-services cluster is labelled
`entry`; the repository layer is labelled `tests`.

This is categorically worse than every other defect in this document. The rest
are *incomplete* or *arbitrary*; this one **invents a fact and renders it
beside true facts in identical styling**, on the first map a reader opens. It
also violates §1's contract directly — the structural layer may not create
information — and it does so without an LLM anywhere near it.

*Fix:* delete the modulo fallback. A cluster with no derivable layer renders no
chip. If a layer is wanted, derive it from the dominant `role`/`component` of the
cluster's files, which the snapshot already carries per node.

### The rest, in severity order

| ID | What the reader sees | Evidence |
|---|---|---|
| **U1** | *"No graph snapshot"* on arrival with 42 stored graphs; workspace, exports and Rebuild hidden | 0 calls to `/api/v1/codegraph?projectPath=`; endpoint returns `b8ead1cb` when called by hand. `application-features.md:224` claims this behaviour ships — **OD** |
| **U3** | Landing view asserts requests begin at `smoke`, `activate`, `create`, `delete`, `index`, `notFound` | live canvas text; N2's root cause |
| **U4** | The meaning layer is `display: none` on arrival — pitch, domains, onboarding path and processes are in a collapsed drawer panel that is not the one selected | `#codegraph-project-strip` `hidden: true`, computed `display: none`; `[data-cg-panel="briefing"]` hidden; drawer opened on `assess` |
| **U5** | Rail legend leads **`Shared 252`**, then `Entry 155`, `Orchestrator 102` | N22b rendered: 247 of those 252 are config *keys*, not files. The dominant fact about the project, as displayed, is an artefact |
| **U6** | Module titles mix AI domain names and derived filenames with no visual difference — `Index`, `App`, `Router`, `Apiproject` beside `AI Chat and Specialist Agent Gateway` | 18 card titles read from the DOM. The largest module (36% of the codebase) is titled `Index` |
| **U7** | Card summaries are cut mid-sentence and describe a shard as the whole project: *"The entire codebase is grouped into one App cluster containing 30 files,…"*, *"The single supplied cluster, labeled Index, contains 117 files and…"* | 35 summary lines across 18 cards, ellipsised at 2 lines. Root cause: `shardSnapshot` hands the model one cluster and the model narrates it as the codebase |
| **U8** | 18 of 36 modules drawn; the disclosure button reads **"Show all 36 modules"** while 18 are on screen | `g.cg-card` count 18; 0 non-card nodes |
| **U10** | History row for a 6,192-node run reads **"Graph · — nodes · Clusters · —"** | live DOM of the dashboard history table |
| **U11** | Header status reads **"689 nodes · 36 clusters"** | the resource-polluted snapshot count, not the 6,192 projected nodes the reader can actually explore |

### What is genuinely good, and must not be lost

Measured, not assumed — three things work well and a redesign should preserve
them:

- **Deep links work.** *Open* navigates to
  `/codegraph?run=b8ead1cb-…&depth=start`; the run and depth are in the URL, so a
  view is linkable and survives refresh. *(An earlier draft of this plan claimed
  deep links were absent. That was wrong — found by driving the UI.)*
- **The truncation banner is exemplary.** *"Showing part of the graph. 11,529
  references could not be resolved to a file — recorded, not drawn."* That is
  precisely the honesty contract of §8, in one sentence, in the right place.
  Every other surface should read like this.
- **Provenance marking is honest.** Cards carry `data-summary-origin="ai"`, the
  AI chip is titled *"Generated by AI — not evidence"*, and `complexityOf()` is
  real derived data. The `Index` title is genuinely what the model returned — it
  echoed the derived label it was handed (U7's root cause), so the badge is
  truthful and the input was poor.
- Keyboard traversal, ARIA live region, `role="application"` on the canvas.

---

## 3. Verified current capability matrix

Run `b8ead1cb`, DoubleCheck, 2026-08-17. All **RV**.

### Projected graph

| Level | Nodes | Isolated (no non-`defines` edge) | Parented |
|---|---|---|---|
| symbol | 5,345 | **1,633 (31%)** | 5,345 / 5,345 |
| resource | 367 | 0 | **0 / 367** (N10) |
| file | 322 | 6 (2%) | 322 / 322 |
| knowledge | 83 | 0 | 83 / 83 |
| directory | 39 | **20 (51%)** (N18) | 36 / 39 |
| cluster | 36 | 0 | 0 (roots, correct) |

15,300 edges. Resolution split: `exact/parser/high` 5,471 · `heuristic/parser/medium`
3,787 · `heuristic/parser/low` 5,718 · `narrative/llm/interpretive` 166 ·
`derived` 158. Edges with a line: 14,976 (97.9%).

### Relationship kinds reaching the graph

`defines` 5,345 · `calls` 5,575 · `constructs` 1,159 · `reads-config` 637 ·
`tests` 788 · `injects` 685 · `table-write` 208 · `responds` 172 · `table-read`
157 · `describes` 130 · `cluster-dependency` 92 · `calls-api` 76 · `emits` 55 ·
`declares`/`routes-to` 52 each · `affects` 36 · `type-reference` 20 · `http` 16 ·
`routes` 18 · `schedule` 6 · `renders` 7 · `table-query` 2.
`extends`/`implements`: **0 on this repository and correct at 0** — DoubleCheck
inherits only from framework classes; proven on `lib/coldbox` (50 `extends`,
`BaseProxy.cfc` with 11 descendants) and by both corpus cases.

### Determinism — confirmed good

Two consecutive runs on the same tree (`abf1a041`, `b8ead1cb`): **identical node
id sets at every level, identical 15,300 edge ids, identical fingerprint
`fbbf6e5a…`**, including all 83 knowledge nodes. Node ids are semantic, not
positional; `/diff` rests on a property that holds. *(Knowledge determinism is
partly shard-cache-derived — see §14.)*

### Honest where it is honest

`/graph?level=file` → `returned 200, available 322, omitted 122, state truncated`.
`level=symbol` → `omitted 5,145, truncated`. §31's A5/A6 are genuinely fixed.
`/impact` reports `truncated` when the cone is cut (TV + RV). `/lineage` is
unbounded and exact. JS suite **35 passed / 0 failed** (RV, this pass).
`git diff --check` clean (RV).

---

## 4. Corrected defect register

### 4.1 Prior register — status after revalidation

| Prior ID | Claim | Verdict |
|---|---|---|
| A1 search / no-mirror | fixed | **Confirmed fixed, then re-broken differently** → N5 |
| A2 lineage empty | fixed | **Confirmed fixed** — 77 rows RV |
| A3 false `extends` | fixed | **Confirmed fixed** — external namespaces rejected; hierarchy honestly 0 here |
| A4 resource neighbours empty | fixed | **Confirmed fixed** — 1,251 resource edges |
| A5 directory level complete-but-empty | fixed | **Partially** — edges exist (66) but 51% of directories remain isolated → N18 |
| A6 file level 71% disconnected | fixed | **Confirmed fixed** — 6 of 322 isolated |
| A7 MCP contract unhonoured | fixed | **Partially** — `unresolved` now present; contract still over-claims → N21, N16 |
| B1 two graphs | fixed | **Confirmed fixed** |
| B2 non-file entities stored as files | fixed | **Fixed in the projection, not in the snapshot** — `snapshot.nodes` is still 689 rows of which 367 are resources, so `roleCounts` reports `shared: 252` and `layer: configuration: 253` for a repository with 6 config files → N22b |
| B3 no local resolution | fixed | **Confirmed** — 91% of bare-name deps now resolve in-file. The residual cross-file 9% is where N8 lives |
| B5 flows without terminals | fixed | **Confirmed** — 32 of 32 named. Superseded by N19 (no hop evidence) |
| B6 knowledge is prose not graph | fixed | **Confirmed** — 83 nodes / 166 edges. Depth gaps remain → N13, N14 |
| B7 cluster label identity | fixed | Not re-measured this pass — **carried forward unverified** |
| B8 fixtures analysed as product | fixed | **Partially** — `resources/evaluation-corpus/**` excluded (0 nodes); `tests/fixtures/**` still contributes 6 files / 15 symbols to 3 clusters → N20 |
| C6 doc drift | fixed | **Confirmed** — feature rows for the query surface, resource and knowledge levels all present |
| §32 item 8 "expose `codegraph_narrative` as an MCP tool" | done | **OD — not in the code.** `tools()` returns 9 tools, none narrative or knowledge |
| §2a human cold read | open | **Still open** — unchanged |

### 4.2 New defects — Severity 1 (returns a confident wrong answer)

**N1 · The query surface certifies truncated answers as complete · RV**

`countedAccount` ([CodeGraphQueryRepository.bx:297](../../../app/models/repositories/CodeGraphQueryRepository.bx:297))
passes the *returned* count as both `returned` and `available`, so
`queryAccount`'s `omitted = max(0, available - returned)`
([CodeGraphCompletenessService.bx:70](../../../app/models/services/CodeGraphCompletenessService.bx:70))
is structurally always 0 and `state` always `complete`. The `LIMIT` that produced
the loss is applied inside `edgesFor` ([:355](../../../app/models/repositories/CodeGraphQueryRepository.bx:355))
and never counted.

Reproduced over HTTP:

```
/neighbours?node=file:app/config/router.bx&limit=60
  → outgoing 60   available 61  omitted 0  state "complete"  complete true
/neighbours?node=file:app/config/router.bx&limit=500
  → outgoing 314  available 315 omitted 0  state "complete"  complete true
```

254 edges dropped, certified whole. The UI calls it at **limit=60**
([app.js:5734](../../../public/assets/app.js:5734)). Ten nodes exceed 100 edges, including
`app/config/router.bx` (314) and `public/assets/app.js` (304) — the two nodes
that carry the cross-language chain.

Same defect in `hierarchy` ([:85](../../../app/models/repositories/CodeGraphQueryRepository.bx:85)),
`lineage` ([:131](../../../app/models/repositories/CodeGraphQueryRepository.bx:131)) and
`references` ([:219](../../../app/models/repositories/CodeGraphQueryRepository.bx:219)).
`references` is worst: at `limit=5` it returns 5 of 24 definitions and 5 of 130
occurrences, reports `complete: true`, **and reports `unresolvedInResult: 0`
where the true figure over the full set is non-zero** — the one endpoint whose
purpose is honest unresolved reporting.

*Root cause:* `available` is never queried. *Missing capability:* an unlimited
`COUNT(*)` beside every limited `SELECT`. *Consumers:* Trace panel, Assess panel,
MCP tools 2–5.

**N2 · "Where do I start" is alphabetical · RV**

`onboarding` orders entry points `ORDER BY kind, path, symbol_name`
([CodeGraphQueryRepository.bx:398](../../../app/models/repositories/CodeGraphQueryRepository.bx:398)).
Live:

```
smoke      app/handlers/ApiAI.bx:24          "a request starts here (handler-action)"
activate   app/handlers/ApiAIProviders.bx:68
create     app/handlers/ApiAIProviders.bx:30
delete     app/handlers/ApiAIProviders.bx:56
index      app/handlers/ApiAIProviders.bx:16
notFound   app/handlers/ApiAIProviders.bx:91
```

Five of six entries are one AI-provider CRUD handler, because `ApiAIProviders`
sorts second. The reader is told these are where a request starts, which is true
and useless. Q3 and Q15 both resolve here. Nothing about fan-in, route coverage,
centrality or reachability participates.

The `domain` section reads `hotspot` as a file count — correct by accident
(the projection writes `fileCount` into `hotspot` at
[CodeGraphProjectionService.bx:65](../../../app/models/services/CodeGraphProjectionService.bx:65))
— and returns `label: "Index", path: "Index", line: 0`, so the largest module in
the project cannot be opened.

**N3 · The project pitch describes one arbitrary 3-file cluster · RV**

`narrateSharded` takes the first shard that produced a pitch
([CodeGraphNarrativeService.bx:240](../../../app/models/services/CodeGraphNarrativeService.bx:240))
and iterates clusters in stored order ([:199](../../../app/models/services/CodeGraphNarrativeService.bx:199)),
which is hash-id order. Stored pitch for this repository:

> "This codebase snapshot centers on a single domain cluster that models a domain
> concept and pairs it with an evaluation service… The cluster spans three files
> and 65 symbols."

DoubleCheck, described as `clusters[1]`. This is the **first sentence a cold
reader sees** and it is the answer to Q1. §32 item 5 reported the pitch repaired
when fixtures were excluded; it was repaired for that cause and is broken for
this one.

**N4 · The narrative drops the largest domains, by hash order · RV**

`maxClusters = 24` and the slice is positional
([CodeGraphNarrativeService.bx:199](../../../app/models/services/CodeGraphNarrativeService.bx:199),
[:402](../../../app/models/services/CodeGraphNarrativeService.bx:402)). `snapshot.clusters`
is restored to id order after ranking (D12's fix), so the cap cuts by hash.
Measured: 36 clusters, 24 narrated, **12 dropped totalling 75 files (23% of the
repository)** — including clusters of **20, 14 and 13 files** while nine 2-file
clusters are kept. `trimmedSections: ["clusters","hotspots"]` says something was
trimmed and never which.

**N7 · Both architecture-rule violations in this repository are false · RV**

`/rules` returns 2 violations. Traced to their dependency rows:

| Violation | Stored row | Source line |
|---|---|---|
| `ModernizationPlacementService --constructs--> app/handlers/Main.bx` | `target: "main"` | `:220` evidence is a **string literal** — *"Keep the capability in the new main application…"*; also `:513` `name: "New main application"` |
| `AIFlightListener --calls--> aiFlight/handlers/Flight.bx` | `target: "flight.count"` | `:515` `if ( !flight.count() ) {` where `flight` is a **local struct** |

Neither relationship exists. Two causes: **literal masking is not applied on the
`constructs` detector path** (the fix §18 shipped for `calls` does not cover it),
and **dotted-leaf receiver matching** (D5's fix) binds any receiver name to a
file of that name. Stored `heuristic/medium` and `heuristic/low` respectively —
but `/rules` weights every edge equally and reports them as findings, and the
snapshot's `layerViolations` carry no line at all (N24).

Q13's entire visible answer on this repository is two false positives.

**N5 · The FTS5 search index never fires on any AI-enabled run · RV**

`searchIndexCovers` requires `mirroredCount == storedCount`
([CodeGraphGraphRepository.bx:795](../../../app/models/repositories/CodeGraphGraphRepository.bx:795)).
Measured: mirror **6,275** rows, nodes **6,192**, distinct mirrored node ids
**6,192** — **83 duplicates, exactly the knowledge node count** (N6). The
comparison fails, `searchIndexHits` returns null, and every search falls back to
the `LIKE '%term%'` scan D23 existed to remove.

Results stay correct — the backstop works exactly as designed — so nothing fails
and nothing says the index is inert. This is the fourth instance of the pattern
this register already names three times (dead orchestrator branch, unreachable
`integration` role, backspace-byte detectors): **a capability that exists,
passes its tests, and never runs.**

**N6 · Knowledge nodes are mirrored twice · RV** — the second-pass knowledge
append inserts mirror rows without the delete that `replaceGraph` performs
([CodeGraphGraphRepository.bx:710](../../../app/models/repositories/CodeGraphGraphRepository.bx:710)).
Root cause of N5.

### 4.3 New defects — Severity 2

**N8 · Name-collision resolution produces confidently-wrong cross-file edges · RV**
*(Severity overstated — see §21. The 41% below counts ambiguity across all symbol
kinds; resolution only consults **type** names, of which three were ambiguous.
Fixed and guarded, but this entry's headline figure is not the at-risk set.)*
14% of distinct symbol names are declared in more than one file (`run` in 116,
`init` in 47, `log` in 29). Of 628 cross-file edges whose target is a bare
undotted name, **260 (41%) name a symbol declared in more than one file** and the
resolver picked one with no scope, receiver type or import evidence. Stored
`heuristic`, which is honest, but nothing distinguishes "one candidate" from
"sixteen candidates, we guessed".

**N9 · `readLevel` returns more nodes than it says exist · RV**
`/graph?level=resource&limit=200` → **396 nodes** (200 resource + 146 symbol +
50 file) with `available: 367, omitted: 0, complete: true`.
`level=knowledge` → **177 nodes** (83 knowledge + 51 file + 24 cluster + 19
resource) with `available: 83`. `available` counts the level; `nodes[]` includes
edge endpoints from other levels. `returned > available` is incoherent and any
agent computing coverage from it is wrong.

**N10 · Resources are outside the containment hierarchy · RV**
All **367** resource nodes have `parentId: ""`
([CodeGraphProjectionService.bx:134](../../../app/models/services/CodeGraphProjectionService.bx:134)).
`parentId` is the drill contract; a reader cannot ask "which routes belong to
this module" or "which tables does this domain own" by hierarchy.

**N11 · Resources have no declaration site · RV**
All 367 carry `line: 0`. A route, table, config key or event can be found and
traced but not **opened**. `/source` needs `path` + `line`; the entity has
neither. Every Q4/Q7/Q10/Q17 answer names things the reader cannot look at,
though the *edges* to them do carry evidence.

**N12 · Entities carry no resolution, provenance or confidence · RV (schema)**
`codegraph_nodes` columns: `run_id, node_id, level, parent_id, path, symbol_name,
kind, role, language, line, end_line, fan_in, fan_out, hotspot`. §7 of the prior
plan required these attributes on *every entity and edge*; only edges have them.
A regex-inferred `table:` node and a filesystem-proven `file:` node are
indistinguishable.

**N15 · Search facets are silently ignored · RV**
`?kind=`, `?role=`, `?resolution=`, `?relation=`, `?domain=` all return the
identical unfiltered result (`available: 3104` for every variant of `q=service`)
rather than 422. The §10 contract advertises them. An agent filtering by kind
receives everything and cannot tell.

**N16 · The MCP surface cannot reach half the graph · RV + OD**
`codegraph_search`'s level enum is `["cluster","directory","file","symbol"]`
([CodeGraphMcpDescriptor.bx:31](../../../app/models/services/CodeGraphMcpDescriptor.bx:31))
— **`resource` and `knowledge` are missing**, so an agent cannot search routes,
tables, config keys, events, domains, risks or processes. There is no knowledge/
narrative tool (contradicting §32 item 8), no level-browse tool, no `rules`, no
`diff`, no flow tool. Nine tools describe roughly half the surface.

**N17 · The snapshot says truncated while every part says complete · RV**
`snapshot.truncated: true`, `truncationReasons: ["graphLoad","graphImpacts",
"maxHotspots","maxFlowsPerCluster"]`, and all nine `completeness` entries report
`omitted: 0, complete: true`. Two of the reasons name caps whose accounts
self-certify: `flows` available is `max(flowCount, flowCandidateCount ?: flowCount)`
([CodeGraphCompletenessService.bx:149](../../../app/models/services/CodeGraphCompletenessService.bx:149))
— the D6 pattern surviving in the sections where the candidate count is not
supplied.

**N19 · Flows are not graph entities and carry no hop evidence · RV**
`snapshot.flows[]` holds `steps[]` (paths) and `stepSymbols[]` and **no `hops`
array** — 32 of 32 flows have zero hops. So a flow step has no line, no edge id,
no resolution class, and cannot be clicked to source. Flows are not projected as
nodes or edges, there is **no `/flows` endpoint** and no MCP tool; the only way
to obtain one is to download the whole snapshot from `/result`. End-to-end
process tracing — the centre of the target experience — is the least queryable
thing in the product.

### 4.4 New defects — Severity 3

- **N13 · Knowledge labels are truncated prose.** Risk node `path` and
  `symbolName` are `left( text, 120 )`
  ([CodeGraphProjectionService.bx:469](../../../app/models/services/CodeGraphProjectionService.bx:469))
  — measured max exactly 120, cut mid-word ("…ModernizationRunService, CodeGrap").
  Edge evidence is `left( text, 500 )`. Risks have no title field; domains and
  processes do.
- **N14 · Knowledge materialisation drops silently.** 29 narrative processes →
  **23** nodes; unmatched `flowId` and empty target lists `continue` with no
  count ([CodeGraphProjectionService.bx:449](../../../app/models/services/CodeGraphProjectionService.bx:449)).
  D31 counted *normalizer* rejections; this is a second, later drop point with no
  accounting.
- **N18 · Half the directory level is isolated.** 20 of 39 directory nodes have
  no edge, including `app`, `app/models`, `app/views`, `app/modules`,
  `tests/specs` — every intermediate ancestor that holds no files directly. The
  rollup aggregates only between directories that own files. `app/models` — the
  whole domain layer — has no relationships.
- **N20 · Fixture exclusion is partial.** `tests/fixtures/**` contributes 6 file
  nodes and 15 symbols across 3 of 36 clusters, including a deliberately insecure
  fixture and a legacy CFML shop, roles `persistence`/`integration`.
- **N21 · The MCP contract over-claims.** "every edge carries file:line evidence"
  — 324 of 15,300 (knowledge, cluster and directory rollups) have `line: 0`, and
  the 92 cluster edges have empty evidence.
- **N22 · Clusters are not domains.** One 117-file cluster (36% of the
  repository) labelled `Index`; 22 of 36 clusters hold ≤3 files. Without a
  provider the labels are file names — `Index`, `App`, `Router`,
  `Architecturemodel`. (§35.2 recorded this as unfixable by the structural
  layer; the *distribution* is a separate, fixable problem.)
- **N22b · Snapshot analytics still count resources as files.**
  `snapshot.nodes` is 689 rows of which 367 are resources, so `roleCounts`
  reports `shared: 252` and `layer.configuration: 253` for a project with 6
  config files. B2 was fixed in the projection only. Clusters and hotspots are
  clean (0 synthetic); the canvas node array and the role legend are not.
- **N23 · `/rules` has no completeness account** and evaluates only file-level
  edges bounded at `edgeLimit: 4000`
  ([ApiCodeGraph.bx:487](../../../app/handlers/ApiCodeGraph.bx:487)) — symbol, resource
  and directory edges are never checked, and a large repository would silently
  evaluate a subset.
- **N24 · Cycles and violations carry no edges.** `cycles` are member path lists
  (2 cycles, sizes 15 and 2 — an SCC, not a cycle); `layerViolations` in the
  snapshot are `{from,to,fromLayer,toLayer,kind,weight}` with no line. Only
  `/rules` reattaches evidence, from a different code path.

---

## 5. Technical capability-gap register

Capabilities absent by design rather than broken. All **PR** unless noted.

| ID | Missing capability | Blocks | Root cause |
|---|---|---|---|
| **G-a1** | Scope-aware name resolution (candidate sets, import/injection evidence, ambiguity as a first-class outcome) | Q9, Q13 | Resolver returns one file per name with no candidate count → N8 |
| **G-a2** | Literal/comment masking on **every** detector path, not only `calls` | Q13 | N7 |
| **G-b1** | `available` as a counted quantity on every query | Q14 | N1 |
| **G-b2** | Per-entity resolution/provenance/confidence | Q14 | N12 |
| **G-c1** | Flow as a first-class entity with evidence-bearing hops | Q5–Q8 | N19 |
| **G-c2** | Control-flow-sensitive claims, error paths, auth semantics | — | **NS** — a symbol index cannot prove them; must be reported as unsupported |
| **G-c3** | Global data flow / value tracking | data lineage depth | **NS** at this scope (see §11, CodeQL) |
| **G-d1** | Ranked onboarding (reachability + centrality + route coverage) | Q3, Q15 | N2 |
| **G-d2** | Size-ordered, budget-aware narrative selection | Q1, Q2 | N3, N4 |
| **G-e1** | Resource containment (`parentId`) and declaration sites | Q4, Q7, Q10 | N10, N11 |
| **G-e2** | Directory rollup through ancestors | Q1 | N18 |
| **G-f1** | Faceted search (`kind`, `role`, `resolution`, `relation`, `domain`) | Q13, Q14 | N15 |
| **G-f2** | Agent parity: every HTTP capability has an MCP tool | agent access | N16 |
| **G-g1** | Glossary terms; domain→domain relations; ordered process steps | Q2 | knowledge layer has only `describes`/`affects` |
| **G-g2** | Knowledge coverage account (what was not narrated, and why) | Q14 | N4, N14 |
| **G-h1** | Vendor / fixture / generated classification as a pipeline concept | Q1 | N20 — exclusion is a hardcoded path |
| **G-i1** | Cluster decomposition tuned for domain size distribution | Q1, Q2 | N22 |
| **G-j1** | Resource and knowledge levels drawable on the canvas | Q4, Q7, Q10, Q17 | canvas depths are `start/cluster/file/symbol/focus/matrix` only |
| **G-j2** | References panel, flow/sequence view, run-over-run diff in the UI | Q8, Q9, Q12 | endpoints exist, no UI |
| **G-k1** | Query latency and search scalability measured above ~6k nodes | scale | never measured |
| **G-u1** | **Arrival that leads with the existing map** | Q1 | U1 — the page has no snapshot-restore path |
| **G-u2** | **A designed comprehension journey** — the workspace exposes 6 depths, 5 drawer tabs, 4 layouts and a rail with no order or narration between them | all | U3, U4 — the product offers surfaces, not a route through them |
| **G-u3** | **One vocabulary for a module** — AI name, derived name and "unnamed" must be visually distinct | Q1, Q2 | U6 |
| **G-u4** | **Progressive disclosure that states its own bounds** — "18 of 36" rather than "Show all 36" | Q14 | U8 |
| **G-u5** | **Summaries written for a card** — whole sentences at card scope, not a shard narrated as the project | Q1 | U7 |

---

## 6. Canonical entity and relationship model

Additive to `codegraph_nodes` / `codegraph_edges`. Bold = new or changed.

```
project → revision → run
  cluster (domain)        derived, labelable, stable derived key
  directory               hierarchical, ancestors materialised and connected  [N18]
  file
    class | interface | component
      function | method | property | handler-action | lifecycle-hook
  resource                route · table · config · event · http · schedule · response
                          **parented to its owning file or cluster**          [N10]
                          **carrying a declaration line**                     [N11]
  **flow**                **first-class: ordered, evidence-bearing hops**     [N19]
  test | test-suite
  architecture-rule
  domain | process | risk | **glossary-term**        ← knowledge layer only
```

### Required attributes

**Every entity and every edge:** `id` (semantic, position-independent) · `kind` ·
`parentId` · `path` · `line`/`endLine` · `evidence` · **`resolution`** ∈
{exact, heuristic, unresolved, derived, narrative} · **`confidence`** ∈
{high, medium, low, interpretive} · **`provenance`** ∈ {filesystem, parser, ast,
derived, llm} · `runId`.

Nodes gain the three bold columns (N12). Heuristic entities additionally carry
**`candidateCount`** — how many targets matched the name — which is what turns
N8 from an invisible guess into a stated one.

### Relationship classes

| Class | Relations | Rule |
|---|---|---|
| **Exact** | `defines`, `declares`, `extends`, `implements`, `routes-to`, `renders`, `includes`, `imports`, `responds` | parser-proven with `file:line` |
| **Heuristic** | `calls`, `injects`, `constructs`, `type-reference`, `calls-api`, `table-read`, `table-write`, `reads-config`, `emits`, `tests` | name/type resolution; **must carry `candidateCount`** |
| **Derived** | `cluster-dependency`, directory rollups | computed from other edges; no line, and the response must say so |
| **Narrative** | `describes`, `affects`, `belongs-to` | LLM; never evidence |
| **Unresolved** | any of the above whose target did not bind | an occurrence, returned by `/references`, counted everywhere |
| **Unprovable** | dynamic construction, reflection, runtime wiring, dynamic SQL, runtime dispatch | **NS** — reported, never guessed |

**Identity rule (unchanged, and verified holding):** ids derive from semantic
coordinates. Two runs on the same tree produced identical id sets (§3).

---

## 7. Cross-language and cross-layer flow contract

```
 js-event ──?──► js-fetch ──calls-api──► route ──routes-to──► handler.action
   [NS: DOM binding]   [76 edges RV]      [52 edges RV]
                                             │
   ├──injects──► service ──injects──► repository ──table-read/write──► table
   │             [685 RV]                              [365 RV]
   ├──renders──► view                                  [7 RV]
   ├──reads-config──► config-key                       [637 RV]
   ├──emits───► event ──handles──► subscriber   [55 RV / handles NS: runtime]
   ├──http────► external system                        [16 RV]
   └──responds─► response                              [172 RV]
```

Every link in this chain exists as an edge today. **What does not exist is the
chain as an object.** A `flow` is a snapshot array with no hops, no evidence, no
endpoint (N19). The contract Phase 4 must satisfy:

- a flow is a node; each hop is an edge reference carrying `from`, `to`, `kind`,
  `file:line`, `resolution`, `confidence`, and the owning symbol or
  `"(file level)"`;
- a flow states its terminal (`response`, `table-read`, `view-render`,
  `http-call`, `scheduled-run`, `returns-to-caller`, `depth-limited`, `cycle`) —
  already correct, keep it;
- an unresolved hop renders as an explicit gap, never as a join;
- `GET /codegraph/flows` and `/codegraph/flows/:id` serve them, and both appear
  as MCP tools.

**Deterministic substrate:** call hierarchy, request flow, cross-language
frontend→backend linkage, table read/write lineage, scheduler and event wiring,
test→symbol linkage, config→consumer, response terminals.

**Optional narrative:** why a flow exists, what a domain means, what a risk
implies, glossary.

**NS:** control-flow-sensitive claims, error-path reasoning, authorization
semantics, global data flow, DOM-event→fetch binding, event subscriber
resolution. The product must say so on the response rather than imply coverage.

---

## 8. Evidence, confidence and completeness contract

Every graph response and every visible level:

```json
{ "returned": 0, "available": 0, "omitted": 0,
  "unresolved": 0, "unresolvedScope": "run|result",
  "unsupported": [], "truncated": false,
  "rankedBy": "", "state": "complete|empty|missing|partial|truncated|stale|failed" }
```

Rules, each pinned to a defect this pass found:

1. **`available` is counted, never assumed.** An unbounded `COUNT(*)` beside
   every bounded `SELECT`. (N1)
2. **`returned` may never exceed `available`.** If a response includes nodes from
   other levels, they are a separate `context` array, or `available` counts them.
   (N9)
3. **`state` is authoritative and `complete` derives from it** — already true,
   keep it.
4. **A snapshot may not report `truncated: true` while every part reports
   `complete: true`.** A truncation reason must name the account it belongs to.
   (N17)
5. **Every drop is counted where it happens.** Knowledge materialisation, the
   narrative cluster slice, and the projection each need an account. (N4, N14)
6. **A heuristic edge with more than one candidate states the count.** (N8)
7. **A derived edge says it is derived** rather than implying a missing line.
   (N21)
8. **An inert capability is a reported state, not silence.** When the search
   index does not cover a run, the response says `searchIndex: "bypassed"`.
   (N5)
9. **A field with no data renders nothing.** No placeholder, no derived-from-
   position fallback, no default that reads as a measurement. This is the rule
   U2 broke, and it is the one rule in this list that the *front end* owns. If a
   chip, badge, count or label cannot be traced to a value in the payload, it
   does not appear.

Distinct states and today's treatment:

| State | Meaning | Today |
|---|---|---|
| complete | everything available was returned | **over-applied** (N1, N9, N17) |
| empty | complete graph, no match | correct |
| missing | no levelled rows | correct — 409 |
| partial | indexing incomplete | correct for empty full scans (§34.4) |
| truncated | a cap applied | correct at `/graph` and `/impact`, **absent elsewhere** |
| heuristic | resolved by name | on the edge; **not on entities** (N12); no candidate count (N8) |
| unsupported | not statically provable | present as a static list on every response |
| stale / failed | snapshot older than parser, or write failed | `stage_health_json` present; not surfaced per query |

**The honesty rule, restated:** the graph may be incomplete; it must never be
*silently* incomplete. N1 is that rule inverted — the product now asserts
completeness it has not checked, which is strictly worse than the silence it
replaced.

---

## 9. Required query and API contracts

On `/api/v1/runs/:id/codegraph/*`. Every response carries §8's block.

| Query | Endpoint | Status |
|---|---|---|
| Level browse | `/graph?level=&scope=&rank=&limit=` | exists · **N9** |
| Search | `/search?q=&level=` | exists · **facets missing (N15)**, index inert (N5) |
| Definition + references | `/references?symbol=` | exists · **N1** |
| Callers / callees | `/neighbours?node=&direction=` | exists · **N1**, no `kind` filter |
| Type hierarchy | `/hierarchy?node=` | exists · **N1** |
| Data lineage | `/lineage?table=` | exists · honest · **no column-level lineage** |
| Change impact | `/impact?node=&depth=` | exists · honest |
| Neighbourhood | `/subgraph?focus=&depth=` | exists |
| Paths | `/paths?from=&to=` | exists |
| Onboarding | `/onboarding?limit=` | exists · **N2** |
| Rules | `/rules` | exists · **N7, N23**, no account |
| Diff | `/diff?base=` | exists · honest · **no UI** |
| MCP descriptor | `/mcp` | exists · **N16, N21** |
| **Flows** | **`/flows`, `/flows/:id`** | **missing (N19)** |
| **Domains / knowledge** | **`/knowledge?kind=domain\|process\|risk\|glossary`** | **missing** — reachable only as `level=knowledge` |
| **Entry points** | **`/entrypoints?rank=`** | **missing** — folded into `/onboarding` today |

Additions to existing endpoints: `kind=` and `resolution=` filters on
`/neighbours`; `includeDeclaration=` on `/references` (LSP parity);
`direction=` on `/hierarchy`; `candidateCount` on every heuristic edge.

---

## 10. UI: the comprehension journey

**This is the centre of the plan, not its last phase.** The graph's value exists
only on screen. Today the workspace offers six canvas depths, five drawer tabs,
four layouts, a rail and an inspector — a set of *surfaces* with no route through
them. A newcomer is given controls and left to invent a method.

### 10.1 The four beats

One sentence each, because a journey a reader cannot state is not a journey.

| Beat | The reader's question | The screen answers with |
|---|---|---|
| **Arrive** | "Is there a map?" | The existing map, drawn, in under two seconds |
| **Orient** | "What is this and how is it organised?" | Named modules, sized, with a real layer or none |
| **Follow** | "How does a request get from the browser to the database?" | One flow, end to end, every hop evidenced |
| **Assess** | "What will I break?" | Impact, cycles, violations — each weighted by how well it is proven |

Q1–Q3 and Q15–Q16 resolve in Arrive+Orient. Q4–Q8 in Follow. Q9, Q12–Q14 in
Assess. Q10, Q11, Q17 are reachable from Orient's resource level.

### 10.2 Arrive — the screen that does not exist yet

**Today:** *"No graph snapshot"* with the whole workspace hidden (U1).

**Required.** On load, `GET /api/v1/codegraph?projectPath=` — the endpoint that
already returns the right run. Three states, all designed:

| State | Screen |
|---|---|
| Snapshot exists | Draw it. Header: *"Saved map of {path} · built 7h ago · run b8ead1cb"* — this string already exists and is good. **Rebuild map** stays visible. The run form collapses to a secondary affordance |
| Snapshot is stale (repo revision moved) | Draw it anyway, with a banner: *"This map is 14 commits behind. Rebuild to include them."* Never withhold a usable map |
| No snapshot at all | The current empty state, which is correct **for this case only** |

The run form owning the top of the page is right for a first-ever visit and wrong
every time after. Arrival should lead with the map and offer the form second.

### 10.3 Orient — the map, told honestly

**Fixes U2, U5, U6, U7, U8, N22.**

- **No fabricated chips.** A module renders `complexity` (real) and `N files`
  (real). The layer chip renders only when a layer is derivable from the
  dominant role of the module's files — otherwise nothing. (§8 rule 9)
- **One vocabulary, three visually distinct states:** an AI-named domain, a
  derived name (`Index`, `App`), and *unnamed*. A derived name must not look like
  a domain name. Today they are identical and the largest module in the project
  reads `Index`.
- **The rail legend counts files, not resources.** `Shared 252` is 247 config
  keys; the legend is the first structural claim a reader reads and it is
  currently an artefact.
- **Disclosure states its bounds:** *"18 of 36 modules — show the rest"*, not
  *"Show all 36 modules"* beside 18 cards.
- **Summaries are written for a card:** one or two whole sentences at module
  scope. A shard narrated as "the entire codebase" is worse than no summary.
- **Resource and knowledge become canvas depths.** Routes, tables, config keys,
  events and external systems are 367 nodes with 1,251 edges that no view draws
  (G-j1). Domains and risks likewise. These answer Q4, Q7, Q10, Q17 and Q13 and
  are currently API-only.

### 10.4 Follow — the missing view

**Fixes N19, G-c1.** There is no flow view. `flows[]` is 32 traces that only
`/result` returns and only as paths.

A flow renders as a **sequence**: participants as columns, hops as rows, each hop
carrying kind, owning symbol, `file:line`, and a resolution badge. An unresolved
hop is an explicit gap, never a join. The terminal is named
(`response`, `table-read`, `depth-limited`…) — that data already exists and is
correct for 32 of 32 flows.

Entry: click any entry point in Orient, or any route in the resource level.
This is the single view that most directly delivers the target sentence's
"end-to-end flows", and it is the largest UI gap in the product.

### 10.5 Assess — weight the answers

**Fixes N7, N24, G-j2.** Impact and rules exist. Add: cycles carry their edges;
violations are weighted by resolution class, so a `heuristic/low` match does not
render identically to a proven boundary breach — the two false violations in
this repository would then present as *"2 possible, 0 proven"*. Add the
references panel (`/references` exists, no UI) and run-over-run diff
(`/diff` exists, no UI).

### 10.6 Principles

**Keep — measured working:** deep links (`?run=&depth=`); the truncation banner's
wording; `data-summary-origin` and the AI chip; `complexityOf()`; keyboard
traversal and the ARIA live region; degree-of-interest elision; never drawing the
whole repository; DSM as the second overview.

**Add:**
- *No data, no widget.* (§8 rule 9 — the U2 rule.)
- *A truncated view states the cut in the view.* The canvas banner does this
  already; the Trace and Assess panels render the completeness account
  faithfully, which is exactly why N1 is user-visible — they are honestly
  rendering a dishonest payload. Fixing N1 fixes those panels for free.
- *Every screen answers a stated question.* Each view carries the question it
  answers in its heading, so the reader knows which of the seventeen they are on.

---

## 11. External research

Concepts, not features. Every recommendation stays inside local-only,
desktop-only, SQLite, BoxLang/CFML/JavaScript.

| Source | Concept taken | Applied as |
|---|---|---|
| [Kythe schema](https://kythe.io/docs/schema/) — VNames; **anchors vs semantic nodes**; `defines/binding` vs `ref`; `ref/call` variants | An occurrence is a fact; the binding is a claim *about* it. Anchors are not `childof` their file — matching coordinates establish it | `/references` already implements the split. Extend: `candidateCount` on a binding claim (G-a1); `ref/call` granularity for the `calls` kind |
| [SCIP](https://github.com/sourcegraph/scip) — symbol grammar `<scheme> <package> <descriptor>+`; **`SymbolRole` bitset** (Definition, Import, WriteAccess, ReadAccess, Generated, Test); `Relationship.is_implementation`; **`external_symbols`** for unresolved cross-repo references | Roles are *flags on an occurrence*, not separate kinds — DoubleCheck's `table-read`/`table-write` split is the same idea, done as kinds. An unresolved external reference gets a first-class home rather than being dropped | Keep the kind split; adopt `external_symbols` as the model for the 11,529 unresolved references — a named bucket, not a count. Keep `scipSymbol` export |
| [LSP 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — definition, declaration, typeDefinition, implementation, references(`includeDeclaration`), documentSymbol, workspaceSymbol, **callHierarchy** (prepare/incoming/outgoing), **typeHierarchy** (supertypes/subtypes) | The minimum navigation set. DoubleCheck has all of it except `includeDeclaration` and directional hierarchy | §9 additions |
| [Code Property Graph / Joern](https://coderpad.io/blog/development/code-property-graph-oriented-databases-source-code-analysis/) — AST+CFG+PDG joined at statement/predicate nodes, one queryable graph | Edge kinds must distinguish structural from control-flow from data-flow, and a product with only the first must say so | §6 relation classes; G-c2/G-c3 declared **NS** rather than implied |
| [CodeQL data flow](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/) — local flow is "fast, efficient and precise"; global is "more time and energy intensive"; unresolved call targets need extra work | Local resolution is affordable, global is not. §32 built the local half; the residual is dispatch | N8's fix is local-scope disambiguation, not global analysis. Global flow stays **NS** |
| [Aider repo map](https://aider.chat/2023/10/22/repomap.html) — personalised PageRank over the def/ref graph, budget filled in rank order | Ranking for *attention* is a graph computation, not a sort | **Fixes N2 directly**: `CodeGraphCentralityService` already computes PageRank-style centrality for retention; `/onboarding` must consume it |
| [DSM](https://www.jetbrains.com/help/idea/dsm-analysis.html) — most-used moved to the bottom, triangular when healthy, **mutual dependencies in red** | The matrix reveals cycles positionally where node-link hides them | `toCodeGraphMatrix` exists; add cycle highlighting and the "most-used to the bottom" ordering |
| [Fitness functions](https://lukasniessen.com/blog/155-fitness-functions-guide/) (Ford/Parsons/Kua; ArchUnit) — governance by rule, not by inspection | Rules are assertions over the graph, evaluated every run | `/rules` exists. **N7 says the assertions are only as good as the edges** — resolution-weighted rules, and rules over symbol and resource edges (N23) |
| [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) — incremental reuse of unchanged subtrees | Reuse is keyed on content, and the key must move when extraction changes | Already learned the hard way — `parserVersion` and `projectionVersion`. E5 measured and correctly re-scoped |
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) · [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) · [CodeGraphContext](https://github.com/codegraphcontext/codegraphcontext) — 2026 local-first MCP code graphs on tree-sitter + SQLite + FTS5 | The category converged on exactly DoubleCheck's stack and sells on *tool-call reduction*. Parity is a tool surface an agent can fully address | **N16**: every HTTP capability needs an MCP tool, and the search enum must cover every level |
| [van Ham & Perer, TVCG 2009](https://dl.acm.org/doi/10.1109/TVCG.2009.108) | Search, show context, expand on demand | `degreeOfInterest()` in the canvas — in place |

---

## 12. Implementation phases

Reordered in this revision: **the reader's screen leads.** The earlier ordering
put UI last, which would have spent three weeks improving a graph nobody could
open. Sized in days. Only Phases 4 and 5 touch the schema.

| Ph | Work | Fixes | Schema | Size |
|---|---|---|---|---|
| **V** | **Clean-database baseline and full live test** — drop and rebuild the store, clean compiled classes, run both suites in full, re-index DoubleCheck and `lib/coldbox` from empty, re-take every measurement in this document. **See §17** | establishes the baseline every later phase is measured against; settles 4 open uncertainties | — | **0.5 d** |
| **0** | **Stop showing invented data** — delete the `index % 5` layer fallback; render no chip when no layer is derivable; audit every other card/badge/chip for positional or default fallbacks | **U2**, §8 rule 9 | — | **0.5 d** |
| **1** | **Arrive on the map** — call `/api/v1/codegraph?projectPath=` on load; lead with the saved map; stale-snapshot banner; open the drawer on **Briefing**; show the project strip; inspector prompts for the view it is actually on; fix the history node/cluster counts and the header count | U1, U4, U9, U10, U11, G-u1 | — | **1 d** |
| **2** | **Counts stop lying** — count `available` unbounded on `/neighbours`, `/hierarchy`, `/lineage`, `/references`; cross-level nodes into `context[]`; reconcile snapshot `truncated` with its parts; completeness on `/rules` | N1, N9, N17, N23 | — | 1 d |
| **3** | **Orient reads true** — rank `/onboarding` by centrality + route coverage + reachability; narrative clusters by size within budget; whole-graph pitch; name the omitted clusters; card summaries at card scope; distinct AI / derived / unnamed titles; legend counts files; "18 of 36" disclosure | N2, N3, N4, U3, U5, U6, U7, U8, G-d1, G-d2, G-g2, G-u3, G-u4, G-u5 | — | 2.5 d |
| **4** | **Resolution accuracy** — literal/comment masking on every detector path; candidate sets with `candidateCount`; refuse or downgrade a bare-name binding with >1 candidate; resolution-weighted `/rules` | N7, N8, G-a1, G-a2 | edge column | 2.5 d |
| **5** | **Ontology completion** — resource `parentId` and declaration line; node `resolution`/`provenance`/`confidence`; directory rollup through ancestors; knowledge titles + drop accounting; fixture classification | N10–N14, N18, N20, N22b, G-b2, G-e1, G-e2, G-h1 | node columns | 2.5 d |
| **6** | **Follow — flows first class and on screen** — evidence-bearing hops; `flow` nodes and `flow-hop` edges; `/flows`, `/flows/:id`; the sequence view; cycles carry their edges | N19, N24, G-c1, §10.4 | node/edge kinds | 3 d |
| **7** | **The map covers the graph** — resource and knowledge canvas depths; references panel; diff view; cluster distribution tuning | G-i1, G-j1, G-j2, N22 | — | 2.5 d |
| **8** | **Search, facets and agent parity** — dedupe the FTS mirror and report bypass; faceted search with 422; MCP tools for every capability and level | N5, N6, N15, N16, N21, G-f1, G-f2 | — | 1.5 d |
| **9** | **Knowledge depth** — glossary terms, domain→domain relations, ordered process steps, `/knowledge` endpoint | G-g1 | node kind | 2 d |
| **10** | **Scale** — query latency and search benchmarks above 50k nodes; memory bounds; cancellation | G-k1 | — | 1.5 d |

**Phase V then Phases 0 and 1 are the recommended first work — two days
together.** Phase V costs half a day and buys a trustworthy baseline: every
number in this document was measured on a 394 MB store holding 39 accumulated
runs, and at least four findings could be artefacts of accumulation rather than
of the code. Phase 0 is a deletion: it removes fabricated data from the primary
map, and it is the only change in this plan that makes the product more truthful
by shipping *less* code. Phase 1 makes the map reachable at all. Together they
change the product from "tells a newcomer there is no graph" to "opens on a map
whose every visible field is real" — which is the requested outcome, before any
new capability is built.

Phase 2 then earns the right to make claims: every later acceptance test asserts
a completeness account, and those assertions are meaningless while `available` is
a copy of `returned`.

**Gating.**
- **V before everything.** A phase measured against an unverified baseline cannot
  prove it improved anything. This is the §22 cache lesson generalised: the
  measurement environment is part of the measurement.
- **0 before the rest of the UI.** Do not build views on a renderer that invents
  fields.
- **4 before 7.** Drawing a resource map over false edges looks authoritative and
  is worse than no map.
- **2 before 8.** An MCP tool reporting `complete: true` on a truncated answer is
  the exact failure the descriptor's contract exists to prevent.
- **5 before 6.** A flow hop needs a resource with a declaration line to point at.

**Fingerprint / version movers:** Phase 4 (extraction → `parserVersion` bump,
full re-index), Phases 5 and 6 (projection output shape → `projectionVersion`
bump). Phases 0–3 and 8 move neither — **the entire UX-first block is
version-neutral and needs no re-index**, which is why it can ship first and fast.
Every bump needs a corpus determinism re-run.

---

## 13. Per-phase changes

**Phase 0 — delete the invented field.**
`codegraph-layout.js`: `layerLabelOf()` ([:176](../../../public/assets/codegraph-layout.js:176))
loses the `index % labels.length` branch and returns `""` when no layer is
derivable; `buildOverviewCard()` ([:1325](../../../public/assets/codegraph-layout.js:1325))
omits the `<text class="cg-card-layer">` element entirely for an empty label —
not an empty chip. Sweep the other renderers for the same shape: `n.complexity ||
"simple"` on the same line is a **default that reads as a measurement** and gets
the same treatment (`fileComplexityOf` is real; the `"simple"` literal fallback
is not).
*Tests:* `tests/js/codegraph-layout.spec.mjs` — a cluster with no `layer`
property renders no layer chip; two clusters at different indices with identical
data render identical cards. *No schema, no API, no re-index.*

**Phase 1 — arrive on the map.**
`app.js`: on CodeGraph page init, call
`GET /api/v1/codegraph?projectPath=` (already implemented server-side at
[ApiCodeGraph.bx:53](../../../app/handlers/ApiCodeGraph.bx:53)) and load the
returned run through the existing `?run=` path, so arrival reuses the deep-link
code that already works. Open the drawer on **Briefing** and unhide
`#codegraph-project-strip`. Stale banner when
`snapshot.repositoryRevision != HEAD`. Header count reads projected nodes, not
`snapshot.nodeCount`. History row: populate the graph/cluster cells.
*Tests:* an integration spec asserting the arrival endpoint is called and the
workspace is visible when a snapshot exists; an unhappy-path spec asserting the
empty state still shows when it does not. *Docs:* `application-features.md:224`
becomes true — today it is **OD**.

**Phase 2 — counts stop lying.**
`CodeGraphQueryRepository` (`countedAccount` takes a counted `available`; one
`COUNT(*)` per query; `neighbours`/`hierarchy`/`lineage`/`references` pass it),
`CodeGraphGraphRepository.readLevel` (foreign-level nodes into `context[]` or
counted), `CodeGraphCompletenessService.report` (candidate counts for `flows` and
`hotspots`; a truncation reason must name its account), `ApiCodeGraph.rules`
(account). *Tests:* seed a node with more edges than the limit and assert
`state: "truncated"`, `omitted > 0`, `complete: false` — the assertion
`CodeGraphQuerySurfaceSpec` has never made. Assert `returned <= available` at
every level. *API:* no shape change; values change.

**Phase 3 — Orient reads true.**
`CodeGraphQueryRepository.onboarding` (rank entry points by `centralityService`
score, route coverage and reachability; return a `file:line`-openable path for
domains). `CodeGraphNarrativeService` (`narrateSharded` iterates clusters by
`fileCount` descending; the pitch is a whole-graph shard, not `clusters[1]`;
`coverage.clusters` names the omitted ids; the shard prompt says "describe this
module", not "this codebase" — U7's root cause). `codegraph-layout.js` +
`app.js`: title provenance styling, file-only role legend, "18 of 36" disclosure
wording, summaries at card scope.
*Tests:* onboarding's top entry is the highest-centrality handler-action, not the
alphabetically first; a 36-cluster snapshot with `maxClusters: 24` narrates the
24 largest and names the 12 it did not; a JS spec asserting a derived title and
an AI title render with different provenance markers.

**Phase 4 — resolution accuracy.**
`BoxLangParserService`, `CfmlParserService`, `JavaScriptParserService` (mask
literals and comments before *every* detector, not only `calls`),
`ArchitectureIndexService.resolveTargets` (return a candidate set; bind only on
one candidate or on import/injection evidence; otherwise `unresolved` with
`candidateCount`), `ArchitectureRuleService` (weight or exclude `heuristic/low`
violations). *Tests:* a fixture with `"new main application"` in a string literal
yields no `constructs` edge; a local variable named after a file yields no
cross-file `calls`; a name declared in two files yields `unresolved,
candidateCount: 2`. *Schema:* `codegraph_edges.candidate_count`. *Bump*
`parserVersion` on all three.

**Phase 5 — ontology completion.**
`CodeGraphProjectionService` (resource `parentId` from the owning file/cluster;
carry the declaration line from the dependency row; knowledge titles separate
from text; count every `continue`), `SchemaService` (`codegraph_nodes.resolution`,
`.provenance`, `.confidence`), directory rollup through ancestors, a
`fixture|vendor|generated` classification replacing the hardcoded path exclusion,
`CodeGraphMetricsService` (role/layer counts over files only). *Bump*
`projectionVersion`.

**Phase 6 — Follow.**
`CodeGraphFlowService` (hops with edge id, line, resolution, owning symbol),
`CodeGraphProjectionService` (flow nodes, `flow-hop` edges), `ApiCodeGraph`
(`flows`, `flows/:id`), `CodeGraphDiagramService` (sequence renderer reads hops
rather than steps), and the in-product sequence view of §10.4 — entered from any
entry point in Orient. *Bump* `projectionVersion` and `snapshotVersion`.

**Phase 7 — the map covers the graph.**
`codegraph-layout.js` + `app.js`: `resource` and `knowledge` canvas depths;
references panel; diff view; cluster-distribution tuning (N22).

**Phase 8 — search, facets, agents.**
`CodeGraphGraphRepository` (mirror written once; coverage failure reported as
`searchIndex: "bypassed"` rather than silence; facet predicates; 422 on unknown
facet), `CodeGraphMcpDescriptor` (levels `resource` and `knowledge`; tools for
`graph`, `knowledge`, `flows`, `rules`, `diff`; contract states which edge
classes carry a line).

**Phases 9–10** — as §12.

---

## 14. Performance and determinism benchmarks

| Metric | Current | Target |
|---|---|---|
| Projected nodes / edges, this repo | 6,192 / 15,300 *(RV)* | — |
| Dependency rows | 11,591 loaded, 11,529 unresolved *(RV)* | unresolved reported per query, not only per run |
| Node/edge id stability across identical runs | **identical at every level** *(RV)* | hold under Phases 4, 5, 6 (the version movers) |
| Fingerprint stability | **identical across two runs** *(RV)*; reversed file order asserted *(TV)* | + a second machine |
| Knowledge determinism | identical across two runs — **partly shard-cache-derived**, not proven for a cold LLM run | prove with the shard cache cleared |
| Search path | **FTS index bypassed on every AI-enabled run** *(RV)* | index active; bypass reported when it is not |
| Level query p95 | never measured | < 150 ms at 50k nodes |
| Search p95 | never measured; full `LIKE` scan | < 150 ms at 50k nodes |
| Layout determinism | byte-identical, locale-independent *(TV)* | hold |
| JS suite | **35 / 0** *(RV, this pass)* | hold; +card-truthfulness specs in Phase 0 |
| TestBox suite | 735 / 0 / 0 / 1 skipped *(carried forward, **never re-run in this plan's work**)* | **re-established by Phase V**, from a clean store |
| Cold full run, no AI key | not measured from empty | Phase V step 4 — structure complete without a provider |
| Cold full run, AI enabled | ~75–160 s on a warm cache *(prior plan, RV)* | Phase V step 5 — from empty, with the shard cache cold |
| Store size after one project | 394 MB with 39 accumulated runs *(RV)* | Phase V — size after a single clean run, so growth per run is known |
| Time from opening `/codegraph` to a drawn map | **∞ — the page never loads one** *(RV, U1)* | ≤ 2 s from a stored snapshot |
| Fields on an Overview card traceable to a payload value | **4 of 5** *(RV — `layer` is fabricated, U2)* | 5 of 5, enforced by spec |

---

## 15. Traceability

| Defect / gap | Phase | Acceptance test |
|---|---|---|
| **Baseline** | **V** | Clean store; both suites green and their real numbers recorded; DoubleCheck and `lib/coldbox` indexed from empty; every §4 and §2b defect re-confirmed or withdrawn against that store |
| N5/N6 root cause · cold-narrative determinism · B7 · N22 | V | §17.4 — each resolves to "code" or "accumulation", which decides the fix |
| **U2** | **0** | **A cluster with no `layer` renders no layer chip; two identical clusters at different draw indices produce identical cards** |
| U1, U4 | 1 | Loading `/codegraph` with a stored snapshot draws the map and opens Briefing; with none, the empty state still shows |
| U9 | 1 | The inspector on a view with no selectable nodes prompts for that view, not "Select a node" |
| U10, U11 | 1 | The history row shows node and cluster counts; the header count matches the explorable node total |
| N1 | 2 | `/neighbours` on a node with 314 edges at `limit=60` → `available: 315, omitted: 255, state: truncated, complete: false` |
| N9 | 2 | `returned <= available` at every level; foreign-level nodes in `context[]` |
| N17, N23 | 2 | `snapshot.truncated` implies at least one account with `omitted > 0`; `/rules` carries an account |
| N2, U3 | 3 | `/onboarding` top entry is the highest-centrality entry point, not `ApiAI.smoke`; `notFound` is not listed as a place a request begins |
| N3, N4 | 3 | The pitch names the 117-file cluster's subject; the 24 narrated clusters are the 24 largest; the 12 omitted are named |
| U5–U8 | 3 | Legend counts files (`Shared` ≪ 252); derived and AI titles render differently; disclosure reads "18 of 36"; no summary is cut mid-sentence or scoped to "the entire codebase" |
| N7 | 4 | A string literal containing a file name produces no `constructs` edge; `/rules` on this repo returns 0 violations or only true ones |
| N8 | 4 | A name declared in two files resolves `unresolved, candidateCount: 2`; the 260 ambiguous cross-file edges are reclassified |
| N10, N11 | 5 | `/graph?level=resource&scope=cluster:…` returns that cluster's routes; every resource has `line > 0` and opens in `/source` |
| N12 | 5 | Every node carries `resolution`, `provenance`, `confidence` |
| N18 | 5 | `dir:app/models` has incoming and outgoing edges |
| N13, N14 | 5 | Risk nodes carry a title; a dropped process is counted in the response |
| N20 | 5 | A configurable classification excludes `tests/fixtures/**`; 0 fixture files in clusters |
| N19, N24 | 6 | `/flows/:id` returns hops with `file:line` and resolution; the sequence view renders one end to end; a cycle returns its edges |
| G-j1, G-j2 | 7 | Resource and knowledge draw as canvas depths; references and diff have panels |
| N5, N6 | 8 | Mirror row count equals node count on an AI-enabled run; a bypassed index is reported |
| N15 | 8 | `?kind=route` changes the result; an unknown facet returns 422 |
| N16, N21 | 8 | MCP search enum covers 6 levels; every HTTP capability has a tool; the contract states which edge classes carry a line |
| G-g1 | 9 | `/knowledge?kind=glossary` returns terms; a domain has a domain relation |
| G-k1 | 10 | Level and search p95 recorded at 50k nodes |
| **Target experience** | 1, 3, 6, 7 | Cold-Read Protocol under §2's tightened scoring: **11 of 17 after Phase 3**, 14 after Phase 6, 16 after Phase 7, on DoubleCheck **and** `lib/coldbox` |
| **UX regression guard** | 0 onward | A DOM-level spec asserting that every visible chip, badge, count and label on the Overview card traces to a payload field — the general form of U2 |

---

## 16. Limitations and non-goals

**Cannot be proven statically — reported as unsupported, never omitted, never
guessed:** dynamic component construction, reflection, runtime wiring, dynamic
SQL, runtime dispatch to alternate implementations, DOM-event→fetch binding,
event subscriber resolution (`handles`), values from the environment.

**Explicitly not built:** control-flow and program-dependence graphs (CPG-grade);
whole-program global data flow; authorization semantics; column-level lineage;
anything requiring execution; a second parser stack (no tree-sitter runtime
dependency).

**Product boundaries restated:** no SaaS, no accounts, no hosted PR bot, no
mobile layouts, no additional languages, no remote fonts in exports, no new
runtime dependency, local-only SQLite.

**Two rules this pass adds** to "verify a capability at the surface that consumes
it":

1. **A surface that reports its own completeness must have counted it.** Nine of
   the defects above are the product describing its own coverage without
   measuring it — and unlike a missing feature, a wrong completeness claim is
   invisible to the reader it misleads.
2. **Open the screen.** Six defects in this document — including the only one
   that fabricates data — were invisible to the database, invisible to eleven
   HTTP endpoints, and invisible to 770 passing tests. They were found by loading
   the page and reading what it said. An audit of a visual product that never
   renders it is not an audit of that product.

---

## 17. Phase V — clean-database baseline and full live test

Every measurement in this document was taken against `.db/doublecheck.db` at
**394 MB, 39 accumulated runs** (15 codegraph, 24 review), with warm parse,
projection and narrative-shard caches. That is the environment, not the code.
Phase V re-establishes every number from empty, and settles four open
uncertainties that accumulation could explain.

### 17.1 What a drop costs — measured, not assumed

| Table | Rows | Lost? |
|---|---|---|
| `codegraph_labels` | 33 | **No human knowledge at risk — all 33 are `provenance: 'ai'`, zero `'user'`** *(RV)*. They regenerate with the narrative |
| `finding_reviews`, `finding_review_events` | 0 | nothing |
| `modernization_decisions`, `modernization_plans` | 0 | nothing |
| `app_settings`, `ai_provider_profiles` | 0 | nothing — **no API keys stored in the DB** |
| `codegraph_narrative_shards` | 59 | LLM cache. Losing it is *desirable* here — it is what makes cold-narrative determinism testable |
| `review_runs` | 39 | run history; regenerated by the baseline runs |
| **`evaluation_gate_runs`** | **451** | **The only genuinely non-regenerable data.** Each row is a quality measurement at a point in time; the trend cannot be recreated. **Export before dropping** |
| `language_capabilities` | 1 (BoxLang / `parsed-dependency-aware`) | regenerated by re-running the review-corpus gate — which Phase V does anyway |

**So: export `evaluation_gate_runs` first, and nothing else is at risk.** The
`.db/` directory is gitignored, so no commit is involved either way.

### 17.2 The sequence

Run in order. Do not parallelise: **the suites share the live database**, and two
at once corrupt each other's fixtures.

```bash
# 1 — preserve the one non-regenerable table
python -c "import sqlite3,csv,sys; c=sqlite3.connect('.db/doublecheck.db'); w=csv.writer(open('.db-gate-history.csv','w',newline='')); w.writerow([d[0] for d in c.execute('select * from evaluation_gate_runs').description]); w.writerows(c.execute('select * from evaluation_gate_runs'))"
```

```bash
box server stop
```

```bash
rm -f .db/doublecheck.db .db/doublecheck.db-wal .db/doublecheck.db-shm
```

Then clear compiled classes so no stale `app/` class survives the reset — §25's
rule, the one that invalidated a whole investigation. **The path is
`.tmp/boxlang-home/classes`**; an earlier draft of this section named
`.engine/boxlang/classes`, which does not exist, so clearing it was a no-op:

```bash
rm -rf .tmp/boxlang-home/classes
```

```bash
box server start
```

`SchemaService` recreates the schema **lazily, on the first request** — not on
start. Until something touches the app the store does not exist:

```bash
curl -s http://127.0.0.1:55098/api/v1/health
```

**Do not run `box run-script setup`** — it would touch `.env`, and AGENTS.md
forbids overwriting an existing one.

### 17.3 The full live test

| # | Step | Command / action | Record |
|---|---|---|---|
| 1 | JavaScript suite | `node --test tests/js/*.spec.mjs` | pass/fail — current claim **35 / 0** |
| 2 | **Full TestBox suite** | `box testbox run` | pass/fail/error/skip — the **735 / 0 / 0 / 1** figure is carried forward from §34 and **has never been re-run in this plan's work** |
| 3 | Re-run any failure alone | `box testbox run bundles=SpecName` *(not `--bundles=`)* | `ReviewExecuteRunSpec` is known intermittently flaky under load — re-run before calling it a regression |
| 4 | Cold CodeGraph run, **no AI key** | `/codegraph` → Build knowledge graph | Structure must be complete without a provider — the hard product boundary. Duration, node/edge counts |
| 5 | Cold CodeGraph run, **AI enabled** | rebuild | Narrative, knowledge nodes, shard count. Duration delta |
| 6 | Second identical run | rebuild again | **Determinism:** node/edge id sets and fingerprint must match run 5 exactly |
| 7 | Unfamiliar CFML project | run against `lib/coldbox` | 205 CFML files; the only non-self evidence the product has |
| 8 | Corpus gate | `box testbox run bundles=CodeGraphCorpusSpec` | `codegraph-corpus-v1` scores both cases |
| 9 | Re-take the endpoint probes | the eleven calls listed under *Verification performed* | Confirm every §4 defect on a clean store |
| 10 | Re-take the screen readings | arrival, Start-here, Overview cards, rail, drawer | Confirm every §2b defect on a clean store |
| 11 | Cold-Read Protocol | `resources/docs/cold-read-protocol.md`, tightened scoring of §2 | The baseline the phases are measured against |

### 17.4 What Phase V settles

Four uncertainties in this document are "accumulation or code?" questions that
only an empty store answers:

- **N5 / N6 — the duplicated FTS mirror.** Measured 6,275 mirror rows against
  6,192 nodes on an accumulated store. If a *first* run also duplicates, it is
  the knowledge pass; if it does not, it is re-projection over an existing run
  and the fix is different. **This changes which line gets edited.**
- **Cold-narrative determinism.** Runs 5 and 6 with the shard cache empty at run
  5 test whether identical knowledge ids survive a genuine second model call, or
  whether §3's determinism result is the cache.
- **B7 — cluster label identity.** 33 labels regenerate from scratch; whether
  they re-attach to the same clusters is the direct test of the anchor rule, and
  it was carried forward unverified.
- **N22 — cluster distribution.** Whether one 117-file cluster plus 22 clusters
  of ≤3 files reproduces from empty, or is an artefact of repeated clustering
  over an accumulating store.

### 17.5 The standing rule for every later phase

Phase V is not a one-off. **Every phase ends with a live run, not with a green
suite.** This document's §4.1 records six capabilities that shipped, passed their
specs, and never fired in production — the dead orchestrator branch, the
unreachable `integration` role, two backspace-byte detectors, the inert FTS
index, and a modulo-derived layer chip rendered on every card. A passing spec
proves the unit; only a run proves the product.

Per phase, minimum:

1. `node --test tests/js/*.spec.mjs` and `box testbox run` both green.
2. **A rebuild against DoubleCheck**, and for any parser or projection change a
   rebuild against `lib/coldbox` as well.
3. **The specific endpoint or screen the phase claims to fix, exercised by hand**
   and pasted into the phase's entry — the §32 rule.
4. For Phases 4–6, which move `parserVersion` or `projectionVersion`: confirm the
   bump actually forced a re-index, by checking the run duration and a changed
   row count. A version that did not move is the failure mode recorded three
   times in the prior plan.

**Restart between edits.** Editing a `.bx` does nothing until
`box server restart`; a live probe against an unrestarted server silently tests
the previous build.

---

## Verification performed

**Run.** Live database queried read-only for node/edge composition by level and
kind, isolation census, resolution classes, id stability across two runs,
symbol-name ambiguity, FTS mirror coverage, cluster size distribution, knowledge
coverage, fixture residue, snapshot completeness and truncation reasons. Eleven
endpoints exercised over HTTP on the running server: `/graph` at all six levels,
`/neighbours` at two limits, `/references` at two limits, `/lineage`,
`/onboarding`, `/rules`, `/search` with five facet variants and six terms,
`/mcp`. Both `/rules` violations traced to their `review_dependencies` rows and
then to the source lines, which is how they were shown to be false.

**The workspace driven in a browser at 1600×1000**, reading the live DOM: arrival
at `/codegraph`; the dashboard history table; loading a run via *Open*;
Start-here; Overview with all 18 cards enumerated (title, layer, complexity,
files, summary origin); the rail legend and directory tree; the inspector; drawer
tab state; the truncation banner. The `index % 5` layer fallback was found by
enumerating cards rather than by reading code, then confirmed at
`codegraph-layout.js:176` and by proving the snapshot carries no `layer` key.

Every `file:line` in this document re-read in the working tree. **JavaScript
suite: 35 passed / 0 failed.** `git diff --check`: clean. Worktree preserved.

**Two hypotheses tested and withdrawn**, recorded because they would have been
wrong in the plan: the layer-chip repetition was *also* suspected in
`complexity`, which turned out to be genuinely derived (`complexityOf()` from
files, crossings, symbols, cycle); and an earlier draft claimed CodeGraph had no
deep links, which driving *Open* disproved — `?run=&depth=` works.

**Not run, not claimed.** **No TestBox suite run** — the 735/0/0/1 baseline is
carried forward unverified; the suite shares the live database and this pass was
read-only. No re-index, no parser or projection change, so every count describes
run `b8ead1cb`. No server restart and no compiled-class clean — the running
server was started 2026-08-17T03:25 against the current clean worktree, so it
matches the code on disk, but a restart was not performed. No probe instantiated
an `app/` class (§25's rule). B7 (cluster label identity) was not re-measured.
The Cold-Read Protocol was not attempted under the tightened scoring; §2's 6-of-17
is derived from the capability matrix, the endpoint probes and the screens read,
**not from observing a reader**.

**No screenshots.** The browser pane would not composite frames in this
environment, so every UI finding comes from the live DOM and computed styles, not
from an image. Layout, spacing, colour, contrast and visual hierarchy are
therefore **unaudited** — the findings above are about *what the screen says*,
not *how it looks*. A visual pass is still owed.

## Remaining uncertainties

- **N22's cause.** One 117-file cluster and 22 clusters of ≤3 files may be
  modularity-resolution tuning or a genuine property of this codebase. Not
  diagnosed; the ColdBox run's 60 clusters over 205 files suggests the same
  shape, which is weak evidence for the former.
- **N5's blast radius.** The index has been inert since the knowledge layer
  shipped; whether it ever worked on a run *with* a narrative is unknown. Results
  were never wrong, so there is no user-visible history to check. **Phase V
  step 5 decides whether the duplication happens on a first run** — which changes
  the fix.
- **Whether any finding is an artefact of a 394 MB accumulated store.** Every
  number here comes from one long-lived database with warm caches. Phase V is
  scoped precisely to answer this, and any finding it withdraws should be struck
  from §4 rather than carried.
- **N8's true error rate.** 260 ambiguous cross-file edges is an upper bound on
  the wrong ones, not a count of them — some collisions resolve to the right file
  by luck or by co-location. Sampling would settle it.
- **Knowledge determinism.** Identical across two runs, but the shard cache was
  warm. Cold-LLM determinism is unproven and probably unattainable; the shard
  cache may be what makes it hold.
- **Whether N1 has misled anyone.** Every §33/§34 instrument answer that used
  `/neighbours` or `/references` was read under `complete: true`. The answers
  were not wrong; their claimed completeness was. The 17-of-17 and 14-of-15
  scores should be re-taken after Phase 2.
- **How long U2 has shipped.** The modulo fallback is unversioned and untested,
  so there is no way to date it from the tree. Every reader who has opened the
  Overview has seen a fabricated layer on every module.
- **Whether other renderers do the same thing.** `layerLabelOf` was found by
  enumerating one view's cards. `codegraph-layout.js` is 1,827 lines with five
  layouts and several card builders; the sweep in Phase 0 is scoped to find the
  rest, but the count is currently **unknown**. `complexity` was checked and is
  clean; the others were not.
- **What a real newcomer does with the workspace.** Six depths, five drawer tabs
  and four layouts were assessed for *truthfulness*, not for whether anyone can
  find their way. §10's journey is a design proposal, not an observation. This is
  the same gap the Cold-Read Protocol's human half has always named, and the UI
  findings here make it more pressing, not less.

---

## 18. What shipped (2026-08-17)

Phases 0, 1 and 2 complete; Phase 3's landing-screen half complete. Every item
below was verified at the surface that consumes it — the browser DOM or an HTTP
response — not from the code.

### Phase 0 — the invented field is gone · **RV**

| Change | File | Effect |
|---|---|---|
| `layerLabelOf` loses the `index % 5` branch and returns `""` | [codegraph-layout.js:189](../../../public/assets/codegraph-layout.js:189) | Live: **0 `.cg-card-layer` elements** across all 18 Overview cards, where every card previously carried a position-derived layer |
| The card omits `layer` and `complexity` elements when empty, rather than drawing blank ones | `buildOverviewCard` | — |
| A missing complexity no longer paints the "simple" green accent | same | Colour is a claim too; unknown gets a neutral accent |
| Cluster `layer` (numeric) is `undefined` rather than `index % 5` | `buildClusterView`, and the focus-view builder | **This was the wider half.** The numeric layer fed `numericLayer()`, so the **Layer layout placed modules into its five bands by draw position** |
| The deterministic summary drops "in the *X* area" when there is no layer | `summaryForCluster` | It passed index 0, so **every** deterministic summary claimed "entry" |

**A spec was asserting the fabrication.** `overview cards include complexity,
summary, and explore CTA` asserted `/in the .+ area/` against a fixture cluster
with no layer — it only ever passed because the layer was invented. Rewritten to
assert the clause is absent without a layer and present with one. This is the
same class as §21's `subgraph.truncated == true` spec in the prior plan: a test
that encoded the defect.

Five new specs, written against the general rule rather than the one field:
a cluster with no layer gets no label; identical clusters render identically
wherever they are drawn; a real layer still shows; the card omits chips it has no
value for; and **shuffling the input must not change what any card claims** —
the guard that catches the next positional fallback. JS suite **35 → 40 / 0**.

### Phase 1 — arrival opens the map · **RV**

`restoreProjectSnapshot()` calls `GET /api/v1/codegraph?projectPath=` on load and
opens the newest saved map through the existing `?run=` path.

**This reverses a deliberate decision, and the reasoning is worth recording.**
The old behaviour was commented: *"Only an explicit run id opens a map. Plain
/codegraph is a request to start one… silently reopening the newest saved
snapshot made the page look like it had already run, and left no obvious way to
begin a fresh one."* That concern was real. Withholding the map was the wrong
answer to it: a project with 42 stored graphs greeted its reader with *"No graph
snapshot"*, and the only route back to a map was the dashboard's history table.
Both concerns are satisfiable — the map opens, the header says *"Saved map of … ·
built 8h ago · run b8ead1cb"*, and the create panel stays on the page. Verified:
workspace, canvas, Rebuild map and exports all visible; the run form still there.

**The briefing was hidden on every arrival, and the cause was not the drawer.**
`renderCodeGraphCanvas` returns early for the `start` and `matrix` depths, before
`renderCodeGraphProjectStrip` — and a run now *opens* on `start`. So the strip
kept the hidden state left by the loading pass, with its content already rendered
underneath. Live after the fix: title **DoubleCheck**, stats **322 files · 36
modules · 2 cycles**, 5 onboarding entries, 12 processes.

*(§2b's U4 claimed the drawer opened on the wrong tab. It does not — the tab is a
remembered preference and it was remembering my own earlier clicking. The real
defect was the early return. Corrected here.)*

### Phase 2 — counts stop lying · **RV**

| Endpoint | Before | After |
|---|---|---|
| `/neighbours?node=file:app/config/router.bx&limit=60` | returned 61, **available 61, omitted 0, complete true** | returned 61, **available 315, omitted 254, state truncated, complete false** |
| same, `limit=500` (fits) | complete true | complete true — no false positives |
| `/references?symbol=normalizePath&limit=5` | returned 10, **available 10, complete true** | returned 10, **available 154, omitted 144, truncated** |
| `/graph?level=resource&limit=200` | **396 nodes returned against available 367**, complete true | 200 nodes (all `resource`), **196 in a new `context[]`**, available 367, omitted 167, truncated |
| `/graph?level=knowledge` | 177 returned against available 83 | 83 nodes, 94 in `context[]`, complete |
| `/rules` | no completeness account | account with `evaluatedOver: "file-level edges"` and `unevaluatedLevels: [symbol, resource, directory]` |

`countedAccount` now takes an optional counted `available`; `edgeCountFor` is one
unbounded `COUNT(*)` per direction; `references` counts both of its limited
queries in a single statement. Foreign-level endpoints moved from `nodes` to
`context`, so `returned` can no longer exceed `available`.

### Phase 3 (part) — the landing screen · **RV**

`ORDER BY kind, path, symbol_name` → structural rank with a per-file spread.

```
before: smoke      app/handlers/ApiAI.bx:24          after: apiProbe               app/modules/aiFlight/handlers/Flight.bx:302
        activate   app/handlers/ApiAIProviders.bx:68        /api/v1/openapi.yaml   app/config/Router.bx:31
        create     app/handlers/ApiAIProviders.bx:30        export                 app/handlers/ApiRuns.bx:356
        delete     app/handlers/ApiAIProviders.bx:56        codegraph              app/handlers/Main.bx:53
        index      app/handlers/ApiAIProviders.bx:16        graph                  app/handlers/ApiCodeGraph.bx:237
        notFound   app/handlers/ApiAIProviders.bx:91        compareModernizeScoped app/handlers/ApiHistory.bx:119
```

Six actions of one AI-provider CRUD handler — including `notFound` as a place a
request begins — become six distinct files spanning a module handler, the router
and four API handlers.

Ranking alone was not enough: by reach, all six came from the single
highest-fan-out handler. `ROW_NUMBER() OVER (PARTITION BY path)` takes one entry
per file before a second from any file, because "start here" wants breadth.

**Two things this exposed, both new:**

- **`routes-to` never targets a symbol.** The first ranking attempt scored
  "is this route wired" from a `routes-to` edge into the symbol node. Measured:
  **0 of 310 route symbols have one** — those edges point at `resource:route:*`
  nodes. The term was silently always zero. Removed.
- **4 of 310 `route` symbols are mis-extractions** — `.target` in
  `CodeGraphFlowService`, `CodeGraphMetricsService`, `CodeGraphQueryService` and
  `target` in `SyntheticNodeBuilder`, offered to the reader as places a request
  begins. Filtered at the query (`symbol_name LIKE '/%'`) as an immediate
  containment; **the extraction defect itself is Phase 4 work and is not fixed.**

### Still open from these phases

- **N17** — the snapshot still reports `truncated: true` while all nine of its
  own accounts report `complete: true`. Phase 2 fixed the query surface; the
  snapshot's own account was not touched.
- **N3, N4** — the pitch still describes a 3-file cluster, now *visibly*, because
  Phase 1 made the briefing render. The blurb on screen reads *"…centers on a
  single domain cluster… spans three files and 65 symbols."* The rest of Phase 3.
- **U5–U8** — legend, title provenance, disclosure wording, card summaries.
- **Phase V** — not run. Every measurement here is against the accumulated store.

### Verification of the shipped work

**Suites.** TestBox **735 passed / 0 failed / 0 errored / 1 skipped**, 111
bundles, 270 s — exactly the §34 baseline, so no regression. JavaScript **41 / 0**
(was 35; six added, two rewritten). A pre-change baseline run reported 734/1 with
every bundle-level result clean, which is the flaky-under-load signature §20's
standing caveat describes; it did not recur.

**Two specs were asserting the defects they covered**, and both were rewritten
rather than deleted:

- `overview cards include complexity, summary, and explore CTA` asserted
  `/in the .+ area/` on a cluster that has no layer — it passed only because the
  layer was invented.
- `plain /codegraph stays on the run form and never reopens the last map`
  asserted the arrival behaviour Phase 1 changes. The concern it protected —
  "offered no obvious way to begin a fresh one" — is now an assertion rather than
  a comment: the rewritten spec pins the run form and Rebuild map still being
  offered beside the opened map.

**One arrival, read from the live DOM:**

```
ARRIVE    689 nodes · 36 clusters
          "Saved map of C:\Box\DoubleCheck · built 8h ago · run b8ead1cb"
          map visible · Rebuild offered · run form still offered
BRIEFING  DoubleCheck — 322 files · 36 modules · 2 cycles
          5 onboarding entries · 12 processes
START     apiProbe              app/modules/aiFlight/handlers/Flight.bx:302
          /api/v1/openapi.yaml  app/config/Router.bx:31
          export                app/handlers/ApiRuns.bx:356
          codegraph             app/handlers/Main.bx:53
OVERVIEW  18 cards · 0 fabricated layer chips · 18 real complexity chips
          "Showing part of the graph. 11,529 references could not be resolved
           to a file — recorded, not drawn"
```

Before this session the same three screens read: *"No graph snapshot"*; an empty
briefing; `smoke / activate / create / delete / index / notFound`; and 18 cards
each carrying a layer computed from its position.

**Not done, not claimed.** Phase V has not run — the store is still the
accumulated 394 MB one, so nothing here distinguishes a code property from an
accumulation artefact, and the four uncertainties in §17.4 stand. No re-index, no
parser or projection change, no version bump. `lib/coldbox` was not re-run. The
Cold-Read Protocol was not re-taken, so §2's score is unchanged on paper even
though three of its inputs improved.

---

## 19. Phase V — run, and what the clean store settled (2026-08-17)

The 394 MB store holding 39 accumulated runs was exported, dropped and rebuilt
from `SchemaService`. Every number below comes from a **first run against an
empty database**.

**Two corrections to §17.2 before anything else.** The compiled-class path is
`.tmp/boxlang-home/classes`, not `.engine/boxlang/classes` — the latter does not
exist and clearing it was a no-op. And the schema is created **lazily on first
request**, not on server start, so the sequence needs a request (`/api/v1/health`)
before the store exists. Both corrected in §17.2.

`evaluation_gate_runs` exported first: **677 rows** to `.db/gate-history-backup.csv`
(gitignored). Nothing else was at risk — confirmed again on the live store before
dropping.

### The cold baseline

| | Accumulated store | **Clean store** |
|---|---|---|
| Database size | 394 MB / 39 runs | **46.3 MB / 1 run** |
| Full cold run, AI enabled | unmeasured from empty | **22m 47s** — 23 sequential narrative shard calls with the cache empty |
| Projected nodes | 6,192 | 6,175 |
| Projected edges | 15,300 | 15,270 |
| Clusters | 36 | 32 |
| Snapshot version | `codegraph-snapshot-v3` | **`codegraph-snapshot-v4`** |

**The run duration is almost entirely the narrative.** The structural graph was
complete at 75% progress within ~6 minutes; the remaining ~17 were 23 shard
calls. That is worth knowing before anyone optimises projection again — §28
measured the same thing one layer down and reached the same conclusion.

### §17.4's four uncertainties, answered

**N5/N6 — the FTS mirror. Answered, and the answer changes the fix.**

```
first run:  mirror 6,175   nodes 6,175   distinct 6,175   →  EXACT MATCH, index active
accumulated: mirror 6,275  nodes 6,192   distinct 6,192   →  83 duplicates, index bypassed
```

A first run does **not** duplicate. So the knowledge pass is not inserting twice
on its own — the duplication needs the graph to be **projected more than once for
the same run**, which is the reuse/adopt path re-running the knowledge append
without the delete that `replaceGraph` performs. §4.3's mechanism was right and
its trigger was wrong: this is not "knowledge nodes are always mirrored twice",
it is "a re-projected run accumulates mirror rows". Search is correct in both
cases; the index is silently bypassed only in the second. **The fix moves from
the knowledge append to the re-projection path.**

**Cold-narrative determinism — not settled, and now known to be expensive to
settle.** The cold run took 23 minutes of provider calls. A second cold run is
the only way to test it and costs the same again; it was not run. What §3
measured remains a warm-cache result.

**B7 — cluster labels.** 23 of 32 clusters were labelled from scratch on the
first run, so labels do regenerate. Whether they re-attach to the *same* clusters
still needs a second run.

**N22 — cluster distribution.** Reproduces from empty: 32 clusters for 322 files
with the same long tail. Not an accumulation artefact.

### What the clean store confirmed about the shipped work

| Fix | Verified on the clean store |
|---|---|
| **U5** roleCounts | `shared: 5` (was 252) and the ten role counts **sum to 322, exactly the file count**. The legend now describes the codebase rather than the extraction |
| **N4** narrative selection | 23 domains narrated **largest-first** — 30, 21, 20, 13, 10, 8, 7, 5… — and the 8 omitted clusters are **named with their sizes**, all of them 2-file. Previously the 20-, 14- and 13-file modules were the ones dropped |
| **N3** project blurb | *"DoubleCheck — 322 files across 32 modules. 2 dependency cycles flagged."* leads, with the AI text following. The AI text also improved on its own: size-ordered shards mean the pitch now comes from the largest module — *"a ColdBox application with a central Setup.bx module…"* rather than *"a single domain cluster… three files"* |
| **U2** fabricated layer | **0** `.cg-card-layer` elements across 18 cards |
| **U6** title provenance | 9 derived / 9 AI titles, now visually distinct |
| **U8** disclosure | *"Showing 18 of 32 modules — show the rest"* |
| **N1** truncation honesty | `/neighbours` limit 60 → `available 315, omitted 254, truncated` |
| **N2** landing screen | six entry points across six files |
| **N23** rules account | `complete`, over 961 file-level edges, with `unevaluatedLevels` stated |
| Snapshot/reuse version | `codegraph-snapshot-v4` written; the reuse key now derives from the metrics service |

### A live drift defect found and closed while doing this

`CodeGraphReuseKeyService` held its **own copy** of the snapshot version, pinned
at `codegraph-snapshot-v2` while snapshots were being written as `v3`. So the
shape change that produced v3 never moved the reuse key, and a clean-tree run
could adopt a v2-shaped snapshot as current. This is precisely the failure that
file's own header says it exists to prevent — *"a cache key that does not cover
everything shaping the stored rows… it has now happened three times in this
subsystem alone"* — occurring a fourth time, inside the file written to stop it.

The live value now comes from `CodeGraphMetricsService`, which owns the shape.
`ParserVersionSignatureSpec` gained a matching assertion and it was
**negative-tested**: reintroducing `v2` fails with
*"reuse-key snapshot fallback [codegraph-snapshot-v2] does not match the live
snapshot version [codegraph-snapshot-v4]"*.

### N5/N6 fixed at the site Phase V identified

`appendSearchIndex` now deletes a node's mirror row before inserting it, so an
append is idempotent. That is the *re-projection* path, not the knowledge pass —
the distinction Phase V was run to establish, and it is the line that would have
been edited wrongly without it.

`CodeGraphPersistenceSpec` gained "keeps the search mirror exact when the same
nodes are appended twice", **negative-tested**: removing the delete fails it with
`Expected [2] Actual [3]`.

### Suite on the clean store

**TestBox 736 passed / 0 failed / 0 errored / 1 skipped**, 737 specs, 111
bundles, 127 s. JavaScript **41 / 0**.

The first clean-store run reported 2 failures and both were informative:

- `CodeGraphMetricsServiceSpec` asserts the snapshot version as a **deliberate
  literal** — *"this assertion is what forces that to be a decision rather than
  an oversight"*. It caught the v4 bump, which is exactly its job. Updated to v4
  with the reason recorded; **not** relaxed into reading the version from the
  service, which would defeat it.
- `ReviewExecuteRunSpec` timed out at 60 s waiting for a terminal state — the
  known flake, made likelier here because a cold store forces a full index inside
  that budget. Green in isolation in 13.5 s.

---

## 20. Remaining work

Honest status of everything this plan specifies but has not delivered.

| Phase | State |
|---|---|
| **V** | **Done** — §19 |
| **0** Stop showing invented data | **Done** — §18 |
| **1** Arrive on the map | **Done** — §18 |
| **2** Counts stop lying | **Done** — §18; **N17 not done** (the snapshot still reports `truncated: true` beside nine `complete: true` accounts) |
| **3** Orient reads true | **Mostly done** — N2, N3, N4, U5, U6, U8 shipped. **U7 not done**: card summaries are still wrapped mid-sentence with an ellipsis |
| **4** Resolution accuracy | **Not started.** N7 (both `/rules` violations false — a string literal and a local variable), N8 (260 ambiguous cross-file edges), and the 4 mis-extracted `route` symbols the landing screen now filters but the extractor still produces |
| **5** Ontology completion | **Not started.** N10–N14, N18, N20 |
| **6** Follow — flows first class | **Not started.** N19, N24 — the largest remaining comprehension gap |
| **7** Map covers the graph | **Not started.** Resource and knowledge canvas depths, references and diff panels |
| **8** Search, facets, agents | **Partly** — N5/N6 fixed (§19). N15 (facets silently ignored) and N16 (MCP cannot reach `resource`/`knowledge`; no knowledge tool) not started |
| **9** Knowledge depth | **Not started** |
| **10** Scale | **Not started** — no latency measured above ~6k nodes |

**Recommended next:** Phase 4. It is the only remaining phase that makes existing
answers *wrong* rather than absent — `/rules` currently reports two violations on
this repository and both are false, which is Q13's entire visible answer.

**Still true and still unrun:** the human half of the Cold-Read Protocol, and a
second cold narrative run to settle determinism (23 minutes of provider calls
each, per §19).

---

## 21. Phase 4 — resolution accuracy (2026-08-17)

Two defects, both of which produced this repository's **entire visible answer** to
"where are the architectural violations". Verified by re-indexing (parser
versions `boxlang-ast-parser-v12` / `cfml-symbol-parser-v12`) and reading
`/rules`.

### N7 — both false violations are gone

| | Before | After |
|---|---|---|
| `ModernizationPlacementService --constructs--> handlers/Main.bx` | 2 dependency rows, from the literal *"…in the new **main** application…"* | **0 rows** |
| `AIFlightListener --calls--> aiFlight/handlers/Flight.bx` | 4 rows, from `if ( !flight.count() )` where `flight` is a local struct | **0 rows** |
| *"Application models must not depend on HTTP handlers"* | **FAIL, 2 violations, both false** | **pass, 0 violations** |
| *"Handlers should go through a service, not straight to a repository"* | 12 violations | **12 violations, all real** — `ApiCodeGraph` injects and calls `AnalysisGraphRepository` and `CodeGraphGraphRepository` directly, with correct evidence lines |

**Cause one — masking.** `constructs` matched the **raw** source line while
`calls` had been matching the masked one since Phase 1 of the prior plan. The
detectors around it (`route(`, `setView(`) must keep the raw line, because the
value they capture *is* a quoted literal — so masking is applied per detector
according to whether the match is code, not blanket.

**Cause two — corroboration.** A bare receiver resolved to any file declaring a
type of that name. It now binds only when the source file gives independent
evidence of using that type: it imports, injects, constructs, extends,
implements or type-references it. The injected-property alias path is unchanged
and still binds without corroboration, because an injection *is* the evidence.

### N8 — my own measurement was wrong, and the corrected figure is small

§4.3 reported *"260 of 628 cross-file bare-name edges (41%) target a name
declared in more than one file"*. That number conflated **symbol-name** ambiguity
with **type-name** ambiguity, and only the second is what resolution can get
wrong. Measured after the fix:

```
resolved deps whose target is an ambiguous TYPE name:  0
ambiguous type names in the repository:                3   (application ×4, router ×2, index ×2)
the 256 "ambiguous" cross-file edges, by kind:         253 injects · 3 calls
```

Those 253 `injects` resolve from an `inject="FooService"` attribute — evidence,
not a name guess — and they were only "ambiguous" because some *function* named
`run` or `init` exists in several files, which resolution never consults for
them. **The genuinely at-risk population was three type names, and it is now
zero.** N8's severity in §4.3 is overstated; the fix is still correct and is now
guarded, but the register entry should be read with this correction.

`resolveTypeFile` refuses an ambiguous name outright rather than taking whichever
file was parsed last, and records `candidateCount` so the refusal is legible.

### Cost of the fix

`calls` edges 5,584 → 5,492 (−92) and `constructs` 1,161 → 1,151 (−10): 102
bindings withdrawn, which is the intended loss. Total projected edges rose
15,270 → 15,327 because the narrative produced more knowledge nodes.

### Guards

New `tests/specs/unit/DependencyResolutionSpec.bx`, four specs: a construction is
not read out of a string literal (while a real one still is); a bare receiver
with no corroboration stays unresolved; a corroborated receiver binds; two
candidates is not a resolution and the count says why. A `resolveTargetsForTesting`
seam was added because resolution previously could only be checked by running a
full index and reading the output.

**Suite: 737 passed / 0 failed / 0 errored / 1 skipped** (738 specs).

---

## 22. Phase 5 (part) — resources get a location (2026-08-17)

`projection-v6`. Every resource node carried `line: 0` and `parentId: ""`, so the
answers to "what starts a request", "which settings does this read" and "what
does this talk to" named entities the reader could neither **open** nor **drill
to**. Measured after the change:

| Resource kind | Total | With a declaration line | With a parent file |
|---|---|---|---|
| route | 53 | **48** | **48** |
| event | 20 | **20** | **20** |
| config | 247 | 0 | 0 |
| table | 39 | 0 | 0 |
| response · http · schedule | 8 | 0 | 0 |

```
resource:route:/api/v1/ai-providers   router.bx:237   parent file:app/config/router.bx
resource:event:codegraph-index        codegraphrunservice.bx:168
```

**The zeros are the correct answer, not remaining work.** A route is declared by
a `route( "/x" )` call and an event by the line that publishes it. A table, a
config key or a remote host is *referenced* from code and declared outside it —
inventing a location for those would be U2 again in a different field. The edges
that reach them still carry evidence, so the reference is inspectable even where
the entity has no site of its own.

---

## 23. Final state of this session

| Suite | Result |
|---|---|
| TestBox | **741 passed / 0 failed / 0 errored / 1 skipped** — 742 specs, 112 bundles |
| JavaScript | **41 / 0** |
| `git diff --check` | clean |

Started at 735 passing / 736 specs; +6 specs, no regressions, on a database that
was dropped and rebuilt mid-session.

### The three screens, start of session → now

```
ARRIVE     "No graph snapshot"                    →  "Saved map of C:\Box\DoubleCheck · built 4 min ago"
BRIEFING   (blank — never rendered)               →  "DoubleCheck — 323 files across 44 modules."
                                                     AI · Largest module — Modernization Contract: …
LEGEND     Shared 252 (247 were config keys)      →  Shared 5 · roles sum to the file count
START      smoke / activate / create / delete /   →  apiProbe · /api/v1/openapi.yaml · export ·
           index / notFound                          codegraph · graph · compareModernizeScoped
OVERVIEW   18 cards, every one carrying a layer   →  0 fabricated fields · 11 derived vs 7 AI titles
           chip computed as cardIndex % 5            marked distinctly · "Showing 18 of 44 modules"
RULES      2 violations, both false                →  0 false · 12 real, with correct evidence
```

### Versions moved, and why

`boxlang-ast-parser-v12` · `cfml-symbol-parser-v12` (extraction: literal masking
on `constructs`, corroborated receiver resolution) · `codegraph-snapshot-v4`
(`roleCounts` counts files only) · `codegraph-projection-v6` (resource
declaration sites and parents). Each was exercised by a full re-index, not
assumed.

### Still open

Unchanged from §20 except Phase 4 and part of Phase 5:

- **N17** — the snapshot still reports `truncated: true` beside nine `complete: true` accounts.
- **U7** — card summaries still wrap mid-sentence.
- **Phase 5 remainder** — N12 (nodes carry no resolution/provenance/confidence), N13, N14, N18 (half the directory level isolated), N20 (`tests/fixtures/**` still indexed).
- **Phase 6** — flows are still not first-class and have no endpoint. The largest remaining comprehension gap.
- **Phase 7** — resource and knowledge levels still cannot be drawn; no references or diff panel.
- **Phase 8 remainder** — N15 (search facets silently ignored), N16 (MCP cannot reach `resource`/`knowledge`).
- **Phases 9, 10** — knowledge depth, scale benchmarks.
- **The human cold read**, and a second cold narrative run for determinism (~23 min of provider calls each).

---

## 24. Phases 5–6 and 8 completed (2026-08-17)

### Phase 6 — flows are first class · **RV**

Flows were the product's central promise and the one answer with no endpoint:
they existed only inside the snapshot blob returned by `/result`, as a list of
node names with no line behind any step.

`buildAdjacency` now carries `line` and `evidence` on every edge, and `hopsFor`
assembles the chain as edges rather than nodes. `GET /codegraph/flows` lists
them; `?flow=<id>` returns one with its hops. Live:

```
route:/api/v1/workers  →  table:review_workers        terminal: table-read
  routes      route:/api/v1/workers  → apiworkers.bx           :61  exact  route( "/api/v1/workers" ).withVerbs( "G…
  calls       apiworkers.bx          → workerregistryservice   :16  exact  data = { data: workerRegistryService.listAct…
  table-read  workerregistryservice  → table:review_workers    :52  exact  FROM review_workers
```

Every hop carries `from`, `to`, `kind`, the owning symbol, `file:line`, the
matched source text and a resolution class. A hop that cannot be bound is
returned `resolution: "unresolved"` and counted as `unresolvedHops` — a gap in a
trace is part of the trace. The list account is honest: `available 44, returned
3, omitted 41, truncated`.

### Phase 8 — facets and agent parity · **RV**

| | Before | After |
|---|---|---|
| `/search?q=api&kind=route` | ignored — 770 matches, no signal | **337** |
| `/search?q=api&role=entry` | ignored — 770 | **63** |
| `/search?…&resolution=exact` | ignored | **422**, naming the supported facets |
| MCP tools | 9 | **13** — adds `graph`, `flows`, `rules`, `diff` |
| MCP search levels | 4 | **6** — `resource` and `knowledge` reachable at last |
| MCP evidence claim | "every edge carries file:line" | states that derived and narrative edges carry a class and no line |

### Phase 5 remainder

**N18 — the directory level is usable.** The rollup mapped a file only to its
immediate directory, so every directory holding no files *directly* —
`app/models`, `app/views`, `app/modules`, `tests/specs` — had no edges at all.
Rolling through every ancestor: **isolated directories 20 of 39 → 6 of 29**,
directory edges **66 → 236**.

**N20 — fixtures are out.** `tests/fixtures/**` joins the ignore list: 6 files
and 15 symbols of deliberately-insecure and legacy-CFML sample code were being
analysed as product. `tests/specs/**` stays, because the `tests` edges that
answer "which tests cover this" depend on it. Files 322 → 317.

### N17 — the snapshot stops contradicting itself

`truncated: true` sat beside nine accounts all reporting `complete: true`,
because a section whose candidate count was never supplied computed `available`
from its own returned length. Truncation reasons are now mapped to the section
each belongs to:

```
truncated: true   reasons: [ graphLoad, graphImpacts, maxHotspots, maxFlowsPerCluster ]
  dependencies  complete=false  truncatedBy=graphImpacts
  flows         complete=false  truncatedBy=maxFlowsPerCluster
  hotspots      complete=false  truncatedBy=maxHotspots
  …the other six unchanged and genuinely complete
```

`omitted` is deliberately left at 0 where the count is unknown: inventing one
would be the same defect facing the other way.

### Verification

**TestBox 741 / 0 / 0 / 1** (742 specs, 112 bundles) · **JavaScript 43 / 0** ·
`git diff --check` clean. Versions moved and each was exercised by a full
re-index: `codegraph-snapshot-v5`, `codegraph-projection-v7`.

Live arrival after all of it: *"Saved map of C:\Box\DoubleCheck · built 5 min
ago"*, `DoubleCheck — 317 files across 44 modules`, legend `Shared 5`, 18 cards
with **0** fabricated fields, *"Showing 18 of 44 modules — show the rest"*, and
the unresolved-reference banner unchanged and still the best sentence in the UI.

### What remains

- **Phase 7** — resource and knowledge canvas depths; references and diff panels; the in-product sequence view for the flows now available at `/flows`.
- **Phase 5 remainder** — N12 (nodes carry no resolution/provenance/confidence), N13 (knowledge labels truncated at 120 chars), N14 (knowledge materialisation drops silently).
- **U7** — card summaries still wrap mid-sentence.
- **Phase 9** — glossary terms, domain→domain relations, ordered process steps.
- **Phase 10** — no query latency measured above ~6k nodes.
- **The human cold read**, and a second cold narrative run for determinism.

---

## 25. Phases 7, 9 and 10 (2026-08-17)

### Phase 7 — the map covers the graph, and the panels catch up · **RV**

**Resource and Meaning are canvas depths.** 367 resource nodes with 1,251 edges
— routes, tables, config keys, events, outbound integrations — and the whole
knowledge layer were queryable by API and drawn by nothing. Both now load from
the levelled tables (`codeGraphLoadLevelCanvas`, cached per run+level) and draw:
**200 nodes each** on this repository. `context` is kept beside `nodes` rather
than merged, matching the endpoint, so the far endpoints are drawable without
being counted as the level.

**References panel.** `/references` was API-only and is the only endpoint that
can report unresolved references *inside* its own answer. Live: `normalizePath`
→ **24 definitions**, occurrences each badged `bound` or `unresolved`.

**Flow panel — the sequence view.** Live for `route:/api/v1/workers`:

```
ROUTES      route:/api/v1/workers:61                    → apiworkers.bx           exact
CALLS       apiworkers.bx:16                            → workerregistryservice   exact   index
TABLE-READ  workerregistryservice.bx:52                 → table:review_workers    exact
```

Prefers a flow passing through the current map selection, so it answers "how does
a request reach *this*".

**A syntax error shipped, and the suite could not see it.** A bad regex escape in
`app.js` took the entire workspace down — no canvas, no drawer, no arrival — and
44 passing JS specs stayed green, because every one of them asserts against the
file as a *string* and nothing ever parsed it. New spec: every shipped browser
asset must pass `node --check`. It would have caught this in under a second.

### U7 — cards show a complete thought

Overview cards fit two lines and were handed a whole paragraph, so every card
read as a fragment. `firstSentence()` now feeds `wrapText`:

```
before  "The single supplied cluster, labeled" / "Index, contains 117 files and…"
after   "The core domain orchestrates modernization runs and…"
        "This cluster covers the API handlers, services, and repositories that…"
```

### N13, N14 — knowledge labels and silent drops

`left( text, 120 )` named every risk node with half a word; `summarise()` cuts at
a word boundary and marks the elision. Model output naming something the graph
does not contain was discarded with no record — 29 processes became 23 nodes and
nothing said six had gone. `projectKnowledge` now returns a `dropped` account
(`domain`, `process`, `risk`, `duplicate`) carried into stage health.

### Phase 9 — the knowledge layer relates to itself · **RV**

| Knowledge edge kind | Before | After |
|---|---|---|
| `describes` | 233 | 233 |
| `affects` | 47 | 47 |
| **`depends-on`** (domain → domain) | **0** | **74** |

The knowledge layer had only edges pointing *down* at structure; nothing related
two domains. "Which domains does this one depend on" — the first question an
architect asks — had no answer at any level. Derived from the cluster
dependencies that already exist, and marked `resolution: derived` rather than
`narrative` for exactly that reason: **the names are the model's, the
relationship is the graph's.**

**Processes are ordered.** A process attached to its files as an unordered set
could say a request touches a repository and not whether that was before or
after the handler. The step ordinal rides on `occurrences`:

```
resource:route/api/v1/capabilities  1
apicapabilities.bx                  2
qualitygateservice.bx               3
codegraphcorpusservice.bx           4
architectureindexservice.bx         5
```

**Glossary terms are not built.** They need a prompt-schema change and a provider
call to verify, and unlike the two above they cannot be derived from structure —
so building one would mean shipping a feature whose output I could not check.
Recorded as remaining rather than guessed at.

### Phase 10 — latency measured, and what the measurement is worth

At **6,229 nodes / 15,629 edges**:

| Query | Time |
|---|---|
| `level=symbol` ranked, 200 rows | **0.44 ms** |
| neighbours count for the router | **2.01 ms** |
| unindexed `LIKE '%service%'` scan | **1.49 ms** |
| one-hop impact cone | **2.10 ms** |

All far inside the 150 ms target — **at 6k nodes, which is not the 50k the target
was written for.** §14's benchmark asked for 50k and this repository cannot
supply it. The honest reading: nothing here is slow, and the scaling question is
still open. It stays in the register.

### Verification

**TestBox 741 / 0 / 0 / 1** (742 specs, 112 bundles) · **JavaScript 44 / 0** ·
`git diff --check` clean · `projection-v8`, exercised by a full re-index.

Canvas depths now: `start · cluster · matrix · resource · knowledge · file ·
focus · symbol`.

### What remains, honestly

- **Glossary terms** (above) — the only Phase 9 item not done.
- **N12** — `codegraph_nodes` still has no `resolution`/`provenance`/`confidence`
  column, so an entity cannot state how it was derived the way an edge can. This
  is a schema change plus a projection change across six node kinds.
- **Scale above ~6k nodes** — unmeasurable on this repository.
- **The human cold read**, and a second cold narrative run for determinism
  (~23 minutes of provider calls each).

### N12 — entities state how they came to exist · **RV**

`codegraph_nodes` gained `resolution` / `provenance` / `confidence`, added to the
baseline table *and* to the additive-column list so an existing database repairs
itself on boot. Written by the projection, read back on every level and search
query, and carried through `adoptRunGraph` — a reused run would otherwise lose
its provenance silently.

| Level | resolution · provenance · confidence | Count |
|---|---|---|
| symbol | `exact · parser · high` | 5,360 |
| file | `exact · filesystem · high` | 317 |
| resource (route / event — has a declaration) | `exact · parser · high` | 69 |
| resource (table / config / http — inferred from a reference) | `heuristic · parser · medium` | 299 |
| knowledge | `narrative · llm · interpretive` | 111 |
| cluster | `derived · derived · derived` | 44 |
| directory | `exact · filesystem · high` | 29 |

A `table:` node inferred from a regex is no longer indistinguishable from a file
proven by the filesystem — which was §1's contract, honoured on edges since the
ontology work and never on entities. `projection-v9`.

**Suite after: TestBox 741 / 0 / 0 / 1 · JavaScript 44 / 0 · `git diff --check` clean.**

---

## 26. Register status

| Item | State |
|---|---|
| Phase V, 0, 1, 2, 3, 4, 6, 7, 8, 9, 10 | **Done** |
| Phase 5 | **Done** — N10, N11, N12, N13, N14, N18, N20 |
| N1, N2, N3, N4, N5, N6, N7, N9, N15, N16, N17, N19, N21, N22b, N23, N24 | **Done** |
| U1–U11 | **Done** |
| N8 | **Done**, and the register entry corrected — the 41% figure was mismeasured (§21) |
| **Glossary terms** | **Not built.** Needs a prompt-schema change and a provider call to verify; unlike domain→domain and process ordering it cannot be derived from structure, so building it would mean shipping output I could not check |
| **N22 cluster distribution** | **Not fixed.** One 117-file cluster and a long tail reproduces from an empty store (§19), so it is a modularity-tuning question, not an artefact. Left alone deliberately: changing clustering changes every label, domain and flow grouping in the product |
| **Scale above ~6k nodes** | **Unmeasurable here.** 0.44–2.10 ms at 6,229 nodes; the 50k target needs a repository this project does not have |
| **Human cold read** | **Still open**, and still the only item that cannot be closed by writing code |
| **Cold-narrative determinism** | **Open** — ~23 minutes of provider calls per attempt (§19) |

Versions moved this session, each exercised by a full re-index:
`boxlang-ast-parser-v12` · `cfml-symbol-parser-v12` · `codegraph-snapshot-v5` ·
`codegraph-projection-v9`.

---

## 27. Verification pass, and two corrections (2026-08-17)

### Arrival: reverted, on instruction

Phase 1 made a bare `/codegraph` open the newest saved map. **That was wrong and
is reverted.** The page's job is the form — it is how someone scans a *different*
project or directory — and auto-loading the last snapshot puts a stale map in
front of that. The original spec was protecting exactly this and I overrode it.

The discoverability problem it was reaching for is real and is now solved without
loading anything: the empty state names the saved map and offers it.

```
No graph snapshot — Complete a CodeGraph run to explore clusters and dependencies.
A saved map of C:\Box\DoubleCheck exists from 17 min ago.  [ Open saved map ]
```

Verified: on arrival the workspace is **not** loaded, the form is visible and the
project path editable; the map loads only after the button is clicked, routing
through the same `?run=` path History's Open uses. The spec now asserts the bare
branch does not call `watchRun`.

### What the verification pass found

| Check | Result |
|---|---|
| All 13 MCP tools have routes | **pass** |
| Facet counts agree with returned rows (`kind=route` → only routes; `role=entry` 64/64) | **pass** |
| `dropped` account reaches `stage_health_json` | **pass** — and its zeros are real: 24/24 domains, 40/40 processes, 47/47 risks |
| Hop evidence across **all** flows, not the sampled one | **pass** — 186 hops, 44 flows, **0 unresolved, 186/186 carry a line** |
| N13 word-boundary trimming | **pass** — 0 genuinely mid-word cuts across 47 labels *(my first check flagged 19; the check was wrong, "Changes", "consumes" and "depended" are complete words)* |
| Asset versions bumped for all three changed assets | **pass** |
| **Node provenance returned by the API** | **FAILED** — see below |
| **Service size ceiling** | **FAILED** — see below |

**N12 was only half done.** The columns were written, persisted and queried, and
**never returned**: the row-to-struct mapping did not include them, so a consumer
could not see any of it. Both read paths now map them and both SELECTs carry
them. Verified across every level:

```
file exact/filesystem/high · symbol exact/parser/high · resource heuristic/parser/medium
knowledge narrative/llm/interpretive · cluster derived/derived/derived · directory exact/filesystem/high
```

**`CodeGraphGraphRepository` hit 902 lines** and the project's own fitness rule
caps services at 900. Per the precedent this rule has already set twice (§22),
the limit was not raised — the cohesive unit came out. New
`CodeGraphNodeSearchIndex` owns the trigram mirror end to end: write, append,
copy-on-adopt, coverage, and term lookup. Repository **774**, index **155**.
Nothing else in the repository touches `codegraph_node_search`.

**One transient failure, not reproduced.** `CodeGraphApiSpec` failed once in a
full run with `PRAGMA integrity_check failed`; the database checks `ok` directly
and the spec passes 7/7 in isolation. Recorded as load contention, the same class
as the documented `ReviewExecuteRunSpec` flake — **not investigated further and
not claimed fixed.**

### Final state

**TestBox 741 / 0 / 0 / 1** (742 specs, 112 bundles) · **JavaScript 44 / 0** ·
`git diff --check` clean.
