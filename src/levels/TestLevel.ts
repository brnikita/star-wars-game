import * as THREE from 'three';
import { PhysicsSystem } from '../systems/PhysicsSystem';

// === ОБЩИЕ МАТЕРИАЛЫ ===
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.4 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.5, metalness: 0.5 });
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x2e2e35, roughness: 0.7, metalness: 0.3 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.3, metalness: 0.7 });
const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.6 });
const screenMat = new THREE.MeshBasicMaterial({ color: 0x2266aa });
const screenGreenMat = new THREE.MeshBasicMaterial({ color: 0x22aa44 });
const screenRedMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.4, metalness: 0.7 });
const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.3, metalness: 0.8 });
const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.3, metalness: 0.7 });
const spaceMat = new THREE.MeshBasicMaterial({ color: 0x000011 });
const lightStripMat = new THREE.MeshBasicMaterial({ color: 0x88bbee });
const crateMatA = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8, metalness: 0.1 });
const crateMatB = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.7, metalness: 0.2 });
const hologramMat = new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.4 });
const barMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });
const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.5, metalness: 0.4 });
const tableMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.4, metalness: 0.5 });
const trayMat = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.3, metalness: 0.6 });
const foodMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.8, metalness: 0.0 });
const crewUniformMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.7, metalness: 0.2 });
const crewSkinMat = new THREE.MeshStandardMaterial({ color: 0xdbb896, roughness: 0.6, metalness: 0.0 });
const crewHairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9, metalness: 0.0 });
const crewBootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.3 });

// Размеры
const H = 7; // высота потолков в залах
const CORRIDOR_W = 10; // ширина коридора
const HALL_W = 30; // ширина зала
const HALL_D = 35; // глубина зала

export interface GrievousRef {
  group: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  claws: THREE.Mesh[];
}

export function createTestLevel(scene: THREE.Scene, physics: PhysicsSystem): GrievousRef | null {
  // Схема: коридор идёт по Z от 0 до -170
  // 6 залов по бокам коридора:
  // Зал 1 (управление)        — слева,  z=-25
  // Зал 2 (тюрьма)            — справа, z=-25
  // Зал 3 (склад)             — слева,  z=-75
  // Зал 4 (столовая)          — справа, z=-75
  // Зал 5 (спальня)           — слева,  z=-125
  // Зал 6 (спас. отсек + WC)  — справа, z=-125

  const shipLen = 170;
  const corrHalf = CORRIDOR_W / 2;
  const grievousRoomZ = -shipLen; // комната Гривуса в конце корабля
  const grievousRoomD = 40;
  const grievousRoomW = 40;
  const grievousH = 9; // высокий потолок

  // === ПОЛ ===
  const totalLen = shipLen + grievousRoomD + 5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, totalLen + 20), floorMat);
  floor.position.set(0, -0.1, -totalLen / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  physics.createStaticBox(new THREE.Vector3(0, -0.1, -totalLen / 2), new THREE.Vector3(100, 0.2, totalLen + 20));

  // === ГЛАВНЫЙ КОРИДОР ===
  createCorridor(scene, physics, shipLen, corrHalf, H);

  // === 6 ЗАЛОВ ===
  createHall(scene, physics, -1, -25, HALL_W, HALL_D, H, 'bridge');
  createHall(scene, physics, 1, -25, HALL_W, HALL_D, H, 'prison');
  createHall(scene, physics, -1, -75, HALL_W, HALL_D, H, 'storage');
  createHall(scene, physics, 1, -75, HALL_W, HALL_D, H, 'canteen');
  createHall(scene, physics, -1, -125, HALL_W, HALL_D, H, 'bedroom');
  createHall(scene, physics, 1, -125, HALL_W, HALL_D, H, 'escape_wc');

  // === КОМНАТА ГЕНЕРАЛА ГРИВУСА (в конце корабля) ===
  const grievousRef = createGrievousRoom(scene, physics, grievousRoomZ, grievousRoomW, grievousRoomD, grievousH);

  // === УКРЫТИЯ В КОРИДОРЕ ===
  const barriers = [
    { x: -3, z: -12 }, { x: 3, z: -40 },
    { x: -2, z: -60 }, { x: 3, z: -90 },
    { x: -3, z: -105 }, { x: 3, z: -115 },
    { x: -2, z: -145 }, { x: 3, z: -158 },
  ];
  barriers.forEach((b) => {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 0.4), panelMat);
    barrier.position.set(b.x, 0.6, b.z);
    barrier.castShadow = true;
    scene.add(barrier);
    physics.createStaticBox(new THREE.Vector3(b.x, 0.6, b.z), new THREE.Vector3(2.5, 1.2, 0.4));
  });

  // === КОСМИЧЕСКОЕ ОКНО В НАЧАЛЕ КОРИДОРА ===
  createBridgeWindow(scene, 0, -1);

  // === НЕВИДИМЫЕ СТЕНЫ ===
  physics.createStaticBox(new THREE.Vector3(0, 5, 1), new THREE.Vector3(100, 10, 0.4));
  physics.createStaticBox(new THREE.Vector3(0, 5, -totalLen - 1), new THREE.Vector3(100, 10, 0.4));
  physics.createStaticBox(new THREE.Vector3(-50, 5, -totalLen / 2), new THREE.Vector3(0.4, 10, totalLen + 20));
  physics.createStaticBox(new THREE.Vector3(50, 5, -totalLen / 2), new THREE.Vector3(0.4, 10, totalLen + 20));

  return grievousRef;
}

// === КОРИДОР ===
function createCorridor(scene: THREE.Scene, physics: PhysicsSystem, len: number, half: number, h: number): void {
  // Стены коридора (с проёмами для дверей)
  // Залы на z=-25, z=-75, z=-125
  const doorZ = [-25, -75, -125];
  const doorW = 5;

  for (const side of [-1, 1]) {
    const wallX = side * half;

    // Разбиваем стену на сегменты, пропуская дверные проёмы
    const segments: [number, number][] = []; // [startZ, endZ]
    let prev = 0;
    for (const dz of doorZ) {
      const top = dz + doorW / 2;
      const bot = dz - doorW / 2;
      if (prev > top) { /* skip */ }
      else {
        segments.push([prev, top]);
      }
      prev = bot;
    }
    segments.push([prev, -len]);

    segments.forEach(([startZ, endZ]) => {
      const segLen = Math.abs(startZ - endZ);
      const midZ = (startZ + endZ) / 2;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, segLen), wallMat);
      wall.position.set(wallX, h / 2, midZ);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      physics.createStaticBox(new THREE.Vector3(wallX, h / 2, midZ), new THREE.Vector3(0.4, h, segLen));
    });

    // Дверные рамы
    doorZ.forEach((dz) => {
      const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, doorW + 0.4), doorFrameMat);
      doorTop.position.set(wallX, h - 0.15, dz);
      scene.add(doorTop);

      for (const ds of [-1, 1]) {
        const doorSide = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.25), doorFrameMat);
        doorSide.position.set(wallX, h / 2, dz + ds * (doorW / 2 + 0.12));
        scene.add(doorSide);
      }
    });

    // Декор полосы
    const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, len), trimMat);
    trimBottom.position.set(side * (half - 0.22), 0.08, -len / 2);
    scene.add(trimBottom);
  }

  // Потолок
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_W + 0.4, 0.3, len), ceilingMat);
  ceiling.position.set(0, h, -len / 2);
  scene.add(ceiling);

  // Световые полосы
  for (let z = -3; z > -len; z -= 6) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 1.2), lightStripMat);
    strip.position.set(0, h - 0.16, z);
    scene.add(strip);
  }

  // Точечные огни
  for (let z = -8; z > -len; z -= 15) {
    const light = new THREE.PointLight(0xccddff, 3, 20);
    light.position.set(0, h - 0.5, z);
    scene.add(light);
  }

  // Трубы на потолке
  for (const xOff of [-3, 3]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(xOff, h - 0.4, -len / 2);
    scene.add(pipe);
  }
}

// === ЗАЛ ===
function createHall(
  scene: THREE.Scene, physics: PhysicsSystem,
  side: number, doorZ: number, w: number, d: number, h: number, type: string
): void {
  const cx = side * (CORRIDOR_W / 2 + w / 2 + 0.2);
  const cz = doorZ;

  // Пол
  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), floorMat);
  roomFloor.position.set(cx, 0, cz);
  roomFloor.receiveShadow = true;
  scene.add(roomFloor);

  // Потолок
  const roomCeiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), ceilingMat);
  roomCeiling.position.set(cx, h, cz);
  scene.add(roomCeiling);

  // Дальняя стена (от коридора)
  const outerX = cx + side * w / 2;
  const outerWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), wallMat);
  outerWall.position.set(outerX, h / 2, cz);
  outerWall.castShadow = true;
  scene.add(outerWall);
  physics.createStaticBox(new THREE.Vector3(outerX, h / 2, cz), new THREE.Vector3(0.4, h, d));

  // Передняя стена (z + d/2)
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
  frontWall.position.set(cx, h / 2, cz + d / 2);
  frontWall.castShadow = true;
  scene.add(frontWall);
  physics.createStaticBox(new THREE.Vector3(cx, h / 2, cz + d / 2), new THREE.Vector3(w, h, 0.4));

  // Задняя стена (z - d/2)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
  backWall.position.set(cx, h / 2, cz - d / 2);
  backWall.castShadow = true;
  scene.add(backWall);
  physics.createStaticBox(new THREE.Vector3(cx, h / 2, cz - d / 2), new THREE.Vector3(w, h, 0.4));

  // Стена со стороны коридора (с дверным проёмом)
  const corrWallX = side * (CORRIDOR_W / 2 + 0.2);
  const doorW = 5;
  const sideSegH = (d - doorW) / 2;

  // Верхняя часть (по Z)
  if (sideSegH > 0.5) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, sideSegH), wallMat);
    seg1.position.set(corrWallX, h / 2, cz + doorW / 2 + sideSegH / 2);
    scene.add(seg1);
    physics.createStaticBox(new THREE.Vector3(corrWallX, h / 2, cz + doorW / 2 + sideSegH / 2), new THREE.Vector3(0.4, h, sideSegH));

    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, sideSegH), wallMat);
    seg2.position.set(corrWallX, h / 2, cz - doorW / 2 - sideSegH / 2);
    scene.add(seg2);
    physics.createStaticBox(new THREE.Vector3(corrWallX, h / 2, cz - doorW / 2 - sideSegH / 2), new THREE.Vector3(0.4, h, sideSegH));
  }

  // Дверная рама
  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, doorW + 0.4), doorFrameMat);
  doorTop.position.set(corrWallX, h - 0.15, cz);
  scene.add(doorTop);

  for (const ds of [-1, 1]) {
    const doorSide = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.25), doorFrameMat);
    doorSide.position.set(corrWallX, h / 2, cz + ds * (doorW / 2 + 0.12));
    scene.add(doorSide);
  }

  // Свет зала (2 точечных)
  for (const zo of [-d / 4, d / 4]) {
    const light = new THREE.PointLight(0xccddff, 3, 30);
    light.position.set(cx, h - 0.5, cz + zo);
    scene.add(light);
  }

  // Световые полосы на потолке
  for (let z = cz - d / 2 + 3; z < cz + d / 2; z += 6) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.04, 1.2), lightStripMat);
    strip.position.set(cx, h - 0.12, z);
    scene.add(strip);
  }

  // Наполнение
  fillHall(scene, physics, cx, cz, w, d, h, type, side);
}

// === НАПОЛНЕНИЕ ЗАЛОВ ===
function fillHall(
  scene: THREE.Scene, physics: PhysicsSystem,
  cx: number, cz: number, w: number, d: number, h: number, type: string, side: number
): void {
  switch (type) {
    case 'bridge': {
      // === ЦЕНТР УПРАВЛЕНИЯ ===
      // Главный пульт в центре
      const mainConsole = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 2), panelMat);
      mainConsole.position.set(cx, 0.6, cz);
      mainConsole.castShadow = true;
      scene.add(mainConsole);
      physics.createStaticBox(new THREE.Vector3(cx, 0.6, cz), new THREE.Vector3(8, 1.2, 2));

      // Экраны на пульте
      const mainScreen = new THREE.Mesh(new THREE.BoxGeometry(7, 1.5, 0.05), screenMat);
      mainScreen.position.set(cx, 2.0, cz - 0.8);
      mainScreen.rotation.x = -0.15;
      scene.add(mainScreen);

      // Боковые пульты
      for (const zo of [-8, 8]) {
        const sideConsole = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 1.5), panelMat);
        sideConsole.position.set(cx, 0.5, cz + zo);
        sideConsole.castShadow = true;
        scene.add(sideConsole);
        physics.createStaticBox(new THREE.Vector3(cx, 0.5, cz + zo), new THREE.Vector3(5, 1, 1.5));

        const sScreen = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 0.05), screenGreenMat);
        sScreen.position.set(cx, 1.4, cz + zo - 0.5);
        sScreen.rotation.x = -0.2;
        scene.add(sScreen);
      }

      // Голограмма галактики
      const holo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), hologramMat);
      holo.position.set(cx, 3.5, cz);
      scene.add(holo);

      // Голографическое кольцо
      const holoRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 24), hologramMat);
      holoRing.position.set(cx, 3.5, cz);
      holoRing.rotation.x = Math.PI / 2;
      scene.add(holoRing);

      // Капитанское кресло
      const chair = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), panelMat);
      chair.position.set(cx, 0.6, cz + 4);
      scene.add(chair);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.2), panelMat);
      chairBack.position.set(cx, 1.5, cz + 4.65);
      scene.add(chairBack);

      // Экипаж за пультами
      addSeatedPerson(scene, cx, cz + 3.5, Math.PI, 0.7); // капитан в кресле
      addSeatedPerson(scene, cx - 2, cz + 1.3, Math.PI); // оператор
      addSeatedPerson(scene, cx + 2, cz + 1.3, Math.PI); // оператор
      addSeatedPerson(scene, cx - 1.5, cz - 6.8, Math.PI); // за боковым пультом
      addSeatedPerson(scene, cx + 1.5, cz + 9.2, Math.PI); // за боковым пультом

      // Большое окно в космос (дальняя стена)
      createSpaceWindow(scene, cx, cz, side, w, h);
      break;
    }

    case 'prison': {
      // === ТЮРЬМА ===
      const cellW = 4;
      const cellD = 5;
      const cols = 3;
      const rows = 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cellX = cx - (cols * cellW) / 2 + col * cellW + cellW / 2;
          const cellZ = cz + (row === 0 ? -d / 4 : d / 4);

          // Стены камеры (задняя и боковые)
          const cellBack = new THREE.Mesh(new THREE.BoxGeometry(cellW, h * 0.7, 0.2), wallMat);
          cellBack.position.set(cellX, h * 0.35, cellZ - cellD / 2);
          scene.add(cellBack);
          physics.createStaticBox(new THREE.Vector3(cellX, h * 0.35, cellZ - cellD / 2), new THREE.Vector3(cellW, h * 0.7, 0.2));

          // Боковые стены
          for (const s of [-1, 1]) {
            const cellSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, h * 0.7, cellD), wallMat);
            cellSide.position.set(cellX + s * cellW / 2, h * 0.35, cellZ);
            scene.add(cellSide);
            physics.createStaticBox(new THREE.Vector3(cellX + s * cellW / 2, h * 0.35, cellZ), new THREE.Vector3(0.2, h * 0.7, cellD));
          }

          // Решётки (передняя стена — вертикальные прутья)
          for (let b = -3; b <= 3; b++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h * 0.7, 6), barMat);
            bar.position.set(cellX + b * 0.35, h * 0.35, cellZ + cellD / 2);
            scene.add(bar);
          }
          // Горизонтальная перекладина решётки
          const crossBar = new THREE.Mesh(new THREE.BoxGeometry(cellW - 0.2, 0.06, 0.06), barMat);
          crossBar.position.set(cellX, h * 0.5, cellZ + cellD / 2);
          scene.add(crossBar);
          // Коллизия решётки
          physics.createStaticBox(new THREE.Vector3(cellX, h * 0.35, cellZ + cellD / 2), new THREE.Vector3(cellW, h * 0.7, 0.1));

          // Койка в камере
          const bunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.5), benchMat);
          bunk.position.set(cellX - cellW / 4, 0.15, cellZ - 0.5);
          scene.add(bunk);

          // Красный свет в камере
          if (col === 1) {
            const cellLight = new THREE.PointLight(0xff4444, 1, 8);
            cellLight.position.set(cellX, h * 0.6, cellZ);
            scene.add(cellLight);
          }
        }
      }

      // Пульт охраны
      const guardConsole = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.5), panelMat);
      guardConsole.position.set(cx, 0.5, cz);
      guardConsole.castShadow = true;
      scene.add(guardConsole);
      physics.createStaticBox(new THREE.Vector3(cx, 0.5, cz), new THREE.Vector3(4, 1, 1.5));

      const guardScreen = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.05), screenRedMat);
      guardScreen.position.set(cx, 1.5, cz - 0.5);
      guardScreen.rotation.x = -0.15;
      scene.add(guardScreen);

      // === ДЖАББА ХАТТ (реалистичный) в центральной камере ===
      {
        const jabbaX = cx;
        const jabbaZ = cz - d / 4;

        // Материалы
        const jSkin = new THREE.MeshStandardMaterial({ color: 0x5a7040, roughness: 0.75, metalness: 0.05 });
        const jSkinDark = new THREE.MeshStandardMaterial({ color: 0x4a5e30, roughness: 0.8, metalness: 0.03 });
        const jBelly = new THREE.MeshStandardMaterial({ color: 0xa89860, roughness: 0.65, metalness: 0.05 });
        const jBellyLight = new THREE.MeshStandardMaterial({ color: 0xc0aa70, roughness: 0.6, metalness: 0.05 });
        const jMouth = new THREE.MeshStandardMaterial({ color: 0x8b5a3a, roughness: 0.9, metalness: 0.0 });
        const jTongue = new THREE.MeshStandardMaterial({ color: 0xbb6644, roughness: 0.85, metalness: 0.0 });
        const jEyeWhite = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
        const jPupil = new THREE.MeshBasicMaterial({ color: 0x882200 });
        const jWart = new THREE.MeshStandardMaterial({ color: 0x4a5528, roughness: 0.9, metalness: 0.0 });
        const jNostril = new THREE.MeshStandardMaterial({ color: 0x3a4a22, roughness: 0.9, metalness: 0.0 });

        const jabba = new THREE.Group();
        jabba.position.set(jabbaX, 0, jabbaZ);

        // === ОСНОВНОЕ ТЕЛО (массивный слизень) ===
        // Нижняя часть тела (широкая основа)
        const bodyBase = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 12), jSkin);
        bodyBase.position.set(0, 0.45, 0);
        bodyBase.scale.set(1.4, 0.65, 1.5);
        bodyBase.castShadow = true;
        jabba.add(bodyBase);

        // Верхняя часть тела (спина)
        const bodyUpper = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), jSkinDark);
        bodyUpper.position.set(0, 0.7, -0.1);
        bodyUpper.scale.set(1.3, 0.7, 1.3);
        jabba.add(bodyUpper);

        // Живот (выпирающий, светлый)
        const bellyMain = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), jBelly);
        bellyMain.position.set(0, 0.38, 0.25);
        bellyMain.scale.set(1.2, 0.6, 1.0);
        jabba.add(bellyMain);

        // Нижний живот (свисающие складки)
        const bellyLow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), jBellyLight);
        bellyLow.position.set(0, 0.2, 0.3);
        bellyLow.scale.set(1.1, 0.4, 0.8);
        jabba.add(bellyLow);

        // Складки жира на теле
        for (let i = 0; i < 5; i++) {
          const fold = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.08, 0.025, 6, 16), jSkinDark);
          fold.position.set(0, 0.25 + i * 0.1, 0);
          fold.rotation.x = Math.PI / 2;
          fold.scale.set(1.2, 1.3, 1);
          jabba.add(fold);
        }

        // Боковые жировые складки
        for (const s of [-1, 1]) {
          const sideFold = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), jSkin);
          sideFold.position.set(s * 0.65, 0.35, 0.1);
          sideFold.scale.set(0.8, 0.5, 1.0);
          jabba.add(sideFold);
        }

        // === ГОЛОВА (массивная, жабья) ===
        const headG = new THREE.Group();
        headG.position.set(0, 0.85, 0.3);

        // Основа головы (широкая, сплюснутая)
        const headMain = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), jSkin);
        headMain.scale.set(1.4, 0.8, 1.1);
        headG.add(headMain);

        // Верх головы (чуть темнее)
        const headTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), jSkinDark);
        headTop.position.set(0, 0.12, -0.05);
        headTop.scale.set(1.3, 0.5, 1.0);
        headG.add(headTop);

        // Надбровные дуги (жирные, нависающие)
        for (const s of [-1, 1]) {
          const brow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), jSkin);
          brow.position.set(s * 0.2, 0.1, 0.2);
          brow.scale.set(1.2, 0.6, 0.8);
          headG.add(brow);
        }

        // Глаза (большие, выпуклые, рептильные)
        for (const s of [-1, 1]) {
          // Глазное яблоко
          const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), jEyeWhite);
          eyeball.position.set(s * 0.2, 0.06, 0.26);
          headG.add(eyeball);

          // Зрачок (вертикальная щель)
          const pupilBg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), jPupil);
          pupilBg.position.set(s * 0.2, 0.06, 0.32);
          headG.add(pupilBg);

          // Щелевой зрачок
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.005), new THREE.MeshBasicMaterial({ color: 0x110000 }));
          slit.position.set(s * 0.2, 0.06, 0.34);
          headG.add(slit);

          // Верхнее веко (полуприкрытое)
          const upperLid = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), jSkin);
          upperLid.position.set(s * 0.2, 0.08, 0.26);
          upperLid.scale.set(1.1, 0.8, 1.0);
          headG.add(upperLid);

          // Нижнее веко (мешок под глазом)
          const lowerLid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), jSkin);
          lowerLid.position.set(s * 0.2, -0.02, 0.28);
          lowerLid.scale.set(1.0, 0.4, 0.6);
          headG.add(lowerLid);
        }

        // Нос (плоский, 2 широкие ноздри)
        const noseBridge = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), jSkin);
        noseBridge.position.set(0, -0.02, 0.3);
        noseBridge.scale.set(1.2, 0.6, 0.8);
        headG.add(noseBridge);

        for (const s of [-1, 1]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), jNostril);
          nostril.position.set(s * 0.05, -0.05, 0.33);
          headG.add(nostril);
        }

        // Щёки (обвисшие, жирные)
        for (const s of [-1, 1]) {
          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), jSkin);
          cheek.position.set(s * 0.28, -0.08, 0.1);
          cheek.scale.set(0.8, 0.7, 0.9);
          headG.add(cheek);

          // Нижние подвесы щёк
          const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), jBelly);
          jowl.position.set(s * 0.25, -0.18, 0.12);
          jowl.scale.set(0.7, 0.5, 0.7);
          headG.add(jowl);
        }

        // Рот (широкий, жабий)
        const mouthOpening = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.12), jMouth);
        mouthOpening.position.set(0, -0.14, 0.25);
        headG.add(mouthOpening);

        // Верхняя губа
        const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), jSkin);
        upperLip.position.set(0, -0.1, 0.28);
        upperLip.scale.set(1.8, 0.4, 0.8);
        upperLip.rotation.x = Math.PI;
        headG.add(upperLip);

        // Нижняя губа (толстая)
        const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), jBelly);
        lowerLip.position.set(0, -0.18, 0.26);
        lowerLip.scale.set(1.6, 0.35, 0.7);
        headG.add(lowerLip);

        // Язык (виден в приоткрытом рту)
        const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), jTongue);
        tongue.position.set(0, -0.15, 0.27);
        tongue.scale.set(1.5, 0.4, 1.0);
        headG.add(tongue);

        // Подбородок (тройной)
        for (let i = 0; i < 3; i++) {
          const chin = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.04, 8, 6), i === 0 ? jBelly : jBellyLight);
          chin.position.set(0, -0.22 - i * 0.08, 0.18 - i * 0.05);
          chin.scale.set(1.2 + i * 0.2, 0.4, 0.7);
          headG.add(chin);
        }

        // Бородавки на голове
        const wartPositions = [
          [0.15, 0.15, 0.2], [-0.12, 0.18, 0.15], [0.3, -0.05, 0.08],
          [-0.28, 0.0, 0.1], [0.08, -0.08, 0.32], [-0.2, 0.12, 0.22],
        ];
        wartPositions.forEach(([wx, wy, wz]) => {
          const wart = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 6, 6), jWart);
          wart.position.set(wx, wy, wz);
          headG.add(wart);
        });

        jabba.add(headG);

        // === РУКИ (маленькие, толстые) ===
        for (const s of [-1, 1]) {
          const armG = new THREE.Group();
          armG.position.set(s * 0.55, 0.6, 0.2);

          // Плечо (жирное)
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), jSkin);
          shoulder.scale.set(1.0, 0.8, 0.8);
          armG.add(shoulder);

          // Верхняя часть руки
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.18, 8), jSkin);
          upperArm.position.set(s * 0.08, -0.08, 0);
          upperArm.rotation.z = s * 0.6;
          armG.add(upperArm);

          // Предплечье
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.15, 8), jSkin);
          forearm.position.set(s * 0.18, -0.12, 0.05);
          forearm.rotation.z = s * 0.4;
          forearm.rotation.x = -0.3;
          armG.add(forearm);

          // Ладонь (пухлая)
          const palm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), jBelly);
          palm.position.set(s * 0.26, -0.14, 0.1);
          armG.add(palm);

          // Пальцы (4 коротких, толстых)
          for (let f = 0; f < 4; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.04, 5), jBelly);
            finger.position.set(s * 0.26 + (f - 1.5) * 0.015, -0.15, 0.14);
            finger.rotation.x = -0.3;
            armG.add(finger);
          }

          jabba.add(armG);
        }

        // === ХВОСТ (длинный, сужающийся, со складками) ===
        const tailSegments = [
          { r1: 0.35, r2: 0.28, len: 0.5, y: 0.25, z: -0.4 },
          { r1: 0.28, r2: 0.2, len: 0.5, y: 0.2, z: -0.85 },
          { r1: 0.2, r2: 0.13, len: 0.5, y: 0.16, z: -1.28 },
          { r1: 0.13, r2: 0.07, len: 0.45, y: 0.13, z: -1.65 },
          { r1: 0.07, r2: 0.02, len: 0.4, y: 0.1, z: -1.95 },
        ];
        tailSegments.forEach((seg, i) => {
          const mat = i % 2 === 0 ? jSkin : jSkinDark;
          const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(seg.r1, seg.r2, seg.len, 10), mat);
          tailSeg.position.set(0, seg.y, seg.z);
          tailSeg.rotation.x = Math.PI / 2 + (i * 0.05);
          tailSeg.castShadow = true;
          jabba.add(tailSeg);

          // Складки между сегментами
          if (i < 4) {
            const foldRing = new THREE.Mesh(
              new THREE.TorusGeometry(seg.r2 + 0.02, 0.015, 6, 12), jSkinDark
            );
            foldRing.position.set(0, seg.y - 0.02, seg.z - seg.len / 2);
            foldRing.rotation.x = Math.PI / 2;
            jabba.add(foldRing);
          }
        });

        // Верх хвоста (тёмные пятна / текстура)
        for (let i = 0; i < 6; i++) {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 6, 6), jSkinDark);
          spot.position.set(
            (Math.random() - 0.5) * 0.15,
            0.3 + Math.random() * 0.08,
            -0.3 - i * 0.3
          );
          spot.scale.set(1.5, 0.3, 1.5);
          jabba.add(spot);
        }

        // Бородавки на теле
        for (let i = 0; i < 10; i++) {
          const bwart = new THREE.Mesh(
            new THREE.SphereGeometry(0.012 + Math.random() * 0.01, 5, 5), jWart
          );
          const angle = Math.random() * Math.PI * 2;
          const hgt = 0.3 + Math.random() * 0.5;
          bwart.position.set(
            Math.cos(angle) * (0.5 + Math.random() * 0.3),
            hgt,
            Math.sin(angle) * (0.4 + Math.random() * 0.3)
          );
          jabba.add(bwart);
        }

        scene.add(jabba);
      }
      break;
    }

    case 'storage': {
      // === СКЛАД ===
      // Ряды стеллажей
      for (let row = 0; row < 3; row++) {
        const rz = cz - d / 3 + row * (d / 3);

        // Стеллаж (каркас)
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 3, 1.5), panelMat);
        shelf.position.set(cx, 1.5, rz);
        shelf.castShadow = true;
        scene.add(shelf);
        physics.createStaticBox(new THREE.Vector3(cx, 1.5, rz), new THREE.Vector3(w * 0.7, 3, 1.5));

        // Ящики на стеллажах
        for (let i = 0; i < 5; i++) {
          const mat = i % 2 === 0 ? crateMatA : crateMatB;
          const s = 0.8 + Math.sin(i * 3 + row) * 0.3;
          const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
          const crateX = cx - w / 3 + i * (w / 7);
          crate.position.set(crateX, 3.2 + s / 2, rz);
          crate.castShadow = true;
          scene.add(crate);
        }
      }

      // Одиночные ящики у стен
      for (let i = 0; i < 4; i++) {
        const s = 1 + Math.sin(i * 5) * 0.4;
        const mat = i % 2 === 0 ? crateMatA : crateMatB;
        const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
        const crateX = cx + (i % 2 === 0 ? -1 : 1) * (w / 3);
        const crateZ = cz + (i < 2 ? d / 3 : -d / 3);
        crate.position.set(crateX, s / 2, crateZ);
        crate.castShadow = true;
        scene.add(crate);
        physics.createStaticBox(new THREE.Vector3(crateX, s / 2, crateZ), new THREE.Vector3(s, s, s));
      }

      // Рабочие открывают ящики
      addBendingPerson(scene, cx - w / 4, cz - d / 3 + 2, 0);
      addBendingPerson(scene, cx + w / 5, cz, Math.PI);
      addBendingPerson(scene, cx - w / 6, cz + d / 3 - 2, Math.PI / 2);
      break;
    }

    case 'canteen': {
      // === СТОЛОВАЯ ===
      // Столы с лавками (4 ряда по 2)
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          const tx = cx - w / 4 + col * (w / 2);
          const tz = cz - d / 3 + row * (d / 5);

          // Стол
          const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.8), tableMat);
          table.position.set(tx, 0.8, tz);
          scene.add(table);

          // Ножки стола
          for (const lx of [-1.7, 1.7]) {
            for (const lz of [-0.7, 0.7]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), tableMat);
              leg.position.set(tx + lx, 0.4, tz + lz);
              scene.add(leg);
            }
          }

          // Лавки по бокам
          for (const bz of [-1.3, 1.3]) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.5), benchMat);
            bench.position.set(tx, 0.45, tz + bz);
            scene.add(bench);
          }

          // Подносы на столе
          for (let t = 0; t < 2; t++) {
            const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.5), trayMat);
            tray.position.set(tx - 1 + t * 2, 0.87, tz);
            scene.add(tray);

            // Еда на подносе
            const food = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), foodMat);
            food.position.set(tx - 1 + t * 2, 0.97, tz);
            scene.add(food);
          }

          // Коллизия стола
          physics.createStaticBox(new THREE.Vector3(tx, 0.5, tz), new THREE.Vector3(4, 1, 2));
        }
      }

      // Раздаточная стойка у дальней стены
      const counterX = cx + side * (w / 2 - 2);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1, d * 0.6), panelMat);
      counter.position.set(counterX, 0.55, cz);
      counter.castShadow = true;
      scene.add(counter);
      physics.createStaticBox(new THREE.Vector3(counterX, 0.55, cz), new THREE.Vector3(2, 1.1, d * 0.6));

      // Экран меню
      const menuScreen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 3), screenGreenMat);
      menuScreen.position.set(counterX + side * 0.3, 2, cz);
      scene.add(menuScreen);

      // Тёплый свет столовой
      const warmLight = new THREE.PointLight(0xffcc88, 2, 25);
      warmLight.position.set(cx, h - 0.5, cz);
      scene.add(warmLight);

      // Люди обедают за столами
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          const tx = cx - w / 4 + c * (w / 2);
          const tz = cz - d / 3 + r * (d / 5);
          const benchSide = (r + c) % 2 === 0 ? -1 : 1;
          addSeatedPerson(scene, tx, tz + benchSide * 1.3, benchSide > 0 ? Math.PI : 0);
        }
      }

      // Робот-повар за раздаточной стойкой
      {
        const robotBodyMat = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.3, metalness: 0.7 });
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
        const apronMat2 = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8, metalness: 0.0 });

        const robot = new THREE.Group();
        robot.position.set(counterX - side * 0.5, 0, cz);
        robot.rotation.y = side * Math.PI / 2;

        // Корпус
        const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), robotBodyMat);
        rBody.position.set(0, 0.95, 0);
        rBody.castShadow = true;
        robot.add(rBody);

        // Фартук
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.02), apronMat2);
        apron.position.set(0, 0.85, 0.14);
        robot.add(apron);

        // Голова (цилиндр)
        const rHead = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 8), robotBodyMat);
        rHead.position.set(0, 1.35, 0);
        robot.add(rHead);

        // Визор (синяя полоса)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), visorMat);
        visor.position.set(0, 1.37, 0.13);
        robot.add(visor);

        // Поварской колпак
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 8), apronMat2);
        hat.position.set(0, 1.58, 0);
        robot.add(hat);

        // Руки
        for (const s of [-1, 1]) {
          const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.35, 6), robotBodyMat);
          rArm.position.set(s * 0.24, 0.85, 0.1);
          rArm.rotation.x = 0.5;
          robot.add(rArm);

          const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), robotBodyMat);
          rHand.position.set(s * 0.24, 0.65, 0.25);
          robot.add(rHand);
        }

        // Ноги
        for (const s of [-1, 1]) {
          const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), robotBodyMat);
          rLeg.position.set(s * 0.1, 0.35, 0);
          robot.add(rLeg);
        }

        // Ступни
        for (const s of [-1, 1]) {
          const rFoot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.14), robotBodyMat);
          rFoot.position.set(s * 0.1, 0.08, 0.02);
          robot.add(rFoot);
        }

        scene.add(robot);
      }
      break;
    }

    case 'bedroom': {
      // === СПАЛЬНЯ ===
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.7, metalness: 0.3 });
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.9, metalness: 0.0 });
      const blanketMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.8, metalness: 0.05 });
      const lockerMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.4, metalness: 0.6 });

      // 3 ряда по 2 двухъярусные кровати
      for (let row = 0; row < 3; row++) {
        for (let col of [-1, 1]) {
          const bx = cx + col * (w / 4);
          const bz = cz - d / 3 + row * (d / 3);

          // Каркас (стойки)
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 6), barMat);
              post.position.set(bx + sx * 1.1, 1.75, bz + sz * 0.5);
              scene.add(post);
            }
          }

          // Нижняя кровать
          const bedBottom = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1.2), bedMat);
          bedBottom.position.set(bx, 0.5, bz);
          scene.add(bedBottom);

          const pillowB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.35), pillowMat);
          pillowB.position.set(bx - 0.65, 0.6, bz);
          scene.add(pillowB);

          const blanketB = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1), blanketMat);
          blanketB.position.set(bx + 0.2, 0.6, bz);
          scene.add(blanketB);

          // Верхняя кровать
          const bedTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1.2), bedMat);
          bedTop.position.set(bx, 2.2, bz);
          scene.add(bedTop);

          const pillowT = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.35), pillowMat);
          pillowT.position.set(bx - 0.65, 2.3, bz);
          scene.add(pillowT);

          const blanketT = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1), blanketMat);
          blanketT.position.set(bx + 0.2, 2.3, bz);
          scene.add(blanketT);

          // Коллизия блока кроватей
          physics.createStaticBox(new THREE.Vector3(bx, 1.2, bz), new THREE.Vector3(2.4, 2.4, 1.4));
        }
      }

      // Шкафчики вдоль дальней стены
      for (let i = 0; i < 6; i++) {
        const locker = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.6), lockerMat);
        const lx = cx - w / 3 + i * (w / 7);
        locker.position.set(lx, 1, cz + d / 2 - 1);
        locker.castShadow = true;
        scene.add(locker);
      }
      physics.createStaticBox(
        new THREE.Vector3(cx, 1, cz + d / 2 - 1),
        new THREE.Vector3(w * 0.8, 2, 0.8)
      );

      // Тёплый приглушённый свет
      const bedroomLight = new THREE.PointLight(0xddbb88, 1.5, 25);
      bedroomLight.position.set(cx, h - 0.5, cz);
      scene.add(bedroomLight);

      // Спящие люди на кроватях
      for (let row = 0; row < 3; row++) {
        for (const col of [-1, 1]) {
          const bx = cx + col * (w / 4);
          const bz = cz - d / 3 + row * (d / 3);
          // На нижней койке (поверхность y≈0.56)
          addSleepingPerson(scene, bx - 0.55, 0.56, bz, 1);
          // На верхней койке (каждая вторая)
          if (row % 2 === 0) {
            addSleepingPerson(scene, bx - 0.55, 2.26, bz, 1);
          }
        }
      }
      break;
    }

    case 'escape_wc': {
      // === СПАСАТЕЛЬНЫЙ ОТСЕК + ТУАЛЕТ ===
      const podMat = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.3, metalness: 0.7 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x224455, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.4,
      });
      const wcTileMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.1 });
      const wcFixtureMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.5 });
      const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.95 });

      // --- Спасательные капсулы (левая половина зала) ---
      const escapeX = cx - w / 4;

      for (let i = 0; i < 4; i++) {
        const pz = cz - d / 3 + i * (d / 5);

        // Корпус капсулы
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 10), podMat);
        pod.position.set(escapeX, 1.25, pz);
        pod.castShadow = true;
        scene.add(pod);
        physics.createStaticBox(new THREE.Vector3(escapeX, 1.25, pz), new THREE.Vector3(2.5, 2.5, 2.5));

        // Стеклянный люк
        const hatch = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 10), glassMat);
        hatch.position.set(escapeX, 2.55, pz);
        scene.add(hatch);

        // Номер капсулы (светящийся)
        const numLight = new THREE.PointLight(
          i < 2 ? 0x44ff44 : 0xff4444, 0.5, 5
        );
        numLight.position.set(escapeX + 1.3, 1.5, pz);
        scene.add(numLight);

        // Индикатор (зелёный = готова, красный = отстрелена)
        const indicator = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.3, 0.05),
          i < 2 ? screenGreenMat : screenRedMat
        );
        indicator.position.set(escapeX + 1.3, 1.5, pz);
        scene.add(indicator);
      }

      // Пульт запуска
      const launchConsole = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), panelMat);
      launchConsole.position.set(escapeX, 0.5, cz + d / 3);
      scene.add(launchConsole);
      physics.createStaticBox(new THREE.Vector3(escapeX, 0.5, cz + d / 3), new THREE.Vector3(3, 1, 1));

      const launchScreen = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 0.05), screenRedMat);
      launchScreen.position.set(escapeX, 1.4, cz + d / 3 - 0.3);
      launchScreen.rotation.x = -0.15;
      scene.add(launchScreen);

      // --- ТУАЛЕТ / WC (правая половина зала) ---
      const wcX = cx + w / 4;

      // Перегородка между спас. отсеком и WC
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, d * 0.85), wallMat);
      divider.position.set(cx, h / 2, cz);
      scene.add(divider);
      physics.createStaticBox(new THREE.Vector3(cx, h / 2, cz), new THREE.Vector3(0.2, h, d * 0.85));

      // Пол WC (белая плитка)
      const wcFloor = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 1, 0.05, d * 0.85), wcTileMat);
      wcFloor.position.set(wcX, 0.05, cz);
      scene.add(wcFloor);

      // Кабинки (3 штуки)
      for (let i = 0; i < 3; i++) {
        const cabZ = cz - d / 4 + i * (d / 4);

        // Стенки кабинки
        for (const s of [-1, 1]) {
          const cabWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 2), panelMat);
          cabWall.position.set(wcX + s * 1.2, 1, cabZ);
          scene.add(cabWall);
        }
        // Задняя стенка
        const cabBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 0.08), panelMat);
        cabBack.position.set(wcX, 1, cabZ - 1);
        scene.add(cabBack);

        // Унитаз
        const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8), wcFixtureMat);
        toilet.position.set(wcX, 0.2, cabZ - 0.5);
        scene.add(toilet);

        // Крышка
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8), wcFixtureMat);
        lid.position.set(wcX, 0.42, cabZ - 0.5);
        scene.add(lid);

        // Коллизия кабинки
        physics.createStaticBox(new THREE.Vector3(wcX, 1, cabZ), new THREE.Vector3(2.5, 2, 2.2));
      }

      // Раковины (2 штуки)
      for (let i = 0; i < 2; i++) {
        const sinkZ = cz + d / 4 + i * 2;

        const sink = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.5), wcFixtureMat);
        sink.position.set(wcX + w / 4 - 1.5, 0.85, sinkZ);
        scene.add(sink);

        // Кран
        const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), barMat);
        faucet.position.set(wcX + w / 4 - 1.5, 1.05, sinkZ - 0.15);
        scene.add(faucet);
      }

      // Зеркало
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 2.5), mirrorMat);
      mirror.position.set(wcX + w / 4 - 1.2, 1.8, cz + d / 4 + 1);
      scene.add(mirror);

      // Яркий белый свет WC
      const wcLight = new THREE.PointLight(0xffffff, 2, 20);
      wcLight.position.set(wcX, h - 0.5, cz);
      scene.add(wcLight);
      break;
    }
  }
}

// === КОМНАТА ГЕНЕРАЛА ГРИВУСА ===
function createGrievousRoom(
  scene: THREE.Scene, physics: PhysicsSystem,
  startZ: number, w: number, d: number, h: number
): GrievousRef {
  const cz = startZ - d / 2;
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.3, metalness: 0.8 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0x886622, roughness: 0.2, metalness: 0.9 });
  const throneMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.3, metalness: 0.7 });
  const capeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.0 });
  const saber1Mat = new THREE.MeshBasicMaterial({ color: 0x4488ff }); // синий
  const saber2Mat = new THREE.MeshBasicMaterial({ color: 0x44ff44 }); // зелёный
  const saber3Mat = new THREE.MeshBasicMaterial({ color: 0xff4444 }); // красный (Вентресс)
  const saber4Mat = new THREE.MeshBasicMaterial({ color: 0xffff44 }); // жёлтый
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 });
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7, metalness: 0.1 });
  const separatistMat = new THREE.MeshBasicMaterial({ color: 0x2244aa });

  // Пол (тёмный, полированный)
  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), darkMetalMat);
  roomFloor.position.set(0, 0, cz);
  roomFloor.receiveShadow = true;
  scene.add(roomFloor);

  // Потолок (высокий)
  const roomCeiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), ceilingMat);
  roomCeiling.position.set(0, h, cz);
  scene.add(roomCeiling);

  // Стены
  // Задняя стена (дальняя от входа)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), darkMetalMat);
  backWall.position.set(0, h / 2, cz - d / 2);
  backWall.castShadow = true;
  scene.add(backWall);
  physics.createStaticBox(new THREE.Vector3(0, h / 2, cz - d / 2), new THREE.Vector3(w, h, 0.4));

  // Боковые стены
  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), darkMetalMat);
    sideWall.position.set(side * w / 2, h / 2, cz);
    sideWall.castShadow = true;
    scene.add(sideWall);
    physics.createStaticBox(new THREE.Vector3(side * w / 2, h / 2, cz), new THREE.Vector3(0.4, h, d));
  }

  // Передняя стена с проёмом (вход из коридора)
  const doorW = 6;
  const sideSegW = (w - doorW) / 2;
  for (const side of [-1, 1]) {
    const frontSeg = new THREE.Mesh(new THREE.BoxGeometry(sideSegW, h, 0.4), darkMetalMat);
    frontSeg.position.set(side * (doorW / 2 + sideSegW / 2), h / 2, startZ);
    scene.add(frontSeg);
    physics.createStaticBox(
      new THREE.Vector3(side * (doorW / 2 + sideSegW / 2), h / 2, startZ),
      new THREE.Vector3(sideSegW, h, 0.4)
    );
  }

  // Дверная рама (золотая)
  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.4, 0.6), goldTrimMat);
  doorTop.position.set(0, h - 0.2, startZ);
  scene.add(doorTop);
  for (const ds of [-1, 1]) {
    const doorSide = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.6), goldTrimMat);
    doorSide.position.set(ds * (doorW / 2 + 0.15), h / 2, startZ);
    scene.add(doorSide);
  }

  // === ТРОН ГРИВУСА (в центре задней стены) ===
  // Платформа
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.6, 12), darkMetalMat);
  platform.position.set(0, 0.3, cz - d / 2 + 5);
  platform.castShadow = true;
  scene.add(platform);
  physics.createStaticBox(new THREE.Vector3(0, 0.3, cz - d / 2 + 5), new THREE.Vector3(7, 0.6, 7));

  // Ступени
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 1), darkMetalMat);
  step1.position.set(0, 0.1, cz - d / 2 + 8);
  scene.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1), darkMetalMat);
  step2.position.set(0, 0.3, cz - d / 2 + 7);
  scene.add(step2);

  // Кресло-трон
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2), throneMat);
  seat.position.set(0, 0.85, cz - d / 2 + 5);
  seat.castShadow = true;
  scene.add(seat);

  const throneBack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 0.3), throneMat);
  throneBack.position.set(0, 2.85, cz - d / 2 + 3.8);
  throneBack.castShadow = true;
  scene.add(throneBack);

  // Золотые подлокотники
  for (const s of [-1, 1]) {
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 2), goldTrimMat);
    armrest.position.set(s * 1.3, 1.2, cz - d / 2 + 5);
    scene.add(armrest);
  }

  // Символ Сепаратистов на спинке трона
  const sepSymbol = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 16), goldTrimMat);
  sepSymbol.position.set(0, 3.5, cz - d / 2 + 3.65);
  scene.add(sepSymbol);

  // === ГЕНЕРАЛ ГРИВУС (спит на троне) — детальная модель ===
  const gMetal = new THREE.MeshStandardMaterial({ color: 0xc4a870, roughness: 0.3, metalness: 0.5 });
  const gArmorL = new THREE.MeshStandardMaterial({ color: 0xd4b880, roughness: 0.25, metalness: 0.55 });
  const gArmorD = new THREE.MeshStandardMaterial({ color: 0xb09060, roughness: 0.25, metalness: 0.55 });
  const gFace = new THREE.MeshStandardMaterial({ color: 0xd4b880, roughness: 0.35, metalness: 0.2 });
  const gFaceDet = new THREE.MeshStandardMaterial({ color: 0xc4a870, roughness: 0.3, metalness: 0.25 });
  const gEyeDim = new THREE.MeshBasicMaterial({ color: 0x887711 });
  const gEyeSlit = new THREE.MeshBasicMaterial({ color: 0x554400 });
  const gJoint = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.3, metalness: 0.8 });
  const gGutSack = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.7, metalness: 0.1 });
  const gTube = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.4, metalness: 0.7 });
  const gClaw = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.2, metalness: 0.9 });

  const throneZ = cz - d / 2 + 5;
  const grievous = new THREE.Group();
  grievous.position.set(0, 1.1, throneZ);

  const gEyes: THREE.Mesh[] = [];
  const gClaws: THREE.Mesh[] = [];

  // ===== ГОЛОВА (детальная маска Калиша) =====
  const headG = new THREE.Group();
  headG.position.set(0, 1.45, 0.12);
  headG.rotation.x = 0.55; // опущена — спит

  // Основа черепа
  const skullMain = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.38), gFace);
  skullMain.position.set(0, 0, -0.02);
  headG.add(skullMain);

  // Гребень черепа (вытянут назад)
  const skullCrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.5), gFace);
  skullCrest.position.set(0, 0.16, -0.08);
  headG.add(skullCrest);

  // Затылок (удлинённый)
  const skullRear = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), gFace);
  skullRear.position.set(0, 0.05, -0.32);
  headG.add(skullRear);

  const skullTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.2), gFace);
  skullTip.position.set(0, 0.03, -0.5);
  headG.add(skullTip);

  // Центральный гребень маски (вертикальный разделитель)
  const faceRidge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.35), gFaceDet);
  faceRidge.position.set(0, 0, 0.03);
  headG.add(faceRidge);

  // Надбровные дуги
  for (const s of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), gFace);
    brow.position.set(s * 0.1, 0.13, 0.13);
    headG.add(brow);

    // Верхняя кромка надбровья (острая)
    const browEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), gFaceDet);
    browEdge.position.set(s * 0.1, 0.17, 0.15);
    headG.add(browEdge);
  }

  // Глазницы (глубокие тёмные впадины)
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.08), gJoint);
    socket.position.set(s * 0.1, 0.04, 0.15);
    headG.add(socket);

    // Глаз (тусклый рептильный — спит)
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), gEyeDim);
    eyeBall.position.set(s * 0.1, 0.04, 0.19);
    headG.add(eyeBall);
    gEyes.push(eyeBall);

    // Вертикальный зрачок-щель
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.005), gEyeSlit);
    pupil.position.set(s * 0.1, 0.04, 0.215);
    headG.add(pupil);

    // Нижнее веко (полуприкрыто)
    const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), gFace);
    eyelid.position.set(s * 0.1, 0.01, 0.19);
    headG.add(eyelid);
  }

  // Скулы (угловатые, острые)
  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.2), gFace);
    cheek.position.set(s * 0.17, -0.04, 0.02);
    headG.add(cheek);

    // Нижний выступ скулы
    const cheekLow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), gFaceDet);
    cheekLow.position.set(s * 0.16, -0.12, 0.08);
    headG.add(cheekLow);
  }

  // Носовая область (плоская, 2 щели)
  for (const s of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.015), gJoint);
    nostril.position.set(s * 0.035, -0.03, 0.2);
    headG.add(nostril);
  }

  // Челюсть — составная (3 сегмента как у Гривуса)
  // Центральная пластина
  const jawCenter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.18), gFace);
  jawCenter.position.set(0, -0.16, 0.03);
  jawCenter.rotation.x = 0.08;
  headG.add(jawCenter);

  // Боковые пластины челюсти (подвижные)
  for (const s of [-1, 1]) {
    const jawSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.16), gFaceDet);
    jawSide.position.set(s * 0.13, -0.13, 0.03);
    jawSide.rotation.x = 0.05;
    headG.add(jawSide);

    // Зубчатый край челюсти
    const jawTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.1), gJoint);
    jawTeeth.position.set(s * 0.1, -0.19, 0.08);
    headG.add(jawTeeth);
  }

  // Подбородок (заострённый)
  const chinTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), gFace);
  chinTip.position.set(0, -0.22, 0.07);
  headG.add(chinTip);

  // Боковые пластины-уши
  for (const s of [-1, 1]) {
    const earPlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.12), gFaceDet);
    earPlate.position.set(s * 0.18, 0.04, -0.12);
    headG.add(earPlate);

    const earFin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.08), gFace);
    earFin.position.set(s * 0.2, 0.06, -0.16);
    headG.add(earFin);
  }

  grievous.add(headG);

  // ===== ШЕЯ (сегментированные позвонки) =====
  for (let i = 0; i < 5; i++) {
    const r = 0.055 + i * 0.012;
    const nSeg = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r + 0.005, 0.05, 8),
      i % 2 === 0 ? gMetal : gJoint
    );
    nSeg.position.set(0, 1.36 - i * 0.055, 0.06 - i * 0.015);
    nSeg.rotation.x = 0.12;
    grievous.add(nSeg);
  }

  // Трубки/кабели вдоль шеи
  for (const s of [-1, 1]) {
    const nTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), gTube);
    nTube.position.set(s * 0.06, 1.24, -0.02);
    nTube.rotation.x = 0.15;
    grievous.add(nTube);

    const nTube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), gTube);
    nTube2.position.set(s * 0.04, 1.2, 0.04);
    nTube2.rotation.x = 0.2;
    grievous.add(nTube2);
  }

  // ===== ТОРС =====
  // Верхняя грудная бронеплита
  const chestMain = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.32), gArmorL);
  chestMain.position.set(0, 0.9, 0.02);
  chestMain.castShadow = true;
  grievous.add(chestMain);

  // Центральная полоса на груди
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.02), gArmorD);
  chestStripe.position.set(0, 0.9, 0.18);
  grievous.add(chestStripe);

  // Передние бронепластины (2 половины — двустворчатая броня)
  for (const s of [-1, 1]) {
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.06), gArmorL);
    frontPlate.position.set(s * 0.18, 1.0, 0.17);
    grievous.add(frontPlate);

    // Декоративные рёбра-щели на броне
    for (let i = 0; i < 4; i++) {
      const ribSlot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.015), gJoint);
      ribSlot.position.set(s * 0.18, 0.82 + i * 0.05, 0.2);
      grievous.add(ribSlot);
    }

    // Боковые рёберные пластины
    for (let i = 0; i < 3; i++) {
      const sideRib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), gMetal);
      sideRib.position.set(s * 0.38, 0.78 + i * 0.08, 0);
      grievous.add(sideRib);
    }
  }

  // Гут-сак (органические внутренности — виден между пластинами)
  const gutSack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), gGutSack);
  gutSack.position.set(0, 0.75, 0.06);
  gutSack.scale.set(1.6, 1.0, 0.9);
  grievous.add(gutSack);

  // Пульсирующие трубки от гут-сака
  for (const s of [-1, 1]) {
    const gTube1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.35, 5), gTube);
    gTube1.position.set(s * 0.22, 0.72, -0.06);
    gTube1.rotation.z = s * 0.25;
    grievous.add(gTube1);

    const gTube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.2, 4), gTube);
    gTube2.position.set(s * 0.15, 0.65, 0.1);
    gTube2.rotation.z = s * 0.15;
    grievous.add(gTube2);
  }

  // Талия (очень узкая — механический стержень)
  const waistCore = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8), gMetal);
  waistCore.position.set(0, 0.55, 0);
  grievous.add(waistCore);

  const waistRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 12), gJoint);
  waistRing.position.set(0, 0.52, 0);
  waistRing.rotation.x = Math.PI / 2;
  grievous.add(waistRing);

  // Механический позвоночник (виден сзади)
  for (let i = 0; i < 6; i++) {
    const vertebra = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), gJoint);
    vertebra.position.set(0, 0.52 + i * 0.09, -0.16);
    grievous.add(vertebra);

    if (i % 2 === 0) {
      for (const s of [-1, 1]) {
        const spineFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), gMetal);
        spineFin.position.set(s * 0.05, 0.52 + i * 0.09, -0.18);
        grievous.add(spineFin);
      }
    }
  }

  // Таз / бёдра
  const pelvisG = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.35), gArmorD);
  pelvisG.position.set(0, 0.38, 0);
  pelvisG.castShadow = true;
  grievous.add(pelvisG);

  // Поясная передняя пластина
  const waistFrontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.06), gArmorL);
  waistFrontPlate.position.set(0, 0.44, 0.18);
  grievous.add(waistFrontPlate);

  // Набедренные бронепластины
  for (const s of [-1, 1]) {
    const hipPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.08), gArmorD);
    hipPlate.position.set(s * 0.25, 0.32, 0.14);
    grievous.add(hipPlate);
  }

  // ===== ПЛЕЧИ (массивные) =====
  const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.28), gArmorD);
  shoulderBar.position.set(0, 1.08, -0.02);
  shoulderBar.castShadow = true;
  grievous.add(shoulderBar);

  for (const s of [-1, 1]) {
    // Наплечник — основа
    const sPad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.24), gArmorL);
    sPad.position.set(s * 0.57, 1.12, -0.02);
    grievous.add(sPad);

    // Наплечник — верхняя крышка
    const sCap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), gArmorL);
    sCap.position.set(s * 0.57, 1.22, -0.02);
    grievous.add(sCap);

    // Вентиляционные щели
    for (let v = 0; v < 3; v++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.015), gJoint);
      vent.position.set(s * 0.57, 1.05 + v * 0.04, 0.11);
      grievous.add(vent);
    }

    // Крепёж к плечу
    const sMountRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 10), gJoint);
    sMountRing.position.set(s * 0.57, 1.08, -0.02);
    sMountRing.rotation.y = Math.PI / 2;
    grievous.add(sMountRing);
  }

  // ===== 4 РУКИ (верхняя пара — на подлокотниках) =====
  for (const s of [-1, 1]) {
    const armU = new THREE.Group();
    armU.position.set(s * 0.57, 1.02, 0);

    // Плечевой шар
    const sBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), gJoint);
    armU.add(sBall);

    // Плечо (бронированный сегмент)
    const upArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 8), gMetal);
    upArm.position.set(s * 0.12, -0.18, 0);
    upArm.rotation.z = s * 0.45;
    armU.add(upArm);

    // Бронепластина плеча
    const upArmPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.06), gArmorL);
    upArmPlate.position.set(s * 0.13, -0.15, 0.04);
    upArmPlate.rotation.z = s * 0.45;
    armU.add(upArmPlate);

    // Локтевой сустав (сложный)
    const elbowJ = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), gJoint);
    elbowJ.position.set(s * 0.3, -0.32, 0);
    armU.add(elbowJ);

    const elbowDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), gMetal);
    elbowDisc.position.set(s * 0.3, -0.32, 0);
    elbowDisc.rotation.x = Math.PI / 2;
    armU.add(elbowDisc);

    // Предплечье (на подлокотнике)
    const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.35, 8), gMetal);
    foreArm.position.set(s * 0.5, -0.32, 0.18);
    foreArm.rotation.x = -0.25;
    foreArm.rotation.z = s * 0.12;
    armU.add(foreArm);

    // Пластина на предплечье
    const fArmPlate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.04), gArmorD);
    fArmPlate.position.set(s * 0.5, -0.3, 0.22);
    fArmPlate.rotation.x = -0.25;
    armU.add(fArmPlate);

    // Запястный сустав
    const wristJ = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.05, 8), gJoint);
    wristJ.position.set(s * 0.63, -0.32, 0.36);
    armU.add(wristJ);

    // Ладонь (плоская, механическая)
    const palmU = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.08), gMetal);
    palmU.position.set(s * 0.67, -0.33, 0.42);
    armU.add(palmU);

    // 3 пальца-когтя (расслаблены)
    for (let f = 0; f < 3; f++) {
      // Фаланга 1
      const ph1 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.05, 4), gClaw);
      ph1.position.set(s * 0.67 + (f - 1) * 0.025, -0.34, 0.47);
      ph1.rotation.x = -0.2;
      armU.add(ph1);
      gClaws.push(ph1);

      // Фаланга 2 (загнутый коготь)
      const ph2 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.04, 4), gClaw);
      ph2.position.set(s * 0.67 + (f - 1) * 0.025, -0.35, 0.515);
      ph2.rotation.x = -0.5;
      armU.add(ph2);
      gClaws.push(ph2);
    }

    grievous.add(armU);
  }

  // ===== НОГИ (дигитиградные — обратное колено) =====
  for (const s of [-1, 1]) {
    const legG = new THREE.Group();
    legG.position.set(s * 0.22, 0.3, 0);

    // Тазобедренный сустав
    const hipJ = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), gJoint);
    legG.add(hipJ);

    // Бедро (бронированное)
    const thighG = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.45, 8), gMetal);
    thighG.position.set(0, -0.08, 0.3);
    thighG.rotation.x = -1.15;
    thighG.castShadow = true;
    legG.add(thighG);

    // Пластина бедра
    const thighPl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.05), gArmorL);
    thighPl.position.set(0, -0.05, 0.32);
    thighPl.rotation.x = -1.15;
    legG.add(thighPl);

    // Колено (обратное, выступает вперёд)
    const kneeJ = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), gJoint);
    kneeJ.position.set(0, -0.25, 0.65);
    legG.add(kneeJ);

    // Коленная бронепластина
    const kneePl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.06), gArmorD);
    kneePl.position.set(0, -0.25, 0.7);
    legG.add(kneePl);

    // Голень (идёт назад-вниз)
    const shinG = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.5, 8), gMetal);
    shinG.position.set(0, -0.55, 0.55);
    shinG.rotation.x = 0.35;
    legG.add(shinG);

    // Пластина голени
    const shinPl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.04), gArmorD);
    shinPl.position.set(0, -0.5, 0.58);
    shinPl.rotation.x = 0.35;
    legG.add(shinPl);

    // Лодыжка
    const ankleJ = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gJoint);
    ankleJ.position.set(0, -0.82, 0.42);
    legG.add(ankleJ);

    // Стопа (плоская, механическая)
    const footG = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.2), gMetal);
    footG.position.set(0, -0.88, 0.5);
    legG.add(footG);

    // 2 передних когтя
    for (const t of [-1, 1]) {
      const toeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.004, 0.12, 5), gClaw);
      toeFront.position.set(t * 0.03, -0.9, 0.63);
      toeFront.rotation.x = -0.5;
      legG.add(toeFront);
    }

    // Задняя шпора
    const heelSpur = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.08, 5), gClaw);
    heelSpur.position.set(0, -0.88, 0.38);
    heelSpur.rotation.x = 0.6;
    legG.add(heelSpur);

    grievous.add(legG);
  }

  scene.add(grievous);

  // === КОЛЛЕКЦИЯ СВЕТОВЫХ МЕЧЕЙ (на стенах) ===
  const saberColors = [saber1Mat, saber2Mat, saber3Mat, saber4Mat, saber1Mat, saber2Mat];

  // Левая стена — витрина с мечами
  for (let i = 0; i < 6; i++) {
    const sx = -w / 2 + 1;
    const sz = cz - d / 3 + i * (d / 8);

    // Держатель
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.3), darkMetalMat);
    mount.position.set(sx, 2.5, sz);
    scene.add(mount);

    // Рукоять
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.25, 8), handleMat);
    handle.position.set(sx + 0.15, 2.5, sz);
    handle.rotation.z = Math.PI / 2;
    scene.add(handle);

    // Лезвие
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), saberColors[i]);
    blade.position.set(sx + 0.65, 2.5, sz);
    blade.rotation.z = Math.PI / 2;
    scene.add(blade);

    // Подсветка
    if (i % 2 === 0) {
      const saberLight = new THREE.PointLight(
        i === 0 ? 0x4488ff : i === 2 ? 0xff4444 : 0x44ff44,
        0.5, 4
      );
      saberLight.position.set(sx + 0.5, 2.5, sz);
      scene.add(saberLight);
    }
  }

  // Стеклянная витрина
  const vitrina = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 2, d * 0.7),
    new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.2 })
  );
  vitrina.position.set(-w / 2 + 1.3, 2.5, cz);
  scene.add(vitrina);

  // === ПРАВАЯ СТЕНА — ТРОФЕИ ===
  // Черепа / шлемы побеждённых
  for (let i = 0; i < 4; i++) {
    const tz = cz - d / 4 + i * (d / 5);
    const tx = w / 2 - 1.5;

    // Подставка
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8), darkMetalMat);
    pedestal.position.set(tx, 0.4, tz);
    scene.add(pedestal);

    // Шлем/череп
    const trophy = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), skullMat);
    trophy.position.set(tx, 1.0, tz);
    trophy.scale.set(1, 0.85, 0.9);
    scene.add(trophy);
  }
  physics.createStaticBox(new THREE.Vector3(w / 2 - 1.5, 0.5, cz), new THREE.Vector3(1.2, 1.2, d * 0.8));

  // === ПЛАЩ ГРИВУСА (у задней стены, рядом с троном) ===
  const cape = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.1), capeMat);
  cape.position.set(-5, 2.5, cz - d / 2 + 0.5);
  scene.add(cape);

  // Вешалка
  const hanger = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.3), handleMat);
  hanger.position.set(-5, 4, cz - d / 2 + 0.5);
  scene.add(hanger);

  // === ЭКРАН СЕПАРАТИСТОВ (голографический) ===
  const holoScreen = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.05), separatistMat);
  holoScreen.position.set(5, 3, cz - d / 2 + 0.5);
  scene.add(holoScreen);

  // Символ на экране
  const holoSymbol = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0x4466cc }));
  holoSymbol.position.set(5, 3, cz - d / 2 + 0.58);
  scene.add(holoSymbol);

  // === КОЛОННЫ ===
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const cPosZ = cz + d / 2 - 5 - i * (d / 4);
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, h, 10), darkMetalMat);
      column.position.set(s * (w / 2 - 4), h / 2, cPosZ);
      column.castShadow = true;
      scene.add(column);
      physics.createStaticBox(new THREE.Vector3(s * (w / 2 - 4), h / 2, cPosZ), new THREE.Vector3(1, h, 1));

      // Золотое кольцо на колонне
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 16), goldTrimMat);
      ring.position.set(s * (w / 2 - 4), h - 1, cPosZ);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
    }
  }

  // === ОСВЕЩЕНИЕ ===
  // Главный свет — красно-багровый (зловещий)
  const mainLight = new THREE.PointLight(0xff4422, 2, 35);
  mainLight.position.set(0, h - 1, cz);
  scene.add(mainLight);

  // Подсветка трона
  const throneLight = new THREE.PointLight(0xffaa44, 2, 15);
  throneLight.position.set(0, h - 1, cz - d / 2 + 5);
  scene.add(throneLight);

  // Боковые холодные огни
  for (const s of [-1, 1]) {
    const sideLight = new THREE.PointLight(0x2244aa, 1.5, 20);
    sideLight.position.set(s * (w / 2 - 3), h - 1, cz);
    scene.add(sideLight);
  }

  // Световые полосы на потолке (красные)
  for (let z = cz - d / 2 + 4; z < cz + d / 2; z += 8) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.5, 0.04, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xaa3322 })
    );
    strip.position.set(0, h - 0.12, z);
    scene.add(strip);
  }

  // Большое окно в космос за троном
  const winW2 = w * 0.6;
  const winH2 = h * 0.5;
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW2 + 0.4, winH2 + 0.3, 0.3), goldTrimMat);
  winFrame.position.set(0, h / 2 + 1, cz - d / 2 + 0.2);
  scene.add(winFrame);

  const winSpace = new THREE.Mesh(new THREE.BoxGeometry(winW2, winH2, 0.05), spaceMat);
  winSpace.position.set(0, h / 2 + 1, cz - d / 2 - 0.05);
  scene.add(winSpace);

  for (let i = 0; i < 30; i++) {
    const bright = Math.random() > 0.6 ? 0xaaccff : 0xffffff;
    const star = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.02),
      new THREE.MeshBasicMaterial({ color: bright })
    );
    star.position.set(
      (Math.random() - 0.5) * winW2 * 0.9,
      h / 2 + 1 + (Math.random() - 0.5) * winH2 * 0.9,
      cz - d / 2 - 0.08
    );
    scene.add(star);
  }

  return { group: grievous, head: headG, eyes: gEyes, claws: gClaws };
}

// === КОСМИЧЕСКОЕ ОКНО (на дальней стене зала) ===
function createSpaceWindow(scene: THREE.Scene, cx: number, cz: number, side: number, w: number, h: number): void {
  const winX = cx + side * (w / 2 - 0.1);
  const winW = 0.3;
  const winH = h * 0.6;
  const winD = w * 0.5;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.2, winH + 0.3, winD + 0.3), windowFrameMat);
  frame.position.set(winX, h / 2, cz);
  scene.add(frame);

  const space = new THREE.Mesh(new THREE.BoxGeometry(0.05, winH, winD), spaceMat);
  space.position.set(winX + side * 0.15, h / 2, cz);
  scene.add(space);

  // Звёзды
  for (let i = 0; i < 20; i++) {
    const bright = Math.random() > 0.7 ? 0xaaccff : 0xffffff;
    const star = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: bright })
    );
    star.position.set(
      winX + side * 0.18,
      h / 2 + (Math.random() - 0.5) * winH * 0.85,
      cz + (Math.random() - 0.5) * winD * 0.85
    );
    scene.add(star);
  }
}

// === ОКНО В КОНЦЕ КОРИДОРА ===
function createBridgeWindow(scene: THREE.Scene, x: number, z: number): void {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.5), windowFrameMat);
  frame.position.set(x, 3.5, z);
  scene.add(frame);

  const dir = z < 0 ? -1 : 1;
  const space = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.05), spaceMat);
  space.position.set(x, 3.5, z + dir * 0.3);
  scene.add(space);

  for (let i = 0; i < 20; i++) {
    const bright = Math.random() > 0.7 ? 0xaaccff : 0xffffff;
    const star = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.02),
      new THREE.MeshBasicMaterial({ color: bright })
    );
    star.position.set(
      x + (Math.random() - 0.5) * 6,
      3.5 + (Math.random() - 0.5) * 2.8,
      z + dir * 0.34
    );
    scene.add(star);
  }
}

// === ЛЮДИ-ДЕКОРАЦИИ ===
function addSeatedPerson(scene: THREE.Scene, x: number, z: number, facingAngle: number, yOff: number = 0): void {
  const g = new THREE.Group();
  g.position.set(x, yOff, z);
  g.rotation.y = facingAngle;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), crewSkinMat);
  head.position.set(0, 0.95, 0);
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), crewHairMat);
  hair.position.set(0, 0.98, -0.01);
  g.add(hair);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.16), crewUniformMat);
  torso.position.set(0, 0.72, 0);
  torso.castShadow = true;
  g.add(torso);

  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.22, 6), crewUniformMat);
    arm.position.set(s * 0.16, 0.65, 0.15);
    arm.rotation.x = 1.0;
    g.add(arm);
  }

  for (const s of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 6), crewUniformMat);
    thigh.position.set(s * 0.08, 0.46, 0.12);
    thigh.rotation.x = -1.4;
    g.add(thigh);
  }

  for (const s of [-1, 1]) {
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 6), crewUniformMat);
    shin.position.set(s * 0.08, 0.17, 0.28);
    g.add(shin);
  }

  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.1), crewBootMat);
    boot.position.set(s * 0.08, 0.02, 0.3);
    g.add(boot);
  }

  scene.add(g);
}

function addSleepingPerson(scene: THREE.Scene, headX: number, bedY: number, z: number, bodyDir: number = 1): void {
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), crewSkinMat);
  head.position.set(headX, bedY + 0.11, z);
  scene.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), crewHairMat);
  hair.position.set(headX, bedY + 0.14, z);
  scene.add(hair);

  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.2), crewUniformMat);
  shoulder.position.set(headX + bodyDir * 0.2, bedY + 0.08, z);
  scene.add(shoulder);
}

function addBendingPerson(scene: THREE.Scene, x: number, z: number, facingAngle: number): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = facingAngle;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), crewSkinMat);
  head.position.set(0, 1.05, 0.18);
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), crewHairMat);
  hair.position.set(0, 1.08, 0.16);
  g.add(hair);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.16), crewUniformMat);
  torso.position.set(0, 0.88, 0.1);
  torso.rotation.x = 0.4;
  torso.castShadow = true;
  g.add(torso);

  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.28, 6), crewUniformMat);
    arm.position.set(s * 0.14, 0.7, 0.25);
    arm.rotation.x = 0.7;
    g.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), crewSkinMat);
    hand.position.set(s * 0.14, 0.5, 0.4);
    g.add(hand);
  }

  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), crewUniformMat);
    leg.position.set(s * 0.08, 0.33, 0);
    g.add(leg);
  }

  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.1), crewBootMat);
    boot.position.set(s * 0.08, 0.02, 0);
    g.add(boot);
  }

  scene.add(g);
}
