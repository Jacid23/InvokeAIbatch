@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PAUSE_ON_EXIT=1"
if /i "%~1"=="--no-pause" set "PAUSE_ON_EXIT=0"

REM InvokeAI Batch+: rebuild frontend only (no git - independent copy)
REM - Installs frontend deps with pnpm
REM - Builds UI to invokeai/frontend/web/dist

set "REPO_ROOT=%~dp0"
set "LOGFILE=%REPO_ROOT%update.log"
>"%LOGFILE%" echo InvokeAI batch+ update log - %DATE% %TIME%
>>"%LOGFILE%" echo Repo root: %REPO_ROOT%
>>"%LOGFILE%" echo.

echo.
echo ============================================================
echo  InvokeAI Batch+: Rebuild Frontend
echo  Repo: %REPO_ROOT%
echo ============================================================
echo  Log:  %LOGFILE%
echo.

cd /d "%REPO_ROOT%" || goto :fail

REM --- prerequisites ---
where node >nul 2>nul
if !errorlevel! neq 0 (
	echo ERROR: node not found in PATH.
	>>"%LOGFILE%" echo ERROR: node not found in PATH.
	goto :fail
)
node --version >>"%LOGFILE%" 2>&1

REM --- suppress vite chunk size warnings ---
set "VITE_CFG=invokeai\frontend\web\vite.config.mts"
powershell -NoProfile -Command "(Get-Content '%REPO_ROOT%%VITE_CFG%') -replace 'chunkSizeWarningLimit: \d+', 'chunkSizeWarningLimit: 4000' | Set-Content '%REPO_ROOT%%VITE_CFG%'" >nul 2>nul

REM --- rebuild frontend ---
echo.
echo [1/2] Installing frontend deps and building UI...
if not exist "invokeai\frontend\web\package.json" (
	echo ERROR: Expected frontend at invokeai\frontend\web\package.json
	>>"%LOGFILE%" echo ERROR: frontend not found.
	goto :fail
)

cd /d "%REPO_ROOT%invokeai\frontend\web" || goto :fail

set "COREPACK_ENABLE_AUTO_PIN=0"
set "COREPACK_ENABLE_STRICT=0"

REM Find pnpm
set "PNPM_CMD="
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
	set "PNPM_CMD=pnpm"
) else (
	where corepack >nul 2>nul
	if !errorlevel! equ 0 set "PNPM_CMD=corepack pnpm"
)

if not defined PNPM_CMD (
	echo ERROR: Neither pnpm nor corepack found in PATH.
	>>"%LOGFILE%" echo ERROR: pnpm not found.
	goto :fail
)

echo Using: !PNPM_CMD!
call !PNPM_CMD! --version
>>"%LOGFILE%" echo pnpm: !PNPM_CMD!

echo.
echo Running: pnpm install --frozen-lockfile
call !PNPM_CMD! install --frozen-lockfile
if !errorlevel! neq 0 (
	echo pnpm install --frozen-lockfile failed, retrying without --frozen-lockfile...
	>>"%LOGFILE%" echo WARNING: --frozen-lockfile failed, retrying.
	call !PNPM_CMD! install
	if !errorlevel! neq 0 (
		echo ERROR: pnpm install failed.
		>>"%LOGFILE%" echo ERROR: pnpm install failed.
		goto :fail
	)
)

echo.
echo Running: vite build
call npx vite build
if !errorlevel! neq 0 (
	echo ERROR: vite build failed.
	>>"%LOGFILE%" echo ERROR: vite build failed.
	goto :fail
)

REM Verify the build produced output
if not exist "%REPO_ROOT%invokeai\frontend\web\dist\index.html" (
	echo ERROR: Build completed but dist\index.html not found.
	>>"%LOGFILE%" echo ERROR: dist\index.html missing after build.
	goto :fail
)

cd /d "%REPO_ROOT%"

echo.
echo [2/2] Done.
echo UI output: invokeai\frontend\web\dist
echo.
>>"%LOGFILE%" echo SUCCESS - %DATE% %TIME%
if "%PAUSE_ON_EXIT%"=="1" pause
endlocal & exit /b 0

:fail
echo.
echo FAILED.
echo See log: %LOGFILE%
echo.
>>"%LOGFILE%" echo FAILED - %DATE% %TIME%
if "%PAUSE_ON_EXIT%"=="1" pause
endlocal & exit /b 1
