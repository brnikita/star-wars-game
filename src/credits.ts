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
      { type: 'subtitle', text: '«Вероятность того, что вам понравилось —' },
      { type: 'subtitle', text: 'недостаточно данных для подсчёта.»' },
      { type: 'gap', text: '' },
      { type: 'detail', text: '— К-2SO' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },
      { type: 'gap', text: '' },

      { type: 'title', text: 'УБОЙНЫЙ РОБОТ' },
      { type: 'subtitle', text: '2148' },
    ];

    // Стили для типов
    const styles: Record<string, string> = {
      title: 'font-size:48px;color:#ff4400;letter-spacing:8px;margin:10px 0;text-shadow:0 0 20px rgba(255,68,0,0.5);',
      subtitle: 'font-size:24px;color:#88aacc;margin:5px 0;',
      heading: 'font-size:16px;color:#556677;letter-spacing:6px;text-transform:uppercase;margin:30px 0 15px 0;border-bottom:1px solid #333;padding-bottom:8px;',
      role: 'font-size:20px;color:#2288ff;margin:5px 0;',
      name: 'font-size:20px;color:#cccccc;margin:4px 0;',
      detail: 'font-size:16px;color:#777777;margin:3px 0;font-style:italic;',
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

    const totalCreditsH = creditsContainer.scrollHeight + H;
    const scrollSpeed = 50; // пикселей в секунду
    const TOTAL = (totalCreditsH / scrollSpeed) * 1000;

    const startTime = performance.now();

    function frame() {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = elapsed / 1000;

      if (skipped || elapsed > TOTAL) {
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

      // Плавное появление и исчезновение
      if (t < 1) {
        overlay.style.opacity = String(t);
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}
