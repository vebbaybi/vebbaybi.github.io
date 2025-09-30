/* =======================================================================================
   1807 — Home Page Typewriter (Eyebrow) — MOBILE-STABLE (No Layout Jitter)
   - Fix: reserves inline width using longest phrase (clamped to viewport), prevents page
          expand/contract on mobile
   - Auto wraps only when needed on narrow screens (no horizontal scroll)
   - Per-character color, reduced-motion aware, HMR-safe cleanup
   - Gated by SITE_READY
   ======================================================================================= */

const CONFIG = Object.freeze({
  selector: "#eyebrow-rotator",
  typeMs: 55,
  eraseMs: 28,
  pauseMs: 1200,
  colors: ["#60a5fa", "#93c5fd", "#2563eb", "#b68b4c", "#d6a76a", "#f5e9da"],
  maxViewportFrac: 0.92 // keep inside 92vw to avoid horizontal overspill
});

let tw = {
  el: null,
  wrapper: null,         // .tw-wrapper (width gets reserved here)
  line: null,            // .tw-line (actual characters live here)
  phrases: [],
  iPhrase: 0,
  iChar: 0,
  typing: true,
  timer: null,
  prevColor: null,
  isReducedMotion: false,
  isPausedByVisibility: false,
  ro: null,              // ResizeObserver for live reflow
  boundOnResize: null,
  fontsReadyCancel: null
};

function mount() {
  tw.isReducedMotion = typeof matchMedia === "function" &&
                       matchMedia("(prefers-reduced-motion: reduce)").matches;

  tw.el = document.querySelector(CONFIG.selector);
  if (!tw.el) return;

  try {
    const raw = tw.el.getAttribute("data-phrases");
    tw.phrases = raw ? JSON.parse(raw) : [fallbackText()];
  } catch { tw.phrases = [fallbackText()]; }
  if (!Array.isArray(tw.phrases) || tw.phrases.length === 0) tw.phrases = [fallbackText()];

  // DOM roles
  tw.wrapper = tw.el.closest(".tw-wrapper") || createWrapperAround(tw.el);
  tw.line    = getLineNode();

  // Prepare container for stable width
  primeWrapperStyles();

  // Reserve stable inline size so typing does not change layout
  reserveInlineSize();

  // HMR-safe clean state for the line
  clearLineNode();
  if (tw.isReducedMotion) {
    tw.line.textContent = tw.phrases[tw.iPhrase] || fallbackText();
    return;
  }

  // Visibility + resize/reactive bindings
  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });
  tw.boundOnResize = () => reserveInlineSize();
  window.addEventListener("resize", tw.boundOnResize, { passive: true });
  window.addEventListener("orientationchange", tw.boundOnResize, { passive: true });

  // Re-measure after fonts load (prevents late width pop)
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    let active = true;
    document.fonts.ready.then(() => { if (active) reserveInlineSize(); });
    tw.fontsReadyCancel = () => { active = false; };
  }

  // ResizeObserver on the eyebrow block container to react to style changes
  if (typeof ResizeObserver !== "undefined") {
    tw.ro = new ResizeObserver(() => reserveInlineSize());
    tw.ro.observe(tw.wrapper);
  }

  // Start
  tw.iPhrase = 0; tw.iChar = 0; tw.typing = true;
  loopTypewriter();
}

function cleanup() {
  stopTyping();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (tw.boundOnResize) {
    window.removeEventListener("resize", tw.boundOnResize);
    window.removeEventListener("orientationchange", tw.boundOnResize);
  }
  if (tw.ro) { try { tw.ro.disconnect(); } catch {} }
  if (tw.fontsReadyCancel) tw.fontsReadyCancel();
  // do not clear the wrapper width on cleanup; harmless to keep reserved
}

function fallbackText() { return "WELCOME TO THE RAIN..."; }

function createWrapperAround(el) {
  const span = document.createElement("span");
  span.className = "tw-wrapper";
  const parent = el.parentNode;
  parent.insertBefore(span, el);
  span.appendChild(el);
  return span;
}

// If container itself already has .tw-line, use it; else look for child .tw-line; else create.
function getLineNode() {
  if (!tw.el) return null;
  if (tw.el.classList.contains("tw-line")) return tw.el;
  let node = tw.el.querySelector(".tw-line");
  if (!node) {
    node = document.createElement("span");
    node.className = "tw-line";
    tw.el.appendChild(node);
  }
  return node;
}

// Remove previous run’s characters/children
function clearLineNode() {
  if (!tw.line) return;
  tw.line.textContent = "";
}

function pickTypingColor() {
  const pool = CONFIG.colors.filter(c => c !== tw.prevColor);
  const choice = pool[Math.floor(Math.random() * pool.length)] || CONFIG.colors[0];
  tw.prevColor = choice;
  return choice;
}

function onVisibilityChange() {
  if (document.hidden) { tw.isPausedByVisibility = true; stopTyping(); }
  else if (tw.isPausedByVisibility && !tw.isReducedMotion) { tw.isPausedByVisibility = false; loopTypewriter(); }
}

function loopTypewriter() {
  const line = tw.line; if (!line) return;
  const phrase = tw.phrases[tw.iPhrase] || "";

  if (tw.typing) {
    if (tw.iChar < phrase.length) {
      const ch = phrase[tw.iChar];
      const span = document.createElement("span");
      span.className = "tw-char is-typing";
      span.style.setProperty("--typing-color", pickTypingColor());
      span.textContent = ch;
      line.appendChild(span);

      const prev = line.children[line.children.length - 2];
      if (prev && prev.classList.contains("tw-char")) prev.classList.remove("is-typing");

      tw.iChar++;
      tw.timer = setTimeout(loopTypewriter, CONFIG.typeMs);
      return;
    }
    const last = line.children[line.children.length - 1];
    if (last) last.classList.remove("is-typing");
    tw.typing = false;
    tw.timer = setTimeout(loopTypewriter, CONFIG.pauseMs);
    return;
  } else {
    if (tw.iChar > 0) {
      line.removeChild(line.lastChild);
      tw.iChar--;
      tw.timer = setTimeout(loopTypewriter, CONFIG.eraseMs);
      return;
    }
    tw.typing = true;
    tw.iPhrase = (tw.iPhrase + 1) % tw.phrases.length;
    tw.timer = setTimeout(loopTypewriter, CONFIG.typeMs);
  }
}

function stopTyping() {
  if (tw.timer) { clearTimeout(tw.timer); tw.timer = null; }
}

/* --------------------------- WIDTH RESERVATION --------------------------- */
/* Reserve a stable inline size for the wrapper using the longest phrase,
   clamped to the available width. This prevents layout jitter on mobile. */
function reserveInlineSize() {
  if (!tw.wrapper) return;

  const phrases = tw.phrases && tw.phrases.length ? tw.phrases : [fallbackText()];
  const containerMaxPx = Math.max(240, Math.floor((window.innerWidth || 360) * CONFIG.maxViewportFrac));

  const measureFont = getComputedStyle(tw.line || tw.wrapper).font || "";
  const measurer = document.createElement("span");
  measurer.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "white-space:pre",
    "left:-99999px",
    "top:-99999px",
    `font:${measureFont}`
  ].join(";");
  document.body.appendChild(measurer);

  let maxPx = 0;
  for (const s of phrases) {
    measurer.textContent = s;
    maxPx = Math.max(maxPx, measurer.offsetWidth);
  }
  measurer.remove();

  const reservedPx = Math.min(maxPx, containerMaxPx);

  // Apply to wrapper via CSS var; wrapper style ensures the var is used.
  tw.wrapper.style.setProperty("--tw-inline-size", `${reservedPx}px`);
}

/* Ensure wrapper has the right CSS behavior to avoid jitter */
function primeWrapperStyles() {
  if (!tw.wrapper) return;

  // Hard styles that survive any external CSS:
  tw.wrapper.style.display = "inline-block";
  tw.wrapper.style.whiteSpace = "normal";         // allow wrap if needed on small viewports
  tw.wrapper.style.textAlign = "start";
  tw.wrapper.style.overflowWrap = "anywhere";     // break long segments if no space
  tw.wrapper.style.setProperty("contain", "inline-size"); // isolate width from content jitter

  // If the caret is a sibling inside wrapper, keep it inline flow.
  // No further action needed here.
}

/* Start (gated by SITE_READY) */
if (window.__SITE_READY__) {
  mount();
} else {
  window.addEventListener("SITE_READY", mount, { once: true });
}

/* HMR guard */
try {
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => cleanup());
  }
} catch { /* no-op */ }

/* Optional render() helper (left intact) */
export async function render(target) {
  if (!target) return;
  target.setAttribute("aria-busy", "true");
  const heroImg = "/assets/images/theshark.jpg";
  target.innerHTML = `
    <section class="home-hero">
      <div class="hero-left">
        <img class="hero-img" src="${heroImg}" alt="Portrait" loading="eager" />
      </div>
      <div class="hero-right">
        <div class="hero-content">
          <span class="eyebrow"><span class="tw-wrapper"><span class="tw-line"></span><span class="tw-caret" aria-hidden="true"></span></span></span>
          <h1 class="hero-title">My<br/>Portfolio</h1>
          <p class="hero-sub">
            I build AI systems, robotics, and sturdy things in the real world.
            Explore selected work across software, web3, and construction.
          </p>
          <div class="hero-ctas">
            <a class="btn" href="#/projects">Explore Now</a>
            <a class="btn secondary" href="#/resumes"><span class="play" aria-hidden="true"></span> HIRE WEBBABY</a>
          </div>
        </div>
      </div>
      <div class="page-index">Page | 01</div>
    </section>`;
  target.removeAttribute("aria-busy");
}
