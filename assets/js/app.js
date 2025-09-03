// assets/js/app.js
// Global bootstrap for MPA: injects header/footer, updates meta, inits globals.

import { updateMeta } from './meta/meta.js';
import { initFooter } from './ui/components/footer.js';
import { initHeader } from './ui/components/header.js';
// Optional: import { initStore } from './state/store.js'; // For theme persistence, etc.

const pageMeta = {
  '/': { title: 'Home — 1807', desc: 'webaby portfolio' },
  '/index.html': { title: 'Home — 1807', desc: 'webaby portfolio' }, // Alias for root
  '/projects.html': { title: 'Projects — 1807', desc: 'AI, Robotics, and Blockchain projects' },
  '/ai.html': { title: 'AI Projects — 1807', desc: 'Models, pipelines, and production AI systems' },
  '/robotics.html': { title: 'Robotics — 1807', desc: 'Embedded, control, and vision systems' },
  '/chains.html': { title: 'Blockchain — 1807', desc: 'DEX bots, scanners, and tooling' },
  '/construction.html': { title: 'Construction — 1807', desc: 'Window/door install, siding, painting' },
  '/resumes.html': { title: 'Resumes — 1807', desc: 'IT/AI, Robotics, and Construction resumes' },
  '/toolbox.html': { title: 'Toolbox — 1807', desc: 'Software, hardware, and build tools' },
  '/roadmap.html': { title: 'Roadmap — 1807', desc: 'Backlog, building, shipped' },
  '/changelog.html': { title: 'Changelog — 1807', desc: 'Project updates and releases' },
  '/presskit.html': { title: 'Press Kit — 1807', desc: 'Logos, bios, and assets' },
  '/contact.html': { title: 'Contact — 1807', desc: 'Get in touch' },
  '/links.html': { title: 'Links — 1807', desc: 'Link-in-bio hub' },
  '/blog.html': { title: 'Blog — 1807', desc: 'Posts and notes' },
  '/now.html': { title: 'Now — 1807', desc: 'What I’m focused on now' },
  '/faq.html': { title: 'FAQ — 1807', desc: 'Frequently asked questions' },
  '/legal.html': { title: 'Legal — 1807', desc: 'Privacy & Terms' },
  // Add 404 or defaults if needed
};

async function boot() {
  // Inject header and footer
  await Promise.all([initHeader(), initFooter()]);

  // Update meta based on current path
  const path = window.location.pathname;
  const meta = pageMeta[path] || pageMeta['/']; // Default to home
  updateMeta(meta);

  // Optional global inits
  // initStore(); // e.g., load theme from localStorage

  // Focus main for accessibility
  const main = document.getElementById('main');
  if (main) {
    main.focus({ preventScroll: true });
  }
}

document.addEventListener('DOMContentLoaded', boot);