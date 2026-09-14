#!/usr/bin/env bash
# Runs a DoubleCheck review against a project and writes the result as SARIF,
# for uploading to GitHub code scanning (or any SARIF-consuming tool) from a
# self-hosted CI job. Not a hosted service - this expects a DoubleCheck
# server already reachable (start one in the same job, e.g. via
# `box server start` or `startup.sh --no-browser`, before calling this).
#
# Usage:
#   tools/ci-sarif.sh [projectPath] [outputFile]
#
# Env vars:
#   DOUBLECHECK_BASE_URL          Server base URL (default http://127.0.0.1:8585)
#   DOUBLECHECK_REVIEW_MODE       full | working-tree | revision-diff (default full)
#   DOUBLECHECK_FAIL_ON_SEVERITY  Comma list, e.g. "critical,high" - exit 1 if any
#                                  retained finding matches (default: never fail)
#
# Example GitHub Actions step (after starting the server in an earlier step):
#   - name: DoubleCheck review -> SARIF
#     run: tools/ci-sarif.sh . doublecheck-results.sarif
#     env:
#       DOUBLECHECK_FAIL_ON_SEVERITY: critical,high
#   - uses: github/codeql-action/upload-sarif@v3
#     with:
#       sarif_file: doublecheck-results.sarif

set -euo pipefail

PROJECT_PATH="${1:-$(pwd)}"
OUTPUT_FILE="${2:-doublecheck-results.sarif}"
BASE_URL="${DOUBLECHECK_BASE_URL:-http://127.0.0.1:8585}"
MODE="${DOUBLECHECK_REVIEW_MODE:-full}"
FAIL_ON_SEVERITY="${DOUBLECHECK_FAIL_ON_SEVERITY:-}"

echo "[ci-sarif] Queuing $MODE review of $PROJECT_PATH against $BASE_URL"

CREATE_BODY=$(printf '{"projectPath":"%s","mode":"%s"}' "$PROJECT_PATH" "$MODE")
CREATE_RESPONSE=$(curl -sf -X POST "$BASE_URL/api/v1/runs" -H "Content-Type: application/json" -d "$CREATE_BODY")
RUN_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
	echo "[ci-sarif] Failed to create run. Response: $CREATE_RESPONSE" >&2
	exit 1
fi

echo "[ci-sarif] Run $RUN_ID queued, polling for completion..."

for _ in $(seq 1 120); do
	STATUS_RESPONSE=$(curl -sf "$BASE_URL/api/v1/runs/$RUN_ID")
	STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[a-z]*"' | head -1 | cut -d'"' -f4)
	if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "partial" ] || [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
		break
	fi
	sleep 2
done

if [ "$STATUS" != "succeeded" ] && [ "$STATUS" != "partial" ]; then
	echo "[ci-sarif] Run did not complete cleanly (status: ${STATUS:-unknown})" >&2
	exit 1
fi

echo "[ci-sarif] Run completed with status $STATUS, exporting SARIF"
curl -sf "$BASE_URL/api/v1/runs/$RUN_ID/export?format=sarif" -o "$OUTPUT_FILE"
echo "[ci-sarif] Wrote $OUTPUT_FILE"

if [ -n "$FAIL_ON_SEVERITY" ]; then
	RESULT_RESPONSE=$(curl -sf "$BASE_URL/api/v1/runs/$RUN_ID/result")
	IFS=',' read -ra SEVERITIES <<< "$FAIL_ON_SEVERITY"
	for severity in "${SEVERITIES[@]}"; do
		if echo "$RESULT_RESPONSE" | grep -q "\"severity\":\"$(echo "$severity" | xargs)\""; then
			echo "[ci-sarif] Found a retained '$severity' finding; failing per DOUBLECHECK_FAIL_ON_SEVERITY" >&2
			exit 1
		fi
	done
fi

echo "[ci-sarif] Done"
