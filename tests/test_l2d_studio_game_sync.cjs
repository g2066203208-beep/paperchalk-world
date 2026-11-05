/* Studio -> game PartRig fidelity: hosted and same-origin local assets.
 * Uses actual game adapter in a deterministic canvas/browser mock.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('site/l2d/library-player.js','utf8');
let frameId=0;
const actors=new Map();
const root={
 PaperchalkPartRigCore:{
  defaultIdleProfile:()=>({profileVersion:4}),
  sanitizeIdleProfile:x=>x,
  bindBodyHierarchy:m=>{m.bound=true},
  actionNames:()=>[],
  sanitize:(edit,orig)=>({...orig,...edit}),
  draw(){}
 },
 PaperchalkL2DCanvasBudget:{backingSize:()=>({width:200,height:200})},
 PaperchalkL2D:{
  get:id=>{if(!actors.has(id))actors.set(id,{
   id,img:{hidden:false,offsetWidth:200,offsetHeight:200},
   root:{hidden:false,dataset:{}},
   canvas:{width:200,height:200,addEventListener(){},removeEventListener(){},
    getContext:()=>({setTransform(){},clearRect(){},drawImage(){},save(){},restore(){}})},
   rig:{stop(){}}
  });return actors.get(id)},
  async setAnimationSource(){return true}
 }
};
function part(id,i){return {id,name:id,x:20+i*7,y:40,w:64,h:64,
 enabled:true,pivot:{x:.5,y:0},tip:{x:.5,y:1},
 mesh:{columns:4,rows:4},motion:{x:0,y:0,angle:0,frequency:1}}}
function rig(id,n){return {format:'paperchalk-part-rig-v1',characterId:id,face:'front',
 parts:Object.fromEntries(Array.from({length:n},(_,i)=>{const k='part'+i;return [k,part(k,i)]})),
 layerOrder:Array.from({length:n},(_,i)=>'part'+i),
 idleProfile:{profileVersion:4,parts:{part0:1}}}}
const original=rig('published',10);
class Img{
 constructor(){this.width=64;this.height=64}
 set src(v){this.location=v; if(v.includes('BAD'))this.width=11;queueMicrotask(()=>this.onload?.())}
}
async function fetchAsset(url){
 if(url.endsWith('front.rig.json'))return {ok:true,json:async()=>structuredClone(original)};
 throw Error('unexpected model fetch: '+url);
}
const sandbox={window:root,globalThis:root,Image:Img,fetch:fetchAsset,
 console,requestAnimationFrame:()=>++frameId,cancelAnimationFrame:()=>{},
 document:{hidden:false}};
vm.runInNewContext(source,sandbox,{filename:'site/l2d/library-player.js'});
const api=root.PaperchalkL2DLibrary;
const art=(id,n)=>Array.from({length:n},(_,i)=>({
 sourcePart:true,partId:'part'+i,x:20+i*7,y:40,
 img:'data:image/png;base64,AA==',visible:true,opacity:1
}));
async function main(){
 // Tiny but legitimate published rigs must remain playable after edits.
 // CI's qa-rig intentionally has only two genuine textures.
 const mini=rig('mini',2);
 mini.parts.part0.motion.angle=2.25;
 const tiny=await api.attach('mini-slot','mini','front',null,mini,art('mini',2));
 assert.equal(tiny.parts,2);
 assert.equal(api.get('mini-slot').model.parts.part0.motion.angle,2.25);
 // Completely private L2D from Studio: before this repair, the game fell
 // back to a simplified PSD rig or an unrelated V4 because no hosted URL.
 const own=rig('local-user',8);
 own.parts.part0.motion.angle=4.75;
 own.layerOrder.reverse();
 const local=await api.attach('player','local-user','front',null,own,art('local-user',8));
 assert.equal(local.parts,8);
 let state=api.get('player');
 assert.equal(state.model.parts.part0.motion.angle,4.75);
 assert.equal(state.model.layerOrder[0],'part7');
 assert.equal(state.model.bound,true);
 assert.equal(state.personalised,true);
 assert.equal(state.actor.root.dataset.l2dEdition,'local-studio-part-mesh');
 // Hosting a new version with two extra layers must preserve the old
 // eight edited bones, original source PNGs, and Z ordering.
 const partial=rig('published',8);
 partial.parts.part0.motion.angle=5.5;
 partial.layerOrder.reverse();
 await api.attach('enemy','published','front',{
  url:'./assets/l2d/library/published/front.rig.json',
  textures:Object.fromEntries(Array.from({length:10},(_,i)=>['part'+i,
   './assets/l2d/library/published/part'+i+'.png']))
 },partial,art('published',8));
 state=api.get('enemy');
 assert.equal(state.model.parts.part0.motion.angle,5.5);
 assert.equal(state.model.parts.part9.motion.angle,0);
 assert.deepEqual(Array.from(state.model.layerOrder.slice(0,3)),['part7','part6','part5']);
 assert.equal(state.model.layerOrder.length,10);
 assert.equal(state.personalised,true);
 assert.equal(state.actor.root.dataset.l2dEdition,'locally-edited-part-mesh');
 // Invalid draft must never quietly display the old published picture.
 const bad=rig('published',8);
 bad.parts.unknown=part('unknown',100);
 await assert.rejects(api.attach('enemy','published','front',{
  url:'./assets/l2d/library/published/front.rig.json',
  textures:Object.fromEntries(Array.from({length:10},(_,i)=>['part'+i,
   './assets/l2d/library/published/part'+i+'.png']))
 },bad,art('published',8)),/不兼容/);
 // Image dimensions not equal to rig dimensions must also be visible error.
 const invalidArt=art('local-user',8);
 invalidArt[2].img='data:image/png;base64,BAD=';
 await assert.rejects(api.attach('player','local-user','front',null,own,invalidArt),
  /尺寸不匹配/);
 assert.equal(api.get('player').model.parts.part0.motion.angle,4.75,
  'rejected asset must never mutate the existing working model');
 console.log('PASS studio saved PartRig+PNG -> game, published migration, Z order, mismatch rejection');
}
main().catch(e=>{console.error(e);process.exitCode=1});
