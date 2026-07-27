# Review Focus Improvements Implementation Plan

**Date:** 2026-07-27  
**Status:** Tasks 1–10 **complete** (deterministic focus + specialist BX/CF depth).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` / `- [x]`) syntax for tracking.

**Goal:** Sharpen deterministic review focus and coverage honesty (Tasks 1–6), then deepen BoxLang + CFML specialist review quality (Tasks 7–10) without becoming a migrator or PR bot.

**Architecture:** Keep the existing pipeline (`RepositoryScannerService` → graph → `ReviewPlannerService` / `ContextPackService` → `FindingService.deterministic` → specialists). Prefer small deterministic gates over new frameworks. No template-engine rule matcher. No SaaS/mobile/extra languages.

**Tech Stack:** BoxLang, ColdBox, TestBox, SQLite (`SchemaService` column upgrades), desktop UI (`public/assets/app.js`).

## Status (read this first)

| Task | Title | Status |
|---|---|---|
| 1 | Language-scoped deterministic rules + tests | **Complete** |
| 2 | Persist and surface skipped / truncated discovery | **Complete** |
| 3 | Sensible scan default bump + README tuning note | **Complete** |
| 4 | Deterministic `emphasizeFiles` without LLM | **Complete** |
| 5 | Changed-line preference in `ContextPackService` | **Complete** |
| 6 | Docs sync + final verification | **Complete** |
| 7 | Specialist prompt v3 (CFML + BoxLang role depth) | **Complete** |
| 8 | Deterministic change briefs for convention roles | **Complete** |
| 9 | Emphasized CF/BX packs prefer changed lines | **Complete** |
| 10 | CF guidance playbooks + docs/capabilities sync | **Complete** |

**How to read this file:** Tasks 1–10 shipped. Do not re-implement unless a regression is found.

Related (separate tracks, not this plan):

- `plans/2026-07-27-aiflight-feature-gaps.md` — AiFlight observability
- `plans/2026-07-27-cf-modernization-workspace-design.md` — first-class CF modernization **workspace** (not Tasks 7–10)

## Global Constraints

- Local-only desktop product; SQLite on the user’s machine.
- Supported languages remain BoxLang, ColdFusion (CFML), JavaScript, Java only.
- Basic review must still work without an AI key.
- Prefer smallest change; extend existing services/tests before new abstractions.
- PowerShell-compatible commands on Windows.
- Do not recreate `docs/superpowers/`; plan lives under `resources/docs/plans/`.
- Commits only when the user asks (or when executing this plan under an execution skill that includes commit steps with user approval).

---

## File map

| Area | Primary files |
|---|---|
| Language-scoped rules | `app/models/services/FindingService.bx`, `tests/specs/unit/FindingServiceLanguagePackSpec.bx` |
| Skip/truncation persistence | `SchemaService.bx`, `ReviewResultRepository.bx`, `ReviewRunService.bx`, `CoverageAssessmentService.bx`, `ReportExportService.bx`, `public/assets/app.js` |
| Scan defaults + docs | `.env.example`, `app/config/Coldbox.bx`, `README.md`, `resources/docs/technical-flow.md` |
| Deterministic emphasizeFiles | `app/models/services/ReviewPlannerService.bx`, `tests/specs/unit/ReviewPlannerServiceCrewSpec.bx` |
| Changed-line preference | `GitRepositoryService.bx`, `RepositoryScannerService.bx`, `ContextPackService.bx` |
| Specialist prompts (Tasks 7+) | `SpecialistAgentFactory.bx`, `tests/specs/unit/SpecialistAgentsSpec.bx` |
| Convention briefs (Task 8) | `ReviewPlannerService.bx`, `ReviewPlannerServiceCrewSpec.bx` |
| Emphasized pack ranges (Task 9) | `ReviewPlannerService.bx` (`emphasizedContextFile`), planner/context specs |
| CF guidance playbooks (Task 10) | `RulePlaybookCatalog.bx`, `FindingSolutionService.bx`, `ApiCapabilities.bx`, docs |

---

### Task 1: Language-scoped deterministic rules + tests — COMPLETE

**Files:**
- Modify: `app/models/services/FindingService.bx`
- Test: `tests/specs/unit/FindingServiceLanguagePackSpec.bx` (create)
- Modify: `tests/specs/unit/ReviewCoreServicesSpec.bx` only if an existing assertion assumes JS rules on CFML (fix if broken)

**Interfaces:**
- Consumes: indexed file structs with `language`, `filePath`, `lines[]`
- Produces: same `deterministic( files ) → array` findings API; ruleIds unchanged for shared/CFML/JS rules that already exist

**Rule packs (apply only when language matches):**

| Pack | Languages | Rules |
|---|---|---|
| `shared` | all supported | `secrets/hardcoded-credential`, `maintenance/open-marker` |
| `javascript` | JavaScript | `execution/dynamic-code` |
| `cfml` | CFML, BoxLang | `database/query-interpolation`, `errors/empty-catch` (CF-style catch) |
| `javascript` also | JavaScript | `errors/empty-catch` (JS-style catch already matched by same regex) |

Keep Java on shared-only for now (no new Java rules). Empty-catch regex already matches both dialects; keep applying it for JS + CFML + BoxLang, not for unknown languages if any appear.

- [x] **Step 1: Write the failing unit spec**

Create `tests/specs/unit/FindingServiceLanguagePackSpec.bx`:

```boxlang
class extends="testbox.system.BaseSpec" {

	function run() {
		describe( "FindingService language packs", () => {
			it( "does not flag JS dynamic execution in CFML source", () => {
				var service = new app.models.services.FindingService();
				var findings = service.deterministic( [
					{
						filePath: "app/models/Widget.cfc",
						language: "CFML",
						lines   : [ "var x = eval( userInput );", "queryExecute( ""SELECT * FROM t WHERE id = ##id##"" );" ]
					}
				] );
				var ruleIds = findings.map( ( f ) => f.ruleId );
				expect( ruleIds ).notToInclude( "execution/dynamic-code" );
				expect( ruleIds ).toInclude( "database/query-interpolation" );
			} );

			it( "does not flag queryExecute interpolation in JavaScript", () => {
				var service = new app.models.services.FindingService();
				var findings = service.deterministic( [
					{
						filePath: "public/assets/demo.js",
						language: "JavaScript",
						lines   : [ "queryExecute( 'SELECT * FROM t WHERE id = ##id##' );", "eval( code );" ]
					}
				] );
				var ruleIds = findings.map( ( f ) => f.ruleId );
				expect( ruleIds ).notToInclude( "database/query-interpolation" );
				expect( ruleIds ).toInclude( "execution/dynamic-code" );
			} );

			it( "still flags secrets and TODO markers in any supported language", () => {
				var service = new app.models.services.FindingService();
				var findings = service.deterministic( [
					{
						filePath: "src/Main.java",
						language: "Java",
						lines   : [ "String password = ""hunter2password"";", "// TODO: fix later" ]
					}
				] );
				var ruleIds = findings.map( ( f ) => f.ruleId );
				expect( ruleIds ).toInclude( "secrets/hardcoded-credential" );
				expect( ruleIds ).toInclude( "maintenance/open-marker" );
			} );
		} );
	}

}
```

- [x] **Step 2: Run the spec and confirm failure**

```powershell
box testbox run bundles=tests.specs.unit.FindingServiceLanguagePackSpec
```

Expected: FAIL — CFML file still produces `execution/dynamic-code` and/or JS still produces `database/query-interpolation`.

- [x] **Step 3: Implement language gating in `FindingService.deterministic`**

Refactor the line loop so each rule runs only when allowed for `file.language`:

```boxlang
array function deterministic( required array files ) {
	var findings = [];
	for ( var file in arguments.files ) {
		var language = file.language ?: "";
		var allowJsDynamic = language == "JavaScript";
		var allowCfSql = language == "CFML" || language == "BoxLang";
		var allowEmptyCatch = allowJsDynamic || allowCfSql;
		for ( var lineNumber = 1; lineNumber <= file.lines.len(); lineNumber++ ) {
			// shared: secrets + TODO/FIXME (unchanged)
			// if ( allowJsDynamic ) { eval / new Function }
			// if ( allowCfSql ) { queryExecute + ## }
			// if ( allowEmptyCatch ) { empty catch }
		}
	}
	return deduplicate( findings );
}
```

Do not change fingerprints, severities, or playbook `ruleId`s.

- [x] **Step 4: Re-run unit specs**

```powershell
box testbox run bundles=tests.specs.unit.FindingServiceLanguagePackSpec,tests.specs.unit.ReviewCoreServicesSpec
```

Expected: PASS. Fix any corpus/evaluation assertions only if they relied on cross-language false positives (unlikely).

- [x] **Step 5: Commit** (when user approves commits)

```powershell
git add app/models/services/FindingService.bx tests/specs/unit/FindingServiceLanguagePackSpec.bx
git commit -m "$(cat <<'EOF'
Scope deterministic review rules by source language.

EOF
)"
```

On Windows PowerShell without bash HEREDOC, use:

```powershell
git add app/models/services/FindingService.bx tests/specs/unit/FindingServiceLanguagePackSpec.bx
git commit -m "Scope deterministic review rules by source language."
```

---

### Task 2: Persist and surface skipped / truncated discovery — COMPLETE

**Files:**
- Modify: `app/models/services/SchemaService.bx` (`ensurePendingUpgrades` + `createCoreSchema` for new installs)
- Modify: `app/models/repositories/ReviewResultRepository.bx` (`saveSummary`, `getResult`)
- Modify: `app/models/services/ReviewRunService.bx` (pass `skipped` into `saveSummary`; include in `getResult` / coverage inputs)
- Modify: `app/models/services/CoverageAssessmentService.bx` (optional gap reasons for oversized/limit when counts > 0)
- Modify: `app/models/services/ReportExportService.bx` (markdown + JSON summary)
- Modify: `public/assets/app.js`, `public/assets/app.css` (result panel)
- Test: `tests/specs/unit/CoverageAssessmentServiceSpec.bx`, `tests/specs/integration/ReportExportSpec.bx`, and/or a small unit for repository summary round-trip

**Interfaces:**
- Consumes: `scan.skipped = { ignored, oversized, binary, unreadable, limit }`, `scan.discoveryTruncated`
- Produces: `result.skipped` (struct) and `result.discoveryTruncated` (boolean) on `getResult`; export + UI consume the same fields

Today `review.indexed` SSE already publishes `skipped` / `discoveryTruncated`, but `saveSummary` only persists `discovery_truncated`. Result API / export / final UI cannot show skip counts after reload.

- [x] **Step 1: Write failing tests**

Add to `tests/specs/unit/CoverageAssessmentServiceSpec.bx` (or new file):

```boxlang
it( "adds discovery gaps for truncated discovery and scan limits", () => {
	var coverage = new app.models.services.CoverageAssessmentService().assess( {
		plan: { tasks: [] },
		specialists: { results: [] },
		discoveryTruncated: true,
		skipped: { ignored: 0, oversized: 2, binary: 0, unreadable: 0, limit: 1 }
	} );
	var reasons = coverage.gaps.map( ( g ) => g.reason );
	expect( reasons ).toInclude( "Repository discovery reached its configured limit" );
	expect( arrayToList( reasons ) ).toInclude( "oversized" ); // or exact wording you choose
	expect( arrayToList( reasons ) ).toInclude( "limit" );
} );
```

Add report assertion in `ReportExportSpec` (or unit on `ReportExportService`): markdown includes a **Coverage** / **Skipped** section when `result.skipped` is present.

- [x] **Step 2: Run tests — expect FAIL**

```powershell
box testbox run bundles=tests.specs.unit.CoverageAssessmentServiceSpec
```

- [x] **Step 3: Schema upgrade**

In `SchemaService.ensurePendingUpgrades()` and `createCoreSchema()` `review_summaries` definition:

```boxlang
ensureColumn(
	"review_summaries",
	"skipped_json",
	"TEXT NOT NULL DEFAULT '{}'"
);
```

Also add the column to the `CREATE TABLE` block for fresh DBs so new installs match.

- [x] **Step 4: Repository + run wiring**

`ReviewResultRepository.saveSummary`: add `struct skipped = {}` argument; persist `jsonSerialize( skipped )` into `skipped_json`.

`getResult`: deserialize `skipped_json` → `result.skipped` (default empty counters).

`ReviewRunService.executeRun` final `saveSummary` call: pass `skipped = scan.skipped`.

Keep publishing `review.indexed` as today (already has skipped).

- [x] **Step 5: Coverage + export + UI**

`CoverageAssessmentService.assess`:
- Keep existing discoveryTruncated gap.
- If `skipped.oversized > 0`, append gap reason like `"N files skipped as oversized"`.
- If `skipped.limit > 0`, append `"N candidate files skipped by file-count budget"`.

`ReportExportService.toMarkdown` / `toJson` summary:
- Include `discoveryTruncated` and `skipped` counts.

`public/assets/app.js`: when rendering result (and on `review.indexed` if useful), show a compact coverage line, e.g. `Skipped: 3 oversized · 1 limit · truncated`.

Keep desktop-only layout; no mobile breakpoints.

- [x] **Step 6: Re-run targeted tests**

```powershell
box testbox run bundles=tests.specs.unit.CoverageAssessmentServiceSpec,tests.specs.integration.ReportExportSpec
```

Expected: PASS.

- [x] **Step 7: Commit** (when approved)

```powershell
git commit -m "Persist and surface scan skip and discovery truncation details."
```

---

### Task 3: Sensible scan default bump + README tuning note — COMPLETE

**Files:**
- Modify: `.env.example`
- Modify: `app/config/Coldbox.bx` (defaults for `scanMaxFileBytes`, `scanMaxBytes`)
- Modify: `README.md` (Configuration section)
- Modify: `resources/docs/technical-flow.md` (short tuning note under scan / specialist path)

**Interfaces:** none (config + docs only). Existing env overrides still win.

**New defaults:**

| Variable | Old | New |
|---|---|---|
| `DOUBLECHECK_SCAN_MAX_FILE_BYTES` | `131072` (128 KB) | `524288` (512 KB) |
| `DOUBLECHECK_SCAN_MAX_BYTES` | `2097152` (2 MB) | `10485760` (10 MB) |

Leave `DOUBLECHECK_SCAN_MAX_FILES=250` and `DOUBLECHECK_SCAN_MAX_ENTRIES=5000` unchanged unless tests prove otherwise.

- [x] **Step 1: Update defaults in ColdBox + `.env.example`**

```boxlang
scanMaxBytes    : getSystemSetting( "DOUBLECHECK_SCAN_MAX_BYTES", 10485760 ),
scanMaxFileBytes: getSystemSetting( "DOUBLECHECK_SCAN_MAX_FILE_BYTES", 524288 ),
```

Mirror in `.env.example`.

- [x] **Step 2: Document in README Configuration**

Add a short subsection after the env table:

```markdown
### Scan and LLM budgets

| Variable | Default | Role |
|---|---|---|
| `DOUBLECHECK_SCAN_MAX_FILE_BYTES` | `524288` | Skip a single file if larger (scan gate, not LLM) |
| `DOUBLECHECK_SCAN_MAX_BYTES` | `10485760` | Total indexed bytes |
| `DOUBLECHECK_SCAN_MAX_FILES` | `250` | Max indexed files |
| `AI_CONTEXT_WINDOW` | local `8192` / cloud `128000` | Model context window |
| `DOUBLECHECK_PLAN_MAX_CONTEXT_CHARACTERS` | `30000` | Specialist context-pack budget |

Raising scan limits indexes more source for deterministic rules. Specialists still receive bounded context packs; raise plan/token/`AI_CONTEXT_WINDOW` knobs separately if prompts hit context errors.
```

- [x] **Step 3: Mirror one sentence in `technical-flow.md`** under indexing / specialist config.

- [x] **Step 4: Smoke-check existing scan unit tests**

```powershell
box testbox run bundles=tests.specs.unit.ReviewCoreServicesSpec,tests.specs.unit.GitRepositoryServiceSpec
```

Expected: PASS (tests inject their own max properties).

- [x] **Step 5: Commit** (when approved)

```powershell
git commit -m "Raise default scan size budgets and document tuning knobs."
```

---

### Task 4: Deterministic `emphasizeFiles` without LLM — COMPLETE

**Files:**
- Modify: `app/models/services/ReviewPlannerService.bx`
- Test: `tests/specs/unit/ReviewPlannerServiceCrewSpec.bx` (extend) or create `ReviewPlannerEmphasizeSpec.bx`

**Interfaces:**
- Consumes: `files[]` with `language` / `filePath`, graph symbols/dependencies (already available in `plan()`)
- Produces: deterministic role queue entries with non-empty `emphasizeFiles` when LLM crew is **not** used; `contextFilesForSelection()` already boosts emphasized paths

Today deterministic path sets `emphasizeFiles: []`. LLM crew can set them. Fill the no-AI gap.

- [x] **Step 1: Write failing test**

```boxlang
it( "emphasizes CFML paths for cfml-conventions without an LLM crew", () => {
	var model = getInstance( "ArchitectureModelService" ).build( graphFixture(), fileFixtures(), "emph-det" );
	var plan = getInstance( "ReviewPlannerService" ).plan(
		model,
		graphFixture(),
		fileFixtures(), // include at least one .cfc with language CFML
		{},
		{},
		{ ok: false, source: "none", summary: "", tasks: [] }
	);
	var data = plan.getMemento();
	var cfmlTask = data.tasks.filter( ( t ) => t.role == "cfml-conventions" );
	expect( cfmlTask.len() ).toBeGT( 0 );
	expect( cfmlTask[ 1 ].context.files[ 1 ].filePath ).toInclude( ".cfc" );
	// Or assert emphasize via task context order: CFML file first among context files
} );
```

Adjust fixture helpers already in `ReviewPlannerServiceCrewSpec.bx` to include CFML + BoxLang files.

- [x] **Step 2: Run — expect FAIL** (empty emphasize / CFML not first).

- [x] **Step 3: Implement `emphasizeFilesForRole( role, files, graph )`**

Call from the deterministic `selectedRoles.map` branch only:

```boxlang
emphasizeFiles: emphasizeFilesForRole( role, arguments.files, arguments.graph )
```

Suggested rules (keep small):

| Role | Emphasize |
|---|---|
| `cfml-conventions` | paths where `language == "CFML"` |
| `boxlang-conventions` | paths where `language == "BoxLang"` or path ends with `.bx`/`.bxm` |
| `security` | paths whose content/path suggests SQL/query (`queryExecute` not available here — use language CFML/BoxLang + any file with `cfc`/`bx` first); optionally all context files if none match |
| `testing` | paths under `tests/` or `language` test symbols if cheap via graph |
| others | `[]` (shared pack order unchanged) |

Cap emphasize list to e.g. 8 paths. Intersect with paths that appear in the shared context pack (or with scanned `files`) so tools stay authorized.

Do **not** override LLM crew `emphasizeFiles` when `useLlmCrew` is true.

- [x] **Step 4: Re-run planner specs**

```powershell
box testbox run bundles=tests.specs.unit.ReviewPlannerServiceCrewSpec
```

Expected: PASS.

- [x] **Step 5: Commit** (when approved)

```powershell
git commit -m "Emphasize role-relevant files in deterministic review plans."
```

---

### Task 5: Changed-line preference in `ContextPackService` — COMPLETE

**Files:**
- Modify: `app/models/services/GitRepositoryService.bx` (add hunk line discovery)
- Modify: `app/models/services/RepositoryScannerService.bx` (attach `changedLines` on file structs when mode is working-tree / revision-diff)
- Modify: `app/models/services/ContextPackService.bx` (prefer those lines as high-priority candidates)
- Test: `tests/specs/unit/GitRepositoryServiceSpec.bx`, `tests/specs/unit/ContextPackServiceSpec.bx`

**Interfaces:**
- Consumes: optional `file.changedLines = [ { startLine, endLine }, ... ]` on scanned files
- Produces: context pack ranges that include changed-line windows first; bump `contextVersion` to `symbol-range-artifact-refs-v3` so fingerprints change intentionally

**Approach (bounded):**

1. For `revision-diff`, use `git diff -U0 --diff-filter=ACMRTUXB base...head -- path` (or unified name-status already known) and parse `@@ -a,b +c,d @@` for **new-side** line ranges.
2. For `working-tree`, use `git diff -U0 HEAD -- path` plus untracked files → treat whole file as changed (or lines 1..lineCount) when untracked.
3. Scanner attaches `changedLines` only when Git provides them; `full` mode leaves empty → current symbol-first behavior.
4. `ContextPackService.collectCandidates` (or a new first pass): for each file with `changedLines`, `appendCandidate` with reason `"changed-line"` **before** symbol-body candidates, using existing `beforeLines`/`afterLines`/`maxLinesPerRange` clamps.
5. `selectRanges` should already prefer earlier/higher-value candidates if it sorts by reason — if not, add reason priority: `changed-line` > `changed-symbol` > `impact-cone` > others.

- [x] **Step 1: Failing Git + ContextPack tests**

Git fixture (extend `GitRepositoryServiceSpec`): after committing base then changing a middle line of `src/main.bx`, assert `changedLineRanges(root, base, head, "src/main.bx")` returns a range covering that line.

ContextPack test:

```boxlang
it( "prefers explicit changedLines over distant symbols when budgets are tight", () => {
	var service = contextService();
	service.$property( "maxLines", "variables", 20 );
	service.$property( "maxLinesPerRange", "variables", 10 );
	var file = sourceFile(); // 30 lines
	file.changedLines = [ { startLine: 28, endLine: 28 } ];
	var graph = { summary: {}, symbols: [ { id: "far", filePath: file.filePath, kind: "function", name: "top", line: 2 } ], dependencies: [], impacts: [] };
	var pack = service.build( graph, [ file ] );
	var linesCovered = [];
	for ( var r in pack.files[ 1 ].ranges ) {
		for ( var n = r.startLine; n <= r.endLine; n++ ) linesCovered.append( n );
	}
	expect( linesCovered ).toInclude( 28 );
} );
```

- [x] **Step 2: Run — expect FAIL**

```powershell
box testbox run bundles=tests.specs.unit.ContextPackServiceSpec,tests.specs.unit.GitRepositoryServiceSpec
```

- [x] **Step 3: Implement Git hunk helper**

Add to `GitRepositoryService.bx`:

```boxlang
struct function changedLineRanges(
	required any root,
	required string relativePath,
	string baseRevision = "HEAD",
	string headRevision = "" // empty => working tree vs base
)
```

Parse unified diff hunks; return `{ available, ranges: [ { startLine, endLine } ], truncated }`. Never throw on git failure — return `available: false`.

Wire from `RepositoryScannerService.scan` after a file is accepted when mode is `working-tree` or `revision-diff`.

- [x] **Step 4: Prefer changed lines in `ContextPackService`**

- Bump `variables.contextVersion` to `symbol-range-artifact-refs-v3`.
- In `collectCandidates`, first loop files and append changed-line windows.
- Ensure selection budget prefers those reasons.

Update existing ContextPack tests that hard-code `symbol-range-artifact-refs-v2`.

- [x] **Step 5: Re-run unit specs**

```powershell
box testbox run bundles=tests.specs.unit.ContextPackServiceSpec,tests.specs.unit.GitRepositoryServiceSpec
```

Expected: PASS.

- [x] **Step 6: Optional integration smoke**

```powershell
box testbox run bundles=tests.specs.integration.ReviewApiSpec
```

- [x] **Step 7: Commit** (when approved)

```powershell
git commit -m "Prefer Git changed-line ranges when building specialist context packs."
```

---

### Task 6: Docs sync + final verification — COMPLETE

**Files:**
- Modify: `resources/docs/technical-flow.md` (deterministic packs, coverage honesty, emphasizeFiles, context pack v3)
- Modify: `resources/docs/README.md` (link this plan)
- Modify: `README.md` only if Task 3 missed a claim

- [x] **Step 1: Update technical-flow phase notes**

Document:
- Deterministic rules are language-scoped.
- Scan skip counts persist on the result.
- Deterministic plans can emphasize files without LLM.
- Context packs prefer changed lines when Git provides them (`symbol-range-artifact-refs-v3`).

- [x] **Step 2: Link plan from `resources/docs/README.md`**

| Doc | Purpose |
| [plans/2026-07-27-review-focus-improvements.md](plans/2026-07-27-review-focus-improvements.md) | Implementation plan: focus + coverage honesty |

- [x] **Step 3: Full relevant suite**

```powershell
box testbox run bundles=tests.specs.unit.FindingServiceLanguagePackSpec,tests.specs.unit.ReviewCoreServicesSpec,tests.specs.unit.CoverageAssessmentServiceSpec,tests.specs.unit.ContextPackServiceSpec,tests.specs.unit.GitRepositoryServiceSpec,tests.specs.unit.ReviewPlannerServiceCrewSpec,tests.specs.integration.ReportExportSpec,tests.specs.integration.ReviewApiSpec
```

Expected: all PASS (or note known unrelated failures).

- [x] **Step 4: Commit docs** (when approved)

```powershell
git commit -m "Document review focus improvements in technical flow."
```

---

## Tasks 7–10 — Specialist BX/CF depth (PENDING)

**Product intent:** Deepen optional LLM specialist quality for BoxLang + ColdFusion. JS/Java stay honest/light (shared deterministic rules only). Not a CF modernization workspace (see separate design doc). Not an auto-migrator.

**Shared constraints for 7–10:**
- Basic review still works with AI disabled.
- Preserve allowlisted roles in `ReviewPolicyService` / `SpecialistAgentFactory`.
- No new languages; no SaaS; no PR posting; no architecture-graph rewrite.
- Prefer smallest change to existing services + unit specs.

---

### Task 7: Specialist prompt v3 (CFML + BoxLang role depth) — COMPLETE

**Files:**
- Modify: `app/models/services/SpecialistAgentFactory.bx`
- Modify: `tests/specs/unit/SpecialistAgentsSpec.bx` (and any fixture asserting `specialist-prompt-v2`)

**Interfaces:**
- Consumes: plan `task` with `role`, optional `brief` / `objective`
- Produces: `definition()` with `version` / `provenance.promptVersion` = `specialist-prompt-v3`, role-specific `instructions`

**Behavior:**
1. Bump `variables.promptVersion` from `specialist-prompt-v2` → `specialist-prompt-v3`.
2. Keep shared safety rules (read-only, untrusted source, JSON-only shape, evidence gates).
3. Move the current shared “CFML / BoxLang fix rules” block out of **all** roles; attach role-specific focus instead:
   - **`cfml-conventions`:** Equal weight (1) concrete CFML defects with exact file/line (2) incremental modernization **assist** when evidence supports it. Hard rules: never assume ColdBox/BoxLang unless authorized context shows those stacks; never mandate a full rewrite; omit `fixPatch` when unsafe rewrite is unclear; prefer `encodeForURL` / `encodeForHTML*` guidance already known; steer modernization findings to stable `ruleId`s under `modernization/…` or `cfml/…` (document the small allowlist in Task 10).
   - **`boxlang-conventions`:** BoxLang + ColdBox contract violations only; no subjective style; no CF-legacy modernization lectures unless the file language is BoxLang and evidence shows CF interop.
   - **Other roles (`security`, `correctness`, …):** Keep generic defect focus; do **not** paste CF modernization paragraphs.
4. Update role `focus` strings in `variables.roles` only if needed to match the above (keep short).

- [x] **Step 1: Write failing unit specs**

In `SpecialistAgentsSpec.bx` (or new `SpecialistAgentFactoryPromptSpec.bx`):

```boxlang
it( "uses specialist-prompt-v3 and CF-specific instructions only for cfml-conventions", () => {
	var factory = new app.models.services.SpecialistAgentFactory();
	// inject provider/model settings if constructor requires WireBox — follow existing fixture pattern
	var cfDef = factory.definition( { id: "t1", role: "cfml-conventions", objective: "", brief: "", budget: { maxTokens: 500, maxIterations: 2 } } );
	expect( cfDef.version ).toBe( "specialist-prompt-v3" );
	expect( cfDef.instructions ).toInclude( "modernization" );
	expect( cfDef.instructions ).toInclude( "Never assume ColdBox" );

	var secDef = factory.definition( { id: "t2", role: "security", objective: "", brief: "", budget: { maxTokens: 500, maxIterations: 2 } } );
	expect( secDef.version ).toBe( "specialist-prompt-v3" );
	expect( secDef.instructions ).notToInclude( "Never assume ColdBox" );
} );

it( "keeps boxlang-conventions focused on BoxLang/ColdBox contracts", () => {
	var factory = new app.models.services.SpecialistAgentFactory();
	var bxDef = factory.definition( { id: "t3", role: "boxlang-conventions", objective: "", brief: "", budget: { maxTokens: 500, maxIterations: 2 } } );
	expect( bxDef.instructions ).toInclude( "BoxLang" );
	expect( bxDef.instructions ).notToInclude( "equal weight" ); // CFML-only phrasing
} );
```

Adjust assertions to match final wording; keep the intent.

- [x] **Step 2: Run — expect FAIL** (still v2 / shared CF block on all roles)

```powershell
box testbox run bundles=tests.specs.unit.SpecialistAgentsSpec
```

- [x] **Step 3: Implement prompt v3 in `SpecialistAgentFactory`**

- [x] **Step 4: Re-run SpecialistAgentsSpec — expect PASS** (update any hard-coded `specialist-prompt-v2` expectations)

- [x] **Step 5: Commit** (when user approves)

```powershell
git commit -m "Deepen CFML and BoxLang specialist prompts to specialist-prompt-v3."
```

Shipped as `07bbd4a` plus follow-up fixes `b8c2f1d` (role-aware reporting gate) and `0ac9fa5` (neutral JSON message wording). Review clean.

---

### Task 8: Deterministic change briefs for convention roles — COMPLETE

**Files:**
- Modify: `app/models/services/ReviewPlannerService.bx`
- Modify: `tests/specs/unit/ReviewPlannerServiceCrewSpec.bx`

**Interfaces:**
- Consumes: selected role + `files[]` (with `language`, `filePath`, optional `changedLines`)
- Produces: non-empty `task.brief` for `cfml-conventions` / `boxlang-conventions` when deterministic crew path runs (LLM crew briefs still win when present)

**Behavior:**
1. Add `briefForRole( role, files )` used only when `selection.brief` is empty.
2. For `cfml-conventions`: list up to 5 CFML paths (prefer those with `changedLines`), plus a one-line reminder: defects + incremental modernization assist; not a rewrite.
3. For `boxlang-conventions`: list up to 5 BoxLang paths (prefer changed), reminder: framework contracts only.
4. Other roles: leave brief empty (unchanged).
5. Do **not** call an LLM for this.

- [x] **Step 1: Write failing planner spec**

```boxlang
it( "adds a deterministic CFML brief without LLM crew", () => {
	// plan with AI crew off, files including CFML + BoxLang
	// assert cfml-conventions task.brief contains the CFML relative path
	// assert security task.brief is empty (or unchanged)
} );
```

- [x] **Step 2: Run — expect FAIL**

```powershell
box testbox run bundles=tests.specs.unit.ReviewPlannerServiceCrewSpec
```

- [x] **Step 3: Implement `briefForRole` + wire into deterministic `roleQueue` map**

- [x] **Step 4: Re-run planner specs — PASS**

- [x] **Step 5: Commit** (when approved)

```powershell
git commit -m "Add deterministic change briefs for CFML and BoxLang convention specialists."
```

---

### Task 9: Emphasized CF/BX packs prefer changed lines — COMPLETE

**Files:**
- Modify: `app/models/services/ReviewPlannerService.bx` (`emphasizeFilesForRole`, `emphasizedContextFile`)
- Modify: `tests/specs/unit/ReviewPlannerServiceCrewSpec.bx` (and/or a small dedicated unit)

**Problem today:** `emphasizedContextFile` admits the **first N lines** of a scanned file when the shared context pack omitted it. For large CFCs that wastes the specialist budget away from the diff.

**Behavior:**
1. When building an emphasized admission and `file.changedLines` is a non-empty array, build ranges from those windows (clamp with existing `beforeLines` / `afterLines` / `maxLinesPerRange` settings — mirror `ContextPackService` clamps; do not invent a second budget system).
2. Fall back to current “lines 1..maxLinesPerRange” only when no `changedLines`.
3. In `emphasizeFilesForRole` for `cfml-conventions` / `boxlang-conventions`: **sort/prefer** files that have `changedLines` before unchanged same-language files (still cap at 8).
4. Leave `security` emphasize as `matches = false` (changed-line pack already drives security); do not reopen that debate in this task.

- [ ] **Step 1: Write failing unit**

```boxlang
it( "admits emphasized CFML files around changedLines not from line 1", () => {
	// invoke contextFilesForSelection / emphasized path with a CFML file
	// changedLines: [{ startLine: 40, endLine: 42 }], long lines[] fixture
	// expect admitted range startLine >= 37 (with default beforeLines) and not startLine == 1 only
} );
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement changed-line windows in `emphasizedContextFile` + prefer-changed ordering**

- [ ] **Step 4: Re-run planner specs — PASS**

- [ ] **Step 5: Commit** (when approved)

```powershell
git commit -m "Prefer Git changed lines when admitting emphasized CFML and BoxLang context."
```

---

### Task 10: CF guidance playbooks + docs/capabilities sync — COMPLETE

**Files:**
- Modify: `app/models/services/RulePlaybookCatalog.bx`
- Modify: `tests` covering catalog / `FindingSolutionService.enrich` (extend existing or small unit)
- Modify: `app/handlers/ApiCapabilities.bx` (`specialistCfmlDepth` label bump)
- Modify: `resources/docs/technical-flow.md` (specialist prompt v3 + briefs + emphasized changed lines)
- Modify: `README.md` only if language-depth sentence needs a honesty tweak
- Modify: `resources/docs/README.md` status line for this plan

**Playbook allowlist (small — YAGNI):** add entries only for ruleIds Task 7 steers CFML modernization assist toward, for example:

| ruleId | Purpose |
|---|---|
| `modernization/encode-for-url` | URL/query encoding vs htmlFormat |
| `modernization/encode-for-html` | HTML body/attr encoding |
| `modernization/cfoutput-nesting` | Nested cfoutput / unsafe attribute output |
| `cfml/evaluate-dynamic` | evaluate() / dynamic include risks (if prompt cites it) |

Keep 3–5 max. Each playbook: short steps + one example. Deterministic FindingService ruleIds stay as-is.

**Capabilities:** bump `specialistCfmlDepth` from `cfml-conventions-llm-v1` → `cfml-conventions-llm-v2` (or `…-prompt-v3`) so the UI/capability snapshot matches measured behavior.

**Docs:** One short subsection under specialist planning: prompt v3 role split, deterministic briefs, emphasized changed-line admission. Explicitly point modernization **workspace** to `2026-07-27-cf-modernization-workspace-design.md` (out of scope here).

- [ ] **Step 1: Failing catalog / enrich tests for new ruleIds**

- [ ] **Step 2: Implement playbooks + capabilities string**

- [ ] **Step 3: Docs sync**

- [ ] **Step 4: Targeted suite**

```powershell
box testbox run bundles=tests.specs.unit.SpecialistAgentsSpec,tests.specs.unit.ReviewPlannerServiceCrewSpec,tests.specs.unit.FindingServiceLanguagePackSpec
```

- [ ] **Step 5: Mark Tasks 7–10 complete in this plan’s status table**

- [ ] **Step 6: Commit** (when approved)

```powershell
git commit -m "Add CFML modernization guidance playbooks and sync specialist depth docs."
```

---

## Self-review checklist

| Spec item | Task | Status |
|---|---|---|
| Language-scoped deterministic rules + tests | Task 1 | Complete |
| UI/export for skipped/truncated discovery | Task 2 | Complete |
| Sensible scan default bump + README tuning | Task 3 | Complete |
| Deterministic emphasizeFiles without LLM | Task 4 | Complete |
| Changed-line preference in ContextPackService | Task 5 | Complete |
| Docs / verification | Task 6 | Complete |
| Specialist prompt v3 (CFML + BoxLang) | Task 7 | Complete |
| Deterministic convention briefs | Task 8 | Complete |
| Emphasized packs prefer changed lines | Task 9 | Complete |
| CF guidance playbooks + docs/capabilities | Task 10 | Complete |

**Out of scope (intentionally):** template-engine rule matching, raising LLM context by default, OCR branding, SaaS, new languages, architecture-graph enrichment, CF modernization **workspace** UI, PR bots, deep JS/Java specialist parity, AiFlight scores/tags.

**Dependency order:** Tasks 1–6 done. Task 7 → 8 → 9 can be mostly sequential (8/9 both touch planner; prefer 7 first so prompts match briefs). Task 10 last (playbook ruleIds + docs).

---

## Execution handoff

**Tasks 1–6:** Done — do not re-run as greenfield work.

**Next:** Tasks 1–10 complete. Specialist BX/CF depth append finished.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?