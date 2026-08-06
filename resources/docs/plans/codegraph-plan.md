# CodeGraph Domain lens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax.
>
> **Design (approved):** [codegraph-domain-lens-design.md](codegraph-domain-lens-design.md)

**Goal:** Make CodeGraph a meaning product for strangers to the repo — domains,
processes, flows, onboarding — with LLM required for proper briefing and a
deterministic graph as evidence substrate.

**Architecture:** Extend snapshot assembly (roles + flows), narrative v2 package
(pitch / domains / processes / onboarding / risk), and Overview UI (legend,
meaning banner, process chips). One graph; no second Domain mode.

**Tech stack:** BoxLang/ColdBox, SQLite snapshot + narrative JSON, existing
prompt schemas under `resources/prompts/`, `codegraph-layout.js` + `app.js`.

## Global Constraints

- Local desktop only; BoxLang/ColdFusion only (JS skipped).
- LLM required for **proper** meaning; no-key still returns structure + honest CTA.
- Narrative must cite existing `clusterId` / node / `flowId` / hotspot ids only.
- Soft-fail narrative; never fail the run.
- Desktop UI only; no mobile breakpoints.
- One live plan — this file. Design doc is normative for product intent.
- Do not commit unless the user asks.

### Foundation already shipped (do not rebuild)

Workspace, runKind, metrics/clusters, linking Slice 1 (edges API, from/to,
case ids, edge evidence), Overview camera/top-N. See git history / prior
sections removed when this plan superseded the build-out plan.

---

## File map

| File | Responsibility |
|---|---|
| `app/models/services/CodeGraphMetricsService.bx` | `role` on nodes; `flows[]` extraction; cluster purpose hints |
| `app/models/services/CodeGraphNarrativeService.bx` | Narrative v2 normalize + cache key |
| `resources/prompts/roles/codegraph-narrative-v2.json` | Role instructions |
| `resources/prompts/schemas/codegraph-narrative-input-v2.json` | Input pack |
| `resources/prompts/schemas/codegraph-narrative-v2.json` | Output: pitch, domains, processes, onboarding, risk, summaries |
| `app/models/services/PromptContractService.bx` (or registry) | Register v2 if needed |
| `public/assets/codegraph-layout.js` | Legend-friendly cards; flow highlight attrs |
| `public/assets/app.js` / `app.css` | Meaning banner, process strip, onboarding, AI-driven labels |
| `tests/specs/unit/CodeGraphMetricsServiceSpec.bx` | Roles + flows |
| `tests/specs/unit/CodeGraphNarrativeServiceSpec.bx` | v2 normalize |
| `tests/js/codegraph-layout.spec.mjs` | Layout/highlight helpers |

---

### Task 1: File roles on snapshot nodes

**Files:**
- Modify: `app/models/services/CodeGraphMetricsService.bx` (`buildNodes`)
- Test: `tests/specs/unit/CodeGraphMetricsServiceSpec.bx`

**Interfaces:**
- Produces: each node includes `role` one of
  `entry|orchestrator|domain|persistence|shared|test|unknown`
- Consumes: `classifyFile`, fanIn/fanOut, path heuristics

- [ ] **Step 1: Write failing expectations** for handler → `entry`, model DAO-ish path → `persistence`, test path → `test`.

- [ ] **Step 2: Implement `assignRole(nodeMeta)`** private helper; set `role` in `buildNodes`.

- [ ] **Step 3: Run** `box testbox run bundles=tests.specs.unit.CodeGraphMetricsServiceSpec reporter=Min` — expect pass.

---

### Task 2: Flow extraction into snapshot

**Files:**
- Modify: `CodeGraphMetricsService.bx` `assemble`
- Test: `CodeGraphMetricsServiceSpec.bx`

**Interfaces:**
- Produces: `flows: [{ id, entryFile, entrySymbol, steps: [fileIds...], sinkFile, edgeKinds: [] }]`
- Cap: e.g. 24 flows; prefer handler-action symbols from inventory/review graph
- `id` stable: `flow-` + hash(entryFile + entrySymbol) or ordered index with stable sort

- [ ] **Step 1: Failing test** — synthetic handler → service → model edges yield ≥1 flow with steps.

- [ ] **Step 2: Implement `extractFlows(inventory, graph, caps)`** using injects/calls edges only; depth ≤3; skip tests unless both ends are non-test.

- [ ] **Step 3: Include `flows` in assemble return + fingerprint payload** (so narrative cache invalidates when flows change).

- [ ] **Step 4: Run metrics unit suite — pass.

---

### Task 3: Narrative v2 schemas + role

**Files:**
- Create: `resources/prompts/schemas/codegraph-narrative-input-v2.json`
- Create: `resources/prompts/schemas/codegraph-narrative-v2.json`
- Create: `resources/prompts/roles/codegraph-narrative-v2.json`
- Modify: prompt registry / `PromptContractService` (mirror how v1 is registered — search `codegraph-narrative-v1`)

**Output shape (normative):**

```json
{
  "pitch": { "text": "..." },
  "domains": [{ "clusterId": "...", "title": "...", "text": "..." }],
  "processes": [{ "flowId": "...", "title": "...", "text": "..." }],
  "onboarding": [{ "step": 1, "refType": "cluster|node|flow", "refId": "...", "text": "..." }],
  "risk": [{ "refType": "hotspot|cycle", "refId": "...", "text": "..." }],
  "summaries": [{ "clusterId": "...", "title": "...", "text": "..." }]
}
```

Keep `summaries` for backward UI compat (map from `domains` if needed).

- [ ] **Step 1: Add schemas + role** with evidence rule: only supplied ids.

- [ ] **Step 2: Register v2** the same way v1 is wired; leave v1 files in place until Task 4 switches service.

- [ ] **Step 3: Unit or contract test** that schema loads / validates a fixture (follow existing prompt tests if any).

---

### Task 4: CodeGraphNarrativeService → v2 package

**Files:**
- Modify: `app/models/services/CodeGraphNarrativeService.bx`
- Test: `tests/specs/unit/CodeGraphNarrativeServiceSpec.bx`

**Interfaces:**
- `narrate(snapshot)` returns `{ used, pitch, domains, processes, onboarding, risk, summaries, provider, model, ... }`
- `normalize` drops unknown clusterId/flowId/nodeId/refId
- Input builder includes top clusters, flows, hotspots, cycles, roles counts — not raw edge lists
- `cacheKey` includes narrative version `codegraph-narrative-v2` + fingerprint

- [ ] **Step 1: Failing tests** — unknown flowId dropped; pitch retained when present; no gateway when disabled.

- [ ] **Step 2: Switch role/schema ids to v2**; build richer input; normalize all sections.

- [ ] **Step 3: Run** `box testbox run bundles=tests.specs.unit.CodeGraphNarrativeServiceSpec reporter=Min` — pass.

---

### Task 5: UI — meaning banner, legend, narrative-driven strip

**Files:**
- Modify: `app/views/main/codegraph.bxm` (legend + process host if needed)
- Modify: `public/assets/app.js`, `public/assets/app.css`
- Modify: `app/layouts/Main.bxm` cache bust `app.js` / `app.css`

**Behavior:**
- If `!narrative.used`: banner “Meaning layer unavailable — configure an AI provider for domain and process briefing.”
- If used: project strip uses `pitch.text`; domain cards prefer `domains[]` / `summaries` titles; show onboarding list (≤5); process chips from `flows` + `processes` text when matched.
- Role legend always visible when snapshot present.

- [ ] **Step 1: Wire banner + legend + pitch/onboarding** in `renderCodeGraph` / project strip helpers.

- [ ] **Step 2: Manual check** on a run with and without AI key (structure vs meaning).

- [ ] **Step 3: Bump asset query versions.**

---

### Task 6: Process overlay on canvas

**Files:**
- Modify: `public/assets/codegraph-layout.js` (optional `highlightIds` / `flowStepSet` on buildSvg)
- Modify: `public/assets/app.js`
- Test: `tests/js/codegraph-layout.spec.mjs`

**Behavior:**
- Selecting a process chip sets `state.codegraph.activeFlowId` and highlights nodes/edges on that path in Files or Focus view (navigate to Files for entry’s cluster if needed).

- [ ] **Step 1: Failing JS test** — svg marks nodes in highlight set.

- [ ] **Step 2: Implement highlight + chip click handler.**

- [ ] **Step 3: Run** `node --test tests/js/codegraph-layout.spec.mjs` — pass.

---

### Task 7: Docs + capabilities honesty

**Files:**
- Modify: `resources/docs/application-features.md` (CodeGraph row: meaning requires LLM; structure without)
- Modify: `resources/docs/technical-flow.md` (narrative v2 + flows/roles)
- Modify: `resources/docs/README.md` (this plan as live)
- Modify: `app/handlers/ApiCapabilities.bx` if CodeGraph advertises `requiresLlm` — set **true for full meaning** or add `codegraph.meaningRequiresLlm: true` while `requiresLlm` stays accurate to product copy

- [ ] **Step 1: Update feature truth** — no claim of business domains without AI.

- [ ] **Step 2: Align capabilities** with the banner copy.

---

### Task 8: Integration smoke

- [ ] **Step 1:** Run CodeGraph on `C:\Box\DoubleCheck\app` with provider configured — pitch + domains + ≥1 process story visible.
- [ ] **Step 2:** Disable provider / no key — banner shown; graph still drills with edges.
- [ ] **Step 3:** `box testbox run bundles=tests.specs.unit.CodeGraphMetricsServiceSpec,tests.specs.unit.CodeGraphNarrativeServiceSpec,tests.specs.integration.CodeGraphApiSpec reporter=Min`

---

## Spec coverage check

| Design item | Task |
|---|---|
| File roles + legend | 1, 5 |
| Flows | 2, 6 |
| LLM package pitch/domains/processes/onboarding/risk | 3, 4, 5 |
| No-key banner | 5, 7 |
| One graph / no chat/wiki | Out of scope (no tasks) |
| P2 glossary + impact-as-story | Deferred — not in this plan |

## Deferred (not this plan)

- Glossary chips
- Impact-as-story (“if you change X”)
- Editable local vocabulary
- Dual Domain graph / semantic search / chat
