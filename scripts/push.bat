@echo off
REM TradeUp Validate and Push (Windows)
REM Usage: push.bat [--verify] [--quick]
REM   --verify: Wait and verify deployment after push
REM   --quick:  Skip wait, verify immediately (for re-checking)

cd /d "%~dp0\.."

set VERIFY=0
set QUICK=0

:parse_args
if "%~1"=="" goto :start
if "%~1"=="--verify" set VERIFY=1
if "%~1"=="-v" set VERIFY=1
if "%~1"=="--quick" set QUICK=1
if "%~1"=="-q" set QUICK=1
shift
goto :parse_args

:start
echo ============================================================
echo TradeUp Push to Production
echo ============================================================
echo.

echo [1/3] Running pre-deployment validation...
python scripts\validate.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLOCKED] Validation failed - push cancelled
    echo Fix the issues above before pushing.
    exit /b 1
)

echo.
echo [2/3] Pushing to main...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FAILED] Git push failed
    exit /b 1
)

echo.
echo [PUSHED] Railway will auto-deploy from main branch.

if %VERIFY%==1 (
    echo.
    echo [3/3] Verifying deployment...
    if %QUICK%==1 (
        python scripts\verify_deploy.py --quick
    ) else (
        python scripts\verify_deploy.py
    )
) else (
    echo.
    echo TIP: Run with --verify to auto-check deployment
    echo      Or run: python scripts\verify_deploy.py --quick
)
