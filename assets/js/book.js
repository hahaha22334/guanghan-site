(() => {
  'use strict';
  const stage=document.querySelector('[data-book-stage]'); if(!stage) return;
  const chapters=[...stage.querySelectorAll('[data-book-chapter]')];
  const links=[...document.querySelectorAll('[data-book-link]')];
  const prev=document.querySelector('[data-book-prev]'), next=document.querySelector('[data-book-next]');
  const mode=document.querySelector('[data-book-mode]');
  const key='guanghan-book-v1'; let index=0,plain=false,turning=false,pending;
  try { const saved=JSON.parse(localStorage.getItem(key)||'null'); index=Math.max(0,chapters.findIndex(c=>c.id===saved?.chapter)); plain=saved?.plain===true; } catch { /* Reading works without storage. */ }
  const hashIndex=()=>chapters.findIndex(c=>'#'+c.id===location.hash);
  if(hashIndex()>=0) index=hashIndex();
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({chapter:chapters[index].id,plain}));}catch{document.querySelector('.book-help').textContent='浏览器无法保存进度；本次阅读仍可正常翻页。';}};
  function render() {
    stage.classList.toggle('is-plain',plain); stage.classList.add('book-ready');
    chapters.forEach((c,i)=>{c.hidden=!plain && i!==index;});
    links.forEach((a,i)=>{if(i===index)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    prev.disabled=index===0;next.disabled=index===chapters.length-1;
    prev.hidden=plain;next.hidden=plain;
    mode.textContent=plain?'切换翻页阅读':'普通阅读';mode.setAttribute('aria-pressed',String(plain));
    document.querySelector('[data-book-counter]').textContent=`${index+1} / ${chapters.length} 章 · ${chapters[index].querySelector('.book-kicker').textContent}`;
    document.querySelector('[data-book-progress]').style.width=`${(index+1)/chapters.length*100}%`;
    document.dispatchEvent(new CustomEvent('guanghan:bookchange',{detail:{chapter:chapters[index].id}}));
    persist();
  }
  async function go(target,{focus=false,hash=true}={}) {
    if(target<0 || target>=chapters.length) return;
    if(turning){pending={target,focus,hash};return;}
    const before=index; const animate=!plain && target!==before && document.documentElement.dataset.motion!=='off' && !matchMedia('(prefers-reduced-motion: reduce)').matches && stage.animate;
    turning=true;
    if(animate) {
      const leaf=chapters[before].querySelector('.book-leaf--copy');
      await leaf.animate([{transform:'rotateY(0)',filter:'brightness(1)'},{transform:`rotateY(${target>before?-85:85}deg)`,filter:'brightness(.85)'}],{duration:180,easing:'ease-in',transformOrigin:'left center'}).finished.catch(()=>{});
    }
    index=target;render();
    if(hash) history.replaceState(null,'','#'+chapters[index].id);
    if(animate) await chapters[index].animate([{opacity:.25,transform:'translateX(8px)'},{opacity:1,transform:'translateX(0)'}],{duration:180,easing:'ease-out'}).finished.catch(()=>{});
    turning=false;
    if(plain) chapters[index].scrollIntoView({behavior:'instant',block:'start'});
    else if(target!==before && stage.getBoundingClientRect().top<80) stage.scrollIntoView({behavior:'instant',block:'start'});
    if(focus) {const title=chapters[index].querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});}
    if(pending){const request=pending;pending=null;go(request.target,request);}
  }
  prev.addEventListener('click',()=>go(index-1));next.addEventListener('click',()=>go(index+1));
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    const target=link?chapters.findIndex(c=>'#'+c.id===link.getAttribute('href')):-1;
    if(target>=0){event.preventDefault();go(target,{focus:true});}
    const stamp=event.target.closest('[data-book-stamp]');
    if(stamp) document.dispatchEvent(new CustomEvent('guanghan:passportopen',{detail:{place:stamp.dataset.bookStamp,collect:true,opener:stamp}}));
  });
  document.querySelector('[data-book-passport]').addEventListener('click',event=>document.dispatchEvent(new CustomEvent('guanghan:passportopen',{detail:{opener:event.currentTarget}})));
  mode.addEventListener('click',()=>{plain=!plain;render();});
  window.addEventListener('hashchange',()=>{if(hashIndex()>=0)go(hashIndex(),{hash:false});});
  document.addEventListener('keydown',event=>{
    if(plain || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('dialog[open]') || event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
    if(event.key==='ArrowLeft'){event.preventDefault();go(index-1);}
    if(event.key==='ArrowRight'){event.preventDefault();go(index+1);}
  });
  let touch;
  stage.addEventListener('touchstart',e=>{if(e.target.closest('.book-leaf--photo'))touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  stage.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5 && !plain)go(index+(dx<0?1:-1));},{passive:true});
  document.querySelectorAll('[data-book-tools]').forEach(el=>el.hidden=false);
  render();
})();
