import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pages } from './sync-clean-routes.mjs';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const skippedDirs = new Set(['.git', 'node_modules', '.qodo', '.vscode']);
const localRefAttrs = new Set(['href', 'src', 'poster', 'manifest', 'srcset', 'imagesrcset']);
const assetLikeExtensions = new Set(['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.pdf', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.txt', '.webmanifest']);
const findings = [];
const warnings = [];

function rel(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function fail(message) {
  findings.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function walk(dir, bucket = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, bucket);
    } else {
      bucket.push(full);
    }
  }
  return bucket;
}

async function existsCaseSensitive(fullPath) {
  const normalized = path.resolve(fullPath);
  const parsed = path.parse(normalized);
  let current = parsed.root;
  const parts = normalized.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const part of parts) {
    let entries;
    try {
      entries = await readdir(current);
    } catch {
      return false;
    }
    if (!entries.includes(part)) return false;
    current = path.join(current, part);
  }
  return true;
}

function stripQueryAndHash(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function isExternalOrSpecial(value) {
  return /^(https?:|mailto:|tel:|sms:|data:|blob:|javascript:)/i.test(value) || value.startsWith('#');
}

async function checkJsSyntax(jsFiles) {
  for (const file of jsFiles) {
    try {
      await execFileAsync(process.execPath, ['--check', file], { cwd: rootDir, timeout: 30000 });
    } catch (error) {
      fail(`JS syntax check failed: ${rel(file)}\n${error.stderr || error.stdout || error.message}`);
    }
  }
}

function extractImportSpecifiers(source) {
  const specifiers = [];
  const staticPattern = /\b(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticPattern, dynamicPattern]) {
    let match;
    while ((match = pattern.exec(source))) specifiers.push(match[1]);
  }
  return [...new Set(specifiers)];
}

async function checkImports(jsFiles) {
  for (const file of jsFiles) {
    const source = await readFile(file, 'utf8');
    const specs = extractImportSpecifiers(source).filter((spec) => spec.startsWith('./') || spec.startsWith('../'));
    for (const spec of specs) {
      const target = path.resolve(path.dirname(file), spec);
      const candidates = path.extname(target)
        ? [target]
        : [`${target}.js`, `${target}.mjs`, `${target}.json`, path.join(target, 'index.js'), path.join(target, 'index.mjs')];
      const ok = (await Promise.all(candidates.map((candidate) => existsCaseSensitive(candidate)))).some(Boolean);
      if (!ok) fail(`Broken relative import in ${rel(file)}: ${spec}`);
    }
  }
}

function extractAttributes(html) {
  const attrs = [];
  const pattern = /\s([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = pattern.exec(html))) {
    attrs.push({ name: match[1].toLowerCase(), value: match[3] });
  }
  return attrs;
}

function extractAnchors(html) {
  return Array.from(html.matchAll(/<a\b[^>]*>/gi)).map((match) => match[0]);
}

async function routeExists(publicPath) {
  if (publicPath === '/') return existsCaseSensitive(path.join(rootDir, 'index.html'));
  const clean = publicPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return true;
  const indexPath = path.join(rootDir, clean, 'index.html');
  if (await existsCaseSensitive(indexPath)) return true;
  return existsCaseSensitive(path.join(rootDir, `${clean}.html`));
}

async function localReferenceExists(value, fromFile) {
  const clean = stripQueryAndHash(value);
  if (!clean || isExternalOrSpecial(clean)) return true;
  if (clean.startsWith('//')) return true;
  if (clean.startsWith('/')) {
    const ext = path.extname(clean);
    if (!ext || !assetLikeExtensions.has(ext.toLowerCase())) return routeExists(clean);
    return existsCaseSensitive(path.join(rootDir, clean.slice(1)));
  }
  const resolved = path.resolve(path.dirname(fromFile), clean);
  if (path.extname(clean)) return existsCaseSensitive(resolved);
  return existsCaseSensitive(path.join(resolved, 'index.html')) || existsCaseSensitive(`${resolved}.html`);
}

async function checkHtmlFiles(htmlFiles) {
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const attrs = extractAttributes(html);
    for (const attr of attrs) {
      if (!localRefAttrs.has(attr.name)) continue;
      const values = attr.name === 'srcset' || attr.name === 'imagesrcset'
        ? attr.value.split(',').map((item) => item.trim().split(/\s+/)[0])
        : [attr.value];
      for (const value of values) {
        if (!(await localReferenceExists(value, file))) {
          fail(`Broken local reference in ${rel(file)}: ${attr.name}="${value}"`);
        }
      }
    }

    for (const anchor of extractAnchors(html)) {
      const anchorAttrs = Object.fromEntries(extractAttributes(anchor).map((attr) => [attr.name, attr.value]));
      if ((anchorAttrs.target || '').toLowerCase() === '_blank') {
        const relTokens = new Set((anchorAttrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean));
        if (!relTokens.has('noopener') || !relTokens.has('noreferrer')) {
          fail(`External target without noopener/noreferrer in ${rel(file)}: ${anchor}`);
        }
      }
    }

    const inlineEvents = html.match(/\son[a-z]+\s*=/gi) || [];
    if (inlineEvents.length) fail(`Inline event handler found in ${rel(file)}: ${inlineEvents.join(', ')}`);
  }
}

async function checkCssFiles(cssFiles) {
  const pattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
  for (const file of cssFiles) {
    const css = await readFile(file, 'utf8');
    let match;
    while ((match = pattern.exec(css))) {
      const value = match[2];
      if (!(await localReferenceExists(value, file))) {
        fail(`Broken CSS asset reference in ${rel(file)}: url(${value})`);
      }
    }
  }
}

async function checkCleanRoutes() {
  for (const page of pages) {
    const sourcePath = path.join(rootDir, page.source);
    if (!(await existsCaseSensitive(sourcePath))) fail(`Route source missing: ${page.source}`);
    if (page.route === '/') continue;
    const routePath = path.join(rootDir, page.route.slice(1), 'index.html');
    if (!(await existsCaseSensitive(routePath))) fail(`Clean route missing: ${page.route}`);
    if (!page.static) {
      const source = await readFile(sourcePath, 'utf8').catch(() => null);
      const mirrored = await readFile(routePath, 'utf8').catch(() => null);
      if (source !== null && mirrored !== null && source !== mirrored) {
        fail(`Clean route out of sync: ${page.route}`);
      }
    }
  }
}

async function checkSitemap() {
  const xml = await readFile(path.join(rootDir, 'sitemap.xml'), 'utf8');
  const urls = Array.from(xml.matchAll(/<loc>https:\/\/the1807\.xyz([^<]+)<\/loc>/g)).map((match) => match[1]);
  const expected = pages.map((page) => page.route);
  for (const route of expected) {
    if (!urls.includes(route)) fail(`Sitemap missing route: ${route}`);
  }
  for (const route of urls) {
    if (!expected.includes(route)) fail(`Sitemap has unknown route: ${route}`);
  }
}

async function readEosUploads() {
  const source = await readFile(path.join(rootDir, 'assets/js/data/eos-site-index.js'), 'utf8');
  const match = source.match(/export const eosUploads = ([\s\S]*?);\s*$/);
  if (!match) {
    fail('Generated site index is missing eosUploads export');
    return [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`Generated site index eosUploads is not parseable JSON: ${error.message}`);
    return [];
  }
}

async function checkCertIndex() {
  const eosUploads = await readEosUploads();
  const certs = eosUploads.filter((upload) => String(upload.directory || '').replace(/\\/g, '/').toLowerCase() === 'assets/certs');
  if (certs.length === 0) fail('Certificate index has no assets/Certs entries');
  for (const cert of certs) {
    if (cert.directory !== 'assets/Certs') fail(`Certificate directory casing mismatch in index: ${cert.directory}`);
    if (!String(cert.path || '').startsWith('/assets/Certs/')) fail(`Certificate path casing mismatch in index: ${cert.path}`);
    const ext = path.extname(cert.name || cert.path || '').toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf'].includes(ext)) {
      fail(`Unsupported certificate index extension: ${cert.path}`);
    }
  }
}

async function checkOversizedAssets(files) {
  const thresholds = [
    { ext: new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']), bytes: 3 * 1024 * 1024, label: 'large image' },
    { ext: new Set(['.mp4', '.webm', '.mov']), bytes: 12 * 1024 * 1024, label: 'large video' }
  ];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const rule = thresholds.find((item) => item.ext.has(ext));
    if (!rule) continue;
    const info = await stat(file);
    if (info.size > rule.bytes) warn(`${rule.label}: ${rel(file)} (${Math.round(info.size / 1024 / 1024 * 10) / 10} MB)`);
  }
}

async function checkInnerHtml(jsFiles) {
  for (const file of jsFiles) {
    const source = await readFile(file, 'utf8');
    const matches = source.match(/\binnerHTML\b|insertAdjacentHTML|document\.write/gi) || [];
    if (matches.length) warn(`HTML string rendering review: ${rel(file)} (${matches.length})`);
  }
}

async function main() {
  const files = await walk(rootDir);
  const jsFiles = files.filter((file) => ['.js', '.mjs'].includes(path.extname(file).toLowerCase()));
  const htmlFiles = files.filter((file) => path.extname(file).toLowerCase() === '.html');
  const cssFiles = files.filter((file) => path.extname(file).toLowerCase() === '.css');

  await checkJsSyntax(jsFiles);
  await checkImports(jsFiles);
  await checkHtmlFiles(htmlFiles);
  await checkCssFiles(cssFiles);
  await checkCleanRoutes();
  await checkSitemap();
  await checkCertIndex();
  await checkOversizedAssets(files);
  await checkInnerHtml(jsFiles);

  for (const message of warnings) console.warn(`WARN ${message}`);
  if (findings.length) {
    for (const message of findings) console.error(`FAIL ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Audit passed: ${jsFiles.length} JS files, ${htmlFiles.length} HTML files, ${pages.length} routes.`);
  if (warnings.length) console.log(`Warnings: ${warnings.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
