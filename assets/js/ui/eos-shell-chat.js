import { eosCommands, normalizeToken, searchAll } from '../data/eos-command-registry.js';
import { hasGoogleSearch, hasOpenAIBridge } from '../data/eos-runtime-config.js';
import { getModule } from '../data/1807os-modules.js';
import { buildLocalChatReply, detectTargetFromText } from './eos-shell-render.js';

function normalizeActions(actions = []) {
  return (Array.isArray(actions) ? actions : []).map((action) => ({
    type: action?.type === 'question' ? 'question' : 'command',
    label: action?.label || action?.value || '',
    value: action?.value || action?.label || '',
  })).filter((action) => action.label && action.value);
}

async function runGoogleSearch(query, config) {
  const searchConfig = config.googleSearch || {};
  const params = new URLSearchParams({
    key: searchConfig.apiKey,
    cx: searchConfig.cx,
    q: query,
    num: String(Math.min(Number(searchConfig.maxResults) || 4, 10)),
  });

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  if (!response.ok) throw new Error(`Google search request failed with ${response.status}`);
  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    displayLink: item.displayLink,
    snippet: item.snippet,
  }));
}

function buildSiteContext(question, currentModuleId) {
  const query = normalizeToken(question);
  const matches = searchAll(query);
  const currentModule = getModule(currentModuleId || 'ai');
  return {
    currentModule: {
      id: currentModule.id,
      title: currentModule.title,
      route: currentModule.route,
      description: currentModule.description,
    },
    currentRoute: window.location.pathname + window.location.hash,
    pages: (matches.pages || []).slice(0, 6).map((page) => ({ title: page.title, route: page.route, scope: page.scope, description: page.description })),
    uploads: (matches.uploads || []).slice(0, 6).map((asset) => ({ name: asset.name, path: asset.path, kind: asset.kind, description: asset.description })),
  };
}

function shouldSearchWeb(question, siteContext) {
  const normalized = normalizeToken(question);
  const keywords = ['google', 'web', 'latest', 'today', 'news', 'current', 'search the internet'];
  if (keywords.some((keyword) => normalized.includes(keyword))) return true;
  return !siteContext.pages.length && !siteContext.uploads.length && !detectTargetFromText(normalized);
}

async function fetchBridgeReply(question, siteContext, webResults, config) {
  const response = await fetch(config.openai.bridgeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assistant: config.openai.assistantName || 'eos',
      question,
      siteContext,
      webResults,
      commands: eosCommands.map((command) => ({ name: command.name, syntax: command.syntax, summary: command.summary })),
    }),
  });

  if (!response.ok) throw new Error(`OpenAI bridge request failed with ${response.status}`);
  const data = await response.json();
  return {
    text: data.text || data.reply || data.message || data.output_text || 'The bridge responded, but did not return a readable text payload.',
    actions: normalizeActions(data.actions),
  };
}

function summarizeWebFallback(question, results) {
  if (!results.length) {
    return {
      text: `I searched the web for "${question}" but the configured engine returned nothing useful yet.`,
      actions: [{ type: 'command', label: `eos web ${question}`, value: `eos web ${question}` }],
    };
  }

  return {
    text: `I searched the web and the top result is ${results[0].title}. I can also show the raw results in the CLI.`,
    actions: [
      { type: 'command', label: `eos web ${question}`, value: `eos web ${question}` },
      { type: 'command', label: 'eos status', value: 'eos status' },
    ],
  };
}

export async function getChatReply(question, currentModuleId, config) {
  const localReply = buildLocalChatReply(question, currentModuleId);
  const siteContext = buildSiteContext(question, currentModuleId);
  const normalized = normalizeToken(question);
  const commandLike = normalized.startsWith('eos ');

  if (commandLike || normalized.includes('help') || normalized.includes('command') || normalized.includes('syntax')) {
    return localReply;
  }

  let webResults = [];
  if (hasGoogleSearch(config) && shouldSearchWeb(question, siteContext)) {
    try {
      webResults = await runGoogleSearch(question, config);
    } catch {
      webResults = [];
    }
  }

  if (hasOpenAIBridge(config)) {
    try {
      return await fetchBridgeReply(question, siteContext, webResults, config);
    } catch {
      if (webResults.length) return summarizeWebFallback(question, webResults);
      return localReply;
    }
  }

  if (webResults.length) return summarizeWebFallback(question, webResults);
  return localReply;
}

export async function getWebResults(query, config) {
  if (!hasGoogleSearch(config)) {
    throw new Error('Google search is not configured yet.');
  }
  return runGoogleSearch(query, config);
}

