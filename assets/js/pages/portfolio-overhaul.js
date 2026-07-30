import { initNeonNet } from '../effects/neon-net.js';

initNeonNet();

const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-primary-nav]');
if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  });
  menu.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
}

document.querySelectorAll('[data-disabled-action]').forEach((action) => {
  action.addEventListener('click', (event) => event.preventDefault());
});

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
