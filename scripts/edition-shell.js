/* Build-time page covers; no runtime layout injection. */
const covers = {
  'explore.html':['fanghu-lake-pavilion','房湖湖池与亭阁','七处目的地 · 各有一种停留方式'],
  'routes.html':['heita-street','黑塔街的老城街景','五种节奏 · 把时间留给喜欢的地方'],
  'travel.html':['sanxingdui-hero','暮色中的三星堆博物馆','到达 · 预约 · 转场 · 休息'],
  'guide.html':['heita-alley','黑塔街树荫下的巷道','一张导览 · 从任意一页出发'],
  'my-trip.html':['jinyan-sunset','金雁湖水岸的落日','我的广汉手记 · 带着自己的节奏走']
};
module.exports = function editionShell(main,file,picture) {
  const cover = covers[file];
  if (!cover) return main;
  return main.replace(/<section class="page-intro container([^"]*)">([\s\S]*?)<\/section>/,(_,extra,body)=>`<section class="page-intro container edition-cover${extra}"><div class="edition-cover__copy">${body}</div><figure class="edition-cover__photo">${picture(cover[0],cover[1],true,'(max-width: 767px) 100vw, 45vw')}<figcaption>${cover[2]}</figcaption></figure></section>`);
};
