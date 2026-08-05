> Committed documentation. Product truth: **[application-features.md](application-features.md)**.

# CFML LLM depth

**Status:** Shipped (LLM specialist path)  
**Product hub:** [application-features.md](application-features.md)  
**Supported languages:** BoxLang, ColdFusion, JavaScript only.

> **For agents:** This file is the CFML-depth note only. Follow the clear path in
> [README.md](README.md). Do not revive SaaS/hosted work or separate
> `superpowers/` spec/plan trees.

---

## Design

### Positioning

CFML-specific depth is **entirely LLM-powered** via specialist
`cfml-conventions` (budgets, tools, evidence validation).

**Not in scope:** new CFML deterministic rules, CFML seeded corpus, multi-corpus
gate, fake “measured deterministic CFML” tier, CFML parser/graph.

Engine baselines (not this feature): generic deterministic checks; BoxLang
graph/architecture when `.bx` is present.

**Story:** configure an AI key → CFML files get LLM in-depth review +
modernization assist.

### Purposes

| Purpose | This feature |
|---|---|
| Local second pair of eyes | With AI key, evidence-gated CFML specialist review |
| Legacy modernization assist | Incremental safer next steps when evidence supports them |
| Build at best level | One path; tested context; honest `discovery-only` measured label |

### API key

| Setup | Review completes? | CFML LLM depth? |
|---|---|---|
| No AI key | Yes | No |
| AI key on | Yes | Yes, when run includes CFML files |

### Architecture

```text
Review run
   ├─ Generic deterministic (baseline)
   ├─ BoxLang graph / architecture (if BoxLang present)
   └─ AI enabled + CFML files?
          └─ cfml-conventions (LLM depth)
```

### Role prompt (equal weight)

1. In-depth defects: injection, `evaluate()`, dynamic includes, secrets, empty
   error sinks, broken contracts — exact authorized file/line.
2. Modernization assist: incremental safer replacements when evidence supports;
   ColdBox/BoxLang only if context shows those stacks; no full-rewrite mandates.

### Planner / context

- Select `cfml-conventions` when any file has `language == "CFML"`.
- Keep `boxlang-conventions` when BoxLang graph has symbols.
- Priority ~85 so the role survives typical `maxTasks` with security/correctness.
- Empty BoxLang graph must still authorize CFML ranges (prove with tests).

### Best-level extras

- Clear UI/docs when no key (depth unavailable, review not broken)
- Default allowlist includes `cfml-conventions`
- Accept overlap with security/correctness; fingerprints dedupe
- Cover `.cfm` and `.cfc`; CI without live LLM
- Future measured CFML = LLM eval corpus later — not hybrid

### Success criteria

1. No key → review completes; no `cfml-conventions` tasks  
2. Key + CFML → role scheduled with real ranges; evidence-validated findings  
3. No new CFML deterministic/corpus/gate code  
4. Docs never describe a hybrid CFML approach  

---

## Implementation

**Goal:** Ship `cfml-conventions` LLM depth for CFML files.  
**Stack:** BoxLang, ColdBox, TestBox, existing specialist stack.

### Constraints

- CFML depth = LLM only  
- No hybrid rules/corpus/multi-gate  
- PowerShell; tests under `tests/`  

### Phases

| Phase | Delivers | Done when |
|---|---|---|
| P1 | Role + prompt | Allowlisted; prompt covers review + modernization |
| P2 | Planner | Selected for CFML; omitted BoxLang-only; survives maxTasks |
| P3 | Context | Ranges with empty BoxLang graph |
| P4 | Docs/capabilities | Point at application-features.md; honest copy |

```text
P1 ──► P2 ──► P3 ──► P4
```

### Files

| File | Change |
|---|---|
| `app/models/services/ReviewPolicyService.bx` | Allowlist |
| `app/models/services/SpecialistAgentFactory.bx` | Role + prompt |
| `app/models/services/ReviewPlannerService.bx` | Select + priority |
| `app/models/services/ContextPackService.bx` | Only if P3 fails |
| `app/handlers/ApiCapabilities.bx` | Optional AI-gated CFML depth wording |
| `tests/specs/integration/CfmlLlmDepthSpec.bx` | New |
| `application-features.md` | Status when shipped |

**Do not touch:** new FindingService CFML rules, QualityGate multi-corpus, `cfml-v1` corpus.

### Task 1 — P1 Role + prompt

- [x] Failing test: policy allowlists `cfml-conventions`; factory definition mentions modernization + evaluate  
- [x] Run: `box testbox run bundles=tests.specs.integration.CfmlLlmDepthSpec`  
- [x] Add allowlist + factory role  
- [x] Re-run PASS  

### Task 2 — P2 Planner

- [x] Failing tests: CFML+empty graph selects role; BoxLang-only omits it; maxTasks 3 still keeps it  
- [x] Pass `files` into `selectRoles`; append when language is CFML; priority 85  
- [x] Re-run PASS  

### Task 3 — P3 Context

- [x] Proof test: empty graph + CFML files → ranges > 0; task context.files non-empty  
- [x] ContextPackService fallback sufficient (no parser change)  

### Task 4 — P4 Docs

- [x] Update application-features.md status; capabilities `specialistCfmlDepth`  
- [x] Related TestBox specs PASS (CfmlLlmDepthSpec + ArchitecturePlanning + ReviewPolicy + ReviewApiSpec)
