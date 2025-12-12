# Brownian Tree Generator - WebApp

A JavaScript port of the Brownian Tree Generator, creating beautiful fractal tree structures through particle aggregation simulation.

## Features

- **Interactive Seed Line Drawing**: Click to draw initial seed lines that serve as the foundation for tree growth
- **Real-time Generation**: Watch the tree grow in real-time with progress updates
- **Configurable Parameters**:
  - Spawn location (from edges or anywhere)
  - Movement behavior (towards nearest point or center)
  - Number of lines/branches
  - Angle variation
- **Seeded Random Generation**: Use seeds for reproducible results
- **SVG Export**: Export your trees to SVG with configurable dimensions (mm) and DPI
- **Save/Load Configurations**: Save your settings and tree state for later use

## How to Use

### 1. Running the App

Simply open `index.html` in a modern web browser. No build process or server required.

### 2. Drawing Seed Lines

1. Click the **Draw** button
2. Click on the canvas to place start points and end points alternately
3. Click **Back** when done to return to the main screen

### 3. Generating Trees

Each of the four settings panels allows you to configure and generate different layers:

- **Seed Panel**: Set or randomize the random seed for reproducible generation
- **Settings Panels 1-3**: Configure generation parameters and click **Generate**
  - **Spawn from outside**: Particles spawn from canvas edges
  - **Go towards nearest**: Particles move toward the nearest existing line
  - **Lines**: Number of line segments to generate (1-10000)
  - **Angle**: Angular variation for particle movement (1-360°)

### 4. Exporting

1. Click **Export** to open the export screen
2. Configure export dimensions:
   - Width/Height in millimeters
   - DPI (dots per inch)
3. Preview the result
4. Click **Download SVG** to save

### 5. Save/Load Configurations

- **Save Config**: Downloads a JSON file with all settings and tree state
- **Load Config**: Loads a previously saved configuration

## Technical Details

### File Structure

```
webapp/
├── index.html          # Main HTML structure
├── styles.css          # Styling
├── js/
│   ├── main.js         # App coordination and initialization
│   ├── brownianTree.js # Core tree generation algorithm
│   ├── drawing.js      # Drawing screen for seed lines
│   ├── settings.js     # Settings panel components
│   ├── export.js       # SVG export functionality
│   └── utils.js        # Vector math and utilities
```

### Algorithm

The Brownian tree is generated using a particle aggregation algorithm:

1. Particles spawn at random locations (edges or anywhere)
2. Each particle performs a random walk, biased towards existing structures
3. When a particle collides with an existing line, it sticks and becomes part of the tree
4. Line thickness is calculated based on branching structure (thicker near the trunk)

### Browser Support

Requires a modern browser with ES6+ support:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Differences from Java Version

- Pure JavaScript implementation (no libGDX dependency)
- Module-based architecture
- Canvas-based rendering with SVG export
- Real-world dimension configuration (mm + DPI)
- Modern web UI with responsive design
- Browser-based save/load using JSON files

## License

Same as the parent project.
