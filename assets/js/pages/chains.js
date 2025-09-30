/* =======================================================================================
   1807 — CHAINS PAGE JS (ES MODULE, DEDICATED, SCOPED)
   Improved to ensure button functionality on desktop and mobile, with robust event handling,
   optimized transforms, and enhanced accessibility.
   ======================================================================================= */

(function () {
  const root = document.documentElement;
  if (root.getAttribute('data-page') !== 'chains') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------
     STATE
  ----------------------------------------- */
  const state = {
    // carousel
    index: 0,
    timer: null,
    view: null,
    viewport: null,
    track: null,
    slides: [],
    dots: [],
    prevBtn: null,
    nextBtn: null,
    announcerEl: null,
    autoplayMs: 6000,
    autoplayEnabled: true,
    // swipe
    dragging: false,
    startX: 0,
    currentTranslate: 0,
    // typewriter
    tw: {
      el: null,
      phrases: [],
      iPhrase: 0,
      iChar: 0,
      typing: true,
      timer: null,
      pauseMs: 1200,
      typeMs: 55,
      eraseMs: 28,
      colors: [
        "#60a5fa", // blue-400
        "#93c5fd", // blue-300
        "#2563eb", // blue-600
        "#b68b4c", // tan-600
        "#d6a76a", // tan-500
        "#f5e9da"  // tan-100
      ],
      prevColor: null
    }
  };

  /* -----------------------------------------
     UTILITIES
  ----------------------------------------- */
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const parsePhrases = (el) => {
    if (!el) return null;
    const raw = el.getAttribute('data-phrases');
    if (!raw) return null;
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr.map(String) : null;
    } catch {
      try {
        const sanitized = raw.replace(/’|‘/g, "'").replace(/“|”/g, '"');
        const arr = JSON.parse(sanitized);
        return Array.isArray(arr) && arr.length ? arr.map(String) : null;
      } catch {
        return null;
      }
    }
  };

  const isLunaAnchor = (hash) => /^luna-from-(tcs|chainpad)$/i.test(hash || "");

  const getSlideWidth = () => {
    const first = state.slides[0];
    if (!first) return 0;
    const style = getComputedStyle(state.track);
    const gap = parseFloat(style.gap || 0);
    const width = first.getBoundingClientRect().width;
    return width + gap;
  };

  // Debounce utility for resize events
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  /* -----------------------------------------
     TYPEWRITER (per-character transient color)
  ----------------------------------------- */
  function startTypewriterRotate() {
    state.tw.el = document.getElementById("subtitle-rotator");
    if (!state.tw.el) return;

    // Reduced motion: show first phrase only
    if (prefersReducedMotion) {
      const list = parsePhrases(state.tw.el);
      state.tw.el.textContent = (list && list[0]) || state.tw.el.textContent.trim();
      return;
    }

    let phrases = parsePhrases(state.tw.el);
    if (!phrases || !phrases.length) {
      const fallback = state.tw.el.textContent.trim();
      phrases = fallback ? [fallback] : [];
    }
    state.tw.phrases = phrases;

    state.tw.el.textContent = "";
    const line = document.createElement("span");
    line.className = "tw-line";
    line.style.display = "inline-block"; // Ensure horizontal layout
    line.style.whiteSpace = "nowrap"; // Prevent wrapping
    state.tw.el.appendChild(line);

    state.tw.iPhrase = 0;
    state.tw.iChar = 0;
    state.tw.typing = true;

    loopTypewriter();
  }

  function stopTypewriterRotate() {
    if (state.tw.timer) {
      clearTimeout(state.tw.timer);
      state.tw.timer = null;
    }
  }

  function loopTypewriter() {
    const el = state.tw.el;
    if (!el) return;

    const line = el.querySelector(".tw-line");
    if (!line) return;

    const phrase = state.tw.phrases[state.tw.iPhrase] || "";

    if (state.tw.typing) {
      if (state.tw.iChar < phrase.length) {
        const ch = phrase[state.tw.iChar];
        const span = document.createElement("span");
        span.className = "tw-char is-typing";
        span.style.color = pickTypingColor();
        span.textContent = ch;
        line.appendChild(span);

        const prev = line.children[line.children.length - 2];
        if (prev && prev.classList.contains("tw-char")) {
          prev.classList.remove("is-typing");
          prev.style.color = ""; // Revert to inherited color
        }

        state.tw.iChar++;
        state.tw.timer = setTimeout(loopTypewriter, state.tw.typeMs);
        return;
      }
      // Finished typing current phrase
      const last = line.children[line.children.length - 1];
      if (last) last.classList.remove("is-typing");
      state.tw.typing = false;
      state.tw.timer = setTimeout(loopTypewriter, state.tw.pauseMs);
      return;
    } else {
      // Erasing
      if (state.tw.iChar > 0) {
        line.removeChild(line.lastChild);
        state.tw.iChar--;
        state.tw.timer = setTimeout(loopTypewriter, state.tw.eraseMs);
        return;
      }
      // Next phrase
      state.tw.typing = true;
      state.tw.iPhrase = (state.tw.iPhrase + 1) % state.tw.phrases.length;
      state.tw.timer = setTimeout(loopTypewriter, state.tw.typeMs);
    }
  }

  function pickTypingColor() {
    const pool = state.tw.colors.filter(c => c !== state.tw.prevColor);
    const choice = pool[Math.floor(Math.random() * pool.length)] || state.tw.colors[0];
    state.tw.prevColor = choice;
    return choice;
  }

  /* -----------------------------------------
     CAROUSEL
  ----------------------------------------- */
  function initCarousel() {
    state.view = document.querySelector('main .view.projects');
    if (!state.view) {
      console.warn('Carousel view not found');
      return;
    }

    state.viewport = state.view.querySelector('.carousel-viewport');
    state.track = state.view.querySelector('.carousel-track');
    state.slides = Array.from(state.view.querySelectorAll('.carousel-slide'));
    state.prevBtn = state.view.querySelector('.carousel-prev');
    state.nextBtn = state.view.querySelector('.carousel-next');
    state.dots = Array.from(state.view.querySelectorAll('.carousel-dot'));
    state.announcerEl = state.view.querySelector('#carousel-announcer') || document.getElementById('carousel-announcer');

    if (!state.announcerEl) {
      state.announcerEl = document.createElement('div');
      state.announcerEl.id = 'carousel-announcer';
      state.announcerEl.className = 'sr-only';
      state.announcerEl.setAttribute('aria-live', 'polite');
      state.announcerEl.setAttribute('aria-atomic', 'true');
      document.body.appendChild(state.announcerEl);
    }

    if (!state.viewport || !state.track || !state.slides.length) {
      console.warn('Carousel initialization failed: missing viewport, track, or slides');
      return;
    }

    // Ensure buttons are focusable and clickable
    [state.prevBtn, state.nextBtn, ...state.dots].forEach(btn => {
      if (btn) {
        btn.style.pointerEvents = 'auto'; // Ensure buttons are clickable
        btn.style.userSelect = 'none'; // Prevent text selection
        btn.setAttribute('tabindex', '0'); // Ensure focusable
      }
    });

    // initial index: hash > session > 0
    const storageKey = 'chains.carousel.index';

    const slideIndexForKey = (key) => {
      if (!key) return null;
      const normalized = isLunaAnchor(key) ? 'luna' : key;
      const el = state.view.querySelector(`[data-hash="${CSS.escape(normalized)}"]`);
      if (!el) return null;
      const idx = state.slides.findIndex(li => li === el);
      return idx >= 0 ? idx : null;
    };

    const hashKey = (location.hash || '').replace(/^#/, '');
    const fromHash = slideIndexForKey(hashKey);
    const saved = Number(sessionStorage.getItem(storageKey));
    state.index = clamp(fromHash ?? (Number.isFinite(saved) ? saved : 0), 0, state.slides.length - 1);

    const setTransform = (i, immediate = false) => {
      const w = getSlideWidth();
      if (w === 0) return; // Prevent invalid transforms
      state.currentTranslate = -i * w;
      state.track.style.transition = immediate || prefersReducedMotion ? 'none' : 'transform 450ms ease';
      state.track.style.transform = `translate3d(${state.currentTranslate}px, 0, 0)`;
      state.viewport.setAttribute('aria-label', `Blockchain modules (slide ${i + 1} of ${state.slides.length})`);
    };

    const updateDots = (i) => {
      state.dots.forEach((d, k) => {
        const sel = k === i;
        d.setAttribute('aria-selected', String(sel));
        d.setAttribute('tabindex', sel ? '0' : '-1');
      });
    };

    const updateHash = (i, hashOverride) => {
      const nextHash = hashOverride ||
        state.slides[i]?.getAttribute('data-hash') ||
        state.slides[i]?.id || '';
      if (!nextHash) return;
      history.replaceState(null, '', `#${nextHash}`);
    };

    const announce = (i) => {
      if (!state.announcerEl) return;
      const label = state.slides[i]?.getAttribute('aria-label') || `Slide ${i + 1}`;
      state.announcerEl.textContent = `Viewing ${label}`;
    };

    const goTo = (i, { user = false, suppressHash = false, hashOverride = null, immediate = false } = {}) => {
      state.index = clamp(i, 0, state.slides.length - 1);
      sessionStorage.setItem(storageKey, String(state.index));
      setTransform(state.index, immediate);
      updateDots(state.index);
      if (!suppressHash) updateHash(state.index, hashOverride);
      announce(state.index);
      state.slides.forEach((li, k) => li.setAttribute('aria-label', `${k + 1} of ${state.slides.length}`));
      if (user) stopAutoplay();
    };

    const ready = () => goTo(state.index, { immediate: true });
    if (document.readyState === 'complete') setTimeout(ready, 0);
    else window.addEventListener('load', ready, { once: true });

    // Controls
    const handleButtonClick = (direction) => {
      const nextIndex = direction === 'prev' ? state.index - 1 : state.index + 1;
      goTo(nextIndex, { user: true });
    };

    if (state.prevBtn) {
      state.prevBtn.addEventListener('click', () => handleButtonClick('prev'), { passive: false });
      state.prevBtn.addEventListener('mousedown', (e) => e.preventDefault(), { passive: false }); // Prevent focus issues
    }
    if (state.nextBtn) {
      state.nextBtn.addEventListener('click', () => handleButtonClick('next'), { passive: false });
      state.nextBtn.addEventListener('mousedown', (e) => e.preventDefault(), { passive: false });
    }

    state.dots.forEach((dot, k) => {
      dot.addEventListener('click', () => goTo(k, { user: true }), { passive: false });
      dot.addEventListener('mousedown', (e) => e.preventDefault(), { passive: false });
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goTo(k, { user: true });
        }
      });
    });

    // CTA buttons within project cards
    const ctaButtons = state.view.querySelectorAll('.hero-ctas .btn');
    ctaButtons.forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.userSelect = 'none';
      btn.setAttribute('tabindex', '0');
    });

    // Keyboard
    state.viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(state.index - 1, { user: true });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(state.index + 1, { user: true });
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0, { user: true });
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(state.slides.length - 1, { user: true });
      }
    });

    // Swipe
    state.viewport.addEventListener('pointerdown', (e) => {
      stopAutoplay();
      state.dragging = true;
      state.startX = e.clientX;
      state.track.style.transition = 'none';
      try {
        state.viewport.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('Pointer capture failed:', err);
      }
    });

    state.viewport.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.startX;
      state.track.style.transform = `translate3d(${state.currentTranslate + dx}px, 0, 0)`;
    });

    state.viewport.addEventListener('pointerup', (e) => {
      if (!state.dragging) return;
      state.dragging = false;
      try {
        state.viewport.releasePointerCapture(e.pointerId);
      } catch {}
      const dx = e.clientX - state.startX;
      const w = getSlideWidth();
      const threshold = w / 3;
      if (Math.abs(dx) > threshold) {
        const dir = dx < 0 ? 1 : -1;
        goTo(state.index + dir, { user: true });
      } else {
        setTransform(state.index);
        if (state.autoplayEnabled && !prefersReducedMotion) startAutoplay();
      }
    });

    state.viewport.addEventListener('pointercancel', () => {
      if (!state.dragging) return;
      state.dragging = false;
      setTransform(state.index);
      if (state.autoplayEnabled && !prefersReducedMotion) startAutoplay();
    });

    // Anchor navigation interception
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.stopPropagation(); // Prevent parent interference
      console.log('Anchor clicked:', a.getAttribute('href')); // Debug
      const targetId = a.getAttribute('href').replace(/^#/, '');
      if (!targetId) return;

      if (isLunaAnchor(targetId)) {
        e.preventDefault();
        const lunaIdx = slideIndexForKey('luna');
        if (lunaIdx !== null) {
          goTo(lunaIdx, { user: true, suppressHash: true });
          history.replaceState(null, '', `#${targetId}`);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
          }
        }
        return;
      }

      const idx = slideIndexForKey(targetId);
      if (idx !== null) {
        goTo(idx, { user: true, hashOverride: targetId });
      }
    });

    // Hash navigation
    window.addEventListener('hashchange', () => {
      const key = (location.hash || '').replace(/^#/, '');
      if (!key) return;

      if (isLunaAnchor(key)) {
        const lunaIdx = slideIndexForKey('luna');
        if (lunaIdx !== null) {
          goTo(lunaIdx, { user: true, suppressHash: true });
          const targetEl = document.getElementById(key);
          if (targetEl) targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
        return;
      }

      const hIdx = slideIndexForKey(key);
      if (hIdx !== null) goTo(hIdx, { user: true, hashOverride: key });
    });

    // Debounced resize handler
    const handleResize = debounce(() => setTransform(state.index), 100);
    window.addEventListener('resize', handleResize, { passive: true });

    // Autoplay
    function startAutoplay() {
      if (prefersReducedMotion || !state.autoplayEnabled) return;
      stopAutoplay();
      state.timer = window.setInterval(() => {
        const next = (state.index + 1) % state.slides.length;
        goTo(next);
      }, state.autoplayMs);
    }

    function stopAutoplay() {
      if (state.timer) window.clearInterval(state.timer);
      state.timer = null;
    }

    // Autoplay control
    if (!prefersReducedMotion && state.autoplayEnabled) startAutoplay();
    state.viewport.addEventListener('mouseenter', stopAutoplay, { passive: true });
    state.viewport.addEventListener('mouseleave', startAutoplay, { passive: true });
    state.viewport.addEventListener('focusin', stopAutoplay);
    state.viewport.addEventListener('focusout', startAutoplay);

    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });
  }

  /* -----------------------------------------
     BOOT
  ----------------------------------------- */
  function mount() {
    initCarousel();
    startTypewriterRotate();

    const key = (location.hash || '').replace(/^#/, '');
    if (isLunaAnchor(key)) {
      const lunaSlide = document.querySelector('[data-hash="luna"]');
      if (lunaSlide) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
  }

  function cleanup() {
    stopTypewriterRotate();
    if (state.announcerEl && state.announcerEl.parentNode === document.body) {
      document.body.removeChild(state.announcerEl);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  // Hot-reload guard
  try {
    if (import.meta && import.meta.hot) {
      import.meta.hot.dispose(() => cleanup());
    }
  } catch { /* no-op */ }
})();