'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../site/game/metro-side-renderer.js'),'utf8');
function setup(){
  class ImageStub{
    naturalWidth=0;naturalHeight=0;
    set src(value){
      this.url=value;
      if(value.endsWith('/cabin-master-illustrated.webp')){
        this.naturalWidth=2172;this.naturalHeight=724;
        this.onload?.();
      }else this.onerror?.();
    }
  }
  const window={};
  vm.runInNewContext(source,{window,Image:ImageStub});
  return window.PaperWorldMetroSideRenderer;
}
function canvas(){
 const ops=[];
 const ctx={ops,
  fillRect(...args){ops.push(['fillRect',...args])},
  drawImage(...args){ops.push(['drawImage',...args])},
  clearRect(...args){ops.push(['clearRect',...args])},
  save(){},restore(){},strokeRect(){},beginPath(){},roundRect(){},
  fill(){},stroke(){},moveTo(){},lineTo(){},rect(){},clip(){},ellipse(){},
  createLinearGradient(){return {addColorStop(){}}}
 };
 return ctx;
}
test('the Anima master scene points to a separate reviewed asset, not a hard-coded image data string',()=>{
 const painter=setup();
 assert.equal(painter.ART.master,'./assets/metro/side/cabin-master-illustrated.webp');
 assert.equal(painter.hasMaster(),false);
});
test('2172x724 painted subway wall preserves exact aspect on 16:9 viewport',()=>{
 const painter=setup(),ctx=canvas();
 painter.drawBackground(ctx,1440,810,0,false);
 ctx.ops.length=0;
 painter.drawBackground(ctx,1440,810,0,false);
 const entry=ctx.ops.find(o=>o[0]==='drawImage');
 assert.ok(entry,'the loaded Anima scene should replace procedural geometry');
 assert.deepEqual(entry.slice(2),[0,165,1440,480]);
 assert.equal(painter.hasMaster(),true);
});
test('full illustration never receives a fake foreground bench on top of its built-in seat art',()=>{
 const painter=setup(),ctx=canvas(),fg=canvas();
 painter.drawBackground(ctx,2048,1024,0,false);
 painter.drawBackground(ctx,2048,1024,40,false);
 painter.drawForeground(fg,2048,1024,false);
 assert.ok(fg.ops.some(o=>o[0]==='clearRect'));
 assert.ok(!fg.ops.some(o=>o[0]==='fillRect'));
});
