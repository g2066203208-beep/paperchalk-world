'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../site/game'),ctx={window:{}};
for(const file of ['metro-graph.js','metro-map-geometry.js','metro-map-editor.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
const metro=ctx.window.PaperWorldMetro;
const geo=ctx.window.PaperWorldMetroGeometry;
const editor=ctx.window.PaperWorldMetroMapEditor;
const store=()=>{
 const data=new Map();
 return {getItem:id=>data.has(id)?data.get(id):null,setItem:(id,v)=>data.set(id,v),removeItem:id=>data.delete(id)};
};
const straight=points=>points.every((p,i)=>i===0||p[0]===points[i-1][0]||p[1]===points[i-1][1]);
test('every railway edge is a point-to-point SVG-drawable orthogonal polyline',()=>{
 const model=editor.create(metro,geo,store());
 const audit=model.info();
 assert.equal(model.changed(),false);
 assert.equal(audit.lines,10);assert.equal(audit.stations,70);
 assert.equal(audit.interchanges,19);assert.equal(audit.segments,81);
 for(const edge of model.edges()){
  const pts=model.points(edge);
  assert.ok(pts.length>=2,edge.key);
  assert.equal(straight(pts),true,edge.key);
  assert.equal(pts[0][0],model.getStation(edge.from).gx);
  assert.equal(pts[0][1],model.getStation(edge.from).gy);
  assert.equal(pts.at(-1)[0],model.getStation(edge.to).gx);
  assert.equal(pts.at(-1)[1],model.getStation(edge.to).gy);
  for(const p of pts){
   assert.ok(Number.isInteger(p[0])&&Number.isInteger(p[1]),edge.key);
   assert.ok(p[0]>=0&&p[0]<=36&&p[1]>=0&&p[1]<=26,edge.key);
  }
 }
});
test('selected route can gain a rounded bend, be dragged, undone, redone and saved',()=>{
 const disk=store(),model=editor.create(metro,geo,disk);
 const edge=model.edges().find(e=>e.lineId==='g');
 assert.ok(edge);
 const previous=model.serialize();
 assert.equal(model.insertBend(edge,9,7),true);
 assert.equal(model.bends(edge).length,1);
 assert.equal(model.moveBend(edge,0,9,8),true);
 assert.equal(model.bends(edge)[0][1],8);
 assert.ok(straight(model.points(edge)),'bent line must remain orthogonal');
 assert.equal(model.undo(),true);
 assert.equal(model.bends(edge)[0][1],7);
 assert.equal(model.redo(),true);
 assert.equal(model.bends(edge)[0][1],8);
 assert.equal(model.changed(),true);
 assert.equal(model.save(),true);
 assert.equal(model.changed(),false);
 const reopened=editor.create(metro,geo,disk);
 assert.equal(reopened.bends(edge)[0][1],8);
 assert.equal(reopened.changed(),false);
 assert.notEqual(previous,reopened.serialize());
});
test('dragging a physical interchange updates every line sharing that same station',()=>{
 const model=editor.create(metro,geo,store());
 const id='central',original={...model.getStation(id)};
 assert.ok(original);
 assert.equal(model.moveStation(id,16,11),true);
 assert.equal(model.getStation(id).gx,16);
 assert.equal(model.getStation(id).gy,11);
 assert.ok(model.edges().filter(e=>e.from===id||e.to===id).length>2);
 for(const edge of model.edges().filter(e=>e.from===id||e.to===id)){
  const pts=model.points(edge),endpoint=edge.from===id?pts[0]:pts.at(-1);
  assert.deepEqual(Array.from(endpoint),[16,11]);
  assert.ok(straight(pts));
 }
 assert.equal(model.moveStation(id,original.gx,original.gy),true);
 assert.equal(model.moveStation('school',original.gx,original.gy),false,
  'one physical dot may belong to only one physical station');
});
test('point-connection inserts and deletes a NEW physical station in its real line',()=>{
 const model=editor.create(metro,geo,store()),edge=model.edges().find(e=>e.lineId==='h');
 const base=model.getLine(edge.lineId).stops.length;
 const id=model.addStation(edge,1,25);
 assert.match(id,/^kh-custom-/);
 assert.equal(model.info().stations,71);assert.equal(model.info().segments,82);
 assert.equal(model.getLine(edge.lineId).stops.length,base+1);
 assert.equal(model.getLine(edge.lineId).stops.indexOf(id),
  model.getLine(edge.lineId).stops.indexOf(edge.from)+1);
 assert.equal(model.renameStation(id,'新的调查站'),true);
 assert.equal(model.getStation(id).label,'新的调查站');
 assert.equal(model.removeCustomStation(id),true);
 assert.equal(model.info().stations,70);assert.equal(model.info().segments,81);
 assert.equal(model.getLine(edge.lineId).stops.length,base);
 assert.equal(model.undo(),true);assert.equal(model.info().stations,71);
});
test('invalid blueprint edits cannot corrupt real stops or create rectangle-based phantom rails',()=>{
 const model=editor.create(metro,geo,store());
 const before=model.serialize();
 assert.equal(model.moveStation('central',100,100),false);
 assert.equal(model.moveStation('central',6,10),false);
 assert.equal(model.removeCustomStation('entrance'),false);
 assert.equal(model.insertBend(model.edges()[0],20,99),false);
 assert.equal(model.serialize(),before);
 const broken=JSON.parse(model.exportJSON());
 delete broken.stations['entrance'];
 assert.throws(()=>model.importJSON(JSON.stringify(broken)),/原有站点不能丢失/);
 const broken2=JSON.parse(model.exportJSON());
 broken2.stations['school'].gx=6;broken2.stations['school'].gy=10;
 assert.throws(()=>model.importJSON(JSON.stringify(broken2)),/同一格点/);
 assert.equal(model.serialize(),before);
});
test('game map loads a real on-canvas editor and keeps normal in-place travel menus',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'transit-map-ui.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'metro-map-editor-ui.js'),'utf8');
 const a=html.indexOf('src="./game/metro-map-editor.js?');
 const b=html.indexOf('src="./game/metro-graph.js?');
 const c=html.indexOf('src="./game/metro-map-geometry.js?');
 const d=html.indexOf('src="./game/metro-map-editor-ui.js?');
 const e=html.indexOf('src="./game/transit-map-ui.js?');
 assert.ok(a>=0&&b>a&&c>b&&d>c&&e>d,
  'editor validation must load before actual graph, geometry and transit UI');
 assert.match(js,/editorUI\?\.syncVisibility\(\)/);
 assert.match(js,/function showMenu\(/);
 assert.match(js,/positionPopup\(\)/);
 assert.ok(!js.includes('pw-metro-fixed-inspector'));
 assert.match(ui,/metro-blueprint/);
 assert.match(ui,/pw-metro-edit-hit/);
 assert.match(ui,/pointerdown/);
 assert.match(ui,/model\.addStation/);
 assert.match(ui,/model\.insertBend/);
});


test('saving and reloading a blueprint actually installs the new station and rounded bends into playable metro',()=>{
 const disk=store(),draft=editor.create(metro,geo,disk);
 const targetEdge=draft.edges().find(e=>e.lineId==='h');
 const newId=draft.addStation(targetEdge,1,25);
 assert.ok(newId);
 const afterEdge=draft.edges().find(e=>e.lineId==='h'&&e.to===newId);
 draft.insertBend(afterEdge,2,24);
 draft.save();
 const runtime={window:{localStorage:disk,console:{warn(){}}}};
 for(const filename of ['metro-map-editor.js','metro-graph.js','metro-map-geometry.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,filename),'utf8'),
   runtime,{filename});
 }
 const actual=runtime.window.PaperWorldMetro;
 const shape=runtime.window.PaperWorldMetroGeometry;
 assert.ok(actual.ACTIVE_BLUEPRINT,'saved plan must be recognized at boot');
 assert.ok(actual.STATIONS[newId],'newly authored stop must become a real playable station');
 assert.equal(Object.keys(actual.STATIONS).length,71);
 assert.equal(actual.LINES.length,10);
 assert.equal(actual.getLine('h').stops.includes(newId),true);
 assert.ok(actual.path('entrance',newId));
 assert.ok(actual.path(newId,'entrance'));
 assert.ok(shape.routes[afterEdge.key]);
 for(const line of actual.LINES)for(const [from,to] of shape.segments(line)){
  assert.match(shape.pathFor(line.id,from,to,actual.STATIONS,1440,810),/^M\d/);
 }
});

test('a saved layout stays draft until the player explicitly applies it',()=>{
 const disk=store();
 const boot=()=>{
  const runtime={window:{localStorage:disk,console:{warn(){}}}};
  for(const filename of ['metro-map-editor.js','metro-graph.js','metro-map-geometry.js']){
   vm.runInNewContext(fs.readFileSync(path.join(root,filename),'utf8'),
    runtime,{filename});
  }
  return runtime.window.PaperWorldMetro;
 };
 const baseline=boot();
 assert.equal(disk.getItem(editor.LIVE_KEY),'','fresh players start on original 70-stop metro');
 const local=editor.create(baseline,geo,disk);
 const segment=local.edges().find(e=>e.lineId==='h');
 const id=local.addStation(segment,1,25);
 assert.ok(id);assert.equal(local.save(),true);
 assert.equal(disk.getItem(editor.LIVE_KEY),'','draft save must not change live graph');
 assert.equal(Object.keys(boot().STATIONS).length,70,
  'refresh must not silently apply work-in-progress edits');
 assert.equal(local.apply(),true);
 const applied=boot();
 assert.equal(Object.keys(applied.STATIONS).length,71);
 assert.ok(applied.path('entrance',id));
});
