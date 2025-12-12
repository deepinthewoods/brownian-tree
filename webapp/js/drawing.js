import { Vector2 } from './utils.js';

export class DrawingScreen {
    constructor(canvas, onBack) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onBack = onBack;

        this.start = [];
        this.end = [];
        this.isFirstPoint = true;
        this.currentPoint = null;

        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.isFirstPoint) {
                this.start.push(new Vector2(x, y));
                this.currentPoint = new Vector2(x, y);
            } else {
                this.end.push(new Vector2(x, y));
                this.currentPoint = null;
            }

            this.isFirstPoint = !this.isFirstPoint;
            this.render();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.currentPoint) {
                const rect = this.canvas.getBoundingClientRect();
                this.currentPoint.x = e.clientX - rect.left;
                this.currentPoint.y = e.clientY - rect.top;
                this.render();
            }
        });
    }

    clear() {
        this.start = [];
        this.end = [];
        this.isFirstPoint = true;
        this.currentPoint = null;
        this.render();
    }

    getSeedLines() {
        return {
            start: this.start,
            end: this.end
        };
    }

    render() {
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        // Draw completed lines
        for (let i = 0; i < this.start.length && i < this.end.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.start[i].x, this.start[i].y);
            this.ctx.lineTo(this.end[i].x, this.end[i].y);
            this.ctx.stroke();
        }

        // Draw line in progress
        if (this.currentPoint && this.start.length > this.end.length) {
            this.ctx.strokeStyle = '#4CAF5080';
            this.ctx.beginPath();
            const lastStart = this.start[this.start.length - 1];
            this.ctx.moveTo(lastStart.x, lastStart.y);
            this.ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
            this.ctx.stroke();
        }

        // Draw points
        this.ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < this.start.length; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.start[i].x, this.start[i].y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        for (let i = 0; i < this.end.length; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.end[i].x, this.end[i].y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    show() {
        this.setupCanvas();
        this.render();
    }
}
