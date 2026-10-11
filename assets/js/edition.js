/* Small optional route matcher; static default remains useful without JavaScript. */
(function(global) {
  'use strict';
  function matchRoute(length,mood) {
    const special = {family:'带孩子少赶路，户外段按体力取舍。',rain:'雨天以室内为主；三星堆仍需提前预约。',blossom:'这是一条春季收藏路线，先确认当年花期。'};
    if (Object.hasOwn(special,mood)) return {id:mood,note:special[mood]+(length==='two'?' 可把这条情境路线安排在两天中的一天。':'')};
    return length==='two'?{id:'slow',note:'多留一天，把街巷、湖岸和一杯茶走从容。'}:{id:'classic',note:'第一次来，先从古蜀走到老城。'};
  }
  if (typeof module!=='undefined' && module.exports) module.exports={matchRoute};
  if (typeof document==='undefined') return;
  const finder=document.querySelector('[data-route-finder]');
  if (!finder) return;
  const update=()=>{
    const length=finder.querySelector('[name="trip-length"]:checked').value;
    const mood=finder.querySelector('[name="trip-mood"]:checked').value;
    const match=matchRoute(length,mood);
    finder.querySelectorAll('[data-route-match]').forEach(panel=>panel.hidden=panel.dataset.routeMatch!==match.id);
    finder.querySelector('[data-route-match-note]').textContent=match.note;
    const url=new URL(location.href);
    if(length==='one'&&mood==='classic') {url.searchParams.delete('length');url.searchParams.delete('mood');}
    else {url.searchParams.set('length',length);url.searchParams.set('mood',mood);}
    history.replaceState(null,'',url);
  };
  const params=new URLSearchParams(location.search);
  for(const [param,name] of [['length','trip-length'],['mood','trip-mood']]) {
    const value=params.get(param);
    const radio=Array.from(finder.querySelectorAll(`input[name="${name}"]`)).find(input=>input.value===value);
    if(radio) radio.checked=true;
  }
  finder.addEventListener('change',update);
  update();
  finder.classList.add('is-ready');
})(typeof window==='undefined'?globalThis:window);
