/* =======================================================================================
   1807 — Projects Page Script
   Features:
   - Accessible carousel (keyboard, swipe, wrap, autoplay, progress bar)
   - Hash navigation (#ai, #embedded, #chains, #construction)
   - Typewriter subtitle with per-character transient color (reverts to white)
   - Live region announcer for current slide
   - Entrance animations (respect prefers-reduced-motion)
   - Hot-reload friendly cleanup (guarded)
   Author: webbaby
   ======================================================================================= */

const VIEW_ID = "projects-view";

const DEFAULTS = Object.freeze({
  autoplayMs: 5000,
  transitionMs: 450,
  pauseOnHover: true,
  keyboard: true,
  swipe: true,
  wrap: true
});

let state = {
  index: 0,
  timer: null,
  root: null,
  track: null,
  slides: [],
  viewport: null,
  isReducedMotion: false,
  isPointerDown: false,
  pointerStartX: 0,
  pointerDeltaX: 0,
  stride: 0,
  visible: 2,
  opts: { ...DEFAULTS },
  autoplayEnabled: true,
  // UI refs
  progressBarEl: null,
  announcerEl: null,
  autoplayBtn: null,
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
    colors: [
      "#60a5fa", // blue-400
      "#93c5fd", // blue-300
      "#2563eb", // blue-600
      "#b68b4c", // tan-600
      "#d6a76a", // tan-500
      "#f5e9da"  // tan-100
    ],
    prevColor: null
  },
  _listeners: null
};

/* ------------------------------ Utilities ------------------------------ */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function prefersReducedMotion() { return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; }
function safeJSON(str) { try { return JSON.parse(str || ""); } catch { return null; } }

/* ------------------------------ Lifecycle ------------------------------ */
function mount() {
  state.isReducedMotion = prefersReducedMotion();
  state.index = 0;

  state.root = qs(`#${VIEW_ID}`);
  if (!state.root) return;

  state.track = qs(".carousel-track", state.root);
  state.slides = qsa(".carousel-slide", state.root);
  state.viewport = qs(".carousel-viewport", state.root);
  state.progressBarEl = qs("#carousel-progress-bar", state.root) || qs("#carousel-progress-bar");
  state.announcerEl = qs("#carousel-announcer", state.root) || qs("#carousel-announcer");
  state.autoplayBtn = qs("#autoplay-toggle", state.root) || qs("#autoplay-toggle");

  computeLayout();
  attachEvents();
  applyHashOnLoad();
  update(true);
  startAutoplay();
  startTypewriterRotate();
  animateHeader();
  animateCards();
}

function cleanup() {
  pauseAutoplay();
  stopTypewriterRotate();

  if (!state._listeners) return;
  const { prev, next, dots, vp, autoplayBtn } = state._listeners;

  if (prev) prev.removeEventListener("click", onPrev);
  if (next) next.removeEventListener("click", onNext);
  if (dots) dots.forEach(d => d.removeEventListener("click", onDot));

  if (vp) {
    vp.removeEventListener("keydown", onKeydown);
    vp.removeEventListener("mouseenter", onVPHoverIn);
    vp.removeEventListener("mouseleave", onVPHoverOut);
    vp.removeEventListener("pointerdown", onPointerDown);
  }

  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("load", computeLayout);
  window.removeEventListener("hashchange", onHashChange);

  if (autoplayBtn) autoplayBtn.removeEventListener("click", toggleAutoplay);

  state._listeners = null;
}

/* ------------------------------ Layout ------------------------------ */
function computeLayout() {
  const width = state.viewport?.clientWidth || 0;
  state.visible = width < 640 ? 1 : 2;

  const first = state.slides[0];
  if (!first) return;

  const rect = first.getBoundingClientRect();
  const styles = getComputedStyle(first);
  const ml = parseFloat(styles.marginLeft) || 0;
  const mr = parseFloat(styles.marginRight) || 0;

  state.stride = rect.width + ml + mr + gapOfTrack();
  translateTo(-state.index * state.stride, 0);
}

function gapOfTrack() {
  const s = getComputedStyle(state.track);
  const g = parseFloat(s.columnGap || s.gap);
  return Number.isFinite(g) ? g : 24;
}

/* ------------------------------ Events ------------------------------ */
function attachEvents() {
  const prev = qs(".carousel-prev", state.root);
  const next = qs(".carousel-next", state.root);
  const dots = qsa(".carousel-dot", state.root);
  const vp = state.viewport;
  const autoplayBtn = state.autoplayBtn;

  if (prev) prev.addEventListener("click", onPrev);
  if (next) next.addEventListener("click", onNext);
  dots.forEach(d => d.addEventListener("click", onDot));

  if (state.opts.keyboard && vp) vp.addEventListener("keydown", onKeydown);

  if (state.opts.pauseOnHover && vp) {
    vp.addEventListener("mouseenter", onVPHoverIn);
    vp.addEventListener("mouseleave", onVPHoverOut);
  }

  if (state.opts.swipe && vp) {
    vp.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  if (autoplayBtn) autoplayBtn.addEventListener("click", toggleAutoplay);

  window.addEventListener("resize", onResize);
  window.addEventListener("load", computeLayout);
  window.addEventListener("hashchange", onHashChange);

  state._listeners = { prev, next, dots, vp, autoplayBtn };
}

/* ------------------------------ Carousel Controls ------------------------------ */
function onPrev() { goTo(state.index - 1, { user: true }); }
function onNext() { goTo(state.index + 1, { user: true }); }

function onDot(e) {
  const i = Number(e.currentTarget.getAttribute("data-index"));
  if (Number.isFinite(i)) goTo(i, { user: true });
}

function onKeydown(e) {
  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); onPrev(); break;
    case "ArrowRight": e.preventDefault(); onNext(); break;
    case "Home": e.preventDefault(); goTo(0, { user: true }); break;
    case "End": e.preventDefault(); goTo(maxIndex(), { user: true }); break;
    case " ":
      e.preventDefault();
      toggleAutoplay();
      break;
  }
}

function onResize() { computeLayout(); }
function onVPHoverIn() { pauseAutoplay(); }
function onVPHoverOut() { if (state.autoplayEnabled) startAutoplay(); }

/* ------------------------------ Pointer (Swipe) ------------------------------ */
function onPointerDown(e) {
  state.isPointerDown = true;
  state.pointerStartX = (e.clientX ?? (e.touches?.[0]?.clientX || 0));
  state.pointerDeltaX = 0;
  pauseAutoplay();
}

function onPointerMove(e) {
  if (!state.isPointerDown || !state.track) return;
  const x = (e.clientX ?? (e.touches?.[0]?.clientX || 0));
  state.pointerDeltaX = x - state.pointerStartX;
  translateTo(-(state.index * state.stride) + state.pointerDeltaX, 0);
}

function onPointerUp() {
  if (!state.isPointerDown) return;
  state.isPointerDown = false;

  const threshold = Math.max(50, (state.stride || 0) * 0.25);
  if (state.pointerDeltaX > threshold) onPrev();
  else if (state.pointerDeltaX < -threshold) onNext();
  else translateTo(-state.index * state.stride, state.opts.transitionMs);

  state.pointerDeltaX = 0;
  if (!state.isReducedMotion && state.opts.pauseOnHover === false && state.autoplayEnabled) startAutoplay();
}

/* ------------------------------ Carousel State ------------------------------ */
function positionsCount() {
  const total = state.slides.length;
  return Math.max(1, total - state.visible + 1);
}

function maxIndex() { return positionsCount() - 1; }

function goTo(i, { user = false } = {}) {
  const count = positionsCount();
  let next = i;

  if (state.opts.wrap) next = ((i % count) + count) % count;
  else next = clamp(i, 0, count - 1);

  state.index = next;
  update(user);
  updateHashForIndex(next);
}

function update(focusDot = false) {
  translateTo(-state.index * (state.stride || 0), state.opts.transitionMs);

  const dots = qsa(".carousel-dot", state.root);
  dots.forEach((d, i) => {
    const sel = i === state.index;
    d.setAttribute("aria-selected", sel ? "true" : "false");
    d.tabIndex = sel ? 0 : -1;
  });

  if (state.viewport) state.viewport.setAttribute("data-active-index", String(state.index));

  const slide = state.slides[state.index];
  const label = slide?.getAttribute("aria-label") || `Slide ${state.index + 1}`;
  if (state.announcerEl) state.announcerEl.textContent = `Viewing ${label}`;

  if (state.autoplayEnabled) {
    tickProgress(0);
    animateProgressBar();
  }

  if (focusDot) {
    const active = dots[state.index];
    if (active) active.focus({ preventScroll: true });
  }
}

function translateTo(x, ms = 0) {
  if (!state.track) return;
  const t = state.isReducedMotion ? 0 : ms;
  state.track.style.transition = t ? `transform ${t}ms ease` : "none";
  state.track.style.transform = `translate3d(${x}px, 0, 0)`;
}

/* ------------------------------ Autoplay & Progress ------------------------------ */
function startAutoplay() {
  if (state.isReducedMotion || !state.opts.autoplayMs || !state.autoplayEnabled) {
    setProgress(0);
    return;
  }
  pauseAutoplay();
  tickProgress(0);
  state.timer = setInterval(() => {
    goTo(state.index + 1);
    tickProgress(0);
  }, state.opts.autoplayMs);
  animateProgressBar();
}

function pauseAutoplay() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  setProgress(0);
}

function toggleAutoplay() {
  state.autoplayEnabled = !state.autoplayEnabled;
  if (state.autoplayBtn) {
    state.autoplayBtn.setAttribute("aria-pressed", String(state.autoplayEnabled));
    state.autoplayBtn.textContent = state.autoplayEnabled ? "⏸️ Autoplay" : "▶️ Autoplay";
  }
  if (state.autoplayEnabled) startAutoplay();
  else pauseAutoplay();
}

function setProgress(pct) {
  if (state.progressBarEl) state.progressBarEl.style.width = `${pct}%`;
}

function tickProgress(startPct) {
  setProgress(startPct || 0);
}

function animateProgressBar() {
  if (!state.autoplayEnabled || state.isReducedMotion || !state.opts.autoplayMs) {
    setProgress(0);
    return;
  }
  const start = performance.now();
  const dur = state.opts.autoplayMs;
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    setProgress(100 * t);
    if (t < 1 && state.timer) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ------------------------------ Hash Navigation ------------------------------ */
function applyHashOnLoad() {
  const key = (location.hash || "").replace("#", "");
  goToHash(key);
}
function onHashChange() {
  const key = (location.hash || "").replace("#", "");
  goToHash(key, { user: true });
}
function goToHash(key, { user = false } = {}) {
  if (!key) return;
  const idx = state.slides.findIndex(s => s.getAttribute("data-hash") === key);
  if (idx >= 0) goTo(idx, { user });
}
function updateHashForIndex(i) {
  const slide = state.slides[i];
  const key = slide?.getAttribute("data-hash");
  if (!key) return;
  history.replaceState(null, "", `#${key}`);
}

/* ------------------------------ Typewriter Subtitle ------------------------------ */
function startTypewriterRotate() {
  state.tw.el = document.getElementById("subtitle-rotator");
  if (!state.tw.el) return;

  try {
    const raw = state.tw.el.getAttribute("data-phrases");
    state.tw.phrases = raw ? JSON.parse(raw) : [state.tw.el.textContent.trim()];
  } catch {
    state.tw.phrases = [state.tw.el.textContent.trim()];
  }

  state.tw.el.textContent = "";
  const line = document.createElement("span");
  line.className = "tw-line";
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
      span.style.setProperty("--typing-color", pickTypingColor());
      span.textContent = ch;
      line.appendChild(span);

      const prev = line.children[line.children.length - 2];
      if (prev && prev.classList.contains("tw-char")) prev.classList.remove("is-typing");

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

/* ------------------------------ Entrance Animations ------------------------------ */
function animateHeader() {
  if (state.isReducedMotion) return;
  const vh = document.querySelector(".view-header");
  if (!vh) return;
  vh.setAttribute("data-animate", "");
  requestAnimationFrame(() => vh.classList.add("in"));
}

function animateCards() {
  if (state.isReducedMotion) return;
  const cards = qsa("[data-animate]", state.root);
  if (!cards.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.transition = "transform 420ms ease, opacity 420ms ease";
        e.target.style.transform = "translateY(0)";
        e.target.style.opacity = "1";
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  cards.forEach(card => {
    card.style.opacity = "0";
    card.style.transform = "translateY(10px)";
    io.observe(card);
  });
}

/* ------------------------------ Boot ------------------------------ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

/* ------------------------------ Hot Reload Cleanup (guarded) ------------------------------ */
try {
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => cleanup());
  }
} catch (_) {
  // Non-module environments or bundlers without import.meta.hot — safe no-op
}
