import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from '../core/InputManager';
import { K2SO } from '../entities/K2SO';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { PhysicsSystem } from './PhysicsSystem';
import {
  BLASTER_FIRE_RATE, BLASTER_DAMAGE, BLASTER_RELOAD_TIME,
  MELEE_DAMAGE, MELEE_RANGE, MELEE_COOLDOWN,
  COLOR_BLASTER_PLAYER, COLOR_BLASTER_ENEMY,
} from '../utils/Constants';
import { distanceXZ } from '../utils/MathUtils';

interface ActiveParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  startTime: number;
  mat: THREE.MeshBasicMaterial;
}

export class CombatSystem {
  projectiles: Projectile[] = [];
  private playerFireTimer = 0;
  private meleeTimer = 0;
  private activeParticles: ActiveParticle[] = [];

  // Статистика для HUD
  lastHitTime = 0;
  kills = 0;

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsSystem
  ) {}

  update(dt: number, player: K2SO, enemies: Enemy[], input: InputManager): void {
    this.playerFireTimer -= dt;
    this.meleeTimer -= dt;

    // Стрельба игрока
    if (input.shoot && this.playerFireTimer <= 0 && player.ammo > 0 && !player.isReloading) {
      this.playerShoot(player, input);
      this.playerFireTimer = BLASTER_FIRE_RATE;
      player.ammo--;

      if (player.ammo <= 0) {
        player.startReload();
      }
    }

    // Перезарядка
    if (input.reload) {
      player.startReload();
    }

    // Ближний бой
    if (input.melee && this.meleeTimer <= 0) {
      this.meleeAttack(player, enemies);
      this.meleeTimer = MELEE_COOLDOWN;
    }

    // Стрельба врагов
    for (const enemy of enemies) {
      if (enemy.wantsToShoot) {
        this.enemyShoot(enemy);
      }
    }

    // Обновление снарядов
    this.updateProjectiles(dt, player, enemies);

    // Обновление частиц попаданий
    this.updateParticles();
  }

  private playerShoot(player: K2SO, input: InputManager): void {
    const origin = player.getAimOrigin();

    // Направление стрельбы — от дула к точке прицеливания камеры
    const dir = new THREE.Vector3().subVectors(player.aimPoint, origin).normalize();

    const projectile = new Projectile(
      this.scene, origin, dir,
      COLOR_BLASTER_PLAYER, BLASTER_DAMAGE, true
    );
    this.projectiles.push(projectile);
  }

  private enemyShoot(enemy: Enemy): void {
    const projectile = new Projectile(
      this.scene,
      enemy.shootOrigin.clone(),
      enemy.shootDirection.clone(),
      enemy.shootColor,
      enemy.shootDamage,
      false
    );
    this.projectiles.push(projectile);
  }

  private meleeAttack(player: K2SO, enemies: Enemy[]): void {
    const playerPos = player.getPosition();

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = distanceXZ(playerPos, enemy.getPosition());
      if (dist < MELEE_RANGE) {
        enemy.takeDamage(MELEE_DAMAGE);

        // Отталкивание
        const dir = enemy.getPosition().sub(playerPos).normalize();
        enemy.body.applyImpulse(
          new CANNON.Vec3(dir.x * 10, 3, dir.z * 10)
        );

        break; // Бьём одного за раз
      }
    }
  }

  private updateProjectiles(dt: number, player: K2SO, enemies: Enemy[]): void {
    for (const proj of this.projectiles) {
      proj.update(dt);

      if (proj.isDead) continue;

      const projPos = proj.mesh.position;

      if (proj.isPlayerProjectile) {
        // Проверка попадания в врагов
        for (const enemy of enemies) {
          if (enemy.isDead) continue;
          const enemyPos = enemy.getPosition();
          const dist = projPos.distanceTo(enemyPos);
          if (dist < 1.2) {
            enemy.takeDamage(proj.damage);
            proj.isDead = true;
            this.createHitEffect(projPos.clone(), COLOR_BLASTER_PLAYER);
            if (enemy.isDead) this.kills++;
            break;
          }
        }
      } else {
        // Проверка попадания в игрока (радиус меньше при приседании)
        const playerPos = player.getPosition();
        const dist = projPos.distanceTo(playerPos);
        const hitRadius = player.isCrouching ? 0.4 : 0.6;
        if (dist < hitRadius) {
          player.takeDamage(proj.damage);
          proj.isDead = true;
          this.lastHitTime = performance.now();
          this.createHitEffect(projPos.clone(), COLOR_BLASTER_ENEMY);
        }
      }
    }

    // Удаление мёртвых снарядов
    this.projectiles = this.projectiles.filter(p => {
      if (p.isDead) {
        p.dispose(this.scene);
        return false;
      }
      return true;
    });
  }

  private static particleGeom: THREE.SphereGeometry | null = null;

  private createHitEffect(position: THREE.Vector3, color: number): void {
    // Общая геометрия частиц (создаём один раз)
    if (!CombatSystem.particleGeom) {
      CombatSystem.particleGeom = new THREE.SphereGeometry(0.02, 4, 4);
    }

    // Частицы (простые сферы разлетающиеся)
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const particle = new THREE.Mesh(CombatSystem.particleGeom, mat);
      particle.position.copy(position);
      this.scene.add(particle);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2,
        (Math.random() - 0.5) * 3
      );

      const startTime = performance.now();
      this.activeParticles.push({ mesh: particle, vel, startTime, mat });
    }
  }

  reset(): void {
    // Очистить все снаряды
    for (const p of this.projectiles) {
      p.dispose(this.scene);
    }
    this.projectiles = [];

    // Очистить частицы
    for (const p of this.activeParticles) {
      this.scene.remove(p.mesh);
      p.mat.dispose();
    }
    this.activeParticles = [];

    this.kills = 0;
    this.lastHitTime = 0;
    this.playerFireTimer = 0;
    this.meleeTimer = 0;
  }

  // Обновление частиц внутри игрового цикла (вместо отдельных requestAnimationFrame)
  updateParticles(): void {
    const now = performance.now();
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      const elapsed = (now - p.startTime) / 1000;
      if (elapsed > 0.5) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        this.activeParticles.splice(i, 1);
        continue;
      }
      p.mesh.position.add(p.vel.clone().multiplyScalar(0.016));
      p.vel.y -= 0.15;
      p.mat.opacity = 1 - elapsed * 2;
    }
  }
}
