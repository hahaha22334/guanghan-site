(() => {
  'use strict';
  const guide=window.GuanghanGuide,data=window.GuanghanCompanionData,logic=window.GuanghanCompanionLogic;
  const dock=document.querySelector('[data-companion]'),dialog=document.querySelector('[data-companion-dialog]');
  if(!guide || !data || !logic || !dock || !dialog?.showModal || typeof window.GuanghanPageFilename!=='function') return;
  const $=s=>document.querySelector(s),sprites=[...document.querySelectorAll('[data-pet-sprite]')];
  const states=['idle','wave','pet','hop','think','talk','point','stamp','sleep'];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const timing={idle:100,wave:80,pet:85,hop:75,think:110,talk:85,point:90,stamp:100,sleep:100};
  let timer,idleTimer,token=0,sleeping=false,finishPlayback,lastAmbient='wave';
  const loaded=new Map();
  const moving=()=>document.documentElement.dataset.motion!=='off' && !document.hidden && !reduced.matches;
  const frame=n=>sprites.forEach(s=>{s.style.backgroundPosition=`${(n%4)/3*100}% ${Math.floor(n/4)/3*100}%`;s.dataset.petFrame=String(n);});
  const show=action=>sprites.forEach(s=>{s.style.backgroundImage=`url("assets/pet/${action}.webp")`;s.dataset.petAction=action;});
  const load=action=>{if(!loaded.has(action)){const img=new Image();img.src=`assets/pet/${action}.webp`;loaded.set(action,img.decode().then(()=>true).catch(()=>{loaded.delete(action);return false;}));}return loaded.get(action);};
  function stop(){cancelAnimationFrame(timer);clearTimeout(idleTimer);token++;if(finishPlayback){finishPlayback(false);finishPlayback=null;}}
  function scheduleIdle(){
    clearTimeout(idleTimer);
    if(sleeping || !moving() || document.querySelector('dialog[open]'))return;
    idleTimer=setTimeout(()=>{
      if(sleeping || !moving() || document.querySelector('dialog[open]'))return;
      const pool=['idle','idle','wave','pet','hop','think'].filter(action=>action!==lastAmbient);
      lastAmbient=pool[Math.floor(Math.random()*pool.length)];play(lastAmbient);
    },1800+Math.random()*2400);
  }
  function rest(){show('idle');frame(0);scheduleIdle();}
  async function play(action) {
    if(!states.includes(action))return;
    stop();const run=token;
    const ready=await load(action);if(run!==token || document.hidden)return false;
    if(!ready){rest();return false;}
    show(action);frame(moving()?0:action==='sleep'?15:0);
    if(!moving())return true;
    return new Promise(resolve=>{
      finishPlayback=resolve;const started=performance.now(),duration=timing[action]*16;
      const advance=now=>{
        if(run!==token)return;
        if(!moving()){stop();if(!sleeping)rest();return;}
        frame(Math.min(15,Math.floor((now-started)/timing[action])));
        if(now-started<duration+100)timer=requestAnimationFrame(advance);
        else {finishPlayback=null;if(action!=='sleep')rest();resolve(true);}
      };timer=requestAnimationFrame(advance);
    });
  }
  function storeSleep(){try{localStorage.setItem('guanghan-pet-v1',sleeping?'sleep':'awake');}catch{/* Session-only preference. */}}
  function syncSleep(){ $('[data-pet-open]').hidden=sleeping;$('[data-pet-wake]').hidden=!sleeping; }
  try{sleeping=localStorage.getItem('guanghan-pet-v1')==='sleep';}catch{/* Keep available. */}
  const filename=window.GuanghanPageFilename(location.pathname);
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
  dialog.addEventListener('close',()=>{stop();if(!sleeping)rest();$('[data-pet-open]').hidden?sleeping&&$('[data-pet-wake]').focus({preventScroll:true}):$('[data-pet-open]').focus({preventScroll:true});});
  $('[data-pet-form]').addEventListener('submit',e=>{e.preventDefault();answer($('#pet-question').value);});
  $('[data-pet-passport]').addEventListener('click',()=>passport());
  document.querySelectorAll('[data-pet-play]').forEach(b=>b.addEventListener('click',()=>{play(b.dataset.petPlay);$('[data-pet-message]').textContent=({pet:'摸摸羽冠，今天也要慢慢看。',hop:'跳一下！一起去认识广汉吧。',wave:'你好呀，我是堆堆。',think:'翻翻小手记，下一页会遇见什么呢？'})[b.dataset.petPlay];}));
  $('[data-pet-point]').addEventListener('click',()=>answer('有哪些路线？','point'));
  $('[data-pet-sleep]').addEventListener('click',async()=>{sleeping=true;storeSleep();$('[data-pet-message]').textContent='堆堆休息啦，随时可以再叫醒我。';await play('sleep');if(sleeping){syncSleep();dialog.close();}});
  function resume(){stop();if(!sleeping)rest();}
  document.addEventListener('visibilitychange',resume);
  document.addEventListener('guanghan:motionchange',resume);
  reduced.addEventListener('change',resume);
  window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
  document.querySelectorAll('dialog').forEach(el=>{
    if(el!==dialog)el.addEventListener('close',()=>{if(!sleeping)scheduleIdle();});
  });
  document.addEventListener('guanghan:stamp',()=>{if(!sleeping)play('stamp');});
  document.addEventListener('guanghan:passportchange',e=>$('[data-pet-count]').textContent=String(e.detail.count));
  document.addEventListener('guanghan:bookchange',suggestions);
  window.addEventListener('storage',e=>{if(e.key==='guanghan-pet-v1'){sleeping=e.newValue==='sleep';syncSleep();resume();}});
  $('[data-pet-count]').textContent=$('[data-passport-count]')?.textContent || '0';
  dock.hidden=false;document.documentElement.classList.add('companion-ready');syncSleep();
  if(!sleeping){let first=true;try{first=!sessionStorage.getItem('guanghan-pet-welcome');sessionStorage.setItem('guanghan-pet-welcome','1');}catch{/* Optional. */}first?play('wave'):scheduleIdle();}
})();
