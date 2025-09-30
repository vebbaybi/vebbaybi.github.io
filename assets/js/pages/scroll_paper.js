/* =======================================================================================
   SCROLL_PAPER.JS (ES MODULE, DEDICATED, SCOPED)
   Carousel + typewriter for scroll_paper.html, with hardened CTA/anchor behavior.
   ======================================================================================= */

(function () {
  const root = document.documentElement;
  if (root.getAttribute('data-page') !== 'scroll_paper') return;

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------
     STATE
  ----------------------------------------- */
  const state = {
    // Carousel
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
    // Swipe
    dragging: false,
    startX: 0,
    currentTranslate: 0,
    // Typewriter
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
      colors: ["#60a5fa","#93c5fd","#2563eb","#b68b4c","#d6a76a","#f5e9da"],
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
        // Fallback: split on linebreaks if someone pasted plain lines
        const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
        return lines.length ? lines : null;
      }
    }
  };

  const getSlideWidth = () => {
    const first = state.slides[0];
    if (!first || !state.track) return 0;
    const styles = getComputedStyle(state.track);
    // gap can be declared as gap/column-gap
    const gap =
      parseFloat(styles.gap || styles.columnGap || '0') || 0;
    const width = first.getBoundingClientRect().width;
    return width + gap;
  };

  const debounce = (fn, wait = 100) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // Helper available everywhere (used by mount + handlers)
  function slideIndexForKey(key) {
    if (!key || !state.view) return null;
    const el = state.view.querySelector(`[data-hash="${CSS.escape(key)}"]`);
    if (!el) return null;
    const idx = state.slides.findIndex(li => li === el);
    return idx >= 0 ? idx : null;
  }

  /* -----------------------------------------
     TYPEWRITER
  ----------------------------------------- */
  function startTypewriterRotate() {
    state.tw.el = document.getElementById("subtitle-rotator");
    if (!state.tw.el) return;

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
    line.style.display = "inline-block";
    line.style.whiteSpace = "nowrap";
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
          prev.style.color = "";
        }

        state.tw.iChar++;
        state.tw.timer = setTimeout(loopTypewriter, state.tw.typeMs);
        return;
      }
      const last = line.children[line.children.length - 1];
      if (last) last.classList.remove("is-typing");
      state.tw.typing = false;
      state.tw.timer = setTimeout(loopTypewriter, state.tw.pauseMs);
      return;
    } else {
      if (state.tw.iChar > 0) {
        line.removeChild(line.lastChild);
        state.tw.iChar--;
        state.tw.timer = setTimeout(loopTypewriter, state.tw.eraseMs);
        return;
      }
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

  /* animate counter */
  function animateCounters() {
    const counters = document.querySelectorAll('[data-counter="true"]');
    const duration = 2000; // milliseconds

    counters.forEach((counter) => {
      const target = +counter.getAttribute('data-count-target'); // Convert to number
      let current = 0;
      const startTime = performance.now();

      function step(currentTime) {
        const elapsed = currentTime - startTime;
        current = Math.min(target, (elapsed / duration) * target);
        counter.textContent = Math.ceil(current);
        if (current < target) {
          requestAnimationFrame(step);
        } else {
          counter.textContent = target; // Ensure exact final value
        }
      }

      requestAnimationFrame(step);
    });
  }
  document.addEventListener('DOMContentLoaded', animateCounters);

  /* -----------------------------------------
     CAROUSEL
  ----------------------------------------- */
  function initCarousel() {
    state.view = document.querySelector('main .view.story');
    if (!state.view) return;

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

    if (!state.viewport || !state.track || !state.slides.length) return;

    // Make controls/dots reliably interactive
    [state.prevBtn, state.nextBtn, ...state.dots].forEach(btn => {
      if (btn) {
        btn.style.pointerEvents = 'auto';
        btn.style.userSelect = 'none';
        btn.setAttribute('tabindex', '0');
      }
    });

    // Prevent ghost image drags stealing clicks
    state.view.querySelectorAll('img').forEach(img => {
      img.addEventListener('dragstart', e => e.preventDefault());
    });

    // Initial index (hash > session > 0)
    const storageKey = 'scroll_paper.carousel.index';
    const hashKey = (location.hash || '').replace(/^#/, '');
    const fromHash = slideIndexForKey(hashKey);
    const saved = Number(sessionStorage.getItem(storageKey));
    state.index = clamp(fromHash ?? (Number.isFinite(saved) ? saved : 0), 0, state.slides.length - 1);

    const setTransform = (i, immediate = false) => {
      const w = getSlideWidth();
      if (w === 0) return;
      state.currentTranslate = -i * w;
      state.track.style.transition = (immediate || prefersReducedMotion) ? 'none' : 'transform 450ms ease';
      state.track.style.transform = `translate3d(${state.currentTranslate}px, 0, 0)`;
      state.viewport.setAttribute('aria-label', `Story chapters (slide ${i + 1} of ${state.slides.length})`);
    };

    const updateDots = (i, focusDot = false) => {
      state.dots.forEach((d, k) => {
        const sel = k === i;
        d.setAttribute('aria-selected', String(sel));
        d.setAttribute('tabindex', sel ? '0' : '-1');
        if (focusDot && sel) d.focus({ preventScroll: true });
      });
    };

    const updateHash = (i, hashOverride) => {
      const nextHash =
        hashOverride ||
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
      updateDots(state.index, user);
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
      goTo(direction === 'prev' ? state.index - 1 : state.index + 1, { user: true });
    };
    state.prevBtn?.addEventListener('click', () => handleButtonClick('prev'));
    state.nextBtn?.addEventListener('click', () => handleButtonClick('next'));

    // Dots
    state.dots.forEach((dot, k) => {
      dot.addEventListener('click', () => goTo(k, { user: true }));
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goTo(k, { user: true });
        }
      });
    });

    // CTA buttons (ensure clickability)
    state.view.querySelectorAll('.hero-ctas .btn').forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.userSelect = 'none';
      btn.setAttribute('tabindex', '0');
    });

    // Keyboard on viewport
    state.viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(state.index - 1, { user: true }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(state.index + 1, { user: true }); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0, { user: true }); }
      else if (e.key === 'End') { e.preventDefault(); goTo(state.slides.length - 1, { user: true }); }
    });

    // Guard: don't start drag if clicking interactive elements
    const isInteractive = (el) => !!el.closest('a, button, input, textarea, select, [role="button"], [role="link"]');

    // Swipe
    state.viewport.addEventListener('pointerdown', (e) => {
      if (isInteractive(e.target)) return; // let buttons/links work
      stopAutoplay();
      state.dragging = true;
      state.startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      state.track.style.transition = 'none';
      try { state.viewport.setPointerCapture(e.pointerId); } catch {}
    });

    state.viewport.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - state.startX;
      state.track.style.transform = `translate3d(${state.currentTranslate + dx}px, 0, 0)`;
    });

    const endDrag = (clientX, pointerId) => {
      if (!state.dragging) return;
      state.dragging = false;
      try { if (pointerId != null) state.viewport.releasePointerCapture(pointerId); } catch {}
      const dx = clientX - state.startX;
      const w = getSlideWidth();
      const threshold = w / 3;
      if (Math.abs(dx) > threshold) {
        goTo(state.index + (dx < 0 ? 1 : -1), { user: true });
      } else {
        setTransform(state.index);
        if (state.autoplayEnabled && !prefersReducedMotion) startAutoplay();
      }
    };

    state.viewport.addEventListener('pointerup', (e) => endDrag(e.clientX ?? 0, e.pointerId));
    state.viewport.addEventListener('pointercancel', () => {
      if (!state.dragging) return;
      state.dragging = false;
      setTransform(state.index);
      if (state.autoplayEnabled && !prefersReducedMotion) startAutoplay();
    });

    // Anchor navigation (Overview/Continue Reading)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const targetId = a.getAttribute('href').replace(/^#/, '');
      if (!targetId) return;

      const idx = slideIndexForKey(targetId);
      if (idx !== null) {
        e.preventDefault();
        goTo(idx, { user: true, hashOverride: targetId });
        return;
      }

      const section = document.getElementById(targetId);
      if (section) {
        e.preventDefault();
        section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', `#${targetId}`);
      }
    });

    // Hash navigation
    window.addEventListener('hashchange', () => {
      const key = (location.hash || '').replace(/^#/, '');
      if (!key) return;

      const idx = slideIndexForKey(key);
      if (idx !== null) {
        goTo(idx, { user: true, hashOverride: key });
        return;
      }
      const targetEl = document.getElementById(key);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });

    // Debounced resize -> keep transform accurate
    const handleResize = debounce(() => setTransform(state.index), 120);
    window.addEventListener('resize', handleResize, { passive: true });

    // Autoplay
    function startAutoplay() {
      if (prefersReducedMotion || !state.autoplayEnabled) return;
      stopAutoplay();
      state.timer = setInterval(() => {
        const next = (state.index + 1) % state.slides.length;
        goTo(next);
      }, state.autoplayMs);
    }
    function stopAutoplay() {
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
    }

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

    // Respect initial hash (slide or detail section)
    const key = (location.hash || '').replace(/^#/, '');
    if (key) {
      const idx = slideIndexForKey(key);
      if (idx !== null) {
        // trigger same logic as user nav without animation during first paint
        const w = getSlideWidth();
        if (w) {
          // set instantly to correct position then update hash once
          const track = state.track;
          track.style.transition = 'none';
          state.index = idx;
          state.currentTranslate = -idx * w;
          track.style.transform = `translate3d(${state.currentTranslate}px,0,0)`;
          history.replaceState(null, '', `#${key}`);
        }
      } else {
        const targetEl = document.getElementById(key);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
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