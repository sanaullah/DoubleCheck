# CodeGraph depth — implementation plan

**The single live plan for CodeGraph.** Product truth and Known gaps live in
[`../application-features.md`](../application-features.md); product stance in
[`codegraph-domain-lens-design.md`](codegraph-domain-lens-design.md).

**Status of this document:** implementation underway in the working tree.
P0/P1 substrate and explorer work, plus Step 15's optional co-change signal,
are implemented; gates below are recorded without a commit SHA. Step 17's
source-backed corpus and contract/docs work are implemented. Full TestBox,
compile, no-provider browser, path, export, and reuse gates are green; provider
timing/manual and app-wide timed AST parity remain pending.

**Verified:** 2026-08-07 against this working tree (branch `dev3`). Every
`file:line` in Part 2 was re-checked on that date. Re-check before trusting after
a gap — see §2.0 for what "verified" means here.

## How to use this document

1. Read Part 0 (status), Part 1 (what CodeGraph is for), Part 3 (constraints).
2. Read Part 2 once. **A claim not in Part 2 is not a fact.** If a step depends
   on something unverified, verify it and add it.
3. Execute Part 4 in §4.0's order, not document order.

Five rules that override anything you infer:

1. **No step begins until the previous step's gate is green**, and the gate
   result goes in Part 0's ledger in the same commit. A step marked done without
   a recorded gate result is a claim, not a result.
2. **BoxLang caches compiled classes.** `box server restart` before every test
   run. Editing a `.bx` and re-running without a restart silently tests old code.
3. **Parser changes bump `parserVersion`.** That is the entire migration
   mechanism (E7) — never hand-migrate `analysis_parse_cache`.
4. **Deterministic first, LLM second.** Every step leaves the no-key path
   working. Meaning may degrade without a provider; structure may not.
5. **Shared code is shared** (§2.10). Additive by default; behaviour changes for
   Review or Modernize are opt-in at the call site and run that product's suite
   in the same commit.

---

# Part 0 — Status ledger

Status values: `todo` · `wip` · `blocked` · `done <sha>`. `Owns` is the blast
radius: a shared step is not done until the other product's suite is green.

| # | Step | Pri | Owns | Status | Gate result |
|---|---|---|---|---|---|
| 0 | Doc hygiene | P0 | — | wip | one live plan; stale-reference gate 0 |
| 1 | Shared graph-loading + metrics defects | P0 | **Review** | wip | app compile 169/169; tests compile 122/122; full TestBox 657 pass, 0 fail, 1 skip; assemble timing not recorded |
| 2 | Structure before meaning (two-phase persist) | P0 | — | wip | lifecycle units + persistence/API/corpus green; one-row/cancel/failure covered; no-provider browser green; provider timing pending |
| 3 | BoxAST parser — BoxLang | P0 | **Review, capabilities API** | wip | app-wide 169-file superset parity: 0 regressions/fallbacks; regex 7.129s, AST 52.255s; full TestBox green |
| 4 | Position-independent symbol ids | P0 | **Review** | wip | blank-line ids/fingerprint/cache-key/impact regression green |
| 5a | Edge-kind pass-through (kind as attribute — E59) | P0 | **Modernize** | wip | coupling invariance/fidelity units green; full TestBox green |
| 5b | Route, view, table, scope, http edges | P0 | **Modernize** | wip | source-backed corpus + full TestBox green |
| 6 | JavaScript parser + `fetch`→route | P0 | Review (scan) | wip | JS parser v3 handles direct/multiline `fetch` + `request`; real client→route path green; JS 25/25 |
| 7 | CFML parity — DI edges, AST | P1 | **Review** | wip | CFML parser units 6/6; source-backed corpus; full TestBox green |
| 8 | Roles from evidence; legend from snapshot | P1 | Review | wip | real-repo unknown share 2.91%; JS 25/25; full TestBox green |
| 9 | Flows v2 | P1 | — | wip | corpus + API contract green; full TestBox green |
| 10 | Reachability, dead code, layer policy | P1 | — | wip | fixture/unit coverage; full TestBox green |
| 11 | Narrative: shard, budget, egress, risk UI | P1 | — | wip | narrative units 9/9; no-provider browser path green; provider/manual gate pending |
| 12a | Explorer: directories + hierarchy + search | P1 | — | wip | JS 25/25; API contract green; browser file drill passed in two interactions; contrast visually verified |
| 12b | Explorer: layout that reads connectivity | P1 | — | wip | JS 25/25 incl deterministic layout/swimlane; 1600×1000 browser visual green |
| 13 | Dependency path finder | P1 | — | wip | API/corpus green; real repo resolves client → route → handler → repository in 3 evidence-bearing hops; browser highlight green |
| 14 | Snapshot reuse + project-keyed map | P1 | — | wip | full-git reuse fixed; 64-char reuse key persisted; next run returned `CodeGraph snapshot reused` |
| 15 | Git co-change and churn | P2 | **Modernize (CI-gated)** | wip | Git units 8/8; coupling units green; full TestBox green |
| 16 | Swimlane + export | P2 | — | wip | JS 25/25; browser swimlane/path highlight green; Markdown/Mermaid/SVG exports 200 with attachment types |
| 17 | Evaluation corpus + docs/OpenAPI truth | P2 | — | wip | corpus in full TestBox 657/0/1; 7/7 CodeGraph route parity; OpenAPI JSON valid; compile 169/169 + 122/122 |

**Deferred** (not scheduled, reasons in Part 5): run-over-run diff, impact-as-story,
editable vocabulary beyond Step 11's label override, saved path queries,
symbol-level explorer, storage split into node/edge tables.

**Blocked:** none.

**Unverified** (do not build on without checking first): whether
`ModernizationCouplingGraphService.build()` tolerates new structural kinds
without weighting changes (§2.10, affects Step 5a); whether bx-ai middleware
supersedes hand-rolled resilience (`open-issues.md`, unrelated to this plan but
adjacent).

## 0.1 Already shipped — do not rebuild

The predecessor plan (`codegraph-plan.md`) completed all eight of its tasks while
its checkboxes still read `- [ ]`. That drift is why Step 0 deletes it.

| Shipped | Evidence |
|---|---|
| Node `role` | `CodeGraphMetricsService.bx:321` `assignRole` |
| `flows[]` in snapshot | `CodeGraphMetricsService.bx:485` `extractFlows` |
| Narrative v2 role + schemas | `resources/prompts/roles/codegraph-narrative-v2.json` |
| v2 normalize, id-dropping | `CodeGraphNarrativeService.bx:199` |
| Meaning banner + role legend | `app/views/main/codegraph.bxm:195`, `:197` |
| Process chips + flow highlight | `public/assets/app.js:4196`, `:4217` |
| Edges API (undocumented — Step 17) | `ApiCodeGraph.bx:102` |
| Narrative refresh endpoint | `ApiCodeGraph.bx:144` |

`.superpowers/sdd/progress.md` records that work as complete and deliberately
uncommitted, with "21 TestBox + 15 JS green" and the provider UI unverified.
Treat it as the last known state, not as a gate result for this plan.

---

# Part 1 — What CodeGraph is for

## 1.1 Three products, three moments

| Product | Purpose | When | User's question |
|---|---|---|---|
| **CodeGraph** | Quickly know the project and the **flow between components** | **Before** work | "What is this? How does a request move?" |
| **Review** | What's missing — security, performance, correctness | **After** developing | "What did I miss?" |
| **Modernize** | Legacy → modern MVC, modules, microservices | **Its own project** | "Where are the seams?" |

These are three users, or one user in three states of mind. **CodeGraph's user
does not know the codebase yet. Review's user just wrote part of it.**

**Rule: share the substrate, keep the surfaces distinct.** A Review run already
builds the same index (E47), which is an argument against recomputing it — not an
argument for drawing Review's answers on CodeGraph's canvas. Findings badges are
not CodeGraph chrome; impact analysis stays Review's, where
`buildImpactCone` already answers it (`ArchitectureIndexService.bx:115`).

## 1.2 CodeGraph's two promises, and what blocks each

**Promise 1 — flow between components.** Today the widest truthful flow is
*handler → service → service*. The target is
**`fetch` → route → handler action → service → repository → table**, every hop a
real typed edge with a citable position.

Blocked by: the BoxLang parser reading one line at a time so multi-line route
declarations are unreachable (E2, E5); JavaScript excluded from CodeGraph scans
(E3); no route, view, or table edges in any parser (E5, E6b, E7b); CFML emitting
no DI edges at all (E9); five edge kinds collapsed to one and unknown kinds
dropped entirely (E4, E32a).

**Promise 2 — quickly.** Blocked by: the deterministic snapshot being complete at
~60% of the run and then withheld behind an LLM call (E50); no snapshot reuse, on
a key that requires computing the snapshot first (E51); everything keyed on a run
id when "know this project" is not a run-shaped question (E52).

**Both promises are cheap to serve relative to their value.** BoxLang ships a
real AST (E1). The scanner already reads JavaScript for Review runs (E23). The
SQL extractor, the table co-access matrix, the shared-state overlay and the
two-phase narrative write all already exist (E46, E47, E50). The gap is
**plumbing between existing parts**, plus defects.

## 1.3 What is not wrong — do not rebuild it

Clustering is Louvain community detection over a weighted affinity graph with
cycle merging; membership is coupling-derived and only the *label* is folder-shaped
(E18). Edge targets carry resolution provenance and are weighted by confidence
(E36). Parse results are content-addressed and cache-invalidated by parser
version (E7). Narrative is optional, drops uncited ids, and has a refresh
endpoint (0.1).

---

# Part 2 — Verified evidence

## 2.0 What "verified" means

Each entry was checked against this tree on 2026-08-07 by reading the cited
lines. Entries marked **corrected** replace an earlier claim in this plan's
history that was wrong or overstated; the correction is stated so nobody
re-derives the original error.

Line numbers drift. If a citation does not match, re-verify before acting — do
not assume the surrounding claim is false.

## 2.1 The AST is available

**E1 — `BoxAST()` works in this runtime.** Runtime is `boxlang@be`
(`server.json:4`); binary at `C:\boxlang\bin\boxlang`. Confirmed by execution:

| Input | Result |
|---|---|
| `BoxAST( filepath: ".../CodeGraphInventoryAdapter.bx", returnType: "struct" )` | `ASTType = BoxClass`; keys `ASTType, ASTPackage, sourceText, position, comments, imports, body, annotations, documentation, properties` |
| `BoxAST( filepath: "app/views/main/codegraph.bxm" )` | `ASTType = BoxTemplate` |
| `BoxAST( source: "<cfcomponent>…", sourceType: "cftemplate" )` | `ASTType = BoxTemplate` |
| `BoxAST( source: "component { … }", sourceType: "cfscript" )` | `ASTType = BoxScript` |

**E6 — `BoxAST` gotcha.** A class body passed as `source` under the default
`sourceType: "script"` throws
`NullPointerException: … "root" is null` — not a parse error. Always pass
`filepath`, or set `sourceType` explicitly.

**E7 — parser swaps need no migration.** `ArchitectureIndexService.bx:53` looks
up cached parse results by `( contentHash, parserVersion )`. Bumping
`variables.parserVersion` invalidates every stale entry by construction.

## 2.2 What the parsers cannot see

**E2 — the BoxLang parser is line-scoped.** `BoxLangParserService.bx:30`
iterates `file.lines`; every rule matches one `sourceLine`. `match()` at `:380`
builds the pattern with `createObject( "java", "java.util.regex.Pattern" )`
**twice per call, per line, per file** — a hot-path cost and a violation of the
`import java:` rule in AGENTS.md.

**E5 — routes are dead-end symbols.** `BoxLangParserService.bx:173` captures
`route( "…" )` as a symbol of kind `route`. The target sits on other lines:
`Router.bx:111`–`115` spans `route(…)` / `.withVerbs(…)` / `.withAction(…)` /
`.toHandler(…)` / `.end()`. No route→handler edge is emitted anywhere.

**E6b — handler → view is never captured.** `Main.bx:29`
`event.setView( "main/dashboard" )`. No parser rule matches `setView`.

**E7b — no parser edge reaches a table.** `queryExecute` appears in 10+
repositories. No parser extracts table names.

**E8 — CFML parity, corrected.** An earlier draft called `CfmlParserService`
"the better parser". That was **overstated in one direction and wrong in
another**:

| Aspect | CFML | BoxLang |
|---|---|---|
| Multi-line tag joining | `joinTagLines( lines, start, maxLookahead=5 )` via `CfmlSourceScanner` (`CfmlParserService.bx:449`) | none |
| Compiled-pattern cache | `compiledPattern()` (`:456`) | none (E2) |
| **Script-body parsing** | **still a line loop** (`:36`) | line loop |
| **DI (`inject`) extraction** | **none — zero matches for `inject` in the whole file** | `"injects"` emitted at `BoxLangParserService.bx:150` |

**E9 — CFML apps produce no DI edges (new).** `CfmlParserService` never emits
`injects`. A ColdBox/WireBox ColdFusion application — the exact legacy target
this product serves — gets a graph with its dependency-injection wiring missing
entirely. Flows in CFML repos are therefore structurally weaker than in BoxLang
repos, and the deficit is invisible in the UI.

**E3 — JavaScript is a declared supported language with no implementation.**
`SupportedLanguageService.bx:19` lists `js`, `jsx` at tier `discovery-only`.
`ArchitectureIndexService.bx:29` holds `[ boxLangParserService, cfmlParserService ]`
and `:45` skips a file when no parser claims it. `public/assets/app.js` is 8,031
lines.

**E23 — Review scans JS; CodeGraph does not.** `ReviewRunService.bx:398`–`:408`
sets scan options per run kind; the `codegraph` branch sets
`allowedExtensions: [ "cfc", "cfm", "bx", "bxm", "bxs" ]` (`:402`). The review
path sets none. Either way no parser claims `.js`.

## 2.3 Fidelity lost after parsing

**E4 — five edge kinds collapse into one.** `CodeGraphInventoryAdapter.bx:149`–`:157`
maps `constructs`, `injects`, `imports`, `calls`, `type-reference` all to
`component-construction`; `:146` drops `tests`.

**E32a — the adapter drops unknown kinds entirely (new, critical).**
`mapKind` ends `return "";` at `:159`, and `:60` skips any edge whose mapped kind
is empty. So a parser emitting `table-query`, `datasource`, `scope.application`
or `http` today would have those edges **silently discarded before they reach the
coupling service**.

**E32b — and the coupling service has its own allowlist.**
`ModernizationCouplingGraphService.bx:48` declares
`structuralKinds = [ "extends", "implements", "include", "component-construction" ]`,
and `buildStructuralEdges:236` does `if ( !structuralKinds.contains( kind ) ) continue`.

**Together these are three filters in series** — parser → `mapKind` →
`structuralKinds`. Changing any one alone loses data silently. Step 5a commits
all three together.

**E12 — symbol ids move when unrelated lines move.**
`ArchitectureIndexService.bx:431`–`:444` hashes
`filePath:recordType:kind:name:line`. Inserting a line near the top of a file
changes the id of every symbol below it. Those ids flow into unit ids
(`CodeGraphInventoryAdapter.bx:37`), the snapshot fingerprint
(`CodeGraphMetricsService.bx:114`) and the narrative cache key
(`CodeGraphRunService.bx:71`). Cosmetic edits invalidate baseline reuse, Review's
impact diffs, and the whole briefing.

**E17 — narrative caching is all-or-nothing.** The fingerprint covers
`nodes, clusters, clusterEdges, cycles, flows, totals`
(`CodeGraphMetricsService.bx:106`–`:114`). Any single file change produces a new
fingerprint, so the entire briefing regenerates and **domain names change between
runs on unrelated edits**.

**E18 — cluster *naming* is folder-shaped; *membership* is not (corrected).**
`deriveClusters` (`ModernizationDerivedStructureService.bx:61`) runs Louvain
community detection over a weighted affinity graph (`:66`–`:68`:
`buildAffinityGraph` → `louvainCommunities` → `mergeCycleCommunities`). Only the
label is folder-derived (`:102`–`:105`), and `:100` says so deliberately:
"Membership is derived; naming stays folder-shaped, which is what folders are
actually good for." **The "map with no legend" problem is a naming problem.**

## 2.4 Classification and roles

**E4b — views classify as `other`.** `ArchitectureModelService.classifyFile`
(`:206`–`:242`) branches on tests, handlers, models, config, docs, manifests,
public — **no `views/`**. So `app/views/main/codegraph.bxm` → `other` →
`assignRole` falls through to `unknown` (`CodeGraphMetricsService.bx:345`).

**E8b — `public/` outranks everything.** `ArchitectureModelService.bx:238` maps
`(^|/)public/` to `entry-points`, which `CodeGraphMetricsService.bx:330` turns
into role `entry`. When JS lands (Step 6), every asset becomes a false entry
point unless a `client` role exists first.

**E13 — JS nodes would carry a blank language.**
`CodeGraphMetricsService.bx:708`–`:713` returns `""` for anything not
`bx|bxm|bxs|cfc|cfm|cfml`.

**E11b — the legend is hardcoded.** `codegraph.bxm:197`–`:203` hardcodes six role
chips; they drift from `assignRole`'s enum on the next change.

## 2.5 Flows

**E14 — flow extraction as built** (`CodeGraphMetricsService.bx:485`):

| Property | Where | Consequence |
|---|---|---|
| Only `injects` / `calls` kinds | `:546` | Route, view, table and event hops invisible |
| `maxDepth = 3`, hardcoded | `:493` | Deeper request paths truncate silently |
| **One path per seed** (`longestFlowPath` keeps a single `best`) | `:609`–`:658` | A handler calling four services yields **one** flow |
| Steps are file ids | `:530`–`:535` | A process story cannot name the method |
| No sink typing | `:505` | Flow ends where the walk exhausted |
| `maxFlows` 24, sorted by depth | `:30`, `:511` | Large repos show an arbitrary 24 |
| `duplicate( state.visited )` per branch | `:638` | Cost grows with fan-out |

**E14b — flows read the pre-collapse review dependencies**, not the coupling
graph (`:494` builds adjacency from `reviewGraph.dependencies`). This is why
flows still distinguish `injects` from `calls` despite E4 — and it means Step 9
is not blocked on Step 5a, though it benefits from it.

## 2.6 Defects — metrics and graph loading

**E10 — snapshots can cite nodes they do not contain.** `assemble` computes
hotspots (`:79`), orphans (`:80`), layer violations (`:81`) and flows (`:82`)
from the **full** node array, then truncates `nodes` to `maxNodes` at `:85`–`:88`.
Any referenced node beyond the cap is a dead drill-down target.

**E11 — two quadratic loops per run.** `crossingEdgeCount` (`:365`–`:378`) walks
every edge and is called once per node from `buildNodes` (`:289`) — at configured
caps (1500 nodes, 20000 edges) up to 30M iterations. `presentClusters`
(`:170`–`:174`) loops all graph nodes per cluster with `filePaths.contains()`
inside.

**E15 — orphan detection misses the common case.** `:426` requires
`fanIn == 0 && fanOut == 0`. A file nothing calls but which calls five things —
the usual shape of dead code — is not reported.

**E16 — one layer rule exists.** `:457` flags only
`application-models → http-handlers`. No policy configuration.

**E37 — the impacts query is limited to zero rows for two callers.**
`AnalysisGraphRepository.getGraph:249` computes
`effectiveLimit = val( arguments.resultLimit ) > 0 ? … : variables.resultLimit`,
uses `effectiveLimit` for symbols (`:266`) and dependencies (`:280`), but binds
**unscoped `resultLimit`** for impacts at `:295` — which resolves to
`arguments.resultLimit`, default `0`.

`ReviewRunQueryService.bx:54` and `ReviewRunService.bx:617` both call
`getGraph( id )` with no limit. SQLite treats `LIMIT 0` as no rows. **Those two
paths return zero impacts, always.** CodeGraph is unaffected only because it
passes an explicit limit (`CodeGraphRunService.bx:46`, `:201`, `:333`).

**E38 — one limit governs two entities.** `getGraph` applies the same `LIMIT` to
symbols and dependencies. CodeGraph passes `codegraphMaxEdges` (20000,
`Coldbox.bx:117`) — an **edge** budget — as the **symbol** budget. Both queries
order by `file_path`, so truncation is alphabetical: whole late-alphabet
directories vanish rather than a representative sample. Review's default is
`graphResultLimit` = 1000 (`Coldbox.bx:110`).

**E39 — truncation is computed, returned, and dropped.** `getGraph` returns a
correct `truncated` flag at `:365`. `CodeGraphMetricsService.assemble` never
reads it. A run that lost 5,000 symbols at the SQL boundary reports
`truncated: false` with empty `truncationReasons`.

## 2.7 Storage and surface

**E20 — snapshots are one JSON blob per run.** `SchemaService.bx:543`:
`codegraph_snapshots` keyed on `run_id` with `snapshot_json` and
`narrative_json` as TEXT; indexes at `:898`–`:899` cover narrative reuse and
fingerprint only. No node, edge, flow or label tables.

**E21 — no co-change API.** `GitRepositoryService` exposes `inspect`,
`workingTreePaths`, `fullPaths`, `revisionPaths`, `readBlob`,
`changedLineRanges` (`:225`), with `executeText` / `executeTokens` private
(`:323`, `:332`). Commit-pair extraction is a new public method on an existing
service, not a new dependency.

**E22 — no search, no export.** No `codegraph-search` handle in `app.js`. Export
returns 422 (`application-features.md:222`).

**E25 — the directory rollup is computed and thrown away.**
`CodeGraphMetricsService.bx:83` builds `directories` (path, fileCount,
symbolCount, fanInSum, fanOutSum) and returns it at `:130`, so it is persisted
inside `snapshot_json`. `CodeGraphRunService.getResult` (`:154`–`:171`) does not
include it in the payload, and `app.js` never references it.

**E26 — the canvas shows a fraction of the snapshot.** `app.js:4888` and `:4909`
request `maxNodes: 120`; `:4912` requests `60` for overview. The server snapshot
carries up to 1500 (`Coldbox.bx:116`). Under 10% renders, **and there is no
search to reach the rest** (E22).

**E27 — the only adjacency builder is undirected.**
`CodeGraphRunService.buildAdjacency` (`:469`–`:487`) appends both directions
(`:483`–`:484`). Correct for neighbourhood BFS; wrong for a path finder.

**E28 — subgraph `totalNodes` is the returned count, not the graph size (new).**
`CodeGraphRunService.bx:264` computes `totalNodes = adjacency.count()` — the real
graph size — uses it only for the `truncated` flag at `:265`, then returns
`totalNodes: nodes.len()` at `:270`. The API field always equals the returned
node count, so a client cannot tell how much was left out.

## 2.8 Explorer navigation and layout

**E24 — layouts largely ignore connectivity (corrected).** An earlier draft
claimed "no layout algorithm reads an edge". That is **overstated** — the radial
layout does:

| Layout | Positioning rule | Reads edges? |
|---|---|---|
| `layoutClusters` `:714` | Grid by array index — `col = i % cols` (`:721`) | No |
| `layoutLayered` `:744` | Columns by layer; rows sorted **alphabetically** (`:761`) | No |
| `layoutRadial` `:790` | BFS over an edge-built adjacency for ring distance (`:804`–`:821`), then **even angles by array index** within each ring (`:849`) | **For rings only** |

Accurate statement: **cluster and layered ignore connectivity entirely for
placement; radial uses it for ring assignment but not for position within a
ring.** No layout performs crossing minimisation, overlap avoidance or bundling.

**E29 — edge routing assumes left-to-right.** `edgePath` (`:897`) always exits
the source's right face (`x1 = a.x + aw`) and enters the target's left face
(`x2 = b.x`) regardless of relative position. Leftward and vertical edges curve
backwards through intervening nodes.

**E30 — drill-down is three fixed lenses, not a hierarchy.** `state.codegraph`
holds `mode` / `clusterId` / `focusId` / `focusSubgraph` (`app.js:109`–`:111`),
driving cluster → file → focus with a breadcrumb (`:4769`–`:4778`) and depth
buttons gated on `hasCluster` / `hasFocus` (`:4753`–`:4761`). Each level is flat:
no directory tree above clusters, no symbol level below files.

**E31 — path-finding primitives exist already.** `layoutRadial` runs a
client-side BFS (`:804`–`:821`); `ArchitectureIndexService.buildImpactCone`
(`:115`) runs a bounded reverse-edge BFS server-side. Step 13 is an endpoint plus
UI, not a new algorithm family.

## 2.9 Narrative

**E40 — the budget starves whichever section is last.**
`CodeGraphNarrativeService.buildPayload:385` spends one shared
`maximumCharacters` budget **sequentially with `break`**: clusters (`:424`),
hotspots (`:442`), flows (`:463`), cycles (`:480`). Exhausting it inside clusters
sends **zero flows and zero cycles** to the model — process stories and risk, the
two sections the Domain lens exists for, starve first and silently.

**E41 — absolute paths reach the provider unredacted.**
`secretRedactionService` is injected (`:20`) but applied only to error messages
and stack traces (`:77`, `:80`, `:136`, `:139`). The payload ships raw
`filePaths`, `entryFile`, `sinkFile` and `steps` (`:420`–`:466`).

**E42 — risk is computed and never rendered (new).** `normalize` produces a
`risk[]` array citing hotspot and cycle ids (`:222`–`:239`) and it is persisted
in `narrative_json`. `app.js` contains **no read of CodeGraph's `narrative.risk`**.
`application-features.md:195` and `:220` claim a risk briefing ships. It does
not — the data exists, the UI never shows it.

**E43 — two public entry points for one behaviour.**
`CodeGraphNarrativeService.narrate:48` is a one-line
`return enrich( arguments.snapshot );`. `enrich:55` has no caller outside the
class. Two public methods, one path.

## 2.10 Shared ownership — blast radius

**E44 — consumer map**, from `inject=` and direct-construction sites:

| Service | Also used by | Steps |
|---|---|---|
| `BoxLangParserService`, `CfmlParserService` | `ArchitectureIndexService`, **`ApiCapabilities.bx:45`–`:46`** (publishes `getVersion()`) | 3, 7 |
| `ArchitectureIndexService` | **`ReviewRunService`** | 4, 5 |
| `AnalysisGraphRepository` | `ReviewRunService`, `ReviewRunQueryService` | 1 |
| `ArchitectureModelService` | **`ReviewRunService`** | 1, 8 |
| `ModernizationCouplingGraphService` | **`ModernizationRunService`** | 5a |
| `ModernizationDerivedStructureService` | **six Modernize services** — `FragmentMerger`, `ProposalService`, `RoadmapShardService`, `RoadmapSynthesisService`, `RunService`, `ShardExecutor` | 15 |

**E45 — Modernize's correctness is CI-gated against clustering.**
`modernize-inversion-plan.md` Step 3 defines five stop conditions asserted by
`ModernizationCorpusSpec` → "Step 3b stop conditions", including
`seamPrecision ≥ baseline` and `seamRecall > baseline` against
`baseline-llm-path.json`. Those read clusters from `deriveClusters`. **Any change
to affinity or community detection moves Modernize's measured seam quality.**

**E46 — table and scope extraction already exists, in Modernize's inventory.**

| Emitted | Where |
|---|---|
| `datasource` | `ModernizationInventoryService.bx:175` |
| `table-query` per table | `:190`, from `sqlReferences( sourceLine )` |
| `column-query` | `:191` |
| `scope.#scope#` | `:197` |

The extractor is `sqlReferences` (`:654`–`:667`), returning
`{ tables, columns, unparameterized, parameterMismatch, dynamicIdentifier }` —
**dynamic-SQL detection included**. Downstream:
`ModernizationSignalService.bx:22`–`:30` maps these to signals;
`ModernizationRiskService.bx:29`–`:30` weights them.

**E47 — the coupling service already consumes these kinds.**
`ModernizationCouplingGraphService.bx:55`
`resourceKinds = [ "datasource", "table-query" ]`, with `:328`–`:333` building a
co-access matrix keyed `"table:" & resource`. Also `:56`
`sharedStateKinds = [ "scope.application", "scope.session", "scope.client",
"security-session-gate" ]` and `:61`
`externalIntegrationKinds = [ "http", "schedule" ]`. None is fed by the parsers.

Its `:50`–`:54` warning must be honoured verbatim:

> Only kinds whose `target` is a real resource NAME belong here. `query` and
> `sql-proc-call` carry constant targets, so including them would key every
> SQL-touching file to one fake shared resource and manufacture co-access
> between files that share nothing — which would defeat false-seam detection
> outright.

**E48 — and there is a documented rule for sharing extractors.**
`CfmlSourceScanner`'s docblock records the decision from the last time two
extractors overlapped: it holds mechanics only, and *"the extractors are not
merged. Their taxonomies and evidence contracts legitimately differ, and folding
them together would silently change what each one reports."* It names two
differences preserved rather than flattened: backslash normalization is a
parameter **and** part of the cache key; the shared tag joiner always reports
`endLine`.

**E36 — edge provenance is already weighted.**
`ModernizationCouplingGraphService.bx:41` `resolutionWeights`: `path` 1.0 >
`basename` 0.75 > `stem` 0.5 > `dotted-path` 0.4.

**E59 — edge *identity* includes kind, so un-collapsing changes the graph
(new, and it corrects this plan).** An earlier draft called Step 5a "additive"
and safe for Modernize. **It is not.**

`buildStructuralEdges:245` dedups on `edgeKey = from & "|" & to & "|" & kind`.
Today `mapKind` collapses five kinds into `component-construction`, so
`A → B` via `injects` **and** `A → B` via `calls` produce the *same* key and
merge into **one** edge with `occurrences++` (`:246`–`:255`). Un-collapse them and
the same source produces **two** edges.

That is not a labelling change; it changes the graph:

| Affected | Mechanism |
|---|---|
| Edge count | One merged edge becomes several |
| `maxEdges` / `maxEdgesPerNode` caps | `:257`, `:262` bite earlier, truncating edges that previously survived |
| Affinity weights | `buildAffinityGraph` sums edge contributions per pair |
| **Louvain communities** | Different affinity → different clusters |
| **Modernize's CI gates** | `seamPrecision` / `seamRecall` read those clusters (E45) |
| Cohesion ratios | `cohesion()` counts internal vs crossing edges |

**Architectural consequence.** Kind must stop being part of edge *identity* and
become an edge *attribute*. Dedup on a canonical group so edge identity, counts,
weights, caps and Louvain output stay byte-identical, and carry the specific
kinds alongside as `kinds[]` for consumers that want fidelity. That is the design
Step 5a now specifies — it is the only version that is genuinely additive.

**E49 — a Review run already builds the CodeGraph substrate.**
`ReviewRunService.bx:602` calls `architectureIndexService.index( runId, scan.files )`
— the same call `CodeGraphRunService.bx:40` makes.

**E50b — one gate keeps the explorer off other runs.** `ApiCodeGraph.bx:49`,
`:108`, `:150` each test `lCase( run.getRunKind() ?: "" ) != "codegraph"` and
return 404.

## 2.11 Speed and freshness

**E50 — nothing renders until the run finishes, including the LLM call.**
`CodeGraphRunService.execute` persists once, at 90% (`:76`–`:84`), *after*
narrative resolution at 75% (`:66`–`:69`). The deterministic snapshot is complete
at the 60% clustering mark and withheld behind a network call.

**The two-phase write already exists.** `CodeGraphRepository.updateNarrative:153`
writes narrative alone against an existing row, and
`CodeGraphRunService.refreshNarrative:381` drives exactly that flow from
`POST /runs/:id/codegraph/narrative`.

**E51 — the snapshot is never reused; only the narrative is.**
`CodeGraphRepository.findReusableNarrative:108` matches on
`projectPath + repositoryRevision + narrativeCacheKey`. No snapshot equivalent
exists. And it is circular: `narrativeCacheKey` derives from the snapshot
fingerprint (`CodeGraphRunService.bx:71`), so the whole snapshot must be computed
before the system can discover the narrative was reusable.

**E52 — run-centric, for a project-centric question.** `codegraph_snapshots` has
`run_id` as PRIMARY KEY (`SchemaService.bx:543`); results come from
`GET /runs/:id/result`; history is `/api/v1/history?runKind=codegraph`. There is
no "current map of this project".

**E53 — meaning expires on every commit.** `repositoryRevision` is part of the
narrative reuse key (`CodeGraphRepository.bx:125`).

## 2.12 Contract and docs drift

**E54 — the edges endpoint is undocumented.** `GET /runs/:id/codegraph/edges`
ships (`ApiCodeGraph.bx:102`), is used by the UI
(`app.js:3946`–`:3967`) and is covered by `CodeGraphApiSpec`. `resources/apidocs/`
contains `codegraph/subgraph` and `codegraph/narrative` — **not `codegraph/edges`**.
This violates the AGENTS.md rule that `/api/v1/*` changes update OpenAPI.

**E55 — the run form carries Review wording.** `codegraph.bxm:38` states
"ColdFusion and BoxLang only — JavaScript files are skipped silently" (true
today, false after Step 6), and the pipeline step list at `:121`–`:128` names
Review stages — "Crew planning", "Specialist analysis" — that no CodeGraph run
executes. `app.js` rewrites these at runtime; the served HTML is wrong until it
does.

**E56 — test footprint, for gate realism.** 73 unit suites, 27 integration
suites. CodeGraph: `CodeGraphInventoryAdapterSpec` (93 lines),
`CodeGraphMetricsServiceSpec` (306), `CodeGraphNarrativeServiceSpec` (312),
`CodeGraphRunServiceSpec` (380), `CodeGraphApiSpec` (291),
`CodeGraphPersistenceSpec` (174), `tests/js/codegraph-layout.spec.mjs` (462).
Gates below extend these suites; none needs a new harness.

**E57 — repository hygiene.** `.gitignore:59` ignores `.superpowers/**` — it is
untracked scratch holding the previous plan's briefs and baselines, **not a stale
doc tree, and not this plan's to delete**. `.gitignore:65` carries a comment
about not recreating `.docs/` or `.superpowers/` that no longer matches
AGENTS.md. `codegraph-depth-plan-backup.md` and `codegraph-deep-dive.md` both
exist alongside this file, against the one-live-plan rule.

**E58 — adjacent open issues that constrain UI work.** `open-issues.md` item 4:
`app.js` "makes excessive backend calls". Item 8: `/review` wants a directory
tree for file selection — the same component Step 12a builds. Item 3: run inputs
are not persisted, so history cannot show what was submitted.

---

# Part 3 — Constraints

## 3.1 Product boundaries (non-negotiable)

- **Local-only.** SQLite and analysis on the user's machine. No SaaS, accounts,
  login walls, tenant auth, billing, quotas, hosted retention, or PR-bot platform.
- **Desktop-only.** No mobile navigation, phone layouts, or responsive
  breakpoint redesigns. Narrow-window breakage is preferable.
  `prefers-reduced-motion` and ordinary desktop accessibility stay in scope.
- **BoxLang, ColdFusion, JavaScript only.** No fourth language, including
  TypeScript.
- **Structure works with no AI key.** Every step leaves the no-key path intact.
  LLM is optional and additive; meaning may degrade, structure may not.
- **No automatic source migration.** CodeGraph reads; it never rewrites source.
- **Capability claims must be measured** (Step 17).
- **One implementation path per feature.** Extend existing services, handlers,
  views and test patterns before creating abstractions.

## 3.2 Shared-service rules

Most of what this plan touches is used by Review or Modernize (E44).

1. **Additive by default.** Extend a vocabulary, add a parameter, add a kind —
   do not change a default another product reads.
2. **Behaviour changes for another product are opt-in at the call site**, and
   that product's suite runs in the same commit. Step 15 is the live case:
   Modernize's seam metrics are CI-gated (E45), so co-change affinity arrives as
   a caller-supplied option, never a new default.
3. **Never fork a shared service to avoid the conversation.** A parallel
   CodeGraph copy of the coupling or clustering service is the duplicate product
   path AGENTS.md forbids.
4. **Share mechanics, never taxonomies** (E48). `CfmlSourceScanner` is the
   precedent and the pattern.

## 3.3 Coordination with the Modernize plan

AGENTS.md names [`modernize-inversion-plan.md`](modernize-inversion-plan.md) for
Modernize work. Both plans are live and they edit the same files.

| Overlap | Modernize plan | This plan |
|---|---|---|
| `ModernizationCouplingGraphService` | Step 1 — owns it | Step 5a — extends `structuralKinds` |
| `ModernizationDerivedStructureService` | Steps 3 / 3a / 3b — CI-gated inversion | Step 15 — opt-in co-change affinity |
| Corpus and thresholds | Steps 2a / 6 | Step 17 — separate CodeGraph fixtures |

1. **The Modernize plan wins on files it owns.** If its Step 1 or 3 is in flight,
   Steps 5a and 15 wait or rebase. Read its Part 0 ledger first.
2. **Vocabulary additions are safe either way**; affinity and community-detection
   changes are not.
3. **Run both corpora on any commit touching either service.**
4. Resolve genuine design conflicts in the Modernize plan and reference the
   outcome here — do not fork the answer.

---

# Part 4 — Execution

## 4.0 Order

```
0 ─► 1 ─┬─► 2 ──────────────────────────────────────────────► 14 ─► 17
        │                                                      ▲
        ├─► 3 ─► 4 ─► 5a ─► 5b ─┬─► 6 ─► 9 ─┬─► 10 ─┬─► 12a ─► 12b ─► 13 ─► 16
        │                       ├─► 7       └─► 11 ──┘
        │                       └─► 8 ──────────────┘
        └─► 15
```

| Ordering | Why |
|---|---|
| 1 before everything | Its defects poison any measurement taken afterwards (E37–E39) |
| 2 independent of 3–13 | Two-phase persist touches only `CodeGraphRunService` + UI |
| 4 before 5a | Stable ids first, or every kind change also churns ids (E12) |
| 5a before 5b | New kinds are dropped by three filters until pass-through lands (E32a/b) |
| 5b before 6 | A `fetch` edge needs route nodes to target |
| 5b + 6 before 9 | Typed sinks and full-stack flows need table and client edges |
| 8 before 12a | `client` role must exist before JS nodes surface, or `public/` makes every asset an entry point (E8b) |
| 9 before 11 | The narrative payload carries flows; build it after `flows[]` changes shape |
| 9 + 10 before 12a | Symbol steps and reachability are what the hierarchy shows |
| 12a before 12b | Fix what is drawn before how it is drawn |
| 12b before 13 | A path needs a legible canvas (E24) |
| 2 before 14 | Reuse must know about `narrative.pending`, which Step 2 introduces |
| 15 independent | Opt-in affinity; nothing else waits on it |
| 17 last | It documents and measures whatever actually shipped, so it closes the plan rather than sitting mid-stream |

**If effort is short:** Steps 1, 2, 3, 5a, 5b, 6 deliver both promises' floor.
Cut from 15–17 first, then 16.

## 4.1 Where this plan is most likely to go wrong

An architectural read of the plan itself. These are not steps; they are the
failure modes to watch while executing.

| Risk | Step | Mitigation already in the plan |
|---|---|---|
| **Silently changing Modernize's clusters.** The single largest risk. Edge identity, affinity weights and Louvain are load-bearing for a CI-gated product (E59, E45) | 5a, 15 | 5a's gate asserts graph *and* cluster invariance; 15 is opt-in with a byte-identical default |
| **Serving a stale snapshot.** A reuse key that omits an input is a correctness bug that looks like a cache hit | 14 | Key includes settings hash and `parserVersion`; dirty tree and `pending` narrative both skip reuse |
| **A systematically worse parser with no way back.** Per-file fallback does not cover a bad release on an unfamiliar dialect | 3, 7 | `codegraphParserStrategy` kill switch for one release cycle |
| **New partial states.** Two-phase persist makes "run failed, snapshot valid" reachable for the first time | 2 | State table enumerated and specced, one row per case |
| **Breaking a documented API by redefining a field** rather than adding one | 12a | `graphNodes` added; `totalNodes` deprecated, not redefined |
| **Cost blowout on first run after a version bump** — every parse cache entry invalidates at once | 3, 5b, 6, 7 | Called out in each step; estimate before deploy (§5.3) |
| **Scope drift back toward Review's questions** — findings on the graph, impact analysis in CodeGraph | 13, 14 | §1.1 states the boundary; both steps carry explicit "do not" |

**The two steps to review most carefully in code review are 5a and 14** — both
are quiet, both are easy to get subtly wrong, and both fail in ways that look
like success.

---

## Step 0 — Doc hygiene

**Status** wip · **Pri** P0 · **Preconditions** none · **Owns** — (docs only)

**Goal & scope.** Remove documents that will misinform the next agent. Docs only;
no code.

**Behaviour.**
1. Delete `resources/docs/plans/codegraph-plan.md` — superseded, all tasks
   shipped (§0.1), checkboxes all unchecked, and it directs agents to a
   `superpowers:` skill that does not exist.
2. Delete `resources/docs/plans/codegraph-depth-plan-backup.md` and
   `resources/docs/plans/codegraph-deep-dive.md` — their content is absorbed
   here. Two readable near-copies of a plan is the failure the one-live-plan rule
   exists to prevent (E57).
3. Retarget inbound links: `application-features.md:263`, `:322`;
   `resources/docs/README.md:16`; `codegraph-domain-lens-design.md:4`.
4. Correct `.gitignore:65`'s comment, which no longer matches AGENTS.md (E57).

**Do not.** Do not delete `.superpowers/` — gitignored scratch, the maintainer's
call, not hygiene (E57). Do not archive superseded plans; git history is the
archive.

**Contract / settings / schema / parser.** None.

**Degradation.** N/A.

**Gate.** `rg -n "codegraph-plan|codegraph-deep-dive|depth-plan-backup" resources/docs --glob '!codegraph-depth-plan.md'`
returns nothing. `resources/docs/README.md` lists exactly one live CodeGraph plan.

**Docs.** This step *is* the docs change.

---

## Step 1 — Shared graph-loading and metrics defects

**Status** wip · **Pri** P0 · **Preconditions** Step 0 · **Owns** **Review** —
1a–1c are live Review defects

**Goal & scope.** Fix eight defects that are wrong today independent of this
plan. Bounded to `AnalysisGraphRepository`, `CodeGraphMetricsService`,
`ArchitectureModelService`, `BoxLangParserService.match`. No feature work.

**Behaviour.**

| # | Fix | Evidence |
|---|---|---|
| 1a | Bind `effectiveLimit`, not unscoped `resultLimit`, in the impacts query (`AnalysisGraphRepository.bx:295`) | E37 |
| 1b | Separate symbol and dependency limits in `getGraph`; stop passing an edge budget as a symbol budget | E38 |
| 1c | Read `getGraph`'s `truncated` flag in `assemble` and add a truncation reason | E39 |
| 1d | Apply the `maxNodes` cap **before** deriving hotspots/orphans/violations/flows, or retain referenced ids | E10 |
| 1e | Replace `crossingEdgeCount`'s per-node edge walk with one edge pass; same for `presentClusters` symbol counts | E11 |
| 1f | `languageFor` returns `JavaScript` for `js`/`jsx` | E13 |
| 1g | Add a `views?/` branch to `classifyFile` → `views` component → `view` role | E4b |
| 1h | Point `BoxLangParserService.match` at `CfmlSourceScanner.compiledPattern( expr, false )` | E2 |

**Do not.** Do not change `hotspotScore` weights (Step 15 gives a defensible
basis). Do not touch `classifyFile`'s `public/` branch (Step 8 owns `client`).
Do not defer 1a–1c as "not CodeGraph" — they are one-line fixes to the base every
later measurement rests on.

**Contract.** No API shape change. Snapshot gains a truncation reason value
(additive; clients ignore unknown reasons — `app.js:4468` maps known codes and
falls through).

**Settings / schema.** New setting `codegraphMaxSymbols` beside the other
`codegraph*` keys (`Coldbox.bx:113`–`:128`), env
`DOUBLECHECK_CODEGRAPH_MAX_SYMBOLS`, default 20000. No schema change.

**Parser version.** 1h changes pattern *compilation*, not pattern *semantics* —
**no version bump**, and the parity assertion in the gate proves it.

**Degradation.** Truncation now reported rather than hidden; no-key path
unaffected; non-git unaffected; no egress.

**Gate.**
```bash
box server restart && box testbox run reporter=Min
```
Full suite, not a bundle — 1a–1c touch Review. New specs: `getGraph( runId )`
with **no** limit argument returns impacts (1a); snapshot `truncationReasons`
contains the SQL-level reason when the limit bites (1c); every id in `hotspots`,
`orphans`, `flows[].steps`, `layerViolations` resolves in `nodes[]` with
`maxNodes` forced below the hotspot count (1d); BoxLang parser output is
**byte-identical** before and after 1h on `app/**`. Record before/after
`assemble` wall time on this repo in the ledger.

**Docs.** `application-features.md` Known gaps — add and immediately close rows
for 1a and 1c, so the defect history is visible.

---

## Step 2 — Structure before meaning

**Status** wip · **Pri** P0 · **Preconditions** Step 1 · **Owns** — (CodeGraph-local)

**Goal & scope.** Serve the word the purpose leads with. The deterministic
snapshot is complete at ~60% and withheld behind an LLM call (E50). Split the
write. Scope: `CodeGraphRunService.execute`, `app.js` render path. **No new
service, no new table** — the two-phase mechanism already exists.

**Behaviour.**
1. `save()` the snapshot as soon as `assemble` returns, with
   `narrative = { used: false, pending: true }` and empty cache key.
2. Emit the existing `codegraph.clusters` progress event so the UI can render.
3. Resolve narrative, then finish with `updateNarrative`
   (`CodeGraphRepository.bx:153`) — the same call `refreshNarrative:381` already
   makes.
4. UI renders structure on the event; meaning sections show a third state,
   "meaning arriving", beside the existing "unavailable" and "present".

**Do not.** Do not stream partial *structure* — a half-built graph misleads in a
way a missing briefing does not. Render once `assemble` completes. Do not add
polling; run events already arrive over the existing SSE stream (E58 item 4). Do
not make a Review run pay for narrative.

**Contract.** `GET /runs/:id/result` may now return a snapshot with
`narrative.used = false, narrative.pending = true`. Additive field; existing
clients that check `used` behave unchanged. OpenAPI: document `pending`.

**Settings / schema / parser.** None.

**Degradation — and the state question this step creates.** Splitting one write
into two means a run can now **fail or be cancelled while a valid snapshot
exists**, which could not happen before. Decide these explicitly rather than
discovering them:

| Situation | Required behaviour |
|---|---|
| Narrative throws | Snapshot stands; `narrative.used = false` + error. Strictly better than today, where a 75% failure still blocks the write until 90% |
| Run cancelled after phase 1 | Snapshot stands, run status `cancelled`. `getResult` **must** serve the structure — a cancelled run with usable structure is a feature, not a leak |
| Run cancelled before phase 1 | No row, as today |
| Lease lost between phases | Rethrown as today; the orphaned structure row is valid and re-adoptable by the next run for that project (Step 14) |
| Another run reads mid-write | Must not treat `pending` as a finished narrative — see Step 14's concurrency note |

`narrative.pending` is the flag that distinguishes "meaning is coming" from
"meaning failed", and both from "no provider configured". Three states, one
field plus `used`; do not overload `used`.

No-key: structure persists and renders, banner as today, `pending` never set.
Non-git: unaffected. Egress: unchanged.

**Gate.** Measured and recorded in the ledger: wall time from run start to
**structure visible**, before and after, on this repo — the number must drop below
time-to-narrative. New specs, one per row of the state table above; at minimum:
stubbed narrative that throws leaves a complete snapshot row; cancellation after
phase 1 leaves a snapshot that `getResult` serves; the two-phase write leaves
**one** row, not two.
`box server restart && box testbox run bundles=tests.specs.unit.CodeGraphRunServiceSpec,tests.specs.integration.CodeGraphPersistenceSpec reporter=Min`

**Docs.** `technical-flow.md` CodeGraph pipeline — persist now precedes narrative.
`application-features.md` — structure appears before meaning.

---

## Step 3 — BoxAST parser for BoxLang

**Status** wip · **Pri** P0 · **Preconditions** Step 1 · **Owns** **Review**,
**capabilities API**

**Goal & scope.** Replace line-regex extraction with AST traversal for
`.bx` / `.bxm` / `.bxs`, keeping `getVersion` / `supports` / `parse` identical in
shape. Extraction taxonomy unchanged — new edge kinds are Step 5b.

**Behaviour.**
1. Parse with `BoxAST( filepath: …, returnType: "struct" )`. Heed E6: never pass
   a class body as `source` under the default `sourceType`.
2. Walk for what the regex path produces today: class/interface, function,
   property, `extends`, `implements`, `inject`, `import`, `new`, calls, parameter
   and return types, handler actions, TestBox suites.
3. Emit real `position` start **and** end lines, replacing the
   `max( startLine, startLine )` placeholder at `CodeGraphInventoryAdapter.bx:47`.
4. Multi-line constructs — function signatures, fluent route chains, wrapped
   property declarations — must resolve. Call these out explicitly in the parity
   harness; they are the class of thing E5 is about.
5. Fall back to the regex path on parse failure, recording a per-file
   `parseStrategy`, so a partially-unparseable repo degrades rather than empties.
6. **Global kill switch.** Per-file fallback handles a bad *file*; it does not
   handle a bad *release*. This swap sits under Review as well as CodeGraph
   (E44), on the hottest path in the product, and a systematic AST regression on
   an unfamiliar dialect would have no remedy but a rollback. Ship
   `codegraphParserStrategy = ast | regex | auto` (default `auto`), so the regex
   path stays reachable by configuration for one release cycle.

**Do not.** Do not add edge kinds here — Step 5b owns that, and mixing them makes
the parity gate unreadable. Do not delete the regex helpers until the gate passes
**and** the kill switch is retired in a later release.

**Contract.** `ApiCapabilities.bx:45`–`:46` publishes `getVersion()`, so the
version bump is a **published contract change** — move `resources/apidocs/` in the
same commit. Note that `strategy` changes the reported version, so it must be
part of the published value, not a hidden modifier.

**Settings.** `codegraphParserStrategy` (env `DOUBLECHECK_CODEGRAPH_PARSER_STRATEGY`,
default `auto`). It participates in `parserVersion`, and therefore in the parse
cache key and Step 14's reuse key — flipping it must invalidate both, not serve
mixed-strategy results.

**Schema.** None.

**Parser version.** `boxlang-symbol-parser-v2` → `boxlang-ast-parser-v3`. This
invalidates `analysis_parse_cache` by construction (E7) — do not hand-migrate.
First run after deploy re-parses everything; note the expected one-time cost.

**Degradation.** Parse failure → per-file regex fallback, recorded. No-key
unaffected. Non-git unaffected. No egress.

**Gate.** Parity harness over `app/**`: AST symbol and dependency sets must be a
**superset** of regex output for every file; each regression is fixed or recorded
here with a reason. Then
`box server restart && box testbox run reporter=Min` — full suite, because Review
shares this path (E44). Record parse wall time before/after.

**Docs.** `technical-flow.md` parser section; `application-features.md` language
tier row stays unchanged until Step 17 measures it.

---

## Step 4 — Position-independent symbol ids

**Status** wip · **Pri** P0 · **Preconditions** Step 3 · **Owns** **Review**

**Goal & scope.** Stop cosmetic edits invalidating baselines, Review impact cones
and the entire briefing (E12). Scope: `ArchitectureIndexService.stableId` and its
consumers.

**Behaviour.**
1. Re-key `stableId` on structural identity —
   `filePath:recordType:kind:qualifiedName` plus an occurrence ordinal for genuine
   same-name siblings — not `line`.
2. Keep `line` as a display attribute; it must not enter the hash.
3. Verify propagation to unit ids (`CodeGraphInventoryAdapter.bx:37`), snapshot
   fingerprint, and narrative cache key.

**Do not.** Do not use `contentHash` as the id basis — it changes on every edit,
the same failure in different coordinates.

**Contract.** Symbol and dependency ids change shape once. They are opaque to
clients, but any persisted baseline keyed on them is invalidated — treat the
first run after deploy as a baseline rebuild and say so in the release note.

**Settings / schema.** None. Existing rows are re-derived per run.

**Parser version.** No parser change; ids are assigned in
`ArchitectureIndexService.materialize`, downstream of parsing.

**Degradation.** No-key, non-git, egress unaffected.

**Gate.** Insert a blank line at the top of a fixture file, re-run, assert:
symbol ids unchanged, snapshot fingerprint unchanged, narrative reused
(`findReusableNarrative` hits), **and** a Review impact cone over the same edit is
unchanged. Add as specs.
`box server restart && box testbox run reporter=Min`

**Docs.** `app/models/README.md` — `ArchitectureIndexService` id contract.

---

## Step 5a — Edge-kind pass-through

**Status** wip · **Pri** P0 · **Preconditions** Step 4 · **Owns** **Modernize**

**Goal & scope.** Stop discarding edge semantics **without changing the graph's
shape**. No new kinds are produced here; this step only stops existing and future
kinds being destroyed.

**Read E59 first.** The naive version of this step — un-collapse `mapKind`,
extend `structuralKinds` — changes edge identity, and therefore edge counts, cap
behaviour, affinity weights, Louvain communities and Modernize's CI-gated seam
metrics. The design below avoids all of that.

**Design: kind becomes an attribute, not an identity.**

1. `CodeGraphInventoryAdapter.mapKind` returns **both** a canonical group and the
   specific kind — `{ group: "component-construction", kind: "injects" }` — rather
   than flattening to the group (E4). Keep `tests` dropped deliberately.
2. `mapKind` stops returning `""` for unrecognised kinds (`:159`), which is the
   filter that would silently discard everything Step 5b adds (E32a). Unknown
   kinds pass through with a group of their own.
3. `ModernizationCouplingGraphService.buildStructuralEdges` keeps deduping on
   `from | to | group` — **identity unchanged** — and accumulates the observed
   specific kinds into a new `kinds[]` array on the merged edge, alongside the
   existing `occurrences` counter.
4. `structuralKinds` (`:48`) gains the new **groups** only, so `:236`'s allowlist
   keeps working as written.

Everything downstream that reads `edge.kind` keeps reading the group and behaves
identically. CodeGraph reads `edge.kinds[]` where it wants fidelity — flows
already bypass this path entirely (E14b), so the fidelity gain lands in cluster
edges, the inspector and Step 13's path weighting.

**Do not.** Do not land any subset — all four edits ship together or none does.
Do not make kind part of the dedup key (E59). Do not change `resolutionWeights`,
cohesion maths, or the caps.

**Contract.** Edges gain `kinds[]` in the snapshot and in `/codegraph/edges`.
`kind` keeps its current meaning and values. Purely additive. Verify the UI edge
filter has no hardcoded kind list before shipping.

**Settings / schema / parser.** None.

**Degradation.** Unchanged paths. No-key, non-git, egress unaffected.

**Gate — three assertions, the first two non-negotiable:**

1. **Graph invariance.** On a fixture and on this repo, `graph.getEdges()` is
   **byte-identical** before and after, ignoring the new `kinds[]` field: same
   count, same keys, same weights, same `occurrences`, same truncation reasons.
2. **Cluster invariance.** `deriveClusters` output is byte-identical, and
   `ModernizationCorpusSpec` "Step 3b stop conditions" still pass —
   `seamPrecision ≥ baseline`, `seamRecall > baseline`. If either moves, the
   design in E59 was not followed.
3. **Fidelity gained.** An `A → B` pair carrying both `injects` and `calls`
   reports `kinds: [ "calls", "injects" ]` on one edge — proving detail survived
   without a second edge appearing.

```bash
box server restart && box testbox run reporter=Min
```

**Docs.** `app/models/README.md` — `CodeGraphInventoryAdapter.mapKind` and the
`CouplingGraph` edge contract; `technical-flow.md` edge vocabulary.

---

## Step 5b — Route, view, table, scope and integration edges

**Status** wip · **Pri** P0 · **Preconditions** Step 5a · **Owns** **Modernize**
(shared extractor)

**Goal & scope.** Add the hops that turn a call chain into a request flow.
**Lift existing extraction; do not write a SQL parser** (E46).

**Behaviour.**
1. **route → handler.action.** From the router AST, follow the fluent chain
   `route( pattern )` → `.withAction()` / `.toHandler()` and emit a `routes` edge
   from a `route:` node, carrying verb and pattern (E5).
2. **handler → view.** `event.setView( "main/x" )` → `renders` edge to the
   resolved `.bxm` (E6b).
3. **Tables.** Move `ModernizationInventoryService.sqlReferences:654` into a
   shared scanner mechanic following `CfmlSourceScanner` exactly (E48): **share
   mechanics, never merge taxonomies.** Modernize keeps emitting its vocabulary
   unchanged; the parsers gain the ability to emit `table-query` with the table
   **name** as target. Use the existing `dynamicIdentifier` flag as the
   skip-dynamic-SQL guard. Honour E47's warning verbatim — never emit a kind
   whose target is a constant.
4. **Scope and integration.** `scope.application` / `scope.session` /
   `scope.client`, and `http` / `schedule` — same lift, same rule (E46, E47).
   `http` is the sink type Step 9 needs.
5. **Framework pseudo-targets.** Classify `inject="coldbox:setting:x"` and
   `logbox:logger:{this}` as framework/config rather than structural.

**Do not.** Do not merge the extractors (E48) — it moves Modernize's signals,
which are CI-gated. Do not extend SQL parsing beyond table names. Do not create
table nodes for dynamic SQL.

**Contract.** New edge kinds in snapshot and `/codegraph/edges`. New `route:` and
`table:` node id prefixes — the `table:` convention already exists in the coupling
service (E47); reuse it, do not invent one. Document new kinds in OpenAPI
alongside Step 17's edges-endpoint fix.

**Settings / schema / parser.** No settings, no schema. **Parser version bump** —
new dependency kinds mean new parse output.

**Degradation.** Dynamic SQL is skipped, not guessed, and the skip is recorded.
Unresolvable route targets emit no edge rather than a guessed one. No-key,
non-git unaffected. No egress.

**Gate.** On this repo: a `routes` edge for every route in `Router.bx`; a
`renders` edge for each `event.setView` in `Main.bx`; `table:` resources for the
tables in `SchemaService`. Modernize's inventory output must be **byte-identical**
before and after the extractor move — assert it. Both corpora green.
`box server restart && box testbox run reporter=Min`

**Docs.** `technical-flow.md` edge vocabulary; OpenAPI edge-kind enum;
`app/models/README.md` for the new shared mechanic.

---

## Step 6 — JavaScript parser and the full-stack edge

**Status** wip · **Pri** P0 · **Preconditions** Step 5b · **Owns** Review (scan
scope only)

**Goal & scope.** Make the declared JavaScript support real and close
browser → API → service → repository → table.

**Behaviour.**
1. New `JavaScriptParserService` implementing the same contract; register in
   `ArchitectureIndexService.bx:29`.
2. Extract ESM `import`/`export`, `require`, function and class declarations,
   `const fn = …`, and **`fetch( "/api/v1/…" )` call sites**.
3. Emit `calls-api` from the JS file to the matching `route:` node from Step 5b,
   matching with parameter placeholders normalised
   (`/api/v1/runs/:id/codegraph/edges`).
4. Add `js`, `jsx` to the CodeGraph allowlist at `ReviewRunService.bx:402` (E3).

**Do not.** No bundler resolution, no `node_modules` traversal, no framework
runtime, no TypeScript (§3.1). Do not raise the JS tier here — Step 17 measures it.

**Contract.** New `calls-api` kind; JS nodes appear in snapshots. Scan language
counts change for CodeGraph runs (visible in run metadata).

**Settings.** Consider a `codegraphMaxJavaScriptFiles` cap mirroring the
modernize path if `public/assets` dominates; decide from the first measured run,
not in advance.

**Schema.** None. **Parser version:** new parser, own version string; it joins
`ApiCapabilities`' published map (E44) — OpenAPI moves with it.

**Degradation.** A JS file that fails to parse is skipped and recorded, as with
Step 3's fallback. No-key, non-git unaffected. No egress.

**Gate.** CodeGraph run on `C:\Box\DoubleCheck`: `public/assets/app.js` appears
with `language: "JavaScript"`; at least one flow starts in JS and reaches a
`table:` node. `node --test tests/js/*.spec.mjs` and
`box server restart && box testbox run reporter=Min` green.

**Docs.** `application-features.md:201` and `:212` (JS no longer "skipped");
`codegraph.bxm:38` field hint (E55); `technical-flow.md`; OpenAPI parser map.

---

## Step 7 — CFML parity

**Status** wip · **Pri** P1 · **Preconditions** Step 5b · **Owns** **Review**

**Goal & scope.** Close the CFML deficit. **Two independent pieces — 7a is the
urgent one and does not depend on 7b.**

**7a — DI edges (E9).** `CfmlParserService` emits no `injects` at all, so
ColdBox/WireBox ColdFusion applications — this product's core legacy target —
produce graphs with dependency wiring missing. Add `inject` attribute extraction
to the property handling, mirroring `BoxLangParserService.bx:150`. This is a
regex-level fix; it does **not** require the AST.

**7b — AST for CFML.** `BoxAST` with `sourceType: "cfscript"` / `"cftemplate"`
(E1). The script path is still a line loop (`:36`); tag handling already joins
lines (E8). Take this for fidelity, not rescue — it is the safest thing in the
plan to defer.

**Do not.** Do not merge the CFML and BoxLang parsers; their taxonomies differ
(E48). Do not raise the CFML tier — Step 17 measures it.

**Contract.** CFML repos gain `injects` edges. Review's CFML graphs change too —
this is a fidelity improvement, but it is a behaviour change (E44).

**Parser version.** Bump `cfml-symbol-parser-v1` for each of 7a and 7b.

**Degradation.** Unchanged. No-key, non-git, egress unaffected.

**Gate.** A CFML fixture with `property name="x" inject="Y";` yields an `injects`
dependency resolving to `Y`'s file. Parity harness for 7b as in Step 3.
`box server restart && box testbox run reporter=Min`

**Docs.** `application-features.md` measured language tiers — note the CFML
graph was DI-blind before 7a, since that changes what past runs meant.

---

## Step 8 — Roles from evidence

**Status** wip · **Pri** P1 · **Preconditions** Step 5b · **Owns** Review
(`classifyFile`)

**Goal & scope.** Replace filename guessing with graph evidence; stop the legend
drifting from the enum.

**Behaviour.**
1. Extend the enum with `view` (Step 1g adds the component), `client`, `config`,
   `integration`. **`client` must land before Step 6's JS nodes surface** or
   `public/` makes every asset an entry point (E8b).
2. Derive from evidence: owns a handler-action symbol → `entry`; emits
   `table-query` or `writes` → `persistence`; extends a framework base → that
   role; high `injects` fan-out with low own-symbol count → `orchestrator`. Keep
   path heuristics as tiebreak, not rule.
3. Render the legend from snapshot role counts, replacing the six hardcoded chips
   (E11b).

**Do not.** Do not drop `unknown` — an honest unknown beats a confident wrong
role, and its share is a quality signal for Step 17.

**Contract.** `role` gains enum members; the legend becomes data-driven. Additive.

**Settings / schema / parser.** None.

**Degradation.** No-key, non-git, egress unaffected.

**Gate.** On this repo, `unknown` below 5% of nodes and **no file under
`public/assets/` carries role `entry`** — spec that case explicitly.
`box server restart && box testbox run bundles=tests.specs.unit.CodeGraphMetricsServiceSpec reporter=Min`

**Docs.** `application-features.md` roles row.

---

## Step 9 — Flows v2

**Status** wip · **Pri** P1 · **Preconditions** Steps 6 and 8 · **Owns** —

**Goal & scope.** Make a flow a business process: symbol-level, branch-preserving,
terminating somewhere meaningful. This is CodeGraph's headline promise (§1.2).

**Behaviour.**
1. **Branches** — replace `longestFlowPath`'s single `best` with top-K distinct
   paths per seed, deduplicated by step signature (E14).
2. **Symbol-level steps** — keep `steps[]` file ids for compatibility; add
   `stepSymbols[]` alongside.
3. **Typed sinks** — `table-write`, `table-read`, `http-call`, `event-publish`,
   `view-render`, `unknown`, derived by **mapping** Step 5b's edge kinds, not a
   second analysis. Rank typed-sink flows above depth-exhausted ones.
4. **Seed from routes**, not handler files — a process starts at a URL.
5. **Cap per cluster**, not globally.
6. Replace `duplicate( state.visited )` per branch with an unwinding path set.
7. Make `maxDepth` a setting.

**Do not.** Do not let flow count grow unbounded — the narrative input is capped
at `codegraphNarrativeMaxFlows` and overflowing it silently truncates the briefing
(E40). Note `stepSymbols[]` has no UI consumer until Step 12a; Step 11 uses it
immediately.

**Contract.** `flows[]` gains `stepSymbols[]`, `sinkKind`, `routeId`. Additive.

**Settings.** `codegraphFlowMaxDepth` (default 6 now that request and table hops are typed),
`codegraphMaxFlowsPerCluster`. Env-backed like siblings.

**Schema / parser.** None.

**Degradation.** A flow with no typed sink is still returned, marked `unknown` —
do not hide it. No-key, non-git, egress unaffected.

**Gate.** On this repo, one flow reads end to end:
`app.js → route → ApiCodeGraph.subgraph → CodeGraphRunService → AnalysisGraphRepository → table:review_dependencies`,
every hop a real kind. Spec it as a fixture.
`box server restart && box testbox run bundles=tests.specs.unit.CodeGraphMetricsServiceSpec reporter=Min`

**Docs.** `application-features.md` flows row; `technical-flow.md`.

---

## Step 10 — Reachability, dead code, layer policy

**Status** wip · **Pri** P1 · **Preconditions** Step 9 · **Owns** —

**Goal & scope.** Answer "what is actually live?" and make layer rules
configurable.

**Behaviour.**
1. Compute reachability from the true entry set — routes, `Application.bx`
   lifecycle, scheduled tasks — and report unreachable files. This is the real
   dead-code answer `fanIn == 0 && fanOut == 0` misses (E15).
2. Keep the existing orphan list as a separate, narrower signal; do not conflate.
3. Move layer rules into configuration (E16), defaulting beyond the single
   `models → handlers` rule: `view → model`, `repository → handler`,
   cross-domain persistence.

**Do not.** Do not report test-only-reachable files as dead — label them
`test-only`.

**Contract.** Snapshot gains `unreachable[]` and `reachability` totals. Additive.

**Settings.** `codegraphLayerPolicy` as a structured setting; ship today's single
rule as the default so behaviour is unchanged until configured.

**Schema / parser.** None.

**Degradation.** With no identifiable entry set (a library, say), reachability is
skipped and flagged, not reported as "everything dead". No-key, non-git, egress
unaffected.

**Gate.** Fixture with a known-unreachable file reports it; a
test-only-reachable file is labelled, not condemned; default layer policy
reproduces today's violations exactly.
`box server restart && box testbox run bundles=tests.specs.unit.CodeGraphMetricsServiceSpec reporter=Min`

**Docs.** `application-features.md` issues row.

---

## Step 11 — Narrative: sharding, budget, egress, risk

**Status** wip · **Pri** P1 · **Preconditions** Step 9 · **Owns** —

**Precondition corrected.** An earlier draft gated this on Step 15 (co-change),
reasoning that sharding "wants stable cluster keys". That was wrong twice: a P1
step was gated on a P2 step, and stable cluster keys come from **member
composition** (item 2 below), not from co-change affinity. The real dependency is
**Step 9** — the narrative payload carries flows, so it must be built after
`flows[]` gains `stepSymbols[]` and `sinkKind`, or the briefing describes a shape
that no longer exists.

**Goal & scope.** Stop domain names churning, stop sections starving, stop paths
leaking, and render what is already computed.

**Behaviour.**
1. **Shard by cluster** — cache each cluster's narrative on a per-cluster
   fingerprint instead of the whole-graph one (E17). Only changed domains
   re-narrate. Follow `ModernizationRoadmapShardService`; do not invent a second
   sharding style.
2. **`codegraph_labels` table** in `SchemaService`: `project_path`,
   `cluster_key`, `label`, `provenance` (`ai` | `user`), `created_at`. Reuse
   across runs; `user` outranks `ai`. Key on a **stable cluster key** derived from
   member composition, not the ordinal `clusterId`.
3. **Per-section budget** — allocate proportionally or with reserved minimums,
   and return which sections were trimmed. Today's sequential `break` starves
   flows and cycles (E40).
4. **Relativize paths before egress** (E41). The model needs
   `app/models/services/X.bx`, never `C:\Users\…\clients\<name>\…`.
5. **Render `risk[]`** (E42) — computed, persisted, never shown, while
   `application-features.md:195` claims it ships. Cheapest honesty win available.
6. **Report coverage** — "N of M clusters named", plus trimmed sections.
7. **Collapse `narrate`/`enrich`** to one public entry point (E43).
8. Drop `repositoryRevision` from the reuse key once shards are per-cluster
   (E53) — a commit that does not touch a domain must not rename it.

**Do not.** Do not let a stored label survive a cluster whose membership
materially changed — re-narrate and mark superseded. A stale confident name is
the failure this step prevents.

**Contract.** Narrative payload gains `coverage` and `trimmedSections`; `risk[]`
becomes UI-visible. `POST /runs/:id/codegraph/narrative` unchanged in shape.

**Settings.** Existing `codegraphNarrativeMax*` keys stay; add
`codegraphNarrativeSectionReserve`.

**Schema.** New table `codegraph_labels` + index on
`( project_path, cluster_key )`, in `SchemaService` (single source of truth; no
`resources/database/migrations`).

**This table outlives runs, which every other CodeGraph table does not.**
`codegraph_snapshots` cascades on `review_runs` delete and has an orphan sweep
(`SchemaService.bx:330`). Labels deliberately survive — that is the point — so
they need their own retention answer: no foreign key, and a bounded sweep for
projects whose path no longer exists on disk. **Decide it in this step**, or the
table grows forever and the next person to notice will delete it wholesale.
`project_path` is also the weak part of the key: a moved or renamed directory
orphans its labels. Accept that (labels are cheap to regenerate) and record it —
do not build path-following.

**Consumes Step 9.** Feed `stepSymbols[]` and `sinkKind` into the process-story
payload, and each domain's tables and routes from Step 5b. "Owns `review_runs`,
entered via `POST /api/v1/runs`" is deterministic grounding that beats prose.

**Parser.** None.

**Degradation.** No-key: unchanged — banner, no labels, no risk. Provider
failure: per-shard, so a partial briefing is possible and its coverage number
says so. Non-git: unaffected. **Egress: strictly reduced** by item 4.

**Gate.** Edit one file in one cluster; assert only that cluster re-narrates and
every other domain name is byte-identical. Assert a `user` label survives a
re-run. Assert no absolute path appears in the built payload — spec it against a
fixture with a Windows project path. Assert `risk[]` renders when present.
`box server restart && box testbox run bundles=tests.specs.unit.CodeGraphNarrativeServiceSpec reporter=Min`

**Docs.** `application-features.md:195`, `:220` — risk claim becomes true;
`prompt-system.md`; OpenAPI narrative response.

---

## Step 12a — Explorer: hierarchy and search

**Status** wip · **Pri** P1 · **Preconditions** Steps 9 and 10 · **Owns** —

**Goal & scope.** Make the explorer navigable at real scale. **What is shown**,
not how it is drawn (12b).

**Behaviour.**
1. **Surface `directories` in `getResult`** — already computed and persisted,
   simply never returned (E25). Cheapest win in the plan.
2. **Directory tree above clusters**, collapsible, using the existing rollup
   counts. Build it as a component `/review` can also mount (E58 item 8) — one
   component, two hosts.
3. **Symbol level below files**, consuming Step 9's `stepSymbols[]`.
4. **Persist drill state in the URL**, keyed on **run id**, so views are linkable
   and the back button works. Keying on run id rather than a snapshot object is
   what makes Step 14 cheap.
5. **Search** nodes, clusters, flows and symbols by path, label and role, drilling
   straight to the right level. **Client-side over the loaded snapshot** — this
   is the shipped scope. Server-side search is deferred (Part 5), because it needs
   the storage split (E20) which this plan does not schedule.
6. Show "showing N of M" wherever a cap bites (E26). For subgraph's misleading
   `totalNodes` (E28), **add `graphNodes` rather than redefining `totalNodes`** —
   `subgraph` is a shipped, documented endpoint, and silently changing a field's
   meaning breaks any client that already reads it. Deprecate `totalNodes` in
   OpenAPI; remove it only in a later, announced change.

**Do not.** Do not add a graph library — hand-rolled UMD, local and offline
(§3.1). Do not add polling (E58 item 4). Do not add responsive breakpoints.

**Contract.** `getResult` gains `directories[]`. Subgraph `totalNodes` changes
meaning to the true graph size, with `returnedNodes` added — **this is a
behaviour change to a documented field**; version the response note in OpenAPI
and update the UI read in the same commit.

**Settings / schema / parser.** None.

**Degradation.** No-key: full function; hierarchy and search are deterministic.
Non-git: unaffected. Egress: none.

**Gate.** Reach any file in this repo in ≤3 interactions from the overview.
Search finds a file outside the 120-node render cap and drills to it.
`node --test tests/js/*.spec.mjs`; new `CodeGraphApiSpec` case for
`directories[]` and for `totalNodes` / `returnedNodes`.
`box server restart && box testbox run bundles=tests.specs.integration.CodeGraphApiSpec reporter=Min`

**Docs.** OpenAPI `getResult` and `subgraph` responses;
`application-features.md:218` explorer row.

---

## Step 12b — Explorer: layout that reads connectivity

**Status** wip · **Pri** P1 · **Preconditions** Step 12a · **Owns** —

**Goal & scope.** Cluster and layered layouts position by array index and
alphabetical sort; radial uses edges for ring distance but places by index within
a ring (E24). Make placement reflect connection.

**Behaviour.**
1. **Barycenter ordering** for `layoutLayered` — order each column by the mean
   position of neighbours in the adjacent column. Standard Sugiyama crossing
   reduction; highest improvement per line in this file.
2. **Force-directed relaxation** for `layoutClusters`, seeded from the current
   grid, fixed iteration count, fixed seed.
3. **Connectivity-aware ring ordering** in `layoutRadial` — order each ring so
   neighbours sit adjacent, replacing even-angle-by-index (`:849`).
4. **Fix edge routing** (E29) — choose faces from relative position instead of
   always right→left.
5. Overlap avoidance after positioning; bundling for parallel cluster runs.

**Do not.** Do not introduce non-determinism. Snapshots are fingerprinted and
specs compare output — same input must give byte-identical output. Do not animate
without honouring `prefers-reduced-motion`.

**Contract / settings / schema / parser.** None — pure client geometry.

**Degradation.** No-key, non-git, egress unaffected.

**Gate.** `node --test tests/js/codegraph-layout.spec.mjs` with new specs:
(a) layout output byte-identical across two runs on the same input;
(b) barycenter ordering strictly reduces a counted crossing metric on a fixture
with known crossings; (c) an edge to a node positioned left of its source does
not exit the right face.

**Docs.** `application-features.md:218` layout row.

---

## Step 13 — Dependency path finder

**Status** wip · **Pri** P1 · **Preconditions** Step 12b · **Owns** —

**Goal & scope.** Answer "how does A connect to B?" — orientation, not impact
analysis. **Blast radius stays Review's** (§1.1).

**Behaviour.**
1. **New endpoint** `GET /api/v1/runs/:id/codegraph/paths?from=&to=`, following
   `ApiCodeGraph`'s existing shape: `getScoped` + runKind check,
   `ValidationException` → 422, caps validated against settings.
2. **Directed by default** — `direction=forward|reverse|any`.
   `CodeGraphRunService.buildAdjacency` is undirected (E27); do not reuse it
   unmodified.
3. **K shortest paths**, capped. One path is trivia; three show whether coupling
   is a thread or a thicket.
4. **Weight by edge kind and resolution provenance**, composing with the existing
   `resolutionWeights` (E36) rather than inventing a second confidence scale.
   Surface the weakest hop's provenance. Return unweighted hop count too.
5. **Full per-hop evidence** — kind, source line, snippet — reusing the
   `fileEdges` payload fields.
6. **Distinguish unreachable from cap-exceeded.** Silently returning empty for a
   truncated search is the failure mode here.
7. **UI**: pick two nodes from search, inspector or canvas; render the path with
   the existing `buildFlowHighlightContext` machinery — a path is shaped like a
   flow, so do not build a second highlight path.

**Do not.** Do not run unbounded search on a 20000-edge graph. Do not include
`tests` edges by default — flag it, matching `fileEdges`' `includeTests`
handling. Do not invent a transitive edge to shorten a path.

**Contract.** New endpoint under `/api/v1/*`; **OpenAPI in the same commit**
(AGENTS.md). Response: `{ paths: [ { hops: [ { from, to, kind, line, evidence,
resolution } ], weight, hopCount } ], truncated, reason }`.

**Settings.** `codegraphPathMaxResults` (default 3),
`codegraphPathMaxExploredNodes` (default 5000), `codegraphPathMaxDepth`.
Env-backed like siblings; validated in the handler with 422 on excess.

**Schema / parser.** None.

**Degradation.** Cap exceeded → `truncated: true` with `reason`. No path →
explicit empty result distinct from truncation. No-key: full function.
Non-git: unaffected. Egress: none.

**Gate.** New `CodeGraphApiSpec` cases: a known two-hop path returns exactly
those hops with evidence; reverse returns a different result than forward on an
asymmetric fixture; unreachable and cap-exceeded return distinguishable results;
`limit` above the setting returns 422. Manual: on this repo, path from
`public/assets/app.js` to `AnalysisGraphRepository` resolves through route and
handler hops.
`box server restart && box testbox run bundles=tests.specs.integration.CodeGraphApiSpec reporter=Min`

**Docs.** OpenAPI (`.yaml` and `.json`); `technical-flow.md` HTTP surface;
`application-features.md` features table.

---

## Step 14 — Snapshot reuse and the project map

**Status** wip · **Pri** P1 · **Preconditions** Step 2 · **Owns** —

**Goal & scope.** Serve "quickly" for a project already seen. Complements Step 2:
Step 2 makes the first run feel fast, Step 14 makes the second run instant.

**Behaviour.**
1. **Project-keyed snapshot reuse** (E51) — look up **before scanning**,
   mirroring `findReusableNarrative`. This breaks the circularity where the cheap
   half is gated behind computing the expensive half.

   **The key must cover every input the snapshot depends on**, not just the
   obvious three. A snapshot is a function of source **and configuration**:
   `projectPath` + `repositoryRevision` + `parserVersion` + `snapshotVersion` +
   a hash of the effective `codegraph*` settings — caps (`maxNodes`, `maxEdges`,
   `maxClusters`, `maxHotspots`, `maxOrphans`, `maxLayerViolations`), plus
   whatever Steps 9, 10 and 15 add (`codegraphFlowMaxDepth`,
   `codegraphMaxFlowsPerCluster`, `codegraphLayerPolicy`,
   `codegraphCoChangeEnabled`). Lowering `maxNodes` and getting yesterday's
   larger snapshot back is a silent correctness failure, and it is exactly the
   shape of bug a reuse key invites. Build the settings hash from one named list
   so adding a setting later fails loudly rather than silently widening the key.
2. **A project-scoped entry point** (E52) that opens the newest usable snapshot
   immediately and offers refresh, instead of starting orientation with "configure
   a run".
3. **Adopt a fresh index from any run kind.** A Review run has already indexed
   this project at this revision (E49) — reuse that index rather than re-indexing.
   Structure only; a Review run must never trigger narrative generation.
4. Relax `ApiCodeGraph`'s `runKind` gate on `subgraph` and `edges` from "is a
   CodeGraph run" to "has an indexed graph" (E50b). **Leave `narrative` gated** —
   meaning is CodeGraph's.

**Do not.** **Do not mount the explorer inside Review and do not put findings on
the graph** (§1.1). Do not add a stage to the Review pipeline — Review's cost must
not rise to serve CodeGraph.

**Contract.** `subgraph` and `edges` accept non-CodeGraph run ids. Response
shapes unchanged. OpenAPI: note the relaxed precondition.

**Settings.** `codegraphSnapshotReuseEnabled` (default true) so reuse can be
switched off when debugging staleness. **Excluded from the reuse key** — toggling
it must not itself invalidate cached snapshots.

**Concurrency.** Reuse reads a row another run may be writing (Step 2 now writes
in two phases). Read through `SqliteContentionRetry` as the sibling repositories
do, and **never reuse a snapshot whose narrative is `pending`** — that row is
mid-write, and adopting it would strand a run waiting for a narrative nobody is
generating.

**Schema.** Index on `codegraph_snapshots( project_path, repository_revision )`
in `SchemaService`, beside the existing narrative-reuse index (`:898`).

**Parser version.** Reuse key **includes** `parserVersion` — a parser change must
invalidate reused snapshots, or Steps 3/5b/6/7 silently serve stale graphs.

**Degradation.** Cache miss → normal run. Dirty working tree or no revision →
skip reuse (do not serve a snapshot that does not match what is on disk).
Non-git: no `repositoryRevision`, so reuse is skipped and flagged, not faked.
No-key: unaffected. Egress: none.

**Gate.** Second run on an unchanged revision returns a reused snapshot without
re-scanning, with a **byte-identical fingerprint** to a from-scratch build. Bump
`parserVersion` and assert the cache misses. Dirty tree assert-skips. Non-git
directory produces a normal run, not an error.
`box server restart && box testbox run bundles=tests.specs.integration.CodeGraphPersistenceSpec,tests.specs.integration.CodeGraphApiSpec reporter=Min`

**Docs.** `application-features.md` — `:287`'s "coupling graph UI is
CodeGraph-only" gap: **rewrite it as a deliberate boundary** per §1.1, do not
silently close it. `technical-flow.md` reuse path.

---

## Step 15 — Git co-change and churn

**Status** wip · **Pri** P2 · **Preconditions** Step 1 · **Owns**
**Modernize (CI-gated)**

**Goal & scope.** Add the temporal signal. **Read E18 and E45 first** — clustering
is already Louvain over weighted affinity; this adds a term, it does not replace
an algorithm, and Modernize's seam metrics are gated on the result.

**Behaviour.**
1. New public method on `GitRepositoryService` for commit→files pairs via
   `git log --name-only`, bounded by commit and entry count, following the
   existing `executeTokens` pattern (E21).
2. **Opt-in affinity term** — `buildAffinityGraph` (`:354`) gains an optional
   caller-supplied weight map; `deriveClusters` gains an optional parameter.
   **Absent the parameter, behaviour is byte-identical.** CodeGraph passes it;
   Modernize does not, until its own plan decides to.
3. Replace `hotspotScore`'s hand-tuned constants
   (`CodeGraphMetricsService.bx:388`) with churn × fan-in × cycle membership,
   recording the formula in the snapshot. CodeGraph-local — `hotspotScore` is
   private.
4. Surface author count and last-touched per cluster.

**Do not.** Do not change default affinity. Do not let co-change override
structural coupling — it is a term, not a veto; two files in one sweeping commit
are not a domain.

**Contract.** Snapshot gains `coChange` metrics and a `hotspotFormula` string.
Additive.

**Settings.** `codegraphCoChangeMaxCommits` (default 500),
`codegraphCoChangeEnabled` (default true).

**Schema / parser.** None.

**Degradation.** **Non-git, no history, or shallow clone → degrade to
structural-only and say so in the snapshot; never fail the run.** No-key
unaffected. No egress — git data stays local and is not sent to a provider.

**Gate.** Three parts: (a) with no co-change parameter, `deriveClusters` output is
**byte-identical** to the pre-change build on a fixture; (b)
`ModernizationCorpusSpec` Step 3b stop conditions still pass (§3.3 rule 3); (c)
runs on this repo and on a non-git directory, the second producing a snapshot with
co-change absent and flagged.
`box server restart && box testbox run reporter=Min`

**Docs.** `application-features.md` hotspot ranking; `app/models/README.md`
`GitRepositoryService` public API.

---

## Step 16 — Swimlane and export

**Status** wip · **Pri** P2 · **Preconditions** Step 13 · **Owns** —

**Goal & scope.** Show a flow as a flow, and let the graph leave the app.

**Behaviour.**
1. **Swimlane layout** in `codegraph-layout.js` — role lanes
   (client → entry → orchestrator → domain → persistence → table), selected flow
   left to right. Reuses 12b's routing fixes and 13's path rendering.
2. **Export** — Markdown briefing, Mermaid flow/path diagram, SVG canvas.
   `export` returns 422 today (`application-features.md:222`).
   `ReportExportService` is the precedent. Mermaid for one flow or one path is the
   cheapest high-value export and pastes into any PR.
3. Inspector: source excerpt at the cited line.

**Do not.** No responsive breakpoints. Do not invent an export service — extend
the existing one.

**Contract.** `GET /runs/:id/export` starts succeeding for `runKind=codegraph`
with `format=md|mermaid|svg`. OpenAPI in the same commit.

**Settings / schema / parser.** None.

**Degradation.** Export with no narrative produces the structural sections and
says meaning was unavailable — it must not fail. Egress: export writes locally
only.

**Gate.** Manual pass with a provider and without — both render, drill and
export. `node --test tests/js/*.spec.mjs` with a swimlane layout spec.
`box server restart && box testbox run bundles=tests.specs.integration.CodeGraphApiSpec reporter=Min`

**Docs.** OpenAPI export; `application-features.md:222`.

---

## Step 17 — Evaluation corpus and contract truth

**Status** wip · **Pri** P2 · **Preconditions** all shipped steps · **Owns** —

**Goal & scope.** Close the Known gap recording CodeGraph quality as unmeasured
(`application-features.md:294`, owner `—`), and make every claim true.

**Behaviour.**
1. Fixture repository with known-correct expected domains, routes, flows, tables
   **and paths**. Score each run: are expected flows found end to end? Does the
   path finder return the known path? Are domain names stable across two runs?
2. Wire into `box run-script test` beside the Review corpus, with thresholds that
   fail the build.
3. **OpenAPI truth** — add the missing `GET /runs/:id/codegraph/edges` (E54),
   plus every endpoint and field this plan added.
4. **Feature truth** in `application-features.md` — JS rows `:201`/`:212`;
   explorer row `:218`; risk briefing `:195`/`:220` (true only after Step 11);
   export `:222`; the `:287` boundary rewrite from Step 14; close the Known-gap
   rows this plan closes and name their owning step.
5. **View truth** — `codegraph.bxm:38` JS hint and the Review-worded pipeline
   list at `:121`–`:128` (E55), so the served HTML is right before JS rewrites it.
6. Revisit JS and CFML tiers in `SupportedLanguageService.bx:19` **only** on
   measured evidence.
7. `technical-flow.md` for the parser, edge kinds, label table, reuse path and
   two-phase persist; `app/models/README.md` for every new or changed service.

**Do not.** Do not raise a language tier or add a feature row for anything the
corpus does not measure. That is the claim rule.

**Contract.** OpenAPI becomes complete for the CodeGraph surface. No runtime
change.

**Settings / schema / parser.** None.

**Degradation.** N/A.

**Gate.** `box run-script test` includes CodeGraph scoring and fails on
regression. Every `/api/v1/*` CodeGraph route appears in `resources/apidocs/`.
No feature row lacks a pointer to code or a measured result.

**Docs.** This step *is* the docs work.

**Working-tree implementation.** `resources/evaluation-corpus/codegraph-v1/`
contains a source-backed route → handler → service → repository → table case;
`tests/specs/integration/CodeGraphCorpusSpec.bx` scores route/table presence,
end-to-end flow recall, bounded path recall, repeated-run fingerprint/domain
stability, and explicitly leaves language tiers unchanged. The source inspector
contract is covered by `CodeGraphRunServiceSpec` and `CodeGraphApiSpec`.

---

# Part 5 — Deferred, out of scope, unverified

## 5.1 Deferred — real, not scheduled

| Item | Why deferred |
|---|---|
| Run-over-run snapshot diff | Unblocked (two fingerprints exist) but wants Step 11's stable labels first, or the diff is dominated by renames |
| Impact-as-story ("if you change X…") | Becomes cheap once Step 13 lands — it is the reverse path query plus prose. But framing must respect §1.1: impact is Review's question |
| Storage split into node/edge/flow tables | Needed for server-side search and cheap diff (E20). Large, and Steps 12a/14 work without it |
| Server-side search | Depends on the storage split above. Step 12a ships client-side search over the loaded snapshot |
| Editable vocabulary beyond Step 11's label override | Step 11's `codegraph_labels` with `user` provenance covers the real need |
| Saved / named path queries | After Step 13 proves the shape |
| Symbol-level explorer as a first-class mode | Step 12a adds a symbol level inside the existing drill; a separate mode is more |

## 5.2 Out of scope — do not build

SaaS, hosted multi-tenant, accounts, login walls, billing, quotas, hosted
retention, PR-bot platform. Automatic migration or any source rewrite. Languages
beyond BoxLang, ColdFusion and JavaScript, including TypeScript. Mobile
navigation, phone layouts, responsive breakpoint redesigns. A second
Domain/Structural graph product. Semantic search, embeddings corpus, chat Q&A
over the graph, generated wiki. Runtime tracing. Hosted graph database.
**Findings badges as CodeGraph's primary chrome** (§1.1).

## 5.3 Unverified — check before relying on

1. Whether `ModernizationCouplingGraphService.build()` weights new structural
   kinds sensibly without further change (affects Step 5a's blast radius).
   Verify by running the Modernize corpus with the extended vocabulary before
   assuming additive-is-safe.
2. Whether `bx-ai` middleware supersedes hand-rolled resilience and telemetry
   (`open-issues.md`). Adjacent, not this plan's, but it would change Step 11's
   gateway assumptions if adopted.
3. Expected one-time re-parse cost after Step 3's version bump on a large repo —
   estimate before deploying, so the first run's latency is not a surprise.
