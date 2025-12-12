import { Vector2, intersectSegments } from './utils.js';

export class DrawingScreen {
    constructor(canvas, onBack) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onBack = onBack;

        // Different line types
        this.sourceStart = [];
        this.sourceEnd = [];
        this.adjustedSourceStart = [];
        this.adjustedSourceEnd = [];
        this.destStart = [];
        this.destEnd = [];
        this.excludeStart = [];
        this.excludeEnd = [];

        // Legacy arrays for compatibility
        this.start = [];
        this.end = [];

        this.isFirstPoint = false;
        this.currentPoint = null;
        this.current = new Vector2();

        // Drawing mode: 'source', 'destination', 'exclude', 'erase'
        this.mode = 'source';

        this.shouldStopGenerating = [];
        this.shouldStopTotal = 0;

        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        // Use stable dimensions
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;

        this.canvas.width = width * window.devicePixelRatio;
        this.canvas.height = height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Debounced resize handler
        let resizeTimeout = null;
        const handleResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                this.render();
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
    }

    setMode(mode) {
        this.mode = mode;
        this.isFirstPoint = false;
        this.currentPoint = null;
    }

    setupEventListeners() {
        const handlePointerDown = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            if (this.mode === 'erase') {
                this.erase(x, y);
                this.render();
                return;
            }

            this.isFirstPoint = !this.isFirstPoint;

            let start, end;
            if (this.mode === 'source') {
                start = this.sourceStart;
                end = this.sourceEnd;
            } else if (this.mode === 'destination') {
                start = this.destStart;
                end = this.destEnd;
            } else if (this.mode === 'exclude') {
                start = this.excludeStart;
                end = this.excludeEnd;
            }

            if (this.isFirstPoint) {
                this.current.set(x, y);
                this.currentPoint = new Vector2(x, y);
            } else {
                start.push(new Vector2(this.current.x, this.current.y));
                end.push(new Vector2(x, y));
                this.currentPoint = null;
            }

            this.render();
        };

        const handlePointerMove = (e) => {
            if (this.currentPoint) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                this.currentPoint.x = clientX - rect.left;
                this.currentPoint.y = clientY - rect.top;
                this.render();
            }
        };

        // Mouse events
        this.canvas.addEventListener('mousedown', handlePointerDown);
        this.canvas.addEventListener('mousemove', handlePointerMove);

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
        this.canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    }

    erase(x, y) {
        const a = new Vector2(x, y);
        let dist = Number.MAX_VALUE;
        let closestIndex = -1;
        let closestListS = null;
        let closestListE = null;

        // Helper function to find distance from point to line segment
        const distanceToSegment = (s, e, p) => {
            const l2 = s.dst2(e);
            if (l2 === 0) return p.dst(s);
            const t = Math.max(0, Math.min(1, ((p.x - s.x) * (e.x - s.x) + (p.y - s.y) * (e.y - s.y)) / l2));
            const projection = new Vector2(s.x + t * (e.x - s.x), s.y + t * (e.y - s.y));
            return p.dst(projection);
        };

        // Check source lines
        for (let i = 0; i < this.sourceStart.length; i++) {
            const d = distanceToSegment(this.sourceStart[i], this.sourceEnd[i], a);
            if (d < dist) {
                dist = d;
                closestIndex = i;
                closestListS = this.sourceStart;
                closestListE = this.sourceEnd;
            }
        }

        // Check destination lines
        for (let i = 0; i < this.destStart.length; i++) {
            const d = distanceToSegment(this.destStart[i], this.destEnd[i], a);
            if (d < dist) {
                dist = d;
                closestIndex = i;
                closestListS = this.destStart;
                closestListE = this.destEnd;
            }
        }

        // Check exclude lines
        for (let i = 0; i < this.excludeStart.length; i++) {
            const d = distanceToSegment(this.excludeStart[i], this.excludeEnd[i], a);
            if (d < dist) {
                dist = d;
                closestIndex = i;
                closestListS = this.excludeStart;
                closestListE = this.excludeEnd;
            }
        }

        if (closestIndex !== -1) {
            closestListS.splice(closestIndex, 1);
            closestListE.splice(closestIndex, 1);
        }

        this.makeAdjustedSourceLines();
    }

    clear() {
        this.sourceStart = [];
        this.sourceEnd = [];
        this.adjustedSourceStart = [];
        this.adjustedSourceEnd = [];
        this.destStart = [];
        this.destEnd = [];
        this.excludeStart = [];
        this.excludeEnd = [];
        this.start = [];
        this.end = [];
        this.isFirstPoint = false;
        this.currentPoint = null;
        this.render();
    }

    makeAdjustedSourceLines() {
        this.adjustedSourceStart = [];
        this.adjustedSourceEnd = [];

        if (this.sourceStart.length === 0) {
            this.shouldStopGenerating = [];
            this.shouldStopTotal = 0;
            return;
        }

        // Find smallest length
        let smallestLen2 = Number.MAX_VALUE;
        for (let i = 0; i < this.sourceStart.length; i++) {
            const len2 = this.sourceStart[i].dst2(this.sourceEnd[i]);
            if (len2 < smallestLen2) {
                smallestLen2 = len2;
            }
        }

        const targetLen = Math.sqrt(smallestLen2) / 3;

        // Subdivide each source line
        for (let i = 0; i < this.sourceStart.length; i++) {
            const s = this.sourceStart[i];
            const e = this.sourceEnd[i];
            const segments = Math.max(1, Math.round(s.dst(e) / targetLen));

            for (let seg = 0; seg < segments; seg++) {
                const a = 1 / segments;
                const alpha = a * seg;
                const endAlpha = a * (seg + 1);

                const st = s.copy().lerp(e, alpha);
                const en = s.copy().lerp(e, endAlpha);

                this.adjustedSourceStart.push(st);
                this.adjustedSourceEnd.push(en);
            }
        }

        this.shouldStopGenerating = new Array(this.adjustedSourceStart.length).fill(false);
        this.shouldStopTotal = 0;
    }

    getSeedLines() {
        return {
            start: this.adjustedSourceStart,
            end: this.adjustedSourceEnd,
            sourceStart: this.sourceStart,
            sourceEnd: this.sourceEnd,
            destStart: this.destStart,
            destEnd: this.destEnd,
            excludeStart: this.excludeStart,
            excludeEnd: this.excludeEnd
        };
    }

    render() {
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        // Draw source lines (cyan)
        this.ctx.strokeStyle = '#00FFFF';
        for (let i = 0; i < this.sourceStart.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.sourceStart[i].x, this.sourceStart[i].y);
            this.ctx.lineTo(this.sourceEnd[i].x, this.sourceEnd[i].y);
            this.ctx.stroke();
        }

        // Draw destination lines (green)
        this.ctx.strokeStyle = '#00FF00';
        for (let i = 0; i < this.destStart.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.destStart[i].x, this.destStart[i].y);
            this.ctx.lineTo(this.destEnd[i].x, this.destEnd[i].y);
            this.ctx.stroke();
        }

        // Draw exclude lines (red)
        this.ctx.strokeStyle = '#FF0000';
        for (let i = 0; i < this.excludeStart.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.excludeStart[i].x, this.excludeStart[i].y);
            this.ctx.lineTo(this.excludeEnd[i].x, this.excludeEnd[i].y);
            this.ctx.stroke();
        }

        // Draw line in progress
        if (this.currentPoint) {
            let color;
            if (this.mode === 'source') color = '#00FFFF80';
            else if (this.mode === 'destination') color = '#00FF0080';
            else if (this.mode === 'exclude') color = '#FF000080';

            if (color) {
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(this.current.x, this.current.y);
                this.ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
                this.ctx.stroke();
            }
        }
    }

    show() {
        this.setupCanvas();
        this.render();
    }
}
