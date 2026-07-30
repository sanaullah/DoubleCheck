<#
.SYNOPSIS
    Watches a project directory and triggers a fast, deterministic-only DoubleCheck
    review on every save, printing new findings to the terminal.

.DESCRIPTION
    Debounced file watcher for a "live second pair of eyes" loop while editing
    BoxLang/ColdFusion/JavaScript/Java source. On each save it queues a
    working-tree run with fast=true (skips crew planning and specialist agents),
    polls the run until it finishes, then prints the findings.

    This is a thin client over the existing local API - no new server-side
    subsystem. See app/models/services/ReviewRunService.bx for the fast option
    and .docs/roadmap-cfml-depth-and-live-loop.md for context.

.PARAMETER ProjectPath
    Repository root to watch and review. Defaults to the current directory.

.PARAMETER BaseUrl
    DoubleCheck server base URL. Defaults to http://127.0.0.1:8585.

.PARAMETER DebounceSeconds
    Seconds to wait after the last file change before queuing a run. Defaults to 2.

.EXAMPLE
    pwsh tools/watch-review.ps1 -ProjectPath C:\Box\DoubleCheck
#>
param(
	[string]$ProjectPath = (Get-Location).Path,
	[string]$BaseUrl = "http://127.0.0.1:8585",
	[int]$DebounceSeconds = 2
)

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path

function Invoke-Review {
	Write-Host "`n[watch-review] Change detected, queuing a fast review..." -ForegroundColor Cyan

	$body = @{
		projectPath = $ProjectPath
		mode        = "working-tree"
		fast        = $true
	} | ConvertTo-Json

	try {
		$created = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/runs" -Body $body -ContentType "application/json"
	} catch {
		Write-Host "[watch-review] Failed to queue run: $_" -ForegroundColor Red
		return
	}

	$runId = $created.data.id
	$deadline = (Get-Date).AddSeconds(60)
	$run = $null
	while ((Get-Date) -lt $deadline) {
		Start-Sleep -Milliseconds 500
		$run = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/runs/$runId"
		if ($run.data.status -in @("succeeded", "partial", "failed", "cancelled")) {
			break
		}
	}

	if ($null -eq $run -or $run.data.status -notin @("succeeded", "partial")) {
		Write-Host "[watch-review] Run did not complete cleanly (status: $($run.data.status))." -ForegroundColor Yellow
		return
	}

	$result = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/runs/$runId/result"
	$findings = $result.data.findings
	if (-not $findings -or $findings.Count -eq 0) {
		Write-Host "[watch-review] No findings." -ForegroundColor Green
		return
	}

	Write-Host "[watch-review] $($findings.Count) finding(s):" -ForegroundColor Yellow
	foreach ($finding in $findings) {
		Write-Host "  [$($finding.severity)] $($finding.ruleId) - $($finding.filePath):$($finding.startLine)"
		Write-Host "    $($finding.title)"
	}
}

Write-Host "[watch-review] Watching $ProjectPath (debounce: ${DebounceSeconds}s). Ctrl+C to stop." -ForegroundColor Cyan

# Excludes DoubleCheck's own runtime state (.db, .tmp) and non-source
# directories (.git, lib, runtime/boxlang_modules) - without this, a review
# run's own writes to .db/doublecheck.db would re-trigger the watcher and
# loop forever.
$script:excludedPathPattern = '[\\/](\.db|\.git|\.tmp|lib|runtime[\\/]boxlang_modules)([\\/]|$)'

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectPath
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.*"
$watcher.EnableRaisingEvents = $true

$lastChange = [DateTime]::MinValue
$action = {
	$changedPath = $Event.SourceEventArgs.FullPath
	if ($changedPath -notmatch $script:excludedPathPattern) {
		$script:lastChange = Get-Date
	}
}
Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

try {
	while ($true) {
		Start-Sleep -Milliseconds 500
		if ($lastChange -ne [DateTime]::MinValue -and ((Get-Date) - $lastChange).TotalSeconds -ge $DebounceSeconds) {
			$lastChange = [DateTime]::MinValue
			Invoke-Review
		}
	}
} finally {
	Get-EventSubscriber | Unregister-Event
	$watcher.Dispose()
}
