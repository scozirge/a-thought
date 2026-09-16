'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ArrowLeft, Music2, Play, RotateCcw, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/lib/assets';
import { BEASTS } from '@/lib/game';
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
  RHYTHM_LANES,
  RHYTHM_TRAVEL_TIME,
  type HitJudgement,
  type RhythmLane,
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

const waterfallSpirit = BEASTS['31'];

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
  const [feedback, setFeedback] = useState<{
    judgement: HitJudgement;
    sequence: number;
  } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [audioError, setAudioError] = useState('');

  const flashLane = useCallback((lane: RhythmLane) => {
    setPressedLane(lane);
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
    for (const note of RHYTHM_CHART) {
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
  }, []);

  const hitLane = useCallback(
    (lane: RhythmLane) => {
      if (phaseRef.current !== 'playing') return;
      flashLane(lane);
      const currentTime = audioRef.current?.currentTime ?? 0;
      let closest:
        | { id: number; error: number; judgement: Exclude<HitJudgement, 'miss'> }
        | undefined;

      for (const note of RHYTHM_CHART) {
        if (note.lane !== lane || judgedRef.current[note.id]) continue;
        const error = currentTime - note.hitTime;
        const judgement = judgeTiming(error);
        if (!judgement) continue;
        if (!closest || Math.abs(error) < Math.abs(closest.error))
          closest = { id: note.id, error, judgement };
      }
      if (closest) commitJudgement(closest.id, closest.judgement);
    },
    [commitJudgement, flashLane],
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
      for (const note of RHYTHM_CHART) {
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
  }, [finishGame, phase]);

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
      RHYTHM_CHART.filter((note) => {
        if (judged[note.id]) return false;
        const untilHit = note.hitTime - songTime;
        return untilHit <= RHYTHM_TRAVEL_TIME && untilHit >= -0.32;
      }),
    [judged, songTime],
  );

  const progress = Math.min(100, (songTime / RHYTHM_DEMO_DURATION) * 100);
  const accuracy = getAccuracy(stats);
  const rank = getResultRank(stats);
  const feedbackCopy = feedback ? JUDGEMENT_COPY[feedback.judgement] : null;
  const overlayStyle = {
    '--rhythm-paper': `url("${assetUrl('/images/storybook-paper.png')}")`,
  } as CSSProperties;

  return (
    <main className={styles.world}>
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
        <a className={styles.backLink} href={assetUrl('/classroom/')}>
          <ArrowLeft size={18} aria-hidden="true" />
          課程目錄
        </a>
        <div className={styles.songLabel}>
          <Music2 size={17} aria-hidden="true" />
          <span>I Wan&apos;na Be Like You</span>
          <span aria-hidden="true">·</span>
          <span>0:59</span>
        </div>
      </header>

      <section className={styles.stage} aria-label="瀑布精靈音樂節奏遊戲">
        <aside
          className={`${styles.mascotPanel} ${phase === 'playing' ? styles.isDancing : ''}`}
        >
          {/* oxlint-disable-next-line nextjs/no-img-element -- Existing local crayon scene. */}
          <img
            className={styles.waterfallScene}
            src={assetUrl('/images/waterfall.png?v=monster-doodle-2')}
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
          />
          <div className={styles.mascotGlow} aria-hidden="true" />
          <div className={styles.mascotWrap}>
            {/* oxlint-disable-next-line nextjs/no-img-element -- Existing local character artwork. */}
            <img
              className={styles.mascot}
              src={assetUrl(`${waterfallSpirit.image}?v=beasts-5`)}
              alt={waterfallSpirit.appearance}
              width={1254}
              height={1254}
              draggable={false}
            />
          </div>
          <div className={styles.mascotCopy}>
            <span className={styles.demoBadge}>RHYTHM DEMO</span>
            <h1>瀑布精靈</h1>
            <p>跟著水花，接住每一拍。</p>
          </div>
        </aside>

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
          >
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
                        4 + Math.max(0, Math.min(1.14, travelProgress)) * 76;
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
              <p className={styles.kicker}>59 秒試玩</p>
              <h2 id="rhythm-title">水花節拍</h2>
              <p className={styles.instructions}>
                音符到底線時，按下同方向的鍵。
              </p>
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
                disabled={isStarting}
              >
                <Play size={19} fill="currentColor" aria-hidden="true" />
                {isStarting ? '音樂載入中…' : '開始演奏'}
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
                瀑布精靈在替你拍手！
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
                <Button className={styles.startButton} size="lg" onClick={startGame}>
                  <RotateCcw size={18} aria-hidden="true" />
                  再玩一次
                </Button>
                <a href={assetUrl('/classroom/')}>回到課程目錄</a>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
