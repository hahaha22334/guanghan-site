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
