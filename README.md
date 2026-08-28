# NOCTURNE — The Last Observatory

An immersive, scroll-driven WebGL experience for a fictional astronomical
research institute. **"WE BUILT A WINDOW INTO THE DARK."**

Built with React 18, TypeScript, Vite, Three.js and GSAP ScrollTrigger.
No UI libraries, no templates — every element is custom.

## Run

```bash
npm install
npm run dev        # development
npm run build      # production build → dist/
npm run preview    # serve the production build
```

## Architecture

```
src/
  App.tsx                     composition root, scroll/pointer wiring, loader steps
  lib/
    state.ts                  shared mutable scroll/pointer state + chapter windows
    perf.ts                   device tiering, reduced-motion, WebGL probe
    sound.ts                  generated WebAudio engine (opt-in, no autoplay)
  three/
    NocturneScene.ts          the WebGL scene: stars, moon, signal, orbits,
                              deep field, final light, camera descent
    FallbackSky.ts            2D canvas starfield when WebGL is unavailable
  components/
    Loader.tsx                functional loading sequence (weighted real steps)
    Cursor.tsx                custom cursor with contextual labels
    Nav.tsx                   navigation, chapter indicator, progress rail, sound
    Chapters.tsx              all five chapters, rAF-driven from scroll state
    InstrumentLayer.tsx       UTC clock, coordinates, calibration marks, orbit metadata
  styles/global.css           the whole visual system
```

## Design notes

- Scroll is the narrative engine: one 780vh track feeds a global progress
  value (0–1). The camera descends 438 units through the scene while the
  typography layer choreographs itself against the same progress — both read
  the same mutable state each frame via direct DOM writes, never React
  re-renders.
- Five chapters: Observatory → Signal → Orbit → Deep Field → The Unknown,
  each with its own scene subject placed along the camera path.
- Performance: three device tiers (stars 6500/3200/1400, deep-field shader
  points scaled likewise), pixel-ratio clamps, reduced-motion support, and a
  coherent 2D fallback when WebGL fails.
- Accessibility: semantic sections, keyboard-reachable controls with visible
  focus, `prefers-reduced-motion` honoured, sound strictly opt-in.
