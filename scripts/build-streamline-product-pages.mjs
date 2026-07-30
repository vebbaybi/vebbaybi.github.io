import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');

const release = JSON.parse(await readFile(path.join(root, 'assets/data/hydrion/releases.json'), 'utf8'));

const products = [
  {
    key: 'hydrion',
    name: 'Hydrion',
    route: '/hydrion/',
    logo: '/assets/images/hydrion.png',
    accent: 'Aqua blue',
    status: 'Public RC / Download available',
    audience: 'People building a steadier hydration routine',
    purpose: 'A calm hydration companion for measured logging, progress, weather-aware guidance, and real challenge progress.',
    action: 'Download Android RC',
    actionHref: release.downloadUrl,
  },
  {
    key: 'modoroco',
    name: 'Modoroco',
    route: '/modoroco/',
    logo: '/assets/images/products/modoroco/modicon.png',
    accent: 'Modoroco red',
    status: 'Pre-1.0 / Coming soon',
    audience: 'Builders, focus workers, and apps that need reliable timer logic',
    purpose: 'A native focus environment backed by a product-neutral timer engine, API, worker, and integration foundation.',
    action: 'Coming soon',
    actionHref: null,
  },
  {
    key: 'clipsense',
    name: 'ClipSense',
    route: '/clipsense/',
    logo: '/assets/images/products/clipsense/clipsense.png',
    accent: 'Creator blue',
    status: 'MVP / Coming soon',
    audience: 'Creators and editors organizing large sets of raw footage',
    purpose: 'A creator pre-editor that turns ZIP batches of footage into organized clips, transcripts, tags, and basic storyline order.',
    action: 'Coming soon',
    actionHref: null,
  },
];

const selectedWork = [
  ['Heimdall', 'AI-assisted content review workflow', 'Active development', 'https://github.com/vebbaybi/Heimdall'],
  ['ELKA', 'Cognitive engine and runtime documentation', 'Technical experiment', '/elka-0/'],
  ['SkinCradle', 'Browser visual gesture tracker', 'Standalone prototype', '/skincradle/'],
];

function e(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function meta({ title, description, route, image = '/assets/the1807.png', theme = '#101923', structured = null }) {
  const canonical = `https://the1807.xyz${route}`;
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="${theme}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The 1807">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://the1807.xyz${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="https://the1807.xyz${image}">
  <link rel="icon" href="${route.startsWith('/hydrion/') ? '/assets/images/hydrion.png' : '/favicon.ico'}" sizes="any">
  <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/main.css">
  <link rel="stylesheet" href="/assets/css/streamline.css">
  <link rel="stylesheet" href="/assets/css/products/product-shell.css">
  ${structured ? `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>` : '<!-- No structured data: product is not publicly downloadable yet. -->'}
`;
}

function shell({ title, description, route, pageClass = '', image, theme, body, structured }) {
  return `<!doctype html>
<html lang="en" data-app="1807" data-page="${e(pageClass || 'streamline')}">
<head>${meta({ title, description, route, image, theme, structured })}</head>
<body class="theme-dark streamline-site ${e(pageClass)}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header-placeholder></header-placeholder>
  <nav-placeholder></nav-placeholder>
  <main id="main" tabindex="-1">
${body}
  </main>
  <footer-placeholder></footer-placeholder>
  <script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

function productCards() {
  return products.map((product) => `
        <article class="product-card product-card--${product.key}">
          <img src="${product.logo}" width="96" height="96" alt="${product.name} logo">
          <div>
            <p class="eyebrow">${product.status}</p>
            <h3>${product.name}</h3>
            <p>${product.purpose}</p>
          </div>
          <a class="text-link" href="${product.route}">Open ${product.name}</a>
        </article>`).join('');
}

function homePage() {
  const body = `
    <section class="stream-hero" aria-labelledby="home-title">
      <div class="stream-wrap stream-hero__grid">
        <div class="stream-hero__copy">
          <p class="eyebrow">The 1807</p>
          <h1 id="home-title">Product software, AI workflow, and practical systems with proof.</h1>
          <p class="lead">The 1807 builds focused tools that help people organize routines, creator footage, product workflows, and experimental computing ideas without pretending unfinished work is already complete.</p>
          <div class="action-row">
            <a class="button" href="/products/">Explore products</a>
            <a class="button button--secondary" href="/projects/">View selected work</a>
          </div>
        </div>
        <aside class="publisher-panel" aria-label="Publisher summary">
          <img src="/assets/the1807.png" width="1005" height="149" alt="The 1807">
          <dl>
            <div><dt>Products</dt><dd>Hydrion, Modoroco, ClipSense</dd></div>
            <div><dt>Work</dt><dd>AI, data, embedded, product systems</dd></div>
            <div><dt>Catalogue</dt><dd>Three flagship products</dd></div>
          </dl>
        </aside>
      </div>
    </section>
    <section class="stream-section" aria-labelledby="featured-products">
      <div class="stream-wrap">
        <div class="section-head">
          <p class="eyebrow">Products by The 1807</p>
          <h2 id="featured-products">Three product lanes, each with an honest status.</h2>
        </div>
        <div class="product-card-grid">
${productCards()}
        </div>
      </div>
    </section>
    <section class="stream-section stream-section--soft" aria-labelledby="selected-work">
      <div class="stream-wrap">
        <div class="section-head">
          <p class="eyebrow">Selected work</p>
          <h2 id="selected-work">Systems, experiments, and technical proof.</h2>
        </div>
        <div class="work-grid">
${selectedWork.map(([name, purpose, status, href]) => `
          <article class="work-card">
            <p class="eyebrow">${status}</p>
            <h3>${name}</h3>
            <p>${purpose}</p>
            <a class="text-link" href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>Open ${name}</a>
          </article>`).join('')}
        </div>
      </div>
    </section>
    <section class="stream-section" aria-labelledby="about-short">
      <div class="stream-wrap split-band">
        <div>
          <p class="eyebrow">Operating perspective</p>
          <h2 id="about-short">The 1807 keeps products separate from experiments.</h2>
          <p>Downloadable releases, pre-release products, MVP systems, and lab interfaces are labeled differently so visitors know what they can use today and what is still under validation.</p>
        </div>
        <div class="action-row">
          <a class="button button--secondary" href="/about/">About The 1807</a>
          <a class="button" href="/contact/">Contact</a>
        </div>
      </div>
    </section>`;

  return shell({
    title: 'The 1807 | Product Software, AI Workflow, and Practical Systems',
    description: 'The 1807 builds Hydrion, Modoroco, ClipSense, AI workflow systems, and practical software experiments with clear product status.',
    route: '/',
    pageClass: 'home-page',
    body,
    structured: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'The 1807',
      url: 'https://the1807.xyz/',
      sameAs: ['https://github.com/vebbaybi'],
    },
  });
}

function productsPage() {
  const rows = products.map((product) => `
        <article class="product-row product-row--${product.key}">
          <img src="${product.logo}" width="96" height="96" alt="${product.name} logo">
          <div>
            <p class="eyebrow">${product.status}</p>
            <h2>${product.name}</h2>
            <p>${product.purpose}</p>
            <dl class="fact-list">
              <div><dt>Audience</dt><dd>${product.audience}</dd></div>
              <div><dt>Availability</dt><dd>${product.status}</dd></div>
            </dl>
          </div>
          <a class="button ${product.actionHref ? '' : 'button--secondary'}" href="${product.route}">Open page</a>
        </article>`).join('');

  return shell({
    title: 'Products | The 1807',
    description: 'Hydrion, Modoroco, and ClipSense product pages by The 1807, with clear release and validation status.',
    route: '/products/',
    pageClass: 'products-page',
    body: `
    <section class="stream-hero stream-hero--compact" aria-labelledby="products-title">
      <div class="stream-wrap">
        <p class="eyebrow">Products</p>
        <h1 id="products-title">Products by The 1807.</h1>
        <p class="lead">A product is not the same thing as a project. Hydrion is available as a public Android RC. Modoroco and ClipSense are still under validation and use Coming Soon actions.</p>
      </div>
    </section>
    <section class="stream-section" aria-label="Product list">
      <div class="stream-wrap product-row-list">
${rows}
      </div>
    </section>`,
  });
}

function aboutPage() {
  return shell({
    title: 'About | The 1807',
    description: 'The 1807 is the publisher identity for practical product software, AI workflow systems, and lab experiments by Uchenna Anozie.',
    route: '/about/',
    pageClass: 'about-page',
    body: `
    <section class="stream-hero stream-hero--compact" aria-labelledby="about-title">
      <div class="stream-wrap">
        <p class="eyebrow">About The 1807</p>
        <h1 id="about-title">A publisher identity for product-minded systems work.</h1>
        <p class="lead">The 1807 is the independent software studio behind Hydrion, Modoroco, and ClipSense. It keeps public releases, test builds, and active development clearly separated.</p>
      </div>
    </section>
    <section class="stream-section">
      <div class="stream-wrap split-band">
        <div>
          <h2>What it builds</h2>
          <p>Product software, creator workflow tools, native focus systems, hydration routines, AI-assisted review flows, and technical prototypes that can be validated locally before they are presented as public products.</p>
        </div>
        <div>
          <h2>How it presents work</h2>
          <p>Every product page states ownership, availability, and limitations so visitors can understand the work without decoding an experimental interface.</p>
        </div>
      </div>
    </section>`,
  });
}

function hydrionPage() {
  const screenshots = [
    ['female_home.png', 'Hydrion home screen with daily progress and quick logging'],
    ['female_progress.png', 'Hydrion progress screen showing hydration metrics'],
    ['female_challenges_main.png', 'Hydrion challenges screen'],
    ['bottle_bingo.png', 'Bottle Bingo challenge screen'],
    ['pomodoro_sip.png', 'Pomodoro Sip challenge screen'],
    ['temperature_roulette.png', 'Temperature Roulette challenge screen'],
  ];

  return shell({
    title: 'Hydrion | Smart Hydration Tracking by The 1807',
    description: 'Download Hydrion v1.1.0 RC1 for Android and explore hydration logging, progress, weather-aware guidance, and interactive challenges.',
    route: '/hydrion/',
    image: '/assets/images/hydrion.png',
    theme: '#0a8fd8',
    pageClass: 'product-page product-page--hydrion',
    structured: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Hydrion',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Android',
      softwareVersion: release.displayVersion,
      downloadUrl: release.downloadUrl,
      url: 'https://the1807.xyz/hydrion/',
      sameAs: ['https://www.instagram.com/hydrionsharks/'],
      author: { '@type': 'Organization', name: 'The 1807', url: 'https://the1807.xyz/' },
    },
    body: `
    <section class="product-hero product-hero--hydrion" aria-labelledby="hydrion-title">
      <div class="product-wrap product-hero__grid">
        <div>
          <p class="eyebrow">Hydrion by The 1807</p>
          <h1 id="hydrion-title">Hydration tracking that feels calm, honest, and useful.</h1>
          <p class="lead">Log measured drinks, review progress, get optional weather-aware goal guidance, and advance real challenges without fake hydration credit.</p>
          <p class="ownership">Hydrion is a product of The 1807. A product by The 1807.</p>
          <div class="status-line"><span>Public tester build</span><strong>${release.displayVersion} for Android</strong></div>
          <div class="action-row">
            <a class="button" href="${release.downloadUrl}">Download for Android</a>
            <a class="button button--secondary" href="/hydrion/docs/">Read docs</a>
          </div>
        </div>
        <figure class="phone-stage">
          <img src="/assets/images/products/hydrion/female_home.png" width="390" height="844" alt="Hydrion home screen with daily progress and quick logging" fetchpriority="high">
          <figcaption>Genuine Hydrion app render. Interface details may differ from the RC tester APK.</figcaption>
        </figure>
      </div>
    </section>
    <section class="product-section product-section--light" id="features" aria-labelledby="hydrion-features">
      <div class="product-wrap feature-story">
        <div>
          <p class="eyebrow">Daily routine</p>
          <h2 id="hydrion-features">The same log powers progress, history, and challenges.</h2>
          <p>Hydrion stores hydration logs locally and keeps measured water separate from check-ins. Eligible logs can update active challenges while simple activity checks stay honest.</p>
        </div>
        <div class="capability-list">
          <span>Measured logging</span>
          <span>Personalized goals</span>
          <span>Progress views</span>
          <span>Weather-aware guidance</span>
          <span>Bottle Bingo</span>
          <span>Pomodoro Sip</span>
          <span>Day and Night themes</span>
        </div>
      </div>
    </section>
    <section class="product-section" aria-labelledby="hydrion-gallery">
      <div class="product-wrap">
        <div class="section-head">
          <p class="eyebrow">Real app screens</p>
          <h2 id="hydrion-gallery">Challenges and progress without placeholder tiles.</h2>
        </div>
        <div class="screenshot-gallery">
${screenshots.map(([file, alt]) => `
          <figure>
            <img src="/assets/images/products/hydrion/${file}" width="390" height="844" loading="lazy" alt="${alt}">
          </figure>`).join('')}
        </div>
      </div>
    </section>
    <section class="product-section product-section--light" aria-labelledby="hydrion-status">
      <div class="product-wrap split-band">
        <div>
          <p class="eyebrow">Release status</p>
          <h2 id="hydrion-status">Current public channel: ${release.displayVersion}.</h2>
          <p>The APK is distributed from the official GitHub release. Android may ask you to allow installation from your browser or file manager.</p>
        </div>
        <div class="fact-card">
          <p><strong>SHA-256:</strong> ${release.sha256}</p>
          <p><strong>Repository:</strong> The-1807/hydrion</p>
          <a class="text-link" href="/hydrion/releases/v1.1.0-rc.1/">View release notes</a>
        </div>
      </div>
    </section>
    <section class="product-section" id="community" aria-labelledby="hydrion-community">
      <div class="product-wrap split-band">
        <div>
          <p class="eyebrow">Hydrion community</p>
          <h2 id="hydrion-community">Follow the sharks between releases.</h2>
          <p>Product visuals, hydration prompts, challenge ideas, and release updates live on the official Hydrion account.</p>
        </div>
        <a class="button button--secondary" href="https://www.instagram.com/hydrionsharks/" target="_blank" rel="noopener noreferrer" aria-label="Follow Hydrion on Instagram">Follow @hydrionsharks</a>
      </div>
    </section>`,
  });
}

function modorocoPage() {
  return shell({
    title: 'Modoroco | Focus Timer Engine by The 1807',
    description: 'Modoroco is a pre-1.0 native focus environment and product-neutral timer engine by The 1807.',
    route: '/modoroco/',
    image: '/assets/images/products/modoroco/modicon.png',
    theme: '#ef3434',
    pageClass: 'product-page product-page--modoroco',
    body: `
    <section class="product-hero product-hero--modoroco" aria-labelledby="modoroco-title">
      <div class="product-wrap product-hero__grid">
        <div>
          <p class="eyebrow">Modoroco by The 1807</p>
          <h1 id="modoroco-title">A native focus environment with a reliable timer core underneath.</h1>
          <p class="lead">Modoroco pairs a custom-rendered focus dial with immutable timer families, routines, preferences, API endpoints, scheduling worker, and integration-ready architecture.</p>
          <div class="status-line"><span>Pre-1.0 validation</span><strong>Coming soon</strong></div>
          <div class="action-row">
            <button class="button" type="button" aria-disabled="true" data-coming-soon="Modoroco is in pre-1.0 validation and does not have an approved public download yet.">Coming soon</button>
            <a class="button button--secondary" href="#architecture">View architecture</a>
          </div>
        </div>
        <figure class="logo-stage logo-stage--modoroco">
          <img src="/assets/images/products/modoroco/modicon.png" width="512" height="512" alt="Modoroco logo">
          <figcaption>Owner-supplied Modoroco product icon.</figcaption>
        </figure>
      </div>
    </section>
    <section class="product-section product-section--graphite" aria-labelledby="modoroco-focus">
      <div class="product-wrap timer-composition">
        <div class="timer-ring" aria-hidden="true"><span>25</span><small>focus</small></div>
        <div>
          <p class="eyebrow">Focus experience</p>
          <h2 id="modoroco-focus">Focus, short-break, and long-break modes with timestamp-based countdowns.</h2>
          <p>The native PySide6 app supports start, pause, resume, reset, complete, keyboard controls, persisted preferences, curated routines, and high-DPI Qt rendering.</p>
        </div>
      </div>
    </section>
    <section class="product-section" id="architecture" aria-labelledby="modoroco-architecture">
      <div class="product-wrap">
        <div class="section-head">
          <p class="eyebrow">Engine and API</p>
          <h2 id="modoroco-architecture">A product-neutral timer foundation.</h2>
        </div>
        <div class="architecture-steps">
          <span>Native dial</span>
          <span>Timer domain</span>
          <span>FastAPI/OpenAPI</span>
          <span>Scheduling worker</span>
          <span>PostgreSQL outbox</span>
        </div>
        <p class="muted">No hosted service, SDK release, or public desktop installer is presented as available. Those remain planned or deferred until validation is complete.</p>
      </div>
    </section>`,
  });
}

function clipsensePage() {
  return shell({
    title: 'ClipSense | Creator Footage Intelligence by The 1807',
    description: 'ClipSense is an MVP creator pre-editor by The 1807 for organizing ZIP batches of footage into clips, transcripts, tags, and basic storylines.',
    route: '/clipsense/',
    image: '/assets/images/products/clipsense/clipsense.png',
    theme: '#165dff',
    pageClass: 'product-page product-page--clipsense',
    body: `
    <section class="product-hero product-hero--clipsense" aria-labelledby="clipsense-title">
      <div class="product-wrap product-hero__grid">
        <div>
          <p class="eyebrow">ClipSense by The 1807</p>
          <h1 id="clipsense-title">Turn raw creator footage into organized story sequences.</h1>
          <p class="lead">ClipSense is a creator pre-editor for clip dumps, reaction footage, gameplay captures, and long-form sessions. The current MVP is ready for local verification, not public release.</p>
          <div class="status-line"><span>MVP validation</span><strong>Coming soon</strong></div>
          <div class="action-row">
            <button class="button" type="button" aria-disabled="true" data-coming-soon="ClipSense is in MVP validation. There is no approved public product download yet.">Coming soon</button>
            <a class="button button--secondary" href="#workflow">Explore workflow</a>
          </div>
        </div>
        <figure class="logo-stage logo-stage--clipsense">
          <img src="/assets/images/products/clipsense/clipsense.png" width="1254" height="1254" alt="ClipSense logo">
        </figure>
      </div>
    </section>
    <section class="product-section product-section--media" id="workflow" aria-labelledby="clipsense-workflow">
      <div class="product-wrap">
        <div class="section-head">
          <p class="eyebrow">Current MVP path</p>
          <h2 id="clipsense-workflow">ZIP upload to clips, transcript, analysis, and basic storyline visibility.</h2>
          <p>Future link and direct-video intake are intended product paths, but the current implemented web/API/worker loop starts with ZIP upload only.</p>
        </div>
        <div class="workflow-line">
          <span>ZIP intake</span>
          <span>Extract videos</span>
          <span>Transcribe</span>
          <span>Classify</span>
          <span>Group</span>
          <span>Export batch</span>
        </div>
      </div>
    </section>
    <section class="product-section" aria-labelledby="clipsense-status">
      <div class="product-wrap split-band">
        <div>
          <p class="eyebrow">Honest status</p>
          <h2 id="clipsense-status">Basic clustering exists. Advanced director-mode narrative intelligence is not claimed as complete.</h2>
          <p>The stabilized MVP uses Next.js, Go, Python worker services, Postgres, Redis, and Qdrant through Docker Compose. Runtime verification remains local until the product is approved for public release.</p>
        </div>
        <div class="fact-card">
          <p><strong>Public download:</strong> Not available</p>
          <p><strong>Current intake:</strong> ZIP upload MVP</p>
          <p><strong>Repository:</strong> vebbaybi/ClipSense</p>
        </div>
      </div>
    </section>`,
  });
}

function projectsPage() {
  return shell({
    title: 'Work | The 1807',
    description: 'Products, selected systems, AI, data, embedded, and lab work by The 1807.',
    route: '/projects/',
    pageClass: 'projects-page',
    body: `
    <section class="stream-hero stream-hero--compact" aria-labelledby="work-title">
      <div class="stream-wrap">
        <p class="eyebrow">Work</p>
        <h1 id="work-title">Products first, projects clearly labeled.</h1>
        <p class="lead">This page separates public products, pre-release products, technical systems, and lab experiments so nothing has to pretend to be more finished than it is.</p>
      </div>
    </section>
    <section class="stream-section" aria-labelledby="work-products">
      <div class="stream-wrap">
        <div class="section-head"><p class="eyebrow">Products</p><h2 id="work-products">Dedicated product pages</h2></div>
        <div class="product-card-grid">${productCards()}</div>
      </div>
    </section>
    <section class="stream-section stream-section--soft" aria-labelledby="systems">
      <div class="stream-wrap">
        <div class="section-head"><p class="eyebrow">Selected systems</p><h2 id="systems">Broader technical work</h2></div>
        <div class="work-grid">
${selectedWork.map(([name, purpose, status, href]) => `
          <article class="work-card"><p class="eyebrow">${status}</p><h3>${name}</h3><p>${purpose}</p><a class="text-link" href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>Open ${name}</a></article>`).join('')}
        </div>
      </div>
    </section>`,
  });
}

async function write(relative, html) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
}

async function copyAsset(from, to) {
  const target = path.join(root, to);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, from), target);
}

console.log('Canonical product artwork is maintained in assets/images/products. Portfolio and product pages are reviewed static sources.');
