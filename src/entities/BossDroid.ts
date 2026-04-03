import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { Enemy } from './Enemy';
import { K2SO } from './K2SO';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { COLOR_BLASTER_ENEMY } from '../utils/Constants';
import { distanceXZ } from '../utils/MathUtils';

// Босс R-111 — параметры
const BOSS_HEALTH = 500;
const BOSS_SPEED = 5;
const BOSS_DETECT_RANGE = 55;
const BOSS_ATTACK_RANGE = 50;
const BOSS_FIRE_RATE = 0.35;
const BOSS_ACCURACY = 0.85;
const BOSS_DAMAGE = 15;

type AIState = 'idle' | 'alert' | 'combat' | 'search';

export class BossDroid extends Entity implements Enemy {
  private state: AIState = 'idle';
  private alertTimer = 0;
  private fireTimer = 0;
  private limbPhase = 0;
  private isMoving = false;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;

  wantsToShoot = false;
  shootDirection = new THREE.Vector3();
  shootOrigin = new THREE.Vector3();
  shootDamage = BOSS_DAMAGE;
  shootColor = 0xff2222;

  constructor(scene: THREE.Scene, physics: PhysicsSystem) {
    super(scene, physics, BOSS_HEALTH);
    this.buildModel();
    this.createPhysicsBody();
  }

  private buildModel(): void {
    // === Реалистичные материалы ===
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1e, metalness: 0.92, roughness: 0.18,
      clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 1.5,
    });
    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x222226, metalness: 0.86, roughness: 0.25,
      clearcoat: 0.25, clearcoatRoughness: 0.45, envMapIntensity: 1.3,
    });
    const jointMat = new THREE.MeshPhysicalMaterial({
      color: 0x08080a, metalness: 0.94, roughness: 0.28,
      clearcoat: 0.3, clearcoatRoughness: 0.3,
    });
    const mechMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e0e12, metalness: 0.97, roughness: 0.1,
      clearcoat: 0.55, clearcoatRoughness: 0.12, envMapIntensity: 2.0,
    });
    const rivetMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a30, metalness: 0.98, roughness: 0.08,
      clearcoat: 0.6, clearcoatRoughness: 0.1,
    });
    const scratchMat = new THREE.MeshStandardMaterial({
      color: 0x4a3520, metalness: 0.4, roughness: 0.7,
    });
    const burnMat = new THREE.MeshStandardMaterial({
      color: 0x1a0800, metalness: 0.3, roughness: 0.9,
    });
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x050506, metalness: 0.5, roughness: 0.9,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x141418, metalness: 0.2, roughness: 0.75,
    });
    // Красные глаза (враждебный)
    const eyeColor = 0xff2200;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor, emissive: eyeColor, emissiveIntensity: 5.0,
    });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.35,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xcc2200, emissiveIntensity: 6.0,
    });
    // Красные акценты
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xcc1111, emissive: 0x660000, emissiveIntensity: 0.5,
    });
    // Индикаторы
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.0,
    });

    // === ГОЛОВА ===
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 18), bodyMat
    );
    head.scale.set(0.88, 0.8, 1.18);
    head.position.y = 0.98;
    head.castShadow = true;

    // Крышка черепа
    const skullTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.03, 16), panelMat
    );
    skullTop.position.set(0, 0.1, -0.02);
    head.add(skullTop);

    // Височные пластины
    for (const s of [-1, 1]) {
      const temple = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.1, 0.14), panelMat
      );
      temple.position.set(s * 0.14, 0.02, -0.02);
      head.add(temple);
    }

    // Лицевая пластина
    const facePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.03), panelMat
    );
    facePlate.position.set(0, -0.01, 0.145);
    head.add(facePlate);

    // Козырёк
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.02, 0.07), bodyMat
    );
    visor.position.set(0, 0.048, 0.14);
    head.add(visor);

    // Скулы
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.08, 0.1), panelMat
      );
      cheek.position.set(s * 0.12, -0.005, 0.08);
      head.add(cheek);
    }

    // Челюсть
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.035, 0.05), panelMat
    );
    jaw.position.set(0, -0.07, 0.12);
    head.add(jaw);

    // Вокодерные щели
    for (let i = 0; i < 4; i++) {
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.003, 0.005), jointMat
      );
      slit.position.set(0, -0.058 - i * 0.008, 0.146);
      head.add(slit);
    }

    // Глазницы
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.04, 0.015), jointMat
      );
      socket.position.set(s * 0.055, 0.012, 0.155);
      head.add(socket);
    }

    // Красные глаза
    const eyeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.018, 0.008), eyeMat
    );
    eyeL.position.set(-0.055, 0.012, 0.17);
    head.add(eyeL);

    const eyeR = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.018, 0.008), eyeMat
    );
    eyeR.position.set(0.055, 0.012, 0.17);
    head.add(eyeR);

    // Радужка/зрачок глаз
    for (const s of [-1, 1]) {
      const iris = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.004), irisMat);
      iris.position.set(s * 0.055, 0.012, 0.175);
      head.add(iris);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), eyeGlowMat);
      glow.position.set(s * 0.055, 0.012, 0.172);
      head.add(glow);
      // Микро-линзы
      for (const ly of [-0.005, 0.005]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.001, 0.002), mechMat);
        lens.position.set(s * 0.055, 0.012 + ly, 0.168);
        head.add(lens);
      }
    }

    // Красный свет от глаз (ярче)
    const eyeLight = new THREE.PointLight(0xff2200, 1.5, 4.0);
    eyeLight.position.set(0, 0.01, 0.22);
    head.add(eyeLight);
    const eyeFill = new THREE.PointLight(0x440000, 0.5, 2.0);
    eyeFill.position.set(0, -0.02, 0.15);
    head.add(eyeFill);

    // Подпалина на голове
    const headBurn = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), burnMat);
    headBurn.position.set(-0.1, 0.04, 0.15); headBurn.rotation.y = -0.3;
    head.add(headBurn);

    // Височные болты
    for (const s of [-1, 1]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.008, 6), rivetMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(s * 0.155, 0.02, 0.02);
      head.add(bolt);
    }

    // Затылочные порты
    for (let i = 0; i < 3; i++) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), mechMat);
      port.rotation.x = Math.PI / 2;
      port.position.set(-0.03 + i * 0.03, 0, -0.2);
      head.add(port);
    }

    // Антенна (длиннее, с базой)
    const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.02, 6), panelMat);
    antBase.position.set(0.14, 0.06, -0.04); head.add(antBase);
    const antRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), mechMat);
    antRod.position.set(0.14, 0.14, -0.04); head.add(antRod);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), eyeMat);
    antTip.position.set(0.14, 0.205, -0.04); head.add(antTip);

    // === ШЕЯ (с гидравликой) ===
    const neckGroup = new THREE.Group();
    neckGroup.position.y = 0.86;
    const neckCore = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 12), mechMat);
    neckGroup.add(neckCore);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 14), bodyMat);
      ring.position.y = -0.055 + i * 0.037;
      ring.rotation.x = Math.PI / 2;
      neckGroup.add(ring);
    }
    // 4 гидравлические трубки
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6), wireMat);
      tube.position.set(Math.cos(a) * 0.036, 0, Math.sin(a) * 0.036);
      neckGroup.add(tube);
    }

    // === ТОРС ===
    const shoulderFrame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.2), bodyMat);
    shoulderFrame.position.y = 0.74;
    shoulderFrame.castShadow = true;

    // Серво-моторы в плечах
    for (const s of [-1, 1]) {
      const servo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12), mechMat);
      servo.rotation.z = Math.PI / 2;
      servo.position.set(s * 0.3, 0.74, 0);
      shoulderFrame.parent?.add(servo);
    }

    const chestMain = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.24), bodyMat);
    chestMain.position.y = 0.58;
    chestMain.castShadow = true;

    // Нагрудная панель
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), panelMat);
    chestPlate.position.set(0, 0.58, 0.125);

    // Красные имперские полосы
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.004), accentMat);
    stripe1.position.set(0, 0.68, 0.13);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.004), accentMat);
    stripe2.position.set(0, 0.48, 0.13);

    // Имперский символ (ярче)
    const impCircle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), accentMat);
    impCircle.position.set(0, 0.58, 0.135); impCircle.rotation.x = Math.PI / 2;
    const impDot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), accentMat);
    impDot.position.set(0, 0.58, 0.135);

    // Красные индикаторы на груди
    for (let i = 0; i < 3; i++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.004), indicatorMat);
      led.position.set(0.12, 0.55 + i * 0.04, 0.13);
    }

    // Заклёпки на груди
    const rivetGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.004, 6);
    for (const x of [-0.08, 0.08]) {
      for (const y of [0.48, 0.68]) {
        const r = new THREE.Mesh(rivetGeo, rivetMat);
        r.position.set(x, y, 0.13); r.rotation.x = Math.PI / 2;
        chestPlate.parent?.add(r);
      }
    }

    // Швы
    const seamTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.002, 0.25), seamMat);
    seamTop.position.set(0, 0.69, 0);
    const seamMid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.002, 0.19), seamMat);
    seamMid.position.set(0, 0.46, 0);

    // Царапины на груди
    const scratch1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.003), scratchMat);
    scratch1.position.set(0.04, 0.64, 0.13); scratch1.rotation.z = 0.4;
    const scratch2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.003), scratchMat);
    scratch2.position.set(-0.06, 0.52, 0.13); scratch2.rotation.z = -0.3;

    // Спинная панель + провода
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.01), panelMat);
    backPlate.position.set(0, 0.58, -0.125);

    const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), bodyMat);
    abdomen.position.y = 0.39; abdomen.castShadow = true;

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.14), panelMat);
    waist.position.y = 0.28;

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), bodyMat);
    pelvis.position.y = 0.22;

    // Спинной модуль питания
    const powerPack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), panelMat);
    powerPack.position.set(0, 0.56, -0.15);
    // Кабельный жгут
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.2, 6), wireMat);
    cable.position.set(0, 0.44, -0.14);

    // === РУКИ ===
    this.leftArm = this.buildArm(bodyMat, panelMat, jointMat, mechMat, 1);
    this.leftArm.position.set(-0.33, 0.72, 0);

    this.rightArm = this.buildArm(bodyMat, panelMat, jointMat, mechMat, -1);
    this.rightArm.position.set(0.33, 0.72, 0);

    // Бластер в правой руке
    this.addBlaster(this.rightArm);

    // === НОГИ ===
    this.leftLeg = this.buildLeg(bodyMat, panelMat, jointMat, mechMat, 1);
    this.leftLeg.position.set(-0.1, 0.17, 0);

    this.rightLeg = this.buildLeg(bodyMat, panelMat, jointMat, mechMat, -1);
    this.rightLeg.position.set(0.1, 0.17, 0);

    // === СБОРКА ===
    const modelRoot = new THREE.Group();
    modelRoot.add(
      head, neckGroup,
      shoulderFrame, chestMain, chestPlate, backPlate,
      stripe1, stripe2, impCircle, impDot,
      seamTop, seamMid, scratch1, scratch2,
      abdomen, waist, pelvis, powerPack, cable,
      this.leftArm, this.rightArm,
      this.leftLeg, this.rightLeg,
    );
    modelRoot.position.y = -0.34;
    this.mesh.add(modelRoot);
  }

  private buildArm(bodyMat: THREE.Material, panelMat: THREE.Material, jointMat: THREE.Material, mechMat: THREE.Material, side: number): THREE.Group {
    const arm = new THREE.Group();
    arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), panelMat));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), mechMat);
    ball.position.y = -0.035; arm.add(ball);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.26, 12), bodyMat);
    upper.position.y = -0.19; upper.castShadow = true; arm.add(upper);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), mechMat);
    elbow.position.y = -0.34; arm.add(elbow);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.3, 12), bodyMat);
    forearm.position.y = -0.52; forearm.castShadow = true; arm.add(forearm);
    const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 12), mechMat);
    wrist.position.y = -0.69; wrist.rotation.x = Math.PI / 2; arm.add(wrist);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.05, 0.025), bodyMat);
    palm.position.y = -0.73; arm.add(palm);
    for (let f = -1; f <= 1; f++) {
      const ph1 = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.03, 0.013), bodyMat);
      ph1.position.set(f * 0.015, -0.775, 0); arm.add(ph1);
      const ph2 = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.025, 0.011), bodyMat);
      ph2.position.set(f * 0.015, -0.81, 0); arm.add(ph2);
    }
    return arm;
  }

  private buildLeg(bodyMat: THREE.Material, panelMat: THREE.Material, jointMat: THREE.Material, mechMat: THREE.Material, side: number): THREE.Group {
    const leg = new THREE.Group();
    leg.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), panelMat));
    const hip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), mechMat);
    hip.position.y = -0.02; leg.add(hip);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.035, 0.36, 12), bodyMat);
    thigh.position.y = -0.23; thigh.castShadow = true; leg.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), mechMat);
    knee.position.y = -0.43; leg.add(knee);
    const kneeCap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), panelMat);
    kneeCap.position.set(0, -0.43, 0.035); leg.add(kneeCap);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.38, 12), bodyMat);
    shin.position.y = -0.64; shin.castShadow = true; leg.add(shin);
    const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12), mechMat);
    ankle.position.y = -0.85; ankle.rotation.x = Math.PI / 2; leg.add(ankle);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.12), bodyMat);
    foot.position.set(0, -0.88, 0.02); foot.castShadow = true; leg.add(foot);
    for (const t of [-1, 1]) {
      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.04), panelMat);
      toe.position.set(t * 0.02, -0.886, 0.1); leg.add(toe);
    }
    return leg;
  }

  private addBlaster(arm: THREE.Group): void {
    const blasterGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.25 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), metalMat);
    body.castShadow = true; blasterGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.15, 6), metalMat);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.005, 0.25);
    blasterGroup.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 6), glowMat);
    muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.005, 0.325);
    blasterGroup.add(muzzle);

    blasterGroup.position.set(0, -0.66, 0.12);
    blasterGroup.rotation.x = -Math.PI / 2;
    arm.add(blasterGroup);
  }

  private createPhysicsBody(): void {
    const radius = 0.3;
    const height = 2.1 - radius * 2;
    const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);

    this.body = new CANNON.Body({
      mass: 90,
      fixedRotation: true,
      linearDamping: 0.1,
    });

    this.body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
    this.body.addShape(topSphere, new CANNON.Vec3(0, height / 2, 0));
    this.body.addShape(bottomSphere, new CANNON.Vec3(0, -height / 2, 0));
    this.physics.addBody(this.body);
  }

  fixedUpdate(dt: number, player: K2SO): void {
    this.syncMeshToBody();
  }

  update(dt: number, player?: K2SO, _pedestrians?: THREE.Group[]): void {
    if (this.isDead || !player) return;

    this.wantsToShoot = false;
    this.fireTimer -= dt;

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const dist = distanceXZ(myPos, playerPos);

    const detectMult = player.getDetectMultiplier();
    const detectRange = BOSS_DETECT_RANGE * detectMult;
    const attackRange = BOSS_ATTACK_RANGE * detectMult;

    const eyePos = myPos.clone(); eyePos.y += 0.5;
    const targetPos = playerPos.clone(); targetPos.y += 0.5;
    const canSee = this.physics.hasLineOfSight(eyePos, targetPos, [this.body, player.body]);

    switch (this.state) {
      case 'idle':
        if (dist < detectRange && canSee) {
          this.state = 'alert';
          this.alertTimer = 0.5;
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

        if (!canSee) { this.state = 'search'; this.alertTimer = 6; break; }
        if (player.isStealth && dist > detectRange * 0.7) {
          this.state = 'search'; this.alertTimer = 4; break;
        }

        if (dist > BOSS_DETECT_RANGE * 1.5) {
          this.state = 'search'; this.alertTimer = 5;
        } else if (dist <= attackRange) {
          if (this.fireTimer <= 0) {
            this.fireTimer = BOSS_FIRE_RATE;
            this.wantsToShoot = true;

            this.shootOrigin.copy(myPos);
            this.shootOrigin.y += 0.5;

            const spread = (1 - BOSS_ACCURACY) * 0.5;
            this.shootDirection.subVectors(playerPos, this.shootOrigin).normalize();
            this.shootDirection.x += (Math.random() - 0.5) * spread;
            this.shootDirection.y += (Math.random() - 0.5) * spread * 0.5;
            this.shootDirection.z += (Math.random() - 0.5) * spread;
            this.shootDirection.normalize();
          }

          if (dist > BOSS_ATTACK_RANGE * 0.4) {
            this.moveToward(playerPos, dt);
          }
        } else {
          this.moveToward(playerPos, dt);
        }
        break;

      case 'search':
        this.alertTimer -= dt;
        if (dist < detectRange && !player.isStealth && canSee) {
          this.state = 'combat';
        } else if (this.alertTimer <= 0) {
          this.state = 'idle';
        }
        break;
    }

    this.animateLimbs(dt);
    this.syncMeshToBody();
  }

  private lookAt(target: THREE.Vector3): void {
    const myPos = this.getPosition();
    this.mesh.rotation.y = Math.atan2(target.x - myPos.x, target.z - myPos.z);
  }

  private moveToward(target: THREE.Vector3, dt: number): void {
    const myPos = this.getPosition();
    const dir = new THREE.Vector3().subVectors(target, myPos).normalize();
    this.body.wakeUp();
    this.body.velocity.x = dir.x * BOSS_SPEED;
    this.body.velocity.z = dir.z * BOSS_SPEED;
    this.isMoving = true;
  }

  private animateLimbs(dt: number): void {
    if (this.isMoving) {
      this.limbPhase += dt * 8;
    } else {
      this.limbPhase *= 0.9;
    }
    this.isMoving = false;

    const swing = Math.sin(this.limbPhase) * 0.5;

    // Руки качаются в противофазе с ногами
    this.leftArm.rotation.x = -swing;
    this.rightArm.rotation.x = swing * 0.5; // правая рука с бластером — меньше амплитуда
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
  }

  protected onDeath(): void {
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.fixedRotation = false;
    this.body.angularDamping = 0.3;
    this.body.applyImpulse(
      new CANNON.Vec3(
        (Math.random() - 0.5) * 5,
        4,
        (Math.random() - 0.5) * 5
      )
    );

    // Босс — много крови (красная, как масло) + искры
    const pos = this.getPosition();

    // Красные брызги (масло босса)
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 20; i++) {
      const size = 0.04 + Math.random() * 0.08;
      const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), bloodMat);
      drop.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + 0.5 + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.6
      );
      this.scene.add(drop);
      const vx = (Math.random() - 0.5) * 5;
      const vy = Math.random() * 4 + 1;
      const vz = (Math.random() - 0.5) * 5;
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

    // Искры (электрические разряды)
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x88ccff });
    for (let i = 0; i < 10; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.08), sparkMat);
      spark.position.copy(pos);
      spark.position.y += 0.4;
      spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(spark);
      const svx = (Math.random() - 0.5) * 10;
      const svy = Math.random() * 6;
      const svz = (Math.random() - 0.5) * 10;
      const ss = performance.now();
      const animS = () => {
        const t = (performance.now() - ss) / 1000;
        if (t > 0.8) { this.scene.remove(spark); return; }
        spark.position.x += svx * 0.016;
        spark.position.y += (svy - t * 15) * 0.016;
        spark.position.z += svz * 0.016;
        spark.rotation.x += 20 * 0.016;
        requestAnimationFrame(animS);
      };
      requestAnimationFrame(animS);
    }

    // Большая лужа красной крови
    setTimeout(() => {
      const poolMat = new THREE.MeshStandardMaterial({
        color: 0xaa1111, roughness: 0.15, metalness: 0.4,
        transparent: true, opacity: 0.8,
      });
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 10), poolMat);
      pool.position.set(pos.x, 0.01, pos.z);
      this.scene.add(pool);
      const ps = performance.now();
      const growP = () => {
        const t = (performance.now() - ps) / 1000;
        if (t > 4) return;
        const s = Math.min(t * 0.35, 1.2);
        pool.scale.set(s * 100, 1, s * 100);
        pool.material.opacity = Math.min(0.8, t * 0.3);
        requestAnimationFrame(growP);
      };
      requestAnimationFrame(growP);
    }, 400);
  }
}
