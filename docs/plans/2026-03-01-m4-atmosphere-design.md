# M4: Atmosphere — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Branch:** `feat/m4-atmosphere`
**Scope:** Dark modes only (Tron City + Cosmos dark). Star Chart unchanged.
**Approach:** Enhancement Incrementale — build on existing R3F + postprocessing foundation.

## Decision Record

- **Performance:** Quality first, with `high/low` toggle for hardware scaling.
- **Visual modes:** Only dark modes (Tron City + Cosmos). Star Chart is intentionally minimal.
- **Dynamism:** Living environment — everything breathes slowly, never identical.
- **Approach:** Incremental enhancement (Approach A). No custom shaders, no HDRI dependency.

## Current State

Already implemented (M2C-M2D):
- Post-processing: Bloom (1.0, threshold 0.45), Vignette, Chromatic Aberration (0.08%), Noise (6%)
- Materials: MeshPhysicalMaterial with clearcoat 0.8, metalness 0.45, roughness 0.3, emissive 0.15
- Particles: Starfield (3000), Nebulae (3 sprites), Dust (600 points)
- Fog: FogExp2 density 0.012, color #000015
- Palette: Cosmic neon (cyan, magenta, amber) + semantic link states

## Section 1: Post-Processing Enhancements

### SSAO (Screen-Space Ambient Occlusion)
- Adds contact shadows between buildings and ground — creates depth and grounding.
- Radius: ~0.5, intensity: ~0.4.
- Effect: buildings no longer "float" on the ground plane.

### Depth of Field
- Subtle bokeh on distant elements.
- Auto-focus on scene center (or selected object).
- Low blur amount — suggests depth without losing readability.
- Disabled during active orbiting (no blur while rotating camera).

### Adaptive Bloom
- Luminance threshold adapts to emissive density in scene.
- More services = slightly higher threshold to prevent wash-out.
- Range: 0.35-0.55.

### Refined Tone Mapping
- Move from stock ACESFilmic to a custom exposure curve.
- Preserves saturated neons better without burning them out.

## Section 2: Atmospheric Effects

### Ground Fog (Tron City only)
- Semi-transparent plane at Y=0.5 with animated noise texture.
- Creates wisps of low fog between buildings.
- Opacity: 0.08-0.15, drift speed: 0.02.
- Not used in Cosmos mode (no ground plane).

### God Rays from Auth Gate / Wormhole
- Volumetric rays from the central focal point.
- Uses `GodRays` effect from postprocessing library.
- Intensity: 0.3, decay: 0.92, density: 0.5.
- Tron City: emanates from auth gate octahedron.
- Cosmos: emanates from wormhole.

### Haze Layers
- 2-3 transparent planes at Z 40, 80, 120.
- Additive noise textures creating "layers of space" effect.
- Opacity: 0.03-0.06.
- Colors from cosmic palette: #000015 to #0a0a2e.
- More distant = more ethereal.

### Enhanced Nebulae
- Existing 3 sprites: add slow drift (sine/cosine, period 60-90s), slow rotation (0.01 rad/s), breathing opacity (0.7-1.0, period 20s).
- Add 2 extra smaller/distant nebulae for depth.
- Total: 5 nebulae.

### Enhanced Dust
- Existing 600 points: add size variation (1-3px), individual twinkle per particle.
- Add 50 dust trail particles (3-point trails) suggesting movement in vacuum.
- Total: 650 particles.

## Section 3: Material Upgrades

### Procedural Roughness Variation
- Instead of uniform roughness 0.3, apply simplex noise roughness map.
- Generated once in `useMemo`, not per frame.
- Noise scale: ~8.0, amplitude: 0.15 (effective range: 0.15-0.45).
- Makes surfaces look like real materials, not plastic.

### Iridescence on Service Corridors
- Road surfaces get `iridescence: 0.3`, `iridescenceIOR: 1.3`.
- Subtle rainbow shift when camera moves — suggests "data flow".
- Only on road surface, not markings.

### Emissive Breathing
- All buildings: `0.1 + 0.08 * sin(time * 0.3 + buildingIndex * 0.5)`.
- Each building has a different phase offset — not synchronized.
- Looks organic. Period: ~20 seconds.

### Auth Gate / Wormhole Crystalline Material
- Octahedron: `transmission: 0.4` (semi-transparent), `thickness: 1.5`, `ior: 2.0` (diamond-like).
- Outer haze sphere: `iridescence: 0.5`.
- Cosmos wormhole torus + portal: same treatment.

### District Ground Grid
- Procedural grid texture on ground planes (lines at regular intervals).
- Opacity: 0.05, spacing: ~2 units.
- Reinforces Tron aesthetic without being invasive.

## Section 4: Living Environment — Ambient Animations

### Directional Light Breathing
- Key light rotates slowly: 5-degree arc, period 120s.
- Intensity oscillates: 0.5-0.7.
- Effect: slow shadow shift suggesting distant "sun" movement.
- Imperceptible unless watching for 30+ seconds.

### Color Temperature Drift
- Key light color shifts: #e0f0ff (cool cyan) to #f0e8ff (warm lavender).
- Period: 90 seconds.
- Imperceptibly changes scene mood — sometimes cooler, sometimes warmer.

### Improved Starfield
- 3 star classes instead of uniform:
  - Small (70%): fast twinkle 2-4s.
  - Medium (25%): slow twinkle 6-10s, slightly brighter.
  - Large (5%): near-fixed, high brightness.
- Creates perceived depth in the sky.

### Periodic Pulse Wave
- Every 45-60 seconds, a subtle light wave propagates from center outward.
- Manifests as slight emissive boost (+0.1) passing through buildings radially.
- Wave duration: 3 seconds center-to-edge.
- Very low opacity — more "breath" than flash.

### Status Particles
- Buildings with `degraded` or `blocked` state spawn micro-particles.
- 20-30 particles per building, rising slowly and dissolving.
- Colors: amber (degraded), red (blocked).
- Communicates state visually without reading colors.
- Not on `ok` buildings.

## Section 5: Quality Toggle & Architecture

### Quality Store
- Extend `view.store.ts` or new `quality.store.ts`.
- `quality: 'high' | 'low'`, persisted in localStorage.
- Toggle accessible from UI (settings icon in panel).

### High Profile (default)
- All effects active: SSAO, DoF, God Rays, Ground Fog, Haze Layers
- Starfield: 3000, 3 classes
- Dust: 600 + 50 trail particles
- Nebulae: 5, drift + breathing
- Procedural roughness maps
- Pulse wave, status particles active

### Low Profile
- Disabled: SSAO, DoF, God Rays, Ground Fog, Haze Layers
- Starfield: 1500, uniform (no classes)
- Dust: 300, no trails
- Nebulae: 3 (original), static
- Uniform roughness (as today)
- Pulse wave, status particles disabled
- Kept: Bloom, Vignette, Chromatic Aberration, Noise (lightweight)

### File Organization
New files in `client/src/components/atmosphere/`:
- `GroundFog.tsx` — animated fog plane
- `HazeLayers.tsx` — depth planes
- `GodRaysEffect.tsx` — god rays post-processing wrapper
- `StatusParticles.tsx` — particles for degraded/blocked buildings
- `PulseWave.tsx` — periodic radial wave

Existing files enhanced in-place:
- Starfield, Nebulae, Dust components (in current atmosphere files)
- Scene.tsx (post-processing additions, light animations)
- Building/endpoint materials (roughness, emissive breathing, iridescence)
- Auth gate / wormhole materials (crystalline upgrade)
