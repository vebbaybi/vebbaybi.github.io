// assets/js/ui/components/header.js
// Injects /partials/header.html.

import { loadPartial } from '../../utils/fetch.js';
import { initTheme } from '../theme.js';

export async function initHeader() {
  // Find mount
  const host = document.querySelector('header-placeholder');
  if (!host) {
    // Ensure theme is at least initialized even if header isn’t mounted
    initTheme();
    return;
  }

  // Inject HTML
  try {
    host.innerHTML = await loadPartial('/partials/header.html');
  } catch (err) {
    console.error('[header] failed to load partial:', err);
    initTheme();
    return;
  }
}