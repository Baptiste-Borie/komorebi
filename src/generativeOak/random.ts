export interface RandomSource {
  next(): number;
  range(min: number, max: number): number;
  signed(amount?: number): number;
  gaussian(): number;
}

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  let spare: number | undefined;
  const next = (): number => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    signed: (amount = 1) => (next() * 2 - 1) * amount,
    gaussian: () => {
      if (spare !== undefined) {
        const value = spare;
        spare = undefined;
        return value;
      }
      const radius = Math.sqrt(-2 * Math.log(Math.max(1e-9, next())));
      const angle = Math.PI * 2 * next();
      spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    },
  };
}
