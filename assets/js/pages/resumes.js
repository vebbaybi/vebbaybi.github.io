





(function () {
  "use strict";





  function $(sel, root = document) { return root.querySelector(sel); }





  let TW_STATE = { timer: null, reduced: false };

  function initTypewriter() {
    const host = $("#eyebrow-rotator");
    if (!host) return;

    TW_STATE.reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);



    let line = host;
    if (!host.classList.contains("tw-line")) {
      line = host.querySelector(".tw-line");
      if (!line) {
        line = document.createElement("span");
        line.className = "tw-line";
        host.appendChild(line);
      }
    }


    let phrases;
    try {
      const raw = host.getAttribute("data-phrases");
      phrases = raw ? JSON.parse(raw) : null;
    } catch {  }
    if (!Array.isArray(phrases) || phrases.length === 0) phrases = ["WELCOME TO THE RAIN..."];


    if (TW_STATE.reduced) {
      line.textContent = phrases[0] || "";
      return;
    }


    const colors = ["#60a5fa", "#93c5fd", "#2563eb", "#b68b4c", "#d6a76a", "#f5e9da"];
    const pickColor = (prev) => {
      const pool = colors.filter(c => c !== prev);
      return pool[Math.floor(Math.random() * pool.length)] || colors[0];
    };

    let ip = 0, ic = 0, typing = true, prevColor = null;


    line.textContent = "";

    function step() {
      const text = phrases[ip] || "";
      if (typing) {
        if (ic < text.length) {
          const span = document.createElement("span");
          span.className = "tw-char is-typing";
          const color = pickColor(prevColor); prevColor = color;
          span.style.color = color;
          span.textContent = text[ic];
          line.appendChild(span);

          const prevChar = line.children[line.children.length - 2];
          if (prevChar && prevChar.classList.contains("tw-char")) prevChar.classList.remove("is-typing");

          ic++;
          TW_STATE.timer = setTimeout(step, 55);
          return;
        }
        const last = line.lastElementChild;
        if (last) last.classList.remove("is-typing");
        typing = false;
        TW_STATE.timer = setTimeout(step, 1200);
        return;
      } else {
        if (ic > 0) {
          line.removeChild(line.lastChild);
          ic--;
          TW_STATE.timer = setTimeout(step, 28);
          return;
        }
        typing = true; ip = (ip + 1) % phrases.length;
        TW_STATE.timer = setTimeout(step, 55);
      }
    }

    step();


    const onVis = () => {
      if (document.hidden) {
        if (TW_STATE.timer) { clearTimeout(TW_STATE.timer); TW_STATE.timer = null; }
      } else if (!TW_STATE.reduced && !TW_STATE.timer) {
        step();
      }
    };
    document.addEventListener("visibilitychange", onVis);


    TW_STATE.cleanup = () => {
      if (TW_STATE.timer) { clearTimeout(TW_STATE.timer); TW_STATE.timer = null; }
      document.removeEventListener("visibilitychange", onVis);
    };
  }




  function boot() {
    initTypewriter();


    setTimeout(() => {
      const host = document.querySelector("#eyebrow-rotator");
      if (host && !host.textContent.trim()) {
        if (typeof TW_STATE.cleanup === "function") TW_STATE.cleanup();
        initTypewriter();
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();