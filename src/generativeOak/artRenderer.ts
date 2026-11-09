import { type BranchSegment, type CanopyMass, type OakStructure } from './botany';
import { createIsometricProjection, dot, normalize, type IsometricProjection, type Vec3 } from './projection';
import { createRandom } from './random';

type Ctx = CanvasRenderingContext2D;

export interface RenderStats {
  marks: number;
  branches: number;
  canopyMasses: number;
  renderMs: number;
}

export interface ArtCache {
  canvas: HTMLCanvasElement;
  stats: RenderStats;
  focus: { x: number; y: number };
}

const WIDTH = 2880;
const HEIGHT = 2040;
const TAU = Math.PI * 2;
const LIGHT = normalize({ x: -0.55, y: 0.82, z: -0.34 });
const LEAF_COLORS = ['#213e2d', '#2d5135', '#3d633d', '#527645', '#6d8a50', '#8a9e5b', '#a5ad68'];
const BARK_COLORS = ['#49382d', '#5a4434', '#6b503b', '#806047', '#98745a'];

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillPaper(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#eee7d6');
  gradient.addColorStop(0.48, '#e7dfcc');
  gradient.addColorStop(1, '#d9d0b9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const random = createRandom(99173);
  for (let i = 0; i < 9200; i++) {
    const value = random.next() > 0.56 ? '#ffffff' : '#675b46';
    ctx.fillStyle = rgba(value, random.range(0.008, 0.028));
    ctx.fillRect(random.next() * WIDTH, random.next() * HEIGHT, random.range(0.5, 2.2), random.range(0.4, 1.5));
  }
}

function polygon(ctx: Ctx, points: Array<{ x: number; y: number }>, fill: string): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawGround(ctx: Ctx, projection: IsometricProjection): number {
  const corners = [
    projection.project({ x: -5.8, y: 0, z: -4.7 }),
    projection.project({ x: 5.8, y: 0, z: -4.7 }),
    projection.project({ x: 5.8, y: 0, z: 4.7 }),
    projection.project({ x: -5.8, y: 0, z: 4.7 }),
  ];
  const side = corners.map((point) => ({ x: point.x, y: point.y + 62 }));
  polygon(ctx, [corners[3], corners[2], side[2], side[3]], '#82775a');
  polygon(ctx, [corners[1], corners[2], side[2], side[1]], '#6d654e');
  polygon(ctx, corners, '#b4ad7b');

  const random = createRandom(476211);
  let marks = 0;
  for (let i = 0; i < 6200; i++) {
    let x = random.range(-5.65, 5.65);
    let z = random.range(-4.55, 4.55);
    const distance = Math.hypot(x * 0.82, z);
    if (distance < 1.12 && random.next() < 0.84) continue;
    const point = projection.project({ x, y: random.range(0.005, 0.025), z });
    const edge = Math.min(1, (5.7 - Math.abs(x)) * (4.6 - Math.abs(z)) * 0.34);
    const light = 0.5 + 0.5 * Math.sin(x * 0.42 - z * 0.35);
    const palette = light > 0.61 ? ['#d1c98e', '#c1bd80', '#9eaa68'] : ['#9a9c65', '#788555', '#6e7650'];
    const color = palette[Math.floor(random.next() * palette.length)];
    const length = random.range(3, 10) * edge;
    const angle = -0.68 + Math.sin(x * 0.7 + z * 0.4) * 0.15 + random.signed(0.16);
    ctx.strokeStyle = rgba(color, random.range(0.34, 0.78));
    ctx.lineWidth = random.range(0.8, 2.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x - Math.cos(angle) * length * 0.5, point.y - Math.sin(angle) * length * 0.5);
    ctx.lineTo(point.x + Math.cos(angle) * length * 0.5, point.y + Math.sin(angle) * length * 0.5);
    ctx.stroke();
    marks++;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const shadow = projection.project({ x: 0.36, y: 0, z: 0.42 });
  const gradient = ctx.createRadialGradient(shadow.x, shadow.y, 8, shadow.x, shadow.y, 430);
  gradient.addColorStop(0, 'rgba(42,48,31,.34)');
  gradient.addColorStop(0.55, 'rgba(47,54,34,.18)');
  gradient.addColorStop(1, 'rgba(47,54,34,0)');
  ctx.fillStyle = gradient;
  ctx.save();
  ctx.translate(shadow.x, shadow.y);
  ctx.rotate(-0.42);
  ctx.scale(1, 0.27);
  ctx.beginPath();
  ctx.arc(0, 0, 450, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  return marks;
}

function branchPath(ctx: Ctx, projection: IsometricProjection, branch: BranchSegment): void {
  const a = projection.project(branch.start);
  const b = projection.project(branch.end);
  const width = Math.max(1.1, branch.radiusStart * projection.scale * 1.74);
  const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  gradient.addColorStop(0, BARK_COLORS[Math.min(4, branch.level)]);
  gradient.addColorStop(1, BARK_COLORS[Math.min(4, branch.level + 1)]);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  const curve = (branch.end.x - branch.start.x - branch.end.z + branch.start.z) * projection.scale * 0.035;
  ctx.quadraticCurveTo((a.x + b.x) * 0.5 + curve, (a.y + b.y) * 0.5 - Math.abs(curve) * 0.22, b.x, b.y);
  ctx.stroke();
  if (width > 6) {
    ctx.strokeStyle = 'rgba(225,202,159,.17)';
    ctx.lineWidth = Math.max(0.7, width * 0.12);
    ctx.beginPath();
    ctx.moveTo(a.x - width * 0.16, a.y);
    ctx.lineTo(b.x - width * 0.09, b.y);
    ctx.stroke();
  }
}

function drawBarkMarks(ctx: Ctx, projection: IsometricProjection, branches: BranchSegment[]): number {
  const random = createRandom(0xbabacafe);
  let marks = 0;
  for (const branch of branches) {
    const a = projection.project(branch.start);
    const b = projection.project(branch.end);
    const count = Math.max(1, Math.round(branch.radiusStart * projection.scale * (branch.level < 2 ? 0.42 : 0.17)));
    for (let i = 0; i < count; i++) {
      const t = (i + random.next()) / count;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + random.signed(0.18);
      const length = random.range(2.5, 11) * Math.max(0.45, 1 - branch.level * 0.17);
      ctx.strokeStyle = rgba(random.next() > 0.75 ? '#c59a70' : '#362d28', random.range(0.22, 0.58));
      ctx.lineWidth = random.range(0.6, 1.6);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * length * 0.5, y - Math.sin(angle) * length * 0.5);
      ctx.lineTo(x + Math.cos(angle) * length * 0.5, y + Math.sin(angle) * length * 0.5);
      ctx.stroke();
      marks++;
    }
  }
  return marks;
}

interface LeafMark {
  x: number;
  y: number;
  depth: number;
  angle: number;
  length: number;
  width: number;
  color: string;
  alpha: number;
  kind: number;
}

function makeCanopyMarks(mass: CanopyMass, projection: IsometricProjection): LeafMark[] {
  const random = createRandom(mass.seed);
  const count = Math.round(630 * mass.density);
  const marks: LeafMark[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const shell = i / Math.max(1, count - 1);
    const yUnit = 1 - 2 * ((i + 0.5) / count);
    const ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const theta = i * golden + mass.rotation + random.signed(0.16);
    // Le volume entier est occupé, avec un biais vers la peau éclairée : cela évite
    // l'effet de halo creux produit par un simple échantillonnage de surface.
    const radiusBias = 0.12 + 0.88 * Math.pow(random.next(), 0.46);
    const local: Vec3 = {
      x: Math.cos(theta) * ring * mass.radius.x * radiusBias,
      y: yUnit * mass.radius.y * (0.72 + 0.28 * radiusBias),
      z: Math.sin(theta) * ring * mass.radius.z * radiusBias,
    };
    const position = { x: mass.center.x + local.x, y: mass.center.y + local.y, z: mass.center.z + local.z };
    const normal = normalize({ x: local.x / mass.radius.x, y: local.y / mass.radius.y, z: local.z / mass.radius.z });
    const diffuse = Math.max(0, dot(normal, LIGHT));
    const stepped = diffuse > 0.72 ? 3 : diffuse > 0.43 ? 2 : diffuse > 0.18 ? 1 : 0;
    const interior = radiusBias < 0.69;
    const colorIndex = Math.max(0, Math.min(LEAF_COLORS.length - 1, stepped + (interior ? 0 : 1) + (random.next() > 0.90 ? 1 : 0)));
    const projected = projection.project(position);
    const tangent = Math.atan2(-normal.y * 0.78 + (normal.x + normal.z) * 0.12, normal.x - normal.z) + random.signed(0.30);
    const size = random.range(7.0, 14.2) * (0.86 + shell * 0.18);
    marks.push({
      x: projected.x,
      y: projected.y,
      depth: position.x + position.z + position.y * 0.035,
      angle: tangent,
      length: size,
      width: size * random.range(0.26, 0.48),
      color: LEAF_COLORS[colorIndex],
      alpha: interior ? random.range(0.56, 0.78) : random.range(0.76, 0.97),
      kind: random.next(),
    });
  }
  return marks;
}

function drawLeafMark(ctx: Ctx, mark: LeafMark): void {
  ctx.save();
  ctx.translate(mark.x, mark.y);
  ctx.rotate(mark.angle);
  ctx.fillStyle = rgba(mark.color, mark.alpha);
  if (mark.kind < 0.72) {
    ctx.beginPath();
    ctx.moveTo(-mark.length * 0.56, 0);
    ctx.quadraticCurveTo(-mark.length * 0.12, -mark.width, mark.length * 0.52, 0);
    ctx.quadraticCurveTo(-mark.length * 0.05, mark.width * 0.82, -mark.length * 0.56, 0);
    ctx.fill();
  } else if (mark.kind < 0.91) {
    ctx.strokeStyle = rgba(mark.color, mark.alpha);
    ctx.lineWidth = Math.max(1.2, mark.width * 0.62);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mark.length * 0.5, 0);
    ctx.lineTo(mark.length * 0.5, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, mark.width * 0.68, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawAtmosphericAccents(ctx: Ctx, projection: IsometricProjection): number {
  const random = createRandom(0x123fa91);
  let marks = 0;
  for (let i = 0; i < 280; i++) {
    const angle = random.next() * TAU;
    const radius = random.range(1.15, 5.4);
    const p = projection.project({ x: Math.cos(angle) * radius, y: random.range(0.02, 0.24), z: Math.sin(angle) * radius });
    ctx.fillStyle = rgba(random.next() > 0.6 ? '#d4c384' : '#788455', random.range(0.20, 0.55));
    ctx.beginPath();
    ctx.arc(p.x, p.y, random.range(1.1, 2.8), 0, TAU);
    ctx.fill();
    marks++;
  }
  return marks;
}

export function renderOakArtwork(structure: OakStructure): ArtCache {
  const started = performance.now();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D indisponible');
  const projection = createIsometricProjection(WIDTH * 0.50, HEIGHT * 0.885, 181);
  fillPaper(ctx);
  let marks = drawGround(ctx, projection);
  marks += drawAtmosphericAccents(ctx, projection);

  const canopy = structure.canopy.map((mass) => ({ mass, marks: makeCanopyMarks(mass, projection) }));
  canopy.sort((a, b) => a.mass.depth - b.mass.depth);
  const sortedBranches = [...structure.branches].sort((a, b) => a.depth - b.depth || a.level - b.level);
  for (const branch of sortedBranches) branchPath(ctx, projection, branch);
  marks += drawBarkMarks(ctx, projection, sortedBranches);

  for (const cluster of canopy) {
    cluster.marks.sort((a, b) => a.depth - b.depth);
    for (const mark of cluster.marks) drawLeafMark(ctx, mark);
    marks += cluster.marks.length;
  }

  // Seul le tronc revient au premier plan. Les charpentières doivent entrer et sortir
  // des masses plutôt que découper toute la canopée comme un diagramme technique.
  for (const branch of sortedBranches) {
    if (branch.level === 0) branchPath(ctx, projection, branch);
  }

  const focus = projection.project({ x: 0, y: 4.35, z: 0 });
  return {
    canvas,
    focus,
    stats: {
      marks,
      branches: structure.branches.length,
      canopyMasses: structure.canopy.length,
      renderMs: performance.now() - started,
    },
  };
}
