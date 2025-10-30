# Demo script for parallel AI development workflow
# This script demonstrates how to use Git worktrees for parallel AI development

Write-Host "=== Parallel AI Development Demo ===" -ForegroundColor Cyan
Write-Host ""

# Load the worktree functions
Write-Host "Loading worktree functions..." -ForegroundColor Yellow
. .\scripts\worktree-functions.ps1

Write-Host "Functions loaded successfully!" -ForegroundColor Green
Write-Host ""

# Show current git status
Write-Host "Current Git Status:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Demonstrate worktree creation
Write-Host "Creating worktrees for parallel development..." -ForegroundColor Yellow
Write-Host "This will create 3 worktrees for different features:" -ForegroundColor White
Write-Host "  - feature-auth: Authentication improvements" -ForegroundColor Gray
Write-Host "  - feature-ui: UI/UX enhancements" -ForegroundColor Gray
Write-Host "  - feature-api: API optimizations" -ForegroundColor Gray
Write-Host ""

# Create worktrees
try {
    wtree -Branches feature-auth, feature-ui, feature-api -InstallDeps
    Write-Host ""
    Write-Host "Worktrees created successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Show active worktrees
    Write-Host "Active worktrees:" -ForegroundColor Yellow
    git worktree list
    Write-Host ""
    
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Each worktree should now be open in a separate Cursor instance" -ForegroundColor White
    Write-Host "2. In each instance, use Composer to work on the assigned feature" -ForegroundColor White
    Write-Host "3. Use @ to provide context files and give specific tasks" -ForegroundColor White
    Write-Host "4. When ready, merge the best solution with: wtmerge -BranchToKeep <branch-name>" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Example Composer tasks for each worktree:" -ForegroundColor Yellow
    Write-Host "  Feature Auth: 'Improve user authentication flow and add MFA support'" -ForegroundColor Gray
    Write-Host "  Feature UI: 'Enhance the chat interface with better UX patterns'" -ForegroundColor Gray
    Write-Host "  Feature API: 'Optimize API endpoints and add better error handling'" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "To merge a specific branch when ready:" -ForegroundColor Cyan
    Write-Host "  wtmerge -BranchToKeep feature-auth" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Error "Error creating worktrees: $_"
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're in a git repository" -ForegroundColor White
    Write-Host "2. Check if you have uncommitted changes" -ForegroundColor White
    Write-Host "3. Ensure you have write permissions to the parent directory" -ForegroundColor White
}

Write-Host "Demo complete! Check the documentation for more details." -ForegroundColor Green
