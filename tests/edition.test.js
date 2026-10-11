const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../content/guide.json');
const {matchRoute} = require('../assets/js/edition');

test('路线推荐覆盖有效路线，情境优先且不伪造两天路线',()=>{
  for(const length of ['one','two']) for(const mood of ['classic','family','rain','blossom']) {
    const result=matchRoute(length,mood);
    assert.ok(data.routes.some(route=>route.id===result.id));
    if(mood!=='classic') assert.equal(result.id,mood);
    if(length==='two' && mood!=='classic') assert.match(result.note,/两天中的一天/);
  }
  assert.equal(matchRoute('two','classic').id,'slow');
  assert.equal(matchRoute('one','classic').id,'classic');
});

test('春季和雨天推荐保留实际出行限制，未知输入回到经典路线',()=>{
  assert.match(matchRoute('one','blossom').note,/春季.*花期/);
  assert.match(matchRoute('one','rain').note,/预约/);
  assert.equal(matchRoute('bad','__proto__').id,'classic');
});
