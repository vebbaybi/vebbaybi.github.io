/* =====================================================
   1807-chain — robotics.js (v2.0 – FINAL)
   SPEC:
   - Show robo.png on load
   - On first scroll (>100px) → fade out banner → play video ONCE
   - When video ends → fade in robo.png again
   - No repeat until page reload
   - Mobile-safe, no autoplay issues
   - Preserves sticky recalc, intersection, gallery
   ===================================================== */

(() => {
  'use strict';

  // ---------- Utils ----------
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (t, e, h, o) => t.addEventListener(e, h, o);

  const rafThrottle = (fn, fps = 60) => {
    const frameTime = 1000 / fps;
    let last = 0;
    let id = null;
    let queuedArgs = null;
    return function throttled(...args) {
      const now = performance.now();
      queuedArgs = args;
      if (!id) {
        const delay = Math.max(0, frameTime - (now - last));
        id = setTimeout(() => {
          id = null;
          last = performance.now();
          requestAnimationFrame(() => fn.apply(this, queuedArgs));
        }, delay);
      }
    };
  };

  // ---------- Scrolly Video: Banner → Play Once → Revert ----------
  function initScrollyVideo() {
    const wrap = qs('.page-hero .scrolly-video') || qs('.scrolly-video');
    const banner = qs('.scrolly-banner', wrap);
    const video = qs('video.hero-video', wrap);

    if (!wrap || !banner || !video) {
      console.warn('Scrolly video: missing elements');
      return;
    }

    // State
    let hasScrolled = false;
    let videoPlayed = false;

    // Setup video
    video.muted = true;
    video.playsInline = true;
    video.loop = false; // Play once
    video.preload = 'auto';
    video.style.opacity = '0'; // Start hidden

    // Scroll trigger
    const onFirstScroll = () => {
      if (hasScrolled || window.scrollY < 100) return;
      hasScrolled = true;
      startVideoSequence();
      window.removeEventListener('scroll', onFirstScroll);
    };

    on(window, 'scroll', onFirstScroll, { passive: true });

    // Video end handler
    const onVideoEnd = () => {
      videoPlayed = true;
      video.style.opacity = '0';
      banner.style.opacity = '1';
      banner.classList.remove('is-gone');
      video.removeEventListener('ended', onVideoEnd);
      video.removeEventListener('error', onVideoError);
    };

    const onVideoError = (e) => {
      console.warn('Video failed to play:', e.message || e);
      revertToBanner();
    };

    // Start sequence
    const startVideoSequence = async () => {
      wrap.classList.add('playing');
      banner.classList.add('fade-out');

      // Wait for fade-out
      await new Promise(resolve => setTimeout(resolve, 700));

      // Hide banner, show video
      banner.classList.add('is-gone');
      video.style.opacity = '1';

      // Play video
      try {
        await video.play();
        console.log('Hero video playing');
      } catch (err) {
        console.warn('Autoplay blocked:', err.message || err);
        revertToBanner();
      }

      video.addEventListener('ended', onVideoEnd, { once: true });
      video.addEventListener('error', onVideoError, { once: true });
    };

    // Fallback revert
    const revertToBanner = () => {
      video.style.opacity = '0';
      banner.style.opacity = '1';
      banner.classList.remove('is-gone');
    };

    // Visibility handling
    on(document, 'visibilitychange', () => {
      if (!video || videoPlayed) return;
      if (document.hidden && !video.paused && !video.ended) {
        video.pause();
      } else if (!document.hidden && hasScrolled && !video.ended) {
        video.play().catch(() => {});
      }
    });
  }

  // ---------- Sticky Recalc ----------
  function initStickyRecalc() {
    const wrap = qs('.page-hero .scrolly-video') || qs('.scrolly-video');
    if (!wrap) return;

    const bump = () => {
      wrap.style.transform = 'translateZ(0)';
      void wrap.offsetTop;
      wrap.style.transform = '';
    };

    const handle = rafThrottle(bump, 30);
    on(window, 'resize', handle, { passive: true });
    on(window, 'orientationchange', handle, { passive: true });

    wrap._resizeHandler = handle;
  }

  // ---------- Intersection Activation ----------
  function initActivations() {
    const targets = qsa('.card, .arch-card, .stat, .scrolly__panel, .doc-card');
    if (!targets.length) return;

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          e.target.classList.toggle('active', e.isIntersecting && e.intersectionRatio > 0.28);
        });
      },
      { root: null, rootMargin: '0px', threshold: [0, 0.15, 0.28, 0.5, 0.85] }
    );

    targets.forEach(t => io.observe(t));
    window._intersectionObserver = io;
  }

  // ---------- Gallery Strip ----------
  function initGallery() {
    const strip = qs('.gallery-strip');
    if (!strip) return;
    if (!strip.hasAttribute('tabindex')) strip.setAttribute('tabindex', '0');

    const scrollBy = dx => {
      try {
        strip.scrollBy({ left: dx, behavior: 'smooth' });
      } catch {
        strip.scrollLeft += dx;
      }
    };

    on(strip, 'wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const factor = e.shiftKey ? 2.2 : 1.2;
        scrollBy(e.deltaY * factor);
      }
    }, { passive: false });

    on(strip, 'keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        scrollBy(Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        scrollBy(-Math.max(240, strip.clientWidth * 0.85));
      } else if (e.key === 'Home') {
        e.preventDefault();
        strip.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault();
        strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      }
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        const l = strip.scrollLeft;
        strip.scrollLeft = l + 1;
        strip.scrollLeft = l;
      });
      ro.observe(strip);
      strip._ro = ro;
    }
  }

  // ---------- Boot ----------
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

  // ---------- Cleanup ----------
  on(window, 'pagehide', () => {
    const wrap = qs('.scrolly-video');
    if (wrap?._resizeHandler) {
      window.removeEventListener('resize', wrap._resizeHandler);
      window.removeEventListener('orientationchange', wrap._resizeHandler);
    }
    if (window._intersectionObserver) {
      window._intersectionObserver.disconnect();
    }
    const strip = qs('.gallery-strip');
    if (strip?._ro) {
      strip._ro.disconnect();
    }
  }, { once: true });
})();