#!/bin/bash

# DoubleCheck Command-Line Test Runner for Unix/Linux/macOS
# Runs all tests via miniserver and returns results on the command line
# Usage: ./test.sh [--verbose] [--json] [--junit] [--tap] [--html]

VERBOSE=0
REPORTER="text"
PORT=8585
HOST=127.0.0.1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=1; shift ;;
        --json) REPORTER="json"; shift ;;
        --junit) REPORTER="junit"; shift ;;
        --tap) REPORTER="tap"; shift ;;
        --html) REPORTER="simple"; shift ;;
        --help)
            echo "DoubleCheck Command-Line Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose      Show detailed test output"
            echo "  --json         Output results as JSON instead of plain text"
            echo "  --junit        Output results as JUnit XML instead of plain text"
            echo "  --tap          Output results as TAP format instead of plain text"
            echo "  --html         Output the full HTML report (large; matches the browser view)"
            echo "  --help         Show this help message"
            echo ""
            echo "Default output is TestBox's plain-text reporter, ending in a"
            echo "\"Final Stats\" summary line, e.g.: [Passed: 268] [Failed: 0] [Errors: 0]"
            echo ""
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Find Java
if [ -n "$JAVA_HOME" ] && [ -f "$JAVA_HOME/bin/java" ]; then
    JAVA_CMD="$JAVA_HOME/bin/java"
elif command -v java &> /dev/null; then
    JAVA_CMD="java"
else
    echo -e "${RED}ERROR: Java is not installed${NC}"
    exit 1
fi

# Ensure we're in project root
cd "$(dirname "$0")"

# Check JAR exists
if [ ! -f ".engine/boxlang-miniserver-1.14.0.jar" ]; then
    echo -e "${RED}ERROR: boxlang-miniserver-1.14.0.jar not found${NC}"
    exit 1
fi

echo ""
echo "================================================================================"
echo "Starting DoubleCheck Test Runner"
echo "================================================================================"
echo ""

# Start miniserver in background
[ $VERBOSE -eq 1 ] && echo "[INFO] Starting miniserver..."
$JAVA_CMD -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar miniserver.json >/dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 4

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}ERROR: Failed to start miniserver${NC}"
    exit 1
fi

# Fetch test results
[ $VERBOSE -eq 1 ] && echo "[INFO] Fetching test results..."

TEST_URL="http://$HOST:$PORT/tests/runner.bxm?reporter=$REPORTER&opt_run=true"
RESULTS=$(curl -s "$TEST_URL" 2>/dev/null)

# Kill server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Check if we got results
if [ -z "$RESULTS" ]; then
    echo -e "${RED}ERROR: Failed to fetch test results${NC}"
    exit 1
fi

# Output results
echo "$RESULTS"
echo ""

# Parse results for exit code.
# Only the text reporter's "Final Stats" summary line is checked here - it's the
# one plain-text, reliably-parseable format. simple (HTML) and json are for
# eyeballing/piping, not for this script's exit code.
if [ "$REPORTER" = "text" ]; then
    if echo "$RESULTS" | grep -qE '\[Failed: [1-9][0-9]*\]|\[Errors: [1-9][0-9]*\]'; then
        echo -e "${RED}Tests FAILED${NC}"
        echo "================================================================================"
        exit 1
    else
        echo -e "${GREEN}Tests PASSED${NC}"
        echo "================================================================================"
        exit 0
    fi
else
    # For simple, json, junit, and tap, just output - caller inspects manually
    exit 0
fi
