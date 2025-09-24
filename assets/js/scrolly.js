export function initScrolly() {
  const SELECTORS = {
    videoContainer: '.scrolly-video',
    video: '.scrolly-video .hero-video',
    scrolly: '#scrolly-story',
    panels: '.scrolly__panel',
    pageIndex: '.page-index',
    eyebrow: '#eyebrow-rotator',
    progressBar: '#progress',
    animatedCount: '.anim-count',
    startHeading: '#panel-intro .panel-title',
    navigationControls: '.scrolly-controls',
    nextButton: '.scrolly-control--next',
    prevButton: '.scrolly-control--prev',
    banner: '.scrolly-banner'
  };

  const state = {
    videoDuration: 0,
    reducedMotion: false,
    ticking: false,
    started: false,
    autoPlayEnabled: false,
    currentPanelIndex: 0,
    totalPanels: 0,
    animationDisposers: [],
    autoAdvanceTimer: null,
    handlers: {},
    observer: null,
    assigned: new Map()
  };

  const POOLS = {
    layout: ['centered', 'img-left', 'img-right', 'stacked', 'split-2', 'ring-3', 'grid-4'],
    title: ['flash-in', 'slide-l', 'slide-r', 'rise', 'fade', 'typewriter', 'glitch'],
    text: ['fade-stagger', 'slide-up', 'reveal-lines', 'typewriter', 'rise', 'fade'],
    media: ['scale-in', 'hover', 'bounce', 'opposite', 'tilt', 'parallax', 'spin'],
    tempo: ['snappy', 'normal', 'slow'],
    variant: ['minimal', 'dramatic', 'playful', 'elegant']
  };

  const COMPAT = {
    requiresMulti: new Set(['split-2', 'ring-3', 'grid-4', 'opposite', 'spin']),
    motionHeavy: new Set(['bounce', 'spin', 'parallax', 'tilt'])
  };

  const READING_SPEED = {
    slow: 180,  // words per minute
    fast: 300
  };

  const DELAY_BOUNDS = {
    min: 3000,    // 3 seconds
    max: 12000    // 12 seconds
  };

  // Throttle video updates
  let lastVideoUpdateTime = 0;

  // --- Helper Functions ---

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function cssMs(el, varName, fallback) {
    const v = getComputedStyle(el).getPropertyValue(varName).trim();
    if (!v) return fallback;
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function seedRand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 233280;
    return () => { x = Math.sin(x * 9301 + 49297) * 233280; return x - Math.floor(x); };
  }

  function tempoToVars(tempo) {
    switch (tempo) {
      case 'snappy': return { title: '220ms', media: '260ms', text: '280ms', gap: '90ms' };
      case 'slow':   return { title: '520ms', media: '600ms', text: '640ms', gap: '140ms' };
      default:       return { title: '360ms', media: '420ms', text: '460ms', gap: '120ms' };
    }
  }

  function forceUnpauseHero() {
    const hero = document.getElementById('hero') || document.querySelector('.home-hero');
    if (hero) {
      hero.removeAttribute('data-anim-paused');
      hero.querySelectorAll('[data-anim-paused]').forEach(n => n.removeAttribute('data-anim-paused'));
    }
    const eyebrow = document.getElementById('eyebrow') || (document.getElementById('eyebrow-rotator')?.parentElement);
    if (eyebrow) eyebrow.removeAttribute('data-anim-paused');
    document.body?.removeAttribute('data-anim-paused');
  }

  // --- Core Functions ---

  function init() {
    state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panelsEls = document.querySelectorAll(SELECTORS.panels);
    state.totalPanels = panelsEls.length;

    initTypewriter();
    initScrollVideoAndProgress();
    initPanels();
    initStartTrigger();
    initNavigationControls();
    uniqueChoreographAllPanels();
  }

  function initTypewriter() {
    const el = document.querySelector(SELECTORS.eyebrow);
    if (!el) return;

    const ensureLine = () => {
      if (el.classList.contains('tw-line')) return el;
      let line = el.querySelector('.tw-line');
      if (!line) {
        line = document.createElement('span');
        line.className = 'tw-line';
        el.appendChild(line);
      }
      return line;
    };

    let phrases;
    try {
      const raw = el.getAttribute('data-phrases');
      phrases = raw ? JSON.parse(raw) : null;
    } catch {
      phrases = null;
    }
    if (!Array.isArray(phrases) || phrases.length === 0) {
      phrases = ['WELCOME TO THE RAIN...'];
    }

    const line = ensureLine();
    if (state.reducedMotion) {
      line.textContent = phrases[0];
      return;
    }

    const colors = ['#60a5fa', '#93c5fd', '#2563eb', '#b68b4c', '#d6a76a', '#f5e9da'];
    let ip = 0, ic = 0, typing = true, prevColor = null;
    let timer = null;

    const pickColor = () => {
      const pool = colors.filter(c => c !== prevColor);
      const c = pool[Math.floor(Math.random() * pool.length)] || colors[0];
      prevColor = c;
      return c;
    };

    const typeMs = 55, eraseMs = 28, pauseMs = 1200;

    function step() {
      const text = phrases[ip] || '';
      if (typing) {
        if (ic < text.length) {
          const span = document.createElement('span');
          span.className = 'tw-char is-typing';
          span.style.setProperty('--typing-color', pickColor());
          span.textContent = text[ic];
          line.appendChild(span);
          const prev = line.children[line.children.length - 2];
          if (prev && prev.classList.contains('tw-char')) prev.classList.remove('is-typing');
          ic++;
          timer = setTimeout(step, typeMs);
          return;
        }
        const last = line.lastElementChild;
        if (last) last.classList.remove('is-typing');
        typing = false;
        timer = setTimeout(step, pauseMs);
        return;
      } else {
        if (ic > 0) {
          line.removeChild(line.lastChild);
          ic--;
          timer = setTimeout(step, eraseMs);
          return;
        }
        typing = true;
        ip = (ip + 1) % phrases.length;
        timer = setTimeout(step, typeMs);
      }
    }
    step();
    state.animationDisposers.push(() => clearTimeout(timer));
  }

  function initStartTrigger() {
    const title = document.querySelector(SELECTORS.startHeading);
    if (!title) return;

    title.setAttribute('role', 'button');
    if (!title.hasAttribute('tabindex')) title.tabIndex = 0;
    title.title = 'Click to begin';
    title.style.cursor = 'pointer';

    const start = () => {
      if (state.started) return;
      state.started = true;
      forceUnpauseHero();
      runPanelEffect(getActivePanel());
      enableAutoPlay();

      const banner = document.querySelector(SELECTORS.banner);
      if (banner) {
        banner.classList.add('fade-out');
        setTimeout(() => banner.remove(), 800);
      }

      const video = document.querySelector(SELECTORS.video);
      if (video && !state.reducedMotion) {
        video.play().catch(() => {});
      }
    };

    title.addEventListener('click', start, { once: true });
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        start();
      }
    }, { once: true });
  }

  function uniqueChoreographAllPanels() {
    const panels = Array.from(document.querySelectorAll(SELECTORS.panels));
    const rand = seedRand(panels.length * 1807 + 13);
    const usedCombos = new Set();

    panels.forEach((p, idx) => {
      const id = p.id || `panel-${idx}`;
      const imgs = p.querySelectorAll('.panel-figure .panel-img, .panel-figure--circular .panel-img');
      const mediaCount = imgs.length || 1;

      const layoutPool = POOLS.layout.filter(l => {
        if (l === 'split-2') return mediaCount >= 2;
        if (l === 'ring-3' || l === 'grid-4') return mediaCount >= 3;
        return true;
      });

      const mediaPool = POOLS.media.filter(m => {
        if (COMPAT.requiresMulti.has(m)) return mediaCount >= 2;
        if (COMPAT.motionHeavy.has(m) && state.reducedMotion) return false;
        return true;
      });

      const titlePool = POOLS.title.filter(t => !(t === 'glitch' && state.reducedMotion));
      const textPool = POOLS.text.filter(t => !(t === 'typewriter' && state.reducedMotion));
      const tempoPool = POOLS.tempo.slice(0);
      const variantPool = POOLS.variant.slice(0);

      function choose(pool, salt) {
        const i = Math.floor(rand() * pool.length + salt) % pool.length;
        return pool[i];
      }

      let attempt = 0, combo;
      do {
        const layout = choose(layoutPool, idx + attempt);
        const title = choose(titlePool, idx * 3 + attempt);
        const text = choose(textPool, idx * 5 + attempt);
        const media = choose(mediaPool, idx * 7 + attempt);
        const tempo = choose(tempoPool, idx + attempt * 2);
        const variant = choose(variantPool, idx + attempt * 3);
        combo = `${layout}|${title}|${text}|${media}|${tempo}|${variant}`;
        attempt++;
      } while (usedCombos.has(combo) && attempt < 8);
      usedCombos.add(combo);

      const [layout, title, text, media, tempo, variant] = combo.split('|');

      p.classList.add(`layout--${layout}`, `tempo--${tempo}`, `variant--${variant}`);
      const titleEl = p.querySelector('.panel-title');
      const textEls = p.querySelectorAll('.panel-text, .panel-list');
      const figEls = p.querySelectorAll('.panel-figure');

      if (titleEl) titleEl.classList.add(`fx-title--${title}`);
      textEls.forEach(el => el.classList.add(`fx-text--${text}`));
      figEls.forEach(el => el.classList.add(`fx-media--${media}`));

      const tempoVars = tempoToVars(tempo);
      p.style.setProperty('--panel-phase-title', tempoVars.title);
      p.style.setProperty('--panel-phase-media', tempoVars.media);
      p.style.setProperty('--panel-phase-text', tempoVars.text);
      p.style.setProperty('--panel-phase-gap', tempoVars.gap);

      if (layout === 'split-2' && mediaCount >= 2) {
        p.classList.add('has-split-2', 'split-center-text');
        const [a, b] = [imgs[0], imgs[1]];
        if (a) a.classList.add('media-left');
        if (b) b.classList.add('media-right');
      } else if (layout === 'ring-3' && mediaCount >= 3) {
        p.classList.add('has-ring-3');
        markRingNodes(imgs);
      } else if (layout === 'grid-4' && mediaCount >= 3) {
        p.classList.add('has-grid-4');
      }

      state.assigned.set(id, { layout, title, text, media, tempo, variant, mediaCount });
    });
  }

  function markRingNodes(nodeList) {
    const arr = Array.from(nodeList);
    if (arr[0]) arr[0].classList.add('panel-img--first');
    if (arr[1]) arr[1].classList.add('panel-img--second');
    if (arr[2]) arr[2].classList.add('panel-img--third');
    const holder = arr[0]?.closest('.panel-figure');
    if (holder) holder.classList.add('panel-figure--circular');
  }

  function initScrollVideoAndProgress() {
    const video = document.querySelector(SELECTORS.video);
    if (!video) return;

    video.controls = false;
    video.muted = true;
    video.preload = 'auto';
    video.pause();

    const onLoaded = () => {
      state.videoDuration = video.duration || 0;
      // If start already happened, play
      if (state.started && !state.reducedMotion) {
        video.play().catch(() => {});
      }
      // Kick off a video update
      const scrolly = document.querySelector(SELECTORS.scrolly);
      if (!scrolly) return;
      const rect = scrolly.getBoundingClientRect();
      const progress = clamp01((-rect.top) / (rect.height - window.innerHeight));
      updateVideoPlayback(progress);
      updateProgressBar(progress);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    state.handlers.loadedmetadata = onLoaded;
    if (video.readyState >= 1) onLoaded();
  }

  function initPanels() {
    const panels = Array.from(document.querySelectorAll(SELECTORS.panels));
    const pageEl = document.querySelector(SELECTORS.pageIndex);
    const scrollyContainer = document.querySelector(SELECTORS.scrolly);
    const videoContainer = document.querySelector(SELECTORS.videoContainer);
    if (!panels.length || !scrollyContainer || !videoContainer) return;

    panels.forEach(p => { if (!p.hasAttribute('tabindex')) p.tabIndex = 0; });

    const updateState = () => {
      const rect = scrollyContainer.getBoundingClientRect();
      const progress = clamp01((-rect.top) / (rect.height - window.innerHeight));
      updateProgressBar(progress);

      const activePanel = getActivePanel();
      panels.forEach(p => p.classList.remove('active'));
      if (activePanel) {
        activePanel.classList.add('active');
        const idx = panels.indexOf(activePanel);
        state.currentPanelIndex = idx;

        if (pageEl) {
          pageEl.textContent = `Page | ${String(idx + 1).padStart(2, '0')}`;
        }

        const filter = activePanel.dataset.bgFilter || 'none';
        videoContainer.className = 'scrolly-video';
        if (filter !== 'none') {
          videoContainer.classList.add(filter);
        }

        const counter = activePanel.querySelector(SELECTORS.animatedCount);
        if (counter && !counter.classList.contains('counted')) {
          animateNumber(counter, parseInt(counter.dataset.countTarget || '0', 10));
          counter.classList.add('counted');
        }

        if (state.started) runPanelEffect(activePanel);
      } else {
        videoContainer.className = 'scrolly-video';
      }

      updateVideoPlayback(progress);
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.transitionDuration = e.target.dataset.animDuration || '0.4s';
          if (state.started) runPanelEffect(e.target);
          observer.unobserve(e.target);
        }
      });
    }, { root: null, threshold: 0.2 });
    panels.forEach(p => observer.observe(p));
    state.observer = observer;

    const throttledUpdate = () => {
      if (state.ticking) return;
      state.ticking = true;
      requestAnimationFrame(() => { updateState(); state.ticking = false; });
    };

    window.addEventListener('scroll', throttledUpdate, { passive: true });
    window.addEventListener('resize', throttledUpdate);
    state.handlers.scroll = throttledUpdate;
    state.handlers.resize = throttledUpdate;

    throttledUpdate();
  }

  function getActivePanel() {
    const panels = Array.from(document.querySelectorAll(SELECTORS.panels));
    const mid = window.innerHeight * 0.5;
    return panels.find(p => {
      const r = p.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    }) || null;
  }

  function updateVideoPlayback(progress) {
    const video = document.querySelector(SELECTORS.video);
    if (!video || !state.videoDuration || state.reducedMotion) return;
    const now = performance.now();
    if (now - lastVideoUpdateTime < 50) return;  // throttle to ~ every 50ms
    lastVideoUpdateTime = now;
    const clamped = clamp01(progress);
    const t = clamped * state.videoDuration;
    if (Math.abs(video.currentTime - t) > 0.05) {
      video.currentTime = t;
    }
  }

  function updateProgressBar(progress) {
    const bar = document.querySelector(SELECTORS.progressBar);
    if (!bar) return;
    const width = Math.round(clamp01(progress) * 100);
    bar.style.width = `${width}%`;
    bar.setAttribute('aria-valuenow', String(width));
  }

  function runPanelEffect(panel) {
    if (!panel) return;
    if (state.reducedMotion) return;

    const title = panel.querySelector('.panel-title');
    const texts = panel.querySelectorAll('.panel-text, .panel-list');
    const figs = panel.querySelectorAll('.panel-figure');

    const gap = cssMs(panel, '--panel-phase-gap', 120);
    const titleDur = cssMs(panel, '--panel-phase-title', 360);
    const mediaDur = cssMs(panel, '--panel-phase-media', 420);
    const textDur = cssMs(panel, '--panel-phase-text', 460);

    if (title) {
      title.style.setProperty('--fx-duration', `${titleDur}ms`);
      title.classList.add('fx--run');
    }

    figs.forEach((f, i) => {
      f.style.setProperty('--fx-delay', `${titleDur + gap + i * 60}ms`);
      f.style.setProperty('--fx-duration', `${mediaDur}ms`);
      f.classList.add('fx--run');
    });

    texts.forEach((t, i) => {
      const base = titleDur + gap + mediaDur + gap;
      t.style.setProperty('--fx-delay', `${base + i * 80}ms`);
      t.style.setProperty('--fx-duration', `${textDur}ms`);
      t.classList.add('fx--run');
    });

    if (panel.classList.contains('has-split-2')) {
      const left = panel.querySelector('.media-left');
      const right = panel.querySelector('.media-right');
      if (left) left.classList.add('fx-media--from-left');
      if (right) right.classList.add('fx-media--from-right');
    }
  }

  function animateNumber(element, target) {
    if (state.reducedMotion) {
      element.textContent = String(target);
      return;
    }
    const start = parseInt(element.textContent || '0', 10) || 0;
    const duration = 1500;
    let startTs = null;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      element.textContent = String(Math.floor(p * (target - start) + start));
      if (p < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  function enableAutoPlay() {
    const controls = document.querySelector(SELECTORS.navigationControls);
    if (controls) controls.classList.add('visible');
    if (state.autoPlayEnabled || state.reducedMotion) return;
    state.autoPlayEnabled = true;
    goToPanel(0);
  }

  function goToPanel(index) {
    const panels = Array.from(document.querySelectorAll(SELECTORS.panels));
    if (!panels.length) return;
    const clamped = Math.max(0, Math.min(index, panels.length - 1));
    state.currentPanelIndex = clamped;
    const targetPanel = panels[clamped];

    try {
      targetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      targetPanel.scrollIntoView(true);
    }

    panels.forEach(p => p.classList.remove('active'));
    targetPanel.classList.add('active');

    const pageEl = document.querySelector(SELECTORS.pageIndex);
    if (pageEl) {
      pageEl.textContent = `Page | ${String(clamped + 1).padStart(2, '0')}`;
    }

    const video = document.querySelector(SELECTORS.video);
    if (video && state.videoDuration && !state.reducedMotion) {
      const progress = clamped / (panels.length - 1);
      const t = progress * state.videoDuration;
      if (Math.abs(video.currentTime - t) > 0.05) {
        video.currentTime = t;
      }
      video.play().catch(() => {});
    }

    const counter = targetPanel.querySelector(SELECTORS.animatedCount);
    if (counter && !counter.classList.contains('counted')) {
      animateNumber(counter, parseInt(counter.dataset.countTarget || '0', 10));
      counter.classList.add('counted');
    }

    if (state.autoPlayEnabled && clamped < panels.length - 1) {
      if (state.autoAdvanceTimer) clearTimeout(state.autoAdvanceTimer);

      const customDelayVal = parseInt(targetPanel.dataset.panelDelay, 10);
      let delay;

      if (!isNaN(customDelayVal) && customDelayVal > 0) {
        delay = customDelayVal;
      } else {
        const textEls = targetPanel.querySelectorAll('.panel-text, .panel-list');
        let wordCount = 0;
        textEls.forEach(el => {
          const txt = el.textContent || '';
          wordCount += txt.trim().split(/\s+/).length;
        });

        const timeSlow = (wordCount / READING_SPEED.slow) * 60000;
        const timeFast = (wordCount / READING_SPEED.fast) * 60000;
        delay = (timeSlow + timeFast) / 2;
        delay = Math.max(DELAY_BOUNDS.min, Math.min(DELAY_BOUNDS.max, delay));
      }

      state.autoAdvanceTimer = setTimeout(() => goToPanel(clamped + 1), delay);
    }
  }

  function initNavigationControls() {
    const nextBtn = document.querySelector(SELECTORS.nextButton);
    const prevBtn = document.querySelector(SELECTORS.prevButton);
    if (nextBtn) nextBtn.addEventListener('click', () => { if (state.started) goToPanel(state.currentPanelIndex + 1); });
    if (prevBtn) prevBtn.addEventListener('click', () => { if (state.started) goToPanel(state.currentPanelIndex - 1); });

    const keyHandler = (e) => {
      if (!state.started) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPanel(state.currentPanelIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPanel(state.currentPanelIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPanel(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPanel(state.totalPanels - 1);
      }
      if (state.autoAdvanceTimer) {
        clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
      }
    };
    document.addEventListener('keydown', keyHandler);
    state.handlers.keydown = keyHandler;
  }

  function cleanup() {
    state.animationDisposers.forEach(fn => { try { fn(); } catch { } });
    state.animationDisposers = [];
    if (state.autoAdvanceTimer) clearTimeout(state.autoAdvanceTimer);
    if (state.handlers.keydown) document.removeEventListener('keydown', state.handlers.keydown);
    if (state.handlers.scroll) window.removeEventListener('scroll', state.handlers.scroll);
    if (state.handlers.resize) window.removeEventListener('resize', state.handlers.resize);
    const video = document.querySelector(SELECTORS.video);
    if (video && state.handlers.loadedmetadata) video.removeEventListener('loadedmetadata', state.handlers.loadedmetadata);
    if (state.observer) { try { state.observer.disconnect(); } catch { } state.observer = null; }
  }

  function boot() {
    forceUnpauseHero();
    init();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    queueMicrotask(boot);
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }

  return { cleanup };
}
