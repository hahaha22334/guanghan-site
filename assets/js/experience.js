(() => {
  'use strict';
  const guide = window.GuanghanGuide;
  if (!guide) return;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const place = id => guide.places.find(p => p.id === id);
  const route = id => guide.routes.find(r => r.id === id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#icon-${id}"></use></svg>`;
  const mapUrl = query => `https://www.amap.com/search?query=${encodeURIComponent(query)}`;
  const storeKey = 'guanghan-field-notes-v3';
  const blankState = () => ({saved: [], stops: [], route: '', date: '', checks: {}});
  let state = blankState();
  let storageAvailable = true;
  let undoState;
  let toastTimer;
  const normalizeStops = stops => {
    const groups = new Set();
    return (Array.isArray(stops) ? stops : []).filter(s => {
      const p = s && place(s.id);
      if (!p || groups.has(p.group)) return false;
      groups.add(p.group);
      return true;
    }).slice(0, 7).map(s => ({id:s.id, day:s.day === 2 ? 2 : 1})).sort((a,b) => a.day-b.day);
  };
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey) || 'null');
    if (raw && typeof raw === 'object') {
      state.saved = [...new Set(Array.isArray(raw.saved) ? raw.saved.filter(id => place(id)) : [])];
      state.stops = normalizeStops(raw.stops);
      state.route = route(raw.route) ? raw.route : '';
      state.date = /^\d{4}-\d{2}-\d{2}$/.test(raw.date || '') ? raw.date : '';
      state.checks = raw.checks && typeof raw.checks === 'object' ? raw.checks : {};
    }
    localStorage.setItem(storeKey, JSON.stringify(state));
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); }
    catch { storageAvailable = false; }
    sync();
  }
  function toast(message, action) {
    const node = $('[data-toast]');
    if (!node) return;
    clearTimeout(toastTimer);
    node.replaceChildren(document.createTextNode(message));
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => { action.run(); node.classList.remove('is-visible'); });
      node.append(button);
    }
    node.classList.add('is-visible');
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), action ? 10000 : 4500);
  }
  function copyFallback(text, title) {
    const panel = document.createElement('dialog');
    panel.className = 'copy-dialog';
    const heading = document.createElement('h2'); heading.textContent = title;
    const note = document.createElement('p'); note.textContent = '请复制下方已选中的内容。';
    const textarea = document.createElement('textarea'); textarea.value = text; textarea.readOnly = true;
    textarea.setAttribute('aria-label',title);
    const close = document.createElement('button'); close.className = 'btn btn-primary'; close.textContent = '完成';
    close.addEventListener('click', () => { panel.close(); panel.remove(); });
    panel.addEventListener('cancel', () => panel.remove());
    panel.append(heading,note,textarea,close); document.body.append(panel); panel.showModal(); textarea.focus(); textarea.select();
  }
  async function copy(text, title = '复制内容') {
    try { await navigator.clipboard.writeText(text); toast(title+'成功'); }
    catch { copyFallback(text, title); }
  }
  function setTabBehavior(links, panels, getId, initial) {
    if (!links.length) return;
    links[0].parentElement.setAttribute('role','tablist');
    function select(id, focus = false) {
      if (!links.some(link => getId(link) === id)) id = getId(links[0]);
      links.forEach(link => {
        const active = getId(link) === id;
        link.setAttribute('role','tab'); link.setAttribute('aria-selected',String(active)); link.tabIndex = active ? 0 : -1;
        link.id ||= 'tab-'+link.getAttribute('href').slice(1);
        link.setAttribute('aria-controls',link.getAttribute('href').slice(1));
        if (active && focus) link.focus();
      });
      panels.forEach(panel => {
        const active = panel.id === links.find(link => getId(link) === id).getAttribute('href').slice(1);
        panel.hidden = !active; panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-labelledby',links.find(link=>link.getAttribute('href').slice(1)===panel.id).id);
        panel.tabIndex = 0;
      });
    }
    links.forEach((link,index) => {
      link.addEventListener('click',event => { event.preventDefault(); select(getId(link)); });
      link.addEventListener('keydown',event => {
        let next;
        if (event.key === 'ArrowRight') next = (index+1)%links.length;
        if (event.key === 'ArrowLeft') next = (index-1+links.length)%links.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = links.length-1;
        if (next !== undefined) { event.preventDefault(); select(getId(links[next]),true); }
      });
    });
    select(initial);
  }
  $$('[data-route-explorer]').forEach(explorer => {
    const query = new URLSearchParams(location.search).get('route');
    setTabBehavior($$('[data-route-tab]',explorer), $$('[data-route-panel]',explorer),link=>link.dataset.routeTab,route(query) ? query : 'classic');
  });
  $$('[data-image-tabs]').forEach(group => {
    const season = guide.seasons.find(s => s.months.includes(new Date().getMonth()+1));
    const initial = group.dataset.imageTabs === 'season' ? season.id : guide.eras[0].id;
    setTabBehavior($$('[data-image-tab]',group),$$('[data-image-panel]',group),link=>link.dataset.imageTab,initial);
  });
  const map = $('[data-interactive-map]');
  if (map) {
    $$('[data-map-place]',map).forEach((button,index) => button.addEventListener('click',() => {
      const p = place(button.dataset.mapPlace);
      $$('[data-map-place]',map).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      const detail = $('[data-map-detail]',map);
      detail.innerHTML = `<h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p><p class="map-duration">${icon('clock')}${esc(p.durationLabel)}</p><a class="btn btn-primary" href="${p.page}">查看旅行指南${icon('arrow-right')}</a><button class="btn btn-secondary" type="button" data-add-trip="${p.id}">${icon('plus')}加入行程</button><a class="text-link" href="${mapUrl(p.mapQuery)}" target="_blank" rel="noopener noreferrer">在高德地图查路线${icon('external')}</a>`;
    }));
  }
  const search = $('[data-place-search]');
  let filter = 'all';
  function filterPlaces() {
    const q = (search?.value || '').trim().toLowerCase();
    let count = 0;
    $$('[data-place-card]').forEach(card => {
      const p = place(card.dataset.placeCard);
      const categoryMatch = filter === 'all' || (filter === 'culture' && ['history','museum'].includes(p.category)) || (filter === 'life' && ['life','food'].includes(p.category)) || filter === p.category;
      const text = [p.name,p.summary,p.zone,...p.tags].join(' ').toLowerCase();
      card.hidden = !(categoryMatch && (!q || text.includes(q)));
      if (!card.hidden) count++;
    });
    if ($('[data-place-count]')) $('[data-place-count]').textContent = `${count} 处值得停留的地方`;
    if ($('[data-place-empty]')) $('[data-place-empty]').hidden = count !== 0;
  }
  search?.addEventListener('input',filterPlaces);
  $$('[data-place-filter]').forEach(button => button.addEventListener('click',() => {
    filter = button.dataset.placeFilter;
    $$('[data-place-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); filterPlaces();
  }));
  $('[data-faq-search]')?.addEventListener('input',event => {
    const q = event.target.value.trim().toLowerCase();
    let count = 0;
    $$('[data-faq]').forEach(detail=>{
      const item = guide.faq[Number(detail.dataset.faq)];
      detail.hidden = !!q && ![item.question,item.answer,item.keywords].join(' ').toLowerCase().includes(q);
      if (!detail.hidden) count++;
    });
    $('[data-faq-empty]').hidden = count !== 0;
  });
  function add(id) {
    const p = place(id);
    if (!p) return;
    const sameGroup = state.stops.find(s => place(s.id).group === p.group);
    if (sameGroup) { toast(p.group === 'fanghu' ? '雒城与房湖已合并在行程中' : '这个地点已在行程中', {label:'查看行程',run:()=>location.href=tripLink()}); return; }
    state.stops.push({id,day:state.stops.at(-1)?.day || 1}); state.route = '';
    persist(); toast('已加入我的行程',{label:'查看行程',run:()=>location.href=tripLink()});
  }
  function useRoute(id, navigate = true) {
    const r = route(id); if (!r) return;
    undoState = JSON.parse(JSON.stringify(state));
    state.stops = normalizeStops(r.steps.map(s=>({id:s.place,day:s.day}))); state.route = id;
    persist();
    if (navigate && !$('[data-trip-stops]')) { location.href=tripLink(); return; }
    toast('已载入'+r.label,{label:'撤销',run:()=>{state=undoState;persist();}});
  }
  document.addEventListener('click',event=>{
    const save = event.target.closest('[data-save]');
    if (save) {
      const id = save.dataset.save;
      if (!place(id)) return;
      const exists = state.saved.includes(id);
      state.saved = exists ? state.saved.filter(item=>item!==id) : [...state.saved,id];
      persist(); toast(exists ? '已取消收藏' : storageAvailable ? '已收藏，可以在我的行程中找到' : '已收藏（当前浏览器限制存储，仅本页有效）');
    }
    const addButton = event.target.closest('[data-add-trip]'); if (addButton) add(addButton.dataset.addTrip);
    const use = event.target.closest('[data-use-route]'); if (use) useRoute(use.dataset.useRoute);
  });
  function sync() {
    $$('[data-save]').forEach(button=>{
      const saved = state.saved.includes(button.dataset.save);
      button.setAttribute('aria-pressed',String(saved));
      button.setAttribute('aria-label',(saved?'取消收藏':'收藏')+place(button.dataset.save).name);
      const label = $('[data-save-label]',button); if (label) label.textContent=saved?'已收藏':'收藏';
    });
    $$('[data-trip-count]').forEach(node=>node.textContent=String(state.stops.length));
    renderTrip();
    if (!storageAvailable && $('[data-storage-note]')) $('[data-storage-note]').textContent='当前浏览器无法持久保存，操作在本次页面有效。请及时保存行程卡或复制行程链接。';
  }
  function renderTrip() {
    const list = $('[data-trip-stops]'); if (!list) return;
    list.replaceChildren();
    $('[data-trip-empty]').hidden = state.stops.length !== 0;
    const total = state.stops.reduce((sum,s)=>sum+place(s.id).duration,0);
    const days = new Set(state.stops.map(s=>s.day)).size;
    $('[data-trip-summary]').textContent = state.stops.length ? `${days} 天 · ${state.stops.length} 站 · 停留约 ${formatDuration(total)}` : '还没有安排地点，先选一条路线，或从收藏中加入。';
    const transfers = $('[data-trip-transfers]');
    if (transfers) {
      const selected = route(state.route);
      transfers.innerHTML = selected ? `<ol class="transfer-notes">${state.stops.map(stop=>{
        const step = selected.steps.find(s=>s.place===stop.id&&s.day===stop.day);
        return step ? `<li><strong>${esc(step.title)}</strong><p>${esc(step.transfer)}</p></li>` : '';
      }).join('')}</ol>` : '';
    }
    let currentDay;
    state.stops.forEach((s,index)=>{
      const p = place(s.id);
      const r = route(state.route);
      const scheduled = r?.steps.find(step=>step.place===s.id && step.day===s.day);
      if (currentDay !== s.day) {
        currentDay=s.day;
        const h=document.createElement('h3'); h.className='trip-day-title'; h.textContent=`第${s.day === 1?'一':'二'}天`; list.append(h);
      }
      const article=document.createElement('article'); article.className='trip-row'; article.dataset.tripId=p.id;
      article.innerHTML=`<span class="trip-row__number">${String(index+1).padStart(2,'0')}</span><div><h3><a href="${p.page}">${p.group==='fanghu'?'雒城与房湖联游':esc(p.name)}</a></h3><p>${scheduled ? `<strong>${scheduled.time} · </strong>${esc(scheduled.note)}` : esc(p.tip)}</p><div class="trip-row__meta"><span>${esc(p.durationLabel)}</span><a href="${mapUrl(scheduled && r.id==='blossom' && p.id==='food'?'广汉连山镇回锅肉':p.mapQuery)}" target="_blank" rel="noopener noreferrer">地图导航${icon('external')}</a></div><div class="trip-row__controls"><button type="button" data-move="up" data-index="${index}" aria-label="上移${esc(p.name)}"${index===0?' disabled':''}>${icon('arrow-up')}</button><button type="button" data-move="down" data-index="${index}" aria-label="下移${esc(p.name)}"${index===state.stops.length-1?' disabled':''}>${icon('arrow-down')}</button><label class="sr-only" for="day-${p.id}">安排${esc(p.name)}在第几天</label><select id="day-${p.id}" data-stop-day="${index}"><option value="1"${s.day===1?' selected':''}>第一天</option><option value="2"${s.day===2?' selected':''}>第二天</option></select><button type="button" class="trip-remove" data-remove="${index}" aria-label="移除${esc(p.name)}">移除</button></div></div>`;
      list.append(article);
    });
    const saved=$('[data-saved-places]');
    saved.innerHTML=state.saved.length?state.saved.map(id=>{
      const p=place(id); const added=state.stops.some(s=>place(s.id).group===p.group);
      return `<div class="saved-place"><a href="${p.page}">${esc(p.name)}<small>${esc(p.durationLabel)}</small></a><button type="button" data-add-trip="${id}" aria-label="将${esc(p.name)}加入行程"${added?' disabled':''}>${icon(added?'check':'plus')}</button></div>`;
    }).join(''):'<p class="saved-empty">看到喜欢的地方，点一下“收藏”，它就会出现在这里。</p>';
    const date=$('[data-trip-date]'); if (date && date.value!==state.date) date.value=state.date;
    if (state.route) $('[data-route-select]').value=state.route;
    $$('[data-check]').forEach(input=>input.checked=!!state.checks[input.dataset.check]);
    $('[data-checklist-progress]').textContent=`${$$('[data-check]').filter(input=>input.checked).length} / 4 项已准备`;
    const meter = $('[data-checklist-meter]');
    if (meter) meter.value = $$('[data-check]').filter(input=>input.checked).length;
    $$('[data-download-trip],[data-copy-trip],[data-share-trip],[data-print-trip],[data-clear-trip]').forEach(b=>b.disabled=!state.stops.length);
  }
  function formatDuration(minutes) { const h=Math.floor(minutes/60),m=minutes%60; return `${h} 小时${m?' '+m+' 分钟':''}`; }
  $('[data-load-route]')?.addEventListener('click',()=>useRoute($('[data-route-select]').value,false));
  $('[data-trip-date]')?.addEventListener('change',event=>{state.date=event.target.value;persist();});
  $('[data-trip-stops]')?.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove]');
    if (remove) { undoState=JSON.parse(JSON.stringify(state)); state.stops.splice(Number(remove.dataset.remove),1);state.route='';persist();toast('已从行程移除',{label:'撤销',run:()=>{state=undoState;persist();}}); }
    const move=event.target.closest('[data-move]');
    if (move) {
      const i=Number(move.dataset.index),target=i+(move.dataset.move==='up'?-1:1);
      if (target<0||target>=state.stops.length) return;
      const moved=state.stops[i];
      moved.day=state.stops[target].day;
      [state.stops[i],state.stops[target]]=[state.stops[target],state.stops[i]];
      state.route='';persist();
      $(`[data-trip-id="${moved.id}"] [data-move="${move.dataset.move}"]`)?.focus();
      toast('已调整停留顺序');
    }
  });
  $('[data-trip-stops]')?.addEventListener('change',event=>{
    if (event.target.matches('[data-stop-day]')) { state.stops[Number(event.target.dataset.stopDay)].day=Number(event.target.value);state.stops.sort((a,b)=>a.day-b.day);state.route='';persist();toast('已调整旅行日期'); }
  });
  $$('[data-check]').forEach(input=>input.addEventListener('change',()=>{state.checks[input.dataset.check]=input.checked;persist();}));
  $('[data-clear-trip]')?.addEventListener('click',()=>{undoState=JSON.parse(JSON.stringify(state));state.stops=[];state.route='';persist();toast('已清空行程，收藏仍保留',{label:'撤销',run:()=>{state=undoState;persist();}});});
  function textTrip() {
    const r=route(state.route);
    const lines=['广汉三千年之旅 / '+(r?.label||'我的旅行手记'),state.date?'出发日期：'+state.date:'', ''];
    let day;
    state.stops.forEach(s=>{
      const p=place(s.id),step=r?.steps.find(item=>item.place===s.id&&item.day===s.day);
      if (day!==s.day) {day=s.day;lines.push(`第 ${s.day} 天`);}
      lines.push(`${step?step.time+' · ':''}${p.group==='fanghu'?'雒城与房湖联游':p.name}（${p.durationLabel}）`,step?.note||p.tip,step?.transfer||'',`地图：${mapUrl(r?.id==='blossom'&&p.id==='food'?'广汉连山镇回锅肉':p.mapQuery)}`,'');
    });
    lines.push('路线为建议安排。预约、开放、天气与交通请出发前确认。','https://guanghan-site.pages.dev/');
    return lines.filter(line=>line!==undefined).join('\n');
  }
  $('[data-copy-trip]')?.addEventListener('click',()=>copy(textTrip(),'复制行程文字'));
  function tripLink(includePlan = !storageAvailable) {
    const url=new URL('my-trip.html',location.href);
    if (includePlan) url.hash='plan='+encodeURIComponent(JSON.stringify({v:1,stops:state.stops,route:state.route,date:state.date}));
    return url.href;
  }
  $('[data-share-trip]')?.addEventListener('click',()=>{
    copy(tripLink(true),'复制行程链接');
  });
  $('[data-print-trip]')?.addEventListener('click',()=>window.print());
  function importSharedTrip() {
    if (!$('[data-trip-stops]')||!location.hash.startsWith('#plan=')) return;
    try {
      const raw=JSON.parse(decodeURIComponent(location.hash.slice(6)));
      if (raw.v!==1||!Array.isArray(raw.stops)||raw.stops.length>12) throw new Error('invalid');
      const stops=normalizeStops(raw.stops); if (!stops.length) throw new Error('empty');
      const sharedRoute=route(raw.route);
      const matches=sharedRoute && JSON.stringify(normalizeStops(sharedRoute.steps.map(s=>({id:s.place,day:s.day}))))===JSON.stringify(stops);
      undoState=JSON.parse(JSON.stringify(state));state.stops=stops;state.route=matches?raw.route:'';
      state.date=/^\d{4}-\d{2}-\d{2}$/.test(raw.date||'')?raw.date:'';
      persist(); history.replaceState(null,'',location.pathname+location.search);
      toast('已恢复链接中的行程',{label:'撤销',run:()=>{state=undoState;persist();}});
    } catch { toast('行程链接格式不完整，请重新复制链接'); }
  }
  async function downloadCard() {
    if (!state.stops.length) return;
    const button=$('[data-download-trip]');button.disabled=true;
    try {
      await document.fonts?.ready;
      const scale=2,width=760,height=460+state.stops.length*180+(new Set(state.stops.map(s=>s.day)).size-1)*55;
      const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
      const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
      ctx.fillStyle='#f7f2e6';ctx.fillRect(0,0,width,height);
      ctx.fillStyle='#17362e';ctx.fillRect(0,0,width,225);
      ctx.strokeStyle='#d7bf7b';ctx.lineWidth=1;ctx.strokeRect(22,22,width-44,height-44);
      ctx.fillStyle='#d7bf7b';ctx.font='14px "Microsoft YaHei", sans-serif';ctx.fillText('GUANGHAN FIELD NOTES / 广汉三千年之旅',48,62);
      ctx.fillStyle='#f7f2e6';ctx.font='42px "SimSun", serif';ctx.fillText(route(state.route)?.label||'我的广汉手记',48,125);
      ctx.font='16px "Microsoft YaHei", sans-serif';ctx.fillText(state.date?'出发日期 / '+state.date:'从古蜀文明，走到人间烟火。',48,171);
      function wrap(text,x,y,maxWidth,lineHeight,maxLines=3) {
        let line='',rows=0;
        const chars = [...String(text)];
        for (let i=0;i<chars.length;i++) {
          const ch = chars[i];
          if (ctx.measureText(line+ch).width>maxWidth && line) { ctx.fillText(line,x,y);y+=lineHeight;rows++;line='';if(rows>=maxLines-1){line=chars.slice(i).join('');break;} }
          line+=ch;
        }
        if (ctx.measureText(line).width>maxWidth) {while(ctx.measureText(line+'…').width>maxWidth)line=line.slice(0,-1);line+='…';}
        ctx.fillText(line,x,y);return y+lineHeight;
      }
      let y=265,day;
      state.stops.forEach((s,index)=>{
        const p=place(s.id),r=route(state.route),scheduled=r?.steps.find(item=>item.place===s.id&&item.day===s.day);
        if (day!==s.day) {day=s.day;ctx.fillStyle='#8b641d';ctx.font='14px "Microsoft YaHei", sans-serif';ctx.fillText(`DAY 0${s.day} / 第${s.day}天`,48,y);y+=40;}
        ctx.fillStyle='#8b641d';ctx.font='24px "SimSun", serif';ctx.fillText(String(index+1).padStart(2,'0'),48,y+4);
        ctx.fillStyle='#17362e';ctx.font='24px "SimSun", serif';ctx.fillText(p.group==='fanghu'?'雒城与房湖联游':p.name,96,y+4);
        ctx.fillStyle='#55615c';ctx.font='14px "Microsoft YaHei", sans-serif';
        ctx.fillText((scheduled?scheduled.time+' · ':'')+p.durationLabel,96,y+36);
        wrap(scheduled?.note||p.summary,96,y+66,600,23,2);
        ctx.fillStyle='#567266';ctx.font='12px "Microsoft YaHei", sans-serif';
        wrap(scheduled?.transfer||p.tip,96,y+117,600,20,2);
        ctx.strokeStyle='rgba(41,72,62,.18)';ctx.beginPath();ctx.moveTo(48,y+155);ctx.lineTo(712,y+155);ctx.stroke();y+=180;
      });
      ctx.fillStyle='#17362e';ctx.font='14px "Microsoft YaHei", sans-serif';ctx.fillText('预约、开放、天气与实时交通，请在出发前确认。',48,height-92);
      ctx.fillStyle='#8b641d';ctx.font='13px "Microsoft YaHei", sans-serif';ctx.fillText('guanghan-site.pages.dev · 为广汉多留一天',48,height-58);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png')); if(!blob)throw new Error('export');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='广汉旅行手记'+(state.date?'-'+state.date:'')+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('PNG 行程卡已生成');
    } catch { toast('暂时无法生成图片，可复制文字或使用打印保存 PDF'); }
    finally {button.disabled=false;}
  }
  $('[data-download-trip]')?.addEventListener('click',downloadCard);
  window.addEventListener('storage',event=>{
    if (event.key!==storeKey) return;
    try { const raw=JSON.parse(event.newValue);if(raw){state={...blankState(),...raw,saved:[...new Set((raw.saved||[]).filter(id=>place(id)))],stops:normalizeStops(raw.stops)};if(!route(state.route))state.route='';sync();} } catch { /* Ignore malformed external changes. */ }
  });
  window.addEventListener('hashchange', importSharedTrip);
  sync();importSharedTrip();
})();
