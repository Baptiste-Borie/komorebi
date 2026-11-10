import { quercusRoburProceduralProfile } from '../botany/species/quercusRoburProcedural';
import { createRandom } from './random';
import { add, mix, multiply, normalize, subtract, type Vec3 } from './projection';

export interface OakSpecies {
  id: 'quercus-robur'; seed: number; trunkHeight: number; crownWidth: number;
  crownHeight: number; branchLevels: number; leafDensity: number;
}

export interface OakArtParameters {
  crownAspectWidthToHeight: number; crownIrregularity: number; crownDensity: number;
  trunkClearHeightToTreeHeight: number; trunkBaseRadiusToDbhRadius: number; trunkTaper: number;
  primaryBranchCount: number; primaryBranchElevation: number; branchCurvature: number;
  branchAzimuthIrregularity: number; foliageClusterScale: number; foliagePeripheralBias: number;
  barkMarkOrientation: number; barkMarkAspect: number;
}

export interface BranchSegment {
  start: Vec3; end: Vec3; radiusStart: number; radiusEnd: number; level: number;
  depth: number; pathId: number; segmentIndex: number;
}

export interface RootButtress {
  azimuth: number; length: number; width: number; rise: number; bend: number; depth: number;
}

export interface CanopyMass {
  center: Vec3; radius: Vec3; rotation: number; density: number; seed: number;
  depth: number; irregularity: number; tier: 'core' | 'perimeter';
}

export interface OakStructure {
  species: OakSpecies; art: OakArtParameters; branches: BranchSegment[];
  roots: RootButtress[]; canopy: CanopyMass[];
}

export const ENGLISH_OAK: OakSpecies = {
  id: 'quercus-robur', seed: 0x4b4f4d4f, trunkHeight: 5.25, crownWidth: 9.4,
  crownHeight: 5.35, branchLevels: 3, leafDensity: 1,
};

interface CrownTemplate {
  center: Vec3; radius: Vec3; rotation: number; density: number; tier: 'core' | 'perimeter';
}

// Unequal overlapping crown rooms follow the load-bearing limbs. The lower lobes
// keep the open-grown silhouette wide without turning it into a single oval.
const CROWN: CrownTemplate[] = [
  { center: { x: -2.65, y: 5.35, z: -0.55 }, radius: { x: 2.18, y: 1.34, z: 1.76 }, rotation: -0.28, density: 1.10, tier: 'core' },
  { center: { x: -0.78, y: 6.18, z: -0.72 }, radius: { x: 2.30, y: 1.48, z: 1.72 }, rotation: 0.18, density: 1.15, tier: 'core' },
  { center: { x: 1.32, y: 6.34, z: -0.38 }, radius: { x: 2.38, y: 1.44, z: 1.78 }, rotation: -0.12, density: 1.16, tier: 'core' },
  { center: { x: 3.04, y: 5.52, z: -0.08 }, radius: { x: 2.02, y: 1.28, z: 1.62 }, rotation: 0.24, density: 1.08, tier: 'core' },
  { center: { x: -1.94, y: 4.68, z: 1.06 }, radius: { x: 2.08, y: 1.25, z: 1.82 }, rotation: 0.36, density: 1.12, tier: 'core' },
  { center: { x: 0.22, y: 5.08, z: 1.18 }, radius: { x: 2.38, y: 1.40, z: 1.88 }, rotation: -0.30, density: 1.19, tier: 'core' },
  { center: { x: 2.28, y: 4.80, z: 1.42 }, radius: { x: 2.02, y: 1.24, z: 1.72 }, rotation: 0.14, density: 1.13, tier: 'core' },
  { center: { x: -0.18, y: 6.76, z: 0.42 }, radius: { x: 2.10, y: 1.08, z: 1.54 }, rotation: 0.08, density: 1.03, tier: 'core' },
  { center: { x: 1.74, y: 6.82, z: 0.74 }, radius: { x: 1.82, y: 1.00, z: 1.44 }, rotation: -0.26, density: 0.99, tier: 'core' },
  { center: { x: -4.24, y: 4.82, z: -0.16 }, radius: { x: 1.36, y: 0.98, z: 1.18 }, rotation: -0.38, density: 0.93, tier: 'perimeter' },
  { center: { x: -3.68, y: 6.28, z: -0.62 }, radius: { x: 1.36, y: 0.98, z: 1.16 }, rotation: 0.28, density: 0.94, tier: 'perimeter' },
  { center: { x: -2.46, y: 6.74, z: -0.20 }, radius: { x: 1.66, y: 0.92, z: 1.24 }, rotation: -0.20, density: 0.95, tier: 'perimeter' },
  { center: { x: 4.20, y: 6.08, z: -0.28 }, radius: { x: 1.42, y: 0.98, z: 1.20 }, rotation: 0.22, density: 0.94, tier: 'perimeter' },
  { center: { x: 4.42, y: 4.50, z: 0.72 }, radius: { x: 1.32, y: 0.90, z: 1.18 }, rotation: -0.22, density: 0.91, tier: 'perimeter' },
  { center: { x: 3.08, y: 3.94, z: 1.78 }, radius: { x: 1.38, y: 0.88, z: 1.22 }, rotation: 0.34, density: 0.93, tier: 'perimeter' },
  { center: { x: 0.96, y: 3.88, z: 2.18 }, radius: { x: 1.42, y: 0.88, z: 1.30 }, rotation: -0.16, density: 0.96, tier: 'perimeter' },
  { center: { x: -1.20, y: 3.86, z: 2.10 }, radius: { x: 1.46, y: 0.90, z: 1.32 }, rotation: 0.12, density: 0.97, tier: 'perimeter' },
  { center: { x: -3.34, y: 4.00, z: 1.42 }, radius: { x: 1.40, y: 0.90, z: 1.24 }, rotation: -0.32, density: 0.92, tier: 'perimeter' },
  { center: { x: 0.88, y: 7.06, z: 0.18 }, radius: { x: 1.74, y: 0.74, z: 1.18 }, rotation: 0.24, density: 0.90, tier: 'perimeter' },
];

type RangeKey = keyof typeof quercusRoburProceduralProfile.parameters;

function resolveArtParameters(seed: number): OakArtParameters {
  const random = createRandom(seed ^ 0x51f15e);
  const resolve = (key: RangeKey, bias = 0.5): number => {
    const range = quercusRoburProceduralProfile.parameters[key].value;
    const jitteredBias = Math.max(0.08, Math.min(0.92, bias + random.signed(0.08)));
    return range.min + (range.max - range.min) * jitteredBias;
  };
  return {
    crownAspectWidthToHeight: resolve('crownAspectWidthToHeight', 0.62),
    crownIrregularity: resolve('crownIrregularity', 0.64), crownDensity: resolve('crownDensity', 0.76),
    trunkClearHeightToTreeHeight: resolve('trunkClearHeightToTreeHeight', 0.34),
    trunkBaseRadiusToDbhRadius: resolve('trunkBaseRadiusToDbhRadius', 0.72),
    trunkTaper: resolve('trunkTaper', 0.68), primaryBranchCount: Math.round(resolve('primaryBranchCount', 0.52)),
    primaryBranchElevation: resolve('primaryBranchElevation', 0.42), branchCurvature: resolve('branchCurvature', 0.68),
    branchAzimuthIrregularity: resolve('branchAzimuthIrregularity', 0.70),
    foliageClusterScale: resolve('foliageClusterScale', 0.66), foliagePeripheralBias: resolve('foliagePeripheralBias', 0.45),
    barkMarkOrientation: resolve('barkMarkOrientation', 0.50), barkMarkAspect: resolve('barkMarkAspect', 0.58),
  };
}

function appendTaperedPath(
  branches: BranchSegment[], random: ReturnType<typeof createRandom>, start: Vec3, target: Vec3,
  radius: number, endRadius: number, level: number, pieces: number, pathId: number,
  curvature: number, sag = 0,
): Vec3 {
  let cursor = start;
  const lateral = normalize({ x: -(target.z - start.z), y: 0, z: target.x - start.x });
  const bendSign = random.next() > 0.5 ? 1 : -1;
  for (let i = 1; i <= pieces; i++) {
    const t = i / pieces;
    const eased = t * t * (3 - 2 * t);
    const base = mix(start, target, eased);
    const arc = Math.sin(t * Math.PI);
    const secondaryArc = Math.sin(t * Math.PI * 2);
    const end = add(base, {
      x: lateral.x * (arc * bendSign * curvature * 0.27 + secondaryArc * curvature * 0.07) + random.signed(0.018),
      y: arc * sag + secondaryArc * curvature * 0.045 + random.signed(0.016),
      z: lateral.z * (arc * bendSign * curvature * 0.27 + secondaryArc * curvature * 0.07) + random.signed(0.018),
    });
    const fromT = (i - 1) / pieces;
    const radiusStart = radius + (endRadius - radius) * Math.pow(fromT, 0.72);
    const radiusEnd = radius + (endRadius - radius) * Math.pow(t, 0.72);
    branches.push({ start: cursor, end, radiusStart, radiusEnd, level,
      depth: (cursor.x + cursor.z + end.x + end.z) * 0.5, pathId, segmentIndex: i - 1 });
    cursor = end;
  }
  return cursor;
}

export function generateOak(species: OakSpecies = ENGLISH_OAK): OakStructure {
  const random = createRandom(species.seed);
  const art = resolveArtParameters(species.seed);
  const branches: BranchSegment[] = [];
  const trunk: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  const trunkRadii: number[] = [];
  const trunkPieces = 15;
  const dbhRadius = 0.49;
  const baseRadius = dbhRadius * art.trunkBaseRadiusToDbhRadius;

  for (let i = 0; i <= trunkPieces; i++) {
    const t = i / trunkPieces;
    const rootTransition = Math.exp(-t * 13);
    const radius = dbhRadius * Math.pow(1 - t * art.trunkTaper, 0.72) + (baseRadius - dbhRadius) * rootTransition;
    trunkRadii.push(radius);
    if (i === 0) continue;
    const end = { x: Math.sin(t * 3.7) * 0.29 + Math.sin(t * 8.6) * 0.060 + t * 0.16,
      y: species.trunkHeight * t,
      z: Math.sin(t * 2.8 + 0.65) * 0.19 + Math.sin(t * 7.1) * 0.045 - t * 0.08 };
    branches.push({ start: trunk[i - 1], end, radiusStart: trunkRadii[i - 1], radiusEnd: radius,
      level: 0, depth: end.x + end.z, pathId: 0, segmentIndex: i - 1 });
    trunk.push(end);
  }

  const totalHeight = species.trunkHeight + species.crownHeight * 0.56;
  const clearHeight = totalHeight * art.trunkClearHeightToTreeHeight;
  const forkIndices = [Math.round(trunkPieces * clearHeight / species.trunkHeight), 6, 7, 8, 9, 10, 11, 12];
  const leaderTemplates = [
    { target: { x: -4.34, y: 4.80, z: -0.14 }, weight: 1.00, sag: -0.30 },
    { target: { x: 4.28, y: 4.62, z: 0.78 }, weight: 0.96, sag: -0.25 },
    { target: { x: -3.34, y: 5.72, z: 1.38 }, weight: 0.90, sag: 0.02 },
    { target: { x: 3.48, y: 5.92, z: -0.44 }, weight: 0.88, sag: 0.08 },
    { target: { x: -2.10, y: 7.10, z: -0.54 }, weight: 0.82, sag: 0.24 },
    { target: { x: 2.34, y: 7.02, z: 0.78 }, weight: 0.78, sag: 0.22 },
    { target: { x: -0.62, y: 8.18, z: 0.12 }, weight: 0.72, sag: 0.32 },
    { target: { x: 1.08, y: 8.34, z: 0.02 }, weight: 0.68, sag: 0.34 },
  ].slice(0, art.primaryBranchCount);

  const leaderEnds: Vec3[] = [];
  for (let i = 0; i < leaderTemplates.length; i++) {
    const leader = leaderTemplates[i];
    const forkIndex = Math.max(3, Math.min(trunkPieces - 1, forkIndices[i] ?? (5 + i)));
    const start = trunk[forkIndex];
    const parentRadius = trunkRadii[forkIndex];
    const radius = parentRadius * (0.76 - i * 0.035) * leader.weight;
    const target = { ...leader.target, y: leader.target.y + (art.primaryBranchElevation - 23) * .018 };
    leaderEnds.push(appendTaperedPath(branches, random, start, target, radius,
      Math.max(0.075, radius * 0.25), 1, 7, i + 1, art.branchCurvature, leader.sag));
  }

  const secondaryTargets = CROWN.filter((mass) => mass.tier === 'core');
  let nextPathId = 20;
  for (let i = 0; i < secondaryTargets.length; i++) {
    const parent = leaderEnds[i % leaderEnds.length];
    const crown = secondaryTargets[i];
    const target = add(crown.center, { x: random.signed(0.42), y: random.range(-0.28, 0.20), z: random.signed(0.42) });
    appendTaperedPath(branches, random, mix(parent, target, 0.08), target,
      0.17 + random.range(0.015, 0.055), 0.045, 2, 4, nextPathId++, art.branchCurvature * 0.78, 0.07);
    for (let child = 0; child < 2; child++) {
      const direction = normalize(subtract(target, parent));
      const side = normalize({ x: -direction.z, y: 0.32 + random.next() * 0.22, z: direction.x });
      const childTarget = add(target, multiply(side, (child ? -1 : 1) * random.range(0.62, 1.02)));
      appendTaperedPath(branches, random, mix(parent, target, 0.50 + child * 0.17), childTarget,
        random.range(0.075, 0.105), 0.025, 3, 3, nextPathId++, art.branchCurvature * 0.62, 0.04);
    }
  }

  const roots: RootButtress[] = [];
  for (let i = 0; i < 6; i++) {
    const regular = (i / 6) * Math.PI * 2;
    const azimuth = regular + random.signed(0.30 * art.branchAzimuthIrregularity) + 0.26;
    roots.push({ azimuth, length: random.range(0.92, 1.68) * (i === 1 || i === 4 ? 1.14 : 1),
      width: baseRadius * random.range(0.28, 0.48), rise: random.range(0.36, 0.70),
      bend: random.signed(0.24), depth: Math.cos(azimuth) + Math.sin(azimuth) });
  }

  const densityScale = art.crownDensity / 0.79;
  const irregularityScale = art.crownIrregularity / 0.60;
  const clusterScale = 0.96 + (art.foliageClusterScale - 0.08) * 0.72;
  const aspectScale = art.crownAspectWidthToHeight / 1.25;
  const speciesWidthScale = species.crownWidth / 9.4;
  const canopy = CROWN.map((template, index): CanopyMass => ({
    ...template,
    center: add(template.center, { x: random.signed(0.10), y: random.signed(0.07), z: random.signed(0.10) }),
    radius: {
      x: template.radius.x * clusterScale * aspectScale * speciesWidthScale,
      y: template.radius.y * clusterScale / Math.sqrt(aspectScale),
      z: template.radius.z * clusterScale * Math.sqrt(aspectScale) * speciesWidthScale,
    },
    density: template.density * species.leafDensity * densityScale,
    seed: (species.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0,
    depth: template.center.x + template.center.z,
    irregularity: (template.tier === 'core' ? random.range(0.15, 0.22) : random.range(0.20, 0.28)) * irregularityScale,
  }));

  return { species, art, branches, roots, canopy };
}
