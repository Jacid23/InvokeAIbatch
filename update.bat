@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PAUSE_ON_EXIT=1"
if /i "%~1"=="--no-pause" set "PAUSE_ON_EXIT=0"

REM InvokeAI batch fork: merge upstream/main + rebuild frontend
REM - Fetches upstream/main and merges into feature/batch-tester
REM - Pushes merge to origin (personal fork)
REM - Syncs version from latest upstream tag
REM - Builds UI to invokeai/frontend/web/dist

set "REPO_ROOT=%~dp0"
set "LOGFILE=%REPO_ROOT%update.log"
>"%LOGFILE%" echo InvokeAI batch-fork update log - %DATE% %TIME%
>>"%LOGFILE%" echo Repo root: %REPO_ROOT%
>>"%LOGFILE%" echo.

echo.
echo ============================================================
echo  InvokeAI Batch Fork: Update + Rebuild Frontend
echo  Repo: %REPO_ROOT%
echo ============================================================
echo  Log:  %LOGFILE%
echo.

cd /d "%REPO_ROOT%" || goto :fail

REM --- prerequisites ---
where git >nul 2>nul
if !errorlevel! neq 0 (
	echo ERROR: git not found in PATH.
	>>"%LOGFILE%" echo ERROR: git not found in PATH.
	goto :fail
)
git --version >>"%LOGFILE%" 2>&1

where node >nul 2>nul
if !errorlevel! neq 0 (
	echo ERROR: node not found in PATH.
	>>"%LOGFILE%" echo ERROR: node not found in PATH.
	goto :fail
)
node --version >>"%LOGFILE%" 2>&1

REM --- update repo ---
echo [1/3] Merging upstream/main into feature/batch-tester...
git rev-parse --is-inside-work-tree >nul 2>nul
if !errorlevel! neq 0 (
	echo ERROR: Not a git repository.
	>>"%LOGFILE%" echo ERROR: Not a git repo.
	goto :fail
)

REM Make sure we are on the feature branch
for /f %%B in ('git rev-parse --abbrev-ref HEAD') do set "CUR_BRANCH=%%B"
if "!CUR_BRANCH!" neq "feature/batch-tester" (
	echo Switching to feature/batch-tester...
	git checkout feature/batch-tester
	if !errorlevel! neq 0 (
		echo ERROR: Could not switch to feature/batch-tester.
		>>"%LOGFILE%" echo ERROR: checkout feature/batch-tester failed.
		goto :fail
	)
)

echo Running: git fetch upstream
git fetch upstream
if !errorlevel! neq 0 (
	echo ERROR: git fetch upstream failed.
	>>"%LOGFILE%" echo ERROR: git fetch upstream failed.
	goto :fail
)

echo Running: git fetch upstream --tags
git fetch upstream --tags
if !errorlevel! neq 0 (
	echo WARNING: git fetch tags failed, version sync may use stale tag.
	>>"%LOGFILE%" echo WARNING: git fetch tags failed.
)

REM Check if upstream/main has new commits
git merge-base --is-ancestor upstream/main HEAD >nul 2>nul
if !errorlevel! equ 0 (
	echo upstream/main is already merged - no new upstream commits.
	>>"%LOGFILE%" echo upstream/main already merged.
) else (
	echo Running: git merge upstream/main --no-edit
	git merge upstream/main --no-edit
	if !errorlevel! neq 0 (
		echo ERROR: Merge conflict - resolve manually then re-run.
		>>"%LOGFILE%" echo ERROR: merge upstream/main failed ^(conflict?^).
		goto :fail
	)
	echo Pushing merge to origin...
	git push origin feature/batch-tester
	if !errorlevel! neq 0 (
		echo WARNING: Push to origin failed. Continuing with local build.
		>>"%LOGFILE%" echo WARNING: push to origin failed.
	)
)

echo Running: git submodule update --init --recursive
git submodule update --init --recursive
if !errorlevel! neq 0 (
	echo ERROR: git submodule update failed.
	>>"%LOGFILE%" echo ERROR: git submodule update failed.
	goto :fail
)

REM --- sync version to latest upstream tag ---
echo Syncing version from latest git tag...
set "VER_FILE=invokeai\version\invokeai_version.py"

for /f %%T in ('git tag --list "v6*" --sort=-version:refname') do (
	set "LATEST_TAG=%%T"
	goto :got_tag
)
:got_tag

if not defined LATEST_TAG (
	echo WARNING: No v6* tag found, skipping version sync.
	goto :after_ver
)

set "TAG_VER=!LATEST_TAG:~1!"

for /f "usebackq tokens=*" %%L in ("%REPO_ROOT%%VER_FILE%") do set "VER_LINE=%%L"
echo !VER_LINE! | findstr /c:"!TAG_VER!" >nul 2>nul
if !errorlevel! neq 0 (
	echo Updating version to !TAG_VER! ^(from tag !LATEST_TAG!^)
	>>"%LOGFILE%" echo Updated version to !TAG_VER! from tag !LATEST_TAG!
	>"!REPO_ROOT!!VER_FILE!" echo __version__ = "!TAG_VER!"
)

:after_ver
set "LATEST_TAG="
set "TAG_VER="
set "VER_LINE="

REM --- suppress vite chunk size warnings ---
set "VITE_CFG=invokeai\frontend\web\vite.config.mts"
powershell -NoProfile -Command "(Get-Content '%REPO_ROOT%%VITE_CFG%') -replace 'chunkSizeWarningLimit: \d+', 'chunkSizeWarningLimit: 4000' | Set-Content '%REPO_ROOT%%VITE_CFG%'" >nul 2>nul

REM --- rebuild frontend ---
echo.
echo [2/3] Installing frontend deps and building UI...
if not exist "invokeai\frontend\web\package.json" (
	echo ERROR: Expected frontend at invokeai\frontend\web\package.json
	>>"%LOGFILE%" echo ERROR: frontend not found.
	goto :fail
)

cd /d "%REPO_ROOT%invokeai\frontend\web" || goto :fail

set "COREPACK_ENABLE_AUTO_PIN=0"
set "COREPACK_ENABLE_STRICT=0"

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
echo Running: vite build (skipping upstream lint/tests for local deploy)
call npx vite build
if !errorlevel! neq 0 (
	echo ERROR: vite build failed.
	>>"%LOGFILE%" echo ERROR: vite build failed.
	goto :fail
)

if not exist "%REPO_ROOT%invokeai\frontend\web\dist\index.html" (
	echo ERROR: Build completed but dist\index.html not found.
	>>"%LOGFILE%" echo ERROR: dist\index.html missing after build.
	goto :fail
)

cd /d "%REPO_ROOT%"

echo.
echo [3/3] Done.
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
