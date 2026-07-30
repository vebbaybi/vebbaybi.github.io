import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const defaultSourceDir = path.join(rootDir, 'assets', 'Certs');
const defaultOutputFile = path.join(rootDir, 'assets', 'data', 'certificates.json');
const defaultMetadataFile = path.join(rootDir, 'assets', 'data', 'certificates.meta.json');
export const supportedCertificateExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf']);

const ignoredNames = new Set(['desktop.ini', 'thumbs.db', '.ds_store']);
const ignoredStemPattern = /(?:^|[._\s-])(tmp|temp|temporary|backup|bak|thumbnail|thumb)(?:[._\s-]|$)/i;

function normalizePublicPath(relativePath) {
  return relativePath.split(path.sep).map(encodeURIComponent).join('/');
}

function humanizeFilename(filename) {
  const stem = filename.slice(0, -path.extname(filename).length);
  return stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(ai|api|aws|css|devops|html|ibm|iot|js|pdf|sql|ui|ux)\b/gi, (word) => word.toUpperCase())
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stableId(relativePath) {
  const stem = relativePath.slice(0, -path.extname(relativePath).length);
  const slug = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'certificate';
  const suffix = createHash('sha256').update(relativePath.replace(/\\/g, '/').toLowerCase()).digest('hex').slice(0, 8);
  return `${slug}-${suffix}`;
}

function shouldIgnore(relativePath) {
  const segments = relativePath.split(path.sep);
  const filename = segments.at(-1) || '';
  if (segments.some((segment) => segment.startsWith('.') || segment.startsWith('~'))) return true;
  if (ignoredNames.has(filename.toLowerCase())) return true;
  if (ignoredStemPattern.test(filename)) return true;
  return !supportedCertificateExtensions.has(path.extname(filename).toLowerCase());
}

async function collectCertificateFiles(directory, baseDirectory = directory, bucket = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !entry.name.startsWith('~')) {
        await collectCertificateFiles(fullPath, baseDirectory, bucket);
      }
      continue;
    }
    const relativePath = path.relative(baseDirectory, fullPath);
    if (!shouldIgnore(relativePath)) bucket.push({ fullPath, relativePath });
  }
  return bucket;
}

async function readMetadata(metadataFile) {
  try {
    const parsed = JSON.parse(await readFile(metadataFile, 'utf8'));
    return parsed.certificates && typeof parsed.certificates === 'object' ? parsed.certificates : parsed;
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw new Error(`Unable to read certificate metadata: ${error.message}`);
  }
}

function metadataFor(metadata, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  return metadata[normalized] || metadata[path.basename(relativePath)] || {};
}

async function latestGitDate(relativePath, sourceDir) {
  const repositoryPath = path.relative(rootDir, path.join(sourceDir, relativePath)).replace(/\\/g, '/');
  try {
    const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%cI', '--', repositoryPath], {
      cwd: rootDir,
      windowsHide: true,
    });
    const value = stdout.trim();
    return value ? new Date(value) : null;
  } catch {
    return null;
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizePreview(value) {
  if (!value) return null;
  if (/^\/assets\//.test(value)) return value.split('/').map((part, index) => index === 0 ? '' : encodeURIComponent(decodeURIComponent(part))).join('/');
  return null;
}

function compareCertificates(a, b) {
  const orderA = Number.isFinite(a.order) ? a.order : Number.POSITIVE_INFINITY;
  const orderB = Number.isFinite(b.order) ? b.order : Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.date !== b.date) return String(b.date || '').localeCompare(String(a.date || ''));
  return a.title.localeCompare(b.title);
}

export async function buildCertificateManifest({
  sourceDir = defaultSourceDir,
  metadataFile = defaultMetadataFile,
} = {}) {
  const [files, metadata] = await Promise.all([
    collectCertificateFiles(sourceDir),
    readMetadata(metadataFile),
  ]);
  const byPath = new Map(files.map((file) => [
    file.relativePath.toLowerCase(),
    file,
  ]));

  const certificates = await Promise.all(files.map(async ({ fullPath, relativePath }) => {
    const fileInfo = await stat(fullPath);
    const details = metadataFor(metadata, relativePath);
    const extension = path.extname(relativePath).toLowerCase();
    const type = extension === '.pdf' ? 'pdf' : 'image';
    const gitDate = details.date ? null : await latestGitDate(relativePath, sourceDir);
    const date = normalizeDate(details.date) || normalizeDate(gitDate) || normalizeDate(fileInfo.mtime);
    const stem = relativePath.slice(0, -extension.length).toLowerCase();
    const siblingPreview = type === 'pdf'
      ? ['.png', '.jpg', '.jpeg', '.webp']
          .map((imageExtension) => byPath.get(`${stem}${imageExtension}`))
          .find(Boolean)
      : null;
    const preview = normalizePreview(details.preview)
      || (siblingPreview ? `/assets/Certs/${normalizePublicPath(siblingPreview.relativePath)}` : null);

    return {
      id: stableId(relativePath),
      filename: path.basename(relativePath),
      title: String(details.title || humanizeFilename(path.basename(relativePath))).trim(),
      href: `/assets/Certs/${normalizePublicPath(relativePath)}`,
      type,
      extension,
      preview,
      issuer: details.issuer ? String(details.issuer).trim() : null,
      date,
      category: String(details.category || 'Certificate').trim(),
      featured: Boolean(details.featured),
      order: Number.isFinite(details.order) ? details.order : null,
      alt: details.alt ? String(details.alt).trim() : null,
      description: details.description ? String(details.description).trim() : null,
    };
  }));

  return certificates.sort(compareCertificates);
}

export async function writeCertificateManifest({
  sourceDir = defaultSourceDir,
  outputFile = defaultOutputFile,
  metadataFile = defaultMetadataFile,
  check = false,
} = {}) {
  const certificates = await buildCertificateManifest({ sourceDir, metadataFile });
  const serialized = `${JSON.stringify(certificates, null, 2)}\n`;

  if (check) {
    let current = '';
    try {
      current = await readFile(outputFile, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (current !== serialized) {
      throw new Error('Certificate manifest is stale. Run npm run certs:sync.');
    }
    return certificates;
  }

  await writeFile(outputFile, serialized, 'utf8');
  return certificates;
}

function parseArguments(argv) {
  const options = { check: argv.includes('--check') };
  const valueFor = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : null;
  };
  if (valueFor('--source')) options.sourceDir = path.resolve(valueFor('--source'));
  if (valueFor('--output')) options.outputFile = path.resolve(valueFor('--output'));
  if (valueFor('--metadata')) options.metadataFile = path.resolve(valueFor('--metadata'));
  return options;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeCertificateManifest(parseArguments(process.argv.slice(2)))
    .then((certificates) => {
      console.log(`${process.argv.includes('--check') ? 'Certificate check passed' : 'Certificate manifest updated'}: ${certificates.length} files.`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
