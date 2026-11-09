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
const LIGHT = normalize({ x: -0.62, y: 0.76, z: -0.20 });
const LEAF_RAMPS = [
  ['#18392c', '#244b34', '#35603b', '#4f7745', '#759153'],
  ['#21412f', '#2c5235', '#41663d', '#607d46', '#879958'],
  ['#294934', '#36593a', '#4b6b40', '#6b8349', '#929d59'],
];
const BARK_DARK = '#49372b';
const BARK_MID = '#6b4e37';
const BARK_LIGHT = '#9a7652';

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillPaper(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#f1eadb');
  gradient.addColorStop(0.52, '#e8dfcc');
  gradient.addColorStop(1, '#d9cfb7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const random = createRandom(99173);
  for (let i = 0; i < 7200; i++) {
    ctx.fillStyle = rgba(random.next() > 0.58 ? '#ffffff' : '#71644d', random.range(0.006, 0.022));
    ctx.fillRect(random.next() * WIDTH, random.next() * HEIGHT, random.range(0.5, 2.0), random.range(0.4, 1.3));
  }
}

function polygon(ctx: Ctx, points: Array<{ x: number; y: number }>, fill: string | CanvasGradient): void {
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
  polygon(ctx, [corners[3], corners[2], side[2], side[3]], '#83765a');
  polygon(ctx, [corners[1], corners[2], side[2], side[1]], '#6d634d');
  polygon(ctx, corners, '#b5ad79');

  const random = createRandom(476211);
  let marks = 0;
  for (let i = 0; i < 5000; i++) {
    const x = random.range(-5.65, 5.65);
    const z = random.range(-4.55, 4.55);
    if (Math.hypot(x * 0.82, z) < 1.08 && random.next() < 0.86) continue;
    const point = projection.project({ x, y: random.range(0.005, 0.025), z });
    const edge = Math.min(1, (5.7 - Math.abs(x)) * (4.6 - Math.abs(z)) * 0.34);
    const palette = x - z < 0.8 ? ['#d0c789', '#bdba78', '#9da769'] : ['#999963', '#7b8355', '#6d744d'];
    const length = random.range(3, 9) * edge;
    const angle = -0.68 + Math.sin(x * 0.7 + z * 0.4) * 0.14 + random.signed(0.15);
    ctx.strokeStyle = rgba(palette[Math.floor(random.next() * palette.length)], random.range(0.28, 0.68));
    ctx.lineWidth = random.range(0.7, 1.9);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x - Math.cos(angle) * length * 0.5, point.y - Math.sin(angle) * length * 0.5);
    ctx.lineTo(point.x + Math.cos(angle) * length * 0.5, point.y + Math.sin(angle) * length * 0.5);
    ctx.stroke();
    marks++;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const shadow = projection.project({ x: 0.48, y: 0.01, z: 0.42 });
  ctx.translate(shadow.x, shadow.y);
  ctx.rotate(-0.38);
  ctx.scale(1, 0.25);
  const gradient = ctx.createRadialGradient(-36, 0, 12, 0, 0, 520);
  gradient.addColorStop(0, 'rgba(39,45,29,.38)');
  gradient.addColorStop(0.34, 'rgba(47,52,31,.24)');
  gradient.addColorStop(0.72, 'rgba(57,61,37,.10)');
  gradient.addColorStop(1, 'rgba(57,61,37,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 520, 0, TAU);
  ctx.fill();
  ctx.restore();

  const contact = projection.project({ x: 0, y: 0.005, z: 0 });
  ctx.save();
  ctx.translate(contact.x, contact.y + 3);
  ctx.scale(1, 0.24);
  const contactGradient = ctx.createRadialGradient(0, 0, 3, 0, 0, 92);
  contactGradient.addColorStop(0, 'rgba(35,39,27,.42)');
  contactGradient.addColorStop(0.5, 'rgba(42,46,29,.19)');
  contactGradient.addColorStop(1, 'rgba(42,46,29,0)');
  ctx.fillStyle = contactGradient;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, TAU);
  ctx.fill();
  ctx.restore();
  return marks;
}

function drawTaperedBranch(ctx: Ctx, projection: IsometricProjection, branch: BranchSegment): void {
  const a = projection.project(branch.start);
  const b = projection.project(branch.end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const startWidth = Math.max(1.2, branch.radiusStart * projection.scale * 1.78);
  const endWidth = Math.max(0.9, branch.radiusEnd * projection.scale * 1.78);
  const shade = branch.level === 0 ? BARK_DARK : branch.level === 1 ? BARK_MID : '#76573d';
  const gradient = ctx.createLinearGradient(a.x + nx * startWidth, a.y + ny * startWidth, a.x - nx * startWidth, a.y - ny * startWidth);
  gradient.addColorStop(0, rgba(BARK_LIGHT, 0.92));
  gradient.addColorStop(0.32, shade);
  gradient.addColorStop(1, '#3e3028');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * startWidth * 0.5, a.y + ny * startWidth * 0.5);
  ctx.quadraticCurveTo((a.x + b.x) * 0.5 + nx * startWidth * 0.34, (a.y + b.y) * 0.5 + ny * startWidth * 0.34, b.x + nx * endWidth * 0.5, b.y + ny * endWidth * 0.5);
  ctx.lineTo(b.x - nx * endWidth * 0.5, b.y - ny * endWidth * 0.5);
  ctx.quadraticCurveTo((a.x + b.x) * 0.5 - nx * startWidth * 0.34, (a.y + b.y) * 0.5 - ny * startWidth * 0.34, a.x - nx * startWidth * 0.5, a.y - ny * startWidth * 0.5);
  ctx.closePath();
  ctx.fill();
  if (branch.level > 0) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, startWidth * 0.48, 0, TAU);
    ctx.fill();
  }
}

function drawContinuousTrunk(ctx: Ctx, projection: IsometricProjection, branches: BranchSegment[]): void {
  const ordered = branches.filter((branch) => branch.level === 0).sort((a, b) => a.start.y - b.start.y);
  if (!ordered.length) return;
  const nodes = ordered.map((branch) => ({ point: branch.start, radius: branch.radiusStart }));
  const last = ordered[ordered.length - 1];
  nodes.push({ point: last.end, radius: last.radiusEnd });
  const projected = nodes.map((node) => projection.project(node.point));
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    const before = projected[Math.max(0, i - 1)];
    const after = projected[Math.min(projected.length - 1, i + 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const width = nodes[i].radius * projection.scale * 1.78 * 0.5 * (0.97 + Math.sin(i * 1.73) * 0.045);
    left.push({ x: projected[i].x + nx * width, y: projected[i].y + ny * width });
    right.push({ x: projected[i].x - nx * width, y: projected[i].y - ny * width });
  }
  const base = projected[0];
  const gradient = ctx.createLinearGradient(base.x - 58, base.y, base.x + 58, base.y);
  gradient.addColorStop(0, '#3f3028');
  gradient.addColorStop(0.46, BARK_DARK);
  gradient.addColorStop(0.78, BARK_MID);
  gradient.addColorStop(1, rgba(BARK_LIGHT, 0.92));
  polygon(ctx, [...left, ...right.reverse()], gradient);
  const rootRadius = nodes[0].radius * projection.scale * 1.78 * 0.5;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(projected[0].x, projected[0].y, rootRadius, rootRadius * 0.16, 0, 0, TAU);
  ctx.fill();
}

function drawBarkMarks(ctx: Ctx, projection: IsometricProjection, branches: BranchSegment[]): number {
  const random = createRandom(0xbabacafe);
  let marks = 0;
  for (const branch of branches) {
    if (branch.level > 1 && random.next() < 0.55) continue;
    const a = projection.project(branch.start);
    const b = projection.project(branch.end);
    const count = Math.max(1, Math.round(branch.radiusStart * projection.scale * (branch.level === 0 ? 0.31 : 0.13)));
    for (let i = 0; i < count; i++) {
      const t = (i + random.next()) / count;
      const x = a.x + (b.x - a.x) * t + random.signed(branch.radiusStart * projection.scale * 0.22);
      const y = a.y + (b.y - a.y) * t;
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + random.signed(0.14);
      const length = random.range(3.5, 13) * Math.max(0.45, 1 - branch.level * 0.18);
      ctx.strokeStyle = rgba(random.next() > 0.72 ? '#d0a579' : '#2f2925', random.range(0.18, 0.48));
      ctx.lineWidth = random.range(0.6, 1.5);
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

function rotateY(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return { x: point.x * cosine - point.z * sine, y: point.y, z: point.x * sine + point.z * cosine };
}

function makeCanopyMarks(mass: CanopyMass, projection: IsometricProjection, index: number): LeafMark[] {
  const random = createRandom(mass.seed);
  const count = Math.round((mass.tier === 'core' ? 2550 : 1150) * mass.density);
  const marks: LeafMark[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const ramp = LEAF_RAMPS[index % LEAF_RAMPS.length];

  for (let i = 0; i < count; i++) {
    const yUnit = 1 - 2 * ((i + 0.5) / count);
    const ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const theta = i * golden + mass.rotation + random.signed(0.11);
    const shell = 0.38 + 0.62 * Math.pow(random.next(), 0.22);
    const lobe = 1
      + Math.sin(theta * 3 + mass.seed * 0.000001) * mass.irregularity * 0.44
      + Math.sin(theta * 5 - yUnit * 2.8) * mass.irregularity * 0.28
      + Math.sin(yUnit * 7 + theta) * mass.irregularity * 0.18;
    const local = rotateY({
      x: Math.cos(theta) * ring * mass.radius.x * shell * lobe,
      y: yUnit * mass.radius.y * (0.88 + 0.12 * lobe) * (0.78 + 0.22 * shell),
      z: Math.sin(theta) * ring * mass.radius.z * shell * lobe,
    }, mass.rotation * 0.45);
    const position = { x: mass.center.x + local.x, y: mass.center.y + local.y, z: mass.center.z + local.z };
    const normal = normalize({ x: local.x / mass.radius.x, y: local.y / mass.radius.y, z: local.z / mass.radius.z });
    const diffuse = Math.max(0, dot(normal, LIGHT));
    const upper = Math.max(0, normal.y);
    const underside = Math.max(0, -normal.y);
    const interior = 1 - shell;
    const ambientOcclusion = Math.min(0.72, underside * 0.40 + interior * 0.72 + (mass.tier === 'core' ? 0.08 : 0));
    const lightValue = diffuse * 0.72 + upper * 0.28 - ambientOcclusion;
    const step = lightValue > 0.61 ? 4 : lightValue > 0.34 ? 3 : lightValue > 0.12 ? 2 : lightValue > -0.12 ? 1 : 0;
    const projected = projection.project(position);
    const tangent = Math.atan2(-normal.y * 0.88 + (normal.x + normal.z) * 0.11, normal.x - normal.z)
      + Math.sin(theta * 2 + yUnit * 3) * 0.18 + random.signed(0.22);
    const silhouette = shell > 0.83;
    const size = random.range(silhouette ? 12 : 13, silhouette ? 21 : 24) * (mass.tier === 'perimeter' ? 0.92 : 1);
    marks.push({
      x: projected.x,
      y: projected.y,
      depth: position.x + position.z + shell * 0.05,
      angle: tangent,
      length: size,
      width: size * random.range(0.31, 0.54),
      color: ramp[Math.max(0, Math.min(ramp.length - 1, step + (random.next() > 0.92 ? 1 : 0)))],
      alpha: random.range(interior > 0.36 ? 0.58 : 0.76, silhouette ? 0.96 : 0.90),
      kind: random.next(),
    });
  }

  // Broad fragments are still individual marks; beneath the finer layer they close the volume
  // at normal distance without introducing a flat ellipse or a visible cluster outline.
  const foundationCount = mass.tier === 'core' ? 260 : 110;
  for (let i = 0; i < foundationCount; i++) {
    const theta = random.next() * TAU;
    const radial = Math.sqrt(random.next()) * 0.80;
    const local = rotateY({
      x: Math.cos(theta) * mass.radius.x * radial,
      y: random.signed(mass.radius.y * 0.64) - mass.radius.y * 0.10,
      z: Math.sin(theta) * mass.radius.z * radial,
    }, mass.rotation);
    const position = { x: mass.center.x + local.x, y: mass.center.y + local.y, z: mass.center.z + local.z };
    const projected = projection.project(position);
    const shade = local.y > 0 ? 2 : 0;
    marks.push({
      x: projected.x,
      y: projected.y,
      depth: position.x + position.z - 0.08,
      angle: random.range(-0.8, 0.8),
      length: random.range(22, 39),
      width: random.range(8, 17),
      color: ramp[shade],
      alpha: random.range(0.34, 0.55),
      kind: 0.98,
    });
  }
  return marks;
}

function drawLeafMark(ctx: Ctx, mark: LeafMark): void {
  ctx.save();
  ctx.translate(mark.x, mark.y);
  ctx.rotate(mark.angle);
  ctx.fillStyle = rgba(mark.color, mark.alpha);
  if (mark.kind < 0.68) {
    ctx.beginPath();
    ctx.moveTo(-mark.length * 0.56, 0);
    ctx.quadraticCurveTo(-mark.length * 0.18, -mark.width, mark.length * 0.54, -mark.width * 0.05);
    ctx.quadraticCurveTo(mark.length * 0.08, mark.width * 0.78, -mark.length * 0.56, 0);
    ctx.fill();
  } else if (mark.kind < 0.88) {
    ctx.strokeStyle = rgba(mark.color, mark.alpha);
    ctx.lineWidth = Math.max(1.4, mark.width * 0.54);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mark.length * 0.5, 0);
    ctx.quadraticCurveTo(0, -mark.width * 0.30, mark.length * 0.5, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, mark.length * 0.43, mark.width * 0.68, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawAtmosphericAccents(ctx: Ctx, projection: IsometricProjection): number {
  const random = createRandom(0x123fa91);
  for (let i = 0; i < 170; i++) {
    const angle = random.next() * TAU;
    const radius = random.range(1.2, 5.3);
    const point = projection.project({ x: Math.cos(angle) * radius, y: random.range(0.02, 0.20), z: Math.sin(angle) * radius });
    ctx.fillStyle = rgba(random.next() > 0.62 ? '#d5c482' : '#788255', random.range(0.16, 0.42));
    ctx.beginPath();
    ctx.arc(point.x, point.y, random.range(0.9, 2.3), 0, TAU);
    ctx.fill();
  }
  return 170;
}

export function renderOakArtwork(structure: OakStructure): ArtCache {
  const started = performance.now();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D indisponible');
  const projection = createIsometricProjection(WIDTH * 0.50, HEIGHT * 0.895, 170);
  fillPaper(ctx);
  let marks = drawGround(ctx, projection);
  marks += drawAtmosphericAccents(ctx, projection);

  const sortedBranches = [...structure.branches].sort((a, b) => a.depth - b.depth || a.level - b.level);
  drawContinuousTrunk(ctx, projection, sortedBranches);
  for (const branch of sortedBranches) {
    if (branch.level > 0) drawTaperedBranch(ctx, projection, branch);
  }
  marks += drawBarkMarks(ctx, projection, sortedBranches);

  const leafMarks = structure.canopy.flatMap((mass, index) => makeCanopyMarks(mass, projection, index));
  leafMarks.sort((a, b) => a.depth - b.depth);
  for (const mark of leafMarks) drawLeafMark(ctx, mark);
  marks += leafMarks.length;

  // Only the clean lower trunk re-emerges. Every crown limb stays behind the foliage marks.
  const foregroundTrunk = sortedBranches.filter((branch) => branch.level !== 0 || branch.end.y < 3.78);
  drawContinuousTrunk(ctx, projection, foregroundTrunk);
  marks += drawBarkMarks(ctx, projection, foregroundTrunk.filter((branch) => branch.level === 0));

  const focus = projection.project({ x: 0, y: 4.45, z: 0.35 });
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
