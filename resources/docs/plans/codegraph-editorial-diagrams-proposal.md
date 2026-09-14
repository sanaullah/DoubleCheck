# Editorial diagrams for the CodeGraph section

**Status: proposal — not scheduled, not approved.** This is not the live plan.
The live CodeGraph plan is
[`codegraph-remediation-plan.md`](codegraph-remediation-plan.md), whose Phase 7
absorbs this proposal; the
accepted layout decision is
[`adr-001-codegraph-workspace-layout.md`](adr-001-codegraph-workspace-layout.md).
If this proposal is accepted, fold it into the fidelity design as a section and
delete this file rather than keeping a third plan document alive.

## Context

The question: can the CodeGraph section have diagrams like
[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design).

Two findings shape the answer:

**1. `diagram-design` is a Claude agent skill, not a library.** It ships 27
diagram-type references, HTML templates, a style-guide system and Python
extraction scripts, and is invoked by an agent in natural language. DoubleCheck
cannot call it at runtime — it is local-only with no agent runtime. So "diagrams
like this" has to mean adopting its *design language* and *output shape*
natively. Its rules are the transferable part:

- one accent colour, 1–2 focal elements
- 1px hairlines, no shadows, border-radius ≤ 10
- every coordinate, width and gap divisible by 4
- target density ~4–10 nodes ("the highest-quality move is usually deletion")
- three type roles: serif titles, sans labels, mono for technical strings

**2. The CodeGraph SVG export is not a diagram.**
[`ReportExportService.bx:251`](../../../app/models/services/ReportExportService.bx)
draws a white rectangle and lists node paths as `<text>` lines — no boxes, no
edges, no layout. `format=svg` currently ships a bulleted list wearing SVG
clothing. That is a correctness gap independent of styling, and it is the
cheapest thing here worth fixing.

The live canvas is in reasonable shape after ADR-001 (657 px, 65.7% of viewport,
zero scrolling) but is visually noisy against the reference: nine role hues,
animated dashed edges, radii of 2/6/8/10 mixed, gaps not on a 4 px grid.

## Decisions I made (AskUserQuestion is disabled this session)

These are judgement calls, not requirements. Say the word and I will flip any of
them.

| Decision | Choice | Why |
|---|---|---|
| Role colour vs one accent | **Keep role colour; adopt every non-colour rule** | The reference's one-accent rule is written for 4–10 node editorial diagrams. CodeGraph draws 18–400 nodes where hue carries nine roles — that is information, not decoration. Discarding it to satisfy a stylistic rule would cost more than it buys. |
| Theme | **Canvas stays dark; exports are light paper/ink** | Exports get pasted into PRs, docs and print. The app is dark and consistent with itself. |
| Fonts | **System/local stacks, never Google Fonts in exports** | The reference pulls Instrument Serif + Geist from Google. Local-only is a hard product boundary; an export that phones home on open is not acceptable. Exports use the already-loaded IBM Plex family with system fallbacks. |
| Installing the skill | **Not part of the product change** | Worth installing separately if you want me hand-authoring diagrams for ADRs. It cannot participate at runtime. |

## Approach

Four pieces, in the order I would do them. Each is independently shippable.

### 1 — Editorial pass on the live canvas (the thing you asked about)

Apply the non-colour rules to `public/assets/app.css` and the geometry constants
in `public/assets/codegraph-layout.js`.

- **4 px grid**: `DEFAULTS` currently mixes `gapY: 20`, `detailGapX: 56`,
  `overviewGapY: 32`, `focusHubScale: 1.38`. Round every coordinate, width and
  gap to a multiple of 4; keep the scale factor but snap its output.
- **Hairlines**: node strokes are `1.25`/`2`/`2.75` and edges `2.25`–`3.75`.
  Collapse to `1` for resting state, `2` for selected/highlighted.
- **Radii**: `rx` is 2, 6, 8 and 10 across node types. Pick one (8) except where
  a pill is intentional.
- **Kill the resting edge animation.** `.cg-edge` runs an infinite
  `cg-edge-flow` dash animation on every edge at all times. Reduced-motion
  already disables it (`app.css:3635`); make stillness the default and reserve
  motion for the actively traced flow only. This is the single biggest noise
  reduction on the canvas.
- **Type roles**: node titles keep IBM Plex Sans; file paths and symbol names
  move to IBM Plex Mono (already loaded) so technical strings read as technical.
- **Density**: overview is at 18 cards after ADR-001. Leave it — but drop the
  per-card two-line AI summary at overview level, which is what makes cards
  large and the field busy.

No new files. Touches `app.css` and the `DEFAULTS` block plus stroke/radius
emission in `codegraph-layout.js`.

### 2 — Real diagram export, client-side

The canvas already holds a laid-out graph in `state.codegraph.layoutResult`, and
`codegraph-layout.js` already has an SVG string builder (used for the swimlane
render around line 1431). Reuse both: serialise the current view into a
**self-contained light-theme HTML file** and download it via a Blob.

- New `renderEditorialHtml(layout, meta)` in `codegraph-layout.js` — same node
  and edge geometry, an editorial stylesheet inlined, paper/ink palette, title
  block with project name, run id, node/edge counts and the completeness line.
- Wire to a new `data-codegraph-export="html"` link beside the existing
  Markdown/Mermaid/SVG buttons in `codegraph.bxm`.
- WYSIWYG by construction: it exports what you are looking at, restyled for
  paper. No server round trip, no second layout engine.

### 3 — Sequence diagram of one flow (the highest-value new type)

CodeGraph's headline promise is "how does a request move", and the data to draw
that properly now exists: `flows[]` carries `steps`, `stepSymbols` (83%
attributed), `edgeKinds`, `sinkKind`, `routeId` and `variantCount`. A sequence
diagram is the canonical rendering and its layout is trivial — participants are
columns, hops are rows — so it needs no layout engine.

```
route:/api/v1/quality   ApiQuality      QualityGateService   evaluation_gate_runs
        │                   │                   │                     │
        ├──── routes ──────►│                   │                     │
        │              .index                   │                     │
        │                   ├──── calls ───────►│                     │
        │                   │              .status                    │
        │                   │                   ├─── table-read ─────►│
```

Add `renderFlowSequence(flow)` to `codegraph-layout.js`, surfaced as a fourth
option in the existing layout `<select>` (Cluster / Layer / Swimlane / Hub →
**Sequence**), active when a flow is selected from the Briefing drawer. Reuses
`buildFlowHighlightContext`, which already knows the selected flow.

### 4 — Make `format=svg` honest

Replace the text-list in `toCodeGraphSvg` with a genuine cluster diagram: boxes
for the top clusters, lines for `clusterEdges`, editorial palette, deterministic
grid layout. At editorial density (≤ 12 clusters) a simple grid needs no layout
engine, so this stays a small self-contained BoxLang function.

Also add `format=html` server-side returning the same editorial document, so the
API and the UI agree. **Accepted duplication:** the client renderer reuses the
real layout engine, the server one is a deliberately simpler grid. Document that
in the function docblock rather than pretending they are the same.

## Files

| File | Change |
|---|---|
| `public/assets/app.css` | Editorial tokens: hairlines, single radius, still edges by default, mono for technical strings |
| `public/assets/codegraph-layout.js` | 4 px grid constants; `renderEditorialHtml`; `renderFlowSequence` |
| `public/assets/app.js` | HTML export handler; wire Sequence into the layout select |
| `app/views/main/codegraph.bxm` | HTML export link; Sequence option |
| `app/models/services/ReportExportService.bx` | Real `toCodeGraphSvg`; new `html` format |
| `resources/apidocs/openapi.yaml` | `format` enum gains `html` |
| `tests/js/codegraph-layout.spec.mjs` | Determinism + geometry specs for the two new renderers |
| `tests/specs/integration/ReportExportSpec.bx` | `format=html` 200 + content type; SVG contains `<rect>`/`<line>`, not only `<text>` |

## Verification

1. `box run-script compile` clean; restart and **confirm the listener PID
   changed** (silent restart failures cost hours earlier this session).
2. `node --test tests/js/*.spec.mjs` — new specs assert byte-identical output
   across two runs on the same input (the existing determinism contract) and
   that every emitted coordinate is divisible by 4.
3. Browser at 1600×1000 and 1366×768: canvas still zero-scroll, still ~65% of
   viewport, edges still (no resting animation), role colours intact.
4. Export each format through the UI and `curl /api/v1/runs/:id/export?format=…`;
   open the HTML file **with the network disabled** to prove self-containment.
5. Pick a route-seeded flow, switch to Sequence, confirm participants and hop
   labels match `flows[]` for that id.
6. `box testbox run` full suite green (675/0/0 baseline).

## Out of scope

No Python scripts, no Playwright/PNG export, no Google Fonts, no draw.io or
Mermaid import, no brand-onboarding or style-guide token system, no new runtime
dependency. Those are the skill's authoring features and have no place in a
local-only desktop product.
