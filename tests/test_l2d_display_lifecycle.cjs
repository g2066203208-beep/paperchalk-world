/* A late module decode must not revive a previously selected L2D actor. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('site/l2d/library-player.js','utf8');
let fetches=0,images=0,seq=0;
const frameFns=new Map(),deferred={};
function model(id){return {format:'paperchalk-part-rig-v1',characterId:id,face:'front',
  parts:{body:{id:'body',w:40,h:60,x:0,y:0,enabled:true}}};}
const actor={id:'enemy',img:{hidden:false,offsetWidth:120,offsetHeight:200},
  root:{hidden:false,dataset:{},isConnected:true},
  canvas:{width:120,height:200,getContext:()=>({setTransform(){},clearRect(){},drawImage(){},save(){},restore(){}})},
  rig:{stop(){}}};
const root={
 PaperchalkPartRigCore:{defaultIdleProfile:()=>({}),sanitizeIdleProfile:p=>p,
  bindBodyHierarchy(){},actionNames:()=>[],draw(){}},
 PaperchalkL2D:{get:()=>actor,async setAnimationSource(){return true}}
};
class Img{
 constructor(){images++;this.width=40;this.height=60}
 set src(value){this.url=value;queueMicrotask(()=>this.onload?.())}
}
async function fetchModule(url){
 fetches++;
 if(url.includes('slow'))return new Promise(resolve=>{deferred.slow=()=>resolve({ok:true,json:async()=>model('slow')})});
 return {ok:true,json:async()=>model('fast')};
}
vm.runInNewContext(code,{window:root,globalThis:root,Image:Img,fetch:fetchModule,
 requestAnimationFrame:f=>{const id=++seq;frameFns.set(id,f);return id},
 cancelAnimationFrame:id=>frameFns.delete(id),console},{filename:'site/l2d/library-player.js'});
const spec=id=>({url:'./assets/l2d/library/'+id+'/front.rig.json',
 sourceCharacterId:id,textures:{body:'./assets/l2d/library/'+id+'/body.png'}});
(async()=>{
 const api=root.PaperchalkL2DLibrary;
 const slow=api.attach('enemy','slow','front',spec('slow'));
 await new Promise(resolve=>setImmediate(resolve));
 const fast=await api.attach('enemy','fast','front',spec('fast'));
 assert.equal(fast.parts,1,'valid fast module must render');
 const active=api.get('enemy');
 assert.equal(active.model.characterId,'fast');
 deferred.slow();
 assert.equal(await slow,false,'old asynchronous module cannot overwrite newer actor');
 assert.strictEqual(api.get('enemy'),active);
 assert.equal(api.inspect('enemy').active,true);
 const before=fetches;
 await api.attach('enemy','fast','front',spec('fast'));
 assert.equal(fetches,before,'reselect should not refetch cached hosted rig');
 assert.ok(api.inspect('enemy').hits>=2,'model and PNG must both be cached');
 const old=api.get('enemy');api.detach('enemy');
 assert.equal(old.disposed,true);assert.equal(api.get('enemy'),null);
 assert.ok(images>=2,'real distinct image URLs should decode separately');
 console.log('PASS L2D async slot race, texture reuse, model separation and detach cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
