/* Node-only regression for render cadence, dialogue extraction and assets.
 * No mock L2D art, browser DOM or network dependencies.
 */
'use strict';
const assert=require('node:assert/strict');
const {create:createBudget}=require('../site/game/frame-budget.js');
const {create:createPreloader}=require('../site/game/scene-preloader.js');
const story=require('../site/game/story-content.js');
(async()=>{
  const b=createBudget({fps:30});
  assert.equal(b.sample(0).frames,1);
  assert.equal(b.sample(10),null);
  assert.equal(b.sample(20),null);
  assert.ok(b.sample(34).dt>.03);
  assert.equal(b.sample(44),null);
  b.invalidate();
  assert.ok(b.sample(44),'visibility transition forces next overlay draw');
  assert.equal(b.sample(42).frames,4,'clock rollback resets cadence');
  b.reset();
  assert.ok(b.sample(1000).dt<=.12,'background gap is clamped');
  assert.throws(()=>createBudget({fps:0}),RangeError);
  assert.equal(story.classroom.length,3);
  assert.equal(story.environment.bedroom.length,1);
  assert.equal(Object.isFrozen(story.classroom[0]),true);
  assert.throws(()=>{story.classroom[0].text='changed'},TypeError);

  let images=0,decodes=0;
  class FakeImage{
    constructor(){images++}
    set src(v){this.url=v}
    decode(){decodes++;return Promise.resolve()}
  }
  const loader=createPreloader({ImageCtor:FakeImage,maxEntries:2,timeoutMs:500});
  const p=loader.ensure('bedroom.webp');
  assert.equal(loader.ensure('bedroom.webp'),p,'in-flight decode must deduplicate');
  await p;
  await loader.ensure('bedroom.webp');
  assert.equal(images,1);
  assert.equal(decodes,1);
  await loader.ensure('classroom.webp');
  await loader.ensure('kitchen.webp');
  assert.equal(loader.inspect().cached,2);
  await loader.ensure('bedroom.webp');
  assert.equal(images,4,'least recently used image is evicted');
  // A decode still in progress must not be duplicated merely because another
  // scene evicted it from the bounded completed-image cache.
  const pendingResolvers=new Map();
  let pendingLoads=0;
  class SlowImage{
    constructor(){pendingLoads++}
    set src(url){this.url=url}
    decode(){return new Promise(resolve=>pendingResolvers.set(this.url,resolve))}
  }
  const rapid=createPreloader({ImageCtor:SlowImage,maxEntries:1,timeoutMs:500});
  const slow=rapid.ensure('slow-room.webp');
  const other=rapid.ensure('other-room.webp'); // evicts slow from LRU
  assert.equal(rapid.ensure('slow-room.webp'),slow,
    'in-flight image remains shared even after LRU eviction');
  assert.equal(pendingLoads,2,'scene switches must not launch duplicate decodes');
  assert.equal(rapid.inspect().pending,2);
  pendingResolvers.get('slow-room.webp')();
  pendingResolvers.get('other-room.webp')();
  await Promise.all([slow,other]);
  assert.equal(rapid.inspect().pending,0,'completed decodes must release pending refs');
  class BrokenImage{set src(v){this.url=v}decode(){return Promise.reject(new Error('broken'))}}
  const broken=createPreloader({ImageCtor:BrokenImage,timeoutMs:100});
  await assert.rejects(broken.ensure('missing.webp'),/broken/);
  await assert.rejects(broken.ensure('missing.webp'),/broken/);
  assert.equal(broken.inspect().failures,2,'failed decode must retry next time');
  console.log('Runtime modules: frame cadence, immutability and image decode cache OK');
})().catch(error=>{console.error(error);process.exitCode=1});
