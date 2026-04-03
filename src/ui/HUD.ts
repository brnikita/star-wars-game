import * as THREE from 'three';
import { K2SO } from '../entities/K2SO';
import { Enemy } from '../entities/Enemy';
import { CombatSystem } from '../systems/CombatSystem';

export class HUD {
  private container: HTMLElement;
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private minimapScale = 0.5; // пикселей на метр
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
  private coverIndicator!: HTMLElement;
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
        .hud-heal {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
        }
        .hud-heal-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #888;
        }
        .hud-heal-charges {
          display: flex;
          gap: 4px;
        }
        .hud-heal-pip {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(68,204,136,0.5);
          background: rgba(68,204,136,0.3);
          transition: background 0.3s, border-color 0.3s;
        }
        .hud-heal-pip.used {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }
        .hud-heal-key {
          font-size: 10px;
          color: #555;
          letter-spacing: 1px;
        }
        .hud-heal-effect {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: #44cc88;
          letter-spacing: 2px;
          text-transform: uppercase;
          display: none;
          animation: blink 0.4s infinite;
          pointer-events: none;
        }
        .hud-heal-effect.visible {
          display: block;
        }
        .hud-fly {
          position: absolute;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        }
        .hud-fly.visible {
          display: flex;
        }
        .hud-fly-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 4px;
          color: #44aaff;
          text-shadow: 0 0 8px #2288ff;
        }
        .hud-fly-hint {
          font-size: 9px;
          letter-spacing: 2px;
          color: #3388cc;
        }
        .hud-stealth {
          position: absolute;
          bottom: 130px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        }
        .hud-stealth.visible {
          display: flex;
        }
        .hud-stealth-label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 4px;
          color: #8866dd;
        }
        .hud-stealth-hint {
          font-size: 9px;
          letter-spacing: 2px;
          color: #6644aa;
        }
        .hud-stealth-eye {
          width: 28px;
          height: 14px;
          border: 2px solid #8866dd;
          border-radius: 50%;
          position: relative;
          margin-bottom: 4px;
        }
        .hud-stealth-eye::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          background: #8866dd;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        .hud-stealth-eye.closed {
          height: 2px;
          border-radius: 0;
          border-top: 2px solid #8866dd;
          border-bottom: none;
          border-left: none;
          border-right: none;
        }
        .hud-stealth-eye.closed::after {
          display: none;
        }
        .hud-cover {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        }
        .hud-cover.visible {
          display: flex;
        }
        .hud-cover-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #44cc88;
        }
        .hud-cover-regen {
          font-size: 10px;
          letter-spacing: 2px;
          color: #33aa66;
          animation: blink 1s infinite;
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
          .hud-cover {
            bottom: 80px;
          }
          .hud-cover-label {
            font-size: 9px;
          }
          .hud-cover-regen {
            font-size: 8px;
          }
          .hud-stealth {
            bottom: 110px;
          }
          .hud-stealth-label {
            font-size: 10px;
          }
          .hud-heal {
            bottom: 20px;
          }
          .hud-heal-label {
            font-size: 9px;
          }
          .hud-heal-pip {
            width: 10px;
            height: 10px;
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

      <div class="hud-fly" id="hud-fly">
        <div class="hud-fly-label">Полёт</div>
        <div class="hud-fly-hint">Пробел — вверх | Shift — вниз | Backspace — выкл</div>
      </div>

      <div class="hud-stealth" id="hud-stealth">
        <div class="hud-stealth-eye" id="hud-stealth-eye"></div>
        <div class="hud-stealth-label">Стелс</div>
        <div class="hud-stealth-hint">Враги не видят</div>
      </div>

      <div class="hud-cover" id="hud-cover">
        <div class="hud-cover-label">Укрытие</div>
        <div class="hud-cover-regen" id="hud-cover-regen">+ восстановление</div>
      </div>

      <div class="hud-heal" id="hud-heal">
        <span class="hud-heal-label">[Enter] Лечение</span>
        <div class="hud-heal-charges" id="hud-heal-charges">
          <div class="hud-heal-pip" id="hud-heal-pip-0"></div>
          <div class="hud-heal-pip" id="hud-heal-pip-1"></div>
          <div class="hud-heal-pip" id="hud-heal-pip-2"></div>
        </div>
      </div>
      <div class="hud-heal-effect" id="hud-heal-effect">+Лечение</div>

      <div class="hud-damage-overlay" id="hud-damage-overlay"></div>

      <div class="hud-kills">
        <div class="hud-kills-count" id="hud-kills-count">0</div>
        <div class="hud-kills-label">Косоров</div>
      </div>

      <div class="hud-skin" id="hud-skin" style="position:absolute;top:30px;left:50%;transform:translateX(-50%);font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;pointer-events:none;">[+] Скин: K-2SO</div>

      <div class="hud-level" id="hud-level">Уровень 1</div>
      <div class="hud-level-name" id="hud-level-name"></div>

      <canvas id="hud-minimap" width="160" height="160" style="position:absolute;bottom:40px;right:40px;width:160px;height:160px;border:2px solid rgba(255,255,255,0.2);border-radius:4px;background:rgba(0,0,0,0.5);pointer-events:none;"></canvas>

      <div class="hud-level-overlay" id="hud-level-overlay">
        <div class="hud-level-title" id="hud-level-overlay-title"></div>
        <div class="hud-level-subtitle" id="hud-level-overlay-subtitle"></div>
      </div>
    `;

    this.healthFill = document.getElementById('hud-health-fill')!;
    this.shieldFill = document.getElementById('hud-shield-fill')!;
    this.ammoDisplay = document.getElementById('hud-ammo-count')!;
    this.crosshair = document.getElementById('hud-crosshair')!;
    this.coverIndicator = document.getElementById('hud-cover')!;
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

    // Индикатор скина
    const skinEl = document.getElementById('hud-skin');
    if (skinEl) {
      const names = ['K-250', 'R-111', 'Бобр', 'Скелет', 'Пряник', 'Розовый'];
      const colors = ['#4a9eff', '#ff2222', '#8B4513', '#22ff44', '#b5651d', '#ff66aa'];
      skinEl.textContent = `[+] Скин: ${names[player.currentSkin]}`;
      skinEl.style.color = colors[player.currentSkin];
    }

    // Индикатор полёта
    const flyEl = document.getElementById('hud-fly');
    if (flyEl) flyEl.classList.toggle('visible', player.isFlying);

    // Индикатор стелса
    const stealthEl = document.getElementById('hud-stealth');
    const stealthEye = document.getElementById('hud-stealth-eye');
    if (stealthEl) {
      stealthEl.classList.toggle('visible', player.isStealth);
    }
    if (stealthEye) {
      stealthEye.classList.toggle('closed', player.isStealth);
    }

    // Индикатор укрытия
    if (player.isCrouching) {
      this.coverIndicator.classList.add('visible');
      // Показать "восстановление" если HP < max
      const regenEl = document.getElementById('hud-cover-regen');
      if (regenEl) {
        regenEl.style.display = player.health < player.maxHealth ? 'block' : 'none';
      }
    } else {
      this.coverIndicator.classList.remove('visible');
    }

    // Индикатор урона (красная виньетка)
    const timeSinceHit = performance.now() - combat.lastHitTime;
    if (timeSinceHit < 500) {
      this.damageOverlay.style.opacity = String(1 - timeSinceHit / 500);
    } else {
      this.damageOverlay.style.opacity = '0';
    }

    // Индикатор исцеления
    for (let i = 0; i < 3; i++) {
      const pip = document.getElementById(`hud-heal-pip-${i}`);
      if (pip) {
        pip.classList.toggle('used', i >= player.healCharges);
      }
    }
    const healEffect = document.getElementById('hud-heal-effect');
    if (healEffect) {
      healEffect.classList.toggle('visible', player.isHealing);
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

  updateMinimap(player: K2SO, enemies: Enemy[]): void {
    if (!this.minimapCtx) {
      const canvas = document.getElementById('hud-minimap') as HTMLCanvasElement;
      if (canvas) this.minimapCtx = canvas.getContext('2d');
      if (!this.minimapCtx) return;
    }
    const ctx = this.minimapCtx;
    const w = 160, h = 160;
    const scale = this.minimapScale;
    const px = player.body.position.x;
    const pz = player.body.position.z;

    // Очистить
    ctx.fillStyle = 'rgba(10,15,25,0.85)';
    ctx.fillRect(0, 0, w, h);

    // Сетка дорог (относительно игрока)
    ctx.strokeStyle = 'rgba(60,60,80,0.5)';
    ctx.lineWidth = 1;
    const gridSize = 60; // DIST
    for (let gx = -5; gx <= 5; gx++) {
      const worldX = gx * gridSize;
      const screenX = (worldX - px) * scale + w / 2;
      if (screenX < 0 || screenX > w) continue;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, h);
      ctx.stroke();
    }
    for (let gz = -5; gz <= 5; gz++) {
      const worldZ = gz * gridSize;
      const screenY = (worldZ - pz) * scale + h / 2;
      if (screenY < 0 || screenY > h) continue;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(w, screenY);
      ctx.stroke();
    }

    // Здания (серые прямоугольники — берём из сцены traverse)
    // Упрощённо — рисуем блоки районов
    ctx.fillStyle = 'rgba(80,80,90,0.6)';
    for (let gx = -5; gx <= 5; gx++) {
      for (let gz = -5; gz <= 5; gz++) {
        const bx = gx * gridSize;
        const bz = gz * gridSize;
        const sx2 = (bx - 15 - px) * scale + w / 2;
        const sy2 = (bz - 15 - pz) * scale + h / 2;
        const bw = 30 * scale;
        ctx.fillRect(sx2, sy2, bw, bw);
      }
    }

    // Враги (красные точки)
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const ep = enemy.getPosition();
      const ex = (ep.x - px) * scale + w / 2;
      const ey = (ep.z - pz) * scale + h / 2;
      if (ex < -5 || ex > w + 5 || ey < -5 || ey > h + 5) continue;
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Игрок (зелёный треугольник в центре, повёрнутый по направлению взгляда)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(player.cameraYaw);
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Рамка
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);

    // Компас (N вверху)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', w / 2, 10);
  }

  showGameOver(): void {
    this.levelOverlayTitle.textContent = 'Поражение';
    this.levelOverlaySubtitle.textContent = 'Нажмите для перезапуска';
    this.levelOverlay.classList.add('visible', 'game-over');
  }
}
