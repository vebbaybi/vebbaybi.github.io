/* =========================================================
   boot.js — Gate orchestrator (no auto-quit, idle prompt)
   - Random image selection from IMAGE_SOURCES
   - Respects prefers-reduced-motion
   - Persists seen state only on solve/skip/reveal
   - Dev toggles:  ?gate=1   (force gate)
                    ?cleargate=1 (clear seen flag)
   ========================================================= */
(function () {
  'use strict';

  // Random image pool (yours)
  const IMAGE_SOURCES = [
    '/assets/images/playme/playme1.jpg',
    '/assets/images/playme/playme2.jpg',
    '/assets/images/playme/playme3.webp',
    '/assets/images/playme/playme4.jpg',
    '/assets/images/playme/playme5.jpg',
    '/assets/images/playme/playme6.jpg',
    '/assets/images/playme/playme7.webp',
    '/assets/images/playme/playme8.jpg',
    '/assets/images/playme/playme9.jpg',
    '/assets/images/playme/playme10.webp',
    '/assets/images/playme/playme11.jpg',
    '/assets/images/playme/playme12.webp',
    '/assets/images/playme/playme13.jpg',
    '/assets/images/playme/playme14.webp'
  ];
  const IMAGE_SRC = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
  const SEEN_KEY  = 'vb_intro_seen';

  function siteReady(detail) {
    window.__SITE_READY__ = true;
    window.dispatchEvent(new CustomEvent('SITE_READY', { detail }));
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function ensureMount() {
    let el = document.getElementById('intro-root');
    if (!el) { el = document.createElement('div'); el.id = 'intro-root'; document.body.appendChild(el); }
    return el;
  }

  // Tiny inline toast (no extra CSS file required)
  function createIdleToast(host, { onContinue, onSkip, onReveal }) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:absolute','left:50%','bottom:12px','transform:translateX(-50%)',
      'display:none','gap:8px','align-items:center',
      'background:rgba(15,23,38,.95)','color:#e6edf3',
      'border:1px solid rgba(102,227,255,.25)','border-radius:12px',
      'padding:10px 12px','font:600 14px/1.2 ui-sans-serif,system-ui',
      'box-shadow:0 10px 30px rgba(0,0,0,.35)','z-index:2'
    ].join(';');

    el.innerHTML = `
      <span style="opacity:.9;margin-right:6px">Still playing?</span>
      <button type="button" data-act="continue" style="background:#0f1726;color:#e6edf3;border:1px solid rgba(102,227,255,.25);border-radius:8px;padding:6px 10px;cursor:pointer">Continue</button>
      <button type="button" data-act="reveal" style="background:#16243b;color:#e6edf3;border:1px solid rgba(102,227,255,.25);border-radius:8px;padding:6px 10px;cursor:pointer">Reveal</button>
      <button type="button" data-act="skip" style="background:#131d2f;color:#e6edf3;border:1px solid rgba(102,227,255,.25);border-radius:8px;padding:6px 10px;cursor:pointer">Skip</button>
    `;

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'continue') onContinue && onContinue();
      if (act === 'skip')     onSkip && onSkip();
      if (act === 'reveal')   onReveal && onReveal();
    });

    host.appendChild(el);

    return {
      show: () => { el.style.display = 'flex'; },
      hide: () => { el.style.display = 'none'; },
      remove: () => { el.remove(); }
    };
  }

  function mountPuzzle(mount) {
    return window.VBIntroPuzzle.mount({
      container: mount,
      imageSrc: IMAGE_SRC,
      onSolved: ({ elapsedMs, moves }) => {
        localStorage.setItem(SEEN_KEY, '1');
        if (document.body.contains(mount)) mount.remove();
        siteReady({ solved: true, elapsedMs, moves });
      },
      onSkip: () => {
        localStorage.setItem(SEEN_KEY, '1');
        if (document.body.contains(mount)) mount.remove();
        siteReady({ solved: false, skipped: true });
      }
    });
  }

  ready(function () {
    const qp = new URLSearchParams(location.search);
    if (qp.get('cleargate') === '1') localStorage.removeItem(SEEN_KEY);
    const forceGate = qp.get('gate') === '1';

    const seen = !forceGate && localStorage.getItem(SEEN_KEY) === '1';
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (seen || (prefersReduced && !forceGate)) {
      siteReady({ bypass: true, reason: seen ? 'already_seen' : 'reduced_motion' });
      return;
    }

    const mount = ensureMount();
    mount.innerHTML = '<div id="vb-intro-overlay"><div id="vb-intro-dialog"></div></div>';

    const deadline = performance.now() + 2000;
    (function waitForEngine() {
      if (window.VBIntroPuzzle && typeof window.VBIntroPuzzle.mount === 'function') {
        let game;
        try {
          game = mountPuzzle(mount);
        } catch (err) {
          console.error('[boot] mount failed:', err);
          if (document.body.contains(mount)) mount.remove();
          siteReady({ bypass: true, error: 'mount_failed' });
          return;
        }

        // ----- Idle prompt (no auto-quit) -----
        const dialog = mount.querySelector('#vb-intro-dialog') || mount;
        const toast = createIdleToast(dialog, {
          onContinue: resetIdle,
          onSkip: () => {
            // behave like Skip button
            localStorage.setItem(SEEN_KEY, '1');
            if (document.body.contains(mount)) mount.remove();
            siteReady({ solved: false, skipped: true, idle: true });
          },
          onReveal: () => {
            const btn = mount.querySelector('[data-reveal]');
            if (btn) btn.click(); else resetIdle();
          }
        });

        let idleTimer = null;
        const IDLE_MS = 90_000;

        function resetIdle() {
          toast.hide();
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => toast.show(), IDLE_MS);
        }

        // Any interaction resets idle
        ['pointerdown', 'keydown', 'click', 'focusin'].forEach(ev =>
          mount.addEventListener(ev, resetIdle, { passive: true })
        );

        // Start tracking
        resetIdle();

        // Clean up when puzzle ends anyway
        const cleanup = () => {
          if (idleTimer) clearTimeout(idleTimer);
          toast.remove();
        };
        window.addEventListener('PUZZLE_SOLVED', cleanup, { once: true });
        window.addEventListener('PUZZLE_SKIPPED', cleanup, { once: true });
        window.addEventListener('PUZZLE_DESTROYED', cleanup, { once: true });

        return;
      }

      if (performance.now() < deadline) {
        requestAnimationFrame(waitForEngine);
      } else {
        console.error('[boot] VBIntroPuzzle missing. Ensure /assets/js/ui/components/puzzle.js loads BEFORE boot.js and is NOT type="module".');
        if (document.body.contains(mount)) mount.remove();
        siteReady({ bypass: true, error: 'puzzle_missing' });
      }
    })();
  });
})();
