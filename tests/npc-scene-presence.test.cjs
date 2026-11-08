'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtime={window:{},Date,console};
for(const file of ['world-atlas','metro-graph','daily-life-state','npc-life-sim','npc-scene-presence']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/game',file+'.js'),'utf8'),runtime,{filename:file+'.js'});
}
const W=runtime.window,Life=W.PaperWorldNpcLife,Presence=W.PaperWorldNpcScenePresence;
const approved=(id,allowedLocations=['school'],allowedTransport=['metro'])=>({
 id,artApproved:true,production:true,
 allowedLocations,allowedTransport,
 sprites:{idle:'./assets/characters/npc-g001/new-approved-idle.png',
  joy:'./assets/characters/npc-g001/new-approved-joy.png'},
 geometry:{heightMeters:1.68,widthScale:1.12,assetCrownY:.03,
  assetSoleY:.97,soleX:.5,metroSlot:'back-center'}
});
function setup(minute=600,actors){
 const state={day:1,minute,location:'school'},listeners=[];
 const engine={snapshot:()=>({...state}),subscribe(fn){listeners.push(fn);return()=>{}}};
 const life=Life.create({engine,storage:null,atlas:W.PaperWorldAtlas,metro:W.PaperWorldMetro,actors});
 return {engine,life,presence:Presence.create({life,metro:W.PaperWorldMetro})};
}
test('approval gate prevents outdated art or unknown identities from being spawned',()=>{
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
test('named NPCs are visible only at their actual node and authorized scene',()=>{
 const {life,presence}=setup(600);
 assert.equal(life.get('NPC-G001').phase,'staying');
 assert.equal(life.get('NPC-G001').node,'school');
 assert.equal(presence.setManifest({version:1,records:[approved('NPC-G001')]}).ok,true);
 assert.equal(presence.forLocation('school').length,1);
 assert.equal(presence.forLocation('mall').length,0);
 assert.equal(presence.forLocation('entrance').length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,0);
 assert.equal(presence.forLocation('school')[0].id,'NPC-G001');
});
test('same named NPC appears aboard a train only during a matching physical line/leg/direction',()=>{
 const actors=[{id:'NPC-T01',name:'通勤学生',kind:'student',home:'entrance',interest:[]}];
 const {life,presence}=setup(407,actors);
 const transit=life.get('NPC-T01');
 assert.equal(transit.phase,'traveling');
 assert.equal(transit.location,null);
 assert.equal(transit.leg.mode,'metro');
 assert.equal(transit.leg.lineId,'a');
 assert.equal(transit.leg.direction,1);
 assert.equal(transit.leg.from,'entrance');
 assert.equal(presence.setManifest({version:1,records:[approved('NPC-T01',[],['metro'])]}).ok,true);
 assert.equal(presence.forLocation('entrance').length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,1);
 assert.equal(presence.forMetro({lineId:'b',station:'entrance',direction:1}).length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'school',direction:1}).length,0);
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:-1}).length,0);
 life.advanceTo(Life.abs({day:1,minute:425}));
 assert.equal(presence.forMetro({lineId:'a',station:'entrance',direction:1}).length,0);
});
test('two identities with one file path are not implicitly the same physical NPC',()=>{
 const {presence}=setup(600);
 assert.equal(presence.setManifest({version:1,records:[
  approved('NPC-G001'),approved('NPC-G001')]}).ok,false);
 assert.equal(presence.forLocation('school').length,0);
});
test('real fixed 2.5D camera and scene slot IDs remain separate from art paths',()=>{
 const stage=require('../site/game/metro-npc-staging.js');
 const keys=stage.CONFIG.slots.map(s=>s.id);
 assert.ok(keys.includes('back-center'));
 const row=approved('NPC-G001');
 assert.ok(keys.includes(row.geometry.metroSlot));
 assert.ok(!row.sprites.idle.includes('rejected-art'));
});
