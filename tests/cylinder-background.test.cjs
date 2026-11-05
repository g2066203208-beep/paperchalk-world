'use strict';
const assert=require('node:assert/strict');
const cylinder=require('../site/game/cylinder-background.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,[a,b].join(' != '));
near(cylinder.projectU(0),0);
near(cylinder.projectU(.5),.5);
near(cylinder.projectU(1),1);
assert.ok(cylinder.projectU(.5,.08)>.5);
for(let x=.01;x<=1;x+=.01)
  assert.ok(cylinder.projectU(x)>cylinder.projectU(x-.01));
near(cylinder.verticalFraction(.5),1);
assert.ok(cylinder.verticalFraction(0)<1&&cylinder.verticalFraction(0)>.8);

const listeners={},cssClasses=new Set();
let calls=0,fail=false,canvas;
const ctx={
  clearRect(){},drawImage(){if(fail)throw Error('canvas reset');calls++},
  imageSmoothingEnabled:false,imageSmoothingQuality:'low'
};
const source={
  complete:true,naturalWidth:1024,naturalHeight:576,
  src:'/classroom.webp',currentSrc:'/classroom.webp',
  classList:{add:v=>cssClasses.add(v),remove:v=>cssClasses.delete(v)},
  insertAdjacentElement(_where,node){canvas=node},
  addEventListener(type,fn){listeners[type]=fn}
};
const stage={clientWidth:1024,clientHeight:576,dataset:{}};
global.window={devicePixelRatio:1,addEventListener(){}};
global.document={createElement(type){
  assert.equal(type,'canvas');
  return {hidden:true,width:0,height:0,setAttribute(){},
    getContext(){return ctx}};
}};
global.ResizeObserver=class{observe(node){assert.equal(node,stage)}};
const instance=cylinder.create({stage,source});
assert.ok(canvas);
assert.equal(instance.inspect().enabled,false);
instance.setScene('classroom');
assert.equal(stage.dataset.backgroundSurface,'cylinder');
assert.equal(canvas.hidden,false);
assert.ok(cssClasses.has('scene-cylinder-source-hidden'));
assert.ok(calls>100);
const after=calls;
instance.setView(0,0);
assert.equal(calls,after,'unchanged camera should not redraw');
instance.setView(1,.5);
assert.ok(calls>after,'mouse motion should update the curved background');
assert.ok(instance.inspect().yawDegrees>0);
source.complete=false;
source.src='/bedroom.webp';
source.currentSrc='/bedroom.webp';
instance.setScene('bedroom');
assert.equal(canvas.hidden,true,'do not show previous room image');
assert.ok(!cssClasses.has('scene-cylinder-source-hidden'));
source.complete=true;
listeners.load();
assert.equal(canvas.hidden,false);
assert.equal(stage.dataset.backgroundSurface,'cylinder');
fail=true;
assert.equal(instance.refresh(),false,'drawing failure must not break the game');
assert.equal(canvas.hidden,true,'failed projection reveals unchanged source');
fail=false;
instance.refresh();
assert.equal(canvas.hidden,false,'projection can recover without reloading');
instance.setScene('menu');
assert.equal(canvas.hidden,true,'menu keeps original flat artwork');
assert.ok(!cssClasses.has('scene-cylinder-source-hidden'));
console.log('PASS: cylindrical background geometry, image switching, fallback, camera motion');
