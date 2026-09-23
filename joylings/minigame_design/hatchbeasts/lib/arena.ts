export const ARENA_LIMIT = 17;
export const ROUND_SECONDS = 60;
export const TARGET_SCORE = 5;
export const WEAPONS = [
  { name: '突擊步槍', magazine: 30, interval: 0.12, damage: 20, reload: 1.6, color: '#313a48', range: 60 },
  { name: '手槍', magazine: 12, interval: 0.3, damage: 28, reload: 1.1, color: '#778191', range: 45 },
  { name: '戰術刀', magazine: 1, interval: 0.55, damage: 60, reload: 0, color: '#d7e6ed', range: 2.8 },
] as const;

export function resolveRound(playerHealth: number, opponentHealth: number): 'player' | 'opponent' | 'draw' {
  return playerHealth > opponentHealth ? 'player' : playerHealth < opponentHealth ? 'opponent' : 'draw';
}

export function awardRound(player: number, opponent: number, winner: 'player' | 'opponent' | 'draw') {
  const playerScore = player + Number(winner === 'player');
  const opponentScore = opponent + Number(winner === 'opponent');
  return { player: playerScore, opponent: opponentScore,
    result: playerScore >= TARGET_SCORE ? 'won' as const : opponentScore >= TARGET_SCORE ? 'lost' as const : null };
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
