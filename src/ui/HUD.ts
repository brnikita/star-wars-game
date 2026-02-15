import { K2SO } from '../entities/K2SO';
import { CombatSystem } from '../systems/CombatSystem';

export class HUD {
  private container: HTMLElement;
  private healthBar!: HTMLElement;
  private healthFill!: HTMLElement;
  private shieldBar!: HTMLElement;
  private shieldFill!: HTMLElement;
  private ammoDisplay!: HTMLElement;
  private crosshair!: HTMLElement;
  private damageOverlay!: HTMLElement;
  private killCounter!: HTMLElement;
  private reloadIndicator!: HTMLElement;
  private levelIndicator!: HTMLElement;
  private levelNameIndicator!: HTMLElement;
  private levelOverlay!: HTMLElement;
  private levelOverlayTitle!: HTMLElement;
  private levelOverlaySubtitle!: HTMLElement;

  constructor() {
    this.container = document.getElementById('hud')!;
    this.createHUD();
  }

  private createHUD(): void {
    this.container.innerHTML = `
      <style>
        .hud-bars {
          position: absolute;
          bottom: 40px;
          left: 40px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hud-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hud-bar-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #888;
          width: 50px;
          text-align: right;
        }
        .hud-bar-track {
          width: 200px;
          height: 6px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          position: relative;
        }
        .hud-bar-fill {
          height: 100%;
          transition: width 0.2s;
        }
        .health-fill {
          background: linear-gradient(90deg, #ff4444, #ff6666);
        }
        .shield-fill {
          background: linear-gradient(90deg, #3388ff, #66aaff);
        }
        .hud-ammo {
          position: absolute;
          bottom: 40px;
          right: 40px;
          text-align: right;
        }
        .hud-ammo-count {
          font-size: 42px;
          font-weight: 300;
          line-height: 1;
          color: #ddd;
          font-family: 'Courier New', monospace;
        }
        .hud-ammo-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #666;
          margin-top: 4px;
        }
        .hud-reload {
          font-size: 13px;
          color: #4a9eff;
          margin-top: 8px;
          display: none;
          animation: blink 0.5s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .hud-crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          pointer-events: none;
        }
        .hud-crosshair::before,
        .hud-crosshair::after {
          content: '';
          position: absolute;
          background: rgba(255,255,255,0.6);
        }
        .hud-crosshair::before {
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          transform: translateY(-50%);
        }
        .hud-crosshair::after {
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          transform: translateX(-50%);
        }
        .hud-crosshair-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          background: rgba(74, 158, 255, 0.9);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        .hud-damage-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.3) 100%);
          opacity: 0;
          transition: opacity 0.1s;
          pointer-events: none;
        }
        .hud-kills {
          position: absolute;
          top: 30px;
          right: 40px;
          text-align: right;
        }
        .hud-kills-count {
          font-size: 24px;
          color: #ddd;
          font-weight: 300;
        }
        .hud-kills-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #555;
        }
        .hud-level {
          position: absolute;
          top: 30px;
          left: 40px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #888;
        }
        .hud-level-name {
          position: absolute;
          top: 52px;
          left: 40px;
          font-size: 11px;
          letter-spacing: 1px;
          color: #666;
        }
        .hud-level-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.75);
          display: none;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 16px;
          z-index: 100;
        }
        .hud-level-overlay.visible {
          display: flex;
        }
        .hud-level-title {
          font-size: 36px;
          font-weight: 300;
          letter-spacing: 6px;
          text-transform: uppercase;
          color: #4a9eff;
        }
        .hud-level-subtitle {
          font-size: 14px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #888;
          animation: blink 1s infinite;
        }
        .hud-level-overlay.game-over .hud-level-title {
          color: #ff4444;
        }
        @media (pointer: coarse) {
          .hud-bars {
            bottom: 20px;
            left: 16px;
          }
          .hud-bar-track {
            width: 120px;
            height: 5px;
          }
          .hud-bar-label {
            font-size: 9px;
            width: 40px;
          }
          .hud-ammo {
            bottom: 20px;
            right: 100px;
          }
          .hud-ammo-count {
            font-size: 28px;
          }
          .hud-ammo-label {
            font-size: 9px;
          }
          .hud-kills {
            top: 16px;
            right: 100px;
          }
          .hud-kills-count {
            font-size: 18px;
          }
          .hud-kills-label {
            font-size: 8px;
          }
          .hud-level {
            top: 16px;
            left: 16px;
            font-size: 11px;
          }
          .hud-level-name {
            top: 34px;
            left: 16px;
            font-size: 9px;
          }
          .hud-level-title {
            font-size: 24px;
            letter-spacing: 4px;
          }
          .hud-level-subtitle {
            font-size: 12px;
          }
          .hud-crosshair {
            width: 20px;
            height: 20px;
          }
        }
      </style>

      <div class="hud-bars">
        <div class="hud-bar">
          <span class="hud-bar-label">Щит</span>
          <div class="hud-bar-track" id="hud-shield-bar">
            <div class="hud-bar-fill shield-fill" id="hud-shield-fill"></div>
          </div>
        </div>
        <div class="hud-bar">
          <span class="hud-bar-label">Корпус</span>
          <div class="hud-bar-track" id="hud-health-bar">
            <div class="hud-bar-fill health-fill" id="hud-health-fill"></div>
          </div>
        </div>
      </div>

      <div class="hud-ammo">
        <div class="hud-ammo-count" id="hud-ammo-count">30</div>
        <div class="hud-ammo-label">Бластер E-11</div>
        <div class="hud-reload" id="hud-reload">Перезарядка...</div>
      </div>

      <div class="hud-crosshair" id="hud-crosshair">
        <div class="hud-crosshair-dot"></div>
      </div>

      <div class="hud-damage-overlay" id="hud-damage-overlay"></div>

      <div class="hud-kills">
        <div class="hud-kills-count" id="hud-kills-count">0</div>
        <div class="hud-kills-label">Дроидов</div>
      </div>

      <div class="hud-level" id="hud-level">Уровень 1</div>
      <div class="hud-level-name" id="hud-level-name"></div>

      <div class="hud-level-overlay" id="hud-level-overlay">
        <div class="hud-level-title" id="hud-level-overlay-title"></div>
        <div class="hud-level-subtitle" id="hud-level-overlay-subtitle"></div>
      </div>
    `;

    this.healthFill = document.getElementById('hud-health-fill')!;
    this.shieldFill = document.getElementById('hud-shield-fill')!;
    this.ammoDisplay = document.getElementById('hud-ammo-count')!;
    this.crosshair = document.getElementById('hud-crosshair')!;
    this.damageOverlay = document.getElementById('hud-damage-overlay')!;
    this.killCounter = document.getElementById('hud-kills-count')!;
    this.reloadIndicator = document.getElementById('hud-reload')!;
    this.levelIndicator = document.getElementById('hud-level')!;
    this.levelNameIndicator = document.getElementById('hud-level-name')!;
    this.levelOverlay = document.getElementById('hud-level-overlay')!;
    this.levelOverlayTitle = document.getElementById('hud-level-overlay-title')!;
    this.levelOverlaySubtitle = document.getElementById('hud-level-overlay-subtitle')!;
  }

  update(player: K2SO, combat: CombatSystem): void {
    // Здоровье
    const healthPercent = (player.health / player.maxHealth) * 100;
    this.healthFill.style.width = `${healthPercent}%`;

    // Щит
    const shieldPercent = (player.shield / player.maxShield) * 100;
    this.shieldFill.style.width = `${shieldPercent}%`;

    // Патроны
    this.ammoDisplay.textContent = String(player.ammo);
    if (player.ammo <= 5) {
      this.ammoDisplay.style.color = '#ff4444';
    } else {
      this.ammoDisplay.style.color = '#ddd';
    }

    // Индикатор перезарядки
    this.reloadIndicator.style.display = player.isReloading ? 'block' : 'none';

    // Индикатор урона (красная виньетка)
    const timeSinceHit = performance.now() - combat.lastHitTime;
    if (timeSinceHit < 500) {
      this.damageOverlay.style.opacity = String(1 - timeSinceHit / 500);
    } else {
      this.damageOverlay.style.opacity = '0';
    }

    // Счётчик убийств
    this.killCounter.textContent = String(combat.kills);
  }

  setLevel(level: number): void {
    this.levelIndicator.textContent = `Уровень ${level}`;
  }

  setLevelName(name: string): void {
    this.levelNameIndicator.textContent = name;
  }

  showLevelComplete(level: number, hasNextLevel: boolean): void {
    if (hasNextLevel) {
      this.levelOverlayTitle.textContent = `Уровень ${level} пройден`;
      this.levelOverlaySubtitle.textContent = 'Нажмите для продолжения';
    } else {
      this.levelOverlayTitle.textContent = 'Победа!';
      this.levelOverlaySubtitle.textContent = 'Все уровни пройдены';
    }
    this.levelOverlay.classList.add('visible');
  }

  hideLevelComplete(): void {
    this.levelOverlay.classList.remove('visible');
    this.levelOverlay.classList.remove('game-over');
  }

  showGameOver(): void {
    this.levelOverlayTitle.textContent = 'Поражение';
    this.levelOverlaySubtitle.textContent = 'Нажмите для перезапуска';
    this.levelOverlay.classList.add('visible', 'game-over');
  }
}
