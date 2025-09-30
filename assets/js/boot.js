/* =========================================================
   boot.js — Gate orchestrator (LANDING → HOME ONLY)
   - Gates ONLY on /home when:
       • You arrive FROM a landing page: '/', '/scroll_paper' (kept '/scrolly' for legacy)
       • OR you hard reload on /home
   - Skips on all other routes and flows (internal navs not from landing)
   - Dev params:
       ?gate=1   → force show once
       ?bypass=1 → skip once
   - Requires: window.VBIntroPuzzle.mount (non-module; load BEFORE this)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  // Use canonical route KEYS (mirrors app.js routeKey)
  const HOME_KEYS    = new Set(['/home']);
  // Updated: include /scroll_paper (keep /scrolly for legacy nav/back button cases)
  const LANDING_KEYS = new Set(['/', '/scroll_paper']);

  const PUZZLE_DEADLINE_MS = 2000;   // wait up to 2s for engine to appear
  const IDLE_MS = 90_000;

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

  /* ---------- Utils ---------- */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  // Canonical route key (matches app.js):
  //   '/' for index/index.html
  //   '/name' for name or name.html
  function routeKey(pathname) {
    try {
      const parts = (pathname || window.location.pathname).split('/').filter(Boolean);
      if (parts.length === 0) return '/';
      const last = parts[parts.length - 1].toLowerCase();
      if (last === 'index' || last === 'index.html') return '/';
      return last.endsWith('.html') ? `/${last.slice(0, -5)}` : `/${last}`;
    } catch { return '/'; }
  }

  function navEntryType() {
    const entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
    return entries && entries[0] ? entries[0].type : 'navigate'; // 'navigate' | 'reload' | 'back_forward' | 'prerender'
  }

  function isHomeRoute() {
    return HOME_KEYS.has(routeKey(window.location.pathname));
  }

  function cameFromLanding() {
    if (!document.referrer) return false; // gate only after landing, not blank/external
    let refPath = '/';
    try { refPath = new URL(document.referrer).pathname; } catch {}
    return LANDING_KEYS.has(routeKey(refPath));
  }

  function siteReady(detail) {
    try { window.__SITE_READY__ = true; } catch (_) {}
    window.dispatchEvent(new CustomEvent('SITE_READY', { detail }));
  }

  function ensureMount() {
    let el = document.getElementById('intro-root');
    if (!el) { el = document.createElement('div'); el.id = 'intro-root'; document.body.appendChild(el); }
    return el;
  }

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
        if (document.body.contains(mount)) mount.remove();
        siteReady({ solved: true, elapsedMs, moves });
      },
      onSkip: () => {
        if (document.body.contains(mount)) mount.remove();
        try { sessionStorage.setItem('__vb_gate_done__', '1'); } catch {}
        siteReady({ solved: false, skipped: true });
      }
    });
  }

  /* ---------- Main ---------- */
  ready(function () {
    // Soft pre-warm the chosen image
    try { const _img = new Image(); _img.src = IMAGE_SRC; } catch {}

    const qp = new URLSearchParams(location.search);
    const forceGate = qp.get('gate') === '1';
    const bypass    = qp.get('bypass') === '1';

    // Optional session guard (kept OFF by default but won't crash when referenced)
    let alreadyGated = false;
    /* To enable "gate only once per tab", uncomment:
    try { alreadyGated = sessionStorage.getItem('__vb_gate_done__') === '1'; } catch {}
    */

    const atHome        = isHomeRoute();
    const type          = navEntryType();
    const fromLanding   = cameFromLanding();
    const isHardReload  = type === 'reload';

    let shouldGate = false;
    if (forceGate) {
      shouldGate = true;
    } else if (!bypass && atHome && (fromLanding || isHardReload)) {
      shouldGate = true;
    }

    if (!shouldGate) {
      siteReady({
        bypass: true,
        reason: bypass ? 'dev_bypass'
              : atHome ? (alreadyGated ? 'session_already_gated' : 'not_from_landing')
              : 'non_home'
      });
      return;
    }

    const mount = ensureMount();
    mount.innerHTML = '<div id="vb-intro-overlay"><div id="vb-intro-dialog"></div></div>';

    const deadline = performance.now() + PUZZLE_DEADLINE_MS;
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

        // Idle prompt (no auto-quit)
        const dialog = mount.querySelector('#vb-intro-dialog') || mount;
        const toast = createIdleToast(dialog, {
          onContinue: resetIdle,
          onSkip: () => {
            if (document.body.contains(mount)) mount.remove();
            try { sessionStorage.setItem('__vb_gate_done__', '1'); } catch {}
            siteReady({ solved: false, skipped: true, idle: true });
          },
          onReveal: () => {
            const btn = mount.querySelector('[data-reveal]');
            if (btn) btn.click(); else resetIdle();
          }
        });

        let idleTimer = null;
        function resetIdle() {
          toast.hide();
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => toast.show(), IDLE_MS);
        }

        ['pointerdown', 'keydown', 'click', 'focusin'].forEach(ev =>
          mount.addEventListener(ev, resetIdle, { passive: true })
        );
        resetIdle();

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
