const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../content/guide.json');
test('每条路线都指向实际页面，日期与示例时间按顺序推进', () => {
  assert.equal(data.routes.length, 5);
  for (const route of data.routes) {
    let last = 0;
    const groups = new Set();
    for (const step of route.steps) {
      const place = data.places.find(p => p.id === step.place);
      assert.ok(place, route.id + ': 地点不存在');
      assert.ok(fs.existsSync(path.join(__dirname,'..',place.page)), place.page);
      const time = step.day*1440+Number(step.time.slice(0,2))*60+Number(step.time.slice(3));
      assert.ok(time > last, route.id + ': 时间倒序');
      assert.ok(step.day >= 1 && step.day <= route.days);
      assert.ok(step.transfer.length > 10, route.id + ': 缺少转场说明');
      assert.ok(!groups.has(place.group), route.id + ': 重复安排同一联游组');
      groups.add(place.group); last = time;
    }
  }
});
test('房湖和雒城合并，四季月份完整且互不重叠', () => {
  const p = id => data.places.find(p => p.id === id);
  assert.equal(p('fanghu').group, p('luocheng').group);
  assert.deepEqual(data.seasons.flatMap(s => s.months).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.match(data.routes.find(r => r.id === 'blossom').note,/不表示现在正在开花/);
});
test('公开发布边界只包括页面、前端资源、SEO 和图片', () => {
  const publish = fs.readFileSync(path.join(__dirname,'../publish.ps1'),'utf8');
  assert.match(publish,/sitemap\.xml/);
  assert.match(publish,/robots\.txt/);
  assert.ok(!/Copy-Item[^\n]+(?:content|tests|scripts|\.asset-sources)/.test(publish));
});
test('导图覆盖所有公开内容页，路线节点使用有效的路线选择', () => {
  const {branches} = require('../scripts/build-discovery');
  const links = branches.flatMap(b=>[b.link,...b.groups.flatMap(g=>g.links.map(l=>l[1]))]);
  const linkedPages = new Set(links.map(l=>l.split(/[?#]/)[0]));
  for (const page of [...data.places.map(p=>p.page),'explore.html','travel.html','routes.html','my-trip.html']) {
    assert.ok(linkedPages.has(page),'导图无法到达 '+page);
  }
  for (const href of links.filter(l=>l.includes('?route='))) {
    const id = new URL(href,'https://guanghan-site.pages.dev').searchParams.get('route');
    assert.ok(data.routes.some(r=>r.id===id),'无效路线节点 '+href);
  }
});
test('七个目的地各有独立出行提示，景点页可以直接打开对应提示', () => {
  const travel = require('../content/travel.json');
  assert.deepEqual(travel.practical.map(p=>p.id).sort(),data.places.map(p=>p.id).sort());
  const travelHtml = fs.readFileSync(path.join(__dirname,'../travel.html'),'utf8');
  for (const note of travel.practical) {
    assert.ok(travel.sources.some(s=>s.id===note.source),'提示缺少来源入口 '+note.id);
    assert.match(travelHtml,new RegExp('<details id="place-'+note.id+'">'));
    const place = data.places.find(p=>p.id===note.id);
    assert.ok(fs.readFileSync(path.join(__dirname,'..',place.page),'utf8').includes('travel.html#place-'+note.id));
  }
});
test('交通图片保留可见署名、拍摄日期和开放许可', () => {
  const travel = require('../content/travel.json');
  const html = fs.readFileSync(path.join(__dirname,'../travel.html'),'utf8');
  const ledger = JSON.parse(fs.readFileSync(path.join(__dirname,'../.asset-sources.json'),'utf8'));
  for (const photo of travel.stations.filter(s=>s.photoDate)) {
    const record = ledger.assets.find(a=>a.sitePath==='images/external/'+photo.image+'.jpg');
    assert.ok(record,'缺少来源台账 '+photo.image);
    assert.equal(record.license,'CC BY-SA 4.0');
    assert.equal(record.creatorDisplay,photo.credit);
    assert.ok(html.includes(photo.credit)&&html.includes(photo.photoDate)&&html.includes(photo.sourceUrl));
    assert.ok(html.includes(record.licenseUrl));
  }
});
