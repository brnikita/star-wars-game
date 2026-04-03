import * as THREE from 'three';

/**
 * 3D кинематографическая заставка на Three.js
 * Косоры атакуют НейроСити, появляется К-2SO
 */
export function playIntro(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000;';
    document.body.appendChild(overlay);

    // Пропуск
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

    // Текстовый оверлей
    const textDiv = document.createElement('div');
    textDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    overlay.appendChild(textDiv);

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color:#fff;font-family:Arial,sans-serif;font-weight:bold;text-align:center;text-shadow:0 0 20px rgba(0,0,0,0.9),0 0 40px rgba(0,0,0,0.7);transition:opacity 0.5s;opacity:0;';
    textDiv.appendChild(titleEl);

    // === Three.js сцена ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    overlay.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;position:absolute;top:0;left:0;';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0508);
    scene.fog = new THREE.Fog(0x1a0a05, 30, 120);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

    // === Освещение (военное — красно-оранжевое) ===
    const ambient = new THREE.AmbientLight(0x221510, 0.4);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x331a11, 0x0a0505, 0.5);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xcc7744, 0.8);
    dirLight.position.set(30, 40, -20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // === ЗЕМЛЯ ===
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 0.3, 200), groundMat);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    // Дорога
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 200), roadMat);
    road.position.y = 0.02;
    scene.add(road);

    // === ЗДАНИЯ (как в игре — неоновые рёбра, тёмные стены) ===
    const wallMats = [
      new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.5, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x1a2020, roughness: 0.5, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x201a1a, roughness: 0.5, metalness: 0.4 }),
    ];
    const glowColors = [0x22ccff, 0xff2266, 0x22ffcc, 0xcc44ff, 0xff8800];

    interface Building { mesh: THREE.Group; x: number; z: number; w: number; d: number; h: number; damaged: boolean; }
    const buildingList: Building[] = [];

    for (let i = 0; i < 20; i++) {
      const bw = 6 + Math.random() * 10;
      const bd = 6 + Math.random() * 10;
      const bh = 8 + Math.random() * 25;
      const bx = (Math.random() - 0.5) * 140;
      const bz = (Math.random() - 0.5) * 140;

      // Не ставить на дороге
      if (Math.abs(bx) < 10) continue;

      const bGroup = new THREE.Group();
      const wMat = wallMats[i % wallMats.length];
      const glowColor = glowColors[i % glowColors.length];
      const edgeMat = new THREE.MeshBasicMaterial({ color: glowColor });

      // Стены
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wMat);
      body.position.y = bh / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      bGroup.add(body);

      // Неоновые рёбра
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, 0.06), edgeMat);
          edge.position.set(cx * (bw / 2), bh / 2, cz * (bd / 2));
          bGroup.add(edge);
        }
      }

      // Горизонтальные неоновые полосы
      for (let hy = 3; hy < bh; hy += 3) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.5, 0.04, 0.04), edgeMat);
        strip.position.set(0, hy, bd / 2 + 0.02);
        bGroup.add(strip);
      }

      // Окна
      const winMat = new THREE.MeshStandardMaterial({
        color: 0x88bbdd, emissive: 0x224466, emissiveIntensity: 0.3,
        roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.4,
      });
      for (let wy = 2; wy < bh - 2; wy += 4) {
        for (let wx = -bw / 2 + 2; wx < bw / 2 - 1; wx += 3) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), winMat);
          win.position.set(wx, wy, bd / 2 + 0.05);
          bGroup.add(win);
        }
      }

      bGroup.position.set(bx, 0, bz);
      scene.add(bGroup);

      const damaged = Math.random() > 0.5;
      buildingList.push({ mesh: bGroup, x: bx, z: bz, w: bw, d: bd, h: bh, damaged });
    }

    // === ОГНИ ПОЖАРОВ ===
    interface Fire { light: THREE.PointLight; flames: THREE.Mesh[]; x: number; z: number; }
    const fires: Fire[] = [];
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 });
    const fireCoreMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 2.0, transparent: true, opacity: 0.85 });

    for (let i = 0; i < 8; i++) {
      const fx = (Math.random() - 0.5) * 80;
      const fz = (Math.random() - 0.5) * 80;
      const light = new THREE.PointLight(0xff4400, 3, 20);
      light.position.set(fx, 3, fz);
      scene.add(light);

      const flames: THREE.Mesh[] = [];
      for (let f = 0; f < 3; f++) {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5 + Math.random() * 0.5, 2 + Math.random() * 2, 6), f === 0 ? fireCoreMat : fireMat);
        flame.position.set(fx + (Math.random() - 0.5) * 2, 1 + Math.random(), fz + (Math.random() - 0.5) * 2);
        scene.add(flame);
        flames.push(flame);
      }
      fires.push({ light, flames, x: fx, z: fz });
    }

    // === ДЫМЫ ===
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.25 });
    const smokes: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 3, 6, 6), smokeMat);
      smoke.position.set(
        (Math.random() - 0.5) * 80,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 80
      );
      scene.add(smoke);
      smokes.push(smoke);
    }

    // === КОСОРЫ (враги — как в игре) ===
    function createDroid(): THREE.Group {
      const d = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.6 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a3a20, roughness: 0.7 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.8 });
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.6 });

      // Тело
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), bodyMat);
      torso.position.y = 1.1;
      torso.castShadow = true;
      d.add(torso);

      // Голова
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), bodyMat);
      head.position.y = 1.55;
      d.add(head);

      // Глаза
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
        eye.position.set(s * 0.08, 1.58, 0.13);
        d.add(eye);
      }

      // Антенна
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4), darkMat);
      antenna.position.set(0, 1.78, 0);
      d.add(antenna);

      // Ноги
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.1, 0.75, 0);
      const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6), darkMat);
      thighL.position.y = -0.2;
      leftLeg.add(thighL);
      const shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.4, 6), darkMat);
      shinL.position.y = -0.55;
      leftLeg.add(shinL);
      d.add(leftLeg);

      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.1, 0.75, 0);
      const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6), darkMat);
      thighR.position.y = -0.2;
      rightLeg.add(thighR);
      const shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.4, 6), darkMat);
      shinR.position.y = -0.55;
      rightLeg.add(shinR);
      d.add(rightLeg);

      // Бластер
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), gunMat);
      gun.position.set(0.3, 1.1, 0.2);
      d.add(gun);

      (d as any).leftLeg = leftLeg;
      (d as any).rightLeg = rightLeg;
      (d as any).gun = gun;

      return d;
    }

    interface DroidData { mesh: THREE.Group; x: number; z: number; speed: number; phase: number; shootTimer: number; }
    const droidList: DroidData[] = [];
    for (let i = 0; i < 15; i++) {
      const mesh = createDroid();
      const x = -70 - i * 6;
      const z = -3 + (Math.random() - 0.5) * 6;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = Math.PI / 2; // смотрят вправо
      scene.add(mesh);
      droidList.push({ mesh, x, z, speed: 4 + Math.random() * 2, phase: Math.random() * Math.PI * 2, shootTimer: 1 + Math.random() * 2 });
    }

    // === БЛАСТЕРНЫЕ ВЫСТРЕЛЫ ===
    interface BoltData { mesh: THREE.Mesh; vx: number; vz: number; life: number; }
    const boltList: BoltData[] = [];
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

    // === К-2SO ===
    function createK2SO(): THREE.Group {
      const k = new THREE.Group();
      const bodyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.4, metalness: 0.5 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.3, metalness: 0.6 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.3, metalness: 0.7 });
      const eyeMat2 = new THREE.MeshStandardMaterial({ color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 1.0 });

      // Тело
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), bodyMat2);
      torso.position.y = 1.3;
      torso.castShadow = true;
      k.add(torso);

      // Бронепластина
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.05), panelMat);
      plate.position.set(0, 1.4, 0.2);
      k.add(plate);

      // Плечи
      for (const s of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), panelMat);
        shoulder.position.set(s * 0.38, 1.65, 0);
        k.add(shoulder);
      }

      // Голова
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), bodyMat2);
      head.position.y = 2.0;
      k.add(head);

      // Лицевая пластина
      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.05), panelMat);
      facePlate.position.set(0, 2.0, 0.17);
      k.add(facePlate);

      // Глаза
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat2);
        eye.position.set(s * 0.07, 2.03, 0.2);
        k.add(eye);
      }

      // Свет от глаз
      const eyeLight = new THREE.PointLight(0x2288ff, 2, 5);
      eyeLight.position.set(0, 2.0, 0.3);
      k.add(eyeLight);

      // Руки
      for (const s of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(s * 0.45, 1.55, 0);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), bodyMat2);
        upper.position.y = -0.25;
        arm.add(upper);
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), jointMat);
        elbow.position.y = -0.5;
        arm.add(elbow);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.4, 8), bodyMat2);
        lower.position.y = -0.72;
        arm.add(lower);
        k.add(arm);
        if (s === -1) (k as any).leftArm = arm;
        else (k as any).rightArm = arm;
      }

      // Бластер в правой руке
      const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.6 })
      );
      blaster.position.set(0.45, 0.85, 0.2);
      k.add(blaster);

      // Ноги
      for (const s of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(s * 0.12, 0.85, 0);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8), bodyMat2);
        thigh.position.y = -0.25;
        leg.add(thigh);
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), jointMat);
        knee.position.y = -0.52;
        leg.add(knee);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), bodyMat2);
        shin.position.y = -0.77;
        leg.add(shin);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.14), panelMat);
        foot.position.set(0, -1.02, 0.02);
        leg.add(foot);
        k.add(leg);
        if (s === -1) (k as any).leftLeg = leg;
        else (k as any).rightLeg = leg;
      }

      return k;
    }

    const k2so = createK2SO();
    k2so.position.set(60, 0, 0);
    k2so.rotation.y = -Math.PI / 2; // смотрит влево
    k2so.visible = false;
    scene.add(k2so);

    // === ВОРОНКИ ===
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    for (let i = 0; i < 6; i++) {
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.5, 0.4, 8), craterMat);
      crater.position.set((Math.random() - 0.5) * 40, -0.1, (Math.random() - 0.5) * 40);
      scene.add(crater);
    }

    // === ОБЛОМКИ ===
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x3a3830, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 + Math.random() * 1, 0.2 + Math.random() * 0.5, 0.3 + Math.random() * 0.8),
        debrisMat
      );
      debris.position.set((Math.random() - 0.5) * 60, 0.15, (Math.random() - 0.5) * 60);
      debris.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
      scene.add(debris);
    }

    // === БАРРИКАДЫ ===
    const barricadeMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.7, metalness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.2), barricadeMat);
      bar.position.set(-5 + i * 10, 0.6, 8 + Math.random() * 5);
      bar.rotation.y = Math.random() * 0.5;
      scene.add(bar);
    }

    // === ГОРОЖАНЕ (бегут) ===
    function createCitizen(): THREE.Group {
      const c = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4c5b0, roughness: 0.6 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: [0x00ffff, 0xff00ff, 0x00ff88, 0x3366ff][Math.floor(Math.random() * 4)], roughness: 0.4, emissive: 0x111111, emissiveIntensity: 0.2 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5 });

      // Тело
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.15), shirtMat);
      torso.position.y = 1.15;
      c.add(torso);

      // Голова
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skinMat);
      head.position.y = 1.5;
      head.rotation.x = 0.2; // пригнута
      c.add(head);

      // Ноги
      const ll = new THREE.Group();
      ll.position.set(-0.06, 0.9, 0);
      ll.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.5, 6), pantsMat));
      (ll.children[0] as THREE.Mesh).position.y = -0.25;
      c.add(ll);
      const rl = new THREE.Group();
      rl.position.set(0.06, 0.9, 0);
      rl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.5, 6), pantsMat));
      (rl.children[0] as THREE.Mesh).position.y = -0.25;
      c.add(rl);

      // Руки подняты
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), shirtMat);
        arm.position.set(s * 0.18, 1.35, 0);
        arm.rotation.z = s * -2.2;
        c.add(arm);
      }

      (c as any).leftLeg = ll;
      (c as any).rightLeg = rl;
      return c;
    }

    interface CitizenData { mesh: THREE.Group; speed: number; phase: number; }
    const citizenList: CitizenData[] = [];
    for (let i = 0; i < 10; i++) {
      const mesh = createCitizen();
      mesh.position.set(5 + i * 4 + Math.random() * 3, 0, -2 + (Math.random() - 0.5) * 8);
      mesh.rotation.y = Math.PI / 2; // бегут вправо
      mesh.rotation.x = 0.15; // наклон вперёд
      mesh.visible = false;
      scene.add(mesh);
      citizenList.push({ mesh, speed: 4 + Math.random() * 3, phase: Math.random() * Math.PI * 2 });
    }

    // === АНИМАЦИЯ ===
    const startTime = performance.now();
    const TOTAL = 22000;
    const clock = new THREE.Clock();

    function showText(text: string, size: number, color: string) {
      titleEl.style.fontSize = size + 'px';
      titleEl.style.color = color;
      titleEl.innerHTML = text;
      titleEl.style.opacity = '1';
    }
    function hideText() {
      titleEl.style.opacity = '0';
    }

    let prevPhase = -1;

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = elapsed / 1000;
      const dt = clock.getDelta();

      if (skipped || elapsed > TOTAL) {
        // Очистка
        renderer.dispose();
        overlay.remove();
        window.removeEventListener('keydown', skipHandler);
        window.removeEventListener('click', skipHandler);
        resolve();
        return;
      }

      // === КАМЕРА ===
      // 0-4: Панорама мирного города сверху
      // 4-10: Камера следит за наступлением косоров
      // 10-14: Камера на горожанах
      // 14-19: Камера на К-2SO
      // 19-22: Финал

      if (t < 4) {
        // Панорама сверху
        const a = t / 4;
        camera.position.set(-20 + a * 10, 20 - a * 5, 30 - a * 10);
        camera.lookAt(0, 5, 0);
      } else if (t < 10) {
        // Следим за косорами сбоку
        const a = (t - 4) / 6;
        const leadDroid = droidList[0];
        camera.position.set(leadDroid.x - 5, 3, leadDroid.z + 10 - a * 5);
        camera.lookAt(leadDroid.x + 5, 1.5, leadDroid.z);
      } else if (t < 14) {
        // Камера на горожанах
        const a = (t - 10) / 4;
        camera.position.set(15 + a * 10, 2.5, 8);
        camera.lookAt(20 + a * 10, 1, 0);
      } else if (t < 19) {
        // Камера на К-2SO — эпичный вход
        const a = (t - 14) / 5;
        camera.position.set(k2so.position.x + 4 - a * 2, 1.5 + a * 0.5, 4 - a * 2);
        camera.lookAt(k2so.position.x, 1.5, 0);
      } else {
        // Финальный план — К-2SO крупно
        camera.position.set(k2so.position.x + 2, 2, 2.5);
        camera.lookAt(k2so.position.x, 1.8, 0);
      }

      // === ФАЗЫ ===

      // Фаза 1 (0-4): Мирный город
      if (t >= 1.5 && t < 3.5 && prevPhase < 1) {
        prevPhase = 1;
        showText('НейроСити — 2148<br><span style="font-size:20px;color:#667788">Мирная ночь...</span>', 40, '#88aacc');
      }
      if (t >= 3.5 && prevPhase === 1) { hideText(); prevPhase = 2; }

      // Фаза 2 (4-10): Косоры атакуют
      if (t >= 4) {
        for (const d of droidList) {
          if (d.x < 40) d.x += d.speed * dt;
          d.mesh.position.x = d.x;

          // Анимация ног
          const swing = Math.sin(t * 8 + d.phase) * 0.5;
          const ll = (d.mesh as any).leftLeg as THREE.Group;
          const rl = (d.mesh as any).rightLeg as THREE.Group;
          if (ll) ll.rotation.x = swing;
          if (rl) rl.rotation.x = -swing;

          // Стрельба
          d.shootTimer -= dt;
          if (d.shootTimer <= 0 && d.x > -30 && d.x < 35) {
            d.shootTimer = 0.3 + Math.random() * 0.6;
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), boltMat);
            bolt.position.set(d.x + 0.3, 1.1, d.z + 0.2);
            bolt.rotation.y = Math.PI / 2;
            scene.add(bolt);
            boltList.push({ mesh: bolt, vx: 30 + Math.random() * 10, vz: (Math.random() - 0.5) * 5, life: 0 });
          }
        }
      }
      if (t >= 4.5 && t < 7 && prevPhase < 3) {
        prevPhase = 3;
        showText('Косоры атакуют город...', 34, '#cc3322');
      }
      if (t >= 7 && prevPhase === 3) { hideText(); prevPhase = 4; }

      // Фаза 3 (8-14): Горожане бегут
      if (t >= 8) {
        for (const c of citizenList) {
          c.mesh.visible = true;
          c.mesh.position.x += c.speed * dt;

          // Анимация ног
          const swing = Math.sin(t * 12 + c.phase) * 0.6;
          const ll = (c.mesh as any).leftLeg as THREE.Group;
          const rl = (c.mesh as any).rightLeg as THREE.Group;
          if (ll) ll.rotation.x = swing;
          if (rl) rl.rotation.x = -swing;
        }
      }
      if (t >= 9 && t < 12 && prevPhase < 5) {
        prevPhase = 5;
        showText('Город захвачен<br><span style="font-size:20px;color:#884422">Надежды нет...</span>', 36, '#ff4400');
      }
      if (t >= 12 && prevPhase === 5) { hideText(); prevPhase = 6; }

      // Фаза 4 (13-19): К-2SO появляется
      if (t >= 13) {
        k2so.visible = true;
        if (k2so.position.x > 15) {
          k2so.position.x -= 8 * dt;
          // Анимация ходьбы
          const swing = Math.sin(t * 5) * 0.4;
          const ll = (k2so as any).leftLeg as THREE.Group;
          const rl = (k2so as any).rightLeg as THREE.Group;
          const la = (k2so as any).leftArm as THREE.Group;
          const ra = (k2so as any).rightArm as THREE.Group;
          if (ll) ll.rotation.x = swing;
          if (rl) rl.rotation.x = -swing;
          if (la) la.rotation.x = -swing * 0.5;
          if (ra) ra.rotation.x = swing * 0.5;
        }

        // Косоры останавливаются
        for (const d of droidList) {
          d.speed = Math.max(0, d.speed - 2 * dt);
        }
      }
      if (t >= 13.5 && t < 16 && prevPhase < 7) {
        prevPhase = 7;
        showText('Но один робот не сдался', 30, '#2288ff');
      }
      if (t >= 16 && prevPhase === 7) { hideText(); prevPhase = 8; }

      // Фаза 5 (17-21): Название
      if (t >= 17 && t < 21 && prevPhase < 9) {
        prevPhase = 9;
        showText('УБОЙНЫЙ<br>РОБОТ', 80, '#ff4400');
      }
      if (t >= 21 && prevPhase === 9) { hideText(); prevPhase = 10; }

      // === Снаряды ===
      for (let i = boltList.length - 1; i >= 0; i--) {
        const b = boltList[i];
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.z += b.vz * dt;
        b.life += dt;
        if (b.life > 1.5) {
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          boltList.splice(i, 1);
        }
      }

      // === Огни пожаров — мерцание ===
      for (const f of fires) {
        f.light.intensity = 2.5 + Math.sin(t * 8 + f.x) * 1.5;
        for (const fl of f.flames) {
          fl.scale.y = 0.8 + Math.sin(t * 10 + fl.position.x * 3) * 0.3;
          fl.scale.x = 0.85 + Math.sin(t * 12 + fl.position.z * 2) * 0.15;
        }
      }

      // === Дым — медленно поднимается ===
      for (const s of smokes) {
        s.position.y += 0.3 * dt;
        if (s.position.y > 25) s.position.y = 4;
        s.scale.x = 1 + Math.sin(t * 0.5 + s.position.x) * 0.2;
      }

      // === Затемнение ===
      if (t > 20.5) {
        const fade = Math.min((t - 20.5) / 1.5, 1);
        scene.fog = new THREE.Fog(0x000000, 5, 120 - fade * 110);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  });
}
