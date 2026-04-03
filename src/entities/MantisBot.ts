import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { Enemy } from './Enemy';
import { K2SO } from './K2SO';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { distanceXZ } from '../utils/MathUtils';

// Мини-босс Богомол — параметры
const MANTIS_HEALTH = 60;
const MANTIS_SPEED = 7;
const MANTIS_DETECT_RANGE = 50;
const MANTIS_ATTACK_RANGE = 45;
const MANTIS_FIRE_RATE = 0.25;
const MANTIS_ACCURACY = 0.80;
const MANTIS_DAMAGE = 12;

type AIState = 'idle' | 'alert' | 'combat' | 'search';

export class MantisBot extends Entity implements Enemy {
  private state: AIState = 'idle';
  private alertTimer = 0;
  private fireTimer = 0;
  private limbPhase = 0;
  private isMoving = false;
  private frontLeftArm!: THREE.Group;
  private frontRightArm!: THREE.Group;
  private midLeftLeg!: THREE.Group;
  private midRightLeg!: THREE.Group;
  private backLeftLeg!: THREE.Group;
  private backRightLeg!: THREE.Group;
  private headGroup!: THREE.Group;
  private jawLeft!: THREE.Mesh;
  private jawRight!: THREE.Mesh;

  wantsToShoot = false;
  shootDirection = new THREE.Vector3();
  shootOrigin = new THREE.Vector3();
  shootDamage = MANTIS_DAMAGE;
  shootColor = 0xff4400;
  private pedFireTimer = 0;

  constructor(scene: THREE.Scene, physics: PhysicsSystem) {
    super(scene, physics, MANTIS_HEALTH);
    this.buildModel();
    this.createPhysicsBody();
  }

  private buildModel(): void {
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2a1a, metalness: 0.85, roughness: 0.2,
      clearcoat: 0.3, clearcoatRoughness: 0.3,
    });
    const darkArmorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e1a0e, metalness: 0.9, roughness: 0.15,
      clearcoat: 0.4,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, metalness: 0.95, roughness: 0.1,
    });
    const bladeMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a30, metalness: 0.98, roughness: 0.05,
      clearcoat: 0.6,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4.0,
    });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.3,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 0.5,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x111115, roughness: 0.7, metalness: 0.3,
    });

    // === ГОЛОВА (треугольная, как у богомола) ===
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.8, 0.8);

    // Череп (треугольный)
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 4), armorMat);
    skull.rotation.x = Math.PI / 2;
    skull.rotation.z = Math.PI / 4;
    skull.scale.set(0.8, 1.2, 1.0);
    this.headGroup.add(skull);

    // Лицевая пластина
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), darkArmorMat);
    face.position.set(0, -0.02, 0.12);
    this.headGroup.add(face);

    // Глаза (большие, красные, фасеточные)
    for (const s of [-1, 1]) {
      // Основной глаз
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
      eye.position.set(s * 0.12, 0.03, 0.15);
      eye.scale.set(1.2, 0.8, 0.6);
      this.headGroup.add(eye);

      // Фасетки (маленькие линзы)
      for (let f = 0; f < 5; f++) {
        const facet = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), eyeMat);
        facet.position.set(
          s * 0.12 + Math.cos(f * 1.2) * 0.04,
          0.03 + Math.sin(f * 1.2) * 0.03,
          0.2
        );
        this.headGroup.add(facet);
      }

      // Свечение вокруг глаза
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeGlowMat);
      glow.position.set(s * 0.12, 0.03, 0.14);
      this.headGroup.add(glow);
    }

    // Свет от глаз
    const eyeLight = new THREE.PointLight(0xff0000, 3, 8);
    eyeLight.position.set(0, 0.03, 0.2);
    this.headGroup.add(eyeLight);

    // Антенны (2 длинных)
    for (const s of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.6, 4), wireMat);
      antenna.position.set(s * 0.08, 0.15, -0.05);
      antenna.rotation.z = s * 0.3;
      antenna.rotation.x = -0.4;
      this.headGroup.add(antenna);
      // Кончик антенны (светящийся)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), accentMat);
      tip.position.set(s * 0.08 + s * 0.15, 0.42, -0.2);
      this.headGroup.add(tip);
    }

    // Жвалы (челюсти богомола)
    this.jawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.15), bladeMat);
    this.jawLeft.position.set(-0.08, -0.1, 0.18);
    this.jawLeft.rotation.y = 0.3;
    this.headGroup.add(this.jawLeft);

    this.jawRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.15), bladeMat);
    this.jawRight.position.set(0.08, -0.1, 0.18);
    this.jawRight.rotation.y = -0.3;
    this.headGroup.add(this.jawRight);

    this.mesh.add(this.headGroup);

    // === ШЕЯ (длинная, сегментированная) ===
    for (let i = 0; i < 4; i++) {
      const neckSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.15, 6), darkArmorMat);
      neckSeg.position.set(0, 2.4 - i * 0.12, 0.5 - i * 0.15);
      neckSeg.rotation.x = 0.3;
      this.mesh.add(neckSeg);
      // Сустав
      const neckJoint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), jointMat);
      neckJoint.position.set(0, 2.35 - i * 0.12, 0.45 - i * 0.15);
      this.mesh.add(neckJoint);
    }

    // === ГРУДНОЙ ОТДЕЛ (вертикальный, как у богомола) ===
    const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), armorMat);
    thorax.position.set(0, 1.8, 0);
    thorax.castShadow = true;
    this.mesh.add(thorax);

    // Бронепластины на груди
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.05), darkArmorMat);
      plate.position.set(s * 0.12, 1.85, 0.22);
      this.mesh.add(plate);
    }

    // Индикаторы на груди
    for (let i = 0; i < 3; i++) {
      const ind = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), accentMat);
      ind.position.set(-0.18, 1.7 + i * 0.12, 0.22);
      this.mesh.add(ind);
    }

    // === БРЮШКО (длинное, сегментированное, наклонено назад) ===
    const abdomen = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const segW = 0.4 - i * 0.04;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.2, 0.25), i % 2 === 0 ? armorMat : darkArmorMat);
      seg.position.set(0, -i * 0.18, -i * 0.2);
      abdomen.add(seg);
      // Боковые шипы
      if (i < 3) {
        for (const s of [-1, 1]) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), bladeMat);
          spike.position.set(s * (segW / 2 + 0.02), -i * 0.18, -i * 0.2);
          spike.rotation.z = s * Math.PI / 2;
          abdomen.add(spike);
        }
      }
    }
    abdomen.position.set(0, 1.5, -0.2);
    abdomen.rotation.x = 0.4;
    this.mesh.add(abdomen);

    // === ПЕРЕДНИЕ ЛАПЫ-КЛИНКИ (хватательные, как у богомола) ===
    this.frontLeftArm = this.createClawArm(-1);
    this.frontLeftArm.position.set(-0.3, 2.1, 0.15);
    this.mesh.add(this.frontLeftArm);

    this.frontRightArm = this.createClawArm(1);
    this.frontRightArm.position.set(0.3, 2.1, 0.15);
    this.mesh.add(this.frontRightArm);

    // === СРЕДНИЕ НОГИ ===
    this.midLeftLeg = this.createLeg();
    this.midLeftLeg.position.set(-0.3, 1.5, -0.05);
    this.mesh.add(this.midLeftLeg);

    this.midRightLeg = this.createLeg();
    this.midRightLeg.position.set(0.3, 1.5, -0.05);
    this.mesh.add(this.midRightLeg);

    // === ЗАДНИЕ НОГИ (длинные) ===
    this.backLeftLeg = this.createLeg();
    this.backLeftLeg.position.set(-0.25, 1.2, -0.3);
    this.mesh.add(this.backLeftLeg);

    this.backRightLeg = this.createLeg();
    this.backRightLeg.position.set(0.25, 1.2, -0.3);
    this.mesh.add(this.backRightLeg);

    // === БЛАСТЕР (встроен в грудь) ===
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.2, metalness: 0.8 });
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), gunMat);
    gun.position.set(0, 1.75, 0.35);
    gun.rotation.x = Math.PI / 2;
    this.mesh.add(gun);
    // Дуло (светящееся)
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 4, 8), accentMat);
    muzzle.position.set(0, 1.75, 0.5);
    this.mesh.add(muzzle);
  }

  /** Создать хватательную лапу-клинок */
  private createClawArm(side: number): THREE.Group {
    const arm = new THREE.Group();
    const armorMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2a1a, metalness: 0.85, roughness: 0.2 });
    const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a30, metalness: 0.98, roughness: 0.05 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.95, roughness: 0.1 });

    // Плечо
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), jointMat);
    arm.add(shoulder);

    // Верхняя часть (бедро)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.05), armorMat);
    upper.position.y = -0.2;
    arm.add(upper);

    // Локоть (шарнир)
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), jointMat);
    elbow.position.y = -0.42;
    arm.add(elbow);

    // Предплечье
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.04), armorMat);
    forearm.position.set(0, -0.6, 0.05);
    forearm.rotation.x = -0.5;
    arm.add(forearm);

    // Клинок (зазубренный)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.06), bladeMat);
    blade.position.set(0, -0.85, 0.15);
    blade.rotation.x = -0.3;
    arm.add(blade);

    // Шипы на клинке
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 3), bladeMat);
      spike.position.set(side * 0.015, -0.75 - i * 0.08, 0.18);
      spike.rotation.z = side * Math.PI / 4;
      arm.add(spike);
    }

    // Красная полоса на лезвии
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.25, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 0.3 })
    );
    stripe.position.set(0, -0.85, 0.12);
    stripe.rotation.x = -0.3;
    arm.add(stripe);

    return arm;
  }

  /** Создать ходильную ногу (6 сегментов) */
  private createLeg(): THREE.Group {
    const leg = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, metalness: 0.85, roughness: 0.2 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.95, roughness: 0.1 });

    // Бедро (вверх)
    const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.35, 6), armorMat);
    hip.position.set(0, 0.1, 0);
    hip.rotation.z = 0.8;
    leg.add(hip);

    // Колено
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), jointMat);
    knee.position.set(0.2, 0.25, 0);
    leg.add(knee);

    // Голень (вниз)
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.6, 6), armorMat);
    shin.position.set(0.25, -0.15, 0);
    shin.rotation.z = -0.3;
    leg.add(shin);

    // Стопа (острая)
    const foot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.98, roughness: 0.05 })
    );
    foot.position.set(0.28, -0.48, 0);
    foot.rotation.x = Math.PI;
    leg.add(foot);

    return leg;
  }

  private createPhysicsBody(): void {
    const height = 2.0;
    const radius = 0.5;

    const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);

    this.body = new CANNON.Body({
      mass: 80,
      fixedRotation: true,
      linearDamping: 0.1,
    });

    this.body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
    this.body.addShape(topSphere, new CANNON.Vec3(0, height / 2, 0));
    this.body.addShape(bottomSphere, new CANNON.Vec3(0, -height / 2, 0));
    this.physics.addBody(this.body);
  }

  fixedUpdate(_dt: number, _player: K2SO): void {
    this.syncMeshToBody();
  }

  update(dt: number, player?: K2SO, pedestrians?: THREE.Group[]): void {
    if (this.isDead || !player) return;

    this.wantsToShoot = false;
    this.fireTimer -= dt;
    this.pedFireTimer -= dt;

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const dist = distanceXZ(myPos, playerPos);

    const detectMult = player.getDetectMultiplier();
    const detectRange = MANTIS_DETECT_RANGE * detectMult;
    const attackRange = MANTIS_ATTACK_RANGE * detectMult;

    const eyePos = myPos.clone(); eyePos.y += 1.5;
    const targetPos = playerPos.clone(); targetPos.y += 0.5;
    const canSee = this.physics.hasLineOfSight(eyePos, targetPos, [this.body, player.body]);

    switch (this.state) {
      case 'idle':
        // Стреляем по прохожим
        if (pedestrians && this.pedFireTimer <= 0) {
          this.tryShootPedestrian(myPos, pedestrians);
        }
        if (dist < detectRange && canSee) {
          this.state = 'alert';
          this.alertTimer = 0.3;
        }
        break;

      case 'alert':
        this.alertTimer -= dt;
        this.lookAt(playerPos);
        if (!canSee || (player.isStealth && dist > detectRange)) {
          this.state = 'idle'; break;
        }
        if (this.alertTimer <= 0) this.state = 'combat';
        break;

      case 'combat':
        this.lookAt(playerPos);

        if (!canSee) { this.state = 'search'; this.alertTimer = 5; break; }
        if (player.isStealth && dist > detectRange * 0.7) {
          this.state = 'search'; this.alertTimer = 4; break;
        }

        if (dist > MANTIS_DETECT_RANGE * 1.5) {
          this.state = 'search'; this.alertTimer = 5;
        } else if (dist <= attackRange) {
          if (this.fireTimer <= 0) {
            this.fireTimer = MANTIS_FIRE_RATE;
            this.wantsToShoot = true;

            this.shootOrigin.copy(myPos);
            this.shootOrigin.y += 1.5;

            const spread = (1 - MANTIS_ACCURACY) * 0.5;
            this.shootDirection.subVectors(playerPos, this.shootOrigin).normalize();
            this.shootDirection.x += (Math.random() - 0.5) * spread;
            this.shootDirection.y += (Math.random() - 0.5) * spread * 0.5;
            this.shootDirection.z += (Math.random() - 0.5) * spread;
            this.shootDirection.normalize();
          }

          if (dist > MANTIS_ATTACK_RANGE * 0.3) {
            this.moveToward(playerPos, dt);
          }
        } else {
          this.moveToward(playerPos, dt);
        }
        break;

      case 'search':
        this.alertTimer -= dt;
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

    this.animateLimbs(dt);
    this.animateJaws(dt);
    this.syncMeshToBody();
  }

  private tryShootPedestrian(myPos: THREE.Vector3, pedestrians: THREE.Group[]): void {
    let closest: THREE.Group | null = null;
    let closestDist = 35;
    for (const ped of pedestrians) {
      if (!ped.visible) continue;
      const d = distanceXZ(myPos, ped.position);
      if (d < closestDist) { closestDist = d; closest = ped; }
    }
    if (!closest) return;
    this.pedFireTimer = 1.0 + Math.random() * 1.5;
    this.wantsToShoot = true;
    this.lookAt(closest.position);
    this.shootOrigin.copy(myPos);
    this.shootOrigin.y += 1.5;
    const pedTarget = closest.position.clone();
    pedTarget.y += 0.8;
    this.shootDirection.subVectors(pedTarget, this.shootOrigin).normalize();
    this.shootDirection.x += (Math.random() - 0.5) * 0.3;
    this.shootDirection.z += (Math.random() - 0.5) * 0.3;
    this.shootDirection.normalize();
  }

  protected onDeath(): void {
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.fixedRotation = false;
    this.body.angularDamping = 0.3;
    this.body.applyImpulse(
      new CANNON.Vec3((Math.random() - 0.5) * 6, 5, (Math.random() - 0.5) * 6)
    );

    const pos = this.getPosition();

    // Зелёное масло (кровь богомола)
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0x22cc44, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 25; i++) {
      const size = 0.04 + Math.random() * 0.08;
      const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), bloodMat);
      drop.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 1 + Math.random() * 0.8, pos.z + (Math.random() - 0.5) * 0.8);
      this.scene.add(drop);
      const vx = (Math.random() - 0.5) * 6;
      const vy = Math.random() * 5 + 1;
      const vz = (Math.random() - 0.5) * 6;
      const st = performance.now();
      const anim = () => {
        const t = (performance.now() - st) / 1000;
        if (t > 2.5) { this.scene.remove(drop); return; }
        drop.position.x += vx * 0.016;
        drop.position.y += (vy - t * 9.8) * 0.016;
        drop.position.z += vz * 0.016;
        (drop.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 0.36);
        requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }

    // Искры из суставов
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff8844 });
    for (let i = 0; i < 15; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.08), sparkMat);
      spark.position.set(pos.x, pos.y + 1, pos.z);
      spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(spark);
      const svx = (Math.random() - 0.5) * 12;
      const svy = Math.random() * 8;
      const svz = (Math.random() - 0.5) * 12;
      const ss = performance.now();
      const animS = () => {
        const t = (performance.now() - ss) / 1000;
        if (t > 1.0) { this.scene.remove(spark); return; }
        spark.position.x += svx * 0.016;
        spark.position.y += (svy - t * 15) * 0.016;
        spark.position.z += svz * 0.016;
        spark.rotation.x += 20 * 0.016;
        requestAnimationFrame(animS);
      };
      requestAnimationFrame(animS);
    }

    // Лужа зелёного масла
    setTimeout(() => {
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x11aa33, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.7 });
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 10), poolMat);
      pool.position.set(pos.x, 0.01, pos.z);
      this.scene.add(pool);
      const ps = performance.now();
      const growP = () => {
        const t = (performance.now() - ps) / 1000;
        if (t > 4) return;
        const s = Math.min(t * 0.4, 1.5);
        pool.scale.set(s * 100, 1, s * 100);
        pool.material.opacity = Math.min(0.7, t * 0.25);
        requestAnimationFrame(growP);
      };
      requestAnimationFrame(growP);
    }, 400);
  }

  dispose(scene: THREE.Scene, physics: PhysicsSystem): void {
    scene.remove(this.mesh);
    physics.removeBody(this.body);
  }

  private lookAt(target: THREE.Vector3): void {
    const myPos = this.getPosition();
    this.mesh.rotation.y = Math.atan2(target.x - myPos.x, target.z - myPos.z);
  }

  private moveToward(target: THREE.Vector3, _dt: number): void {
    const myPos = this.getPosition();
    const dir = new THREE.Vector3().subVectors(target, myPos).normalize();
    this.body.wakeUp();
    this.body.velocity.x = dir.x * MANTIS_SPEED;
    this.body.velocity.z = dir.z * MANTIS_SPEED;
    this.isMoving = true;
  }

  private animateLimbs(dt: number): void {
    if (this.isMoving) {
      this.limbPhase += dt * 10; // быстрые насекомые ноги
    } else {
      this.limbPhase += dt * 2; // лёгкое покачивание
    }
    const swing = Math.sin(this.limbPhase) * 0.4;

    // Передние лапы-клинки — покачиваются угрожающе
    if (this.frontLeftArm) this.frontLeftArm.rotation.x = -0.3 + swing * 0.3;
    if (this.frontRightArm) this.frontRightArm.rotation.x = -0.3 - swing * 0.3;

    // Средние ноги — ходьба
    if (this.midLeftLeg) this.midLeftLeg.rotation.x = swing;
    if (this.midRightLeg) this.midRightLeg.rotation.x = -swing;

    // Задние ноги — противофаза
    if (this.backLeftLeg) this.backLeftLeg.rotation.x = -swing * 0.8;
    if (this.backRightLeg) this.backRightLeg.rotation.x = swing * 0.8;

    // Голова покачивается
    if (this.headGroup) {
      this.headGroup.rotation.y = Math.sin(this.limbPhase * 0.5) * 0.1;
      this.headGroup.rotation.x = Math.sin(this.limbPhase * 0.3) * 0.05;
    }

    this.isMoving = false;
  }

  private animateJaws(dt: number): void {
    // Жвалы щёлкают в бою
    const jawAngle = this.state === 'combat'
      ? Math.sin(this.limbPhase * 3) * 0.4
      : Math.sin(this.limbPhase * 0.5) * 0.1;

    if (this.jawLeft) this.jawLeft.rotation.y = 0.3 + jawAngle;
    if (this.jawRight) this.jawRight.rotation.y = -0.3 - jawAngle;
  }
}
