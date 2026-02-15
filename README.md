# K-2SO: Rogue Droid

A browser-based 3D third-person shooter built with Three.js. Play as K-2SO, the reprogrammed Imperial security droid from *Rogue One: A Star Wars Story*, fighting through 10 unique levels across the galaxy.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

## Features

- **Procedural 3D models** — all characters and environments built from primitives (no external assets)
- **Third-person camera** with aim mode, wall collision, and smooth follow
- **Combat system** — blaster shooting, melee attacks, reload mechanics
- **B1 battle droid enemies** with AI state machine (idle / alert / combat / search)
- **10 levels** across different locations, each with unique geometry, lighting, and atmosphere
- **Boss encounter** — General Grievous awakens on the final level
- **NPCs** — Jabba the Hutt, crew members, robot chef, and more
- **Physics** — cannon-es powered collisions, gravity, and ragdoll deaths
- **HUD** — health, shield, ammo, crosshair, damage overlay, kill counter

## Levels

| # | Location | Description |
|---|----------|-------------|
| 1 | Spaceship | Imperial vessel with 6 halls (bridge, prison, storage, canteen, bedroom, escape pod) |
| 2 | Ice Planet | Frozen plains with ice columns, snowdrifts, and frozen rocks |
| 3 | Jedi Temple | Marble columns, golden capitals, Jedi statues, and emblem |
| 4 | Droid Factory | Conveyor belts, pipes, robotic arms, industrial orange lighting |
| 5 | Mountain Restaurant | Wooden interior, panoramic windows with mountain views |
| 6 | Jedi Cemetery | Tombstones, dead trees, green glow, eerie fog |
| 7 | Abandoned City | Ruined buildings, rusty cars, rubble on the streets |
| 8 | Saturn Mine | Rocky tunnel with glowing crystals, minecart rails, ore crates |
| 9 | Desert Planet | Sand dunes, rock formations, ancient ruins, crashed ships |
| 10 | Grievous Chamber | Final boss fight — Grievous wakes from his throne |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| 3D Rendering | [Three.js](https://threejs.org/) |
| Language | TypeScript |
| Bundler | [Vite](https://vitejs.dev/) |
| Physics | [cannon-es](https://pmndrs.github.io/cannon-es/) |
| UI | HTML/CSS overlay on canvas |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open `http://localhost:5173` in your browser and click to start.

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Move forward |
| S / Arrow Down | Move backward |
| A / Arrow Left | Strafe left |
| D / Arrow Right | Strafe right |
| Mouse | Look around |
| Left Click | Shoot |
| Right Click | Aim |
| F | Melee attack |
| R | Reload |
| Space | Jump |
| Shift | Sprint |

## Project Structure

```
src/
├── core/
│   ├── Game.ts              # Main game loop, level management
│   └── InputManager.ts      # Keyboard & mouse input
├── entities/
│   ├── Entity.ts            # Base entity class
│   ├── K2SO.ts              # Player character
│   ├── Stormtrooper.ts      # B1 battle droid enemy
│   └── Projectile.ts        # Blaster bolt
├── systems/
│   ├── CameraSystem.ts      # Third-person camera
│   ├── PhysicsSystem.ts     # cannon-es physics
│   └── CombatSystem.ts      # Shooting, melee, projectiles
├── levels/
│   ├── TestLevel.ts         # Spaceship + Grievous room
│   └── LevelFactory.ts      # 8 environment generators
├── ui/
│   └── HUD.ts               # In-game UI overlay
└── utils/
    ├── Constants.ts          # Game parameters
    └── MathUtils.ts          # Math helpers
```

## License

This project is for educational and fan purposes only. Star Wars and all related characters are trademarks of Lucasfilm Ltd.
