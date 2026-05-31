


import { loadPartial } from '../../utils/fetch.js';
import { initTheme } from '../theme.js';

export async function initHeader() {

  const host = document.querySelector('header-placeholder');
  if (!host) {

    initTheme();
    return;
  }


  try {
    host.innerHTML = await loadPartial('/partials/header.html');
  } catch (err) {
    console.error('[header] failed to load partial:', err);
    initTheme();
    return;
  }
}