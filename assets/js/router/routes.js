const routeDefinitions = [
  { path: '#/', href: '/home/', title: 'Home - 1807', desc: 'webbaby portfolio' },
  { path: '#/home', href: '/home/', title: 'Home - 1807', desc: 'webbaby portfolio' },
  { path: '#/projects', href: '/projects/', title: 'Projects - 1807', desc: 'AI, Robotics, and Blockchain projects' },
  { path: '#/ai', href: '/ai/', title: 'AI Projects - 1807', desc: 'Models, pipelines, and production AI systems' },
  { path: '#/robotics', href: '/robotics/', title: 'Robotics - 1807', desc: 'Embedded, control, and vision systems' },
  { path: '#/chains', href: '/chains/', title: 'Blockchain - 1807', desc: 'DEX bots, scanners, and tooling' },
  { path: '#/certific8te', href: '/certific8te/', title: 'Certific8tes - 1807', desc: 'Certificate gallery' },
  { path: '#/construction', href: '/construction/', title: 'Construction - 1807', desc: 'Window and door install, siding, painting' },
  { path: '#/resume', href: '/resume/', title: 'Resume - 1807', desc: 'Primary resume page' },
  { path: '#/resumes', href: '/resumes/', title: 'Resumes - 1807', desc: 'Role-specific resumes' },
  { path: '#/contact', href: '/contact/', title: 'Contact - 1807', desc: 'Get in touch' },
  { path: '#/links', href: '/links/', title: 'Links - 1807', desc: 'Link-in-bio hub' },
  { path: '#/tdi', href: '/tdi/', title: 'TDI - 1807', desc: 'The Djehuty Institute live feed' },
  { path: '#/elka-0', href: '/elka-0/', title: 'ELKA-0 - 1807', desc: 'Cognitive engine documentation' },
  { path: '#/1807-contractor', href: '/1807-contractor/', title: '1807 Contractor - 1807', desc: '1807 contractor doctrine' }
];

function createCleanRouteView(route) {
  return {
    async render(container) {
      if (!container) return;
      container.replaceChildren();

      const section = document.createElement('section');
      section.className = 'container';
      section.setAttribute('aria-live', 'polite');

      const heading = document.createElement('h1');
      heading.textContent = route.meta.title;

      const text = document.createElement('p');
      text.textContent = route.meta.desc;

      const link = document.createElement('a');
      link.className = 'btn';
      link.href = route.href;
      link.textContent = 'Open page';

      section.append(heading, text, link);
      container.appendChild(section);
    }
  };
}

export const routes = routeDefinitions.map((route) => ({
  path: route.path,
  href: route.href,
  meta: {
    title: route.title,
    desc: route.desc
  },
  view: async () => createCleanRouteView({
    href: route.href,
    meta: {
      title: route.title,
      desc: route.desc
    }
  })
}));
