/* Original, dependency-free enhancements inspired by photographic storytelling. */
(() => {
  'use strict';
  const normalizePassport = (value, ids) => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && ids.includes(id)))] : [];
  const pickInspiration = (places, filter, previous, random = Math.random()) => {
    const categories = {culture:['museum','history'],life:['life','food'],nature:['nature']};
    const pool = places.filter(p => !categories[filter] || categories[filter].includes(p.category));
    const fresh = pool.filter(p => p.id !== previous);
    const choices = fresh.length ? fresh : pool;
    const fraction = Number.isFinite(random) ? Math.max(0,Math.min(.999999,random)) : 0;
    return choices[Math.floor(fraction * choices.length)]?.id || null;
  };
  const canAutoplay = ({enabled,paused,hovered,focused,visible,hidden}) => enabled && !paused && !hovered && !focused && visible && !hidden;
  if (typeof module !== 'undefined' && module.exports) module.exports = {normalizePassport,pickInspiration,canAutoplay};
  if (typeof document === 'undefined') return;

  const $ = (s,scope=document) => scope.querySelector(s);
  const $$ = (s,scope=document) => [...scope.querySelectorAll(s)];
  const root = document.documentElement;
  const guide = window.GuanghanGuide;
  if (!guide) return;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#icon-${name}"></use></svg>`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let preference = 'on';
  try { preference = localStorage.getItem('guanghan-motion') === 'off' ? 'off' : 'on'; } catch { /* Browser storage is optional. */ }
  const enabled = () => preference !== 'off' && !reduce.matches;
  const animate = (node,frames,options) => enabled() && node?.animate?.(frames,options);
  const updateMotion = () => {
    root.dataset.motion = enabled() ? 'on' : 'off';
    const toggle = $('[data-motion-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-checked',String(enabled()));
      toggle.textContent = enabled() ? '已开启' : '已关闭';
      toggle.disabled = reduce.matches;
      $('[data-motion-note]').textContent = reduce.matches ? '已跟随系统的“减少动态效果”设置。' : '';
    }
    if (!enabled()) $$('.motion-enter.is-pending').forEach(el=>el.classList.remove('is-pending'));
    document.dispatchEvent(new Event('guanghan:motionchange'));
  };
  $('[data-motion-toggle]')?.addEventListener('click',()=>{
    preference = enabled() ? 'off' : 'on';
    try { localStorage.setItem('guanghan-motion',preference); } catch { /* Keep this session's setting. */ }
    updateMotion();
  });
  reduce.addEventListener?.('change',updateMotion);
  updateMotion();

  // Native dialogs preserve keyboard focus, Escape, and the existing page history.
  $$('dialog[data-passport-dialog], dialog[data-photo-dialog]').forEach(dialog=>{
    dialog.addEventListener('click',event=>{
      if (event.target.closest('[data-dialog-close]') || event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close',()=>{
      const opener = dialog._opener;
      if (opener?.isConnected) opener.focus({preventScroll:true});
    });
  });
  const openDialog = (dialog,opener) => {
    if (!dialog?.showModal) return false;
    dialog._opener = opener;
    dialog.showModal();
    animate(dialog,[{opacity:0},{opacity:1}],{duration:240,easing:'ease-out'});
    return true;
  };

  // Three scenes; text and calls to action stay still while the photographs change.
  const hero = $('[data-hero-reel]');
  if (hero) {
    root.classList.add('hero-in-view');
    const scenes = $$('[data-hero-scene]',hero);
    const buttons = $$('[data-hero-select]',hero);
    const controls = $('.hero-reel',hero);
    const pause = $('[data-hero-pause]',hero);
    let index = 0, timer, pending = 0, userPaused = false, hovered = false, focused = false, visible = true;
    const playing = () => canAutoplay({enabled:enabled(),paused:userPaused,hovered,focused,visible,hidden:document.hidden});
    const schedule = () => {
      clearTimeout(timer);
      const running = playing();
      hero.dataset.playback = running ? 'playing' : 'paused';
      controls.classList.toggle('is-playing',running);
      pause.disabled = !enabled();
      pause.setAttribute('aria-label',!enabled() ? '动态效果已关闭' : userPaused ? '播放图片轮播' : '暂停图片轮播');
      pause.setAttribute('aria-pressed',String(userPaused));
      $('use',pause).setAttribute('href',`assets/icons.svg#icon-${userPaused || !enabled() ? 'play' : 'pause'}`);
      if (running) timer = setTimeout(()=>show(index+1,false),8000);
    };
    const show = async (next,announce=true) => {
      const target = (next+scenes.length)%scenes.length;
      const request = ++pending;
      const img = $('img',scenes[target]);
      img.loading = 'eager';
      try { if (img.decode) await img.decode(); } catch {
        if (!img.complete || !img.naturalWidth) { schedule(); return; }
      }
      if (request !== pending) return;
      index = target;
      scenes.forEach((scene,i)=>{
        scene.classList.toggle('is-active',i===index);
        scene.setAttribute('aria-hidden',String(i!==index));
      });
      buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      if (announce) $('[data-hero-status]',hero).textContent = `正在看：${buttons[index].textContent.trim()}`;
      schedule();
    };
    buttons.forEach((button,i)=>button.addEventListener('click',()=>show(i)));
    $('[data-hero-prev]',hero)?.addEventListener('click',()=>show(index-1));
    $('[data-hero-next]',hero)?.addEventListener('click',()=>show(index+1));
    pause.addEventListener('click',()=>{ userPaused=!userPaused; schedule(); });
    hero.addEventListener('pointerenter',event=>{ if(event.pointerType==='mouse') { hovered=true; schedule(); } });
    hero.addEventListener('pointerleave',()=>{ hovered=false; schedule(); });
    hero.addEventListener('focusin',()=>{ focused=true; schedule(); });
    hero.addEventListener('focusout',event=>{ if(!hero.contains(event.relatedTarget)) { focused=false; schedule(); } });
    document.addEventListener('visibilitychange',schedule);
    document.addEventListener('guanghan:motionchange',schedule);
    window.addEventListener('pagehide',()=>clearTimeout(timer));
    window.addEventListener('pageshow',schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{
      visible = entries[0].isIntersecting;
      root.classList.toggle('hero-in-view',visible);
      schedule();
    },{threshold:.15}).observe(hero);
    let touch;
    hero.addEventListener('pointerdown',event=>{
      if (event.pointerType==='touch' && !event.target.closest('button,a')) touch = {x:event.clientX,y:event.clientY};
    });
    hero.addEventListener('pointerup',event=>{
      if(!touch) return;
      const dx = event.clientX-touch.x, dy = event.clientY-touch.y;
      touch=null;
      if (Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) show(index+(dx<0?1:-1));
    });
    hero.addEventListener('pointercancel',()=>{touch=null;});
    schedule();
  }

  const inspiration = $('[data-inspiration]');
  if (inspiration) {
    let filter='all', previous=$('[data-inspiration-card]:not([hidden])',inspiration)?.dataset.inspirationCard;
    const draw = () => {
      const id=pickInspiration(guide.places,filter,previous);
      if (!id) return;
      previous=id;
      const card=$(`[data-inspiration-card="${id}"]`,inspiration);
      $$('[data-inspiration-card]',inspiration).forEach(el=>{el.hidden=el!==card;});
      $('img',card).loading='eager';
      animate(card,[{opacity:0,transform:'translateY(24px) rotate(-2deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
      $('[data-inspiration-status]',inspiration).textContent=`这张灵感卡是：${guide.places.find(p=>p.id===id).name}`;
    };
    $$('[data-inspiration-filter]',inspiration).forEach(button=>button.addEventListener('click',()=>{
      filter=button.dataset.inspirationFilter;
      $$('[data-inspiration-filter]',inspiration).forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
      draw();
    }));
    $('[data-inspiration-draw]',inspiration)?.addEventListener('click',draw);
  }

  // Reading stamps are a separate record from the itinerary and are never sent away.
  const passport=$('[data-passport-dialog]');
  if (passport?.showModal) {
    const key='guanghan-reading-passport-v1', ids=guide.places.map(p=>p.id);
    const filename=location.pathname.split('/').pop();
    const pageCurrent=guide.places.find(p=>p.page===filename);
    let current=pageCurrent;
    let collected=[];
    try { collected=normalizePassport(JSON.parse(localStorage.getItem(key)||'[]'),ids); } catch { /* Ignore malformed or unavailable storage. */ }
    const render=()=>{
      $('[data-passport-count]').textContent=String(collected.length);
      document.dispatchEvent(new CustomEvent('guanghan:passportchange',{detail:{count:collected.length}}));
      $('[data-passport-progress]').textContent=`${collected.length} / ${ids.length} 枚印章`;
      $$('[data-stamp]',passport).forEach(link=>{
        const has=collected.includes(link.dataset.stamp);
        link.classList.toggle('is-collected',has);
        $('[data-stamp-state]',link).textContent=has?'已读':'待读';
        link.setAttribute('aria-label',`${has?'已盖章，重读':'阅读'}${guide.places.find(p=>p.id===link.dataset.stamp).name}`);
      });
      const action=$('[data-passport-action]');
      if(current) {
        const has=collected.includes(current.id);
        action.innerHTML=`<button class="btn btn-primary" type="button" data-collect-stamp${has?' disabled':''}>${icon(has?'check':'stamp')}${has?'这一页，已经留在护照里':'为这一页盖章'}</button>`;
      } else {
        const next=guide.places.find(p=>!collected.includes(p.id));
        action.innerHTML=next ? `<a class="btn btn-primary" href="${next.page}">读下一段故事${icon('arrow-right')}</a>` : `<a class="btn btn-primary" href="my-trip.html">七枚集齐，安排一次出发${icon('arrow-right')}</a>`;
      }
    };
    $('[data-passport-open]').addEventListener('click',event=>{current=pageCurrent;render();openDialog(passport,event.currentTarget);});
    document.addEventListener('guanghan:passportopen',event=>{
      const candidate=guide.places.find(p=>p.id===event.detail?.place);
      current=filename==='book.html' && candidate ? candidate : pageCurrent;
      render();openDialog(passport,event.detail?.opener || $('[data-pet-open]') || $('[data-passport-open]'));
      if(event.detail?.collect && current) $('[data-collect-stamp]',passport)?.click();
    });
    passport.addEventListener('click',event=>{
      if(!event.target.closest('[data-collect-stamp]') || !current || collected.includes(current.id)) return;
      collected.push(current.id);
      document.dispatchEvent(new CustomEvent('guanghan:stamp',{detail:{place:current.id}}));
      try { localStorage.setItem(key,JSON.stringify(collected)); } catch {
        $('[data-passport-storage]').textContent='浏览器暂时不能保存印章；本次打开页面时仍可使用。';
      }
      render();
      $('[data-passport-progress]').setAttribute('role','status');
      $('[data-passport-progress]').textContent=`已收下${current.name} · ${collected.length} / ${ids.length} 枚印章`;
      $('[data-passport-progress]').tabIndex=-1;
      $('[data-passport-progress]').focus({preventScroll:true});
      animate($(`[data-stamp="${current.id}"] .passport-stamp__seal`,passport),[{opacity:0,transform:'scale(1.7) rotate(-24deg)'},{opacity:1,transform:'scale(1) rotate(-8deg)'}],{duration:560,easing:'cubic-bezier(.2,.7,.2,1)'});
    });
    window.addEventListener('storage',event=>{
      if(event.key!==key) return;
      try { collected=normalizePassport(JSON.parse(event.newValue||'[]'),ids); } catch { collected=[]; }
      render();
    });
    render();
  }

  const viewer=$('[data-photo-dialog]');
  if(viewer?.showModal) {
    let photos=[],index=0;
    const renderPhoto=()=>{
      const figure=photos[index], picture=$('picture',figure).cloneNode(true);
      $$('source',picture).forEach(source=>source.sizes='100vw');
      const img=$('img',picture); img.loading='eager'; img.sizes='100vw'; img.removeAttribute('fetchpriority');
      $('[data-photo-image]').replaceChildren(picture);
      const caption=$('[data-photo-caption]'); caption.replaceChildren();
      const original=$('figcaption',figure);
      if(original) caption.append(...[...original.childNodes].map(n=>n.cloneNode(true)));
      else caption.textContent=img.alt;
      $('[data-photo-counter]').textContent=`${index+1} / ${photos.length} · ${img.alt}`;
      $('[data-photo-prev]').hidden=photos.length<2;
      $('[data-photo-next]').hidden=photos.length<2;
      animate($('[data-photo-image]'),[{opacity:.25,transform:'scale(.985)'},{opacity:1,transform:'scale(1)'}],{duration:350,easing:'ease-out'});
    };
    const move=step=>{index=(index+step+photos.length)%photos.length;renderPhoto();};
    $$('main figure').filter(figure=>$(':scope > picture',figure) && !figure.closest('a')).forEach(figure=>{
      figure.classList.add('photo-zoomable');
      const button=document.createElement('button'); button.type='button'; button.className='icon-button photo-open motion-tools';
      button.setAttribute('aria-label',`放大图片：${$('img',figure).alt}`); button.setAttribute('aria-haspopup','dialog'); button.innerHTML=icon('expand');
      figure.append(button);
      const open=()=>{
        const group=figure.closest('section')||$('main');
        photos=$$('figure.photo-zoomable',group); index=photos.indexOf(figure);
        renderPhoto();openDialog(viewer,button);
      };
      button.addEventListener('click',open);
      $('picture',figure).addEventListener('click',open);
    });
    $('[data-photo-prev]').addEventListener('click',()=>move(-1));
    $('[data-photo-next]').addEventListener('click',()=>move(1));
    viewer.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight' || event.key==='ArrowLeft') {event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
    });
    let start;
    $('[data-photo-image]').addEventListener('pointerdown',event=>{if(event.pointerType==='touch')start={x:event.clientX,y:event.clientY};});
    $('[data-photo-image]').addEventListener('pointerup',event=>{
      if(start && Math.abs(event.clientX-start.x)>60 && Math.abs(event.clientY-start.y)<60)move(event.clientX<start.x?1:-1);
      start=null;
    });
    $('[data-photo-image]').addEventListener('pointercancel',()=>{start=null;});
  }

  // Reveal once, keep it readable on return, and let the normal document scroll.
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting) {entry.target.classList.remove('is-pending');observer.unobserve(entry.target);}
    }),{threshold:.06,rootMargin:'0px 0px -24px 0px'});
    $$('.section-heading, .home-orientation__heading, .home-stories > a, .route-teaser, .destination-card, .guide-branch, .gallery-introduction, .topic-photo-essay > figure, .gallery-card, .station-card').filter(el=>!el.closest('.reveal')).forEach((el,i)=>{
      el.classList.add('motion-enter'); el.style.setProperty('--enter-delay',`${(i%3)*65}ms`);
      if(enabled())el.classList.add('is-pending');observer.observe(el);
    });
    $$('.map-canvas').forEach(map=>new IntersectionObserver(entries=>map.classList.toggle('is-in-view',entries[0].isIntersecting)).observe(map));
  }
  const progress=$('[data-reading-progress]');
  let scheduled=false;
  const updateProgress=()=>{
    const total=root.scrollHeight-innerHeight;
    if(progress)progress.style.transform=`scaleX(${total>0?Math.min(1,Math.max(0,scrollY/total)):0})`;
    scheduled=false;
  };
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}},{passive:true});
  window.addEventListener('resize',updateProgress);
  if('ResizeObserver' in window)new ResizeObserver(updateProgress).observe(document.body);
  updateProgress();
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-route-tab], [data-image-tab], [data-map-place], [data-arrival-tab]');
    if(!trigger)return;
    const group=trigger.closest('[data-route-explorer], [data-image-tabs], [data-interactive-map], #arrival');
    const panel=group?.querySelector('[data-route-panel]:not([hidden]), [data-image-panel]:not([hidden]), [data-map-detail], [data-arrival-panel]:not([hidden])');
    animate(panel,[{opacity:.3,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'});
  });
  window.addEventListener('pageshow',()=>{if(scrollY>0)$$('.motion-enter.is-pending').forEach(el=>el.classList.remove('is-pending'));});
  root.classList.add('motion-ready');
})();
