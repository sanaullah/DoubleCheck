# CodeInsight Application Feature Requirements

**Status:** Planned  
**Sources of visual intent:** [`mockup-new-review.png`](mockup-new-review.png), [`mockup-review-command-center.png`](mockup-review-command-center.png), [`mockup-architecture-explorer.png`](mockup-architecture-explorer.png), [`mockup-findings.png`](mockup-findings.png), [`mockup-review-history.png`](mockup-review-history.png), and [`mockup-settings.png`](mockup-settings.png)  
**Target surfaces:** New Review, Review Command Center, Architecture Explorer, Findings, Review History, and Settings supplied desktop Jinja2 pages, plus the specified Overview, Report, Evidence, Comparison, Preset, Approval, recovery, first-run, and diagnostics/maintenance supporting surfaces  
**Architecture:** FastAPI presentation adapter, shared application service, durable SQLite run ledger, LangGraph worker execution  
**Related requirements:** [`fastapi-html-sqlite-wal-upgrade.md`](fastapi-html-sqlite-wal-upgrade.md), [`fastapi-html-sqlite-wal-development-plan.md`](fastapi-html-sqlite-wal-development-plan.md), and [`security-performance-guidelines.md`](security-performance-guidelines.md)

## 1. Purpose

This document turns all six supplied desktop mockups into implementable product requirements. The complete workflow lets a user configure a bounded read-only review, observe durable execution, resolve explicit workflow decisions, explore the architecture and evidence, triage findings, compare historical runs, and manage safe defaults/integrations. ACE learning remains internal while bounded health, version, provenance, export, rollback, retention, and audit controls are exposed through Settings.

Sections 2–13 describe the New Review page. Sections 14 onward add the remaining supplied screens, supporting application surfaces, and cross-screen contracts. The mockups are visual and interaction targets; the approved FastAPI/Jinja2/SQLite/LangGraph architecture remains authoritative where a mockup contains illustrative legacy services.

This document does not authorize a SPA, write-capable repository tools, mobile layouts, legacy PostgreSQL/Redis/MinIO dependencies, or request-bound analysis execution.

## 2. Core product behavior

The page must:

- make read-only behavior visible before submission;
- validate the repository and requested branch without modifying either;
- make the review goal and boundaries explicit;
- let the user trade speed/cost for depth;
- show which model and specialist capacity will be used;
- let the user choose built-in and custom focus areas;
- enforce file-count and file-size limits;
- preview the planned workflow and estimated scale/cost;
- create a durable queued run through one shared application service;
- return immediately after durable submission; and
- let the user cancel later from the run detail page; and
- durably pause and resume only at explicitly specified local-operator workflow decisions.

## 3. Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| NR-001 | Desktop application shell | Must | Persistent sidebar, product identity, active New Review item, optional local-operator preferences |
| NR-002 | Read-only safety status | Must | Global “Read-only by default” indicator and contextual read-only labels |
| NR-003 | Repository path selection | Must | Typed path entry, local folder browser, normalization, validation |
| NR-004 | Branch selection | Must | Validated local branch list with current/default branch selected |
| NR-005 | Review goal editor | Must | Required bounded goal text with live character count |
| NR-006 | Review depth selection | Must | Quick, Balanced, and Deep mutually exclusive modes |
| NR-007 | Model selection | Must | Select an enabled configured model by stable identifier |
| NR-008 | Specialist capacity | Must | Select bounded specialist count and show provider readiness |
| NR-009 | Built-in focus areas | Must | Multi-select Security, Reliability, Performance, Architecture, and Testing |
| NR-010 | Custom focus areas | Should | Add, validate, select, and remove custom areas |
| NR-011 | Read-only file tools control | Must | Enable/disable read-only content tools without ever enabling writes |
| NR-012 | Analysis limits | Must | Configure maximum eligible files and maximum individual file size |
| NR-013 | Review presets | Should | Apply, manage, and reuse named review configurations |
| NR-014 | Live review plan | Must | Summarize scan, architecture, specialist, and synthesis stages |
| NR-015 | Projected workload and cost | Should | Display bounded file, token, and cost estimates with provenance |
| NR-016 | Durable review submission | Must | Validate, persist queued run/event, notify worker, redirect/return 202 |
| NR-017 | Cancellation promise | Must | Explain that the submitted review can be stopped and support later cancellation |
| NR-018 | Validation and failure states | Must | Inline errors, retained values, safe repository/provider failures |
| NR-019 | Keyboard and accessibility behavior | Must | Complete labeled keyboard workflow with visible focus and status semantics |
| NR-020 | Security and performance instrumentation | Must | Safe logs, bounded work, latency measurements, and regression coverage |

## 4. Detailed feature requirements

### NR-001 — Desktop application shell

The page uses the shared desktop shell visible in the mockup:

- CodeInsight product mark and name;
- sidebar links for Overview, New Review, Architecture, Findings, History, and Settings;
- New Review active state;
- optional cosmetic local-operator display name/avatar at the bottom, without account, organization, membership, role, or authentication semantics;
- fixed desktop navigation while the content area scrolls if necessary.

Only New Review behavior is implemented by this specification. Other navigation destinations are separate page features.

Acceptance:

- the active navigation item is exposed semantically, not through color alone;
- navigation remains usable by keyboard;
- route generation uses `url_for`;
- the shell is shared through `base.html`;
- no mobile navigation or breakpoint is added.

### NR-002 — Read-only safety status

Display a prominent “Read-only by default” status near the page title and a smaller read-only label next to file-tool controls.

Rules:

- repository review tools are read-only in every configuration;
- disabling file tools reduces access; enabling them grants only bounded reads;
- no control on this page can enable file creation, modification, deletion, Git checkout, commit, branch mutation, command execution, or dependency installation;
- read-only policy is enforced in backend tool adapters, not only represented in the UI.

Acceptance:

- the safety label is always visible on the form;
- submitted configuration records whether read-only content tools were enabled;
- a crafted request cannot select a write-capable mode;
- tests prove model/tool output cannot expand filesystem authority.

### NR-003 — Repository path selection

Provide:

- a repository path text field;
- a local folder-picker action;
- normalized display of the selected path;
- validation feedback near the field.

Validation:

- required;
- must resolve to an existing readable directory;
- must be within an allowed project root;
- must pass Windows device, UNC/network-share, traversal, symlink, and reparse-point policy;
- must be a supported repository/project directory;
- must classify Git/worktree state including dirty tracked files, untracked files, ignored/generated files, submodules, symbolic links/reparse points, Git LFS pointers/materialized objects, and detached HEAD where applicable;
- must not be persisted or logged before safe normalization/redaction rules are applied.

The folder picker is a convenience only. Manual entry must remain functional.

Acceptance:

- valid manual and picker selections produce the same canonical result;
- invalid paths retain the entered value and show a safe field error;
- validation performs no repository mutation;
- path validation is reused by HTTP, application service, scanner, and agent tools.

Repository-state policy:

- analysis is read-only and never cleans, stages, checks out, fetches, initializes submodules, or materializes Git LFS content;
- dirty tracked files are allowed only when the run records a dirty snapshot identity and the immutable manifest fingerprints the analyzed bytes;
- eligible untracked, non-ignored files are included by default and labeled untracked in the manifest;
- ignored and recognized generated files are excluded by default, with counts/reasons retained; any future inclusion control must be explicit and bounded;
- submodules are inventoried by path and recorded commit; content is excluded unless the submodule root independently passes configured-root containment and the user explicitly includes it;
- symbolic links and Windows reparse points are resolved and re-authorized before every read; out-of-root or unresolved targets are excluded with a safe reason;
- Git LFS content is analyzed only when materialized locally and within limits; pointer-only content is labeled unavailable rather than fetched;
- a detached HEAD is allowed when the exact commit is recorded and the UI does not fabricate a branch name; and
- moving or deleting a repository after a completed run does not invalidate persisted reports/metadata, but live source actions show moved, stale, or unavailable state until the path is safely re-associated.

### NR-004 — Branch selection

After repository validation, present a branch selector:

- default to the checked-out branch when available;
- list local branches through a bounded read-only Git inspection;
- display branch names but submit a validated stable branch/ref value;
- refresh when the repository path changes.

Rules:

- do not fetch remotes automatically;
- do not checkout or switch branches;
- reject branch names not returned by the validated repository inspection;
- record the selected ref and resolved commit identity in the durable run/snapshot when execution begins;
- surface detached-HEAD state clearly;
- distinguish the selected Git commit from dirty/untracked bytes captured in the immutable analysis manifest.

Acceptance:

- invalid repositories do not trigger branch loading;
- branch-loading failure does not leak raw Git command output;
- a crafted branch value is rejected;
- changing paths invalidates a stale branch selection.
- detached HEAD submits the exact commit identity without implying a branch;
- dirty/untracked/submodule/LFS/symlink classifications remain stable between estimate and submission or force revalidation.

### NR-005 — Review goal editor

Provide a required multiline goal field describing the intended review.

Behavior:

- live character counter;
- current mockup target: maximum 500 characters;
- trim surrounding whitespace while preserving meaningful internal formatting;
- provide a useful default/placeholder without silently submitting placeholder text;
- retain user input after validation failure;
- persist the exact accepted goal as part of the immutable run request.

Security:

- treat the goal as untrusted data;
- never interpolate it into logs, SQL, templates, or provider prompts without the correct boundary handling;
- do not render submitted goal text as trusted HTML.

### NR-006 — Review depth selection

Provide one mutually exclusive option:

| Depth | User promise | Planning effect |
|---|---|---|
| Quick | Surface important issues quickly | Smaller scan/model/tool budgets and fewer/shorter stages |
| Balanced | Recommended general review | Default budgets and representative specialist coverage |
| Deep | Thorough analysis | Higher bounded budgets, more specialists/stages, higher estimated cost |

Depth is a product policy object, not a cosmetic label. Each depth maps to server-owned limits and defaults. Clients may choose a depth but may not submit arbitrary hidden budgets.

Acceptance:

- exactly one depth is selected;
- Balanced is the initial default unless a preset overrides it;
- keyboard arrow/tab interaction is supported;
- server-side mapping is authoritative and tested.

### NR-007 — Model selection

Provide a selector populated from enabled application settings.

Each option supplies:

- stable model configuration ID;
- display name;
- provider availability/readiness;
- supported structured-output/tool capabilities;
- pricing metadata version when cost estimates are available.

Rules:

- do not expose provider credentials or raw endpoints;
- do not accept arbitrary model names/endpoints from the form;
- disable unavailable models with a safe reason;
- selected model must support the capabilities required by the chosen review configuration.

### NR-008 — Specialist capacity

Provide a bounded specialist-count selector and an adjacent readiness indicator.

Behavior:

- show the requested specialist count;
- show whether the required provider/model configuration is ready;
- update the review plan and estimate when the count changes;
- never imply that all specialists run simultaneously if the configured concurrency limit is lower.

Separate:

- requested specialist roles;
- maximum concurrent specialist executions;
- currently healthy/available provider state.

The durable worker and LangGraph control actual fan-out. The browser does not schedule specialists.

### NR-009 — Built-in focus areas

Support multi-select chips for:

- Security;
- Reliability;
- Performance;
- Architecture;
- Testing.

Rules:

- require at least one focus area;
- selected state must be available to screen readers and not rely only on a checkmark/color;
- focus IDs are stable server-owned values;
- selections guide role generation, prompt construction, and report sections;
- they do not suppress critical cross-cutting findings outside the selected areas.

### NR-010 — Custom focus areas

“Add area” opens an inline or modal editor for a custom focus.

Custom focus fields:

- short display name;
- optional bounded instruction/description;
- normalized stable value scoped to the submitted review or saved preset.

Validation:

- bounded length/count;
- duplicate detection against built-ins and other custom areas;
- no HTML or executable content;
- retained and editable before submission.

Whether custom areas can be saved globally is a preset/settings decision; run-local custom areas are the minimum feature.

### NR-011 — Read-only file tools control

The switch controls whether specialists may use bounded read-only content tools.

Enabled:

- list eligible directories/files;
- read eligible text files;
- inspect safe file metadata;
- read bounded line/range excerpts.

Disabled:

- analysis may use supplied metadata/snapshot information only;
- no file-content read tools are exposed to specialists.

This switch never enables writes, shell execution, Git mutation, or access outside the validated root.

### NR-012 — Analysis limits

Provide selectors for:

- maximum eligible files;
- maximum individual file size.

Mockup defaults:

- 2,000 files;
- 25 MB per file.

Requirements:

- values come from server-owned allowlisted options;
- global hard ceilings remain authoritative;
- total eligible bytes, tokens, tool calls, stage time, and concurrency also have server-side limits even if not shown here;
- excluded files do not count as analyzed files but may be counted in scan diagnostics;
- the plan summary updates when visible limits change.

### NR-013 — Review presets

Display recent presets as compact cards with:

- name;
- primary focus icon;
- depth;
- specialist count;
- last-updated date;
- apply action.

Mockup examples:

- Security audit;
- Performance review;
- Architecture health;
- Quick scan.

Behavior:

- applying a preset updates review configuration fields but does not replace the repository path, branch, or goal unless the preset explicitly owns those fields;
- user can modify fields after applying a preset;
- active preset state becomes “modified” when a governed field changes;
- “Manage presets” leads to the settings/preset-management surface;
- horizontal overflow uses an accessible next/previous control, not touch-only scrolling.

Preset persistence must store validated configuration IDs and versions, not provider secrets.

### NR-014 — Live review plan

The right panel summarizes the server-approved workflow:

1. Repository scan;
2. Architecture model;
3. Dynamic specialists;
4. Evidence synthesis.

Each stage shows:

- stage name;
- plain-language purpose;
- relevant selected limits or capacity;
- whether the stage is always included or configuration-dependent.

The plan is a preview of intended work, not live execution progress. After submission, the run detail/command-center page uses durable events for actual progress.

Acceptance:

- plan updates when depth, specialists, focus areas, file tools, or analysis limits change;
- server revalidates and reconstructs the authoritative plan on submission;
- client preview cannot add an unauthorized stage or tool.

### NR-015 — Projected workload and cost

Display:

- projected eligible file count;
- estimate provenance, such as “based on recent scans”;
- estimated token usage;
- estimated monetary cost.

Rules:

- estimates are labeled approximate;
- pricing/model version and estimate timestamp are retained with the calculation;
- estimate failure does not prevent a valid local review unless a configured cost ceiling requires it;
- no expensive full scan or provider call runs on every form change;
- debounce/cancel estimate refreshes and reuse validated recent snapshot metadata when possible;
- final measured usage remains distinct from the estimate.

If no trustworthy estimate exists, show “Not available” rather than a fabricated zero.

### NR-016 — Durable review submission

The “Start code review” action:

1. prevents accidental duplicate clicks;
2. submits the complete form with CSRF and idempotency protection;
3. revalidates every field server-side;
4. reconstructs authoritative depth/tool/limit policy;
5. creates a queued run and initial event in one short transaction;
6. notifies the local worker after commit;
7. returns immediately without scanning or calling a model.

HTML behavior:

- `POST /analyses`;
- success returns `303 See Other` to `/analyses/{run_id}`;
- validation re-renders with field errors and retained safe values.

JSON behavior:

- `POST /api/v1/analyses`;
- success returns `202 Accepted` with `run_id`, status link, events link, and cancellation link;
- HTML and JSON call the same application service.

### NR-017 — Cancellation promise

The mockup states “You can stop anytime.”

Implementation meaning:

- the run detail page exposes cancellation for queued/running runs;
- cancellation is a durable request, not a browser-only flag;
- queued work can transition directly to cancelled;
- running work checks cancellation between bounded stages/work units;
- external provider calls have timeouts so they cannot prevent cancellation indefinitely;
- terminal runs cannot be restarted by a duplicate cancellation request.

### NR-018 — Validation and failure states

Required page states:

- initial;
- validating repository;
- repository valid/invalid;
- loading branches;
- estimate pending/available/unavailable/stale;
- provider/model ready/degraded/unavailable;
- submitting;
- validation error;
- duplicate/idempotent submission;
- safe unexpected failure.

Behavior:

- show field errors adjacent to their inputs;
- retain all safe entered values;
- focus the error summary/first invalid field after submission;
- do not expose stack traces, raw Git/provider output, secrets, source content, or internal paths outside the local user-facing field context;
- submission button reflects pending state but does not become the sole duplicate-protection mechanism.

### NR-019 — Keyboard and accessibility behavior

- Every input has a visible label and programmatic name.
- Help icons have accessible descriptions and work without hover.
- Segmented depth and focus controls expose selected state.
- Status dots include text.
- Character count and estimate updates use appropriate non-disruptive live regions.
- Error summary links to invalid fields.
- Focus order follows the visual form, review panel, presets, and submit action logically.
- Color is not the only indicator for active, ready, error, or selected state.

### NR-020 — Security and performance instrumentation

Record safe operational metrics:

- route/service duration;
- repository validation duration;
- branch-inspection duration;
- estimate duration and source;
- submission transaction duration;
- safe outcome/error category;
- requested depth, bounded specialist count, and limit profile without goal/source content.

Performance targets inherit from `docs/security-performance-guidelines.md`:

- paginated/ordinary form render p95 at or below 200 ms after warmup;
- submission transaction p95 at or below 250 ms;
- no LLM call, full repository scan, or LangGraph execution in the request path;
- estimates are bounded, debounced, cancellable, and independently timed;
- query/service-call counts remain independent of preset/card count and paginated history size.

## 5. Form contract

The presentation boundary should validate a strict Pydantic v2 object equivalent to:

| Field | Type | Required | Constraints |
|---|---|---:|---|
| `repository_path` | string/path input | Yes | Existing allowed directory; normalized server-side |
| `branch` | string | Yes | Member of inspected local refs for repository |
| `goal` | string | Yes | Trimmed, 1–500 characters |
| `depth` | enum | Yes | `quick`, `balanced`, `deep` |
| `model_config_id` | stable ID | Yes | Enabled compatible configuration |
| `specialist_count` | integer | Yes | Server-owned bounded options |
| `focus_area_ids` | list of IDs | Yes | At least one; bounded and deduplicated |
| `custom_focus_areas` | list of objects | No | Bounded count/name/instruction |
| `file_tools_enabled` | boolean | Yes | Read-only tools only |
| `max_files` | integer/profile | Yes | Server-owned option and hard ceiling |
| `max_file_size_bytes` | integer/profile | Yes | Server-owned option and hard ceiling |
| `preset_id` | stable ID | No | Existing visible preset, used for provenance |
| `idempotency_key` | opaque string | Yes on submission | Bounded, unique replay key |

Use `extra="forbid"` for untrusted JSON/form models unless compatibility requires otherwise. Map the validated presentation object into an application command; do not persist the presentation model or use it as the LangGraph state object.

## 6. View-model contract

The Jinja template receives prepared display data:

- navigation items and active route;
- read-only policy status;
- safe form values and field errors;
- depth options with descriptions;
- enabled model options and safe readiness;
- specialist-count options and concurrency explanation;
- built-in/custom focus options;
- analysis-limit options;
- preset cards;
- plan stages;
- estimate values, currency, token count, timestamp, and provenance;
- CSRF and idempotency values;
- submit availability and safe page-level error.

Do not pass SQLAlchemy sessions, lazy ORM objects, provider objects, raw LangGraph state, credentials, or arbitrary exception data to templates.

## 7. Application-service responsibilities

Use shared services for HTML and JSON:

- `PrepareNewReview`: load options, defaults, recent presets, safe readiness, and recent estimate inputs;
- `InspectRepository`: validate root and return safe repository/branch metadata without mutation;
- `EstimateReview`: calculate bounded projections from validated configuration and recent snapshot/pricing data;
- `SubmitAnalysis`: validate policy, enforce idempotency, create queued run/event, and notify worker;
- `ListReviewPresets` and `ApplyReviewPreset`: supply validated reusable configurations.

Routes remain thin. Repository inspection, estimation, submission policy, and persistence do not live in Jinja templates or JavaScript.

## 8. Persistence requirements

The durable run request must retain:

- canonical repository identity/path according to local privacy policy;
- selected branch/ref and eventually resolved commit;
- exact accepted goal;
- depth and its policy version;
- model configuration ID and pricing/capability version;
- requested specialist count and concurrency policy;
- focus areas/custom focus definitions;
- file-tool flag and hard limit profile;
- preset provenance;
- estimate snapshot, timestamp, and assumptions when available;
- idempotency key/request fingerprint;
- queued timestamp and initial event.

Do not store provider secrets, write-capable tool configuration, raw browser objects, or unvalidated form dictionaries.

## 9. Test coverage

### Functional

- initial defaults match the mockup;
- repository manual/picker workflows;
- branch reload and stale-selection invalidation;
- goal counter and server limit;
- depth/model/specialist/focus/limit selection;
- custom focus add/remove/deduplicate;
- preset application and modified state;
- plan/estimate updates;
- successful HTML redirect and JSON 202;
- same-key replay and conflicting replay;
- cancellation link returned for submitted run.

### Security

- path traversal, out-of-root, symlink/reparse, device, and disallowed network paths;
- crafted branch/model/focus/limit values;
- extra and oversized Pydantic fields;
- goal/custom focus escaping;
- CSRF failure;
- write-capable tool mode rejection;
- prompt-injection-shaped repository/goal text cannot expand tools;
- secret, Git error, provider error, and stack-trace redaction;
- repeated/oversized estimate and submission requests remain bounded.

### Performance

- page preparation has bounded service/query count;
- repository inspection is bounded and does not scan file contents;
- estimate refresh is debounced/cancelled and uses bounded metadata;
- submission meets the local p95 budget and performs no external/model call;
- preset rendering does not create N+1 queries;
- normal fixture uses 1,000 historical runs and representative presets;
- marked tests capture form render, repository inspection, estimation, and submission timings.

### Browser

- complete keyboard-only form flow;
- field errors retain values and receive focus;
- active/selected/ready states are perceivable without color;
- apply a preset, modify it, submit, and land on the run detail page;
- ordinary submission works with enhancement JavaScript disabled.

## 10. Visual acceptance

Implementation should closely preserve:

- dark teal sidebar and active New Review item;
- large page title and concise subtitle;
- two-column desktop layout with form left and plan right;
- bordered grouped form surface;
- segmented depth control;
- compact model/specialist row;
- selectable focus chips;
- prominent read-only cues;
- analysis-limit row;
- recent preset cards at the form footer;
- vertical four-stage review plan;
- projected files/cost summary;
- full-width dark teal submit button in the plan panel.

Minor changes are acceptable for accessibility, real data length, validation messages, and shared design tokens. Do not replace the layout with a generic settings form or chat interface.

## 11. Non-goals

- Mobile or narrow-viewport layouts.
- Write-capable repository tools.
- Repository cloning, remote fetch, checkout, branch creation, or commit.
- Running analysis inside the submission request.
- Guaranteeing estimate accuracy.
- Exposing provider secrets/endpoints.
- Allowing arbitrary model IDs, hidden budgets, file limits, or specialist concurrency.
- Implementing Architecture, Findings, History, Settings, or Command Center behavior inside the New Review route/template boundary; those surfaces have separate requirements below.

## 12. Product decisions to resolve before implementation

- Exact allowlisted values for specialist counts, maximum files, and file sizes.
- Enabled model configurations and capability/pricing metadata source.
- Whether custom focus areas are run-local, preset-local, or globally reusable.
- Exact maximum preset count and version-retention limit.
- Estimate refresh trigger and freshness window.
- Which depth policy values are user-visible versus server-internal.

These decisions should be resolved in settings/policy objects, not embedded as unrelated constants across routes, templates, JavaScript, and workflow nodes.

## 13. New Review definition of done

- [ ] The page matches the supplied desktop mockup closely.
- [ ] All Must features in the inventory are implemented.
- [ ] HTML and JSON submission share one application service.
- [ ] Repository and branch inspection are read-only and root-confined.
- [ ] Pydantic v2 strictly validates all untrusted form/JSON objects.
- [ ] LangGraph and specialist execution run only through the durable worker.
- [ ] Submission creates a queued run and initial event atomically.
- [ ] Duplicate submission is idempotent.
- [ ] Plan and estimates are clearly previews and safely bounded.
- [ ] Presets apply predictably without overwriting repository/goal unexpectedly.
- [ ] Error, loading, degraded, and unavailable states are implemented.
- [ ] Keyboard, focus, label, contrast, and status semantics pass review.
- [ ] Functional, security, performance, and desktop-browser tests pass.
- [ ] The implementation meets the security/performance guideline or documents an accepted measured regression.

## 14. Remaining screen inventory

| Prefix | Screen | Primary purpose | Route |
|---|---|---|---|
| CC | Review Command Center | Observe a running/completed durable review | `GET /analyses/{run_id}` |
| AE | Architecture Explorer | Explore system topology, findings, and evidence traces | `GET /architecture/{snapshot_id}` |
| FI | Findings | Search, filter, inspect, validate, and export findings | `GET /analyses/{run_id}/findings` |
| HI | Review History | Compare runs, regressions, coverage, trends, and cost | `GET /history` |
| ST | Settings | Configure safe defaults, models, budgets, retention, integrations, and health | `GET /settings` |

These screens share the same persistent sidebar, repository/run context, visual tokens, status vocabulary, and authoritative SQLite/application services.

## 15. Review Command Center

**Mockup:** [`mockup-review-command-center.png`](mockup-review-command-center.png)  
**Primary route:** `GET /analyses/{run_id}`  
**Live events:** `GET /analyses/{run_id}/events`

### 15.1 Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| CC-001 | Review identity header | Must | Run ID, branch/ref, opened time, optional cosmetic local-operator label, read-only status |
| CC-002 | Report export | Must | Export completed/partial allowed formats without exposing internals |
| CC-003 | Summary metric cards | Must | Files, specialists, findings, cost/tokens |
| CC-004 | Durable stage timeline | Must | Scan, architecture, specialists, synthesis status/duration |
| CC-005 | Specialist progress grid | Must | Per-specialist state, files, progress, ETA |
| CC-006 | Live evidence feed | Must | Ordered bounded evidence updates from durable events |
| CC-007 | Prioritized findings preview | Must | Top findings with filter/sort and link to full Findings page |
| CC-008 | Cancellation and terminal actions | Must | Durable cancel during queued/running/awaiting-approval state and terminal transitions |
| CC-009 | Reconnect and degraded states | Must | Refresh/SSE recovery without losing authoritative progress |
| CC-010 | Live-view performance controls | Must | Bounded events, DOM rows, polling, and serialization |
| CC-011 | Pending workflow decision | Must | Durable read-only approval context and explicit resume/finalize/cancel choices |

### CC-001 — Review identity header

Display:

- stable short run identifier with access to the full ID;
- repository and selected branch/ref;
- created/opened time;
- optional cosmetic local-operator label/avatar when configured, without claiming verified identity;
- read-only badge;
- current terminal/non-terminal status.

Do not expose lease tokens, provider request IDs, raw checkpoint IDs, or internal workflow state.

### CC-002 — Report export

Provide an export menu for available report representations:

- Markdown;
- structured JSON;
- SARIF where supported;
- printable/PDF only when a verified generation path exists.

Rules:

- export uses the persisted report/evidence snapshot;
- incomplete-run exports are labeled partial and include the event/report cutoff;
- filenames are sanitized and include repository/run identity;
- redaction and source-snippet settings apply consistently;
- export generation is bounded and does not rebuild the analysis.

### CC-003 — Summary metric cards

Display:

- files scanned, with additions/deletions only when a trustworthy comparison exists;
- requested/active/completed specialist counts;
- total findings plus critical/high/medium counts;
- estimated cost/tokens while running and actual measured values when finalized.

Every metric shows unavailable/unknown rather than silently displaying zero. Cost distinguishes estimate from actual.

### CC-004 — Durable stage timeline

Stages shown in the mockup:

1. Repository scan;
2. Architecture model;
3. Specialist analysis;
4. Synthesis.

Each stage supports:

- pending;
- queued/blocked;
- running;
- awaiting approval;
- completed;
- failed;
- cancelled;
- skipped when policy allows.

Show start/end/duration from persisted events. A browser refresh reconstructs the timeline from SQLite; it does not depend on an in-memory task.

### CC-005 — Specialist progress grid

Each specialist card includes:

- stable role/display name;
- category/icon;
- assigned/processed file or work-unit count;
- queued/running/completed/failed/cancelled state;
- bounded progress percentage;
- elapsed and estimated remaining time when measurable;
- safe summary of current stage.

Example roles in the mockup include Security, Code Quality, Performance, Data & Persistence, Privacy, Reliability, Testing, and API & Contracts. Actual roles may be dynamically generated, but their persisted display data must remain stable for the run.

Do not fabricate precise ETAs. Show “Estimating” or omit the ETA when insufficient measurements exist.

### CC-006 — Live evidence feed

Display a bounded newest-first feed with:

- repository-relative file path;
- safe bounded excerpt or evidence summary;
- evidence category;
- durable timestamp/sequence;
- specialist/source attribution;
- action to open the evidence detail.

Security:

- source excerpts obey retention/redaction settings;
- HTML is escaped;
- secret scanning/redaction runs before persistence/display;
- evidence never contains provider credentials or full prompt payloads.

Performance:

- use durable event IDs and SSE replay;
- cap initial and incremental batches;
- cap rendered rows and provide “View all evidence”;
- do not stream full files;
- pause/reconnect cleanly when the tab is hidden or connection fails.

### CC-007 — Prioritized findings preview

Show a bounded table of top findings:

- rank;
- severity;
- title;
- primary file/location;
- component;
- confidence;
- validation state;
- review disposition.

Support a small filter/sort control and “View all findings.” The preview and full Findings page use the same query service and ranking policy.

### CC-008 — Cancellation and terminal actions

During queued/running/awaiting-approval state:

- expose a clearly labeled cancel action;
- require confirmation when useful;
- persist cancellation request;
- show cancellation pending until the worker reaches a safe boundary.

After terminal state:

- remove/disable cancellation;
- enable report export, architecture exploration, findings, evidence, and comparison actions as their artifacts become available.

### CC-009 — Reconnect and degraded states

Required states:

- initial loading;
- live connected;
- reconnecting;
- polling fallback;
- worker paused/unavailable;
- awaiting local workflow decision;
- optional provider degraded;
- completed/failed/cancelled terminal state.

SSE is an enhancement over persisted events. Lost connections must not alter run execution or progress truth.

### CC-010 — Command Center tests

Cover:

- reconstruction from persisted events;
- stage transition and duration mapping;
- specialist progress and terminal behavior;
- estimate-to-actual metric transition;
- `Last-Event-ID` replay and duplicate suppression;
- connection loss/polling fallback;
- evidence escaping/redaction/bounds;
- cancellation;
- export availability and partial labeling;
- bounded query count and DOM/event batch size;
- p95 initial render and replay budgets.

### CC-011 — Pending workflow decision

When the run is `awaiting_approval`, replace ordinary progress emphasis with a prominent decision panel that:

- explains the server-defined decision in user-safe language;
- shows bounded scope, evidence IDs, estimate, remaining limits, and available choices;
- links to the canonical approval detail while retaining the originating `run_id`;
- keeps cancellation available;
- confirms the selected action without implying repository mutation; and
- reconstructs the same pending or decided state after refresh/restart.

The full lifecycle, mutation, recovery, security, and test contract is defined in [Section 21.5](#215-durable-workflow-approvals).

## 16. Architecture Explorer

**Mockup:** [`mockup-architecture-explorer.png`](mockup-architecture-explorer.png)  
**Primary route:** `GET /architecture/{snapshot_id}`

### 16.1 Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| AE-001 | Repository/snapshot context | Must | Repository, branch/commit, snapshot time, help |
| AE-002 | Layer controls | Must | Toggle services, data stores, and external APIs |
| AE-003 | View controls | Must | Toggle data flow and system boundaries |
| AE-004 | Architecture summary | Must | Counts, files, lines, and language distribution |
| AE-005 | Interactive system map | Must | Components, boundaries, edges, selections, risk markers |
| AE-006 | Map navigation | Must | Zoom, fit/reset, pan, and interaction lock |
| AE-007 | Finding details panel | Must | Severity, confidence, impact, evidence, consensus |
| AE-008 | Evidence trace | Must | Entry-point-to-sink trace with code/data stages |
| AE-009 | Evidence/export actions | Must | Open source evidence and export a safe finding |
| AE-010 | Large-graph performance | Must | Bounded payload/layout/render behavior |

### AE-001 — Repository and snapshot context

Provide a selector for available repository/branch/snapshot combinations and show the architecture snapshot time. Selection changes the entire explorer context atomically.

Rules:

- use immutable snapshot/commit identity, not only a branch display name;
- stale/missing snapshots show a safe state and link to start a review;
- switching snapshots clears selected nodes/findings/traces that do not exist in the new context.

### AE-002 — Layer controls

Toggle visibility for:

- services/components;
- data stores;
- external APIs/systems.

Layer toggles affect presentation only; they do not delete graph data or recompute architecture. Selected hidden objects are cleared or announced predictably.

### AE-003 — View controls

Support:

- data-flow edges;
- system/domain/trust boundaries.

The edge legend distinguishes synchronous requests from asynchronous/event flows. Boundaries are persisted architecture facts with provenance, not browser-invented groupings.

### AE-004 — Architecture summary

Show:

- service count;
- data-store count;
- external API count;
- eligible/analyzed file count;
- lines of code when measured;
- language distribution.

Counts must use the selected immutable snapshot and state whether generated/excluded files were counted.

### AE-005 — Interactive system map

Render:

- typed nodes for services, workers, data stores, and external systems;
- labeled system boundaries;
- directional edges;
- selected-node state;
- finding/risk markers on affected nodes;
- consistent visual mapping by node/edge type.

Interactions:

- select a node or risk marker;
- keyboard navigate selectable graph items through an accessible companion list/tree;
- open the related finding/evidence;
- highlight connected flow without hiding unrelated context unexpectedly.

Do not require a canvas-only interaction for accessibility. Provide semantic text alternatives for nodes, edges, and selected paths.

### AE-006 — Map navigation

Support:

- zoom in/out;
- fit/reset view;
- pan;
- interaction/layout lock.

Persist view preferences only as local presentation settings, never as architecture facts.

### AE-007 — Finding details panel

Display:

- severity and stable finding ID;
- title;
- confidence;
- validation state and review disposition;
- comparison outcome when a baseline is selected;
- impact explanation;
- evidence locations with bounded line ranges;
- specialist consensus;
- safe actions to open evidence/export;
- close/deselect action.

Selection is deep-linkable by finding ID when practical, enabling Findings-to-Architecture navigation.

### AE-008 — Evidence trace

Display the selected finding’s ordered path from entry point to data sink, such as:

1. HTTP/event entry;
2. service/component;
3. vulnerable code location;
4. data access;
5. sink/store/external system.

Each step includes typed role, label, repository-relative location, and evidence provenance. The full-trace action opens a larger evidence view without fabricating missing links.

### AE-009 — Evidence and export

- “Open evidence” routes to the canonical evidence viewer/source location.
- “Export finding” uses the same persisted finding representation as the Findings page.
- Exports apply redaction/retention settings.
- Source opening remains read-only and root-confined.

### AE-010 — Architecture performance and tests

Performance:

- load a bounded graph payload;
- avoid repeated full architecture serialization for panel-only changes;
- precompute/cache layout only with explicit snapshot/version invalidation;
- use progressive rendering or aggregation for large graphs;
- cap labels/excerpts and avoid DOM nodes for hidden layers when safe;
- preserve a text/list fallback.

Tests:

- snapshot switching;
- layer/view toggles;
- node/edge/boundary rendering;
- selection/deep linking;
- risk markers;
- evidence/consensus/details mapping;
- complete and incomplete evidence traces;
- path redaction/escaping;
- large-graph payload and render budgets;
- keyboard-accessible companion representation.

## 17. Findings Workspace

**Mockup:** [`mockup-findings.png`](mockup-findings.png)  
**Primary route:** `GET /analyses/{run_id}/findings`  
**Cross-run discovery route:** `GET /findings` with an explicit selected context

### 17.1 Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| FI-001 | Repository/run context | Must | Scope findings to repository, branch, snapshot, or run |
| FI-002 | Severity summary | Must | Critical/high/medium/low counts |
| FI-003 | Search, filter, sort | Must | Bounded server-side discovery |
| FI-004 | Validated-only mode | Must | Restrict list to validated findings |
| FI-005 | Findings table | Must | Paginated, selectable, evidence-backed rows |
| FI-006 | Validation and review disposition | Must | Independent evidence-validation and local-review state |
| FI-007 | Specialist consensus | Must | Compact per-row and expanded agreement evidence |
| FI-008 | Finding details panel | Must | Impact, evidence, flow, recommendation, actions |
| FI-009 | Bulk selection/actions | Should | Safe review-disposition/export actions for selected findings |
| FI-010 | Export | Must | Filtered/selected Markdown, JSON, SARIF, or CSV where valid |
| FI-011 | Advanced local triage | Should | Notes, accepted-risk expiry, false-positive classification, relationships, and audited suppressions |

### FI-001 — Context selection

The context selector scopes findings to an immutable run/snapshot while showing repository and branch labels. Changing context resets pagination and details selection.

### FI-002 — Severity summary

Show counts for:

- Critical;
- High;
- Medium;
- Low/informational.

Counts reflect the current repository/run and applicable global filters. Severity cards may act as filters and must expose selected state.

### FI-003 — Search, filter, and sort

Search across bounded indexed fields such as:

- title;
- component;
- repository-relative path;
- finding ID.

Filters may include:

- severity;
- `validation_state`;
- `review_disposition`;
- `comparison_outcome` when comparison context exists;
- focus/specialist category;
- confidence range;
- first-seen range;
- component.

Sort options include priority/rank, severity, confidence, first seen, validation state, review disposition, and comparison outcome. All filter/sort values are allowlisted and executed server-side with bounded page size.

### FI-004 — Validated-only mode

The toggle restricts results and severity counts to findings that passed the validation policy. “Validated” must be a persisted state with provenance, timestamp, and validation source—not inferred only from confidence.

### FI-005 — Findings table

Columns shown:

- selection checkbox;
- row/rank;
- severity;
- finding title;
- component;
- primary file/line;
- confidence;
- validation state;
- review disposition;
- comparison outcome when present;
- first seen;
- specialist consensus.

Requirements:

- stable keyset or bounded pagination;
- sortable columns only where indexed/supported;
- selected row synchronized with details panel;
- long paths/titles truncate visually but preserve accessible full text;
- row actions do not require selecting text in the table.

### FI-006 — Validation and review disposition

Every finding presentation uses three independent state dimensions. `validation_state` and `review_disposition` belong to the run-scoped finding; `comparison_outcome` belongs to a versioned comparison result for a specific current/baseline pair.

| Field | Values | Meaning |
|---|---|---|
| `validation_state` | `pending`, `validated`, `rejected`, `inconclusive` | Evidence/validator conclusion for this finding in this run |
| `review_disposition` | `new`, `acknowledged`, `reviewed`, `dismissed`, `accepted_risk` | Local operator’s triage decision |
| `comparison_outcome` | `new`, `persisting`, `resolved`, `reopened`, `moved` | Deterministic relationship to a selected baseline run |

Rules:

- validation state is produced by the validation policy and records policy/version, source, timestamp, and safe rationale;
- review disposition is an audited local-operator mutation and cannot alter validation evidence;
- comparison outcome is computed and stored for a `(current_run_id, baseline_run_id, comparison_policy_version)` and is not a mutable column on the canonical finding row;
- absence of a baseline means comparison outcome is unavailable, not `new`;
- `rejected` validation is not the same as `dismissed` review disposition;
- `resolved`, `reopened`, and `moved` never appear as validation or review values;
- disposition changes require CSRF/idempotency, record previous/current value, timestamp, `local_operator`, and optional bounded reason;
- allowed disposition transitions are explicit, optimistic-versioned, durable, and audited; and
- no state change deletes the underlying finding or evidence.

### FI-007 — Specialist consensus

Show compact role initials/categories in the table and expanded agreement in the detail panel.

Persist:

- participating specialist role/version;
- agree/disagree/abstain or equivalent result;
- safe rationale summary;
- evidence references;
- consensus policy/version.

Do not expose full hidden prompts or chain-of-thought.

### FI-008 — Finding details panel

Display:

- stable ID, severity, title, confidence, validation state, review disposition, comparison outcome when available, and first-seen time;
- impact;
- evidence locations;
- specialist consensus;
- affected flow;
- recommendation;
- open-evidence action;
- review-disposition action;
- local reviewer notes;
- false-positive classification when dismissed;
- accepted-risk reason and optional expiry;
- duplicate/related finding links; and
- matching audited suppression-rule context.

The panel is deep-linkable and closable. Recommendation text is escaped and evidence-backed. A finding without a complete affected-flow model shows an honest unavailable/partial state.

### FI-009 — Bulk selection and actions

The selected-count region supports bounded selection within the current result set/page.

Possible actions:

- mark reviewed/acknowledged;
- dismiss with reason;
- accept risk with reason and optional bounded expiry;
- export selected.

Do not implement destructive deletion. Bulk mutations are atomic where practical, audit each finding, and report partial conflicts safely.

### FI-010 — Export

Exports honor current scope and clearly identify whether they include:

- selected findings;
- current filtered result;
- entire run.

Formats:

- Markdown report subset;
- JSON;
- SARIF for compatible code findings;
- CSV for tabular review.

Apply escaping, spreadsheet-injection protection for CSV, redaction, pagination-independent selection, and export-size limits.

### FI-011 — Advanced local triage

- Reviewer notes are bounded, escaped, durable, and audited without changing validation state.
- `accepted_risk` requires a reason and may include an expiry date; expiry returns the disposition to `new` through an audited maintenance event and never marks the finding resolved.
- Dismissal may classify a finding as false positive, not applicable, duplicate, or another allowlisted reason.
- Duplicate and related links use stable finding IDs, prevent self-links/cycles where relevant, and retain relationship type/provenance.
- Suppression rules are explicit, versioned, scoped to allowlisted fields such as rule/category and repository-relative path pattern, preview their affected findings, and require confirmation.
- Suppression changes affect presentation/future policy application but never delete historical findings or rewrite prior reports.
- Model output may suggest triage metadata but cannot mutate notes, disposition, relationships, or suppression rules.

### Findings tests

Cover:

- severity counts with filters;
- bounded search/filter/sort and allowlist rejection;
- validated-only behavior;
- independent validation/disposition/comparison filtering with no cross-field coercion;
- pagination stability;
- table/detail synchronization and deep links;
- review-disposition transition/audit conflicts;
- accepted-risk expiry, false-positive classification, notes, relationships, and suppression preview/audit;
- consensus mapping without hidden prompt exposure;
- affected-flow partial states;
- bulk action conflict/rollback behavior;
- CSV formula-injection prevention and safe exports;
- no N+1 queries at the normal/large fixture sizes.

## 18. Review History

**Mockup:** [`mockup-review-history.png`](mockup-review-history.png)  
**Primary route:** `GET /history`

### 18.1 Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| HI-001 | History scope filters | Must | Repository/branch, date range, search |
| HI-002 | Historical KPI cards | Must | Reviews, resolved, regressions, average cost |
| HI-003 | Review table | Must | Date, goal, commit, specialists, duration, cost, severity, status |
| HI-004 | Pagination and run selection | Must | Stable bounded history navigation |
| HI-005 | Run comparison | Must | New, persisting, resolved, reopened, and moved findings |
| HI-006 | Severity movement | Must | Previous/current counts and deltas |
| HI-007 | Specialist coverage comparison | Must | Previous/current coverage by category |
| HI-008 | Finding trend chart | Must | Severity trends over time and grouping |
| HI-009 | Report/evidence comparison actions | Must | Open report and compare evidence |
| HI-010 | Comparison provenance | Must | Deterministic baseline and finding identity rules |
| HI-011 | Comparability assessment | Must | Warn and qualify results when material run inputs differ |

### HI-001 — Scope filters

Provide:

- repository/branch selector;
- bounded date-range selector;
- search across goal/commit/run identity;
- New Review action.

Filters apply consistently to KPI cards, table, and trend chart unless explicitly labeled otherwise.

### HI-002 — KPI cards

Display:

- review count;
- findings resolved;
- new regressions;
- average cost per review.

Where shown, period-over-period deltas must use an explicit comparison window and consistent denominator. Unknown/incomplete cost data is excluded transparently rather than treated as zero.

### HI-003 — Review table

Columns:

- review date/time;
- review goal;
- commit;
- specialist count;
- duration;
- cost;
- severity counts;
- status;
- detail action.

Requirements:

- stable pagination;
- server-side sort/filter;
- terminal and non-terminal statuses;
- commit links/actions only when a configured safe Git integration exists;
- full goal available accessibly when truncated.

### HI-004 — Run selection

Selecting a run:

- highlights the row;
- loads comparison details without rebuilding either report;
- preserves filters/pagination in the URL where practical;
- defaults the baseline to the previous comparable completed run;
- lets future implementation choose another valid baseline.

### HI-005 — Run comparison

Show:

- files changed;
- resolved findings;
- new findings;
- persisting findings;
- reopened findings;
- moved findings.

Finding comparison must use deterministic normalized identity, including rule/category, component/location, evidence fingerprint, and policy version where applicable. Title similarity alone is insufficient.

Before displaying deltas or trends as comparable, compute and persist a comparability assessment for:

- repository identity and baseline/current commit relationship;
- dirty/untracked snapshot state and exclusions;
- model/provider configuration;
- prompt, validation, comparison, scanner, and severity-policy versions;
- review depth, focus areas, specialist categories, and analysis limits; and
- excluded/generated/ignored/submodule/LFS policies.

Material differences produce a prominent warning and per-dimension explanation. The workspace may still show factual side-by-side values, but it must not label them a regression/improvement or aggregate them into a continuous trend without an explicit qualified state.

### HI-006 — Severity movement

Compare previous/current counts and deltas for critical, high, medium, and low/informational findings. Make direction and meaning explicit; an increase in critical findings is negative even if rendered as a positive numeric delta.

### HI-007 — Specialist coverage comparison

For each specialist/focus category, show previous/current coverage and change.

Coverage must have a defined denominator, such as eligible files/work units, and remain comparable across policy versions. Missing prior categories display unavailable rather than zero.

### HI-008 — Finding trend chart

Provide a server-prepared bounded time series for critical/high/medium counts, with:

- legend;
- dates;
- grouping interval such as day/week/month;
- empty/gap semantics;
- accessible tabular alternative;
- optional expanded/menu actions.

Do not ship a large raw run/finding dataset to the browser for client-side aggregation. Trend series carry comparability segments/gaps; incompatible policy/model/scope changes are not silently connected as one homogeneous series.

### HI-009 — Report and evidence comparison

- “Open report” opens the selected persisted report.
- “Compare evidence” shows normalized previous/current evidence for new, persisting, resolved, reopened, and moved findings.
- Comparison views retain source snapshot identity and line ranges.
- Missing/changed files produce explicit historical states.

### HI-010 — History performance and tests

Performance:

- KPI, table, chart, and comparison queries are independently bounded;
- avoid N+1 report/finding loads;
- aggregate counts in SQL/repository queries;
- do not load report bodies for the history table;
- comparison uses persisted fingerprints/indexes;
- chart points are capped by date range/grouping.

Tests:

- filter consistency across cards/table/chart;
- period-over-period calculations;
- pagination and sort stability;
- cost handling with missing/incomplete runs;
- deterministic matched/resolved/new/reopened classification;
- deterministic persisting/moved classification and baseline identity;
- comparability warnings for every material model/prompt/scanner/focus/depth/exclusion/commit/severity-policy difference;
- trend gaps/qualification across incompatible runs;
- severity and specialist deltas;
- chart grouping/gaps/table alternative;
- non-terminal/failed/cancelled history rows;
- normal and large dataset query plans/latency.

## 19. Settings

**Mockup:** [`mockup-settings.png`](mockup-settings.png)  
**Primary routes:** `GET /settings` and `POST /settings`

### 19.1 Architecture translation

The mockup’s System Health list contains PostgreSQL, Redis, and MinIO. Those are legacy/illustrative labels and must not be introduced into the fresh rebuild.

The actual required health rows are:

- FastAPI/application process;
- SQLite and Alembic revision;
- durable analysis worker;
- local filesystem/project-root readiness.

Optional rows may include:

- configured LLM providers/models;
- Langfuse;
- Git provider integration;
- future explicitly approved integrations.

The “Allow write tools” control is not implemented as an active capability in this read-only rebuild. Display it as disabled/unavailable if retained for fidelity. Future write support requires a separately approved architecture, threat model, and per-run authorization design.

### 19.2 Feature inventory

| ID | Feature | Priority | Planned result |
|---|---|---:|---|
| ST-001 | Settings navigation | Must | General, Models & Providers, Integrations, Budgets, Data & Retention, Local Data & Maintenance, Learning & Diagnostics, Diagnostics & About, Notifications, Local Operator |
| ST-002 | Analysis defaults | Must | Default depth, specialists, focused selection, read-only tools |
| ST-003 | Write-tools safeguard | Must | Disabled/deferred; no write capability in current release |
| ST-004 | Model routing | Must | Orchestrator, specialist, fallback configurations and health |
| ST-005 | Connection testing | Must | Explicit bounded provider test with safe result |
| ST-006 | Budget guardrails | Must | Max cost, token limit, warning threshold |
| ST-007 | Evidence and retention | Must | Retention, secret redaction, source-snippet policy |
| ST-008 | System health summary | Must | Required local and optional integration status |
| ST-009 | Unsaved-change workflow | Must | Dirty state, discard, validated atomic save |
| ST-010 | Models and providers | Must | Provider/model configuration without exposing secrets |
| ST-011 | Integrations | Should | Optional Langfuse/Git integrations with isolation |
| ST-012 | Local operator preferences | Should | Cosmetic local display name/avatar only; no identity or authorization semantics |
| ST-013 | Learning and diagnostics | Must | Bounded ACE health, version, provenance, export, rollback, retention, and audit controls |
| ST-014 | Local data and maintenance | Must | WAL-safe backup, restore, integrity, cleanup preview, and destructive reset |
| ST-015 | Diagnostics and About | Must | Build/runtime/database/worker/recovery details and redacted support bundle |
| ST-016 | Local notifications | Should | Optional in-app/desktop run notifications without email or accounts |

### ST-001 — Settings navigation

Use a secondary settings navigation with:

- General;
- Models & providers;
- Integrations;
- Budgets;
- Data & retention;
- Local data & maintenance;
- Learning & diagnostics;
- Diagnostics & About;
- Notifications;
- Local operator.

The active section is URL-addressable and keyboard accessible. Shared save/discard behavior applies only to changed fields in the current edit session.

### ST-002 — Analysis defaults

Configure defaults for:

- review depth;
- specialist count;
- focused file selection;
- read-only file tools.

Defaults prefill New Review but do not override an applied preset or explicit run choice. Server hard ceilings remain authoritative.

### ST-003 — Write-tools safeguard

Current release:

- control is disabled and off;
- explanatory text states write tools are unavailable in the read-only rebuild;
- crafted requests cannot enable a hidden write mode;
- no write-tool configuration is persisted.

A future version may replace the disabled control only after explicit product authorization and a separate security design. The mockup phrase “requires explicit approval per run” is a future write-tool constraint, not current write authorization and not the read-only workflow approval defined in Section 21.5.

### ST-004 — Model routing

Configure stable IDs for:

- orchestration/model-selection tasks;
- specialist execution;
- fallback.

Each selection shows safe health/capability state. Validate that selected configurations satisfy structured-output/tool/context requirements. Do not store raw provider SDK objects in settings.

### ST-005 — Connection testing

“Test connection”:

- runs only on explicit user action;
- uses a short bounded non-analysis request;
- has connect/read/overall timeouts;
- cannot expose credentials, endpoint internals, or raw provider bodies;
- records only safe status/latency/category;
- does not change required local readiness.

### ST-006 — Budget guardrails

Configure:

- maximum estimated/actual cost per review;
- token limit per review;
- warning threshold percentage.

Rules:

- strict numeric bounds and currency/precision semantics;
- warning threshold below/equal to hard ceiling;
- estimate crossing warning produces a confirmation/warning;
- hard ceiling prevents new provider work at safe workflow boundaries;
- local durable finalization/reporting can continue after the provider budget is reached;
- budget policy/version is recorded with each run.

### ST-007 — Evidence and retention

Configure:

- report retention duration;
- secret redaction in reports/evidence;
- source-snippet storage.

Defaults:

- secret redaction enabled;
- source-snippet storage disabled unless explicitly chosen;
- retention bounded to server allowlisted values.

Retention cleanup:

- is durable/audited;
- does not run inside a settings request;
- respects active runs/backups;
- distinguishes deleting retained excerpts from deleting finding/report metadata;
- never weakens redaction retroactively.

### ST-008 — System health

Display required and optional components separately with:

- healthy/degraded/unavailable/disabled state;
- last checked time;
- safe detail action;
- no secret/config value exposure.

Required local failures affect readiness. Optional provider/Langfuse failures do not make SQLite-backed history unavailable.

### ST-009 — Unsaved changes

The sticky footer displays:

- unsaved-change state;
- Discard;
- Save settings.

Behavior:

- dirty state appears only after a real change;
- navigation away warns when changes would be lost;
- Discard restores the last persisted version;
- Save strictly validates all fields and performs one short atomic settings write;
- optimistic versioning detects conflicting edits;
- success clears dirty state and shows confirmation;
- errors retain safe entered values.

### ST-010 — Models and providers

The dedicated section supports:

- provider display name/type;
- enabled state;
- endpoint profile chosen from trusted configuration;
- secret reference/presence state, never plaintext readback;
- available model configurations;
- capability and pricing metadata;
- default routing eligibility;
- safe connection test.

Credentials belong in the secure settings/environment boundary. Do not render or log them.

### ST-011 — Integrations

Optional integrations include Langfuse and Git providers when approved.

Requirements:

- disabled by default unless configured;
- independent health;
- explicit data-sharing/redaction controls;
- bounded timeouts/retries;
- failures never corrupt local run state;
- no source/prompt export without explicit safe configuration.

### ST-012 — Local operator preferences

The application may store an optional cosmetic display name and local avatar choice for labels such as “Started by” or audit source. These preferences:

- are local presentation settings, not an account;
- do not create login, logout, password, session, organization, team, role, membership, invitation, tenant, or authorization concepts;
- never prove who performed an action; durable mutations use the source label `local_operator`; and
- may be cleared without affecting runs, reports, findings, approvals, or audit history.

### ST-013 — Learning and diagnostics

ACE learning remains an internal, versioned subsystem in the initial release. Do not add a primary-navigation Skillbook workspace or allow direct editing of individual experiences or learned skills.

The Settings surface exposes bounded operational visibility and control:

- learning enabled/paused state;
- learning-policy, payload-schema, and active skill-bundle versions;
- counts of retained prompt artifacts, experiences, active/disabled skills, and skill-usage records;
- last successful learning update and safe degraded/failure state;
- run/version provenance for the active bundle without source bodies or hidden reasoning;
- redacted, bounded export;
- rollback to a previously validated compatible bundle;
- allowlisted retention and cleanup controls; and
- an audit history for learning updates, pauses, rollbacks, exports, and deletion.

Rules:

- prompts, experiences, skills, and usage records use stable IDs, explicit versions, provenance, and uniqueness rules;
- learning updates are validated and promoted as an atomic versioned bundle so rollback has deterministic meaning;
- learning failure does not fail an otherwise valid analysis or block durable report completion;
- pause prevents creation/promotion of new learning records but does not make existing reports or historical provenance unavailable;
- rollback never rewrites historical run provenance and cannot select an incompatible or unvalidated bundle;
- cleanup runs outside the settings request, respects active runs/backups, and reports partial failure safely;
- exports and diagnostics exclude source bodies, hidden model reasoning, provider payloads, credentials, and unredacted prompts;
- learned content cannot grant tools, expand project roots, enable writes, change budgets/settings, change finding validation/disposition, or bypass validation/redaction policy; and
- ACE/Langfuse health remains optional and cannot determine required local readiness.

### ST-014 — Local data and maintenance

Display:

- resolved local database path;
- database file size plus WAL/shared-memory size when present;
- current Alembic/schema revision;
- verified journal mode and required pragma status;
- last successful backup time, destination, size, and verification result;
- last integrity-check result; and
- pending/last retention-cleanup summary.

Maintenance actions:

- **Backup now** uses the SQLite backup API or a documented quiesced method that produces one consistent recoverable artifact without copying only the main file while WAL changes are pending.
- Backup runs as bounded durable maintenance work outside the settings request, reports progress/failure safely, and never blocks reads longer than necessary.
- Backup verification opens the produced copy read-only, checks the expected schema metadata, and runs an allowlisted integrity check before marking success.
- **Restore** stages a size-bounded file under an opaque restore ID, then validates file type, readable SQLite header, integrity, supported schema revision, application identity/manifest, and available disk space without replacing the active database.
- Restore confirmation accepts only a still-valid unexpired restore ID, presents an explicit summary and strong confirmation, refuses while analyses/maintenance jobs are active, creates a verified pre-restore backup, quiesces the worker/database, atomically swaps only after validation, and restarts/verifies readiness.
- Restore failure preserves or reinstates the prior database, records a durable recovery result outside the replaced database where necessary, and presents the safe next action.
- Rejected, expired, or completed staged restore artifacts are removed by bounded cleanup and are never interpreted as executable content.
- **Integrity check** runs `PRAGMA quick_check` by default; a full `integrity_check` is an explicit bounded maintenance operation.
- **Retention cleanup preview** reports record/artifact counts, date ranges, protected active records, and estimated reclaimed space before scheduling deletion.
- **Recreate/reset database** is unavailable while work is active, names exactly what will be removed, recommends/links a verified backup, requires typed destructive confirmation, recreates through the canonical Alembic baseline, and never deletes repositories, external backups, configuration secrets, or unrelated files.
- Maintenance actions are mutually serialized, idempotent where retried, audited, and never hold a transaction across filesystem copy, integrity scanning, or user confirmation.

### ST-015 — Diagnostics and About

Display a bounded local diagnostics page with:

- application semantic version and build/commit identifier;
- Python/runtime, OS, and relevant package/runtime versions;
- database path, schema revision, WAL/pragma status, and size summary;
- worker state, queue/lease summary, and last heartbeat;
- last startup recovery and last maintenance action;
- configured project roots, report/export directory, and other local storage paths in local-only presentation;
- required versus optional integration health; and
- timestamp of the diagnostic snapshot.

Provide a redacted support-bundle export containing allowlisted configuration shape, version/health summaries, recent bounded diagnostic events, and checksums. It excludes credentials, cookies, provider bodies, prompts, source/evidence bodies, full repository paths unless explicitly selected, hidden reasoning, database contents, and lease/checkpoint secrets.

### ST-016 — Local notifications

Optional notifications support:

- in-application toast/banner notification; and
- desktop notification only after explicit OS/browser permission.

Allow independently configuring completed, failed, cancelled, budget-warning, provider-unavailable, and approval-needed events. Notifications use durable event IDs for deduplication, contain safe repository/run labels only, deep-link to the local application, and never include source excerpts or secrets. No email, SMS, push account, cloud notification service, or authenticated recipient model is added.

### Settings tests

Cover:

- strict Pydantic settings/form validation;
- defaults flowing to New Review;
- hard ceiling versus user default;
- crafted write-tools enablement rejection;
- model capability/routing conflicts;
- secret non-readback and log redaction;
- bounded connection tests/timeouts;
- budget threshold/ceiling behavior;
- retention and source-snippet policy;
- required versus optional health;
- dirty/discard/save/conflict behavior;
- atomic settings persistence;
- deterministic learning version selection and bundle promotion;
- pause, compatible rollback, conflict, retention, and audit behavior;
- retry/idempotency without duplicate experience or skill-usage records;
- bounded redacted export and prohibited-content absence;
- learning/Langfuse failure isolation from report completion and local readiness;
- crafted learned content cannot expand tool, path, write, budget, settings, validation, or review-disposition authority;
- cosmetic local-operator preferences never become authenticated identity or authorization;
- WAL-safe backup consistency/verification with concurrent readers and pending WAL content;
- invalid, corrupt, foreign, unsupported-revision, insufficient-space, active-run, and interrupted restore handling;
- pre-restore backup, failed atomic swap recovery, and restart readiness;
- quick/full integrity checks, cleanup preview, and destructive reset confirmation/scope;
- diagnostics/support-bundle redaction and bounded size;
- notification permission, event selection, deduplication, safe content, and disabled behavior;
- no legacy PostgreSQL/Redis/MinIO dependency.

## 20. Additional application surfaces

These surfaces are part of the implementable application even where no dedicated supplied mockup exists. They reuse the shared desktop shell and visual system rather than introducing a SPA or mobile layout.

### 20.1 Surface inventory

| Prefix | Surface | Canonical route | Primary purpose |
|---|---|---|---|
| OV | Overview dashboard | `GET /` | Orient the local operator and surface active/recent work, readiness, warnings, and next actions |
| RP | Final report reader | `GET /analyses/{run_id}/report` | Read the persisted partial/final report in the browser |
| EV | Evidence/source viewer | `GET /analyses/{run_id}/evidence/{evidence_id}` | Inspect snapshot-bound evidence and safe source context |
| CP | Run comparison workspace | `GET /history/compare?current={run_id}&baseline={run_id}` | Compare two persisted runs, findings, evidence, scope, and policy provenance |
| PM | Preset manager | `GET /settings/presets` | Create, version, default, duplicate, rename, and delete review presets |
| RC | Failed-run recovery | Run/History actions | Recover interrupted work or create a provenance-linked retry |
| FR | First-run experience | `GET /` and `GET /settings` | Establish local readiness and guide the first review without login |

### 20.2 Overview dashboard

The Overview dashboard is the application landing page and uses bounded server-prepared summaries.

Display:

- active/awaiting-approval runs with status, stage, safe progress, and direct Command Center actions;
- recent completed, failed, cancelled, and recovered runs with bounded pagination or “View history”;
- severity summary for the latest selected completed run, clearly scoped and linked to Findings;
- last safely selected repository/ref and a New Review action that may prefill the repository only after revalidation;
- required local readiness for SQLite, schema, worker, and project roots;
- optional model/provider/Langfuse readiness without treating optional failures as local-app failure;
- pending approval count;
- startup/recovery, database-maintenance, retention, moved-repository, or stale-evidence warnings requiring attention; and
- first-run empty state when no analyses exist.

Rules:

- no account, organization, team, tenant, subscription, or login widgets;
- summary counts identify their run/time scope and use unavailable rather than fabricated zero;
- the dashboard never loads full reports, evidence bodies, or unbounded event histories;
- active status comes from durable SQLite state, not browser memory;
- optional local-operator display preferences remain cosmetic; and
- fragment refresh/SSE enhancement may update active cards, but a normal refresh reconstructs the same state.

Tests cover empty/first-run, active/completed/failed/recovered/awaiting-approval states, optional-health degradation, moved-repository warnings, bounded queries/rows, safe labels, no N+1 queries, and a usable non-JavaScript baseline.

### 20.3 Final report reader

The report reader displays the persisted report artifact; it does not rebuild analysis or parse an export on every request.

Required sections:

- report title, repository/ref/commit and immutable snapshot identity;
- run ID, goal, depth, focus areas, model/specialist/policy versions, and analysis time range;
- `partial` or `final` status with cutoff/reason for partial reports;
- executive summary;
- review scope, analyzed/excluded file counts, dirty/untracked/submodule/LFS state, and explicit exclusions;
- architecture summary;
- findings grouped/ranked with severity, validation state, review disposition, confidence, and evidence links;
- limitations, unavailable evidence, provider/tool failures, and comparability cautions;
- actual tokens/cost/duration alongside retained estimates and provenance;
- report schema/template version and creation timestamp; and
- safe print and export actions.

Behavior and safety:

- only the report belonging to `{run_id}` may be loaded;
- persisted Markdown/structured sections are rendered through a safe allowlisted pipeline with Jinja autoescaping and no untrusted raw HTML;
- finding/evidence links carry stable IDs and return to the same report/run context;
- source excerpts follow the retention/redaction policy;
- a queued/running run shows report-not-ready state; an allowed partial report is labeled and never presented as final;
- a missing/corrupt artifact shows safe failure and recovery/export availability without falling back to a new model call;
- print CSS preserves headings, severity text, evidence references, limitations, and snapshot identity; and
- exports use the same persisted report version and record export metadata.

Tests cover not-ready/partial/final/missing/corrupt states, scope/limitation visibility, state-field separation, safe Markdown/HTML rendering, deep links, print structure, export version parity, redaction, bounded response size, and no analysis/provider calls.

### 20.4 Evidence/source viewer

The Evidence Viewer is a read-only, snapshot-bound inspection surface. Its route accepts stable run/evidence IDs, never a user-controlled absolute path or arbitrary template/file name.

Display:

- evidence ID, finding IDs, source/specialist attribution, and evidence category;
- repository-relative path, language/syntax mode, exact snapshot/commit identity, dirty-manifest identity where applicable, and line range;
- bounded context before/after the cited range with highlighted evidence lines and accessible line anchors;
- redaction, truncation, generated/ignored/submodule/LFS, or retention notices;
- previous/current evidence when opened from a comparison; and
- links back to the originating finding, report, Architecture trace, or comparison.

Source resolution:

- use retained redacted excerpts when policy permits and identify them as persisted snapshot evidence;
- any live-file fallback re-resolves the configured project root, repository association, symlink/reparse containment, manifest fingerprint, file size, and line bounds before reading;
- if bytes differ from the recorded manifest, show `stale` and do not imply the live content is the analyzed evidence;
- missing, moved, deleted, excluded, unmaterialized LFS, inaccessible submodule, redacted, and retention-expired evidence have distinct honest states;
- re-associating a moved repository requires explicit root-confined validation and matching repository/snapshot evidence; and
- never fetch Git/LFS/remotes, initialize submodules, execute source, or render source as HTML.

Security and performance:

- evidence context, line count, byte count, file size, syntax work, comparison pairs, and pagination are bounded server-side;
- content type is fixed safe text/HTML presentation, downloads use safe filenames, and CSP/Jinja escaping remain active;
- secrets are redacted before persistence/display and redaction notices do not reveal the secret;
- repeated evidence navigation uses indexed metadata and bounded reads rather than rescanning the repository.

Tests cover exact highlighting, encoding/binary handling, out-of-root/symlink/reparse rejection, crafted IDs/ranges, stale/moved/missing/redacted/expired/LFS/submodule states, prior/current comparison, XSS-safe rendering, secret redaction, and response/read/DOM bounds.

### 20.5 Run comparison workspace

The comparison workspace requires two distinct valid persisted run IDs. The current and baseline roles remain explicit in the URL, heading, metrics, evidence, and exports.

Display:

- repository/snapshot/commit, dirty state, goal, depth, focus, model, prompt, scanner, validation, comparison, and severity-policy provenance for both runs;
- a comparability assessment with material differences and qualified/unavailable conclusions;
- files added/removed/changed when a trustworthy snapshot comparison exists;
- finding outcomes using only `new`, `persisting`, `resolved`, `reopened`, and `moved`;
- severity movement, specialist coverage, exclusions/limitations, actual usage/cost, and duration;
- side-by-side matched finding details and normalized previous/current evidence; and
- links to each report, finding, evidence item, Architecture snapshot, and originating History state.

Rules:

- baseline/current IDs are allowlisted opaque IDs and cannot be the same;
- comparison uses persisted normalized identities/fingerprints and a versioned comparison policy, not title similarity or repeated report parsing;
- incompatible repositories are rejected unless an explicitly supported cross-repository mode is later specified;
- material configuration/policy/snapshot differences remain visible and prevent unqualified regression/improvement claims;
- missing evidence/files show historical states instead of silently disappearing;
- comparison is read-only; review dispositions remain mutations on their canonical finding route; and
- filter/sort/page/selected finding state is reconstructable from bounded URL state.

Tests cover invalid/same/incompatible IDs, deterministic all-five outcomes, moved locations, ambiguous matches, material comparability warnings, policy-version changes, missing evidence, pagination/deep-link refresh, export provenance, indexed query plans, and bounded payload/DOM size.

### 20.6 Preset manager

Presets are versioned reusable review configurations, not accounts or shared team objects.

Support:

- create from validated fields or the current New Review configuration;
- rename;
- duplicate;
- edit by creating a new version;
- choose/clear one default preset;
- delete with confirmation;
- show created/updated/last-used time and recent usage count; and
- inspect fields governed by the preset and its version history.

Rules:

- repository path, branch/ref, and review goal are excluded by default and cannot be silently overwritten;
- any future preset that owns one of those fields labels ownership explicitly at save and apply time and still revalidates it;
- applying a preset copies validated configuration values into the form; later edits mark it modified and do not mutate the stored preset;
- deletion never changes historical run provenance and clears default atomically if necessary;
- duplicate names follow a documented normalized uniqueness policy;
- preset count, name, custom areas, and version history are bounded;
- provider secrets, filesystem authority, write capability, hard-ceiling overrides, and hidden model configuration are never stored; and
- default resolution order is explicit: hard policy → explicit form choice → applied preset → local analysis defaults → product defaults, with hard policy always authoritative.

Tests cover CRUD/default/duplicate/last-use/version behavior, modified state, deletion with historical provenance, name/count bounds, concurrent edits, no repository/goal overwrite, forbidden fields, and bounded query/render counts.

### 20.7 Failed-run recovery and retry

Distinguish recovery of an interrupted non-terminal run from retry of a terminal failed/cancelled run.

Restart recovery:

- startup identifies stale leases and incomplete workflow checkpoints;
- applies the documented deterministic policy to requeue, resume, fail safely, or finalize without duplicating completed work;
- records an independent `recovery_state` of `none`, `recovered_after_restart`, or `recovery_failed`, with recovery time/reason and a visible run badge; it does not overload the run lifecycle status;
- preserves the same `run_id` only when resuming the same durable attempt; and
- never repeats report finalization, approval decisions, skill usage, or provider work that is already durably complete.

Retry/rerun:

- terminal retry always creates a new `run_id` linked by `retry_of_run_id`/attempt provenance;
- eligibility states why retry is available/unavailable based on failure category, repository/snapshot availability, configuration validity, provider readiness, and hard policy;
- “Clone configuration” opens New Review with safe reusable fields but revalidates repository/ref/model/policy;
- “Retry analysis” submits a new attempt only after showing changed/stale inputs and idempotency protection;
- History supports rerun/clone actions without altering the original run/report/events;
- failure history records bounded category, stage, retryability, safe diagnostic correlation ID, and attempt chain; and
- moved/deleted repositories, unavailable commits, changed dirty trees, and obsolete model/policy versions produce explicit choices or block exact retry honestly.

Tests cover each recovery policy, stale lease contention, repeated startup, exactly-once resume/finalize, retry eligibility, new-attempt linkage, idempotent double submission, changed repository/config warnings, preserved failure history, and no mutation of the original attempt.

### 20.8 First-run experience

An empty database is a supported ready state.

The first-run experience:

- states clearly that the application is local, single-user, and requires no sign-up or login;
- verifies database migration/WAL/worker/project-root readiness;
- separates required local readiness from optional model/provider/Langfuse setup;
- guides model/provider configuration and an explicit bounded connection test;
- provides direct actions for Settings and New Review;
- explains read-only repository access, configured-root containment, retention defaults, and where local data is stored;
- presents a useful no-reviews Overview empty state rather than zero-filled trend widgets; and
- remains resumable after restart without a one-time wizard lock or hidden completion flag.

Tests cover fresh baseline migration, already-current empty database, required-local failure, optional-provider absence, connection-test success/failure, no-review empty state, keyboard flow, no-login copy, and successful first-review transition.

## 21. Cross-screen navigation and state

### 21.1 Shared shell

All primary and supporting surfaces use:

- consistent product identity/sidebar;
- active navigation state;
- optional cosmetic local-operator preferences without identity, account, organization, role, or authorization semantics;
- shared colors, typography, spacing, status badges, buttons, tables, cards, and focus styles;
- desktop-only layouts.

Architecture, Findings, History, Command Center, Report, Evidence, and Comparison are dense/full-width workspaces. New Review and Settings remain narrower form-oriented workspaces. Overview uses a bounded desktop dashboard layout.

### 21.2 Canonical navigation

| From | Action | Destination |
|---|---|---|
| Overview | Start review | New Review |
| Overview | Open active/recent run | Command Center for selected `run_id` |
| Overview | Resolve pending decision | Approval detail for selected approval ID |
| Overview | View readiness/maintenance warning | Canonical Settings/Diagnostics section |
| New Review | Successful submit | Command Center for new `run_id` |
| Command Center | View all findings | Findings scoped to run |
| Command Center | View all evidence | Evidence viewer scoped to run |
| Command Center | Architecture | Architecture snapshot for run |
| Command Center | Open report | Final report reader for run |
| Command Center | Retry/clone failed run | New provenance-linked attempt or prefilled New Review |
| Findings | Open evidence | Evidence/source viewer |
| Findings | Affected flow/architecture | Architecture with finding selected |
| Architecture | Open evidence | Evidence/source viewer |
| Architecture | Finding deep link | Findings/details for same ID |
| History | Select/open run | Command Center or persisted report |
| History | Compare evidence | Comparison workspace |
| History | Retry/clone run | New provenance-linked attempt or prefilled New Review |
| Comparison | Open report/evidence/finding | Corresponding scoped reader/viewer/workspace |
| Command Center | Resolve pending workflow decision | Approval detail for same `run_id` |
| Approval inbox | Open pending decision | Approval detail and originating Command Center |
| Settings | Save defaults | New Review uses new defaults on next load |
| New Review | Manage presets | Preset manager |
| Preset manager | Apply preset | New Review with validated preset/version |
| Settings | Learning diagnostics | Versioned learning health, provenance, and controls |
| Settings | Local maintenance | Backup/restore/integrity/cleanup/reset surface |

Links carry stable IDs, not raw serialized state.

### 21.3 Shared vocabulary

Use one canonical definition for:

- run lifecycle;
- recovery state and retry eligibility;
- approval lifecycle and decision types;
- finding severity;
- finding `validation_state`;
- finding `review_disposition`;
- finding `comparison_outcome`;
- specialist role/category;
- confidence;
- required/optional health;
- estimated versus actual cost/tokens;
- learning health and active bundle version;
- snapshot, branch/ref, and commit identity.

Do not let each template invent labels or color meanings independently.

### 21.4 Deep links and refresh

Where practical, URL/query state includes:

- selected run/snapshot;
- finding ID;
- evidence ID and line anchor;
- approval ID;
- filter/sort/page;
- comparison current/baseline IDs;
- report section;
- preset ID/version; and
- settings section, learning audit page, or maintenance action status.

Refresh reconstructs state from application queries. The browser does not own authoritative findings, workflow progress, validation state, review disposition, comparison outcome, reports, evidence identity, approvals, presets, or settings.

### 21.5 Durable workflow approvals

The initial release supports approval only when a running analysis reaches an explicit workflow decision that requires local-operator input. Approval means selecting a bounded analysis branch; it never grants repository write access or expands configured filesystem, tool, provider, budget, or retention authority.

The initial required approval case is an optional follow-up investigation proposed after the standard evidence pass. The approval view shows:

- why the follow-up is recommended;
- the bounded additional scope;
- supporting finding/evidence IDs;
- estimated additional time, tokens, and cost;
- remaining hard limits; and
- the available server-defined decisions.

The decisions are:

- run the bounded follow-up investigation;
- skip the follow-up and finalize the report from current evidence; or
- cancel the analysis.

Routine stages do not require approval. A workflow may add another approval type only when its choices, authorization boundary, reject/expiry behavior, and resume target are explicitly specified and tested.

Approval lifecycle:

- the run transitions from `running` to `awaiting_approval` only after its workflow checkpoint and approval record are durable;
- the approval uses `pending`, `approved`, `rejected`, `expired`, or `cancelled`;
- while waiting, no model/provider work continues, no database transaction remains open, and the worker releases its lease;
- a decision is CSRF-protected, strictly validated, idempotent, and guarded by optimistic state/version checks;
- an approved follow-up requeues/resumes the run through the durable worker rather than executing in the request;
- skipping/rejecting follows the recorded server-defined branch and finalizes from current evidence;
- cancellation remains available while awaiting approval;
- restart recovery reconstructs the pending approval and resumes exactly once after a valid decision;
- expiry never silently approves; the approval type defines whether expiry safely finalizes or cancels;
- every request, decision, conflict, expiry, cancellation, and resume produces a redacted ordered audit event; and
- approval records identify the actor as `local_operator` or `system`, without claiming authenticated identity.

The Command Center displays the active approval and its safe context. Overview may display a pending-approval count, and `GET /approvals` provides a bounded local inbox/deep-link destination when more than one run requires attention.

Approval tests cover:

- durable interrupt creation before the worker releases its lease;
- approve, skip/finalize, cancel, expiry, invalid-choice, stale-version, and repeated-request behavior;
- no provider/model activity while waiting;
- refresh and process-restart reconstruction;
- exactly-once requeue/resume after a valid decision;
- cancellation while awaiting approval;
- CSRF, strict validation, safe rendering, redacted logging, and audit events;
- crafted approval payloads cannot enable writes, tools/providers, new roots, or hard-limit overrides; and
- bounded inbox/detail query plans and no idle worker-capacity consumption.

## 22. Shared routes and service boundaries

### 22.1 HTML routes

| Route | Responsibility |
|---|---|
| `GET /` | Overview dashboard or first-run empty state |
| `GET /analyses/new` | Prepare New Review form |
| `POST /analyses` | Submit durable review and redirect |
| `GET /analyses/{run_id}` | Command Center |
| `GET /analyses/{run_id}/report` | Persisted partial/final report reader |
| `GET /analyses/{run_id}/findings` | Findings workspace canonically scoped to one run |
| `GET /analyses/{run_id}/evidence/{evidence_id}` | Snapshot-bound evidence/source viewer |
| `GET /analyses/{run_id}/events` | Durable SSE progress |
| `POST /analyses/{run_id}/cancel` | Cooperative cancellation |
| `POST /analyses/{run_id}/retry` | Create an eligible provenance-linked retry attempt |
| `GET /analyses/{run_id}/clone` | Prepare New Review from safe reusable run configuration |
| `GET /approvals` | Bounded pending workflow-decision inbox |
| `GET /approvals/{approval_id}` | Approval detail with safe decision context |
| `POST /approvals/{approval_id}/decision` | Durable idempotent decision and worker resume/finalize signal |
| `GET /architecture/{snapshot_id}` | Architecture Explorer |
| `GET /findings` | Cross-run Findings workspace when an explicit context is selected |
| `POST /findings/{finding_id}/disposition` | Audited review-disposition transition |
| `POST /findings/{finding_id}/notes` | Bounded audited local reviewer note |
| `POST /findings/{finding_id}/relationships` | Audited duplicate/related finding relationship |
| `GET /settings/suppressions` | Bounded suppression-rule list and audit state |
| `POST /settings/suppressions/preview` | Preview a validated rule’s affected findings |
| `POST /settings/suppressions` | Create a confirmed versioned suppression rule |
| `POST /settings/suppressions/{suppression_id}/disable` | Disable a rule without rewriting history |
| `GET /history` | Review History |
| `GET /history/compare` | Run comparison using required `current` and `baseline` IDs |
| `GET /settings` | Settings section |
| `POST /settings` | Validated atomic settings update |
| `GET /settings/presets` | Preset manager |
| `POST /settings/presets` | Create a validated preset |
| `POST /settings/presets/{preset_id}` | Rename/update/version/default validated preset state |
| `POST /settings/presets/{preset_id}/duplicate` | Duplicate a preset without unsafe fields |
| `POST /settings/presets/{preset_id}/delete` | Confirmed preset deletion preserving run provenance |
| `GET /settings/maintenance` | Local database status and maintenance actions |
| `POST /settings/maintenance/backup` | Schedule WAL-safe verified backup |
| `POST /settings/maintenance/restores` | Stage and validate a bounded guarded restore artifact |
| `POST /settings/maintenance/restores/{restore_id}/confirm` | Confirm a validated restore and schedule quiesced swap |
| `POST /settings/maintenance/integrity` | Schedule bounded integrity check |
| `POST /settings/maintenance/retention-preview` | Preview bounded retention cleanup |
| `POST /settings/maintenance/reset` | Strongly confirmed canonical database recreation |
| `GET /settings/diagnostics` | Application/About diagnostics |
| `GET /settings/diagnostics/support-bundle` | Redacted bounded support bundle |
| `GET /settings/learning` | Learning health, version, provenance, retention, and audit diagnostics |
| `POST /settings/learning/pause` | Pause/resume creation and promotion of learning records |
| `POST /settings/learning/rollback` | Select a previously validated compatible learning bundle |
| `POST /settings/learning/retention` | Schedule validated learning retention/cleanup |
| `GET /settings/learning/export` | Produce a bounded redacted learning diagnostics export |

### 22.2 JSON/query support

Versioned `/api/v1` resources should provide stable equivalents for:

- overview/readiness, run detail/events/cancellation/retry/report;
- pending approval list/detail/decision state;
- architecture snapshot, evidence detail, and finding trace;
- findings list/detail/validation/disposition/comparison/notes/relationships/export;
- history metrics/trends/comparison and comparability assessment;
- preset management; and
- safe settings/options/health/maintenance/diagnostics/notifications and bounded learning diagnostics where an API is justified.

HTML and JSON adapters share application services. Do not duplicate ranking, comparison, validation/disposition, retry/recovery, preset, approval, learning-version, maintenance, health, budget, or retention rules in routes.

### 22.3 Application services

Likely services/query objects:

- `PrepareNewReview`, `InspectRepository`, `EstimateReview`, `SubmitAnalysis`;
- `GetOverview`, `GetFirstRunReadiness`;
- `GetRunCommandCenter`, `ListRunEvents`, `CancelAnalysis`, `GetReport`, `ExportReport`, `RetryAnalysis`, `CloneAnalysisConfiguration`;
- `ListPendingApprovals`, `GetApproval`, `DecideApproval`, `ResumeApprovedAnalysis`;
- `GetArchitectureExplorer`, `GetEvidenceTrace`, `GetEvidenceSource`;
- `ListFindings`, `GetFindingDetails`, `TransitionReviewDisposition`, `UpdateFindingNotes`, `LinkFindings`, `ManageSuppressionRules`, `ExportFindings`;
- `GetReviewHistory`, `CompareRuns`, `AssessComparability`, `GetFindingTrend`;
- `ListPresets`, `CreatePreset`, `VersionPreset`, `SetDefaultPreset`, `DuplicatePreset`, `DeletePreset`;
- `GetSettings`, `UpdateSettings`, `TestProviderConnection`, `GetSystemHealth`, `GetDiagnostics`, `ExportSupportBundle`;
- `GetMaintenanceStatus`, `BackupDatabase`, `ValidateRestore`, `RestoreDatabase`, `CheckIntegrity`, `PreviewRetention`, `ResetDatabase`;
- `GetLearningDiagnostics`, `SetLearningPaused`, `RollbackLearningBundle`, `ScheduleLearningRetention`, `ExportLearningDiagnostics`.

These names are guidance, not a requirement to create one class per action. Keep the boundary cohesive and avoid a generic service locator.

## 23. Cross-screen persistence requirements

SQLite must support the view/query needs without treating templates as a reporting database.

Required durable concepts:

- analysis run request/status/lease/progress/metrics;
- ordered events;
- approval request/decision/version/checkpoint reference and audit state;
- immutable repository snapshot/manifest, commit identity, dirty/untracked classification, submodule/LFS/symlink state, exclusions, and repository reassociation history;
- architecture nodes, edges, boundaries, summaries, and evidence traces or a validated versioned architecture payload with indexed lookup metadata;
- findings with stable ID/fingerprint, severity, confidence, independent validation state and review disposition, component/location, recommendation, and first-seen provenance;
- bounded reviewer notes, accepted-risk expiry, false-positive classification, duplicate/related links, and versioned suppression rules/audit;
- specialist participation/consensus/coverage;
- versioned report body/sections, partial/final state, limitations, and export metadata;
- review-disposition audit trail;
- comparison identity, policy, comparability assessment, and all-five outcomes;
- model/pricing/budget policy versions;
- settings, versioned presets/default/usage, local-operator cosmetics, notification preferences, and maintenance policy;
- retry/attempt lineage, recovery annotations, durable failure history, and maintenance/backup/restore audit metadata;
- versioned prompt metadata, experiences, validated skill bundles/skills, skill usage, and run provenance;
- learning pause/retention state and learning audit events;
- optional safe evidence excerpts under retention/redaction policy.

Do not store raw ORM/provider objects, credentials, full repositories, hidden model reasoning, or unbounded browser state.

## 24. Cross-screen security requirements

- Every repository/evidence path is root-confined and repository-relative when displayed outside the local path field.
- Every mutation uses CSRF protection for HTML, strict Pydantic validation, allowed transitions, and idempotency/conflict handling.
- Every query/filter/sort/export value is bounded and allowlisted.
- Jinja autoescape remains on; model/source/recommendation text is never implicitly trusted.
- CSV export prevents formula injection.
- Export filenames and content types are safe.
- Source snippets, prompts, evidence, reports, and telemetry obey redaction/retention settings.
- Model output cannot directly set finding validation state, review disposition, notes, relationships, suppressions, settings, budgets, tool authority, or write permissions.
- Model output may propose a workflow approval but cannot approve it, choose for the local operator, change its available decisions, or resume itself.
- Approval decisions cannot grant repository writes, expand project roots, override hard ceilings, enable providers/tools, or weaken redaction/retention policy.
- Learning records and exports are treated as untrusted, versioned data and cannot become executable authority.
- Backup/restore/reset paths and uploaded restore artifacts are allowlisted, validated, non-executable data; maintenance actions cannot target repositories or paths outside the dedicated data/backup boundary.
- Support bundles and local notifications use explicit safe-field allowlists rather than broad object serialization.
- Optional integrations cannot determine local readiness or corrupt authoritative SQLite state.
- Write tools remain unavailable in this build.

## 25. Cross-screen performance requirements

Follow `docs/security-performance-guidelines.md` and additionally:

- Command Center event replay and live evidence are bounded and incremental.
- Architecture graph payload/layout is snapshot-versioned and bounded.
- Findings, History, and Evidence use server-side pagination/filtering/aggregation.
- Detail-panel changes do not reload full tables/graphs when a bounded fragment/query is sufficient.
- History table queries never load report bodies.
- Trend/comparison queries use persisted identities/aggregates rather than repeated report parsing.
- Settings health checks are cached/bounded and do not block page rendering on optional integrations.
- Approval inbox/detail queries are bounded and indexed; waiting approvals consume no worker/model capacity and resume exactly once.
- Learning diagnostics use stored metadata/aggregates rather than loading prompt, experience, or skill bodies into the settings page.
- Learning export, rollback, and cleanup are bounded jobs where work exceeds a short settings transaction.
- Overview uses bounded aggregate queries and never loads report/evidence bodies.
- Report reading uses the persisted versioned artifact and performs no analysis/provider work.
- Evidence viewing bounds source bytes/lines/syntax work and uses indexed evidence metadata.
- Preset lists/version history and failed-attempt chains are bounded and avoid per-row configuration/report queries.
- Backup, restore validation, integrity checks, support bundles, retention cleanup, and reset run outside request transactions with bounded progress reporting and serialized maintenance ownership.
- Large normal/large fixtures exercise 10,000 runs, 1,000 events/findings where specified, and a 10,000-file architecture/scan profile.
- Marked performance tests record p95 for dense-page render/query, SSE replay, finding search, architecture load, history comparison, and settings save.

### 25.1 Canonical metric definitions

- **Eligible files** are distinct immutable-manifest entries that pass root, type, size, ignore/generated, submodule/LFS, and configured selection policy.
- **Analyzed files** are eligible files with at least one durably completed required scan/work unit; partial/failed work is reported separately.
- **Coverage** is `completed required work units / assigned eligible required work units × 100`. The denominator, exclusions, skipped/failed counts, and coverage-policy version are retained; unavailable denominator yields unavailable, not zero.
- **Specialist progress** is `durably completed assigned work units / total assigned work units × 100`, capped below 100 until the specialist reaches a terminal completed state. Failed/cancelled specialists retain their achieved fraction and terminal label.
- **Displayed confidence** is `round(clamp(stored_confidence, 0, 1) × 100)`. The stored score, calibration/policy version, and source remain authoritative; the UI never derives confidence from severity, validation, or vote count.
- **Estimated tokens/cost** come from the retained estimate input and pricing-policy version. **Actual tokens** are the sum of accepted provider usage records; **actual cost** is the sum across calls of billable input, cached-input, output, and other provider units multiplied by the recorded per-model pricing version. Missing usage remains incomplete, not zero.
- **Duration** is terminal event time minus created/start event time for wall duration; active compute/provider duration is separately summed from non-overlapping recorded stages and excludes `awaiting_approval`.
- **Additions/deletions** are line counts from a deterministic diff between the recorded baseline and analyzed snapshot using the recorded diff policy. Without both trustworthy text snapshots, show unavailable.
- **First seen** is the earliest retained run in which the normalized finding identity exists under a compatible identity-policy lineage; retention gaps are disclosed.
- **Comparison outcomes** are mutually exclusive under the recorded policy: unmatched current → `new`; current matching a previously resolved identity absent from the baseline → `reopened`; current matching baseline with material location movement → `moved`; other current/baseline match → `persisting`; unmatched baseline → `resolved`. Ambiguous matches are unavailable/inconclusive until deterministically resolved.
- **Severity movement** is current comparable count minus baseline comparable count per severity, accompanied by direction semantics rather than treating a positive number as inherently good.

### 25.2 Screen performance acceptance matrix

These are initial local acceptance ceilings measured after warmup on the documented reference machine with repeated samples. Exceeding a ceiling requires investigation and an explicitly recorded accepted regression; it does not authorize weakening correctness, redaction, or bounds.

| Surface | Representative fixture | Server p95 | DB queries | Response/payload ceiling | Practical rendered-item ceiling |
|---|---|---:|---:|---:|---:|
| Overview | 10,000 runs, 50 active, 100 warnings | 250 ms | 12 | 512 KiB | 150 cards/rows |
| New Review | 10,000-file snapshot metadata, 100 presets | 250 ms | 12 | 512 KiB | 150 controls/cards |
| Command Center | 1,000 events, 32 specialists, 1,000 findings | 300 ms | 15 | 768 KiB initial | 250 live items |
| Architecture | 10,000 files, bounded 2,000-node model | 500 ms | 15 | 2 MiB initial | 1,000 visible nodes/edges |
| Findings | 10,000 findings in selected scope | 300 ms | 10 | 768 KiB | 200 table/detail items |
| History | 10,000 runs and bounded trend range | 300 ms | 12 | 768 KiB | 200 rows/points |
| Report reader | 1,000-finding persisted report | 350 ms | 8 | 2 MiB per response/fragment | 300 expanded items |
| Evidence viewer | Maximum allowed file with 500-line window | 250 ms | 8 | 512 KiB | 500 source lines |
| Comparison | Two 1,000-finding runs | 500 ms | 18 | 1.5 MiB | 300 comparison rows |
| Settings/presets | 100 presets, 100 audit rows, all health metadata | 250 ms | 15 | 768 KiB | 250 controls/rows |
| Approvals | 1,000 historical, 100 pending approvals | 200 ms | 8 | 256 KiB | 100 rows |

SSE replay, backup/restore/integrity work, report/support exports, and scanning use separate throughput/contention benchmarks because request latency must not include their full background execution time.

## 26. Cross-screen accessibility requirements

- Persistent navigation, tabs, segmented controls, tables, drawers, cards, graphs, charts, and status indicators have semantic equivalents.
- Graphs/charts provide accessible list/table alternatives.
- Drawers/panels manage focus on open/close and preserve initiating control.
- Tables have real headers, captions/accessible names, and keyboard-operable selection/actions.
- Color is never the sole severity/status/selection cue.
- Dynamic updates use restrained live regions.
- Truncated labels/paths expose full accessible text.
- Zoom and graph interactions have keyboard controls.
- No workflow requires hover, touch, or a mobile layout.

## 27. Integrated browser journeys

### Journey A — Start and observe a review

1. Open New Review.
2. Select validated repository/branch.
3. Configure goal/depth/model/specialists/focus/limits.
4. Submit.
5. Land on Command Center.
6. Observe durable stage/specialist/evidence updates.
7. Refresh/reconnect without losing progress.
8. Cancel or allow completion.
9. Export/open report when available.

When a configured follow-up decision occurs between steps 7 and 8:

1. Observe `awaiting_approval` without continued provider work.
2. Inspect reason, scope, evidence IDs, estimate, and remaining hard limits.
3. Approve the bounded follow-up, finalize from current evidence, or cancel.
4. Refresh or restart and verify that the same decision state is reconstructed.
5. Confirm a valid decision resumes/finalizes exactly once through the worker.

### Journey B — Triage a finding

1. Open Findings from Command Center.
2. Search/filter/select a finding.
3. Inspect impact, evidence, consensus, flow, and recommendation.
4. Open Architecture with the finding selected.
5. Inspect the entry-to-sink trace.
6. Open source evidence read-only.
7. Change review disposition without altering validation state.
8. Add a bounded note or accepted-risk expiry and verify the audit trail.

### Journey C — Compare reviews

1. Open History.
2. Filter repository/date range.
3. Select a completed run.
4. Compare with previous compatible run.
5. Inspect new/persisting/resolved/reopened/moved findings, severity movement, specialist coverage, and comparability warnings.
6. Open report or evidence comparison.

### Journey D — Change safe defaults

1. Open Settings.
2. Change review defaults/model routing/budgets/retention.
3. Test an optional provider connection.
4. Save atomically.
5. Open New Review and verify defaults.
6. Confirm write tools remain unavailable.

### Journey E — Inspect and control learning

1. Open Settings → Learning & diagnostics.
2. Inspect optional health, active versions, counts, and run provenance.
3. Export bounded redacted diagnostics and verify prohibited content is absent.
4. Pause learning and confirm analysis/report completion remains available.
5. Roll back to a previously validated compatible bundle.
6. Verify the active version changes atomically while historical run provenance remains unchanged.
7. Inspect the durable audit record for pause, export, and rollback actions.

### Journey F — Complete first run

1. Open an empty freshly migrated application.
2. Confirm the Overview explains that no login is required and shows required versus optional readiness.
3. Configure a model/provider if needed and run the bounded connection test.
4. Open New Review, select a safely validated repository, and inspect dirty/untracked/submodule/LFS state.
5. Submit the first review and return through Overview/Command Center.
6. Complete the run and open the persisted final report and one evidence item.

### Journey G — Recover or retry a run

1. Interrupt the process during a durable non-terminal analysis.
2. Restart and verify deterministic recovery with no duplicated completed work.
3. Open the recovery annotation and durable failure/event history.
4. For a terminal eligible failure, choose Retry and confirm a new linked `run_id`.
5. For Clone configuration, verify repository/ref/model/policy are revalidated.
6. Confirm the original run, report, events, and failure history remain unchanged.

### Journey H — Maintain local SQLite data

1. Open Settings → Local data & maintenance and inspect path, size, revision, WAL, and integrity state.
2. Create and verify a backup while reads remain available.
3. Preview retention cleanup without deleting data.
4. Reject a corrupt/foreign/unsupported restore file without replacing the active database.
5. Confirm a valid restore, pre-restore backup, quiesced swap, restart, and readiness verification.
6. Exercise interrupted restore recovery.
7. Verify reset requires strong confirmation and never removes repositories, backups, or secrets.

### Journey I — Manage and apply a preset

1. Create a preset from validated New Review fields.
2. Rename, duplicate, version, and select a default.
3. Apply it to New Review and verify repository path, branch, and goal are not silently overwritten.
4. Modify an applied field and verify the preset is labeled modified without changing the stored version.
5. Delete the preset and verify historical run provenance remains available.

## 28. Overall visual acceptance

Across all mockups preserve:

- dark teal persistent sidebar;
- warm off-white workspace background;
- teal primary actions and active navigation;
- compact bordered cards/panels;
- readable dense data tables;
- severity colors with text labels;
- right-side contextual detail panels;
- consistent icon containers;
- restrained shadows and borders;
- strong desktop information hierarchy;
- mockup-specific narrow versus dense workspace widths.

Accessibility and real data may require small geometry changes. Do not replace the visual system with generic Bootstrap defaults, a chat interface, or a mobile-first layout.

## 29. Overall definition of done

- [ ] All six supplied mockups and every linked supporting destination are represented by explicit feature requirements and canonical routes.
- [ ] No account, login, organization, team, tenant, membership, role, invitation, subscription, or billing semantics are introduced; local-operator preferences remain cosmetic.
- [ ] New Review submits a durable read-only run.
- [ ] Repository inspection and snapshots explicitly handle dirty/untracked/ignored/generated/submodule/symlink/reparse/LFS/detached/moved states.
- [ ] Command Center reconstructs and streams progress from durable events.
- [ ] Architecture Explorer links graph objects, findings, and evidence traces.
- [ ] Findings keeps validation state, review disposition, and comparison outcome independent and supports audited advanced triage.
- [ ] Overview, Report Reader, Evidence Viewer, Comparison, and Preset Manager satisfy their complete state/security/performance/test contracts.
- [ ] History supports deterministic all-five finding outcomes, explicit comparability warnings, qualified trends, retry, and clone.
- [ ] Failed-run recovery and retry preserve attempt lineage, failure history, and exactly-once durable work.
- [ ] Settings manages safe defaults, models, budgets, retention, local maintenance, diagnostics, notifications, and actual architecture health.
- [ ] WAL-safe backup/restore, integrity, cleanup preview, and destructive reset pass failure/recovery tests.
- [ ] First-run readiness works from an empty database without sign-up or login.
- [ ] ACE learning remains internal while Settings exposes bounded health, version, provenance, pause, export, rollback, retention, and audit controls.
- [ ] Learning failures do not block report completion, and learned data cannot expand application authority.
- [ ] Workflow approvals durably pause and resume/finalize exactly once across refresh and restart.
- [ ] Approval means a bounded workflow decision and never grants repository write access or overrides hard limits.
- [ ] PostgreSQL, Redis, and MinIO are not reintroduced as application dependencies.
- [ ] Write tools remain unavailable.
- [ ] Shared HTML/API services enforce one canonical domain policy.
- [ ] Deep links and refresh reconstruct state from durable IDs.
- [ ] Canonical metric formulas and screen performance-matrix ceilings are implemented and measured.
- [ ] Security, redaction, containment, export, and mutation tests pass.
- [ ] Dense-page and live-update performance budgets pass or have documented accepted regressions.
- [ ] Graph/chart/table/drawer accessibility passes keyboard and semantic review.
- [ ] Browser journeys A–I pass with JavaScript enhancement failure handled where applicable.
- [ ] Implementation matches the six mockups closely without introducing mobile scope or a SPA.
