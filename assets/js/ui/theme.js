// assets/js/ui/theme.js
// Theme controller: apply, load/save, and bind a toggle button.

const STORAGE_KEY = 'pref:theme'; // 'light' | 'dark'
const CLASS_LIGHT = 'theme-light';
const CLASS_DARK  = 'theme-dark';

function applyClass(next) {
  const b = document.body;
  if (next === 'light') {
    b.classList.add(CLASS_LIGHT);
    b.classList.remove(CLASS_DARK);
  } else {
    b.classList.remove(CLASS_LIGHT);
    b.classList.add(CLASS_DARK);
  }
}

export function getStoredTheme() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' ? 'light' : (v === 'dark' ? 'dark' : null);
}

export function detectInitialTheme() {
  // default to existing body class; if ambiguous, prefer OS
  if (document.body.classList.contains(CLASS_LIGHT)) return 'light';
  if (document.body.classList.contains(CLASS_DARK))  return 'dark';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  applyClass(next);
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function initTheme() {
  const stored = getStoredTheme();
  const mode = stored ?? detectInitialTheme();
  applyClass(mode);
  if (stored !== mode) localStorage.setItem(STORAGE_KEY, mode);
  return mode;
}

export function bindThemeToggle(btn) {
  if (!btn) return;

  // initialize ARIA state
  const syncAria = (mode) => {
    const isLight = mode === 'light';
    btn.setAttribute('aria-pressed', String(isLight));
    btn.setAttribute('title', isLight ? 'Switch to dark' : 'Switch to light');
  };

  syncAria(initTheme());

  btn.addEventListener('click', () => {
    const current = getStoredTheme() ?? detectInitialTheme();
    const next = current === 'light' ? 'dark' : 'light';
    syncAria(applyTheme(next));
  }, { passive: true });
}
//binding button
export function initThemeToggle() {
    const themeButton = document.getElementById('theme-toggle');
    bindThemeToggle(themeButton);
}