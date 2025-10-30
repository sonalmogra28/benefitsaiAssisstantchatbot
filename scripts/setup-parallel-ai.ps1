# Setup script for parallel AI development workflow
# This script sets up the environment for parallel AI development

Write-Host "=== Setting up Parallel AI Development Environment ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
Write-Host "Checking Git repository..." -ForegroundColor Yellow
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Not a git repository. Please run this script from within a git repository."
    exit 1
}
$repoRoot = git rev-parse --show-toplevel
$repoName = Split-Path $repoRoot -Leaf
Write-Host "✓ Git repository found: $repoName (branch: $currentBranch)" -ForegroundColor Green

# Check if pnpm is available
Write-Host "Checking package manager..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "✓ pnpm found" -ForegroundColor Green
} else {
    Write-Warning "⚠ pnpm not found. Please install pnpm for dependency management."
}

# Check if Cursor is available
Write-Host "Checking Cursor IDE..." -ForegroundColor Yellow
if (Get-Command cursor -ErrorAction SilentlyContinue) {
    Write-Host "✓ Cursor found" -ForegroundColor Green
} else {
    Write-Warning "⚠ Cursor not found in PATH. Worktrees will be created but not automatically opened."
}

# Create worktree parent directory
$worktreeParent = "$env:USERPROFILE\dev"
Write-Host "Setting up worktree directory..." -ForegroundColor Yellow
if (!(Test-Path $worktreeParent)) {
    try {
        New-Item -ItemType Directory -Path $worktreeParent -Force | Out-Null
        Write-Host "✓ Created worktree directory: $worktreeParent" -ForegroundColor Green
    } catch {
        Write-Error "❌ Failed to create worktree directory: $worktreeParent"
        exit 1
    }
} else {
    Write-Host "✓ Worktree directory exists: $worktreeParent" -ForegroundColor Green
}

# Load the worktree functions
Write-Host "Loading worktree functions..." -ForegroundColor Yellow
try {
    . .\scripts\worktree-functions.ps1
    Write-Host "✓ Worktree functions loaded successfully" -ForegroundColor Green
} catch {
    Write-Error "❌ Failed to load worktree functions: $_"
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use the following commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Create worktrees for parallel development" -ForegroundColor White
Write-Host "  wtree -Branches feature1, feature2, feature3 -InstallDeps" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Merge the best solution" -ForegroundColor White
Write-Host "  wtmerge -BranchToKeep feature1" -ForegroundColor Gray
Write-Host ""
Write-Host "  # List active worktrees" -ForegroundColor White
Write-Host "  git worktree list" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Run the demo" -ForegroundColor White
Write-Host "  .\scripts\demo-parallel-ai.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor Cyan
Write-Host "  docs/parallel-ai-development-guide.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy parallel coding! 🚀" -ForegroundColor Green