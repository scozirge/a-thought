'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Pause, Play, RotateCcw } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { ROUND_SECONDS, TARGET_SCORE, WEAPONS, unlockedWeapon } from '@/lib/arena';
import type { ArenaSnapshot, createArena } from '@/lib/arena-engine';
import './arena.css';

export default function ArenaPage() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createArena> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [sensitivity, setSensitivity] = useState(2.5);
  const [state, setState] = useState<ArenaSnapshot>({ status: 'ready', score: 0, health: 100, seconds: ROUND_SECONDS, hit: false, hurt: false, locked: false, weapon: 0, ammo: 18, reloading: false, aiming: false, respawn: 0, deaths: 0, notice: '' });
  useEffect(() => {
    let cancelled = false;
    import('@/lib/arena-engine').then(({ createArena: create }) => {
      if (cancelled || !host.current) return;
      engine.current = create(host.current, setState);
      setReady(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, []);
  const playing = state.status === 'playing';
  const finished = state.status === 'won' || state.status === 'lost';
  return (
    <main className="arena-page">
      <header className="arena-header">
        <a href={assetUrl('/classroom/')}><ArrowLeft size={18} />教學目錄</a>
        <span>BLOCK PLAYGROUND <b>單機練習</b></span>
      </header>
      <div className="arena-stage">
        <div className="arena-canvas" ref={host} />
        <div className="arena-hud">
          <div className="arena-score"><small>擊倒方塊對手</small><strong>{state.score}<span> / {TARGET_SCORE}</span></strong></div>
          <div className="arena-clock"><small>剩餘時間</small><strong>{Math.floor(state.seconds / 60)}:{String(state.seconds % 60).padStart(2, '0')}</strong></div>
          <button className="arena-pause" onClick={() => engine.current?.pause()} disabled={!playing}><Pause size={18} />暫停</button>
        </div>
        {playing && <>
          <div className="arena-mouse-mode">
            {state.locked ? '滑鼠已鎖定 · Esc 釋放' : '自由滑鼠模式：移動滑鼠轉向，移至左右邊緣可持續旋轉'}
            {!state.locked && <button onClick={() => engine.current?.requestLock()}>鎖定滑鼠</button>}
          </div>
          <div className={`arena-crosshair ${state.hit ? 'is-hit' : ''}`} aria-hidden="true">{state.hit ? '×' : '+'}</div>
          <div className="arena-health"><span>護盾 {state.health}%</span><progress aria-label="護盾" value={state.health} max={100} /></div>
          <div className="arena-loadout">
            <div className="arena-ammo"><span>{WEAPONS[state.weapon].name}</span><strong>{state.reloading ? '換彈中…' : `${state.ammo} / ${WEAPONS[state.weapon].magazine}`}</strong><small>R 換彈 · 備用彈藥無限</small></div>
            <div className="arena-weapons">{WEAPONS.map((w, i) => <button key={w.name} disabled={i > unlockedWeapon(state.score)} aria-pressed={i === state.weapon} onClick={() => engine.current?.selectWeapon(i)}>{i + 1} {w.name}<small>{i > unlockedWeapon(state.score) ? `${w.unlock} 次擊倒解鎖` : i === state.weapon ? '使用中' : '切換'}</small></button>)}</div>
          </div>
          {state.notice && <output className="arena-notice">{state.notice}</output>}
          {state.respawn > 0 && <div className="arena-respawn">護盾耗盡<br /><strong>{state.respawn}</strong><br />秒後重返場地 · 分數保留</div>}
          {state.hurt && <div className="arena-damage" aria-hidden="true" />}
        </>}
        {!playing && <div className="arena-overlay">
          <section className="arena-panel">
            <span className="arena-eyebrow">小小競技場 / 01</span>
            <div className="arena-emblem"><Crosshair size={36} strokeWidth={1.5} /></div>
            <h1>{error ? '無法啟動 3D 場景' : state.status === 'paused' ? '休息一下！' : state.status === 'won' ? '挑戰成功！' : state.status === 'lost' ? '再試一次吧！' : '方塊泡泡戰'}</h1>
            <p>{error ? '請使用支援 WebGL 的桌面瀏覽器，並開啟硬體加速後重新整理。' : finished ? `擊倒 ${state.score} 個對手，重生 ${state.deaths} 次！${state.status === 'won' ? '挑戰成功！' : '時間到了，再挑戰一次吧！'}` : state.status === 'paused' ? '準備好後繼續，倒數和對手都會等你。' : '90 秒擊倒 10 個對手！累積 3 / 6 次擊倒，解鎖重型槍與連發槍。護盾耗盡會重生，分數保留。'}</p>
            <div className="arena-instructions">
              <span><kbd>W A S D</kbd>移動</span><span><kbd>滑鼠</kbd>瞄準</span>
              <span><kbd>左鍵</kbd>按住射擊</span><span><kbd>Esc</kbd>暫停</span>
              <span><kbd>右鍵</kbd>精準瞄準</span><span><kbd>R</kbd>換彈</span>
              <span><kbd>Shift</kbd>衝刺</span><span><kbd>空白鍵</kbd>跳躍</span>
              <span><kbd>1 / 2 / 3</kbd>切換武器</span><span><kbd>F</kbd>鍵盤射擊</span>
            </div>
            <label className="arena-sensitivity">滑鼠靈敏度 <input type="range" min="0.8" max="6" step="0.1" value={sensitivity} onChange={(event) => { const value = Number(event.target.value); setSensitivity(value); engine.current?.setSensitivity(value / 1000); }} /><output>{sensitivity.toFixed(1)}</output></label>
            <button className="arena-start" disabled={!ready || error} onClick={() => engine.current?.start()}>
              {finished ? <RotateCcw size={20} /> : <Play size={20} fill="currentColor" />}
              {error ? '無法開始' : !ready ? '場地準備中…' : finished ? '再玩一場' : state.status === 'paused' ? '繼續挑戰' : '開始挑戰'}
            </button>
            <small className="arena-fallback">滑鼠無法鎖定時，自動改用自由滑鼠轉向。方向鍵也可瞄準。</small>
          </section>
        </div>}
        <div className="arena-controls">WASD 移動 · Shift 衝刺 · 空白鍵跳躍 · 右鍵瞄準 · R 換彈 · Esc 暫停</div>
      </div>
    </main>
  );
}
