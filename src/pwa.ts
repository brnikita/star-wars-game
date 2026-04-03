/**
 * PWA: генерация иконок и регистрация Service Worker
 */

/** Генерировать иконку К-2SO на фоне города */
function generateIconDataURL(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const f = size / 64;

  // Фон
  const skyGrad = ctx.createLinearGradient(0, 0, 0, size);
  skyGrad.addColorStop(0, '#0a0515');
  skyGrad.addColorStop(0.4, '#1a0808');
  skyGrad.addColorStop(0.7, '#2a1005');
  skyGrad.addColorStop(1, '#0a0505');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size, size);

  // Здания
  ctx.fillStyle = '#0e0a14';
  [[2,30,8,28],[11,22,6,36],[18,34,10,24],[29,18,5,40],[35,32,8,26],[44,26,6,32],[51,30,7,28],[59,34,5,24]]
    .forEach(([x,y,w,h]) => ctx.fillRect(x*f,y*f,w*f,h*f));

  // Неон
  ctx.fillStyle = '#00ccff'; ctx.globalAlpha = 0.6;
  [[2,30,1,28],[10,30,1,28],[29,18,1,40],[34,18,1,40],[44,26,1,32]]
    .forEach(([x,y,w,h]) => ctx.fillRect(x*f,y*f,w*f,h*f));
  ctx.globalAlpha = 1;

  // Окна
  ctx.fillStyle = '#ffaa33';
  [[4,33],[4,37],[7,35],[13,26],[13,30],[14,34],[20,37],[23,40],[31,22],[31,28],[31,34],[37,36],[40,40],[46,30],[47,34],[53,34],[55,38]]
    .forEach(([x,y]) => ctx.fillRect(x*f,y*f,2*f,2*f));

  // Огонь
  ctx.fillStyle = '#ff4400'; ctx.globalAlpha = 0.8;
  [[8,52,4,3],[22,50,5,4],[42,51,3,3],[56,53,4,3]].forEach(([x,y,w,h]) => ctx.fillRect(x*f,y*f,w*f,h*f));
  ctx.fillStyle = '#ffcc00';
  [[9,53,2,2],[23,51,3,2]].forEach(([x,y,w,h]) => ctx.fillRect(x*f,y*f,w*f,h*f));
  ctx.globalAlpha = 1;

  // Зелёные выстрелы
  ctx.fillStyle = '#00ff44';
  [[5,56,4,1],[15,55,3,1],[38,57,4,1],[50,55,3,1]].forEach(([x,y,w,h]) => ctx.fillRect(x*f,y*f,w*f,h*f));

  // Земля
  ctx.fillStyle = '#0a0805';
  ctx.fillRect(0, 58*f, size, 6*f);

  // К-2SO
  const kx = 30*f, ky = 12*f;
  ctx.fillStyle = '#2288ff'; ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.arc(kx, ky, 6*f, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(kx-2*f,ky+5*f,2*f,5*f); ctx.fillRect(kx-3*f,ky+9*f,2*f,2*f);
  ctx.fillRect(kx+1*f,ky+4*f,2*f,4*f); ctx.fillRect(kx+2*f,ky+7*f,2*f,2*f);
  ctx.fillRect(kx-2*f,ky-1*f,5*f,7*f);
  ctx.fillStyle = '#4a4a55'; ctx.fillRect(kx-1*f,ky,3*f,3*f);
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(kx-4*f,ky-3*f,2*f,5*f); ctx.fillRect(kx+3*f,ky-1*f,2*f,4*f);
  ctx.fillStyle = '#555'; ctx.fillRect(kx+5*f,ky,3*f,1*f);
  ctx.fillStyle = '#2288ff'; ctx.fillRect(kx+8*f,ky,5*f,1*f);
  ctx.fillStyle = '#3a3a44'; ctx.fillRect(kx-1*f,ky-5*f,4*f,4*f);
  ctx.fillStyle = '#4a4a55'; ctx.fillRect(kx,ky-4*f,2*f,2*f);
  ctx.fillStyle = '#2288ff'; ctx.fillRect(kx,ky-4*f,1*f,1*f); ctx.fillRect(kx+2*f,ky-4*f,1*f,1*f);

  return canvas.toDataURL('image/png');
}

/** Обновить manifest с динамическими иконками */
export function setupPWA(): void {
  // Генерируем иконки
  const icon192 = generateIconDataURL(192);
  const icon512 = generateIconDataURL(512);

  // Обновляем manifest динамически
  const manifest = {
    name: 'Убойный Робот — НейроСити 2148',
    short_name: 'Убойный Робот',
    description: 'К-2SO — Убойный Робот. 3D шутер от третьего лица.',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['games'],
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png' },
      { src: icon512, sizes: '512x512', type: 'image/png' },
    ],
  };

  // Удаляем старый manifest link и добавляем blob
  const oldLink = document.querySelector('link[rel="manifest"]');
  if (oldLink) oldLink.remove();
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);

  // Apple touch icon
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
  if (appleIcon) appleIcon.href = icon192;

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
