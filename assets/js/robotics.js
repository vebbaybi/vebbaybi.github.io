/* 1807-chain — robotics.js (v1.0)
   Robotics page interactions
   - Banner-on-top then fade-out to reveal/activate video
   - Resilient sticky video recalcs on resize/orientation
   - Intersection-based activation for cards/stats (adds .active)
   - Gallery strip: horizontal wheel + arrow key navigation
*/

(() => {
  'use strict';

  // ---------- utils ----------
  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on  = (t, e, h, o) => t.addEventListener(e, h, o);

  const rafThrottle = (fn, fps = 60) => {
    const frameTime = 1000 / fps; let last = 0; let id = null; let queuedArgs = null;
    return function throttled(...args) {
      const now = performance.now(); queuedArgs = args;
      if (!id) {
        const delay = Math.max(0, frameTime - (now - last));
        id = setTimeout(() => {
          id = null; last = performance.now();
          requestAnimationFrame(() => fn.apply(this, queuedArgs));
        }, delay);
      }
    };
  };

  const defer = (ms) => new Promise(res => setTimeout(res, ms));

  // ---------- scrolly video: banner over video → fade on first interact ----------
  function initScrollyVideo() {
    const wrap  = qs('.page-hero .scrolly-video') || qs('.scrolly-video');
    if (!wrap) return;

    const banner = qs('.scrolly-banner', wrap);
    const video  = qs('video.hero-video', wrap);
    let started = false; let cleaned = false;

    const startPlayback = async () => {
      if (started) return; started = true;
      wrap.classList.add('playing');

      // After transition, fully remove banner from flow for perf
      if (banner) {
        const removeAfter = () => {
          banner.classList.add('is-gone');
          banner.removeEventListener('transitionend', removeAfter);
        };
        banner.addEventListener('transitionend', removeAfter);
        // Fallback in case transitionend doesn't fire
        setTimeout(removeAfter, 800);
      }

      if (video) {
        // Ensure muted/inline for mobile autoplay, then try play
        video.muted = true; video.playsInline = true;
        try { await video.play(); } catch (_) { /* ignore autoplay rejections */ }
      }

      detachFirstInteraction();
    };

    const firstInteraction = (evt) => {
      // Ignore interactions coming from within controls that should not trigger
      startPlayback();
    };

    function attachFirstInteraction() {
      if (cleaned) cleaned = false;
      ['click','keydown','touchstart','pointerdown','wheel','scroll'].forEach(evt => on(document, evt, firstInteraction, { passive: true }));
    }

    function detachFirstInteraction() {
      if (cleaned) return; cleaned = true;
      ['click','keydown','touchstart','pointerdown','wheel','scroll'].forEach(evt => document.removeEventListener(evt, firstInteraction, { passive: true }));
    }

    attachFirstInteraction();

    // Also react to an explicit trigger if present on page (e.g., .trigger-start)
    const trigger = qs('.trigger-start') || qs('#panel-intro .trigger-start');
    if (trigger) on(trigger, 'click', (e) => { e.preventDefault(); startPlayback(); }, { passive: false });

    // Visibility handling: pause when tab hidden; resume on visible (best-effort)
    on(document, 'visibilitychange', () => {
      if (!video) return;
      if (document.hidden) {
        try { video.pause(); } catch(_) {}
      } else if (started) {
        video.muted = true; video.playsInline = true;
        video.play().catch(() => {});
      }
    });
  }

  // ---------- sticky recalc guard (Safari/iOS quirks) ----------
  function initStickyRecalc() {
    const wrap = qs('.page-hero .scrolly-video') || qs('.scrolly-video');
    if (!wrap) return;

    const bump = () => {
      // Toggle a transform to force a repaint without layout thrash
      wrap.style.transform = 'translateZ(0)';
      // Force reflow, then clear
      void wrap.offsetTop; // eslint-disable-line no-unused-expressions
      wrap.style.transform = '';
    };

    const handle = rafThrottle(bump, 30);
    on(window, 'resize', handle, { passive: true });
    on(window, 'orientationchange', handle, { passive: true });
  }

  // ---------- intersection activation for cards/stats ----------
  function initActivations() {
    const targets = qsa('.card, .arch-card, .stat, .scrolly__panel');
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > 0.28) {
          e.target.classList.add('active');
        } else {
          e.target.classList.remove('active');
        }
      }
    }, { root: null, rootMargin: '0px', threshold: [0, 0.15, 0.28, 0.5, 0.85] });

    targets.forEach(t => io.observe(t));
  }

  // ---------- gallery strip: wheel + keys ----------
  function initGallery() {
    const strip = qs('.gallery-strip');
    if (!strip) return;

    // Ensure focusable for key controls
    if (!strip.hasAttribute('tabindex')) strip.setAttribute('tabindex', '0');

    const scrollBy = (dx) => {
      // Use native smooth scroll when possible
      try { strip.scrollBy({ left: dx, behavior: 'smooth' }); }
      catch { strip.scrollLeft += dx; }
    };

    const wheel = (e) => {
      // If vertical wheel, convert to horizontal scroll
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const factor = e.shiftKey ? 2.2 : 1.2;
        scrollBy(e.deltaY * factor);
      }
    };

    on(strip, 'wheel', wheel, { passive: false });

    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault(); scrollBy(Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); scrollBy(-Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'Home') {
        e.preventDefault(); strip.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault(); strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      }
    };

    on(strip, 'keydown', key);

    // Resize observer to keep snap feel consistent
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        // Nudge to trigger snap adjustment
        const l = strip.scrollLeft; strip.scrollLeft = l + 1; strip.scrollLeft = l;
      });
      ro.observe(strip);
    }
  }

  // ---------- boot ----------
  function init() {
    initScrollyVideo();
    initStickyRecalc();
    initActivations();
    initGallery();
  }

  if (document.readyState === 'loading') {
    on(document, 'DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
