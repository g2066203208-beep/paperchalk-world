import test from "node:test";
import assert from "node:assert/strict";
import {createScene,normalizeScene,importBBModel,exportBBModel,PALETTE} from "../src/model.js";
for(const id of ["kiosk","street","home","voxel-car"]){
 test("public scene "+id+" is editable and roundtrips Blockbench",()=>{
  const s=createScene(id),normalized=normalizeScene(s);
  assert.ok(normalized.parts.length>10);
  assert.equal(new Set(normalized.parts.map(x=>x.id)).size,normalized.parts.length);
  assert.ok(normalized.parts.every(p=>p.to.every((n,i)=>n>p.from[i])));
  const bb=exportBBModel(s);
  assert.equal(bb.elements.length,normalized.parts.length);
  assert.equal(bb.meta.model_format,"free");
  assert.deepEqual(importBBModel(bb).parts.map(x=>x.name),normalized.parts.map(x=>x.name));
 });
}
test("reject malformed geometry and empty models",()=>{
 assert.throws(()=>normalizeScene({parts:[]}),/方块/);
 const s=createScene("home");s.parts[0].to=s.parts[0].from;
 assert.throws(()=>normalizeScene(s),/尺寸/);
});
test("unified palette uses solid colors",()=>{
 Object.values(PALETTE).forEach(c=>assert.match(c,/^#[0-9a-f]{6}$/i));
});
test("preserves Blockbench outliner groups",()=>{
 const bb=exportBBModel(createScene("kiosk"));
 assert.ok(importBBModel(bb).parts.some(x=>x.group==="营业窗"));
});
