import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
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
];

async function syncCleanRoutes() {
  for (const page of pages) {
    if (page.route === '/') continue;

    const routeDir = path.join(rootDir, page.route.slice(1, -1));
    const targetFile = path.join(routeDir, 'index.html');

    await rm(routeDir, { recursive: true, force: true });
    await mkdir(routeDir, { recursive: true });
    await copyFile(path.join(rootDir, page.source), targetFile);
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.flatMap(page => [
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
}

syncCleanRoutes().catch(error => {
  console.error('Failed to sync clean routes:', error);
  process.exitCode = 1;
});
