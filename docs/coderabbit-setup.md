# CodeRabbit Setup Guide

This guide will help you set up CodeRabbit for automated code reviews on your Benefits AI Assistant project.

## 🚀 Quick Setup

### 1. Install CodeRabbit GitHub App

1. **Go to CodeRabbit**: https://coderabbit.ai
2. **Sign in** with your GitHub account
3. **Install the GitHub App** on your organization or personal account
4. **Select repositories**: Choose "Only select repositories" and pick this repo
5. **Grant permissions**: Allow CodeRabbit to access pull requests and code

### 2. Configuration Files (Already Created)

The following files have been created for you:

- **`.coderabbit.yml`** - Main configuration file
- **`.github/workflows/coderabbit.yml`** - GitHub Actions workflow

### 3. Test the Setup

1. **Create a test branch**:
   ```bash
   git checkout -b test-coderabbit
   git add .
   git commit -m "Add CodeRabbit configuration"
   git push origin test-coderabbit
   ```

2. **Create a Pull Request**:
   - Go to GitHub and create a PR from `test-coderabbit` to `main`
   - CodeRabbit should automatically review the changes

## 📋 Configuration Details

### CodeRabbit Features Enabled

- ✅ **TypeScript & React Reviews**: Full type checking and React best practices
- ✅ **Next.js Specific**: App router, API routes, middleware checks
- ✅ **Security Scanning**: Secret detection, dependency vulnerabilities
- ✅ **Performance Analysis**: Bundle size, rendering optimization
- ✅ **Code Quality**: Complexity, duplication, naming conventions
- ✅ **Documentation**: README, API docs, code comments

### Review Triggers

- **Pull Requests**: Automatic review on open, sync, and reopen
- **Draft PRs**: Reviews enabled for draft pull requests
- **New Commits**: Reviews triggered by new commits
- **New Files**: Reviews triggered by new file additions

### File Coverage

**Included:**
- TypeScript files (`.ts`, `.tsx`)
- JavaScript files (`.js`, `.jsx`)
- Markdown files (`.md`)
- Configuration files (`.json`, `.yml`, `.yaml`)

**Excluded:**
- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `coverage/`
- Lock files (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`)

## 🎯 Focus Areas

CodeRabbit will focus on:

1. **Security**: 
   - Secret detection
   - Dependency vulnerabilities
   - Permission checks

2. **Performance**:
   - Bundle size optimization
   - Rendering performance
   - Memory leak detection

3. **Maintainability**:
   - Code complexity
   - Duplication detection
   - Naming conventions

4. **Accessibility**:
   - ARIA attributes
   - Semantic HTML
   - Keyboard navigation

## 🔧 Customization

### Modify Review Settings

Edit `.coderabbit.yml` to customize:

```yaml
reviews:
  max_comments: 30          # Maximum comments per review
  summarization: brief      # Review summary length
  suggestions: true         # Enable code suggestions
  high_level_feedback: true # High-level architectural feedback
```

### Add Custom Rules

Add project-specific rules in `.coderabbit.yml`:

```yaml
custom_rules:
  - name: "Benefits-specific naming"
    pattern: "benefits|chatbot|assistant"
    message: "Use consistent naming for benefits-related components"
```

### Exclude Specific Files

Add to `path_exclusions` in `.coderabbit.yml`:

```yaml
path_exclusions:
  - "**/test-data/**"
  - "**/fixtures/**"
  - "**/*.test.ts"
```

## 📊 Review Examples

CodeRabbit will provide reviews like:

### Security Issues
```typescript
// ❌ Security Issue
const apiKey = "sk-1234567890abcdef"; // Hardcoded secret

// ✅ Suggested Fix
const apiKey = process.env.OPENAI_API_KEY; // Use environment variable
```

### Performance Issues
```typescript
// ❌ Performance Issue
useEffect(() => {
  fetchData(); // Runs on every render
}, []);

// ✅ Suggested Fix
useEffect(() => {
  fetchData();
}, [dependency]); // Add proper dependencies
```

### Code Quality
```typescript
// ❌ Code Quality Issue
function getData() { /* complex logic */ }

// ✅ Suggested Fix
function getBenefitsData(userId: string, companyId: string) {
  // Clear, descriptive function name
}
```

## 🚨 Troubleshooting

### CodeRabbit Not Reviewing

1. **Check App Installation**: Ensure CodeRabbit is installed on the repository
2. **Check Permissions**: Verify CodeRabbit has access to pull requests
3. **Check Configuration**: Validate `.coderabbit.yml` syntax
4. **Check Workflow**: Ensure GitHub Actions workflow is enabled

### Too Many Comments

1. **Reduce `max_comments`** in `.coderabbit.yml`
2. **Add more exclusions** to `path_exclusions`
3. **Disable specific checks** in the configuration

### Missing Reviews

1. **Check file patterns** in `path_inclusions`
2. **Verify file extensions** are included
3. **Check if files are in excluded directories**

## 📈 Benefits

With CodeRabbit enabled, you'll get:

- **Automated Code Reviews**: Every PR gets reviewed automatically
- **Consistent Quality**: Enforces coding standards across the team
- **Security Scanning**: Catches security issues before they reach production
- **Performance Optimization**: Identifies performance bottlenecks
- **Learning Opportunities**: Team learns best practices through suggestions
- **Time Savings**: Reduces manual review time for common issues

## 🔗 Resources

- [CodeRabbit Documentation](https://docs.coderabbit.ai)
- [GitHub App Installation](https://github.com/apps/coderabbitai)
- [Configuration Reference](https://docs.coderabbit.ai/configuration)
- [Best Practices](https://docs.coderabbit.ai/best-practices)

---

**Next Steps**: After setting up CodeRabbit, create your first PR to see it in action!
