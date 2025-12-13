/**
 * Vector2 class for 2D vector operations
 */
export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        if (x instanceof Vector2) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scl(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    nor() {
        const length = this.len();
        if (length !== 0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    }

    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        return this;
    }

    dst(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    dst2(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }

    angleDeg() {
        return Math.atan2(this.y, this.x) * 180 / Math.PI;
    }

    rotateDeg(degrees) {
        const rad = degrees * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const newX = this.x * cos - this.y * sin;
        const newY = this.x * sin + this.y * cos;
        this.x = newX;
        this.y = newY;
        return this;
    }

    copy() {
        return new Vector2(this.x, this.y);
    }
}

/**
 * Seeded random number generator
 */
export class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this._state = seed;
    }

    setSeed(seed) {
        this.seed = seed;
        this._state = seed;
    }

    // Linear congruential generator
    next() {
        this._state = (this._state * 1664525 + 1013904223) % 4294967296;
        return this._state / 4294967296;
    }

    nextFloat(min = 0, max = 1) {
        return min + this.next() * (max - min);
    }

    nextInt(min, max) {
        return Math.floor(this.nextFloat(min, max + 1));
    }
}

/**
 * Check if two line segments intersect
 * Returns intersection point or null
 */
let intersectionCheckCount = 0;
let intersectionFoundCount = 0;

export function intersectSegments(p1, p2, p3, p4) {
    intersectionCheckCount++;

    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denom) < 0.0001) {
        return null; // Parallel lines
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        intersectionFoundCount++;
        if (intersectionFoundCount <= 5) {
            console.log(`INTERSECTION FOUND! (#${intersectionFoundCount}) at (${x1 + t * (x2 - x1)}, ${y1 + t * (y2 - y1)})`);
        }
        return new Vector2(
            x1 + t * (x2 - x1),
            y1 + t * (y2 - y1)
        );
    }

    if (intersectionCheckCount % 10000 === 0) {
        console.log(`Intersection checks: ${intersectionCheckCount}, found: ${intersectionFoundCount}`);
    }

    return null;
}

/**
 * Interpolation utilities
 */
export const Interpolation = {
    exp10In(start, end, alpha) {
        if (alpha === 0) return start;
        if (alpha === 1) return end;
        return start + (end - start) * Math.pow(alpha, 10);
    },

    linear(start, end, alpha) {
        return start + (end - start) * alpha;
    }
};

/**
 * Math utilities
 */
export const MathUtils = {
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};
