/**
 * A real 3D rigid-body payout for small faceted pixel coins.
 * `cannon-es` is vendored locally; no network/runtime CDN dependencies.
 * The 10-sided collision cylinder has the EXACT radius/thickness of the
 * Three.js source-sprite model so coin stacks do not have phantom gaps.
 * Original implementation; Slots & Daggers is only the visual reference.
 */
import * as CANNON from '../vendor/cannon-es.js';

export const FIXED_DT = 1/120;
export const COIN = Object.freeze({sides:10, imageDiameter:3, scale:.135,
  visualThickness:.10, radius:3*.135/(2*Math.cos(Math.PI/10)),
  height:.10*.135, gravity:24});
export const CAPS = Object.freeze({max:500, presets:[120,240,420]});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function seeded(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;};}

export class RigidCoinPayout {
  constructor({seed=20261118,maxCoins=CAPS.max,allowSleep=true}={}) {
    this.seed=seed;this.random=seeded(seed);this.maxCoins=maxCoins;
    this.world=new CANNON.World({gravity:new CANNON.Vec3(0,-COIN.gravity,0),allowSleep});
    this.world.broadphase=new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations=24;
    this.world.solver.tolerance=1e-7;
    this.world.defaultContactMaterial.friction=.58;
    this.world.defaultContactMaterial.restitution=.20;
    this.world.defaultContactMaterial.contactEquationStiffness=1e8;
    this.world.defaultContactMaterial.contactEquationRelaxation=4;
    this.world.defaultContactMaterial.frictionEquationStiffness=2e7;
    this.world.defaultContactMaterial.frictionEquationRelaxation=4;
    this.coinMaterial=new CANNON.Material('coin');
    this.deskMaterial=new CANNON.Material('dark-wood');
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial,this.coinMaterial,
      {friction:.62,restitution:.17,contactEquationStiffness:2e8,contactEquationRelaxation:3}));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial,this.deskMaterial,
      {friction:.65,restitution:.30,contactEquationStiffness:2e8,contactEquationRelaxation:3}));
    // Real static slabs: left pile sits on a shallow wooden table, not a CSS tray.
    this.staticBodies=[];
    this.addStaticBox([-2.82,-.14,0],[7.0,.26,4.65]); // desk surface y=-.01
    this.addStaticBox([-6.19,.70,0],[.20,1.42,4.65]); // left retaining wall
    this.addStaticBox([.80,.63,0],[.20,1.25,4.65]);  // slot machine left face
    this.addStaticBox([-2.83,.32,-2.34],[7.0,.66,.16]);
    this.addStaticBox([-2.83,.32,2.34],[7.0,.66,.16]);
    this.coins=[];this.tick=0;this.time=0;this.totalEmitted=0;
    this.batchTarget=0;this.batchEmitted=0;this.nextEmission=0;
    this.contactCount=0;this.groundContacts=0;this.peakHeight=0;
    this.maxCoinOverlap=0;this.phase='ready';this.errors=[];
    this.spawnShape=new CANNON.Cylinder(COIN.radius,COIN.radius,COIN.height,COIN.sides);
    this.events=[];
  }
  addStaticBox(pos,size){
    const body=new CANNON.Body({mass:0,material:this.deskMaterial});
    body.addShape(new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2)));
    body.position.set(...pos);body.userData={kind:'world'};
    this.world.addBody(body);this.staticBodies.push(body);return body;
  }
  fire(count=240){
    if(this.coins.length>=this.maxCoins)return 0;
    const n=clamp(Math.round(count)||120,1,this.maxCoins-this.coins.length);
    this.batchTarget=n;this.batchEmitted=0;this.nextEmission=this.time;
    this.phase='firing';return n;
  }
  addCoin({pos,vel,axis,spin,initial=false}){
    if(this.coins.length>=this.maxCoins)return null;
    const body=new CANNON.Body({mass:.078,material:this.coinMaterial,
      linearDamping:.055,angularDamping:.15,allowSleep:true,
      sleepSpeedLimit:.30,sleepTimeLimit:.70});
    body.addShape(this.spawnShape);
    body.position.set(...pos);
    body.velocity.set(...vel);
    const normal=new CANNON.Vec3(...axis);
    if(normal.lengthSquared()<.01)normal.set(1,0,0);
    normal.normalize();
    body.quaternion.setFromAxisAngle(normal,initial?Math.PI*0.5:Math.PI*.45*this.random());
    body.angularVelocity.set(...spin);
    body.userData={kind:'coin',id:this.coins.length};
    this.world.addBody(body);this.coins.push(body);return body;
  }
  // Spacing is a mechanical payout: lots of thin 10-sided coins but each
  // arrives at a distinct instant with its own XYZ velocity and 3D tumble.
  emit(){
    if(this.coins.length>=this.maxCoins)return;
    const r=this.random,slot=this.batchEmitted;
    const zlane=((slot%5)-2)*.115+(r()-.5)*.035;
    const ylane=((slot%3)-1)*.065+(r()-.5)*.03;
    const strength=.90+r()*.29;
    this.addCoin({
      pos:[.47+(r()-.5)*.022,1.42+ylane,zlane],
      vel:[-(18.8+r()*7.3)*strength,(4.0+r()*5.3)*strength,(r()-.5)*8.5],
      axis:[r()-.5,r()-.5,r()-.5],spin:[(r()-.5)*53,(r()-.5)*67,(r()-.5)*58]
    });
    this.batchEmitted++;this.totalEmitted++;
    const p=this.batchEmitted/this.batchTarget;
    // Front-loaded pressure spike, sustained shower, slowing tail.
    const interval=p<.13?.0105:p<.82?.0148:p<.94?.019:.028;
    this.nextEmission=this.time+interval+(r()-.5)*.0014;
    if(this.batchEmitted>=this.batchTarget)this.phase='settling';
  }
  step(){
    if(this.phase==='firing'){
      while(this.batchEmitted<this.batchTarget && this.time+1e-9>=this.nextEmission)this.emit();
    }
    this.world.step(FIXED_DT);
    this.tick++;this.time=this.tick*FIXED_DT;
    const pairs=new Set();
    for(const eq of this.world.contacts||[]){
      const a=eq.bi,b=eq.bj;
      if(a.userData?.kind==='coin'&&b.userData?.kind==='coin'){
        const k=a.id<b.id?`${a.id}/${b.id}`:`${b.id}/${a.id}`;
        pairs.add(k);
      }else if(a.userData?.kind==='coin'||b.userData?.kind==='coin')this.groundContacts++;
    }
    this.contactCount+=pairs.size;
    for(const b of this.coins){if(b.position.y>this.peakHeight)this.peakHeight=b.position.y;}
    if(this.phase==='settling'&&this.coins.every(b=>b.sleepState===CANNON.Body.SLEEPING))this.phase='settled';
    return this;
  }
  advanceFrames(n){for(let i=0;i<Math.max(0,Math.min(5000,Math.floor(n)));i++)this.step();return this;}
  getSnapshot(){
    let moving=0,maxY=-Infinity,minY=Infinity;
    for(const b of this.coins){moving+=b.sleepState!==CANNON.Body.SLEEPING?1:0;
      minY=Math.min(minY,b.position.y);maxY=Math.max(maxY,b.position.y);}
    return {tick:this.tick,time:+this.time.toFixed(3),count:this.coins.length,
      emitted:this.batchEmitted,target:this.batchTarget,totalEmitted:this.totalEmitted,
      moving,asleep:this.coins.length-moving,contacts:this.contactCount,
      supportContacts:this.groundContacts,peakHeight:+this.peakHeight.toFixed(3),
      pileY:[minY===Infinity?0:minY,maxY===-Infinity?0:maxY],
      real3D:true,collisionShape:'10-sided convex cylinder',
      radius:COIN.radius,height:COIN.height,phase:this.phase};
  }
  destroy(){for(const b of [...this.coins,...this.staticBodies])this.world.removeBody(b);}
}