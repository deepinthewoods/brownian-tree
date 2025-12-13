import { Vector2, SeededRandom, intersectSegments, Interpolation } from './utils.js';

export class BrownianTree {
    constructor() {
        this.MAX_THICKNESS = 2;
        this.width = 900;
        this.height = 900;

        // Arrays to store line segments
        this.start = [];
        this.end = [];
        this.parent = [];
        this.thickness = [];

        // Debug logging throttle
        this.lastRenderLogTime = 0;
        this.renderLogInterval = 1000; // Log every 1 second

        // Different line types from drawing
        this.sourceStart = [];
        this.sourceEnd = [];
        this.destStart = [];
        this.destEnd = [];
        this.excludeStart = [];
        this.excludeEnd = [];
        this.adjustedSourceStart = [];
        this.adjustedSourceEnd = [];
        this.shouldStopGenerating = [];
        this.shouldStopTotal = 0;

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
        this.maxDistance = 0;
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
        this.thickness = [];
        this.postCalculations();
    }

    setSeedLines(seedLines) {
        this.adjustedSourceStart = seedLines.start.map(v => v.copy());
        this.adjustedSourceEnd = seedLines.end.map(v => v.copy());
        this.sourceStart = seedLines.sourceStart.map(v => v.copy());
        this.sourceEnd = seedLines.sourceEnd.map(v => v.copy());
        this.destStart = seedLines.destStart.map(v => v.copy());
        this.destEnd = seedLines.destEnd.map(v => v.copy());
        this.excludeStart = seedLines.excludeStart.map(v => v.copy());
        this.excludeEnd = seedLines.excludeEnd.map(v => v.copy());
        this.shouldStopGenerating = new Array(this.adjustedSourceStart.length).fill(false);
        this.shouldStopTotal = 0;
        this.reset();
    }

    postCalculations() {
        // Find source connections
        const sourceConnections = [];
        for (let i = 0; i < this.start.length; i++) {
            if (this.collideSource(this.start[i], this.end[i])) {
                sourceConnections.push(i);
            }
        }

        // Calculate distance from main line (distance-based coloring)
        const mainLineDistance = new Array(this.start.length).fill(Number.MAX_VALUE);

        // Mark source-connected lines as distance 0
        for (let i = 0; i < sourceConnections.length; i++) {
            let currentIdx = sourceConnections[i];
            while (currentIdx !== -1) {
                mainLineDistance[currentIdx] = 0;
                currentIdx = this.parent[currentIdx];
            }
        }

        // BFS for distance from main path
        let changed;
        do {
            changed = false;
            for (let i = 0; i < this.start.length; i++) {
                if (mainLineDistance[i] === Number.MAX_VALUE) {
                    const parentDist = this.parent[i] === -1 ? Number.MAX_VALUE : mainLineDistance[this.parent[i]];
                    if (parentDist !== Number.MAX_VALUE) {
                        mainLineDistance[i] = parentDist + 1;
                        this.maxDistance = Math.max(this.maxDistance, mainLineDistance[i]);
                        changed = true;
                    }
                }
            }
        } while (changed);

        this.thickness = mainLineDistance;
    }

    collideSource(a, b) {
        const v = new Vector2(a.x, a.y).sub(b).nor().scl(0.1).add(b);
        for (let i = 0; i < this.adjustedSourceEnd.length; i++) {
            const st = this.adjustedSourceStart[i];
            const en = this.adjustedSourceEnd[i];
            if (intersectSegments(a, v, st, en)) return true;
        }
        return false;
    }

    async createTree(nearest, targetLineCount, angle, childLimit, randomStart, lineLengthMin, lineLengthMax, onProgress = null) {
        console.log('createTree called with:', {
            nearest, targetLineCount, angle, childLimit, randomStart, lineLengthMin, lineLengthMax
        });
        console.log('Tree state:', {
            existingLines: this.start.length,
            sourceLines: this.adjustedSourceStart.length,
            destLines: this.destStart.length,
            excludeLines: this.excludeStart.length
        });

        this.isGenerating = true;
        this.generationCancelled = false;

        // Swap if min > max
        if (lineLengthMin > lineLengthMax) {
            [lineLengthMin, lineLengthMax] = [lineLengthMax, lineLengthMin];
        }

        const maxTries = targetLineCount * 10;
        let tries = 0;
        let createdLines = 0;
        let lastProgressUpdate = 0;

        console.log('Starting generation loop, maxTries:', maxTries);

        while (tries++ < maxTries && createdLines < targetLineCount && !this.generationCancelled) {
            // Spawn point
            let sourceIndex = -1;
            if (randomStart) {
                this.a.set(this.random.nextFloat(0, this.width), this.random.nextFloat(0, this.height));
            } else {
                if (this.shouldStopTotal === this.adjustedSourceStart.length) break;
                let foundStart = false;
                while (!foundStart) {
                    sourceIndex = this.random.nextInt(0, this.adjustedSourceStart.length - 1);
                    if (this.shouldStopGenerating[sourceIndex]) continue;
                    this.a.set(this.adjustedSourceStart[sourceIndex].x, this.adjustedSourceStart[sourceIndex].y);
                    const alpha = this.random.nextFloat(0, 1);
                    this.a.lerp(this.adjustedSourceEnd[sourceIndex], alpha);
                    break;
                }
            }

            // Calculate line length based on progress
            const lineLengthDelta = createdLines / targetLineCount;
            const lineLength = lineLengthMax + (lineLengthMin - lineLengthMax) * lineLengthDelta;

            let hasCollided = false;
            let moveTries = 0;

            // Random walk until collision
            while (moveTries++ < 1000 && !hasCollided) {
                this.v.set(-lineLength, 0);

                let targetAngle;
                if (nearest) {
                    this.setClosestPoint(this.target, this.a);
                    targetAngle = this.tmp.set(this.a.x, this.a.y).sub(this.target).angleDeg();
                } else {
                    targetAngle = this.random.nextFloat(0, 360);
                }

                this.v.rotateDeg(this.random.nextFloat(-angle, angle) + targetAngle);
                this.b.set(this.a.x, this.a.y).add(this.v);

                // Check bounds
                if (this.b.x < 0 || this.b.x > this.width || this.b.y < 0 || this.b.y > this.height) {
                    hasCollided = true;
                    if (tries % 1000 === 0) {
                        console.log('Hit bounds at try', tries, 'moveTry', moveTries);
                    }
                    continue;
                }

                // Check collision
                const collIndex = this.collide(this.a, this.b, this.intersect);
                if (collIndex.index !== null) {
                    console.log('Collision detected! collIndex:', collIndex.index, 'at try', tries, 'createdLines:', createdLines);
                    hasCollided = true;
                    if (collIndex.index === -2) continue; // Hit exclude line

                    if (moveTries <= 1 && !randomStart) {
                        if (sourceIndex !== -1) {
                            this.shouldStopGenerating[sourceIndex] = true;
                            this.shouldStopTotal++;
                        }
                    }

                    // Add new line segment
                    this.start.push(this.a.copy());
                    this.end.push(this.intersect.copy());
                    this.parent.push(collIndex.index);

                    // Subdivision logic (only for collisions with existing tree segments)
                    if (collIndex.index !== null && collIndex.index >= 0) {
                        const parentStart = this.start[collIndex.index];
                        const parentEnd = this.end[collIndex.index];

                        if (this.intersect.dst2(parentStart) < 0.1) {
                            // Close to start - merge
                            this.end[this.end.length - 1].set(parentStart.x, parentStart.y);
                        } else if (this.intersect.dst2(parentEnd) < 0.1) {
                            // Close to end - connect with grandparent
                            if (this.parent[collIndex.index] !== -1) {
                                this.parent[this.parent.length - 1] = this.parent[collIndex.index];
                                const grandparentStart = this.start[this.parent[collIndex.index]];
                                this.end[this.end.length - 1].set(grandparentStart.x, grandparentStart.y);
                            }
                        } else {
                            // Subdivide parent
                            const extraStart = this.intersect.copy();
                            const extraEnd = parentEnd.copy();
                            parentEnd.set(this.intersect.x, this.intersect.y);
                            const extraParent = this.parent[collIndex.index];

                            this.start.push(extraStart);
                            this.end.push(extraEnd);
                            this.parent.push(extraParent);
                            this.parent[collIndex.index] = this.parent.length - 1;
                        }
                    }

                    createdLines++;
                }

                this.a.set(this.b.x, this.b.y);
            }

            if (tries % 1000 === 0) {
                console.log('Progress check - tries:', tries, 'createdLines:', createdLines, 'moveTries:', moveTries);
            }

            // Progress callback every 100 lines
            if (onProgress && createdLines - lastProgressUpdate >= 100) {
                lastProgressUpdate = createdLines;
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser
                onProgress(createdLines, targetLineCount);
            }
        }

        console.log('Generation loop ended. Final stats:', {
            tries,
            createdLines,
            targetLineCount,
            cancelled: this.generationCancelled
        });

        this.postCalculations();
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
        const distanceToSegment = (s, e, p) => {
            const l2 = s.dst2(e);
            if (l2 === 0) return p.dst(s);
            const t = Math.max(0, Math.min(1, ((p.x - s.x) * (e.x - s.x) + (p.y - s.y) * (e.y - s.y)) / l2));
            const projection = new Vector2(s.x + t * (e.x - s.x), s.y + t * (e.y - s.y));
            return { dist: p.dst(projection), point: projection };
        };

        let dist = Number.MAX_VALUE;
        let closestPoint = null;

        // Check existing tree segments
        for (let i = 0; i < this.start.length; i++) {
            const result = distanceToSegment(this.start[i], this.end[i], a);
            if (result.dist < dist) {
                dist = result.dist;
                closestPoint = result.point;
            }
        }

        // Check destination lines
        for (let i = 0; i < this.destStart.length; i++) {
            const result = distanceToSegment(this.destStart[i], this.destEnd[i], a);
            if (result.dist < dist) {
                dist = result.dist;
                closestPoint = result.point;
            }
        }

        if (closestPoint) {
            target.set(closestPoint.x, closestPoint.y);
        }
    }

    collide(a, b, collPoint) {
        let dist = Number.MAX_VALUE;
        let collIndex = null; // null = no collision

        // Check collisions with existing tree segments
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

        // Check collisions with destination lines
        for (let i = 0; i < this.destStart.length; i++) {
            const st = this.destStart[i];
            const en = this.destEnd[i];
            const intersection = intersectSegments(a, b, st, en);

            if (intersection) {
                const d = intersection.dst(a);
                if (d < dist) {
                    dist = d;
                    collPoint.set(intersection.x, intersection.y);
                    collIndex = -1; // Destination collision (now distinct from null)
                }
            }
        }

        // Check collisions with exclude lines
        for (let i = 0; i < this.excludeStart.length; i++) {
            const st = this.excludeStart[i];
            const en = this.excludeEnd[i];
            const intersection = intersectSegments(a, b, st, en);

            if (intersection) {
                const d = intersection.dst(a);
                if (d < dist) {
                    dist = d;
                    collPoint.set(intersection.x, intersection.y);
                    collIndex = -2; // Exclude collision
                }
            }
        }

        return { index: collIndex };
    }

    render(ctx, offsetX = 0, offsetY = 0) {
        // Throttled enhanced logging
        const now = Date.now();
        if (now - this.lastRenderLogTime >= this.renderLogInterval) {
            this.lastRenderLogTime = now;
            if (this.start.length > 0) {
                console.log(`BrownianTree.render():`, {
                    lineCount: this.start.length,
                    maxDistance: this.maxDistance,
                    offsetX,
                    offsetY,
                    sampleLine: {
                        start: this.start[0],
                        end: this.end[0],
                        thickness: this.thickness[0]
                    }
                });
            } else {
                console.log('BrownianTree.render() - NO tree lines (start.length === 0)');
            }
        }

        ctx.lineCap = 'round';
        ctx.lineWidth = 1;

        // Draw tree lines with distance-based coloring
        const mainColor = { r: 255, g: 0, b: 0 }; // Red
        const tipColor = { r: 0, g: 255, b: 0 };  // Green

        for (let i = 0; i < this.start.length; i++) {
            const st = this.start[i];
            const en = this.end[i];
            const dist = this.thickness[i];

            if (dist === 0) {
                ctx.strokeStyle = 'white';
            } else {
                const lerpFactor = Math.min(dist / this.maxDistance, 1);
                const r = Math.floor(mainColor.r + (tipColor.r - mainColor.r) * lerpFactor);
                const g = Math.floor(mainColor.g + (tipColor.g - mainColor.g) * lerpFactor);
                const b = Math.floor(mainColor.b + (tipColor.b - mainColor.b) * lerpFactor);
                ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            }

            ctx.beginPath();
            ctx.moveTo(st.x + offsetX, st.y + offsetY);
            ctx.lineTo(en.x + offsetX, en.y + offsetY);
            ctx.stroke();
        }

        // Draw destination lines (green)
        ctx.strokeStyle = '#00FF00';
        for (let i = 0; i < this.destStart.length; i++) {
            ctx.beginPath();
            ctx.moveTo(this.destStart[i].x + offsetX, this.destStart[i].y + offsetY);
            ctx.lineTo(this.destEnd[i].x + offsetX, this.destEnd[i].y + offsetY);
            ctx.stroke();
        }

        // Draw exclude lines (red)
        ctx.strokeStyle = '#FF0000';
        for (let i = 0; i < this.excludeStart.length; i++) {
            ctx.beginPath();
            ctx.moveTo(this.excludeStart[i].x + offsetX, this.excludeStart[i].y + offsetY);
            ctx.lineTo(this.excludeEnd[i].x + offsetX, this.excludeEnd[i].y + offsetY);
            ctx.stroke();
        }

        // Draw source lines (cyan)
        ctx.strokeStyle = '#00FFFF';
        for (let i = 0; i < this.adjustedSourceStart.length; i++) {
            if (!this.shouldStopGenerating[i]) {
                ctx.beginPath();
                ctx.moveTo(this.adjustedSourceStart[i].x + offsetX, this.adjustedSourceStart[i].y + offsetY);
                ctx.lineTo(this.adjustedSourceEnd[i].x + offsetX, this.adjustedSourceEnd[i].y + offsetY);
                ctx.stroke();
            }
        }

        // Draw stopped source lines (blue)
        ctx.strokeStyle = '#0000FF';
        for (let i = 0; i < this.adjustedSourceStart.length; i++) {
            if (this.shouldStopGenerating[i]) {
                ctx.beginPath();
                ctx.moveTo(this.adjustedSourceStart[i].x + offsetX, this.adjustedSourceStart[i].y + offsetY);
                ctx.lineTo(this.adjustedSourceEnd[i].x + offsetX, this.adjustedSourceEnd[i].y + offsetY);
                ctx.stroke();
            }
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
