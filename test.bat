@echo off
setlocal enabledelayedexpansion

REM DoubleCheck Command-Line Test Runner for Windows
REM Runs all tests via miniserver and returns results on the command line
REM Usage: test.bat [--verbose] [--json] [--junit] [--tap] [--html]

set VERBOSE=0
set REPORTER=text
set PORT=8585
set HOST=127.0.0.1

REM Parse arguments
:parse_args
if "%~1"=="" goto after_args
if "%~1"=="--verbose" (
    set VERBOSE=1
    shift
    goto parse_args
)
if "%~1"=="--json" (
    set REPORTER=json
    shift
    goto parse_args
)
if "%~1"=="--junit" (
    set REPORTER=junit
    shift
    goto parse_args
)
if "%~1"=="--tap" (
    set REPORTER=tap
    shift
    goto parse_args
)
if "%~1"=="--html" (
    set REPORTER=simple
    shift
    goto parse_args
)
if "%~1"=="--help" (
    call :show_usage
    exit /b 0
)
shift
goto parse_args

:after_args
call :find_java
if errorlevel 1 exit /b 1

call :cleanup_stale

call :start_server
if errorlevel 1 exit /b 1

call :run_tests
set TEST_RESULT=%ERRORLEVEL%

call :stop_server

exit /b %TEST_RESULT%

REM ============================================================================
REM SUBROUTINES
REM ============================================================================

:show_usage
echo.
echo DoubleCheck Command-Line Test Runner
echo.
echo Usage: test.bat [OPTIONS]
echo.
echo Options:
echo   --verbose      Show server startup details
echo   --json         Output results as JSON instead of plain text
echo   --junit        Output results as JUnit XML instead of plain text
echo   --tap          Output results as TAP format instead of plain text
echo   --html         Output the full HTML report (large; matches the browser view)
echo   --help         Show this help message
echo.
echo Default output is TestBox's plain-text reporter, ending in a
echo "Final Stats" summary line, e.g.: [Passed: 268] [Failed: 0] [Errors: 0]
echo.
exit /b 0

:find_java
if defined JAVA_HOME (
    set JAVA_EXE=!JAVA_HOME!\bin\java.exe
    if exist "!JAVA_EXE!" goto java_found
)

set JAVA_EXE=java.exe
%JAVA_EXE% -version >nul 2>&1
if %ERRORLEVEL% equ 0 goto java_found

echo ERROR: Java is not installed or not in PATH
exit /b 1

:java_found
exit /b 0

:cleanup_stale
REM Kill only whatever is actually bound to our test port (never touch java.exe broadly)
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue).OwningProcess" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
)
exit /b 0

:start_server
cd /d "%~dp0"

if not exist .engine\boxlang-miniserver.jar (
    echo ERROR: boxlang-miniserver.jar not found
    exit /b 1
)

echo.
echo ================================================================================
echo Starting DoubleCheck Test Runner
echo ================================================================================
echo.

if %VERBOSE%==1 echo [INFO] Starting miniserver...

REM Start miniserver and capture its exact PID (do NOT use start /B - it cannot be
REM targeted for cleanup afterward, which is why processes were piling up before)
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "(Start-Process -FilePath '%JAVA_EXE%' -ArgumentList '-Xmx1024m','-jar','.engine\boxlang-miniserver.jar','miniserver.json' -WindowStyle Hidden -PassThru).Id"') do (
    set SERVER_PID=%%p
)

if not defined SERVER_PID (
    echo ERROR: Failed to start miniserver
    exit /b 1
)

if %VERBOSE%==1 echo [INFO] Server PID: %SERVER_PID%

REM Poll for the server to accept connections instead of a blind sleep
set /a WAITED=0
:wait_loop
powershell -NoProfile -Command "exit [int](-not (Test-NetConnection -ComputerName %HOST% -Port %PORT% -InformationLevel Quiet -WarningAction SilentlyContinue))" >nul 2>&1
if %ERRORLEVEL% equ 0 goto server_ready
set /a WAITED+=1
if %WAITED% geq 20 (
    echo ERROR: Server did not become ready on %HOST%:%PORT%
    taskkill /PID %SERVER_PID% /F >nul 2>&1
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_loop

:server_ready
exit /b 0

:run_tests
if %VERBOSE%==1 echo [INFO] Fetching test results (reporter=%REPORTER%)...

set TEST_URL=http://%HOST%:%PORT%/tests/runner.bxm?reporter=%REPORTER%^&opt_run=true
set RESULTS_FILE=%TEMP%\doublecheck_test_results.txt

curl -s "%TEST_URL%" > "!RESULTS_FILE!" 2>nul

if not exist "!RESULTS_FILE!" (
    echo ERROR: Failed to fetch test results
    exit /b 1
)

echo.
type "!RESULTS_FILE!"
echo.

REM Only the text reporter is checked for pass/fail here - simple (HTML), json,
REM junit, and tap are for eyeballing/piping, not for this script's exit code.
REM findstr's regex handling of bracket classes is unreliable (false-matches
REM "[Failed: 0]"), so use PowerShell's regex engine instead.
if "%REPORTER%"=="text" (
    powershell -NoProfile -Command "exit [int]((Get-Content '!RESULTS_FILE!' -Raw) -match '\[Failed: [1-9][0-9]*\]|\[Errors: [1-9][0-9]*\]')"
    if errorlevel 1 (
        echo Tests FAILED
        del "!RESULTS_FILE!" >nul 2>&1
        exit /b 1
    )
    echo Tests PASSED
    del "!RESULTS_FILE!" >nul 2>&1
    exit /b 0
)

del "!RESULTS_FILE!" >nul 2>&1
exit /b 0

:stop_server
REM Kill exactly the PID we started - never a broad java.exe kill
if defined SERVER_PID (
    taskkill /PID %SERVER_PID% /F >nul 2>&1
)
exit /b 0

endlocal
