import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const keyPages = ['/', '/home/', '/projects/', '/certific8te/', '/resume/', '/resumes/', '/contact/', '/links/', '/1807osPort/'];
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.pdf', 'application/pdf'],
  ['.mp4', 'video/mp4'],
  ['.txt', 'text/plain; charset=utf-8']
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fileExists(file) {
  try {
    const info = await stat(file);
    return info.isFile();
  } catch {
    return false;
  }
}

async function resolveRequest(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const safePath = path.normalize(clean).replace(/^(\.\.[/\\])+/, '');
  const relative = safePath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, '');
  const direct = path.join(rootDir, relative);
  const candidates = [];

  if (clean.endsWith('/')) {
    candidates.push(path.join(rootDir, relative, 'index.html'));
  } else {
    candidates.push(direct);
    if (!path.extname(relative)) {
      candidates.push(path.join(rootDir, `${relative}.html`));
      candidates.push(path.join(rootDir, relative, 'index.html'));
    }
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(rootDir)) continue;
    if (await fileExists(candidate)) return candidate;
  }

  return path.join(rootDir, '404.html');
}

async function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const file = await resolveRequest(request.url || '/');
      const ext = path.extname(file).toLowerCase();
      response.writeHead(path.basename(file) === '404.html' ? 404 : 200, {
        'content-type': mimeTypes.get(ext) || 'application/octet-stream'
      });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Smoke server error');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function chromeCandidates() {
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    return [
      ...roots.map((dir) => path.join(dir, 'Google/Chrome/Application/chrome.exe')),
      ...roots.map((dir) => path.join(dir, 'Microsoft/Edge/Application/msedge.exe'))
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ];
  }
  return ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
}

async function findChrome() {
  for (const candidate of chromeCandidates()) {
    if (candidate.includes(path.sep) && !(await fileExists(candidate))) continue;
    return candidate;
  }
  throw new Error('No Chrome or Edge executable found for smoke test.');
}

async function waitForJson(url, timeout = 20000, init = {}) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return response.json();
    } catch {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startBrowser() {
  const chromePath = await findChrome();
  const port = 9400 + Math.floor(Math.random() * 500);
  const profile = await mkdtemp(path.join(tmpdir(), 'chains-smoke-'));
  const processRef = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-breakpad',
    '--disable-crash-reporter',
    '--disable-sync',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const target = await waitForJson(`http://127.0.0.1:${port}/json/new?about:blank`, 20000, { method: 'PUT' });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let messageId = 0;
  const pageErrors = [];

  await Promise.race([
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening DevTools WebSocket')), 10000);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      ws.addEventListener('error', (error) => {
        clearTimeout(timer);
        reject(error);
      }, { once: true });
    }),
    new Promise((_, reject) => processRef.once('exit', () => reject(new Error('Chrome exited during startup'))))
  ]);

  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    if (payload.method === 'Runtime.exceptionThrown') {
      pageErrors.push(payload.params?.exceptionDetails?.text || 'Runtime exception');
    }
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message));
    else resolve(payload.result);
  });

  function send(method, params = {}) {
    const id = ++messageId;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
    return result.result.value;
  }

  await send('Runtime.enable');
  await send('Page.enable');

  async function navigate(url) {
    pageErrors.length = 0;
    await send('Page.navigate', { url });
    const ready = await waitForCondition(() => evaluate('document.readyState !== "loading"'), 10000);
    assert(ready, `Page did not become interactive: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (pageErrors.length) throw new Error(`Browser exception at ${url}: ${pageErrors.join('; ')}`);
  }

  async function waitForCondition(check, timeout = 45000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await check()) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }

  return {
    evaluate,
    navigate,
    waitForCondition,
    async close() {
      await send('Browser.close').catch(() => {});
      ws.close();
      processRef.kill();
      await new Promise((resolve) => setTimeout(resolve, 800));
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    }
  };
}

async function smokePage(browser, baseUrl, pagePath) {
  await browser.navigate(`${baseUrl}${pagePath}`);
  const snapshot = await browser.evaluate(`(() => ({
    path: location.pathname,
    title: document.title,
    main: Boolean(document.querySelector("main")),
    bodyText: document.body.innerText.slice(0, 600),
    brokenImages: Array.from(document.images)
      .filter((img) => img.currentSrc || img.getAttribute("src"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
  }))()`);

  assert(snapshot.path === pagePath, `Expected ${pagePath}, got ${snapshot.path}`);
  assert(snapshot.title && snapshot.title.length > 2, `Missing title on ${pagePath}`);
  assert(snapshot.main, `Missing main landmark on ${pagePath}`);
  assert(snapshot.brokenImages.length === 0, `Broken images on ${pagePath}: ${snapshot.brokenImages.join(', ')}`);

  if (pagePath === '/certific8te/') {
    const ready = await browser.waitForCondition(() => browser.evaluate('document.querySelectorAll(".cert-card").length >= 3'), 45000);
    assert(ready, 'Certificate cards did not render');
    const certState = await browser.evaluate(`(() => ({
      cards: document.querySelectorAll(".cert-card").length,
      emptyHidden: document.getElementById("cert-empty")?.hidden,
      imageUrls: Array.from(document.querySelectorAll(".cert-card img")).map((img) => img.currentSrc || img.src),
      active: window.__CERT_DEBUG__?.activeFilteredSet?.length || 0
    }))()`);
    assert(certState.cards >= 3, `Expected at least 3 certificate cards, got ${certState.cards}`);
    assert(certState.emptyHidden === true, 'Certificate empty state is visible while cards exist');
    assert(certState.active >= 3, `Expected active certificate set >= 3, got ${certState.active}`);
    for (const url of certState.imageUrls) {
      if (url.startsWith('data:')) continue;
      const response = await fetch(url);
      assert(response.status === 200, `Certificate image failed ${response.status}: ${url}`);
    }
  }

  return snapshot;
}

async function main() {
  console.log('Smoke server starting');
  const server = await startServer();
  console.log(`Smoke server ${server.baseUrl}`);
  console.log('Smoke browser starting');
  const browser = await startBrowser();
  const results = [];

  try {
    for (const pagePath of keyPages) {
      console.log(`Smoke ${pagePath}`);
      results.push(await smokePage(browser, server.baseUrl, pagePath));
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`Smoke passed: ${results.length} pages.`);
}

const watchdog = setTimeout(() => {
  console.error('Smoke timed out.');
  process.exit(1);
}, 120000);

main()
  .then(async () => {
    clearTimeout(watchdog);
    await new Promise((resolve) => setTimeout(resolve, 25));
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(watchdog);
    console.error(error);
    process.exit(1);
  });
