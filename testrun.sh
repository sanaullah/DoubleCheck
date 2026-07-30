#!/bin/bash

# DoubleCheck Test Runner Script for Unix/Linux/macOS
# Runs unit tests via miniserver and opens the test runner in browser
# Usage: ./testrun.sh [--no-browser]

OPEN_BROWSER=1
if [ "$1" = "--no-browser" ]; then
    OPEN_BROWSER=0
fi

# Color codes
BLUE='\033[0;34m'
NC='\033[0m'

# Find Java: JAVA_HOME first, then PATH
if [ -n "$JAVA_HOME" ] && [ -f "$JAVA_HOME/bin/java" ]; then
    JAVA_CMD="$JAVA_HOME/bin/java"
elif command -v java &> /dev/null; then
    JAVA_CMD="java"
else
    echo "ERROR: Java is not installed or not in PATH"
    echo ""
    echo "Please install JDK 21 and either:"
    echo "  1. Add Java bin directory to PATH, or"
    echo "  2. Set JAVA_HOME environment variable"
    echo ""
    echo "Download: https://www.oracle.com/java/technologies/downloads/"
    exit 1
fi

# Ensure we're in the project root directory (script directory)
cd "$(dirname "$0")"

# Check JAR
if [ ! -f ".engine/boxlang-miniserver-1.14.0.jar" ]; then
    echo "ERROR: boxlang-miniserver-1.14.0.jar not found"
    exit 1
fi

echo ""
echo "================================================================================"
echo "Starting DoubleCheck Test Runner"
echo "================================================================================"
echo ""
echo "Starting miniserver..."
echo "Test Runner: http://localhost:8585/tests/runner.bxm"
echo ""

# Start miniserver in background
$JAVA_CMD -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar miniserver.json &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Open browser if requested
if [ $OPEN_BROWSER -eq 1 ]; then
    if command -v open &> /dev/null; then
        # macOS
        open "http://localhost:8585/tests/runner.bxm"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "http://localhost:8585/tests/runner.bxm" 2>/dev/null || true
    fi
fi

echo ""
echo "================================================================================"
echo "Test Runner is running"
echo "================================================================================"
echo ""
echo "Access at: http://localhost:8585/tests/runner.bxm"
echo ""
echo "Available test reporters:"
echo "  ?reporter=simple    - Simple text report"
echo "  ?reporter=json      - JSON format"
echo "  ?reporter=tap       - TAP format"
echo "  ?reporter=junit     - JUnit XML format"
echo ""
echo "Examples:"
echo "  http://localhost:8585/tests/runner.bxm?reporter=json"
echo "  http://localhost:8585/tests/runner.bxm?reporter=junit"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for server process
wait $SERVER_PID

exit 0
