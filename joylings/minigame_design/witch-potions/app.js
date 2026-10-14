(function () {
  'use strict';
  const G = window.Potions;
  const $ = id => document.getElementById(id);
  const colors = ['#ce577b', '#d9ac47', '#559173'];
  const pale = ['#f4c8d7', '#f5e4ad', '#c8e4d1'];
  const storageKey = 'witch-potions-v1';
  const showTips = new URLSearchParams(window.location.search).get('tip') === 'true';
  const directManager = new URLSearchParams(window.location.search).get('gm') === 'true';
  let previewManagerProgress = 0;
  const M = window.PotionManager;
  let managerProgress = 0;
  let managerController;
  let current = 0;
  let games = G.levels.map(() => []);
  let completed = [];
  let selection = null;
  let state = G.initial(G.levels[current]);
  let animationTimer;
  let busy = false;
  let pointer = { x: 0, y: 0, mouse: false, inside: false };
  let flightAnimations = [];

  function ingredientMark(i) {
    return [
      '<path d="M20 23V38M20 33Q6 32 9 24Q19 24 20 33M20 29Q32 29 33 21Q22 21 20 29" fill="#659568" stroke="#659568" stroke-width="2"/><path d="M20 4C9 -1 1 12 8 20C4 27 16 31 21 26C30 30 38 20 33 14C36 6 27 0 20 4Z" fill="#ce577b"/><path d="M12 12Q20 4 28 12Q32 21 21 23Q11 23 12 14Q19 10 25 15Q27 20 20 19" fill="none" stroke="#ffe0e8" stroke-width="2.3" stroke-linecap="round"/>',
      '<path d="M28 3C9 -2 -2 20 10 33C22 45 39 34 39 22C22 29 15 12 28 3Z" fill="#e4b95b" stroke="#ae8036" stroke-width="1.3"/><path d="M33 2L35 7L40 9L35 11L33 16L31 11L26 9L31 7Z" fill="#f1d58c"/>',
      '<path d="M7 21C7 0 33 0 33 21L36 36L28 32L21 37L14 32L5 36Z" fill="#8abe9a" stroke="#4a8565" stroke-width="2"/><ellipse cx="15" cy="19" rx="3" ry="4" fill="#365d50"/><ellipse cx="26" cy="19" rx="3" ry="4" fill="#365d50"/><path d="M17 27Q21 30 25 26" fill="none" stroke="#365d50" stroke-width="2" stroke-linecap="round"/>'
    ][i];
  }
  function icon(i) {
    return `<span class="ingredient-icon" role="img" aria-label="${G.ingredients[i].name}" title="${G.ingredients[i].name}"><svg viewBox="0 0 42 42" aria-hidden="true">${ingredientMark(i)}</svg></span>`;
  }
  function iconText(text) {
    return G.ingredients.reduce((value, ingredient, i) => value.replaceAll(ingredient.name, icon(i)), text);
  }
  function recipeMarkup(amounts, showZero = false) {
    return amounts.map((amount, i) => amount || showZero ? `<span class="recipe-term tone-${i}" aria-label="${G.ingredients[i].name} ${amount} 份">${icon(i)}<b>× ${amount}</b></span>` : '').filter(Boolean).join('<span class="recipe-plus" aria-hidden="true">＋</span>');
  }
  function potionEffect(type) {
    return {
      love: '<g fill="#d96990"><path d="M43 29C20 11 34 0 44 11C57 -1 69 14 43 29Z"/><path d="M94 22C78 9 88 0 96 7C105 -1 115 9 94 22Z"/><path d="M76 43C61 30 70 23 77 29C85 21 94 32 76 43Z"/></g>',
      poison: '<path d="M72 39V13" stroke="#69894d" stroke-width="4"/><path d="M72 27Q40 26 48 7Q69 7 72 27M72 19Q101 18 97 1Q77 1 72 19" fill="#9ab867"/>',
      frog: '<g fill="#8cae6b" stroke="#57784d" stroke-width="2"><ellipse cx="72" cy="25" rx="25" ry="16"/><circle cx="58" cy="11" r="9"/><circle cx="85" cy="11" r="9"/></g><circle cx="58" cy="11" r="3" fill="#3e5141"/><circle cx="85" cy="11" r="3" fill="#3e5141"/><path d="M62 28Q72 36 83 28" fill="none" stroke="#57784d" stroke-width="2"/>',
      cat: '<path d="M48 17L48 0L63 10Q72 6 81 10L96 0L96 21Q94 41 72 41Q50 41 48 17Z" fill="#554765"/><ellipse cx="62" cy="23" rx="4" ry="6" fill="#efd18c"/><ellipse cx="83" cy="23" rx="4" ry="6" fill="#efd18c"/><path d="M69 31H75L72 34Z" fill="#eeb6bf"/>',
      glow: '<g stroke="#b78a30" stroke-width="3" stroke-linecap="round"><path d="M72 1V6M72 36V41M48 21H53M91 21H96M55 5L59 9M85 33L89 37M55 37L59 33M85 9L89 5"/><circle cx="72" cy="21" r="11" fill="#f6d56e"/></g>',
      float: '<path d="M69 35Q36 32 32 6Q49 11 65 10L72 20L79 10Q95 11 112 6Q108 32 75 35" fill="#e4d9fa" stroke="#9d80ba" stroke-width="2"/><path d="M44 17L62 22M48 25L62 27M100 17L82 22M96 25L82 27" stroke="#9d80ba" stroke-width="2" stroke-linecap="round"/>',
      rainbow: '<g fill="none" stroke-width="6"><path d="M40 38A32 32 0 0 1 104 38" stroke="#d87f9c"/><path d="M46 38A26 26 0 0 1 98 38" stroke="#e8c26b"/><path d="M52 38A20 20 0 0 1 92 38" stroke="#86b99a"/><path d="M58 38A14 14 0 0 1 86 38" stroke="#a48cc1"/></g>',
      invisible: '<path d="M53 35V20C53 -2 91 -2 91 20V35L82 31L72 38L62 31Z" fill="#efeaf7" fill-opacity=".45" stroke="#9b87b4" stroke-width="2" stroke-dasharray="4 4"/><circle cx="64" cy="19" r="2" fill="#9b87b4"/><circle cx="80" cy="19" r="2" fill="#9b87b4"/>',
      galaxy: '<path d="M69 2L73 14L86 15L76 23L79 36L69 29L58 36L62 23L52 15L65 14Z" fill="#efd279" stroke="#b69448" stroke-width="1.5"/><path d="M104 4C87 2 85 27 104 28C95 21 95 11 104 4Z" fill="#ada2da"/><circle cx="39" cy="29" r="3" fill="#d6b66f"/><circle cx="111" cy="37" r="2" fill="#d6b66f"/>',
      dragon: '<path d="M47 13L44 0L61 9M88 9L104 0L99 18" fill="#e9c87f" stroke="#6b9071" stroke-width="2"/><path d="M50 12Q73 -1 97 12L103 31Q94 44 72 43Q48 43 43 30Z" fill="#9cc798" stroke="#6b9071" stroke-width="2"/><ellipse cx="60" cy="22" rx="3" ry="5" fill="#405746"/><ellipse cx="86" cy="22" rx="3" ry="5" fill="#405746"/><path d="M65 32Q74 39 83 32" fill="none" stroke="#405746" stroke-width="2"/><path d="M109 34Q123 17 119 9Q138 29 123 40Z" fill="#e8a45e"/>'
      ,dream: '<path d="M79 1C54 -2 44 28 64 39C80 47 97 38 100 25C78 35 66 15 79 1Z" fill="#d6c3ec" stroke="#9982b3" stroke-width="1.8"/><path d="M105 4L108 11L115 14L108 17L105 24L102 17L95 14L102 11Z" fill="#e9cd84"/>',
      mermaid: '<path d="M57 1Q59 19 76 23Q91 32 75 42Q60 36 61 27Q47 17 49 4Z" fill="#8ac9b5" stroke="#539b93" stroke-width="2"/><path d="M76 29Q88 15 102 21Q98 35 79 38Q70 47 54 43Q58 29 76 29Z" fill="#8ac9b5" stroke="#539b93" stroke-width="2"/>',
      honesty: '<path d="M46 5H99Q108 5 108 14V28Q108 37 99 37H73L61 45V37H46Q38 37 38 28V14Q38 5 46 5Z" fill="#eef5e8" stroke="#739c72" stroke-width="2"/><path d="M58 20L68 29L87 12" fill="none" stroke="#739c72" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
      youth: '<path d="M71 40V19" stroke="#71975c" stroke-width="3"/><path d="M71 27Q42 28 44 8Q68 6 71 27M72 20Q77 -1 102 4Q100 26 72 26" fill="#a3c98a" stroke="#71975c" stroke-width="2"/><path d="M42 39Q23 14 43 2M36 2H45V12" fill="none" stroke="#cfab64" stroke-width="2.5" stroke-linecap="round"/>'
    }[type];
  }
  function potionArt(type) {
    const effect = potionEffect(type);
    const liquid={love:'#d987a7',poison:'#a1ad67',frog:'#82b894',cat:'#9183b8',glow:'#eac567',float:'#b9a4db',rainbow:'#d894b6',invisible:'#d1c9df',galaxy:'#8273b5',dragon:'#8db682',dream:'#b4a0d0',mermaid:'#79bfb1',honesty:'#9ab58a',youth:'#a9c888'}[type];
    return `<svg viewBox="0 0 145 155" aria-hidden="true"><ellipse cx="72" cy="146" rx="41" ry="5" fill="#d9cddc" opacity=".5"/><path d="M60 51H84V72Q113 88 110 119Q109 143 88 143H57Q35 143 34 121Q31 88 60 72Z" fill="#f7f1ff" stroke="#9684a2" stroke-width="2.5"/><path d="M40 102Q72 96 105 102V120Q103 138 87 138H57Q41 138 40 120Z" fill="${liquid}"/><ellipse cx="72" cy="103" rx="32" ry="5" fill="${liquid}"/><rect x="57" y="47" width="30" height="12" rx="4" fill="#b89a78"/><path d="M48 92L55 84M45 101V116" stroke="white" stroke-width="5" stroke-linecap="round"/>${effect}</svg>`;
  }

  const levelSignature = level => JSON.stringify([level.capacities, level.recipe]);
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 3, signatures: G.levels.map(levelSignature), current, games, completed, manager: { version: 1, answered: managerProgress } })); } catch (_) { /* The game also works when browser storage is unavailable. */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      if (!data || ![1, 2, 3].includes(data.version)) return;
      const compatible = (level, i) => data.version === 3 ? data.signatures?.[i] === levelSignature(level) : data.version === 2 ? i < 3 : i === 1 || i === 2;
      if (Number.isInteger(data.current) && data.current >= 0 && data.current < G.levels.length) current = data.current;
      completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(id => G.levels.some((level, i) => level.id === id && compatible(level, i))))] : [];
      managerProgress = M.unlocked(G.levels,completed) && data.manager?.version === 1 ? M.validProgress(data.manager.answered) : 0;
      if (Array.isArray(data.games)) data.games.slice(0, G.levels.length).forEach((actions, i) => {
        if (!compatible(G.levels[i], i) || !Array.isArray(actions) || actions.length > 5000) return;
        try { G.replay(G.levels[i], actions); games[i] = actions; } catch (_) { /* Ignore an incompatible draft. */ }
      });
      save();
    } catch (_) { /* Start fresh if saved data cannot be read. */ }
  }

  function characterArt(type, result) {
    let portrait = '';
    if (result === 'cat') {
      portrait = '<path d="M137 142 Q181 130 157 108" fill="none" stroke="#51465e" stroke-width="16" stroke-linecap="round"/><ellipse cx="101" cy="137" rx="37" ry="29" fill="#51465e"/><path d="M60 79 L62 43 L87 59 Q101 52 116 58 L140 43 L141 89 Q139 121 101 124 Q62 121 60 79" fill="#51465e"/><path d="M71 59 L72 79 L83 68 M129 59 L117 68 L131 79" fill="#b48699"/><ellipse cx="83" cy="88" rx="8" ry="11" fill="#e5c16f"/><ellipse cx="119" cy="88" rx="8" ry="11" fill="#e5c16f"/><path d="M83 81V94 M119 81V94" stroke="#51465e" stroke-width="3"/><path d="M97 101 L105 101 L101 106Z" fill="#dfa8b5"/><ellipse cx="101" cy="47" rx="25" ry="16" fill="#d79757"/><path d="M103 32Q99 22 110 20" fill="none" stroke="#6f8a5d" stroke-width="6" stroke-linecap="round"/>';
    } else if (type === 'owl') {
      const eyes = result === 'dream' ? '<path d="M64 90Q78 102 91 90M111 90Q124 102 138 90" fill="none" stroke="#675365" stroke-width="4" stroke-linecap="round"/>' : '<circle cx="78" cy="88" r="9" fill="#675365"/><circle cx="124" cy="88" r="9" fill="#675365"/><circle cx="81" cy="84" r="3" fill="white"/><circle cx="127" cy="84" r="3" fill="white"/>';
      portrait = '<path d="M65 148L59 166M79 150L76 167M123 150L125 167M137 149L142 166" stroke="#bd9566" stroke-width="6" stroke-linecap="round"/><ellipse cx="101" cy="116" rx="50" ry="47" fill="#a88a76"/><path d="M49 86L48 32L82 51Q101 42 121 51L153 32L154 87Q157 137 101 140Q45 137 49 86Z" fill="#b59a83"/><ellipse cx="77" cy="88" rx="29" ry="34" fill="#f4e9cd"/><ellipse cx="125" cy="88" rx="29" ry="34" fill="#f4e9cd"/>'+eyes+'<path d="M93 103L102 115L110 103Z" fill="#d0a25c"/>'+(result === 'dream' ? '<rect x="67" y="133" width="69" height="27" rx="10" fill="#c6b5d7"/>' : '<path d="M53 110Q34 141 66 149M149 111Q168 140 139 149" fill="#927866"/>');
    } else if (type === 'sailor') {
      const outfit = result === 'mermaid' ? '<path d="M77 126Q121 115 124 140Q118 153 141 159Q139 172 119 169Q89 178 82 160Q94 149 77 126Z" fill="#81bfad" stroke="#559b93" stroke-width="2.5"/><path d="M133 155Q160 142 172 152Q164 170 141 166Q119 181 107 169Q118 153 133 155Z" fill="#9fd6c1" stroke="#559b93" stroke-width="2"/>' : '<path d="M62 132Q100 116 140 132L148 166H53Z" fill="#f3eee1"/><path d="M60 146H142M55 159H147" stroke="#7a9eb4" stroke-width="6"/>';
      portrait = outfit+'<ellipse cx="101" cy="85" rx="41" ry="44" fill="#e8c5a6"/><path d="M61 76Q54 34 99 35Q142 35 144 76L128 66L120 57Q93 79 65 66Z" fill="#94725d"/><circle cx="85" cy="86" r="4" fill="#544857"/><circle cx="119" cy="86" r="4" fill="#544857"/><path d="M91 107Q102 116 113 105" fill="none" stroke="#ac786b" stroke-width="3" stroke-linecap="round"/><path d="M65 50Q46 19 84 23Q99 8 120 23Q156 19 140 50Z" fill="#f7f1e4" stroke="#8c9aaa" stroke-width="2"/><path d="M65 48H140" stroke="#648ca7" stroke-width="10"/><path d="M87 128L100 147L113 128M100 142L111 162" fill="#c8797d"/>';
    } else if (type === 'slime') {
      portrait = '<ellipse cx="101" cy="166" rx="55" ry="5" fill="#bed3c4"/><path d="M48 113Q48 57 84 60Q89 37 102 41Q115 45 116 61Q151 65 157 112Q168 158 139 163Q121 158 104 164Q81 155 63 163Q30 157 48 113Z" fill="#a5d2bd" stroke="#78a98f" stroke-width="2.5"/><ellipse cx="80" cy="115" rx="6" ry="9" fill="#486756"/><ellipse cx="124" cy="115" rx="6" ry="9" fill="#486756"/><ellipse cx="64" cy="130" rx="9" ry="5" fill="#d5a9ac"/><ellipse cx="141" cy="130" rx="9" ry="5" fill="#d5a9ac"/><path d="M91 138Q102 148 113 137" fill="none" stroke="#486756" stroke-width="3" stroke-linecap="round"/><path d="M65 98Q64 78 78 76" fill="none" stroke="#def0dd" stroke-width="8" stroke-linecap="round"/><path d="M104 55Q114 29 137 40Q125 58 104 55" fill="#84a86a"/>';
    } else if (type === 'fox') {
      portrait = '<path d="M135 127Q177 103 167 64Q193 96 174 148Q156 174 120 162" fill="#c78e5b"/><path d="M167 64Q185 93 178 109L158 99Z" fill="#f2e3c8"/><path d="M70 125Q100 112 130 129L138 168H61Z" fill="#bc8760"/><path d="M56 79L48 23L85 54Q101 47 120 54L155 23L146 87L102 134Z" fill="#d6a16b"/><path d="M58 41L65 77L82 62M145 41L135 77L121 62" fill="#d4b3a5"/><path d="M57 88L101 102L145 88L132 116L101 137L70 117Z" fill="#f5e8d1"/><ellipse cx="80" cy="84" rx="4" ry="6" fill="#625060"/><ellipse cx="123" cy="84" rx="4" ry="6" fill="#625060"/><path d="M92 104H111L101 115Z" fill="#625060"/><path d="M101 114V123M89 125Q101 133 114 124" fill="none" stroke="#9e7562" stroke-width="2"/>';
    } else if (type === 'rabbit') {
      portrait = '<ellipse cx="76" cy="50" rx="15" ry="38" transform="rotate(-12 76 50)" fill="#f1e5d8" stroke="#c6b3bc" stroke-width="2"/><ellipse cx="125" cy="48" rx="15" ry="38" transform="rotate(12 125 48)" fill="#f1e5d8" stroke="#c6b3bc" stroke-width="2"/><path d="M70 27L78 64M132 26L124 63" stroke="#dbb4be" stroke-width="10" stroke-linecap="round"/><ellipse cx="101" cy="144" rx="35" ry="25" fill="#c3b3d5"/><ellipse cx="101" cy="102" rx="47" ry="39" fill="#f4e9dd" stroke="#c6b3bc" stroke-width="2"/><ellipse cx="82" cy="98" rx="4" ry="7" fill="#66536b"/><ellipse cx="122" cy="98" rx="4" ry="7" fill="#66536b"/><path d="M95 111H107L101 117Z" fill="#c28b9d"/><path d="M101 117V122M90 125Q101 134 114 124" fill="none" stroke="#9b7e8d" stroke-width="2"/><ellipse cx="76" cy="163" rx="18" ry="8" fill="#f4e9dd"/><ellipse cx="126" cy="163" rx="18" ry="8" fill="#f4e9dd"/>';
    } else if (type === 'firefly') {
      portrait = (result === 'glow' ? '<circle cx="101" cy="131" r="48" fill="#f6d671" opacity=".35"/>' : '')+'<path d="M79 54L68 26M122 53L134 25" stroke="#786d6c" stroke-width="4" stroke-linecap="round"/><circle cx="67" cy="25" r="6" fill="#a5ad77"/><circle cx="135" cy="24" r="6" fill="#a5ad77"/><ellipse cx="64" cy="107" rx="24" ry="42" transform="rotate(-29 64 107)" fill="#d7e8da" stroke="#94b2a3" stroke-width="2"/><ellipse cx="139" cy="107" rx="24" ry="42" transform="rotate(29 139 107)" fill="#d7e8da" stroke="#94b2a3" stroke-width="2"/><path d="M84 125L62 140M118 125L140 140M88 143L72 163M115 143L131 163" stroke="#786d6c" stroke-width="4" stroke-linecap="round"/><ellipse cx="101" cy="129" rx="29" ry="33" fill="'+(result === 'glow' ? '#f3d16f' : '#c1b28c')+'" stroke="#9c966c" stroke-width="2"/><circle cx="101" cy="76" r="32" fill="#a8bd86"/><circle cx="89" cy="74" r="4" fill="#536651"/><circle cx="114" cy="74" r="4" fill="#536651"/><path d="M91 88Q102 98 113 88" fill="none" stroke="#536651" stroke-width="3"/>';
    } else if (type === 'wizard') {
      const young = result === 'youth';
      portrait = '<path d="M60 128Q100 112 142 128L157 169H45Z" fill="'+(young ? '#89a6b2' : '#948aa8')+'"/><path d="M100 131L87 169H115Z" fill="#d4c190"/><ellipse cx="101" cy="88" rx="37" ry="41" fill="#e5c8ad"/><path d="M62 87Q44 54 70 46L102 38L137 48Q158 73 139 95L130 64Q96 86 70 67Z" fill="'+(young ? '#94715b' : '#dcd5d2')+'"/><circle cx="87" cy="87" r="4" fill="#655263"/><circle cx="116" cy="87" r="4" fill="#655263"/>'+(young ? '<path d="M87 108Q101 120 116 108L105 128Z" fill="#94715b"/>' : '<path d="M68 100Q101 121 136 100Q137 135 101 160Q65 135 68 100Z" fill="#eee7df"/><path d="M69 86L77 82M126 82L134 86" stroke="#b5927e" stroke-width="2"/>')+'<path d="M58 56L90 10L118 18L143 56Z" fill="#7e7197"/><path d="M43 56Q101 42 157 56" fill="none" stroke="#7e7197" stroke-width="14" stroke-linecap="round"/><path d="M103 23L106 31L115 34L106 37L103 46L100 37L91 34L100 31Z" fill="#e4ca82"/><path d="M160 103L151 171" stroke="#997c64" stroke-width="6"/><circle cx="161" cy="99" r="10" fill="#b6a6cc"/>';
    } else if (type === 'wolf') {
      portrait = '<path d="M56 71 L49 28 Q78 30 90 60 L115 59 Q128 29 153 32 L148 79Z" fill="#8c879e"/><path d="M59 42L64 73L80 60 M139 45L125 63L141 75" fill="#d7b5c2"/><path d="M53 134 Q101 115 146 134 L156 168H44Z" fill="#77688d"/><path d="M102 151L87 135L80 157L102 151L122 157L114 135Z" fill="#d6b075"/><path d="M51 76 Q98 37 149 76 L153 106 Q147 142 101 143 Q56 143 48 108Z" fill="#a19bad"/><path d="M54 103Q72 106 84 94Q103 112 117 94Q130 104 148 102Q144 138 101 141Q63 139 54 103" fill="#e4ddd8"/><ellipse cx="81" cy="89" rx="5" ry="7" fill="#443c54"/><ellipse cx="123" cy="89" rx="5" ry="7" fill="#443c54"/><path d="M91 107Q101 102 111 107L101 117Z" fill="#51465e"/><path d="M101 116V123Q109 131 119 120 M101 123Q93 130 84 120" fill="none" stroke="#746879" stroke-width="3" stroke-linecap="round"/>';
    } else if (type === 'skeleton') {
      portrait = '<path d="M61 135Q98 120 138 136L147 169H53Z" fill="#89a18a"/><path d="M79 134L85 162H117L123 134" fill="#d4b98e"/><path d="M57 75Q56 35 100 34Q144 35 145 76L138 113L123 129H77L61 110Z" fill="#f3e7cc"/><ellipse cx="79" cy="83" rx="14" ry="16" fill="#665a72"/><ellipse cx="122" cy="83" rx="14" ry="16" fill="#665a72"/><path d="M96 102L101 94L106 102Z" fill="#998574"/><path d="M78 115H122M87 110V122M101 110V125M115 110V122" stroke="#baa18a" stroke-width="3" stroke-linecap="round"/><path d="M42 56Q100 40 159 57" fill="none" stroke="#a3ad77" stroke-width="13" stroke-linecap="round"/><path d="M63 49L71 25Q100 12 133 28L140 49Z" fill="#a3ad77"/><path d="M157 113V163" stroke="#a18467" stroke-width="7"/><path d="M145 103H169L164 122H150Z" fill="#abb5af"/>';
    } else if (type === 'knight') {
      portrait = '<path d="M57 132Q98 116 141 135L151 169H47Z" fill="#8793a9"/><path d="M56 136L44 168H65L76 127 M133 130L143 168H158L146 139" fill="#b58d9b"/><path d="M54 82Q55 34 101 33Q146 35 148 84L141 124L121 139H79L59 122Z" fill="#a8b1c3"/><path d="M68 75Q100 55 135 77V112Q100 135 68 113Z" fill="#edd6b9"/><circle cx="86" cy="93" r="5" fill="#51465e"/><circle cx="118" cy="93" r="5" fill="#51465e"/><path d="M92 112Q101 118 110 111" fill="none" stroke="#a57370" stroke-width="3" stroke-linecap="round"/><path d="M57 77H145M100 36V75" stroke="#d8dce4" stroke-width="8"/><path d="M100 34Q96 11 119 16" fill="none" stroke="#bc7995" stroke-width="11" stroke-linecap="round"/>';
    } else {
      portrait = '<path d="M64 129Q100 116 138 135L146 170H55Z" fill="#81768e"/><ellipse cx="100" cy="89" rx="55" ry="49" fill="#dba360"/><ellipse cx="101" cy="88" rx="32" ry="48" fill="#e9b16b"/><ellipse cx="101" cy="88" rx="11" ry="46" fill="#efbc79"/><path d="M100 42Q92 24 107 20" fill="none" stroke="#82976b" stroke-width="9" stroke-linecap="round"/><path d="M76 78L63 94H87Z M126 78L114 94H139Z" fill="#685148"/><path d="M81 109Q100 126 121 109" fill="none" stroke="#685148" stroke-width="5" stroke-linecap="round"/><path d="M87 121L98 133L109 122" fill="#685148"/>';
    }
    const decoration = result === 'love' ? '<g fill="#c77798"><path class="spark" d="M30 69C14 56 26 44 34 52C43 42 54 55 34 70Z"/><path class="spark" d="M163 42C149 31 161 20 167 28C177 19 185 33 166 45Z"/><path class="spark" d="M164 112C153 102 163 94 170 102C177 94 185 105 169 116Z"/></g>' : result === 'poison' ? '<g class="spark"><path d="M164 169V145" stroke="#7f9965" stroke-width="4"/><ellipse cx="157" cy="146" rx="10" ry="5" fill="#97b17a" transform="rotate(25 157 146)"/><ellipse cx="172" cy="140" rx="10" ry="5" fill="#97b17a" transform="rotate(-25 172 140)"/></g>' : result === 'failure' ? '<g class="spark" fill="#d7a8cb" opacity=".8"><circle cx="42" cy="103" r="20"/><circle cx="163" cy="61" r="15"/><circle cx="159" cy="121" r="9"/></g>' : '<g fill="#c9b484"><path d="M33 65L36 74L45 77L36 80L33 89L30 80L21 77L30 74Z"/><path d="M165 44L167 49L173 51L167 53L165 59L163 53L157 51L163 49Z"/></g>';
    const magic = ['glow','float','dream','mermaid','honesty','youth','invisible'].includes(result) ? `<g transform="translate(94 10) scale(.65)"><g class="spark">${potionEffect(result)}</g></g>` : '';
    return `<svg viewBox="0 0 200 185" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="95" r="78" fill="#ede6db"/><ellipse cx="101" cy="170" rx="66" ry="6" fill="#cfc2b5" opacity=".45"/><g opacity="${result === 'invisible' ? '.3' : '1'}">${portrait}</g>${decoration}${magic}</svg>`;
  }
  function bottleArt(i) {
    return `<svg viewBox="0 0 60 90" aria-hidden="true" style="color:${colors[i]}"><path d="M22 9H38V29L47 39Q53 45 52 58V75Q51 84 42 84H18Q8 84 8 74V53Q8 45 14 39L22 29Z" fill="currentColor" opacity=".2"/><path d="M11 50Q30 45 49 50V74Q49 81 41 81H19Q11 81 11 74Z" fill="currentColor" opacity=".75"/><path d="M22 10H38V29L47 39Q52 45 52 54V74Q52 84 42 84H18Q8 84 8 74V54Q8 45 14 39L22 29Z" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="20" y="5" width="20" height="10" rx="3" fill="#ae8f74"/><rect x="14" y="49" width="32" height="31" rx="7" fill="#fff6e7"/><g transform="translate(17 51) scale(.64)">${ingredientMark(i)}</g><path d="M17 42L22 35" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>`;
  }
  function cupTop(index) {
    const capacities = G.levels[current].capacities;
    return 22 + (capacities[0] - capacities[index]) / (capacities[0] - capacities[capacities.length - 1]) * 24;
  }
  function cupArt(index, shownState = state, suffix = '') {
    const cup = shownState.cups[index];
    const top = cupTop(index);
    const bottom = 148;
    const height = (bottom - top - 5) * cup.amount / G.levels[current].capacities[index];
    const color = cup.ingredient === null ? '#d9d0df' : colors[cup.ingredient];
    const clip = `cup-clip-${index}${suffix}`;
    return `<svg viewBox="0 0 145 164"><defs><clipPath id="${clip}"><path d="M27 ${top + 4}H106L99 142Q99 148 91 148H44Q35 148 34 140Z"/></clipPath></defs><path d="M107 ${top + 21}H118Q135 ${top + 21}132 ${top + 44}Q129 ${top + 61}104 ${top + 62}" fill="none" stroke="#b4a7b8" stroke-width="6"/><path d="M24 ${top}H113L106 ${top + 8}L100 142Q100 151 91 151H43Q34 151 32 141Z" fill="#f5f0f5" stroke="#a99bad" stroke-width="2.5"/><g clip-path="url(#${clip})"><rect x="25" y="${bottom - height}" width="90" height="${height + 2}" fill="${color}" opacity=".72"/>${cup.amount ? `<ellipse cx="67" cy="${bottom - height + 1}" rx="40" ry="3" fill="${pale[cup.ingredient]}"/>` : ''}</g><path d="M41 ${top + 17}L45 ${Math.max(top + 30, 115)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/><ellipse cx="69" cy="155" rx="48" ry="3" fill="#baaaaf" opacity=".16"/></svg>`;
  }
  function potArt(shownState = state) {
    const total = shownState.pot.reduce((sum, v) => sum + v, 0);
    const active = shownState.pot.map((v, i) => v ? i : -1).filter(i => i >= 0);
    const color = active.length > 1 ? '#9b75b4' : active.length ? colors[active[0]] : '#bfb3c5';
    return `<svg viewBox="0 0 185 164"><path d="M43 140L38 155M140 140L146 155" stroke="#655576" stroke-width="10" stroke-linecap="round"/><path d="M36 79Q16 68 16 90Q15 104 34 103 M150 79Q170 68 170 90Q171 104 151 103" fill="none" stroke="#655576" stroke-width="8"/><path d="M38 70Q22 105 37 129Q48 149 92 150Q140 149 151 126Q163 99 146 70Z" fill="#665477"/><path d="M44 95Q35 118 53 129" fill="none" stroke="#91809d" stroke-width="6" stroke-linecap="round"/><ellipse cx="92" cy="72" rx="61" ry="17" fill="#514260"/><ellipse cx="92" cy="71" rx="53" ry="12" fill="${color}" opacity="${total ? 1 : .4}"/><path d="M62 69Q91 62 116 69" fill="none" stroke="#fff" opacity=".3" stroke-width="3" stroke-linecap="round"/><path d="M84 111L89 121L101 123L92 130L94 141L84 135L74 140L76 128L68 121L80 120Z" fill="#dac592" transform="translate(7 -13) scale(.95)"/>${total ? `<circle cx="73" cy="48" r="5" fill="${color}" opacity=".5"/><circle cx="110" cy="34" r="7" fill="${color}" opacity=".45"/><circle cx="93" cy="54" r="3" fill="${color}" opacity=".6"/>` : '<path d="M86 39Q76 29 86 16M104 43Q116 32 105 20" fill="none" stroke="#cec2cf" stroke-width="3" stroke-linecap="round"/>'}</svg>`;
  }
  function status(message, error) {
    $('status').textContent = message;
    $('status').hidden = !message;
    $('status').classList.toggle('error', !!error);
  }
  function renderOrders() {
    managerController?.refresh();
    $('orders').innerHTML = G.levels.map((level, i) => `<button class="order-tab" type="button" data-level="${i}" ${i === current ? 'aria-current="step"' : ''}><span class="tab-number">${i + 1}</span><span>${level.name}</span>${completed.includes(level.id) ? '<span class="tab-done" aria-label="已完成">✓</span>' : ''}</button>`).join('');
  }
  function renderLevel() {
    const level = G.levels[current];
    renderOrders();
    $('order-number').textContent = `訂單 ${String(current + 1).padStart(2, '0')} / ${G.levels.length}`;
    $('order-name').textContent = level.name;
    $('customer-name').textContent = level.customer;
    $('customer-quote').textContent = `「${level.quote}」`;
    $('customer-art').innerHTML = characterArt(level.character);
    $('recipe').innerHTML = recipeMarkup(level.recipe);
    $('recipe').setAttribute('aria-label', level.recipe.map((amount, i) => amount ? `${G.ingredients[i].name} ${amount} 份` : '').filter(Boolean).join('，'));
    $('target-potion').innerHTML = potionArt(level.effect || level.id);
    $('target-potion').setAttribute('aria-label', level.name + '：藥水瓶與魔法效果');
    $('witch-hints').hidden = !showTips;
    if (showTips) {
      $('hint-text').innerHTML = iconText(level.hint);
      $('solution-list').innerHTML = level.solution.map(action => `<li>${iconText(G.describe(action, level))}</li>`).join('');
    }
    $('cups').innerHTML = level.capacities.map((capacity, i) => `<button class="vessel" data-cup="${i}" id="cup-${i}" type="button" aria-pressed="false"><span class="vessel-label" id="cup-label-${i}">${G.cupName(i, level)}${level.capacities.length === 2 ? ` <small>${capacity} 份</small>` : ''}</span><span class="cup-art" id="cup-art-${i}" aria-hidden="true"></span><span class="vessel-contents" id="cup-contents-${i}"></span></button>`).join('');
    $('cups').parentElement.dataset.cups = level.capacities.length;
    render();
  }
  function render(shownState = state) {
    const level = G.levels[current];
    $('order-complete').hidden = !completed.includes(level.id);
    $('undo').disabled = !games[current].length || busy;
    $('reset').disabled = busy;
    $('brew').disabled = !state.pot.some(Boolean) || busy;
    $('waste').disabled = !selection || selection.kind !== 'cup' || busy;
    $('cancel').hidden = !selection;
    document.querySelectorAll('[data-ingredient]').forEach(button => {
      button.setAttribute('aria-pressed', String(selection?.kind === 'ingredient' && selection.index === Number(button.dataset.ingredient)));
      button.disabled = busy;
    });
    shownState.cups.forEach((cup, i) => {
      const selected = selection?.kind === 'cup' && selection.index === i;
      $('cup-' + i).disabled = busy;
      $('cup-' + i).setAttribute('aria-pressed', String(selected));
      $('cup-' + i).classList.toggle('is-target', !!selection && !selected);
      $('cup-' + i).setAttribute('aria-label', `${G.cupName(i, level)}，容量 ${level.capacities[i]} 份，${cup.amount ? `裝有${G.ingredients[cup.ingredient].name}` : '空杯'}`);
      $('cup-art-' + i).innerHTML = cupArt(i, shownState);
      $('cup-contents-' + i).innerHTML = cup.amount ? `${icon(cup.ingredient)}${cup.amount === level.capacities[i] ? ' 滿杯' : ''}` : '空杯';
    });
    $('pot').disabled = busy;
    $('pot').classList.toggle('is-target', selection?.kind === 'cup');
    $('pot-art').innerHTML = potArt(shownState);
    $('pot-contents').innerHTML = shownState.pot.some(Boolean) ? shownState.pot.map((amount, i) => amount ? icon(i) : '').join('') : '空鍋';
    $('pot-recipe').innerHTML = shownState.pot.some(Boolean) ? recipeMarkup(shownState.pot) : '<span class="empty-pot">空鍋</span>';
    syncCursor();
  }
  function cursorVisible() {
    return !!selection && pointer.mouse && pointer.inside && !busy && !document.querySelector('dialog[open]');
  }
  function moveCursor() {
    const visible = cursorVisible();
    $('carry-cursor').hidden = !visible;
    document.body.classList.toggle('carrying', visible);
    const x = Math.min(pointer.x + 13, window.innerWidth - 70);
    const y = Math.max(4, Math.min(pointer.y - 24, window.innerHeight - 92));
    $('carry-cursor').style.transform = `translate(${x}px, ${y}px) rotate(-12deg)`;
  }
  function syncCursor() {
    if (selection) $('carry-cursor').innerHTML = selection.kind === 'ingredient' ? bottleArt(selection.index) : cupArt(selection.index, state, '-cursor') + icon(state.cups[selection.index].ingredient);
    moveCursor();
  }
  function cancelSelection() {
    if (!selection) return;
    selection = null; render(); status('已取消。');
  }
  function finishAnimation() {
    clearTimeout(animationTimer);
    flightAnimations.forEach(animation => animation.cancel());
    flightAnimations = [];
    $('pour-flight').hidden = true;
    $('pour-stream').hidden = true;
    busy = false;
    $('pot').classList.remove('pot-animate');
  }
  function animatePour(action, before) {
    const [kind, from, to] = action;
    const source = kind === 'fill' ? document.querySelector(`[data-ingredient="${to}"] svg`) : $('cup-art-' + from);
    const target = kind === 'fill' ? $('cup-art-' + from) : kind === 'pour' ? $('cup-art-' + to) : kind === 'pot' ? $('pot-art') : $('waste');
    const a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
    const ingredient = kind === 'fill' ? to : before.cups[from].ingredient;
    const flight = $('pour-flight'), stream = $('pour-stream');
    flight.innerHTML = kind === 'fill' ? bottleArt(to) : cupArt(from, before, '-flight');
    flight.dataset.source = kind === 'fill' ? 'ingredient-' + to : 'cup-' + from;
    flight.dataset.target = kind === 'fill' ? 'cup-' + from : kind === 'pour' ? 'cup-' + to : kind;
    flight.hidden = false; stream.hidden = false;
    const mouthX = b.left + b.width * .5;
    const mouthY = b.top + b.height * (kind === 'pot' ? .43 : kind === 'empty' ? .35 : (cupTop(kind === 'fill' ? from : to) + 4) / 164);
    const x = Math.max(0, Math.min(window.innerWidth - 88, mouthX - 67)), y = mouthY - 94;
    const position = (left, top, angle = 0) => `translate(${left}px,${top}px) rotate(${angle}deg)`;
    flightAnimations.push(flight.animate([
      {transform:position(a.left + a.width/2 - 44, a.top), opacity:.8, offset:0},
      {transform:position(x,y), opacity:1, offset:.28},
      {transform:position(x,y,62), opacity:1, offset:.43},
      {transform:position(x,y,62), opacity:1, offset:.8},
      {transform:position(x,y,5), opacity:0, offset:1}
    ], {duration:520,easing:'ease-in-out',fill:'forwards'}));
    stream.style.left = (mouthX - 3) + 'px'; stream.style.top = (mouthY - 33) + 'px'; stream.style.background = colors[ingredient];
    flightAnimations.push(stream.animate([
      {opacity:0,transform:'scaleY(0)',offset:0}, {opacity:0,transform:'scaleY(0)',offset:.4},
      {opacity:.85,transform:'scaleY(1)',offset:.52}, {opacity:.85,transform:'scaleY(1)',offset:.8},
      {opacity:0,transform:'scaleY(.4)',offset:1}
    ], {duration:520,fill:'forwards'}));
    if (kind === 'pot') $('pot').classList.add('pot-animate');
    animationTimer = setTimeout(() => { finishAnimation(); render(); }, 540);
  }
  function act(action) {
    if (busy) return;
    const result = G.apply(G.levels[current], state, action);
    if (!result.ok) {
      if (result.code === 'mixed-ingredients') openDialog('mix-dialog');
      else status(result.message, true);
      return;
    }
    const before = state;
    games[current].push(action);
    state = result.state;
    selection = null;
    busy = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    render(busy ? before : state);
    status(result.message);
    save();
    if (busy) animatePour(action, before);
  }
  function chooseCup(i) {
    if (busy) return;
    if (selection?.kind === 'ingredient') { act(['fill', i, selection.index]); return; }
    if (selection?.kind === 'cup' && selection.index !== i) { act(['pour', selection.index, i]); return; }
    if (selection?.kind === 'cup') { selection = null; render(); return; }
    if (!state.cups[i].amount) { status('這個杯子是空的。先點一種原料，再點這個杯子。'); return; }
    selection = { kind: 'cup', index: i }; render();
  }
  function switchLevel(index) {
    managerController?.close();
    finishAnimation();
    games[current] = [];
    current = index;
    games[current] = [];
    state = G.initial(G.levels[current]);
    selection = null;
    renderLevel();
    status('');
    save();
  }
  function openDialog(id) { finishAnimation(); selection = null; render(); $(id).showModal(); moveCursor(); }
  function brew() {
    if (busy || !state.pot.some(Boolean)) return;
    const level = G.levels[current];
    const result = G.verdict(level, state);
    const submitted = [...state.pot];
    selection = null;
    if (result.success && !completed.includes(level.id)) { completed.push(level.id); save(); renderOrders(); }
    render();
    $('result-art').innerHTML = characterArt(level.character, result.success ? (level.effect || level.id) : 'failure');
    $('result-title').textContent = result.success ? '就是這個配方！' : '再試一次';
    $('result-story').textContent = result.success ? level.success : level.failure + ' 杯子和大鍋已清空。';
    $('result-feedback').innerHTML = G.ingredients.map((ingredient, i) => {
      if (!level.recipe[i] && !submitted[i]) return '';
      const diff = result.differences[i];
      return `<span class="feedback-chip${diff ? ' wrong' : ''}">${icon(i)} ${diff === 0 ? '剛剛好 ✓' : diff > 0 ? (level.recipe[i] ? '太多了' : '不需要') : '還不夠'}</span>`;
    }).join('');
    $('result-next').hidden = !result.success;
    $('result-next').textContent = M.unlocked(G.levels,completed) ? '遊戲管理員 →' : current < G.levels.length - 1 ? '下一關 →' : '選關';
    $('result-back').textContent = result.success ? '回工作臺' : '再試一次';
    if (!result.success) {
      games[current] = []; state = G.initial(G.levels[current]); save();
      status('杯子和大鍋已清空。');
    }
    openDialog('result-dialog');
  }

  $('ingredients').innerHTML = G.ingredients.map((ingredient, i) => `<button class="ingredient tone-${i}" type="button" data-ingredient="${i}" aria-label="選擇${ingredient.name}" aria-pressed="false">${bottleArt(i)}<span class="ingredient-info"><b>${ingredient.name}</b></span></button>`).join('');
  $('ingredients').addEventListener('click', event => {
    const button = event.target.closest('[data-ingredient]');
    if (!button || busy) return;
    const index = Number(button.dataset.ingredient);
    selection = selection?.kind === 'ingredient' && selection.index === index ? null : { kind: 'ingredient', index };
    render();
  });
  $('orders').addEventListener('click', event => {
    const button = event.target.closest('[data-level]');
    if (button && (Number(button.dataset.level) !== current || !$('manager-panel').hidden)) switchLevel(Number(button.dataset.level));
  });
  $('cups').addEventListener('click', event => { const button = event.target.closest('[data-cup]'); if (button) chooseCup(Number(button.dataset.cup)); });
  $('pot').addEventListener('click', () => selection?.kind === 'cup' ? act(['pot', selection.index]) : status('先點有藥液的杯子，再點大鍋。原料要先用量杯量好。'));
  $('waste').addEventListener('click', () => { if (selection?.kind === 'cup') act(['empty', selection.index]); });
  $('cancel').addEventListener('click', cancelSelection);
  $('undo').addEventListener('click', () => {
    if (busy || !games[current].length) return;
    games[current].pop(); state = G.replay(G.levels[current], games[current]); selection = null;
    render(); save(); status('已回到上一步。');
  });
  $('reset').addEventListener('click', () => {
    if (busy) return;
    games[current] = []; state = G.initial(G.levels[current]); selection = null;
    render(); save(); status('杯子和大鍋已清空。');
  });
  $('brew').addEventListener('click', brew);
  $('result-next').addEventListener('click', () => {
    $('result-dialog').close();
    if (M.unlocked(G.levels,completed)) { managerController.open(); return; }
    let next = current < G.levels.length - 1 ? current + 1 : G.levels.findIndex(level => !completed.includes(level.id));
    if (next === -1) next = 0;
    if (completed.length === G.levels.length && current === G.levels.length - 1) games[next] = [];
    switchLevel(next);
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }));
  document.addEventListener('contextmenu', event => { if (selection) { event.preventDefault(); cancelSelection(); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelSelection();
    if (event.key === 'Tab') { pointer.mouse = false; moveCursor(); }
  });
  function trackPointer(event) {
    document.body.classList.toggle('touch-input', event.pointerType === 'touch');
    pointer = {x:event.clientX,y:event.clientY,mouse:event.pointerType === 'mouse',inside:true}; moveCursor();
  }
  document.addEventListener('pointermove', trackPointer);
  document.addEventListener('pointerdown', trackPointer);
  document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; moveCursor(); });
  window.addEventListener('blur', () => { pointer.inside = false; moveCursor(); });
  window.addEventListener('resize', () => { if (busy) { finishAnimation(); render(); } moveCursor(); });
  window.addEventListener('scroll', () => { if (busy) { finishAnimation(); render(); } }, {passive:true});
  load();
  state = G.replay(G.levels[current], games[current]);
  renderLevel();
  managerController = M.mount({
    isUnlocked: () => directManager || M.unlocked(G.levels,completed),
    getProgress: () => directManager ? previewManagerProgress : managerProgress,
    setProgress: value => {
      if (directManager) previewManagerProgress = M.validProgress(value);
      else { managerProgress = M.validProgress(value); save(); }
    },
    onEnter: () => {
      finishAnimation(); games[current] = []; state = G.initial(G.levels[current]);
      selection = null; render(); save();
    },
    onExit: renderLevel,
    icon, characterArt, bottleArt, potArt
  });
  if (games[current].length) status('歡迎回來，已保留你上次的調藥進度。');
  if (directManager) managerController.open();
})();
