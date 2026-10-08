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

The app needs a browser with WebGL 2 (any recent Chrome, Edge or Firefox). **No graphics card is needed.** It runs on the graphics built into the processor (for example Intel UHD or Iris on a Core i5, or AMD Radeon Graphics), and even with graphics acceleration switched off.

### Smooth on a laptop without a graphics card

The lab checks the computer when it starts and picks one of three graphics levels. You can also choose one in **Settings** (gear icon):

| Level | Picked for | What changes |
|---|---|---|
| **Full** | A graphics card | Bloom glow, 4× anti-aliasing, up to 1.5× resolution |
| **Light** | Built-in graphics (Intel UHD / Iris, AMD Radeon Graphics) | No post-processing pass; the glow comes from cheap sprites; up to 1× resolution |
| **Minimal** | No graphics acceleration (the browser draws on the processor) | Lower resolution, no anti-aliasing, a steady 30 frames per second, no scanline overlay |

While it runs, the lab measures the frame rate. If a computer can't keep up, it lowers the resolution, and in Automatic mode it moves down a level. Settings shows which level is in use and which graphics the browser found.

On Windows:

- Use the production build (`npm run exhibit`), not `npm run dev`.
- Plug the laptop in and set **Power mode** to *Best performance*.
- Keep the browser's graphics acceleration on: Chrome or Edge → Settings → System → **Use graphics acceleration when available**. To check, open `chrome://gpu` or `edge://gpu`; *WebGL2* should read *Hardware accelerated*. If it is off, the lab still runs, in Minimal mode.
- Turn the browser's Energy Saver off.
- If the browser offers no WebGL at all, the lab says so and explains how to switch it on.

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
| `Alt+Shift+Backspace` | Reset all |
| 3D view focused: arrows, `+` `−`, `Home` | Rotate, zoom, back to overview |

Single-key shortcuts can be turned off in Settings. Then use `Alt+Shift` with the same key (for example `Alt+Shift+M`).

## Standards

- **WCAG 2.2 AA**: text contrast is at least 7:1 on panels; text is at least 12 px (Text size setting up to 150%); there is a visible focus ring everywhere; the 3D view and all controls work from the keyboard; results are announced to screen readers; Pause, Step and Reset all are available; reduced motion is respected (system setting or in-app switch).
- **Simulation conventions (PhET / ESA style)**: Play/Pause/Step, speed choice, a round Reset all button, a Labels toggle, camera presets, About, Keyboard and Settings dialogs, and a "not to scale" notice.

## Performance

- The grid and the Seven Skies are bent on the GPU by vertex shaders. The CPU does no per-vertex work.
- Every shader is compiled while the loading screen is up, so the first photon and the first Miraj no longer freeze the screen.
- Photon paths and orbit trails reuse preallocated buffers, so there is no per-frame garbage.
- The graphics level is chosen before the 3D view is created, from the graphics hardware the browser reports, so nothing is built twice. Only the Full level runs the bloom pass (at half resolution); Light and Minimal draw straight to the screen.
- Resolution adapts to the measured frame rate. Minimal holds a steady 30 frames per second, so the processor stays free for the interface.
- Measured with software rendering (no graphics acceleration, 4-core processor, 1366×768): about 2.5 frames per second before, 25–30 after.
- The scanline overlay is static and sits under the interface. There is no backdrop blur over the 3D view.

## Project layout

```
app/                     Next.js app router (layout, page, global CSS and design tokens)
components/Lab.tsx       Screen layout
components/scene/        3D scene (R3F)
  Scene.tsx              Canvas, bloom, shader warm-up, frame cap, adaptive resolution, camera views
  Halo.tsx               Sprite glow for the levels without bloom
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
lib/quality.ts           Graphics levels and the hardware check
lib/store.ts             UI state and per-frame simulation values
```

## A note on accuracy

The physics is qualitatively faithful, but it uses dimensionless "simulation units" (1 grid square = 1 unit) and is not to scale:

- The well follows a softened Newtonian-potential profile. The 2-D sheet is a teaching analogy; real spacetime has no "down".
- Lensing integrates a 2·GM/r² bend. Real light grazing the Sun bends by only 0.0005°.
- Time dilation uses the Schwarzschild rate. On Earth's surface a clock loses only about 0.02 s a year to gravity.
- Orbits follow Kepler's equation.

Traversable wormholes remain theoretical. Module 4 is a visual analogy for reflection, not a claim about how the Miraj happened. The verses are shown as themes for reflection, not as proof, and the science is not presented as proof of scripture. Translations: Sahih International.
