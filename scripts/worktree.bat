@echo off
REM Git Worktree Batch Script for Parallel AI Development
REM Usage: worktree.bat create branch1 branch2 branch3
REM        worktree.bat merge branch-to-keep

if "%1"=="create" goto create_worktrees
if "%1"=="merge" goto merge_worktree
if "%1"=="list" goto list_worktrees
if "%1"=="clean" goto clean_worktrees
goto usage

:create_worktrees
shift
if "%1"=="" goto usage

REM Check if we're in a git repository
git rev-parse --abbrev-ref HEAD >nul 2>&1
if errorlevel 1 (
    echo Error: Not a git repository.
    exit /b 1
)

REM Get repository name
for /f "tokens=*" %%i in ('git rev-parse --show-toplevel') do set REPO_ROOT=%%i
for %%i in ("%REPO_ROOT%") do set REPO_NAME=%%~ni

REM Set worktree parent directory
set WORKTREE_PARENT=%USERPROFILE%\dev
if not exist "%WORKTREE_PARENT%" mkdir "%WORKTREE_PARENT%"

REM Get current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i

:create_loop
if "%1"=="" goto create_done

set BRANCH_NAME=%1
set TARGET_PATH=%WORKTREE_PARENT%\%REPO_NAME%-%BRANCH_NAME%

echo Processing branch: %BRANCH_NAME%

REM Check if worktree already exists
git worktree list | findstr /C:"%TARGET_PATH%" >nul
if not errorlevel 1 (
    echo Warning: Worktree already exists at %TARGET_PATH%. Skipping branch '%BRANCH_NAME%'.
    shift
    goto create_loop
)

REM Create branch if it doesn't exist
git show-ref --verify --quiet refs/heads/%BRANCH_NAME%
if errorlevel 1 (
    echo Branch '%BRANCH_NAME%' does not exist. Creating it from '%CURRENT_BRANCH%'...
    git branch %BRANCH_NAME%
    if errorlevel 1 (
        echo Error: Failed to create branch '%BRANCH_NAME%'. Skipping.
        shift
        goto create_loop
    )
)

REM Create worktree
echo Creating worktree for branch '%BRANCH_NAME%' at %TARGET_PATH%...
git worktree add "%TARGET_PATH%" %BRANCH_NAME%
if errorlevel 1 (
    echo Error: Failed to create worktree for branch '%BRANCH_NAME%'. Skipping.
    shift
    goto create_loop
)

REM Install dependencies
echo Installing dependencies in worktree for branch '%BRANCH_NAME%'...
cd /d "%TARGET_PATH%"
pnpm install
if errorlevel 1 (
    echo Warning: Failed to install dependencies in '%TARGET_PATH%'.
)

REM Try to open in Cursor
where cursor >nul 2>&1
if not errorlevel 1 (
    start cursor "%TARGET_PATH%"
) else (
    echo Worktree created at: %TARGET_PATH%
)

echo Worktree for branch '%BRANCH_NAME%' created successfully.
echo -----------------------------------------------------

cd /d "%REPO_ROOT%"
shift
goto create_loop

:create_done
echo All worktrees created successfully!
goto end

:merge_worktree
if "%2"=="" goto usage

set BRANCH_TO_KEEP=%2

REM Get repository name
for /f "tokens=*" %%i in ('git rev-parse --show-toplevel') do set REPO_ROOT=%%i
for %%i in ("%REPO_ROOT%") do set REPO_NAME=%%~ni

set WORKTREE_PARENT=%USERPROFILE%\dev
set TARGET_WORKTREE=%WORKTREE_PARENT%\%REPO_NAME%-%BRANCH_TO_KEEP%

REM Check if target worktree exists
if not exist "%TARGET_WORKTREE%" (
    echo Error: No active worktree found for branch '%BRANCH_TO_KEEP%' under %WORKTREE_PARENT%.
    exit /b 1
)

REM Check for uncommitted changes
echo Checking for uncommitted changes in worktree for branch '%BRANCH_TO_KEEP%'...
cd /d "%TARGET_WORKTREE%"
git diff --quiet
if errorlevel 1 (
    echo Changes detected in branch '%BRANCH_TO_KEEP%'. Attempting auto-commit...
    git add .
    git commit -m "chore: auto-commit changes in '%BRANCH_TO_KEEP%' before merge"
    if errorlevel 1 (
        echo Error: Auto-commit failed in branch '%BRANCH_TO_KEEP%'. Aborting merge.
        exit /b 1
    )
    echo Auto-commit successful in branch '%BRANCH_TO_KEEP%'.
) else (
    echo No uncommitted changes found in branch '%BRANCH_TO_KEEP%'.
)

REM Switch to main branch
cd /d "%REPO_ROOT%"
echo Switching to 'main' branch in the main worktree...
git checkout main
if errorlevel 1 (
    echo Error: Failed to switch to 'main' branch.
    exit /b 1
)

REM Merge the target branch
echo Merging branch '%BRANCH_TO_KEEP%' into 'main'...
git merge %BRANCH_TO_KEEP% -m "feat: merge changes from '%BRANCH_TO_KEEP%'"
if errorlevel 1 (
    echo Error: Merge failed. Please resolve conflicts and try again.
    exit /b 1
)

REM Clean up worktrees
echo Cleaning up worktrees and deleting temporary branches...
for /f "tokens=1" %%i in ('git worktree list ^| findstr /C:"%WORKTREE_PARENT%\%REPO_NAME%-"') do (
    set WT_PATH=%%i
    for %%j in ("!WT_PATH!") do set WT_BRANCH=%%~nj
    set WT_BRANCH=!WT_BRANCH:%REPO_NAME%-=!
    
    echo Processing worktree for branch '!WT_BRANCH!' at !WT_PATH!...
    
    REM Remove worktree
    git worktree remove "!WT_PATH!" --force
    if not errorlevel 1 (
        echo Worktree at !WT_PATH! removed.
    ) else (
        echo Warning: Failed to remove worktree at !WT_PATH!.
    )
    
    REM Delete branch (except main)
    if not "!WT_BRANCH!"=="main" (
        git branch -D "!WT_BRANCH!"
        if not errorlevel 1 (
            echo Branch '!WT_BRANCH!' deleted.
        ) else (
            echo Warning: Failed to delete branch '!WT_BRANCH!'.
        )
    )
)

echo Merge complete: Branch '%BRANCH_TO_KEEP%' merged into 'main', and all worktrees cleaned up.
goto end

:list_worktrees
echo Active worktrees:
git worktree list
goto end

:clean_worktrees
echo Cleaning up all worktrees...
for /f "tokens=1" %%i in ('git worktree list ^| findstr /C:"%USERPROFILE%\dev\"') do (
    echo Removing worktree: %%i
    git worktree remove "%%i" --force
)
echo Cleanup complete.
goto end

:usage
echo Git Worktree Script for Parallel AI Development
echo.
echo Usage:
echo   worktree.bat create branch1 branch2 branch3    - Create worktrees for multiple branches
echo   worktree.bat merge branch-to-keep              - Merge a branch and clean up worktrees
echo   worktree.bat list                              - List active worktrees
echo   worktree.bat clean                             - Clean up all worktrees
echo.
echo Examples:
echo   worktree.bat create feature-auth feature-ui feature-api
echo   worktree.bat merge feature-auth
goto end

:end
