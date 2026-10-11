const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const guide=require('../content/guide.json');
const book=require('../content/book.json');
const data=require('../scripts/build-companion')(guide,require('../content/travel.json'));
const {matchQuestion,validAction}=require('../assets/js/companion-logic');
test('本地向导匹配常见表达，实时信息优先于景点介绍',()=>{
  const cases=[
    ['你是谁','about'],['网站怎么用','about'],['广汉在哪里','city'],['怎么翻书','book'],['普通阅读在哪','book'],
    ['护照里的章是什么','passport'],['提问保存了吗','privacy'],['一天怎么玩','classic'],['第一次来广汉','classic'],
    ['带娃怎么安排','family'],['下雨还能去哪里','rain'],['周末有两天','slow'],['有哪些路线','routes'],
    ['广汉北站怎么到三星堆','rail'],['三星堆站就是博物馆吗','rail'],['高铁今天有几班','rail'],['成都怎么去广汉','rail'],
    ['直通车在哪里坐','coach'],['停车怎么安排','car'],['三星堆今天有票吗','ticket'],['三星堆门票多少钱','ticket'],
    ['几点开馆','ticket'],['桃花今天开了吗','bloom'],['连山花期到什么时候','bloom'],['雒城和房湖算两站吗','pair'],
    ['金丝面在哪吃','food'],['回锅肉去哪里找','food'],['下载行程卡','export'],['秋天去哪里','season'],
    ['黑塔街有什么看点','place-oldtown'],['金燕湖怎么走','place-jinyan'],['帮我把房湖加入行程','place-fanghu'],
    ['介绍三星堆青铜文物','place-sanxingdui'],['洛城遗址在哪里','place-luocheng'],['公交转场','transfer']
  ];
  for(const [q,id] of cases)assert.equal(matchQuestion(q,data)?.id,id,q);
  assert.equal(matchQuestion('这一页有什么看点',data,{place:'oldtown'}).id,'place-oldtown');
  assert.equal(matchQuestion('这章在说什么',data,{book:true}).id,'book');
  assert.equal(matchQuestion('请写一篇量子力学论文',data),null);
  assert.equal(matchQuestion('<script>alert(1)</script>',data),null);
  assert.match(matchQuestion('房湖今天免费吗',data).answer,/未核验当天/);
});
test('问答动作只允许合法地点和阅读护照，资料入口真实存在',()=>{
  assert.equal(validAction({type:'add',id:'unknown'},guide),false);
  assert.equal(validAction({type:'eval',id:'sanxingdui'},guide),false);
  for(const e of data.entries){
    if(e.action) assert.ok(validAction(e.action,guide),e.id);
    for(const [,href] of e.links){
      if(href.startsWith('https://')) {assert.ok(['www.sxd.cn','www.12306.cn'].includes(new URL(href).hostname));continue;}
      const [file,hash]=href.split('#');const html=fs.readFileSync(path.join(__dirname,'..',file.split('?')[0]),'utf8');
      if(hash)assert.ok(html.includes(`id="${hash}"`),href);
    }
  }
});
test('旅行书章节分享地址唯一，联游与七地点阅读印章保持对应',()=>{
  assert.equal(new Set(book.chapters.map(c=>c.id)).size,8);
  const stamps=book.chapters.flatMap(c=>c.stampPlaces || (c.place?[c.place]:[]));
  assert.deepEqual(stamps.sort(),guide.places.map(p=>p.id).sort());
  assert.match(book.chapters.find(c=>c.id==='season').note,/没有实时花情/);
  assert.ok(fs.readFileSync(path.join(__dirname,'../sitemap.xml'),'utf8').includes('/book.html'));
});
test('九套宠物动作保持四列两行、透明背景，首屏不一次加载全部动作',async()=>{
  const actions=['idle','wave','pet','hop','think','talk','point','stamp','sleep'];
  for(const action of actions){const m=await sharp(path.join(__dirname,'../assets/pet',action+'.webp')).metadata();assert.equal(m.width,1024);assert.equal(m.height,512);assert.equal(m.hasAlpha,true);}
  const source=fs.readFileSync(path.join(__dirname,'../assets/js/companion.js'),'utf8');
  assert.ok(!source.includes('states.forEach(load)'));
});
