// Carousel logic for Projects page — 2 cards per view (1 on small screens)

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
  opts: { ...DEFAULTS }
};

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function prefersReducedMotion() { return matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }

function mount() {
  state.isReducedMotion = prefersReducedMotion();
  state.index = 0;

  state.root = qs(`#${VIEW_ID}`);
  if (!state.root) return;

  state.track = qs(".carousel-track", state.root);
  state.slides = qsa(".carousel-slide", state.root);
  state.viewport = qs(".carousel-viewport", state.root);

  computeLayout();
  attachEvents();
  update(true);
  startAutoplay();
}

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

function attachEvents() {
  const prev = qs(".carousel-prev", state.root);
  const next = qs(".carousel-next", state.root);
  const dots = qsa(".carousel-dot", state.root);
  const vp = state.viewport;

  if (prev) prev.addEventListener("click", onPrev);
  if (next) next.addEventListener("click", onNext);
  dots.forEach(d => d.addEventListener("click", onDot));

  if (state.opts.keyboard && vp) {
    vp.addEventListener("keydown", onKeydown);
  }

  if (state.opts.pauseOnHover && vp) {
    vp.addEventListener("mouseenter", pauseAutoplay);
    vp.addEventListener("mouseleave", startAutoplay);
  }

  if (state.opts.swipe && vp) {
    vp.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
  }

  window.addEventListener("resize", onResize);
  // Recompute after images/fonts settle
  window.addEventListener("load", computeLayout);

  state._listeners = { prev, next, dots, vp };
}

function cleanup() {
  pauseAutoplay();
  if (state._listeners) {
    const { prev, next, dots, vp } = state._listeners;
    if (prev) prev.removeEventListener("click", onPrev);
    if (next) next.removeEventListener("click", onNext);
    if (dots) dots.forEach(d => d.removeEventListener("click", onDot));
    if (vp) {
      vp.removeEventListener("keydown", onKeydown);
      vp.removeEventListener("mouseenter", pauseAutoplay);
      vp.removeEventListener("mouseleave", startAutoplay);
      vp.removeEventListener("pointerdown", onPointerDown);
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", computeLayout);
  }
}

function startAutoplay() {
  if (state.isReducedMotion || !state.opts.autoplayMs) return;
  pauseAutoplay();
  state.timer = setInterval(() => goTo(state.index + 1), state.opts.autoplayMs);
}

function pauseAutoplay() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

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
  }
}

function onResize() { computeLayout(); }

function onPointerDown(e) {
  state.isPointerDown = true;
  state.pointerStartX = e.clientX ?? (e.touches?.[0]?.clientX || 0);
  state.pointerDeltaX = 0;
  pauseAutoplay();
}

function onPointerMove(e) {
  if (!state.isPointerDown || !state.track) return;
  const x = e.clientX ?? (e.touches?.[0]?.clientX || 0);
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
  if (!state.isReducedMotion && state.opts.pauseOnHover === false) startAutoplay();
}

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

// Ensure mount runs even if DOMContentLoaded already fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
