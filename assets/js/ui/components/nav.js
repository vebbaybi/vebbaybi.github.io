// assets/js/ui/components/nav.js
import { loadPartial } from '../../utils/fetch.js';

export async function initNav() {
  // mount header (so the toggle exists at far right)
  const headerHost = document.querySelector('header-placeholder');
  if (headerHost) {
    headerHost.innerHTML = await loadPartial('/partials/header.html');
  }

  // mount side pane
  const navHost = document.querySelector('nav-placeholder');
  if (!navHost) return;
  navHost.innerHTML = await loadPartial('/partials/nav.html');

  const toggleBtn   = document.getElementById('nav-toggle');             // in header
  const pane        = document.getElementById('side-nav');               // the pane
  const closeBtn    = navHost.querySelector('.nav-close');               // inside pane
  const backdrop    = document.querySelector('.nav-backdrop');           // sibling overlay
  const body        = document.body;

  function openNav() {
    pane.classList.add('active');
    pane.setAttribute('aria-hidden', 'false');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    backdrop?.removeAttribute('hidden');
    body.classList.add('nav-open');
  }

  function closeNav() {
    pane.classList.remove('active');
    pane.setAttribute('aria-hidden', 'true');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    backdrop?.setAttribute('hidden', '');
    body.classList.remove('nav-open');
  }

  function toggleNav() {
    if (pane.classList.contains('active')) closeNav(); else openNav();
  }

  toggleBtn?.addEventListener('click', toggleNav);
  closeBtn?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);

  // ESC to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pane.classList.contains('active')) closeNav();
  });
}
