import { updateMeta } from './meta/meta.js';
import { initScrollPaper } from './pages/scroll_paper.js';
import { initFooter } from './ui/components/footer.js';
import { initHeader } from './ui/components/header.js';
import { initNav } from './ui/components/nav.js';
import { initContractorBubble } from './ui/contractor-bubbles.js';
import { initThemeToggle } from './ui/theme.js';

const pageMeta = {
  '/':               { title: 'Home â€” 1807-Chain',            desc: 'webbaby portfolio' },
  '/home':           { title: 'Home â€” 1807-Chain',            desc: 'webbaby portfolio' },
  '/scroll_paper':   { title: 'Scroll Paper â€” 1807-Chain',    desc: 'Newspaper story & showcase' },
  '/projects':       { title: 'Projects â€” 1807-Chain',        desc: 'AI, Embedded-Systems, and Blockchain projects' },
  '/ai':             { title: 'AI Projects â€” 1807-Chain',     desc: 'Models, pipelines, and production AI systems' },
  '/skincradle':     { title: 'SkinCradle Halo Tracker - 1807-Chain', desc: 'Browser-based hand and face landmark visual tracker for halos and gesture drawing' },
  '/robotics':       { title: 'Robotics â€” 1807-Chain',        desc: 'Embedded, control, and vision systems' },
  '/chains':         { title: 'Blockchain â€” 1807-Chain',      desc: 'DEX bots, scanners, and tooling' },
  '/construction':   { title: 'Construction â€” 1807-Chain',    desc: 'Window/door install, painting, siding, painting' },
  '/resume':         { title: 'Resume â€” 1807-Chain',          desc: 'Primary resume page' },
  '/resumes':        { title: 'Resumes â€” 1807-Chain',         desc: 'IT/AI, Robotics, and Construction resumes' },
  '/toolbox':        { title: 'Toolbox â€” 1807-Chain',         desc: 'Software, hardware, and build tools' },
  '/roadmap':        { title: 'Roadmap â€” 1807-Chain',         desc: 'Backlog, building, shipped' },
  '/changelog':      { title: 'Changelog â€” 1807-Chain',       desc: 'Project updates and releases' },
  '/presskit':       { title: 'Press Kit â€” 1807-Chain',       desc: 'Logos, bios, and assets' },
  '/contact':        { title: 'Contact â€” 1807-Chain',         desc: 'Get in touch' },
  '/links':          { title: 'Links â€” 1807-Chain',           desc: 'Link-in-bio hub' },
  '/blog':           { title: 'Blog â€” 1807-Chain',            desc: 'Posts and notes' },
  '/now': { title: 'Now â€” 1807-Chain', desc: 'What Iâ€™m focused on now' },
  '/elka-0':          { title: 'ELKA â€” 1807-Chain',            desc: 'ELKA Model -> Elka-0, elka is a conceptual framework for understanding and developing intelligent systems.' },
  '/faq':            { title: 'FAQ â€” 1807-Chain',             desc: 'Frequently asked questions' },
  '/legal':          { title: 'Legal â€” 1807-Chain',           desc: 'Privacy & Terms' },
  '/1807-contractor': { title: '1807 Contractor â€” The 1807',  desc: 'Doctrine, definition, principles, and operating model of an 1807 contractor.' },
  '/1807osport':     { title: '1807os Portfolio â€” The 1807',  desc: 'Operating-system portfolio experience for The 1807 with live modules, telemetry, and alternate navigation.' },
  '/1807osport/ai':  { title: '1807os AI - The 1807',          desc: 'Operating-system portfolio AI workspace.' },
  '/1807osport/data': { title: '1807os Data - The 1807',       desc: 'Operating-system portfolio data workspace.' },
  '/1807osport/robotics': { title: '1807os Robotics - The 1807', desc: 'Operating-system portfolio robotics workspace.' },
  '/1807osport/chains': { title: '1807os Chains - The 1807',   desc: 'Operating-system portfolio chains workspace.' },
  '/1807osport/about': { title: '1807os About - The 1807',     desc: 'Operating-system portfolio story workspace.' },
  '/1807osport/contractor': { title: '1807os Contractor - The 1807', desc: 'Operating-system portfolio contractor workspace.' },
  '/1807osport/resume': { title: '1807os Resume - The 1807',   desc: 'Operating-system portfolio resume workspace.' },
  '/1807osport/contact': { title: '1807os Contact - The 1807', desc: 'Operating-system portfolio contact workspace.' },
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

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    await Promise.all([initHeader(), initFooter(), initNav()]);
    initThemeToggle();

    const initContractorBubbleSafely = () => {
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

