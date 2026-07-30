(function () {
  'use strict';

  const SESSION_KEY = 'the1807.intro.complete';
  const entry = document.querySelector('[data-entry]');
  if (!entry) {
    window.dispatchEvent(new CustomEvent('SITE_READY', { detail: { reason: 'no_entry' } }));
    return;
  }

  const loader = entry.querySelector('[data-loader]');
  const puzzleStage = entry.querySelector('[data-puzzle-stage]');
  const completion = entry.querySelector('[data-entry-complete]');
  const skip = entry.querySelector('[data-entry-skip]');
  const replay = document.querySelector('[data-replay-intro]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parameters = new URLSearchParams(location.search);
  const force = parameters.get('intro') === '1';
  const bypass = parameters.get('bypass') === '1';
  let finished = false;
  let loaderTimer = 0;

  function storageGet() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  }
  function storageSet(value) {
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
  function revealSite(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(loaderTimer);
    storageSet(true);
    entry.classList.add('is-done');
    document.body.classList.remove('intro-active');
    entry.hidden = true;
    window.__SITE_READY__ = true;
    window.dispatchEvent(new CustomEvent('SITE_READY', { detail: { reason } }));
    document.querySelector('#main')?.focus({ preventScroll: true });
  }
  function showCompletion(reason) {
    if (finished) return;
    const expressiveShark = completion.querySelector('[data-expressive-shark]');
    if (expressiveShark && !expressiveShark.getAttribute('src')) {
      expressiveShark.setAttribute('src', expressiveShark.dataset.expressiveShark);
    }
    puzzleStage.hidden = true;
    completion.hidden = false;
    setTimeout(() => revealSite(reason), reduced ? 20 : 480);
  }
  function mountPuzzle() {
    loader.hidden = true;
    puzzleStage.hidden = false;
    if (!window.VBIntroPuzzle?.mount) {
      revealSite('puzzle_unavailable');
      return;
    }
    try {
      window.VBIntroPuzzle.mount({
        container: puzzleStage,
        imageSrc: '/assets/images/img/logo/logooss.png',
        onSolved: () => showCompletion('solved'),
        onSkip: () => revealSite('skipped'),
      });
    } catch {
      revealSite('puzzle_failed');
    }
  }
  function start() {
    finished = false;
    entry.hidden = false;
    entry.classList.remove('is-done');
    document.body.classList.add('intro-active');
    completion.hidden = true;
    puzzleStage.hidden = true;
    loader.hidden = false;
    loaderTimer = setTimeout(mountPuzzle, reduced ? 120 : 900);
  }

  skip?.addEventListener('click', () => revealSite('skipped'));
  replay?.addEventListener('click', () => {
    storageSet(false);
    start();
  });
  window.addEventListener('error', () => {
    if (!finished && !loader.hidden) revealSite('fallback');
  }, { once: true });

  if (bypass || (storageGet() && !force)) {
    entry.hidden = true;
    document.body.classList.remove('intro-active');
    window.__SITE_READY__ = true;
    window.dispatchEvent(new CustomEvent('SITE_READY', { detail: { reason: bypass ? 'test_bypass' : 'session_complete' } }));
  } else {
    start();
  }
})();
