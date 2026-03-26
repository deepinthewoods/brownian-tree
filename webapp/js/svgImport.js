import { Vector2 } from './utils.js';

/**
 * SVG Import module - parses SVG files, extracts groups as layers,
 * converts all geometry (including curves) to line segments,
 * and allows assigning roles (source/dest/exclude/none) per layer.
 */

/**
 * Parse an SVG path's d attribute into an array of command objects.
 */
function parsePathData(d) {
    const commands = [];
    // Match command letter followed by its numeric parameters
    const re = /([MmZzLlHhVvCcSsQqTtAa])([^MmZzLlHhVvCcSsQqTtAa]*)/g;
    let match;
    while ((match = re.exec(d)) !== null) {
        const type = match[1];
        const argsStr = match[2].trim();
        const args = argsStr.length > 0
            ? argsStr.split(/[\s,]+/).map(Number)
            : [];
        commands.push({ type, args });
    }
    return commands;
}

/**
 * Subdivide a cubic bezier curve into line segments.
 */
function subdivideCubicBezier(p0, p1, p2, p3, maxSegLen) {
    const points = [p0];
    const estimatedLen = p0.dst(p1) + p1.dst(p2) + p2.dst(p3);
    const segments = Math.max(2, Math.ceil(estimatedLen / maxSegLen));

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
        const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
        points.push(new Vector2(x, y));
    }
    return points;
}

/**
 * Subdivide a quadratic bezier curve into line segments.
 */
function subdivideQuadBezier(p0, p1, p2, maxSegLen) {
    const points = [p0];
    const estimatedLen = p0.dst(p1) + p1.dst(p2);
    const segments = Math.max(2, Math.ceil(estimatedLen / maxSegLen));

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
        const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
        points.push(new Vector2(x, y));
    }
    return points;
}

/**
 * Approximate an arc with line segments.
 */
function subdivideArc(x1, y1, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x2, y2, maxSegLen) {
    // Convert endpoint arc to center parameterization
    const phi = xAxisRotation * Math.PI / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const dx2 = (x1 - x2) / 2;
    const dy2 = (y1 - y2) / 2;

    const x1p = cosPhi * dx2 + sinPhi * dy2;
    const y1p = -sinPhi * dx2 + cosPhi * dy2;

    let rxSq = rx * rx;
    let rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;

    // Correct radii if needed
    const lambda = x1pSq / rxSq + y1pSq / rySq;
    if (lambda > 1) {
        const sqrtLambda = Math.sqrt(lambda);
        rx *= sqrtLambda;
        ry *= sqrtLambda;
        rxSq = rx * rx;
        rySq = ry * ry;
    }

    let sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
    sq = Math.sqrt(sq);
    if (largeArcFlag === sweepFlag) sq = -sq;

    const cxp = sq * rx * y1p / ry;
    const cyp = -sq * ry * x1p / rx;

    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
    let dtheta = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - theta1;

    if (sweepFlag && dtheta < 0) dtheta += 2 * Math.PI;
    if (!sweepFlag && dtheta > 0) dtheta -= 2 * Math.PI;

    const circumference = Math.abs(dtheta) * Math.max(rx, ry);
    const segments = Math.max(2, Math.ceil(circumference / maxSegLen));

    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = theta1 + (i / segments) * dtheta;
        const xr = rx * Math.cos(t);
        const yr = ry * Math.sin(t);
        points.push(new Vector2(
            cosPhi * xr - sinPhi * yr + cx,
            sinPhi * xr + cosPhi * yr + cy
        ));
    }
    return points;
}

/**
 * Convert a path's d attribute to arrays of line segments (start/end pairs).
 * Returns { starts: Vector2[], ends: Vector2[] }
 */
function pathToSegments(d, maxSegLen) {
    const commands = parsePathData(d);
    const starts = [];
    const ends = [];

    let cx = 0, cy = 0; // current point
    let sx = 0, sy = 0; // subpath start
    let lastCPx = 0, lastCPy = 0; // last control point (for S/T)
    let lastCmd = '';

    for (const cmd of commands) {
        const { type, args } = cmd;
        const isRel = type === type.toLowerCase();

        switch (type.toUpperCase()) {
            case 'M': {
                let i = 0;
                while (i < args.length) {
                    const x = isRel ? cx + args[i] : args[i];
                    const y = isRel ? cy + args[i + 1] : args[i + 1];
                    if (i === 0) {
                        sx = x; sy = y;
                    } else {
                        // Subsequent M coords are implicit L
                        starts.push(new Vector2(cx, cy));
                        ends.push(new Vector2(x, y));
                    }
                    cx = x; cy = y;
                    i += 2;
                }
                break;
            }
            case 'L': {
                let i = 0;
                while (i < args.length) {
                    const x = isRel ? cx + args[i] : args[i];
                    const y = isRel ? cy + args[i + 1] : args[i + 1];
                    starts.push(new Vector2(cx, cy));
                    ends.push(new Vector2(x, y));
                    cx = x; cy = y;
                    i += 2;
                }
                break;
            }
            case 'H': {
                for (const val of args) {
                    const x = isRel ? cx + val : val;
                    starts.push(new Vector2(cx, cy));
                    ends.push(new Vector2(x, cy));
                    cx = x;
                }
                break;
            }
            case 'V': {
                for (const val of args) {
                    const y = isRel ? cy + val : val;
                    starts.push(new Vector2(cx, cy));
                    ends.push(new Vector2(cx, y));
                    cy = y;
                }
                break;
            }
            case 'C': {
                let i = 0;
                while (i < args.length) {
                    const x1 = isRel ? cx + args[i] : args[i];
                    const y1 = isRel ? cy + args[i + 1] : args[i + 1];
                    const x2 = isRel ? cx + args[i + 2] : args[i + 2];
                    const y2 = isRel ? cy + args[i + 3] : args[i + 3];
                    const x = isRel ? cx + args[i + 4] : args[i + 4];
                    const y = isRel ? cy + args[i + 5] : args[i + 5];

                    const pts = subdivideCubicBezier(
                        new Vector2(cx, cy), new Vector2(x1, y1),
                        new Vector2(x2, y2), new Vector2(x, y), maxSegLen
                    );
                    for (let j = 0; j < pts.length - 1; j++) {
                        starts.push(pts[j]);
                        ends.push(pts[j + 1]);
                    }
                    lastCPx = x2; lastCPy = y2;
                    cx = x; cy = y;
                    i += 6;
                }
                break;
            }
            case 'S': {
                let i = 0;
                while (i < args.length) {
                    let x1, y1;
                    if ('CcSs'.includes(lastCmd)) {
                        x1 = 2 * cx - lastCPx;
                        y1 = 2 * cy - lastCPy;
                    } else {
                        x1 = cx; y1 = cy;
                    }
                    const x2 = isRel ? cx + args[i] : args[i];
                    const y2 = isRel ? cy + args[i + 1] : args[i + 1];
                    const x = isRel ? cx + args[i + 2] : args[i + 2];
                    const y = isRel ? cy + args[i + 3] : args[i + 3];

                    const pts = subdivideCubicBezier(
                        new Vector2(cx, cy), new Vector2(x1, y1),
                        new Vector2(x2, y2), new Vector2(x, y), maxSegLen
                    );
                    for (let j = 0; j < pts.length - 1; j++) {
                        starts.push(pts[j]);
                        ends.push(pts[j + 1]);
                    }
                    lastCPx = x2; lastCPy = y2;
                    cx = x; cy = y;
                    i += 4;
                    lastCmd = type;
                }
                break;
            }
            case 'Q': {
                let i = 0;
                while (i < args.length) {
                    const x1 = isRel ? cx + args[i] : args[i];
                    const y1 = isRel ? cy + args[i + 1] : args[i + 1];
                    const x = isRel ? cx + args[i + 2] : args[i + 2];
                    const y = isRel ? cy + args[i + 3] : args[i + 3];

                    const pts = subdivideQuadBezier(
                        new Vector2(cx, cy), new Vector2(x1, y1),
                        new Vector2(x, y), maxSegLen
                    );
                    for (let j = 0; j < pts.length - 1; j++) {
                        starts.push(pts[j]);
                        ends.push(pts[j + 1]);
                    }
                    lastCPx = x1; lastCPy = y1;
                    cx = x; cy = y;
                    i += 4;
                }
                break;
            }
            case 'T': {
                let i = 0;
                while (i < args.length) {
                    let x1, y1;
                    if ('QqTt'.includes(lastCmd)) {
                        x1 = 2 * cx - lastCPx;
                        y1 = 2 * cy - lastCPy;
                    } else {
                        x1 = cx; y1 = cy;
                    }
                    const x = isRel ? cx + args[i] : args[i];
                    const y = isRel ? cy + args[i + 1] : args[i + 1];

                    const pts = subdivideQuadBezier(
                        new Vector2(cx, cy), new Vector2(x1, y1),
                        new Vector2(x, y), maxSegLen
                    );
                    for (let j = 0; j < pts.length - 1; j++) {
                        starts.push(pts[j]);
                        ends.push(pts[j + 1]);
                    }
                    lastCPx = x1; lastCPy = y1;
                    cx = x; cy = y;
                    i += 2;
                    lastCmd = type;
                }
                break;
            }
            case 'A': {
                let i = 0;
                while (i < args.length) {
                    const rx = args[i];
                    const ry = args[i + 1];
                    const xRot = args[i + 2];
                    const largeArc = args[i + 3];
                    const sweep = args[i + 4];
                    const x = isRel ? cx + args[i + 5] : args[i + 5];
                    const y = isRel ? cy + args[i + 6] : args[i + 6];

                    const pts = subdivideArc(cx, cy, rx, ry, xRot, largeArc, sweep, x, y, maxSegLen);
                    for (let j = 0; j < pts.length - 1; j++) {
                        starts.push(pts[j]);
                        ends.push(pts[j + 1]);
                    }
                    cx = x; cy = y;
                    i += 7;
                }
                break;
            }
            case 'Z': {
                if (cx !== sx || cy !== sy) {
                    starts.push(new Vector2(cx, cy));
                    ends.push(new Vector2(sx, sy));
                }
                cx = sx; cy = sy;
                break;
            }
        }
        lastCmd = type;
    }

    return { starts, ends };
}

/**
 * Apply a transform matrix [a,b,c,d,e,f] to a point.
 */
function applyTransform(matrix, x, y) {
    return new Vector2(
        matrix[0] * x + matrix[2] * y + matrix[4],
        matrix[1] * x + matrix[3] * y + matrix[5]
    );
}

/**
 * Parse an SVG transform attribute into a 2x3 matrix [a,b,c,d,e,f].
 */
function parseTransform(transformStr) {
    let mat = [1, 0, 0, 1, 0, 0]; // identity

    if (!transformStr) return mat;

    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi;
    let match;
    while ((match = re.exec(transformStr)) !== null) {
        const fn = match[1].toLowerCase();
        const args = match[2].split(/[\s,]+/).map(Number);

        let m;
        switch (fn) {
            case 'matrix':
                m = args;
                break;
            case 'translate':
                m = [1, 0, 0, 1, args[0], args[1] || 0];
                break;
            case 'scale': {
                const sx = args[0];
                const sy = args.length > 1 ? args[1] : sx;
                m = [sx, 0, 0, sy, 0, 0];
                break;
            }
            case 'rotate': {
                const angle = args[0] * Math.PI / 180;
                const c = Math.cos(angle);
                const s = Math.sin(angle);
                if (args.length === 3) {
                    // rotate(angle, cx, cy)
                    const rcx = args[1], rcy = args[2];
                    m = [c, s, -s, c, rcx - c * rcx + s * rcy, rcy - s * rcx - c * rcy];
                } else {
                    m = [c, s, -s, c, 0, 0];
                }
                break;
            }
            case 'skewx': {
                const t = Math.tan(args[0] * Math.PI / 180);
                m = [1, 0, t, 1, 0, 0];
                break;
            }
            case 'skewy': {
                const t = Math.tan(args[0] * Math.PI / 180);
                m = [1, t, 0, 1, 0, 0];
                break;
            }
            default:
                continue;
        }

        // Multiply: mat = mat * m
        mat = multiplyMatrices(mat, m);
    }
    return mat;
}

function multiplyMatrices(a, b) {
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5]
    ];
}

/**
 * Extract line segments from a single SVG element, applying its transform.
 */
function extractElementSegments(el, parentMatrix, maxSegLen) {
    const localTransform = parseTransform(el.getAttribute('transform'));
    const matrix = multiplyMatrices(parentMatrix, localTransform);
    const starts = [];
    const ends = [];

    const tag = el.tagName.toLowerCase();

    if (tag === 'path') {
        const d = el.getAttribute('d');
        if (d) {
            const segs = pathToSegments(d, maxSegLen);
            for (let i = 0; i < segs.starts.length; i++) {
                starts.push(applyTransform(matrix, segs.starts[i].x, segs.starts[i].y));
                ends.push(applyTransform(matrix, segs.ends[i].x, segs.ends[i].y));
            }
        }
    } else if (tag === 'line') {
        const x1 = parseFloat(el.getAttribute('x1')) || 0;
        const y1 = parseFloat(el.getAttribute('y1')) || 0;
        const x2 = parseFloat(el.getAttribute('x2')) || 0;
        const y2 = parseFloat(el.getAttribute('y2')) || 0;
        starts.push(applyTransform(matrix, x1, y1));
        ends.push(applyTransform(matrix, x2, y2));
    } else if (tag === 'polyline' || tag === 'polygon') {
        const pointsAttr = el.getAttribute('points');
        if (pointsAttr) {
            const nums = pointsAttr.trim().split(/[\s,]+/).map(Number);
            const pts = [];
            for (let i = 0; i < nums.length - 1; i += 2) {
                pts.push(applyTransform(matrix, nums[i], nums[i + 1]));
            }
            for (let i = 0; i < pts.length - 1; i++) {
                starts.push(pts[i]);
                ends.push(pts[i + 1]);
            }
            if (tag === 'polygon' && pts.length > 2) {
                starts.push(pts[pts.length - 1]);
                ends.push(pts[0]);
            }
        }
    } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x')) || 0;
        const y = parseFloat(el.getAttribute('y')) || 0;
        const w = parseFloat(el.getAttribute('width')) || 0;
        const h = parseFloat(el.getAttribute('height')) || 0;
        const corners = [
            applyTransform(matrix, x, y),
            applyTransform(matrix, x + w, y),
            applyTransform(matrix, x + w, y + h),
            applyTransform(matrix, x, y + h)
        ];
        for (let i = 0; i < 4; i++) {
            starts.push(corners[i]);
            ends.push(corners[(i + 1) % 4]);
        }
    } else if (tag === 'circle') {
        const ccx = parseFloat(el.getAttribute('cx')) || 0;
        const ccy = parseFloat(el.getAttribute('cy')) || 0;
        const r = parseFloat(el.getAttribute('r')) || 0;
        const circumference = 2 * Math.PI * r;
        const segments = Math.max(8, Math.ceil(circumference / maxSegLen));
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * 2 * Math.PI;
            const a2 = ((i + 1) / segments) * 2 * Math.PI;
            starts.push(applyTransform(matrix, ccx + r * Math.cos(a1), ccy + r * Math.sin(a1)));
            ends.push(applyTransform(matrix, ccx + r * Math.cos(a2), ccy + r * Math.sin(a2)));
        }
    } else if (tag === 'ellipse') {
        const ecx = parseFloat(el.getAttribute('cx')) || 0;
        const ecy = parseFloat(el.getAttribute('cy')) || 0;
        const rx = parseFloat(el.getAttribute('rx')) || 0;
        const ry = parseFloat(el.getAttribute('ry')) || 0;
        const circumference = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
        const segments = Math.max(8, Math.ceil(circumference / maxSegLen));
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * 2 * Math.PI;
            const a2 = ((i + 1) / segments) * 2 * Math.PI;
            starts.push(applyTransform(matrix, ecx + rx * Math.cos(a1), ecy + ry * Math.sin(a1)));
            ends.push(applyTransform(matrix, ecx + rx * Math.cos(a2), ecy + ry * Math.sin(a2)));
        }
    }

    return { starts, ends };
}

/**
 * Recursively collect segments from non-group elements within a group,
 * accumulating the transform.
 */
function collectGroupSegments(groupEl, parentMatrix, maxSegLen) {
    const localTransform = parseTransform(groupEl.getAttribute('transform'));
    const matrix = multiplyMatrices(parentMatrix, localTransform);
    const starts = [];
    const ends = [];

    for (const child of groupEl.children) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'g') {
            // Recurse into nested groups (they're part of this layer)
            const sub = collectGroupSegments(child, matrix, maxSegLen);
            starts.push(...sub.starts);
            ends.push(...sub.ends);
        } else {
            const segs = extractElementSegments(child, matrix, maxSegLen);
            starts.push(...segs.starts);
            ends.push(...segs.ends);
        }
    }

    return { starts, ends };
}

/**
 * Parse an SVG string and return layers (top-level groups) with their segments.
 *
 * Returns: {
 *   layers: [{ name, starts, ends, role }],
 *   viewBox: { x, y, width, height },
 *   svgWidth, svgHeight
 * }
 */
export function parseSVG(svgText, maxSegLen = 10) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
        throw new Error('No SVG element found');
    }

    // Parse viewBox
    let vbX = 0, vbY = 0, vbW = 0, vbH = 0;
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        [vbX, vbY, vbW, vbH] = parts;
    }

    // Parse width/height
    const svgWidth = parseFloat(svg.getAttribute('width')) || vbW || 100;
    const svgHeight = parseFloat(svg.getAttribute('height')) || vbH || 100;

    if (!vbW) { vbW = svgWidth; vbH = svgHeight; }

    const identity = [1, 0, 0, 1, 0, 0];
    const layers = [];

    // Collect top-level children
    const topChildren = Array.from(svg.children);

    // Separate groups and ungrouped elements
    const groups = topChildren.filter(el => el.tagName.toLowerCase() === 'g');
    const ungrouped = topChildren.filter(el => {
        const tag = el.tagName.toLowerCase();
        return tag !== 'g' && tag !== 'defs' && tag !== 'style' && tag !== 'title' && tag !== 'desc';
    });

    // Process each top-level group as a layer
    for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const name = g.getAttribute('id') || g.getAttribute('inkscape:label') || `Group ${i + 1}`;
        const segs = collectGroupSegments(g, identity, maxSegLen);
        if (segs.starts.length > 0) {
            layers.push({
                name,
                starts: segs.starts,
                ends: segs.ends,
                role: 'none' // default
            });
        }
    }

    // Collect ungrouped elements into a single layer
    if (ungrouped.length > 0) {
        const starts = [];
        const ends = [];
        for (const el of ungrouped) {
            const segs = extractElementSegments(el, identity, maxSegLen);
            starts.push(...segs.starts);
            ends.push(...segs.ends);
        }
        if (starts.length > 0) {
            layers.push({
                name: 'Ungrouped',
                starts,
                ends,
                role: 'none'
            });
        }
    }

    return {
        layers,
        viewBox: { x: vbX, y: vbY, width: vbW, height: vbH },
        svgWidth,
        svgHeight
    };
}

/**
 * SVG Import Panel UI - manages the import tab in the settings sidebar.
 */
export class SVGImportPanel {
    constructor(container, onUpdate) {
        this.container = container;
        this.onUpdate = onUpdate; // callback when anything changes

        this.importData = null; // parsed SVG data
        this.scale = 1.0;
        this.maxSegmentLength = 10;
        this.offsetX = 0; // position offset in tree coords
        this.offsetY = 0;

        this.buildUI();
    }

    buildUI() {
        this.container.innerHTML = `
            <div class="setting-group">
                <button class="btn btn-primary import-file-btn" style="width:100%">Open SVG File</button>
                <input type="file" accept=".svg" class="import-file-input" style="display:none">
            </div>
            <div class="import-settings" style="display:none">
                <div class="setting-group">
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Scale</span>
                            <span class="value import-scale-value">1.0</span>
                        </div>
                        <input type="range" class="import-scale-slider" min="1" max="200" value="100">
                    </div>
                </div>
                <div class="setting-group">
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Max Segment Length</span>
                            <span class="value import-seg-value">10</span>
                        </div>
                        <input type="range" class="import-seg-slider" min="1" max="50" value="10">
                    </div>
                </div>
                <div class="setting-group">
                    <label style="font-weight:600; margin-bottom:4px;">Layers</label>
                    <div class="import-layers-list"></div>
                </div>
                <div class="setting-group">
                    <button class="btn btn-go import-apply-btn" style="width:100%">Apply Import</button>
                </div>
                <div class="setting-group">
                    <button class="btn import-clear-btn" style="width:100%; color:#ff6666;">Clear Import</button>
                </div>
            </div>
        `;

        // File picker
        this.fileInput = this.container.querySelector('.import-file-input');
        this.fileBtn = this.container.querySelector('.import-file-btn');
        this.settingsDiv = this.container.querySelector('.import-settings');
        this.layersList = this.container.querySelector('.import-layers-list');

        this.fileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFile(e));

        // Scale slider
        this.scaleSlider = this.container.querySelector('.import-scale-slider');
        this.scaleValue = this.container.querySelector('.import-scale-value');
        this.scaleSlider.addEventListener('input', () => {
            this.scale = this.scaleSlider.value / 100;
            this.scaleValue.textContent = this.scale.toFixed(2);
            this.onUpdate();
        });

        // Segment length slider
        this.segSlider = this.container.querySelector('.import-seg-slider');
        this.segValue = this.container.querySelector('.import-seg-value');
        this.segSlider.addEventListener('input', () => {
            this.maxSegmentLength = parseInt(this.segSlider.value);
            this.segValue.textContent = this.maxSegmentLength;
            this.reparse();
        });

        // Apply button
        this.container.querySelector('.import-apply-btn').addEventListener('click', () => {
            this.onUpdate('apply');
        });

        // Clear button
        this.container.querySelector('.import-clear-btn').addEventListener('click', () => {
            this.clear();
        });
    }

    handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.svgText = event.target.result;
                this.importData = parseSVG(this.svgText, this.maxSegmentLength);
                this.centerImport();
                this.settingsDiv.style.display = '';
                this.buildLayersList();
                this.onUpdate();
            } catch (err) {
                console.error('SVG parse error:', err);
                alert('Error parsing SVG file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    reparse() {
        if (!this.svgText) return;
        // Preserve roles
        const oldRoles = {};
        if (this.importData) {
            for (const layer of this.importData.layers) {
                oldRoles[layer.name] = layer.role;
            }
        }
        this.importData = parseSVG(this.svgText, this.maxSegmentLength);
        for (const layer of this.importData.layers) {
            if (oldRoles[layer.name]) {
                layer.role = oldRoles[layer.name];
            }
        }
        this.buildLayersList();
        this.onUpdate();
    }

    centerImport() {
        if (!this.importData) return;
        // Center the SVG in the 900x900 tree space
        const vb = this.importData.viewBox;
        this.offsetX = (900 - vb.width * this.scale) / 2 - vb.x * this.scale;
        this.offsetY = (900 - vb.height * this.scale) / 2 - vb.y * this.scale;
    }

    buildLayersList() {
        if (!this.importData) return;
        this.layersList.innerHTML = '';

        for (const layer of this.importData.layers) {
            const div = document.createElement('div');
            div.className = 'import-layer-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'import-layer-name';
            nameSpan.textContent = `${layer.name} (${layer.starts.length})`;
            div.appendChild(nameSpan);

            const btnsDiv = document.createElement('div');
            btnsDiv.className = 'import-layer-btns';

            const roles = [
                { id: 'none', label: 'None', color: '' },
                { id: 'source', label: 'Src', color: '#00FFFF' },
                { id: 'destination', label: 'Dst', color: '#00FF00' },
                { id: 'exclude', label: 'Exc', color: '#FF0000' }
            ];

            for (const role of roles) {
                const btn = document.createElement('button');
                btn.className = 'btn import-role-btn' + (layer.role === role.id ? ' active' : '');
                btn.textContent = role.label;
                if (role.color && layer.role === role.id) {
                    btn.style.borderColor = role.color;
                    btn.style.color = role.color;
                }
                btn.addEventListener('click', () => {
                    layer.role = role.id;
                    this.buildLayersList();
                    this.onUpdate();
                });
                btnsDiv.appendChild(btn);
            }

            div.appendChild(btnsDiv);
            this.layersList.appendChild(div);
        }
    }

    clear() {
        this.importData = null;
        this.svgText = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
        this.scaleSlider.value = 100;
        this.scaleValue.textContent = '1.00';
        this.settingsDiv.style.display = 'none';
        this.fileInput.value = '';
        this.onUpdate();
    }

    /**
     * Get the transformed segments for a given role, applying scale and offset.
     * Returns { starts: Vector2[], ends: Vector2[] }
     */
    getSegmentsForRole(role) {
        const starts = [];
        const ends = [];
        if (!this.importData) return { starts, ends };

        for (const layer of this.importData.layers) {
            if (layer.role !== role) continue;
            for (let i = 0; i < layer.starts.length; i++) {
                starts.push(new Vector2(
                    layer.starts[i].x * this.scale + this.offsetX,
                    layer.starts[i].y * this.scale + this.offsetY
                ));
                ends.push(new Vector2(
                    layer.ends[i].x * this.scale + this.offsetX,
                    layer.ends[i].y * this.scale + this.offsetY
                ));
            }
        }
        return { starts, ends };
    }

    /**
     * Get all segments (for preview rendering), colored by role.
     */
    getAllSegments() {
        if (!this.importData) return [];
        const result = [];
        for (const layer of this.importData.layers) {
            for (let i = 0; i < layer.starts.length; i++) {
                result.push({
                    start: new Vector2(
                        layer.starts[i].x * this.scale + this.offsetX,
                        layer.starts[i].y * this.scale + this.offsetY
                    ),
                    end: new Vector2(
                        layer.ends[i].x * this.scale + this.offsetX,
                        layer.ends[i].y * this.scale + this.offsetY
                    ),
                    role: layer.role
                });
            }
        }
        return result;
    }

    hasImport() {
        return this.importData !== null && this.importData.layers.length > 0;
    }

    /**
     * Called from main when user drags on canvas to reposition.
     */
    applyDrag(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.onUpdate();
    }
}
