# Git Worktree Functions for Parallel AI Development
# Usage: Import with: . .\scripts\worktree-functions.ps1

# Function to create worktrees for parallel development
function New-Worktree {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Branches,
        [switch]$InstallDeps,
        [string]$ParentDir = "$env:USERPROFILE\dev"
    )

    # Ensure at least one branch name is provided
    if ($Branches.Count -eq 0) {
        Write-Error "Usage: New-Worktree -Branches branch1, branch2, ... [-InstallDeps]"
        return
    }

    # Check if we're in a git repository
    try {
        $currentBranch = git rev-parse --abbrev-ref HEAD
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Error: Not a git repository."
            return
        }
    }
    catch {
        Write-Error "Error: Not a git repository."
        return
    }

    # Determine repository root and name
    try {
        $repoRoot = git rev-parse --show-toplevel
        $repoName = Split-Path $repoRoot -Leaf
    }
    catch {
        Write-Error "Error: Cannot determine repository root."
        return
    }

    # Ensure the worktree parent directory exists
    if (!(Test-Path $ParentDir)) {
        try {
            New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
        }
        catch {
            Write-Error "Error: Failed to create worktree parent directory: $ParentDir"
            return
        }
    }

    # Process each branch
    foreach ($branch in $Branches) {
        $targetPath = Join-Path $ParentDir "${repoName}-${branch}"
        
        Write-Host "Processing branch: $branch" -ForegroundColor Cyan

        # Check if worktree already exists
        $existingWorktrees = git worktree list
        if ($existingWorktrees -match [regex]::Escape($targetPath)) {
            Write-Warning "Worktree already exists at $targetPath. Skipping branch '$branch'."
            continue
        }

        # Create branch if it doesn't exist
        $branchExists = git show-ref --verify --quiet "refs/heads/$branch"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Branch '$branch' does not exist. Creating it from '$currentBranch'..."
            git branch $branch
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Error: Failed to create branch '$branch'. Skipping."
                continue
            }
        }

        # Create the worktree
        Write-Host "Creating worktree for branch '$branch' at $targetPath..."
        git worktree add $targetPath $branch
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Error: Failed to create worktree for branch '$branch'. Skipping."
            continue
        }

        # Install dependencies if requested
        if ($InstallDeps) {
            Write-Host "Installing dependencies in worktree for branch '$branch'..."
            Push-Location $targetPath
            try {
                pnpm install
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "Warning: Failed to install dependencies in '$targetPath'."
                }
            }
            finally {
                Pop-Location
            }
        }

        # Try to open in Cursor if available
        if (Get-Command cursor -ErrorAction SilentlyContinue) {
            Start-Process cursor -ArgumentList $targetPath
        }
        else {
            Write-Host "Worktree created at: $targetPath" -ForegroundColor Green
        }

        Write-Host "Worktree for branch '$branch' created successfully." -ForegroundColor Green
        Write-Host "-----------------------------------------------------"
    }
}

# Function to merge worktree changes and clean up
function Merge-Worktree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BranchToKeep,
        [string]$ParentDir = "$env:USERPROFILE\dev"
    )

    # Determine repository root and name
    try {
        $repoRoot = git rev-parse --show-toplevel
        $repoName = Split-Path $repoRoot -Leaf
    }
    catch {
        Write-Error "Error: Not a git repository."
        return
    }

    # Get all worktrees
    $worktrees = @()
    $worktreeList = git worktree list
    foreach ($line in $worktreeList) {
        $wtPath = ($line -split '\s+')[0]
        if ($wtPath -like "$ParentDir\$repoName-*") {
            $worktrees += $wtPath
        }
    }

    # Find target worktree
    $targetWorktree = $worktrees | Where-Object { $_ -eq "$ParentDir\$repoName-$BranchToKeep" }
    if (!$targetWorktree) {
        Write-Error "Error: No active worktree found for branch '$BranchToKeep' under $ParentDir."
        return
    }

    # Check for uncommitted changes in target worktree
    Write-Host "Checking for uncommitted changes in worktree for branch '$BranchToKeep'..."
    Push-Location $targetWorktree
    try {
        $hasChanges = $false
        $gitDiff = git diff --quiet
        $gitDiffCached = git diff --cached --quiet
        
        if ($LASTEXITCODE -ne 0 -or $gitDiffCached -ne 0) {
            $hasChanges = $true
        }

        if ($hasChanges) {
            Write-Host "Changes detected in branch '$BranchToKeep'. Attempting auto-commit..."
            git add .
            git commit -m "chore: auto-commit changes in '$BranchToKeep' before merge"
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Error: Auto-commit failed in branch '$BranchToKeep'. Aborting merge."
                return
            }
            Write-Host "Auto-commit successful in branch '$BranchToKeep'." -ForegroundColor Green
        }
        else {
            Write-Host "No uncommitted changes found in branch '$BranchToKeep'."
        }
    }
    finally {
        Pop-Location
    }

    # Switch to main branch
    Write-Host "Switching to 'main' branch in the main worktree..."
    git checkout main
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Failed to switch to 'main' branch."
        return
    }

    # Merge the target branch
    Write-Host "Merging branch '$BranchToKeep' into 'main'..."
    git merge $BranchToKeep -m "feat: merge changes from '$BranchToKeep'"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Merge failed. Please resolve conflicts and try again."
        return
    }

    # Clean up worktrees
    Write-Host "Cleaning up worktrees and deleting temporary branches..."
    foreach ($wt in $worktrees) {
        $wtBranch = Split-Path $wt -Leaf
        $wtBranch = $wtBranch -replace "^$repoName-", ""

        Write-Host "Processing worktree for branch '$wtBranch' at $wt..."
        
        # Remove worktree
        git worktree remove $wt --force
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Worktree at $wt removed." -ForegroundColor Green
        }
        else {
            Write-Warning "Warning: Failed to remove worktree at $wt."
        }

        # Delete branch (except main)
        if ($wtBranch -ne "main") {
            git branch -D $wtBranch
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Branch '$wtBranch' deleted." -ForegroundColor Green
            }
            else {
                Write-Warning "Warning: Failed to delete branch '$wtBranch'."
            }
        }
    }

    Write-Host "Merge complete: Branch '$BranchToKeep' merged into 'main', and all worktrees cleaned up." -ForegroundColor Green
}

# Create aliases for easier usage
Set-Alias -Name wtree -Value New-Worktree
Set-Alias -Name wtmerge -Value Merge-Worktree

Write-Host "Worktree functions loaded successfully!" -ForegroundColor Green
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  wtree -Branches feature1, feature2, feature3 -InstallDeps" -ForegroundColor White
Write-Host "  wtmerge -BranchToKeep feature1" -ForegroundColor White
