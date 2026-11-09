export interface Vec3 { x: number; y: number; z: number; }
export interface Point2 { x: number; y: number; depth: number; }

export interface IsometricProjection {
  project(point: Vec3): Point2;
  scale: number;
}

export function createIsometricProjection(
  centerX: number,
  groundY: number,
  scale: number,
): IsometricProjection {
  const horizontal = scale * 0.82;
  const groundDepth = scale * 0.40;
  return {
    scale,
    project(point) {
      return {
        x: centerX + (point.x - point.z) * horizontal,
        y: groundY + (point.x + point.z) * groundDepth - point.y * scale,
        depth: point.x + point.z + point.y * 0.025,
      };
    },
  };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function multiply(a: Vec3, amount: number): Vec3 {
  return { x: a.x * amount, y: a.y * amount, z: a.z * amount };
}

export function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return multiply(a, 1 / length);
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
