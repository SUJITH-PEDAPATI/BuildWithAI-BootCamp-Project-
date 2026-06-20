# LuxeVista 3D 🌌

**LuxeVista 3D** is a premium, immersive WebGL-powered hotel and restaurant booking platform. Drawing design inspiration from sleek dark-mode glassmorphic layouts, it features rich micro-animations, custom cursor physics, and real-time interactive 3D environments that allow clients to visual-test their accommodations and select configurations in real-time.

---

## 🌟 Key Features

*   **Interactive 3D WebGL Globe**: A futuristic glowing wireframe globe mapping real latitude and longitude positions to clickable destination indicators. Selecting locations triggers smooth GSAP camera zooms.
*   **3D Room Configurator**: Fully interactive WebGL models of hotel rooms. Users can inspect materials, toggle lighting conditions, and alternate suites.
*   **3D Seating Selector**: Procedural restaurant dining plans where guests can rotate, inspect, and select individual seating tables.
*   **Glassmorphic Design System**: Custom HSL-based design theme utilizing fluid blurred panels, neon gradients, specialized custom scrollbars, and momentum-based cursor trackers.
*   **Dynamic Checkout System**: Automated booking checkout form featuring a custom receipt ticket, date/guest duration cost calculators, and step-by-step transaction simulations.

---

## 🛠️ Technology Stack

*   **Logic**: Vanilla Javascript (ES6 modules)
*   **Styling**: Vanilla CSS3 (Custom Design Tokens, Glassmorphism, HSL tailors)
*   **3D Renderer**: [Three.js](https://threejs.org/) (WebGL scenes, lights, shadows, procedural grids)
*   **Animations**: [GSAP](https://greensock.com/gsap/) (Inertia camera vectors, scale transforms, pulse timelines)
*   **Tooling**: [Vite](https://vite.dev/) (Local hot-reloading dev server & Rollup/Rolldown production bundles)

---

## 📁 Project Structure

```text
├── dist/                  # Production builds output directory
├── public/                # Static public assets
├── src/
│   ├── assets/            # Vector icons and images
│   ├── booking.js         # Ticketing calculations and checkouts
│   ├── data.js            # Mock luxury properties database
│   ├── globe.js           # Three.js 3D Holographic Globe
│   ├── main.js            # Main coordinator and view router
│   ├── roomViewer.js      # Three.js 3D Room & Seating plans
│   └── style.css          # Design system stylesheet
├── index.html             # App shell markup
├── package.json           # Scripts and dependencies
└── vite.config.js         # Vite configuration options
```

---

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16.0 or higher recommended)
*   [npm](https://www.npmjs.com/) (usually bundles with Node)

### Installation

1. Clone or extract the project directory:
   ```bash
   cd BuildWithAI-BootCamp-Project-
   ```

2. Install runtime dependencies (`three`, `gsap`):
   ```bash
   npm install
   ```

3. Install development dependencies (`esbuild`):
   ```bash
   npm install -D esbuild
   ```

### Running Locally

To run the local development server with hot-module replacement (HMR):
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Building for Production

To build and compile optimized, minified assets for hosting:
```bash
npm run build
```
The output files will be built inside the `dist/` directory.

---

## 🎨 Visual Preview

Here is a glimpse of the application views:
*   **Global Explorer**: Drag, spin, and click geographic indicators on the glowing earth.
*   **Suite Configuration**: Swap room levels and adjust lighting presets (Sunset, Midnight Cozy, Cyber Neon).
*   **Table Booking**: Click on glowing dining table indicators to pick your perfect view.