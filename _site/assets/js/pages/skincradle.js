(() => {
    'use strict';

    const video = document.getElementById('camera');
    const drawCanvas = document.getElementById('drawCanvas');
    const canvas = document.getElementById('canvas');

    const loading = document.getElementById('loading');
    const eyeLock = document.getElementById('eyeLock');
    const statusEl = document.getElementById('status');
    const telemetryEl = document.getElementById('telemetry');
    const eyeStatusEl = document.getElementById('eyeStatus');
    const drawStatusEl = document.getElementById('drawStatus');
    const errorText = document.getElementById('errorText');

    const startBtn = document.getElementById('startBtn');
    const videoBtn = document.getElementById('videoBtn');
    const silhouetteBtn = document.getElementById('silhouetteBtn');
    const burstBtn = document.getElementById('burstBtn');
    const cradleBtn = document.getElementById('cradleBtn');
    const haloBtn = document.getElementById('haloBtn');
    const drawBtn = document.getElementById('drawBtn');
    const clearDrawBtn = document.getElementById('clearDrawBtn');
    const cradleMode = document.getElementById('cradleMode');

    const requiredElements = {
        video,
        drawCanvas,
        canvas,
        loading,
        eyeLock,
        statusEl,
        telemetryEl,
        eyeStatusEl,
        drawStatusEl,
        errorText,
        startBtn,
        videoBtn,
        silhouetteBtn,
        burstBtn,
        cradleBtn,
        haloBtn,
        drawBtn,
        clearDrawBtn,
        cradleMode
    };

    const missingElements = Object.entries(requiredElements)
        .filter(([, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length) {
        console.error('SkinCradle did not initialize. Missing elements:', missingElements.join(', '));
        return;
    }

    const drawCtx = drawCanvas.getContext('2d', { alpha: true, desynchronized: true });
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

    if (!drawCtx || !ctx) {
        console.error('SkinCradle did not initialize. Canvas rendering context is unavailable.');
        errorText.textContent = 'Canvas rendering is unavailable in this browser context.';
        return;
    }

    const FINGER_TIPS = [4, 8, 12, 16, 20];
    const FINGER_PIPS = [2, 6, 10, 14, 18];
    const FINGER_BASES = [3, 6, 10, 14, 18];
    const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    const FINGER_COLORS = ['#22d3ee', '#fde047', '#f0abfc', '#86efac', '#fb7185'];
    const FINGER_ACCENTS = ['#67e8f9', '#fb923c', '#a78bfa', '#34d399', '#fda4af'];

    const DRAW_COLORS = {
        red: '#ef4444',
        green: '#22c55e',
        blue: '#3b82f6',
        black: '#020617',
        eraser: 'rgba(0, 0, 0, 1)'
    };

    const DRAW_LABELS = {
        red: 'red',
        green: 'green',
        blue: 'blue',
        black: 'black',
        eraser: 'eraser',
        idle: 'none'
    };

    const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
    ];

    const FACE_OUTLINE = [
        10, 338, 297, 332, 284, 251, 389, 356, 454,
        323, 361, 288, 397, 365, 379, 378, 400, 377,
        152, 148, 176, 149, 150, 136, 172, 58, 132,
        93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    const EYE_LANDMARKS = {
        left: { outer: 33, inner: 133, upper: [159, 158], lower: [145, 153] },
        right: { outer: 362, inner: 263, upper: [386, 385], lower: [374, 380] }
    };

    const state = {
        width: 0,
        height: 0,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        cameraReady: false,
        lastHandResults: null,
        lastFaceResults: null,
        particles: [],
        rings: [],
        trails: new Map(),
        lastTouchBurst: new Map(),
        lastFrameAt: performance.now(),
        fps: 0,
        showVideo: true,
        silhouette: false,
        bursts: true,
        showCradle: true,
        showHalos: true,
        drawMode: false,
        drawInk: 'idle',
        drawingActive: false,
        drawLastPoint: null,
        drawLastHandKey: null,
        drawLastAt: 0,
        drawStrokeWidth: 7,
        eraserWidth: 34,
        cradleMode: 'all',
        eyeClosed: false,
        eyeClosedSince: 0,
        eyeLocked: false,
        eyeOpenness: 1,
        lastEyeSeenAt: 0,
        lastHandSeenAt: 0,
        lastHandResultAt: 0,
        lastHandsSentAt: 0,
        lastFaceSentAt: 0,
        visionBusy: false,
        busyHands: false,
        busyFace: false,
        cameraStream: null
    };

    let hands;
    let faceMesh;
    let frameLoopId = 0;
    let visionLoopId = 0;
    const MEDIAPIPE_HANDS_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';
    const MEDIAPIPE_FACE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';

    function resizeCanvasSurface(targetCanvas, targetCtx, preserve) {
        let snapshot = null;

        if (preserve && targetCanvas.width > 0 && targetCanvas.height > 0) {
            snapshot = document.createElement('canvas');
            snapshot.width = targetCanvas.width;
            snapshot.height = targetCanvas.height;
            snapshot.getContext('2d').drawImage(targetCanvas, 0, 0);
        }

        targetCanvas.width = Math.floor(state.width * state.dpr);
        targetCanvas.height = Math.floor(state.height * state.dpr);
        targetCanvas.style.width = state.width + 'px';
        targetCanvas.style.height = state.height + 'px';

        targetCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        if (snapshot) {
            targetCtx.drawImage(snapshot, 0, 0, state.width, state.height);
        }
    }

    function resize() {
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);

        resizeCanvasSurface(canvas, ctx, false);
        resizeCanvasSurface(drawCanvas, drawCtx, true);
    }

    function normalizedToScreen(point) {
        return {
            x: (1 - point.x) * state.width,
            y: point.y * state.height,
            z: point.z || 0
        };
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function cradleEnabled() {
        return state.showCradle && !state.drawMode;
    }

    function halosEnabled() {
        return state.showHalos;
    }

    function getFingerColor(index) {
        return FINGER_COLORS[index] || '#22d3ee';
    }

    function getFingerAccent(index) {
        return FINGER_ACCENTS[index] || '#fde047';
    }

    function getFingerIndexFromTip(landmarkIndex) {
        return FINGER_TIPS.indexOf(landmarkIndex);
    }

    function measureEye(face, spec) {
        const outer = normalizedToScreen(face[spec.outer]);
        const inner = normalizedToScreen(face[spec.inner]);
        const width = Math.max(distance(outer, inner), 1);

        let openness = 0;

        for (let i = 0; i < spec.upper.length; i++) {
            openness += distance(
                normalizedToScreen(face[spec.upper[i]]),
                normalizedToScreen(face[spec.lower[i]])
            );
        }

        return (openness / spec.upper.length) / width;
    }

    function updateEyeGate(results) {
        const face = results?.multiFaceLandmarks?.[0];
        const now = performance.now();

        if (!face) {
            state.eyeClosed = false;
            state.eyeClosedSince = 0;
            state.lastEyeSeenAt = 0;
            eyeStatusEl.textContent = state.eyeLocked ? 'Eyes: open to resume' : 'Eyes: no face';
            return;
        }

        const rawOpenness = (
            measureEye(face, EYE_LANDMARKS.left) +
            measureEye(face, EYE_LANDMARKS.right)
        ) / 2;

        state.eyeOpenness = state.eyeOpenness * 0.72 + rawOpenness * 0.28;
        state.lastEyeSeenAt = now;

        const closed = state.eyeOpenness < 0.2;

        if (closed) {
            if (!state.eyeClosedSince) {
                state.eyeClosedSince = now;
            }

            state.eyeClosed = true;

            const closedFor = now - state.eyeClosedSince;

            if (closedFor >= 3000) {
                setEyeLocked(true);
                eyeStatusEl.textContent = 'Eyes: paused';
            } else {
                eyeStatusEl.textContent = `Eyes: closing ${Math.ceil((3000 - closedFor) / 1000)}s`;
            }

            return;
        }

        state.eyeClosed = false;
        state.eyeClosedSince = 0;
        setEyeLocked(false);
        eyeStatusEl.textContent = 'Eyes: open';
    }

    function setEyeLocked(locked) {
        if (state.eyeLocked === locked) return;

        state.eyeLocked = locked;
        eyeLock.classList.toggle('hidden', !locked);

        if (locked) {
            state.rings = [];
            state.particles = [];
            state.trails.clear();
            state.drawLastPoint = null;
            state.drawingActive = false;
            statusEl.textContent = 'Gesture engine paused.';
        } else if (state.cameraReady) {
            statusEl.textContent = 'Tracking hands and face...';
        }
    }

    function getTrail(key) {
        let trail = state.trails.get(key);

        if (!trail) {
            trail = [];
            state.trails.set(key, trail);
        }

        return trail;
    }

    function pushTrail(key, point, maxLength = 18) {
        const trail = getTrail(key);
        const now = performance.now();
        const last = trail[trail.length - 1];

        if (!last || distance(last, point) > 2.5) {
            trail.push({ x: point.x, y: point.y, t: now });
        }

        while (trail.length > maxLength) trail.shift();
        while (trail.length && now - trail[0].t > 850) trail.shift();

        return trail;
    }

    function circularMotionScore(trail) {
        if (trail.length < 9) return 0;

        let cx = 0;
        let cy = 0;

        for (const p of trail) {
            cx += p.x;
            cy += p.y;
        }

        cx /= trail.length;
        cy /= trail.length;

        let radiusSum = 0;
        let minR = Infinity;
        let maxR = 0;
        let angularTravel = 0;
        let previousAngle = null;
        let path = 0;

        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            const r = Math.hypot(p.x - cx, p.y - cy);

            radiusSum += r;
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);

            const angle = Math.atan2(p.y - cy, p.x - cx);

            if (previousAngle !== null) {
                let delta = angle - previousAngle;

                while (delta > Math.PI) delta -= Math.PI * 2;
                while (delta < -Math.PI) delta += Math.PI * 2;

                angularTravel += Math.abs(delta);
                path += distance(trail[i - 1], p);
            }

            previousAngle = angle;
        }

        const avgR = radiusSum / trail.length;

        if (avgR < 8 || path < 35) return 0;

        const radiusConsistency = 1 - clamp((maxR - minR) / Math.max(avgR * 2.4, 1), 0, 1);
        const angularScore = clamp(angularTravel / (Math.PI * 1.35), 0, 1);
        const pathScore = clamp(path / 150, 0, 1);

        return clamp(
            (angularScore * 0.48) +
            (radiusConsistency * 0.24) +
            (pathScore * 0.28),
            0,
            1
        );
    }

    function spawnRing(x, y, radius, color, type, life = 900) {
        const now = performance.now();
        const key = type + ':' + Math.round(x / 20) + ':' + Math.round(y / 20);
        const existing = state.rings.find(r => r.key === key && now - r.createdAt < 180);

        if (existing) {
            existing.x = x;
            existing.y = y;
            existing.radius = Math.max(existing.radius, radius);
            existing.life = life;
            return;
        }

        state.rings.push({
            key,
            x,
            y,
            radius,
            color,
            type,
            createdAt: now,
            life,
            spin: Math.random() * Math.PI * 2
        });
    }

    function spawnBurst(x, y, color, count = 18) {
        if (!state.bursts) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = lerp(1.2, 6.4, Math.random());

            state.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: lerp(1.2, 4.4, Math.random()),
                color,
                life: lerp(420, 920, Math.random()),
                createdAt: performance.now()
            });
        }
    }

    function drawGlowLine(a, b, width, pulse, labelIndex, color = '#22d3ee', accent = '#fde047', alpha = 1) {
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);

        gradient.addColorStop(0, color);
        gradient.addColorStop(0.48, accent);
        gradient.addColorStop(1, color);

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.max(Math.hypot(dx, dy), 1);
        const nx = -dy / length;
        const ny = dx / length;
        const wave = Math.sin(performance.now() * 0.007 + labelIndex * 1.7) * clamp(length / 14, 8, 34) * pulse;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 28 + pulse * 24;
        ctx.shadowColor = color;
        ctx.strokeStyle = gradient;

        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = (i === 0 ? 0.26 : i === 1 ? 0.48 : 1) * alpha;
            ctx.lineWidth = width + (2 - i) * 6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(midX + nx * wave, midY + ny * wave, b.x, b.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawPoint(point, color, radius = 5) {
        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStableHalo(center, radius, color, type, pulse = 0, tilt = 0) {
        const now = performance.now();
        const glow = type === 'head' ? 42 : 28;
        const lineWidth = type === 'head' ? 4.4 : 3;
        const wobble = Math.sin(now * 0.004 + pulse * 3) * (type === 'head' ? 0.05 : 0.08);

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(tilt + wobble);
        ctx.shadowBlur = glow + pulse * 18;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = 0.88;
        ctx.setLineDash(type === 'head' ? [34, 11, 7, 11] : [16, 7]);
        ctx.lineDashOffset = -now * (type === 'head' ? 0.035 : 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.18, radius * (type === 'head' ? 0.34 : 0.42), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.2 + pulse * 0.18;
        ctx.lineWidth = lineWidth * 3.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.18, radius * (type === 'head' ? 0.34 : 0.42), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function getFingerHaloCenter(points, fingerIndex, radius) {
        const tip = points[FINGER_TIPS[fingerIndex]];
        const base = points[FINGER_BASES[fingerIndex]];
        const vx = tip.x - base.x;
        const vy = tip.y - base.y;
        const length = Math.max(Math.hypot(vx, vy), 1);

        return {
            x: tip.x + (vx / length) * radius * 0.58,
            y: tip.y + (vy / length) * radius * 0.58 - radius * 0.14
        };
    }

    function drawFingerHalos(results) {
        if (!halosEnabled() || !results?.multiHandLandmarks) return;

        const activeIndexes = activeCradleIndexes();

        for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
            const handedness = results.multiHandedness?.[handIndex]?.label || `Hand${handIndex}`;
            const points = results.multiHandLandmarks[handIndex].map(normalizedToScreen);
            const palm = points[0];

            for (const fingerIndex of activeIndexes) {
                const tip = points[FINGER_TIPS[fingerIndex]];
                const base = points[FINGER_BASES[fingerIndex]];
                const trailKey = `${handedness}:halo:${FINGER_NAMES[fingerIndex]}`;
                const trail = pushTrail(trailKey, tip, 22);
                const score = circularMotionScore(trail);
                const radius = clamp(distance(tip, base) * 0.72 + distance(tip, palm) * 0.04, 14, 38);
                const center = getFingerHaloCenter(points, fingerIndex, radius);
                const color = getFingerColor(fingerIndex);
                const tilt = Math.atan2(tip.y - base.y, tip.x - base.x) + Math.PI / 2;

                drawStableHalo(center, radius, color, 'finger', score, tilt);

                if (score > 0.7) {
                    spawnRing(center.x, center.y, radius * 1.1, color, `finger-${handedness}-${FINGER_NAMES[fingerIndex]}`, 620);
                }
            }
        }
    }

    function drawHandSkeleton(landmarks, handedness) {
        const points = landmarks.map(normalizedToScreen);
        const handColor = handedness === 'Left' ? '#22d3ee' : '#f0abfc';

        if (state.silhouette) {
            ctx.save();
            ctx.globalAlpha = 0.32;
            ctx.shadowBlur = 28;
            ctx.shadowColor = handColor;
            ctx.strokeStyle = handColor;
            ctx.fillStyle = handColor;
            ctx.lineWidth = 2;

            const hull = [0, 1, 2, 4, 8, 12, 16, 20, 17, 0].map(i => points[i]);

            ctx.beginPath();
            ctx.moveTo(hull[0].x, hull[0].y);

            for (const p of hull.slice(1)) {
                ctx.lineTo(p.x, p.y);
            }

            ctx.closePath();
            ctx.stroke();

            ctx.globalAlpha = 0.08;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.34;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = handColor;
        ctx.shadowBlur = 14;
        ctx.shadowColor = handColor;

        for (const [aIndex, bIndex] of HAND_CONNECTIONS) {
            const a = points[aIndex];
            const b = points[bIndex];

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        ctx.restore();

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const fingerIndex = getFingerIndexFromTip(i);
            const isTip = fingerIndex !== -1;

            drawPoint(
                p,
                isTip ? getFingerColor(fingerIndex) : handColor,
                isTip ? 5.2 : 3.2
            );
        }
    }

    function getHandsBySide(results) {
        const output = { left: null, right: null };

        if (!results || !results.multiHandLandmarks) return output;

        const handsByScreenSide = results.multiHandLandmarks
            .map(landmarks => {
                const wrist = normalizedToScreen(landmarks[0]);
                const middle = normalizedToScreen(landmarks[9]);

                return {
                    landmarks,
                    x: (wrist.x + middle.x) / 2
                };
            })
            .sort((a, b) => a.x - b.x);

        output.left = handsByScreenSide[0]?.landmarks || null;
        output.right = handsByScreenSide[1]?.landmarks || null;

        return output;
    }

    function activeCradleIndexes() {
        switch (state.cradleMode) {
            case 'thumb':
                return [0];
            case 'index':
                return [1];
            case 'middle':
                return [2];
            case 'ring':
                return [3];
            case 'pinky':
                return [4];
            case 'three':
                return [1, 2, 3];
            case 'outer':
                return [0, 4];
            case 'all':
            default:
                return [0, 1, 2, 3, 4];
        }
    }

    function drawStrings(results) {
        if (!cradleEnabled()) return;
        if (!results?.multiHandLandmarks?.length) return;

        const activeIndexes = activeCradleIndexes();

        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            drawSingleHandCradle(results.multiHandLandmarks[i], activeIndexes, i);
        }

        const grouped = getHandsBySide(results);

        if (!grouped.left || !grouped.right) return;

        const leftPoints = activeIndexes.map(i => normalizedToScreen(grouped.left[FINGER_TIPS[i]]));
        const rightPoints = activeIndexes.map(i => normalizedToScreen(grouped.right[FINGER_TIPS[i]]));

        for (const i of activeIndexes) {
            const left = normalizedToScreen(grouped.left[FINGER_TIPS[i]]);
            const right = normalizedToScreen(grouped.right[FINGER_TIPS[i]]);
            const d = distance(left, right);
            const stretch = clamp(d / Math.max(state.width * 0.55, 1), 0, 1);
            const width = lerp(2.4, 7.4, stretch);
            const pulse = lerp(0.62, 1.45, stretch);

            drawGlowLine(left, right, width, pulse, i, getFingerColor(i), getFingerAccent(i));

            if (d < 42) {
                const burstKey = `touch:${i}`;
                const last = state.lastTouchBurst.get(burstKey) || 0;
                const now = performance.now();

                if (now - last > 360) {
                    spawnBurst((left.x + right.x) / 2, (left.y + right.y) / 2, getFingerColor(i), 22);
                    state.lastTouchBurst.set(burstKey, now);
                }
            }
        }

        for (let i = 0; i < activeIndexes.length - 1; i++) {
            const current = activeIndexes[i];
            const next = activeIndexes[i + 1];
            const alpha = activeIndexes.length > 2 ? 0.42 : 0.32;

            drawGlowLine(leftPoints[i], leftPoints[i + 1], 1.1, 0.42, current + 20, getFingerColor(current), getFingerColor(next), alpha);
            drawGlowLine(rightPoints[i], rightPoints[i + 1], 1.1, 0.42, next + 24, getFingerColor(next), getFingerColor(current), alpha);
            drawGlowLine(leftPoints[i], rightPoints[i + 1], 0.9, 0.34, current + 30, getFingerAccent(current), getFingerColor(next), 0.28);
            drawGlowLine(rightPoints[i], leftPoints[i + 1], 0.9, 0.34, next + 34, getFingerAccent(next), getFingerColor(current), 0.28);
        }
    }

    function drawSingleHandCradle(landmarks, activeIndexes, handIndex) {
        const points = landmarks.map(normalizedToScreen);
        const palm = points[0];
        const wrist = points[0];

        const activeTips = activeIndexes.map(i => ({
            fingerIndex: i,
            tip: points[FINGER_TIPS[i]],
            base: points[FINGER_BASES[i]]
        }));

        if (!activeTips.length) return;

        for (const node of activeTips) {
            drawGlowLine(
                node.base,
                node.tip,
                1.25,
                0.45,
                handIndex * 10 + node.fingerIndex,
                getFingerColor(node.fingerIndex),
                getFingerAccent(node.fingerIndex),
                0.5
            );
        }

        for (let i = 0; i < activeTips.length - 1; i++) {
            const current = activeTips[i];
            const next = activeTips[i + 1];

            drawGlowLine(
                current.tip,
                next.tip,
                1.8,
                0.72,
                handIndex * 12 + current.fingerIndex + 16,
                getFingerColor(current.fingerIndex),
                getFingerColor(next.fingerIndex),
                0.72
            );
        }

        if (activeTips.length === 1) {
            const node = activeTips[0];

            const anchor = {
                x: lerp(wrist.x, node.base.x, 0.58),
                y: lerp(wrist.y, node.base.y, 0.58)
            };

            drawGlowLine(
                anchor,
                node.tip,
                1.9,
                0.78,
                handIndex * 20 + node.fingerIndex,
                getFingerColor(node.fingerIndex),
                getFingerAccent(node.fingerIndex),
                0.82
            );

            return;
        }

        if (activeTips.length > 2) {
            const first = activeTips[0];
            const last = activeTips[activeTips.length - 1];

            drawGlowLine(
                first.tip,
                last.tip,
                1.35,
                0.56,
                handIndex * 18 + 42,
                getFingerColor(first.fingerIndex),
                getFingerColor(last.fingerIndex),
                0.48
            );
        }

        for (let i = 0; i < activeTips.length; i++) {
            const node = activeTips[i];

            drawGlowLine(
                palm,
                node.tip,
                0.85,
                0.32,
                handIndex * 24 + i + 52,
                getFingerAccent(node.fingerIndex),
                getFingerColor(node.fingerIndex),
                0.24
            );
        }
    }

    function drawHeadHalo(results) {
        if (!halosEnabled()) return false;

        const face = results?.multiFaceLandmarks?.[0];

        if (!face) return false;

        const forehead = normalizedToScreen(face[10]);
        const chin = normalizedToScreen(face[152]);
        const leftTemple = normalizedToScreen(face[127]);
        const rightTemple = normalizedToScreen(face[356]);
        const faceHeight = distance(forehead, chin);
        const headWidth = distance(leftTemple, rightTemple);
        const radius = clamp(headWidth * 0.42, 38, 128);

        const center = {
            x: (forehead.x + leftTemple.x + rightTemple.x) / 3,
            y: forehead.y - clamp(faceHeight * 0.18, 20, 76)
        };

        const tilt = Math.atan2(rightTemple.y - leftTemple.y, rightTemple.x - leftTemple.x) * 0.32;
        const trail = pushTrail('face:crown', center, 24);
        const score = circularMotionScore(trail);

        drawStableHalo(center, radius, '#fde047', 'head', score, tilt);

        if (score > 0.62) {
            spawnRing(center.x, center.y, radius * 0.92, '#fde047', 'head', 780);
        }

        return true;
    }

    function drawFace(results) {
        const face = results?.multiFaceLandmarks?.[0];

        if (!face) return false;

        if (state.silhouette) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.shadowBlur = 35;
            ctx.shadowColor = '#22d3ee';
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;

            ctx.beginPath();

            for (let i = 0; i < FACE_OUTLINE.length; i++) {
                const p = normalizedToScreen(face[FACE_OUTLINE[i]]);

                if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }

            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        return true;
    }

    function drawRings() {
        const now = performance.now();
        const alive = [];

        for (const ring of state.rings) {
            const age = now - ring.createdAt;

            if (age > ring.life) continue;

            const t = age / ring.life;
            const alpha = Math.sin((1 - t) * Math.PI * 0.5) * 0.95;
            const radius = ring.radius + t * 28;
            const dashOffset = ring.spin + now * 0.004;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ring.x, ring.y);
            ctx.rotate(dashOffset);
            ctx.shadowBlur = ring.type === 'head' ? 44 : 30;
            ctx.shadowColor = ring.color;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = ring.type === 'head' ? 5 : 3.2;
            ctx.setLineDash(ring.type === 'head' ? [34, 12, 6, 12] : [18, 8]);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.18, radius * 0.54, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = alpha * 0.26;
            ctx.lineWidth = ring.type === 'head' ? 16 : 10;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.18, radius * 0.54, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            alive.push(ring);
        }

        state.rings = alive;
    }

    function drawParticles(delta) {
        const now = performance.now();
        const alive = [];

        for (const p of state.particles) {
            const age = now - p.createdAt;

            if (age > p.life) continue;

            const t = age / p.life;

            p.x += p.vx * delta * 0.065;
            p.y += p.vy * delta * 0.065;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.vy += 0.018 * delta;

            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.95;
            ctx.shadowBlur = 18;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * (1 - t * 0.4), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            alive.push(p);
        }

        state.particles = alive;
    }

    function drawBackground() {
        ctx.clearRect(0, 0, state.width, state.height);

        const gradient = ctx.createRadialGradient(
            state.width * 0.5,
            state.height * 0.5,
            0,
            state.width * 0.5,
            state.height * 0.5,
            Math.max(state.width, state.height)
        );

        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.06)');
        gradient.addColorStop(0.5, 'rgba(2, 6, 23, 0.16)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.36)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, state.width, state.height);
    }

    function getRaisedFingers(points) {
        const wrist = points[0];
        const raised = [false, false, false, false, false];

        const palmWidth = Math.max(distance(points[5], points[17]), 1);
        const thumbTip = points[4];
        const thumbIp = points[3];
        const indexBase = points[5];
        const pinkyBase = points[17];
        const palmDirection = Math.sign(pinkyBase.x - indexBase.x) || 1;

        raised[0] = (thumbTip.x - thumbIp.x) * palmDirection > palmWidth * 0.18;

        for (let i = 1; i < 5; i++) {
            const tip = points[FINGER_TIPS[i]];
            const pip = points[FINGER_PIPS[i]];
            const base = points[FINGER_BASES[i]];
            const extendedByY = tip.y < pip.y - palmWidth * 0.08;
            const extendedByDistance = distance(tip, wrist) > distance(base, wrist) + palmWidth * 0.08;
            raised[i] = extendedByY && extendedByDistance;
        }

        return raised;
    }

    function countRaisedNonThumb(raised) {
        let count = 0;

        for (let i = 1; i < 5; i++) {
            if (raised[i]) count++;
        }

        return count;
    }

    function averageFingerGap(points) {
        const tips = [8, 12, 16, 20].map(index => points[index]);
        let total = 0;
        let count = 0;

        for (let i = 0; i < tips.length - 1; i++) {
            total += distance(tips[i], tips[i + 1]);
            count++;
        }

        return total / Math.max(count, 1);
    }

    function classifyDrawGesture(landmarks, handednessLabel) {
        const points = landmarks.map(normalizedToScreen);
        const raised = getRaisedFingers(points);
        const nonThumbRaised = countRaisedNonThumb(raised);
        const palmWidth = Math.max(distance(points[5], points[17]), 1);
        const tipGap = averageFingerGap(points);
        const allMainFingersRaised = raised[1] && raised[2] && raised[3] && raised[4];
        const fingersTogether = tipGap < palmWidth * 0.62;
        const fist = nonThumbRaised === 0 && !raised[0];

        let ink = 'idle';
        let drawing = false;
        let erasing = false;

        if (allMainFingersRaised && fingersTogether) {
            ink = 'eraser';
            drawing = true;
            erasing = true;
        } else if (fist) {
            ink = 'black';
            drawing = false;
        } else if (nonThumbRaised === 1 && raised[1]) {
            ink = 'red';
            drawing = true;
        } else if (nonThumbRaised === 2 && raised[1] && raised[2]) {
            ink = 'green';
            drawing = true;
        } else if (nonThumbRaised === 3 && raised[1] && raised[2] && raised[3]) {
            ink = 'blue';
            drawing = true;
        }

        return {
            handKey: handednessLabel || 'Hand',
            points,
            raised,
            ink,
            drawing,
            erasing,
            penPoint: points[8],
            confidencePoint: points[6]
        };
    }

    function selectDrawHand(results) {
        if (!results?.multiHandLandmarks?.length) return null;

        const candidates = [];

        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const handedness = results.multiHandedness?.[i]?.label || `Hand${i}`;
            const gesture = classifyDrawGesture(results.multiHandLandmarks[i], handedness);

            if (gesture.ink !== 'idle') {
                candidates.push(gesture);
            }
        }

        const active = candidates.find(candidate => candidate.drawing);

        if (active) return active;
        if (candidates.length) return candidates[0];

        return null;
    }

    function smoothPoint(previous, current, weight = 0.68) {
        if (!previous) return current;

        return {
            x: previous.x * weight + current.x * (1 - weight),
            y: previous.y * weight + current.y * (1 - weight)
        };
    }

    function drawInkStroke(from, to, ink, erasing) {
        if (!from || !to) return;

        drawCtx.save();
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';

        if (erasing) {
            drawCtx.globalCompositeOperation = 'destination-out';
            drawCtx.strokeStyle = DRAW_COLORS.eraser;
            drawCtx.lineWidth = state.eraserWidth;
            drawCtx.shadowBlur = 0;
        } else {
            drawCtx.globalCompositeOperation = 'source-over';
            drawCtx.strokeStyle = DRAW_COLORS[ink] || DRAW_COLORS.red;
            drawCtx.lineWidth = ink === 'black' ? state.drawStrokeWidth + 1 : state.drawStrokeWidth;
            drawCtx.shadowBlur = ink === 'black' ? 0 : 10;
            drawCtx.shadowColor = DRAW_COLORS[ink] || DRAW_COLORS.red;
        }

        drawCtx.beginPath();
        drawCtx.moveTo(from.x, from.y);
        drawCtx.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2, to.x, to.y);
        drawCtx.stroke();
        drawCtx.restore();
    }

    function drawPenCursor(point, ink, erasing) {
        if (!state.drawMode || !point) return;

        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.shadowBlur = erasing ? 18 : 24;
        ctx.shadowColor = erasing ? '#e5e7eb' : DRAW_COLORS[ink] || '#ef4444';
        ctx.strokeStyle = erasing ? '#e5e7eb' : DRAW_COLORS[ink] || '#ef4444';
        ctx.lineWidth = 2.4;
        ctx.setLineDash(erasing ? [6, 6] : []);

        ctx.beginPath();
        ctx.arc(point.x, point.y, erasing ? state.eraserWidth * 0.5 : 11, 0, Math.PI * 2);
        ctx.stroke();

        if (!erasing) {
            ctx.fillStyle = DRAW_COLORS[ink] || '#ef4444';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function handleDrawMode(results) {
        if (!state.drawMode || state.eyeLocked) {
            state.drawInk = 'idle';
            state.drawingActive = false;
            state.drawLastPoint = null;
            updateDrawStatus();
            return;
        }

        const gesture = selectDrawHand(results);

        if (!gesture) {
            state.drawInk = 'idle';
            state.drawingActive = false;
            state.drawLastPoint = null;
            updateDrawStatus();
            return;
        }

        const now = performance.now();

        state.drawInk = gesture.ink;

        if (!gesture.drawing) {
            state.drawingActive = false;
            state.drawLastPoint = null;
            state.drawLastHandKey = gesture.handKey;
            state.drawLastAt = now;
            updateDrawStatus();
            drawPenCursor(gesture.penPoint, gesture.ink, gesture.erasing);
            return;
        }

        const smoothed = smoothPoint(state.drawLastPoint, gesture.penPoint, 0.58);
        const sameHand = state.drawLastHandKey === gesture.handKey;
        const freshStroke = now - state.drawLastAt < 180;
        const canConnect = state.drawingActive && sameHand && freshStroke && state.drawLastPoint;

        if (canConnect) {
            drawInkStroke(state.drawLastPoint, smoothed, gesture.ink, gesture.erasing);
        }

        state.drawLastPoint = smoothed;
        state.drawLastHandKey = gesture.handKey;
        state.drawLastAt = now;
        state.drawingActive = true;

        drawPenCursor(smoothed, gesture.ink, gesture.erasing);
        updateDrawStatus();
    }

    function updateDrawStatus() {
        const mode = state.drawMode ? 'on' : 'off';
        const ink = DRAW_LABELS[state.drawInk] || 'none';
        drawStatusEl.textContent = `Draw: ${mode} | Ink: ${ink}`;
    }

    function clearDrawing() {
        drawCtx.clearRect(0, 0, state.width, state.height);
        state.drawLastPoint = null;
        state.drawingActive = false;
    }

    function render() {
        const now = performance.now();
        const delta = Math.min(now - state.lastFrameAt, 50);

        state.lastFrameAt = now;
        state.fps = state.fps * 0.92 + (1000 / Math.max(delta, 1)) * 0.08;

        drawBackground();

        const handResults = state.lastHandResults;
        const faceResults = state.lastFaceResults;
        const handCount = handResults?.multiHandLandmarks?.length || 0;
        const hasFaceData = Boolean(faceResults?.multiFaceLandmarks?.[0]);
        const handsStale = state.cameraReady && now - state.lastHandResultAt > 1800;

        const cradleStatus = cradleEnabled()
            ? handCount >= 2
                ? '2-hand'
                : handCount === 1
                    ? '1-hand'
                    : handsStale
                        ? 'no hand feed'
                        : state.cameraReady
                            ? 'no hands'
                            : 'waiting'
            : state.drawMode
                ? 'draw mode'
                : 'off';

        if (state.eyeLocked) {
            telemetryEl.textContent = `Hands: ${handCount} | Face: ${hasFaceData ? 'yes' : 'no'} | Cradle: paused | FPS: ${Math.round(state.fps)}`;
            frameLoopId = requestAnimationFrame(render);
            return;
        }

        drawFingerHalos(handResults);

        const hasHeadHalo = drawHeadHalo(faceResults);

        drawRings();

        if (handResults?.multiHandLandmarks) {
            drawStrings(handResults);
            handleDrawMode(handResults);

            for (let i = 0; i < handResults.multiHandLandmarks.length; i++) {
                const label = handResults.multiHandedness?.[i]?.label || `Hand${i}`;
                drawHandSkeleton(handResults.multiHandLandmarks[i], label);
            }
        } else {
            handleDrawMode(null);
        }

        const hasFace = drawFace(faceResults);

        drawParticles(delta);

        const haloCount = halosEnabled() ? state.rings.length + (hasHeadHalo ? 1 : 0) : 0;

        telemetryEl.textContent = `Hands: ${handCount} | Face: ${hasFace ? 'yes' : 'no'} | Cradle: ${cradleStatus} | Halos: ${haloCount} | FPS: ${Math.round(state.fps)}`;

        frameLoopId = requestAnimationFrame(render);
    }

    async function initVision() {
        if (typeof Hands !== 'function' || typeof FaceMesh !== 'function') {
            throw new Error('MediaPipe vision libraries are unavailable.');
        }

        hands = new Hands({
            locateFile: file => `${MEDIAPIPE_HANDS_BASE}/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(results => {
            state.lastHandResults = results;
            state.lastHandResultAt = performance.now();

            if (results.multiHandLandmarks?.length) {
                state.lastHandSeenAt = state.lastHandResultAt;
            }

            state.busyHands = false;
        });

        faceMesh = new FaceMesh({
            locateFile: file => `${MEDIAPIPE_FACE_BASE}/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.62,
            minTrackingConfidence: 0.58
        });

        faceMesh.onResults(results => {
            state.lastFaceResults = results;
            updateEyeGate(results);
            state.busyFace = false;
        });
    }

    function stopCamera({ updateStatus = true } = {}) {
        state.cameraReady = false;
        state.visionBusy = false;
        state.busyHands = false;
        state.busyFace = false;

        if (state.cameraStream) {
            for (const track of state.cameraStream.getTracks()) {
                track.stop();
            }
        }

        state.cameraStream = null;
        video.pause();
        video.srcObject = null;
        startBtn.textContent = 'Start Camera';

        if (updateStatus) {
            statusEl.textContent = 'Camera stopped. Start when ready.';
            telemetryEl.textContent = 'Hands: 0 | Face: no | Cradle: waiting | Halos: 0 | FPS: 0';
            eyeStatusEl.textContent = 'Eyes: scanning';
        }
    }

    function cancelLoops() {
        if (frameLoopId) {
            cancelAnimationFrame(frameLoopId);
            frameLoopId = 0;
        }

        if (visionLoopId) {
            cancelAnimationFrame(visionLoopId);
            visionLoopId = 0;
        }
    }

    function shutdown() {
        cancelLoops();
        stopCamera({ updateStatus: false });
    }

    async function startCamera() {
        errorText.textContent = '';
        statusEl.textContent = 'Checking camera permission path...';
        loading.classList.remove('hidden');
        loading.classList.remove('has-error');

        try {
            if (!window.isSecureContext) {
                throw new Error('Camera permission is blocked because this page is not running in a secure context. Run it from https://, http://localhost, or http://127.0.0.1. Do not open it from a random file preview or an embedded sandbox.');
            }

            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                throw new Error('This browser context cannot access getUserMedia. Open the file directly in Chrome through localhost or a secure HTTPS page.');
            }

            if (!hands || !faceMesh) {
                await initVision();
            }

            stopCamera({ updateStatus: false });

            statusEl.textContent = 'Requesting camera permission from Chrome...';

            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 960 },
                    height: { ideal: 540 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            state.cameraStream = stream;
            video.srcObject = stream;

            await video.play();

            state.cameraReady = true;
            startBtn.textContent = 'Restart';
            statusEl.textContent = 'Tracking hands and face...';
            loading.classList.add('hidden');

            if (!frameLoopId) {
                render();
            }

            if (!visionLoopId) {
                runVisionLoop();
            }
        } catch (error) {
            console.error(error);

            state.cameraReady = false;
            statusEl.textContent = 'Camera permission blocked.';

            const message = error?.name === 'NotAllowedError'
                ? 'Chrome blocked camera permission. Click the lock/settings icon near the address bar, set Camera to Allow, then reload. If this is running in ChatGPT canvas or another preview, export/open it on localhost because embedded previews can block camera prompts.'
                : error?.name === 'NotFoundError'
                    ? 'No camera was found by the browser. Check that another app is not holding the camera.'
                    : error?.message || 'Camera access failed. Use Chrome and allow camera permission.';

            errorText.textContent = message;
            loading.classList.add('has-error');
        }
    }

    async function runVisionLoop() {
        if (!state.cameraReady || video.readyState < 2) {
            visionLoopId = requestAnimationFrame(runVisionLoop);
            return;
        }

        const now = performance.now();

        if (state.visionBusy) {
            visionLoopId = requestAnimationFrame(runVisionLoop);
            return;
        }

        const shouldRunHands = now - state.lastHandsSentAt > 50;
        const shouldRunFace = now - state.lastFaceSentAt > 125;

        state.visionBusy = true;

        try {
            if (shouldRunHands) {
                state.lastHandsSentAt = now;
                state.busyHands = true;
                await hands.send({ image: video });
            }

            if (shouldRunFace) {
                state.lastFaceSentAt = performance.now();
                state.busyFace = true;
                await faceMesh.send({ image: video });
            }
        } catch (error) {
            state.busyHands = false;
            state.busyFace = false;

            console.error(error);
            statusEl.textContent = 'Vision tracker error. Reload if this keeps happening.';
        } finally {
            state.visionBusy = false;
        }

        visionLoopId = requestAnimationFrame(runVisionLoop);
    }

    function toggleVideo() {
        state.showVideo = !state.showVideo;
        video.style.opacity = state.showVideo ? '0.34' : '0';
        videoBtn.textContent = state.showVideo ? 'Hide Video' : 'Show Video';
        videoBtn.classList.toggle('active', !state.showVideo);
        videoBtn.setAttribute('aria-pressed', String(!state.showVideo));
    }

    function toggleSilhouette() {
        state.silhouette = !state.silhouette;
        silhouetteBtn.classList.toggle('active', state.silhouette);
        silhouetteBtn.setAttribute('aria-pressed', String(state.silhouette));
    }

    function toggleBursts() {
        state.bursts = !state.bursts;
        burstBtn.textContent = state.bursts ? 'Bursts On' : 'Bursts Off';
        burstBtn.classList.toggle('active', state.bursts);
        burstBtn.setAttribute('aria-pressed', String(state.bursts));
    }

    function toggleCradle() {
        state.showCradle = !state.showCradle;
        cradleBtn.textContent = state.showCradle ? 'Cradle On' : 'Cradle Off';
        cradleBtn.classList.toggle('active', state.showCradle);
        cradleBtn.setAttribute('aria-pressed', String(state.showCradle));
        state.rings = [];
        state.particles = [];
        state.trails.clear();
    }

    function toggleHalo() {
        state.showHalos = !state.showHalos;
        haloBtn.textContent = state.showHalos ? 'Halo On' : 'Halo Off';
        haloBtn.classList.toggle('active', state.showHalos);
        haloBtn.setAttribute('aria-pressed', String(state.showHalos));
        state.rings = [];
        state.particles = [];
        state.trails.clear();
    }

    function toggleDrawMode() {
        state.drawMode = !state.drawMode;
        state.drawInk = 'idle';
        state.drawingActive = false;
        state.drawLastPoint = null;
        drawBtn.textContent = state.drawMode ? 'Draw On' : 'Draw Off';
        drawBtn.classList.toggle('draw-active', state.drawMode);
        drawBtn.setAttribute('aria-pressed', String(state.drawMode));
        updateDrawStatus();
    }

    function setCradleMode() {
        state.cradleMode = cradleMode.value;
        state.lastTouchBurst.clear();
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(resize, 250), { passive: true });
    window.addEventListener('pagehide', shutdown);
    window.addEventListener('beforeunload', shutdown);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) shutdown();
    });

    startBtn.addEventListener('click', startCamera);
    videoBtn.addEventListener('click', toggleVideo);
    silhouetteBtn.addEventListener('click', toggleSilhouette);
    burstBtn.addEventListener('click', toggleBursts);
    cradleBtn.addEventListener('click', toggleCradle);
    haloBtn.addEventListener('click', toggleHalo);
    drawBtn.addEventListener('click', toggleDrawMode);
    clearDrawBtn.addEventListener('click', clearDrawing);
    cradleMode.addEventListener('change', setCradleMode);

    resize();
    updateDrawStatus();

    initVision()
        .then(() => {
            statusEl.textContent = 'Ready. Start camera.';
            loading.classList.add('hidden');
        })
        .catch(error => {
            console.error(error);
            statusEl.textContent = 'Vision library failed to load.';
            errorText.textContent = 'Check internet connection. MediaPipe loads from CDN.';
            loading.classList.add('has-error');
        });
})();
