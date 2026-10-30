import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('site/pixel-lab/editor-core.js','utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));

test('exactly four opaque inks plus transparent: document is integer indexed',()=>{
 const p=m.createProject(32,48);
 assert.equal(p.width*p.height,m.cel(p).length);
 assert.deepEqual(p.palette,m.INKS);
 assert.equal(m.putPixel(p,1,1,4),true);
 assert.equal(m.sample(p,1,1),4);
 assert.equal(m.putPixel(p,-1,1,3),false);
 assert.equal(m.putPixel(p,5,5,9),false);
 assert.equal(m.sample(p,1,1),4);
 assert.throws(()=>m.createProject(513,32));
 assert.equal(m.quantizeRGBA(255,245,230,255),4);
 assert.equal(m.quantizeRGBA(255,245,230,1),0);
});
test('Bresenham lines do not skip cells; mirrored strokes stay integer',()=>{
 const p=m.createProject(16,16);
 assert.equal(m.line(p,0,0,7,7,2),true);
 for(let i=0;i<=7;i++)assert.equal(m.sample(p,i,i),2);
 m.line(p,2,4,2,5,1,1,true);
 assert.equal(m.sample(p,2,4),1);
 assert.equal(m.sample(p,13,4),1);
});
test('flood-fill changes only connected region; clear uses index zero',()=>{
 const p=m.createProject(16,16);
 m.rect(p,1,1,10,10,1,false);
 assert.equal(m.floodFill(p,5,5,2),true);
 assert.equal(m.sample(p,5,5),2);
 assert.equal(m.sample(p,1,5),1);
 assert.equal(m.sample(p,0,5),0);
 assert.equal(m.floodFill(p,5,5,2),false);
});
test('layers, visibility and frames do not alias one another',()=>{
 const p=m.createProject(16,16);
 m.putPixel(p,1,1,1);
 m.addLayer(p);m.putPixel(p,1,1,3);
 assert.equal(m.sample(p,1,1),3);
 p.layers[1].visible=false;
 assert.equal(m.sample(p,1,1),1);
 p.layers[1].visible=true;
 m.addFrame(p);
 m.putPixel(p,1,1,4);
 assert.equal(m.sample(p,1,1),4);
 p.activeFrame=0;
 assert.equal(m.sample(p,1,1),3);
 p.activeFrame=1;
 m.deleteLayer(p);
 assert.equal(m.sample(p,1,1),1);
 m.deleteFrame(p);
 assert.equal(p.frames.length,1);
 assert.equal(m.validateProject(p),p);
});
test('selection copy/erase/paste respects bounds and keeps transparency',()=>{
 const p=m.createProject(16,16);
 m.rect(p,1,2,4,5,3,true);
 const clip=m.selectionCopy(p,{x:1,y:2,w:4,h:4});
 assert.equal(clip.data.length,16);
 m.selectionErase(p,{x:1,y:2,w:4,h:4});
 assert.equal(m.sample(p,2,3),0);
 m.selectionPaste(p,clip,9,10);
 assert.equal(m.sample(p,10,11),3);
});
test('JSON validation rejects fifth pigment and invalid sizes without silent repair',()=>{
 const p=m.createProject(16,16);
 const invalid=structuredClone(p);invalid.frames[0].cels[0][0]=5;
 assert.throws(()=>m.validateProject(invalid));
 const bogus=structuredClone(p);bogus.palette[0]='#FFFFFF';
 assert.throws(()=>m.validateProject(bogus));
 const broken=structuredClone(p);broken.layers.push({id:'x',name:'bad',visible:true});
 assert.throws(()=>m.validateProject(broken));
});
test('PNG quantization converts alpha to transparency, exact official inks remain exact',()=>{
 assert.equal(m.quantizeRGBA(57,54,87,255),1);
 assert.equal(m.quantizeRGBA(242,165,194,255),2);
 assert.equal(m.quantizeRGBA(169,186,233,255),3);
 assert.equal(m.quantizeRGBA(255,245,230,255),4);
 assert.equal(m.quantizeRGBA(169,186,233,127),0);
});
