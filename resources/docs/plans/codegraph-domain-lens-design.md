# CodeGraph Domain lens — design

**Status:** Approved 2026-08-06  
**Live plan:** [codegraph-depth-plan.md](codegraph-depth-plan.md) (implementation tasks)  
**Canvas:** `codegraph-domain-lens-design.canvas.tsx` (companion)

## Goal

Turn CodeGraph from a coupling diagram into a **meaning product** for a
developer who does not know the codebase: domains, processes, flows, and risk
in plain language — grounded in a deterministic graph.

**Success test:** With an LLM provider configured, after one run a stranger can
answer in under ~5 minutes: what the app is, which domains exist, how a typical
request flows, and what is dangerous to touch — without opening the IDE.

## Product stance

| Layer | Role |
|---|---|
| Deterministic graph | Evidence substrate: files, edges, clusters, roles, extracted flows, hotspots/cycles |
| LLM narrative | **Required for proper CodeGraph** — pitch, domain language, process stories, onboarding path, risk briefing |
| No-key / failed narrative | Run still succeeds with structure + roles + raw flows; UI shows a clear banner that meaning needs AI — do not pretend folder tokens are business meaning |

Approach: **one graph** (Domain lens on current graph). LLM never invents nodes
or edges; every claim cites computed ids.

## Persona & promise

Stranger to the repo. Promise: business-facing map with a legend (domains,
processes, flows), not a map with no legend. Evidence stays inspectable
(edge kinds, paths, metrics).

## Overview (first viewport)

1. **Project strip** — LLM pitch when narrative present; else honest “structure
   only” + configure-AI CTA.
2. **Role legend** — Entry · Orchestrator · Domain · Persistence · Shared · Test.
3. **Domain cards (top ~10)** — LLM business label + purpose; fallback =
   deterministic cluster key (weaker, clearly labeled).
4. **Top processes** — computed handler-seeded flows + LLM stories when present.
5. **Risk** — existing cycles/hotspots/orphans; LLM risk briefing when present.

## Deterministic substrate (must ship)

### File role

Derive from `ArchitectureModelService.classifyFile`, fan-in/out, and symbol
kinds (e.g. handler-action, persistence path cues). Store on each snapshot node;
show on Files cards, legend, and inspector.

### Domain keys / labels (pre-LLM)

Improve cluster naming beyond raw folder tokens (handler/module vocabulary,
collision-safe). Provide a short deterministic “why grouped” from member paths.
LLM may rename/explain; must keep `clusterId` stable.

### Process / flow extraction

Seed from handler-actions (and routes when indexed). Walk injects/calls depth
2–3 to a sink. Cap list (e.g. top N by entry fan-out / path length). Snapshot
field e.g. `flows: [{ id, entryFile, entrySymbol, steps[], sinkFile }]`.
UI: Overview chips; “Show this process” highlights path on Files/Neighbourhood.

### Linking (already shipped)

File edges API, subgraph `from`/`to`, case-normalized ids, edge evidence in
inspector — remain the drill spine: Overview → domain Files → neighbourhood.

## LLM package (required path)

One structured narrative package (prefer single call / one repair retry):

1. **Project pitch** — 2–3 sentences.
2. **Domain summaries** — business name + purpose for top clusters (cite `clusterId`).
3. **Process stories** — “When X happens…” for top flows (cite `flowId` / node ids).
4. **Onboarding path** — ≤5 ordered steps (domain / entry / file ids only).
5. **Risk briefing** — why top hotspots/cycles matter (cite issue ids).
6. **Glossary (stretch / P2)** — jargon chips for recurring tokens.

### Contract

- **Input:** computed domains, roles, flows, hotspots/cycles (ids, paths,
  metrics only) — extend `codegraph-narrative-input-v1` / role to v2.
- **Output:** must cite existing ids; drop orphan claims
  (`CodeGraphNarrativeService.normalize` pattern).
- **UI:** AI chips; toggle may hide prose but meaning mode expects narrative.
- **Failure:** soft-fail; never fail the run; banner when `narrative.used` is false.

### Out of LLM scope

Chat Q&A, inventing domains/edges, semantic search corpus, wiki pages, diff
narratives (until two fingerprints exist).

## Drill

Unchanged spine. Add process highlight. Edge click → evidence (shipped).

## Out of scope (this effort)

- Second Domain/Structural graph product
- Semantic search, wiki, editable local vocabulary file
- Symbol-level explorer
- SaaS / hosted / mobile

**Superseded scope.** Two lines here are no longer accurate. "JS remains
skipped" and the P2 deferral of a glossary are both overturned by
[codegraph-depth-plan.md](codegraph-depth-plan.md) Steps 5 and 10 — JavaScript
becomes a parsed language, and domain labels persist across runs with
provenance. Everything else in this document stands.

## Ship order

| Step | Outcome | Status |
|---|---|---|
| P0 substrate | Roles, legend, flow extraction, better cluster keys | Shipped |
| P0 narrative v2 | Pitch + domains + processes + onboarding (+ risk if tokens allow) | Shipped |
| P1 UI meaning mode | Overview/cards driven by narrative; banner when missing | Shipped |
| P1 process overlay | Highlight computed flow on canvas | Shipped |
| P2 glossary + impact-as-story | Jargon chips; “if you change X…” | See depth plan |

The substrate this design assumed is thinner than it needs to be — the parsers
read one line at a time, and the graph has no front end and no data layer.
[codegraph-depth-plan.md](codegraph-depth-plan.md) is the live plan that fixes
that.

## Non-goals vs Review/Modernize

CodeGraph does not replace Review findings or Modernize plans. It reuses
index/coupling/cluster machinery and exposes a knowledge + briefing workspace.

## Open decisions (resolved)

- Approach A (one graph) — approved.
- LLM required for proper meaning — approved.
- No-key = structure + honest CTA, not fake business labels — approved.
