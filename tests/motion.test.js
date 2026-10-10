const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizePassport,pickInspiration,canAutoplay} = require('../assets/js/motion');
const {places} = require('../content/guide.json');

test('passport rejects malformed, stale, and duplicate storage without losing valid stamps',()=>{
  const ids=places.map(p=>p.id);
  assert.deepEqual(normalizePassport({sanxingdui:true},ids),[]);
  assert.deepEqual(normalizePassport(null,ids),[]);
  assert.deepEqual(normalizePassport(['sanxingdui','removed',null,42,'sanxingdui','oldtown'],ids),['sanxingdui','oldtown']);
});
test('inspiration stays in the selected theme and avoids immediate repeats',()=>{
  for(const [filter,categories] of Object.entries({culture:['museum','history'],life:['life','food'],nature:['nature']})) {
    for(const random of [0,.2,.5,.999999,1,-1,NaN]) {
      for(const previous of places.map(p=>p.id)) {
        const id=pickInspiration(places,filter,previous,random);
        assert.ok(categories.includes(places.find(p=>p.id===id).category));
        assert.notEqual(id,previous);
      }
    }
  }
  assert.equal(pickInspiration([], 'all',null,0),null);
  assert.equal(pickInspiration([places[0]],'all',places[0].id,.5),places[0].id);
});
test('carousel pauses for focus, hover, offscreen, hidden tab, explicit pause and reduced motion',()=>{
  const base={enabled:true,paused:false,hovered:false,focused:false,visible:true,hidden:false};
  assert.equal(canAutoplay(base),true);
  for(const flag of ['paused','hovered','focused','hidden']) assert.equal(canAutoplay({...base,[flag]:true}),false);
  for(const flag of ['enabled','visible']) assert.equal(canAutoplay({...base,[flag]:false}),false);
});
