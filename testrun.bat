@echo off
setlocal enabledelayedexpansion

REM DoubleCheck Test Runner Script for Windows
REM Runs unit tests via miniserver and opens the test runner in browser
REM Usage: testrun.bat [--no-browser]

set OPEN_BROWSER=1
if "%~1"=="--no-browser" set OPEN_BROWSER=0

REM Find Java: check JAVA_HOME first, then PATH
if defined JAVA_HOME (
    set JAVA_EXE=!JAVA_HOME!\bin\java.exe
    if exist "!JAVA_EXE!" (
        goto java_found
    )
)

REM Try java from PATH
set JAVA_EXE=java.exe
%JAVA_EXE% -version >nul 2>&1
if %ERRORLEVEL% equ 0 goto java_found

REM Java not found
echo ERROR: Java is not installed or not in PATH
echo.
echo Please install JDK 21 and either:
echo   1. Add Java bin directory to PATH, or
echo   2. Set JAVA_HOME environment variable
echo.
echo Download: https://www.oracle.com/java/technologies/downloads/
exit /b 1

:java_found
REM Ensure we're in the project root directory
cd /d "%~dp0"

REM Check if JAR exists
if not exist .engine\boxlang-miniserver-1.14.0.jar (
    echo ERROR: boxlang-miniserver-1.14.0.jar not found
    exit /b 1
)

echo.
echo ================================================================================
echo Starting DoubleCheck Test Runner
echo ================================================================================
echo.
echo Starting miniserver...
echo Test Runner: http://localhost:8585/tests/runner.bxm
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start miniserver
start "DoubleCheck Test Runner" /B %JAVA_EXE% -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar miniserver.json

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser if requested
if %OPEN_BROWSER%==1 (
    start http://localhost:8585/tests/runner.bxm
)

REM Keep the script running
echo.
echo ================================================================================
echo Test Runner is running
echo ================================================================================
echo.
echo Access at: http://localhost:8585/tests/runner.bxm
echo.
echo Available test reporters:
echo   ?reporter=simple    - Simple text report
echo   ?reporter=json      - JSON format
echo   ?reporter=tap       - TAP format
echo   ?reporter=junit     - JUnit XML format
echo.
echo Press Ctrl+C to stop
echo.

:wait_loop
timeout /t 5 /nobreak >nul
goto wait_loop

endlocal
