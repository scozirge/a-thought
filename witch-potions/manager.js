(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PotionManager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const questions = [
    { id:'mix', title:'這樣倒進去會發生什麼事？', scene:'mix', choices:[
      {text:'杯裡變成',amounts:[[1,3],[0,2]]},
      {text:'不同原料不能倒入同一個杯子'},
      {text:'杯裡變成',amounts:[[1,5]]}
    ], answer:1, explanation:'不同原料，不能倒進同一杯。' },
    { id:'empty', title:'空杯倒過去，會變怎樣？', scene:'empty', choices:[
      {text:'沒有倒出藥水，原本仍是',amounts:[[0,2]]},
      {text:'原本的藥水變成',amounts:[[0,5]]},
      {text:'兩個杯子都變空杯'}
    ], answer:0, explanation:'空杯沒有藥水，兩杯都不會改變。' },
    { id:'full', title:'倒完後，兩杯各剩多少？', scene:'full', choices:[
      {cups:[{label:'大杯',amounts:[[0,2]]},{label:'小杯',amounts:[[0,5]]}]},
      {cups:[{label:'大杯',empty:true},{label:'小杯',amounts:[[0,7]]}]},
      {cups:[{label:'大杯',amounts:[[0,4]]},{label:'小杯',amounts:[[0,3]]}]}
    ], answer:2, explanation:'只倒入 1 份，大杯剩 4 份，小杯 3 份。' },
    { id:'recipe', title:'按「完成」會發生什麼事？', scene:'recipe', choices:[
      {text:'成功過關'},
      {text:'配方不對，杯子和大鍋清空'},
      {text:'自動變成客人要的配方'}
    ], answer:1, explanation:'每種份量都要對；配方不對就清空重試。' },
    { id:'pot', title:'以下哪個計算最符合操作的邏輯？', scene:'pot', choices:[
      {expression:{add:[0,2],inside:[[0,2],[1,1]]}},
      {expression:{add:[0,2],inside:[[0,1],[1,2]]}},
      {expression:{multiply:2,inside:[[0,1],[1,2]]}}
    ], answer:1, explanation:'杯裡的 2 份玫瑰露，加上鍋裡原本的配方。' },
    { id:'missing', title:'還要加入多少，才會剛剛好？', scene:'missing', choices:[
      {math:['2X + 3Y']},{math:['2X + 2Y']},{math:['3X + 2Y']}
    ], answer:1, explanation:'需要的減掉已經有的，還差 2X + 2Y。' },
    { id:'repeat', title:'做完後，鍋裡有多少？', scene:'repeat', choices:[
      {math:['3X + 2Y']},{math:['X + 6Y']},{math:['3X + 6Y']}
    ], answer:2, explanation:'做 3 次，每種原料都要算 3 次。' },
    { id:'capacity', title:'倒完後，兩杯各有多少？', scene:'capacity', choices:[
      {cups:[{label:'來源杯',amounts:[[0,2]]},{label:'接收杯',amounts:[[0,4]]}]},
      {cups:[{label:'來源杯',amounts:[[0,1]]},{label:'接收杯',amounts:[[0,5]]}]},
      {cups:[{label:'來源杯',empty:true},{label:'接收杯',amounts:[[0,6]]}]}
    ], answer:1, explanation:'只剩 3 份空間，倒入 3 份，來源杯剩 1 份。' },
    { id:'condition', title:'哪個規則才能確定配方正確？', scene:'condition', choices:[
      {math:['x+y=5']},{math:['x=3 或是 y=2']},{math:['x=3 且 y=2']}
    ], answer:2, explanation:'兩種份量都要對，才能過關。' },
    { id:'equations', title:'哪個算式最符合以上描述？', scene:'equations', choices:[
      {math:['X + Y = 5','Y − X = 1']},
      {math:['X − Y = 5','X + Y = 1']},
      {math:['X + Y = 5','X − Y = 1']}
    ], answer:2, explanation:'一共 5 份用加法；玫瑰露多 1 份，用 X − Y = 1。' }
  ];
  function unlocked(levels, completed) { return levels.length > 0 && levels.every(level => completed.includes(level.id)); }
  function correct(index, choice) { return !!questions[index] && questions[index].answer === choice; }
  function validProgress(value) { return Number.isInteger(value) && value >= 0 && value <= questions.length ? value : 0; }

  function mount({isUnlocked, getProgress, setProgress, onEnter, onExit, onLocked, icon, characterArt, bottleArt, potArt}) {
    const $ = id => document.getElementById(id);
    let active = false, locked = false, timer, questionIndex = 0;
    const badge = '<svg viewBox="0 0 120 130" aria-hidden="true"><path d="M60 6L108 24V66Q106 100 60 123Q14 100 12 66V24Z" fill="#eee1b2" stroke="#aa8648" stroke-width="5"/><path d="M60 26L70 48L95 51L77 68L82 94L60 81L38 94L43 68L25 51L50 48Z" fill="#76618a"/><path d="M48 60L57 69L74 49" fill="none" stroke="#fff9e7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function cup(amount, capacity, ingredient, label, id) {
      const height = 80 * amount / capacity;
      return `<div class="manager-vessel"><strong>${label}</strong><svg viewBox="0 0 120 130" aria-hidden="true"><defs><clipPath id="manager-cup-${id}"><path d="M25 25H95L88 110Q87 119 78 119H42Q33 119 32 110Z"/></clipPath></defs><path d="M25 25H95L88 110Q87 119 78 119H42Q33 119 32 110Z" fill="#f6f0f7" stroke="#a899b1" stroke-width="3"/><rect x="27" y="${116-height}" width="66" height="${height}" fill="${['#ce577b','#dfb24f','#80b497'][ingredient]}" clip-path="url(#manager-cup-${id})"/><path d="M39 38L43 98" stroke="white" stroke-width="4" stroke-linecap="round"/></svg><span>${amount ? icon(ingredient) + ` ${amount} 份` : '空杯'}</span></div>`;
    }
    const arrow = '<span class="manager-arrow" aria-label="倒向">→</span>';
    function variableKey(counts = false, lowercase = false) {
      const labels = lowercase ? ['x','y'] : ['X','Y'];
      return `<div class="manager-variable-key"><span><b>${labels[0]}</b>＝${icon(0)} ${counts ? '玫瑰露的份數' : '1 份玫瑰露'}</span><span><b>${labels[1]}</b>＝${icon(1)} ${counts ? '月光水的份數' : '1 份月光水'}</span></div>`;
    }
    function scene(type) {
      if(type === 'missing') return `${variableKey()}<div class="manager-math-cards"><div><strong>客人要</strong><b>4X + 3Y</b></div><div><strong>鍋裡有</strong><b>2X + Y</b></div></div>`;
      if(type === 'repeat') return `${variableKey()}<div class="manager-story"><p>從空鍋開始</p><p>每次加入 <b>X + 2Y</b></p><p>重複 <b>3 次</b></p></div>`;
      if(type === 'capacity') return `${cup(4,5,0,'來源杯','capacity-a')}${arrow}${cup(2,5,0,'接收杯・5 份杯','capacity-b')}`;
      if(type === 'condition') return `${variableKey(true,true)}<div class="manager-story"><p>客人要</p><div class="manager-pot-contents">${amountsMarkup([[0,3],[1,2]])}</div></div>`;
      if(type === 'equations') return `${variableKey(true)}<div class="manager-story"><p>兩種原料一共 <b>5 份</b></p><p>玫瑰露比月光水多 <b>1 份</b></p></div>`;
      if(type === 'mix') return `<div class="manager-vessel"><strong>月光水</strong><div class="manager-source manager-pour-source">${bottleArt(1)}</div></div>${arrow}${cup(2,5,0,'5 份杯','mix')}`;
      if(type === 'empty') return `${cup(0,3,0,'3 份杯','empty-a')}${arrow}${cup(2,5,0,'5 份杯','empty-b')}`;
      if(type === 'full') return `${cup(5,5,0,'5 份杯','full-a')}${arrow}${cup(2,3,0,'3 份杯','full-b')}`;
      if(type === 'recipe') return `<div class="manager-recipe"><strong>客人要</strong><span>${icon(0)} × 3</span><span>${icon(1)} × 2</span></div><span class="manager-arrow">≟</span><div class="manager-recipe"><strong>鍋裡有</strong><span>${icon(0)} × 4</span><span>${icon(1)} × 1</span></div>`;
      if(type === 'pot') return `<div class="manager-variable-key"><span><b>X</b>＝${icon(0)} 1 份玫瑰露</span><span><b>Y</b>＝${icon(1)} 1 份月光水</span></div><div class="manager-pot-operation">${cup(2,3,0,'3 份杯','pot')}${arrow}<div class="manager-vessel manager-pot"><strong>大鍋</strong>${potArt({pot:[1,2,0]})}<div class="manager-pot-contents">${amountsMarkup([[0,1],[1,2]])}</div></div></div><div class="manager-pot-result"><strong>倒入後</strong><span class="manager-amount">3X ＋ 2Y</span></div>`;
      return '';
    }
    function refresh() {
      const available = isUnlocked();
      $('manager-entry').dataset.locked = String(!available);
      $('manager-entry-lock').toggleAttribute('hidden',available);
      $('manager-entry-status').textContent = !available ? '尚未解鎖' : getProgress() === questions.length ? '✓ 已完成' : '開始 →';
      $('manager-entry').classList.toggle('is-unlocked', available);
    }
    function focusTitle() { $('manager-title').focus({preventScroll:true}); }
    function amountsMarkup(amounts) {
      return amounts.map(([ingredient,amount])=>`<span class="manager-amount">${icon(ingredient)} × ${amount}</span>`).join('<span class="manager-plus" aria-label="加">＋</span>');
    }
    function choiceMarkup(choice) {
      if(choice.math) return `<span class="manager-math-lines">${choice.math.map(line=>`<span>${line}</span>`).join('')}</span>`;
      if(choice.expression) {
        const expression = choice.expression;
        const term = ([ingredient,amount]) => `<span class="manager-amount">${amount}${['X','Y'][ingredient]}</span>`;
        const start = expression.add ? term(expression.add) + '<span>＋</span>' : `<span>${expression.multiply} ×</span>`;
        return `<span class="manager-expression">${start}<span class="manager-expression-group"><span>(</span>${expression.inside.map(term).join('<span>＋</span>')}<span>)</span></span></span>`;
      }
      if(choice.cups) return choice.cups.map(cup=>`<span class="manager-choice-cup"><span>${cup.label}</span>${cup.empty ? '空杯' : amountsMarkup(cup.amounts)}</span>`).join('');
      return `<span>${choice.text}</span>${choice.amounts ? amountsMarkup(choice.amounts) : ''}`;
    }
    function showQuestion() {
      clearTimeout(timer); locked = false;
      $('manager-intro').hidden = true;
      $('manager-finish').hidden = true;
      $('manager-quiz').hidden = false;
      const q = questions[questionIndex];
      $('manager-progress').textContent = `${questionIndex + 1} / ${questions.length}`;
      $('manager-question').textContent = q.title;
      $('manager-scene').innerHTML = scene(q.scene);
      $('manager-scene').classList.toggle('is-pot-question',['pot','missing','repeat','condition','equations'].includes(q.scene));
      $('manager-quiz').classList.toggle('is-description-question',q.scene === 'equations');
      $('manager-feedback').textContent = '';
      $('manager-feedback').className = 'manager-feedback';
      $('manager-choices').innerHTML = q.choices.map((choice,i)=>`<button type="button" class="manager-choice" data-choice="${i}"><span class="manager-choice-number">${i+1}</span><span class="manager-choice-content">${choiceMarkup(choice)}</span></button>`).join('');
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
      if(!isUnlocked()) { onLocked(); return; }
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
