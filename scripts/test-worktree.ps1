# Simple test script for worktree functions
Write-Host "Testing worktree functions..." -ForegroundColor Cyan

# Load the functions
. .\scripts\worktree-functions.ps1

Write-Host "Functions loaded successfully!" -ForegroundColor Green

# Test creating a single worktree
Write-Host "Creating test worktree..." -ForegroundColor Yellow
wtree -Branches test-feature -InstallDeps

Write-Host "Test complete!" -ForegroundColor Green
