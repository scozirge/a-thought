(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PotionManager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const questions = [
    { id:'mix', title:'這樣可以倒嗎？', scene:'mix', choices:['可以，全部倒進去','不行，杯裡的原料不同','搖一搖就可以'], answer:1, explanation:'不同原料，不能倒進同一杯。' },
    { id:'empty', title:'空杯能倒出藥水嗎？', scene:'empty', choices:['不能，杯裡沒有藥水','可以，藥水會自己出現'], answer:0, explanation:'杯子是空的，就不能倒。' },
    { id:'full', title:'要在哪裡停？', scene:'full', choices:['把大杯全部倒完','一直倒，讓藥水流出來','小杯滿了就停'], answer:2, explanation:'小杯只剩 1 份空間，裝滿就停。' },
    { id:'recipe', title:'怎樣才算完成？', scene:'recipe', choices:['總共 5 份就好','每種原料的份量都要對','顏色好看就可以'], answer:1, explanation:'總量一樣，每種原料也要對。' },
    { id:'save', title:'換到別關，要留下什麼？', scene:'save', choices:['杯子裡的藥水','大鍋裡的藥水','通關的勾勾'], answer:2, explanation:'留下通關勾勾，杯子和大鍋清空。' }
  ];
  function unlocked(levels, completed) { return levels.length > 0 && levels.every(level => completed.includes(level.id)); }
  function correct(index, choice) { return !!questions[index] && questions[index].answer === choice; }
  function validProgress(value) { return Number.isInteger(value) && value >= 0 && value <= questions.length ? value : 0; }

  function mount({isUnlocked, getProgress, setProgress, onEnter, onExit, icon, characterArt}) {
    const $ = id => document.getElementById(id);
    let active = false, locked = false, timer, questionIndex = 0;
    const badge = '<svg viewBox="0 0 120 130" aria-hidden="true"><path d="M60 6L108 24V66Q106 100 60 123Q14 100 12 66V24Z" fill="#eee1b2" stroke="#aa8648" stroke-width="5"/><path d="M60 26L70 48L95 51L77 68L82 94L60 81L38 94L43 68L25 51L50 48Z" fill="#76618a"/><path d="M48 60L57 69L74 49" fill="none" stroke="#fff9e7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function cup(amount, capacity, ingredient, label, id) {
      const height = 80 * amount / capacity;
      return `<div class="manager-vessel"><strong>${label}</strong><svg viewBox="0 0 120 130" aria-hidden="true"><defs><clipPath id="manager-cup-${id}"><path d="M25 25H95L88 110Q87 119 78 119H42Q33 119 32 110Z"/></clipPath></defs><path d="M25 25H95L88 110Q87 119 78 119H42Q33 119 32 110Z" fill="#f6f0f7" stroke="#a899b1" stroke-width="3"/><rect x="27" y="${116-height}" width="66" height="${height}" fill="${['#ce577b','#dfb24f','#80b497'][ingredient]}" clip-path="url(#manager-cup-${id})"/><path d="M39 38L43 98" stroke="white" stroke-width="4" stroke-linecap="round"/></svg><span>${amount ? icon(ingredient) + ` ${amount} 份` : '空杯'}</span></div>`;
    }
    const arrow = '<span class="manager-arrow" aria-label="倒向">→</span>';
    function scene(type) {
      if(type === 'mix') return `<div class="manager-vessel"><strong>月光水</strong><div class="manager-source">${icon(1)}</div></div>${arrow}${cup(2,5,0,'5 份杯','mix')}`;
      if(type === 'empty') return `${cup(0,3,0,'3 份杯','empty-a')}${arrow}${cup(0,5,0,'5 份杯','empty-b')}`;
      if(type === 'full') return `${cup(5,5,0,'5 份杯','full-a')}${arrow}${cup(2,3,0,'3 份杯','full-b')}`;
      if(type === 'recipe') return `<div class="manager-recipe"><strong>客人要</strong><span>${icon(0)} × 3</span><span>${icon(1)} × 2</span></div><span class="manager-arrow">≟</span><div class="manager-recipe"><strong>鍋裡有</strong><span>${icon(0)} × 4</span><span>${icon(1)} × 1</span></div>`;
      return `${cup(2,5,0,'✓ 已通關','save')}<span class="manager-arrow"><small>換關</small>→</span><div class="manager-mystery" aria-label="下一關">？</div>`;
    }
    function refresh() {
      const available = isUnlocked();
      $('manager-entry').disabled = !available;
      $('manager-entry-status').textContent = !available ? '10 關後開放' : getProgress() === questions.length ? '✓ 已完成' : '開始 →';
      $('manager-entry').classList.toggle('is-unlocked', available);
    }
    function focusTitle() { $('manager-title').focus({preventScroll:true}); }
    function showQuestion() {
      clearTimeout(timer); locked = false;
      $('manager-intro').hidden = true;
      $('manager-finish').hidden = true;
      $('manager-quiz').hidden = false;
      const q = questions[questionIndex];
      $('manager-progress').textContent = `${questionIndex + 1} / ${questions.length}`;
      $('manager-question').textContent = q.title;
      $('manager-scene').innerHTML = scene(q.scene);
      $('manager-feedback').textContent = '';
      $('manager-feedback').className = 'manager-feedback';
      $('manager-choices').innerHTML = q.choices.map((text,i)=>`<button type="button" class="manager-choice" data-choice="${i}"><span>${i+1}</span>${text}</button>`).join('');
      $('manager-question').focus({preventScroll:true});
    }
    function finish() {
      $('manager-intro').hidden = true; $('manager-quiz').hidden = true; $('manager-finish').hidden = false;
      $('manager-award').innerHTML = badge;
      $('manager-finish-title').focus({preventScroll:true});
      refresh();
    }
    function afterIntro() {
      if(!active) return;
      questionIndex = validProgress(getProgress());
      if(questionIndex === questions.length) finish(); else showQuestion();
    }
    function open() {
      if(!isUnlocked()) return;
      clearTimeout(timer); locked = false; active = true;
      onEnter();
      document.querySelector('.shop-floor').hidden = true;
      $('witch-hints').hidden = true;
      $('manager-panel').hidden = false;
      $('manager-quiz').hidden = true; $('manager-finish').hidden = true; $('manager-intro').hidden = false;
      $('manager-hero').innerHTML = characterArt('wizard','youth') + `<div class="manager-badge">${badge}</div>`;
      $('manager-subtitle').textContent = '你現在是遊戲管理員';
      $('manager-subtitle').classList.remove('second-line');
      $('manager-panel').scrollIntoView({block:'start'}); focusTitle();
      timer = setTimeout(()=>{
        if(!active) return;
        $('manager-subtitle').textContent = '現在幫忙選出對的遊戲規則吧';
        $('manager-subtitle').classList.add('second-line');
        timer = setTimeout(afterIntro,2800);
      },2200);
    }
    function close() {
      if(!active) return;
      clearTimeout(timer); active = false; locked = false;
      $('manager-panel').hidden = true;
      document.querySelector('.shop-floor').hidden = false;
      onExit();
    }
    $('manager-entry').addEventListener('click',open);
    $('manager-back').addEventListener('click',()=>{close();$('manager-entry').focus();});
    $('manager-finish-back').addEventListener('click',()=>{close();$('manager-entry').focus();});
    $('manager-replay').addEventListener('click',()=>{questionIndex=0;showQuestion();});
    $('manager-choices').addEventListener('click',event=>{
      const button = event.target.closest('[data-choice]');
      if(!active || locked || !button || button.disabled) return;
      const choice = Number(button.dataset.choice);
      if(!correct(questionIndex,choice)) {
        button.classList.add('is-wrong');
        $('manager-feedback').textContent = '再想一想！';
        $('manager-feedback').className = 'manager-feedback is-wrong';
        return;
      }
      locked = true; button.classList.add('is-correct');
      $('manager-choices').querySelectorAll('button').forEach(item=>item.disabled=true);
      $('manager-feedback').textContent = '✓ ' + questions[questionIndex].explanation;
      $('manager-feedback').className = 'manager-feedback is-correct';
      questionIndex++;
      setProgress(Math.max(getProgress(),questionIndex));
      refresh();
      timer = setTimeout(()=>{if(active) { if(questionIndex === questions.length) finish(); else showQuestion(); }},1800);
    });
    refresh();
    return {open,close,refresh};
  }
  return {questions,unlocked,correct,validProgress,mount};
});
