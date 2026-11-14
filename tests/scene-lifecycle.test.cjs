'use strict';
// Forest transition QA: object roots NEVER migrate toward world origin.
// Static frames remain batched; only in-flight animations use per-prop meshes.
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const window={};
const ctx=vm.createContext({window,Math,Map,Set,Array,Object,Number,Error});
for(const name of ['object-animations','scene-lifecycle','forest-dressing']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/engine/'+name+'.js'),'utf8'),ctx,{filename:name});
}
const I=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const T=(x,y,z)=>{const m=I();m[12]=x;m[13]=y;m[14]=z;return m;};
const S=(x,y,z)=>{const m=I();m[0]=x;m[5]=y;m[10]=z;return m;};
function mul(a,b){const m=new Array(16).fill(0);
 for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)
  m[j*4+i]+=a[k*4+i]*b[j*4+k];
 return m;
}
const transform=(m,[x,y,z])=>[
 m[0]*x+m[4]*y+m[8]*z+m[12],
 m[1]*x+m[5]*y+m[9]*z+m[13],
 m[2]*x+m[6]*y+m[10]*z+m[14]];
const same=(a,b,epsilon=1e-7)=>a.every((n,i)=>Math.abs(n-b[i])<epsilon);
const fx=window.PaperchalkObjectAnimations.create();
const logs=[];
const props=window.PaperchalkForestDressing.create({
 terrain:{topY:0,width:42.4,depth:15.9,centerX:0,centerZ:0},
 I,T,S,mul,makeGeom:(v,i)=>({vertices:v.length/8,indices:i.length}),
 renderGeom:(mesh,model)=>logs.push({mesh,model}),
 appearance:(id,t)=>fx.sample(id,t),enabled:true
});
assert.equal(props.snapshot.treeCount,45);
assert.equal(props.snapshot.grassBlades,650);
assert.ok(props.propIds.includes('dressing-tree-0'));
assert.ok(props.propIds.includes('dressing-rock-0'));
assert.ok(props.propIds.includes('dressing-grass-0'));
assert.ok(props.propIds.includes('dressing-flower-0'));
assert.ok(props.propIds.length>130);
const originalA=props.getAnchor('dressing-tree-0');
const originalB=props.getAnchor('dressing-tree-1');
assert.notDeepEqual(originalA,originalB);
props.draw(0,'forest');
const steadyCalls=logs.length;
assert.ok(steadyCalls<=15,'static forest must remain genuinely batched');
logs.length=0;
fx.enter('dressing-tree-0',0,{duration:1,overshoot:1.08});
props.draw(.35,'forest');
assert.ok(logs.length>steadyCalls,'transition must unbatch independently');
const k=fx.sample('dressing-tree-0',.35).scale;
assert.ok(k>0&&k!==1);
const transformed=transform(logs[0].model,originalA);
assert.ok(same(transformed,originalA),
 'tree root moved toward center instead of scaling around its OWN position');
const movedTip=transform(logs[0].model,[originalA[0]+1,originalA[1],originalA[2]]);
assert.ok(Math.abs(movedTip[0]-(originalA[0]+k))<1e-6,
 'top/tree geometry must use local scale');
const scheduler=window.PaperchalkSceneLifecycle.create({animation:fx,groups:[
 {id:'dressing',ids:scene=>scene==='forest'?props.propIds:[],
  enter:{duration:.6,stagger:.002,maxDelay:.15,overshoot:1.12},
  exit:{duration:.4}},
 {id:'ground',ids:scene=>['ground:'+scene]}
]});
const outgoing=scheduler.play('exit','forest',1);
assert.equal(outgoing.count,props.propIds.length+1);
assert.ok(fx.sample('dressing-tree-0',1.2).scale<1);
scheduler.release('forest');
const entering=scheduler.play('enter','forest',2);
assert.equal(entering.count,outgoing.count);
assert.equal(fx.sample('dressing-tree-0',2).phase,'enter');
assert.ok(fx.sample('dressing-tree-0',2.3).scale>0);
const clearing=scheduler.itemsFor('clearing');
assert.equal(clearing.length,1);
assert.equal(clearing[0].id,'ground:clearing');
fx.reset();logs.length=0;
props.draw(5,'forest');
assert.equal(logs.length,steadyCalls,
 'after scene changes, renderer must recover original static batching');
console.log('LOCAL_SCENE_TRANSITION_PASS',JSON.stringify({
 roots:props.propIds.length,batchedDraws:steadyCalls,
 groundRootPreserved:true,sceneProviders:scheduler.snapshot.providers}));
