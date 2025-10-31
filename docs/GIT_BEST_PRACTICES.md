# Git Best Practices & Workflow

This document outlines the Git workflow and best practices for the Benefits AI Assistant project.

## Branch Strategy

### Main Branches
- **`main`** - Production-ready code. Always stable and deployable.
- **`develop`** - Integration branch for features. Pre-production testing.
- **`staging`** - Staging environment branch. Final QA before production.

### Feature Branches
- **Format**: `feature/description-of-feature`
- **Examples**:
  - `feature/analytics-dashboard`
  - `feature/cms-content-editor`
  - `feature/cosmos-db-integration`

### Bugfix Branches
- **Format**: `bugfix/description-of-bug`
- **Examples**:
  - `bugfix/authentication-timeout`
  - `bugfix/document-versioning-error`

### Hotfix Branches
- **Format**: `hotfix/critical-issue`
- **For production emergencies only**

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting (no functional changes)
- **refactor**: Code restructuring (no behavior change)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling
- **security**: Security-related changes

### Examples

```bash
# Good commit messages
feat(cosmos): add document versioning with rollback capability
fix(auth): resolve token expiration handling
docs(deployment): add production checklist
refactor(api): migrate to repository pattern
perf(db): optimize query pagination with continuation tokens
security(api): implement rate limiting middleware

# Bad commit messages
update files
fix bug
changes
wip
```

### Commit Message Best Practices

1. **Use imperative mood**: "Add feature" not "Added feature"
2. **Capitalize first letter**: "Fix bug" not "fix bug"
3. **No period at end**: "Update docs" not "Update docs."
4. **50 characters or less** for subject line
5. **Blank line** between subject and body
6. **Wrap body at 72 characters**
7. **Explain WHAT and WHY**, not HOW

## Workflow Steps

### 1. Starting New Work

```bash
# Update your local main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugfix
git checkout -b bugfix/bug-description
```

### 2. Making Changes

```bash
# Stage specific files (preferred)
git add path/to/file1.ts path/to/file2.ts

# Or stage all changes (use cautiously)
git add .

# Check what you're committing
git status
git diff --staged

# Commit with descriptive message
git commit -m "feat(scope): add specific feature

- Detailed point 1
- Detailed point 2
- Why this change was needed"
```

### 3. Keeping Branch Updated

```bash
# Fetch latest changes
git fetch origin

# Rebase on main (preferred for clean history)
git rebase origin/main

# Or merge main (if rebase conflicts are complex)
git merge origin/main
```

### 4. Pushing Changes

```bash
# First time push
git push -u origin feature/your-feature-name

# Subsequent pushes
git push

# Force push after rebase (use with caution)
git push --force-with-lease
```

### 5. Creating Pull Request

1. **Push branch to origin**
2. **Go to GitHub/GitLab**
3. **Create Pull Request**
4. **Fill out PR template**:
   - Description of changes
   - Related issue numbers
   - Testing performed
   - Screenshots (if UI changes)
   - Breaking changes noted

### 6. Code Review Process

- **At least 1 approval** required before merge
- **All CI checks must pass**
- **Address review comments**
- **Keep PR focused** (< 500 lines changed ideal)

### 7. Merging

```bash
# Option 1: Squash and merge (for feature branches)
# - Combines all commits into one
# - Clean history on main

# Option 2: Rebase and merge (for small PRs)
# - Maintains individual commits
# - Linear history

# Option 3: Merge commit (for release branches)
# - Preserves branch history
# - Shows when features were merged
```

## File Organization Best Practices

### Directory Structure
```
project/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── documents/     # Resource-based organization
│   │   ├── conversations/
│   │   └── analytics/
│   ├── (auth)/            # Route groups
│   └── admin/             # Admin pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── analytics/        # Feature-specific components
│   └── cms/              # CMS components
├── lib/                   # Utility libraries
│   ├── db/               # Database layer
│   │   └── cosmos/       # Cosmos DB operations
│   │       ├── client.ts
│   │       ├── operations.ts
│   │       └── repositories/
│   ├── rag/              # RAG pipeline
│   ├── security/         # Security utilities
│   └── utils/            # General utilities
├── types/                 # TypeScript type definitions
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── architecture/     # Architecture docs
│   └── deployment/       # Deployment guides
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/              # Utility scripts
```

### File Naming Conventions

- **Components**: `PascalCase.tsx` - `UserProfile.tsx`
- **Utilities**: `kebab-case.ts` - `format-date.ts`
- **Types**: `PascalCase.ts` or `kebab-case.ts` - `User.ts` or `user.types.ts`
- **Tests**: `*.test.ts` or `*.spec.ts` - `user-service.test.ts`
- **Constants**: `SCREAMING_SNAKE_CASE.ts` - `API_ENDPOINTS.ts`
- **Hooks**: `use-camelCase.ts` - `use-user-data.ts`

## Git Ignore Best Practices

### Always Ignore
```
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
.pnp/

# Build outputs
.next/
out/
dist/
build/

# Logs
*.log
logs/

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Temporary
*.tmp
.cache/
```

### Never Commit
- API keys or secrets
- Large binary files (use Git LFS)
- Generated files
- IDE-specific settings (except shared configs)
- Database dumps
- Personal notes or scratch files

## Collaborative Workflow

### Before Starting Work
```bash
# Sync with team
git fetch origin
git pull origin main

# Check for conflicts
git log origin/main..main

# Update dependencies
npm install
```

### Daily Sync
```bash
# Morning routine
git checkout main
git pull origin main
git checkout feature/your-branch
git rebase origin/main

# Evening routine
git add .
git commit -m "feat: daily progress on feature"
git push origin feature/your-branch
```

### Resolving Conflicts
```bash
# During rebase
git rebase origin/main

# If conflicts occur
# 1. Open conflicted files
# 2. Resolve conflicts manually
# 3. Stage resolved files
git add resolved-file.ts

# 4. Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

## Release Process

### Version Tagging
```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0

- Feature 1
- Feature 2
- Bug fixes"

# Push tags
git push origin v1.0.0

# Or push all tags
git push origin --tags
```

### Semantic Versioning
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

## Security Best Practices

### Sensitive Data
```bash
# Check for secrets before commit
git diff --cached | grep -i "password\|secret\|key"

# Use git-secrets to prevent commits
git secrets --scan

# Remove accidentally committed secret
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret" \
  --prune-empty --tag-name-filter cat -- --all
```

### Code Signing
```bash
# Configure GPG signing
git config --global user.signingkey YOUR_GPG_KEY
git config --global commit.gpgsign true

# Sign commits
git commit -S -m "feat: signed commit"
```

## Performance Tips

### Large Files
```bash
# Use Git LFS for large files
git lfs install
git lfs track "*.pdf"
git lfs track "*.psd"
git add .gitattributes
```

### Repository Maintenance
```bash
# Clean up unnecessary files
git gc --aggressive --prune=now

# Check repository size
git count-objects -vH

# Reduce repository size
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Troubleshooting

### Undo Last Commit (Not Pushed)
```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

### Undo Pushed Commit
```bash
# Create revert commit
git revert HEAD
git push origin main
```

### Recover Deleted Branch
```bash
# Find commit hash
git reflog

# Recreate branch
git checkout -b recovered-branch <commit-hash>
```

### Stash Changes
```bash
# Save work in progress
git stash save "WIP: feature description"

# List stashes
git stash list

# Apply stash
git stash apply stash@{0}

# Pop stash (apply and delete)
git stash pop
```

## CI/CD Integration

### Pre-commit Hooks (Husky)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run typecheck && npm run lint",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

### GitHub Actions Example
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

---

## Quick Reference

### Common Commands
```bash
# Check status
git status

# View history
git log --oneline --graph

# Create branch
git checkout -b branch-name

# Switch branch
git checkout branch-name

# Merge branch
git merge feature-branch

# Delete branch
git branch -d feature-branch

# Tag release
git tag -a v1.0.0 -m "Release message"

# Push tags
git push --tags
```

---

**Last Updated**: 2025-10-31  
**Maintainer**: Development Team  
**Review Frequency**: Quarterly
