const manifestUrl = '/assets/data/certificates.json';
const supportedTypes = new Set(['pdf', 'image']);

function textElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed);
}

function createMedia(certificate, eager) {
  const link = document.createElement('a');
  link.className = 'certificate-feed__media';
  link.href = certificate.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `Open ${certificate.title}${certificate.type === 'pdf' ? ' PDF' : ''}`);

  const source = certificate.type === 'image' ? certificate.href : certificate.preview;
  if (source) {
    const image = document.createElement('img');
    image.src = source;
    image.alt = certificate.alt || `${certificate.title} certificate preview`;
    image.loading = eager ? 'eager' : 'lazy';
    image.decoding = 'async';
    link.appendChild(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'certificate-feed__pdf';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.append(
      textElement('strong', '', 'PDF'),
      textElement('span', '', 'Certificate document'),
    );
    link.appendChild(placeholder);
  }
  return link;
}

function createCard(certificate, index) {
  const card = document.createElement('article');
  card.className = 'certificate-feed__card';
  card.dataset.certificateId = certificate.id;
  card.appendChild(createMedia(certificate, index < 4));

  const body = document.createElement('div');
  body.className = 'certificate-feed__body';
  const eyebrow = document.createElement('div');
  eyebrow.className = 'certificate-feed__eyebrow';
  eyebrow.appendChild(textElement('span', '', certificate.issuer || certificate.category || 'Certificate'));
  eyebrow.appendChild(textElement('span', 'certificate-feed__type', certificate.type === 'pdf' ? 'PDF' : certificate.extension.slice(1).toUpperCase()));

  const title = textElement('h3', 'certificate-feed__title', certificate.title);
  body.append(eyebrow, title);
  if (certificate.date) {
    const time = textElement('time', 'certificate-feed__date', formatDate(certificate.date));
    time.dateTime = certificate.date;
    body.appendChild(time);
  }
  if (certificate.description) body.appendChild(textElement('p', 'certificate-feed__description', certificate.description));

  const action = document.createElement('a');
  action.className = 'certificate-feed__action';
  action.href = certificate.href;
  action.target = '_blank';
  action.rel = 'noopener noreferrer';
  action.textContent = certificate.type === 'pdf' ? 'Open PDF' : 'View certificate';
  action.setAttribute('aria-label', `${action.textContent}: ${certificate.title}`);
  body.appendChild(action);
  card.appendChild(body);
  return card;
}

function normalizeManifest(value) {
  const certificates = Array.isArray(value) ? value : value?.certificates;
  if (!Array.isArray(certificates)) throw new Error('Certificate manifest has an invalid shape.');
  return certificates.filter((item) => item && supportedTypes.has(item.type) && item.id && item.href && item.title);
}

export async function loadCertificateManifest({ signal, cache = 'no-cache' } = {}) {
  const response = await fetch(manifestUrl, { signal, cache });
  if (!response.ok) throw new Error(`Certificate manifest request failed (${response.status}).`);
  return normalizeManifest(await response.json());
}

function fillSelect(select, label, values) {
  if (!select) return;
  const selected = select.value || 'all';
  select.replaceChildren();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = label;
  select.appendChild(all);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(selected) ? selected : 'all';
}

export function mountCertificateFeed(root, options = {}) {
  if (!root || root.dataset.certificateMounted === 'true') return null;
  root.dataset.certificateMounted = 'true';
  const selectTarget = (selector) => selector ? document.querySelector(selector) : null;
  const status = options.status || selectTarget(root.dataset.statusTarget);
  const countTargets = Array.from(document.querySelectorAll('[data-certificate-count]'));
  const search = options.search || selectTarget(root.dataset.searchTarget);
  const category = options.category || selectTarget(root.dataset.categoryTarget);
  const issuer = options.issuer || selectTarget(root.dataset.issuerTarget);
  const sort = options.sort || selectTarget(root.dataset.sortTarget);
  const limit = Number(root.dataset.limit || options.limit || 0);
  const controller = new AbortController();
  let certificates = [];
  let lastPayload = '';
  let pollTimer = null;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function render() {
    const phrase = String(search?.value || '').trim().toLowerCase();
    const categoryValue = category?.value || 'all';
    const issuerValue = issuer?.value || 'all';
    const sortValue = sort?.value || 'manifest';
    let visible = certificates.filter((item) => {
      const haystack = `${item.title} ${item.issuer || ''} ${item.category || ''}`.toLowerCase();
      return (!phrase || haystack.includes(phrase))
        && (categoryValue === 'all' || item.category === categoryValue)
        && (issuerValue === 'all' || item.issuer === issuerValue);
    });

    if (sortValue === 'newest') visible.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || a.title.localeCompare(b.title));
    if (sortValue === 'oldest') visible.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || a.title.localeCompare(b.title));
    if (sortValue === 'alpha') visible.sort((a, b) => a.title.localeCompare(b.title));
    if (limit > 0) visible = visible.slice(0, limit);

    const fragment = document.createDocumentFragment();
    visible.forEach((certificate, index) => fragment.appendChild(createCard(certificate, index)));
    root.replaceChildren(fragment);
    root.classList.toggle('certificate-feed--empty', visible.length === 0);
    if (!visible.length) root.appendChild(textElement('p', 'certificate-feed__empty', 'No credentials match these filters.'));
    announce(`${visible.length} of ${certificates.length} credential${certificates.length === 1 ? '' : 's'} shown.`);
    options.onRender?.({ all: certificates, visible });
  }

  async function refresh({ quiet = false } = {}) {
    if (!quiet) announce('Loading credentials…');
    try {
      const response = await fetch(`${manifestUrl}?v=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Certificate manifest request failed (${response.status}).`);
      const payload = await response.text();
      if (payload === lastPayload) return;
      certificates = normalizeManifest(JSON.parse(payload));
      lastPayload = payload;
      countTargets.forEach((target) => { target.textContent = String(certificates.length); });
      fillSelect(category, 'All categories', [...new Set(certificates.map((item) => item.category).filter(Boolean))].sort());
      fillSelect(issuer, 'All issuers', [...new Set(certificates.map((item) => item.issuer).filter(Boolean))].sort());
      render();
      options.onLoaded?.(certificates);
    } catch (error) {
      if (error.name === 'AbortError') return;
      root.replaceChildren(textElement('p', 'certificate-feed__error', 'Credentials are temporarily unavailable. Please try again shortly.'));
      announce('The credential list could not be loaded.');
      console.error('Certificate feed failed:', error);
    }
  }

  [search, category, issuer, sort].filter(Boolean).forEach((control) => {
    control.addEventListener(control === search ? 'input' : 'change', render, { signal: controller.signal });
  });
  refresh();

  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  if (isLocal && root.dataset.autoRefresh !== 'false') {
    pollTimer = window.setInterval(() => refresh({ quiet: true }), 2500);
  }

  return {
    refresh,
    destroy() {
      controller.abort();
      if (pollTimer) window.clearInterval(pollTimer);
      delete root.dataset.certificateMounted;
    },
  };
}

document.querySelectorAll('[data-certificate-feed]').forEach((root) => mountCertificateFeed(root));
