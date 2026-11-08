'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtime={window:{},Date,console};
for(const file of ['world-atlas','metro-graph','daily-life-state','npc-life-sim','npc-scene-presence']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/game',file+'.js'),'utf8'),runtime,{filename:file+'.js'});
}
const W=runtime.window,Life=W.PaperWorldNpcLife,Presence=W.PaperWorldNpcScenePresence;
const approved=id=>({
 id,artApproved:true,production:true,
 sprites:{idle:'./assets/characters/npc-g001/new-approved-idle.png',
  joy:'./assets/characters/npc-g001/new-approved-joy.png'},
 geometry:{heightMeters:1.68,widthScale:1.12,assetCrownY:.03,
  assetSoleY:.97,soleX:.5}
});
const policy=(id,allowedLocations=['school'],allowedTransport=['metro'])=>({
 id,allowedLocations,allowedTransport,metroSlot:allowedTransport.includes('metro')?'back-center':null
});
function setup(minute=600,actors){
 const state={day:1,minute,location:'school'};
 const engine={snapshot:()=>({...state}),subscribe(fn){return()=>{}}};
 const life=Life.create({engine,storage:null,atlas:W.PaperWorldAtlas,metro:W.PaperWorldMetro,actors});
 return {engine,life,presence:Presence.create({life,metro:W.PaperWorldMetro})};
}
test('unapproved art and invalid paths never create visual persons',()=>{
 const {presence}=setup();
 let result=presence.setManifest({version:1,records:[{...approved('NPC-G001'),artApproved:false}]});
 assert.equal(result.registered,0);
 assert.equal(presence.forLocation('school').length,0);
 result=presence.setManifest({version:1,records:[approved('NPC-NOT-IN-LIFE')]});
 assert.equal(result.ok,true);
 assert.equal(presence.forLocation('school').length,0);
 result=presence.setManifest({version:1,records:[{...approved('NPC-G001'),
  sprites:{idle:'../docs/rejected-art/npc-g001/joy-1024.png'}}]});
 assert.equal(result.ok,false);
 assert.equal(presence.forLocation('school').length,0);
});
test('art approval alone cannot decide where NPCs spawn',()=>{
 const {presence}=setup();
 assert.equal(presence.setManifest({version:1,records:[approved('NPC-G001')]}).ok,true);
 assert.equal(presence.forLocation('school').length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,0);
 assert.equal(presence.inspect().renderableIds.length,0);
});
test('named NPC is visible only where actual life schedule AND owned scene permissions agree',()=>{
 const {life,presence}=setup(600);
 assert.equal(life.get('NPC-G001').phase,'staying');
 assert.equal(life.get('NPC-G001').node,'school');
 assert.equal(presence.setAssignments({version:1,records:[policy('NPC-G001')]}).ok,true);
 assert.equal(presence.setManifest({version:1,records:[approved('NPC-G001')]}).ok,true);
 assert.equal(presence.forLocation('school').length,1);
 assert.equal(presence.forLocation('mall').length,0);
 assert.equal(presence.forLocation('entrance').length,0);
 assert.equal(presence.forLocation('school')[0].id,'NPC-G001');
});
test('metro art only rides same line, leg, direction and current station',()=>{
 const actors=[{id:'NPC-T01',name:'通勤学生',kind:'student',home:'entrance',interest:[]}];
 const {life,presence}=setup(407,actors),loc=life.get('NPC-T01');
 assert.equal(loc.phase,'traveling');
 assert.equal(loc.location,null);
 assert.equal(loc.leg.mode,'metro');
 assert.equal(loc.leg.lineId,'a');
 assert.equal(loc.leg.direction,1);
 assert.equal(loc.leg.from,'entrance');
 assert.equal(presence.setManifest({version:1,records:[approved('NPC-T01')]}).ok,true);
 assert.equal(presence.setAssignments({version:1,records:[policy('NPC-T01',[],['metro'])]}).ok,true);
 assert.equal(presence.forLocation('entrance').length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,1);
 assert.equal(presence.forMetro({lineId:'b',station:'entrance',direction:1}).length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'school',direction:1}).length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:-1}).length,0);
 life.advanceTo(Life.abs({day:1,minute:425}));
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,0);
});
test('art identity and scene assignment identity both must be unique',()=>{
 const {presence}=setup();
 assert.equal(presence.setManifest({version:1,records:[
  approved('NPC-G001'),approved('NPC-G001')]}).ok,false);
 assert.equal(presence.setAssignments({version:1,records:[
  policy('NPC-G001'),policy('NPC-G001')]}).ok,false);
 assert.equal(presence.forLocation('school').length,0);
});
test('metro world slot cannot come from unrelated art metadata',()=>{
 const stage=require('../site/game/metro-npc-staging.js');
 const keys=stage.CONFIG.slots.map(s=>s.id);
 const assignments=JSON.parse(fs.readFileSync(path.join(root,
  'site/data/npc/scene-assignments.v1.json'),'utf8'));
 const group=assignments.records.find(r=>r.id==='NPC-G001');
 assert.ok(keys.includes(group.metroSlot));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,
  'site/data/npc/production-manifest.v1.json'),'utf8'));
 assert.equal(manifest.records.length,0,'do not approve other art task results by guessing a path');
 assert.equal(manifest.exampleNotActive.artApproved,false);
});
