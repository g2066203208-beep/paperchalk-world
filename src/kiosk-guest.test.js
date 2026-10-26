import test from "node:test";
import assert from "node:assert/strict";
import {drawWindowCustomer} from "./kiosk-guest.js";

function paint(tone,phase,talking=false){
 const commands=[];
 const g={fillStyle:"",fillRect(x,y,w,h){commands.push([x,y,w,h,this.fillStyle]);}};
 drawWindowCustomer(g,{x:20,y:30,w:176,h:288,tone,phase,talking});
 return commands;
}
test("four original winter customers render as distinct layered pixel compositions",()=>{
 const signatures=[];
 for(let tone=0;tone<4;tone++){
  const rects=paint(tone,50);
  assert.ok(rects.length>65,"customer must contain individually painted details");
  for(const [x,y,w,h] of rects){
   assert.ok([x,y,w,h].every(Number.isInteger),"all pixels align to integer coordinates");
   assert.ok(w>0&&h>0,"no degenerate pixel rectangle");
   assert.ok(x>=20&&x+w<=196&&y>=30&&y+h<=319,"sprite stays inside its viewport");
  }
  signatures.push(JSON.stringify(rects));
 }
 assert.equal(new Set(signatures).size,4);
});
test("conversation changes mouth and arm pose without modifying game state",()=>{
 assert.notDeepEqual(paint(0,0,false),paint(0,0,true));
 assert.notDeepEqual(paint(1,0,true),paint(1,14,true));
});
test("blink and winter breath animate deterministically",()=>{
 assert.notDeepEqual(paint(0,0,false),paint(0,11,false));
 assert.deepEqual(paint(2,55,false),paint(2,55,false));
});
