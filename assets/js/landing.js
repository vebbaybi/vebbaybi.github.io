// assets/js/landing.js
// Landing overlay animations (typing → explosion → falling line(s) → redirect to /home.html)
// Mobile-safe: adaptive character spacing with overflow prevention + optional two-line split.
// Plays nice with app.js boot timing and boot.js gating.

(() => {
  "use strict";

  // ----------------------------- CONFIG -----------------------------
  const text1  = "1807 ~ Iter";
  const text2  = "Welcome to the rain...";
  const colors = ["#60a5fa", "#2563eb", "#06b6d4", "#ff00ff"];

  // Where to go after the sequence so boot.js can gate the puzzle
  const REDIRECT_TARGET = "/home.html";

  // Per-char timing (keep in sync with your CSS if it reads --delay / --final-drop-delay)
  const TYPE_INTERVAL_MS       = 120;
  const EXPLOSION_DELAY_MS     = 800;
  const EXPLOSION_DURATION_MS  = 3300; // match CSS explosion keyframes length
  const FORMATION_STAGGER_MS   = 150;  // ms per character delay
  const FORMATION_SETTLE_MS    = 1000; // extra time after last char becomes visible
  const FINAL_DROP_STAGGER_MS  = 50;   // ms per character delay for final drop
  const FINAL_DROP_TOTAL_MS    = 2500; // match your CSS final-drop animation

  // Layout clamps (in rem units; converted to px at runtime)
  const STEP_MIN_REM = 0.75;  // min spacing step between chars
  const STEP_MAX_REM = 1.40;  // max spacing step between chars
  const VIEW_MARGIN  = 0.92;  // keep content within 92% of viewport width
  const LINE_GAP_EM  = 1.2;   // vertical gap between two lines (em)

  // ----------------------------- DOM HOOKS -----------------------------
  const typingArea   = document.getElementById("typing-area");
  const explosionDiv = document.getElementById("explosion");
  if (!explosionDiv) return;

  // Ensure overlay is a full-viewport centered layer
  explosionDiv.style.display        = "flex";
  explosionDiv.style.position       = "fixed";
  explosionDiv.style.inset          = "0";
  explosionDiv.style.alignItems     = "center";
  explosionDiv.style.justifyContent = "center";
  explosionDiv.style.pointerEvents  = "none";
  explosionDiv.style.textAlign      = "center";
  explosionDiv.style.fontSize       = "clamp(18px, 6vw, 32px)"; // mobile-friendly text scale

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----------------------------- TIMER MANAGEMENT -----------------------------
  const timeouts  = new Set();
  const intervals = new Set();

  const later = (fn, ms) => {
    const id = setTimeout(() => { timeouts.delete(id); try { fn(); } catch {} }, ms);
    timeouts.add(id);
    return id;
  };
  const every = (fn, ms) => {
    const id = setInterval(() => { try { fn(); } catch {} }, ms);
    intervals.add(id);
    return id;
  };
  const cleanup = () => {
    timeouts.forEach(clearTimeout);  timeouts.clear();
    intervals.forEach(clearInterval); intervals.clear();
  };
  window.addEventListener("beforeunload", cleanup);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cleanup(); });

  // ----------------------------- BINARY RAIN -----------------------------
  function startBinaryRain() {
    const rainContainer = document.createElement("div");
    rainContainer.className = "binary-rain rain-container";
    document.body.appendChild(rainContainer);

    const createRaindrop = () => {
      const drop = document.createElement("span");
      drop.className = "binary-drop raindrop";
      drop.textContent = Math.random() > 0.5 ? "0" : "1";
      drop.style.left = `${Math.random() * 100}vw`;
      drop.style.color = colors[Math.floor(Math.random() * colors.length)];
      drop.style.animationDelay = `${Math.random() * 2}s`;
      rainContainer.appendChild(drop);
      drop.addEventListener("animationend", () => drop.remove(), { once: true });
    };

    if (!reducedMotion) {
      every(createRaindrop, 75);
      for (let i = 0; i < 50; i++) createRaindrop();
    }
  }

  // ----------------------------- HELPERS -----------------------------
  const getRemPx = (el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize || "16");
    return Number.isFinite(fs) ? fs : 16;
  };

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const nearestSpaceSplit = (s) => {
    // return index of space nearest center; -1 if none
    const mid = Math.floor(s.length / 2);
    let left = mid, right = mid;
    while (left >= 0 || right < s.length) {
      if (left >= 0  && s[left]  === " ") return left;
      if (right < s.length && s[right] === " ") return right;
      left--; right++;
    }
    return -1;
  };

  // Decide single-line vs two-line + compute step (px) that fits width
  const planLayout = (phrase, viewportW, basePx) => {
    // try single-line
    const stepMaxPx = STEP_MAX_REM * basePx;
    const stepMinPx = STEP_MIN_REM * basePx;

    // First pass: target ~90% of vw per full phrase
    let stepPx = clamp(0.9 * (viewportW / phrase.length), stepMinPx, stepMaxPx);
    const wouldFit = (stepPx * phrase.length) <= (viewportW * VIEW_MARGIN);

    if (wouldFit) {
      return {
        lines: [{ text: phrase, topPx: 0 }],
        stepPx,
        split: false
      };
    }

    // Two-line strategy: split at nearest space to center
    const splitAt = nearestSpaceSplit(phrase);
    if (splitAt === -1) {
      // No spaces; keep single line but at min step — still centered (last resort)
      return {
        lines: [{ text: phrase, topPx: 0 }],
        stepPx: stepMinPx,
        split: false
      };
    }

    const a = phrase.slice(0, splitAt).trim();
    const b = phrase.slice(splitAt + 1).trim();

    // Re-compute step based on the longer line so BOTH lines fit
    const longest = Math.max(a.length, b.length);
    stepPx = clamp(0.9 * (viewportW / longest), stepMinPx, stepMaxPx);

    const lineGapPx = LINE_GAP_EM * basePx;

    return {
      lines: [
        { text: a, topPx: -lineGapPx / 1 }, // above center
        { text: b, topPx:  lineGapPx / 1 }  // below center
      ],
      stepPx,
      split: true
    };
  };

  // ----------------------------- TEXT 1 (TYPE → EXPLODE) -----------------------------
  function animateText1(next) {
    // Host so flex centering stays reliable
    const lineHost = document.createElement("div");
    lineHost.style.position = "relative";
    lineHost.style.display  = "inline-block";
    explosionDiv.appendChild(lineHost);

    const chars1 = text1.split("").map((ch, i) => {
      const span = document.createElement("span");
      span.className = "char type-char";
      span.textContent = ch;
      span.style.color = colors[i % colors.length];
      lineHost.appendChild(span);
      return span;
    });

    let idx = 0;
    const typeNext = () => {
      if (idx >= chars1.length) {
        later(explode, EXPLOSION_DELAY_MS);
        return;
      }
      chars1[idx].classList.add("visible");
      idx += 1;
      later(typeNext, TYPE_INTERVAL_MS);
    };

    const explode = () => {
      if (!reducedMotion) {
        lineHost.classList.add("exploding");
        chars1.forEach((char, i) => {
          const angle = (Math.PI * 2 * i) / Math.max(chars1.length, 1) + Math.random() * 0.4;
          const velocity = 80 + Math.random() * 150;
          char.style.setProperty("--dx",  `${Math.cos(angle) * velocity}px`);
          char.style.setProperty("--dy",  `${Math.sin(angle) * velocity}px`);
          char.style.setProperty("--rot", `${(Math.random() - 0.5) * 540}deg`);
        });
      }
      later(() => { try { lineHost.remove(); } catch {} ; next(); }, reducedMotion ? 0 : EXPLOSION_DURATION_MS);
    };

    typeNext();
  }

  // ----------------------------- TEXT 2 (FALL → FINAL DROP → REDIRECT) -----------------------------
  function animateText2() {
    // Compute adaptive layout for phone widths
    const viewportW = Math.max(320, Math.min(screen.width, window.innerWidth || 0) || 360);
    const remPx     = getRemPx(explosionDiv);
    const layout    = planLayout(text2, viewportW, remPx);

    // Group host keeps multiple lines centered as a single block
    const group = document.createElement("div");
    group.style.position = "relative";
    group.style.display  = "inline-block";
    explosionDiv.appendChild(group);

    // Build lines
    const allChars = [];
    layout.lines.forEach((line, lineIdx) => {
      const mid = (line.text.length - 1) / 2;
      const lineHost = document.createElement("div");
      lineHost.style.position = "relative"; // visual grouping only
      lineHost.style.display  = "block";
      group.appendChild(lineHost);

      line.text.split("").forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "char fall-char";
        span.textContent = ch;
        span.style.color = colors[(i + lineIdx) % colors.length];

        // Absolute against the fixed overlay: position around center using pixel math
        // We avoid CSS custom properties here for robustness.
        const dx = (i - mid) * layout.stepPx;
        span.style.position = "absolute";
        span.style.left  = `calc(50% + ${dx.toFixed(2)}px)`;
        span.style.top   = `calc(50% + ${line.topPx.toFixed(2)}px)`;

        // Per-character delays (your CSS should respect --delay / --final-drop-delay)
        span.style.setProperty("--delay", `${i * FORMATION_STAGGER_MS}ms`);

        lineHost.appendChild(span);
        allChars.push(span);
      });
    });

    // Trigger initial fall into place
    later(() => { allChars.forEach(c => c.classList.add("visible")); }, 100);

    // Determine formation time from the *longest* line
    const longestLineLen = Math.max(...layout.lines.map(l => l.text.length));
    const formationTime  = (longestLineLen * FORMATION_STAGGER_MS) + FORMATION_SETTLE_MS;

    // After formation, cascade the final drop then navigate
    later(() => {
      allChars.forEach((char, i) => {
        char.classList.add("final-drop");
        char.style.setProperty("--final-drop-delay", `${i * FINAL_DROP_STAGGER_MS}ms`);
      });

      later(() => {
        try { allChars.forEach(c => c.remove()); group.remove(); } catch {}
        window.location.assign(REDIRECT_TARGET);
      }, FINAL_DROP_TOTAL_MS);
    }, formationTime);
  }

  // ----------------------------- REDUCED MOTION -----------------------------
  function staticFallback() {
    const host = typingArea || explosionDiv;
    const line = document.createElement("div");
    line.textContent = `${text1} — ${text2}`;
    line.style.color = colors[0];
    line.style.fontWeight = "bold";
    line.style.fontSize = "clamp(18px, 6vw, 32px)";
    line.style.maxWidth = "90vw";
    line.style.margin = "0 auto";
    line.style.textAlign = "center";
    host.appendChild(line);

    later(() => window.location.assign(REDIRECT_TARGET), 800);
  }

  // ----------------------------- INIT -----------------------------
  function init() {
    if (reducedMotion) {
      staticFallback();
      return;
    }
    startBinaryRain();
    animateText1(animateText2);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
