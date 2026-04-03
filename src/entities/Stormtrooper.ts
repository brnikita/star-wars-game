import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { K2SO } from './K2SO';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { Enemy } from './Enemy';
import {
  STORMTROOPER_HEALTH, STORMTROOPER_SPEED,
  STORMTROOPER_DETECT_RANGE, STORMTROOPER_ATTACK_RANGE,
  STORMTROOPER_FIRE_RATE, STORMTROOPER_ACCURACY,
  COLOR_BLASTER_ENEMY,
} from '../utils/Constants';
import { distanceXZ } from '../utils/MathUtils';

type AIState = 'idle' | 'patrol' | 'alert' | 'combat' | 'search';

export class Stormtrooper extends Entity implements Enemy {
  private state: AIState = 'idle';
  private alertTimer = 0;
  private fireTimer = 0;
  wantsToShoot = false;
  shootDirection = new THREE.Vector3();
  shootOrigin = new THREE.Vector3();
  shootDamage = 5;
  shootColor = COLOR_BLASTER_ENEMY;

  // Патрульные точки
  private patrolPoints: THREE.Vector3[] = [];
  private currentPatrolIndex = 0;

  constructor(scene: THREE.Scene, physics: PhysicsSystem) {
    super(scene, physics, STORMTROOPER_HEALTH);
    this.buildModel();
    this.createPhysicsBody();
  }

  private buildModel(): void {
    // Боевой дроид — военный камуфляж (тёмно-зелёный/хаки)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a2a,
      roughness: 0.45,
      metalness: 0.55,
    });

    const bodyDark = new THREE.MeshStandardMaterial({
      color: 0x2e3e22,
      roughness: 0.4,
      metalness: 0.6,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x1e2a18,
      roughness: 0.35,
      metalness: 0.65,
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    const backpackMat = new THREE.MeshStandardMaterial({
      color: 0x445530,
      roughness: 0.5,
      metalness: 0.45,
    });

    // === Голова (характерная для B1 — вытянутая, с антенной) ===
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.78;

    // Основа головы (вытянутая вперёд)
    const headMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, 0.22), bodyMat
    );
    headMain.castShadow = true;
    headGroup.add(headMain);

    // Верхняя часть (чуть шире)
    const headTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, 0.18), bodyMat
    );
    headTop.position.y = 0.08;
    headGroup.add(headTop);

    // «Подбородок» (сужение)
    const headChin = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.14), bodyMat
    );
    headChin.position.set(0, -0.08, 0.02);
    headGroup.add(headChin);

    // Глаза (красные фотодатчики)
    for (const s of [-1, 1]) {
      const eyeSocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.035, 0.02), jointMat
      );
      eyeSocket.position.set(s * 0.05, 0.01, 0.11);
      headGroup.add(eyeSocket);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 6, 6), eyeMat
      );
      eye.position.set(s * 0.05, 0.01, 0.12);
      headGroup.add(eye);
    }

    // Вокализатор (рот — горизонтальная щель)
    const vocoder = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.015, 0.02), jointMat
    );
    vocoder.position.set(0, -0.03, 0.11);
    headGroup.add(vocoder);

    // Антенна на правой стороне
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.18, 5), jointMat
    );
    antenna.position.set(0.1, 0.1, -0.02);
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 5, 5), eyeMat
    );
    antennaTip.position.set(0.1, 0.2, -0.02);
    headGroup.add(antennaTip);

    // === Шея (тонкая, механическая) ===
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.1, 6), jointMat
    );
    neck.position.y = 0.68;
    neck.castShadow = true;

    // === Торс (узкий, дроидный) ===
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.14), bodyMat
    );
    torso.position.y = 0.5;
    torso.castShadow = true;

    // Центральная панель на груди
    const chestPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.18, 0.02), bodyDark
    );
    chestPanel.position.set(0, 0.52, 0.08);

    // Вертикальные рёбра на торсе
    for (const s of [-1, 1]) {
      const torsoRib = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.22, 0.1), bodyDark
      );
      torsoRib.position.set(s * 0.12, 0.5, 0);
    }

    // Поясная секция
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8), jointMat
    );
    waist.position.y = 0.32;

    // Тазовый блок
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.1, 0.12), bodyMat
    );
    pelvis.position.y = 0.25;

    // Рюкзак (блок питания на спине)
    const backpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.2, 0.08), backpackMat
    );
    backpack.position.set(0, 0.52, -0.1);

    const bpAntenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4), jointMat
    );
    bpAntenna.position.set(0.04, 0.68, -0.1);

    // === Руки (тонкие, механические) ===
    const leftArm = this.createDroidArm(bodyMat, jointMat);
    leftArm.position.set(-0.18, 0.58, 0);

    const rightArm = this.createDroidArm(bodyMat, jointMat);
    rightArm.position.set(0.18, 0.58, 0);

    // === Бластер E-5 в правой руке ===
    const blasterMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.25, metalness: 0.85,
    });
    const blasterGlow = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    const blaster = new THREE.Group();
    // Ствол
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), blasterMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.2;
    blaster.add(barrel);
    // Корпус
    const blasterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.05, 0.18), blasterMat
    );
    blasterBody.position.z = 0.02;
    blaster.add(blasterBody);
    // Приклад
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.04, 0.12), blasterMat
    );
    stock.position.z = -0.12;
    blaster.add(stock);
    // Дуло (светящееся)
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.008, 0.03, 6), blasterGlow
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = 0.42;
    blaster.add(muzzle);

    blaster.position.set(0, -0.46, 0.06);
    rightArm.add(blaster);

    // === Ноги (тонкие, обратное колено) ===
    const leftLeg = this.createDroidLeg(bodyMat, jointMat);
    leftLeg.position.set(-0.08, 0.22, 0);

    const rightLeg = this.createDroidLeg(bodyMat, jointMat);
    rightLeg.position.set(0.08, 0.22, 0);

    const modelRoot = new THREE.Group();
    modelRoot.add(
      headGroup, neck, torso, chestPanel, waist, pelvis,
      backpack, bpAntenna,
      leftArm, rightArm,
      leftLeg, rightLeg
    );
    modelRoot.position.y = -0.28;

    this.mesh.add(modelRoot);
  }

  private createDroidArm(bodyMat: THREE.Material, jointMat: THREE.Material): THREE.Group {
    const arm = new THREE.Group();

    // Плечевой сустав
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6), jointMat
    );
    arm.add(shoulder);

    // Верхняя часть руки
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.02, 0.22, 6), bodyMat
    );
    upperArm.position.y = -0.13;
    upperArm.castShadow = true;
    arm.add(upperArm);

    // Локоть
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6), jointMat
    );
    elbow.position.y = -0.25;
    arm.add(elbow);

    // Предплечье
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.018, 0.2, 6), bodyMat
    );
    forearm.position.y = -0.37;
    arm.add(forearm);

    // Кисть (3 пальца)
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.02, 0.04), jointMat
    );
    hand.position.y = -0.48;
    arm.add(hand);

    for (let f = 0; f < 3; f++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.004, 0.04, 4), jointMat
      );
      finger.position.set((f - 1) * 0.014, -0.5, 0);
      arm.add(finger);
    }

    return arm;
  }

  private createDroidLeg(bodyMat: THREE.Material, jointMat: THREE.Material): THREE.Group {
    const leg = new THREE.Group();

    // Тазобедренный сустав
    const hip = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6), jointMat
    );
    leg.add(hip);

    // Бедро
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.025, 0.25, 6), bodyMat
    );
    thigh.position.y = -0.14;
    thigh.castShadow = true;
    leg.add(thigh);

    // Колено
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 6, 6), jointMat
    );
    knee.position.y = -0.28;
    leg.add(knee);

    // Голень
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.022, 0.28, 6), bodyMat
    );
    shin.position.y = -0.43;
    leg.add(shin);

    // Стопа (плоская, широкая)
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.1), bodyMat
    );
    foot.position.set(0, -0.58, 0.02);
    leg.add(foot);

    return leg;
  }

  private createPhysicsBody(): void {
    const radius = 0.25;
    const cylHeight = 0.9;
    const cylinderShape = new CANNON.Cylinder(radius, radius, cylHeight, 8);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);

    this.body = new CANNON.Body({
      mass: 70,
      fixedRotation: true,
      linearDamping: 0.1,
    });

    this.body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
    this.body.addShape(topSphere, new CANNON.Vec3(0, cylHeight / 2, 0));
    this.body.addShape(bottomSphere, new CANNON.Vec3(0, -cylHeight / 2, 0));
    this.physics.addBody(this.body);
  }

  fixedUpdate(dt: number, player: K2SO): void {
    this.syncMeshToBody();
  }

  private pedFireTimer = 0;

  update(dt: number, player?: K2SO, pedestrians?: THREE.Group[]): void {
    if (this.isDead || !player) return;

    this.wantsToShoot = false;
    this.fireTimer -= dt;
    this.pedFireTimer -= dt;

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const dist = distanceXZ(myPos, playerPos);

    const detectMult = player.getDetectMultiplier();
    const detectRange = STORMTROOPER_DETECT_RANGE * detectMult;
    const attackRange = STORMTROOPER_ATTACK_RANGE * detectMult;

    // Проверка линии видимости
    const eyePos = myPos.clone();
    eyePos.y += 0.3;
    const targetPos = playerPos.clone();
    targetPos.y += 0.5;
    const canSee = this.physics.hasLineOfSight(eyePos, targetPos, [this.body, player.body]);

    switch (this.state) {
      case 'idle':
        // Стреляем по ближайшему прохожему
        if (pedestrians && this.pedFireTimer <= 0) {
          this.tryShootPedestrian(myPos, pedestrians);
        }
        if (dist < detectRange && canSee) {
          this.state = 'alert';
          this.alertTimer = 1.0;
        }
        break;

      case 'alert':
        this.alertTimer -= dt;
        this.lookAt(playerPos);
        if (!canSee || (player.isStealth && dist > detectRange)) {
          this.state = 'idle';
          break;
        }
        if (this.alertTimer <= 0) {
          this.state = 'combat';
        }
        break;

      case 'combat':
        this.lookAt(playerPos);

        // Потерять цель если нет видимости или стелс
        if (!canSee) {
          this.state = 'search';
          this.alertTimer = 4;
          break;
        }
        if (player.isStealth && dist > detectRange * 0.8) {
          this.state = 'search';
          this.alertTimer = 3;
          break;
        }

        if (dist > STORMTROOPER_DETECT_RANGE * 1.5) {
          this.state = 'search';
          this.alertTimer = 5;
        } else if (dist <= attackRange) {
          // Стрелять только если есть прямая видимость
          if (this.fireTimer <= 0) {
            this.fireTimer = STORMTROOPER_FIRE_RATE;
            this.wantsToShoot = true;

            this.shootOrigin.copy(myPos);
            this.shootOrigin.y += 0.3;

            const spread = (1 - STORMTROOPER_ACCURACY) * 0.5;
            this.shootDirection
              .subVectors(playerPos, this.shootOrigin)
              .normalize();
            this.shootDirection.x += (Math.random() - 0.5) * spread;
            this.shootDirection.y += (Math.random() - 0.5) * spread * 0.5;
            this.shootDirection.z += (Math.random() - 0.5) * spread;
            this.shootDirection.normalize();
          }

          if (dist > STORMTROOPER_ATTACK_RANGE * 0.5) {
            this.moveToward(playerPos, dt);
          }
        } else {
          this.moveToward(playerPos, dt);
        }
        break;

      case 'search':
        this.alertTimer -= dt;
        // Стреляем по прохожим пока ищем игрока
        if (pedestrians && this.pedFireTimer <= 0) {
          this.tryShootPedestrian(myPos, pedestrians);
        }
        if (dist < detectRange && !player.isStealth && canSee) {
          this.state = 'combat';
        } else if (this.alertTimer <= 0) {
          this.state = 'idle';
        }
        break;
    }

    this.syncMeshToBody();
  }

  /** Найти ближайшего прохожего и стрельнуть по нему */
  private tryShootPedestrian(myPos: THREE.Vector3, pedestrians: THREE.Group[]): void {
    let closest: THREE.Group | null = null;
    let closestDist = 25; // макс. дальность стрельбы по прохожим
    for (const ped of pedestrians) {
      if (!ped.visible) continue;
      const d = distanceXZ(myPos, ped.position);
      if (d < closestDist) {
        closestDist = d;
        closest = ped;
      }
    }
    if (!closest) return;

    this.pedFireTimer = 1.5 + Math.random() * 2.0; // стреляет каждые 1.5-3.5 сек
    this.wantsToShoot = true;
    this.lookAt(closest.position);

    this.shootOrigin.copy(myPos);
    this.shootOrigin.y += 0.3;

    const spread = 0.3;
    const pedTarget = closest.position.clone();
    pedTarget.y += 0.8;
    this.shootDirection.subVectors(pedTarget, this.shootOrigin).normalize();
    this.shootDirection.x += (Math.random() - 0.5) * spread;
    this.shootDirection.z += (Math.random() - 0.5) * spread;
    this.shootDirection.normalize();
  }

  private lookAt(target: THREE.Vector3): void {
    const myPos = this.getPosition();
    const angle = Math.atan2(target.x - myPos.x, target.z - myPos.z);
    this.mesh.rotation.y = angle;
  }

  private moveToward(target: THREE.Vector3, dt: number): void {
    const myPos = this.getPosition();
    const dir = new THREE.Vector3()
      .subVectors(target, myPos)
      .normalize();

    this.body.wakeUp();
    this.body.velocity.x = dir.x * STORMTROOPER_SPEED;
    this.body.velocity.z = dir.z * STORMTROOPER_SPEED;
  }

  protected onDeath(): void {
    // Ragdoll — падение
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.fixedRotation = false;
    this.body.angularDamping = 0.3;
    this.body.applyImpulse(
      new CANNON.Vec3(
        (Math.random() - 0.5) * 5,
        3,
        (Math.random() - 0.5) * 5
      )
    );

    // Кровь — частицы (масляная жидкость дроида)
    const pos = this.getPosition();
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.8 });

    // Брызги крови (зелёная — как у дроидов)
    for (let i = 0; i < 12; i++) {
      const size = 0.03 + Math.random() * 0.06;
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(size, 4, 4), bloodMat
      );
      drop.position.set(
        pos.x + (Math.random() - 0.5) * 0.5,
        pos.y + 0.3 + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.5
      );
      this.scene.add(drop);

      // Анимация падения капель
      const vx = (Math.random() - 0.5) * 3;
      const vy = Math.random() * 3 + 1;
      const vz = (Math.random() - 0.5) * 3;
      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 2) {
          this.scene.remove(drop);
          return;
        }
        drop.position.x += vx * 0.016;
        drop.position.y += (vy - elapsed * 9.8) * 0.016;
        drop.position.z += vz * 0.016;
        (drop.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - elapsed * 0.4);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    // Лужа крови на земле (появляется с задержкой)
    setTimeout(() => {
      const poolMat = new THREE.MeshStandardMaterial({
        color: 0x33aa33, roughness: 0.2, metalness: 0.3,
        transparent: true, opacity: 0.7,
      });
      const pool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.01, 8), poolMat
      );
      pool.position.set(pos.x, 0.01, pos.z);
      pool.scale.set(1, 1, 1);
      this.scene.add(pool);

      // Лужа растёт
      const poolStart = performance.now();
      const growPool = () => {
        const t = (performance.now() - poolStart) / 1000;
        if (t > 3) return;
        const s = Math.min(t * 0.4, 1.0) * (0.5 + Math.random() * 0.01);
        pool.scale.set(s * 80, 1, s * 80);
        pool.material.opacity = Math.min(0.7, t * 0.35);
        requestAnimationFrame(growPool);
      };
      requestAnimationFrame(growPool);
    }, 300);
  }
}
