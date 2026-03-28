import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { K2SO } from './K2SO';
import { PhysicsSystem } from '../systems/PhysicsSystem';

export interface Enemy {
  // Shooting
  wantsToShoot: boolean;
  shootDirection: THREE.Vector3;
  shootOrigin: THREE.Vector3;
  shootDamage: number;
  shootColor: number;

  // State
  isDead: boolean;
  body: CANNON.Body;
  mesh: THREE.Group;

  // Methods
  getPosition(): THREE.Vector3;
  takeDamage(amount: number): void;
  fixedUpdate(dt: number, player: K2SO): void;
  update(dt: number, player?: K2SO): void;
  spawn(position: THREE.Vector3): void;
  dispose(scene: THREE.Scene, physics: PhysicsSystem): void;
}
