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

  private shieldRegenTimer = 0;
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
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLOR_K2SO_BODY,
      metalness: 0.8,
      roughness: 0.35,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3,
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: COLOR_K2SO_EYES,
      emissive: COLOR_K2SO_EYES,
      emissiveIntensity: 2,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      metalness: 0.9,
      roughness: 0.4,
    });

    // === ГОЛОВА ===
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      darkMat
    );
    this.head.scale.set(1, 0.85, 0.95);
    this.head.position.y = 0.95;
    this.head.castShadow = true;

    // Лицевая панель (передняя часть головы)
    const facePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.12, 0.06),
      darkMat
    );
    facePlate.position.set(0, -0.03, 0.14);
    this.head.add(facePlate);

    // Глаза
    this.eyeLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      eyeMat
    );
    this.eyeLeft.position.set(-0.06, 0.02, 0.17);
    this.head.add(this.eyeLeft);

    this.eyeRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      eyeMat
    );
    this.eyeRight.position.set(0.06, 0.02, 0.17);
    this.head.add(this.eyeRight);

    // Свечение глаз
    const eyeLight = new THREE.PointLight(0xffffff, 0.5, 2);
    eyeLight.position.set(0, 0.02, 0.2);
    this.head.add(eyeLight);

    // Шея
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8),
      jointMat
    );
    neck.position.y = 0.82;
    neck.castShadow = true;

    // === ТОРС ===
    // Верхняя часть (грудь) — широкая
    const chestGeom = new THREE.BoxGeometry(0.52, 0.35, 0.25);
    const chest = new THREE.Mesh(chestGeom, bodyMat);
    chest.position.y = 0.6;
    chest.castShadow = true;

    // Нагрудная панель
    const chestPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.02),
      darkMat
    );
    chestPanel.position.set(0, 0.64, 0.135);

    // Нижняя часть торса (сужается)
    const abdomen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.18),
      bodyMat
    );
    abdomen.position.y = 0.35;
    abdomen.castShadow = true;

    // Пояс
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8),
      jointMat
    );
    waist.position.y = 0.22;

    // === ЦАРАПИНЫ И ПОВРЕЖДЕНИЯ ===
    const scratchMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      metalness: 0.4,
      roughness: 0.7,
    });

    // Царапины на груди (диагональные полосы)
    const scratchChest1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.012, 0.005),
      scratchMat
    );
    scratchChest1.position.set(0.05, 0.66, 0.131);
    scratchChest1.rotation.z = 0.5;

    const scratchChest2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.01, 0.005),
      scratchMat
    );
    scratchChest2.position.set(0.08, 0.6, 0.131);
    scratchChest2.rotation.z = 0.4;

    const scratchChest3 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.01, 0.005),
      scratchMat
    );
    scratchChest3.position.set(-0.12, 0.55, 0.131);
    scratchChest3.rotation.z = -0.3;

    // Царапина на животе
    const scratchAbdomen = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.008, 0.005),
      scratchMat
    );
    scratchAbdomen.position.set(-0.02, 0.38, 0.095);
    scratchAbdomen.rotation.z = -0.6;

    // Вмятина на плече (левое) — небольшой тёмный диск
    const dentShoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.005, 8),
      scratchMat
    );
    dentShoulder.position.set(-0.27, 0.68, 0.08);
    dentShoulder.rotation.x = Math.PI / 2;

    // Следы от бластера на голове (подпалина)
    const burnMat = new THREE.MeshStandardMaterial({
      color: 0x221100,
      metalness: 0.3,
      roughness: 0.9,
    });

    const blastMark = new THREE.Mesh(
      new THREE.CircleGeometry(0.025, 8),
      burnMat
    );
    blastMark.position.set(0.1, 0.97, 0.14);
    blastMark.rotation.y = 0.3;

    // Царапины на спине (задняя сторона груди)
    const scratchBack1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.01, 0.005),
      scratchMat
    );
    scratchBack1.position.set(-0.06, 0.65, -0.131);
    scratchBack1.rotation.z = 0.7;

    const scratchBack2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.008, 0.005),
      scratchMat
    );
    scratchBack2.position.set(0.04, 0.56, -0.131);
    scratchBack2.rotation.z = -0.4;

    // Царапины на правом боку груди
    const scratchSideR1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.012, 0.14),
      scratchMat
    );
    scratchSideR1.position.set(0.265, 0.62, 0.02);
    scratchSideR1.rotation.y = 0.3;

    const scratchSideR2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.01, 0.1),
      scratchMat
    );
    scratchSideR2.position.set(0.265, 0.55, -0.03);
    scratchSideR2.rotation.y = -0.2;

    // Царапины на левом боку
    const scratchSideL = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.01, 0.16),
      scratchMat
    );
    scratchSideL.position.set(-0.265, 0.58, 0.0);
    scratchSideL.rotation.y = 0.5;

    // Подпалина от бластера на животе
    const blastAbdomen = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 8),
      burnMat
    );
    blastAbdomen.position.set(0.08, 0.34, 0.095);

    // Вмятина на правом плече
    const dentShoulderR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.005, 8),
      scratchMat
    );
    dentShoulderR.position.set(0.27, 0.62, -0.04);
    dentShoulderR.rotation.x = Math.PI / 2;

    // Подпалина сбоку головы
    const blastHead2 = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 8),
      burnMat
    );
    blastHead2.position.set(-0.15, 0.96, 0.04);
    blastHead2.rotation.y = -Math.PI / 2;

    // === РУКИ ===
    this.leftArm = this.createArm(bodyMat, jointMat, 1);
    this.leftArm.position.set(-0.32, 0.65, 0);

    this.rightArm = this.createArm(bodyMat, jointMat, -1);
    this.rightArm.position.set(0.32, 0.65, 0);

    // === НОГИ ===
    this.leftLeg = this.createLeg(bodyMat, jointMat, 1);
    this.leftLeg.position.set(-0.1, 0.17, 0);

    this.rightLeg = this.createLeg(bodyMat, jointMat, -1);
    this.rightLeg.position.set(0.1, 0.17, 0);

    // Собираем модель
    // Смещаем всё вниз, чтобы центр тела был на уровне физического тела
    const modelRoot = new THREE.Group();
    modelRoot.add(
      this.head, neck, chest, chestPanel, abdomen, waist,
      this.leftArm, this.rightArm,
      this.leftLeg, this.rightLeg,
      // Царапины на груди
      scratchChest1, scratchChest2, scratchChest3,
      // Царапины на спине
      scratchBack1, scratchBack2,
      // Царапины на боках
      scratchSideR1, scratchSideR2, scratchSideL,
      // Царапина на животе + подпалина
      scratchAbdomen, blastAbdomen,
      // Вмятины на плечах
      dentShoulder, dentShoulderR,
      // Следы от бластера на голове
      blastMark, blastHead2
    );
    // Смещение модели: стопы (y=0.17-0.86-0.02 = -0.71 в modelRoot)
    // должны совпадать с низом капсулы (-1.05 от центра тела)
    // => modelRoot.y = -1.05 + 0.71 = -0.34
    modelRoot.position.y = -0.34;

    this.mesh.add(modelRoot);
  }

  private createArm(mat: THREE.Material, jointMat: THREE.Material, side: number): THREE.Group {
    const arm = new THREE.Group();

    // Плечевой сустав
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      jointMat
    );
    arm.add(shoulder);

    // Плечо (верхняя часть руки)
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.3, 8),
      mat
    );
    upperArm.position.y = -0.18;
    upperArm.castShadow = true;
    arm.add(upperArm);

    // Локтевой сустав
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      jointMat
    );
    elbow.position.y = -0.34;
    arm.add(elbow);

    // Предплечье
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.03, 0.28, 8),
      mat
    );
    forearm.position.y = -0.5;
    forearm.castShadow = true;
    arm.add(forearm);

    // Кисть
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.04),
      mat
    );
    hand.position.y = -0.66;
    hand.castShadow = true;
    arm.add(hand);

    // Царапины на руке
    const armScratchMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e, metalness: 0.4, roughness: 0.7,
    });
    const armScratch = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.1, 0.01),
      armScratchMat
    );
    armScratch.position.set(side * 0.04, -0.2, 0.01);
    armScratch.rotation.y = 0.3 * side;
    arm.add(armScratch);

    const armScratch2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.08, 0.008),
      armScratchMat
    );
    armScratch2.position.set(side * 0.035, -0.48, -0.01);
    armScratch2.rotation.y = -0.4 * side;
    arm.add(armScratch2);

    return arm;
  }

  private createLeg(mat: THREE.Material, jointMat: THREE.Material, side: number): THREE.Group {
    const leg = new THREE.Group();

    // Тазобедренный сустав
    const hip = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      jointMat
    );
    leg.add(hip);

    // Бедро
    const upperLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.04, 0.38, 8),
      mat
    );
    upperLeg.position.y = -0.22;
    upperLeg.castShadow = true;
    leg.add(upperLeg);

    // Коленный сустав
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      jointMat
    );
    knee.position.y = -0.42;
    leg.add(knee);

    // Голень
    const lowerLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.4, 8),
      mat
    );
    lowerLeg.position.y = -0.64;
    lowerLeg.castShadow = true;
    leg.add(lowerLeg);

    // Стопа
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.14),
      mat
    );
    foot.position.set(0, -0.86, 0.03);
    foot.castShadow = true;
    leg.add(foot);

    // Царапины на ноге
    const legScratchMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e, metalness: 0.4, roughness: 0.7,
    });
    const legScratch = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.12, 0.01),
      legScratchMat
    );
    legScratch.position.set(side * 0.055, -0.25, 0.02);
    legScratch.rotation.y = 0.2 * side;
    leg.add(legScratch);

    const legScratch2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.15, 0.008),
      legScratchMat
    );
    legScratch2.position.set(side * 0.04, -0.6, -0.015);
    legScratch2.rotation.y = -0.3 * side;
    leg.add(legScratch2);

    // Подпалина на бедре (только на левой ноге)
    if (side === 1) {
      const legBurn = new THREE.Mesh(
        new THREE.CircleGeometry(0.018, 6),
        new THREE.MeshStandardMaterial({ color: 0x221100, metalness: 0.3, roughness: 0.9 })
      );
      legBurn.position.set(0.055, -0.18, 0.02);
      legBurn.rotation.y = Math.PI / 4;
      leg.add(legBurn);
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
    this.handleCrouch(dt, input);
    this.handleMovement(dt, input);
    this.handleReloading(dt);
    this.regenerateShield(dt);
    this.regenerateHealth(dt);
    this.animateLimbs(dt, input);
    this.syncMeshToBody();

    // Поворот модели в сторону камеры при движении
    if (this.moveDirection.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      const currentAngle = this.mesh.rotation.y;
      let diff = targetAngle - currentAngle;
      // Нормализация угла
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(dt * 10, 1);
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
    if (this.isCrouching) speed *= K2SO_CROUCH_SPEED_MULT;

    // Пробуждаем тело и задаём скорость
    this.body.wakeUp();
    this.body.velocity.x = this.moveDirection.x * speed;
    this.body.velocity.z = this.moveDirection.z * speed;

    // Прыжок
    if (input.jump && this.isGrounded) {
      this.body.velocity.y = K2SO_JUMP_FORCE;
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
  }

  startReload(): void {
    if (!this.isReloading && this.ammo < this.maxAmmo) {
      this.isReloading = true;
      this.reloadTimer = 1.5;
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
    this.isDead = false;
    this.body.position.set(position.x, position.y, position.z);
    this.body.velocity.set(0, 0, 0);
    this.mesh.position.copy(position);
  }

  protected onDeath(): void {
    // TODO: анимация гибели, ragdoll
  }
}
