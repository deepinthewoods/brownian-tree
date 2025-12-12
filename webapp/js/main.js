import { BrownianTree } from './brownianTree.js';
import { DrawingScreen } from './drawing.js';
import { SettingsPanel, SeedPanel } from './settings.js';
import { ExportScreen } from './export.js';
import { Vector2 } from './utils.js';

class App {
    constructor() {
        this.tree = new BrownianTree();

        // Get DOM elements
        this.mainCanvas = document.getElementById('mainCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');

        // Screens
        this.mainScreen = document.getElementById('mainScreen');
        this.drawingScreenElement = document.getElementById('drawingScreen');
        this.exportScreenElement = document.getElementById('exportScreen');

        // Initialize components
        this.drawingScreen = new DrawingScreen(
            document.getElementById('drawingCanvas'),
            () => this.showMainScreen()
        );

        this.exportScreen = new ExportScreen(
            document.getElementById('exportCanvas'),
            this.tree
        );

        // Initialize settings panels
        this.settingsPanels = [];
        for (let i = 1; i <= 4; i++) {
            const container = document.getElementById(`settings${i}`);
            if (i === 1) {
                // First panel is seed control
                this.seedPanel = new SeedPanel(container, this.tree);
            } else {
                // Other panels are generation settings
                const panel = new SettingsPanel(container, this.tree, (...args) => this.generate(...args));
                this.settingsPanels.push(panel);
            }
        }

        // Setup canvas
        this.setupMainCanvas();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize with default seed lines
        this.initializeDefaultTree();

        // Show main screen
        this.showMainScreen();

        // Start render loop
        this.animate();
    }

    setupMainCanvas() {
        // Store initial viewport dimensions to prevent mobile browser UI changes from affecting canvas
        let lastWidth = 0;
        let lastHeight = 0;
        let resizeTimeout = null;

        const resize = () => {
            // Use clientWidth/clientHeight which are more stable on mobile
            const width = document.documentElement.clientWidth || window.innerWidth;
            const height = document.documentElement.clientHeight || window.innerHeight;

            // Only resize if dimensions actually changed significantly
            if (Math.abs(width - lastWidth) > 10 || Math.abs(height - lastHeight) > 10) {
                lastWidth = width;
                lastHeight = height;

                this.mainCanvas.width = width * window.devicePixelRatio;
                this.mainCanvas.height = height * window.devicePixelRatio;
                this.mainCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
                this.render();
            }
        };

        const debouncedResize = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(resize, 100);
        };

        resize();
        window.addEventListener('resize', debouncedResize);

        // Also handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 100);
        });
    }

    setupEventListeners() {
        // Top controls
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.tree.reset();
            this.render();
        });

        document.getElementById('drawBtn').addEventListener('click', () => {
            this.showDrawingScreen();
        });

        // Drawing screen controls
        document.getElementById('clearDrawingBtn').addEventListener('click', () => {
            this.drawingScreen.clear();
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            const seedLines = this.drawingScreen.getSeedLines();
            if (seedLines.start.length > 0) {
                this.tree.setSeedLines(seedLines.start, seedLines.end);
            }
            this.showMainScreen();
        });

        // Export controls
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportScreen();
        });

        document.getElementById('backFromExportBtn').addEventListener('click', () => {
            this.showMainScreen();
        });

        document.getElementById('downloadSvgBtn').addEventListener('click', () => {
            this.exportScreen.downloadSVG();
        });

        // Export settings
        document.getElementById('exportWidth').addEventListener('input', (e) => {
            this.updateExportSettings();
        });

        document.getElementById('exportHeight').addEventListener('input', (e) => {
            this.updateExportSettings();
        });

        document.getElementById('exportDpi').addEventListener('input', (e) => {
            this.updateExportSettings();
        });

        // Save/Load config
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfig();
        });

        document.getElementById('loadConfigBtn').addEventListener('click', () => {
            this.loadConfig();
        });
    }

    initializeDefaultTree() {
        // Create default seed lines (center cross)
        const centerX = 450;
        const centerY = 450;
        const size = 20;

        const seedStart = [
            new Vector2(centerX - size, centerY - size)
        ];
        const seedEnd = [
            new Vector2(centerX + size, centerY + size)
        ];

        this.tree.setSeedLines(seedStart, seedEnd);
    }

    async generate(outside, nearest, lineCount, angle) {
        console.log('Generating tree:', { outside, nearest, lineCount, angle });

        // Reset tree before generation
        this.tree.reset();

        // Generate with progress updates
        await this.tree.createTree(outside, nearest, lineCount, angle, (current, total) => {
            // Update could be shown in UI
            console.log(`Progress: ${current}/${total}`);
        });

        this.render();
    }

    render() {
        // Use stable dimensions
        const width = document.documentElement.clientWidth || window.innerWidth;
        const height = document.documentElement.clientHeight || window.innerHeight;

        // Clear canvas
        this.mainCtx.fillStyle = '#000';
        this.mainCtx.fillRect(0, 0, width, height);

        // Calculate scale and offset to center tree
        const scale = Math.min(width / this.tree.width, height / this.tree.height) * 0.8;
        const offsetX = (width - this.tree.width * scale) / 2;
        const offsetY = (height - this.tree.height * scale) / 2;

        // Save context state
        this.mainCtx.save();
        this.mainCtx.translate(offsetX, offsetY);
        this.mainCtx.scale(scale, scale);

        // Render tree
        this.tree.render(this.mainCtx, 0, 0);

        // Restore context
        this.mainCtx.restore();
    }

    animate() {
        if (this.currentScreen === 'main') {
            this.render();
        }
        requestAnimationFrame(() => this.animate());
    }

    showMainScreen() {
        this.currentScreen = 'main';
        this.mainScreen.classList.add('active');
        this.drawingScreenElement.classList.remove('active');
        this.exportScreenElement.classList.remove('active');
        this.render();
    }

    showDrawingScreen() {
        this.currentScreen = 'drawing';
        this.mainScreen.classList.remove('active');
        this.drawingScreenElement.classList.add('active');
        this.exportScreenElement.classList.remove('active');
        this.drawingScreen.show();
    }

    showExportScreen() {
        this.currentScreen = 'export';
        this.mainScreen.classList.remove('active');
        this.drawingScreenElement.classList.remove('active');
        this.exportScreenElement.classList.add('active');
        this.updateExportSettings();
    }

    updateExportSettings() {
        const width = parseInt(document.getElementById('exportWidth').value) || 210;
        const height = parseInt(document.getElementById('exportHeight').value) || 297;
        const dpi = parseInt(document.getElementById('exportDpi').value) || 300;

        this.exportScreen.setExportSettings(width, height, dpi);
        this.exportScreen.updatePreview();
    }

    saveConfig() {
        const config = {
            tree: this.tree.getState(),
            settings: this.settingsPanels.map(p => p.getSettings()),
            exportSettings: this.exportScreen.getExportSettings(),
            timestamp: Date.now()
        };

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brownian-tree-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);

                    // Restore tree state
                    this.tree.setState(config.tree);

                    // Restore settings
                    if (config.settings) {
                        config.settings.forEach((settings, index) => {
                            if (this.settingsPanels[index]) {
                                this.settingsPanels[index].setSettings(settings);
                            }
                        });
                    }

                    // Restore export settings
                    if (config.exportSettings) {
                        const { widthMM, heightMM, dpi } = config.exportSettings;
                        document.getElementById('exportWidth').value = widthMM;
                        document.getElementById('exportHeight').value = heightMM;
                        document.getElementById('exportDpi').value = dpi;
                    }

                    // Update seed panel
                    this.seedPanel.updateSeed();

                    this.render();

                    console.log('Configuration loaded successfully');
                } catch (error) {
                    console.error('Error loading configuration:', error);
                    alert('Error loading configuration file');
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
