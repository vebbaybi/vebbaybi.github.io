/* =======================================================================================
   1807 — Home Page Typewriter (Eyebrow)
   - Per-character transient color; respects prefers-reduced-motion
   - Pauses on tab hidden; HMR-safe cleanup
   - Gated by SITE_READY so it never runs under the intro overlay
   Author: webbaby
   ======================================================================================= */

const CONFIG = Object.freeze({
  selector: "#eyebrow-rotator",
  typeMs: 55,
  eraseMs: 28,
  pauseMs: 1200,
  colors: ["#60a5fa","#93c5fd","#2563eb","#b68b4c","#d6a76a","#f5e9da"]
});

let tw = {
  el: null, phrases: [], iPhrase: 0, iChar: 0,
  typing: true, timer: null, prevColor: null,
  isReducedMotion: false, isPausedByVisibility: false
};

function mount() {
  tw.isReducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  tw.el = document.querySelector(CONFIG.selector);
  if (!tw.el) return;

  try {
    const raw = tw.el.getAttribute("data-phrases");
    tw.phrases = raw ? JSON.parse(raw) : [fallbackText()];
  } catch { tw.phrases = [fallbackText()]; }

  if (!Array.isArray(tw.phrases) || tw.phrases.length === 0) tw.phrases = [fallbackText()];

  if (tw.isReducedMotion) { tw.el.textContent = tw.phrases[tw.iPhrase] || fallbackText(); return; }

  tw.el.textContent = ""; appendLineNode();
  tw.iPhrase = 0; tw.iChar = 0; tw.typing = true;

  document.addEventListener("visibilitychange", onVisibilityChange);
  loopTypewriter();
}

function cleanup() {
  stopTyping();
  document.removeEventListener("visibilitychange", onVisibilityChange);
}

function fallbackText() { return "WELCOME TO THE RAIN..."; }

function appendLineNode() {
  if (!tw.el) return;
  const line = document.createElement("span");
  line.className = "tw-line";
  tw.el.appendChild(line);
}

function getLineNode() { return tw.el ? tw.el.querySelector(".tw-line") : null; }

function pickTypingColor() {
  const pool = CONFIG.colors.filter(c => c !== tw.prevColor);
  const choice = pool[Math.floor(Math.random() * pool.length)] || CONFIG.colors[0];
  tw.prevColor = choice; return choice;
}

function onVisibilityChange() {
  if (document.hidden) { tw.isPausedByVisibility = true; stopTyping(); }
  else if (tw.isPausedByVisibility && !tw.isReducedMotion) { tw.isPausedByVisibility = false; loopTypewriter(); }
}

function loopTypewriter() {
  const line = getLineNode(); if (!line) return;
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

/* Start (gated by SITE_READY) */
if (window.__SITE_READY__) {
  mount();
} else {
  window.addEventListener('SITE_READY', mount, { once: true });
}

/* HMR guard */
try {
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => cleanup());
  }
} catch { /* no-op */ }

export async function render(target) {
  if (!target) return;
  target.setAttribute('aria-busy', 'true');
  const heroImg = '/assets/images/thedev.webp';
  target.innerHTML = `
    <section class="home-hero">
      <div class="hero-left">
        <img class="hero-img" src="${heroImg}" alt="Portrait" loading="eager" />
      </div>
      <div class="hero-right">
        <div class="hero-content">
          <span class="eyebrow">Welcome to My Portfolio Page</span>
          <h1 class="hero-title">My<br/>Portfolio</h1>
          <p class="hero-sub">
            I build AI systems, robotics, and sturdy things in the real world.
            Explore selected work across software, web3, and construction.
          </p>
          <div class="hero-ctas">
            <a class="btn" href="#/projects">Explore Now</a>
            <a class="btn secondary" href="#/resumes">
              <span class="play" aria-hidden="true"></span> HIRE WEBBABY
            </a>
          </div>
        </div>
      </div>
      <div class="page-index">Page | 01</div>
    </section>`;
  target.removeAttribute('aria-busy');
}
