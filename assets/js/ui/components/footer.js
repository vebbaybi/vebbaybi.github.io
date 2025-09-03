import { loadPartial } from '../../utils/fetch.js';

export async function initFooter() {
  const host = document.querySelector('footer-placeholder');
  if (!host) return;
  host.innerHTML = await loadPartial('/partials/footer.html');
}
