const instanceKey = Symbol.for('the1807.neonNet');

function colorWithAlpha(color, alpha) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const value = Number.parseInt(color.slice(1), 16);
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  return `rgba(105, 230, 255, ${alpha})`;
}

export function initNeonNet() {
  if (window[instanceKey]?.canvas?.isConnected) return window[instanceKey];
  if (window[instanceKey]) {
    try { window[instanceKey].cleanup?.(); } catch {}
    delete window[instanceKey];
  }
  const host = document.querySelector('.streamline-page')
    || (document.body.matches('.certifi8te-page') ? document.querySelector('main') : null);
  if (!host) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'neon-net-layer';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  host.classList.add('neon-net-host');
  host.prepend(canvas);
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!context) {
    canvas.remove();
    return null;
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    nodes: [],
    pointer: { x: 0, y: 0, targetX: 0, targetY: 0, active: false },
    frame: 0,
    raf: 0,
    visible: !document.hidden,
    reduced: reducedMotionQuery.matches,
    coarse: coarsePointerQuery.matches,
    accent: '#69e6ff',
    secondary: '#a887ff',
  };

  function readColors() {
    const style = getComputedStyle(host);
    state.accent = style.getPropertyValue('--stream-cyan').trim() || style.getPropertyValue('--cert-cyan').trim() || '#69e6ff';
    state.secondary = style.getPropertyValue('--stream-rose').trim() || style.getPropertyValue('--cert-magenta').trim() || '#a887ff';
  }

  function rebuildNodes() {
    const mobile = state.width < 700;
    const targetCount = mobile ? 72 : 170;
    const gap = Math.max(mobile ? 76 : 62, Math.sqrt((state.width * state.height) / targetCount));
    const columns = Math.ceil(state.width / gap) + 1;
    const rows = Math.ceil(state.height / gap) + 1;
    state.nodes = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        state.nodes.push({
          baseX: column * gap,
          baseY: row * gap,
          phase: (column * 0.73 + row * 1.17) % (Math.PI * 2),
          column,
          row,
        });
      }
    }
    state.columns = columns;
    state.rows = rows;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    state.width = width;
    state.height = height;
    canvas.width = Math.round(width * state.dpr);
    canvas.height = Math.round(height * state.dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.pointer.x = state.pointer.targetX = width / 2;
    state.pointer.y = state.pointer.targetY = height / 2;
    readColors();
    rebuildNodes();
    if (state.reduced) draw(0);
  }

  function nodePosition(node, time) {
    const idleScale = state.reduced ? 0 : (state.coarse ? 1.2 : 2.4);
    let x = node.baseX + Math.sin(time * 0.00022 + node.phase) * idleScale;
    let y = node.baseY + Math.cos(time * 0.00018 + node.phase) * idleScale;
    if (!state.pointer.active || state.coarse || state.reduced) return { x, y, influence: 0 };
    const dx = x - state.pointer.x;
    const dy = y - state.pointer.y;
    const distance = Math.hypot(dx, dy) || 1;
    const radius = Math.max(120, Math.min(220, Math.min(state.width, state.height) * 0.28));
    const influence = Math.max(0, 1 - distance / radius);
    const displacement = influence * influence * 19;
    x += (dx / distance) * displacement;
    y += (dy / distance) * displacement;
    return { x, y, influence };
  }

  function draw(time) {
    context.clearRect(0, 0, state.width, state.height);
    state.pointer.x += (state.pointer.targetX - state.pointer.x) * 0.12;
    state.pointer.y += (state.pointer.targetY - state.pointer.y) * 0.12;
    const positions = state.nodes.map((node) => nodePosition(node, time));

    context.lineWidth = 0.65;
    for (let row = 0; row < state.rows; row += 1) {
      for (let column = 0; column < state.columns; column += 1) {
        const index = row * state.columns + column;
        const point = positions[index];
        for (const neighborIndex of [index + 1, index + state.columns]) {
          const neighbor = positions[neighborIndex];
          if (!neighbor || (neighborIndex === index + 1 && column === state.columns - 1)) continue;
          const emphasis = Math.max(point.influence, neighbor.influence);
          context.strokeStyle = colorWithAlpha(state.accent, 0.055 + emphasis * 0.21);
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.stroke();
        }
      }
    }

    positions.forEach((point) => {
      context.fillStyle = colorWithAlpha(state.accent, 0.12 + point.influence * 0.52);
      context.beginPath();
      context.arc(point.x, point.y, 0.8 + point.influence * 1.35, 0, Math.PI * 2);
      context.fill();
    });

    if (state.pointer.active && !state.coarse && !state.reduced) {
      [42, 78, 118, 162].forEach((radius, index) => {
        context.strokeStyle = colorWithAlpha(index % 2 ? state.secondary : state.accent, 0.2 - index * 0.03);
        context.lineWidth = 1;
        context.beginPath();
        context.ellipse(state.pointer.x, state.pointer.y, radius, radius * (0.74 + index * 0.04), 0, 0, Math.PI * 2);
        context.stroke();
      });
    }
    state.frame += 1;
  }

  function loop(time) {
    if (!state.visible || state.reduced) return;
    draw(time);
    state.raf = requestAnimationFrame(loop);
  }

  function restart() {
    cancelAnimationFrame(state.raf);
    if (state.reduced) {
      draw(0);
    } else if (state.visible) {
      state.raf = requestAnimationFrame(loop);
    }
  }

  function handlePointer(event) {
    if (state.coarse || state.reduced) return;
    state.pointer.targetX = event.clientX;
    state.pointer.targetY = event.clientY;
    state.pointer.active = true;
  }

  function handlePointerLeave() {
    state.pointer.active = false;
  }

  function handleVisibility() {
    state.visible = !document.hidden;
    restart();
  }

  function handleMotionPreference() {
    state.reduced = reducedMotionQuery.matches;
    restart();
  }

  function handlePointerPreference() {
    state.coarse = coarsePointerQuery.matches;
    state.pointer.active = false;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(document.documentElement);
  window.addEventListener('pointermove', handlePointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', handlePointerLeave);
  document.addEventListener('visibilitychange', handleVisibility);
  reducedMotionQuery.addEventListener('change', handleMotionPreference);
  coarsePointerQuery.addEventListener('change', handlePointerPreference);
  resize();
  restart();

  const api = {
    canvas,
    state,
    cleanup() {
      cancelAnimationFrame(state.raf);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointer);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotionQuery.removeEventListener('change', handleMotionPreference);
      coarsePointerQuery.removeEventListener('change', handlePointerPreference);
      canvas.remove();
      host.classList.remove('neon-net-host');
      delete window[instanceKey];
    },
  };
  window[instanceKey] = api;
  window.__NEON_NET_DEBUG__ = {
    instanceCount: 1,
    get nodeCount() { return state.nodes.length; },
    get frameCount() { return state.frame; },
    get reducedMotion() { return state.reduced; },
    get coarsePointer() { return state.coarse; },
    get pointerEnabled() { return !state.reduced && !state.coarse; },
  };
  return api;
}
