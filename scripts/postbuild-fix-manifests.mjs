import fs from 'node:fs';
import path from 'node:path';

const targets = [
  '.next/server/app/(chat)/page_client-reference-manifest.js',
];

try {
  for (const t of targets) {
    try {
      const abs = path.resolve(process.cwd(), t);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(abs)) {
        fs.writeFileSync(abs, 'export default {};', 'utf8');
        console.log('[postbuild] created stub:', t);
      } else {
        console.log('[postbuild] exists:', t);
      }
    } catch (e) {
      console.warn('[postbuild] warning for', t, ':', e.message);
      // Continue - don't fail the build on postbuild errors
    }
  }
} catch (e) {
  console.error('[postbuild] fatal error:', e.message);
  process.exit(1);
}
