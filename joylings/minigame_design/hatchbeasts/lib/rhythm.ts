import { DEFAULT_RHYTHM_CHART_SOURCE } from './default-rhythm-chart.ts';

export const RHYTHM_DEMO_DURATION = 59;
export const RHYTHM_TRAVEL_TIME = 1.85;
export const RHYTHM_NOTE_START_PERCENT = 4;
export const RHYTHM_HIT_LINE_PERCENT = 73;
export const RHYTHM_PLAYBACK_RATES = [1, 1.2, 1.5, 2, 3] as const;
export const RHYTHM_SETTINGS_STORAGE_KEY =
  'hatchbeasts-rhythm-settings-v1';
export const DEFAULT_RHYTHM_VOLUME = 1;

export type RhythmLane = 'left' | 'down' | 'up' | 'right';
export type HitJudgement = 'perfect' | 'great' | 'good' | 'miss';
export type RhythmPlaybackRate = (typeof RHYTHM_PLAYBACK_RATES)[number];

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

export interface RhythmSettings {
  volume: number;
  playbackRate: RhythmPlaybackRate;
}

export const DEFAULT_RHYTHM_SETTINGS: Readonly<RhythmSettings> = {
  volume: DEFAULT_RHYTHM_VOLUME,
  playbackRate: 1,
};

export function isRhythmPlaybackRate(
  value: unknown,
): value is RhythmPlaybackRate {
  return (
    typeof value === 'number' &&
    RHYTHM_PLAYBACK_RATES.some((rate) => rate === value)
  );
}

export function clampRhythmVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return DEFAULT_RHYTHM_VOLUME;
  return Math.max(0, Math.min(1, value));
}

export function parseStoredRhythmSettings(raw: string | null): RhythmSettings {
  if (!raw) return { ...DEFAULT_RHYTHM_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { ...DEFAULT_RHYTHM_SETTINGS };
    const settings = parsed as Record<string, unknown>;
    return {
      volume: clampRhythmVolume(settings.volume),
      playbackRate: isRhythmPlaybackRate(settings.playbackRate)
        ? settings.playbackRate
        : DEFAULT_RHYTHM_SETTINGS.playbackRate,
    };
  } catch {
    return { ...DEFAULT_RHYTHM_SETTINGS };
  }
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

export function getRhythmNoteTop(hitTime: number, songTime: number): number {
  const travelProgress = 1 - (hitTime - songTime) / RHYTHM_TRAVEL_TIME;
  return (
    RHYTHM_NOTE_START_PERCENT +
    Math.max(0, Math.min(1.14, travelProgress)) *
      (RHYTHM_HIT_LINE_PERCENT - RHYTHM_NOTE_START_PERCENT)
  );
}

export const RHYTHM_CHART: readonly RhythmNote[] =
  DEFAULT_RHYTHM_CHART_SOURCE.notes;
