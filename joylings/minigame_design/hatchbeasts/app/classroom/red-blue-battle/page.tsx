import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ChevronDown, ClipboardList, Play } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { RED_BLUE_GAME_PUBLIC_URL } from '@/lib/release';
import { CourseHeader } from '../course-ui';
import { redBlueQuestions, redBlueRetrospective } from '../course-data';
import weaponQuestions from './weapon-questions.json';

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
          <nav className="lesson-nav" aria-label="本課導覽">
            <a href="#battle-questions-title">一起想想看</a>
            <a href="#weapon-challenges">武器邏輯挑戰・15 題</a>
            <a href="#retrospective">課後復盤</a>
          </nav>
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
            在大廳選「手機觸控」或「鍵盤滑鼠」，兩種模式都能按右上角「全螢幕」。
            <br />
            手機：左側搖桿移動、右側滑動轉向，按住射擊可連射；瞄準點一下開啟、再點一下關閉，可邊瞄準邊射擊。
            <br />
            鍵鼠：WASD 移動、滑鼠轉向、左鍵開槍、按住右鍵瞄準、R 換彈、Esc 選單。
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

        <section id="weapon-challenges" className="lesson-section" aria-labelledby="weapon-challenges-title">
          <div className="lesson-section-heading"><h2 id="weapon-challenges-title">武器邏輯挑戰</h2></div>
          <p className="section-note">每次死亡挑戰一題，答對拿一個徽章。每集滿 3 個，就解鎖下一把武器！答錯下次再挑戰同一題。</p>
          <p>手槍 → 菜刀 → 火箭筒 → 毒藥 → 加特林 → 核彈</p>
          <p className="section-note">每次復活預設拿最近解鎖的武器。核彈解鎖後不再出題。離開房間後，進度重新開始。手機的「射擊按鈕」就是題目中的「滑鼠左鍵」。</p>
          <div id="game-updates">
            <p className="section-note">答題畫面只留題目和選項。看完結果按「繼續」，再選武器、等倒數復活。</p>
            <p className="section-note">每次死亡都先選好最近解鎖的武器；還沒解鎖就拿手槍。倒數時可改選手槍或其他已解鎖武器，只影響這次復活。場上撿到的槍不列入復活選單。</p>
            <p className="section-note"><strong>新版玩法：</strong>菜刀、火箭筒、毒藥、加特林和核彈，只能答題解鎖後在復活時取得，場地上不會出現。場上仍可撿步槍、散彈槍和狙擊槍。</p>
            <p className="section-note">電腦玩家會分散走不同路線，靠得太近時會讓開，看到敵人也會稍微快一點開火。試著觀察：為什麼隊友不要全部擠在同一條路？</p>
            <p className="section-note">想先認識武器，可以進入訓練場，用「更換武器」選單自由試用；回到對戰房間，仍要依序答題解鎖。</p>
          </div>
          {weaponQuestions.stages.map((stage) => (
            <div key={stage.weapon} className="weapon-question-group">
              <h3>{stage.name}的 3 題 → 解鎖{stage.reward}</h3>
              {stage.questions.map((question, index) => (
                <article className="battle-question" key={question.title}>
                  <div className="weapon-question-content">
                    <h4>第 {index + 1} 題｜{question.title}</h4>
                    {'context' in question && <p>{question.context}</p>}
                    <ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol>
                    <details><summary>看答案與說明</summary><p><strong>答案：{question.answer + 1}。</strong>{question.explanation}</p></details>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </section>

        <section id="retrospective" className="lesson-section" aria-labelledby="battle-retrospective-title">
          <div className="lesson-section-heading">
            <h2 id="battle-retrospective-title">
              <ClipboardList size={26} strokeWidth={1.5} aria-hidden="true" />
              課後復盤
            </h2>
          </div>
          <p>第二堂課的課堂觀察 · <time dateTime="2026-09-24">2026-09-24</time></p>
          <ol className="prompt-list">
            {redBlueRetrospective.map((entry, index) => (
              <li key={entry.tag}>
                <span className="prompt-number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <span className="prompt-tag">{entry.tag}</span>
                  <p>{entry.text}</p>
                </div>
              </li>
            ))}
          </ol>
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
