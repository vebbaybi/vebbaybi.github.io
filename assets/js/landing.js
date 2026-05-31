




(() => {
  "use strict";


  const text1  = "1807 ~ Iter";
  const text2  = "Welcome to the rain...";
  const colors = ["#60a5fa", "#2563eb", "#06b6d4", "#ff00ff"];


  const REDIRECT_TARGET = "/home/";


  const TYPE_INTERVAL_MS       = 120;
  const EXPLOSION_DELAY_MS     = 800;
  const EXPLOSION_DURATION_MS  = 3300;
  const FORMATION_STAGGER_MS   = 150;
  const FORMATION_SETTLE_MS    = 1000;
  const FINAL_DROP_STAGGER_MS  = 50;
  const FINAL_DROP_TOTAL_MS    = 2500;


  const STEP_MIN_REM = 0.75;
  const STEP_MAX_REM = 1.40;
  const VIEW_MARGIN  = 0.92;
  const LINE_GAP_EM  = 1.2;


  const typingArea   = document.getElementById("typing-area");
  const explosionDiv = document.getElementById("explosion");
  if (!explosionDiv) return;


  explosionDiv.style.display        = "flex";
  explosionDiv.style.position       = "fixed";
  explosionDiv.style.inset          = "0";
  explosionDiv.style.alignItems     = "center";
  explosionDiv.style.justifyContent = "center";
  explosionDiv.style.pointerEvents  = "none";
  explosionDiv.style.textAlign      = "center";
  explosionDiv.style.fontSize       = "clamp(18px, 6vw, 32px)";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


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


  const getRemPx = (el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize || "16");
    return Number.isFinite(fs) ? fs : 16;
  };

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const nearestSpaceSplit = (s) => {

    const mid = Math.floor(s.length / 2);
    let left = mid, right = mid;
    while (left >= 0 || right < s.length) {
      if (left >= 0  && s[left]  === " ") return left;
      if (right < s.length && s[right] === " ") return right;
      left--; right++;
    }
    return -1;
  };


  const planLayout = (phrase, viewportW, basePx) => {

    const stepMaxPx = STEP_MAX_REM * basePx;
    const stepMinPx = STEP_MIN_REM * basePx;


    let stepPx = clamp(0.9 * (viewportW / phrase.length), stepMinPx, stepMaxPx);
    const wouldFit = (stepPx * phrase.length) <= (viewportW * VIEW_MARGIN);

    if (wouldFit) {
      return {
        lines: [{ text: phrase, topPx: 0 }],
        stepPx,
        split: false
      };
    }


    const splitAt = nearestSpaceSplit(phrase);
    if (splitAt === -1) {

      return {
        lines: [{ text: phrase, topPx: 0 }],
        stepPx: stepMinPx,
        split: false
      };
    }

    const a = phrase.slice(0, splitAt).trim();
    const b = phrase.slice(splitAt + 1).trim();


    const longest = Math.max(a.length, b.length);
    stepPx = clamp(0.9 * (viewportW / longest), stepMinPx, stepMaxPx);

    const lineGapPx = LINE_GAP_EM * basePx;

    return {
      lines: [
        { text: a, topPx: -lineGapPx / 1 },
        { text: b, topPx:  lineGapPx / 1 }
      ],
      stepPx,
      split: true
    };
  };


  function animateText1(next) {

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


  function animateText2() {

    const viewportW = Math.max(320, Math.min(screen.width, window.innerWidth || 0) || 360);
    const remPx     = getRemPx(explosionDiv);
    const layout    = planLayout(text2, viewportW, remPx);


    const group = document.createElement("div");
    group.style.position = "relative";
    group.style.display  = "inline-block";
    explosionDiv.appendChild(group);


    const allChars = [];
    layout.lines.forEach((line, lineIdx) => {
      const mid = (line.text.length - 1) / 2;
      const lineHost = document.createElement("div");
      lineHost.style.position = "relative";
      lineHost.style.display  = "block";
      group.appendChild(lineHost);

      line.text.split("").forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "char fall-char";
        span.textContent = ch;
        span.style.color = colors[(i + lineIdx) % colors.length];



        const dx = (i - mid) * layout.stepPx;
        span.style.position = "absolute";
        span.style.left  = `calc(50% + ${dx.toFixed(2)}px)`;
        span.style.top   = `calc(50% + ${line.topPx.toFixed(2)}px)`;


        span.style.setProperty("--delay", `${i * FORMATION_STAGGER_MS}ms`);

        lineHost.appendChild(span);
        allChars.push(span);
      });
    });


    later(() => { allChars.forEach(c => c.classList.add("visible")); }, 100);


    const longestLineLen = Math.max(...layout.lines.map(l => l.text.length));
    const formationTime  = (longestLineLen * FORMATION_STAGGER_MS) + FORMATION_SETTLE_MS;


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
