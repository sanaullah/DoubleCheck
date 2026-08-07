# CodeGraph depth — implementation plan

Committed. **The single live plan for CodeGraph — there is no other.** It
supersedes `codegraph-plan.md` — every task in that file shipped (§0.1); it is
deleted in Step 0.
Product stance stays in
[`codegraph-domain-lens-design.md`](codegraph-domain-lens-design.md); product
truth and Known gaps in [`../application-features.md`](../application-features.md).

## How to use this document

Read Part 0 (what is done), then Part 1 (why this plan exists), then Part 2
(verified facts). Execute Part 4 **in the order of §4.0's graph**, not document
order. Every step is self-contained: goal, preconditions, do, don't, gate.

Rules that override anything you infer:

1. **A claim not in Part 2 is not a fact.** Part 2 entries carry `file:line`.
   If a step depends on something unverified, verify it and add it to Part 2.
2. **BoxLang caches compiled classes.** `box server restart` before every test
   run. Editing a `.bx` and re-running without a restart silently tests old code.
3. **No step begins until the previous step's gate is green.**
4. **Parser changes bump `parserVersion`.** That is the whole migration
   mechanism (E7) — never hand-migrate the cache table.
5. **Deterministic first, LLM second.** Every step must leave the no-key path
   working. Meaning may degrade without a provider; structure may not.
6. **Three documents travel with behaviour changes**, in the same commit:
   `app/models/README.md` (model-layer ownership), `resources/apidocs/openapi.yaml`
   + `.json` (when `/api/v1/*` contracts move), and `../application-features.md`
   (feature rows + Known gaps).

---

# Part 0 — Status ledger

**This table is the answer to "what is done?".** Move it in the same commit as
the work. A step marked done without a recorded gate result is a claim, not a
result.

`Shared` names the other product whose behaviour the step can move (E31). A
shared step is not done until **that** product's suite is green too.

| Step | Title | Priority | Shared | Status | Gate result |
|---|---|---|---|---|---|
| 0 | Hygiene: plan supersession, doc links | P0 | — | ☐ | — |
| 1 | Defects: `LIMIT 0`, budgets, truncation, ids, O(n×m) | P0 | **Review (live defects)** | ☐ | — |
| 2 | BoxAST parser for BoxLang | P0 | **Review + capabilities API** | ☐ | — |
| 3 | Position-independent symbol ids | P0 | **Review** | ☐ | — |
| 4 | Edge-kind fidelity + route / view / table edges | P0 | **Modernize** | ☐ | — |
| 5 | JavaScript parser + `fetch` → route edge | P0 | Review (scan) | ☐ | — |
| 6 | Roles v2 from evidence; legend from snapshot | P1 | Review | ☐ | — |
| 7 | Flows v2: symbol-level, branching, typed sinks | P1 | — | ☐ | — |
| 8 | Reachability, dead code, layer policy | P1 | — | ☐ | — |
| 9 | Git co-change and churn risk | P1 | **Modernize (CI-gated)** | ☐ | — |
| 10 | Narrative sharding, labels, budget fairness, path egress | P1 | — | ☐ | — |
| 11 | Interactive knowledge graph: hierarchy, smart layout, search | P1 | — | ☐ | — |
| 12 | Dependency path finder | P1 | — | ☐ | — |
| 13 | **The lens** — explorer on any run; findings on the graph | P1 | Review (surface) | ☐ | — |
| 14 | Flow swimlane + export | P2 | — | ☐ | — |
| 15 | Evaluation corpus + docs truth | P2 | — | ☐ | — |

## 0.1 Already shipped — do not rebuild

The predecessor plan's Tasks 1–8 are **complete in code** while its checkboxes
all read `- [ ]`. That drift is why it is deleted rather than continued.

| Shipped | Evidence |
|---|---|
| Node `role` | `CodeGraphMetricsService.bx:321` `assignRole` |
| `flows[]` in snapshot | `CodeGraphMetricsService.bx:485` `extractFlows` |
| Narrative v2 role + schemas | `resources/prompts/roles/codegraph-narrative-v2.json` |
| v2 normalize with id-dropping | `CodeGraphNarrativeService.bx:199`–`368` |
| Meaning banner + role legend | `app/views/main/codegraph.bxm:195`, `:197` |
| Process chips + flow highlight | `public/assets/app.js:4196`, `:4217`; `codegraph-layout.js:1197` |
| Capability + docs honesty | `application-features.md:214`, `:220`, `:236` |

The predecessor's own record agrees: `.superpowers/sdd/progress.md` marks all
eight tasks complete, notes the work was deliberately left **uncommitted** per
its "do not commit unless the user asks" constraint, and reports "suites 21
TestBox + 15 JS green" with the provider UI unverified. Treat that as the last
known state, not as a gate result for this plan.

---

# Part 1 — Why this plan exists

CodeGraph ships structure and a Domain-lens briefing over it. The briefing is
only as good as the substrate it cites, and the substrate has three structural
ceilings that no amount of prompt work removes.

**What is not wrong, so nobody rebuilds it.** The analysis layer is stronger
than it looks from the UI. Clustering is Louvain community detection over a
weighted affinity graph, with cycle merging — genuinely coupling-derived, not
folder-derived (E18). Edge targets carry resolution provenance and are weighted
by how confidently they resolved (E36). A datasource/table co-access matrix, a
shared-state overlay and external-integration detection are all implemented and
waiting on input (E34, E35) — and the extractor for that input exists too, in the
Modernize inventory, complete with dynamic-SQL detection (E45). The gap is at the
**edges of the pipeline** — what goes in, and what comes out — and in the
**routing between existing parts**, not in the middle.

That reframes the largest step. Step 4 was scoped as "write table and scope
extraction"; it is actually "lift an existing extractor into a shared mechanic,
following the rule the codebase already wrote down for exactly this situation"
(E46).

**Ceiling 1 — the BoxLang parser reads one line at a time.** It loops lines and
regex-matches each in isolation (E2), so anything expressed across lines is
invisible. The clearest casualty is in this repo's own router: a route
declaration spans five lines, so the parser records the URL as a bare symbol and
can never learn which handler serves it (E5).

Note the asymmetry, because it is backwards: the **CFML** parser already joins
multi-line constructs and caches compiled patterns through `CfmlSourceScanner`
(E44). The tier-1 language has the weaker parser, and the fix for its hottest
defect is an existing shared mechanic it simply does not call.

**Ceiling 2 — the graph has no front end and no back end.** JavaScript is
excluded from CodeGraph scans by an explicit allowlist (E3), so 8,031 lines of
UI are absent. At the other end, no edge reaches a database table (E7). A "flow"
therefore starts at a handler file and stops at whatever service the walk
happened to exhaust — never at a URL, never at a table.

The product promise is business meaning and end-to-end flow. Today the widest
truthful flow is *handler → service → service*. The target is
**click → `fetch` → route → handler action → service → repository → table**, with
each hop carrying a real edge kind and a citable position.

**Ceiling 3 — the explorer cannot show what is already computed.** The canvas
renders at most 120 nodes of a snapshot holding up to 1500, with no search to
reach the rest (E26, E21). Worse, no layout algorithm consults an edge: positions
come from array index and alphabetical sort, so a graph whose entire purpose is
showing connection is laid out as though connection did not exist (E24). And the
directory rollup that would make a large repo navigable is computed on every run,
persisted, and then dropped before the API responds (E25).

All three are liftable now, and cheaper than they look. BoxLang exposes a real
AST as a public BIF that parses BoxLang, `.bxm` templates and CFML in both
dialects — verified against this repo's own runtime (E1). The scanner already
reads JavaScript content for Review runs; only CodeGraph filters it out, by one
line (E3, E23). The table and integration analysis already exists and only needs
feeding (E34, E35). And the hierarchy the explorer needs is already in the
snapshot, one payload field away (E25).

Steps 2–10 widen and correct the substrate. **Steps 11 and 12 — the interactive
knowledge graph and the dependency path finder — are what a person actually
touches**, and they are where the substrate work becomes visible.

**One caution that shapes every step.** Almost none of this code is CodeGraph's
alone: the parsers and index feed Review, the coupling and clustering services
feed Modernize, and Modernize's correctness is CI-gated against clustering
behaviour (E31, E33). §2.10 is the consumer map and §3.2 the coordination
rules. Read both before editing a shared service — an earlier draft of this plan
treated five of these steps as local changes, and they are not.

**And a floor before any of it.** §2.11 records five live defects found while
verifying the above, three of them in shared graph loading. The sharpest:
`ReviewRunQueryService` and `ReviewRunService` ask for a run's graph without a
limit, and a mis-scoped bind variable turns that into `LIMIT 0` — **those two
paths have been returning zero impacts** (E37). Separately, truncation that
happens at the SQL boundary is computed, returned, and then ignored, so a
snapshot missing thousands of symbols reports itself complete (E39). Step 1 fixes
these first: every measurement this plan takes afterwards is otherwise taken on a
broken base.

---

# Part 2 — Verified evidence base

Every claim carries `file:line`, checked on branch `dev3` on 2026-08-07. Re-check
before trusting after a gap.

## 2.1 The AST is available

**E1 — `BoxAST()` works in this runtime.** Runtime is `boxlang@be`
(`server.json:4`); binary at `C:\boxlang\bin\boxlang`. Confirmed by execution:

| Input | Result |
|---|---|
| `BoxAST( filepath: ".../CodeGraphInventoryAdapter.bx", returnType: "struct" )` | `ASTType = BoxClass`; keys `ASTType, ASTPackage, sourceText, position, comments, imports, body, annotations, documentation, properties` |
| `BoxAST( filepath: "app/views/main/codegraph.bxm" )` | `ASTType = BoxTemplate` |
| `BoxAST( source: "<cfcomponent>…", sourceType: "cftemplate" )` | `ASTType = BoxTemplate` |
| `BoxAST( source: "component { … }", sourceType: "cfscript" )` | `ASTType = BoxScript` |

**E6 — `BoxAST` gotcha, cost one debugging cycle already.** Passing a class body
as `source` with the default `sourceType: "script"` throws
`NullPointerException: Cannot invoke "BoxNode.toJSON()" because "root" is null`
— not a parse error. Always pass `filepath`, or set `sourceType` explicitly.

**E7 — parser swaps need no migration.** `ArchitectureIndexService.bx:53` looks
up cached parse results by `( contentHash, parserVersion )`. Bumping
`variables.parserVersion` (`BoxLangParserService.bx:7`) invalidates every stale
entry by construction.

## 2.2 What the parsers cannot see

**E2 — line-scoped regex, in the BoxLang parser specifically.**
`BoxLangParserService.bx:30` iterates `file.lines`; every rule matches a single
`sourceLine`. `match()` at `:380` builds the pattern with
`createObject( "java", "java.util.regex.Pattern" )` **twice per call, per line,
per file** — both a hot-path cost and a violation of the `import java:` rule in
AGENTS.md / `.cursor/rules/boxlang-java-interop.mdc`.

**E44 — correction: this is not true of the CFML parser, and the asymmetry is
backwards.** An earlier draft said "the parsers read one line at a time". Only
the BoxLang one does.

`CfmlParserService` delegates to `CfmlSourceScanner` (77 lines) for two
mechanics the BoxLang parser lacks entirely:

| Mechanic | CFML | BoxLang |
|---|---|---|
| Multi-line construct joining | `joinTagLines( lines, start, maxLookahead = 5 )` (`:449`) — joins a wrapped tag, stops at `>` or 5 lines, reports `endLine` | none |
| Compiled-pattern cache | `compiledPattern()` (`:456`) over `CfmlSourceScanner.patternCache` | none — `createObject` twice per match |

So **the tier-1 language has the weaker parser**, and the `discovery-only`
language has the better machinery. Two consequences: E2's "invisible across
lines" claim applies to BoxLang only, and the pattern-cache fix for BoxLang is
available **today**, independent of the AST work — the shared cache already
exists and is already used by a sibling parser.

**E5 — routes are dead-end symbols.** `BoxLangParserService.bx:173` captures
`route( "…" )` as a symbol of kind `route`. The target is on other lines —
`Router.bx:111`–`115` spans `route(…)` / `.withVerbs(…)` / `.withAction(…)` /
`.toHandler(…)` / `.end()`. No route→handler edge is emitted anywhere.

**E6b — handler → view is never captured.** `Main.bx:29`
`event.setView( "main/dashboard" )`. No parser rule matches `setView`.

**E7b — no edge reaches a table.** `queryExecute` appears in 10+ repositories
(`CodeGraphRepository.bx:18`, `:69`, `:120`, `:158`). No rule extracts table
names; there is no table node kind.

**E23 — Review sees JS, CodeGraph does not.** `ReviewRunService.bx:392`–`408`
sets scan options per run kind. The `codegraph` branch sets
`allowedExtensions: [ "cfc", "cfm", "bx", "bxm", "bxs" ]` (`:402`); the review
path sets none, so Review scans `.js`/`.jsx`. Either way no parser claims them:
`ArchitectureIndexService.bx:29` holds `[ boxLangParserService, cfmlParserService ]`
and `:45` skips a file when none supports it.

**E3 — JavaScript is a declared supported language with zero implementation.**
`SupportedLanguageService.bx:19` lists `js`, `jsx` at tier `discovery-only`.
`public/assets/app.js` is 8,031 lines.

## 2.3 Fidelity lost after parsing

**E4 — five edge kinds collapse into one.** `CodeGraphInventoryAdapter.bx:149`–`157`
maps `constructs`, `injects`, `imports`, `calls`, `type-reference` all to
`component-construction`; `:146` drops `tests`. Downstream clustering, cohesion
and flow weighting cannot distinguish an injected dependency from an import.

**E12 — symbol ids move when unrelated lines move.**
`ArchitectureIndexService.bx:431`–`444` hashes
`filePath:recordType:kind:name:line`. Inserting a line near the top of a file
changes the id of every symbol below it. Those ids flow into unit ids
(`CodeGraphInventoryAdapter.bx:37`), the snapshot fingerprint
(`CodeGraphMetricsService.bx:114`) and the narrative cache key
(`CodeGraphRunService.bx:71`). Result: cosmetic edits invalidate baseline reuse,
impact diffs and the whole briefing.

**E17 — narrative caching is all-or-nothing.** The fingerprint covers
`nodes, clusters, clusterEdges, cycles, flows, totals`
(`CodeGraphMetricsService.bx:106`–`114`). Any single file change produces a new
fingerprint, so the entire briefing is regenerated and **domain names change
between runs on unrelated edits**.

**E18 — cluster *naming* is folder-shaped; cluster *membership* is not.**
Read this one carefully — an earlier draft of this plan got it wrong and would
have sent an implementer to replace an algorithm that is already correct.

`deriveClusters` (`ModernizationDerivedStructureService.bx:61`) runs **Louvain
community detection over a weighted affinity graph** (`:66`–`:68`:
`buildAffinityGraph` → `louvainCommunities` → `mergeCycleCommunities`).
Membership is genuinely coupling-derived.

Only the **label** is folder-shaped (`:102`–`:105`: `featureDomainKey` →
`featureFolderFromPath` → `sanitizeDomainToken( listLast( path, "/" ) )` →
fallback `"main-app"`), and the code says so deliberately at `:100`:

> Membership is derived; naming stays folder-shaped, which is what folders are
> actually good for.

So the "map with no legend" problem is a **naming** problem, not a clustering
problem. Step 10 fixes naming. Step 9 adds a signal to affinity — it does not
replace Louvain.

## 2.4 Classification and roles

**E8 — `public/` outranks everything.** `ArchitectureModelService.bx:238` maps
`(^|/)public/` to `entry-points`, which `CodeGraphMetricsService.bx:330` turns
into role `entry`. When JS lands (Step 5), every asset becomes a false entry
point unless a `client` role exists first.

**E4b — views classify as `other`.** `classifyFile`
(`ArchitectureModelService.bx:206`–`242`) has branches for tests, handlers,
models, config, docs, manifests, public — **no `views/`**. So
`app/views/main/codegraph.bxm` → `other` → `assignRole` falls through to
`unknown` (`CodeGraphMetricsService.bx:345`).

**E13 — JS nodes would carry a blank language.**
`CodeGraphMetricsService.bx:708`–`713` returns `""` for anything not
`bx|bxm|bxs|cfc|cfm|cfml`.

**E11b — the legend is hardcoded.** `codegraph.bxm:197`–`203` hardcodes six role
chips; they will drift from `assignRole`'s enum on the next change.

## 2.5 Flows

**E9 — flow extraction, as built** (`CodeGraphMetricsService.bx:485`):

| Property | Where | Consequence |
|---|---|---|
| Only `injects` / `calls` kinds | `:546` | Route, view, table and event hops invisible |
| `maxDepth = 3`, hardcoded | `:493` | Deeper request paths truncate silently |
| **One path per seed** — `longestFlowPath` keeps a single `best` | `:609`–`658` | A handler calling four services yields **one** flow |
| Steps are file ids | `:530`–`535` | A process story cannot name the method |
| No sink typing | `:505` | Flow ends where the walk exhausted, not at a meaningful terminus |
| `maxFlows` default 24, sorted by depth | `:30`, `:511` | Large repos show an arbitrary 24 |
| `duplicate( state.visited )` per branch | `:638` | Cost grows with fan-out |

## 2.6 Defects and performance

**E10 — snapshots can cite nodes they do not contain.** `assemble` computes
hotspots (`:79`), orphans (`:80`), layer violations (`:81`) and flows (`:82`)
from the **full** node array, then truncates `nodes` to `maxNodes` at `:85`–`88`.
Any referenced node beyond the cap becomes a dead drill-down target.

**E11 — two quadratic loops per run.** `crossingEdgeCount` (`:365`–`378`) walks
every edge and is called once per node from `buildNodes` (`:289`) — at the
configured caps (`Coldbox.bx:116`–`117`: 1500 nodes, 20000 edges) that is up to
30M iterations. `presentClusters` (`:170`–`174`) loops all graph nodes per
cluster with `filePaths.contains()` inside.

**E14 — one layer rule exists.** `:457` flags only
`application-models → http-handlers`. No policy configuration; no view→model,
repository→handler, or cross-domain-persistence rule.

**E15 — orphan detection misses the common case.** `:426` requires
`fanIn == 0 && fanOut == 0`. A file nothing calls but which calls five things
(`fanIn 0, fanOut 5`) — the usual shape of dead code — is not reported.

## 2.7 Storage and surface

**E16 — one JSON blob per run.** `SchemaService.bx:543`: `codegraph_snapshots`
is keyed on `run_id` with `snapshot_json` and `narrative_json` as TEXT; indexes
at `:898`–`899` cover narrative reuse and fingerprint only. There are no node,
edge, flow or label tables — so server-side search, run-over-run diff and
per-cluster narrative caching all require loading and re-parsing whole blobs.

**E20 — no co-change API.** `GitRepositoryService` exposes `inspect`,
`workingTreePaths`, `fullPaths`, `revisionPaths`, `readBlob`,
`changedLineRanges` (`:225`), with `executeText` / `executeTokens` private
(`:323`, `:332`). Commit-pair extraction is a new public method, not a
new dependency.

**E21 — no search, no export.** No `codegraph-search` handle exists in `app.js`.
Export returns 422 (`application-features.md:222`).

**E22 — three layouts.** `codegraph-layout.js` implements cluster (`:720`),
layer (`:750`) and radial (`:795`), rendered by `buildSvg` (`:1197`). No
sequence or swimlane layout.

## 2.9 Explorer: navigation and layout

**E24 — no layout algorithm reads an edge.** This is the headline finding for
Step 11. All three layouts position nodes without consulting connectivity:

| Layout | Positioning rule | Consequence |
|---|---|---|
| `layoutClusters` `:714` | Grid by array index — `col = i % cols` (`:721`) | Placement is alphabetical accident; edges cross arbitrarily |
| `layoutLayered` `:744` | Columns by layer; **rows sorted alphabetically** (`:761`) | No barycenter ordering, so crossings are unbounded |
| `layoutRadial` `:790` | BFS rings from focus (`:812`–`:822`), then **even angles by array index** (`:849`) | Connected nodes are not placed near each other |

`edges` are copied through untouched in every case
(`edges.map((e) => Object.assign({}, e))`). There is no crossing minimisation,
no overlap avoidance, no force simulation, and no edge bundling.

**E28 — edge routing assumes left-to-right.** `edgePath` (`:897`) always exits
the source's **right** face (`x1 = a.x + aw`) and enters the target's **left**
face (`x2 = b.x`), regardless of relative position. Any edge pointing leftward
or vertically renders as a backwards curve through intervening nodes.

**E26 — the canvas shows a fraction of the snapshot.** `app.js:4888` and `:4909`
request `maxNodes: 120`; `:4912` requests `60` for overview. The server snapshot
carries up to `codegraphMaxNodes` = 1500 (`Coldbox.bx:116`). On a large repo the
explorer renders under 10% of what was computed — **and there is no search to
reach the remainder** (E21). Navigation, not rendering, is the binding
constraint.

**E25 — the directory rollup is computed and thrown away.**
`CodeGraphMetricsService.bx:83` builds `directories` (path, fileCount,
symbolCount, fanInSum, fanOutSum) and returns it at `:130`, so it is persisted
inside `snapshot_json`. But `CodeGraphRunService.getResult` (`:154`–`171`) does
not include `directories` in the payload, and `app.js` never references it. The
hierarchical spine Step 11 needs is already being calculated — it just never
leaves the service.

**E27 — the only adjacency builder is undirected.**
`CodeGraphRunService.buildAdjacency` (`:469`–`487`) appends **both** directions
for every edge (`:483`–`:484`). Correct for neighbourhood BFS; wrong for a path
finder, where "A depends on B" and "B depends on A" are different answers. Step
12 needs directed traversal with undirected as an explicit mode.

**E29 — drill-down is three fixed lenses, not a hierarchy.**
`state.codegraph` holds `mode` / `clusterId` / `focusId` / `focusSubgraph`
(`app.js:109`–`111`), driving cluster → file → focus with a breadcrumb
(`:4769`–`:4778`) and depth buttons gated on `hasCluster` / `hasFocus`
(`:4753`–`:4761`). It works, but each level is flat: there is no directory tree
above clusters and no symbol level below files — so Step 7's `stepSymbols[]`
would have no consumer until Step 11 lands.

**E30 — path-finding primitives already exist, in the wrong places.**
`layoutRadial` runs a client-side BFS over an adjacency map (`:806`–`:822`), and
`ArchitectureIndexService.buildImpactCone` (`:115`) runs a bounded reverse-edge
BFS server-side. Step 12 is a new endpoint plus UI, not a new algorithm family.

## 2.10 Shared ownership — the blast radius this plan sits inside

**Almost nothing this plan touches is CodeGraph's alone.** An earlier draft
treated Steps 2, 3, 4, 6 and 9 as local changes. They are not. This section is
the correction, and Part 3's shared-service rule follows from it.

**E31 — consumer map**, from `inject=` and direct-construction sites:

| Service | Also used by | Steps that touch it |
|---|---|---|
| `BoxLangParserService`, `CfmlParserService` | `ArchitectureIndexService`, **`ApiCapabilities.bx:45`–`46`** (publishes `getVersion()` in the capabilities contract) | 2, 2b |
| `ArchitectureIndexService` | **`ReviewRunService`** | 3, 4 |
| `AnalysisGraphRepository` | `ReviewRunService`, `ReviewRunQueryService` | 3, 4 |
| `ArchitectureModelService` | **`ReviewRunService`** | 1, 6 |
| `ModernizationCouplingGraphService` | **`ModernizationRunService`** | 4 |
| `ModernizationDerivedStructureService` | **six Modernize services** — `FragmentMerger`, `ProposalService`, `RoadmapShardService`, `RoadmapSynthesisService`, `RunService`, `ShardExecutor` | 9 |

Consequences that must shape the work:

- **Step 2's `parserVersion` bump is a published contract change.**
  `ApiCapabilities` exposes parser versions; OpenAPI moves with it.
- **Step 3's id change alters Review's impact cones**, which are keyed on the
  same `stableId`. Review specs must be run, not assumed.
- **Step 9 is gated by Modernize's corpus** — see E33.

**E32 — `structuralKinds` is a four-item allowlist, and un-collapsing drops
edges.** `ModernizationCouplingGraphService.bx:48` declares
`[ "extends", "implements", "include", "component-construction" ]`, and
`buildStructuralEdges:236` does `if ( !structuralKinds.contains( kind ) ) continue`.

So Step 4's "stop collapsing kinds in `mapKind`" (E4) **silently deletes every
`injects` / `calls` / `imports` / `constructs` / `type-reference` edge** unless
the vocabulary is extended in the same commit. This is not a risk to watch for;
it is the guaranteed outcome of doing half the change. The two edits ship
together or neither ships.

**E33 — Modernize's correctness is measured against clustering behaviour.**
`modernize-inversion-plan.md` Step 3 defines five committed stop conditions
asserted in CI by `ModernizationCorpusSpec` → "Step 3b stop conditions",
including `seamPrecision ≥ baseline` and `seamRecall > baseline` against
`baseline-llm-path.json`. Those gates read clusters out of
`deriveClusters`. **Any change to affinity or community detection moves
Modernize's measured seam quality.** Step 9 must therefore be opt-in per caller,
not a change to the default path.

**E34 — table and datasource edges already have a consumer.** I specified Step 4
as though `table:` nodes had to be invented. They do not.
`ModernizationCouplingGraphService.bx:55` declares
`resourceKinds = [ "datasource", "table-query" ]`, and `:328`–`:333` builds a
resource co-access matrix keyed `"table:" & resource` / `"datasource:" & resource`.
The consumer and the id convention exist; **only the parser side is missing.**

That block also carries a design warning to honour verbatim (`:50`–`:54`):

> Only kinds whose `target` is a real resource NAME belong here. `query` and
> `sql-proc-call` carry constant targets, so including them would key every
> SQL-touching file to one fake shared resource and manufacture co-access
> between files that share nothing — which would defeat false-seam detection
> outright.

Emit `table-query` with the **table name** as target. Never emit a kind whose
target is a constant.

**E35 — two more vocabularies are waiting on parser input.**
`sharedStateKinds = [ "scope.application", "scope.session", "scope.client",
"security-session-gate" ]` (`:56`) and
`externalIntegrationKinds = [ "http", "schedule" ]` (`:61`). Both are consumed by
`build()` for the shared-state overlay and integration detection. No parser emits
any of them today. These are free capability once Step 2's AST lands — and
`http` is exactly the sink type Step 7 needs.

**E36 — edge provenance is already weighted.** `resolutionWeights` (`:41`):
`path` 1.0 > `basename` 0.75 > `stem` 0.5 > `dotted-path` 0.4, reflecting how
confidently a target resolved. Step 12's path ranking should compose with this
rather than invent a second confidence scale — a path through four guessed
targets is weaker evidence than a path through two resolved ones, and the graph
already knows.

## 2.8 Repository hygiene

**E19 — corrected: `.superpowers/` is untracked scratch, not a stale doc tree.**
An earlier draft of this plan told the implementer to delete it, citing an
AGENTS.md rule that **no longer exists** — that guidance was wrong and has been
removed from AGENTS.md by the maintainer.

The facts: `.gitignore:59` ignores `.superpowers/**`, so nothing in it is
committed and it is not a documentation tree. It holds the previous plan's
working record — task briefs, reports, review packages, and pre-change baselines
of the three files that plan modified. **Do not delete it as hygiene.** It is
the maintainer's scratch space; disposing of it is their call, not a step in this
plan.

Its `sdd/progress.md` is in fact useful evidence for §0.1: it records all eight
tasks complete, notes the work was deliberately left uncommitted, and reports
"suites 21 TestBox + 15 JS green" with the provider UI unverified.

Two loose ends remain, both trivial: `codegraph-plan.md:3` requires a
`superpowers:subagent-driven-development` skill that is not available in this
environment (moot once that file is deleted), and `.gitignore:65` still carries a
comment about not recreating `.docs/` or `.superpowers/` that now has no
counterpart in AGENTS.md.

## 2.11 Defects in shared graph loading and narrative budgeting

Five live defects found on the fourth pass, none CodeGraph-only. **D1 and D3
affect shipped Review behaviour**, so they are not "while we are in here" work.

**E37 (D1) — the impacts query is limited to zero rows for two callers.**
`AnalysisGraphRepository.getGraph:249` computes
`effectiveLimit = val( arguments.resultLimit ) > 0 ? … : variables.resultLimit`,
then uses `effectiveLimit` for symbols (`:266`) and dependencies (`:280`) — but
the impacts query at `:295` binds **unscoped `resultLimit`**, which resolves to
`arguments.resultLimit`, defaulting to `0`.

`ReviewRunQueryService:54` and `ReviewRunService:617` both call `getGraph( id )`
with no limit. SQLite treats `LIMIT 0` as "no rows". **Those two paths return
zero impacts, always.** CodeGraph is unaffected only by accident — it passes an
explicit limit at `CodeGraphRunService.bx:46`, `:201`, `:333`.

**E38 (D2) — one limit governs two different entities.** `getGraph` applies the
same `LIMIT` to symbols and to dependencies. CodeGraph passes
`codegraphMaxEdges` (20000, `Coldbox.bx:117`) — an **edge** budget — as the
**symbol** budget. Both queries order by `file_path`, so truncation is
alphabetical: a repo over the limit loses whole late-alphabet directories rather
than a representative sample. Review's default is `graphResultLimit` = 1000
(`Coldbox.bx:110`) for both.

**E39 (D3) — truncation is computed, returned, and dropped.** `getGraph` returns
a correct `truncated` flag at `:365`, comparing summary counts against returned
lengths. `CodeGraphMetricsService.assemble` never reads it — it consumes
`dependencies`, `files`, `scannedFiles` and `symbols` only. So a run that lost
5,000 symbols at the SQL boundary reports `truncated: false` with an empty
`truncationReasons`. The snapshot asserts a completeness it does not have, which
is precisely what the claim rule forbids.

**E40 (D4) — the narrative budget starves whichever section is last.**
`CodeGraphNarrativeService.buildPayload` spends one shared `maximumCharacters`
budget **sequentially with `break`**: clusters (`:424`), then hotspots (`:442`),
then flows (`:463`), then cycles (`:480`). Exhausting the budget inside clusters
means **zero flows and zero cycles reach the model** — so process stories and
risk briefing, the two sections the Domain lens exists for, are the first to
vanish and do so silently. Section order decides survival.

**E41 (D5) — absolute paths reach the provider unredacted.**
`secretRedactionService` is injected (`:20`) but applied only to error messages
and stack traces (`:77`, `:80`, `:136`, `:139`). The payload itself ships raw
`filePaths`, `entryFile`, `sinkFile` and `steps` (`:420`–`:466`). For a
local-only product with an explicit remote-egress acknowledgement, sending
`C:\Users\…\clients\<name>\…` to a remote model is a real disclosure, and the
model needs none of it.

## 2.12 Step 4's extraction is written — in a service that does not feed CodeGraph

**E45 — `table-query`, `datasource` and `scope.*` are already extracted and
already emitted.** I specified Step 4 items 4 and 5 as new parser work. They are
not new; they exist in the Modernize inventory path:

| Emitted | Where |
|---|---|
| `datasource` | `ModernizationInventoryService:175` |
| `table-query` (per table) | `:190`, from `sqlReferences( sourceLine )` |
| `column-query` | `:191` |
| `scope.#scope#` | `:197` |

The extractor is `sqlReferences` (`:654`–`:667`), returning
`{ tables, columns, unparameterized, parameterMismatch, dynamicIdentifier }`.
Note the last field — **dynamic-SQL detection already exists**, which is exactly
the "skip dynamic SQL rather than guess" guard Step 4 calls for.

The downstream chain is complete too: `ModernizationSignalService:22`–`:30` maps
`datasource` → `datasource.named`, `table-query` → `sql.table-ref`,
`scope.session` → `scope.session-heavy`, `scope.application` →
`scope.application-state`; `ModernizationRiskService:29`–`:30` weights them.

So the gap is **routing, not capability**: these kinds are produced by the
Modernize inventory and consumed by the coupling service, while the parsers that
feed CodeGraph and Review produce none of them. Step 4 lifts mechanics, it does
not write a SQL parser.

**E46 — and there is a documented rule for how to lift it.**
`CfmlSourceScanner`'s docblock records the decision made the last time two
extractors overlapped:

> It deliberately holds mechanics only — **the extractors are not merged**. Their
> taxonomies and evidence contracts legitimately differ, and folding them
> together would silently change what each one reports.

It then names two behaviour differences preserved rather than flattened: the
inventory's pattern compiler normalizes doubled backslashes and the parser's does
not (so normalization is a parameter *and* part of the cache key), and the
parser's tag joiner reports `endLine` where the inventory's did not (so the
shared one always reports it).

**Follow this exactly.** Share `sqlReferences` as a mechanic; let each caller
keep its own taxonomy and evidence contract. Merging the extractors would move
Modernize's signals, and Modernize's signals are CI-gated (E33).

**E43 — two public entry points for one behaviour.**
`CodeGraphNarrativeService.narrate:48` is a one-line delegate:
`return enrich( arguments.snapshot );`. `enrich:55` is annotated
"ArchitectureEnrichmentService-shaped entry point", but **no caller outside the
class invokes it** — the only `.enrich(` call sites belong to
`findingSolutionService`, `modernizationRiskService` and
`architectureEnrichmentService`. `CodeGraphRunService` calls `narrate` only
(`:400`, `:438`). Two public methods, one path, one of them unreferenced — the
parallel-path shape AGENTS.md's "one clear implementation path per feature" rule
exists to prevent. Collapse it in Step 10, which rewrites this service anyway.

## 2.13 CodeGraph is a run kind; the substrate says it should be a lens

**E47 — a Review run already builds the CodeGraph substrate.**
`ReviewRunService:602` calls `architectureIndexService.index( runId, scan.files )`
— the same call `CodeGraphRunService:40` makes. Every Review run therefore
already pays for symbols, dependencies, resolution and impact cones, and persists
them to the same `review_symbols` / `review_dependencies` tables. What CodeGraph
adds on top is metrics assembly, the snapshot, the optional narrative, and the
explorer UI. **The graph is not CodeGraph's; it is the application's.**

**E48 — one gate keeps the explorer off every other run.** All three
`ApiCodeGraph` actions reject anything that is not a CodeGraph run:
`subgraph:49`, `edges:108`, `narrative:150` each test
`lCase( run.getRunKind() ?: "" ) != "codegraph"` and return 404. Nothing else
prevents drilling the graph of a review run — the data is present and
`getGraph( runId )` would return it.

The product docs already record the consequence as a known gap
(`application-features.md:287`): *"Coupling graph UI is CodeGraph-only —
Review/Modernize still compute coupling signals; the interactive explorer ships
on `/codegraph` only."* It is listed under **Visibility — computed but not
surfaced**, with owner "CodeGraph". This plan is where it gets answered.

**E49 — the hierarchy tree has a second customer.**
`open-issues.md` item 8 asks for a file picker tree on `/review`: *"should show a
directory tree on the right after a directory is added, allowing files to be
selected or excluded before scanning."* That is the same component Step 11a
builds for hierarchical drill-down, over the same directory rollup (E25). Build
it once.

Related, and relevant to Step 11: `open-issues.md` items 4 and 5 report the front
end over-polling (`app.js` "makes excessive backend calls"). Step 11 adds canvas
interaction and search; it should not add polling.

## 2.14 "Quickly" — the dimension the plan never measured

CodeGraph's purpose is *quickly* knowing a project and the flow between its
components. Every finding below is a latency or freshness defect against that
purpose, and none of them appeared in the first four passes because the plan was
scoped around fidelity, not time-to-answer.

**E50 — nothing renders until the run is completely finished, including the LLM
call.** `CodeGraphRunService.execute` persists exactly once, at 90%
(`:76`–`:84`), *after* narrative resolution at 75% (`:66`–`:69`). The
deterministic snapshot — nodes, roles, clusters, flows, cycles, hotspots — is
fully assembled at the 60% "codegraph-clusters" mark and then **withheld behind a
network call to a language model**.

For a product whose promise is speed of orientation, the structure a user could
have read in seconds waits on the slowest, most failure-prone stage in the
pipeline.

**The two-phase write already exists and is already used elsewhere.**
`CodeGraphRepository.updateNarrative:153` writes narrative alone against an
existing snapshot row, and `CodeGraphRunService.refreshNarrative:381` drives
exactly that flow from `POST /runs/:id/codegraph/narrative`. The pipeline simply
does not use its own mechanism.

**E51 — the snapshot is never reused; only the narrative is.**
`findReusableNarrative:108` matches on `projectPath + repositoryRevision +
narrativeCacheKey`. There is no equivalent for the snapshot. Re-opening a project
examined yesterday re-scans, re-indexes, re-runs Louvain clustering, re-extracts
flows and re-assembles from scratch.

Worse, it is circular: `narrativeCacheKey` derives from the snapshot fingerprint
(`CodeGraphRunService:71`), so **the entire snapshot must be computed before the
system can discover the narrative was reusable**. The cheap half is gated on the
expensive half.

**E52 — CodeGraph is run-centric; its purpose is project-centric.** Every surface
is keyed on a run: `codegraph_snapshots` has `run_id` as PRIMARY KEY
(`SchemaService:543`), results come from `GET /runs/:id/result`, and history is
`/api/v1/history?runKind=codegraph`. There is no "current map of this project"
concept — the closest a user gets is finding their last run in a history list.
"Know about the project" is not a run-shaped question.

**E53 — meaning expires on every commit.** `repositoryRevision` is part of the
narrative reuse key (`findReusableNarrative:125`). On an actively developed repo
every commit invalidates the briefing, compounding E17's whole-graph fingerprint
problem: not only does one file's change re-narrate everything, one *commit* does
too, and domain names churn with it (Step 10).

**E42 — test footprint, for gate realism.** 73 unit suites, 27 integration
suites; CodeGraph specifically covered by 2,018 lines across
`CodeGraphInventoryAdapterSpec` (93), `CodeGraphMetricsServiceSpec` (306),
`CodeGraphNarrativeServiceSpec` (312), `CodeGraphRunServiceSpec` (380),
`CodeGraphApiSpec` (291), `CodeGraphPersistenceSpec` (174) and
`tests/js/codegraph-layout.spec.mjs` (462). The gates in Part 4 extend existing
suites rather than inventing a harness.

---

# Part 3 — Direction, stance, constraints

## 3.0 Where CodeGraph is going

The README sells four desktop workspaces — Dashboard, Review, Modernize,
CodeGraph — and lists CodeGraph third among "what you get". That framing is
accurate about today and, on the evidence, wrong about the destination.

**Three purposes, three moments, three users.** As stated by the maintainer:

| Product | Purpose | When |
|---|---|---|
| **CodeGraph** | Quickly know the project, and the flow between its components | **Before** you work — orientation, onboarding, unfamiliar code |
| **Review** | Find what's missing — security, performance, correctness | **After** you develop — a check on work just done |
| **Modernize** | Upgrade a legacy app to modern MVC — modules, microservices | **A project of its own** — migration planning |

These are not three views of one moment. They are three different users, or one
user in three different states of mind. **CodeGraph's user does not yet know the
codebase. Review's user just wrote part of it.**

**Correction to an earlier draft of this section.** A previous pass concluded
"CodeGraph becomes a lens, not a silo" and proposed mounting the explorer inside
Review, surfacing finding counts on graph nodes, and offering path finding beside
a finding. **That over-reached, and the purposes above are why.** Putting "what's
wrong" onto a surface whose job is "what is this" dilutes both: it hands
orientation to a user who is not oriented yet, and it duplicates work Review
already does properly — `buildImpactCone` (`ArchitectureIndexService:115`) is
already Review's "what breaks if I change this". That answer belongs on Review's
surface, computed by Review's machinery.

**What survives, and it is the part that was actually load-bearing:**

1. **Share the substrate; keep the surfaces distinct.** A Review run already
   builds the same graph (E47). That is an argument against *recomputing* it,
   not an argument for merging what is drawn on top. Step 13 is scoped to reuse
   only.
2. **Modernize consumes what Step 4 adds.** Table and scope edges feed the
   co-access matrix and shared-state overlay Modernize's seam detection already
   reads (E34, E35, E45). CodeGraph work improves Modernize's answers as a side
   effect — the clearest evidence the substrate, not the surface, is shared.
3. **Key the explorer on a run id, not a snapshot object** (Step 11d). This
   remains right for a plain engineering reason — it is what lets Step 13 reuse a
   Review run's index without a rewrite — and it costs nothing to do now.

## 3.0.1 What "quickly" demands, and what currently prevents it

CodeGraph's purpose leads with **quickly**. §2.14 says the product is not built
for it, and the fixes are cheap:

- **Show structure before meaning.** The deterministic snapshot is complete at
  60% and then withheld behind an LLM call (E50). Persist and render it at 60%;
  let meaning arrive after. The two-phase write already exists and is already
  used by the narrative-refresh endpoint.
- **Answer instantly for a project already seen.** Only the narrative is reusable
  today, and its cache key requires computing the whole snapshot first (E51).
  A project-keyed snapshot lookup turns "what is this project" from a full
  pipeline run into a read.
- **Be project-centric, not run-centric** (E52). "Know about the project" is not
  a run-shaped question, but every surface is keyed on a run id.
- **Do not expire meaning on every commit** (E53). `repositoryRevision` in the
  narrative key means an active repo re-narrates constantly and domain names
  churn — the same failure Step 10 fixes for file edits, one level up.

**Lead with flow.** The purpose names *"flow between different parts of
components"* explicitly. Flows are currently a chip strip beneath the domain
cards. On the evidence of the stated purpose they are not a secondary feature —
they are the headline, and Steps 7, 11 and 14 should be read in that light.

## 3.1 Stance

Carried forward from the approved design; unchanged unless noted.

- **One graph.** Domain lens over the existing graph. No second graph product.
- **The LLM never invents nodes or edges.** Every narrative claim cites a
  computed id; unknown ids are dropped (`CodeGraphNarrativeService.bx:199`).
- **Meaning needs AI; structure does not.** No key → structure, roles, flows,
  and an honest banner. Never present folder tokens as business meaning.
- **Local-only, desktop-only.** No SaaS, accounts, hosted retention, or mobile
  layouts.
- **Supported languages: BoxLang, ColdFusion, JavaScript.** JavaScript is
  already declared (E3); this plan makes the declaration true. No fourth
  language.
- **Not an automatic migrator.** CodeGraph reads; it does not rewrite source.
- **Shared services stay shared.** Most of what this plan touches is used by
  Review or Modernize too (E31). Three rules follow:
  1. **Additive by default.** Extend a vocabulary, add a parameter, add a kind —
     do not change an existing default that another product reads.
  2. **A behaviour change for another product is opt-in at the call site**, and
     that product's suite runs in the same commit. Step 9 is the live example:
     Modernize's seam precision and recall are CI-gated against a committed
     baseline (E33), so co-change affinity arrives as a caller-supplied option,
     never as a new default.
  3. **Never fork a shared service to avoid the conversation.** A parallel
     CodeGraph copy of the coupling or clustering service is exactly the
     duplicate product path AGENTS.md forbids.
- **Capability claims must be measured.** Step 15 exists because
  `application-features.md:294` records CodeGraph quality as unmeasured with no
  owner.

## 3.2 Two live plans — coordination

AGENTS.md says one live plan at a time, and names
[`modernize-inversion-plan.md`](modernize-inversion-plan.md) as the Modernize
index. In practice there are two tracks, and **they edit the same files.**

| Overlap | Modernize plan | This plan |
|---|---|---|
| `ModernizationCouplingGraphService` | Step 1 — creates and owns it, incl. the datasource/table co-access matrix | Step 4 — extends `structuralKinds`; feeds it `table-query` (E32, E34) |
| `ModernizationDerivedStructureService` | Steps 3 / 3a / 3b — the derived-structure path is *the* inversion, CI-gated | Step 9 — adds co-change affinity (E33) |
| Corpus and thresholds | Steps 2a / 6 — deterministic, LLM and judge tiers | Step 15 — CodeGraph corpus, separate fixtures |

Rules where they meet:

1. **The Modernize plan wins on files it owns.** If its Step 1 or Step 3 is in
   flight, this plan's Steps 4 and 9 wait or rebase. Read that plan's Part 0
   ledger before starting either.
2. **Vocabulary additions are safe to land either way** — extending
   `structuralKinds` or `resourceKinds` is additive (Part 3, rule 1). Changing
   affinity or community detection is not.
3. **Run both corpora on any commit touching either service.**
   `ModernizationCorpusSpec`'s Step 3b stop conditions are the tripwire, and a
   green CodeGraph suite says nothing about them.
4. If the two plans genuinely conflict on a design point, resolve it in the
   Modernize plan and reference the outcome here — do not fork the answer.

**Scope correction to the design doc:** its out-of-scope list says "JS remains
skipped" and defers a glossary. Steps 5 and 10 supersede both lines. Everything
else in that document stands.

---

# Part 4 — Execution

## 4.0 Execution graph

Execute in this order. Parallel branches are marked; everything else is serial.

```
0 ──► 1 ──► 2 ──► 3 ──► 4 ──┬──► 5 ──┬──► 7 ──► 8 ──┬──► 14 ──► 15
                            │        │              │
                            └──► 6 ──┘              ├──► 11 ──► 12 ──► 13
                                                    │              (the lens)
9 ───────────────────────────────► 10 ──────────────┘
(9 may start any time after 1; 10 needs 4 + 9; 11 needs 8's reachability
 for tree pruning; 12 needs 11's canvas to render a path onto; 13 needs both)
```

Hard orderings and why:

- **4 before 5** — a `fetch` edge needs route nodes to point at.
- **4 and 5 before 7** — typed sinks and full-stack flows need table and client
  edges to exist.
- **7 before 11** — Step 7 emits `stepSymbols[]`, which has no consumer until
  the explorer gains a symbol level (E29). Landing them in the wrong order ships
  a payload nothing reads.
- **11 before 12** — a path finder needs somewhere to draw the path. Step 11's
  smart layout is what makes a returned path legible rather than a tangle (E24).
- **11 and 12 before 13** — the lens is worth opening on a Review run only once
  there is something worth seeing there.

**Steps 11–13 are the user-visible payoff of Steps 2–8**, and **Step 13 is the
one that changes what the product is** (§3.0). Everything before them widens and
corrects the substrate; these three are what a person actually touches. If the
plan has to be cut short, cut from Step 14, not from here.

**Even if Steps 11–13 are never built, 11d still applies.** Keying the explorer
on a run id rather than a snapshot costs nothing and is the difference between
Step 13 being a gate relaxation and being a rewrite.

---

## Step 0 — Hygiene

**Priority:** P0 · **Preconditions:** none

**Goal.** Remove the one document that will misinform the next agent, and fix the
links that point at it.

**Do.**
1. Delete `resources/docs/plans/codegraph-plan.md` — superseded, every task in it
   shipped (§0.1), its checkboxes all read `- [ ]`, and it directs agents to a
   `superpowers:` skill that is not available.
2. Retarget inbound links to this file: `application-features.md:263`, `:322`;
   `resources/docs/README.md:16`; `codegraph-domain-lens-design.md:4`.
   **(Done — these four edits already landed with this plan.)**
3. In `codegraph-domain-lens-design.md`, correct the scope lines superseded by
   Steps 5 and 10 (JS skipped; glossary deferred). **(Done.)**
4. Optional tidy: `.gitignore:65` still comments on not recreating `.docs/` or
   `.superpowers/`, which no longer matches AGENTS.md (E19). One line.

**Don't.** **Do not delete `.superpowers/`** — an earlier draft of this step said
to, on the strength of an AGENTS.md rule that has since been removed as
incorrect. It is gitignored scratch holding the previous plan's briefs, reports
and pre-change baselines (E19), and disposing of it is the maintainer's call.
Don't archive the superseded plan "just in case" — git history is the archive.

**Gate.** `plans/codegraph-plan.md` is gone, and
`rg -n "codegraph-plan" resources/docs --glob '!codegraph-depth-plan.md'`
returns nothing — this plan's own references to the deleted file are expected.

---

## Step 1 — Correctness and cost

**Priority:** P0 · **Preconditions:** Step 0

**Goal.** Fix seven defects that are wrong today regardless of everything else in
this plan. **Three of them (1a–1c) are Review defects**, not CodeGraph ones —
they surfaced here but they ship in the product now.

**Do — shared graph loading.**

1a. **`LIMIT 0` on impacts (E37).** `AnalysisGraphRepository:295` binds unscoped
`resultLimit` where every sibling query binds `effectiveLimit`. Change it to
`effectiveLimit`. This restores impact data to `ReviewRunQueryService:54` and
`ReviewRunService:617`, which currently receive none. Add a spec that calls
`getGraph( runId )` with **no** limit argument and asserts impacts are returned —
the absence of that case is why this survived.

1b. **Separate symbol and edge budgets (E38).** Give `getGraph` distinct symbol
and dependency limits rather than one shared `LIMIT`. CodeGraph is passing
`codegraphMaxEdges` as a symbol budget, which is a category error. Add
`codegraphMaxSymbols` alongside the other `codegraph*` settings
(`Coldbox.bx:113`–`128`). Where truncation is unavoidable, note that ordering by
`file_path` truncates alphabetically — whole directories vanish rather than a
representative sample; at minimum say so in the truncation reason.

1c. **Propagate SQL-level truncation (E39).** `getGraph` already returns a correct
`truncated` flag; `assemble` ignores it. Read it and add a
`graphResultLimit` truncation reason. A snapshot must never report
`truncated: false` while rows were dropped at the database boundary.

**Do — CodeGraph-local.**

1d. **Dangling ids (E10).** In `CodeGraphMetricsService.assemble`, apply the
`maxNodes` cap **before** deriving hotspots / orphans / layer violations /
flows — or retain any node id those arrays reference. Invariant to assert: every
id in `hotspots`, `orphans`, `flows[].steps` and `layerViolations` resolves in
`nodes[]`.

1e. **Quadratic loops (E11).** Replace `crossingEdgeCount`'s per-node edge walk
with one edge pass building a `fileKey → crossingCount` map. Same for
`presentClusters`' symbol count: build `fileKey → symbolCount` once.

1f. **Blank language (E13).** `languageFor` returns `JavaScript` for `js`/`jsx`.

1g. **Views unclassified (E4b).** Add a `views?/` branch to
`ArchitectureModelService.classifyFile` returning a `views` component, and map it
to a `view` role in `assignRole`.

1h. **BoxLang parser pattern cache (E2, E44).** `BoxLangParserService.match:380`
compiles a `Pattern` via `createObject( "java", … )` **twice per call, per line,
per file**. `CfmlSourceScanner.compiledPattern` is an existing, cached, shared
mechanic that `CfmlParserService` already uses. Point the BoxLang parser at it.
This is available **today**, needs no AST, fixes the `import java:` violation,
and removes the hottest allocation in indexing. Mind the documented
backslash-normalization parameter (E46) — the BoxLang parser writes patterns for
the Java bridge directly, same as the CFML parser, so pass `false`.

**Don't.** Don't change `hotspotScore`'s weights here — that is Step 9, where
churn gives a defensible basis. Don't touch `classifyFile`'s `public/` branch
yet; Step 6 owns the `client` role. Don't fold 1a–1c into a later step because
they are "not CodeGraph" — they are one-line fixes to code this plan builds on,
and leaving them means every measurement taken afterwards is taken on a broken
base.

**Gate.** `box testbox run reporter=Min` — the **full** suite, because 1a–1c
touch Review (E31). New specs: the no-limit `getGraph` impacts case (1a); a
snapshot whose `truncationReasons` includes the SQL-level reason when the limit
bites (1c); the id invariant with `maxNodes` forced below the hotspot count (1d).
Record before/after `assemble` wall time on this repo.

---

## Step 2 — BoxAST parser for BoxLang

**Priority:** P0 · **Preconditions:** Step 1

**Goal.** Replace line-regex extraction with AST traversal for `.bx` / `.bxm` /
`.bxs`, keeping the parser's public contract (`getVersion`, `supports`, `parse`)
byte-identical in shape.

**Do.**
1. Parse with `BoxAST( filepath: … , returnType: "struct" )`. Heed E6: never
   pass a class body as `source` under the default `sourceType`.
2. Walk the AST for the symbols and dependencies the regex path produced today,
   at minimum: class / interface, function, property, `extends`, `implements`,
   `inject`, `import`, `new`, calls, parameter and return types, handler
   actions, TestBox suites (`BoxLangParserService.bx:26`–`211`).
3. Emit `position` from the AST rather than the loop counter — accurate start
   **and** end lines, which `CodeGraphInventoryAdapter.bx:47` currently fakes as
   `max( startLine, startLine )`.
4. Bump `parserVersion` to `boxlang-ast-parser-v3` (E7).
5. Fall back to the regex path on parse failure, recording a per-file
   `parseStrategy` so partial-parse repos degrade instead of emptying.
6. Where regex remains (CFML, until Step 2b), precompile patterns as statics via
   `import java:java.util.regex.Pattern` — not `createObject` per call (E2).

**Don't.** Don't add new edge kinds here — Step 4 owns that, and mixing the two
makes the parity gate unreadable. Don't delete `BoxLangParserService`'s regex
helpers until the gate passes.

**Blast radius (E31).** The parsers feed `ArchitectureIndexService`, which
**Review** uses as well as CodeGraph — a parser that finds more symbols changes
Review's graph, architecture model and impact cones. And `ApiCapabilities.bx:45`–`46`
publishes `getVersion()` in the capabilities contract, so the version bump is a
**published API change**: move `resources/apidocs/` in the same commit.

**Gate.** Parity harness: run both parsers over `app/**` and diff symbol and
dependency sets. AST output must be a **superset** for every file; every
regression is either fixed or recorded here with a reason. Then
`box server restart` (Rule 2) and the **full** suite —
`box testbox run reporter=Min` — not just the unit bundle, because Review shares
this path.

**Step 2b (same shape, after 2's gate).** CFML via `sourceType: "cfscript"` /
`"cftemplate"` (E1). Held separate because the CFML tier is `discovery-only` and
its blast radius is different — **and because it is the less urgent of the two**.
`CfmlParserService` already joins multi-line tags and caches patterns (E44), so
it is not suffering the failure mode that makes Step 2 urgent for BoxLang. Take
2b for the fidelity gain, not as a rescue; if effort is short, it is the safest
thing in this plan to defer.

---

## Step 3 — Position-independent symbol ids

**Priority:** P0 · **Preconditions:** Step 2

**Goal.** Stop cosmetic edits from invalidating baselines, impact cones and the
entire briefing (E12).

**Do.**
1. Re-key `stableId` on structural identity — `filePath:recordType:kind:qualifiedName`
   plus an occurrence ordinal for genuine same-name siblings — not `line`.
2. Keep `line` as an **attribute** for evidence display; it must not enter the
   id hash.
3. Confirm the id change propagates cleanly to unit ids
   (`CodeGraphInventoryAdapter.bx:37`), snapshot fingerprint and narrative cache
   key. A stable-name repo edit must now yield an unchanged fingerprint.

**Don't.** Don't reuse `contentHash` as the id basis — it changes on every edit,
which is the same failure in a different coordinate system.

**Blast radius (E31).** `stableId` is `ArchitectureIndexService`'s, and
**Review's impact cones are keyed on it** (`buildImpactCone:115` seeds from
symbol ids). Improving id stability improves Review's baseline reuse too — but
it is a behaviour change there, not only here. Run Review's suite.

**Gate.** Insert a blank line at the top of a fixture file, re-run, and assert:
symbol ids unchanged, snapshot fingerprint unchanged, narrative reused
(`CodeGraphRunService.bx:428` `findReusableNarrative` hits). Add this as a spec,
and assert a Review impact cone over the same edit is likewise unchanged.

---

## Step 4 — Edge-kind fidelity and the missing hops

**Priority:** P0 · **Preconditions:** Step 3

**Goal.** Stop discarding edge semantics, and add the three hops that turn a
call chain into a business process.

**Read E32, E34 and E35 before starting.** Three facts change the shape of this
step from what an earlier draft assumed: the structural vocabulary is a
four-item **allowlist**, table and datasource edges already have a consumer, and
two further vocabularies sit unfed.

**Do.**
1. **Un-collapse and extend, in one commit (E4 + E32).**
   `CodeGraphInventoryAdapter.mapKind` preserves `injects`, `imports`,
   `constructs`, `calls`, `type-reference` as distinct kinds — **and**
   `ModernizationCouplingGraphService.structuralKinds` (`:48`) gains them in the
   same change. Doing only the first silently deletes every one of those edges at
   `buildStructuralEdges:236`. Land both or neither.
2. **route → handler.action (E5).** Read the router AST: follow the fluent chain
   from `route( pattern )` through `.withAction()` / `.toHandler()` to emit a
   `routes` edge from a `route:` node to the handler file, carrying verb and
   pattern. This is the hop the line parser structurally could not see.
3. **handler → view (E6b).** `event.setView( "main/x" )` → `renders` edge to the
   resolved `.bxm`. Views stop being islands.
4. **Tables — lift the extractor that exists; do not write one (E45).**
   `ModernizationInventoryService.sqlReferences:654` already returns
   `{ tables, columns, unparameterized, parameterMismatch, dynamicIdentifier }`,
   and `:190` already emits `table-query` per table. The consumer exists too:
   `ModernizationCouplingGraphService:328`–`:333` keys `"table:" & resource` and
   builds the co-access matrix (E34).

   **Move `sqlReferences` into a shared scanner mechanic**, following
   `CfmlSourceScanner` exactly (E46): share the mechanics, **never merge the
   taxonomies**. Modernize keeps emitting its vocabulary unchanged; the parsers
   gain the ability to emit theirs. Honour E34's warning verbatim — never emit a
   kind whose target is a constant such as `"sql"` — and use the existing
   `dynamicIdentifier` flag as the skip-dynamic-SQL guard rather than inventing
   one.
5. **Feed the two unfed vocabularies (E35, E45).** `scope.application`,
   `scope.session`, `scope.client` for shared-state access, and `http` /
   `schedule` for outbound integration. `ModernizationInventoryService:197`
   already emits `scope.#scope#`, so this is the same lift as item 4.
   `build()` already consumes them, and `http` is the sink type Step 7 needs.
6. **Framework pseudo-targets.** Classify `inject="coldbox:setting:x"` and
   `logbox:logger:{this}` as framework/config edges instead of letting them land
   in the structural vocabulary as junk (`CodeGraphRunService.bx:18`–`26` is full
   of these).
7. **Event edges.** `eventService.publish( "codegraph.index" )` and its
   listeners → `emits` / `listens`. Async coupling is currently invisible.

**Don't.** Don't attempt SQL parsing beyond table-name extraction. Don't create
table nodes for dynamic SQL — an unproven node is worse than a missing one, and
violates the evidence rule in Part 3. Don't re-collapse at the adapter to dodge
the vocabulary change; that is the shortcut E32 exists to prevent.

**Gate.** On this repo: ≥1 `routes` edge for every route in `Router.bx`; a
`renders` edge for each `event.setView` in `Main.bx`; `table:` resources for the
tables in `SchemaService`; and an assertion that **no structural edge is dropped**
by the allowlist — count edges in versus edges out of `buildStructuralEdges`.
New specs per edge kind, plus `ModernizationCorpusSpec` (§3.2 rule 3).
`box testbox run bundles=tests.specs.unit,tests.specs.integration reporter=Min`.

---

## Step 5 — JavaScript parser and the full-stack edge

**Priority:** P0 · **Preconditions:** Step 4 (needs route nodes to target)

**Goal.** Make the declared JavaScript support real, and close
browser → API → service → repository → table.

**Do.**
1. New `JavaScriptParserService` implementing the same contract
   (`getVersion` / `supports` / `parse`). Register it in
   `ArchitectureIndexService.bx:29`.
2. Extract: ESM `import` / `export`, `require`, function and class declarations,
   `const fn = …` assignments, and — the payload — **`fetch( "/api/v1/…" )` call
   sites**.
3. Emit a `calls-api` edge from the JS file to the matching `route:` node from
   Step 4. Match on pattern with parameter placeholders normalised
   (`/api/v1/runs/:id/codegraph/edges`).
4. Add `js`, `jsx` to the CodeGraph allowlist at `ReviewRunService.bx:402` (E3).
   Review already ingests JS content (E23), so this benefits both run kinds.
5. Optional, cheap, high value: `.bxm` `<script src>` → asset edge, and
   `getElementById( "x" )` ↔ view `id="x"` binding, which ties the UI layer to
   its markup.
6. Raise `SupportedLanguageService`'s JS tier only when Step 15 measures it —
   not here.

**Don't.** Don't add a JS framework runtime, bundler resolution, or `node_modules`
traversal. Don't parse TypeScript — not a supported language.

**Gate.** Run CodeGraph on `C:\Box\DoubleCheck`: `public/assets/app.js` appears
as a node with `language: "JavaScript"`; at least one flow starts in JS and
reaches a `table:` node. `node --test tests/js/*.spec.mjs` and the BoxLang
suites green.

---

## Step 6 — Roles from evidence

**Priority:** P1 · **Preconditions:** Step 4 (may run parallel to Step 5)

**Goal.** Replace filename guessing with graph evidence, and stop the legend
drifting from the enum.

**Do.**
1. Extend the enum with `view`, `client`, `config`, `integration`. **`client`
   must land before Step 5's JS nodes are surfaced**, or `public/` sends every
   asset to `entry` (E8).
2. Derive from evidence, not path: owns a handler-action symbol → `entry`; issues
   `queryExecute` or holds `writes` edges → `persistence`; extends a framework
   base → its framework role; high fan-out over `injects` with low own-symbol
   count → `orchestrator`. Keep path heuristics as the tiebreak, not the rule.
3. Render the legend from snapshot role counts instead of the hardcoded six
   (`codegraph.bxm:197`–`203`), so it shows what the run actually found.

**Don't.** Don't drop `unknown` — an honest unknown beats a confident wrong role,
and its share is a useful quality signal for Step 15.

**Gate.** On this repo, `unknown` falls below 5% of nodes, and no file under
`public/assets/` carries role `entry`. Spec the JS-asset case explicitly.

---

## Step 7 — Flows v2

**Priority:** P1 · **Preconditions:** Steps 5 and 6

**Goal.** Make a flow a business process — symbol-level, branch-preserving, and
terminating somewhere meaningful.

**Do.**
1. **Branches (E9).** Replace `longestFlowPath`'s single `best` with top-K
   distinct paths per seed, deduplicated by step signature. A handler calling
   four services must yield four flows, not one.
2. **Symbol-level steps.** Each step carries file **and** symbol, so a process
   story can say which method. Keep `steps[]` file ids for UI compatibility;
   add `stepSymbols[]` alongside. **Note the consumer**: nothing renders symbols
   until Step 11a adds a symbol level to the drill-down (E29). The narrative
   (Step 10) uses them immediately; the explorer does not.
3. **Typed sinks.** Classify the terminus: `table-write`, `table-read`,
   `http-call`, `event-publish`, `view-render`, `unknown`. Derive these from
   Step 4's edge kinds — `table-query` (E34) and `http` (E35) already carry the
   information, so sink typing is a mapping, not a second analysis. Rank flows
   that reach a typed sink above those that merely ran out of depth.
4. **Seed from routes**, not handler files — a process starts at a URL.
5. **Cap per cluster**, not globally, so a large repo shows breadth rather than
   an arbitrary global 24.
6. Replace `duplicate( state.visited )` per branch with a path-set that unwinds
   on backtrack.
7. Raise `maxDepth` past 3 now that hops are typed, and make it a setting
   alongside the other `codegraph*` keys in `Coldbox.bx:113`–`128`.

**Don't.** Don't let flow count grow unbounded — the narrative input budget is
capped at `codegraphNarrativeMaxFlows` (`Coldbox.bx:126`) and blowing it silently
truncates the briefing.

**Gate.** On this repo, at least one flow reads end to end
`app.js → route → ApiCodeGraph.subgraph → CodeGraphRunService → AnalysisGraphRepository → table:review_dependencies`,
with every hop carrying a real edge kind. Spec it as a fixture.

---

## Step 8 — Reachability, dead code, layer policy

**Priority:** P1 · **Preconditions:** Step 7

**Goal.** Answer "what is actually live?" and make layer rules configurable.

**Do.**
1. Compute reachability from the true entry set — routes, `Application.bx`
   lifecycle, scheduled tasks — and report unreachable files. This is the real
   dead-code answer that `fanIn == 0 && fanOut == 0` misses (E15).
2. Keep the existing orphan list as a separate, narrower signal; do not conflate.
3. Move layer rules into configuration (E14) with a default set beyond the single
   `models → handlers` rule: `view → model`, `repository → handler`,
   cross-domain persistence access.

**Don't.** Don't report test-only-reachable files as dead — flag them as
`test-only`, which is a different conversation.

**Gate.** Seed a fixture with a known-unreachable file and assert it is reported;
assert a test-only-reachable file is labelled, not condemned.

---

## Step 9 — Git co-change and churn

**Priority:** P1 · **Preconditions:** Step 1 (independent of 2–8; may run parallel)

**Goal.** Add the temporal signal. Files that change together are strong
evidence of a domain boundary, and it is evidence static analysis cannot see.

**Correction — read E18 first.** An earlier draft said clusters were folder-shaped
and proposed replacing that with co-change. That was wrong. `deriveClusters`
already runs Louvain community detection over a weighted affinity graph
(`ModernizationDerivedStructureService.bx:66`–`:68`); membership is coupling-derived.
Only the **label** is folder-shaped, and Step 10 owns naming. **This step adds one
more signal to affinity. It does not replace the algorithm.**

**And read E33.** `deriveClusters` is consumed by six Modernize services, and
Modernize's seam precision and recall are CI-gated against a committed baseline.
Changing default affinity moves those gates.

**Do.**
1. New public method on `GitRepositoryService` for commit→files pairs via
   `git log --name-only`, bounded by commit count and entry count, following the
   existing `executeTokens` pattern (E20).
2. **Add co-change as an opt-in affinity term.** `buildAffinityGraph`
   (`:354`) gains an optional caller-supplied weight map; `deriveClusters` gains
   an optional parameter to pass it. **Absent the parameter, behaviour is
   byte-identical to today** — that is the contract with Modernize (Part 3,
   rule 2). CodeGraph passes it; Modernize does not, until its own plan decides
   to.
3. Replace `hotspotScore`'s hand-tuned constants
   (`CodeGraphMetricsService.bx:388`) with churn × fan-in × cycle membership, and
   record the formula in the snapshot so the ranking is auditable. This one is
   CodeGraph-local — `hotspotScore` is private to `CodeGraphMetricsService`.
4. Surface author count and last-touched per cluster — "this domain is active /
   this one has not moved in two years" is the risk answer people actually want.

**Don't.** Don't fail the run when the project is not a git repository, has no
history, or is a shallow clone — degrade to structural-only and say so in the
snapshot. Don't change the default affinity weighting. Don't let co-change
override structural coupling; it is a term, not a veto, and two files edited in
one sweeping commit are not a domain.

**Gate.** Three parts. (a) With no co-change parameter, `deriveClusters` output
is **byte-identical** to the pre-change build on a fixture — assert it. (b)
`ModernizationCorpusSpec` Step 3b stop conditions still pass (§3.2 rule 3).
(c) Runs on this repo and on a non-git directory; the second produces a snapshot
with co-change absent and flagged, not an error.

---

## Step 10 — Narrative sharding, labels, budget fairness, path egress

**Priority:** P1 · **Preconditions:** Steps 4 and 9

**Goal.** Stop domain names churning on unrelated edits, and let a correct name
stay correct.

**Do.**
1. **Shard by cluster.** Cache each cluster's narrative on a per-cluster
   fingerprint instead of the whole-graph one (E17). Only changed domains
   re-narrate. `ModernizationRoadmapShardService` is the in-house precedent —
   follow it rather than inventing a second sharding style.
2. **New `codegraph_labels` table** in `SchemaService` (single source of truth,
   AGENTS.md): `project_path`, `cluster_key`, `label`, `provenance`
   (`ai` | `user`), `created_at`. Reuse the stored label across runs; `user`
   always outranks `ai`.
3. Key labels on a **stable cluster key** — derived from member composition, not
   the ordinal `clusterId`, which shifts when clusters resort.
4. **Ground the briefing in data.** Feed each domain's tables (Step 4), routes
   (Step 4) and typed sinks (Step 7) into the narrative input. "Owns
   `review_runs`, `review_findings`; entered via `POST /api/v1/runs`" is more
   meaningful than any prose, and it is deterministic.
5. **Fix section starvation (E40).** `buildPayload` spends one budget
   sequentially with `break`, so exhausting it inside clusters sends **zero flows
   and zero cycles** to the model — process stories and risk briefing, the two
   sections the Domain lens exists for, starve first and silently. Allocate the
   budget **per section** (proportional or reserved-minimum), and return which
   sections were trimmed. Without this, item 6's coverage number is measuring the
   wrong thing.
6. **Relativize paths before egress (E41).** `secretRedactionService` is injected
   but touches only error text; the payload ships raw absolute paths. Make paths
   project-relative before they leave the machine. The model needs
   `app/models/services/X.bx`, never `C:\Users\…\clients\<name>\…`, and this is a
   local-only product with an explicit remote-egress acknowledgement.
7. **Report coverage.** Surface "N of M clusters named", plus which payload
   sections were trimmed (item 5), so an incomplete briefing is visible rather
   than silently partial.
8. **Collapse the duplicate entry point (E43).** `narrate()` is a one-line
   delegate to `enrich()`, and `enrich()` has no caller outside the class. Keep
   `narrate` — it is what `CodeGraphRunService` calls and what the name means
   here — and make `enrich` private or delete it. One path per feature.

**Don't.** Don't let a stored label survive a cluster whose membership has
materially changed — re-narrate and mark it superseded. A stale confident name is
the failure mode this step exists to prevent.

**Gate.** Edit one file in one cluster; assert only that cluster re-narrates and
every other domain name is byte-identical. Assert a `user` label survives a
re-run.

---

## Step 11 — Interactive knowledge graph

**Priority:** P1 · **Preconditions:** Steps 7 and 8

**Goal.** Make the explorer navigable at real repository scale: a genuine
hierarchy from directory down to symbol, a layout that reads connectivity, and
search to reach what the canvas cannot show.

Three separable pieces. Ship 11a first — it is the one that changes what a
person can find.

### 11a — Hierarchical drill-down

Today's drill is three fixed lenses (cluster → file → focus) with a flat list at
each level (E29), and the canvas renders at most 120 of up to 1500 nodes with no
way to reach the rest (E26).

**Do.**
1. **Surface `directories` in the API.** It is already computed and persisted and
   simply never returned (E25) — add it to `CodeGraphRunService.getResult`'s
   payload. This is the cheapest win in the entire plan.
2. **Add a level above clusters:** a directory tree, collapsible, with the
   rollup counts already computed (fileCount, symbolCount, fanIn/fanOut sums).
   Large repos become navigable by structure even when the canvas is capped.
3. **Add a level below files:** symbols, consuming Step 7's `stepSymbols[]`.
   The hierarchy becomes directory → module → file → symbol.
4. **Persist the drill path in the URL** so a view is linkable and the browser
   back button works. Extend the breadcrumb (`app.js:4769`) rather than
   replacing it.
5. **Expand-in-place** on the canvas: expanding a cluster reveals its files
   nested inside the cluster's hull instead of replacing the view. Keep the
   existing replace-view drill as the alternative — hierarchy is for orientation,
   replacement is for focus.
6. Show **"showing N of M"** wherever a cap bites, linked to search.

### 11b — Smart layout

E24 is the finding: **no current layout reads an edge.** Positions come from
array index and alphabetical sort, so crossings are unbounded and connectivity is
invisible.

**Do.**
1. **Barycenter ordering** for `layoutLayered` — iteratively order each column by
   the mean position of its neighbours in the adjacent column. This is the
   standard Sugiyama crossing-reduction sweep and is the highest
   improvement-per-line change available in `codegraph-layout.js`.
2. **Force-directed relaxation** for `layoutClusters`, seeded from the current
   grid so results stay deterministic, with a fixed iteration count and a fixed
   seed. Determinism is not optional — snapshots are fingerprinted and specs
   compare output.
3. **Connectivity-aware angles** in `layoutRadial`: order each ring so neighbours
   sit adjacent instead of at even angles by array index (`:849`).
4. **Fix edge routing (E28).** Choose exit and entry faces from relative node
   position instead of always right→left. Backwards edges currently curve through
   whatever sits between.
5. **Overlap avoidance** after positioning, and **edge bundling** for parallel
   runs between the same pair of clusters.
6. Keep every layout **pure and deterministic** — same input, same output, no
   time-based animation in the geometry.

### 11c — Search

**Do.** Search nodes, clusters, flows and symbols by path, label and role, with
results that drill straight to the right level of 11a's hierarchy. Server-side
once E16's storage gains node rows; client-side over the loaded snapshot until
then.

### 11d — Build it as a view over a run, not over a snapshot

**This is §3.0's sequencing consequence, and it belongs in this step or nowhere.**

**Do.** Key every explorer surface — state, URL, API calls — on a **run id**,
with the CodeGraph snapshot as one possible source of its data. Do not thread
`snapshot` through the component tree as the identity of the view. The
distinction costs nothing today and is what makes Step 13 a gate relaxation
instead of a rewrite (E48).

Reuse note: 11a's directory tree is the same component `open-issues.md` item 8
asks for on `/review` (E49). Build it once, in a form both surfaces can mount.
And per `open-issues.md` items 4–5, the front end already over-polls — **add no
new polling here**; the explorer is request-on-interaction.

**Don't.** Don't add a graph rendering library — `codegraph-layout.js` is a
hand-rolled UMD with node tests (`tests/js/codegraph-layout.spec.mjs`), and the
product is local-only and offline. Don't animate layout transitions without
honouring `prefers-reduced-motion`. Don't add responsive breakpoints or mobile
navigation — explicitly out of scope; keep the wide desktop composition.

**Gate.** `node --test tests/js/codegraph-layout.spec.mjs` green with new specs
asserting: (a) layout output is byte-identical across two runs on the same input;
(b) barycenter ordering strictly reduces a counted crossing metric on a fixture
with known crossings; (c) an edge to a node positioned left of its source does
not exit the right face. Manual pass on this repo: reach any file in ≤3
interactions from the overview.

---

## Step 12 — Dependency path finder

**Priority:** P1 · **Preconditions:** Step 11

**Goal.** Answer "how does A connect to B?" — the question a developer actually
asks before changing something. Absent today in every form (E30).

**Do.**
1. **New endpoint** `GET /api/v1/runs/:id/codegraph/paths?from=&to=` under
   `/api/v1/*`, following `ApiCodeGraph`'s existing shape: `getScoped` +
   `runKind` check, `ValidationException` → 422, caps validated against settings
   (`ApiCodeGraph.bx:43`–`87` is the template). Update `resources/apidocs/`
   in the same commit.
2. **Directed by default.** `CodeGraphRunService.buildAdjacency` is undirected
   (E27) — it appends both directions. The path finder needs
   `direction=forward|reverse|any`: forward answers "what does A pull in?",
   reverse answers "what reaches B?" (the impact question), `any` answers "are
   these related at all?". Do not reuse `buildAdjacency` unmodified.
3. **K shortest paths, not one.** One path is a trivia answer; three show whether
   the coupling is a single thread or a thicket. Cap K and total explored nodes
   from settings alongside the other `codegraph*` keys (`Coldbox.bx:113`–`128`).
4. **Weight by edge kind and by resolution confidence.** Now that Step 4
   preserves kinds, an `injects` hop is stronger evidence than a
   `type-reference`. Compose that with the **existing** `resolutionWeights`
   (E36: `path` 1.0 > `basename` 0.75 > `stem` 0.5 > `dotted-path` 0.4) rather
   than inventing a second confidence scale — a path through four guessed
   targets is weaker evidence than one through two resolved targets, and the
   graph already knows which is which. Surface the weakest hop's provenance on
   the path so a shaky answer looks shaky. Return the unweighted hop count too —
   a shortest path that is *long* is itself the finding.
5. **Return full evidence per hop** — edge kind, source line, evidence snippet —
   so a path is inspectable, not asserted. The `fileEdges` payload
   (`CodeGraphRunService.bx:355`–`366`) already carries the right fields.
6. **Answer "no path" clearly.** Distinguish *unreachable* from *cap exceeded*.
   Silently returning empty for a truncated search is the failure mode here.
7. **UI**: pick two nodes (from search, inspector, or the canvas), render the
   path highlighted over Step 11's layout, reusing the flow-highlight machinery
   that already exists (`buildFlowHighlightContext`,
   `codegraph-layout.js:914`). A path is shaped exactly like a flow — do not
   build a second highlight path.
8. **Seed the endpoints from context**: right-click a node → "find path from
   here", then pick the second. Also offer cluster→cluster, which answers the
   architectural question ("why does Billing touch Auth at all?").

**Don't.** Don't run unbounded search on a 20000-edge graph — bound explored
nodes and return `truncated: true`. Don't include `tests` edges by default; make
it a flag, matching `fileEdges`' existing `includeTests` handling
(`:290`–`:292`). Don't invent a transitive edge to shorten a path — every hop
must be a real, citable edge.

**Gate.** New `tests/specs/integration/CodeGraphApiSpec.bx` cases: a known
two-hop path on a fixture returns exactly those hops with evidence; reverse
direction returns a different result than forward on an asymmetric fixture;
unreachable returns an explicit no-path result distinct from a cap-exceeded one.
Manual: on this repo, path from `public/assets/app.js` to
`AnalysisGraphRepository` resolves through route and handler hops.

---

## Step 13 — The lens: explorer on any run, findings on the graph

**Priority:** P1 · **Preconditions:** Steps 11 and 12

**Goal.** Deliver §3.0's direction: stop CodeGraph being a fourth silo over a
graph the whole application already builds. Closes the known gap at
`application-features.md:287`, which has carried owner "CodeGraph" and no step.

**Do.**
1. **Relax the `runKind` gate (E48).** `ApiCodeGraph.subgraph:49`, `edges:108`
   and `narrative:150` reject any run that is not `runKind=codegraph`. Change the
   test from "is a CodeGraph run" to "has an indexed graph" — a Review run has
   one (E47). Keep `narrative` gated on a CodeGraph snapshot existing, since
   meaning is assembled there; structure needs no such gate.
2. **Assemble a snapshot on demand for non-CodeGraph runs**, or persist a light
   one at the end of a Review run. Prefer on-demand first: it proves the lens
   without adding a pipeline stage or a second write path.
3. **Link findings and nodes, both ways.** A finding cites a file and line; a
   node *is* that file. Surface `findingCount` per node and per cluster, and let
   the inspector list a file's findings. **This is the strongest meaning signal
   available with no provider at all** — "17 findings, 3 high, all in one
   cluster" is business meaning that no LLM had to assert.
4. **Offer the path finder next to a finding** (Step 12): "what breaks if I
   change this?" is the reverse path query, and it is more useful beside a
   finding than in a separate workspace.
5. **Mount the explorer in the Review workspace** behind the same drill spine.
   Do not duplicate the component; §3.0 is explicit that this is a view, not a
   merge.

**Don't.** Don't merge the workspaces or the run kinds — the three questions are
genuinely different (§3.0). Don't move Review's findings engine or Modernize's
planner. Don't let a Review run start paying for narrative generation: meaning
stays opt-in and CodeGraph-initiated.

**Gate.** On a completed **Review** run: the explorer opens, drills, and finds
paths, with no CodeGraph run performed. Node inspector shows that file's
findings. `application-features.md:287`'s gap row is closed and cites this step.
Full suite green.

---

## Step 14 — Flow swimlane and export

**Priority:** P2 · **Preconditions:** Step 12

**Goal.** Show a flow as a flow, and let the graph leave the app.

**Do.**
1. **Swimlane / sequence layout** in `codegraph-layout.js` — role lanes
   (client → entry → orchestrator → domain → persistence → table) with the
   selected flow drawn left to right. This is the "watch your code become flows"
   promise; today a flow is a highlight over a cluster blob (E22). It reuses
   Step 11b's routing fixes and Step 12's path rendering.
2. **Export** — Markdown briefing, Mermaid flow diagram, SVG canvas. `export`
   returns 422 today (`application-features.md:222`) while the graph *is* the
   deliverable. `ReportExportService` is the precedent. Mermaid for a single flow
   or a single path is the cheapest high-value export and pastes into any PR.
3. Inspector: source excerpt at the cited line, and an open-in-editor link.

**Don't.** Don't add responsive breakpoints or mobile navigation.

**Gate.** Manual pass on this repo with a provider configured and again with
none — both must render, drill and export. `node --test tests/js/*.spec.mjs`
green, with a layout spec for the swimlane.

---

## Step 15 — Evaluation corpus and docs truth

**Priority:** P2 · **Preconditions:** Step 10

**Goal.** Close the Known gap that says CodeGraph quality is unmeasured
(`application-features.md:294`, owner `—`), and make the feature rows true.

**Do.**
1. Build a fixture repository with known-correct expected domains, routes, flows,
   tables **and paths**. Score each run: are the expected flows found end to end?
   Does the path finder return the known path between two known endpoints? Are
   domains labelled consistently across two runs?
2. Wire it into `box run-script test` next to the Review corpus, with thresholds
   that fail the build.
3. Update `application-features.md`: the JS row (`:201`, `:212`) becomes true
   rather than "skipped"; the Explorer row (`:218`) gains hierarchy, smart layout
   and search; add rows for route / view / table edges, reachability, the path
   finder endpoint and export; **close the "Coupling graph UI is CodeGraph-only"
   gap (`:287`) and cite Step 13**; claim the other Known-gap rows this plan
   closes and set their owning step.
4. **Update the README's product framing (§3.0).** It lists CodeGraph third among
   four workspaces — accurate for today, wrong once Step 13 lands. Say plainly
   that the graph is the application's and the explorer opens on any indexed run.
4. Revisit the JS tier in `SupportedLanguageService.bx:19` **only** on measured
   evidence.
5. Update `technical-flow.md` for the new parser, edge kinds and label table, and
   `app/models/README.md` for every new or changed service.

**Don't.** Don't raise a language tier or add a feature row for anything the
corpus does not measure. That is the claim rule, and it is why this step is in
the plan rather than assumed.

**Gate.** `box run-script test` includes CodeGraph scoring and fails when a
threshold regresses. No feature row lacks a pointer to code or a measured result.

---

# Part 5 — Deferred and out of scope

**Deferred — real, not now.** Run-over-run snapshot diff ("this domain is new,
this flow now touches persistence"). Two fingerprints now exist, so it is
unblocked, but it wants Step 10's stable labels first or the diff is dominated by
renames. Impact-as-story ("if you change X…") — note this is Step 12's reverse
path finder plus prose, so it becomes cheap once Step 12 lands. Editable local
vocabulary beyond Step 10's label override. Saved / named path queries.
Server-side search over node rows, which needs E16's storage split first.

**Out of scope — do not build.** A second Domain/Structural graph product.
Semantic search or an embeddings corpus. Chat Q&A over the graph. A generated
wiki. Languages beyond BoxLang, ColdFusion and JavaScript — including
TypeScript. Automatic migration or any source rewrite. SaaS, accounts, hosted
retention, mobile layouts.
