// assets/js/landing.js
// Landing overlay animations (typing → explosion → falling line → redirect to /home.html)
// Plays nice with app.js boot timing and boot.js gating.

(() => {
  const text1  = '1807 ~ Iter';
  const text2  = 'Welcome to the rain...';
  const colors = ['#60a5fa', '#2563eb', '#06b6d4', '#ff00ff'];

  // Where to go after the sequence so boot.js can gate the puzzle
  const REDIRECT_TARGET = '/home.html';

  const typingArea   = document.getElementById('typing-area');
  const explosionDiv = document.getElementById('explosion');
  if (!explosionDiv) return;

  // Ensure overlay is a full-viewport centered layer (fixes top-left issue)
  explosionDiv.style.display = 'flex';
  explosionDiv.style.position = 'fixed';
  explosionDiv.style.inset = '0';
  explosionDiv.style.alignItems = 'center';
  explosionDiv.style.justifyContent = 'center';
  explosionDiv.style.pointerEvents = 'none';
  // Prevent accidental inherited text-align issues
  explosionDiv.style.textAlign = 'center';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Timer management for clean unloads ---
  const timeouts = new Set();
  const intervals = new Set();

  const later = (fn, ms) => {
    const id = setTimeout(() => { timeouts.delete(id); fn(); }, ms);
    timeouts.add(id);
    return id;
  };
  const every = (fn, ms) => {
    const id = setInterval(fn, ms);
    intervals.add(id);
    return id;
  };
  const cleanup = () => {
    timeouts.forEach(clearTimeout); timeouts.clear();
    intervals.forEach(clearInterval); intervals.clear();
  };
  window.addEventListener('beforeunload', cleanup);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cleanup(); });

  /* ------------------------------------------
     Persistent 0/1 rain (CSS supports both sets)
     Container: binary-rain + rain-container
     Drops:     binary-drop  + raindrop
  -------------------------------------------*/
  function startBinaryRain() {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'binary-rain rain-container';
    document.body.appendChild(rainContainer);

    const createRaindrop = () => {
      const drop = document.createElement('span');
      drop.className = 'binary-drop raindrop';
      drop.textContent = Math.random() > 0.5 ? '0' : '1';
      drop.style.left = `${Math.random() * 100}vw`;
      drop.style.color = colors[Math.floor(Math.random() * colors.length)];
      drop.style.animationDelay = `${Math.random() * 2}s`;
      rainContainer.appendChild(drop);
      drop.addEventListener('animationend', () => drop.remove());
    };

    if (!reducedMotion) {
      every(createRaindrop, 75);
      for (let i = 0; i < 50; i++) createRaindrop();
    }
  }

  /* ------------------------------------------
     Text 1: Typing → Explosion (centered)
  -------------------------------------------*/
  function animateText1() {
    // Create a line wrapper so flex centering is reliable
    const lineHost = document.createElement('div');
    lineHost.style.position = 'relative';
    lineHost.style.display = 'inline-block';
    explosionDiv.appendChild(lineHost);

    const chars1 = text1.split('').map((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char type-char';
      span.textContent = ch;
      span.style.color = colors[i % colors.length];
      lineHost.appendChild(span);
      return span;
    });

    let idx = 0;
    const typeNext = () => {
      if (idx >= chars1.length) {
        later(explode, 800);
        return;
      }
      chars1[idx].classList.add('visible');
      idx += 1;
      later(typeNext, 120);
    };

    const explode = () => {
      if (!reducedMotion) {
        // Add class on the host so .exploding .char picks up keyframes
        lineHost.classList.add('exploding');
        chars1.forEach((char, i) => {
          const angle = (Math.PI * 2 * i) / chars1.length + Math.random() * 0.4;
          const velocity = 80 + Math.random() * 150;
          char.style.setProperty('--dx',  `${Math.cos(angle) * velocity}px`);
          char.style.setProperty('--dy',  `${Math.sin(angle) * velocity}px`);
          char.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`);
        });
      }
      later(() => {
        lineHost.remove();
        animateText2();
      }, reducedMotion ? 0 : 3300);
    };

    typeNext();
  }

  /* ------------------------------------------
     Text 2: Falling formation → Final drop → Redirect
  -------------------------------------------*/
  function animateText2() {
    // line wrapper keeps positioning tidy and centered
    const lineHost = document.createElement('div');
    lineHost.style.position = 'relative';
    lineHost.style.display = 'block';
    explosionDiv.appendChild(lineHost);

    const mid = text2.length / 2;

    const chars2 = text2.split('').map((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char fall-char';
      span.textContent = ch;
      span.style.color = colors[i % colors.length];

      // Position each char centered around 50vw with rem spacing
      // Absolute against the fixed, full-screen overlay
      span.style.left = `calc(50% + ${(i - mid) * 1.5}rem)`;
      span.style.setProperty('--delay', `${i * 150}ms`);

      lineHost.appendChild(span);
      return span;
    });

    // Trigger initial fall into place
    later(() => { chars2.forEach(c => c.classList.add('visible')); }, 100);

    // After formation, cascade drop then navigate
    const formationTime = chars2.length * 150 + 1000;
    later(() => {
      chars2.forEach((char, i) => {
        char.classList.add('final-drop');
        char.style.setProperty('--final-drop-delay', `${i * 50}ms`);
      });

      // Cleanup and redirect to /home.html so boot.js can gate the puzzle
      later(() => {
        try { chars2.forEach(c => c.remove()); lineHost.remove(); } catch {}
        // Navigate regardless of reduced-motion state
        window.location.assign(REDIRECT_TARGET);
      }, 2500); // matches CSS final-drop-animation duration
    }, formationTime);
  }

  /* ------------------------------------------
     Reduced Motion: static fallback + redirect
  -------------------------------------------*/
  function staticFallback() {
    const host = typingArea || explosionDiv;
    const line = document.createElement('div');
    line.textContent = `${text1} — ${text2}`;
    line.style.color = colors[0];
    line.style.fontWeight = 'bold';
    line.style.fontSize = 'clamp(1.5rem, 5vw, 2.5rem)';
    line.style.textAlign = 'center';
    host.appendChild(line);

    // Give it a short beat, then go to Home to trigger the gate
    later(() => window.location.assign(REDIRECT_TARGET), 800);
  }

  /* ------------------------------------------
     Init
  -------------------------------------------*/
  function init() {
    if (reducedMotion) {
      staticFallback();
      return;
    }
    startBinaryRain();
    animateText1();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
