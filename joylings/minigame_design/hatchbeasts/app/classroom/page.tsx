import { ArrowUpRight, ChevronDown, ClipboardList, Crosshair, FlaskConical, Gamepad2, Music2 } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { PUZZLE_PARTY_PUBLIC_URL, GAME_PUBLIC_URL, GAME_VERSION, RED_BLUE_GAME_PUBLIC_URL, WITCH_POTIONS_PUBLIC_URL, WOOD_EXIT_PUBLIC_URL, NEON_IMPACT_PUBLIC_URL } from '@/lib/release';
import { CourseHeader, UnitIcon } from './course-ui';
import { activities, potionChallenges, potionRetrospective, puzzlePartyRetrospective, redBlueQuestions, units } from './course-data';
import weaponQuestions from './red-blue-battle/weapon-questions.json';

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
            <div className="catalog-actions">
              <a className="course-button" href={assetUrl('/together-home/')} target="_blank" rel="noopener noreferrer">
                <Gamepad2 size={20} aria-hidden="true" />
                玩一起回家
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={NEON_IMPACT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Gamepad2 size={20} aria-hidden="true" />
                玩 Neon Impact
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={WOOD_EXIT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Gamepad2 size={20} aria-hidden="true" />
                玩木塊出走
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={WITCH_POTIONS_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <FlaskConical size={20} aria-hidden="true" />
                玩女巫藥水
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={PUZZLE_PARTY_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Gamepad2 size={20} aria-hidden="true" />
                玩合作挑戰遊戲
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={RED_BLUE_GAME_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Crosshair size={20} aria-hidden="true" />
                玩紅藍槍戰
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
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
              <a
                className="course-button catalog-rhythm-link"
                href={assetUrl('/rhythm/editor/')}
              >
                <Music2 size={20} aria-hidden="true" />
                製譜
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
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
                  <span className="unit-title"><span className="catalog-lesson-number">第一次課程</span>破殼怪獸</span>
                  <span className="unit-meta">遊戲體驗與發想 · {activities.length} 個活動</span>
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
          <div className="lesson-review-action">
            <a
              className="course-button"
              href={assetUrl('/classroom/experience/#retrospective')}
            >
              <ClipboardList size={20} aria-hidden="true" />
              第一堂課・課後復盤
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>

          <details className="featured-unit battle-catalog-unit">
            <summary className="featured-heading">
              <a className="featured-link" href={assetUrl('/classroom/red-blue-battle/')}>
                <span className="unit-icon tint-blue">
                  <Crosshair size={28} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="featured-copy">
                  <span className="unit-title"><span className="catalog-lesson-number">第二次課程</span>紅藍槍戰</span>
                  <span className="unit-meta">武器特色與新玩法 · 4 個發想問題</span>
                </span>
                <ArrowUpRight className="enter-arrow" size={24} aria-hidden="true" />
              </a>
              <span className="activity-toggle">
                <span className="toggle-label-closed">展開題目</span>
                <span className="toggle-label-open">收起題目</span>
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </summary>
            <div className="activity-content">
              <ol className="activity-list">
                {redBlueQuestions.map((question, index) => (
                  <li key={question.anchor}>
                    <a href={assetUrl(`/classroom/red-blue-battle/#${question.anchor}`)}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {question.text}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </details>

          <div className="lesson-review-action">
            <a
              className="course-button"
              href={assetUrl('/classroom/red-blue-battle/#retrospective')}
            >
              <ClipboardList size={20} aria-hidden="true" />
              第二堂課・課後復盤
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>

          <details className="featured-unit" id="third-course">
            <summary className="featured-heading">
              <a className="featured-link" href={assetUrl('/classroom/weapon-logic/')}>
                <span className="unit-icon tint-purple"><UnitIcon name="code" /></span>
                <span className="featured-copy">
                  <span className="unit-title"><span className="catalog-lesson-number">第三次課程</span>紅藍槍戰・武器邏輯</span>
                  <span className="unit-meta">15 題 · 完整題目與選項</span>
                </span>
                <ArrowUpRight className="enter-arrow" size={24} aria-hidden="true" />
              </a>
              <span className="activity-toggle">
                <span className="toggle-label-closed">展開題目與選項</span>
                <span className="toggle-label-open">收起題目與選項</span>
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </summary>
            <div className="activity-content">
              <ol className="activity-list weapon-catalog-list">
                {weaponQuestions.stages.flatMap((stage, stageIndex) => stage.questions.map((question, index) => (
                  <li key={`${stage.weapon}-${index}`}>
                    <a href={assetUrl(`/classroom/weapon-logic/#weapon-question-${stage.weapon}-${index + 1}`)}>
                      <span>{String(stageIndex * 3 + index + 1).padStart(2, '0')}</span>
                      {question.title}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                    {'context' in question && <p className="catalog-question-context">{question.context}</p>}
                    <ol className="catalog-question-options">
                      {question.options.map((option) => <li key={option}>{option}</li>)}
                    </ol>
                  </li>
                )))}
                <li><a href={assetUrl('/classroom/weapon-logic/#game-updates')}><span>★</span>解鎖與復活規則<ArrowUpRight size={16} aria-hidden="true" /></a></li>
              </ol>
            </div>
          </details>

          <div className="lesson-review-action">
            <a className="course-button" href={assetUrl('/classroom/weapon-logic/#retrospective')}>
              <ClipboardList size={20} aria-hidden="true" />
              第三堂課・課後復盤
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>

          <div className="featured-unit" id="fourth-course">
            <div className="featured-heading">
              <a className="featured-link" href={PUZZLE_PARTY_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-green"><Gamepad2 size={28} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="featured-copy">
                  <span className="unit-title"><span className="catalog-lesson-number">第四次課程</span>合作挑戰遊戲</span>
                  <span className="unit-meta">貼紙工廠・帶企鵝回家 · 各 20 關</span>
                  <span className="unit-meta">老師開房，學生選房加入 · 依加入順序自動編組</span>
                </span>
                <ArrowUpRight className="enter-arrow" size={24} aria-hidden="true" />
              </a>
            </div>
          </div>

          <details className="lesson-review-action" id="fourth-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第四堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <ol className="prompt-list">
              {puzzlePartyRetrospective.map((entry, index) => (
                <li key={entry.tag}>
                  <span className="prompt-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <span className="prompt-tag">{entry.tag}</span>
                    <p>{entry.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </details>

          <details className="featured-unit" id="fifth-course">
            <summary className="featured-heading">
              <a className="featured-link" href={WITCH_POTIONS_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-purple"><FlaskConical size={28} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="featured-copy">
                  <span className="unit-title"><span className="catalog-lesson-number">第 5 週課程</span>女巫的藥水訂單</span>
                  <span className="unit-meta">藥水 10 關 · 管理員 10 題</span>
                  <span className="unit-meta">兩人一組，調出魔法藥水</span>
                </span>
                <ArrowUpRight className="enter-arrow" size={24} aria-hidden="true" />
              </a>
              <span className="activity-toggle">
                <span className="toggle-label-closed">看關卡</span>
                <span className="toggle-label-open">收起</span>
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">第一關先試玩，第 5 關起進階，最後三關挑戰。</p>
              <div className="potion-teacher-links">
                <strong>老師試玩</strong>
                <p>女巫小提示：網址最後加 <code>?tip=true</code>，顯示提示與解法。<a href={`${WITCH_POTIONS_PUBLIC_URL}?tip=true`} target="_blank" rel="noopener noreferrer">開啟女巫提示 ↗</a></p>
                <p>成為管理員：網址最後加 <code>?gm=true</code>，直接進入 10 題。<a href={`${WITCH_POTIONS_PUBLIC_URL}?gm=true`} target="_blank" rel="noopener noreferrer">直接試玩管理員 ↗</a></p>
                <p>已有「?」時改用「&amp;」，例如 <code>?tip=true&amp;gm=true</code>。</p>
              </div>
              <ol className="activity-list weapon-catalog-list">
                {potionChallenges.map((challenge, index) => (
                  <li key={challenge.title}>
                    <a href={WITCH_POTIONS_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {challenge.title} · {challenge.customer}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                    <p className="catalog-question-context">杯子：{challenge.cups} 份 · 配方：{challenge.recipe}</p>
                  </li>
                ))}
              </ol>
            </div>
          </details>

          <details className="lesson-review-action" id="fifth-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第五堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <ol className="prompt-list">
              {potionRetrospective.map((entry, index) => (
                <li key={entry.tag}>
                  <span className="prompt-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <span className="prompt-tag">{entry.tag}</span>
                    <p>{entry.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </details>

          <section className="sixth-course" id="sixth-course" aria-labelledby="sixth-course-title">
            <h2 id="sixth-course-title">第 6 週課程</h2>
            <div className="sixth-game-choices">
              <a className="unit-card card-green" href={assetUrl('/together-home/')} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-green"><Gamepad2 size={28} aria-hidden="true" /></span>
                <span className="sixth-game-copy"><span className="unit-title">一起回家・雙人跳跳</span><span className="unit-meta">10 關合作挑戰：拿鑰匙，一起進門</span></span>
                <ArrowUpRight size={22} aria-hidden="true" />
              </a>
              <a className="unit-card card-green" href={WOOD_EXIT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-green"><Gamepad2 size={28} aria-hidden="true" /></span>
                <span className="sixth-game-copy"><span className="unit-title">木塊出走</span><span className="unit-meta">移開木塊，找到出口</span></span>
                <ArrowUpRight size={22} aria-hidden="true" />
              </a>
              <a className="unit-card card-blue" href={NEON_IMPACT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-blue"><Gamepad2 size={28} aria-hidden="true" /></span>
                <span className="sixth-game-copy"><span className="unit-title">Neon Impact</span><span className="unit-meta">選擇部位技能，一起連線對戰</span></span>
                <ArrowUpRight size={22} aria-hidden="true" />
              </a>
            </div>
          <div className="activity-content">
            <p className="catalog-question-context">狐狸用 A／D 移動、W 跳；兔子用 ←／→ 移動、↑ 跳。一起拿到鑰匙，再走進門。</p>
          </div>
          <details className="featured-unit current-course">
            <summary className="featured-heading">
              <a className="featured-link" href={WOOD_EXIT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-green"><Gamepad2 size={28} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="featured-copy">
                  <span className="unit-title">木塊出走・關卡與答案</span>
                  <span className="unit-meta">10 關挑戰 · 2 關隱藏關</span>
                  <span className="unit-meta">移開木塊，讓紅色木塊到出口</span>
                </span>
                <ArrowUpRight className="enter-arrow" size={24} aria-hidden="true" />
              </a>
              <span className="activity-toggle">
                <span className="toggle-label-closed">看關卡</span>
                <span className="toggle-label-open">收起</span>
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">第 1～3 關先試玩，第 4～7 關想想順序，第 8～10 關進階挑戰。完成前 10 關，解鎖第 11、12 關。</p>
              <p className="catalog-question-context">兩人一組：一人想順序，一人移木塊；過一關交換。</p>
              <div className="potion-teacher-links">
                <strong>老師答案版</strong>
                <p>網址最後加 <code>?tip=true</code>，開啟全部 12 關、木塊編號和目前盤面的解法。<a href={`${WOOD_EXIT_PUBLIC_URL}?tip=true`} target="_blank" rel="noopener noreferrer">開啟答案版 ↗</a></p>
                <p>已有「?」時改加 <code>&amp;tip=true</code>。移動或退一步後，答案會更新。</p>
              </div>
            </div>
          </details>
          </section>

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
        <span>遊戲設計 · 一起把點子做成遊戲</span>
        <span className="footer-line" />
      </footer>
    </>
  );
}
