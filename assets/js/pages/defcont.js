const SELECTOR_REVEAL = '.reveal-card';

function initRevealCards() {
  const cards = Array.from(document.querySelectorAll(SELECTOR_REVEAL));
  if (cards.length === 0) {
    return () => {};
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    cards.forEach(card => card.classList.add('is-visible'));
    return () => {};
  }

  const observer = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    }
  }, {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.16,
  });

  cards.forEach(card => observer.observe(card));
  return () => observer.disconnect();
}

function initSmoothJumpLinks() {
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  if (links.length === 0) {
    return () => {};
  }

  const onClick = event => {
    const link = event.currentTarget;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const updateHash = () => {
      history.replaceState(null, '', href);
      if (typeof target.focus === 'function') {
        const hadTabIndex = target.hasAttribute('tabindex');
        if (!hadTabIndex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    };

    window.setTimeout(updateHash, 220);
  };

  links.forEach(link => link.addEventListener('click', onClick));
  return () => links.forEach(link => link.removeEventListener('click', onClick));
}

function initPageIndexVisibility() {
  const pageIndex = document.querySelector('.page-index');
  const hero = document.querySelector('.defconts-hero');
  if (!pageIndex || !hero || !('IntersectionObserver' in window)) {
    return () => {};
  }

  const observer = new IntersectionObserver(entries => {
    const [entry] = entries;
    pageIndex.style.opacity = entry.isIntersecting ? '.45' : '.88';
  }, {
    threshold: 0.4,
  });

  observer.observe(hero);
  return () => observer.disconnect();
}

function bootDefconts() {
  const cleanups = [
    initRevealCards(),
    initSmoothJumpLinks(),
    initPageIndexVisibility(),
  ];

  window.addEventListener('beforeunload', () => {
    cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('defconts cleanup failed:', error);
      }
    });
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDefconts, { once: true });
} else {
  queueMicrotask(bootDefconts);
}