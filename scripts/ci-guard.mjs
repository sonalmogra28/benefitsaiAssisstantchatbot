// Cross-platform CI guard: skips on Vercel/CI, checks for .env files in git status locally

// Skip on Vercel or CI providers
if (process.env.VERCEL === '1' || process.env.CI === 'true') {
  console.log('[guard] Skipped on CI/Vercel');
  process.exit(0);
}

import { execSync } from 'node:child_process';

try {
  const out = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  if (/\.env(\.|$)/m.test(out)) {
    console.error('DANGER: .env files detected in git status!');
    console.error(out.split('\n').filter(l => l.includes('.env')).join('\n'));
    process.exit(2);
  }
  console.log('[guard] Git working directory clean of .env files');
} catch (e) {
  console.warn('[guard] Non-fatal: unable to run git status on this machine');
}
