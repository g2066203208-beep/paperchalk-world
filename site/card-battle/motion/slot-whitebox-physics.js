/* Paperchalk Slots & Daggers motion study, ORIGINAL whitebox physics V2.
 * The reference clearly stores its coin pile LEFT OF THE MACHINE.
 * This is a fixed-step 2D proxy for shallow thin coins, not the original game's code.
 * Coins share collision/stacking with persistent previously earned coins.
 */
(function(root,factory){
 const value=factory();
 if(typeof module==='object'&&module.exports)module.exports=value;
 if(root)root.PaperchalkSlotWhitebox=value;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const STEP=1/120,TAU=Math.PI*2;
 const WORLD=Object.freeze({width:1000,height:600,left:62,right:271,floor:529,
   chuteX:258,chuteY:224,coinRadius:12.0, machineX:283,top:18});
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function prng(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=s;
   t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;};}
 class Payout{
  constructor(opts={}){
   this.seed=(opts.seed??20261118)>>>0;
   this.requested=clamp(Math.floor(opts.count??48),1,160);
   this.initialPile=clamp(Math.floor(opts.initialPile??0),0,40);
   this.restart();
  }
  _coin(x,y,r,rest=false){
   return {id:++this._ids,x,y,px:x,py:y,vx:0,vy:0,r,invMass:1/(r*r),
     angle:this.rand()*TAU,flip:this.rand()*TAU,spin:0,flipSpeed:0,
     restitution:.18+this.rand()*.11,sleeping:rest,grounded:rest,
     restFor:rest?.9:0,collisions:0,lastImpactTick:-999,old:rest};
  }
  restart(){
   this.rand=prng(this.seed);this.coins=[];this.time=0;this.tick=0;
   this.emitted=0;this.nextEmission=0;this.impacts=0;this.coinImpacts=0;
   this.wallImpacts=0;this.pairsChecked=0;this._ids=0;
   this.phase='ready';this.finishedAt=-1;
   // A persistent 3-row staggered pile, physically present before another payout.
   // All these bodies can wake and collide with newly ejected coins.
   let left=this.initialPile;
   for(let row=0;row<4&&left>0;row++){
    const n=Math.min(6-row,left);
    const r=WORLD.coinRadius;
    const spacing=2*r+.55;
    const x0=88+row*11;
    for(let i=0;i<n;i++){
     const c=this._coin(x0+i*spacing,WORLD.floor-r-row*(r*1.78),r,true);
     this.coins.push(c);
    }
    left-=n;
   }
   return this;
  }
  launch(count=this.requested,seed=this.seed){
   this.seed=seed>>>0;this.requested=clamp(Math.floor(count),1,160);
   this.restart();this.phase='payout';this._emit();this._schedule();return this;
  }
  append(count=this.requested){
   // Add another physical payout to the SAME existing pile; never erase coins.
   this.requested=clamp(Math.floor(count),1,160);
   this.emitted=0;this.phase='payout';this.finishedAt=-1;
   this._emit();this._schedule();return this;
  }
  _schedule(){
   // A ratcheting hopper; each coin is a new independently simulated body.
   const p=this.emitted/this.requested;
   const dt=p<.12?.050:p<.82?.030:p<.96?.041:.061;
   this.nextEmission=this.time+dt+this.rand()*.006;
  }
  _emit(){
   if(this.emitted>=this.requested)return;
   this.emitted++;
   const r=WORLD.coinRadius*(.94+.08*this.rand());
   let x=WORLD.right-r-2-(this.rand()*3.2);
   let y=WORLD.chuteY+(this.rand()-.5)*9;
   // The outlet and the previous coin may still overlap as an actual mechanism:
   // move the newly fed coin slightly upstream before feeding the solver.
   for(let tries=0;tries<8;tries++){
    let conflict=false;
    for(const c of this.coins){if(Math.hypot(c.x-x,c.y-y)<c.r+r+1){conflict=true;break;}}
    if(!conflict)break;
    y-=r*.7;x-=r*.2;
   }
   const c=this._coin(x,y,r);
   const force=.83+this.rand()*.38;
   c.vx=-(348+this.rand()*232)*force;
   c.vy=-(160+this.rand()*255)*force;
   c.spin=(this.rand()-.5)*16;
   c.flipSpeed=(9+this.rand()*13)*(this.rand()<.5?-1:1);
   this.coins.push(c);
  }
  _impact(a,b,normalSpeed){
   if(normalSpeed<33||this.tick-a.lastImpactTick<8)return;
   a.lastImpactTick=this.tick;
   a.collisions++;this.impacts++;
   if(b){this.coinImpacts++;b.collisions++;}else this.wallImpacts++;
  }
  _bound(c,countImpact=true){
   const {left,right,floor,top}=WORLD;
   if(c.y+c.r>=floor){
    const impact=c.vy;
    c.y=floor-c.r;
    if(impact>42&&countImpact)this._impact(c,null,impact);
    c.vy=impact>50?-impact*c.restitution:0;
    c.vx*=.928;
    c.spin*=.94;
    c.grounded=true;
   }
   if(c.x-c.r<left){
    const impact=-c.vx;c.x=left+c.r;
    if(impact>40&&countImpact)this._impact(c,null,impact);
    c.vx=impact>45?Math.abs(c.vx)*.32:0;
    c.spin*=.86;
   }
   if(c.x+c.r>right){
    const impact=c.vx;c.x=right-c.r;
    if(impact>40&&countImpact)this._impact(c,null,impact);
    c.vx=impact>45?-Math.abs(c.vx)*.25:0;
    c.spin*=.86;
   }
   if(c.y-c.r<top){
    c.y=top+c.r;if(c.vy<0)c.vy=-c.vy*.23;
   }
  }
  _contacts(){
   const coins=this.coins,cell=26,cells=new Map();
   for(let i=0;i<coins.length;i++){
    const c=coins[i],kx=Math.floor(c.x/cell),ky=Math.floor(c.y/cell),key=kx+','+ky;
    if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
   }
   const offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
   const pairs=[];
   for(let i=0;i<coins.length;i++){
    const a=coins[i],ix=Math.floor(a.x/cell),iy=Math.floor(a.y/cell);
    for(const [dx,dy] of offsets){
     const other=cells.get((ix+dx)+','+(iy+dy));if(!other)continue;
     for(const j of other)if(j>i)pairs.push([i,j]);
    }
   }
   this.pairsChecked+=pairs.length;
   // Project overlapping discs and solve contact impulses repeatedly.
   for(let k=0;k<9;k++){
    for(const [ia,ib] of pairs){
     const a=coins[ia],b=coins[ib];
     const dx=b.x-a.x,dy=b.y-a.y,limit=a.r+b.r;
     const d2=dx*dx+dy*dy;
     if(d2>=limit*limit)continue;
     const d=Math.sqrt(Math.max(d2,1e-10));
     const nx=d<1e-5?(ia%2?1:-1):dx/d,ny=d<1e-5?0:dy/d;
     const speed=Math.abs((b.vx-a.vx)*nx+(b.vy-a.vy)*ny);
     if(a.sleeping&&!b.sleeping&&speed>34){a.sleeping=false;a.restFor=0;}
     if(b.sleeping&&!a.sleeping&&speed>34){b.sleeping=false;b.restFor=0;}
     let invA=a.sleeping?0:a.invMass,invB=b.sleeping?0:b.invMass;
     if(invA+invB===0){
      // Two resting coins must still be geometrically de-penetrated.
      const correction=Math.max(0,(limit-d)-.04)*.44;
      a.x-=nx*correction;a.y-=ny*correction;
      b.x+=nx*correction;b.y+=ny*correction;
      continue;
     }
     const sum=invA+invB;
     const depth=limit-d;
     const corr=Math.max(0,depth-.025)*.87/sum;
     a.x-=nx*corr*invA;a.y-=ny*corr*invA;
     b.x+=nx*corr*invB;b.y+=ny*corr*invB;
     if(ny>.47){a.grounded=true;}
     if(ny<-.47){b.grounded=true;}
     const rvx=b.vx-a.vx,rvy=b.vy-a.vy;
     const vn=rvx*nx+rvy*ny;
     if(vn<0){
      const e=vn< -60?Math.min(a.restitution,b.restitution):0;
      const impulse=-(1+e)*vn/sum;
      a.vx-=impulse*nx*invA;a.vy-=impulse*ny*invA;
      b.vx+=impulse*nx*invB;b.vy+=impulse*ny*invB;
      const tx=-ny,ty=nx;
      const jt=clamp(-(rvx*tx+rvy*ty)/sum,-impulse*.28,impulse*.28);
      a.vx-=jt*tx*invA;a.vy-=jt*ty*invA;
      b.vx+=jt*tx*invB;b.vy+=jt*ty*invB;
      a.spin-=jt*.0009;b.spin+=jt*.0009;
      if(k===0)this._impact(a,b,-vn);
     }
    }
    for(const c of coins)this._bound(c,false);
   }
  }
  step(){
   if(this.phase==='ready')return this;
   const dt=STEP;this.time=(++this.tick)*dt;
   while(this.emitted<this.requested&&this.time>=this.nextEmission){this._emit();this._schedule();}
   for(const c of this.coins){
    if(c.sleeping)continue;
    c.grounded=false;c.px=c.x;c.py=c.y;
    c.vx*=.9981;c.vy=(c.vy+1100*dt)*.9988;
    c.x+=c.vx*dt;c.y+=c.vy*dt;
    c.flip+=c.flipSpeed*dt;c.angle+=c.spin*dt;
    this._bound(c);
   }
   this._contacts();
   let awake=0;
   for(const c of this.coins){
    if(c.sleeping)continue;
    const supported=c.grounded||this.coins.some(o=>o!==c&&o.y>c.y+c.r*.25&&
     Math.hypot(o.x-c.x,o.y-c.y)<o.r+c.r+1.1);
    const canRest=supported&&Math.abs(c.vy)<26&&Math.abs(c.vx)<19;
    if(canRest){
     c.restFor+=dt;c.vx*=.94;c.vy*=.88;c.spin*=.94;
     if(c.restFor>.54){c.sleeping=true;c.vx=0;c.vy=0;c.spin=0;c.flipSpeed=0;}
    }else c.restFor=0;
    if(!c.sleeping)awake++;
   }
   if(this.emitted===this.requested){
    if(this.phase==='payout')this.phase='settling';
    if(!awake&&this.finishedAt<0){this.finishedAt=this.time;this.phase='settled';}
   }
   return this;
  }
  advance(seconds){for(let k=0,n=Math.max(0,Math.round(seconds/STEP));k<n;k++)this.step();return this;}
  seek(ms){this.launch(this.requested,this.seed);for(let k=0,n=Math.max(0,Math.round(ms/(STEP*1000)));k<n;k++)this.step();return this;}
  maxOverlap(){let max=0;for(let i=0;i<this.coins.length;i++)for(let j=i+1;j<this.coins.length;j++){
   const a=this.coins[i],b=this.coins[j];max=Math.max(max,a.r+b.r-Math.hypot(b.x-a.x,b.y-a.y));
  }return max;}
  snapshot(){const sleeping=this.coins.filter(x=>x.sleeping).length;
   return {seed:this.seed,timeMs:Math.round(this.time*1000),count:this.requested,
    initialPile:this.initialPile,emitted:this.emitted,alive:this.coins.length,sleeping,
    impacts:this.impacts,coinImpacts:this.coinImpacts,wallImpacts:this.wallImpacts,
    phase:this.phase,maxOverlap:+this.maxOverlap().toFixed(3),
    pileTop:Math.min(WORLD.floor,...this.coins.map(c=>c.y-c.r)),
    coins:this.coins.map(c=>({id:c.id,x:+c.x.toFixed(3),y:+c.y.toFixed(3),vx:+c.vx.toFixed(3),vy:+c.vy.toFixed(3),a:+c.angle.toFixed(3),flip:+c.flip.toFixed(3),sleeping:c.sleeping}))};
  }
 }
 return Object.freeze({Payout,WORLD,STEP});
});