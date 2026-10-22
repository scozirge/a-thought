window.QuestArt={
 icon(name){
  const paths={
   fire:'<path d="M13 2c2 6-5 7-2 12 2-1 3-3 3-5 5 4 7 7 4 11-4 5-12 1-12-4 0-5 4-7 7-14Z"/>',
   ice:'<path d="M12 2v20M3 7l18 10M3 17 21 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4-2-1-4m12 14-1-4 4-2M3 13l4 2-1 4m12-14-1 4 4 2"/>',
   blade:'<path d="m15 2 7 0 0 7-12 12-7-7Z"/><path d="m5 12 7 7M2 22l6-6M15 9l4-4"/>',
   shield:'<path d="m12 2 9 4v7c0 5-9 10-9 10S3 18 3 13V6Z"/><path d="m8 12 3 3 5-6"/>',
   heart:'<path d="M12 21 3 12C-3 5 6-2 12 6c6-8 15-1 9 6Z"/>',
   dice:'<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" stroke-width="4"/>',
   plus:'<path d="M12 4v16M4 12h16"/>',split:'<path d="M12 3v7m0 0-7 7m7-7 7 7M3 12v7h7m4 0h7v-7"/>',
   merge:'<path d="m3 4 9 9 9-9M12 13v9m-5-5 5 5 5-5"/>',
   armor:'<path d="m12 2 9 4v7c0 5-9 10-9 10S3 18 3 13V6Z"/><path d="M8 12h8"/>',
   reflect:'<path d="M4 3v18M20 4 7 12l13 8m-1-7 1 7-7-1"/>',
   bolt:'<path d="m14 2-10 12h7l-1 8 10-12h-7Z"/>',
   check:'<path d="m4 12 5 5L20 6"/>',undo:'<path d="m8 3-5 5 5 5M3 8h11a7 7 0 0 1 0 14"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.dice}</svg>`;
 },
 hero(){
  return `<svg viewBox="0 0 240 240" role="img" aria-label="骰子魔法師"><ellipse cx="116" cy="222" rx="73" ry="11" fill="#1c243d55"/><g class="idle-body"><path d="m73 124-23 88q58 25 122-1l-25-87Z" fill="#6460aa"/><path d="m75 124 40 70 36-70" fill="#9d94d1"/><path d="m94 169-12 50m55-49 9 48" stroke="#493e7d" stroke-width="13" stroke-linecap="round"/><rect x="62" y="68" width="107" height="106" rx="27" fill="#f7e7bd" stroke="#cfb98b" stroke-width="4"/><path d="M74 93q42-15 82 0" stroke="#fff7df" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="91" cy="113" r="6" fill="#57475a"/><circle cx="140" cy="113" r="6" fill="#57475a"/><path d="M105 136q12 11 23-1" stroke="#68505a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="77" cy="132" r="6" fill="#e2a0a0"/><circle cx="152" cy="132" r="6" fill="#e2a0a0"/><path d="M50 84 106 6l21 33 43 35q25 20-56 19-46 0-64-9Z" fill="#7770b7"/><path d="m89 46 12-18 12 21" fill="#a69ad6"/><path d="m120 54 4 7 8 1-6 5 2 8-8-4-7 4 2-8-6-5 8-1Z" fill="#f4d484"/><path d="M169 135q21 2 26-12M62 143l-18 10" stroke="#c9b189" stroke-width="13" stroke-linecap="round"/><path d="m196 93 10 113" stroke="#ac815c" stroke-width="8" stroke-linecap="round"/><path d="m195 63 15 19-10 21-16-18Z" fill="#9fddd8" stroke="#d7f7eb" stroke-width="3"/><path d="m195 65 4 20-13 0" fill="#e2fff0"/><circle cx="47" cy="155" r="9" fill="#f7e7bd"/></g></svg>`;
 },
 monster(type){
  let body='';
  if(type==='slime')body=`<path d="M37 200c-18-30 11-53 13-85 3-49 110-72 137-12 9 22 4 39 19 61 22 40-6 55-35 52-41 7-96 7-134-16Z" fill="#cc74a2" stroke="#9d5085" stroke-width="4"/><path d="M65 111q8-31 41-33" stroke="#f4b1cb" stroke-width="11" stroke-linecap="round" fill="none"/><ellipse cx="92" cy="143" rx="7" ry="11" fill="#553758"/><ellipse cx="155" cy="143" rx="7" ry="11" fill="#553758"/><path d="M110 165q15 17 29 0" stroke="#743d68" stroke-width="5" stroke-linecap="round" fill="none"/><path d="m99 71 11-26 15 17 15-30 4 36" fill="#80b49b" stroke="#5e8f81" stroke-width="3"/><ellipse cx="73" cy="166" rx="9" ry="5" fill="#f1a5bb"/><ellipse cx="174" cy="165" rx="9" ry="5" fill="#f1a5bb"/>`;
  if(type==='crab')body=`<g stroke="#b97969" stroke-width="13" stroke-linecap="round" fill="none"><path d="m65 165-30 26m40-4-26 26m120-48 30 26m-40-4 26 26M62 139 35 115m141 25 28-25"/></g><path d="M64 128c9-38 104-39 116 0l7 48q-64 35-132-1Z" fill="#8fa8b6" stroke="#617e97" stroke-width="4"/><path d="M74 127q48-25 96 0" stroke="#c4d4d9" stroke-width="8" fill="none" stroke-linecap="round"/><path d="m121 115-2 71m-50-29 104 0" stroke="#6d8b9f" stroke-width="4"/><path d="M90 105V83m59 22V83" stroke="#c58d7b" stroke-width="10"/><circle cx="90" cy="80" r="12" fill="#f1d7b1"/><circle cx="149" cy="80" r="12" fill="#f1d7b1"/><circle cx="94" cy="79" r="5" fill="#4a4d61"/><circle cx="145" cy="79" r="5" fill="#4a4d61"/><path d="M32 120Q-2 91 17 62l12 22 9-26q30 32-6 62m175 0q34-29 15-58l-12 22-9-26q-30 32 6 62" fill="#d5a28d" stroke="#b78273" stroke-width="3"/>`;
  if(type==='dragon')body=`<path d="m75 129-51-57 7 72 37 35m93-51 54-57-8 72-40 35" fill="#7e72aa" stroke="#b1a0d2" stroke-width="4"/><path d="M155 188q57 39 63-10-17 22-39-19" fill="#a28bc5"/><path d="M64 128q-4-52 54-54 64 0 59 60l-8 72q-52 25-104-2Z" fill="#a28bc5" stroke="#79649e" stroke-width="4"/><path d="m80 89-9-50 32 40m39-1 29-39-9 53" fill="#efd89d" stroke="#c9ac73" stroke-width="3"/><path d="m119 42-20 26h17l-2 23 23-31h-17l9-18" fill="#f4dc81"/><ellipse cx="119" cy="174" rx="34" ry="41" fill="#d4c1db"/><path d="M96 169h45m-47 15h48" stroke="#b5a0c6" stroke-width="3"/><path d="m86 114 18 7m31 0 18-7" stroke="#4f4565" stroke-width="5" stroke-linecap="round"/><circle cx="99" cy="129" r="5" fill="#4f4565"/><circle cx="141" cy="129" r="5" fill="#4f4565"/><path d="M106 145q15 11 28 0" stroke="#655276" stroke-width="4" fill="none"/><path d="m82 198-8 20m81-20 8 20" stroke="#79649e" stroke-width="14" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 240 240" role="img" aria-label="${{slime:'莓果史萊姆',crab:'鐵甲蟹',dragon:'雷角龍'}[type]}"><ellipse cx="120" cy="222" rx="82" ry="12" fill="#1c243d55"/><g class="idle-body">${body}</g></svg>`;
 }
};
