const defaults = {
  cliTheme: 'auto',
  openai: {
    bridgeUrl: '',
    assistantName: 'eos',
  },
  googleSearch: {
    apiKey: '',
    cx: '',
    maxResults: 4,
  },
};

function mergeLayer(base, override) {
  return {
    ...base,
    ...override,
    openai: {
      ...base.openai,
      ...(override?.openai || {}),
    },
    googleSearch: {
      ...base.googleSearch,
      ...(override?.googleSearch || {}),
    },
  };
}

export function getEosRuntimeConfig() {
  const runtime = typeof window !== 'undefined' && window.__EOS_CONFIG__ ? window.__EOS_CONFIG__ : {};
  return mergeLayer(defaults, runtime);
}

export function hasOpenAIBridge(config = getEosRuntimeConfig()) {
  return Boolean(config.openai?.bridgeUrl);
}

export function hasGoogleSearch(config = getEosRuntimeConfig()) {
  return Boolean(config.googleSearch?.apiKey && config.googleSearch?.cx);
}

