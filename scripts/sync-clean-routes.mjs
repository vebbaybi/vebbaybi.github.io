import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const domain = 'https://the1807.xyz';
const lastmod = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const pages = [
  { source: 'index.html', route: '/', changefreq: 'weekly', priority: '1.00' },
  { source: 'home.html', route: '/home/', changefreq: 'weekly', priority: '0.95' },
  { source: 'projects.html', route: '/projects/', changefreq: 'weekly', priority: '0.90' },
  { source: 'scroll_paper.html', route: '/scroll_paper/', changefreq: 'monthly', priority: '0.80' },
  { source: 'ai.html', route: '/ai/', changefreq: 'monthly', priority: '0.85' },
  { source: 'robotics.html', route: '/robotics/', changefreq: 'monthly', priority: '0.85' },
  { source: 'chains.html', route: '/chains/', changefreq: 'monthly', priority: '0.80' },
  { source: 'construction.html', route: '/construction/', changefreq: 'monthly', priority: '0.75' },
  { source: 'resume.html', route: '/resume/', changefreq: 'monthly', priority: '0.70' },
  { source: 'resumes.html', route: '/resumes/', changefreq: 'monthly', priority: '0.65' },
  { source: 'contact.html', route: '/contact/', changefreq: 'monthly', priority: '0.60' },
  { source: 'links.html', route: '/links/', changefreq: 'monthly', priority: '0.55' },
  { source: 'tdi.html', route: '/tdi/', changefreq: 'monthly', priority: '0.50' },
  { source: '1807-contractor.html', route: '/1807-contractor/', changefreq: 'monthly', priority: '0.70' },
  { source: '1807osPort/index.html', route: '/1807osPort/', changefreq: 'monthly', priority: '0.85', static: true },
  { source: '1807osPort/ai/index.html', route: '/1807osPort/ai/', changefreq: 'monthly', priority: '0.80', static: true },
  { source: '1807osPort/data/index.html', route: '/1807osPort/data/', changefreq: 'monthly', priority: '0.78', static: true },
  { source: '1807osPort/robotics/index.html', route: '/1807osPort/robotics/', changefreq: 'monthly', priority: '0.78', static: true },
  { source: '1807osPort/chains/index.html', route: '/1807osPort/chains/', changefreq: 'monthly', priority: '0.78', static: true },
  { source: '1807osPort/about/index.html', route: '/1807osPort/about/', changefreq: 'monthly', priority: '0.76', static: true },
  { source: '1807osPort/contractor/index.html', route: '/1807osPort/contractor/', changefreq: 'monthly', priority: '0.76', static: true },
  { source: '1807osPort/resume/index.html', route: '/1807osPort/resume/', changefreq: 'monthly', priority: '0.74', static: true },
  { source: '1807osPort/contact/index.html', route: '/1807osPort/contact/', changefreq: 'monthly', priority: '0.72', static: true },
];

const assetExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.pdf', '.json', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.txt'
]);

function htmlDecode(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferScope(route) {
  if (route.startsWith('/1807osPort/')) return 'os';
  if (route === '/' || route === '/home/') return 'core';
  return 'classic';
}

function inferFamily(route) {
  if (route === '/') return 'root';
  const clean = route.replace(/^\//, '').replace(/\/$/, '');
  if (!clean) return 'root';
  const segments = clean.split('/');
  if (segments[0] === '1807osPort') return segments[1] || 'launcher';
  return segments[0];
}

function classifyAsset(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
  if (['.pdf', '.txt'].includes(ext)) return 'document';
  if (['.json'].includes(ext)) return 'data';
  if (['.mp3', '.wav'].includes(ext)) return 'audio';
  return 'asset';
}

function makeAssetAliases(relativePath) {
  const publicPath = `/${relativePath.replace(/\\/g, '/')}`;
  const baseName = path.basename(relativePath);
  const stem = baseName.replace(path.extname(baseName), '');
  const segments = relativePath.replace(/\\/g, '/').split('/');
  return [...new Set([publicPath, baseName, stem, ...segments])].filter(Boolean);
}

async function readHtmlMeta(sourcePath, route) {
  const filePath = path.join(rootDir, sourcePath);
  const html = await readFile(filePath, 'utf8');
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?/i)
    || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']\s*\/?/i);

  const title = htmlDecode(titleMatch?.[1] || inferFamily(route));
  const description = htmlDecode(descriptionMatch?.[1] || `Page route ${route}`);

  return {
    key: `page:${route}`,
    route,
    source: sourcePath.replace(/\\/g, '/'),
    scope: inferScope(route),
    family: inferFamily(route),
    title,
    description,
  };
}

async function collectAssets(dir, bucket = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectAssets(fullPath, bucket);
      continue;
    }

    const relativePath = path.relative(rootDir, fullPath);
    const ext = path.extname(relativePath).toLowerCase();
    if (!assetExtensions.has(ext)) continue;

    const fileStat = await stat(fullPath);
    bucket.push({
      key: `asset:/${relativePath.replace(/\\/g, '/')}`,
      path: `/${relativePath.replace(/\\/g, '/')}`,
      name: path.basename(relativePath),
      stem: path.basename(relativePath, ext),
      ext: ext.replace('.', ''),
      kind: classifyAsset(relativePath),
      directory: path.dirname(relativePath).replace(/\\/g, '/'),
      bytes: fileStat.size,
      updated: fileStat.mtime.toISOString(),
      aliases: makeAssetAliases(relativePath),
    });
  }

  return bucket;
}

async function writeSiteIndex() {
  const pageIndex = await Promise.all(pages.map((page) => readHtmlMeta(page.source, page.route)));
  const assetIndex = (await collectAssets(path.join(rootDir, 'assets')))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));

  const moduleText = [
    `export const eosSiteGeneratedAt = ${JSON.stringify(new Date().toISOString())};`,
    `export const eosSitePages = ${JSON.stringify(pageIndex, null, 2)};`,
    `export const eosUploads = ${JSON.stringify(assetIndex, null, 2)};`,
    '',
  ].join('\n');

  const outputPath = path.join(rootDir, 'assets', 'js', 'data', 'eos-site-index.js');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, moduleText, 'utf8');
}

async function syncCleanRoutes() {
  for (const page of pages) {
    if (page.route === '/' || page.static) continue;

    const routeDir = path.join(rootDir, page.route.slice(1, -1));
    const targetFile = path.join(routeDir, 'index.html');

    await rm(routeDir, { recursive: true, force: true });
    await mkdir(routeDir, { recursive: true });
    await copyFile(path.join(rootDir, page.source), targetFile);
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.flatMap((page) => [
      '  <url>',
      `    <loc>${domain}${page.route}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(path.join(rootDir, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(path.join(rootDir, '.nojekyll'), '\n', 'utf8');
  await writeSiteIndex();
}

syncCleanRoutes().catch((error) => {
  console.error('Failed to sync clean routes:', error);
  process.exitCode = 1;
});

