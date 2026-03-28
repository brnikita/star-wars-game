const JOYSTICK_RADIUS = 50;
const BUTTON_MARGIN = 16;

interface ActiveTouch {
  id: number;
  type: 'joystick' | 'camera';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

export class MobileTouchControls {
  // Movement from joystick (-1..1)
  moveX = 0;
  moveY = 0;

  // Camera deltas accumulated per frame
  cameraDeltaX = 0;
  cameraDeltaY = 0;

  // Button states
  isShooting = false;
  isJumping = false;
  isReloading = false;
  isMelee = false;
  isCover = false;

  private container: HTMLElement;
  private joystickBase: HTMLElement;
  private joystickKnob: HTMLElement;
  private buttons: HTMLElement[] = [];
  private activeTouches: Map<number, ActiveTouch> = new Map();

  // Track which buttons are held by touch id
  private shootTouchId: number | null = null;
  private jumpTouchId: number | null = null;
  private reloadTouchId: number | null = null;
  private meleeTouchId: number | null = null;
  private coverTouchId: number | null = null;

  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor() {
    // Container for all touch UI
    this.container = document.createElement('div');
    this.container.id = 'mobile-touch-controls';
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 50; pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Joystick base (hidden until touched)
    this.joystickBase = document.createElement('div');
    this.joystickBase.style.cssText = `
      position: absolute; width: ${JOYSTICK_RADIUS * 2}px; height: ${JOYSTICK_RADIUS * 2}px;
      border-radius: 50%; border: 2px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.05); display: none;
      pointer-events: none;
    `;
    this.container.appendChild(this.joystickBase);

    // Joystick knob
    this.joystickKnob = document.createElement('div');
    this.joystickKnob.style.cssText = `
      position: absolute; width: 40px; height: 40px;
      border-radius: 50%; background: rgba(255,255,255,0.3);
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    this.joystickBase.appendChild(this.joystickKnob);

    // Action buttons
    this.createButtons();

    // Bind touch events on the entire window (pointer-events: auto on canvas)
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);

    window.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
  }

  private createButtons(): void {
    const defs: { label: string; color: string; size: number; key: 'shoot' | 'jump' | 'reload' | 'melee' | 'cover' }[] = [
      { label: '\u25CF', color: 'rgba(255,60,60,0.6)', size: 70, key: 'shoot' },
      { label: '\u25B2', color: 'rgba(60,120,255,0.6)', size: 56, key: 'jump' },
      { label: 'C', color: 'rgba(60,200,120,0.6)', size: 50, key: 'cover' },
      { label: 'R', color: 'rgba(240,200,40,0.6)', size: 50, key: 'reload' },
      { label: 'M', color: 'rgba(240,150,40,0.6)', size: 50, key: 'melee' },
    ];

    let bottomOffset = BUTTON_MARGIN + 40; // start above bottom edge

    for (const def of defs) {
      const btn = document.createElement('div');
      btn.dataset.action = def.key;
      btn.style.cssText = `
        position: absolute; right: ${BUTTON_MARGIN}px; bottom: ${bottomOffset}px;
        width: ${def.size}px; height: ${def.size}px;
        border-radius: 50%; background: ${def.color};
        border: 2px solid rgba(255,255,255,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: ${def.size * 0.4}px; color: rgba(255,255,255,0.8);
        user-select: none; pointer-events: auto;
        touch-action: none;
      `;
      btn.textContent = def.label;
      this.container.appendChild(btn);
      this.buttons.push(btn);
      bottomOffset += def.size + BUTTON_MARGIN;
    }
  }

  private hitTestButton(x: number, y: number): string | null {
    for (const btn of this.buttons) {
      const rect = btn.getBoundingClientRect();
      // Expand hit area a bit for easier tapping
      const pad = 8;
      if (
        x >= rect.left - pad && x <= rect.right + pad &&
        y >= rect.top - pad && y <= rect.bottom + pad
      ) {
        return btn.dataset.action || null;
      }
    }
    return null;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const screenW = window.innerWidth;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      // Check buttons first
      const action = this.hitTestButton(x, y);
      if (action) {
        this.setButtonState(action, true, touch.identifier);
        continue;
      }

      // Left half — joystick
      if (x < screenW * 0.4) {
        this.activeTouches.set(touch.identifier, {
          id: touch.identifier,
          type: 'joystick',
          startX: x,
          startY: y,
          lastX: x,
          lastY: y,
        });
        // Position joystick base at touch point
        this.joystickBase.style.left = `${x - JOYSTICK_RADIUS}px`;
        this.joystickBase.style.top = `${y - JOYSTICK_RADIUS}px`;
        this.joystickBase.style.display = 'block';
        // Reset knob
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
        continue;
      }

      // Right half — camera
      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        type: 'camera',
        startX: x,
        startY: y,
        lastX: x,
        lastY: y,
      });
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const at = this.activeTouches.get(touch.identifier);
      if (!at) continue;

      const x = touch.clientX;
      const y = touch.clientY;

      if (at.type === 'joystick') {
        const dx = x - at.startX;
        const dy = y - at.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
        const angle = Math.atan2(dy, dx);

        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        this.moveX = clampedX / JOYSTICK_RADIUS;
        this.moveY = clampedY / JOYSTICK_RADIUS;

        // Update knob position
        this.joystickKnob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
      } else if (at.type === 'camera') {
        const dx = x - at.lastX;
        const dy = y - at.lastY;
        this.cameraDeltaX += dx;
        this.cameraDeltaY += dy;
      }

      at.lastX = x;
      at.lastY = y;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const at = this.activeTouches.get(touch.identifier);

      if (at) {
        if (at.type === 'joystick') {
          this.moveX = 0;
          this.moveY = 0;
          this.joystickBase.style.display = 'none';
        }
        this.activeTouches.delete(touch.identifier);
      }

      // Release button states
      this.releaseButtonByTouchId(touch.identifier);
    }
  }

  private setButtonState(action: string, pressed: boolean, touchId: number): void {
    switch (action) {
      case 'shoot':
        this.isShooting = pressed;
        this.shootTouchId = pressed ? touchId : null;
        break;
      case 'jump':
        this.isJumping = pressed;
        this.jumpTouchId = pressed ? touchId : null;
        break;
      case 'reload':
        this.isReloading = pressed;
        this.reloadTouchId = pressed ? touchId : null;
        break;
      case 'melee':
        this.isMelee = pressed;
        this.meleeTouchId = pressed ? touchId : null;
        break;
      case 'cover':
        this.isCover = pressed;
        this.coverTouchId = pressed ? touchId : null;
        break;
    }
  }

  private releaseButtonByTouchId(touchId: number): void {
    if (this.shootTouchId === touchId) {
      this.isShooting = false;
      this.shootTouchId = null;
    }
    if (this.jumpTouchId === touchId) {
      this.isJumping = false;
      this.jumpTouchId = null;
    }
    if (this.reloadTouchId === touchId) {
      this.isReloading = false;
      this.reloadTouchId = null;
    }
    if (this.meleeTouchId === touchId) {
      this.isMelee = false;
      this.meleeTouchId = null;
    }
    if (this.coverTouchId === touchId) {
      this.isCover = false;
      this.coverTouchId = null;
    }
  }

  /** Reset per-frame camera deltas — called by InputManager after reading */
  resetCameraDeltas(): void {
    this.cameraDeltaX = 0;
    this.cameraDeltaY = 0;
  }

  dispose(): void {
    window.removeEventListener('touchstart', this.boundTouchStart);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);
    window.removeEventListener('touchcancel', this.boundTouchEnd);
    this.container.remove();
  }
}
