import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { Enemy } from './Enemy';
import { K2SO } from './K2SO';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import {
  TURRET_HEALTH, TURRET_SPEED,
  TURRET_DETECT_RANGE, TURRET_ATTACK_RANGE,
  TURRET_FIRE_RATE, TURRET_ACCURACY, TURRET_DAMAGE,
  COLOR_BLASTER_TURRET,
} from '../utils/Constants';
import { distanceXZ } from '../utils/MathUtils';

type AIState = 'idle' | 'alert' | 'combat';

export class TurretDroid extends Entity implements Enemy {
  private state: AIState = 'idle';
  private alertTimer = 0;
  private fireTimer = 0;
  private turretHead!: THREE.Group;

  wantsToShoot = false;
  shootDirection = new THREE.Vector3();
  shootOrigin = new THREE.Vector3();
  shootDamage = TURRET_DAMAGE;
  shootColor = COLOR_BLASTER_TURRET;

  constructor(scene: THREE.Scene, physics: PhysicsSystem) {
    super(scene, physics, TURRET_HEALTH);
    this.buildModel();
    this.createPhysicsBody();
  }

  private buildModel(): void {
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a40,
      roughness: 0.4,
      metalness: 0.7,
    });

    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a50,
      roughness: 0.35,
      metalness: 0.65,
    });

    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x555560,
      roughness: 0.3,
      metalness: 0.7,
    });

    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const glowMat = new THREE.MeshBasicMaterial({ color: COLOR_BLASTER_TURRET });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    // === Tracked base ===
    const baseGroup = new THREE.Group();

    // Left tread
    const leftTread = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.8), treadMat
    );
    leftTread.position.set(-0.35, 0, 0);
    leftTread.castShadow = true;
    baseGroup.add(leftTread);

    // Right tread
    const rightTread = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.8), treadMat
    );
    rightTread.position.set(0.35, 0, 0);
    rightTread.castShadow = true;
    baseGroup.add(rightTread);

    // Connecting platform between treads
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.65), platformMat
    );
    basePlate.position.y = 0.12;
    basePlate.castShadow = true;
    baseGroup.add(basePlate);

    // Decorative track wheels
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.05, 6), treadMat
        );
        wheel.position.set(s * 0.35, 0.0, -0.25 + i * 0.25);
        wheel.rotation.z = Math.PI / 2;
        baseGroup.add(wheel);
      }
    }

    // === Turret head (rotates independently) ===
    this.turretHead = new THREE.Group();
    this.turretHead.position.y = 0.22;

    // Rotating platform
    const rotPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.08, 10), platformMat
    );
    this.turretHead.add(rotPlat);

    // Dome body
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), domeMat
    );
    dome.position.y = 0.08;
    dome.castShadow = true;
    this.turretHead.add(dome);

    // Cannon barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.5, 6), cannonMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, 0.35);
    barrel.castShadow = true;
    this.turretHead.add(barrel);

    // Muzzle glow
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.025, 0.04, 6), glowMat
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.1, 0.61);
    this.turretHead.add(muzzle);

    // Sensor eye
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6), eyeMat
    );
    eye.position.set(0, 0.18, 0.15);
    this.turretHead.add(eye);

    // Assemble into model root (offset down so body center aligns)
    const modelRoot = new THREE.Group();
    modelRoot.add(baseGroup);
    modelRoot.add(this.turretHead);
    modelRoot.position.y = -0.15;

    this.mesh.add(modelRoot);
  }

  private createPhysicsBody(): void {
    const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.2, 0.35));

    this.body = new CANNON.Body({
      mass: 150,
      fixedRotation: true,
      linearDamping: 0.5,
    });

    this.body.addShape(shape);
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
        if (dist < TURRET_DETECT_RANGE) {
          this.state = 'alert';
          this.alertTimer = 0.5;
        }
        break;

      case 'alert':
        this.alertTimer -= dt;
        this.rotateTurretToward(playerPos, dt);
        if (this.alertTimer <= 0) {
          this.state = 'combat';
        }
        break;

      case 'combat':
        this.rotateTurretToward(playerPos, dt);

        if (dist > TURRET_DETECT_RANGE * 1.5) {
          this.state = 'idle';
        } else if (dist <= TURRET_ATTACK_RANGE) {
          // Shoot if in range
          if (this.fireTimer <= 0) {
            this.fireTimer = TURRET_FIRE_RATE;
            this.wantsToShoot = true;

            this.shootOrigin.copy(myPos);
            this.shootOrigin.y += 0.1;

            const spread = (1 - TURRET_ACCURACY) * 0.5;
            this.shootDirection
              .subVectors(playerPos, this.shootOrigin)
              .normalize();
            this.shootDirection.x += (Math.random() - 0.5) * spread;
            this.shootDirection.y += (Math.random() - 0.5) * spread * 0.5;
            this.shootDirection.z += (Math.random() - 0.5) * spread;
            this.shootDirection.normalize();
          }

          // Slowly advance if far
          if (dist > TURRET_ATTACK_RANGE * 0.6) {
            this.moveToward(playerPos, dt);
          }
        } else {
          this.moveToward(playerPos, dt);
        }
        break;
    }

    this.syncMeshToBody();
  }

  private rotateTurretToward(target: THREE.Vector3, dt: number): void {
    const myPos = this.getPosition();
    const desiredAngle = Math.atan2(target.x - myPos.x, target.z - myPos.z);
    const turretRotSpeed = 3; // rad/s

    // Smoothly interpolate turret rotation
    let diff = desiredAngle - this.turretHead.rotation.y;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxStep = turretRotSpeed * dt;
    if (Math.abs(diff) < maxStep) {
      this.turretHead.rotation.y = desiredAngle;
    } else {
      this.turretHead.rotation.y += Math.sign(diff) * maxStep;
    }
  }

  private moveToward(target: THREE.Vector3, dt: number): void {
    const myPos = this.getPosition();
    const dir = new THREE.Vector3()
      .subVectors(target, myPos)
      .normalize();

    this.body.wakeUp();
    this.body.velocity.x = dir.x * TURRET_SPEED;
    this.body.velocity.z = dir.z * TURRET_SPEED;

    // Rotate base toward movement direction
    const moveAngle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = moveAngle;
  }

  protected onDeath(): void {
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.fixedRotation = false;
    this.body.angularDamping = 0.3;
    this.body.applyImpulse(
      new CANNON.Vec3(
        (Math.random() - 0.5) * 3,
        2,
        (Math.random() - 0.5) * 3
      )
    );
  }
}
