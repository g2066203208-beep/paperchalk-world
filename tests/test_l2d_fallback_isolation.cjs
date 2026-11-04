/* Published PartRig must not be overwritten by a fallback image load.
 * Verify this at the real runtime adapter boundary without browser timing.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('site/l2d/runtime.js','utf8');
let proceduralDraws=0,sourceUpdates=0,stops=0;
const img={complete:true,naturalWidth:1024,currentSrc:'part-a.png',src:'part-a.png',
 offsetWidth:200,offsetHeight:200,offsetLeft:0,offsetTop:0,hidden:false,
 dataset:{characterId:'protagonist',characterSide:'front'},
 addEventListener(){},getAttribute:k=>k==='src'?'part-a.png':null};
const canvas={width:1024,height:1024,style:{},
 getContext:()=>({clearRect(){},setTransform(){},drawImage(){}})};
const actor={dataset:{l2dActor:'player'},hidden:false,
 querySelector:s=>s==='[data-l2d-image]'?img:s==='[data-l2d-canvas]'?canvas:null};
const document={hidden:false,body:{},querySelectorAll:()=>[actor]};
class Rig{
 constructor(){this.ready=Promise.resolve(this)}
 async setImage(){sourceUpdates++;proceduralDraws++;return this}
 setAmplitude(v){this.amplitude=v;proceduralDraws++}
 setPeriod(v){this.period=v}
 setSoftness(v){this.softness=v}
 start(){}
 stop(){stops++}
}
class Observer{observe(){}}
const root={PaperchalkL2DRig:Rig,devicePixelRatio:1};
vm.runInNewContext(source,{window:root,document,MutationObserver:Observer,
 requestAnimationFrame(){return 1},cancelAnimationFrame(){},
 performance:{now:()=>100},console},{filename:'site/l2d/runtime.js'});
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 const api=root.PaperchalkL2D,a=api.get('player');
 assert.ok(a.rig);
 a.libraryPlayer={};
 img.currentSrc='part-b.png';img.src='part-b.png';
 await api.refresh('player');
 assert.equal(sourceUpdates,0,'invisible fallback must not decode into active rig canvas');
 assert.equal(proceduralDraws,0,'invisible fallback must not paint over original part meshes');
 assert.equal(a.root.dataset.l2dState,'ready');
 api.setProfile('player',{amplitude:1.4,period:6});
 assert.equal(proceduralDraws,0,'editing a profile cannot render the procedural fallback');
 assert.equal(a.rig.amplitude,1.4);
 await api.setAnimationSource('player',null,{suspendFallback:true});
 assert.equal(proceduralDraws,0,'module handoff must not flash an old bitmap');
 assert.ok(stops>0);
 a.libraryPlayer=null;
 await api.setAnimationSource('player',null);
 assert.equal(sourceUpdates,1,'visible fallback should decode the latest selected source');
 assert.ok(proceduralDraws>=1,'visible fallback must draw when explicitly selected');
 console.log('PASS L2D active PartRig isolated from fallback source updates, profile and handoff');
})().catch(e=>{console.error(e);process.exitCode=1});
