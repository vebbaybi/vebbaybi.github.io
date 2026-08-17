const loader = document.querySelector('[data-route-loader]');
const menuButton = document.querySelector('[data-nav-toggle]');
const menu = document.querySelector('[data-site-nav]');
const root = document.documentElement;
root.classList.add('motion-enabled');
const themeKey = 'the1807.theme';
const themes = ['system', 'light', 'dark'];
const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/vebbaybi', d: 'M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.6-1.5-1.4-1.9-1.4-1.9-1.1-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.1 2 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.5 1.2a12 12 0 0 1 6.4 0c2.4-1.6 3.5-1.2 3.5-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.6.8.5A11.3 11.3 0 0 0 12 .7Z' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/uchenna-anozie-a86143308', d: 'M5.4 7.8H1V22h4.4V7.8ZM3.2 1A2.6 2.6 0 1 0 3.2 6.2 2.6 2.6 0 0 0 3.2 1ZM22 13.9c0-4.3-2.3-6.4-5.4-6.4-2.5 0-3.6 1.4-4.2 2.3v-2H8V22h4.4v-7c0-1.8.3-3.6 2.6-3.6 2.2 0 2.2 2.1 2.2 3.7V22H22v-8.1Z' },
];
const hydrionSocialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/hydrionsharks', d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
  { label: 'Discord', href: 'https://discord.gg/BpX3yTFWY', d: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z' },
  { label: 'Gmail', href: 'mailto:hydrion@gmail.com', d: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z' },
];

document.querySelectorAll('.brand').forEach((brand) => {
  brand.querySelector(':scope > span:last-child')?.replaceChildren(document.createTextNode('THE-1807'));
  if (brand.getAttribute('aria-label')?.toLowerCase().includes('home')) brand.setAttribute('aria-label', 'THE-1807 home');
});
const routeParts = location.pathname.split('/').filter(Boolean);
if (root.dataset.page === 'hydrion') document.body.classList.add(`hydrion-view--${routeParts[1] || 'overview'}`);

if (root.dataset.page === 'contact') {
  const professional = document.querySelector('[data-contact-professional]');
  if (professional) {
    const group = document.createElement('div'); group.className = 'social-links'; group.dataset.socialLinks = ''; group.setAttribute('aria-label', "Uchenna Anozie's social profiles"); professional.append(group);
  }
}

function storedTheme() { try { const mode = localStorage.getItem(themeKey); return themes.includes(mode) ? mode : 'system'; } catch { return 'system'; } }
function resolvedTheme(mode = storedTheme()) { return mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode; }
function applyTheme(mode, persist = true) {
  const safeMode = themes.includes(mode) ? mode : 'system';
  if (safeMode === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = safeMode;
  if (persist) { try { localStorage.setItem(themeKey, safeMode); } catch {} }
  const resolved = resolvedTheme(safeMode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0A1118' : '#F2F7FA');
  const control = document.querySelector('[data-theme-control]');
  if (control) {
    control.dataset.mode = safeMode;
    control.setAttribute('aria-label', `Theme: ${safeMode}. Activate to change theme.`);
    control.querySelector('[data-theme-label]')?.replaceChildren(document.createTextNode(safeMode));
    control.querySelector('[data-theme-icon]')?.replaceChildren(document.createTextNode(safeMode === 'dark' ? 'D' : safeMode === 'light' ? 'L' : 'S'));
  }
}

if (menu && !document.querySelector('[data-theme-control]')) {
  const control = document.createElement('button');
  control.type = 'button'; control.className = 'theme-control'; control.dataset.themeControl = '';
  const controlIcon = document.createElement('span');
  controlIcon.className = 'theme-control__icon'; controlIcon.dataset.themeIcon = ''; controlIcon.setAttribute('aria-hidden', 'true');
  const controlLabel = document.createElement('span');
  controlLabel.dataset.themeLabel = '';
  control.append(controlIcon, controlLabel);
  control.addEventListener('click', () => applyTheme(themes[(themes.indexOf(storedTheme()) + 1) % themes.length]));
  menu.append(control);
}
applyTheme(storedTheme(), false);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (storedTheme() === 'system') applyTheme('system', false); });

if (root.dataset.page === 'hydrion') {
  const productNav = document.createElement('nav'); productNav.className = 'hydrion-product-nav'; productNav.setAttribute('aria-label', 'Hydrion');
  const shell = document.createElement('div'); shell.className = 'shell';
  const strong = document.createElement('strong'); strong.textContent = 'Hydrion';
  shell.append(strong);
  [
    ['/hydrion/', 'Overview'],
    ['/hydrion/download/', 'Download'],
    ['/hydrion/docs/', 'Documentation'],
    ['/hydrion/releases/', 'Releases'],
    ['/hydrion/privacy/', 'Privacy'],
    ['/hydrion/#participate', 'Participate'],
  ].forEach(([href, text]) => {
    const a = document.createElement('a'); a.href = href; a.textContent = text;
    shell.append(a);
  });
  productNav.append(shell);
  document.querySelector('.site-header')?.after(productNav);
}

const platformControls = [...document.querySelectorAll('[data-platform-choice]')];
if (platformControls.length) {
  const platformKey = 'the1807.hydrion.platform';
  const detectPlatform = () => {
    const ua = navigator.userAgent || '';
    const ipadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/i.test(ua) || ipadDesktopMode) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'balanced';
  };
  const storedPlatform = () => { try { const value = localStorage.getItem(platformKey); return ['android','ios'].includes(value) ? value : null; } catch { return null; } };
    const applyPlatform = (platform, persist = false) => {
      const safePlatform = ['android','ios','balanced'].includes(platform) ? platform : 'balanced';
      document.body.dataset.hydrionPlatform = safePlatform;
      platformControls.forEach((control) => control.querySelectorAll('[data-platform-select]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.platformSelect === safePlatform))));
      document.querySelectorAll('[data-platform-text]').forEach((element) => {
        const value = safePlatform === 'ios' ? element.dataset.ios : safePlatform === 'android' ? element.dataset.android : '';
        if (value) element.textContent = value;
      });
      document.querySelectorAll('[data-platform-link]').forEach((link) => {
        if (safePlatform === 'ios') {
          link.href = link.dataset.iosHref;
          link.textContent = link.dataset.iosLabel;
        } else if (safePlatform === 'android') {
          link.href = link.dataset.androidHref;
          link.textContent = link.dataset.androidLabel;
        }
      });
      if (persist && safePlatform !== 'balanced') { try { localStorage.setItem(platformKey, safePlatform); } catch {} }
  };
  platformControls.forEach((control) => control.addEventListener('click', (event) => {
    const button = event.target.closest('[data-platform-select]');
    if (button) applyPlatform(button.dataset.platformSelect, true);
  }));
  applyPlatform(storedPlatform() || detectPlatform());
}

if (root.dataset.page === 'buffer') {
  const aside = document.querySelector('.page-hero__aside');
  if (aside) {
    aside.classList.add('buffer-hero__media');
    const logo = new Image(); logo.src = '/assets/images/products/bufferframes/bficon.png'; logo.alt = 'BufferFrames logo';
    aside.prepend(logo);
  }
}

function setLoader(active, label = 'Loading destination') {
  if (!loader) return;
  loader.querySelector('[data-loader-label]')?.replaceChildren(document.createTextNode(label));
  loader.classList.toggle('is-active', active);
  loader.setAttribute('aria-hidden', String(!active));
  document.body.classList.toggle('is-transitioning', active);
  document.body.classList.toggle('is-ready', !active);
}

function destinationFor(anchor) {
  try { return new URL(anchor.href, location.href); } catch { return null; }
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu?.classList.toggle('is-open', open);
});

menu?.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  menu.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
});

document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a[href]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (anchor.hasAttribute('download') || anchor.target === '_blank') return;
  const destination = destinationFor(anchor);
  if (!destination || !['http:', 'https:'].includes(destination.protocol)) return;
  if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return;
  setLoader(true, destination.origin === location.origin ? 'Routing inside THE-1807' : 'Leaving THE-1807');
});

window.addEventListener('pageshow', () => setLoader(false));
window.addEventListener('pagehide', (event) => { if (!event.persisted) setLoader(true, 'Routing'); });

if (document.readyState === 'complete') setLoader(false);
else window.addEventListener('load', () => setLoader(false), { once: true });

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy || '';
    const original = button.textContent;
    if (!value || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select the value to copy';
    }
    button.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1800 }).finished.finally(() => { button.textContent = original; });
  });
});

const SVG_NS = 'http://www.w3.org/2000/svg';
function buildIconLink({ label, href, d }, newTab) {
  const link = document.createElement('a');
  link.href = href;
  if (newTab) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  link.className = 'social-link';
  link.setAttribute('aria-label', newTab ? `${label} (opens in a new tab)` : label);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  const text = document.createElement('span');
  text.textContent = label;
  link.append(svg, text);
  return link;
}

document.querySelectorAll('[data-social-links]').forEach((group) => {
  socialLinks.forEach((entry) => group.append(buildIconLink(entry, true)));
});

document.querySelectorAll('[data-hydrion-social-links]').forEach((group) => {
  hydrionSocialLinks.forEach((entry) => group.append(buildIconLink(entry, !entry.href.startsWith('mailto:'))));
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const projects = document.querySelectorAll('[data-project]');
const motionSections = [...document.querySelectorAll('.hero, .page-hero, .hydrion-hero, .hydrion-chapter, .contact-scene, [data-project], [data-motion-scope]')];
motionSections.forEach((section, index) => {
  section.dataset.motion = section.dataset.project || (section.classList.contains('hero') ? 'identity' : `section-${index}`);
});

if ('IntersectionObserver' in window && motionSections.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio >= .16));
  }, { rootMargin: '-8% 0px -10%', threshold: [.08,.16,.38,.62] });
  motionSections.forEach((section) => observer.observe(section));
} else motionSections.forEach((section) => section.classList.add('is-active'));

// Semantic text remains in place; these layers are visual-only authored motion.
const identity = document.querySelector('[data-page="home"] #identity-title');
if (identity) {
  identity.classList.add('typing-loop');
  const visual = document.createElement('span');
  visual.className = 'typing-loop__visual'; visual.ariaHidden = 'true';
  let currentLine = document.createElement('span');
  currentLine.className = 'typing-loop__line';
  visual.append(currentLine);
  let charIndex = 0;
  identity.childNodes.forEach((node) => {
    if (node.nodeName === 'BR') {
      currentLine = document.createElement('span');
      currentLine.className = 'typing-loop__line';
      visual.append(currentLine);
      charIndex = 0;
      return;
    }
    for (const character of node.textContent || '') {
      const charSpan = document.createElement('span');
      charSpan.style.setProperty('--i', String(charIndex));
      charSpan.textContent = character;
      currentLine.append(charSpan);
      charIndex++;
    }
  });
  identity.append(visual);
}

// Preserve the semantic heading while adding product-specific visual choreography.
function motionSpan(className, text) {
  const span = document.createElement('span');
  if (className) span.className = className;
  if (text !== undefined) span.textContent = text;
  return span;
}

function addTitleChoreography(node, kind) {
  if (!node || node.querySelector('.title-motion')) return;
  const visual = document.createElement('span');
  visual.className = `title-motion title-motion--${kind}`;
  visual.ariaHidden = 'true';

  if (kind === 'store') {
    const store = motionSpan('title-motion__store', 'STORE');
    store.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
    visual.append(motionSpan('title-motion__lead', '7'), store, motionSpan('title-motion__status'));
  } else if (kind === 'playbox') {
    const box = motionSpan('title-motion__box', 'B');
    box.append(motionSpan('title-motion__o', 'O'), document.createTextNode('X'));
    visual.append(motionSpan('title-motion__lead', '7'), motionSpan('title-motion__play', 'PLAY'), box);
  } else if (kind === 'contact') {
    const lab = motionSpan('title-motion__lab', 'TO LAB');
    lab.append(motionSpan('title-motion__period', '.'));
    visual.append(motionSpan('title-motion__bring', 'BRING ME'), lab, motionSpan('title-motion__route'));
  }

  node.classList.add('has-title-motion');
  node.append(visual);
}

addTitleChoreography(document.querySelector('[data-page="7store"] .page-hero .display'), 'store');
addTitleChoreography(document.querySelector('[data-page="7playbox"] .page-hero .display'), 'playbox');
addTitleChoreography(document.querySelector('[data-page="contact"] .contact-intro .display'), 'contact');
document.querySelectorAll('[data-page="home"] .destination').forEach((card) => {
  addTitleChoreography(card.querySelector('.title'), card.getAttribute('href')?.includes('7store') ? 'store' : 'playbox');
});

const scrambleCharacters = '01/\\{}[]<>#*';
document.querySelectorAll('[data-scramble]').forEach((node) => {
  const finalText = node.textContent.trim();
  const visual = document.createElement('span'); visual.className = 'scramble-visual'; visual.ariaHidden = 'true'; node.append(visual);
  let resolved = false;
  const resolve = () => {
    if (resolved || reducedMotion.matches) { visual.textContent = finalText; return; }
    resolved = true; let frame = 0; const total = Math.max(18, finalText.length);
    const tick = () => { visual.textContent = [...finalText].map((character, index) => character === ' ' || character === '\n' ? character : index < frame ? character : scrambleCharacters[(index + frame) % scrambleCharacters.length]).join(''); if (++frame <= total) requestAnimationFrame(tick); };
    tick();
  };
  if ('IntersectionObserver' in window) new IntersectionObserver((entries, observer) => entries.forEach((entry) => { if (entry.isIntersecting) { resolve(); observer.disconnect(); } }), { threshold: .35 }).observe(node); else resolve();
});

projects.forEach((project, index) => {
  const state = project.querySelector('.state'); if (!state) return;
  const target = index + 1;
  const meter = document.createElement('span'); meter.className = 'digit-meter'; meter.ariaHidden = 'true'; meter.textContent = reducedMotion.matches ? String(target).padStart(2, '0') : '00';
  state.before(meter);
  const roll = () => {
    if (meter.dataset.resolved) return; meter.dataset.resolved = 'true';
    if (reducedMotion.matches) { meter.textContent = String(target).padStart(2, '0'); return; }
    const started = performance.now();
    const advance = (now) => { const value = Math.min(target, Math.floor((now - started) / 90) + 1); meter.textContent = String(value).padStart(2, '0'); if (value < target) requestAnimationFrame(advance); };
    requestAnimationFrame(advance);
  };
  if ('IntersectionObserver' in window) new IntersectionObserver((entries, observer) => entries.forEach((entry) => { if (entry.isIntersecting) { roll(); observer.disconnect(); } }), { threshold: .28 }).observe(project); else roll();
});

let motionFrame = 0;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
function updateMotion() {
  motionFrame = 0;
  if (reducedMotion.matches) return;
  const viewport = innerHeight || 1;
  motionSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const enter = clamp((viewport - rect.top) / (viewport * .72));
    const release = clamp((-rect.top) / Math.max(rect.height * .72, 1));
    const focus = clamp(1 - Math.abs((rect.top + rect.height / 2) - viewport / 2) / Math.max(viewport, rect.height));
    section.style.setProperty('--enter', enter.toFixed(3));
    section.style.setProperty('--focus', focus.toFixed(3));
    section.style.setProperty('--release', release.toFixed(3));
  });
}
function requestMotion() {
  if (!motionFrame) motionFrame = requestAnimationFrame(updateMotion);
}
addEventListener('scroll', requestMotion, { passive: true });
addEventListener('resize', requestMotion, { passive: true });
reducedMotion.addEventListener?.('change', requestMotion);
requestMotion();

const playbox = document.querySelector('[data-page="7playbox"] .page-hero');
playbox?.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches || matchMedia('(pointer: coarse)').matches) return;
  const rect = playbox.getBoundingClientRect();
  playbox.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width - .5).toFixed(3));
  playbox.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height - .5).toFixed(3));
});
playbox?.addEventListener('pointerleave', () => {
  playbox.style.setProperty('--pointer-x', 0);
  playbox.style.setProperty('--pointer-y', 0);
});
