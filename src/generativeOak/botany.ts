import { createRandom } from './random';
import { add, mix, multiply, normalize, subtract, type Vec3 } from './projection';

export interface OakSpecies {
  id: 'quercus-robur';
  seed: number;
  trunkHeight: number;
  crownWidth: number;
  crownHeight: number;
  branchLevels: number;
  leafDensity: number;
}

export interface BranchSegment {
  start: Vec3;
  end: Vec3;
  radiusStart: number;
  radiusEnd: number;
  level: number;
  depth: number;
}

export interface CanopyMass {
  center: Vec3;
  radius: Vec3;
  rotation: number;
  density: number;
  seed: number;
  depth: number;
  irregularity: number;
  tier: 'core' | 'perimeter';
}

export interface OakStructure {
  species: OakSpecies;
  branches: BranchSegment[];
  canopy: CanopyMass[];
}

export const ENGLISH_OAK: OakSpecies = {
  id: 'quercus-robur',
  seed: 0x4b4f4d4f,
  trunkHeight: 5.7,
  crownWidth: 8.4,
  crownHeight: 4.9,
  branchLevels: 3,
  leafDensity: 1,
};

interface CrownTemplate {
  center: Vec3;
  radius: Vec3;
  rotation: number;
  density: number;
  tier: 'core' | 'perimeter';
}

// Old field-grown oak: a low spreading dome, displaced upper crown, and smaller edge lobes.
// Deliberate voids remain between the lower and outer boughs, avoiding a generic green oval.
const CROWN: CrownTemplate[] = [
  { center: { x: -2.55, y: 5.55, z: -0.55 }, radius: { x: 2.00, y: 1.28, z: 1.62 }, rotation: -0.28, density: 1.10, tier: 'core' },
  { center: { x: -0.85, y: 6.36, z: -0.72 }, radius: { x: 2.18, y: 1.46, z: 1.62 }, rotation: 0.18, density: 1.14, tier: 'core' },
  { center: { x: 1.20, y: 6.60, z: -0.38 }, radius: { x: 2.22, y: 1.42, z: 1.68 }, rotation: -0.12, density: 1.15, tier: 'core' },
  { center: { x: 2.82, y: 5.82, z: -0.08 }, radius: { x: 1.82, y: 1.22, z: 1.52 }, rotation: 0.24, density: 1.08, tier: 'core' },
  { center: { x: -1.82, y: 4.92, z: 1.06 }, radius: { x: 1.92, y: 1.20, z: 1.72 }, rotation: 0.36, density: 1.12, tier: 'core' },
  { center: { x: 0.28, y: 5.38, z: 1.18 }, radius: { x: 2.22, y: 1.36, z: 1.78 }, rotation: -0.30, density: 1.18, tier: 'core' },
  { center: { x: 2.18, y: 5.05, z: 1.42 }, radius: { x: 1.86, y: 1.18, z: 1.62 }, rotation: 0.14, density: 1.12, tier: 'core' },
  { center: { x: -0.08, y: 7.42, z: 0.42 }, radius: { x: 1.64, y: 1.18, z: 1.38 }, rotation: 0.08, density: 1.02, tier: 'core' },
  { center: { x: 1.72, y: 7.20, z: 0.74 }, radius: { x: 1.48, y: 1.02, z: 1.32 }, rotation: -0.26, density: 0.98, tier: 'core' },
  { center: { x: -4.02, y: 5.05, z: -0.16 }, radius: { x: 1.18, y: 0.92, z: 1.08 }, rotation: -0.38, density: 0.90, tier: 'perimeter' },
  { center: { x: -3.55, y: 6.55, z: -0.62 }, radius: { x: 1.22, y: 0.94, z: 1.08 }, rotation: 0.28, density: 0.91, tier: 'perimeter' },
  { center: { x: -2.18, y: 7.55, z: -0.20 }, radius: { x: 1.28, y: 0.96, z: 1.16 }, rotation: -0.20, density: 0.94, tier: 'perimeter' },
  { center: { x: 3.92, y: 6.42, z: -0.28 }, radius: { x: 1.26, y: 0.94, z: 1.14 }, rotation: 0.22, density: 0.92, tier: 'perimeter' },
  { center: { x: 4.18, y: 4.78, z: 0.72 }, radius: { x: 1.16, y: 0.86, z: 1.12 }, rotation: -0.22, density: 0.88, tier: 'perimeter' },
  { center: { x: 2.92, y: 4.18, z: 1.78 }, radius: { x: 1.22, y: 0.82, z: 1.18 }, rotation: 0.34, density: 0.91, tier: 'perimeter' },
  { center: { x: 0.96, y: 4.12, z: 2.18 }, radius: { x: 1.28, y: 0.82, z: 1.24 }, rotation: -0.16, density: 0.94, tier: 'perimeter' },
  { center: { x: -1.12, y: 4.10, z: 2.10 }, radius: { x: 1.34, y: 0.86, z: 1.26 }, rotation: 0.12, density: 0.95, tier: 'perimeter' },
  { center: { x: -3.16, y: 4.26, z: 1.42 }, radius: { x: 1.24, y: 0.84, z: 1.18 }, rotation: -0.32, density: 0.89, tier: 'perimeter' },
  { center: { x: 0.88, y: 8.20, z: 0.18 }, radius: { x: 1.15, y: 0.84, z: 1.04 }, rotation: 0.24, density: 0.88, tier: 'perimeter' },
];

function appendTaperedPath(
  branches: BranchSegment[],
  random: ReturnType<typeof createRandom>,
  start: Vec3,
  target: Vec3,
  radius: number,
  level: number,
  pieces: number,
  sag = 0,
): Vec3 {
  let cursor = start;
  const lateral = normalize({ x: -(target.z - start.z), y: 0, z: target.x - start.x });
  for (let i = 1; i <= pieces; i++) {
    const t = i / pieces;
    const eased = t * t * (3 - 2 * t);
    const base = mix(start, target, eased);
    const arc = Math.sin(t * Math.PI);
    const end = add(base, {
      x: lateral.x * arc * random.signed(0.12 + level * 0.025),
      y: arc * sag + random.signed(0.025),
      z: lateral.z * arc * random.signed(0.12 + level * 0.025),
    });
    const fromT = (i - 1) / pieces;
    const radiusStart = radius * Math.pow(1 - fromT * 0.78, 0.68);
    const radiusEnd = radius * Math.pow(1 - t * 0.78, 0.68);
    branches.push({
      start: cursor,
      end,
      radiusStart,
      radiusEnd,
      level,
      depth: (cursor.x + cursor.z + end.x + end.z) * 0.5,
    });
    cursor = end;
  }
  return cursor;
}

export function generateOak(species: OakSpecies = ENGLISH_OAK): OakStructure {
  const random = createRandom(species.seed);
  const branches: BranchSegment[] = [];
  const trunk: Vec3[] = [{ x: 0, y: 0, z: 0 }];

  for (let i = 1; i <= 13; i++) {
    const t = i / 13;
    const end = {
      x: Math.sin(t * 4.1) * 0.175 + Math.sin(t * 9.2) * 0.040,
      y: species.trunkHeight * t,
      z: Math.sin(t * 3.0 + 0.7) * 0.130 + Math.sin(t * 7.3) * 0.032,
    };
    const radiusStart = 0.53 * Math.pow(1 - (i - 1) / 16.5, 0.82);
    const radiusEnd = 0.53 * Math.pow(1 - i / 16.5, 0.82);
    branches.push({ start: trunk[i - 1], end, radiusStart, radiusEnd, level: 0, depth: end.x + end.z });
    trunk.push(end);
  }

  const leaders = [
    { from: 0.39, target: { x: -4.12, y: 5.12, z: -0.10 }, radius: 0.34 },
    { from: 0.44, target: { x: 3.98, y: 4.92, z: 0.76 }, radius: 0.33 },
    { from: 0.50, target: { x: -3.08, y: 5.82, z: 1.30 }, radius: 0.31 },
    { from: 0.56, target: { x: 3.20, y: 6.10, z: -0.36 }, radius: 0.30 },
    { from: 0.62, target: { x: -1.95, y: 7.25, z: -0.48 }, radius: 0.29 },
    { from: 0.67, target: { x: 2.20, y: 7.15, z: 0.70 }, radius: 0.28 },
    { from: 0.73, target: { x: -0.72, y: 8.05, z: 0.18 }, radius: 0.27 },
    { from: 0.77, target: { x: 1.02, y: 8.48, z: 0.08 }, radius: 0.25 },
  ];

  const leaderEnds: Vec3[] = [];
  for (const leader of leaders) {
    const start = mix(trunk[0], trunk[13], leader.from);
    leaderEnds.push(appendTaperedPath(branches, random, start, leader.target, leader.radius, 1, 6, leader.target.y < 6 ? -0.20 : 0.20));
  }

  const secondaryTargets = CROWN.filter((mass) => mass.tier === 'core');
  for (let i = 0; i < secondaryTargets.length; i++) {
    const parent = leaderEnds[i % leaderEnds.length];
    const crown = secondaryTargets[i];
    const target = add(crown.center, { x: random.signed(0.46), y: random.range(-0.32, 0.22), z: random.signed(0.46) });
    appendTaperedPath(branches, random, mix(parent, target, 0.12), target, 0.15 + random.range(0.01, 0.05), 2, 4, 0.08);
    for (let child = 0; child < 2; child++) {
      const direction = normalize(subtract(target, parent));
      const side = normalize({ x: -direction.z, y: 0.35 + random.next() * 0.22, z: direction.x });
      const childTarget = add(target, multiply(side, (child ? -1 : 1) * random.range(0.58, 0.94)));
      appendTaperedPath(branches, random, mix(parent, target, 0.56 + child * 0.16), childTarget, random.range(0.070, 0.095), 3, 3, 0.05);
    }
  }

  const canopy = CROWN.map((template, index): CanopyMass => ({
    ...template,
    center: add(template.center, { x: random.signed(0.09), y: random.signed(0.06), z: random.signed(0.09) }),
    radius: { ...template.radius },
    density: template.density * species.leafDensity,
    seed: (species.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0,
    depth: template.center.x + template.center.z,
    irregularity: template.tier === 'core' ? random.range(0.16, 0.23) : random.range(0.20, 0.29),
  }));

  return { species, branches, canopy };
}
