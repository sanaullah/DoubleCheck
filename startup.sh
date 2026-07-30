#!/bin/bash

# DoubleCheck Startup Script for Unix/Linux/macOS
# Requires: JDK 21 or higher
# Usage: ./startup.sh [--port PORT] [--host HOST] [--console] [--no-browser] [--debug] [--help]

PORT=8585
HOST=127.0.0.1
OPEN_BROWSER=1
DEBUG_MODE=0
CONSOLE_MODE=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo ""
            echo "DoubleCheck - Code Review for BoxLang, ColdFusion, JavaScript, and Java"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --port PORT          Override port (default: 8585)"
            echo "  --host HOST          Override host (default: 127.0.0.1)"
            echo "  --console            Show detailed console output and server logs"
            echo "  --no-browser         Don't open browser on startup"
            echo "  --debug              Enable debug mode"
            echo "  --help               Show this help message"
            echo ""
            exit 0
            ;;
        --port) PORT="$2"; shift 2 ;;
        --host) HOST="$2"; shift 2 ;;
        --console) CONSOLE_MODE=1; shift ;;
        --no-browser) OPEN_BROWSER=0; shift ;;
        --debug) DEBUG_MODE=1; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Find Java: JAVA_HOME first, then PATH
if [ -n "$JAVA_HOME" ] && [ -f "$JAVA_HOME/bin/java" ]; then
    JAVA_CMD="$JAVA_HOME/bin/java"
elif command -v java &> /dev/null; then
    JAVA_CMD="java"
else
    echo -e "${RED}ERROR: Java is not installed or not in PATH${NC}"
    echo ""
    echo "Please install JDK 21 and either:"
    echo "  1. Add Java bin directory to PATH, or"
    echo "  2. Set JAVA_HOME environment variable"
    echo ""
    echo "Download: https://www.oracle.com/java/technologies/downloads/"
    exit 1
fi

# Get Java version
JAVA_VERSION=$($JAVA_CMD -version 2>&1 | head -1)
echo "Java version: $JAVA_VERSION"
echo ""

# Create .env if needed
if [ -f .env ]; then
    [ $CONSOLE_MODE -eq 1 ] && echo "[INFO] Using existing .env file"
elif [ -f .env.example ]; then
    cp .env.example .env
    echo "[INFO] Created .env from .env.example"
fi
echo ""

# Setup debug mode
if [ $DEBUG_MODE -eq 1 ]; then
    export BOXLANG_DEBUG=true
    [ $CONSOLE_MODE -eq 1 ] && echo "[INFO] Debug mode enabled"
fi

# Check JAR
if [ ! -f ".engine/boxlang-miniserver-1.14.0.jar" ]; then
    echo -e "${RED}ERROR: boxlang-miniserver-1.14.0.jar not found${NC}"
    exit 1
fi

# Startup
echo ""
echo "================================================================================"
echo "Starting DoubleCheck Local Code Review"
echo "================================================================================"
echo ""
echo "Server Configuration:"
echo "  Host:     $HOST"
echo "  Port:     $PORT"
echo "  Java:     $JAVA_VERSION"
echo ""

if [ $CONSOLE_MODE -eq 1 ]; then
    # Console mode: show all output
    echo "[INFO] Starting miniserver with console output..."
    echo ""
    $JAVA_CMD -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar miniserver.json
    echo ""
    echo "================================================================================"
    echo "DoubleCheck has stopped"
    echo "================================================================================"
else
    # Background mode: clean output
    echo "[INFO] Starting miniserver in background..."
    $JAVA_CMD -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar miniserver.json &
    SERVER_PID=$!

    sleep 2
    echo -e "${GREEN}[OK]${NC} Server is running on http://$HOST:$PORT"
    echo ""

    [ $OPEN_BROWSER -eq 1 ] && {
        if command -v open &> /dev/null; then
            open "http://$HOST:$PORT"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "http://$HOST:$PORT" 2>/dev/null || true
        fi
    }

    echo "Access: http://$HOST:$PORT"
    echo "Use --console flag for detailed logs"
    echo ""

    wait $SERVER_PID
fi

exit 0
