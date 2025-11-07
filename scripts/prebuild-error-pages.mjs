#!/usr/bin/env node
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensureErrorPages() {
  try {
    // Create .next/export directory if it doesn't exist
    await mkdir('.next/export', { recursive: true });
    
    // Create minimal 500.html that Next.js expects
    const html500 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>500 - Internal Server Error</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 3rem; margin: 0 0 1rem; color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>500</h1>
    <p>Internal Server Error</p>
  </div>
</body>
</html>`;

    await writeFile('.next/export/500.html', html500);
    console.log('✓ Created .next/export/500.html');
  } catch (error) {
    console.error('Failed to create error pages:', error);
    process.exit(1);
  }
}

ensureErrorPages();
