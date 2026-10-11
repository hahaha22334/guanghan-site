(() => {
  'use strict';
  const stage=document.querySelector('[data-book-stage]');if(!stage)return;
  const chapters=[...stage.querySelectorAll('[data-book-chapter]')];
  const links=[...document.querySelectorAll('[data-book-link]')];
  const prev=document.querySelector('[data-book-prev]'),next=document.querySelector('[data-book-next]');
  const controls=document.querySelector('.book-controls');
  const corners=[...stage.querySelectorAll('[data-book-step]')];
  const mode=document.querySelector('[data-book-mode]'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const key='guanghan-book-v1';
  let index=0,plain=false,turning=false,pending,activeTurn,revision=0;
  try {const saved=JSON.parse(localStorage.getItem(key)||'null');index=Math.max(0,chapters.findIndex(c=>c.id===saved?.chapter));plain=saved?.plain===true;}catch{/* Reading works without storage. */}
  const hashIndex=()=>chapters.findIndex(c=>'#'+c.id===location.hash);
  if(hashIndex()>=0)index=hashIndex();
  let destination=index;
  const canAnimate=()=>!plain && !document.hidden && !reduced.matches && document.documentElement.dataset.motion!=='off' && typeof stage.animate==='function';
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({chapter:chapters[index].id,plain}));}catch{document.querySelector('.book-help').textContent='浏览器无法保存进度；本次阅读仍可正常翻页。';}};
  function render() {
    document.documentElement.classList.toggle('is-book-paging',!plain);
    stage.classList.toggle('is-plain',plain);stage.classList.add('book-ready');
    stage.setAttribute('aria-busy',String(turning));
    chapters.forEach((c,i)=>{c.hidden=!plain && i!==index;c.inert=!plain && (i!==index || turning);});
    links.forEach((a,i)=>{if(i===index)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    controls.hidden=plain;prev.disabled=index===0;next.disabled=index===chapters.length-1;prev.hidden=plain;next.hidden=plain;
    corners.forEach(button=>{button.hidden=plain;button.disabled=Number(button.dataset.bookStep)<0?prev.disabled:next.disabled;});
    mode.textContent=plain?'切换翻页阅读':'普通阅读';mode.setAttribute('aria-pressed',String(plain));
    const counter=document.querySelector('[data-book-counter]');
    counter.textContent=`${index+1} / ${chapters.length} 章`;
    counter.setAttribute('aria-label',`第 ${index+1} 章，共 ${chapters.length} 章：${chapters[index].querySelector('.book-kicker').textContent}`);
    document.querySelector('[data-book-progress]').style.width=`${(index+1)/chapters.length*100}%`;
    document.dispatchEvent(new CustomEvent('guanghan:bookchange',{detail:{chapter:chapters[index].id}}));persist();
  }
  function snapshot(element) {
    const clone=element.cloneNode(true);clone.hidden=false;clone.inert=true;
    // Decorative faces must not duplicate document IDs, controls or action hooks.
    for(const el of [clone,...clone.querySelectorAll('*')]) {
      for(const attr of [...el.attributes])if(attr.name==='id' || attr.name.startsWith('data-') || attr.name==='aria-labelledby')el.removeAttribute(attr.name);
    }
    clone.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(el=>el.tabIndex=-1);
    return clone;
  }
  function turnPage(before,target,forward,box) {
    const mobile=matchMedia('(max-width: 767px)').matches,current=chapters[target];
    const height=Math.max(box.height,current.getBoundingClientRect().height);
    const oldHeight=stage.style.minHeight,oldChapterHeight=current.style.minHeight;
    current.style.minHeight=`${height}px`;
    const style=getComputedStyle(stage);
    stage.style.minHeight=`${height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+2}px`;
    const overlay=document.createElement('div');overlay.className='book-turn';overlay.dataset.bookTurn=forward?'next':'previous';
    overlay.setAttribute('aria-hidden','true');overlay.inert=true;
    Object.assign(overlay.style,{left:`${current.offsetLeft}px`,top:`${current.offsetTop}px`,width:`${box.width}px`,height:`${height}px`});
    const cast=document.createElement('div');cast.className='book-turn-cast';overlay.append(cast);
    if(!mobile) {
      const still=document.createElement('div');still.className=`book-turn-still ${forward?'is-left':'is-right'}`;
      still.append(snapshot(before.querySelector(forward?'.book-leaf--photo':'.book-leaf--copy')));overlay.append(still);
    }
    const sheet=document.createElement('div');sheet.className=`book-turn-sheet ${forward?'is-forward':'is-backward'}${mobile?' is-single':''}`;
    const front=document.createElement('div'),back=document.createElement('div');
    front.className='book-turn-face book-turn-face--front';back.className='book-turn-face book-turn-face--back';
    front.append(snapshot(mobile?before:before.querySelector(forward?'.book-leaf--copy':'.book-leaf--photo')));
    back.append(snapshot(mobile?current:current.querySelector(forward?'.book-leaf--photo':'.book-leaf--copy')));
    const shades=[front,back].map(face=>{const shade=document.createElement('span');shade.className='book-turn-shade';face.append(shade);return shade;});
    sheet.append(front,back);overlay.append(sheet);stage.append(overlay);stage.classList.add('is-turning');
    const sign=forward?-1:1,duration=mobile?720:860;
    const options={duration,easing:'cubic-bezier(.32,.08,.2,1)',fill:'both'};
    const animations=[sheet.animate([
      {offset:0,transform:'translateZ(0) rotateY(0deg) skewY(0deg)',boxShadow:'0 0 0 #17362e00'},
      {offset:.16,transform:`translateZ(8px) rotateY(${sign*12}deg) skewY(${sign*.5}deg)`,boxShadow:'0 8px 18px #17362e24'},
      {offset:.48,transform:`translateZ(24px) rotateY(${sign*86}deg) skewY(${sign*2}deg)`,boxShadow:'0 14px 28px #17362e38'},
      {offset:.8,transform:`translateZ(10px) rotateY(${sign*158}deg) skewY(${sign*.7}deg)`,boxShadow:'0 5px 12px #17362e20'},
      {offset:1,transform:`translateZ(0) rotateY(${sign*180}deg) skewY(0deg)`,boxShadow:'0 0 0 #17362e00'}
    ],options),cast.animate([{opacity:0},{opacity:.65,offset:.45},{opacity:0}],options),
    ...shades.map(shade=>shade.animate([{opacity:0},{opacity:.6,offset:.5},{opacity:0}],options))];
    let cleaned=false;
    const cleanup=()=>{if(cleaned)return;cleaned=true;animations.forEach(animation=>animation.cancel());overlay.remove();stage.classList.remove('is-turning');stage.style.minHeight=oldHeight;current.style.minHeight=oldChapterHeight;};
    return {finished:Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))),cancel:cleanup,cleanup};
  }
  async function go(target,{focus=false,hash=true}={}) {
    if(target<0 || target>=chapters.length)return;
    destination=target;
    if(turning){pending={target,focus,hash};return;}
    const before=index,request=++revision,box=chapters[before].getBoundingClientRect();turning=true;stage.setAttribute('aria-busy','true');
    try {
      if(target!==before && canAnimate()) {
        await Promise.all([...chapters[target].querySelectorAll('img')].map(img=>{img.loading='eager';return img.decode().catch(()=>{});}));
      }
      if(request!==revision)return;
      index=target;render();if(hash)history.replaceState(null,'','#'+chapters[index].id);
      if(target!==before && canAnimate()) {
        activeTurn=turnPage(chapters[before],target,target>before,box);
        await activeTurn.finished;
      }
    } finally {
      if(request===revision){activeTurn?.cleanup();activeTurn=null;turning=false;render();}
    }
    if(request!==revision)return;
    // Only an explicit directory jump in ordinary reading changes the scroll position.
    if(plain && focus)chapters[index].scrollIntoView({behavior:'instant',block:'start'});
    if(focus){const title=chapters[index].querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});}
    if(pending){const nextRequest=pending;pending=null;go(nextRequest.target,nextRequest);}
  }
  function step(delta){go(Math.max(0,Math.min(chapters.length-1,destination+delta)));}
  prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
  corners.forEach(button=>button.addEventListener('click',()=>step(Number(button.dataset.bookStep))));
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    const target=link?chapters.findIndex(c=>'#'+c.id===link.getAttribute('href')):-1;
    if(target>=0){event.preventDefault();go(target,{focus:true});}
    const stamp=event.target.closest('[data-book-stamp]');
    if(stamp)document.dispatchEvent(new CustomEvent('guanghan:passportopen',{detail:{place:stamp.dataset.bookStamp,collect:true,opener:stamp}}));
  });
  document.querySelector('[data-book-passport]').addEventListener('click',event=>document.dispatchEvent(new CustomEvent('guanghan:passportopen',{detail:{opener:event.currentTarget}})));
  mode.addEventListener('click',()=>{revision++;activeTurn?.cancel();activeTurn=null;turning=false;pending=null;destination=index;plain=!plain;render();});
  window.addEventListener('hashchange',()=>{if(hashIndex()>=0)go(hashIndex(),{hash:false});});
  // Finish an in-flight turn immediately when motion stops or its geometry changes.
  const settle=()=>activeTurn?.cancel();
  window.addEventListener('resize',settle);document.addEventListener('visibilitychange',settle);
  document.addEventListener('guanghan:motionchange',settle);reduced.addEventListener('change',settle);
  document.addEventListener('keydown',event=>{
    if(plain || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('dialog[open]') || event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
    if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();step(1);}
  });
  let touch;
  stage.addEventListener('touchstart',e=>{touch=null;if(e.target.closest('.book-leaf--photo'))touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  stage.addEventListener('touchcancel',()=>{touch=null;});
  stage.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5 && !plain)step(dx<0?1:-1);},{passive:true});
  document.querySelectorAll('[data-book-tools]').forEach(el=>el.hidden=false);render();
})();
