// assets/js/pages/construction.js

/* =============================================================================
   CONSTRUCTION PAGE (SCOPED, NO GLOBAL LEAKS)
   Carousel + subtitle typewriter with robust a11y, swipe, hash sync,
   and adaptive dots: slides on mobile (1-up), pages on tablet/desktop.

   This build fixes desktop click-through on slide anchors by deferring
   pointer capture until a swipe is confirmed (beyond a small deadzone).
   ============================================================================ */

(() => {
  const root = document.documentElement;
  if (root.getAttribute('data-page') !== 'construction') return;

  /* ------------------------- FLAGS / CONSTS ------------------------- */
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO_DELAY = 5000; // ms
  const STORAGE_KEY = 'construction.carousel.index';

  /* ------------------------- DOM LOOKUPS ---------------------------- */
  const page = document.querySelector('main .view.story');
  if (!page) return;

  const carousel = page.querySelector('.carousel');
  const viewport = carousel?.querySelector('.carousel-viewport');
  const track = carousel?.querySelector('.carousel-track');
  const slides = track ? Array.from(track.querySelectorAll('.carousel-slide')) : [];
  const prevBtn = carousel?.querySelector('.carousel-prev');
  const nextBtn = carousel?.querySelector('.carousel-next');
  const dotsWrap = carousel?.querySelector('.carousel-pagination');
  const subtitle = document.getElementById('subtitle-rotator');

  // Live region announcer (SR)
  let announcer = document.getElementById('carousel-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'carousel-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }

  /* ------------------------- STATE ---------------------------- */
  let slidesPerView = 1;
  let pageIndex = 0;              // current page (tablet/desktop) or the slide index on mobile
  let pageCount = 0;
  let autoTimer = null;
  let maxTranslatePx = 0;         // clamp to prevent blank overscroll

  // swipe
  let dragging = false;
  let startX = 0;
  let deltaX = 0;

  // click suppression after a real swipe to avoid accidental anchor nav
  let suppressNextClick = false;

  // cache
  const SLIDE_COUNT = slides.length;

  /* ------------------------- UTIL ------------------------------ */
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const getCurrentTranslateX = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const parts = m[1].split(',').map(parseFloat);
    return parts[4] || 0; // tx
  };

  // Use layout offsets only; do NOT subtract current transform
  const slideOffsetLeftPx = (idx) => {
    const first = slides[0];
    const slide = slides[idx];
    if (!first || !slide) return 0;
    return Math.max(0, slide.offsetLeft - first.offsetLeft);
  };

  const computeSlidesPerView = () => {
    const w = window.innerWidth;
    if (w >= 1100) return 3;
    if (w >= 640) return 2;
    return 1;
  };

  const computeMaxTranslatePx = () => {
    if (!track || !viewport) return 0;
    const total = track.scrollWidth;
    const vis = viewport.clientWidth;
    return Math.max(0, total - vis);
  };

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

  const indexFromHash = () => {
    const h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    const el = page.querySelector(`[data-hash="${CSS.escape(h)}"]`);
    if (!el) return null;
    const idx = slides.findIndex((li) => li === el);
    return idx >= 0 ? idx : null;
  };

  const indexFromHashString = (h) => {
    const el = page.querySelector(`[data-hash="${CSS.escape(h)}"]`);
    if (!el) return null;
    const idx = slides.findIndex((li) => li === el);
    return idx >= 0 ? idx : null;
  };

  const announce = (msg) => { if (announcer) announcer.textContent = msg; };

  /* ------------------------- LAYOUT ---------------------------- */
  function computeLayout() {
    slidesPerView = computeSlidesPerView();
    pageCount = Math.max(1, Math.ceil(SLIDE_COUNT / slidesPerView));
    pageIndex = clamp(pageIndex, 0, pageCount - 1);

    // SR labels for slides
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${SLIDE_COUNT}`);
    });

    if (viewport) {
      viewport.setAttribute('tabindex', '0');
      viewport.setAttribute('aria-live', 'off');
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-roledescription', 'carousel');
    }

    maxTranslatePx = computeMaxTranslatePx();
  }

  /* ------------------------- DOTS ------------------------------ */
  function clearDots() {
    if (!dotsWrap) return;
    while (dotsWrap.firstChild) dotsWrap.removeChild(dotsWrap.firstChild);
  }

  function buildDots() {
    if (!dotsWrap) return;
    clearDots();

    const count = slidesPerView === 1 ? SLIDE_COUNT : pageCount;
    dotsWrap.setAttribute('role', 'tablist');

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute(
        'aria-label',
        slidesPerView === 1 ? `Slide ${i + 1} of ${SLIDE_COUNT}` : `Page ${i + 1} of ${pageCount}`
      );

      dot.addEventListener('click', () => {
        if (slidesPerView === 1) {
          gotoSlideIndex(i, { from: 'dot' });
        } else {
          snapToPage(i, { animate: true, from: 'dot' });
        }
      });

      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dot.click();
        }
      });

      dotsWrap.appendChild(dot);
    }
    updateDots();
  }

  function currentSlideIndexFromTransform() {
    const approxLeft = Math.abs(getCurrentTranslateX(track));
    let closestIdx = 0;
    let closestDelta = Infinity;
    for (let i = 0; i < SLIDE_COUNT; i++) {
      const off = slideOffsetLeftPx(i);
      const d = Math.abs(off - approxLeft);
      if (d < closestDelta) { closestDelta = d; closestIdx = i; }
    }
    return closestIdx;
  }

  function updateDots() {
    if (!dotsWrap) return;
    const dotNodes = Array.from(dotsWrap.querySelectorAll('.carousel-dot'));
    const activeIndex = slidesPerView === 1 ? currentSlideIndexFromTransform() : pageIndex;

    dotNodes.forEach((d, i) => {
      const selected = i === activeIndex;
      d.setAttribute('aria-selected', selected ? 'true' : 'false');
      d.setAttribute('tabindex', selected ? '0' : '-1');
      d.classList.toggle('active', selected);
    });
  }

  /* ------------------------- TRANSFORMS ------------------------- */
  function transformTo(px, animate = true) {
    const clampedPx = clamp(px, 0, maxTranslatePx);
    track.style.transition = animate && !REDUCED_MOTION ? 'transform 450ms ease' : 'none';
    track.style.transform = `translateX(-${clampedPx}px)`;
  }

  function pageFirstSlideIndex(pIndex) {
    return clamp(pIndex * slidesPerView, 0, SLIDE_COUNT - 1);
  }

  function snapToPage(pIndex, { animate = true, from = '' } = {}) {
    pageIndex = clamp(pIndex, 0, pageCount - 1);
    const firstIdx = pageFirstSlideIndex(pageIndex);
    const px = slideOffsetLeftPx(firstIdx);
    transformTo(px, animate);

    // buttons
    if (prevBtn && nextBtn) {
      if (slidesPerView === 1) {
        const curSlide = currentSlideIndexFromTransform();
        prevBtn.disabled = curSlide <= 0;
        nextBtn.disabled = curSlide >= SLIDE_COUNT - 1;
      } else {
        prevBtn.disabled = pageIndex === 0;
        nextBtn.disabled = pageIndex === pageCount - 1;
      }
    }

    updateDots();

    const hash = slides[firstIdx]?.dataset?.hash || slides[firstIdx]?.getAttribute('data-hash');
    if (hash && from !== 'anchor') history.replaceState(null, '', `#${hash}`);

    if (viewport) {
      viewport.setAttribute(
        'aria-label',
        slidesPerView === 1
          ? `Slide ${firstIdx + 1} of ${SLIDE_COUNT}`
          : `Page ${pageIndex + 1} of ${pageCount}`
      );
    }

    sessionStorage.setItem(STORAGE_KEY, String(firstIdx));
    if (from !== 'init') restartAuto();
    announce(
      slidesPerView === 1
        ? `Viewing slide ${firstIdx + 1} of ${SLIDE_COUNT}`
        : `Viewing page ${pageIndex + 1} of ${pageCount}`
    );
  }

  function gotoSlideIndex(slideIdx, { from = '' } = {}) {
    const clamped = clamp(slideIdx, 0, SLIDE_COUNT - 1);
    const px = slideOffsetLeftPx(clamped);
    transformTo(px, true);
    pageIndex = Math.floor(clamped / slidesPerView);
    updateDots();

    const hash = slides[clamped]?.dataset?.hash || slides[clamped]?.getAttribute('data-hash');
    if (hash && from !== 'anchor') history.replaceState(null, '', `#${hash}`);

    sessionStorage.setItem(STORAGE_KEY, String(clamped));
    if (prevBtn && nextBtn) {
      prevBtn.disabled = clamped <= 0;
      nextBtn.disabled = clamped >= SLIDE_COUNT - 1;
    }
    if (viewport) viewport.setAttribute('aria-label', `Slide ${clamped + 1} of ${SLIDE_COUNT}`);
    if (from !== 'init') restartAuto();
    announce(`Viewing slide ${clamped + 1} of ${SLIDE_COUNT}`);
  }

  /* ------------------------- NAV HANDLERS ------------------------ */
  const goPrev = () => {
    if (slidesPerView === 1) {
      const cur = currentSlideIndexFromTransform();
      gotoSlideIndex(cur - 1, { from: 'arrow' });
    } else {
      snapToPage(pageIndex - 1, { animate: true, from: 'arrow' });
    }
  };

  const goNext = () => {
    if (slidesPerView === 1) {
      const cur = currentSlideIndexFromTransform();
      gotoSlideIndex(cur + 1, { from: 'arrow' });
    } else {
      snapToPage(pageIndex + 1, { animate: true, from: 'arrow' });
    }
  };

  /* ------------------------- EVENTS ------------------------------ */
  function bindEvents() {
    // arrows
    if (prevBtn) {
      prevBtn.style.pointerEvents = 'auto';
      prevBtn.addEventListener('click', goPrev);
      prevBtn.addEventListener('mousedown', (e) => e.preventDefault());
    }
    if (nextBtn) {
      nextBtn.style.pointerEvents = 'auto';
      nextBtn.addEventListener('click', goNext);
      nextBtn.addEventListener('mousedown', (e) => e.preventDefault());
    }

    // keyboard
    if (viewport) {
      viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        if (e.key === 'Home') {
          e.preventDefault();
          slidesPerView === 1 ? gotoSlideIndex(0) : snapToPage(0, { animate: true });
        }
        if (e.key === 'End') {
          e.preventDefault();
          slidesPerView === 1 ? gotoSlideIndex(SLIDE_COUNT - 1) : snapToPage(pageCount - 1, { animate: true });
        }
      });
    }

    // pause on hover/focus
    ['mouseenter', 'focusin'].forEach((evt) => carousel.addEventListener(evt, pauseAuto, { passive: true }));
    ['mouseleave', 'focusout'].forEach((evt) => carousel.addEventListener(evt, resumeAuto, { passive: true }));

    // vis change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseAuto();
      else resumeAuto();
    });

    // resize (debounced): layout → dots (if mode changed) → snap (no anim)
    let rTO = null;
    window.addEventListener('resize', () => {
      clearTimeout(rTO);
      rTO = setTimeout(() => {
        const prevMode = slidesPerView;
        computeLayout();
        if (prevMode !== slidesPerView) buildDots();
        snapToPage(pageIndex, { animate: false, from: 'resize' });
      }, 150);
    }, { passive: true });

    // swipe
    if (viewport) enableSwipe(viewport);

    // hash navigation (carousel slides AND content sections)
    window.addEventListener('hashchange', () => {
      const h = (location.hash || '').replace(/^#/, '');
      if (!h) return;

      // If it's a section (detail) id, scroll to it and exit
      const section = document.getElementById(h);
      if (section && !slides.includes(section)) {
        section.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      // Otherwise, if it's a slide hash, move carousel
      const idx = indexFromHashString(h);
      if (idx != null) {
        slidesPerView === 1
          ? gotoSlideIndex(idx, { from: 'hash' })
          : snapToPage(Math.floor(idx / slidesPerView), { animate: true, from: 'hash' });
      }
    });

    // CAPTURE PHASE: intercept anchors and also suppress click right after a swipe
    document.addEventListener('click', (e) => {
      if (suppressNextClick && viewport && viewport.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
        return;
      }

      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').replace(/^#/, '');
      if (!id) return;

      // If target is a content section, update hash then smooth scroll (keep carousel state)
      const section = document.getElementById(id);
      if (section && !slides.includes(section)) {
        e.preventDefault();
        history.replaceState(null, '', `#${id}`);
        section.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      // If target maps to a slide hash, drive the carousel
      const idx = indexFromHashString(id);
      if (idx != null) {
        e.preventDefault();
        slidesPerView === 1
          ? gotoSlideIndex(idx, { from: 'anchor' })
          : snapToPage(Math.floor(idx / slidesPerView), { animate: true, from: 'anchor' });
      }
    }, true); // capture
  }

  /* ------------------------- AUTO ------------------------------- */
  function startAuto() {
    if (REDUCED_MOTION || autoTimer) return;
    autoTimer = setInterval(() => {
      if (slidesPerView === 1) {
        const cur = currentSlideIndexFromTransform();
        const next = (cur + 1) % SLIDE_COUNT;
        gotoSlideIndex(next, { from: 'auto' });
      } else {
        const nextPage = (pageIndex + 1) % pageCount;
        snapToPage(nextPage, { animate: true, from: 'auto' });
      }
    }, AUTO_DELAY);
  }

  function pauseAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  }

  function resumeAuto() {
    if (!REDUCED_MOTION && !autoTimer) startAuto();
  }

  function restartAuto() {
    pauseAuto();
    resumeAuto();
  }

  /* ------------------------- SWIPE ------------------------------ */
  function enableSwipe(el) {
    let isSwiping = false;
    let captured = false;
    let pointerId = null;
    const DEADZONE = 8; // px before considering it a swipe

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      isSwiping = false;
      captured = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      deltaX = 0;
      pauseAuto();
      track.style.transition = 'none'; // prep for potential swipe
      // IMPORTANT: do NOT setPointerCapture here — wait until > DEADZONE
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      deltaX = e.clientX - startX;

      // Promote to swipe once beyond deadzone
      if (!isSwiping && Math.abs(deltaX) > DEADZONE) {
        isSwiping = true;
        try { el.setPointerCapture(pointerId); captured = true; } catch {}
      }

      if (isSwiping) {
        const baseTX = Math.abs(getCurrentTranslateX(track));
        const previewPx = clamp(baseTX + (-deltaX), 0, maxTranslatePx);
        track.style.transform = `translateX(-${previewPx}px)`;
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;

      if (captured) { try { el.releasePointerCapture(pointerId); } catch {} }
      track.style.transition = '';

      if (!isSwiping) {
        // Tap/click — let native click proceed to anchor if any
        resumeAuto();
        return;
      }

      // Real swipe — decide navigation and suppress the ensuing click once
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 250);

      const threshold = Math.max(40, el.clientWidth * 0.12);
      if (deltaX > threshold) goPrev();
      else if (deltaX < -threshold) goNext();
      else {
        slidesPerView === 1
          ? gotoSlideIndex(currentSlideIndexFromTransform(), { from: 'swipe-cancel' })
          : snapToPage(pageIndex, { animate: true, from: 'swipe-cancel' });
      }
      resumeAuto();
    };

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  /* ------------------------- TYPEWRITER ------------------------- */
  function startTypewriter() {
    if (!subtitle) return;

    if (REDUCED_MOTION) {
      const list = parsePhrases(subtitle);
      if (list && list.length) subtitle.textContent = list[0];
      return;
    }

    const phrases = parsePhrases(subtitle);
    if (!phrases || !phrases.length) return;

    const longest = phrases.reduce((a, b) => (a.length >= b.length ? a : b), '');
    subtitle.style.minWidth = `${longest.length + 1}ch`;
    subtitle.textContent = '';

    let iPhrase = 0;
    let iChar = 0;
    let deleting = false;
    const typeMs = 70;
    const pauseMs = 1400;

    function tick() {
      const current = phrases[iPhrase];
      if (deleting) {
        subtitle.textContent = current.slice(0, iChar--);
        if (iChar < 0) {
          deleting = false;
          iPhrase = (iPhrase + 1) % phrases.length;
          setTimeout(tick, 350);
          return;
        }
        setTimeout(tick, 28);
      } else {
        subtitle.textContent = current.slice(0, iChar++);
        if (iChar > current.length) {
          deleting = true;
          setTimeout(tick, pauseMs);
          return;
        }
        setTimeout(tick, typeMs);
      }
    }
    tick();
  }

  /* ------------------------- INIT ------------------------------- */
  function init() {
    // graceful without carousel (still run typewriter + card anim)
    if (!carousel || !viewport || !track || SLIDE_COUNT === 0) {
      startTypewriter();
      animateStoryCards();
      return;
    }

    computeLayout();
    buildDots();

    // start index from hash > session > 0
    const fromHash = indexFromHash();
    const saved = Number(sessionStorage.getItem(STORAGE_KEY));
    const initialSlide = clamp(
      fromHash ?? (Number.isFinite(saved) ? saved : 0),
      0,
      SLIDE_COUNT - 1
    );

    // move to initial position without animation
    if (slidesPerView === 1) {
      gotoSlideIndex(initialSlide, { from: 'init' });
    } else {
      pageIndex = Math.floor(initialSlide / slidesPerView);
      snapToPage(pageIndex, { animate: false, from: 'init' });
    }

    bindEvents();
    startTypewriter();
    animateStoryCards();
    startAuto();
  }

  /* -------------------- CARD APPEAR ON SCROLL ------------------- */
  function animateStoryCards() {
    const cards = page.querySelectorAll('.story-card[data-animate]');
    if (!cards.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    cards.forEach((c) => obs.observe(c));
  }

  /* ------------------------- BOOT ------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Post-load layout pass: sizes/images/fonts are final → clamp correct translate
  window.addEventListener('load', () => {
    if (!carousel || !viewport || !track || SLIDE_COUNT === 0) return;
    const prevMode = slidesPerView;
    computeLayout();
    if (prevMode !== slidesPerView) buildDots();
    snapToPage(pageIndex, { animate: false, from: 'load' });
  }, { once: true });

  // Hot-reload guard (non-fatal in prod)
  try {
    if (import.meta && import.meta.hot) {
      import.meta.hot.dispose(() => {
        pauseAuto();
        if (announcer && announcer.parentNode === document.body) {
          document.body.removeChild(announcer);
        }
      });
    }
  } catch { /* no-op */ }
})();
