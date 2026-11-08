'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../site/game');
const env={window:{}};
for(const file of ['kirihama-location-plan.js','world-atlas.js','metro-graph.js',
 'metro-map-geometry.js','city-builder.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),env,{filename:file});
}
const {PaperWorldCityBuilder:B,PaperWorldAtlas:A,PaperWorldMetro:G,
 PaperWorldMetroGeometry:Geo}=env.window;
const official=B.officialCases(A,G,Geo);
const store=()=>{const map=new Map();return{
 getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v)}};
const makeEditor=()=>B.createEditor(official,store());
const plain=obj=>JSON.parse(JSON.stringify(obj));
test('eleven official examples are *editable instances* assembled from all ten real cities plus home district',()=>{
 assert.equal(official.length,11);
 assert.deepEqual(plain(official.map(c=>c.caseId)),
  ['home',...A.CITIES.map(c=>c.id)]);
 const home=official[0];
 assert.equal(home.modules.length,15);
 assert.equal(home.modules.filter(m=>m.type==='place').length,7);
 assert.equal(home.modules.filter(m=>m.type==='rail').length,2);
 assert.equal(home.modules.filter(m=>m.type==='road').length,5);
 assert.equal(B.validate(home).moduleCount,15);
 for(const city of A.CITIES){
  const c=official.find(x=>x.caseId===city.id);
  assert.ok(c,city.id);
  assert.equal(c.modules.filter(m=>m.type==='place').length,
   A.POIS.filter(p=>p.city===city.id).length);
  assert.equal(c.modules.some(m=>m.type==='place'&&!m.refId),false);
  assert.equal(c.source,'official');
 }
});
test('Kirihama uses 70 actual metro station instances, 81 individually editable track edges and 120 real location markers',()=>{
 const c=official.find(x=>x.caseId==='kirihama');
 assert.equal(c.modules.length,271);
 assert.equal(c.modules.filter(x=>x.type==='station').length,70);
 assert.equal(c.modules.filter(x=>x.type==='rail').length,81);
 assert.equal(c.modules.filter(x=>x.type==='place').length,120);
 assert.equal(new Set(c.modules.map(x=>x.id)).size,271);
 for(const m of c.modules.filter(x=>x.type==='station')){
  const st=G.STATIONS[m.refId];
  assert.equal(m.x,st.gx*2);assert.equal(m.y,st.gy*2);
 }
 for(const m of c.modules.filter(x=>x.type==='rail')){
  assert.ok(G.LINES.some(l=>l.id===m.lineId));
  const from=G.STATIONS[m.fromStation],to=G.STATIONS[m.toStation];
  assert.deepEqual(plain(m.points[0]),[from.gx*2,from.gy*2]);
  assert.deepEqual(plain(m.points.at(-1)),[to.gx*2,to.gy*2]);
  for(let i=1;i<m.points.length;i++)
   assert.ok(m.points[i][0]===m.points[i-1][0]||
    m.points[i][1]===m.points[i-1][1],m.id+' diagonal');
 }
});
test('other cities do not claim metro lines that do not exist in the game',()=>{
 for(const c of official.filter(x=>!['home','kirihama'].includes(x.caseId))){
  assert.equal(c.modules.filter(m=>m.type==='rail').length,0,c.title);
  assert.equal(c.modules.filter(m=>m.type==='station').length,0,c.title);
  assert.ok(c.modules.some(m=>m.type==='stop'&&m.refId==='hub-'+c.caseId));
 }
});
test('select, place, move, rotate, duplicate and delete are non-destructive to official template',()=>{
 const e=makeEditor();
 e.choose('home');
 const count=e.state().modules.length;
 const id=e.insert('shop',4,5,{label:'新开商店',color:'#abcdef'});
 assert.ok(id);
 assert.equal(e.state().modules.length,count+1);
 assert.equal(e.state().modules.find(m=>m.id===id).color,'#abcdef');
 assert.ok(e.translate(id,3,2));
 assert.equal(e.state().modules.find(m=>m.id===id).x,7);
 assert.ok(e.update(id,{angle:1,label:'改名商店'}));
 const copy=e.duplicate(id);assert.ok(copy);
 assert.notEqual(copy,id);
 assert.ok(e.remove(id));
 assert.equal(e.state().modules.some(m=>m.id===id),false);
 e.reset();
 assert.equal(e.state().modules.length,count);
 assert.equal(official[0].modules.length,count,'official example remains unchanged');
});
test('roads and tracks are orthogonal dot-by-dot paths and automatically join by shared endpoint',()=>{
 const e=makeEditor();
 e.choose('home');
 const a=e.addPath('road',[[5,5],[10,8]]);
 const b=e.addPath('road',[[10,8],[14,8]]);
 const x=e.state().modules.find(m=>m.id===a);
 assert.deepEqual(plain(x.points),[[5,5],[10,5],[10,8]]);
 const joins=e.adjacency('road');
 assert.ok(joins.some(j=>j.at==='10,8'&&j.ids.includes(a)&&j.ids.includes(b)));
 const rail=e.addPath('rail',[[1,1],[4,4]]);
 assert.ok(rail);
 assert.deepEqual(plain(e.state().modules.find(m=>m.id===rail).points),
  [[1,1],[4,1],[4,4]]);
});
test('moving real metro interchange updates all attached editable rail segments',()=>{
 const e=makeEditor();
 e.choose('kirihama');
 const m=e.state().modules.find(m=>m.type==='station'&&m.refId==='central');
 assert.ok(m);
 const affected=e.state().modules.filter(x=>x.type==='rail'&&
  (x.fromStation==='central'||x.toStation==='central'));
 assert.ok(affected.length>=3);
 assert.ok(e.translate(m.id,1,0));
 for(const rail of e.state().modules.filter(x=>affected.some(a=>a.id===x.id))){
  const endpoint=rail.fromStation==='central'?rail.points[0]:rail.points.at(-1);
  assert.deepEqual(plain(endpoint),[m.x+1,m.y]);
 }
});
test('undo/redo, local save/reload and export/import roundtrip preserve each independent component',()=>{
 const disk=store(),e=B.createEditor(official,disk);
 e.choose('home');
 const id=e.insert('home',9,6,{label:'新住宅'});
 assert.equal(e.changed,true);
 assert.equal(e.undo(),true);
 assert.equal(e.state().modules.some(m=>m.id===id),false);
 assert.equal(e.redo(),true);
 assert.equal(e.state().modules.some(m=>m.id===id),true);
 const payload=e.exportJSON();
 assert.ok(e.save());
 assert.equal(e.changed,false);
 const reopening=B.createEditor(official,disk);
 reopening.choose('home');
 assert.equal(reopening.state().modules.some(m=>m.id===id),true);
 reopening.reset();
 assert.equal(reopening.state().modules.some(m=>m.id===id),false);
 reopening.importJSON(payload);
 assert.equal(reopening.state().modules.some(m=>m.id===id),true);
});
test('broken modules cannot corrupt the city draft or overwrite another official case',()=>{
 const e=makeEditor();
 e.choose('home');
 const before=e.exportJSON();
 assert.throws(()=>e.insert('wrong-type',2,3),/Unknown city module/);
 assert.equal(e.insert('rail',200,300),null);
 assert.equal(e.exportJSON(),before);
 const invalid=JSON.parse(before);
 invalid.modules.push({...invalid.modules[0],id:'bad-glyph',color:'not-a-color'});
 assert.throws(()=>e.importJSON(JSON.stringify(invalid)),/无效城市组件/);
 invalid.modules.pop();
 invalid.caseId='kirihama';
 assert.throws(()=>e.importJSON(JSON.stringify(invalid)),/蓝图城市与当前案例不匹配/);
});
test('real game includes builder scripts after official atlas and before the transit map runtime',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../site/index.html'),'utf8');
 const a=html.indexOf('src="./game/world-atlas.js?');
 const b=html.indexOf('src="./game/city-builder.js?');
 const c=html.indexOf('src="./game/city-builder-ui.js?');
 const d=html.indexOf('src="./game/transit-map-ui.js?');
 assert.ok(a>=0&&b>a&&c>b&&d>c);
 const code=fs.readFileSync(path.join(root,'transit-map-ui.js'),'utf8');
 assert.match(code,/PaperWorldCityBuilderUI\?\.create/);
 assert.match(code,/cityBuilder\?\.dispose/);
});
