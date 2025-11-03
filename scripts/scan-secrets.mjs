import { execSync } from 'node:child_process';

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

function isBinaryOrIgnored(file) {
  return (
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
  const files = getStagedFiles().filter((f) => !isBinaryOrIgnored(f));
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
