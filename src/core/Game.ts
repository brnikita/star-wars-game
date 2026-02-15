import * as THREE from 'three';
import { InputManager } from './InputManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { K2SO } from '../entities/K2SO';
import { Stormtrooper } from '../entities/Stormtrooper';
import { HUD } from '../ui/HUD';
import { createTestLevel, GrievousRef } from '../levels/TestLevel';
import {
  LevelData,
  createIcePlanet, createJediTemple, createDroidFactory,
  createMountainRestaurant, createJediCemetery, createAbandonedCity,
  createSaturnMine, createDesertPlanet,
} from '../levels/LevelFactory';
import { FIXED_TIME_STEP, MAX_SUB_STEPS } from '../utils/Constants';

const TOTAL_LEVELS = 10;

// Названия уровней для HUD
const LEVEL_NAMES = [
  'Космический корабль',
  'Ледяная планета',
  'Храм джедаев',
  'Завод дроидов',
  'Горный ресторан',
  'Кладбище джедаев',
  'Заброшенный город',
  'Шахта на Сатурне',
  'Пустынная планета',
  'Комната Гривуса',
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
  enemies: Stormtrooper[] = [];
  clock: THREE.Clock;

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
    this.renderer.toneMappingExposure = 2.0;

    // Сцена
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x334455);
    this.scene.fog = new THREE.Fog(0x334455, 60, 180);

    // Камера
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );

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
    await this.updateLoadingBar(20);

    // Создать корабль (уровень 1) — он же содержит комнату Гривуса для уровня 10
    this.grievousRef = createTestLevel(this.scene, this.physics);
    // Базовое освещение для корабля
    this.setupBaseLighting();
    await this.updateLoadingBar(50);

    // Создать игрока (K-2SO)
    this.player = new K2SO(this.scene, this.physics);
    this.player.spawn(new THREE.Vector3(-20, 1.5, -75));
    await this.updateLoadingBar(70);

    // Создать врагов первого уровня
    this.loadLevel(0);
    this.hud.setLevel(1);
    this.hud.setLevelName(LEVEL_NAMES[0]);
    await this.updateLoadingBar(90);

    // Инициализировать камеру
    this.cameraSystem.setTarget(this.player);
    this.cameraSystem.setScene(this.scene);

    // Прекомпиляция шейдеров — убирает задержку на первом кадре
    this.renderer.compile(this.scene, this.camera);
    await this.updateLoadingBar(100);

    // Показать "Нажмите для начала"
    await this.showClickToStart();
  }

  /** Загрузить уровень: создать окружение + заспавнить врагов */
  private loadLevel(levelIndex: number): void {
    // Уровень 0 (корабль) — враги в стартовых позициях
    if (levelIndex === 0) {
      const enemies = [
        new THREE.Vector3(2, 2, -15), new THREE.Vector3(-3, 2, -40),
        new THREE.Vector3(3, 2, -65), new THREE.Vector3(-2, 2, -100),
        new THREE.Vector3(2, 2, -140),
      ];
      this.spawnEnemies(enemies);
      return;
    }

    // Уровень 9 (финал — комната Гривуса) — враги на корабле
    if (levelIndex === 9) {
      const enemies = [
        new THREE.Vector3(8, 2, -185), new THREE.Vector3(-8, 2, -185),
        new THREE.Vector3(5, 2, -195), new THREE.Vector3(-5, 2, -195),
        new THREE.Vector3(10, 2, -200), new THREE.Vector3(-10, 2, -200),
        new THREE.Vector3(3, 2, -205), new THREE.Vector3(-3, 2, -205),
        new THREE.Vector3(12, 2, -180), new THREE.Vector3(-12, 2, -180),
        new THREE.Vector3(8, 2, -188), new THREE.Vector3(-8, 2, -188),
        new THREE.Vector3(3, 2, -8), new THREE.Vector3(-3, 2, -50),
        new THREE.Vector3(2, 2, -100), new THREE.Vector3(-2, 2, -140),
      ];
      this.spawnEnemies(enemies);
      return;
    }

    // Уровни 1-8 — другие локации
    let data: LevelData;
    switch (levelIndex) {
      case 1: data = createIcePlanet(this.scene, this.physics); break;
      case 2: data = createJediTemple(this.scene, this.physics); break;
      case 3: data = createDroidFactory(this.scene, this.physics); break;
      case 4: data = createMountainRestaurant(this.scene, this.physics); break;
      case 5: data = createJediCemetery(this.scene, this.physics); break;
      case 6: data = createAbandonedCity(this.scene, this.physics); break;
      case 7: data = createSaturnMine(this.scene, this.physics); break;
      case 8: data = createDesertPlanet(this.scene, this.physics); break;
      default: return;
    }

    this.currentLevelData = data;

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
    (this.scene.background as THREE.Color).set(0x334455);
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

  private async updateLoadingBar(percent: number): Promise<void> {
    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = `${percent}%`;
    await new Promise(r => setTimeout(r, 0));
  }

  private showClickToStart(): Promise<void> {
    return new Promise((resolve) => {
      const btn = document.getElementById('click-to-start');
      if (btn) btn.style.display = 'block';

      const handler = () => {
        const screen = document.getElementById('loading-screen');
        if (screen) {
          screen.style.opacity = '0';
          setTimeout(() => screen.style.display = 'none', 500);
        }
        window.removeEventListener('click', handler);
        window.removeEventListener('touchend', handler);
        resolve();
      };
      window.addEventListener('click', handler);
      window.addEventListener('touchend', handler);
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

    // Рендер
    this.renderer.render(this.scene, this.camera);

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

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player);
    }

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

    this.levelTransitionHandler = () => {
      if (!hasNextLevel) return;

      window.removeEventListener('click', this.levelTransitionHandler!);
      window.removeEventListener('touchend', this.levelTransitionHandler!);
      this.levelTransitionHandler = null;
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

    // Сброс боевой системы
    this.combat.reset();

    // Если на уровне с другой локацией — удалить её и создать заново
    if (this.currentLevelData) {
      this.unloadCurrentLevel();
    }

    // Загрузить уровень заново (создаст окружение + врагов + сбросит игрока)
    if (this.currentLevel === 0 || this.currentLevel === 9) {
      // Корабль — просто сбросить позицию
      this.player.reset(this.getSpawnForShipLevel());
      this.loadLevel(this.currentLevel);
    } else {
      this.showShip(); // восстановить видимость для hideShip
      this.loadLevel(this.currentLevel);
    }

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

    // Сброс боевой системы
    this.combat.reset();

    // Убрать предыдущий уровень (если не корабль)
    if (this.currentLevelData) {
      this.unloadCurrentLevel();
      this.showShip(); // восстановить видимость корабля
    }

    // Загрузить новый уровень
    if (this.currentLevel === 0 || this.currentLevel === 9) {
      // Возврат на корабль (уровень 10 — финал)
      this.player.reset(this.getSpawnForShipLevel());
      this.loadLevel(this.currentLevel);
    } else {
      this.loadLevel(this.currentLevel);
    }

    // Обновить HUD
    this.hud.setLevel(this.currentLevel + 1);
    this.hud.setLevelName(LEVEL_NAMES[this.currentLevel]);
    this.hud.hideLevelComplete();

    // Уровень 10 (индекс 9) — Гривус просыпается
    if (this.currentLevel === 9 && this.grievousRef) {
      this.grievousWaking = true;
      this.grievousWakeTimer = 0;
    }

    // Разблокировать игру
    this.levelComplete = false;
  }

  private getSpawnForShipLevel(): THREE.Vector3 {
    if (this.currentLevel === 9) {
      // Финал — спавн ближе к комнате Гривуса
      return new THREE.Vector3(0, 1.5, -165);
    }
    return new THREE.Vector3(-20, 1.5, -75);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
