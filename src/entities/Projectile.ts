import * as THREE from 'three';
import { BLASTER_SPEED, BLASTER_RANGE } from '../utils/Constants';

export class Projectile {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
  distanceTraveled = 0;
  maxDistance: number;
  isPlayerProjectile: boolean;
  isDead = false;

  private trail: THREE.Mesh;
  private startPos: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    color: number,
    damage: number,
    isPlayerProjectile: boolean
  ) {
    this.direction = direction.normalize();
    this.speed = BLASTER_SPEED;
    this.damage = damage;
    this.maxDistance = BLASTER_RANGE;
    this.isPlayerProjectile = isPlayerProjectile;
    this.startPos = origin.clone();

    // Болт бластера — светящийся вытянутый объект
    const boltGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
    boltGeom.rotateX(Math.PI / 2);

    const boltMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });

    this.mesh = new THREE.Mesh(boltGeom, boltMat);
    this.mesh.position.copy(origin);

    // Ориентируем болт по направлению полёта
    const lookTarget = origin.clone().add(direction);
    this.mesh.lookAt(lookTarget);

    // Светящийся след
    const trailGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
    trailGeom.rotateX(Math.PI / 2);
    const trailMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    });
    this.trail = new THREE.Mesh(trailGeom, trailMat);
    this.trail.position.z = -0.4;
    this.mesh.add(this.trail);

    scene.add(this.mesh);
  }

  update(dt: number): void {
    if (this.isDead) return;

    const movement = this.direction.clone().multiplyScalar(this.speed * dt);
    this.mesh.position.add(movement);
    this.distanceTraveled += movement.length();

    if (this.distanceTraveled >= this.maxDistance) {
      this.isDead = true;
    }
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
