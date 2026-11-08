'use strict';
/* First citizen NPC art/schedule trial. Never treat skipped SG03 as approved. */
const fs=require('node:fs'),path=require('node:path');
const test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site');
const presence=require('../site/game/npc-scene-presence.js');
const manifest=JSON.parse(fs.readFileSync(path.join(site,'data/npc/production-manifest.v1.json'),'utf8'));
const assignments=JSON.parse(fs.readFileSync(path.join(site,'data/npc/scene-assignments.v1.json'),'utf8'));
const approvedIds=['NPC-C001','NPC-C002','NPC-C003','NPC-C004','NPC-C005','NPC-C006','NPC-M003','NPC-SG01'];
const master=JSON.parse(fs.readFileSync(path.join(site,'data/npc/civilians/gallery.v1.json'),'utf8'));
const rowId=id=>manifest.records.find(r=>r.id===id);

test('source approval only permits the eight actual reviewed citizen identities',()=>{
 const v=presence.validateManifest(manifest),a=presence.validateAssignments(assignments);
 assert.equal(v.ok,true,v.error||'');
 assert.equal(a.ok,true,a.error||'');
 for(const id of approvedIds)assert.ok(v.records.some(r=>r.id===id),'missing '+id);
 assert.equal(v.records.some(r=>r.id==='NPC-SG03'),false,'rejected glasses image must not enter game');
 assert.equal(new Set(approvedIds).size,approvedIds.length);
});
test('every user-selected triptych has three genuine transparent PNG views',()=>{
 for(const id of approvedIds){
  const row=rowId(id);assert.ok(row,'missing '+id);
  for(const view of ['side_left','front','back']){
   const url=row.sprites[view];assert.match(url,/^\.\/assets\/characters\/.+\.png$/);
   const file=path.join(site,url.replace(/^\.\//,''));
   assert.ok(fs.existsSync(file),id+'/'+view+' missing at '+file);
   const bytes=fs.readFileSync(file);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(bytes.readUInt8(25),6,'RGBA color type expected '+id+'/'+view);
  }
 }
});
test('feet, head, aspect and person meters satisfy shared world-geometry limits',()=>{
 for(const id of approvedIds){
  const g=rowId(id).geometry;
  assert.ok(g.heightMeters>=1.4&&g.heightMeters<=1.85,id+' unreasonable height');
  assert.ok(g.assetCrownY<g.assetSoleY-.8);
  assert.ok(g.assetSoleY>=.9&&g.assetSoleY<=1);
  assert.ok(g.soleX>=0&&g.soleX<=1);
  assert.ok(g.widthScale>.7&&g.widthScale<=1.2);
  assert.ok(assignments.records.some(a=>a.id===id),'missing scene permissions '+id);
 }
});
test('no rejected glasses NPC or replacement sketch is promoted by filename',()=>{
 const sg3=master.schoolTrio.planned.find(p=>p.id==='NPC-SG03');
 assert.match(sg3.status,/skipped/);
 assert.ok(!manifest.records.some(p=>p.id==='NPC-SG03'));
 const c6=master.plannedCivilians.find(x=>x.id==='NPC-C006');
 assert.equal(c6.source.sha256,'9c0cdafbc869ac23e8c95ba5421670e1946538b367a18cd8fb2df9ee625c037f');
 assert.equal(c6.source.path,'site/assets/characters/civilians/npc-c006/three-view-original.png');
});
test('the same person cannot appear at wrong place when the live schedule denies it',()=>{
 const people=approvedIds.map(id=>({id,phase:'staying',node:'mall',activity:'leisure'}));
 const world={get:id=>people.find(x=>x.id===id)||null,present:place=>place==='mall'?people:[]};
 const p=presence.create({life:world,manifest,assignments});
 const inMall=p.forLocation('mall',{limit:20});
 assert.equal(inMall.length,approvedIds.filter(id=>assignments.records.find(x=>x.id===id)?.allowedLocations.includes('mall')).length);
 assert.equal(p.forLocation('school',{limit:20}).length,0);
 assert.equal(p.forMetro({lineId:'a',station:'central',direction:1}).length,0);
});
