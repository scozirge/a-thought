import {
  RHYTHM_DEMO_DURATION,
  RHYTHM_LANES,
  type RhythmLane,
  type RhythmNote,
} from './rhythm.ts';

export const RHYTHM_CUSTOM_CHART_STORAGE_KEY =
  'hatchbeasts-rhythm-custom-chart-v1';
export const RHYTHM_CUSTOM_CHART_VERSION = 1;
export const RHYTHM_CHART_NOTE_LIMIT = 500;

export interface StoredRhythmChart {
  version: typeof RHYTHM_CUSTOM_CHART_VERSION;
  updatedAt: string;
  notes: RhythmNote[];
}

const lanes = new Set<RhythmLane>(RHYTHM_LANES.map((lane) => lane.id));

function isLane(value: unknown): value is RhythmLane {
  return typeof value === 'string' && lanes.has(value as RhythmLane);
}

export function normalizeRhythmNotes(value: unknown): RhythmNote[] | null {
  if (!Array.isArray(value) || value.length > RHYTHM_CHART_NOTE_LIMIT)
    return null;

  const notes: Omit<RhythmNote, 'id'>[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') return null;
    const { lane, hitTime } = candidate as Record<string, unknown>;
    if (
      !isLane(lane) ||
      typeof hitTime !== 'number' ||
      !Number.isFinite(hitTime) ||
      hitTime < 0 ||
      hitTime >= RHYTHM_DEMO_DURATION
    )
      return null;
    notes.push({ lane, hitTime: Number(hitTime.toFixed(3)) });
  }

  notes.sort((a, b) => a.hitTime - b.hitTime);
  return notes.map((note, id) => ({ ...note, id }));
}

export function parseStoredRhythmChart(
  raw: string | null,
): StoredRhythmChart | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      !value ||
      typeof value !== 'object' ||
      value.version !== RHYTHM_CUSTOM_CHART_VERSION ||
      typeof value.updatedAt !== 'string'
    )
      return null;
    const notes = normalizeRhythmNotes(value.notes);
    if (!notes) return null;
    return {
      version: RHYTHM_CUSTOM_CHART_VERSION,
      updatedAt: value.updatedAt,
      notes,
    };
  } catch {
    return null;
  }
}

export function serializeRhythmChart(
  value: unknown,
  updatedAt = new Date().toISOString(),
): string | null {
  const notes = normalizeRhythmNotes(value);
  if (!notes?.length) return null;
  return JSON.stringify({
    version: RHYTHM_CUSTOM_CHART_VERSION,
    updatedAt,
    notes,
  } satisfies StoredRhythmChart);
}
