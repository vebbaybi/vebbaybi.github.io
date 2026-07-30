import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.basename(root).toLowerCase() === 'hydrion_page';
const siteRoot = standalone ? root : path.join(root, 'hydrion');
const release = JSON.parse(await readFile(path.join(root, standalone ? 'assets/data/releases.json' : 'assets/data/hydrion/releases.json'), 'utf8'));
const requiredPages = [
  'index.html',
  'download/index.html',
  'docs/index.html',
  'docs/install/index.html',
  'docs/getting-started/index.html',
  'docs/hydration/index.html',
  'docs/challenges/index.html',
  'docs/troubleshooting/index.html',
  'releases/index.html',
  'releases/v1.1.0-rc.1/index.html',
  'privacy/index.html'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

function routeToFile(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return path.join(siteRoot, 'index.html');
  if (!standalone && clean.startsWith('/') && !clean.startsWith('/hydrion/') && !clean.startsWith('/assets/')) {
    return clean.endsWith('/')
      ? path.join(root, clean.slice(1), 'index.html')
      : path.join(root, clean.slice(1));
  }
  const withoutPrefix = clean.replace(/^\/hydrion(?=\/|$)/, '') || '/';
  if (withoutPrefix.startsWith('/assets/')) return path.join(root, withoutPrefix.slice(1));
  if (withoutPrefix.endsWith('/')) return path.join(siteRoot, `${withoutPrefix.slice(1)}index.html`);
  return path.join(siteRoot, withoutPrefix.slice(1));
}

const htmlByFile = new Map();
for (const relative of requiredPages) {
  const file = path.join(siteRoot, relative);
  assert(await exists(file), `Missing required page: ${relative}`);
  htmlByFile.set(relative, await readFile(file, 'utf8'));
}

for (const [relative, html] of htmlByFile) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert(new Set(ids).size === ids.length, `Duplicate ID in ${relative}`);
  assert((html.match(/<h1(?:\s|>)/g) || []).length === 1, `${relative} must have exactly one H1`);
  assert((html.match(/<main(?:\s|>)/g) || []).length === 1, `${relative} must have one main landmark`);
  assert((html.match(/<title>/g) || []).length === 1, `${relative} must have one title`);
  assert(/<link rel="canonical" href="https:\/\/the1807\.xyz\/hydrion\//.test(html), `${relative} has an invalid canonical URL`);
  assert(html.includes('Hydrion is a product of The 1807.'), `${relative} is missing ownership copy`);
  assert(html.includes('A product by The 1807'), `${relative} is missing the product lockup`);
  assert(!/Hydrion (owns|publishes|is the parent of) The 1807/i.test(html), `${relative} reverses ownership`);
  assert(!/href="#"/.test(html), `${relative} contains a placeholder link`);
  assert(!/[A-Z]:\\|Users\\|OneDrive/i.test(html), `${relative} contains a local machine path`);
  assert(!/(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY)/.test(html), `${relative} appears to expose a secret`);

  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const href of links) {
    if (/^(https?:|mailto:|data:)/.test(href) || href.startsWith('#')) continue;
    const target = routeToFile(href);
    assert(await exists(target), `${relative} has broken internal resource: ${href}`);
  }

  for (const href of links.filter((value) => value.startsWith('#'))) {
    assert(ids.includes(href.slice(1)), `${relative} has a missing fragment target: ${href}`);
  }
}

const allHtml = [...htmlByFile.values()].join('\n');
for (const value of [release.displayVersion, release.downloadUrl, release.repositoryUrl, release.discordUrl, release.sha256]) {
  assert(allHtml.includes(value), `Required release value is absent: ${value}`);
}
assert(allHtml.includes('release candidate') || allHtml.includes('Release candidate'), 'RC1 channel is missing');
assert(!/RC1\s+(?:is|as)\s+(?:a\s+)?(?:final\s+)?stable/i.test(allHtml), 'RC1 is incorrectly presented as stable');
assert(!/download count|user count|five-star|award-winning/i.test(allHtml), 'Unverified marketing metric found');

const assetFiles = [];
async function collect(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) await collect(full);
    else assetFiles.push(path.relative(root, full).replaceAll('\\', '/'));
  }
}
await collect(path.join(root, 'assets'));
assert(assetFiles.includes('assets/the1807.png'), 'The 1807 logo is missing');
assert(assetFiles.includes('assets/images/hydrion.png'), 'Hydrion logo is missing');
assert(assetFiles.filter((file) => file.startsWith('assets/images/hydrion/screenshots/')).length >= 5, 'Genuine screenshot set is incomplete');

console.log(`Hydrion site checks passed: ${requiredPages.length} pages, ${assetFiles.length} assets.`);
