# Parallel AI Development with Git Worktrees

This guide shows you how to run multiple Cursor Composer AI agents in parallel using Git worktrees, enabling faster development and experimentation.

## Overview

The problem with single AI instances:
- Single Composer instances can be slow for complex tasks
- Multiple agents modifying the same files simultaneously lead to conflicts
- Traditional branching can be cumbersome for rapid experimentation

**The Solution: Git Worktrees**

Git worktrees allow you to create multiple, independent working directories linked to the same Git repository. Each worktree can be associated with a different branch, providing isolated environments for development.

## Quick Start

### Method 1: PowerShell Functions (Recommended)

1. **Load the functions:**
   ```powershell
   . .\scripts\worktree-functions.ps1
   ```

2. **Create worktrees for parallel development:**
   ```powershell
   wtree -Branches feature-auth, feature-ui, feature-api -InstallDeps
   ```

3. **Merge the best solution:**
   ```powershell
   wtmerge -BranchToKeep feature-auth
   ```

### Method 2: Batch Script

1. **Create worktrees:**
   ```cmd
   worktree.bat create feature-auth feature-ui feature-api
   ```

2. **Merge the best solution:**
   ```cmd
   worktree.bat merge feature-auth
   ```

## Detailed Workflow

### 1. Create Worktrees

The `wtree` function (or `worktree.bat create`) does the following:
- Creates new branches from your current branch
- Sets up worktrees in `%USERPROFILE%\dev\<project-name>-<branch>`
- Installs dependencies with pnpm (if `-InstallDeps` flag is used)
- Opens each worktree in Cursor (if available)

**Example:**
```powershell
# Create 3 worktrees for different features
wtree -Branches auth-improvements, ui-redesign, api-optimization -InstallDeps
```

This creates:
- `%USERPROFILE%\dev\benefitsaichatbot-383-auth-improvements`
- `%USERPROFILE%\dev\benefitsaichatbot-383-ui-redesign`
- `%USERPROFILE%\dev\benefitsaichatbot-383-api-optimization`

### 2. Parallel AI Development

Each worktree opens in a separate Cursor instance where you can:

1. **Assign specific tasks to Composer:**
   - Use `@` to provide context (files, directories, docs)
   - Give each instance a different focus area
   - Run different approaches to the same problem

2. **Monitor progress:**
   - Check in on each Composer instance
   - No conflicts since they're in separate worktrees
   - Each can work on different ports if running servers

3. **Experiment freely:**
   - Try different AI prompts and approaches
   - Test various solutions simultaneously
   - Compare results in real-time

### 3. Merge the Best Solution

The `wtmerge` function (or `worktree.bat merge`) does the following:
- Commits any uncommitted changes in the target worktree
- Switches to the main branch
- Merges the specified branch into main
- Removes all worktrees and deletes temporary branches

**Example:**
```powershell
# Merge the auth-improvements branch and clean up
wtmerge -BranchToKeep auth-improvements
```

## Advanced Usage

### Custom Worktree Directory

You can specify a custom parent directory:

```powershell
New-Worktree -Branches feature1, feature2 -ParentDir "C:\MyWorktrees"
```

### List Active Worktrees

```powershell
git worktree list
```

Or use the batch script:
```cmd
worktree.bat list
```

### Clean Up All Worktrees

```cmd
worktree.bat clean
```

## Best Practices

### 1. Task Assignment Strategy

- **Feature-based:** Each worktree works on a different feature
- **Approach-based:** Same feature, different implementation approaches
- **Component-based:** Different parts of the same feature

### 2. AI Prompting

- Be specific about the scope for each worktree
- Use `@` to provide relevant context files
- Give each instance a clear, focused task

### 3. Monitoring

- Check progress regularly
- Take notes on which approaches work best
- Don't let worktrees sit idle for too long

### 4. Cleanup

- Always use `wtmerge` to clean up properly
- Don't manually delete worktree directories
- Keep your main project directory clean

## Troubleshooting

### Common Issues

1. **Worktree already exists:**
   - Use `git worktree list` to see active worktrees
   - Remove existing worktrees with `git worktree remove <path>`

2. **Merge conflicts:**
   - Resolve conflicts in the main worktree
   - Use `git status` to see conflicted files

3. **Dependencies not installed:**
   - Use the `-InstallDeps` flag when creating worktrees
   - Or manually run `pnpm install` in each worktree

4. **Cursor not opening worktrees:**
   - Make sure Cursor is in your PATH
   - Or manually open each worktree directory

### PowerShell Execution Policy

If you get execution policy errors:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Examples

### Example 1: Feature Development

```powershell
# Create worktrees for different features
wtree -Branches user-auth, admin-dashboard, api-integration -InstallDeps

# Work on each feature in parallel
# - Worktree 1: Implement user authentication
# - Worktree 2: Build admin dashboard
# - Worktree 3: Create API integrations

# Merge the completed features
wtmerge -BranchToKeep user-auth
```

### Example 2: A/B Testing Approaches

```powershell
# Create worktrees for different approaches
wtree -Branches approach-a, approach-b, approach-c -InstallDeps

# Each worktree implements the same feature differently
# Compare results and pick the best one

# Merge the winning approach
wtmerge -BranchToKeep approach-b
```

### Example 3: Component Development

```powershell
# Create worktrees for different components
wtree -Branches header-component, sidebar-component, main-content -InstallDeps

# Develop each component independently
# Merge when ready

wtmerge -BranchToKeep header-component
```

## Benefits

- **Parallel Development:** Run multiple Composer instances simultaneously
- **Conflict-Free Experimentation:** Isolate different approaches
- **Rapid Iteration:** Quickly test and compare solutions
- **Clean Workspace:** Keep main project directory uncluttered
- **Efficient AI Usage:** Maximize AI productivity with parallel processing

## Integration with Your Project

This workflow is particularly effective for your benefits AI chatbot project because:

1. **Multiple Features:** You can work on authentication, UI improvements, and API enhancements simultaneously
2. **AI-Heavy Development:** Perfect for experimenting with different AI prompts and approaches
3. **Complex Codebase:** Large codebase benefits from parallel development
4. **Rapid Prototyping:** Test different AI integration strategies quickly

## Next Steps

1. Load the PowerShell functions: `. .\scripts\worktree-functions.ps1`
2. Try creating your first worktrees: `wtree -Branches test-feature -InstallDeps`
3. Experiment with parallel AI development
4. Use `wtmerge` to clean up when done

Happy parallel coding! 🚀
