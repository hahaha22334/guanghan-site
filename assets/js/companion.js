(() => {
  'use strict';
  const guide=window.GuanghanGuide,data=window.GuanghanCompanionData,logic=window.GuanghanCompanionLogic;
  const dock=document.querySelector('[data-companion]'),dialog=document.querySelector('[data-companion-dialog]');
  if(!guide || !data || !logic || !dock || !dialog?.showModal) return;
  const $=s=>document.querySelector(s),sprites=[...document.querySelectorAll('[data-pet-sprite]')];
  const states=['idle','wave','pet','hop','think','talk','point','stamp','sleep'];
  let timer,idleTimer,token=0,sleeping=false;
  const loaded=new Map();
  const moving=()=>document.documentElement.dataset.motion!=='off' && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame=n=>sprites.forEach(s=>s.style.backgroundPosition=`${(n%4)/3*100}% ${n<4?0:100}%`);
  const load=action=>{if(!loaded.has(action)){const img=new Image();img.src=`assets/pet/${action}.webp`;loaded.set(action,img.decode().catch(()=>{}));}return loaded.get(action);};
  function stop(){clearTimeout(timer);clearTimeout(idleTimer);token++;}
  function scheduleIdle(){clearTimeout(idleTimer);if(!sleeping && moving())idleTimer=setTimeout(()=>play('idle'),7500);}
  async function play(action) {
    if(!states.includes(action))return;
    stop();const run=token;
    await load(action);if(run!==token || document.hidden)return;
    sprites.forEach(s=>s.style.backgroundImage=`url("assets/pet/${action}.webp")`);
    frame(moving()?0:action==='sleep'?7:0);
    if(!moving()){if(action!=='sleep')scheduleIdle();return;}
    let n=0;
    const advance=()=>{
      if(run!==token)return;frame(n);
      if(n<7){n++;timer=setTimeout(advance,action==='idle'?170:130);}
      else if(action!=='sleep')timer=setTimeout(()=>{if(run!==token)return;sprites.forEach(s=>s.style.backgroundImage='url("assets/pet/idle.webp")');frame(0);scheduleIdle();},250);
    };advance();
  }
  function storeSleep(){try{localStorage.setItem('guanghan-pet-v1',sleeping?'sleep':'awake');}catch{/* Session-only preference. */}}
  function syncSleep(){ $('[data-pet-open]').hidden=sleeping;$('[data-pet-wake]').hidden=!sleeping; }
  try{sleeping=localStorage.getItem('guanghan-pet-v1')==='sleep';}catch{/* Keep available. */}
  const filename=location.pathname.split('/').pop();
  const context=()=>{
    const chapter=document.querySelector('[data-book-chapter]:not([hidden])')?.id;
    const bookPlaces={eyes:'sanxingdui',city:'luocheng',tea:'oldtown',taste:'food',lake:'jinyan',season:'lianshan'};
    return {place:guide.places.find(p=>p.page===filename)?.id || bookPlaces[chapter],book:filename==='book.html'};
  };
  function suggestions() {
    const questions=context().place?['这一页有什么看点？','一天怎么玩？','怎么保存行程？']:['一天怎么玩？','三星堆怎么预约？','雒城和房湖算两站吗？'];
    const box=$('[data-pet-suggestions]');box.replaceChildren();
    questions.forEach(q=>{const b=document.createElement('button');b.type='button';b.textContent=q;b.addEventListener('click',()=>answer(q));box.append(b);});
  }
  function passport(opener){dialog.close();document.dispatchEvent(new CustomEvent('guanghan:passportopen',{detail:{opener:opener || $('[data-pet-open]')}}));}
  function answer(question,action='talk') {
    const q=question.trim().slice(0,180);if(!q)return;
    const entry=logic.matchQuestion(q,data,context()),box=$('[data-pet-response]');box.replaceChildren();
    const title=document.createElement('h3');title.textContent=entry?.question || '这条问题，我还没有找到可靠答案。';
    const p=document.createElement('p');p.textContent=entry?.answer || '可以试试“一天怎么玩”“从成都怎么去”或直接打开目的地总览，查找你想了解的内容。';box.append(title,p);
    const links=entry?.links || [['查找目的地','explore.html'],['查看行前问答','travel.html#faq']];
    links.forEach(([label,href])=>{
      // URLs originate solely in the generated, editorial knowledge base.
      const a=document.createElement('a');a.textContent=label+' ↗';a.href=href;
      if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}
      a.addEventListener('click',()=>play('point'));box.append(a);
    });
    if(entry && logic.validAction(entry.action,guide)) {
      const b=document.createElement('button');b.type='button';b.textContent=entry.action.label;
      if(entry.action.type==='add') {b.dataset.addTrip=entry.action.id;b.addEventListener('click',()=>{play('hop');$('[data-pet-message]').textContent='已交给“我的行程”，可在行程页查看和调整。';});}
      else b.addEventListener('click',()=>passport());box.append(b);
    }
    const source=document.createElement('small');source.className='pet-source';source.textContent=`依据本站整理资料 · ${data.reviewDate} · 可沿上方入口查看原文`;box.append(source);
    $('[data-pet-message]').textContent='';play(action);
  }
  function open(){sleeping=false;storeSleep();syncSleep();suggestions();dialog.showModal();play('wave');}
  $('[data-pet-open]').addEventListener('click',open);$('[data-pet-wake]').addEventListener('click',open);
  $('[data-pet-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{stop();if(!sleeping){sprites.forEach(s=>s.style.backgroundImage='url("assets/pet/idle.webp")');frame(0);scheduleIdle();}$('[data-pet-open]').hidden?sleeping&&$('[data-pet-wake]').focus({preventScroll:true}):$('[data-pet-open]').focus({preventScroll:true});});
  $('[data-pet-form]').addEventListener('submit',e=>{e.preventDefault();answer($('#pet-question').value);});
  $('[data-pet-passport]').addEventListener('click',()=>passport());
  document.querySelectorAll('[data-pet-play]').forEach(b=>b.addEventListener('click',()=>{play(b.dataset.petPlay);$('[data-pet-message]').textContent=({pet:'摸摸羽冠，今天也要慢慢看。',hop:'跳一下！一起去认识广汉吧。',wave:'你好呀，我是堆堆。',think:'翻翻小手记，下一页会遇见什么呢？'})[b.dataset.petPlay];}));
  $('[data-pet-point]').addEventListener('click',()=>answer('有哪些路线？','point'));
  $('[data-pet-sleep]').addEventListener('click',()=>{sleeping=true;storeSleep();$('[data-pet-message]').textContent='堆堆休息啦，随时可以再叫醒我。';play('sleep');setTimeout(()=>{if(sleeping){dialog.close();syncSleep();}},1100);});
  document.addEventListener('visibilitychange',()=>{stop();if(!document.hidden){frame(0);scheduleIdle();}});
  document.addEventListener('guanghan:motionchange',()=>{stop();if(!sleeping){sprites.forEach(s=>s.style.backgroundImage='url("assets/pet/idle.webp")');frame(0);scheduleIdle();}});
  document.addEventListener('guanghan:stamp',()=>play('stamp'));
  document.addEventListener('guanghan:passportchange',e=>$('[data-pet-count]').textContent=String(e.detail.count));
  document.addEventListener('guanghan:bookchange',suggestions);
  window.addEventListener('storage',e=>{if(e.key==='guanghan-pet-v1'){sleeping=e.newValue==='sleep';syncSleep();if(sleeping)stop();else scheduleIdle();}});
  $('[data-pet-count]').textContent=$('[data-passport-count]')?.textContent || '0';
  dock.hidden=false;document.documentElement.classList.add('companion-ready');syncSleep();
  if(!sleeping){let first=true;try{first=!sessionStorage.getItem('guanghan-pet-welcome');sessionStorage.setItem('guanghan-pet-welcome','1');}catch{/* Optional. */}first?play('wave'):scheduleIdle();}
})();
