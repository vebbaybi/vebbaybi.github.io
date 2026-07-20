import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const standalone = path.basename(repoRoot).toLowerCase() === 'hydrion_page';
const outputRoot = standalone ? repoRoot : path.join(repoRoot, 'hydrion');
const releasePath = standalone
  ? path.join(repoRoot, 'assets', 'data', 'releases.json')
  : path.join(repoRoot, 'assets', 'data', 'hydrion', 'releases.json');
const release = JSON.parse(await readFile(releasePath, 'utf8'));
const scriptUrl = standalone ? '/assets/js/hydrion.js' : '/assets/js/pages/hydrion.js';

const links = {
  download: '/hydrion/download/',
  docs: '/hydrion/docs/',
  releases: '/hydrion/releases/',
  rc1: '/hydrion/releases/v1.1.0-rc.1/',
  privacy: '/hydrion/privacy/',
  install: '/hydrion/docs/install/',
  gettingStarted: '/hydrion/docs/getting-started/',
  hydration: '/hydrion/docs/hydration/',
  challenges: '/hydrion/docs/challenges/',
  troubleshooting: '/hydrion/docs/troubleshooting/'
};

if (standalone) {
  for (const [key, value] of Object.entries(links)) {
    links[key] = value.replace(/^\/hydrion/, '') || '/';
  }
}

function e(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function active(value, current) {
  return value === current ? ' aria-current="page"' : '';
}

function head({ title, description, route, image = '/assets/images/hydrion.png', structured = null }) {
  const canonicalRoute = standalone
    ? (route === '/' ? '/hydrion/' : `/hydrion${route}`)
    : route;
  const canonical = `https://the1807.xyz${canonicalRoute}`;
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${e(title)}</title>
    <meta name="description" content="${e(description)}">
    <link rel="canonical" href="${e(canonical)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="theme-color" content="#06111f">
    <meta name="color-scheme" content="dark">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="The 1807">
    <meta property="og:title" content="${e(title)}">
    <meta property="og:description" content="${e(description)}">
    <meta property="og:url" content="${e(canonical)}">
    <meta property="og:image" content="https://the1807.xyz${image}">
    <meta property="og:image:alt" content="Hydrion product identity by The 1807">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${e(title)}">
    <meta name="twitter:description" content="${e(description)}">
    <meta name="twitter:image" content="https://the1807.xyz${image}">
    <link rel="icon" href="/assets/images/hydrion.png">
    <link rel="stylesheet" href="/assets/css/hydrion.css">
    ${structured ? `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>` : '<!-- Structured data is provided on product and release pages. -->'}
  `;
}

function header(current) {
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="publisher-logo" href="https://the1807.xyz/" aria-label="The 1807 home">
        <img src="/assets/the1807.png" width="1005" height="149" alt="The 1807">
      </a>
      <a class="product-lockup" href="${links.download.replace('/download/', '/')}">
        <img src="/assets/images/hydrion.png" width="1254" height="1254" alt="">
        <span><strong>Hydrion</strong><small>A product by The 1807</small></span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-menu-toggle>Menu</button>
      <nav class="primary-nav" id="primary-nav" aria-label="Hydrion" data-primary-nav data-open="false">
        <a href="${links.download.replace('/download/', '/')}"${active('overview', current)}>Overview</a>
        <a href="${links.download.replace('/download/', '/')}#features">Features</a>
        <a href="${links.docs}"${active('docs', current)}>Documentation</a>
        <a href="${links.releases}"${active('releases', current)}>Releases</a>
        <a href="${links.download.replace('/download/', '/')}#community">Community</a>
        <a class="button button--small nav-download" href="${links.download}"${active('download', current)}>Download</a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="https://the1807.xyz/" aria-label="The 1807 home">
          <img src="/assets/the1807.png" width="1005" height="149" alt="The 1807">
        </a>
        <img class="hydrion-footer-mark" src="/assets/images/hydrion.png" width="1254" height="1254" alt="Hydrion">
        <p><strong>Hydrion is a product of The 1807.</strong></p>
      </div>
      <div class="footer-links">
        <section aria-labelledby="footer-product"><h2 id="footer-product">Product</h2><ul>
          <li><a href="${links.download}">Download Android APK</a></li>
          <li><a href="${links.docs}">Documentation</a></li>
          <li><a href="${links.releases}">Release notes</a></li>
          <li><a href="${links.privacy}">Privacy and data</a></li>
        </ul></section>
        <section aria-labelledby="footer-community"><h2 id="footer-community">Community</h2><ul>
          <li><a href="${release.discordUrl}" target="_blank" rel="noopener noreferrer">Discord <span class="sr-only">(external)</span></a></li>
          <li><a href="${release.repositoryUrl}" target="_blank" rel="noopener noreferrer">GitHub <span class="sr-only">(external)</span></a></li>
          <li><a href="${release.issuesUrl}" target="_blank" rel="noopener noreferrer">Report an issue <span class="sr-only">(external)</span></a></li>
        </ul></section>
        <section aria-labelledby="footer-owner"><h2 id="footer-owner">Publisher</h2><ul>
          <li><a href="https://the1807.xyz/">The 1807 home</a></li>
          <li><a href="https://the1807.xyz/projects/">The 1807 projects</a></li>
          <li><a href="${links.download.replace('/download/', '/')}#about">About The 1807</a></li>
        </ul></section>
      </div>
      <p class="copyright">&copy; <span data-year>2026</span> The 1807. Hydrion is a hydration-support product and is not a substitute for individualized medical advice.</p>
    </div>
  </footer>
  <script type="module" src="${scriptUrl}"></script>`;
}

function shell({ title, description, route, current, body, structured }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>${head({ title, description, route, structured })}</head>
<body>
${header(current)}
<main id="main" tabindex="-1">${body}</main>
${footer()}
</body>
</html>
`;
}

function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map(([label, href]) =>
    href ? `<a href="${href}">${e(label)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${e(label)}</span>`
  ).join('')}</nav>`;
}

function subHero(kicker, title, copy, crumbs) {
  return `<header class="subpage-hero">
    ${breadcrumbs(crumbs)}
    <p class="eyebrow">${e(kicker)}</p>
    <h1>${e(title)}</h1>
    <p>${copy}</p>
  </header>`;
}

const docsPages = [
  ['Documentation', links.docs],
  ['Install on Android', links.install],
  ['Getting started', links.gettingStarted],
  ['Logging hydration', links.hydration],
  ['Goals and challenges', links.challenges],
  ['Troubleshooting', links.troubleshooting]
];

function docsNav(currentHref) {
  return `<nav class="docs-nav" aria-label="Documentation" data-docs-nav data-open="false">
    <button class="docs-nav-toggle" type="button" aria-expanded="false" aria-controls="docs-links" data-docs-toggle>Documentation menu</button>
    <h2>Documentation</h2>
    <ul id="docs-links">${docsPages.map(([label, href]) => `<li><a href="${href}"${href === currentHref ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>
  </nav>`;
}

function docPage({ title, description, href, body, previous, next }) {
  return shell({
    title: `${title} | Hydrion Documentation`,
    description,
    route: standalone ? href : href,
    current: 'docs',
    body: `
      ${subHero('Hydrion documentation', title, description, [['Hydrion', links.download.replace('/download/', '/')], ['Documentation', links.docs], [title, null]])}
      <div class="docs-shell">
        ${docsNav(href)}
        <article class="doc-content">${body}
          <nav class="doc-pager" aria-label="Documentation pages">
            ${previous ? `<a href="${previous[1]}">&larr; ${previous[0]}</a>` : '<span></span>'}
            ${next ? `<a href="${next[1]}">${next[0]} &rarr;</a>` : '<span></span>'}
          </nav>
        </article>
      </div>`
  });
}

const appStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Hydrion',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Android',
  softwareVersion: release.displayVersion,
  downloadUrl: release.downloadUrl,
  url: 'https://the1807.xyz/hydrion/',
  author: { '@type': 'Organization', name: 'The 1807', url: 'https://the1807.xyz/' },
  releaseNotes: release.releaseUrl
};

const landing = shell({
  title: 'Hydrion | Smart Hydration Tracking by The 1807',
  description: 'Download Hydrion for Android, explore hydration challenges, read documentation, review release notes, and help The 1807 test the latest release candidate.',
  route: standalone ? '/' : '/hydrion/',
  current: 'overview',
  structured: appStructuredData,
  body: `
  <section class="section hero" aria-labelledby="hero-title">
    <div>
      <p class="eyebrow">Hydrion by The 1807</p>
      <h1 id="hero-title">Hydration that works with your day.</h1>
      <p class="hero-copy">Track what you drink, understand your progress, and build better routines with personalized goals, weather-aware guidance, and interactive challenges.</p>
      <p class="ownership">Hydrion by The 1807.</p>
      <div class="release-line"><span class="badge badge--testing">Public tester build</span><span>Current release: <strong>${release.displayVersion}</strong> for Android</span></div>
      <div class="actions">
        <a class="button" href="${release.downloadUrl}" aria-label="Download Hydrion v1.1.0 RC1 Android APK">Download for Android <span aria-hidden="true">&darr;</span></a>
        <a class="button button--secondary" href="${links.docs}">View documentation</a>
      </div>
      <p class="muted">Release candidate distributed outside Google Play. Feedback is encouraged.</p>
    </div>
    <figure class="hero-visual">
      <img class="hero-phone" src="/assets/images/hydrion/screenshots/home-day.png" width="390" height="844" alt="Hydrion Home screen showing daily hydration progress and quick logging" fetchpriority="high">
      <figcaption class="hero-note">Genuine Hydrion development render. Interface details may differ from the RC1 tester APK.</figcaption>
    </figure>
  </section>

  <section class="section" aria-label="Release facts">
    <div class="trust-strip">
      <div class="trust-item"><strong>Android test build</strong><span>${release.displayVersion}</span></div>
      <div class="trust-item"><strong>Direct APK</strong><span>Official GitHub release asset</span></div>
      <div class="trust-item"><strong>Public source</strong><span>The-1807/hydrion</span></div>
      <div class="trust-item"><strong>Community testing</strong><span>Discord and GitHub issues</span></div>
      <div class="trust-item"><strong>Published by</strong><span>The 1807</span></div>
    </div>
  </section>

  <section class="section" id="features" aria-labelledby="features-title">
    <div class="section-head"><p class="eyebrow">Product capabilities</p><h2 id="features-title">Useful hydration support, without invented progress.</h2><p>Hydrion keeps measured hydration separate from check-ins while allowing eligible logs to update real challenge progress.</p></div>
    <div class="grid grid--4">
      <article class="card"><span class="card-icon" aria-hidden="true">01</span><h3>Personalized goals</h3><p>Set a daily target and review optional weather-informed suggestions before they change your goal.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">02</span><h3>Fast water logging</h3><p>Record measured drinks in millilitres or fluid ounces using quick amounts or saved containers.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">03</span><h3>Progress and history</h3><p>Review one canonical hydration total across Home, History, Progress, Analytics, and Challenges.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">04</span><h3>Weather-aware assistance</h3><p>With permission, local conditions can inform a bounded suggestion. Manual goals remain available as a fallback.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">05</span><h3>Bottle Bingo</h3><p>Build lines on a 5 × 5 board with a free center tile, automatic evidence, check-ins, and measured hydration tasks.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">06</span><h3>Pomodoro Sip</h3><p>Use focus sessions, mark a simple sip without fabricating volume, or log a real measured drink.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">07</span><h3>Challenge variety</h3><p>Temperature Roulette, Infusion Week, and Eat Your Water connect activities to honest hydration tracking.</p></article>
      <article class="card"><span class="card-icon" aria-hidden="true">08</span><h3>Adaptive interface</h3><p>Day, Night, System, and Dynamic themes complement responsive layouts across supported device sizes.</p></article>
    </div>
  </section>

  <section class="section" aria-labelledby="screens-title">
    <div class="section-head"><p class="eyebrow">Product renders</p><h2 id="screens-title">See the Hydrion experience.</h2><p>These are genuine app-rendered development captures. Bottle Bingo and Pomodoro captures remain clearly marked until owner-supplied screenshots are available.</p></div>
    <div class="grid gallery">
      <figure class="shot"><button type="button" data-gallery-open data-gallery-title="Hydrion Home"><img src="/assets/images/hydrion/screenshots/home.png" width="390" height="844" loading="lazy" alt="Hydrion Home screen with a daily goal card and hydration controls"></button><figcaption><strong>Home</strong>Daily progress and measured logging.</figcaption></figure>
      <figure class="shot"><button type="button" data-gallery-open data-gallery-title="Hydrion Challenges"><img src="/assets/images/hydrion/screenshots/challenges.png" width="390" height="844" loading="lazy" alt="Hydrion challenge catalogue showing the challenge dock and Around the World Infusion Week"></button><figcaption><strong>Challenges</strong>Challenge catalogue and active progress.</figcaption></figure>
      <figure class="shot shot--pending"><span><strong>Bottle Bingo screenshot pending.</strong><br>Awaiting an owner-supplied app capture; no mock screen is substituted.</span></figure>
      <figure class="shot shot--pending"><span><strong>Pomodoro Sip screenshot pending.</strong><br>Awaiting an owner-supplied app capture; no mock screen is substituted.</span></figure>
      <figure class="shot"><button type="button" data-gallery-open data-gallery-title="Hydrion Progress"><img src="/assets/images/hydrion/screenshots/progress-night.png" width="390" height="844" loading="lazy" alt="Hydrion Progress screen in Night theme with hydration score and seven-day chart"></button><figcaption><strong>Progress</strong>Hydration score and recent history.</figcaption></figure>
      <figure class="shot"><button type="button" data-gallery-open data-gallery-title="Hydrion Day theme"><img src="/assets/images/hydrion/screenshots/home-day.png" width="390" height="844" loading="lazy" alt="Hydrion Home screen in Day theme"></button><figcaption><strong>Day theme</strong>Bright, readable daily tracking.</figcaption></figure>
      <figure class="shot"><button type="button" data-gallery-open data-gallery-title="Hydrion Night theme"><img src="/assets/images/hydrion/screenshots/settings-night.png" width="390" height="844" loading="lazy" alt="Hydrion Settings screen with Night appearance selected"></button><figcaption><strong>Night theme</strong>Low-light settings and controls.</figcaption></figure>
    </div>
  </section>

  <section class="section" aria-labelledby="how-title">
    <div class="section-head"><p class="eyebrow">How it works</p><h2 id="how-title">A clear routine in four steps.</h2></div>
    <div class="grid grid--4 steps">
      <article class="card step"><h3>Set your goal</h3><p>Choose a manual daily target or review weather-assisted guidance.</p></article>
      <article class="card step"><h3>Log measured drinks</h3><p>Add the amount you actually drank in your selected unit.</p></article>
      <article class="card step"><h3>Follow progress</h3><p>Review daily totals, history, analytics, and friendly challenge events.</p></article>
      <article class="card step"><h3>Build consistency</h3><p>Join up to two active challenges and use real-world actions to advance.</p></article>
    </div>
  </section>

  <section class="section" id="community" aria-labelledby="community-title">
    <div class="grid grid--2">
      <article class="card"><p class="eyebrow">Testing and feedback</p><h2 id="community-title">Help make the stable release better.</h2><p>When reporting a defect, include your phone model, Android version, Hydrion version, theme, unit, relevant profile selection, what you did, what happened, and what you expected. Screenshots or recordings help. Do not include personal health information or unnecessary location details.</p><div class="actions"><a class="button" href="${release.discordUrl}" target="_blank" rel="noopener noreferrer">Join Discord <span class="sr-only">(external)</span></a><a class="button button--secondary" href="${release.issuesUrl}" target="_blank" rel="noopener noreferrer">Open GitHub issues <span class="sr-only">(external)</span></a></div></article>
      <article class="card" id="about"><p class="eyebrow">About the publisher</p><h2>Built by The 1807.</h2><p>Hydrion is designed and published by The 1807, a technology studio building thoughtful digital products for everyday life.</p><p><strong>Ownership:</strong> The 1807 &rarr; Hydrion.</p><img src="/assets/the1807.png" width="1005" height="149" loading="lazy" alt="The 1807"></article>
    </div>
  </section>

  <section class="section"><div class="cta"><div><p class="eyebrow">Android public testing</p><h2>Try ${release.displayVersion}.</h2><p>This release-candidate APK is distributed outside Google Play. Android may ask you to allow installation from your browser or file manager.</p></div><a class="button" href="${release.downloadUrl}" aria-label="Download Hydrion v1.1.0 RC1 Android APK">Download Android APK</a></div></section>

  <dialog aria-labelledby="lightbox-title" data-lightbox>
    <div class="lightbox-head"><strong id="lightbox-title" data-lightbox-title>Hydrion screenshot</strong><button class="lightbox-close" type="button" data-lightbox-close aria-label="Close screenshot viewer">&times;</button></div>
    <img class="lightbox-image" data-lightbox-image src="/assets/images/hydrion/screenshots/home.png" alt="">
  </dialog>`
});

const downloadPage = shell({
  title: 'Download Hydrion v1.1.0 RC1 for Android | The 1807',
  description: 'Download the official Hydrion v1.1.0 RC1 Android APK from The 1807, verify its checksum, and read installation guidance.',
  route: links.download,
  current: 'download',
  structured: appStructuredData,
  body: `
    ${subHero('Official Android download', `Download ${release.displayVersion}`, 'Get the current public tester build directly from the official The 1807 GitHub release.', [['Hydrion', links.download.replace('/download/', '/')], ['Download', null]])}
    <section class="section download-layout" aria-labelledby="download-title">
      <div class="download-panel">
        <span class="badge badge--testing">Release candidate / public testing</span>
        <h2 id="download-title">Hydrion for Android</h2>
        <p>This is a release-candidate build distributed outside Google Play. Android may ask you to allow installations from your browser or file manager.</p>
        <div class="actions"><a class="button" href="${release.downloadUrl}" aria-label="Download Hydrion v1.1.0 RC1 Android APK">Download Hydrion.apk</a><a class="button button--secondary" href="${links.rc1}">View release notes</a></div>
        <div class="checksum"><strong>SHA-256</strong><code>${release.sha256}</code><button class="button button--secondary button--small" type="button" data-copy-checksum="${release.sha256}">Copy checksum</button></div>
      </div>
      <dl class="metadata">
        <div><dt>Product</dt><dd>Hydrion</dd></div><div><dt>Publisher</dt><dd>The 1807</dd></div>
        <div><dt>Version</dt><dd>${release.displayVersion}</dd></div><div><dt>Platform</dt><dd>Android</dd></div>
        <div><dt>Channel</dt><dd>Release candidate</dd></div><div><dt>Format</dt><dd>APK</dd></div>
        <div><dt>Asset size</dt><dd>${release.assetSizeLabel} (${release.assetBytes.toLocaleString('en-US')} bytes)</dd></div><div><dt>Published</dt><dd>${release.publishedDate}</dd></div>
        <div><dt>Distribution</dt><dd>Direct download</dd></div><div><dt>Store availability</dt><dd>Not on Google Play</dd></div>
        <div><dt>Application ID</dt><dd>${release.applicationId}</dd></div><div><dt>Minimum Android</dt><dd>Not published; not independently verified</dd></div>
      </dl>
    </section>
    <section class="section"><div class="grid grid--3">
      <article class="card"><h3>Install safely</h3><p>Download only from this page or the linked official GitHub release, then follow the Android prompt.</p><a href="${links.install}">Read installation instructions</a></article>
      <article class="card"><h3>Troubleshoot an update</h3><p>A signature mismatch or incompatible older build can prevent an in-place update. Protect local data before uninstalling.</p><a href="${links.troubleshooting}">Open troubleshooting</a></article>
      <article class="card"><h3>Share feedback</h3><p>Report device-specific behavior through Discord or GitHub without sharing personal health information.</p><a href="${release.discordUrl}" target="_blank" rel="noopener noreferrer">Join Discord <span class="sr-only">(external)</span></a></article>
    </div></section>
    <section class="section"><div class="notice notice--warning"><strong>Tester-build reminder:</strong> ${release.testingNotice}</div><div class="actions"><a href="${release.releaseUrl}" target="_blank" rel="noopener noreferrer">Open the official GitHub release <span class="sr-only">(external)</span></a><a href="${release.repositoryUrl}" target="_blank" rel="noopener noreferrer">View source on GitHub <span class="sr-only">(external)</span></a></div></section>`
});

const docsIndex = docPage({
  title: 'Hydrion documentation',
  description: 'Install Hydrion, start logging measured drinks, understand goals and challenges, and solve common tester-build issues.',
  href: links.docs,
  body: `<p>This documentation describes verified behavior in the current Hydrion source and identifies RC1 device-testing limits plainly.</p>
    <div class="grid grid--2 wide">
      <article class="card"><h2>Install</h2><p>Download the official APK and handle Android installation permissions safely.</p><a href="${links.install}">Install on Android</a></article>
      <article class="card"><h2>Get started</h2><p>Choose units, set a goal, and log your first measured drink.</p><a href="${links.gettingStarted}">Start using Hydrion</a></article>
      <article class="card"><h2>Hydration records</h2><p>Use quick amounts, saved containers, editing, deletion, and daily totals.</p><a href="${links.hydration}">Understand hydration logs</a></article>
      <article class="card"><h2>Goals and challenges</h2><p>Learn weather-assisted goals, challenge evidence, Bottle Bingo, and Pomodoro Sip.</p><a href="${links.challenges}">Explore goals and challenges</a></article>
      <article class="card"><h2>Troubleshooting</h2><p>Work through installation, notifications, weather, progress, and tutorial issues.</p><a href="${links.troubleshooting}">Solve a problem</a></article>
      <article class="card"><h2>Privacy and data</h2><p>Review local storage, location and weather use, external services, and deletion effects.</p><a href="${links.privacy}">Read privacy information</a></article>
    </div>`,
  next: ['Install on Android', links.install]
});

const installDoc = docPage({
  title: 'Install Hydrion on Android',
  description: 'Step-by-step instructions for installing the official Hydrion RC1 APK outside Google Play.',
  href: links.install,
  body: `<div class="notice notice--info">Verify that the download comes from <strong>the1807.xyz</strong> or the official <strong>The-1807/hydrion</strong> GitHub release.</div>
    <h2 id="steps">Installation steps</h2><ol>
      <li>Download <a href="${release.downloadUrl}"><code>Hydrion.apk</code></a>.</li>
      <li>Open the downloaded file from your browser or file manager.</li>
      <li>If Android asks, allow installations from that browser or file manager.</li>
      <li>Review the Android installation prompt and confirm that you intend to install Hydrion.</li>
      <li>Install Hydrion, then open the application.</li>
      <li>If desired, disable the temporary “install unknown apps” permission afterward.</li>
    </ol>
    <h2 id="protect-data">Updates and local data</h2><p>A compatible newer build signed with the same key should normally update over an older tester build while preserving local app data, but upgrade behavior still requires physical-device verification. Uninstalling Hydrion may remove locally stored settings and hydration history.</p>
    <h2 id="protect">Play Protect</h2><p>Android may show a Play Protect notice because this tester build is not distributed through Google Play. Review the source of the APK. Do not disable Play Protect globally.</p>
    <h2 id="verify">Verify the file</h2><p>The official RC1 APK is ${release.assetSizeLabel} and has this SHA-256 checksum:</p><div class="checksum"><code>${release.sha256}</code></div>`,
  previous: ['Documentation', links.docs],
  next: ['Getting started', links.gettingStarted]
});

const gettingStartedDoc = docPage({
  title: 'Getting started',
  description: 'Complete Hydrion setup, choose units, set a hydration goal, and record your first measured drink.',
  href: links.gettingStarted,
  body: `<h2 id="setup">1. Complete setup</h2><p>Review the introductory information, choose the profile options you want to share with the app, and acknowledge the hydration-support disclaimer. Hydrion can still use a manual goal when optional profile or weather inputs are unavailable.</p>
    <h2 id="units">2. Choose units</h2><p>Select millilitres or fluid ounces. Hydrion stores canonical measured volumes and displays amounts in your selected unit.</p>
    <h2 id="goal">3. Set or accept a goal</h2><p>Choose a manual target or enable weather-informed assistance. A weather suggestion is shown for review; it does not silently replace your goal.</p>
    <h2 id="first-log">4. Log your first drink</h2><p>On Home, choose a quick amount, saved container, or custom amount. Enter what you actually drank, then confirm. The same hydration record updates the dashboard and every eligible active challenge without duplicating the daily total.</p>
    <h2 id="themes">Themes</h2><p>Hydrion supports Day, Night, System, and Dynamic appearance choices. System follows the device theme; Dynamic can adjust according to time of day.</p>`,
  previous: ['Install on Android', links.install],
  next: ['Logging hydration', links.hydration]
});

const hydrationDoc = docPage({
  title: 'Logging hydration',
  description: 'Record measured drinks, use saved containers, edit or delete hydration history, and understand daily totals and units.',
  href: links.hydration,
  body: `<h2 id="measured">Measured amounts</h2><p>A hydration log represents a real measured amount. Use a quick amount, enter a custom amount, or select a saved reusable container. Check-in actions that do not establish a volume do not add water.</p>
    <h2 id="containers">Saved containers</h2><p>Configure a reusable bottle or cup size in Settings, then use it as a repeatable logging shortcut. Confirm the amount still matches what you drank.</p>
    <h2 id="daily-total">One daily total</h2><p>Home, History, Progress, Analytics, and Challenges use the same canonical hydration records. One record counts once toward your daily hydration even when it qualifies multiple eligible challenges.</p>
    <h2 id="edit-delete">Editing and deleting</h2><p>Open a history entry to correct its amount or remove it. Challenge-derived evidence, Bottle Bingo tile progress, lines, totals, and analytics recalculate from the remaining records when applicable.</p>
    <h2 id="units">Selected units</h2><p>Hydrion presents amounts in millilitres or fluid ounces according to your setting. Friendly history entries use localized dates and times and avoid internal identifiers.</p>`,
  previous: ['Getting started', links.gettingStarted],
  next: ['Goals and challenges', links.challenges]
});

const challengesDoc = docPage({
  title: 'Goals and challenges',
  description: 'Understand Hydrion weather-assisted goals, challenge evidence, Bottle Bingo, Pomodoro Sip, Temperature Roulette, Infusion Week, and Eat Your Water.',
  href: links.challenges,
  body: `<h2 id="goals-weather">Daily goals and weather</h2><p>Manual goals remain available. When weather mode is enabled, Hydrion requests location permission, obtains current conditions from Open-Meteo, applies bounded logic with saved profile inputs, and asks you to review the suggestion. If location, weather, or required profile inputs are unavailable, Hydrion keeps a safe manual fallback. It does not silently alter the goal.</p>
    <h2 id="active-limit">Active challenge limit</h2><p>You can have up to two active challenges at once. Challenges can be paused, resumed, left, completed, archived, and repeated as a new attempt where supported. Leaving a challenge does not delete ordinary hydration history.</p>
    <h2 id="evidence">Hydration and check-in evidence</h2><p>A measured hydration record counts once toward daily hydration and may qualify every eligible active challenge. A check-in records an action but adds no invented hydration volume.</p>
    <h2 id="bingo">Bottle Bingo</h2><p>The 5 × 5 board contains 24 playable tiles and one free center tile. Tiles may complete automatically from measured records, require an explicit action, or show partial progress. Completed lines update from the evidence. Editing or deleting qualifying evidence recalculates affected tiles and lines.</p>
    <h2 id="pomodoro">Pomodoro Sip</h2><p><strong>Took a sip</strong> advances the session action without assigning an arbitrary amount. <strong>Log a measured drink</strong> creates a normal hydration record and can advance eligible challenges.</p>
    <h2 id="temperature">Temperature Roulette</h2><p>The challenge assigns temperature styles across a five-day schedule. Its dedicated temperature-aware logger records the required context. Ordinary Home hydration stays separate unless that temperature context is provided. Weather guidance can assist, with a friendly fallback when unavailable.</p>
    <h2 id="infusion">Around the World Infusion Week</h2><p>Follow a seven-day no-added-sugar infusion schedule. Measured infused water is normal hydration: it updates daily totals and eligible challenge progress.</p>
    <h2 id="eat-water">Eat Your Water</h2><p>Choose a meal or water-rich-food check-in. The action supports the challenge but does not fabricate hydration volume.</p>`,
  previous: ['Logging hydration', links.hydration],
  next: ['Troubleshooting', links.troubleshooting]
});

const troubleshootingDoc = docPage({
  title: 'Troubleshooting',
  description: 'Resolve common Hydrion tester-build installation, notification, weather, progress, and tutorial issues.',
  href: links.troubleshooting,
  body: `<h2 id="install">APK will not install</h2><p>Confirm the download completed, allow installation from the current browser or file manager if prompted, and verify the file checksum. Ensure the device has available storage.</p>
    <h2 id="update">An existing Hydrion build will not update</h2><p>The previous build may use an incompatible signature or application state. Preserve any needed local data before uninstalling. Upgrade installation over an older tester build still requires real-device verification.</p>
    <h2 id="notifications">Notifications are delayed</h2><p>Allow notification permission and review manufacturer battery restrictions. Android may defer local reminders during battery optimization, sleep, reboot, or timezone changes. RC1 notification behavior remains part of physical-device testing.</p>
    <h2 id="weather">Weather is unavailable</h2><p>Check network access and location permission. Weather assistance uses Open-Meteo and falls back without silently changing a manual goal when data cannot be obtained.</p>
    <h2 id="refresh">Progress does not refresh</h2><p>Pull to refresh on supported screens or navigate away and return. If a recent edit or deletion still appears incorrect, restart the app and report the exact sequence.</p>
    <h2 id="tutorial">Replay the tutorial</h2><p>Open Help from Settings or Profile and choose the available guided-tour replay option.</p>
    <h2 id="report">Report a defect</h2><p>Include phone manufacturer and model, Android version, Hydrion version, theme, unit, relevant profile selection, steps, actual result, expected result, and whether restart changes it. Add a screenshot or screen recording if safe. Do not send personal health information.</p>
    <div class="actions"><a class="button" href="${release.issuesUrl}" target="_blank" rel="noopener noreferrer">Open GitHub issues <span class="sr-only">(external)</span></a><a class="button button--secondary" href="${release.discordUrl}" target="_blank" rel="noopener noreferrer">Join Discord <span class="sr-only">(external)</span></a></div>`,
  previous: ['Goals and challenges', links.challenges]
});

const releaseIndex = shell({
  title: 'Hydrion releases | The 1807',
  description: 'Review the current Hydrion Android release candidate, testing status, download, release notes, and known issues.',
  route: links.releases,
  current: 'releases',
  body: `
    ${subHero('Release archive', 'Hydrion releases', 'Public release information from The 1807. RC1 remains a tester build, not a stable production release.', [['Hydrion', links.download.replace('/download/', '/')], ['Releases', null]])}
    <section class="section"><article class="download-panel"><div class="release-line"><span class="badge badge--testing">Current release candidate</span><span>${release.publishedDate}</span></div><h2>${release.displayVersion}</h2><p>Android public test build with redesigned challenges, responsive interface work, and hydration-system integration.</p><dl class="metadata"><div><dt>Platform</dt><dd>Android</dd></div><div><dt>Status</dt><dd>Public testing</dd></div><div><dt>Format</dt><dd>APK</dd></div><div><dt>Stable?</dt><dd>No — release candidate</dd></div></dl><div class="actions"><a class="button" href="${release.downloadUrl}">Download APK</a><a class="button button--secondary" href="${links.rc1}">Read RC1 notes</a></div></article></section>`
});

const rc1Page = shell({
  title: 'Hydrion v1.1.0 RC1 release notes | The 1807',
  description: 'Release notes, testing scope, known issues, installation guidance, and feedback links for Hydrion v1.1.0 RC1.',
  route: links.rc1,
  current: 'releases',
  body: `
    ${subHero('Release candidate', release.displayVersion, 'The current Android public test build. This page preserves RC1 facts and known issues; future candidates receive separate entries.', [['Hydrion', links.download.replace('/download/', '/')], ['Releases', links.releases], [release.displayVersion, null]])}
    <section class="section download-layout">
      <article class="download-panel"><span class="badge badge--testing">Intended for testing</span><h2>Download RC1</h2><p>Published ${release.publishedDate}. Distributed directly as an Android APK outside Google Play.</p><div class="actions"><a class="button" href="${release.downloadUrl}">Download Hydrion.apk</a><a class="button button--secondary" href="${release.releaseUrl}" target="_blank" rel="noopener noreferrer">GitHub release <span class="sr-only">(external)</span></a></div></article>
      <dl class="metadata"><div><dt>Version</dt><dd>${release.displayVersion}</dd></div><div><dt>Asset</dt><dd>Hydrion.apk</dd></div><div><dt>Size</dt><dd>${release.assetSizeLabel}</dd></div><div><dt>SHA-256</dt><dd>${release.sha256}</dd></div></dl>
    </section>
    <section class="section"><div class="section-head"><p class="eyebrow">Highlights</p><h2>Challenge and hydration integration.</h2></div><div class="grid grid--3">
      <article class="card"><h3>Challenge dashboards</h3><p>Distinct challenge experiences, progress surfaces, two active challenges, pause/resume/leave, completion summaries, and repeat attempts.</p></article>
      <article class="card"><h3>One hydration truth</h3><p>A single measured record updates the daily total once while qualifying all eligible active challenges.</p></article>
      <article class="card"><h3>Responsive experience</h3><p>Improved edge-to-edge layouts, themes, pull-to-refresh, guided tours, and friendly localized challenge history.</p></article>
      <article class="card"><h3>Bottle Bingo</h3><p>A 5 × 5 board with live partial progress, lines, a free center tile, and recalculation after edits or deletions.</p></article>
      <article class="card"><h3>Pomodoro Sip</h3><p>Persistent timer controls, reminder scheduling, honest sip actions, and optional measured logging.</p></article>
      <article class="card"><h3>Activity challenges</h3><p>Temperature Roulette, Infusion Week, and Eat Your Water connect real actions without inventing hydration.</p></article>
    </div></section>
    <section class="section" aria-labelledby="known-title"><div class="section-head"><p class="eyebrow">Known issues and testing scope</p><h2 id="known-title">What testers should watch.</h2><p>${release.testingNotice}</p></div><div class="known-issues">
      <article class="known-issue"><span class="badge">Device UI</span><div><h3>Device-specific spacing</h3><p>Edge-to-edge layout and compact-screen presentation still need broad physical-device verification.</p></div></article>
      <article class="known-issue"><span class="badge">Tutorial</span><div><h3>Presentation differences</h3><p>Tutorial targeting may vary on some screen sizes, text scales, or themes.</p></div></article>
      <article class="known-issue"><span class="badge">Android</span><div><h3>Notification delivery</h3><p>Manufacturer battery restrictions, permissions, reboot, timezone, and delayed delivery require device testing.</p></div></article>
      <article class="known-issue"><span class="badge">Permissions</span><div><h3>Weather and location</h3><p>Permission presentation and provider availability can differ by Android version and device.</p></div></article>
      <article class="known-issue"><span class="badge">Upgrade</span><div><h3>Release-candidate upgrades</h3><p>Installing over previous tester builds and preserving local state need explicit device verification.</p></div></article>
    </div></section>
    <section class="section"><div class="grid grid--2"><article class="card"><h2>Installation</h2><p>Use the official APK, review Android’s prompt, and remember that uninstalling may remove local data.</p><a href="${links.install}">Read the install guide</a></article><article class="card"><h2>Feedback</h2><p>Report visual inconsistencies, incorrect challenge progress, duplicate hydration entries, notification issues, or data-migration problems.</p><div class="actions"><a href="${release.discordUrl}" target="_blank" rel="noopener noreferrer">Discord <span class="sr-only">(external)</span></a><a href="${release.issuesUrl}" target="_blank" rel="noopener noreferrer">GitHub issues <span class="sr-only">(external)</span></a></div></article></div></section>`
});

const privacyPage = shell({
  title: 'Hydrion privacy and data | The 1807',
  description: 'Understand what Hydrion stores, how location and weather work, notification permissions, external services, and local data deletion.',
  route: links.privacy,
  current: 'docs',
  body: `
    ${subHero('Privacy and data', 'Clear facts about Hydrion data.', 'This page reflects inspected Hydrion source behavior. It avoids absolute privacy promises and distinguishes local app records from optional network requests.', [['Hydrion', links.download.replace('/download/', '/')], ['Privacy and data', null]])}
    <section class="section"><div class="grid grid--2">
      <article class="card"><h2>Local app data</h2><p>Hydrion uses on-device preferences for setup, profile choices, goals, selected units, theme, reminders, hydration records, challenge state, tutorial state, and related derived progress.</p></article>
      <article class="card"><h2>Accounts</h2><p>No account or sign-in system was found in the inspected application dependencies and source. RC1 is designed around local app state.</p></article>
      <article class="card"><h2>Location and weather</h2><p>Weather mode requests location permission and obtains device coordinates. Coordinates are sent to Open-Meteo to request forecast data. Weather assistance is optional and has a manual fallback.</p></article>
      <article class="card"><h2>Notifications</h2><p>Hydrion may request Android notification permission and schedules local reminders. Delivery remains subject to Android and manufacturer battery policies.</p></article>
      <article class="card"><h2>Analytics and crash reporting</h2><p>No Firebase Analytics, Crashlytics, Sentry, or comparable analytics/crash SDK was found in the inspected dependencies. This statement describes the inspected source, not every behavior of Android, GitHub, Discord, or Open-Meteo.</p></article>
      <article class="card"><h2>External services</h2><p>Open-Meteo serves optional weather requests. GitHub hosts source and the APK. Discord is an optional community link. Opening those services is governed by their own practices.</p></article>
      <article class="card"><h2>Deletion</h2><p>Delete individual hydration records through the app where supported. Clearing application storage or uninstalling Hydrion may remove local history, settings, reminders, and challenge state.</p></article>
      <article class="card"><h2>Website data</h2><p>The Hydrion product pages add no account form, health-data form, fingerprinting code, advertising SDK, or Hydrion-specific analytics. Hosting infrastructure may still process ordinary web requests.</p></article>
    </div></section>
    <section class="section"><div class="notice notice--warning"><strong>Health notice:</strong> Hydrion supports hydration routines but is not a substitute for individualized medical advice. Hydration needs vary.</div><p class="muted">Source review basis: Hydrion v1.1.0 source on the release18 branch inspected July 20, 2026. Contact The 1807 through the official repository for factual corrections.</p></section>`
});

const pages = new Map([
  ['index.html', landing],
  ['download/index.html', downloadPage],
  ['docs/index.html', docsIndex],
  ['docs/install/index.html', installDoc],
  ['docs/getting-started/index.html', gettingStartedDoc],
  ['docs/hydration/index.html', hydrationDoc],
  ['docs/challenges/index.html', challengesDoc],
  ['docs/troubleshooting/index.html', troubleshootingDoc],
  ['releases/index.html', releaseIndex],
  ['releases/v1.1.0-rc.1/index.html', rc1Page],
  ['privacy/index.html', privacyPage]
]);

for (const [relative, html] of pages) {
  const destination = path.join(outputRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html.trimStart(), 'utf8');
}

if (!standalone) {
  await writeFile(path.join(repoRoot, 'hydrion.html'), landing.trimStart(), 'utf8');
}

const canonicalRoutes = [
  '/hydrion/',
  '/hydrion/download/',
  '/hydrion/docs/',
  '/hydrion/docs/install/',
  '/hydrion/docs/getting-started/',
  '/hydrion/docs/hydration/',
  '/hydrion/docs/challenges/',
  '/hydrion/docs/troubleshooting/',
  '/hydrion/releases/',
  '/hydrion/releases/v1.1.0-rc.1/',
  '/hydrion/privacy/'
];

if (standalone) {
  await writeFile(path.join(repoRoot, 'robots.txt'), 'User-agent: *\\nAllow: /\\nSitemap: https://the1807.xyz/sitemap.xml\\n', 'utf8');
  await writeFile(path.join(repoRoot, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...canonicalRoutes.map((route) => `  <url><loc>https://the1807.xyz${route}</loc></url>`),
    '</urlset>',
    ''
  ].join('\\n'), 'utf8');
}

console.log(`Generated ${pages.size} Hydrion pages in ${outputRoot}`);
