import { loadPartial } from '../../utils/fetch.js';

export async function initHeader() {
  const host = document.querySelector('header-placeholder');
  if (!host) return;
  host.innerHTML = await loadPartial('/partials/header.html');

  const toggle = host.querySelector('.nav-toggle');
  const menu = host.querySelector('#nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
}
