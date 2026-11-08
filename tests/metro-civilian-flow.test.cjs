'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Flow=require('../site/game/metro-civilian-flow.js');
const Platform=require('../site/game/metro-platform-life.js');
const root=path.join(__dirname,'..');
const art=JSON.parse(fs.readFileSync(path.join(root,'site/data/npc/production-manifest.v1.json')));
const assignments=JSON.parse(fs.readFileSync(path.join(root,'site/data/npc/scene-assignments.v1.json')));
const ids=['NPC-C001','NPC-C002','NPC-C003','NPC-C004','NPC-C005','NPC-C006','NPC-M003','NPC-SG01'];
const rides=[
 {id:'NPC-C001',leg:{mode:'metro',lineId:'a',from:'entrance',to:'school',direction:1,progress:.01}},
 {id:'NPC-C002',leg:{mode:'metro',lineId:'a',from:'entrance',to:'school',direction:1,progress:.04}},
 {id:'NPC-SG01',leg:{mode:'metro',lineId:'a',from:'entrance',to:'northgate',direction:1,progress:.06}}
];
function fixtures(rows=rides){
 const p=new Map(rows.map(x=>[x.id,{id:x.id,phase:'traveling',leg:x.leg}]));
 const grants=new Map(assignments.records.map(x=>[x.id,x]));
 const master=new Map(art.records.map(x=>[x.id,x]));
 const presence={
  get(id){const v=master.get(id),right=grants.get(id);
   return v&&right&&v.artApproved&&v.production?{...v,metroSlot:right.metroSlot}:null},
  forMetro({station,lineId,direction}){
   return [...p.values()].filter(x=>x.leg.mode==='metro'&&
    x.leg.from===station&&x.leg.lineId===lineId&&x.leg.direction===direction)
    .map(x=>{const v=master.get(x.id),grant=grants.get(x.id);
     return v&&grant?.allowedTransport.includes('metro')?
      {id:x.id,leg:x.leg,sprites:v.sprites,geometry:{...v.geometry,metroSlot:grant.metroSlot}}:null})
    .filter(Boolean)
  }
 };
 return {presence,life:{get:id=>p.get(id)||null},actors:p};
}
test('all eight author-approved citizens may use metro only under their route permission',()=>{
 for(const id of ids){
  const r=assignments.records.find(x=>x.id===id);
  assert.ok(r.allowedTransport.includes('metro'),id);
  assert.ok(['back-left','back-center','back-right'].includes(r.metroSlot));
  const img=art.records.find(x=>x.id===id);
  assert.ok(img?.artApproved&&img.production&&img.sprites.front&&img.sprites.side_left&&img.sprites.back);
 }
 assert.ok(!art.records.some(x=>x.id==='NPC-SG03'),'failed glasses NPC cannot spawn');
});
test('closed doors retain exact identities waiting outside, wrong line and duplicates filtered',()=>{
 const {presence,life}=fixtures([...rides,rides[0],
  {id:'NPC-C004',leg:{mode:'metro',lineId:'b',from:'entrance',to:'school',direction:-1,progress:0}}]);
 const flow=Flow.create({presence,life});
 assert.equal(flow.dock({station:'entrance',lineId:'a',direction:1}),true);
 const a=flow.sample({doorOpen:0,dwellMs:900,stationExposure:1});
 assert.deepEqual(a.platform.map(x=>x.id),rides.map(x=>x.id));
 assert.equal(a.platform.every(x=>x.role==='waiting'&&x.progress===0),true);
 assert.equal(a.cabin.length,0);
 assert.equal(flow.dock({station:'entrance',lineId:'a',direction:1}),false);
});
test('physical door passage starts after alighting, never renders a person on both sides',()=>{
 const {presence,life}=fixtures();
 const flow=Flow.create({presence,life});
 flow.dock({station:'entrance',lineId:'a',direction:1});
 const waiting=flow.sample({doorOpen:0,doorOpenedEver:false,dwellMs:2000});
 assert.equal(waiting.platform.every(x=>x.progress===0),true);
 const entering=flow.sample({doorOpen:1,doorOpenedEver:true,dwellMs:2550});
 assert.ok(entering.platform.some(x=>x.role==='boarding'&&x.progress>.05));
 for(const phase of [0,1000,2250,2750,3200,3900,4800]){
  const snapshot=flow.sample({doorOpen:.95,doorOpenedEver:true,dwellMs:phase});
  const outside=new Set(snapshot.platform.map(x=>x.id));
  assert.ok(snapshot.cabin.every(x=>!outside.has(x.id)),phase+' duplicate cabin and platform');
 }
 const finished=flow.sample({doorOpen:.35,doorOpenedEver:true,dwellMs:4900});
 assert.equal(finished.platform.length,0,'closing leaf cannot reverse passenger path');
 assert.equal(finished.cabin.length,3);
 assert.deepEqual(flow.depart(),rides.map(x=>x.id));
 assert.equal(flow.sample({moving:true}).platform.length,0);
 assert.deepEqual(flow.status().onboard,rides.map(x=>x.id));
});
test('arrival releases only identities whose saved route ends at that station',()=>{
 const {presence,life}=fixtures();
 const flow=Flow.create({presence,life});
 flow.dock({station:'entrance',lineId:'a',direction:1});
 flow.depart();
 flow.arrive({station:'school',lineId:'a',direction:1});
 const stop=flow.status();
 assert.deepEqual(stop.alighting,['NPC-C001','NPC-C002']);
 assert.deepEqual(stop.onboard,['NPC-SG01']);
 const closed=flow.sample({doorOpen:0,doorOpenedEver:false,dwellMs:50});
 assert.equal(closed.platform.length,0,'nobody exits through a closed metal door');
 assert.equal(closed.cabin.length,3);
 const walking=flow.sample({doorOpen:1,doorOpenedEver:true,dwellMs:1100});
 assert.equal(walking.platform.length,2);
 assert.equal(walking.platform.every(x=>x.role==='alighting'),true);
 assert.ok(walking.cabin.every(x=>!walking.platform.some(y=>y.id===x.id)));
 const finished=flow.sample({doorOpen:1,doorOpenedEver:true,dwellMs:4200});
 assert.deepEqual(finished.cabin.map(x=>x.id),['NPC-SG01']);
 assert.equal(finished.platform.length,0);
});
test('real 3D station vertices sample approved RGBA perspectives instead of fake atlas extras',()=>{
 const {presence,life}=fixtures();
 const flow=Flow.create({presence,life});
 flow.dock({station:'entrance',lineId:'a',direction:1});
 const a=Platform.sample({realActors:flow.sample().platform,distanceMeters:0,stationExposure:1,nowMs:1200});
 const b=Platform.sample({realActors:flow.sample().platform,distanceMeters:11,stationExposure:1,nowMs:1200});
 assert.deepEqual(a.passengers.map(x=>x.id),rides.map(x=>x.id));
 assert.ok(a.passengers.every(x=>x.sprites?.front?.endsWith('.png')));
 assert.ok(a.passengers.every(x=>x.geometry?.heightMeters>1.4));
 assert.ok(a.passengers.every(x=>x.z>=5&&x.z<=8.4));
 assert.ok(a.passengers.every(x=>x.view==='side_left'));
 for(let i=0;i<a.passengers.length;i++)assert.ok(Math.abs(b.passengers[i].x-a.passengers[i].x+11)<1e-8);
 assert.deepEqual(Platform.sample({realActors:[],stationExposure:1}).passengers,[]);
 assert.deepEqual(Platform.sample({realActors:flow.sample().platform,stationExposure:0}).passengers,[]);
});
test('new WebGL and carriage scripts parse; only same RAF renders the approved NPCs',()=>{
 const ring=fs.readFileSync(path.join(root,'site/game/ring-arena-runtime.js'),'utf8');
 const cabin=fs.readFileSync(path.join(root,'site/game/metro-cabin.js'),'utf8');
 new Function(ring);new Function(cabin);
 assert.match(ring,/setTransitNpcStop/);
 assert.match(ring,/setTransitNpcDeparture/);
 assert.match(ring,/realActors:flowSample\?\.platform\|\|\[\]/);
 assert.match(ring,/person\.sprites\?\.\[person\.view\]/);
 assert.ok(!ring.includes('   requestCommuterAtlas();'),'legacy procedural crowd must not be painted');
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 const rootTag=html.indexOf('metro-civilian-flow.js');
 assert.ok(rootTag>0&&rootTag<html.indexOf('ring-arena-runtime.js'));
 assert.ok(rootTag<html.indexOf('metro-cabin.js'));
 const close=cabin.indexOf('animateDoors(0,930)'),depart=cabin.indexOf('setTransitNpcDeparture');
 const open=cabin.indexOf('animateDoors(1,1050)',depart);
 assert.ok(close>=0&&depart>close&&open>depart);
});
