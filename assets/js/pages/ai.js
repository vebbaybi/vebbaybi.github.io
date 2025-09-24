/* 1807-chain — ai.js (v1.2)
   AI page interactions
   - Typewriter rotator for eyebrow (optional)
   - Sticky hero video pinned behind content + unmute toggle
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

  // ---------- hero video: pinned background + unmute + scroll scrub ----------
  function initHeroVideo() {
    const wrap  = qs('.page-hero--ai .scrolly-video') || qs('.page-hero .scrolly-video') || qs('.scrolly-video');
    if (!wrap) return;

    const banner    = wrap.querySelector('.scrolly-banner');
    const video     = wrap.querySelector('video.hero-video');
    const scrim     = wrap.querySelector('.bg-scrim');
    const unmuteBtn = document.getElementById('unmute-btn');
    const scrolly   = qs('#main');

    if (!video || !scrolly) return;

    // Ensure it behaves like a background (no accidental capture of scroll/click)
    video.setAttribute('aria-hidden', 'true');
    video.controls = false;
    video.muted = true;
    video.loop = false;
    video.pause();

    const state = {
      videoDuration: 0,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ticking: false,
      started: false
    };

    let lastVideoUpdateTime = 0;

    function clamp01(x) {
      return x < 0 ? 0 : x > 1 ? 1 : x;
    }

    // Start muted to satisfy autoplay; plays inline + loop already in markup
    async function startPlayback() {
      if (state.started) return;
      state.started = true;

      if (banner) {
        banner.style.opacity = '0';
        setTimeout(() => { try { banner.remove(); } catch {} }, 800);
      }

      if (!state.reducedMotion) {
        try { await video.play(); } catch { /* ignore */ }
      }

      detachFirstInteraction();
    }

    // Bind Unmute/Mute button (click + keyboard)
    function reflectBtn() {
      if (!unmuteBtn) return;
      const label = video.muted ? 'Unmute' : 'Mute';
      unmuteBtn.textContent = label;
      unmuteBtn.setAttribute('aria-pressed', String(!video.muted));
      unmuteBtn.setAttribute('aria-label', label + ' background video');
    }

    function toggleMute(e) {
      if (e) e.preventDefault();
      video.muted = !video.muted;
      reflectBtn();
      // If user unmuted and the video is paused (Safari edge), resume
      if (video.paused && !video.muted && !state.reducedMotion) video.play().catch(() => {});
    }

    if (unmuteBtn) {
      on(unmuteBtn, 'click', toggleMute);
      on(unmuteBtn, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMute(); }
      });
      reflectBtn();
    }

    // First interaction to kick autoplay reliably
    const events = ['click','keydown','touchstart','pointerdown','wheel','scroll'];
    const first = () => startPlayback();

    function attachFirstInteraction() {
      events.forEach(evt => on(document, evt, first, { passive: true }));
      on(wrap, 'click', first, { passive: true });
      on(window, 'scroll', first, { passive: true, once: true });
    }
    function detachFirstInteraction() {
      events.forEach(evt => document.removeEventListener(evt, first, { passive: true }));
      wrap.removeEventListener('click', first, { passive: true });
      window.removeEventListener('scroll', first, { passive: true });
    }
    attachFirstInteraction();

    // Keep pinned look consistent across visibility changes
    on(document, 'visibilitychange', () => {
      if (document.hidden) { try { video.pause(); } catch {} }
      else if (state.started && !state.reducedMotion) { video.play().catch(() => {}); }
    });

    // Optional: soften background on scroll (scrim opacity ramps slightly)
    if (scrim) {
      const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
      state.scrimBase = 0.15;
      state.scrimSpread = 0.25;
    }

    // Video loaded handler
    const onLoaded = () => {
      state.videoDuration = video.duration || 0;
      if (state.started && !state.reducedMotion) {
        video.play().catch(() => {});
      }
      updateState();
    };

    on(video, 'loadedmetadata', onLoaded);
    if (video.readyState >= 1) onLoaded();

    // Update video on scroll
    function updateVideoPlayback(progress) {
      if (!state.videoDuration || state.reducedMotion) return;
      const now = performance.now();
      if (now - lastVideoUpdateTime < 50) return;
      lastVideoUpdateTime = now;
      const t = clamp01(progress) * state.videoDuration;
      if (Math.abs(video.currentTime - t) > 0.05) {
        video.currentTime = t;
      }
    }

    // Combined update (video + scrim)
    function updateState() {
      const rect = scrolly.getBoundingClientRect();
      const progress = clamp01((-rect.top) / (rect.height - window.innerHeight));
      updateVideoPlayback(progress);

      if (scrim) {
        const exposure = clamp01(1 - rect.top / window.innerHeight);
        scrim.style.opacity = String(clamp(state.scrimBase + exposure * state.scrimSpread, 0, 0.6));
      }
    }

    // Throttled scroll/resize
    const throttledUpdate = () => {
      if (state.ticking) return;
      state.ticking = true;
      requestAnimationFrame(() => { updateState(); state.ticking = false; });
    };

    on(window, 'scroll', throttledUpdate, { passive: true });
    on(window, 'resize', throttledUpdate);
    throttledUpdate();
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
    initHeroVideo();
    initActivations();
    initGallery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();