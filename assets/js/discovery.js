(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const legacy = {'#places':'explore.html#places','#map':'explore.html#map','#season':'explore.html#season','#time':'explore.html#time','#travel':'travel.html#faq','#life':'old-town.html'};
  if (/\/(?:index\.html)?$/.test(location.pathname) && legacy[location.hash]) {
    location.replace(legacy[location.hash]); return;
  }
  const notes = {
    all:'四条分支连起网站内容，可以从任意一处开始。',
    discover:'先从目的地总览认识这座城，再进入感兴趣的景点与专题。',
    routes:'按停留时间与同行人群选路线，喜欢的安排可直接加入行程。',
    prepare:'先确认到达方式与预约，再查看这一站的转场和便民信息。',
    plan:'把喜欢的地方连成行程，调整后下载、分享或打印。'
  };
  function focusBranch(id,scroll=false) {
    if(!Object.hasOwn(notes,id)) id='all';
    $$('[data-guide-focus]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.guideFocus===id));
      if(button.dataset.guideFocus!=='all') button.setAttribute('aria-controls','guide-'+button.dataset.guideFocus);
    });
    $$('[data-guide-branch]').forEach(branch=>branch.dataset.highlighted=String(branch.dataset.guideBranch===id));
    if($('[data-guide-note]')) $('[data-guide-note]').textContent=notes[id];
    const target=$('#guide-'+id);
    if(scroll&&target) {
      target.tabIndex=-1; target.focus({preventScroll:true});
      target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    }
  }
  $$('[data-guide-focus]').forEach(button=>button.addEventListener('click',()=>focusBranch(button.dataset.guideFocus,true)));
  if($('[data-guide-branch]')) focusBranch(location.hash.replace('#guide-',''));
  const season=window.GuanghanGuide?.seasons.find(s=>s.months.includes(new Date().getMonth()+1));
  if(season) $$('[data-home-season]').forEach(panel=>panel.hidden=panel.dataset.homeSeason!==season.id);

  const tabs=$$('[data-arrival-tab]'),panels=$$('[data-arrival-panel]');
  if(tabs.length) {
    tabs[0].parentElement.setAttribute('role','tablist');
    function select(id,focus=false) {
      if(!tabs.some(t=>t.dataset.arrivalTab===id)) id=tabs[0].dataset.arrivalTab;
      tabs.forEach(t=>{
        const active=t.dataset.arrivalTab===id;
        t.id='tab-arrival-'+t.dataset.arrivalTab;
        t.setAttribute('role','tab');t.setAttribute('aria-selected',String(active));
        t.setAttribute('aria-controls','arrival-'+t.dataset.arrivalTab);t.tabIndex=active?0:-1;
        if(active&&focus)t.focus();
      });
      panels.forEach(p=>{
        p.hidden=p.dataset.arrivalPanel!==id;p.setAttribute('role','tabpanel');
        p.setAttribute('aria-labelledby','tab-arrival-'+p.dataset.arrivalPanel);p.tabIndex=0;
      });
    }
    tabs.forEach((tab,i)=>{
      tab.addEventListener('click',event=>{event.preventDefault();select(tab.dataset.arrivalTab);});
      tab.addEventListener('keydown',event=>{
        const next=event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
        if(next!==null){event.preventDefault();select(tabs[next].dataset.arrivalTab,true);}
      });
    });
    select(location.hash.replace('#arrival-',''));
    function openAnchor() {
      if(location.hash.startsWith('#arrival-'))select(location.hash.slice(9));
      if(location.hash.startsWith('#place-')) {
        const details=$$('.practical-list > details').find(p=>'#'+p.id===location.hash);
        if(details){details.open=true;details.scrollIntoView({block:'start'});}
      }
    }
    openAnchor();window.addEventListener('hashchange',openAnchor);
  }
})();
