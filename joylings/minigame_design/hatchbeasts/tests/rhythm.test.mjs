import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RHYTHM_CHART_SOURCE } from '../lib/default-rhythm-chart.ts';
import {
  clampRhythmVolume,
  DEFAULT_RHYTHM_SETTINGS,
  formatRhythmTime,
  getAccuracy,
  getRhythmNoteTop,
  getResultRank,
  INITIAL_RHYTHM_STATS,
  isRhythmPlaybackRate,
  JUDGEMENT_WINDOWS,
  judgeTiming,
  laneFromCode,
  parseStoredRhythmSettings,
  recordJudgement,
  RHYTHM_CHART,
  RHYTHM_DEMO_DURATION,
  RHYTHM_HIT_LINE_PERCENT,
  RHYTHM_LANES,
  RHYTHM_NOTE_START_PERCENT,
  RHYTHM_PLAYBACK_RATES,
  RHYTHM_TRAVEL_TIME,
} from '../lib/rhythm.ts';

test('方向鍵和 WASD 映射到同四軌', () => {
  assert.equal(laneFromCode('ArrowLeft'), 'left');
  assert.equal(laneFromCode('ArrowDown'), 'down');
  assert.equal(laneFromCode('ArrowUp'), 'up');
  assert.equal(laneFromCode('ArrowRight'), 'right');
  assert.equal(laneFromCode('KeyA'), 'left');
  assert.equal(laneFromCode('KeyS'), 'down');
  assert.equal(laneFromCode('KeyW'), 'up');
  assert.equal(laneFromCode('KeyD'), 'right');
  assert.equal(laneFromCode('Space'), null);
});

test('判定窗在邊界內生效，超過 Good 不命中', () => {
  assert.equal(judgeTiming(0), 'perfect');
  assert.equal(judgeTiming(-JUDGEMENT_WINDOWS.perfect), 'perfect');
  assert.equal(judgeTiming(JUDGEMENT_WINDOWS.perfect + 0.001), 'great');
  assert.equal(judgeTiming(-JUDGEMENT_WINDOWS.great), 'great');
  assert.equal(judgeTiming(JUDGEMENT_WINDOWS.great + 0.001), 'good');
  assert.equal(judgeTiming(-JUDGEMENT_WINDOWS.good), 'good');
  assert.equal(judgeTiming(JUDGEMENT_WINDOWS.good + 0.001), null);
});

test('譜面在 59 秒內且四個方向都有音符', () => {
  assert.equal(RHYTHM_CHART.length, 115);
  assert.ok(
    RHYTHM_CHART.every(
      (note, index) =>
        note.id === index &&
        note.hitTime > 0 &&
        note.hitTime < RHYTHM_DEMO_DURATION &&
        (index === 0 || note.hitTime >= RHYTHM_CHART[index - 1].hitTime),
    ),
  );
  assert.deepEqual(
    new Set(RHYTHM_CHART.map((note) => note.lane)),
    new Set(RHYTHM_LANES.map((lane) => lane.id)),
  );
});

test('錄製譜原樣成為預設譜，不重複套用時間偏移', () => {
  assert.equal(DEFAULT_RHYTHM_CHART_SOURCE.version, 1);
  assert.equal(
    DEFAULT_RHYTHM_CHART_SOURCE.updatedAt,
    '2026-09-16T21:21:22.713Z',
  );
  assert.equal(RHYTHM_CHART, DEFAULT_RHYTHM_CHART_SOURCE.notes);
  assert.deepEqual(RHYTHM_CHART[0], {
    id: 0,
    lane: 'right',
    hitTime: 2.383,
  });
  assert.deepEqual(RHYTHM_CHART[57], {
    id: 57,
    lane: 'left',
    hitTime: 33.334,
  });
  assert.deepEqual(RHYTHM_CHART.at(-1), {
    id: 114,
    lane: 'down',
    hitTime: 57.929,
  });
});

test('視覺音符從頂端落到上移後的判定線', () => {
  assert.equal(RHYTHM_NOTE_START_PERCENT, 4);
  assert.equal(RHYTHM_HIT_LINE_PERCENT, 73);
  assert.ok(RHYTHM_NOTE_START_PERCENT < RHYTHM_HIT_LINE_PERCENT);
  assert.ok(RHYTHM_HIT_LINE_PERCENT < 100);
  assert.ok(
    Math.abs(getRhythmNoteTop(10, 10 - RHYTHM_TRAVEL_TIME) - 4) < 1e-9,
  );
  assert.ok(Math.abs(getRhythmNoteTop(10, 10) - 73) < 1e-9);
  assert.equal(getRhythmNoteTop(10, 0), 4);
  assert.ok(getRhythmNoteTop(10, 10.4) > RHYTHM_HIT_LINE_PERCENT);
});

test('節奏速度只接受指定倍率', () => {
  assert.deepEqual(RHYTHM_PLAYBACK_RATES, [0.8, 1, 1.2, 1.5, 2]);
  assert.equal(DEFAULT_RHYTHM_SETTINGS.playbackRate, 1);
  for (const rate of RHYTHM_PLAYBACK_RATES)
    assert.equal(isRhythmPlaybackRate(rate), true);
  for (const invalid of [0, 1.1, 3, 4, Number.NaN, Number.POSITIVE_INFINITY, '2'])
    assert.equal(isRhythmPlaybackRate(invalid), false);
});

test('音量與倍速設定能安全還原', () => {
  assert.deepEqual(
    parseStoredRhythmSettings(JSON.stringify({ volume: 0.5, playbackRate: 3 })),
    { volume: 0.5, playbackRate: 2 },
  );
  assert.deepEqual(parseStoredRhythmSettings(null), DEFAULT_RHYTHM_SETTINGS);
  assert.deepEqual(parseStoredRhythmSettings('{'), DEFAULT_RHYTHM_SETTINGS);
  assert.deepEqual(
    parseStoredRhythmSettings(
      JSON.stringify({ volume: 0.45, playbackRate: 1.5 }),
    ),
    { volume: 0.45, playbackRate: 1.5 },
  );
  assert.deepEqual(
    parseStoredRhythmSettings(
      JSON.stringify({ volume: -2, playbackRate: 1.1 }),
    ),
    { volume: 0, playbackRate: 1 },
  );
  assert.equal(clampRhythmVolume(2), 1);
  assert.equal(clampRhythmVolume(Number.NaN), 1);
});

test('分數、連擊、準確率與評級正確累積', () => {
  let stats = recordJudgement(INITIAL_RHYTHM_STATS, 'perfect');
  stats = recordJudgement(stats, 'great');
  assert.equal(stats.score, 1712);
  assert.equal(stats.combo, 2);
  assert.equal(stats.maxCombo, 2);
  stats = recordJudgement(stats, 'good');
  stats = recordJudgement(stats, 'miss');
  assert.equal(stats.combo, 0);
  assert.equal(stats.maxCombo, 3);
  assert.ok(Math.abs(getAccuracy(stats) - 51.25) < Number.EPSILON * 100);
  assert.equal(getResultRank(stats), 'C');

  const perfectRun = {
    ...INITIAL_RHYTHM_STATS,
    perfect: 20,
    score: 20_000,
    maxCombo: 20,
  };
  assert.equal(getAccuracy(perfectRun), 100);
  assert.equal(getResultRank(perfectRun), 'S');
});

test('時間顯示會夾在 Demo 的 0:00 到 0:59', () => {
  assert.equal(formatRhythmTime(-2), '0:00');
  assert.equal(formatRhythmTime(8.9), '0:08');
  assert.equal(formatRhythmTime(58.99), '0:58');
  assert.equal(formatRhythmTime(99), '0:59');
});
