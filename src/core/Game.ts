import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { InputManager } from './InputManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { K2SO } from '../entities/K2SO';
import { Enemy } from '../entities/Enemy';
import { Stormtrooper } from '../entities/Stormtrooper';
import { TurretDroid } from '../entities/TurretDroid';
import { BossDroid } from '../entities/BossDroid';
import { MantisBot } from '../entities/MantisBot';
import { HUD } from '../ui/HUD';
import { createTestLevel, GrievousRef } from '../levels/TestLevel';
import {
  LevelData, Pedestrian, MovingCar, TrafficLight,
  createCityBrawl, createMetroBoss,
} from '../levels/LevelFactory';
import { FIXED_TIME_STEP, MAX_SUB_STEPS } from '../utils/Constants';

const TOTAL_LEVELS = 10;

// Названия уровней для HUD
const LEVEL_NAMES = [
  'НейроСити — 2148 / Район 1',
  'НейроСити — 2148 / Район 2',
  'НейроСити — 2148 / Район 3',
  'НейроСити — 2148 / Район 4',
  'НейроСити — 2148 / Район 5',
  'НейроСити — 2148 / Район 6',
  'НейроСити — 2148 / Район 7',
  'НейроСити — 2148 / Район 8',
  'НейроСити — 2148 / Район 9',
  'Метро — Босс R-111',
];

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  input: InputManager;
  physics: PhysicsSystem;
  cameraSystem: CameraSystem;
  combat: CombatSystem;
  hud: HUD;
  player!: K2SO;
  enemies: Enemy[] = [];
  clock: THREE.Clock;
  private composer!: EffectComposer;
  private colorPass: ShaderPass | null = null;
  private pedestrians: Pedestrian[] = [];
  private movingCars: MovingCar[] = [];
  private trafficLights: TrafficLight[] = [];
  private pedTime = 0;
  private audioListener: THREE.AudioListener | null = null;
  private pedScreamTimer = 0;

  private accumulator = 0;
  private running = false;
  private currentLevel = 0;
  private levelComplete = false;
  private gameOver = false;
  private levelTransitionHandler: (() => void) | null = null;

  // Данные текущего уровня (для очистки при смене)
  private currentLevelData: LevelData | null = null;
  // Уровень 1 (корабль) — статичный, не удаляется
  private shipGroup: THREE.Group | null = null;
  private shipBodies: import('cannon-es').Body[] = [];
  private shipLights: THREE.Light[] = [];
  // Освещение уровня 1 (базовое)
  private baseLights: THREE.Light[] = [];
  // Укрытия корабельных уровней (для очистки)
  private coverMeshes: THREE.Mesh[] = [];
  private coverBodies: import('cannon-es').Body[] = [];

  private grievousRef: GrievousRef | null = null;
  private grievousWaking = false;
  private grievousWakeTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Рендерер
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Сцена — кинематографический голубой фон
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.005);

    // Environment map — HDR-подобное окружение для отражений
    const pmremGen = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(50, 24, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x2266aa) },
        midColor: { value: new THREE.Color(0xaaccee) },
        botColor: { value: new THREE.Color(0xe8d0b0) },
        sunDir:   { value: new THREE.Vector3(0.5, 0.3, -0.4).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main(){
          vWorldDir = normalize((modelMatrix * vec4(position,1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, midColor, botColor, sunDir;
        varying vec3 vWorldDir;
        void main(){
          float y = vWorldDir.y;
          vec3 col = y > 0.0 ? mix(midColor, topColor, pow(y, 0.5)) : mix(midColor, botColor, pow(-y, 0.4));
          // Солнечный ореол
          float sun = max(dot(normalize(vWorldDir), sunDir), 0.0);
          col += vec3(1.0, 0.85, 0.6) * pow(sun, 32.0) * 2.0;
          col += vec3(1.0, 0.9, 0.7) * pow(sun, 4.0) * 0.3;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));
    envScene.add(new THREE.HemisphereLight(0x88aacc, 0x886644, 2.0));
    const envSun = new THREE.DirectionalLight(0xffeedd, 2.0);
    envSun.position.set(5, 3, -4);
    envScene.add(envSun);
    // Светящиеся панели (отражения окон зданий)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const g = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 6),
        new THREE.MeshBasicMaterial({ color: 0xeeeeff })
      );
      g.position.set(Math.cos(a) * 30, 4, Math.sin(a) * 30);
      g.lookAt(0, 4, 0);
      envScene.add(g);
    }
    this.scene.environment = pmremGen.fromScene(envScene, 0.02).texture;
    pmremGen.dispose();

    // Камера — кинематографический FOV
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );

    // === Кинематографический пост-процессинг ===
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom — мягкое свечение (как в кино — ореолы вокруг ярких объектов)
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,   // strength
      0.8,   // radius (широкий, мягкий)
      0.75   // threshold
    );
    this.composer.addPass(bloom);

    // Кинематографическая цветокоррекция
    this.colorPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        varying vec2 vUv;

        void main(){
          vec2 center = vUv - 0.5;
          float dist = length(center);
          vec3 col = texture2D(tDiffuse, vUv).rgb;

          // Контраст (мягкая S-кривая)
          col = (col - 0.5) * 1.1 + 0.5;
          col = clamp(col, 0.0, 1.0);

          // Глубокая виньетка (как в кино)
          float vig = 1.0 - dist * 1.2;
          vig = clamp(vig, 0.0, 1.0);
          vig = vig * vig;
          col *= mix(0.3, 1.0, vig);

          // Зерно плёнки (тонкое)
          float grain = fract(sin(dot(vUv * 500.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
          col += (grain - 0.5) * 0.03;

          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.composer.addPass(this.colorPass);

    this.composer.addPass(new OutputPass());

    // Подсистемы
    this.input = new InputManager(canvas);
    this.physics = new PhysicsSystem();
    this.cameraSystem = new CameraSystem(this.camera, this.input);
    this.combat = new CombatSystem(this.scene, this.physics);
    this.hud = new HUD();
    this.clock = new THREE.Clock();

    // Обработка ресайза
    window.addEventListener('resize', () => this.onResize());
  }

  private setupBaseLighting(): void {
    // Яркий hemisphere — светлый интерьер корабля
    const hemiLight = new THREE.HemisphereLight(0xccddff, 0x667788, 1.8);
    this.scene.add(hemiLight);
    this.baseLights.push(hemiLight);

    // Ambient — сильное базовое освещение
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
    this.baseLights.push(ambient);

    // Направленный свет (верхнее освещение)
    const dirLight = new THREE.DirectionalLight(0xeef4ff, 1.5);
    dirLight.position.set(5, 15, -10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);
    this.baseLights.push(dirLight);
  }

  async init(): Promise<void> {
    // Показываем прогресс
    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = '30%';

    this.player = new K2SO(this.scene, this.physics);
    this.player.spawn(new THREE.Vector3(0, 1.5, 0));
    this.cameraSystem.setTarget(this.player);
    this.cameraSystem.setScene(this.scene);

    // Аудио-система
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    if (bar) bar.style.width = '60%';

    this.currentLevel = 0;
    this.levelComplete = true;
    this.loadLevel(0);
    this.levelComplete = false;
    this.hud.setLevel(1);
    this.hud.setLevelName(LEVEL_NAMES[0]);

    if (bar) bar.style.width = '100%';

    // Ждём клик/Enter для старта (нужен для pointer lock)
    const clickText = document.getElementById('click-to-start');
    if (clickText) clickText.style.display = 'block';
    await this.showClickToStart();
  }

  private updateLoadingBarSync(percent: number): void {
    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = `${percent}%`;
  }

  /** Загрузить уровень: создать окружение + заспавнить врагов */
  private loadLevel(levelIndex: number): void {
    // Уровни 0-8 — НейроСити (разные районы)
    // Уровень 9 — босс R-111 (метро)
    let data: LevelData;
    if (levelIndex <= 8) {
      data = createCityBrawl(this.scene, this.physics, levelIndex + 1);
    } else if (levelIndex === 9) {
      data = createMetroBoss(this.scene, this.physics);
    } else {
      return;
    }

    this.currentLevelData = data;
    this.pedestrians = data.pedestrians || [];
    this.movingCars = data.movingCars || [];
    this.trafficLights = data.trafficLights || [];

    // Обновить фон и туман
    (this.scene.background as THREE.Color).set(data.bgColor);
    (this.scene.fog as THREE.Fog).color.set(data.fogColor);
    (this.scene.fog as THREE.Fog).near = 40;
    (this.scene.fog as THREE.Fog).far = 150;

    // Убрать базовое освещение корабля — у уровня своё
    for (const l of this.baseLights) l.visible = false;

    // Спрятать корабль
    this.hideShip();

    // Заспавнить врагов
    this.spawnEnemies(data.enemies);

    // Заспавнить турели (если есть)
    if (data.turrets) {
      this.spawnTurrets(data.turrets);
    }

    // Босс в метро (индекс 9)
    if (levelIndex === 9) {
      this.spawnBosses([
        new THREE.Vector3(0, 2, 0),
      ]);
    }

    // Мини-босс богомол на каждом уровне города (0-8)
    if (levelIndex <= 8) {
      this.spawnMantis([
        new THREE.Vector3(15 + levelIndex * 3, 2, 15 + levelIndex * 2),
      ]);
    }

    // Сбросить позицию игрока
    this.player.reset(data.playerSpawn.clone());
  }

  /** Убрать данные текущего уровня (очистка) */
  private unloadCurrentLevel(): void {
    if (!this.currentLevelData) return;

    // Удалить визуальную группу
    this.scene.remove(this.currentLevelData.group);

    // Удалить физические тела
    for (const body of this.currentLevelData.bodies) {
      this.physics.removeBody(body);
    }

    // Удалить свет уровня
    for (const light of this.currentLevelData.lights) {
      this.scene.remove(light);
    }

    this.currentLevelData = null;
  }

  /** Скрыть геометрию корабля (для уровней 2-9) */
  private hideShip(): void {
    // Скрываем все объекты кроме игрока, врагов, снарядов и текущего уровня
    this.scene.traverse((obj) => {
      if (obj === this.scene) return;
      // Пропускаем камеру, игрока, свет текущего уровня, группу текущего уровня
      if (obj === this.camera) return;
      if (obj === this.player?.mesh) return;
      if (this.currentLevelData && obj === this.currentLevelData.group) return;
      if (this.currentLevelData && this.currentLevelData.lights.includes(obj as THREE.Light)) return;

      // Скрываем объекты уровня 1 (у них нет родителя в LevelData группе)
      if (obj.parent === this.scene && !obj.userData.__levelObj) {
        obj.userData.__wasVisible = obj.visible;
        obj.visible = false;
      }
    });
  }

  /** Показать геометрию корабля (при возврате на уровни 0, 9) */
  private showShip(): void {
    this.scene.traverse((obj) => {
      if (obj.userData.__wasVisible !== undefined) {
        obj.visible = obj.userData.__wasVisible;
        delete obj.userData.__wasVisible;
      }
    });

    // Восстановить базовое освещение
    for (const l of this.baseLights) l.visible = true;

    // Восстановить фон и туман корабля
    (this.scene.background as THREE.Color).set(0x0a0a1a);
    (this.scene.fog as THREE.Fog).color.set(0x334455);
    (this.scene.fog as THREE.Fog).near = 60;
    (this.scene.fog as THREE.Fog).far = 180;
  }

  private spawnEnemies(positions: THREE.Vector3[]): void {
    for (const pos of positions) {
      const enemy = new Stormtrooper(this.scene, this.physics);
      enemy.spawn(pos.clone());
      this.enemies.push(enemy);
    }
  }

  private spawnTurrets(positions: THREE.Vector3[]): void {
    for (const pos of positions) {
      const turret = new TurretDroid(this.scene, this.physics);
      turret.spawn(pos.clone());
      this.enemies.push(turret);
    }
  }

  private spawnBosses(positions: THREE.Vector3[]): void {
    for (const pos of positions) {
      const boss = new BossDroid(this.scene, this.physics);
      boss.spawn(pos.clone());
      this.enemies.push(boss);
    }
  }

  private spawnMantis(positions: THREE.Vector3[]): void {
    for (const pos of positions) {
      const mantis = new MantisBot(this.scene, this.physics);
      mantis.spawn(pos.clone());
      this.enemies.push(mantis);
    }
  }

  private static coverMat: THREE.MeshStandardMaterial | null = null;

  private spawnCover(defs: { pos: THREE.Vector3; size: THREE.Vector3 }[]): void {
    if (!Game.coverMat) {
      Game.coverMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.4, metalness: 0.6 });
    }
    for (const d of defs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(d.size.x, d.size.y, d.size.z), Game.coverMat
      );
      mesh.position.copy(d.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.coverMeshes.push(mesh);
      const body = this.physics.createStaticBox(d.pos, d.size);
      this.coverBodies.push(body);
    }
  }

  private clearCover(): void {
    for (const m of this.coverMeshes) this.scene.remove(m);
    for (const b of this.coverBodies) this.physics.removeBody(b);
    this.coverMeshes = [];
    this.coverBodies = [];
  }

  // kept for other levels that still call it
  private async updateLoadingBar(percent: number): Promise<void> {
    this.updateLoadingBarSync(percent);
  }

  private showClickToStart(): Promise<void> {
    return new Promise((resolve) => {
      const btn = document.getElementById('click-to-start');
      if (btn) btn.style.display = 'block';

      const handler = async () => {
        const screen = document.getElementById('loading-screen');
        if (screen) {
          screen.style.opacity = '0';
          setTimeout(() => screen.style.display = 'none', 500);
        }
        window.removeEventListener('click', handler);
        window.removeEventListener('touchend', handler);
        window.removeEventListener('keydown', keyHandler);

        // Заставка после нажатия Enter
        const { playIntro } = await import('../intro');
        await playIntro();

        resolve();
      };
      const keyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          handler();
        }
      };
      window.addEventListener('click', handler);
      window.addEventListener('touchend', handler);
      window.addEventListener('keydown', keyHandler);
    });
  }

  start(): void {
    this.running = true;
    this.clock.start();
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.accumulator += delta;

    // Фиксированный шаг физики
    let steps = 0;
    while (this.accumulator >= FIXED_TIME_STEP && steps < MAX_SUB_STEPS) {
      this.fixedUpdate(FIXED_TIME_STEP);
      this.accumulator -= FIXED_TIME_STEP;
      steps++;
    }

    // Обновление графики (каждый кадр)
    this.update(delta);

    // Обновить время для зерна плёнки
    if (this.colorPass) {
      this.colorPass.uniforms['time'].value = performance.now() * 0.001;
    }

    // Рендер
    this.composer.render();

    // Сброс ввода
    this.input.resetMouseDelta();
  };

  private fixedUpdate(dt: number): void {
    if (this.levelComplete || this.gameOver) return;
    this.physics.update(dt);
    this.player.fixedUpdate(dt);
    for (const enemy of this.enemies) {
      enemy.fixedUpdate(dt, this.player);
    }
  }

  private update(dt: number): void {
    // Анимация пробуждения Гривуса
    if (this.grievousWaking && this.grievousRef) {
      this.grievousWakeTimer += dt;
      const t = Math.min(this.grievousWakeTimer / 3.0, 1);

      this.grievousRef.head.rotation.x = 0.55 * (1 - t);

      for (const eye of this.grievousRef.eyes) {
        const mat = eye.material as THREE.MeshBasicMaterial;
        const r = 0.53 + t * 0.47;
        const g = 0.47 * (1 - t * 0.3);
        const b = 0.07 * (1 - t * 0.7);
        mat.color.setRGB(r, g, b);
      }

      for (let i = 0; i < this.grievousRef.claws.length; i++) {
        const claw = this.grievousRef.claws[i];
        if (i % 2 === 0) {
          claw.rotation.x = -0.2 - t * 0.6;
        } else {
          claw.rotation.x = -0.5 - t * 0.7;
        }
      }

      if (t >= 1) {
        this.grievousWaking = false;
      }
    }

    if (this.levelComplete || this.gameOver) return;

    this.player.update(dt, this.input);
    this.cameraSystem.update(dt);
    this.combat.update(dt, this.player, this.enemies, this.input);
    this.hud.update(this.player, this.combat);
    this.hud.updateMinimap(this.player, this.enemies);

    const pedMeshes = this.pedestrians.map(p => p.mesh);
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, pedMeshes);
    }

    // Анимация прохожих, машин, светофоров
    this.updatePedestrians(dt);
    this.updateMovingCars(dt);
    this.updateTrafficLights();

    // Удаление мёртвых врагов
    this.enemies = this.enemies.filter(e => {
      if (e.isDead) {
        e.dispose(this.scene, this.physics);
        return false;
      }
      return true;
    });

    // Проверка гибели игрока
    if (this.player.isDead && !this.gameOver) {
      this.onGameOver();
      return;
    }

    // Проверка победы на уровне
    if (this.enemies.length === 0 && !this.levelComplete) {
      this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    this.levelComplete = true;
    const hasNextLevel = this.currentLevel + 1 < TOTAL_LEVELS;
    this.hud.showLevelComplete(this.currentLevel + 1, hasNextLevel);

    document.exitPointerLock();

    this.levelTransitionHandler = async () => {
      window.removeEventListener('click', this.levelTransitionHandler!);
      window.removeEventListener('touchend', this.levelTransitionHandler!);
      this.levelTransitionHandler = null;

      if (!hasNextLevel) {
        // Босс побеждён — разблокировать скин R-111
        this.player.bossDefeated = true;
        this.player.sayQuote('«R-111 уничтожен. Его броня теперь моя.»');

        // Финальная заставка + титры
        this.running = false;
        const { playOutro } = await import('../outro');
        await playOutro();
        const { playCredits } = await import('../credits');
        await playCredits();
        // После титров — показываем экран победы
        this.hud.showLevelComplete(this.currentLevel + 1, false);
        return;
      }

      this.startNextLevel();
    };

    setTimeout(() => {
      if (this.levelTransitionHandler) {
        window.addEventListener('click', this.levelTransitionHandler);
        window.addEventListener('touchend', this.levelTransitionHandler);
      }
    }, 500);
  }

  private onGameOver(): void {
    this.gameOver = true;
    this.hud.showGameOver();
    document.exitPointerLock();

    this.levelTransitionHandler = () => {
      window.removeEventListener('click', this.levelTransitionHandler!);
      window.removeEventListener('touchend', this.levelTransitionHandler!);
      this.levelTransitionHandler = null;
      this.restartLevel();
    };

    setTimeout(() => {
      if (this.levelTransitionHandler) {
        window.addEventListener('click', this.levelTransitionHandler);
        window.addEventListener('touchend', this.levelTransitionHandler);
      }
    }, 500);
  }

  private restartLevel(): void {
    // Удалить оставшихся врагов
    for (const e of this.enemies) {
      e.dispose(this.scene, this.physics);
    }
    this.enemies = [];

    // Удалить укрытия корабельных уровней
    this.clearCover();

    // Сброс боевой системы
    this.combat.reset();

    // Если на уровне с другой локацией — удалить её и создать заново
    if (this.currentLevelData) {
      this.unloadCurrentLevel();
    }

    // Загрузить уровень заново (создаст окружение + врагов + сбросит игрока)
    this.showShip();
    this.loadLevel(this.currentLevel);

    this.hud.hideLevelComplete();
    this.gameOver = false;
  }

  private startNextLevel(): void {
    this.currentLevel++;

    // Удалить врагов
    for (const e of this.enemies) {
      e.dispose(this.scene, this.physics);
    }
    this.enemies = [];

    // Удалить укрытия корабельных уровней
    this.clearCover();

    // Сброс боевой системы
    this.combat.reset();

    // Убрать предыдущий уровень (если не корабль)
    if (this.currentLevelData) {
      this.unloadCurrentLevel();
      this.showShip(); // восстановить видимость корабля
    }

    // Загрузить новый уровень
    this.loadLevel(this.currentLevel);

    // Обновить HUD
    this.hud.setLevel(this.currentLevel + 1);
    this.hud.setLevelName(LEVEL_NAMES[this.currentLevel]);
    this.hud.hideLevelComplete();


    // Разблокировать игру
    this.levelComplete = false;
  }

  private getSpawnForShipLevel(): THREE.Vector3 {
    if (this.currentLevel === 11) {
      // Финал — спавн ближе к комнате Гривуса
      return new THREE.Vector3(0, 1.5, -165);
    }
    return new THREE.Vector3(-20, 1.5, -75);
  }

  private updateMovingCars(dt: number): void {
    for (const car of this.movingCars) {
      // Двигаем машину вдоль дороги
      car.mesh.position.x += car.dirX * car.speed * dt;
      car.mesh.position.z += car.dirZ * car.speed * dt;

      // Если уехала за пределы — телепортируем обратно
      const dx = car.mesh.position.x - car.startX;
      const dz = car.mesh.position.z - car.startZ;
      const traveled = Math.abs(dx * car.dirX + dz * car.dirZ);
      if (traveled > car.length) {
        car.mesh.position.x = car.startX;
        car.mesh.position.z = car.startZ;
      }
    }
  }

  private updateTrafficLights(): void {
    // Цикл: 4 сек красный, 1 сек жёлтый, 4 сек зелёный, 1 сек жёлтый
    const cycle = 10;
    const t = (performance.now() / 1000) % cycle;

    for (const tl of this.trafficLights) {
      const shifted = (t + tl.phase * cycle) % cycle;
      const isRed = shifted < 4;
      const isYellow1 = shifted >= 4 && shifted < 5;
      const isGreen = shifted >= 5 && shifted < 9;
      const isYellow2 = shifted >= 9;

      (tl.redMesh.material as THREE.MeshBasicMaterial).color.setHex(
        isRed ? 0xff2222 : 0x331111
      );
      (tl.yellowMesh.material as THREE.MeshBasicMaterial).color.setHex(
        (isYellow1 || isYellow2) ? 0xffcc22 : 0x332200
      );
      (tl.greenMesh.material as THREE.MeshBasicMaterial).color.setHex(
        isGreen ? 0x22ff44 : 0x113311
      );
    }
  }

  /** Генерировать процедурный крик паники */
  private playPanicScream(position: THREE.Vector3): void {
    if (!this.audioListener) return;
    const ctx = this.audioListener.context;
    if (ctx.state === 'suspended') ctx.resume();

    // Расстояние до камеры — не проигрываем далёкие
    const camPos = this.camera.position;
    const dist = camPos.distanceTo(position);
    if (dist > 50) return;
    const volume = Math.max(0, 1 - dist / 50) * 0.25;

    const now = ctx.currentTime;
    const duration = 0.3 + Math.random() * 0.5;

    // Мужской или женский голос
    const isFemale = Math.random() > 0.5;
    const baseFreq = isFemale ? 400 + Math.random() * 300 : 200 + Math.random() * 150;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(volume * 0.6, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Основной тон (крик)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    // Крик поднимается и дрожит
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + duration * 0.2);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + duration);

    // Вибрато (дрожание голоса от страха)
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 6 + Math.random() * 4;
    const vibGain = ctx.createGain();
    vibGain.gain.value = baseFreq * 0.08;
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    // Фильтр (приглушить резкость)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq * 2;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(gain);

    osc.start(now);
    vibrato.start(now);
    osc.stop(now + duration);
    vibrato.stop(now + duration);
  }

  private updatePedestrians(dt: number): void {
    this.pedTime += dt;

    // Случайные крики паники от прохожих
    this.pedScreamTimer += dt;
    if (this.pedScreamTimer > 0.8 && this.pedestrians.length > 0) {
      this.pedScreamTimer = 0;
      // 1-2 случайных прохожих кричат
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const ped = this.pedestrians[Math.floor(Math.random() * this.pedestrians.length)];
        this.playPanicScream(ped.mesh.position);
      }
    }

    for (const ped of this.pedestrians) {
      // Движение по кругу вокруг начальной точки
      const t = this.pedTime * ped.speed * 0.3 + ped.phase;
      const newX = ped.originX + Math.sin(t) * ped.walkRadius;
      const newZ = ped.originZ + Math.cos(t) * ped.walkRadius;

      // Направление движения
      const dx = newX - ped.mesh.position.x;
      const dz = newZ - ped.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.01) {
        // Плавное движение
        ped.mesh.position.x += dx * Math.min(dt * 2, 1);
        ped.mesh.position.z += dz * Math.min(dt * 2, 1);

        // Поворот в направлении движения
        const targetAngle = Math.atan2(dx, dz);
        let angleDiff = targetAngle - ped.mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        ped.mesh.rotation.y += angleDiff * Math.min(dt * 4, 1);
      }

      // Анимация ходьбы (качание конечностей)
      const swing = Math.sin(this.pedTime * ped.speed * 5 + ped.phase) * 0.4;
      if (ped.leftLeg) ped.leftLeg.rotation.x = swing;
      if (ped.rightLeg) ped.rightLeg.rotation.x = -swing;
      if (ped.leftArm) ped.leftArm.rotation.x = -swing * 0.7;
      if (ped.rightArm) ped.rightArm.rotation.x = swing * 0.7;
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
}
