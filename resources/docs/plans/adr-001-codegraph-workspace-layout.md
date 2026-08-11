# ADR-001: The CodeGraph workspace is a document; it should be an application

**Status:** Accepted — implemented 2026-08-11
**Date:** 2026-08-11
**Deciders:** maintainer
**Feeds:** [`codegraph-graph-fidelity-design.md`](codegraph-graph-fidelity-design.md) (live plan)

## Context

CodeGraph's stated purpose is *"quickly know the project and the flow between
components"* — the map is the product. Measured against a real snapshot on a
1600×1000 desktop viewport, the map is not what the page is for.

| Measurement | Value |
|---|---|
| Scroll needed before the graph is fully visible | **1,442 px** |
| Canvas top offset | y = 1,848 px |
| Canvas height | 594 px, from a hard-coded `height: 36rem` |
| Canvas share of total page height | **16.8%** |
| Total page height | 3,529 px |
| Clusters drawn on the overview | 10 of 31 |

The vertical budget *inside* the explorer panel, above the canvas:

```
source bar          68 px
truncation banner   67 px
role legend         49 px
project strip      904 px   ← risk 398 · onboarding 152 · processes 122 · blurb 69
toolbar             50 px
path finder        168 px
─────────────────────────
                 1,306 px of explanation, then 594 px of graph
```

**The LLM narrative occupies 904 px; the graph occupies 594 px.** Everything
that describes the map is stacked on top of the map, so the optional layer
outranks the deterministic one that works without a key.

A previous change made the explorer panel the first element on the page. That
was necessary and insufficient: it moved the *panel* up, not the *graph*. The
graph is the seventh element inside the panel it leads.

### Forces

- **Desktop-only is a product boundary**, not a limitation to design around.
  AGENTS.md forbids phone layouts and responsive restacking; it does not ask for
  a document-shaped page.
- **The canvas height is absolute** (`36rem`), so a 1440p monitor shows exactly
  the same 594 px of graph as a 900p laptop. Screen real estate the user has
  bought is not used.
- **No graph library** — hand-rolled SVG UMD. Layout maths already exists and
  reads the viewport box it is given, so a taller box needs no new algorithm.
- **Structure must work with no AI key.** Any layout that gives the narrative
  primacy inverts that contract on every keyless install, where those 904 px
  collapse to a banner and the page becomes mostly empty above the fold.

### Correctness and clarity gaps found while measuring

| # | Finding | Evidence |
|---|---|---|
| 1 | Canvas never grows with the viewport | `.codegraph-canvas-host { height: 36rem }` |
| 2 | Inspector renders 200 px tall beside a 594 px canvas despite `align-items: stretch` | measured; grid row not filled |
| 3 | Overview draws 10 of 31 clusters by default, with "Show all modules" as a separate click | measured |
| 4 | Six explanatory strips are always expanded — none is collapsible, and their combined height exceeds the graph on every run | measured |
| 5 | The path finder occupies 168 px permanently even when no path is being traced | measured |

None of these is a rendering bug. Together they are the whole complaint: the
product reads as an article about a graph rather than a tool for using one.

## Decision

**Adopt a fixed-viewport application shell for `/codegraph`.** The graph fills
the workspace; everything else becomes a docked panel the user opens, not a
block the user scrolls past.

Concretely: the explorer becomes `height: calc(100vh - header)`, with a left
navigation rail (search, tree, role filters), the canvas as the centre surface,
a right inspector that fills its column, and the narrative + issues in a
collapsible bottom drawer. The page stops scrolling; the panels scroll.

## Options considered

### Option A — Tune the current stacked page

Shrink the narrative, cap the risk list, make strips collapsible, raise the
canvas to `60vh`.

| Dimension | Assessment |
|---|---|
| Complexity | Low — CSS and a few `hidden` toggles |
| Risk | Low; no layout engine change |
| Effect | Graph moves from y=1,848 to roughly y=700. Still below the fold |
| Durability | Poor — every future panel re-creates the problem |

**Pros:** hours, not days; no regression surface; keeps every element reachable.
**Cons:** treats a structural problem as a spacing problem. The graph remains
something you scroll to. Adding one more strip undoes it.

### Option B — Fixed-viewport application shell (recommended)

`/codegraph` occupies exactly one screen. Rail + canvas + inspector + drawer.

| Dimension | Assessment |
|---|---|
| Complexity | Medium — one grid on the explorer, panels become scroll containers |
| Risk | Medium — pan/zoom, fit-to-bounds and the path highlight all read the canvas box; they must be re-measured on resize |
| Effect | Graph is ~70% of one screen, visible with zero scrolling, and grows with the monitor |
| Durability | Good — new panels dock, they do not push the graph down |

**Pros:** matches what the product is (a desktop tool); uses the whole monitor;
makes "quickly know the project" true on arrival; keyless installs lose a drawer,
not the page's centre of gravity.
**Cons:** the largest change to shipped UI in this plan; needs a resize
observer feeding `fitToBounds`; the issues tabs and path finder lose their
permanent position and become drawer tabs, which is a habit change.

### Option C — Sticky canvas beside a scrolling column

Graph pinned to `position: sticky; height: 100vh`, narrative scrolls beside it.

| Dimension | Assessment |
|---|---|
| Complexity | Low-medium |
| Risk | Low |
| Effect | Graph always visible; narrative reads as a column |
| Durability | Medium |

**Pros:** cheap; keeps a reading flow for the briefing; no drawer concept.
**Cons:** halves the canvas width permanently — the graph is wide-format data
and 1,175 px is already tight for 31 clusters; sticky plus SVG pan/zoom is
fiddly; it optimises for reading the narrative, which is the optional layer.

### Option D — Split routes: `/codegraph` (map) and `/codegraph/briefing`

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Risk | Low |
| Effect | Map gets a whole screen; briefing gets its own page |
| Durability | Good |

**Pros:** each surface gets the space it deserves; clean mental model.
**Cons:** two places to look for one project's answer; the narrative's value is
in being *next to* the thing it describes; adds a route and navigation state for
a problem that is really about hierarchy on one screen.

## Trade-off analysis

The decision turns on one question: **is `/codegraph` a document or a tool?**

Options A and C answer "document, arranged better". Option D answers "two
documents". Option B answers "tool", and that is what the product claims to be —
its user is oriented by looking, panning and drilling, not by reading top to
bottom.

The cost of B is concentrated in one place: three client behaviours
(`fitToBounds`, pan/zoom viewport maths, flow/path highlight centring) currently
assume a canvas box that never changes size. A viewport-driven shell makes that
box dynamic, so they need a resize path. That is a real but bounded risk, and
`tests/js/codegraph-layout.spec.mjs` already asserts deterministic layout output
for a given box — the specs extend rather than rewrite.

Option A is the honest fallback if effort is short: it buys roughly 1,100 px of
the 1,442 px problem for a fraction of the cost, and it does not conflict with B
later. If B is accepted, A's collapsible strips become the drawer's contents, so
the work is not wasted either way.

## Consequences

**Easier**
- The graph is visible on arrival, at full monitor height, without scrolling.
- Adding a future panel costs a drawer tab, not vertical space.
- Keyless installs look deliberate: the drawer says meaning is unavailable, the
  map still owns the screen.

**Harder**
- Anything that assumed a fixed canvas box must re-measure on resize.
- The narrative must be summarised for the drawer's collapsed state; 9 risk
  items and 5 onboarding steps cannot all be a headline.
- Deep-linking needs to restore drawer state, not just drill state.

**To revisit**
- Whether the left rail and the inspector should be independently collapsible
  once the symbol level lands in the canvas (currently panel-only).
- Whether the overview should draw more than 10 clusters when given 3× the
  height — the cap was chosen for a 594 px box.

## Action items

1. [ ] Decide between B (shell) and A (tuning) — B recommended.
2. [ ] If B: replace the explorer's block flow with a `calc(100vh - header)` grid; canvas centre, rail left, inspector right, drawer bottom.
3. [ ] If B: add a `ResizeObserver` on the canvas host that re-runs `fitToBounds` and updates the viewport box; assert determinism for two box sizes in `codegraph-layout.spec.mjs`.
4. [ ] Move narrative (pitch, onboarding, processes, risk) and the issue tabs into the drawer; collapsed by default, remembering the last state per run.
5. [ ] Make the path finder a drawer tab rather than a permanent 168 px strip.
6. [ ] Raise the overview cluster cap once the canvas is viewport-tall; re-measure legibility at 31 clusters before choosing a number.
7. [ ] Fix the inspector not filling its grid row (finding 2).
8. [ ] Re-measure the four numbers in the Context table after the change; the gate is *graph visible with zero scrolling on a 1366×768 laptop*.


---

## Outcome (measured after implementation)

| Measurement | Before | After (1600×1000) | After (1366×768) |
|---|---|---|---|
| Scroll before the graph is fully visible | 1,442 px | **0** | **0** |
| Canvas height | 594 px fixed | **657 px**, viewport-driven | 425 px, viewport-driven |
| Canvas share of viewport | — | **65.7%** | 55.3% |
| Clusters drawn on the overview | 10 of 31 | **18** | 18 |
| Inspector height beside a full-height canvas | 200 px | fills its column | fills its column |

The ADR's gate — *graph visible with zero scrolling on a 1366×768 laptop* — is met.

### What was built

- `.codegraph-shell` is a flex column at `calc(100vh - 7.5rem)`, applied only
  when a snapshot exists so a first-time project still opens on the run form.
- `.cg-shell-body` is a three-column grid: rail (search, role filters, browser),
  stage (toolbar + canvas), inspector. Side columns use `clamp()` so a narrower
  desktop spends less on chrome and more on the graph. Each column scrolls on its
  own; the shell never grows.
- The briefing, issues and path finder moved into a bottom drawer, closed by
  default, capped at `min(34vh, 22rem)`, with the open tab remembered.
- A `ResizeObserver` on the canvas host re-runs `fitToBounds` when the window,
  the drawer or the rail changes the box — debounced, with an 8 px dead zone so
  layout churn cannot loop.

### Two things found while implementing

1. **An `#codegraph-workspace` id rule silently outranked the shell grid**, so
   the first attempt rendered a 280 px canvas beside a 1,175 px rail. Layout now
   lives on the class; the id rule keeps only non-layout properties. Worth
   remembering: id selectors in this stylesheet beat every class rule added
   later.
2. **The canvas had three competing fixed heights** (`36rem`, `min-height:
   32rem`, `min-height: 420px`) across two selectors. All removed; the grid is
   the single source of size.

### Deviation from the plan

Action item 6 said to re-measure legibility before raising the overview cap. The
cap went from 10 to 18 on the reasoning that the canvas grew ~65% in area, and 18
cards were checked as drawn and readable at both tested viewports — but no
formal legibility pass was done, and the right number on a 4K display is still
unknown.
