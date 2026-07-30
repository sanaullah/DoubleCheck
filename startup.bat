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
set JAVA_CMD=java

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
call :check_java
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
echo   startup.bat --port 9000 --no-browser
echo   startup.bat --debug
echo.
exit /b 0

:check_java
REM First try to find java in PATH
where java >nul 2>&1
if errorlevel 1 (
    REM Java not in PATH, try JAVA_HOME
    if not "!JAVA_HOME!"=="" (
        set JAVA_CMD=!JAVA_HOME!\bin\java
        if not exist !JAVA_CMD! (
            call :java_not_found
            exit /b 1
        )
    ) else (
        call :java_not_found
        exit /b 1
    )
)

REM Get Java version
for /f "tokens=*" %%i in ('!JAVA_CMD! -version 2^>^&1 ^| findstr /R "version"') do (
    set JAVA_VERSION=%%i
)

if "!JAVA_VERSION!"=="" (
    echo ERROR: Could not determine Java version
    exit /b 1
)

REM Extract major version number
for /f "tokens=2 delims= " %%i in ("%JAVA_VERSION%") do (
    set VERSION_STR=%%i
)
for /f "tokens=1 delims=." %%i in ("%VERSION_STR%") do (
    set MAJOR_VERSION=%%i
)

if "!MAJOR_VERSION!"=="" (
    echo ERROR: Could not determine Java version
    echo Version output: !JAVA_VERSION!
    exit /b 1
)

REM Check if version is 21 or higher
if %MAJOR_VERSION% LSS 21 (
    echo ERROR: Java version too old
    echo Current: !JAVA_VERSION!
    echo Required: JDK 21 or higher
    echo.
    echo Download from: https://www.oracle.com/java/technologies/downloads/
    exit /b 1
)

echo Java version: !JAVA_VERSION!
echo.
exit /b 0

:java_not_found
echo ERROR: Java (JDK 21 or higher) is not installed or not in PATH
echo.
echo Solutions:
echo.
echo 1. Add Java to PATH:
echo    - Install JDK 21 from: https://www.oracle.com/java/technologies/downloads/
echo    - Add C:\Program Files\Java\jdk-21.X.X\bin to your PATH
echo.
echo 2. OR set JAVA_HOME environment variable:
echo    - setx JAVA_HOME "C:\Program Files\Java\jdk-21.X.X"
echo    - Then restart your terminal
echo.
echo 3. OR Use BoxLang's Java:
echo    - setx JAVA_HOME "C:\boxlang"
echo    - Then run this script again
echo.
exit /b 1

:setup_env
REM Create .env from .env.example if .env doesn't exist
if exist .env (
    if %CONSOLE_MODE%==1 echo [INFO] Using existing .env file
) else (
    if exist .env.example (
        copy .env.example .env >nul
        echo [INFO] Created .env from .env.example
    ) else (
        echo [WARN] .env.example not found
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
    echo ERROR: boxlang-miniserver-1.14.0.jar not found
    echo Expected location: .engine\boxlang-miniserver-1.14.0.jar
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
echo   JAR:      .engine\boxlang-miniserver-1.14.0.jar
echo.

if %CONSOLE_MODE%==1 (
    echo [INFO] Starting miniserver with console output...
    echo.
    %JAVA_CMD% -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar
    echo.
    echo ================================================================================
    echo DoubleCheck has stopped
    echo ================================================================================
) else (
    REM Run miniserver in background and wait
    start "DoubleCheck Server" /B %JAVA_CMD% -Xmx1024m -jar .engine\boxlang-miniserver-1.14.0.jar

    REM Wait for server to start
    timeout /t 3 /nobreak >nul

    echo [INFO] Server is starting...
    echo [INFO] Open your browser to: http://%HOST%:%PORT%
    echo.

    if %OPEN_BROWSER%==1 (
        echo [INFO] Opening browser...
        start http://%HOST%:%PORT%
    )

    echo.
    echo ================================================================================
    echo DoubleCheck is running
    echo ================================================================================
    echo.
    echo Access the application at: http://%HOST%:%PORT%
    echo Press Ctrl+C to stop the server
    echo Use --console flag to see detailed logs
    echo.

    REM Keep process running
    :wait_loop
    timeout /t 5 /nobreak >nul
    goto wait_loop
)

exit /b 0

endlocal
