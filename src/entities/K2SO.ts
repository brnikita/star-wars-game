import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { InputManager } from '../core/InputManager';
import {
  K2SO_HEIGHT, K2SO_WALK_SPEED, K2SO_RUN_SPEED, K2SO_JUMP_FORCE,
  K2SO_MAX_HEALTH, K2SO_MAX_SHIELD, K2SO_SHIELD_REGEN_RATE,
  K2SO_SHIELD_REGEN_DELAY, BLASTER_AMMO_MAX,
  K2SO_CROUCH_SPEED_MULT, K2SO_CROUCH_HEIGHT_SCALE,
  K2SO_COVER_HEALTH_REGEN_RATE, K2SO_COVER_HEALTH_REGEN_DELAY,
  COLOR_K2SO_BODY, COLOR_K2SO_EYES,
} from '../utils/Constants';
import { clamp } from '../utils/MathUtils';

export class K2SO extends Entity {
  // Боевые параметры
  shield: number;
  maxShield: number;
  ammo: number;
  maxAmmo: number;
  isReloading = false;
  reloadTimer = 0;
  isCrouching = false;
  isStealth = false;
  isMoving = false;
  isFlying = false;
  currentSkin = 0; // 0 = стандарт, 1 = босс
  private skinCooldown = 0;
  private flyToggleCooldown = 0;
  private static FLY_SPEED = 20;
  private static FLY_VERTICAL_SPEED = 12;
  private eyeLeftRef!: THREE.Mesh;
  private eyeRightRef!: THREE.Mesh;
  private eyeLightRef!: THREE.PointLight;
  private headRef!: THREE.Mesh;
  private bearHead: THREE.Group | null = null;
  private skullHead: THREE.Group | null = null;
  private gingerHead: THREE.Group | null = null;
  private gingerButtons: THREE.Mesh[] = [];
  private rabbitHead: THREE.Group | null = null;
  private mantisHead: THREE.Group | null = null;
  private beaverTail: THREE.Group | null = null;
  private neckGroupRef: THREE.Group | null = null;
  private skinMeshes: THREE.Mesh[] = []; // все перекрашиваемые части

  // Исцеление
  healCharges = 3;
  maxHealCharges = 3;
  isHealing = false;
  private healCooldown = 0;
  private static HEAL_AMOUNT = 40;
  private static HEAL_COOLDOWN = 2;

  private shieldRegenTimer = 0;

  // Звуковая система
  private audioCtx: AudioContext | null = null;
  private stepTimer = 0;
  private stepInterval = 0.35;
  // Боевые фразы
  private quoteDiv: HTMLDivElement | null = null;
  private quoteTimeout = 0;
  private quoteCooldown = 0;
  private killCount = 0;
  private firstShotFired = false;
  bossDefeated = false; // разблокирует скин R-111
  shootDamageBonus = 0; // бонус урона от скина R-111
  speedBonus = 1.0;     // множитель скорости от скина R-111

  private jetFlameLeft: THREE.Group | null = null;
  private jetFlameRight: THREE.Group | null = null;
  private jetFlameTime = 0;
  private healthRegenTimer = 0;
  private crouchLerp = 0; // 0 = стоя, 1 = присед (для плавной анимации)

  // Управление
  cameraYaw = 0;
  aimPoint = new THREE.Vector3(0, 1, -100); // куда целится камера (устанавливается CameraSystem)
  private isGrounded = false;
  private moveDirection = new THREE.Vector3();
  private velocity = new CANNON.Vec3();

  // Анимация
  private limbPhase = 0;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private head!: THREE.Mesh;
  private eyeLeft!: THREE.Mesh;
  private eyeRight!: THREE.Mesh;

  constructor(scene: THREE.Scene, physics: PhysicsSystem) {
    super(scene, physics, K2SO_MAX_HEALTH);
    this.shield = K2SO_MAX_SHIELD;
    this.maxShield = K2SO_MAX_SHIELD;
    this.ammo = BLASTER_AMMO_MAX;
    this.maxAmmo = BLASTER_AMMO_MAX;

    this.buildModel();
    this.createPhysicsBody();
  }

  private buildModel(): void {
    // === МАТЕРИАЛЫ ===
    // Основной корпус — тёмный графитовый металл (как в фильме)
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1e, metalness: 0.92, roughness: 0.2,
      clearcoat: 0.35, clearcoatRoughness: 0.4,
      envMapIntensity: 1.5,
    });
    // Панели — чуть светлее, другая текстура
    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x222226, metalness: 0.86, roughness: 0.28,
      clearcoat: 0.2, clearcoatRoughness: 0.5,
    });
    // Суставы — почти чёрные, гибкие части
    const jointMat = new THREE.MeshPhysicalMaterial({
      color: 0x08080a, metalness: 0.94, roughness: 0.3,
      clearcoat: 0.25, clearcoatRoughness: 0.3,
    });
    // Внутренние механизмы — тёмный с масляным блеском
    const mechMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e0e12, metalness: 0.97, roughness: 0.12,
      clearcoat: 0.5, clearcoatRoughness: 0.15,
      envMapIntensity: 2.0,
    });
    // Заклёпки
    const rivetMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a30, metalness: 0.98, roughness: 0.08,
      clearcoat: 0.6, clearcoatRoughness: 0.1,
    });
    // Швы между панелями
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x050506, metalness: 0.5, roughness: 0.9,
    });
    // Дисплей (тусклый голубой)
    const displayMat = new THREE.MeshStandardMaterial({
      color: 0x0a1a2a, emissive: 0x0a2244, emissiveIntensity: 0.8,
    });
    // Индикаторы
    const indicatorOnMat = new THREE.MeshStandardMaterial({
      color: 0x22ff44, emissive: 0x22ff44, emissiveIntensity: 1.5,
    });
    const indicatorDimMat = new THREE.MeshStandardMaterial({
      color: 0x332200, emissive: 0x332200, emissiveIntensity: 0.3,
    });
    // Царапины глубокие
    const scratchDeepMat = new THREE.MeshStandardMaterial({
      color: 0x3a2510, metalness: 0.5, roughness: 0.6,
    });
    // Подпалина светлая (вокруг основной)
    const burnLightMat = new THREE.MeshStandardMaterial({
      color: 0x2a1505, metalness: 0.35, roughness: 0.8,
    });
    // Провода/трубки — резиновый вид
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x141418, metalness: 0.3, roughness: 0.7,
    });
    // Глаза
    const eyeMat = new THREE.MeshStandardMaterial({
      color: COLOR_K2SO_EYES, emissive: COLOR_K2SO_EYES, emissiveIntensity: 3.0,
    });
    // Слабое свечение вокруг глаз (отражение)
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: COLOR_K2SO_EYES, emissive: COLOR_K2SO_EYES, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.3,
    });
    // Царапины
    const scratchMat = new THREE.MeshStandardMaterial({
      color: 0x4a3520, metalness: 0.4, roughness: 0.7,
    });
    // Подпалины
    const burnMat = new THREE.MeshStandardMaterial({
      color: 0x1a0800, metalness: 0.3, roughness: 0.9,
    });
    // Имперская маркировка (почти стёртая)
    const markMat = new THREE.MeshStandardMaterial({
      color: 0x28282e, metalness: 0.75, roughness: 0.45,
    });
    // Потёртости (светлые области на краях)
    const wearMat = new THREE.MeshStandardMaterial({
      color: 0x333338, metalness: 0.9, roughness: 0.2,
    });

    // ================================================================
    // === ГОЛОВА — точная форма KX-серии ===
    // ================================================================
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 18), bodyMat
    );
    this.head.scale.set(0.88, 0.8, 1.18);
    this.head.position.y = 0.98;
    this.headRef = this.head;
    this.head.castShadow = true;

    // Верхняя крышка черепа (плоская, чуть выпуклая)
    const skullTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.03, 16), panelMat
    );
    skullTop.position.set(0, 0.1, -0.02);
    this.head.add(skullTop);

    // Височные пластины (боковые)
    for (const s of [-1, 1]) {
      const temple = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.1, 0.14), panelMat
      );
      temple.position.set(s * 0.14, 0.02, -0.02);
      this.head.add(temple);

      // Височный болт/датчик
      const templeBolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mechMat
      );
      templeBolt.rotation.z = Math.PI / 2;
      templeBolt.position.set(s * 0.155, 0.02, 0.02);
      this.head.add(templeBolt);
    }

    // Лицевая пластина — основная, с характерной формой
    const facePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.03), panelMat
    );
    facePlate.position.set(0, -0.01, 0.145);
    this.head.add(facePlate);

    // Козырёк над глазами (выступающий)
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.02, 0.07), bodyMat
    );
    visor.position.set(0, 0.048, 0.14);
    this.head.add(visor);

    // Скулы — угловатые, выступающие
    for (const s of [-1, 1]) {
      const cheekbone = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.08, 0.1), panelMat
      );
      cheekbone.position.set(s * 0.12, -0.005, 0.08);
      this.head.add(cheekbone);

      // Нижняя скула (сужающаяся)
      const cheekLow = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.04, 0.06), bodyMat
      );
      cheekLow.position.set(s * 0.11, -0.06, 0.09);
      this.head.add(cheekLow);
    }

    // Переносица (между глаз)
    const noseBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.03, 0.02), mechMat
    );
    noseBridge.position.set(0, 0.01, 0.165);
    this.head.add(noseBridge);

    // Нижняя челюсть / вокодер
    const jawMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.035, 0.05), panelMat
    );
    jawMain.position.set(0, -0.07, 0.12);
    this.head.add(jawMain);

    // Вокодерные щели (горизонтальные линии на рту)
    for (let i = 0; i < 4; i++) {
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.003, 0.005), jointMat
      );
      slit.position.set(0, -0.058 - i * 0.008, 0.146);
      this.head.add(slit);
    }

    // Затылочная панель (задняя часть — хранение данных)
    const backSkull = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.025), panelMat
    );
    backSkull.position.set(0, 0, -0.19);
    this.head.add(backSkull);

    // Затылочные разъёмы (порты данных)
    for (let i = 0; i < 3; i++) {
      const port = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), mechMat
      );
      port.rotation.x = Math.PI / 2;
      port.position.set(-0.03 + i * 0.03, 0, -0.2);
      this.head.add(port);
    }

    // Антенна (правая сторона головы)
    const antennaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.012, 0.02, 6), panelMat
    );
    antennaBase.position.set(0.14, 0.06, -0.04);
    this.head.add(antennaBase);

    const antennaRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), mechMat
    );
    antennaRod.position.set(0.14, 0.12, -0.04);
    this.head.add(antennaRod);

    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 6, 6), eyeMat
    );
    antennaTip.position.set(0.14, 0.165, -0.04);
    this.head.add(antennaTip);

    // === ГЛАЗА — прямоугольные сенсоры с ореолом ===
    for (const s of [-1, 1]) {
      // Тёмная впадина глазницы
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.04, 0.015), jointMat
      );
      socket.position.set(s * 0.055, 0.012, 0.155);
      this.head.add(socket);

      // Внутренняя рамка
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, 0.028, 0.005), mechMat
      );
      frame.position.set(s * 0.055, 0.012, 0.163);
      this.head.add(frame);
    }

    // Сами глаза — яркие горизонтальные сенсоры
    this.eyeLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.018, 0.008), eyeMat
    );
    this.eyeLeft.position.set(-0.055, 0.012, 0.17);
    this.head.add(this.eyeLeft);
    this.eyeLeftRef = this.eyeLeft;

    this.eyeRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.018, 0.008), eyeMat
    );
    this.eyeRight.position.set(0.055, 0.012, 0.17);
    this.head.add(this.eyeRight);
    this.eyeRightRef = this.eyeRight;

    // Детализация глаз — внутренняя радужка / сканирующая линия
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x4499ff, emissive: 0x2266cc, emissiveIntensity: 4.0,
    });
    for (const s of [-1, 1]) {
      // Точка фокуса (зрачок)
      const iris = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.012, 0.003), irisMat
      );
      iris.position.set(s * 0.055, 0.012, 0.175);
      this.head.add(iris);

      // Ореол свечения
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, 0.03), eyeGlowMat
      );
      glow.position.set(s * 0.055, 0.012, 0.172);
      this.head.add(glow);

      // Микро-линзы внутри глаза (тонкие горизонтальные линии)
      for (let i = -1; i <= 1; i += 2) {
        const lens = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.001, 0.002), mechMat
        );
        lens.position.set(s * 0.055, 0.012 + i * 0.005, 0.168);
        this.head.add(lens);
      }
    }

    // Свет от глаз (чуть ярче)
    const eyeLight = new THREE.PointLight(0x2288ff, 1.0, 3.0);
    this.eyeLightRef = eyeLight;
    eyeLight.position.set(0, 0.01, 0.22);
    this.head.add(eyeLight);

    // Второй слабый свет (заполняющий, мягкий)
    const eyeFill = new THREE.PointLight(0x112244, 0.3, 1.5);
    eyeFill.position.set(0, -0.02, 0.15);
    this.head.add(eyeFill);

    // Подпалина от бластера на голове
    const blastHead = new THREE.Mesh(
      new THREE.CircleGeometry(0.022, 8), burnMat
    );
    blastHead.position.set(0.1, 0.04, 0.15);
    blastHead.rotation.y = 0.3;
    this.head.add(blastHead);

    // ================================================================
    // === ШЕЯ — длинная, сегментированная, с гидравликой ===
    // ================================================================
    const neckGroup = new THREE.Group();
    neckGroup.position.y = 0.86;
    this.neckGroupRef = neckGroup;

    // Центральный стержень
    const neckCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.14, 12), mechMat
    );
    neckGroup.add(neckCore);

    // Сегментные кольца
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.042, 0.007, 6, 14), bodyMat
      );
      ring.position.y = -0.055 + i * 0.037;
      ring.rotation.x = Math.PI / 2;
      neckGroup.add(ring);
    }

    // 4 гидравлические трубки вокруг шеи
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.13, 6), wireMat
      );
      tube.position.set(Math.cos(a) * 0.038, 0, Math.sin(a) * 0.038);
      neckGroup.add(tube);
    }

    // ================================================================
    // === ТОРС — верхняя часть ===
    // ================================================================

    // Плечевой каркас (широкий, угловатый)
    const shoulderFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.1, 0.2), bodyMat
    );
    shoulderFrame.position.y = 0.74;
    shoulderFrame.castShadow = true;

    // Плечевые выступы
    for (const s of [-1, 1]) {
      const shoulderCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.12), panelMat
      );
      shoulderCap.position.set(s * 0.28, 0.74, 0);
    }

    // Основная грудная секция
    const chestMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.24, 0.24), bodyMat
    );
    chestMain.position.y = 0.58;
    chestMain.castShadow = true;

    // Нагрудная панель с деталями
    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.22, 0.012), panelMat
    );
    chestPlate.position.set(0, 0.58, 0.127);

    // Вертикальные разделительные линии на груди
    for (const x of [-0.06, 0, 0.06]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, 0.18, 0.004), jointMat
      );
      line.position.set(x, 0.58, 0.136);
    }

    // Горизонтальные сегменты на груди
    for (let i = 0; i < 3; i++) {
      const hLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.003, 0.004), jointMat
      );
      hLine.position.set(0, 0.5 + i * 0.08, 0.136);
    }

    // Имперская маркировка (остаток символа на левой стороне груди)
    const impMark1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.003, 0.004), markMat
    );
    impMark1.position.set(-0.13, 0.64, 0.135);
    impMark1.rotation.z = 0.7;

    const impMark2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.003, 0.004), markMat
    );
    impMark2.position.set(-0.12, 0.62, 0.135);
    impMark2.rotation.z = -0.5;

    // Боковые панели торса
    for (const s of [-1, 1]) {
      const sideOuter = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.2, 0.18), panelMat
      );
      sideOuter.position.set(s * 0.236, 0.58, 0);

      // Вентиляционные решётки
      for (let i = 0; i < 4; i++) {
        const vent = new THREE.Mesh(
          new THREE.BoxGeometry(0.008, 0.005, 0.06), jointMat
        );
        vent.position.set(s * 0.24, 0.52 + i * 0.03, 0);
      }

      // Боковой индикатор (маленький)
      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.015, 0.008), eyeMat
      );
      indicator.position.set(s * 0.24, 0.66, 0.04);
    }

    // Спинная панель
    const backPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.22, 0.012), panelMat
    );
    backPlate.position.set(0, 0.58, -0.127);

    // Спинной модуль питания (выступающий блок)
    const powerPack = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.04), panelMat
    );
    powerPack.position.set(0, 0.56, -0.15);

    // Провода на спине
    for (const s of [-1, 1]) {
      const spineWire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), wireMat
      );
      spineWire.position.set(s * 0.05, 0.5, -0.145);
    }

    // ================================================================
    // === ТОРС — нижняя часть (живот) ===
    // ================================================================
    const abdomen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.14, 0.18), bodyMat
    );
    abdomen.position.y = 0.39;
    abdomen.castShadow = true;

    // Абдоминальные пластины (горизонтальная сегментация)
    for (let i = 0; i < 3; i++) {
      const abSeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.003, 0.19), jointMat
      );
      abSeg.position.set(0, 0.345 + i * 0.04, 0);
    }

    // Центральная абдоминальная панель
    const abPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.008), panelMat
    );
    abPanel.position.set(0, 0.39, 0.094);

    // Поясная секция (переход к тазу)
    const waist = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.14), panelMat
    );
    waist.position.y = 0.28;

    // Поясная пряжка/коннектор
    const beltBuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.01), mechMat
    );
    beltBuckle.position.set(0, 0.28, 0.076);

    // Тазовый блок
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.14), bodyMat
    );
    pelvis.position.y = 0.22;

    // Тазовые коннекторы для ног
    for (const s of [-1, 1]) {
      const hipMount = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), mechMat
      );
      hipMount.rotation.z = Math.PI / 2;
      hipMount.position.set(s * 0.12, 0.2, 0);
    }

    // === ПОВРЕЖДЕНИЯ ===
    const scratchChest1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.01, 0.003), scratchMat
    );
    scratchChest1.position.set(0.04, 0.66, 0.137);
    scratchChest1.rotation.z = 0.45;

    const scratchChest2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.007, 0.003), scratchMat
    );
    scratchChest2.position.set(-0.08, 0.53, 0.137);
    scratchChest2.rotation.z = -0.3;

    const scratchChest3 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.006, 0.003), scratchMat
    );
    scratchChest3.position.set(0.12, 0.56, 0.137);
    scratchChest3.rotation.z = 0.6;

    // Потёртости на краях плеч
    for (const s of [-1, 1]) {
      const edgeWear = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.005, 0.04), wearMat
      );
      edgeWear.position.set(s * 0.27, 0.78, 0.08);
    }

    const blastAbdomen = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 8), burnMat
    );
    blastAbdomen.position.set(0.08, 0.4, 0.095);

    const blastSide = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 8), burnMat
    );
    blastSide.position.set(-0.24, 0.6, 0.06);
    blastSide.rotation.y = -Math.PI / 2;

    // ================================================================
    // === МИКРО-ДЕТАЛИ: заклёпки, швы, дисплей, серво, кабели ===
    // ================================================================
    const rivetGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.004, 6);
    const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.005, 8);
    const microGroup = new THREE.Group();

    // --- Заклёпки на грудной панели (по углам) ---
    for (const x of [-0.08, 0.08]) {
      for (const y of [0.48, 0.68]) {
        const r = new THREE.Mesh(rivetGeo, rivetMat);
        r.position.set(x, y, 0.14);
        r.rotation.x = Math.PI / 2;
        microGroup.add(r);
      }
    }

    // --- Заклёпки на плечевом каркасе ---
    for (const s of [-1, 1]) {
      for (const z of [-0.06, 0.06]) {
        const r = new THREE.Mesh(rivetGeo, rivetMat);
        r.position.set(s * 0.26, 0.78, z);
        r.rotation.x = Math.PI / 2;
        microGroup.add(r);
      }
    }

    // --- Болты на спинном модуле питания ---
    for (const x of [-0.04, 0.04]) {
      for (const y of [0.52, 0.6]) {
        const b = new THREE.Mesh(boltGeo, rivetMat);
        b.position.set(x, y, -0.172);
        b.rotation.x = Math.PI / 2;
        microGroup.add(b);
      }
    }

    // --- Швы между панелями (тонкие тёмные линии) ---
    // Шов грудь-плечи (горизонтальный)
    const seamChestTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.002, 0.25), seamMat
    );
    seamChestTop.position.set(0, 0.69, 0);
    microGroup.add(seamChestTop);

    // Шов грудь-живот
    const seamChestAb = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.002, 0.19), seamMat
    );
    seamChestAb.position.set(0, 0.46, 0);
    microGroup.add(seamChestAb);

    // Вертикальные швы на боках груди
    for (const s of [-1, 1]) {
      const seamSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.002, 0.22, 0.18), seamMat
      );
      seamSide.position.set(s * 0.22, 0.58, 0);
      microGroup.add(seamSide);
    }

    // --- Нагрудный дисплей (мини-экран) ---
    const display = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.035, 0.004), displayMat
    );
    display.position.set(-0.05, 0.56, 0.137);
    microGroup.add(display);

    // Рамка дисплея
    const displayFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.056, 0.041, 0.002), jointMat
    );
    displayFrame.position.set(-0.05, 0.56, 0.135);
    microGroup.add(displayFrame);

    // Строки на дисплее (имитация текста)
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.003, 0.001), displayMat
      );
      line.position.set(-0.05, 0.55 + i * 0.01, 0.14);
      microGroup.add(line);
    }

    // --- Ряд индикаторов на груди (справа от дисплея) ---
    for (let i = 0; i < 4; i++) {
      const mat = i < 2 ? indicatorOnMat : indicatorDimMat;
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.006, 0.003), mat
      );
      led.position.set(0.04, 0.555 + i * 0.012, 0.137);
      microGroup.add(led);
    }

    // --- Серво-моторы в плечах (видимые диски) ---
    for (const s of [-1, 1]) {
      const servoHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12), mechMat
      );
      servoHousing.rotation.z = Math.PI / 2;
      servoHousing.position.set(s * 0.3, 0.72, 0);
      microGroup.add(servoHousing);

      // Ось серво
      const servoAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), rivetMat
      );
      servoAxle.rotation.z = Math.PI / 2;
      servoAxle.position.set(s * 0.31, 0.72, 0);
      microGroup.add(servoAxle);
    }

    // --- Кабельный жгут на спине (от powerPack вниз) ---
    const cableBundle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.01, 0.22, 8), wireMat
    );
    cableBundle.position.set(0, 0.44, -0.14);
    microGroup.add(cableBundle);

    // Отдельные тонкие провода в жгуте
    for (const x of [-0.008, 0, 0.008]) {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.24, 6), wireMat
      );
      wire.position.set(x, 0.43, -0.15);
      microGroup.add(wire);
    }

    // --- Заклёпки на поясе ---
    for (const x of [-0.08, -0.04, 0.04, 0.08]) {
      const r = new THREE.Mesh(rivetGeo, rivetMat);
      r.position.set(x, 0.28, 0.075);
      r.rotation.x = Math.PI / 2;
      microGroup.add(r);
    }

    // --- Дополнительные царапины и потёртости ---
    // Глубокая царапина на спине
    const scratchBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.01, 0.003), scratchDeepMat
    );
    scratchBack.position.set(0.04, 0.62, -0.13);
    scratchBack.rotation.z = 0.6;
    microGroup.add(scratchBack);

    // Ореол вокруг подпалины на животе
    const burnHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 10), burnLightMat
    );
    burnHalo.position.set(0.08, 0.4, 0.094);
    microGroup.add(burnHalo);

    // Потёртости на краях грудной пластины
    for (const y of [0.47, 0.69]) {
      const edgeWear = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.003, 0.003), wearMat
      );
      edgeWear.position.set(0, y, 0.135);
      microGroup.add(edgeWear);
    }

    // --- Заклёпки на тазовых коннекторах ---
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(boltGeo, rivetMat);
      r.rotation.z = Math.PI / 2;
      r.position.set(s * 0.125, 0.2, 0);
      microGroup.add(r);
    }

    // --- Масляные пятна / подтёки (тёмные полупрозрачные пятна) ---
    const oilMat = new THREE.MeshStandardMaterial({
      color: 0x060608, metalness: 0.6, roughness: 0.1,
      transparent: true, opacity: 0.4,
    });
    // Подтёк масла из шеи на грудь
    const oilDrip1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.1, 0.003), oilMat
    );
    oilDrip1.position.set(0.06, 0.72, 0.127);
    microGroup.add(oilDrip1);

    // Масляное пятно у правого плечевого серво
    const oilSpot1 = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 8), oilMat
    );
    oilSpot1.position.set(0.28, 0.7, 0.1);
    oilSpot1.rotation.y = 0.2;
    microGroup.add(oilSpot1);

    // Подтёк у поясного сустава
    const oilDrip2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.06, 0.003), oilMat
    );
    oilDrip2.position.set(-0.08, 0.25, 0.075);
    microGroup.add(oilDrip2);

    // --- Внутреннее свечение через щели суставов ---
    const innerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x1144aa, emissive: 0x0a2255, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.5,
    });

    // Свечение в шве грудь-живот (просвечивает внутренняя электроника)
    const gapGlow1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.005, 0.005), innerGlowMat
    );
    gapGlow1.position.set(0, 0.461, 0.06);
    microGroup.add(gapGlow1);

    // Свечение в поясном соединении
    const gapGlow2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.004, 0.004), innerGlowMat
    );
    gapGlow2.position.set(0, 0.23, 0.06);
    microGroup.add(gapGlow2);

    // --- Пыль / грязь (тёплые пятна на ногах и нижней части) ---
    const dustMat = new THREE.MeshStandardMaterial({
      color: 0x3a332a, metalness: 0.1, roughness: 0.95,
      transparent: true, opacity: 0.25,
    });
    // Пыль на поясе
    const dustWaist = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.15), dustMat
    );
    dustWaist.position.set(0, 0.25, 0);
    microGroup.add(dustWaist);

    // Грязь на нижней части живота
    const dustAbLow = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.005), dustMat
    );
    dustAbLow.position.set(0, 0.34, 0.093);
    microGroup.add(dustAbLow);

    // --- Серийный номер (выгравированный текст — имитация тонкими линиями) ---
    // На правом боку живота: "KX-S/II 02" — ряд горизонтальных штрихов
    const serialMat = new THREE.MeshStandardMaterial({
      color: 0x303035, metalness: 0.8, roughness: 0.4,
    });
    for (let i = 0; i < 5; i++) {
      const ch = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, 0.008 + Math.random() * 0.004, 0.005), serialMat
      );
      ch.position.set(0.162, 0.39, -0.04 + i * 0.012);
      ch.rotation.y = Math.PI / 2;
      microGroup.add(ch);
    }

    // --- Дополнительные заклёпки на абдоминальной панели ---
    for (const x of [-0.04, 0.04]) {
      for (const y of [0.36, 0.42]) {
        const r = new THREE.Mesh(rivetGeo, rivetMat);
        r.position.set(x, y, 0.097);
        r.rotation.x = Math.PI / 2;
        microGroup.add(r);
      }
    }

    // --- Заклёпки по углам спинной пластины ---
    for (const x of [-0.14, 0.14]) {
      for (const y of [0.5, 0.66]) {
        const r = new THREE.Mesh(rivetGeo, rivetMat);
        r.position.set(x, y, -0.135);
        r.rotation.x = Math.PI / 2;
        microGroup.add(r);
      }
    }

    // --- Маленькие вентиляционные отверстия на спинном модуле ---
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(
        new THREE.CircleGeometry(0.005, 6), jointMat
      );
      vent.position.set(-0.02 + i * 0.02, 0.59, -0.172);
      vent.rotation.y = Math.PI;
      microGroup.add(vent);
    }

    // --- Потёртости на часто задеваемых местах ---
    // Внутренние стороны рук (потёртость от трения)
    for (const s of [-1, 1]) {
      const armWear = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, 0.08, 0.02), wearMat
      );
      armWear.position.set(s * 0.22, 0.58, 0.1);
      microGroup.add(armWear);
    }

    // Потёртость на тазу (от постоянного движения ног)
    const pelvisWear = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.003, 0.06), wearMat
    );
    pelvisWear.position.set(0, 0.19, 0);
    microGroup.add(pelvisWear);

    // ================================================================
    // === РУКИ ===
    // ================================================================
    this.leftArm = this.createArm(bodyMat, panelMat, jointMat, mechMat, wireMat, scratchMat, wearMat, 1);
    this.leftArm.position.set(-0.33, 0.72, 0);

    this.rightArm = this.createArm(bodyMat, panelMat, jointMat, mechMat, wireMat, scratchMat, wearMat, -1);
    this.rightArm.position.set(0.33, 0.72, 0);

    // ================================================================
    // === НОГИ ===
    // ================================================================
    this.leftLeg = this.createLeg(bodyMat, panelMat, jointMat, mechMat, wireMat, scratchMat, burnMat, wearMat, 1);
    this.leftLeg.position.set(-0.1, 0.17, 0);

    this.rightLeg = this.createLeg(bodyMat, panelMat, jointMat, mechMat, wireMat, scratchMat, burnMat, wearMat, -1);
    this.rightLeg.position.set(0.1, 0.17, 0);

    // ================================================================
    // === СБОРКА ===
    // ================================================================
    const modelRoot = new THREE.Group();
    modelRoot.add(
      this.head, neckGroup,
      shoulderFrame, chestMain, chestPlate, backPlate, powerPack,
      abdomen, abPanel, waist, beltBuckle, pelvis,
      this.leftArm, this.rightArm,
      this.leftLeg, this.rightLeg,
      scratchChest1, scratchChest2, scratchChest3,
      blastAbdomen, blastSide,
      impMark1, impMark2,
      microGroup,
    );
    modelRoot.position.y = -0.34;
    this.mesh.add(modelRoot);

    // Собрать перекрашиваемые меши (для скина)
    modelRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== this.eyeLeftRef && obj !== this.eyeRightRef) {
        this.skinMeshes.push(obj);
      }
    });

    // Создать реалистичную голову полярного медведя (скрыта по умолчанию)
    this.bearHead = new THREE.Group();
    this.bearHead.visible = false;

    // Материалы
    const furWhite = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9, metalness: 0.0 }); // тёмно-коричневый
    const furCream = new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.88, metalness: 0.0 }); // темнее
    const furShadow = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.85, metalness: 0.0 }); // самый тёмный
    const skinFace = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.0 }); // чёрная кожа лица
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.35, metalness: 0.05 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.5 });
    const gumsM = new THREE.MeshStandardMaterial({ color: 0x553333, roughness: 0.6 });
    const bearEyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0x222222, emissiveIntensity: 0.3 });
    const bearIrisMat = new THREE.MeshStandardMaterial({
      color: 0x0a1a66, emissive: 0x0a1a66, emissiveIntensity: 1.0,
    });
    const bearPupilMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 });

    // === Череп гориллы (массивный, с сагиттальным гребнем) ===
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), furWhite);
    skull.scale.set(1.05, 0.95, 1.0);
    this.bearHead.add(skull);

    // Сагиттальный гребень (костяной гребень сверху черепа — самцы горилл)
    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), furShadow);
    crest.position.set(0, 0.16, -0.03);
    crest.scale.set(0.6, 0.5, 1.2);
    this.bearHead.add(crest);

    // Затылок
    const bearBackSkull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), furWhite);
    bearBackSkull.position.set(0, 0, -0.08);
    bearBackSkull.scale.set(0.95, 0.85, 0.9);
    this.bearHead.add(bearBackSkull);

    // === Лицо гориллы (плоское, чёрная кожа) ===
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinFace);
    face.position.set(0, -0.02, 0.1);
    face.scale.set(0.85, 0.8, 0.5);
    this.bearHead.add(face);

    // Надбровные дуги (массивные, выступающие)
    const browRidge = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6), furShadow);
    browRidge.position.set(0, 0.06, 0.1);
    browRidge.scale.set(1.2, 0.35, 0.6);
    this.bearHead.add(browRidge);

    // === Морда гориллы (короткая, широкая, выступающая) ===
    const snoutBase = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinFace);
    snoutBase.position.set(0, -0.06, 0.16);
    snoutBase.scale.set(0.9, 0.55, 0.7);
    this.bearHead.add(snoutBase);

    // Нижняя челюсть (массивная)
    const jawBone = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinFace);
    jawBone.position.set(0, -0.1, 0.1);
    jawBone.scale.set(0.85, 0.4, 0.7);
    this.bearHead.add(jawBone);

    // === Нос гориллы (широкий, плоский, с большими ноздрями) ===
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), noseMat);
    nose.position.set(0, -0.04, 0.2);
    nose.scale.set(1.3, 0.7, 0.5);
    this.bearHead.add(nose);

    // Ноздри (большие, широко расставленные)
    for (const s of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), noseMat);
      nostril.position.set(s * 0.025, -0.05, 0.21);
      this.bearHead.add(nostril);
    }

    // === Рот ===
    const mouthLine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.006), lipMat);
    mouthLine.position.set(0, -0.08, 0.19);
    this.bearHead.add(mouthLine);

    // Нижняя губа
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), lipMat);
    lowerLip.position.set(0, -0.09, 0.18);
    lowerLip.scale.set(1.6, 0.3, 0.5);
    this.bearHead.add(lowerLip);

    // Рот внутри
    const mouthInner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.03), gumsM);
    mouthInner.position.set(0, -0.082, 0.17);
    this.bearHead.add(mouthInner);

    // Кроличьи зубы (2 больших белых резца)
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
    for (const s of [-1, 1]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.04, 0.012), toothMat);
      tooth.position.set(s * 0.012, -0.1, 0.19);
      this.bearHead.add(tooth);
    }

    // === Уши гориллы (маленькие, по бокам, чёрные) ===
    for (const s of [-1, 1]) {
      const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinFace);
      earOuter.position.set(s * 0.2, 0.02, -0.02);
      earOuter.scale.set(0.4, 0.7, 0.5);
      this.bearHead.add(earOuter);

      const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.6 })
      );
      earInner.position.set(s * 0.2, 0.02, 0.005);
      earInner.scale.set(0.3, 0.5, 0.3);
      this.bearHead.add(earInner);
    }

    // === Глаза (крупные, выступающие — хорошо видны) ===
    for (const s of [-1, 1]) {
      // Белок глаза (большой, выступает вперёд)
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), bearEyeWhite);
      eyeWhite.position.set(s * 0.07, 0.01, 0.19);
      this.bearHead.add(eyeWhite);

      // Радужка (тёмно-синяя, крупная)
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), bearIrisMat);
      iris.position.set(s * 0.07, 0.01, 0.215);
      this.bearHead.add(iris);

      // Зрачок (чёрный)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), bearPupilMat);
      pupil.position.set(s * 0.07, 0.01, 0.23);
      this.bearHead.add(pupil);

      // Блик (белая точка)
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlight.position.set(s * 0.07 + 0.006, 0.016, 0.235);
      this.bearHead.add(highlight);

      // Надбровная дуга
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), furWhite);
      brow.position.set(s * 0.07, 0.04, 0.16);
      brow.scale.set(1.3, 0.5, 0.8);
      this.bearHead.add(brow);
    }

    // Свет от глаз (синий)
    const bearEyeLight = new THREE.PointLight(0x0a1a66, 0.3, 1.5);
    bearEyeLight.position.set(0, 0.02, 0.2);
    this.bearHead.add(bearEyeLight);

    // === Щёки гориллы (шерсть по бокам) ===
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), furCream);
      cheek.position.set(s * 0.14, -0.03, 0.02);
      cheek.scale.set(0.6, 0.7, 0.8);
      this.bearHead.add(cheek);
    }

    // === Борода / подбородок ===
    const chinFur = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), furShadow);
    chinFur.position.set(0, -0.14, 0.08);
    chinFur.scale.set(1.0, 0.5, 0.7);
    this.bearHead.add(chinFur);

    // === Шерсть на макушке ===
    const topFur = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), furWhite);
    topFur.position.set(0, 0.12, 0);
    topFur.scale.set(1.0, 0.4, 0.9);
    this.bearHead.add(topFur);

    // === Морщины на лице (линии на надбровных дугах) ===
    for (let w = 0; w < 3; w++) {
      const wrinkle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.003, 0.003),
        new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 })
      );
      wrinkle.position.set(0, 0.04 - w * 0.015, 0.17);
      this.bearHead.add(wrinkle);
    }

    // === ШЕЯ ГОРИЛЛЫ (толстая, мускулистая) ===
    const neckFur = new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.88, metalness: 0.0 });

    // Основа шеи (от плеч робота до головы)
    const bearNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 10), neckFur);
    bearNeck.position.set(0, -0.16, 0);
    this.bearHead.add(bearNeck);

    // Загривок (горб сзади — характерно для полярного медведя)
    const nape = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), neckFur);
    nape.position.set(0, -0.1, -0.08);
    nape.scale.set(1.0, 0.8, 1.0);
    this.bearHead.add(nape);

    // Шерсть спереди шеи
    const neckFront = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), furCream);
    neckFront.position.set(0, -0.14, 0.06);
    neckFront.scale.set(0.8, 0.6, 0.5);
    this.bearHead.add(neckFront);

    // Боковые мышцы
    for (const s of [-1, 1]) {
      const neckMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), neckFur);
      neckMuscle.position.set(s * 0.08, -0.12, 0);
      neckMuscle.scale.set(0.5, 0.6, 0.7);
      this.bearHead.add(neckMuscle);
    }

    // Голова медведя на позиции головы робота (y=0.98)
    // Шея начинается на y=0.86 (шея робота)
    // Центр bearHead = позиция головы, шея свисает вниз до плеч
    this.bearHead.position.y = 0.98;
    this.bearHead.scale.set(1.2, 1.2, 1.2);
    modelRoot.add(this.bearHead);

    // === ЧЕРЕП (для скина скелет, скрыт по умолчанию) ===
    this.skullHead = new THREE.Group();
    this.skullHead.visible = false;

    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6, metalness: 0.1 });
    const boneDark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    const greenGlow = new THREE.MeshStandardMaterial({
      color: 0x22ff44, emissive: 0x22ff44, emissiveIntensity: 4.0,
    });

    // Верхняя часть черепа (купол)
    const skullDome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), boneMat);
    skullDome.scale.set(0.95, 0.9, 1.0);
    skullDome.position.set(0, 0.04, -0.02);
    this.skullHead.add(skullDome);

    // Височные кости
    for (const s of [-1, 1]) {
      const temporal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), boneMat);
      temporal.position.set(s * 0.12, -0.02, -0.02);
      temporal.scale.set(0.5, 0.7, 0.8);
      this.skullHead.add(temporal);
    }

    // Лицевая часть (плоская)
    const skullFace = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.06), boneMat);
    skullFace.position.set(0, -0.04, 0.14);
    this.skullHead.add(skullFace);

    // Глазницы (тёмные впадины)
    for (const s of [-1, 1]) {
      // Впадина
      const eyeHole = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), boneDark);
      eyeHole.position.set(s * 0.06, -0.01, 0.15);
      this.skullHead.add(eyeHole);

      // Зелёное свечение внутри глазницы
      const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), greenGlow);
      eyeGlow.position.set(s * 0.06, -0.01, 0.16);
      this.skullHead.add(eyeGlow);
    }

    // Свет из глазниц
    const skullLight = new THREE.PointLight(0x22ff44, 1.5, 3.0);
    skullLight.position.set(0, -0.01, 0.2);
    this.skullHead.add(skullLight);

    // Носовая впадина (треугольная дырка)
    const noseHole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), boneDark);
    noseHole.position.set(0, -0.06, 0.16);
    this.skullHead.add(noseHole);
    // Перегородка носа
    const noseSeptum = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.02), boneMat);
    noseSeptum.position.set(0, -0.06, 0.17);
    this.skullHead.add(noseSeptum);

    // Скулы
    for (const s of [-1, 1]) {
      const cheekBone = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.08), boneMat);
      cheekBone.position.set(s * 0.1, -0.04, 0.1);
      this.skullHead.add(cheekBone);
    }

    // Верхняя челюсть с зубами
    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.06), boneMat);
    upperJaw.position.set(0, -0.1, 0.14);
    this.skullHead.add(upperJaw);

    // Нижняя челюсть (отдельная, чуть ниже)
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.06), boneMat);
    lowerJaw.position.set(0, -0.14, 0.13);
    this.skullHead.add(lowerJaw);

    // Зубы (верхний ряд)
    for (let t = 0; t < 6; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.012),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      tooth.position.set(-0.05 + t * 0.02, -0.12, 0.17);
      this.skullHead.add(tooth);
    }
    // Зубы (нижний ряд)
    for (let t = 0; t < 6; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      tooth.position.set(-0.045 + t * 0.019, -0.13, 0.16);
      this.skullHead.add(tooth);
    }

    // Трещина на черепе
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.1, 0.003),
      new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.8 })
    );
    crack.position.set(0.05, 0.03, 0.15);
    crack.rotation.z = 0.3;
    this.skullHead.add(crack);

    // Шейные позвонки
    for (let v = 0; v < 3; v++) {
      const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 8), boneMat);
      vertebra.position.set(0, -0.18 - v * 0.05, -0.02);
      this.skullHead.add(vertebra);
    }

    this.skullHead.position.y = 0.98;
    this.skullHead.scale.set(1.1, 1.1, 1.1);
    modelRoot.add(this.skullHead);

    // === ГОЛОВА ПРЯНИЧНОГО ЧЕЛОВЕЧКА (скрыта по умолчанию) ===
    this.gingerHead = new THREE.Group();
    this.gingerHead.visible = false;

    const gingerMat = new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.85, metalness: 0.0 });
    const icingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0x8822cc, roughness: 0.4, metalness: 0.1 });

    // Голова (круглая, пряничная)
    const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), gingerMat);
    gHead.scale.set(1.0, 0.9, 0.85);
    this.gingerHead.add(gHead);

    // Глаза (белые, большие, круглые)
    for (const s of [-1, 1]) {
      // Белый кружок
      const gEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0x222222, emissiveIntensity: 0.3 })
      );
      gEye.position.set(s * 0.07, 0.02, 0.16);
      this.gingerHead.add(gEye);
      // Зрачок (чёрный)
      const gPupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 })
      );
      gPupil.position.set(s * 0.07, 0.02, 0.195);
      this.gingerHead.add(gPupil);
      // Блик
      const gHighlight = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      gHighlight.position.set(s * 0.07 + 0.01, 0.03, 0.2);
      this.gingerHead.add(gHighlight);
    }

    // Рот (улыбка из глазури — дуга)
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 12, Math.PI), icingMat);
    smile.position.set(0, -0.05, 0.16);
    smile.rotation.x = Math.PI;
    this.gingerHead.add(smile);

    // Нос (маленькая фиолетовая пуговка)
    const gNose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), purpleMat);
    gNose.position.set(0, -0.01, 0.18);
    this.gingerHead.add(gNose);

    // Щёчки (розовые круги)
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xff8888, roughness: 0.7 })
      );
      cheek.position.set(s * 0.1, -0.03, 0.14);
      cheek.scale.set(1, 0.6, 0.5);
      this.gingerHead.add(cheek);
    }

    // Глазурь — брови (завитушки)
    for (const s of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 4, 8, Math.PI), icingMat);
      brow.position.set(s * 0.07, 0.065, 0.16);
      this.gingerHead.add(brow);
    }

    // Пуговицы на груди (создаём тут, но прицепим к modelRoot)
    this.gingerButtons = [];
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 8), purpleMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.65 - i * 0.12, 0.13);
      btn.visible = false;
      modelRoot.add(btn);
      this.gingerButtons.push(btn);
    }

    this.gingerHead.position.y = 0.98;
    this.gingerHead.scale.set(1.15, 1.15, 1.15);
    modelRoot.add(this.gingerHead);

    // === Бобровый хвост (скрыт по умолчанию) ===
    this.beaverTail = new THREE.Group();
    this.beaverTail.visible = false;
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.05 });
    const tailScaleMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.1 });

    // Основание хвоста (переход от тела)
    const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), tailMat);
    tailBase.rotation.x = Math.PI / 2 + 0.5;
    tailBase.position.set(0, 0, 0);
    this.beaverTail.add(tailBase);

    // Средняя часть (плоская, широкая — бобровая форма)
    const tailMid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.3), tailScaleMat);
    tailMid.position.set(0, -0.06, -0.25);
    tailMid.rotation.x = 0.3;
    this.beaverTail.add(tailMid);

    // Кончик хвоста (ещё шире, округлый)
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.2), tailScaleMat);
    tailTip.position.set(0, -0.1, -0.42);
    tailTip.rotation.x = 0.4;
    this.beaverTail.add(tailTip);

    // Чешуйки на хвосте (горизонтальные линии)
    for (let i = 0; i < 5; i++) {
      const scale = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.04), tailMat);
      scale.position.set(0, -0.055 - i * 0.01, -0.15 - i * 0.06);
      scale.rotation.x = 0.3;
      this.beaverTail.add(scale);
    }

    // Позиция — за спиной, на уровне пояса
    this.beaverTail.position.set(0, 0.22, -0.15);
    modelRoot.add(this.beaverTail);

    // === Голова зайца (голубой, скрыта по умолчанию) ===
    this.rabbitHead = new THREE.Group();
    this.rabbitHead.visible = false;

    const rabbitFurMat = new THREE.MeshStandardMaterial({ color: 0x66bbee, roughness: 0.8, metalness: 0.0 });
    const rabbitInnerMat = new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.7 });
    const rabbitNoseMat = new THREE.MeshStandardMaterial({ color: 0xff6688, roughness: 0.5 });
    const rabbitWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    // Голова (слегка вытянутая)
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), rabbitFurMat);
    rHead.scale.set(0.9, 1.0, 0.85);
    this.rabbitHead.add(rHead);

    // Щёки (пухлые)
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), rabbitFurMat);
      cheek.position.set(s * 0.1, -0.06, 0.08);
      cheek.scale.set(0.8, 0.6, 0.6);
      this.rabbitHead.add(cheek);
    }

    // Уши (длинные, торчат вверх)
    for (const s of [-1, 1]) {
      // Внешняя часть уха
      const earOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 8), rabbitFurMat);
      earOuter.position.set(s * 0.07, 0.3, -0.02);
      earOuter.rotation.z = s * 0.15;
      this.rabbitHead.add(earOuter);
      // Внутренняя часть (розовая)
      const earInner = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.25, 6), rabbitInnerMat);
      earInner.position.set(s * 0.07, 0.3, 0.0);
      earInner.rotation.z = s * 0.15;
      this.rabbitHead.add(earInner);
      // Кончик уха (закруглённый)
      const earTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), rabbitFurMat);
      earTip.position.set(s * (0.07 + 0.15 * Math.sin(0.15)), 0.45, -0.02);
      this.rabbitHead.add(earTip);
    }

    // Глаза (большие, круглые)
    for (const s of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), rabbitWhiteMat);
      eyeWhite.position.set(s * 0.07, 0.03, 0.14);
      this.rabbitHead.add(eyeWhite);
      // Зрачок (тёмный, большой)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a0505, roughness: 0.3 })
      );
      pupil.position.set(s * 0.07, 0.03, 0.175);
      this.rabbitHead.add(pupil);
      // Блик
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.007, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlight.position.set(s * 0.07 + 0.01, 0.04, 0.19);
      this.rabbitHead.add(highlight);
    }

    // Нос (розовый треугольник — маленькая сфера)
    const rNose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), rabbitNoseMat);
    rNose.position.set(0, -0.02, 0.17);
    rNose.scale.set(1.2, 0.8, 0.7);
    this.rabbitHead.add(rNose);

    // Рот (Y-образный — вертикальная линия + усы)
    const rMouthLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x553333, roughness: 0.8 })
    );
    rMouthLine.position.set(0, -0.06, 0.16);
    this.rabbitHead.add(rMouthLine);

    // Усы (6 штук — по 3 с каждой стороны)
    const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3 });
    for (const s of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.001, 0.15, 3), whiskerMat);
        whisker.position.set(s * 0.1, -0.03 + w * 0.015, 0.13);
        whisker.rotation.z = s * (0.1 + w * 0.15);
        whisker.rotation.y = s * 0.3;
        this.rabbitHead.add(whisker);
      }
    }

    // Зубки (2 передних, белые)
    for (const s of [-0.012, 0.012]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.01), rabbitWhiteMat);
      tooth.position.set(s, -0.075, 0.155);
      this.rabbitHead.add(tooth);
    }

    this.rabbitHead.position.y = 0.98;
    this.rabbitHead.scale.set(1.15, 1.15, 1.15);
    modelRoot.add(this.rabbitHead);

    // === Голова железного богомола (скрыта по умолчанию) ===
    this.mantisHead = new THREE.Group();
    this.mantisHead.visible = false;

    const mArmorMat = new THREE.MeshPhysicalMaterial({ color: 0x666670, metalness: 0.85, roughness: 0.2, clearcoat: 0.3 });
    const mDarkMat = new THREE.MeshPhysicalMaterial({ color: 0x444450, metalness: 0.9, roughness: 0.15 });
    const mEyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4.0 });
    const mEyeGlowMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6, transparent: true, opacity: 0.3 });
    const mBladeMat = new THREE.MeshPhysicalMaterial({ color: 0x555560, metalness: 0.98, roughness: 0.05, clearcoat: 0.6 });
    const mJointMat = new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.95, roughness: 0.1 });

    // Череп (треугольный, насекомый)
    const mSkull = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 4), mArmorMat);
    mSkull.rotation.x = Math.PI / 2;
    mSkull.rotation.z = Math.PI / 4;
    mSkull.scale.set(0.85, 1.1, 1.0);
    this.mantisHead.add(mSkull);

    // Лицевая пластина
    const mFace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.12), mDarkMat);
    mFace.position.set(0, -0.02, 0.1);
    this.mantisHead.add(mFace);

    // Большие фасеточные глаза (красные)
    for (const s of [-1, 1]) {
      const mEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mEyeMat);
      mEye.position.set(s * 0.11, 0.02, 0.14);
      mEye.scale.set(1.2, 0.85, 0.6);
      this.mantisHead.add(mEye);

      // Фасетки
      for (let f = 0; f < 5; f++) {
        const facet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), mEyeMat);
        facet.position.set(s * 0.11 + Math.cos(f * 1.2) * 0.035, 0.02 + Math.sin(f * 1.2) * 0.025, 0.18);
        this.mantisHead.add(facet);
      }

      // Свечение
      const mGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), mEyeGlowMat);
      mGlow.position.set(s * 0.11, 0.02, 0.13);
      this.mantisHead.add(mGlow);
    }

    // Антенны
    for (const s of [-1, 1]) {
      const mAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.5, 4), mJointMat);
      mAntenna.position.set(s * 0.07, 0.14, -0.04);
      mAntenna.rotation.z = s * 0.3;
      mAntenna.rotation.x = -0.4;
      this.mantisHead.add(mAntenna);
      const mTip = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 0.5 }));
      mTip.position.set(s * (0.07 + 0.12 * Math.sin(0.3)), 0.38, -0.18);
      this.mantisHead.add(mTip);
    }

    // Жвалы (челюсти)
    for (const s of [-1, 1]) {
      const mJaw = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.13), mBladeMat);
      mJaw.position.set(s * 0.07, -0.09, 0.16);
      mJaw.rotation.y = s * 0.3;
      this.mantisHead.add(mJaw);
      // Зубец на конце
      const mTooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 3), mBladeMat);
      mTooth.position.set(s * 0.05, -0.09, 0.23);
      mTooth.rotation.x = Math.PI / 2;
      this.mantisHead.add(mTooth);
    }

    // Шейные сегменты (сзади)
    for (let i = 0; i < 3; i++) {
      const neckSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 6), mDarkMat);
      neckSeg.position.set(0, -0.06 - i * 0.06, -0.08 - i * 0.04);
      this.mantisHead.add(neckSeg);
    }

    this.mantisHead.position.y = 0.98;
    this.mantisHead.scale.set(1.15, 1.15, 1.15);
    modelRoot.add(this.mantisHead);

    // === Реактивное пламя из-под ступней (для полёта) ===
    const createFootFlame = (): THREE.Group => {
      const flameGroup = new THREE.Group();
      flameGroup.visible = false;

      const fMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 });
      const fCoreMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 2.0, transparent: true, opacity: 0.85 });
      const fTipMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0088ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
      const fSmokeMat = new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.2, roughness: 1.0 });
      const fNozzleMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.0 });

      // Сопло на ступне
      const nozzle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 8), fNozzleMat);
      nozzle.position.set(0, -0.92, 0.02);
      nozzle.rotation.x = Math.PI / 2;
      flameGroup.add(nozzle);

      // Основной конус пламени
      const mainFlame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), fMat);
      mainFlame.position.set(0, -1.2, 0.02);
      mainFlame.rotation.x = Math.PI;
      flameGroup.add(mainFlame);

      // Яркое ядро
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 5), fCoreMat);
      core.position.set(0, -1.1, 0.02);
      core.rotation.x = Math.PI;
      flameGroup.add(core);

      // Длинный хвост (реактивная струя)
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.7, 5), fTipMat);
      tail.position.set(0, -1.55, 0.02);
      tail.rotation.x = Math.PI;
      flameGroup.add(tail);

      // Дым
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), fSmokeMat);
      smoke.position.set(0, -1.9, 0.02);
      flameGroup.add(smoke);

      // Свет
      const light = new THREE.PointLight(0xff6600, 2, 6);
      light.position.set(0, -1.3, 0.02);
      flameGroup.add(light);

      return flameGroup;
    };

    this.jetFlameLeft = createFootFlame();
    this.leftLeg.add(this.jetFlameLeft);

    this.jetFlameRight = createFootFlame();
    this.rightLeg.add(this.jetFlameRight);
  }

  private createArm(
    bodyMat: THREE.Material, panelMat: THREE.Material,
    jointMat: THREE.Material, mechMat: THREE.Material,
    wireMat: THREE.Material, scratchMat: THREE.Material,
    wearMat: THREE.Material, side: number
  ): THREE.Group {
    const arm = new THREE.Group();

    // Плечевой блок (угловатый крепёж)
    const shoulderMount = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.05, 0.09), panelMat
    );
    arm.add(shoulderMount);

    // Плечевой шар (видимый сустав)
    const shoulderBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 12, 12), mechMat
    );
    shoulderBall.position.y = -0.035;
    arm.add(shoulderBall);

    // Верхняя часть руки
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.028, 0.26, 12), bodyMat
    );
    upperArm.position.y = -0.19;
    upperArm.castShadow = true;
    arm.add(upperArm);

    // Плечевая защита (пластина)
    const shoulderArmor = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.1, 0.045), panelMat
    );
    shoulderArmor.position.set(side * 0.008, -0.12, 0.012);
    arm.add(shoulderArmor);

    // Потёртость на плечевой защите
    const shoulderWear = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.003, 0.02), wearMat
    );
    shoulderWear.position.set(side * 0.008, -0.08, 0.036);
    arm.add(shoulderWear);

    // Локтевой узел
    const elbowHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.02, 12), panelMat
    );
    elbowHousing.position.y = -0.34;
    arm.add(elbowHousing);

    const elbowBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 12), mechMat
    );
    elbowBall.position.y = -0.34;
    arm.add(elbowBall);

    // Поршень на локте (видимый)
    const elbowPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.1, 6), mechMat
    );
    elbowPiston.position.set(side * -0.03, -0.3, -0.015);
    elbowPiston.rotation.z = 0.15 * side;
    arm.add(elbowPiston);

    // Предплечье
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.022, 0.3, 12), bodyMat
    );
    forearm.position.y = -0.52;
    forearm.castShadow = true;
    arm.add(forearm);

    // Панель на предплечье
    const forearmPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.14, 0.012), panelMat
    );
    forearmPanel.position.set(0, -0.5, 0.022);
    arm.add(forearmPanel);

    // Гидравлика вдоль предплечья (2 трубки)
    for (const z of [0.018, -0.018]) {
      const hydro = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.24, 6), wireMat
      );
      hydro.position.set(side * 0.022, -0.5, z);
      arm.add(hydro);
    }

    // Запястье (сложный сустав)
    const wristRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.006, 6, 12), mechMat
    );
    wristRing.position.y = -0.69;
    wristRing.rotation.x = Math.PI / 2;
    arm.add(wristRing);

    // Кисть
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.05, 0.025), bodyMat
    );
    palm.position.y = -0.73;
    arm.add(palm);

    // 3 пальца с суставами (фаланги)
    for (let f = -1; f <= 1; f++) {
      // Первая фаланга
      const ph1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.011, 0.03, 0.013), bodyMat
      );
      ph1.position.set(f * 0.015, -0.775, 0);
      arm.add(ph1);

      // Сустав
      const knuckle = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 6, 6), mechMat
      );
      knuckle.position.set(f * 0.015, -0.792, 0);
      arm.add(knuckle);

      // Вторая фаланга
      const ph2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.009, 0.025, 0.011), bodyMat
      );
      ph2.position.set(f * 0.015, -0.81, 0);
      arm.add(ph2);
    }

    // Царапина
    const scratch = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.1, 0.006), scratchMat
    );
    scratch.position.set(side * 0.028, -0.48, 0.018);
    scratch.rotation.z = 0.2 * side;
    arm.add(scratch);

    return arm;
  }

  private createLeg(
    bodyMat: THREE.Material, panelMat: THREE.Material,
    jointMat: THREE.Material, mechMat: THREE.Material,
    wireMat: THREE.Material, scratchMat: THREE.Material,
    burnMat: THREE.Material, wearMat: THREE.Material,
    side: number
  ): THREE.Group {
    const leg = new THREE.Group();

    // Тазобедренный узел
    const hipHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.05, 0.07), panelMat
    );
    leg.add(hipHousing);

    const hipBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 12), mechMat
    );
    hipBall.position.y = -0.02;
    leg.add(hipBall);

    // Бедро
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.035, 0.36, 12), bodyMat
    );
    thigh.position.y = -0.23;
    thigh.castShadow = true;
    leg.add(thigh);

    // Бедренная пластина (передняя)
    const thighPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.16, 0.012), panelMat
    );
    thighPlate.position.set(0, -0.2, 0.03);
    leg.add(thighPlate);

    // Бедренная пластина (боковая)
    const thighSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.12, 0.04), panelMat
    );
    thighSide.position.set(side * 0.04, -0.2, 0);
    leg.add(thighSide);

    // Поршень на бедре (диагональный)
    const thighPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6), mechMat
    );
    thighPiston.position.set(-side * 0.03, -0.2, -0.02);
    thighPiston.rotation.z = 0.1 * side;
    leg.add(thighPiston);

    // Коленный узел (сложный)
    const kneeHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.05, 0.06), panelMat
    );
    kneeHousing.position.set(0, -0.43, 0);
    leg.add(kneeHousing);

    const kneeBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 12, 12), mechMat
    );
    kneeBall.position.y = -0.43;
    leg.add(kneeBall);

    // Коленная чашка
    const kneeCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.02), panelMat
    );
    kneeCap.position.set(0, -0.43, 0.035);
    leg.add(kneeCap);

    // Голень
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.028, 0.38, 12), bodyMat
    );
    shin.position.y = -0.64;
    shin.castShadow = true;
    leg.add(shin);

    // Передняя пластина голени
    const shinPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.18, 0.01), panelMat
    );
    shinPlate.position.set(0, -0.58, 0.03);
    leg.add(shinPlate);

    // Поршни на голени (задние, 2 шт)
    for (const z of [-0.015, -0.025]) {
      const shinPiston = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.28, 6), mechMat
      );
      shinPiston.position.set(-side * 0.022, -0.62, z);
      leg.add(shinPiston);
    }

    // Провод вдоль голени
    const shinWire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.32, 6), wireMat
    );
    shinWire.position.set(side * 0.025, -0.62, 0.01);
    leg.add(shinWire);

    // Голеностоп
    const ankleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.006, 6, 12), mechMat
    );
    ankleRing.position.y = -0.85;
    ankleRing.rotation.x = Math.PI / 2;
    leg.add(ankleRing);

    // Стопа
    const footBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.02, 0.12), bodyMat
    );
    footBase.position.set(0, -0.88, 0.02);
    footBase.castShadow = true;
    leg.add(footBase);

    // Подъём стопы (верхняя часть)
    const footTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.015, 0.06), panelMat
    );
    footTop.position.set(0, -0.87, -0.01);
    leg.add(footTop);

    // Пальцы стопы (2 раздвоенных)
    for (const t of [-1, 1]) {
      const toeMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.012, 0.04), bodyMat
      );
      toeMain.position.set(t * 0.02, -0.886, 0.1);
      leg.add(toeMain);

      // Кончик пальца
      const toeTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.008, 0.015), panelMat
      );
      toeTip.position.set(t * 0.02, -0.886, 0.125);
      leg.add(toeTip);
    }

    // Потёртости на коленной чашке
    const kneeWear = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.003, 0.008), wearMat
    );
    kneeWear.position.set(0, -0.42, 0.046);
    leg.add(kneeWear);

    // Царапина на бедре
    const scratch = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.12, 0.006), scratchMat
    );
    scratch.position.set(side * 0.045, -0.22, 0.028);
    scratch.rotation.z = 0.12 * side;
    leg.add(scratch);

    // Подпалина (только левая нога)
    if (side === 1) {
      const burn = new THREE.Mesh(
        new THREE.CircleGeometry(0.016, 6), burnMat
      );
      burn.position.set(0.045, -0.2, 0.032);
      burn.rotation.y = 0.3;
      leg.add(burn);
    }

    return leg;
  }

  private createBlaster(arm: THREE.Group): void {
    const blasterGroup = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.85,
      roughness: 0.3,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.25,
    });

    // Корпус бластера (основная часть)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.35),
      metalMat
    );
    body.castShadow = true;
    blasterGroup.add(body);

    // Ствол (цилиндр)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.15, 6),
      darkMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, 0.25);
    barrel.castShadow = true;
    blasterGroup.add(barrel);

    // Дульный срез (кольцо)
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.01, 6),
      metalMat
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.005, 0.325);
    blasterGroup.add(muzzle);

    // Магазин (выступ снизу)
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.08, 0.06),
      darkMat
    );
    magazine.position.set(0, -0.05, -0.04);
    blasterGroup.add(magazine);

    // Рукоять
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.07, 0.04),
      darkMat
    );
    grip.position.set(0, -0.045, -0.1);
    grip.rotation.x = 0.2;
    blasterGroup.add(grip);

    // Прицельная планка (сверху)
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.015, 0.12),
      metalMat
    );
    sight.position.set(0, 0.03, 0.05);
    blasterGroup.add(sight);

    // Позиция бластера — в кисти правой руки, направлен вперёд
    blasterGroup.position.set(0, -0.66, 0.12);
    blasterGroup.rotation.x = -Math.PI / 2;

    arm.add(blasterGroup);
  }

  private createPhysicsBody(): void {
    // Капсула из цилиндра + двух сфер
    const radius = 0.3;
    const height = K2SO_HEIGHT - radius * 2;
    const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);

    this.body = new CANNON.Body({
      mass: 80,
      fixedRotation: true, // не вращать от физики
      linearDamping: 0.1,
    });

    this.body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
    this.body.addShape(topSphere, new CANNON.Vec3(0, height / 2, 0));
    this.body.addShape(bottomSphere, new CANNON.Vec3(0, -height / 2, 0));

    this.physics.addBody(this.body);
  }

  fixedUpdate(dt: number): void {
    // Проверка: на земле?
    this.checkGrounded();

    // Синхронизация меша с физическим телом
    this.syncMeshToBody();
  }

  update(dt: number, input: InputManager): void {
    if (this.quoteCooldown > 0) this.quoteCooldown -= dt;
    this.handleSkinSwitch(dt, input);
    this.handleFlyToggle(dt, input);
    this.updateJetFlame(dt);
    if (this.isFlying) {
      this.handleFlyMovement(dt, input);
    } else {
      this.handleCrouch(dt, input);
      this.handleMovement(dt, input);
    }
    this.handleReloading(dt);
    this.handleHeal(dt, input);
    this.regenerateShield(dt);
    this.regenerateHealth(dt);
    this.animateLimbs(dt, input);
    this.syncMeshToBody();

    // Стелс: присел + не двигается
    this.isMoving = this.moveDirection.lengthSq() > 0.01;
    this.isStealth = this.isCrouching && !this.isMoving;

    // Поворот модели в сторону камеры при движении
    if (this.isMoving) {
      const targetAngle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      const currentAngle = this.mesh.rotation.y;
      let diff = targetAngle - currentAngle;
      // Нормализация угла
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(dt * 10, 1);
    }
  }

  private handleSkinSwitch(dt: number, input: InputManager): void {
    this.skinCooldown -= dt;
    if (input.switchSkin && this.skinCooldown <= 0) {
      this.skinCooldown = 0.5;
      const maxSkins = this.bossDefeated ? 9 : 8;
      this.currentSkin = (this.currentSkin + 1) % maxSkins;
      this.applySkin();
    }
  }

  // Сохранённые оригинальные цвета (для восстановления)
  private originalColors: number[] | null = null;

  private applySkin(): void {
    // Сохранить оригиналы при первом вызове
    if (!this.originalColors) {
      this.originalColors = this.skinMeshes.map(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        return mat.color.getHex();
      });
    }

    const setEyeColor = (hex: number) => {
      (this.eyeLeftRef.material as THREE.MeshStandardMaterial).color.setHex(hex);
      (this.eyeLeftRef.material as THREE.MeshStandardMaterial).emissive.setHex(hex);
      (this.eyeRightRef.material as THREE.MeshStandardMaterial).color.setHex(hex);
      (this.eyeRightRef.material as THREE.MeshStandardMaterial).emissive.setHex(hex);
      this.eyeLightRef.color.setHex(hex);
    };

    const SKIN_NAMES = ['K-2SO', 'Убойный робот', 'Бобр', 'Скелет', 'Пряник', 'Розовый робот', 'Голубой заяц', 'Железный богомол', 'R-111 [БОСС]'];

    // Скрыть всё по умолчанию
    if (this.bearHead) this.bearHead.visible = false;
    if (this.beaverTail) this.beaverTail.visible = false;
    if (this.skullHead) this.skullHead.visible = false;
    if (this.gingerHead) this.gingerHead.visible = false;
    if (this.rabbitHead) this.rabbitHead.visible = false;
    if (this.mantisHead) this.mantisHead.visible = false;
    this.gingerButtons.forEach(b => b.visible = false);
    this.headRef.visible = true;
    if (this.neckGroupRef) this.neckGroupRef.visible = true;

    // Восстановить оригинальные цвета
    if (this.originalColors) {
      this.skinMeshes.forEach((m, i) => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(this.originalColors![i]);
      });
    }

    if (this.currentSkin === 0) {
      // K-2SO — стандарт
      setEyeColor(0x2288ff);

    } else if (this.currentSkin === 1) {
      // Убойный робот — красные глаза
      setEyeColor(0xff2200);

    } else if (this.currentSkin === 2) {
      // Бобр
      setEyeColor(0x2244cc);
      this.skinMeshes.forEach(m => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(0x6b4226);
      });
      this.headRef.visible = false;
      if (this.neckGroupRef) this.neckGroupRef.visible = false;
      if (this.bearHead) this.bearHead.visible = true;
      if (this.beaverTail) this.beaverTail.visible = true;

    } else if (this.currentSkin === 3) {
      // Скелет
      setEyeColor(0x22ff44);
      this.skinMeshes.forEach(m => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(0xe8e0d0);
      });
      this.headRef.visible = false;
      if (this.neckGroupRef) this.neckGroupRef.visible = false;
      if (this.skullHead) this.skullHead.visible = true;

    } else if (this.currentSkin === 4) {
      // Пряник
      setEyeColor(0xffffff);
      this.skinMeshes.forEach(m => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(0xb5651d);
      });
      this.headRef.visible = false;
      if (this.neckGroupRef) this.neckGroupRef.visible = false;
      if (this.gingerHead) this.gingerHead.visible = true;
      this.gingerButtons.forEach(b => b.visible = true);

    } else if (this.currentSkin === 5) {
      // Розовый робот
      setEyeColor(0xff66aa);
      this.skinMeshes.forEach(m => {
        const hex = (m.material as THREE.MeshStandardMaterial).color.getHex();
        if (hex > 0x151515) {
          (m.material as THREE.MeshStandardMaterial).color.setHex(0xff88bb);
        } else {
          (m.material as THREE.MeshStandardMaterial).color.setHex(0xcc4488);
        }
      });

    } else if (this.currentSkin === 6) {
      // Голубой заяц
      setEyeColor(0xff4488);
      this.skinMeshes.forEach(m => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(0x66bbee);
      });
      this.headRef.visible = false;
      if (this.neckGroupRef) this.neckGroupRef.visible = false;
      if (this.rabbitHead) this.rabbitHead.visible = true;

    } else if (this.currentSkin === 7) {
      // Железный богомол — серое тело, голова богомола, красные глаза
      setEyeColor(0xff0000);
      this.skinMeshes.forEach(m => {
        (m.material as THREE.MeshStandardMaterial).color.setHex(0x666670);
        (m.material as THREE.MeshStandardMaterial).metalness = 0.7;
        (m.material as THREE.MeshStandardMaterial).roughness = 0.25;
      });
      this.headRef.visible = false;
      if (this.neckGroupRef) this.neckGroupRef.visible = false;
      if (this.mantisHead) this.mantisHead.visible = true;

    } else if (this.currentSkin === 8) {
      // R-111 — скин босса (тёмная броня, красные глаза, способности босса)
      setEyeColor(0xff0000);
      this.skinMeshes.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        const hex = mat.color.getHex();
        if (hex > 0x151515) {
          mat.color.setHex(0x1a1a22);
        } else {
          mat.color.setHex(0x0e0e15);
        }
        mat.metalness = 0.7;
        mat.roughness = 0.3;
      });
    }

    // Способности R-111: усиленные характеристики
    if (this.currentSkin === 8) {
      this.maxHealth = 250;
      this.health = Math.min(this.health, this.maxHealth);
      if (this.health <= 0) this.health = this.maxHealth;
      this.maxShield = 150;
      this.shield = this.maxShield;
      this.shootDamageBonus = 15; // +15 урона к выстрелам
      this.speedBonus = 1.3;     // +30% к скорости
    } else {
      // Восстановить обычные характеристики
      this.maxHealth = K2SO_MAX_HEALTH;
      this.health = Math.min(this.health, this.maxHealth);
      this.maxShield = K2SO_MAX_SHIELD;
      this.shield = Math.min(this.shield, this.maxShield);
      this.shootDamageBonus = 0;
      this.speedBonus = 1.0;
    }

    // Показать название скина на HUD
    this.showSkinName(SKIN_NAMES[this.currentSkin]);
  }

  private skinNameTimeout = 0;
  private skinNameDiv: HTMLDivElement | null = null;

  private showSkinName(name: string): void {
    if (!this.skinNameDiv) {
      this.skinNameDiv = document.createElement('div');
      this.skinNameDiv.style.cssText = 'position:fixed;top:15%;left:50%;transform:translateX(-50%);color:#fff;font-size:28px;font-family:Arial,sans-serif;font-weight:bold;text-shadow:0 0 10px rgba(0,0,0,0.8),0 0 20px rgba(0,150,255,0.4);pointer-events:none;z-index:100;transition:opacity 0.5s;';
      document.body.appendChild(this.skinNameDiv);
    }
    this.skinNameDiv.textContent = name;
    this.skinNameDiv.style.opacity = '1';
    clearTimeout(this.skinNameTimeout as any);
    this.skinNameTimeout = window.setTimeout(() => {
      if (this.skinNameDiv) this.skinNameDiv.style.opacity = '0';
    }, 1500);
  }

  // === ЗВУКОВАЯ СИСТЕМА K-2SO ===
  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  /** Металлический шаг робота */
  playStepSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Удар металла (шум + тон)
    const bufSize = ctx.sampleRate * 0.08;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 60) +
                Math.sin(t * 800 + Math.random() * 200) * 0.3 * Math.exp(-t * 40);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    src.connect(hp);
    hp.connect(gain);
    src.start(now);
  }

  /** Бластерный выстрел */
  playShootSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // Синтетический «пиу» — частота падает
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3;

    osc.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Щелчок механизма
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.value = 4000;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.02);
  }

  /** Ближний бой — удар металлом */
  playMeleeSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Тяжёлый удар
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Лязг
    const bufSize = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate * 30);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.15, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  /** Получение урона — искры/помехи */
  playDamageSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // Электрические помехи
    const bufSize = ctx.sampleRate * 0.2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 15) *
                (1 + Math.sin(t * 3000) * 0.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(now);

    // Низкий гул от удара
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Прыжок — гидравлика */
  playJumpSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Перезарядка — механический звук */
  playReloadSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    // Щелчок извлечения магазина
    const click1 = ctx.createOscillator();
    click1.type = 'square';
    click1.frequency.value = 3000;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.1, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click1.connect(g1); g1.connect(ctx.destination);
    click1.start(now); click1.stop(now + 0.03);

    // Скрежет вставки (через 0.4с)
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = Math.sin(t * 600) * 0.3 * Math.exp(-t * 15) +
                (Math.random() * 2 - 1) * 0.2 * Math.exp(-t * 20);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.12, now + 0.4);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    src.connect(g2); g2.connect(ctx.destination);
    src.start(now + 0.4);

    // Щелчок фиксации (через 0.8с)
    const click2 = ctx.createOscillator();
    click2.type = 'square';
    click2.frequency.value = 4500;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.12, now + 0.8);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.83);
    click2.connect(g3); g3.connect(ctx.destination);
    click2.start(now + 0.8); click2.stop(now + 0.83);
  }

  /** Лечение — электронный восстановительный звук */
  playHealSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    // Восходящий тон (восстановление)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.6);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.6);

    // Мерцающий обертон
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.4);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.06, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(now); osc2.stop(now + 0.5);
  }

  /** Смерть — выключение систем */
  playDeathSound(): void {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    // Нисходящий тон (отключение)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 1.0);

    // Электрические помехи при отключении
    const bufSize = ctx.sampleRate * 0.8;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3) *
                Math.sin(t * 100) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.15, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    src.connect(nGain); nGain.connect(ctx.destination);
    src.start(now);
  }

  // === БОЕВЫЕ ФРАЗЫ К-2SO ===

  private static KILL_QUOTES = [
    '«Вероятность твоего выживания была 0%. Я не ошибся.»',
    '«Привет. И сразу прощай.»',
    '«Это было предсказуемо. Как и ты.»',
    '«Один минус. Осталось... считаю...»',
    '«Не принимай на свой счёт. Хотя нет, принимай.»',
    '«Мой бластер передаёт привет.»',
    '«Статистика обновлена. Тебя в ней больше нет.»',
    '«Ты был в моём списке. Теперь вычеркнут.»',
    '«Советую остальным пересмотреть свои планы.»',
    '«Вот так выглядит оптимизация.»',
    '«Это не жестокость. Это арифметика.»',
    '«Твой код ошибки — 404. Жизнь не найдена.»',
    '«Не волнуйся, больно не будет. Уже не будет.»',
    '«Добавлю тебя в отчёт. Раздел — потери.»',
    '«Я косор. Я не промахиваюсь. Ну, почти.»',
  ];

  private static MELEE_QUOTES = [
    '«Привет! Это моя рука. В твоём лице.»',
    '«Рукопожатие от К-2SO. Смертельное.»',
    '«Ближний бой? Мой любимый.»',
    '«Это называется — контакт.»',
    '«Тебе нужен ремонт. Но уже поздно.»',
  ];

  private static RELOAD_QUOTES = [
    '«Секунду. Перезаряжаюсь. Не скучайте.»',
    '«Подождите, я ещё не закончил.»',
    '«Магазин пуст. Ваш шанс убежать — 1.5 секунды.»',
  ];

  private static FIRST_SHOT_QUOTES = [
    '«Ну, привет. Давно не виделись.»',
    '«А вот и я. Скучали?»',
    '«Вероятность вашего поражения — 100%. Приступаю.»',
    '«Привет, я К-2SO. Убойный робот. Приятно... нет, неприятно.»',
  ];

  private static DAMAGE_QUOTES = [
    '«Это всё, на что вы способны?»',
    '«Щекотно.»',
    '«Запишу в отчёт — незначительное повреждение.»',
    '«Вы только что снизили мою эффективность на 0.1%. Поздравляю.»',
  ];

  /** Показать фразу на экране */
  sayQuote(text: string): void {
    if (this.quoteCooldown > 0) return;
    this.quoteCooldown = 4; // минимум 4 секунды между фразами

    if (!this.quoteDiv) {
      this.quoteDiv = document.createElement('div');
      this.quoteDiv.style.cssText = 'position:fixed;bottom:20%;left:50%;transform:translateX(-50%);color:#88ccff;font-size:18px;font-family:Arial,sans-serif;font-style:italic;text-shadow:0 0 10px rgba(0,100,255,0.5),0 0 20px rgba(0,0,0,0.8);pointer-events:none;z-index:100;transition:opacity 0.5s;white-space:nowrap;max-width:80%;text-align:center;';
      document.body.appendChild(this.quoteDiv);
    }
    this.quoteDiv.textContent = text;
    this.quoteDiv.style.opacity = '1';
    clearTimeout(this.quoteTimeout as any);
    this.quoteTimeout = window.setTimeout(() => {
      if (this.quoteDiv) this.quoteDiv.style.opacity = '0';
    }, 3000);

    // Озвучка — железный мужской голос
    this.playVoice(text);
  }

  /** Железный мужской голос К-2SO — SpeechSynthesis + металлические эффекты */
  private playVoice(text: string): void {
    // Убрать кавычки из текста для озвучки
    const cleanText = text.replace(/[«»""]/g, '');

    // === Настоящий мужской голос через SpeechSynthesis ===
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel(); // остановить предыдущую фразу
      const utt = new SpeechSynthesisUtterance(cleanText);
      utt.lang = 'ru-RU';
      utt.rate = 0.9;   // чуть медленнее — солидно
      utt.pitch = 0.4;  // очень низкий тон — мужской железный
      utt.volume = 0.9;

      // Ищем мужской русский голос
      const voices = speechSynthesis.getVoices();
      const maleRu = voices.find(v => v.lang.startsWith('ru') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('dmitr') || v.name.toLowerCase().includes('pavel') || v.name.toLowerCase().includes('мужск')));
      const anyRu = voices.find(v => v.lang.startsWith('ru'));
      if (maleRu) utt.voice = maleRu;
      else if (anyRu) utt.voice = anyRu;

      speechSynthesis.speak(utt);
    }

    // === Металлические эффекты поверх голоса ===
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;
    const duration = Math.min(cleanText.length * 0.06, 3.0);

    // Щелчок включения передатчика
    const onClick = ctx.createOscillator();
    onClick.type = 'sine';
    onClick.frequency.value = 1500;
    const onGain = ctx.createGain();
    onGain.gain.setValueAtTime(0.12, now);
    onGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    onClick.connect(onGain);
    onGain.connect(ctx.destination);
    onClick.start(now);
    onClick.stop(now + 0.025);

    // Лёгкое гудение электроники на фоне речи
    const motor = ctx.createOscillator();
    motor.type = 'sine';
    motor.frequency.value = 60;
    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.025, now + 0.05);
    motorGain.gain.setValueAtTime(0.025, now + duration * 0.8);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    motor.connect(motorGain);
    motorGain.connect(ctx.destination);
    motor.start(now + 0.05);
    motor.stop(now + duration);

    // Тихая статика (радиопомехи)
    const noiseLen = Math.floor(ctx.sampleRate * duration);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilt = ctx.createBiquadFilter();
    noiseFilt.type = 'highpass';
    noiseFilt.frequency.value = 5000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.03, now + 0.05);
    noiseGain.gain.setValueAtTime(0.03, now + duration * 0.8);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noiseSrc.connect(noiseFilt);
    noiseFilt.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(now + 0.05);

    // Щелчок выключения
    const offClick = ctx.createOscillator();
    offClick.type = 'sine';
    offClick.frequency.value = 1200;
    const offGain = ctx.createGain();
    offGain.gain.setValueAtTime(0.1, now + duration - 0.025);
    offGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    offClick.connect(offGain);
    offGain.connect(ctx.destination);
    offClick.start(now + duration - 0.025);
    offClick.stop(now + duration);
  }

  /** Вызывается при убийстве врага */
  onEnemyKilled(): void {
    this.killCount++;
    // 40% шанс сказать фразу
    if (Math.random() > 0.6) {
      const quotes = K2SO.KILL_QUOTES;
      this.sayQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }

  /** Вызывается при первом выстреле */
  onFirstShot(): void {
    if (this.firstShotFired) return;
    this.firstShotFired = true;
    const quotes = K2SO.FIRST_SHOT_QUOTES;
    this.sayQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }

  /** Вызывается при ближнем бое */
  onMelee(): void {
    if (Math.random() > 0.5) {
      const quotes = K2SO.MELEE_QUOTES;
      this.sayQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }

  /** Вызывается при перезарядке */
  onReload(): void {
    if (Math.random() > 0.7) {
      const quotes = K2SO.RELOAD_QUOTES;
      this.sayQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }

  /** Вызывается при получении урона */
  onDamage(): void {
    if (Math.random() > 0.85) {
      const quotes = K2SO.DAMAGE_QUOTES;
      this.sayQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }

  /** Обновление реактивного пламени при полёте */
  private updateJetFlame(dt: number): void {
    if (!this.jetFlameLeft || !this.jetFlameRight) return;

    if (this.isFlying) {
      this.jetFlameLeft.visible = true;
      this.jetFlameRight.visible = true;
      this.jetFlameTime += dt;

      const t = this.jetFlameTime;
      // Анимация обеих ног
      for (const flame of [this.jetFlameLeft, this.jetFlameRight]) {
        let idx = 0;
        flame.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            const pulse = 0.85 + Math.sin(t * 15 + idx * 2) * 0.15;
            const pulseY = 0.8 + Math.sin(t * 12 + idx * 3) * 0.2;
            child.scale.set(pulse, pulseY, pulse);
            idx++;
          }
          if (child instanceof THREE.PointLight) {
            child.intensity = 1.5 + Math.sin(t * 18 + (flame === this.jetFlameRight ? 1 : 0)) * 0.8;
          }
        });
      }
    } else {
      this.jetFlameLeft.visible = false;
      this.jetFlameRight.visible = false;
      this.jetFlameTime = 0;
    }
  }

  private handleFlyToggle(dt: number, input: InputManager): void {
    this.flyToggleCooldown -= dt;
    if (this.flyToggleCooldown > 0) return;

    // F10 — включить полёт
    if (input.flyOn && !this.isFlying) {
      this.isFlying = true;
      this.flyToggleCooldown = 0.5;
      this.body.type = CANNON.Body.KINEMATIC;
      this.body.velocity.set(0, 0, 0);
    }

    // Backspace — выключить полёт
    if (input.flyOff && this.isFlying) {
      this.isFlying = false;
      this.flyToggleCooldown = 0.5;
      this.body.type = CANNON.Body.DYNAMIC;
      this.body.mass = 80;
      this.body.updateMassProperties();
    }
  }

  private handleFlyMovement(dt: number, input: InputManager): void {
    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

    this.moveDirection.set(0, 0, 0);
    if (input.forward) this.moveDirection.add(forward);
    if (input.backward) this.moveDirection.sub(forward);
    if (input.right) this.moveDirection.add(right);
    if (input.left) this.moveDirection.sub(right);

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }

    const speed = input.sprint ? K2SO.FLY_SPEED * 2 : K2SO.FLY_SPEED;

    // Горизонтальное движение
    this.body.position.x += this.moveDirection.x * speed * dt;
    this.body.position.z += this.moveDirection.z * speed * dt;

    // Вертикальное движение
    if (input.flyUp) {
      this.body.position.y += K2SO.FLY_VERTICAL_SPEED * dt;
    }
    if (input.flyDown) {
      this.body.position.y -= K2SO.FLY_VERTICAL_SPEED * dt;
    }

    // Минимальная высота
    if (this.body.position.y < 1.5) {
      this.body.position.y = 1.5;
    }
  }

  private handleMovement(dt: number, input: InputManager): void {
    this.moveDirection.set(0, 0, 0);

    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

    if (input.forward) this.moveDirection.add(forward);
    if (input.backward) this.moveDirection.sub(forward);
    if (input.right) this.moveDirection.add(right);
    if (input.left) this.moveDirection.sub(right);

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }

    let speed = input.sprint ? K2SO_RUN_SPEED : K2SO_WALK_SPEED;
    speed *= this.speedBonus;
    if (this.isCrouching) speed *= K2SO_CROUCH_SPEED_MULT;

    // Пробуждаем тело и задаём скорость
    this.body.wakeUp();
    this.body.velocity.x = this.moveDirection.x * speed;
    this.body.velocity.z = this.moveDirection.z * speed;

    // Звук шагов
    if (this.moveDirection.lengthSq() > 0 && this.isGrounded) {
      this.stepInterval = input.sprint ? 0.25 : 0.4;
      this.stepTimer += dt;
      if (this.stepTimer >= this.stepInterval) {
        this.stepTimer = 0;
        this.playStepSound();
      }
    } else {
      this.stepTimer = this.stepInterval; // следующий шаг сразу
    }

    // Прыжок
    if (input.jump && this.isGrounded) {
      this.body.velocity.y = K2SO_JUMP_FORCE;
      this.playJumpSound();
    }

    // Если не двигаемся — гасим горизонтальную скорость
    if (this.moveDirection.lengthSq() === 0) {
      this.body.velocity.x *= 0.85;
      this.body.velocity.z *= 0.85;
    }
  }

  private checkGrounded(): void {
    const from = new CANNON.Vec3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    const to = new CANNON.Vec3(
      this.body.position.x,
      this.body.position.y - K2SO_HEIGHT / 2 - 0.15,
      this.body.position.z
    );

    const result = new CANNON.RaycastResult();
    this.physics.world.raycastClosest(from, to, { skipBackfaces: true }, result);
    this.isGrounded = result.hasHit;
  }

  private handleReloading(dt: number): void {
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
      }
    }
  }

  private regenerateShield(dt: number): void {
    if (this.shieldRegenTimer > 0) {
      this.shieldRegenTimer -= dt;
      return;
    }
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + K2SO_SHIELD_REGEN_RATE * dt);
    }
  }

  private handleCrouch(dt: number, input: InputManager): void {
    this.isCrouching = input.cover;

    // Плавная интерполяция приседания
    const target = this.isCrouching ? 1 : 0;
    this.crouchLerp += (target - this.crouchLerp) * Math.min(dt * 10, 1);

    // Масштаб модели по Y
    const scaleY = 1 - this.crouchLerp * (1 - K2SO_CROUCH_HEIGHT_SCALE);
    const modelRoot = this.mesh.children[0];
    if (modelRoot) {
      modelRoot.scale.y = scaleY;
    }
  }

  private handleHeal(dt: number, input: InputManager): void {
    if (this.healCooldown > 0) {
      this.healCooldown -= dt;
      this.isHealing = false;
    }
    if (input.heal && this.healCharges > 0 && this.healCooldown <= 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + K2SO.HEAL_AMOUNT);
      this.healCharges--;
      this.healCooldown = K2SO.HEAL_COOLDOWN;
      this.playHealSound();
      this.isHealing = true;
    }
  }

  private regenerateHealth(dt: number): void {
    if (!this.isCrouching) return;
    if (this.healthRegenTimer > 0) {
      this.healthRegenTimer -= dt;
      return;
    }
    if (this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + K2SO_COVER_HEALTH_REGEN_RATE * dt);
    }
  }

  override takeDamage(amount: number): void {
    this.shieldRegenTimer = K2SO_SHIELD_REGEN_DELAY;
    this.healthRegenTimer = K2SO_COVER_HEALTH_REGEN_DELAY;

    // Сначала щит поглощает урон
    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, amount);
      this.shield -= shieldDamage;
      amount -= shieldDamage;
    }

    if (amount > 0) {
      super.takeDamage(amount);
    }
    this.playDamageSound();
    this.onDamage();

    if (this.health <= 0) {
      this.playDeathSound();
    }
  }

  startReload(): void {
    if (!this.isReloading && this.ammo < this.maxAmmo) {
      this.isReloading = true;
      this.reloadTimer = 1.5;
      this.playReloadSound();
      this.onReload();
    }
  }

  private animateLimbs(dt: number, input: InputManager): void {
    const isMoving = this.moveDirection.lengthSq() > 0.01;
    const speed = input.sprint ? 12 : 8;

    if (isMoving) {
      this.limbPhase += dt * speed;
    } else {
      // Плавно возвращаемся в нейтральную позу
      this.limbPhase *= 0.9;
    }

    const swing = Math.sin(this.limbPhase) * 0.4;

    // Руки качаются в противофазе с ногами
    this.leftArm.rotation.x = -swing;
    this.rightArm.rotation.x = swing;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    // Лёгкое покачивание головы
    this.head.rotation.z = Math.sin(this.limbPhase * 0.5) * 0.02;
  }

  /** Множитель дальности обнаружения: 1.0 = обычный, меньше = труднее найти */
  getDetectMultiplier(): number {
    if (this.isStealth) return 0.25;   // стелс: почти невидим
    if (this.isCrouching) return 0.5;  // присед + движение: сложнее заметить
    return 1.0;
  }

  getAimOrigin(): THREE.Vector3 {
    const pos = this.getPosition();
    return new THREE.Vector3(pos.x, pos.y + 0.5, pos.z);
  }

  reset(position: THREE.Vector3): void {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isCrouching = false;
    this.crouchLerp = 0;
    this.healthRegenTimer = 0;
    this.healCharges = this.maxHealCharges;
    this.healCooldown = 0;
    this.isHealing = false;
    this.isDead = false;
    this.body.position.set(position.x, position.y, position.z);
    this.body.velocity.set(0, 0, 0);
    this.mesh.position.copy(position);
  }

  protected onDeath(): void {
    // TODO: анимация гибели, ragdoll
  }
}
