/* =========================================================
   VBIntroPuzzle — 3×3 Sliding Picture Puzzle (pixel-accurate)
   - Self-styling overlay/dialog/board: no external CSS required
   - Pixel slicing, SmartSlide (row/column runs), keyboard support
   - Timer & moves counter with best-time in localStorage
   - Accessible buttons/labels; modal overlay
   API:
     window.VBIntroPuzzle.mount({
       container: '#intro-root' | HTMLElement,
       imageSrc: '/assets/images/playme.jpg',
       onSolved: ({ elapsedMs, moves }) => {},
       onSkip: () => {}
     })
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  const LS_KEY_BEST  = 'vb_intro_best_time_ms';
  const SMART_SLIDE  = true;
  const GRID_SIZE    = 3;
  const IDLE_ANIM_MS = 700; // brief solved pulse

  /* ---------- Helpers ---------- */
  const qs = (root, sel) => (root || document).querySelector(sel);
  const now = () => performance.now();
  const posToXY = (idx) => ({ x: idx % GRID_SIZE, y: (idx / GRID_SIZE | 0) });
  const xyToPos = (x, y) => y * GRID_SIZE + x;

  function formatMs(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function inversions(order) {
    let inv = 0;
    const a = order.filter(v => v !== 0);
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        if (a[i] > a[j]) inv++;
      }
    }
    return inv;
  }
  const isSolvable = (order) => (inversions(order) % 2) === 0;
  const isGoal = (order) => order.every((v, i) => (i < order.length - 1 ? v === i + 1 : v === 0));
  const sameRowOrCol = (a, b) => (a % GRID_SIZE) === (b % GRID_SIZE) || ((a / GRID_SIZE | 0) === (b / GRID_SIZE | 0));

  function debounce(fn, delay) {
    let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
  }

  function shuffledSolvable() {
    const base = [1,2,3,4,5,6,7,8,0];
    let a;
    do {
      a = base.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
    } while (!isSolvable(a) || isGoal(a));
    return a;
  }

  /* ---------- Core ---------- */
  class IntroPuzzle {
    constructor({ root, imageSrc, onSolved, onSkip }) {
      this.root = root;
      this.imageSrc = imageSrc;
      this.onSolved = onSolved;
      this.onSkip = onSkip;

      this.state = { order: [1,2,3,4,5,6,7,8,0], emptyPos: 8, moves: 0, startTs: 0, raf: null };
      this.posByNum = Array(GRID_SIZE * GRID_SIZE).fill(0);
      this.tilesByNum = {};
      this.size = { W: 0, H: 0, tileW: 0, tileH: 0 };
      this.dom = {};
      this._mounted = false;
      this._gesture = null;
      this._imagePreload = null;
      this._resizeListener = null;
    }

    async mount() {
      if (this._mounted) return;
      this._mounted = true;

      // Preload image first so background paint is immediate
      await this._preloadImage();

      // Render template and cache refs
      this.root.innerHTML = this._template();
      this._cacheDom();

      // Apply runtime styles so layout is guaranteed without external CSS
      this._applyStyles();

      // Set reveal layer background
      this.dom.image.style.background = `url('${this.imageSrc}') center/cover no-repeat`;

      // Build tiles and layout
      this._buildTiles();
      this._measureAndLayout();

      // Bind interactions
      this._bind();

      // Shuffle and start timer
      this.shuffle();
      this._startTimer();

      // Focus grid for keys
      this.dom.layer.focus({ preventScroll: true });
    }

    _template() {
      return `
      <div id="vb-intro-overlay" role="dialog" aria-modal="true" aria-labelledby="vb-intro-title">
        <div id="vb-intro-dialog">
          <div id="vb-intro-head">
            <div id="vb-intro-title">Assemble to Enter</div>
            <div id="vb-intro-meta">
              <span class="intro-stat">Time: <strong data-time>00:00</strong></span>
              <span class="intro-stat">Moves: <strong data-moves>0</strong></span>
              <span class="intro-stat">Best: <strong data-best>—</strong></span>
            </div>
          </div>
          <div id="vb-puzzle-wrap">
            <div id="vb-puzzle-image" aria-hidden="true"></div>
            <div id="vb-puzzle-layer" aria-label="Sliding picture puzzle" tabindex="0"></div>
          </div>
          <div id="vb-intro-controls">
            <div id="vb-intro-hint">Tap/click a tile to slide toward the empty space (same row/column). Swipe or use arrow keys.</div>
            <div class="vb-btns">
              <button class="vb-btn" data-shuffle type="button">Shuffle</button>
              <button class="vb-btn" data-reveal type="button" title="Reveal & continue">Reveal</button>
              <button class="vb-btn primary" data-skip type="button">Skip</button>
            </div>
          </div>
        </div>
      </div>`;
    }

    _cacheDom() {
      const r = this.root;
      this.dom.overlay    = qs(r, '#vb-intro-overlay');
      this.dom.dialog     = qs(r, '#vb-intro-dialog');
      this.dom.head       = qs(r, '#vb-intro-head');
      this.dom.meta       = qs(r, '#vb-intro-meta');
      this.dom.wrap       = qs(r, '#vb-puzzle-wrap');
      this.dom.layer      = qs(r, '#vb-puzzle-layer');
      this.dom.image      = qs(r, '#vb-puzzle-image');
      this.dom.time       = qs(r, '[data-time]');
      this.dom.moves      = qs(r, '[data-moves]');
      this.dom.best       = qs(r, '[data-best]');
      this.dom.btnShuffle = qs(r, '[data-shuffle]');
      this.dom.btnReveal  = qs(r, '[data-reveal]');
      this.dom.btnSkip    = qs(r, '[data-skip]');
    }

    /* Inject essential layout styles so widths/heights are non-zero */
    _applyStyles() {
      // Fullscreen overlay centered grid
      const o = this.dom.overlay;
      o.style.position = 'fixed';
      o.style.inset = '0';
      o.style.zIndex = '99999';
      o.style.background = 'rgba(7, 10, 16, 0.82)';
      o.style.display = 'grid';
      o.style.placeItems = 'center';
      o.style.backdropFilter = 'blur(2px)';

      // Dialog card
      const d = this.dom.dialog;
      d.style.background = '#0f1726';
      d.style.border = '1px solid rgba(102,227,255,.18)';
      d.style.borderRadius = '14px';
      d.style.boxShadow = '0 20px 60px rgba(0,0,0,.45)';
      d.style.padding = '16px';
      d.style.width = 'min(92vw, 880px)';
      d.style.maxWidth = '92vw';
      d.style.color = '#e6edf3';
      d.style.font = '600 14px/1.4 ui-sans-serif, system-ui, -apple-system';

      // Header/meta
      const head = this.dom.head;
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'center';
      head.style.marginBottom = '12px';

      const title = qs(this.dom.dialog, '#vb-intro-title');
      title.style.font = '800 18px/1.2 ui-sans-serif, system-ui';
      title.style.letterSpacing = '.3px';

      const meta = this.dom.meta;
      meta.style.display = 'flex';
      meta.style.gap = '14px';
      meta.style.opacity = '.9';

      // Compute square board size from viewport
      const vw = window.innerWidth || document.documentElement.clientWidth || 800;
      const vh = window.innerHeight || document.documentElement.clientHeight || 600;
      const S = Math.max(280, Math.floor(Math.min(vw, vh) * 0.76)); // 76% of smaller side

      // Board wrap + layers
      const wrap = this.dom.wrap;
      wrap.style.position = 'relative';
      wrap.style.width = `${S}px`;
      wrap.style.height = `${S}px`;
      wrap.style.borderRadius = '12px';
      wrap.style.overflow = 'hidden';
      wrap.style.background = '#0b1324';
      wrap.style.border = '1px solid rgba(102,227,255,.14)';
      wrap.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.02)';

      const img = this.dom.image;
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.filter = 'saturate(1.05)';
      img.style.transition = 'transform 320ms cubic-bezier(.2,.8,.2,1), opacity 320ms cubic-bezier(.2,.8,.2,1)';

      const layer = this.dom.layer;
      layer.style.position = 'relative';
      layer.style.width = '100%';
      layer.style.height = '100%';
      layer.style.outline = 'none';
      layer.style.zIndex = '2';

      // Controls
      const controls = qs(this.dom.dialog, '#vb-intro-controls');
      controls.style.display = 'flex';
      controls.style.justifyContent = 'space-between';
      controls.style.alignItems = 'center';
      controls.style.marginTop = '12px';
      const hint = qs(this.dom.dialog, '#vb-intro-hint');
      hint.style.opacity = '.85';

      const btns = qs(this.dom.dialog, '.vb-btns');
      btns.style.display = 'flex';
      btns.style.gap = '8px';

      // Buttons
      const setBtn = (el, primary) => {
        el.style.cursor = '--cursor-pointer';
        el.style.padding = '8px 12px';
        el.style.borderRadius = '10px';
        el.style.border = '1px solid rgba(102,227,255,.18)';
        el.style.background = primary ? '#1b2a44' : '#111b2c';
        el.style.color = '#e6edf3';
        el.style.fontWeight = '700';
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,.35)';
      };
      setBtn(this.dom.btnShuffle, false);
      setBtn(this.dom.btnReveal, false);
      setBtn(this.dom.btnSkip, true);
    }

    _buildTiles() {
      this.dom.layer.innerHTML = '';
      this.tilesByNum = {};
      for (let num = 1; num <= 8; num++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'vb-tile';
        tile.dataset.num = String(num);
        tile.setAttribute('aria-label', `Tile ${num}`);
        // Inline presentation styles
        tile.style.position = 'absolute';
        tile.style.willChange = 'transform';
        tile.style.backgroundRepeat = 'no-repeat';
        tile.style.border = '0';
        tile.style.borderRadius = '6px';
        tile.style.cursor = '--cursor-pointer';
        tile.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.06), 0 4px 12px rgba(0,0,0,.35)';
        tile.addEventListener('focus', () => { tile.style.outline = '2px solid rgba(102,227,255,.45)'; tile.style.outlineOffset = '0'; });
        tile.addEventListener('blur',  () => { tile.style.outline = 'none'; });
        this.dom.layer.appendChild(tile);
        this.tilesByNum[num] = tile;
      }
      this._recomputePosMap();
    }

    _measureAndLayout() {
      // Recompute board square on resize to keep things sane across toolbars/OSK
      const vw = window.innerWidth || document.documentElement.clientWidth || 800;
      const vh = window.innerHeight || document.documentElement.clientHeight || 600;
      const S = Math.max(280, Math.floor(Math.min(vw, vh) * 0.76));
      this.dom.wrap.style.width = `${S}px`;
      this.dom.wrap.style.height = `${S}px`;

      const W = this.dom.layer.clientWidth;
      const H = this.dom.layer.clientHeight;
      const tileW = W / GRID_SIZE;
      const tileH = H / GRID_SIZE;
      this.size = { W, H, tileW, tileH };

      for (let num = 1; num <= 8; num++) {
        const tile = this.tilesByNum[num];
        const goal = num - 1;
        const gx = goal % GRID_SIZE, gy = Math.floor(goal / GRID_SIZE);
        tile.style.width = `${tileW}px`;
        tile.style.height = `${tileH}px`;
        tile.style.backgroundImage = `url('${this.imageSrc}')`;
        tile.style.backgroundSize = `${W}px ${H}px`;
        tile.style.backgroundPosition = `-${gx * tileW}px -${gy * tileH}px`;
      }
      this._syncPositions(false);
    }

    _bind() {
      // Click
      this.dom.layer.addEventListener('click', this._handleClick.bind(this));
      // Pointer gestures
      this.dom.layer.addEventListener('pointerdown', this._handlePointerDown.bind(this));
      this.dom.layer.addEventListener('pointerup', this._handlePointerUp.bind(this));
      // Keyboard
      this.dom.layer.addEventListener('keydown', this._handleKeydown.bind(this));
      // Buttons
      this.dom.btnShuffle.addEventListener('click', this.shuffle.bind(this));
      this.dom.btnReveal.addEventListener('click', this._reveal.bind(this));
      this.dom.btnSkip.addEventListener('click', this._skip.bind(this));
      // Resize
      this._resizeListener = debounce(() => { this._applyStyles(); this._measureAndLayout(); }, 120);
      window.addEventListener('resize', this._resizeListener, { passive: true });
    }

    _handleClick(e) {
      const btn = e.target.closest('.vb-tile');
      if (!btn) return;
      const num = parseInt(btn.dataset.num, 10);
      const pos = this.posByNum[num];
      if (pos >= 0) this._tryMove(pos);
    }

    _handlePointerDown(e) {
      const t = e.target.closest('.vb-tile');
      if (!t) return;
      this._gesture = { startX: e.clientX, startY: e.clientY, num: parseInt(t.dataset.num, 10) };
      try { t.setPointerCapture(e.pointerId); } catch {}
    }

    _handlePointerUp(e) {
      if (!this._gesture) return;
      const g = this._gesture; this._gesture = null;
      const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
      if (Math.hypot(dx, dy) < 8) return; // treat as click
      const pos = this.posByNum[g.num];
      const empty = this.state.emptyPos;
      const { y: ty } = posToXY(pos), { y: ey } = posToXY(empty);
      if (Math.abs(dx) > Math.abs(dy) && ty === ey) this._tryMove(pos);
      else {
        const { x: tx } = posToXY(pos), { x: ex } = posToXY(empty);
        if (tx === ex) this._tryMove(pos);
      }
    }

    _handleKeydown(e) {
      const key = String(e.key || '').toLowerCase();
      const empty = this.state.emptyPos;
      const { x, y } = posToXY(empty);
      let target = null;
      if (key === 'arrowup'   || key === 'w') target = (y < GRID_SIZE - 1) ? xyToPos(x, y + 1) : null;
      if (key === 'arrowdown' || key === 's') target = (y > 0)           ? xyToPos(x, y - 1) : null;
      if (key === 'arrowleft' || key === 'a') target = (x < GRID_SIZE - 1) ? xyToPos(x + 1, y) : null;
      if (key === 'arrowright'|| key === 'd') target = (x > 0)           ? xyToPos(x - 1, y) : null;
      if (target !== null) { e.preventDefault(); this._tryMove(target); }
    }

    _recomputePosMap() {
      for (let num = 0; num < GRID_SIZE * GRID_SIZE; num++) {
        this.posByNum[num] = this.state.order.indexOf(num);
      }
    }

    shuffle() {
      this.state.order = shuffledSolvable();
      this.state.emptyPos = this.state.order.indexOf(0);
      this.state.moves = 0;
      this.state.startTs = now();
      this._recomputePosMap();
      this._renderStats();
      this._syncPositions(true);
      this.dom.layer.focus({ preventScroll: true });
    }

    _syncPositions(animate) {
      const { tileW, tileH } = this.size;
      for (let num = 1; num <= 8; num++) {
        const tile = this.tilesByNum[num];
        const pos = this.posByNum[num];
        const { x, y } = posToXY(pos);
        tile.style.transition = animate ? 'transform 180ms cubic-bezier(.2,.8,.2,1)' : 'none';
        tile.style.transform = `translate3d(${x * tileW}px, ${y * tileH}px, 0)`;
      }
    }

    _renderStats() {
      if (this.dom.moves) this.dom.moves.textContent = String(this.state.moves);
    }

    _tryMove(tilePos) {
      const emptyPos = this.state.emptyPos;
      if (tilePos === emptyPos) return;

      const { x: tx, y: ty } = posToXY(tilePos);
      const { x: ex, y: ey } = posToXY(emptyPos);

      const adjacent = (tx === ex && Math.abs(ty - ey) === 1) ||
                       (ty === ey && Math.abs(tx - ex) === 1);

      if (adjacent) {
        const numAtTile = this.state.order[tilePos];
        [this.state.order[tilePos], this.state.order[emptyPos]] = [this.state.order[emptyPos], this.state.order[tilePos]];
        this.posByNum[numAtTile] = emptyPos;
        this.posByNum[0] = tilePos;
        this.state.emptyPos = tilePos;
        this.state.moves += 1;
        this._renderStats();
        this._syncPositions(true);
        if (isGoal(this.state.order)) this._onSolved();
        return;
      }

      if (SMART_SLIDE && sameRowOrCol(tilePos, emptyPos)) {
        const step = (tx === ex) ? (ey > ty ? -GRID_SIZE : GRID_SIZE) : (ex > tx ? -1 : 1);
        let curEmpty = emptyPos, moves = 0;
        while (curEmpty !== tilePos) {
          const from = curEmpty + step;
          const num = this.state.order[from];
          this.state.order[curEmpty] = num;
          this.state.order[from] = 0;
          this.posByNum[num] = curEmpty;
          curEmpty = from;
          moves++;
        }
        this.posByNum[0] = tilePos;
        this.state.emptyPos = tilePos;
        this.state.moves += moves;
        this._renderStats();
        this._syncPositions(true);
        if (isGoal(this.state.order)) this._onSolved();
      }
    }

    _startTimer() {
      const tick = () => {
        const ms = Math.max(0, now() - this.state.startTs);
        if (this.dom.time) this.dom.time.textContent = formatMs(ms);
        this.state.raf = requestAnimationFrame(tick);
      };
      this.state.startTs = now();
      this.state.raf = requestAnimationFrame(tick);

      const best = localStorage.getItem(LS_KEY_BEST);
      if (best && this.dom.best) this.dom.best.textContent = formatMs(parseInt(best, 10));
    }

    _stopTimer() {
      if (this.state.raf) { cancelAnimationFrame(this.state.raf); this.state.raf = null; }
    }

    async _onSolved() {
      this._stopTimer();
      const elapsed = Math.max(0, now() - this.state.startTs);
      const best = localStorage.getItem(LS_KEY_BEST);
      if (!best || elapsed < parseInt(best, 10)) {
        localStorage.setItem(LS_KEY_BEST, String(elapsed));
      }

      // Brief reveal pulse without external CSS
      try {
        this.dom.image.style.transform = 'scale(1.02)';
        this.dom.image.style.opacity = '0.95';
        setTimeout(() => {
          this.dom.image.style.transform = 'none';
          this.dom.image.style.opacity = '1';
        }, IDLE_ANIM_MS);
      } catch {}

      await new Promise(r => setTimeout(r, 5000));
      this.destroy();
      if (typeof this.onSolved === 'function') {
        this.onSolved({ elapsedMs: elapsed, moves: this.state.moves });
      }
      window.dispatchEvent(new CustomEvent('PUZZLE_SOLVED', { detail: { elapsedMs: elapsed, moves: this.state.moves } }));
    }

    _reveal() {
      this.state.order = [1,2,3,4,5,6,7,8,0];
      this._recomputePosMap();
      this.state.emptyPos = 8;
      this._syncPositions(false);
      this._onSolved();
    }

    _skip() {
      this.destroy();
      if (typeof this.onSkip === 'function') this.onSkip();
      window.dispatchEvent(new CustomEvent('PUZZLE_SKIPPED'));
    }

    _preloadImage() {
      if (!this._imagePreload) {
        this._imagePreload = new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load image: ${this.imageSrc}`));
          img.src = this.imageSrc;
        });
      }
      return this._imagePreload;
    }

    destroy() {
      this._stopTimer();
      if (this._resizeListener) window.removeEventListener('resize', this._resizeListener);
      if (this.root) this.root.innerHTML = '';
      this.tilesByNum = {};
      this._mounted = false;
      this._imagePreload = null;
      window.dispatchEvent(new CustomEvent('PUZZLE_DESTROYED'));
    }
  }

  /* ---------- Public API ---------- */
  function VBIntroPuzzle_mount({ container, imageSrc, onSolved, onSkip }) {
    const root = (typeof container === 'string') ? qs(document, container) : container;
    if (!root) throw new Error('VBIntroPuzzle: container not found');
    if (!imageSrc) throw new Error('VBIntroPuzzle: imageSrc required');
    const game = new IntroPuzzle({ root, imageSrc, onSolved, onSkip });
    game.mount().catch(err => console.error('VBIntroPuzzle mount error:', err));
    return game;
  }

  window.VBIntroPuzzle = { mount: VBIntroPuzzle_mount };
})();
