/* =======================================================================================
  1807 — Home Page Renderer (+ Eyebrow Typewriter)
  - Exports: render(target)
  - Eyebrow typewriter: per-char transient color, then reverts to white
  - Respects prefers-reduced-motion
  - Pauses on tab hidden, resumes on visible
  - Cleans up timers/listeners between re-renders
  - No auto-mount (works in SPA routers)
  Author: webbaby
  ======================================================================================= */

const CONFIG = Object.freeze({
  heroImg: "/assets/images/thedev.webp",
  phrases: ["I CODE", "I BUILD", "I CREATE", "FOR THAT I AM", "WELCOME TO THE RAIN..."],
  selector: "#eyebrow-rotator",
  typeMs: 55,
  eraseMs: 28,
  pauseMs: 1200,
  colors: [
    "#60a5fa", // blue-400
    "#93c5fd", // blue-300
    "#2563eb", // blue-600
    "#b68b4c", // tan-600
    "#d6a76a", // tan-500
    "#f5e9da"  // tan-100
  ]
});

/** Internal typewriter state (module-scoped so we can clean up between renders) */
let tw = {
  el: null,
  phrases: [],
  iPhrase: 0,
  iChar: 0,
  typing: true,
  timer: null,
  prevColor: null,
  isReducedMotion: false,
  isPausedByVisibility: false,
  boundVisibilityHandler: null
};

/** Safely stop timers and listeners (called before every render) */
function cleanupTypewriter() {
  if (tw.timer) {
    clearTimeout(tw.timer);
    tw.timer = null;
  }
  if (tw.boundVisibilityHandler) {
    document.removeEventListener("visibilitychange", tw.boundVisibilityHandler);
    tw.boundVisibilityHandler = null;
  }
  // keep reduces-motion flag; reset the rest
  tw.el = null;
  tw.phrases = [];
  tw.iPhrase = 0;
  tw.iChar = 0;
  tw.typing = true;
  tw.prevColor = null;
  tw.isPausedByVisibility = false;
}

/** Initialize and start the typewriter on the eyebrow within a specific root */
function startTypewriter(root) {
  tw.isReducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  tw.el = root.querySelector(CONFIG.selector);
  if (!tw.el) {
    // This is the core fix: if the element isn't found, wait for a moment and try again.
    setTimeout(() => startTypewriter(root), 10);
    return;
  }

  // Load phrases (from data-phrases if present, else CONFIG)
  try {
    const raw = tw.el.getAttribute("data-phrases");
    tw.phrases = raw ? JSON.parse(raw) : CONFIG.phrases.slice();
  } catch {
    tw.phrases = CONFIG.phrases.slice();
  }
  if (!Array.isArray(tw.phrases) || tw.phrases.length === 0) {
    tw.phrases = CONFIG.phrases.slice();
  }

  if (tw.isReducedMotion) {
    // No animation: show current phrase as plain text
    tw.el.textContent = tw.phrases[0] || "WELCOME TO THE RAIN...";
    return;
  }

  // Prepare container
  tw.el.textContent = "";
  appendLineNode();

  tw.iPhrase = 0;
  tw.iChar = 0;
  tw.typing = true;

  tw.boundVisibilityHandler = onVisibilityChange;
  document.addEventListener("visibilitychange", tw.boundVisibilityHandler);

  loopTypewriter();
}

function appendLineNode() {
  if (!tw.el) return;
  const line = document.createElement("span");
  line.className = "tw-line";
  tw.el.appendChild(line);
}

function getLineNode() {
  return tw.el ? tw.el.querySelector(".tw-line") : null;
}

function pickTypingColor() {
  const pool = CONFIG.colors.filter(c => c !== tw.prevColor);
  const choice = pool[Math.floor(Math.random() * pool.length)] || CONFIG.colors[0];
  tw.prevColor = choice;
  return choice;
}

function onVisibilityChange() {
  if (document.hidden) {
    tw.isPausedByVisibility = true;
    if (tw.timer) {
      clearTimeout(tw.timer);
      tw.timer = null;
    }
  } else if (tw.isPausedByVisibility && !tw.isReducedMotion) {
    tw.isPausedByVisibility = false;
    loopTypewriter();
  }
}

function loopTypewriter() {
  const line = getLineNode();
  if (!line) return;

  const phrase = tw.phrases[tw.iPhrase] || "";

  if (tw.typing) {
    if (tw.iChar < phrase.length) {
      const ch = phrase[tw.iChar];
      const span = document.createElement("span");
      span.className = "tw-char is-typing";
      span.style.setProperty("--typing-color", pickTypingColor());
      span.textContent = ch;
      line.appendChild(span);

      // Revert previous char to default white
      const prev = line.children[line.children.length - 2];
      if (prev && prev.classList.contains("tw-char")) prev.classList.remove("is-typing");

      tw.iChar++;
      tw.timer = setTimeout(loopTypewriter, CONFIG.typeMs);
      return;
    }
    // End of phrase: ensure last char reverts
    const last = line.children[line.children.length - 1];
    if (last) last.classList.remove("is-typing");
    tw.typing = false;
    tw.timer = setTimeout(loopTypewriter, CONFIG.pauseMs);
    return;
  } else {
    // Erase backwards
    if (tw.iChar > 0) {
      line.removeChild(line.lastChild);
      tw.iChar--;
      tw.timer = setTimeout(loopTypewriter, CONFIG.eraseMs);
      return;
    }
    // Next phrase
    tw.typing = true;
    tw.iPhrase = (tw.iPhrase + 1) % tw.phrases.length;
    tw.timer = setTimeout(loopTypewriter, CONFIG.typeMs);
  }
}

/* Ensure caret blink keyframes exist once per document (idempotent) */
function ensureCaretKeyframes() {
  const STYLE_ID = "tw-caret-style";
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `@keyframes tw-caret-blink { 50% { opacity: 0; } }`;
  document.head.appendChild(style);
}

/* =======================================================================================
  PUBLIC: render(target)
  Renders the hero and wires the eyebrow typewriter (scoped to target).
  ======================================================================================= */
export async function render(target) {
  if (!target) return;

  // Clean up any previous timers/listeners before re-rendering
  cleanupTypewriter();

  target.setAttribute("aria-busy", "true");

  const phrasesAttr = JSON.stringify(CONFIG.phrases);

  target.innerHTML = `
    <section class="home-hero" aria-labelledby="intro-heading">
      <div class="hero-left">
        <img class="hero-img"
             src="${CONFIG.heroImg}"
             alt="Uchenna Anozie (webbaby)"
             width="720"
             height="900"
             loading="eager"
             decoding="async"
             fetchpriority="high" />
      </div>

      <div class="hero-right">
        <div class="hero-content">
          <div class="eyebrow" aria-hidden="true">
            <span class="tw-wrapper" style="position:relative;white-space:nowrap">
              <span id="eyebrow-rotator"
                    class="tw-line"
                    data-phrases='${phrasesAttr}'>WELCOME TO THE RAIN...</span>
              <span class="tw-caret"
                    aria-hidden="true"
                    style="display:inline-block;width:2px;height:1em;margin-left:6px;background:linear-gradient(180deg,var(--primary),var(--secondary));vertical-align:-0.15em;animation:tw-caret-blink 1s steps(2,start) infinite"></span>
            </span>
          </div>

          <h1 class="hero-title" id="intro-heading">
            <span>My name is Uchenna — Computer Scientist</span><br />
            <span class="subline">Emerging Data Science, AI &amp; Embedded Systems Professional | Blockchain Enthusiast</span>
          </h1>

          <p class="hero-sub">
            I’m building a broad, adaptable foundation across software, hardware, and data — so I can tackle complex
            problems from multiple angles and deliver real-world impact.
          </p>

          <p class="hero-sub-full">
            My core is Computer Science (B.Sc.): algorithms, data structures, and solid programming in Python, C/C++, and Rust.
            I’ve branched into Data Science to design reliable pipelines (cleaning, validation, EDA, visualization) that power intelligent systems.
            In parallel, I self-taught embedded hardware and automation — shipping working prototypes with Arduino, Raspberry Pi, and ESP32, integrating sensors and IoT logic in embedded C/C++.
            I also build practical tooling for blockchain (DEX integrations, smart-contract analysis, anti-rug heuristics, and Web3 automation).
            This breadth shows I learn fast, reason deeply, and execute with discipline — ready to support research, engineering, or product teams end-to-end.
          </p>

          <ul class="hero-highlights" aria-label="Key capabilities">
            <li><strong>Computer Science:</strong> B.Sc.; algorithms, data structures, OOP, design patterns</li>
            <li><strong>AI &amp; IT:</strong> Python (automation, NLP, model pipelines), C/C++, Rust, PineScript</li>
            <li><strong>AI &amp; Data Science:</strong> Data wrangling, cleaning, validation, visualization, EDA, ML basics, NLP</li>
            <li><strong>Embedded Systems &amp; IoT:</strong> Arduino, Raspberry Pi, ESP32, sensor fusion, embedded C/C++</li>
            <li><strong>Blockchain &amp; Trading:</strong> DEX integrations, smart-contract auditing, anti-rug heuristics, Web3 scripting</li>
            <li><strong>Research &amp; Data Handling:</strong> Data entry, clinical/operational databases, compliance documentation (IRB/FDA-style), system queries, audit trails</li>
            <li><strong>Microsoft Office:</strong> Word, Excel, PowerPoint, Outlook (advanced docs, reporting, and spreadsheet analysis)</li>
            <li><strong>Construction:</strong> Site coordination, workflow organization, precision installation</li>
          </ul>

          <div class="hero-ctas">
            <a class="btn" href="#/projects" aria-label="Explore projects">Explore Now</a>
            <a class="btn secondary" href="#/resumes" aria-label="View resumes and hire">
              <span class="play" aria-hidden="true"></span> Hire webbaby
            </a>
          </div>
        </div>
      </div>

      <div class="page-index" aria-hidden="true">Page | 01</div>
    </section>
  `;

  target.removeAttribute("aria-busy");

  // Start the typewriter after DOM is in place (scoped to this target)
  startTypewriter(target);

  // Ensure caret keyframes exist
  ensureCaretKeyframes();
}

/* ------------------------------ HMR Guard ------------------------------ */
try {
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => cleanupTypewriter());
  }
} catch (_) {
  /* non-module envs: no-op */
}