'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowLeft,
  Egg,
  Music2,
  PencilLine,
  Play,
  RotateCcw,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/lib/assets';
import { getBeastById } from '@/lib/game';
import {
  parseStoredRhythmChart,
  RHYTHM_CUSTOM_CHART_STORAGE_KEY,
} from '@/lib/rhythm-chart';
import {
  formatRhythmTime,
  getAccuracy,
  getResultRank,
  INITIAL_RHYTHM_STATS,
  JUDGEMENT_WINDOWS,
  judgeTiming,
  laneFromCode,
  recordJudgement,
  RHYTHM_CHART,
  RHYTHM_DEMO_DURATION,
  RHYTHM_HIT_LINE_PERCENT,
  RHYTHM_LANES,
  RHYTHM_NOTE_START_PERCENT,
  RHYTHM_TRAVEL_TIME,
  type HitJudgement,
  type RhythmLane,
  type RhythmNote,
  type RhythmStats,
} from '@/lib/rhythm';
import styles from './rhythm.module.css';

type GamePhase = 'ready' | 'playing' | 'finished';

const JUDGEMENT_COPY: Readonly<
  Record<HitJudgement, { label: string; className: string }>
> = {
  perfect: { label: 'PERFECT', className: styles.perfect },
  great: { label: 'GREAT', className: styles.great },
  good: { label: 'GOOD', className: styles.good },
  miss: { label: 'MISS', className: styles.miss },
};

export default function RhythmDemo() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const pressedTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<GamePhase>('ready');
  const judgedRef = useRef<Record<number, HitJudgement>>({});
  const statsRef = useRef<RhythmStats>(INITIAL_RHYTHM_STATS);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [songTime, setSongTime] = useState(0);
  const [judged, setJudged] = useState<Record<number, HitJudgement>>({});
  const [stats, setStats] = useState<RhythmStats>(INITIAL_RHYTHM_STATS);
  const [pressedLane, setPressedLane] = useState<RhythmLane | null>(null);
  const [reactionSequence, setReactionSequence] = useState(0);
  const [reactionLane, setReactionLane] = useState<RhythmLane | null>(null);
  const [feedback, setFeedback] = useState<{
    judgement: HitJudgement;
    sequence: number;
  } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [activeChart, setActiveChart] =
    useState<readonly RhythmNote[]>(RHYTHM_CHART);
  const [chartSource, setChartSource] = useState<'default' | 'custom'>(
    'default',
  );
  const [chartReady, setChartReady] = useState(false);
  const [activeBeast, setActiveBeast] = useState(() => getBeastById(null));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setActiveBeast(
          getBeastById(
            new URLSearchParams(window.location.search).get('beast'),
          ),
        );
        const saved = parseStoredRhythmChart(
          window.localStorage.getItem(RHYTHM_CUSTOM_CHART_STORAGE_KEY),
        );
        if (saved?.notes.length) {
          setActiveChart(saved.notes);
          setChartSource('custom');
        }
      } catch {
        setChartSource('default');
      } finally {
        setChartReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const flashLane = useCallback((lane: RhythmLane) => {
    setPressedLane(lane);
    setReactionLane(lane);
    setReactionSequence((sequence) => sequence + 1);
    if (pressedTimerRef.current !== null)
      window.clearTimeout(pressedTimerRef.current);
    pressedTimerRef.current = window.setTimeout(() => {
      setPressedLane(null);
      pressedTimerRef.current = null;
    }, 105);
  }, []);

  const commitJudgement = useCallback(
    (noteId: number, judgement: HitJudgement) => {
      if (judgedRef.current[noteId]) return;
      const nextJudged = { ...judgedRef.current, [noteId]: judgement };
      const nextStats = recordJudgement(statsRef.current, judgement);
      judgedRef.current = nextJudged;
      statsRef.current = nextStats;
      setJudged(nextJudged);
      setStats(nextStats);
      setFeedback((previous) => ({
        judgement,
        sequence: (previous?.sequence ?? 0) + 1,
      }));
    },
    [],
  );

  const finishGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    phaseRef.current = 'finished';
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    let nextStats = statsRef.current;
    const nextJudged = { ...judgedRef.current };
    for (const note of activeChart) {
      if (nextJudged[note.id]) continue;
      nextJudged[note.id] = 'miss';
      nextStats = recordJudgement(nextStats, 'miss');
    }
    judgedRef.current = nextJudged;
    statsRef.current = nextStats;
    setJudged(nextJudged);
    setStats(nextStats);
    setSongTime(RHYTHM_DEMO_DURATION);
    setPhase('finished');
  }, [activeChart]);

  const hitLane = useCallback(
    (lane: RhythmLane) => {
      if (phaseRef.current !== 'playing') return;
      flashLane(lane);
      const currentTime = audioRef.current?.currentTime ?? 0;
      let closest:
        | { id: number; error: number; judgement: Exclude<HitJudgement, 'miss'> }
        | undefined;

      for (const note of activeChart) {
        if (note.lane !== lane || judgedRef.current[note.id]) continue;
        const error = currentTime - note.hitTime;
        const judgement = judgeTiming(error);
        if (!judgement) continue;
        if (!closest || Math.abs(error) < Math.abs(closest.error))
          closest = { id: note.id, error, judgement };
      }
      if (closest) commitJudgement(closest.id, closest.judgement);
    },
    [activeChart, commitJudgement, flashLane],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lane = laneFromCode(event.code);
      if (!lane) return;
      if (phaseRef.current === 'playing') event.preventDefault();
      if (!event.repeat) hitLane(lane);
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hitLane]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const drawFrame = () => {
      const audio = audioRef.current;
      if (!audio || phaseRef.current !== 'playing') return;
      const currentTime = Math.min(audio.currentTime, RHYTHM_DEMO_DURATION);
      setSongTime(currentTime);

      const missedIds: number[] = [];
      for (const note of activeChart) {
        if (
          !judgedRef.current[note.id] &&
          currentTime - note.hitTime > JUDGEMENT_WINDOWS.good
        )
          missedIds.push(note.id);
      }
      if (missedIds.length) {
        const nextJudged = { ...judgedRef.current };
        let nextStats = statsRef.current;
        for (const id of missedIds) {
          nextJudged[id] = 'miss';
          nextStats = recordJudgement(nextStats, 'miss');
        }
        judgedRef.current = nextJudged;
        statsRef.current = nextStats;
        setJudged(nextJudged);
        setStats(nextStats);
        setFeedback((previous) => ({
          judgement: 'miss',
          sequence: (previous?.sequence ?? 0) + 1,
        }));
      }

      if (audio.ended || currentTime >= RHYTHM_DEMO_DURATION - 0.015) {
        finishGame();
        return;
      }
      animationRef.current = window.requestAnimationFrame(drawFrame);
    };

    animationRef.current = window.requestAnimationFrame(drawFrame);
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [activeChart, finishGame, phase]);

  useEffect(() => {
    if (phase === 'finished')
      resultTitleRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(
    () => () => {
      if (animationRef.current !== null)
        window.cancelAnimationFrame(animationRef.current);
      if (pressedTimerRef.current !== null)
        window.clearTimeout(pressedTimerRef.current);
      audioRef.current?.pause();
    },
    [],
  );

  const startGame = async () => {
    const audio = audioRef.current;
    if (!audio || isStarting) return;
    setIsStarting(true);
    setAudioError('');
    judgedRef.current = {};
    statsRef.current = INITIAL_RHYTHM_STATS;
    setJudged({});
    setStats(INITIAL_RHYTHM_STATS);
    setSongTime(0);
    setFeedback(null);
    audio.pause();
    audio.currentTime = 0;
    try {
      await audio.play();
      phaseRef.current = 'playing';
      setPhase('playing');
    } catch {
      phaseRef.current = 'ready';
      setPhase('ready');
      setAudioError('音樂沒有成功開始，請再按一次開始。');
    } finally {
      setIsStarting(false);
    }
  };

  const visibleNotes = useMemo(
    () =>
      activeChart.filter((note) => {
        if (judged[note.id]) return false;
        const untilHit = note.hitTime - songTime;
        return untilHit <= RHYTHM_TRAVEL_TIME && untilHit >= -0.32;
      }),
    [activeChart, judged, songTime],
  );

  const progress = Math.min(100, (songTime / RHYTHM_DEMO_DURATION) * 100);
  const accuracy = getAccuracy(stats);
  const rank = getResultRank(stats);
  const feedbackCopy = feedback ? JUDGEMENT_COPY[feedback.judgement] : null;
  const overlayStyle = {
    '--rhythm-paper': `url("${assetUrl('/images/storybook-paper.png')}")`,
  } as CSSProperties;
  const playfieldStyle = {
    '--hit-line-top': `${RHYTHM_HIT_LINE_PERCENT}%`,
  } as CSSProperties;
  const beastQuery = `?beast=${activeBeast.id}`;
  const visibleBeastName = chartReady ? activeBeast.name : '怪獸';

  return (
    <main className={styles.world}>
      <h1 className={styles.srOnly}>{visibleBeastName}音樂節奏遊戲</h1>
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={finishGame}
      >
        <source
          src={assetUrl('/audio/i-wanna-be-like-you-demo.mp3')}
          type="audio/mpeg"
        />
        <track
          default
          kind="captions"
          src={assetUrl('/audio/i-wanna-be-like-you-demo-captions.vtt')}
          srcLang="zh-Hant"
          label="音樂提示"
        />
      </audio>

      <header className={styles.topbar}>
        <a className={styles.backLink} href={assetUrl('/')}>
          <ArrowLeft size={18} aria-hidden="true" />
          重新孵蛋
        </a>
        <div className={styles.songLabel}>
          <Music2 size={17} aria-hidden="true" />
          <span>I Wan&apos;na Be Like You</span>
          <span aria-hidden="true">·</span>
          <span>0:59</span>
        </div>
      </header>

      <section
        className={styles.stage}
        aria-label={`${visibleBeastName}音樂節奏遊戲`}
      >
        <section className={styles.gamePanel}>
          <div className={styles.hud}>
            <div>
              <span className={styles.hudLabel}>SCORE</span>
              <strong>{String(stats.score).padStart(6, '0')}</strong>
            </div>
            <div className={styles.comboBox}>
              <strong>{stats.combo}</strong>
              <span className={styles.hudLabel}>COMBO</span>
            </div>
            <div className={styles.timeBox}>
              <strong>{formatRhythmTime(songTime)}</strong>
              <span>/ 0:59</span>
            </div>
          </div>

          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div
            className={styles.playfield}
            data-phase={phase}
            aria-describedby="rhythm-controls"
            style={playfieldStyle}
          >
            {chartReady && (
              <div className={styles.playfieldBeast} aria-hidden="true">
                <div className={styles.beastFloat}>
                  <div
                    className={
                      reactionSequence > 0
                        ? styles.beastBounce
                        : styles.beastRest
                    }
                    data-lane={reactionLane ?? 'rest'}
                    key={reactionSequence}
                  >
                    {/* oxlint-disable-next-line nextjs/no-img-element -- White paper is removed visually with multiply blend while preserving the original drawing. */}
                    <img
                      src={assetUrl(`${activeBeast.image}?v=beasts-5`)}
                      alt=""
                      width={1024}
                      height={1024}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={styles.laneGrid} aria-hidden="true">
              {RHYTHM_LANES.map((lane) => (
                <div
                  className={`${styles.lane} ${styles[lane.id]} ${pressedLane === lane.id ? styles.isPressed : ''}`}
                  key={lane.id}
                >
                  {visibleNotes
                    .filter((note) => note.lane === lane.id)
                    .map((note) => {
                      const travelProgress =
                        1 - (note.hitTime - songTime) / RHYTHM_TRAVEL_TIME;
                      const noteTop =
                        RHYTHM_NOTE_START_PERCENT +
                        Math.max(0, Math.min(1.14, travelProgress)) *
                          (RHYTHM_HIT_LINE_PERCENT -
                            RHYTHM_NOTE_START_PERCENT);
                      return (
                        <span
                          className={styles.note}
                          key={note.id}
                          style={
                            { '--note-top': noteTop } as CSSProperties
                          }
                        >
                          {lane.arrow}
                        </span>
                      );
                    })}
                </div>
              ))}
            </div>

            <div className={styles.hitLine} aria-hidden="true">
              <span />
            </div>

            <output aria-live="polite" aria-atomic="true">
              {feedback && feedbackCopy && phase === 'playing' && (
                <span
                  className={`${styles.judgement} ${feedbackCopy.className}`}
                  key={feedback.sequence}
                >
                  {feedbackCopy.label}
                </span>
              )}
            </output>

            <div className={styles.receptors}>
              {RHYTHM_LANES.map((lane) => (
                <button
                  className={`${styles.receptor} ${styles[lane.id]} ${pressedLane === lane.id ? styles.isPressed : ''}`}
                  key={lane.id}
                  type="button"
                  disabled={phase !== 'playing'}
                  aria-label={`${lane.label}方向，鍵盤 ${lane.key} 或 ${lane.arrow}`}
                  aria-describedby="rhythm-controls"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    hitLane(lane.id);
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) hitLane(lane.id);
                  }}
                >
                  <span className={styles.receptorArrow}>{lane.arrow}</span>
                  <span className={styles.receptorKey}>{lane.key}</span>
                </button>
              ))}
            </div>
          </div>

          <p className={styles.controlHint} id="rhythm-controls">
            方向鍵 <span>或</span> WASD
          </p>
        </section>

        {phase === 'ready' && (
          <div className={styles.overlay} style={overlayStyle}>
            <section className={styles.startCard} aria-labelledby="rhythm-title">
              <div className={styles.startIcon} aria-hidden="true">
                <Waves size={32} />
              </div>
              <p className={styles.kicker}>{visibleBeastName} · 59 秒</p>
              <h2 id="rhythm-title">怪獸節拍</h2>
              <p className={styles.instructions}>
                音符到底線時，按下同方向的鍵。
              </p>
              <div className={styles.chartSource}>
                <span>
                  {!chartReady
                    ? '譜面載入中…'
                    : chartSource === 'custom'
                      ? `我的錄製譜面 · ${activeChart.length} 顆`
                      : `示範譜面 · ${activeChart.length} 顆`}
                </span>
                {chartReady && (
                  <a href={assetUrl(`/rhythm/editor/${beastQuery}`)}>
                    <PencilLine size={15} aria-hidden="true" />
                    錄製／編輯譜面
                  </a>
                )}
              </div>
              <div className={styles.keyPreview} aria-label="操作鍵">
                {RHYTHM_LANES.map((lane) => (
                  <span key={lane.id}>
                    <b>{lane.arrow}</b>
                    <small>{lane.key}</small>
                  </span>
                ))}
              </div>
              <Button
                className={styles.startButton}
                size="lg"
                onClick={startGame}
                disabled={isStarting || !chartReady}
              >
                <Play size={19} fill="currentColor" aria-hidden="true" />
                {!chartReady
                  ? '譜面載入中…'
                  : isStarting
                    ? '音樂載入中…'
                    : '開始演奏'}
              </Button>
              {audioError && <p className={styles.audioError}>{audioError}</p>}
            </section>
          </div>
        )}

        {phase === 'finished' && (
          <div className={styles.overlay} style={overlayStyle}>
            <section className={styles.resultCard} aria-labelledby="result-title">
              <p className={styles.kicker}>演奏完成</p>
              <div className={styles.rank} aria-label={`評級 ${rank}`}>
                {rank}
              </div>
              <h2 id="result-title" ref={resultTitleRef} tabIndex={-1}>
                {activeBeast.name}在替你拍手！
              </h2>
              <div className={styles.resultSummary}>
                <div>
                  <span>分數</span>
                  <strong>{stats.score.toLocaleString()}</strong>
                </div>
                <div>
                  <span>準確率</span>
                  <strong>{accuracy.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>最高連擊</span>
                  <strong>{stats.maxCombo}</strong>
                </div>
              </div>
              <dl className={styles.judgementTotals}>
                <div>
                  <dt>Perfect</dt>
                  <dd>{stats.perfect}</dd>
                </div>
                <div>
                  <dt>Great</dt>
                  <dd>{stats.great}</dd>
                </div>
                <div>
                  <dt>Good</dt>
                  <dd>{stats.good}</dd>
                </div>
                <div>
                  <dt>Miss</dt>
                  <dd>{stats.miss}</dd>
                </div>
              </dl>
              <div className={styles.resultActions}>
                <a
                  className={styles.resultAction}
                  href={assetUrl('/')}
                >
                  <Egg size={18} aria-hidden="true" />
                  重新孵蛋
                </a>
                <Button
                  className={styles.startButton}
                  size="lg"
                  onClick={startGame}
                >
                  <RotateCcw size={18} aria-hidden="true" />
                  重新演奏
                </Button>
                <a
                  className={styles.resultAction}
                  href={assetUrl(`/rhythm/editor/${beastQuery}`)}
                >
                  <PencilLine size={18} aria-hidden="true" />
                  製譜
                </a>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
