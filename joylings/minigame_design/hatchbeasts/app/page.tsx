'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowLeft,
  PencilLine,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { assetUrl } from '@/lib/assets';
import { GAME_VERSION } from '@/lib/release';
import {
  ACTIVITIES,
  PLACES,
  HATCH_TAPS,
  initialState,
  gameReducer,
  getBeast,
  type Choice,
} from '@/lib/game';

function ChoiceCards({
  choices,
  value,
  onChange,
}: {
  choices: readonly Choice[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <RadioGroup
      className="choice-grid"
      value={value ?? ''}
      onValueChange={(next) => onChange(String(next))}
      aria-labelledby="question-title"
    >
      {choices.map((choice, index) => (
        <label
          htmlFor={`choice-${choice.image}`}
          className={`choice-card choice-${choice.image} ${value === choice.id ? 'is-selected' : ''}`}
          key={choice.id}
          style={
            {
              '--card-delay': `${index * 70}ms`,
              '--choice-tint': choice.tint,
              '--choice-edge': choice.edge,
            } as CSSProperties
          }
        >
          <span className="choice-art">
            {/* oxlint-disable-next-line nextjs/no-img-element -- Native local images avoid the preview image shim's hook error. */}
            <img
              src={assetUrl(`/images/${choice.image}.png?v=monster-doodle-2`)}
              alt={choice.alt}
              draggable={false}
              width={1536}
              height={1024}
              loading="eager"
            />
          </span>
          <span className="choice-copy">
            <span className="choice-name">{choice.label}</span>
          </span>
          <RadioGroupItem
            id={`choice-${choice.image}`}
            value={choice.id}
            aria-label={choice.label}
            className="choice-radio"
          />
        </label>
      ))}
    </RadioGroup>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(state.stage);
  const eggAudioContextRef = useRef<AudioContext | null>(null);
  const beast = getBeast(state);
  const isQuestion = state.stage === 'place' || state.stage === 'activity';
  const selected = state.stage === 'place' ? state.place : state.activity;

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('result');
    if (result) dispatch({ type: 'RESTORE_RESULT', value: result });
  }, []);

  useEffect(() => {
    if (previousStage.current !== state.stage) {
      previousStage.current = state.stage;
      titleRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [state.stage]);
  useEffect(
    () => () => {
      const context = eggAudioContextRef.current;
      if (context && context.state !== 'closed')
        void context.close().catch(() => undefined);
    },
    [],
  );

  const playEggTapSound = useCallback((tapCount: number) => {
    try {
      const context =
        eggAudioContextRef.current ??
        (eggAudioContextRef.current = new AudioContext());
      if (context.state === 'suspended')
        void context.resume().catch(() => undefined);
      const start = context.currentTime + 0.004;
      const isFinalTap = tapCount + 1 >= HATCH_TAPS;

      const playTone = (
        type: OscillatorType,
        frequency: number,
        volume: number,
        duration: number,
        endFrequency: number,
      ) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          start + duration,
        );
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.015);
      };

      const pitch = isFinalTap ? 560 : 285 + tapCount * 12;
      playTone(
        'triangle',
        pitch,
        isFinalTap ? 0.12 : 0.085,
        0.13,
        pitch * 0.72,
      );
      playTone('sine', 135 + tapCount * 2, 0.05, 0.09, 88);
      if (isFinalTap) playTone('square', 920, 0.022, 0.07, 180);
    } catch {
      // Sound is an enhancement; hatching must still work if Web Audio is unavailable.
    }
  }, []);
  useEffect(() => {
    if (state.stage !== 'hatching') return;
    const timer = window.setTimeout(() => dispatch({ type: 'REVEAL' }), 1100);
    return () => window.clearTimeout(timer);
  }, [state.stage]);

  return (
    <div className={`game-world ${!isQuestion ? 'is-nest-scene' : ''}`}>
      {beast && <link rel="preload" as="image" href={assetUrl(beast.image + '?v=beasts-5')} />}
      {state.stage === 'activity' && (
        <link
          rel="preload"
          as="image"
          href={assetUrl('/images/nest-background.png?v=monster-doodle-2')}
        />
      )}
      {isQuestion && (
        <header className="site-header">
          <h1 className="game-title">
            破殼怪獸 <span className="game-version">{GAME_VERSION}</span>
          </h1>
          <p className="game-subtitle">一場小小的孵化奇遇</p>
        </header>
      )}
      <main
        className={`game-main ${isQuestion ? 'question-main' : 'nest-main'}`}
      >
        {isQuestion ? (
          <section className="question-section" key={state.stage}>
            <div className="section-heading">
              <h2 id="question-title" ref={titleRef} tabIndex={-1}>
                {state.stage === 'place' ? (
                  <>
                    你更喜歡<span className="accent-text">哪個地方</span>？
                  </>
                ) : (
                  <>
                    放假時，你更喜歡<span className="accent-text">做什麼</span>
                    ？
                  </>
                )}
              </h2>
            </div>
            <ChoiceCards
              choices={state.stage === 'place' ? PLACES : ACTIVITIES}
              value={selected}
              onChange={(value) => dispatch({ type: 'SELECT', value })}
            />
            <div className="question-actions">
              {state.stage === 'activity' && (
                <Button
                  variant="ghost"
                  className="back-button"
                  onClick={() => dispatch({ type: 'BACK' })}
                >
                  <ArrowLeft size={17} /> 上一題
                </Button>
              )}
              <Button
                className="primary-button"
                disabled={!selected}
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                決定好了!
              </Button>
            </div>
          </section>
        ) : beast ? (
          <section
            className={`nest-scene ${state.stage === 'hatching' ? 'is-hatching' : ''}`}
            aria-labelledby={
              state.stage === 'result' ? 'beast-name' : 'egg-title'
            }
            style={
              {
                '--beast-color': beast.color,
                '--beast-tint': beast.tint,
              } as CSSProperties
            }
          >
            {/* oxlint-disable-next-line nextjs/no-img-element -- Decorative local scene uses the same native image path as the options. */}
            <img
              className="nest-background"
              src={assetUrl('/images/nest-background.png?v=monster-doodle-2')}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            {state.stage !== 'result' ? (
              <>
                <h2
                  id="egg-title"
                  className="egg-arrival-title"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  一顆怪獸蛋出現了!
                </h2>
                <div className="egg-arrival">
                  <button
                    className="egg-button"
                    onClick={() => {
                      playEggTapSound(state.taps);
                      dispatch({ type: 'TAP' });
                    }}
                    disabled={state.stage === 'hatching'}
                    onKeyDown={(event) => {
                      if (
                        event.repeat &&
                        (event.key === ' ' || event.key === 'Enter')
                      )
                        event.preventDefault();
                    }}
                    aria-label={`點擊怪獸蛋，已點 ${state.taps} 下，共需 ${HATCH_TAPS} 下`}
                    aria-describedby="egg-prompt"
                  >
                    <svg
                      key={state.taps}
                      className={`egg-placeholder ${state.taps > 0 ? 'is-tapped' : ''}`}
                      viewBox="0 0 180 230"
                      aria-hidden="true"
                    >
                      <path
                        d="M88 10 C62 8 38 51 24 91 C8 132 11 180 37 204 C60 226 120 222 146 200 C171 177 164 133 151 94 C139 52 114 9 88 10Z"
                        fill="#fff3be"
                        stroke="#765398"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M82 14 C56 24 38 67 27 97 M147 111 C160 152 157 183 139 199 M45 207 Q89 226 128 210"
                        fill="none"
                        stroke="#765398"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <p id="egg-prompt" className="egg-prompt">
                  連續點點蛋，讓裡面的小怪獸醒過來吧!
                </p>
              </>
            ) : (
              <>
                <h2
                  id="beast-name"
                  className="beast-name"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  {beast.name}
                </h2>
                <div className="beast-arrival">
                  {/* oxlint-disable-next-line nextjs/no-img-element -- Local character artwork. */}
                  <img
                    className="beast-art"
                    src={assetUrl(beast.image + '?v=beasts-5')}
                    alt={beast.appearance}
                    width={1024}
                    height={1024}
                    draggable={false}
                  />
                </div>
                <div className="beast-next-actions">
                  <p>想和{beast.name}一起做什麼？</p>
                  <div className="beast-primary-actions">
                    <a
                      className="beast-action beast-action-primary"
                      href={assetUrl(`/rhythm/?beast=${beast.id}`)}
                    >
                      <Play size={18} fill="currentColor" aria-hidden="true" />
                      開始演奏
                    </a>
                    <a
                      className="beast-action beast-action-secondary"
                      href={assetUrl(`/rhythm/editor/?beast=${beast.id}`)}
                    >
                      <PencilLine size={18} aria-hidden="true" />
                      製譜
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    className="rehatch-button"
                    onClick={() => dispatch({ type: 'RESET' })}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    重新孵蛋
                  </Button>
                </div>
              </>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
