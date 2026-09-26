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
  'src/content/game-content.js'
]){
  new vm.Script(read(path),{filename:path}).runInContext(context);
}

const {PaperchalkEvents:events,PaperchalkAppState:app,PaperchalkSaveRuntime:saveRuntime,PaperchalkCardCamera:cardCamera,PaperchalkContent:content}=context.window;

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

const near=cardCamera.project({worldX:0,worldZ:0,playerX:0,playerZ:100,screenX:640,viewportHeight:720,groundY:112});
const far=cardCamera.project({worldX:0,worldZ:0,playerX:0,playerZ:-100,screenX:640,viewportHeight:720,groundY:112});
assert.ok(near.scale>far.scale,'card camera must make nearer world points larger');
assert.ok(near.y>far.y,'card camera must move nearer ground points lower on screen');
assert.equal(cardCamera.config.gridSize,128,'card grid must preserve 128px = 1m scale');

const contentCheck=context.window.PaperchalkContentRuntime.validate(content);
assert.equal(contentCheck.ok,true,contentCheck.errors.join('\n'));
assert.equal(new Set(content.world.nodes.map(x=>x.id)).size,content.world.nodes.length);
assert.equal(new Set(content.world.routes.map(x=>x.id)).size,content.world.routes.length);

const html=read('index.html');
const game=read('src/game.js');
const workflow=read('.github/workflows/core-regression.yml');
assert.ok(html.indexOf('event-bus.js')<html.indexOf('game.js'),'event bus must load before game');
assert.ok(html.indexOf('game-state.js')<html.indexOf('game.js'),'state machine must load before game');
assert.ok(html.indexOf('save-runtime.js')<html.indexOf('game.js'),'save runtime must load before game');
assert.ok(html.indexOf('card-camera.js')<html.indexOf('game.js'),'card camera must load before game');
assert.ok(html.indexOf('game-content.js')<html.indexOf('game.js'),'content must load before game');
assert.match(game,/schemaVersion\s*:\s*3/,'default save must declare schema v3');
for(const component of ['transform','health','combat','ai','patrol','renderable']){
  assert.ok(game.includes(component+':e.'+component),'combat ECS must expose granular '+component+' component');
}
assert.match(workflow,/preproduction-architecture\.mjs/,'CI must run architecture freeze guards');

console.log('Preproduction architecture: PASS');
console.log('  content nodes:',content.world.nodes.length);
console.log('  content routes:',content.world.routes.length);
console.log('  save schema:',saveRuntime.schemaVersion);
