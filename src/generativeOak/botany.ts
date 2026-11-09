import { createRandom } from './random';
import { add, mix, multiply, normalize, type Vec3 } from './projection';

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
}

export interface OakStructure {
  species: OakSpecies;
  branches: BranchSegment[];
  canopy: CanopyMass[];
}

export const ENGLISH_OAK: OakSpecies = {
  id: 'quercus-robur',
  seed: 0x4b4f4d4f,
  trunkHeight: 5.9,
  crownWidth: 7.1,
  crownHeight: 5.4,
  branchLevels: 3,
  leafDensity: 1,
};

interface Shoot {
  start: Vec3;
  direction: Vec3;
  length: number;
  radius: number;
  level: number;
  bias: number;
}

function bendDirection(direction: Vec3, outward: number, turn: number, lift: number): Vec3 {
  const azimuth = Math.atan2(direction.z, direction.x) + turn;
  const horizontal = Math.max(0.22, Math.hypot(direction.x, direction.z) + outward);
  return normalize({ x: Math.cos(azimuth) * horizontal, y: direction.y + lift, z: Math.sin(azimuth) * horizontal });
}

export function generateOak(species: OakSpecies = ENGLISH_OAK): OakStructure {
  const random = createRandom(species.seed);
  const branches: BranchSegment[] = [];
  const tips: Array<{ position: Vec3; level: number; depth: number; seed: number }> = [];

  const trunkKnots: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    trunkKnots.push({
      x: Math.sin(t * 4.4) * 0.10 + random.signed(0.035),
      y: species.trunkHeight * t,
      z: Math.sin(t * 3.1 + 1.2) * 0.08 + random.signed(0.035),
    });
    branches.push({
      start: trunkKnots[i - 1],
      end: trunkKnots[i],
      radiusStart: 0.48 * Math.pow(1 - (i - 1) / 10, 0.72),
      radiusEnd: 0.48 * Math.pow(1 - i / 10, 0.72),
      level: 0,
      depth: (trunkKnots[i - 1].x + trunkKnots[i - 1].z + trunkKnots[i].x + trunkKnots[i].z) * 0.5,
    });
  }

  const shoots: Shoot[] = [];
  const primaryCount = 12;
  for (let i = 0; i < primaryCount; i++) {
    const t = 0.30 + i / (primaryCount - 1) * 0.63;
    const base = mix(trunkKnots[0], trunkKnots[8], t);
    const azimuth = i * 2.3999632297 + random.signed(0.16);
    const lower = 1 - t;
    shoots.push({
      start: base,
      direction: normalize({
        x: Math.cos(azimuth) * (0.82 + lower * 0.75),
        y: 0.30 + t * 0.56,
        z: Math.sin(azimuth) * (0.82 + lower * 0.75),
      }),
      length: (2.35 + lower * 1.75) * random.range(0.88, 1.12),
      radius: 0.25 * (0.72 + lower * 0.55),
      level: 1,
      bias: azimuth,
    });
  }
  shoots.push({ start: trunkKnots[7], direction: normalize({ x: -0.18, y: 1, z: 0.12 }), length: 2.5, radius: 0.24, level: 1, bias: -0.4 });
  shoots.push({ start: trunkKnots[8], direction: normalize({ x: 0.25, y: 1, z: -0.16 }), length: 2.2, radius: 0.21, level: 1, bias: 0.7 });

  while (shoots.length) {
    const shoot = shoots.shift();
    if (!shoot) break;
    const pieces = shoot.level === 1 ? 5 : shoot.level === 2 ? 4 : 3;
    let cursor = shoot.start;
    let direction = shoot.direction;
    for (let piece = 0; piece < pieces; piece++) {
      const localLength = shoot.length / pieces * random.range(0.93, 1.07);
      direction = bendDirection(direction, 0, random.signed(0.075), shoot.level === 1 ? -0.005 : 0.018);
      const end = add(cursor, multiply(direction, localLength));
      const fromT = piece / pieces;
      const toT = (piece + 1) / pieces;
      branches.push({
        start: cursor,
        end,
        radiusStart: shoot.radius * Math.pow(1 - fromT * 0.78, 0.64),
        radiusEnd: shoot.radius * Math.pow(1 - toT * 0.78, 0.64),
        level: shoot.level,
        depth: (cursor.x + cursor.z + end.x + end.z) * 0.5,
      });
      cursor = end;
    }

    if (shoot.level < species.branchLevels) {
      const childCount = shoot.level === 1 ? 3 : 2;
      for (let child = 0; child < childCount; child++) {
        const side = child % 2 === 0 ? -1 : 1;
        const turn = side * (0.52 + random.range(0.05, 0.42)) + child * 0.16;
        const childDirection = bendDirection(direction, 0.22, turn, shoot.level === 1 ? 0.10 : 0.16);
        shoots.push({
          start: mix(shoot.start, cursor, 0.56 + child * 0.16),
          direction: childDirection,
          length: shoot.length * random.range(0.48, 0.66),
          radius: shoot.radius * random.range(0.48, 0.60),
          level: shoot.level + 1,
          bias: shoot.bias + turn,
        });
      }
      shoots.push({
        start: cursor,
        direction: bendDirection(direction, 0.06, random.signed(0.22), 0.10),
        length: shoot.length * random.range(0.47, 0.61),
        radius: shoot.radius * 0.55,
        level: shoot.level + 1,
        bias: shoot.bias,
      });
    } else {
      tips.push({ position: cursor, level: shoot.level, depth: cursor.x + cursor.z, seed: Math.floor(random.next() * 0xffffffff) });
    }
  }

  const canopy: CanopyMass[] = [];
  tips.sort((a, b) => a.depth - b.depth);
  for (let i = 0; i < tips.length; i++) {
    const tip = tips[i];
    if (i % 2 === 0 || (i % 4 === 1 && random.next() > 0.76)) {
      const lower = Math.max(0, Math.min(1, (tip.position.y - 3.1) / 5.0));
      canopy.push({
        center: add(tip.position, { x: random.signed(0.17), y: random.range(-0.08, 0.24), z: random.signed(0.17) }),
        radius: {
          x: random.range(0.92, 1.35) * (1.08 - lower * 0.12),
          y: random.range(0.62, 0.92),
          z: random.range(0.88, 1.30) * (1.08 - lower * 0.12),
        },
        rotation: random.range(-Math.PI, Math.PI),
        density: random.range(0.78, 1.13),
        seed: tip.seed,
        depth: tip.depth,
      });
    }
  }

  // Port de chêne adulte : la couronne s'étale davantage qu'elle ne file en hauteur.
  // Cette transformation conserve la ramification mais comprime la cime et ouvre les axes.
  const oakForm = (source: Vec3): Vec3 => {
    const point = { ...source };
    if (point.y <= 3.2) return point;
    const height = point.y - 3.2;
    point.y = 3.2 + height * 0.76;
    const spread = 1.08 + Math.min(0.10, height * 0.012);
    point.x *= spread;
    point.z *= spread;
    return point;
  };
  for (const branch of branches) {
    branch.start = oakForm(branch.start);
    branch.end = oakForm(branch.end);
    branch.depth = (branch.start.x + branch.start.z + branch.end.x + branch.end.z) * 0.5;
  }
  for (const mass of canopy) {
    mass.center = oakForm(mass.center);
    mass.radius.x *= 1.10;
    mass.radius.z *= 1.10;
    mass.radius.y *= 0.90;
    mass.depth = mass.center.x + mass.center.z;
  }

  return { species, branches, canopy };
}
