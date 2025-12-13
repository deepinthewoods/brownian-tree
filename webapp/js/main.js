import { BrownianTree } from './brownianTree.js';
import { DrawingScreen } from './drawing.js';
import { SettingsPanel, SeedPanel } from './settings.js';
import { ExportScreen } from './export.js';
import { Vector2 } from './utils.js';

class App {
    constructor() {
        this.tree = new BrownianTree();

        // Generation progress tracking
        this.isGenerating = false;
        this.generationProgress = null;

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
        this.panelIdCounter = 2; // Start from 2 since we have settings1 and settings2

        // First panel is seed control
        const seedContainer = document.getElementById('settings1');
        this.seedPanel = new SeedPanel(seedContainer, this.tree);

        // Second panel is first generation settings
        const settings2Container = document.getElementById('settings2');
        const panel = new SettingsPanel(settings2Container, this.tree, (...args) => this.generate(...args));
        this.settingsPanels.push(panel);

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

                // Reset transform before scaling to prevent cumulative scaling
                this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
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

        // Drawing mode buttons
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                this.drawingScreen.setMode(mode);
            });
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            this.drawingScreen.makeAdjustedSourceLines();
            const seedLines = this.drawingScreen.getSeedLines();
            this.tree.setSeedLines(seedLines);
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

        // Add panel button
        document.getElementById('addPanelBtn').addEventListener('click', () => {
            this.addSettingsPanel();
        });
    }

    addSettingsPanel() {
        this.panelIdCounter++;
        const newId = `settings${this.panelIdCounter}`;

        // Create new panel div
        const newPanel = document.createElement('div');
        newPanel.className = 'settings-panel';
        newPanel.id = newId;

        // Insert before the add button
        const container = document.getElementById('settingsContainer');
        const addBtn = document.getElementById('addPanelBtn');
        container.insertBefore(newPanel, addBtn);

        // Create settings panel instance
        const panel = new SettingsPanel(newPanel, this.tree, (...args) => this.generate(...args));
        this.settingsPanels.push(panel);
    }

    initializeDefaultTree() {
        // Create default seed lines (center cross)
        const centerX = 450;
        const centerY = 450;
        const size = 20;

        const sourceStart = [
            new Vector2(centerX - size, centerY - size)
        ];
        const sourceEnd = [
            new Vector2(centerX + size, centerY + size)
        ];

        // Add default destination line (perpendicular to source)
        const destStart = [
            new Vector2(centerX - size, centerY + size)
        ];
        const destEnd = [
            new Vector2(centerX + size, centerY - size)
        ];

        const seedLines = {
            start: sourceStart,
            end: sourceEnd,
            sourceStart: sourceStart,
            sourceEnd: sourceEnd,
            destStart: destStart,
            destEnd: destEnd,
            excludeStart: [],
            excludeEnd: []
        };

        this.tree.setSeedLines(seedLines);
    }

    async generate(nearest, lineCount, angle, childLimit, randomStart, lineMin, lineMax) {
        console.log('Generating tree:', { nearest, lineCount, angle, childLimit, randomStart, lineMin, lineMax });

        // Track generation progress
        this.generationProgress = { current: 0, total: lineCount };
        this.isGenerating = true;

        // Generate with progress updates
        await this.tree.createTree(nearest, lineCount, angle, childLimit, randomStart, lineMin, lineMax, (current, total) => {
            this.generationProgress = { current, total };
        });

        this.isGenerating = false;
        this.generationProgress = null;
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

        // Show progress during generation
        if (this.isGenerating && this.generationProgress) {
            const progress = Math.floor((this.generationProgress.current / this.generationProgress.total) * 100);
            this.mainCtx.fillStyle = '#00FF00';
            this.mainCtx.font = '20px sans-serif';
            this.mainCtx.fillText(`${progress}%`, 10, 30);
        }

        // Show line count
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.font = '16px sans-serif';
        this.mainCtx.fillText(`lines: ${this.tree.start.length}`, 10, 50);
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
