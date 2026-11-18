/**
 * A real 3D rigid-body payout for small faceted pixel coins.
 * `cannon-es` is vendored locally; no network/runtime CDN dependencies.
 * The 10-sided collision cylinder has the EXACT radius/thickness of the
 * Three.js source-sprite model so coin stacks do not have phantom gaps.
 * Original implementation; Slots & Daggers is only the visual reference.
 */
import * as CANNON from '../vendor/cannon-es.js';

export const FIXED_DT = 1/90; // sub-centimetre-thick coin moves < 0.22 m per step at 20 m/s
export const COIN = Object.freeze({sides:10, imageDiameter:3, scale:.135,
  visualThickness:.31, radius:3*.135/(2*Math.cos(Math.PI/10)),
  height:.31*.135, gravity:38});
export const CAPS = Object.freeze({max:500, presets:[120,240,420]});
// Coin chute is INSIDE the right rim. Every emitted rigid coin enters this
// open 3D catch bowl; no sideways confetti, virtual teleport or particle FX.
export const BASIN=Object.freeze({left:-5.78,right:.72,front:1.92,back:-1.92,
  floor:0,wallTop:2.55,chute:[.39,1.22,0]});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function seeded(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;};}

export class RigidCoinPayout {
  constructor({seed=20261118,maxCoins=CAPS.max,allowSleep=true}={}) {
    this.seed=seed;this.random=seeded(seed);this.maxCoins=maxCoins;
    this.world=new CANNON.World({gravity:new CANNON.Vec3(0,-COIN.gravity,0),allowSleep});
    this.world.broadphase=new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations=9; // 500 interacting convex bodies: do not solve 24 times per 90-Hz tick
    this.world.solver.tolerance=.0002;
    this.world.defaultContactMaterial.friction=.82;
    this.world.defaultContactMaterial.restitution=.07;
    this.world.defaultContactMaterial.contactEquationStiffness=2e7;
    this.world.defaultContactMaterial.contactEquationRelaxation=4;
    this.world.defaultContactMaterial.frictionEquationStiffness=1e7;
    this.world.defaultContactMaterial.frictionEquationRelaxation=4;
    this.coinMaterial=new CANNON.Material('coin');
    this.deskMaterial=new CANNON.Material('dark-wood');
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial,this.coinMaterial,
      {friction:.83,restitution:.055,contactEquationStiffness:2e7,contactEquationRelaxation:4}));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial,this.deskMaterial,
      {friction:.91,restitution:.095,contactEquationStiffness:2e7,contactEquationRelaxation:4}));
    // An actual CLOSED-PERIMETER, OPEN-TOP 3D catch bowl directly beneath
    // and left of the payout chute. The four physical walls use the same
    // coordinates/solids as the visual scene. A coin is never spawned outside.
    this.staticBodies=[];
    this.addStaticBox([-2.53,-.16,0],[6.75,.32,3.94]); // recessed metal bowl floor, top exactly y=0
    this.addStaticBox([BASIN.left-.115,BASIN.wallTop*.5,0],
      [.23,BASIN.wallTop,4.20]); // left stopping wall for high-speed stream
    this.addStaticBox([BASIN.right+.10,BASIN.wallTop*.5,0],
      [.20,BASIN.wallTop,4.20]); // machine-side return wall
    this.addStaticBox([-2.53,BASIN.wallTop*.5,BASIN.back-.105],
      [6.80,BASIN.wallTop,.21]); // rear retaining wall
    this.addStaticBox([-2.53,BASIN.wallTop*.5,BASIN.front+.105],
      [6.80,BASIN.wallTop,.21]); // front retaining wall
    // Slanted inner fillets break up wall bounces and settle the coins inward
    // without fake velocity damping or invisible screen-edge colliders.
    this.addStaticBox([-5.51,.12,0],[.38,.24,3.76]);
    this.addStaticBox([-2.52,.12,-1.68],[6.24,.24,.34]);
    this.addStaticBox([-2.52,.12,1.68],[6.24,.24,.34]);
    this.coins=[];this.tick=0;this.time=0;this.totalEmitted=0;
    this.batchTarget=0;this.batchEmitted=0;this.nextEmission=0;
    this.contactCount=0;this.groundContacts=0;this.peakHeight=0;
    this.maxCoinOverlap=0;this.phase='ready';this.errors=[];this.escapedEver=0;
    // The RENDER geometry can be shared, but Cannon assigns shape.body in addShape().
    // A shared physics shape would point to the wrong coin; create one per rigid body.
    this.events=[];
    this.pairKeys=new Set(); // reuse a numeric collision-pair set; no garbage per 90-Hz physics step
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
    const body=new CANNON.Body({mass:.145,material:this.coinMaterial,
      linearDamping:.14,angularDamping:.42,allowSleep:true,
      sleepSpeedLimit:.62,sleepTimeLimit:.34});
    body.addShape(new CANNON.Cylinder(COIN.radius,COIN.radius,COIN.height,COIN.sides));
    body.position.set(...pos);
    body.velocity.set(...vel);
    const normal=new CANNON.Vec3(...axis);
    if(normal.lengthSquared()<.01)normal.set(1,0,0);
    normal.normalize();
    body.quaternion.setFromAxisAngle(normal,initial?Math.PI*0.5:Math.PI*.45*this.random());
    body.angularVelocity.set(...spin);
    body.userData={kind:'coin',id:this.coins.length};
    this.world.addBody(body);this.coins.push(body);
    // Dynamic solver budget: keep a fully REAL 3D collider on every coin,
    // reduce repeated iterative contact passes when hundreds pile up.
    this.world.solver.iterations=this.coins.length>320?6:this.coins.length>180?8:9;
    return body;
  }
  // Spacing is a mechanical payout: lots of thin 10-sided coins but each
  // arrives at a distinct instant with its own XYZ velocity and 3D tumble.
  emit(){
    if(this.coins.length>=this.maxCoins)return;
    const r=this.random,slot=this.batchEmitted;
    // Mechanical payout: STRONG forward jet, aiming *down into the bowl*,
    // not upward/outward like fireworks. Narrow 3D lanes let coins collide
    // in the open basin. No coin is ever born beyond the physical walls.
    const zlane=((slot%7)-3)*.062+(r()-.5)*.032;
    const ylane=((slot%3)-1)*.018;
    const strength=.94+r()*.12;
    this.addCoin({
      pos:[BASIN.chute[0]+(r()-.5)*.012,BASIN.chute[1]+ylane,zlane],
      vel:[-(17.5+r()*3.2)*strength,(-7.0-r()*2.2)*strength,(r()-.5)*1.8],
      axis:[r()-.5,r()-.5,r()-.5],spin:[(r()-.5)*24,(r()-.5)*34,(r()-.5)*27]
    });
    this.batchEmitted++;this.totalEmitted++;
    const p=this.batchEmitted/this.batchTarget;
    // Front-loaded pressure spike, sustained shower, slowing tail.
    const interval=p<.13?.0185:p<.82?.0215:p<.94?.023:.028;
    this.nextEmission=this.time+interval+(r()-.5)*.0014;
    if(this.batchEmitted>=this.batchTarget)this.phase='settling';
  }
  step(){
    if(this.phase==='firing'){
      while(this.batchEmitted<this.batchTarget && this.time+1e-9>=this.nextEmission)this.emit();
    }
    this.world.step(FIXED_DT);
    this.tick++;this.time=this.tick*FIXED_DT;
    const pairs=this.pairKeys;pairs.clear();
    for(const eq of this.world.contacts||[]){
      const a=eq.bi,b=eq.bj;
      if(a.userData?.kind==='coin'&&b.userData?.kind==='coin'){
        const ai=a.userData.id,bi=b.userData.id;
        pairs.add(ai<bi?ai*this.maxCoins+bi:bi*this.maxCoins+ai);
      }else if(a.userData?.kind==='coin'||b.userData?.kind==='coin')this.groundContacts++;
    }
    this.contactCount+=pairs.size;
    for(const b of this.coins){
      if(b.position.y>this.peakHeight)this.peakHeight=b.position.y;
      if(b.position.x<BASIN.left-.25||b.position.x>BASIN.right+.25||
        b.position.z<BASIN.back-.25||b.position.z>BASIN.front+.25){
        this.escapedEver++;
      }
    }
    if(this.phase==='settling'&&this.coins.every(b=>b.sleepState===CANNON.Body.SLEEPING))this.phase='settled';
    return this;
  }
  advanceFrames(n){for(let i=0;i<Math.max(0,Math.min(5000,Math.floor(n)));i++)this.step();return this;}
  getSnapshot(){
    let moving=0,maxY=-Infinity,minY=Infinity,inBasin=0;
    for(const body of this.coins){
      moving+=body.sleepState!==CANNON.Body.SLEEPING?1:0;
      const p=body.position;
      minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
      if(p.x>=BASIN.left-.25&&p.x<=BASIN.right+.25&&
         p.z>=BASIN.back-.25&&p.z<=BASIN.front+.25)inBasin++;
    }
    return {tick:this.tick,time:+this.time.toFixed(3),count:this.coins.length,
      emitted:this.batchEmitted,target:this.batchTarget,totalEmitted:this.totalEmitted,
      moving,asleep:this.coins.length-moving,contacts:this.contactCount,
      supportContacts:this.groundContacts,groundContacts:this.groundContacts,
      solverIterations:this.world.solver.iterations,peakHeight:+this.peakHeight.toFixed(3),
      pileY:[minY===Infinity?0:minY,maxY===-Infinity?0:maxY],
      real3D:true,collisionShape:'10-sided convex cylinder',
      escapedEver:this.escapedEver,
      inBasin,
      bowl:BASIN,
      radius:COIN.radius,height:COIN.height,phase:this.phase};
  }
  destroy(){for(const b of [...this.coins,...this.staticBodies])this.world.removeBody(b);}
}