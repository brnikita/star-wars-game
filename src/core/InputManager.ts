import { CAMERA_SENSITIVITY } from '../utils/Constants';

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private _mouseDeltaX = 0;
  private _mouseDeltaY = 0;
  private _isPointerLocked = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      if (!this._isPointerLocked) {
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
    return this._mouseDeltaX;
  }

  get mouseDeltaY(): number {
    return this._mouseDeltaY;
  }

  get isPointerLocked(): boolean {
    return this._isPointerLocked;
  }

  // Вперёд
  get forward(): boolean {
    return this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp');
  }

  // Назад
  get backward(): boolean {
    return this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown');
  }

  // Влево
  get left(): boolean {
    return this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft');
  }

  // Вправо
  get right(): boolean {
    return this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight');
  }

  // Бег
  get sprint(): boolean {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
  }

  // Прыжок
  get jump(): boolean {
    return this.isKeyDown('Space');
  }

  // Стрельба (ЛКМ)
  get shoot(): boolean {
    return this.isMouseDown(0);
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
    return this.isKeyDown('KeyF');
  }

  // Перезарядка
  get reload(): boolean {
    return this.isKeyDown('KeyR');
  }

  // Сброс дельты мыши в конце кадра
  resetMouseDelta(): void {
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
  }
}
