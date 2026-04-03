import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { GrievousRef } from './TestLevel';

export interface Pedestrian {
  mesh: THREE.Group;
  speed: number;
  dirX: number;
  dirZ: number;
  originX: number;
  originZ: number;
  walkRadius: number;
  phase: number;
  leftLeg: THREE.Object3D | null;
  rightLeg: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
}

export interface MovingCar {
  mesh: THREE.Group;
  speed: number;
  dirX: number;
  dirZ: number;
  startX: number;
  startZ: number;
  length: number;
}

export interface TrafficLight {
  redMesh: THREE.Mesh;
  yellowMesh: THREE.Mesh;
  greenMesh: THREE.Mesh;
  phase: number;
}

export interface LevelData {
  group: THREE.Group;
  bodies: CANNON.Body[];
  lights: THREE.Light[];
  enemies: THREE.Vector3[];
  turrets?: THREE.Vector3[];
  playerSpawn: THREE.Vector3;
  fogColor: number;
  bgColor: number;
  grievousRef?: GrievousRef;
  pedestrians?: Pedestrian[];
  movingCars?: MovingCar[];
  trafficLights?: TrafficLight[];
  /** Отложенная загрузка — вызвать после старта, чтобы достроить уровень */
  deferredBuild?: () => void;
}

/** Добавить укрытия на уровень (ящики/баррикады) */
function addCover(
  group: THREE.Group,
  bodies: CANNON.Body[],
  physics: PhysicsSystem,
  mat: THREE.Material,
  defs: { x: number; y: number; z: number; w: number; h: number; d: number }[]
): void {
  for (const c of defs) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), mat);
    mesh.position.set(c.x, c.y, c.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    bodies.push(physics.createStaticBox(
      new THREE.Vector3(c.x, c.y, c.z),
      new THREE.Vector3(c.w, c.h, c.d)
    ));
  }
}

// =====================================================
// УРОВЕНЬ 1: КОСМИЧЕСКИЙ КОРАБЛЬ (создаётся отдельно через createTestLevel)
// =====================================================

// =====================================================
// УРОВЕНЬ 2: ЛЕДЯНАЯ ПЛАНЕТА
// =====================================================
export function createIcePlanet(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const iceMat = new THREE.MeshStandardMaterial({ color: 0xc8e8ff, roughness: 0.15, metalness: 0.3 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 0.9, metalness: 0.0 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7788aa, roughness: 0.7, metalness: 0.2 });
  const darkIceMat = new THREE.MeshStandardMaterial({ color: 0x8ab8dd, roughness: 0.1, metalness: 0.4 });

  // Пол — снежная равнина
  const floor = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 120), snowMat);
  floor.position.set(0, -0.25, -50);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -50), new THREE.Vector3(120, 0.5, 120)));

  // Ледяные стены (ограничивают арену)
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 120), iceMat);
    wall.position.set(s * 55, 4, -50);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 55, 4, -50), new THREE.Vector3(2, 8, 120)));
  }
  // Задняя и передняя стены
  for (const z of [10, -110]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(112, 8, 2), iceMat);
    wall.position.set(0, 4, z);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 4, z), new THREE.Vector3(112, 8, 2)));
  }

  // Ледяные колонны
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = -15 - Math.random() * 80;
    const h = 4 + Math.random() * 6;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, h, 6), darkIceMat);
    col.position.set(x, h / 2, z);
    col.castShadow = true;
    group.add(col);
  }

  // Сугробы (укрытия)
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = -10 - Math.random() * 90;
    const w = 2 + Math.random() * 3;
    const h = 1 + Math.random() * 1.5;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(w, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), snowMat);
    mound.position.set(x, 0, z);
    group.add(mound);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w * 1.5, h, w * 1.5)));
  }

  // Замёрзшие скалы
  for (let i = 0; i < 6; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = -20 - Math.random() * 70;
    const rock = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 2 + Math.random() * 3, 3 + Math.random() * 2), rockMat);
    rock.position.set(x, 1.5, z);
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    group.add(rock);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(4, 4, 4)));
  }

  // Освещение
  const hemi = new THREE.HemisphereLight(0xaaddff, 0x445566, 1.5);
  lights.push(hemi);
  const dir = new THREE.DirectionalLight(0xddeeff, 1.8);
  dir.position.set(10, 20, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  dir.shadow.camera.far = 80;
  lights.push(dir);

  // Укрытия — ледяные блоки
  addCover(group, bodies, physics, iceMat, [
    { x: 5, y: 0.7, z: -12, w: 2.5, h: 1.4, d: 1.5 },
    { x: -8, y: 0.7, z: -18, w: 2, h: 1.4, d: 2 },
    { x: 12, y: 0.7, z: -30, w: 2.5, h: 1.4, d: 1.5 },
    { x: -5, y: 0.7, z: -35, w: 3, h: 1.4, d: 1 },
    { x: 8, y: 0.7, z: -48, w: 2, h: 1.4, d: 2 },
    { x: -12, y: 0.7, z: -55, w: 2.5, h: 1.4, d: 1.5 },
    { x: 0, y: 0.7, z: -62, w: 3, h: 1.4, d: 1 },
    { x: 15, y: 0.7, z: -68, w: 2, h: 1.4, d: 2 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0xc0d8f0, bgColor: 0xc0d8f0,
    enemies: [
      new THREE.Vector3(10, 2, -20), new THREE.Vector3(-10, 2, -25),
      new THREE.Vector3(15, 2, -40), new THREE.Vector3(-15, 2, -45),
      new THREE.Vector3(0, 2, -55), new THREE.Vector3(20, 2, -60),
      new THREE.Vector3(-20, 2, -70),
    ],
    turrets: [
      new THREE.Vector3(0, 1, -30),
      new THREE.Vector3(-15, 1, -50),
      new THREE.Vector3(15, 1, -65),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 3: ХРАМ ДЖЕДАЕВ
// =====================================================
export function createJediTemple(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd4c8a8, roughness: 0.8, metalness: 0.1 });
  const stoneFloor = new THREE.MeshStandardMaterial({ color: 0xc0b898, roughness: 0.6, metalness: 0.1 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.3, metalness: 0.1 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.2, metalness: 0.8 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8068, roughness: 0.9, metalness: 0.1 });

  // Пол
  const floor = new THREE.Mesh(new THREE.BoxGeometry(50, 0.5, 100), stoneFloor);
  floor.position.set(0, -0.25, -45);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -45), new THREE.Vector3(50, 0.5, 100)));

  // Стены
  const wallH = 15;
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, wallH, 100), stoneMat);
    wall.position.set(s * 25, wallH / 2, -45);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 25, wallH / 2, -45), new THREE.Vector3(1.5, wallH, 100)));
  }
  for (const z of [6, -96]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(51.5, wallH, 1.5), stoneMat);
    wall.position.set(0, wallH / 2, z);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, wallH / 2, z), new THREE.Vector3(51.5, wallH, 1.5)));
  }

  // Потолок (сводчатый)
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(52, 0.5, 102), darkStoneMat);
  ceiling.position.set(0, wallH, -45);
  group.add(ceiling);

  // Колонны (ряды по бокам)
  for (let i = 0; i < 8; i++) {
    for (const s of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, wallH - 1, 12), marbleMat);
      col.position.set(s * 18, wallH / 2, -5 - i * 12);
      col.castShadow = true;
      group.add(col);

      // Капитель
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.8, 12), goldMat);
      cap.position.set(s * 18, wallH - 0.9, -5 - i * 12);
      group.add(cap);

      // База
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12), marbleMat);
      base.position.set(s * 18, 0.25, -5 - i * 12);
      group.add(base);
    }
  }

  // Символ Джедаев на полу (круг в центре)
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.05, 24), goldMat);
  emblem.position.set(0, 0.03, -45);
  group.add(emblem);

  // Статуи джедаев
  for (let i = 0; i < 4; i++) {
    const s = i < 2 ? -1 : 1;
    const z = i % 2 === 0 ? -25 : -65;
    const statue = new THREE.Group();

    // Тело
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.6), marbleMat);
    body.position.y = 2.5;
    statue.add(body);
    // Голова
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), marbleMat);
    head.position.y = 4;
    statue.add(head);
    // Пьедестал
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.8), darkStoneMat);
    pedestal.position.y = 0.5;
    statue.add(pedestal);

    statue.position.set(s * 10, 0, z);
    group.add(statue);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 10, 1.5, z), new THREE.Vector3(2, 5, 2)));
  }

  // Освещение — тёплое, торжественное
  const hemi = new THREE.HemisphereLight(0xffeedd, 0x554433, 1.2);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0xfff0d0, 0.5);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xffe8cc, 1.5);
  dir.position.set(0, 14, -30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -30; dir.shadow.camera.right = 30;
  dir.shadow.camera.top = 50; dir.shadow.camera.bottom = -50;
  dir.shadow.camera.far = 60;
  lights.push(dir);

  // Укрытия — каменные баррикады
  addCover(group, bodies, physics, darkStoneMat, [
    { x: 5, y: 0.6, z: -10, w: 2.5, h: 1.2, d: 1.2 },
    { x: -6, y: 0.6, z: -18, w: 2, h: 1.2, d: 1.5 },
    { x: 8, y: 0.6, z: -28, w: 2.5, h: 1.2, d: 1 },
    { x: -4, y: 0.6, z: -35, w: 3, h: 1.2, d: 1.2 },
    { x: 6, y: 0.6, z: -48, w: 2, h: 1.2, d: 1.5 },
    { x: -7, y: 0.6, z: -55, w: 2.5, h: 1.2, d: 1 },
    { x: 0, y: 0.6, z: -65, w: 3, h: 1.2, d: 1.2 },
    { x: 8, y: 0.6, z: -75, w: 2, h: 1.2, d: 1.5 },
    { x: -5, y: 0.6, z: -85, w: 2.5, h: 1.2, d: 1 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x554433, bgColor: 0x554433,
    enemies: [
      new THREE.Vector3(8, 2, -15), new THREE.Vector3(-8, 2, -20),
      new THREE.Vector3(12, 2, -35), new THREE.Vector3(-12, 2, -40),
      new THREE.Vector3(5, 2, -55), new THREE.Vector3(-5, 2, -60),
      new THREE.Vector3(10, 2, -70), new THREE.Vector3(-10, 2, -80),
      new THREE.Vector3(0, 2, -90),
    ],
    turrets: [
      new THREE.Vector3(0, 1, -45),
      new THREE.Vector3(-8, 1, -75),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 4: ЗАВОД ДРОИДОВ
// =====================================================
export function createDroidFactory(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const metalFloor = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.4, metalness: 0.7 });
  const metalWall = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.3, metalness: 0.6 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.3, metalness: 0.8 });
  const warnMat = new THREE.MeshStandardMaterial({ color: 0xcc8800, roughness: 0.5, metalness: 0.3 });
  const conveyorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

  // Пол
  const floor = new THREE.Mesh(new THREE.BoxGeometry(80, 0.5, 120), metalFloor);
  floor.position.set(0, -0.25, -55);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -55), new THREE.Vector3(80, 0.5, 120)));

  // Стены
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 120), metalWall);
    wall.position.set(s * 40, 5, -55);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 40, 5, -55), new THREE.Vector3(1, 10, 120)));
  }
  for (const z of [6, -116]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(81, 10, 1), metalWall);
    wall.position.set(0, 5, z);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 5, z), new THREE.Vector3(81, 10, 1)));
  }

  // Потолок
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(82, 0.5, 122), metalWall);
  ceil.position.set(0, 10, -55);
  group.add(ceil);

  // Конвейерные ленты (длинные платформы)
  for (let i = 0; i < 3; i++) {
    const cx = -20 + i * 20;
    const conv = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 60), conveyorMat);
    conv.position.set(cx, 0.4, -50);
    group.add(conv);
    bodies.push(physics.createStaticBox(new THREE.Vector3(cx, 0.4, -50), new THREE.Vector3(4, 0.8, 60)));

    // Полоски на конвейере
    for (let j = 0; j < 12; j++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 0.3), warnMat);
      stripe.position.set(cx, 0.82, -25 - j * 5);
      group.add(stripe);
    }
  }

  // Трубы на потолке
  for (let i = 0; i < 6; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 82, 8), pipeMat);
    pipe.position.set(0, 9, -10 - i * 18);
    pipe.rotation.z = Math.PI / 2;
    group.add(pipe);
  }

  // Механические руки-манипуляторы (декорация)
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), pipeMat);
      arm.position.set(s * 12, 7.5, -20 - i * 18);
      group.add(arm);

      const claw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), pipeMat);
      claw.position.set(s * 12, 6, -20 - i * 18);
      group.add(claw);
    }
  }

  // Контейнеры / ящики (укрытия)
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 20);
    const z = -15 - i * 12;
    const box = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), warnMat);
    box.position.set(x, 1, z);
    box.castShadow = true;
    group.add(box);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, 1, z), new THREE.Vector3(3, 2, 3)));
  }

  // Светящиеся элементы
  for (let i = 0; i < 10; i++) {
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), glowMat);
    glow.position.set((Math.random() - 0.5) * 60, 0.1, -10 - Math.random() * 100);
    group.add(glow);
  }

  // Освещение — индустриальное
  const hemi = new THREE.HemisphereLight(0x887766, 0x332211, 0.8);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0xff8844, 0.3);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xffaa66, 1.2);
  dir.position.set(5, 9, -30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -40; dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  dir.shadow.camera.far = 80;
  lights.push(dir);

  // Оранжевые точечные огни вдоль конвейеров
  for (let i = 0; i < 4; i++) {
    const pl = new THREE.PointLight(0xff6600, 2, 20);
    pl.position.set(0, 6, -20 - i * 25);
    lights.push(pl);
  }

  // Укрытия — металлические баррикады
  addCover(group, bodies, physics, metalWall, [
    { x: 8, y: 0.7, z: -10, w: 2.5, h: 1.4, d: 1.2 },
    { x: -10, y: 0.7, z: -18, w: 2, h: 1.4, d: 1.5 },
    { x: 6, y: 0.7, z: -32, w: 3, h: 1.4, d: 1 },
    { x: -8, y: 0.7, z: -42, w: 2.5, h: 1.4, d: 1.2 },
    { x: 12, y: 0.7, z: -52, w: 2, h: 1.4, d: 1.5 },
    { x: -6, y: 0.7, z: -60, w: 3, h: 1.4, d: 1 },
    { x: 10, y: 0.7, z: -70, w: 2.5, h: 1.4, d: 1.2 },
    { x: -12, y: 0.7, z: -80, w: 2, h: 1.4, d: 1.5 },
    { x: 5, y: 0.7, z: -90, w: 3, h: 1.4, d: 1.2 },
    { x: -8, y: 0.7, z: -100, w: 2.5, h: 1.4, d: 1 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x221a10, bgColor: 0x221a10,
    enemies: [
      new THREE.Vector3(10, 2, -15), new THREE.Vector3(-10, 2, -20),
      new THREE.Vector3(20, 2, -30), new THREE.Vector3(-20, 2, -35),
      new THREE.Vector3(5, 2, -45), new THREE.Vector3(-5, 2, -50),
      new THREE.Vector3(15, 2, -60), new THREE.Vector3(-15, 2, -65),
      new THREE.Vector3(10, 2, -75), new THREE.Vector3(-10, 2, -85),
      new THREE.Vector3(0, 2, -95), new THREE.Vector3(20, 2, -100),
    ],
    turrets: [
      new THREE.Vector3(0, 1, -25),
      new THREE.Vector3(-15, 1, -40),
      new THREE.Vector3(15, 1, -55),
      new THREE.Vector3(-15, 1, -75),
      new THREE.Vector3(15, 1, -95),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 5: ГОРНЫЙ РЕСТОРАН
// =====================================================
export function createMountainRestaurant(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const woodFloor = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8, metalness: 0.0 });
  const woodWall = new THREE.MeshStandardMaterial({ color: 0x6b4e1a, roughness: 0.9, metalness: 0.0 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.0, metalness: 0.3, transparent: true, opacity: 0.3 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x7a5c2e, roughness: 0.7, metalness: 0.0 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x993333, roughness: 0.8, metalness: 0.0 });
  const metalTrim = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });

  // Пол
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 60), woodFloor);
  floor.position.set(0, -0.25, -25);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -25), new THREE.Vector3(40, 0.5, 60)));

  // Стены
  for (const s of [-1, 1]) {
    // Стена с окнами — нижняя часть
    const wallLow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 60), woodWall);
    wallLow.position.set(s * 20, 1, -25);
    group.add(wallLow);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 20, 1, -25), new THREE.Vector3(0.5, 2, 60)));

    // Стекло (панорамные окна)
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 55), glassMat);
    glass.position.set(s * 20, 4, -25);
    group.add(glass);

    // Верхняя часть
    const wallHi = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 60), woodWall);
    wallHi.position.set(s * 20, 7, -25);
    group.add(wallHi);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 20, 5, -25), new THREE.Vector3(0.5, 6, 60)));
  }

  for (const z of [6, -56]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(41, 8, 0.5), woodWall);
    wall.position.set(0, 4, z);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 4, z), new THREE.Vector3(41, 8, 0.5)));
  }

  // Потолок (деревянные балки)
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(42, 0.4, 62), woodWall);
  ceiling.position.set(0, 8, -25);
  group.add(ceiling);

  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(42, 0.5, 0.5), tableMat);
    beam.position.set(0, 7.8, -5 - i * 10);
    group.add(beam);
  }

  // Столы и стулья
  for (let row = 0; row < 4; row++) {
    for (const s of [-1, 1]) {
      const tx = s * 8;
      const tz = -8 - row * 13;

      // Стол
      const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2), tableMat);
      top.position.set(tx, 1.0, tz);
      group.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), metalTrim);
      leg.position.set(tx, 0.5, tz);
      group.add(leg);
      bodies.push(physics.createStaticBox(new THREE.Vector3(tx, 0.5, tz), new THREE.Vector3(3, 1.2, 2)));

      // 2 стула
      for (const cs of [-1, 1]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), seatMat);
        seat.position.set(tx + cs * 1.8, 0.6, tz);
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), seatMat);
        back.position.set(tx + cs * 1.8, 1, tz + cs * 0.3);
        group.add(back);
      }
    }
  }

  // Барная стойка у задней стены
  const bar = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 1.5), tableMat);
  bar.position.set(0, 0.6, -52);
  group.add(bar);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, 0.6, -52), new THREE.Vector3(15, 1.2, 1.5)));

  // Горы за окнами (декорация)
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.9 });
  const snowPeakMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const mx = -30 + i * 15;
    const mz = -25;
    const mh = 15 + Math.random() * 10;
    const mt = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 4, mh, 5), mountainMat);
    mt.position.set(mx, mh / 2 - 2, mz - 25);
    group.add(mt);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 5), snowPeakMat);
    snow.position.set(mx, mh - 3, mz - 25);
    group.add(snow);
  }

  // Освещение — тёплое, уютное
  const hemi = new THREE.HemisphereLight(0xffeedd, 0x443322, 1.0);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0xffddaa, 0.6);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xffe0b0, 1.3);
  dir.position.set(-5, 12, -10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -25; dir.shadow.camera.right = 25;
  dir.shadow.camera.top = 35; dir.shadow.camera.bottom = -35;
  dir.shadow.camera.far = 50;
  lights.push(dir);

  // Настольные лампы
  for (let i = 0; i < 3; i++) {
    const pl = new THREE.PointLight(0xffaa44, 1.5, 15);
    pl.position.set(0, 3, -10 - i * 16);
    lights.push(pl);
  }

  // Укрытия — перевёрнутые столы (деревянные)
  addCover(group, bodies, physics, tableMat, [
    { x: 0, y: 0.5, z: -8, w: 2, h: 1, d: 1.2 },
    { x: -6, y: 0.5, z: -15, w: 2.5, h: 1, d: 1 },
    { x: 5, y: 0.5, z: -22, w: 2, h: 1, d: 1.2 },
    { x: -3, y: 0.5, z: -28, w: 2.5, h: 1, d: 1 },
    { x: 7, y: 0.5, z: -35, w: 2, h: 1, d: 1.2 },
    { x: -7, y: 0.5, z: -42, w: 2.5, h: 1, d: 1 },
    { x: 3, y: 0.5, z: -48, w: 2, h: 1, d: 1.2 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 2),
    fogColor: 0x443322, bgColor: 0x667788,
    enemies: [
      new THREE.Vector3(8, 2, -10), new THREE.Vector3(-8, 2, -12),
      new THREE.Vector3(12, 2, -22), new THREE.Vector3(-12, 2, -25),
      new THREE.Vector3(5, 2, -32), new THREE.Vector3(-5, 2, -35),
      new THREE.Vector3(8, 2, -40), new THREE.Vector3(-8, 2, -42),
      new THREE.Vector3(0, 2, -48), new THREE.Vector3(10, 2, -50),
      new THREE.Vector3(-10, 2, -52), new THREE.Vector3(3, 2, -18),
      new THREE.Vector3(-3, 2, -28), new THREE.Vector3(15, 2, -45),
      new THREE.Vector3(-15, 2, -38),
    ],
    turrets: [
      new THREE.Vector3(5, 1, -20),
      new THREE.Vector3(-5, 1, -45),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 6: КЛАДБИЩЕ ДЖЕДАЕВ
// =====================================================
export function createJediCemetery(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.95, metalness: 0.0 });
  const graveMat = new THREE.MeshStandardMaterial({ color: 0x666a60, roughness: 0.8, metalness: 0.1 });
  const darkGrave = new THREE.MeshStandardMaterial({ color: 0x4a4e48, roughness: 0.7, metalness: 0.15 });
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9, metalness: 0.0 });
  const glowGreen = new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.4 });
  const fogGreen = new THREE.MeshBasicMaterial({ color: 0x225533, transparent: true, opacity: 0.15 });

  // Пол — тёмная земля
  const floor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.5, 120), dirtMat);
  floor.position.set(0, -0.25, -55);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -55), new THREE.Vector3(100, 0.5, 120)));

  // Стены (невидимые)
  for (const s of [-1, 1]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 48, 4, -55), new THREE.Vector3(1, 8, 120)));
  }
  for (const z of [6, -116]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 4, z), new THREE.Vector3(98, 8, 1)));
  }

  // Надгробия (много рядов)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const x = -25 + col * 10 + (Math.random() - 0.5) * 3;
      const z = -10 - row * 13 + (Math.random() - 0.5) * 3;
      const h = 1.2 + Math.random() * 0.8;

      const grave = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, h, 0.3),
        Math.random() > 0.5 ? graveMat : darkGrave
      );
      grave.position.set(x, h / 2, z);
      grave.rotation.y = (Math.random() - 0.5) * 0.3;
      grave.rotation.z = (Math.random() - 0.5) * 0.1;
      grave.castShadow = true;
      group.add(grave);
      bodies.push(physics.createStaticBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(1, h, 0.5)));
    }
  }

  // Мёртвые деревья
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = -5 - Math.random() * 105;
    const tH = 5 + Math.random() * 4;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, tH, 5), treeMat);
    trunk.position.set(x, tH / 2, z);
    group.add(trunk);

    // Ветки (голые)
    for (let b = 0; b < 3; b++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 2 + Math.random(), 4), treeMat);
      branch.position.set(x + (Math.random() - 0.5) * 1.5, tH * 0.6 + b * 0.8, z + (Math.random() - 0.5) * 1.5);
      branch.rotation.z = (Math.random() - 0.5) * 1.2;
      branch.rotation.x = (Math.random() - 0.5) * 0.5;
      group.add(branch);
    }
  }

  // Зелёное свечение из-под земли (возле некоторых могил)
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 50;
    const z = -15 - Math.random() * 80;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), glowGreen);
    glow.position.set(x, 0.1, z);
    group.add(glow);
  }

  // Туманные облака (плоские прозрачные квады)
  for (let i = 0; i < 15; i++) {
    const fogPatch = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 6, 0.1, 8 + Math.random() * 6), fogGreen);
    fogPatch.position.set((Math.random() - 0.5) * 70, 0.3 + Math.random() * 0.5, -10 - Math.random() * 100);
    group.add(fogPatch);
  }

  // Освещение — мрачное, зеленоватое
  const hemi = new THREE.HemisphereLight(0x223322, 0x111108, 0.6);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0x334433, 0.4);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0x88aa88, 0.8);
  dir.position.set(-5, 10, -20);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -50; dir.shadow.camera.right = 50;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  dir.shadow.camera.far = 80;
  lights.push(dir);

  // Зелёные точечные огни
  for (let i = 0; i < 5; i++) {
    const pl = new THREE.PointLight(0x33ff55, 1.5, 25);
    pl.position.set((Math.random() - 0.5) * 40, 1, -15 - i * 20);
    lights.push(pl);
  }

  // Укрытия — каменные саркофаги
  addCover(group, bodies, physics, darkGrave, [
    { x: 5, y: 0.6, z: -12, w: 2.5, h: 1.2, d: 1.5 },
    { x: -8, y: 0.6, z: -22, w: 2, h: 1.2, d: 2 },
    { x: 12, y: 0.6, z: -30, w: 3, h: 1.2, d: 1.2 },
    { x: -6, y: 0.6, z: -42, w: 2.5, h: 1.2, d: 1.5 },
    { x: 10, y: 0.6, z: -50, w: 2, h: 1.2, d: 2 },
    { x: -12, y: 0.6, z: -58, w: 3, h: 1.2, d: 1 },
    { x: 0, y: 0.6, z: -68, w: 2.5, h: 1.2, d: 1.5 },
    { x: 8, y: 0.6, z: -78, w: 2, h: 1.2, d: 2 },
    { x: -10, y: 0.6, z: -88, w: 3, h: 1.2, d: 1.2 },
    { x: 5, y: 0.6, z: -100, w: 2.5, h: 1.2, d: 1.5 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x112211, bgColor: 0x112211,
    enemies: [
      new THREE.Vector3(10, 2, -15), new THREE.Vector3(-10, 2, -18),
      new THREE.Vector3(20, 2, -25), new THREE.Vector3(-20, 2, -28),
      new THREE.Vector3(5, 2, -35), new THREE.Vector3(-5, 2, -40),
      new THREE.Vector3(15, 2, -48), new THREE.Vector3(-15, 2, -52),
      new THREE.Vector3(8, 2, -60), new THREE.Vector3(-8, 2, -65),
      new THREE.Vector3(20, 2, -72), new THREE.Vector3(-20, 2, -75),
      new THREE.Vector3(0, 2, -80), new THREE.Vector3(12, 2, -88),
      new THREE.Vector3(-12, 2, -92), new THREE.Vector3(5, 2, -98),
      new THREE.Vector3(-5, 2, -105), new THREE.Vector3(0, 2, -110),
    ],
    turrets: [
      new THREE.Vector3(10, 1, -20),
      new THREE.Vector3(-10, 1, -45),
      new THREE.Vector3(15, 1, -70),
      new THREE.Vector3(-15, 1, -95),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 7: ЗАБРОШЕННЫЙ ГОРОД
// =====================================================
export function createAbandonedCity(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x666660, roughness: 0.85, metalness: 0.1 });
  const brokenMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.9, metalness: 0.1 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x8a5533, roughness: 0.8, metalness: 0.3 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.9, metalness: 0.05 });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.1, metalness: 0.5 });

  // Дорога (пол)
  const road = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 140), roadMat);
  road.position.set(0, -0.15, -65);
  road.receiveShadow = true;
  group.add(road);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.15, -65), new THREE.Vector3(20, 0.3, 140)));

  // Тротуары
  for (const s of [-1, 1]) {
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 140), concreteMat);
    sidewalk.position.set(s * 17.5, -0.05, -65);
    sidewalk.receiveShadow = true;
    group.add(sidewalk);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 17.5, -0.05, -65), new THREE.Vector3(15, 0.5, 140)));
  }

  // Разрушенные здания по бокам
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const bx = s * 28;
      const bz = -5 - i * 22;
      const bw = 10 + Math.random() * 5;
      const bh = 6 + Math.random() * 12;
      const bd = 10 + Math.random() * 5;

      // Основание здания
      const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), concreteMat);
      building.position.set(bx, bh / 2, bz);
      building.castShadow = true;
      group.add(building);
      bodies.push(physics.createStaticBox(new THREE.Vector3(bx, bh / 2, bz), new THREE.Vector3(bw, bh, bd)));

      // Окна (тёмные)
      for (let wy = 0; wy < Math.floor(bh / 3); wy++) {
        for (let wz = 0; wz < 2; wz++) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1.2), darkGlass);
          win.position.set(bx - s * bw / 2 - s * 0.05, 2 + wy * 3, bz - 2.5 + wz * 5);
          group.add(win);
        }
      }

      // Разрушенная верхушка (случайные блоки)
      if (Math.random() > 0.4) {
        const rubble = new THREE.Mesh(
          new THREE.BoxGeometry(bw * 0.6, bh * 0.2, bd * 0.5),
          brokenMat
        );
        rubble.position.set(bx + (Math.random() - 0.5) * 3, bh + 0.5, bz);
        rubble.rotation.set(Math.random() * 0.3, 0, Math.random() * 0.3);
        group.add(rubble);
      }
    }
  }

  // Обломки на дороге (укрытия)
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 18;
    const z = -10 - Math.random() * 110;
    const rw = 1 + Math.random() * 2;
    const rh = 0.5 + Math.random() * 1.5;
    const rubble = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rw), brokenMat);
    rubble.position.set(x, rh / 2, z);
    rubble.rotation.y = Math.random() * Math.PI;
    group.add(rubble);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, rh / 2, z), new THREE.Vector3(rw, rh, rw)));
  }

  // Ржавые машины
  for (let i = 0; i < 4; i++) {
    const cx = (i % 2 === 0 ? -1 : 1) * (5 + Math.random() * 3);
    const cz = -15 - i * 28;
    const car = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 5), rustMat);
    carBody.position.y = 0.8;
    car.add(carBody);
    const carTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.5), rustMat);
    carTop.position.set(0, 1.6, -0.3);
    car.add(carTop);
    car.position.set(cx, 0, cz);
    car.rotation.y = (Math.random() - 0.5) * 0.5;
    group.add(car);
    bodies.push(physics.createStaticBox(new THREE.Vector3(cx, 0.8, cz), new THREE.Vector3(2.5, 2, 5)));
  }

  // Невидимые стены (края карты)
  for (const s of [-1, 1]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 38, 5, -65), new THREE.Vector3(1, 10, 140)));
  }
  for (const z of [6, -136]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 5, z), new THREE.Vector3(78, 10, 1)));
  }

  // Освещение — серое, мрачное
  const hemi = new THREE.HemisphereLight(0x667788, 0x333344, 0.8);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0x556677, 0.3);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xaabbcc, 1.0);
  dir.position.set(10, 15, -30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -40; dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 70; dir.shadow.camera.bottom = -70;
  dir.shadow.camera.far = 100;
  lights.push(dir);

  // Укрытия — бетонные блоки обломков
  addCover(group, bodies, physics, brokenMat, [
    { x: 3, y: 0.7, z: -15, w: 2.5, h: 1.4, d: 1.5 },
    { x: -4, y: 0.7, z: -25, w: 2, h: 1.4, d: 2 },
    { x: 5, y: 0.7, z: -38, w: 3, h: 1.4, d: 1.2 },
    { x: -3, y: 0.7, z: -48, w: 2.5, h: 1.4, d: 1.5 },
    { x: 4, y: 0.7, z: -58, w: 2, h: 1.4, d: 2 },
    { x: -5, y: 0.7, z: -68, w: 3, h: 1.4, d: 1 },
    { x: 3, y: 0.7, z: -78, w: 2.5, h: 1.4, d: 1.5 },
    { x: -4, y: 0.7, z: -88, w: 2, h: 1.4, d: 2 },
    { x: 5, y: 0.7, z: -100, w: 3, h: 1.4, d: 1.2 },
    { x: -3, y: 0.7, z: -112, w: 2.5, h: 1.4, d: 1.5 },
    { x: 0, y: 0.7, z: -122, w: 2, h: 1.4, d: 2 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x445566, bgColor: 0x445566,
    enemies: [
      new THREE.Vector3(5, 2, -12), new THREE.Vector3(-5, 2, -18),
      new THREE.Vector3(8, 2, -28), new THREE.Vector3(-8, 2, -32),
      new THREE.Vector3(3, 2, -42), new THREE.Vector3(-3, 2, -48),
      new THREE.Vector3(7, 2, -55), new THREE.Vector3(-7, 2, -60),
      new THREE.Vector3(5, 2, -68), new THREE.Vector3(-5, 2, -72),
      new THREE.Vector3(8, 2, -80), new THREE.Vector3(-8, 2, -85),
      new THREE.Vector3(3, 2, -92), new THREE.Vector3(-3, 2, -98),
      new THREE.Vector3(6, 2, -105), new THREE.Vector3(-6, 2, -108),
      new THREE.Vector3(4, 2, -115), new THREE.Vector3(-4, 2, -118),
      new THREE.Vector3(0, 2, -125), new THREE.Vector3(8, 2, -128),
      new THREE.Vector3(-8, 2, -130),
    ],
    turrets: [
      new THREE.Vector3(5, 1, -25),
      new THREE.Vector3(-5, 1, -50),
      new THREE.Vector3(3, 1, -75),
      new THREE.Vector3(-3, 1, -100),
      new THREE.Vector3(0, 1, -120),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 8: ШАХТА НА САТУРНЕ
// =====================================================
export function createSaturnMine(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.95, metalness: 0.1 });
  const darkRock = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9, metalness: 0.1 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, roughness: 0.1, metalness: 0.5, emissive: 0x114466, emissiveIntensity: 0.5 });
  const crystalOrange = new THREE.MeshStandardMaterial({ color: 0xffaa33, roughness: 0.1, metalness: 0.5, emissive: 0x663300, emissiveIntensity: 0.5 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.4, metalness: 0.7 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x666660, roughness: 0.5, metalness: 0.6 });

  // Пол — каменный
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 130), darkRock);
  floor.position.set(0, -0.25, -60);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -60), new THREE.Vector3(30, 0.5, 130)));

  // Стены туннеля (скалистые)
  for (const s of [-1, 1]) {
    // Основная стена
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 130), rockMat);
    wall.position.set(s * 16.5, 4, -60);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 16.5, 4, -60), new THREE.Vector3(3, 8, 130)));

    // Неровности стен
    for (let i = 0; i < 15; i++) {
      const bump = new THREE.Mesh(
        new THREE.BoxGeometry(1 + Math.random(), 1.5 + Math.random() * 2, 2 + Math.random() * 3),
        Math.random() > 0.5 ? rockMat : darkRock
      );
      bump.position.set(s * 14.5, 1 + Math.random() * 5, -5 - i * 8.5);
      group.add(bump);
    }
  }

  // Потолок (неровный)
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(36, 2, 132), darkRock);
  ceil.position.set(0, 9, -60);
  group.add(ceil);

  for (const z of [6, -126]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(36, 10, 2), rockMat);
    wall.position.set(0, 5, z);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 5, z), new THREE.Vector3(36, 10, 2)));
  }

  // Кристаллы (светящиеся)
  for (let i = 0; i < 12; i++) {
    const s = Math.random() > 0.5 ? -1 : 1;
    const x = s * (12 + Math.random() * 3);
    const z = -5 - Math.random() * 115;
    const h = 1 + Math.random() * 2;
    const mat = Math.random() > 0.5 ? crystalMat : crystalOrange;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.3, h, 5), mat);
    crystal.position.set(x, h / 2, z);
    crystal.rotation.z = (Math.random() - 0.5) * 0.5;
    group.add(crystal);
  }

  // Рельсы для вагонеток
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 120), railMat);
    rail.position.set(s * 1.5, 0.05, -55);
    group.add(rail);
  }
  // Шпалы
  for (let i = 0; i < 40; i++) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 0.3), railMat);
    tie.position.set(0, 0.02, -5 - i * 3);
    group.add(tie);
  }

  // Вагонетки (укрытия)
  for (let i = 0; i < 3; i++) {
    const cz = -15 - i * 35;
    const cart = new THREE.Group();
    const bin = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 4), metalMat);
    bin.position.y = 1;
    cart.add(bin);
    for (let w = 0; w < 4; w++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), metalMat);
      wheel.position.set(w < 2 ? -1.2 : 1.2, 0.3, w % 2 === 0 ? 1.2 : -1.2);
      wheel.rotation.z = Math.PI / 2;
      cart.add(wheel);
    }
    cart.position.set(0, 0, cz);
    group.add(cart);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 1, cz), new THREE.Vector3(3, 1.5, 4)));
  }

  // Ящики с рудой
  for (let i = 0; i < 6; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (6 + Math.random() * 5);
    const z = -8 - i * 18;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), metalMat);
    crate.position.set(x, 0.75, z);
    group.add(crate);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, 0.75, z), new THREE.Vector3(2, 1.5, 2)));
  }

  // Опоры потолка
  for (let i = 0; i < 10; i++) {
    for (const s of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), metalMat);
      support.position.set(s * 12, 4, -5 - i * 13);
      group.add(support);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 0.5), metalMat);
    beam.position.set(0, 7.8, -5 - i * 13);
    group.add(beam);
  }

  // Освещение — тёмное, с оранжевым и голубым
  const hemi = new THREE.HemisphereLight(0x443322, 0x111108, 0.4);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0x332211, 0.3);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xffaa55, 0.6);
  dir.position.set(0, 8, -30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
  dir.shadow.camera.top = 65; dir.shadow.camera.bottom = -65;
  dir.shadow.camera.far = 80;
  lights.push(dir);

  for (let i = 0; i < 8; i++) {
    const color = i % 2 === 0 ? 0xff8833 : 0x44bbff;
    const pl = new THREE.PointLight(color, 2.0, 20);
    pl.position.set((Math.random() - 0.5) * 10, 4, -8 - i * 15);
    lights.push(pl);
  }

  // Укрытия — рудные ящики
  addCover(group, bodies, physics, metalMat, [
    { x: 6, y: 0.7, z: -8, w: 2.5, h: 1.4, d: 1.5 },
    { x: -5, y: 0.7, z: -18, w: 2, h: 1.4, d: 2 },
    { x: 7, y: 0.7, z: -28, w: 2.5, h: 1.4, d: 1.2 },
    { x: -6, y: 0.7, z: -38, w: 3, h: 1.4, d: 1 },
    { x: 5, y: 0.7, z: -48, w: 2, h: 1.4, d: 1.5 },
    { x: -7, y: 0.7, z: -58, w: 2.5, h: 1.4, d: 1.2 },
    { x: 4, y: 0.7, z: -68, w: 3, h: 1.4, d: 1 },
    { x: -5, y: 0.7, z: -78, w: 2, h: 1.4, d: 2 },
    { x: 6, y: 0.7, z: -88, w: 2.5, h: 1.4, d: 1.5 },
    { x: -4, y: 0.7, z: -98, w: 3, h: 1.4, d: 1.2 },
    { x: 5, y: 0.7, z: -108, w: 2, h: 1.4, d: 1.5 },
    { x: -5, y: 0.7, z: -118, w: 2.5, h: 1.4, d: 1 },
  ]);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x1a1108, bgColor: 0x1a1108,
    enemies: [
      new THREE.Vector3(5, 2, -10), new THREE.Vector3(-5, 2, -15),
      new THREE.Vector3(8, 2, -22), new THREE.Vector3(-8, 2, -28),
      new THREE.Vector3(3, 2, -35), new THREE.Vector3(-3, 2, -40),
      new THREE.Vector3(6, 2, -48), new THREE.Vector3(-6, 2, -52),
      new THREE.Vector3(4, 2, -58), new THREE.Vector3(-4, 2, -62),
      new THREE.Vector3(7, 2, -70), new THREE.Vector3(-7, 2, -75),
      new THREE.Vector3(5, 2, -80), new THREE.Vector3(-5, 2, -85),
      new THREE.Vector3(3, 2, -90), new THREE.Vector3(-3, 2, -95),
      new THREE.Vector3(6, 2, -100), new THREE.Vector3(-6, 2, -105),
      new THREE.Vector3(4, 2, -110), new THREE.Vector3(-4, 2, -115),
      new THREE.Vector3(0, 2, -120), new THREE.Vector3(8, 2, -65),
      new THREE.Vector3(-8, 2, -45), new THREE.Vector3(2, 2, -55),
      new THREE.Vector3(-2, 2, -88), new THREE.Vector3(5, 2, -108),
      new THREE.Vector3(-5, 2, -118), new THREE.Vector3(0, 2, -50),
    ],
    turrets: [
      new THREE.Vector3(5, 1, -30),
      new THREE.Vector3(-5, 1, -55),
      new THREE.Vector3(4, 1, -80),
      new THREE.Vector3(-4, 1, -110),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 9: ПУСТЫННАЯ ПЛАНЕТА
// =====================================================
export function createDesertPlanet(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  // Материалы
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.9, metalness: 0.0 });
  const darkSandMat = new THREE.MeshStandardMaterial({ color: 0xb89858, roughness: 0.85, metalness: 0.0 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 0.8, metalness: 0.1 });
  const ruinMat = new THREE.MeshStandardMaterial({ color: 0xc0a878, roughness: 0.7, metalness: 0.1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.5, metalness: 0.5 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a5533, roughness: 0.8, metalness: 0.3 });
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.95, metalness: 0.0 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xddd8c8, roughness: 0.7, metalness: 0.05 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
  const fabricDarkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 });
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.8, metalness: 0.0 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.4, metalness: 0.7 });
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 1.0, metalness: 0.0 });
  const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
  const glowGreenMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5 });

  // === ПОЛ — песчаная равнина ===
  const floor = new THREE.Mesh(new THREE.BoxGeometry(130, 0.5, 130), sandMat);
  floor.position.set(0, -0.25, -55);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -55), new THREE.Vector3(130, 0.5, 130)));

  // Невидимые стены
  for (const s of [-1, 1]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 58, 4, -55), new THREE.Vector3(1, 8, 130)));
  }
  for (const z of [10, -120]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 4, z), new THREE.Vector3(118, 8, 1)));
  }

  // === ПЕСЧАНЫЕ ДЮНЫ ===
  for (let i = 0; i < 14; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = -10 - Math.random() * 100;
    const r = 3 + Math.random() * 7;
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), darkSandMat
    );
    dune.position.set(x, 0, z);
    group.add(dune);
    if (r > 5) {
      bodies.push(physics.createStaticBox(new THREE.Vector3(x, 1, z), new THREE.Vector3(r, 2, r)));
    }
  }

  // === СКАЛЬНЫЕ ФОРМАЦИИ (арки и столбы) ===
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = -12 - Math.random() * 95;
    const h = 3 + Math.random() * 6;
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(2 + Math.random() * 3, h, 2 + Math.random() * 3), rockMat
    );
    rock.position.set(x, h / 2, z);
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    group.add(rock);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(5, h, 5)));
  }
  // Каменная арка
  const archX = -30, archZ = -50;
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), rockMat);
    pillar.position.set(archX + s * 4, 3, archZ);
    pillar.castShadow = true;
    group.add(pillar);
    bodies.push(physics.createStaticBox(new THREE.Vector3(archX + s * 4, 3, archZ), new THREE.Vector3(1.5, 6, 1.5)));
  }
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 2), rockMat);
  archTop.position.set(archX, 6.5, archZ);
  archTop.castShadow = true;
  group.add(archTop);

  // === РУИНЫ ДРЕВНЕГО ХРАМА (расширенные) ===
  const ruinX = 0, ruinZ = -55;
  // Стены руин
  for (const s of [-1, 1]) {
    const rWall = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 14), ruinMat);
    rWall.position.set(s * 8 + ruinX, 2, ruinZ);
    rWall.castShadow = true;
    group.add(rWall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 8 + ruinX, 2, ruinZ), new THREE.Vector3(1, 4, 14)));
  }
  // Задняя стена (частично разрушена)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 1), ruinMat);
  backWall.position.set(ruinX, 1.5, ruinZ - 7);
  backWall.castShadow = true;
  group.add(backWall);
  bodies.push(physics.createStaticBox(new THREE.Vector3(ruinX, 1.5, ruinZ - 7), new THREE.Vector3(14, 3, 1)));

  // Колонны (стоящие и обломки)
  for (let i = 0; i < 4; i++) {
    const cx = ruinX + (i - 1.5) * 4;
    const standing = i % 2 === 0;
    if (standing) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4, 8), ruinMat);
      col.position.set(cx, 2, ruinZ + 7);
      col.castShadow = true;
      group.add(col);
      // Капитель
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.4, 8), ruinMat);
      cap.position.set(cx, 4.2, ruinZ + 7);
      group.add(cap);
    } else {
      // Упавшая
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), ruinMat);
      fallen.position.set(cx + 1, 0.4, ruinZ + 8);
      fallen.rotation.z = Math.PI / 2;
      fallen.rotation.y = 0.3;
      group.add(fallen);
      bodies.push(physics.createStaticBox(new THREE.Vector3(cx + 1, 0.4, ruinZ + 8), new THREE.Vector3(4, 0.8, 1)));
    }
  }
  // Алтарь внутри руин
  const altar = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.5), rockMat);
  altar.position.set(ruinX, 0.5, ruinZ - 4);
  altar.castShadow = true;
  group.add(altar);
  bodies.push(physics.createStaticBox(new THREE.Vector3(ruinX, 0.5, ruinZ - 4), new THREE.Vector3(2, 1, 1.5)));
  // Светящийся артефакт на алтаре
  const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), glowGreenMat);
  artifact.position.set(ruinX, 1.2, ruinZ - 4);
  group.add(artifact);
  const artifactLight = new THREE.PointLight(0x44ff44, 1, 8);
  artifactLight.position.set(ruinX, 1.5, ruinZ - 4);
  lights.push(artifactLight);

  // === ПОСЕЛЕНИЕ (палатки и глиняные домики) ===
  const townX = 25, townZ = -30;
  // Глиняные домики
  for (let i = 0; i < 3; i++) {
    const hx = townX + (i - 1) * 10;
    const hz = townZ - i * 5;
    const hw = 4 + Math.random() * 2;
    const hh = 3 + Math.random();
    const hd = 4 + Math.random() * 2;

    const house = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), clayMat);
    house.position.set(hx, hh / 2, hz);
    house.castShadow = true;
    group.add(house);
    bodies.push(physics.createStaticBox(new THREE.Vector3(hx, hh / 2, hz), new THREE.Vector3(hw, hh, hd)));

    // Дверной проём
    const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 }));
    door.position.set(hx, 1, hz + hd / 2 + 0.1);
    group.add(door);

    // Купол на крыше
    const dome = new THREE.Mesh(new THREE.SphereGeometry(hw * 0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), clayMat);
    dome.position.set(hx, hh, hz);
    group.add(dome);
  }

  // Палатки
  for (let i = 0; i < 4; i++) {
    const tx = townX - 8 + i * 6;
    const tz = townZ + 8;
    const tent = new THREE.Group();

    // Каркас (столб)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), rustMat);
    pole.position.y = 1.25;
    tent.add(pole);

    // Ткань (конус)
    const cloth = new THREE.Mesh(
      new THREE.ConeGeometry(2, 2.2, 6, 1, true), i % 2 === 0 ? fabricMat : fabricDarkMat
    );
    cloth.position.y = 1.4;
    tent.add(cloth);

    tent.position.set(tx, 0, tz);
    group.add(tent);
    bodies.push(physics.createStaticBox(new THREE.Vector3(tx, 1, tz), new THREE.Vector3(2, 2, 2)));
  }

  // Ящики и бочки у поселения
  for (let i = 0; i < 5; i++) {
    const cx = townX - 5 + Math.random() * 20;
    const cz = townZ - 3 + Math.random() * 15;
    if (Math.random() > 0.5) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), rustMat);
      crate.position.set(cx, 0.5, cz);
      crate.castShadow = true;
      group.add(crate);
      bodies.push(physics.createStaticBox(new THREE.Vector3(cx, 0.5, cz), new THREE.Vector3(1.2, 1, 1.2)));
    } else {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.2, 8), darkMetalMat);
      barrel.position.set(cx, 0.6, cz);
      barrel.castShadow = true;
      group.add(barrel);
    }
  }

  // === ЯМА САРЛАККА ===
  const pitX = -25, pitZ = -85;
  // Кольцо из песка
  const pitRing = new THREE.Mesh(
    new THREE.TorusGeometry(5, 2, 8, 16), darkSandMat
  );
  pitRing.position.set(pitX, 0.3, pitZ);
  pitRing.rotation.x = Math.PI / 2;
  group.add(pitRing);
  // Тёмная яма
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 1.5, 12), pitMat);
  pit.position.set(pitX, -0.5, pitZ);
  group.add(pit);
  // Щупальца
  for (let t = 0; t < 6; t++) {
    const angle = (t / 6) * Math.PI * 2;
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 3, 5), pitMat);
    tentacle.position.set(
      pitX + Math.cos(angle) * 3,
      1.2,
      pitZ + Math.sin(angle) * 3
    );
    tentacle.rotation.x = (Math.random() - 0.5) * 0.8;
    tentacle.rotation.z = (Math.random() - 0.5) * 0.8;
    group.add(tentacle);
  }
  // Красный глаз в центре
  const pitEye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), glowRedMat);
  pitEye.position.set(pitX, 0.1, pitZ);
  group.add(pitEye);
  const pitLight = new THREE.PointLight(0xff3300, 2, 12);
  pitLight.position.set(pitX, 0.5, pitZ);
  lights.push(pitLight);

  // === РАЗБИТЫЙ ЗВЁЗДНЫЙ РАЗРУШИТЕЛЬ (нос торчит из песка) ===
  const sdX = 35, sdZ = -80;
  // Основной корпус (нос)
  const sdHull = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 20), darkMetalMat);
  sdHull.position.set(sdX, 1.5, sdZ);
  sdHull.rotation.y = 0.3;
  sdHull.rotation.z = -0.15;
  sdHull.castShadow = true;
  group.add(sdHull);
  bodies.push(physics.createStaticBox(new THREE.Vector3(sdX, 1.5, sdZ), new THREE.Vector3(14, 5, 22)));

  // Надстройка (мостик)
  const sdBridge = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 5), metalMat);
  sdBridge.position.set(sdX, 5, sdZ + 4);
  sdBridge.rotation.y = 0.3;
  sdBridge.castShadow = true;
  group.add(sdBridge);

  // Обшивка (боковые панели)
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 16), rustMat);
    panel.position.set(sdX + s * 6.2, 2.5, sdZ - 2);
    panel.rotation.y = 0.3;
    panel.castShadow = true;
    group.add(panel);
  }
  // Двигатели (сзади)
  for (let e = 0; e < 3; e++) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2, 8), darkMetalMat);
    engine.position.set(sdX - 3 + e * 3, 2, sdZ + 11);
    engine.rotation.x = Math.PI / 2;
    group.add(engine);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0, 0.5, 8), glowRedMat);
    glow.position.set(sdX - 3 + e * 3, 2, sdZ + 12.2);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);
  }
  // Антенна
  const sdAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 8, 4), metalMat);
  sdAntenna.position.set(sdX, 7, sdZ + 4);
  sdAntenna.rotation.z = 0.1;
  group.add(sdAntenna);

  // === ОАЗИС ===
  const oasisX = -40, oasisZ = -25;
  // Вода
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.1, 16), waterMat);
  water.position.set(oasisX, 0.05, oasisZ);
  group.add(water);
  // Пальмы
  for (let p = 0; p < 3; p++) {
    const px = oasisX + (p - 1) * 4;
    const pz = oasisZ + (Math.random() - 0.5) * 4;
    const palm = new THREE.Group();
    // Ствол
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 5, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }));
    trunk.position.y = 2.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    palm.add(trunk);
    // Листья (4 штуки)
    for (let l = 0; l < 4; l++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 2.5), cactusMat);
      leaf.position.set(0, 5, 0);
      leaf.rotation.y = (l / 4) * Math.PI * 2;
      leaf.rotation.x = 0.6;
      palm.add(leaf);
    }
    palm.position.set(px, 0, pz);
    group.add(palm);
  }
  // Камни вокруг оазиса
  for (let r = 0; r < 6; r++) {
    const angle = (r / 6) * Math.PI * 2;
    const rx = oasisX + Math.cos(angle) * 6;
    const rz = oasisZ + Math.sin(angle) * 6;
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(1 + Math.random(), 0.6 + Math.random() * 0.5, 1 + Math.random()), rockMat
    );
    stone.position.set(rx, 0.3, rz);
    stone.rotation.y = Math.random() * Math.PI;
    group.add(stone);
  }

  // === КАКТУСЫ ===
  const cactusDefs = [
    { x: 15, z: -10 }, { x: -18, z: -15 }, { x: 40, z: -45 },
    { x: -35, z: -60 }, { x: 10, z: -95 }, { x: -45, z: -100 },
    { x: 45, z: -20 }, { x: -50, z: -40 },
  ];
  for (const cd of cactusDefs) {
    const cactus = new THREE.Group();
    const h = 1.5 + Math.random() * 1.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, h, 6), cactusMat);
    stem.position.y = h / 2;
    cactus.add(stem);
    // Ветки
    if (Math.random() > 0.3) {
      const bh = 0.6 + Math.random() * 0.6;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, bh, 5), cactusMat);
      branch.position.set(0.25, h * 0.6, 0);
      branch.rotation.z = -0.8;
      cactus.add(branch);
    }
    if (Math.random() > 0.5) {
      const bh2 = 0.5 + Math.random() * 0.5;
      const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, bh2, 5), cactusMat);
      branch2.position.set(-0.2, h * 0.45, 0.1);
      branch2.rotation.z = 0.7;
      cactus.add(branch2);
    }
    cactus.position.set(cd.x, 0, cd.z);
    group.add(cactus);
  }

  // === КОСТИ И ЧЕРЕПА ===
  const boneDefs = [
    { x: -10, z: -35 }, { x: 20, z: -70 }, { x: -30, z: -90 },
    { x: 5, z: -15 }, { x: -20, z: -105 }, { x: 30, z: -50 },
  ];
  for (const bd of boneDefs) {
    // Череп
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), boneMat);
    skull.position.set(bd.x, 0.2, bd.z);
    skull.scale.set(1, 0.8, 1.1);
    group.add(skull);
    // Глазницы
    for (const s of [-1, 1]) {
      const eyeSocket = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      eyeSocket.position.set(bd.x + s * 0.08, 0.25, bd.z + 0.2);
      group.add(eyeSocket);
    }
    // Кости рядом
    for (let b = 0; b < 2; b++) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 4), boneMat);
      bone.position.set(bd.x + (Math.random() - 0.5) * 1.5, 0.05, bd.z + 0.5 + b * 0.4);
      bone.rotation.z = Math.PI / 2;
      bone.rotation.y = Math.random() * Math.PI;
      group.add(bone);
    }
  }

  // === ОБЛОМКИ ТЕХНИКИ (улучшенные) ===
  // Разбитый спидер
  for (let i = 0; i < 4; i++) {
    const wx = -15 + i * 12 + (Math.random() - 0.5) * 8;
    const wz = -20 - i * 22;
    const wreck = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 5.5), metalMat);
    hull.position.y = 0.6;
    wreck.add(hull);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 1.8), rustMat);
    wing.position.set(0, 1, -0.8);
    wing.rotation.z = (Math.random() - 0.5) * 0.6;
    wreck.add(wing);
    // Кокпит
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.2, metalness: 0.5 })
    );
    cockpit.position.set(0, 1.2, 1.5);
    wreck.add(cockpit);
    wreck.position.set(wx, 0, wz);
    wreck.rotation.y = Math.random() * Math.PI;
    group.add(wreck);
    bodies.push(physics.createStaticBox(new THREE.Vector3(wx, 0.8, wz), new THREE.Vector3(4, 2, 6)));
  }

  // === СКЕЛЕТЫ КОРАБЛЕЙ (рёбра торчат из песка) ===
  for (let i = 0; i < 3; i++) {
    const sx = -35 + i * 35;
    const sz = -15 - i * 35;
    for (let r = 0; r < 5; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3 + Math.random() * 2, 0.25), rustMat);
      rib.position.set(sx + (Math.random() - 0.5) * 2, 1.5, sz + r * 2.5);
      rib.rotation.z = 0.2 + Math.random() * 0.3;
      rib.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(rib);
    }
  }

  // === ПЕСЧАНЫЕ ВИХРИ (декоративные столбы пыли) ===
  for (let i = 0; i < 4; i++) {
    const dx = (Math.random() - 0.5) * 80;
    const dz = -20 - Math.random() * 80;
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd4b87a, transparent: true, opacity: 0.12 });
    const dust = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 8, 8, 1, true), dustMat);
    dust.position.set(dx, 4, dz);
    group.add(dust);
  }

  // === УКРЫТИЯ — песчаные баррикады ===
  addCover(group, bodies, physics, rockMat, [
    { x: 5, y: 0.7, z: -10, w: 2.5, h: 1.4, d: 1.5 },
    { x: -8, y: 0.7, z: -20, w: 2, h: 1.4, d: 2 },
    { x: 12, y: 0.7, z: -32, w: 3, h: 1.4, d: 1.2 },
    { x: -5, y: 0.7, z: -42, w: 2.5, h: 1.4, d: 1.5 },
    { x: 8, y: 0.7, z: -50, w: 2, h: 1.4, d: 2 },
    { x: -12, y: 0.7, z: -62, w: 3, h: 1.4, d: 1 },
    { x: 6, y: 0.7, z: -72, w: 2.5, h: 1.4, d: 1.5 },
    { x: -8, y: 0.7, z: -80, w: 2, h: 1.4, d: 2 },
    { x: 10, y: 0.7, z: -90, w: 3, h: 1.4, d: 1.2 },
    { x: -6, y: 0.7, z: -100, w: 2.5, h: 1.4, d: 1.5 },
    { x: 0, y: 0.7, z: -108, w: 2, h: 1.4, d: 2 },
  ]);

  // === ОСВЕЩЕНИЕ — яркое пустынное солнце с дополнительными акцентами ===
  const hemi = new THREE.HemisphereLight(0xffeedd, 0xaa8855, 1.6);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0xffddaa, 0.5);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xfff0cc, 2.2);
  dir.position.set(15, 25, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  dir.shadow.camera.far = 100;
  lights.push(dir);

  // Второй направленный свет (заполняющий, с другой стороны)
  const fillDir = new THREE.DirectionalLight(0xffcc88, 0.4);
  fillDir.position.set(-20, 15, -40);
  lights.push(fillDir);

  // Тёплые точечные у поселения
  const townLight = new THREE.PointLight(0xff9944, 1.5, 25);
  townLight.position.set(townX, 4, townZ);
  lights.push(townLight);

  // Голубой свет у оазиса
  const oasisLight = new THREE.PointLight(0x44aadd, 1.5, 15);
  oasisLight.position.set(oasisX, 2, oasisZ);
  lights.push(oasisLight);

  scene.add(group);
  for (const l of lights) scene.add(l);

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0xd4b87a, bgColor: 0xccaa66,
    enemies: [
      new THREE.Vector3(10, 2, -12), new THREE.Vector3(-10, 2, -15),
      new THREE.Vector3(20, 2, -22), new THREE.Vector3(-20, 2, -25),
      new THREE.Vector3(5, 2, -32), new THREE.Vector3(-5, 2, -35),
      new THREE.Vector3(15, 2, -42), new THREE.Vector3(-15, 2, -45),
      new THREE.Vector3(8, 2, -52), new THREE.Vector3(-8, 2, -55),
      new THREE.Vector3(20, 2, -60), new THREE.Vector3(-20, 2, -62),
      new THREE.Vector3(3, 2, -68), new THREE.Vector3(-3, 2, -72),
      new THREE.Vector3(12, 2, -78), new THREE.Vector3(-12, 2, -82),
      new THREE.Vector3(6, 2, -88), new THREE.Vector3(-6, 2, -90),
      new THREE.Vector3(15, 2, -95), new THREE.Vector3(-15, 2, -98),
      new THREE.Vector3(8, 2, -102), new THREE.Vector3(-8, 2, -105),
      new THREE.Vector3(0, 2, -108), new THREE.Vector3(10, 2, -38),
      new THREE.Vector3(-10, 2, -48), new THREE.Vector3(20, 2, -75),
      new THREE.Vector3(-20, 2, -85), new THREE.Vector3(5, 2, -110),
      new THREE.Vector3(-5, 2, -112), new THREE.Vector3(0, 2, -58),
      new THREE.Vector3(12, 2, -28), new THREE.Vector3(-12, 2, -65),
    ],
    turrets: [
      new THREE.Vector3(-15, 1, -20),
      new THREE.Vector3(15, 1, -40),
      new THREE.Vector3(-10, 1, -65),
      new THREE.Vector3(10, 1, -85),
      new THREE.Vector3(0, 1, -105),
    ],
  };
}

// =====================================================
// УРОВЕНЬ 10: МИР ДРАК — ГОРОД
// Оптимизированный процедурный город
// =====================================================

/** Seeded pseudo-random */
class CityRNG {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) | 1;
  }
  next(): number {
    this.s = (this.s * 1103515245 + 12345) & 0x7fffffff;
    return this.s / 0x7fffffff;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

export function createCityBrawl(scene: THREE.Scene, physics: PhysicsSystem, part: number = 1): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  // Материалы — город будущего 2148
  const roadMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a22, roughness: 0.4, metalness: 0.3,
    clearcoat: 0.3, clearcoatRoughness: 0.4,
  });
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: 0x334455, roughness: 0.4, metalness: 0.5,
    clearcoat: 0.2, clearcoatRoughness: 0.3,
  });
  const wallMats = [
    new THREE.MeshPhysicalMaterial({ color: 0x2a3040, roughness: 0.3, metalness: 0.5, clearcoat: 0.2 }), // тёмный металл
    new THREE.MeshPhysicalMaterial({ color: 0x3a3a4a, roughness: 0.25, metalness: 0.6, clearcoat: 0.3 }), // хром
    new THREE.MeshPhysicalMaterial({ color: 0x222233, roughness: 0.35, metalness: 0.45, clearcoat: 0.15 }), // тёмное стекло
    new THREE.MeshPhysicalMaterial({ color: 0x404050, roughness: 0.3, metalness: 0.55, clearcoat: 0.25 }), // сталь
  ];
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a2a, roughness: 0.2, metalness: 0.6, clearcoat: 0.4,
  });
  const neonMats = [
    new THREE.MeshBasicMaterial({ color: 0xff2266 }),
    new THREE.MeshBasicMaterial({ color: 0x22ffcc }),
    new THREE.MeshBasicMaterial({ color: 0xcc44ff }),
    new THREE.MeshBasicMaterial({ color: 0x22ccff }),
    new THREE.MeshBasicMaterial({ color: 0xff8800 }),
    new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
  ];
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x44aaff, emissive: 0x224488, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.6,
  });

  // Доп. материалы для реалистичной локации
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.4, metalness: 0.3 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.35, metalness: 0.4 });
  const manholeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x556688, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5,
  });
  const trashBinMat = new THREE.MeshStandardMaterial({ color: 0x335533, roughness: 0.6, metalness: 0.3 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85, metalness: 0.0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.75, metalness: 0.0 });
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });
  const wireMat2 = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.2 });
  const grassPatchMat = new THREE.MeshStandardMaterial({ color: 0x4a8a30, roughness: 0.9 });

  // Часть 1: 5x3 = 15 районов, Часть 2: 5x3 = 15 районов (итого 30)
  const GRID_X = 5;
  const GRID_Z = 4;
  const DIST = 60;
  const totalSizeX = GRID_X * DIST;
  const totalSizeZ = GRID_Z * DIST;
  const halfX = totalSizeX / 2;
  const halfZ = totalSizeZ / 2;
  const seedOffset = (part - 1) * 10000;

  // Единый пол (асфальт)
  const road = new THREE.Mesh(new THREE.BoxGeometry(totalSizeX + 20, 0.3, totalSizeZ + 20), roadMat);
  road.position.set(0, -0.15, 0);
  road.receiveShadow = true;
  group.add(road);
  bodies.push(physics.createStaticBox(
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(totalSizeX + 20, 0.3, totalSizeZ + 20)
  ));

  // === РЕАЛИСТИЧНЫЕ ЭЛЕМЕНТЫ ЛОКАЦИИ (по районам) ===
  const locRng = new CityRNG(77007 + seedOffset);
  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;

      // --- Тротуары с бордюрами по периметру района ---
      for (const side of [-1, 1]) {
        // Тротуар вдоль X
        const sw = new THREE.Mesh(new THREE.BoxGeometry(DIST - 4, 0.08, 3), sidewalkMat);
        sw.position.set(cx, 0.04, cz + side * (DIST / 2 - 4));
        sw.receiveShadow = true;
        group.add(sw);
        // Бордюр
        const curb = new THREE.Mesh(new THREE.BoxGeometry(DIST - 4, 0.15, 0.2), curbMat);
        curb.position.set(cx, 0.075, cz + side * (DIST / 2 - 2.5));
        group.add(curb);

        // Тротуар вдоль Z
        const sw2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, DIST - 4), sidewalkMat);
        sw2.position.set(cx + side * (DIST / 2 - 4), 0.04, cz);
        sw2.receiveShadow = true;
        group.add(sw2);
        const curb2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, DIST - 4), curbMat);
        curb2.position.set(cx + side * (DIST / 2 - 2.5), 0.075, cz);
        group.add(curb2);
      }

      // --- Дерево (1 на район) ---
      const treeCount = 1;
      for (let t = 0; t < treeCount; t++) {
        const onXside = locRng.next() > 0.5;
        const tx = onXside
          ? cx + locRng.range(-DIST / 2 + 6, DIST / 2 - 6)
          : cx + (locRng.next() > 0.5 ? 1 : -1) * (DIST / 2 - 5);
        const tz = onXside
          ? cz + (locRng.next() > 0.5 ? 1 : -1) * (DIST / 2 - 5)
          : cz + locRng.range(-DIST / 2 + 6, DIST / 2 - 6);
        const tH = locRng.range(4, 7);
        // Ствол
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, tH, 6), trunkMat
        );
        trunk.position.set(tx, tH / 2, tz);
        trunk.castShadow = true;
        group.add(trunk);
        // Крона
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(tH * 0.35, 8, 6), leafMat
        );
        crown.position.set(tx, tH + tH * 0.15, tz);
        crown.castShadow = true;
        group.add(crown);
        // Земля вокруг дерева (круглый участок)
        const treeBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.02, 8), grassPatchMat
        );
        treeBase.position.set(tx, 0.01, tz);
        group.add(treeBase);
      }

      // (столбы и трава убраны для производительности)
    }
  }

  const rng = new CityRNG(12345 + seedOffset);

  // Все занятые прямоугольники (для проверки перекрытий)
  const allOccupied: { x: number; z: number; w: number; d: number }[] = [];

  // Генерируем здания по районам
  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;
      const matIdx = (gx + gz) % wallMats.length;

      // 2 здания на район, 5 этажей (оптимизировано)
      const count = 1;
      const FLOORS = 5;
      const FLOOR_H = 3.0;
      for (let b = 0; b < count; b++) {
        const bw = rng.range(12, 20);
        const bd = rng.range(12, 20);
        const bh = FLOORS * FLOOR_H;
        const bx = cx + rng.range(-20, 20);
        const bz = cz + rng.range(-20, 20);

        // Проверка перекрытий
        let overlap = false;
        for (const o of allOccupied) {
          if (Math.abs(bx - o.x) < (bw + o.w) / 2 + 3 &&
              Math.abs(bz - o.z) < (bd + o.d) / 2 + 3) {
            overlap = true;
            break;
          }
        }
        if (overlap) continue;
        allOccupied.push({ x: bx, z: bz, w: bw, d: bd });

        // === Здание будущего ===
        const wt = 0.3;
        const doorW = 2.0;
        const doorH = 2.8;
        const wMat = wallMats[matIdx];
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.4, metalness: 0.3 });
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.5, metalness: 0.4 });
        const glowColor = [0x22ccff, 0xff2266, 0x22ffcc, 0xcc44ff, 0xff8800][(gx + gz + b) % 5];
        const edgeGlowMat = new THREE.MeshBasicMaterial({ color: glowColor });

        // Задняя стена (сплошная)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, wt), wMat);
        backWall.position.set(bx, bh / 2, bz - bd / 2 + wt / 2);
        backWall.receiveShadow = true;
        group.add(backWall);
        bodies.push(physics.createStaticBox(new THREE.Vector3(bx, bh / 2, bz - bd / 2 + wt / 2), new THREE.Vector3(bw, bh, wt)));

        // Передняя стена (с дверным проёмом) — 2 секции + перемычка
        const frontLeftW = (bw - doorW) / 2;
        // Левая секция
        const frontL = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, bh, wt), wMat);
        frontL.position.set(bx - bw / 2 + frontLeftW / 2, bh / 2, bz + bd / 2 - wt / 2);
        frontL.receiveShadow = true;
        group.add(frontL);
        bodies.push(physics.createStaticBox(new THREE.Vector3(bx - bw / 2 + frontLeftW / 2, bh / 2, bz + bd / 2 - wt / 2), new THREE.Vector3(frontLeftW, bh, wt)));

        // Правая секция
        const frontR = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, bh, wt), wMat);
        frontR.position.set(bx + bw / 2 - frontLeftW / 2, bh / 2, bz + bd / 2 - wt / 2);
        frontR.receiveShadow = true;
        group.add(frontR);
        bodies.push(physics.createStaticBox(new THREE.Vector3(bx + bw / 2 - frontLeftW / 2, bh / 2, bz + bd / 2 - wt / 2), new THREE.Vector3(frontLeftW, bh, wt)));

        // Перемычка над дверью
        const lintelH = bh - doorH;
        if (lintelH > 0) {
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wt), wMat);
          lintel.position.set(bx, doorH + lintelH / 2, bz + bd / 2 - wt / 2);
          group.add(lintel);
          bodies.push(physics.createStaticBox(new THREE.Vector3(bx, doorH + lintelH / 2, bz + bd / 2 - wt / 2), new THREE.Vector3(doorW, lintelH, wt)));
        }

        // Боковые стены
        for (const s of [-1, 1]) {
          const sideWall = new THREE.Mesh(new THREE.BoxGeometry(wt, bh, bd), wMat);
          sideWall.position.set(bx + s * (bw / 2 - wt / 2), bh / 2, bz);
          sideWall.receiveShadow = true;
          group.add(sideWall);
          bodies.push(physics.createStaticBox(new THREE.Vector3(bx + s * (bw / 2 - wt / 2), bh / 2, bz), new THREE.Vector3(wt, bh, bd)));
        }

        // Светящиеся рёбра здания (неоновые полосы по углам)
        for (const cx2 of [-1, 1]) {
          for (const cz2 of [-1, 1]) {
            const edge = new THREE.Mesh(
              new THREE.BoxGeometry(0.06, bh, 0.06), edgeGlowMat
            );
            edge.position.set(bx + cx2 * (bw / 2 - 0.03), bh / 2, bz + cz2 * (bd / 2 - 0.03));
            group.add(edge);
          }
        }

        // Горизонтальные неоновые полосы на фасаде (каждые 3м)
        for (let hy = 3; hy < bh; hy += 3) {
          const hStrip = new THREE.Mesh(
            new THREE.BoxGeometry(bw - 0.5, 0.04, 0.04), edgeGlowMat
          );
          hStrip.position.set(bx, hy, bz + bd / 2 - wt / 2 + 0.03);
          group.add(hStrip);
        }

        // Голографическая панель над дверью
        const holoPanelMat = new THREE.MeshStandardMaterial({
          color: glowColor, emissive: glowColor, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.4,
        });
        const holoPanel = new THREE.Mesh(
          new THREE.BoxGeometry(doorW - 0.2, 0.4, 0.02), holoPanelMat
        );
        holoPanel.position.set(bx, doorH + 0.3, bz + bd / 2 - wt / 2 + 0.05);
        group.add(holoPanel);

        // Неоновая рамка двери
        // Верх
        const dFrameT = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.1, 0.05, 0.05), edgeGlowMat);
        dFrameT.position.set(bx, doorH, bz + bd / 2 - wt / 2 + 0.03);
        group.add(dFrameT);
        // Бока
        for (const ds of [-1, 1]) {
          const dFrameS = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.05), edgeGlowMat);
          dFrameS.position.set(bx + ds * (doorW / 2), doorH / 2, bz + bd / 2 - wt / 2 + 0.03);
          group.add(dFrameS);
        }

        // Антенна на крыше (футуристическая)
        const antennaMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.3, metalness: 0.7 });
        const roofAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), antennaMat);
        roofAntenna.position.set(bx + bw / 4, bh + 1.2, bz - bd / 4);
        group.add(roofAntenna);
        // Мигающий огонь на антенне
        const antennaLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        antennaLight.position.set(bx + bw / 4, bh + 2.3, bz - bd / 4);
        group.add(antennaLight);

        // Вентиляционный блок на крыше
        const ventBlock = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.8, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.4, metalness: 0.5 })
        );
        ventBlock.position.set(bx - bw / 4, bh + 0.55, bz + bd / 4);
        group.add(ventBlock);

        // === ЭТАЖИ, ЛИФТ, ДВЕРИ (оптимизировано) ===
        // Общие материалы (создаём 1 раз за пределами цикла зданий — но тут внутри, чтобы не менять структуру)
        const doorMat2 = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.6, metalness: 0.2 });
        const liftMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
        const liftDoorMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 });

        // Лифтовая шахта (1 сплошная стена на всю высоту — 3 стены)
        const liftW = 2.0, liftD = 2.0;
        const liftX = bx + bw / 2 - wt - liftW / 2 - 0.5;
        const liftZ = bz - bd / 2 + wt + liftD / 2 + 0.5;
        for (const ls of [
          { x: liftX, z: liftZ - liftD / 2, w: liftW + 0.2, d: 0.15 },
          { x: liftX - liftW / 2, z: liftZ, w: 0.15, d: liftD },
          { x: liftX + liftW / 2, z: liftZ, w: 0.15, d: liftD },
        ]) {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(ls.w, bh, ls.d), liftMat);
          sw.position.set(ls.x, bh / 2, ls.z);
          group.add(sw);
          bodies.push(physics.createStaticBox(new THREE.Vector3(ls.x, bh / 2, ls.z), new THREE.Vector3(ls.w, bh, ls.d)));
        }

        // Этажные перекрытия + 2 двери + дверь лифта
        for (let fl = 0; fl < FLOORS; fl++) {
          const fy = fl * FLOOR_H;

          // Перекрытие
          const slab = new THREE.Mesh(new THREE.BoxGeometry(bw - wt * 2, 0.15, bd - wt * 2), floorMat);
          slab.position.set(bx, fy + 0.075, bz);
          group.add(slab);
          bodies.push(physics.createStaticBox(new THREE.Vector3(bx, fy + 0.075, bz), new THREE.Vector3(bw - wt * 2, 0.15, bd - wt * 2)));

          // 2 двери квартир (по бокам)
          for (const dx of [-bw / 4, bw / 6]) {
            const d = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.06), doorMat2);
            d.position.set(bx + dx, fy + 1.25, bz + 1.2);
            group.add(d);
          }

          // Дверь лифта
          const ld = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.06), liftDoorMat);
          ld.position.set(liftX, fy + 1.25, liftZ + liftD / 2 + 0.08);
          group.add(ld);
        }

        // Крыша
        const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.3, bd + 0.4), roofMat);
        roof.position.set(bx, bh + 0.15, bz);
        group.add(roof);
        bodies.push(physics.createStaticBox(new THREE.Vector3(bx, bh + 0.15, bz), new THREE.Vector3(bw + 0.4, 0.3, bd + 0.4)));

        // Вывеска
        if (rng.next() > 0.5) {
          const nIdx = rng.int(0, neonMats.length - 1);
          const sign = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.4, 0.5, 0.08), neonMats[nIdx]);
          sign.position.set(bx, bh * 0.6, bz + bd / 2 + 0.05);
          group.add(sign);
        }


        // Окна снаружи (на боковых и задней стенах)
        const floors = Math.floor(bh / 4);
        for (let f = 0; f < Math.min(floors, 3); f++) {
          const wy = f * 4 + 2.5;
          // Задний фасад
          const winBack = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.8, 0.8), windowMat);
          winBack.position.set(bx, wy, bz - bd / 2 - 0.02);
          winBack.rotation.y = Math.PI;
          group.add(winBack);
        }

        // === ОБРУШЕНИЕ (40% зданий частично разрушены) ===
        if (rng.next() > 0.6) {
          const ruinMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3830, roughness: 0.9 });
          const rebarMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.8, metalness: 0.5 });
          const dustMat = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 1.0, transparent: true, opacity: 0.4 });

          // Обрушенная часть стены (вырез из передней стены)
          const collapseW = bw * rng.range(0.3, 0.6);
          const collapseH = bh * rng.range(0.3, 0.7);
          const collapseX = bx + rng.range(-bw * 0.2, bw * 0.2);
          const collapseY = bh - collapseH / 2;

          // Рваный край обрушения (зубцы)
          for (let zi = 0; zi < 5; zi++) {
            const toothW = collapseW / 5;
            const toothH = rng.range(0.5, collapseH * 0.4);
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(toothW, toothH, wt + 0.1), ruinMat2);
            tooth.position.set(
              collapseX - collapseW / 2 + zi * toothW + toothW / 2,
              bh - collapseH + toothH / 2,
              bz + bd / 2 - wt / 2
            );
            group.add(tooth);
          }

          // Обломки на земле перед зданием
          const debrisCount = rng.int(8, 15);
          for (let di = 0; di < debrisCount; di++) {
            const dw = rng.range(0.4, 2.0);
            const dh2 = rng.range(0.2, 1.0);
            const dd = rng.range(0.3, 1.5);
            const debris = new THREE.Mesh(new THREE.BoxGeometry(dw, dh2, dd), ruinMat2);
            debris.position.set(
              collapseX + rng.range(-collapseW * 0.8, collapseW * 0.8),
              dh2 / 2,
              bz + bd / 2 + rng.range(1, 6)
            );
            debris.rotation.set(
              rng.range(-0.4, 0.4),
              rng.range(0, Math.PI),
              rng.range(-0.3, 0.3)
            );
            group.add(debris);
          }

          // Торчащая арматура из стен
          for (let ai = 0; ai < 6; ai++) {
            const arLen = rng.range(1.5, 4.0);
            const ar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, arLen, 4), rebarMat);
            ar.position.set(
              collapseX + rng.range(-collapseW / 2, collapseW / 2),
              bh - collapseH + rng.range(0, collapseH * 0.5),
              bz + bd / 2 - wt / 2 + arLen / 3
            );
            ar.rotation.set(
              rng.range(-0.5, 0.2),
              rng.range(-0.3, 0.3),
              rng.range(-0.8, 0.8)
            );
            group.add(ar);
          }

          // Пылевое облако у основания обрушения
          for (let ci = 0; ci < 3; ci++) {
            const cloud = new THREE.Mesh(
              new THREE.SphereGeometry(rng.range(1.5, 3.0), 6, 6), dustMat
            );
            cloud.position.set(
              collapseX + rng.range(-3, 3),
              rng.range(1, 3),
              bz + bd / 2 + rng.range(2, 5)
            );
            cloud.scale.set(1.5, 0.6, 1);
            group.add(cloud);
          }

          // Провисшие перекрытия (видны изнутри)
          for (let fi = 0; fi < 2; fi++) {
            const slabH = bh - collapseH + fi * FLOOR_H;
            if (slabH > 0 && slabH < bh) {
              const hangSlab = new THREE.Mesh(
                new THREE.BoxGeometry(collapseW * 0.6, 0.15, bd * 0.3), ruinMat2
              );
              hangSlab.position.set(collapseX, slabH, bz);
              hangSlab.rotation.z = rng.range(0.1, 0.4);
              hangSlab.rotation.x = rng.range(-0.1, 0.1);
              group.add(hangSlab);
            }
          }

          // Огонь в обрушенной части (50%)
          if (rng.next() > 0.5) {
            const ruinFireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 });
            for (let fi = 0; fi < 3; fi++) {
              const fh = rng.range(1.5, 3.0);
              const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.4, fh, 6), ruinFireMat);
              flame2.position.set(
                collapseX + rng.range(-2, 2),
                bh - collapseH + fh / 2,
                bz + bd / 2 - wt / 2
              );
              group.add(flame2);
            }
            const ruinFireLight = new THREE.PointLight(0xff4400, 2, 15);
            ruinFireLight.position.set(collapseX, bh - collapseH + 2, bz + bd / 2);
            lights.push(ruinFireLight);
          }
        }
      }

      // 1-2 укрытия на район
      for (let c = 0; c < 2; c++) {
        const cw = rng.range(1.5, 2.5);
        const ch = rng.range(1.0, 1.4);
        const cd = rng.range(1.5, 2.5);
        const px = cx + rng.range(-22, 22);
        const pz = cz + rng.range(-22, 22);

        let inBuilding = false;
        for (const o of allOccupied) {
          if (Math.abs(px - o.x) < o.w / 2 + 1.5 && Math.abs(pz - o.z) < o.d / 2 + 1.5) {
            inBuilding = true;
            break;
          }
        }
        if (inBuilding) continue;

        const cover = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), coverMat);
        cover.position.set(px, ch / 2, pz);
        cover.receiveShadow = true;
        group.add(cover);
        bodies.push(physics.createStaticBox(
          new THREE.Vector3(px, ch / 2, pz),
          new THREE.Vector3(cw, ch, cd)
        ));
      }
    }
  }

  // ================================================================
  // === СПЕЦЗДАНИЯ: школы, больницы, детсады, магазины, ТЦ ===
  // ================================================================
  const specialTypes = [
    { name: 'school',   wallColor: 0x997744, trimColor: 0xcc8833, labelColor: 0xffffff, w: 22, d: 16, h: 8 },
    { name: 'hospital', wallColor: 0xdddddd, trimColor: 0xcc2222, labelColor: 0xcc2222, w: 24, d: 18, h: 10 },
    { name: 'kindergarten', wallColor: 0xddcc55, trimColor: 0x44aa44, labelColor: 0xff6633, w: 16, d: 14, h: 5 },
    { name: 'shop',     wallColor: 0xbbaa88, trimColor: 0x4488cc, labelColor: 0xffffff, w: 12, d: 10, h: 6 },
    { name: 'cafe',     wallColor: 0xcc9966, trimColor: 0x884422, labelColor: 0xffddaa, w: 10, d: 8,  h: 4 },
    { name: 'restaurant', wallColor: 0x553333, trimColor: 0xddaa44, labelColor: 0xffeecc, w: 16, d: 12, h: 5 },
    { name: 'mall',     wallColor: 0xaaaaaa, trimColor: 0xff8800, labelColor: 0xffcc00, w: 30, d: 24, h: 14 },
    { name: 'park',     wallColor: 0x448833, trimColor: 0x336622, labelColor: 0xffffff, w: 28, d: 28, h: 1 },
    { name: 'amusement', wallColor: 0xcc44aa, trimColor: 0xffcc00, labelColor: 0xffffff, w: 30, d: 26, h: 2 },
    { name: 'cinema',   wallColor: 0x332244, trimColor: 0xff2244, labelColor: 0xffdd00, w: 18, d: 14, h: 10 },
    { name: 'gym',      wallColor: 0x445566, trimColor: 0x44ccff, labelColor: 0xffffff, w: 16, d: 12, h: 6 },
    { name: 'police',   wallColor: 0x334466, trimColor: 0x2244aa, labelColor: 0xffffff, w: 24, d: 16, h: 8 },
    { name: 'zoo',      wallColor: 0x558844, trimColor: 0x44aa33, labelColor: 0xffffff, w: 30, d: 26, h: 2 },
    { name: 'nyji',   wallColor: 0x88aacc, trimColor: 0x22ccff, labelColor: 0xffffff, w: 14, d: 14, h: 80 },
  ];

  const specRng = new CityRNG(54321 + seedOffset);
  let specIdx = 0;

  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;
      const spec = specialTypes[specIdx % specialTypes.length];
      specIdx++;

      // Позиция — с краю района
      const sx = cx + (specRng.next() > 0.5 ? 1 : -1) * specRng.range(8, 20);
      const sz = cz + (specRng.next() > 0.5 ? 1 : -1) * specRng.range(8, 20);

      // Проверка перекрытий
      let overlap = false;
      for (const o of allOccupied) {
        if (Math.abs(sx - o.x) < (spec.w + o.w) / 2 + 3 &&
            Math.abs(sz - o.z) < (spec.d + o.d) / 2 + 3) {
          overlap = true; break;
        }
      }
      if (overlap) continue;
      allOccupied.push({ x: sx, z: sz, w: spec.w, d: spec.d });

      const sWallMat = new THREE.MeshStandardMaterial({ color: spec.wallColor, roughness: 0.6, metalness: 0.2 });
      const sTrimMat = new THREE.MeshStandardMaterial({ color: spec.trimColor, roughness: 0.4, metalness: 0.3 });
      const sLabelMat = new THREE.MeshBasicMaterial({ color: spec.labelColor });

      // Корпус здания
      const sBody = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, spec.d), sWallMat);
      sBody.position.set(sx, spec.h / 2, sz);
      sBody.receiveShadow = true;
      sBody.castShadow = true;
      group.add(sBody);
      bodies.push(physics.createStaticBox(
        new THREE.Vector3(sx, spec.h / 2, sz),
        new THREE.Vector3(spec.w, spec.h, spec.d)
      ));

      // Крыша
      const sRoof = new THREE.Mesh(
        new THREE.BoxGeometry(spec.w + 0.6, 0.3, spec.d + 0.6), sTrimMat
      );
      sRoof.position.set(sx, spec.h + 0.15, sz);
      group.add(sRoof);

      // Цветная полоса-карниз
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(spec.w + 0.2, 0.5, 0.15), sTrimMat
      );
      trim.position.set(sx, spec.h - 0.3, sz + spec.d / 2 + 0.08);
      group.add(trim);

      // Вывеска (табличка с «названием»)
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(spec.w * 0.6, 1.2, 0.1), sTrimMat
      );
      signBoard.position.set(sx, spec.h + 1.0, sz + spec.d / 2 + 0.06);
      group.add(signBoard);

      // Текст на вывеске (имитация — белые/цветные полоски)
      const labelW = spec.w * 0.45;
      const label = new THREE.Mesh(
        new THREE.BoxGeometry(labelW, 0.5, 0.02), sLabelMat
      );
      label.position.set(sx, spec.h + 1.0, sz + spec.d / 2 + 0.12);
      group.add(label);

      // Вход (тёмный прямоугольник — дверь)
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.5 });
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 2.8, 0.1), doorMat
      );
      door.position.set(sx, 1.4, sz + spec.d / 2 + 0.06);
      group.add(door);

      // Козырёк над входом
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.1, 1.5), sTrimMat
      );
      awning.position.set(sx, 2.9, sz + spec.d / 2 + 0.8);
      group.add(awning);

      // Окна (полоски)
      const winFloors = Math.floor(spec.h / 3.5);
      for (let f = 0; f < winFloors; f++) {
        const wy = f * 3.5 + 2.5;
        const winRow = new THREE.Mesh(
          new THREE.PlaneGeometry(spec.w * 0.85, 1.0), windowMat
        );
        winRow.position.set(sx, wy, sz + spec.d / 2 + 0.02);
        group.add(winRow);
      }

      // === Уникальные детали по типу ===
      if (spec.name === 'hospital') {
        // Красный крест на фасаде
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.08), sTrimMat);
        crossH.position.set(sx, spec.h - 1.5, sz + spec.d / 2 + 0.08);
        group.add(crossH);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.08), sTrimMat);
        crossV.position.set(sx, spec.h - 1.5, sz + spec.d / 2 + 0.08);
        group.add(crossV);

        // Пандус
        const ramp = new THREE.Mesh(
          new THREE.BoxGeometry(3.0, 0.15, 2.5), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 })
        );
        ramp.position.set(sx, 0.08, sz + spec.d / 2 + 1.5);
        ramp.rotation.x = -0.05;
        group.add(ramp);
      }

      if (spec.name === 'school') {
        // Школьный забор (низкий)
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.6, metalness: 0.4 });
        for (const side of [-1, 1]) {
          const fence = new THREE.Mesh(
            new THREE.BoxGeometry(spec.w + 4, 1.2, 0.1), fenceMat
          );
          fence.position.set(sx, 0.6, sz + side * (spec.d / 2 + 2));
          group.add(fence);
        }

        // Площадка перед школой (тротуар)
        const yard = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w - 2, 0.05, 4),
          new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.9 })
        );
        yard.position.set(sx, 0.03, sz + spec.d / 2 + 4);
        group.add(yard);

        // Флагшток
        const flagPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 })
        );
        flagPole.position.set(sx + spec.w / 2 - 1, 3, sz + spec.d / 2 + 3);
        group.add(flagPole);
      }

      if (spec.name === 'kindergarten') {
        // Детская площадка (цветные элементы)
        const playColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44];
        for (let p = 0; p < 3; p++) {
          const playMat = new THREE.MeshStandardMaterial({
            color: playColors[p % playColors.length], roughness: 0.5, metalness: 0.2,
          });
          // Горка / качели (упрощённые кубы)
          const playEl = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.0 + p * 0.3, 1.5), playMat
          );
          playEl.position.set(sx - 4 + p * 4, (1.0 + p * 0.3) / 2, sz + spec.d / 2 + 3);
          group.add(playEl);
        }

        // Забор (яркий)
        const kFenceMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.5, metalness: 0.3 });
        for (const side of [-1, 1]) {
          const kFence = new THREE.Mesh(
            new THREE.BoxGeometry(spec.w + 6, 0.9, 0.08), kFenceMat
          );
          kFence.position.set(sx, 0.45, sz + side * (spec.d / 2 + 4));
          group.add(kFence);
        }
      }

      if (spec.name === 'shop') {
        // Витрина (большое стекло внизу)
        const vitrine = new THREE.Mesh(
          new THREE.PlaneGeometry(spec.w * 0.8, 2.5),
          new THREE.MeshStandardMaterial({
            color: 0x88bbdd, roughness: 0.05, metalness: 0.3,
            transparent: true, opacity: 0.4,
          })
        );
        vitrine.position.set(sx, 1.5, sz + spec.d / 2 + 0.03);
        group.add(vitrine);

        // Тент над витриной
        const tent = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.9, 0.08, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6 })
        );
        tent.position.set(sx, 3.0, sz + spec.d / 2 + 0.9);
        group.add(tent);
      }

      if (spec.name === 'mall') {
        // Огромная стеклянная стена (фасад)
        const glassFacade = new THREE.Mesh(
          new THREE.PlaneGeometry(spec.w * 0.9, spec.h * 0.7),
          new THREE.MeshStandardMaterial({
            color: 0x88aacc, roughness: 0.05, metalness: 0.4,
            transparent: true, opacity: 0.35,
          })
        );
        glassFacade.position.set(sx, spec.h * 0.45, sz + spec.d / 2 + 0.03);
        group.add(glassFacade);

        // Колонны у входа
        const colMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.5 });
        for (const colX of [-4, 4]) {
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, spec.h, 10), colMat
          );
          col.position.set(sx + colX, spec.h / 2, sz + spec.d / 2 + 1);
          group.add(col);
        }

        // Парковка перед ТЦ (серая площадка)
        const parking = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w, 0.05, 8),
          new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
        );
        parking.position.set(sx, 0.03, sz + spec.d / 2 + 6);
        group.add(parking);

        // Парковочная разметка
        const parkLineMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        for (let pm = 0; pm < 6; pm++) {
          const pLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.01, 4), parkLineMat
          );
          pLine.position.set(sx - 12 + pm * 5, 0.06, sz + spec.d / 2 + 6);
          group.add(pLine);
        }

        // Рекламный щит на крыше
        const billboard = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.5, 3, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.4, metalness: 0.3 })
        );
        billboard.position.set(sx, spec.h + 2.0, sz + spec.d / 2 - 1);
        group.add(billboard);
      }

      if (spec.name === 'cafe') {
        // Полосатый тент над входом (красно-белый)
        const tentStripes = [0xcc3333, 0xeeeeee, 0xcc3333, 0xeeeeee, 0xcc3333];
        for (let ts = 0; ts < tentStripes.length; ts++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(spec.w * 0.9 / tentStripes.length, 0.06, 2.0),
            new THREE.MeshStandardMaterial({ color: tentStripes[ts], roughness: 0.6 })
          );
          stripe.position.set(
            sx - spec.w * 0.9 / 2 + (ts + 0.5) * (spec.w * 0.9 / tentStripes.length),
            spec.h * 0.7, sz + spec.d / 2 + 1.0
          );
          group.add(stripe);
        }

        // Уличные столики (3 штуки)
        const tableMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.5, metalness: 0.2 });
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.6, metalness: 0.2 });
        for (let t = 0; t < 3; t++) {
          const tx = sx - 3 + t * 3;
          const tz = sz + spec.d / 2 + 3;

          // Столик (ножка + столешница)
          const tableLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), chairMat
          );
          tableLeg.position.set(tx, 0.35, tz);
          group.add(tableLeg);

          const tableTop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.05, 10), tableMat
          );
          tableTop.position.set(tx, 0.72, tz);
          group.add(tableTop);

          // 2 стула
          for (const cs of [-0.7, 0.7]) {
            const chairSeat = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.04, 0.4), chairMat
            );
            chairSeat.position.set(tx + cs, 0.45, tz);
            group.add(chairSeat);

            // Ножки стула (4)
            for (const clx of [-0.15, 0.15]) {
              for (const clz of [-0.15, 0.15]) {
                const chairLeg = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), chairMat
                );
                chairLeg.position.set(tx + cs + clx, 0.225, tz + clz);
                group.add(chairLeg);
              }
            }

            // Спинка стула
            const chairBack = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.4, 0.04), chairMat
            );
            chairBack.position.set(tx + cs, 0.7, tz + (cs > 0 ? 0.2 : -0.2));
            group.add(chairBack);
          }
        }

        // Кофейная чашка-вывеска (большой цилиндр на крыше)
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.3 });
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.35, 0.8, 10), cupMat
        );
        cup.position.set(sx + spec.w / 2 - 1.5, spec.h + 0.6, sz);
        group.add(cup);

        // «Пар» из чашки (маленькие полупрозрачные сферы)
        const steamMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, transparent: true, opacity: 0.2, roughness: 1,
        });
        for (let si = 0; si < 3; si++) {
          const steam = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 + si * 0.05, 6, 6), steamMat
          );
          steam.position.set(sx + spec.w / 2 - 1.5 + (si - 1) * 0.1, spec.h + 1.2 + si * 0.3, sz);
          group.add(steam);
        }

        // Меню-борд (доска у входа)
        const menuBoard = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.9, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
        );
        menuBoard.position.set(sx + 2, 0.5, sz + spec.d / 2 + 1.5);
        menuBoard.rotation.y = 0.3;
        group.add(menuBoard);
      }

      if (spec.name === 'restaurant') {
        // Элегантный навес (тёмный)
        const canopyMat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.5, metalness: 0.3 });
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.8, 0.08, 2.5), canopyMat
        );
        canopy.position.set(sx, spec.h * 0.65, sz + spec.d / 2 + 1.3);
        group.add(canopy);

        // Столбики навеса
        const canopyPostMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.7 });
        for (const cpx of [-spec.w * 0.35, spec.w * 0.35]) {
          const cPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, spec.h * 0.65, 6), canopyPostMat
          );
          cPost.position.set(sx + cpx, spec.h * 0.65 / 2, sz + spec.d / 2 + 2.5);
          group.add(cPost);
        }

        // Уличная терраса (деревянный настил)
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7, metalness: 0.1 });
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.8, 0.1, 3), deckMat
        );
        deck.position.set(sx, 0.05, sz + spec.d / 2 + 3);
        group.add(deck);

        // Столы ресторана (4 шт, квадратные, с белой скатертью)
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.6 });
        const rTableLegMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7 });
        for (let rt = 0; rt < 4; rt++) {
          const rtx = sx - spec.w * 0.3 + rt * (spec.w * 0.2);
          const rtz = sz + spec.d / 2 + 3;

          // Ножка
          const rtLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.06, 0.7, 6), rTableLegMat
          );
          rtLeg.position.set(rtx, 0.4, rtz);
          group.add(rtLeg);

          // Столешница
          const rtTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.04, 0.8), clothMat
          );
          rtTop.position.set(rtx, 0.76, rtz);
          group.add(rtTop);

          // Свеча на столе (маленький цилиндр с огоньком)
          const candle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6),
            new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.8 })
          );
          candle.position.set(rtx, 0.83, rtz);
          group.add(candle);

          const flame = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffaa22 })
          );
          flame.position.set(rtx, 0.9, rtz);
          group.add(flame);
        }

        // Декоративные растения у входа (зелёные кусты в горшках)
        const potMat = new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.7 });
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 });
        for (const px of [-spec.w / 2 + 1, spec.w / 2 - 1]) {
          // Горшок
          const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8), potMat
          );
          pot.position.set(sx + px, 0.25, sz + spec.d / 2 + 1);
          group.add(pot);

          // Куст
          const bush = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 8, 8), bushMat
          );
          bush.position.set(sx + px, 0.85, sz + spec.d / 2 + 1);
          group.add(bush);
        }

        // Огоньки-гирлянда вдоль навеса
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        for (let bl = 0; bl < 8; bl++) {
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 6), bulbMat
          );
          bulb.position.set(
            sx - spec.w * 0.35 + bl * (spec.w * 0.7 / 7),
            spec.h * 0.63, sz + spec.d / 2 + 2.5
          );
          group.add(bulb);
        }
      }

      // ==============================================================
      // ПАРК
      // ==============================================================
      if (spec.name === 'park') {
        // Газон (зелёная площадка вместо здания — оно уже h=1)
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x44882a, roughness: 0.9 });
        const grass = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w, 0.15, spec.d), grassMat
        );
        grass.position.set(sx, 0.08, sz);
        grass.receiveShadow = true;
        group.add(grass);

        // Дорожки (крест)
        const pathMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.8 });
        const pathH = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 2, 0.02, 2), pathMat);
        pathH.position.set(sx, 0.17, sz);
        group.add(pathH);
        const pathV = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, spec.d - 2), pathMat);
        pathV.position.set(sx, 0.17, sz);
        group.add(pathV);

        // Деревья (8 штук по периметру)
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x338822, roughness: 0.7 });
        const treeRng = new CityRNG(gx * 100 + gz);
        for (let tr = 0; tr < 8; tr++) {
          const treeX = sx + treeRng.range(-spec.w / 2 + 3, spec.w / 2 - 3);
          const treeZ = sz + treeRng.range(-spec.d / 2 + 3, spec.d / 2 - 3);
          // Не на дорожке
          if (Math.abs(treeX - sx) < 1.5 || Math.abs(treeZ - sz) < 1.5) continue;
          const treeH = treeRng.range(3, 6);
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.2, treeH, 6), trunkMat
          );
          trunk.position.set(treeX, treeH / 2, treeZ);
          trunk.castShadow = true;
          group.add(trunk);
          const crown = new THREE.Mesh(
            new THREE.SphereGeometry(treeH * 0.4, 8, 8), leafMat
          );
          crown.position.set(treeX, treeH + treeH * 0.2, treeZ);
          crown.castShadow = true;
          group.add(crown);
        }

        // Скамейки (4 по дорожкам)
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.7 });
        const benchLegMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.7 });
        for (let bn = 0; bn < 4; bn++) {
          const bx = sx + (bn < 2 ? -4 : 4);
          const bz = sz + (bn % 2 === 0 ? -4 : 4);
          // Сиденье
          const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), benchMat);
          seat.position.set(bx, 0.45, bz);
          group.add(seat);
          // Спинка
          const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), benchMat);
          back.position.set(bx, 0.7, bz - 0.22);
          group.add(back);
          // Ножки
          for (const lx of [-0.6, 0.6]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.4), benchLegMat);
            leg.position.set(bx + lx, 0.225, bz);
            group.add(leg);
          }
        }

        // Фонтан в центре
        const fountainMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.5 });
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x4488cc, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6,
        });
        // Бассейн
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.6, 16), fountainMat);
        basin.position.set(sx, 0.3, sz);
        group.add(basin);
        // Вода
        const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 16), waterMat);
        water.position.set(sx, 0.55, sz);
        group.add(water);
        // Центральный столб
        const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), fountainMat);
        fPillar.position.set(sx, 1.05, sz);
        group.add(fPillar);
        // Верхняя чаша
        const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.3, 10), fountainMat);
        topBowl.position.set(sx, 1.85, sz);
        group.add(topBowl);

        // Клумбы (цветные пятна)
        const flowerColors = [0xff4466, 0xffaa22, 0xff66cc, 0xffff44];
        for (let fl = 0; fl < 6; fl++) {
          const flMat = new THREE.MeshStandardMaterial({
            color: flowerColors[fl % flowerColors.length], roughness: 0.8,
          });
          const flX = sx + treeRng.range(-10, 10);
          const flZ = sz + treeRng.range(-10, 10);
          if (Math.abs(flX - sx) < 2.5 && Math.abs(flZ - sz) < 2.5) continue;
          const flowerPatch = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), flMat);
          flowerPatch.position.set(flX, 0.25, flZ);
          flowerPatch.scale.y = 0.4;
          group.add(flowerPatch);
        }
      }

      // ==============================================================
      // ПАРК АТТРАКЦИОНОВ
      // ==============================================================
      if (spec.name === 'amusement') {
        // Площадка
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.85 });
        const aGround = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.12, spec.d), groundMat);
        aGround.position.set(sx, 0.06, sz);
        group.add(aGround);

        // Колесо обозрения (большое кольцо)
        const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.4, metalness: 0.5 });
        const wheelSpokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
        const wheelR = 8;
        // Обод
        const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.2, 8, 32), wheelRimMat);
        rim.position.set(sx, wheelR + 1.5, sz - 4);
        rim.rotation.y = Math.PI / 2;
        group.add(rim);
        // Спицы
        for (let sp = 0; sp < 8; sp++) {
          const a = (sp / 8) * Math.PI * 2;
          const spoke = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, wheelR * 2, 6), wheelSpokeMat
          );
          spoke.position.set(sx, wheelR + 1.5, sz - 4);
          spoke.rotation.x = a;
          spoke.rotation.y = Math.PI / 2;
          group.add(spoke);
        }
        // Кабинки (8 шт)
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.4, metalness: 0.3 });
        for (let cab = 0; cab < 8; cab++) {
          const a = (cab / 8) * Math.PI * 2;
          const cabX = sx;
          const cabY = wheelR + 1.5 + Math.sin(a) * wheelR;
          const cabZ = sz - 4 + Math.cos(a) * wheelR;
          const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), cabinMat);
          cabin.position.set(cabX, cabY, cabZ);
          group.add(cabin);
        }
        // Опора колеса
        for (const os of [-1, 1]) {
          const support = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, wheelR + 1.5, 6), wheelSpokeMat
          );
          support.position.set(sx + os * 0.5, (wheelR + 1.5) / 2, sz - 4);
          support.rotation.z = os * 0.08;
          group.add(support);
        }

        // Карусель
        const carouselBase = new THREE.Mesh(
          new THREE.CylinderGeometry(3, 3, 0.3, 16),
          new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.4, metalness: 0.4 })
        );
        carouselBase.position.set(sx + 8, 0.15, sz + 5);
        group.add(carouselBase);
        // Крыша карусели
        const carouselRoof = new THREE.Mesh(
          new THREE.ConeGeometry(3.5, 2, 16),
          new THREE.MeshStandardMaterial({ color: 0xcc3355, roughness: 0.5 })
        );
        carouselRoof.position.set(sx + 8, 3.5, sz + 5);
        group.add(carouselRoof);
        // Центральный столб
        const carPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccc44, roughness: 0.3, metalness: 0.6 })
        );
        carPole.position.set(sx + 8, 2.3, sz + 5);
        group.add(carPole);
        // Лошадки (упрощённые цветные блоки по кругу)
        const horseColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
        for (let hr = 0; hr < 6; hr++) {
          const ha = (hr / 6) * Math.PI * 2;
          const horse = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: horseColors[hr], roughness: 0.5, metalness: 0.2 })
          );
          horse.position.set(sx + 8 + Math.cos(ha) * 2.2, 0.7, sz + 5 + Math.sin(ha) * 2.2);
          group.add(horse);
        }

        // Горки (американские горки — дуга)
        const trackMat = new THREE.MeshStandardMaterial({ color: 0xff6622, roughness: 0.4, metalness: 0.5 });
        // Опоры
        for (let tp = 0; tp < 5; tp++) {
          const tpH = 3 + Math.sin(tp * 0.8) * 4;
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.2, tpH, 6), wheelSpokeMat
          );
          pillar.position.set(sx - 10 + tp * 4, tpH / 2, sz + 8);
          group.add(pillar);
          // Рельс сверху
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.15, 0.8), trackMat
          );
          rail.position.set(sx - 10 + tp * 4, tpH, sz + 8);
          rail.rotation.z = tp < 4 ? (Math.sin((tp + 1) * 0.8) * 4 - Math.sin(tp * 0.8) * 4) * 0.06 : 0;
          group.add(rail);
        }

        // Входная арка
        const archMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4, metalness: 0.4 });
        const archL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), archMat);
        archL.position.set(sx - 3, 2.5, sz + spec.d / 2 + 1);
        group.add(archL);
        const archR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), archMat);
        archR.position.set(sx + 3, 2.5, sz + spec.d / 2 + 1);
        group.add(archR);
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 0.5), archMat);
        archTop.position.set(sx, 5.2, sz + spec.d / 2 + 1);
        group.add(archTop);

        // Гирлянды на арке
        const gColors = [0xff2222, 0x22ff22, 0x2222ff, 0xffff22, 0xff22ff];
        for (let gi = 0; gi < 10; gi++) {
          const gBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: gColors[gi % gColors.length] })
          );
          gBulb.position.set(sx - 2.8 + gi * 0.63, 5.5, sz + spec.d / 2 + 1.3);
          group.add(gBulb);
        }
      }

      // ==============================================================
      // КИНОТЕАТР
      // ==============================================================
      if (spec.name === 'cinema') {
        // Большой экран-вывеска на фасаде (светящийся)
        const screenMat = new THREE.MeshStandardMaterial({
          color: 0x111122, emissive: 0x221144, emissiveIntensity: 0.5,
        });
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.7, spec.h * 0.4, 0.15), screenMat
        );
        screen.position.set(sx, spec.h * 0.65, sz + spec.d / 2 + 0.1);
        group.add(screen);

        // «Афиша» — яркий прямоугольник на экране
        const posterMat = new THREE.MeshBasicMaterial({ color: 0x4422aa });
        const poster = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.5, spec.h * 0.25, 0.02), posterMat
        );
        poster.position.set(sx, spec.h * 0.65, sz + spec.d / 2 + 0.18);
        group.add(poster);

        // Неоновая рамка вокруг вывески
        const neonFrameMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
        // Верх
        const nfT = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.75, 0.12, 0.08), neonFrameMat);
        nfT.position.set(sx, spec.h * 0.85 + 0.2, sz + spec.d / 2 + 0.12);
        group.add(nfT);
        // Низ
        const nfB = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.75, 0.12, 0.08), neonFrameMat);
        nfB.position.set(sx, spec.h * 0.45 - 0.2, sz + spec.d / 2 + 0.12);
        group.add(nfB);
        // Бока
        for (const ns of [-1, 1]) {
          const nfS = new THREE.Mesh(new THREE.BoxGeometry(0.12, spec.h * 0.4 + 0.5, 0.08), neonFrameMat);
          nfS.position.set(sx + ns * spec.w * 0.375, spec.h * 0.65, sz + spec.d / 2 + 0.12);
          group.add(nfS);
        }

        // Козырёк у входа
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.6, 0.1, 3),
          new THREE.MeshStandardMaterial({ color: 0x332244, roughness: 0.4 })
        );
        canopy.position.set(sx, 3.5, sz + spec.d / 2 + 1.5);
        group.add(canopy);

        // Афишные стенды по бокам входа
        const standMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.4 });
        for (const ps of [-1, 1]) {
          const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.1), standMat);
          stand.position.set(sx + ps * (spec.w / 2 - 1.5), 1.0, sz + spec.d / 2 + 0.08);
          group.add(stand);
          // Яркий постер
          const miniPoster = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.5, 0.02),
            new THREE.MeshBasicMaterial({ color: ps > 0 ? 0xdd6622 : 0x2266dd })
          );
          miniPoster.position.set(sx + ps * (spec.w / 2 - 1.5), 1.0, sz + spec.d / 2 + 0.14);
          group.add(miniPoster);
        }

        // Бегущие огоньки по краю козырька
        const marqueeColors = [0xffdd00, 0xff4400, 0xffdd00, 0xff4400];
        for (let ml = 0; ml < 12; ml++) {
          const mBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshBasicMaterial({ color: marqueeColors[ml % marqueeColors.length] })
          );
          mBulb.position.set(
            sx - spec.w * 0.28 + ml * (spec.w * 0.56 / 11),
            3.45, sz + spec.d / 2 + 3.0
          );
          group.add(mBulb);
        }
      }

      // ==============================================================
      // СПОРТЗАЛ
      // ==============================================================
      if (spec.name === 'gym') {
        // Секционная крыша (полуцилиндр)
        const roofArcMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.4, metalness: 0.5 });
        const roofArc = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.w / 2, spec.w / 2, spec.d + 0.4, 16, 1, false, 0, Math.PI),
          roofArcMat
        );
        roofArc.position.set(sx, spec.h, sz);
        roofArc.rotation.z = Math.PI / 2;
        roofArc.rotation.y = Math.PI / 2;
        group.add(roofArc);

        // Баскетбольная площадка рядом
        const courtMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, roughness: 0.7 });
        const court = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 8), courtMat);
        court.position.set(sx, 0.03, sz + spec.d / 2 + 6);
        group.add(court);

        // Разметка площадки
        const courtLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        // Контур
        const clT = new THREE.Mesh(new THREE.BoxGeometry(12, 0.01, 0.08), courtLineMat);
        clT.position.set(sx, 0.06, sz + spec.d / 2 + 2.04);
        group.add(clT);
        const clB = new THREE.Mesh(new THREE.BoxGeometry(12, 0.01, 0.08), courtLineMat);
        clB.position.set(sx, 0.06, sz + spec.d / 2 + 9.96);
        group.add(clB);
        for (const cs of [-1, 1]) {
          const clS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 8), courtLineMat);
          clS.position.set(sx + cs * 5.96, 0.06, sz + spec.d / 2 + 6);
          group.add(clS);
        }
        // Центральная линия
        const clC = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 8), courtLineMat);
        clC.position.set(sx, 0.06, sz + spec.d / 2 + 6);
        group.add(clC);

        // Баскетбольные кольца (2)
        const hoopPostMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
        const hoopMat = new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.4, metalness: 0.3 });
        const backboardMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.2 });
        for (const hs of [-1, 1]) {
          // Столб
          const hPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.5, 6), hoopPostMat);
          hPost.position.set(sx + hs * 5.5, 1.75, sz + spec.d / 2 + 6);
          group.add(hPost);
          // Щит
          const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), backboardMat);
          backboard.position.set(sx + hs * 5.5, 3.2, sz + spec.d / 2 + 6);
          group.add(backboard);
          // Кольцо
          const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 12), hoopMat);
          hoop.position.set(sx + hs * 5.2, 3.0, sz + spec.d / 2 + 6);
          hoop.rotation.x = Math.PI / 2;
          group.add(hoop);
        }

        // Гантели-вывеска (декоративная)
        const dumbbellMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
        // Гриф
        const barbell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), dumbbellMat);
        barbell.position.set(sx, spec.h + 1.2, sz + spec.d / 2 + 0.08);
        barbell.rotation.z = Math.PI / 2;
        group.add(barbell);
        // Блины
        for (const ds of [-1, 1]) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 10), dumbbellMat);
          plate.position.set(sx + ds * 1.2, spec.h + 1.2, sz + spec.d / 2 + 0.08);
          plate.rotation.z = Math.PI / 2;
          group.add(plate);
        }
      }

      // ==============================================================
      // ПОЛИЦЕЙСКАЯ АКАДЕМИЯ
      // ==============================================================
      if (spec.name === 'police') {
        // Синяя полоса на фасаде
        const blueStripe = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w + 0.2, 0.8, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3, metalness: 0.4 })
        );
        blueStripe.position.set(sx, spec.h * 0.4, sz + spec.d / 2 + 0.05);
        group.add(blueStripe);

        // Звезда-значок (полицейский) на фасаде — шестиугольник
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.2, metalness: 0.7 });
        const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 6), badgeMat);
        badge.position.set(sx, spec.h - 1.5, sz + spec.d / 2 + 0.06);
        badge.rotation.x = Math.PI / 2;
        badge.rotation.z = Math.PI / 6;
        group.add(badge);
        // Внутренний круг
        const badgeInner = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16),
          new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3, metalness: 0.5 })
        );
        badgeInner.position.set(sx, spec.h - 1.5, sz + spec.d / 2 + 0.08);
        badgeInner.rotation.x = Math.PI / 2;
        group.add(badgeInner);

        // Флагштоки у входа (2 шт)
        const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });
        for (const fps of [-1, 1]) {
          const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 6), flagPoleMat);
          fp.position.set(sx + fps * (spec.w / 2 + 1.5), 3, sz + spec.d / 2 + 1);
          group.add(fp);
          // Флаг (синий прямоугольник)
          const flag = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.6 })
          );
          flag.position.set(sx + fps * (spec.w / 2 + 1.5) + fps * 0.6, 5.4, sz + spec.d / 2 + 1);
          group.add(flag);
        }

        // Забор/ограждение территории
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.5 });
        for (const fs of [-1, 1]) {
          const fence = new THREE.Mesh(
            new THREE.BoxGeometry(spec.w + 8, 1.8, 0.08), fenceMat
          );
          fence.position.set(sx, 0.9, sz + fs * (spec.d / 2 + 4));
          group.add(fence);
          // Колючая проволока сверху (тонкий цилиндр)
          const barbed = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, spec.w + 8, 4), wireMat2
          );
          barbed.position.set(sx, 1.85, sz + fs * (spec.d / 2 + 4));
          barbed.rotation.z = Math.PI / 2;
          group.add(barbed);
        }
        // Боковые заборы
        for (const fs of [-1, 1]) {
          const sfence = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.8, spec.d + 8), fenceMat
          );
          sfence.position.set(sx + fs * (spec.w / 2 + 4), 0.9, sz);
          group.add(sfence);
        }

        // Ворота (открытые — проём в переднем заборе)
        const gatePillarMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.4, metalness: 0.6 });
        for (const gs of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), gatePillarMat);
          pillar.position.set(sx + gs * 2.5, 1.25, sz + spec.d / 2 + 4);
          group.add(pillar);
        }
        // Перекладина ворот
        const gateBar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 0.3), gatePillarMat);
        gateBar.position.set(sx, 2.65, sz + spec.d / 2 + 4);
        group.add(gateBar);

        // Полицейские машины на стоянке (2 шт)
        const policeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.5 });
        const policeBlue = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3, metalness: 0.5 });
        for (let pc = 0; pc < 2; pc++) {
          const pcx = sx - 5 + pc * 6;
          const pcz = sz + spec.d / 2 + 7;
          // Корпус
          const pCarBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.0), policeMat);
          pCarBody.position.set(pcx, 0.55, pcz);
          pCarBody.castShadow = true;
          group.add(pCarBody);
          // Синяя полоса по бокам
          for (const pcs of [-1, 1]) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 3.5), policeBlue);
            stripe.position.set(pcx + pcs * 1.01, 0.55, pcz);
            group.add(stripe);
          }
          // Кабина
          const pCabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), policeMat);
          pCabin.position.set(pcx, 1.15, pcz - 0.3);
          group.add(pCabin);
          // Мигалка на крыше (красно-синяя)
          const sirenBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.1, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 })
          );
          sirenBase.position.set(pcx, 1.5, pcz - 0.3);
          group.add(sirenBase);
          // Красный огонь
          const redLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
          );
          redLight.position.set(pcx - 0.25, 1.58, pcz - 0.3);
          group.add(redLight);
          // Синий огонь
          const blueLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x2244ff })
          );
          blueLight.position.set(pcx + 0.25, 1.58, pcz - 0.3);
          group.add(blueLight);
          // Колёса
          const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 8);
          const wheelMat2 = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
          for (const wx of [-0.85, 0.85]) {
            for (const wz of [-1.1, 1.1]) {
              const w = new THREE.Mesh(wheelGeo, wheelMat2);
              w.rotation.z = Math.PI / 2;
              w.position.set(pcx + wx, 0.28, pcz + wz);
              group.add(w);
            }
          }
        }

        // Тренировочная площадка (за зданием)
        const courtMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.85 });
        const trainingCourt = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w - 4, 0.05, 8), courtMat
        );
        trainingCourt.position.set(sx, 0.03, sz - spec.d / 2 - 6);
        group.add(trainingCourt);

        // Полоса препятствий (упрощённая)
        const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.6, metalness: 0.2 });
        // Стена для перелезания
        const climbWall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.3), obstacleMat);
        climbWall.position.set(sx - 5, 1.25, sz - spec.d / 2 - 6);
        group.add(climbWall);
        bodies.push(physics.createStaticBox(
          new THREE.Vector3(sx - 5, 1.25, sz - spec.d / 2 - 6),
          new THREE.Vector3(4, 2.5, 0.3)
        ));
        // Брёвна (горизонтальные перекладины)
        for (let bl = 0; bl < 3; bl++) {
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 3, 6), obstacleMat
          );
          beam.position.set(sx + bl * 3, 1.5, sz - spec.d / 2 - 6);
          beam.rotation.z = Math.PI / 2;
          group.add(beam);
          // Стойки
          for (const bs of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), obstacleMat);
            post.position.set(sx + bl * 3 + bs * 1.5, 0.75, sz - spec.d / 2 - 6);
            group.add(post);
          }
        }
        // Мишени (для стрельбы)
        const targetMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
        const targetRedMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
        for (let tg = 0; tg < 3; tg++) {
          const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), poleMat);
          tPost.position.set(sx - 4 + tg * 4, 0.75, sz - spec.d / 2 - 10);
          group.add(tPost);
          // Белый круг
          const tBoard = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12), targetMat);
          tBoard.position.set(sx - 4 + tg * 4, 1.6, sz - spec.d / 2 - 10);
          tBoard.rotation.x = Math.PI / 2;
          group.add(tBoard);
          // Красный центр
          const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10), targetRedMat);
          bullseye.position.set(sx - 4 + tg * 4, 1.6, sz - spec.d / 2 - 9.97);
          bullseye.rotation.x = Math.PI / 2;
          group.add(bullseye);
        }

        // === ИНТЕРЬЕР: тюрьма + кабинет шефа ===
        const cellBarMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });
        const cellFloorMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.8 });
        const prisonerSkin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.75 });
        const prisonerClothes = new THREE.MeshStandardMaterial({ color: 0xff8822, roughness: 0.7 });
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.6 });

        // --- 3 камеры вдоль левой стены ---
        for (let ci = 0; ci < 3; ci++) {
          const cellX = sx - spec.w / 2 + 1.5;
          const cellZ = sz - 3 + ci * 4;
          const cellW = 3;
          const cellD = 3;

          // Пол камеры
          const cFloor = new THREE.Mesh(new THREE.BoxGeometry(cellW, 0.05, cellD), cellFloorMat);
          cFloor.position.set(cellX, 0.025, cellZ);
          group.add(cFloor);

          // Решётка (передняя стена камеры — вертикальные прутья)
          for (let br = 0; br < 6; br++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, spec.h - 0.5, 6), cellBarMat);
            bar.position.set(cellX + cellW / 2 - 0.1, spec.h / 2, cellZ - cellD / 2 + 0.3 + br * 0.5);
            group.add(bar);
          }
          // Горизонтальные перекладины
          for (const by of [1, 2, spec.h - 0.5]) {
            const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, cellD), cellBarMat);
            hBar.position.set(cellX + cellW / 2 - 0.1, by, cellZ);
            group.add(hBar);
          }

          // Нары (кровать в камере)
          const bunk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 })
          );
          bunk.position.set(cellX - 0.3, 0.5, cellZ + 0.8);
          group.add(bunk);

          // Преступник (сидит на нарах)
          // Голова
          const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), prisonerSkin);
          pHead.position.set(cellX - 0.3, 1.2, cellZ + 0.8);
          group.add(pHead);
          // Волосы (короткие)
          const pHair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
          );
          pHair.position.set(cellX - 0.3, 1.24, cellZ + 0.78);
          pHair.scale.set(1, 0.5, 1);
          group.add(pHair);
          // Тело (оранжевая роба)
          const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.2), prisonerClothes);
          pBody.position.set(cellX - 0.3, 0.88, cellZ + 0.8);
          group.add(pBody);
          // Ноги
          for (const ls of [-0.06, 0.06]) {
            const pLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.35, 6), prisonerClothes);
            pLeg.position.set(cellX - 0.3 + ls, 0.57, cellZ + 0.9);
            group.add(pLeg);
          }
          // Унитаз в углу (маленький)
          const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 8),
            new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.2 })
          );
          toilet.position.set(cellX - 1, 0.15, cellZ - 0.8);
          group.add(toilet);
        }

        // --- Кабинет шефа полиции (правая часть здания) ---
        const officeX = sx + spec.w / 2 - 4;
        const officeZ = sz;

        // Стены кабинета (3 стены, вход открыт)
        const offWallMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7 });
        // Задняя
        const owBack = new THREE.Mesh(new THREE.BoxGeometry(6, spec.h, 0.2), offWallMat);
        owBack.position.set(officeX, spec.h / 2, officeZ - 3);
        group.add(owBack);
        // Правая
        const owRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, spec.h, 6), offWallMat);
        owRight.position.set(officeX + 3, spec.h / 2, officeZ);
        group.add(owRight);
        // Левая (с проёмом-дверью)
        const owLeftTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, spec.h - 2.8, 6), offWallMat);
        owLeftTop.position.set(officeX - 3, spec.h - (spec.h - 2.8) / 2, officeZ);
        group.add(owLeftTop);

        // Пол кабинета (тёмный ковёр)
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.03, 5.5),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 })
        );
        carpet.position.set(officeX, 0.02, officeZ);
        group.add(carpet);

        // Стол шефа (большой, деревянный)
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.0), deskMat);
        desk.position.set(officeX, 0.75, officeZ - 1.5);
        group.add(desk);
        // Ножки стола
        for (const dx of [-0.8, 0.8]) {
          for (const dz of [-0.4, 0.4]) {
            const dLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), deskMat);
            dLeg.position.set(officeX + dx, 0.375, officeZ - 1.5 + dz);
            group.add(dLeg);
          }
        }

        // Предметы на столе
        // Компьютер (монитор)
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 });
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.04), monitorMat);
        monitor.position.set(officeX + 0.5, 1.0, officeZ - 1.7);
        group.add(monitor);
        const screen2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x1122aa, emissive: 0x112244, emissiveIntensity: 0.4 })
        );
        screen2.position.set(officeX + 0.5, 1.0, officeZ - 1.68);
        group.add(screen2);
        // Подставка монитора
        const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), monitorMat);
        monStand.position.set(officeX + 0.5, 0.86, officeZ - 1.7);
        group.add(monStand);

        // Настольная лампа
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8),
          new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.7 })
        );
        lampBase.position.set(officeX - 0.6, 0.8, officeZ - 1.3);
        group.add(lampBase);
        const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.7 })
        );
        lampArm.position.set(officeX - 0.6, 0.97, officeZ - 1.3);
        group.add(lampArm);
        const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 8),
          new THREE.MeshBasicMaterial({ color: 0xffddaa })
        );
        lampShade.position.set(officeX - 0.6, 1.15, officeZ - 1.3);
        group.add(lampShade);

        // Стопка бумаг
        const papers = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.28),
          new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 })
        );
        papers.position.set(officeX - 0.2, 0.8, officeZ - 1.4);
        group.add(papers);

        // Кресло шефа (за столом)
        const chairMat2 = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), chairMat2);
        chairSeat.position.set(officeX, 0.5, officeZ - 2.2);
        group.add(chairSeat);
        const chairBack2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), chairMat2);
        chairBack2.position.set(officeX, 0.85, officeZ - 2.45);
        group.add(chairBack2);

        // === НАЧАЛЬНИК ПОЛИЦИИ (сидит за столом) ===
        const chiefSkin = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.75 });
        const chiefUniform = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6 });
        const chiefHair = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.85 });

        // Голова
        const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), chiefSkin);
        cHead.position.set(officeX, 1.2, officeZ - 2.2);
        group.add(cHead);
        // Волосы (седые, короткие)
        const cHair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), chiefHair);
        cHair.position.set(officeX, 1.24, officeZ - 2.22);
        cHair.scale.set(1, 0.5, 1);
        group.add(cHair);
        // Глаза
        for (const es of [-1, 1]) {
          const cEye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
          );
          cEye.position.set(officeX + es * 0.035, 1.21, officeZ - 2.1);
          group.add(cEye);
        }
        // Тело (тёмно-синяя форма)
        const cBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.22), chiefUniform);
        cBody.position.set(officeX, 0.85, officeZ - 2.2);
        group.add(cBody);
        // Погоны (золотые)
        for (const ps of [-1, 1]) {
          const epaulette = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.3, metalness: 0.6 })
          );
          epaulette.position.set(officeX + ps * 0.16, 1.04, officeZ - 2.2);
          group.add(epaulette);
        }
        // Значок на груди
        const chiefBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 6),
          new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.2, metalness: 0.7 })
        );
        chiefBadge.position.set(officeX - 0.08, 0.95, officeZ - 2.08);
        chiefBadge.rotation.x = Math.PI / 2;
        group.add(chiefBadge);
        // Руки на столе
        for (const as of [-0.12, 0.12]) {
          const cArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.25, 6), chiefUniform);
          cArm.position.set(officeX + as, 0.78, officeZ - 1.8);
          cArm.rotation.x = -Math.PI / 3;
          group.add(cArm);
        }

        // Флаг в углу кабинета
        const flagPole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, spec.h - 1, 6),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 })
        );
        flagPole2.position.set(officeX + 2.2, (spec.h - 1) / 2, officeZ - 2.5);
        group.add(flagPole2);
        const flag2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.6 })
        );
        flag2.position.set(officeX + 2.2 + 0.4, spec.h - 1.3, officeZ - 2.5);
        group.add(flag2);

        // Шкаф с документами
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 })
        );
        cabinet.position.set(officeX + 2.2, 0.75, officeZ + 1);
        group.add(cabinet);
        // Ручки шкафа
        for (const cy of [0.4, 0.8, 1.2]) {
          const cHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 })
          );
          cHandle.position.set(officeX + 2.2, cy, officeZ + 1.21);
          group.add(cHandle);
        }

        // === СТОЛОВАЯ (задняя часть здания) ===
        const cantX = sx;
        const cantZ = sz - spec.d / 2 + 3;
        const cantMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.7 });

        // Пол столовой
        const cantFloor = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 2, 0.03, 5), cantMat);
        cantFloor.position.set(cantX, 0.015, cantZ);
        group.add(cantFloor);

        // Длинные столы (3 ряда)
        const cantTableMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.5 });
        for (let ct = 0; ct < 3; ct++) {
          const tX = cantX - 6 + ct * 6;
          // Стол
          const cTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.8), cantTableMat);
          cTable.position.set(tX, 0.75, cantZ);
          group.add(cTable);
          // Ножки
          for (const lx of [-1.3, 1.3]) {
            const tLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), cantTableMat);
            tLeg.position.set(tX + lx, 0.375, cantZ);
            group.add(tLeg);
          }
          // Лавки (по 2 на стол)
          for (const bSide of [-0.6, 0.6]) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 0.3), cantTableMat);
            bench.position.set(tX, 0.42, cantZ + bSide);
            group.add(bench);
          }
        }

        // Раздаточная стойка (задняя стена)
        const counterMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.4 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 4, 1.0, 0.6), counterMat);
        counter.position.set(cantX, 0.5, cantZ - 2.2);
        group.add(counter);

        // Подносы на стойке
        const trayMat = new THREE.MeshStandardMaterial({ color: 0xcc6633, roughness: 0.5 });
        for (let tr = 0; tr < 5; tr++) {
          const tray = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.25), trayMat);
          tray.position.set(cantX - 5 + tr * 2.5, 1.02, cantZ - 2.2);
          group.add(tray);
        }

        // Кастрюли
        const potMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
        for (let pt = 0; pt < 3; pt++) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8), potMat);
          pot.position.set(cantX - 3 + pt * 3, 1.15, cantZ - 2.2);
          group.add(pot);
        }

        // === ПОМЫВОЧНАЯ (между камерами и столовой) ===
        const showerX = sx - spec.w / 2 + 8;
        const showerZ = sz + 3;

        // Пол (кафель)
        const tileFl = new THREE.Mesh(new THREE.BoxGeometry(4, 0.03, 3),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.1 })
        );
        tileFl.position.set(showerX, 0.015, showerZ);
        group.add(tileFl);

        // Стены помывочной (3 стены)
        const showerWallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3 });
        const swBack = new THREE.Mesh(new THREE.BoxGeometry(4, spec.h, 0.15), showerWallMat);
        swBack.position.set(showerX, spec.h / 2, showerZ - 1.5);
        group.add(swBack);
        for (const ss of [-1, 1]) {
          const swSide = new THREE.Mesh(new THREE.BoxGeometry(0.15, spec.h, 3), showerWallMat);
          swSide.position.set(showerX + ss * 2, spec.h / 2, showerZ);
          group.add(swSide);
        }

        // Душевые лейки (3 шт на задней стене)
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 });
        for (let sh = 0; sh < 3; sh++) {
          // Труба
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), pipeMat);
          pipe.position.set(showerX - 1.2 + sh * 1.2, spec.h - 1.5, showerZ - 1.3);
          group.add(pipe);
          // Лейка
          const head2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.06, 8), pipeMat);
          head2.position.set(showerX - 1.2 + sh * 1.2, spec.h - 2.3, showerZ - 1.3);
          group.add(head2);
          // Вентиль
          const valve = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 8), pipeMat);
          valve.position.set(showerX - 1.2 + sh * 1.2, spec.h - 3.5, showerZ - 1.35);
          group.add(valve);
        }

        // Скамейка в помывочной
        const shBench = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.06, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 })
        );
        shBench.position.set(showerX, 0.4, showerZ + 1.0);
        group.add(shBench);

        // Сток в полу (решётка)
        const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 8),
          new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 })
        );
        drain.position.set(showerX, 0.03, showerZ);
        group.add(drain);
      }

      // ==============================================================
      // ЗООПАРК
      // ==============================================================
      if (spec.name === 'zoo') {
        // Зелёная территория
        const zooGrass = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w, 0.12, spec.d),
          new THREE.MeshStandardMaterial({ color: 0x44882a, roughness: 0.9 })
        );
        zooGrass.position.set(sx, 0.06, sz);
        group.add(zooGrass);

        // Дорожки (крест + кольцо)
        const zooPathMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.8 });
        const pathH2 = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 2, 0.02, 2), zooPathMat);
        pathH2.position.set(sx, 0.13, sz);
        group.add(pathH2);
        const pathV2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, spec.d - 2), zooPathMat);
        pathV2.position.set(sx, 0.13, sz);
        group.add(pathV2);

        // Забор по периметру
        const zooFenceMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.6, metalness: 0.2 });
        for (const fs of [-1, 1]) {
          const fH = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 2, 1.5, 0.1), zooFenceMat);
          fH.position.set(sx, 0.75, sz + fs * (spec.d / 2 + 1));
          group.add(fH);
          const fV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, spec.d + 2), zooFenceMat);
          fV.position.set(sx + fs * (spec.w / 2 + 1), 0.75, sz);
          group.add(fV);
        }

        // Входная арка
        const zooArchMat = new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.4 });
        for (const as of [-1, 1]) {
          const ap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), zooArchMat);
          ap.position.set(sx + as * 2.5, 1.75, sz + spec.d / 2 + 1);
          group.add(ap);
        }
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 0.4), zooArchMat);
        archTop.position.set(sx, 3.7, sz + spec.d / 2 + 1);
        group.add(archTop);

        // === ВОЛЬЕРЫ С ЖИВОТНЫМИ ===
        const vольерMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7, metalness: 0.3 });
        const waterMat2 = new THREE.MeshStandardMaterial({
          color: 0x4488bb, roughness: 0.1, transparent: true, opacity: 0.6,
        });
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.9 });

        // --- Вольер 1: Слон (левый верх) ---
        const e1x = sx - 8, e1z = sz - 5;
        // Ограда
        const fence1 = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.1), vольерMat);
        fence1.position.set(e1x, 0.6, e1z + 4); group.add(fence1);
        const fence1b = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.1), vольерMat);
        fence1b.position.set(e1x, 0.6, e1z - 4); group.add(fence1b);
        for (const fs of [-1, 1]) {
          const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 8), vольерMat);
          fSide.position.set(e1x + fs * 4, 0.6, e1z); group.add(fSide);
        }
        // Слон (серый большой блок + голова + хобот + ноги)
        const elephantMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
        // Тело
        const eBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 3.0), elephantMat);
        eBody.position.set(e1x, 1.0, e1z); group.add(eBody);
        // Голова
        const eHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), elephantMat);
        eHead.position.set(e1x, 1.3, e1z + 1.7); group.add(eHead);
        // Хобот
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 1.2, 6), elephantMat);
        trunk.position.set(e1x, 0.6, e1z + 2.2);
        trunk.rotation.x = 0.4; group.add(trunk);
        // Уши
        for (const es of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), elephantMat);
          ear.position.set(e1x + es * 0.7, 1.4, e1z + 1.5);
          ear.scale.set(0.3, 0.8, 0.6); group.add(ear);
        }
        // Ноги (4)
        for (const lx of [-0.6, 0.6]) {
          for (const lz of [-0.8, 0.8]) {
            const eLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), elephantMat);
            eLeg.position.set(e1x + lx, 0.35, e1z + lz); group.add(eLeg);
          }
        }
        // Бивни
        for (const bs of [-1, 1]) {
          const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.3 })
          );
          tusk.position.set(e1x + bs * 0.2, 0.9, e1z + 2.3);
          tusk.rotation.x = 0.5; group.add(tusk);
        }
        // Табличка
        const signMat2 = new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.4 });
        const sign1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), signMat2);
        sign1.position.set(e1x, 1.5, e1z + 4.1); group.add(sign1);

        // --- Вольер 2: Жираф (правый верх) ---
        const g1x = sx + 8, g1z = sz - 5;
        const fence2 = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.1), vольерMat);
        fence2.position.set(g1x, 0.6, g1z + 4); group.add(fence2);
        const fence2b = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.1), vольерMat);
        fence2b.position.set(g1x, 0.6, g1z - 4); group.add(fence2b);
        for (const fs of [-1, 1]) {
          const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 8), vольерMat);
          fSide.position.set(g1x + fs * 4, 0.6, g1z); group.add(fSide);
        }
        // Жираф (жёлтый с пятнами)
        const giraffeMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.7 });
        const spotMat = new THREE.MeshStandardMaterial({ color: 0x885522, roughness: 0.7 });
        // Тело
        const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.8), giraffeMat);
        gBody.position.set(g1x, 1.8, g1z); group.add(gBody);
        // Шея (длинная!)
        const gNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.5, 8), giraffeMat);
        gNeck.position.set(g1x, 3.2, g1z + 0.7);
        gNeck.rotation.x = -0.2; group.add(gNeck);
        // Голова
        const gHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.5), giraffeMat);
        gHead.position.set(g1x, 4.4, g1z + 0.9); group.add(gHead);
        // Рожки
        for (const hs of [-1, 1]) {
          const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), giraffeMat);
          horn.position.set(g1x + hs * 0.08, 4.65, g1z + 0.85); group.add(horn);
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), spotMat);
          tip.position.set(g1x + hs * 0.08, 4.78, g1z + 0.85); group.add(tip);
        }
        // Пятна на теле
        for (let sp = 0; sp < 5; sp++) {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), spotMat);
          spot.position.set(
            g1x + (Math.random() - 0.5) * 0.6,
            1.8 + (Math.random() - 0.5) * 0.6,
            g1z + (Math.random() - 0.5) * 1.2
          );
          spot.scale.set(1, 0.5, 1); group.add(spot);
        }
        // Ноги
        for (const lx of [-0.25, 0.25]) {
          for (const lz of [-0.6, 0.6]) {
            const gLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), giraffeMat);
            gLeg.position.set(g1x + lx, 0.7, g1z + lz); group.add(gLeg);
          }
        }
        // Табличка
        const sign2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), signMat2);
        sign2.position.set(g1x, 1.5, g1z + 4.1); group.add(sign2);

        // --- Вольер 3: Пингвины с водой (центр-низ) ---
        const p1x = sx, p1z = sz + 6;
        const fence3 = new THREE.Mesh(new THREE.BoxGeometry(10, 1.0, 0.1), vольерMat);
        fence3.position.set(p1x, 0.5, p1z + 4); group.add(fence3);
        const fence3b = new THREE.Mesh(new THREE.BoxGeometry(10, 1.0, 0.1), vольерMat);
        fence3b.position.set(p1x, 0.5, p1z - 4); group.add(fence3b);
        for (const fs of [-1, 1]) {
          const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 8), vольерMat);
          fSide.position.set(p1x + fs * 5, 0.5, p1z); group.add(fSide);
        }
        // Бассейн
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.15, 16), waterMat2);
        pool.position.set(p1x + 1.5, 0.15, p1z); group.add(pool);
        // Камни
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
        for (let r = 0; r < 4; r++) {
          const rock = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 5, 5), rockMat);
          rock.position.set(p1x - 2 + r * 0.8, 0.25, p1z - 2 + Math.random());
          rock.scale.set(1, 0.6, 1); group.add(rock);
        }
        // Пингвины (5 штук — чёрно-белые)
        const penguinBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
        const penguinWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
        const penguinBeak = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.5 });
        for (let pg = 0; pg < 5; pg++) {
          const pgx = p1x - 2 + pg * 1.2;
          const pgz = p1z + 1 + (pg % 2) * 0.5;
          // Тело
          const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.4, 8), penguinBlack);
          pBody.position.set(pgx, 0.35, pgz); group.add(pBody);
          // Живот
          const pBelly = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.3, 8), penguinWhite);
          pBelly.position.set(pgx, 0.35, pgz + 0.03); group.add(pBelly);
          // Голова
          const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), penguinBlack);
          pHead.position.set(pgx, 0.6, pgz); group.add(pHead);
          // Клюв
          const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), penguinBeak);
          beak.position.set(pgx, 0.58, pgz + 0.09);
          beak.rotation.x = Math.PI / 2; group.add(beak);
          // Глаза
          for (const es of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), penguinWhite);
            eye.position.set(pgx + es * 0.04, 0.62, pgz + 0.06); group.add(eye);
          }
        }
        // Табличка
        const sign3 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), signMat2);
        sign3.position.set(p1x, 1.2, p1z + 4.1); group.add(sign3);

        // Деревья в зоопарке
        const zooTreeMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });
        const zooLeafMat = new THREE.MeshStandardMaterial({ color: 0x338822, roughness: 0.75 });
        for (const tp of [
          { x: sx - 12, z: sz - 10 }, { x: sx + 12, z: sz - 10 },
          { x: sx - 12, z: sz + 10 }, { x: sx + 12, z: sz + 10 },
        ]) {
          const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4, 6), zooTreeMat);
          tr.position.set(tp.x, 2, tp.z); group.add(tr);
          const cr = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), zooLeafMat);
          cr.position.set(tp.x, 4.5, tp.z); group.add(cr);
        }

        // Скамейки для посетителей
        const benchMat2 = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.7 });
        for (const bp of [
          { x: sx - 5, z: sz + 1 }, { x: sx + 5, z: sz + 1 },
        ]) {
          const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.4), benchMat2);
          seat.position.set(bp.x, 0.45, bp.z); group.add(seat);
          const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.05), benchMat2);
          back.position.set(bp.x, 0.7, bp.z - 0.18); group.add(back);
        }
      }

      // ==============================================================
      // НЫЖИ (небоскрёб-игла)
      // ==============================================================
      if (spec.name === 'nyji') {
        // Стеклянный фасад (полупрозрачный, голубой)
        const glassFacadeMat = new THREE.MeshPhysicalMaterial({
          color: 0x88bbdd, roughness: 0.05, metalness: 0.3,
          transparent: true, opacity: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.05,
        });

        // Стеклянные панели на всех 4 сторонах
        for (const side of [
          { rx: 0, rz: 0, px: 0, pz: spec.d / 2 + 0.05 },
          { rx: 0, rz: Math.PI, px: 0, pz: -spec.d / 2 - 0.05 },
          { rx: 0, rz: Math.PI / 2, px: spec.w / 2 + 0.05, pz: 0 },
          { rx: 0, rz: -Math.PI / 2, px: -spec.w / 2 - 0.05, pz: 0 },
        ]) {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(spec.w * 0.95, spec.h * 0.95, 0.05), glassFacadeMat
          );
          panel.position.set(sx + side.px, spec.h / 2, sz + side.pz);
          panel.rotation.y = side.rz;
          group.add(panel);
        }

        // Скручивание — вертикальные рёбра (как у настоящего Ныжи)
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xaaccdd, roughness: 0.2, metalness: 0.7 });
        for (let r = 0; r < 8; r++) {
          const angle = (r / 8) * Math.PI * 2;
          const twist = 0.3; // поворот на высоту
          for (let seg = 0; seg < 10; seg++) {
            const segH = spec.h / 10;
            const y = seg * segH + segH / 2;
            const a = angle + seg * twist * 0.1;
            const radius = (spec.w / 2 - 0.5) * (1 - seg * 0.03); // сужается кверху
            const rib = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, segH, 0.08), ribMat
            );
            rib.position.set(sx + Math.cos(a) * radius, y, sz + Math.sin(a) * radius);
            group.add(rib);
          }
        }

        // Шпиль на вершине
        const spireM = new THREE.MeshStandardMaterial({ color: 0xccddee, roughness: 0.15, metalness: 0.8 });
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, 15, 8), spireM);
        spire.position.set(sx, spec.h + 7.5, sz);
        group.add(spire);

        // Шар на шпиле
        const spireTop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x22ccff })
        );
        spireTop.position.set(sx, spec.h + 15.3, sz);
        group.add(spireTop);

        // Авиационные огни (красные мигающие)
        for (const ah of [spec.h * 0.5, spec.h * 0.75, spec.h]) {
          for (const as2 of [-1, 1]) {
            const avLight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xff2222 })
            );
            avLight.position.set(sx + as2 * (spec.w / 2 + 0.1), ah, sz);
            group.add(avLight);
          }
        }

        // Неоновые горизонтальные полосы (каждые 10м)
        const lkNeonMat = new THREE.MeshBasicMaterial({ color: 0x22ccff });
        for (let nh = 10; nh < spec.h; nh += 10) {
          for (const ns of [-1, 1]) {
            const nStrip = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 1, 0.08, 0.04), lkNeonMat);
            nStrip.position.set(sx, nh, sz + ns * (spec.d / 2 + 0.03));
            group.add(nStrip);
          }
        }

        // === Жёлтая афиша «2148» на фасаде ===
        const posterCanvas = document.createElement('canvas');
        posterCanvas.width = 1024;
        posterCanvas.height = 512;
        const ctx2 = posterCanvas.getContext('2d')!;
        // Жёлтый фон
        ctx2.fillStyle = '#ffcc00';
        ctx2.fillRect(0, 0, 1024, 512);
        // Рамка
        ctx2.strokeStyle = '#aa8800';
        ctx2.lineWidth = 12;
        ctx2.strokeRect(6, 6, 1012, 500);
        // Текст «2148»
        ctx2.fillStyle = '#1a1a2e';
        ctx2.font = 'bold 260px Arial';
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        ctx2.fillText('2148', 512, 256);
        const posterTex = new THREE.CanvasTexture(posterCanvas);
        const posterMat2 = new THREE.MeshStandardMaterial({
          map: posterTex,
          emissive: 0xffcc00,
          emissiveIntensity: 0.3,
          roughness: 0.3,
          metalness: 0.1,
        });
        const pW = spec.w * 0.8;
        const pH = pW * 0.5;
        const posterY = spec.h * 0.55; // чуть выше середины
        const poster = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, 0.08), posterMat2);
        poster.position.set(sx, posterY, sz + spec.d / 2 + 0.1);
        group.add(poster);

        // Площадь перед зданием (тёмный гранит)
        const plazaMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.3, metalness: 0.4 });
        const plaza = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 10, 0.05, spec.d + 10), plazaMat);
        plaza.position.set(sx, 0.025, sz);
        group.add(plaza);

        // Фонтан перед входом
        const fountMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.2, metalness: 0.6 });
        const fountBase = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.5, 16), fountMat);
        fountBase.position.set(sx, 0.25, sz + spec.d / 2 + 4);
        group.add(fountBase);
        const fountWater = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.05, transparent: true, opacity: 0.5 })
        );
        fountWater.position.set(sx, 0.48, sz + spec.d / 2 + 4);
        group.add(fountWater);

        // Свет от здания
        const lkLight = new THREE.PointLight(0x22ccff, 2, 30);
        lkLight.position.set(sx, spec.h / 2, sz + spec.d / 2 + 2);
        lights.push(lkLight);

        // === ИНТЕРЬЕР НЕБОСКРЁБА ===
        const lkFloorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.35, metalness: 0.3 });
        const lkWallMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4, metalness: 0.3 });
        const lkLiftMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.2, metalness: 0.7 });
        const lkDoorMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.3, metalness: 0.5 });
        const lkToiletMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.2 });
        const lkTileMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.25 });
        const lkNeon2 = new THREE.MeshBasicMaterial({ color: 0x22ccff });

        const lkFloorH = 4; // высота этажа
        const lkFloors = Math.floor(spec.h / lkFloorH);
        const lkInW = spec.w - 1; // внутренняя ширина
        const lkInD = spec.d - 1;

        // Лифтовая шахта (центр здания)
        const lkLiftW = 2.5, lkLiftD = 2.5;
        for (const ls of [
          { x: sx, z: sz - lkLiftD / 2, w: lkLiftW + 0.2, d: 0.15 },
          { x: sx - lkLiftW / 2, z: sz, w: 0.15, d: lkLiftD },
          { x: sx + lkLiftW / 2, z: sz, w: 0.15, d: lkLiftD },
        ]) {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(ls.w, spec.h, ls.d), lkLiftMat);
          sw.position.set(ls.x, spec.h / 2, ls.z);
          group.add(sw);
          bodies.push(physics.createStaticBox(new THREE.Vector3(ls.x, spec.h / 2, ls.z), new THREE.Vector3(ls.w, spec.h, ls.d)));
        }

        // Этажи
        for (let fl = 0; fl < lkFloors; fl++) {
          const fy = fl * lkFloorH;

          // Перекрытие
          const slab = new THREE.Mesh(new THREE.BoxGeometry(lkInW, 0.15, lkInD), lkFloorMat);
          slab.position.set(sx, fy + 0.075, sz);
          group.add(slab);
          bodies.push(physics.createStaticBox(new THREE.Vector3(sx, fy + 0.075, sz), new THREE.Vector3(lkInW, 0.15, lkInD)));

          // Дверь лифта
          const liftD2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.06), lkLiftMat);
          liftD2.position.set(sx, fy + 1.4, sz + lkLiftD / 2 + 0.08);
          group.add(liftD2);

          // Неоновая полоска на полу коридора
          const corridorNeon = new THREE.Mesh(new THREE.BoxGeometry(lkInW - 3, 0.02, 0.08), lkNeon2);
          corridorNeon.position.set(sx, fy + 0.16, sz + 2);
          group.add(corridorNeon);

          // === Туалет (в углу каждого этажа) ===
          const wcX = sx + lkInW / 2 - 2;
          const wcZ = sz - lkInD / 2 + 2;

          // Стены туалета (2 стены)
          const wcWall1 = new THREE.Mesh(new THREE.BoxGeometry(3, lkFloorH - 0.5, 0.12), lkTileMat);
          wcWall1.position.set(wcX, fy + lkFloorH / 2, wcZ - 1.5);
          group.add(wcWall1);
          const wcWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, lkFloorH - 0.5, 3), lkTileMat);
          wcWall2.position.set(wcX - 1.5, fy + lkFloorH / 2, wcZ);
          group.add(wcWall2);

          // Пол туалета (белый кафель)
          const wcFloor = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 3), lkTileMat);
          wcFloor.position.set(wcX, fy + 0.16, wcZ);
          group.add(wcFloor);

          // Унитаз
          const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.35, 8), lkToiletMat);
          toilet.position.set(wcX + 0.5, fy + 0.33, wcZ - 0.8);
          group.add(toilet);
          // Бачок
          const tank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.15), lkToiletMat);
          tank.position.set(wcX + 0.5, fy + 0.55, wcZ - 1.1);
          group.add(tank);

          // Раковина
          const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.08, 8), lkToiletMat);
          sink.position.set(wcX + 0.5, fy + 0.8, wcZ + 0.3);
          group.add(sink);
          // Кран
          const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 })
          );
          faucet.position.set(wcX + 0.5, fy + 0.9, wcZ + 0.2);
          faucet.rotation.x = -0.5;
          group.add(faucet);

          // Зеркало
          const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.02),
            new THREE.MeshPhysicalMaterial({ color: 0xaaccdd, roughness: 0.02, metalness: 0.5, clearcoat: 1.0 })
          );
          mirror.position.set(wcX + 0.5, fy + 1.3, wcZ - 1.38);
          group.add(mirror);

          // Дверь туалета
          const wcDoor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.06), lkDoorMat);
          wcDoor.position.set(wcX - 1.0, fy + 1.25, wcZ + 1.5);
          group.add(wcDoor);

          // Знак WC
          const wcSign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.02), lkNeon2);
          wcSign.position.set(wcX - 1.0, fy + 2.5, wcZ + 1.52);
          group.add(wcSign);
        }

        // === КАБИНЕТ НАЧАЛЬНИКА ПОЛИЦИИ (1 этаж, левый угол) ===
        const offX = sx - lkInW / 2 + 2.5;
        const offZ = sz + lkInD / 2 - 2.5;
        const offY = 0.15; // на полу 1 этажа

        // Стены кабинета (2 стены)
        const offWallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a38, roughness: 0.5, metalness: 0.3 });
        const offW1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 0.12), offWallMat);
        offW1.position.set(offX, offY + 1.75, offZ - 2);
        group.add(offW1);
        const offW2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 4), offWallMat);
        offW2.position.set(offX + 2, offY + 1.75, offZ);
        group.add(offW2);

        // Ковёр
        const offCarpet = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.02, 3.5),
          new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.9 })
        );
        offCarpet.position.set(offX, offY + 0.01, offZ);
        group.add(offCarpet);

        // Стол (большой, тёмный, футуристический)
        const offDeskMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.5 });
        const offDesk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.0), offDeskMat);
        offDesk.position.set(offX, offY + 0.76, offZ - 1.2);
        group.add(offDesk);
        // Ножки стола
        for (const dx of [-0.8, 0.8]) {
          const dLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), offDeskMat);
          dLeg.position.set(offX + dx, offY + 0.38, offZ - 1.2);
          group.add(dLeg);
        }

        // Монитор на столе (голографический экран)
        const holoScreen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x22ccff, emissive: 0x114466, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 })
        );
        holoScreen.position.set(offX + 0.4, offY + 1.1, offZ - 1.4);
        group.add(holoScreen);

        // Настольная лампа
        const lampB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 8),
          new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.3, metalness: 0.6 })
        );
        lampB.position.set(offX - 0.6, offY + 0.8, offZ - 1.0);
        group.add(lampB);
        const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 8),
          new THREE.MeshBasicMaterial({ color: 0x22ccff })
        );
        lampShade.position.set(offX - 0.6, offY + 1.15, offZ - 1.0);
        group.add(lampShade);

        // Кресло
        const chairM = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5 });
        const offChairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), chairM);
        offChairSeat.position.set(offX, offY + 0.5, offZ - 1.8);
        group.add(offChairSeat);
        const offChairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), chairM);
        offChairBack.position.set(offX, offY + 0.82, offZ - 2.03);
        group.add(offChairBack);

        // === НАЧАЛЬНИК ПОЛИЦИИ ===
        const chiefSkin2 = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.75 });
        const chiefUni2 = new THREE.MeshStandardMaterial({ color: 0x1a2244, roughness: 0.6 });
        const chiefHair2 = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85 });

        // Голова
        const ch2Head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), chiefSkin2);
        ch2Head.position.set(offX, offY + 1.2, offZ - 1.8);
        group.add(ch2Head);
        // Волосы
        const ch2Hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), chiefHair2);
        ch2Hair.position.set(offX, offY + 1.24, offZ - 1.82);
        ch2Hair.scale.set(1, 0.5, 1);
        group.add(ch2Hair);
        // Глаза
        for (const es of [-1, 1]) {
          const ch2Eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
          );
          ch2Eye.position.set(offX + es * 0.035, offY + 1.21, offZ - 1.7);
          group.add(ch2Eye);
        }
        // Тело (форма)
        const ch2Body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.22), chiefUni2);
        ch2Body.position.set(offX, offY + 0.85, offZ - 1.8);
        group.add(ch2Body);
        // Погоны
        for (const ps of [-1, 1]) {
          const epaulette = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.3, metalness: 0.6 })
          );
          epaulette.position.set(offX + ps * 0.16, offY + 1.04, offZ - 1.8);
          group.add(epaulette);
        }
        // Значок
        const ch2Badge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 6),
          new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.2, metalness: 0.7 })
        );
        ch2Badge.position.set(offX - 0.08, offY + 0.95, offZ - 1.68);
        ch2Badge.rotation.x = Math.PI / 2;
        group.add(ch2Badge);
        // Руки на столе
        for (const as of [-0.12, 0.12]) {
          const ch2Arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.25, 6), chiefUni2);
          ch2Arm.position.set(offX + as, offY + 0.78, offZ - 1.5);
          ch2Arm.rotation.x = -Math.PI / 3;
          group.add(ch2Arm);
        }

        // Табличка "НАЧАЛЬНИК" (неон)
        const nameplate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.02), lkNeon2);
        nameplate.position.set(offX, offY + 0.82, offZ - 0.65);
        group.add(nameplate);

        // === 2 ЭТАЖ — РЕСТОРАН ===
        const fl2Y = lkFloorH + 0.15;
        const restTableMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.4 });
        const clothMat2 = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.6 });

        // 4 стола с белыми скатертями
        for (let rt = 0; rt < 4; rt++) {
          const rtx = sx - 3 + rt * 2.5;
          const rtz = sz + 2;
          const rtLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 6), restTableMat);
          rtLeg.position.set(rtx, fl2Y + 0.35, rtz);
          group.add(rtLeg);
          const rtTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), clothMat2);
          rtTop.position.set(rtx, fl2Y + 0.72, rtz);
          group.add(rtTop);
          // Свеча
          const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6),
            new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.8 })
          );
          candle.position.set(rtx, fl2Y + 0.78, rtz);
          group.add(candle);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xffaa22 })
          );
          flame.position.set(rtx, fl2Y + 0.84, rtz);
          group.add(flame);
        }

        // Барная стойка
        const barMat = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.3, metalness: 0.5 });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(lkInW - 3, 1.1, 0.6), barMat);
        bar.position.set(sx, fl2Y + 0.55, sz - lkInD / 2 + 1.5);
        group.add(bar);

        // Бутылки на полке за баром
        const bottleMat = new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 });
        for (let bt = 0; bt < 5; bt++) {
          const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), bottleMat);
          bottle.position.set(sx - 2.5 + bt * 1.2, fl2Y + 1.3, sz - lkInD / 2 + 1.0);
          group.add(bottle);
        }

        // Неон "РЕСТОРАН"
        const restSign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xff2266 })
        );
        restSign.position.set(sx, fl2Y + 3.2, sz + lkInD / 2 - 0.6);
        group.add(restSign);

        // === 3 ЭТАЖ — СПОРТЗАЛ ===
        const fl3Y = lkFloorH * 2 + 0.15;

        // Беговая дорожка (2 шт)
        const treadmillMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.4, metalness: 0.5 });
        for (let tm = 0; tm < 2; tm++) {
          const tmx = sx - 2 + tm * 4;
          // Основание
          const tmBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 2.0), treadmillMat);
          tmBase.position.set(tmx, fl3Y + 0.15, sz + 2);
          group.add(tmBase);
          // Лента (тёмная)
          const tmBelt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 1.6),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 })
          );
          tmBelt.position.set(tmx, fl3Y + 0.24, sz + 2);
          group.add(tmBelt);
          // Панель управления
          const tmPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x112233, emissiveIntensity: 0.3 })
          );
          tmPanel.position.set(tmx, fl3Y + 1.1, sz + 1.02);
          group.add(tmPanel);
          // Поручни
          for (const hs of [-0.3, 0.3]) {
            const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), treadmillMat);
            rail.position.set(tmx + hs, fl3Y + 0.7, sz + 1.2);
            rail.rotation.x = -0.2;
            group.add(rail);
          }
        }

        // Гантели на стойке
        const dumbMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.3, metalness: 0.7 });
        const rackBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.4), treadmillMat);
        rackBase.position.set(sx, fl3Y + 0.5, sz - lkInD / 2 + 1.5);
        group.add(rackBase);
        for (let d = 0; d < 4; d++) {
          // Гриф
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), dumbMat);
          grip.position.set(sx - 0.6 + d * 0.4, fl3Y + 0.85, sz - lkInD / 2 + 1.5);
          grip.rotation.z = Math.PI / 2;
          group.add(grip);
          // Блины
          for (const ds of [-0.12, 0.12]) {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.04 + d * 0.01, 0.04 + d * 0.01, 0.04, 8), dumbMat);
            plate.position.set(sx - 0.6 + d * 0.4 + ds, fl3Y + 0.85, sz - lkInD / 2 + 1.5);
            plate.rotation.z = Math.PI / 2;
            group.add(plate);
          }
        }

        // Боксёрская груша
        const bagChain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4),
          new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 })
        );
        bagChain.position.set(sx + 3, fl3Y + 3.3, sz - 1);
        group.add(bagChain);
        const punchBag = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.7 })
        );
        punchBag.position.set(sx + 3, fl3Y + 2.65, sz - 1);
        group.add(punchBag);

        // Неон "СПОРТЗАЛ"
        const gymSign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x22ffcc })
        );
        gymSign.position.set(sx, fl3Y + 3.2, sz + lkInD / 2 - 0.6);
        group.add(gymSign);

        // === 4 ЭТАЖ — КИНОЗАЛ ===
        const fl4Y = lkFloorH * 3 + 0.15;

        // Экран (большой, светящийся)
        const screenMat2 = new THREE.MeshStandardMaterial({
          color: 0x111122, emissive: 0x221144, emissiveIntensity: 0.6,
        });
        const cinemaScreen = new THREE.Mesh(new THREE.BoxGeometry(lkInW - 2, 3, 0.1), screenMat2);
        cinemaScreen.position.set(sx, fl4Y + 2, sz - lkInD / 2 + 1);
        group.add(cinemaScreen);

        // Ряды кресел (3 ряда по 4 кресла)
        const seatMat2 = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.6 });
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const seatX = sx - 2.5 + col * 1.8;
            const seatZ = sz - 0.5 + row * 1.5;
            // Сиденье
            const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), seatMat2);
            cSeat.position.set(seatX, fl4Y + 0.42, seatZ);
            group.add(cSeat);
            // Спинка
            const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), seatMat2);
            cBack.position.set(seatX, fl4Y + 0.7, seatZ + 0.22);
            group.add(cBack);
            // Подлокотники
            for (const arm of [-0.25, 0.25]) {
              const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.4),
                new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.5 })
              );
              cArm.position.set(seatX + arm, fl4Y + 0.52, seatZ);
              group.add(cArm);
            }
          }
        }

        // Неон "КИНО"
        const cinemaSign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xcc44ff })
        );
        cinemaSign.position.set(sx, fl4Y + 3.2, sz + lkInD / 2 - 0.6);
        group.add(cinemaSign);
      }
    }
  }

  // ================================================================
  // === ДОРОГИ: разметка, знаки, пешеходные переходы, фонари, машины ===
  // ================================================================
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xddcc33 });
  const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  const signPostMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.3, metalness: 0.5 });
  const signRedMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3, metalness: 0.5 });
  const signWhiteMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.3 });
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
  const carBodyMats = [
    new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x225588, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xcccc44, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 }),
  ];
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88bbdd, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.5,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffdd });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

  const roadRng = new CityRNG(77777 + seedOffset);
  const trafficLightsArr: TrafficLight[] = [];
  const movingCarsArr: MovingCar[] = [];

  // Дороги проходят между районами (по сетке)
  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;

      // === Дорожная разметка (центральная двойная жёлтая линия) ===
      // Горизонтальная дорога (вдоль X) на южной границе района
      const roadZ = cz - DIST / 2;
      for (let i = -1; i <= 1; i += 2) {
        const centerLine = new THREE.Mesh(
          new THREE.BoxGeometry(DIST * 0.9, 0.01, 0.12), yellowLineMat
        );
        centerLine.position.set(cx, 0.16, roadZ + i * 0.4);
        group.add(centerLine);
      }

      // Пунктирная белая разметка полос
      for (let d = 0; d < 8; d++) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.01, 0.1), lineMat
        );
        dash.position.set(cx - 24 + d * 7, 0.16, roadZ + 2.5);
        group.add(dash);

        const dash2 = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.01, 0.1), lineMat
        );
        dash2.position.set(cx - 24 + d * 7, 0.16, roadZ - 2.5);
        group.add(dash2);
      }

      // Вертикальная дорога (вдоль Z) на западной границе
      const roadX = cx - DIST / 2;
      for (let i = -1; i <= 1; i += 2) {
        const centerLineV = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.01, DIST * 0.9), yellowLineMat
        );
        centerLineV.position.set(roadX + i * 0.4, 0.16, cz);
        group.add(centerLineV);
      }

      // === Пешеходный переход (зебра) на перекрёстке ===
      const crossX = cx - DIST / 2;
      const crossZ = cz - DIST / 2;

      // Зебра по горизонтали
      for (let s = 0; s < 6; s++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.01, 4), crosswalkMat
        );
        stripe.position.set(crossX - 2.5 + s * 1.0, 0.16, crossZ);
        group.add(stripe);
      }

      // Зебра по вертикали
      for (let s = 0; s < 6; s++) {
        const stripeV = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.01, 0.6), crosswalkMat
        );
        stripeV.position.set(crossX, 0.16, crossZ - 2.5 + s * 1.0);
        group.add(stripeV);
      }

      // === Светофоры на перекрёстке (4 штуки — по углам) ===
      const tlPostMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.7 });
      const tlBoxMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.5 });
      const tlOffMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
      const tlRedMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const tlYellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
      const tlGreenMat = new THREE.MeshBasicMaterial({ color: 0x22ff44 });

      const tlCorners = [
        { x: crossX + 5, z: crossZ + 5 },
        { x: crossX - 5, z: crossZ + 5 },
        { x: crossX + 5, z: crossZ - 5 },
        { x: crossX - 5, z: crossZ - 5 },
      ];

      for (let tc = 0; tc < Math.min(2, tlCorners.length); tc++) {
        const tl = tlCorners[tc];
        // Столб
        const tlPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), tlPostMat);
        tlPole.position.set(tl.x, 2, tl.z);
        group.add(tlPole);
        // Коробка светофора
        const tlBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.25), tlBoxMat);
        tlBox.position.set(tl.x, 4.2, tl.z);
        group.add(tlBox);
        // Козырьки над огнями
        for (let li = 0; li < 3; li++) {
          const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.12), tlBoxMat);
          visor.position.set(tl.x, 4.52 - li * 0.32, tl.z + 0.18);
          group.add(visor);
        }
        // Красный
        const red = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), tc === 0 ? tlRedMat : tlOffMat);
        red.position.set(tl.x, 4.5, tl.z + 0.13);
        group.add(red);
        // Жёлтый
        const yellow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), tlOffMat);
        yellow.position.set(tl.x, 4.2, tl.z + 0.13);
        group.add(yellow);
        // Зелёный
        const green = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), tc === 0 ? tlOffMat : tlGreenMat);
        green.position.set(tl.x, 3.9, tl.z + 0.13);
        group.add(green);

        trafficLightsArr.push({ redMesh: red, yellowMesh: yellow, greenMesh: green, phase: tc * 0.5 });
      }

      // === Дорожные знаки ===
      if (gx % 2 === 0 && gz % 2 === 0) {
        // Знак «СТОП» на перекрёстке
        const stopPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 3, 6), signPostMat
        );
        stopPost.position.set(crossX + 4, 1.5, crossZ + 4);
        group.add(stopPost);

        const stopSign = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8), signRedMat
        );
        stopSign.position.set(crossX + 4, 3.0, crossZ + 4);
        stopSign.rotation.x = Math.PI / 2;
        group.add(stopSign);

        // Белая полоса на знаке (имитация надписи)
        const stopText = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.15, 0.06), signWhiteMat
        );
        stopText.position.set(crossX + 4, 3.0, crossZ + 4.03);
        group.add(stopText);
      }

      if (gx % 2 === 1 && gz % 2 === 1) {
        // Указатель направления (синий прямоугольник)
        const dirPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 3.5, 6), signPostMat
        );
        dirPost.position.set(crossX - 4, 1.75, crossZ - 4);
        group.add(dirPost);

        const dirSign = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.4, 0.05), signMat
        );
        dirSign.position.set(crossX - 4, 3.4, crossZ - 4);
        group.add(dirSign);

        // Белая стрелка (упрощённая — треугольник)
        const arrow = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.08, 0.06), signWhiteMat
        );
        arrow.position.set(crossX - 4, 3.4, crossZ - 3.97);
        group.add(arrow);
      }

      // Знак «пешеходный переход» (треугольник на столбе)
      if ((gx + gz) % 3 === 0) {
        const pedPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), signPostMat
        );
        pedPost.position.set(crossX + 5, 1.4, crossZ - 3);
        group.add(pedPost);

        // Треугольный знак (упрощённо — ромб)
        const pedSign = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.6, 0.04), signWhiteMat
        );
        pedSign.position.set(crossX + 5, 2.9, crossZ - 3);
        pedSign.rotation.z = Math.PI / 4;
        group.add(pedSign);

        // Синяя рамка
        const pedFrame = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.05), signMat
        );
        pedFrame.position.set(crossX + 5, 2.9, crossZ - 3.01);
        pedFrame.rotation.z = Math.PI / 4;
        group.add(pedFrame);
      }

      // === Уличные фонари вдоль дорог ===
      // 2 фонаря на горизонтальную дорогу
      for (const side of [-1, 1]) {
        const fx = cx + side * 18;
        const fz = roadZ + 5 * side;

        // Столб
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 6, 8), lampPostMat
        );
        pole.position.set(fx, 3, fz);
        group.add(pole);

        // Горизонтальная перекладина
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, 2.5), lampPostMat
        );
        arm.position.set(fx, 5.9, fz - side * 1.2);
        group.add(arm);

        // Плафон
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.12, 0.8), lampGlowMat
        );
        lamp.position.set(fx, 5.8, fz - side * 2.2);
        group.add(lamp);

        // Фонарь — без PointLight (оптимизация), только светящийся меш
      }

      // === Припаркованные и проезжающие машины ===
      const carsCount = 0; // убраны для производительности
      for (let ci = 0; ci < carsCount; ci++) {
        const carX = cx + roadRng.range(-22, 22);
        const carZ = roadZ + roadRng.range(-3, 3);
        const carRotY = roadRng.next() > 0.5 ? 0 : Math.PI;
        const carMatIdx = roadRng.int(0, carBodyMats.length - 1);

        // Проверка: не внутри здания
        let inBuilding = false;
        for (const o of allOccupied) {
          if (Math.abs(carX - o.x) < o.w / 2 + 2 && Math.abs(carZ - o.z) < o.d / 2 + 2) {
            inBuilding = true;
            break;
          }
        }
        if (inBuilding) continue;

        const car = new THREE.Group();
        const cMat = carBodyMats[carMatIdx];
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.15, metalness: 0.9 });
        const darkTrim = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.3 });

        // Нижняя часть кузова (пороги + днище)
        const underBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 4.2), darkTrim);
        underBody.position.y = 0.25;
        car.add(underBody);

        // Основной кузов
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.6, 4.0), cMat);
        carBody.position.y = 0.65;
        carBody.castShadow = true;
        car.add(carBody);

        // Капот (чуть наклонён вниз к переду)
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 1.3), cMat);
        hood.position.set(0, 0.98, 1.0);
        hood.rotation.x = -0.03;
        car.add(hood);

        // Кабина
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 2.0), cMat);
        cabin.position.set(0, 1.28, -0.2);
        cabin.castShadow = true;
        car.add(cabin);

        // Багажник
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.9), cMat);
        trunk.position.set(0, 0.98, -1.4);
        trunk.rotation.x = 0.02;
        car.add(trunk);

        // Лобовое стекло (наклонённое)
        const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.65), glassMat);
        ws.position.set(0, 1.28, 0.82);
        ws.rotation.x = -0.25;
        car.add(ws);

        // Заднее стекло
        const rg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), glassMat);
        rg.position.set(0, 1.28, -1.21);
        rg.rotation.set(0.2, Math.PI, 0);
        car.add(rg);

        // Боковые окна (4 шт)
        for (const sx2 of [-1, 1]) {
          // Переднее
          const swF = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), glassMat);
          swF.position.set(sx2 * 0.88, 1.3, 0.2);
          swF.rotation.y = sx2 * Math.PI / 2;
          car.add(swF);
          // Заднее
          const swR = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), glassMat);
          swR.position.set(sx2 * 0.88, 1.3, -0.6);
          swR.rotation.y = sx2 * Math.PI / 2;
          car.add(swR);
        }

        // Решётка радиатора
        const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.04), chromeMat);
        grille.position.set(0, 0.55, 2.02);
        car.add(grille);
        // Линии на решётке
        for (let gl = 0; gl < 4; gl++) {
          const gLine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.01, 0.02), darkTrim);
          gLine.position.set(0, 0.47 + gl * 0.06, 2.04);
          car.add(gLine);
        }

        // Передний бампер
        const fBumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.15, 0.12), darkTrim);
        fBumper.position.set(0, 0.3, 2.06);
        car.add(fBumper);

        // Задний бампер
        const rBumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.15, 0.12), darkTrim);
        rBumper.position.set(0, 0.3, -2.06);
        car.add(rBumper);

        // Фары (передние) — корпус + линза
        for (const hx of [-0.7, 0.7]) {
          const hlBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.06), chromeMat);
          hlBody.position.set(hx, 0.7, 2.03);
          car.add(hlBody);
          const hlLens = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), headlightMat);
          hlLens.position.set(hx, 0.7, 2.06);
          car.add(hlLens);
        }

        // Задние фонари — корпус + линза
        for (const tx of [-0.75, 0.75]) {
          const tlBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), darkTrim);
          tlBody.position.set(tx, 0.7, -2.03);
          car.add(tlBody);
          const tlLens = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.02), taillightMat);
          tlLens.position.set(tx, 0.7, -2.06);
          car.add(tlLens);
        }

        // Указатели поворота (оранжевые, на углах)
        const turnMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
        for (const ts of [-1, 1]) {
          const turn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), turnMat);
          turn.position.set(ts * 0.95, 0.65, 2.0);
          car.add(turn);
        }

        // Боковые зеркала
        for (const ms of [-1, 1]) {
          // Ножка
          const mArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.04), darkTrim);
          mArm.position.set(ms * 1.05, 1.15, 0.5);
          car.add(mArm);
          // Зеркало
          const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), chromeMat);
          mirror.position.set(ms * 1.12, 1.15, 0.5);
          car.add(mirror);
        }

        // Дверные ручки (4 шт)
        for (const ds of [-1, 1]) {
          for (const dz of [0.3, -0.5]) {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.1), chromeMat);
            handle.position.set(ds * 0.98, 0.85, dz);
            car.add(handle);
          }
        }

        // Колёса (с дисками)
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
        const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8);
        const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 });
        for (const wx of [-0.9, 0.9]) {
          for (const wz of [-1.2, 1.2]) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.3, wz);
            car.add(wheel);
            // Диск колеса
            const hub = new THREE.Mesh(hubGeo, hubMat);
            hub.rotation.z = Math.PI / 2;
            hub.position.set(wx, 0.3, wz);
            car.add(hub);
          }
        }

        // Номерные знаки (перед + зад)
        for (const pz of [2.07, -2.07]) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.015), signWhiteMat);
          plate.position.set(0, 0.38, pz);
          car.add(plate);
        }

        // Антенна на крыше (у некоторых)
        if (roadRng.next() > 0.6) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4), darkTrim);
          ant.position.set(-0.5, 1.8, -0.5);
          car.add(ant);
        }

        // Выхлопная труба
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.15, 6), chromeMat);
        exhaust.position.set(0.5, 0.2, -2.1);
        exhaust.rotation.x = Math.PI / 2;
        car.add(exhaust);

        // Окна (видимые с обеих сторон — BoxGeometry)
        const winMat = new THREE.MeshPhysicalMaterial({
          color: 0x88bbdd, roughness: 0.05, metalness: 0.2,
          transparent: true, opacity: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.1,
        });
        // Лобовое стекло (толстое, наклонённое)
        const windshield2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.03), winMat);
        windshield2.position.set(0, 1.3, 0.8);
        windshield2.rotation.x = -0.25;
        car.add(windshield2);
        // Заднее стекло
        const rearWin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.03), winMat);
        rearWin.position.set(0, 1.3, -1.2);
        rearWin.rotation.x = 0.2;
        car.add(rearWin);
        // Боковые окна (4 шт — видимые с обеих сторон)
        for (const ws2 of [-1, 1]) {
          const sideWinF = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.7), winMat);
          sideWinF.position.set(ws2 * 0.88, 1.3, 0.2);
          car.add(sideWinF);
          const sideWinR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.7), winMat);
          sideWinR.position.set(ws2 * 0.88, 1.3, -0.55);
          car.add(sideWinR);
        }

        // === Водитель (сидит на переднем левом сиденье) ===
        const dSkins = [0xf0c8a0, 0xd4a574, 0x8d5524, 0xc68642];
        const dShirts = [0xcc3333, 0x3355cc, 0x33aa55, 0xeeeeee, 0x333333];
        const dHairs = [0x222222, 0x443322, 0x886633, 0x111111];
        const driverSkin = new THREE.MeshStandardMaterial({
          color: dSkins[roadRng.int(0, dSkins.length - 1)], roughness: 0.75,
        });
        const driverShirt = new THREE.MeshStandardMaterial({
          color: dShirts[roadRng.int(0, dShirts.length - 1)], roughness: 0.65,
        });
        const driverHair = new THREE.MeshStandardMaterial({
          color: dHairs[roadRng.int(0, dHairs.length - 1)], roughness: 0.85,
        });
        // Голова
        const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), driverSkin);
        dHead.position.set(-0.35, 1.45, 0.15);
        car.add(dHead);
        // Волосы
        const dHair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), driverHair);
        dHair.position.set(-0.35, 1.49, 0.13);
        dHair.scale.set(1, 0.6, 1);
        car.add(dHair);
        // Тело (рубашка)
        const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), driverShirt);
        dBody.position.set(-0.35, 1.15, 0.15);
        car.add(dBody);
        // Руки на руле
        for (const as of [-1, 1]) {
          const dArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.2, 6), driverShirt);
          dArm.position.set(-0.35 + as * 0.15, 1.1, 0.35);
          dArm.rotation.x = -Math.PI / 3;
          car.add(dArm);
          // Кисть
          const dHand = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), driverSkin);
          dHand.position.set(-0.35 + as * 0.15, 1.05, 0.45);
          car.add(dHand);
        }
        // Руль
        const steeringMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.3 });
        const stWheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 12), steeringMat);
        stWheel.position.set(-0.35, 1.05, 0.48);
        stWheel.rotation.x = -Math.PI / 4;
        car.add(stWheel);
        // Колонка руля
        const stCol = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), steeringMat);
        stCol.position.set(-0.35, 1.0, 0.55);
        stCol.rotation.x = -Math.PI / 4;
        car.add(stCol);

        car.position.set(carX, 0, carZ);
        car.rotation.y = carRotY;
        group.add(car);

        // Физическое тело машины (препятствие)
        bodies.push(physics.createStaticBox(
          new THREE.Vector3(carX, 0.6, carZ),
          new THREE.Vector3(2.0, 1.2, 4.0)
        ));
      }

      // Машины на вертикальной дороге
      if (roadRng.next() > 0.4) {
        const carZ2 = cz + roadRng.range(-22, 22);
        const carX2 = roadX + roadRng.range(-3, 3);
        const carMatIdx2 = roadRng.int(0, carBodyMats.length - 1);

        let inB = false;
        for (const o of allOccupied) {
          if (Math.abs(carX2 - o.x) < o.w / 2 + 2 && Math.abs(carZ2 - o.z) < o.d / 2 + 2) {
            inB = true; break;
          }
        }
        if (!inB) {
          const car2 = new THREE.Group();
          const cb2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.0), carBodyMats[carMatIdx2]);
          cb2.position.y = 0.6; cb2.castShadow = true; car2.add(cb2);
          const cab2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.2), carBodyMats[carMatIdx2]);
          cab2.position.set(0, 1.3, -0.3); car2.add(cab2);
          const wg = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10);
          for (const wx of [-0.9, 0.9]) {
            for (const wz of [-1.2, 1.2]) {
              const w = new THREE.Mesh(wg, wheelMat);
              w.rotation.z = Math.PI / 2; w.position.set(wx, 0.3, wz); car2.add(w);
            }
          }
          for (const hx of [-0.6, 0.6]) {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), headlightMat);
            hl.position.set(hx, 0.65, 2.03); car2.add(hl);
          }
          for (const tx of [-0.7, 0.7]) {
            const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), taillightMat);
            tl.position.set(tx, 0.65, -2.03); car2.add(tl);
          }
          car2.position.set(carX2, 0, carZ2);
          car2.rotation.y = Math.PI / 2 + (roadRng.next() > 0.5 ? 0 : Math.PI);
          group.add(car2);
          bodies.push(physics.createStaticBox(
            new THREE.Vector3(carX2, 0.6, carZ2),
            new THREE.Vector3(4.0, 1.2, 2.0)
          ));
        }
      }
    }
  }

  // === ДВИЖУЩИЕСЯ МАШИНЫ (по горизонтальным и вертикальным дорогам) ===
  const movCarRng = new CityRNG(55555 + seedOffset);
  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;
      const roadZ = cz - DIST / 2;
      const roadX = cx - DIST / 2;

      // 1 летающая машина по горизонтальной дороге
      if (movCarRng.next() > 0.7) {
        const dir = movCarRng.next() > 0.5 ? 1 : -1;
        const carMatIdx = movCarRng.int(0, carBodyMats.length - 1);
        const flyHeight = movCarRng.range(4, 12); // высота полёта
        const car = new THREE.Group();
        const cb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.0), carBodyMats[carMatIdx]);
        cb.position.y = 0.55; car.add(cb);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), carBodyMats[carMatIdx]);
        cab.position.set(0, 1.1, -0.3); car.add(cab);
        // Фары
        for (const hx of [-0.6, 0.6]) {
          const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.04), headlightMat);
          hl.position.set(hx, 0.6, 2.02);
          car.add(hl);
        }
        // Задние
        for (const tx of [-0.7, 0.7]) {
          const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.04), taillightMat);
          tl.position.set(tx, 0.6, -2.02);
          car.add(tl);
        }
        // Ракетные двигатели (вместо колёс)
        const rocketMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.3, metalness: 0.7 });
        const flameMat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
        for (const wx of [-0.75, 0.75]) {
          for (const wz of [-1.0, 1.0]) {
            // Корпус ракетного двигателя
            const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.35, 8), rocketMat);
            rocket.position.set(wx, 0.1, wz);
            car.add(rocket);
            // Сопло (тёмное)
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.1, 8),
              new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.8 })
            );
            nozzle.position.set(wx, -0.1, wz);
            car.add(nozzle);
            // Пламя (голубое свечение)
            const flm = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), flameMat);
            flm.position.set(wx, -0.3, wz);
            flm.rotation.x = Math.PI;
            car.add(flm);
          }
        }
        // Подсветка днища (неон)
        const underGlow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 3.5),
          new THREE.MeshBasicMaterial({ color: carBodyMats[carMatIdx].color, transparent: true, opacity: 0.3 })
        );
        underGlow.position.y = -0.1;
        car.add(underGlow);

        car.position.set(cx - dir * DIST / 2, flyHeight, roadZ + dir * 2);
        car.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(car);

        movingCarsArr.push({
          mesh: car,
          speed: movCarRng.range(6, 14),
          dirX: dir,
          dirZ: 0,
          startX: cx - dir * DIST / 2,
          startZ: roadZ + dir * 2,
          length: DIST,
        });
      }

      // 1 летающая машина по вертикальной дороге
      if (movCarRng.next() > 0.8) {
        const dir = movCarRng.next() > 0.5 ? 1 : -1;
        const carMatIdx = movCarRng.int(0, carBodyMats.length - 1);
        const flyH2 = movCarRng.range(5, 15);
        const car = new THREE.Group();
        const cb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.0), carBodyMats[carMatIdx]);
        cb.position.y = 0.55; car.add(cb);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), carBodyMats[carMatIdx]);
        cab.position.set(0, 1.1, -0.3); car.add(cab);
        for (const hx of [-0.6, 0.6]) {
          const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.04), headlightMat);
          hl.position.set(hx, 0.6, 2.02);
          car.add(hl);
        }
        for (const tx of [-0.7, 0.7]) {
          const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.04), taillightMat);
          tl.position.set(tx, 0.6, -2.02);
          car.add(tl);
        }
        // Ракетные двигатели
        const rMat2 = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.3, metalness: 0.7 });
        const fMat2 = new THREE.MeshBasicMaterial({ color: 0x44aaff });
        for (const wx of [-0.75, 0.75]) {
          for (const wz of [-1.0, 1.0]) {
            const rk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.35, 8), rMat2);
            rk.position.set(wx, 0.1, wz); car.add(rk);
            const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.1, 8),
              new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.8 })
            );
            nz.position.set(wx, -0.1, wz); car.add(nz);
            const fl = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), fMat2);
            fl.position.set(wx, -0.3, wz); fl.rotation.x = Math.PI; car.add(fl);
          }
        }
        // Подсветка днища
        const ug2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 3.5),
          new THREE.MeshBasicMaterial({ color: carBodyMats[carMatIdx].color, transparent: true, opacity: 0.3 })
        );
        ug2.position.y = -0.1; car.add(ug2);

        car.position.set(roadX + dir * 2, flyH2, cz - dir * DIST / 2);
        car.rotation.y = dir > 0 ? 0 : Math.PI;
        group.add(car);

        movingCarsArr.push({
          mesh: car,
          speed: movCarRng.range(6, 14),
          dirX: 0,
          dirZ: dir,
          startX: roadX + dir * 2,
          startZ: cz - dir * DIST / 2,
          length: DIST,
        });
      }
    }
  }

  // === АВТОБУСЫ (движущиеся, по 1 на каждую 3-ю горизонтальную дорогу) ===
  const busMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.4 });
  const busRed = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.4 });
  const busGreen = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.4, metalness: 0.4 });
  const busMats = [busMat, busRed, busGreen];
  const busRng = new CityRNG(88888 + seedOffset);

  for (let gz = 0; gz < GRID_Z; gz++) {
    if (busRng.next() > 0.5) continue; // 50% шанс
    const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;
    const roadZ2 = cz - DIST / 2;
    const dir = busRng.next() > 0.5 ? 1 : -1;
    const bColor = busMats[busRng.int(0, busMats.length - 1)];

    const bus = new THREE.Group();

    // Корпус автобуса (длинный)
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 8.0), bColor);
    busBody.position.y = 1.5;
    busBody.castShadow = true;
    bus.add(busBody);

    // Крыша
    const busRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 8.2),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.3 })
    );
    busRoof.position.y = 2.65;
    bus.add(busRoof);

    // Лобовое стекло (большое)
    const busWs = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.04), glassMat);
    busWs.position.set(0, 1.8, 4.02);
    bus.add(busWs);

    // Заднее стекло
    const busRg = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.04), glassMat);
    busRg.position.set(0, 1.8, -4.02);
    bus.add(busRg);

    // Боковые окна (8 с каждой стороны)
    for (const bs of [-1, 1]) {
      for (let wi = 0; wi < 8; wi++) {
        const bWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.7), glassMat);
        bWin.position.set(bs * 1.26, 1.9, -3 + wi * 0.9);
        bus.add(bWin);
      }
    }

    // Двери (2 — передняя и задняя, на правом боку)
    const busDoorMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
    for (const dz of [2.5, -1.5]) {
      const busDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 1.0), busDoorMat);
      busDoor.position.set(1.26, 1.3, dz);
      bus.add(busDoor);
    }

    // Ракетные установки (6 — вместо колёс, 3 оси)
    const rocketBodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 8);
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.2, metalness: 0.7 });
    const flameMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 });
    const flameCoreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaddff, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 });
    for (const wx of [-1.1, 1.1]) {
      for (const wz of [-2.8, 0, 2.8]) {
        // Корпус ракетного двигателя
        const rocket = new THREE.Mesh(rocketBodyGeo, rocketMat);
        rocket.position.set(wx, 0.0, wz);
        bus.add(rocket);
        // Сопло (расширение снизу)
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 8), rocketMat);
        nozzle.position.set(wx, -0.5, wz);
        bus.add(nozzle);
        // Пламя реактивной тяги
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), flameMat);
        flame.position.set(wx, -1.2, wz);
        flame.rotation.x = Math.PI;
        bus.add(flame);
        // Яркое ядро пламени
        const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), flameCoreMat);
        flameCore.position.set(wx, -0.9, wz);
        flameCore.rotation.x = Math.PI;
        bus.add(flameCore);
        // Кольцо свечения вокруг сопла
        const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.8 })
        );
        glowRing.position.set(wx, -0.5, wz);
        glowRing.rotation.x = Math.PI / 2;
        bus.add(glowRing);
      }
    }

    // Фары
    for (const hx of [-0.8, 0.8]) {
      const bHL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), headlightMat);
      bHL.position.set(hx, 1.0, 4.03);
      bus.add(bHL);
    }

    // Задние фонари
    for (const tx of [-0.9, 0.9]) {
      const bTL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), taillightMat);
      bTL.position.set(tx, 1.0, -4.03);
      bus.add(bTL);
    }

    // Номер маршрута (белый прямоугольник на лбу)
    const routeSign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    routeSign.position.set(0, 2.4, 4.03);
    bus.add(routeSign);

    // Полоса по бокам (тёмная)
    const busStripe = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    for (const bs of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 7.5), busStripe);
      stripe.position.set(bs * 1.27, 0.8, 0);
      bus.add(stripe);
    }

    // Зеркала
    for (const ms of [-1, 1]) {
      const mArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 })
      );
      mArm.position.set(ms * 1.4, 2.0, 3.5);
      bus.add(mArm);
      const mMirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 })
      );
      mMirror.position.set(ms * 1.55, 2.0, 3.5);
      bus.add(mMirror);
    }

    const startX = -halfX * dir;
    const flyHeight = 8 + busRng.range(0, 6); // летают на высоте 8-14м
    bus.position.set(startX, flyHeight, roadZ2 - dir * 3);
    bus.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(bus);

    movingCarsArr.push({
      mesh: bus,
      speed: busRng.range(6, 14),
      dirX: dir,
      dirZ: 0,
      startX: startX,
      startZ: roadZ2 - dir * 3,
      length: halfX * 2,
    });
  }

  // Стены по периметру
  const perimMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.5, metalness: 0.3 });
  const wallH = 15;
  for (const s of [-1, 1]) {
    const wx = new THREE.Mesh(new THREE.BoxGeometry(2, wallH, totalSizeZ + 24), perimMat);
    wx.position.set(s * (halfX + 11), wallH / 2, 0);
    group.add(wx);
    bodies.push(physics.createStaticBox(
      new THREE.Vector3(s * (halfX + 11), wallH / 2, 0),
      new THREE.Vector3(2, wallH, totalSizeZ + 24)
    ));
    const wz = new THREE.Mesh(new THREE.BoxGeometry(totalSizeX + 24, wallH, 2), perimMat);
    wz.position.set(0, wallH / 2, s * (halfZ + 11));
    group.add(wz);
    bodies.push(physics.createStaticBox(
      new THREE.Vector3(0, wallH / 2, s * (halfZ + 11)),
      new THREE.Vector3(totalSizeX + 24, wallH, 2)
    ));
  }

  // ================================================================
  // === ТАНКИ БУДУЩЕГО (4 угла города) ===
  // ================================================================
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.3, metalness: 0.7 });
  const tankDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.4, metalness: 0.6 });
  const tankAccentMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.6 });
  const tankEngineMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0088ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 });
  const tankArmorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a45, roughness: 0.25, metalness: 0.8 });
  const tankGlassMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });

  const tankCorners = [
    { x: -halfX + 12, z: -halfZ + 12, rot: Math.PI * 0.25 },
    { x: halfX - 12, z: -halfZ + 12, rot: Math.PI * 0.75 },
    { x: -halfX + 12, z: halfZ - 12, rot: -Math.PI * 0.25 },
    { x: halfX - 12, z: halfZ - 12, rot: -Math.PI * 0.75 },
  ];

  for (const tc of tankCorners) {
    const tank = new THREE.Group();

    // === КОРПУС (угловатый, приплюснутый, футуристичный) ===
    // Основной корпус — скошенные грани
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 7.0), tankMat);
    hull.position.y = 1.0;
    hull.castShadow = true;
    tank.add(hull);

    // Верхняя скошенная пластина корпуса
    const hullTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.15, 6.0), tankArmorMat);
    hullTop.position.y = 1.65;
    tank.add(hullTop);

    // Нижняя бронеплита (днище)
    const hullBottom = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 6.5), tankDarkMat);
    hullBottom.position.y = 0.35;
    tank.add(hullBottom);

    // Скошенные лобовые пластины
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 0.2), tankArmorMat);
    frontPlate.position.set(0, 1.1, 3.6);
    frontPlate.rotation.x = -0.3;
    tank.add(frontPlate);

    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.8, 0.2), tankArmorMat);
    rearPlate.position.set(0, 1.0, -3.6);
    rearPlate.rotation.x = 0.2;
    tank.add(rearPlate);

    // Боковые бронепанели с рёбрами
    for (const bs of [-1, 1]) {
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 6.5), tankArmorMat);
      sidePanel.position.set(bs * 2.35, 1.05, 0);
      tank.add(sidePanel);
      // Рёбра жёсткости (3 шт)
      for (let r = 0; r < 3; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.15), tankDarkMat);
        rib.position.set(bs * 2.45, 1.0, -2 + r * 2);
        tank.add(rib);
      }
    }

    // === АНТИГРАВИТАЦИОННАЯ ПОДВЕСКА (вместо гусениц) ===
    for (const bs of [-1, 1]) {
      // Антигравы — 4 модуля с каждой стороны
      for (let ag = 0; ag < 4; ag++) {
        const agModule = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 1.0), tankDarkMat);
        agModule.position.set(bs * 2.0, 0.2, -2.4 + ag * 1.6);
        tank.add(agModule);

        // Светящийся антиграв-эмиттер (снизу)
        const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.8), tankEngineMat);
        emitter.position.set(bs * 2.0, -0.02, -2.4 + ag * 1.6);
        tank.add(emitter);

        // Кольцо свечения под модулем
        const agRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 8), tankAccentMat);
        agRing.position.set(bs * 2.0, -0.05, -2.4 + ag * 1.6);
        agRing.rotation.x = Math.PI / 2;
        tank.add(agRing);
      }
    }

    // === БАШНЯ (вращающаяся, плоская, угловатая) ===
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 8), tankArmorMat);
    turretBase.position.y = 1.85;
    tank.add(turretBase);

    const turretBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 3.0), tankMat);
    turretBody.position.y = 2.3;
    turretBody.castShadow = true;
    tank.add(turretBody);

    // Скошенная лобовая часть башни
    const turretFront = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.15), tankArmorMat);
    turretFront.position.set(0, 2.3, 1.6);
    turretFront.rotation.x = -0.4;
    tank.add(turretFront);

    // Люк командира
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8), tankDarkMat);
    hatch.position.set(-0.6, 2.75, -0.3);
    tank.add(hatch);
    const hatchRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 4, 8), tankArmorMat);
    hatchRim.position.set(-0.6, 2.76, -0.3);
    hatchRim.rotation.x = Math.PI / 2;
    tank.add(hatchRim);

    // === ПУШКА (рельсовая, двойная) ===
    // Основание пушки
    const gunMount = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), tankDarkMat);
    gunMount.position.set(0, 2.3, 1.6);
    tank.add(gunMount);

    // Два ствола рельсотрона
    for (const gs of [-0.2, 0.2]) {
      // Основной ствол
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.0, 8), tankArmorMat);
      barrel.position.set(gs, 2.3, 4.2);
      barrel.rotation.x = Math.PI / 2;
      tank.add(barrel);

      // Рельсовые направляющие (светящиеся полосы вдоль ствола)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 5.0), tankAccentMat);
      rail.position.set(gs, 2.35, 4.2);
      tank.add(rail);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 5.0), tankAccentMat);
      rail2.position.set(gs, 2.25, 4.2);
      tank.add(rail2);

      // Дульный накопитель (светящееся кольцо на конце)
      const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 8), tankAccentMat);
      muzzle.position.set(gs, 2.3, 6.75);
      muzzle.rotation.y = Math.PI / 2;
      tank.add(muzzle);

      // Энергоядро на конце ствола
      const muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), tankEngineMat);
      muzzleCore.position.set(gs, 2.3, 6.8);
      tank.add(muzzleCore);
    }

    // Кожух между стволами
    const gunShroud = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 4.5), tankDarkMat);
    gunShroud.position.set(0, 2.3, 3.9);
    tank.add(gunShroud);

    // === СЕНСОРЫ И АНТЕННЫ ===
    // Визор (красная полоса — «глаз» танка)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.06), tankGlassMat);
    visor.position.set(0, 2.5, 1.55);
    tank.add(visor);

    // Антенна связи
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4), tankArmorMat);
    antenna.position.set(1.0, 3.2, -0.8);
    tank.add(antenna);
    const antennaTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    antennaTop.position.set(1.0, 4.0, -0.8);
    tank.add(antennaTop);

    // Сенсорный массив на башне
    const sensorArray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), tankDarkMat);
    sensorArray.position.set(0.8, 2.8, 0.5);
    tank.add(sensorArray);
    const sensorLens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), tankGlassMat);
    sensorLens.position.set(0.8, 2.8, 0.66);
    sensorLens.rotation.x = Math.PI / 2;
    tank.add(sensorLens);

    // === РЕАКТОР (задняя часть корпуса) ===
    const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), tankDarkMat);
    reactor.position.set(0, 1.2, -3.0);
    reactor.rotation.x = Math.PI / 2;
    tank.add(reactor);

    // Свечение реактора
    const reactorGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 8), tankEngineMat);
    reactorGlow.position.set(0, 1.2, -3.45);
    reactorGlow.rotation.x = Math.PI / 2;
    tank.add(reactorGlow);

    // Выхлопные сопла (2 шт)
    for (const es of [-0.8, 0.8]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6), tankDarkMat);
      exhaust.position.set(es, 0.8, -3.5);
      exhaust.rotation.x = Math.PI / 2;
      tank.add(exhaust);
      // Тепловое свечение из сопел
      const exhaustGlow = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 })
      );
      exhaustGlow.position.set(es, 0.8, -3.9);
      exhaustGlow.rotation.x = -Math.PI / 2;
      tank.add(exhaustGlow);
    }

    // === LED-полосы по корпусу ===
    // Боковые неоновые полосы
    for (const bs of [-1, 1]) {
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 5.5), tankAccentMat);
      ledStrip.position.set(bs * 2.3, 0.6, 0);
      tank.add(ledStrip);
    }
    // Передняя полоса
    const frontLed = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.04, 0.04), tankAccentMat);
    frontLed.position.set(0, 0.6, 3.5);
    tank.add(frontLed);

    // Свет от танка
    const tankLight = new THREE.PointLight(0x00aaff, 2, 15);
    tankLight.position.set(0, 0.5, 0);
    tank.add(tankLight);

    // Позиция и поворот
    tank.position.set(tc.x, 0.3, tc.z); // слегка парит
    tank.rotation.y = tc.rot;
    group.add(tank);

    // Танк едет — добавляем в movingCars
    const tankDir = Math.abs(tc.rot) < Math.PI / 2 ? 1 : -1;
    const tankDirZ = tc.z > 0 ? -1 : 1;
    movingCarsArr.push({
      mesh: tank,
      speed: 3 + Math.random() * 2,
      dirX: tankDir,
      dirZ: tankDirZ,
      startX: tc.x,
      startZ: tc.z,
      length: halfX * 1.5,
    });
  }

  // ================================================================
  // === АТМОСФЕРА ВОЙНЫ ===
  // ================================================================
  const warRng = new CityRNG(66600 + seedOffset);

  // --- Воронки от взрывов на дорогах ---
  const craterMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const craterEdgeMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.8 });
  for (let i = 0; i < 12; i++) {
    const cx2 = warRng.range(-halfX * 0.7, halfX * 0.7);
    const cz2 = warRng.range(-halfZ * 0.7, halfZ * 0.7);
    const cr = warRng.range(1.5, 4.0);
    // Яма
    const crater = new THREE.Mesh(new THREE.CylinderGeometry(cr * 0.3, cr, 0.6, 10), craterMat);
    crater.position.set(cx2, -0.1, cz2);
    group.add(crater);
    // Обод воронки (приподнятая земля)
    const craterRim = new THREE.Mesh(new THREE.TorusGeometry(cr, 0.25, 6, 12), craterEdgeMat);
    craterRim.position.set(cx2, 0.15, cz2);
    craterRim.rotation.x = Math.PI / 2;
    group.add(craterRim);
  }

  // --- Горящие обломки и пожары ---
  const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 });
  const fireCoreMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.3, roughness: 1.0 });
  const burntMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x444440, roughness: 0.8, metalness: 0.2 });

  for (let i = 0; i < 15; i++) {
    const fx = warRng.range(-halfX * 0.8, halfX * 0.8);
    const fz = warRng.range(-halfZ * 0.8, halfZ * 0.8);
    const fireSize = warRng.range(0.8, 2.5);

    // Обгоревший обломок (основа костра)
    const wreck = new THREE.Mesh(new THREE.BoxGeometry(fireSize * 2, fireSize * 0.6, fireSize * 1.5), burntMat);
    wreck.position.set(fx, fireSize * 0.3, fz);
    wreck.rotation.y = warRng.range(0, Math.PI * 2);
    wreck.rotation.z = warRng.range(-0.2, 0.2);
    group.add(wreck);

    // Языки пламени (3-5 конусов)
    const flameCount = warRng.int(3, 5);
    for (let f = 0; f < flameCount; f++) {
      const flameH = fireSize * warRng.range(1.0, 2.5);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(fireSize * 0.3, flameH, 6), fireMat);
      flame.position.set(
        fx + warRng.range(-fireSize * 0.5, fireSize * 0.5),
        flameH / 2 + fireSize * 0.4,
        fz + warRng.range(-fireSize * 0.5, fireSize * 0.5)
      );
      group.add(flame);
    }

    // Ядро пламени (яркое)
    const core = new THREE.Mesh(new THREE.ConeGeometry(fireSize * 0.15, fireSize * 1.5, 5), fireCoreMat);
    core.position.set(fx, fireSize * 0.8, fz);
    group.add(core);

    // Столб дыма
    for (let s = 0; s < 4; s++) {
      const smokeSize = fireSize * warRng.range(1.5, 3.0);
      const smokeH = fireSize * 3 + s * fireSize * 2;
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(smokeSize, 6, 6), smokeMat);
      smoke.position.set(
        fx + warRng.range(-0.5, 0.5),
        smokeH,
        fz + warRng.range(-0.5, 0.5)
      );
      smoke.scale.set(1, warRng.range(0.6, 1.2), 1);
      group.add(smoke);
    }

    // Свет от огня
    const fireLight = new THREE.PointLight(0xff4400, 3, fireSize * 12);
    fireLight.position.set(fx, fireSize * 1.5, fz);
    lights.push(fireLight);
  }

  // --- Разбросанные обломки и мусор войны ---
  for (let i = 0; i < 40; i++) {
    const dx = warRng.range(-halfX * 0.8, halfX * 0.8);
    const dz = warRng.range(-halfZ * 0.8, halfZ * 0.8);
    const dType = warRng.int(0, 3);

    if (dType === 0) {
      // Бетонный блок
      const bw = warRng.range(0.5, 2.0);
      const bh = warRng.range(0.3, 1.0);
      const bd = warRng.range(0.5, 1.5);
      const block = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), debrisMat);
      block.position.set(dx, bh / 2, dz);
      block.rotation.set(warRng.range(-0.3, 0.3), warRng.range(0, Math.PI), warRng.range(-0.3, 0.3));
      group.add(block);
    } else if (dType === 1) {
      // Скрученный металл
      const metalScrap = new THREE.Mesh(
        new THREE.BoxGeometry(warRng.range(0.3, 1.5), 0.05, warRng.range(0.3, 1.0)),
        new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.4, metalness: 0.6 })
      );
      metalScrap.position.set(dx, warRng.range(0.1, 0.5), dz);
      metalScrap.rotation.set(warRng.range(-0.5, 0.5), warRng.range(0, Math.PI), warRng.range(-0.8, 0.8));
      group.add(metalScrap);
    } else if (dType === 2) {
      // Арматура торчащая
      const rebar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, warRng.range(1.0, 3.0), 4),
        new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.7, metalness: 0.5 })
      );
      rebar.position.set(dx, 0.8, dz);
      rebar.rotation.set(warRng.range(-0.5, 0.5), 0, warRng.range(-0.8, 0.8));
      group.add(rebar);
    } else {
      // Осколки стекла
      const shardSize = warRng.range(0.2, 0.8);
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(shardSize, 0.02, shardSize * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 })
      );
      shard.position.set(dx, 0.02, dz);
      shard.rotation.y = warRng.range(0, Math.PI);
      group.add(shard);
    }
  }

  // --- Баррикады ---
  const barricadeMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.7, metalness: 0.3 });
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8b7d5b, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const bx = warRng.range(-halfX * 0.6, halfX * 0.6);
    const bz = warRng.range(-halfZ * 0.6, halfZ * 0.6);
    const bRot = warRng.range(0, Math.PI);

    const barricade = new THREE.Group();

    // Металлический щит
    const shield = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 0.15), barricadeMat);
    shield.position.y = 0.7;
    barricade.add(shield);

    // Подпорки
    for (const bs of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.8), barricadeMat);
      leg.position.set(bs * 1.2, 0.5, -0.35);
      leg.rotation.x = 0.3;
      barricade.add(leg);
    }

    // Мешки с песком (2-3 шт)
    for (let sb = 0; sb < warRng.int(2, 3); sb++) {
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.3, 0.4), sandbagMat
      );
      bag.position.set(warRng.range(-1.0, 1.0), 0.15 + sb * 0.3, 0.4);
      bag.scale.set(1, 0.8, 1);
      barricade.add(bag);
    }

    // Пулевые отверстия на щите
    for (let bh = 0; bh < 5; bh++) {
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );
      hole.position.set(warRng.range(-1.2, 1.2), warRng.range(0.3, 1.2), 0.08);
      barricade.add(hole);
    }

    barricade.position.set(bx, 0, bz);
    barricade.rotation.y = bRot;
    group.add(barricade);
    bodies.push(physics.createStaticBox(
      new THREE.Vector3(bx, 0.7, bz),
      new THREE.Vector3(3.0, 1.4, 0.5)
    ));
  }

  // --- Перевёрнутые/горящие машины ---
  const wreckedCarMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.3 });
  for (let i = 0; i < 6; i++) {
    const wx = warRng.range(-halfX * 0.6, halfX * 0.6);
    const wz = warRng.range(-halfZ * 0.6, halfZ * 0.6);
    const wreckedCar = new THREE.Group();

    // Корпус машины (помятый)
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 4.0), wreckedCarMat);
    carBody.position.y = 0.5;
    wreckedCar.add(carBody);

    // Кабина (раздавленная)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), wreckedCarMat);
    cabin.position.set(0, 1.1, -0.3);
    cabin.rotation.z = warRng.range(-0.1, 0.1);
    wreckedCar.add(cabin);

    // Разбитые стёкла (острые осколки)
    const brokenGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.05, transparent: true, opacity: 0.3 })
    );
    brokenGlass.position.set(0, 1.0, 0.8);
    brokenGlass.rotation.x = warRng.range(-0.3, 0.3);
    wreckedCar.add(brokenGlass);

    // Следы горения
    const burnMark = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 3.5), burntMat);
    burnMark.position.set(0, 1.02, 0);
    wreckedCar.add(burnMark);

    // Некоторые машины перевёрнуты
    const flipped = warRng.next() > 0.5;
    wreckedCar.position.set(wx, flipped ? 1.0 : 0, wz);
    wreckedCar.rotation.y = warRng.range(0, Math.PI * 2);
    if (flipped) {
      wreckedCar.rotation.z = Math.PI + warRng.range(-0.3, 0.3);
    }

    // Огонь на некоторых машинах
    if (warRng.next() > 0.4) {
      const carFlame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 6), fireMat);
      carFlame.position.set(0, flipped ? -0.5 : 1.8, 0.5);
      if (flipped) carFlame.rotation.x = Math.PI;
      wreckedCar.add(carFlame);
      const carFireLight = new THREE.PointLight(0xff4400, 2, 10);
      carFireLight.position.set(wx, 3, wz);
      lights.push(carFireLight);
    }

    group.add(wreckedCar);
    bodies.push(physics.createStaticBox(
      new THREE.Vector3(wx, 0.5, wz),
      new THREE.Vector3(2.0, 1.0, 4.0)
    ));
  }

  // --- Следы от бластерных выстрелов на стенах ---
  const blastMarkMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x331100, emissiveIntensity: 0.2, roughness: 0.9 });
  for (let i = 0; i < 30; i++) {
    const markSize = warRng.range(0.1, 0.4);
    const mark = new THREE.Mesh(new THREE.CircleGeometry(markSize, 6), blastMarkMat);
    // На стенах зданий (рандомно привязаны к occupied)
    if (allOccupied.length > 0) {
      const building = allOccupied[warRng.int(0, allOccupied.length - 1)];
      const side = warRng.int(0, 3);
      if (side === 0) {
        mark.position.set(building.x + warRng.range(-building.w / 2, building.w / 2), warRng.range(1, 8), building.z + building.d / 2 + 0.1);
      } else if (side === 1) {
        mark.position.set(building.x + warRng.range(-building.w / 2, building.w / 2), warRng.range(1, 8), building.z - building.d / 2 - 0.1);
        mark.rotation.y = Math.PI;
      } else if (side === 2) {
        mark.position.set(building.x + building.w / 2 + 0.1, warRng.range(1, 8), building.z + warRng.range(-building.d / 2, building.d / 2));
        mark.rotation.y = Math.PI / 2;
      } else {
        mark.position.set(building.x - building.w / 2 - 0.1, warRng.range(1, 8), building.z + warRng.range(-building.d / 2, building.d / 2));
        mark.rotation.y = -Math.PI / 2;
      }
      group.add(mark);
    }
  }

  // --- Граффити «ВОЙНА» (красная надпись на стене) ---
  if (allOccupied.length > 2) {
    const grafBldg = allOccupied[warRng.int(0, Math.min(allOccupied.length - 1, 5))];
    const grafCanvas = document.createElement('canvas');
    grafCanvas.width = 512;
    grafCanvas.height = 256;
    const gCtx = grafCanvas.getContext('2d')!;
    gCtx.fillStyle = '#cc2222';
    gCtx.font = 'bold 100px Arial';
    gCtx.textAlign = 'center';
    gCtx.textBaseline = 'middle';
    gCtx.fillText('ВОЙНА', 256, 128);
    const grafTex = new THREE.CanvasTexture(grafCanvas);
    const grafMat = new THREE.MeshStandardMaterial({ map: grafTex, transparent: true, roughness: 0.8 });
    const grafMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), grafMat);
    grafMesh.position.set(grafBldg.x, 3.5, grafBldg.z + grafBldg.d / 2 + 0.12);
    group.add(grafMesh);
  }

  // === Освещение — город в войне (красно-оранжевое зарево + тёмное небо) ===
  const sunLight = new THREE.DirectionalLight(0xcc7744, 1.0);
  sunLight.position.set(60, 60, -30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 250;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  lights.push(sunLight);

  const fillLight = new THREE.DirectionalLight(0x993322, 0.4);
  fillLight.position.set(-40, 40, 30);
  lights.push(fillLight);

  const hemi = new THREE.HemisphereLight(0x442211, 0x110808, 0.8);
  lights.push(hemi);

  const ambient = new THREE.AmbientLight(0x331a11, 0.6);
  lights.push(ambient);

  // ================================================================
  // === ПРОХОЖИЕ (декоративные NPC) ===
  // ================================================================
  const skinColors = [0xd4c5b0, 0xb8c8d8, 0xe0d0c0, 0xc0b0a0, 0xa0b8c0, 0xd8c8b8];
  const shirtColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff3366, 0x3366ff, 0x111111, 0xff6600, 0x9933ff, 0x222233, 0x00ccaa];
  const pantsColors = [0x1a1a2e, 0x0a0a0a, 0x1a2a1a, 0x2a1a2a, 0x222222, 0x0a1a2a];
  const hairColors = [0x00ffff, 0xff00ff, 0xffffff, 0x00ff66, 0x111111, 0xff3300];
  const accentColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff3366, 0x3366ff, 0xff6600];

  const pedRng = new CityRNG(31415 + seedOffset);

  function buildPedestrian(px: number, pz: number, rotY: number): { mesh: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group; leftArm: THREE.Group; rightArm: THREE.Group } {
    const ped = new THREE.Group();
    const skinIdx = pedRng.int(0, skinColors.length - 1);
    const shirtIdx = pedRng.int(0, shirtColors.length - 1);
    const pantsIdx = pedRng.int(0, pantsColors.length - 1);
    const hairIdx = pedRng.int(0, hairColors.length - 1);
    const isFemale = pedRng.next() > 0.5;
    const height = isFemale ? pedRng.range(1.5, 1.7) : pedRng.range(1.65, 1.85);
    const s = height / 1.75;

    const accentColor = accentColors[(skinIdx + shirtIdx) % accentColors.length];
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColors[skinIdx], roughness: 0.55, metalness: 0.15 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColors[shirtIdx], roughness: 0.3, metalness: 0.3, emissive: shirtColors[shirtIdx], emissiveIntensity: 0.2 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColors[pantsIdx], roughness: 0.35, metalness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColors[hairIdx], roughness: 0.3, metalness: 0.1, emissive: hairColors[hairIdx], emissiveIntensity: 0.4 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.5 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 });
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.6, roughness: 0.2 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.4, metalness: 0.2 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.3, metalness: 0.5, emissive: accentColor, emissiveIntensity: 0.1 });
    const glowMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.3 });

    // === ГОЛОВА (пригнута от страха) ===
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.55 * s;
    headGroup.rotation.x = 0.2; // пригибается
    headGroup.position.z = 0.03; // голова чуть вперёд

    // Череп
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skinMat);
    skull.scale.set(0.95, 1.05, 0.95);
    headGroup.add(skull);

    // Уши
    for (const es of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), skinMat);
      ear.position.set(es * 0.11, -0.01, 0);
      ear.scale.set(0.5, 0.8, 0.6);
      headGroup.add(ear);
    }

    // Кибер-имплант на виске
    const implant = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.02), glowMat);
    implant.position.set(0.11, 0.0, 0.04);
    headGroup.add(implant);
    const implantDot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), glowMat);
    implantDot.position.set(0.115, 0.0, 0.055);
    headGroup.add(implantDot);

    // Глаза (широко раскрытые от страха)
    for (const es of [-1, 1]) {
      // Белок (увеличенный — испуг)
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeWhiteMat);
      eyeWhite.position.set(es * 0.04, 0.01, 0.1);
      headGroup.add(eyeWhite);
      // Зрачок (маленький — от страха сужается)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), eyePupilMat);
      pupil.position.set(es * 0.04, 0.01, 0.12);
      headGroup.add(pupil);
      // Бровь (поднята вверх — испуг)
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.01), hairMat);
      brow.position.set(es * 0.04, 0.05, 0.1);
      brow.rotation.z = es * 0.25;
      headGroup.add(brow);
    }

    // Нос
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.02), skinMat);
    nose.position.set(0, -0.01, 0.12);
    headGroup.add(nose);

    // Рот (открытый — крик)
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.8 }));
    mouth.position.set(0, -0.04, 0.11);
    mouth.scale.set(1, 0.7, 0.5);
    headGroup.add(mouth);

    ped.add(headGroup);

    // === ВОЛОСЫ ===
    const hairGroup = new THREE.Group();
    hairGroup.position.y = 1.55 * s;

    if (isFemale) {
      // Кибер-причёска — асимметричный объём + светящиеся пряди
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), hairMat);
      hairTop.position.y = 0.04;
      hairTop.scale.set(1.1, 0.7, 0.9);
      hairGroup.add(hairTop);

      if (pedRng.next() > 0.3) {
        // Голографические пряди (длинные светящиеся полосы)
        for (let i = 0; i < 3; i++) {
          const strand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.25 + i * 0.05, 0.01), glowMat);
          strand.position.set(-0.06 + i * 0.06, -0.12 - i * 0.02, -0.06);
          hairGroup.add(strand);
        }
        // Кончики (неоновое свечение)
        const hairTips = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.08, 6), glowMat);
        hairTips.position.set(0, -0.28, -0.06);
        hairGroup.add(hairTips);
      }
    } else {
      // Кибер-ирокез — гребень по центру головы
      const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.18), hairMat);
      mohawk.position.set(0, 0.08, -0.02);
      hairGroup.add(mohawk);
      // Светящееся основание ирокеза
      const mohawkGlow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.015, 0.2), glowMat);
      mohawkGlow.position.set(0, 0.025, -0.02);
      hairGroup.add(mohawkGlow);
    }
    ped.add(hairGroup);

    // === ШЕЯ ===
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 8), skinMat);
    neck.position.y = 1.42 * s;
    ped.add(neck);

    // === ТОРС ===
    const torsoW = isFemale ? 0.26 : 0.32;
    const torsoD = isFemale ? 0.16 : 0.2;

    // Верхняя часть (грудь)
    const chest = new THREE.Mesh(new THREE.BoxGeometry(torsoW, 0.25 * s, torsoD), shirtMat);
    chest.position.y = 1.22 * s;
    chest.castShadow = true;
    ped.add(chest);

    // Нижняя часть (живот)
    const belly = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.9, 0.18 * s, torsoD * 0.9), shirtMat);
    belly.position.y = 1.02 * s;
    ped.add(belly);

    // Тех-воротник (светящийся обод)
    const collarMat = pedRng.next() > 0.5 ? glowMat : new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.2, metalness: 0.6, emissive: accentColor, emissiveIntensity: 0.3 });
    const collar = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.7, 0.025, torsoD + 0.02), collarMat);
    collar.position.y = 1.35 * s;
    ped.add(collar);

    // LED-полоса на груди
    const chestLed = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.8, 0.008, 0.005), glowMat);
    chestLed.position.set(0, 1.28 * s, torsoD / 2 + 0.005);
    ped.add(chestLed);

    // Бронепластины на груди
    for (const ps of [-1, 1]) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.005),
        new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.2, metalness: 0.7 })
      );
      plate.position.set(ps * 0.06, 1.18 * s, torsoD / 2 + 0.005);
      ped.add(plate);
    }

    // Тактический пояс
    const belt = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.01, 0.03, torsoD + 0.01), beltMat);
    belt.position.y = 0.92 * s;
    ped.add(belt);

    // Энергоячейка на поясе
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.03, 0.018), glowMat
    );
    buckle.position.set(0, 0.92 * s, torsoD / 2 + 0.008);
    ped.add(buckle);

    // === РУКИ (подняты от страха) ===
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-(torsoW / 2 + 0.03), 1.32 * s, 0);
    leftArmGroup.rotation.x = -2.2; // руки подняты вверх к голове
    leftArmGroup.rotation.z = 0.4;
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(torsoW / 2 + 0.03, 1.32 * s, 0);
    rightArmGroup.rotation.x = -2.0; // немного асимметрично
    rightArmGroup.rotation.z = -0.3;

    for (const armGrp of [leftArmGroup, rightArmGroup]) {
      // Плечо
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), shirtMat);
      armGrp.add(shoulder);

      // Верхняя часть руки (рукав)
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.22 * s, 8), shirtMat);
      upperArm.position.y = -0.12 * s;
      armGrp.add(upperArm);

      // Локоть (кибернетический)
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.2, metalness: 0.7 }));
      elbow.position.y = -0.24 * s;
      armGrp.add(elbow);

      // Предплечье (бодисьют)
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.22 * s, 8), shirtMat);
      forearm.position.y = -0.36 * s;
      armGrp.add(forearm);

      // Светящийся браслет на запястье
      const wristBand = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 12), glowMat);
      wristBand.position.y = -0.46 * s;
      wristBand.rotation.x = Math.PI / 2;
      armGrp.add(wristBand);

      // Кисть
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.025), skinMat);
      hand.position.y = -0.5 * s;
      armGrp.add(hand);

      // Пальцы (кибернетические)
      for (let f = 0; f < 4; f++) {
        const fingerMat = f === 0 ? new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.2, metalness: 0.6 }) : skinMat;
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.03, 4), fingerMat);
        finger.position.set(-0.012 + f * 0.008, -0.54 * s, 0);
        armGrp.add(finger);
      }

      ped.add(armGrp);
    }

    // === НОГИ (с коленом) ===
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.065, 0.9 * s, 0);
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.065, 0.9 * s, 0);

    for (const legGrp of [leftLegGroup, rightLegGroup]) {
      // Бедро
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.038, 0.34 * s, 8), pantsMat);
      thigh.position.y = -0.17 * s;
      legGrp.add(thigh);

      // Колено
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pantsMat);
      knee.position.y = -0.36 * s;
      legGrp.add(knee);

      // Голень
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.32 * s, 8), pantsMat);
      shin.position.y = -0.54 * s;
      legGrp.add(shin);

      // Лодыжка
      const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), shoeMat);
      ankle.position.y = -0.72 * s;
      legGrp.add(ankle);

      // Кибер-ботинки
      const shoeMain = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.13), shoeMat);
      shoeMain.position.set(0, -0.75 * s, 0.015);
      legGrp.add(shoeMain);
      // Светящаяся подошва
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.015, 0.14),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.3, roughness: 0.2 })
      );
      sole.position.set(0, -0.77 * s, 0.015);
      legGrp.add(sole);
      // LED-полоска на ботинке
      const shoeLed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.025, 0.1), glowMat);
      shoeLed.position.set(0.035, -0.74 * s, 0.015);
      legGrp.add(shoeLed);
      // Бронепластина на голени
      const shinPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.15, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.2, metalness: 0.7 })
      );
      shinPlate.position.set(0, -0.54 * s, 0.025);
      legGrp.add(shinPlate);

      ped.add(legGrp);
    }

    // === ЮБКА / ПЛАТЬЕ ===
    if (isFemale && pedRng.next() > 0.4) {
      const skirtColor = shirtColors[(shirtIdx + 3) % shirtColors.length];
      const skirtMat = new THREE.MeshStandardMaterial({ color: skirtColor, emissive: skirtColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.5 });
      const skirtLen = pedRng.range(0.2, 0.4);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14 + skirtLen * 0.2, skirtLen, 10), skirtMat);
      skirt.position.y = 0.9 * s - skirtLen / 2;
      ped.add(skirt);
    }

    // === АКСЕССУАРЫ (каждый независимо — 50% шанс) ===

    // Ховер-дрон ИЛИ голо-проектор (не оба)
    if (pedRng.next() > 0.5) {
      // Ховер-дрон за спиной
      const droneColors = [0x2a3a4a, 0x3a2a3a, 0x2a3a2a, 0x3a3a2a, 0x4a4a4a];
      const droneMat = new THREE.MeshStandardMaterial({ color: droneColors[pedRng.int(0, droneColors.length - 1)], roughness: 0.2, metalness: 0.6 });
      // Корпус дрона (сфера)
      const droneBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), droneMat);
      droneBody.position.set(0, 1.45 * s, -torsoD / 2 - 0.1);
      ped.add(droneBody);
      // Глаз дрона (светящийся)
      const droneEye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), glowMat);
      droneEye.position.set(0, 1.45 * s, -torsoD / 2 - 0.16);
      ped.add(droneEye);
      // Пропеллеры (торусы)
      for (const ls of [-1, 1]) {
        const prop = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.004, 4, 8), droneMat);
        prop.position.set(ls * 0.06, 1.5 * s, -torsoD / 2 - 0.1);
        prop.rotation.x = Math.PI / 2;
        ped.add(prop);
      }
      // Антенна
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4), glowMat);
      antenna.position.set(0, 1.52 * s, -torsoD / 2 - 0.1);
      ped.add(antenna);
    } else if (pedRng.next() > 0.4) {
      // Голо-проектор на бедре
      const projColors = [0x2a2a3a, 0x1a1a2a, 0x3a2a3a, 0x222222];
      const projMat = new THREE.MeshStandardMaterial({ color: projColors[pedRng.int(0, projColors.length - 1)], roughness: 0.2, metalness: 0.6 });
      const projector = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), projMat);
      projector.position.set(0.17, 0.85 * s, 0.02);
      ped.add(projector);
      // Энерго-кабель
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4), glowMat);
      cable.position.set(0.12, 1.05 * s, 0);
      cable.rotation.z = -0.3;
      ped.add(cable);
      // Голограмма (маленький светящийся куб над проектором)
      const holo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 })
      );
      holo.position.set(0.17, 0.94 * s, 0.02);
      holo.rotation.y = Math.PI / 4;
      ped.add(holo);
    }

    // Кибер-шлем / голо-обруч (50%)
    if (pedRng.next() > 0.5) {
      const hatColor = shirtColors[(shirtIdx + 1) % shirtColors.length];
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.2, metalness: 0.6 });
      if (pedRng.next() > 0.5) {
        // Тактический визор-шлем
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
        helmet.position.y = 1.58 * s;
        ped.add(helmet);
        // Прозрачный визор
        const visorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.005),
          new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, roughness: 0.0, metalness: 0.5 })
        );
        visorPlate.position.set(0, 1.58 * s, 0.12);
        ped.add(visorPlate);
      } else {
        // Голографический обруч
        const headband = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 16), glowMat);
        headband.position.y = 1.6 * s;
        headband.rotation.x = Math.PI / 2;
        ped.add(headband);
        // Проекционный элемент спереди
        const projDot = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), glowMat);
        projDot.position.set(0, 1.6 * s, 0.14);
        ped.add(projDot);
      }
    }

    // Кибер-визор (50%)
    if (pedRng.next() > 0.5) {
      const glassTypes = pedRng.next();
      const visorColor = glassTypes > 0.5 ? accentColor : 0xff3366;
      const visorMat = new THREE.MeshStandardMaterial({
        color: visorColor, emissive: visorColor, emissiveIntensity: 0.5,
        roughness: 0.0, metalness: 0.5, transparent: true, opacity: 0.45,
      });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.2, metalness: 0.7 });
      // Сплошной визор на оба глаза
      const visorLens = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.005), visorMat);
      visorLens.position.set(0, 1.56 * s, 0.12);
      ped.add(visorLens);
      // Рамка визора
      const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.003), frameMat);
      visorFrame.position.set(0, 1.56 * s, 0.118);
      ped.add(visorFrame);
      // Дужки (тонкие, светящиеся на концах)
      for (const gs of [-1, 1]) {
        const temple = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frameMat);
        temple.position.set(gs * 0.065, 1.56 * s, 0.07);
        ped.add(temple);
        const templeTip = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4), glowMat);
        templeTip.position.set(gs * 0.065, 1.56 * s, 0.02);
        ped.add(templeTip);
      }
    }

    // Голографический наручный дисплей (50%)
    if (pedRng.next() > 0.5) {
      const watchMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.2, metalness: 0.7 });
      const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.03), watchMat);
      watchFace.position.set(-(torsoW / 2 + 0.03), 0.98 * s, 0);
      ped.add(watchFace);
      // Голо-экран
      const watchScreen = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.04),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 })
      );
      watchScreen.position.set(-(torsoW / 2 + 0.03), 1.01 * s, 0);
      ped.add(watchScreen);
      // Мини-голограмма над часами
      const holoIcon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), glowMat);
      holoIcon.position.set(-(torsoW / 2 + 0.03), 1.04 * s, 0);
      holoIcon.rotation.y = Math.PI / 4;
      ped.add(holoIcon);
    }

    // Голо-датапад в руке (30%)
    if (pedRng.next() > 0.7) {
      const padMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.3 });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.003), padMat);
      pad.position.set(torsoW / 2 + 0.03, 0.82 * s, 0.03);
      ped.add(pad);
      // Голо-экран (яркий)
      const padScreen = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.002),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.7, transparent: true, opacity: 0.5 })
      );
      padScreen.position.set(torsoW / 2 + 0.03, 0.82 * s, 0.034);
      ped.add(padScreen);
      // Парящая голограмма над датападом
      const padHolo = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 })
      );
      padHolo.position.set(torsoW / 2 + 0.03, 0.9 * s, 0.03);
      ped.add(padHolo);
    }

    // Светящийся обод на шее
    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.003, 4, 10), glowMat);
    neckRing.position.y = 1.4 * s;
    neckRing.rotation.x = Math.PI / 2;
    ped.add(neckRing);

    // LED-полоса вдоль позвоночника
    const spineLed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.35, 0.005), glowMat);
    spineLed.position.set(0, 1.1 * s, -torsoD / 2 - 0.005);
    ped.add(spineLed);

    ped.position.set(px, 0, pz);
    ped.rotation.y = rotY;
    ped.rotation.x = 0.15; // наклон вперёд — бежит в панике
    ped.castShadow = true;
    return { mesh: ped, leftLeg: leftLegGroup, rightLeg: rightLegGroup, leftArm: leftArmGroup, rightArm: rightArmGroup };
  }

  // Размещаем прохожих
  const pedestrians: Pedestrian[] = [];
  for (let gx = 0; gx < GRID_X; gx++) {
    for (let gz = 0; gz < GRID_Z; gz++) {
      const cx = (gx - Math.floor(GRID_X / 2)) * DIST;
      const cz = (gz - Math.floor(GRID_Z / 2)) * DIST;

      const pedCount = 1;
      for (let p = 0; p < pedCount; p++) {
        const px = cx + pedRng.range(-25, 25);
        const pz = cz + pedRng.range(-25, 25);
        const rotY = pedRng.range(0, Math.PI * 2);

        let inside = false;
        for (const o of allOccupied) {
          if (Math.abs(px - o.x) < o.w / 2 + 1 && Math.abs(pz - o.z) < o.d / 2 + 1) {
            inside = true; break;
          }
        }
        if (inside) continue;

        const result = buildPedestrian(px, pz, rotY);
        group.add(result.mesh);

        pedestrians.push({
          mesh: result.mesh,
          speed: pedRng.range(2.5, 5.0),
          dirX: Math.sin(rotY),
          dirZ: Math.cos(rotY),
          originX: px,
          originZ: pz,
          walkRadius: pedRng.range(8, 20),
          phase: pedRng.range(0, Math.PI * 2),
          leftLeg: result.leftLeg,
          rightLeg: result.rightLeg,
          leftArm: result.leftArm,
          rightArm: result.rightArm,
        });
      }
    }
  }

  scene.add(group);
  for (const l of lights) scene.add(l);

  // === Враги: ~30 штурмовиков + 5 турелей ===
  const enemies: THREE.Vector3[] = [];
  const turrets: THREE.Vector3[] = [];

  const erng = new CityRNG(99999 + seedOffset);
  for (let i = 0; i < 20; i++) {
    const ex = erng.range(-halfX + 15, halfX - 15);
    const ez = erng.range(-halfZ + 15, halfZ - 15);
    let inside = false;
    for (const o of allOccupied) {
      if (Math.abs(ex - o.x) < o.w / 2 + 2 && Math.abs(ez - o.z) < o.d / 2 + 2) {
        inside = true; break;
      }
    }
    if (inside) continue;
    enemies.push(new THREE.Vector3(ex, 2, ez));
    if (enemies.length >= 20) break;
  }
  for (let i = 0; i < 15; i++) {
    const tx = erng.range(-halfX * 0.6, halfX * 0.6);
    const tz = erng.range(-halfZ * 0.6, halfZ * 0.6);
    let inside = false;
    for (const o of allOccupied) {
      if (Math.abs(tx - o.x) < o.w / 2 + 2 && Math.abs(tz - o.z) < o.d / 2 + 2) {
        inside = true; break;
      }
    }
    if (inside) continue;
    turrets.push(new THREE.Vector3(tx, 1, tz));
    if (turrets.length >= 5) break;
  }

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(0, 1.5, 0),
    fogColor: 0x2a1a10, bgColor: 0x1a0a05,
    enemies,
    turrets,
    pedestrians,
    movingCars: movingCarsArr,
    trafficLights: trafficLightsArr,
  };
}

// =====================================================
// УРОВЕНЬ МЕТРО — БОСС
// =====================================================
export function createMetroBoss(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  // Материалы — заброшенное метро
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x3a3832, roughness: 0.95 });
  const crackConcrete = new THREE.MeshStandardMaterial({ color: 0x2e2c28, roughness: 0.95 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x6b6558, roughness: 0.7, metalness: 0.05 });
  const tileAccent = new THREE.MeshStandardMaterial({ color: 0x1a3344, roughness: 0.6, metalness: 0.1 });
  const tileBroken = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7, metalness: 0.5 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.9, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0c, roughness: 0.95 });
  const wagonMat = new THREE.MeshStandardMaterial({ color: 0x2a3a3a, roughness: 0.7, metalness: 0.3 });
  const wagonRust = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.85, metalness: 0.2 });
  const glassBroken = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.2 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 });
  const mossMatA = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.95 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a2a22, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 });
  const cobwebMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, transparent: true, opacity: 0.15 });
  const columnMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.75, metalness: 0.1 });
  const graffitiMat = new THREE.MeshStandardMaterial({ color: 0xcc3322, roughness: 0.8, emissive: 0x220000, emissiveIntensity: 0.1 });

  // Размеры станции
  const stationLen = 120;
  const stationW = 30;
  const ceilingH = 6;
  const platformH = 1.0;
  const trackW = 4;

  // === ПОЛ ===
  // Пути (грязные, затопленные)
  const trackBed = new THREE.Mesh(new THREE.BoxGeometry(trackW * 2 + 2, 0.3, stationLen + 20), darkMat);
  trackBed.position.set(0, -0.15, 0);
  group.add(trackBed);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.15, 0), new THREE.Vector3(trackW * 2 + 2, 0.3, stationLen + 20)));

  // Стоячая вода на путях
  const floodWater = new THREE.Mesh(new THREE.BoxGeometry(trackW * 2, 0.05, stationLen - 10), waterMat);
  floodWater.position.set(0, 0.02, 0);
  group.add(floodWater);

  // Платформы (потрескавшиеся)
  const platL = new THREE.Mesh(new THREE.BoxGeometry(8, platformH, stationLen), tileMat);
  platL.position.set(-9, platformH / 2, 0);
  platL.receiveShadow = true;
  group.add(platL);
  bodies.push(physics.createStaticBox(new THREE.Vector3(-9, platformH / 2, 0), new THREE.Vector3(8, platformH, stationLen)));

  const platR = new THREE.Mesh(new THREE.BoxGeometry(8, platformH, stationLen), tileMat);
  platR.position.set(9, platformH / 2, 0);
  platR.receiveShadow = true;
  group.add(platR);
  bodies.push(physics.createStaticBox(new THREE.Vector3(9, platformH / 2, 0), new THREE.Vector3(8, platformH, stationLen)));

  // Выбитая плитка (дыры в платформе)
  for (let i = 0; i < 20; i++) {
    const hx = (i % 2 === 0 ? -9 : 9) + (Math.random() - 0.5) * 5;
    const hz = (Math.random() - 0.5) * stationLen * 0.8;
    const holeSize = 0.3 + Math.random() * 0.6;
    const hole = new THREE.Mesh(new THREE.BoxGeometry(holeSize, 0.06, holeSize), darkMat);
    hole.position.set(hx, platformH + 0.01, hz);
    group.add(hole);
  }

  // Стёршаяся жёлтая линия (прерывистая)
  for (const px of [-5.1, 5.1]) {
    for (let lz = -stationLen / 2 + 5; lz < stationLen / 2 - 5; lz += 4) {
      if (Math.random() > 0.4) {
        const segLen = 1.0 + Math.random() * 1.5;
        const yLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.02, segLen),
          new THREE.MeshBasicMaterial({ color: 0x8a7a22 }) // выцветшая
        );
        yLine.position.set(px, platformH + 0.01, lz);
        group.add(yLine);
      }
    }
  }

  // === ПОТОЛОК (с дырами и трещинами) ===
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(stationW, 0.5, stationLen + 20), crackConcrete);
  ceiling.position.set(0, ceilingH + 0.25, 0);
  group.add(ceiling);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, ceilingH + 0.25, 0), new THREE.Vector3(stationW, 0.5, stationLen + 20)));

  // Обвалившиеся куски потолка на полу
  for (let i = 0; i < 12; i++) {
    const cx = (Math.random() - 0.5) * (stationW - 4);
    const cz = (Math.random() - 0.5) * stationLen * 0.8;
    const cSize = 0.5 + Math.random() * 1.5;
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(cSize, cSize * 0.4, cSize * 0.8), concreteMat);
    chunk.position.set(cx, platformH + cSize * 0.2, cz);
    chunk.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
    group.add(chunk);
  }

  // === СТЕНЫ (обшарпанные, с граффити) ===
  for (const ws of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, ceilingH, stationLen + 20), crackConcrete);
    wall.position.set(ws * (stationW / 2), ceilingH / 2, 0);
    group.add(wall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(ws * (stationW / 2), ceilingH / 2, 0), new THREE.Vector3(0.5, ceilingH, stationLen + 20)));

    // Облупившаяся плитка (кусками)
    for (let tz = -stationLen / 2 + 5; tz < stationLen / 2 - 5; tz += 6) {
      if (Math.random() > 0.3) {
        const tileW = 1.5 + Math.random() * 3;
        const tileH2 = 0.5 + Math.random() * 1.0;
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.05, tileH2, tileW), Math.random() > 0.5 ? tileAccent : tileBroken);
        tile.position.set(ws * (stationW / 2 - 0.3), 2 + Math.random() * 2, tz);
        group.add(tile);
      }
    }

    // Мох на стенах (нижняя часть)
    for (let mz = -stationLen / 2 + 3; mz < stationLen / 2 - 3; mz += 5) {
      if (Math.random() > 0.4) {
        const moss = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8 + Math.random() * 0.5, 1.5 + Math.random() * 2), mossMatA);
        moss.position.set(ws * (stationW / 2 - 0.28), 0.5 + Math.random() * 0.3, mz);
        group.add(moss);
      }
    }
  }

  // Граффити на стенах
  const grafTexts = ['R-111', 'ОПАСНО', 'ВЫХОДА НЕТ', 'НЕ ВХОДИ'];
  for (let gi = 0; gi < 4; gi++) {
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 512;
    gCanvas.height = 256;
    const gCtx = gCanvas.getContext('2d')!;
    gCtx.fillStyle = gi % 2 === 0 ? '#cc2222' : '#22aa44';
    gCtx.font = `bold ${60 + Math.random() * 40}px Arial`;
    gCtx.textAlign = 'center';
    gCtx.textBaseline = 'middle';
    gCtx.fillText(grafTexts[gi], 256, 128);
    const gTex = new THREE.CanvasTexture(gCanvas);
    const gMat = new THREE.MeshStandardMaterial({ map: gTex, transparent: true, roughness: 0.8 });
    const ws = gi < 2 ? -1 : 1;
    const grafMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), gMat);
    grafMesh.position.set(ws * (stationW / 2 - 0.2), 3 + Math.random(), -30 + gi * 20);
    grafMesh.rotation.y = ws > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(grafMesh);
  }

  // Торцевые стены
  for (const zs of [-1, 1]) {
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(stationW, ceilingH, 0.5), crackConcrete);
    endWall.position.set(0, ceilingH / 2, zs * (stationLen / 2 + 10));
    group.add(endWall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, ceilingH / 2, zs * (stationLen / 2 + 10)), new THREE.Vector3(stationW, ceilingH, 0.5)));
  }

  // === РЕЛЬСЫ (ржавые, погнутые) ===
  for (const rx of [-3.5, -2.5, 2.5, 3.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, stationLen + 10), rustMat);
    rail.position.set(rx, 0.05, 0);
    group.add(rail);
  }
  // Шпалы (гнилые, некоторые сломаны)
  for (let sz = -stationLen / 2; sz < stationLen / 2; sz += 1.5) {
    if (Math.random() > 0.15) {
      for (const tx of [-3, 3]) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.2), darkMat);
        tie.position.set(tx, 0.01, sz);
        if (Math.random() > 0.7) tie.rotation.y = Math.random() * 0.3; // сдвинутые
        group.add(tie);
      }
    }
  }

  // === КОЛОННЫ (потрескавшиеся, некоторые накренились) ===
  for (let cz = -stationLen / 2 + 5; cz < stationLen / 2 - 5; cz += 10) {
    for (const cx of [-5, 5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, ceilingH, 10), columnMat);
      col.position.set(cx, ceilingH / 2, cz);
      // Некоторые колонны слегка наклонены
      if (Math.random() > 0.7) {
        col.rotation.x = (Math.random() - 0.5) * 0.08;
        col.rotation.z = (Math.random() - 0.5) * 0.08;
      }
      col.castShadow = true;
      group.add(col);
      bodies.push(physics.createStaticBox(new THREE.Vector3(cx, ceilingH / 2, cz), new THREE.Vector3(0.7, ceilingH, 0.7)));

      // Трещины на колоннах
      if (Math.random() > 0.5) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, ceilingH * 0.6, 0.04), darkMat);
        crack.position.set(cx + 0.25, ceilingH * 0.4, cz);
        group.add(crack);
      }

      // Мох у основания
      if (Math.random() > 0.4) {
        const colMoss = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.5, 8), mossMatA);
        colMoss.position.set(cx, 0.25, cz);
        group.add(colMoss);
      }
    }
  }

  // === СКАМЕЙКИ (сломанные) ===
  for (let bz = -40; bz <= 40; bz += 20) {
    for (const bx of [-9, 9]) {
      if (Math.random() > 0.3) {
        // Целая (но грязная)
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.5), benchMat);
        seat.position.set(bx, platformH + 0.45, bz);
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), benchMat);
        back.position.set(bx, platformH + 0.7, bz - 0.22);
        back.rotation.z = Math.random() > 0.5 ? 0 : (Math.random() - 0.5) * 0.2;
        group.add(back);
      } else {
        // Сломанная — куски на полу
        const piece1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.4), benchMat);
        piece1.position.set(bx - 0.3, platformH + 0.1, bz);
        piece1.rotation.z = 0.4;
        group.add(piece1);
        const piece2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.06), benchMat);
        piece2.position.set(bx + 0.5, platformH + 0.15, bz + 0.3);
        piece2.rotation.set(0.3, 0.5, 0.8);
        group.add(piece2);
      }
    }
  }

  // === ВАГОНЫ МЕТРО (заброшенные, ржавые, разбитые) ===
  for (const vx of [-3, 3]) {
    for (let vi = 0; vi < 3; vi++) {
      const vz = -30 + vi * 22;
      const wagon = new THREE.Group();

      // Корпус (ржавый)
      const wBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 18), wagonMat);
      wBody.position.y = 1.5;
      wagon.add(wBody);

      // Пятна ржавчины
      for (let ri = 0; ri < 6; ri++) {
        const rustPatch = new THREE.Mesh(
          new THREE.BoxGeometry(0.6 + Math.random() * 1.0, 0.4 + Math.random() * 0.8, 0.04),
          wagonRust
        );
        const ws = Math.random() > 0.5 ? 1 : -1;
        rustPatch.position.set(ws * 1.42, 0.8 + Math.random() * 1.5, -7 + Math.random() * 14);
        wagon.add(rustPatch);
      }

      // Крыша (помятая)
      const wRoof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.15, 18.2), wagonRust);
      wRoof.position.y = 2.8;
      wRoof.rotation.z = (Math.random() - 0.5) * 0.03;
      wagon.add(wRoof);

      // Разбитые окна (некоторые отсутствуют)
      for (const ws of [-1, 1]) {
        for (let wi = 0; wi < 8; wi++) {
          if (Math.random() > 0.3) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 1.5), glassBroken);
            win.position.set(ws * 1.41, 1.8, -7 + wi * 2.2);
            wagon.add(win);
          }
          // Осколки стекла под окном
          if (Math.random() > 0.5) {
            const shard = new THREE.Mesh(
              new THREE.BoxGeometry(0.3 + Math.random() * 0.3, 0.02, 0.2 + Math.random() * 0.3),
              glassBroken
            );
            shard.position.set(ws * 1.8, 0.02, -7 + wi * 2.2);
            wagon.add(shard);
          }
        }
      }

      // Двери (заклинившие, некоторые приоткрыты)
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x666660, roughness: 0.6, metalness: 0.4 });
      for (const ws of [-1, 1]) {
        for (const dz of [-6, 0, 6]) {
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 1.2), doorMat);
          const doorOpen = Math.random() > 0.6 ? 0.3 + Math.random() * 0.5 : 0;
          door.position.set(ws * (1.42 + doorOpen * 0.1), 1.3, dz + doorOpen);
          door.rotation.y = ws * doorOpen * 0.3;
          wagon.add(door);
        }
      }

      // Выцветшие полосы
      const stripeMat = new THREE.MeshBasicMaterial({ color: vi === 1 ? 0x661111 : 0x6a5a11 });
      for (const ws of [-1, 1]) {
        const wStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 17.5), stripeMat);
        wStripe.position.set(ws * 1.42, 2.4, 0);
        wagon.add(wStripe);
      }

      // Колёса (ржавые)
      for (const wz2 of [-7, -2, 3, 7]) {
        for (const wx2 of [-1, 1]) {
          const whl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8), rustMat);
          whl.rotation.z = Math.PI / 2;
          whl.position.set(wx2 * 1.1, 0.35, wz2);
          wagon.add(whl);
        }
      }

      // Некоторые вагоны сошли с рельсов
      wagon.position.set(vx + (vi === 2 ? 0.5 : 0), 0, vz);
      if (vi === 2) wagon.rotation.y = 0.04;
      group.add(wagon);
    }
  }

  // === ПАУТИНА (между колоннами и на потолке) ===
  for (let cz = -stationLen / 2 + 10; cz < stationLen / 2 - 10; cz += 20) {
    if (Math.random() > 0.4) {
      // Между колоннами
      const web = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), cobwebMat);
      web.position.set(0, ceilingH - 1.5, cz);
      group.add(web);
    }
    // На потолке
    if (Math.random() > 0.5) {
      const webCeil = new THREE.Mesh(new THREE.PlaneGeometry(4 + Math.random() * 4, 3 + Math.random() * 3), cobwebMat);
      webCeil.position.set((Math.random() - 0.5) * 15, ceilingH - 0.1, cz);
      webCeil.rotation.x = Math.PI / 2;
      group.add(webCeil);
    }
  }

  // === ЛУЖИ на платформах ===
  for (let i = 0; i < 10; i++) {
    const px = (i % 2 === 0 ? -9 : 9) + (Math.random() - 0.5) * 4;
    const pz = (Math.random() - 0.5) * stationLen * 0.7;
    const puddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 + Math.random() * 1.0, 0.5 + Math.random() * 1.0, 0.02, 8),
      waterMat
    );
    puddle.position.set(px, platformH + 0.02, pz);
    group.add(puddle);
  }

  // === МУСОР и обломки на платформах ===
  for (let i = 0; i < 25; i++) {
    const mx = (i % 2 === 0 ? -9 : 9) + (Math.random() - 0.5) * 5;
    const mz = (Math.random() - 0.5) * stationLen * 0.8;
    const dType = Math.floor(Math.random() * 3);
    if (dType === 0) {
      // Кусок бетона
      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 + Math.random() * 0.5, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.4),
        concreteMat
      );
      debris.position.set(mx, platformH + 0.15, mz);
      debris.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
      group.add(debris);
    } else if (dType === 1) {
      // Ржавая арматура
      const rebar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.0 + Math.random() * 1.5, 4),
        rustMat
      );
      rebar.position.set(mx, platformH + 0.5, mz);
      rebar.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.8);
      group.add(rebar);
    } else {
      // Бочка (ржавая)
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), rustMat
      );
      barrel.position.set(mx, platformH + 0.4, mz);
      if (Math.random() > 0.5) barrel.rotation.z = Math.PI / 2; // лежит на боку
      group.add(barrel);
    }
  }

  // === ТАБЛО (разбитые, свисающие) ===
  for (let tz = -40; tz <= 40; tz += 40) {
    for (const tx of [-8, 8]) {
      const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), rustMat);
      signPost.position.set(tx, platformH + 1, tz);
      if (Math.random() > 0.5) signPost.rotation.z = (Math.random() - 0.5) * 0.3; // погнутый
      group.add(signPost);
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.7 })
      );
      signBoard.position.set(tx, platformH + 2.2, tz);
      // Некоторые свисают на одном креплении
      if (Math.random() > 0.5) {
        signBoard.rotation.z = (Math.random() - 0.5) * 0.6;
        signBoard.position.y -= 0.3;
      }
      group.add(signBoard);
    }
  }

  // === КАПАЮЩАЯ ВОДА (вертикальные полосы с потолка) ===
  for (let i = 0; i < 8; i++) {
    const dx = (Math.random() - 0.5) * (stationW - 6);
    const dz = (Math.random() - 0.5) * stationLen * 0.8;
    // Полоса воды
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ceilingH, 4), waterMat);
    drip.position.set(dx, ceilingH / 2, dz);
    group.add(drip);
    // Водяное пятно на потолке
    const stain = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 6), waterMat);
    stain.position.set(dx, ceilingH + 0.2, dz);
    group.add(stain);
  }

  // === ОГОНЬКИ (редкие, мерцающие — остатки электричества) ===
  // Большинство ламп не работает — тёмные корпуса
  for (let lz = -stationLen / 2; lz <= stationLen / 2; lz += 8) {
    for (const lx of [-6, 0, 6]) {
      const lampWorking = Math.random() > 0.75; // только 25% работают
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 1.5),
        new THREE.MeshStandardMaterial({
          color: lampWorking ? 0x886644 : 0x222220,
          emissive: lampWorking ? 0x553311 : 0x000000,
          emissiveIntensity: lampWorking ? 0.4 : 0,
          roughness: 0.6
        })
      );
      lamp.position.set(lx, ceilingH - 0.05, lz);
      group.add(lamp);

      // Свисающие провода от сломанных ламп
      if (!lampWorking && Math.random() > 0.5) {
        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 1.0 + Math.random() * 1.5, 4),
          darkMat
        );
        wire.position.set(lx + 0.1, ceilingH - 0.8, lz);
        wire.rotation.z = (Math.random() - 0.5) * 0.5;
        group.add(wire);
      }
    }
  }

  // Работающие источники света (тусклые, жёлтые — аварийные)
  for (let lz = -stationLen / 2; lz <= stationLen / 2; lz += 30) {
    const pLight = new THREE.PointLight(0x774422, 1.2, 12);
    pLight.position.set((Math.random() - 0.5) * 8, ceilingH - 0.5, lz);
    lights.push(pLight);
  }

  // Красные аварийные огни (редкие)
  for (let lz = -stationLen / 2 + 15; lz <= stationLen / 2 - 15; lz += 40) {
    const emergLight = new THREE.PointLight(0xff2200, 0.8, 10);
    emergLight.position.set(-14, 3, lz);
    lights.push(emergLight);
    // Лампа на стене
    const emergLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    emergLamp.position.set(-14.7, 3, lz);
    group.add(emergLamp);
  }

  // Общее освещение (очень тёмное)
  const hemi = new THREE.HemisphereLight(0x221a11, 0x0a0808, 0.3);
  lights.push(hemi);
  const ambient = new THREE.AmbientLight(0x1a1510, 0.3);
  lights.push(ambient);

  scene.add(group);
  for (const l of lights) scene.add(l);

  // === ТОЛЬКО БОСС ===
  const enemies: THREE.Vector3[] = [];
  const turrets: THREE.Vector3[] = [];

  return {
    group, bodies, lights,
    playerSpawn: new THREE.Vector3(-8, platformH + 1.5, -50),
    fogColor: 0x0e0c08, bgColor: 0x080604,
    enemies,
    turrets,
  };
}
