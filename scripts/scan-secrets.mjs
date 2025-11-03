import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

function loadSecretsIgnore(cwd = process.cwd()) {
  const file = path.join(cwd, '.secretsignore');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function matchIgnore(file, patterns) {
  // Minimal glob support for common patterns used here
  for (const p of patterns) {
    if (p.endsWith('/**')) {
      const prefix = p.slice(0, -3); // remove /**
      if (file.startsWith(prefix)) return true;
    } else if (p.startsWith('**/*.')) {
      const ext = p.slice(4); // remove **/
      if (file.endsWith(ext)) return true;
    } else if (p.includes('*')) {
      // crude star handling: convert * to .*
      const rx = new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*') + '$');
      if (rx.test(file)) return true;
    } else if (file === p || file.startsWith(p)) {
      return true;
    }
  }
  return false;
}

function isBinaryOrIgnored(file, dynamicIgnores) {
  const hardcoded = (
    file.startsWith('docs/') ||
    file.endsWith('.md') ||
    file.endsWith('.png') ||
    file.endsWith('.jpg') ||
    file.endsWith('.jpeg') ||
    file.endsWith('.gif') ||
    file.endsWith('.svg') ||
    file.startsWith('public/') ||
    file.startsWith('.github/')
  );
  return hardcoded || matchIgnore(file, dynamicIgnores);
}

function hasSecret(content) {
  // Scrub placeholders and env vars
  const scrub = content.replace(/\$[A-Z_]+|<password>|<hostname>/g, '');
  const patterns = [
    /AccountKey=([A-Za-z0-9+/=]{20,})/, // Azure storage/Cosmos keys
    /DefaultEndpointsProtocol=.*AccountKey=([A-Za-z0-9+/=]{20,})/,
    /rediss?:\/\/:\s*([A-Za-z0-9+/=%-]{20,})@[^:\s]+:6380/, // Redis URL with password
  ];
  return patterns.some((rx) => rx.test(scrub));
}

function main() {
  console.log('🔍 Scanning staged files for secrets...');
  const dynamicIgnores = loadSecretsIgnore();
  const files = getStagedFiles().filter((f) => !isBinaryOrIgnored(f, dynamicIgnores));
  if (files.length === 0) {
    console.log('✅ No staged files to scan.');
    return;
  }

  const bad = [];
  for (const f of files) {
    try {
      const content = execSync(`git show :${f}`, { encoding: 'utf8' });
      if (hasSecret(content)) bad.push(f);
    } catch (e) {
      // Skip unreadable files
    }
  }

  if (bad.length) {
    console.error('\n❌ Secrets detected in staged files:\n  - ' + bad.join('\n  - '));
    console.error('Abort. Move secrets to env/Key Vault and commit placeholders.');
    process.exit(1);
  }

  console.log('✅ No secrets in staged files. Push allowed.');
}

try {
  main();
} catch (e) {
  console.error('[scan-secrets] Unexpected error:', e?.message || e);
  process.exit(1);
}
