import { Game } from './core/Game';
import { generateFavicon } from './favicon';

try { generateFavicon(); } catch (_e) { /* ok */ }

async function main(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  if (!canvas) {
    console.error('Canvas элемент не найден!');
    return;
  }

  // Отключить контекстное меню (мешает ПКМ для прицеливания)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const game = new Game(canvas);
  await game.init();
  game.start();
}

main().catch(console.error);
