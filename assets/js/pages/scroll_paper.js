/* =======================================================================================
   SCROLL_PAPER.JS (ES MODULE)
   Carousel + typewriter + counters for scroll_paper.html with clean init/cleanup hooks.
   Fully self-contained, idempotent, and attached as window.initScrollPaper for external use.
   ======================================================================================= */

const __PAGE_ID__ = "scroll_paper";

/* -----------------------------------------
   ENV GUARDS
----------------------------------------- */
const rootEl = document.documentElement;
const isTargetPage = () => rootEl.getAttribute("data-page") === __PAGE_ID__;
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -----------------------------------------
   STATE
----------------------------------------- */
const state = {
  // lifecycle
  mounted: false,
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
    colors: ["#60a5fa", "#93c5fd", "#2563eb", "#b68b4c", "#d6a76a", "#f5e9da"],
    prevColor: null
  },
  // listeners to remove on cleanup
  listeners: []
};

/* -----------------------------------------
   UTILITIES
----------------------------------------- */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const add = (target, type, handler, opts) => {
  target.addEventListener(type, handler, opts);
  state.listeners.push(() => target.removeEventListener(type, handler, opts));
};

const parsePhrases = (el) => {
  if (!el) return null;
  const raw = el.getAttribute("data-phrases");
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
      const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
      return lines.length ? lines : null;
    }
  }
};

const getSlideWidth = () => {
  const first = state.slides[0];
  if (!first || !state.track) return 0;
  const styles = getComputedStyle(state.track);
  const gap = parseFloat(styles.gap || styles.columnGap || "0") || 0;
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

/* -----------------------------------------
   COUNTERS
----------------------------------------- */
function animateCounters() {
  const counters = document.querySelectorAll('[data-counter="true"]');
  if (!counters.length) return;

  const duration = 2000;
  counters.forEach(counter => {
    const target = +counter.getAttribute("data-count-target");
    let current = 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      current = Math.min(target, (elapsed / duration) * target);
      counter.textContent = Math.ceil(current);
      if (current < target) {
        requestAnimationFrame(step);
      } else {
        counter.textContent = target;
      }
    }

    requestAnimationFrame(step);
  });
}

/* -----------------------------------------
   CAROUSEL
----------------------------------------- */
function initCarousel() {
  state.view = document.querySelector("main .view.story");
  if (!state.view) return;

  state.viewport = state.view.querySelector(".carousel-viewport");
  state.track = state.view.querySelector(".carousel-track");
  state.slides = Array.from(state.view.querySelectorAll(".carousel-slide"));
  state.prevBtn = state.view.querySelector(".carousel-prev");
  state.nextBtn = state.view.querySelector(".carousel-next");
  state.dots = Array.from(state.view.querySelectorAll(".carousel-dot"));
  state.announcerEl = state.view.querySelector("#carousel-announcer") || document.getElementById("carousel-announcer");

  if (!state.announcerEl) {
    state.announcerEl = document.createElement("div");
    state.announcerEl.id = "carousel-announcer";
    state.announcerEl.className = "sr-only";
    state.announcerEl.setAttribute("aria-live", "polite");
    state.announcerEl.setAttribute("aria-atomic", "true");
    document.body.appendChild(state.announcerEl);
  }

  if (!state.viewport || !state.track || !state.slides.length) return;

  // Controls clickable
  [state.prevBtn, state.nextBtn, ...state.dots].forEach(btn => {
    if (!btn) return;
    btn.style.pointerEvents = "auto";
    btn.style.userSelect = "none";
    btn.setAttribute("tabindex", "0");
  });

  // Prevent image drag
  state.view.querySelectorAll("img").forEach(img => {
    add(img, "dragstart", e => e.preventDefault());
  });

  // Index from hash or session
  const storageKey = "scroll_paper.carousel.index";
  const hashKey = (location.hash || "").replace(/^#/, "");
  const fromHash = slideIndexForKey(hashKey);
  const saved = Number(sessionStorage.getItem(storageKey));
  state.index = clamp(fromHash ?? (Number.isFinite(saved) ? saved : 0), 0, state.slides.length - 1);

  const setTransform = (i, immediate = false) => {
    const w = getSlideWidth();
    if (w === 0) return;
    state.currentTranslate = -i * w;
    state.track.style.transition = (immediate || prefersReducedMotion) ? "none" : "transform 450ms ease";
    state.track.style.transform = `translate3d(${state.currentTranslate}px,0,0)`;
    state.viewport.setAttribute("aria-label", `Story chapters (slide ${i + 1} of ${state.slides.length})`);
  };

  const updateDots = (i, focusDot = false) => {
    state.dots.forEach((d, k) => {
      const sel = k === i;
      d.setAttribute("aria-selected", String(sel));
      d.setAttribute("tabindex", sel ? "0" : "-1");
      if (focusDot && sel) d.focus({ preventScroll: true });
    });
  };

  const updateHash = (i, hashOverride) => {
    const nextHash =
      hashOverride ||
      state.slides[i]?.getAttribute("data-hash") ||
      state.slides[i]?.id || "";
    if (!nextHash) return;
    history.replaceState(null, "", `#${nextHash}`);
  };

  const announce = (i) => {
    if (!state.announcerEl) return;
    const label = state.slides[i]?.getAttribute("aria-label") || `Slide ${i + 1}`;
    state.announcerEl.textContent = `Viewing ${label}`;
  };

  const goTo = (i, { user = false, suppressHash = false, hashOverride = null, immediate = false } = {}) => {
    state.index = clamp(i, 0, state.slides.length - 1);
    sessionStorage.setItem(storageKey, String(state.index));
    setTransform(state.index, immediate);
    updateDots(state.index, user);
    if (!suppressHash) updateHash(state.index, hashOverride);
    announce(state.index);
    state.slides.forEach((li, k) => li.setAttribute("aria-label", `${k + 1} of ${state.slides.length}`));
    if (user) stopAutoplay();
  };

  const ready = () => goTo(state.index, { immediate: true });
  if (document.readyState === "complete") setTimeout(ready, 0);
  else add(window, "load", ready, { once: true });

  // Controls
  const handleButtonClick = (dir) => {
    goTo(dir === "prev" ? state.index - 1 : state.index + 1, { user: true });
  };
  if (state.prevBtn) add(state.prevBtn, "click", () => handleButtonClick("prev"));
  if (state.nextBtn) add(state.nextBtn, "click", () => handleButtonClick("next"));

  // Dots
  state.dots.forEach((dot, k) => {
    add(dot, "click", () => goTo(k, { user: true }));
    add(dot, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTo(k, { user: true });
      }
    });
  });

  // CTA buttons
  state.view.querySelectorAll(".hero-ctas .btn").forEach(btn => {
    btn.style.pointerEvents = "auto";
    btn.style.userSelect = "none";
    btn.setAttribute("tabindex", "0");
  });

  // Keyboard on viewport
  add(state.viewport, "keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(state.index - 1, { user: true }); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goTo(state.index + 1, { user: true }); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0, { user: true }); }
    else if (e.key === "End") { e.preventDefault(); goTo(state.slides.length - 1, { user: true }); }
  });

  // Guard interactive
  const isInteractive = (el) => !!el.closest('a,button,input,textarea,select,[role="button"],[role="link"]');

  // Swipe
  add(state.viewport, "pointerdown", (e) => {
    if (isInteractive(e.target)) return;
    stopAutoplay();
    state.dragging = true;
    state.startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    state.track.style.transition = "none";
    try { state.viewport.setPointerCapture(e.pointerId); } catch {}
  });

  add(state.viewport, "pointermove", (e) => {
    if (!state.dragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const dx = x - state.startX;
    state.track.style.transform = `translate3d(${state.currentTranslate + dx}px,0,0)`;
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

  add(state.viewport, "pointerup", (e) => endDrag(e.clientX ?? 0, e.pointerId));
  add(state.viewport, "pointercancel", () => {
    if (!state.dragging) return;
    state.dragging = false;
    setTransform(state.index);
    if (state.autoplayEnabled && !prefersReducedMotion) startAutoplay();
  });

  // Anchor navigation
  add(document, "click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const targetId = a.getAttribute("href").replace(/^#/, "");
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
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#${targetId}`);
    }
  });

  // Hash navigation
  add(window, "hashchange", () => {
    const key = (location.hash || "").replace(/^#/, "");
    if (!key) return;

    const idx = slideIndexForKey(key);
    if (idx !== null) {
      goTo(idx, { user: true, hashOverride: key });
      return;
    }
    const targetEl = document.getElementById(key);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  });

  // Debounced resize
  const handleResize = debounce(() => setTransform(state.index), 120);
  add(window, "resize", handleResize, { passive: true });

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
  state._startAutoplay = startAutoplay;
  state._stopAutoplay = stopAutoplay;

  if (!prefersReducedMotion && state.autoplayEnabled) startAutoplay();
  add(state.viewport, "mouseenter", stopAutoplay, { passive: true });
  add(state.viewport, "mouseleave", startAutoplay, { passive: true });
  add(state.viewport, "focusin", stopAutoplay);
  add(state.viewport, "focusout", startAutoplay);

  // Page visibility
  add(document, "visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  // Respect initial hash
  const key = (location.hash || "").replace(/^#/, "");
  if (key) {
    const idx = slideIndexForKey(key);
    if (idx !== null) {
      const w = getSlideWidth();
      if (w) {
        state.track.style.transition = "none";
        state.index = idx;
        state.currentTranslate = -idx * w;
        state.track.style.transform = `translate3d(${state.currentTranslate}px,0,0)`;
        history.replaceState(null, "", `#${key}`);
      }
    } else {
      const targetEl = document.getElementById(key);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      }
    }
  }
}

/* -----------------------------------------
   LIFECYCLE
----------------------------------------- */
function mount() {
  if (state.mounted || !isTargetPage()) return;
  state.mounted = true;

  // subsystems
  initCarousel();
  animateCounters();
  startTypewriterRotate();
}

function cleanup() {
  if (!state.mounted) return;

  stopTypewriterRotate();
  if (state._stopAutoplay) state._stopAutoplay();

  // remove announcer if we created it
  if (state.announcerEl && state.announcerEl.parentNode === document.body) {
    document.body.removeChild(state.announcerEl);
  }

  // remove listeners
  state.listeners.splice(0).forEach(off => {
    try { off(); } catch {}
  });

  // reset dynamic state
  state.index = 0;
  state.timer = null;
  state.view = null;
  state.viewport = null;
  state.track = null;
  state.slides = [];
  state.dots = [];
  state.prevBtn = null;
  state.nextBtn = null;
  state.announcerEl = null;
  state.dragging = false;
  state.startX = 0;
  state.currentTranslate = 0;
  state.tw = { ...state.tw, el: null, phrases: [], iPhrase: 0, iChar: 0, typing: true, timer: null, prevColor: null };
  state.mounted = false;
}

/* -----------------------------------------
   PUBLIC INIT
----------------------------------------- */
export function initScrollPaper() {
  if (!isTargetPage()) {
    return { cleanup: () => {} };
  }
  mount();
  return { cleanup };
}

// Attach to window for non-module consumers or hot reinit from app.js
// Safe to overwrite idempotently
if (typeof window !== "undefined") {
  window.initScrollPaper = initScrollPaper;
}

/* -----------------------------------------
   AUTO BOOT
----------------------------------------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { if (isTargetPage()) mount(); }, { once: true });
} else {
  if (isTargetPage()) mount();
}

/* -----------------------------------------
   HMR SAFE
----------------------------------------- */
try {
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => cleanup());
  }
} catch { /* no-op */ }
