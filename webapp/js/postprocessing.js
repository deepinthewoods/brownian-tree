import { Vector2, SeededRandom } from './utils.js';

/**
 * Non-destructive post-processor for brownian tree data.
 * Produces processed polyline segments for rendering/export.
 */
export class PostProcessor {
    constructor() {
        this.settings = {
            fractalizeEnabled: false,
            fractalizeDepth: 3,
            fractalizeRoughness: 0.5,
            fractalizeMaxSegLen: 50,
            curvesEnabled: false,
            curveSmoothing: 0.5,
        };
    }

    isEnabled() {
        return this.settings.fractalizeEnabled || this.settings.curvesEnabled;
    }

    /**
     * Process tree data into renderable polyline segments.
     * Returns array of { points: [Vector2, ...], thickness: number }
     */
    process(tree) {
        const n = tree.start.length;
        if (n === 0) return [];

        // Copy raw segments
        let segments = [];
        for (let i = 0; i < n; i++) {
            segments.push({
                points: [tree.start[i].copy(), tree.end[i].copy()],
                thickness: tree.thickness[i] !== undefined ? tree.thickness[i] : 0,
                origIndex: i,
            });
        }

        // Step 1: Fractalize (runs first per user request)
        if (this.settings.fractalizeEnabled) {
            this._fractalize(segments);
        }

        // Step 2: Curves
        if (this.settings.curvesEnabled) {
            if (!this.settings.fractalizeEnabled) {
                // Curves only: per-segment Bezier with junction-aware tangents
                this._curvesBezier(segments, tree);
            } else {
                // Fractalize + Curves: smooth each fractalized polyline (lock endpoints)
                this._curvesSmooth(segments);
            }
        }

        return segments;
    }

    // ─── Fractalize ──────────────────────────────────────────────────

    _fractalize(segments) {
        const random = new SeededRandom(12345);
        const { fractalizeDepth, fractalizeRoughness, fractalizeMaxSegLen } = this.settings;

        for (const seg of segments) {
            const start = seg.points[0];
            const end = seg.points[seg.points.length - 1];
            seg.points = this._fractRecurse(start, end, fractalizeDepth, fractalizeRoughness, fractalizeMaxSegLen, random);
        }
    }

    _fractRecurse(start, end, depth, roughness, maxLen, random) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (depth <= 0 || len < 1) return [start, end];

        // Only subdivide segments that are long enough relative to maxLen and depth
        if (len < maxLen / (1 << depth)) return [start, end];

        // Midpoint with perpendicular displacement
        const mid = new Vector2((start.x + end.x) / 2, (start.y + end.y) / 2);
        const perpX = -dy / len;
        const perpY = dx / len;
        const disp = (random.nextFloat(0, 1) - 0.5) * roughness * len;
        mid.x += perpX * disp;
        mid.y += perpY * disp;

        const left = this._fractRecurse(start, mid, depth - 1, roughness, maxLen, random);
        const right = this._fractRecurse(mid, end, depth - 1, roughness, maxLen, random);

        // Merge, removing duplicate midpoint
        return [...left.slice(0, -1), ...right];
    }

    // ─── Curves (Bezier with junction-aware tangents) ────────────────

    _curvesBezier(segments, tree) {
        const smooth = this.settings.curveSmoothing;
        const n = tree.start.length;

        // Build point adjacency: pointKey -> [{idx, end:'s'|'e'}]
        const pk = (p) => `${p.x},${p.y}`;
        const adj = new Map();

        for (let i = 0; i < n; i++) {
            const sk = pk(tree.start[i]);
            const ek = pk(tree.end[i]);
            if (!adj.has(sk)) adj.set(sk, []);
            if (!adj.has(ek)) adj.set(ek, []);
            adj.get(sk).push({ i, w: 's' });
            adj.get(ek).push({ i, w: 'e' });
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const s = tree.start[i];
            const e = tree.end[i];
            const len = s.dst(e);
            if (len < 0.5) continue;

            // Compute junction-aware tangents at both endpoints
            const tanS = this._junctionTangent(s, e, pk(s), adj, i, tree);
            const tanE = this._junctionTangent(e, s, pk(e), adj, i, tree);

            // Cubic Bezier control points
            const f = len * smooth / 3;
            const p1 = new Vector2(s.x + tanS.x * f, s.y + tanS.y * f);
            const p2 = new Vector2(e.x + tanE.x * f, e.y + tanE.y * f);

            const numSamples = Math.max(6, Math.ceil(len / 5));
            seg.points = this._sampleBezier(s, p1, p2, e, numSamples);

            // Store Bezier data for SVG export
            seg.bezier = { p0: s.copy(), p1: p1.copy(), p2: p2.copy(), p3: e.copy() };
        }
    }

    /**
     * Compute the tangent direction at a junction point for smooth curves.
     * Returns a unit vector pointing from junctionPoint toward ownOtherEnd,
     * modulated by the through-flow direction of the best-aligned neighbor.
     */
    _junctionTangent(junctionPoint, ownOtherEnd, jKey, adj, segIdx, tree) {
        const dx = ownOtherEnd.x - junctionPoint.x;
        const dy = ownOtherEnd.y - junctionPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return new Vector2(1, 0);

        const ownDirX = dx / len;
        const ownDirY = dy / len;

        const neighbors = adj.get(jKey);
        if (!neighbors || neighbors.length <= 1) {
            return new Vector2(ownDirX, ownDirY);
        }

        // Find the neighbor whose other end is most opposed to ownDir
        // (best through-flow candidate)
        let bestDot = Infinity;
        let bestNDirX = 0, bestNDirY = 0;
        let found = false;

        for (const n of neighbors) {
            if (n.i === segIdx) continue;

            const nOther = (n.w === 's') ? tree.end[n.i] : tree.start[n.i];
            const ndx = nOther.x - junctionPoint.x;
            const ndy = nOther.y - junctionPoint.y;
            const nlen = Math.sqrt(ndx * ndx + ndy * ndy);
            if (nlen < 0.001) continue;

            const nDirX = ndx / nlen;
            const nDirY = ndy / nlen;
            const dot = ownDirX * nDirX + ownDirY * nDirY;

            if (dot < bestDot) {
                bestDot = dot;
                bestNDirX = nDirX;
                bestNDirY = nDirY;
                found = true;
            }
        }

        // Only use through-flow if neighbor is reasonably opposed (dot < -0.1)
        if (!found || bestDot > -0.1) {
            return new Vector2(ownDirX, ownDirY);
        }

        // Through tangent: average of ownDir and (-bestNeighborDir)
        let tx = ownDirX - bestNDirX;
        let ty = ownDirY - bestNDirY;
        const tlen = Math.sqrt(tx * tx + ty * ty);
        if (tlen < 0.001) return new Vector2(ownDirX, ownDirY);

        return new Vector2(tx / tlen, ty / tlen);
    }

    _sampleBezier(p0, p1, p2, p3, samples) {
        const points = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const u = 1 - t;
            points.push(new Vector2(
                u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
                u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
            ));
        }
        return points;
    }

    // ─── Curves (Catmull-Rom smoothing for fractalized polylines) ─────

    _curvesSmooth(segments) {
        const smooth = this.settings.curveSmoothing;

        for (const seg of segments) {
            const pts = seg.points;
            if (pts.length <= 2) continue;

            const result = [pts[0].copy()];
            const samplesPerSection = 4;

            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[Math.max(0, i - 1)];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[Math.min(pts.length - 1, i + 2)];

                for (let j = 1; j <= samplesPerSection; j++) {
                    const t = j / samplesPerSection;
                    const cr = this._catmullRom(p0, p1, p2, p3, t);
                    // Blend between linear and Catmull-Rom based on smoothing
                    const lin = new Vector2(
                        p1.x + (p2.x - p1.x) * t,
                        p1.y + (p2.y - p1.y) * t
                    );
                    result.push(new Vector2(
                        lin.x + (cr.x - lin.x) * smooth,
                        lin.y + (cr.y - lin.y) * smooth
                    ));
                }
            }

            // Ensure last point is exact
            result[result.length - 1] = pts[pts.length - 1].copy();
            seg.points = result;
        }
    }

    _catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return new Vector2(
            0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        );
    }
}


/**
 * UI panel for post-processing settings
 */
export class PostProcessingPanel {
    constructor(container, postProcessor, onSettingsChange) {
        this.container = container;
        this.postProcessor = postProcessor;
        this.onSettingsChange = onSettingsChange;
        this.render();
    }

    render() {
        const s = this.postProcessor.settings;

        this.container.innerHTML = `
            <h3>Fractalize</h3>
            <div class="setting-group">
                <label>
                    <input type="checkbox" class="pp-fractalize-enabled" ${s.fractalizeEnabled ? 'checked' : ''}>
                    Enable Fractalize
                </label>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Depth</span>
                        <span class="value pp-fract-depth-val">${s.fractalizeDepth}</span>
                    </div>
                    <input type="range" class="pp-fract-depth" min="1" max="6" value="${s.fractalizeDepth}" ${!s.fractalizeEnabled ? 'disabled' : ''}>
                </div>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Roughness</span>
                        <span class="value pp-fract-rough-val">${s.fractalizeRoughness.toFixed(2)}</span>
                    </div>
                    <input type="range" class="pp-fract-rough" min="0" max="100" value="${Math.round(s.fractalizeRoughness * 100)}" ${!s.fractalizeEnabled ? 'disabled' : ''}>
                </div>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Max Segment Length</span>
                        <span class="value pp-fract-maxlen-val">${s.fractalizeMaxSegLen}</span>
                    </div>
                    <input type="range" class="pp-fract-maxlen" min="5" max="200" value="${s.fractalizeMaxSegLen}" ${!s.fractalizeEnabled ? 'disabled' : ''}>
                </div>
            </div>

            <h3 style="margin-top: 12px;">Curves</h3>
            <div class="setting-group">
                <label>
                    <input type="checkbox" class="pp-curves-enabled" ${s.curvesEnabled ? 'checked' : ''}>
                    Enable Curves
                </label>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Smoothing</span>
                        <span class="value pp-curve-smooth-val">${s.curveSmoothing.toFixed(2)}</span>
                    </div>
                    <input type="range" class="pp-curve-smooth" min="0" max="100" value="${Math.round(s.curveSmoothing * 100)}" ${!s.curvesEnabled ? 'disabled' : ''}>
                </div>
            </div>

            <button class="btn btn-go pp-apply-btn" style="margin-top: 8px;">Apply Post Processing</button>
        `;

        this._setupListeners();
    }

    _setupListeners() {
        const c = this.container;
        const s = this.postProcessor.settings;

        // Fractalize toggle
        c.querySelector('.pp-fractalize-enabled').addEventListener('change', (e) => {
            s.fractalizeEnabled = e.target.checked;
            c.querySelector('.pp-fract-depth').disabled = !e.target.checked;
            c.querySelector('.pp-fract-rough').disabled = !e.target.checked;
            c.querySelector('.pp-fract-maxlen').disabled = !e.target.checked;
        });

        // Fractalize depth
        c.querySelector('.pp-fract-depth').addEventListener('input', (e) => {
            s.fractalizeDepth = parseInt(e.target.value);
            c.querySelector('.pp-fract-depth-val').textContent = s.fractalizeDepth;
        });

        // Fractalize roughness
        c.querySelector('.pp-fract-rough').addEventListener('input', (e) => {
            s.fractalizeRoughness = parseInt(e.target.value) / 100;
            c.querySelector('.pp-fract-rough-val').textContent = s.fractalizeRoughness.toFixed(2);
        });

        // Fractalize max segment length
        c.querySelector('.pp-fract-maxlen').addEventListener('input', (e) => {
            s.fractalizeMaxSegLen = parseInt(e.target.value);
            c.querySelector('.pp-fract-maxlen-val').textContent = s.fractalizeMaxSegLen;
        });

        // Curves toggle
        c.querySelector('.pp-curves-enabled').addEventListener('change', (e) => {
            s.curvesEnabled = e.target.checked;
            c.querySelector('.pp-curve-smooth').disabled = !e.target.checked;
        });

        // Curve smoothing
        c.querySelector('.pp-curve-smooth').addEventListener('input', (e) => {
            s.curveSmoothing = parseInt(e.target.value) / 100;
            c.querySelector('.pp-curve-smooth-val').textContent = s.curveSmoothing.toFixed(2);
        });

        // Apply button
        c.querySelector('.pp-apply-btn').addEventListener('click', () => {
            this.onSettingsChange();
        });
    }

    getSettings() {
        return { ...this.postProcessor.settings };
    }

    setSettings(settings) {
        Object.assign(this.postProcessor.settings, settings);
        this.render();
    }
}
