# GitHub Branch Protection Configuration

## Required Protection Rules for `main` Branch

### **Enable in GitHub Repository Settings → Branches → Add Rule**

**Branch name pattern:** `main`

### ✅ Required Checks

- [x] **Require status checks to pass before merging**
  - Required status checks:
    - `quality-checks / Type Check, Lint, Test`
    - `gitleaks / Gitleaks Secret Scan`
  - [x] Require branches to be up to date before merging

### ✅ Code Review Requirements

- [x] **Require pull request reviews before merging**
  - Required approving reviews: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (if CODEOWNERS file exists)

### ✅ Force Push & Deletion Protection

- [x] **Do not allow bypassing the above settings**
- [x] **Restrict who can push to matching branches**
  - Only repository admins can push directly to `main`
- [x] **Do not allow force pushes**
- [x] **Do not allow deletions**

### ✅ Additional Safeguards

- [x] **Require linear history** (prevent merge commits)
- [x] **Require signed commits** (optional but recommended)
- [x] **Include administrators** (enforce rules on admins too)

---

## Quick Setup Commands (GitHub CLI)

```bash
# Install GitHub CLI if needed
# brew install gh  # macOS
# winget install GitHub.cli  # Windows

# Authenticate
gh auth login

# Enable branch protection
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=quality-checks \
  --field required_status_checks[contexts][]=gitleaks \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field enforce_admins=true \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_linear_history=true
```

---

## Manual Setup (Web UI)

1. Go to: https://github.com/sonalmogra28/benefitsaiAssisstantchatbot/settings/branches
2. Click **"Add branch protection rule"**
3. Set **Branch name pattern**: `main`
4. Check all boxes listed above
5. Click **"Create"** or **"Save changes"**

---

## Verification

After setup, test protection by:

```bash
# This should FAIL (force push blocked)
git push --force origin main

# This should FAIL (direct push blocked without PR + checks)
echo "test" >> README.md
git add README.md
git commit -m "test direct push"
git push origin main
```

Expected result: **Push rejected** with message about required status checks.

---

## Emergency Override

If emergency hotfix needed:

1. Create hotfix branch: `git checkout -b hotfix/critical-fix`
2. Make changes, commit
3. Push: `git push origin hotfix/critical-fix`
4. Create PR (checks will run automatically)
5. Get approval + wait for checks to pass
6. Merge via GitHub UI

**NEVER disable branch protection permanently.**
