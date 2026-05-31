


const STORAGE_KEY = 'pref:theme';
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
  let v = null;
  try {
    v = localStorage.getItem(STORAGE_KEY);
  } catch {
    v = null;
  }
  return v === 'light' ? 'light' : (v === 'dark' ? 'dark' : null);
}

export function detectInitialTheme() {

  if (document.body.classList.contains(CLASS_LIGHT)) return 'light';
  if (document.body.classList.contains(CLASS_DARK))  return 'dark';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  applyClass(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {

  }
  return next;
}

export function initTheme() {
  const stored = getStoredTheme();
  const mode = stored ?? detectInitialTheme();
  applyClass(mode);
  if (stored !== mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {

    }
  }
  return mode;
}

export function bindThemeToggle(btn) {
  if (!btn) return;


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

export function initThemeToggle() {
    const themeButton = document.getElementById('theme-toggle');
    bindThemeToggle(themeButton);
}
