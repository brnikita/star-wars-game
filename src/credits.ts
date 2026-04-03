/**
 * Титры — прокрутка снизу вверх на чёрном фоне со звёздами
 */
export function playCredits(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000;overflow:hidden;';
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
    skipHint.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#444;font-size:13px;font-family:Arial,sans-serif;z-index:10001;';
    overlay.appendChild(skipHint);

    // Canvas для звёзд
    const canvas = document.createElement('canvas');
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    // Звёзды
    const stars: { x: number; y: number; size: number; speed: number; bright: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        speed: 0.1 + Math.random() * 0.3,
        bright: Math.random(),
      });
    }

    // Контейнер титров (прокручивается)
    const creditsContainer = document.createElement('div');
    creditsContainer.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:600px;max-width:90%;text-align:center;font-family:Arial,sans-serif;z-index:10000;';
    creditsContainer.style.top = H + 'px'; // начинается ниже экрана
    overlay.appendChild(creditsContainer);

    // Содержимое титров
    const credits = [
      { type: 'title', text: 'УБОЙНЫЙ РОБОТ' },
      { type: 'gap', text: '' },
      { type: 'subtitle', text: 'НейроСити — 2148' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ИСТОРИЯ' },
      { type: 'name', text: 'К-2SO — Убойный Робот' },
      { type: 'name', text: 'R-111 — Боевой Косор' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ПЕРСОНАЖИ' },
      { type: 'role', text: 'К-2SO' },
      { type: 'name', text: 'Списанный охранник. Убойный робот.' },
      { type: 'gap', text: '' },
      { type: 'role', text: 'R-111' },
      { type: 'name', text: 'Боевой косор без ограничителей' },
      { type: 'gap', text: '' },
      { type: 'role', text: 'Косоры серии B-7' },
      { type: 'name', text: 'Армия вторжения' },
      { type: 'gap', text: '' },
      { type: 'role', text: 'Горожане НейроСити' },
      { type: 'name', text: 'Те, кого нужно спасти' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ЛОКАЦИИ' },
      { type: 'name', text: 'НейроСити — 2148' },
      { type: 'detail', text: '9 районов футуристического города' },
      { type: 'gap', text: '' },
      { type: 'name', text: 'Небоскрёб Ныжи' },
      { type: 'detail', text: '80 метров стекла и неона' },
      { type: 'gap', text: '' },
      { type: 'name', text: 'Заброшенное метро' },
      { type: 'detail', text: 'Последний бункер R-111' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'СКИНЫ' },
      { type: 'name', text: 'К-2SO — Стандарт' },
      { type: 'name', text: 'Убойный робот — Красные глаза' },
      { type: 'name', text: 'Бобр — Коричневый мех' },
      { type: 'name', text: 'Скелет — Белые кости' },
      { type: 'name', text: 'Пряник — Сладкий убийца' },
      { type: 'name', text: 'Розовый робот — Гламур' },
      { type: 'name', text: 'Голубой заяц — Ушастый боец' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ВООРУЖЕНИЕ' },
      { type: 'name', text: 'Бластер E-11' },
      { type: 'detail', text: '30 зарядов, перезарядка 1.5 сек' },
      { type: 'gap', text: '' },
      { type: 'name', text: 'Ближний бой' },
      { type: 'detail', text: '40 урона, отбрасывание' },
      { type: 'gap', text: '' },
      { type: 'name', text: 'Реактивный ранец' },
      { type: 'detail', text: 'Пламя из-под ступней' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ВРАГИ' },
      { type: 'role', text: 'Косор B-7' },
      { type: 'detail', text: '60 HP • Бластер • Точность 60%' },
      { type: 'gap', text: '' },
      { type: 'role', text: 'Турель' },
      { type: 'detail', text: '120 HP • Тяжёлое орудие • Точность 80%' },
      { type: 'gap', text: '' },
      { type: 'role', text: 'R-111' },
      { type: 'detail', text: '500 HP • Красные снаряды • Точность 85%' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'РАЗРАБОТЧИК' },
      { type: 'name', text: 'Илья Брагин' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ТЕХНОЛОГИИ' },
      { type: 'name', text: 'Three.js — 3D движок' },
      { type: 'name', text: 'cannon-es — Физика' },
      { type: 'name', text: 'TypeScript — Язык' },
      { type: 'name', text: 'Web Audio API — Звук' },
      { type: 'name', text: 'SpeechSynthesis — Голос К-2SO' },
      { type: 'name', text: 'Vite — Сборка' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'heading', text: 'ОСОБАЯ БЛАГОДАРНОСТЬ' },
      { type: 'name', text: 'Все процедурные модели' },
      { type: 'name', text: 'созданы без внешних ассетов' },
      { type: 'gap', text: '' },
      { type: 'name', text: 'Каждый полигон — вручную' },
      { type: 'name', text: 'Каждый звук — из осцилляторов' },
      { type: 'name', text: 'Каждый город — из кода' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'title', text: 'СПАСИБО ЗА ИГРУ' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'subtitle', text: '«Вероятность того, что вам понравилось —' },
      { type: 'subtitle', text: 'недостаточно данных для подсчёта.»' },
      { type: 'gap', text: '' },
      { type: 'detail', text: '— К-2SO' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'detail', text: 'НейроСити — 2148' },
      { type: 'detail', text: 'Город, который стоит того, чтобы его спасти' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'title', text: 'УБОЙНЫЙ РОБОТ' },
      { type: 'subtitle', text: '2148' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
    ];

    // Стили для типов
    const styles: Record<string, string> = {
      title: 'font-size:48px;color:#ff4400;letter-spacing:8px;margin:10px 0;text-shadow:0 0 20px rgba(255,68,0,0.5);',
      subtitle: 'font-size:24px;color:#88aacc;margin:5px 0;',
      heading: 'font-size:16px;color:#556677;letter-spacing:6px;text-transform:uppercase;margin:30px 0 15px 0;border-bottom:1px solid #333;padding-bottom:8px;',
      role: 'font-size:20px;color:#2288ff;margin:5px 0;',
      name: 'font-size:20px;color:#cccccc;margin:4px 0;',
      detail: 'font-size:16px;color:#777777;margin:3px 0;font-style:italic;',
      song: 'font-size:22px;color:#aabbdd;margin:6px 0;font-style:italic;text-shadow:0 0 10px rgba(100,150,255,0.3);',
      gap: 'height:25px;',
    };

    for (const c of credits) {
      const el = document.createElement('div');
      el.style.cssText = styles[c.type] || '';
      if (c.type === 'gap') {
        // пустая строка
      } else {
        el.textContent = c.text;
      }
      creditsContainer.appendChild(el);
    }

    const TOTAL_SEC = 180; // 3 минуты
    const TOTAL = TOTAL_SEC * 1000;
    const totalCreditsH = creditsContainer.scrollHeight + H * 2;
    const scrollSpeed = totalCreditsH / TOTAL_SEC;

    // === МУЗЫКА — победоносная, эпическая ===
    let audioCtx: AudioContext | null = null;
    function startMusic() {
      audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const ctx = audioCtx;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);

      const C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392, A4=440, B4=493.88;
      const C5=523.25, D5=587.33, E5=659.25, G5=784;

      // Победоносная мелодия (фанфары + марш)
      const melody: [number, number][] = [
        // Фанфары
        [C5, 0.3], [C5, 0.3], [C5, 0.3], [G4, 0.6],
        [A4, 0.3], [A4, 0.3], [A4, 0.3], [E4, 0.6],
        [F4, 0.3], [G4, 0.3], [A4, 0.3], [B4, 0.3], [C5, 0.8], [0, 0.3],
        // Тема победы
        [E5, 0.5], [D5, 0.25], [C5, 0.25], [D5, 0.5], [E5, 0.5],
        [C5, 0.5], [G4, 0.5], [A4, 0.75], [0, 0.25],
        [D5, 0.5], [C5, 0.25], [B4, 0.25], [C5, 0.5], [D5, 0.5],
        [B4, 0.5], [G4, 0.5], [A4, 0.75], [0, 0.25],
        // Героический подъём
        [C5, 0.4], [D5, 0.4], [E5, 0.4], [G5, 0.8],
        [E5, 0.4], [D5, 0.4], [C5, 0.4], [E5, 0.8],
        [G4, 0.3], [A4, 0.3], [B4, 0.3], [C5, 0.3], [D5, 0.3], [E5, 0.3], [G5, 1.2], [0, 0.4],
        // Триумф
        [C5, 0.6], [E5, 0.6], [G5, 1.0], [0, 0.3],
        [E5, 0.3], [C5, 0.3], [G4, 0.3], [C5, 1.0], [0, 0.5],
      ];

      // Мощные аккорды (духовые)
      const chords: [number[], number][] = [
        [[C4, E4, G4], 3], [[F4, A4, C5], 3],
        [[G4, B4, D5], 3], [[C4, E4, G4], 3],
        [[A4, C5, E5], 3], [[F4, A4, C5], 3],
        [[G4, B4, D5], 3], [[C4, E4, C5], 3],
      ];

      // Мелодия в цикле
      const melodyDur = melody.reduce((a, [, d]) => a + d, 0);
      for (let loop = 0; loop < TOTAL_SEC; loop += melodyDur) {
        let t = loop;
        for (const [freq, dur] of melody) {
          if (t > TOTAL_SEC) break;
          if (freq > 0) {
            // Труба (sawtooth + фильтр)
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = freq * 3;
            filt.Q.value = 1;
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, now + t);
            env.gain.linearRampToValueAtTime(0.12, now + t + 0.04);
            env.gain.setValueAtTime(0.1, now + t + dur * 0.7);
            env.gain.linearRampToValueAtTime(0, now + t + dur);
            osc.connect(filt);
            filt.connect(env);
            env.connect(master);
            osc.start(now + t);
            osc.stop(now + t + dur + 0.01);

            // Октава (тихо)
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.value = freq * 2;
            const env2 = ctx.createGain();
            env2.gain.setValueAtTime(0, now + t);
            env2.gain.linearRampToValueAtTime(0.03, now + t + 0.04);
            env2.gain.linearRampToValueAtTime(0, now + t + dur);
            osc2.connect(env2);
            env2.connect(master);
            osc2.start(now + t);
            osc2.stop(now + t + dur + 0.01);
          }
          t += dur;
        }
      }

      // Аккорды (мощные, духовые)
      const chordDur = chords.reduce((a, [, d]) => a + d, 0);
      for (let loop = 0; loop < TOTAL_SEC; loop += chordDur) {
        let t = loop;
        for (const [freqs, dur] of chords) {
          if (t > TOTAL_SEC) break;
          for (const freq of freqs) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, now + t);
            env.gain.linearRampToValueAtTime(0.06, now + t + 0.3);
            env.gain.setValueAtTime(0.05, now + t + dur * 0.8);
            env.gain.linearRampToValueAtTime(0, now + t + dur);
            osc.connect(env);
            env.connect(master);
            osc.start(now + t);
            osc.stop(now + t + dur + 0.01);
          }
          t += dur;
        }
      }

      // Маршевые барабаны
      for (let t = 0; t < TOTAL_SEC; t += 0.75) {
        const isStrong = Math.floor(t / 0.75) % 4 === 0;
        // Бас-барабан
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(isStrong ? 100 : 80, now + t);
        kick.frequency.exponentialRampToValueAtTime(30, now + t + 0.15);
        const kEnv = ctx.createGain();
        kEnv.gain.setValueAtTime(isStrong ? 0.15 : 0.08, now + t);
        kEnv.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
        kick.connect(kEnv);
        kEnv.connect(master);
        kick.start(now + t);
        kick.stop(now + t + 0.2);

        // Малый барабан (каждый 2-й удар)
        if (Math.floor(t / 0.75) % 2 === 1) {
          const snBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
          const snData = snBuf.getChannelData(0);
          for (let i = 0; i < snData.length; i++) {
            snData[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate * 30);
          }
          const sn = ctx.createBufferSource();
          sn.buffer = snBuf;
          const snEnv = ctx.createGain();
          snEnv.gain.setValueAtTime(0.08, now + t);
          snEnv.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
          const snFilt = ctx.createBiquadFilter();
          snFilt.type = 'highpass';
          snFilt.frequency.value = 2000;
          sn.connect(snFilt);
          snFilt.connect(snEnv);
          snEnv.connect(master);
          sn.start(now + t);
        }
      }

      // Тарелки (каждые 3 секунды)
      for (let t = 0; t < TOTAL_SEC; t += 3) {
        const cymBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const cymData = cymBuf.getChannelData(0);
        for (let i = 0; i < cymData.length; i++) {
          cymData[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate * 5);
        }
        const cym = ctx.createBufferSource();
        cym.buffer = cymBuf;
        const cymEnv = ctx.createGain();
        cymEnv.gain.setValueAtTime(0.04, now + t);
        cymEnv.gain.exponentialRampToValueAtTime(0.001, now + t + 0.4);
        const cymFilt = ctx.createBiquadFilter();
        cymFilt.type = 'highpass';
        cymFilt.frequency.value = 6000;
        cym.connect(cymFilt);
        cymFilt.connect(cymEnv);
        cymEnv.connect(master);
        cym.start(now + t);
      }

      // Суб-бас пэд
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = C4 / 4;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.05;
      sub.connect(subGain);
      subGain.connect(master);
      sub.start(now);
      sub.stop(now + TOTAL_SEC);
    }

    const startTime = performance.now();

    // Запускаем музыку
    try { startMusic(); } catch (_e) { /* ok */ }

    function frame() {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = elapsed / 1000;

      if (skipped || elapsed > TOTAL) {
        if (audioCtx) { audioCtx.close().catch(() => {}); }
        overlay.style.transition = 'opacity 1s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', skipHandler);
          window.removeEventListener('click', skipHandler);
          resolve();
        }, 1000);
        return;
      }

      // Звёзды
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.y += s.speed;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        const twinkle = 0.4 + Math.sin(t * 2 + s.bright * 8) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      // Прокрутка титров
      const scrollY = H - t * scrollSpeed;
      creditsContainer.style.top = scrollY + 'px';

      // Плавное появление
      if (t < 1) overlay.style.opacity = String(t);

      // Плавное затемнение в конце
      if (t > TOTAL_SEC - 3) {
        const fade = 1 - (t - (TOTAL_SEC - 3)) / 3;
        overlay.style.opacity = String(Math.max(0, fade));
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}
