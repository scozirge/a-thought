import weaponQuestions from './red-blue-battle/weapon-questions.json';

export function WeaponChallenges() {
  return (
    <section
      id="weapon-challenges"
      className="lesson-section"
      aria-labelledby="weapon-challenges-title"
    >
      <div className="lesson-section-heading">
        <h2 id="weapon-challenges-title">武器邏輯挑戰</h2>
      </div>
      <p className="section-note">
        每次死亡挑戰一題，答對拿一個徽章。每集滿 3
        個，就解鎖下一把武器！答錯下次再挑戰同一題。
      </p>
      <p>手槍 → 菜刀 → 火箭筒 → 毒藥 → 加特林 → 核彈</p>
      <p className="section-note">
        每次復活預設拿最近解鎖的武器。核彈解鎖後不再出題。離開房間後，進度重新開始。手機的「射擊按鈕」就是題目中的「滑鼠左鍵」。
      </p>
      <div id="game-updates">
        <p className="section-note">
          題目下方有解鎖提示。答對一題就填滿一顆星，三顆星全滿就顯示解鎖的新武器。看完結果按「繼續」，再選武器、等倒數復活。
        </p>
        <p className="section-note">
          每次死亡都先選好最近解鎖的武器；還沒解鎖就拿手槍。倒數時可改選手槍或其他已解鎖武器，只影響這次復活。場上撿到的槍不列入復活選單。
        </p>
        <p className="section-note">
          <strong>新版玩法：</strong>
          菜刀、火箭筒、毒藥、加特林和核彈，只能答題解鎖後在復活時取得，場地上不會出現。場上仍可撿步槍、散彈槍和狙擊槍。
        </p>
        <p className="section-note">
          電腦玩家會分散走不同路線，靠得太近時會讓開，看到敵人也會稍微快一點開火。試著觀察：為什麼隊友不要全部擠在同一條路？
        </p>
        <p className="section-note">
          想先認識武器，可以進入訓練場，用「更換武器」選單自由試用；回到對戰房間，仍要依序答題解鎖。
        </p>
      </div>
      {weaponQuestions.stages.map((stage) => (
        <div
          id={`weapon-stage-${stage.weapon}`}
          key={stage.weapon}
          className="weapon-question-group"
        >
          <h3>
            {stage.name}的 3 題 → 解鎖{stage.reward}
          </h3>
          {stage.questions.map((question, index) => (
            <article
              id={`weapon-question-${stage.weapon}-${index + 1}`}
              className="battle-question"
              key={question.title}
            >
              <div className="weapon-question-content">
                <h4>
                  第 {index + 1} 題｜{question.title}
                </h4>
                {'context' in question && <p>{question.context}</p>}
                <ol>
                  {question.options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ol>
                <details>
                  <summary>看答案與說明</summary>
                  <p>
                    <strong>答案：{question.answer + 1}。</strong>
                    {question.explanation}
                  </p>
                </details>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
