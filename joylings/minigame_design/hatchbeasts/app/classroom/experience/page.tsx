import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Lightbulb,
  Pencil,
  Play,
} from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { GAME_PUBLIC_URL, GAME_VERSION } from '@/lib/release';
import { CourseHeader } from '../course-ui';
import { prompts } from '../course-data';
import { PLACES, ACTIVITIES, BEASTS } from '@/lib/game';

export const metadata: Metadata = { title: '遊戲體驗與發想｜遊戲設計' };

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
          <div className="design-equations">
            {PLACES.flatMap((place) => ACTIVITIES.map((activity) => {
              const beast = BEASTS[place.id + activity.id];
              return (
                <article className="design-equation" key={beast.id} aria-label={place.label + '加上' + activity.label + '，孵出' + beast.name}>
                  <figure>
                    {/* oxlint-disable-next-line nextjs/no-img-element -- Local lesson artwork. */}
                    <img src={assetUrl('/images/' + place.image + '.png?v=monster-doodle-2')} alt={place.alt} width={240} height={180} />
                    <figcaption>{place.label}</figcaption>
                  </figure>
                  <span className="equation-symbol" aria-hidden="true">＋</span>
                  <figure>
                    {/* oxlint-disable-next-line nextjs/no-img-element -- Local lesson artwork. */}
                    <img src={assetUrl('/images/' + activity.image + '.png?v=monster-doodle-2')} alt={activity.alt} width={240} height={180} />
                    <figcaption>{activity.label}</figcaption>
                  </figure>
                  <span className="equation-symbol" aria-hidden="true">＝</span>
                  <figure>
                    {/* oxlint-disable-next-line nextjs/no-img-element -- Local lesson artwork. */}
                    <img className="equation-beast" src={assetUrl(beast.image + '?v=beasts-5')} alt={beast.appearance} width={240} height={240} />
                    <figcaption>{beast.name}</figcaption>
                  </figure>
                </article>
              );
            }))}
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
            <h2>拿起紙筆動手設計</h2>
            <ol className="sketch-steps">
              <li>畫出你的新地點選項</li>
              <li>畫出你的新怪獸</li>
              <li>寫下你的新想法</li>
            </ol>
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
