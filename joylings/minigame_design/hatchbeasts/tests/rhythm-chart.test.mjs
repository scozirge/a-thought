import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRhythmNotes,
  parseStoredRhythmChart,
  RHYTHM_CHART_NOTE_LIMIT,
  RHYTHM_CUSTOM_CHART_STORAGE_KEY,
  serializeRhythmChart,
} from '../lib/rhythm-chart.ts';

test('錄製的按鍵時間直接保存為判定線 hitTime', () => {
  const notes = normalizeRhythmNotes([
    { id: 99, lane: 'right', hitTime: 12.45649 },
    { id: 8, lane: 'left', hitTime: 3.1254 },
  ]);
  assert.deepEqual(notes, [
    { id: 0, lane: 'left', hitTime: 3.125 },
    { id: 1, lane: 'right', hitTime: 12.456 },
  ]);
  assert.equal(notes[0].hitTime, 3.125);
});

test('譜面可序列化後再讀回，並保留更新時間', () => {
  const raw = serializeRhythmChart(
    [
      { id: 4, lane: 'up', hitTime: 7.25 },
      { id: 1, lane: 'down', hitTime: 6.5 },
    ],
    '2026-09-17T12:00:00.000Z',
  );
  assert.ok(raw);
  assert.equal(
    RHYTHM_CUSTOM_CHART_STORAGE_KEY,
    'hatchbeasts-rhythm-custom-chart-v1',
  );
  assert.deepEqual(parseStoredRhythmChart(raw), {
    version: 1,
    updatedAt: '2026-09-17T12:00:00.000Z',
    notes: [
      { id: 0, lane: 'down', hitTime: 6.5 },
      { id: 1, lane: 'up', hitTime: 7.25 },
    ],
  });
});

test('拒絕損壞、越界或過大的自訂譜面', () => {
  assert.equal(parseStoredRhythmChart('{oops'), null);
  assert.equal(
    parseStoredRhythmChart(
      JSON.stringify({ version: 1, updatedAt: 'now', notes: [] }),
    )?.notes.length,
    0,
  );
  assert.equal(normalizeRhythmNotes([{ lane: 'jump', hitTime: 1 }]), null);
  assert.equal(normalizeRhythmNotes([{ lane: 'left', hitTime: 59 }]), null);
  assert.equal(
    normalizeRhythmNotes(
      Array.from({ length: RHYTHM_CHART_NOTE_LIMIT + 1 }, () => ({
        lane: 'left',
        hitTime: 1,
      })),
    ),
    null,
  );
  assert.equal(serializeRhythmChart([]), null);
});
