import {
  EOS_NAME,
  commandNames,
  currentContextSummary,
  eosCommands,
  formatBytes,
  getCommandDoc,
  getRelatedRoutes,
  listPages,
  listUploads,
  normalizeToken,
  resolveTarget,
  searchAll,
} from '../data/eos-command-registry.js';
import { hasGoogleSearch, hasOpenAIBridge } from '../data/eos-runtime-config.js';
import { getModule } from '../data/1807os-modules.js';

export const escapeHtml = (value = '') => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const uniqueBy = (items, key) => { const seen = new Set(); return items.filter((item) => { const value = item?.[key]; if (!value || seen.has(value)) return false; seen.add(value); return true; }); };
export const dayPhase = () => { const hour = new Date().getHours(); return hour >= 7 && hour < 19 ? 'day' : 'night'; };
const scopeLabel = (scope) => scope === 'os' ? 'os' : scope === 'classic' ? 'classic' : scope === 'core' ? 'core' : scope === 'asset' ? 'upload' : 'site';
const formatDate = (value) => { try { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); } catch { return value; } };
const pageLine = (page) => `<div class="eos-result-line"><span class="eos-scope-pill">${escapeHtml(scopeLabel(page.scope))}</span><span class="eos-page-title">${escapeHtml(page.title)}</span><a class="eos-route-link" href="${escapeHtml(page.route)}">${escapeHtml(page.route)}</a></div>`;
const assetLine = (asset) => `<div class="eos-result-line"><span class="eos-scope-pill">${escapeHtml(asset.kind)}</span><span class="eos-page-title">${escapeHtml(asset.name)}</span><a class="eos-route-link" href="${escapeHtml(asset.path)}">${escapeHtml(asset.path)}</a><span class="eos-meta-chip">${escapeHtml(formatBytes(asset.bytes))}</span></div>`;

export function renderDocs() {
  return `<div class="eos-result-block"><div class="eos-result-head">eos command map</div>${eosCommands.map((command) => `<div class="eos-command-card"><strong>${escapeHtml(command.syntax)}</strong><p>${escapeHtml(command.summary)}</p><div class="eos-example-row">${command.examples.map((example) => `<button type="button" class="eos-inline-chip" data-eos-run="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join('')}</div></div>`).join('')}</div>`;
}

export function renderManual(name) {
  const command = getCommandDoc(name);
  if (!command) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">manual</div><p>No manual entry exists for that command yet.</p></div>`;
  return `<div class="eos-result-block"><div class="eos-result-head">manual :: ${escapeHtml(command.name)}</div><p><strong>syntax</strong> ${escapeHtml(command.syntax)}</p><p>${escapeHtml(command.summary)}</p><div class="eos-example-row">${command.examples.map((example) => `<button type="button" class="eos-inline-chip" data-eos-run="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join('')}</div></div>`;
}

export function renderPages(scope = 'eos') {
  const pages = listPages(scope);
  if (!pages.length) return `<div class="eos-result-block"><div class="eos-result-head">ls ${escapeHtml(scope)}</div><p>No pages matched that scope.</p></div>`;
  const groups = ['core', 'classic', 'os'].map((group) => ({ group, items: pages.filter((page) => page.scope === group) })).filter((group) => group.items.length);
  return `<div class="eos-result-block"><div class="eos-result-head">ls ${escapeHtml(scope)} · ${pages.length} page${pages.length === 1 ? '' : 's'}</div>${groups.map((group) => `<div class="eos-group"><div class="eos-group-title">${escapeHtml(scopeLabel(group.group))}</div>${group.items.map(pageLine).join('')}</div>`).join('')}</div>`;
}

export function renderSearch(query) {
  const results = searchAll(query);
  const pages = uniqueBy(results.pages || [], 'key');
  const uploads = uniqueBy(results.uploads || [], 'key');
  if (!pages.length && !uploads.length) return `<div class="eos-result-block"><div class="eos-result-head">fd :: ${escapeHtml(query)}</div><p>No pages or uploads matched that search. Try <code>eos ls eos</code> or <code>eos uploads</code>.</p></div>`;
  return `<div class="eos-result-block"><div class="eos-result-head">fd :: ${escapeHtml(query)}</div>${pages.length ? `<div class="eos-group"><div class="eos-group-title">pages · ${pages.length}</div>${pages.map(pageLine).join('')}</div>` : ''}${uploads.length ? `<div class="eos-group"><div class="eos-group-title">uploads · ${uploads.length}</div>${uploads.map(assetLine).join('')}</div>` : ''}</div>`;
}

export function renderLocate(target) {
  const current = typeof target === 'string' ? resolveTarget(target) : target;
  if (!current) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">locate</div><p>Nothing resolved from that name or path.</p></div>`;
  if (current.type === 'asset') return `<div class="eos-result-block"><div class="eos-result-head">locate :: upload</div>${assetLine(current)}<div class="eos-key-value-grid"><div><span class="eos-kv-label">directory</span><strong>${escapeHtml(current.directory)}</strong></div><div><span class="eos-kv-label">updated</span><strong>${escapeHtml(formatDate(current.updated))}</strong></div><div><span class="eos-kv-label">format</span><strong>${escapeHtml(current.ext.toUpperCase())}</strong></div><div><span class="eos-kv-label">size</span><strong>${escapeHtml(formatBytes(current.bytes))}</strong></div></div></div>`;
  return `<div class="eos-result-block"><div class="eos-result-head">locate :: ${escapeHtml(current.family || current.id)}</div>${pageLine(current)}<p>${escapeHtml(current.description)}</p>${current.source ? `<div class="eos-microcopy">source :: ${escapeHtml(current.source)}</div>` : ''}</div>`;
}

export function renderPeek(target) {
  const current = typeof target === 'string' ? resolveTarget(target) : target;
  if (!current) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">peek</div><p>That target is not in the current eos map.</p></div>`;
  if (current.type === 'asset') return renderLocate(current);
  const routes = uniqueBy(getRelatedRoutes(current), 'key');
  return `<div class="eos-result-block"><div class="eos-result-head">peek :: ${escapeHtml(current.family || current.id)}</div><div class="eos-page-title-row"><span class="eos-scope-pill">${escapeHtml(scopeLabel(current.scope))}</span><strong>${escapeHtml(current.title)}</strong></div><p>${escapeHtml(current.description)}</p><div class="eos-route-stack">${routes.map(pageLine).join('')}</div></div>`;
}

export function renderRoutes(target) {
  const current = typeof target === 'string' ? resolveTarget(target) : target;
  if (!current) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">route</div><p>That route target could not be resolved.</p></div>`;
  if (current.type === 'asset') return `<div class="eos-result-block"><div class="eos-result-head">route :: upload</div>${assetLine(current)}</div>`;
  const routes = uniqueBy(getRelatedRoutes(current), 'key');
  return `<div class="eos-result-block"><div class="eos-result-head">routes :: ${escapeHtml(current.family || current.id)}</div>${routes.map(pageLine).join('')}</div>`;
}

export function renderCat(target) {
  const current = typeof target === 'string' ? resolveTarget(target) : target;
  if (!current) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">cat</div><p>No payload exists for that unresolved target.</p></div>`;
  if (current.type === 'asset') return `<div class="eos-result-block"><div class="eos-result-head">cat :: ${escapeHtml(current.name)}</div><p>${escapeHtml(current.description)}</p><div class="eos-key-value-grid"><div><span class="eos-kv-label">path</span><strong>${escapeHtml(current.path)}</strong></div><div><span class="eos-kv-label">kind</span><strong>${escapeHtml(current.kind)}</strong></div><div><span class="eos-kv-label">updated</span><strong>${escapeHtml(formatDate(current.updated))}</strong></div><div><span class="eos-kv-label">size</span><strong>${escapeHtml(formatBytes(current.bytes))}</strong></div></div></div>`;
  const module = getModule(current.family || current.id);
  const feed = module?.id === (current.family || current.id) && Array.isArray(module.feed) ? module.feed : [];
  return `<div class="eos-result-block"><div class="eos-result-head">cat :: ${escapeHtml(current.family || current.id)}</div><p>${escapeHtml(current.description)}</p>${feed.length ? `<div class="eos-bullet-stack">${feed.map((entry) => `<div class="eos-bullet-line">${escapeHtml(entry)}</div>`).join('')}</div>` : ''}</div>`;
}

export function renderTree(scope = 'eos') {
  const pages = listPages(scope);
  const groups = ['core', 'classic', 'os'].map((group) => ({ group, items: pages.filter((page) => page.scope === group) })).filter((group) => group.items.length);
  const lines = groups.flatMap((group) => [`${group.group}/`, ...group.items.map((page, index) => `${index === group.items.length - 1 ? '+' : '+'}- ${page.route} :: ${page.title}`)]);
  return `<div class="eos-result-block"><div class="eos-result-head">tree :: ${escapeHtml(scope)}</div><pre class="eos-tree">${escapeHtml(lines.join('\n'))}</pre></div>`;
}

export function renderUploads(query = '') {
  const results = listUploads(query).slice(0, 24);
  if (!results.length) return `<div class="eos-result-block"><div class="eos-result-head">uploads</div><p>No uploads matched that filter.</p></div>`;
  return `<div class="eos-result-block"><div class="eos-result-head">uploads${query ? ` :: ${escapeHtml(query)}` : ''} · ${results.length}</div>${results.map(assetLine).join('')}</div>`;
}

export function renderPwd(currentModuleId, theme) {
  const current = resolveTarget(window.location.pathname + window.location.hash) || resolveTarget(currentModuleId || 'launcher');
  return `<div class="eos-result-block"><div class="eos-result-head">pwd</div><div class="eos-key-value-grid"><div><span class="eos-kv-label">route</span><strong>${escapeHtml(window.location.pathname + window.location.hash)}</strong></div><div><span class="eos-kv-label">module</span><strong>${escapeHtml(current?.family || current?.id || 'launcher')}</strong></div><div><span class="eos-kv-label">theme</span><strong>${escapeHtml(theme)}</strong></div><div><span class="eos-kv-label">surface</span><strong>1807os shell</strong></div></div></div>`;
}

export function renderStatus(currentModuleId, theme, config) {
  const context = currentContextSummary(currentModuleId);
  const current = context.current;
  return `<div class="eos-result-block"><div class="eos-result-head">status</div><div class="eos-key-value-grid"><div><span class="eos-kv-label">current</span><strong>${escapeHtml(current?.title || '1807os Launcher')}</strong></div><div><span class="eos-kv-label">theme</span><strong>${escapeHtml(theme)}</strong></div><div><span class="eos-kv-label">pages indexed</span><strong>${escapeHtml(String(context.pageCount))}</strong></div><div><span class="eos-kv-label">uploads indexed</span><strong>${escapeHtml(String(context.uploadCount))}</strong></div><div><span class="eos-kv-label">google search</span><strong>${hasGoogleSearch(config) ? 'armed' : 'offline'}</strong></div><div><span class="eos-kv-label">openai bridge</span><strong>${hasOpenAIBridge(config) ? 'armed' : 'local-only'}</strong></div><div><span class="eos-kv-label">index built</span><strong>${escapeHtml(formatDate(context.generatedAt))}</strong></div><div><span class="eos-kv-label">cwd</span><strong>${escapeHtml(window.location.pathname)}</strong></div></div></div>`;
}

export function renderWhoAmI(currentModuleId) {
  const current = resolveTarget(currentModuleId || 'launcher');
  return `<div class="eos-result-block"><div class="eos-result-head">whoami</div><p><strong>eos</strong> is the shark operator for 1807os. I run the site shell, map routes, inspect uploads, and help visitors move between the classic portfolio and the OS branch.</p><p>current context :: <strong>${escapeHtml(current?.title || '1807os Launcher')}</strong></p><div class="eos-example-row"><button type="button" class="eos-inline-chip" data-eos-run="eos ls eos">eos ls eos</button><button type="button" class="eos-inline-chip" data-eos-run="eos fd ai">eos fd ai</button><button type="button" class="eos-inline-chip" data-eos-run="eos route contractor">eos route contractor</button></div></div>`;
}

export function renderWeb(query, results) {
  if (!results.length) return `<div class="eos-result-block eos-result-error"><div class="eos-result-head">web :: ${escapeHtml(query)}</div><p>Google search is configured, but it returned no results for that query.</p></div>`;
  return `<div class="eos-result-block"><div class="eos-result-head">web :: ${escapeHtml(query)}</div><div class="eos-web-stack">${results.map((result) => `<article class="eos-web-card"><a class="eos-route-link" href="${escapeHtml(result.link)}" target="_blank" rel="noreferrer">${escapeHtml(result.title)}</a><p>${escapeHtml(result.snippet || '')}</p><span class="eos-microcopy">${escapeHtml(result.displayLink || result.link)}</span></article>`).join('')}</div></div>`;
}

export function parseShellCommand(raw) {
  const input = String(raw || '').trim();
  if (!input) return { empty: true };
  const tokens = []; const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g; let match;
  while ((match = matcher.exec(input)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
  if (!tokens.length) return { empty: true };
  if (normalizeToken(tokens[0]) !== EOS_NAME) return { error: 'prefix', suggestion: `${EOS_NAME} ${input}`.trim() };
  return { command: normalizeToken(tokens[1] || 'help'), args: tokens.slice(2) };
}

export function detectTargetFromText(text) {
  const aliases = [];
  listPages('eos').forEach((page) => { aliases.push(page.id, page.family, ...(page.aliases || [])); });
  const normalized = ` ${normalizeToken(text).replace(/[^a-z0-9:/#\-.]+/g, ' ')} `;
  return aliases.filter(Boolean).sort((a, b) => b.length - a.length).find((token) => normalized.includes(` ${normalizeToken(token)} `)) || null;
}

export function buildLocalChatReply(question, currentModuleId) {
  const normalized = normalizeToken(question);
  const target = detectTargetFromText(normalized);
  const currentModule = getModule(currentModuleId || 'ai');
  if (!normalized) return { text: 'Ask me about the site, a module, or a command. I can translate plain language into eos shell syntax.', actions: [{ type: 'command', label: 'eos help', value: 'eos help' }, { type: 'question', label: 'How do I list all pages?', value: 'How do I list all pages?' }] };
  if (normalized.startsWith(`${EOS_NAME} `)) return { text: 'That already looks like a valid shell command. I can run it for you or you can use the CLI tab directly.', actions: [{ type: 'command', label: question, value: question }, { type: 'command', label: 'eos help', value: 'eos help' }] };
  if (commandNames().some((name) => normalized === name || normalized.startsWith(`${name} `))) return { text: `In this shell every command begins with ${EOS_NAME}. Try the prefixed version below.`, actions: [{ type: 'command', label: `${EOS_NAME} ${question}`, value: `${EOS_NAME} ${question}` }] };
  if ((normalized.includes('list') || normalized.includes('show')) && normalized.includes('page')) return { text: 'Use the list command on the whole site map, or narrow it to the OS or classic branch.', actions: [{ type: 'command', label: 'eos ls eos', value: 'eos ls eos' }, { type: 'command', label: 'eos ls os', value: 'eos ls os' }, { type: 'command', label: 'eos ls classic', value: 'eos ls classic' }] };
  if (normalized.includes('upload') || normalized.includes('asset') || normalized.includes('logo') || normalized.includes('pdf')) return { text: 'I can inspect public uploads too. Use uploads for a list, find for a match, or open a direct asset path.', actions: [{ type: 'command', label: 'eos uploads', value: 'eos uploads' }, { type: 'command', label: 'eos uploads logo', value: 'eos uploads logo' }, { type: 'command', label: 'eos open /assets/images/img/logo/logoos.png', value: 'eos open /assets/images/img/logo/logoos.png' }] };
  if (normalized.includes('help') || normalized.includes('command') || normalized.includes('syntax')) return { text: 'The fastest place to learn the shell is the help map. From there you can open the manual for any command.', actions: [{ type: 'command', label: 'eos help', value: 'eos help' }, { type: 'command', label: 'eos man open', value: 'eos man open' }] };
  if (target) return { text: `${resolveTarget(target)?.title || target} is available in the site map. I can summarize it, show its routes, or open it directly.`, actions: [{ type: 'command', label: `eos peek ${target}`, value: `eos peek ${target}` }, { type: 'command', label: `eos route ${target}`, value: `eos route ${target}` }, { type: 'command', label: `eos open ${target}`, value: `eos open ${target}` }] };
  return { text: `Shark scan complete. You are currently closest to ${currentModule.title}. Start with the full map, search for something specific, or inspect the current operating status.`, actions: [{ type: 'command', label: 'eos ls eos', value: 'eos ls eos' }, { type: 'command', label: 'eos fd ai', value: 'eos fd ai' }, { type: 'command', label: 'eos status', value: 'eos status' }] };
}

