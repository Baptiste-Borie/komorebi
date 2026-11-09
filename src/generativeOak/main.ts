import { ENGLISH_OAK, generateOak } from './botany';
import { renderOakArtwork } from './artRenderer';
import { attachCamera } from './camera';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Generative Oak: #app introuvable');

root.innerHTML = `
  <main class="art-shell">
    <canvas id="oak-canvas" aria-label="Chêne anglais généré par des milliers de marques colorées"></canvas>
    <header class="art-title">
      <span>KOMOREBI · ÉTUDE GÉNÉRATIVE 001</span>
      <h1>Quercus <em>robur</em></h1>
      <p>Une canopée dessinée marque après marque.</p>
    </header>
    <aside class="art-key" aria-label="Informations sur l'œuvre">
      <span class="seed">GRAINE · 4B4F4D4F</span>
      <span id="stats">Génération…</span>
    </aside>
    <div class="art-help">GLISSER POUR CADRER <i></i> MOLETTE POUR ZOOMER</div>
    <button class="reset-view" type="button">Recentrer</button>
  </main>`;

const canvas = root.querySelector<HTMLCanvasElement>('#oak-canvas');
const stats = root.querySelector<HTMLSpanElement>('#stats');
const reset = root.querySelector<HTMLButtonElement>('.reset-view');
if (!canvas || !stats || !reset) throw new Error('Generative Oak: interface incomplète');
const oakCanvas = canvas;
const statsReadout = stats;
const resetButton = reset;

const structure = generateOak(ENGLISH_OAK);
const cache = renderOakArtwork(structure);
const query = new URLSearchParams(window.location.search);
const requestedView = query.get('view');
const initialZoom = requestedView === 'close' ? 0.80 : requestedView === 'far' ? 0.31 : 0.44;
let dirty = true;

function resize(): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(window.innerWidth * ratio));
  const height = Math.max(1, Math.round(window.innerHeight * ratio));
  if (oakCanvas.width !== width || oakCanvas.height !== height) {
    oakCanvas.width = width;
    oakCanvas.height = height;
    dirty = true;
  }
}

const camera = attachCamera(oakCanvas, initialZoom, () => { dirty = true; });
resetButton.addEventListener('click', () => camera.reset());
window.addEventListener('resize', resize);

function draw(): void {
  if (dirty) {
    resize();
    const ctx = oakCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Generative Oak: Canvas 2D indisponible');
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const viewWidth = oakCanvas.width / ratio;
    const viewHeight = oakCanvas.height / ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#e7dfcc';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    const scale = camera.state.zoom * Math.min(viewWidth / 1920, viewHeight / 1080);
    const sourceCenterX = cache.focus.x;
    const sourceCenterY = cache.focus.y + 52;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(viewWidth * 0.5 + camera.state.x, viewHeight * 0.51 + camera.state.y);
    ctx.scale(scale, scale);
    ctx.drawImage(cache.canvas, -sourceCenterX, -sourceCenterY);
    dirty = false;
  }
  requestAnimationFrame(draw);
}

statsReadout.textContent = `${cache.stats.marks.toLocaleString('fr-FR')} MARQUES · ${cache.stats.canopyMasses} MASSES · ${cache.stats.renderMs.toFixed(0)} MS`;
(window as Window & { KOMOREBI_OAK?: unknown }).KOMOREBI_OAK = { structure, cache, camera };
resize();
requestAnimationFrame(draw);
