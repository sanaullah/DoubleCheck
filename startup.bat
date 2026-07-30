@echo off
setlocal enabledelayedexpansion

REM DoubleCheck Startup Script for Windows
REM Requires: JDK 21 or higher
REM Usage: startup.bat [--port PORT] [--host HOST] [--no-browser] [--console] [--debug] [--help]

set PORT=8585
set HOST=127.0.0.1
set OPEN_BROWSER=1
set DEBUG_MODE=0
set CONSOLE_MODE=0

REM Parse command-line arguments
:parse_args
if "%~1"=="" goto after_args
if "%~1"=="--help" (
    call :show_usage
    exit /b 0
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
if "%~1"=="--console" (
    set CONSOLE_MODE=1
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

:after_args
call :find_java
if errorlevel 1 exit /b 1

call :setup_env
call :launch_server
exit /b 0

REM ============================================================================
REM SUBROUTINES
REM ============================================================================

:show_usage
echo.
echo DoubleCheck - Code Review for BoxLang, ColdFusion, JavaScript, and Java
echo.
echo Usage: startup.bat [OPTIONS]
echo.
echo Options:
echo   --port PORT          Override port (default: 8585)
echo   --host HOST          Override host (default: 127.0.0.1)
echo   --console            Show detailed console output and server logs
echo   --no-browser         Don't open browser on startup
echo   --debug              Enable debug mode
echo   --help               Show this help message
echo.
echo Examples:
echo   startup.bat
echo   startup.bat --console
echo   startup.bat --port 9000 --console
echo.
exit /b 0

:find_java
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
for /f "tokens=*" %%i in ('%JAVA_EXE% -version 2^>^&1 ^| findstr /R "version"') do (
    set JAVA_VERSION=%%i
)
echo Java version: %JAVA_VERSION%
echo.
exit /b 0

:setup_env
REM Create .env from .env.example if .env doesn't exist
if exist .env (
    if %CONSOLE_MODE%==1 echo [INFO] Using existing .env file
) else (
    if exist .env.example (
        copy .env.example .env >nul
        echo [INFO] Created .env from .env.example
    )
)
echo.

if %DEBUG_MODE%==1 (
    set BOXLANG_DEBUG=true
    if %CONSOLE_MODE%==1 echo [INFO] Debug mode enabled
) else (
    set BOXLANG_DEBUG=false
)
exit /b 0

:launch_server
REM Check if JAR exists
if not exist .engine\boxlang-miniserver-1.14.0.jar (
    echo ERROR: boxlang-miniserver-1.14.0.jar not found at .engine\boxlang-miniserver-1.14.0.jar
    exit /b 1
)

echo.
echo ================================================================================
echo Starting DoubleCheck Local Code Review
echo ================================================================================
echo.
echo Server Configuration:
echo   Host:     %HOST%
echo   Port:     %PORT%
echo   Java:     %JAVA_VERSION%
echo.

if %CONSOLE_MODE%==1 (
    echo [INFO] Starting miniserver with console output...
    echo.
    %JAVA_EXE% -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar miniserver.json
    echo.
    echo ================================================================================
    echo DoubleCheck has stopped
    echo ================================================================================
) else (
    REM Run miniserver in background
    start "DoubleCheck Server" /B %JAVA_EXE% -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar miniserver.json

    REM Wait for server to start
    timeout /t 3 /nobreak >nul

    echo [OK] Server is running on http://%HOST%:%PORT%
    echo.

    if %OPEN_BROWSER%==1 (
        start http://%HOST%:%PORT%
    )

    echo Access: http://%HOST%:%PORT%
    echo Use --console flag for detailed logs
    echo.

    REM Keep process running
    :wait_loop
    timeout /t 5 /nobreak >nul
    goto wait_loop
)

exit /b 0

endlocal
