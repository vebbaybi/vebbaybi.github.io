import { routes } from './routes.js';

function matchRoute(hash) {
  return routes.find(r => r.path === hash) || routes[0];
}

export function initRouter(onAfterNavigate) {
  async function render() {
    const hash = window.location.hash || '#/';
    const route = matchRoute(hash);
    const module = await route.view();
    await module.render(document.getElementById('app'));
    document.querySelectorAll('a[data-link]').forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('href') === route.path ? 'page' : null);
    });
    if (typeof onAfterNavigate === 'function') onAfterNavigate(route);
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('load', render);
}
