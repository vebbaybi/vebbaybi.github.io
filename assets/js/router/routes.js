export const routes = [
  { path: '#/',             view: () => import('../views/home.js'),        meta: { title: 'Home — 1807', desc: 'webaby portfolio' } },

  // Top-level project categories
  { path: '#/projects',     view: () => import('../views/projects.js'),    meta: { title: 'Projects — 1807', desc: 'AI, Robotics, and Blockchain projects' } },

  // Sections
  { path: '#/ai',           view: () => import('../views/ai.js'),          meta: { title: 'AI Projects — 1807', desc: 'Models, pipelines, and production AI systems' } },
  { path: '#/robotics',     view: () => import('../views/robotics.js'),    meta: { title: 'Robotics — 1807', desc: 'Embedded, control, and vision systems' } },
  { path: '#/chains',       view: () => import('../views/chains.js'),      meta: { title: 'Blockchain — 1807', desc: 'DEX bots, scanners, and tooling' } },
  { path: '#/construction', view: () => import('../views/construction.js'),meta: { title: 'Construction — 1807', desc: 'Window/door install, siding, painting' } },
  { path: '#/resumes',      view: () => import('../views/resumes.js'),     meta: { title: 'Resumes — 1807', desc: 'IT/AI, Robotics, and Construction resumes' } },
  { path: '#/toolbox',      view: () => import('../views/toolbox.js'),     meta: { title: 'Toolbox — 1807', desc: 'Software, hardware, and build tools' } },
  { path: '#/roadmap',      view: () => import('../views/roadmap.js'),     meta: { title: 'Roadmap — 1807', desc: 'Backlog, building, shipped' } },
  { path: '#/changelog',    view: () => import('../views/changelog.js'),   meta: { title: 'Changelog — 1807', desc: 'Project updates and releases' } },
  { path: '#/presskit',     view: () => import('../views/presskit.js'),    meta: { title: 'Press Kit — 1807', desc: 'Logos, bios, and assets' } },
  { path: '#/contact',      view: () => import('../views/contact.js'),     meta: { title: 'Contact — 1807', desc: 'Get in touch' } },
  { path: '#/links',        view: () => import('../views/links.js'),       meta: { title: 'Links — 1807', desc: 'Link-in-bio hub' } },
  { path: '#/blog',         view: () => import('../views/blog.js'),        meta: { title: 'Blog — 1807', desc: 'Posts and notes' } },
  { path: '#/now',          view: () => import('../views/now.js'),         meta: { title: 'Now — 1807', desc: 'What I’m focused on now' } },
  { path: '#/faq',          view: () => import('../views/faq.js'),         meta: { title: 'FAQ — 1807', desc: 'Frequently asked questions' } },
  { path: '#/legal',        view: () => import('../views/legal.js'),       meta: { title: 'Legal — 1807', desc: 'Privacy & Terms' } },
];
