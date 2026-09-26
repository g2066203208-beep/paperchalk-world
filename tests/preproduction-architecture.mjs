import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=(path)=>fs.readFileSync(path,'utf8');
const context=vm.createContext({
  window:{},
  performance:{now:()=>1234},
  Date,
  console
});
context.window.window=context.window;

for(const path of [
  'src/core/event-bus.js',
  'src/core/game-state.js',
  'src/core/save-runtime.js',
  'src/core/card-camera.js',
  'src/content/game-content.js',
  'src/content/building-pools.js'
]){
  new vm.Script(read(path),{filename:path}).runInContext(context);
}

const {PaperchalkEvents:events,PaperchalkAppState:app,PaperchalkSaveRuntime:saveRuntime,PaperchalkCardCamera:cardCamera,PaperchalkContent:content,PaperchalkBuildingPools:buildingPools,PaperchalkBuildingPoolRuntime:buildingPoolRuntime}=context.window;

let eventValue=0;
const off=events.on('test:event',event=>{eventValue+=event.payload});
events.emit('test:event',2);
off();
events.emit('test:event',2);
assert.equal(eventValue,2,'event unsubscribe must be deterministic');

let onceCount=0;
events.once('test:once',()=>onceCount++);
events.emit('test:once');
events.emit('test:once');
assert.equal(onceCount,1,'once listener must fire exactly once');

assert.equal(app.state,'boot');
app.transition('menu');
app.transition('world');
app.transition('menu');
assert.equal(app.state,'menu');
assert.throws(()=>app.transition('boot'),/Invalid state transition/);

const memory=new Map();
const storage={get:key=>memory.get(key)??null,set:(key,value)=>{memory.set(key,String(value));return true}};
const legacy={account:'tester',createdAt:1,inventory:[],mapState:{},worldX:10};
memory.set('save',JSON.stringify(legacy));
const first=saveRuntime.read({key:'save',account:'tester',storage});
assert.equal(first.save.schemaVersion,3,'legacy save should migrate to v3');
first.save.worldX=20;
saveRuntime.write({key:'save',save:first.save,account:'tester',storage});
first.save.worldX=30;
saveRuntime.write({key:'save',save:first.save,account:'tester',storage});
assert.ok(memory.has('save.backup'),'write should keep last-known-good backup');

const near=cardCamera.project({worldX:0,worldZ:0,playerX:0,playerY:0,cameraZ:0,screenX:640,viewportHeight:720,groundY:112});
const far=cardCamera.project({worldX:0,worldZ:640,playerX:0,playerY:0,cameraZ:0,screenX:640,viewportHeight:720,groundY:112});
assert.ok(near.scale>far.scale,'authored scene Z must make farther objects smaller');
assert.ok(near.y>far.y,'authored scene Z must move farther ground objects toward the horizon');
const raised=cardCamera.project({worldX:0,worldZ:0,worldY:0,playerX:0,playerY:120,cameraZ:0,screenX:640,viewportHeight:720,groundY:112});
assert.ok(raised.y>near.y,'camera Y rise must move the ground downward');
assert.equal(cardCamera.config.gridSize,128,'card grid must preserve 128px = 1m scale');
const metricDepths=[-128,0,640,1280];
for(const z of metricDepths){
  const q=cardCamera.project({worldX:0,worldZ:z,playerX:0,playerY:0,cameraZ:0,screenX:640,viewportHeight:720,groundY:112});
  const expected=cardCamera.config.baseDepth/(cardCamera.config.baseDepth+z);
  assert.ok(Math.abs(q.scale-expected)<1e-12,'main guide must obey pinhole perspective at z='+z);
}
const mainYs=metricDepths.map(z=>cardCamera.project({worldX:0,worldZ:z,playerX:0,playerY:0,cameraZ:0,screenX:640,viewportHeight:720,groundY:112}).y);
assert.ok((mainYs[1]-mainYs[2])>(mainYs[2]-mainYs[3]),'equal/farther physical depth must visually compress toward the horizon');
assert.equal(cardCamera.config.farGroundDepth,1280,'ground must end at the 10 m far scenery line');
assert.equal(cardCamera.config.wallDepth,cardCamera.config.farGroundDepth,'sky wall must rise from the ground far edge');
const guides=Array.from(cardCamera.config.sceneGuides);
assert.equal(guides.length,10,'scene depth must expose 3x3 near/mid/far guides plus horizon');
assert.deepEqual(guides.map(x=>x.id),['near-front','near-main','near-back','mid-front','mid-main','mid-back','far-front','far-main','far-back','horizon']);
assert.deepEqual(guides.map(x=>x.z),[-160,-128,-96,-32,0,32,512,640,768,1280]);
assert.equal(guides.filter(x=>x.kind==='main').length,3,'near/mid/far each need one main guide');
assert.equal(guides.filter(x=>x.kind==='sub').length,6,'near/mid/far each need front/back sub-guides');
assert.equal(guides.filter(x=>x.kind==='horizon').length,1,'scene needs one final horizon guide');
for(const band of ['near','mid','far']){
  const trio=guides.filter(x=>x.band===band);
  assert.equal(trio.length,3,band+' must have front/main/back guides');
  assert.equal(trio[1].z-trio[0].z,trio[2].z-trio[1].z,band+' main guide must be centered');
}

const contentCheck=context.window.PaperchalkContentRuntime.validate(content);
assert.equal(contentCheck.ok,true,contentCheck.errors.join('\n'));
assert.equal(new Set(content.world.nodes.map(x=>x.id)).size,content.world.nodes.length);
assert.equal(new Set(content.world.routes.map(x=>x.id)).size,content.world.routes.length);
const buildingCheck=buildingPoolRuntime.validate();
assert.equal(buildingCheck.ok,true,buildingCheck.errors.join('\n'));
assert.equal(buildingPools.realWorld.oldTown.buildings.length,10,'old-town pool must contain all supplied buildings');
assert.equal(buildingPools.realWorld.oldTown.layer,'midground-far');
assert.equal(buildingPools.realWorld.oldTown.z,640,'old-town pool must sit on the 5 m far-main guide');

const html=read('index.html');
const game=read('src/game.js');
const domCardRenderer=read('src/renderers/dom-card-projection.js');
const workflow=read('.github/workflows/core-regression.yml');
assert.ok(html.indexOf('event-bus.js')<html.indexOf('game.js'),'event bus must load before game');
assert.ok(html.indexOf('game-state.js')<html.indexOf('game.js'),'state machine must load before game');
assert.ok(html.indexOf('save-runtime.js')<html.indexOf('game.js'),'save runtime must load before game');
assert.ok(html.indexOf('card-camera.js')<html.indexOf('game.js'),'card camera must load before game');
assert.ok(html.indexOf('game-content.js')<html.indexOf('game.js'),'content must load before game');
assert.ok(html.indexOf('building-pools.js')<html.indexOf('game.js'),'building pools must load before game');
assert.ok(html.indexOf('game.js')<html.indexOf('oldtown-building-layer.js'),'old-town renderer must load after game runtime');
assert.match(html,/paperchalk-build" content="metric-guides-r43"/,'metric-guide build cache key missing');
assert.ok(html.includes('id="cardGroundCanvas"'),'shared-camera ground canvas host missing');
assert.ok(domCardRenderer.includes('function renderGroundGrid(frame)'),'ground projection must live in the renderer boundary');
assert.ok(domCardRenderer.includes("coarseVisibleX"),'entity culling must happen before projection/style writes');
assert.match(game,/schemaVersion\s*:\s*3/,'default save must declare schema v3');
for(const component of ['transform','health','combat','ai','patrol','renderable']){
  assert.ok(game.includes(component+':e.'+component),'combat ECS must expose granular '+component+' component');
}
assert.match(workflow,/preproduction-architecture\.mjs/,'CI must run architecture freeze guards');

console.log('Preproduction architecture: PASS');
console.log('  content nodes:',content.world.nodes.length);
console.log('  content routes:',content.world.routes.length);
console.log('  save schema:',saveRuntime.schemaVersion);
console.log('  old-town buildings:',buildingPools.realWorld.oldTown.buildings.length);
