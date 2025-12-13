export class SettingsPanel {
    constructor(container, tree, onGenerate) {
        this.container = container;
        this.tree = tree;
        this.onGenerate = onGenerate;

        this.settings = {
            nearest: false,
            randomStart: false,
            lineCount: 1000,
            angle: 45,
            childLimit: 1000,
            lineMin: 15,
            lineMax: 30
        };

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="setting-group">
                <label>
                    <input type="checkbox" id="nearest" ${this.settings.nearest ? 'checked' : ''}>
                    Go Towards Nearest
                </label>
            </div>
            <div class="setting-group">
                <label>
                    <input type="checkbox" id="randomStart" ${this.settings.randomStart ? 'checked' : ''}>
                    Random Start Point
                </label>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Lines</span>
                        <span class="value" id="lineCountValue">${this.settings.lineCount}</span>
                    </div>
                    <input type="range" id="lineCount" min="1" max="10000" value="${this.settings.lineCount}">
                </div>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Angle</span>
                        <span class="value" id="angleValue">${this.settings.angle}°</span>
                    </div>
                    <input type="range" id="angle" min="1" max="180" value="${this.settings.angle}" ${!this.settings.nearest ? 'disabled' : ''}>
                </div>
            </div>
            <div class="setting-group">
                <label>
                    <span>Child Limit:</span>
                    <input type="number" id="childLimit" value="${this.settings.childLimit}" min="1" style="width: 100px; padding: 4px;">
                </label>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Line Min</span>
                        <span class="value" id="lineMinValue">${this.settings.lineMin}</span>
                    </div>
                    <input type="range" id="lineMin" min="1" max="50" value="${this.settings.lineMin}">
                </div>
            </div>
            <div class="setting-group">
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Line Max</span>
                        <span class="value" id="lineMaxValue">${this.settings.lineMax}</span>
                    </div>
                    <input type="range" id="lineMax" min="1" max="50" value="${this.settings.lineMax}">
                </div>
            </div>
            <button class="btn btn-go" id="goBtn">Generate</button>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const nearest = this.container.querySelector('#nearest');
        const randomStart = this.container.querySelector('#randomStart');
        const lineCount = this.container.querySelector('#lineCount');
        const lineCountValue = this.container.querySelector('#lineCountValue');
        const angle = this.container.querySelector('#angle');
        const angleValue = this.container.querySelector('#angleValue');
        const childLimit = this.container.querySelector('#childLimit');
        const lineMin = this.container.querySelector('#lineMin');
        const lineMinValue = this.container.querySelector('#lineMinValue');
        const lineMax = this.container.querySelector('#lineMax');
        const lineMaxValue = this.container.querySelector('#lineMaxValue');
        const goBtn = this.container.querySelector('#goBtn');

        nearest.addEventListener('change', (e) => {
            this.settings.nearest = e.target.checked;
            angle.disabled = !e.target.checked;
        });

        randomStart.addEventListener('change', (e) => {
            this.settings.randomStart = e.target.checked;
        });

        lineCount.addEventListener('input', (e) => {
            this.settings.lineCount = parseInt(e.target.value);
            lineCountValue.textContent = this.settings.lineCount;
        });

        angle.addEventListener('input', (e) => {
            this.settings.angle = parseInt(e.target.value);
            angleValue.textContent = `${this.settings.angle}°`;
        });

        childLimit.addEventListener('input', (e) => {
            this.settings.childLimit = parseInt(e.target.value) || 1000;
        });

        lineMin.addEventListener('input', (e) => {
            this.settings.lineMin = parseInt(e.target.value);
            lineMinValue.textContent = this.settings.lineMin;
        });

        lineMax.addEventListener('input', (e) => {
            this.settings.lineMax = parseInt(e.target.value);
            lineMaxValue.textContent = this.settings.lineMax;
        });

        goBtn.addEventListener('click', () => {
            this.onGenerate(
                this.settings.nearest,
                this.settings.lineCount,
                this.settings.angle,
                this.settings.childLimit,
                this.settings.randomStart,
                this.settings.lineMin,
                this.settings.lineMax
            );
        });
    }

    getSettings() {
        return { ...this.settings };
    }

    setSettings(settings) {
        this.settings = { ...settings };
        this.render();
    }
}

export class SeedPanel {
    constructor(container, tree) {
        this.container = container;
        this.tree = tree;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="setting-group">
                <div class="seed-input">
                    <input type="text" id="seedInput" placeholder="Enter seed (optional)" value="${this.tree.getSeed()}">
                    <button class="btn" id="randomSeedBtn">Random</button>
                </div>
            </div>
            <div class="setting-group">
                <button class="btn" id="applySeedBtn" style="width: 100%;">Apply Seed</button>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const seedInput = this.container.querySelector('#seedInput');
        const randomSeedBtn = this.container.querySelector('#randomSeedBtn');
        const applySeedBtn = this.container.querySelector('#applySeedBtn');

        randomSeedBtn.addEventListener('click', () => {
            const newSeed = Math.floor(Math.random() * 1000000000);
            seedInput.value = newSeed;
            this.tree.setSeed(newSeed);
        });

        applySeedBtn.addEventListener('click', () => {
            const seed = parseInt(seedInput.value) || Date.now();
            this.tree.setSeed(seed);
            seedInput.value = seed;
        });

        seedInput.addEventListener('change', () => {
            const seed = parseInt(seedInput.value) || Date.now();
            this.tree.setSeed(seed);
            seedInput.value = seed;
        });
    }

    updateSeed() {
        const seedInput = this.container.querySelector('#seedInput');
        if (seedInput) {
            seedInput.value = this.tree.getSeed();
        }
    }
}
