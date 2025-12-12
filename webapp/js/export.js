export class ExportScreen {
    constructor(canvas, tree) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tree = tree;

        this.exportSettings = {
            widthMM: 210,
            heightMM: 297,
            dpi: 300
        };
    }

    mmToPixels(mm, dpi) {
        return Math.round((mm / 25.4) * dpi);
    }

    updatePreview() {
        const widthPx = this.mmToPixels(this.exportSettings.widthMM, this.exportSettings.dpi);
        const heightPx = this.mmToPixels(this.exportSettings.heightMM, this.exportSettings.dpi);

        // Set canvas to export dimensions
        this.canvas.width = widthPx;
        this.canvas.height = heightPx;

        // Calculate scale to fit tree
        const scaleX = widthPx / this.tree.width;
        const scaleY = heightPx / this.tree.height;
        const scale = Math.min(scaleX, scaleY);

        // Center the tree
        const offsetX = (widthPx - this.tree.width * scale) / 2;
        const offsetY = (heightPx - this.tree.height * scale) / 2;

        // Clear background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, widthPx, heightPx);

        // Apply scaling
        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        // Render tree
        this.tree.render(this.ctx, 0, 0);

        this.ctx.restore();
    }

    downloadSVG() {
        const widthPx = this.mmToPixels(this.exportSettings.widthMM, this.exportSettings.dpi);
        const heightPx = this.mmToPixels(this.exportSettings.heightMM, this.exportSettings.dpi);

        const svg = this.tree.toSVG(widthPx, heightPx);

        // Create download link
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brownian-tree-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    setExportSettings(width, height, dpi) {
        this.exportSettings.widthMM = width;
        this.exportSettings.heightMM = height;
        this.exportSettings.dpi = dpi;
    }

    getExportSettings() {
        return { ...this.exportSettings };
    }
}
