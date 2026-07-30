import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const keyPages = ['/', '/work/', '/hub/', '/hydrion/', '/hydrion/download/', '/hydrion/docs/', '/modoroco/', '/clipsense/', '/about/', '/hydrion/releases/v1.1.0-rc.1/', '/hydrion/privacy/', '/certific8te/', '/contact/', '/404.html'];
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
    close: () => new Promise((resolve) => {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      const timer = setTimeout(resolve, 1500);
      server.close(() => {
        clearTimeout(timer);
        resolve();
      });
    })
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
  const resourceErrors = [];

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
    if (payload.method === 'Runtime.consoleAPICalled' && payload.params?.type === 'error') {
      pageErrors.push(payload.params.args?.map((arg) => arg.value || arg.description || '').filter(Boolean).join(' ') || 'Console error');
    }
    if (payload.method === 'Network.responseReceived' && Number(payload.params?.response?.status) >= 400) {
      resourceErrors.push(`${payload.params.response.status} ${payload.params.response.url}`);
    }
    if (payload.method === 'Network.loadingFailed' && !payload.params?.canceled) {
      resourceErrors.push(`${payload.params?.errorText || 'load failed'} ${payload.params?.requestId || ''}`.trim());
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
  await send('Network.enable');

  async function navigate(url) {
    pageErrors.length = 0;
    resourceErrors.length = 0;
    await send('Page.navigate', { url });
    const ready = await waitForCondition(async () => {
      const state = await evaluate(`({
        href: location.href,
        readyState: document.readyState
      })`);
      return state.href === url && state.readyState !== 'loading';
    }, 10000);
    assert(ready, `Page did not become interactive: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (pageErrors.length) throw new Error(`Browser exception at ${url}: ${pageErrors.join('; ')}`);
    const relevantResourceErrors = url.endsWith('/404.html')
      ? resourceErrors.filter((error) => !error.startsWith(`404 ${url}`))
      : resourceErrors;
    if (relevantResourceErrors.length) throw new Error(`Broken resource at ${url}: ${relevantResourceErrors.join('; ')}`);
  }

  async function waitForCondition(check, timeout = 45000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await check()) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }

  async function setViewport(width, height, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  }

  async function setReducedMotion(enabled) {
    await send('Emulation.setEmulatedMedia', {
      media: '',
      features: enabled ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [],
    });
  }

  async function captureScreenshot(filePath, { fullPage = true } = {}) {
    let clip;
    if (fullPage) {
      const metrics = await send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize || metrics.contentSize;
      clip = {
        x: 0,
        y: 0,
        width: Math.max(1, Math.ceil(size.width)),
        height: Math.max(1, Math.ceil(size.height)),
        scale: 1,
      };
    }
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: Boolean(fullPage),
      ...(clip ? { clip } : {}),
    });
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.from(result.data, 'base64'));
  }

  return {
    send,
    evaluate,
    navigate,
    waitForCondition,
    setViewport,
    setReducedMotion,
    captureScreenshot,
    async close() {
      if (ws.readyState === WebSocket.OPEN) {
        const closeBrowser = send('Browser.close').catch(() => {});
        await Promise.race([
          closeBrowser,
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
      }
      ws.close();
      if (!processRef.killed) processRef.kill();
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 800);
        processRef.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
      await Promise.race([
        rm(profile, { recursive: true, force: true }).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);
    }
  };
}

async function smokePage(browser, baseUrl, pagePath) {
  await browser.navigate(`${baseUrl}${pagePath}${pagePath === '/' ? `?bypass=1&smoke=${Date.now()}` : ''}`);
  if (['/', '/work/', '/hub/', '/contact/', '/certific8te/'].includes(pagePath)) {
    await browser.waitForCondition(() => browser.evaluate('Boolean(document.querySelector(".neon-net-layer"))'), 5000);
  }
  const snapshot = await browser.evaluate(`(() => ({
    path: location.pathname,
    title: document.title,
    main: Boolean(document.querySelector("main")),
    bodyText: document.body.innerText.slice(0, 600),
    brokenImages: Array.from(document.images)
      .filter((img) => img.currentSrc || img.getAttribute("src"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
    performance: (() => {
      const resources = performance.getEntriesByType("resource");
      const navigation = performance.getEntriesByType("navigation")[0];
      const paints = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
      const byType = (type) => resources.filter((entry) => entry.initiatorType === type).reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
      return {
        requests: resources.length + 1,
        transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), navigation?.transferSize || 0),
        scriptBytes: byType("script"),
        cssBytes: byType("link"),
        imageBytes: byType("img"),
        fcp: paints["first-contentful-paint"] || null,
        domContentLoaded: navigation?.domContentLoadedEventEnd || null,
        load: navigation?.loadEventEnd || null
      };
    })(),
    layout: (() => {
      const main = document.querySelector("main");
      const footer = document.querySelector(".site-footer, footer");
      const children = main ? Array.from(main.children).map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, height: rect.height, display: getComputedStyle(element).display };
      }).filter((item) => item.height > 2 && item.display !== "none").sort((a, b) => a.top - b.top) : [];
      const gaps = children.slice(1).map((item, index) => Math.max(0, item.top - children[index].bottom));
      const footerRect = footer?.getBoundingClientRect();
      const footerPosition = footer ? getComputedStyle(footer).position : null;
      const footerTop = footerRect ? footerRect.top + scrollY : null;
      const footerBottom = footerRect ? footerRect.bottom + scrollY : null;
      const trailingElements = footerBottom === null ? [] : Array.from(document.querySelectorAll("body *"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className: typeof element.className === "string" ? element.className : element.className?.baseVal || "",
            top: rect.top + scrollY,
            bottom: rect.bottom + scrollY,
            position: style.position,
            display: style.display
          };
        })
        .filter((item) => item.display !== "none" && item.position !== "fixed" && item.bottom > footerBottom + 80)
        .sort((a, b) => b.bottom - a.bottom)
        .slice(0, 8);
      return {
        viewportWidth: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        maxMainGap: gaps.length ? Math.max(...gaps) : 0,
        footerPosition,
        footerGap: footerPosition !== "fixed" && footerTop !== null && children.length ? Math.max(0, footerTop - children.at(-1).bottom) : 0,
        afterFooterGap: footerPosition !== "fixed" && footerBottom !== null ? Math.max(0, document.documentElement.scrollHeight - footerBottom) : 0,
        trailingElements
      };
    })()
  }))()`);

  assert(snapshot.path === pagePath, `Expected ${pagePath}, got ${snapshot.path}`);
  assert(snapshot.title && snapshot.title.length > 2, `Missing title on ${pagePath}`);
  assert(snapshot.main, `Missing main landmark on ${pagePath}`);
  assert(snapshot.brokenImages.length === 0, `Broken images on ${pagePath}: ${snapshot.brokenImages.join(', ')}`);
  assert(snapshot.layout.scrollWidth <= snapshot.layout.viewportWidth + 1, `Horizontal overflow on ${pagePath}: ${snapshot.layout.scrollWidth - snapshot.layout.viewportWidth}px`);
  const contentFlowPages = new Set(['/', '/work/', '/hub/', '/hydrion/', '/hydrion/download/', '/hydrion/docs/', '/modoroco/', '/clipsense/', '/about/', '/hydrion/releases/v1.1.0-rc.1/', '/hydrion/privacy/', '/certific8te/', '/contact/', '/404.html']);
  if (contentFlowPages.has(pagePath)) {
    assert(snapshot.layout.maxMainGap <= 360, `Excessive content gap on ${pagePath}: ${snapshot.layout.maxMainGap}px`);
    assert(snapshot.layout.footerGap <= 320, `Excessive final-content/footer gap on ${pagePath}: ${snapshot.layout.footerGap}px`);
    assert(snapshot.layout.afterFooterGap <= 80, `Unexpected blank region after footer on ${pagePath}: ${snapshot.layout.afterFooterGap}px; trailing=${JSON.stringify(snapshot.layout.trailingElements)}`);
  }

  if (['/', '/hydrion/', '/modoroco/', '/clipsense/', '/hub/'].includes(pagePath) && snapshot.layout.viewportWidth >= 1000) {
    console.log(`PERF ${pagePath} ${JSON.stringify(snapshot.performance)}`);
  }

  if (pagePath === '/certific8te/') {
    const ready = await browser.waitForCondition(() => browser.evaluate('document.querySelectorAll(".certificate-feed__card").length >= 3'), 45000);
    assert(ready, 'Certificate cards did not render');
    const certState = await browser.evaluate(`(() => ({
      cards: document.querySelectorAll(".certificate-feed__card").length,
      count: Number(document.querySelector("[data-certificate-count]")?.textContent || 0),
      empty: document.getElementById("certificate-feed")?.classList.contains("certificate-feed--empty"),
      imageUrls: Array.from(document.querySelectorAll(".certificate-feed__card img")).map((img) => img.currentSrc || img.src)
    }))()`);
    assert(certState.cards === certState.count, `Expected every manifest item once; cards=${certState.cards}, count=${certState.count}`);
    assert(certState.cards >= 3, `Expected at least 3 certificate cards, got ${certState.cards}`);
    assert(certState.empty === false, 'Certificate empty state is visible while cards exist');
    for (const url of certState.imageUrls) {
      if (url.startsWith('data:')) continue;
      const response = await fetch(url);
      assert(response.status === 200, `Certificate image failed ${response.status}: ${url}`);
    }
    const filterState = await browser.evaluate(`(() => {
      const input = document.getElementById("cert-search");
      input.value = "Python";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const pythonMatches = document.querySelectorAll(".certificate-feed__card").length;
      input.value = "definitely-no-certificate";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const empty = document.getElementById("certificate-feed")?.classList.contains("certificate-feed--empty");
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const restored = document.querySelectorAll(".certificate-feed__card").length;
      return { pythonMatches, empty, restored };
    })()`);
    assert(filterState.pythonMatches > 0 && filterState.pythonMatches < certState.cards, `Certificate search did not filter: ${JSON.stringify(filterState)}`);
    assert(filterState.empty === true, `Certificate empty state did not activate: ${JSON.stringify(filterState)}`);
    assert(filterState.restored === certState.cards, `Certificate search did not restore all cards: ${JSON.stringify(filterState)}`);
  }

  if (['/', '/work/', '/hub/', '/contact/', '/certific8te/'].includes(pagePath)) {
    const neonState = await browser.evaluate(`(() => {
      const canvas = document.querySelector(".neon-net-layer");
      return {
      canvases: document.querySelectorAll(".neon-net-layer").length,
      pointerEvents: canvas ? getComputedStyle(canvas).pointerEvents : null,
      instances: window.__NEON_NET_DEBUG__?.instanceCount || 0,
      nodes: window.__NEON_NET_DEBUG__?.nodeCount || 0,
      bodyClass: document.body.className,
      hasEligibleHost: Boolean(document.querySelector(".streamline-page") || (document.body.matches(".certifi8te-page") && document.querySelector("main")))
    };
    })()`);
    assert(neonState.canvases === 1 && neonState.instances === 1, `Neon net initialized incorrectly on ${pagePath}: ${JSON.stringify(neonState)}`);
    assert(neonState.pointerEvents === 'none', `Neon net intercepts input on ${pagePath}`);
    assert(neonState.nodes > 0 && neonState.nodes < 300, `Neon node count is invalid on ${pagePath}: ${neonState.nodes}`);
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
  const screenshotDir = process.env.STREAMLINE_SCREENSHOT_DIR || '';
  const screenshotPages = new Set(['/', '/hub/', '/hydrion/', '/modoroco/', '/clipsense/']);
  const prepareScreenshot = async () => {
    const lazyCount = await browser.evaluate(`document.querySelectorAll('img[loading="lazy"]').length`);
    for (let index = 0; index < lazyCount; index += 1) {
      await browser.evaluate(`document.querySelectorAll('img[loading="lazy"]')[${index}]?.scrollIntoView({ block: 'center' })`);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await browser.evaluate('scrollTo(0, 0)');
    await new Promise((resolve) => setTimeout(resolve, 400));
  };
  const filenameFor = (mode, pagePath) => {
    const route = pagePath === '/' ? 'landing' : pagePath.replace(/^\//, '').replace(/\/$/, '').replaceAll('/', '--');
    return path.join(screenshotDir, `${mode}-${route}.png`);
  };

  try {
    await browser.setViewport(1440, 1000);
    for (const pagePath of keyPages) {
      console.log(`Smoke ${pagePath}`);
      results.push(await smokePage(browser, server.baseUrl, pagePath));
      if (screenshotDir && screenshotPages.has(pagePath)) {
        await prepareScreenshot();
        await browser.captureScreenshot(filenameFor('desktop', pagePath));
      }
    }

    console.log('Smoke entry loader, puzzle skip, and session return');
    await browser.navigate(`${server.baseUrl}/?intro=1`);
    const puzzleVisible = await browser.waitForCondition(() => browser.evaluate('Boolean(document.querySelector("[data-puzzle-stage]:not([hidden])"))'), 5000);
    assert(puzzleVisible, 'Entry loader did not yield to the puzzle');
    const puzzleState = await browser.evaluate(`(() => ({
      dialog: Boolean(document.querySelector('[data-entry][role="dialog"]')),
      keyboardTarget: Boolean(document.querySelector('#vb-puzzle-layer[tabindex="0"]')),
      skip: Boolean(document.querySelector('[data-entry-skip]'))
    }))()`);
    assert(puzzleState.dialog && puzzleState.keyboardTarget && puzzleState.skip, `Entry accessibility contract failed: ${JSON.stringify(puzzleState)}`);
    await browser.evaluate(`document.querySelector('[data-entry-skip]')?.click()`);
    const introClosed = await browser.waitForCondition(() => browser.evaluate('document.querySelector("[data-entry]")?.hidden === true'), 3000);
    assert(introClosed, 'Skip intro did not reveal the portfolio');
    const remembered = await browser.evaluate(`sessionStorage.getItem('the1807.intro.complete') === '1'`);
    assert(remembered, 'Entry completion was not remembered for the browser session');
    await browser.navigate(`${server.baseUrl}/`);
    const repeatBypassed = await browser.evaluate(`document.querySelector('[data-entry]')?.hidden === true`);
    assert(repeatBypassed, 'Returning visitor was forced through the intro again');

    await browser.setViewport(390, 844, true);
    for (const pagePath of keyPages) {
      console.log(`Smoke mobile ${pagePath}`);
      results.push(await smokePage(browser, server.baseUrl, pagePath));
      if (screenshotDir && screenshotPages.has(pagePath)) {
        await prepareScreenshot();
        await browser.captureScreenshot(filenameFor('mobile', pagePath));
      }
    }

    if (screenshotDir) {
      await browser.setViewport(1440, 1000);
      await browser.navigate(`${server.baseUrl}/?bypass=1`);
      await browser.evaluate(`window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth * 0.7, clientY: innerHeight * 0.45 }))`);
      await new Promise((resolve) => setTimeout(resolve, 180));
      await browser.captureScreenshot(path.join(screenshotDir, 'desktop-home-neon-pointer.png'), { fullPage: false });

      await browser.setReducedMotion(true);
      await browser.navigate(`${server.baseUrl}/?bypass=1`);
      await browser.captureScreenshot(path.join(screenshotDir, 'desktop-home-reduced-motion.png'), { fullPage: false });
      await browser.setReducedMotion(false);

      await browser.navigate(`${server.baseUrl}/certific8te/`);
      await browser.waitForCondition(() => browser.evaluate('document.querySelectorAll(".certificate-feed__card").length >= 3'));
      await browser.evaluate(`(() => {
        const input = document.getElementById('cert-search');
        if (!input) return;
        input.value = 'Python';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await browser.waitForCondition(() => browser.evaluate('document.querySelectorAll(".certificate-feed__card").length > 0 && document.querySelectorAll(".certificate-feed__card").length < Number(document.querySelector("[data-certificate-count]")?.textContent || 0)'));
      await browser.captureScreenshot(path.join(screenshotDir, 'desktop-certific8te-search-python.png'));
      await browser.evaluate(`(() => {
        const input = document.getElementById('cert-search');
        if (!input) return;
        input.value = 'definitely-no-certificate';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await browser.waitForCondition(() => browser.evaluate('document.getElementById("certificate-feed")?.classList.contains("certificate-feed--empty")'));
      await browser.captureScreenshot(path.join(screenshotDir, 'desktop-certific8te-empty-state.png'), { fullPage: false });
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`Smoke passed: ${results.length} pages.`);
}

const watchdogMs = Math.max(120000, keyPages.length * 15000);
const watchdog = setTimeout(() => {
  console.error('Smoke timed out.');
  process.exit(1);
}, watchdogMs);

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
