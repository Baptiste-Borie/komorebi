/** Une scène botanique partagée par TOUS les rendus. Aucune dépendance à Blender. */
export type PlantType = 'broadleaf' | 'birch' | 'willow' | 'pine' | 'blossom' | 'shrub' | 'fern' | 'flower' | 'reeds' | 'grass';
export interface Species { id: string; name: string; type: PlantType; tone: number; height: number; }
export interface Specimen { x: number; z: number; scale: number; species: Species; seed: number; }
export interface GardenScene { seed: number; biodiversity: number; abundance: number; plants: Specimen[]; }

export const species: Species[] = [
  { id: 'quercus', name: 'Chêne', type: 'broadleaf', tone: 0, height: 1.35 },
  { id: 'betula', name: 'Bouleau', type: 'birch', tone: 1, height: 1.4 },
  { id: 'salix', name: 'Saule', type: 'willow', tone: 2, height: 1.2 },
  { id: 'pinus', name: 'Pin', type: 'pine', tone: 3, height: 1.32 },
  { id: 'prunus', name: 'Cerisier', type: 'blossom', tone: 4, height: 1.08 },
  { id: 'acer', name: 'Érable', type: 'broadleaf', tone: 5, height: 1.2 },
  { id: 'buxus', name: 'Buis', type: 'shrub', tone: 1, height: .56 },
  { id: 'dryopteris', name: 'Fougère', type: 'fern', tone: 0, height: .46 },
  { id: 'lavandula', name: 'Lavande', type: 'flower', tone: 6, height: .38 },
  { id: 'bellis', name: 'Marguerite', type: 'flower', tone: 7, height: .43 },
  { id: 'papaver', name: 'Coquelicot', type: 'flower', tone: 8, height: .48 },
  { id: 'phragmites', name: 'Roseau', type: 'reeds', tone: 2, height: .70 },
  { id: 'stipa', name: 'Stipe', type: 'grass', tone: 9, height: .36 },
  { id: 'hydrangea', name: 'Hortensia', type: 'shrub', tone: 6, height: .65 },
];

// PRNG stable : variation reproductible lorsque l'on passe d'un style à l'autre.
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGarden(seed: number, biodiversity: number, abundance: number): GardenScene {
  const random = rng(seed);
  const active = species.slice(0, biodiversity);
  const plants: Specimen[] = [];
  // Des positions centrales sélectionnées pour composer une scène agréable à faible densité.
  const anchors: [number, number][] = [
    [-3.4,-3.2],[3.0,-3.5],[-4.1,.4],[3.6,2.5],[-1.0,-3.8],
    [-3.2,2.8],[2.9,-.8],[.7,3.7],[-1.4,3.1],[4.0,-2.4],
    [-4.0,-1.9],[2.0,4.0],[.2,-4.1],[-2.7,3.7],
  ];
  for (let i = 0; i < abundance; i++) {
    let x: number, z: number;
    if (i < anchors.length) {
      x = anchors[i][0] + (random() - .5) * .42;
      z = anchors[i][1] + (random() - .5) * .42;
    } else {
      x = (random() - .5) * 8.9;
      z = (random() - .5) * 8.9;
    }
    // Le centre est réservé à une mare visible dans tous les styles.
    const nearPond = (x - .45) ** 2 / 1.9 ** 2 + (z + .22) ** 2 / 1.55 ** 2;
    if (nearPond < 1.25) { x += x < .45 ? -1.45 : 1.45; z += z < -.22 ? -.6 : .6; }
    x = Math.max(-4.5, Math.min(4.5, x));
    z = Math.max(-4.5, Math.min(4.5, z));
    // Les arbres sont dominants au fond ; diversité d'espèces pour tester l'évolutivité.
    const speciesIndex = i < active.length ? i : Math.floor(random() * active.length);
    let current = active[speciesIndex];
    if (i > 14 && random() < .65) current = active[Math.floor(random() * active.length)];
    const foreground = x + z > 1.7;
    if (foreground && current.height > 1 && random() < .6) current = active[Math.floor(random() * active.length)];
    plants.push({ x, z, species: current, scale: .72 + random() * .5, seed: Math.floor(random() * 1000000) });
  }
  plants.sort((a, b) => (a.x + a.z) - (b.x + b.z));
  return { seed, biodiversity, abundance, plants };
}
