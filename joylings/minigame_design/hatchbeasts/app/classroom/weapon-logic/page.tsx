import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, Play } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { RED_BLUE_GAME_PUBLIC_URL } from '@/lib/release';
import { CourseHeader } from '../course-ui';
import { WeaponChallenges } from '../weapon-challenges';
import weaponQuestions from '../red-blue-battle/weapon-questions.json';

export const metadata: Metadata = {
  title: '第三次課程｜紅藍槍戰・武器邏輯｜遊戲設計',
  description: '用 15 題遊戲問題練習條件判斷、計數與重複檢查，答題解鎖新武器。',
};

export default function WeaponLogicLesson() {
  return (
    <div className="lesson-page red-blue-lesson">
      <CourseHeader back />
      <main className="course-main lesson-main">
        <div className="lesson-intro">
          <p className="course-eyebrow">第三次課程</p>
          <h1>
            紅藍槍戰・<span className="crayon-underline">武器邏輯</span>
          </h1>
          <p className="battle-intro-copy">玩遊戲，想規則，解鎖新武器。</p>
          <a
            className="course-button battle-game-link"
            href={RED_BLUE_GAME_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            玩紅藍槍戰
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <nav className="lesson-nav" aria-label="本課題目" style={{ marginTop: '1.25rem' }}>
            {weaponQuestions.stages.map((stage) => (
              <a key={stage.weapon} href={`#weapon-stage-${stage.weapon}`}>
                {stage.name}・3 題
              </a>
            ))}
          </nav>
          <p className="section-note">
            先想想自己的答案，再打開說明。試著說：「如果……，而且……，遊戲就會……。」
          </p>
        </div>
        <WeaponChallenges />
        <a
          className="lesson-bottom-back course-back"
          href={assetUrl('/classroom/')}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          返回目錄
        </a>
      </main>
      <footer className="course-footer">
        <span>第三次課程 · 遊戲設計</span>
        <span className="footer-line" />
      </footer>
    </div>
  );
}
