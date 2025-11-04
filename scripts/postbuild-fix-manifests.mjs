import fs from 'node:fs';
import path from 'node:path';

const targets = [
  '.next/server/app/(chat)/page_client-reference-manifest.js',
];

for (const t of targets) {
  const abs = path.resolve(process.cwd(), t);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(abs, 'export default {};', 'utf8');
    console.log('[postbuild] created stub:', t);
  } else {
    console.log('[postbuild] exists:', t);
  }
}
