const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const exts = new Set(['.ts', '.tsx']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function toSameFolderRelative(filePath, spec) {
  if (!spec.startsWith('@/')) return spec;
  const targetAbs = path.join(srcRoot, spec.slice(2));
  if (path.dirname(targetAbs) !== path.dirname(filePath)) return spec;
  return `./${path.basename(spec)}`;
}

const patterns = [
  /(\bfrom\s*["'])(@\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(@\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(@\/[^"']+)(["']\s*\))/g,
  /(\bexport\s*\*\s*from\s*["'])(@\/[^"']+)(["'])/g,
  /(\bexport\s*\{[^}]*\}\s*from\s*["'])(@\/[^"']+)(["'])/g,
];

let filesChanged = 0;
let importsRewritten = 0;

for (const filePath of walk(srcRoot)) {
  const original = fs.readFileSync(filePath, 'utf8');
  let next = original;

  for (const rx of patterns) {
    next = next.replace(rx, (m, p1, spec, p3) => {
      const rewritten = toSameFolderRelative(filePath, spec);
      if (rewritten !== spec) {
        importsRewritten++;
        return `${p1}${rewritten}${p3}`;
      }
      return m;
    });
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8');
    filesChanged++;
  }
}

console.log(`filesChanged=${filesChanged}`);
console.log(`importsRewritten=${importsRewritten}`);
