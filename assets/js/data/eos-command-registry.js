import { getModule, moduleOrder } from './1807os-modules.js';
import { eosSiteGeneratedAt, eosSitePages, eosUploads } from './eos-site-index.js';

export const EOS_NAME = 'eos';
export const EOS_TITLE = 'eos shark';
export const EOS_LOGO = '/assets/images/img/logo/logoos.png';
export const EOS_PROMPT = 'eos@1807:~$';

const moduleAliases = {
  ai: ['ai', 'assistant', 'assistants', 'copilot', 'copilots'],
  data: ['data', 'analysis', 'pipeline', 'pipelines'],
  embedded: ['embedded', 'robotics', 'robotic', 'firmware', 'hardware'],
  blockchain: ['blockchain', 'chains', 'chain', 'onchain', 'web3'],
  about: ['about', 'story', 'scroll', 'scroll_paper', '1807'],
  contractor: ['contractor', 'doctrine', 'field', '1807-contractor'],
  resume: ['resume', 'cv', 'credential', 'credentials'],
  contact: ['contact', 'ping', 'email', 'reach'],
};

const staticBlueprints = [
  {
    key: 'core:root',
    family: 'root',
    scope: 'core',
    id: 'root',
    route: '/',
    fallbackTitle: 'Landing Splash',
    fallbackDescription: 'The main splash and entry page for the 1807 site.',
    tags: ['landing', 'splash', 'entry'],
    aliases: ['root', 'landing', 'splash', 'index', 'gate'],
  },
  {
    key: 'core:home',
    family: 'home',
    scope: 'core',
    id: 'home',
    route: '/home/',
    fallbackTitle: '1807 Portfolio Home',
    fallbackDescription: 'The classic portfolio map and home experience.',
    tags: ['home', 'classic', 'portfolio'],
    aliases: ['home', 'portfolio', 'classic-home'],
  },
  {
    key: 'classic:projects',
    family: 'projects',
    scope: 'classic',
    id: 'projects',
    route: '/projects/',
    fallbackTitle: 'Projects Hub',
    fallbackDescription: 'The classic projects hub across AI, data, embedded, and blockchain.',
    tags: ['projects', 'hub'],
    aliases: ['projects', 'project', 'hub'],
  },
  {
    key: 'classic:links',
    family: 'links',
    scope: 'classic',
    id: 'links',
    route: '/links/',
    fallbackTitle: 'Links',
    fallbackDescription: 'Link hub for the 1807 brand and identity.',
    tags: ['links', 'bio'],
    aliases: ['links', 'link', 'bio'],
  },
  {
    key: 'classic:construction',
    family: 'construction',
    scope: 'classic',
    id: 'construction',
    route: '/construction/',
    fallbackTitle: 'Construction',
    fallbackDescription: 'Construction and field-oriented services page.',
    tags: ['construction', 'field', 'services'],
    aliases: ['construction', 'field', 'services'],
  },
  {
    key: 'classic:tdi',
    family: 'tdi',
    scope: 'classic',
    id: 'tdi',
    route: '/tdi/',
    fallbackTitle: 'The Djehuty',
    fallbackDescription: 'The Djehuty page inside the classic site.',
    tags: ['tdi', 'djehuty'],
    aliases: ['tdi', 'djehuty'],
  },
  {
    key: 'classic:resumes',
    family: 'resumes',
    scope: 'classic',
    id: 'resumes',
    route: '/resumes/',
    fallbackTitle: 'Resume Collection',
    fallbackDescription: 'The multi-resume collection page in the classic site.',
    tags: ['resumes', 'resume', 'cv'],
    aliases: ['resumes', 'resume-stack', 'resume-collection'],
  },
  {
    key: 'os:launcher',
    family: 'launcher',
    scope: 'os',
    id: 'launcher',
    route: '/1807osPort/',
    fallbackTitle: '1807os Launcher',
    fallbackDescription: 'The main 1807os launcher and module hub.',
    tags: ['os', 'launcher', 'hub', 'eos'],
    aliases: ['launcher', 'os', '1807os', '1807osport', 'eos', 'hub'],
  },
];

export function normalizeToken(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeRouteValue(value = '') {
  let raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      raw = `${url.pathname}${url.hash || ''}`;
    } catch {
      return '';
    }
  }

  if (!raw.startsWith('/')) return '';

  raw = raw.replace(/\\/g, '/').replace(/\/+/g, '/');
  const [pathnameRaw, hash = ''] = raw.split('#');
  let pathname = pathnameRaw || '/';

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (!pathname.endsWith('/') && !/\.[a-z0-9]{2,8}$/i.test(pathname)) pathname = `${pathname}/`;

  return hash ? `${pathname}#${hash}` : pathname;
}

function stripHash(value = '') {
  return String(value).split('#')[0];
}

function pageFromRoute(route) {
  const target = stripHash(normalizeRouteValue(route));
  if (!target) return null;
  return eosSitePages.find((page) => normalizeRouteValue(page.route) === target) || null;
}

function buildStaticPage(blueprint) {
  const sitePage = pageFromRoute(blueprint.route);
  return {
    key: blueprint.key,
    family: blueprint.family,
    scope: blueprint.scope,
    id: blueprint.id,
    title: sitePage?.title || blueprint.fallbackTitle,
    route: blueprint.route,
    description: sitePage?.description || blueprint.fallbackDescription,
    tags: blueprint.tags,
    aliases: blueprint.aliases,
    source: sitePage?.source || '',
  };
}

function buildModulePages() {
  return moduleOrder.flatMap((id) => {
    const module = getModule(id);
    const aliases = moduleAliases[id] || [id];
    const osPage = pageFromRoute(module.route);
    const classicPage = pageFromRoute(module.classicRoute);

    return [
      {
        key: `os:${id}`,
        family: id,
        scope: 'os',
        id,
        title: osPage?.title || module.title,
        route: module.route,
        description: osPage?.description || module.description,
        tags: [...module.tags, 'os'],
        aliases,
        source: osPage?.source || '',
      },
      {
        key: `classic:${id}`,
        family: id,
        scope: 'classic',
        id,
        title: classicPage?.title || `${module.title} (classic)`,
        route: module.classicRoute,
        description: classicPage?.description || module.description,
        tags: [...module.tags, 'classic'],
        aliases,
        source: classicPage?.source || '',
      },
    ];
  });
}

export const eosPages = [...staticBlueprints.map(buildStaticPage), ...buildModulePages()];

export const eosAssets = eosUploads.map((asset) => ({
  ...asset,
  type: 'asset',
  title: asset.name,
  description: `${asset.kind} asset in ${asset.directory}`,
}));

function buildSearchText(parts = []) {
  return parts
    .flatMap((item) => Array.isArray(item) ? item : [item])
    .filter(Boolean)
    .map((item) => normalizeToken(item))
    .join(' ');
}

function assetMatch(asset, query) {
  const haystack = buildSearchText([
    asset.name,
    asset.stem,
    asset.path,
    asset.directory,
    asset.kind,
    asset.ext,
    asset.aliases,
  ]);
  return haystack.includes(normalizeToken(query));
}

function pageMatch(page, query) {
  const haystack = buildSearchText([
    page.id,
    page.family,
    page.title,
    page.route,
    page.description,
    page.tags,
    page.aliases,
    page.scope,
    page.source,
  ]);
  return haystack.includes(normalizeToken(query));
}

export function listPages(scope = 'eos') {
  const wanted = normalizeToken(scope || 'eos');

  if (wanted === 'eos' || wanted === 'all') return eosPages.slice();
  if (wanted === 'module' || wanted === 'modules') {
    return eosPages.filter((page) => !['root', 'home', 'projects', 'links', 'construction', 'tdi', 'resumes', 'launcher'].includes(page.family));
  }

  return eosPages.filter((page) => page.scope === wanted);
}

export function listUploads(query = '') {
  const wanted = normalizeToken(query);
  if (!wanted) return eosAssets.slice();
  return eosAssets.filter((asset) => assetMatch(asset, wanted));
}

export function searchPages(query = '') {
  const wanted = normalizeToken(query);
  if (!wanted) return [];
  return eosPages.filter((page) => pageMatch(page, wanted));
}

export function searchUploads(query = '') {
  const wanted = normalizeToken(query);
  if (!wanted) return [];
  return eosAssets.filter((asset) => assetMatch(asset, wanted));
}

export function searchAll(query = '') {
  return {
    pages: searchPages(query),
    uploads: searchUploads(query),
  };
}

function resolveAsset(rawTarget = '') {
  const targetPath = normalizeRouteValue(rawTarget);
  if (targetPath) {
    const exactPath = eosAssets.find((asset) => normalizeRouteValue(asset.path) === targetPath);
    if (exactPath) return exactPath;
  }

  const target = normalizeToken(rawTarget);
  if (!target) return null;

  const exact = eosAssets.find((asset) => {
    const aliases = [asset.name, asset.stem, asset.path, ...(asset.aliases || [])].map(normalizeToken);
    return aliases.includes(target);
  });
  if (exact) return exact;

  return eosAssets.find((asset) => assetMatch(asset, target)) || null;
}

export function resolveTarget(rawTarget = '', preferredScope = 'os') {
  const pathTarget = normalizeRouteValue(rawTarget);
  if (pathTarget) {
    const page = eosPages.find((candidate) => normalizeRouteValue(candidate.route) === pathTarget || stripHash(normalizeRouteValue(candidate.route)) === stripHash(pathTarget));
    if (page) return page;

    const asset = resolveAsset(pathTarget);
    if (asset) return asset;
  }

  const target = normalizeToken(rawTarget);
  if (!target) return null;

  let scope = null;
  let name = target;

  if (target.includes(':')) {
    const [maybeScope, ...rest] = target.split(':');
    const maybeName = rest.join(':');
    if (['os', 'classic', 'core', 'asset', 'upload'].includes(maybeScope) && maybeName) {
      scope = maybeScope === 'upload' ? 'asset' : maybeScope;
      name = maybeName;
    }
  }

  if (scope === 'asset') return resolveAsset(name);

  const exact = eosPages.find((page) => {
    if (scope && page.scope !== scope) return false;
    const aliases = [page.id, page.family, ...(page.aliases || []), page.title, page.route].map(normalizeToken);
    return aliases.includes(name);
  });
  if (exact) return exact;

  const familyMatches = eosPages.filter((page) => page.family === name && (!scope || page.scope === scope));
  if (familyMatches.length) {
    return familyMatches.find((page) => page.scope === preferredScope) || familyMatches[0];
  }

  const partial = eosPages.find((page) => {
    if (scope && page.scope !== scope) return false;
    return pageMatch(page, name);
  });
  if (partial) return partial;

  return resolveAsset(name);
}

export function getRelatedRoutes(target = '') {
  const resolved = typeof target === 'string' ? resolveTarget(target) : target;
  if (!resolved || resolved.type === 'asset') return [];
  return eosPages.filter((page) => page.family === resolved.family);
}

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

export function currentContextSummary(currentModuleId = 'launcher') {
  const current = resolveTarget(currentModuleId || 'launcher');
  return {
    current,
    generatedAt: eosSiteGeneratedAt,
    pageCount: eosPages.length,
    uploadCount: eosAssets.length,
  };
}

export const eosCommands = [
  {
    name: 'help',
    syntax: 'eos help',
    summary: 'Show the eos command map and starter examples.',
    examples: ['eos help', 'eos man open'],
  },
  {
    name: 'ls',
    syntax: 'eos ls eos | eos ls os | eos ls classic | eos ls core',
    summary: 'List pages across the 1807 site or inside a specific scope.',
    examples: ['eos ls eos', 'eos ls os', 'eos ls classic'],
  },
  {
    name: 'fd',
    syntax: 'eos fd <query> | eos find <query>',
    summary: 'Find pages, routes, uploads, and aliases.',
    examples: ['eos fd ai', 'eos fd contractor', 'eos find logoos'],
  },
  {
    name: 'locate',
    syntax: 'eos locate <target|/path/|https://the1807.xyz/...>',
    summary: 'Resolve a page or asset from a name, path, or full site URL.',
    examples: ['eos locate /contact/', 'eos locate classic:resume', 'eos locate /assets/images/img/logo/logoos.png'],
  },
  {
    name: 'peek',
    syntax: 'eos peek <target>',
    summary: 'Show a quick summary for a page or module.',
    examples: ['eos peek ai', 'eos peek launcher', 'eos peek classic:contact'],
  },
  {
    name: 'route',
    syntax: 'eos route <target>',
    summary: 'Show the os and classic routes tied to a target.',
    examples: ['eos route ai', 'eos route contractor', 'eos route launcher'],
  },
  {
    name: 'open',
    syntax: 'eos open <target|/path/>',
    summary: 'Navigate directly to a page or public asset from eos.',
    examples: ['eos open ai', 'eos open classic:contact', 'eos open /assets/pdf/circuit.pdf'],
  },
  {
    name: 'cat',
    syntax: 'eos cat <target>',
    summary: 'Read the descriptive payload for a page or module.',
    examples: ['eos cat about', 'eos cat resume', 'eos cat projects'],
  },
  {
    name: 'tree',
    syntax: 'eos tree [eos|os|classic|core]',
    summary: 'Print a compact route tree for the selected scope.',
    examples: ['eos tree', 'eos tree os', 'eos tree classic'],
  },
  {
    name: 'uploads',
    syntax: 'eos uploads [query]',
    summary: 'List uploaded public assets tracked by eos.',
    examples: ['eos uploads', 'eos uploads logo', 'eos uploads pdf'],
  },
  {
    name: 'pwd',
    syntax: 'eos pwd',
    summary: 'Show the current page route and module context.',
    examples: ['eos pwd'],
  },
  {
    name: 'status',
    syntax: 'eos status',
    summary: 'Show shell status, index counts, and current context.',
    examples: ['eos status'],
  },
  {
    name: 'theme',
    syntax: 'eos theme day|night|auto',
    summary: 'Switch the full-window eos shell theme.',
    examples: ['eos theme day', 'eos theme night', 'eos theme auto'],
  },
  {
    name: 'web',
    syntax: 'eos web <query>',
    summary: 'Use the configured Google search engine for broader questions.',
    examples: ['eos web latest ai safety news', 'eos web Toronto robotics events'],
  },
  {
    name: 'whoami',
    syntax: 'eos whoami',
    summary: 'Identify eos and the current operating posture.',
    examples: ['eos whoami'],
  },
  {
    name: 'clear',
    syntax: 'eos clear',
    summary: 'Clear the command transcript.',
    examples: ['eos clear'],
  },
];

const commandByName = new Map();
for (const command of eosCommands) {
  commandByName.set(command.name, command);
}
commandByName.set('find', commandByName.get('fd'));
commandByName.set('search', commandByName.get('fd'));
commandByName.set('loc', commandByName.get('locate'));
commandByName.set('go', commandByName.get('open'));

export function getCommandDoc(name = '') {
  return commandByName.get(normalizeToken(name)) || null;
}

export function commandNames() {
  return [...new Set([...eosCommands.map((command) => command.name), 'find', 'search', 'loc', 'go'])];
}

