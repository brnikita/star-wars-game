import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { GrievousRef } from './TestLevel';

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
