import { ArrowUpRight, ChevronDown, Gamepad2 } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { GAME_PUBLIC_URL, GAME_VERSION } from '@/lib/release';
import { CourseHeader, UnitIcon } from './course-ui';
import { activities, units } from './course-data';

export default function ClassroomHome() {
  return (
    <>
      <CourseHeader />
      <main className="course-main catalog-main">
        <section className="catalog-intro">
          <div>
            <h1>
              遊戲<span className="crayon-underline">設計</span>
            </h1>
            <a
              className="course-button catalog-game-link"
              href={GAME_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Gamepad2 size={20} aria-hidden="true" />
              玩破殼怪獸 {GAME_VERSION}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="catalog-illustration" aria-hidden="true">
            {/* oxlint-disable-next-line nextjs/no-img-element -- Reuse the game's local crayon illustration as a decorative asset. */}
            <img
              src={assetUrl('/images/friends.png')}
              alt=""
              width={1536}
              height={1024}
            />
          </div>
        </section>

        <nav aria-label="課程目錄" className="course-catalog">
          <details className="featured-unit">
            <summary className="featured-heading">
              <a
                className="featured-link"
                href={assetUrl('/classroom/experience/')}
              >
                <span className="unit-icon tint-rose">
                  <UnitIcon name="game" />
                </span>
                <span className="featured-copy">
                  <span className="unit-title">遊戲體驗與發想</span>
                  <span className="unit-meta">5 個活動</span>
                </span>
                <ArrowUpRight
                  className="enter-arrow"
                  size={24}
                  aria-hidden="true"
                />
              </a>
              <span className="activity-toggle">
                <span className="toggle-label-closed">展開活動</span>
                <span className="toggle-label-open">收起活動</span>
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </summary>
            <div className="activity-content">
              <ol className="activity-list">
                {activities.map((activity, i) => (
                  <li key={activity.anchor}>
                    <a
                      href={assetUrl(
                        `/classroom/experience/#${activity.anchor}`,
                      )}
                    >
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {activity.title}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </details>

          <div className="unit-grid">
            {units.slice(1).map((unit) => (
              <a
                key={unit.slug}
                className={`unit-card card-${unit.color}`}
                href={assetUrl(`/classroom/${unit.slug}/`)}
              >
                <span className={`unit-icon tint-${unit.color}`}>
                  <UnitIcon name={unit.icon} />
                </span>
                <span className="unit-title">{unit.title}</span>
                <ArrowUpRight size={21} aria-hidden="true" />
              </a>
            ))}
          </div>
        </nav>
      </main>
      <footer className="course-footer">
        <span>破殼怪獸 · 遊戲設計</span>
        <span className="footer-line" />
      </footer>
    </>
  );
}
