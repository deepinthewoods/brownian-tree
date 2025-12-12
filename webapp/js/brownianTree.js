import { Vector2, SeededRandom, intersectSegments, Interpolation } from './utils.js';

export class BrownianTree {
    constructor() {
        this.MAX_THICKNESS = 2;
        this.width = 900;
        this.height = 900;

        // Arrays to store line segments
        this.start = [];
        this.end = [];
        this.centre = [];
        this.parent = [];
        this.thickness = [];

        // Seed lines (user-drawn)
        this.seedStart = [];
        this.seedEnd = [];

        // Random number generator
        this.random = new SeededRandom();

        // Temporary vectors for calculations
        this.a = new Vector2();
        this.b = new Vector2();
        this.v = new Vector2();
        this.intersect = new Vector2();
        this.tmp = new Vector2();
        this.target = new Vector2();

        // Generation state
        this.isGenerating = false;
        this.generationCancelled = false;
    }

    setSeed(seed) {
        this.random.setSeed(seed);
    }

    getSeed() {
        return this.random.seed;
    }

    reset() {
        this.start = [];
        this.end = [];
        this.parent = [];
        this.centre = [];
        this.thickness = [];

        // Add seed lines
        for (let i = 0; i < this.seedStart.length; i++) {
            this.start.push(this.seedStart[i].copy());
            this.end.push(this.seedEnd[i].copy());
            const c = this.seedStart[i].copy().lerp(this.seedEnd[i], 0.5);
            this.centre.push(c);
            this.parent.push(-1);
        }

        this.calculateThicknesses();
    }

    setSeedLines(seedStart, seedEnd) {
        this.seedStart = seedStart.map(v => v.copy());
        this.seedEnd = seedEnd.map(v => v.copy());
        this.reset();
    }

    calculateThicknesses() {
        const t = new Array(this.start.length).fill(0);
        const children = new Array(this.start.length).fill(0);

        // Count children for each segment
        for (let i = this.seedStart.length; i < this.start.length; i++) {
            if (this.parent[i] !== -1) {
                children[this.parent[i]]++;
            }
        }

        // Calculate thickness based on leaf-to-root paths
        for (let i = this.seedStart.length; i < this.start.length; i++) {
            if (children[i] === 0) {
                let current = i;
                while (this.parent[current] !== -1) {
                    current = this.parent[current];
                    t[current] = Math.min(this.MAX_THICKNESS, t[current] + 1);
                }
            }
        }

        // Normalize and apply interpolation
        let maxThickness = 0;
        for (let i = 0; i < this.start.length; i++) {
            maxThickness = Math.max(maxThickness, t[i]);
        }

        this.thickness = [];
        for (let i = 0; i < this.start.length; i++) {
            const delta = maxThickness > 0 ? t[i] / maxThickness : 0;
            this.thickness[i] = Math.floor(Interpolation.exp10In(0, this.MAX_THICKNESS, delta));
        }
    }

    async createTree(outside, nearest, targetLineCount, angle, onProgress = null) {
        this.isGenerating = true;
        this.generationCancelled = false;

        const maxTries = 221100;
        const lineLengthMax = 27;
        const lineLengthMin = 14;

        let tries = 0;
        let createdLines = 0;
        let lastProgressUpdate = 0;

        while (tries++ < maxTries && createdLines < targetLineCount && !this.generationCancelled) {
            // Spawn point
            if (outside) {
                const side = this.random.nextInt(0, 3);
                switch (side) {
                    case 0: this.a.set(this.random.nextFloat(0, this.width), 0); break;
                    case 1: this.a.set(this.random.nextFloat(0, this.width), this.height); break;
                    case 2: this.a.set(0, this.random.nextFloat(0, this.height)); break;
                    case 3: this.a.set(this.width, this.random.nextFloat(0, this.height)); break;
                }
            } else {
                this.a.set(
                    this.random.nextFloat(0, this.width),
                    this.random.nextFloat(0, this.height)
                );
            }

            // Calculate line length based on progress
            const lineLengthDelta = this.start.length / targetLineCount;
            const lineLength = lineLengthMax + (lineLengthMin - lineLengthMax) * lineLengthDelta;

            let hasCollided = false;
            let moveTries = 0;

            // Random walk until collision
            while (moveTries++ < 1000 && !hasCollided) {
                this.v.set(-lineLength, 0);

                // Set target (nearest point or center)
                if (nearest) {
                    this.setClosestPoint(this.target, this.a);
                } else {
                    this.target.set(this.width / 2, this.height / 2);
                }

                // Calculate angle towards target with variation
                const targetAngle = this.tmp.set(this.a.x, this.a.y).sub(this.target).angleDeg();
                this.v.rotateDeg(this.random.nextFloat(-angle, angle) + targetAngle);
                this.b.set(this.a.x, this.a.y).add(this.v);

                // Check bounds
                if (this.b.x < 0 || this.b.x > this.width || this.b.y < 0 || this.b.y > this.height) {
                    hasCollided = true;
                    continue;
                }

                // Check collision
                const collIndex = this.collide(this.a, this.b, this.intersect);
                if (collIndex !== -1) {
                    hasCollided = true;
                    if (moveTries === 1) continue;

                    // Add new line segment
                    this.start.push(this.a.copy());
                    this.end.push(this.intersect.copy());
                    const c = this.a.copy().lerp(this.intersect, 0.5);
                    this.centre.push(c);
                    this.parent.push(collIndex);
                    createdLines++;
                }

                this.a.set(this.b.x, this.b.y);
            }

            // Progress callback every 100 lines
            if (onProgress && createdLines - lastProgressUpdate >= 100) {
                lastProgressUpdate = createdLines;
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser
                onProgress(createdLines, targetLineCount);
            }
        }

        this.calculateThicknesses();
        this.isGenerating = false;

        if (onProgress) {
            onProgress(targetLineCount, targetLineCount);
        }

        return !this.generationCancelled;
    }

    cancelGeneration() {
        this.generationCancelled = true;
    }

    setClosestPoint(target, a) {
        let dist = Number.MAX_VALUE;
        for (let i = 0; i < this.centre.length; i++) {
            const d = a.dst2(this.centre[i]);
            if (d < dist) {
                dist = d;
                target.set(this.centre[i].x, this.centre[i].y);
            }
        }
    }

    collide(a, b, collPoint) {
        let dist = Number.MAX_VALUE;
        let collIndex = -1;

        for (let i = 0; i < this.start.length; i++) {
            const st = this.start[i];
            const en = this.end[i];
            const intersection = intersectSegments(a, b, st, en);

            if (intersection) {
                const d = intersection.dst(a);
                if (d < dist) {
                    dist = d;
                    collPoint.set(intersection.x, intersection.y);
                    collIndex = i;
                }
            }
        }

        return collIndex;
    }

    render(ctx, offsetX = 0, offsetY = 0) {
        ctx.strokeStyle = 'white';
        ctx.lineCap = 'round';

        // Draw lines grouped by thickness
        for (let t = 0; t <= this.MAX_THICKNESS; t++) {
            ctx.lineWidth = t + 2.0;
            ctx.beginPath();

            for (let i = 0; i < this.start.length; i++) {
                if (this.thickness[i] === t) {
                    const st = this.start[i];
                    const en = this.end[i];
                    ctx.moveTo(st.x + offsetX, st.y + offsetY);
                    ctx.lineTo(en.x + offsetX, en.y + offsetY);
                }
            }

            ctx.stroke();
        }
    }

    toSVG(width, height) {
        const scaleX = width / this.width;
        const scaleY = height / this.height;

        let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
        svg += `  <rect width="${width}" height="${height}" fill="black"/>\n`;
        svg += `  <g stroke="white" stroke-linecap="round">\n`;

        // Draw lines grouped by thickness
        for (let t = 0; t <= this.MAX_THICKNESS; t++) {
            const strokeWidth = (t + 2.0) * Math.min(scaleX, scaleY);

            for (let i = 0; i < this.start.length; i++) {
                if (this.thickness[i] === t) {
                    const st = this.start[i];
                    const en = this.end[i];
                    svg += `    <line x1="${st.x * scaleX}" y1="${st.y * scaleY}" x2="${en.x * scaleX}" y2="${en.y * scaleY}" stroke-width="${strokeWidth}"/>\n`;
                }
            }
        }

        svg += `  </g>\n`;
        svg += `</svg>`;

        return svg;
    }

    getState() {
        return {
            seed: this.random.seed,
            width: this.width,
            height: this.height,
            seedStart: this.seedStart.map(v => ({ x: v.x, y: v.y })),
            seedEnd: this.seedEnd.map(v => ({ x: v.x, y: v.y }))
        };
    }

    setState(state) {
        this.width = state.width;
        this.height = state.height;
        this.random.setSeed(state.seed);
        this.seedStart = state.seedStart.map(v => new Vector2(v.x, v.y));
        this.seedEnd = state.seedEnd.map(v => new Vector2(v.x, v.y));
        this.reset();
    }
}
