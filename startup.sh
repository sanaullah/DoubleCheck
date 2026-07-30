#!/bin/bash

# DoubleCheck Startup Script for Unix/Linux/macOS
# Requires: JDK 21 or higher
# Usage: ./startup.sh [--port PORT] [--host HOST] [--no-browser] [--debug] [--help]

set -e

PORT=8585
HOST=127.0.0.1
OPEN_BROWSER=1
DEBUG_MODE=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command-line arguments
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
            echo "  --no-browser         Don't open browser on startup"
            echo "  --debug              Enable debug mode"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0"
            echo "  $0 --port 9000"
            echo "  $0 --port 9000 --no-browser"
            echo "  $0 --debug"
            echo ""
            exit 0
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --no-browser)
            OPEN_BROWSER=0
            shift
            ;;
        --debug)
            DEBUG_MODE=1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}ERROR: Java is not installed or not in PATH${NC}"
    echo ""
    echo "Please install JDK 21 or higher:"
    echo "  - macOS (Homebrew): brew install openjdk@21"
    echo "  - Linux (Ubuntu): sudo apt-get install openjdk-21-jdk"
    echo "  - Download: https://www.oracle.com/java/technologies/downloads/"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1)
MAJOR_VERSION=$(echo "$JAVA_VERSION" | grep -oP '(?<=")[^"]*' | head -1 | cut -d. -f1)

if [ -z "$MAJOR_VERSION" ]; then
    MAJOR_VERSION=$(echo "$JAVA_VERSION" | grep -oP '\d+' | head -1)
fi

if [ -z "$MAJOR_VERSION" ] || ! [[ "$MAJOR_VERSION" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}ERROR: Could not determine Java version${NC}"
    echo "Version output: $JAVA_VERSION"
    echo ""
    echo "Please ensure JDK 21 or higher is installed"
    exit 1
fi

if (( MAJOR_VERSION < 21 )); then
    echo -e "${RED}ERROR: Java version too old${NC}"
    echo "Current: $JAVA_VERSION"
    echo "Required: JDK 21 or higher"
    echo ""
    echo "Download from: https://www.oracle.com/java/technologies/downloads/"
    exit 1
fi

echo -e "${GREEN}Java version: $JAVA_VERSION${NC}"
echo ""

# Setup .env
if [ -f .env ]; then
    echo "Using existing .env file"
else
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env from .env.example"
    else
        echo -e "${YELLOW}WARNING: .env.example not found${NC}"
    fi
fi
echo ""

# Setup debug mode
if [ $DEBUG_MODE -eq 1 ]; then
    export BOXLANG_DEBUG=true
    echo -e "${YELLOW}Debug mode enabled${NC}"
else
    export BOXLANG_DEBUG=false
fi

# Check if JAR exists
if [ ! -f ".engine/boxlang-miniserver-1.14.0.jar" ]; then
    echo -e "${RED}ERROR: boxlang-miniserver-1.14.0.jar not found${NC}"
    echo "Expected location: .engine/boxlang-miniserver-1.14.0.jar"
    exit 1
fi

# Start server
echo -e "${GREEN}Starting DoubleCheck...${NC}"
echo "Server: http://$HOST:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Launch miniserver
java -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar &
SERVER_PID=$!

# Give server time to start
sleep 2

# Open browser if requested
if [ $OPEN_BROWSER -eq 1 ]; then
    if command -v open &> /dev/null; then
        # macOS
        open "http://$HOST:$PORT"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "http://$HOST:$PORT" 2>/dev/null || true
    elif command -v wslview &> /dev/null; then
        # WSL
        wslview "http://$HOST:$PORT" 2>/dev/null || true
    fi
fi

# Wait for server process
wait $SERVER_PID

echo ""
echo -e "${GREEN}DoubleCheck has stopped${NC}"
exit 0
