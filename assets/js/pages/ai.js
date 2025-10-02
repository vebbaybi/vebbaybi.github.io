/* 1807-chain — ai.js (v1.2)
   AI page interactions
   - Typewriter rotator for eyebrow (optional)
   - Intersection activation for cards/stats/arch/galleries
   - Stats counters
   - Gallery: wheel-to-scroll + arrow keys
*/

(() => {
  'use strict';

  // ---------- helpers ----------
  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on  = (t, e, h, o) => t.addEventListener(e, h, o);

  // ---------- typewriter (optional) ----------
  function initTypewriter() {
    const el = qs('#ai-rotator');
    if (!el) return;

    let phrases;
    try {
      const raw = el.getAttribute('data-phrases');
      phrases = raw ? JSON.parse(raw) : null;
    } catch { phrases = null; }
    if (!Array.isArray(phrases) || phrases.length === 0) {
      phrases = ['Edge AI • On-Device • Guardrails'];
    }

    const line = document.createElement('span');
    line.className = 'tw-line';
    el.innerHTML = '';
    el.appendChild(line);
    const caret = document.createElement('span');
    caret.className = 'tw-caret';
    el.appendChild(caret);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { line.textContent = phrases[0]; return; }

    let ip = 0, ic = 0, typing = true, timer = null;
    const typeMs = 55, eraseMs = 28, pauseMs = 1100;

    function step() {
      const text = phrases[ip] || '';
      if (typing) {
        if (ic < text.length) {
          const span = document.createElement('span');
          span.className = 'tw-char is-typing';
          span.textContent = text[ic];
          line.appendChild(span);
          const prev = line.children[line.children.length - 2];
          if (prev && prev.classList?.contains('tw-char')) prev.classList.remove('is-typing');
          ic++; timer = setTimeout(step, typeMs); return;
        }
        const last = line.lastElementChild; if (last) last.classList.remove('is-typing');
        typing = false; timer = setTimeout(step, pauseMs); return;
      } else {
        if (ic > 0) { line.removeChild(line.lastChild); ic--; timer = setTimeout(step, eraseMs); return; }
        typing = true; ip = (ip + 1) % phrases.length; timer = setTimeout(step, typeMs);
      }
    }
    step();
    on(window, 'beforeunload', () => clearTimeout(timer), { once: true });
  }

  // ---------- intersection activation + counters ----------
  function initActivations() {
    const nodes = qsa('.card, .arch-card, .stat, .gallery-item');
    if (!nodes.length) return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > 0.25) {
          e.target.classList.add('active');
          const n = e.target.querySelector?.('[data-count-target]');
          if (n && !n.dataset.counted) {
            n.dataset.counted = '1';
            animateNumber(n, parseInt(n.dataset.countTarget || '0', 10));
          }
        }
      }
    }, { threshold: [0, .25, .5, .75, 1] });

    nodes.forEach(n => io.observe(n));
  }

  function animateNumber(el, target) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = String(target); return; }
    const start = parseInt(el.textContent || '0', 10) || 0;
    const duration = 1200;
    let t0 = null;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      el.textContent = String(Math.floor(start + (target - start) * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- gallery scroll (wheel + keys) ----------
  function initGallery() {
    const strip = qs('.gallery-strip');
    if (!strip) return;

    if (!strip.hasAttribute('tabindex')) strip.setAttribute('tabindex', '0');

    const scrollBy = (dx) => {
      try { strip.scrollBy({ left: dx, behavior: 'smooth' }); }
      catch { strip.scrollLeft += dx; }
    };

    const wheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const factor = e.shiftKey ? 2.2 : 1.2;
        scrollBy(e.deltaY * factor);
      }
    };

    on(strip, 'wheel', wheel, { passive: false });

    on(strip, 'keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault(); scrollBy(Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); scrollBy(-Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'Home') {
        e.preventDefault(); strip.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault(); strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      }
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        const l = strip.scrollLeft; strip.scrollLeft = l + 1; strip.scrollLeft = l;
      });
      ro.observe(strip);
    }
  }

  // ---------- boot ----------
  function init() {
    initTypewriter();
    initActivations();
    initGallery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();