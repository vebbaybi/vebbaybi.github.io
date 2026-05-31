(() => {
  const root = document.documentElement;
  const page = document.querySelector('[data-page="linktree"]');
  if (!page) return;


  const links = document.querySelectorAll('.lt-links a[href]');
  for (const a of links) {
    try {
      const url = new URL(a.href, location.origin);
      const isExternal = url.origin !== location.origin;
      if (isExternal) {
        if (!a.hasAttribute('target')) a.setAttribute('target', '_blank');
        const rel = (a.getAttribute('rel') || '').split(' ').filter(Boolean);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' '));
      }
    } catch {

    }
  }


  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function addRipple(e) {
    if (prefersReduced) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 1.2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.className = 'lt-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  for (const a of links) {
    a.addEventListener('pointerdown', addRipple);
  }


  const mail = Array.from(links).find(a => a.href.startsWith('mailto:'));
  if (mail) {
    mail.addEventListener('contextmenu', evt => {
      evt.preventDefault();
      const addr = (mail.getAttribute('href') || '').replace('mailto:', '');
      if (!addr) return;
      navigator.clipboard?.writeText(addr).then(() => {
        toast('Email copied to clipboard');
      }).catch(() => {});
    });
  }


  let toastTimer = null;
  function toast(text) {
    clearTimeout(toastTimer);
    let el = document.querySelector('.lt-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'lt-toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2000);
  }


  const tabs = document.querySelectorAll('.lt-tab');
  const panels = document.querySelectorAll('.lt-links');
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.setAttribute('hidden', ''));
      tab.setAttribute('aria-selected', 'true');
      panels[index].removeAttribute('hidden');
    });
    tab.addEventListener('keydown', e => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        tab.click();
      }
    });
  });



  root.setAttribute('data-linktree-hydrated', '1');
})();