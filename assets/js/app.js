// assets/js/app.js
// Global bootstrap for MPA: inject header/footer, update meta, init right-side nav.
// Initializes scroll_paper.js for /scroll_paper only, with cleanup.
// Boots immediately. Works on GitHub Pages subpaths.

import { updateMeta } from './meta/meta.js';
import { initFooter } from './ui/components/footer.js';
import { initHeader } from './ui/components/header.js';
import { initNav } from './ui/components/nav.js';
import { initThemeToggle } from './ui/theme.js';

const pageMeta = {
  '/':               { title: 'Home — 1807-Chain',            desc: 'webbaby portfolio' },
  '/home':           { title: 'Home — 1807-Chain',            desc: 'webbaby portfolio' },
  '/scroll_paper':   { title: 'Scroll Paper — 1807-Chain',    desc: 'Newspaper story & showcase' },
  '/projects':       { title: 'Projects — 1807-Chain',        desc: 'AI, Embedded-Systems, and Blockchain projects' },
  '/ai':             { title: 'AI Projects — 1807-Chain',     desc: 'Models, pipelines, and production AI systems' },
  '/robotics':       { title: 'Robotics — 1807-Chain',        desc: 'Embedded, control, and vision systems' },
  '/chains':         { title: 'Blockchain — 1807-Chain',      desc: 'DEX bots, scanners, and tooling' },
  '/construction':   { title: 'Construction — 1807-Chain',    desc: 'Window/door install, painting, siding, painting' },
  '/resumes':        { title: 'Resumes — 1807-Chain',         desc: 'IT/AI, Robotics, and Construction resumes' },
  '/toolbox':        { title: 'Toolbox — 1807-Chain',         desc: 'Software, hardware, and build tools' },
  '/roadmap':        { title: 'Roadmap — 1807-Chain',         desc: 'Backlog, building, shipped' },
  '/changelog':      { title: 'Changelog — 1807-Chain',       desc: 'Project updates and releases' },
  '/presskit':       { title: 'Press Kit — 1807-Chain',       desc: 'Logos, bios, and assets' },
  '/contact':        { title: 'Contact — 1807-Chain',         desc: 'Get in touch' },
  '/links':          { title: 'Links — 1807-Chain',           desc: 'Link-in-bio hub' },
  '/blog':           { title: 'Blog — 1807-Chain',            desc: 'Posts and notes' },
  '/now':            { title: 'Now — 1807-Chain',             desc: 'What I’m focused on now' },
  '/faq':            { title: 'FAQ — 1807-Chain',             desc: 'Frequently asked questions' },
  '/legal':          { title: 'Legal — 1807-Chain',           desc: 'Privacy & Terms' },
};

function routeKey(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  const last = parts[parts.length - 1].toLowerCase();
  if (last === 'index' || last === 'index.html') return '/';
  const noHtml = last.endsWith('.html') ? last.slice(0, -5) : last;
  return `/${noHtml}`;
}

function currentMeta() {
  const key = routeKey();
  return pageMeta[key] || pageMeta['/'];
}

async function boot() {
  let scrollPaperCleanup = null;

  try {
    // Allow landing/hero to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize common components
    await Promise.all([initHeader(), initFooter(), initNav()]);
    initThemeToggle();

    // Route-specific boot
    const rk = routeKey();
    if (rk === '/scroll_paper') {
      try {
        scrollPaperCleanup = initScrollPaper();
      } catch (err) {
        console.error('Failed to initialize scroll_paper.js:', err);
      }
    } else if (rk === '/') {
      // Avoid stealing focus on landing
      document.getElementById('main')?.classList.add('landing');
    } else {
      document.getElementById('main')?.focus({ preventScroll: true });
    }

    // Update meta tags
    updateMeta(currentMeta());

    // Enhance navigation: clean up route-specific controllers when leaving
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const prevRoute = routeKey(window.location.pathname);
      const ret = originalPushState.apply(this, args);
      const newRoute = routeKey(window.location.pathname);

      if (prevRoute !== newRoute) {
        if (scrollPaperCleanup && newRoute !== '/scroll_paper') {
          try { scrollPaperCleanup.cleanup(); } catch (err) { console.error('Scroll Paper cleanup failed:', err); }
          scrollPaperCleanup = null;
        }
        try {
          if (newRoute === '/scroll_paper' && !scrollPaperCleanup) {
            scrollPaperCleanup = initScrollPaper();
          }
        } catch (err) {
          console.error('Route init after pushState failed (Scroll Paper):', err);
        }
        updateMeta(currentMeta());
      }
      return ret;
    };

    // Also react on popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      const rk2 = routeKey();
      if (rk2 !== '/scroll_paper' && scrollPaperCleanup) {
        try { scrollPaperCleanup.cleanup(); } catch (err) { console.error('Scroll Paper cleanup (popstate) failed:', err); }
        scrollPaperCleanup = null;
      }
      try {
        if (rk2 === '/scroll_paper' && !scrollPaperCleanup) {
          scrollPaperCleanup = initScrollPaper();
        }
      } catch (err) {
        console.error('Route init (popstate) failed (Scroll Paper):', err);
      }
      updateMeta(currentMeta());
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      if (scrollPaperCleanup) {
        try { scrollPaperCleanup.cleanup(); } catch (err) { console.error('Scroll Paper cleanup on unload failed:', err); }
      }
    });
  } catch (err) {
    console.error('App boot failed:', err);
  }
}

(function start() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    queueMicrotask(boot);
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
