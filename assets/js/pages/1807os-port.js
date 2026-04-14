import { createDockItems, getModule, moduleOrder } from '../data/1807os-modules.js';
import { initEosStation } from '../ui/eos-station.js';

const state = {
  active: 'ai',
  terminalLines: [],
  autoplay: null,
  userLocked: false,
};

const selectors = {
  clock: document.querySelector('[data-clock]'),
  terminalFeed: document.querySelector('[data-terminal-feed]'),
  previewTitle: document.querySelector('[data-preview-title]'),
  previewDescription: document.querySelector('[data-preview-description]'),
  previewState: document.querySelector('[data-preview-state]'),
  previewTags: document.querySelector('[data-preview-tags]'),
  previewLink: document.querySelector('[data-preview-link]'),
  previewClassicLink: document.querySelector('[data-preview-classic-link]'),
  previewPattern: document.querySelector('[data-preview-pattern]'),
  previewTone: document.querySelector('[data-preview-tone]'),
  activeRoute: document.querySelector('[data-active-route]'),
  activeRouteCopy: document.querySelector('[data-active-route-copy]'),
  moduleButtons: [...document.querySelectorAll('[data-module]')],
  dock: document.querySelector('[data-os-dock]'),
  bootSequence: document.querySelector('[data-boot-sequence]'),
  metricBars: {
    signal: document.querySelector('[data-metric-bar="signal"]'),
    depth: document.querySelector('[data-metric-bar="depth"]'),
    field: document.querySelector('[data-metric-bar="field"]'),
  },
  metricValues: {
    signal: document.querySelector('[data-metric-value="signal"]'),
    depth: document.querySelector('[data-metric-value="depth"]'),
    field: document.querySelector('[data-metric-value="field"]'),
  },
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

function pushTerminalLine(message) {
  const stamp = clockString();
  state.terminalLines.unshift({ stamp, message });
  state.terminalLines = state.terminalLines.slice(0, 6);

  if (!selectors.terminalFeed) return;

  selectors.terminalFeed.innerHTML = state.terminalLines.map((line) => `
    <div class="terminal-line">
      <span class="terminal-time">${line.stamp}</span>
      <span>${line.message}</span>
    </div>
  `).join('');
}

function applyAccent(module) {
  document.documentElement.style.setProperty('--module-accent', module.accent);
  document.documentElement.style.setProperty('--module-accent-soft', module.glow);
}

function renderTags(tags) {
  if (!selectors.previewTags) return;
  selectors.previewTags.innerHTML = tags.map((tag) => `<span>${tag}</span>`).join('');
}

function renderMetrics(metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    if (selectors.metricBars[key]) selectors.metricBars[key].style.width = `${value}%`;
    if (selectors.metricValues[key]) selectors.metricValues[key].textContent = `${value}%`;
  });
}

function renderDock() {
  if (!selectors.dock) return;

  selectors.dock.innerHTML = createDockItems().map((item) => `
    <a class="dock-link${item.id === state.active ? ' is-active' : ''}" href="${item.route}" data-dock-link="${item.id}">${item.label}</a>
  `).join('');
}

function setActiveModule(id, source = 'system') {
  const module = getModule(id);
  state.active = module.id;

  applyAccent(module);
  renderDock();

  selectors.moduleButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.module === module.id);
  });

  if (selectors.previewTitle) selectors.previewTitle.textContent = module.title;
  if (selectors.previewDescription) selectors.previewDescription.textContent = module.description;
  if (selectors.previewState) selectors.previewState.textContent = module.state;
  if (selectors.previewLink) {
    selectors.previewLink.href = module.route;
    selectors.previewLink.textContent = module.action;
  }
  if (selectors.previewClassicLink) {
    selectors.previewClassicLink.href = module.classicRoute;
    selectors.previewClassicLink.textContent = module.classicLabel;
  }
  if (selectors.previewPattern) selectors.previewPattern.textContent = module.pattern;
  if (selectors.previewTone) selectors.previewTone.textContent = module.tone;
  if (selectors.activeRoute) selectors.activeRoute.textContent = module.route;
  if (selectors.activeRouteCopy) selectors.activeRouteCopy.textContent = module.route;

  renderTags(module.tags);
  renderMetrics(module.metrics);
  pushTerminalLine(`${source}: ${module.log}`);
}

function stopAutoplay() {
  state.userLocked = true;
  if (state.autoplay) {
    clearInterval(state.autoplay);
    state.autoplay = null;
  }
}

function startAutoplay() {
  let index = moduleOrder.indexOf(state.active);
  state.autoplay = window.setInterval(() => {
    if (state.userLocked) return;
    index = (index + 1) % moduleOrder.length;
    setActiveModule(moduleOrder[index], 'auto');
  }, 5200);
}

function bindModuleButtons() {
  selectors.moduleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const module = getModule(button.dataset.module);
      if (state.active === module.id) {
        window.location.assign(module.route);
        return;
      }

      stopAutoplay();
      setActiveModule(module.id, 'manual');
    });
  });
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

  pushTerminalLine('system: 1807os workspace online.');
  renderDock();
  setActiveModule(state.active, 'system');
  bindModuleButtons();
  startAutoplay();
  initBootSequence();
  initEosStation({ getCurrentModuleId: () => state.active });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}


