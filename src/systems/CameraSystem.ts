import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { K2SO } from '../entities/K2SO';
import {
  CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_LERP_SPEED,
  CAMERA_AIM_DISTANCE, CAMERA_AIM_OFFSET_X,
  CAMERA_MIN_PITCH, CAMERA_MAX_PITCH,
  K2SO_CROUCH_HEIGHT_SCALE,
} from '../utils/Constants';
import { lerp, clamp } from '../utils/MathUtils';

export class CameraSystem {
  private yaw = Math.PI;   // горизонтальный угол
  private pitch = 0.3;     // вертикальный угол
  private currentDistance: number;
  private currentOffsetX = 0;
  private targetPos = new THREE.Vector3();
  private target: K2SO | null = null;
  private scene: THREE.Scene | null = null;
  private raycaster = new THREE.Raycaster();

  // Границы (открытое пространство — город)
  private readonly FLOOR_Y = 0.5;    // минимальная высота камеры
  private readonly CEILING_Y = 30;   // открытое небо
  private readonly WALL_MARGIN = 0.5; // отступ от стен

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: InputManager
  ) {
    this.currentDistance = CAMERA_DISTANCE;
  }

  setTarget(target: K2SO): void {
    this.target = target;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  update(dt: number): void {
    if (!this.target) return;

    // Обновить углы из ввода мыши
    this.yaw -= this.input.mouseDeltaX;
    this.pitch -= this.input.mouseDeltaY;
    this.pitch = clamp(this.pitch, CAMERA_MIN_PITCH, CAMERA_MAX_PITCH);

    // Целевая дистанция и смещение (прицеливание)
    const isAiming = this.input.aim;
    const targetDist = isAiming ? CAMERA_AIM_DISTANCE : CAMERA_DISTANCE;
    const targetOffsetX = isAiming ? CAMERA_AIM_OFFSET_X : 0;

    this.currentDistance = lerp(this.currentDistance, targetDist, dt * 8);
    this.currentOffsetX = lerp(this.currentOffsetX, targetOffsetX, dt * 8);

    // Позиция цели (чуть выше центра персонажа, ниже при приседании)
    const playerPos = this.target.getPosition();
    const crouchMult = this.target.isCrouching ? K2SO_CROUCH_HEIGHT_SCALE : 1;
    this.targetPos.set(playerPos.x, playerPos.y + CAMERA_HEIGHT * 0.4 * crouchMult, playerPos.z);

    // Вычисляем желаемую позицию камеры (сферические координаты)
    const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.currentDistance;
    const offsetY = Math.sin(this.pitch) * this.currentDistance;
    const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.currentDistance;

    const desiredPos = new THREE.Vector3(
      this.targetPos.x + offsetX + Math.cos(this.yaw) * this.currentOffsetX,
      this.targetPos.y + offsetY,
      this.targetPos.z + offsetZ - Math.sin(this.yaw) * this.currentOffsetX
    );

    // === КОЛЛИЗИЯ КАМЕРЫ ===
    // 1. Рейкаст от цели к желаемой позиции камеры
    let finalPos = desiredPos.clone();

    if (this.scene) {
      const direction = new THREE.Vector3().subVectors(desiredPos, this.targetPos);
      const maxDist = direction.length();
      direction.normalize();

      this.raycaster.set(this.targetPos, direction);
      this.raycaster.far = maxDist;

      // Собираем только статические меши (стены, пол, потолок)
      const meshes = this.getCollidableMeshes();
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        // Камера упирается в стену — ставим камеру перед препятствием
        const hitDist = intersects[0].distance;
        const safeDist = Math.max(hitDist - this.WALL_MARGIN, 0.5);
        finalPos.copy(this.targetPos).add(direction.multiplyScalar(safeDist));
      }
    }

    // 2. Жёсткие ограничения по высоте (пол и потолок)
    finalPos.y = clamp(finalPos.y, this.FLOOR_Y, this.CEILING_Y);

    // Плавное перемещение камеры
    this.camera.position.lerp(finalPos, clamp(dt * CAMERA_LERP_SPEED, 0, 1));

    // Ещё раз зажимаем после lerp (на случай если камера была снаружи)
    this.camera.position.y = clamp(this.camera.position.y, this.FLOOR_Y, this.CEILING_Y);

    // Камера смотрит вперёд (мимо дроида), а не на дроида
    // Прицел (центр экрана) будет перед K-2SO, а не на нём
    const lookAhead = 15;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const lookTarget = new THREE.Vector3(
      this.targetPos.x + forward.x * lookAhead,
      this.targetPos.y,
      this.targetPos.z + forward.z * lookAhead
    );
    this.camera.lookAt(lookTarget);

    // Передать yaw персонажу для поворота при движении
    this.target.cameraYaw = this.yaw;

    // Точка прицеливания: продлеваем луч камеры далеко вперёд
    // Пули полетят от дула к этой точке = куда смотрит прицел
    const aimDir = new THREE.Vector3().subVectors(lookTarget, this.camera.position).normalize();
    this.target.aimPoint.copy(this.camera.position).addScaledVector(aimDir, 100);
  }

  private collidableMeshesCache: THREE.Mesh[] = [];
  private cacheBuilt = false;

  private getCollidableMeshes(): THREE.Mesh[] {
    // Статические меши не меняются — строим кеш один раз
    if (this.cacheBuilt) return this.collidableMeshesCache;

    this.collidableMeshesCache = [];
    if (!this.scene) return this.collidableMeshesCache;

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geo = obj.geometry;
        if (geo.boundingSphere === null) geo.computeBoundingSphere();
        if (geo.boundingSphere && geo.boundingSphere.radius > 0.5) {
          this.collidableMeshesCache.push(obj);
        }
      }
    });

    this.cacheBuilt = true;
    return this.collidableMeshesCache;
  }

  getYaw(): number {
    return this.yaw;
  }

  getForwardDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }

  getRightDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();
  }
}
