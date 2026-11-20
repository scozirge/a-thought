import { ArrowUpRight, ChevronDown, ClipboardList, Crosshair, FlaskConical, Gamepad2, Music2, PencilRuler, Sprout } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { PUZZLE_PARTY_PUBLIC_URL, GAME_PUBLIC_URL, GAME_VERSION, RED_BLUE_GAME_PUBLIC_URL, WITCH_POTIONS_PUBLIC_URL, WOOD_EXIT_PUBLIC_URL, NEON_IMPACT_PUBLIC_URL, TOGETHER_ONLINE_PUBLIC_URL, LITTLE_ENGINEER_PUBLIC_URL, GARDEN_GUARD_PUBLIC_URL } from '@/lib/release';
import { CourseHeader, UnitIcon } from './course-ui';
import { activities, potionChallenges, potionRetrospective, puzzlePartyRetrospective, redBlueQuestions, units } from './course-data';
import weaponQuestions from './red-blue-battle/weapon-questions.json';

export const metadata = { title: '遊戲設計課｜課程目錄' };

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
              <a className="course-button" href={GARDEN_GUARD_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Sprout size={20} aria-hidden="true" />
                玩小小守園隊
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={LITTLE_ENGINEER_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <PencilRuler size={20} aria-hidden="true" />
                玩小小工程師
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="course-button" href={TOGETHER_ONLINE_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <Gamepad2 size={20} aria-hidden="true" />
                玩貓狗一起回家
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
                <p>成為管理員：網址最後加 <code>?gm=true</code>，直接進入 10 題。<a href={`${WITCH_POTIONS_PUBLIC_URL}?gm=true`} target="_blank" rel="noopener noreferrer">直接試玩管理員 ↗</a></p>
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
          <details className="featured-unit">
            <summary className="featured-heading">
              <a className="featured-link" href={WOOD_EXIT_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
                <span className="unit-icon tint-green"><Gamepad2 size={28} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="featured-copy">
                  <span className="unit-title">木塊出走</span>
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
            </div>
          </details>
          </section>

          <details className="lesson-review-action" id="sixth-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第六堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">木塊出走的難度較高，每個人的上手程度差異很大。</p>
              <p className="catalog-question-context">兩人一組時，有些小朋友沒辦法好好合作。有人只想自己解題，不太願意讓夥伴嘗試，這是這次最大的問題。</p>
              <p className="catalog-question-context">有人已經解完全部關卡時，其他進度也很快、但年紀較小的小朋友，仍會因為不甘心而生自己的氣。孩子之間有年齡差異，年紀小的其實也已經解得很快。</p>
              <p className="catalog-question-context">後續希望陪孩子培養抗壓力，減少與別人比較的心態，也練習有始有終地完成挑戰。</p>
            </div>
          </details>

          <section className="seventh-course" id="seventh-course" aria-labelledby="seventh-course-title">
            <h2 id="seventh-course-title">第 7 週課程</h2>
            <a className="unit-card card-green" href={TOGETHER_ONLINE_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
              <span className="unit-icon tint-green"><Gamepad2 size={28} aria-hidden="true" /></span>
              <span className="sixth-game-copy"><span className="unit-title">貓狗一起回家</span><span className="unit-meta">20 關雙人連線 · 手機搖桿</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
            <div className="activity-content">
              <p className="catalog-question-context">一人開房當貓咪，朋友用六位房號加入當狗狗。兩台電腦或手機都能玩；手機拖動搖桿移動、按跳躍，一起拿齊鑰匙回家。</p>
              <p className="catalog-question-context">先看貓狗相遇，再從第 0 關暖身。一起推連動箱子、開渡船、搭電梯；最後 5 關是大型挑戰，20 關全破後一起回家！</p>
            </div>
          </section>

          <details className="lesson-review-action" id="seventh-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第七堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">這次的主題是合作，遊戲機制要求兩個人一起協力。</p>
              <p className="catalog-question-context">對有些組別來說很成功，雙人合作的要求讓兩人都必須參與，也減少只有想掌控的人一直操作的情況。</p>
              <p className="catalog-question-context">有些能力不錯、但合作精神較不足的小朋友，仍會想嘗試一人完成，或一直指揮夥伴，沒有充分讓對方一起嘗試，有點可惜。</p>
              <p className="catalog-question-context">嘗試指導後，這些合作情況有改善。</p>
            </div>
          </details>

          <section className="eighth-course" id="eighth-course" aria-labelledby="eighth-course-title">
            <h2 id="eighth-course-title">第 8 週課程</h2>
            <a className="unit-card card-blue" href={LITTLE_ENGINEER_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
              <span className="unit-icon tint-blue"><PencilRuler size={28} aria-hidden="true" /></span>
              <span className="sixth-game-copy"><span className="unit-title">小小工程師</span><span className="unit-meta">上台說形狀，大家一起畫</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
            <div className="activity-content">
              <p className="catalog-question-context">上台的同學按「開房」，看著自己的題目，用一句話說出第一個形狀。其他人按「加入」，照著聽到的描述畫；晚一點進來也能一起畫。</p>
              <p className="catalog-question-context">出題者按「結束」後，全班一起看原圖和作品。出題者選出最相近的一張，大家說說哪一句描述讓你知道該畫在哪裡。</p>
            </div>
          </section>

          <details className="lesson-review-action" id="eighth-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第八堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">這次希望透過《小小工程師》，讓每個小朋友都有上台表達的機會，練習鼓起勇氣，把自己看到的造型說清楚。</p>
              <p className="catalog-question-context">有些小朋友一開始明顯抗拒上台，但經過鼓勵與溝通，最後都願意自己上台嘗試。有過第一次上台經驗的孩子，也比較敢再挑戰第二次。</p>
              <p className="catalog-question-context">有些孩子開始意識到，溝通時能不能正確、清楚地表達很重要，台下的提問也能幫助自己發現哪些資訊還沒說明白。描述與發問相互配合，才更容易讓大家理解同一個造型。</p>
              <p className="catalog-question-context">有些孩子會主動補充或修正描述中的細節；另一些孩子若沒有提醒，仍會反覆說出原本不完整的資訊，需要引導他們想想「還少說了什麼」，練習把訊息補完整。</p>
              <p className="catalog-question-context">整體效果不錯，是值得繼續延伸的活動設計。不過，維持課堂秩序也變得更困難。後續若延伸活動，需要一併思考如何安排發言與提問，讓上台的孩子能安心說明，台下也能專心聆聽。</p>
            </div>
          </details>

          <section className="ninth-course" id="ninth-course" aria-labelledby="ninth-course-title">
            <h2 id="ninth-course-title">第 9 週課程</h2>
            <a className="unit-card card-green" href={GARDEN_GUARD_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
              <span className="unit-icon tint-green"><Sprout size={28} aria-hidden="true" /></span>
              <span className="sixth-game-copy"><span className="unit-title">小小守園隊</span><span className="unit-meta">看盾牌方向，用金幣布置防線</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
            <div className="activity-content">
              <p className="catalog-question-context">兩人一組，一人猜蟲會走哪條路，另一人選一座塔、點草地蓋好，再按「開始」。看見整片盾牌閃白時，留意子彈從哪一邊飛來。</p>
              <p className="catalog-question-context">第一關看三個入口，讓前後兩排砲塔都打得到蟲。過關後交換工作，下一次只換一個位置。試試冰凍塔，看看變藍的蟲走多快，身上的數字有沒有變。</p>
              <p className="catalog-question-context">第 5 關開始有飛蟲，哪座塔能同時照顧天空和地面？第 8 關起也要守住上下入口。第 10 關試著用石牆留下兩個方向不同的缺口，讓蟲繞回火力最集中的地方。</p>
              <p className="catalog-question-context"><a href={`${GARDEN_GUARD_PUBLIC_URL}field-guide.mp4`} target="_blank" rel="noopener noreferrer">看實戰影片：7 座塔和 9 種蟲（1 分 29 秒）</a></p>
            </div>
          </section>

          <details className="lesson-review-action" id="ninth-course-retrospective">
            <summary className="course-button">
              <ClipboardList size={20} aria-hidden="true" />
              第九堂課・課後復盤
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="activity-content">
              <p className="catalog-question-context">這次的《小小守園隊》對小朋友來說太難了。塔蓋在哪一格，除了影響能打到哪些蟲，也會改變地面蟲往小屋走的路線。</p>
              <p className="catalog-question-context">想讓蟲多經過幾座塔，孩子得先想出一條繞路的走法，再推想：「如果我把塔蓋在這一格，蟲會從哪一邊繞過去？」</p>
              <p className="catalog-question-context">想出路線靠創意，判斷蟲會不會照那條路走則要用到邏輯。從這堂課來看，要孩子在決定塔位時同時做這兩件事，比單獨解邏輯題或自由創作，更難讓他們發揮。</p>
            </div>
          </details>

          <section className="tenth-course" id="tenth-course" aria-labelledby="tenth-course-title">
            <h2 id="tenth-course-title">第 10 週課程</h2>
            <a className="unit-card card-green" href={GARDEN_GUARD_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
              <span className="unit-icon tint-green"><Sprout size={28} aria-hidden="true" /></span>
              <span className="sixth-game-copy"><span className="unit-title">小小守園隊・一顆晶石給誰？</span><span className="unit-meta">兩人一組，選一座塔升級</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
            <div className="activity-content">
              <p className="catalog-question-context">照老師的圖蓋好第一關，守住城堡就能拿到一顆晶石。換手後，在下一關開始前按「升級」，點選一座塔。</p>
              <p className="catalog-question-context">先猜猜看：蟲離開火地後還會燒多久？換成震盪拳塔，同格的蟲會一起被推到哪裡？一人操作，一人盯著一隻蟲看，再把看到的結果告訴夥伴。</p>
            </div>
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
