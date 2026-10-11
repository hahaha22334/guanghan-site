/* Pure local intent matching, also used by the regression tests. */
(function(root){
  'use strict';
  const normalize=q=>String(q||'').toLowerCase().replace(/[\s，。！？、,.!?：:；;“”「」]/g,'');
  function matchQuestion(question,data,context={}) {
    const q=normalize(question).slice(0,180);
    if(!q) return null;
    const find=id=>data.entries.find(e=>e.id===id);
    if(q==='堆堆') return find('about');
    if(/这[页章里]|这一[页章篇]|当前|正在看/.test(q)) {
      return find('place-'+context.place) || find(context.book?'book':'about');
    }
    // Requests for current conditions take priority over attractive place descriptions.
    if(/桃花|花期|花情|开花/.test(q)) return find('bloom');
    if(/车次|高铁|广汉北站|三星堆站|哪个站|火车|动车/.test(q)) return find('rail');
    const namedPlace=data.entries.find(e=>e.place && e.triggers.some(t=>q.includes(normalize(t))));
    if(/开放|营业|几点|开门|关闭|免费|多少钱|票价/.test(q) && namedPlace && namedPlace.place!=='sanxingdui') {
      return {...namedPlace,question:namedPlace.question.replace('有什么看点','开放与营业怎么核对'),answer:'本站未核验当天开放、价格与营业状态，请查看该地点出行小抄及所列来源。\n'+namedPlace.answer};
    }
    if(/票|预约|开馆|闭馆|几点开|开放时间/.test(q)) return find('ticket');
    if(/雒城.*房湖|房湖.*雒城/.test(q)) return find('pair');
    if(/加入|添加|放进/.test(q) && namedPlace) return namedPlace;
    const ranked=data.entries.map((e,index)=>({entry:e,index,score:Math.max(0,...e.triggers.filter(t=>t!=='堆堆').map(t=>q.includes(normalize(t))?normalize(t).length+(e.place?0:3)-(e.id==='routes'?4:0):0))})).filter(e=>e.score>=2).sort((a,b)=>b.score-a.score || a.index-b.index);
    return ranked[0]?.entry || null;
  }
  const validAction=(action,guide)=>!!action && (action.type==='passport' || action.type==='add' && guide.places.some(p=>p.id===action.id));
  const api={normalize,matchQuestion,validAction};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.GuanghanCompanionLogic=api;
})(typeof window!=='undefined'?window:globalThis);
