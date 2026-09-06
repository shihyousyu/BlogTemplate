// Run manually after adding/removing/renaming a post or album:
//   node engine/contentScanner.js
// Only .md/.yaml/.yml get indexed, so photos can sit next to album.yaml
// without polluting the manifest.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYAML } from './yamlLite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_EXTENSIONS = new Set(['.md', '.yaml', '.yml']);

function walk(dir, base = dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'manifest.json') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full, base));
        } else if (CONTENT_EXTENSIONS.has(path.extname(entry.name))) {
            out.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return out;
}

function main() {
    const contentConfigText = fs.readFileSync(path.join(ROOT, 'config/content.yaml'), 'utf8');
    const { categories } = parseYAML(contentConfigText);

    for (const [name, def] of Object.entries(categories || {})) {
        const categoryDir = path.join(ROOT, 'content', def.path);
        if (!fs.existsSync(categoryDir)) {
            console.warn(`[contentScanner] skipping "${name}": ${categoryDir} does not exist`);
            continue;
        }
        const files = walk(categoryDir).sort();
        const manifestPath = path.join(categoryDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify({ files }, null, 2) + '\n');
        console.log(`[contentScanner] ${name}: wrote ${files.length} file(s) to ${path.relative(ROOT, manifestPath)}`);
    }
}

main();
