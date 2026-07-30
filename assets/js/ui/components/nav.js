
import { loadPartial } from '../../utils/fetch.js';

export async function initNav() {

  const headerHost = document.querySelector('header-placeholder');
  if (headerHost) {
    headerHost.innerHTML = await loadPartial('/partials/header.html');
  }


  const navHost = document.querySelector('nav-placeholder');
  if (!navHost) return;
  navHost.innerHTML = await loadPartial('/partials/nav.html');

  const toggleBtn   = document.getElementById('nav-toggle');
  const pane        = document.getElementById('side-nav');
  const closeBtn    = navHost.querySelector('.nav-close');
  const backdrop    = document.querySelector('.nav-backdrop');
  const body        = document.body;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const links       = Array.from(navHost.querySelectorAll('a[href]'));
  let lastFocus = null;

  function openNav() {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pane.classList.add('active');
    pane.setAttribute('aria-hidden', 'false');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    backdrop?.removeAttribute('hidden');
    body.classList.add('nav-open');
    const first = pane.querySelector(focusableSelector);
    first?.focus({ preventScroll: true });
  }

  function closeNav() {
    const wasOpen = pane.classList.contains('active');
    pane.classList.remove('active');
    pane.setAttribute('aria-hidden', 'true');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    backdrop?.setAttribute('hidden', '');
    body.classList.remove('nav-open');
    if (wasOpen) lastFocus?.focus?.({ preventScroll: true });
  }

  function toggleNav() {
    if (pane.classList.contains('active')) closeNav(); else openNav();
  }

  toggleBtn?.addEventListener('click', toggleNav);
  closeBtn?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);
  links.forEach((link) => {
    try {
      const url = new URL(link.getAttribute('href'), window.location.origin);
      const currentPath = window.location.pathname.replace(/\/index\.html$/i, '/');
      if (url.origin === window.location.origin && url.pathname === currentPath) {
        link.setAttribute('aria-current', 'page');
      }
    } catch {

    }

    link.addEventListener('click', closeNav);
  });


  window.addEventListener('keydown', (e) => {
    if (!pane.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeNav();
      return;
    }
    if (e.key !== 'Tab') return;

    const items = Array.from(pane.querySelectorAll(focusableSelector))
      .filter((item) => item instanceof HTMLElement && item.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
