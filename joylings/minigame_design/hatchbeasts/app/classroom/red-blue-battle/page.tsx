import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ChevronDown, Play } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { RED_BLUE_GAME_PUBLIC_URL } from '@/lib/release';
import { CourseHeader } from '../course-ui';
import { redBlueQuestions } from '../course-data';

export const metadata: Metadata = {
  title: '第二次課程｜紅藍槍戰｜遊戲設計',
  description: '玩紅藍槍戰，認識武器，再想一想新的武器和角色技能。',
};

export default function RedBlueBattleLesson() {
  return (
    <div className="lesson-page red-blue-lesson">
      <CourseHeader back />
      <main className="course-main lesson-main">
        <div className="lesson-intro">
          <p className="course-eyebrow">第二次課程</p>
          <h1>
            <span className="team-red">紅</span><span className="team-blue">藍</span>
            <span className="crayon-underline">槍戰</span>
          </h1>
          <p className="battle-intro-copy">先玩一玩，再說說你的想法。</p>
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
          <p className="section-note" style={{ marginTop: '1rem' }}>
            點一下遊戲畫面開始操作：WASD 移動、滑鼠轉向、左鍵開槍、右鍵瞄準、R 換彈、Esc 選單。
            <br />
            若顯示「相容操作」，按住右鍵拖曳轉向，放開移回後可再拖曳。用 Chrome 或 Edge 開啟遊戲可嘗試自由轉向。
          </p>
        </div>

        <section className="lesson-section battle-questions" aria-labelledby="battle-questions-title">
          <div className="lesson-section-heading">
            <h2 id="battle-questions-title">一起想想看</h2>
          </div>
          <p className="section-note">先說說自己的答案，想不到時再打開範例。</p>
          {redBlueQuestions.map((question, index) => (
            <details className="battle-question" id={question.anchor} key={question.anchor}>
              <summary>
                <span className="battle-question-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="battle-question-title">{question.text}</span>
                <span className="battle-answer-toggle">
                  <span className="answer-label-closed">看答案範例</span>
                  <span className="answer-label-open">收起範例</span>
                  <ChevronDown size={20} aria-hidden="true" />
                </span>
              </summary>
              <div className="battle-answers">
                <p>答案範例</p>
                <ul>
                  {question.answers.map((answer) => <li key={answer}>{answer}</li>)}
                </ul>
                {index >= 2 && <p className="battle-idea-note">這些是新點子，你也可以想出不一樣的！</p>}
              </div>
            </details>
          ))}
        </section>

        <a className="lesson-bottom-back course-back" href={assetUrl('/classroom/')}>
          <ArrowLeft size={18} aria-hidden="true" />
          返回目錄
        </a>
      </main>
      <footer className="course-footer">
        <span>紅藍槍戰 · 遊戲設計</span>
        <span className="footer-line" />
      </footer>
    </div>
  );
}
