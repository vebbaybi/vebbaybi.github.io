const BUBBLE_ID = 'contractor-doctrine-bubble';
const SESSION_DISMISSED = 'the1807_contractor_bubble_dismissed_session';
const LEGACY_STORAGE_DISMISSED = 'the1807_contractor_bubble_dismissed';
const LEGACY_STORAGE_CLICKED = 'the1807_contractor_bubble_clicked';
const LEGACY_STORAGE_VISITED = 'the1807_contractor_page_visited';
const SHOW_DELAY_MS = 10000;
const VISIBILITY_RETRY_MS = 1200;
const TRANSITION_MS = 220;
const TARGET_PATH = '/1807-contractor/';

function readSession(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {

  }
}

function normalizeRoute(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';

  const last = parts[parts.length - 1].toLowerCase();
  if (last === 'index' || last === 'index.html') return '/';

  const noHtml = last.endsWith('.html') ? last.slice(0, -5) : last;
  return `/${noHtml}`;
}

function shouldBlockBubble(route) {
  return route === '/' || route === '/1807-contractor';
}

function clearLegacyStickyState() {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_DISMISSED);
    window.localStorage.removeItem(LEGACY_STORAGE_CLICKED);
    window.localStorage.removeItem(LEGACY_STORAGE_VISITED);
  } catch {

  }
}

function isDismissedForSession() {
  return readSession(SESSION_DISMISSED) === '1';
}

function createBubble() {
  const existing = document.getElementById(BUBBLE_ID);
  if (existing) return existing;

  const wrapper = document.createElement('aside');
  wrapper.id = BUBBLE_ID;
  wrapper.className = 'contractor-bubble';
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.setAttribute('aria-label', '1807 contractor page prompt');
  wrapper.hidden = true;

  const inner = document.createElement('div');
  inner.className = 'contractor-bubble__inner';

  const link = document.createElement('a');
  link.className = 'contractor-bubble__link';
  link.href = TARGET_PATH;
  link.setAttribute('aria-label', 'Open the 1807 contractor page');

  const eyebrow = document.createElement('span');
  eyebrow.className = 'contractor-bubble__eyebrow';
  eyebrow.textContent = 'The 1807';

  const text = document.createElement('span');
  text.className = 'contractor-bubble__text';
  text.textContent = 'Who is an 1807 contractor?';

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'contractor-bubble__dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss this prompt');
  dismiss.title = 'Dismiss';
  dismiss.textContent = 'x';

  link.append(eyebrow, text);
  inner.append(link, dismiss);
  wrapper.appendChild(inner);

  document.body.appendChild(wrapper);
  return wrapper;
}

function showBubble(bubble) {
  if (!bubble) return;

  bubble.hidden = false;
  requestAnimationFrame(() => {
    bubble.classList.add('is-visible');
  });
}

function hideBubble(bubble, { remove = false } = {}) {
  if (!bubble) return;

  bubble.classList.remove('is-visible');
  window.setTimeout(() => {
    bubble.hidden = true;
    if (remove) bubble.remove();
  }, TRANSITION_MS);
}

function shouldWaitForSiteReady() {
  return document.body.classList.contains('no-scroll') && !window.__SITE_READY__;
}

export function initContractorBubble() {
  const route = normalizeRoute();

  clearLegacyStickyState();

  if (shouldBlockBubble(route) || isDismissedForSession()) {
    return {
      cleanup() {},
    };
  }

  let timerId = null;
  let bubble = null;
  let siteReadyCleanup = null;

  const scheduleReveal = (delay = SHOW_DELAY_MS) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(reveal, delay);
  };

  const reveal = () => {
    if (document.hidden || isDismissedForSession() || bubble) return;

    bubble = createBubble();

    const linkEl = bubble.querySelector('.contractor-bubble__link');
    const dismissBtn = bubble.querySelector('.contractor-bubble__dismiss');

    const onOpen = () => {};

    const onDismiss = () => {
      writeSession(SESSION_DISMISSED, '1');
      hideBubble(bubble, { remove: true });
      bubble = null;
    };

    linkEl.addEventListener('click', onOpen, { once: true });
    dismissBtn.addEventListener('click', onDismiss, { once: true });

    bubble.__cleanup = () => {
      linkEl.removeEventListener('click', onOpen);
      dismissBtn.removeEventListener('click', onDismiss);
    };

    showBubble(bubble);
  };

  if (shouldWaitForSiteReady()) {
    const onSiteReady = () => {
      siteReadyCleanup = null;
      scheduleReveal();
    };

    window.addEventListener('SITE_READY', onSiteReady, { once: true });
    siteReadyCleanup = () => window.removeEventListener('SITE_READY', onSiteReady);
  } else {
    scheduleReveal();
  }

  const onVisibilityChange = () => {
    if (!document.hidden && !bubble && !isDismissedForSession()) {
      scheduleReveal(VISIBILITY_RETRY_MS);
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    cleanup() {
      window.clearTimeout(timerId);
      siteReadyCleanup?.();
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (bubble && typeof bubble.__cleanup === 'function') {
        bubble.__cleanup();
      }

      if (bubble?.isConnected) {
        bubble.remove();
      }

      bubble = null;
    },
  };
}
