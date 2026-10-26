import test from "node:test";
import assert from "node:assert/strict";
import {flatWindow,F} from "./kiosk-flat.js";
function capture(){
 const shapes=[];
 const ctx={fillStyle:"#000",beginPath(){},roundRect(x,y,w,h){this.shape={x,y,w,h}},fill(){shapes.push({...this.shape,color:this.fillStyle})}};
 return {ctx,shapes};
}
test("open window has an actual transparent aperture, not a fake opaque picture",()=>{
 const {ctx,shapes}=capture();
 flatWindow(ctx,12,20,220,170,true);
 assert.ok(shapes.length>=7);
 assert.ok(shapes.every(z=>z.w<110||z.h<85),"no solid panel may cover the open service window");
});
test("closed shutter fully covers window, while latch still remains present",()=>{
 const {ctx,shapes}=capture();
 flatWindow(ctx,12,20,220,170,false);
 assert.ok(shapes.some(z=>z.w>=200&&z.h>=150),"closed shutter must block aperture");
 assert.ok(shapes.some(z=>z.color===F.blue),"latch is visible in both states");
});
