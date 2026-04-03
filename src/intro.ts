import * as THREE from 'three';

/**
 * Лёгкая 3D заставка — не зависает, город из простых мешей
 */
export function playIntro(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000;';
    document.body.appendChild(overlay);

    let skipped = false;
    let canSkip = false;
    setTimeout(() => { canSkip = true; }, 1000);
    const skipHandler = (e: KeyboardEvent | MouseEvent) => {
      if (!canSkip) return;
      if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== 'Escape' && e.key !== ' ') return;
      skipped = true;
    };
    window.addEventListener('keydown', skipHandler);
    window.addEventListener('click', skipHandler);

    const skipHint = document.createElement('div');
    skipHint.textContent = 'Нажмите Enter чтобы пропустить';
    skipHint.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);color:#555;font-size:14px;font-family:Arial,sans-serif;z-index:10001;';
    overlay.appendChild(skipHint);

    const textDiv = document.createElement('div');
    textDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    overlay.appendChild(textDiv);
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color:#fff;font-family:Arial,sans-serif;font-weight:bold;text-align:center;text-shadow:0 0 20px rgba(0,0,0,0.9),0 0 40px rgba(0,0,0,0.7);transition:opacity 0.5s;opacity:0;';
    textDiv.appendChild(titleEl);

    // === Three.js (лёгкий) ===
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    overlay.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;position:absolute;top:0;left:0;';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0508);
    scene.fog = new THREE.Fog(0x1a0a05, 15, 60);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

    // === ОСВЕЩЕНИЕ ===
    scene.add(new THREE.AmbientLight(0x221510, 0.5));
    scene.add(new THREE.HemisphereLight(0x331a11, 0x0a0505, 0.4));
    const dir = new THREE.DirectionalLight(0xcc7744, 0.8);
    dir.position.set(30, 30, -20);
    scene.add(dir);

    // === ЗЕМЛЯ ===
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Дорога
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 120), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }));
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    scene.add(road);

    // === ЗДАНИЯ (лёгкие — по 2-3 меша на здание) ===
    const wallMats = [
      new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.5, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x1a2020, roughness: 0.5, metalness: 0.4 }),
    ];
    const glowColors = [0x22ccff, 0xff2266, 0x22ffcc, 0xcc44ff, 0xff8800];

    for (let i = 0; i < 16; i++) {
      const bw = 5 + Math.random() * 8;
      const bh = 6 + Math.random() * 20;
      const bd = 5 + Math.random() * 8;
      const bx = (Math.random() - 0.5) * 80;
      const bz = (Math.random() - 0.5) * 80;
      if (Math.abs(bx) < 8) continue;

      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMats[i % 2]);
      body.position.set(bx, bh / 2, bz);
      scene.add(body);

      // 2 неоновых ребра
      const edgeMat = new THREE.MeshBasicMaterial({ color: glowColors[i % 5] });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, 0.06), edgeMat);
      e1.position.set(bx - bw / 2, bh / 2, bz + bd / 2);
      scene.add(e1);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, 0.06), edgeMat);
      e2.position.set(bx + bw / 2, bh / 2, bz + bd / 2);
      scene.add(e2);
    }

    // === ПОЖАРЫ (лёгкие — конус + свет) ===
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
    const fireLights: THREE.PointLight[] = [];
    for (let i = 0; i < 5; i++) {
      const fx = (Math.random() - 0.5) * 50;
      const fz = (Math.random() - 0.5) * 50;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 5), fireMat);
      flame.position.set(fx, 1.5, fz);
      scene.add(flame);
      const fl = new THREE.PointLight(0xff4400, 2, 15);
      fl.position.set(fx, 3, fz);
      scene.add(fl);
      fireLights.push(fl);
    }

    // === КОСОРЫ (лёгкие — по 5 мешей каждый) ===
    const droidBodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.6 });
    const droidEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const droidGunMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });

    interface Droid { group: THREE.Group; x: number; z: number; speed: number; phase: number; shootTimer: number; legL: THREE.Mesh; legR: THREE.Mesh; }
    const droids: Droid[] = [];

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      // Тело
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.25), droidBodyMat)).position.y = 1.1;
      // Голова
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.22), droidBodyMat)).position.y = 1.55;
      // Глаза
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), droidEyeMat);
        eye.position.set(s * 0.07, 1.55, 0.12);
        g.add(eye);
      }
      // Ноги
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), droidBodyMat);
      legL.position.set(-0.1, 0.4, 0);
      g.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), droidBodyMat);
      legR.position.set(0.1, 0.4, 0);
      g.add(legR);
      // Бластер
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), droidGunMat);
      gun.position.set(0.25, 1.1, 0.15);
      g.add(gun);

      const x = -50 - i * 6;
      const z = -2 + (Math.random() - 0.5) * 4;
      g.position.set(x, 0, z);
      g.rotation.y = Math.PI / 2;
      scene.add(g);
      droids.push({ group: g, x, z, speed: 4 + Math.random() * 2, phase: Math.random() * Math.PI * 2, shootTimer: 1 + Math.random() * 2, legL, legR });
    }

    // === БЛАСТЕРНЫЕ ВЫСТРЕЛЫ ===
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    interface Bolt { mesh: THREE.Mesh; vx: number; life: number; }
    const bolts: Bolt[] = [];

    // === К-2SO (лёгкий — ~10 мешей) ===
    const k2Mat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.4, metalness: 0.5 });
    const k2PanelMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.3, metalness: 0.6 });
    const k2EyeMat = new THREE.MeshBasicMaterial({ color: 0x2288ff });

    const k2so = new THREE.Group();
    // Тело
    k2so.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), k2Mat)).position.y = 1.3;
    // Бронепластина
    const k2plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.04), k2PanelMat);
    k2plate.position.set(0, 1.4, 0.17);
    k2so.add(k2plate);
    // Плечи
    k2so.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.2), k2PanelMat)).position.y = 1.72;
    // Голова
    k2so.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), k2Mat)).position.y = 2.0;
    // Лицевая пластина
    const k2face = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.04), k2PanelMat);
    k2face.position.set(0, 2.0, 0.16);
    k2so.add(k2face);
    // Глаза
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.01), k2EyeMat);
      eye.position.set(s * 0.06, 2.02, 0.19);
      k2so.add(eye);
    }
    // Свет глаз
    const k2Light = new THREE.PointLight(0x2288ff, 2, 5);
    k2Light.position.set(0, 2.0, 0.3);
    k2so.add(k2Light);
    // Руки
    const k2armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), k2Mat);
    k2armL.position.set(-0.4, 1.2, 0);
    k2so.add(k2armL);
    const k2armR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), k2Mat);
    k2armR.position.set(0.4, 1.2, 0);
    k2so.add(k2armR);
    // Бластер
    const k2gun = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), droidGunMat);
    k2gun.position.set(-0.4, 0.9, 0.18);
    k2so.add(k2gun);
    // Ноги
    const k2legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), k2Mat);
    k2legL.position.set(-0.12, 0.4, 0);
    k2so.add(k2legL);
    const k2legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), k2Mat);
    k2legR.position.set(0.12, 0.4, 0);
    k2so.add(k2legR);

    k2so.position.set(50, 0, 0);
    k2so.rotation.y = -Math.PI / 2;
    k2so.visible = false;
    scene.add(k2so);

    // === ГОРОЖАНЕ (лёгкие) ===
    const citizenMats = [0x00ffff, 0xff00ff, 0x00ff88, 0x3366ff].map(c =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })
    );
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4c5b0, roughness: 0.6 });

    interface Citizen { group: THREE.Group; speed: number; legL: THREE.Mesh; legR: THREE.Mesh; phase: number; }
    const citizens: Citizen[] = [];

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const mat = citizenMats[i % citizenMats.length];
      // Тело
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.12), mat)).position.y = 1.1;
      // Голова
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skinMat);
      head.position.y = 1.4;
      g.add(head);
      // Ноги
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
      legL.position.set(-0.05, 0.45, 0);
      g.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
      legR.position.set(0.05, 0.45, 0);
      g.add(legR);

      g.position.set(5 + i * 5, 0, -1 + (Math.random() - 0.5) * 4);
      g.rotation.y = Math.PI / 2;
      g.rotation.x = 0.15;
      g.visible = false;
      scene.add(g);
      citizens.push({ group: g, speed: 4 + Math.random() * 3, legL, legR, phase: Math.random() * Math.PI * 2 });
    }

    // === АНИМАЦИЯ ===
    const startTime = performance.now();
    const TOTAL = 22000;
    const clock = new THREE.Clock();
    let prevPhase = -1;

    function showText(text: string, size: number, color: string) {
      titleEl.style.fontSize = size + 'px';
      titleEl.style.color = color;
      titleEl.innerHTML = text;
      titleEl.style.opacity = '1';
    }
    function hideText() { titleEl.style.opacity = '0'; }

    function animate() {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = elapsed / 1000;
      const dt = Math.min(clock.getDelta(), 0.05);

      if (skipped || elapsed > TOTAL) {
        renderer.dispose();
        renderer.forceContextLoss();
        overlay.remove();
        window.removeEventListener('keydown', skipHandler);
        window.removeEventListener('click', skipHandler);
        resolve();
        return;
      }

      // === КАМЕРА ===
      if (t < 4) {
        camera.position.set(-15 + t * 2.5, 12 - t, 20 - t * 2.5);
        camera.lookAt(0, 4, 0);
      } else if (t < 10) {
        const lead = droids[0];
        camera.position.set(lead.x - 4, 2.5, lead.z + 8);
        camera.lookAt(lead.x + 4, 1.5, lead.z);
      } else if (t < 14) {
        const a = (t - 10) / 4;
        camera.position.set(10 + a * 10, 2, 6);
        camera.lookAt(15 + a * 10, 1, 0);
      } else if (t < 19) {
        const a = (t - 14) / 5;
        camera.position.set(k2so.position.x + 3 - a, 1.5, 3 - a);
        camera.lookAt(k2so.position.x, 1.5, 0);
      } else {
        camera.position.set(k2so.position.x + 2, 2, 2);
        camera.lookAt(k2so.position.x, 1.8, 0);
      }

      // === ФАЗА 1: Город ===
      if (t >= 1.5 && t < 3.5 && prevPhase < 1) {
        prevPhase = 1;
        showText('НейроСити — 2148<br><span style="font-size:20px;color:#667788">Мирная ночь...</span>', 40, '#88aacc');
      }
      if (t >= 3.5 && prevPhase === 1) { hideText(); prevPhase = 2; }

      // === ФАЗА 2: Косоры ===
      if (t >= 4) {
        for (const d of droids) {
          if (d.x < 30) d.x += d.speed * dt;
          d.group.position.x = d.x;
          const swing = Math.sin(t * 8 + d.phase) * 0.3;
          d.legL.position.y = 0.4 + swing * 0.15;
          d.legR.position.y = 0.4 - swing * 0.15;

          d.shootTimer -= dt;
          if (d.shootTimer <= 0 && d.x > -20 && d.x < 25) {
            d.shootTimer = 0.5 + Math.random() * 1.0;
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.35), boltMat);
            bolt.position.set(d.x + 0.25, 1.1, d.z);
            scene.add(bolt);
            bolts.push({ mesh: bolt, vx: 25, life: 0 });
          }
        }
      }
      if (t >= 4.5 && t < 7 && prevPhase < 3) {
        prevPhase = 3;
        showText('Косоры атакуют город...', 34, '#cc3322');
      }
      if (t >= 7 && prevPhase === 3) { hideText(); prevPhase = 4; }

      // === ФАЗА 3: Горожане бегут ===
      if (t >= 8) {
        for (const c of citizens) {
          c.group.visible = true;
          c.group.position.x += c.speed * dt;
          const swing = Math.sin(t * 12 + c.phase) * 0.15;
          c.legL.position.y = 0.45 + swing;
          c.legR.position.y = 0.45 - swing;
        }
      }
      if (t >= 9 && t < 12 && prevPhase < 5) {
        prevPhase = 5;
        showText('Город захвачен<br><span style="font-size:20px;color:#884422">Надежды нет...</span>', 36, '#ff4400');
      }
      if (t >= 12 && prevPhase === 5) { hideText(); prevPhase = 6; }

      // === ФАЗА 4: К-2SO ===
      if (t >= 13) {
        k2so.visible = true;
        if (k2so.position.x > 10) {
          k2so.position.x -= 7 * dt;
          const swing = Math.sin(t * 5) * 0.15;
          k2legL.position.y = 0.4 + swing;
          k2legR.position.y = 0.4 - swing;
          k2armL.position.y = 1.2 - swing * 0.5;
          k2armR.position.y = 1.2 + swing * 0.5;
        }
        for (const d of droids) d.speed = Math.max(0, d.speed - 2 * dt);
      }
      if (t >= 13.5 && t < 16 && prevPhase < 7) {
        prevPhase = 7;
        showText('Но один робот не сдался', 30, '#2288ff');
      }
      if (t >= 16 && prevPhase === 7) { hideText(); prevPhase = 8; }

      // === ФАЗА 5: Название ===
      if (t >= 17 && t < 21 && prevPhase < 9) {
        prevPhase = 9;
        showText('УБОЙНЫЙ<br>РОБОТ', 80, '#ff4400');
      }
      if (t >= 21 && prevPhase === 9) { hideText(); prevPhase = 10; }

      // === Снаряды ===
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.mesh.position.x += b.vx * dt;
        b.life += dt;
        if (b.life > 1.2) { scene.remove(b.mesh); bolts.splice(i, 1); }
      }

      // === Пожары мерцают ===
      for (let i = 0; i < fireLights.length; i++) {
        fireLights[i].intensity = 1.5 + Math.sin(t * 8 + i * 2) * 1.0;
      }

      // === Затемнение ===
      if (t > 20.5) {
        const fade = Math.min((t - 20.5) / 1.5, 1);
        scene.fog = new THREE.Fog(0x000000, 3, 60 - fade * 55);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  });
}
