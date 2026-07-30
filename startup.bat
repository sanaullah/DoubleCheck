@echo off
setlocal enabledelayedexpansion

REM DoubleCheck Startup Script for Windows
REM Requires: JDK 21 or higher
REM Usage: startup.bat [--port PORT] [--host HOST] [--no-browser] [--debug] [--help]

set PORT=8585
set HOST=127.0.0.1
set OPEN_BROWSER=1
set DEBUG_MODE=0
set SHOW_HELP=0

REM Parse command-line arguments
:parse_args
if "%~1"=="" goto check_java
if "%~1"=="--help" (
    set SHOW_HELP=1
    goto show_usage
)
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--host" (
    set HOST=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--no-browser" (
    set OPEN_BROWSER=0
    shift
    goto parse_args
)
if "%~1"=="--debug" (
    set DEBUG_MODE=1
    shift
    goto parse_args
)
shift
goto parse_args

:show_usage
echo.
echo DoubleCheck - Code Review for BoxLang, ColdFusion, JavaScript, and Java
echo.
echo Usage: startup.bat [OPTIONS]
echo.
echo Options:
echo   --port PORT          Override port (default: 8585)
echo   --host HOST          Override host (default: 127.0.0.1)
echo   --no-browser         Don't open browser on startup
echo   --debug              Enable debug mode
echo   --help               Show this help message
echo.
echo Examples:
echo   startup.bat
echo   startup.bat --port 9000
echo   startup.bat --port 9000 --no-browser
echo   startup.bat --debug
echo.
if "%SHOW_HELP%"=="1" exit /b 0

:check_java
REM Check if Java is installed
for /f "tokens=*" %%i in ('java -version 2^>^&1') do (
    set JAVA_VERSION=%%i
    goto parse_version
)

:parse_version
REM Extract version number (e.g., "21.0.1")
for /f "tokens=2 delims= " %%i in ("%JAVA_VERSION%") do (
    set VERSION_STR=%%i
)
for /f "tokens=1 delims=." %%i in ("%VERSION_STR%") do (
    set MAJOR_VERSION=%%i
)

if "%MAJOR_VERSION%"=="" (
    echo ERROR: Could not determine Java version
    echo.
    echo Please ensure JDK 21 or higher is installed and in your PATH
    echo Download from: https://www.oracle.com/java/technologies/downloads/
    exit /b 1
)

REM Check if version is 21 or higher
if %MAJOR_VERSION% LSS 21 (
    echo ERROR: Java version too old
    echo Current: %JAVA_VERSION%
    echo Required: JDK 21 or higher
    echo.
    echo Download from: https://www.oracle.com/java/technologies/downloads/
    exit /b 1
)

echo Java version: %JAVA_VERSION%
echo.

:setup_env
REM Create .env from .env.example if .env doesn't exist
if exist .env (
    echo Using existing .env file
) else (
    if exist .env.example (
        copy .env.example .env >nul
        echo Created .env from .env.example
    ) else (
        echo WARNING: .env.example not found
    )
)
echo.

:setup_debug
if %DEBUG_MODE%==1 (
    set BOXLANG_DEBUG=true
    echo Debug mode enabled
) else (
    set BOXLANG_DEBUG=false
)

:launch_server
echo Starting DoubleCheck...
echo.

REM Check if JAR exists
if not exist .engine\boxlang-miniserver-1.14.0.jar (
    echo ERROR: boxlang-miniserver-1.14.0.jar not found
    echo Expected location: .engine\boxlang-miniserver-1.14.0.jar
    exit /b 1
)

REM Create miniserver config with port/host (optional, miniserver.json uses defaults)
REM The miniserver.json in project root will be used
echo Launching miniserver on %HOST%:%PORT%...
echo.

REM Launch the miniserver
java -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar

REM If we get here, the server was stopped
echo.
echo DoubleCheck has stopped
exit /b 0

:cleanup
endlocal
