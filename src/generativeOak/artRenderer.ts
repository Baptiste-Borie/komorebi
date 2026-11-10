import { type BranchSegment, type CanopyMass, type OakArtParameters, type OakStructure, type RootButtress } from './botany';
import { createIsometricProjection, dot, normalize, type IsometricProjection, type Vec3 } from './projection';
import { createRandom } from './random';

type Ctx = CanvasRenderingContext2D;

export interface RenderStats { marks: number; branches: number; canopyMasses: number; renderMs: number; }
export interface ArtCache { canvas: HTMLCanvasElement; stats: RenderStats; focus: { x: number; y: number }; }

const WIDTH = 2880;
const HEIGHT = 2040;
const TAU = Math.PI * 2;
const LIGHT = normalize({ x: -0.62, y: 0.76, z: -0.20 });
const LEAF_RAMPS = [
  ['#17372b', '#234a34', '#35613d', '#507846', '#789455'],
  ['#1d3e2e', '#2a5036', '#41673e', '#627f48', '#8b9d5a'],
  ['#274735', '#35593b', '#4c6c41', '#6e874b', '#98a45d'],
];
const BARK_DARK = '#413129';
const BARK_MID = '#684b35';
const BARK_LIGHT = '#9b7752';

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillPaper(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#f1eadb'); gradient.addColorStop(0.52, '#e8dfcc'); gradient.addColorStop(1, '#d9cfb7');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const random = createRandom(99173);
  for (let i = 0; i < 7200; i++) {
    ctx.fillStyle = rgba(random.next() > 0.58 ? '#ffffff' : '#71644d', random.range(0.006, 0.022));
    ctx.fillRect(random.next() * WIDTH, random.next() * HEIGHT, random.range(0.5, 2), random.range(0.4, 1.3));
  }
}

function polygon(ctx: Ctx, points: Array<{ x: number; y: number }>, fill: string | CanvasGradient): void {
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

function groundEllipse(
  ctx: Ctx, projection: IsometricProjection, center: Vec3, radiusX: number, radiusZ: number,
  rotation: number, fill: string | CanvasGradient,
): void {
  const point = projection.project(center);
  const xAxis = projection.project({ x: center.x + Math.cos(rotation), y: center.y, z: center.z + Math.sin(rotation) });
  const zAxis = projection.project({ x: center.x - Math.sin(rotation), y: center.y, z: center.z + Math.cos(rotation) });
  ctx.save();
  ctx.transform(xAxis.x - point.x, xAxis.y - point.y, zAxis.x - point.x, zAxis.y - point.y, point.x, point.y);
  ctx.beginPath(); ctx.ellipse(0, 0, radiusX, radiusZ, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}

function drawGround(ctx: Ctx, projection: IsometricProjection): number {
  const corners = [
    projection.project({ x: -5.8, y: 0, z: -4.7 }), projection.project({ x: 5.8, y: 0, z: -4.7 }),
    projection.project({ x: 5.8, y: 0, z: 4.7 }), projection.project({ x: -5.8, y: 0, z: 4.7 }),
  ];
  const side = corners.map((point) => ({ x: point.x, y: point.y + 62 }));
  polygon(ctx, [corners[3], corners[2], side[2], side[3]], '#83765a');
  polygon(ctx, [corners[1], corners[2], side[2], side[1]], '#6d634d');
  polygon(ctx, corners, '#b3ac78');

  // Local soil and moss share the same projection as the roots; no screen-space platform sticker.
  groundEllipse(ctx, projection, { x: -0.06, y: 0.004, z: 0.08 }, 1.84, 1.28, 0.18, 'rgba(91,101,60,.14)');
  groundEllipse(ctx, projection, { x: 0.12, y: 0.006, z: 0.00 }, 1.18, 0.82, -0.20, 'rgba(78,86,51,.12)');
  groundEllipse(ctx, projection, { x: -0.36, y: 0.008, z: 0.26 }, 0.68, 0.46, 0.34, 'rgba(74,76,47,.14)');

  // A directional, broken shadow: overlapping projected patches describe crown volume.
  const shadowPatches = [
    { x: 0.48, z: 0.14, rx: .86, rz: .38, a: .15 },
    { x: 1.38, z: 0.44, rx: 1.42, rz: 0.54, a: .13 },
    { x: 2.45, z: 0.78, rx: 1.42, rz: 0.58, a: .12 },
    { x: 3.55, z: 1.10, rx: 1.08, rz: 0.44, a: .08 },
  ];
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  for (const patch of shadowPatches) {
    groundEllipse(ctx, projection, { x: patch.x, y: 0.012, z: patch.z }, patch.rx, patch.rz, 0.24, `rgba(53,60,35,${patch.a})`);
  }
  ctx.restore();

  const random = createRandom(476211);
  let marks = 0;
  for (let i = 0; i < 5200; i++) {
    const x = random.range(-5.65, 5.65); const z = random.range(-4.55, 4.55);
    const distance = Math.hypot(x * 0.82, z);
    const point = projection.project({ x, y: random.range(0.008, 0.028), z });
    const edge = Math.min(1, (5.7 - Math.abs(x)) * (4.6 - Math.abs(z)) * 0.34);
    const nearBase = distance < 2.25;
    const palette = nearBase ? ['#72794d', '#89905a', '#9b955e', '#5f6744']
      : x - z < 0.8 ? ['#d0c789', '#bdba78', '#9da769'] : ['#999963', '#7b8355', '#6d744d'];
    const length = random.range(3, nearBase ? 12 : 9) * edge;
    const angle = -0.68 + Math.sin(x * 0.7 + z * 0.4) * 0.14 + random.signed(0.15);
    ctx.strokeStyle = rgba(palette[Math.floor(random.next() * palette.length)], random.range(0.28, 0.70));
    ctx.lineWidth = random.range(0.7, nearBase ? 2.2 : 1.9); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(point.x - Math.cos(angle) * length * .5, point.y - Math.sin(angle) * length * .5);
    ctx.lineTo(point.x + Math.cos(angle) * length * .5, point.y + Math.sin(angle) * length * .5); ctx.stroke(); marks++;
  }
  return marks;
}

function rootPoints(root: RootButtress): { left: Vec3[]; right: Vec3[]; center: Vec3[] } {
  const direction = { x: Math.cos(root.azimuth), z: Math.sin(root.azimuth) };
  const lateral = { x: -direction.z, z: direction.x };
  const center = [
    { x: direction.x * .10, y: root.rise, z: direction.z * .10 },
    { x: direction.x * root.length * .34 + lateral.x * root.bend, y: root.rise * .26, z: direction.z * root.length * .34 + lateral.z * root.bend },
    { x: direction.x * root.length * .72 + lateral.x * root.bend * .55, y: .045, z: direction.z * root.length * .72 + lateral.z * root.bend * .55 },
    { x: direction.x * root.length, y: .018, z: direction.z * root.length },
  ];
  const widths = [root.width * .58, root.width, root.width * .38, .025];
  const left = center.map((point, i) => ({ x: point.x + lateral.x * widths[i], y: point.y, z: point.z + lateral.z * widths[i] }));
  const right = center.map((point, i) => ({ x: point.x - lateral.x * widths[i], y: point.y, z: point.z - lateral.z * widths[i] }));
  return { left, right, center };
}

function drawRoots(ctx: Ctx, projection: IsometricProjection, roots: RootButtress[], foreground: boolean): number {
  const selected = roots.filter((root) => foreground ? root.depth >= 0 : root.depth < 0).sort((a, b) => a.depth - b.depth);
  let marks = 0;
  for (const root of selected) {
    const geometry = rootPoints(root);
    const shape = [...geometry.left.map(projection.project), ...geometry.right.map(projection.project).reverse()];
    const shoulder = projection.project(geometry.center[0]); const tip = projection.project(geometry.center[3]);
    const gradient = ctx.createLinearGradient(shoulder.x, shoulder.y, tip.x, tip.y);
    gradient.addColorStop(0, foreground ? '#624732' : '#503b2f');
    gradient.addColorStop(.58, foreground ? '#74573c' : '#604833');
    gradient.addColorStop(1, '#77704c');
    ctx.beginPath(); ctx.moveTo(shape[0].x, shape[0].y);
    ctx.quadraticCurveTo(shape[1].x, shape[1].y, shape[2].x, shape[2].y);
    ctx.quadraticCurveTo(shape[2].x, shape[2].y, shape[3].x, shape[3].y);
    ctx.quadraticCurveTo(shape[4].x, shape[4].y, shape[5].x, shape[5].y);
    ctx.quadraticCurveTo(shape[6].x, shape[6].y, shape[7].x, shape[7].y);
    ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    const random = createRandom(Math.round((root.azimuth + TAU) * 100000));
    for (let i = 0; i < 14; i++) {
      const t = random.range(.08, .92); const a = geometry.center[Math.min(2, Math.floor(t * 3))];
      const b = geometry.center[Math.min(3, Math.floor(t * 3) + 1)]; const local = t * 3 - Math.floor(t * 3);
      const p = projection.project({ x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local + .012, z: a.z + (b.z - a.z) * local });
      const angle = Math.atan2(tip.y - shoulder.y, tip.x - shoulder.x) + random.signed(.16);
      ctx.strokeStyle = rgba(random.next() > .72 ? '#b19065' : '#302922', random.range(.18, .42));
      ctx.lineWidth = random.range(.7, 1.5); ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(angle) * random.range(5, 15), p.y + Math.sin(angle) * random.range(5, 15)); ctx.stroke(); marks++;
    }
  }
  return marks;
}

function groupPaths(branches: BranchSegment[]): BranchSegment[][] {
  const groups = new Map<number, BranchSegment[]>();
  for (const branch of branches) {
    const group = groups.get(branch.pathId) ?? []; group.push(branch); groups.set(branch.pathId, group);
  }
  return [...groups.values()].map((group) => group.sort((a, b) => a.segmentIndex - b.segmentIndex));
}

function drawBranchPath(ctx: Ctx, projection: IsometricProjection, path: BranchSegment[]): void {
  if (!path.length) return;
  const nodes = path.map((branch) => ({ point: branch.start, radius: branch.radiusStart }));
  const last = path[path.length - 1]; nodes.push({ point: last.end, radius: last.radiusEnd });
  const projected = nodes.map((node) => projection.project(node.point));
  const left: Array<{ x: number; y: number }> = []; const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    const before = projected[Math.max(0, i - 1)]; const after = projected[Math.min(projected.length - 1, i + 1)];
    const dx = after.x - before.x; const dy = after.y - before.y; const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length; const ny = dx / length;
    const width = Math.max(.8, nodes[i].radius * projection.scale * 1.76 * .5 * (.96 + Math.sin(i * 1.73 + path[0].pathId) * .070));
    left.push({ x: projected[i].x + nx * width, y: projected[i].y + ny * width });
    right.push({ x: projected[i].x - nx * width, y: projected[i].y - ny * width });
  }
  const bounds = projected.reduce((acc, p) => ({ min: Math.min(acc.min, p.x), max: Math.max(acc.max, p.x) }), { min: Infinity, max: -Infinity });
  const gradient = ctx.createLinearGradient(bounds.min - 20, 0, bounds.max + 20, 0);
  gradient.addColorStop(0, BARK_DARK); gradient.addColorStop(.45, path[0].level === 0 ? '#533a2d' : BARK_MID); gradient.addColorStop(.78, '#76573b'); gradient.addColorStop(1, BARK_LIGHT);
  polygon(ctx, [...left, ...right.reverse()], gradient);
  const start = projected[0]; const end = projected[projected.length - 1];
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(start.x, start.y, nodes[0].radius * projection.scale * .70, nodes[0].radius * projection.scale * .34, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(end.x, end.y, Math.max(1, nodes[nodes.length - 1].radius * projection.scale * .72), Math.max(.7, nodes[nodes.length - 1].radius * projection.scale * .38), 0, 0, TAU); ctx.fill();
}

function drawWoodyStructure(ctx: Ctx, projection: IsometricProjection, branches: BranchSegment[]): void {
  const paths = groupPaths(branches);
  const trunk = paths.find((path) => path[0].pathId === 0);
  const limbs = paths.filter((path) => path[0].pathId !== 0).sort((a, b) => a[0].depth - b[0].depth);
  for (const path of limbs.filter((path) => path[0].depth < 0)) drawBranchPath(ctx, projection, path);
  if (trunk) drawBranchPath(ctx, projection, trunk);
  for (const path of limbs.filter((path) => path[0].depth >= 0)) drawBranchPath(ctx, projection, path);
}

function foregroundPrimaryPaths(branches: BranchSegment[]): BranchSegment[][] {
  return groupPaths(branches).filter((path) => path[0].level === 1
    && path.reduce((sum, branch) => sum + branch.depth, 0) / path.length > .18);
}

function drawBarkMarks(ctx: Ctx, projection: IsometricProjection, branches: BranchSegment[], art: OakArtParameters): number {
  const random = createRandom(0xbabacafe); let marks = 0;
  for (const branch of branches) {
    if (branch.level > 1 && random.next() < .62) continue;
    const a = projection.project(branch.start); const b = projection.project(branch.end);
    const count = Math.max(1, Math.round(branch.radiusStart * projection.scale * (branch.level === 0 ? .30 : .12)));
    for (let i = 0; i < count; i++) {
      const t = (i + random.next()) / count;
      const x = a.x + (b.x - a.x) * t + random.signed(branch.radiusStart * projection.scale * .20);
      const y = a.y + (b.y - a.y) * t;
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + random.signed((105 - art.barkMarkOrientation) * .012 + .08);
      const width = random.range(.65, 1.45); const length = width * random.range(art.barkMarkAspect * .72, art.barkMarkAspect * 1.45) * Math.max(.55, 1 - branch.level * .14);
      ctx.strokeStyle = rgba(random.next() > .76 ? '#d0a579' : '#29241f', random.range(.20, .50));
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * length * .5, y - Math.sin(angle) * length * .5);
      ctx.lineTo(x + Math.cos(angle) * length * .5, y + Math.sin(angle) * length * .5); ctx.stroke(); marks++;
    }
  }
  return marks;
}

interface LeafMark {
  x: number; y: number; depth: number; angle: number; length: number; width: number;
  color: string; alpha: number; kind: number;
}

function rotateY(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle); const sine = Math.sin(angle);
  return { x: point.x * cosine - point.z * sine, y: point.y, z: point.x * sine + point.z * cosine };
}

function lightStep(normal: Vec3, shell: number, core: boolean): number {
  const diffuse = Math.max(0, dot(normal, LIGHT)); const upper = Math.max(0, normal.y); const underside = Math.max(0, -normal.y);
  const occlusion = Math.min(.76, underside * .38 + (1 - shell) * .70 + (core ? .08 : 0));
  const value = diffuse * .72 + upper * .28 - occlusion;
  return value > .60 ? 4 : value > .32 ? 3 : value > .08 ? 2 : value > -.16 ? 1 : 0;
}

function makeCanopyMarks(mass: CanopyMass, projection: IsometricProjection, index: number, art: OakArtParameters): LeafMark[] {
  const random = createRandom(mass.seed); const marks: LeafMark[] = []; const ramp = LEAF_RAMPS[index % LEAF_RAMPS.length];
  const foundationCount = Math.round((mass.tier === 'core' ? 430 : 175) * mass.density);
  for (let i = 0; i < foundationCount; i++) {
    const theta = random.next() * TAU; const radial = Math.sqrt(random.next()) * .82;
    const local = rotateY({ x: Math.cos(theta) * mass.radius.x * radial,
      y: random.signed(mass.radius.y * .70) - mass.radius.y * .06,
      z: Math.sin(theta) * mass.radius.z * radial }, mass.rotation);
    const position = { x: mass.center.x + local.x, y: mass.center.y + local.y, z: mass.center.z + local.z };
    if (position.y < 4.75 && Math.hypot(position.x, position.z) < 1.18 && random.next() < .88) continue;
    const projected = projection.project(position); const upper = local.y / mass.radius.y;
    const projectedAxis = projection.project({ x: .12, y: position.y, z: .04 });
    if (position.y < 5.0 && position.y > 2.45 && Math.abs(projected.x - projectedAxis.x) < 132 && random.next() < .84) continue;
    marks.push({ x: projected.x, y: projected.y, depth: position.x + position.z - .24,
      angle: random.range(-1.0, 1.0), length: random.range(34, 62), width: random.range(15, 29),
      color: ramp[upper > .25 ? 2 : upper < -.30 ? 0 : 1], alpha: random.range(.54, .76), kind: .96 });
  }

  const count = Math.round((mass.tier === 'core' ? 1680 : 760) * mass.density);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const shellExponent = .68 - art.foliagePeripheralBias * .42;
  for (let i = 0; i < count; i++) {
    const yUnit = 1 - 2 * ((i + .5) / count); const ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const theta = i * golden + mass.rotation + random.signed(.12);
    const shell = .26 + .74 * Math.pow(random.next(), shellExponent);
    const lobe = 1 + Math.sin(theta * 3 + mass.seed * .000001) * mass.irregularity * .44
      + Math.sin(theta * 5 - yUnit * 2.8) * mass.irregularity * .28 + Math.sin(yUnit * 7 + theta) * mass.irregularity * .18;
    const local = rotateY({ x: Math.cos(theta) * ring * mass.radius.x * shell * lobe,
      y: yUnit * mass.radius.y * (.88 + .12 * lobe) * (.76 + .24 * shell),
      z: Math.sin(theta) * ring * mass.radius.z * shell * lobe }, mass.rotation * .45);
    const position = { x: mass.center.x + local.x, y: mass.center.y + local.y, z: mass.center.z + local.z };
    if (position.y < 4.70 && Math.hypot(position.x, position.z) < 1.10 && random.next() < .62) continue;
    const normal = normalize({ x: local.x / mass.radius.x, y: local.y / mass.radius.y, z: local.z / mass.radius.z });
    const step = lightStep(normal, shell, mass.tier === 'core'); const projected = projection.project(position);
    const projectedAxis = projection.project({ x: .12, y: position.y, z: .04 });
    if (position.y < 4.95 && position.y > 2.45 && Math.abs(projected.x - projectedAxis.x) < 112 && random.next() < .42) continue;
    const tangent = Math.atan2(-normal.y * .88 + (normal.x + normal.z) * .11, normal.x - normal.z)
      + Math.sin(theta * 2 + yUnit * 3) * .18 + random.signed(.24);
    const silhouette = shell > .84; const size = random.range(silhouette ? 17 : 19, silhouette ? 29 : 34) * (mass.tier === 'perimeter' ? .94 : 1);
    marks.push({ x: projected.x, y: projected.y, depth: position.x + position.z + shell * .05,
      angle: tangent, length: size, width: size * random.range(.34, .57),
      color: ramp[Math.max(0, Math.min(ramp.length - 1, step + (random.next() > .94 ? 1 : 0)))],
      alpha: random.range(shell < .54 ? .72 : .84, silhouette ? .98 : .94), kind: random.next() });
  }
  return marks;
}

function drawLeafMark(ctx: Ctx, mark: LeafMark): void {
  ctx.save(); ctx.translate(mark.x, mark.y); ctx.rotate(mark.angle); ctx.fillStyle = rgba(mark.color, mark.alpha);
  if (mark.kind < .64) {
    ctx.beginPath(); ctx.moveTo(-mark.length * .56, 0);
    ctx.quadraticCurveTo(-mark.length * .18, -mark.width, mark.length * .54, -mark.width * .05);
    ctx.quadraticCurveTo(mark.length * .08, mark.width * .78, -mark.length * .56, 0); ctx.fill();
  } else if (mark.kind < .84) {
    ctx.strokeStyle = rgba(mark.color, mark.alpha); ctx.lineWidth = Math.max(1.6, mark.width * .56); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-mark.length * .5, 0); ctx.quadraticCurveTo(0, -mark.width * .30, mark.length * .5, 0); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(0, 0, mark.length * .43, mark.width * .68, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawBaseOcclusion(ctx: Ctx, projection: IsometricProjection): number {
  const random = createRandom(0x66726f77); let marks = 0;
  for (let i = 0; i < 260; i++) {
    const angle = random.next() * TAU; const radius = random.range(.42, 2.05);
    const x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius;
    const point = projection.project({ x, y: random.range(.025, .08), z });
    const lean = -1.18 + random.signed(.34); const length = random.range(5, 18) * (1.2 - radius * .18);
    ctx.strokeStyle = rgba(random.next() > .48 ? '#667044' : '#8b8954', random.range(.38, .72));
    ctx.lineWidth = random.range(.8, 2.0); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + Math.cos(lean) * length, point.y + Math.sin(lean) * length); ctx.stroke(); marks++;
  }
  return marks;
}

function drawAtmosphericAccents(ctx: Ctx, projection: IsometricProjection): number {
  const random = createRandom(0x123fa91);
  for (let i = 0; i < 170; i++) {
    const angle = random.next() * TAU; const radius = random.range(1.2, 5.3);
    const point = projection.project({ x: Math.cos(angle) * radius, y: random.range(.02, .20), z: Math.sin(angle) * radius });
    ctx.fillStyle = rgba(random.next() > .62 ? '#d5c482' : '#788255', random.range(.16, .42));
    ctx.beginPath(); ctx.arc(point.x, point.y, random.range(.9, 2.3), 0, TAU); ctx.fill();
  }
  return 170;
}

export function renderOakArtwork(structure: OakStructure): ArtCache {
  const started = performance.now(); const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw new Error('Canvas 2D indisponible');
  const projection = createIsometricProjection(WIDTH * .50, HEIGHT * .895, 170);
  fillPaper(ctx); let marks = drawGround(ctx, projection); marks += drawAtmosphericAccents(ctx, projection);
  marks += drawRoots(ctx, projection, structure.roots, false);
  marks += drawRoots(ctx, projection, structure.roots, true);
  drawWoodyStructure(ctx, projection, structure.branches);
  marks += drawBarkMarks(ctx, projection, structure.branches, structure.art);

  const leafMarks = structure.canopy.flatMap((mass, index) => makeCanopyMarks(mass, projection, index, structure.art));
  leafMarks.sort((a, b) => a.depth - b.depth);
  const foregroundLimbs = foregroundPrimaryPaths(structure.branches);
  let insertedLimbs = false;
  for (const mark of leafMarks) {
    if (!insertedLimbs && mark.depth > 1.65) {
      for (const path of foregroundLimbs) drawBranchPath(ctx, projection, path);
      marks += drawBarkMarks(ctx, projection, foregroundLimbs.flat(), structure.art);
      insertedLimbs = true;
    }
    drawLeafMark(ctx, mark);
  }
  marks += leafMarks.length;

  // Foreground vegetation closes over projected root tips without hiding the flare geometry.
  marks += drawBaseOcclusion(ctx, projection);

  const focus = projection.project({ x: 0, y: 4.30, z: .35 });
  return { canvas, focus, stats: { marks, branches: structure.branches.length, canopyMasses: structure.canopy.length, renderMs: performance.now() - started } };
}
