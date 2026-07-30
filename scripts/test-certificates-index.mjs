import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCertificateManifest, supportedCertificateExtensions } from './build-certificates-index.mjs';

const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'streamline-certificates-'));
const metadataFile = path.join(fixtureRoot, 'certificates.meta.json');

try {
  await Promise.all([
    writeFile(path.join(fixtureRoot, 'Cloud_Course--Certificate.pdf'), 'pdf fixture'),
    writeFile(path.join(fixtureRoot, 'Visual-Certificate.PNG'), 'image fixture'),
    writeFile(path.join(fixtureRoot, '.hidden.pdf'), 'ignored'),
    writeFile(path.join(fixtureRoot, '~draft.pdf'), 'ignored'),
    writeFile(path.join(fixtureRoot, 'certificate-backup.pdf'), 'ignored'),
    writeFile(path.join(fixtureRoot, 'notes.txt'), 'ignored'),
    writeFile(metadataFile, JSON.stringify({
      certificates: {
        'Cloud_Course--Certificate.pdf': {
          title: 'Cloud Course Certificate',
          issuer: 'Example Issuer',
          date: '2026-07-20',
          featured: true,
          order: 1,
        },
      },
    })),
  ]);

  const first = await buildCertificateManifest({ sourceDir: fixtureRoot, metadataFile });
  assert.equal(first.length, 2, 'Only supported, public certificate files should be indexed');
  assert.deepEqual([...supportedCertificateExtensions].sort(), ['.jpeg', '.jpg', '.pdf', '.png', '.webp']);
  assert.equal(new Set(first.map((item) => item.id)).size, first.length, 'Stable IDs must be unique');
  assert.equal(first[0].title, 'Cloud Course Certificate', 'Metadata should override the generated title');
  assert.equal(first[0].issuer, 'Example Issuer');
  assert.equal(first[0].date, '2026-07-20');
  assert.match(first[0].href, /^\/assets\/Certs\//);
  assert.ok(first.every((item) => !/[A-Z]:\\|\\Users\\/i.test(JSON.stringify(item))), 'Manifest must not expose local paths');
  assert.equal(first.find((item) => item.filename === 'Visual-Certificate.PNG')?.type, 'image');

  await writeFile(path.join(fixtureRoot, 'New Certificate.webp'), 'new image fixture');
  const afterAdd = await buildCertificateManifest({ sourceDir: fixtureRoot, metadataFile });
  assert.equal(afterAdd.length, 3, 'A newly added supported file should appear without metadata edits');
  assert.ok(afterAdd.some((item) => item.href.endsWith('New%20Certificate.webp')), 'New file URL should be safely encoded');

  await rm(path.join(fixtureRoot, 'New Certificate.webp'));
  const afterDelete = await buildCertificateManifest({ sourceDir: fixtureRoot, metadataFile });
  assert.equal(afterDelete.length, 2, 'A deleted certificate should disappear from the generated manifest');
  assert.deepEqual(first.map((item) => item.id).sort(), afterDelete.map((item) => item.id).sort(), 'Unchanged files should retain stable IDs');

  console.log('Certificate index tests passed: add, remove, ignore, metadata, URL, and stable-ID rules.');
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
