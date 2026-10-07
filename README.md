# Azeemi Gala · Spacetime Lab

**Team LPPS:** an interactive 3D teaching tool that connects modern astrophysics (General Relativity, spacetime curvature, gravitational lensing, time dilation) with two Quranic concepts: *yasbahūn* (bodies floating in their orbits) and the *Miraj* (the ascent through the Seven Skies).

Built with **Next.js 16**, **React 19**, **React Three Fiber / drei**, **@react-three/postprocessing** (bloom) and **Tailwind CSS 4**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

The app needs a browser with WebGL. A laptop with a dedicated or integrated GPU runs it at 60 fps.

## The four modules

| | Module | What you see | What it teaches |
|---|---|---|---|
| **A** | Spacetime Grid | A wireframe fabric that sinks into a gravity well as you raise **Central Mass**. Four glowing bodies ride the fabric in Keplerian orbits (one elliptical). | Mass curves spacetime. Orbits are free fall along the curved geometry: *"each floating in an orbit"* (21:33, 36:40). |
| **B** | Gravitational Lensing | **Fire Photon Beam** sends a bright photon across the grid. With mass 0 it flies straight. With mass it bends around the well, or is captured. A dashed guide shows the straight path. | Light follows curved spacetime. The bending uses GR's factor of 2 over Newton (Eddington, 1919). |
| **C** | Time Dilation | Two digital clocks pinned in the scene. **Clock A** sits on the flat edge; **Clock B** sits deep in the well. Each clock's tick light flashes once per second of its own time. | Clocks deeper in a gravity well run slower: dτ/dt = √(1 − rₛ/r). At full mass Clock B runs at about 0.32 s per second. |
| **D** | Seven Skies · Miraj | **Engage Miraj / Spacetime Fold** lifts seven stacked skies, then pinches their centres into one vertical cylinder, an Einstein–Rosen bridge. A light particle then shoots up through all seven in under half a second. | Folding spacetime makes the route through the throat far shorter than the route across the skies (17:1, 67:3). |

A **Field Notes** card (bottom left) explains the physics and the related verse for the module you last used.

## Controls

| Input | Action |
|---|---|
| Drag / right-drag / scroll | Rotate 360°, pan, zoom (OrbitControls) |
| `Space` | Fire photon. In Miraj mode, sends light through the tunnel |
| `M` | Engage / disengage Miraj |
| `↑` `↓` · `0` `9` | Mass ±5 · mass 0 / 100 |
| `R` | Synchronise clocks |
| `H` · `I` · `N` | Hide console · hide field notes · next field note |

## Project layout

```
app/                    Next.js app router (layout, page, global CSS + CRT effects)
components/Lab.tsx      Screen layout + keyboard shortcuts
components/scene/       3D scene (R3F)
  SimDriver.tsx         Advances shared state each frame (mass easing, Miraj phases, clocks)
  SpacetimeGrid.tsx     Module A: deforming grid
  OrbitingBodies.tsx    Module A: Kepler orbits with trails
  CentralMass.tsx       The glowing body in the well
  PhotonBeams.tsx       Module B: photon tracing + streak animation
  TimeClocks.tsx        Module C: clock beacons + overlay anchors
  SevenSkies.tsx        Module D: seven skies, fold, tunnel traveller
  AnchorProjector.tsx   Pins DOM overlays to 3D points
components/ui/          Control console, field notes, clock readouts, CRT overlay
lib/physics.ts          All the physics in one place (well profile, lensing, dilation, fold)
lib/store.ts            Zustand UI state + per-frame simulation values
```

## A note on accuracy

The physics is qualitatively faithful but uses dimensionless "simulation units" and is not to scale:

- The well follows a softened Newtonian-potential profile.
- Lensing integrates a 2·GM/r² bend.
- Time dilation uses the Schwarzschild rate.
- Orbits follow Kepler's equation.

Traversable wormholes remain theoretical. Module D is a visual analogy for reflection, not a claim about how the Miraj happened.
