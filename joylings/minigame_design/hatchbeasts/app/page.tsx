'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, Egg, RotateCcw, Sparkles, Stars } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { assetUrl } from '@/lib/assets';
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
              src={assetUrl(`/images/${choice.image}.png?v=7`)}
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
  const beast = getBeast(state);
  const isQuestion = state.stage === 'place' || state.stage === 'activity';
  const selected = state.stage === 'place' ? state.place : state.activity;
  const progress = Math.round((state.taps / HATCH_TAPS) * 100);

  useEffect(() => {
    if (previousStage.current !== state.stage) {
      previousStage.current = state.stage;
      titleRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [state.stage]);
  useEffect(() => {
    if (state.stage !== 'hatching') return;
    const timer = window.setTimeout(() => dispatch({ type: 'REVEAL' }), 1100);
    return () => window.clearTimeout(timer);
  }, [state.stage]);

  const hint =
    state.taps === 0
      ? '輕輕點一下，跟裡面的朋友打聲招呼。'
      : state.taps < 4
        ? '咚、咚！它好像聽見你了。'
        : state.taps < 8
          ? '蛋開始搖晃了，繼續為它加油！'
          : state.taps < HATCH_TAPS
            ? '就快見面了，再點幾下！'
            : '小心……它要出來了！';

  return (
    <div className="game-world">
      <header className="site-header">
        <h1 className="game-title">破殼怪獸</h1>
        <p className="game-subtitle">一場小小的孵化奇遇</p>
      </header>
      <main
        className={`game-main ${isQuestion ? 'question-main' : 'incubation-main'}`}
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
        ) : beast && state.stage !== 'result' ? (
          <section
            className={`egg-section ${state.stage === 'hatching' ? 'is-hatching' : ''}`}
            style={
              {
                '--beast-color': beast.color,
                '--beast-tint': beast.tint,
              } as CSSProperties
            }
          >
            <div className="section-heading">
              <h2 ref={titleRef} tabIndex={-1}>
                {state.stage === 'hatching' ? (
                  '準備迎接新朋友！'
                ) : (
                  <>
                    你的<span className="accent-text">神祕蛋</span>出現了！
                  </>
                )}
              </h2>
              <p>
                {state.stage === 'hatching'
                  ? '一段新的友誼，就從這一刻開始。'
                  : '連續點點蛋，讓裡面的小怪獸醒過來。'}
              </p>
            </div>
            <div className="egg-stage">
              <div className="magic-orbit orbit-one" aria-hidden="true" />
              <div className="magic-orbit orbit-two" aria-hidden="true" />
              <span className="stage-star stage-star-one" aria-hidden="true">
                ✧
              </span>
              <span className="stage-star stage-star-two" aria-hidden="true">
                ✦
              </span>
              <button
                className="egg-button"
                onClick={() => dispatch({ type: 'TAP' })}
                disabled={state.stage === 'hatching'}
                onKeyDown={(event) => {
                  if (
                    event.repeat &&
                    (event.key === ' ' || event.key === 'Enter')
                  )
                    event.preventDefault();
                }}
                aria-label={`點擊神祕蛋，已點 ${state.taps} 下，共需 ${HATCH_TAPS} 下`}
              >
                <span
                  key={state.taps}
                  className={`egg-placeholder ${state.taps > 0 ? 'is-tapped' : ''}`}
                >
                  <span className="egg-icon">
                    <Egg size={84} strokeWidth={1} />
                  </span>
                  <span className="egg-label">神祕蛋</span>
                  <span className="placeholder-label">造型準備中</span>
                  {state.taps >= 4 && (
                    <svg
                      className="egg-crack"
                      viewBox="0 0 100 100"
                      aria-hidden="true"
                    >
                      <path
                        d={
                          state.taps >= 8
                            ? 'M48 2 39 25 54 39 37 57 56 72 43 96 M54 39 78 30 M37 57 16 50'
                            : 'M48 2 39 25 54 39 37 57'
                        }
                      />
                    </svg>
                  )}
                </span>
                {state.taps > 0 && (
                  <span
                    key={`pop-${state.taps}`}
                    className="tap-spark"
                    aria-hidden="true"
                  >
                    ✦
                  </span>
                )}
              </button>
              <span className="egg-shadow" aria-hidden="true" />
            </div>
            <div className="hatch-meter">
              <div className="meter-label">
                <span>
                  <Sparkles size={15} /> 喚醒小怪獸
                </span>
                <span>
                  {state.taps}{' '}
                  <span className="meter-total">/ {HATCH_TAPS}</span>
                </span>
              </div>
              <Progress
                value={progress}
                aria-label="孵化進度"
                className="hatch-progress"
              />
              <p aria-live="polite">{hint}</p>
            </div>
            <div className="egg-description">
              <span>蛋的模樣</span>
              <p>{beast.egg}</p>
            </div>
          </section>
        ) : beast ? (
          <section
            className="result-section"
            style={
              {
                '--beast-color': beast.color,
                '--beast-tint': beast.tint,
              } as CSSProperties
            }
          >
            <div className="section-heading">
              <h2 ref={titleRef} tabIndex={-1}>
                破殼成功！
              </h2>
            </div>
            <div className="result-card">
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <i key={index} style={{ '--i': index } as CSSProperties} />
                ))}
              </div>
              <span className="result-edition">怪獸 {beast.id}</span>
              <div className="beast-placeholder">
                <Stars size={52} strokeWidth={1.2} />
                <small>怪獸造型準備中</small>
              </div>
              <h3>{beast.name}</h3>
              <div className="choice-receipt">
                <span>
                  {PLACES.find((choice) => choice.id === state.place)?.label}
                </span>
                <span aria-hidden="true">＋</span>
                <span>
                  {
                    ACTIVITIES.find((choice) => choice.id === state.activity)
                      ?.shortLabel
                  }
                </span>
              </div>
              <div className="result-egg-note">
                <Egg size={17} />
                <p>{beast.egg}</p>
              </div>
            </div>
            <Button
              className="primary-button replay-button"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              <RotateCcw size={17} /> 再孵一顆蛋
            </Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
