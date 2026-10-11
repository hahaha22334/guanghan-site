/* Local guide: curated intents plus the same places, routes and travel data as the pages. */
module.exports = (guide,travel) => {
  const item=(id,question,triggers,answer,links=[],extra={})=>({id,question,triggers,answer,links,...extra});
  const entries=[
    item('about','堆堆能帮我做什么？',['你是谁','堆堆','你好','能做什么','怎么用网站','网站怎么用'], '我是堆堆，这本广汉旅行手记的小向导。可以帮你找故事、选路线、查出行资料，也能陪你翻书、盖阅读章。输入问题后，我会从本站整理的资料中匹配答案。',[['翻开旅行书','book.html'],['查看网站导览','guide.html']]),
    item('city','广汉在哪里？',['广汉在哪','介绍广汉','广汉是什么','认识广汉'], '广汉在四川德阳，是三星堆博物馆所在地。本站从古蜀文明读到雒城与房湖，再走进黑塔街、地方餐桌和城市水岸。可以从旅行书开始认识这座城。',[['认识广汉','book.html'],['全部目的地','explore.html']]),
    item('book','旅行书怎么翻页？',['旅行书','翻书','翻页','普通阅读','目录'], '打开旅行书后，可以用上一章、下一章、目录或左右方向键翻阅，也可以在照片上横滑。手机上自然向下阅读这一章；切换“普通阅读”后，八章会连续展开。',[['打开旅行书','book.html']]),
    item('passport','阅读护照和行程有什么区别？',['护照','盖章','印章','读过'], '阅读护照记录你主动读过的故事，不表示实际到访。旅行书和地点页共用七枚地点印章；收藏与我的行程另行保存。你可以从下面打开护照。',[],{action:{type:'passport',label:'打开阅读护照'}}),
    item('privacy','我的行程和提问保存在哪里？',['隐私','提问保存','问题保存','上传','聊天记录','清空数据'], '这一层问答在浏览器内匹配，不调用问答服务，也不保存问题记录。收藏、行程、阅读护照和翻书进度保存在当前浏览器。更换设备可用行程页的分享入口带走安排。',[['查看我的行程','my-trip.html']]),
    item('rail','从成都坐高铁怎么去？',['成都怎么去','成都出发','怎么到广汉','高铁','火车','车次','12306','广汉北站','三星堆站','哪个站','车站','动车'], travel.arrivalModes.find(m=>m.id==='rail').description+' 三星堆站是铁路车站，不是三星堆博物馆；广汉北站也需要接驳。本站不提供实时班次。',[['分清车站与博物馆','travel.html#stations'],['查当日车次','https://www.12306.cn/']]),
    item('coach','旅游直通车在哪里查？',['直通车','大巴','旅游巴士'], travel.arrivalModes.find(m=>m.id==='coach').description,[['查看交通方式','travel.html#arrival'],['官方交通指南','https://www.sxd.cn/Guide?type=3']]),
    item('car','自驾和停车怎么安排？',['自驾','停车','开车','网约车'],travel.arrivalModes.find(m=>m.id==='car').description,[['查看交通与转场','travel.html#arrival']]),
    item('ticket','今天还有票吗？在哪里预约？',['余票','有票','门票','票价','买票','订票','预约','开馆','闭馆','几点开','开放时间'], '本站没有实时余票、票价或开放时段数据。请通过三星堆博物馆官方网站核对可预约日期、时段和最新规则，再安排路线。本站不售票，也不能代订。',[['三星堆博物馆官网','https://www.sxd.cn/'],['本站预约提醒','travel.html#booking']]),
    item('bloom','桃花现在开了吗？',['桃花','花期','花情','开花','赏花'], '本站连山照片展示春季景观，没有实时花情。先查看连山当地当年的花期与活动消息，再考虑花季乡野路线；不能据此判断今天是否开花。',[['连山专题与资料来源','lianshan-peach.html'],['春季乡野路线','routes.html?route=blossom']]),
    item('pair','雒城和房湖算两站吗？',['雒城和房湖','房湖和雒城','雒城房湖','合并','重复','两站'],guide.faq[1].answer,[['查看雒城与房湖','book.html#city']]),
    item('export','行程怎么保存、分享？',['保存行程','下载','分享','打印','行程卡','导出','收藏在哪','收藏和行程'],guide.faq[6].answer,[['打开我的行程','my-trip.html']]),
    item('rain','下雨怎么玩？',['下雨','雨天','降雨','室内路线'],guide.routes.find(r=>r.id==='rain').subtitle+' '+guide.routes.find(r=>r.id==='rain').note,[['查看雨天备选','routes.html?route=rain']]),
    item('family','带孩子怎么安排？',['孩子','亲子','小朋友','宝宝','带娃'],guide.routes.find(r=>r.id==='family').subtitle+' '+guide.routes.find(r=>r.id==='family').note,[['查看亲子松弛','routes.html?route=family']]),
    item('classic','第一次来，一天怎么玩？',['第一次','一日','一天','初次','初访','只有一天'],guide.faq[0].answer,[['查看一日经典','routes.html?route=classic']]),
    item('slow','有两天怎么慢慢玩？',['两天','两日','慢游','周末'],guide.routes.find(r=>r.id==='slow').subtitle+' '+guide.routes.find(r=>r.id==='slow').note,[['查看两日慢游','routes.html?route=slow']]),
    item('food','金丝面和回锅肉在哪里找？',['吃什么','吃饭','美食','金丝面','回锅肉','餐厅','餐饮','好吃','辣不辣'],guide.faq[4].answer,[['美食专题与地图入口','guanghan-food.html#visit']]),
    item('transfer','景点之间怎么转场？',['转场','公交','打车','地铁','交通','步行距离'], '博物馆、市区与连山分别安排交通。雒城和房湖适合合并走，黑塔街单独查导航，连山镇另留往返时间。公交线路、等车和驾车用时请按出发当天的实时地图核对。',[['查看转场建议','travel.html#transfers']]),
    item('season','不同季节适合看什么？',['四季','秋天','冬天','夏天','春天','季节'],guide.seasons.map(s=>s.label+'：'+s.text).join('\n'),[['四季旅行灵感','explore.html#season']]),
    item('routes','网站有哪些路线？',['有什么路线','有哪些路线','选路线','推荐路线','怎么玩','几条路线'], '本站整理了五种节奏：'+guide.routes.map(r=>r.label).join('、')+'。在路线页查看节点与转场，再选择是否载入我的行程。',[['打开完整路线集','routes.html']])
  ];
  const aliases={sanxingdui:['三星堆','古蜀','青铜','神树','文物'],luocheng:['雒城','洛城','城墙','城址'],fanghu:['房湖','文庙','园林'],oldtown:['黑塔街','老城','老街','茶馆','喝茶'],food:['广汉味道'],jinyan:['金雁湖','金燕湖','湖岸'],lianshan:['连山','松林','桃花山']};
  for(const p of guide.places) entries.push(item('place-'+p.id,p.name+'有什么看点？',aliases[p.id],p.summary+' '+p.durationLabel+'。'+p.tip,[[p.name+'完整指南',p.page],['出行小抄','travel.html#place-'+p.id]],{place:p.id,action:{type:'add',id:p.id,label:'加入我的行程'}}));
  return {reviewDate:travel.reviewDate,entries};
};
