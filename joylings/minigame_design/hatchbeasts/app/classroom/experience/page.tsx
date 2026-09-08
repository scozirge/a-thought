import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Egg,
  Lightbulb,
  Pencil,
  Play,
} from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { GAME_PUBLIC_URL, GAME_VERSION } from '@/lib/release';
import { CourseHeader } from '../course-ui';
import { eggDesigns, prompts } from '../course-data';

export const metadata: Metadata = { title: '遊戲體驗與發想｜遊戲設計' };
const places = ['香氣花園', '神祕洞穴', '森林瀑布'];
const hobbies = ['玩遊戲看漫畫或動畫', '跟朋友玩', '學習'];

export default function ExperienceLesson() {
  return (
    <div className="lesson-page">
      <CourseHeader back />
      <main className="course-main lesson-main">
        <div className="lesson-intro">
          <p className="course-eyebrow">單元 01</p>
          <h1>
            遊戲體驗<span className="crayon-underline">與發想</span>
          </h1>
          <nav className="lesson-nav" aria-label="單元內容">
            <a href="#current-design">目前設計</a>
            <a href="#combinations">選擇</a>
            <a href="#ideas">想想看</a>
            <a href="#sketch">設計草圖</a>
          </nav>
        </div>

        <section id="current-design" className="lesson-section">
          <div className="lesson-section-heading">
            <h2>
              <Compass size={25} strokeWidth={1.5} aria-hidden="true" />
              目前設計
            </h2>
            <a
              className="course-button play-game"
              href={GAME_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play size={17} fill="currentColor" aria-hidden="true" />
              玩目前遊戲 {GAME_VERSION}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
          <div className="question-design-grid">
            <article className="design-question question-place">
              <span className="question-label">問題一</span>
              <h3>你更喜歡哪個地方？</h3>
              <ol>
                {places.map((place, i) => (
                  <li key={place}>
                    <span className="answer-number">{i + 1}</span>
                    {place}
                  </li>
                ))}
              </ol>
            </article>
            <article className="design-question question-hobby">
              <span className="question-label">問題二</span>
              <h3>放假時，你更喜歡？</h3>
              <ol>
                {hobbies.map((hobby, i) => (
                  <li key={hobby}>
                    <span className="answer-number">{i + 1}</span>
                    {hobby}
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section id="combinations" className="lesson-section">
          <div className="lesson-section-heading combination-heading">
            <h2>
              <Egg size={26} strokeWidth={1.5} aria-hidden="true" />
              選擇
            </h2>
            <p className="section-note">第一碼是地點，第二碼是活動。</p>
          </div>
          <div className="habitat-groups">
            {places.map((place, index) => (
              <div className={`habitat-group habitat-${index + 1}`} key={place}>
                <h3 className="habitat-title">
                  <span>{index + 1}</span>
                  {place}
                </h3>
                <div className="beast-design-grid">
                  {eggDesigns
                    .slice(index * 3, index * 3 + 3)
                    .map((beast, i) => (
                      <article className="beast-design-card" key={beast.code}>
                        <div className="beast-design-top">
                          <span className="combination-code">{beast.code}</span>
                          <span className="hobby-label">{hobbies[i]}</span>
                        </div>
                        <h3>{beast.name}</h3>
                        <p>{beast.egg}</p>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="ideas" className="lesson-section ideas-section">
          <div className="lesson-section-heading">
            <h2>
              <Lightbulb size={26} strokeWidth={1.5} aria-hidden="true" />
              想想看
            </h2>
            <span className="ideas-mark" aria-hidden="true">
              ?
            </span>
          </div>
          <ol className="prompt-list">
            {prompts.map((prompt, i) => (
              <li id={`think-${i + 1}`} key={prompt.tag}>
                <span className="prompt-number">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="prompt-tag">{prompt.tag}</span>
                  <p>{prompt.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="sketch" className="sketch-note">
          <span className="unit-icon tint-green">
            <Pencil size={28} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <h2>設計草圖</h2>
            <p>拿起紙筆，畫出你的怪獸、破殼演出和新玩法。</p>
          </div>
        </section>
        <a
          className="lesson-bottom-back course-back"
          href={assetUrl('/classroom/')}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          返回目錄
        </a>
      </main>
      <footer className="course-footer">
        <span>破殼怪獸 · 遊戲設計</span>
        <span className="footer-line" />
      </footer>
    </div>
  );
}
