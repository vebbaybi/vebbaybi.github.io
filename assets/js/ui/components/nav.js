
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
  const links       = Array.from(navHost.querySelectorAll('a[href]'));

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
    if (e.key === 'Escape' && pane.classList.contains('active')) closeNav();
  });
}
