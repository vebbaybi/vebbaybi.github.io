/* =========================================================
   VBIntroPuzzle — 3×3 Sliding Picture Puzzle (pixel-accurate)
   - Pixel-based slicing + placement (no half tiles, no seams) for seamless image reconstruction
   - SmartSlide: click/tap/swipe any tile in same row/column to slide the entire run toward the empty space
   - Keyboard: arrows / WASD for moving the empty space
   - Timer & moves counter with localStorage for best time (global, not per-image)
   - Accessible: tiles are buttons with ARIA labels; dialog is modal
   - No external dependencies; pure vanilla JS
   - Improved: Image preloading for better UX; enhanced error handling; more robust event bindings; cleanup on destroy
   API:
     window.VBIntroPuzzle.mount({
       container: '#intro-root' | HTMLElement,  // Where to mount the puzzle
       imageSrc: '/assets/images/playme.jpg',   // Path to the puzzle image (passed from boot.js, randomized)
       onSolved: ({ elapsedMs, moves }) => {},  // Callback when puzzle is solved
       onSkip: () => {}                         // Callback when skipped
     })
   ========================================================= */
(function () {
  'use strict';

  // Constants for configuration
  // LocalStorage key for best time (in milliseconds)
  const LS_KEY_BEST = 'vb_intro_best_time_ms';
  // Enable smart sliding along rows/columns
  const SMART_SLIDE = true;
  // Grid size (fixed 3x3 for this puzzle)
  const GRID_SIZE = 3;

  // Helper functions
  // Query selector shorthand
  const qs = (root, sel) => (root || document).querySelector(sel);
  // Get current timestamp for timing
  const now = () => performance.now();
  // Convert flat index (0-8) to {x, y} coordinates
  const posToXY = (idx) => ({ x: idx % GRID_SIZE, y: Math.floor(idx / GRID_SIZE) });
  // Convert {x, y} to flat index
  const xyToPos = (x, y) => y * GRID_SIZE + x;
  // Format milliseconds to MM:SS
  function formatMs(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  // Count inversions for solvability check
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
  // Check if puzzle state is solvable (even number of inversions)
  const isSolvable = (order) => inversions(order) % 2 === 0;
  // Check if puzzle is in solved state
  const isGoal = (order) => order.every((v, i) => (i < order.length - 1 ? v === i + 1 : v === 0));
  // Check if two positions are in the same row or column
  function sameRowOrCol(a, b) {
    const ax = a % GRID_SIZE, ay = (a / GRID_SIZE | 0), bx = b % GRID_SIZE, by = (b / GRID_SIZE | 0);
    return ax === bx || ay === by;
  }

  // Main puzzle class
  class IntroPuzzle {
    constructor({ root, imageSrc, onSolved, onSkip }) {
      // Root element to mount into
      this.root = root;
      // Image source for the puzzle
      this.imageSrc = imageSrc;
      // Callback for when solved
      this.onSolved = onSolved;
      // Callback for when skipped
      this.onSkip = onSkip;

      // Internal state: order of tiles (1-8, 0 for empty), empty position, moves, start time, animation frame
      this.state = { order: [1, 2, 3, 4, 5, 6, 7, 8, 0], emptyPos: 8, moves: 0, startTs: 0, raf: null };
      // Mapping: tile number (0-8) to position (0-8)
      this.posByNum = Array(GRID_SIZE * GRID_SIZE).fill(0);
      // Mapping: tile number (1-8) to DOM element
      this.tilesByNum = {};
      // Dimensions: overall width/height, tile width/height
      this.size = { W: 0, H: 0, tileW: 0, tileH: 0 };
      // Cached DOM elements
      this.dom = {};
      // Flags for mounted state and gesture tracking
      this._mounted = false;
      this._gesture = null;
      // Preload promise for image
      this._imagePreload = null;
    }

    // Mount the puzzle: preload image, render template, build tiles, etc.
    async mount() {
      if (this._mounted) return;
      this._mounted = true;

      // Preload the image to ensure it's ready before displaying
      await this._preloadImage();

      // Render the HTML template into the root
      this.root.innerHTML = this._template();
      // Cache DOM references
      this._cacheDom();
      // Set background image on the reveal layer
      this.dom.image.style.background = `url('${this.imageSrc}') center/cover no-repeat`;
      // Create tile elements
      this._buildTiles();
      // Measure dimensions and layout tiles
      this._measureAndLayout();
      // Bind event listeners
      this._bind();
      // Shuffle the puzzle
      this.shuffle();
      // Start the timer
      this._startTimer();
    }

    // HTML template for the puzzle dialog
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
            <div id="vb-intro-hint">Tap/click a tile to slide toward the empty space (same row/column). Swipe or use arrow keys too.</div>
            <div class="vb-btns">
              <button class="vb-btn" data-shuffle type="button">Shuffle</button>
              <button class="vb-btn" data-reveal type="button" title="Reveal & continue">Reveal</button>
              <button class="vb-btn primary" data-skip type="button">Skip</button>
            </div>
          </div>
        </div>
      </div>`;
    }

    // Cache references to key DOM elements for faster access
    _cacheDom() {
      const r = this.root;
      this.dom.overlay = qs(r, '#vb-intro-overlay');
      this.dom.dialog = qs(r, '#vb-intro-dialog');
      this.dom.wrap = qs(r, '#vb-puzzle-wrap');
      this.dom.layer = qs(r, '#vb-puzzle-layer');
      this.dom.image = qs(r, '#vb-puzzle-image');
      this.dom.time = qs(r, '[data-time]');
      this.dom.moves = qs(r, '[data-moves]');
      this.dom.best = qs(r, '[data-best]');
      this.dom.btnShuffle = qs(r, '[data-shuffle]');
      this.dom.btnReveal = qs(r, '[data-reveal]');
      this.dom.btnSkip = qs(r, '[data-skip]');
    }

    // Create the 8 tile elements (buttons for accessibility)
    _buildTiles() {
      this.dom.layer.innerHTML = '';
      this.tilesByNum = {};
      for (let num = 1; num <= 8; num++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'vb-tile';
        tile.dataset.num = String(num);
        tile.setAttribute('aria-label', `Tile ${num}`);
        tile.style.position = 'absolute';
        tile.style.willChange = 'transform';
        tile.style.backgroundRepeat = 'no-repeat';
        tile.style.border = '0';
        tile.style.borderRadius = '6px';
        this.dom.layer.appendChild(tile);
        this.tilesByNum[num] = tile;
      }
      this._recomputePosMap();
    }

    // Measure container size and layout tiles with pixel-perfect background slicing
    _measureAndLayout() {
      const W = this.dom.layer.clientWidth;
      const H = this.dom.layer.clientHeight;
      const tileW = W / GRID_SIZE;
      const tileH = H / GRID_SIZE;
      this.size = { W, H, tileW, tileH };

      // Set each tile's size and background slice based on its goal position
      for (let num = 1; num <= 8; num++) {
        const tile = this.tilesByNum[num];
        tile.style.width = `${tileW}px`;
        tile.style.height = `${tileH}px`;
        const goal = num - 1;
        const gx = goal % GRID_SIZE, gy = Math.floor(goal / GRID_SIZE);
        tile.style.backgroundImage = `url('${this.imageSrc}')`;
        tile.style.backgroundSize = `${W}px ${H}px`;
        tile.style.backgroundPosition = `-${gx * tileW}px -${gy * tileH}px`;
      }
      // Update tile positions without animation
      this._syncPositions(false);
    }

    // Bind all event listeners: clicks, gestures, keyboard, buttons, resize
    _bind() {
      // Click/tap on tiles
      this.dom.layer.addEventListener('click', this._handleClick.bind(this));

      // Gesture start (pointerdown)
      this.dom.layer.addEventListener('pointerdown', this._handlePointerDown.bind(this));
      // Gesture end (pointerup)
      this.dom.layer.addEventListener('pointerup', this._handlePointerUp.bind(this));

      // Keyboard navigation
      this.dom.layer.addEventListener('keydown', this._handleKeydown.bind(this));

      // Button clicks
      this.dom.btnShuffle.addEventListener('click', this.shuffle.bind(this));
      this.dom.btnReveal.addEventListener('click', this._reveal.bind(this));
      this.dom.btnSkip.addEventListener('click', this._skip.bind(this));

      // Resize handler (debounced for performance)
      this._resizeListener = debounce(() => this._measureAndLayout(), 100);
      window.addEventListener('resize', this._resizeListener, { passive: true });
    }

    // Handle click on tile
    _handleClick(e) {
      const btn = e.target.closest('.vb-tile');
      if (!btn) return;
      const num = parseInt(btn.dataset.num, 10);
      const pos = this.posByNum[num];
      if (pos >= 0) this._tryMove(pos);
    }

    // Handle pointer down for swipe gestures
    _handlePointerDown(e) {
      const t = e.target.closest('.vb-tile');
      if (!t) return;
      this._gesture = { startX: e.clientX, startY: e.clientY, num: parseInt(t.dataset.num, 10) };
      t.setPointerCapture(e.pointerId);
    }

    // Handle pointer up to detect swipes
    _handlePointerUp(e) {
      if (!this._gesture) return;
      const g = this._gesture;
      this._gesture = null;
      const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
      if (Math.hypot(dx, dy) < 8) return; // Ignore tiny movements (treated as click)
      const pos = this.posByNum[g.num];
      const empty = this.state.emptyPos;
      const { x: tx, y: ty } = posToXY(pos), { x: ex, y: ey } = posToXY(empty);
      // Horizontal swipe if same row
      if (Math.abs(dx) > Math.abs(dy) && ty === ey) {
        this._tryMove(pos);
      // Vertical swipe if same column
      } else if (tx === ex) {
        this._tryMove(pos);
      }
    }

    // Handle keyboard input for moving empty space
    _handleKeydown(e) {
      const key = String(e.key || '').toLowerCase();
      const empty = this.state.emptyPos;
      const { x, y } = posToXY(empty);
      let target = null;
      if (key === 'arrowup' || key === 'w') target = (y < GRID_SIZE - 1) ? xyToPos(x, y + 1) : null;
      if (key === 'arrowdown' || key === 's') target = (y > 0) ? xyToPos(x, y - 1) : null;
      if (key === 'arrowleft' || key === 'a') target = (x < GRID_SIZE - 1) ? xyToPos(x + 1, y) : null;
      if (key === 'arrowright' || key === 'd') target = (x > 0) ? xyToPos(x - 1, y) : null;
      if (target !== null) {
        e.preventDefault();
        this._tryMove(target);
      }
    }

    // Recompute mapping of numbers to positions
    _recomputePosMap() {
      for (let num = 0; num < GRID_SIZE * GRID_SIZE; num++) {
        this.posByNum[num] = this.state.order.indexOf(num);
      }
    }

    // Shuffle to a solvable, non-solved state
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

    // Update tile positions in DOM (with optional animation)
    _syncPositions(animate) {
      const { tileW, tileH } = this.size;
      for (let num = 1; num <= 8; num++) {
        const tile = this.tilesByNum[num];
        const pos = this.posByNum[num];
        const { x, y } = posToXY(pos);
        if (animate) {
          tile.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)';
        } else {
          tile.style.transition = 'none';
        }
        tile.style.transform = `translate3d(${x * tileW}px, ${y * tileH}px, 0)`;
      }
    }

    // Update moves display
    _renderStats() {
      if (this.dom.moves) this.dom.moves.textContent = String(this.state.moves);
    }

    // Attempt to move a tile into the empty space (adjacent or smart slide)
    _tryMove(tilePos) {
      const emptyPos = this.state.emptyPos;
      if (tilePos === emptyPos) return;

      const { x: tx, y: ty } = posToXY(tilePos);
      const { x: ex, y: ey } = posToXY(emptyPos);

      // Check for adjacent move
      const adjacent = (tx === ex && Math.abs(ty - ey) === 1) || (ty === ey && Math.abs(tx - ex) === 1);

      if (adjacent) {
        const numAtTile = this.state.order[tilePos];
        // Swap tile and empty
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

      // Smart slide if enabled and in same row/column
      if (SMART_SLIDE && sameRowOrCol(tilePos, emptyPos)) {
        // Determine step direction to move empty toward tile
        const step = (tx === ex) ? (ey > ty ? -GRID_SIZE : GRID_SIZE) : (ex > tx ? -1 : 1);
        let curEmpty = emptyPos;
        let moves = 0;

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

    // Start the timer loop
    _startTimer() {
      const tick = () => {
        const ms = Math.max(0, now() - this.state.startTs);
        if (this.dom.time) this.dom.time.textContent = formatMs(ms);
        this.state.raf = requestAnimationFrame(tick);
      };
      this.state.startTs = now();
      this.state.raf = requestAnimationFrame(tick);

      // Load and display best time
      const best = localStorage.getItem(LS_KEY_BEST);
      if (best && this.dom.best) this.dom.best.textContent = formatMs(parseInt(best, 10));
    }

    // Stop the timer loop
    _stopTimer() {
      if (this.state.raf) {
        cancelAnimationFrame(this.state.raf);
        this.state.raf = null;
      }
    }

    // Handle puzzle solved: stop timer, update best, animate, destroy, callback
    async _onSolved() {
      this._stopTimer();
      const elapsed = Math.max(0, now() - this.state.startTs);
      const best = localStorage.getItem(LS_KEY_BEST);
      if (!best || elapsed < parseInt(best, 10)) {
        localStorage.setItem(LS_KEY_BEST, String(elapsed));
      }

      // Brief reveal animation
      this.dom.image.classList.add('vb-solved');
      setTimeout(() => this.dom.image.classList.remove('vb-solved'), 700);

      // Short delay for animation
      await new Promise(r => setTimeout(r, 420));
      this.destroy();
      if (typeof this.onSolved === 'function') {
        this.onSolved({ elapsedMs: elapsed, moves: this.state.moves });
      }
      window.dispatchEvent(new CustomEvent('PUZZLE_SOLVED', { detail: { elapsedMs: elapsed, moves: this.state.moves } }));
    }

    // Instantly solve the puzzle (reveal button)
    _reveal() {
      this.state.order = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      this._recomputePosMap();
      this.state.emptyPos = 8;
      this._syncPositions(false);
      this._onSolved();
    }

    // Skip the puzzle
    _skip() {
      this.destroy();
      if (typeof this.onSkip === 'function') {
        this.onSkip();
      }
      window.dispatchEvent(new CustomEvent('PUZZLE_SKIPPED'));
    }

    // Preload the image to avoid displaying before it's ready
    _preloadImage() {
      if (!this._imagePreload) {
        this._imagePreload = new Promise((resolve, reject) => {
          const img = new Image();
          img.src = this.imageSrc;
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load image: ${this.imageSrc}`));
        });
      }
      return this._imagePreload;
    }

    // Clean up: stop timer, remove listeners, clear DOM
    destroy() {
      this._stopTimer();
      // Remove event listeners to prevent leaks
      if (this._resizeListener) {
        window.removeEventListener('resize', this._resizeListener);
      }
      if (this.root) this.root.innerHTML = '';
      this.tilesByNum = {};
      this._mounted = false;
      this._imagePreload = null;
      window.dispatchEvent(new CustomEvent('PUZZLE_DESTROYED'));
    }
  }

  // Generate a shuffled, solvable array (not already solved)
  function shuffledSolvable() {
    const base = [1, 2, 3, 4, 5, 6, 7, 8, 0];
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

  // Debounce function for resize handling
  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Exposed mount function
  function VBIntroPuzzle_mount({ container, imageSrc, onSolved, onSkip }) {
    const root = (typeof container === 'string') ? qs(document, container) : container;
    if (!root) throw new Error('VBIntroPuzzle: container not found');
    if (!imageSrc) throw new Error('VBIntroPuzzle: imageSrc required');
    const game = new IntroPuzzle({ root, imageSrc, onSolved, onSkip });
    game.mount().catch(err => console.error('VBIntroPuzzle mount error:', err));
    return game;
  }

  // Attach to window
  window.VBIntroPuzzle = { mount: VBIntroPuzzle_mount };
})();