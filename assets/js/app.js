import { updateMeta } from './meta/meta.js';
import { initScrollPaper } from './pages/scroll_paper.js';
import { initFooter } from './ui/components/footer.js';
import { initHeader } from './ui/components/header.js';
import { initNav } from './ui/components/nav.js';
import { initContractorBubble } from './ui/contractor-bubbles.js';
import { initThemeToggle } from './ui/theme.js';
import { initNeonNet } from './effects/neon-net.js';

const pageMeta = {
  '/':               { title: 'The 1807 - Product Software and Systems', desc: 'Products, selected work, and lab systems by The 1807' },
  '/home':           { title: 'The 1807 - Product Software and Systems', desc: 'Compatibility route for The 1807 homepage' },
  '/work':           { title: 'Work - The 1807', desc: 'Hydrion, Modoroco, and ClipSense product pages' },
  '/hub':            { title: 'The 1807 Hub', desc: 'Official software releases and availability' },
  '/products':       { title: 'Work moved - The 1807', desc: 'Compatibility route for The 1807 work page' },
  '/scroll_paper':   { title: 'Scroll Paper - 1807-Chain',    desc: 'Newspaper story & showcase' },
  '/projects':       { title: 'Projects - Uchenna Anozie',    desc: 'Active project hub for Heimdall, Hydrion, Luna, ELKA, ClipSense, CATER, and SkinCradle' },
  '/modoroco':       { title: 'Modoroco - The 1807', desc: 'Pre-1.0 native focus environment and timer engine by The 1807' },
  '/clipsense':      { title: 'ClipSense - The 1807', desc: 'MVP creator footage intelligence product initiative by The 1807' },
  '/about':          { title: 'About - The 1807', desc: 'The 1807 publisher identity and operating perspective' },
  '/ai':             { title: 'AI Projects - 1807-Chain',     desc: 'Models, pipelines, and production AI systems' },
  '/skincradle':     { title: 'SkinCradle Halo Tracker - 1807-Chain', desc: 'Browser-based hand and face landmark visual tracker for halos and gesture drawing' },
  '/robotics':       { title: 'Robotics - 1807-Chain',        desc: 'Embedded, control, and vision systems' },
  '/chains':         { title: 'Blockchain - 1807-Chain',      desc: 'DEX bots, scanners, and tooling' },
  '/certific8te':     { title: 'Credentials - Uchenna Anozie', desc: 'Credentials hub with certificates, skills, education, work experience, tools, and certifications' },
  '/construction':   { title: 'Construction - 1807-Chain',    desc: 'Window/door install, painting, siding, painting' },
  '/resume':         { title: 'Resume - Uchenna Anozie',      desc: 'Canonical resume page' },
  '/resumes':        { title: 'Resume Moved - Uchenna Anozie', desc: 'Merged into the canonical resume page' },
  '/toolbox':        { title: 'Toolbox - 1807-Chain',         desc: 'Software, hardware, and build tools' },
  '/roadmap':        { title: 'Roadmap - 1807-Chain',         desc: 'Backlog, building, shipped' },
  '/changelog':      { title: 'Changelog - 1807-Chain',       desc: 'Project updates and releases' },
  '/presskit':       { title: 'Press Kit - 1807-Chain',       desc: 'Logos, bios, and assets' },
  '/contact':        { title: 'Contact - Uchenna Anozie',     desc: 'Hiring, collaboration, and project review contact page' },
  '/links':          { title: 'Links - 1807-Chain',           desc: 'Link-in-bio hub' },
  '/tdi':            { title: 'TDI - The Djehuty Institute Live Feed | 1807-chain', desc: 'The Djehuty Institute live feed' },
  '/blog':           { title: 'Blog - 1807-Chain',            desc: 'Posts and notes' },
  '/now':            { title: 'Now - 1807-Chain',             desc: "What I'm focused on now" },
  '/elka-0':         { title: 'ELKA - 1807-Chain',            desc: 'ELKA Model -> Elka-0, elka is a conceptual framework for understanding and developing intelligent systems.' },
  '/faq':            { title: 'FAQ - 1807-Chain',             desc: 'Frequently asked questions' },
  '/legal':          { title: 'Legal - 1807-Chain',           desc: 'Privacy & Terms' },
  '/1807-contractor': { title: '1807 Contractor - The 1807',  desc: 'Doctrine, definition, principles, and operating model of an 1807 contractor.' },
};

function routeKey(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean).map((part) => part.toLowerCase());
  if (parts.length === 0) return '/';

  let last = parts[parts.length - 1];
  if (last === 'index' || last === 'index.html') {
    parts.pop();
    if (parts.length === 0) return '/';
    last = parts[parts.length - 1];
  }

  parts[parts.length - 1] = last.endsWith('.html') ? last.slice(0, -5) : last;
  return `/${parts.join('/')}`;
}

function currentMeta() {
  const key = routeKey();
  return pageMeta[key] || pageMeta['/'];
}

async function boot() {
  let scrollPaperCleanup = null;
  let contractorBubbleCleanup = null;
  let neonNetCleanup = null;

  try {
    await Promise.all([initHeader(), initFooter(), initNav()]);
    initThemeToggle();
    neonNetCleanup = initNeonNet();

    const shouldUseContractorBubble = () => {
      const rk = routeKey();
      return rk === '/1807-contractor';
    };

    const initContractorBubbleSafely = () => {
      if (!shouldUseContractorBubble()) {
        return {
          cleanup() {},
        };
      }

      try {
        return initContractorBubble();
      } catch (err) {
        console.error('Failed to initialize contractor bubble:', err);
        return null;
      }
    };

    const resetContractorBubble = () => {
      if (contractorBubbleCleanup?.cleanup) {
        try {
          contractorBubbleCleanup.cleanup();
        } catch (err) {
          console.error('Contractor bubble cleanup failed:', err);
        }
      }

      contractorBubbleCleanup = initContractorBubbleSafely();
    };

    contractorBubbleCleanup = initContractorBubbleSafely();

    const rk = routeKey();

    if (rk === '/scroll_paper') {
      try {
        scrollPaperCleanup = initScrollPaper();
      } catch (err) {
        console.error('Failed to initialize scroll_paper.js:', err);
      }
    } else if (rk === '/') {
      document.getElementById('main')?.classList.add('landing');
    } else {
      document.getElementById('main')?.focus({ preventScroll: true });
    }

    updateMeta(currentMeta());

    const originalPushState = history.pushState;

    history.pushState = function (...args) {
      const prevRoute = routeKey(window.location.pathname);
      const ret = originalPushState.apply(this, args);
      const newRoute = routeKey(window.location.pathname);

      if (prevRoute !== newRoute) {
        if (scrollPaperCleanup && newRoute !== '/scroll_paper') {
          try {
            scrollPaperCleanup.cleanup();
          } catch (err) {
            console.error('Scroll Paper cleanup failed:', err);
          }
          scrollPaperCleanup = null;
        }

        try {
          if (newRoute === '/scroll_paper' && !scrollPaperCleanup) {
            scrollPaperCleanup = initScrollPaper();
          }
        } catch (err) {
          console.error('Route init after pushState failed (Scroll Paper):', err);
        }

        resetContractorBubble();
        updateMeta(currentMeta());
      }

      return ret;
    };

    window.addEventListener('popstate', () => {
      const rk2 = routeKey();

      if (rk2 !== '/scroll_paper' && scrollPaperCleanup) {
        try {
          scrollPaperCleanup.cleanup();
        } catch (err) {
          console.error('Scroll Paper cleanup (popstate) failed:', err);
        }
        scrollPaperCleanup = null;
      }

      try {
        if (rk2 === '/scroll_paper' && !scrollPaperCleanup) {
          scrollPaperCleanup = initScrollPaper();
        }
      } catch (err) {
        console.error('Route init (popstate) failed (Scroll Paper):', err);
      }

      resetContractorBubble();
      updateMeta(currentMeta());
    });

    window.addEventListener('beforeunload', () => {
      if (scrollPaperCleanup) {
        try {
          scrollPaperCleanup.cleanup();
        } catch (err) {
          console.error('Scroll Paper cleanup on unload failed:', err);
        }
      }

      if (contractorBubbleCleanup) {
        try {
          contractorBubbleCleanup.cleanup();
        } catch (err) {
          console.error('Contractor bubble cleanup on unload failed:', err);
        }
      }
      if (neonNetCleanup?.cleanup) {
        try {
          neonNetCleanup.cleanup();
        } catch (err) {
          console.error('Neon net cleanup failed:', err);
        }
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

