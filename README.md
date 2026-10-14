# Azeemi Gala · Spacetime Lab

**Team LPPS:** an interactive 3D teaching tool that shows how gravity shapes space, light and time (General Relativity: spacetime curvature, gravitational lensing, time dilation), from a curved grid to our real Solar System and a black hole, alongside two Quranic themes: *yasbaḥūn* (bodies floating in their orbits) and the *Miraj* (the ascent through the Seven Skies).

Built with **Next.js 16**, **React 19**, **React Three Fiber / drei**, **@react-three/postprocessing** and **Tailwind CSS 4**. The interface follows the LPPS team site: Montserrat headings, the navy palette, a floating navigation bar and outlined buttons.

## Run it

For a presentation or exhibition, use the production build. It is much smoother than development mode.

```bash
npm install
npm run exhibit    # builds, then serves http://localhost:3000
```

For development: `npm run dev`.

The app needs a browser with WebGL 2 (any recent Chrome, Edge or Firefox). **No graphics card is needed.** It runs on the graphics built into the processor (for example Intel UHD or Iris on a Core i5, or AMD Radeon Graphics), and even with graphics acceleration switched off.

### Smooth on a laptop without a graphics card

The lab checks the computer when it starts and picks one of three graphics levels. You can also choose one in **Settings** (menu ☰ → Settings):

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

## The six chapters

Choose a chapter in the navigation bar (or press `1` to `6`). Each chapter shows one idea: its controls sit in the dock at the bottom of the 3D view, and its notes (live readouts, things to try, the science, the verse and a key to the picture) in the panel on the right, which `H` hides.

| | Chapter | What you see | What it teaches |
|---|---|---|---|
| **01** | Curved space | A wireframe fabric that sinks into a gravity well as you raise the **Mass**. Four bodies ride the fabric in Keplerian orbits, with faint outlines of each whole orbit. Set the mass to 0 and they fly off in straight lines. | Mass curves spacetime; an orbit is free motion along that curve. *"…each, in an orbit, is swimming"* (36:40; 21:33). |
| **02** | Bending light | **Fire light** sends light from a distant star across the grid, aimed at a chosen distance from the centre. With no mass it goes straight; with mass it bends, or falls in. When it arrives, the lensing diagram appears: the true star, the observer, and where the observer sees the star. | Light follows curved spacetime (GR's factor of 2 over Newton; Eddington, 1919). |
| **03** | Slow clocks | Two analog clocks side by side, plus a live graph. Clock A is far away; Clock B sits deep in the well, and its second hand visibly sweeps slower. | Clocks deeper in a gravity well run slower: dτ/dt = √(1 − rₛ/r). (22:47 is shown for reflection.) |
| **04** | Solar System | The Sun and the eight planets **where they are today**, from NASA JPL orbital elements, with real tilts, spins, Saturn's rings, the Moon at its real phase and the asteroid belt. Run the clock at a day, week, month or year per second; click a planet (or choose it under **Follow**) to fly to it and read its facts, including how much its gravity slows clocks. | The Sun's mass keeps the planets on their orbits; Mercury's 43″ per century; a clock on the Sun's surface loses about 67 s a year, on Earth's surface about 0.02 s. (21:33 is shown for reflection.) |
| **05** | Black hole | A black hole drawn with **real light bending**: its shadow, the photon ring, and a hot accretion disk whose far side is bent into view above and below the hole, brighter on the side turning towards us. Three clocks run side by side: one in deep space, one on the Sun's surface, and yours, which you move towards the horizon. A time-lapse runs a year every ten seconds. | Gravitational time dilation from the Sun to a black hole: at 1.5 horizon radii, 1 hour on your clock is 1 hour 44 minutes in deep space. (70:4 is shown for reflection.) |
| **06** | Seven skies | Opening the chapter engages the **Miraj**: seven stacked skies lift, then fold their centres into one tunnel, and light rises through all seven in a fraction of a second. Captions explain the four steps; close them (✕) to see every sky. | A visual analogy, inspired by the Einstein–Rosen bridge, for reflection on the Isrāʾ and Miʿrāj (17:1, 67:3). Not a scientific account. |

A **guided tour** (14 steps, about four minutes) sets up each idea in turn. It works with a presentation clicker (Page Down / Page Up).

## Controls

| Input | Action |
|---|---|
| Drag · right-drag · scroll/pinch | Rotate 360°, pan, zoom |
| `1` to `6` | Open a chapter |
| View menu (eye icon) | Camera presets for the chapter, and the Labels switch |
| `Space` | Fire light (through the tunnel during the Miraj) |
| `M` | Engage or disengage the Miraj |
| `P` · `.` · `S` | Play/pause · step while paused · slow motion |
| `[` `]` · `0` `9` | Mass −5 / +5 · mass 0 / 100 |
| `R` · `L` · `H` · `T` | Synchronise clocks · labels · hide the chapter notes · start the tour |
| `?` | All keyboard shortcuts |
| `Alt+Shift+Backspace` | Reset all |
| 3D view focused: arrows, `+` `−`, `Home` | Rotate, zoom, back to the chapter's view |

Single-key shortcuts can be turned off in Settings. Then use `Alt+Shift` with the same key (for example `Alt+Shift+M`).

## Standards

- **WCAG 2.2 AA**: text contrast is at least 7:1 on panels; text is at least 12 px (Text size setting up to 150%); there is a visible focus ring everywhere; the 3D view and all controls work from the keyboard; results are announced to screen readers; Pause, Step and Reset all are available; reduced motion is respected (system setting or in-app switch).
- **Simulation conventions (PhET / ESA style)**: Play/Pause/Step, speed choice, a round Reset all button, a Labels toggle, camera presets, About, Keyboard and Settings dialogs, and an honest line about scale on every chapter.
- **Layout**: fits a 1280×550 window (a 15" laptop at 150% display scaling) without scrolling, as well as 1366×768, 1920×1080 and phones; the dock folds onto two rows and the chapters into one picker when space or larger text needs it.

## Performance

- The grid and the Seven Skies are bent on the GPU by vertex shaders. The CPU does no per-vertex work.
- Every shader is compiled while the loading screen is up, so the first photon and the first Miraj no longer freeze the screen.
- Photon paths and orbit trails reuse preallocated buffers, so there is no per-frame garbage.
- The graphics level is chosen before the 3D view is created, from the graphics hardware the browser reports, so nothing is built twice. Only the Full level runs the bloom pass (at half resolution); Light and Minimal draw straight to the screen.
- Resolution adapts to the measured frame rate. Minimal holds a steady 30 frames per second, so the processor stays free for the interface.
- The black hole is one full-screen pass. Light paths around a Schwarzschild black hole are integrated once, when the chapter is first needed (about 10 ms), into a small table; each pixel then follows its bent ray with a few texture reads instead of integrating it.
- The Solar System uses small custom shaders with no scene lights, sprite glows instead of post-processing, and the asteroid belt turns on the GPU. Surface maps (1024×512) load in idle time, after the lab is ready.
- Worst case measured: software rendering only (no graphics hardware at all, 4-core processor, 1280×550). About 30 frames per second in curved space, bending light, the Solar System and the seven skies, and 22–30 in the clocks and black hole chapters. With built-in graphics such as Intel UHD, the browser hands this work to the graphics chip and it runs considerably faster.
- Panels over the 3D view are near-solid on the light levels: a backdrop blur is used only on the Full level. The clock dials repaint a few times a second without a graphics card. The scanline overlay (off by default) is static and sits under the interface.

## Project layout

```
app/                     Next.js app router (layout, page, global CSS and design tokens)
components/Lab.tsx       Screen layout
components/scene/        3D scene (R3F)
  Scene.tsx              Canvas, bloom, shader warm-up, frame cap, adaptive resolution, camera views and following
  Halo.tsx               Sprite glow for the levels without bloom
  SimDriver.tsx          Shared time step, pause/speed, Miraj timeline, clocks
  SpacetimeGrid.tsx      Chapter 01: grid (vertex shader)
  OrbitingBodies.tsx     Chapter 01: Kepler orbits, trails, outlines, straight-line release
  PhotonBeams.tsx        Chapter 02: photon pool and lensing diagram
  TimeClocks.tsx         Chapter 03: clock beacons
  SolarSystem.tsx        Chapter 04: the Sun, planets, rings, Moon and asteroid belt
  BlackHole.tsx          Chapter 05: light-bending pass and the three clocks
  SevenSkies.tsx         Chapter 06: seven skies (vertex shader), tunnel light
  AnchorProjector.tsx    Pins DOM labels to 3D points and keeps them apart
components/ui/           Navigation, dock, chapter notes, captions, dialogs, tour
  chapters/              Each chapter's dock controls, live readouts and caption
lib/chapters.ts          The six chapters: order, stage, camera views, scale notes
lib/physics.ts           Physics of the grid, light and clocks
lib/solar.ts             Planet positions (JPL elements) and physical data
lib/blackhole.ts         Light-bending table and clock rates
lib/content.ts           All explanatory text, verses and labels
lib/credits.ts           Third-party material
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
- **Solar System**: positions come from NASA JPL's "Approximate Positions of the Planets" (E. M. Standish), good to a few arcminutes between 1800 and 2050. Distances are compressed (drawn at 9·√r, r in au) and sizes enlarged so that all eight planets fit; tilts, spin periods and orbital periods are real. The clock losses quoted are the weak-field values GM/(Rc²).
- **Black hole**: light paths are true Schwarzschild null geodesics (non-spinning hole). The disk is a thin disk from 3 to 12 horizon radii (its inner edge at the innermost stable orbit) with the standard thin-disk temperature profile, T ∝ r^(−3/4)·(1 − √(r_in/r))^(1/4), and the exact frequency shift of gas on circular orbits (Doppler beaming and gravitational redshift; intensity ∝ g⁴); its turbulence is procedural. The photon ring is drawn as a glow at the critical impact parameter. Clock rates are exact for clocks hovering at rest: √(1 − rₛ/r).

Traversable wormholes remain theoretical. Module 4 is a visual analogy for reflection, not a claim about how the Miraj happened. The verses are shown as themes for reflection, not as proof, and the science is not presented as proof of scripture. Translations: Sahih International.

## Credits

- Planet and Sun surface maps: [Solar System Scope](https://www.solarsystemscope.com/textures/), based on NASA imagery, CC BY 4.0 (resized).
- Planet positions: NASA JPL, "Approximate Positions of the Planets" (E. M. Standish).
- Montserrat typeface: The Montserrat Project Authors, SIL Open Font License 1.1 (`public/fonts/Montserrat-OFL.txt`).
- Amiri typeface (Arabic): SIL Open Font License 1.1.
- LPPS logo: Team LPPS.
