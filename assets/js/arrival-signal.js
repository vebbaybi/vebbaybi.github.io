'use strict';

(function () {
  const mount = document.getElementById('arrival-signal');

  if (!mount) {
    return;
  }

  const currentScript = document.currentScript;
  const scriptPathMarker = '/assets/js/arrival-signal.js';

  const contentUrl = '/assets/data/arrival-signals.json';
  const geoUrl = 'https://get.geojs.io/v1/ip/geo.json';
  const timeoutMs = 3500;
  const maxMessageLength = 130;
  const maxLocationLength = 64;

  let hasRun = false;

  const fallbackBank = {
    meta: {
      name: 'Arrival Signal',
      version: '1.0.0',
      privacy: 'Approximate city, region, and country only. No IP display. No storage.'
    },
    safety: {
      blockedWords: [
        'tragedy',
        'death',
        'dead',
        'war',
        'bombing',
        'genocide',
        'terrorism',
        'disaster',
        'disease',
        'pandemic',
        'crime',
        'violence',
        'race',
        'ethnicity',
        'religion',
        'politics',
        'poverty'
      ]
    },
    fallbacks: {
      unknown: [
        'Unknown signal detected. Visitor arrived in stealth mode.',
        'Signal unclear. Local context loaded with privacy intact.'
      ],
      genericCity: [
        '{city} signal detected. Local context loaded. Debug responsibly.'
      ],
      genericRegion: [
        '{region} signal detected. Regional mode online.'
      ],
      genericCountry: [
        '{country} signal detected. Welcome to The 1807.'
      ]
    },
    countryProfiles: {},
    countries: {},
    regions: {},
    cities: {}
  };

  const builtInBlockedWords = fallbackBank.safety.blockedWords;

  function getSiteRootPath() {
    if (!currentScript || !currentScript.src) {
      return '/';
    }

    try {
      const scriptUrl = new URL(currentScript.src, window.location.href);
      const markerIndex = scriptUrl.pathname.indexOf(scriptPathMarker);

      if (markerIndex === -1) {
        return '/';
      }

      const root = scriptUrl.pathname.slice(0, markerIndex + 1);
      return root || '/';
    } catch (_) {
      return '/';
    }
  }

  function normalizePath(pathname) {
    if (!pathname) {
      return '/';
    }

    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  function isIndexPage() {
    const siteRoot = normalizePath(getSiteRootPath());
    const currentPath = window.location.pathname;

    return currentPath === siteRoot || currentPath === `${siteRoot}index.html`;
  }

  function hideSignal() {
    mount.textContent = '';
    mount.hidden = true;
    mount.classList.remove(
      'arrival-signal--loading',
      'arrival-signal--ready',
      'arrival-signal--fallback'
    );
  }

  function watchNavigationExit() {
    window.addEventListener('pagehide', hideSignal, { once: true });
    window.addEventListener('beforeunload', hideSignal, { once: true });

    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest('a[href]');

        if (!link) {
          return;
        }

        const url = new URL(link.href, window.location.href);
        const samePageHash =
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash;

        if (samePageHash) {
          return;
        }

        hideSignal();
      },
      true
    );
  }

  function runAfterFullPageLoad(callback) {
    if (document.readyState === 'complete') {
      callback();
      return;
    }

    window.addEventListener('load', callback, { once: true });
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
  }

  function isMessageMap(value) {
    return isObject(value) && Object.values(value).every(isStringArray);
  }

  function validateBank(value) {
    if (!isObject(value)) return null;
    if (!isObject(value.meta) || !isObject(value.safety) || !isObject(value.fallbacks)) return null;
    if (!isStringArray(value.safety.blockedWords)) return null;
    if (!isStringArray(value.fallbacks.unknown)) return null;
    if (!isStringArray(value.fallbacks.genericCity)) return null;
    if (!isStringArray(value.fallbacks.genericRegion)) return null;
    if (!isStringArray(value.fallbacks.genericCountry)) return null;
    if (!isMessageMap(value.countryProfiles)) return null;
    if (!isMessageMap(value.countries)) return null;
    if (!isMessageMap(value.regions)) return null;
    if (!isMessageMap(value.cities)) return null;
    return value;
  }

  function fetchJson(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json'
      },
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      })
      .finally(() => {
        window.clearTimeout(timer);
      });
  }

  async function fetchSafeLocation() {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(geoUrl, {
        signal: controller.signal,
        headers: {
          accept: 'application/json'
        },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const raw = await response.json();
      return toSafeLocation(raw);
    } finally {
      window.clearTimeout(timer);
    }
  }

  function sanitizeText(value, limit) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  function sanitizeLocationValue(value) {
    return sanitizeText(value, maxLocationLength);
  }

  function normalizeKey(value) {
    return sanitizeText(value, maxLocationLength)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function makeKey(parts) {
    return parts.map(normalizeKey).filter(Boolean).join('_');
  }

  function pick(list) {
    if (!Array.isArray(list) || list.length === 0) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  function validateSafeLocation(location) {
    if (!isObject(location)) return false;

    const allowedKeys = ['city', 'region', 'country', 'countryCode'];
    const keys = Object.keys(location);

    if (!keys.every((key) => allowedKeys.includes(key))) return false;
    if (!keys.every((key) => typeof location[key] === 'string')) return false;
    if (!location.city && !location.region && !location.country && !location.countryCode) return false;
    if (location.countryCode && !/^[A-Z]{2,3}$/.test(location.countryCode)) return false;

    return true;
  }

  function toSafeLocation(raw) {
    if (!isObject(raw)) return null;

    const {
      city,
      region,
      country,
      country_name: countryName,
      country_code: countryCode
    } = raw;

    const location = {
      city: sanitizeLocationValue(city),
      region: sanitizeLocationValue(region),
      country: sanitizeLocationValue(countryName || country),
      countryCode: sanitizeText(countryCode, 8).toUpperCase()
    };

    return validateSafeLocation(location) ? location : null;
  }

  function replacePlaceholders(template, location) {
    return sanitizeText(template, maxMessageLength)
      .replace(/\{city\}/g, location.city || 'Unknown')
      .replace(/\{region\}/g, location.region || location.country || 'Unknown')
      .replace(/\{country\}/g, location.country || 'Unknown')
      .replace(/\{countryCode\}/g, location.countryCode || '');
  }

  function hasBlockedWord(message, blockedWords) {
    const text = ` ${message.toLowerCase()} `;

    return blockedWords.some((word) => {
      const safeWord = normalizeKey(word).replace(/_/g, ' ');

      if (!safeWord) {
        return false;
      }

      return new RegExp(
        `(^|[^a-z0-9])${safeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`,
        'i'
      ).test(text);
    });
  }

  function hasIpPattern(message) {
    return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(message) ||
      /\b[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){2,}\b/i.test(message);
  }

  function isSafeMessage(message, blockedWords) {
    if (!message || message.length > maxMessageLength) return false;
    if (hasBlockedWord(message, blockedWords)) return false;
    if (hasIpPattern(message)) return false;
    return true;
  }

  function findTemplates(bank, location) {
    if (!location) {
      return {
        templates: bank.fallbacks.unknown,
        fallback: true
      };
    }

    const cityRegionCountry = makeKey([location.city, location.region, location.country]);
    const cityCountry = makeKey([location.city, location.country]);
    const regionCountry = makeKey([location.region, location.country]);
    const countryKey = makeKey([location.country]);

    if (cityRegionCountry && bank.cities[cityRegionCountry]) {
      return {
        templates: bank.cities[cityRegionCountry],
        fallback: false
      };
    }

    if (cityCountry && bank.cities[cityCountry]) {
      return {
        templates: bank.cities[cityCountry],
        fallback: false
      };
    }

    if (regionCountry && bank.regions[regionCountry]) {
      return {
        templates: bank.regions[regionCountry],
        fallback: false
      };
    }

    if (countryKey && bank.countries[countryKey]) {
      return {
        templates: bank.countries[countryKey],
        fallback: false
      };
    }

    if (countryKey && bank.countryProfiles[countryKey]) {
      return {
        templates: bank.countryProfiles[countryKey],
        fallback: false
      };
    }

    if (location.city) {
      return {
        templates: bank.fallbacks.genericCity,
        fallback: false
      };
    }

    if (location.region) {
      return {
        templates: bank.fallbacks.genericRegion,
        fallback: false
      };
    }

    if (location.country) {
      return {
        templates: bank.fallbacks.genericCountry,
        fallback: false
      };
    }

    return {
      templates: bank.fallbacks.unknown,
      fallback: true
    };
  }

  function chooseMessage(bank, location) {
    const blockedWords = [...builtInBlockedWords, ...bank.safety.blockedWords];
    const match = findTemplates(bank, location);
    const candidate = replacePlaceholders(pick(match.templates), location || {});

    if (isSafeMessage(candidate, blockedWords)) {
      return {
        message: candidate,
        fallback: match.fallback
      };
    }

    const fallback = fallbackBank.fallbacks.unknown.find((item) => isSafeMessage(item, blockedWords));

    return {
      message: fallback || 'Unknown signal detected. Visitor arrived in stealth mode.',
      fallback: true
    };
  }

  function render(result) {
    if (!result.message || !isIndexPage()) {
      hideSignal();
      return;
    }

    mount.textContent = result.message;
    mount.hidden = false;
    mount.classList.remove(
      'arrival-signal--loading',
      'arrival-signal--ready',
      'arrival-signal--fallback'
    );
    mount.classList.add(result.fallback ? 'arrival-signal--fallback' : 'arrival-signal--ready');
  }

  async function run() {
    if (hasRun) {
      return;
    }

    hasRun = true;

    if (!isIndexPage()) {
      hideSignal();
      return;
    }

    mount.textContent = '';
    mount.hidden = true;
    mount.classList.remove(
      'arrival-signal--ready',
      'arrival-signal--fallback'
    );
    mount.classList.add('arrival-signal--loading');

    const [bankResult, geoResult] = await Promise.allSettled([
      fetchJson(contentUrl),
      fetchSafeLocation()
    ]);

    const bank = bankResult.status === 'fulfilled'
      ? validateBank(bankResult.value) || fallbackBank
      : fallbackBank;

    const location = geoResult.status === 'fulfilled' ? geoResult.value : null;

    render(chooseMessage(bank, location));
  }

  hideSignal();
  watchNavigationExit();

  runAfterFullPageLoad(() => {
    run().catch(() => {
      render({
        message: 'Unknown signal detected. Visitor arrived in stealth mode.',
        fallback: true
      });
    });
  });
}());