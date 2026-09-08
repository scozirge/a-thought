'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, RotateCcw, Stars } from 'lucide-react';
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

  return (
    <div className={`game-world ${!isQuestion ? 'is-nest-scene' : ''}`}>
      {state.stage === 'activity' && (
        <link
          rel="preload"
          as="image"
          href={assetUrl('/images/nest-background.png')}
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
              src={assetUrl('/images/nest-background.png')}
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
                    onClick={() => dispatch({ type: 'TAP' })}
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
                    <span
                      key={state.taps}
                      className={`egg-placeholder ${state.taps > 0 ? 'is-tapped' : ''}`}
                      aria-hidden="true"
                    />
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
                  <div className="beast-placeholder" aria-hidden="true">
                    <Stars size={60} strokeWidth={1.2} aria-hidden="true" />
                  </div>
                </div>
                <Button
                  className="primary-button replay-button"
                  onClick={() => dispatch({ type: 'RESET' })}
                >
                  <RotateCcw size={17} /> 再孵一顆蛋
                </Button>
              </>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
