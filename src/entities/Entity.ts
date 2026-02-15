import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsSystem } from '../systems/PhysicsSystem';

export abstract class Entity {
  mesh: THREE.Group;
  body!: CANNON.Body;
  health: number;
  maxHealth: number;
  isDead = false;

  constructor(
    protected scene: THREE.Scene,
    protected physics: PhysicsSystem,
    maxHealth: number
  ) {
    this.mesh = new THREE.Group();
    this.health = maxHealth;
    this.maxHealth = maxHealth;
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.onDeath();
    }
  }

  protected abstract onDeath(): void;

  syncMeshToBody(): void {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  spawn(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y, position.z);
    this.mesh.position.copy(position);
    this.scene.add(this.mesh);
  }

  dispose(scene: THREE.Scene, physics: PhysicsSystem): void {
    scene.remove(this.mesh);
    physics.removeBody(this.body);
  }
}
