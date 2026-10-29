/* Procedural 2D skeletons. Coordinates are authored in a root-local anatomical plane.
   Each node has exactly one parent, its own stable ID, rest position and bone length. */
export const TYPES=[
 {id:'biped',name:'双足',hint:'直立 · 人形 / 奇幻生物'},
 {id:'quadruped',name:'四足',hint:'侧面 · 兽形'},
 {id:'hexapod',name:'六足',hint:'节肢 · 昆虫'},
 {id:'serpent',name:'蛇形',hint:'连续脊柱 · 无腿'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rng=seed=>{let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
const p=(x,y)=>({x,y});
function norm(x,y){const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};}
function rigBuilder(type,seed,size,limbs){
 const random=rng(seed), bones=[],chains=[];
 const variability=()=>.84+random()*.32;
 const vertical=size/100,horizontal=limbs/100;
 function add(id,parent,x,y,group='spine',radius=5){
  if(bones.some(b=>b.id===id))throw Error('duplicate bone '+id);
  const par=parent?bones.find(b=>b.id===parent):null;
  if(parent&&!par)throw Error('missing parent '+parent);
  const node={id,parent,x:Math.round(x*10)/10,y:Math.round(y*10)/10,group,radius};
  node.length=par?Math.round(length(node,par)*10)/10:0;
  bones.push(node);return id;
 }
 function chain(root,mid,end,phase,bend){
  const a=bones.find(x=>x.id===root),b=bones.find(x=>x.id===mid),c=bones.find(x=>x.id===end);
  chains.push({root,mid,end,phase,bend,l1:length(a,b),l2:length(b,c)});
 }
 const sx=x=>x*horizontal,sy=y=>y*vertical;
 if(type==='biped'){
  add('pelvis',null,0,0,'core',10);
  add('spine-1','pelvis',0,sy(-33),'spine',9);
  add('chest','spine-1',0,sy(-70),'spine',12);
  add('neck','chest',0,sy(-91),'spine',7);
  add('skull','neck',0,sy(-116),'head',13);
  add('crown','skull',0,sy(-137),'head',10);
  for(const [s,side] of [['L',-1],['R',1]]){
   const arm=s+'-arm',leg=s+'-leg';
   const out=side*sx(1);
   add(s+'-shoulder','chest',out*(20+random()*7),sy(-68),'arm',7);
   add(s+'-elbow',s+'-shoulder',out*(35+random()*12),sy(-28)*variability(),'arm',6);
   add(s+'-wrist',s+'-elbow',out*(47+random()*10),sy(7),'arm',4);
   add(s+'-hand',s+'-wrist',out*(50+random()*10),sy(15),'arm',6);
   add(s+'-hip','pelvis',out*12,sy(6),'leg',8);
   add(s+'-knee',s+'-hip',out*(15+random()*5),sy(60)*variability(),'leg',7);
   add(s+'-ankle',s+'-knee',out*(16+random()*6),sy(127)*variability(),'leg',5);
   add(s+'-toe',s+'-ankle',out*(27+random()*4),sy(133),'leg',4);
   chain(s+'-shoulder',s+'-elbow',s+'-wrist',side===-1?0:Math.PI,-side);
   chain(s+'-hip',s+'-knee',s+'-ankle',side===-1?0:Math.PI,-side);
  }
 }else if(type==='quadruped'){
  const stride=sx(1),rise=sy(1);
  add('body-core',null,0,-25*rise,'core',13);
  add('lumbar','body-core',-48*stride,-23*rise,'spine',10);
  add('pelvis','lumbar',-83*stride,-24*rise,'spine',11);
  add('tail-1','pelvis',-105*stride,-38*rise,'tail',6);
  add('tail-2','tail-1',-126*stride,-54*rise,'tail',5);
  add('tail-tip','tail-2',-146*stride,-55*rise,'tail',3);
  add('thorax','body-core',49*stride,-30*rise,'spine',13);
  add('neck','thorax',78*stride,-51*rise,'spine',8);
  add('skull','neck',107*stride,-63*rise,'head',13);
  add('muzzle','skull',139*stride,-52*rise,'head',7);
  add('ear-1','skull',100*stride,-87*rise,'head',4);
  add('ear-2','skull',119*stride,-86*rise,'head',4);
  for(const [part,x,root] of [['rear',-83,'pelvis'],['front',48,'thorax']]){
   for(const [s,side] of [['far',-1],['near',1]]){
    const id=part+'-'+s,offset=(side===1?10:-10)*stride;
    const base=x*stride+offset,ground=(105+random()*10)*rise;
    add(id+'-hip',root,base,-18*rise,'leg',8);
    const kneeX=base+(part==='rear'?-21:16)*stride*variability();
    add(id+'-knee',id+'-hip',kneeX,45*rise,'leg',7);
    add(id+'-ankle',id+'-knee',base+(part==='rear'?4:10)*stride,ground,'leg',5);
    add(id+'-toe',id+'-ankle',base+22*stride,ground+4*rise,'leg',4);
    chain(id+'-hip',id+'-knee',id+'-ankle',(part==='rear'?0:Math.PI)+
      (s==='far'?Math.PI:0),part==='rear'?-1:1);
   }
  }
 }else if(type==='hexapod'){
  add('thorax',null,0,-24*sy(1),'core',13);
  let prev='thorax';
  for(let i=1;i<=3;i++){
   const id='abdomen-'+i;
   add(id,prev,-i*sx(34),sy(-23+Math.sin(i*.85)*4),'spine',12-i);
   prev=id;
  }
  add('tail-tip',prev,-sx(123),sy(-11),'tail',3);
  add('neck','thorax',sx(35),sy(-35),'spine',9);
  add('head','neck',sx(64),sy(-36),'head',15);
  add('mandible-L','head',sx(76),sy(-21),'head',4);
  add('mandible-R','head',sx(83),sy(-34),'head',4);
  add('antenna-L','head',sx(79),sy(-71),'head',3);
  add('antenna-R','head',sx(96),sy(-67),'head',3);
  for(let k=0;k<3;k++){
   for(const [side,label] of [[-1,'far'],[1,'near']]){
    const name='leg-'+k+'-'+label,x=(32-k*47)*sx(1);
    const parent=k===0?'thorax':k===1?'abdomen-1':'abdomen-2';
    add(name+'-root',parent,x,sy(-15+side*8),'leg',6);
    add(name+'-knee',name+'-root',x+sx((20-k*15)*side),sy(18+random()*20),'leg',6);
    add(name+'-foot',name+'-knee',x+sx((36-k*20)*side),sy(95+random()*10),'leg',4);
    chain(name+'-root',name+'-knee',name+'-foot',k*Math.PI/1.5+(side>0?Math.PI:0),side);
   }
  }
 }else if(type==='serpent'){
  const step=sx(24)*(.95+random()*.1);
  add('head',null,sx(144),sy(-10),'head',15);
  add('snout','head',sx(170),sy(-5),'head',7);
  add('jaw','head',sx(161),sy(13),'head',5);
  add('crest','head',sx(132),sy(-28),'head',4);
  let prev='head';
  for(let i=1;i<=13;i++){
   const name=i===13?'tail-tip':'spine-'+i;
   add(name,prev,sx(144)-i*step,sy(-10+Math.sin(i*.6)*9),'spine',Math.max(2,11-i*.65));
   prev=name;
  }
 }else throw Error('unknown species '+type);
 const label=TYPES.find(x=>x.id===type)?.name||type;
 return {version:1,type,label,seed,size,limbs,bones,chains};
}
export function generateRig(type='quadruped',seed=27,opts={}){
 const actualType=TYPES.some(x=>x.id===type)?type:'quadruped';
 return rigBuilder(actualType,(Number(seed)>>>0)||1,clamp(Number(opts.size)||100,65,140),
   clamp(Number(opts.limbs)||100,65,140));
}
export function validateRig(rig){
 const ids=new Set(),parents=new Map();
 for(const b of rig.bones){
  if(ids.has(b.id))throw Error('duplicate ID '+b.id);
  if(b.parent&&!ids.has(b.parent))throw Error('invalid hierarchy '+b.id);
  if(!Number.isFinite(b.x)||!Number.isFinite(b.y))throw Error('invalid coordinate '+b.id);
  ids.add(b.id);parents.set(b.id,b.parent);
 }
 for(const c of rig.chains)if(![c.root,c.mid,c.end].every(id=>ids.has(id)))
  throw Error('broken chain');
 return {bones:rig.bones.length,chains:rig.chains.length,roots:rig.bones.filter(b=>!b.parent).length};
}
/** Exact fixed-length 2-bone IK, with reachable target clamped to joint workspace. */
export function solveTwoBone(a,target,l1,l2,bend=1){
 const d=Math.hypot(target.x-a.x,target.y-a.y);
 const lo=Math.abs(l1-l2)+1e-6,hi=l1+l2-1e-6;
 const reach=clamp(d,lo,hi);
 const unit=norm(target.x-a.x,target.y-a.y);
 const tx=a.x+unit.x*reach,ty=a.y+unit.y*reach;
 const u=(l1*l1-l2*l2+reach*reach)/(2*reach);
 const h=Math.sqrt(Math.max(0,l1*l1-u*u));
 return {
  mid:p(a.x+unit.x*u-unit.y*h*bend,a.y+unit.y*u+unit.x*h*bend),
  end:p(tx,ty),reachable:d<=hi&&d>=lo
 };
}
export function poseRig(rig,time=0,options={}){
 const play=options.play!==false,turn=play?time:0;
 const phase=turn*Math.PI*2*.85;
 const bob=play?Math.sin(phase*2)*3:0;
 const sway=play?Math.sin(phase)*2.5:0;
 const posed=new Map();
 for(const bone of rig.bones)posed.set(bone.id,{x:bone.x,y:bone.y+bob});
 if(rig.type==='serpent'){
  let prev=null;
  rig.bones.forEach((bone,i)=>{
   const point=posed.get(bone.id);
   if(i===0){point.y+=Math.sin(phase)*8;prev=point;return;}
   if(['snout','jaw','crest'].includes(bone.id))return;
   const parent=posed.get(bone.parent);
   const desired=p(bone.x,bone.y+Math.sin(phase+i*.48)*16);
   const v=norm(desired.x-parent.x,desired.y-parent.y);
   const len=rig.bones.find(b=>b.id===bone.id).length;
   point.x=parent.x+v.x*len;point.y=parent.y+v.y*len;
  });
  for(const id of ['snout','jaw','crest']){
   const bone=rig.bones.find(b=>b.id===id);
   const node=posed.get(id),head=posed.get('head');
   node.x=head.x+(bone.x-rig.bones[0].x);
   node.y=head.y+(bone.y-rig.bones[0].y);
  }
 }else{
  for(const bone of rig.bones){
   const pos=posed.get(bone.id);
   if(bone.group==='head'||bone.group==='tail')pos.y+=sway*.9;
   if(bone.group==='head')pos.x+=sway;
  }
  for(const chain of rig.chains){
   const start=posed.get(chain.root),rest=rig.bones.find(b=>b.id===chain.end);
   const walking=play?Math.sin(phase+chain.phase):0;
   const isArm=chain.mid.toLowerCase().includes('elbow');
   const target=p(rest.x+(isArm?Math.sin(phase+chain.phase)*7:walking*12),
     rest.y+(isArm?Math.cos(phase+chain.phase)*7:Math.max(0,walking)*-16));
   if(options.drag&&options.drag.id===chain.end){
    target.x=options.drag.x;target.y=options.drag.y;
   }
   const solved=solveTwoBone(start,target,chain.l1,chain.l2,chain.bend);
   Object.assign(posed.get(chain.mid),solved.mid);
   Object.assign(posed.get(chain.end),solved.end);
   // End attachments rotate with their end-effector rather than floating in rest pose.
   const child=rig.bones.find(b=>b.parent===chain.end);
   if(child){
    const c=posed.get(child.id);
    c.x=solved.end.x+child.x-rest.x;c.y=solved.end.y+child.y-rest.y;
   }
  }
 }
 return posed;
}
export function bounds(rig,pose=poseRig(rig,0,{play:false})){
 const points=[...pose.values()];
 return {minX:Math.min(...points.map(a=>a.x)),maxX:Math.max(...points.map(a=>a.x)),
   minY:Math.min(...points.map(a=>a.y)),maxY:Math.max(...points.map(a=>a.y))};
}
export const findBone=(rig,id)=>rig.bones.find(b=>b.id===id);
export function rigToJSON(rig){return JSON.stringify({format:'creature-rig-v1',...rig},null,2);}
