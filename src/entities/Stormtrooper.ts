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
    // Боевой дроид — бежевый металл
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc4a870,
      roughness: 0.35,
      metalness: 0.6,
    });

    const bodyDark = new THREE.MeshStandardMaterial({
      color: 0xb09060,
      roughness: 0.3,
      metalness: 0.65,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x8a7550,
      roughness: 0.3,
      metalness: 0.7,
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });

    const backpackMat = new THREE.MeshStandardMaterial({
      color: 0xa08858,
      roughness: 0.4,
      metalness: 0.5,
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
      color: 0x2a2a2a, roughness: 0.3, metalness: 0.8,
    });
    const blasterGlow = new THREE.MeshBasicMaterial({ color: 0xff4422 });

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

  update(dt: number, player?: K2SO): void {
    if (this.isDead || !player) return;

    this.wantsToShoot = false;
    this.fireTimer -= dt;

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const dist = distanceXZ(myPos, playerPos);

    switch (this.state) {
      case 'idle':
        if (dist < STORMTROOPER_DETECT_RANGE) {
          this.state = 'alert';
          this.alertTimer = 1.0;
        }
        break;

      case 'alert':
        this.alertTimer -= dt;
        this.lookAt(playerPos);
        if (this.alertTimer <= 0) {
          this.state = 'combat';
        }
        break;

      case 'combat':
        this.lookAt(playerPos);

        if (dist > STORMTROOPER_DETECT_RANGE * 1.5) {
          this.state = 'search';
          this.alertTimer = 5;
        } else if (dist <= STORMTROOPER_ATTACK_RANGE) {
          // Стрелять, если в зоне атаки
          if (this.fireTimer <= 0) {
            this.fireTimer = STORMTROOPER_FIRE_RATE;
            this.wantsToShoot = true;

            // Точка выстрела — позиция дроида на уровне груди
            this.shootOrigin.copy(myPos);
            this.shootOrigin.y += 0.3;

            // Направление к игроку с неточностью
            const spread = (1 - STORMTROOPER_ACCURACY) * 0.5;
            this.shootDirection
              .subVectors(playerPos, this.shootOrigin)
              .normalize();
            this.shootDirection.x += (Math.random() - 0.5) * spread;
            this.shootDirection.y += (Math.random() - 0.5) * spread * 0.5;
            this.shootDirection.z += (Math.random() - 0.5) * spread;
            this.shootDirection.normalize();
          }

          // Подойти ближе, если далеко
          if (dist > STORMTROOPER_ATTACK_RANGE * 0.5) {
            this.moveToward(playerPos, dt);
          }
        } else {
          this.moveToward(playerPos, dt);
        }
        break;

      case 'search':
        this.alertTimer -= dt;
        if (dist < STORMTROOPER_DETECT_RANGE) {
          this.state = 'combat';
        } else if (this.alertTimer <= 0) {
          this.state = 'idle';
        }
        break;
    }

    this.syncMeshToBody();
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
  }
}
