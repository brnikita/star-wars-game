import * as THREE from 'three';

/**
 * Финальная 3D-заставка — К-2SO побеждает R-111 в заброшенном метро
 */
export function playOutro(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000;';
    document.body.appendChild(overlay);

    // Пропуск
    let skipped = false;
    let canSkip = false;
    setTimeout(() => { canSkip = true; }, 2000);
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
    titleEl.style.cssText = 'color:#fff;font-family:Arial,sans-serif;font-weight:bold;text-align:center;text-shadow:0 0 20px rgba(0,0,0,0.9),0 0 40px rgba(0,0,0,0.7);transition:opacity 0.8s;opacity:0;';
    textDiv.appendChild(titleEl);

    // === Three.js ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    overlay.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;position:absolute;top:0;left:0;';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080604);
    scene.fog = new THREE.Fog(0x0e0c08, 10, 60);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

    // === ЗАБРОШЕННОЕ МЕТРО ===
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x3a3832, roughness: 0.95 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x6b6558, roughness: 0.7 });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.9, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0c, roughness: 0.95 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.95 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a2a22, roughness: 0.1, transparent: true, opacity: 0.4 });
    const cobwebMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.1 });

    const stationLen = 60;
    const stationW = 15;
    const ceilingH = 6;

    // Пол (пути)
    const trackBed = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, stationLen), darkMat);
    trackBed.position.set(0, -0.15, 0);
    trackBed.receiveShadow = true;
    scene.add(trackBed);

    // Вода на путях
    const water = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, stationLen - 5), waterMat);
    water.position.set(0, 0.02, 0);
    scene.add(water);

    // Платформы
    for (const px of [-9, 9]) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(6, 1, stationLen), tileMat);
      plat.position.set(px, 0.5, 0);
      plat.receiveShadow = true;
      scene.add(plat);
    }

    // Потолок
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(stationW * 2, 0.5, stationLen + 10), concreteMat);
    ceiling.position.set(0, ceilingH + 0.25, 0);
    scene.add(ceiling);

    // Стены
    for (const ws of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, ceilingH, stationLen + 10), concreteMat);
      wall.position.set(ws * stationW, ceilingH / 2, 0);
      scene.add(wall);

      // Облупившаяся плитка
      for (let z = -stationLen / 2 + 3; z < stationLen / 2 - 3; z += 5) {
        if (Math.random() > 0.4) {
          const tile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5 + Math.random(), 1.5 + Math.random() * 2),
            Math.random() > 0.5 ? new THREE.MeshStandardMaterial({ color: 0x1a3344, roughness: 0.6 }) : concreteMat);
          tile.position.set(ws * (stationW - 0.3), 2 + Math.random() * 2, z);
          scene.add(tile);
        }
      }

      // Мох
      for (let z = -stationLen / 2 + 5; z < stationLen / 2 - 5; z += 7) {
        if (Math.random() > 0.5) {
          const moss = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.5 + Math.random()), mossMat);
          moss.position.set(ws * (stationW - 0.28), 0.5, z);
          scene.add(moss);
        }
      }
    }

    // Торцевые стены
    for (const zs of [-1, 1]) {
      const endWall = new THREE.Mesh(new THREE.BoxGeometry(stationW * 2, ceilingH, 0.5), concreteMat);
      endWall.position.set(0, ceilingH / 2, zs * (stationLen / 2 + 5));
      scene.add(endWall);
    }

    // Рельсы (ржавые)
    for (const rx of [-3, -2, 2, 3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, stationLen), rustMat);
      rail.position.set(rx, 0.05, 0);
      scene.add(rail);
    }

    // Колонны (некоторые наклонены)
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.75 });
    for (let z = -stationLen / 2 + 5; z < stationLen / 2 - 5; z += 8) {
      for (const cx of [-5, 5]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, ceilingH, 8), columnMat);
        col.position.set(cx, ceilingH / 2, z);
        if (Math.random() > 0.7) col.rotation.z = (Math.random() - 0.5) * 0.08;
        col.castShadow = true;
        scene.add(col);

        // Мох у основания
        if (Math.random() > 0.5) {
          const colMoss = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.4, 6), mossMat);
          colMoss.position.set(cx, 0.2, z);
          scene.add(colMoss);
        }
      }
    }

    // Паутина
    for (let z = -20; z < 20; z += 12) {
      const web = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.5), cobwebMat);
      web.position.set(0, ceilingH - 1, z);
      scene.add(web);
    }

    // Обломки на полу
    for (let i = 0; i < 15; i++) {
      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 + Math.random() * 0.8, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.5),
        concreteMat
      );
      debris.position.set((Math.random() - 0.5) * 8, 0.15, (Math.random() - 0.5) * stationLen * 0.7);
      debris.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
      scene.add(debris);
    }

    // Ржавые бочки
    for (let i = 0; i < 4; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), rustMat);
      barrel.position.set(-8 + i * 5, 1.4, 6 + Math.random() * 3);
      if (Math.random() > 0.5) barrel.rotation.z = Math.PI / 2;
      scene.add(barrel);
    }

    // Разбитый вагон на путях
    const wagonMat = new THREE.MeshStandardMaterial({ color: 0x2a3a3a, roughness: 0.7, metalness: 0.3 });
    const wagonRust = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.85 });
    const wagon = new THREE.Group();
    const wBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 12), wagonMat);
    wBody.position.y = 1.5;
    wagon.add(wBody);
    // Пятна ржавчины
    for (let i = 0; i < 4; i++) {
      const rust = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random(), 0.4 + Math.random() * 0.5, 0.04), wagonRust);
      rust.position.set((Math.random() > 0.5 ? 1 : -1) * 1.42, 1 + Math.random(), -4 + Math.random() * 8);
      wagon.add(rust);
    }
    const wRoof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.15, 12.2), wagonRust);
    wRoof.position.y = 2.8;
    wagon.add(wRoof);
    wagon.position.set(3, 0, -15);
    wagon.rotation.y = 0.04;
    scene.add(wagon);

    // === ОСВЕЩЕНИЕ (тусклое, аварийное) ===
    const ambient2 = new THREE.AmbientLight(0x1a1510, 0.3);
    scene.add(ambient2);
    const hemi = new THREE.HemisphereLight(0x221a11, 0x0a0808, 0.3);
    scene.add(hemi);

    // Аварийные красные огни
    for (let z = -20; z <= 20; z += 15) {
      const eLight = new THREE.PointLight(0xff2200, 0.6, 12);
      eLight.position.set(-14, 3, z);
      scene.add(eLight);
      const eLamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2200 }));
      eLamp.position.set(-14.5, 3, z);
      scene.add(eLamp);
    }

    // Тусклые жёлтые лампы (редкие)
    for (let z = -15; z <= 15; z += 20) {
      const lamp = new THREE.PointLight(0x774422, 1.0, 10);
      lamp.position.set(0, ceilingH - 0.5, z);
      scene.add(lamp);
    }

    // === R-111 (тёмный, большой, бронированный) ===
    function createR111(): THREE.Group {
      const r = new THREE.Group();
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.3, metalness: 0.7 });
      const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x0e0e15, roughness: 0.4, metalness: 0.6 });
      const redEyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
      const redIndicator = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.5 });

      // Тело (массивное)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), armorMat);
      torso.position.y = 1.4;
      torso.castShadow = true;
      r.add(torso);

      // Бронепластины на груди
      for (const s of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.06), darkArmorMat);
        plate.position.set(s * 0.15, 1.5, 0.28);
        r.add(plate);
      }

      // Плечи (массивные)
      for (const s of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), armorMat);
        shoulder.position.set(s * 0.55, 1.8, 0);
        r.add(shoulder);
      }

      // Голова (угловатая, с визором)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.35), armorMat);
      head.position.y = 2.15;
      r.add(head);

      // Глаза (красные)
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), redEyeMat);
        eye.position.set(s * 0.09, 2.18, 0.18);
        r.add(eye);
      }

      // Индикаторы на теле
      for (let i = 0; i < 3; i++) {
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), redIndicator);
        ind.position.set(-0.25, 1.2 + i * 0.15, 0.26);
        r.add(ind);
      }

      // Свет от глаз
      const eyeLight = new THREE.PointLight(0xff0000, 2, 5);
      eyeLight.position.set(0, 2.15, 0.3);
      r.add(eyeLight);

      // Руки (тяжёлые)
      for (const s of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(s * 0.6, 1.7, 0);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8), armorMat);
        upper.position.y = -0.3;
        arm.add(upper);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8), darkArmorMat);
        lower.position.y = -0.7;
        arm.add(lower);
        r.add(arm);
        if (s === -1) (r as any).leftArm = arm;
        else (r as any).rightArm = arm;
      }

      // Пушка на правой руке
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.2, metalness: 0.8 }));
      cannon.position.set(0.6, 0.85, 0.3);
      cannon.rotation.x = Math.PI / 2;
      r.add(cannon);

      // Ноги
      for (const s of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(s * 0.18, 0.9, 0);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8), armorMat);
        thigh.position.y = -0.25;
        leg.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8), darkArmorMat);
        shin.position.y = -0.7;
        leg.add(shin);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.16), armorMat);
        foot.position.set(0, -0.97, 0.02);
        leg.add(foot);
        r.add(leg);
        if (s === -1) (r as any).leftLeg = leg;
        else (r as any).rightLeg = leg;
      }

      return r;
    }

    // === К-2SO ===
    function createK2SO(): THREE.Group {
      const k = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.4, metalness: 0.5 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.3, metalness: 0.6 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.3, metalness: 0.7 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 1.0 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), bodyMat);
      torso.position.y = 1.3; torso.castShadow = true; k.add(torso);

      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.05), panelMat);
      plate.position.set(0, 1.4, 0.2); k.add(plate);

      for (const s of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), panelMat);
        sh.position.set(s * 0.38, 1.65, 0); k.add(sh);
      }

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), bodyMat);
      head.position.y = 2.0; k.add(head);

      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.05), panelMat);
      facePlate.position.set(0, 2.0, 0.17); k.add(facePlate);

      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
        eye.position.set(s * 0.07, 2.03, 0.2); k.add(eye);
      }
      const eyeLight = new THREE.PointLight(0x2288ff, 2, 5);
      eyeLight.position.set(0, 2.0, 0.3); k.add(eyeLight);

      for (const s of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(s * 0.45, 1.55, 0);
        arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), bodyMat));
        (arm.children[0] as THREE.Mesh).position.y = -0.25;
        arm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), jointMat));
        (arm.children[1] as THREE.Mesh).position.y = -0.5;
        arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.4, 8), bodyMat));
        (arm.children[2] as THREE.Mesh).position.y = -0.72;
        k.add(arm);
        if (s === -1) (k as any).leftArm = arm; else (k as any).rightArm = arm;
      }

      for (const s of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(s * 0.12, 0.85, 0);
        leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8), bodyMat));
        (leg.children[0] as THREE.Mesh).position.y = -0.25;
        leg.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), jointMat));
        (leg.children[1] as THREE.Mesh).position.y = -0.52;
        leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8), bodyMat));
        (leg.children[2] as THREE.Mesh).position.y = -0.77;
        leg.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.14), panelMat));
        (leg.children[3] as THREE.Mesh).position.set(0, -1.02, 0.02);
        k.add(leg);
        if (s === -1) (k as any).leftLeg = leg; else (k as any).rightLeg = leg;
      }

      return k;
    }

    const r111 = createR111();
    r111.position.set(0, 0, 8);
    r111.rotation.y = Math.PI;
    scene.add(r111);

    const k2so = createK2SO();
    k2so.position.set(0, 0, -8);
    scene.add(k2so);

    // Бластерные выстрелы
    interface Bolt { mesh: THREE.Mesh; dir: THREE.Vector3; life: number; }
    const bolts: Bolt[] = [];
    const blueBoltMat = new THREE.MeshBasicMaterial({ color: 0x2288ff });
    const redBoltMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    // Искры/обломки
    interface Spark { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number; }
    const sparks: Spark[] = [];
    const sparkMats = [
      new THREE.MeshBasicMaterial({ color: 0xff6600 }),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
      new THREE.MeshBasicMaterial({ color: 0x2288ff }),
    ];

    function spawnSparks(pos: THREE.Vector3, count: number, color: number) {
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05),
          color === 0x2288ff ? sparkMats[2] : (Math.random() > 0.5 ? sparkMats[0] : sparkMats[1]));
        mesh.position.copy(pos);
        scene.add(mesh);
        sparks.push({
          mesh,
          vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5 + 2, (Math.random() - 0.5) * 8),
          life: 0, maxLife: 0.3 + Math.random() * 0.5,
        });
      }
    }

    // Вспышка финального удара
    let flashIntensity = 0;
    const flashLight = new THREE.PointLight(0x2288ff, 0, 30);
    flashLight.position.set(0, 2, 0);
    scene.add(flashLight);

    // === СЦЕНЫ ===
    // 0-4:    Камера показывает метро, R-111 стоит в конце
    // 4-7:    К-2SO входит, они смотрят друг на друга
    // 7-14:   Бой — перестрелка, искры
    // 14-16:  К-2SO наносит финальный удар
    // 16-18:  R-111 падает, искры, взрыв
    // 18-22:  «Победа» + титры
    // 22-25:  Затемнение

    const startTime = performance.now();
    const TOTAL = 25000;
    const clock = new THREE.Clock();

    let r111ShootTimer = 0;
    let k2soShootTimer = 0;
    let r111Fallen = false;
    let r111FallTimer = 0;
    let prevPhase = -1;

    function showText(html: string, size: number, color: string) {
      titleEl.style.fontSize = size + 'px';
      titleEl.style.color = color;
      titleEl.innerHTML = html;
      titleEl.style.opacity = '1';
    }
    function hideText() { titleEl.style.opacity = '0'; }

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = elapsed / 1000;
      const dt = clock.getDelta();

      if (skipped || elapsed > TOTAL) {
        renderer.dispose();
        overlay.remove();
        window.removeEventListener('keydown', skipHandler);
        window.removeEventListener('click', skipHandler);
        resolve();
        return;
      }

      // === КАМЕРА ===
      if (t < 4) {
        // Медленный пролёт по метро
        const a = t / 4;
        camera.position.set(-6 + a * 3, 2.5, -20 + a * 8);
        camera.lookAt(0, 2, 5);
      } else if (t < 7) {
        // Камера между ними
        const a = (t - 4) / 3;
        camera.position.set(5 - a * 2, 2, -2 + a * 2);
        camera.lookAt(0, 1.5, 0);
      } else if (t < 14) {
        // Камера — бой, динамичные ракурсы
        const a = (t - 7) / 7;
        const angle = Math.sin(t * 0.8) * 1.5;
        const dist = 6 + Math.sin(t * 0.5) * 2;
        camera.position.set(Math.sin(angle) * dist, 2 + Math.sin(t * 0.3) * 0.5, Math.cos(angle) * dist);
        camera.lookAt(0, 1.5, a * 2);
      } else if (t < 18) {
        // Финальный удар — крупный план
        camera.position.set(2.5, 1.5, 2);
        camera.lookAt(0, 1.5, 4);
      } else {
        // Камера отъезжает — К-2SO стоит над R-111
        const a = (t - 18) / 4;
        camera.position.set(3 + a * 3, 2 + a * 1.5, -2 - a * 3);
        camera.lookAt(0, 1, 5);
      }

      // === ФАЗА 1 (0-4): Метро, R-111 стоит ===
      if (t >= 1 && t < 3.5 && prevPhase < 0) {
        prevPhase = 0;
        showText('Заброшенное метро<br><span style="font-size:18px;color:#884422">Последний бункер</span>', 32, '#887766');
      }
      if (t >= 3.5 && prevPhase === 0) { hideText(); prevPhase = 1; }

      // === ФАЗА 2 (4-7): К-2SO входит ===
      if (t >= 4 && t < 7) {
        if (k2so.position.z < -2) {
          k2so.position.z += 2 * dt;
          const swing = Math.sin(t * 5) * 0.4;
          const ll = (k2so as any).leftLeg as THREE.Group;
          const rl = (k2so as any).rightLeg as THREE.Group;
          if (ll) ll.rotation.x = swing;
          if (rl) rl.rotation.x = -swing;
        }
      }
      if (t >= 5 && t < 7 && prevPhase < 2) {
        prevPhase = 2;
        showText('К-2SO против R-111', 36, '#2288ff');
      }
      if (t >= 7 && prevPhase === 2) { hideText(); prevPhase = 3; }

      // === ФАЗА 3 (7-14): Перестрелка ===
      if (t >= 7 && t < 14 && !r111Fallen) {
        // R-111 стреляет красным
        r111ShootTimer -= dt;
        if (r111ShootTimer <= 0) {
          r111ShootTimer = 0.4 + Math.random() * 0.3;
          const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), redBoltMat);
          bolt.position.set(r111.position.x + 0.6, 1.5, r111.position.z - 0.3);
          scene.add(bolt);
          bolts.push({ mesh: bolt, dir: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, -20), life: 0 });
        }

        // К-2SO стреляет голубым
        k2soShootTimer -= dt;
        if (k2soShootTimer <= 0) {
          k2soShootTimer = 0.3 + Math.random() * 0.25;
          const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), blueBoltMat);
          bolt.position.set(k2so.position.x, 1.5, k2so.position.z + 0.3);
          scene.add(bolt);
          bolts.push({ mesh: bolt, dir: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, 20), life: 0 });
        }

        // Оба двигаются навстречу
        if (k2so.position.z < 0) k2so.position.z += 0.5 * dt;
        if (r111.position.z > 4) r111.position.z -= 0.3 * dt;

        // Анимация уклонений
        k2so.position.x = Math.sin(t * 2) * 1.5;
        r111.position.x = Math.sin(t * 1.5 + 1) * 1;

        // Искры от попаданий в стены/колонны
        if (Math.random() > 0.85) {
          spawnSparks(new THREE.Vector3((Math.random() - 0.5) * 8, 1 + Math.random() * 3, (Math.random() - 0.5) * 10), 5, 0xff6600);
        }
      }

      // === ФАЗА 4 (14-16): Финальный удар ===
      if (t >= 14 && !r111Fallen) {
        // К-2SO бежит к R-111
        const dz = r111.position.z - k2so.position.z;
        if (dz > 1) {
          k2so.position.z += 8 * dt;
          const swing = Math.sin(t * 10) * 0.6;
          const ll = (k2so as any).leftLeg as THREE.Group;
          const rl = (k2so as any).rightLeg as THREE.Group;
          if (ll) ll.rotation.x = swing;
          if (rl) rl.rotation.x = -swing;
        }

        // Удар
        if (dz <= 1 && t >= 15) {
          r111Fallen = true;
          r111FallTimer = 0;
          flashIntensity = 15;
          spawnSparks(r111.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 30, 0x2288ff);
          spawnSparks(r111.position.clone().add(new THREE.Vector3(0, 1, 0)), 20, 0xff6600);

          // Рука К-2SO вперёд (удар)
          const ra = (k2so as any).rightArm as THREE.Group;
          if (ra) ra.rotation.x = -1.2;
        }
      }

      // === ФАЗА 5 (16+): R-111 падает ===
      if (r111Fallen) {
        r111FallTimer += dt;
        if (r111.rotation.x > -Math.PI / 2) {
          r111.rotation.x -= 1.5 * dt;
          r111.position.y -= 0.5 * dt;
        }
        if (r111.position.y < -0.2) r111.position.y = -0.2;

        // Искры из R-111 при падении
        if (r111FallTimer < 2 && Math.random() > 0.5) {
          spawnSparks(new THREE.Vector3(r111.position.x, 1, r111.position.z), 3, 0xff6600);
        }

        // Красные глаза R-111 гаснут
        r111.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissive && mat.emissive.r > 0.5 && mat.emissive.g < 0.1) {
              mat.emissiveIntensity = Math.max(0, mat.emissiveIntensity - dt * 0.5);
            }
          }
          if (child instanceof THREE.PointLight && child.color.r > 0.5 && child.color.g < 0.1) {
            child.intensity = Math.max(0, child.intensity - dt * 0.8);
          }
        });
      }

      // Вспышка от удара
      if (flashIntensity > 0) {
        flashIntensity -= dt * 12;
        flashLight.intensity = Math.max(0, flashIntensity);
        flashLight.position.set(r111.position.x, 1.5, r111.position.z);
      }

      // === Тексты фаз 4-5 ===
      if (t >= 16 && t < 18.5 && prevPhase < 4) {
        prevPhase = 4;
        showText('R-111 уничтожен', 40, '#ff4400');
      }
      if (t >= 18.5 && prevPhase === 4) { hideText(); prevPhase = 5; }

      if (t >= 19 && t < 23 && prevPhase < 6) {
        prevPhase = 6;
        showText('ПОБЕДА<br><br><span style="font-size:24px;color:#88aacc">К-2SO — Убойный Робот</span><br><span style="font-size:18px;color:#556677">НейроСити спасён</span>', 60, '#2288ff');
      }
      if (t >= 23 && prevPhase === 6) { hideText(); prevPhase = 7; }

      // === Снаряды ===
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.mesh.position.add(b.dir.clone().multiplyScalar(dt));
        b.life += dt;
        if (b.life > 1.2) { scene.remove(b.mesh); b.mesh.geometry.dispose(); bolts.splice(i, 1); }
      }

      // === Искры ===
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.mesh.position.add(s.vel.clone().multiplyScalar(dt));
        s.vel.y -= 12 * dt;
        s.life += dt;
        if (s.life > s.maxLife) { scene.remove(s.mesh); s.mesh.geometry.dispose(); sparks.splice(i, 1); continue; }
        const a = 1 - s.life / s.maxLife;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = a;
        (s.mesh.material as THREE.MeshBasicMaterial).transparent = true;
      }

      // === Затемнение ===
      if (t > 23.5) {
        const fade = Math.min((t - 23.5) / 1.5, 1);
        scene.fog = new THREE.Fog(0x000000, 3, 60 - fade * 55);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  });
}
