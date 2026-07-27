# Task 2 Report: Persist and surface skipped / truncated discovery

## Status

DONE

## Implementation

- Added `review_summaries.skipped_json` to fresh schema creation and the existing-database `ensureColumn` upgrade path.
- Extended `ReviewResultRepository.saveSummary()` to persist normalized skip counters and `getResult()` to return `skipped` with zero defaults.
- Passed scanner skip counters from the completed review pipeline into summary persistence.
- Added discovery coverage gaps for oversized files and file-count budget skips while preserving the existing truncation gap.
- Added `discoveryTruncated` and `skipped` to JSON report summaries and a compact Coverage section to Markdown exports.
- Added a compact desktop result indicator for positive skip counts and truncation; the live `review.indexed` event also updates it.
- Added no mobile layouts or breakpoints.

## TDD evidence

### RED: coverage behavior

Command:

```powershell
box testbox run bundles=tests.specs.unit.CoverageAssessmentServiceSpec
```

Result: exit code 1, 1 passed / 1 failed. The new test failed because the reasons only contained `Repository discovery reached its configured limit`; `2 files skipped as oversized` was absent.

### RED: persisted export behavior

Command:

```powershell
box testbox run bundles=tests.specs.integration.ReportExportSpec
```

After correcting a test-only BoxLang hash-literal parse issue, the behavior test failed as expected: exit code 1, 2 passed / 1 failed because the Markdown report did not contain `Coverage`.

### GREEN: coverage behavior

Command:

```powershell
box testbox run bundles=tests.specs.unit.CoverageAssessmentServiceSpec
```

Result: exit code 0, 2 passed / 0 failed.

### GREEN: required targeted suites

Command:

```powershell
box testbox run bundles=tests.specs.unit.CoverageAssessmentServiceSpec,tests.specs.integration.ReportExportSpec
```

Result: exit code 0, 5 passed / 0 failed / 0 errors / 0 skipped.

The integration fixture saves nonzero skip counters, reloads the result through the export API, and verifies both Markdown and JSON output. This exercises the schema upgrade, repository round trip, result API aggregation, and export formatting.

## Additional verification

- `node --check public/assets/app.js`: exit code 0.
- `git diff --check` on all task files: exit code 0.
- IDE diagnostics reported only three existing warnings: an unused private method in `ReviewRunService.bx` and unresolved framework base-class references in the two test bundles. No new errors were reported.

## Files changed

- `app/models/services/SchemaService.bx`
- `app/models/repositories/ReviewResultRepository.bx`
- `app/models/services/ReviewRunService.bx`
- `app/models/services/CoverageAssessmentService.bx`
- `app/models/services/ReportExportService.bx`
- `public/assets/app.js`
- `public/assets/app.css`
- `tests/specs/unit/CoverageAssessmentServiceSpec.bx`
- `tests/specs/integration/ReportExportSpec.bx`
- `.superpowers/sdd/task-2-report.md`

## Concerns

None.
