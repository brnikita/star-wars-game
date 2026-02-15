import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { GrievousRef } from './TestLevel';

export interface LevelData {
  group: THREE.Group;
  bodies: CANNON.Body[];
  lights: THREE.Light[];
  enemies: THREE.Vector3[];
  playerSpawn: THREE.Vector3;
  fogColor: number;
  bgColor: number;
  grievousRef?: GrievousRef;
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
  };
}

// =====================================================
// УРОВЕНЬ 9: ПУСТЫННАЯ ПЛАНЕТА
// =====================================================
export function createDesertPlanet(scene: THREE.Scene, physics: PhysicsSystem): LevelData {
  const group = new THREE.Group();
  const bodies: CANNON.Body[] = [];
  const lights: THREE.Light[] = [];

  const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.9, metalness: 0.0 });
  const darkSandMat = new THREE.MeshStandardMaterial({ color: 0xb89858, roughness: 0.85, metalness: 0.0 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 0.8, metalness: 0.1 });
  const ruinMat = new THREE.MeshStandardMaterial({ color: 0xc0a878, roughness: 0.7, metalness: 0.1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.5, metalness: 0.5 });

  // Пол — песок
  const floor = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 120), sandMat);
  floor.position.set(0, -0.25, -55);
  floor.receiveShadow = true;
  group.add(floor);
  bodies.push(physics.createStaticBox(new THREE.Vector3(0, -0.25, -55), new THREE.Vector3(120, 0.5, 120)));

  // Невидимые стены
  for (const s of [-1, 1]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 55, 4, -55), new THREE.Vector3(1, 8, 120)));
  }
  for (const z of [6, -116]) {
    bodies.push(physics.createStaticBox(new THREE.Vector3(0, 4, z), new THREE.Vector3(112, 8, 1)));
  }

  // Песчаные дюны (большие бугры)
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = -10 - Math.random() * 95;
    const r = 4 + Math.random() * 6;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), darkSandMat);
    dune.position.set(x, 0, z);
    group.add(dune);
    if (Math.random() > 0.5) {
      bodies.push(physics.createStaticBox(new THREE.Vector3(x, 1, z), new THREE.Vector3(r, 2, r)));
    }
  }

  // Скальные формации
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = -15 - Math.random() * 85;
    const h = 3 + Math.random() * 5;
    const rock = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 3, h, 2 + Math.random() * 3), rockMat);
    rock.position.set(x, h / 2, z);
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    group.add(rock);
    bodies.push(physics.createStaticBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(5, h, 5)));
  }

  // Руины (древний храм)
  const ruinX = 0;
  const ruinZ = -55;
  // Стены руин
  for (const s of [-1, 1]) {
    const rWall = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 12), ruinMat);
    rWall.position.set(s * 8 + ruinX, 2, ruinZ);
    group.add(rWall);
    bodies.push(physics.createStaticBox(new THREE.Vector3(s * 8 + ruinX, 2, ruinZ), new THREE.Vector3(1, 4, 12)));
  }
  // Обломки колонн
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3, 6), ruinMat);
    col.position.set(ruinX + (i - 1.5) * 4, 1.5, ruinZ + 7);
    group.add(col);
  }
  // Упавшая колонна
  const fallenCol = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 6), ruinMat);
  fallenCol.position.set(ruinX + 3, 0.5, ruinZ - 3);
  fallenCol.rotation.z = Math.PI / 2;
  group.add(fallenCol);
  bodies.push(physics.createStaticBox(new THREE.Vector3(ruinX + 3, 0.5, ruinZ - 3), new THREE.Vector3(5, 1, 1)));

  // Обломки техники (разбитый транспорт)
  for (let i = 0; i < 3; i++) {
    const wx = 20 + (Math.random() - 0.5) * 30;
    const wz = -25 - i * 30;
    const wreck = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), metalMat);
    hull.position.y = 0.8;
    wreck.add(hull);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 2), metalMat);
    wing.position.set(0, 1.2, -1);
    wing.rotation.z = (Math.random() - 0.5) * 0.5;
    wreck.add(wing);
    wreck.position.set(wx, 0, wz);
    wreck.rotation.y = Math.random() * Math.PI;
    group.add(wreck);
    bodies.push(physics.createStaticBox(new THREE.Vector3(wx, 1, wz), new THREE.Vector3(5, 2, 6)));
  }

  // Скелеты кораблей (рёбра торчат из песка)
  for (let i = 0; i < 2; i++) {
    const sx = -25 + i * 50;
    const sz = -30 - i * 40;
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), metalMat);
      rib.position.set(sx, 2, sz + r * 3);
      rib.rotation.z = 0.3;
      group.add(rib);
    }
  }

  // Освещение — яркое пустынное солнце
  const hemi = new THREE.HemisphereLight(0xffeedd, 0xaa8855, 1.5);
  lights.push(hemi);
  const amb = new THREE.AmbientLight(0xffddaa, 0.6);
  lights.push(amb);
  const dir = new THREE.DirectionalLight(0xfff0cc, 2.0);
  dir.position.set(15, 25, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  dir.shadow.camera.far = 100;
  lights.push(dir);

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
  };
}
