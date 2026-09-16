export const RHYTHM_DEMO_DURATION = 59;
export const RHYTHM_TRAVEL_TIME = 1.85;
export const RHYTHM_CHART_OFFSET = 0.055;
export const RHYTHM_NOTE_START_PERCENT = 4;
export const RHYTHM_HIT_LINE_PERCENT = 73;

export type RhythmLane = 'left' | 'down' | 'up' | 'right';
export type HitJudgement = 'perfect' | 'great' | 'good' | 'miss';

export interface RhythmLaneDefinition {
  id: RhythmLane;
  arrow: string;
  key: string;
  label: string;
}

export interface RhythmNote {
  id: number;
  lane: RhythmLane;
  hitTime: number;
}

export interface RhythmStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export const RHYTHM_LANES: readonly RhythmLaneDefinition[] = [
  { id: 'left', arrow: '←', key: 'A', label: '左' },
  { id: 'down', arrow: '↓', key: 'S', label: '下' },
  { id: 'up', arrow: '↑', key: 'W', label: '上' },
  { id: 'right', arrow: '→', key: 'D', label: '右' },
] as const;

const CODE_TO_LANE: Readonly<Record<string, RhythmLane>> = {
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowUp: 'up',
  ArrowRight: 'right',
  KeyA: 'left',
  KeyS: 'down',
  KeyW: 'up',
  KeyD: 'right',
};

export function laneFromCode(code: string): RhythmLane | null {
  return CODE_TO_LANE[code] ?? null;
}

export const JUDGEMENT_WINDOWS = {
  perfect: 0.085,
  great: 0.155,
  good: 0.24,
} as const;

export function judgeTiming(errorSeconds: number): Exclude<
  HitJudgement,
  'miss'
> | null {
  const error = Math.abs(errorSeconds);
  if (error <= JUDGEMENT_WINDOWS.perfect) return 'perfect';
  if (error <= JUDGEMENT_WINDOWS.great) return 'great';
  if (error <= JUDGEMENT_WINDOWS.good) return 'good';
  return null;
}

export const INITIAL_RHYTHM_STATS: RhythmStats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  great: 0,
  good: 0,
  miss: 0,
};

const JUDGEMENT_SCORE: Readonly<Record<HitJudgement, number>> = {
  perfect: 1000,
  great: 700,
  good: 350,
  miss: 0,
};

export function recordJudgement(
  stats: RhythmStats,
  judgement: HitJudgement,
): RhythmStats {
  const combo = judgement === 'miss' ? 0 : stats.combo + 1;
  const comboBonus = judgement === 'miss' ? 0 : Math.min(combo, 50) * 4;
  return {
    ...stats,
    score: stats.score + JUDGEMENT_SCORE[judgement] + comboBonus,
    combo,
    maxCombo: Math.max(stats.maxCombo, combo),
    [judgement]: stats[judgement] + 1,
  };
}

export function getAccuracy(stats: RhythmStats): number {
  const total = stats.perfect + stats.great + stats.good + stats.miss;
  if (!total) return 0;
  const weighted = stats.perfect + stats.great * 0.7 + stats.good * 0.35;
  return (weighted / total) * 100;
}

export function getResultRank(stats: RhythmStats): 'S' | 'A' | 'B' | 'C' {
  const accuracy = getAccuracy(stats);
  if (accuracy >= 95) return 'S';
  if (accuracy >= 85) return 'A';
  if (accuracy >= 70) return 'B';
  return 'C';
}

export function formatRhythmTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.min(RHYTHM_DEMO_DURATION, seconds));
  const whole = Math.floor(safeSeconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const CHART_SECTIONS: readonly {
  times: readonly number[];
  pattern: readonly RhythmLane[];
}[] = [
  {
    times: [
      2.508, 2.914, 3.39, 3.773, 4.632, 5.201, 5.689, 6.084, 6.56,
      6.943, 7.5, 7.999, 8.394, 8.882, 9.265, 9.868, 10.333, 10.739,
      11.204, 11.587,
    ],
    pattern: ['left', 'down', 'up', 'right', 'left', 'up', 'down', 'right'],
  },
  {
    times: [
      14.524, 14.988, 15.395, 15.848, 16.231, 16.823, 17.299, 17.717,
      18.204, 19.191, 19.667, 20.074, 20.538, 21.2,
    ],
    pattern: ['left', 'right', 'down', 'up', 'right', 'left', 'up', 'down'],
  },
  {
    times: [
      23.789, 24.276, 24.648, 25.136, 25.519, 26.064, 27.423, 27.794,
      28.572, 28.851, 29.257, 30.081,
    ],
    pattern: ['down', 'left', 'up', 'right', 'up', 'down', 'left', 'right'],
  },
  {
    times: [
      32.926, 33.251, 34.273, 36.119, 36.595, 37.465, 38.046, 38.731,
      39.3, 39.52,
    ],
    pattern: ['up', 'down', 'left', 'right', 'down', 'up', 'right', 'left'],
  },
  {
    times: [
      42.62, 43.015, 43.317, 43.607, 44.443, 44.745, 45.291, 45.592,
      46.73, 47.195, 47.496, 47.856, 48.39, 48.599,
    ],
    pattern: ['left', 'down', 'right', 'up', 'left', 'right', 'up', 'down'],
  },
  {
    times: [
      51.769, 52.35, 52.93, 53.51, 54.404, 54.88,
    ],
    pattern: ['left', 'up', 'right', 'down', 'left', 'right', 'up', 'down'],
  },
] as const;

export const RHYTHM_CHART: readonly RhythmNote[] = CHART_SECTIONS.flatMap(
  ({ times, pattern }) =>
    times.map((hitTime, index) => ({
      id: 0,
      lane: pattern[index % pattern.length],
      hitTime: Number((hitTime + RHYTHM_CHART_OFFSET).toFixed(3)),
    })),
).map((note, id) => ({ ...note, id }));
