@echo off
REM TradeUp Production Status Check (Windows)
REM Quick check of production health without waiting

cd /d "%~dp0\.."

python scripts\verify_deploy.py --quick --retries 1
