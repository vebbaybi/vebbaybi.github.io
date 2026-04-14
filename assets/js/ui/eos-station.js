import { getEosRuntimeConfig, hasGoogleSearch } from '../data/eos-runtime-config.js';
import { EOS_LOGO, EOS_NAME, EOS_PROMPT, EOS_TITLE, commandNames, listPages, listUploads, normalizeToken, resolveTarget } from '../data/eos-command-registry.js';
import {
  buildLocalChatReply,
  dayPhase,
  escapeHtml,
  parseShellCommand,
  renderCat,
  renderDocs,
  renderLocate,
  renderManual,
  renderPages,
  renderPeek,
  renderPwd,
  renderRoutes,
  renderSearch,
  renderStatus,
  renderTree,
  renderUploads,
  renderWeb,
  renderWhoAmI,
} from './eos-shell-render.js';
import { getChatReply, getWebResults } from './eos-shell-chat.js';

function createMarkup() {
  const station = document.createElement('section');
  station.className = 'eos-station';
  station.innerHTML = `
    <button type="button" class="eos-launcher" aria-expanded="false" aria-controls="eos-shell-window">
      <img class="eos-avatar eos-avatar-launcher" src="${EOS_LOGO}" alt="${EOS_TITLE} avatar" />
      <span class="eos-launcher-copy"><strong>${EOS_NAME}</strong><span>shell + shark assist</span></span>
    </button>
    <section class="eos-shell-window" id="eos-shell-window" hidden>
      <div class="eos-shell-backdrop" data-eos-dismiss></div>
      <div class="eos-shell-panel" role="dialog" aria-modal="true" aria-label="eos shell">
        <div class="eos-shell-head">
          <div class="eos-profile"><img class="eos-avatar" src="${EOS_LOGO}" alt="${EOS_TITLE} avatar" /><div><strong>${EOS_TITLE}</strong><span>site shell + route intelligence</span></div></div>
          <div class="eos-shell-controls">
            <div class="eos-tab-row" role="tablist" aria-label="eos modes"><button type="button" class="eos-tab is-active" data-eos-tab="cli" aria-selected="true">CLI</button><button type="button" class="eos-tab" data-eos-tab="chat" aria-selected="false">Shark Chat</button></div>
            <div class="eos-theme-row"><button type="button" class="eos-theme-pill" data-eos-theme="day">day</button><button type="button" class="eos-theme-pill" data-eos-theme="night">night</button><button type="button" class="eos-theme-pill" data-eos-theme="auto">auto</button></div>
            <button type="button" class="eos-close" aria-label="Close eos shell">×</button>
          </div>
        </div>
        <div class="eos-shell-grid">
          <section class="eos-main-pane is-active" data-eos-panel="cli">
            <div class="eos-mode-copy"><p>Every command begins with <code>eos</code>. Pass page or upload paths directly whenever you already know them.</p><p>Try <code>eos ls eos</code>, <code>eos open /contact/</code>, or <code>eos uploads logo</code>.</p></div>
            <div class="eos-transcript" data-eos-cli-output></div>
            <div class="eos-chip-row"><button type="button" class="eos-inline-chip" data-eos-run="eos ls eos">eos ls eos</button><button type="button" class="eos-inline-chip" data-eos-run="eos fd ai">eos fd ai</button><button type="button" class="eos-inline-chip" data-eos-run="eos open /contact/">eos open /contact/</button><button type="button" class="eos-inline-chip" data-eos-run="eos uploads">eos uploads</button></div><div class="eos-suggest-row" data-eos-suggestions></div>
            <form class="eos-input-form" data-eos-cli-form><label class="eos-prompt" for="eos-cli-input">${EOS_PROMPT}</label><input id="eos-cli-input" class="eos-input" type="text" autocomplete="off" spellcheck="false" placeholder="eos help" /><button type="submit" class="eos-submit">run</button></form>
          </section>
          <section class="eos-main-pane" data-eos-panel="chat">
            <div class="eos-mode-copy"><p>Ask eos in plain language. I can explain commands, search the site knowledge pack, and use your configured search or AI bridge when available.</p></div>
            <div class="eos-chat-feed" data-eos-chat-feed></div>
            <div class="eos-chip-row"><button type="button" class="eos-inline-chip" data-eos-ask="How do I list all pages?">list pages</button><button type="button" class="eos-inline-chip" data-eos-ask="How do I open the classic contact page?">open contact</button><button type="button" class="eos-inline-chip" data-eos-ask="Find my logo uploads">logo uploads</button></div>
            <form class="eos-input-form eos-input-form-chat" data-eos-chat-form><label class="sr-only" for="eos-chat-input">Ask eos</label><input id="eos-chat-input" class="eos-input" type="text" autocomplete="off" spellcheck="false" placeholder="ask eos about the site or the shell" /><button type="submit" class="eos-submit">ask</button></form>
          </section>
          <aside class="eos-side-pane">
            <div class="eos-side-card"><div class="eos-result-head">current context</div><div class="eos-side-stack" data-eos-side-context></div></div>
            <div class="eos-side-card"><div class="eos-result-head">capabilities</div><div class="eos-side-stack" data-eos-capabilities></div></div>
            <div class="eos-side-card"><div class="eos-result-head">starter commands</div><div class="eos-example-row"><button type="button" class="eos-inline-chip" data-eos-run="eos pwd">eos pwd</button><button type="button" class="eos-inline-chip" data-eos-run="eos status">eos status</button><button type="button" class="eos-inline-chip" data-eos-run="eos tree os">eos tree os</button><button type="button" class="eos-inline-chip" data-eos-run="eos locate /assets/images/img/logo/logoos.png">eos locate /assets/images/img/logo/logoos.png</button></div></div>
          </aside>
        </div>
      </div>
    </section>
  `;
  return station;
}

export function initEosStation(options = {}) {
  const getCurrentModuleId = typeof options.getCurrentModuleId === 'function' ? options.getCurrentModuleId : () => document.body.dataset.osModule || 'launcher';
  const config = getEosRuntimeConfig();
  const station = createMarkup();
  document.body.appendChild(station);

  const launcher = station.querySelector('.eos-launcher');
  const shellWindow = station.querySelector('.eos-shell-window');
  const closeButton = station.querySelector('.eos-close');
  const tabs = [...station.querySelectorAll('[data-eos-tab]')];
  const panes = [...station.querySelectorAll('[data-eos-panel]')];
  const themeButtons = [...station.querySelectorAll('[data-eos-theme]')];
  const cliOutput = station.querySelector('[data-eos-cli-output]');
  const chatFeed = station.querySelector('[data-eos-chat-feed]');
  const cliForm = station.querySelector('[data-eos-cli-form]');
  const chatForm = station.querySelector('[data-eos-chat-form]');
  const cliInput = station.querySelector('#eos-cli-input');
  const chatInput = station.querySelector('#eos-chat-input');
  const contextNode = station.querySelector('[data-eos-side-context]');
  const capabilitiesNode = station.querySelector('[data-eos-capabilities]');
  const suggestionNode = station.querySelector('[data-eos-suggestions]');

  const history = [];
  let historyIndex = -1;
  let activePanel = 'cli';
  let themeChoice = localStorage.getItem('eos-theme-choice') || config.cliTheme || 'auto';
  let currentTheme = 'night';

  const appendCliEntry = (kind, html) => { const block = document.createElement('div'); block.className = `eos-cli-entry eos-cli-entry-${kind}`; block.innerHTML = html; cliOutput.appendChild(block); cliOutput.scrollTop = cliOutput.scrollHeight; };
  const appendChatMessage = (role, text, actions = []) => { const bubble = document.createElement('div'); bubble.className = `eos-chat-message eos-chat-message-${role}`; bubble.innerHTML = `${role === 'assistant' ? `<img class="eos-avatar eos-avatar-chat" src="${EOS_LOGO}" alt="${EOS_TITLE} avatar" />` : ''}<div class="eos-chat-bubble"><p>${escapeHtml(text)}</p>${actions.length ? `<div class="eos-example-row">${actions.map((action) => `<button type="button" class="eos-inline-chip" ${action.type === 'question' ? `data-eos-ask="${escapeHtml(action.value)}"` : `data-eos-run="${escapeHtml(action.value)}"`}>${escapeHtml(action.label)}</button>`).join('')}</div>` : ''}</div>`; chatFeed.appendChild(bubble); chatFeed.scrollTop = chatFeed.scrollHeight; };
  const autocompletePool = (() => {
    const pageTargets = listPages('eos').flatMap((page) => [page.family, page.route]).filter(Boolean);
    const uploadTargets = listUploads('').slice(0, 48).map((asset) => asset.path);
    return [...new Set([...pageTargets, ...uploadTargets])];
  })();

  function buildSuggestions(value) {
    const input = String(value || '').trim();
    const starter = ['eos help', 'eos ls eos', 'eos fd ai', 'eos open /contact/', 'eos uploads', 'eos status'];
    if (!input) return starter;
    if (!normalizeToken(input).startsWith('eos')) return [`eos ${input}`, ...starter].slice(0, 6);

    const parts = input.split(/\s+/);
    const command = normalizeToken(parts[1] || '');
    const argText = parts.slice(2).join(' ');

    if (parts.length <= 2) {
      return [...new Set(commandNames().filter((name) => name.startsWith(command)).map((name) => `eos ${name}`))].slice(0, 6);
    }

    if (['ls', 'tree'].includes(command)) {
      return ['eos ls eos', 'eos ls os', 'eos ls classic', 'eos ls core', 'eos tree eos', 'eos tree os']
        .filter((item) => item.includes(input) || item.includes(argText))
        .slice(0, 6);
    }

    if (command === 'theme') {
      return ['eos theme day', 'eos theme night', 'eos theme auto']
        .filter((item) => item.includes(input) || item.includes(argText))
        .slice(0, 6);
    }

    if (['open', 'go', 'loc', 'locate', 'peek', 'route', 'cat', 'fd', 'find', 'search', 'uploads'].includes(command)) {
      return autocompletePool
        .filter((item) => normalizeToken(item).includes(normalizeToken(argText)))
        .slice(0, 6)
        .map((item) => `eos ${command} ${item}`);
    }

    return starter.filter((item) => item.includes(command) || item.includes(argText)).slice(0, 6);
  }

  function renderSuggestions(value = '') {
    if (!suggestionNode) return;
    const suggestions = buildSuggestions(value);
    suggestionNode.innerHTML = suggestions.length
      ? suggestions.map((item) => `<button type="button" class="eos-inline-chip eos-inline-chip-ghost" data-eos-run="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')
      : '<span class="eos-microcopy">No suggestions yet.</span>';
  }

  function acceptSuggestion() {
    const [first] = buildSuggestions(cliInput.value);
    if (!first) return false;
    cliInput.value = first;
    renderSuggestions(first);
    return true;
  }

  function refreshSideCards() {
    const current = resolveTarget(window.location.pathname + window.location.hash) || resolveTarget(getCurrentModuleId() || 'launcher');
    contextNode.innerHTML = `<div class="eos-side-line"><span class="eos-kv-label">route</span><strong>${escapeHtml(window.location.pathname + window.location.hash)}</strong></div><div class="eos-side-line"><span class="eos-kv-label">current</span><strong>${escapeHtml(current?.title || '1807os Launcher')}</strong></div><div class="eos-side-line"><span class="eos-kv-label">theme</span><strong>${escapeHtml(currentTheme)}</strong></div>`;
    capabilitiesNode.innerHTML = `<div class="eos-side-line"><span class="eos-kv-label">site map</span><strong>online</strong></div><div class="eos-side-line"><span class="eos-kv-label">uploads</span><strong>tracked</strong></div><div class="eos-side-line"><span class="eos-kv-label">google</span><strong>${hasGoogleSearch(config) ? 'armed' : 'not configured'}</strong></div><div class="eos-side-line"><span class="eos-kv-label">openai</span><strong>${config.openai?.bridgeUrl ? 'bridge armed' : 'local knowledge mode'}</strong></div>`;
  }

  function setPanel(name) { activePanel = name; tabs.forEach((tab) => { const active = tab.dataset.eosTab === name; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); }); panes.forEach((pane) => pane.classList.toggle('is-active', pane.dataset.eosPanel === name)); }
  function openShell(panel = activePanel) { shellWindow.hidden = false; station.classList.add('is-open'); launcher.setAttribute('aria-expanded', 'true'); document.body.classList.add('eos-shell-open'); setPanel(panel); refreshSideCards(); renderSuggestions(cliInput.value); (panel === 'cli' ? cliInput : chatInput).focus({ preventScroll: true }); }
  function closeShell() { shellWindow.hidden = true; station.classList.remove('is-open'); launcher.setAttribute('aria-expanded', 'false'); document.body.classList.remove('eos-shell-open'); }
  function applyTheme(choice = 'auto') { themeChoice = choice; localStorage.setItem('eos-theme-choice', choice); currentTheme = choice === 'auto' ? dayPhase() : choice; shellWindow.dataset.eosTheme = currentTheme; themeButtons.forEach((button) => { const active = button.dataset.eosTheme === choice; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); }); refreshSideCards(); }
  function seedCli() { cliOutput.innerHTML = ''; appendCliEntry('system', `<div class="eos-result-block"><div class="eos-result-head">eos ready</div><p>Site shell online. Every command begins with <code>eos</code>. Try <code>eos ls eos</code>, <code>eos fd ai</code>, or <code>eos open /contact/</code>.</p></div>`); renderSuggestions(''); }
  function seedChat() { chatFeed.innerHTML = ''; appendChatMessage('assistant', 'I am eos, the shark shell for 1807os. Ask about routes, uploads, commands, or how to move through the site. When your Google or OpenAI bridge is configured, I can widen the search beyond the local site brain too.', [{ type: 'command', label: 'eos help', value: 'eos help' }, { type: 'question', label: 'How do I list all pages?', value: 'How do I list all pages?' }]); }

  async function executeCommand(raw) {
    const parsed = parseShellCommand(raw);
    const currentModuleId = getCurrentModuleId();
    if (parsed.empty) return { html: renderDocs() };
    if (parsed.error === 'prefix') return { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">syntax</div><p>Every shell command begins with <code>eos</code>. Try <code>${escapeHtml(parsed.suggestion)}</code>.</p></div>` };
    const target = parsed.args.join(' ');
    switch (parsed.command) {
      case 'help': return { html: renderDocs() };
      case 'man': return { html: renderManual(parsed.args[0]) };
      case 'ls': return { html: renderPages(parsed.args[0] || 'eos') };
      case 'fd': case 'find': case 'search': return { html: renderSearch(target) };
      case 'loc': case 'locate': return { html: renderLocate(target) };
      case 'peek': return { html: renderPeek(target) };
      case 'route': return { html: renderRoutes(target) };
      case 'open': case 'go': { const resolved = resolveTarget(target); return resolved ? { html: `<div class="eos-result-block"><div class="eos-result-head">open</div><p>Navigating to <a class="eos-route-link" href="${escapeHtml(resolved.route || resolved.path)}">${escapeHtml(resolved.route || resolved.path)}</a></p></div>`, navigateTo: resolved.route || resolved.path } : { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">open</div><p>I could not resolve that page or upload. Use <code>eos locate ${escapeHtml(target)}</code> first.</p></div>` }; }
      case 'cat': return { html: renderCat(target) };
      case 'tree': return { html: renderTree(parsed.args[0] || 'eos') };
      case 'uploads': return { html: renderUploads(target) };
      case 'pwd': return { html: renderPwd(currentModuleId, currentTheme) };
      case 'status': return { html: renderStatus(currentModuleId, currentTheme, config) };
      case 'theme': return ['day', 'night', 'auto'].includes(normalizeToken(parsed.args[0] || '')) ? { html: `<div class="eos-result-block"><div class="eos-result-head">theme</div><p>Switching the eos shell to <strong>${escapeHtml(parsed.args[0])}</strong> mode.</p></div>`, setTheme: normalizeToken(parsed.args[0]) } : { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">theme</div><p>Choose one of <code>day</code>, <code>night</code>, or <code>auto</code>.</p></div>` };
      case 'web':
        if (!target) {
          return { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">web</div><p>Provide a query after <code>eos web</code>.</p></div>` };
        }
        try { return { html: renderWeb(target, await getWebResults(target, config)) }; } catch (error) { return { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">web</div><p>${escapeHtml(error.message || 'Google search failed.')}</p></div>` }; }
      case 'whoami': return { html: renderWhoAmI(currentModuleId) };
      case 'clear': return { clear: true };
      default: return { html: `<div class="eos-result-block eos-result-error"><div class="eos-result-head">unknown :: ${escapeHtml(parsed.command)}</div><p>That command is not in the eos map yet. Try <code>eos help</code>.</p></div>` };
    }
  }

  async function runCommand(command) {
    if (!command) return;
    appendCliEntry('prompt', `<div class="eos-prompt-line"><span class="eos-prompt">${EOS_PROMPT}</span><span>${escapeHtml(command)}</span></div>`);
    history.push(command); historyIndex = history.length;
    const result = await executeCommand(command);
    if (result.clear) { seedCli(); return; }
    if (result.html) appendCliEntry('result', result.html);
    if (result.setTheme) applyTheme(result.setTheme);
    if (result.navigateTo) window.setTimeout(() => window.location.assign(result.navigateTo), 320);
    renderSuggestions(cliInput.value);
    refreshSideCards();
  }

  launcher.addEventListener('click', () => station.classList.contains('is-open') ? closeShell() : openShell(activePanel));
  station.querySelector('[data-eos-dismiss]').addEventListener('click', closeShell);
  closeButton.addEventListener('click', closeShell);
  tabs.forEach((tab) => tab.addEventListener('click', () => { setPanel(tab.dataset.eosTab); (tab.dataset.eosTab === 'cli' ? cliInput : chatInput).focus({ preventScroll: true }); }));
  themeButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.eosTheme)));
  cliForm.addEventListener('submit', async (event) => { event.preventDefault(); const command = cliInput.value.trim(); if (!command) return; cliInput.value = ''; renderSuggestions(''); await runCommand(command); });
  cliInput.addEventListener('input', () => renderSuggestions(cliInput.value));
  cliInput.addEventListener('keydown', (event) => { if (event.key === 'Tab') { event.preventDefault(); if (acceptSuggestion()) cliInput.setSelectionRange(cliInput.value.length, cliInput.value.length); } if (event.key === 'ArrowUp') { event.preventDefault(); if (!history.length) return; historyIndex = Math.max(0, historyIndex - 1); cliInput.value = history[historyIndex] || ''; renderSuggestions(cliInput.value); } if (event.key === 'ArrowDown') { event.preventDefault(); if (!history.length) return; historyIndex = Math.min(history.length, historyIndex + 1); cliInput.value = history[historyIndex] || ''; renderSuggestions(cliInput.value); } });
  chatForm.addEventListener('submit', async (event) => { event.preventDefault(); const question = chatInput.value.trim(); if (!question) return; chatInput.value = ''; appendChatMessage('user', question); appendChatMessage('assistant', 'Scanning route map and shell memory...'); const thinkingNode = chatFeed.lastElementChild; const localHint = buildLocalChatReply(question, getCurrentModuleId()); const reply = await getChatReply(question, getCurrentModuleId(), config).catch(() => localHint); thinkingNode?.remove(); appendChatMessage('assistant', reply.text, reply.actions || []); refreshSideCards(); });
  station.addEventListener('click', (event) => { const runTarget = event.target.closest('[data-eos-run]'); if (runTarget) { openShell('cli'); const command = runTarget.dataset.eosRun; cliInput.value = command; void runCommand(command); return; } const askTarget = event.target.closest('[data-eos-ask]'); if (askTarget) { openShell('chat'); chatInput.value = askTarget.dataset.eosAsk; chatForm.requestSubmit(); } });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && station.classList.contains('is-open')) closeShell(); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openShell('cli'); } });

  seedCli(); seedChat(); applyTheme(themeChoice); closeShell(); refreshSideCards();
}




