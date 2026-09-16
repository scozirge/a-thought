'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Circle,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/lib/assets';
import {
  normalizeRhythmNotes,
  parseStoredRhythmChart,
  RHYTHM_CUSTOM_CHART_STORAGE_KEY,
  serializeRhythmChart,
} from '@/lib/rhythm-chart';
import {
  laneFromCode,
  RHYTHM_DEMO_DURATION,
  RHYTHM_LANES,
  type RhythmLane,
  type RhythmNote,
} from '@/lib/rhythm';
import styles from './editor.module.css';

type RecorderPhase = 'idle' | 'recording' | 'paused';

const laneColors: Readonly<Record<RhythmLane, string>> = {
  left: '#aae4dd',
  down: '#f1a765',
  up: '#f09cad',
  right: '#d8caee',
};

function formatPreciseTime(seconds: number): string {
  const safe = Math.max(0, Math.min(RHYTHM_DEMO_DURATION, seconds));
  const minutes = Math.floor(safe / 60);
  const rest = (safe - minutes * 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${rest}`;
}

export default function RhythmChartEditor() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const pressedTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<RecorderPhase>('idle');
  const notesRef = useRef<RhythmNote[]>([]);
  const nextIdRef = useRef(0);

  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [songTime, setSongTime] = useState(0);
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [pressedLane, setPressedLane] = useState<RhythmLane | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [message, setMessage] = useState('準備好了，可以從頭開始錄製。');
  const [audioError, setAudioError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const replaceNotes = useCallback((next: RhythmNote[]) => {
    notesRef.current = next;
    setNotes(next);
    nextIdRef.current = next.reduce(
      (maximum, note) => Math.max(maximum, note.id + 1),
      0,
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = parseStoredRhythmChart(
          window.localStorage.getItem(RHYTHM_CUSTOM_CHART_STORAGE_KEY),
        );
        if (saved?.notes.length) {
          replaceNotes(saved.notes);
          setSavedCount(saved.notes.length);
          setMessage(`已載入上次儲存的 ${saved.notes.length} 顆音符。`);
        }
      } catch {
        setMessage('瀏覽器目前無法讀取已儲存的譜面。');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [replaceNotes]);

  useEffect(() => {
    let cancelled = false;
    let context: AudioContext | null = null;

    async function decodeWaveform() {
      try {
        const response = await fetch(
          assetUrl('/audio/i-wanna-be-like-you-demo.mp3'),
        );
        if (!response.ok) throw new Error('audio fetch failed');
        const audioData = await response.arrayBuffer();
        context = new AudioContext();
        const buffer = await context.decodeAudioData(audioData);
        const channel = buffer.getChannelData(0);
        const bars = 420;
        const stride = Math.max(1, Math.floor(channel.length / bars));
        const peaks = Array.from({ length: bars }, (_, index) => {
          const start = index * stride;
          const end = Math.min(channel.length, start + stride);
          let peak = 0;
          for (let sample = start; sample < end; sample += 12)
            peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
          return peak;
        });
        const maximum = Math.max(...peaks, 0.01);
        if (!cancelled) setWaveform(peaks.map((peak) => peak / maximum));
      } catch {
        if (!cancelled) setWaveform([]);
      } finally {
        if (context) await context.close().catch(() => undefined);
      }
    }

    void decodeWaveform();
    return () => {
      cancelled = true;
      if (context) void context.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(rect.width * ratio);
    const pixelHeight = Math.round(rect.height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    const center = rect.height * 0.45;
    const height = rect.height * 0.34;
    context.strokeStyle = '#a8e8dfb8';
    context.lineWidth = 1.4;
    context.beginPath();
    const peaks = waveform.length
      ? waveform
      : Array.from({ length: 120 }, (_, index) =>
          0.1 + Math.abs(Math.sin(index * 0.31)) * 0.08,
        );
    peaks.forEach((peak, index) => {
      const x = (index / Math.max(1, peaks.length - 1)) * rect.width;
      const y = center - peak * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    for (let index = peaks.length - 1; index >= 0; index--) {
      const peak = peaks[index];
      const x = (index / Math.max(1, peaks.length - 1)) * rect.width;
      context.lineTo(x, center + peak * height);
    }
    context.closePath();
    context.fillStyle = '#83d7d02e';
    context.fill();
    context.stroke();

    for (const note of notes) {
      const x = (note.hitTime / RHYTHM_DEMO_DURATION) * rect.width;
      context.strokeStyle = laneColors[note.lane];
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, rect.height - 26);
      context.lineTo(x, rect.height - 9);
      context.stroke();
      context.fillStyle = laneColors[note.lane];
      context.beginPath();
      context.arc(x, rect.height - 8, 3.2, 0, Math.PI * 2);
      context.fill();
    }

    const playheadX = (songTime / RHYTHM_DEMO_DURATION) * rect.width;
    context.strokeStyle = '#f4fffccc';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(playheadX, 0);
    context.lineTo(playheadX, rect.height);
    context.stroke();
  }, [notes, songTime, waveform]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const update = () => {
      const audio = audioRef.current;
      if (!audio || phaseRef.current !== 'recording') return;
      setSongTime(Math.min(audio.currentTime, RHYTHM_DEMO_DURATION));
      animationRef.current = window.requestAnimationFrame(update);
    };
    animationRef.current = window.requestAnimationFrame(update);
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [phase]);

  const flashLane = useCallback((lane: RhythmLane) => {
    setPressedLane(lane);
    if (pressedTimerRef.current !== null)
      window.clearTimeout(pressedTimerRef.current);
    pressedTimerRef.current = window.setTimeout(() => {
      setPressedLane(null);
      pressedTimerRef.current = null;
    }, 110);
  }, []);

  const recordLane = useCallback(
    (lane: RhythmLane) => {
      const audio = audioRef.current;
      if (phaseRef.current !== 'recording' || !audio || audio.paused) return;
      flashLane(lane);
      const hitTime = Number(
        Math.min(audio.currentTime, RHYTHM_DEMO_DURATION - 0.001).toFixed(3),
      );
      const note = { id: nextIdRef.current++, lane, hitTime };
      const next = [...notesRef.current, note];
      notesRef.current = next;
      setNotes(next);
      setMessage(`${lane === 'left' ? '左' : lane === 'down' ? '下' : lane === 'up' ? '上' : '右'}方向已記在 ${formatPreciseTime(hitTime)}。`);
    },
    [flashLane],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lane = laneFromCode(event.code);
      if (!lane || event.metaKey || event.ctrlKey || event.altKey) return;
      if (phaseRef.current === 'recording') event.preventDefault();
      if (!event.repeat) recordLane(lane);
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [recordLane]);

  useEffect(
    () => () => {
      phaseRef.current = 'idle';
      if (animationRef.current !== null)
        window.cancelAnimationFrame(animationRef.current);
      if (pressedTimerRef.current !== null)
        window.clearTimeout(pressedTimerRef.current);
      audioRef.current?.pause();
    },
    [],
  );

  const beginRecording = async (fromBeginning: boolean) => {
    const audio = audioRef.current;
    if (!audio || isStarting) return;
    if (
      fromBeginning &&
      notesRef.current.length > 0 &&
      !window.confirm(
        '從頭錄製會清空目前工作區的音符；已儲存的譜面會保留到你再次按下儲存。要繼續嗎？',
      )
    )
      return;

    setIsStarting(true);
    setAudioError('');
    audio.pause();
    if (fromBeginning) {
      audio.currentTime = 0;
      setSongTime(0);
      replaceNotes([]);
    }
    try {
      await audio.play();
      phaseRef.current = 'recording';
      setPhase('recording');
      setMessage('正在錄製：現在按下的時間，就是音符抵達判定線的時間。');
    } catch {
      phaseRef.current = 'paused';
      setPhase('paused');
      setAudioError('音樂沒有成功播放，請再按一次。');
    } finally {
      setIsStarting(false);
    }
  };

  const pauseRecording = () => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) setSongTime(audio.currentTime);
    phaseRef.current = 'paused';
    setPhase('paused');
    setMessage('已暫停，可以拖動波形定位後繼續錄製。');
  };

  const undoLastNote = () => {
    if (!notesRef.current.length) return;
    const removed = notesRef.current.at(-1);
    replaceNotes(notesRef.current.slice(0, -1));
    setMessage(
      removed
        ? `已復原 ${formatPreciseTime(removed.hitTime)} 的音符。`
        : '已復原上一顆音符。',
    );
  };

  const deleteNote = (id: number) => {
    replaceNotes(notesRef.current.filter((note) => note.id !== id));
    setMessage('已刪除一顆音符。');
  };

  const clearWorkingChart = () => {
    if (
      notesRef.current.length &&
      !window.confirm('要清空目前工作區的所有音符嗎？')
    )
      return;
    replaceNotes([]);
    setMessage('工作區已清空；先前儲存的譜面尚未改動。');
  };

  const saveChart = (playAfterSaving: boolean) => {
    const raw = serializeRhythmChart(notesRef.current);
    if (!raw) {
      setMessage('至少錄一顆音符，才能儲存譜面。');
      return;
    }
    try {
      window.localStorage.setItem(RHYTHM_CUSTOM_CHART_STORAGE_KEY, raw);
      const normalized = normalizeRhythmNotes(notesRef.current) ?? [];
      replaceNotes(normalized);
      setSavedCount(normalized.length);
      setMessage(`已儲存 ${normalized.length} 顆音符。`);
      if (playAfterSaving)
        window.location.assign(assetUrl('/rhythm/'));
    } catch {
      setMessage('瀏覽器無法儲存譜面，請確認沒有封鎖網站資料。');
    }
  };

  const useDefaultChart = () => {
    try {
      window.localStorage.removeItem(RHYTHM_CUSTOM_CHART_STORAGE_KEY);
      setSavedCount(0);
      setMessage('已改回示範譜面；工作區音符仍保留，可再次儲存。');
    } catch {
      setMessage('瀏覽器無法清除譜面，請確認沒有封鎖網站資料。');
    }
  };

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.hitTime - b.hitTime),
    [notes],
  );
  const canResume =
    phase === 'paused' && songTime < RHYTHM_DEMO_DURATION - 0.05;

  return (
    <main className={styles.world}>
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => {
          phaseRef.current = 'paused';
          setPhase('paused');
          setSongTime(RHYTHM_DEMO_DURATION);
          setMessage('音樂播放完畢，譜面留在工作區等待儲存。');
        }}
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
        <a className={styles.backLink} href={assetUrl('/rhythm/')}>
          <ArrowLeft size={18} aria-hidden="true" />
          返回音遊
        </a>
        <div className={styles.songLabel}>
          <Music2 size={17} aria-hidden="true" />
          <span>I Wan&apos;na Be Like You</span>
          <span aria-hidden="true">·</span>
          <span>0:59</span>
        </div>
      </header>

      <div className={styles.editorShell}>
        <section className={styles.intro}>
          <div className={styles.introIcon} aria-hidden="true">
            <Waves size={27} />
          </div>
          <div>
            <p className={styles.kicker}>WATERFALL CHART RECORDER</p>
            <h1>瀑布精靈製譜器</h1>
            <p>聽到想放音符的位置，就按方向鍵或 WASD。</p>
          </div>
        </section>

        <aside className={styles.hitTimeNotice}>
          <strong>按下的這一刻，就是音符抵達判定線的時間。</strong>
          <span>掉落動畫會在遊戲裡自動提早出現，不用自己算提前量。</span>
        </aside>

        <section className={styles.recorderCard} aria-labelledby="recorder-title">
          <div className={styles.recorderHeader}>
            <div>
              <p className={styles.kicker} id="recorder-title">
                RECORDER
              </p>
              <div className={styles.recordStatus} data-phase={phase}>
                <i aria-hidden="true" />
                {phase === 'recording'
                  ? '正在錄製'
                  : phase === 'paused'
                    ? '已暫停'
                    : '等待錄製'}
              </div>
            </div>
            <div className={styles.counter}>
              <strong>{formatPreciseTime(songTime)}</strong>
              <span>{notes.length} 顆音符</span>
            </div>
          </div>

          <div className={styles.timeline}>
            <canvas
              ref={canvasRef}
              aria-label={`59 秒音訊波形，目前 ${notes.length} 顆音符，播放位置 ${formatPreciseTime(songTime)}`}
            />
            <input
              className={styles.seekRange}
              type="range"
              min="0"
              max={RHYTHM_DEMO_DURATION}
              step="0.001"
              value={songTime}
              disabled={phase === 'recording'}
              aria-label="移動音樂播放位置"
              onChange={(event) => {
                const nextTime = Number(event.currentTarget.value);
                if (audioRef.current) audioRef.current.currentTime = nextTime;
                setSongTime(nextTime);
              }}
            />
            <span className={styles.startTime}>0:00</span>
            <span className={styles.endTime}>0:59</span>
          </div>

          <div className={styles.laneButtons} aria-label="錄製方向鍵">
            {RHYTHM_LANES.map((lane) => (
              <button
                className={`${styles.laneButton} ${styles[lane.id]} ${pressedLane === lane.id ? styles.isPressed : ''}`}
                key={lane.id}
                type="button"
                disabled={phase !== 'recording'}
                aria-label={`錄製${lane.label}方向，鍵盤 ${lane.key} 或 ${lane.arrow}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  recordLane(lane.id);
                }}
                onClick={(event) => {
                  if (event.detail === 0) recordLane(lane.id);
                }}
              >
                <span>{lane.arrow}</span>
                <small>{lane.key}</small>
              </button>
            ))}
          </div>

          <div className={styles.controls}>
            {phase === 'recording' ? (
              <Button className={styles.recordButton} onClick={pauseRecording}>
                <Pause size={18} aria-hidden="true" />
                暫停錄製
              </Button>
            ) : canResume ? (
              <Button
                className={styles.recordButton}
                disabled={isStarting}
                onClick={() => void beginRecording(false)}
              >
                <Play size={18} fill="currentColor" aria-hidden="true" />
                {isStarting ? '音樂載入中…' : '繼續錄製'}
              </Button>
            ) : (
              <Button
                className={styles.recordButton}
                disabled={isStarting}
                onClick={() => void beginRecording(true)}
              >
                <Circle size={17} fill="currentColor" aria-hidden="true" />
                {isStarting ? '音樂載入中…' : '從頭錄製'}
              </Button>
            )}
            {phase === 'paused' && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => void beginRecording(true)}
              >
                <RotateCcw size={17} aria-hidden="true" />
                從頭重錄
              </button>
            )}
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={!notes.length || phase === 'recording'}
              onClick={undoLastNote}
            >
              <Undo2 size={17} aria-hidden="true" />
              復原上一顆
            </button>
            <button
              className={styles.clearButton}
              type="button"
              disabled={!notes.length || phase === 'recording'}
              onClick={clearWorkingChart}
            >
              <Trash2 size={16} aria-hidden="true" />
              清空工作區
            </button>
          </div>
          {audioError && <p className={styles.audioError}>{audioError}</p>}
          <p className={styles.liveMessage} aria-live="polite" aria-atomic="true">
            {message}
          </p>
        </section>

        <div className={styles.lowerGrid}>
          <section className={styles.noteCard} aria-labelledby="note-list-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>NOTE LIST</p>
                <h2 id="note-list-title">音符落點</h2>
              </div>
              <span>{notes.length} 顆</span>
            </div>
            {sortedNotes.length ? (
              <ol className={styles.noteList}>
                {sortedNotes.map((note, index) => {
                  const lane = RHYTHM_LANES.find(
                    (candidate) => candidate.id === note.lane,
                  );
                  return (
                    <li key={note.id} data-lane={note.lane}>
                      <span>#{String(index + 1).padStart(3, '0')}</span>
                      <strong>
                        {lane?.arrow} {lane?.key}
                      </strong>
                      <time>{formatPreciseTime(note.hitTime)}</time>
                      <button
                        type="button"
                        disabled={phase === 'recording'}
                        aria-label={`刪除第 ${index + 1} 顆音符`}
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className={styles.emptyNotes}>
                還沒有音符。開始播放後，跟著音樂按方向鍵吧。
              </p>
            )}
          </section>

          <section className={styles.saveCard} aria-labelledby="save-title">
            <p className={styles.kicker}>SAVE &amp; TEST</p>
            <h2 id="save-title">存成我的譜面</h2>
            <p>
              儲存後，瀑布精靈音遊會直接讀取這份譜。音符會自動提早落下，並在你錄下的時間抵達底線。
            </p>
            <Button
              className={styles.saveAndPlayButton}
              disabled={!notes.length || phase === 'recording'}
              onClick={() => saveChart(true)}
            >
              <Play size={18} fill="currentColor" aria-hidden="true" />
              儲存並試玩
            </Button>
            <button
              className={styles.saveOnlyButton}
              type="button"
              disabled={!notes.length || phase === 'recording'}
              onClick={() => saveChart(false)}
            >
              <Save size={17} aria-hidden="true" />
              只儲存
            </button>
            <button
              className={styles.defaultButton}
              type="button"
              disabled={!savedCount || phase === 'recording'}
              onClick={useDefaultChart}
            >
              改用原本的示範譜面
            </button>
            <small>
              譜面只保存在目前瀏覽器與裝置；清除網站資料後會消失。
            </small>
          </section>
        </div>
      </div>
    </main>
  );
}
