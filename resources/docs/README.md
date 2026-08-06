# DoubleCheck documentation

Public technical docs for the local desktop review helper.

**This folder is the single documentation source of truth.** It is committed.
There is no `.docs/` tree and no `.superpowers/` tree — both were removed. Do not
recreate them; one documentation tree, in version control.

## Start here

| Doc | Purpose |
|---|---|
| [application-features.md](application-features.md) | Purpose, shipped features, AI contract, out of scope, **known gaps**, measured language tiers |
| [technical-flow.md](technical-flow.md) | Technical implementation, project flow, Mermaid diagrams |
| [plans/codegraph-domain-lens-design.md](plans/codegraph-domain-lens-design.md) | **Approved design** — CodeGraph meaning / Domain lens (LLM-required briefing) |
| [plans/codegraph-plan.md](plans/codegraph-plan.md) | **Live plan** — Domain lens implementation tasks |
| [plans/modernize-inversion-plan.md](plans/modernize-inversion-plan.md) | Prior Modernize inversion notes (kept for Part 2 evidence); not the active plan |

## Reference — open only when the task needs it

| Doc | Scope |
|---|---|
| [prompt-system.md](prompt-system.md) | Versioned prompt contract system — implemented and live |
| [cfml-llm-depth.md](cfml-llm-depth.md) | ColdFusion LLM depth (`cfml-conventions`) |
| [boxlang-conventions.md](boxlang-conventions.md) | BoxLang/CFML style in this repo |
| [testing-commands.md](testing-commands.md) | `box testbox run`, `node --test tests/js/`, reporters |
| [open-issues.md](open-issues.md) | Reported but not yet planned |
| [images/](images/) | UI screenshots used by the public readme |

Install and product summary: [`readme.md`](../../readme.md).
API contract: [`resources/apidocs/`](../apidocs/).
Agent working rules: [`AGENTS.md`](../../AGENTS.md).

## Hygiene

1. **Product truth changes here first**, in the same PR as the behaviour change.
2. **Every feature row needs visible output** — UI, export, or API response. No
   pointer, no row; it goes in Known gaps instead.
3. **One live plan at a time.** Supersede by deleting, not archiving — a
   superseded document that stays readable will be read.
4. New feature notes go in **one** file here. Never `superpowers/` trees, phased
   rebuild checklists, or dated per-task plan files.
