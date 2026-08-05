> Local engineering notes only (gitignored). Verified against
> [commandbox.ortusbooks.com](https://commandbox.ortusbooks.com/testbox-integration/test-runner)
> and [testbox.ortusbooks.com](https://testbox.ortusbooks.com/digging-deeper/reporters) on
> 2026-07-29 — not derived from training memory.

# Running the TestBox suite

## Normal workflow

```powershell
cd C:\Box\DoubleCheck
box server start
box testbox run
```

`box.json` already sets `"testbox": { "runner": "/tests/runner.bxm" }`, a
relative path, so `testbox run` resolves the host/port from the running
CommandBox server automatically — no need to hardcode
`http://localhost:55098/`. `box run-script test` does the same thing (it's
aliased to `!box testbox run` in `box.json` `scripts`).

If the server is external or you want to target a specific port explicitly:

```powershell
testbox run "http://localhost:55098/tests/runner.bxm"
```

## Getting a report on disk (JSON, HTML, JUnit)

`testbox run` supports `outputFormats` (comma list) + `outputFile` to
post-produce report files instead of only printing the CLI summary table:

```powershell
# JSON + JUnit XML, one command
box testbox run outputFormats=json,antjunit outputFile=.tmp/test-results

# JSON + an HTML report
box testbox run outputFormats=json,html outputFile=.tmp/test-results
```

This writes `.tmp/test-results.json` and `.tmp/test-results.xml` (or an HTML
file for the `html`/`simple` format) alongside the usual CLI table. `.tmp/`
is already gitignored in this repo — use it, not the repo root, so nothing
gets accidentally committed.

### Reporter names (verified list, testbox.ortusbooks.com/digging-deeper/reporters)

| Reporter | Output | Notes |
|---|---|---|
| `JSON` | JSON | full result tree; best for scripting/CI parsing |
| `Simple` | HTML | default web-runner reporter; supports editor deep-links (`vscode`, `idea`, `sublime`, ...) |
| `Min` | HTML | minimalistic HTML view |
| `Doc` | HTML | semantic "living documentation" HTML |
| `JUnit` | XML | standard JUnit-compliant, for modern CI |
| `ANTJunit` | XML | ANT `junitreport`-compatible variant, only if the build tool needs it |
| `Text` | plain text | full verbose text, good for deep debugging |
| `MinText` | plain text | minimal, no ANSI — safe for log files |
| `Console` | stdout | supports `hideSkipped` option |
| `XML` | XML | generic XML tree, not JUnit-shaped |
| `Raw` | struct | raw BoxLang/CFML struct, programmatic use only |
| `Dot`, `Tap`, `Codexwiki` | — | deprecated, avoid |

Pick a reporter directly (single format, no file):

```powershell
testbox run reporter=json
testbox run reporter=simple
```

## Filtering what runs

```powershell
# Only one spec bundle (dot-notation path under tests/specs)
box testbox run bundles=tests.specs.unit.ModernizationValidationServiceSpec

# By label
box testbox run labels=unit
box testbox run labels=unit,integration

# One suite / one spec name
box testbox run testSuites=MySuite
box testbox run testSpecs=itShouldDoSomething
```

## Real-time / watch modes

```powershell
# Stream results as specs finish (SSE) instead of waiting for the full suite
box testbox run --streaming
box testbox run --streaming --verbose   # include passing specs too, not just failures

# Re-run automatically on file change (foreground; Ctrl+C to stop)
box testbox watch
```

## Everything else

```powershell
testbox run --help
```

prints every argument (`verbose`, `recurse`, `excludes`, `options:*`, etc.)
and can also be set once in `box.json`'s `testbox` block instead of passed
every time.

## JavaScript tests

`tests/js/*.spec.mjs` — 146 assertions across `modernization-render-helpers`,
`modernization-contract` and `architecture-flow`.

```bash
node --test tests/js/
```

**These are not wired into `box.json`, `package.json` (absent) or CI.** They run
only when invoked by hand, which means a change to `public/assets/*.js` can break
108 assertions with nothing going red. Step 0 of
[plans/modernize-inversion-plan.md](plans/modernize-inversion-plan.md) wires them
into the test script — until then, run them manually alongside `box testbox run`
whenever client JS changes.

## Source of truth vs. `.agents/skills/`

`.agents/skills/testbox-runners/SKILL.md`,
`.agents/skills/testbox-reporters/SKILL.md`, and
`.agents/skills/commandbox-testing/SKILL.md` cover the same ground in more
depth (BoxLang CLI `./testbox/run`, programmatic `TestBox` API, custom
reporters via `IReporter`). Where this file and those disagree on a
reporter's exact output type, trust this file — it was checked against the
live docs on 2026-07-29; the skill catalog is a generated snapshot and may
drift.
