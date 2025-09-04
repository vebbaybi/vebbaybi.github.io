
/* =========================================================
   VBIntroPuzzle — 3×3 Sliding Picture Puzzle (8-puzzle)
   - Professional engine: solvable shuffle, mouse/touch/keyboard
   - Timer & moves, best-time persisted, a11y, events
   - No external deps. Image provided by caller.
   Public API:
     window.VBIntroPuzzle.mount({
       container: '#intro-root' | HTMLElement,
       imageSrc: '/assets/images/playme.jpg',
       onSolved: ({ elapsedMs, moves }) => {},
       onSkip: () => {}
     })
   Emits:
     PUZZLE_SOLVED (detail: { elapsedMs, moves })
     PUZZLE_SKIPPED
     PUZZLE_DESTROYED
   ========================================================= */

(function () {
  'use strict';

  const LS_KEY_BEST = 'vb_intro_best_time_ms';

  // DOM helpers
  const qs  = (root, sel) => (root || document).querySelector(sel);
  const qsa = (root, sel) => Array.from((root || document).querySelectorAll(sel));
  const now = () => performance.now();

  // Format mm:ss
  function formatMs(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }

  // 8-puzzle solvability for 3×3 (odd grid): inversion count must be even
  function inversions(order) {
    let inv = 0; const a = order.filter(v => v !== 0);
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
    return inv;
  }
  const isSolvable = (order) => inversions(order) % 2 === 0;
  const isGoal = (order) => order.every((v, i) => (i < 8 ? v === i + 1 : v === 0));

  const posToXY = (idx) => ({ x: idx % 3, y: Math.floor(idx / 3) });
  const xyToPos = (x, y) => y * 3 + x;
  const canMove = (tilePos, emptyPos) => {
    const { x: tx, y: ty } = posToXY(tilePos);
    const { x: ex, y: ey } = posToXY(emptyPos);
    return (tx === ex && Math.abs(ty - ey) === 1) || (ty === ey && Math.abs(tx - ex) === 1);
  };
  const setTransform = (el, x, y) => { el.style.transform = `translate(${x * 100}%, ${y * 100}%)`; };

  function shuffledSolvable() {
    const base = [1,2,3,4,5,6,7,8,0];
    let a;
    do {
      a = base.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    } while (!isSolvable(a) || isGoal(a));
    return a;
  }

  class IntroPuzzle {
    constructor({ root, imageSrc, onSolved, onSkip }) {
      this.root = root;
      this.imageSrc = imageSrc;
      this.onSolved = onSolved;
      this.onSkip = onSkip;
      this.state = {
        order: [1,2,3,4,5,6,7,8,0],
        emptyPos: 8,
        moves: 0,
        startTs: 0,
        raf: null
      };
      this.dom = {};
      this.tiles = [];
      this._mounted = false;
    }

    mount() {
      if (this._mounted) return; this._mounted = true;
      this.root.innerHTML = this._template();
      this._cacheDom();
      this.dom.image.style.background = `url('${this.imageSrc}') center/cover no-repeat`;
      this._buildTiles();
      this._bind();
      this.shuffle();
      this._startTimer();
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
            <div id="vb-intro-hint">Click/tap tiles or use arrow keys. Complete the image to continue.</div>
            <div class="vb-btns">
              <button class="vb-btn" data-shuffle type="button" aria-label="Shuffle">Shuffle</button>
              <button class="vb-btn" data-reveal  type="button" aria-label="Reveal and continue" title="Reveal & continue">Reveal</button>
              <button class="vb-btn primary" data-skip type="button" aria-label="Skip">Skip</button>
            </div>
          </div>
        </div>
      </div>`;
    }

    _cacheDom() {
      const r = this.root;
      this.dom.overlay = qs(r, '#vb-intro-overlay');
      this.dom.dialog  = qs(r, '#vb-intro-dialog');
      this.dom.layer   = qs(r, '#vb-puzzle-layer');
      this.dom.image   = qs(r, '#vb-puzzle-image');
      this.dom.time    = qs(r, '[data-time]');
      this.dom.moves   = qs(r, '[data-moves]');
      this.dom.best    = qs(r, '[data-best]');
      this.dom.btnShuffle = qs(r, '[data-shuffle]');
      this.dom.btnReveal  = qs(r, '[data-reveal]');
      this.dom.btnSkip    = qs(r, '[data-skip]');
    }

    _buildTiles() {
      this.dom.layer.innerHTML = '';
      this.tiles = [];
      for (let i = 0; i < 9; i++) {
        const isEmpty = (i === 8);
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'vb-tile' + (isEmpty ? ' vb-empty' : '');
        tile.setAttribute('data-pos', i.toString());
        tile.setAttribute('aria-label', isEmpty ? 'Empty space' : `Tile ${i + 1}`);
        if (!isEmpty) {
          const gx = (i % 3), gy = Math.floor(i / 3);
          tile.style.backgroundImage = `url('${this.imageSrc}')`;
          tile.style.backgroundPosition = `${gx * 50}% ${gy * 50}%`;
          tile.style.backgroundSize = '300% 300%';
        }
        this.dom.layer.appendChild(tile);
        this.tiles.push(tile);
      }
      this._syncPositions(false);
    }

    _bind() {
      // Pointer (click/tap)
      this.dom.layer.addEventListener('click', (e) => {
        const btn = e.target.closest('.vb-tile');
        if (!btn) return;
        this._tryMove(parseInt(btn.getAttribute('data-pos')));
      });

      // Keyboard (arrow keys / WASD on the layer)
      this.dom.layer.addEventListener('keydown', (e) => {
        const empty = this.state.emptyPos;
        const { x, y } = posToXY(empty);
        let target = null;
        if (e.key === 'ArrowUp'    || e.key === 'w') target = (y < 2) ? xyToPos(x, y + 1) : null;
        if (e.key === 'ArrowDown'  || e.key === 's') target = (y > 0) ? xyToPos(x, y - 1) : null;
        if (e.key === 'ArrowLeft'  || e.key === 'a') target = (x < 2) ? xyToPos(x + 1, y) : null;
        if (e.key === 'ArrowRight' || e.key === 'd') target = (x > 0) ? xyToPos(x - 1, y) : null;
        if (target !== null) { e.preventDefault(); this._tryMove(target); }
      });

      // Controls
      this.dom.btnShuffle.addEventListener('click', () => this.shuffle());
      this.dom.btnSkip.addEventListener('click', () => this._skip());
      this.dom.btnReveal.addEventListener('click', () => this._reveal());

      // Maintain crisp alignment on resize
      window.addEventListener('resize', () => this._syncPositions(false));
    }

    shuffle() {
      this.state.order = shuffledSolvable();
      this.state.emptyPos = this.state.order.indexOf(0);
      this.state.moves = 0;
      this.state.startTs = now();
      this._renderStats();
      this._syncPositions(true);
      this.dom.layer.focus({ preventScroll: true });
    }

    _startTimer() {
      const tick = () => {
        const ms = Math.max(0, now() - this.state.startTs);
        if (this.dom.time) this.dom.time.textContent = formatMs(ms);
        this.state.raf = requestAnimationFrame(tick);
      };
      this.state.startTs = now();
      this.state.raf = requestAnimationFrame(tick);

      const best = window.localStorage.getItem(LS_KEY_BEST);
      if (best && this.dom.best) this.dom.best.textContent = formatMs(parseInt(best, 10));
    }

    _stopTimer() {
      if (this.state.raf) { cancelAnimationFrame(this.state.raf); this.state.raf = null; }
    }

    _renderStats() {
      if (this.dom.moves) this.dom.moves.textContent = String(this.state.moves);
    }

    _syncPositions(animate) {
      for (let visualPos = 0; visualPos < 9; visualPos++) {
        const tileEl = this.tiles[visualPos];
        const { x, y } = posToXY(visualPos);
        if (tileEl) {
          if (animate) tileEl.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)';
          setTransform(tileEl, x, y);
        }
      }
      // mark empty and aria-disabled
      qsa(this.dom.layer, '.vb-tile').forEach((el, idx) => {
        const isEmpty = this.state.order[idx] === 0;
        el.classList.toggle('vb-empty', isEmpty);
        el.setAttribute('aria-disabled', isEmpty ? 'true' : 'false');
      });
    }

    _tryMove(tileVisualPos) {
      const emptyPos = this.state.emptyPos;
      if (!canMove(tileVisualPos, emptyPos)) return;

      // Swap order entries (visual positions)
      [this.state.order[tileVisualPos], this.state.order[emptyPos]] =
        [this.state.order[emptyPos], this.state.order[tileVisualPos]];
      this.state.emptyPos = tileVisualPos;

      this.state.moves++;
      this._renderStats();
      this._syncPositions(true);

      if (isGoal(this.state.order)) this._onSolved();
    }

    async _onSolved() {
      this._stopTimer();
      const elapsed = Math.max(0, now() - this.state.startTs);
      const best = window.localStorage.getItem(LS_KEY_BEST);
      if (!best || elapsed < parseInt(best, 10)) window.localStorage.setItem(LS_KEY_BEST, String(elapsed));

      // Solved flash
      this.dom.image.classList.add('vb-solved');
      setTimeout(() => this.dom.image.classList.remove('vb-solved'), 700);

      // Small pause so users perceive the solved state
      await new Promise(r => setTimeout(r, 420));

      this.destroy();
      if (typeof this.onSolved === 'function') this.onSolved({ elapsedMs: elapsed, moves: this.state.moves });
      window.dispatchEvent(new CustomEvent('PUZZLE_SOLVED', { detail: { elapsedMs: elapsed, moves: this.state.moves } }));
    }

    _skip() {
      this.destroy();
      if (typeof this.onSkip === 'function') this.onSkip();
      window.dispatchEvent(new CustomEvent('PUZZLE_SKIPPED'));
    }

    _reveal() {
      // Instantly show finished state then treat as solved
      this.state.order = [1,2,3,4,5,6,7,8,0];
      this.state.emptyPos = 8;
      this._syncPositions(false);
      this._onSolved();
    }

    destroy() {
      this._stopTimer();
      if (this.root) this.root.innerHTML = '';
      this.tiles = [];
      this._mounted = false;
      window.dispatchEvent(new CustomEvent('PUZZLE_DESTROYED'));
    }
  }

  function VBIntroPuzzle_mount({ container, imageSrc, onSolved, onSkip }) {
    const root = (typeof container === 'string') ? qs(document, container) : container;
    if (!root) throw new Error('VBIntroPuzzle: container not found');
    if (!imageSrc) throw new Error('VBIntroPuzzle: imageSrc required');
    const game = new IntroPuzzle({ root, imageSrc, onSolved, onSkip });
    game.mount();
    return game;
  }

  window.VBIntroPuzzle = { mount: VBIntroPuzzle_mount };
})();
