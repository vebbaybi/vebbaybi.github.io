import { createDockItems, getModule, moduleOrder } from '../data/1807os-modules.js';
import { initEosStation } from '../ui/eos-station.js';

const moduleId = document.body.dataset.osModule || 'ai';
const module = getModule(moduleId);

const selectors = {
  clock: document.querySelector('[data-clock]'),
  pageTitle: document.querySelector('[data-app-title]'),
  pageKicker: document.querySelector('[data-app-kicker]'),
  pageDescription: document.querySelector('[data-app-description]'),
  pageState: document.querySelector('[data-app-state]'),
  currentRoutes: [...document.querySelectorAll('[data-app-route]')],
  currentPattern: document.querySelector('[data-app-pattern]'),
  currentTone: document.querySelector('[data-app-tone]'),
  classicLink: document.querySelector('[data-app-classic-link]'),
  strip: document.querySelector('[data-app-strip]'),
  feed: document.querySelector('[data-app-feed]'),
  panels: document.querySelector('[data-app-panels]'),
  links: document.querySelector('[data-app-links]'),
  outcomes: document.querySelector('[data-app-outcomes]'),
  nav: document.querySelector('[data-os-nav]'),
  dock: document.querySelector('[data-os-dock]'),
  bootSequence: document.querySelector('[data-boot-sequence]'),
  metricBars: document.querySelector('[data-app-meters]'),
};

function clockString() {
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function renderClock() {
  if (selectors.clock) selectors.clock.textContent = clockString();
}

function renderNav() {
  if (!selectors.nav) return;

  selectors.nav.innerHTML = moduleOrder.map((id, index) => {
    const item = getModule(id);
    return `
      <a class="launch-link${item.id === module.id ? ' is-active' : ''}" href="${item.route}">
        <span class="launch-index">0${index + 1}</span>
        <span class="launch-copy">
          <strong>${item.title}</strong>
          <span>${item.kicker}</span>
        </span>
      </a>
    `;
  }).join('');
}

function renderDock() {
  if (!selectors.dock) return;

  selectors.dock.innerHTML = createDockItems().map((item) => `
    <a class="dock-link${item.id === module.id ? ' is-active' : ''}" href="${item.route}">${item.label}</a>
  `).join('');
}

function renderMeters() {
  if (!selectors.metricBars) return;

  selectors.metricBars.innerHTML = Object.entries(module.metrics).map(([key, value]) => `
    <div class="telemetry-item telemetry-item-app">
      <div class="telemetry-head">
        <span>${key === 'signal' ? 'Signal Strength' : key === 'depth' ? 'Execution Depth' : 'Field Readiness'}</span>
        <strong>${value}%</strong>
      </div>
      <div class="telemetry-bar"><span style="width:${value}%"></span></div>
    </div>
  `).join('');
}

function renderStrip() {
  if (!selectors.strip) return;
  selectors.strip.innerHTML = module.strip.map((item) => `
    <div>
      <span class="strip-label">${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function renderFeed() {
  if (!selectors.feed) return;

  selectors.feed.innerHTML = module.feed.map((entry) => `
    <div class="terminal-line">
      <span class="terminal-time">${clockString()}</span>
      <span>${entry}</span>
    </div>
  `).join('');
}

function renderPanels() {
  if (!selectors.panels) return;
  selectors.panels.innerHTML = module.panels.map((panel) => `
    <article class="insight-card">
      <p class="signal-label">${panel.title}</p>
      <p>${panel.body}</p>
    </article>
  `).join('');
}

function renderLinks() {
  if (!selectors.links) return;
  selectors.links.innerHTML = `
    <div class="link-stack">
      ${module.links.map((item) => `
        <a class="path-link" href="${item.href}">
          <strong>${item.label}</strong>
          <span>${item.note}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderOutcomes() {
  if (!selectors.outcomes) return;
  selectors.outcomes.innerHTML = module.outcomes.map((item) => `
    <article class="outcome-card">
      <span class="signal-label">${item.label}</span>
      <strong>${item.value}</strong>
    </article>
  `).join('');
}

function applyAccent() {
  document.documentElement.style.setProperty('--module-accent', module.accent);
  document.documentElement.style.setProperty('--module-accent-soft', module.glow);
}

function populatePage() {
  document.title = `${module.title} | 1807os Workspace | The 1807`;

  if (selectors.pageTitle) selectors.pageTitle.textContent = module.title;
  if (selectors.pageKicker) selectors.pageKicker.textContent = module.kicker;
  if (selectors.pageDescription) selectors.pageDescription.textContent = module.description;
  if (selectors.pageState) selectors.pageState.textContent = module.state;
  selectors.currentRoutes.forEach((node) => {
    node.textContent = module.route;
  });
  if (selectors.currentPattern) selectors.currentPattern.textContent = module.pattern;
  if (selectors.currentTone) selectors.currentTone.textContent = module.tone;
  if (selectors.classicLink) {
    selectors.classicLink.href = module.classicRoute;
    selectors.classicLink.textContent = module.classicLabel;
  }

  applyAccent();
  renderNav();
  renderDock();
  renderMeters();
  renderStrip();
  renderFeed();
  renderPanels();
  renderLinks();
  renderOutcomes();
}

function dismissBootSequence() {
  document.body.classList.remove('is-booting');
}

function initBootSequence() {
  window.setTimeout(dismissBootSequence, 1350);
  selectors.bootSequence?.addEventListener('click', dismissBootSequence, { once: true });
}

function init() {
  renderClock();
  window.setInterval(renderClock, 1000);
  populatePage();
  initBootSequence();
  initEosStation({ getCurrentModuleId: () => module.id });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}


