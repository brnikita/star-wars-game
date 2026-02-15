import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRAVITY, FIXED_TIME_STEP } from '../utils/Constants';

export class PhysicsSystem {
  world: CANNON.World;
  private bodyMeshMap: Map<CANNON.Body, THREE.Object3D> = new Map();

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;

    // Материалы
    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0.4, restitution: 0.1 }
    );
    this.world.addContactMaterial(contactMaterial);
    this.world.defaultContactMaterial = contactMaterial;
  }

  update(dt: number): void {
    this.world.step(FIXED_TIME_STEP, dt, 3);
  }

  addBody(body: CANNON.Body, mesh?: THREE.Object3D): void {
    this.world.addBody(body);
    if (mesh) {
      this.bodyMeshMap.set(body, mesh);
    }
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodyMeshMap.delete(body);
  }

  syncMeshes(): void {
    for (const [body, mesh] of this.bodyMeshMap) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    }
  }

  raycast(from: THREE.Vector3, to: THREE.Vector3, exclude?: CANNON.Body): CANNON.RaycastResult | null {
    const result = new CANNON.RaycastResult();
    const ray = new CANNON.Ray(
      new CANNON.Vec3(from.x, from.y, from.z),
      new CANNON.Vec3(to.x, to.y, to.z)
    );
    ray.intersectWorld(this.world, {
      result,
      skipBackfaces: true,
    });

    if (result.hasHit && (!exclude || result.body !== exclude)) {
      return result;
    }
    return null;
  }

  createStaticBox(
    position: THREE.Vector3,
    size: THREE.Vector3
  ): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(position.x, position.y, position.z);
    this.world.addBody(body);
    return body;
  }
}
