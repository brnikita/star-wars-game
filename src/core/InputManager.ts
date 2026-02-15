import { CAMERA_SENSITIVITY } from '../utils/Constants';
import { MobileTouchControls } from './MobileTouchControls';

const isMobile =
  window.matchMedia('(pointer: coarse)').matches &&
  'ontouchstart' in window;

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private _mouseDeltaX = 0;
  private _mouseDeltaY = 0;
  private _isPointerLocked = false;

  readonly touchControls: MobileTouchControls | null;

  constructor(private canvas: HTMLCanvasElement) {
    this.touchControls = isMobile ? new MobileTouchControls() : null;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      if (!isMobile && !this._isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });

    window.addEventListener('mousemove', (e) => {
      if (this._isPointerLocked) {
        this._mouseDeltaX += e.movementX * CAMERA_SENSITIVITY;
        this._mouseDeltaY += e.movementY * CAMERA_SENSITIVITY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this._isPointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  get mouseDeltaX(): number {
    const touch = this.touchControls
      ? this.touchControls.cameraDeltaX * CAMERA_SENSITIVITY
      : 0;
    return this._mouseDeltaX + touch;
  }

  get mouseDeltaY(): number {
    const touch = this.touchControls
      ? this.touchControls.cameraDeltaY * CAMERA_SENSITIVITY
      : 0;
    return this._mouseDeltaY + touch;
  }

  get isPointerLocked(): boolean {
    if (isMobile) return true;
    return this._isPointerLocked;
  }

  // Вперёд
  get forward(): boolean {
    return (
      this.isKeyDown('KeyW') ||
      this.isKeyDown('ArrowUp') ||
      (this.touchControls !== null && this.touchControls.moveY < -0.2)
    );
  }

  // Назад
  get backward(): boolean {
    return (
      this.isKeyDown('KeyS') ||
      this.isKeyDown('ArrowDown') ||
      (this.touchControls !== null && this.touchControls.moveY > 0.2)
    );
  }

  // Влево
  get left(): boolean {
    return (
      this.isKeyDown('KeyA') ||
      this.isKeyDown('ArrowLeft') ||
      (this.touchControls !== null && this.touchControls.moveX < -0.2)
    );
  }

  // Вправо
  get right(): boolean {
    return (
      this.isKeyDown('KeyD') ||
      this.isKeyDown('ArrowRight') ||
      (this.touchControls !== null && this.touchControls.moveX > 0.2)
    );
  }

  // Бег
  get sprint(): boolean {
    if (this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight')) return true;
    // Sprint on mobile when joystick pushed far
    if (this.touchControls) {
      const dist = Math.sqrt(
        this.touchControls.moveX ** 2 + this.touchControls.moveY ** 2
      );
      return dist > 0.85;
    }
    return false;
  }

  // Прыжок
  get jump(): boolean {
    return (
      this.isKeyDown('Space') ||
      (this.touchControls !== null && this.touchControls.isJumping)
    );
  }

  // Стрельба (ЛКМ)
  get shoot(): boolean {
    return (
      this.isMouseDown(0) ||
      (this.touchControls !== null && this.touchControls.isShooting)
    );
  }

  // Прицеливание (ПКМ)
  get aim(): boolean {
    return this.isMouseDown(2);
  }

  // Взаимодействие
  get interact(): boolean {
    return this.isKeyDown('KeyE');
  }

  // Ближний бой
  get melee(): boolean {
    return (
      this.isKeyDown('KeyF') ||
      (this.touchControls !== null && this.touchControls.isMelee)
    );
  }

  // Перезарядка
  get reload(): boolean {
    return (
      this.isKeyDown('KeyR') ||
      (this.touchControls !== null && this.touchControls.isReloading)
    );
  }

  // Сброс дельты мыши в конце кадра
  resetMouseDelta(): void {
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
    if (this.touchControls) {
      this.touchControls.resetCameraDeltas();
    }
  }
}
