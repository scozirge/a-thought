export const ARENA_LIMIT = 17;
export const ROUND_SECONDS = 90;
export const TARGET_SCORE = 10;
export const WEAPONS = [
  { name: '泡泡步槍', magazine: 18, interval: 0.16, damage: 1, reload: 1.3, unlock: 0, color: '#477e83' },
  { name: '重型泡泡槍', magazine: 6, interval: 0.65, damage: 2, reload: 1.7, unlock: 3, color: '#b2774e' },
  { name: '連發泡泡槍', magazine: 30, interval: 0.085, damage: 1, reload: 1.5, unlock: 6, color: '#8a72ac' },
] as const;

export function unlockedWeapon(score: number) {
  return score >= 6 ? 2 : score >= 3 ? 1 : 0;
}

export function turnView(yaw: number, pitch: number, dx: number, dy: number, sensitivity: number) {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: Math.max(-1.15, Math.min(1.15, pitch - dy * sensitivity)),
  };
}
export const COVER = [
  { x: -5, z: 5, w: 4, d: 2, h: 2.4 },
  { x: 5, z: 3, w: 3, d: 3, h: 2.4 },
  { x: -6, z: -5, w: 3, d: 4, h: 2.4 },
  { x: 5, z: -7, w: 5, d: 2, h: 2.4 },
] as const;

export function canStand(x: number, z: number, radius = 0.45) {
  return Math.abs(x) <= ARENA_LIMIT - radius && Math.abs(z) <= ARENA_LIMIT - radius &&
    !COVER.some((box) => Math.abs(x - box.x) < box.w / 2 + radius &&
      Math.abs(z - box.z) < box.d / 2 + radius);
}

export function moveInArena(position: { x: number; z: number }, dx: number, dz: number) {
  // Slide along cover rather than stopping both movement axes.
  if (canStand(position.x + dx, position.z)) position.x += dx;
  if (canStand(position.x, position.z + dz)) position.z += dz;
}
