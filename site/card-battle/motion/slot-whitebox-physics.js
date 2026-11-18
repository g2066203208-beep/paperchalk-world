/* Paperchalk original whitebox coin payout. Geometry/motion only; no materials.
 * Deterministic 120 Hz 2D circle rigid-body solver with contact impulses,
 * positional correction, coin/coin & wall collision, and sleep/wake.
 * All x/y units are logical canvas units; rendering is intentionally decoupled.
 */
(function(root,factory){
  const value=factory();
  if(typeof module==='object' && module.exports) module.exports=value;
  if(root) root.PaperchalkSlotWhitebox=value;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const STEP=1/120;
  const WIDTH=1000,HEIGHT=600;
  const WORLD=Object.freeze({width:WIDTH,height:HEIGHT,left:95,right:915,floor:536,
    chuteX:405,chuteY:332,coinRadius:13.4});
  function prng(seed){
    let s=seed>>>0;
    return function(){s=(s+0x6d2b79f5)>>>0;let t=s;
      t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  class Payout{
    constructor(opts={}){
      this.seed=(opts.seed??20261118)>>>0;
      this.requested=clamp(Math.floor(opts.count??48),1,160);
      this.restart();
    }
    restart(){
      this.rand=prng(this.seed);this.coins=[];this.time=0;this.tick=0;
      this.emitted=0;this.nextEmission=0;this.impacts=0;this.coinImpacts=0;
      this.wallImpacts=0;this.peakPile=0;this.phase='ready';this.finishedAt=-1;
      this.pairsChecked=0;this._ids=0;
      return this;
    }
    launch(count=this.requested, seed=this.seed){
      this.seed=seed>>>0;this.requested=clamp(Math.floor(count),1,160);
      this.restart();this.phase='payout';
      this._emit();this._schedule();
      return this;
    }
    _schedule(){
      const q=this.emitted/this.requested;
      // A rising mechanical feed, a full-speed middle, and a dying final rattle.
      const interval=q<.18?.062:q<.76?.037:q<.94?.052:.075;
      this.nextEmission=this.time+interval+this.rand()*.008;
    }
    _emit(){
      if(this.emitted>=this.requested)return;
      const p=this.emitted++, r=WORLD.coinRadius*(.90+this.rand()*.12);
      // Source stays at the physical mouth. Contact solver resolves congestion.
      let x=WORLD.chuteX-8-this.rand()*10;
      let y=WORLD.chuteY+this.rand()*15-7;
      // Avoid near-identical initial coordinates becoming one explosive disc.
      for(let j=0;j<8;j++){
        let conflict=false;
        for(const other of this.coins){if(Math.hypot(other.x-x,other.y-y)<r+other.r+1){conflict=true;break;}}
        if(!conflict)break;
        x-=r*.65;y-=r*.35;
      }
      const surge=.76+this.rand()*.45;
      const coin={id:++this._ids,x,y,px:x,py:y,
        vx:-(340+this.rand()*185)*surge,
        vy:-(238+this.rand()*210)*surge,
        r,invMass:1/(r*r),
        angle:this.rand()*Math.PI*2,
        flip:this.rand()*Math.PI*2,
        spin:(this.rand()-.5)*15,
        flipSpeed:(8+this.rand()*14)*(this.rand()<.5?-1:1),
        restitution:.18+this.rand()*.16,
        grounded:false,sleeping:false,restFor:0,
        collisions:0,lastImpactTick:-999};
      this.coins.push(coin);
    }
    _recordImpact(a,b,mag){
      if(mag<32)return;
      if(this.tick-a.lastImpactTick<9)return;
      a.lastImpactTick=this.tick;
      a.collisions++;
      this.impacts++;
      if(b){this.coinImpacts++;b.collisions++;}
      else this.wallImpacts++;
    }
    _wall(c){
      // Simplified U-shaped physical payout tray. The open mouth is above it.
      const {left,right,floor}=WORLD;
      c.grounded=false;
      if(c.y+c.r>floor){
        const impact=Math.max(0,c.vy);
        c.y=floor-c.r;
        if(impact>38)this._recordImpact(c,null,impact);
        c.vy=impact>42?-impact*c.restitution:0;
        c.vx*=.955;
        c.grounded=true;
      }
      if(c.x-c.r<left){
        const impact=-c.vx;c.x=left+c.r;
        if(impact>30)this._recordImpact(c,null,impact);
        c.vx=impact>25?-c.vx*.27:0;
      }
      if(c.x+c.r>right){
        const impact=c.vx;c.x=right-c.r;
        if(impact>30)this._recordImpact(c,null,impact);
        c.vx=impact>25?-c.vx*.27:0;
      }
      // The tray side-guards extend high enough to keep even large jackpots.
    }
    _contacts(){
      const coins=this.coins;
      const cellSize=31, cells=new Map();
      for(let i=0;i<coins.length;i++){
        const c=coins[i],ix=Math.floor(c.x/cellSize),iy=Math.floor(c.y/cellSize);
        const k=ix+','+iy;let arr=cells.get(k);
        if(!arr)cells.set(k,arr=[]);arr.push(i);
      }
      const NEIGHBOR=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      const pairs=[];
      for(let i=0;i<coins.length;i++){
        const a=coins[i],cx=Math.floor(a.x/cellSize),cy=Math.floor(a.y/cellSize);
        for(const [dx,dy] of NEIGHBOR){
          const list=cells.get((cx+dx)+','+(cy+dy));if(!list)continue;
          for(const j of list) if(j>i)pairs.push([i,j]);
        }
      }
      this.pairsChecked+=pairs.length;
      // Repeated projection is necessary: a pile must support upper coins.
      for(let iter=0;iter<7;iter++){
        for(const [i,j] of pairs){
          const a=coins[i],b=coins[j];
          const dx=b.x-a.x,dy=b.y-a.y,limit=a.r+b.r;
          const d2=dx*dx+dy*dy;
          if(d2>=limit*limit)continue;
          const dist=Math.sqrt(Math.max(d2,1e-8));
          const nx=dist<1e-4?((i+j)&1?1:-1):dx/dist;
          const ny=dist<1e-4?0:dy/dist;
          if(a.sleeping&&Math.hypot(b.vx,b.vy)>47)a.sleeping=false;
          if(b.sleeping&&Math.hypot(a.vx,a.vy)>47)b.sleeping=false;
          const invA=a.sleeping?0:a.invMass,invB=b.sleeping?0:b.invMass;
          const sum=invA+invB;if(sum<=0)continue;
          const depth=limit-dist;
          if(ny>.55)a.grounded=true;
          if(ny<-.55)b.grounded=true;
          const corr=Math.max(depth-.03,0)/sum*.79;
          a.x-=nx*corr*invA; a.y-=ny*corr*invA;
          b.x+=nx*corr*invB; b.y+=ny*corr*invB;
          // Sequential impulses for normal restitution and tangential friction.
          const rvx=b.vx-a.vx,rvy=b.vy-a.vy;
          const vn=rvx*nx+rvy*ny;
          if(vn<0){
            const rebound=vn< -65?Math.min(a.restitution,b.restitution):0;
            const J=-(1+rebound)*vn/sum;
            a.vx-=J*nx*invA;a.vy-=J*ny*invA;
            b.vx+=J*nx*invB;b.vy+=J*ny*invB;
            const tangentX=-ny,tangentY=nx;
            const vt=rvx*tangentX+rvy*tangentY;
            const jt=clamp(-vt/sum,-J*.32,J*.32);
            a.vx-=jt*tangentX*invA;a.vy-=jt*tangentY*invA;
            b.vx+=jt*tangentX*invB;b.vy+=jt*tangentY*invB;
            if(iter===0)this._recordImpact(a,b,Math.max(-vn,0));
          }
        }
        // Re-enforce floor and walls after each constraint iteration.
        for(const c of coins)if(!c.sleeping)this._wallQuiet(c);
      }
    }
    _wallQuiet(c){
      const w=WORLD;
      if(c.y+c.r>w.floor){c.y=w.floor-c.r;if(c.vy>0)c.vy=0;c.grounded=true;}
      if(c.x-c.r<w.left){c.x=w.left+c.r;if(c.vx<0)c.vx=0;}
      if(c.x+c.r>w.right){c.x=w.right-c.r;if(c.vx>0)c.vx=0;}
    }
    step(){
      if(this.phase==='ready')return this;
      const dt=STEP;
      this.time=(++this.tick)*dt;
      while(this.emitted<this.requested&&this.time>=this.nextEmission){this._emit();this._schedule();}
      for(const c of this.coins){
        if(c.sleeping)continue;
        c.px=c.x;c.py=c.y;
        c.vx*=.9993;c.vy=(c.vy+960*dt)*.9995;
        c.x+=c.vx*dt;c.y+=c.vy*dt;
        c.angle+=c.spin*dt;c.flip+=c.flipSpeed*dt;
        this._wall(c);
      }
      this._contacts();
      let awake=0, high=0;
      for(const c of this.coins){
        if(c.sleeping)continue;
        if(c.grounded && Math.abs(c.vy)<22 && Math.abs(c.vx)<13){
          c.restFor+=dt;
          c.vx*=.965;c.vy*=.93;
          if(c.restFor>.47){c.sleeping=true;c.vx=0;c.vy=0;}
        }else c.restFor=0;
        if(!c.sleeping)awake++;
        high=Math.max(high,(WORLD.floor-(c.y+c.r))/(c.r*2));
      }
      this.peakPile=Math.max(this.peakPile,high);
      if(this.emitted===this.requested){
        if(this.phase==='payout')this.phase='settling';
        if(awake===0&&this.finishedAt<0){this.finishedAt=this.time;this.phase='settled';}
        else if(this.time>11){this.phase='settling';}
      }
      return this;
    }
    advance(seconds){
      const n=Math.max(0,Math.floor(seconds/STEP+1e-7));
      for(let k=0;k<n;k++)this.step();return this;
    }
    seek(ms){
      this.launch(this.requested,this.seed);
      const n=Math.max(0,Math.floor(ms/(1000*STEP)+1e-7));
      for(let k=0;k<n;k++)this.step();
      return this;
    }
    snapshot(){
      const sleeping=this.coins.filter(c=>c.sleeping).length;
      const overlap=this.maxOverlap();
      return {seed:this.seed,timeMs:Math.round(this.time*1000),count:this.requested,
        emitted:this.emitted,alive:this.coins.length,sleeping,impacts:this.impacts,
        coinImpacts:this.coinImpacts,wallImpacts:this.wallImpacts,
        phase:this.phase,maxOverlap:+overlap.toFixed(3),
        pileTop:Math.min(WORLD.floor,...this.coins.map(c=>c.y-c.r)),
        coins:this.coins.map(c=>({id:c.id,x:+c.x.toFixed(3),y:+c.y.toFixed(3),
          vx:+c.vx.toFixed(3),vy:+c.vy.toFixed(3),a:+c.angle.toFixed(3),
          flip:+c.flip.toFixed(3),sleeping:c.sleeping}))};
    }
    maxOverlap(){
      let max=0;
      for(let i=0;i<this.coins.length;i++)for(let j=i+1;j<this.coins.length;j++){
        const a=this.coins[i],b=this.coins[j];
        const depth=a.r+b.r-Math.hypot(b.x-a.x,b.y-a.y);
        if(depth>max)max=depth;
      }
      return max;
    }
  }
  return Object.freeze({Payout,WORLD,STEP});
});