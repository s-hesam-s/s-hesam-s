import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Check the repository's Markdown/HTML destinations locally. External URLs are
// deliberately not fetched: this check never needs network access or credentials.
export async function checkProfile(root) {
  root = path.resolve(root);
  const findings = [];
  let documents = 0;
  let references = 0;
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (['.git', 'node_modules'].includes(item.name)) continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) { await walk(file); continue; }
      if (!/\.md$/i.test(item.name)) continue;
      documents++;
      const text = await readFile(file, 'utf8');
      const targets = [
        ...[...text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]),
        ...[...text.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)].flatMap(m => m[1].split(',').map(v => v.trim().split(/\s+/)[0])),
        ...[...text.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g)].map(m => m[1].replace(/^<|>$/g, '')),
      ];
      for (let target of targets) {
        target = target.replaceAll('&amp;', '&');
        if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
        references++;
        const source = path.relative(root, file).split(path.sep).join('/');
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) {
          findings.push(`${source}: unsupported local destination ${target}`); continue;
        }
        let destination;
        try { destination = decodeURIComponent(target.split(/[?#]/)[0]); }
        catch { findings.push(`${source}: invalid URL encoding ${target}`); continue; }
        const resolved = path.resolve(path.dirname(file), destination);
        const relative = path.relative(root, resolved);
        if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
          findings.push(`${source}: destination leaves repository ${target}`); continue;
        }
        try {
          const info = await stat(resolved);
          if (!info.isFile()) findings.push(`${source}: destination is not a file ${target}`);
          else if (/\.(?:webp|png|jpe?g|gif|svg)$/i.test(destination) && info.size === 0)
            findings.push(`${source}: empty image ${target}`);
        } catch { findings.push(`${source}: missing destination ${target}`); }
      }
    }
  }
  await walk(root);
  if (documents === 0) findings.push('No Markdown documents were checked.');
  return { documents, references, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkProfile(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
  console.log(`${result.documents} documents; ${result.references} local references checked.`);
  for (const finding of result.findings) console.error(finding);
  process.exitCode = result.findings.length ? 1 : 0;
}
