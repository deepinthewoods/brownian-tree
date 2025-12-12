export class SettingsPanel {
    constructor(container, tree, onGenerate) {
        this.container = container;
        this.tree = tree;
        this.onGenerate = onGenerate;

        this.settings = {
            outside: true,
            nearest: true,
            lineCount: 1000,
            angle: 45
        };

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <h3>Generation Settings</h3>
            <div class="setting-group">
                <label>
                    <input type="checkbox" id="outside" ${this.settings.outside ? 'checked' : ''}>
                    Spawn from outside
                </label>
            </div>
            <div class="setting-group">
                <label>
                    <input type="checkbox" id="nearest" ${this.settings.nearest ? 'checked' : ''}>
                    Go towards nearest
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
                    <input type="range" id="angle" min="1" max="360" value="${this.settings.angle}">
                </div>
            </div>
            <button class="btn btn-go" id="goBtn">Generate</button>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const outside = this.container.querySelector('#outside');
        const nearest = this.container.querySelector('#nearest');
        const lineCount = this.container.querySelector('#lineCount');
        const lineCountValue = this.container.querySelector('#lineCountValue');
        const angle = this.container.querySelector('#angle');
        const angleValue = this.container.querySelector('#angleValue');
        const goBtn = this.container.querySelector('#goBtn');

        outside.addEventListener('change', (e) => {
            this.settings.outside = e.target.checked;
        });

        nearest.addEventListener('change', (e) => {
            this.settings.nearest = e.target.checked;
        });

        lineCount.addEventListener('input', (e) => {
            this.settings.lineCount = parseInt(e.target.value);
            lineCountValue.textContent = this.settings.lineCount;
        });

        angle.addEventListener('input', (e) => {
            this.settings.angle = parseInt(e.target.value);
            angleValue.textContent = `${this.settings.angle}°`;
        });

        goBtn.addEventListener('click', () => {
            this.onGenerate(
                this.settings.outside,
                this.settings.nearest,
                this.settings.lineCount,
                this.settings.angle
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
            <h3>Random Seed</h3>
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
