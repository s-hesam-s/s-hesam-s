import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkProfile } from './check-profile.mjs';

test('checks Markdown and all responsive image sources without fetching external links', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'profile-links-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'image.webp'), 'fixture');
    await writeFile(path.join(root, 'notes.md'), '# Notes');
    await writeFile(path.join(root, 'README.md'), '[Notes](notes.md#notes) [External](https://example.invalid) <picture><source srcset="assets/image.webp 1x, assets/missing.webp 2x"><img src="assets/image.webp"></picture>');
    let result = await checkProfile(root);
    assert.equal(result.documents, 2);
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0], /missing\.webp/);
    await writeFile(path.join(root, 'assets', 'missing.webp'), 'fixture');
    result = await checkProfile(root);
    assert.deepEqual(result.findings, []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects traversal, malformed encoding and empty image files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'profile-links-'));
  try {
    await writeFile(path.join(root, 'empty.png'), '');
    await writeFile(path.join(root, 'README.md'), '[Outside](../outside.md) [Malformed](%zz) ![Empty](empty.png)');
    const result = await checkProfile(root);
    assert.equal(result.findings.length, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});
