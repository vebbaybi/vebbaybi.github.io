import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { buildCertificateManifest } from './build-certificates-index.mjs';
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
  const expected = pages.filter((page) => page.sitemap !== false).map((page) => page.route);
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

async function checkCertificateManifest() {
  const manifestPath = path.join(rootDir, 'assets/data/certificates.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    fail(`Certificate manifest is not valid JSON: ${error.message}`);
    return;
  }
  const expected = await buildCertificateManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    fail('Certificate manifest does not exactly match the supported public files in assets/Certs');
  }
  const ids = new Set();
  const hrefs = new Set();
  for (const certificate of manifest) {
    if (ids.has(certificate.id)) fail(`Duplicate certificate ID: ${certificate.id}`);
    if (hrefs.has(certificate.href)) fail(`Duplicate certificate URL: ${certificate.href}`);
    ids.add(certificate.id);
    hrefs.add(certificate.href);
    if (!certificate.href.startsWith('/assets/Certs/')) fail(`Certificate URL escaped assets/Certs: ${certificate.href}`);
    if (/^[a-z]:\\|\\Users\\|file:\/\//i.test(JSON.stringify(certificate))) fail(`Certificate exposes a local path: ${certificate.filename}`);
    if (certificate.type === 'image' && certificate.preview) fail(`Image certificate should use its own href as the preview source: ${certificate.filename}`);
    if (certificate.preview && !certificate.preview.startsWith('/assets/Certs/')) fail(`Certificate preview escaped assets/Certs: ${certificate.preview}`);
  }

  const [credentials, component] = await Promise.all([
    readFile(path.join(rootDir, 'certific8te.html'), 'utf8'),
    readFile(path.join(rootDir, 'assets/js/components/certificate-feed.js'), 'utf8'),
  ]);
  if (!credentials.includes('data-certificate-feed')) fail('certific8te.html does not mount the shared certificate feed');
  if (!credentials.includes('/assets/js/components/certificate-feed.js')) fail('certific8te.html does not load the shared certificate component');
  if (!component.includes('/assets/data/certificates.json')) fail('Shared certificate feed does not consume the generated manifest');
}

function tagAttributeMaps(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern), (match) => Object.fromEntries(extractAttributes(match[0]).map((attr) => [attr.name, attr.value])));
}

async function checkImportantPageSeo() {
  const importantPages = [
    ['index.html', '/'],
    ['work.html', '/work/'],
    ['hub.html', '/hub/'],
    ['hydrion/index.html', '/hydrion/'],
    ['modoroco/index.html', '/modoroco/'],
    ['clipsense/index.html', '/clipsense/'],
    ['about.html', '/about/'],
    ['certific8te.html', '/certific8te/'],
    ['resume.html', '/resume/'],
    ['contact.html', '/contact/'],
  ];
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  for (const [source, route] of importantPages) {
    const html = await readFile(path.join(rootDir, source), 'utf8');
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    const metas = tagAttributeMaps(head, 'meta');
    const links = tagAttributeMaps(head, 'link');
    const named = (name) => metas.find((meta) => meta.name?.toLowerCase() === name)?.content;
    const property = (name) => metas.find((meta) => meta.property?.toLowerCase() === name)?.content;
    const canonical = links.find((link) => link.rel?.toLowerCase().split(/\s+/).includes('canonical'))?.href;
    const title = head.match(/<title>\s*([^<]+?)\s*<\/title>/i)?.[1];
    const description = named('description');
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (!title) fail(`Important route is missing a title: ${route}`);
    if (title && seenTitles.has(title)) fail(`Duplicate important-route title on ${route} and ${seenTitles.get(title)}: ${title}`);
    if (description && seenDescriptions.has(description)) fail(`Duplicate important-route description on ${route} and ${seenDescriptions.get(description)}`);
    if (title) seenTitles.set(title, route);
    if (description) seenDescriptions.set(description, route);
    for (const name of ['description', 'robots', 'theme-color']) {
      if (!named(name)) fail(`Important route is missing meta ${name}: ${route}`);
    }
    for (const name of ['og:title', 'og:description', 'og:image', 'og:url']) {
      if (!property(name)) fail(`Important route is missing ${name}: ${route}`);
    }
    for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      if (!named(name)) fail(`Important route is missing ${name}: ${route}`);
    }
    if (!links.some((link) => link.rel?.toLowerCase().split(/\s+/).includes('icon'))) fail(`Important route is missing a favicon: ${route}`);
    if (canonical !== `https://the1807.xyz${route}`) fail(`Canonical mismatch on ${route}: ${canonical || 'missing'}`);
    if (property('og:url') !== `https://the1807.xyz${route}`) fail(`Open Graph URL mismatch on ${route}: ${property('og:url') || 'missing'}`);
    if (h1Count !== 1) fail(`Important route must have exactly one H1 (${h1Count} found): ${route}`);

    const jsonLdBlocks = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
    for (const block of jsonLdBlocks) {
      try { JSON.parse(block[1]); } catch (error) { fail(`Invalid JSON-LD on ${route}: ${error.message}`); }
    }
  }
}

async function checkCompletionContracts() {
  const [home, hydrion, modoroco, clipsense, neonJs, neonCss, entryJs] = await Promise.all([
    readFile(path.join(rootDir, 'index.html'), 'utf8'),
    readFile(path.join(rootDir, 'hydrion/index.html'), 'utf8'),
    readFile(path.join(rootDir, 'modoroco/index.html'), 'utf8'),
    readFile(path.join(rootDir, 'clipsense/index.html'), 'utf8'),
    readFile(path.join(rootDir, 'assets/js/effects/neon-net.js'), 'utf8'),
    readFile(path.join(rootDir, 'assets/css/effects/neon-net.css'), 'utf8'),
    readFile(path.join(rootDir, 'assets/js/boot.js'), 'utf8'),
  ]);
  if (!home.includes('src="/assets/babydev_nobg.svg"')) fail('Homepage does not use the owner-approved portrait asset');
  if (!home.includes('src="/assets/images/img/logo/logo.png"')) fail('Homepage does not use the official company logo');
  if (!home.includes('src="/assets/images/img/logo/logooss.png"')) fail('Homepage loader does not use the minimal shark');
  if (!home.includes('data-expressive-shark="/assets/images/img/logo/logoos.png"')) fail('Puzzle completion does not use the expressive shark');
  if (/face-nav|face-navigation/i.test(home)) fail('Rejected face navigation remains in the homepage');
  if (/1807os/i.test(home) || /1807os/i.test(entryJs)) fail('1807OS remains in the production entry flow');
  for (const product of ['Hydrion', 'Modoroco', 'ClipSense']) {
    if (!home.includes(`>${product}<`)) fail(`Homepage is missing flagship product: ${product}`);
  }
  if (!entryJs.includes('sessionStorage')) fail('Entry flow does not remember completion for the session');
  if (!entryJs.includes("onSkip: () => revealSite('skipped')")) fail('Puzzle does not provide an accessible skip path');
  if (!hydrion.includes('https://www.instagram.com/hydrionsharks/')) fail('Hydrion Instagram link is missing');
  if (!hydrion.includes('aria-label="Follow Hydrion on Instagram"')) fail('Hydrion Instagram link is not accessibly labeled');
  for (const [name, html] of [['Modoroco', modoroco], ['ClipSense', clipsense]]) {
    if (/href="#"/.test(html)) fail(`${name} contains a dead href="#" link`);
  }
  if (!neonCss.includes('pointer-events: none')) fail('Neon background can intercept pointer input');
  if (!neonCss.includes('prefers-reduced-motion')) fail('Neon background CSS has no reduced-motion behavior');
  if (!neonJs.includes("document.addEventListener('visibilitychange'")) fail('Neon background does not pause with document visibility');
  if (!neonJs.includes('new ResizeObserver')) fail('Neon background is not responsive to viewport changes');
  if (!neonJs.includes('Math.min(window.devicePixelRatio || 1, 1.5)')) fail('Neon background does not cap device pixel ratio');
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
  await checkCertificateManifest();
  await checkImportantPageSeo();
  await checkCompletionContracts();
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
