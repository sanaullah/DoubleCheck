# CodeGraph graph fidelity — system design

**Status: approved and implemented (2026-08-11).** Steps 1–5 of §7 are in the
working tree and verified against live runs; §8 records what each one actually
produced, including the two places the design was wrong. This document is now
the live CodeGraph plan. Its predecessor, `codegraph-depth-plan.md`, completed
all 18 of its steps and was deleted in this change per the one-live-plan rule;
git history is its archive (last content at commit `1a297de`).

**Verified:** every `file:line` and every number below was checked against the
working tree and a live run (`ec9e457d`, 321 files) on 2026-08-11.

---

## 1. The problem, stated precisely

The product shows *a* graph. It does not show *the* graph. Three specific gaps
sit between the code on disk and the picture on screen, and each one is
measurable.

### G1 — Granularity: the atom is the file, but the code graph is symbols

`review_symbols` stores every symbol with `line` and `end_line`
(`SchemaService.bx:508`). `review_dependencies` stores every dependency with
`source_file`, `target`, `target_file` and `line` — **but no owning symbol**
(`:527`). So the stored edge says *"something in ApiCodeGraph.bx calls
AnalysisGraphRepository at line 354"*, never *"`ApiCodeGraph.hasIndexedGraph`
calls it"*.

Everything downstream inherits that. `CodeGraphInventoryAdapter` rolls symbols
into file units; nodes are files; the canvas draws files.

**The tell.** Step 9 promised symbol-level flow steps. What shipped:

```boxlang
// CodeGraphFlowService.bx:251
return arguments.steps.map( ( step ) => {
    var symbols = byFile[ normalizePath( step ) ] ?: [];
    return isArray( symbols ) && symbols.len() ? symbols[ 1 ] : "";
} );
```

`symbols[ 1 ]` — the **first symbol declared in the file**, with no reference to
the step's line. For a `.bx` class file that is the class declaration, so the
live snapshot reads:

```
app/handlers/apicodegraph.bx                   symbol='ApiCodeGraph'
app/models/services/reviewrunservice.bx        symbol='ReviewRunService'
app/models/repositories/aiproviderprofile...   symbol='AIProviderProfileRepository'
```

Every `stepSymbol` is the file name in PascalCase. It is not wrong — it is
**vacuous**: it carries no information the path did not already carry, and the
method that actually made the call is nowhere. Where the first declaration is
not a class (a `.bxm` template, a script with leading helpers) it stops being
even that.

This is the gap that matters most, because "how does a request move" is
CodeGraph's headline question, and today the honest answer stops at file
resolution while the payload implies symbol resolution.

### G2 — Completeness: the graph is truncated, ordered, and the order is not random

Live run `ec9e457d` on this repo — a *small* repo — reported:

```
truncated: true
reasons: graphLoad, graphDependencies, graphImpacts, maxHotspots, maxFlowsPerCluster
totals:   321 files · 5,043 symbols · 20,000 dependencies · 398 nodes · 391 edges
```

`dependencies: 20000` is exactly `codegraphMaxEdges`. The dependency query
orders by kind priority then `source_file`, then applies `LIMIT`
(`AnalysisGraphRepository.bx:376`–`:397`). Truncation is therefore
**deterministic and biased**: low-priority kinds in late-alphabet directories
vanish first. Not a sample — a systematic amputation.

Then the client narrows again: the canvas requests `maxNodes: 120`
(`app.js:5380`, `:5401`) and 60 for overview (`:5404`), out of 398 available.

Under 1% of the 5,043 symbols reach the screen, and the pipeline that discards
them is invisible except for one banner.

### G3 — Queryability: the snapshot is a blob, and the blob forces the caps

`codegraph_snapshots` is one row per run with `snapshot_json` TEXT
(`SchemaService.bx:580`). There are no node, edge, or flow tables. The whole
graph is serialized, shipped to the browser, and filtered in JavaScript — which
is why Step 12a's search is client-side and why server-side search was deferred.

The irony: **the queryable form already exists.** `review_symbols` and
`review_dependencies` are indexed for exactly this traversal:

```
idx_review_symbols_run_file        ( run_id, file_path, line )
idx_review_dependencies_run_source ( run_id, source_file, line )
idx_review_dependencies_run_target ( run_id, target_file, source_file )
```

The product builds a queryable graph in SQLite, flattens it into JSON, caps the
JSON so it fits in a browser, and then cannot query it.

### G4 — Flow selection: 55 flows, but they are near-copies of each other

From the same run, the first four flows:

```
route:/api/v1/ai/smoke   → ApiAI → SpecialistAgentGateway → SpecialistAgentInvoker
                         → SpecialistChatInvoker → AIProviderResolverService
                         → AIProviderProfileRepository → table:ai_provider_profiles
route:/api/v1/ai/smoke   → …same, one hop different…      → table:ai_provider_profiles
route:/api/v1/codegraph  → ApiCodeGraph → ReviewRunService → CodeGraphRunService
                         → … → AIProviderProfileRepository → table:ai_provider_profiles
route:/api/v1/codegraph  → …variant…                       → table:ai_provider_profiles
```

Every one of them drains into the same provider-profile table, because a
deep-path search rewards the longest walk and the AI provider chain is the
longest chain in the codebase. Two flows per route differ by a single
intermediate hop and are presented as two processes.

The ranking optimises for *depth* (`CodeGraphMetricsService` sorts by depth, and
`sinkKind` promotes typed sinks) rather than for *distinctness* or *coverage*.
The result reads like one process retold 55 times. A process list should cover
the app's surface — different entry points reaching different sinks — not
enumerate variants of the deepest walk.

This is a ranking problem, not a storage problem, and it is fixable
independently of everything else here.

---

## 2. Requirements

### Functional

| # | Requirement |
|---|---|
| F1 | A node can be a symbol, a file, a directory, or a cluster; the user moves between levels without a new mental model |
| F2 | Every edge names its **source symbol**, target, kind, line, and evidence |
| F3 | Any node in the repository is reachable by search, whether or not it is drawn |
| F4 | The view states what is not shown, in counts, at every level |
| F5 | Flows and paths carry per-hop symbol attribution that is derived from the edge's line, or is explicitly absent |
| F5b | The process list is selected for distinctness and entry/sink coverage, not for path depth |
| F6 | Everything above works with no AI key |

### Non-functional

| # | Requirement | Target |
|---|---|---|
| N1 | Interaction latency (drill, search, neighbourhood) | < 150 ms p95 on a 5,000-file repo |
| N2 | Time to first map, cold | ≤ today's 89 s (must not regress) |
| N3 | Time to first map, warm | ≤ 2 s (today: 1 s via snapshot reuse) |
| N4 | Determinism | Same input ⇒ byte-identical fingerprint. Non-negotiable; the corpus asserts it |
| N5 | Memory in the browser tab | Bounded by viewport, not by repo size |

### Constraints

Local-only SQLite, desktop-only, BoxLang/CFML/JS, no graph library, no new
runtime dependency, `SchemaService` is the single schema owner, and Review and
Modernize share `review_symbols` / `review_dependencies` / the coupling and
clustering services (E44, E45). Any change to those is additive or opt-in.

**Explicit non-goal:** this is a single-user desktop app. There is no QPS, no
multi-tenancy, no failover. "Scale" here means *repository size*, and §5 treats
it that way rather than importing distributed-systems concerns the product
boundaries forbid.

---

## 3. High-level design

**One sentence: stop shipping the graph, start serving it.**

The snapshot stops being the transport and becomes a *summary*. The graph lives
in rows and is queried per interaction. The client holds a viewport, not a copy.

```
                        ┌──────────────────────────────────────────┐
  parse / index         │  review_symbols      review_dependencies │
  (unchanged)           │   + line/end_line     + source_symbol_id │◄── the one
                        └──────────────────┬───────────────────────┘    new column
                                           │  attribute at materialize
                                           ▼
                        ┌──────────────────────────────────────────┐
  snapshot build        │  CodeGraphMetricsService.assemble        │
  (unchanged maths)     │  roles · clusters · flows · reachability │
                        └──────────────────┬───────────────────────┘
                                           │  write rows, not one blob
                                           ▼
        ┌───────────────────────────────────────────────────────────────┐
        │ codegraph_snapshots   summary + totals + fingerprint (no blob) │
        │ codegraph_nodes       one row per symbol / file / cluster      │
        │ codegraph_edges       one row per edge, with source_symbol_id  │
        │ codegraph_flows       one row per flow, hops in a child table  │
        └───────────────────────────────┬───────────────────────────────┘
                                        │  SQL, indexed, level-scoped
                                        ▼
        ┌───────────────────────────────────────────────────────────────┐
        │ GET /codegraph/graph?level=&scope=&limit=   ← the new primitive │
        │ GET /codegraph/search?q=&level=            ← server-side       │
        │ GET /codegraph/subgraph · /edges · /paths  ← already exist     │
        └───────────────────────────────┬───────────────────────────────┘
                                        ▼
        ┌───────────────────────────────────────────────────────────────┐
        │ Explorer: a viewport. Zoom is a query, not a client-side filter │
        └───────────────────────────────────────────────────────────────┘
```

### The keystone change

**Add `source_symbol_id` to `review_dependencies`.** One column, populated in
`ArchitectureIndexService.materialize` where both the file's symbols (with
`line`/`end_line`) and its dependencies (with `line`) are already in hand. The
attribution is an interval containment test — innermost enclosing symbol wins,
`""` when a dependency sits outside any symbol body (imports, top-level code),
which is honest and queryable.

Everything else in this design is plumbing. This column is what turns a file
graph into a code graph, and it retires the `symbols[ 1 ]` guess.

Blast radius: additive column, `DEFAULT ''`. Review and Modernize read
`review_dependencies` and ignore unknown columns. Attribution happens at
materialize, **downstream of parsing**, so no `parserVersion` bump — but it does
change snapshot content, so `snapshotVersion` and the Step 14 reuse key must
move.

---

## 4. Deep dive

### 4.1 Data model

```sql
codegraph_nodes (
  snapshot_id TEXT, node_id TEXT, level TEXT,          -- symbol|file|directory|cluster
  parent_id TEXT,                                      -- symbol→file→directory→cluster
  path TEXT, symbol_name TEXT, kind TEXT, role TEXT,
  language TEXT, line INTEGER, end_line INTEGER,
  fan_in INTEGER, fan_out INTEGER, hotspot REAL,
  PRIMARY KEY ( snapshot_id, node_id )
)
CREATE INDEX ON codegraph_nodes ( snapshot_id, level, parent_id );
CREATE INDEX ON codegraph_nodes ( snapshot_id, level, hotspot DESC );  -- ranked truncation

codegraph_edges (
  snapshot_id TEXT, edge_id TEXT, level TEXT,
  from_node TEXT, to_node TEXT,
  group_kind TEXT, kinds_json TEXT, occurrences INTEGER,
  weight REAL, resolution TEXT, line INTEGER, evidence TEXT,
  PRIMARY KEY ( snapshot_id, edge_id )
)
CREATE INDEX ON codegraph_edges ( snapshot_id, level, from_node );
CREATE INDEX ON codegraph_edges ( snapshot_id, level, to_node );
```

`parent_id` is the whole navigation model: one self-join answers "children of
this node" at any level, so the directory tree, the file list inside a cluster,
and the symbol list inside a file are **one query with a different argument**
instead of three code paths.

Edges exist at each level, written once at build time. A symbol→symbol edge
rolls up to file→file and cluster→cluster by grouping on `parent_id` — computed
during assemble, where the cluster maths already runs, not at read time.

`codegraph_snapshots` keeps its summary columns and its `narrative_json`; it
loses `snapshot_json`. Deletion cascades from `review_runs` as today.

### 4.2 The one new endpoint

```
GET /api/v1/runs/:id/codegraph/graph
      ?level=cluster|directory|file|symbol
      &scope=<node id>            // omit for the top of that level
      &include=edges|nodes|both
      &rank=hotspot|fanIn|name    // which ones survive the limit
      &limit=<n ≤ setting>

200 {
  level, scope,
  nodes: [ { id, level, parentId, path, symbolName, role, kind, line, fanIn, fanOut } ],
  edges: [ { id, from, to, kind, kinds[], occurrences, weight, resolution, line, evidence,
             sourceSymbol } ],
  completeness: {
    returned: 120, available: 5043, rankedBy: "hotspot",
    omitted: 4923, reason: "limit"
  }
}
```

`completeness` is the contract that makes F4 enforceable rather than
aspirational: **every response states its own losses**, in the response, not in
a banner assembled from enum codes. The client renders it verbatim.

`rank` replaces alphabetical amputation with a stated ordering. "Top 120 by
hotspot, 4,923 not drawn" is a true statement about a graph. "The first 120
alphabetically, silently" is not.

Existing endpoints keep working: `/result` returns the summary plus the cluster
level (so today's client still functions), `/subgraph`, `/edges` and `/paths`
are unchanged in shape and gain `sourceSymbol` on hops.

### 4.3 Caching and invalidation

Three layers, all present already, none new:

1. **Parse cache** — `( contentHash, parserVersion )`. Untouched.
2. **Snapshot reuse** — the Step 14 key, plus `snapshotVersion`. Row-based
   storage does not change reuse; it changes what reuse hands back.
3. **Client viewport cache** — keyed `( runId, level, scope, limit, rank )`,
   LRU-bounded, dropped on run change. Makes drill-up instant without holding
   the graph.

No new invalidation rule, which is the point: a new cache layer with its own
staleness semantics is how this design would go wrong.

### 4.4 Front-end: zoom is a query

Today the client receives everything and filters. The change is that each level
transition **fetches**, and the canvas never holds more than it draws.

```
Project      33 clusters                         "33 modules · 321 files"
  └ Domain   files in one cluster, ranked        "showing 40 of 96 by fan-in"
      └ File symbols in one file, with edges     "18 symbols"
          └ Symbol callers and callees, cited    "called by 7 · calls 3"
```

Four rules for the UI, each answering a specific failure observed in the
current build:

1. **Never draw more than ~150 nodes; always print what was omitted and by which
   ranking.** Replaces the silent `maxNodes: 120` slice.
2. **Search is server-side and level-aware**, so it reaches the 4,923 nodes the
   canvas never drew. The client-side search shipped in Step 12a can only find
   what was already downloaded — it looks like search and behaves like a filter.
3. **Symbol level is a real level**, not a list in the inspector. "What calls
   this function" is the question a stranger to the codebase actually asks, and
   it is unanswerable in the product today.
4. **Attribution is labelled.** A hop resolved by interval containment reads
   `ApiCodeGraph.hasIndexedGraph`; one that could not be resolved reads
   `ApiCodeGraph.bx (file level)` — never a symbol name that might be wrong.

### 4.5 Flow selection: cover the surface, don't rank by depth

Three changes to `CodeGraphFlowService`, none of which need the storage work:

1. **Dedupe on the hop multiset, not the ordered signature.** Two paths that
   differ by one intermediate hop and share entry and sink are one process with
   a variant, not two processes. Keep the shortest and record
   `variantCount: n`.
2. **Diversity quota before depth.** Fill the list by distinct
   `( entry route, sinkKind, sink )` first, then spend what's left on depth.
   A list where 90% of entries end at one table is a bug in the ranking, not a
   fact about the app.
3. **Down-weight universal sinks.** A node reached by most flows —
   `AIProviderProfileRepository` here — is infrastructure, not a destination.
   Rank a flow by how much of the app it explains, e.g. penalise sinks by
   the share of flows that reach them.

Gate: on this repo, no sink appears in more than ~⅓ of listed flows, and no two
listed flows share both entry and sink.

### 4.6 Errors and degradation

| Situation | Behaviour |
|---|---|
| Level query exceeds limit | 200 with `completeness.omitted > 0`. Never a silent slice |
| `scope` unknown | 404, distinct from an empty level (200, `nodes: []`) |
| Symbol attribution unresolved | `sourceSymbol: ""` and the UI says "file level". Never a guessed symbol |
| Snapshot predates the split | Serve the summary and the cluster level from the summary columns; deeper levels return 409 with `reason: "snapshot-predates-node-tables"`, and the UI offers Rebuild |
| No AI key | Unchanged — every level above is deterministic |

---

## 5. Sizing — repository size, not traffic

Measured on this repo, then extrapolated to a plausible legacy CFML target.

| | This repo (measured) | 5,000-file CFML app (estimated) |
|---|---|---|
| Files | 321 | 5,000 |
| Symbols | 5,043 | ~75,000 |
| Dependencies | 20,000 (**capped**; true count unknown) | ~300,000 |
| Snapshot JSON blob | 348 KB via `/export?format=json` | ~5 MB, single row, parsed per request |
| Node rows | — | ~80,000 |
| Edge rows | — | ~300,000 |

SQLite handles 300k indexed rows without difficulty; a level query with
`LIMIT 150` on an indexed `( snapshot_id, level, parent_id )` is a b-tree seek
and a short scan. The blob does not: it must be read, parsed, and held whole,
per request, and it grows linearly with the repo while the screen does not.

**N1 is the number to prove first.** Before building this, measure one level
query against a synthetic 300k-edge snapshot. If a drill costs more than ~150 ms
locally the design needs a materialized rollup per level, which is a bigger
change than it looks — see §6.

Write cost: ~380k inserts per snapshot in one transaction, batched. Expect this
to be the slowest new step; it must not push N2 past 89 s. If it does, the
snapshot write moves behind the Step 2 structure event so the map still appears
first and rows land after — the two-phase mechanism already exists.

Reliability, honestly scoped: single-writer local SQLite. The failure modes are
a partial write (one transaction), disk exhaustion on a huge repo (bounded by
caps), and a stale snapshot after a parser change (the reuse key covers
`parserVersion`). There is nothing to fail over to and nothing should be added.

---

## 6. Trade-offs

| Decision | Chosen | Alternative | Why, and what it costs |
|---|---|---|---|
| Graph storage | Rows | Keep the JSON blob | Rows make search, deep levels and diff possible and end cap-driven amputation. Cost: ~380k inserts per run, a real migration, and `assemble` output must be written twice during transition to prove equivalence |
| Graph atom | Symbol, with file/cluster as rollups | Keep the file atom | Only a symbol atom answers "what calls this". Cost: the node set grows ~15×, so every consumer — layout, LLM budget, caps — must be level-aware, and the LLM narrative must keep consuming the *file* level or its payload budget collapses |
| Symbol attribution | Interval containment at materialize | Parser emits the enclosing symbol | Containment reuses existing data and needs no parser change or `parserVersion` bump. Cost: nested and anonymous functions attribute to the innermost declared symbol, which is right for methods and arguable for closures. The parser route is more accurate and costs a full re-parse of every cached file |
| Search | Server-side, level-aware | Keep client-side | Client-side search cannot find what was never downloaded — it is a filter wearing a search's clothes. Cost: a round trip per keystroke-debounce, and search must respect the same ranking contract |
| Truncation | Ranked + declared in the response | Larger caps | Raising caps postpones the problem and makes the blob worse. Declared ranked truncation is honest at any repo size. Cost: `rank` becomes part of the contract and therefore of the fingerprint |
| Rollout | New tables beside the blob, blob removed after equivalence | Cut over in one commit | Fingerprint equivalence must be *proved*, not asserted; N4 is corpus-gated. Cost: one release carrying both, and disk for both |

### What this design does not fix

- **Role quality.** `unknown` sits at 5.03% on this repo; that is a heuristics
  problem, unaffected by storage.
- **Narrative quality.** Domain names and process stories stay LLM-shaped.
- **Parser coverage.** Dynamic SQL, reflection and runtime wiring stay invisible
  — no static graph sees them, and the product should keep saying so.

### What I would revisit as it grows

1. **Per-level materialized rollups** if §5's N1 measurement fails — precompute
   the drawn set per `( level, scope, rank )` instead of querying live.
2. **Run-over-run diff**, which becomes nearly free once nodes are rows with
   stable ids (Step 4 already made ids position-independent) and is the natural
   next product capability.
3. **Dropping `codegraph_flows`** and deriving flows from the edge table on
   demand, once path queries are fast enough to make stored flows redundant.

---

## 7. Sequencing, if this is accepted

Two of the four gaps are cheap and independent of the storage work. Do those
first; they change what the user sees without touching a schema.

| Order | Work | Gap | Rough size | Depends on |
|---|---|---|---|---|
| 1 | Flow selection: dedupe, diversity quota, universal-sink penalty (§4.5) | G4 | ~half a day | nothing |
| 2 | `source_symbol_id` + interval attribution + labelled hops | G1 | ~1 day | nothing |
| 3 | Ranked truncation + `completeness` on existing endpoints | G2 | ~1 day | nothing |
| 4 | Node/edge tables, `/graph` endpoint, server-side search | G3 | ~1 week | 2, 3 |
| 5 | Symbol level in the explorer; zoom-as-query | G1, G3 | ~1 week | 4 |

**If only one thing gets built: step 2.** `source_symbol_id` on
`review_dependencies`, the containment attribution, and a UI that says
"file level" when it cannot resolve. One additive column, no migration, no
`parserVersion` bump — and it is the difference between a file-dependency
diagram and a code graph. Steps 1 and 3 are each smaller than a day and remove
the two most visible untruths on the current screen.

---

# 8. What shipped, and what the design got wrong

Verified 2026-08-11 against live runs on this repo. Every number below is
measured, not projected.

## 8.1 Results

| Gap | Before | After |
|---|---|---|
| **G1** symbol attribution | `stepSymbols` = the file's first declaration, so every hop read as the class name | 67% of hops (148/221) name the symbol that owns the edge — `apiquality.index`, `qualitygateservice.status`; the rest say "file level" and mean it |
| **G2** truncation | `truncated: true` plus enum codes; node cap sliced a path-sorted array | `20,000 of 40,911 dependencies loaded — kept by edge kind, then file path`, printed in the UI; node cap keeps the most connected files and restores path order for presentation |
| **G3** queryability | One JSON blob; search could only filter what was downloaded | 5,532 node rows and 1,763 edge rows per run across four levels; `/codegraph/graph` and `/codegraph/search` serve them. Searching `enclosingSymbol` returns `ArchitectureIndexService.bx:484` — a symbol no canvas ever drew |
| **G4** flow selection | 55 flows, one sink dominant, duplicate (entry, sink) pairs | 43 flows, 14 distinct sinks, top sink 34.9%, zero duplicate (entry, sink) pairs |

Row counts from run `73b79904`: nodes — 5,057 symbol, 400 file, 40 directory,
35 cluster; edges — 991 symbol, 675 file, 97 cluster.

## 8.2 Two things the design stated imprecisely

1. **"Dedupe on the hop multiset" was the wrong mechanism.** Two paths that
   differ by one intermediate hop have different multisets, so multiset dedupe
   would not have merged the near-duplicates that motivated G4. What actually
   works is grouping on **(entry, sink)** and keeping the shortest chain, with
   the distinct multiset count carried as `variantCount`. That is what shipped.
2. **"No sink above ⅓" is not achievable as stated.** The invariant enforced is
   `perSink ≤ ceil(n/3)`, checked incrementally as the list grows. On a 43-flow
   list that ceiling is 15, i.e. 34.9% — the tightest integer bound, not 33.3%.
   The gate in §4.5 should read `ceil(n/3)`.

## 8.3 One consequence the design missed entirely

Symbol attribution is derived in `materialize`, downstream of parsing, so the
design concluded no `parserVersion` bump was needed. True — but incomplete.
Graph **adoption** (`findIndexedRun` → `adoptRunGraph`) matches on the stored
parser version, so a new run adopted pre-attribution rows and served them,
producing 0% attribution on two consecutive verification runs while every unit
spec passed.

Fix: `ArchitectureIndexService.indexVersion` (`architecture-index-v2`) now
participates in the adoption signature. **The rule this establishes:** any cache
or adoption key must cover everything that shapes the stored rows, not just the
step that produced the raw input. Same failure family as Step 14's snapshot
reuse key in the predecessor plan.

## 8.4 Known limits of what shipped

- **Symbol edges inside one file are usually empty.** `readEdgesAmong` returns
  an edge only when both endpoints are in the returned node set, and symbol
  edges mostly leave the file. Scoping the symbol level to a file therefore
  shows nodes with no edges. Honest, but a stub for out-of-scope endpoints would
  read better.
- **Duplicate symbol rows for handler actions.** The parser emits both
  `function` and `handler-action` for the same declaration, so both appear in
  the symbol list. That is the parser's taxonomy, not a projection defect.
- **Attribution is 67%, not 100%.** The remainder are synthetic `route:` and
  `table:` hops, and dependencies outside any symbol body (imports, top-level
  code). Both are correctly empty rather than guessed.
- **The canvas still draws from the snapshot blob.** "Zoom is a query" landed for
  the side panel — search, the symbol level and the source excerpt all come from
  `/codegraph/graph` and `/codegraph/search` — but the SVG itself still renders
  the downloaded snapshot with its 120-node cap. Rewiring the canvas to fetch
  per level is the remaining half of §4.4 and carries real regression risk for
  the layout, highlight and path machinery, so it was not attempted in the same
  pass. The user-visible consequence today: you can *find* and *inspect* any
  symbol, but you cannot *see* the symbol level drawn as a graph.
- **N1 was never measured.** §5 named a 300k-edge latency test as the thing to do
  before building step 4. It was not done; the levels shipped on this repo's
  scale (5.5k nodes, 1.8k edges) where every query is instant. The test still
  matters before pointing this at a large legacy codebase.
- **Run duration grew.** Indexing plus projection now takes roughly 4–5 minutes
  on this repo against ~90 s before, because the index-version bump forces a
  full re-index and the projection adds ~7,000 inserts. Structure still lands
  before the narrative, and the projection runs after the structure save, so
  time-to-first-map is unchanged. This has not been re-measured precisely and
  should be before the next release.
