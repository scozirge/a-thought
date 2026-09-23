'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Pause, Play, RotateCcw } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { ROUND_SECONDS, TARGET_SCORE, WEAPONS } from '@/lib/arena';
import type { ArenaSnapshot, createArena } from '@/lib/arena-engine';
import './arena.css';

export default function ArenaPage() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createArena> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [sensitivity, setSensitivity] = useState(2.5);
  const [state, setState] = useState<ArenaSnapshot>({ status: 'ready', score: 0, health: 100, seconds: ROUND_SECONDS, hit: false, hurt: false, locked: false, weapon: 0, ammo: 30, reloading: false, aiming: false, respawn: 0, deaths: 0, notice: '', round: 1, enemyHealth: 100 });
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
        <span>RIVALS <b>1 VS 1 · 單機原型</b></span>
      </header>
      <div className="arena-stage">
        <div className="arena-canvas" ref={host} />
        <div className="arena-hud">
          <div className="arena-score"><small>YOU / 你</small><strong>{state.score}<span> : </span>{state.deaths}</strong><small>BOT / 電腦 · 先贏 {TARGET_SCORE} 回合</small></div>
          <div className="arena-clock"><small>ROUND {state.round}</small><strong>{Math.floor(state.seconds / 60)}:{String(state.seconds % 60).padStart(2, '0')}</strong></div>
          <button className="arena-pause" onClick={() => engine.current?.pause()} disabled={!playing}><Pause size={18} />暫停</button>
        </div>
        {playing && <>
          <div className="arena-mouse-mode">
            {state.locked ? '滑鼠已鎖定 · Esc 釋放' : '自由滑鼠模式：移動滑鼠轉向，移至左右邊緣可持續旋轉'}
            {!state.locked && <button onClick={() => engine.current?.requestLock()}>鎖定滑鼠</button>}
          </div>
          <div className={`arena-crosshair ${state.hit ? 'is-hit' : ''}`} aria-hidden="true">{state.hit ? '×' : '+'}</div>
          <div className="arena-health"><span>HP {state.health}</span><progress aria-label="生命值" value={state.health} max={100} /></div>
          <div className="arena-loadout">
            <div className="arena-ammo"><span>{WEAPONS[state.weapon].name}</span><strong>{state.weapon === 2 ? '近戰' : state.reloading ? '換彈中…' : `${state.ammo} / ${WEAPONS[state.weapon].magazine}`}</strong><small>R 換彈 · 備用彈藥無限</small></div>
            <div className="arena-weapons">{WEAPONS.map((w, i) => <button key={w.name} aria-pressed={i === state.weapon} onClick={() => engine.current?.selectWeapon(i)}>{i + 1} {w.name}<small>{i === state.weapon ? '使用中' : '切換'}</small></button>)}</div>
          </div>
          {state.notice && <output className="arena-notice">{state.notice}</output>}
          {state.respawn > 0 && <div className="arena-respawn">{state.notice || '下一回合'}<br /><strong>{state.respawn}</strong><br />準備開始</div>}
          {state.hurt && <div className="arena-damage" aria-hidden="true" />}
        </>}
        {!playing && <div className="arena-overlay">
          <section className="arena-panel">
            <span className="arena-eyebrow">FIRST TO FIVE / 1 VS 1</span>
            <div className="arena-emblem"><Crosshair size={36} strokeWidth={1.5} /></div>
            <h1>{error ? '無法啟動 3D 場景' : state.status === 'paused' ? '休息一下！' : state.status === 'won' ? 'VICTORY' : state.status === 'lost' ? 'DEFEAT' : 'RIVALS'}</h1>
            <p>{error ? '請使用支援 WebGL 的桌面瀏覽器，並開啟硬體加速後重新整理。' : finished ? `最終比分 ${state.score} : ${state.deaths}。${state.status === 'won' ? '你贏得了這場對決！' : '換個路線，再挑戰一次。'}` : state.status === 'paused' ? '對戰已暫停。準備好後繼續。' : '1 對 1 電腦對決，先贏 5 回合。每回合 60 秒，擊倒對手得 1 分；時間到時，剩餘血量較高的一方獲勝。' }</p>
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
              {error ? '無法開始' : !ready ? '場地準備中…' : finished ? '再玩一場' : state.status === 'paused' ? '繼續挑戰' : '開始對決'}
            </button>
            <small className="arena-fallback">非官方 H5 單機原型 · 滑鼠無法鎖定時，自動改用自由滑鼠轉向。方向鍵也可瞄準。</small>
          </section>
        </div>}
        {playing && <div className="arena-controls">WASD 移動 · Shift 衝刺 · 空白鍵跳躍 · 右鍵瞄準 · R 換彈 · Esc 暫停</div>}
      </div>
    </main>
  );
}
