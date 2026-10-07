# Azeemi Gala · Spacetime Lab

**Team LPPS:** an interactive 3D teaching tool that shows how gravity shapes space, light and time (General Relativity: spacetime curvature, gravitational lensing, time dilation), alongside two Quranic themes: *yasbaḥūn* (bodies floating in their orbits) and the *Miraj* (the ascent through the Seven Skies).

Built with **Next.js 16**, **React 19**, **React Three Fiber / drei**, **@react-three/postprocessing** and **Tailwind CSS 4**.

## Run it

For a presentation or exhibition, use the production build. It is much smoother than development mode.

```bash
npm install
npm run exhibit    # builds, then serves http://localhost:3000
```

For development: `npm run dev`.

The app needs a browser with WebGL (any recent Chrome, Edge or Firefox).

### Smooth on a Windows laptop

- Plug the laptop in and set **Power mode** to *Best performance*.
- In **Settings → System → Display → Graphics**, set Chrome or Edge to *High performance*.
- Keep the browser's hardware acceleration on, and turn Energy Saver off.
- The lab picks a graphics level automatically. If it still stutters, open **Settings** (gear icon) and choose **Light**, or turn off **Glow effect**.

## The four modules

| | Module | What you see | What it teaches |
|---|---|---|---|
| **1** | Curved space | A wireframe fabric that sinks into a gravity well as you raise **Central mass**. Four bodies ride the fabric in Keplerian orbits, with faint outlines of each whole orbit. Set the mass to 0 and they fly off in straight lines. | Mass curves spacetime; an orbit is free motion along that curve. *"…each, in an orbit, is swimming"* (36:40; 21:33). |
| **2** | Bending light | **Fire photon beam** sends light from a distant star across the grid, aimed at a chosen distance from the centre. With no mass it goes straight; with mass it bends, or falls in. When it arrives, the lensing diagram appears: the true star, the observer, and where the observer sees the star. | Light follows curved spacetime (GR's factor of 2 over Newton; Eddington, 1919). |
| **3** | Slow clocks | Two analog clocks side by side, plus a live graph. Clock A is far away; Clock B sits deep in the well, and its second hand visibly sweeps slower. | Clocks deeper in a gravity well run slower: dτ/dt = √(1 − rₛ/r). (22:47 is shown for reflection.) |
| **4** | Seven skies | **Engage Miraj** lifts seven stacked skies, then folds their centres into one tunnel. Light rises through all seven in a fraction of a second. Captions explain the four steps. | A visual analogy, inspired by the Einstein–Rosen bridge, for reflection on the Isrāʾ and Miʿrāj (17:1, 67:3). Not a scientific account. |

A **guided tour** (10 steps, about three minutes) sets up each idea in turn. It works with a presentation clicker (Page Down / Page Up).

## Controls

| Input | Action |
|---|---|
| Drag · right-drag · scroll/pinch | Rotate 360°, pan, zoom |
| View buttons | Overview, Above, Side, Clocks (Skies and Up the tunnel during the Miraj) |
| `Space` | Fire the photon beam (through the tunnel during the Miraj) |
| `M` | Engage or disengage the Miraj |
| `P` · `.` · `S` | Play/pause · step while paused · slow motion |
| `[` `]` · `0` `9` | Mass −5 / +5 · mass 0 / 100 |
| `R` · `L` · `H` · `T` | Synchronise clocks · labels · hide controls · start the tour |
| `?` | All keyboard shortcuts |
| `Alt+Shift+R` | Reset all |
| 3D view focused: arrows, `+` `−`, `Home` | Rotate, zoom, back to overview |

Single-key shortcuts can be turned off in Settings. `Alt+Shift+<key>` always works.

## Standards

- **WCAG 2.2 AA**: text contrast is at least 7:1 on panels; text is at least 12 px (Text size setting up to 150%); there is a visible focus ring everywhere; the 3D view and all controls work from the keyboard; results are announced to screen readers; Pause, Step and Reset all are available; reduced motion is respected (system setting or in-app switch).
- **Simulation conventions (PhET / ESA style)**: Play/Pause/Step, speed choice, a round Reset all button, a Labels toggle, camera presets, About, Keyboard and Settings dialogs, and a "not to scale" notice.

## Performance

- The grid and the Seven Skies are bent on the GPU by vertex shaders. The CPU does no per-vertex work.
- Every shader is compiled while the loading screen is up, so the first photon and the first Miraj no longer freeze the screen.
- Photon paths and orbit trails reuse preallocated buffers, so there is no per-frame garbage.
- Render resolution is capped at 1.5×, and bloom runs at half resolution. A light graphics tier is chosen automatically from the GPU and the measured frame rate.
- The scanline overlay is static and sits under the interface. There is no backdrop blur over the 3D view.

## Project layout

```
app/                     Next.js app router (layout, page, global CSS and design tokens)
components/Lab.tsx       Screen layout
components/scene/        3D scene (R3F)
  Scene.tsx              Canvas, quality tiers, bloom, shader warm-up, camera views
  SimDriver.tsx          Shared time step, pause/speed, Miraj timeline, clocks
  SpacetimeGrid.tsx      Module 1: grid (vertex shader)
  OrbitingBodies.tsx     Module 1: Kepler orbits, trails, outlines, straight-line release
  PhotonBeams.tsx        Module 2: photon pool and lensing diagram
  TimeClocks.tsx         Module 3: clock beacons
  SevenSkies.tsx         Module 4: seven skies (vertex shader), tunnel light
  AnchorProjector.tsx    Pins DOM labels to 3D points
components/ui/           Console, explanations, dialogs, tour, time controls, clock dials and graph
lib/physics.ts           All the physics in one place
lib/shaders.ts           GPU versions of the grid and fold
lib/content.ts           All explanatory text, verses and labels
lib/tour.ts              The guided tour
lib/store.ts             UI state and per-frame simulation values
```

## A note on accuracy

The physics is qualitatively faithful, but it uses dimensionless "simulation units" (1 grid square = 1 unit) and is not to scale:

- The well follows a softened Newtonian-potential profile. The 2-D sheet is a teaching analogy; real spacetime has no "down".
- Lensing integrates a 2·GM/r² bend. Real light grazing the Sun bends by only 0.0005°.
- Time dilation uses the Schwarzschild rate. On Earth's surface a clock loses only about 0.02 s a year to gravity.
- Orbits follow Kepler's equation.

Traversable wormholes remain theoretical. Module 4 is a visual analogy for reflection, not a claim about how the Miraj happened. The verses are shown as themes for reflection, not as proof, and the science is not presented as proof of scripture. Translations: Sahih International.
