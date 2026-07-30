#!/bin/bash

# DoubleCheck Startup Script for Unix/Linux/macOS
# Requires: JDK 21 or higher
# Usage: ./startup.sh [--port PORT] [--host HOST] [--console] [--no-browser] [--debug] [--help]

set -e

PORT=8585
HOST=127.0.0.1
OPEN_BROWSER=1
DEBUG_MODE=0
CONSOLE_MODE=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
            echo "  --console            Show detailed console output and server logs"
            echo "  --no-browser         Don't open browser on startup"
            echo "  --debug              Enable debug mode"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0"
            echo "  $0 --console"
            echo "  $0 --port 9000 --console"
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
        --console)
            CONSOLE_MODE=1
            shift
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

# Setup .env
if [ -f .env ]; then
    if [ $CONSOLE_MODE -eq 1 ]; then
        echo -e "${BLUE}[INFO]${NC} Using existing .env file"
    fi
else
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${BLUE}[INFO]${NC} Created .env from .env.example"
    else
        echo -e "${YELLOW}[WARN]${NC} .env.example not found"
    fi
fi

# Setup debug mode
if [ $DEBUG_MODE -eq 1 ]; then
    export BOXLANG_DEBUG=true
    if [ $CONSOLE_MODE -eq 1 ]; then
        echo -e "${BLUE}[INFO]${NC} Debug mode enabled"
    fi
else
    export BOXLANG_DEBUG=false
fi

# Check if JAR exists
if [ ! -f ".engine/boxlang-miniserver-1.14.0.jar" ]; then
    echo -e "${RED}ERROR: boxlang-miniserver-1.14.0.jar not found${NC}"
    echo "Expected location: .engine/boxlang-miniserver-1.14.0.jar"
    exit 1
fi

# Print startup banner
echo ""
echo "================================================================================"
echo "Starting DoubleCheck Local Code Review"
echo "================================================================================"
echo ""
echo "Server Configuration:"
echo "  Host:     $HOST"
echo "  Port:     $PORT"
echo "  Java:     $JAVA_VERSION"
echo "  JAR:      .engine/boxlang-miniserver-1.14.0.jar"
echo ""

# Launch miniserver
if [ $CONSOLE_MODE -eq 1 ]; then
    # Show full console output
    echo -e "${BLUE}[INFO]${NC} Starting miniserver with console output..."
    echo ""
    java -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar
    echo ""
    echo "================================================================================"
    echo "DoubleCheck has stopped"
    echo "================================================================================"
else
    # Run in background and show status
    echo -e "${BLUE}[INFO]${NC} Starting miniserver in background..."
    java -Xmx1024m -jar .engine/boxlang-miniserver-1.14.0.jar &
    SERVER_PID=$!

    # Give server time to start
    sleep 2

    echo -e "${GREEN}[OK]${NC} Server is running (PID: $SERVER_PID)"
    echo ""
    echo "================================================================================"
    echo "DoubleCheck is running"
    echo "================================================================================"
    echo ""
    echo "  URL:              http://$HOST:$PORT"
    echo "  Process ID:       $SERVER_PID"
    echo "  Database:         .db/doublecheck.db"
    echo ""
    echo "To stop the server, press Ctrl+C or run: kill $SERVER_PID"
    echo "To see detailed logs, restart with: $0 --console"
    echo ""

    # Open browser if requested
    if [ $OPEN_BROWSER -eq 1 ]; then
        echo -e "${BLUE}[INFO]${NC} Opening browser..."
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

    echo ""

    # Wait for server process
    wait $SERVER_PID
    EXIT_CODE=$?

    echo ""
    echo "================================================================================"
    echo "DoubleCheck has stopped (Exit Code: $EXIT_CODE)"
    echo "================================================================================"
fi

exit 0
