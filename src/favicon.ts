/**
 * Генерация favicon — К-2SO прыгает над зданиями, внизу война
 */
export function generateFavicon(): void {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // === ФОН — тёмное небо с красным заревом ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, size);
  skyGrad.addColorStop(0, '#0a0515');
  skyGrad.addColorStop(0.4, '#1a0808');
  skyGrad.addColorStop(0.7, '#2a1005');
  skyGrad.addColorStop(1, '#0a0505');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size, size);

  // === ЗВЁЗДЫ ===
  ctx.fillStyle = '#ffffff';
  const starPositions = [[5, 3], [15, 7], [28, 2], [42, 5], [55, 8], [50, 3], [10, 10], [35, 6], [60, 4]];
  for (const [sx, sy] of starPositions) {
    ctx.fillRect(sx, sy, 1, 1);
  }

  // === ЗДАНИЯ (силуэты) ===
  ctx.fillStyle = '#0e0a14';
  // Здание 1
  ctx.fillRect(2, 30, 8, 28);
  // Здание 2 (высокое)
  ctx.fillRect(11, 22, 6, 36);
  // Здание 3
  ctx.fillRect(18, 34, 10, 24);
  // Здание 4 (небоскрёб)
  ctx.fillRect(29, 18, 5, 40);
  // Здание 5
  ctx.fillRect(35, 32, 8, 26);
  // Здание 6
  ctx.fillRect(44, 26, 6, 32);
  // Здание 7
  ctx.fillRect(51, 30, 7, 28);
  // Здание 8
  ctx.fillRect(59, 34, 5, 24);

  // Окна (жёлтые точки)
  ctx.fillStyle = '#ffaa33';
  const windowPositions = [
    [4, 33], [4, 37], [7, 35], [13, 26], [13, 30], [14, 34],
    [20, 37], [23, 40], [31, 22], [31, 28], [31, 34],
    [37, 36], [40, 40], [46, 30], [47, 34], [53, 34], [55, 38],
  ];
  for (const [wx, wy] of windowPositions) {
    ctx.fillRect(wx, wy, 2, 2);
  }

  // Неоновые рёбра зданий (циан)
  ctx.fillStyle = '#00ccff';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(2, 30, 1, 28);
  ctx.fillRect(10, 30, 1, 28);
  ctx.fillRect(29, 18, 1, 40);
  ctx.fillRect(34, 18, 1, 40);
  ctx.fillRect(44, 26, 1, 32);
  ctx.globalAlpha = 1;

  // === ВОЙНА ВНИЗУ ===
  // Огонь (оранжевые/красные пятна)
  ctx.fillStyle = '#ff4400';
  ctx.globalAlpha = 0.8;
  ctx.fillRect(8, 52, 4, 3);
  ctx.fillRect(22, 50, 5, 4);
  ctx.fillRect(42, 51, 3, 3);
  ctx.fillRect(56, 53, 4, 3);

  // Ядро огня (ярко-жёлтое)
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(9, 53, 2, 2);
  ctx.fillRect(23, 51, 3, 2);
  ctx.fillRect(43, 52, 1, 1);
  ctx.globalAlpha = 1;

  // Дым (серый)
  ctx.fillStyle = '#333333';
  ctx.globalAlpha = 0.4;
  ctx.fillRect(7, 48, 5, 4);
  ctx.fillRect(21, 46, 6, 4);
  ctx.fillRect(41, 48, 4, 3);
  ctx.globalAlpha = 1;

  // Зелёные выстрелы (косоры стреляют)
  ctx.fillStyle = '#00ff44';
  ctx.fillRect(5, 56, 4, 1);
  ctx.fillRect(15, 55, 3, 1);
  ctx.fillRect(38, 57, 4, 1);
  ctx.fillRect(50, 55, 3, 1);

  // Красные взрывы
  ctx.fillStyle = '#ff2200';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(25, 54, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(48, 56, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Земля
  ctx.fillStyle = '#0a0805';
  ctx.fillRect(0, 58, size, 6);

  // === К-2SO (прыгает между зданиями наверху) ===
  const kx = 30;
  const ky = 12;

  // Свечение от глаз (ореол)
  ctx.fillStyle = '#2288ff';
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(kx, ky, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ноги (в прыжке — раздвинуты)
  ctx.fillStyle = '#3a3a44';
  // Левая нога (назад)
  ctx.fillRect(kx - 2, ky + 5, 2, 5);
  ctx.fillRect(kx - 3, ky + 9, 2, 2);
  // Правая нога (вперёд)
  ctx.fillRect(kx + 1, ky + 4, 2, 4);
  ctx.fillRect(kx + 2, ky + 7, 2, 2);

  // Тело
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(kx - 2, ky - 1, 5, 7);

  // Бронепластина
  ctx.fillStyle = '#4a4a55';
  ctx.fillRect(kx - 1, ky, 3, 3);

  // Руки (в прыжке — подняты/раскинуты)
  ctx.fillStyle = '#3a3a44';
  // Левая рука (вверх назад)
  ctx.fillRect(kx - 4, ky - 3, 2, 5);
  // Правая рука (вперёд с бластером)
  ctx.fillRect(kx + 3, ky - 1, 2, 4);
  // Бластер
  ctx.fillStyle = '#555555';
  ctx.fillRect(kx + 5, ky, 3, 1);

  // Голубой выстрел из бластера
  ctx.fillStyle = '#2288ff';
  ctx.fillRect(kx + 8, ky, 5, 1);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(kx + 13, ky, 3, 1);
  ctx.globalAlpha = 1;

  // Голова
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(kx - 1, ky - 5, 4, 4);
  // Лицевая пластина
  ctx.fillStyle = '#4a4a55';
  ctx.fillRect(kx, ky - 4, 2, 2);

  // Глаза (голубые, яркие)
  ctx.fillStyle = '#2288ff';
  ctx.fillRect(kx, ky - 4, 1, 1);
  ctx.fillRect(kx + 2, ky - 4, 1, 1);

  // Свечение глаз
  ctx.fillStyle = '#2288ff';
  ctx.globalAlpha = 0.4;
  ctx.fillRect(kx - 1, ky - 4, 1, 1);
  ctx.fillRect(kx + 3, ky - 4, 1, 1);
  ctx.globalAlpha = 1;

  // === Установить favicon ===
  const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement || document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
  if (!link.parentNode) document.head.appendChild(link);
}
